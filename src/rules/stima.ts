// Formula STIMA — doc 02 §7:
// STIMA = (FVM_M_inizio_stagione × 0,49) + (FVM_M_fine_stagione × 0,44)
// Solo per giocatori assenti dal nuovo listone; annullata se il giocatore rientra.
// Decisione S0-1 (00_Stato_Progettazione, 11/07/2026): vale la formula ESATTA,
// nessun arrotondamento a intero (l'esempio "242" del regolamento è 242,20 arrotondato in stampa).

import { round2 } from './esito';

export function stima(fvmInizioStagione: number, fvmFineStagione: number): number {
  return round2(fvmInizioStagione * 0.49 + fvmFineStagione * 0.44);
}
