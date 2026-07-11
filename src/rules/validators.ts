// Validatori trasversali — doc 02 §3 (cap), §4 (slot e rosa), §12 (invarianti).
// Tutti valutano il RISULTATO NETTO dell'operazione (validazione atomica):
// cap, slot e limiti rosa non sono mai superabili nemmeno temporaneamente.

import { bloccato, consentito, round2 } from './esito';
import type { EsitoValidazione } from './types';

/** Salary cap €250 hard limit: blocca se monteAttuale + deltaNetto > cap. */
export function checkSalaryCap(input: {
  monteAttualeEur: number;
  deltaNettoEur: number;
  capEur: number;
}): EsitoValidazione {
  const finale = round2(input.monteAttualeEur + input.deltaNettoEur);
  if (finale > input.capEur) {
    return bloccato(
      `salary cap violato: monte ingaggi finale ${finale.toFixed(2)} € > cap ${input.capEur.toFixed(2)} € (sforamento ${round2(finale - input.capEur).toFixed(2)} €)`
    );
  }
  return consentito();
}

/** Base del cap: solo ingaggi — quota iscrizione e multe escluse (doc 02 §3). */
export function baseCapEur(input: {
  ingaggiEur: number;
  quotaIscrizioneEur: number;
  multeEur: number;
}): number {
  return round2(input.ingaggiEur);
}

/** Slot pluriennali: max 11 (12 da post asta invernale a fine stagione), sul netto. */
export function checkSlotPluriennali(input: {
  attivi: number;
  deltaNetto: number;
  postAstaInvernale: boolean;
}): EsitoValidazione {
  const max = input.postAstaInvernale ? 12 : 11;
  const finale = input.attivi + input.deltaNetto;
  if (finale > max) {
    return bloccato(`slot pluriennali: ${finale} > max ${max}${input.postAstaInvernale ? ' (post asta invernale)' : ''}`);
  }
  return consentito();
}

/** Rosa 23–30, minimo 2 portieri (regolamento; configurabile solo per i test), sul netto. */
export function checkRosa(input: {
  size: number;
  deltaNetto: number;
  portieri: number;
  deltaPortieri: number;
  rosaMin: number;
  rosaMax: number;
  minPortieri?: number;
}): EsitoValidazione {
  const violazioni: string[] = [];
  const minPortieri = input.minPortieri ?? 2;
  const size = input.size + input.deltaNetto;
  const portieri = input.portieri + input.deltaPortieri;
  if (size < input.rosaMin) violazioni.push(`rosa sotto il minimo: ${size} < ${input.rosaMin}`);
  if (size > input.rosaMax) violazioni.push(`rosa oltre il massimo: ${size} > ${input.rosaMax}`);
  if (portieri < minPortieri) violazioni.push(`portieri insufficienti: ${portieri} < ${minPortieri}`);
  return violazioni.length > 0 ? bloccato(...violazioni) : consentito();
}

/** Vivaio: max 3 slot, extra rosa, in qualsiasi momento. */
export function checkVivaio(input: {
  occupati: number;
  deltaNetto: number;
  max: number;
}): EsitoValidazione {
  const finale = input.occupati + input.deltaNetto;
  if (finale > input.max) {
    return bloccato(`slot vivaio: ${finale} > max ${input.max}`);
  }
  return consentito();
}

/** Contratti stipulabili solo con giocatori in arrivo dalla lista svincolati (doc 02 §2). */
export function validaNuovoContratto(input: {
  giocatoreGiaSottoContratto: boolean;
}): EsitoValidazione {
  if (input.giocatoreGiaSottoContratto) {
    return bloccato('il giocatore ha già un contratto attivo: non si cambia contratto a chi ne ha già uno (serve lo svincolo)');
  }
  return consentito();
}
