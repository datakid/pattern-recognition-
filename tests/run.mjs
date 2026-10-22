import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const out = s => process.stdout.write(s + '\n');
const ORDER = ['util', 'cells', 'writing', 'sequence', 'relations', 'textrel', 'patterns', 'numbers', 'text', 'textui'];
const NAMES = ['UTIL', 'CELL', 'SEQ', 'REL', 'TREL', 'PAT', 'NUMS', 'TXT', 'TUI', 'WRITING', 'CASES', 'X'];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const fixtureOf = c => c.src === undefined || c.nofix ? null : c.fixture || slug(c.name);
const fixturesDir = val('--fixtures') ? path.resolve(val('--fixtures')) : path.join(root, 'tests', 'fixtures');

function load() {
  const ctx = vm.createContext({});
  const exec = (code, filename) => vm.runInContext(code, ctx, { filename });
  for (const n of ORDER) {
    const file = path.join(root, 'js', n + '.js');
    if (!fs.existsSync(file)) continue;
    const code = fs.readFileSync(file, 'utf8');
    if (n === 'writing') exec("const REF = {}; const DIRL = { ai: 'AI' }; const checksTable = () => '';", 'writing-stubs');
    exec(code, file);
  }
  exec(fs.readFileSync(path.join(root, 'tests', 'cases.js'), 'utf8'), 'cases.js');
  const G = exec('({' + NAMES.map(n => n + ': typeof ' + n + ' !== "undefined" ? ' + n + ' : null').join(',') + '})', 'globals');
  return { ctx, exec, G };
}

async function runCases(G, only) {
  let pass = 0, fail = 0;
  const lines = [];
  for (const c of G.CASES) {
    if (only && !c.name.includes(only)) continue;
    let r;
    try {
      let A = null, N = null;
      if (c.src !== undefined) { A = G.TXT.analyze(c.src); N = G.NUMS.analyze(A); }
      r = await c.test(N, A, G.X);
    } catch (e) { r = 'threw ' + e.message + '\n  ' + String(e.stack || '').split('\n').slice(1, 4).join('\n  '); }
    if (r === null || r === undefined) pass++; else fail++;
    lines.push((r === null || r === undefined ? 'PASS ' : 'FAIL ') + c.name + (r === null || r === undefined ? '' : '\n  ' + r));
  }
  const drift = [];
  if (fs.existsSync(fixturesDir)) for (const c of G.CASES) {
    if (!fixtureOf(c) || (only && !c.name.includes(only))) continue;
    const f = path.join(fixturesDir, fixtureOf(c) + '.txt');
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== c.src) drift.push(slug(c.name));
  }
  drift.forEach(d => { fail++; lines.push('FAIL fixture drift: tests/fixtures/' + d + '.txt differs from its case source'); });
  out(lines.join('\n'));
  out('\n' + pass + ' passed, ' + fail + ' failed');
  return fail;
}

function syncFixtures(G) {
  fs.mkdirSync(fixturesDir, { recursive: true });
  let n = 0;
  for (const c of G.CASES) if (fixtureOf(c)) { fs.writeFileSync(path.join(fixturesDir, fixtureOf(c) + '.txt'), c.src); n++; }
  out('wrote ' + n + ' fixtures');
}

function goldenOf(G, src) {
  const A = G.TXT.analyze(src), N = G.NUMS.analyze(A);
  const nxt = s => s.next === null || s.next === undefined ? null : s.fmt(s.next);
  const seqOut = (where, s) => ({ where, name: s.name, desc: s.desc, k: s.k, n: s.n, next: nxt(s), filled: (s.filled || []).map(f => [f.i + 1, s.fmt(f.v)]), ambiguous: !!s.ambiguous, status: s.status, group: s.group });
  const eqs = [], seqs = [], totals = [], bad = [], trel = [], pat = [];
  N.tables.forEach((nt, ti) => {
    if (!nt) return;
    nt.eqs.forEach(e => eqs.push({ table: ti, text: e.text, k: e.k, n: e.n, exc: e.exc.map(x => [x.row + 1, e.fmt(x.expected), e.fmt(x.found)]), chance: +e.adj.toFixed(3), status: e.status, group: e.group }));
    nt.seqs.forEach(s => seqs.push(seqOut('table ' + ti + ' col ' + s.col, s)));
    nt.totals.forEach(t => totals.push([ti, t]));
    (nt.trel ? nt.trel.results : []).forEach(r => trel.push({ table: ti, family: r.family, headline: r.headline, hits: r.hits, n: r.n, chance: r.chance === null ? null : +r.chance.toFixed(3), status: r.status, exc: r.exceptions.map(x => [x.row + 1, String(x.expected), String(x.found)]) }));
    Object.keys(nt.bad).sort().forEach(k => bad.push(ti + '|' + k));
    if (nt.arranged) pat.push({ table: ti, subjects: nt.arranged.subjects.map(s => ({ kind: s.kind, headline: s.primary.headline, words: s.words, visible: s.visible, ambiguous: s.ambiguous, divergeAt: s.divergeAt, equivalents: s.equivalents.map(r => r.headline), rivals: s.rivals.map(r => r.headline), others: s.others.length, implied: s.implied.map(x => x.result.headline), near: s.nearMisses.length })), chain: nt.arranged.chain.map(c => c.text), problems: nt.arranged.problems.map(c => [c.row + 1, c.col, c.reasons.map(x => x.text)]), hidden: nt.arranged.hiddenCount, nearTotal: nt.arranged.nearMissTotal });
  });
  N.lines.forEach(l => l.seqs.forEach(s => seqs.push(seqOut('line ' + l.line, s))));
  return {
    tables: A.tables.map(t => Object.assign({ title: t.title, pattern: t.pattern, head: t.head, rows: t.rows, types: t.types }, t.misfits && t.misfits.length ? { misfits: t.misfits.map(m => [m.line, m.reason]) } : {}, t.alsoReadableAs ? { also: t.alsoReadableAs } : {})),
    removed: A.removed,
    eqs, seqs, totals, bad, trel, pat,
    entities: A.entities.map(e => ({ type: e.type, norm: e.norm, check: e.check })),
    lines: N.lines.map(l => ({ line: l.line, seqs: l.seqs.map(s => s.desc) }))
  };
}

function golden(G, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.txt')).sort();
  for (const f of files) {
    const src = fs.readFileSync(path.join(fixturesDir, f), 'utf8');
    let data;
    try { data = goldenOf(G, src); } catch (e) { data = { threw: e.message }; }
    fs.writeFileSync(path.join(dir, f.replace(/\.txt$/, '.json')), JSON.stringify(data, null, 1) + '\n');
  }
  out('wrote ' + files.length + ' golden files to ' + dir);
}

function perfInputs(G) {
  const rng = G.UTIL.rng(0x5eed), ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const money = v => (Math.round(v * 100) / 100).toFixed(2);
  const table = n => {
    const head = ['Id', 'Score', 'Units', 'Price', 'Revenue', 'Tax', 'Total', 'Mass', 'Pct', 'Sum', 'Noise', 'Ratio'], rows = [head.join('\t')];
    for (let i = 1; i <= n; i++) {
      const score = ri(1, 999), units = ri(1, 99), price = ri(100, 9999) / 100, rev = Math.round(units * price * 100) / 100, tax = Math.round(rev * 20) / 100;
      rows.push([i, score, units, money(price), money(rev), money(tax), money(rev + tax), ri(1, 9999), ri(0, 100), score + units, ri(1, 99999), (ri(1, 99999) / 1000).toFixed(3)].join('\t'));
    }
    return rows.join('\n');
  };
  const line = () => { const v = []; for (let i = 0; i < 200000; i++) v.push(7 * i + 3); for (let k = 0; k < 40; k++) v[ri(0, 199999)] += ri(1, 9); return v.join(', '); };
  const log = () => {
    const L = [];
    for (let i = 0; i < 2000; i++) {
      const k = i % 10;
      if (k < 4) L.push('2026-10-03 14:' + String(ri(0, 59)).padStart(2, '0') + ':' + String(ri(0, 59)).padStart(2, '0') + ' INFO 10.0.' + ri(0, 9) + '.' + ri(1, 250) + ' responded in ' + ri(20, 900) + ' ms');
      else if (k < 6) L.push('Item ' + String.fromCharCode(65 + ri(0, 25)) + ' - ' + ri(1, 9) + ' kg - $' + money(ri(100, 5000) / 100));
      else if (k < 7) L.push('Name: User' + i + ' | Age: ' + ri(18, 80) + ' | City: Cairo');
      else if (k < 8) L.push(ri(1, 99) + ',' + ri(1, 99) + ',' + ri(1, 99) + ',' + ri(1, 99));
      else if (k < 9) L.push('The quick brown fox number ' + i + ' jumps over the lazy dog, and then rests.');
      else L.push('');
    }
    return L.join('\n');
  };
  return { sample: fs.readFileSync(path.join(fixturesDir, 'sample.txt'), 'utf8'), t1000: table(1000), t5000: table(5000), line: line(), log: log() };
}

function perf(G) {
  const I = perfInputs(G), budgets = [['in-app sample', 'sample', 300], ['1,000×12 numeric table', 't1000', 2000], ['5,000×12 numeric table', 't5000', 4000], ['200,000-value number line', 'line', 6000], ['2,000-line mixed log', 'log', 1500]];
  let over = 0;
  for (const [label, key, budget] of budgets) {
    const t0 = performance.now(), A = G.TXT.analyze(I[key]), t1 = performance.now();
    G.NUMS.analyze(A);
    const t2 = performance.now(), total = t2 - t0, hit = total <= budget;
    if (!hit) over++;
    out(label.padEnd(30) + ' text ' + Math.round(t1 - t0) + ' ms · numbers ' + Math.round(t2 - t1) + ' ms · total ' + Math.round(total) + ' ms · budget ' + budget + ' ms · ' + (hit ? 'ok' : 'OVER'));
  }
  return has('--budget') ? over : 0;
}

function calibInputs(G, set, seed) {
  const rng = G.UTIL.rng(seed), ri = (a, b) => a + Math.floor(rng() * (b - a + 1)), pick = a => a[Math.floor(rng() * a.length)];
  const grid = (rows, cols, hi) => { const L = [Array.from({ length: cols }, (_, j) => String.fromCharCode(65 + j)).join('\t')]; for (let i = 0; i < rows; i++) L.push(Array.from({ length: cols }, () => ri(1, hi)).join('\t')); return L.join('\n'); };
  const list = n => Array.from({ length: n }, () => ri(1, 99)).join(', ');
  const cats = () => { const g = ['red', 'green', 'blue', 'gold'], L = ['Group\tValue']; for (let i = 0; i < 24; i++) L.push(pick(g) + '\t' + ri(1, 999)); return L.join('\n'); };
  const cities = ['Paris', 'Berlin', 'Madrid', 'Rome', 'Lisbon', 'Vienna', 'Oslo', 'Dublin'], countries = ['France', 'Germany', 'Spain', 'Italy', 'Portugal', 'Austria', 'Norway', 'Ireland'];
  const words = ['amber', 'birch', 'cedar', 'dune', 'ember', 'fjord', 'grove', 'haze', 'iris', 'jade', 'kelp', 'lark', 'moss', 'nova', 'opal', 'pine', 'quartz', 'reed', 'sage', 'tide', 'umber', 'vale', 'wren', 'yarrow', 'zinc'];
  const places = () => { const used = new Set(), L = ['Name,City,Country']; for (let i = 0; i < 20; i++) { let nm; do nm = pick(words) + ' ' + pick(words) + ri(10, 99); while (used.has(nm)); used.add(nm); L.push([nm, pick(cities), pick(countries)].join(',')); } return L.join('\n'); };
  const make = { big: () => grid(20, 6, 999), small: () => grid(20, 6, 9), cat: cats, list12: () => list(12), list20: () => list(20), places, digits: () => grid(60, 5, 99999) }[set];
  return make;
}

function calibrate(G) {
  const sets = [['6 columns × 20 rows, ints 1–999', 'big', 1000, 1], ['6 columns × 20 rows, ints 1–9', 'small', 1000, 1], ['4-value category + random numbers', 'cat', 1000, 1], ['lists of 12 values, ints 1–99', 'list12', 1000, 1], ['lists of 20 values, ints 1–99', 'list20', 1000, 1], ['City and Country drawn independently', 'places', 1000, 1], ['digit tests, 60 rows × 5 columns', 'digits', 200, 2]];
  let bad = 0;
  for (const [label, set, count, limit] of sets) {
    if (val('--set') && val('--set') !== set) continue;
    const make = calibInputs(G, set, 0xca11b + set.length * 977 + count), fam = {}, ex = [], t0 = performance.now();
    let hit = 0;
    for (let t = 0; t < count; t++) {
      const src = make(), A = G.TXT.analyze(src), N = G.NUMS.analyze(A), found = [];
      if (set === 'digits') N.tables.forEach(nt => nt && nt.digits.forEach(d => { if (/are uneven|differ from|differ only|end in 0 or 5/.test(d)) found.push('digits'); }));
      else {
        N.tables.forEach(nt => {
          if (!nt) return;
          if (nt.arranged) nt.arranged.subjects.forEach(s => { if ([s.primary].concat(s.equivalents, s.rivals, s.others).some(r => r.chance !== null && r.chance !== undefined)) found.push(s.primary.family || s.kind); });
          nt.eqs.forEach(() => found.push('eq'));
          nt.seqs.forEach(() => found.push('seq'));
          (nt.trel ? nt.trel.results : []).forEach(r => { if (r.chance !== null && r.chance !== undefined) found.push(r.family); });
        });
        N.lines.forEach(l => l.seqs.forEach(sq => found.push('line ' + (sq.family || sq.name))));
      }
      if (found.length) { hit++; found.forEach(f => fam[f] = (fam[f] || 0) + 1); if (ex.length < 3) ex.push(src.replace(/\n/g, ' | ').slice(0, 160) + ' → ' + found.join(', ')); }
    }
    const rate = 100 * hit / count, ok = rate <= limit;
    if (!ok) bad++;
    out(label.padEnd(40) + hit + ' of ' + count + ' (' + rate.toFixed(1) + '%) · limit ' + limit + '% · ' + (ok ? 'ok' : 'OVER') + ' · ' + Math.round(performance.now() - t0) + ' ms' + (hit ? ' · ' + JSON.stringify(fam) : ''));
    ex.forEach(e => out('    ' + e));
  }
  return bad;
}

const { G } = load();
let code = 0;
if (has('--sync-fixtures')) syncFixtures(G);
else if (val('--golden')) golden(G, val('--golden'));
else if (has('--perf')) code = perf(G);
else if (has('--calibrate')) code = calibrate(G);
else code = (await runCases(G, val('--only'))) ? 1 : 0;
process.exit(code ? 1 : 0);
