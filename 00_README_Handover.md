# Fantaduma Manageriale — Handover Pack

Data preparazione: 2026-07-05

## Scopo del pacchetto

Questo pacchetto serve a consegnare a sviluppatore e progettista UX/UI tutto il materiale minimo per avviare lo sviluppo dell'app gestionale della lega.

L'app è pensata come gestionale economico-contrattuale della lega, non come sostituto di Fantacalcio.it.

## Contenuto

| File | Uso |
|---|---|
| 01_Product_Brief.md | Contesto, obiettivi, MVP, fuori scope |
| 02_Functional_Requirements.md | Requisiti funzionali e permessi |
| 03_Regole_Manageriali.md | Regole contratti, salary cap, crediti, pro-rata |
| 04_Data_Model_Brief.md | Entità, relazioni, campi e vincoli DB |
| 05_Import_Export_Mapping.xlsx | Template di mapping sorgenti → database |
| 06_UX_Brief.md | Sitemap, viste, flussi e criteri UI |
| 07_Technical_Brief.md | Stack, architettura, ambienti, sicurezza |
| 08_Backlog_MVP.xlsx | Backlog operativo con epic, story e acceptance criteria |
| 09_Test_Cases_Regole.xlsx | Casi di test per validare le regole economiche |
| 10_File_Sorgenti/ | Cartella dove inserire file reali della lega |
| 11_Questionario_Decisioni_Aperte.md | Domande da chiudere prima/dev durante kickoff |
| 12_Kickoff_Prompt_Dev_Designer.md | Brief pronto da incollare a sviluppatore/progettista |

## Ordine consigliato di lettura

1. 01_Product_Brief.md
2. 03_Regole_Manageriali.md
3. 04_Data_Model_Brief.md
4. 05_Import_Export_Mapping.xlsx
5. 09_Test_Cases_Regole.xlsx
6. 08_Backlog_MVP.xlsx
7. 06_UX_Brief.md
8. 07_Technical_Brief.md

## Cosa manca ancora

I file sorgenti reali non sono inclusi in questo pacchetto perché non sono disponibili in questa sessione.
Vanno aggiunti manualmente nella cartella `10_File_Sorgenti`.

File da aggiungere:

- Gestionale ufficiale attuale.
- Export Fantacalcio.it.
- Rose attuali.
- Svincolati.
- Quotazioni/FVM.
- Regolamento lega.
- Regolamento mercato.
- Regolamento contratti.
- Esempi reali di operazioni complesse.

## Nota di progetto

La priorità dell'MVP è la robustezza delle regole e la tracciabilità.
La UI deve essere pulita, tabellare e gestionale.
