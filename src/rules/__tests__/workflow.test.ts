// Workflow e invarianti — doc 02 §12. Test d'integrazione sull'application layer.
import { describe, expect, it } from 'vitest';
import { ADMIN, PRES_A, creaLega } from './fixtures';

/** Lega con X in rosa ad A (ingaggio 10) e Y in rosa a B (ingaggio 5), 3ª finestra aperta. */
function legaConScambioPronto() {
  const lega = creaLega({
    contratti: [
      { giocatore: 'X', squadra: 'A', tipo: 'standard', prezzoCrediti: 80 },
      { giocatore: 'Y', squadra: 'B', tipo: 'standard', prezzoCrediti: 30 },
    ],
  });
  lega.apriFinestra(3);
  return lega;
}

describe('Workflow e invarianti (§12)', () => {
  it('TC-076 [Must] proposta pendente non tocca i saldi (invariante 10)', () => {
    const lega = legaConScambioPronto();
    const budgetA = lega.budget('A');
    const monteA = lega.monteIngaggi('A');
    const rosaA = lega.rosa.filter((v) => v.squadra === 'A' && !v.al).length;

    lega.proponi(
      { tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['Y'] },
      PRES_A
    );

    expect(lega.budget('A')).toBe(budgetA);
    expect(lega.monteIngaggi('A')).toBe(monteA);
    expect(lega.rosa.filter((v) => v.squadra === 'A' && !v.al).length).toBe(rosaA);
    expect(lega.contrattoAttivo('X')?.squadra).toBe('A');
  });

  it('TC-077 [Must] convalida applica tutti gli effetti in un unica transazione', () => {
    const lega = legaConScambioPronto();
    const op = lega.proponi(
      {
        tipo: 'scambio',
        squadraA: 'A',
        squadraB: 'B',
        giocatoriA: ['X'],
        giocatoriB: ['Y'],
        conguaglio: { daSquadra: 'B', importoCrediti: 20 },
      },
      PRES_A
    );
    lega.convalida(op.id, ADMIN);

    // rose aggiornate
    expect(lega.voceRosaAttiva('X')?.squadra).toBe('B');
    expect(lega.voceRosaAttiva('Y')?.squadra).toBe('A');
    // contratti trasferiti (il contratto segue il giocatore)
    expect(lega.contrattoAttivo('X')?.squadra).toBe('B');
    expect(lega.contrattoAttivo('Y')?.squadra).toBe('A');
    // delta crediti (conguaglio B→A)
    expect(lega.budget('A')).toBe(520);
    expect(lega.budget('B')).toBe(480);
    // delta ingaggi in 3ª finestra (doc 02 §5): A 10−6+3=7, B 5−3+6=8
    expect(lega.monteIngaggi('A')).toBe(7);
    expect(lega.monteIngaggi('B')).toBe(8);
    // storico e audit
    const salvata = lega.operazioni.find((o) => o.id === op.id)!;
    expect(salvata.stato).toBe('approved');
    expect(salvata.decisaDa).toBe(ADMIN);
    expect(lega.audit.some((a) => a.azione === 'APPROVE' && a.entitaId === op.id)).toBe(true);
  });

  it('TC-078 [Must] rifiuto senza effetti, motivazione tracciata', () => {
    const lega = legaConScambioPronto();
    const budgetA = lega.budget('A');
    const op = lega.proponi(
      { tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['Y'] },
      PRES_A
    );
    lega.rifiuta(op.id, ADMIN, 'sbilanciato');

    const salvata = lega.operazioni.find((o) => o.id === op.id)!;
    expect(salvata.stato).toBe('rejected');
    expect(salvata.motivoRifiuto).toBe('sbilanciato');
    expect(lega.budget('A')).toBe(budgetA);
    expect(lega.voceRosaAttiva('X')?.squadra).toBe('A');
    expect(lega.movimentiCrediti.filter((m) => m.operazioneId === op.id)).toHaveLength(0);
  });

  it('TC-079 [Must] BLOCCO operazione confermata immutabile: solo rettifica admin come nuova operazione (invariante 1)', () => {
    const lega = legaConScambioPronto();
    const op = lega.proponi(
      { tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['Y'] },
      PRES_A
    );
    lega.convalida(op.id, ADMIN);

    expect(() => lega.modificaOperazione(op.id)).toThrow(/immutabile/);
    expect(() => lega.convalida(op.id, ADMIN)).toThrow(/non pendente/);

    // la rettifica admin è una NUOVA operazione collegata, con audit
    const rettifica = lega.proponi(
      { tipo: 'rettifica_admin', collegataA: op.id, crediti: { squadra: 'A', importo: -5 } },
      ADMIN
    );
    lega.convalida(rettifica.id, ADMIN);
    expect(lega.operazioni.find((o) => o.id === rettifica.id)?.stato).toBe('approved');
    expect((lega.operazioni.find((o) => o.id === rettifica.id)?.proposta as { collegataA?: string }).collegataA).toBe(op.id);
    expect(lega.budget('A')).toBe(495);
  });

  it('TC-080 [Must] INVARIANTE nessuna cancellazione fisica: storico sempre presente (invariante 2)', () => {
    const lega = legaConScambioPronto();
    const vociPrima = lega.rosa.length;
    const contrattiPrima = lega.contratti.length;

    const scambio = lega.proponi(
      { tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['Y'] },
      PRES_A
    );
    lega.convalida(scambio.id, ADMIN);
    const svincolo = lega.proponi({ tipo: 'svincolo', squadra: 'B', giocatore: 'X', caso: 'rescissione' }, ADMIN);
    lega.convalida(svincolo.id, ADMIN);

    // le voci storiche restano (chiuse, mai eliminate)
    expect(lega.rosa.length).toBeGreaterThan(vociPrima);
    expect(lega.rosa.filter((v) => v.al).length).toBeGreaterThan(0);
    expect(lega.contratti.length).toBe(contrattiPrima);
    expect(lega.contratti.find((c) => c.giocatore === 'X')?.stato).toBe('rescinded');
    // lo storico del giocatore è interrogabile: tutte le voci di X presenti
    expect(lega.rosa.filter((v) => v.giocatore === 'X').length).toBe(2);
  });

  it('TC-081 [Should] monitor crediti totali di lega coerente col ledger (invariante 3)', () => {
    const lega = creaLega();
    const op = lega.proponi({ tipo: 'asta', squadra: 'A', giocatore: 'X', prezzoCrediti: 80, contratto: 'standard' }, ADMIN);
    lega.convalida(op.id, ADMIN);

    // 500 + 500 − 80 bruciati all'asta
    expect(lega.sommaCreditiLega()).toBe(920);
    expect(lega.sommaCreditiLega()).toBe(lega.budget('A') + lega.budget('B'));
  });

  it('TC-082 [Must] INVARIANTE tracciabilità FVM: ogni valore referenzia uno snapshot datato (invariante 7)', () => {
    const lega = creaLega();
    const acquisto = lega.proponi({ tipo: 'asta', squadra: 'A', giocatore: 'X', prezzoCrediti: 80, contratto: 'standard' }, ADMIN);
    lega.convalida(acquisto.id, ADMIN);

    const contratto = lega.contrattoAttivo('X')!;
    const snapshot = lega.snapshots.find((s) => s.id === contratto.fvmSnapshotId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.data).toBe('2026-08-20');
    expect(snapshot!.fvmM).toBe(contratto.fvmCongelato);

    lega.apriFinestra(3);
    const svincolo = lega.proponi({ tipo: 'svincolo', squadra: 'A', giocatore: 'X', caso: 'scadenza_inverno' }, ADMIN);
    lega.convalida(svincolo.id, ADMIN);
    const incassoMov = lega.movimentiCrediti.find((m) => m.operazioneId === svincolo.id && m.causale === 'svincolo')!;
    expect(incassoMov.fvmSnapshotId).toBeDefined();
    expect(lega.snapshots.some((s) => s.id === incassoMov.fvmSnapshotId)).toBe(true);
  });

  it('TC-083 [Must] INVARIANTE audit log con utente, timestamp, entità, before/after', () => {
    const lega = legaConScambioPronto();
    const op = lega.proponi(
      { tipo: 'scambio', squadraA: 'A', squadraB: 'B', giocatoriA: ['X'], giocatoriB: ['Y'] },
      PRES_A
    );
    lega.convalida(op.id, ADMIN);

    expect(lega.audit.length).toBeGreaterThan(0);
    for (const voce of lega.audit) {
      expect(voce.utente).toBeTruthy();
      expect(voce.creatoIl).toBeTruthy();
      expect(voce.entita).toBeTruthy();
      expect(voce.entitaId).toBeTruthy();
    }
    // gli UPDATE portano prima/dopo
    const update = lega.audit.find((a) => a.azione === 'UPDATE' && a.entita === 'contratto');
    expect(update?.prima).toBeDefined();
    expect(update?.dopo).toBeDefined();
    // la proposta è tracciata con l'utente che l'ha fatta
    expect(lega.audit.some((a) => a.entitaId === op.id && a.utente === PRES_A)).toBe(true);
  });
});
