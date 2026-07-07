-- Tabelle core dal doc 03_Data_Model_v2.md.
-- Regola architetturale: i saldi NON sono colonne — budget e monte ingaggi
-- derivano dai ledger credit_movements / euro_movements (viste in migrazione 000300).

create table seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- es. '2026/27'
  started_at date,
  ended_at date,
  salary_cap_eur numeric not null default 250,
  min_ingaggi_eur numeric not null default 50,
  plurannual_slots int not null default 11,
  plurannual_slots_winter int not null default 12,
  roster_min int not null default 23,
  roster_max int not null default 30,
  vivaio_slots int not null default 3,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- una sola stagione corrente
create unique index seasons_one_current on seasons (is_current) where is_current;

create table market_windows (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  window_type window_type not null,
  opens_at timestamptz,
  closes_at timestamptz,
  ordinal int, -- 1–5 per l'ammortamento 20% a finestra (doc 02 §5)
  rules_flags jsonb not null default '{}', -- es. {"prestiti":false,"conguagli":false} per la 5ª
  status text not null default 'scheduled' check (status in ('scheduled','open','paused','closed')),
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  president_user_id uuid, -- FK aggiunta dopo la creazione di users
  logo_url text,
  colors jsonb not null default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role user_role not null default 'viewer',
  team_id uuid references teams(id),
  created_at timestamptz not null default now()
);

alter table teams
  add constraint teams_president_fk foreign key (president_user_id) references users(id);

create table players (
  id uuid primary key default gen_random_uuid(),
  fc_id text unique, -- ID Fantacalcio ("Colonna 1" del gestionale); nullable per i casi #N/A da bonificare
  name text not null,
  mantra_roles text[] not null default '{}',
  serie_a_club text,
  birth_date date, -- serve per vivaio / compimento 22 anni
  listone_status text not null default 'in_listone' check (listone_status in ('in_listone','asteriscato','assente')),
  notes text,
  created_at timestamptz not null default now()
);

create table imports (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in ('fvm_snapshot','listone','rose','migrazione')),
  file_name text,
  status text not null default 'pending' check (status in ('pending','preview','confirmed','error','cancelled')),
  rows_total int,
  rows_valid int,
  rows_error int,
  mapping jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table fvm_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  fvm_m numeric not null,
  snapshot_date date not null,
  source text not null check (source in ('listone_estivo','listone_invernale','update','stima','manual')),
  import_id uuid references imports(id),
  season_id uuid references seasons(id),
  created_at timestamptz not null default now(),
  unique (player_id, snapshot_date, source)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  team_id uuid not null references teams(id),
  season_start_id uuid not null references seasons(id),
  contract_type contract_type not null,
  years_total int not null check (years_total between 1 and 3),
  current_year int not null default 1 check (current_year between 1 and 3),
  fvm_frozen numeric not null, -- FVM M congelato il giorno dell'asta (doc 02 §2)
  base_salary_eur numeric not null, -- ceil_to(fvm_frozen*0.10, 0.50), min 0.50 — calcolato dal rules engine
  status contract_status not null default 'active',
  parent_contract_id uuid references contracts(id), -- rinnovi/subentri
  acquired_price_credits numeric, -- per Osimhen Gate e plus/minusvalenze
  original_owner_team_id uuid references teams(id), -- per prestiti
  rescinded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table contract_year_charges (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id),
  season_id uuid not null references seasons(id),
  year_index int not null check (year_index between 1 and 3),
  surcharge_pct numeric not null default 0, -- 0 / 15 / 10 / 30 (doc 02 §2)
  halved boolean not null default false, -- contratti invernali anno 1 (½ STD)
  amount_due_eur numeric not null,
  amount_charged_eur numeric not null, -- dopo ammortamenti per finestre / svincoli
  status text not null default 'active' check (status in ('active','settled','waived','transferred')),
  created_at timestamptz not null default now(),
  unique (contract_id, year_index)
);

create table operations (
  id uuid primary key default gen_random_uuid(),
  operation_type operation_type not null,
  season_id uuid not null references seasons(id),
  market_window_id uuid references market_windows(id),
  effective_matchday int, -- formalizzazione a fine giornata di campionato
  proposed_by uuid not null references users(id),
  approved_by uuid references users(id),
  status operation_status not null default 'draft',
  proposed_at timestamptz not null default now(),
  decided_at timestamptz,
  notes text,
  chat_reference text, -- formula comunicata in chat di lega
  created_at timestamptz not null default now()
);

create table operation_items (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references operations(id),
  team_id uuid not null references teams(id),
  player_id uuid references players(id),
  direction text not null check (direction in ('in','out','neutral')),
  credits_delta numeric not null default 0,
  salary_transfer_pct numeric, -- divisione ingaggio concordata (validazione non-retroattività nel rules engine)
  new_contract_type contract_type,
  notes text
);

-- Ledger crediti: budget squadra = SOMMA movimenti (mai colonna saldo)
create table credit_movements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  season_id uuid not null references seasons(id),
  operation_id uuid references operations(id),
  amount numeric not null, -- +/- crediti
  reason text not null check (reason in ('saldo_iniziale','acquisto','cessione','svincolo','conguaglio','bonus_missione','rettifica')),
  created_at timestamptz not null default now()
);

-- Ledger euro: monte ingaggi, multe e montepremi derivano da qui
create table euro_movements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  season_id uuid not null references seasons(id),
  amount_eur numeric not null,
  reason text not null check (reason in ('quota_iscrizione','ingaggio','multa','premio','rettifica')),
  operation_id uuid references operations(id),
  matchday int,
  created_at timestamptz not null default now()
);

create table roster_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id),
  player_id uuid not null references players(id),
  season_id uuid not null references seasons(id),
  state player_state not null,
  slot_kind text not null check (slot_kind in ('rosa','vivaio')),
  start_date date not null,
  end_date date, -- null = attivo; mai cancellare fisicamente, solo chiudere
  source_operation_id uuid references operations(id),
  loan_from_team_id uuid references teams(id),
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

-- Indici per le letture più frequenti
create index idx_fvm_snapshots_player_date on fvm_snapshots (player_id, snapshot_date desc);
create index idx_contracts_team_status on contracts (team_id, status);
create index idx_roster_team_active on roster_entries (team_id) where end_date is null;
create index idx_credit_movements_team on credit_movements (team_id, season_id);
create index idx_euro_movements_team on euro_movements (team_id, season_id);
create index idx_operations_status on operations (status);
create index idx_charges_contract on contract_year_charges (contract_id);
