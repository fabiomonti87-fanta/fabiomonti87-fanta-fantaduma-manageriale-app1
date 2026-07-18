'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, CircleDollarSign, Download, Search, ShieldCheck, Users } from 'lucide-react';
import type { ConsultationData, ConsultationPlayer } from '../lib/consultation-data';

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const num = (n: number | null) => n === null ? '—' : new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n);
const csvCell = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;

function exportCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([rows.map((r) => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
  URL.revokeObjectURL(link.href);
}

export default function ConsultationDashboard({ data, ruolo = 'viewer' }: { data: ConsultationData; ruolo?: 'super_admin' | 'president' | 'viewer' }) {
  const [team, setTeam] = useState('Tutte');
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState('tutti');
  const [selected, setSelected] = useState<ConsultationPlayer | null>(null);
  const filtered = useMemo(() => data.players.filter((p) =>
    (team === 'Tutte' || p.squadra === team) && (slot === 'tutti' || p.slot === slot) &&
    p.nome.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))), [data.players, query, slot, team]);
  const current = data.teams.find((t) => t.nome === team);
  const alerts = data.teams.filter((t) => t.monte >= 225 || t.slot >= 12);

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">FANTADUMA MANAGERIALE</p><h1>Centro di controllo della lega</h1></div>
      <div className="season"><span className="live-dot" /> Stagione 2025/26 · dati al {data.aggiornatoAl}</div></header>
    <nav className="tabs" style={{flexWrap:'wrap'}}><button className="active">Lega</button><button onClick={() => document.getElementById('rosa')?.scrollIntoView()}>Rose e contratti</button><button onClick={() => document.getElementById('export')?.scrollIntoView()}>Export</button>
      <a className="nav-link" href="/operazioni">Operazioni</a>
      {ruolo !== 'viewer' && <a className="nav-link" href="/operazioni/nuova">Nuova operazione</a>}
      {ruolo === 'super_admin' && <><a className="nav-link" href="/approvazioni">Approvazioni</a><a className="nav-link" href="/mercato">Mercato e multe</a><a className="nav-link" href="/import-fvm">Import FVM</a></>}
      <a className="nav-link" href="/manuale">Manuale</a>
    </nav>

    <section className="hero-grid">
      <article className="league-card"><div className="card-title"><ShieldCheck size={18}/><span>Quadro lega</span></div>
        <strong>{data.teams.length}/10</strong><p>squadre migrate e quadrate</p><div className="progress"><i style={{width:'100%'}} /></div></article>
      <article className="league-card"><div className="card-title"><CircleDollarSign size={18}/><span>Crediti circolanti</span></div>
        <strong>{num(data.teams.reduce((a,t)=>a+t.budget,0))}</strong><p>saldo complessivo della lega</p></article>
      <article className="league-card"><div className="card-title"><Users size={18}/><span>Giocatori censiti</span></div>
        <strong>{data.players.length}</strong><p>rosa e vivaio attivi</p></article>
      <article className="league-card warning"><div className="card-title"><AlertTriangle size={18}/><span>Attenzioni</span></div>
        <strong>{alerts.length}</strong><p>squadre vicine a cap o limite slot</p></article>
    </section>

    <section className="section"><div className="section-head"><div><p className="eyebrow">PANORAMICA</p><h2>Situazione squadre</h2></div>
      <button className="outline" onClick={() => exportCsv('budget-fantaduma.csv', [['Squadra','Crediti','Monte ingaggi','Cap','Slot','Rosa','Vivaio'],...data.teams.map(t=>[t.nome,t.budget,t.monte,t.cap,t.slot,t.rosa,t.vivaio])])}><Download size={16}/> CSV budget</button></div>
      <div className="team-table"><div className="tr th"><span>Squadra</span><span>Crediti</span><span>Monte ingaggi</span><span>Cap usato</span><span>Slot</span><span>Rosa</span><span /></div>
        {data.teams.map(t => <button className="tr" key={t.nome} onClick={()=>{setTeam(t.nome);document.getElementById('rosa')?.scrollIntoView({behavior:'smooth'})}}>
          <span className="team-name"><i>{t.nome.slice(0,2).toUpperCase()}</i>{t.nome}</span><b>{num(t.budget)}</b><span>{euro(t.monte)}</span>
          <span><em className={t.monte/t.cap>.9?'danger':''}>{Math.round(t.monte/t.cap*100)}%</em></span><span>{t.slot}/12</span><span>{t.rosa}+{t.vivaio}</span><ChevronRight size={16}/></button>)}</div>
    </section>

    <section className="section" id="rosa"><div className="section-head"><div><p className="eyebrow">CONSULTAZIONE</p><h2>{current ? current.nome : 'Rose e contratti'}</h2></div>
      {current && <div className="mini-kpis"><span><b>{num(current.budget)}</b> crediti</span><span><b>{euro(current.monte)}</b> ingaggi</span><span><b>{current.slot}/12</b> slot</span></div>}</div>
      <div className="filters"><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca giocatore…" /></label>
        <select value={team} onChange={e=>setTeam(e.target.value)}><option>Tutte</option>{data.teams.map(t=><option key={t.nome}>{t.nome}</option>)}</select>
        <select value={slot} onChange={e=>setSlot(e.target.value)}><option value="tutti">Rosa + vivaio</option><option value="rosa">Prima squadra</option><option value="vivaio">Vivaio</option></select>
        <button className="outline" id="export" onClick={()=>exportCsv('rose-contratti-fantaduma.csv',[['Giocatore','Squadra','Ruoli','Stato','Contratto','Anno','FVM','Ingaggio','Prezzo','Plus/minus'],...filtered.map(p=>[p.nome,p.squadra,p.ruoli.join('/'),p.stato,p.contratto,p.anno,p.ultimoFvm,p.ingaggio,p.prezzo,p.plusvalenza])])}><Download size={16}/> Esporta {filtered.length}</button></div>
      <div className="players"><div className="player-row ph"><span>Giocatore</span><span>Squadra</span><span>Contratto</span><span>FVM</span><span>Ingaggio</span><span>Plus/minus</span></div>
        {filtered.map(p=><button key={`${p.id}-${p.squadra}`} className="player-row" onClick={()=>setSelected(p)}><span className="player"><i>{p.ruoli[0]||'?'}</i><b>{p.nome}</b><small>{p.slot}</small></span><span>{p.squadra}</span><span>{p.contratto} · A{p.anno}</span><span>{num(p.ultimoFvm)}</span><span>{euro(p.ingaggio)}</span><span className={(p.plusvalenza??0)>=0?'positive':'negative'}>{p.plusvalenza===null?'—':`${p.plusvalenza>0?'+':''}${num(p.plusvalenza)}`}</span></button>)}</div>
    </section>
    {selected && <div className="modal-backdrop" onClick={()=>setSelected(null)}><article className="player-modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><p className="eyebrow">SCHEDA GIOCATORE</p><h2>{selected.nome}</h2><p>{selected.squadra} · {selected.ruoli.join(' / ') || 'Ruolo non disponibile'}</p><div className="detail-grid"><span><small>Contratto</small><b>{selected.contratto}</b></span><span><small>Anno</small><b>{selected.anno}</b></span><span><small>FVM congelato</small><b>{num(selected.fvm)}</b></span><span><small>Ultimo FVM</small><b>{num(selected.ultimoFvm)}</b></span><span><small>Ingaggio</small><b>{euro(selected.ingaggio)}</b></span><span><small>Plus/minus latente</small><b className={(selected.plusvalenza??0)>=0?'positive':'negative'}>{num(selected.plusvalenza)}</b></span></div><p className="muted">Scadenza: {selected.scadenza ?? 'non disponibile'} · Stato: {selected.stato}</p></article></div>}
  </main>;
}
