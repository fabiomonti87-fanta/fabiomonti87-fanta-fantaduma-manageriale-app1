// Validatori trasversali — doc 02 §3 (cap), §4 (slot e rosa), §12 (invarianti).
// Tutti valutano il RISULTATO NETTO dell'operazione (validazione atomica):
// cap, slot e limiti rosa non sono mai superabili nemmeno temporaneamente.

import { NotImplementedError } from './errors';
import type { EsitoValidazione } from './types';

/** Salary cap €250 hard limit: blocca se monteAttuale + deltaNetto > cap. */
export function checkSalaryCap(input: {
  monteAttualeEur: number;
  deltaNettoEur: number;
  capEur: number;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('checkSalaryCap');
}

/** Base del cap: solo ingaggi — quota iscrizione e multe escluse. */
export function baseCapEur(input: {
  ingaggiEur: number;
  quotaIscrizioneEur: number;
  multeEur: number;
}): number {
  void input;
  throw new NotImplementedError('baseCapEur');
}

/** Slot pluriennali: max 11 (12 da post asta invernale a fine stagione), sul netto. */
export function checkSlotPluriennali(input: {
  attivi: number;
  deltaNetto: number;
  postAstaInvernale: boolean;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('checkSlotPluriennali');
}

/** Rosa 23–30, minimo 2 portieri, sul risultato netto dell'operazione. */
export function checkRosa(input: {
  size: number;
  deltaNetto: number;
  portieri: number;
  deltaPortieri: number;
  rosaMin: number;
  rosaMax: number;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('checkRosa');
}

/** Vivaio: max 3 slot, extra rosa, in qualsiasi momento. */
export function checkVivaio(input: {
  occupati: number;
  deltaNetto: number;
  max: number;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('checkVivaio');
}

/** Contratti stipulabili solo con giocatori in arrivo dalla lista svincolati (doc 02 §2). */
export function validaNuovoContratto(input: {
  giocatoreGiaSottoContratto: boolean;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaNuovoContratto');
}
