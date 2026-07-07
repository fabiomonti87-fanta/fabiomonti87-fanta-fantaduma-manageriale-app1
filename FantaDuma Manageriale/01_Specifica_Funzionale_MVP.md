# Specifica Funzionale MVP — FantaDuma Manageriale App
**Versione 4.1 — 07/07/2026 — Consolida i Functional Requirements del pacchetto GPT con le regole del Regolamento 2025.26. L'Analisi Funzionale V3 è archiviata come solo contesto storico e non costituisce requisito.**

## 1. Obiettivo

Sostituire il FILE GESTIONALE (Google Sheets) con una web app che gestisca la parte economico-contrattuale della lega: rose, contratti, ingaggi, budget crediti, salary cap, operazioni di mercato, vivaio, asteriscati, storico e audit. Fantacalcio.it/Leghe resta il sistema ufficiale per voti, partite, classifiche e formazioni.

Vincoli: ~10 utenti, costo infrastruttura 0–5 €/mese (max 10), free tier Vercel + Supabase.

## 2. Ruoli

| Ruolo | Chi | Permessi |
|---|---|---|
| Super Admin | 2–3 utenti (da regolamento: i consiglieri con delega al file gestionale) | Tutto: convalida/rifiuto/forzatura operazioni, import, rettifiche, multe, gestione stagione e finestre mercato, audit log |
| Presidente | 10 utenti (1 per squadra) | Vede tutto in lettura (tutte le rose, contratti, budget — come oggi nel foglio condiviso); propone operazioni per la propria squadra; esporta |
| Viewer | opzionale | Sola lettura |

Nota: la trasparenza è un principio della lega — ogni presidente vede i dati di tutte le squadre, non solo i propri.

## 3. Moduli MVP

### 3.1 Anagrafiche
- Squadre (10): nome, presidente, budget crediti, monte ingaggi, stato.
- Giocatori: ID Fantacalcio (Colonna 1 del gestionale), nome, ruolo Mantra, squadra Serie A, stato (listone / asteriscato / svincolato lega).
- Snapshot FVM M datati: ogni import di quotazioni crea uno snapshot storico (mai sovrascrivere). Il sistema distingue FVM M da FVM classico.

### 3.2 Contratti
- Tipi (enum dal gestionale reale): Standard, Standard inverno, Diritto 1+1, Obbligo 1+1, Obbligo 1+2, Inverno Obbligo 1,5, Inverno Obbligo 2,5, Inverno Diritto 0,5+1, Vivaio.
- Ogni contratto memorizza: FVM M congelato all'asta, ingaggio base calcolato, maggiorazione per anno, durata, anno corrente, scadenza.
- Vincoli automatici (hard block): max 11 slot pluriennali (12 post asta invernale), salary cap €250 mai superabile nemmeno temporaneamente, rosa min/max (23–30, 2 portieri), max 3 slot vivaio.
- Stipula contratti: fase dedicata nella 1ª finestra scambi (apertura → pausa per deposito contratti → ripresa con prestiti abilitati → chiusura).

### 3.3 Operazioni di mercato (state machine)
Tipi (enum dal gestionale reale): Asta, Asta riparazione, Ceduto/Acquisito in prestito, Ceduto/Acquistato titolo definitivo, Svincolato riconferma anno corrente, Svincolato obbligo anno precedente, Svincolo pausa invernale, Svincolo fine anno, Asteriscato, Sost_Asteriscato, Vivaio, Promosso da vivaio, Rettifica admin.

Stati giocatore: IN_ROSA, VIVAIO, PRESTITO_IN, PRESTITO_OUT, ASTERISCATO, SVINCOLATO/CEDUTO.

Flusso operazione:
1. Presidente (o Super Admin) compila la proposta: squadre, giocatori, crediti, divisione ingaggi, formula.
2. Il rules engine calcola in preview tutti gli impatti (crediti, ingaggi, slot, cap) ed evidenzia violazioni → blocco se hard, warning se soft.
3. Stato "Pendente" → area approvazione Super Admin → Convalidata (applica effetti, immutabile) o Rifiutata.
4. Ogni convalida genera: movimenti rosa, aggiornamento contratti, delta crediti, delta ingaggi, storico, audit log.

Regola di formalizzazione: le operazioni si applicano a fine giornata di campionato (data di efficacia distinta dalla data di inserimento).

### 3.4 Finestre mercato e stagione
- Configurazione stagione: date asta estiva/invernale, 5 finestre scambi (la 4ª a cavallo dell'asta di riparazione; la 5ª solo scambi definitivi senza conguagli, no prestiti/acquisti).
- Apertura/chiusura finestre manuale da Super Admin; le operazioni fuori finestra sono bloccate (salvo casi speciali: sostituzione asteriscato, rettifiche).
- Rollover di fine stagione (wizard admin): reset FVM col nuovo listone, calcolo svincoli/STIMA, scadenze contratti, decremento anni residui, ripristino slot pluriennali a 11, promozioni/svincoli vivaio, compimento 22 anni, archiviazione stagione.

### 3.5 Import (MVP: manuale controllato)
- Tipi: listone/quotazioni FVM M (snapshot datato), rose/export leghe, migrazione iniziale dal gestionale.
- Flusso: upload → preview → mapping colonne → validazione (ID giocatore, duplicati, valori) → conferma → log.
- Matching giocatori per ID Fantacalcio; fallback su nome con conferma manuale (nel foglio attuale ci sono #N/A da bonificare).

### 3.6 Export
Rose per squadra, contratti e scadenze, budget crediti, monte ingaggi/salary cap, storico operazioni, prestiti attivi, riconferme da valutare. CSV sempre, XLSX nice-to-have.

### 3.7 Dashboard
- Lega (tutti): budget crediti per squadra, monte ingaggi/cap per squadra, slot pluriennali usati, operazioni recenti, finestra mercato corrente, alert (cap vicino/violato, contratti in scadenza, asteriscati in rosa, operazioni pendenti).
- Squadra: rosa per ruolo con contratto/ingaggio/FVM, vivaio, prestiti, proiezione ingaggi anni futuri (impegni pluriennali), plusvalenze/minusvalenze latenti (ultimo FVM M vs valore acquisto — il meccanismo plus/minusvalenze è centrale nel regolamento).

### 3.8 Audit e storico
Ogni modifica: utente, timestamp, entità, prima/dopo, operazione collegata. Nessuna cancellazione fisica di dati storici (regola fondamentale: chiudere/trasferire, mai eliminare).

### 3.9 Multe e contabilità euro
Registro movimenti in euro per squadra: quota iscrizione (€50), ingaggi stagionali, multe (mancata formazione €20, €40 ultime 5 giornate). Escluse dal salary cap. Composizione montepremi calcolata a fine stagione. (In attesa risposta A3 su eventuale decurtazione crediti.)

## 4. Evoluzioni future (fuori MVP, non progettate in dettaglio)
- Sync semi-automatica quotazioni da Fantacalcio.it (decisione D2: prima import manuale, poi automazione — valutare ToS).
- Notifiche (email prima, push poi) per scadenze e operazioni pendenti.
- Eventuali idee dall'Analisi V3 (gamification, stadium builder, draft live): archiviate, da rivalutare solo su richiesta della lega. Non condizionano il data model MVP.

## 5. Stack (confermato)
Next.js su Vercel, Supabase (PostgreSQL + Auth + RLS), rules engine server-side (mai calcoli nel frontend), repository GitHub. Ambienti: dev + prod.
