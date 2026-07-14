// Migrazione dei dati reali verso Supabase — Sprint 2 (doc 03 §Migrazione).
// Uso: npx tsx scripts/migrate-supabase.ts [--apply]
// Senza --apply è un dry-run: mostra cosa verrebbe scritto senza toccare il DB.
// Richiede SUPABASE_SERVICE_ROLE_KEY in .env.local (bypassa RLS: solo per migrazione).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseGestionale, INIZIO_STAGIONE } from '../src/migration/parser';
import { quadratura } from '../src/migration/quadratura';
import { pianoIngaggi, ingaggioStd } from '../src/rules';

const APPLY = process.argv.includes('--apply');
const FILE = path.join(process.cwd(), 'data', 'GESTIONALE_UFFICIALE.xlsx');

// carica .env.local
for (const riga of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = riga.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key || key.includes('<')) {
  console.error('SUPABASE_SERVICE_ROLE_KEY o URL mancanti in .env.local');
  process.exit(1);
}

async function main() {
  const dataset = parseGestionale(FILE);
  const report = quadratura(dataset);
  if (!report.quadra) {
    console.error('La quadratura in-memory NON passa: risolvere prima di migrare (npx tsx scripts/report-quadratura.ts)');
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`Dry-run: ${!APPLY} — squadre ${dataset.squadre.length}, giocatori ${dataset.giocatori.length}, contratti ${dataset.contratti.length} (${dataset.contratti.filter((c) => c.attivo).length} attivi), snapshot ${dataset.snapshots.length}`);
  if (!APPLY) {
    console.log('\nAggiungere --apply per scrivere su Supabase.');
    return;
  }

  // 0. guardia: il DB deve essere vuoto (la migrazione non è idempotente per design: niente cancellazioni)
  const { count } = await admin.from('teams').select('*', { count: 'exact', head: true });
  if ((count ?? 0) > 0) {
    console.error(`Il DB contiene già ${count} squadre: la migrazione parte solo da DB vuoto (invariante 2: mai cancellare).`);
    process.exit(1);
  }

  // 1. import log
  const { data: imp, error: eImp } = await admin
    .from('imports')
    .insert({ import_type: 'migrazione', file_name: path.basename(FILE), status: 'confirmed', rows_total: dataset.contratti.length })
    .select()
    .single();
  if (eImp) throw new Error(`imports: ${eImp.message}`);

  // 2. stagione corrente
  const { data: stagione, error: eSt } = await admin
    .from('seasons')
    .insert({ code: '2025/26', started_at: INIZIO_STAGIONE, is_current: true })
    .select()
    .single();
  if (eSt) throw new Error(`seasons: ${eSt.message}`);

  // 3. squadre
  const { data: squadre, error: eSq } = await admin
    .from('teams')
    .insert(dataset.squadre.map((nome) => ({ name: nome })))
    .select();
  if (eSq) throw new Error(`teams: ${eSq.message}`);
  const teamId = new Map(squadre!.map((t) => [t.name as string, t.id as string]));

  // 4. giocatori (dal gestionale + tutti quelli citati dagli snapshot)
  const registro = new Map<string, { fc_id: string | null; name: string; mantra_roles: string[]; serie_a_club: string | null }>();
  for (const g of dataset.giocatori) {
    registro.set(g.chiave, { fc_id: g.fcId, name: g.nome, mantra_roles: g.ruoli, serie_a_club: g.serieA });
  }
  for (const s of dataset.snapshots) {
    if (!registro.has(s.fcId)) registro.set(s.fcId, { fc_id: s.fcId, name: s.nome || s.fcId, mantra_roles: [], serie_a_club: null });
  }
  const vociGiocatori = [...registro.entries()];
  const playerId = new Map<string, string>();
  for (let i = 0; i < vociGiocatori.length; i += 500) {
    const blocco = vociGiocatori.slice(i, i + 500);
    const { data, error } = await admin
      .from('players')
      .insert(blocco.map(([, v]) => v))
      .select('id, fc_id, name');
    if (error) throw new Error(`players: ${error.message}`);
    data!.forEach((p, j) => playerId.set(blocco[j][0], p.id as string));
  }

  // 5. snapshot FVM (tutti i fogli FVM_*)
  const vistiSnapshot = new Set<string>();
  const snapshotRows = dataset.snapshots
    .filter((s) => {
      const k = `${s.fcId}|${s.data}|${s.source}`;
      if (vistiSnapshot.has(k)) return false;
      vistiSnapshot.add(k);
      return true;
    })
    .map((s) => ({
      player_id: playerId.get(s.fcId)!,
      fvm_m: s.fvmM,
      snapshot_date: s.data,
      source: s.source,
      import_id: imp!.id,
      season_id: stagione!.id,
    }));
  for (let i = 0; i < snapshotRows.length; i += 500) {
    const { error } = await admin.from('fvm_snapshots').insert(snapshotRows.slice(i, i + 500));
    if (error) throw new Error(`fvm_snapshots: ${error.message}`);
  }

  // 6. saldi iniziali crediti (Riepilogo — ordine confermato da Fabio)
  const ordine = dataset.squadre;
  const { error: eCm } = await admin.from('credit_movements').insert(
    ordine.map((nome) => ({
      team_id: teamId.get(nome)!,
      season_id: stagione!.id,
      amount: dataset.budgetPerSquadra[nome] ?? 0,
      reason: 'saldo_iniziale',
    }))
  );
  if (eCm) throw new Error(`credit_movements: ${eCm.message}`);

  // 7. contratti attivi + roster + charge stagione corrente
  for (const c of dataset.contratti.filter((c) => c.attivo)) {
    const fvm = c.fvmCongelato ?? 1;
    const piano = pianoIngaggi(c.tipo, fvm);
    const proprietario = c.stato === 'prestito_in' ? (c.squadraOriginale ?? c.squadra) : c.squadra;
    const { data: ctr, error: eC } = await admin
      .from('contracts')
      .insert({
        player_id: playerId.get(c.chiaveGiocatore)!,
        team_id: teamId.get(proprietario)!,
        season_start_id: stagione!.id,
        contract_type: c.tipo,
        years_total: piano.length,
        current_year: Math.min(c.annoCorrente, piano.length),
        fvm_frozen: fvm,
        base_salary_eur: ingaggioStd(fvm),
        status: 'active',
        acquired_price_credits: c.prezzoAcquistoCrediti,
        original_owner_team_id: c.stato === 'prestito_in' ? teamId.get(proprietario)! : null,
        notes: c.note,
      })
      .select()
      .single();
    if (eC) throw new Error(`contracts (${c.nome}): ${eC.message}`);
    const { error: eR } = await admin.from('roster_entries').insert({
      team_id: teamId.get(c.squadra)!,
      player_id: playerId.get(c.chiaveGiocatore)!,
      season_id: stagione!.id,
      state: c.stato,
      slot_kind: c.slot,
      start_date: c.dataAcquisto ?? INIZIO_STAGIONE,
      loan_from_team_id: c.stato === 'prestito_in' ? teamId.get(proprietario)! : null,
    });
    if (eR) throw new Error(`roster (${c.nome}): ${eR.message}`);
    const { error: eCh } = await admin.from('contract_year_charges').insert({
      contract_id: ctr!.id,
      season_id: stagione!.id,
      year_index: Math.min(c.annoCorrente, piano.length),
      amount_due_eur: piano[Math.min(c.annoCorrente, piano.length) - 1] ?? c.ingaggioReale,
      amount_charged_eur: c.ingaggioReale, // valore dal foglio: fonte di verità per il pregresso (D4)
      status: 'active',
      // l'ingaggio è a carico della squadra che OSPITA il giocatore (prestiti inclusi),
      // non del proprietario del contratto — convenzione del foglio (quadratura.ts)
      team_id: teamId.get(c.squadra)!,
    });
    if (eCh) throw new Error(`charges (${c.nome}): ${eCh.message}`);
  }

  // 8. residui euro degli usciti (ingaggio ancora a bilancio) come movimenti euro
  const residui = dataset.contratti.filter((c) => !c.attivo && c.ingaggioReale !== 0);
  for (let i = 0; i < residui.length; i += 200) {
    const { error } = await admin.from('euro_movements').insert(
      residui.slice(i, i + 200).map((c) => ({
        team_id: teamId.get(c.squadra)!,
        season_id: stagione!.id,
        amount_eur: c.ingaggioReale,
        reason: 'ingaggio',
      }))
    );
    if (error) throw new Error(`euro_movements: ${error.message}`);
  }

  console.log('Migrazione applicata. Verifica di quadratura sul DB…');

  // 9. quadratura DB vs foglio (viste)
  const { data: vb } = await admin.from('v_team_budget').select('*');
  let ok = true;
  for (const r of report.righe) {
    const db = vb?.find((x) => x.team_name === r.squadra);
    const budgetDb = Number(db?.budget_credits ?? NaN);
    const pari = budgetDb === r.budgetFoglio;
    if (!pari) ok = false;
    console.log(`  ${r.squadra}: budget DB ${budgetDb} vs foglio ${r.budgetFoglio} ${pari ? 'OK' : 'KO'}`);
  }
  console.log(ok ? 'QUADRATURA DB: OK' : 'QUADRATURA DB: KO');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
