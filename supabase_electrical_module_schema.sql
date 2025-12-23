-- GLOBAL Electrical Module (EU/PT RTE BT + US NEC) for Supabase Postgres
-- Includes: electrical_projects, electrical_circuits, electrical_loads, electrical_chats
-- Best practices: UUID PKs, FKs, indexes, updated_at triggers, RLS policies, integrity via triggers.

-- Extensions (safe if already enabled)
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.electrical_standard as enum ('EU_PT', 'US_NEC');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.circuit_status as enum ('ok', 'warning', 'overload');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.electrical_chat_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null;
end $$;

-- updated_at helper (if not already created)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- ELECTRICAL PROJECTS (electrical context for Layout Maker)
-- ============================================================================
create table if not exists public.electrical_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  
  -- Link to existing layout/event if needed
  layout_id uuid null,
  event_id uuid null,
  
  name text not null,
  description text null,
  
  -- Toggle per project: EU/PT vs US
  standard public.electrical_standard not null default 'EU_PT',
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists electrical_projects_owner_id_idx on public.electrical_projects(owner_id);
create index if not exists electrical_projects_standard_idx on public.electrical_projects(standard);
create index if not exists electrical_projects_layout_id_idx on public.electrical_projects(layout_id);
create index if not exists electrical_projects_event_id_idx on public.electrical_projects(event_id);

drop trigger if exists electrical_projects_set_updated_at on public.electrical_projects;
create trigger electrical_projects_set_updated_at
before update on public.electrical_projects
for each row execute function public.set_updated_at();

-- ============================================================================
-- ELECTRICAL CIRCUITS
-- ============================================================================
create table if not exists public.electrical_circuits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.electrical_projects(id) on delete cascade,

  name text not null,
  
  -- Standard stored on circuit for strong CHECK constraints
  standard public.electrical_standard not null,
  breaker_amps int not null,
  voltage int not null,

  -- Aggregates (maintained by trigger from electrical_loads)
  total_watts int not null default 0,
  total_outlets int not null default 0,

  -- Capacity hints (computed by trigger)
  capacity_watts int not null default 0,            -- breaker_amps * voltage
  recommended_max_watts int not null default 0,     -- floor(capacity_watts * 0.8)

  status public.circuit_status not null default 'ok',

  -- Cached loads array for UI (maintained by trigger)
  loads jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- EU/PT (RTE BT): 230V, breakers: 10/16/20/25/32/40/63A
  -- US (NEC): 120V, breakers: 15/20/25/30/40/50A
  constraint electrical_circuits_standard_voltage_breaker_chk check (
    (standard = 'EU_PT' and voltage = 230 and breaker_amps in (10,16,20,25,32,40,63))
    or
    (standard = 'US_NEC' and voltage = 120 and breaker_amps in (15,20,25,30,40,50))
  )
);

create index if not exists electrical_circuits_project_id_idx on public.electrical_circuits(project_id);
create index if not exists electrical_circuits_status_idx on public.electrical_circuits(status);

drop trigger if exists electrical_circuits_set_updated_at on public.electrical_circuits;
create trigger electrical_circuits_set_updated_at
before update on public.electrical_circuits
for each row execute function public.set_updated_at();

-- Ensure circuits inherit project.standard by default if not supplied
create or replace function public.electrical_circuits_inherit_project_standard()
returns trigger
language plpgsql
as $$
declare
  proj_standard public.electrical_standard;
begin
  if new.standard is null then
    select p.standard into proj_standard from public.electrical_projects p where p.id = new.project_id;
    if proj_standard is null then
      raise exception 'Electrical project % not found or missing standard', new.project_id;
    end if;
    new.standard := proj_standard;
  end if;

  -- Initialize capacity fields
  new.capacity_watts := greatest(0, new.breaker_amps * new.voltage);
  new.recommended_max_watts := floor(new.capacity_watts * 0.8)::int;
  return new;
end;
$$;

drop trigger if exists electrical_circuits_inherit_standard on public.electrical_circuits;
create trigger electrical_circuits_inherit_standard
before insert on public.electrical_circuits
for each row execute function public.electrical_circuits_inherit_project_standard();

-- ============================================================================
-- ELECTRICAL LOADS (normalized)
-- ============================================================================
create table if not exists public.electrical_loads (
  id uuid primary key default gen_random_uuid(),
  circuit_id uuid not null references public.electrical_circuits(id) on delete cascade,

  label text not null,
  
  -- watts per unit (e.g., a light = 60W)
  watts int not null check (watts >= 0),
  quantity int not null default 1 check (quantity >= 1),

  -- outlets consumed per unit (e.g., a vendor plug uses 1 outlet)
  outlets_per_unit int not null default 0 check (outlets_per_unit >= 0),

  -- Optional classification / metadata for UI + future rules
  kind text null,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists electrical_loads_circuit_id_idx on public.electrical_loads(circuit_id);

drop trigger if exists electrical_loads_set_updated_at on public.electrical_loads;
create trigger electrical_loads_set_updated_at
before update on public.electrical_loads
for each row execute function public.set_updated_at();

-- ============================================================================
-- Recompute circuit aggregates + enforce max outlets per standard
-- EU/PT max outlets: 8
-- US max outlets: 10
-- ============================================================================
create or replace function public.recompute_electrical_circuit_from_loads(p_circuit_id uuid)
returns void
language plpgsql
as $$
declare
  c_standard public.electrical_standard;
  c_breaker int;
  c_voltage int;

  sum_watts int;
  sum_outlets int;

  cap_watts int;
  rec_max_watts int;
  new_status public.circuit_status;

  max_outlets_allowed int;
  loads_json jsonb;
begin
  select standard, breaker_amps, voltage
    into c_standard, c_breaker, c_voltage
  from public.electrical_circuits
  where id = p_circuit_id;

  if not found then
    return;
  end if;

  select
    coalesce(sum(l.watts * l.quantity), 0)::int,
    coalesce(sum(l.outlets_per_unit * l.quantity), 0)::int
  into sum_watts, sum_outlets
  from public.electrical_loads l
  where l.circuit_id = p_circuit_id;

  if c_standard = 'EU_PT' then
    max_outlets_allowed := 8;
  else
    max_outlets_allowed := 10;
  end if;

  if sum_outlets > max_outlets_allowed then
    raise exception 'Too many outlets on circuit %. % outlets exceeds max % for standard %',
      p_circuit_id, sum_outlets, max_outlets_allowed, c_standard;
  end if;

  cap_watts := greatest(0, c_breaker * c_voltage);
  rec_max_watts := floor(cap_watts * 0.8)::int;

  if sum_watts > cap_watts then
    new_status := 'overload';
  elsif sum_watts > rec_max_watts then
    new_status := 'warning';
  else
    new_status := 'ok';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'label', l.label,
        'kind', l.kind,
        'watts', l.watts,
        'quantity', l.quantity,
        'outlets_per_unit', l.outlets_per_unit,
        'total_watts', (l.watts * l.quantity),
        'total_outlets', (l.outlets_per_unit * l.quantity),
        'meta', l.meta
      )
      order by l.created_at asc
    ),
    '[]'::jsonb
  )
  into loads_json
  from public.electrical_loads l
  where l.circuit_id = p_circuit_id;

  update public.electrical_circuits
  set
    total_watts = sum_watts,
    total_outlets = sum_outlets,
    capacity_watts = cap_watts,
    recommended_max_watts = rec_max_watts,
    status = new_status,
    loads = loads_json,
    updated_at = now()
  where id = p_circuit_id;
end;
$$;

create or replace function public.electrical_loads_after_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform public.recompute_electrical_circuit_from_loads(new.circuit_id);
  elsif tg_op = 'DELETE' then
    perform public.recompute_electrical_circuit_from_loads(old.circuit_id);
  end if;
  return null;
end;
$$;

drop trigger if exists electrical_loads_after_change_trg on public.electrical_loads;
create trigger electrical_loads_after_change_trg
after insert or update or delete on public.electrical_loads
for each row execute function public.electrical_loads_after_change();

-- ============================================================================
-- ELECTRICAL CHATS (project/circuit scoped)
-- ============================================================================
create table if not exists public.electrical_chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.electrical_projects(id) on delete cascade,
  circuit_id uuid null references public.electrical_circuits(id) on delete cascade,

  role public.electrical_chat_role not null,
  content text not null,

  created_at timestamptz not null default now()
);

create index if not exists electrical_chats_project_id_created_at_idx
  on public.electrical_chats(project_id, created_at desc);

create index if not exists electrical_chats_circuit_id_created_at_idx
  on public.electrical_chats(circuit_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.electrical_projects enable row level security;
alter table public.electrical_circuits enable row level security;
alter table public.electrical_loads enable row level security;
alter table public.electrical_chats enable row level security;

-- Projects policies
drop policy if exists electrical_projects_select_own on public.electrical_projects;
create policy electrical_projects_select_own
on public.electrical_projects for select
using (auth.uid() = owner_id);

drop policy if exists electrical_projects_insert_own on public.electrical_projects;
create policy electrical_projects_insert_own
on public.electrical_projects for insert
with check (auth.uid() = owner_id);

drop policy if exists electrical_projects_update_own on public.electrical_projects;
create policy electrical_projects_update_own
on public.electrical_projects for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists electrical_projects_delete_own on public.electrical_projects;
create policy electrical_projects_delete_own
on public.electrical_projects for delete
using (auth.uid() = owner_id);

-- Circuits policies (via project ownership)
drop policy if exists electrical_circuits_select_own on public.electrical_circuits;
create policy electrical_circuits_select_own
on public.electrical_circuits for select
using (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_circuits.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_circuits_insert_own on public.electrical_circuits;
create policy electrical_circuits_insert_own
on public.electrical_circuits for insert
with check (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_circuits.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_circuits_update_own on public.electrical_circuits;
create policy electrical_circuits_update_own
on public.electrical_circuits for update
using (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_circuits.project_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_circuits.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_circuits_delete_own on public.electrical_circuits;
create policy electrical_circuits_delete_own
on public.electrical_circuits for delete
using (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_circuits.project_id
      and p.owner_id = auth.uid()
  )
);

-- Loads policies (via circuit -> project ownership)
drop policy if exists electrical_loads_select_own on public.electrical_loads;
create policy electrical_loads_select_own
on public.electrical_loads for select
using (
  exists (
    select 1
    from public.electrical_circuits c
    join public.electrical_projects p on p.id = c.project_id
    where c.id = electrical_loads.circuit_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_loads_insert_own on public.electrical_loads;
create policy electrical_loads_insert_own
on public.electrical_loads for insert
with check (
  exists (
    select 1
    from public.electrical_circuits c
    join public.electrical_projects p on p.id = c.project_id
    where c.id = electrical_loads.circuit_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_loads_update_own on public.electrical_loads;
create policy electrical_loads_update_own
on public.electrical_loads for update
using (
  exists (
    select 1
    from public.electrical_circuits c
    join public.electrical_projects p on p.id = c.project_id
    where c.id = electrical_loads.circuit_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.electrical_circuits c
    join public.electrical_projects p on p.id = c.project_id
    where c.id = electrical_loads.circuit_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_loads_delete_own on public.electrical_loads;
create policy electrical_loads_delete_own
on public.electrical_loads for delete
using (
  exists (
    select 1
    from public.electrical_circuits c
    join public.electrical_projects p on p.id = c.project_id
    where c.id = electrical_loads.circuit_id
      and p.owner_id = auth.uid()
  )
);

-- Chats policies (via project ownership)
drop policy if exists electrical_chats_select_own on public.electrical_chats;
create policy electrical_chats_select_own
on public.electrical_chats for select
using (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_chats.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_chats_insert_own on public.electrical_chats;
create policy electrical_chats_insert_own
on public.electrical_chats for insert
with check (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_chats.project_id
      and p.owner_id = auth.uid()
  )
);

drop policy if exists electrical_chats_delete_own on public.electrical_chats;
create policy electrical_chats_delete_own
on public.electrical_chats for delete
using (
  exists (
    select 1 from public.electrical_projects p
    where p.id = electrical_chats.project_id
      and p.owner_id = auth.uid()
  )
);

