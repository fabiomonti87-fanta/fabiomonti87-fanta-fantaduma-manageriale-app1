# Setup Sprint 4 — passi manuali (in ordine)

Lo Sprint 4 (operazioni e workflow) è completato lato codice. Per attivarlo servono
tre passi manuali: applicare i dati reali al DB, applicare la migrazione SQL nuova,
aggiungere una variabile d'ambiente su Vercel.

## 1. Popolare il database (migrazione dati Sprint 2)

Il DB Supabase è ancora vuoto: lo script era pronto ma non era mai stato eseguito con `--apply`.

Da terminale, nella cartella del progetto:

```bash
npx tsx scripts/migrate-supabase.ts          # dry-run: controlla i numeri (10 squadre, 434 contratti…)
npx tsx scripts/migrate-supabase.ts --apply  # scrive su Supabase e verifica la quadratura
```

Alla fine deve stampare **QUADRATURA DB: OK**. Se il progetto Supabase è "in pausa"
(free tier, 7 giorni di inattività), riattivarlo prima dal dashboard.

## 2. Applicare la migrazione SQL dello Sprint 4

Nel **SQL Editor** di Supabase, incollare ed eseguire il file:

- `supabase/migrations/20260712000100_sprint4_operazioni.sql`

Cosa fa: colonna `team_id` sugli addebiti ingaggio, colonna `acquired_session` sui
contratti (Osimhen Gate), vista monte ingaggi corretta, vista `v_fvm_ultimo`,
creazione automatica dell'utente al primo login (fabiomonti87@gmail.com = super_admin),
funzione `sprint4_esegui` per le scritture in transazione unica.

**Nota ordine (per installazioni da zero)**: eseguire questa migrazione SQL **prima**
della migrazione dati del passo 1 — lo script di migrazione ora scrive anche
`contract_year_charges.team_id` (squadra che ospita il giocatore, prestiti inclusi)
e richiede che la colonna esista già.

**Storico 14/07/2026**: sulla lega reale i passi sono stati eseguiti nell'ordine inverso
e gli 11 addebiti dei prestiti sono stati riattribuiti a mano alla squadra ospitante
(quadratura completa budget+monte+slot verificata OK su tutte le 10 squadre).

## 3. Variabile d'ambiente su Vercel

Le server actions scrivono sul DB con la service role key (il rules engine gira solo lato server).

Su Vercel → Project → Settings → Environment Variables, aggiungere:

- `SUPABASE_SERVICE_ROLE_KEY` = (Settings → API del progetto Supabase → `service_role`)

⚠️ Solo come variabile server su Vercel: mai con prefisso `NEXT_PUBLIC_`, mai nel codice.
In locale è già in `.env.local`.

## 4. Verifica end-to-end (exit criteria Sprint 4)

1. Login come fabiomonti87@gmail.com → in alto compaiono i link Approvazioni / Mercato e multe / Import FVM.
2. La dashboard mostra "fonte: Supabase" (i dati arrivano dalle viste, non più dall'xlsx).
3. `/mercato` → creare una finestra (es. Finestra 4) e aprirla.
4. `/operazioni/nuova` → provare un'operazione reale (es. uno scambio della prossima finestra):
   - "Calcola anteprima" mostra impatti su crediti/monte/slot/rosa e gli eventuali blocchi;
   - "Proponi operazione" la mette in Pendente (nessun saldo toccato).
5. `/approvazioni` → Convalida: i movimenti compaiono nei ledger e la dashboard si aggiorna.
6. Confrontare col foglio per una finestra di verifica (gestione in parallelo, doc 04).

## Ruoli degli altri presidenti

Dopo che un presidente fa il primo login (magic link), assegnargli ruolo e squadra nel SQL Editor:

```sql
update public.users set role = 'president', team_id = (select id from teams where name = 'NOME SQUADRA')
where email = 'email@delpresidente.it';
```

(L'interfaccia di gestione utenti arriva con lo Sprint 5.)
