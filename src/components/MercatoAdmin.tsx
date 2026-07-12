'use client';

// Gestione finestre di mercato, multe (registro euro) e asterischi — Sprint 4.

import { useState, useTransition } from 'react';
import { azioneAsterisco, azioneCreaFinestra, azioneMulta, azioneStatoFinestra } from '../application/azioni';

export interface DatiMercato {
  squadre: { id: string; nome: string }[];
  finestre: { id: string; tipo: string; ordinal: number | null; status: string }[];
  inRosa: { id: string; nome: string }[];
}

const TIPI_FINESTRA = [
  ['asta_estiva', 'Asta estiva', null],
  ['finestra_1', 'Finestra 1', 1],
  ['finestra_2', 'Finestra 2', 2],
  ['finestra_3', 'Finestra 3', 3],
  ['asta_invernale', 'Asta invernale', null],
  ['finestra_4', 'Finestra 4', 4],
  ['finestra_5', 'Finestra 5 (solo scambi definitivi)', 5],
  ['draft_vivaio', 'Draft vivaio', null],
] as const;

const STATO_LABEL: Record<string, string> = { scheduled: 'programmata', open: 'APERTA', paused: 'in pausa', closed: 'chiusa' };

export default function MercatoAdmin({ dati }: { dati: DatiMercato }) {
  const [tipoFinestra, setTipoFinestra] = useState<string>('finestra_1');
  const [squadraMulta, setSquadraMulta] = useState('');
  const [giornata, setGiornata] = useState('');
  const [totGiornate, setTotGiornate] = useState('36');
  const [giocatoreAst, setGiocatoreAst] = useState('');
  const [messaggi, setMessaggi] = useState<Record<string, string>>({});
  const [inCorso, startTransition] = useTransition();

  const msg = (chiave: string, testo: string) => setMessaggi((prev) => ({ ...prev, [chiave]: testo }));

  return (
    <section className="section wizard">
      <div className="form-card">
        <p className="eyebrow">FINESTRE DI MERCATO</p>
        {dati.finestre.length === 0 && <p className="muted">Nessuna finestra creata per la stagione corrente.</p>}
        {dati.finestre.map((f) => (
          <div key={f.id} className="chip-row" style={{ alignItems: 'center', marginBottom: 8 }}>
            <b style={{ minWidth: 190 }}>{f.tipo.replaceAll('_', ' ')}{f.ordinal ? ` (ord. ${f.ordinal})` : ''}</b>
            <em className={f.status === 'open' ? 'stato-aperta' : 'stato-chiusa'}>{STATO_LABEL[f.status] ?? f.status}</em>
            {f.status !== 'open' && f.status !== 'closed' && (
              <button className="outline" disabled={inCorso}
                onClick={() => startTransition(async () => msg('finestre', (await azioneStatoFinestra(f.id, 'open')).messaggio))}>Apri</button>
            )}
            {f.status === 'open' && (
              <button className="outline danger-btn" disabled={inCorso}
                onClick={() => startTransition(async () => msg('finestre', (await azioneStatoFinestra(f.id, 'closed')).messaggio))}>Chiudi</button>
            )}
          </div>
        ))}
        <div className="chip-row" style={{ marginTop: 14 }}>
          <select value={tipoFinestra} onChange={(e) => setTipoFinestra(e.target.value)}>
            {TIPI_FINESTRA.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button className="outline" disabled={inCorso}
            onClick={() => startTransition(async () => {
              const spec = TIPI_FINESTRA.find(([v]) => v === tipoFinestra);
              msg('finestre', (await azioneCreaFinestra(tipoFinestra, (spec?.[2] as number | null) ?? null)).messaggio);
            })}>+ Crea finestra</button>
        </div>
        {messaggi.finestre && <p className="esito">{messaggi.finestre}</p>}
        <p className="muted">L&apos;apertura di aste e finestre avanza la sessione di mercato (Osimhen Gate, ammortamenti per finestra).</p>
      </div>

      <div>
        <div className="form-card" style={{ marginBottom: 14 }}>
          <p className="eyebrow">MULTA MANCATA FORMAZIONE (doc 02 §11)</p>
          <div className="form-grid">
            <label>Squadra
              <select value={squadraMulta} onChange={(e) => setSquadraMulta(e.target.value)}>
                <option value="">— squadra —</option>
                {dati.squadre.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </label>
            <label>Giornata
              <input type="number" min="1" value={giornata} onChange={(e) => setGiornata(e.target.value)} />
            </label>
            <label>Giornate totali
              <input type="number" min="1" value={totGiornate} onChange={(e) => setTotGiornate(e.target.value)} />
            </label>
          </div>
          <div className="chip-row" style={{ marginTop: 12 }}>
            <button className="primary" disabled={inCorso || !squadraMulta || !giornata}
              onClick={() => startTransition(async () =>
                msg('multa', (await azioneMulta(squadraMulta, Number(giornata), Number(totGiornate))).messaggio))}>
              Registra multa
            </button>
          </div>
          {messaggi.multa && <p className="esito">{messaggi.multa}</p>}
        </div>

        <div className="form-card">
          <p className="eyebrow">ASTERISCO DALLA REDAZIONE (doc 02 §8)</p>
          <div className="form-grid">
            <label>Giocatore
              <select value={giocatoreAst} onChange={(e) => setGiocatoreAst(e.target.value)}>
                <option value="">— giocatore in rosa —</option>
                {dati.inRosa.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          </div>
          <div className="chip-row" style={{ marginTop: 12 }}>
            <button className="outline danger-btn" disabled={inCorso || !giocatoreAst}
              onClick={() => startTransition(async () => msg('asterisco', (await azioneAsterisco(giocatoreAst)).messaggio))}>
              Segna asteriscato
            </button>
          </div>
          {messaggi.asterisco && <p className="esito">{messaggi.asterisco}</p>}
          <p className="muted">L&apos;ingaggio resta a bilancio; la squadra ha diritto al sostituto con FVM ≤ asteriscato.</p>
        </div>
      </div>
    </section>
  );
}
