// Finestre mercato e ammortamento ingaggi — doc 02 §5.
// Ogni finestra ammortizza il 20% dell'ingaggio annuo; asta invernale e svincoli a metà anno = 50%.

import { bloccato, consentito, round2 } from './esito';
import type { EsitoValidazione, OperationType } from './types';

/** Operazioni consentite anche fuori finestra (doc 02 §5, doc 01 §3.4). */
const ECCEZIONI_FUORI_FINESTRA: OperationType[] = ['sost_asteriscato', 'rettifica_admin', 'asteriscato'];

/** Quota ingaggio già maturata dal cedente prima della finestra `ordinal` (0–100). */
export function quotaMaturataPct(ordinal: number): number {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 5) {
    throw new Error(`quotaMaturataPct: finestra ${ordinal} non valida (1–5)`);
  }
  return (ordinal - 1) * 20;
}

/**
 * Ripartizione ingaggio in uno scambio alla finestra `ordinal` (divisione standard):
 * il cedente si libera del residuo non maturato, il ricevente lo prende.
 * Esempio regolamento: 3ª finestra, ingaggio 10 € → 40% maturato, 6 € trasferiti.
 */
export function ripartizioneScambio(ingaggioAnnuoEur: number, ordinal: number): {
  liberatoCedenteEur: number;
  caricoRiceventeEur: number;
} {
  const residuo = round2(ingaggioAnnuoEur * (100 - quotaMaturataPct(ordinal)) / 100);
  return { liberatoCedenteEur: residuo, caricoRiceventeEur: residuo };
}

/**
 * Divisione ingaggi concordata: la quota trasferita al ricevente non può superare
 * il residuo non maturato (non retroattività: la quota già pagata resta al cedente).
 */
export function validaDivisioneIngaggio(input: {
  finestraOrdinal: number;
  pctRicevente: number;
}): EsitoValidazione {
  const residuoPct = 100 - quotaMaturataPct(input.finestraOrdinal);
  if (input.pctRicevente < 0) {
    return bloccato('divisione ingaggio: percentuale negativa non valida');
  }
  if (input.pctRicevente > residuoPct) {
    return bloccato(
      `divisione ingaggio retroattiva: in finestra ${input.finestraOrdinal} il residuo trasferibile è ${residuoPct}%, richiesto ${input.pctRicevente}%`
    );
  }
  return consentito();
}

/**
 * Valida un'operazione rispetto alla finestra corrente:
 * - fuori finestra tutto bloccato salvo sost_asteriscato / rettifica_admin / marcatura asteriscato;
 * - 5ª finestra: SOLO scambi a titolo definitivo senza conguagli (no prestiti, no acquisti/cessioni);
 * - prestiti: durata minima una finestra di mercato.
 */
export function validaOperazioneInFinestra(input: {
  tipoOperazione: OperationType;
  finestraOrdinal: number | null; // null = nessuna finestra aperta
  conConguaglio?: boolean;
  durataPrestitoFinestre?: number;
}): EsitoValidazione {
  const { tipoOperazione, finestraOrdinal, conConguaglio, durataPrestitoFinestre } = input;

  if (ECCEZIONI_FUORI_FINESTRA.includes(tipoOperazione)) return consentito();

  if (finestraOrdinal === null) {
    return bloccato(`operazione ${tipoOperazione} fuori finestra di mercato`);
  }

  if (finestraOrdinal === 5) {
    // 5ª finestra: solo scambi definitivi (registrati come cessioni a titolo definitivo) senza conguagli
    if (tipoOperazione !== 'cessione_definitiva') {
      return bloccato(`5ª finestra: ${tipoOperazione} non consentita (solo scambi a titolo definitivo)`);
    }
    if (conConguaglio) {
      return bloccato('5ª finestra: conguagli in crediti non consentiti');
    }
    return consentito();
  }

  // Nelle finestre 1–4 i conguagli in crediti sono ammessi.

  if (
    (tipoOperazione === 'prestito_in' || tipoOperazione === 'prestito_out') &&
    durataPrestitoFinestre !== undefined &&
    durataPrestitoFinestre < 1
  ) {
    return bloccato('prestito: durata minima una finestra di mercato');
  }

  return consentito();
}
