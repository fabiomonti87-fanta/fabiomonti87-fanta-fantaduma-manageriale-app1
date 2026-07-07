# Regole Economiche — Specifica Rules Engine
**Versione 4.0 — 07/07/2026 — Fonte: Regolamento e Statuto Fanta Duma 2025.26 (verificato riga per riga)**
**Sostituisce integralmente "03_Regole_Manageriali" ChatGPT (che conteneva regole inventate/errate).**

## 1. Doppia valuta — regola architetturale n.1

| Grandezza | Unità | Uso | Persistenza |
|---|---|---|---|
| **Crediti** | crediti virtuali | acquisti, cessioni, svincoli, plusvalenze, conguagli scambi, base d'asta | budget per squadra, persistente tra stagioni, 1000 iniziali (solo prima stagione) |
| **Euro** | € reali | ingaggi, salary cap, quota iscrizione, multe, montepremi | contabilità stagionale per squadra, versata a fine anno |

Le due grandezze non si convertono mai l'una nell'altra. Errore n.1 della progettazione precedente: le confondeva.

## 2. Ingaggi

- Ingaggio STD annuo = **10% del FVM M congelato il giorno dell'asta**, arrotondato per **eccesso** a 0,50 €, minimo 0,50 €.
  Formula foglio attuale: `=ARROTONDA.ECCESSO.MAT((FVM/10);0,5;1)` → `ceil_to(fvm * 0.10, 0.5)`.
- L'ingaggio NON dipende dal prezzo d'acquisto (posso pagare un giocatore più o meno del suo FVM M: l'ingaggio resta legato al FVM M).
- Il valore base resta congelato per tutta la durata del contratto.
- Vivaio: ingaggio fisso 0,50 €/anno indipendente dal FVM M.

### Maggiorazioni per tipo contratto (su base FVM M congelato)

| Contratto | Anno 1 | Anno 2 | Anno 3 |
|---|---|---|---|
| Standard (1 anno) | STD +0% | — | — |
| Obbligo 1+1 | STD +15% | STD +15% | — |
| Obbligo 1+2 | STD +15% | STD +15% | STD +10% |
| Diritto 1+1 | STD +30% | STD +30% (se riscattato) | — |
| Varianti invernali (0,5+1 / 0,5+2 / diritto 0,5+1) | ½ STD + stessa maggiorazione | STD + magg. | STD + magg. |

Esempio (FVM M 100 → STD 10,00 €): Obbligo 1+2 → 11,50 / 11,50 / 11,00. Inverno Obbligo 0,5+2 → 6,50 / 11,50 / 11,00.

- Contratti stipulabili solo con giocatori in arrivo dalla lista svincolati; non si cambia contratto a chi ne ha già uno.
- Il contratto segue il giocatore, non la squadra (scambi/cessioni trasferiscono anche il vincolo).
- Contratti pluriennali: gli anni successivi non sono anticipati, si pagano stagione per stagione.

## 3. Salary cap (fairplay finanziario)

- Monte ingaggi max per squadra per stagione: **€250,00 — hard limit**, mai superabile nemmeno temporaneamente → il rules engine BLOCCA il salvataggio di qualsiasi operazione che lo violerebbe.
- Minimo €50,00: se il monte ingaggi non lo raggiunge, la differenza è comunque versata (rilevante solo per contabilità, non blocca operazioni).
- Esclusi dal cap: quota iscrizione (€50) e multe.
- Rientro forzato: se emerge sforamento post-asta, svincoli guidati dagli admin con incasso pari al valore di acquisto in crediti, senza plus/minusvalenze.

## 4. Slot e limiti rosa

- Rosa: min **23** – max 30, minimo 2 portieri. (Il "min 24" nel capitolo vivaio del regolamento è un refuso confermato: vale 23.)
- Slot pluriennali: max **11**; diventano **12** da post asta invernale a fine stagione; tornano 11 alla stagione successiva (il rollover deve segnalare le squadre fuori parametro).
- Il limite slot vale ANCHE durante le operazioni (mai superabile temporaneamente).
- Nessun sub-limite per tipo di contratto pluriennale (il "max 2 obblighi" della V3 non è una regola).
- Vivaio: max 3 slot, extra rispetto alla rosa.

## 5. Ammortamento ingaggi e finestre (metodo confermato: per finestre)

- 5 finestre scambi/stagione: 1) post asta estiva ~15 gg (con pausa per stipula contratti); 2) dal 1° novembre ~15 gg; 3) dal 25 dicembre ~15 gg; 4) a cavallo asta riparazione; 5) dal 1° aprile ~15 gg — SOLO scambi definitivi, senza conguagli crediti, no prestiti, no acquisti/cessioni.
- Ogni finestra ammortizza il **20%** dell'ingaggio annuo: chi cede un giocatore alla finestra N ha già a bilancio (N−1)×20% del suo ingaggio; chi lo riceve prende il residuo.
- Esempio (regolamento): scambio in 3ª finestra, X ingaggio 10 € — la squadra cedente si libera di 6 € (60% residuo), la ricevente prende 6 €.
- Le parti possono accordarsi per una divisione ingaggi diversa, purché NON retroattiva (non si può trasferire quota già maturata). Il campo "divisione ingaggio" dell'operazione è libero con validazione di non-retroattività.
- Regola coerente: acquisti in asta invernale e svincoli a metà anno = 50% dell'ingaggio annuo a bilancio.
- Confermato (07/07/2026): il criterio ufficiale è quello delle finestre. Le colonne "Ingaggio 36 giornate"/"Ingaggio reale" del foglio sono un dettaglio implementativo del gestionale attuale, non una regola da replicare.

## 6. Svincoli — matrice casistiche

Incasso in crediti = FVM M più recente (salvo eccezioni sotto). Permessi solo nei mercati o casi eccezionali.

| Caso | Incasso crediti | Ingaggio residuo dovuto |
|---|---|---|
| STD/pluriennale in scadenza, prima asta estiva | FVM M nuovo listone (o STIMA se assente) | nessuno |
| In scadenza, prima asta invernale | FVM M attuale | 50% dell'anno |
| Diritto non esercitato (estate) | FVM M nuovo listone | nessuno |
| Diritto, svincolo invernale | FVM M attuale | 100% fino a fine anno |
| Obbligo, svincolo estivo | FVM M nuovo listone | 50%/anno per ogni anno residuo |
| Obbligo, svincolo invernale | FVM M attuale | 100% anno corrente + 50%/anno per anni residui |
| Rescissione unilaterale (in sessione di mercato) | **zero** | 100% per l'intera durata (anche pluriennale); non riduce il conteggio riconferme; vietata sotto quota minima rosa; non applicabile al vivaio; applicabile ad asteriscati |
| Vivaio (solo fine stagione) | ultimo FVM M disponibile | — |

### Valori di svincolo nella transizione estiva (1 luglio → nuovo listone)
- Presente nel nuovo listone: FVM M nuovo listone (prima versione pubblicata per gli svincoli in scadenza; per svincoli volontari sotto contratto: FVM M attuale, oppure attesa fine mercato svincoli).
- Non presente nel nuovo listone: **formula STIMA**.
- Depennato dopo la pubblicazione: ultimo FVM M disponibile.
- Rientrato in listone dopo il calcolo STIMA: vale il nuovo valore, STIMA annullata.

## 7. Formula STIMA

`STIMA = (FVM_M_inizio_stagione × 0,49) + (FVM_M_fine_stagione × 0,44)`

- Per giocatori arrivati in corso d'anno: "inizio" = primo valore ufficiale in Serie A.
- Esempio dal regolamento: Osimhen 180 → 350 ⇒ (180×0,49)+(350×0,44) = 242.
- Serve lo storico snapshot FVM per calcolarla → tabella fvm_snapshots obbligatoria.

## 8. Asteriscati e Osimhen Gate

- Asteriscato = rimosso dal listone da Fantacalcio.it (fonte di verità: l'asterisco della redazione) → inutilizzabile.
- Svincolo asteriscato: incasso FVM M del momento.
- Sostituzione: acquisto dalla lista svincolati post ultima asta, a titolo definitivo, al costo del FVM M del sostituto, con FVM M sostituto ≤ FVM M asteriscato. Contratto libero nei limiti. Ingaggio rapportato al momento di inserimento.
- Se asteriscato durante il mercato invernale di Serie A pre-asta: il sostituto è di fatto un prestito gratuito, che torna svincolato all'asta (lista svincolati aggiornata, nuovi arrivi compresi).
- **Osimhen Gate**: giocatore comprato a un'asta e asteriscato prima dell'apertura della successiva sessione di mercato → niente plus/minusvalenza: si incassano i **crediti spesi** (non il FVM M).

## 9. Vivaio

- 3 slot extra, facoltativi. Eligibilità: filtro "under 21" di Fantacalcio.it il giorno del draft; permanenza fino al compimento dei 22 anni.
- Draft post asta estiva: ordine inverso di classifica finale stagione precedente, a giri fino a esaurimento slot. Prezzo = FVM M. Richiede: slot libero, crediti sufficienti, cap ok.
- Contratto vivaio dedicato: 0,50 €/anno, rinnovabile a oltranza fino ai 22 anni.
- Schierabili normalmente in formazione. Occupano solo slot vivaio (mai slot rosa).
- Promozione in prima squadra: solo a fine stagione, gratuita, libera slot vivaio e occupa slot rosa; da lì regole normali.
- Svincolo: solo a fine stagione, incasso = ultimo FVM M.
- A 22 anni: promozione o svincolo a fine stagione.
- Asterisco nel vivaio: può restare (ingaggio 0,50 a bilancio finché rimane) o essere svincolato a fine stagione (ultimo FVM M registrato). Decisione a fine stagione.
- Scambiabili (anche con crediti o altri vivaio) rispettando: slot vivaio destinazione, budget, cap.
- NO rescissione unilaterale.

## 10. Aste

- Estiva: random su tutto il listone + giri a chiamata finali; base 1 credito; budget iniziale 1000 (solo prima stagione storica).
- Invernale (riparazione): a chiamata, ordine inverso di classifica; **base d'asta = FVM M del giorno d'asta**; possibile ricomprare propri ex giocatori; ingaggi al 50% (contratti "inverno").
- FVM M congelato il giorno dell'asta fino all'immissione nel gestionale.

## 11. Multe e contabilità euro

- Mancata formazione: €20/giornata, €40 nelle ultime 5; punti giornata azzerati (0 punti anche con vittoria/pareggio); recupero ultima formazione solo per non falsare i punteggi altrui.
- Multe → **solo euro**, si sommano al montepremi, escluse dal salary cap. Nessuna decurtazione crediti (confermato 07/07/2026).
- Montepremi = quote iscrizione + monte ingaggi totale + multe. Suddivisione: 33/20/12% campionato 1°/2°/3°, 15% somma punti, 13% vincitore coppa, 7% finalista.

## 12. Invarianti del rules engine (test obbligatori)

1. Nessuna operazione confermata è modificabile (solo rettifica admin con audit).
2. Nessun dato storico viene cancellato fisicamente.
3. Σ crediti lega monitorata (10.000 iniziali, può calare: dashboard admin).
4. Cap €250 mai superato, in nessun momento intermedio di un'operazione multi-giocatore.
5. Slot pluriennali ≤ 11 (12 nel periodo post-invernale) in ogni momento intermedio.
6. Rosa 23–30 (min 2 P), vivaio ≤ 3, in ogni momento intermedio.
7. Ogni valore FVM usato in un calcolo referenzia uno snapshot datato (tracciabilità).
8. Ingaggio = ceil_to(FVM×0,10, 0,50) ≥ 0,50 con maggiorazione corretta per tipo/anno contratto.
9. STIMA calcolata solo per assenti dal nuovo listone; annullata se il giocatore rientra.
10. Le operazioni pendenti non modificano alcun saldo finché non convalidate.

I test case xlsx di ChatGPT (TC-001…) vanno riscritti su queste regole: quelli su quote 100/80/60/40/20 come "quote arbitrarie" non sono validi.
