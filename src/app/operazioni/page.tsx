import Link from 'next/link';
import { createClient } from '../../lib/supabase/server';
import { utenteCorrente } from '../../lib/auth';
import NavLega from '../../components/NavLega';

export const dynamic = 'force-dynamic';

const ETICHETTE_STATO: Record<string, string> = {
  pending: 'In attesa',
  approved: 'Convalidata',
  rejected: 'Rifiutata',
  draft: 'Bozza',
  cancelled: 'Annullata',
};

export default async function PaginaOperazioni() {
  const utente = await utenteCorrente();
  const supabase = await createClient();
  const [{ data: operazioni }, { data: teams }, { data: users }] = await Promise.all([
    supabase.from('operations').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('teams').select('id, name'),
    supabase.from('users').select('id, email, display_name'),
  ]);
  const nomeUtente = new Map((users ?? []).map((u) => [u.id, u.display_name || u.email]));
  void teams;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FANTADUMA MANAGERIALE</p>
          <h1>Operazioni</h1>
        </div>
        {utente && utente.ruolo !== 'viewer' && (
          <Link className="outline" href="/operazioni/nuova">+ Nuova operazione</Link>
        )}
      </header>
      <NavLega ruolo={utente?.ruolo ?? 'viewer'} attiva="operazioni" />

      <section className="section">
        <div className="team-table">
          <div className="tr th" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}>
            <span>Tipo</span><span>Stato</span><span>Proposta da</span><span>Proposta il</span><span>Decisa il</span>
          </div>
          {(operazioni ?? []).map((op) => (
            <div className="tr" key={op.id} style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', cursor: 'default' }}>
              <span className="team-name"><i>{String(op.operation_type).slice(0, 2).toUpperCase()}</i>{String(op.operation_type).replaceAll('_', ' ')}</span>
              <span><em className={op.status === 'rejected' ? 'danger' : ''}>{ETICHETTE_STATO[op.status] ?? op.status}</em></span>
              <span>{nomeUtente.get(op.proposed_by) ?? '—'}</span>
              <span>{op.proposed_at ? new Date(op.proposed_at).toLocaleDateString('it-IT') : '—'}</span>
              <span>{op.decided_at ? new Date(op.decided_at).toLocaleDateString('it-IT') : '—'}</span>
            </div>
          ))}
          {(operazioni ?? []).length === 0 && (
            <div className="tr" style={{ gridTemplateColumns: '1fr', cursor: 'default' }}>
              <span className="muted">Nessuna operazione registrata. Le operazioni proposte compariranno qui.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
