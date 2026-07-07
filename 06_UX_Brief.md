# UX Brief — Fantaduma Manageriale

## 1. Principi UX

L'app deve essere:

- gestionale;
- tabellare;
- veloce da leggere;
- robusta negli stati;
- chiara sugli impatti economici.

Non serve una UX da social app. Serve una UX da pannello amministrativo sportivo/economico.

## 2. Sitemap MVP

- Login
- Dashboard Lega
- Squadre
  - Lista squadre
  - Dettaglio squadra
  - Rosa
  - Contratti
  - Operazioni
- Giocatori
  - Lista giocatori
  - Dettaglio giocatore
- Mercato / Operazioni
  - Nuova operazione
  - Storico operazioni
- Import
- Export
- Audit log
- Impostazioni

## 3. Dashboard lega

### KPI

- Numero squadre.
- Crediti residui per squadra.
- Salary cap usato per squadra.
- Numero giocatori per squadra.
- Operazioni recenti.
- Alert anomalie.

### Alert

- Salary cap superato.
- Contratto senza quota.
- Giocatore duplicato.
- Giocatore senza squadra.
- Operazione non confermata.
- Import con errori.

## 4. Dashboard squadra

Elementi:

- riepilogo crediti;
- salary cap usato/residuo;
- numero giocatori;
- rosa per ruolo;
- contratti in scadenza;
- operazioni recenti;
- prestiti attivi;
- eventuali asteriscati/vivaio.

## 5. Dettaglio giocatore

Tab consigliate:

1. Scheda.
2. Contratto attuale.
3. Storico movimenti.
4. Note.

## 6. Nuova operazione mercato

Flusso consigliato:

1. Seleziona tipo operazione.
2. Seleziona squadra/e.
3. Seleziona giocatore/i.
4. Inserisci dati economici.
5. Mostra preview impatti.
6. Evidenzia eventuali errori.
7. Conferma.
8. Genera storico + audit log.

## 7. Import

Flusso consigliato:

1. Seleziona tipo import.
2. Carica file.
3. Visualizza preview.
4. Mappa colonne.
5. Valida.
6. Mostra errori.
7. Conferma import.
8. Riepilogo esito.

## 8. Design system minimale

### Componenti

- Table.
- Filter bar.
- Search.
- Badge ruolo.
- Badge stato contratto.
- Badge operazione.
- Modal conferma.
- Drawer dettaglio.
- Alert.
- KPI card.
- Form field.
- Import preview table.

### Indicazioni

- Usare badge colorati solo per stati e ruoli.
- Evidenziare in rosso le anomalie economiche.
- Non nascondere mai l'impatto salary cap.
- La preview dell'operazione deve essere obbligatoria prima della conferma.

## 9. Mobile

La UI deve essere responsive, ma il caso d'uso principale è desktop/tablet.

Su mobile:

- consultazione ok;
- modifiche complesse possono essere meno prioritarie;
- tabelle devono diventare card o avere scroll orizzontale.
