-- RLS come da doc 03:
-- - Lettura: tutti gli autenticati leggono tutto (trasparenza di lega), TRANNE audit_logs (solo super_admin).
-- - Scrittura: operations insert per president (stato pending, proposta propria); update di stato solo super_admin;
--   tutte le altre tabelle di dominio scrivibili solo dal rules engine server-side (service role, che bypassa RLS).

-- Helper: ruolo dell'utente corrente (security definer per evitare ricorsione RLS su users)
create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role = 'super_admin' from public.users where id = auth.uid()), false);
$$;

-- Abilita RLS su tutte le tabelle di dominio
alter table seasons enable row level security;
alter table market_windows enable row level security;
alter table users enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table imports enable row level security;
alter table fvm_snapshots enable row level security;
alter table contracts enable row level security;
alter table contract_year_charges enable row level security;
alter table operations enable row level security;
alter table operation_items enable row level security;
alter table credit_movements enable row level security;
alter table euro_movements enable row level security;
alter table roster_entries enable row level security;
alter table audit_logs enable row level security;

-- Lettura per tutti gli autenticati (trasparenza di lega)
create policy read_all on seasons for select to authenticated using (true);
create policy read_all on market_windows for select to authenticated using (true);
create policy read_all on users for select to authenticated using (true);
create policy read_all on teams for select to authenticated using (true);
create policy read_all on players for select to authenticated using (true);
create policy read_all on imports for select to authenticated using (true);
create policy read_all on fvm_snapshots for select to authenticated using (true);
create policy read_all on contracts for select to authenticated using (true);
create policy read_all on contract_year_charges for select to authenticated using (true);
create policy read_all on operations for select to authenticated using (true);
create policy read_all on operation_items for select to authenticated using (true);
create policy read_all on credit_movements for select to authenticated using (true);
create policy read_all on euro_movements for select to authenticated using (true);
create policy read_all on roster_entries for select to authenticated using (true);

-- audit_logs: lettura solo super_admin
create policy read_audit on audit_logs for select to authenticated
  using (public.is_super_admin());

-- operations: i presidenti propongono per la propria squadra, solo in stato pending
create policy president_propose on operations for insert to authenticated
  with check (
    proposed_by = auth.uid()
    and status = 'pending'
    and public.current_user_role() in ('president','super_admin')
  );

-- operation_items: inseribili solo su operazioni pending proposte dall'utente
create policy president_propose_items on operation_items for insert to authenticated
  with check (
    exists (
      select 1 from operations o
      where o.id = operation_id
        and o.proposed_by = auth.uid()
        and o.status = 'pending'
    )
  );

-- Cambio stato operazioni: solo super_admin (la convalida applica gli effetti via rules engine server-side)
create policy admin_decide on operations for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Nessuna policy di insert/update/delete sulle altre tabelle di dominio:
-- scrivono solo il service role (rules engine server-side) e i super_admin via server actions.
