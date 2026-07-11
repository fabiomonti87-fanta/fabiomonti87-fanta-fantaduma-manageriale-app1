# Setup Sprint 0 — passi manuali (Supabase + Vercel)

Lo Sprint 0 (vedi `FantaDuma Manageriale/04_Piano_Sviluppo.md`) è completato lato codice:
migrazioni in `supabase/migrations/`, auth scaffolding, 84 test skeleton rossi, CI.
Restano i passi che richiedono account e credenziali.

## 1. Creare il progetto Supabase (free tier)

1. https://supabase.com → New project (org personale, regione EU, password DB robusta).
2. Applicare le migrazioni **in ordine** — due opzioni:
   - **SQL Editor** (più semplice): incollare ed eseguire i file di `supabase/migrations/` uno alla volta:
     1. `20260707000100_enums.sql`
     2. `20260707000200_core_tables.sql`
     3. `20260707000300_views.sql`
     4. `20260707000400_rls.sql`
     5. `20260707000500_audit.sql`
     6. `20260707000600_grants.sql` (obbligatoria se "Automatically expose new tables" è disattivato — senza, le richieste API danno "permission denied")
   - **Supabase CLI** (consigliato a regime): `npm i -g supabase`, poi
     `supabase login`, `supabase link --project-ref <ref>`, `supabase db push`.
3. Auth → Providers: **Email** attivo con magic link (default). Disattivare Signup se si vogliono solo utenti invitati.
4. Auth → URL Configuration:
   - Site URL: l'URL Vercel di produzione (es. `https://fantaduma.vercel.app`)
   - Redirect URLs: aggiungere `http://localhost:3000/**` e `https://<dominio-vercel>/**`

## 2. Configurare l'ambiente locale

```bash
cp .env.example .env.local
# compilare con i valori di Settings → API del progetto Supabase
npm run dev   # → http://localhost:3000/login
```

Nota: senza env Supabase il middleware lascia l'app aperta (il prototipo resta usabile);
appena le env sono presenti, tutte le route tranne `/login` e `/auth/*` richiedono sessione.

## 3. Primo utente Super Admin

Dopo il primo login via magic link, l'utente esiste in `auth.users` ma non in `public.users`.
Nel SQL Editor:

```sql
insert into public.users (id, email, display_name, role)
select id, email, 'Fabio', 'super_admin' from auth.users where email = 'fabiomonti87@gmail.com';
```

(Nello Sprint 1 si valuterà un trigger di provisioning automatico su `auth.users`.)

## 4. Deploy demo su Vercel

1. https://vercel.com → Add New → Project → importare il repo GitHub
   `fabiomonti87-fanta/fabiomonti87-fanta-fantaduma-manageriale-app1`.
2. Framework: Next.js (autodetect). Nessuna build option da cambiare.
3. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (il `SUPABASE_SERVICE_ROLE_KEY` servirà dallo Sprint 1 per il rules engine server-side).
4. Deploy → aggiornare Site URL/Redirect URLs su Supabase col dominio definitivo.

## 5. Verifica exit criteria Sprint 0

- [ ] Schema completo in Supabase: `select count(*) from information_schema.tables where table_schema='public';` → 15 tabelle + 5 viste
- [ ] Login funzionante: magic link da `/login` → redirect a `/`
- [ ] CI: workflow `CI` su GitHub Actions — job "Lint e build" verde, job "Rules engine" **rosso (atteso)**: 84 test falliti finché il rules engine non è implementato (Sprint 1)
- [ ] Demo online sull'URL Vercel

## Promemoria

- Free tier Supabase: il progetto va in **pausa dopo 7 giorni** di inattività — riattivarlo prima delle demo (rischio n.4 del piano).
- I test sono lo scoreboard TDD: `npm test` deve passare da 84 rossi a 71 Must verdi entro fine Sprint 1.
