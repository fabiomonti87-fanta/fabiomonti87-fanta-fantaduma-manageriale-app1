// Report di quadratura da terminale: npx tsx scripts/report-quadratura.ts
import path from 'node:path';
import { parseGestionale } from '../src/migration/parser';
import { quadratura } from '../src/migration/quadratura';

const file = process.argv[2] ?? path.join(process.cwd(), 'data', 'GESTIONALE_UFFICIALE.xlsx');
const dataset = parseGestionale(file);
const report = quadratura(dataset);

console.log('\n=== QUADRATURA MIGRAZIONE (TC-084) ===\n');
console.table(
  report.righe.map((r) => ({
    Squadra: r.squadra,
    'Budget foglio': r.budgetFoglio,
    'Budget app': r.budgetApp,
    'Monte foglio': r.monteFoglio,
    'Monte app': r.monteApp,
    'Slot f/a': `${r.slotFoglio}/${r.slotApp}`,
    'Rosa f/a': `${r.rosaFoglio}/${r.rosaApp}`,
    'Viv f/a': `${r.vivaioFoglio}/${r.vivaioApp}`,
    OK: r.quadra ? 'SI' : 'NO',
  }))
);
console.log(`Totale crediti lega: ${report.totaleCreditiLega}`);
console.log(`QUADRA: ${report.quadra ? 'SI' : 'NO'}\n`);

if (report.violazioniRegole.length) {
  console.log(`--- Violazioni regolamento nei dati reali (${report.violazioniRegole.length}) ---`);
  report.violazioniRegole.forEach((v) => console.log(' *', v));
}
if (report.scostamentiIngaggio.length) {
  console.log(`\n--- Scostamenti ingaggio foglio vs regole (${report.scostamentiIngaggio.length}) ---`);
  report.scostamentiIngaggio.slice(0, 30).forEach((v) => console.log(' *', v));
  if (report.scostamentiIngaggio.length > 30) console.log(`   ... e altri ${report.scostamentiIngaggio.length - 30}`);
}
if (report.bonifica.length) {
  console.log(`\n--- Bonifica (${report.bonifica.length}) ---`);
  report.bonifica.forEach((v) => console.log(' *', v));
}
