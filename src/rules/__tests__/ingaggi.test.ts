// Ingaggi e maggiorazioni — doc 02 §2.
import { describe, expect, it } from 'vitest';
import { ingaggioStd, pianoIngaggi } from '../ingaggi';
import { validaNuovoContratto } from '../validators';

describe('Ingaggi (§2)', () => {
  it('TC-003 [Must] ingaggio STD da FVM M 155 = 15,50 € (esempio regolamento)', () => {
    expect(ingaggioStd(155)).toBe(15.5);
  });

  it('TC-004 [Must] arrotondamento per eccesso: FVM 151 → 15,50 €', () => {
    expect(ingaggioStd(151)).toBe(15.5);
  });

  it('TC-005 [Must] nessun arrotondamento se già multiplo di 0,50: FVM 150 → 15,00 €', () => {
    expect(ingaggioStd(150)).toBe(15);
  });

  it('TC-006 [Must] minimo salariale: FVM 3 → 0,50 € (non 0,30)', () => {
    expect(ingaggioStd(3)).toBe(0.5);
  });

  it("TC-007 [Must] ingaggio indipendente dal prezzo d'asta: FVM 100 pagato 250 crediti → 10,00 €", () => {
    // Il prezzo in crediti non entra nel calcolo: l'ingaggio dipende solo dal FVM M congelato.
    expect(ingaggioStd(100)).toBe(10);
  });

  it('TC-008 [Must] Obbligo 1+1: FVM 100 → 11,50 / 11,50 € (+15%/+15%)', () => {
    expect(pianoIngaggi('obbligo_1_1', 100)).toEqual([11.5, 11.5]);
  });

  it('TC-009 [Must] Obbligo 1+2: terzo anno al 10% → 11,50 / 11,50 / 11,00 €', () => {
    expect(pianoIngaggi('obbligo_1_2', 100)).toEqual([11.5, 11.5, 11]);
  });

  it('TC-010 [Must] Diritto 1+1: +30% → 13,00 € anno 1; 13,00 € anno 2 se riscattato', () => {
    expect(pianoIngaggi('diritto_1_1', 100)).toEqual([13, 13]);
  });

  it('TC-011 [Must] contratto invernale Obbligo 0,5+2: anno 1 dimezzato → 6,50 / 11,50 / 11,00 €', () => {
    expect(pianoIngaggi('inverno_obbligo_2_5', 100)).toEqual([6.5, 11.5, 11]);
  });

  it('TC-012 [Must] FVM congelato per tutta la durata: anno 2 resta 11,50 € anche se il FVM sale a 180', () => {
    // La base è il FVM congelato all'asta (100), mai il FVM corrente.
    expect(pianoIngaggi('obbligo_1_1', 100)[1]).toBe(11.5);
  });

  it('TC-013 [Must] vivaio: ingaggio fisso 0,50 €/anno indipendente dal FVM M (45)', () => {
    expect(pianoIngaggi('vivaio', 45)).toEqual([0.5]);
  });

  it('TC-014 [Must] BLOCCO: contratto solo da lista svincolati, non si cambia contratto a chi ne ha già uno', () => {
    const esito = validaNuovoContratto({ giocatoreGiaSottoContratto: true });
    expect(esito.ok).toBe(false);
  });
});
