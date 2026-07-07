# Regole Manageriali — Fantaduma Manageriale

> Documento da validare con il regolamento ufficiale della lega prima dello sviluppo definitivo.

## 1. Oggetti economici

L'app deve distinguere almeno due dimensioni:

1. Crediti disponibili.
2. Salary cap / monte stipendi.

Queste due grandezze non devono essere confuse se il regolamento le tratta separatamente.

## 2. Salary cap

Valore indicativo emerso: **250**.

Da confermare:

- è fisso per tutte le squadre?
- cambia per stagione?
- può essere modificato da admin?
- cosa succede in caso di superamento?
- quali giocatori entrano nel calcolo?

## 3. Quote stagionali

Quote emerse:

- 100%
- 80%
- 60%
- 40%
- 20%

Interpretazione proposta:

| Quota | Significato |
|---:|---|
| 100% | Giocatore a carico per tutta la stagione |
| 80% | Quota pro-rata su 4/5 stagione |
| 60% | Quota pro-rata su 3/5 stagione |
| 40% | Quota pro-rata su 2/5 stagione |
| 20% | Quota pro-rata su 1/5 stagione |

Da confermare se le quote derivano da date/fasi ufficiali di mercato.

## 4. Acquisto asta estiva

Regola proposta:

- impatto economico: 100%;
- il giocatore entra in rosa;
- si crea un contratto;
- il contratto incide sul salary cap per l'intera stagione.

## 5. Acquisto/svincolo invernale

Regola emersa:

- impatto indicativo: 50%.

Da chiarire:

- 50% vale sia per acquisto sia per svincolo?
- il 50% si applica allo stipendio, ai crediti o a entrambi?
- esistono eccezioni per finestre diverse?

## 6. Scambio

Regola proposta:

- ogni giocatore in uscita genera chiusura/trasferimento del relativo contratto;
- ogni giocatore in entrata genera nuovo contratto o subentro;
- l'impatto sul salary cap deve essere calcolato pro-rata in base alla fase della stagione;
- se previsto, si registra anche conguaglio crediti.

Campi obbligatori:

- squadra A;
- squadra B;
- giocatori in uscita da A;
- giocatori in uscita da B;
- eventuale conguaglio;
- data operazione;
- quota applicata;
- note.

## 7. Prestito

Regola proposta:

- il giocatore resta collegato alla squadra proprietaria;
- viene registrata una squadra utilizzatrice;
- viene definita una quota ingaggio concordata;
- a fine prestito il giocatore torna alla squadra proprietaria o viene riscattato, secondo regolamento.

Da chiarire:

- il prestito consuma slot rosa?
- il prestito incide sul salary cap del proprietario, dell'utilizzatore o di entrambi?
- la quota può essere libera o solo tra valori predefiniti?

## 8. Diritto e obbligo

Regola proposta:

### Diritto

- non trasferisce automaticamente il giocatore;
- crea una clausola/opzione;
- può avere costo o maggiorazione;
- può essere esercitato in una finestra futura.

### Obbligo

- genera un trasferimento futuro vincolato;
- deve essere tracciato subito;
- quando scatta, genera operazione definitiva.

Da chiarire:

- quando si contabilizza l'impatto?
- la maggiorazione è percentuale o fissa?
- l'obbligo occupa budget futuro?

## 9. Svincolo

Regola proposta:

- il giocatore esce dalla rosa attiva;
- il contratto non va cancellato;
- va mantenuto lo storico;
- l'impatto economico dipende dalla fase della stagione.

## 10. Vivaio

Da formalizzare.

Possibili campi:

- flag vivaio;
- data ingresso vivaio;
- data uscita vivaio;
- regole speciali di costo;
- regole speciali di slot rosa.

## 11. Asteriscati

Da formalizzare.

Possibili interpretazioni:

- giocatori con regola speciale;
- giocatori non ancora pienamente disponibili;
- giocatori con vincolo contrattuale;
- giocatori protetti o opzionati.

Serve una definizione ufficiale prima dello sviluppo.

## 12. Esempio di calcolo pro-rata

Esempio:

- Stipendio giocatore: 20.
- Permanenza: 2/5 stagione.
- Quota applicata: 40%.
- Impatto salary cap: 20 × 40% = 8.

Il giocatore deve restare nello storico anche se ceduto, perché il suo impatto residuo concorre al calcolo stagionale.

## 13. Regola tecnica fondamentale

Nessuna operazione economica deve cancellare dati storici.

Le operazioni devono chiudere, trasferire o aggiornare record, ma non rimuovere la traccia di ciò che è avvenuto.
