import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { utenteCorrente } from '../../lib/auth';
import NavLega from '../../components/NavLega';
import MercatoAdmin, { type DatiMercato } from '../../components/MercatoAdmin';

export const dynamic = 'force-dynamic';

export default async function PaginaMercato() {
  const utente = await utenteCorrente();
  if (!utente) redirect('/login');
  if (utente.ruolo !== 'super_admin') redirect('/');

  const supabase = await createClient();
  const [{ data: stagioni }, { data: teams }, { data: roster }, { data: players }] = await Promise.all([
    supabase.from('seasons').select('id').eq('is_current', true),
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('roster_entries').select('player_id, team_id, state').is('end_date', null),
    supabase.from('players').select('id, name, listone_status'),
  ]);
  const seasonId = (stagioni ?? [])[0]?.id;
  const { data: finestre } = seasonId
    ? await supabase.from('market_windows').select('*').eq('season_id', seasonId).order('created_at')
    : { data: [] };

  const nomeGiocatore = new Map((players ?? []).map((p) => [p.id, p.name as string]));
  const nomeSquadra = new Map((teams ?? []).map((t) => [t.id, t.name as string]));

  const dati: DatiMercato = {
    squadre: (teams ?? []).map((t) => ({ id: t.id, nome: t.name })),
    finestre: (finestre ?? []).map((f) => ({
      id: f.id, tipo: f.window_type, ordinal: f.ordinal, status: f.status,
    })),
    inRosa: (roster ?? [])
      .filter((r) => r.state !== 'asteriscato')
      .map((r) => ({ id: r.player_id, nome: `${nomeGiocatore.get(r.player_id) ?? r.player_id} (${nomeSquadra.get(r.team_id) ?? ''})` }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SUPER ADMIN</p>
          <h1>Mercato e multe</h1>
        </div>
      </header>
      <NavLega ruolo={utente.ruolo} attiva="mercato" />
      <MercatoAdmin dati={dati} />
    </main>
  );
}
