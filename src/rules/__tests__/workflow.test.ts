// Workflow e invarianti — doc 02 §12.
// Tutti test d'integrazione: richiedono l'application layer (operations → ledger → audit)
// e il DB. Restano rossi finché non implementati (Sprint 1).
import { describe, it } from 'vitest';
import { richiedeApplicationLayer } from './helpers';

describe('Workflow e invarianti (§12)', () => {
  it('TC-076 [Must] proposta pendente non tocca i saldi (invariante 10)', () => {
    richiedeApplicationLayer('TC-076');
  });

  it('TC-077 [Must] convalida applica tutti gli effetti in un unica transazione', () => {
    richiedeApplicationLayer('TC-077');
  });

  it('TC-078 [Must] rifiuto senza effetti, motivazione tracciata', () => {
    richiedeApplicationLayer('TC-078');
  });

  it('TC-079 [Must] BLOCCO operazione confermata immutabile: solo rettifica admin come nuova operazione (invariante 1)', () => {
    richiedeApplicationLayer('TC-079');
  });

  it('TC-080 [Must] INVARIANTE nessuna cancellazione fisica: storico sempre presente (invariante 2)', () => {
    richiedeApplicationLayer('TC-080');
  });

  it('TC-081 [Should] monitor crediti totali di lega coerente col ledger (invariante 3)', () => {
    richiedeApplicationLayer('TC-081');
  });

  it('TC-082 [Must] INVARIANTE tracciabilità FVM: ogni valore referenzia uno snapshot datato (invariante 7)', () => {
    richiedeApplicationLayer('TC-082');
  });

  it('TC-083 [Must] INVARIANTE audit log con utente, timestamp, entità, before/after', () => {
    richiedeApplicationLayer('TC-083');
  });
});
