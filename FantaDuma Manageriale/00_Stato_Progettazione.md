# Stato Progettazione — FantaDuma Manageriale App
**Versione: 4.0 — 07/07/2026 — Documento master di chiusura progettazione**

Questo documento sostituisce il "Questionario Decisioni Aperte" e traccia le decisioni prese. I documenti 01–03 di questa cartella sono la specifica definitiva da consegnare allo sviluppo.

Gerarchia delle fonti (confermata da Fabio il 07/07/2026):
1. **Regolamento e Statuto 2025.26** → fonte di verità per tutte le regole di gioco ed economiche.
2. **GESTIONALE_UFFICIALE (Google Sheets)** → fonte di verità per dati, enum reali e migrazione.
3. **Pacchetto documenti GPT** → impianto funzionale/tecnico valido (scope MVP, data model, backlog, stack), ma le regole economiche lì contenute sono superate dal regolamento.
4. **Analisi Funzionale V3** → SOLO contesto storico dell'idea. DA IGNORARE come requisito (gamification, stadium builder, sync via sessione, limite 2 obblighi non sono requisiti).

---

## 1. Decisioni chiuse (07/07/2026, confermate da Fabio)

| # | Tema | Decisione |
|---|------|-----------|
| D1 | Scope MVP | Solo core gestionale (rose, contratti, crediti/ingaggi, mercato, storico, audit). Risiko, Stadium Builder e Draft Live Vivaio in Fase 2, ma previsti nel data model per evitare rework |
| D2 | Dati FVM | Fase 1: import manuale di file/snapshot FVM datati (come oggi con i fogli FVM_*). Fase 2: automazione (da valutare rispetto ai ToS Fantacalcio.it) |
| D3 | Permessi | Workflow con approvazione: i presidenti propongono operazioni → stato "Pendente" → convalida/rifiuto dei Super Admin |
| D4 | Migrazione | Stato attuale + storico essenziale (rose, contratti attivi con dati d'origine, budget, FVM d'acquisto, squadra proprietaria originale, anni residui). Storico completo resta archiviato nel foglio |

## 2. Decisioni chiuse perché già scritte nel regolamento

Le seguenti regole NON sono aperte: sono nel Regolamento 2025.26 e sono formalizzate nel doc 02_Regole_Economiche.

- Doppia valuta: **crediti** (virtuali, budget 1000 iniziale, mercato e plusvalenze) e **euro** (ingaggi, salary cap, multe, quote, montepremi). Mai confonderle.
- Salary cap = €250 monte ingaggi, hard limit (minimo €50 versato comunque).
- Ingaggio STD = 10% FVM M al momento dell'asta, arrotondato per ECCESSO a 0,50 €, minimo 0,50 €. Non dipende dal prezzo d'acquisto.
- Maggiorazioni: Obbligo +15% / +15% / +10% (3° anno); Diritto +30% / +30%. Inverno: 1° anno dimezzato (½ STD + maggiorazione).
- Contratti: Standard 1 anno; Diritto 1+1; Obbligo 1+1; Obbligo 1+2; varianti invernali 0,5+1 / 0,5+2. Max 11 slot pluriennali (12 da post asta invernale a fine stagione).
- 5 finestre scambi/stagione, ammortamento ingaggi 20% per finestra; 5ª finestra solo scambi definitivi senza conguagli.
- Svincolo: incasso crediti = FVM M più recente; casistiche estate/inverno e diritto/obbligo dettagliate nel doc 02.
- Formula STIMA = (FVM M inizio × 0,49) + (FVM M fine × 0,44) per giocatori usciti dal listone.
- Rescissione unilaterale: libera lo slot, nessun incasso, ingaggio dovuto per l'intera durata. Non applicabile al vivaio.
- Asteriscati + Osimhen Gate: vedi doc 02 §7.
- Vivaio: 3 slot extra rosa, ingaggio fisso 0,50 €, U21 al draft, permanenza fino a 22 anni, draft in ordine inverso di classifica, promozione/svincolo solo a fine stagione.
- Asta invernale: base d'asta = FVM M del giorno d'asta (non 1 credito).
- Budget crediti persistente tra le stagioni; nessuna ricarica (salvo delibera del consiglio).
- Rosa: min 23 – max 30, minimo 2 portieri.

## 3. Punti chiusi il 07/07/2026 (ex A1–A4)

| # | Punto | Risoluzione |
|---|-------|-------------|
| A1 | Limite max 2 contratti "Obbligo" | NON esiste: era solo in V3 (ignorata). Valgono solo gli 11 slot pluriennali (12 post asta invernale) |
| A2 | Rosa minima | **23** (regole generali + impostazioni + rescissione). Il "min 24" nel capitolo vivaio è un refuso da correggere nella prossima revisione del regolamento |
| A3 | Multe | Solo **euro** → montepremi, escluse dal salary cap. Nessuna decurtazione crediti |
| A4 | Ammortamento ingaggi | **Per finestre: 20% a finestra scambi** (regolamento). Acquisti asta invernale e svincoli a metà anno = 50%. La colonna "Ingaggio 36 giornate" del foglio è solo un dettaglio implementativo, non una regola |

## 4. Fuori scope MVP (confermato)

Voti, risultati, classifiche, calendario, formazioni, mercato ufficiale Fantacalcio.it, sync automatica (fase futura, decisione D2), notifiche push, app nativa, gamification.

## 5. Stato: PROGETTAZIONE CHIUSA ✅ — Prossimi passi

1. Consegna allo sviluppo: docs 00–03 + regolamento PDF + accesso in lettura al GESTIONALE_UFFICIALE per la migrazione.
2. Sprint 0: setup Next.js + Supabase, schema DB (doc 03), import migrazione con quadratura sul foglio.
3. Riscrittura dei test case (09_Test_Cases) sulle regole del doc 02 §12.
