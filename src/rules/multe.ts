// Multe e contabilità euro — doc 02 §11.
// Multe SOLO in euro → montepremi, escluse dal salary cap, nessuna decurtazione crediti.

import { round2 } from './esito';

/** Multa mancata formazione: €20/giornata, €40 nelle ultime 5 giornate. */
export function multaMancataFormazione(giornata: number, totaleGiornate: number): number {
  if (giornata < 1 || giornata > totaleGiornate) {
    throw new Error(`multaMancataFormazione: giornata ${giornata} fuori range (1–${totaleGiornate})`);
  }
  return giornata > totaleGiornate - 5 ? 40 : 20;
}

/** Montepremi = quote iscrizione + monte ingaggi totale + multe. */
export function montepremi(input: {
  quoteIscrizioneEur: number;
  monteIngaggiTotaleEur: number;
  multeEur: number;
}): number {
  return round2(input.quoteIscrizioneEur + input.monteIngaggiTotaleEur + input.multeEur);
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
  return {
    campionato1: round2(totaleEur * 0.33),
    campionato2: round2(totaleEur * 0.2),
    campionato3: round2(totaleEur * 0.12),
    sommaPunti: round2(totaleEur * 0.15),
    vincitoreCoppa: round2(totaleEur * 0.13),
    finalistaCoppa: round2(totaleEur * 0.07),
  };
}
