// Svincoli — matrice casistiche doc 02 §6.
// Incasso in crediti = FVM M più recente (salvo eccezioni: rescissione = 0, Osimhen Gate = crediti spesi).

import { NotImplementedError } from './errors';
import type { CasoSvincolo, EsitoValidazione } from './types';

/** Incasso in crediti per il caso di svincolo dato. */
export function incassoSvincolo(
  caso: CasoSvincolo,
  ctx: { fvmRiferimento: number; creditiSpesi?: number }
): number {
  void caso; void ctx;
  throw new NotImplementedError('incassoSvincolo');
}

/**
 * Ingaggi residui dovuti (€, per anno a partire dall'anno corrente) dopo lo svincolo.
 * Es. obbligo estivo: 50%/anno per ogni anno residuo; rescissione: 100% per l'intera durata.
 */
export function ingaggioResiduoDovuto(
  caso: CasoSvincolo,
  ctx: { pianoAnnualeEur: number[]; annoCorrente: number }
): number[] {
  void caso; void ctx;
  throw new NotImplementedError('ingaggioResiduoDovuto');
}

/**
 * Valore di svincolo nella transizione estiva (1 luglio → nuovo listone):
 * presente → FVM nuovo listone; assente → STIMA; depennato post pubblicazione → ultimo FVM;
 * rientrato dopo STIMA → nuovo valore (STIMA annullata).
 */
export function valoreSvincoloTransizioneEstiva(input: {
  presenteNuovoListone: boolean;
  fvmNuovoListone?: number;
  ultimoFvmDisponibile?: number;
  stimaCalcolata?: number;
}): number {
  void input;
  throw new NotImplementedError('valoreSvincoloTransizioneEstiva');
}

/** Rescissione unilaterale: vietata sul vivaio, vietata sotto rosa minima; ok su asteriscati. */
export function validaRescissione(input: {
  slotKind: 'rosa' | 'vivaio';
  rosaSize: number;
  rosaMin: number;
  asteriscato?: boolean;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaRescissione');
}
