// Salary cap — doc 02 §3.
import { describe, expect, it } from 'vitest';
import { baseCapEur, checkSalaryCap } from '../validators';
import { ADMIN, creaLega } from './fixtures';

describe('Salary cap (§3)', () => {
  it('TC-015 [Must] BLOCCO hard a 250 €: 245 + 6 = 251 → bloccato', () => {
    const esito = checkSalaryCap({ monteAttualeEur: 245, deltaNettoEur: 6, capEur: 250 });
    expect(esito.ok).toBe(false);
  });

  it('TC-016 [Must] cap esattamente a 250 € consentito: 244 + 6 = 250 → ok', () => {
    const esito = checkSalaryCap({ monteAttualeEur: 244, deltaNettoEur: 6, capEur: 250 });
    expect(esito.ok).toBe(true);
  });

  it('TC-017 [Must] BLOCCO valutazione atomica: cede 5, riceve 20 a quota 240 → netto 255 → bloccato', () => {
    // Il cap si valuta sul risultato netto dell'operazione: nessun superamento temporaneo.
    const esito = checkSalaryCap({ monteAttualeEur: 240, deltaNettoEur: 15, capEur: 250 });
    expect(esito.ok).toBe(false);
  });

  it('TC-018 [Must] quota iscrizione e multe fuori dal cap: base = 250 € (non 340)', () => {
    expect(baseCapEur({ ingaggiEur: 250, quotaIscrizioneEur: 50, multeEur: 40 })).toBe(250);
  });

  it('TC-019 [Should] rientro forzato post-asta: incasso = valore acquisto in crediti, senza plus/minusvalenze', () => {
    // Giocatore pagato 60 crediti; il FVM nel frattempo è salito a 90.
    const lega = creaLega({
      contratti: [{ giocatore: 'Y', squadra: 'A', tipo: 'standard', prezzoCrediti: 60 }],
    });
    lega.aggiungiSnapshot('Y', 90, '2026-08-21');
    const budgetPrima = lega.budget('A');

    const incasso = lega.svincoloRientroCap('Y', ADMIN);

    expect(incasso).toBe(60); // valore di acquisto, NON il FVM 90: nessuna plusvalenza
    expect(lega.budget('A')).toBe(budgetPrima + 60);
    const mov = lega.movimentiCrediti.find((m) => m.causale === 'svincolo')!;
    expect(mov.importo).toBe(60);
    expect(mov.fvmSnapshotId).toBeUndefined(); // l'incasso non deriva da un FVM
  });
});
