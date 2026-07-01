-- Registrar quién marcó un insumo como "no disponible".
-- Agrega la columna necesidades.no_disponible_por y actualiza los RPC
-- marcar_no_disponible_* (guardan el nombre) y reactivar_insumo_* (la limpian).

alter table necesidades add column if not exists no_disponible_por text;

-- marcar_no_disponible_* → guardan el nombre de quien marcó,
-- siguiendo la misma convención de nombre que cubierto_por.

create or replace function public.marcar_no_disponible_acopio(p_id uuid, p_telefono text, p_codigo text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_centro text;
begin
  select nombre_completo, nombre_centro into v_nombre, v_centro
  from centros_acopio where telefono = trim(p_telefono) and codigo_acceso = trim(p_codigo);
  if v_nombre is null then raise exception 'No autorizado'; end if;
  update necesidades set incluido = false, no_disponible_por = v_nombre || ' (' || v_centro || ')', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.marcar_no_disponible_fundacion(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_fund text;
begin
  select nombre_completo, nombre_fundacion into v_nombre, v_fund from personal_fundacion where telefono = trim(p_telefono);
  if v_nombre is null then raise exception 'No autorizado'; end if;
  update necesidades set incluido = false, no_disponible_por = v_nombre || ' (' || v_fund || ')', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.marcar_no_disponible_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text;
begin
  select nombre into v_nombre from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g');
  if v_nombre is null then raise exception 'No autorizado'; end if;
  update necesidades set incluido = false, no_disponible_por = v_nombre || ' (Master)', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.marcar_no_disponible_medico(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text; v_hosp_med text; v_hosp_nec text;
begin
  select nombre_completo, hospital into v_nombre, v_hosp_med from personal_medico where telefono = trim(p_telefono);
  if v_hosp_med is null then raise exception 'No autorizado'; end if;
  select hospital into v_hosp_nec from necesidades where id = p_id;
  if v_hosp_nec is null or v_hosp_nec <> v_hosp_med then raise exception 'No autorizado para esta necesidad'; end if;
  update necesidades set incluido = false, no_disponible_por = v_nombre || ' (' || v_hosp_med || ')', actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.marcar_no_disponible_subadmin(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_nombre text;
begin
  select nombre_completo into v_nombre from personal_subadmin where telefono = trim(p_telefono);
  if v_nombre is null then raise exception 'No autorizado'; end if;
  update necesidades set incluido = false, no_disponible_por = v_nombre || ' (Subadmin)', actualizado_en = now() where id = p_id;
end; $function$;

-- reactivar_insumo_* → limpian el registro de quién marcó no disponible.

create or replace function public.reactivar_insumo_acopio(p_id uuid, p_telefono text, p_codigo text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from centros_acopio where telefono = trim(p_telefono) and codigo_acceso = trim(p_codigo)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_fundacion(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from personal_fundacion where telefono = trim(p_telefono)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_master(p_id uuid, p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(
    select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')
  ) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_medico(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_hosp_med text; v_hosp_nec text;
begin
  select hospital into v_hosp_med from personal_medico where telefono = trim(p_telefono);
  if v_hosp_med is null then raise exception 'No autorizado'; end if;
  select hospital into v_hosp_nec from necesidades where id = p_id;
  if v_hosp_nec is null or v_hosp_nec <> v_hosp_med then raise exception 'No autorizado para esta necesidad'; end if;
  update necesidades set incluido = true, no_disponible_por = null, actualizado_en = now() where id = p_id;
end; $function$;

create or replace function public.reactivar_insumo_subadmin(p_id uuid, p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from personal_subadmin where telefono = trim(p_telefono)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  update necesidades set incluido = true, no_disponible_por = null, actualizado_en = now() where id = p_id;
end; $function$;
