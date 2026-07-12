'use server';

// Server actions Sprint 4 — unico punto d'ingresso del rules engine dal frontend.
// Ogni azione: autentica, verifica ruolo (doc 01 §2), delega all'adapter Supabase.
// Zero logica economica qui: solo autorizzazione e trasporto.

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { richiediRuolo, type UtenteApp } from '../lib/auth';
import type { Proposta } from './engine';
import {
  anteprimaImportFvm,
  anteprimaOperazione,
  cambiaStatoFinestra,
  clientServizio,
  confermaImportFvm,
  creaFinestra,
  decidiOperazione,
  proponiOperazione,
  registraMultaDb,
  segnaAsteriscatoDb,
  type EsitoAnteprima,
  type RigaFvm,
} from './adapter-supabase';

export interface EsitoAzione {
  ok: boolean;
  messaggio: string;
}

function squadreDellaProposta(p: Proposta): string[] {
  switch (p.tipo) {
    case 'asta':
    case 'asta_riparazione':
    case 'svincolo':
    case 'sost_asteriscato':
      return [p.squadra];
    case 'scambio':
      return [p.squadraA, p.squadraB];
    case 'rettifica_admin':
      return [];
  }
}

/** I presidenti propongono solo per la propria squadra (doc 01 §2); rettifiche solo admin. */
function verificaProponente(p: Proposta, utente: UtenteApp): void {
  if (utente.ruolo === 'super_admin') return;
  if (p.tipo === 'rettifica_admin') throw new Error('le rettifiche sono riservate al Super Admin');
  const squadre = squadreDellaProposta(p);
  if (!utente.teamId || !squadre.includes(utente.teamId)) {
    throw new Error('puoi proporre operazioni solo per la tua squadra');
  }
}

const messaggioErrore = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function azioneAnteprima(proposta: Proposta): Promise<EsitoAnteprima> {
  try {
    const utente = await richiediRuolo('president');
    verificaProponente(proposta, utente);
    const admin = clientServizio();
    const { data: teams } = await admin.from('teams').select('id, name');
    return await anteprimaOperazione(proposta, utente.id, new Map((teams ?? []).map((t) => [t.id, t.name])));
  } catch (e) {
    return { ok: false, violazioni: [messaggioErrore(e)], impatti: [] };
  }
}

export async function azioneProponi(proposta: Proposta): Promise<EsitoAzione> {
  try {
    const utente = await richiediRuolo('president');
    verificaProponente(proposta, utente);
    await proponiOperazione(proposta, utente.id);
    revalidatePath('/operazioni');
    revalidatePath('/approvazioni');
    return { ok: true, messaggio: 'Operazione proposta: in attesa di convalida del Super Admin.' };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneDecidi(
  opId: string,
  decisione: 'convalida' | 'rifiuta' | 'forza',
  motivo?: string
): Promise<EsitoAzione> {
  try {
    const utente = await richiediRuolo('super_admin');
    await decidiOperazione(opId, utente.id, decisione, motivo);
    revalidatePath('/approvazioni');
    revalidatePath('/operazioni');
    revalidatePath('/');
    const esiti = { convalida: 'convalidata', rifiuta: 'rifiutata', forza: 'convalidata con forzatura' } as const;
    return { ok: true, messaggio: `Operazione ${esiti[decisione]}.` };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneMulta(squadraId: string, giornata: number, totaleGiornate: number): Promise<EsitoAzione> {
  try {
    const utente = await richiediRuolo('super_admin');
    const importo = await registraMultaDb(squadraId, giornata, totaleGiornate, utente.id);
    revalidatePath('/mercato');
    return { ok: true, messaggio: `Multa registrata: ${importo} € al montepremi.` };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneAsterisco(giocatoreId: string): Promise<EsitoAzione> {
  try {
    const utente = await richiediRuolo('super_admin');
    const { alertSquadra } = await segnaAsteriscatoDb(giocatoreId, utente.id);
    revalidatePath('/mercato');
    revalidatePath('/');
    return {
      ok: true,
      messaggio: alertSquadra
        ? 'Giocatore asteriscato: la squadra proprietaria ha diritto al sostituto (doc 02 §8).'
        : 'Giocatore asteriscato (non in rosa a nessuna squadra).',
    };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneCreaFinestra(tipo: string, ordinal: number | null): Promise<EsitoAzione> {
  try {
    await richiediRuolo('super_admin');
    await creaFinestra({ tipo, ordinal });
    revalidatePath('/mercato');
    return { ok: true, messaggio: 'Finestra creata (programmata).' };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneStatoFinestra(finestraId: string, status: 'scheduled' | 'open' | 'paused' | 'closed'): Promise<EsitoAzione> {
  try {
    await richiediRuolo('super_admin');
    await cambiaStatoFinestra(finestraId, status);
    revalidatePath('/mercato');
    return { ok: true, messaggio: `Finestra aggiornata: ${status}.` };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

// ---------- import FVM / listone ----------

/** Estrae (fc_id, nome, FVM M) da un listone/quotazioni xlsx o csv. */
function estraiRighe(buffer: ArrayBuffer): RigaFvm[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrice: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  let header = -1;
  let colId = -1;
  let colNome = -1;
  let colFvm = -1;
  for (let i = 0; i < Math.min(matrice.length, 10); i += 1) {
    const riga = matrice[i] ?? [];
    const id = riga.findIndex((c) => norm(c) === 'id');
    const fvmM = riga.findIndex((c) => norm(c) === 'fvm m');
    const fvm = riga.findIndex((c) => norm(c) === 'fvm');
    if (id >= 0 && (fvmM >= 0 || fvm >= 0)) {
      header = i;
      colId = id;
      colFvm = fvmM >= 0 ? fvmM : fvm;
      colNome = riga.findIndex((c) => norm(c) === 'nome');
      break;
    }
  }
  if (header < 0) throw new Error("intestazione non trovata: servono le colonne 'Id' e 'FVM M' (listone Fantacalcio)");
  const righe: RigaFvm[] = [];
  for (const riga of matrice.slice(header + 1)) {
    const fcId = String(riga?.[colId] ?? '').trim();
    if (!fcId) continue;
    righe.push({
      fcId,
      nome: colNome >= 0 ? String(riga?.[colNome] ?? '').trim() : '',
      fvmM: Number(riga?.[colFvm]),
    });
  }
  return righe;
}

export interface EsitoAnteprimaImport {
  ok: boolean;
  messaggio: string;
  totale?: number;
  abbinati?: number;
  nuovi?: number;
  scartate?: number;
  righe?: RigaFvm[];
}

export async function azioneAnteprimaImport(formData: FormData): Promise<EsitoAnteprimaImport> {
  try {
    await richiediRuolo('super_admin');
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) return { ok: false, messaggio: 'seleziona un file xlsx' };
    const righe = estraiRighe(await file.arrayBuffer());
    const anteprima = await anteprimaImportFvm(righe);
    return {
      ok: true,
      messaggio: `${anteprima.abbinati} giocatori abbinati, ${anteprima.nuovi.length} nuovi, ${anteprima.scartate} righe scartate.`,
      totale: anteprima.totale,
      abbinati: anteprima.abbinati,
      nuovi: anteprima.nuovi.length,
      scartate: anteprima.scartate,
      righe,
    };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}

export async function azioneConfermaImport(
  righe: RigaFvm[],
  opts: { dataSnapshot: string; source: 'listone_estivo' | 'listone_invernale' | 'update'; fileName: string; creaNuovi: boolean }
): Promise<EsitoAzione> {
  try {
    const utente = await richiediRuolo('super_admin');
    const esito = await confermaImportFvm(righe, { ...opts, utenteId: utente.id });
    revalidatePath('/');
    revalidatePath('/import-fvm');
    return {
      ok: true,
      messaggio: `Import confermato: ${esito.snapshotInseriti} snapshot FVM${esito.giocatoriCreati > 0 ? `, ${esito.giocatoriCreati} nuovi giocatori` : ''}.`,
    };
  } catch (e) {
    return { ok: false, messaggio: messaggioErrore(e) };
  }
}
