# Data Model Brief — Fantaduma Manageriale

## 1. Principio generale

Il modello dati deve essere relazionale e auditabile.

Stack consigliato: PostgreSQL su Supabase.

## 2. Tabelle principali

## users

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| email | text | unique |
| display_name | text | nome visibile |
| role | enum | admin/manager/viewer |
| team_id | uuid | nullable |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## teams

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| name | text | nome squadra |
| manager_user_id | uuid | FK users |
| season | text | es. 2026/27 |
| initial_credits | numeric | crediti iniziali |
| current_credits | numeric | crediti residui |
| salary_cap | numeric | es. 250 |
| status | enum | active/inactive |
| notes | text |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## players

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| external_id | text | ID import/Fantacalcio, se disponibile |
| name | text | nome giocatore |
| mantra_roles | text[] | ruoli Mantra |
| real_club | text | squadra reale |
| fvm | numeric | quotazione/FVM |
| status | enum | active/inactive/unknown |
| notes | text |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## roster_entries

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| team_id | uuid | FK teams |
| player_id | uuid | FK players |
| season | text |  |
| roster_status | enum | active/sold/released/loan/youth/asterisked |
| start_date | date | ingresso |
| end_date | date | uscita, nullable |
| source_operation_id | uuid | FK operations |
| notes | text |  |

## contracts

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| team_id | uuid | FK teams |
| player_id | uuid | FK players |
| season | text |  |
| contract_type | enum | standard/loan/right/obligation/youth/other |
| start_date | date |  |
| end_date | date |  |
| salary | numeric | stipendio nominale |
| quota_percent | numeric | 100/80/60/40/20/altro |
| salary_cap_impact | numeric | calcolato |
| status | enum | active/closed/transferred/expired |
| parent_contract_id | uuid | nullable |
| notes | text |  |

## operations

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| operation_type | enum | buy/release/trade/loan/renewal/right/obligation/admin_adjustment |
| operation_date | date |  |
| season | text |  |
| market_window | enum | summer/winter/other |
| created_by | uuid | FK users |
| status | enum | draft/confirmed/cancelled |
| credits_impact | numeric | impatto complessivo |
| salary_cap_impact | numeric | impatto complessivo |
| notes | text |  |
| created_at | timestamp |  |

## operation_items

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| operation_id | uuid | FK operations |
| team_id | uuid | FK teams |
| player_id | uuid | FK players |
| direction | enum | in/out/neutral |
| credits_delta | numeric |  |
| salary_delta | numeric |  |
| quota_percent | numeric |  |
| notes | text |  |

## audit_logs

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users |
| entity_type | text | es. contracts |
| entity_id | uuid |  |
| action | text | create/update/delete/confirm |
| before_json | jsonb | stato precedente |
| after_json | jsonb | stato successivo |
| created_at | timestamp |  |

## imports

| Campo | Tipo | Note |
|---|---|---|
| id | uuid | PK |
| import_type | enum | players/teams/rosters/contracts/operations/fvm |
| file_name | text |  |
| status | enum | uploaded/validated/imported/failed |
| rows_total | integer |  |
| rows_valid | integer |  |
| rows_error | integer |  |
| created_by | uuid | FK users |
| created_at | timestamp |  |

## 3. Vincoli logici

- Un giocatore può avere molte righe roster nel tempo.
- Un giocatore può avere molti contratti nello storico.
- Un contratto attivo dovrebbe essere unico per team/player/season, salvo eccezioni da regolamento.
- Le operazioni devono essere immutabili dopo conferma, salvo rettifica admin.
- Ogni modifica manuale rilevante deve generare audit log.

## 4. Indici consigliati

- players.name
- players.external_id
- roster_entries.team_id
- roster_entries.player_id
- contracts.team_id
- contracts.player_id
- contracts.status
- operations.operation_date
- audit_logs.entity_type + entity_id
