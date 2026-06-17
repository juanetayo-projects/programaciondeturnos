-- ============================================================
-- Programación de Turnos · Esquema inicial
-- Roles: admin | coordinador | nomina
-- ============================================================

-- ---------- Perfiles / usuarios ----------
create type rol_usuario as enum ('admin', 'coordinador', 'nomina');

create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         rol_usuario not null default 'coordinador',
  servicio_id uuid,                       -- scope del coordinador (null = todos)
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Catálogos base ----------
create table servicios (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table cargos (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true
);

alter table perfiles
  add constraint perfiles_servicio_fk
  foreign key (servicio_id) references servicios(id) on delete set null;

-- ---------- Colaboradores (1 persona = 1 servicio) ----------
create table colaboradores (
  id               uuid primary key default gen_random_uuid(),
  nombre_completo  text not null,
  numero_documento text not null unique,
  email            text,
  telefono         text,
  servicio_id      uuid not null references servicios(id),
  cargo_id         uuid not null references cargos(id),
  activo           boolean not null default true,
  fecha_ingreso    date,
  observacion      text,
  created_at       timestamptz not null default now()
);
create index on colaboradores (servicio_id);
create index on colaboradores (cargo_id);

-- ---------- Catálogo de siglas (CRUD admin) ----------
-- categoria_capacidad alimenta los contadores: dia | manana | tarde | noche | noche8
create table catalogo_siglas (
  id          uuid primary key default gen_random_uuid(),
  sigla       text not null unique,
  descripcion text not null,
  horas       numeric(5,2) not null default 0,
  es_ausencia boolean not null default false,
  categoria_capacidad text check (categoria_capacidad in ('dia','manana','tarde','noche','noche8')),
  activo      boolean not null default true,
  orden       int not null default 0
);

-- ---------- Reglas de color (rango de horas semanales) ----------
create table reglas_color (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  operador  text not null check (operador in ('=','<','>','<=','>=','between')),
  valor_min numeric(5,2),
  valor_max numeric(5,2),
  color     text not null,             -- hex #RRGGBB
  texto     text not null default '#FFFFFF',
  orden     int not null default 0,
  activo    boolean not null default true
);

-- ---------- Festivos Colombia (domingos se calculan en código) ----------
create table festivos_colombia (
  fecha  date primary key,
  nombre text not null
);

-- ---------- Programaciones mensuales ----------
create type estado_prog as enum ('borrador','enviada','cerrada');

create table programaciones (
  id          uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references servicios(id),
  cargo_id    uuid not null references cargos(id),
  anio        int  not null,
  mes         int  not null check (mes between 1 and 12),
  estado      estado_prog not null default 'borrador',
  creado_por  uuid references perfiles(id),
  enviado_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (servicio_id, cargo_id, anio, mes)
);

create table asignaciones (
  id             uuid primary key default gen_random_uuid(),
  programacion_id uuid not null references programaciones(id) on delete cascade,
  colaborador_id uuid not null references colaboradores(id),
  fecha          date not null,
  sigla_id       uuid references catalogo_siglas(id),
  observacion    text,
  unique (programacion_id, colaborador_id, fecha)
);
create index on asignaciones (programacion_id);
create index on asignaciones (colaborador_id);

-- ============================================================
-- Recargos / Nómina
-- ============================================================

-- Tabla de conversión (de la hoja "Convenciones" del Excel).
-- Clave lógica: (codigo, dia_siguiente). Los nocturnos cruzan medianoche,
-- por eso el reparto depende del tipo del día siguiente (ord/fes).
create table convenciones_recargo (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  nombre        text not null,
  horas         numeric(5,2) not null,
  hdo           numeric(5,2) not null default 0, -- diurnas ordinarias
  hno           numeric(5,2) not null default 0, -- nocturnas ordinarias
  hdf           numeric(5,2) not null default 0, -- diurnas festivas
  hnf           numeric(5,2) not null default 0, -- nocturnas festivas
  dia_siguiente text not null check (dia_siguiente in ('ord','fes')),
  observacion   text,
  unique (codigo, dia_siguiente)
);

-- Mapeo sigla de programación -> familia de convención.
-- base_codigo es la raíz (d, n, m8, t8, n8, m, t, c=11h dia, p=11h noche, a, b);
-- el motor agrega ord/fes según el calendario. null => sin recargo (libre/ausencia).
create table mapeo_siglas_convencion (
  id          uuid primary key default gen_random_uuid(),
  sigla_id    uuid not null references catalogo_siglas(id) on delete cascade,
  base_codigo text,                     -- null = libre / ausencia
  revisado    boolean not null default true,  -- false = requiere confirmación admin
  unique (sigla_id)
);

-- Liquidación mensual consolidada (Nómina ajusta; auto-calculada base).
create table liquidaciones_recargo (
  id             uuid primary key default gen_random_uuid(),
  anio           int not null,
  mes            int not null check (mes between 1 and 12),
  colaborador_id uuid not null references colaboradores(id),
  hdo numeric(7,2) not null default 0,
  hno numeric(7,2) not null default 0,
  hdf numeric(7,2) not null default 0,
  hnf numeric(7,2) not null default 0,
  total numeric(7,2) not null default 0,
  ajustada       boolean not null default false,
  editado_por    uuid references perfiles(id),
  updated_at     timestamptz not null default now(),
  unique (anio, mes, colaborador_id)
);

-- ============================================================
-- RLS
-- ============================================================
alter table perfiles                enable row level security;
alter table servicios               enable row level security;
alter table cargos                  enable row level security;
alter table colaboradores           enable row level security;
alter table catalogo_siglas         enable row level security;
alter table reglas_color            enable row level security;
alter table festivos_colombia       enable row level security;
alter table programaciones          enable row level security;
alter table asignaciones            enable row level security;
alter table convenciones_recargo    enable row level security;
alter table mapeo_siglas_convencion enable row level security;
alter table liquidaciones_recargo   enable row level security;

-- Helpers
create or replace function rol_actual() returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function servicio_actual() returns uuid
language sql stable security definer set search_path = public as $$
  select servicio_id from perfiles where id = auth.uid()
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(rol_actual() = 'admin', false)
$$;

-- Perfiles: cada quien ve el suyo; admin ve todos.
create policy perfiles_self on perfiles for select using (id = auth.uid() or es_admin());
create policy perfiles_admin_all on perfiles for all using (es_admin()) with check (es_admin());

-- Catálogos de lectura para cualquier usuario autenticado; escritura solo admin.
create policy serv_read on servicios for select using (auth.role() = 'authenticated');
create policy serv_admin on servicios for all using (es_admin()) with check (es_admin());
create policy cargo_read on cargos for select using (auth.role() = 'authenticated');
create policy cargo_admin on cargos for all using (es_admin()) with check (es_admin());
create policy sig_read on catalogo_siglas for select using (auth.role() = 'authenticated');
create policy sig_admin on catalogo_siglas for all using (es_admin()) with check (es_admin());
create policy col_read2 on reglas_color for select using (auth.role() = 'authenticated');
create policy col_admin on reglas_color for all using (es_admin()) with check (es_admin());
create policy fest_read on festivos_colombia for select using (auth.role() = 'authenticated');
create policy fest_admin on festivos_colombia for all using (es_admin()) with check (es_admin());
create policy conv_read on convenciones_recargo for select using (auth.role() = 'authenticated');
create policy conv_admin on convenciones_recargo for all using (es_admin()) with check (es_admin());
create policy map_read on mapeo_siglas_convencion for select using (auth.role() = 'authenticated');
create policy map_admin on mapeo_siglas_convencion for all using (es_admin()) with check (es_admin());

-- Colaboradores: lectura para todos los autenticados; gestiona admin o coordinador del servicio.
create policy colab_read on colaboradores for select using (auth.role() = 'authenticated');
create policy colab_write on colaboradores for all
  using (es_admin() or (rol_actual() = 'coordinador' and servicio_id = servicio_actual()))
  with check (es_admin() or (rol_actual() = 'coordinador' and servicio_id = servicio_actual()));

-- Programaciones: lectura todos; escribe admin o coordinador de su servicio. Nómina solo lee.
create policy prog_read on programaciones for select using (auth.role() = 'authenticated');
create policy prog_write on programaciones for all
  using (es_admin() or (rol_actual() = 'coordinador' and servicio_id = servicio_actual()))
  with check (es_admin() or (rol_actual() = 'coordinador' and servicio_id = servicio_actual()));

-- Asignaciones: lectura todos; escribe admin o coordinador dueño de la programación.
create policy asig_read on asignaciones for select using (auth.role() = 'authenticated');
create policy asig_write on asignaciones for all
  using (
    es_admin() or exists (
      select 1 from programaciones p
      where p.id = asignaciones.programacion_id
        and rol_actual() = 'coordinador' and p.servicio_id = servicio_actual()
    )
  )
  with check (
    es_admin() or exists (
      select 1 from programaciones p
      where p.id = asignaciones.programacion_id
        and rol_actual() = 'coordinador' and p.servicio_id = servicio_actual()
    )
  );

-- Liquidaciones: lectura todos; escribe admin o nómina.
create policy liq_read on liquidaciones_recargo for select using (auth.role() = 'authenticated');
create policy liq_write on liquidaciones_recargo for all
  using (es_admin() or rol_actual() = 'nomina')
  with check (es_admin() or rol_actual() = 'nomina');
