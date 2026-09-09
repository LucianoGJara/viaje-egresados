-- ============================================================================
-- VIAJE DE EGRESADOS · Esquema de base de datos (Supabase / PostgreSQL)
-- ============================================================================
-- Cómo usar este archivo:
--   1. Entrá a tu proyecto en https://app.supabase.com
--   2. Abrí "SQL Editor" → "New query"
--   3. Pegá TODO este archivo y ejecutalo (Run)
--   4. Copiá la "Project URL" y la "anon public key" (Settings → API)
--      y pegalas en js/config.js
--
-- Diseño pensado para el futuro:
--   - Todas las tablas cuelgan de "campanas", que ya tiene una columna
--     user_id (nullable). Hoy no se usa (no hay login), pero el día que se
--     agregue autenticación alcanza con: (a) hacer NOT NULL esa columna,
--     (b) reemplazar las policies "acceso_publico_*" de abajo por policies
--     que comparen auth.uid() = user_id.
--   - Los combos/ventas no se borran físicamente sin querer: las ventas
--     guardan una "foto" del nombre/precio del producto al momento de
--     la venta, así que si después editás o borrás un producto, el
--     historial de ventas no se rompe.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. CAMPANAS  (una fila hoy = la campaña actual. Preparado para multi-campaña
--               / multi-usuario cuando se agregue autenticación)
-- ----------------------------------------------------------------------------
create table if not exists campanas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid null,                 -- futuro: references auth.users(id)
  nombre      text not null default 'Viaje de Egresados',
  subtitulo   text not null default 'Control de recaudación para el viaje',
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTOS  (combos / promos que se venden)
-- ----------------------------------------------------------------------------
create table if not exists productos (
  id            uuid primary key default gen_random_uuid(),
  campana_id    uuid not null references campanas(id) on delete cascade,
  nombre        text not null,
  descripcion   text default '',
  costo         numeric(12,2) not null default 0 check (costo >= 0),
  precio_venta  numeric(12,2) not null default 0 check (precio_venta >= 0),
  -- Calculados automáticamente por la base de datos: nunca pueden desincronizarse.
  ganancia      numeric(12,2) generated always as (precio_venta - costo) stored,
  rentabilidad  numeric(6,2)  generated always as (
                  case when costo > 0
                       then round(((precio_venta - costo) / costo) * 100, 2)
                       else 0 end
                ) stored,
  activo        boolean not null default true,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_productos_campana on productos(campana_id);

-- ----------------------------------------------------------------------------
-- 3. VENTAS
-- ----------------------------------------------------------------------------
create table if not exists ventas (
  id                uuid primary key default gen_random_uuid(),
  campana_id        uuid not null references campanas(id) on delete cascade,
  producto_id       uuid references productos(id) on delete set null,
  producto_nombre   text not null,        -- foto del nombre al momento de vender
  comprador_nombre  text not null,
  telefono          text default '',
  cantidad          integer not null check (cantidad > 0),
  precio_unitario   numeric(12,2) not null default 0,
  costo_unitario    numeric(12,2) not null default 0,
  precio_total      numeric(12,2) not null default 0,
  costo_total       numeric(12,2) not null default 0,
  ganancia_total    numeric(12,2) not null default 0,
  rentabilidad      numeric(6,2)  not null default 0,
  estado            text not null default 'pendiente' check (estado in ('pagado', 'pendiente')),
  observaciones     text default '',
  fecha             date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_ventas_campana on ventas(campana_id);
create index if not exists idx_ventas_fecha on ventas(fecha);
create index if not exists idx_ventas_estado on ventas(estado);
create index if not exists idx_ventas_producto on ventas(producto_id);

-- Trigger: recalcula los totales de la venta siempre en el servidor,
-- así nunca dependen de que el cliente haga bien la cuenta.
create or replace function calcular_totales_venta()
returns trigger as $$
begin
  new.precio_total := round(new.precio_unitario * new.cantidad, 2);
  new.costo_total   := round(new.costo_unitario * new.cantidad, 2);
  new.ganancia_total := round(new.precio_total - new.costo_total, 2);
  new.rentabilidad := case when new.costo_total > 0
                            then round((new.ganancia_total / new.costo_total) * 100, 2)
                            else 0 end;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calcular_totales_venta on ventas;
create trigger trg_calcular_totales_venta
  before insert or update on ventas
  for each row execute function calcular_totales_venta();

-- ----------------------------------------------------------------------------
-- 4. INGRESOS EXTRAS (dinero que no viene de ventas)
-- ----------------------------------------------------------------------------
create table if not exists ingresos_extras (
  id             uuid primary key default gen_random_uuid(),
  campana_id     uuid not null references campanas(id) on delete cascade,
  concepto       text not null,
  tipo           text not null check (tipo in ('donacion','rifa','evento','familiar','aporte_personal','otro')),
  monto          numeric(12,2) not null check (monto >= 0),
  fecha          date not null default current_date,
  observaciones  text default '',
  created_at     timestamptz not null default now()
);

create index if not exists idx_ingresos_campana on ingresos_extras(campana_id);

-- ----------------------------------------------------------------------------
-- 5. METAS (historial de metas económicas; la más reciente "activa" es la vigente)
-- ----------------------------------------------------------------------------
create table if not exists metas (
  id            uuid primary key default gen_random_uuid(),
  campana_id    uuid not null references campanas(id) on delete cascade,
  monto_meta    numeric(12,2) not null check (monto_meta >= 0),
  activa        boolean not null default true,
  nota          text default '',
  created_at    timestamptz not null default now()
);

create index if not exists idx_metas_campana on metas(campana_id);

-- ----------------------------------------------------------------------------
-- 6. CONFIGURACION (branding y ajustes generales, una fila por campaña)
-- ----------------------------------------------------------------------------
create table if not exists configuracion (
  id                uuid primary key default gen_random_uuid(),
  campana_id        uuid not null unique references campanas(id) on delete cascade,
  nombre_campana    text not null default 'Viaje de Egresados',
  subtitulo         text not null default 'Control de recaudación para el viaje',
  moneda            text not null default 'ARS',
  color_primario    text not null default '#4F46E5',
  color_secundario  text not null default '#10B981',
  logo_url          text default null,
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. MENSAJES (texto editable de la pantalla "Compartir Campaña")
-- ----------------------------------------------------------------------------
create table if not exists mensajes (
  id                  uuid primary key default gen_random_uuid(),
  campana_id          uuid not null references campanas(id) on delete cascade,
  tipo                text not null default 'compartir',
  contenido           text not null default '',
  contenido_original  text not null default '',
  updated_at          timestamptz not null default now()
);

create unique index if not exists idx_mensajes_campana_tipo on mensajes(campana_id, tipo);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Hoy la app no tiene login: cualquiera con la anon key puede leer/escribir
-- (protegido solo porque la anon key y la URL no son públicas). Cuando se
-- agregue autenticación, reemplazá cada policy "acceso_publico_*" por una
-- que filtre por auth.uid(), por ejemplo:
--   using (campana_id in (select id from campanas where user_id = auth.uid()))
-- ============================================================================

alter table campanas         enable row level security;
alter table productos        enable row level security;
alter table ventas           enable row level security;
alter table ingresos_extras  enable row level security;
alter table metas            enable row level security;
alter table configuracion    enable row level security;
alter table mensajes         enable row level security;

drop policy if exists acceso_publico_campanas on campanas;
create policy acceso_publico_campanas on campanas for all using (true) with check (true);

drop policy if exists acceso_publico_productos on productos;
create policy acceso_publico_productos on productos for all using (true) with check (true);

drop policy if exists acceso_publico_ventas on ventas;
create policy acceso_publico_ventas on ventas for all using (true) with check (true);

drop policy if exists acceso_publico_ingresos on ingresos_extras;
create policy acceso_publico_ingresos on ingresos_extras for all using (true) with check (true);

drop policy if exists acceso_publico_metas on metas;
create policy acceso_publico_metas on metas for all using (true) with check (true);

drop policy if exists acceso_publico_configuracion on configuracion;
create policy acceso_publico_configuracion on configuracion for all using (true) with check (true);

drop policy if exists acceso_publico_mensajes on mensajes;
create policy acceso_publico_mensajes on mensajes for all using (true) with check (true);

-- ============================================================================
-- DATOS INICIALES (seed): campaña, meta, config, mensaje y los 3 combos
-- ============================================================================
do $$
declare
  v_campana_id uuid;
  v_mensaje_inicial text := 'Holaa 😊 Estoy vendiendo estas promos para poder juntar dinero para mi viaje de egresados ☺️❤️
Estoy tratando de ir ahorrando de a poquito para llegar a mi objetivo.
Si te gustaría colaborar, ¿comprarías alguna?
Cualquier ayuda me sirve muchísimo.
Y si no podés comprar, compartir la publicación también me ayudaría un montón.
¡Muchas gracias! ❤️🙏';
begin
  -- Solo sembrar si todavía no existe ninguna campaña
  if not exists (select 1 from campanas) then
    insert into campanas (nombre, subtitulo) values ('Viaje de Egresados', 'Control de recaudación para el viaje')
    returning id into v_campana_id;

    insert into metas (campana_id, monto_meta, activa, nota)
    values (v_campana_id, 2000000, true, 'Meta inicial');

    insert into configuracion (campana_id, nombre_campana, subtitulo, moneda, color_primario, color_secundario)
    values (v_campana_id, 'Viaje de Egresados', 'Control de recaudación para el viaje', 'ARS', '#4F46E5', '#10B981');

    insert into mensajes (campana_id, tipo, contenido, contenido_original)
    values (v_campana_id, 'compartir', v_mensaje_inicial, v_mensaje_inicial);

    insert into productos (campana_id, nombre, descripcion, costo, precio_venta, orden) values
    (v_campana_id, 'Promo Familiar Completa',
     '2 discos de horno, 1 disco árabe, 1 pascualina, 1 fideo, 1 raviol pollo y verdura, 1 raviol carne y verdura',
     8000, 12000, 1),
    (v_campana_id, 'Promo Clásica',
     '2 discos de horno, 1 pascualina, 1 fideo, 1 raviol pollo y verdura (bolsa)',
     5000, 7500, 2),
    (v_campana_id, 'Promo Especial',
     '2 discos de horno, 2 pascualinas, 1 fideo, 1 raviol pollo y verdura (caja), 1 ñoqui',
     7500, 11500, 3);
  end if;
end $$;

-- ============================================================================
-- Fin del script. Verificá en Table Editor que se hayan creado las 7 tablas
-- y que "productos" tenga 3 filas.
-- ============================================================================
