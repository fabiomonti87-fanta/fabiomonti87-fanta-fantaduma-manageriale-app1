// Finestre mercato e ammortamento ingaggi — doc 02 §5.
import { describe, expect, it } from 'vitest';
import { ripartizioneScambio, validaDivisioneIngaggio, validaOperazioneInFinestra } from '../finestre';
import { pianoIngaggi } from '../ingaggi';

describe('Finestre e ammortamento (§5)', () => {
  it('TC-030 [Must] scambio in 3ª finestra (esempio regolamento): X ingaggio 10 € → cedente libera 6, ricevente prende 6', () => {
    // 2 finestre già maturate = 40%; residuo 60%.
    expect(ripartizioneScambio(10, 3)).toEqual({ liberatoCedenteEur: 6, caricoRiceventeEur: 6 });
    // Y ingaggio 5 €: B si libera di 3 e A prende 3.
    expect(ripartizioneScambio(5, 3)).toEqual({ liberatoCedenteEur: 3, caricoRiceventeEur: 3 });
  });

  it('TC-031 [Must] scambio in 1ª finestra: nessun ammortamento maturato, si trasferisce il 100%', () => {
    expect(ripartizioneScambio(10, 1)).toEqual({ liberatoCedenteEur: 10, caricoRiceventeEur: 10 });
  });

  it('TC-032 [Should] divisione ingaggi concordata: ricevente prende il 40% (≤ residuo 60%) → consentito', () => {
    const esito = validaDivisioneIngaggio({ finestraOrdinal: 3, pctRicevente: 40 });
    expect(esito.ok).toBe(true);
  });

  it('TC-033 [Must] BLOCCO divisione non retroattiva: trasferire più del 60% residuo in 3ª finestra è vietato', () => {
    const esito = validaDivisioneIngaggio({ finestraOrdinal: 3, pctRicevente: 70 });
    expect(esito.ok).toBe(false);
  });

  it('TC-034 [Must] acquisto asta invernale: 50% ingaggio a bilancio (FVM 100, Standard inverno → 5,00 €)', () => {
    expect(pianoIngaggi('standard_inverno', 100)[0]).toBe(5);
  });

  it('TC-035 [Must] BLOCCO 5ª finestra: prestiti, conguagli e acquisti/cessioni vietati; solo scambi definitivi', () => {
    expect(validaOperazioneInFinestra({ tipoOperazione: 'prestito_in', finestraOrdinal: 5 }).ok).toBe(false);
    expect(validaOperazioneInFinestra({ tipoOperazione: 'cessione_definitiva', finestraOrdinal: 5, conConguaglio: true }).ok).toBe(false);
    expect(validaOperazioneInFinestra({ tipoOperazione: 'acquisto_definitivo', finestraOrdinal: 5 }).ok).toBe(false);
  });

  it('TC-036 [Must] BLOCCO operazioni fuori finestra (salvo sostituzione asteriscato e rettifica admin)', () => {
    expect(validaOperazioneInFinestra({ tipoOperazione: 'cessione_definitiva', finestraOrdinal: null }).ok).toBe(false);
    expect(validaOperazioneInFinestra({ tipoOperazione: 'sost_asteriscato', finestraOrdinal: null }).ok).toBe(true);
    expect(validaOperazioneInFinestra({ tipoOperazione: 'rettifica_admin', finestraOrdinal: null }).ok).toBe(true);
  });

  it('TC-037 [Should] BLOCCO prestito con durata inferiore a una finestra di mercato', () => {
    const esito = validaOperazioneInFinestra({
      tipoOperazione: 'prestito_out',
      finestraOrdinal: 2,
      durataPrestitoFinestre: 0,
    });
    expect(esito.ok).toBe(false);
  });
});
