// Application layer — doc 01 §3.3 (workflow operazioni), doc 02 §12 (invarianti).
// Motore di dominio in-memory: creazione/validazione/convalida delle operazioni come
// transazione unica (operations → items → ledger → roster → contracts → audit).
// La stessa semantica sarà replicata dall'adapter Supabase (Sprint 4); qui vive la
// logica, testabile senza I/O. Fonte di verità = ledger (mai saldi denormalizzati).

import {
  checkRosa,
  checkSalaryCap,
  checkSlotPluriennali,
  incassoSvincolo,
  ingaggioResiduoDovuto,
  multaMancataFormazione,
  pianoIngaggi,
  ripartizioneScambio,
  round2,
  validaDivisioneIngaggio,
  validaNuovoContratto,
  validaOperazioneInFinestra,
  validaPromozioneVivaio,
  validaRescissione,
  validaSostitutoAsteriscato,
} from '../rules';
import type { CasoSvincolo, ContractType, EsitoValidazione } from '../rules';

/** Hard block del rules engine: l'operazione non viene salvata (doc 01 §3.3). */
export class ViolazioneRegoleError extends Error {
  constructor(public violazioni: string[]) {
    super(`Operazione bloccata: ${violazioni.join('; ')}`);
    this.name = 'ViolazioneRegoleError';
  }
}

// ---------- tipi di dominio (specchio in-memory del doc 03) ----------

export interface UtenteSeed {
  id: string;
  ruolo: 'super_admin' | 'president' | 'viewer';
  squadra?: string;
}
export interface SquadraSeed { id: string; nome: string; crediti?: number }
export interface GiocatoreSeed { id: string; nome: string; ruoli?: string[]; nascita?: string }
export interface SnapshotSeed { giocatore: string; fvmM: number; data: string; source?: string }

export interface StagioneConfig {
  capEur: number;
  minIngaggiEur: number;
  rosaMin: number;
  rosaMax: number;
  minPortieri: number;
  vivaioSlots: number;
  fineStagione: string; // data di riferimento per l'età vivaio al rollover
}

export interface Snapshot { id: string; giocatore: string; fvmM: number; data: string; source: string }

export interface Contratto {
  id: string;
  giocatore: string;
  squadra: string;
  tipo: ContractType;
  anniTotali: number;
  annoCorrente: number;
  fvmCongelato: number;
  fvmSnapshotId: string; // invariante 7: ogni FVM usato referenzia uno snapshot datato
  ingaggioBaseEur: number;
  pianoIngaggiEur: number[];
  stato: 'active' | 'closed' | 'transferred' | 'expired' | 'rescinded';
  prezzoAcquistoCrediti: number;
  sessioneAcquisto: number; // per Osimhen Gate (doc 02 §8)
}

export interface VoceRosa {
  id: string;
  squadra: string;
  giocatore: string;
  stato: 'in_rosa' | 'vivaio' | 'prestito_in' | 'prestito_out' | 'asteriscato' | 'svincolato';
  slot: 'rosa' | 'vivaio';
  dal: string;
  al?: string; // invariante 2: mai cancellare, solo chiudere
  operazioneId?: string;
  prestitoGratuitoPreAsta?: boolean;
}

export type CausaleCrediti = 'saldo_iniziale' | 'acquisto' | 'cessione' | 'svincolo' | 'conguaglio' | 'rettifica';
export type CausaleEuro = 'quota_iscrizione' | 'ingaggio' | 'multa' | 'premio' | 'rettifica';

export interface MovimentoCrediti {
  id: string;
  squadra: string;
  operazioneId?: string;
  importo: number;
  causale: CausaleCrediti;
  fvmSnapshotId?: string;
  creatoIl: string;
}

export interface MovimentoEuro {
  id: string;
  squadra: string;
  importoEur: number;
  causale: CausaleEuro;
  operazioneId?: string;
  giornata?: number;
  creatoIl: string;
}

export interface VoceAudit {
  id: string;
  utente: string;
  entita: string;
  entitaId: string;
  azione: 'INSERT' | 'UPDATE' | 'APPROVE' | 'REJECT';
  prima?: unknown;
  dopo?: unknown;
  creatoIl: string;
}

// ---------- proposte operazione ----------

export type Proposta =
  | { tipo: 'asta' | 'asta_riparazione'; squadra: string; giocatore: string; prezzoCrediti: number; contratto: ContractType }
  | {
      tipo: 'scambio';
      squadraA: string;
      squadraB: string;
      giocatoriA: string[]; // ceduti da A verso B
      giocatoriB: string[]; // ceduti da B verso A
      conguaglio?: { daSquadra: string; importoCrediti: number };
      pctRicevente?: number; // divisione ingaggi concordata (doc 02 §5)
    }
  | { tipo: 'svincolo'; squadra: string; giocatore: string; caso: CasoSvincolo }
  | { tipo: 'sost_asteriscato'; squadra: string; sostituto: string; asteriscato: string; contratto?: ContractType; preAsta?: boolean }
  | { tipo: 'rettifica_admin'; collegataA?: string; note?: string; crediti?: { squadra: string; importo: number } };

export interface Operazione {
  id: string;
  proposta: Proposta;
  stato: 'pending' | 'approved' | 'rejected';
  propostaDa: string;
  decisaDa?: string;
  propostaIl: string;
  decisaIl?: string;
  motivoRifiuto?: string;
  finestraOrdinal: number | null;
}

export interface LegaSeed {
  stagione?: Partial<StagioneConfig>;
  utenti: UtenteSeed[];
  squadre: SquadraSeed[];
  giocatori: GiocatoreSeed[];
  snapshots: SnapshotSeed[];
  /** Stato iniziale (stile migrazione): crea contratto+rosa senza passare dal workflow. */
  contrattiIniziali?: {
    giocatore: string;
    squadra: string;
    tipo: ContractType;
    prezzoCrediti?: number;
    slot?: 'rosa' | 'vivaio';
    addebitaIngaggio?: boolean;
  }[];
  oggi?: string;
}

interface GiocatoreInterno extends GiocatoreSeed {
  listone: 'in_listone' | 'asteriscato' | 'assente';
}

const CAUSALI_CREDITI: CausaleCrediti[] = ['saldo_iniziale', 'acquisto', 'cessione', 'svincolo', 'conguaglio', 'rettifica'];
const CAUSALI_EURO: CausaleEuro[] = ['quota_iscrizione', 'ingaggio', 'multa', 'premio', 'rettifica'];

export class LegaEngine {
  private seq = 0;
  oggi: string;
  postAstaInvernale = false;
  private sessioneCorrente = 1; // la prima sessione è l'asta estiva di apertura
  private finestraOrdinal: number | null = null;

  readonly stagione: StagioneConfig;
  private utenti = new Map<string, UtenteSeed>();
  private squadre = new Map<string, SquadraSeed>();
  private giocatori = new Map<string, GiocatoreInterno>();
  readonly snapshots: Snapshot[] = [];
  readonly contratti: Contratto[] = [];
  readonly rosa: VoceRosa[] = [];
  readonly operazioni: Operazione[] = [];
  readonly movimentiCrediti: MovimentoCrediti[] = [];
  readonly movimentiEuro: MovimentoEuro[] = [];
  readonly audit: VoceAudit[] = [];
  /** Residui ingaggio dovuti negli anni futuri dopo uno svincolo (proiezione pluriennale). */
  readonly residuiFuturi: { squadra: string; giocatore: string; importoEur: number; anniNelFuturo: number }[] = [];

  constructor(seed: LegaSeed) {
    this.stagione = {
      capEur: 250,
      minIngaggiEur: 50,
      rosaMin: 23,
      rosaMax: 30,
      minPortieri: 2,
      vivaioSlots: 3,
      fineStagione: '2027-06-30',
      ...seed.stagione,
    };
    this.oggi = seed.oggi ?? '2026-08-20';
    for (const u of seed.utenti) this.utenti.set(u.id, u);
    for (const s of seed.squadre) {
      this.squadre.set(s.id, s);
      if (s.crediti && s.crediti !== 0) {
        this.movimentiCrediti.push({
          id: this.id('mc'),
          squadra: s.id,
          importo: s.crediti,
          causale: 'saldo_iniziale',
          creatoIl: this.oggi,
        });
      }
    }
    for (const g of seed.giocatori) this.giocatori.set(g.id, { ...g, listone: 'in_listone' });
    for (const sn of seed.snapshots) {
      this.snapshots.push({
        id: this.id('fvm'),
        giocatore: sn.giocatore,
        fvmM: sn.fvmM,
        data: sn.data,
        source: sn.source ?? 'listone_estivo',
      });
    }
    for (const c of seed.contrattiIniziali ?? []) {
      const snap = this.fvmAllaData(c.giocatore);
      const piano = pianoIngaggi(c.tipo, snap.fvmM);
      this.contratti.push({
        id: this.id('ctr'),
        giocatore: c.giocatore,
        squadra: c.squadra,
        tipo: c.tipo,
        anniTotali: piano.length,
        annoCorrente: 1,
        fvmCongelato: snap.fvmM,
        fvmSnapshotId: snap.id,
        ingaggioBaseEur: piano[0],
        pianoIngaggiEur: piano,
        stato: 'active',
        prezzoAcquistoCrediti: c.prezzoCrediti ?? snap.fvmM,
        sessioneAcquisto: 0,
      });
      const slot = c.slot ?? (c.tipo === 'vivaio' ? 'vivaio' : 'rosa');
      this.rosa.push({
        id: this.id('rst'),
        squadra: c.squadra,
        giocatore: c.giocatore,
        stato: slot === 'vivaio' ? 'vivaio' : 'in_rosa',
        slot,
        dal: this.oggi,
      });
      if (c.addebitaIngaggio !== false) {
        this.movimentiEuro.push({
          id: this.id('me'),
          squadra: c.squadra,
          importoEur: piano[0],
          causale: 'ingaggio',
          creatoIl: this.oggi,
        });
      }
    }
  }

  // ---------- interrogazioni (fonte di verità = ledger) ----------

  budget(squadra: string): number {
    return round2(this.movimentiCrediti.filter((m) => m.squadra === squadra).reduce((a, m) => a + m.importo, 0));
  }

  monteIngaggi(squadra: string): number {
    return round2(
      this.movimentiEuro
        .filter((m) => m.squadra === squadra && m.causale === 'ingaggio')
        .reduce((a, m) => a + m.importoEur, 0)
    );
  }

  /** Invariante 3: Σ crediti di lega, monitorata sulla dashboard admin. */
  sommaCreditiLega(): number {
    return round2(this.movimentiCrediti.reduce((a, m) => a + m.importo, 0));
  }

  /** Invariante 7: il valore FVM valido a una data è l'ultimo snapshot non successivo. */
  fvmAllaData(giocatore: string, data: string = this.oggi): Snapshot {
    const validi = this.snapshots
      .filter((s) => s.giocatore === giocatore && s.data <= data)
      .sort((a, b) => (a.data < b.data ? -1 : 1));
    const ultimo = validi[validi.length - 1];
    if (!ultimo) throw new Error(`Nessuno snapshot FVM per ${giocatore} alla data ${data}`);
    return ultimo;
  }

  aggiungiSnapshot(giocatore: string, fvmM: number, data: string, source = 'update', utente = 'import'): Snapshot {
    const snap: Snapshot = { id: this.id('fvm'), giocatore, fvmM, data, source };
    this.snapshots.push(snap);
    this.scriviAudit(utente, 'fvm_snapshot', snap.id, 'INSERT', undefined, snap);
    return snap;
  }

  contrattoAttivo(giocatore: string): Contratto | undefined {
    return this.contratti.find((c) => c.giocatore === giocatore && c.stato === 'active');
  }

  voceRosaAttiva(giocatore: string): VoceRosa | undefined {
    return this.rosa.find((v) => v.giocatore === giocatore && !v.al);
  }

  private conteggioRosa(squadra: string): { size: number; portieri: number } {
    const attive = this.rosa.filter((v) => v.squadra === squadra && !v.al && v.slot === 'rosa');
    const portieri = attive.filter((v) => this.giocatori.get(v.giocatore)?.ruoli?.includes('P')).length;
    return { size: attive.length, portieri };
  }

  pluriennaliAttivi(squadra: string): number {
    return this.contratti.filter(
      (c) => c.squadra === squadra && c.stato === 'active' && c.anniTotali > 1 && c.tipo !== 'vivaio'
    ).length;
  }

  private vivaioAttivi(squadra: string): VoceRosa[] {
    return this.rosa.filter((v) => v.squadra === squadra && !v.al && v.slot === 'vivaio');
  }

  // ---------- finestre e sessioni di mercato ----------

  apriFinestra(ordinal: number): void {
    this.sessioneCorrente += 1;
    this.finestraOrdinal = ordinal;
  }

  chiudiFinestra(): void {
    this.finestraOrdinal = null;
  }

  apriSessioneMercato(tipo: 'asta_estiva' | 'asta_invernale'): void {
    this.sessioneCorrente += 1;
    if (tipo === 'asta_invernale') {
      this.postAstaInvernale = true;
      this.rilasciaSostitutiPreAsta();
    }
  }

  /** I sostituti-prestito gratuiti pre-asta tornano svincolati all'apertura dell'asta (doc 02 §8). */
  private rilasciaSostitutiPreAsta(): void {
    for (const v of this.rosa.filter((v) => v.prestitoGratuitoPreAsta && !v.al)) {
      const prima = { ...v };
      v.al = this.oggi;
      this.scriviAudit('sistema', 'roster_entry', v.id, 'UPDATE', prima, { ...v });
    }
  }

  // ---------- workflow operazioni (doc 01 §3.3) ----------

  proponi(proposta: Proposta, utenteId: string): Operazione {
    const utente = this.utenti.get(utenteId);
    if (!utente || utente.ruolo === 'viewer') {
      throw new ViolazioneRegoleError(['utente non autorizzato a proporre operazioni']);
    }
    // Preview obbligatoria: hard block se il rules engine rileva violazioni.
    this.valida(proposta);
    const op: Operazione = {
      id: this.id('op'),
      proposta,
      stato: 'pending',
      propostaDa: utenteId,
      propostaIl: this.oggi,
      finestraOrdinal: this.finestraOrdinal,
    };
    this.operazioni.push(op);
    this.scriviAudit(utenteId, 'operazione', op.id, 'INSERT', undefined, { stato: 'pending', tipo: proposta.tipo });
    return op;
    // Invariante 10: nessun movimento finché non convalidata.
  }

  convalida(opId: string, adminId: string): void {
    const op = this.operazione(opId);
    this.richiediSuperAdmin(adminId);
    if (op.stato !== 'pending') {
      throw new Error(`operazione ${opId} non pendente (stato: ${op.stato})`);
    }
    this.valida(op.proposta); // rivalidazione al momento della convalida
    this.applica(op); // transazione unica: validazione già superata, poi tutti gli effetti
    op.stato = 'approved';
    op.decisaDa = adminId;
    op.decisaIl = this.oggi;
    this.scriviAudit(adminId, 'operazione', op.id, 'APPROVE', { stato: 'pending' }, { stato: 'approved' });
  }

  rifiuta(opId: string, adminId: string, motivo: string): void {
    const op = this.operazione(opId);
    this.richiediSuperAdmin(adminId);
    if (op.stato !== 'pending') {
      throw new Error(`operazione ${opId} non pendente (stato: ${op.stato})`);
    }
    op.stato = 'rejected';
    op.decisaDa = adminId;
    op.decisaIl = this.oggi;
    op.motivoRifiuto = motivo;
    this.scriviAudit(adminId, 'operazione', op.id, 'REJECT', { stato: 'pending' }, { stato: 'rejected', motivo });
  }

  /** Invariante 1: un'operazione convalidata è immutabile (solo rettifica admin collegata). */
  modificaOperazione(opId: string): never {
    const op = this.operazione(opId);
    if (op.stato === 'approved') {
      throw new Error('operazione convalidata immutabile: creare una rettifica_admin collegata');
    }
    throw new Error('modifica diretta non supportata: rifiutare e riproporre');
  }

  // ---------- azioni admin fuori workflow ----------

  /** Asterisco dalla redazione (import listone): stato aggiornato, ingaggio resta a bilancio. */
  applicaAsterisco(giocatore: string, utenteId: string): { alertSquadra?: string } {
    const g = this.giocatori.get(giocatore);
    if (!g) throw new Error(`giocatore ${giocatore} inesistente`);
    const primaG = { listone: g.listone };
    g.listone = 'asteriscato';
    this.scriviAudit(utenteId, 'giocatore', giocatore, 'UPDATE', primaG, { listone: 'asteriscato' });
    const voce = this.voceRosaAttiva(giocatore);
    if (voce) {
      const prima = { ...voce };
      voce.stato = 'asteriscato';
      this.scriviAudit(utenteId, 'roster_entry', voce.id, 'UPDATE', prima, { ...voce });
      return { alertSquadra: voce.squadra };
    }
    return {};
  }

  /** Rientro forzato dal cap (doc 02 §3): incasso = valore di acquisto, senza plus/minusvalenze. */
  svincoloRientroCap(giocatore: string, adminId: string): number {
    this.richiediSuperAdmin(adminId);
    const c = this.contrattoAttivo(giocatore);
    if (!c) throw new Error(`nessun contratto attivo per ${giocatore}`);
    const incasso = c.prezzoAcquistoCrediti;
    // niente fvmSnapshotId: l'incasso non deriva da un FVM, quindi nessuna plus/minusvalenza
    this.movCrediti(c.squadra, incasso, 'svincolo');
    this.chiudiContrattoERosa(c, 'closed', adminId);
    return incasso;
  }

  registraMulta(squadra: string, giornata: number, totaleGiornate: number, adminId: string): number {
    this.richiediSuperAdmin(adminId);
    const importo = multaMancataFormazione(giornata, totaleGiornate);
    const mov: MovimentoEuro = {
      id: this.id('me'),
      squadra,
      importoEur: -importo, // esborso della squadra verso il montepremi; escluso dal cap (causale 'multa')
      causale: 'multa',
      giornata,
      creatoIl: this.oggi,
    };
    this.movimentiEuro.push(mov);
    this.scriviAudit(adminId, 'movimento_euro', mov.id, 'INSERT', undefined, mov);
    return importo;
  }

  /** Rollover di fine stagione (doc 01 §3.4): slot a 11, vivaio/22 anni, scadenze. */
  rolloverStagione(opts: { decisioniVivaio?: Record<string, 'promozione' | 'svincolo'> } = {}): {
    fuoriParametroSlot: string[];
    promossi: string[];
    svincolati: string[];
  } {
    const decisioni = opts.decisioniVivaio ?? {};

    // Scelta forzata per chi compie 22 anni (doc 02 §9)
    const senzaDecisione: string[] = [];
    for (const v of this.rosa.filter((v) => v.slot === 'vivaio' && !v.al)) {
      const nascita = this.giocatori.get(v.giocatore)?.nascita;
      if (nascita && this.eta(nascita, this.stagione.fineStagione) >= 22 && !decisioni[v.giocatore]) {
        senzaDecisione.push(v.giocatore);
      }
    }
    if (senzaDecisione.length > 0) {
      throw new Error(
        `rollover bloccato: scelta obbligatoria (promozione o svincolo) per i giocatori del vivaio a 22 anni: ${senzaDecisione.join(', ')}`
      );
    }

    const promossi: string[] = [];
    const svincolati: string[] = [];
    for (const [giocatore, scelta] of Object.entries(decisioni)) {
      const voce = this.voceRosaAttiva(giocatore);
      if (!voce || voce.slot !== 'vivaio') throw new Error(`${giocatore} non è nel vivaio`);
      const contratto = this.contrattoAttivo(giocatore);
      if (scelta === 'promozione') {
        const esito = validaPromozioneVivaio({ fineStagione: true });
        if (!esito.ok) throw new ViolazioneRegoleError(esito.violazioni);
        // Promozione gratuita: libera slot vivaio, occupa slot rosa, zero crediti (doc 02 §9)
        const prima = { ...voce };
        voce.al = this.oggi;
        this.scriviAudit('sistema', 'roster_entry', voce.id, 'UPDATE', prima, { ...voce });
        const nuova: VoceRosa = {
          id: this.id('rst'),
          squadra: voce.squadra,
          giocatore,
          stato: 'in_rosa',
          slot: 'rosa',
          dal: this.oggi,
        };
        this.rosa.push(nuova);
        this.scriviAudit('sistema', 'roster_entry', nuova.id, 'INSERT', undefined, nuova);
        promossi.push(giocatore);
      } else {
        // Svincolo vivaio: incasso = ultimo FVM M disponibile (doc 02 §9)
        const snap = this.fvmAllaData(giocatore);
        this.movCrediti(voce.squadra, incassoSvincolo('vivaio_fine_stagione', { fvmRiferimento: snap.fvmM }), 'svincolo', undefined, snap.id);
        if (contratto) this.chiudiContrattoERosa(contratto, 'closed', 'sistema');
        else {
          const prima = { ...voce };
          voce.al = this.oggi;
          this.scriviAudit('sistema', 'roster_entry', voce.id, 'UPDATE', prima, { ...voce });
        }
        svincolati.push(giocatore);
      }
    }

    // Avanzamento anni contrattuali e scadenze
    for (const c of this.contratti.filter((c) => c.stato === 'active' && c.tipo !== 'vivaio')) {
      const prima = { annoCorrente: c.annoCorrente, stato: c.stato };
      c.annoCorrente += 1;
      if (c.annoCorrente > c.anniTotali) c.stato = 'expired';
      this.scriviAudit('sistema', 'contratto', c.id, 'UPDATE', prima, { annoCorrente: c.annoCorrente, stato: c.stato });
    }

    // Gli slot tornano 11: segnalare le squadre fuori parametro (doc 02 §4)
    this.postAstaInvernale = false;
    const fuoriParametroSlot = [...this.squadre.keys()].filter((s) => this.pluriennaliAttivi(s) > 11);

    return { fuoriParametroSlot, promossi, svincolati };
  }

  // ---------- validazione (preview: nessun effetto) ----------

  private valida(p: Proposta): void {
    const violazioni: string[] = [];
    const raccogli = (e: EsitoValidazione) => {
      if (!e.ok) violazioni.push(...e.violazioni);
    };

    switch (p.tipo) {
      case 'asta':
      case 'asta_riparazione': {
        raccogli(validaNuovoContratto({ giocatoreGiaSottoContratto: !!this.contrattoAttivo(p.giocatore) }));
        if (this.budget(p.squadra) < p.prezzoCrediti) {
          violazioni.push(`crediti insufficienti: prezzo ${p.prezzoCrediti}, budget ${this.budget(p.squadra)}`);
        }
        const piano = pianoIngaggi(p.contratto, this.fvmAllaData(p.giocatore).fvmM);
        raccogli(checkSalaryCap({ monteAttualeEur: this.monteIngaggi(p.squadra), deltaNettoEur: piano[0], capEur: this.stagione.capEur }));
        const { size, portieri } = this.conteggioRosa(p.squadra);
        raccogli(
          checkRosa({
            size,
            deltaNetto: 1,
            portieri,
            deltaPortieri: this.portiere(p.giocatore) ? 1 : 0,
            rosaMin: this.stagione.rosaMin,
            rosaMax: this.stagione.rosaMax,
            minPortieri: this.stagione.minPortieri,
          })
        );
        if (piano.length > 1) {
          raccogli(checkSlotPluriennali({ attivi: this.pluriennaliAttivi(p.squadra), deltaNetto: 1, postAstaInvernale: this.postAstaInvernale }));
        }
        break;
      }

      case 'scambio': {
        raccogli(
          validaOperazioneInFinestra({
            tipoOperazione: 'cessione_definitiva',
            finestraOrdinal: this.finestraOrdinal,
            conConguaglio: !!p.conguaglio,
          })
        );
        if (p.pctRicevente !== undefined && this.finestraOrdinal !== null) {
          raccogli(validaDivisioneIngaggio({ finestraOrdinal: this.finestraOrdinal, pctRicevente: p.pctRicevente }));
        }
        for (const [squadra, inArrivo, inUscita] of [
          [p.squadraA, p.giocatoriB, p.giocatoriA],
          [p.squadraB, p.giocatoriA, p.giocatoriB],
        ] as [string, string[], string[]][]) {
          const { size, portieri } = this.conteggioRosa(squadra);
          const deltaP = inArrivo.filter((g) => this.portiere(g)).length - inUscita.filter((g) => this.portiere(g)).length;
          raccogli(
            checkRosa({
              size,
              deltaNetto: inArrivo.length - inUscita.length,
              portieri,
              deltaPortieri: deltaP,
              rosaMin: this.stagione.rosaMin,
              rosaMax: this.stagione.rosaMax,
              minPortieri: this.stagione.minPortieri,
            })
          );
          const deltaSlot =
            inArrivo.filter((g) => this.pluriennale(g)).length - inUscita.filter((g) => this.pluriennale(g)).length;
          raccogli(checkSlotPluriennali({ attivi: this.pluriennaliAttivi(squadra), deltaNetto: deltaSlot, postAstaInvernale: this.postAstaInvernale }));
          const deltaEuro = round2(
            inArrivo.reduce((a, g) => a + this.caricoTrasferimento(g, p.pctRicevente), 0) -
              inUscita.reduce((a, g) => a + this.caricoTrasferimento(g, p.pctRicevente), 0)
          );
          raccogli(checkSalaryCap({ monteAttualeEur: this.monteIngaggi(squadra), deltaNettoEur: deltaEuro, capEur: this.stagione.capEur }));
        }
        if (p.conguaglio && this.budget(p.conguaglio.daSquadra) < p.conguaglio.importoCrediti) {
          violazioni.push('conguaglio: crediti insufficienti');
        }
        break;
      }

      case 'svincolo': {
        const c = this.contrattoAttivo(p.giocatore);
        const voce = this.voceRosaAttiva(p.giocatore);
        if (!c || !voce) {
          violazioni.push(`nessun contratto/rosa attivo per ${p.giocatore}`);
          break;
        }
        const { size, portieri } = this.conteggioRosa(p.squadra);
        if (p.caso === 'rescissione') {
          raccogli(
            validaRescissione({
              slotKind: voce.slot,
              rosaSize: size,
              rosaMin: this.stagione.rosaMin,
              asteriscato: voce.stato === 'asteriscato',
            })
          );
        }
        if (voce.slot === 'rosa') {
          raccogli(
            checkRosa({
              size,
              deltaNetto: -1,
              portieri,
              deltaPortieri: this.portiere(p.giocatore) ? -1 : 0,
              rosaMin: this.stagione.rosaMin,
              rosaMax: this.stagione.rosaMax,
              minPortieri: this.stagione.minPortieri,
            })
          );
        }
        break;
      }

      case 'sost_asteriscato': {
        const vAst = this.voceRosaAttiva(p.asteriscato);
        if (!vAst || vAst.stato !== 'asteriscato') {
          violazioni.push('il giocatore da sostituire non risulta asteriscato in rosa');
          break;
        }
        const fvmAst = this.fvmAllaData(p.asteriscato).fvmM;
        const fvmSost = this.fvmAllaData(p.sostituto).fvmM;
        const svincolato = !this.voceRosaAttiva(p.sostituto) && !this.contrattoAttivo(p.sostituto);
        raccogli(
          validaSostitutoAsteriscato({
            fvmAsteriscato: fvmAst,
            fvmSostituto: fvmSost,
            daListaSvincolatiPostUltimaAsta: svincolato,
          })
        );
        if (!p.preAsta && this.budget(p.squadra) < fvmSost) {
          violazioni.push('crediti insufficienti per il sostituto');
        }
        break;
      }

      case 'rettifica_admin':
        break; // sempre consentita, tracciata in audit
    }

    if (violazioni.length > 0) throw new ViolazioneRegoleError(violazioni);
  }

  // ---------- applicazione effetti (transazione unica) ----------

  private applica(op: Operazione): void {
    const p = op.proposta;
    switch (p.tipo) {
      case 'asta':
      case 'asta_riparazione': {
        const snap = this.fvmAllaData(p.giocatore);
        const piano = pianoIngaggi(p.contratto, snap.fvmM);
        const contratto: Contratto = {
          id: this.id('ctr'),
          giocatore: p.giocatore,
          squadra: p.squadra,
          tipo: p.contratto,
          anniTotali: piano.length,
          annoCorrente: 1,
          fvmCongelato: snap.fvmM,
          fvmSnapshotId: snap.id,
          ingaggioBaseEur: piano[0],
          pianoIngaggiEur: piano,
          stato: 'active',
          prezzoAcquistoCrediti: p.prezzoCrediti,
          sessioneAcquisto: this.sessioneCorrente,
        };
        this.contratti.push(contratto);
        this.scriviAudit(op.propostaDa, 'contratto', contratto.id, 'INSERT', undefined, contratto);
        this.movCrediti(p.squadra, -p.prezzoCrediti, 'acquisto', op.id);
        this.movEuro(p.squadra, piano[0], 'ingaggio', op.id);
        const voce: VoceRosa = {
          id: this.id('rst'),
          squadra: p.squadra,
          giocatore: p.giocatore,
          stato: 'in_rosa',
          slot: 'rosa',
          dal: this.oggi,
          operazioneId: op.id,
        };
        this.rosa.push(voce);
        this.scriviAudit(op.propostaDa, 'roster_entry', voce.id, 'INSERT', undefined, voce);
        break;
      }

      case 'scambio': {
        for (const g of p.giocatoriA) this.trasferisci(g, p.squadraA, p.squadraB, op, p.pctRicevente);
        for (const g of p.giocatoriB) this.trasferisci(g, p.squadraB, p.squadraA, op, p.pctRicevente);
        if (p.conguaglio) {
          const altra = p.conguaglio.daSquadra === p.squadraA ? p.squadraB : p.squadraA;
          this.movCrediti(p.conguaglio.daSquadra, -p.conguaglio.importoCrediti, 'conguaglio', op.id);
          this.movCrediti(altra, p.conguaglio.importoCrediti, 'conguaglio', op.id);
        }
        break;
      }

      case 'svincolo': {
        const c = this.contrattoAttivo(p.giocatore)!;
        // Osimhen Gate (doc 02 §8): asteriscato prima dell'apertura della sessione successiva
        // all'asta d'acquisto → si incassano i crediti spesi, non il FVM.
        const osimhenGate =
          this.giocatori.get(p.giocatore)?.listone === 'asteriscato' && c.sessioneAcquisto === this.sessioneCorrente;
        let incasso: number;
        let fvmSnapshotId: string | undefined;
        if (p.caso === 'rescissione') {
          incasso = 0;
        } else if (osimhenGate) {
          incasso = c.prezzoAcquistoCrediti;
        } else {
          const snap = this.fvmAllaData(p.giocatore);
          incasso = incassoSvincolo(p.caso, { fvmRiferimento: snap.fvmM });
          fvmSnapshotId = snap.id;
        }
        if (incasso !== 0) this.movCrediti(p.squadra, incasso, 'svincolo', op.id, fvmSnapshotId);

        // Ingaggi residui dovuti (doc 02 §6): l'anno corrente rettifica il bilancio di
        // quest'anno; gli anni futuri restano come impegni in proiezione.
        const residui = ingaggioResiduoDovuto(p.caso, { pianoAnnualeEur: c.pianoIngaggiEur, annoCorrente: c.annoCorrente });
        const addebitatoCorrente = c.pianoIngaggiEur[c.annoCorrente - 1] ?? 0;
        const dovutoCorrente = residui[0] ?? 0;
        const rettifica = round2(dovutoCorrente - addebitatoCorrente);
        if (rettifica !== 0) this.movEuro(p.squadra, rettifica, 'ingaggio', op.id);
        residui.slice(1).forEach((importoEur, i) => {
          this.residuiFuturi.push({ squadra: p.squadra, giocatore: p.giocatore, importoEur, anniNelFuturo: i + 1 });
        });

        this.chiudiContrattoERosa(c, p.caso === 'rescissione' ? 'rescinded' : 'closed', op.propostaDa, op.id);
        break;
      }

      case 'sost_asteriscato': {
        if (p.preAsta) {
          // Asterisco nel mercato invernale di Serie A pre-asta: sostituto in prestito gratuito,
          // torna svincolato all'apertura dell'asta (doc 02 §8).
          const voce: VoceRosa = {
            id: this.id('rst'),
            squadra: p.squadra,
            giocatore: p.sostituto,
            stato: 'prestito_in',
            slot: 'rosa',
            dal: this.oggi,
            operazioneId: op.id,
            prestitoGratuitoPreAsta: true,
          };
          this.rosa.push(voce);
          this.scriviAudit(op.propostaDa, 'roster_entry', voce.id, 'INSERT', undefined, voce);
        } else {
          const snap = this.fvmAllaData(p.sostituto);
          const tipo = p.contratto ?? 'standard';
          const piano = pianoIngaggi(tipo, snap.fvmM);
          const contratto: Contratto = {
            id: this.id('ctr'),
            giocatore: p.sostituto,
            squadra: p.squadra,
            tipo,
            anniTotali: piano.length,
            annoCorrente: 1,
            fvmCongelato: snap.fvmM,
            fvmSnapshotId: snap.id,
            ingaggioBaseEur: piano[0],
            pianoIngaggiEur: piano,
            stato: 'active',
            prezzoAcquistoCrediti: snap.fvmM, // a titolo definitivo, al costo del FVM M del sostituto
            sessioneAcquisto: this.sessioneCorrente,
          };
          this.contratti.push(contratto);
          this.scriviAudit(op.propostaDa, 'contratto', contratto.id, 'INSERT', undefined, contratto);
          this.movCrediti(p.squadra, -snap.fvmM, 'acquisto', op.id, snap.id);
          this.movEuro(p.squadra, piano[0], 'ingaggio', op.id);
          const voce: VoceRosa = {
            id: this.id('rst'),
            squadra: p.squadra,
            giocatore: p.sostituto,
            stato: 'in_rosa',
            slot: 'rosa',
            dal: this.oggi,
            operazioneId: op.id,
          };
          this.rosa.push(voce);
          this.scriviAudit(op.propostaDa, 'roster_entry', voce.id, 'INSERT', undefined, voce);
        }
        break;
      }

      case 'rettifica_admin': {
        if (p.crediti) {
          this.movCrediti(p.crediti.squadra, p.crediti.importo, 'rettifica', op.id);
        }
        break;
      }
    }
  }

  /** Il contratto segue il giocatore (doc 02 §2): trasferimento con ammortamento per finestre. */
  private trasferisci(giocatore: string, da: string, a: string, op: Operazione, pctRicevente?: number): void {
    const voce = this.voceRosaAttiva(giocatore);
    const c = this.contrattoAttivo(giocatore);
    if (!voce || !c) throw new ViolazioneRegoleError([`${giocatore} non ha rosa/contratto attivo presso ${da}`]);
    const primaVoce = { ...voce };
    voce.al = this.oggi;
    this.scriviAudit(op.propostaDa, 'roster_entry', voce.id, 'UPDATE', primaVoce, { ...voce });
    const nuova: VoceRosa = {
      id: this.id('rst'),
      squadra: a,
      giocatore,
      stato: voce.slot === 'vivaio' ? 'vivaio' : 'in_rosa',
      slot: voce.slot,
      dal: this.oggi,
      operazioneId: op.id,
    };
    this.rosa.push(nuova);
    this.scriviAudit(op.propostaDa, 'roster_entry', nuova.id, 'INSERT', undefined, nuova);

    const primaCtr = { squadra: c.squadra };
    c.squadra = a;
    this.scriviAudit(op.propostaDa, 'contratto', c.id, 'UPDATE', primaCtr, { squadra: a });

    const trasferito = this.caricoTrasferimento(giocatore, pctRicevente);
    if (trasferito !== 0) {
      this.movEuro(da, -trasferito, 'ingaggio', op.id);
      this.movEuro(a, trasferito, 'ingaggio', op.id);
    }
  }

  /** Quota ingaggio trasferita al ricevente per il giocatore, secondo finestra o accordo. */
  private caricoTrasferimento(giocatore: string, pctRicevente?: number): number {
    const c = this.contrattoAttivo(giocatore);
    if (!c) return 0;
    const ingaggio = c.pianoIngaggiEur[c.annoCorrente - 1] ?? 0;
    if (this.finestraOrdinal === null) return ingaggio;
    if (pctRicevente !== undefined) return round2((ingaggio * pctRicevente) / 100);
    return ripartizioneScambio(ingaggio, this.finestraOrdinal).caricoRiceventeEur;
  }

  private chiudiContrattoERosa(c: Contratto, statoContratto: Contratto['stato'], utente: string, operazioneId?: string): void {
    const primaCtr = { stato: c.stato };
    c.stato = statoContratto;
    this.scriviAudit(utente, 'contratto', c.id, 'UPDATE', primaCtr, { stato: statoContratto });
    const voce = this.voceRosaAttiva(c.giocatore);
    if (voce) {
      const prima = { ...voce };
      voce.al = this.oggi;
      if (operazioneId) voce.operazioneId = operazioneId;
      this.scriviAudit(utente, 'roster_entry', voce.id, 'UPDATE', prima, { ...voce });
    }
  }

  // ---------- helper ----------

  private operazione(opId: string): Operazione {
    const op = this.operazioni.find((o) => o.id === opId);
    if (!op) throw new Error(`operazione ${opId} inesistente`);
    return op;
  }

  private richiediSuperAdmin(utenteId: string): void {
    if (this.utenti.get(utenteId)?.ruolo !== 'super_admin') {
      throw new ViolazioneRegoleError(['solo un Super Admin può decidere le operazioni']);
    }
  }

  private portiere(giocatore: string): boolean {
    return this.giocatori.get(giocatore)?.ruoli?.includes('P') ?? false;
  }

  private pluriennale(giocatore: string): boolean {
    const c = this.contrattoAttivo(giocatore);
    return !!c && c.anniTotali > 1 && c.tipo !== 'vivaio';
  }

  private eta(nascita: string, alla: string): number {
    const n = new Date(nascita);
    const a = new Date(alla);
    let e = a.getFullYear() - n.getFullYear();
    const m = a.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && a.getDate() < n.getDate())) e -= 1;
    return e;
  }

  private movCrediti(squadra: string, importo: number, causale: CausaleCrediti, operazioneId?: string, fvmSnapshotId?: string): void {
    if (!CAUSALI_CREDITI.includes(causale)) throw new Error(`causale crediti non valida: ${causale}`);
    const mov: MovimentoCrediti = {
      id: this.id('mc'),
      squadra,
      importo: round2(importo),
      causale,
      operazioneId,
      fvmSnapshotId,
      creatoIl: this.oggi,
    };
    this.movimentiCrediti.push(mov);
    this.scriviAudit('sistema', 'movimento_crediti', mov.id, 'INSERT', undefined, mov);
  }

  private movEuro(squadra: string, importoEur: number, causale: CausaleEuro, operazioneId?: string): void {
    if (!CAUSALI_EURO.includes(causale)) throw new Error(`causale euro non valida: ${causale}`);
    const mov: MovimentoEuro = {
      id: this.id('me'),
      squadra,
      importoEur: round2(importoEur),
      causale,
      operazioneId,
      creatoIl: this.oggi,
    };
    this.movimentiEuro.push(mov);
    this.scriviAudit('sistema', 'movimento_euro', mov.id, 'INSERT', undefined, mov);
  }

  private scriviAudit(utente: string, entita: string, entitaId: string, azione: VoceAudit['azione'], prima?: unknown, dopo?: unknown): void {
    this.audit.push({
      id: this.id('aud'),
      utente,
      entita,
      entitaId,
      azione,
      prima,
      dopo,
      creatoIl: this.oggi,
    });
  }

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }
}
