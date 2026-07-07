// Multe e contabilità euro — doc 02 §11.
import { describe, expect, it } from 'vitest';
import { montepremi, multaMancataFormazione, ripartizioneMontepremi } from '../multe';

describe('Multe e contabilità euro (§11)', () => {
  it('TC-073 [Must] multa mancata formazione giornata 12: 20 € (solo euro, crediti e cap invariati)', () => {
    expect(multaMancataFormazione(12, 38)).toBe(20);
  });

  it('TC-074 [Must] multa raddoppiata nelle ultime 5 giornate: giornata 34 di 38 → 40 €', () => {
    expect(multaMancataFormazione(34, 38)).toBe(40);
  });

  it('TC-075 [Should] montepremi = quote + monte ingaggi + multe; ripartizione 33/20/12/15/13/7%', () => {
    expect(montepremi({ quoteIscrizioneEur: 500, monteIngaggiTotaleEur: 2000, multeEur: 100 })).toBe(2600);
    expect(ripartizioneMontepremi(1000)).toEqual({
      campionato1: 330,
      campionato2: 200,
      campionato3: 120,
      sommaPunti: 150,
      vincitoreCoppa: 130,
      finalistaCoppa: 70,
    });
  });
});
