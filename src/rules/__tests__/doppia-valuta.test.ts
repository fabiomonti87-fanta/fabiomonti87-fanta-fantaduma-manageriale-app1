// Doppia valuta — doc 02 §1. TC dal file 09_Test_Cases_Regole_v2.xlsx.
import { describe, it } from 'vitest';
import { richiedeApplicationLayer } from './helpers';

describe('Doppia valuta (§1)', () => {
  it('TC-001 [Must] crediti ed euro mai mescolati: ogni movimento in un solo ledger, nessuna conversione', () => {
    richiedeApplicationLayer('TC-001');
  });

  it('TC-002 [Must] acquisto a 80 crediti scala solo il budget crediti (500→420), contabilità euro invariata', () => {
    richiedeApplicationLayer('TC-002');
  });
});
