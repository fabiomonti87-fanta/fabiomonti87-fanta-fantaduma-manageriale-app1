// Adapter Supabase del rules engine — Sprint 4 (doc 04).
// Idrata LegaEngine dallo stato del DB, esegue le azioni in-memory (stessa semantica
// dei test) e persiste il delta in transazione unica via RPC sprint4_esegui.
// SOLO server-side: usa la service role key, mai importare da componenti client.

import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { pianoIngaggi } from '../rules';
import type { CasoSvincolo, ContractType } from '../rules';
import {
  LegaEngine,
  ViolazioneRegoleError,
  type Contratto,
  type Operazione,
  type Proposta,
  type VoceRosa,
} from './engine';

// ---------- client ----------

export function clientServizio(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY o URL mancanti (variabili ambiente server)');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---------- caricamento stato ----------

export interface ContestoLega {
  admin: SupabaseClient;
  engine: LegaEngine;
  seasonId: string;
  finestraApertaId: string | null;
  /** Conteggi al caricamento: tutto ciò che l'engine aggiunge oltre questi indici è da persistere. */
  base: {
    ops: number;
    mc: number;
    me: number;
    ctr: number;
    rosa: number;
    audit: number;
    contrattiPrima: Map<string, { stato: string; squadra: string; annoCorrente: number }>;
    rosaPrima: Map<string, { al?: string; stato: string }>;
    opsPrima: Map<string, { stato: string }>;
  };
}

const oggiIso = () => new Date().toISOString().slice(0, 10);

export async function caricaLega(opts: { utentiExtra?: { id: string; ruolo: 'super_admin' | 'president' | 'viewer' }[] } = {}): Promise<ContestoLega> {
  const admin = clientServizio();

  const [{ data: stagione, error: eSt }, { data: utenti }, { data: squadre }, { data: giocatori }] =
    await Promise.all([
      admin.from('seasons').select('*').eq('is_current', true).single(),
      admin.from('users').select('id, role, team_id'),
      admin.from('teams').select('id, name'),
      admin.from('players').select('id, name, mantra_roles, birth_date, listone_status'),
    ]);
  if (eSt || !stagione) throw new Error('Nessuna stagione corrente su Supabase: eseguire prima la migrazione dati (scripts/migrate-supabase.ts --apply)');

  const [{ data: fvm }, { data: contratti }, { data: rosa }, { data: budget }, { data: monte }, { data: finestre }, { data: pendenti }, { data: charges }] =
    await Promise.all([
      admin.from('v_fvm_ultimo').select('*'),
      admin.from('contracts').select('*').eq('status', 'active'),
      admin.from('roster_entries').select('*').is('end_date', null),
      admin.from('v_team_budget').select('*'),
      admin.from('v_team_salary').select('*'),
      admin.from('market_windows').select('*').eq('season_id', stagione.id),
      admin.from('operations').select('*').eq('status', 'pending'),
      admin.from('contract_year_charges').select('contract_id, amount_charged_eur').eq('season_id', stagione.id).eq('status', 'active'),
    ]);

  const aperta = (finestre ?? []).find((f) => f.status === 'open');
  const consumate = (finestre ?? []).filter((f) => f.status === 'open' || f.status === 'closed');
  const mercato = {
    sessioneCorrente: 1 + consumate.length,
    finestraOrdinal: aperta?.ordinal ?? null,
    postAstaInvernale: consumate.some((f) => f.window_type === 'asta_invernale'),
  };

  const engine = new LegaEngine({
    genId: randomUUID,
    oggi: oggiIso(),
    mercato,
    stagione: {
      capEur: Number(stagione.salary_cap_eur),
      minIngaggiEur: Number(stagione.min_ingaggi_eur),
      rosaMin: stagione.roster_min,
      rosaMax: stagione.roster_max,
      vivaioSlots: stagione.vivaio_slots,
    },
    utenti: [
      ...(utenti ?? []).map((u) => ({ id: u.id, ruolo: u.role, squadra: u.team_id ?? undefined })),
      ...(opts.utentiExtra ?? []),
    ],
    squadre: (squadre ?? []).map((t) => ({ id: t.id, nome: t.name })),
    giocatori: (giocatori ?? []).map((g) => ({
      id: g.id,
      nome: g.name,
      ruoli: g.mantra_roles ?? [],
      nascita: g.birth_date ?? undefined,
      listone: g.listone_status,
    })),
    snapshots: (fvm ?? []).map((s) => ({ giocatore: s.player_id, fvmM: Number(s.fvm_m), data: s.snapshot_date, source: 'update' })),
  });

  // Saldi da ledger/viste: un movimento sintetico per squadra (il delta delle operazioni
  // future viene registrato dall'engine come nuovi movimenti, che sono quelli persistiti).
  for (const b of budget ?? []) {
    if (Number(b.budget_credits) !== 0) {
      engine.movimentiCrediti.push({
        id: randomUUID(), squadra: b.team_id, importo: Number(b.budget_credits),
        causale: 'saldo_iniziale', creatoIl: engine.oggi,
      });
    }
  }
  for (const m of monte ?? []) {
    if (Number(m.salary_total_eur) !== 0) {
      engine.movimentiEuro.push({
        id: randomUUID(), squadra: m.team_id, importoEur: Number(m.salary_total_eur),
        causale: 'ingaggio', creatoIl: engine.oggi,
      });
    }
  }

  // Contratti attivi: piano ricalcolato dalle regole, con l'anno corrente allineato
  // all'addebito reale del foglio (amount_charged_eur) per rettifiche esatte allo svincolo.
  const chargePerContratto = new Map((charges ?? []).map((c) => [c.contract_id, Number(c.amount_charged_eur)]));
  for (const c of contratti ?? []) {
    const piano = pianoIngaggi(c.contract_type as ContractType, Number(c.fvm_frozen));
    const anno = Math.min(c.current_year, piano.length);
    const addebitoReale = chargePerContratto.get(c.id);
    if (addebitoReale !== undefined) piano[anno - 1] = addebitoReale;
    engine.contratti.push({
      id: c.id,
      giocatore: c.player_id,
      squadra: c.team_id,
      tipo: c.contract_type,
      anniTotali: c.years_total,
      annoCorrente: anno,
      fvmCongelato: Number(c.fvm_frozen),
      fvmSnapshotId: '',
      ingaggioBaseEur: Number(c.base_salary_eur),
      pianoIngaggiEur: piano,
      stato: 'active',
      prezzoAcquistoCrediti: Number(c.acquired_price_credits ?? c.fvm_frozen),
      sessioneAcquisto: c.acquired_session ?? 0,
    });
  }
  for (const r of rosa ?? []) {
    engine.rosa.push({
      id: r.id, squadra: r.team_id, giocatore: r.player_id,
      stato: r.state, slot: r.slot_kind, dal: r.start_date,
      operazioneId: r.source_operation_id ?? undefined,
    });
  }
  for (const op of pendenti ?? []) {
    const proposta = propostaDaNote(op.notes);
    if (!proposta) continue; // operazioni proposte fuori app: decisione manuale
    engine.operazioni.push({
      id: op.id, proposta, stato: 'pending',
      propostaDa: op.proposed_by, propostaIl: op.proposed_at?.slice(0, 10) ?? engine.oggi,
      finestraOrdinal: mercato.finestraOrdinal,
    });
  }

  return {
    admin,
    engine,
    seasonId: stagione.id,
    finestraApertaId: aperta?.id ?? null,
    base: {
      ops: engine.operazioni.length,
      mc: engine.movimentiCrediti.length,
      me: engine.movimentiEuro.length,
      ctr: engine.contratti.length,
      rosa: engine.rosa.length,
      audit: engine.audit.length,
      contrattiPrima: new Map(engine.contratti.map((c) => [c.id, { stato: c.stato, squadra: c.squadra, annoCorrente: c.annoCorrente }])),
      rosaPrima: new Map(engine.rosa.map((v) => [v.id, { al: v.al, stato: v.stato }])),
      opsPrima: new Map(engine.operazioni.map((o) => [o.id, { stato: o.stato }])),
    },
  };
}

// ---------- mapping engine → DB ----------

const TIPO_SVINCOLO: Record<CasoSvincolo, string> = {
  scadenza_estate: 'svincolo_fine_anno',
  scadenza_inverno: 'svincolo_pausa_invernale',
  diritto_non_esercitato: 'svincolo_riconferma',
  diritto_inverno: 'svincolo_pausa_invernale',
  obbligo_estate: 'svincolo_obbligo_prec',
  obbligo_inverno: 'svincolo_pausa_invernale',
  rescissione: 'rescissione_unilaterale',
  asteriscato: 'svincolo_fine_anno',
  vivaio_fine_stagione: 'svincolo_vivaio',
};

function tipoOperazioneDb(p: Proposta): string {
  switch (p.tipo) {
    case 'asta':
    case 'asta_riparazione':
    case 'sost_asteriscato':
    case 'rettifica_admin':
      return p.tipo;
    case 'scambio':
      return 'cessione_definitiva';
    case 'svincolo':
      return TIPO_SVINCOLO[p.caso];
  }
}

function propostaDaNote(note: string | null): Proposta | null {
  if (!note) return null;
  try {
    const parsed = JSON.parse(note);
    return parsed?.proposta ?? null;
  } catch {
    return null;
  }
}

function itemsOperazione(op: Operazione): Record<string, unknown>[] {
  const p = op.proposta;
  const base = { operation_id: op.id };
  switch (p.tipo) {
    case 'asta':
    case 'asta_riparazione':
      return [{ ...base, team_id: p.squadra, player_id: p.giocatore, direction: 'in', credits_delta: -p.prezzoCrediti, new_contract_type: p.contratto }];
    case 'scambio': {
      const items: Record<string, unknown>[] = [
        ...p.giocatoriA.map((g) => ({ ...base, team_id: p.squadraB, player_id: g, direction: 'in', salary_transfer_pct: p.pctRicevente ?? null })),
        ...p.giocatoriB.map((g) => ({ ...base, team_id: p.squadraA, player_id: g, direction: 'in', salary_transfer_pct: p.pctRicevente ?? null })),
      ];
      if (p.conguaglio) items.push({ ...base, team_id: p.conguaglio.daSquadra, direction: 'out', credits_delta: -p.conguaglio.importoCrediti });
      return items;
    }
    case 'svincolo':
      return [{ ...base, team_id: p.squadra, player_id: p.giocatore, direction: 'out' }];
    case 'sost_asteriscato':
      return [{ ...base, team_id: p.squadra, player_id: p.sostituto, direction: 'in', new_contract_type: p.contratto ?? 'standard' }];
    case 'rettifica_admin':
      return p.crediti ? [{ ...base, team_id: p.crediti.squadra, direction: 'neutral', credits_delta: p.crediti.importo }] : [];
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidONull = (v?: string) => (v && UUID_RE.test(v) ? v : null);

// ---------- persistenza delta ----------

async function persisti(
  ctx: ContestoLega,
  updatesExtra: { table: string; id: string; patch: Record<string, unknown> }[] = []
): Promise<void> {
  const { engine, base, seasonId } = ctx;
  const inserts: { table: string; rows: Record<string, unknown>[] }[] = [];
  const updates: { table: string; id: string; patch: Record<string, unknown> }[] = [...updatesExtra];
  const push = (table: string, rows: Record<string, unknown>[]) => {
    if (rows.length > 0) inserts.push({ table, rows });
  };

  const nuoveOps = engine.operazioni.slice(base.ops);
  push('operations', nuoveOps.map((op) => ({
    id: op.id,
    operation_type: tipoOperazioneDb(op.proposta),
    season_id: seasonId,
    market_window_id: ctx.finestraApertaId,
    proposed_by: op.propostaDa,
    status: op.stato,
    decided_at: op.decisaIl ? new Date().toISOString() : null,
    approved_by: op.decisaDa ?? null,
    notes: JSON.stringify({ proposta: op.proposta, motivo_rifiuto: op.motivoRifiuto }),
  })));
  push('operation_items', nuoveOps.flatMap(itemsOperazione));

  push('contracts', engine.contratti.slice(base.ctr).map((c: Contratto) => ({
    id: c.id,
    player_id: c.giocatore,
    team_id: c.squadra,
    season_start_id: seasonId,
    contract_type: c.tipo,
    years_total: c.anniTotali,
    current_year: c.annoCorrente,
    fvm_frozen: c.fvmCongelato,
    base_salary_eur: c.ingaggioBaseEur,
    status: c.stato,
    acquired_price_credits: c.prezzoAcquistoCrediti,
    acquired_session: c.sessioneAcquisto,
  })));

  push('roster_entries', engine.rosa.slice(base.rosa).map((v: VoceRosa) => ({
    id: v.id,
    team_id: v.squadra,
    player_id: v.giocatore,
    season_id: seasonId,
    state: v.stato,
    slot_kind: v.slot,
    start_date: v.dal,
    end_date: v.al ?? null,
    source_operation_id: uuidONull(v.operazioneId),
  })));

  push('credit_movements', engine.movimentiCrediti.slice(base.mc).map((m) => ({
    id: m.id,
    team_id: m.squadra,
    season_id: seasonId,
    operation_id: uuidONull(m.operazioneId),
    amount: m.importo,
    reason: m.causale,
  })));

  push('euro_movements', engine.movimentiEuro.slice(base.me).map((m) => ({
    id: m.id,
    team_id: m.squadra,
    season_id: seasonId,
    operation_id: uuidONull(m.operazioneId),
    amount_eur: m.importoEur,
    reason: m.causale,
    matchday: m.giornata ?? null,
  })));

  push('audit_logs', engine.audit.slice(base.audit).map((a) => ({
    id: a.id,
    user_id: uuidONull(a.utente),
    entity_type: a.entita,
    entity_id: uuidONull(a.entitaId),
    action: a.azione,
    before_json: a.prima ?? null,
    after_json: a.dopo ?? null,
  })));

  for (const c of engine.contratti.slice(0, base.ctr)) {
    const prima = base.contrattiPrima.get(c.id)!;
    if (prima.stato !== c.stato || prima.squadra !== c.squadra || prima.annoCorrente !== c.annoCorrente) {
      updates.push({ table: 'contracts', id: c.id, patch: { status: c.stato, team_id: c.squadra, current_year: c.annoCorrente } });
    }
  }
  for (const v of engine.rosa.slice(0, base.rosa)) {
    const prima = base.rosaPrima.get(v.id)!;
    if (prima.al !== v.al || prima.stato !== v.stato) {
      updates.push({ table: 'roster_entries', id: v.id, patch: { end_date: v.al ?? null, state: v.stato } });
    }
  }
  for (const op of engine.operazioni.slice(0, base.ops)) {
    const prima = base.opsPrima.get(op.id)!;
    if (prima.stato !== op.stato) {
      updates.push({
        table: 'operations',
        id: op.id,
        patch: {
          status: op.stato,
          approved_by: op.decisaDa ?? null,
          decided_at: new Date().toISOString(),
          notes: JSON.stringify({ proposta: op.proposta, motivo_rifiuto: op.motivoRifiuto }),
        },
      });
    }
  }

  if (inserts.length === 0 && updates.length === 0) return;
  const { error } = await ctx.admin.rpc('sprint4_esegui', { payload: { inserts, updates } });
  if (error) throw new Error(`persistenza fallita (nessuna scrittura applicata): ${error.message}`);
}

// ---------- API per le server actions ----------

export interface ImpattoSquadra {
  squadra: string;
  nome: string;
  budgetPrima: number;
  budgetDopo: number;
  montePrima: number;
  monteDopo: number;
  slotPrima: number;
  slotDopo: number;
  rosaPrima: number;
  rosaDopo: number;
}

export interface EsitoAnteprima {
  ok: boolean;
  violazioni: string[];
  impatti: ImpattoSquadra[];
}

function squadreCoinvolte(p: Proposta): string[] {
  switch (p.tipo) {
    case 'asta':
    case 'asta_riparazione':
    case 'svincolo':
    case 'sost_asteriscato':
      return [p.squadra];
    case 'scambio':
      return [p.squadraA, p.squadraB];
    case 'rettifica_admin':
      return p.crediti ? [p.crediti.squadra] : [];
  }
}

function misura(engine: LegaEngine, squadra: string) {
  return {
    budget: engine.budget(squadra),
    monte: engine.monteIngaggi(squadra),
    slot: engine.pluriennaliAttivi(squadra),
    rosa: engine.rosa.filter((v) => v.squadra === squadra && !v.al && v.slot === 'rosa').length,
  };
}

/** Preview obbligatoria (doc 01 §3.3): valida e simula gli effetti in-memory, senza scrivere nulla. */
export async function anteprimaOperazione(proposta: Proposta, utenteId: string, nomiSquadre: Map<string, string>): Promise<EsitoAnteprima> {
  // admin sintetico solo per simulare la convalida in-memory: nulla viene persistito
  const ctx = await caricaLega({ utentiExtra: [{ id: 'anteprima-admin', ruolo: 'super_admin' }] });
  const squadre = squadreCoinvolte(proposta);
  const prima = new Map(squadre.map((s) => [s, misura(ctx.engine, s)]));
  try {
    const op = ctx.engine.proponi(proposta, utenteId);
    ctx.engine.convalida(op.id, 'anteprima-admin');
  } catch (e) {
    if (e instanceof ViolazioneRegoleError) {
      return { ok: false, violazioni: e.violazioni, impatti: [] };
    }
    return { ok: false, violazioni: [e instanceof Error ? e.message : String(e)], impatti: [] };
  }
  return {
    ok: true,
    violazioni: [],
    impatti: squadre.map((s) => {
      const p = prima.get(s)!;
      const d = misura(ctx.engine, s);
      return {
        squadra: s, nome: nomiSquadre.get(s) ?? s,
        budgetPrima: p.budget, budgetDopo: d.budget,
        montePrima: p.monte, monteDopo: d.monte,
        slotPrima: p.slot, slotDopo: d.slot,
        rosaPrima: p.rosa, rosaDopo: d.rosa,
      };
    }),
  };
}

export async function proponiOperazione(proposta: Proposta, utenteId: string): Promise<string> {
  const ctx = await caricaLega();
  const op = ctx.engine.proponi(proposta, utenteId);
  await persisti(ctx);
  return op.id;
}

export async function decidiOperazione(
  opId: string,
  adminId: string,
  decisione: 'convalida' | 'rifiuta' | 'forza',
  motivo?: string
): Promise<void> {
  const ctx = await caricaLega();
  if (decisione === 'rifiuta') {
    ctx.engine.rifiuta(opId, adminId, motivo ?? 'senza motivazione');
  } else {
    ctx.engine.convalida(opId, adminId, { forza: decisione === 'forza' });
  }
  await persisti(ctx);
}

export async function registraMultaDb(squadra: string, giornata: number, totaleGiornate: number, adminId: string): Promise<number> {
  const ctx = await caricaLega();
  const importo = ctx.engine.registraMulta(squadra, giornata, totaleGiornate, adminId);
  await persisti(ctx);
  return importo;
}

/** Asterisco dalla redazione: stato listone + rosa aggiornati, ingaggio resta a bilancio (doc 02 §8). */
export async function segnaAsteriscatoDb(giocatoreId: string, adminId: string): Promise<{ alertSquadra?: string }> {
  const ctx = await caricaLega();
  const esito = ctx.engine.applicaAsterisco(giocatoreId, adminId);
  await persisti(ctx, [{ table: 'players', id: giocatoreId, patch: { listone_status: 'asteriscato' } }]);
  return esito;
}

// ---------- finestre di mercato ----------

export async function creaFinestra(opts: { tipo: string; ordinal: number | null; opensAt?: string; closesAt?: string }): Promise<void> {
  const admin = clientServizio();
  const { data: stagione } = await admin.from('seasons').select('id').eq('is_current', true).single();
  if (!stagione) throw new Error('nessuna stagione corrente');
  const { error } = await admin.from('market_windows').insert({
    season_id: stagione.id,
    window_type: opts.tipo,
    ordinal: opts.ordinal,
    opens_at: opts.opensAt ?? null,
    closes_at: opts.closesAt ?? null,
    status: 'scheduled',
  });
  if (error) throw new Error(`creazione finestra: ${error.message}`);
}

export async function cambiaStatoFinestra(finestraId: string, status: 'scheduled' | 'open' | 'paused' | 'closed'): Promise<void> {
  const admin = clientServizio();
  if (status === 'open') {
    // una sola finestra aperta alla volta
    const { data: stagione } = await admin.from('seasons').select('id').eq('is_current', true).single();
    const { data: aperte } = await admin.from('market_windows').select('id').eq('season_id', stagione!.id).eq('status', 'open');
    if ((aperte ?? []).some((f) => f.id !== finestraId)) {
      throw new Error('c\'è già una finestra aperta: chiuderla prima di aprirne un\'altra');
    }
  }
  const { error } = await admin.from('market_windows').update({ status }).eq('id', finestraId);
  if (error) throw new Error(`aggiornamento finestra: ${error.message}`);
}

// ---------- import snapshot FVM / listone ----------

export interface RigaFvm { fcId: string; nome: string; fvmM: number }

export interface AnteprimaImportFvm {
  totale: number;
  abbinati: number;
  nuovi: RigaFvm[];
  scartate: number;
}

/** Confronta le righe del file con i giocatori a DB (match per fc_id). */
export async function anteprimaImportFvm(righe: RigaFvm[]): Promise<AnteprimaImportFvm> {
  const admin = clientServizio();
  const { data: players } = await admin.from('players').select('id, fc_id');
  const perFcId = new Map((players ?? []).filter((p) => p.fc_id).map((p) => [String(p.fc_id), p.id]));
  const valide = righe.filter((r) => r.fcId && Number.isFinite(r.fvmM) && r.fvmM > 0);
  const nuovi = valide.filter((r) => !perFcId.has(r.fcId));
  return { totale: righe.length, abbinati: valide.length - nuovi.length, nuovi, scartate: righe.length - valide.length };
}

/**
 * Conferma import: upload → preview → validazione → conferma → log (doc 04 Sprint 4).
 * Transazione unica: imports + eventuali nuovi players + fvm_snapshots.
 */
export async function confermaImportFvm(
  righe: RigaFvm[],
  opts: { dataSnapshot: string; source: 'listone_estivo' | 'listone_invernale' | 'update'; fileName: string; utenteId: string; creaNuovi: boolean }
): Promise<{ snapshotInseriti: number; giocatoriCreati: number }> {
  const admin = clientServizio();
  const { data: stagione } = await admin.from('seasons').select('id').eq('is_current', true).single();
  if (!stagione) throw new Error('nessuna stagione corrente');
  const { data: players } = await admin.from('players').select('id, fc_id');
  const perFcId = new Map((players ?? []).filter((p) => p.fc_id).map((p) => [String(p.fc_id), p.id]));

  const valide = righe.filter((r) => r.fcId && Number.isFinite(r.fvmM) && r.fvmM > 0);
  const viste = new Set<string>();
  const univoche = valide.filter((r) => (viste.has(r.fcId) ? false : (viste.add(r.fcId), true)));

  const importId = randomUUID();
  const nuoviPlayers: Record<string, unknown>[] = [];
  const snapshots: Record<string, unknown>[] = [];
  let creati = 0;
  for (const r of univoche) {
    let pid = perFcId.get(r.fcId);
    if (!pid) {
      if (!opts.creaNuovi) continue;
      pid = randomUUID();
      nuoviPlayers.push({ id: pid, fc_id: r.fcId, name: r.nome || r.fcId, mantra_roles: [] });
      perFcId.set(r.fcId, pid);
      creati += 1;
    }
    snapshots.push({
      player_id: pid,
      fvm_m: r.fvmM,
      snapshot_date: opts.dataSnapshot,
      source: opts.source,
      import_id: importId,
      season_id: stagione.id,
    });
  }
  if (snapshots.length === 0) throw new Error('nessuna riga valida da importare');

  const payload = {
    inserts: [
      {
        table: 'imports',
        rows: [{
          id: importId,
          import_type: opts.source === 'update' ? 'fvm_snapshot' : 'listone',
          file_name: opts.fileName,
          status: 'confirmed',
          rows_total: righe.length,
          rows_valid: snapshots.length,
          rows_error: righe.length - snapshots.length,
          created_by: opts.utenteId,
        }],
      },
      ...(nuoviPlayers.length > 0 ? [{ table: 'players', rows: nuoviPlayers }] : []),
      { table: 'fvm_snapshots', rows: snapshots },
    ],
    updates: [],
  };
  const { error } = await admin.rpc('sprint4_esegui', { payload });
  if (error) throw new Error(`import fallito (nessuna scrittura applicata): ${error.message}`);
  return { snapshotInseriti: snapshots.length, giocatoriCreati: creati };
}
