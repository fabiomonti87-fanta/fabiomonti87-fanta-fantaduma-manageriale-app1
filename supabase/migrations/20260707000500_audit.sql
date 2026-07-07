-- Audit trigger generico su tutte le tabelle di dominio (doc 03: utente, entità, before/after).
-- Invariante 2 (doc 02 §12): nessuna cancellazione fisica — il trigger registra anche i DELETE
-- per intercettare eventuali violazioni della regola.

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (user_id, entity_type, entity_id, action, before_json, after_json)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(
      case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid
           else (to_jsonb(new) ->> 'id')::uuid end,
      null
    ),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger audit_seasons after insert or update or delete on seasons
  for each row execute function public.audit_trigger();
create trigger audit_market_windows after insert or update or delete on market_windows
  for each row execute function public.audit_trigger();
create trigger audit_teams after insert or update or delete on teams
  for each row execute function public.audit_trigger();
create trigger audit_players after insert or update or delete on players
  for each row execute function public.audit_trigger();
create trigger audit_fvm_snapshots after insert or update or delete on fvm_snapshots
  for each row execute function public.audit_trigger();
create trigger audit_contracts after insert or update or delete on contracts
  for each row execute function public.audit_trigger();
create trigger audit_contract_year_charges after insert or update or delete on contract_year_charges
  for each row execute function public.audit_trigger();
create trigger audit_operations after insert or update or delete on operations
  for each row execute function public.audit_trigger();
create trigger audit_operation_items after insert or update or delete on operation_items
  for each row execute function public.audit_trigger();
create trigger audit_credit_movements after insert or update or delete on credit_movements
  for each row execute function public.audit_trigger();
create trigger audit_euro_movements after insert or update or delete on euro_movements
  for each row execute function public.audit_trigger();
create trigger audit_roster_entries after insert or update or delete on roster_entries
  for each row execute function public.audit_trigger();
create trigger audit_imports after insert or update or delete on imports
  for each row execute function public.audit_trigger();
