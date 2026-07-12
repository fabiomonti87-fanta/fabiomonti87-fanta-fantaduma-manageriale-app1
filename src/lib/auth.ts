import { createClient } from './supabase/server';

export interface UtenteApp {
  id: string;
  email: string;
  ruolo: 'super_admin' | 'president' | 'viewer';
  teamId: string | null;
}

/** Utente della sessione corrente con ruolo di lega (tabella users). */
export async function utenteCorrente(): Promise<UtenteApp | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('id, email, role, team_id').eq('id', user.id).single();
  if (!data) return { id: user.id, email: user.email ?? '', ruolo: 'viewer', teamId: null };
  return { id: data.id, email: data.email, ruolo: data.role, teamId: data.team_id };
}

export async function richiediRuolo(minimo: 'president' | 'super_admin'): Promise<UtenteApp> {
  const utente = await utenteCorrente();
  if (!utente) throw new Error('non autenticato');
  if (minimo === 'super_admin' && utente.ruolo !== 'super_admin') throw new Error('riservato al Super Admin');
  if (minimo === 'president' && utente.ruolo === 'viewer') throw new Error('riservato a presidenti e Super Admin');
  return utente;
}
