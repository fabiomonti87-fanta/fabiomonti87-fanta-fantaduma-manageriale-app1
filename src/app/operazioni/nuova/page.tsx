import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { utenteCorrente } from '../../../lib/auth';
import NavLega from '../../../components/NavLega';
import WizardOperazione, { type DatiWizard } from '../../../components/WizardOperazione';

export const dynamic = 'force-dynamic';

export default async function PaginaNuovaOperazione() {
  const utente = await utenteCorrente();
  if (!utente) redirect('/login');
  if (utente.ruolo === 'viewer') redirect('/operazioni');

  const supabase = await createClient();
  const [{ data: teams }, { data: players }, { data: roster }, { data: contracts }, { data: fvm }, { data: stagioni }] =
    await Promise.all([
      supabase.from('teams').select('id, name').order('name'),
      supabase.from('players').select('id, name, mantra_roles, listone_status'),
      supabase.from('roster_entries').select('team_id, player_id, state, slot_kind').is('end_date', null),
      supabase.from('contracts').select('player_id, team_id, contract_type, years_total, current_year').eq('status', 'active'),
      supabase.from('v_fvm_ultimo').select('player_id, fvm_m'),
      supabase.from('seasons').select('id').eq('is_current', true),
    ]);
  if ((stagioni ?? []).length === 0) {
    return (
      <main className="app-shell">
        <h1>Nuova operazione</h1>
        <p className="muted">Il database non è ancora popolato: eseguire prima la migrazione dati (Sprint 2).</p>
      </main>
    );
  }

  const { data: finestre } = await supabase
    .from('market_windows')
    .select('ordinal, status')
    .eq('season_id', stagioni![0].id)
    .eq('status', 'open');

  const perGiocatore = new Map((players ?? []).map((p) => [p.id, p]));
  const fvmPer = new Map((fvm ?? []).map((f) => [f.player_id, Number(f.fvm_m)]));
  const contrattoPer = new Map((contracts ?? []).map((c) => [c.player_id, c]));
  const occupati = new Set((roster ?? []).map((r) => r.player_id));

  const dati: DatiWizard = {
    ruolo: utente.ruolo,
    teamId: utente.teamId,
    finestraOrdinal: (finestre ?? [])[0]?.ordinal ?? null,
    squadre: (teams ?? []).map((t) => ({ id: t.id, nome: t.name })),
    inRosa: (roster ?? []).map((r) => {
      const p = perGiocatore.get(r.player_id);
      const c = contrattoPer.get(r.player_id);
      return {
        id: r.player_id,
        nome: p?.name ?? r.player_id,
        squadraId: r.team_id,
        ruoli: p?.mantra_roles ?? [],
        slot: r.slot_kind,
        stato: r.state,
        contratto: c ? `${c.contract_type} · anno ${c.current_year}/${c.years_total}` : '—',
        fvm: fvmPer.get(r.player_id) ?? null,
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    liberi: (players ?? [])
      .filter((p) => !occupati.has(p.id) && p.listone_status === 'in_listone' && fvmPer.has(p.id))
      .map((p) => ({ id: p.id, nome: p.name, ruoli: p.mantra_roles ?? [], fvm: fvmPer.get(p.id)! }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">FANTADUMA MANAGERIALE</p>
          <h1>Nuova operazione</h1>
        </div>
      </header>
      <NavLega ruolo={utente.ruolo} attiva="nuova" />
      <WizardOperazione dati={dati} />
    </main>
  );
}
