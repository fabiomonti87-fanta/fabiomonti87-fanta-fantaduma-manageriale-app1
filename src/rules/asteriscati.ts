// Asteriscati e Osimhen Gate — doc 02 §8.

import { bloccato, consentito } from './esito';
import type { EsitoValidazione } from './types';

/**
 * Incasso allo svincolo di un asteriscato.
 * Osimhen Gate: se asteriscato prima dell'apertura della sessione di mercato successiva
 * all'asta d'acquisto → incasso = crediti spesi (niente plus/minusvalenza).
 * Altrimenti: FVM M del momento.
 */
export function incassoAsteriscato(input: {
  creditiSpesi: number;
  fvmAttuale: number;
  asteriscatoPrimaNuovaSessione: boolean;
}): number {
  return input.asteriscatoPrimaNuovaSessione ? input.creditiSpesi : input.fvmAttuale;
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
  const violazioni: string[] = [];
  if (!input.daListaSvincolatiPostUltimaAsta) {
    violazioni.push('sostituto non presente nella lista svincolati post ultima asta');
  }
  if (input.fvmSostituto > input.fvmAsteriscato) {
    violazioni.push(
      `FVM sostituto (${input.fvmSostituto}) superiore al FVM dell'asteriscato (${input.fvmAsteriscato})`
    );
  }
  return violazioni.length > 0 ? bloccato(...violazioni) : consentito();
}
