-- Viste calcolate: fonte di verità = ledger, mai denormalizzare i saldi (doc 03).

-- Crediti residui per squadra (budget = somma del ledger crediti)
create view v_team_budget as
select
  t.id as team_id,
  t.name as team_name,
  coalesce(sum(cm.amount), 0) as budget_credits
from teams t
left join credit_movements cm on cm.team_id = t.id
group by t.id, t.name;

-- Monte ingaggi stagione corrente per squadra (check cap €250)
create view v_team_salary as
select
  t.id as team_id,
  t.name as team_name,
  s.id as season_id,
  coalesce(sum(cyc.amount_charged_eur), 0) as salary_total_eur,
  s.salary_cap_eur,
  s.salary_cap_eur - coalesce(sum(cyc.amount_charged_eur), 0) as cap_headroom_eur
from teams t
cross join seasons s
left join contracts c on c.team_id = t.id and c.status = 'active'
left join contract_year_charges cyc
  on cyc.contract_id = c.id
 and cyc.season_id = s.id
 and cyc.status = 'active'
where s.is_current
group by t.id, t.name, s.id, s.salary_cap_eur;

-- Slot pluriennali usati per squadra (max 11, 12 post asta invernale; vivaio escluso)
create view v_plurannual_slots as
select
  t.id as team_id,
  t.name as team_name,
  count(c.id) as plurannual_used
from teams t
left join contracts c
  on c.team_id = t.id
 and c.status = 'active'
 and c.years_total > 1
 and c.contract_type <> 'vivaio'
group by t.id, t.name;

-- Plus/minusvalenza latente: ultimo FVM M vs prezzo d'acquisto in crediti
create view v_player_networth as
select
  c.id as contract_id,
  c.team_id,
  c.player_id,
  p.name as player_name,
  c.acquired_price_credits,
  fvm.fvm_m as last_fvm_m,
  fvm.snapshot_date as last_fvm_date,
  fvm.fvm_m - c.acquired_price_credits as latent_gain_credits
from contracts c
join players p on p.id = c.player_id
left join lateral (
  select fs.fvm_m, fs.snapshot_date
  from fvm_snapshots fs
  where fs.player_id = c.player_id
  order by fs.snapshot_date desc, fs.created_at desc
  limit 1
) fvm on true
where c.status = 'active';

-- Contratti in scadenza / riconferme da valutare (ultimo anno contrattuale)
create view v_upcoming_expirations as
select
  c.id as contract_id,
  c.team_id,
  t.name as team_name,
  c.player_id,
  p.name as player_name,
  c.contract_type,
  c.years_total,
  c.current_year,
  c.base_salary_eur
from contracts c
join teams t on t.id = c.team_id
join players p on p.id = c.player_id
where c.status = 'active'
  and c.current_year >= c.years_total;
