const TREL = (() => {
  const { MAX_LOG10P, MIN_SUPPORT, log10Tail, adjust, rngFor, shuffle } = UTIL;
  const ID_NAME = /\b(id|no\.?|number|code|ref|sku|email)\b/i, SI_COL = / \(SI\)(?: \d+)?$/;
  const MIN_ROWS = 5, MIN_ID_ROWS = 8, MIN_REPEATS = 3, MAX_EXC = 1000, SHUFFLES = 200, MAX_TEXT = 8, MAX_INPUT = 10, SAMPLE = 15, MAX_CATS = 12, MIN_PER_VALUE = 3, SHAPE_SHARE = .8, DISTINCT_SHARE = .9, SPELL_LEN = 5, SEPS = ['', ' ', '-', '_', '.', ', ', '/'];
  const title = s => s.toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  const VARIANTS = [['', s => s], ['lowercase ', s => s.toLowerCase()], ['title case ', title]];
  const shapeOf = s => s.replace(/\p{L}/gu, 'A').replace(/\d/g, '9');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const rowsText = (V, idx) => idx.slice(0, 4).map(i => V.dataRows[i] + 1).join(', ') + (idx.length > 4 ? ' …' : '');

  function ed1(a, b) {
    if (a === b) return false;
    const d = a.length - b.length;
    if (d > 1 || d < -1) return false;
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (d === 0) return a.slice(i + 1) === b.slice(i + 1);
    return d > 0 ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }

  function columnsOf(V) {
    const out = [];
    V.head.forEach((name, j) => {
      const kind = V.colKinds[j];
      if (!kind || SI_COL.test(name) || (j > 0 && name === V.head[j - 1] + ' currency')) return;
      const vals = V.dataRows.map(r => String(V.rows[r][j] ?? '').trim()), filled = [], idx = new Map();
      vals.forEach((v, i) => { if (!v) return; filled.push(i); const a = idx.get(v); if (a) a.push(i); else idx.set(v, [i]); });
      out.push({ j, name, vals, filled, idx, n: filled.length, distinct: idx.size, kind, textual: kind === 'text' });
    });
    return out;
  }

  const excOf = (V, i, expected, found, reason) => ({ row: V.dataRows[i], label: V.label(V.dataRows[i]), expected, found, diff: reason, reason });

  function make(V, o) {
    const exc = o.exc || [], pos = o.excCol === undefined ? o.cols[0] : o.excCol;
    exc.forEach(e => { e.col = pos; e.text = e.reason + ' (' + o.form + ')'; });
    return {
      id: 'text:' + V.key + ':' + o.cols.join(',') + '|' + o.family + '|' + o.form, kind: 'text',
      subject: { kind: o.kind || 'column', table: V.key, cols: o.cols, line: null }, scope: { kind: 'all', rows: null, label: '' },
      family: o.family, rank: o.rank, params: o.params || 0, key: o.key, form: o.form, headline: o.headline,
      hits: o.hits, n: o.n, exact: o.hits, rounded: 0, exceptions: exc, excN: o.excN === undefined ? exc.length : o.excN,
      log10p: o.log10p === undefined ? null : o.log10p, chance: o.chance === undefined ? null : o.chance, tested: o.tested || 0,
      next: o.next || null, fills: [], predictions: null, status: o.status || 'observation', group: null, parts: [], explainedBy: {},
      evidence: o.evidence || {}, name: o.name || '', fmt: String, d: 0, unit: ''
    };
  }

  function uniqueness(V, cols) {
    const out = [];
    for (const c of cols) {
      const named = ID_NAME.test(c.name), many = c.n >= 10 && c.distinct >= DISTINCT_SHARE * c.n;
      if (c.n < 3 || !(named || many) || c.kind === 'date' || (c.kind === 'num' && !named)) continue;
      const exc = [], repeated = [];
      let dup = 0;
      c.idx.forEach((rows, v) => { if (rows.length < 2) return; repeated.push([v, rows]); rows.slice(1).forEach(i => { dup++; if (exc.length < MAX_EXC) exc.push(excOf(V, i, 'a value not used before', v, 'duplicate of row ' + (V.dataRows[rows[0]] + 1))); }); });
      if (!dup && !named) continue;
      exc.sort((a, b) => a.row - b.row);
      const first = repeated[0];
      out.push(make(V, {
        cols: [c.j], family: 'unique', rank: 0, key: 'unique:' + c.j, form: c.name + ' is unique', name: c.name, hits: c.n - dup, n: c.n, exc, excN: dup,
        headline: dup ? 'Duplicate ' + c.name + ': ' + first[0] + ' appears in rows ' + rowsText(V, first[1]) + (repeated.length > 1 ? ' (and ' + plural(repeated.length - 1, 'more repeated value') + ')' : '') : 'All ' + c.n + ' values in ' + c.name + ' are different',
        evidence: { how: ['Every non-empty value in ' + c.name + ' was compared with the others.', named ? 'The column name suggests an identifier.' : c.distinct + ' of ' + c.n + ' values are distinct.'], repeated: repeated.length }
      }));
    }
    return out;
  }

  function formats(V, cols) {
    const out = [];
    for (const c of cols) {
      if (!c.textual || c.n < MIN_ROWS || c.distinct < 2) continue;
      const counts = new Map();
      c.filled.forEach(i => { const s = shapeOf(c.vals[i]), a = counts.get(s); if (a) a.push(i); else counts.set(s, [i]); });
      let top = null;
      counts.forEach((rows, s) => { if (!top || rows.length > top[1].length) top = [s, rows]; });
      if (top[1].length < SHAPE_SHARE * c.n) continue;
      const shape = top[0];
      if (!/[^A]/.test(shape) && !c.filled.every(i => c.vals[i] === c.vals[i].toUpperCase())) continue;
      const exc = [];
      counts.forEach((rows, s) => { if (s !== shape) rows.forEach(i => { if (exc.length < MAX_EXC) exc.push(excOf(V, i, shape, c.vals[i], 'format ' + s)); }); });
      exc.sort((a, b) => a.row - b.row);
      out.push(make(V, {
        cols: [c.j], family: 'format', rank: 1, key: 'format:' + c.j, form: shape, name: c.name, hits: top[1].length, n: c.n, exc, excN: c.n - top[1].length,
        headline: c.name + ': Format ' + shape + ' in ' + top[1].length + ' of ' + c.n + ' rows',
        evidence: { how: ['Letters were written as A and digits as 9; ' + top[1].length + ' of ' + c.n + ' values have the shape ' + shape + '.'], shape }
      }));
    }
    return out;
  }

  const rendered = (tpl, n) => tpl.pre + (tpl.pad ? String(n).padStart(tpl.pad, '0') : String(n)) + tpl.suf;

  function idSequences(V, cols) {
    const cands = [];
    for (const c of cols) {
      if (!c.textual || c.n < MIN_ID_ROWS) continue;
      const tpls = new Map();
      c.filled.forEach(i => { const x = /^(\D*?)(\d+)(\D*)$/.exec(c.vals[i]); if (!x) return; const k = x[1] + '\u0000' + x[3], a = tpls.get(k); if (a) a.push([i, x[2]]); else tpls.set(k, [[i, x[2]]]); });
      let top = null;
      tpls.forEach((rows, k) => { if (!top || rows.length > top[1].length) top = [k, rows]; });
      if (!top || top[1].length < MIN_ID_ROWS || top[1].length < SHAPE_SHARE * c.n) continue;
      const [pre, suf] = top[0].split('\u0000'), widths = new Set(top[1].map(e => e[1].length));
      const seen = new Map(), dups = new Map(), pos = [], xs = [];
      const back = [];
      let prev = null;
      top[1].forEach(([i, d]) => { const v = BigInt(d); if (seen.has(v)) { dups.set(i, seen.get(v)); if (prev !== null && v < prev) back.push([i, v]); } else { seen.set(v, i); pos.push(i); xs.push(v); } prev = v; });
      cands.push({ c, tpl: { pre, suf, pad: widths.size === 1 ? [...widths][0] : 0 }, x: xs, pos, dups, back });
    }
    const out = [];
    for (const { c, tpl, x, pos, dups, back } of cands) {
      const res = SEQ.analyze(x, { d: 0, seed: [V.key, 'trel', 'id', c.j], columns: true, date: false, cols: cands.length });
      if (!res || res.family !== 'step') continue;
      const pr = res.predictions;
      let step = null;
      for (let k = 2; k < x.length && step === null; k++) if (pr[k] !== null && pr[k - 1] !== null && !/\//.test(pr[k] + pr[k - 1])) step = BigInt(pr[k]) - BigInt(pr[k - 1]);
      if (step === null || step === 0n) continue;
      const exc = [];
      res.exc.forEach(e => {
        const k = e.i, v = e.found, reason = k > 0 && v < x[k - 1] ? 'out of order' : 'breaks the sequence';
        exc.push(excOf(V, pos[k], rendered(tpl, e.expected.n), rendered(tpl, v), reason));
      });
      back.forEach(([i, v]) => exc.push(excOf(V, i, 'a later number', rendered(tpl, v), 'out of order')));
      exc.sort((p, q) => p.row - q.row);
      const missing = res.gaps.map(g => rendered(tpl, g)), lo = rendered(tpl, x[0]), hi = rendered(tpl, x[x.length - 1]);
      out.push(make(V, {
        cols: [c.j], family: 'idseq', rank: 2, key: 'idseq:' + c.j, form: c.name + ' steps by ' + step, name: c.name, hits: res.k, n: res.n, exc, excN: res.excN + back.length,
        headline: c.name + ' numbers step by ' + step + ' (' + lo + ' to ' + hi + ')' + (missing.length ? ', missing ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ' …' : '') : '') + (dups.size ? ', ' + plural(dups.size, 'repeated value') : ''),
        log10p: res.log10p, chance: res.adj, tested: res.tested * res.cols, status: 'primary', next: res.next ? rendered(tpl, res.next.n) : null,
        evidence: { how: ['The number inside each ' + c.name + ' value was taken out (' + (tpl.pre || '') + '#' + (tpl.suf || '') + '), repeated values were set aside, and the rest went through the same sequence check as a number column.'], missing, template: tpl, step: String(step), explain: res.explain }
      }));
    }
    return out;
  }

  function groupsOf(X, Y) {
    const rows = [], by = new Map();
    for (const i of X.filled) if (Y.vals[i]) { rows.push(i); const g = by.get(X.vals[i]); if (g) g.push(rows.length - 1); else by.set(X.vals[i], [rows.length - 1]); }
    return { rows, groups: [...by.values()] };
  }
  function agree(groups, codes) {
    let all = 0, hits = 0;
    for (const g of groups) {
      if (g.length === 1) { all++; continue; }
      const cnt = new Map();
      let m = 0;
      for (const p of g) { const k = (cnt.get(codes[p]) || 0) + 1; cnt.set(codes[p], k); if (k > m) m = k; }
      all += m; hits += m - 1;
    }
    return { all, hits };
  }

  function dependencies(V, cols, base) {
    const text = cols.filter(c => c.textual && c.n >= MIN_ROWS).slice(0, MAX_TEXT), repeats = c => { let k = 0; c.idx.forEach(r => { if (r.length > 1) k++; }); return k; };
    const xs = text.filter(c => repeats(c) >= MIN_REPEATS), pairs = [];
    xs.forEach(X => text.forEach(Y => { if (Y !== X && Y.distinct >= 2) pairs.push([X, Y]); }));
    const tested = pairs.length, out = [];
    for (const [X, Y] of pairs) {
      const { rows, groups } = groupsOf(X, Y);
      if (rows.length < MIN_ROWS) continue;
      const trials = groups.reduce((s, g) => s + g.length - 1, 0), codeOf = new Map(), codes = rows.map(i => { const v = Y.vals[i]; if (!codeOf.has(v)) codeOf.set(v, codeOf.size); return codeOf.get(v); });
      if (trials < MIN_REPEATS) continue;
      const real = agree(groups, codes);
      if (real.hits / trials < MIN_SUPPORT) continue;
      const rand = rngFor(V.key, 'fd', X.j, Y.j);
      let sum = 0;
      for (let s = 0; s < SHUFFLES; s++) sum += agree(groups, shuffle(codes, rand)).hits;
      const p0 = (sum + 1) / (SHUFFLES * trials + 2), log10p = log10Tail(trials, real.hits, p0), chance = adjust(log10p, tested + base);
      if (chance > MAX_LOG10P) continue;
      const exc = [], worked = [];
      groups.forEach(g => {
        if (g.length < 2) return;
        const cnt = new Map();
        g.forEach(p => cnt.set(codes[p], (cnt.get(codes[p]) || 0) + 1));
        let best = null;
        g.forEach(p => { if (best === null || cnt.get(codes[p]) > cnt.get(best)) best = codes[p]; });
        const major = Y.vals[rows[g.find(p => codes[p] === best)]];
        if (worked.length < 3) worked.push({ x: X.vals[rows[g[0]]], y: major, count: cnt.get(best), of: g.length });
        g.forEach(p => { if (codes[p] !== best && exc.length < MAX_EXC) exc.push(excOf(V, rows[p], major, Y.vals[rows[p]], X.vals[rows[p]] + ' → ' + Y.vals[rows[p]])); });
      });
      exc.sort((a, b) => a.row - b.row);
      const e0 = exc[0];
      out.push(make(V, {
        cols: [X.j, Y.j], excCol: Y.j, kind: 'column', family: 'fd', rank: 3, key: 'fd:' + X.j + '>' + Y.j, form: X.name + ' → ' + Y.name, name: Y.name, hits: real.all, n: rows.length, exc, excN: rows.length - real.all,
        headline: X.name + ' → ' + Y.name + ' holds in ' + real.all + ' of ' + rows.length + ' rows' + (e0 ? '; row ' + (e0.row + 1) + ' ' + e0.reason + (exc.length > 1 ? ' (and ' + (exc.length - 1) + ' more)' : '') : ''),
        log10p, chance, tested: tested + base, status: 'primary',
        evidence: { how: ['For each ' + X.name + ' value that appears more than once, the most common ' + Y.name + ' was taken as the answer.'], worked, p0, trials, hits: real.hits, shuffles: SHUFFLES, multipliers: { pairs: tested, others: base } }
      }));
    }
    return { results: out, tested };
  }

  function concatTested(cols) {
    const targets = cols.filter(c => c.textual && c.n >= MIN_ROWS && c.distinct >= 3).slice(0, MAX_TEXT), inputs = cols.filter(c => c.n >= MIN_ROWS).slice(0, MAX_INPUT);
    let t = 0;
    targets.forEach(T => { const k = inputs.filter(c => c !== T).length; t += k * (k - 1) * SEPS.length * VARIANTS.length; });
    return { targets, inputs, tested: t };
  }

  function concatenations(V, cols, base, plan) {
    const out = [], { targets, inputs, tested } = plan;
    for (const T of targets) {
      for (const A of inputs) {
        if (A === T) continue;
        for (const B of inputs) {
          if (B === T || B === A) continue;
          const use = T.filled.filter(i => A.vals[i] && B.vals[i]);
          if (use.length < MIN_ROWS) continue;
          const sample = use.slice(0, SAMPLE), need = Math.ceil(MIN_SUPPORT * sample.length);
          let best = null;
          for (const sep of SEPS) {
            for (const [vn, f] of VARIANTS) {
              if (sample.filter(i => T.vals[i] === f(A.vals[i] + sep + B.vals[i])).length < need) continue;
              const hits = use.filter(i => T.vals[i] === f(A.vals[i] + sep + B.vals[i])).length;
              if (hits < MIN_ROWS - 1 || hits < MIN_SUPPORT * use.length) continue;
              if (!best || hits > best.hits) best = { sep, vn, f, hits };
            }
          }
          if (!best) continue;
          const { sep, vn, f, hits } = best, expect = use.map(i => f(A.vals[i] + sep + B.vals[i])), cnt = new Map();
          use.forEach(i => cnt.set(T.vals[i], (cnt.get(T.vals[i]) || 0) + 1));
          let cross = 0;
          use.forEach((i, k) => { cross += (cnt.get(expect[k]) || 0) - (T.vals[i] === expect[k] ? 1 : 0); });
          const m = use.length, p0 = (cross + 1) / (m * (m - 1) + 2), log10p = log10Tail(m, hits, p0), chance = adjust(log10p, tested + base);
          if (chance > MAX_LOG10P) continue;
          const exc = [], worked = [];
          use.forEach((i, k) => { if (T.vals[i] === expect[k]) { if (worked.length < 3) worked.push({ row: V.dataRows[i], a: A.vals[i], b: B.vals[i], result: expect[k] }); } else if (exc.length < MAX_EXC) exc.push(excOf(V, i, expect[k], T.vals[i], 'differs from ' + vn + A.name + ' + ' + B.name)); });
          const sepText = sep === '' ? '' : ' + "' + sep + '"';
          const form = (vn ? vn.trim() + '(' : '') + A.name + sepText + ' + ' + B.name + (vn ? ')' : '');
          out.push(make(V, {
            cols: [T.j, A.j, B.j], kind: 'column', family: 'concat', rank: 4, key: 'concat:' + T.j + '=' + A.j + ',' + B.j + ',' + sep + ',' + vn, form: T.name + ' = ' + form, name: T.name, hits, n: m, exc, excN: m - hits,
            headline: T.name + ' = ' + form, log10p, chance, tested: tested + base, status: 'primary',
            evidence: { how: ['Each ' + T.name + ' value was compared with ' + form + ' built from the same row.'], worked, p0, pairs: m * (m - 1), separator: sep, variant: vn.trim() || 'exact', multipliers: { candidates: tested, others: base } }
          }));
        }
      }
    }
    return out;
  }

  function categories(V, cols) {
    const out = [];
    for (const c of cols) {
      if (!c.textual || c.n < MIN_ROWS || c.distinct < 2 || c.distinct > MAX_CATS || c.n < MIN_PER_VALUE * c.distinct) continue;
      const counts = [...c.idx].map(([v, r]) => [v, r.length]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      out.push(make(V, {
        cols: [c.j], family: 'category', rank: 5, key: 'category:' + c.j, form: c.name + ' categories', name: c.name, hits: c.n, n: c.n, exc: [], excN: 0,
        headline: c.name + ': ' + plural(c.distinct, 'value') + ' — ' + counts.map(e => e[0] + ' ' + e[1]).join(', '),
        evidence: { how: [c.distinct + ' distinct values over ' + c.n + ' rows (at least ' + MIN_PER_VALUE + ' rows per value on average).'], counts }
      }));
      const lower = new Map(), near = [];
      counts.forEach(([v]) => { const k = v.toLowerCase(), a = lower.get(k); if (a) a.push(v); else lower.set(k, [v]); });
      const vs = counts.map(e => e[0]);
      for (let a = 0; a < vs.length; a++) for (let b = a + 1; b < vs.length; b++) {
        if (vs[a].toLowerCase() === vs[b].toLowerCase()) near.push([vs[a], vs[b], 'differs only in capital letters']);
        else if (vs[a].length >= SPELL_LEN && vs[b].length >= SPELL_LEN && ed1(vs[a].toLowerCase(), vs[b].toLowerCase())) near.push([vs[a], vs[b], 'differs by one character']);
      }
      if (!near.length) continue;
      const exc = [], cnt = new Map(counts);
      near.forEach(([a, b, why]) => { const [major, minor] = cnt.get(a) >= cnt.get(b) ? [a, b] : [b, a]; c.idx.get(minor).forEach(i => { if (exc.length < MAX_EXC) exc.push(excOf(V, i, major, minor, '“' + minor + '” ' + why + ' from “' + major + '”')); }); });
      exc.sort((a, b) => a.row - b.row);
      out.push(make(V, {
        cols: [c.j], family: 'spelling', rank: 6, key: 'spelling:' + c.j, form: c.name + ' near-duplicates', name: c.name, hits: c.n - exc.length, n: c.n, exc,
        headline: c.name + ': “' + near[0][1] + '” and “' + near[0][0] + '” may be the same value (' + near[0][2] + ')' + (near.length > 1 ? ', and ' + (near.length - 1) + ' more pair' + (near.length > 2 ? 's' : '') : ''),
        evidence: { how: ['Values of ' + SPELL_LEN + ' or more characters that differ by one character, or only in capital letters, were paired.'], pairs: near }
      }));
    }
    return out;
  }

  function consistency(V, cols) {
    const out = [];
    for (const c of cols) {
      (V.colNotes[c.j] || []).filter(x => !/^decimal comma|could be day\/month/.test(x)).forEach(x => out.push(make(V, {
        cols: [c.j], family: 'consistency', rank: 7, key: 'consistency:' + c.j + ':' + x, form: c.name + ' ' + x, name: c.name, hits: c.n, n: c.n, headline: c.name + ': ' + x,
        evidence: { how: ['Reported by the cell reader while parsing the column.'] }
      })));
    }
    return out;
  }

  function run(V, base = 0) {
    const cols = columnsOf(V), dep = dependencies(V, cols, base), plan = concatTested(cols);
    const results = [].concat(uniqueness(V, cols), formats(V, cols), idSequences(V, cols), dep.results, concatenations(V, cols, base, plan), categories(V, cols), consistency(V, cols));
    results.sort((a, b) => a.rank - b.rank || a.subject.cols[0] - b.subject.cols[0] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return { results, tested: dep.tested + plan.tested };
  }

  return { run };
})();
