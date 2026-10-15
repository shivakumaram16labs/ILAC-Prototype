/* Static checks: JavaScript syntax, local references in index.html, dataset bundle freshness, public-content parity.
   Run: node scripts/check.mjs */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = m => problems.push(m);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// 1. every script/stylesheet/image referenced from index.html exists, and every JS file parses
const html = read('index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);
for (const r of refs) if (!fs.existsSync(path.join(root, r))) fail('index.html references missing file ' + r);
const walk = d => fs.readdirSync(path.join(root, d), {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of [...walk('js'), 'data/demo-data.js', 'data/synthetic-data.js']) {
  try {new vm.Script(read(f), {filename: f});} catch (e) {fail('Syntax error in ' + f + ': ' + e.message);}
}
const unreferenced = walk('js').filter(f => !refs.includes(f.replaceAll(path.sep, '/')));
for (const f of unreferenced) fail('JS file not loaded by index.html: ' + f);

// 2. the bundle equals the CSV set shipped in ILAC_Demo_Datasets_v1.0 (rows and values)
const ctx = vm.createContext({});ctx.window = ctx;
vm.runInContext(read('data/synthetic-data.js'), ctx);
const bundle = ctx.ILAC_SYN;
const csvDir = path.join(root, 'ILAC_Demo_Datasets_v1.0', 'csv');
if (fs.existsSync(csvDir)) {
  for (const file of fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))) {
    const name = file.replace('.csv', ''), sheet = bundle.sheets[name];
    if (!sheet) {fail('Sheet missing from bundle: ' + name);continue;}
    const lines = parseCsv(fs.readFileSync(path.join(csvDir, file), 'utf8').replace(/^﻿/, '')).filter(r => r.some(c => c.trim()));
    if (lines.length - 1 !== sheet.rows.length) fail(name + ': CSV has ' + (lines.length - 1) + ' rows, bundle ' + sheet.rows.length);
    else if (JSON.stringify(lines.slice(1)) !== JSON.stringify(sheet.rows)) fail(name + ': values differ from the CSV (rerun scripts/build-synthetic-data.py)');
  }
}
const total = Object.values(bundle.counts).reduce((a, b) => a + b, 0);
if (total !== 3684) fail('Bundle holds ' + total + ' records, the pack states 3,684');

// 3. public JSON snapshots match the browser bundle
const pub = (() => {const c = vm.createContext({});c.window = c;vm.runInContext(read('data/demo-data.js'), c);return c.ILAC_DATA;})();
for (const k of ['schemes', 'services', 'modules', 'metadata']) {
  if (JSON.stringify(pub[k]) !== JSON.stringify(JSON.parse(read('data/' + k + '.json')))) fail('data/' + k + '.json differs from data/demo-data.js');
}

// 4. no external network calls (all mock APIs run locally in-browser); storage is permitted for reload persistence
for (const f of walk('js')) {
  const src = read(f);
  if (/XMLHttpRequest|\bfetch\s*\(|WebSocket|navigator\.sendBeacon/.test(src)) fail(f + ' uses external network');
}

console.log(problems.length ? problems.map(p => '✗ ' + p).join('\n') : '✓ static checks passed (' + refs.length + ' references, ' + walk('js').length + ' scripts, ' + total + ' dataset records)');
process.exit(problems.length ? 1 : 0);

function parseCsv(text) {
  const rows = [];let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {if (c === '"') {if (text[i + 1] === '"') {cell += '"';i++;} else q = false;} else cell += c;}
    else if (c === '"') q = true;
    else if (c === ',') {row.push(cell);cell = '';}
    else if (c === '\n') {row.push(cell);rows.push(row);row = [];cell = '';}
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) {row.push(cell);rows.push(row);}
  return rows;
}
