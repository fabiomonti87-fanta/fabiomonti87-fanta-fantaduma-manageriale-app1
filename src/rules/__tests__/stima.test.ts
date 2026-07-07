// Formula STIMA — doc 02 §7.
import { describe, expect, it } from 'vitest';
import { stima } from '../stima';
import { valoreSvincoloTransizioneEstiva } from '../svincoli';

describe('STIMA (§7)', () => {
  it('TC-049 [Must] formula STIMA (esempio regolamento Osimhen): 180×0,49 + 350×0,44', () => {
    // NOTA: la formula dà 242,20; il regolamento e il TC riportano "242".
    // Probabile troncamento nell'esempio — da confermare con Fabio se si arrotonda
    // (annotato in 00_Stato_Progettazione come da prassi sui casi non coperti).
    expect(stima(180, 350)).toBeCloseTo(242.2, 2);
  });

  it('TC-050 [Must] STIMA per arrivato a gennaio: "inizio" = primo valore ufficiale → 25×0,49 + 60×0,44 = 38,65', () => {
    expect(stima(25, 60)).toBeCloseTo(38.65, 2);
  });

  it('TC-051 [Must] rientro in listone annulla la STIMA: vale il nuovo valore (200, non 242)', () => {
    const valore = valoreSvincoloTransizioneEstiva({
      presenteNuovoListone: true,
      fvmNuovoListone: 200,
      stimaCalcolata: 242,
    });
    expect(valore).toBe(200);
  });

  it('TC-052 [Should] BLOCCO STIMA per presenti nel listone: si usa il FVM M del listone (invariante 9)', () => {
    const valore = valoreSvincoloTransizioneEstiva({
      presenteNuovoListone: true,
      fvmNuovoListone: 60,
      stimaCalcolata: 999,
    });
    expect(valore).toBe(60);
  });
});
