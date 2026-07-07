# FantaDuma Manageriale App

Web app gestionale per la lega fantacalcio "Fanta Duma Manageriale": sostituisce il file gestionale Google Sheets. Gestisce rose, contratti, ingaggi, budget crediti, salary cap, mercato, vivaio, asteriscati, storico e audit. NON gestisce voti/partite/classifiche/formazioni (restano su Fantacalcio.it).

## Fonti di verità (in ordine)

1. `02_Regole_Economiche_RulesEngine.md` — TUTTE le regole economiche. Non inventare mai una regola: se un caso non è coperto, chiedere a Fabio.
2. `01_Specifica_Funzionale_MVP.md` — scope, ruoli, moduli, workflow approvazione.
3. `03_Data_Model_v2.md` — schema DB, enum, RLS, piano migrazione.
4. `09_Test_Cases_Regole_v2.xlsx` — 84 test case (71 Must): il rules engine è finito solo quando passano tutti i Must.
5. `00_Stato_Progettazione.md` — decisioni prese e gerarchia fonti.
6. Regolamento PDF ("Regolamento e Statuto Fanta DumaM 2025.26") — fonte primaria in caso di dubbio sui doc.

Ignorare: qualsiasi riferimento all'Analisi Funzionale V3 (gamification, stadium builder, sync via sessione, max 2 obblighi) — archiviata, non è requisito.

## Regole architetturali non negoziabili

- **Doppia valuta**: crediti (virtuali, mercato) ed euro (ingaggi, cap €250, multe, montepremi) sono ledger separati. Mai convertire, mai mescolare.
- **Rules engine solo server-side** (server actions / API): zero logica economica nel frontend.
- **Ledger, non saldi**: budget e monte ingaggi sono viste calcolate da `credit_movements` / `euro_movements`, mai colonne aggiornate a mano.
- **Immutabilità**: operazioni confermate non si modificano (solo rettifica admin come nuova operazione collegata). Nessuna cancellazione fisica di dati storici.
- **FVM tracciabile**: ogni calcolo referenzia uno snapshot datato in `fvm_snapshots`.
- **Validazione atomica**: cap €250, slot pluriennali (11/12), rosa 23–30 (min 2 P), vivaio ≤3 valutati sul risultato netto dell'operazione, mai superabili nemmeno temporaneamente.
- **Workflow**: presidenti propongono (Pendente) → Super Admin convalida/rifiuta. Le pendenti non toccano alcun saldo.
- Ingaggio = `ceil_to(FVM_congelato × 0,10; 0,50)`, min 0,50 €, + maggiorazione per tipo/anno (vedi doc 02 §2).

## Stack e vincoli

Next.js (App Router) su Vercel free tier, Supabase (PostgreSQL + Auth + RLS), TypeScript. Costo target 0–5 €/mese. ~12 utenti. UI: gestionale, tabellare, desktop-first, responsive. Lingua UI: italiano.

## Convenzioni di sviluppo

- TDD sul rules engine: implementare i test del file 09 (Vitest) PRIMA della logica; ID test = ID TC (es. `TC-003`).
- Migrazioni DB versionate (supabase/migrations), enum dal doc 03 senza rinominarli.
- I nomi di dominio restano in italiano nel codice dove sono termini di lega (ingaggio, svincolo, vivaio, asteriscato, finestra).
- Ogni PR/commit che tocca regole economiche cita la sezione del doc 02.
- Seed di sviluppo: 10 squadre reali (foglio `elenchi` del gestionale) + dati sintetici.

## Migrazione dati

Dal Google Sheets GESTIONALE_UFFICIALE (id `1Ql9i0fLVm2kip82Noorz-ploJeZT0MmpY4SKOutHP-U`), piano nel doc 03. Nel foglio ci sono `#N/A` e `#REF!` da bonificare (matching manuale, recupero da BCK_Gestionale). Gate di go-live: budget, monte ingaggi e slot identici al foglio per tutte le 10 squadre (TC-084).
