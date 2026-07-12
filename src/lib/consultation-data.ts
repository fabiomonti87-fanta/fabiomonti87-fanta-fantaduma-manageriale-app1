import path from 'node:path';
import { parseGestionale } from '../migration/parser';
import { quadratura } from '../migration/quadratura';

export interface ConsultationPlayer {
  id: string; nome: string; squadra: string; ruoli: string[]; slot: 'rosa' | 'vivaio';
  stato: string; contratto: string; anno: number; fvm: number | null; ultimoFvm: number | null;
  ingaggio: number; prezzo: number | null; plusvalenza: number | null; scadenza: string | null;
}
export interface ConsultationTeam {
  nome: string; budget: number; monte: number; cap: number; slot: number; rosa: number; vivaio: number;
}
export interface ConsultationData { aggiornatoAl: string; teams: ConsultationTeam[]; players: ConsultationPlayer[]; }

export function loadConsultationData(): ConsultationData {
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
    aggiornatoAl: '30 maggio 2026', players,
    teams: report.righe.map((r) => ({ nome: r.squadra, budget: r.budgetApp, monte: r.monteApp, cap: 250,
      slot: r.slotApp, rosa: r.rosaApp, vivaio: r.vivaioApp })),
  };
}
