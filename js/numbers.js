const NUMS = (() => {
  const { MIN_SUPPORT, MAX_LOG10P, Q, show } = UTIL;
  const MIN_EQ_ROWS = 4, MIN_SEQ = 5, MAX_COLS = 12, MAX_DATE_COLS = 6, MAX_ROWS = 1000, PAIRS = 4000, SEED = 0x5eed, SHOW_EXC = 5, MAX_EXC = 1000, LINE_CAP = 200000, SHOW_VALUES = 40, SAFE_INT = 2 ** 53;
  const SKIP_TYPES = new Set(['Date', 'Time', 'Phone', 'IP', 'ID', 'Card number', 'Version', 'UUID', 'IBAN', 'Coordinates', 'Colour', 'Email', 'URL']);
  const TOTAL = /^(?:grand\s+|sub-?)?totals?\b|^sum\b/i;
  const DECLARED = /^(?:grand\s+|sub-?)?total\b|^sum\b|\bamount due\b|\bbalance due\b/i;
  const CURX = '(?:[$€£¥₹]|USD|EUR|GBP|JPY|INR|AED|SAR|EGP|CAD|AUD|CHF|CNY)';
  let rand;

  const PLAIN = /^-?\d{1,15}(?:\.(\d{1,15}))?$/;
  const FORMS = /^(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+,\d+|\d+(?:[.,]\d+)?|\.\d+)$/;
  function digitsOf(s) {
    let m = /^(\d{1,3}(?:\.\d{3})+),(\d+)$/.exec(s);
    if (m) return [m[1].replace(/\./g, ''), m[2]];
    m = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/.exec(s);
    if (m) return [m[1].replace(/,/g, ''), m[2] || ''];
    m = /^(\d*)[.,]?(\d*)$/.exec(s);
    return [m[1] || '0', m[2]];
  }
  function cell(v) {
    let s, num;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return null;
      num = v; s = String(v);
      if (/e/i.test(s)) { s = v.toFixed(20).replace(/0+$/, '').replace(/\.$/, ''); if (/e/i.test(s)) return null; }
    } else s = String(v ?? '').trim();
    if (!s) return null;
    const q = PLAIN.exec(s);
    if (q) return { v: num ?? +s, m: BigInt(s.replace('.', '')), d: q[1] ? q[1].length : 0 };
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
    if (/^[-−+]/.test(s)) { neg = neg !== (s[0] !== '+'); s = s.slice(1).trim(); }
    s = s.replace(new RegExp('^' + CURX + '\\s?', 'i'), '').replace(new RegExp('\\s?(?:' + CURX + '|%)$', 'i'), '');
    if (/^[-−]/.test(s)) { neg = !neg; s = s.slice(1); }
    if (!FORMS.test(s)) return null;
    const t = s.replace(/^\./, '0.'), x = TXT.parseNum(t);
    if (!Number.isFinite(x)) return null;
    const [ip, fp] = digitsOf(t), m = BigInt(ip + fp);
    return { v: neg ? -x : x, m: neg ? -m : m, d: fp.length };
  }
  const scaled = (c, d) => c.d === d ? c.m : c.m * 10n ** BigInt(d - c.d);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const fmtChance = l => { const q = -l; if (q < 6) return '1 in ' + Number((10 ** q).toPrecision(2)).toLocaleString('en-US'); if (q > 15) return '< 1 in 10¹⁵'; return '1 in 10' + String(Math.floor(q)).split('').map(c => SUP[c]).join(''); };
  const fmtN = (v, d) => v.toFixed(d), signed = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
  const fmtP = p => p < .001 ? '< 0.001' : p.toFixed(3);
  const fmt8 = v => +v.toPrecision(8);
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
      const vals = new Array(n).fill(null), nums = []; let nonEmpty = 0, sd = 0;
      for (let i = 0; i < n; i++) {
        const raw = rows[i][j], c = cell(raw);
        if (c) vals[i] = c.v;
        if (isTotal[i]) continue;
        if (c) { nums.push(c.v); if (c.d > sd) sd = c.d; }
        if (raw !== undefined && raw !== null && String(raw).trim() !== '') nonEmpty++;
      }
      if (!(nums.length >= 3 && nums.length >= .8 * nonEmpty)) return;
      const d = Math.min(6, sd);
      let min = Infinity, max = -Infinity, sum = 0;
      for (const v of nums) { if (v < min) min = v; if (v > max) max = v; sum += v; }
      cols.push({
        j, name, vals, d, sd, h: .5 * 10 ** -d, min, max, sum,
        big: r => scaled(cell(rows[r][j]), sd),
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
      dateCols.push({ j, name, vals, d: 0, sd: 0, h: .5, date: true, big: r => BigInt(vals[r]), distinct: distinctUpTo3(nums), nums });
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
      log10p: UTIL.log10Tail(n - params, k - params, p0),
      exc, excN: n - k, d: T.d, fmt: colFmt(T), unit: T.date ? ' days' : ''
    };
  }

  function candidates(V, ctx) {
    const out = [], { eqCols, constCols, dataRows, searchRows, dateEq } = V;
    const prev = new Map(); dataRows.forEach((r, i) => { if (i > 0) prev.set(r, dataRows[i - 1]); });
    const withPrevFull = dataRows.filter(r => prev.has(r)), withPrevSearch = searchRows.filter(r => prev.has(r));
    const add = c => { if (c) out.push(c); };
    const exact = c => c.date || Math.max(Math.abs(c.min), Math.abs(c.max)) < SAFE_INT / 10 ** c.d;
    const ok = (...cs) => { if (cs.every(exact)) return true; ctx.skipped++; return false; };
    const run = (T, predict, params, rank, rhs, usePrev) => {
      const a = usePrev ? withPrevSearch : searchRows, b = usePrev ? withPrevFull : dataRows;
      const r = evalRel(V, T, a, predict, params, rank, rhs);
      if (!r || a.length === b.length) return r;
      return evalRel(V, T, b, predict, params, rank, rhs);
    };
    const pairsOf = T => { const o = eqCols.filter(c => c !== T), r = []; for (let a = 0; a < o.length; a++) for (let b = a + 1; b < o.length; b++) r.push([o[a], o[b]]); return r; };
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        if (!ok(T, A, B)) return;
        ctx.tested++;
        add(run(T, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] + B.vals[r], 0, 0, A.name + ' + ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A, B]) => {
        if (!ok(T, A, B)) return;
        ctx.tested++;
        add(run(T, r => A.vals[r] === null || B.vals[r] === null ? null : A.vals[r] * B.vals[r], 0, 1, A.name + ' × ' + B.name));
      });
    });
    eqCols.forEach(T => {
      pairsOf(T).forEach(([A0, B0]) => {
        if (A0.pct === B0.pct) return;
        const A = A0.pct ? B0 : A0, B = A0.pct ? A0 : B0;
        if (!ok(T, A, B)) return;
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
        if (!ok(T, ...inp)) continue;
        ctx.tested++;
        const rhs = L <= 4 ? inp.map(c => c.name).join(' + ') : inp[0].name + ' + … + ' + inp[L - 1].name;
        add(run(T, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, rhs));
      }
      runs.set(T, tried);
    });
    if (eqCols.length >= 4) {
      eqCols.forEach(T => {
        const inp = eqCols.filter(c => c !== T), key = inp.map(c => c.j).join(',');
        if (runs.get(T).has(key) || !ok(T, ...inp)) return;
        ctx.tested++;
        add(run(T, r => { let s = 0; for (const c of inp) { if (c.vals[r] === null) return null; s += c.vals[r]; } return s; }, 0, 3, 'sum of the other columns'));
      });
    }
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A.j >= T.j || !ok(T, A)) return;
        ctx.tested++;
        const ratios = searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null && A.vals[r] !== 0).map(r => T.vals[r] / A.vals[r]);
        if (!ratios.length) return;
        const c = UTIL.median(ratios);
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
        if (A.j >= T.j || !ok(T, A)) return;
        ctx.tested++;
        const diffs = searchRows.filter(r => A.vals[r] !== null && T.vals[r] !== null).map(r => T.vals[r] - A.vals[r]);
        if (!diffs.length) return;
        const b = +UTIL.median(diffs).toFixed(T.d);
        if (b === 0) return;
        add(run(T, r => A.vals[r] === null ? null : A.vals[r] + b, 1, 5, A.name + (b > 0 ? ' + ' : ' − ') + fmtN(Math.abs(b), T.d)));
      });
    });
    eqCols.forEach(T => {
      eqCols.forEach(A => {
        if (A === T) return;
        [1, -1].forEach(sign => {
          if (!ok(T, A)) return;
          ctx.tested++;
          add(run(T, r => { const pv = T.vals[prev.get(r)], a = A.vals[r]; return pv === null || a === null ? null : pv + sign * a; }, 0, 6, 'previous ' + T.name + (sign > 0 ? ' + ' : ' − ') + A.name, true));
        });
      });
    });
    eqCols.forEach(T => {
      const pctLike = T.pct || T.max <= 100, scale = T.pct ? 100 : T.max <= 1 ? 1 : 100;
      if (T.min < 0 || !pctLike) return;
      eqCols.forEach(A => {
        if (A === T || A.min < 0 || !(A.sum > 0) || !ok(T, A)) return;
        ctx.tested++;
        add(run(T, r => A.vals[r] === null ? null : scale * A.vals[r] / A.sum, 0, 7, A.name + ' ÷ sum of ' + A.name + (scale === 100 ? ' × 100' : '')));
      });
    });
    eqCols.forEach((T, p) => {
      for (let L = 2; L <= Math.min(8, p); L++) {
        const inp = eqCols.slice(p - L, p);
        if (!ok(T, ...inp)) continue;
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
        const b = Math.round(UTIL.median(diffs));
        if (b === 0) return;
        add(run(T, r => A.vals[r] === null ? null : A.vals[r] + b, 1, 9, A.name + (b > 0 ? ' + ' : ' − ') + Math.abs(b) + UTIL.dayWord(b)));
      });
    });
    dateEq.forEach(T => {
      dateEq.forEach(A => {
        if (A.j >= T.j) return;
        eqCols.forEach(N => {
          if (!ok(N)) return;
          ctx.tested++;
          add(run(T, r => A.vals[r] === null || N.vals[r] === null ? null : A.vals[r] + N.vals[r], 0, 10, A.name + ' + ' + N.name + ' days'));
        });
      });
    });
    eqCols.forEach(N => {
      dateEq.forEach(T => {
        dateEq.forEach(A => {
          if (A.j >= T.j || !ok(N)) return;
          ctx.tested++;
          add(run(N, r => A.vals[r] === null || T.vals[r] === null ? null : T.vals[r] - A.vals[r], 0, 11, T.name + ' − ' + A.name + ' (days)'));
        });
      });
    });
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
        const e = n / 10, chi2 = cnt.reduce((s, o) => s + (o - e) ** 2 / e, 0), p = UTIL.chiP(chi2, 9);
        out.push(c.name + ': last digits ' + (p < .01 ? 'are uneven' : 'look even') + ' (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', ' + n + ' values). Invented or hand-typed numbers often skew last digits; so do rounding and prices.');
      }
      if (integer && n >= 30) {
        const k = nums.filter(v => Math.abs(v) % 5 === 0).length;
        if (UTIL.adjust(UTIL.log10Tail(n, k, .2), V.cols.length) <= MAX_LOG10P) out.push(c.name + ': ' + Math.round(k / n * 100) + '% end in 0 or 5 (expected 20%): values look rounded or estimated.');
      }
      if (c.min > 0 && n >= 100 && c.max / c.min >= 100) {
        const cnt = Array(10).fill(0); nums.forEach(v => { const m = String(Math.abs(v)).match(/[1-9]/); if (m) cnt[+m[0]]++; });
        let mad = 0, chi2 = 0;
        for (let dg = 1; dg <= 9; dg++) { const pr = Math.log10(1 + 1 / dg), e = n * pr; mad += Math.abs(cnt[dg] / n - pr); chi2 += (cnt[dg] - e) ** 2 / e; }
        mad /= 9;
        const p = UTIL.chiP(chi2, 8), verdict = p >= .01 ? 'fit' : mad <= .006 ? 'differ only slightly from' : 'differ from';
        out.push(c.name + ': first digits ' + verdict + ' Benford\'s law (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', MAD ' + mad.toFixed(4) + ', ' + n + ' values). Many natural amounts follow it; prices, IDs and capped ranges do not.');
      }
    });
    return out;
  }

  function pickBest(list) { return list.slice().sort((a, b) => a.log10p - b.log10p || a.params - b.params || a.rank - b.rank)[0]; }

  function signedQ(found, expected, d) {
    const diff = Q(found * expected.d - expected.n, expected.d), neg = diff.n < 0n;
    return (neg ? '−' : '+') + show(Q(neg ? -diff.n : diff.n, diff.d), d);
  }
  function seqView(res, col, d, rowOf, label) {
    const fmt = col.date ? v => isoDay(Number(typeof v === 'bigint' ? v : v.n / v.d)) : v => show(v, d);
    const wrap = v => Object.assign({}, v, { fmt, mUsed: v.tested });
    const out = wrap(res);
    out.kind = 'seq'; out.seqKind = res.family; out.name = col.name; out.col = col.j; out.d = d; out.unit = col.date ? ' days' : '';
    out.exc = res.exc.map(e => ({ row: rowOf(e.i), label: label ? label(rowOf(e.i)) : '', expected: e.expected, found: e.found, diff: signedQ(e.found, e.expected, d) }));
    out.rivals = res.rivals.map(wrap);
    return out;
  }

  function analyze(a) {
    rand = UTIL.rng(SEED);
    const tables = a.tables.map(t => {
      const V = view(t);
      if (t.title === 'Key–value pairs') {
        if (!V.cols.length) return null;
        return { eqs: [], seqs: [], totals: [], cols: V.cols.map(c => colLine(c.name, c.nums)), digits: [], formula: {}, bad: {}, overflow: 0, m: 0, skipped: 0, V, kvOnly: true };
      }
      if (!V.cols.length && !V.dateCols.length) return null;
      const ctx = { tested: 0, skipped: 0 }, bad = {}, formula = {}, seqs = [];
      const eqAll = candidates(V, ctx);
      V.cols.concat(V.dateCols).filter(c => c.distinct >= 2).forEach(c => {
        const idx = V.dataRows.filter(r => c.vals[r] !== null);
        if (idx.length < MIN_SEQ) return;
        const res = SEQ.analyze(idx.map(r => c.big(r)), { d: c.sd, rand, columns: true, date: !!c.date });
        if (res) seqs.push(seqView(res, c, c.sd, i => idx[i], V.label));
      });
      seqs.sort((x, y) => x.col - y.col);
      const m = ctx.tested, byTarget = new Map();
      eqAll.filter(c => { c.adj = UTIL.adjust(c.log10p, m); return c.adj <= MAX_LOG10P; }).forEach(c => byTarget.set(c.target, [...(byTarget.get(c.target) || []), c]));
      const eqs = [...byTarget.values()].map(pickBest).sort((x, y) => x.target - y.target);
      let overflow = 0;
      eqs.forEach(e => { formula[e.target] = e.rhs; overflow += e.excN - e.exc.length; e.exc.forEach(x => { bad[x.row + ',' + e.target] = 'expected ' + e.fmt(x.expected); }); });
      seqs.forEach(s => { overflow += s.excN - s.exc.length; s.exc.forEach(x => { bad[x.row + ',' + s.col] = 'expected ' + s.fmt(x.expected); }); });
      const totals = totalsFor(V, bad);
      const cols = V.cols.map(c => colLine(c.name, c.nums));
      const digits = digitsFor(V, seqs);
      return { eqs, seqs, totals, cols, digits, formula, bad, overflow, m, skipped: ctx.skipped, V };
    });

    (a.pairs || []).forEach(p => {
      if (!DECLARED.test(p.k)) return;
      const pc = cell(p.v); if (!pc) return;
      const pd = Math.min(6, pc.d), tolD = .5 * 10 ** -pd + 1e-9 * Math.max(1, Math.abs(pc.v));
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
        nt.totals.push(p.k + ' (line ' + p.line + ', ' + p.v + ') does not equal the sum of ' + c.name + ' (' + fmtN(S, pd) + ', ' + count + ' rows).');
      }
    });

    const used = new Set(a.used || []), lines = [], isGap = t => /^\?+$/.test(t);
    a.kept.forEach((l, i) => {
      if (used.has(i) || !/^[\s\d.,;+\-−?]+$/.test(l)) return;
      const parts = l.includes(';') ? l.split(/\s*;\s*/) : l.includes(', ') ? l.split(/,\s+/) : /\s/.test(l.trim()) ? l.trim().split(/\s+/) : l.split(',');
      if (parts.length < MIN_SEQ) return;
      const toks = parts.slice(0, LINE_CAP).map(s => s.trim()), cells = toks.map(t => isGap(t) ? false : cell(t));
      if (cells.some(c => c === null)) return;
      let d = 0; for (const c of cells) if (c && c.d > d) d = c.d;
      const res = SEQ.analyze(cells.map(c => c === false ? null : scaled(c, d)), { d, rand, columns: false, date: false });
      const best = res ? seqView(res, { j: 0, name: 'Values' }, d, k => k, null) : null;
      if (best && parts.length > toks.length) [best, ...best.rivals].forEach(v => { v.next = null; });
      lines.push({ line: i + 1, items: toks, total: parts.length, seqs: best ? [best] : [] });
    });

    const eq = tables.reduce((s, t) => s + (t ? t.eqs.length : 0), 0), seq = tables.reduce((s, t) => s + (t ? t.seqs.length : 0), 0) + lines.reduce((s, l) => s + l.seqs.length, 0);
    const brokenKeys = new Set(); let overflow = 0;
    tables.forEach((t, ti) => { if (t) { overflow += t.overflow; Object.keys(t.bad).forEach(k => brokenKeys.add(ti + '|' + k)); } });
    return { tables, lines, count: { eq, seq, broken: brokenKeys.size + overflow } };
  }

  const excList = (exc, excN, unit) => {
    if (!exc.length) return '';
    return '<ul class="stats">' + exc.slice(0, SHOW_EXC).map(x => '<li>Row ' + (x.row + 1) + (x.label ? ' ' + UTIL.esc(x.label) : '') + ': expected ' + x.fmt(x.expected) + ', found ' + x.fmt(x.found) + ' (' + (x.diff !== undefined ? x.diff : signed(x.found - x.expected, x.dd)) + unit + ')</li>').join('') + (excN > SHOW_EXC ? '<li>and ' + (excN - SHOW_EXC) + ' more</li>' : '') + '</ul>';
  };
  const withFmt = c => c.exc.map(x => Object.assign({}, x, { fmt: c.fmt, dd: c.unit ? 0 : c.d }));
  const rivalText = c => c.rivals && c.rivals.length ? ' · also fits ' + c.rivals.map(r => UTIL.esc(r.desc) + ' (' + (r.next !== null && r.next !== undefined ? 'next ' + UTIL.esc(r.fmt(r.next)) + ', ' : '') + 'chance ' + UTIL.esc(fmtChance(r.adj)) + ')').join('; ') : '';
  const chanceNote = what => '<p class="tstat">Chance: how often a match this good appears when the values are shuffled, corrected for ' + what + '.</p>';
  const section = (title, items, note = '') => items.length ? '<h4>' + title + '</h4>' + note + '<ul class="stats">' + items.join('') + '</ul>' : '';
  const SKIPPED = '<p class="tstat">Some relations were not tested because values are too large for exact comparison.</p>';
  const fills = c => c.filled.length ? ' · fills in ' + UTIL.esc(c.filled.map(f => 'position ' + (f.i + 1) + ' = ' + c.fmt(f.v)).join(', ')) : '';
  const nextOf = c => c.next !== null ? ' · next ' + UTIL.esc(c.fmt(c.next)) : '';
  const verdict = c => UTIL.esc(c.desc) + ' · ' + c.k + ' of ' + c.n + ' · chance ' + UTIL.esc(fmtChance(c.adj));
  const fitNote = s => s.fitted < s.size ? ' · rule searched in the first ' + s.fitted.toLocaleString('en-US') + ' values, checked on all ' + s.size.toLocaleString('en-US') : '';
  function seqItems(seqs) {
    return seqs.map(s => '<li><b>' + UTIL.esc(s.name) + '</b> ' + (s.ambiguous
      ? 'Ambiguous: these rules fit equally well and continue differently.<ul class="stats">' + [s, ...s.rivals].map(c => '<li>' + verdict(c) + nextOf(c) + fills(c) + '</li>').join('') + '</ul>'
      : verdict(s) + nextOf(s) + (s.gaps.length ? ' · missing ' + UTIL.esc(s.gaps.map(s.fmt).join(', ')) : '') + fills(s) + rivalText(s)) +
      ' · corrected for ' + s.mUsed + (s.mUsed === 1 ? ' rule' : ' rules') + ' tested' + fitNote(s) + excList(withFmt(s), s.excN, s.unit) + '</li>');
  }

  function render(nt) {
    const eqItems = nt.eqs.map(e => '<li><b>' + UTIL.esc(e.text) + '</b> · ' + e.k + ' of ' + e.n + ' rows · chance ' + UTIL.esc(fmtChance(e.adj)) + excList(withFmt(e), e.excN, e.unit) + '</li>');
    const sqItems = seqItems(nt.seqs);
    return section('Equations', eqItems, chanceNote(nt.m + ' relations tested')) + section('Sequences', sqItems, chanceNote('the number of rules tested')) + (nt.skipped ? SKIPPED : '') + section('Totals', nt.totals.map(s => '<li>' + UTIL.esc(s) + '</li>')) + section('Columns', nt.cols.map(s => '<li>' + UTIL.esc(s) + '</li>')) + section('Digits', nt.digits.map(s => '<li>' + UTIL.esc(s) + '</li>'));
  }

  function renderLine(L) {
    const items = seqItems(L.seqs);
    const body = items.length ? section('Sequences', items, chanceNote('the number of rules tested')) : '<p class="tstat">No pattern passed. Only step, ratio, polynomial, recurrence, cycle and known-sequence families were tested; a list the app declines to explain is not evidence that it has no pattern.</p>';
    const shown = L.items.slice(0, SHOW_VALUES).join(', ') + (L.total > SHOW_VALUES ? ' … (' + L.total + ' values' + (L.total > L.items.length ? ', first ' + L.items.length + ' analysed' : '') + ')' : '');
    return '<article class="card"><h3>Number line ' + L.line + '</h3><p class="tstat">' + UTIL.esc(shown) + '</p>' + body + '</article>';
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
    const diff = (c, x) => { if (x.diff !== undefined) return x.diff.replace('−', '-'); const v = x.found - x.expected, dd = c.unit ? 0 : c.d; return (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(dd); };
    const excRows = (c, text) => {
      c.exc.forEach(x => rows.push(['Exception', safe(text), '', '', x.row + 1, safe(x.label), c.fmt(x.expected), c.fmt(x.found), diff(c, x)]));
      if (c.excN > c.exc.length) rows.push(['Exception', safe(text), '', '', '', 'and ' + (c.excN - c.exc.length) + ' more', '', '', '']);
    };
    nt.eqs.forEach(e => { rows.push(['Equation', safe(e.text), e.k + ' of ' + e.n + ' rows', fmtChance(e.adj), '', '', '', '', '']); excRows(e, e.text); });
    nt.seqs.forEach(s => {
      const text = s.name + ' ' + s.desc;
      rows.push(['Sequence', safe(text), s.k + ' of ' + s.n, fmtChance(s.adj), '', '', '', '', '']);
      if (s.ambiguous) s.rivals.forEach(r => rows.push(['Ambiguous alternative', safe(s.name + ' ' + r.desc), r.k + ' of ' + r.n, fmtChance(r.adj), '', '', r.next !== null ? s.fmt(r.next) : '', '', '']));
      else {
        if (s.next !== null) rows.push(['Next value', safe(text), '', '', '', '', s.fmt(s.next), '', '']);
        s.gaps.forEach(g => rows.push(['Missing value', safe(text), '', '', '', '', s.fmt(g), '', '']));
        s.filled.forEach(f => rows.push(['Filled value', safe(text), '', '', f.i + 1, '', s.fmt(f.v), '', '']));
      }
      excRows(s, text);
    });
    nt.totals.forEach(s => rows.push(['Total', safe(s), '', '', '', '', '', '', '']));
    nt.digits.forEach(s => rows.push(['Digits', safe(s), '', '', '', '', '', '', '']));
    return rows;
  }

  return { analyze, render, renderLine, chips, hasFindings, findings };
})();
