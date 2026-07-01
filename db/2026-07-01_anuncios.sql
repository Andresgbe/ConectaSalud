-- Anuncios: banner en la pantalla de reportes con CRUD para rol master.
-- Semántica de "un anuncio activo a la vez" (el anuncio de la noche, ej.
-- "CERRADO LOS PEDIDOS DE HOY"). Crea la tabla `anuncio`, su lectura pública +
-- realtime, y los RPC obtener_anuncio / master_publicar_anuncio / master_quitar_anuncio
-- que el componente src/components/Anuncio.jsx ya consume.

create table if not exists public.anuncio (
  id         uuid primary key default gen_random_uuid(),
  mensaje    text not null,
  activo     boolean not null default true,
  creado_por text,
  creado_en  timestamptz not null default now()
);

-- RLS: mismo patrón que necesidades (lectura pública; las escrituras solo por
-- los RPC security definer de abajo).
alter table public.anuncio enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.anuncio'::regclass and polname = 'lectura publica'
  ) then
    create policy "lectura publica" on public.anuncio for select using (true);
  end if;
end $$;

-- Realtime: agregar a la publicación si aún no está.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anuncio'
  ) then
    alter publication supabase_realtime add table public.anuncio;
  end if;
end $$;

-- obtener_anuncio → anuncio activo más reciente (lectura pública, sin auth).
create or replace function public.obtener_anuncio()
returns setof public.anuncio language sql security definer set search_path to 'public' as $function$
  select * from anuncio where activo order by creado_en desc limit 1;
$function$;

-- master_publicar_anuncio → crear/editar. Desactiva el activo actual e inserta uno nuevo
-- (soft-replace: mantiene historial, siempre un solo activo). Auth vía usuarios_master.
create or replace function public.master_publicar_anuncio(p_master_telefono text, p_mensaje text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(
    select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')
  ) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  if p_mensaje is null or trim(p_mensaje) = '' then raise exception 'Mensaje vacío'; end if;

  update anuncio set activo = false where activo;
  insert into anuncio (mensaje, creado_por) values (trim(p_mensaje), trim(p_master_telefono));
end; $function$;

-- master_quitar_anuncio → desactiva el anuncio activo. Auth vía usuarios_master.
create or replace function public.master_quitar_anuncio(p_master_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(
    select 1 from usuarios_master
    where regexp_replace(telefono,'[^0-9]','','g') = regexp_replace(trim(p_master_telefono),'[^0-9]','','g')
  ) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;

  update anuncio set activo = false where activo;
end; $function$;

grant execute on function public.obtener_anuncio() to anon, authenticated;
grant execute on function public.master_publicar_anuncio(text, text) to anon, authenticated;
grant execute on function public.master_quitar_anuncio(text) to anon, authenticated;

-- Variantes subadmin (mismo comportamiento; auth vía personal_subadmin, igual que
-- reactivar_insumo_subadmin / avanzar_estado_subadmin).

create or replace function public.subadmin_publicar_anuncio(p_telefono text, p_mensaje text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from personal_subadmin where telefono = trim(p_telefono)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;
  if p_mensaje is null or trim(p_mensaje) = '' then raise exception 'Mensaje vacío'; end if;

  update anuncio set activo = false where activo;
  insert into anuncio (mensaje, creado_por) values (trim(p_mensaje), trim(p_telefono));
end; $function$;

create or replace function public.subadmin_quitar_anuncio(p_telefono text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_valido boolean;
begin
  select exists(select 1 from personal_subadmin where telefono = trim(p_telefono)) into v_valido;
  if not v_valido then raise exception 'No autorizado'; end if;

  update anuncio set activo = false where activo;
end; $function$;

grant execute on function public.subadmin_publicar_anuncio(text, text) to anon, authenticated;
grant execute on function public.subadmin_quitar_anuncio(text) to anon, authenticated;
