-- GRANT per i ruoli API di Supabase.
-- Necessari perché le tabelle sono create via migrazione con
-- "Automatically expose new tables" disattivato: la RLS decide QUALI righe
-- sono visibili, ma i privilegi di tabella devono comunque consentire alle
-- richieste PostgREST (anon/authenticated/service_role) di raggiungerle.
-- Senza questi grant, anche le letture legittime falliscono con
-- "permission denied for table ...".

grant usage on schema public to anon, authenticated, service_role;

-- service_role: usata dal rules engine server-side, bypassa la RLS → accesso pieno.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- authenticated: utenti loggati. Lettura su tutte le tabelle/viste (poi filtrata dalla RLS:
-- read_all ovunque, audit_logs solo super_admin).
grant select on all tables in schema public to authenticated;

-- Scritture consentite ai president tramite le policy RLS (proposta operazioni pending).
grant insert on operations, operation_items to authenticated;
grant update on operations to authenticated;

-- anon (non autenticato): nessun grant di tabella → l'app richiede sempre login.

-- Default privileges per eventuali oggetti futuri creati da postgres in public.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to authenticated;
