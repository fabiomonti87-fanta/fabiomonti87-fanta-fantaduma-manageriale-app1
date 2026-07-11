// Vivaio — doc 02 §9.
import { describe, expect, it } from 'vitest';
import { pianoIngaggi } from '../ingaggi';
import { incassoSvincolo } from '../svincoli';
import { ordineDraft, validaPickDraft, validaPromozioneVivaio, validaScambioVivaio } from '../vivaio';
import { creaLega } from './fixtures';

describe('Vivaio (§9)', () => {
  it('TC-060 [Must] BLOCCO eligibilità draft: solo giocatori nel filtro U21 di Fantacalcio.it', () => {
    const esito = validaPickDraft({
      under21AlGiornoDraft: false,
      fvmM: 12,
      budgetCrediti: 100,
      slotVivaioOccupati: 0,
      slotVivaioMax: 3,
      capOk: true,
    });
    expect(esito.ok).toBe(false);
  });

  it('TC-061 [Must] pick draft: costo = FVM M (12 crediti), richiede slot libero + crediti + cap ok', () => {
    const esito = validaPickDraft({
      under21AlGiornoDraft: true,
      fvmM: 12,
      budgetCrediti: 100,
      slotVivaioOccupati: 1,
      slotVivaioMax: 3,
      capOk: true,
    });
    expect(esito.ok).toBe(true);
  });

  it('TC-062 [Must] ordine draft inverso di classifica: ultimo sceglie per primo', () => {
    expect(ordineDraft(['Prima', 'Seconda', 'Terza', 'Ultima'])).toEqual(['Ultima', 'Terza', 'Seconda', 'Prima']);
  });

  it('TC-063 [Must] BLOCCO promozione in corso di stagione: solo a fine stagione', () => {
    expect(validaPromozioneVivaio({ fineStagione: false }).ok).toBe(false);
  });

  it('TC-064 [Must] promozione gratuita a fine stagione: 0 crediti, libera slot vivaio, occupa slot rosa', () => {
    const lega = creaLega({
      giocatori: [{ id: 'V1', nome: 'Vivaista', nascita: '2007-03-10' }],
      snapshots: [{ giocatore: 'V1', fvmM: 12, data: '2026-08-20' }],
      contratti: [{ giocatore: 'V1', squadra: 'A', tipo: 'vivaio' }],
    });
    const budgetPrima = lega.budget('A');
    expect(lega.voceRosaAttiva('V1')?.slot).toBe('vivaio');

    const esito = lega.rolloverStagione({ decisioniVivaio: { V1: 'promozione' } });

    expect(esito.promossi).toContain('V1');
    expect(lega.budget('A')).toBe(budgetPrima); // costo 0 crediti
    const voce = lega.voceRosaAttiva('V1')!;
    expect(voce.slot).toBe('rosa'); // occupa slot rosa
    expect(voce.stato).toBe('in_rosa');
    // lo slot vivaio è liberato (la vecchia voce è chiusa, non cancellata)
    expect(lega.rosa.filter((v) => v.giocatore === 'V1' && v.slot === 'vivaio' && !v.al)).toHaveLength(0);
  });

  it('TC-065 [Must] svincolo vivaio a fine stagione: incasso ultimo FVM M (22 crediti)', () => {
    expect(incassoSvincolo('vivaio_fine_stagione', { fvmRiferimento: 22 })).toBe(22);
  });

  it('TC-066 [Must] compimento 22 anni: al rollover scelta forzata promozione o svincolo', () => {
    // V2 compie 22 anni durante la stagione (fine stagione 2027-06-30)
    const lega = creaLega({
      giocatori: [{ id: 'V2', nome: 'Ventiduenne', nascita: '2005-01-15' }],
      snapshots: [{ giocatore: 'V2', fvmM: 22, data: '2026-08-20' }],
      contratti: [{ giocatore: 'V2', squadra: 'A', tipo: 'vivaio' }],
    });

    // senza decisione il rollover è bloccato: non può restare nel vivaio
    expect(() => lega.rolloverStagione()).toThrow(/promozione o svincolo/);

    // con la decisione il rollover procede (qui: svincolo, incasso ultimo FVM = 22)
    const budgetPrima = lega.budget('A');
    const esito = lega.rolloverStagione({ decisioniVivaio: { V2: 'svincolo' } });
    expect(esito.svincolati).toContain('V2');
    expect(lega.budget('A')).toBe(budgetPrima + 22);
    expect(lega.voceRosaAttiva('V2')).toBeUndefined();
  });

  it('TC-067 [Should] asteriscato nel vivaio: ingaggio 0,50 € resta a bilancio; svincolo a fine stagione = ultimo FVM', () => {
    expect(pianoIngaggi('vivaio', 45)).toEqual([0.5]);
    expect(incassoSvincolo('vivaio_fine_stagione', { fvmRiferimento: 18 })).toBe(18);
  });

  it('TC-068 [Should] scambio vivaio↔vivaio consentito con slot destinazione, budget e cap ok', () => {
    const esito = validaScambioVivaio({
      slotVivaioLiberiDestinazione: 1,
      budgetOk: true,
      capOk: true,
      destinazioneSlotKind: 'vivaio',
    });
    expect(esito.ok).toBe(true);
  });

  it('TC-069 [Must] BLOCCO vivaio in slot rosa (e viceversa): vivaio occupa solo slot vivaio', () => {
    const esito = validaScambioVivaio({
      slotVivaioLiberiDestinazione: 1,
      budgetOk: true,
      capOk: true,
      destinazioneSlotKind: 'rosa',
    });
    expect(esito.ok).toBe(false);
  });
});
