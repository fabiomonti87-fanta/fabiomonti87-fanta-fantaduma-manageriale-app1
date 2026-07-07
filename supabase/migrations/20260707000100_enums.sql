-- Enum dal doc 03_Data_Model_v2.md (nomi vincolanti, non rinominare)

create type user_role as enum ('super_admin','president','viewer');

create type contract_type as enum (
  'standard','standard_inverno','diritto_1_1','obbligo_1_1','obbligo_1_2',
  'inverno_obbligo_1_5','inverno_obbligo_2_5','inverno_diritto_0_5_1','vivaio');

create type contract_status as enum ('active','closed','transferred','expired','rescinded');

create type player_state as enum ('in_rosa','vivaio','prestito_in','prestito_out','asteriscato','svincolato');

create type operation_type as enum (
  'asta','asta_riparazione','prestito_out','prestito_in','cessione_definitiva','acquisto_definitivo',
  'svincolo_riconferma','svincolo_obbligo_prec','svincolo_pausa_invernale','svincolo_fine_anno',
  'rescissione_unilaterale','asteriscato','sost_asteriscato','ingresso_vivaio','promosso_da_vivaio',
  'svincolo_vivaio','rettifica_admin');

create type operation_status as enum ('draft','pending','approved','rejected','cancelled');

create type window_type as enum (
  'asta_estiva','finestra_1','finestra_2','finestra_3','asta_invernale',
  'finestra_4','finestra_5','draft_vivaio','fuori_finestra');
