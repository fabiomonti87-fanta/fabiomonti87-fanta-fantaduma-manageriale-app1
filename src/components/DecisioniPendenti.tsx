'use client';

// Area approvazione Super Admin (doc 01 §3.3): convalida / rifiuto / forzatura.
// La convalida rivalida col rules engine e applica in transazione unica server-side.

import { useState, useTransition } from 'react';
import { azioneDecidi } from '../application/azioni';

export interface OpPendente {
  id: string;
  tipo: string;
  descrizione: string;
  propostaDa: string;
  propostaIl: string;
}

export default function DecisioniPendenti({ operazioni }: { operazioni: OpPendente[] }) {
  const [motivi, setMotivi] = useState<Record<string, string>>({});
  const [esiti, setEsiti] = useState<Record<string, string>>({});
  const [inCorso, startTransition] = useTransition();

  const decidi = (opId: string, decisione: 'convalida' | 'rifiuta' | 'forza') => {
    startTransition(async () => {
      const esito = await azioneDecidi(opId, decisione, motivi[opId]);
      setEsiti((prev) => ({ ...prev, [opId]: esito.messaggio }));
    });
  };

  if (operazioni.length === 0) {
    return (
      <section className="section">
        <p className="muted">Nessuna operazione pendente: tutte le proposte sono state decise.</p>
      </section>
    );
  }

  return (
    <section className="section">
      {operazioni.map((op) => (
        <article key={op.id} className="form-card" style={{ marginBottom: 14 }}>
          <p className="eyebrow">{op.tipo.toUpperCase()}</p>
          <h2 style={{ fontSize: 18 }}>{op.descrizione}</h2>
          <p className="muted">Proposta da {op.propostaDa} · {op.propostaIl}</p>
          <div className="chip-row" style={{ marginTop: 14 }}>
            <button className="primary" disabled={inCorso} onClick={() => decidi(op.id, 'convalida')}>Convalida</button>
            <button className="outline danger-btn" disabled={inCorso} onClick={() => decidi(op.id, 'rifiuta')}>Rifiuta</button>
            <button className="outline" disabled={inCorso} title="Applica saltando la rivalidazione (resta in audit)"
              onClick={() => decidi(op.id, 'forza')}>Forza</button>
            <input placeholder="motivo (per il rifiuto)" value={motivi[op.id] ?? ''}
              onChange={(e) => setMotivi((prev) => ({ ...prev, [op.id]: e.target.value }))}
              style={{ flex: 1, minWidth: 220 }} />
          </div>
          {esiti[op.id] && <p className="esito">{esiti[op.id]}</p>}
        </article>
      ))}
    </section>
  );
}
