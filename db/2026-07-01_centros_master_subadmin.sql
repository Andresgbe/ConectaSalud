-- Diversificar centros: cada Master/Subadmin pertenece a un centro (Anatómico / Tropical).
-- El "inbox" pasa a ser por centro:
--   * Agarrar (avanzar a en_proceso) es exclusivo: un solo centro dueño a la vez.
--   * "No disponible" es POR CENTRO: oculta la necesidad para ese centro y la libera al
--     resto. Solo cuando TODOS los centros operativos la rechazan pasa a No Disponible real.
--   * Reactivar: si no estaba muerta, deshace el rechazo del propio centro; si estaba
--     muerta, borrón y cuenta nueva (vuelve a pendiente para todos).
-- Solo Master y Subadmin operan el inbox; el resto de roles queda igual.

-- 1) Columnas nuevas ----------------------------------------------------------
alter table usuarios_master   add column if not exists centro text not null default 'Anatómico';
alter table personal_subadmin add column if not exists centro text not null default 'Anatómico';

-- Centros que ya rechazaron ("no lo tenemos") esta necesidad.
alter table necesidades add column if not exists rechazado_por_centros text[] not null default '{}';
-- Centro dueño mientras está en proceso (para exclusividad).
alter table necesidades add column if not exists cubierto_por_centro text;

-- 2) Centros operativos: distintos centros presentes entre master/subadmin -----
create or replace function public.centros_operativos()
returns text[] language sql stable security definer set search_path to 'public' as $function$
  select coalesce(array_agg(distinct c order by c), '{}')
  from (
    select centro c from usuarios_master   where centro is not null and centro <> ''
    union
    select centro   from personal_subadmin where centro is not null and centro <> ''
  ) s;
$function$;
grant execute on function public.centros_operativos() to anon, authenticated;

-- 3) Login: devolver el centro en la columna nombre_centro (master/subadmin) ----
create or replace function public.login_unificado_telefono(p_telefono text, p_codigo text)
returns table(tipo text, nombre_completo text, hospital text, nombre_centro text, nombre_fundacion text, codigo_acceso text)
language sql security definer set search_path to 'public' as $function$
  select * from (
    select 'master'::text, um.nombre, null::text, um.centro, null::text, um.codigo_acceso
    from usuarios_master um
    where regexp_replace(um.telefono,'[^0-9]','','g') = regexp_replace(trim(p_telefono),'[^0-9]','','g') and um.codigo_acceso = trim(p_codigo)

    union all
    select 'subadmin', ps.nombre_completo, null, ps.centro, null, ps.codigo_acceso
    from personal_subadmin ps
    where regexp_replace(ps.telefono,'[^0-9]','','g') = regexp_replace(trim(p_telefono),'[^0-9]','','g') and ps.codigo_acceso = trim(p_codigo)

    union all
    select 'medico'::text, pm.nombre_completo, pm.hospital, null::text, null::text, h.codigo_acceso
    from personal_medico pm join hospitales h on h.nombre = pm.hospital
    where regexp_replace(pm.telefono,'[^0-9]','','g') = regexp_replace(trim(p_telefono),'[^0-9]','','g') and h.codigo_acceso = trim(p_codigo)

    union all
    select 'acopio', ca.nombre_completo, null, ca.nombre_centro, null, ca.codigo_acceso
    from centros_acopio ca
    where regexp_replace(ca.telefono,'[^0-9]','','g') = regexp_replace(trim(p_telefono),'[^0-9]','','g') and ca.codigo_acceso = trim(p_codigo)

    union all
    select 'fundacion', pf.nombre_completo, null, null, pf.nombre_fundacion, f.codigo_acceso
    from personal_fundacion pf join fundaciones f on f.nombre = pf.nombre_fundacion
    where regexp_replace(pf.telefono,'[^0-9]','','g') = regexp_replace(trim(p_telefono),'[^0-9]','','g') and f.codigo_acceso = trim(p_codigo)
  ) t
  limit 1;
$function$;

-- 4) Avanzar estado: guarda el centro dueño + exclusividad ---------------------
-- master (2 args, compat)
create or replace function public.avanzar_estado_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text; v_actual text; v_sig text; v_dueno text;
begin
  select nombre, centro into v_nombre, v_centro from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_nombre is null then raise exception 'No autorizado'; end if;
  select estado_cobertura, cubierto_por_centro into v_actual, v_dueno from necesidades where id = p_id;
  if v_actual <> 'pendiente' and v_dueno is not null and v_dueno <> v_centro then
    raise exception 'Esta necesidad la está gestionando otro centro (%)', v_dueno;
  end if;
  v_sig := next_estado(v_actual);
  if v_sig is null then raise exception 'Ya está en el último estado'; end if;
  update necesidades set estado_cobertura = v_sig,
    cubierto_por = v_nombre || ' (' || v_centro || ')', cubierto_por_centro = v_centro,
    actualizado_en = now() where id = p_id;
end; $function$;

-- master (5 args, el que usa el frontend)
create or replace function public.avanzar_estado_master(p_id uuid, p_master_telefono text, p_nota text default null, p_trans_nombre text default null, p_trans_telefono text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text; v_actual text; v_sig text; v_dueno text;
begin
  select nombre, centro into v_nombre, v_centro from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_nombre is null then raise exception 'No autorizado'; end if;
  select estado_cobertura, cubierto_por_centro into v_actual, v_dueno from necesidades where id = p_id;
  if v_actual <> 'pendiente' and v_dueno is not null and v_dueno <> v_centro then
    raise exception 'Esta necesidad la está gestionando otro centro (%)', v_dueno;
  end if;
  v_sig := next_estado(v_actual);
  if v_sig is null then raise exception 'Ya está en el último estado'; end if;
  update necesidades set estado_cobertura = v_sig,
    cubierto_por = v_nombre || ' (' || v_centro || ')', cubierto_por_centro = v_centro,
    nota_recepcion = case when v_sig = 'recibida' then nullif(trim(p_nota),'') else nota_recepcion end,
    transportista_nombre = case when v_sig = 'enviada' then nullif(trim(p_trans_nombre),'') else transportista_nombre end,
    transportista_telefono = case when v_sig = 'enviada' then nullif(trim(p_trans_telefono),'') else transportista_telefono end,
    actualizado_en = now() where id = p_id;
end; $function$;

-- subadmin (5 args)
create or replace function public.avanzar_estado_subadmin(p_id uuid, p_telefono text, p_nota text default null, p_trans_nombre text default null, p_trans_telefono text default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text; v_actual text; v_sig text; v_dueno text;
begin
  select nombre_completo, centro into v_nombre, v_centro from personal_subadmin where telefono = trim(p_telefono);
  if v_nombre is null then raise exception 'No autorizado'; end if;
  select estado_cobertura, cubierto_por_centro into v_actual, v_dueno from necesidades where id = p_id;
  if v_actual <> 'pendiente' and v_dueno is not null and v_dueno <> v_centro then
    raise exception 'Esta necesidad la está gestionando otro centro (%)', v_dueno;
  end if;
  v_sig := next_estado(v_actual);
  if v_sig is null then raise exception 'Ya está en el último estado'; end if;
  update necesidades set estado_cobertura = v_sig,
    cubierto_por = v_nombre || ' (' || v_centro || ')', cubierto_por_centro = v_centro,
    nota_recepcion = case when v_sig = 'recibida' then nullif(trim(p_nota),'') else nota_recepcion end,
    transportista_nombre = case when v_sig = 'enviada' then nullif(trim(p_trans_nombre),'') else transportista_nombre end,
    transportista_telefono = case when v_sig = 'enviada' then nullif(trim(p_trans_telefono),'') else transportista_telefono end,
    actualizado_en = now() where id = p_id;
end; $function$;

-- 5) Retroceder estado: libera el centro dueño --------------------------------
create or replace function public.retroceder_estado_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_centro text; v_actual text; v_anterior text; v_dueno text;
begin
  select centro into v_centro from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_centro is null then raise exception 'No autorizado'; end if;
  select estado_cobertura, cubierto_por_centro into v_actual, v_dueno from necesidades where id = p_id;
  if v_dueno is not null and v_dueno <> v_centro then
    raise exception 'Esta necesidad la está gestionando otro centro (%)', v_dueno;
  end if;
  v_anterior := prev_estado(v_actual);
  if v_anterior is null then raise exception 'Ya está en el primer estado'; end if;
  update necesidades set estado_cobertura = v_anterior, cubierto_por = null, cubierto_por_centro = null,
    actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.retroceder_estado_subadmin(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_centro text; v_actual text; v_ant text; v_dueno text;
begin
  select centro into v_centro from personal_subadmin where telefono = trim(p_telefono);
  if v_centro is null then raise exception 'No autorizado'; end if;
  select estado_cobertura, cubierto_por_centro into v_actual, v_dueno from necesidades where id = p_id;
  if v_dueno is not null and v_dueno <> v_centro then
    raise exception 'Esta necesidad la está gestionando otro centro (%)', v_dueno;
  end if;
  v_ant := prev_estado(v_actual);
  if v_ant is null then raise exception 'Ya está en el primer estado'; end if;
  update necesidades set estado_cobertura = v_ant, cubierto_por = null, cubierto_por_centro = null,
    actualizado_en = now() where id = p_id;
end; $function$;

-- 6) "No disponible" por centro -----------------------------------------------
create or replace function public.marcar_no_disponible_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text; v_rech text[]; v_activos text[];
begin
  select nombre, centro into v_nombre, v_centro from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_nombre is null then raise exception 'No autorizado'; end if;

  select coalesce(rechazado_por_centros,'{}') into v_rech from necesidades where id = p_id;
  if not (v_centro = any(v_rech)) then v_rech := array_append(v_rech, v_centro); end if;
  v_activos := centros_operativos();

  update necesidades set
    rechazado_por_centros = v_rech,
    estado_cobertura = 'pendiente', cubierto_por = null, cubierto_por_centro = null,
    transportista_nombre = null, transportista_telefono = null,
    incluido = not (v_activos <@ v_rech),               -- muere solo si TODOS rechazaron
    no_disponible_por = v_nombre || ' (' || v_centro || ')',
    actualizado_en = now()
  where id = p_id;
end; $function$;

create or replace function public.marcar_no_disponible_subadmin(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text; v_rech text[]; v_activos text[];
begin
  select nombre_completo, centro into v_nombre, v_centro from personal_subadmin where telefono = trim(p_telefono);
  if v_nombre is null then raise exception 'No autorizado'; end if;

  select coalesce(rechazado_por_centros,'{}') into v_rech from necesidades where id = p_id;
  if not (v_centro = any(v_rech)) then v_rech := array_append(v_rech, v_centro); end if;
  v_activos := centros_operativos();

  update necesidades set
    rechazado_por_centros = v_rech,
    estado_cobertura = 'pendiente', cubierto_por = null, cubierto_por_centro = null,
    transportista_nombre = null, transportista_telefono = null,
    incluido = not (v_activos <@ v_rech),
    no_disponible_por = v_nombre || ' (' || v_centro || ')',
    actualizado_en = now()
  where id = p_id;
end; $function$;

-- 7) Reactivar: deshacer mi rechazo, o revivir muerta (borrón y cuenta nueva) --
create or replace function public.reactivar_insumo_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_centro text; v_rech text[]; v_incluido boolean;
begin
  select centro into v_centro from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_centro is null then raise exception 'No autorizado'; end if;

  select coalesce(rechazado_por_centros,'{}'), incluido into v_rech, v_incluido from necesidades where id = p_id;
  if v_incluido = false then
    update necesidades set rechazado_por_centros = '{}', incluido = true, no_disponible_por = null,
      actualizado_en = now() where id = p_id;
  else
    v_rech := array_remove(v_rech, v_centro);
    update necesidades set rechazado_por_centros = v_rech, incluido = true,
      no_disponible_por = case when array_length(v_rech,1) is null then null else no_disponible_por end,
      actualizado_en = now() where id = p_id;
  end if;
end; $function$;

create or replace function public.reactivar_insumo_subadmin(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_centro text; v_rech text[]; v_incluido boolean;
begin
  select centro into v_centro from personal_subadmin where telefono = trim(p_telefono);
  if v_centro is null then raise exception 'No autorizado'; end if;

  select coalesce(rechazado_por_centros,'{}'), incluido into v_rech, v_incluido from necesidades where id = p_id;
  if v_incluido = false then
    update necesidades set rechazado_por_centros = '{}', incluido = true, no_disponible_por = null,
      actualizado_en = now() where id = p_id;
  else
    v_rech := array_remove(v_rech, v_centro);
    update necesidades set rechazado_por_centros = v_rech, incluido = true,
      no_disponible_por = case when array_length(v_rech,1) is null then null else no_disponible_por end,
      actualizado_en = now() where id = p_id;
  end if;
end; $function$;

-- Otros roles (acopio/fundacion/medico): al reactivar, además limpian la lista
-- de rechazos por centro, para que no queden "vivas pero ocultas" para los centros.
create or replace function public.reactivar_insumo_acopio(p_id uuid, p_telefono text, p_codigo text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from centros_acopio where telefono = trim(p_telefono) and codigo_acceso = trim(p_codigo)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, rechazado_por_centros = '{}', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_fundacion(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from personal_fundacion where telefono = trim(p_telefono)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, rechazado_por_centros = '{}', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_medico(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_hosp_med text; v_hosp_nec text;
begin
  select hospital into v_hosp_med from personal_medico where telefono = trim(p_telefono);
  if v_hosp_med is null then raise exception 'No autorizado'; end if;
  select hospital into v_hosp_nec from necesidades where id = p_id;
  if v_hosp_nec is null or v_hosp_nec <> v_hosp_med then raise exception 'No autorizado para esta necesidad'; end if;
  update necesidades set incluido = true, no_disponible_por = null, rechazado_por_centros = '{}', actualizado_en = now() where id = p_id;
end; $function$;

-- 8) Alta/edición de subadmin con centro --------------------------------------
create or replace function public.master_crear_subadmin(p_master_telefono text, p_telefono text, p_nombre_completo text, p_codigo_acceso text default 'SUBADMIN2026'::text, p_centro text default 'Anatómico')
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  if trim(p_telefono) = '' or trim(p_nombre_completo) = '' then
    raise exception 'Teléfono y nombre son obligatorios.';
  end if;

  insert into personal_subadmin (telefono, nombre_completo, codigo_acceso, centro)
  values (trim(p_telefono), trim(p_nombre_completo),
          coalesce(nullif(trim(p_codigo_acceso), ''), 'SUBADMIN2026'),
          coalesce(nullif(trim(p_centro), ''), 'Anatómico'))
  on conflict (telefono) do update
    set nombre_completo = excluded.nombre_completo, codigo_acceso = excluded.codigo_acceso, centro = excluded.centro;
end; $function$;

create or replace function public.master_editar_subadmin(p_master_telefono text, p_subadmin_id uuid, p_telefono text, p_nombre_completo text, p_codigo_acceso text, p_centro text default 'Anatómico')
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  if trim(p_telefono) = '' or trim(p_nombre_completo) = '' or trim(p_codigo_acceso) = '' then
    raise exception 'Teléfono, nombre y código son obligatorios.';
  end if;

  update personal_subadmin
  set telefono = trim(p_telefono), nombre_completo = trim(p_nombre_completo),
      codigo_acceso = trim(p_codigo_acceso), centro = coalesce(nullif(trim(p_centro), ''), 'Anatómico')
  where id = p_subadmin_id;
end; $function$;

-- 9) Masters: listar y reasignar centro entre ellos ---------------------------
create or replace function public.master_listar_masters(p_master_telefono text)
returns setof usuarios_master language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  return query select * from usuarios_master order by nombre;
end; $function$;

create or replace function public.master_editar_centro_master(p_master_telefono text, p_master_id uuid, p_centro text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update usuarios_master set centro = coalesce(nullif(trim(p_centro), ''), 'Anatómico') where id = p_master_id;
end; $function$;

-- master_crear_usuario ahora acepta el centro al crear un nuevo master.
create or replace function public.master_crear_usuario(p_master_telefono text, p_nombre text, p_telefono_nuevo text, p_codigo text, p_centro text default 'Anatómico')
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from usuarios_master where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;

  insert into usuarios_master (nombre, telefono, codigo_acceso, centro)
  values (trim(p_nombre), trim(p_telefono_nuevo), trim(p_codigo), coalesce(nullif(trim(p_centro), ''), 'Anatómico'));
end; $function$;
