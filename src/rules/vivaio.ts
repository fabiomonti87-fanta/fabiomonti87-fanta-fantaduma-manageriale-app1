// Vivaio — doc 02 §9: 3 slot extra rosa, ingaggio fisso 0,50 €, U21 al draft,
// permanenza fino a 22 anni, promozione/svincolo solo a fine stagione.

import { NotImplementedError } from './errors';
import type { EsitoValidazione } from './types';

/** Ordine draft: inverso di classifica finale stagione precedente, a giri. */
export function ordineDraft(classificaFinale: string[]): string[] {
  void classificaFinale;
  throw new NotImplementedError('ordineDraft');
}

/** Pick draft: costo = FVM M; richiede slot vivaio libero, crediti sufficienti, cap ok, filtro U21. */
export function validaPickDraft(input: {
  under21AlGiornoDraft: boolean;
  fvmM: number;
  budgetCrediti: number;
  slotVivaioOccupati: number;
  slotVivaioMax: number;
  capOk: boolean;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaPickDraft');
}

/** Promozione in prima squadra: solo a fine stagione, gratuita. */
export function validaPromozioneVivaio(input: { fineStagione: boolean }): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaPromozioneVivaio');
}

/** Scambi vivaio: consentiti (anche con crediti) se slot vivaio destinazione, budget e cap ok. */
export function validaScambioVivaio(input: {
  slotVivaioLiberiDestinazione: number;
  budgetOk: boolean;
  capOk: boolean;
  destinazioneSlotKind: 'rosa' | 'vivaio';
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaScambioVivaio');
}
