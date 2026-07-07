// Asteriscati e Osimhen Gate — doc 02 §8.

import { NotImplementedError } from './errors';
import type { EsitoValidazione } from './types';

/**
 * Incasso allo svincolo di un asteriscato.
 * Osimhen Gate: se asteriscato prima dell'apertura della sessione di mercato successiva
 * all'asta d'acquisto → incasso = crediti spesi (niente plus/minusvalenza).
 */
export function incassoAsteriscato(input: {
  creditiSpesi: number;
  fvmAttuale: number;
  asteriscatoPrimaNuovaSessione: boolean;
}): number {
  void input;
  throw new NotImplementedError('incassoAsteriscato');
}

/**
 * Sostituzione asteriscato: dalla lista svincolati post ultima asta, a titolo definitivo,
 * con FVM M sostituto ≤ FVM M asteriscato.
 */
export function validaSostitutoAsteriscato(input: {
  fvmAsteriscato: number;
  fvmSostituto: number;
  daListaSvincolatiPostUltimaAsta: boolean;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaSostitutoAsteriscato');
}
