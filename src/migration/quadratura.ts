// Report di quadratura automatico — TC-084 / Sprint 2 (doc 03 §Migrazione punto 8).
// Carica il dataset del foglio nel motore applicativo e confronta, squadra per squadra:
// budget crediti, monte ingaggi, slot pluriennali, conteggi rosa/vivaio.
// Il gate di go-live è la quadratura al 100% su tutte le 10 squadre.

import { LegaEngine } from '../application/engine';
import { pianoIngaggi, round2 } from '../rules';
import type { ContractType } from '../rules';
import type { DatasetMigrazione } from './parser';

export interface RigaQuadratura {
  squadra: string;
  budgetFoglio: number;
  budgetApp: number;
  monteFoglio: number;
  monteApp: number;
  slotFoglio: number;
  slotApp: number;
  rosaFoglio: number;
  rosaApp: number;
  vivaioFoglio: number;
  vivaioApp: number;
  quadra: boolean;
}

export interface ReportQuadratura {
  righe: RigaQuadratura[];
  quadra: boolean;
  totaleCreditiLega: number;
  violazioniRegole: string[]; // dati reali fuori dai vincoli del regolamento (da rivedere, non bloccano l'import)
  scostamentiIngaggio: string[]; // ingaggio 36 giornate del foglio ≠ ricalcolo dalle regole
  bonifica: string[];
}

export function costruisciEngine(dataset: DatasetMigrazione): LegaEngine {
  const attivi = dataset.contratti.filter((c) => c.attivo);
  const usciti = dataset.contratti.filter((c) => !c.attivo);
  const chiaviAttive = new Set(attivi.map((c) => c.chiaveGiocatore));
  const asteriscatiInRosa = new Set(
    dataset.asteriscatiEstate.filter((a) => a.squadra && chiaviAttive.has(a.fcId)).map((a) => a.fcId)
  );

  return new LegaEngine({
    stagione: { rosaMin: 0, minPortieri: 0 }, // i vincoli si verificano nel report, non bloccano l'import
    utenti: [{ id: 'migrazione', ruolo: 'super_admin' }],
    squadre: dataset.squadre.map((nome) => ({ id: nome, nome, crediti: dataset.budgetPerSquadra[nome] ?? 0 })),
    giocatori: dataset.giocatori.map((g) => ({ id: g.chiave, nome: g.nome, ruoli: g.ruoli })),
    snapshots: dataset.snapshots
      .filter((s) => dataset.giocatori.some((g) => g.chiave === s.fcId))
      .map((s) => ({ giocatore: s.fcId, fvmM: s.fvmM, data: s.data, source: s.source })),
    contrattiIniziali: attivi.map((c) => ({
      giocatore: c.chiaveGiocatore,
      squadra: c.stato === 'prestito_in' ? (c.squadraOriginale ?? c.squadra) : c.squadra,
      squadraRosa: c.squadra,
      squadraAddebito: c.squadra,
      tipo: c.tipo,
      slot: c.slot,
      stato: asteriscatiInRosa.has(c.chiaveGiocatore) ? 'asteriscato' : c.stato,
      // fallback FVM=1 per i casi #N/A senza alcuno snapshot (già in bonifica):
      // l'addebito reale viene comunque da ingaggioStagioneEur, non dal piano ricalcolato
      fvmCongelato: c.fvmCongelato ?? 1,
      ingaggioStagioneEur: c.ingaggioReale,
      annoCorrente: c.annoCorrente,
      dal: c.dataAcquisto ?? undefined,
      prezzoCrediti: c.prezzoAcquistoCrediti ?? undefined,
    })),
    // usciti in corso di stagione: resta solo la quota ingaggio a bilancio (doc 02 §5-§6)
    addebitiEuroIniziali: usciti
      .filter((c) => c.ingaggioReale !== 0)
      .map((c) => ({ squadra: c.squadra, importoEur: c.ingaggioReale })),
    oggi: '2026-05-30', // Ultimo aggiornamento del foglio
  });
}

export function quadratura(dataset: DatasetMigrazione): ReportQuadratura {
  const engine = costruisciEngine(dataset);

  const righe: RigaQuadratura[] = [];
  const violazioniRegole: string[] = [];
  const scostamentiIngaggio: string[] = [];

  for (const squadra of dataset.squadre) {
    const del = (attivo: boolean) => dataset.contratti.filter((c) => c.squadra === squadra && c.attivo === attivo);
    const attivi = del(true);
    const monteFoglio = round2(
      dataset.contratti.filter((c) => c.squadra === squadra).reduce((a, c) => a + c.ingaggioReale, 0)
    );
    // Lo slot pluriennale segue il proprietario del contratto, non la squadra
    // che ospita il giocatore in prestito (confermato sui casi McTominay e Mancini).
    const slotFoglio = dataset.contratti.filter((c) => {
      if (!c.attivo || c.tipo === 'vivaio' || ['standard', 'standard_inverno'].includes(c.tipo)) return false;
      const proprietario = c.stato === 'prestito_in' ? (c.squadraOriginale ?? c.squadra) : c.squadra;
      return proprietario === squadra;
    }).length;
    const rosaFoglio = attivi.filter((c) => c.slot === 'rosa').length;
    const vivaioFoglio = attivi.filter((c) => c.slot === 'vivaio').length;

    const riga: RigaQuadratura = {
      squadra,
      budgetFoglio: dataset.budgetPerSquadra[squadra] ?? 0,
      budgetApp: engine.budget(squadra),
      monteFoglio,
      monteApp: engine.monteIngaggi(squadra),
      slotFoglio,
      slotApp: engine.pluriennaliAttivi(squadra),
      rosaFoglio,
      rosaApp: engine.rosa.filter((v) => v.squadra === squadra && !v.al && v.slot === 'rosa').length,
      vivaioFoglio,
      vivaioApp: engine.rosa.filter((v) => v.squadra === squadra && !v.al && v.slot === 'vivaio').length,
      quadra: false,
    };
    riga.quadra =
      riga.budgetFoglio === riga.budgetApp &&
      riga.monteFoglio === riga.monteApp &&
      riga.slotFoglio === riga.slotApp &&
      riga.rosaFoglio === riga.rosaApp &&
      riga.vivaioFoglio === riga.vivaioApp;
    righe.push(riga);

    // vincoli del regolamento sui dati reali (doc 02 §3-§4) — warning, non bloccano
    if (riga.monteFoglio > 250) violazioniRegole.push(`${squadra}: monte ingaggi ${riga.monteFoglio} € > cap 250 €`);
    if (riga.rosaFoglio < 23 || riga.rosaFoglio > 30) violazioniRegole.push(`${squadra}: rosa ${riga.rosaFoglio} fuori range 23–30`);
    if (riga.vivaioFoglio > 3) violazioniRegole.push(`${squadra}: vivaio ${riga.vivaioFoglio} > 3`);
    if (riga.slotFoglio > 12) violazioniRegole.push(`${squadra}: ${riga.slotFoglio} slot pluriennali > 12`);
  }

  // Sanity check: la colonna "Ingaggio 36 giornate" del foglio è l'ANNUO PIENO
  // (per gli invernali non è dimezzata; per il vivaio è solo il calcolo dal FVM, la regola è 0,50 fisso).
  // Scostamenti residui attesi: il foglio applicava +15% anche al 3° anno degli obblighi,
  // mentre vale il regolamento (+10%, decisione S2-3).
  const EQUIVALENTE_PIENO: Record<string, ContractType> = {
    standard_inverno: 'standard',
    inverno_obbligo_1_5: 'obbligo_1_1',
    inverno_obbligo_2_5: 'obbligo_1_2',
    inverno_diritto_0_5_1: 'diritto_1_1',
  };
  for (const c of dataset.contratti.filter(
    (c) => c.attivo && c.tipo !== 'vivaio' && c.fvmCongelato !== null && c.ingaggio36 !== null
  )) {
    const tipoPieno = EQUIVALENTE_PIENO[c.tipo] ?? c.tipo;
    const atteso = pianoIngaggi(tipoPieno, c.fvmCongelato!)[c.annoCorrente - 1];
    if (atteso !== undefined && Math.abs(atteso - c.ingaggio36!) > 0.001) {
      scostamentiIngaggio.push(
        `${c.nome} (${c.squadra}, ${c.tipoFoglio} anno ${c.annoCorrente}, FVM ${c.fvmCongelato}): foglio ${c.ingaggio36} € vs regole ${atteso} €`
      );
    }
  }

  return {
    righe,
    quadra: righe.every((r) => r.quadra),
    totaleCreditiLega: engine.sommaCreditiLega(),
    violazioniRegole,
    scostamentiIngaggio,
    bonifica: dataset.bonifica,
  };
}
