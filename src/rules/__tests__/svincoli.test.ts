// Svincoli — matrice casistiche doc 02 §6.
import { describe, expect, it } from 'vitest';
import {
  incassoSvincolo,
  ingaggioResiduoDovuto,
  valoreSvincoloTransizioneEstiva,
  validaRescissione,
} from '../svincoli';
import { richiedeApplicationLayer } from './helpers';

describe('Svincoli (§6)', () => {
  it('TC-038 [Must] STD in scadenza, estate: incasso FVM nuovo listone (42), nessun ingaggio residuo', () => {
    expect(incassoSvincolo('scadenza_estate', { fvmRiferimento: 42 })).toBe(42);
    expect(ingaggioResiduoDovuto('scadenza_estate', { pianoAnnualeEur: [8], annoCorrente: 1 })).toEqual([]);
  });

  it('TC-039 [Must] svincolo invernale in scadenza: incasso FVM attuale (30), resta il 50% dell anno (4 € su 8)', () => {
    expect(incassoSvincolo('scadenza_inverno', { fvmRiferimento: 30 })).toBe(30);
    expect(ingaggioResiduoDovuto('scadenza_inverno', { pianoAnnualeEur: [8], annoCorrente: 1 })).toEqual([4]);
  });

  it('TC-040 [Must] diritto non esercitato (estate): incasso 55, nessun ingaggio ulteriore', () => {
    expect(incassoSvincolo('diritto_non_esercitato', { fvmRiferimento: 55 })).toBe(55);
    expect(ingaggioResiduoDovuto('diritto_non_esercitato', { pianoAnnualeEur: [13, 13], annoCorrente: 1 })).toEqual([]);
  });

  it('TC-041 [Must] diritto svincolato in inverno: incasso FVM attuale, ingaggio dovuto al 100% (13 €) fino a fine anno', () => {
    expect(incassoSvincolo('diritto_inverno', { fvmRiferimento: 40 })).toBe(40);
    expect(ingaggioResiduoDovuto('diritto_inverno', { pianoAnnualeEur: [13, 13], annoCorrente: 1 })).toEqual([13]);
  });

  it('TC-042 [Must] obbligo svincolato in estate dopo anno 1 (1+2): dovuti 5,75 + 5,50 € (50% anni residui)', () => {
    expect(incassoSvincolo('obbligo_estate', { fvmRiferimento: 60 })).toBe(60);
    expect(ingaggioResiduoDovuto('obbligo_estate', { pianoAnnualeEur: [11.5, 11.5, 11], annoCorrente: 2 })).toEqual([5.75, 5.5]);
  });

  it('TC-043 [Must] obbligo svincolato in inverno (1+1, anno 1): 100% anno corrente (11,50) + 50% residuo (5,75)', () => {
    expect(ingaggioResiduoDovuto('obbligo_inverno', { pianoAnnualeEur: [11.5, 11.5], annoCorrente: 1 })).toEqual([11.5, 5.75]);
  });

  it('TC-044 [Must] rescissione unilaterale: incasso 0, dovuto il 100% di tutti gli anni (34 € su Obbligo 1+2)', () => {
    expect(incassoSvincolo('rescissione', { fvmRiferimento: 60 })).toBe(0);
    const residui = ingaggioResiduoDovuto('rescissione', { pianoAnnualeEur: [11.5, 11.5, 11], annoCorrente: 1 });
    expect(residui).toEqual([11.5, 11.5, 11]);
    expect(residui.reduce((a, b) => a + b, 0)).toBe(34);
  });

  it('TC-045 [Must] BLOCCO rescissione sul vivaio', () => {
    const esito = validaRescissione({ slotKind: 'vivaio', rosaSize: 25, rosaMin: 23 });
    expect(esito.ok).toBe(false);
  });

  it('TC-046 [Should] rescissione applicabile ad asteriscato, stesse conseguenze economiche', () => {
    const esito = validaRescissione({ slotKind: 'rosa', rosaSize: 25, rosaMin: 23, asteriscato: true });
    expect(esito.ok).toBe(true);
  });

  it('TC-047 [Must] transizione estiva, presente nel nuovo listone: incasso 60 subito o 70 a fine mercato (snapshot per data)', () => {
    richiedeApplicationLayer('TC-047'); // richiede selezione snapshot FVM per data
  });

  it('TC-048 [Must] depennato post pubblicazione listone: incasso = ultimo FVM disponibile (45)', () => {
    expect(valoreSvincoloTransizioneEstiva({ presenteNuovoListone: false, ultimoFvmDisponibile: 45 })).toBe(45);
  });
});
