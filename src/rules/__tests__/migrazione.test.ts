// Migrazione — doc 03, Sprint 2. Quadratura automatica sul GESTIONALE_UFFICIALE reale.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGestionale } from '../../migration/parser';
import { quadratura } from '../../migration/quadratura';

const FILE_GESTIONALE = path.join(process.cwd(), 'data', 'GESTIONALE_UFFICIALE.xlsx');

describe('Migrazione (doc 03)', () => {
  it('TC-084 [Must] quadratura post-import: budget, monte ingaggi e slot identici al foglio per tutte le 10 squadre', () => {
    if (!existsSync(FILE_GESTIONALE)) {
      throw new Error(`file gestionale mancante: ${FILE_GESTIONALE} — servono i dati reali per la quadratura (Sprint 2)`);
    }
    const dataset = parseGestionale(FILE_GESTIONALE);
    const report = quadratura(dataset);

    expect(report.righe).toHaveLength(10);
    expect(Object.fromEntries(report.righe.map((r) => [r.squadra, r.budgetFoglio]))).toEqual({
      'AS Intomatici': 2,
      'Bimbe di Tonali': 48,
      Ceretolo: 3,
      Darmian: 21,
      Iperzola: 25,
      Molino: 182,
      Nirvana: 121,
      Seven: 51,
      Werder: 47,
      Woods: 55,
    });
    for (const riga of report.righe) {
      expect.soft(riga, `${riga.squadra}: budget`).toHaveProperty('budgetApp', riga.budgetFoglio);
      expect.soft(riga, `${riga.squadra}: monte ingaggi`).toHaveProperty('monteApp', riga.monteFoglio);
      expect.soft(riga, `${riga.squadra}: slot pluriennali`).toHaveProperty('slotApp', riga.slotFoglio);
      expect.soft(riga, `${riga.squadra}: rosa`).toHaveProperty('rosaApp', riga.rosaFoglio);
      expect.soft(riga, `${riga.squadra}: vivaio`).toHaveProperty('vivaioApp', riga.vivaioFoglio);
    }
    expect(report.quadra).toBe(true);
    expect(report.violazioniRegole).toEqual([]);
    // somma crediti lega coerente col ledger (invariante 3)
    expect(report.totaleCreditiLega).toBe(report.righe.reduce((a, r) => a + r.budgetApp, 0));
  });
});
