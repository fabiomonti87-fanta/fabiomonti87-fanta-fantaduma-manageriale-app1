// Formula STIMA — doc 02 §7:
// STIMA = (FVM_M_inizio_stagione × 0,49) + (FVM_M_fine_stagione × 0,44)
// Solo per giocatori assenti dal nuovo listone; annullata se il giocatore rientra.

import { NotImplementedError } from './errors';

export function stima(fvmInizioStagione: number, fvmFineStagione: number): number {
  void fvmInizioStagione; void fvmFineStagione;
  throw new NotImplementedError('stima');
}
