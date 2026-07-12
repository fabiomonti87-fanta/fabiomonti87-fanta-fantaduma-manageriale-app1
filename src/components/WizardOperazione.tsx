'use client';

// Wizard nuova operazione (doc 04 Sprint 4): preview impatti OBBLIGATORIA prima
// della proposta. La preview e la proposta passano dal rules engine server-side.

import { useState, useTransition } from 'react';
import { azioneAnteprima, azioneProponi } from '../application/azioni';
import type { Proposta } from '../application/engine';
import type { EsitoAnteprima } from '../application/adapter-supabase';
import type { CasoSvincolo, ContractType } from '../rules/types';

export interface DatiWizard {
  ruolo: 'super_admin' | 'president' | 'viewer';
  teamId: string | null;
  finestraOrdinal: number | null;
  squadre: { id: string; nome: string }[];
  inRosa: { id: string; nome: string; squadraId: string; ruoli: string[]; slot: string; stato: string; contratto: string; fvm: number | null }[];
  liberi: { id: string; nome: string; ruoli: string[]; fvm: number }[];
}

type TipoOp = 'asta' | 'asta_riparazione' | 'scambio' | 'svincolo' | 'sost_asteriscato' | 'rettifica_admin';

const CASI_SVINCOLO = [
  ['scadenza_estate', 'Scadenza contratto (estate)'],
  ['scadenza_inverno', 'Scadenza contratto (inverno)'],
  ['diritto_non_esercitato', 'Diritto non esercitato'],
  ['diritto_inverno', 'Diritto — svincolo invernale'],
  ['obbligo_estate', 'Obbligo — svincolo estivo'],
  ['obbligo_inverno', 'Obbligo — svincolo invernale'],
  ['rescissione', 'Rescissione unilaterale (incasso zero)'],
  ['asteriscato', 'Svincolo asteriscato'],
] as const;

const TIPI_CONTRATTO = [
  'standard', 'standard_inverno', 'diritto_1_1', 'obbligo_1_1', 'obbligo_1_2',
  'inverno_obbligo_1_5', 'inverno_obbligo_2_5', 'inverno_diritto_0_5_1',
] as const;

const eur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

export default function WizardOperazione({ dati }: { dati: DatiWizard }) {
  const [tipo, setTipo] = useState<TipoOp>('asta');
  const presidente = dati.ruolo !== 'super_admin';
  const [squadra, setSquadra] = useState(presidente ? dati.teamId ?? '' : '');
  const [giocatore, setGiocatore] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [contratto, setContratto] = useState<string>('standard');
  const [caso, setCaso] = useState<string>('scadenza_estate');
  const [squadraB, setSquadraB] = useState('');
  const [giocatoriA, setGiocatoriA] = useState<string[]>([]);
  const [giocatoriB, setGiocatoriB] = useState<string[]>([]);
  const [conguaglioDa, setConguaglioDa] = useState('');
  const [conguaglioImporto, setConguaglioImporto] = useState('');
  const [pctRicevente, setPctRicevente] = useState('');
  const [asteriscato, setAsteriscato] = useState('');
  const [preAsta, setPreAsta] = useState(false);
  const [rettificaImporto, setRettificaImporto] = useState('');
  const [note, setNote] = useState('');
  const [anteprima, setAnteprima] = useState<EsitoAnteprima | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const [inCorso, startTransition] = useTransition();

  const invalida = () => { setAnteprima(null); setMessaggio(''); };
  const rosaDi = (sq: string) => dati.inRosa.filter((p) => p.squadraId === sq);
  const asteriscatiDi = (sq: string) => rosaDi(sq).filter((p) => p.stato === 'asteriscato');

  function costruisciProposta(): Proposta | null {
    switch (tipo) {
      case 'asta':
      case 'asta_riparazione':
        if (!squadra || !giocatore || !prezzo) return null;
        return { tipo, squadra, giocatore, prezzoCrediti: Number(prezzo), contratto: contratto as ContractType };
      case 'scambio': {
        if (!squadra || !squadraB || (giocatoriA.length === 0 && giocatoriB.length === 0)) return null;
        const p: Proposta = { tipo: 'scambio', squadraA: squadra, squadraB, giocatoriA, giocatoriB };
        if (conguaglioDa && conguaglioImporto) p.conguaglio = { daSquadra: conguaglioDa, importoCrediti: Number(conguaglioImporto) };
        if (pctRicevente !== '') p.pctRicevente = Number(pctRicevente);
        return p;
      }
      case 'svincolo':
        if (!squadra || !giocatore) return null;
        return { tipo: 'svincolo', squadra, giocatore, caso: caso as CasoSvincolo };
      case 'sost_asteriscato':
        if (!squadra || !giocatore || !asteriscato) return null;
        return { tipo: 'sost_asteriscato', squadra, sostituto: giocatore, asteriscato, contratto: contratto as ContractType, preAsta };
      case 'rettifica_admin':
        if (!squadra || !rettificaImporto) return null;
        return { tipo: 'rettifica_admin', crediti: { squadra, importo: Number(rettificaImporto) }, note };
    }
  }

  const proposta = costruisciProposta();

  const eseguiAnteprima = () => {
    if (!proposta) return;
    startTransition(async () => {
      setMessaggio('');
      setAnteprima(await azioneAnteprima(proposta));
    });
  };

  const proponi = () => {
    if (!proposta || !anteprima?.ok) return;
    startTransition(async () => {
      const esito = await azioneProponi(proposta);
      setMessaggio(esito.messaggio);
      if (esito.ok) { setAnteprima(null); setGiocatore(''); setPrezzo(''); setGiocatoriA([]); setGiocatoriB([]); }
    });
  };

  const selectSquadra = (valore: string, cambia: (v: string) => void, bloccata: boolean) => (
    <select value={valore} onChange={(e) => { cambia(e.target.value); invalida(); }} disabled={bloccata}>
      <option value="">— squadra —</option>
      {dati.squadre.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
    </select>
  );

  const multiSelect = (sq: string, scelti: string[], cambia: (v: string[]) => void) => (
    <select multiple size={8} value={scelti}
      onChange={(e) => { cambia([...e.target.selectedOptions].map((o) => o.value)); invalida(); }}>
      {rosaDi(sq).map((p) => (
        <option key={p.id} value={p.id}>{p.nome} ({p.ruoli.join('/')}) — {p.contratto}</option>
      ))}
    </select>
  );

  return (
    <section className="section">
      <div className="wizard">
        <div className="form-card">
          <p className="eyebrow">1 · TIPO DI OPERAZIONE</p>
          <div className="chip-row">
            {([
              ['asta', 'Asta'], ['asta_riparazione', 'Asta riparazione'], ['scambio', 'Scambio'],
              ['svincolo', 'Svincolo'], ['sost_asteriscato', 'Sostituzione asteriscato'],
              ...(dati.ruolo === 'super_admin' ? [['rettifica_admin', 'Rettifica admin']] : []),
            ] as [TipoOp, string][]).map(([t, label]) => (
              <button key={t} className={tipo === t ? 'chip active' : 'chip'}
                onClick={() => { setTipo(t); invalida(); }}>{label}</button>
            ))}
          </div>

          <p className="eyebrow" style={{ marginTop: 18 }}>2 · DETTAGLI</p>
          <div className="form-grid">
            <label>Squadra {tipo === 'scambio' ? 'A' : ''}{selectSquadra(squadra, setSquadra, presidente)}</label>

            {(tipo === 'asta' || tipo === 'asta_riparazione') && (
              <>
                <label>Giocatore (svincolato)
                  <select value={giocatore} onChange={(e) => { setGiocatore(e.target.value); invalida(); }}>
                    <option value="">— giocatore —</option>
                    {dati.liberi.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.ruoli.join('/')}) — FVM {p.fvm}</option>)}
                  </select>
                </label>
                <label>Prezzo (crediti)
                  <input type="number" min="1" value={prezzo} onChange={(e) => { setPrezzo(e.target.value); invalida(); }} />
                </label>
                <label>Contratto
                  <select value={contratto} onChange={(e) => { setContratto(e.target.value); invalida(); }}>
                    {TIPI_CONTRATTO.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
              </>
            )}

            {tipo === 'scambio' && (
              <>
                <label>Squadra B{selectSquadra(squadraB, setSquadraB, false)}</label>
                {squadra && <label>Ceduti da A{multiSelect(squadra, giocatoriA, setGiocatoriA)}</label>}
                {squadraB && <label>Ceduti da B{multiSelect(squadraB, giocatoriB, setGiocatoriB)}</label>}
                <label>Conguaglio da
                  <select value={conguaglioDa} onChange={(e) => { setConguaglioDa(e.target.value); invalida(); }}>
                    <option value="">— nessun conguaglio —</option>
                    {squadra && <option value={squadra}>{dati.squadre.find((s) => s.id === squadra)?.nome}</option>}
                    {squadraB && <option value={squadraB}>{dati.squadre.find((s) => s.id === squadraB)?.nome}</option>}
                  </select>
                </label>
                {conguaglioDa && (
                  <label>Importo conguaglio (crediti)
                    <input type="number" min="1" value={conguaglioImporto} onChange={(e) => { setConguaglioImporto(e.target.value); invalida(); }} />
                  </label>
                )}
                <label>% ingaggio al ricevente (opzionale, in finestra)
                  <input type="number" min="0" max="100" value={pctRicevente}
                    placeholder={dati.finestraOrdinal ? `default finestra ${dati.finestraOrdinal}` : 'fuori finestra: 100%'}
                    onChange={(e) => { setPctRicevente(e.target.value); invalida(); }} />
                </label>
              </>
            )}

            {tipo === 'svincolo' && squadra && (
              <>
                <label>Giocatore
                  <select value={giocatore} onChange={(e) => { setGiocatore(e.target.value); invalida(); }}>
                    <option value="">— giocatore —</option>
                    {rosaDi(squadra).map((p) => <option key={p.id} value={p.id}>{p.nome} — {p.contratto}</option>)}
                  </select>
                </label>
                <label>Caso (matrice doc 02 §6)
                  <select value={caso} onChange={(e) => { setCaso(e.target.value); invalida(); }}>
                    {CASI_SVINCOLO.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </label>
              </>
            )}

            {tipo === 'sost_asteriscato' && squadra && (
              <>
                <label>Asteriscato da sostituire
                  <select value={asteriscato} onChange={(e) => { setAsteriscato(e.target.value); invalida(); }}>
                    <option value="">— asteriscato —</option>
                    {asteriscatiDi(squadra).map((p) => <option key={p.id} value={p.id}>{p.nome} (FVM {p.fvm ?? '—'})</option>)}
                  </select>
                </label>
                <label>Sostituto (svincolato, FVM ≤ asteriscato)
                  <select value={giocatore} onChange={(e) => { setGiocatore(e.target.value); invalida(); }}>
                    <option value="">— sostituto —</option>
                    {dati.liberi.map((p) => <option key={p.id} value={p.id}>{p.nome} — FVM {p.fvm}</option>)}
                  </select>
                </label>
                <label>Contratto
                  <select value={contratto} onChange={(e) => { setContratto(e.target.value); invalida(); }}>
                    {TIPI_CONTRATTO.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={preAsta} onChange={(e) => { setPreAsta(e.target.checked); invalida(); }} />
                  Pre-asta invernale (prestito gratuito fino all&apos;asta)
                </label>
              </>
            )}

            {tipo === 'rettifica_admin' && (
              <>
                <label>Importo crediti (+/−)
                  <input type="number" value={rettificaImporto} onChange={(e) => { setRettificaImporto(e.target.value); invalida(); }} />
                </label>
                <label>Note
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="motivazione della rettifica" />
                </label>
              </>
            )}
          </div>

          <p className="eyebrow" style={{ marginTop: 18 }}>3 · PREVIEW IMPATTI (OBBLIGATORIA)</p>
          <div className="chip-row">
            <button className="outline" disabled={!proposta || inCorso} onClick={eseguiAnteprima}>
              {inCorso ? 'Calcolo…' : 'Calcola anteprima'}
            </button>
            <button className="primary" disabled={!anteprima?.ok || inCorso} onClick={proponi}>
              Proponi operazione
            </button>
          </div>
          {messaggio && <p className={messaggio.startsWith('Operazione proposta') ? 'esito ok' : 'esito'}>{messaggio}</p>}
        </div>

        {anteprima && (
          <div className="form-card">
            {anteprima.ok ? (
              <>
                <p className="eyebrow" style={{ color: 'var(--green)' }}>NESSUN BLOCCO · IMPATTI</p>
                {anteprima.impatti.map((i) => (
                  <div key={i.squadra} className="impatto">
                    <b>{i.nome}</b>
                    <span>Crediti: {i.budgetPrima} → <b>{i.budgetDopo}</b></span>
                    <span>Monte ingaggi: {eur(i.montePrima)} → <b>{eur(i.monteDopo)}</b></span>
                    <span>Slot pluriennali: {i.slotPrima} → <b>{i.slotDopo}</b></span>
                    <span>Rosa: {i.rosaPrima} → <b>{i.rosaDopo}</b></span>
                  </div>
                ))}
                <p className="muted">La proposta resta Pendente e non tocca alcun saldo fino alla convalida del Super Admin.</p>
              </>
            ) : (
              <>
                <p className="eyebrow" style={{ color: 'var(--red)' }}>OPERAZIONE BLOCCATA DAL RULES ENGINE</p>
                <ul className="violazioni">
                  {anteprima.violazioni.map((v, i) => <li key={i}>{v}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
