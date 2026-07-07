// Migrazione — doc 03. Test d'integrazione dello Sprint 2.
import { describe, it } from 'vitest';
import { richiedeApplicationLayer } from './helpers';

describe('Migrazione (doc 03)', () => {
  it('TC-084 [Must] quadratura post-import: budget, monte ingaggi e slot identici al foglio per tutte le 10 squadre', () => {
    richiedeApplicationLayer('TC-084'); // Sprint 2: report di quadratura automatico
  });
});
