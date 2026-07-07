// Multe e contabilità euro — doc 02 §11.
// Multe SOLO in euro → montepremi, escluse dal salary cap, nessuna decurtazione crediti.

import { NotImplementedError } from './errors';

/** Multa mancata formazione: €20/giornata, €40 nelle ultime 5 giornate. */
export function multaMancataFormazione(giornata: number, totaleGiornate: number): number {
  void giornata; void totaleGiornate;
  throw new NotImplementedError('multaMancataFormazione');
}

/** Montepremi = quote iscrizione + monte ingaggi totale + multe. */
export function montepremi(input: {
  quoteIscrizioneEur: number;
  monteIngaggiTotaleEur: number;
  multeEur: number;
}): number {
  void input;
  throw new NotImplementedError('montepremi');
}

/** Ripartizione: 33/20/12% campionato 1°/2°/3°, 15% somma punti, 13% coppa, 7% finalista. */
export function ripartizioneMontepremi(totaleEur: number): {
  campionato1: number;
  campionato2: number;
  campionato3: number;
  sommaPunti: number;
  vincitoreCoppa: number;
  finalistaCoppa: number;
} {
  void totaleEur;
  throw new NotImplementedError('ripartizioneMontepremi');
}
