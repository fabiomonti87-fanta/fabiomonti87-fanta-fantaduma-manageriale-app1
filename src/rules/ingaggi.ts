// Ingaggi e maggiorazioni — doc 02 §2.
// Ingaggio STD = ceil_to(FVM_M_congelato × 0,10; 0,50), minimo 0,50 €.
// L'ingaggio NON dipende dal prezzo d'acquisto e resta congelato per tutta la durata.

import { round2 } from './esito';
import type { ContractType } from './types';

/** Arrotonda per eccesso al multiplo di `step` (equivalente ARROTONDA.ECCESSO.MAT). */
export function ceilTo(value: number, step: number): number {
  if (step <= 0) throw new Error('ceilTo: step deve essere > 0');
  // epsilon per non arrotondare in su valori già multipli esatti (errori di floating point)
  const eps = 1e-9;
  return round2(Math.ceil(value / step - eps) * step);
}

/** Ingaggio STD annuo da FVM M congelato: 10%, eccesso a 0,50 €, min 0,50 €. */
export function ingaggioStd(fvmM: number): number {
  return Math.max(ceilTo(fvmM * 0.1, 0.5), 0.5);
}

/**
 * Specifica per tipo contratto (doc 02 §2): durata, maggiorazione % per anno,
 * primo anno dimezzato per i contratti invernali (½ STD + maggiorazione piena).
 */
const PIANI: Record<Exclude<ContractType, 'vivaio'>, { pct: number[]; mezzoAnno1: boolean }> = {
  standard: { pct: [0], mezzoAnno1: false },
  standard_inverno: { pct: [0], mezzoAnno1: true },
  diritto_1_1: { pct: [30, 30], mezzoAnno1: false },
  obbligo_1_1: { pct: [15, 15], mezzoAnno1: false },
  obbligo_1_2: { pct: [15, 15, 10], mezzoAnno1: false },
  inverno_obbligo_1_5: { pct: [15, 15], mezzoAnno1: true }, // Obbligo 0,5+1
  inverno_obbligo_2_5: { pct: [15, 15, 10], mezzoAnno1: true }, // Obbligo 0,5+2
  inverno_diritto_0_5_1: { pct: [30, 30], mezzoAnno1: true }, // Diritto 0,5+1
};

/**
 * Piano ingaggi per anno (€) dato tipo contratto e FVM M congelato.
 * Esempio regolamento (FVM 100): Obbligo 1+2 → 11,50/11,50/11,00;
 * Inverno Obbligo 0,5+2 → 6,50/11,50/11,00 (½ STD 5,00 + maggiorazione piena 1,50).
 * Vivaio: fisso 0,50 €/anno indipendente dal FVM M.
 */
export function pianoIngaggi(tipo: ContractType, fvmM: number): number[] {
  if (tipo === 'vivaio') return [0.5];
  const spec = PIANI[tipo];
  const std = ingaggioStd(fvmM);
  return spec.pct.map((pct, i) => {
    const base = i === 0 && spec.mezzoAnno1 ? std / 2 : std;
    return round2(base + std * (pct / 100));
  });
}
