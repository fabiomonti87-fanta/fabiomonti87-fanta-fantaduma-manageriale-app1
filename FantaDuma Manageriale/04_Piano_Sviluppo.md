# Piano di Sviluppo — FantaDuma Manageriale App
**Versione 1.0 — 07/07/2026 — Esecuzione con Claude Code. Sostituisce 08_Backlog_MVP come piano operativo.**

Ogni sprint ha un exit criteria verificabile. Ordine pensato per validare presto le cose rischiose (rules engine e migrazione) e lasciare per ultime quelle facili (UI di consultazione).

## Sprint 0 — Fondazioni (1ª sessione Claude Code)

- Repo GitHub + Next.js (App Router, TypeScript) + Supabase progetto free tier.
- Migrazioni DB: tutti gli enum e le tabelle core del doc 03 (seasons, market_windows, users, teams, players, fvm_snapshots, contracts, contract_year_charges, roster_entries, operations, operation_items, credit_movements, euro_movements, audit_logs, imports).
- Viste: v_team_budget, v_team_salary, v_plurannual_slots, v_player_networth, v_upcoming_expirations.
- Supabase Auth (email/magic link) + RLS come da doc 03.
- Setup Vitest + porting dei TC del file 09 come test skeleton (tutti rossi).
- Deploy demo su Vercel.

**Exit: schema completo in Supabase, login funzionante, CI con test rossi, demo online.**

Primo prompt suggerito per Claude Code: "Leggi CLAUDE.md e i doc 00–03. Esegui lo Sprint 0 del 04_Piano_Sviluppo.md."

## Sprint 1 — Rules engine (il cuore, prima della UI)

- Modulo `rules/` puro (funzioni senza I/O, testabili): calcolo ingaggio e maggiorazioni, ammortamento per finestre, matrice svincoli, STIMA, Osimhen Gate, validatori (cap, slot, rosa, vivaio, finestre).
- Application layer: creazione/validazione/convalida operazioni come transazione unica (operations → items → ledger → roster → contracts → audit).
- Far passare i TC Must delle aree: Doppia valuta, Ingaggi, Salary cap, Slot e rosa, Finestre, Svincoli, STIMA, Asteriscati, Vivaio, Aste, Multe, Workflow.

**Exit: 71/71 TC Must verdi (Summary del file 09 = "SI" lato codice).**

## Sprint 2 — Migrazione dati reali

- Script import dal GESTIONALE_UFFICIALE (export xlsx): players (bonifica #N/A), teams, contracts (recupero Valore Acquisto da BCK_Gestionale), fvm_snapshots (tutti i fogli FVM_*), saldi iniziali crediti, roster, asteriscati.
- Report di quadratura automatico: confronto app vs foglio per budget, monte ingaggi, slot, conteggi rosa/vivaio per le 10 squadre (TC-084).

**Exit: quadratura al 100% sui dati reali. Da qui in poi si sviluppa con i dati veri.**

## Sprint 3 — UI consultazione (il sostituto del foglio in lettura)

- Dashboard lega (budget, cap, slot, alert) e dashboard squadra (rosa per ruolo, contratti, scadenze, proiezione pluriennali, plus/minusvalenze latenti).
- Dettaglio giocatore (scheda, contratto, storico movimenti, andamento FVM).
- Liste con filtri: giocatori, contratti, operazioni.
- Export CSV (rose, contratti, budget, storico).

**Exit: la lega può abbandonare il foglio per la CONSULTAZIONE.**

## Sprint 4 — Operazioni e workflow

- Wizard nuova operazione (tutti i tipi) con preview impatti obbligatoria e blocchi/warning del rules engine.
- Area approvazione Super Admin (pendenti → convalida/rifiuto/forzatura), rettifiche admin.
- Import snapshot FVM e listone (upload → preview → validazione → conferma → log).
- Gestione finestre mercato e multe (registro euro).

**Exit: un'operazione reale di mercato gestita end-to-end in app, in parallelo col foglio per una finestra di verifica.**

## Sprint 5 — Stagione e rifinitura

- Wizard rollover di fine stagione (reset FVM/nuovo listone, STIMA, scadenze, slot a 11, vivaio/22 anni, archiviazione).
- Audit log consultabile, backup/export completo, hardening RLS, inviti utenti reali.
- UAT con 2–3 presidenti + admin su casi storici reali (rigiocare operazioni passate note e confrontare i risultati col foglio).

**Exit: go-live. Il foglio diventa il backup, l'app la fonte di verità.**

## Rischi da tenere d'occhio

1. Bonifica dati foglio (#N/A, #REF!) più lunga del previsto → affrontata subito allo Sprint 2.
2. Casi limite non scritti nel regolamento → mai improvvisare: annotarli in 00_Stato_Progettazione e chiedere al consiglio.
3. Scope creep (gamification ecc.) → rimandare a dopo il go-live.
4. Free tier Supabase: il progetto va in pausa dopo 7 giorni di inattività in dev — riattivarlo prima delle demo.
