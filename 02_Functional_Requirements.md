# Functional Requirements — Fantaduma Manageriale

## 1. Autenticazione

### Requisiti

- Login tramite email/password o magic link.
- Ogni utente deve avere un ruolo.
- Ogni manager può essere associato a una squadra.
- L'admin può gestire tutte le squadre.

### Ruoli

| Ruolo | Descrizione |
|---|---|
| Admin | Gestione completa della lega |
| Manager | Gestione/consultazione della propria squadra |
| Viewer | Sola lettura, opzionale |

## 2. Gestione squadre

### Campi minimi

- Nome squadra.
- Manager.
- Crediti iniziali.
- Crediti residui.
- Salary cap.
- Stato squadra.
- Note.

### Funzioni

- Creare squadra.
- Modificare squadra.
- Consultare dettaglio.
- Vedere rosa.
- Vedere contratti.
- Vedere operazioni.
- Vedere anomalie.

## 3. Gestione giocatori

### Campi minimi

- Nome.
- Ruolo Mantra.
- Squadra reale.
- Quotazione/FVM.
- Stato.
- Identificativo import.
- Note.

### Funzioni

- Ricerca.
- Filtri per ruolo, squadra reale, stato.
- Dettaglio giocatore.
- Storico movimenti.
- Contratto attuale.

## 4. Gestione rose

### Funzioni

- Visualizzare rosa per squadra.
- Filtrare per ruolo/stato.
- Vedere giocatori in rosa.
- Vedere giocatori ceduti/svincolati nello storico.
- Vedere prestiti attivi.
- Vedere vivaio, se applicabile.
- Vedere giocatori asteriscati, se applicabile.

## 5. Gestione contratti

### Funzioni

- Creare contratto.
- Modificare contratto.
- Chiudere contratto.
- Rinnovare contratto.
- Calcolare impatto salary cap.
- Calcolare quota residua.
- Vedere scadenze.

## 6. Operazioni di mercato

Tipi minimi:

- Acquisto.
- Svincolo.
- Scambio.
- Prestito.
- Rinnovo.
- Diritto.
- Obbligo.
- Rettifica manuale admin.

Ogni operazione deve generare:

- modifica rosa;
- modifica contratto, se prevista;
- impatto crediti;
- impatto salary cap;
- storico;
- audit log.

## 7. Import

### Requisiti

- Upload file CSV/XLSX.
- Scelta tipo import.
- Preview dati.
- Validazione colonne.
- Segnalazione errori.
- Conferma manuale.
- Scrittura su database.
- Log import.

### Tipi import

- Giocatori.
- Squadre.
- Rose.
- Contratti.
- Operazioni.
- Quotazioni/FVM.

## 8. Export

### Export minimi

- Rose per squadra.
- Contratti.
- Salary cap.
- Crediti residui.
- Storico operazioni.
- Prestiti.
- Scadenze.
- Audit log admin.

## 9. Audit log

Ogni modifica rilevante deve salvare:

- utente;
- data/ora;
- entità modificata;
- valore precedente;
- valore nuovo;
- operazione correlata.

## 10. Permessi indicativi

| Funzione | Admin | Manager | Viewer |
|---|---:|---:|---:|
| Vedere tutte le squadre | sì | opzionale | sì/no |
| Vedere propria squadra | sì | sì | sì |
| Modificare squadra | sì | no/opzionale | no |
| Importare dati | sì | no | no |
| Esportare dati | sì | solo propria squadra | no/opzionale |
| Registrare operazioni | sì | opzionale con approvazione | no |
| Vedere audit log | sì | no | no |
