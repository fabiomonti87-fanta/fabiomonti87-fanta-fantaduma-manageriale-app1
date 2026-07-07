// Finestre mercato e ammortamento ingaggi — doc 02 §5.
// Ogni finestra ammortizza il 20% dell'ingaggio annuo; asta invernale e svincoli a metà anno = 50%.

import { NotImplementedError } from './errors';
import type { EsitoValidazione, OperationType } from './types';

/** Quota ingaggio già maturata dal cedente prima della finestra `ordinal` (0–100). */
export function quotaMaturataPct(ordinal: number): number {
  void ordinal;
  throw new NotImplementedError('quotaMaturataPct');
}

/**
 * Ripartizione ingaggio in uno scambio alla finestra `ordinal` (divisione standard):
 * il cedente si libera del residuo, il ricevente lo prende.
 */
export function ripartizioneScambio(ingaggioAnnuoEur: number, ordinal: number): {
  liberatoCedenteEur: number;
  caricoRiceventeEur: number;
} {
  void ingaggioAnnuoEur; void ordinal;
  throw new NotImplementedError('ripartizioneScambio');
}

/**
 * Divisione ingaggi concordata: valida che la quota trasferita al ricevente
 * non superi il residuo non maturato (non retroattività).
 */
export function validaDivisioneIngaggio(input: {
  finestraOrdinal: number;
  pctRicevente: number;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaDivisioneIngaggio');
}

/**
 * Valida un'operazione rispetto alla finestra corrente: fuori finestra tutto bloccato
 * (salvo sost_asteriscato e rettifica_admin); 5ª finestra solo scambi definitivi
 * senza conguagli, no prestiti, no acquisti/cessioni; prestito minimo 1 finestra.
 */
export function validaOperazioneInFinestra(input: {
  tipoOperazione: OperationType;
  finestraOrdinal: number | null; // null = nessuna finestra aperta
  conConguaglio?: boolean;
  durataPrestitoFinestre?: number;
}): EsitoValidazione {
  void input;
  throw new NotImplementedError('validaOperazioneInFinestra');
}
