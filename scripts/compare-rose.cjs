/* eslint-disable @typescript-eslint/no-require-imports -- script Node CommonJS eseguibile senza transpiler */
const XLSX = require('xlsx');

const gestionalePath = process.argv[2] || 'data/GESTIONALE_UFFICIALE.xlsx';
const rosePath = process.argv[3];
if (!rosePath) throw new Error('Uso: node scripts/compare-rose.cjs <gestionale.xlsx> <rose.xlsx>');

const aliases = {
  '42Do Ceretolo Fc': 'Ceretolo',
  'FC Molino 1980': 'Molino',
  'Le bimbe di Tonali': 'Bimbe di Tonali',
  'MatteoDarmianCalzoni FC': 'Darmian',
  'Nirvana FC': 'Nirvana',
  'S.S. Iperzola': 'Iperzola',
  'Se7eN Fc': 'Seven',
  'Werder Bryan': 'Werder',
  'Woods FC': 'Woods',
  'AS Intomatici': 'AS Intomatici',
};
const attivi = new Set([
  'Asta', 'Asta riparazione', 'Acquistato tit definitivo', 'Acquisito in prestito',
  'Vivaio', 'Promosso da vivaio', 'Svincolato riconferma anno corrente', 'Sost_Asteriscato',
]);

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\*/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const wbG = XLSX.readFile(gestionalePath);
const rowsG = XLSX.utils.sheet_to_json(wbG.Sheets.Gestionale_, { header: 1, defval: null });
const gestionale = new Map(Object.values(aliases).map((s) => [s, []]));
for (const r of rowsG.slice(1)) {
  if (attivi.has(String(r[8] || '').trim()) && gestionale.has(r[2])) {
    gestionale.get(r[2]).push({ id: r[0], nome: String(r[1] || '').trim(), tipo: r[8], contratto: r[5] });
  }
}

const wbR = XLSX.readFile(rosePath);
const rowsR = XLSX.utils.sheet_to_json(wbR.Sheets.TutteLeRose, { header: 1, defval: null });
const rose = new Map(Object.values(aliases).map((s) => [s, []]));
const crediti = new Map();
for (const startCol of [0, 5]) {
  let squadra = null;
  for (const r of rowsR) {
    const cell = String(r[startCol] || '').trim();
    if (aliases[cell]) { squadra = aliases[cell]; continue; }
    const matchCrediti = cell.match(/^Crediti Residui:\s*(\d+)/i);
    if (matchCrediti && squadra) { crediti.set(squadra, Number(matchCrediti[1])); squadra = null; continue; }
    if (squadra && r[startCol + 1] && cell !== 'Ruolo') {
      rose.get(squadra).push({ ruolo: cell, nome: String(r[startCol + 1]).trim(), club: r[startCol + 2], costo: r[startCol + 3] });
    }
  }
}

const result = [];
for (const squadra of gestionale.keys()) {
  const g = gestionale.get(squadra);
  const r = rose.get(squadra);
  const gByNorm = new Map(g.map((x) => [norm(x.nome), x]));
  const rByNorm = new Map(r.map((x) => [norm(x.nome), x]));
  result.push({
    squadra,
    crediti: crediti.get(squadra),
    gestionale: g.length,
    rose: r.length,
    soloGestionale: g.filter((x) => !rByNorm.has(norm(x.nome))),
    soloRose: r.filter((x) => !gByNorm.has(norm(x.nome))),
  });
}
console.log(JSON.stringify(result, null, 2));
