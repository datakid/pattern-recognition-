const NUMS = (() => {
  const MIN_EQ_ROWS = 4, MIN_SEQ = 5, MIN_SUPPORT = .6, MAX_LOG10P = -3, MAX_COLS = 12, MAX_DATE_COLS = 6, MAX_ROWS = 1000, PAIRS = 4000, SHUFFLES = 200, PERM_CAP = 300, SEED = 0x5eed, SHOW_EXC = 5, MAX_EXC = 1000, LINE_CAP = 200000, SHOW_VALUES = 40, SAFE_INT = 2 ** 53;
  const SKIP_TYPES = new Set(['Date', 'Time', 'Phone', 'IP', 'ID', 'Card number', 'Version', 'UUID', 'IBAN', 'Coordinates', 'Colour', 'Email', 'URL']);
  const TOTAL = /^(?:grand\s+|sub-?)?totals?\b|^sum\b/i;
  const DECLARED = /^(?:grand\s+|sub-?)?total\b|^sum\b|\bamount due\b|\bbalance due\b/i;
  const CURX = '(?:[$€£¥₹]|USD|EUR|GBP|JPY|INR|AED|SAR|EGP|CAD|AUD|CHF|CNY)';
  let rand;

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const decOf = s => { let m = s.match(/^\d{1,3}(?:\.\d{3})+,(\d+)$/); if (m) return m[1].length; if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) return (s.split('.')[1] || '').length; m = s.match(/[.,](\d+)$/); return m ? m[1].length : 0; };
  const PLAIN = /^-?\d{1,15}(?:\.(\d{1,15}))?$/;
  function cell(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? { v, d: Math.min(6, decOf(String(v))) } : null;
    let s = String(v ?? '').trim(), neg = false; if (!s) return null;
    const q = PLAIN.exec(s);
    if (q) return { v: +s, d: q[1] ? Math.min(6, q[1].length) : 0 };
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
    const lc = lgamma(n + 1), lp = Math.log(p), lq = Math.log1p(-p), peak = Math.floor((n + 1) * p), t = [];
    let top = -Infinity;
    for (let i = k; i <= n; i++) {
      const v = lc - lgamma(i + 1) - lgamma(n - i + 1) + i * lp + (n - i) * lq;
      t.push(v); if (v > top) top = v;
      if (i > peak && v < top - 60) break;
    }
    return Math.min(0, (top + Math.log(t.reduce((s, v) => s + Math.exp(v - top), 0))) / Math.LN10);
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
  function distinctUpTo3(a) { const seen = []; for (let i = 0; i < a.length; i++) { const v = a[i]; if (seen.indexOf(v) < 0) { seen.push(v); if (seen.length === 3) break; } } return seen.length; }
  const tol = (col, x) => col.h + 1e-9 * Math.max(1, Math.abs(x));

  const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/;
  const isoDay = v => new Date(v * 86400000).toISOString().slice(0, 10);
  function dateCell(v) {
    if (typeof v !== 'string') return null;
    let s = v.trim(); if (!s) return null;
    let m = ISO.exec(s);
    if (!m && /[a-z]/i.test(s) && /\d{4}/.test(s)) m = ISO.exec(TXT.isoDate(s));
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d);
    if (!Number.isFinite(t)) return null;
    const c = new Date(t);
    return c.getUTCFullYear() === y && c.getUTCMonth() === mo - 1 && c.getUTCDate() === d ? Math.round(t / 86400000) : null;
  }
  const colFmt = col => col.date ? isoDay : v => fmtN(v, col.d);
  const dayWord = b => Math.abs(b) === 1 ? ' day' : ' days';

  function view(t) {
    const rows = t.rows, n = rows.length, isTotal = new Uint8Array(n), totalRows = [], dataRows = [];
    for (let i = 0; i < n; i++) {
      const r = rows[i]; let tot = false;
      for (let c = 0; c < r.length; c++) { const x = r[c]; if (typeof x === 'string' && TOTAL.test(x.trim()) && !cell(x)) { tot = true; break; } }
      if (tot) { totalRows.push(i); isTotal[i] = 1; } else dataRows.push(i);
    }
    const label = r => { const c = rows[r].find(x => typeof x === 'string' && x.trim() && !cell(x)); return c === undefined ? '' : c.trim(); };
    const cols = [], dateCols = [];
    t.head.forEach((name, j) => {
      if (SKIP_TYPES.has(t.types && t.types[j])) return;
      const vals = new Array(n).fill(null), nums = []; let nonEmpty = 0, d = 0;
      for (let i = 0; i < n; i++) {
        const raw = rows[i][j], c = cell(raw);
        if (c) vals[i] = c.v;
        if (isTotal[i]) continue;
        if (c) { nums.push(c.v); if (c.d > d) d = c.d; }
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') nonEmpty++;
      }
      if (!(nums.length >= 3 && nums.length >= .8 * nonEmpty)) return;
      let min = Infinity, max = -Infinity, sum = 0;
      for (const v of nums) { if (v < min) min = v; if (v > max) max = v; sum += v; }
      cols.push({
        j, name, vals, d, h: .5 * 10 ** -d, min, max, sum,
        pct: /%/.test(name) || (t.types && t.types[j]) === 'Percent',
        distinct: distinctUpTo3(nums),
        cur: t.head[j + 1] === name + ' currency' ? j + 1 : -1,
        nums
      });
    });
    t.head.forEach((name, j) => {
      if ((t.types && t.types[j]) !== 'Date') return;
      const vals = new Array(n).fill(null), nums = []; let nonEmpty = 0;
      for (let i = 0; i < n; i++) {
        const raw = rows[i][j], c = dateCell(raw);
        vals[i] = c;
        if (isTotal[i]) continue;
        if (c !== null) nums.push(c);
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') nonEmpty++;
      }
      if (!(nums.length >= 3 && nums.length >= .8 * nonEmpty)) return;
      dateCols.push({ j, name, vals, d: 0, h: .5, date: true, distinct: distinctUpTo3(nums), nums });
    });
    return {
      rows, totalRows, dataRows, label, cols, dateCols,
      searchRows: dataRows.length > MAX_ROWS ? dataRows.slice(0, MAX_ROWS) : dataRows,
      eqCols: cols.filter(c => c.distinct >= 3).slice(0, MAX_COLS),
      dateEq: dateCols.filter(c => c.distinct >= 3).slice(0, MAX_DATE_COLS),
      constCols: cols.filter(c => c.distinct === 1)
    };
  }

  function evalRel(V, T, rowList, predict, params, rank, rhs) {
    const use = [], P = [], Y = [];
    for (let i = 0; i < rowList.length; i++) {
      const r = rowList[i], y = T.vals[r]; if (y === null) continue;
      const p = predict(r); if (p === null || p === undefined || !Number.isFinite(p)) continue;
      use.push(r); P.push(p); Y.push(y);
    }
    const n = use.length;
    if (n < MIN_EQ_ROWS) return null;
    let k = 0;
    for (let i = 0; i < n; i++) if (Math.abs(P[i] - Y[i]) <= tol(T, Y[i])) k++;
    if (k < params + 3 || k / n < MIN_SUPPORT) return null;
    let ph = 0, pairs = 0;
    const hit = (i, j) => { if (Math.abs(P[i] - Y[j]) <= tol(T, Y[j])) ph++; pairs++; };
    if (n * (n - 1) <= PAIRS) { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) hit(i, j); }
    else for (let q = 0; q < PAIRS; q++) { const i = Math.floor(rand() * n); let j = Math.floor(rand() * (n - 1)); if (j >= i) j++; hit(i, j); }
    const p0 = (ph + 1) / (pairs + 2), exc = [];
    for (let i = 0; i < n && exc.length < MAX_EXC; i++) if (!(Math.abs(P[i] - Y[i]) <= tol(T, Y[i]))) exc.push({ row: use[i], label: V.label(use[i]), expected: P[i], found: Y[i] });
    return {
      kind: 'eq', target: T.j, rhs, text: T.name + ' = ' + rhs, k, n, params, rank,
      log10p: log10Tail(n - params, k - params, p0),
      exc, excN: n - k, d: T.d, fmt: colFmt(T), unit: T.date ? ' days' : ''
    };
  }

  function candidates(V, ctx) {
    const out = [], { eqCols, constCols, dataRows, searchRows, dateEq } = V;
    const prev = new Map(); dataRows.forEach((r, i) => { if (i > 0) prev.set(r, dataRows[i - 1]); });
    const withPrevFull = dataRows.filter(r => prev.has(r)), withPrevSearch = searchRows.filter(r => prev.has(r));
    const add = c => { if (c) out.push(c); };
    const run = (T, predict, params, rank, rhs, usePrev) => {
      const a = usePrev ? withPrevSearch : searchRows, b = usePrev ? withPrevFull : dataRows;
      const r = evalRel(V, T, a, predict, params, rank, rhs);
      if (!r || a.length === b.length) return r;
      return evalRel(V, T, b, predict, params, rank, rhs);
    };
    const pairsOf = T => { const o = eqCols.filter(c => c !== T), r = []; for (let a = 0; a < o.length; a++) for (let b = a + 1; b < o.length; b++) r.push([o[a], o[b]]); return r; };
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        ctx.tested++;
        add(run(T, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] + B.vals[r], 0, 0, A.name + ' + ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        ctx.tested++;
        add(run(T, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] * B.vals[r], 0, 1, A.name + ' × ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A0, B0]) => {
        if (A0.pct === B0.pct) return;
        const A = A0.pct ? B0 : A0, B = A0.pct ? A0 : B0;
        ctx.tested++;
        add(run(T, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] * B.vals[r] / 100, 0, 2, A.name + ' × ' + B.name + (/%\s*$/.test(B.name) ? '' : ' %')));
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
        add(run(T, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, rhs));
      }
      runs.set(T, tried);
    });
    if (eqCols.length >= 4) {
      eqCols.forEach(T => {
        const inp = eqCols.filter(c => c !== T), key = inp.map(c => c.j).join(',');
        if (runs.get(T).has(key)) return;
        ctx.tested++;
        add(run(T, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, 'sum of the other columns'));
      });
    }
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A.j >= T.j) return;
        ctx.tested++;
        const ratios = searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null && A.vals[r] !== 0).map(r => T.vals[r] / A.vals[r]);
        if (!ratios.length) return;
        const c = median(ratios);
        if (!Number.isFinite(c) || c === 0) return;
        const hitsAt = cs => searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null && Math.abs(cs * A.vals[r] - T.vals[r]) <= tol(T, T.vals[r])).length;
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
        add(run(T, r => A.vals[r] === null ? null : cs * A.vals[r], 1, 4, rhs));
      });
    });
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A.j >= T.j) return;
        ctx.tested++;
        const diffs = searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null).map(r => T.vals[r] - A.vals[r]);
        if (!diffs.length) return;
        const b = +median(diffs).toFixed(T.d);
        if (b === 0) return;
        add(run(T, r => A.vals[r] === null ? null : A.vals[r] + b, 1, 5, A.name + (b > 0 ? ' + ' : ' − ') + fmtN(Math.abs(b), T.d)));
      });
    });
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A === T) return;
        [1, -1].forEach(sign => {
          ctx.tested++;
          add(run(T, r => { const pv = T.vals[prev.get(r)], a = A.vals[r]; return pv === null || a === null ? null : pv + sign * a; }, 0, 6, 'previous ' + T.name + (sign > 0 ? ' + ' : ' − ') + A.name, true));
        });
      });
    });
    eqCols.forEach(T => {
      const pctLike = T.pct || T.max <= 100, scale = T.pct ? 100 : T.max <= 1 ? 1 : 100;
      if (T.min < 0 || !pctLike) return;
      eqCols.forEach(A => {
        if (A === T || A.min < 0 || !(A.sum > 0)) return;
        ctx.tested++;
        add(run(T, r => A.vals[r] === null ? null : scale * A.vals[r] / A.sum, 0, 7, A.name + ' ÷ sum of ' + A.name + (scale === 100 ? ' × 100' : '')));
      });
    });
    eqCols.forEach((T, p) => {
      for (let L = 2; L <= Math.min(8, p); L++) {
        const inp = eqCols.slice(p - L, p);
        ctx.tested++;
        const rhs = 'average of ' + (L <= 4 ? inp.map(c => c.name).join(', ') : inp[0].name + ' … ' + inp[L - 1].name);
        add(run(T, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s / L; }, 0, 8, rhs));
      }
    });
    dateEq.forEach(T => {
      dateEq.forEach(A => {
        if (A.j >= T.j) return;
        ctx.tested++;
        const diffs = searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null).map(r => T.vals[r] - A.vals[r]);
        if (!diffs.length) return;
        const b = Math.round(median(diffs));
        if (b === 0) return;
        add(run(T, r => A.vals[r] === null ? null : A.vals[r] + b, 1, 9, A.name + (b > 0 ? ' + ' : ' − ') + Math.abs(b) + dayWord(b)));
      });
    });
    dateEq.forEach(T => {
      dateEq.forEach(A => {
        if (A.j >= T.j) return;
        eqCols.forEach(N => {
          ctx.tested++;
          add(run(T, r => A.vals[r] === null || N.vals[r] === null ? null : A.vals[r] + N.vals[r], 0, 10, A.name + ' + ' + N.name + ' days'));
        });
      });
    });
    eqCols.forEach(N => {
      dateEq.forEach(T => {
        dateEq.forEach(A => {
          if (A.j >= T.j) return;
          ctx.tested++;
          add(run(N, r => A.vals[r] === null || T.vals[r] === null ? null : T.vals[r] - A.vals[r], 0, 11, T.name + ' − ' + A.name + ' (days)'));
        });
      });
    });
    return out;
  }

  function extend(x, q, c) { const rows = [x.slice()]; for (let i = 1; i <= q; i++) { const p = rows[i - 1]; rows.push(p.slice(1).map((v, j) => v - p[j])); } let add = c; for (let i = q - 1; i >= 0; i--) add = rows[i][rows[i].length - 1] + add; return add; }

  function seqChecks(x, rowsIdx, col, ctx, label) {
    const out = [];
    if (x.length < MIN_SEQ) return out;
    const n = x.length, d = col.d, w = 10 ** -d, bin = v => Math.round(v / w), fmt = colFmt(col);
    const diffsOf = (a, q) => { let cur = a.slice(); for (let i = 0; i < q; i++) { const p = cur; cur = new Array(p.length - 1); for (let j = 0; j < cur.length; j++) cur[j] = p[j + 1] - p[j]; } return cur; };
    const finish = (desc, kind, params, trials, k, hitsFn, excs, excN, next, gaps, rank) => {
      if (k < params + 3 || k / trials < MIN_SUPPORT) return;
      const cap = x.slice(0, PERM_CAP);
      let sum = 0, tp = 0;
      for (let s = 0; s < SHUFFLES; s++) { const sh = shuffle(cap); sum += hitsFn(sh); tp += hitsFn.trials(sh); }
      const p0 = (sum + 1) / (tp + 2);
      out.push({
        kind: 'seq', seqKind: kind, name: col.name, desc, k, n: trials, params, rank,
        log10p: log10Tail(trials - params, k - params, p0),
        exc: excs.map(e => ({ row: rowsIdx[e.i], label: label ? label(rowsIdx[e.i]) : '', expected: e.expected, found: e.found })),
        excN, d, fmt, unit: col.date ? ' days' : '',
        next: k === trials ? next : null, gaps: gaps || [], col: col.j
      });
    };
    ctx.tested++;
    {
      const df = new Array(n - 1); for (let i = 0; i < n - 1; i++) df[i] = x[i + 1] - x[i];
      const s = mode(df, v => bin(v));
      if (s !== null && bin(s) !== 0) {
        const hit = (a, i) => Math.abs(a[i + 1] - a[i] - s) <= tol(col, a[i + 1]);
        let k = 0, excN = 0; const excs = [], gaps = [];
        for (let i = 0; i < n - 1; i++) {
          if (hit(x, i)) { k++; continue; }
          const diff = x[i + 1] - x[i], m = Math.round(diff / s);
          if (m >= 2 && m <= 10 && Math.abs(diff - m * s) <= tol(col, x[i + 1])) { for (let q = 1; q < m && gaps.length < 10; q++) gaps.push(x[i] + s * q); }
          else { excN++; if (excs.length < MAX_EXC) excs.push({ i: i + 1, expected: x[i] + s, found: x[i + 1] }); }
        }
        const fn = a => { let c = 0; for (let i = 0; i < a.length - 1; i++) if (hit(a, i)) c++; return c; };
        fn.trials = a => a.length - 1;
        finish('steps by ' + fmtN(s, d) + (col.date ? dayWord(s) : ''), 'step', 1, n - 1, k, fn, excs, excN, x[n - 1] + s, gaps, 0);
      }
    }
    if (col.date) return out;
    ctx.tested++;
    if (x.every(v => v !== 0 && Math.sign(v) === Math.sign(x[0]))) {
      const rs = new Array(n - 1); for (let i = 0; i < n - 1; i++) rs[i] = x[i + 1] / x[i];
      const rr = mode(rs, v => v.toPrecision(4));
      const r = rr === null ? 1 : +rr.toPrecision(4);
      if (Math.abs(r - 1) >= 1e-9) {
        const hit = (a, i) => Math.abs(a[i + 1] - r * a[i]) <= tol(col, a[i + 1]);
        let k = 0, excN = 0; const excs = [];
        for (let i = 0; i < n - 1; i++) { if (hit(x, i)) k++; else { excN++; if (excs.length < MAX_EXC) excs.push({ i: i + 1, expected: r * x[i], found: x[i + 1] }); } }
        const fn = a => { let c = 0; for (let i = 0; i < a.length - 1; i++) if (hit(a, i)) c++; return c; };
        fn.trials = a => a.length - 1;
        finish('× ' + r + ' each row', 'ratio', 1, n - 1, k, fn, excs, excN, x[n - 1] * r, null, 1);
      }
    }
    [2, 3].forEach(q => {
      ctx.tested++;
      if (n - q < 1) return;
      const D = diffsOf(x, q), c = mode(D, v => bin(v));
      if (c === null || bin(c) === 0) return;
      const hit = (Dq, a, i) => Math.abs(Dq[i] - c) <= tol(col, a[i + q]);
      let k = 0, excN = 0; const excs = [];
      for (let i = 0; i < D.length; i++) { if (hit(D, x, i)) k++; else { excN++; if (excs.length < MAX_EXC) excs.push({ i: i + q, expected: x[i + q] - D[i] + c, found: x[i + q] }); } }
      const fn = a => { const Dq = diffsOf(a, q); let h = 0; for (let i = 0; i < Dq.length; i++) if (hit(Dq, a, i)) h++; return h; };
      fn.trials = a => a.length - q;
      finish('order-' + q + ' differences are constant (' + fmtN(c, d) + ')', 'poly' + q, q, n - q, k, fn, excs, excN, extend(x, q, c), null, 1 + q);
    });
    ctx.tested++;
    if (n >= 3) {
      const hit = (a, i) => Math.abs(a[i] - a[i - 1] - a[i - 2]) <= tol(col, a[i]);
      let k = 0, excN = 0; const excs = [];
      for (let i = 2; i < n; i++) { if (hit(x, i)) k++; else { excN++; if (excs.length < MAX_EXC) excs.push({ i, expected: x[i - 1] + x[i - 2], found: x[i] }); } }
      const fn = a => { let c = 0; for (let i = 2; i < a.length; i++) if (hit(a, i)) c++; return c; };
      fn.trials = a => a.length - 2;
      finish('each value is the sum of the previous two', 'rec', 0, n - 2, k, fn, excs, excN, x[n - 1] + x[n - 2], null, 4);
    }
    return out;
  }

  function colLine(name, nums) {
    const s = Float64Array.from(nums).sort(), med = s[s.length >> 1], mad = Float64Array.from(s, v => Math.abs(v - med)).sort()[s.length >> 1] || 0;
    const outl = mad ? nums.filter(v => Math.abs(v - med) / (1.4826 * mad) > 3.5) : [];
    let sum = 0; for (const v of nums) sum += v;
    return name + ': min ' + fmt8(s[0]) + ' · median ' + fmt8(med) + ' · max ' + fmt8(s[s.length - 1]) + ' · sum ' + fmt8(sum) + (outl.length ? ' · outliers ' + outl.slice(0, 50).map(fmt8).join(', ') + (outl.length > 50 ? ' …' : '') : '');
  }

  function totalsFor(V, bad) {
    const out = [];
    if (!V.totalRows.length) return out;
    const tr = V.totalRows[V.totalRows.length - 1], lab = V.label(tr);
    const ok = [], miss = [];
    V.cols.forEach(c => {
      const v = c.vals[tr]; if (v === null) return;
      let S = 0, cnt = 0;
      for (const r of V.dataRows) { if (r >= tr) break; if (c.vals[r] !== null) { S += c.vals[r]; cnt++; } }
      if (cnt < 2) return;
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
      const nums = c.nums, n = nums.length;
      const integer = c.max <= SAFE_INT && -c.min <= SAFE_INT && nums.every(Number.isInteger);
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
      if (c.min > 0 && n >= 100 && c.max / c.min >= 100) {
        const cnt = Array(10).fill(0); nums.forEach(v => { const m = String(Math.abs(v)).match(/[1-9]/); if (m) cnt[+m[0]]++; });
        let mad = 0, chi2 = 0;
        for (let dg = 1; dg <= 9; dg++) { const pr = Math.log10(1 + 1 / dg), e = n * pr; mad += Math.abs(cnt[dg] / n - pr); chi2 += (cnt[dg] - e) ** 2 / e; }
        mad /= 9;
        const p = chiP(chi2, 8), verdict = p >= .01 ? 'fit' : mad <= .006 ? 'differ only slightly from' : 'differ from';
        out.push(c.name + ': first digits ' + verdict + ' Benford\'s law (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', MAD ' + mad.toFixed(4) + ', ' + n + ' values). Many natural amounts follow it; prices, IDs and capped ranges do not.');
      }
    });
    return out;
  }

  function pickBest(list) { return list.slice().sort((a, b) => a.log10p - b.log10p || a.params - b.params || a.rank - b.rank)[0]; }

  function analyze(a) {
    rand = rng(SEED);
    const tables = a.tables.map(t => {
      const V = view(t);
      if (t.title === 'Key–value pairs') {
        if (!V.cols.length) return null;
        return { eqs: [], seqs: [], totals: [], cols: V.cols.map(c => colLine(c.name, c.nums)), digits: [], formula: {}, bad: {}, overflow: 0, m: 0, V, kvOnly: true };
      }
      if (!V.cols.length && !V.dateCols.length) return null;
      const ctx = { tested: 0 }, bad = {}, formula = {};
      const eqAll = candidates(V, ctx);
      const seqAll = [];
      V.cols.concat(V.dateCols).filter(c => c.distinct >= 2).forEach(c => {
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
      let overflow = 0;
      eqs.forEach(e => { formula[e.target] = e.rhs; overflow += e.excN - e.exc.length; e.exc.forEach(x => { bad[x.row + ',' + e.target] = 'expected ' + e.fmt(x.expected); }); });
      seqs.forEach(s => { overflow += s.excN - s.exc.length; s.exc.forEach(x => { bad[x.row + ',' + s.col] = 'expected ' + s.fmt(x.expected); }); });
      const totals = totalsFor(V, bad);
      const cols = V.cols.map(c => colLine(c.name, c.nums));
      const digits = digitsFor(V, seqs);
      return { eqs, seqs, totals, cols, digits, formula, bad, overflow, m, V };
    });

    (a.pairs || []).forEach(p => {
      if (!DECLARED.test(p.k)) return;
      const pc = cell(p.v); if (!pc) return;
      const tolD = .5 * 10 ** -pc.d + 1e-9 * Math.max(1, Math.abs(pc.v));
      let matched = false; const money = [];
      tables.forEach((nt, ti) => {
        if (!nt || nt.kvOnly) return;
        nt.V.cols.forEach(c => {
          let S = 0, cnt = 0;
          for (const r of nt.V.dataRows) if (c.vals[r] !== null) { S += c.vals[r]; cnt++; }
          if (cnt < 2) return;
          if (c.cur >= 0 || (a.tables[ti].types && a.tables[ti].types[c.j]) === 'Amount') money.push({ nt, c, S, count: cnt });
          if (Math.abs(S - pc.v) <= tolD) {
            matched = true;
            let s = p.k + ' (line ' + p.line + ', ' + p.v + ') equals the sum of ' + c.name + ' (' + cnt + ' rows).';
            if (c.cur >= 0) {
              const cs = [...new Set(nt.V.dataRows.map(r => String(a.tables[ti].rows[r][c.cur] ?? '').trim()).filter(Boolean))];
              if (cs.length > 1) s += ' ' + c.name + ' mixes ' + cs.slice(0, 6).join(' and ') + ', so this sum adds different currencies.';
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

    const used = new Set(a.used || []), lines = [];
    a.kept.forEach((l, i) => {
      if (used.has(i) || !/^[\s\d.,;+\-−]+$/.test(l)) return;
      const parts = l.includes(';') ? l.split(/\s*;\s*/) : l.includes(', ') ? l.split(/,\s+/) : /\s/.test(l.trim()) ? l.trim().split(/\s+/) : l.split(',');
      if (parts.length < MIN_SEQ) return;
      const all = parts.slice(0, LINE_CAP), parsed = all.map(cell);
      if (parsed.some(p => !p)) return;
      const values = parsed.map(p => p.v);
      let d = 0; for (const p of parsed) if (p.d > d) d = p.d;
      const col = { j: 0, name: 'Values', d, h: .5 * 10 ** -d }, ctx = { tested: 0 };
      const found = seqChecks(values, values.map((_, k) => k), col, ctx, null), m = ctx.tested;
      const seqs = found.filter(c => { c.adj = Math.min(0, c.log10p + Math.log10(Math.max(1, m))); return c.adj <= MAX_LOG10P; });
      const best = seqs.length ? [pickBest(seqs)] : [];
      if (parts.length > values.length) best.forEach(b => { b.next = null; });
      lines.push({ line: i + 1, values, total: parts.length, d, seqs: best, m });
    });

    const eq = tables.reduce((s, t) => s + (t ? t.eqs.length : 0), 0), seq = tables.reduce((s, t) => s + (t ? t.seqs.length : 0), 0) + lines.reduce((s, l) => s + l.seqs.length, 0);
    const brokenKeys = new Set(); let overflow = 0;
    tables.forEach((t, ti) => { if (t) { overflow += t.overflow; Object.keys(t.bad).forEach(k => brokenKeys.add(ti + '|' + k)); } });
    return { tables, lines, count: { eq, seq, broken: brokenKeys.size + overflow } };
  }

  const excList = (exc, excN, unit) => {
    if (!exc.length) return '';
    return '<ul class="stats">' + exc.slice(0, SHOW_EXC).map(x => '<li>Row ' + (x.row + 1) + (x.label ? ' ' + esc(x.label) : '') + ': expected ' + x.fmt(x.expected) + ', found ' + x.fmt(x.found) + ' (' + signed(x.found - x.expected, x.dd) + unit + ')</li>').join('') + (excN > SHOW_EXC ? '<li>and ' + (excN - SHOW_EXC) + ' more</li>' : '') + '</ul>';
  };
  const withFmt = c => c.exc.map(x => Object.assign({}, x, { fmt: c.fmt, dd: c.unit ? 0 : c.d }));
  const chanceNote = m => '<p class="tstat">Chance: how often a match this good appears when the values are shuffled, corrected for ' + m + ' relations tested.</p>';
  const section = (title, items) => items.length ? '<h4>' + title + '</h4><ul class="stats">' + items.join('') + '</ul>' : '';
  function seqItems(seqs) {
    return seqs.map(s => '<li><b>' + esc(s.name) + '</b> ' + esc(s.desc) + ' · ' + s.k + ' of ' + s.n + ' · chance ' + esc(fmtChance(s.adj)) + (s.next !== null ? ' · next ' + s.fmt(s.next) : '') + (s.gaps.length ? ' · missing ' + s.gaps.map(s.fmt).join(', ') : '') + excList(withFmt(s), s.excN, s.unit) + '</li>');
  }

  function render(nt) {
    const eqItems = nt.eqs.map(e => '<li><b>' + esc(e.text) + '</b> · ' + e.k + ' of ' + e.n + ' rows · chance ' + esc(fmtChance(e.adj)) + excList(withFmt(e), e.excN, e.unit) + '</li>');
    const sqItems = seqItems(nt.seqs);
    const note = eqItems.length || sqItems.length ? chanceNote(nt.m) : '';
    let noteDone = false;
    const withNote = html => { if (!html || noteDone) return html; noteDone = true; return html.replace('</h4>', '</h4>' + note); };
    return withNote(section('Equations', eqItems)) + withNote(section('Sequences', sqItems)) + section('Totals', nt.totals.map(s => '<li>' + esc(s) + '</li>')) + section('Columns', nt.cols.map(s => '<li>' + esc(s) + '</li>')) + section('Digits', nt.digits.map(s => '<li>' + esc(s) + '</li>'));
  }

  function renderLine(L) {
    const items = seqItems(L.seqs);
    const body = items.length ? '<h4>Sequences</h4>' + chanceNote(L.m) + '<ul class="stats">' + items.join('') + '</ul>' : '<p class="tstat">No step, ratio, polynomial or recurrence pattern passed.</p>';
    const shown = L.values.slice(0, SHOW_VALUES).join(', ') + (L.total > SHOW_VALUES ? ' … (' + L.total + ' values' + (L.total > L.values.length ? ', first ' + L.values.length + ' analysed' : '') + ')' : '');
    return '<article class="card"><h3>Number line ' + L.line + '</h3><p class="tstat">' + esc(shown) + '</p>' + body + '</article>';
  }

  function chips(N) {
    const out = [];
    if (N.count.eq > 0) out.push('<span class="chip">Equations <b>' + N.count.eq + '</b></span>');
    if (N.count.seq > 0) out.push('<span class="chip">Sequences <b>' + N.count.seq + '</b></span>');
    if (N.count.broken > 0) out.push('<span class="chip">Broken rows <b>' + N.count.broken + '</b></span>');
    return out;
  }

  const hasFindings = nt => !!nt && !nt.kvOnly && (nt.eqs.length > 0 || nt.seqs.length > 0 || nt.totals.length > 0 || nt.digits.length > 0);

  function findings(nt) {
    const safe = s => /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
    const rows = [['Type', 'Finding', 'Holds in', 'Chance', 'Row', 'Label', 'Expected', 'Found', 'Difference']];
    const diff = (c, x) => { const v = x.found - x.expected, dd = c.unit ? 0 : c.d; return (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(dd); };
    const excRows = (c, text) => {
      c.exc.forEach(x => rows.push(['Exception', safe(text), '', '', x.row + 1, safe(x.label), c.fmt(x.expected), c.fmt(x.found), diff(c, x)]));
      if (c.excN > c.exc.length) rows.push(['Exception', safe(text), '', '', '', 'and ' + (c.excN - c.exc.length) + ' more', '', '', '']);
    };
    nt.eqs.forEach(e => { rows.push(['Equation', safe(e.text), e.k + ' of ' + e.n + ' rows', fmtChance(e.adj), '', '', '', '', '']); excRows(e, e.text); });
    nt.seqs.forEach(s => {
      const text = s.name + ' ' + s.desc;
      rows.push(['Sequence', safe(text), s.k + ' of ' + s.n, fmtChance(s.adj), '', '', '', '', '']);
      if (s.next !== null) rows.push(['Next value', safe(text), '', '', '', '', s.fmt(s.next), '', '']);
      s.gaps.forEach(g => rows.push(['Missing value', safe(text), '', '', '', '', s.fmt(g), '', '']));
      excRows(s, text);
    });
    nt.totals.forEach(s => rows.push(['Total', safe(s), '', '', '', '', '', '', '']));
    nt.digits.forEach(s => rows.push(['Digits', safe(s), '', '', '', '', '', '', '']));
    return rows;
  }

  return { analyze, render, renderLine, chips, hasFindings, findings };
})();
