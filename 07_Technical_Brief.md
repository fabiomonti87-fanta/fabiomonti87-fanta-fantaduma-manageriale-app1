# Technical Brief — Fantaduma Manageriale

## 1. Stack consigliato

- Frontend: Next.js.
- Hosting: Vercel.
- Backend: Next.js API routes / server actions.
- Database: Supabase PostgreSQL.
- Auth: Supabase Auth.
- Storage: Supabase Storage, solo se necessario.
- Import/export: librerie JS per CSV/XLSX.
- Repository: GitHub.

## 2. Motivazione stack

L'app ha pochi utenti e forte componente relazionale.

Next.js + Supabase consente:

- costi bassi;
- sviluppo rapido;
- auth integrata;
- PostgreSQL;
- deploy semplice;
- export/import gestibile;
- scalabilità sufficiente per il primo anno.

## 3. Architettura applicativa

Frontend Next.js
→ Server actions / API
→ Rules engine
→ PostgreSQL
→ Audit log
→ Export

## 4. Rules engine

Le regole economiche non devono essere sparse nel frontend.

Creare un layer dedicato per:

- calcolo salary cap;
- calcolo quota pro-rata;
- calcolo impatti crediti;
- validazione operazioni;
- gestione scambi;
- gestione prestiti;
- gestione diritti/obblighi.

## 5. Ambienti

Minimo:

- Development.
- Production.

Nice-to-have:

- Staging.

## 6. Sicurezza

- Row Level Security Supabase da valutare.
- Admin role obbligatorio per import e modifiche globali.
- Manager limitato alla propria squadra, salvo diversa decisione.
- Audit log obbligatorio.
- Backup/export periodico.

## 7. Performance

Con circa 10 utenti non servono ottimizzazioni avanzate.

Priorità:

- query semplici;
- indici su campi principali;
- paginazione liste;
- filtri lato server su tabelle grandi.

## 8. Backup

MVP:

- export manuale CSV/XLSX;
- backup Supabase;
- audit log consultabile.

## 9. Integrazione Fantacalcio.it

Fase MVP: no sync automatica.

Possibile futuro:

- import manuale export Fantacalcio.it;
- parsing file;
- sync semi-automatico;
- integrazione più spinta solo se sostenibile e lecita rispetto ai termini del servizio.

## 10. Definition of Done tecnica

Una feature è pronta quando:

- ha UI funzionante;
- valida input;
- scrive su DB;
- aggiorna storico;
- produce audit log, se rilevante;
- gestisce errore;
- ha almeno un caso testato;
- non rompe export.
