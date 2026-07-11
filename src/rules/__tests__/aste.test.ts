// Aste — doc 02 §10.
import { describe, expect, it } from 'vitest';
import { baseAsta } from '../aste';
import { ADMIN, creaLega } from './fixtures';

describe('Aste (§10)', () => {
  it("TC-070 [Must] base asta invernale = FVM M del giorno d'asta (34, non 1)", () => {
    expect(baseAsta('asta_riparazione', { fvmGiornoAsta: 34 })).toBe(34);
  });

  it('TC-071 [Should] base asta estiva = 1 credito', () => {
    expect(baseAsta('asta_estiva')).toBe(1);
  });

  it("TC-072 [Should] FVM congelato il giorno dell'asta: i contratti post-asta usano lo snapshot del giorno d'asta", () => {
    // Import listone il giorno dell'asta (X fvm 100 al 20/08); acquisto in asta.
    const lega = creaLega({ oggi: '2026-08-20' });
    const op = lega.proponi({ tipo: 'asta', squadra: 'A', giocatore: 'X', prezzoCrediti: 80, contratto: 'obbligo_1_1' }, ADMIN);
    lega.convalida(op.id, ADMIN);

    // variazione FVM successiva all'asta
    lega.aggiungiSnapshot('X', 150, '2026-08-25');

    const contratto = lega.contrattoAttivo('X')!;
    expect(contratto.fvmCongelato).toBe(100); // snapshot del giorno d'asta, non 150
    expect(contratto.pianoIngaggiEur).toEqual([11.5, 11.5]); // ingaggi su base congelata
    expect(lega.snapshots.find((s) => s.id === contratto.fvmSnapshotId)?.data).toBe('2026-08-20');
  });
});
