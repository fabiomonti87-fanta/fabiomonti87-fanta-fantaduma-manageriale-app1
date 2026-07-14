-- Sprint 4 — Operazioni e workflow (doc 04).
-- 1) contract_year_charges.team_id: l'addebito resta della squadra che l'ha subito
--    anche se il contratto viene poi trasferito (la redistribuzione avviene via euro_movements).
-- 2) contracts.acquired_session: sessione di mercato d'acquisto per l'Osimhen Gate (doc 02 §8).
-- 3) v_team_salary: monte ingaggi = addebiti contrattuali (per squadra addebitata)
--    + ledger euro con causale 'ingaggio' (rettifiche, trasferimenti, nuovi contratti).
-- 4) bootstrap public.users da auth.users + trigger alla registrazione.
-- 5) RPC sprint4_esegui: scritture multi-tabella in transazione unica (solo service role).

-- 1. attribuzione immutabile degli addebiti.
--    Convenzione del foglio (vedi quadratura.ts): l'ingaggio è a carico della squadra
--    che OSPITA il giocatore (prestiti inclusi), non del proprietario del contratto.
alter table contract_year_charges add column if not exists team_id uuid references teams(id);
update contract_year_charges cyc
set team_id = coalesce(r.team_id, c.team_id)
from contracts c
left join roster_entries r
  on r.player_id = c.player_id and r.end_date is null
where c.id = cyc.contract_id and cyc.team_id is null;

-- 2. sessione d'acquisto (0 = pregresso migrato: mai in Osimhen Gate)
alter table contracts add column if not exists acquired_session int not null default 0;

-- 3. monte ingaggi: addebiti (squadra addebitata, non proprietaria attuale) + ledger euro
create or replace view v_team_salary as
select
  t.id as team_id,
  t.name as team_name,
  s.id as season_id,
  coalesce(ch.tot, 0) + coalesce(em.tot, 0) as salary_total_eur,
  s.salary_cap_eur,
  s.salary_cap_eur - (coalesce(ch.tot, 0) + coalesce(em.tot, 0)) as cap_headroom_eur
from teams t
cross join seasons s
left join lateral (
  select sum(cyc.amount_charged_eur) as tot
  from contract_year_charges cyc
  join contracts c on c.id = cyc.contract_id
  where coalesce(cyc.team_id, c.team_id) = t.id
    and cyc.season_id = s.id
    and cyc.status = 'active'
) ch on true
left join lateral (
  select sum(e.amount_eur) as tot
  from euro_movements e
  where e.team_id = t.id and e.season_id = s.id and e.reason = 'ingaggio'
) em on true
where s.is_current;

-- 3bis. ultimo FVM per giocatore (idratazione engine e consultazione senza paginare 3769 snapshot)
create or replace view v_fvm_ultimo as
select distinct on (player_id) id, player_id, fvm_m, snapshot_date
from fvm_snapshots
order by player_id, snapshot_date desc, created_at desc;

-- 4. bootstrap utenti: riga in public.users alla registrazione (magic link);
--    il committente è super_admin, gli altri partono viewer e vengono promossi dall'admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case when lower(new.email) = 'fabiomonti87@gmail.com' then 'super_admin'::user_role else 'viewer'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.users (id, email, role)
select u.id, u.email,
  case when lower(u.email) = 'fabiomonti87@gmail.com' then 'super_admin'::user_role else 'viewer'::user_role end
from auth.users u
on conflict (id) do nothing;

update public.users set role = 'super_admin' where lower(email) = 'fabiomonti87@gmail.com';

-- 5. scritture atomiche del rules engine server-side.
-- payload = {
--   "inserts": [{"table":"operations","rows":[{...},...]}, ...],
--   "updates": [{"table":"contracts","id":"...","patch":{...}}, ...]
-- }
-- Inserisce solo le colonne presenti nel JSON (le altre usano i default),
-- aggiorna solo le colonne del patch. Tutto in un'unica transazione:
-- qualsiasi errore annulla ogni scrittura (doc 01 §3.3, "transazione unica").
create or replace function public.sprint4_esegui(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ins jsonb;
  upd jsonb;
  riga jsonb;
  tbl text;
  cols text;
  ammesse constant text[] := array[
    'operations','operation_items','contracts','contract_year_charges',
    'roster_entries','credit_movements','euro_movements','fvm_snapshots',
    'audit_logs','market_windows','imports','players'
  ];
begin
  for ins in select * from jsonb_array_elements(coalesce(payload->'inserts', '[]'::jsonb))
  loop
    tbl := ins->>'table';
    if tbl is null or not (tbl = any(ammesse)) then
      raise exception 'tabella non ammessa: %', tbl;
    end if;
    for riga in select * from jsonb_array_elements(coalesce(ins->'rows', '[]'::jsonb))
    loop
      select string_agg(format('%I', k), ', ') into cols from jsonb_object_keys(riga) as k;
      if cols is null then
        raise exception 'riga vuota per %', tbl;
      end if;
      execute format(
        'insert into %I (%s) select %s from jsonb_populate_record(null::%I, $1)',
        tbl, cols, cols, tbl
      ) using riga;
    end loop;
  end loop;

  for upd in select * from jsonb_array_elements(coalesce(payload->'updates', '[]'::jsonb))
  loop
    tbl := upd->>'table';
    if tbl is null or not (tbl = any(ammesse)) then
      raise exception 'tabella non ammessa: %', tbl;
    end if;
    riga := upd->'patch';
    select string_agg(format('%I', k), ', ') into cols from jsonb_object_keys(riga) as k;
    if cols is null then
      raise exception 'patch vuoto per %', tbl;
    end if;
    execute format(
      'update %I set (%s) = (select %s from jsonb_populate_record(null::%I, $1)) where id = $2',
      tbl, cols, cols, tbl
    ) using riga, (upd->>'id')::uuid;
  end loop;
end;
$$;

-- Solo il rules engine server-side (service role) può eseguire scritture.
revoke all on function public.sprint4_esegui(jsonb) from public;
revoke all on function public.sprint4_esegui(jsonb) from anon;
revoke all on function public.sprint4_esegui(jsonb) from authenticated;
grant execute on function public.sprint4_esegui(jsonb) to service_role;
