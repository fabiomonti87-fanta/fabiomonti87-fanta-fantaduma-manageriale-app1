// Slot pluriennali e limiti rosa — doc 02 §4.
import { describe, expect, it } from 'vitest';
import { checkRosa, checkSlotPluriennali, checkVivaio } from '../validators';
import { richiedeApplicationLayer } from './helpers';

describe('Slot e rosa (§4)', () => {
  it("TC-020 [Must] BLOCCO 12° pluriennale prima dell'asta invernale (max 11)", () => {
    const esito = checkSlotPluriennali({ attivi: 11, deltaNetto: 1, postAstaInvernale: false });
    expect(esito.ok).toBe(false);
  });

  it('TC-021 [Must] 12° slot disponibile post asta invernale', () => {
    const esito = checkSlotPluriennali({ attivi: 11, deltaNetto: 1, postAstaInvernale: true });
    expect(esito.ok).toBe(true);
  });

  it('TC-022 [Must] rollover: slot tornano 11, squadre a 12 segnalate fuori parametro', () => {
    richiedeApplicationLayer('TC-022');
  });

  it('TC-023 [Must] scambio 1↔1 di pluriennali con 11 attivi: netto 11 → consentito (atomico)', () => {
    const esito = checkSlotPluriennali({ attivi: 11, deltaNetto: 0, postAstaInvernale: false });
    expect(esito.ok).toBe(true);
  });

  it('TC-024 [Must] nessun sub-limite obblighi: 9° Obbligo consentito se ci sono slot pluriennali', () => {
    // Il "max 2 obblighi" era solo nell'Analisi V3 (ignorata): vale solo il limite slot pluriennali.
    const esito = checkSlotPluriennali({ attivi: 8, deltaNetto: 1, postAstaInvernale: false });
    expect(esito.ok).toBe(true);
  });

  it('TC-025 [Must] BLOCCO rosa minima 23: svincolo/rescissione a quota 23 bloccati', () => {
    const esito = checkRosa({ size: 23, deltaNetto: -1, portieri: 3, deltaPortieri: 0, rosaMin: 23, rosaMax: 30 });
    expect(esito.ok).toBe(false);
  });

  it('TC-026 [Must] BLOCCO rosa massima 30: acquisto a quota 30 bloccato', () => {
    const esito = checkRosa({ size: 30, deltaNetto: 1, portieri: 3, deltaPortieri: 0, rosaMin: 23, rosaMax: 30 });
    expect(esito.ok).toBe(false);
  });

  it('TC-027 [Must] BLOCCO minimo 2 portieri: svincolo di un portiere con 2 in rosa bloccato', () => {
    const esito = checkRosa({ size: 25, deltaNetto: -1, portieri: 2, deltaPortieri: -1, rosaMin: 23, rosaMax: 30 });
    expect(esito.ok).toBe(false);
  });

  it('TC-028 [Must] BLOCCO max 3 slot vivaio: 4° ingresso bloccato in qualsiasi momento', () => {
    const esito = checkVivaio({ occupati: 3, deltaNetto: 1, max: 3 });
    expect(esito.ok).toBe(false);
  });

  it('TC-029 [Must] INVARIANTE vivaio extra rosa: 30 in rosa + 3 vivaio è configurazione valida', () => {
    expect(checkRosa({ size: 30, deltaNetto: 0, portieri: 3, deltaPortieri: 0, rosaMin: 23, rosaMax: 30 }).ok).toBe(true);
    expect(checkVivaio({ occupati: 3, deltaNetto: 0, max: 3 }).ok).toBe(true);
  });
});
