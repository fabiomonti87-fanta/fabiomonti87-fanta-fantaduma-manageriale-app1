// Aste — doc 02 §10: estiva base 1 credito; invernale base = FVM M del giorno d'asta.

import { NotImplementedError } from './errors';

export function baseAsta(
  tipo: 'asta_estiva' | 'asta_riparazione',
  ctx?: { fvmGiornoAsta?: number }
): number {
  void tipo; void ctx;
  throw new NotImplementedError('baseAsta');
}
