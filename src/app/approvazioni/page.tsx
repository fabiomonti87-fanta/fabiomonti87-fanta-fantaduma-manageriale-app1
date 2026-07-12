import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { utenteCorrente } from '../../lib/auth';
import NavLega from '../../components/NavLega';
import DecisioniPendenti, { type OpPendente } from '../../components/DecisioniPendenti';

export const dynamic = 'force-dynamic';

export default async function PaginaApprovazioni() {
  const utente = await utenteCorrente();
  if (!utente) redirect('/login');
  if (utente.ruolo !== 'super_admin') redirect('/operazioni');

  const supabase = await createClient();
  const [{ data: pendenti }, { data: teams }, { data: players }, { data: users }] = await Promise.all([
    supabase.from('operations').select('*').eq('status', 'pending').order('proposed_at'),
    supabase.from('teams').select('id, name'),
    supabase.from('players').select('id, name'),
    supabase.from('users').select('id, email, display_name'),
  ]);
  const nomeSquadra = new Map((teams ?? []).map((t) => [t.id, t.name as string]));
  const nomeGiocatore = new Map((players ?? []).map((p) => [p.id, p.name as string]));
  const nomeUtente = new Map((users ?? []).map((u) => [u.id, (u.display_name || u.email) as string]));

  const descrivi = (note: string | null): string => {
    try {
      const p = JSON.parse(note ?? '{}')?.proposta;
      if (!p) return 'proposta esterna (decisione manuale)';
      const g = (id: string) => nomeGiocatore.get(id) ?? id;
      const s = (id: string) => nomeSquadra.get(id) ?? id;
      switch (p.tipo) {
        case 'asta':
        case 'asta_riparazione':
          return `${s(p.squadra)} acquista ${g(p.giocatore)} per ${p.prezzoCrediti} crediti (${p.contratto})`;
        case 'scambio':
          return `${s(p.squadraA)} ⇄ ${s(p.squadraB)}: ${p.giocatoriA.map(g).join(', ') || '—'} per ${p.giocatoriB.map(g).join(', ') || '—'}${p.conguaglio ? ` + ${p.conguaglio.importoCrediti} crediti da ${s(p.conguaglio.daSquadra)}` : ''}`;
        case 'svincolo':
          return `${s(p.squadra)} svincola ${g(p.giocatore)} (${p.caso.replaceAll('_', ' ')})`;
        case 'sost_asteriscato':
          return `${s(p.squadra)}: ${g(p.sostituto)} sostituisce l'asteriscato ${g(p.asteriscato)}${p.preAsta ? ' (pre-asta, prestito gratuito)' : ''}`;
        case 'rettifica_admin':
          return `Rettifica: ${p.crediti ? `${p.crediti.importo > 0 ? '+' : ''}${p.crediti.importo} crediti a ${s(p.crediti.squadra)}` : ''} ${p.note ?? ''}`;
        default:
          return p.tipo;
      }
    } catch {
      return 'proposta non leggibile';
    }
  };

  const ops: OpPendente[] = (pendenti ?? []).map((op) => ({
    id: op.id,
    tipo: String(op.operation_type).replaceAll('_', ' '),
    descrizione: descrivi(op.notes),
    propostaDa: nomeUtente.get(op.proposed_by) ?? '—',
    propostaIl: op.proposed_at ? new Date(op.proposed_at).toLocaleString('it-IT') : '—',
  }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SUPER ADMIN</p>
          <h1>Approvazioni</h1>
        </div>
        <div className="season">{ops.length} operazioni in attesa</div>
      </header>
      <NavLega ruolo={utente.ruolo} attiva="approvazioni" />
      <DecisioniPendenti operazioni={ops} />
    </main>
  );
}
