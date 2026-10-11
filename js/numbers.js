const NUMS = (() => {
  const MIN_EQ_ROWS = 4, MIN_SEQ = 5, MIN_SUPPORT = .6, MAX_LOG10P = -3, MAX_COLS = 12, MAX_ROWS = 1000, PAIRS = 4000, SHUFFLES = 200, PERM_CAP = 300, SEED = 0x5eed, SHOW_EXC = 5;
  const SKIP_TYPES = new Set(['Date', 'Time', 'Phone', 'IP', 'ID', 'Card number', 'Version', 'UUID', 'IBAN', 'Coordinates', 'Colour', 'Email', 'URL']);
  const TOTAL = /^(?:grand\s+|sub-?)?totals?\b|^sum\b/i;
  const DECLARED = /^(?:grand\s+|sub-?)?total\b|^sum\b|\bamount due\b|\bbalance due\b/i;
  const CURX = '(?:[$€£¥₹]|USD|EUR|GBP|JPY|INR|AED|SAR|EGP|CAD|AUD|CHF|CNY)';
  let rand;

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const decOf = s => { let m = s.match(/^\d{1,3}(?:\.\d{3})+,(\d+)$/); if (m) return m[1].length; if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) return (s.split('.')[1] || '').length; m = s.match(/[.,](\d+)$/); return m ? m[1].length : 0; };
  function cell(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? { v, d: Math.min(6, decOf(String(v))) } : null;
    let s = String(v ?? '').trim(), neg = false; if (!s) return null;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
    if (/^[-−+]/.test(s)) { neg = neg !== (s[0] !== '+'); s = s.slice(1).trim(); }
    s = s.replace(new RegExp('^' + CURX + '\\s?', 'i'), '').replace(new RegExp('\\s?(?:' + CURX + '|%)$', 'i'), '');
    if (/^[-−]/.test(s)) { neg = !neg; s = s.slice(1); }
    if (!/^(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?|\.\d+)$/.test(s)) return null;
    const x = TXT.parseNum(s.replace(/^\./, '0.')); if (!Number.isFinite(x)) return null;
    return { v: neg ? -x : x, d: Math.min(6, decOf(s)) };
  }
  function lgamma(x) {
    const g = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
    x -= 1; let a = g[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += g[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function log10Tail(n, k, p) {
    if (k <= 0) return 0; if (k > n) return -Infinity;
    p = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
    const lc = lgamma(n + 1), lp = Math.log(p), lq = Math.log1p(-p), t = [];
    for (let i = k; i <= n; i++) t.push(lc - lgamma(i + 1) - lgamma(n - i + 1) + i * lp + (n - i) * lq);
    const m = Math.max(...t); return Math.min(0, (m + Math.log(t.reduce((s, v) => s + Math.exp(v - m), 0))) / Math.LN10);
  }
  const normTail = z => { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))), e = y * Math.exp(-z * z / 2); return z >= 0 ? e / 2 : 1 - e / 2; };
  const chiP = (x, k) => normTail((Math.cbrt(x / k) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k)));
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const fmtChance = l => { const q = -l; if (q < 6) return '1 in ' + Number((10 ** q).toPrecision(2)).toLocaleString('en-US'); if (q > 15) return '< 1 in 10¹⁵'; return '1 in 10' + String(Math.floor(q)).split('').map(c => SUP[c]).join(''); };
  const fmtN = (v, d) => v.toFixed(d), signed = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
  const fmtP = p => p < .001 ? '< 0.001' : p.toFixed(3);
  const fmt8 = v => +v.toPrecision(8);
  const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  function mode(arr, key) { const c = new Map(); let best = null, bc = 0; arr.forEach(v => { const k = key(v), n = (c.get(k) || 0) + 1; c.set(k, n); if (n > bc) { bc = n; best = v; } }); return best; }
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  const tol = (col, x) => col.h + 1e-9 * Math.max(1, Math.abs(x));

  function view(t) {
    const rows = t.rows.slice(0, MAX_ROWS), totalRows = [], dataRows = [];
    rows.forEach((r, i) => {
      const isTotal = r.some(c => typeof c === 'string' && c.trim() && !cell(c) && TOTAL.test(c.trim()));
      (isTotal ? totalRows : dataRows).push(i);
    });
    const label = r => { const c = rows[r].find(x => typeof x === 'string' && x.trim() && !cell(x)); return c === undefined ? '' : c.trim(); };
    const cols = [];
    t.head.forEach((name, j) => {
      if (SKIP_TYPES.has(t.types && t.types[j])) return;
      const parsed = rows.map(r => cell(r[j]));
      const nonEmpty = dataRows.filter(r => String(rows[r][j] ?? '').trim() !== ''), nums = dataRows.filter(r => parsed[r]);
      if (!(nums.length >= 3 && nums.length >= .8 * nonEmpty.length)) return;
      const d = Math.max(...nums.map(r => parsed[r].d));
      cols.push({
        j, name, vals: parsed.map(p => p ? p.v : null), d, h: .5 * 10 ** -d,
        pct: /%/.test(name) || (t.types && t.types[j]) === 'Percent',
        distinct: new Set(dataRows.map(r => parsed[r] ? parsed[r].v : null).filter(v => v !== null)).size,
        cur: t.head[j + 1] === name + ' currency' ? j + 1 : -1,
        nums: nums.map(r => parsed[r].v)
      });
    });
    return { rows, totalRows, dataRows, label, cols, eqCols: cols.filter(c => c.distinct >= 3).slice(0, MAX_COLS), constCols: cols.filter(c => c.distinct === 1) };
  }

  function evalRel(V, T, rowList, predict, params, rank, rhs) {
    const use = rowList.filter(r => predict(r) !== null && predict(r) !== undefined && T.vals[r] !== null), n = use.length;
    if (n < MIN_EQ_ROWS) return null;
    const hits = use.filter(r => Math.abs(predict(r) - T.vals[r]) <= tol(T, T.vals[r])), k = hits.length;
    if (k < params + 3 || k / n < MIN_SUPPORT) return null;
    const P = use.map(predict), Y = use.map(r => T.vals[r]);
    let ph = 0, pairs = 0;
    const hit = (i, j) => { if (Math.abs(P[i] - Y[j]) <= tol(T, Y[j])) ph++; pairs++; };
    if (n * (n - 1) <= PAIRS) { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) hit(i, j); }
    else for (let q = 0; q < PAIRS; q++) { const i = Math.floor(rand() * n); let j = Math.floor(rand() * (n - 1)); if (j >= i) j++; hit(i, j); }
    const p0 = (ph + 1) / (pairs + 2);
    const hitSet = new Set(hits);
    return {
      kind: 'eq', target: T.j, rhs, text: T.name + ' = ' + rhs, k, n, params, rank,
      log10p: log10Tail(n - params, k - params, p0),
      exc: use.filter(r => !hitSet.has(r)).map(r => ({ row: r, label: V.label(r), expected: predict(r), found: T.vals[r], d: T.d }))
    };
  }

  function candidates(V, ctx) {
    const out = [], { eqCols, constCols, dataRows } = V;
    const add = c => { if (c) out.push(c); };
    const pairsOf = (T) => { const o = eqCols.filter(c => c !== T), r = []; for (let a = 0; a < o.length; a++) for (let b = a + 1; b < o.length; b++) r.push([o[a], o[b]]); return r; };
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        ctx.tested++;
        add(evalRel(V, T, dataRows, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] + B.vals[r], 0, 0, A.name + ' + ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        ctx.tested++;
        add(evalRel(V, T, dataRows, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] * B.vals[r], 0, 1, A.name + ' × ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A0, B0]) => {
        if (A0.pct === B0.pct) return;
        const A = A0.pct ? B0 : A0, B = A0.pct ? A0 : B0;
        ctx.tested++;
        add(evalRel(V, T, dataRows, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] * B.vals[r] / 100, 0, 2, A.name + ' × ' + B.name + (/%\s*$/.test(B.name) ? '' : ' %')));
      });
    });
    const runs = new Map();
    eqCols.forEach((T, p) => {
      const tried = new Set();
      for (let L = 3; L <= Math.min(8, p); L++) {
        const inp = eqCols.slice(p - L, p);
        tried.add(inp.map(c => c.j).join(','));
        ctx.tested++;
        const rhs = L <= 4 ? inp.map(c => c.name).join(' + ') : inp[0].name + ' + … + ' + inp[L - 1].name;
        add(evalRel(V, T, dataRows, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, rhs));
      }
      runs.set(T, tried);
    });
    if (eqCols.length >= 4) {
      eqCols.forEach(T => {
        const inp = eqCols.filter(c => c !== T), key = inp.map(c => c.j).join(',');
        if (runs.get(T).has(key)) return;
        ctx.tested++;
        add(evalRel(V, T, dataRows, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, 'sum of the other columns'));
      });
    }
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A.j >= T.j) return;
        ctx.tested++;
        const ratios = dataRows.filter(r => A.vals[r] !== null && T.vals[r] !== null && A.vals[r] !== 0).map(r => T.vals[r] / A.vals[r]);
        if (!ratios.length) return;
        const c = median(ratios);
        if (!Number.isFinite(c) || c === 0) return;
        const hitsAt = cs => dataRows.filter(r => A.vals[r] !== null && T.vals[r] !== null && Math.abs(cs * A.vals[r] - T.vals[r]) <= tol(T, T.vals[r])).length;
        const ref = hitsAt(+c.toPrecision(6));
        let cs = +c.toPrecision(6);
        for (let s = 1; s <= 6; s++) { const x = +c.toPrecision(s); if (hitsAt(x) >= ref) { cs = x; break; } }
        let rhs;
        if (cs === 1) rhs = A.name;
        else {
          const kv = K => K.vals[dataRows.find(r => K.vals[r] !== null)];
          const K = constCols.find(K => Math.abs(kv(K) - cs) <= K.h || (K.pct && Math.abs(kv(K) / 100 - cs) <= K.h / 100));
          if (K) rhs = A.name + ' × ' + K.name + ' (' + kv(K) + (K.pct ? '%' : '') + ')';
          else rhs = A.name + ' × ' + cs + (cs > 0 && cs < 1 && Math.abs(cs * 100 - +(cs * 100).toFixed(2)) < 1e-9 ? ' (' + +(cs * 100).toFixed(2) + '%)' : '');
        }
        add(evalRel(V, T, dataRows, r => A.vals[r] === null ? null : cs * A.vals[r], 1, 4, rhs));
      });
    });
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A.j >= T.j) return;
        ctx.tested++;
        const diffs = dataRows.filter(r => A.vals[r] !== null && T.vals[r] !== null).map(r => T.vals[r] - A.vals[r]);
        if (!diffs.length) return;
        const b = +median(diffs).toFixed(T.d);
        if (b === 0) return;
        add(evalRel(V, T, dataRows, r => A.vals[r] === null ? null : A.vals[r] + b, 1, 5, A.name + (b > 0 ? ' + ' : ' − ') + fmtN(Math.abs(b), T.d)));
      });
    });
    const prev = new Map(); dataRows.forEach((r, i) => { if (i > 0) prev.set(r, dataRows[i - 1]); });
    const withPrev = dataRows.filter(r => prev.has(r));
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A === T) return;
        [1, -1].forEach(sign => {
          ctx.tested++;
          const rowList = withPrev;
          add(evalRel(V, T, rowList, r => { const pv = T.vals[prev.get(r)], a = A.vals[r]; return pv === null || a === null ? null : pv + sign * a; }, 0, 6, 'previous ' + T.name + (sign > 0 ? ' + ' : ' − ') + A.name));
        });
      });
    });
    return out;
  }

  function extend(x, q, c) { const rows = [x.slice()]; for (let i = 1; i <= q; i++) { const p = rows[i - 1]; rows.push(p.slice(1).map((v, j) => v - p[j])); } let add = c; for (let i = q - 1; i >= 0; i--) add = rows[i][rows[i].length - 1] + add; return add; }

  function seqChecks(x, rowsIdx, col, ctx, label) {
    const out = [];
    if (x.length < MIN_SEQ) return out;
    const n = x.length, d = col.d, w = 10 ** -d, bin = v => Math.round(v / w);
    const diffsOf = (a, q) => { let cur = a.slice(); for (let i = 0; i < q; i++) cur = cur.slice(1).map((v, j) => v - cur[j]); return cur; };
    const finish = (desc, kind, params, trials, k, hitsFn, excs, next, gaps, rank) => {
      if (k < params + 3 || k / trials < MIN_SUPPORT) return;
      const cap = x.slice(0, PERM_CAP);
      let sum = 0, tp = 0;
      for (let s = 0; s < SHUFFLES; s++) { const sh = shuffle(cap); sum += hitsFn(sh); tp += hitsFn.trials(sh); }
      const p0 = (sum + 1) / (tp + 2);
      out.push({
        kind: 'seq', seqKind: kind, name: col.name, desc, k, n: trials, params, rank, d,
        log10p: log10Tail(trials - params, k - params, p0),
        exc: excs.map(e => ({ row: rowsIdx[e.i], label: label ? label(rowsIdx[e.i]) : '', expected: e.expected, found: e.found, d })),
        next: k === trials ? next : null, gaps: gaps || [], col: col.j
      });
    };
    ctx.tested++;
    {
      const df = []; for (let i = 0; i < n - 1; i++) df.push(x[i + 1] - x[i]);
      const s = mode(df, v => bin(v));
      if (s !== null && bin(s) !== 0) {
        const hit = (a, i) => Math.abs(a[i + 1] - a[i] - s) <= tol(col, a[i + 1]);
        let k = 0; const excs = [], gaps = [];
        for (let i = 0; i < n - 1; i++) {
          if (hit(x, i)) { k++; continue; }
          const diff = x[i + 1] - x[i], m = Math.round(diff / s);
          if (m >= 2 && m <= 10 && Math.abs(diff - m * s) <= tol(col, x[i + 1])) { for (let q = 1; q < m && gaps.length < 10; q++) gaps.push(x[i] + s * q); }
          else excs.push({ i: i + 1, expected: x[i] + s, found: x[i + 1] });
        }
        const fn = a => { let c = 0; for (let i = 0; i < a.length - 1; i++) if (hit(a, i)) c++; return c; };
        fn.trials = a => a.length - 1;
        finish('steps by ' + fmtN(s, d), 'step', 1, n - 1, k, fn, excs, x[n - 1] + s, gaps, 0);
      }
    }
    ctx.tested++;
    if (x.every(v => v !== 0 && Math.sign(v) === Math.sign(x[0]))) {
      const rs = []; for (let i = 0; i < n - 1; i++) rs.push(x[i + 1] / x[i]);
      const rr = mode(rs, v => v.toPrecision(4));
      const r = rr === null ? 1 : +rr.toPrecision(4);
      if (Math.abs(r - 1) >= 1e-9) {
        const hit = (a, i) => Math.abs(a[i + 1] - r * a[i]) <= tol(col, a[i + 1]);
        let k = 0; const excs = [];
        for (let i = 0; i < n - 1; i++) { if (hit(x, i)) k++; else excs.push({ i: i + 1, expected: r * x[i], found: x[i + 1] }); }
        const fn = a => { let c = 0; for (let i = 0; i < a.length - 1; i++) if (hit(a, i)) c++; return c; };
        fn.trials = a => a.length - 1;
        finish('× ' + r + ' each row', 'ratio', 1, n - 1, k, fn, excs, x[n - 1] * r, null, 1);
      }
    }
    [2, 3].forEach(q => {
      ctx.tested++;
      if (n - q < 1) return;
      const D = diffsOf(x, q), c = mode(D, v => bin(v));
      if (c === null || bin(c) === 0) return;
      const hit = (Dq, a, i) => Math.abs(Dq[i] - c) <= tol(col, a[i + q]);
      let k = 0; const excs = [];
      for (let i = 0; i < D.length; i++) { if (hit(D, x, i)) k++; else excs.push({ i: i + q, expected: x[i + q] - D[i] + c, found: x[i + q] }); }
      const fn = a => { const Dq = diffsOf(a, q); let h = 0; for (let i = 0; i < Dq.length; i++) if (hit(Dq, a, i)) h++; return h; };
      fn.trials = a => a.length - q;
      finish('order-' + q + ' differences are constant (' + fmtN(c, d) + ')', 'poly' + q, q, n - q, k, fn, excs, extend(x, q, c), null, 1 + q);
    });
    ctx.tested++;
    if (n >= 3) {
      const hit = (a, i) => Math.abs(a[i] - a[i - 1] - a[i - 2]) <= tol(col, a[i]);
      let k = 0; const excs = [];
      for (let i = 2; i < n; i++) { if (hit(x, i)) k++; else excs.push({ i, expected: x[i - 1] + x[i - 2], found: x[i] }); }
      const fn = a => { let c = 0; for (let i = 2; i < a.length; i++) if (hit(a, i)) c++; return c; };
      fn.trials = a => a.length - 2;
      finish('each value is the sum of the previous two', 'rec', 0, n - 2, k, fn, excs, x[n - 1] + x[n - 2], null, 4);
    }
    return out;
  }

  function colLine(name, nums) {
    const s = [...nums].sort((a, b) => a - b), med = s[s.length >> 1], mad = [...s.map(v => Math.abs(v - med))].sort((a, b) => a - b)[s.length >> 1] || 0;
    const outl = mad ? nums.filter(v => Math.abs(v - med) / (1.4826 * mad) > 3.5) : [];
    return name + ': min ' + fmt8(s[0]) + ' · median ' + fmt8(med) + ' · max ' + fmt8(s[s.length - 1]) + ' · sum ' + fmt8(nums.reduce((a, b) => a + b, 0)) + (outl.length ? ' · outliers ' + outl.map(fmt8).join(', ') : '');
  }

  function totalsFor(V, bad) {
    const out = [];
    if (!V.totalRows.length) return out;
    const tr = V.totalRows[V.totalRows.length - 1], lab = V.label(tr);
    const ok = [], miss = [];
    V.cols.forEach(c => {
      const v = c.vals[tr]; if (v === null) return;
      const above = V.dataRows.filter(r => r < tr && c.vals[r] !== null).map(r => c.vals[r]);
      if (above.length < 2) return;
      const S = above.reduce((a, b) => a + b, 0);
      if (Math.abs(S - v) <= tol(c, S)) ok.push(c); else miss.push({ c, S, v });
    });
    if (ok.length) {
      out.push('Row “' + lab + '” equals the sum of the rows above in ' + ok.map(c => c.name).join(', ') + '.');
      miss.forEach(({ c, S, v }) => {
        out.push(c.name + ': the rows above add up to ' + fmtN(S, c.d) + ', the row says ' + fmtN(v, c.d) + ' (' + signed(v - S, c.d) + ').');
        bad[tr + ',' + c.j] = 'rows above add up to ' + fmtN(S, c.d);
      });
    } else if (miss.length) out.push('Row “' + lab + '” does not equal the sum of the rows above in any column.');
    return out;
  }

  function digitsFor(V, seqs) {
    const out = [];
    V.cols.forEach(c => {
      const nums = c.nums, n = nums.length, integer = nums.every(Number.isInteger);
      const stepPass = seqs.some(s => s.col === c.j && s.seqKind === 'step');
      if (integer && n >= 50 && nums.filter(v => Math.abs(v) >= 10).length >= .9 * n && !stepPass) {
        const cnt = Array(10).fill(0); nums.forEach(v => cnt[Math.abs(v) % 10]++);
        const e = n / 10, chi2 = cnt.reduce((s, o) => s + (o - e) ** 2 / e, 0), p = chiP(chi2, 9);
        out.push(c.name + ': last digits ' + (p < .01 ? 'are uneven' : 'look even') + ' (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', ' + n + ' values). Invented or hand-typed numbers often skew last digits; so do rounding and prices.');
      }
      if (integer && n >= 30) {
        const k = nums.filter(v => Math.abs(v) % 5 === 0).length;
        if (log10Tail(n, k, .2) + Math.log10(V.cols.length) <= MAX_LOG10P) out.push(c.name + ': ' + Math.round(k / n * 100) + '% end in 0 or 5 (expected 20%): values look rounded or estimated.');
      }
      if (nums.every(v => v > 0) && n >= 100 && Math.max(...nums) / Math.min(...nums) >= 100) {
        const cnt = Array(10).fill(0); nums.forEach(v => { const m = String(Math.abs(v)).match(/[1-9]/); if (m) cnt[+m[0]]++; });
        let mad = 0; for (let dg = 1; dg <= 9; dg++) mad += Math.abs(cnt[dg] / n - Math.log10(1 + 1 / dg)); mad /= 9;
        const label = mad <= .006 ? 'close conformity' : mad <= .012 ? 'acceptable conformity' : mad <= .015 ? 'marginal conformity' : 'nonconformity';
        out.push(c.name + ': first digits show ' + label + ' with Benford\'s law (MAD ' + mad.toFixed(4) + ', ' + n + ' values). Many natural amounts follow it; prices, IDs and capped ranges do not.');
      }
    });
    return out;
  }

  function pickBest(list) { return list.slice().sort((a, b) => a.log10p - b.log10p || a.params - b.params || a.rank - b.rank)[0]; }

  function analyze(a) {
    rand = rng(SEED);
    const tables = a.tables.map(t => {
      if (t.title === 'Key–value pairs') {
        const V = view(t);
        if (!V.cols.length) return null;
        return { eqs: [], seqs: [], rich: [], totals: [], cols: V.cols.map(c => colLine(c.name, c.nums)), digits: [], formula: {}, bad: {}, m: 0, V, kvOnly: true };
      }
      const V = view(t);
      if (!V.cols.length) return null;
      const ctx = { tested: 0 }, bad = {}, formula = {};
      const eqAll = candidates(V, ctx);
      const seqAll = [];
      V.cols.filter(c => c.distinct >= 2).forEach(c => {
        const idx = V.dataRows.filter(r => c.vals[r] !== null);
        seqAll.push(...seqChecks(idx.map(r => c.vals[r]), idx, c, ctx, V.label));
      });
      const m = ctx.tested, adj = c => Math.min(0, c.log10p + Math.log10(Math.max(1, m)));
      const keep = c => { c.adj = adj(c); return c.adj <= MAX_LOG10P; };
      const byTarget = new Map();
      eqAll.filter(keep).forEach(c => byTarget.set(c.target, [...(byTarget.get(c.target) || []), c]));
      const eqs = [...byTarget.values()].map(pickBest).sort((x, y) => x.target - y.target);
      const byCol = new Map();
      seqAll.filter(keep).forEach(c => byCol.set(c.col, [...(byCol.get(c.col) || []), c]));
      const seqs = [...byCol.values()].map(pickBest).sort((x, y) => x.col - y.col);
      eqs.forEach(e => { formula[e.target] = e.rhs; e.exc.forEach(x => { bad[x.row + ',' + e.target] = 'expected ' + fmtN(x.expected, x.d); }); });
      seqs.forEach(s => s.exc.forEach(x => { bad[x.row + ',' + s.col] = 'expected ' + fmtN(x.expected, x.d); }));
      const rich = [];
      V.cols.filter(c => c.distinct >= 3).forEach(c => {
        if (seqs.some(x => x.col === c.j)) return;
        const idx = V.dataRows.filter(r => c.vals[r] !== null);
        if (idx.length < 6 || idx.length > 60 || idx.length !== V.dataRows.length) return;
        const res = SEQ.analyze(idx.map(r => c.vals[r].toFixed(c.d)), 5);
        if (!res.error && (res.label === 'Verified' || res.label === 'Plausible')) rich.push({ col: c.j, name: c.name, a: res });
      });
      const totals = totalsFor(V, bad);
      const cols = V.cols.map(c => colLine(c.name, c.nums));
      const digits = digitsFor(V, seqs);
      return { eqs, seqs, rich, totals, cols, digits, formula, bad, m, V };
    });

    (a.pairs || []).forEach(p => {
      if (!DECLARED.test(p.k)) return;
      const pc = cell(p.v); if (!pc) return;
      const tolD = .5 * 10 ** -pc.d + 1e-9 * Math.max(1, Math.abs(pc.v));
      let matched = false; const money = [];
      tables.forEach((nt, ti) => {
        if (!nt || nt.kvOnly) return;
        nt.V.cols.forEach(c => {
          const vals = nt.V.dataRows.filter(r => c.vals[r] !== null).map(r => c.vals[r]);
          if (vals.length < 2) return;
          const S = vals.reduce((x, y) => x + y, 0);
          if (c.cur >= 0 || (a.tables[ti].types && a.tables[ti].types[c.j]) === 'Amount') money.push({ nt, c, S, count: vals.length });
          if (Math.abs(S - pc.v) <= tolD) {
            matched = true;
            let s = p.k + ' (line ' + p.line + ', ' + p.v + ') equals the sum of ' + c.name + ' (' + vals.length + ' rows).';
            if (c.cur >= 0) {
              const cs = [...new Set(nt.V.dataRows.map(r => String(a.tables[ti].rows[r][c.cur] ?? '').trim()).filter(Boolean))];
              if (cs.length > 1) s += ' ' + c.name + ' mixes ' + cs.join(' and ') + ', so this sum adds different currencies.';
            }
            nt.totals.push(s);
          }
        });
      });
      if (!matched && money.length === 1) {
        const { nt, c, S, count } = money[0];
        nt.totals.push(p.k + ' (line ' + p.line + ', ' + p.v + ') does not equal the sum of ' + c.name + ' (' + fmtN(S, pc.d) + ', ' + count + ' rows).');
      }
    });

    const used = new Set(a.used || []), lines = [], GAP = /^\?+$/;
    a.kept.forEach((l, i) => {
      if (used.has(i) || !/^[\s\d.,;+\-−?]+$/.test(l)) return;
      const parts = l.includes(';') ? l.split(/\s*;\s*/) : l.includes(', ') ? l.split(/,\s+/) : /\s/.test(l.trim()) ? l.trim().split(/\s+/) : l.split(',');
      const pieces = parts.map(s => s.trim());
      const parsed = pieces.map(s => GAP.test(s) ? { v: null, d: 0 } : cell(s));
      if (pieces.length < MIN_SEQ || parsed.some(p => !p) || parsed.every(p => p.v === null)) return;
      const gap = parsed.some(p => p.v === null), d = Math.max(...parsed.map(p => p.d));
      const tokens = pieces.map((s, k) => parsed[k].v === null ? '?' : /^[-−]?\d+(?:\.\d+)?$/.test(s) ? s : String(parsed[k].v));
      const rich = SEQ.analyze(tokens, 5);
      let seqs = [], m = 0;
      if (!gap) {
        const values = parsed.map(p => p.v), col = { j: 0, name: 'Values', d, h: .5 * 10 ** -d }, ctx = { tested: 0 };
        const all = seqChecks(values, values.map((_, k) => k), col, ctx, null);
        m = ctx.tested;
        const kept = all.filter(c => { c.adj = Math.min(0, c.log10p + Math.log10(Math.max(1, m))); return c.adj <= MAX_LOG10P; });
        seqs = kept.length ? [pickBest(kept)] : [];
      }
      lines.push({ line: i + 1, values: parsed.map(p => p.v), d, seqs, m, rich: rich.error ? null : rich, gap });
    });

    const richHit = r => r && r.label !== 'No pattern';
    const eq = tables.reduce((s, t) => s + (t ? t.eqs.length : 0), 0), seq = tables.reduce((s, t) => s + (t ? t.seqs.length + t.rich.length : 0), 0) + lines.reduce((s, l) => s + (l.seqs.length || richHit(l.rich) || (l.rich && l.rich.approx) ? 1 : 0), 0);
    const brokenKeys = new Set(); tables.forEach((t, ti) => { if (t) Object.keys(t.bad).forEach(k => brokenKeys.add(ti + '|' + k)); });
    return { tables, lines, count: { eq, seq, broken: brokenKeys.size } };
  }

  const excList = exc => {
    if (!exc.length) return '';
    return '<ul class="stats">' + exc.slice(0, SHOW_EXC).map(x => '<li>Row ' + (x.row + 1) + (x.label ? ' ' + esc(x.label) : '') + ': expected ' + fmtN(x.expected, x.d) + ', found ' + fmtN(x.found, x.d) + ' (' + signed(x.found - x.expected, x.d) + ')</li>').join('') + (exc.length > SHOW_EXC ? '<li>and ' + (exc.length - SHOW_EXC) + ' more</li>' : '') + '</ul>';
  };
  const chanceNote = m => '<p class="tstat">Chance: how often a match this good appears when the values are shuffled, corrected for ' + m + ' relations tested.</p>';
  const section = (title, items) => items.length ? '<h4>' + title + '</h4><ul class="stats">' + items.join('') + '</ul>' : '';
    function seqItems(seqs) {
    return seqs.map(s => '<li><b>' + esc(s.name) + '</b> ' + esc(s.desc) + ' · ' + s.k + ' of ' + s.n + ' · chance ' + fmtChance(s.adj) + (s.next !== null ? ' · next ' + fmtN(s.next, s.d) : '') + (s.gaps.length ? ' · missing ' + s.gaps.map(g => fmtN(g, s.d)).join(', ') : '') + excList(s.exc) + '</li>');
  }

  function render(nt) {
    const eqItems = nt.eqs.map(e => '<li><b>' + esc(e.text) + '</b> · ' + e.k + ' of ' + e.n + ' rows · chance ' + fmtChance(e.adj) + excList(e.exc) + '</li>');
    const chanceItems = seqItems(nt.seqs);
    const richItems = nt.rich.map(x => '<li><b>' + esc(x.name) + '</b> ' + esc(x.a.top.words) + ' · ' + x.a.label.toLowerCase() + ' · ' + x.a.ev + ' independent checks · next ' + esc(x.a.next.slice(0, 3).map(SEQ.fmtQ).join(', ')) + '</li>');
    const sqItems = [...chanceItems, ...richItems];
    const note = eqItems.length || chanceItems.length ? chanceNote(nt.m) : '';
    let noteDone = false;
    const withNote = html => { if (!html || noteDone) return html; noteDone = true; return html.replace('</h4>', '</h4>' + note); };
    return withNote(section('Equations', eqItems)) + withNote(section('Sequences', sqItems)) + section('Totals', nt.totals.map(s => '<li>' + esc(s) + '</li>')) + section('Columns', nt.cols.map(s => '<li>' + esc(s) + '</li>')) + section('Digits', nt.digits.map(s => '<li>' + esc(s) + '</li>'));
  }

  function renderLine(L) {
    const r = L.rich && (L.rich.label !== 'No pattern' || L.rich.approx) ? L.rich : null;
    const items = seqItems(L.seqs), shown = L.values.map(v => v === null ? '?' : v).join(', ');
    if (r) {
      const partial = L.seqs.some(s => s.exc.length) ? '<article class="card"><h4>Close fit with broken values, line ' + L.line + '</h4>' + chanceNote(L.m) + '<ul class="stats">' + items.join('') + '</ul></article>' : '';
      return SEQ.render(r, { line: L.line }) + partial;
    }
    const body = items.length ? '<h4>Sequences</h4>' + chanceNote(L.m) + '<ul class="stats">' + items.join('') + '</ul>' : '<p class="tstat">No step, ratio, polynomial, recurrence or known-sequence pattern passed.</p>';
    return '<article class="card"><h3>Number line ' + L.line + '</h3><p class="tstat">' + esc(shown) + '</p>' + body + '</article>';
  }

  function chips(N) {
    const out = [];
    if (N.count.eq > 0) out.push('<span class="chip">Equations <b>' + N.count.eq + '</b></span>');
    if (N.count.seq > 0) out.push('<span class="chip">Sequences <b>' + N.count.seq + '</b></span>');
    if (N.count.broken > 0) out.push('<span class="chip">Broken rows <b>' + N.count.broken + '</b></span>');
    return out;
  }

  return { analyze, render, renderLine, chips };
})();
