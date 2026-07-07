# Data Model v2 — FantaDuma Manageriale App
**Versione 4.0 — 07/07/2026 — Sostituisce 04_Data_Model_Brief ChatGPT. PostgreSQL/Supabase.**

Correzioni principali rispetto alla v1 ChatGPT: doppia valuta (crediti vs euro), snapshot FVM storicizzati, tipi contratto/operazione reali (enum dal gestionale), workflow approvazione, finestre mercato, vivaio e asteriscati come cittadini di prima classe, contabilità euro.

## Enum

```sql
create type user_role as enum ('super_admin','president','viewer');
create type contract_type as enum (
  'standard','standard_inverno','diritto_1_1','obbligo_1_1','obbligo_1_2',
  'inverno_obbligo_1_5','inverno_obbligo_2_5','inverno_diritto_0_5_1','vivaio');
create type contract_status as enum ('active','closed','transferred','expired','rescinded');
create type player_state as enum ('in_rosa','vivaio','prestito_in','prestito_out','asteriscato','svincolato');
create type operation_type as enum (
  'asta','asta_riparazione','prestito_out','prestito_in','cessione_definitiva','acquisto_definitivo',
  'svincolo_riconferma','svincolo_obbligo_prec','svincolo_pausa_invernale','svincolo_fine_anno',
  'rescissione_unilaterale','asteriscato','sost_asteriscato','ingresso_vivaio','promosso_da_vivaio',
  'svincolo_vivaio','rettifica_admin');
create type operation_status as enum ('draft','pending','approved','rejected','cancelled');
create type window_type as enum ('asta_estiva','finestra_1','finestra_2','finestra_3','asta_invernale','finestra_4','finestra_5','draft_vivaio','fuori_finestra');
```

## Tabelle core

**seasons** — id, code ('2026/27'), started_at, ended_at, salary_cap_eur (default 250), min_ingaggi_eur (50), plurannual_slots (11), plurannual_slots_winter (12), roster_min, roster_max, vivaio_slots (3), is_current.

**market_windows** — id, season_id FK, window_type, opens_at, closes_at, ordinal (1–5 per l'ammortamento 20%), rules_flags jsonb (es. `{"prestiti":false,"conguagli":false}` per la 5ª), status.

**users** — id (auth.uid), email, display_name, role user_role, team_id FK nullable.

**teams** — id, name, president_user_id FK, logo_url, colors jsonb, status. I saldi NON sono colonne: sono viste calcolate dai movimenti (fonte di verità = ledger).

**players** — id, fc_id text unique (ID Fantacalcio, "Colonna 1"), name, mantra_roles text[], serie_a_club, birth_date nullable (serve per vivaio/22 anni), listone_status ('in_listone','asteriscato','assente'), notes.

**fvm_snapshots** — id, player_id FK, fvm_m numeric, snapshot_date date, source ('listone_estivo','listone_invernale','update','stima','manual'), import_id FK, season_id FK. Unique (player_id, snapshot_date, source). Replica i fogli FVM_* del gestionale.

**contracts** — id, player_id, team_id, season_start_id, contract_type, years_total, current_year, fvm_frozen numeric (FVM M congelato all'asta), base_salary_eur numeric (calcolato: ceil_to(fvm×0,10, 0,5)), status, parent_contract_id (rinnovi/subentri), acquired_price_credits numeric (per Osimhen Gate e plusvalenze), original_owner_team_id (per prestiti), rescinded_at, notes.

**contract_year_charges** — id, contract_id, season_id, year_index, surcharge_pct (0/15/10/30), halved bool (contratti invernali anno 1), amount_due_eur, amount_charged_eur (dopo ammortamenti/svincoli), status. Rende espliciti gli impegni pluriennali futuri (proiezione spese anni futuri).

**roster_entries** — id, team_id, player_id, season_id, state player_state, slot_kind ('rosa','vivaio'), start_date, end_date, source_operation_id, loan_from_team_id nullable.

**operations** — id, operation_type, season_id, market_window_id, effective_matchday int nullable (formalizzazione a fine giornata), proposed_by, approved_by, status operation_status, proposed_at, decided_at, notes, chat_reference text (formula comunicata in chat).

**operation_items** — id, operation_id, team_id, player_id nullable, direction ('in','out','neutral'), credits_delta numeric, salary_transfer_pct numeric (divisione ingaggio concordata), new_contract_type nullable, notes.

**credit_movements** (ledger crediti) — id, team_id, season_id, operation_id FK nullable, amount numeric (+/−), reason ('acquisto','cessione','svincolo','conguaglio','bonus_missione','rettifica'), created_at. Budget squadra = Σ movimenti.

**euro_movements** (ledger contabilità reale) — id, team_id, season_id, amount_eur, reason ('quota_iscrizione','ingaggio','multa','premio','rettifica'), operation_id nullable, matchday nullable, created_at. Monte ingaggi, multe e montepremi derivano da qui.

**audit_logs** — id, user_id, entity_type, entity_id, action, before_json, after_json, created_at. Trigger su tutte le tabelle di dominio.

**imports** — id, import_type ('fvm_snapshot','listone','rose','migrazione'), file_name, status, rows_total/valid/error, mapping jsonb, created_by, created_at.

Nota: nessuna tabella dedicata a gamification/stadium/draft live — l'Analisi V3 è archiviata e non costituisce requisito. Il modello resta comunque estensibile (jsonb su teams, ledger generici).

## Viste calcolate (fonte di verità = ledger, mai denormalizzare i saldi)

- v_team_budget: crediti residui per squadra.
- v_team_salary: monte ingaggi stagione corrente (Σ contract_year_charges attive − ammortamenti) → check cap 250.
- v_plurannual_slots: conteggio contratti pluriennali attivi per squadra.
- v_player_networth: plusvalenza/minusvalenza latente (ultimo FVM − acquired_price_credits).
- v_upcoming_expirations: contratti in scadenza / riconferme da valutare.

## RLS (Supabase)

- Lettura: tutti gli utenti autenticati leggono tutto (trasparenza di lega), tranne audit_logs (solo super_admin).
- Scrittura: operations insert per president (solo team proprio, stato pending); update di stato solo super_admin; tutte le altre tabelle di dominio scrivibili solo da super_admin/service role (via rules engine server-side).

## Migrazione dal GESTIONALE_UFFICIALE (decisione D4)

1. players ← foglio "Gestionale_" col. Colonna 1/Giocatore/Squadra Serie A/Ruolo (bonifica #N/A: matching manuale).
2. teams ← foglio "elenchi" col. nomi (10 squadre).
3. contracts ← Tipo contratto + Data acquisto + Scadenza ipotizzata + FVM congelato + Tipo Acquisto; acquired_price_credits ← Valore Acquisto (attenzione: colonna oggi in #REF!, recuperare da BCK_Gestionale o annate precedenti).
4. fvm_snapshots ← fogli FVM_Asta2324/2425/2526, FVM_astainv, FVM_update, FVM_1luglio, FVM_29072025 (con date).
5. credit_movements saldo iniziale ← "Riepilogo ingaggi E budget".
6. roster_entries ← stato corrente (in rosa/vivaio/prestiti via Squadra Proprietaria Originale).
7. Asteriscati ← fogli Asteriscati25 / Asteriscati_estate25-26.
8. Quadratura obbligatoria post-import: budget per squadra, monte ingaggi per squadra e conteggio slot identici al foglio, prima del go-live.
