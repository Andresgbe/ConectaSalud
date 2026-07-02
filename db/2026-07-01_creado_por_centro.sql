-- Centro de origen de la necesidad (quién la reportó). Dato estructurado para el chip
-- de centro en las tarjetas, en vez de depender de parsear texto en creado_por.
--   * Reportes nuevos de master/subadmin: se guarda su centro real (Anatómico/Tropical).
--   * Reportes de médico/fundación: null (esos roles no tienen centro Anatómico/Tropical).
alter table necesidades add column if not exists creado_por_centro text;

-- Backfill: históricamente todo lo operó el Anatómico (Tropical se agregó después),
-- así que todas las filas existentes se atribuyen al Anatómico.
update necesidades set creado_por_centro = 'Anatómico' where creado_por_centro is null;
