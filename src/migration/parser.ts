// Parser del GESTIONALE_UFFICIALE (export xlsx da Google Sheets) — doc 03 §Migrazione.
// Fonte di verità per i dati (gerarchia fonti #2): players, teams, contracts,
// fvm_snapshots (tutti i fogli FVM_*), saldi crediti, roster, asteriscati.
// Bonifica: #N/A (matching per nome), #REF! (Valore Acquisto), righe fuori regola.

import * as XLSX from 'xlsx';
import type { ContractType } from '../rules';

// ---------- costanti di mapping (dal foglio 'elenchi' e osservazione dati reali) ----------

/** Nomi ufficiali brevi (foglio 'elenchi' col. nomi, usati in Gestionale_). */
export const ALIAS_SQUADRE: Record<string, string> = {
  // alias "lunghi" usati in 'export asta' / Fantacalcio.it → nome ufficiale breve
  '42Do Ceretolo Fc': 'Ceretolo',
  'FC Molino 1980': 'Molino',
  'Le bimbe di Tonali': 'Bimbe di Tonali',
  'MatteoDarmianCalzoni FC': 'Darmian',
  'Nirvana FC': 'Nirvana',
  'S.S. Iperzola': 'Iperzola',
  'Se7eN Fc': 'Seven',
  'Werder Bryan': 'Werder',
  'Woods FC': 'Woods',
  'AS Intomatici': 'AS Intomatici',
};

const TIPO_CONTRATTO: Record<string, ContractType> = {
  'Standard': 'standard',
  'Standard inverno': 'standard_inverno',
  'Diritto 1+1': 'diritto_1_1',
  'Obbligo 1+1': 'obbligo_1_1',
  'Obbligo 1+2': 'obbligo_1_2',
  'Inverno Obbligo 1,5': 'inverno_obbligo_1_5',
  'Inverno Obbligo 2,5': 'inverno_obbligo_2_5',
  'Inverno Diritto 0,5 + 1': 'inverno_diritto_0_5_1',
  'Vivaio': 'vivaio',
};

/** Tipi acquisto che indicano un giocatore ATTUALMENTE nella rosa/vivaio della squadra. */
const TIPI_ATTIVI = new Set([
  'Asta',
  'Asta riparazione',
  'Acquistato tit definitivo',
  'Acquisito in prestito',
  'Vivaio',
  'Promosso da vivaio',
  'Sost_Asteriscato',
]);

/** Tipi che indicano un giocatore USCITO (resta solo il residuo ingaggio a bilancio). */
const TIPI_USCITI = new Set([
  'Ceduto tit definitivo',
  'Ceduto in prestito',
  'Svincolo pausa invernale',
  'Svincolo fine anno',
  // Confermato il 12/07/2026 confrontando l'export rose: conserva l'addebito
  // economico della stagione, ma il giocatore non occupa più un posto in rosa.
  'Svincolato riconferma anno corrente',
  'Svincolato obbligo anno precedente',
  'Asteriscato',
]);

/** Stagione corrente del foglio (Ultimo aggiornamento 2026-05-30 → stagione 2025/26). */
export const INIZIO_STAGIONE = '2025-07-01';

/** Saldi verificati sull'export indipendente Rose_fantaduma-manageriale del 30/05/2026. */
export const BUDGET_PER_SQUADRA: Record<string, number> = {
  'AS Intomatici': 2,
  'Bimbe di Tonali': 48,
  Ceretolo: 3,
  Darmian: 21,
  Iperzola: 25,
  Molino: 182,
  Nirvana: 121,
  Seven: 51,
  Werder: 47,
  Woods: 55,
};

/** Fogli FVM_* → colonne e data snapshot (date d'asta convenzionali, da affinare se serve). */
const FOGLI_FVM: { foglio: string; idCol: number; fvmCol: number; data: string; source: string; nomeCol: number }[] = [
  { foglio: 'FVM_Asta2324', idCol: 0, fvmCol: 12, data: '2023-09-01', source: 'listone_estivo', nomeCol: 2 },
  { foglio: 'FVM_Asta2425', idCol: 1, fvmCol: 12, data: '2024-09-01', source: 'listone_estivo', nomeCol: 0 },
  { foglio: 'FVM_1luglio-31luglio25', idCol: 0, fvmCol: 12, data: '2025-07-01', source: 'update', nomeCol: 3 },
  { foglio: 'FVM_29072025', idCol: 0, fvmCol: 6, data: '2025-07-29', source: 'update', nomeCol: 1 },
  { foglio: 'FVM_Asta2526', idCol: 1, fvmCol: 13, data: '2025-09-01', source: 'listone_estivo', nomeCol: 0 },
  { foglio: 'FVM_astainv', idCol: 1, fvmCol: 13, data: '2025-02-02', source: 'listone_invernale', nomeCol: 0 },
  { foglio: 'FVM_update', idCol: 1, fvmCol: 13, data: '2026-01-27', source: 'update', nomeCol: 0 },
];

// ---------- tipi del dataset normalizzato ----------

export interface GiocatoreMigrato {
  chiave: string; // fcId oppure "nome:<Nome>" per i #N/A da bonificare
  fcId: string | null;
  nome: string;
  ruoli: string[];
  serieA: string | null;
}

export interface ContrattoMigrato {
  chiaveGiocatore: string;
  nome: string;
  squadra: string;
  tipo: ContractType;
  tipoFoglio: string;
  tipoAcquisto: string;
  attivo: boolean;
  slot: 'rosa' | 'vivaio';
  stato: 'in_rosa' | 'vivaio' | 'prestito_in' | 'asteriscato';
  dataAcquisto: string | null;
  scadenza: string | null;
  annoCorrente: number;
  fvmCongelato: number | null;
  ingaggio36: number | null;
  ingaggioReale: number;
  prezzoAcquistoCrediti: number | null;
  squadraOriginale: string | null;
  note: string | null;
}

export interface SnapshotMigrato {
  fcId: string;
  nome: string;
  fvmM: number;
  data: string;
  source: string;
}

export interface DatasetMigrazione {
  squadre: string[]; // nomi ufficiali (foglio elenchi)
  giocatori: GiocatoreMigrato[];
  contratti: ContrattoMigrato[];
  snapshots: SnapshotMigrato[];
  /** Valori grezzi del Riepilogo, mantenuti per audit (il foglio non contiene i nomi). */
  budgetRiepilogo: number[];
  /** Saldi associati alle squadre, verificati tramite l'export rose indipendente. */
  budgetPerSquadra: Record<string, number>;
  /** fcId → prezzo pagato all'asta estiva 25/26 (foglio 'export asta'). */
  prezziAsta: Map<string, { prezzo: number; squadra: string }>;
  /** fcId asteriscati estate 25/26 con squadra di appartenenza (per stato listone). */
  asteriscatiEstate: { fcId: string; nome: string; squadra: string | null }[];
  bonifica: string[]; // problemi da rivedere manualmente
}

// ---------- helper ----------

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function testo(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' || s === '#N/A' || s === '#REF!' ? null : s;
}

function dataIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

function fcId(v: unknown): string | null {
  const n = num(v);
  if (n !== null) return String(Math.trunc(n));
  return testo(v);
}

/** Stagione fantacalcistica di una data (anno di inizio: luglio–giugno). */
function annoStagione(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return m >= 7 ? y : y - 1;
}

// ---------- parser ----------

export function parseGestionale(percorsoXlsx: string): DatasetMigrazione {
  const wb = XLSX.readFile(percorsoXlsx, { cellDates: true });
  const bonifica: string[] = [];
  const righe = (nome: string): unknown[][] => {
    const ws = wb.Sheets[nome];
    if (!ws) throw new Error(`foglio '${nome}' mancante nel file`);
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
  };

  // squadre (foglio elenchi, colonna 'nomi')
  const squadre = righe('elenchi')
    .slice(1)
    .map((r) => testo(r[0]))
    .filter((s): s is string => !!s);
  if (squadre.length !== 10) bonifica.push(`elenchi: attese 10 squadre, trovate ${squadre.length}`);

  // budget dal Riepilogo: il range del foglio può iniziare dalla colonna C,
  // quindi si cerca la colonna con intestazione 'budget crediti' e si leggono i numeri sotto
  const righeRiepilogo = righe('Riepilogo ingaggi E budget');
  const rigaHeader = righeRiepilogo.findIndex((r) => r.some((c) => String(c ?? '').toLowerCase().includes('budget')));
  const colBudget = rigaHeader >= 0 ? righeRiepilogo[rigaHeader].findIndex((c) => String(c ?? '').toLowerCase().includes('budget')) : -1;
  const budgetRiepilogo =
    colBudget >= 0
      ? righeRiepilogo
          .slice(rigaHeader + 1)
          .map((r) => num(r[colBudget]))
          .filter((n): n is number => n !== null)
      : [];
  if (budgetRiepilogo.length !== 10) bonifica.push(`Riepilogo: attesi 10 budget, trovati ${budgetRiepilogo.length}`);

  // prezzi asta estiva 25/26 (export asta)
  const prezziAsta = new Map<string, { prezzo: number; squadra: string }>();
  for (const r of righe('export asta').slice(1)) {
    const id = fcId(r[0]);
    const prezzo = num(r[6]);
    const squadraAlias = testo(r[2]);
    if (!id || prezzo === null) continue;
    const squadra = squadraAlias ? (ALIAS_SQUADRE[squadraAlias] ?? squadraAlias) : '';
    prezziAsta.set(id, { prezzo, squadra });
  }

  // snapshot FVM da tutti i fogli FVM_*
  const snapshots: SnapshotMigrato[] = [];
  for (const spec of FOGLI_FVM) {
    let importati = 0;
    for (const r of righe(spec.foglio).slice(1)) {
      const id = fcId(r[spec.idCol]);
      const fvm = num(r[spec.fvmCol]);
      const nome = testo(r[spec.nomeCol]) ?? '';
      if (!id || fvm === null) continue;
      snapshots.push({ fcId: id, nome, fvmM: fvm, data: spec.data, source: spec.source });
      importati += 1;
    }
    if (importati === 0) bonifica.push(`${spec.foglio}: nessuno snapshot importato (colonne cambiate?)`);
  }

  // asteriscati estate 25/26
  const asteriscatiEstate: DatasetMigrazione['asteriscatiEstate'] = [];
  for (const r of righe('Asteriscati_estate25-26').slice(1)) {
    const id = fcId(r[0]);
    if (!id) continue;
    asteriscatiEstate.push({ fcId: id, nome: testo(r[3]) ?? '', squadra: testo(r[13]) });
  }

  // Gestionale_ (stato corrente rose e contratti)
  const giocatori = new Map<string, GiocatoreMigrato>();
  const contratti: ContrattoMigrato[] = [];
  for (const r of righe('Gestionale_').slice(1)) {
    const nome = testo(r[1]);
    if (!nome) continue;
    const id = fcId(r[0]);
    const chiave = id ?? `nome:${nome}`;
    if (!id) bonifica.push(`#N/A da bonificare: '${nome}' (${testo(r[2])}) — matching per nome, assegnare ID Fantacalcio`);

    const tipoAcquisto = testo(r[8]) ?? '';
    let squadra = testo(r[2]);
    // Nel gestionale entrambe le righe del prestito riportano erroneamente Werder.
    // L'export ufficiale rose del 30/05/2026 conferma McTominay in Iperzola,
    // con cartellino di proprietà Werder (decisione confermata il 12/07/2026).
    const prestitoMcTominay = id === '4777' && tipoAcquisto === 'Acquisito in prestito';
    if (prestitoMcTominay) squadra = 'Iperzola';
    if (!squadra || !squadre.includes(squadra)) {
      bonifica.push(`riga '${nome}': squadra '${squadra}' non riconosciuta`);
      continue;
    }
    const tipoFoglio = testo(r[5]) ?? '';
    const tipo = TIPO_CONTRATTO[tipoFoglio];
    if (!tipo) {
      bonifica.push(`riga '${nome}': tipo contratto '${tipoFoglio}' non mappato`);
      continue;
    }
    let attivo: boolean;
    if (TIPI_ATTIVI.has(tipoAcquisto)) attivo = true;
    else if (TIPI_USCITI.has(tipoAcquisto)) attivo = false;
    else {
      bonifica.push(`riga '${nome}': tipo acquisto '${tipoAcquisto}' sconosciuto — trattato come attivo`);
      attivo = true;
    }

    const dataAcquisto = dataIso(r[6]);
    const fvmCongelato = num(r[12]); // colonna "FVM 25/26 o precedenti" = base congelata all'acquisto
    const ingaggioReale = num(r[17]) ?? 0;
    const anniTotali = tipo === 'vivaio' ? 1 : tipo.includes('1_2') || tipo.includes('2_5') ? 3 : tipo === 'standard' || tipo === 'standard_inverno' ? 1 : 2;
    const annoCorrente = dataAcquisto
      ? Math.min(Math.max(annoStagione(INIZIO_STAGIONE) - annoStagione(dataAcquisto) + 1, 1), anniTotali)
      : 1;

    if (!giocatori.has(chiave)) {
      giocatori.set(chiave, {
        chiave,
        fcId: id,
        nome,
        ruoli: (testo(r[4]) ?? '').split(';').map((x) => x.trim()).filter(Boolean),
        serieA: testo(r[3]),
      });
    }

    contratti.push({
      chiaveGiocatore: chiave,
      nome,
      squadra,
      tipo,
      tipoFoglio,
      tipoAcquisto,
      attivo,
      slot: tipo === 'vivaio' ? 'vivaio' : 'rosa',
      stato: tipo === 'vivaio' ? 'vivaio' : tipoAcquisto === 'Acquisito in prestito' ? 'prestito_in' : 'in_rosa',
      dataAcquisto,
      scadenza: dataIso(r[7]),
      annoCorrente,
      fvmCongelato,
      ingaggio36: num(r[16]),
      ingaggioReale,
      prezzoAcquistoCrediti: id && prezziAsta.has(id) && tipoAcquisto === 'Asta' ? prezziAsta.get(id)!.prezzo : num(r[11]),
      squadraOriginale: prestitoMcTominay ? 'Werder' : testo(r[19]),
      note: testo(r[20]),
    });

    if (attivo && fvmCongelato === null) {
      bonifica.push(`riga '${nome}' (${squadra}): FVM congelato mancante — impossibile ricalcolare l'ingaggio`);
    }
  }

  // doppia occupazione: stesso giocatore attivo in due squadre?
  const attivi = new Map<string, string>();
  for (const c of contratti.filter((c) => c.attivo)) {
    const gia = attivi.get(c.chiaveGiocatore);
    if (gia) bonifica.push(`'${c.nome}' risulta attivo sia in ${gia} sia in ${c.squadra} — verificare`);
    else attivi.set(c.chiaveGiocatore, c.squadra);
  }

  return {
    squadre,
    giocatori: [...giocatori.values()],
    contratti,
    snapshots,
    budgetRiepilogo,
    budgetPerSquadra: { ...BUDGET_PER_SQUADRA },
    prezziAsta,
    asteriscatiEstate,
    bonifica,
  };
}
