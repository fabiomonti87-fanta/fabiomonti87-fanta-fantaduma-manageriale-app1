// Doppia valuta — doc 02 §1. Test d'integrazione sull'application layer.
import { describe, expect, it } from 'vitest';
import { ADMIN, PRES_A, creaLega } from './fixtures';

describe('Doppia valuta (§1)', () => {
  it('TC-001 [Must] crediti ed euro mai mescolati: ogni movimento in un solo ledger, nessuna conversione', () => {
    const lega = creaLega({
      contratti: [{ giocatore: 'Y', squadra: 'B', tipo: 'standard', prezzoCrediti: 30 }],
    });

    // acquisto
    const acquisto = lega.proponi({ tipo: 'asta', squadra: 'A', giocatore: 'X', prezzoCrediti: 80, contratto: 'standard' }, ADMIN);
    lega.convalida(acquisto.id, ADMIN);
    // svincolo
    lega.apriFinestra(3);
    const svincolo = lega.proponi({ tipo: 'svincolo', squadra: 'B', giocatore: 'Y', caso: 'scadenza_inverno' }, ADMIN);
    lega.convalida(svincolo.id, ADMIN);
    // scambio (dopo l'acquisto X è di A; W seminato a B)
    const lega2 = creaLega({
      contratti: [
        { giocatore: 'X', squadra: 'A', tipo: 'standard', prezzoCrediti: 80 },
        { giocatore: 'W', squadra: 'B', tipo: 'standard', prezzoCrediti: 20 },
      ],
    });
    lega2.apriFinestra(1);
    const scambio = lega2.proponi({ tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['W'] }, PRES_A);
    lega2.convalida(scambio.id, ADMIN);
    // multa (solo euro)
    lega2.registraMulta('A', 12, 38, ADMIN);

    for (const l of [lega, lega2]) {
      // ledger crediti: solo causali di mercato in crediti, mai valori "euro"
      const causaliCrediti = new Set(l.movimentiCrediti.map((m) => m.causale));
      const causaliEuro = new Set(l.movimentiEuro.map((m) => m.causale));
      for (const c of causaliCrediti) expect(['saldo_iniziale', 'acquisto', 'cessione', 'svincolo', 'conguaglio', 'rettifica']).toContain(c);
      for (const c of causaliEuro) expect(['quota_iscrizione', 'ingaggio', 'multa', 'premio', 'rettifica']).toContain(c);
      // nessuna scrittura incrociata: le causali dei due ledger non si sovrappongono mai
      const causaliMercato = ['acquisto', 'cessione', 'svincolo', 'conguaglio', 'saldo_iniziale'];
      for (const c of causaliEuro) expect(causaliMercato).not.toContain(c);
      // nessuna causale di conversione esiste
      expect([...causaliCrediti, ...causaliEuro]).not.toContain('conversione');
    }
    // la multa non ha toccato i crediti
    expect(lega2.budget('A')).toBe(500);
  });

  it('TC-002 [Must] acquisto a 80 crediti scala solo il budget crediti (500→420), contabilità euro invariata', () => {
    const lega = creaLega();
    const op = lega.proponi({ tipo: 'asta', squadra: 'A', giocatore: 'X', prezzoCrediti: 80, contratto: 'standard' }, ADMIN);
    lega.convalida(op.id, ADMIN);

    expect(lega.budget('A')).toBe(420);
    // contabilità euro: SOLO il nuovo ingaggio a bilancio (10 € = STD di FVM 100), nient'altro
    const euroA = lega.movimentiEuro.filter((m) => m.squadra === 'A');
    expect(euroA).toHaveLength(1);
    expect(euroA[0].causale).toBe('ingaggio');
    expect(euroA[0].importoEur).toBe(10);
    expect(lega.monteIngaggi('A')).toBe(10);
  });
});
