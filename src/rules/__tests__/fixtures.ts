// Fixtures per i test d'integrazione dell'application layer.
// Lega minimale: 2 squadre, giocatori con snapshot FVM datati.
// rosaMin/minPortieri a 0 per non dover seminare 23 giocatori per squadra:
// i limiti rosa sono coperti dai TC puri su checkRosa (TC-025..027).

import { LegaEngine, type LegaSeed } from '../../application/engine';

export const ADMIN = 'admin-1';
export const PRES_A = 'pres-a';

export function creaLega(extra: {
  stagione?: LegaSeed['stagione'];
  squadre?: LegaSeed['squadre'];
  giocatori?: LegaSeed['giocatori'];
  snapshots?: LegaSeed['snapshots'];
  contratti?: LegaSeed['contrattiIniziali'];
  oggi?: string;
} = {}): LegaEngine {
  return new LegaEngine({
    stagione: { rosaMin: 0, minPortieri: 0, ...extra.stagione },
    utenti: [
      { id: ADMIN, ruolo: 'super_admin' },
      { id: PRES_A, ruolo: 'president', squadra: 'A' },
    ],
    squadre: extra.squadre ?? [
      { id: 'A', nome: 'Alpha', crediti: 500 },
      { id: 'B', nome: 'Beta', crediti: 500 },
    ],
    giocatori: [
      { id: 'X', nome: 'Xavi', ruoli: ['C'] },
      { id: 'Y', nome: 'Yeri', ruoli: ['A'] },
      { id: 'W', nome: 'Willy', ruoli: ['D'] },
      { id: 'S', nome: 'Sosti', ruoli: ['C'] },
      ...(extra.giocatori ?? []),
    ],
    snapshots: [
      { giocatore: 'X', fvmM: 100, data: '2026-08-20', source: 'listone_estivo' },
      { giocatore: 'Y', fvmM: 50, data: '2026-08-20', source: 'listone_estivo' },
      { giocatore: 'W', fvmM: 40, data: '2026-08-20', source: 'listone_estivo' },
      { giocatore: 'S', fvmM: 30, data: '2026-08-20', source: 'listone_estivo' },
      ...(extra.snapshots ?? []),
    ],
    contrattiIniziali: extra.contratti,
    oggi: extra.oggi ?? '2026-08-20',
  });
}
