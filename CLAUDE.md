# FantaDuma Manageriale — istruzioni di progetto

App gestionale (Next.js 15 + Supabase) per la lega fantacalcio FantaDuma: rose, contratti,
budget in doppia valuta (crediti + euro), operazioni di mercato con rules engine e workflow
di approvazione. Documenti di riferimento del regolamento: file `01_…`–`09_…` nella root.

## REGOLA OBBLIGATORIA: aggiornare il manuale utente

Il manuale d'uso è integrato nell'app: [src/app/manuale/page.tsx](src/app/manuale/page.tsx)
(raggiungibile da `/manuale`, link "Manuale" nella navigazione).

**Ogni modifica che cambia il comportamento visibile dell'app** (nuove pagine, nuovi campi,
nuove regole, modifiche a flussi esistenti, rinomini di voci di menu…) **DEVE includere,
nello stesso commit:**

1. l'aggiornamento della/e sezione/i interessata/e del manuale;
2. una nuova voce in cima all'array `CHANGELOG` in `src/app/manuale/page.tsx`
   (formato data `GG/MM/AAAA`, descrizione breve in italiano di cosa è cambiato per l'utente).

Non serve aggiornare il manuale per refactoring interni, fix senza effetto visibile o
modifiche a test/script. In caso di dubbio, aggiorna il manuale.

## Convenzioni

- Lingua dell'interfaccia, dei commenti e dei messaggi: **italiano**.
- Fabio (committente) non è uno sviluppatore: spiegazioni passo-passo, niente gergo.
- Le operazioni passano sempre dal rules engine server-side (`src/rules`, `src/application`);
  nessuna scrittura diretta ai saldi dalle pagine.
- Test: `npm run test` (vitest) — i test delle regole sono in `src/rules/__tests__`.
