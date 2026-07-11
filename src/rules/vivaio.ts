// Vivaio — doc 02 §9: 3 slot extra rosa, ingaggio fisso 0,50 €, U21 al draft,
// permanenza fino a 22 anni, promozione/svincolo solo a fine stagione.

import { bloccato, consentito } from './esito';
import type { EsitoValidazione } from './types';

/** Ordine draft: inverso di classifica finale stagione precedente (l'ultimo sceglie per primo). */
export function ordineDraft(classificaFinale: string[]): string[] {
  return [...classificaFinale].reverse();
}

/** Pick draft: costo = FVM M; richiede filtro U21, slot vivaio libero, crediti sufficienti, cap ok. */
export function validaPickDraft(input: {
  under21AlGiornoDraft: boolean;
  fvmM: number;
  budgetCrediti: number;
  slotVivaioOccupati: number;
  slotVivaioMax: number;
  capOk: boolean;
}): EsitoValidazione {
  const violazioni: string[] = [];
  if (!input.under21AlGiornoDraft) {
    violazioni.push('giocatore fuori dal filtro under 21 di Fantacalcio.it al giorno del draft');
  }
  if (input.slotVivaioOccupati >= input.slotVivaioMax) {
    violazioni.push(`slot vivaio esauriti (${input.slotVivaioOccupati}/${input.slotVivaioMax})`);
  }
  if (input.budgetCrediti < input.fvmM) {
    violazioni.push(`crediti insufficienti: pick a ${input.fvmM}, budget ${input.budgetCrediti}`);
  }
  if (!input.capOk) {
    violazioni.push('salary cap violato');
  }
  return violazioni.length > 0 ? bloccato(...violazioni) : consentito();
}

/** Promozione in prima squadra: solo a fine stagione, gratuita. */
export function validaPromozioneVivaio(input: { fineStagione: boolean }): EsitoValidazione {
  if (!input.fineStagione) {
    return bloccato('promozione dal vivaio consentita solo a fine stagione');
  }
  return consentito();
}

/** Scambi vivaio: consentiti (anche con crediti) se slot vivaio destinazione, budget e cap ok. */
export function validaScambioVivaio(input: {
  slotVivaioLiberiDestinazione: number;
  budgetOk: boolean;
  capOk: boolean;
  destinazioneSlotKind: 'rosa' | 'vivaio';
}): EsitoValidazione {
  const violazioni: string[] = [];
  if (input.destinazioneSlotKind !== 'vivaio') {
    violazioni.push('un giocatore del vivaio può occupare solo slot vivaio (mai slot rosa)');
  }
  if (input.slotVivaioLiberiDestinazione < 1) {
    violazioni.push('nessuno slot vivaio libero nella squadra di destinazione');
  }
  if (!input.budgetOk) violazioni.push('budget crediti insufficiente');
  if (!input.capOk) violazioni.push('salary cap violato');
  return violazioni.length > 0 ? bloccato(...violazioni) : consentito();
}
