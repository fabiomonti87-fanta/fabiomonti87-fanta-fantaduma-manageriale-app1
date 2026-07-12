'use client';

// Import snapshot FVM / listone: upload → preview → validazione → conferma → log (doc 04 Sprint 4).

import { useRef, useState, useTransition } from 'react';
import { azioneAnteprimaImport, azioneConfermaImport, type EsitoAnteprimaImport } from '../application/azioni';

export default function ImportFvm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [anteprima, setAnteprima] = useState<EsitoAnteprimaImport | null>(null);
  const [dataSnapshot, setDataSnapshot] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState<'listone_estivo' | 'listone_invernale' | 'update'>('update');
  const [creaNuovi, setCreaNuovi] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [inCorso, startTransition] = useTransition();

  const carica = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    startTransition(async () => {
      setMessaggio('');
      setAnteprima(await azioneAnteprimaImport(fd));
    });
  };

  const conferma = () => {
    if (!anteprima?.ok || !anteprima.righe) return;
    const fileName = fileRef.current?.files?.[0]?.name ?? 'import.xlsx';
    startTransition(async () => {
      const esito = await azioneConfermaImport(anteprima.righe!, { dataSnapshot, source, fileName, creaNuovi });
      setMessaggio(esito.messaggio);
      if (esito.ok) setAnteprima(null);
    });
  };

  return (
    <section className="section wizard">
      <div className="form-card">
        <p className="eyebrow">1 · FILE (xlsx quotazioni Fantacalcio: colonne Id, Nome, FVM M)</p>
        <div className="form-grid">
          <label>File
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={() => setAnteprima(null)} />
          </label>
          <label>Data snapshot
            <input type="date" value={dataSnapshot} onChange={(e) => setDataSnapshot(e.target.value)} />
          </label>
          <label>Tipo
            <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              <option value="update">Aggiornamento FVM</option>
              <option value="listone_estivo">Listone estivo</option>
              <option value="listone_invernale">Listone invernale</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={creaNuovi} onChange={(e) => setCreaNuovi(e.target.checked)} />
            Crea i giocatori non presenti (import listone)
          </label>
        </div>
        <div className="chip-row" style={{ marginTop: 12 }}>
          <button className="outline" disabled={inCorso} onClick={carica}>{inCorso ? 'Analisi…' : 'Carica e valida'}</button>
          <button className="primary" disabled={!anteprima?.ok || inCorso} onClick={conferma}>Conferma import</button>
        </div>
        {messaggio && <p className="esito">{messaggio}</p>}
      </div>

      {anteprima && (
        <div className="form-card">
          <p className="eyebrow" style={{ color: anteprima.ok ? 'var(--green)' : 'var(--red)' }}>2 · PREVIEW</p>
          <p>{anteprima.messaggio}</p>
          {anteprima.ok && (
            <div className="impatto" style={{ marginTop: 10 }}>
              <span>Righe nel file: <b>{anteprima.totale}</b></span>
              <span>Giocatori abbinati: <b>{anteprima.abbinati}</b></span>
              <span>Nuovi giocatori: <b>{anteprima.nuovi}</b>{!creaNuovi && anteprima.nuovi! > 0 ? ' (saranno ignorati)' : ''}</span>
              <span>Righe scartate (senza FVM valido): <b>{anteprima.scartate}</b></span>
            </div>
          )}
          <p className="muted">Nessuna scrittura fino alla conferma: import e snapshot vengono registrati in transazione unica con log.</p>
        </div>
      )}
    </section>
  );
}
