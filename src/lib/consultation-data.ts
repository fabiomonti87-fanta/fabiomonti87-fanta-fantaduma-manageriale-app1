// Dati per la dashboard di consultazione.
// Fonte primaria: Supabase (viste sul ledger — Sprint 4). Finché il DB non è
// popolato con la migrazione Sprint 2, fallback provvisorio sull'xlsx del gestionale.

import path from 'node:path';
import { parseGestionale } from '../migration/parser';
import { quadratura } from '../migration/quadratura';
import { clientServizio } from '../application/adapter-supabase';

export interface ConsultationPlayer {
  id: string; nome: string; squadra: string; ruoli: string[]; slot: 'rosa' | 'vivaio';
  stato: string; contratto: string; anno: number; fvm: number | null; ultimoFvm: number | null;
  ingaggio: number; prezzo: number | null; plusvalenza: number | null; scadenza: string | null;
}
export interface ConsultationTeam {
  nome: string; budget: number; monte: number; cap: number; slot: number; rosa: number; vivaio: number;
}
export interface ConsultationData { aggiornatoAl: string; fonte: 'supabase' | 'xlsx'; teams: ConsultationTeam[]; players: ConsultationPlayer[]; }

export async function loadConsultationData(): Promise<ConsultationData> {
  try {
    const db = await datiDaSupabase();
    if (db) return db;
  } catch {
    // DB non configurato o non raggiungibile: fallback sul foglio
  }
  return datiDaXlsx();
}

async function datiDaSupabase(): Promise<ConsultationData | null> {
  const admin = clientServizio();
  const { data: teams } = await admin.from('teams').select('id, name');
  if (!teams || teams.length === 0) return null;

  const [{ data: budget }, { data: salary }, { data: slots }, { data: roster }, { data: contracts }, { data: players }, { data: fvm }, { data: charges }, { data: stagione }] =
    await Promise.all([
      admin.from('v_team_budget').select('*'),
      admin.from('v_team_salary').select('*'),
      admin.from('v_plurannual_slots').select('*'),
      admin.from('roster_entries').select('*').is('end_date', null),
      admin.from('contracts').select('*').eq('status', 'active'),
      admin.from('players').select('id, name, mantra_roles'),
      admin.from('v_fvm_ultimo').select('player_id, fvm_m'),
      admin.from('contract_year_charges').select('contract_id, amount_charged_eur').eq('status', 'active'),
      admin.from('seasons').select('salary_cap_eur').eq('is_current', true).single(),
    ]);

  const nomeSquadra = new Map(teams.map((t) => [t.id, t.name as string]));
  const perGiocatore = new Map((players ?? []).map((p) => [p.id, p]));
  const ultimoFvmPer = new Map((fvm ?? []).map((f) => [f.player_id, Number(f.fvm_m)]));
  const contrattoPer = new Map((contracts ?? []).map((c) => [c.player_id, c]));
  const chargePer = new Map((charges ?? []).map((c) => [c.contract_id, Number(c.amount_charged_eur)]));

  const playersOut: ConsultationPlayer[] = (roster ?? []).map((r) => {
    const p = perGiocatore.get(r.player_id);
    const c = contrattoPer.get(r.player_id);
    const ultimo = ultimoFvmPer.get(r.player_id) ?? null;
    const prezzo = c?.acquired_price_credits !== null && c !== undefined ? Number(c.acquired_price_credits) : null;
    return {
      id: r.player_id,
      nome: p?.name ?? '?',
      squadra: nomeSquadra.get(r.team_id) ?? '?',
      ruoli: p?.mantra_roles ?? [],
      slot: r.slot_kind,
      stato: r.state,
      contratto: c?.contract_type ?? '—',
      anno: c?.current_year ?? 1,
      fvm: c ? Number(c.fvm_frozen) : null,
      ultimoFvm: ultimo,
      ingaggio: c ? chargePer.get(c.id) ?? Number(c.base_salary_eur) : 0,
      prezzo,
      plusvalenza: ultimo !== null && prezzo !== null ? ultimo - prezzo : null,
      scadenza: c ? `anno ${c.current_year}/${c.years_total}` : null,
    };
  });

  const conta = (teamId: string, slot: string) => (roster ?? []).filter((r) => r.team_id === teamId && r.slot_kind === slot).length;
  const teamsOut: ConsultationTeam[] = teams.map((t) => ({
    nome: t.name,
    budget: Number((budget ?? []).find((b) => b.team_id === t.id)?.budget_credits ?? 0),
    monte: Number((salary ?? []).find((s) => s.team_id === t.id)?.salary_total_eur ?? 0),
    cap: Number(stagione?.salary_cap_eur ?? 250),
    slot: Number((slots ?? []).find((s) => s.team_id === t.id)?.plurannual_used ?? 0),
    rosa: conta(t.id, 'rosa'),
    vivaio: conta(t.id, 'vivaio'),
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

  return {
    aggiornatoAl: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
    fonte: 'supabase',
    teams: teamsOut,
    players: playersOut,
  };
}

function datiDaXlsx(): ConsultationData {
  const dataset = parseGestionale(path.join(process.cwd(), 'data', 'GESTIONALE_UFFICIALE.xlsx'));
  const report = quadratura(dataset);
  const latest = new Map<string, number>();
  for (const s of [...dataset.snapshots].sort((a, b) => a.data.localeCompare(b.data))) latest.set(s.fcId, s.fvmM);
  const players = dataset.contratti.filter((c) => c.attivo).map((c) => {
    const ultimoFvm = latest.get(c.chiaveGiocatore) ?? null;
    const prezzo = c.prezzoAcquistoCrediti;
    return {
      id: c.chiaveGiocatore, nome: c.nome, squadra: c.squadra,
      ruoli: dataset.giocatori.find((g) => g.chiave === c.chiaveGiocatore)?.ruoli ?? [],
      slot: c.slot, stato: c.stato, contratto: c.tipoFoglio, anno: c.annoCorrente,
      fvm: c.fvmCongelato, ultimoFvm, ingaggio: c.ingaggioReale, prezzo,
      plusvalenza: ultimoFvm !== null && prezzo !== null ? ultimoFvm - prezzo : null,
      scadenza: c.scadenza,
    } satisfies ConsultationPlayer;
  });
  return {
    aggiornatoAl: '30 maggio 2026 (foglio — migrazione DB non ancora applicata)', fonte: 'xlsx', players,
    teams: report.righe.map((r) => ({ nome: r.squadra, budget: r.budgetApp, monte: r.monteApp, cap: 250,
      slot: r.slotApp, rosa: r.rosaApp, vivaio: r.vivaioApp })),
  };
}
