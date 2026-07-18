import { utenteCorrente } from '../../lib/auth';
import NavLega from '../../components/NavLega';

export const dynamic = 'force-dynamic';

// ============================================================================
// MANUALE UTENTE — FantaDuma Manageriale
// PRASSI DI PROGETTO (vedi CLAUDE.md): ogni modifica funzionale all'app DEVE
// aggiornare questo manuale (sezione interessata + voce nel changelog in fondo).
// ============================================================================

const CHANGELOG: { data: string; testo: string }[] = [
  { data: '18/07/2026', testo: 'Prima versione del manuale integrato: copre tutte le funzioni degli Sprint 0–4 (accesso, dashboard, operazioni, approvazioni, mercato, import FVM).' },
];

function Sezione({ id, titolo, eyebrow, children }: { id: string; titolo: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="section manuale-sezione" id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{titolo}</h2>
      <div className="form-card" style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

export default async function PaginaManuale() {
  const utente = await utenteCorrente();
  const ruolo = utente?.ruolo ?? 'viewer';

  const indice = [
    ['accesso', "1. Accesso all'app"],
    ['ruoli', '2. Ruoli e permessi'],
    ['dashboard', '3. Dashboard di consultazione'],
    ['operazioni', '4. Registro operazioni'],
    ['nuova-operazione', '5. Proporre una nuova operazione'],
    ['approvazioni', '6. Approvazioni (Super Admin)'],
    ['mercato', '7. Mercato, multe e asterischi (Super Admin)'],
    ['import-fvm', '8. Import FVM / listone (Super Admin)'],
    ['glossario', '9. Glossario'],
    ['changelog', '10. Changelog del manuale'],
  ] as const;

  return (
    <main className="app-shell manuale">
      <header className="topbar">
        <div>
          <p className="eyebrow">FANTADUMA MANAGERIALE</p>
          <h1>Manuale d&apos;uso</h1>
        </div>
        <div className="season">Aggiornato al {CHANGELOG[0].data}</div>
      </header>
      <NavLega ruolo={ruolo} attiva="manuale" />

      <section className="section">
        <div className="form-card">
          <p className="eyebrow">INDICE</p>
          <ul className="manuale-indice">
            {indice.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </div>
      </section>

      <Sezione id="accesso" eyebrow="PER TUTTI" titolo="1. Accesso all'app">
        <ol>
          <li>Apri la pagina <b>/login</b> e inserisci la tua email.</li>
          <li>Premi <b>Invia magic link</b>: riceverai un&apos;email con un link di accesso (nessuna password).</li>
          <li>Clicca il link dall&apos;email: verrai riportato nell&apos;app già autenticato.</li>
        </ol>
        <p className="muted">Se non ricevi l&apos;email, controlla lo spam. Il link scade dopo poco tempo: se non funziona, richiedine uno nuovo. In caso di problemi ripetuti, contatta il Super Admin.</p>
        <p>Per uscire usa il logout (rotta <b>/auth/signout</b>).</p>
      </Sezione>

      <Sezione id="ruoli" eyebrow="PER TUTTI" titolo="2. Ruoli e permessi">
        <p>Ogni utente ha uno dei tre ruoli seguenti. Le voci di menu visibili dipendono dal ruolo.</p>
        <table className="manuale-tabella">
          <thead>
            <tr><th>Funzione</th><th>Viewer</th><th>Presidente</th><th>Super Admin</th></tr>
          </thead>
          <tbody>
            <tr><td>Dashboard, rose e contratti, export CSV</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td>Registro operazioni (consultazione)</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td>Proporre operazioni (wizard)</td><td>—</td><td>✅ solo per la propria squadra</td><td>✅ per qualsiasi squadra</td></tr>
            <tr><td>Rettifica admin (crediti +/−)</td><td>—</td><td>—</td><td>✅</td></tr>
            <tr><td>Approvare / rifiutare / forzare operazioni</td><td>—</td><td>—</td><td>✅</td></tr>
            <tr><td>Finestre di mercato, multe, asterischi</td><td>—</td><td>—</td><td>✅</td></tr>
            <tr><td>Import FVM / listone</td><td>—</td><td>—</td><td>✅</td></tr>
          </tbody>
        </table>
      </Sezione>

      <Sezione id="dashboard" eyebrow="PER TUTTI" titolo="3. Dashboard di consultazione">
        <p>La pagina iniziale è il <b>centro di controllo della lega</b> ed è divisa in tre blocchi:</p>
        <ul>
          <li><b>Quadro lega</b> — quattro riquadri riassuntivi: squadre migrate, crediti circolanti totali, giocatori censiti e <b>Attenzioni</b> (squadre con monte ingaggi ≥ 225 € o ≥ 12 slot pluriennali usati).</li>
          <li><b>Situazione squadre</b> — tabella con crediti, monte ingaggi, % di salary cap usato (in rosso sopra il 90%), slot pluriennali (su 12) e numerosità rosa + vivaio. Cliccando una riga si salta alla rosa di quella squadra.</li>
          <li><b>Rose e contratti</b> — elenco giocatori filtrabile per squadra, per sezione (Prima squadra / Vivaio) e con ricerca per nome. Cliccando un giocatore si apre la <b>scheda</b> con contratto, anno, FVM congelato, ultimo FVM, ingaggio, plus/minus latente, scadenza e stato.</li>
        </ul>
        <p><b>Export CSV:</b> due pulsanti scaricano i dati in formato CSV (separatore &quot;;&quot;, apribile con Excel):</p>
        <ul>
          <li><b>CSV budget</b> — una riga per squadra (crediti, monte, cap, slot, rosa, vivaio).</li>
          <li><b>Esporta N</b> — i giocatori attualmente filtrati, con contratto, FVM, ingaggio, prezzo e plus/minus.</li>
        </ul>
      </Sezione>

      <Sezione id="operazioni" eyebrow="PER TUTTI" titolo="4. Registro operazioni">
        <p>La pagina <b>Operazioni</b> elenca le ultime 100 operazioni della lega con tipo, stato, chi le ha proposte e quando sono state decise. Gli stati possibili sono:</p>
        <ul>
          <li><b>In attesa</b> — proposta, in coda per la decisione del Super Admin. Non ha ancora toccato alcun saldo.</li>
          <li><b>Convalidata</b> — approvata e applicata: crediti, ingaggi e rose sono stati aggiornati.</li>
          <li><b>Rifiutata</b> — respinta (con motivo); nessun effetto sui saldi.</li>
          <li><b>Bozza / Annullata</b> — stati residuali, senza effetti.</li>
        </ul>
      </Sezione>

      <Sezione id="nuova-operazione" eyebrow="PRESIDENTI E SUPER ADMIN" titolo="5. Proporre una nuova operazione">
        <p>Il wizard <b>Nuova operazione</b> funziona sempre in tre passi: <b>1)</b> scegli il tipo, <b>2)</b> compila i dettagli, <b>3)</b> calcola l&apos;<b>anteprima impatti (obbligatoria)</b> e poi premi <b>Proponi operazione</b>.</p>
        <p className="muted">I Presidenti operano solo sulla propria squadra (il campo squadra è bloccato). Ogni proposta resta <b>Pendente</b> e non tocca alcun saldo finché il Super Admin non la convalida.</p>

        <h3>Tipi di operazione</h3>
        <ul>
          <li><b>Asta / Asta riparazione</b> — acquisto di uno svincolato: scegli giocatore, prezzo in crediti e tipo di contratto.</li>
          <li><b>Scambio</b> — tra due squadre: seleziona i giocatori ceduti da ciascuna (selezione multipla), un eventuale <b>conguaglio</b> in crediti e la <b>% di ingaggio a carico del ricevente</b> (se lasciata vuota vale il default della finestra corrente; fuori finestra è il 100%).</li>
          <li><b>Svincolo</b> — rilascio di un giocatore scegliendo il <b>caso</b> (scadenza estiva/invernale, diritto non esercitato, obbligo, rescissione unilaterale, asteriscato…): da esso dipendono rimborso e penali secondo il regolamento.</li>
          <li><b>Sostituzione asteriscato</b> — sostituisci un giocatore asteriscato con uno svincolato di <b>FVM minore o uguale</b>; l&apos;opzione <b>pre-asta invernale</b> lo registra come prestito gratuito fino all&apos;asta.</li>
          <li><b>Rettifica admin</b> (solo Super Admin) — correzione manuale di crediti (+/−) con nota di motivazione.</li>
        </ul>

        <h3>Anteprima impatti</h3>
        <p><b>Calcola anteprima</b> passa la proposta al motore delle regole sul server:</p>
        <ul>
          <li>se <b>non ci sono blocchi</b>, vedi per ogni squadra coinvolta l&apos;effetto su crediti, monte ingaggi, slot pluriennali e numerosità rosa (prima → dopo) e puoi proporre;</li>
          <li>se l&apos;operazione <b>viola una regola</b> (budget insufficiente, salary cap, slot esauriti, finestra chiusa, limiti di rosa…), viene bloccata e l&apos;elenco delle violazioni spiega il perché. Il pulsante Proponi resta disabilitato.</li>
        </ul>
        <p className="muted">Qualsiasi modifica ai campi annulla l&apos;anteprima: va ricalcolata prima di proporre.</p>
      </Sezione>

      <Sezione id="approvazioni" eyebrow="SOLO SUPER ADMIN" titolo="6. Approvazioni">
        <p>La pagina <b>Approvazioni</b> mostra tutte le operazioni in attesa, con descrizione leggibile, autore e data. Per ciascuna puoi:</p>
        <ul>
          <li><b>Convalida</b> — l&apos;operazione viene <b>rivalidata</b> dal motore delle regole e, se ancora valida, applicata in un&apos;unica transazione (crediti, ingaggi, rose aggiornati insieme).</li>
          <li><b>Rifiuta</b> — respinge la proposta; compila prima il campo <b>motivo</b> così resta tracciato.</li>
          <li><b>Forza</b> — applica <b>saltando la rivalidazione</b>. Da usare solo in casi eccezionali: l&apos;azione resta comunque registrata nell&apos;audit.</li>
        </ul>
      </Sezione>

      <Sezione id="mercato" eyebrow="SOLO SUPER ADMIN" titolo="7. Mercato, multe e asterischi">
        <h3>Finestre di mercato</h3>
        <p>Crea le finestre della stagione (asta estiva, finestre 1–5, asta invernale, draft vivaio) e gestiscile con <b>Apri</b> / <b>Chiudi</b>. L&apos;apertura di aste e finestre fa avanzare la sessione di mercato (regola &quot;Osimhen Gate&quot;, ammortamenti per finestra). La finestra 5 consente solo scambi definitivi.</p>
        <h3>Multa mancata formazione</h3>
        <p>Registra la multa indicando squadra, giornata e numero totale di giornate: l&apos;importo è calcolato secondo il regolamento (doc 02 §11) e finisce nel registro multe in euro.</p>
        <h3>Asterisco dalla redazione</h3>
        <p>Segna un giocatore in rosa come <b>asteriscato</b> (fuori lista redazione): l&apos;ingaggio resta a bilancio e la squadra matura il diritto al sostituto con FVM ≤ asteriscato (vedi sezione 5, &quot;Sostituzione asteriscato&quot;).</p>
      </Sezione>

      <Sezione id="import-fvm" eyebrow="SOLO SUPER ADMIN" titolo="8. Import FVM / listone">
        <p>Aggiorna le quotazioni caricando il file Excel di Fantacalcio (colonne <b>Id</b>, <b>Nome</b>, <b>FVM M</b>; formati .xlsx, .xls o .csv):</p>
        <ol>
          <li>Scegli il file, la <b>data snapshot</b> e il <b>tipo</b>: Aggiornamento FVM, Listone estivo o Listone invernale.</li>
          <li>Per i listoni, spunta <b>Crea i giocatori non presenti</b> se vuoi censire i nuovi nomi (altrimenti verranno ignorati).</li>
          <li>Premi <b>Carica e valida</b>: la preview mostra righe totali, giocatori abbinati, nuovi e righe scartate (senza FVM valido).</li>
          <li>Premi <b>Conferma import</b>: import e snapshot vengono scritti in un&apos;unica transazione con log. Fino alla conferma non viene scritto nulla.</li>
        </ol>
      </Sezione>

      <Sezione id="glossario" eyebrow="RIFERIMENTO" titolo="9. Glossario">
        <ul>
          <li><b>FVM</b> — Fantavoto di mercato, la quotazione del giocatore. Il <b>FVM congelato</b> è quello fissato al momento dell&apos;acquisto; l&apos;<b>ultimo FVM</b> è quello dell&apos;ultimo import.</li>
          <li><b>Plus/minus latente</b> — differenza tra ultimo FVM e valore di carico: quanto guadagneresti/perderesti oggi.</li>
          <li><b>Monte ingaggi</b> — somma degli ingaggi (in euro) a bilancio della squadra, soggetta al salary cap.</li>
          <li><b>Slot pluriennali</b> — contratti pluriennali attivi, massimo 12 per squadra.</li>
          <li><b>Asteriscato</b> — giocatore escluso dalla lista della redazione; dà diritto a un sostituto con FVM ≤.</li>
          <li><b>Conguaglio</b> — crediti che una squadra aggiunge in uno scambio per pareggiare il valore.</li>
          <li><b>Finestra di mercato</b> — periodo in cui le operazioni sono consentite; regole e percentuali dipendono dalla finestra.</li>
        </ul>
      </Sezione>

      <Sezione id="changelog" eyebrow="STORIA DEL DOCUMENTO" titolo="10. Changelog del manuale">
        <p className="muted">Ogni modifica all&apos;app comporta l&apos;aggiornamento di questo manuale: qui trovi la storia delle revisioni (la più recente in alto).</p>
        <ul>
          {CHANGELOG.map((v) => <li key={v.data + v.testo}><b>{v.data}</b> — {v.testo}</li>)}
        </ul>
      </Sezione>
    </main>
  );
}
