// Aste — doc 02 §10.
import { describe, expect, it } from 'vitest';
import { baseAsta } from '../aste';
import { richiedeApplicationLayer } from './helpers';

describe('Aste (§10)', () => {
  it("TC-070 [Must] base asta invernale = FVM M del giorno d'asta (34, non 1)", () => {
    expect(baseAsta('asta_riparazione', { fvmGiornoAsta: 34 })).toBe(34);
  });

  it('TC-071 [Should] base asta estiva = 1 credito', () => {
    expect(baseAsta('asta_estiva')).toBe(1);
  });

  it("TC-072 [Should] FVM congelato il giorno dell'asta: i contratti post-asta usano lo snapshot del giorno d'asta", () => {
    richiedeApplicationLayer('TC-072');
  });
});
