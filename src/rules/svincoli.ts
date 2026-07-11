// Svincoli — matrice casistiche doc 02 §6.
// Incasso in crediti = FVM M più recente (salvo eccezioni: rescissione = 0, Osimhen Gate = crediti spesi).

import { bloccato, consentito, round2 } from './esito';
import type { CasoSvincolo, EsitoValidazione } from './types';

/** Incasso in crediti per il caso di svincolo dato (doc 02 §6). */
export function incassoSvincolo(
  caso: CasoSvincolo,
  ctx: { fvmRiferimento: number; creditiSpesi?: number }
): number {
  if (caso === 'rescissione') return 0; // rescissione unilaterale: incasso zero
  return ctx.fvmRiferimento;
}

/**
 * Ingaggi residui dovuti (€, per anno a partire dall'anno corrente) dopo lo svincolo.
 * Matrice doc 02 §6: gli anni già pagati non rientrano mai (non retroattività).
 */
export function ingaggioResiduoDovuto(
  caso: CasoSvincolo,
  ctx: { pianoAnnualeEur: number[]; annoCorrente: number }
): number[] {
  const { pianoAnnualeEur, annoCorrente } = ctx;
  const corrente = pianoAnnualeEur[annoCorrente - 1] ?? 0;
  const residui = pianoAnnualeEur.slice(annoCorrente - 1); // anno corrente incluso
  const futuri = pianoAnnualeEur.slice(annoCorrente); // solo anni successivi

  switch (caso) {
    case 'scadenza_estate':
    case 'diritto_non_esercitato':
    case 'vivaio_fine_stagione':
      return [];
    case 'scadenza_inverno':
      // in scadenza, svincolo invernale: resta il 50% dell'anno corrente
      return [round2(corrente / 2)];
    case 'diritto_inverno':
      // diritto svincolato in inverno: 100% fino a fine anno
      return [corrente];
    case 'obbligo_estate':
      // obbligo svincolato d'estate: 50%/anno per ogni anno residuo
      return residui.map((a) => round2(a / 2));
    case 'obbligo_inverno':
      // obbligo svincolato in inverno: 100% anno corrente + 50%/anno per anni residui
      return [corrente, ...futuri.map((a) => round2(a / 2))];
    case 'rescissione':
      // rescissione unilaterale: 100% per l'intera durata residua
      return residui;
    case 'asteriscato':
      // lo svincolo dell'asteriscato segue le regole della finestra in cui avviene:
      // la quota eventualmente dovuta è gestita dall'application layer
      return [];
  }
}

/**
 * Valore di svincolo nella transizione estiva (1 luglio → nuovo listone) — doc 02 §6:
 * presente → FVM nuovo listone (eventuale STIMA annullata);
 * assente con STIMA calcolata → STIMA;
 * depennato post pubblicazione → ultimo FVM disponibile.
 */
export function valoreSvincoloTransizioneEstiva(input: {
  presenteNuovoListone: boolean;
  fvmNuovoListone?: number;
  ultimoFvmDisponibile?: number;
  stimaCalcolata?: number;
}): number {
  if (input.presenteNuovoListone) {
    if (input.fvmNuovoListone === undefined) {
      throw new Error('valoreSvincoloTransizioneEstiva: fvmNuovoListone mancante');
    }
    return input.fvmNuovoListone; // invariante 9: presente nel listone → mai STIMA
  }
  if (input.stimaCalcolata !== undefined) return input.stimaCalcolata;
  if (input.ultimoFvmDisponibile !== undefined) return input.ultimoFvmDisponibile;
  throw new Error('valoreSvincoloTransizioneEstiva: nessun valore disponibile (serve STIMA o ultimo FVM)');
}

/** Rescissione unilaterale: vietata sul vivaio e sotto quota minima rosa; ok su asteriscati. */
export function validaRescissione(input: {
  slotKind: 'rosa' | 'vivaio';
  rosaSize: number;
  rosaMin: number;
  asteriscato?: boolean;
}): EsitoValidazione {
  if (input.slotKind === 'vivaio') {
    return bloccato('rescissione unilaterale non applicabile ai giocatori del vivaio');
  }
  if (input.rosaSize - 1 < input.rosaMin) {
    return bloccato(`rescissione vietata: la rosa scenderebbe sotto il minimo di ${input.rosaMin}`);
  }
  return consentito();
}
