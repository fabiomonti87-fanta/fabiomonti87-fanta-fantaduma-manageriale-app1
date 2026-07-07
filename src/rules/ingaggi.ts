// Ingaggi e maggiorazioni — doc 02 §2.
// Ingaggio STD = ceil_to(FVM_M_congelato × 0,10; 0,50), minimo 0,50 €.
// L'ingaggio NON dipende dal prezzo d'acquisto e resta congelato per tutta la durata.

import { NotImplementedError } from './errors';
import type { ContractType } from './types';

/** Arrotonda per eccesso al multiplo di `step` (equivalente ARROTONDA.ECCESSO.MAT). */
export function ceilTo(value: number, step: number): number {
  void value; void step;
  throw new NotImplementedError('ceilTo');
}

/** Ingaggio STD annuo da FVM M congelato: 10%, eccesso a 0,50 €, min 0,50 €. */
export function ingaggioStd(fvmM: number): number {
  void fvmM;
  throw new NotImplementedError('ingaggioStd');
}

/**
 * Piano ingaggi per anno (€) dato tipo contratto e FVM M congelato.
 * Maggiorazioni doc 02 §2: Obbligo +15/+15/(+10 3° anno); Diritto +30/+30;
 * varianti invernali: anno 1 = ½ STD + stessa maggiorazione; vivaio fisso 0,50.
 */
export function pianoIngaggi(tipo: ContractType, fvmM: number): number[] {
  void tipo; void fvmM;
  throw new NotImplementedError('pianoIngaggi');
}
