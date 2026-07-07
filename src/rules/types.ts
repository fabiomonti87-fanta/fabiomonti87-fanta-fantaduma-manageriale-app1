// Tipi di dominio allineati agli enum del doc 03_Data_Model_v2.md.
// I nomi restano in italiano dove sono termini di lega (CLAUDE.md).

export type ContractType =
  | 'standard'
  | 'standard_inverno'
  | 'diritto_1_1'
  | 'obbligo_1_1'
  | 'obbligo_1_2'
  | 'inverno_obbligo_1_5'
  | 'inverno_obbligo_2_5'
  | 'inverno_diritto_0_5_1'
  | 'vivaio';

export type OperationType =
  | 'asta'
  | 'asta_riparazione'
  | 'prestito_out'
  | 'prestito_in'
  | 'cessione_definitiva'
  | 'acquisto_definitivo'
  | 'svincolo_riconferma'
  | 'svincolo_obbligo_prec'
  | 'svincolo_pausa_invernale'
  | 'svincolo_fine_anno'
  | 'rescissione_unilaterale'
  | 'asteriscato'
  | 'sost_asteriscato'
  | 'ingresso_vivaio'
  | 'promosso_da_vivaio'
  | 'svincolo_vivaio'
  | 'rettifica_admin';

export type CasoSvincolo =
  | 'scadenza_estate'          // STD/pluriennale in scadenza, prima asta estiva
  | 'scadenza_inverno'         // in scadenza, prima asta invernale
  | 'diritto_non_esercitato'   // diritto non riscattato (estate)
  | 'diritto_inverno'          // diritto, svincolo invernale
  | 'obbligo_estate'           // obbligo, svincolo estivo
  | 'obbligo_inverno'          // obbligo, svincolo invernale
  | 'rescissione'              // rescissione unilaterale
  | 'asteriscato'              // svincolo asteriscato
  | 'vivaio_fine_stagione';    // svincolo vivaio (solo fine stagione)

/** Esito di un validatore del rules engine: hard block se ok=false. */
export interface EsitoValidazione {
  ok: boolean;
  violazioni: string[];
}
