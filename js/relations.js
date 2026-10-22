const REL = (() => {
  const { MIN_SUPPORT, Q } = UTIL;
  const { abs, max, min, floor, round } = Math;
  const MIN_ROWS = 4, PART_ROWS = 2, PAIRS = 4000, MAX_EXC = 1000, SHUFFLES = 20, VOTES = 30, WIDE = 8, SLACK = 2, MIN_SIDE = 5, MAX_GROUPS = 12, MIN_GROUP = 3, SAFE = 2 ** 53, MAX_RUN = 8, TOP = 3, CAP_DEN = 10n ** 300n, SHOWN = 3;

  const P10 = [1n];
  const pw = k => { while (P10.length <= k) P10.push(P10[P10.length - 1] * 10n); return P10[k]; };
  const rA = (a, b) => [a[0] * b[1] + b[0] * a[1], a[1] * b[1]];
  const rS = (a, b) => [a[0] * b[1] - b[0] * a[1], a[1] * b[1]];
  const rM = (a, b) => [a[0] * b[0], a[1] * b[1]];
  const rD = (a, b) => b[0] === 0n ? null : b[0] < 0n ? [-a[0] * b[1], -a[1] * b[0]] : [a[0] * b[1], a[1] * b[0]];
  const rK = (a, q) => [a[0] * q.n, a[1] * q.d];
  const rQ = p => Q(p[0], p[1]);
  const cmp = (a, b) => { const d = a[0] * b[1] - b[0] * a[1]; return d < 0n ? -1 : d > 0n ? 1 : 0; };
  const ONE = [1n, 1n], H100 = [100n, 1n], PER = [1n, 100n];

  const X = (c, r) => { let v = c.xb[r]; if (v === undefined) { const k = c.cells[r]; v = c.xb[r] = k ? (k.d === c.sd ? k.m : k.m * pw(c.sd - k.d)) : null; } return v; };
  const px = (c, r) => { const m = X(c, r); return m === null ? null : [m, c.S]; };
  const fixed = (p, d) => {
    const num = p[0] * pw(d), den = p[1], neg = num < 0n, a = neg ? -num : num, r = (a * 2n + den) / (2n * den), s = String(r).padStart(d + 1, '0');
    return (neg && r !== 0n ? '-' : '') + (d ? s.slice(0, s.length - d) + '.' + s.slice(s.length - d) : s);
  };
  const signedP = (p, d) => { const neg = p[0] < 0n; return (neg ? '−' : '+') + fixed(neg ? [-p[0], p[1]] : p, d); };
  const fmtOf = T => T.date ? q => CELL.iso(Number(q.n / q.d)) : q => fixed([q.n, q.d], T.sd);
  const disp = (c, r) => c.date ? CELL.iso(c.vals[r]) : fixed(px(c, r), c.sd);
  const tolF = (T, y) => T.h + 1e-9 * max(1, abs(y));

  const decQ = x => {
    let s = String(x); if (/e/i.test(s)) s = x.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
    const neg = s[0] === '-', [ip, fp = ''] = (neg ? s.slice(1) : s).split('.');
    return Q((neg ? -1n : 1n) * BigInt(ip + fp), 10n ** BigInt(fp.length));
  };
  const qStr = q => q.n + '/' + q.d;
  const INV = { ';÷100': ';×100', ';×100': ';÷100' };
  const signedKey = (kind, terms, tail = '') => {
    const t = terms.map(x => x.slice()).sort((a, b) => a[0] - b[0]);
    if (t[0][1] < 0) { t.forEach(x => { x[1] = -x[1]; }); tail = INV[tail] || tail; }
    return kind + ':' + t.map(([j, sg]) => (sg > 0 ? '+' : '-') + j).join('') + tail;
  };
  const scaleKey = (T, A, c) => 'scale:' + min(T.j, A.j) + ',' + max(T.j, A.j) + ':' + qStr(decQ(+(T.j > A.j ? c : 1 / c).toPrecision(4)));
  const shiftKey = (T, A, b) => 'shift:' + min(T.j, A.j) + ',' + max(T.j, A.j) + ':' + qStr(T.j > A.j ? decQ(b) : decQ(-b));
  const pairKey = (kind, T, A) => kind + ':' + min(T.j, A.j) + ',' + max(T.j, A.j);

  const prep = V => {
    const n = V.rows.length;
    [...V.cols, ...V.dateCols].forEach(c => {
      if (c.f) return;
      c.f = Float64Array.from(c.vals, v => v === null ? NaN : v);
      c.S = pw(c.sd);
      c.xb = new Array(n);
      c.huge = !c.date && max(abs(c.min), abs(c.max)) >= SAFE / 10 ** c.d;
    });
    return { V, n };
  };

  function floatScan(T, rows, fp, params) {
    const f = T.f, lim = (1 - MIN_SUPPORT) * rows.length + SLACK;
    let n = 0, k = 0, miss = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], y = f[r]; if (y !== y) continue;
      const p = fp(r); if (p - p !== 0) continue;
      n++;
      if (abs(p - y) <= T.h + 1e-9 * max(1, abs(y))) k++; else if (++miss > lim) return false;
    }
    return n >= MIN_ROWS && k + SLACK >= params + 3 && (k + SLACK) / n >= MIN_SUPPORT;
  }

  function exactScan(T, rows, ex, cut) {
    const use = [], pr = [], st = [], lim = (1 - MIN_SUPPORT) * rows.length + SLACK;
    let k = 0, e = 0, miss = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], y = X(T, r); if (y === null) continue;
      const p = ex(r); if (!p) continue;
      const d = p[0] * T.S - y * p[1], a = d < 0n ? -d : d, h = a === 0n ? 2 : a * 2n <= p[1] ? 1 : 0;
      use.push(r); pr.push(p); st.push(h);
      if (h) k++; else if (cut && ++miss > lim) return null;
      if (h === 2) e++;
    }
    return { use, pr, st, n: use.length, k, e };
  }

  const supported = (ev, params) => ev && ev.n >= MIN_ROWS && ev.k >= params + 3 && ev.k / ev.n >= MIN_SUPPORT;

  function workedRow(spec, V, T, r, p, st) {
    const args = spec.args ? spec.args(r) : spec.ins.map(c => disp(c, r)), found = T.date ? CELL.iso(T.vals[r]) : fixed([X(T, r), T.S], T.sd);
    return { row: r, label: V.label(r), expr: spec.expr ? spec.expr(args) : '', args, expected: T.date ? CELL.iso(Number(p[0] / p[1])) : fixed(p, T.sd), found, exact: st === 2, ok: st > 0 };
  }

  function conclude(env, spec, ev, mkr) {
    const { V } = env, T = spec.T, n = ev.n, k = ev.k, use = ev.use, params = spec.params;
    const Pf = new Float64Array(n), Yf = new Float64Array(n);
    for (let i = 0; i < n; i++) { Pf[i] = mkr.fp(use[i]); Yf[i] = T.f[use[i]]; }
    let ph = 0, pairs = 0, rand = null;
    const hit = (i, j) => { if (abs(Pf[i] - Yf[j]) <= tolF(T, Yf[j])) ph++; pairs++; };
    if (n * (n - 1) <= PAIRS) { for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) hit(i, j); }
    else for (let q = 0; q < PAIRS; q++) { rand = rand || UTIL.rngFor(V.key, 'pairs', T.j, spec.form); const i = floor(rand() * n); let j = floor(rand() * (n - 1)); if (j >= i) j++; hit(i, j); }
    const pPair = (ph + 1) / (pairs + 2);
    let p0 = pPair, pRefit = null;
    if (spec.refit) {
      const rs = UTIL.rngFor(V.key, 'refit', T.j, spec.form), Ya = Array.from(Yf);
      let hs = 0;
      for (let s = 0; s < SHUFFLES; s++) hs += max(0, spec.refit(use, derange(Ya, rs)) - params);
      pRefit = (hs + 1) / (SHUFFLES * max(1, n - params) + 2);
      if (pRefit > p0) p0 = pRefit;
    }
    const exceptions = [], hits = [];
    for (let i = 0; i < n; i++) {
      if (ev.st[i]) { if (hits.length < SHOWN) hits.push(workedRow(spec, V, T, use[i], ev.pr[i], ev.st[i])); continue; }
      if (exceptions.length >= MAX_EXC) continue;
      const p = ev.pr[i], y = X(T, use[i]);
      exceptions.push({ row: use[i], label: V.label(use[i]), expected: rQ(p), found: Q(y, T.S), diff: signedP(rS([y, T.S], p), T.sd), reason: 'differs from ' + spec.form });
    }
    const firstMiss = ev.st.indexOf(0), sk = 'column:' + V.key + ':' + T.j;
    let parts = [];
    if (spec.partOf) {
      parts = spec.partList.map(x => Object.assign({ hits: 0, n: 0, worked: [], firstException: null }, x));
      for (let i = 0; i < n; i++) {
        const g = spec.partOf(use[i]); if (g < 0) continue;
        const part = parts[g]; part.n++;
        if (ev.st[i]) { part.hits++; if (part.worked.length < PART_ROWS) part.worked.push(workedRow(Object.assign({}, spec, { expr: s => spec.partExpr(g, s) }), V, T, use[i], ev.pr[i], ev.st[i])); }
        else if (!part.firstException) part.firstException = workedRow(Object.assign({}, spec, { expr: s => spec.partExpr(g, s) }), V, T, use[i], ev.pr[i], 0);
      }
    }
    return {
      id: sk + '|' + spec.fam + '|' + spec.form, kind: 'rel', inputs: spec.ins.map(c => c.j), combined: !!spec.combined, parts,
      subject: { kind: 'column', table: V.key, cols: [T.j], line: null },
      scope: spec.scope || { kind: 'all', rows: null, label: '' },
      family: spec.fam, rank: spec.rank, params, key: spec.key || spec.rank + ':' + T.j + ':' + spec.form, form: spec.form, headline: T.name + ' = ' + spec.form,
      hits: k, n, exact: ev.e, rounded: k - ev.e, exceptions, excN: n - k,
      log10p: UTIL.log10Tail(n - params, k - params, p0), chance: 0, tested: 0,
      next: null, fills: [], predictions: null, status: 'primary', group: null, explainedBy: {},
      target: T.j, d: T.sd, date: !!T.date, fmt: fmtOf(T), unit: T.date ? ' days' : '',
      evidence: { how: spec.how || '', params: spec.coef || [], hits, firstException: firstMiss >= 0 ? workedRow(spec, V, T, use[firstMiss], ev.pr[firstMiss], 0) : null, p0, pPair, pairHits: ph, pRefit, pairs, mult: spec.mult || [], direction: spec.dir || '', decimals: T.sd }
    };
  }

  function noteFail(env, spec, ev) {
    if (!ev || ev.n < MIN_ROWS || ev.k < 1) return;
    const T = spec.T, cur = env.fails.get(T.j), rate = ev.k / ev.n;
    if (!cur || rate > cur.rate || (rate === cur.rate && spec.params < cur.params)) env.fails.set(T.j, { T, spec, k: ev.k, n: ev.n, rate, params: spec.params });
  }

  function failures(env) {
    const V = env.V;
    return [...env.fails.values()].sort((a, b) => a.T.j - b.T.j).map(f => ({
      id: 'column:' + V.key + ':' + f.T.j + '|miss|' + f.spec.form, kind: 'rel', subject: { kind: 'column', table: V.key, cols: [f.T.j], line: null }, scope: f.spec.scope || { kind: 'all', rows: null, label: '' },
      family: f.spec.fam, params: f.params, form: f.spec.form, headline: f.T.name + ' = ' + f.spec.form, hits: f.k, n: f.n, excN: f.n - f.k, chance: null, status: 'miss', miss: f.k / f.n < MIN_SUPPORT ? 'support' : 'rows', need: f.params + 3
    }));
  }

  function evaluate(env, spec) {
    const { V } = env, T = spec.T, S = V.searchRows, D = V.dataRows, mk = spec.mk || (() => spec), params = spec.params;
    const big = spec.ins.some(c => c.huge) || T.huge;
    let mkr = mk(S);
    if (!big && !floatScan(T, S, mkr.fp, params)) return null;
    let ev = exactScan(T, S, mkr.ex, true);
    if (!supported(ev, params)) { noteFail(env, spec, ev); return null; }
    if (D.length !== S.length) {
      mkr = mk(D); ev = exactScan(T, D, mkr.ex, false);
      if (!supported(ev, params)) { noteFail(env, spec, ev); return null; }
    }
    return conclude(env, spec, ev, mkr);
  }

  const gather = (T, rows, ...cs) => {
    const idx = [], Y = [], A = cs.map(() => []);
    for (const r of rows) {
      const y = T.f[r]; if (y !== y) continue;
      let ok = true; for (const c of cs) if (c.f[r] !== c.f[r]) { ok = false; break; }
      if (!ok) continue;
      idx.push(r); Y.push(y); cs.forEach((c, i) => A[i].push(c.f[r]));
    }
    return { idx, Y, A };
  };

  const hitsAff = (A, Y, a, b, h) => { let k = 0; for (let i = 0; i < A.length; i++) if (abs(a * A[i] + b - Y[i]) <= h + 1e-9 * max(1, abs(Y[i]))) k++; return k; };
  function fitScale(A, Y, h) {
    const ratios = []; for (let i = 0; i < A.length; i++) if (A[i] !== 0) ratios.push(Y[i] / A[i]);
    if (!ratios.length) return null;
    const c = UTIL.median(ratios); if (!Number.isFinite(c) || c === 0) return null;
    const first = +c.toPrecision(6), ref = hitsAff(A, Y, first, 0, h);
    for (let s = 1; s <= 6; s++) { const x = +c.toPrecision(s); if (hitsAff(A, Y, x, 0, h) >= ref) return x; }
    return first;
  }
  const medDiff = (A, Y) => UTIL.median(Y.map((y, i) => y - A[i]));
  const hitsShift = (A, Y, b, h) => hitsAff(A, Y, 1, b, h);

  const derange = (a, rand) => {
    const n = a.length, idx = UTIL.shuffle(Array.from({ length: n }, (_, i) => i), rand);
    for (let i = 0; i < n; i++) if (idx[i] === i) { const j = i === n - 1 ? i - 1 : i + 1; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx.map(i => a[i]);
  };

  const topValues = (vals, k) => {
    const c = new Map();
    for (let i = 0; i < vals.length; i++) { const v = vals[i]; if (v === v) c.set(v, (c.get(v) || 0) + 1); }
    const top = [];
    for (const e of c) {
      let i = top.length;
      while (i > 0 && (e[1] > top[i - 1][1] || (e[1] === top[i - 1][1] && e[0] < top[i - 1][0]))) i--;
      if (i < k) { top.splice(i, 0, e); if (top.length > k) top.pop(); }
    }
    return top.map(e => e[0]);
  };

  function fitConst(kind, A, Y, T) {
    if (kind === 'scale') return fitScale(A, Y, T.h);
    if (!A.length) return null;
    return +medDiff(A, Y).toFixed(T.date ? 0 : T.d);
  }
  const predOf = (kind, c, a) => kind === 'scale' ? c * a : a + c;
  const hitsOf = (kind, A, Y, c, h) => kind === 'scale' ? hitsAff(A, Y, c, 0, h) : hitsShift(A, Y, c, h);

  function segFit(kind, A, Y, T) {
    const m = A.length;
    if (m < 2 * MIN_SIDE) return null;
    const q = new Float64Array(m);
    for (let i = 0; i < m; i++) q[i] = kind === 'scale' ? (A[i] === 0 ? NaN : +(Y[i] / A[i]).toPrecision(4)) : +(Y[i] - A[i]).toFixed(T.date ? 0 : T.d);
    const cs = [];
    for (const v of topValues(q, TOP)) {
      let c = v;
      if (kind === 'scale') { const ia = [], ya = []; for (let i = 0; i < m; i++) if (q[i] === v) { ia.push(A[i]); ya.push(Y[i]); } c = fitScale(ia, ya, T.h); }
      if (c === null || (kind === 'scale' && c === 0) || cs.includes(c)) continue;
      cs.push(c);
    }
    if (cs.length < 2) return null;
    const pre = cs.map(c => { const p = new Int32Array(m + 1); for (let i = 0; i < m; i++) p[i + 1] = p[i] + (abs(predOf(kind, c, A[i]) - Y[i]) <= tolF(T, Y[i]) ? 1 : 0); return p; });
    let best = null;
    for (let g1 = 0; g1 < cs.length; g1++) for (let g2 = 0; g2 < cs.length; g2++) {
      if (g1 === g2) continue;
      for (let s = MIN_SIDE; s <= m - MIN_SIDE; s++) {
        const left = pre[g1][s], right = pre[g2][m] - pre[g2][s];
        if (left < MIN_SUPPORT * s || right < MIN_SUPPORT * (m - s)) continue;
        if (!best || left + right > best.total) best = { total: left + right, c1: cs[g1], c2: cs[g2], s };
      }
    }
    return best;
  }

  function groupFit(kind, A, Y, gid, count, T) {
    const arrA = Array.from({ length: count }, () => []), arrY = Array.from({ length: count }, () => []);
    for (let i = 0; i < A.length; i++) { const g = gid[i]; if (g >= 0) { arrA[g].push(A[i]); arrY[g].push(Y[i]); } }
    const cs = [];
    for (let g = 0; g < count; g++) {
      if (arrA[g].length < MIN_GROUP) return null;
      const c = fitConst(kind, arrA[g], arrY[g], T);
      if (c === null) return null;
      cs.push(c);
    }
    return cs.every(c => c === cs[0]) ? null : cs;
  }

  const lsq = (A, Y, ok) => {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < A.length; i++) if (ok[i]) { n++; sx += A[i]; sy += Y[i]; sxx += A[i] * A[i]; sxy += A[i] * Y[i]; }
    const den = n * sxx - sx * sx;
    if (n < 2 || abs(den) < 1e-12 * max(1, n * sxx)) return null;
    const a = (n * sxy - sx * sy) / den;
    return [a, (sy - a * sx) / n];
  };
  const inliers = (A, Y, a, b, h) => A.map((x, i) => abs(a * x + b - Y[i]) <= h + 1e-9 * max(1, abs(Y[i])));

  function voteAffine(A, Y, h, rand) {
    const n = A.length; let best = null, bk = -1;
    if (n < MIN_ROWS) return null;
    for (let v = 0; v < VOTES; v++) {
      const i = floor(rand() * n); let j = floor(rand() * (n - 1)); if (j >= i) j++;
      const dA = A[i] - A[j]; if (dA === 0) continue;
      const a = (Y[i] - Y[j]) / dA, b = Y[i] - a * A[i], k = hitsAff(A, Y, a, b, h);
      if (k > bk) { bk = k; best = [a, b]; }
    }
    if (!best) return null;
    let [a, b] = best, k = bk;
    for (let it = 0; it < 2; it++) {
      const ok = inliers(A, Y, a, b, h), f = lsq(A, Y, ok); if (!f) break;
      const kk = hitsAff(A, Y, f[0], f[1], h);
      if (kk >= k) { a = f[0]; b = f[1]; k = kk; } else break;
    }
    return { a, b, k };
  }

  function simplifyAffine(A, Y, h, v) {
    const ok = inliers(A, Y, v.a, v.b, h), ref = v.k;
    for (let s1 = 1; s1 <= 6; s1++) {
      const a = +v.a.toPrecision(s1); if (a === 0) continue;
      if (hitsAff(A, Y, a, 0, h) >= ref) return null;
      const res = []; for (let i = 0; i < A.length; i++) if (ok[i]) res.push(Y[i] - a * A[i]);
      if (!res.length) continue;
      const bm = UTIL.median(res);
      for (let s2 = 1; s2 <= 6; s2++) {
        const b = +bm.toPrecision(s2);
        if (hitsAff(A, Y, a, b, h) >= ref) return a === 1 || b === 0 ? null : { a, b };
      }
    }
    return null;
  }

  function voteLinear(A, B, Y, h, rand) {
    const n = A.length; let best = null, bk = -1;
    if (n < MIN_ROWS) return null;
    const hits = (a, b) => { let k = 0; for (let i = 0; i < n; i++) if (abs(a * A[i] + b * B[i] - Y[i]) <= h + 1e-9 * max(1, abs(Y[i]))) k++; return k; };
    for (let v = 0; v < VOTES; v++) {
      const i = floor(rand() * n); let j = floor(rand() * (n - 1)); if (j >= i) j++;
      const det = A[i] * B[j] - A[j] * B[i]; if (abs(det) < 1e-12 * max(1, abs(A[i] * B[j]))) continue;
      const a = (Y[i] * B[j] - Y[j] * B[i]) / det, b = (A[i] * Y[j] - A[j] * Y[i]) / det, k = hits(a, b);
      if (k > bk) { bk = k; best = [a, b]; }
    }
    if (!best) return null;
    let [a, b] = best, k = bk;
    for (let it = 0; it < 2; it++) {
      let sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, c = 0;
      for (let i = 0; i < n; i++) if (abs(a * A[i] + b * B[i] - Y[i]) <= h + 1e-9 * max(1, abs(Y[i]))) { c++; sxx += A[i] * A[i]; sxy += A[i] * B[i]; syy += B[i] * B[i]; sxz += A[i] * Y[i]; syz += B[i] * Y[i]; }
      const det = sxx * syy - sxy * sxy; if (c < 3 || abs(det) < 1e-12 * max(1, sxx * syy)) break;
      const a2 = (sxz * syy - syz * sxy) / det, b2 = (sxx * syz - sxy * sxz) / det, k2 = hits(a2, b2);
      if (k2 >= k) { a = a2; b = b2; k = k2; } else break;
    }
    for (let s = 1; s <= 6; s++) {
      const a2 = +a.toPrecision(s), b2 = +b.toPrecision(s);
      if (hits(a2, b2) >= k) return { a: a2, b: b2, k, hits };
    }
    return { a, b, k, hits };
  }

  const KERN = {
    sum: { rank: 0, f: (a, b) => a + b, x: rA, e: s => s[0] + ' + ' + s[1] },
    prod: { rank: 1, f: (a, b) => a * b, x: rM, e: s => s[0] + ' × ' + s[1] },
    pct: { rank: 2, f: (a, b) => a * b / 100, x: (a, b) => { const p = rM(a, b); return [p[0], p[1] * 100n]; }, e: s => s[0] + ' × ' + s[1] + ' ÷ 100' },
    div: { rank: 12, f: (a, b) => a / b, x: rD, e: s => s[0] + ' ÷ ' + s[1] },
    div100: { rank: 12, f: (a, b) => a / b * 100, x: (a, b) => { const p = rD(a, b); return p && [p[0] * 100n, p[1]]; }, e: s => s[0] + ' ÷ ' + s[1] + ' × 100' },
    pchg: { rank: 12, f: (a, b) => (b - a) / a * 100, x: (a, b) => { const p = rD(rS(b, a), a); return p && [p[0] * 100n, p[1]]; }, e: s => '(' + s[1] + ' − ' + s[0] + ') ÷ ' + s[0] + ' × 100' },
    up: { rank: 12, f: (a, b) => a * (1 + b / 100), x: (a, b) => rM(a, [b[0] + 100n * b[1], 100n * b[1]]), e: s => s[0] + ' × (1 + ' + s[1] + '%)' },
    down: { rank: 12, f: (a, b) => a * (1 - b / 100), x: (a, b) => rM(a, [100n * b[1] - b[0], 100n * b[1]]), e: s => s[0] + ' × (1 − ' + s[1] + '%)' },
    max: { rank: 13, f: (a, b) => max(a, b), x: (a, b) => cmp(a, b) >= 0 ? a : b, e: s => 'max(' + s[0] + ', ' + s[1] + ')' },
    min: { rank: 13, f: (a, b) => min(a, b), x: (a, b) => cmp(a, b) <= 0 ? a : b, e: s => 'min(' + s[0] + ', ' + s[1] + ')' }
  };
  const KERN3 = {
    mpc: { rank: 14, f: (a, b, c) => a * b + c, x: (a, b, c) => rA(rM(a, b), c), e: s => s[0] + ' × ' + s[1] + ' + ' + s[2], n: (a, b, c) => a + ' × ' + b + ' + ' + c },
    mmc: { rank: 15, f: (a, b, c) => a * b - c, x: (a, b, c) => rS(rM(a, b), c), e: s => s[0] + ' × ' + s[1] + ' − ' + s[2], n: (a, b, c) => a + ' × ' + b + ' − ' + c },
    mpd: { rank: 16, f: (a, b, c) => a * b / 100 + c, x: (a, b, c) => { const p = rM(a, b); return rA([p[0], p[1] * 100n], c); }, e: s => s[0] + ' × ' + s[1] + ' ÷ 100 + ' + s[2], n: (a, b, c) => a + ' × ' + b + ' ÷ 100 + ' + c },
    spm: { rank: 17, f: (a, b, c) => (a + b) * c, x: (a, b, c) => rM(rA(a, b), c), e: s => '(' + s[0] + ' + ' + s[1] + ') × ' + s[2], n: (a, b, c) => '(' + a + ' + ' + b + ') × ' + c },
    apm: { rank: 18, f: (a, b, c) => a + b - c, x: (a, b, c) => rS(rA(a, b), c), e: s => s[0] + ' + ' + s[1] + ' − ' + s[2], n: (a, b, c) => a + ' + ' + b + ' − ' + c },
    mmm: { rank: 19, f: (a, b, c) => a * b * c, x: (a, b, c) => rM(rM(a, b), c), e: s => s[0] + ' × ' + s[1] + ' × ' + s[2], n: (a, b, c) => a + ' × ' + b + ' × ' + c }
  };

  const cstr = (c, d) => { const q = decQ(c); return fixed([q.n, q.d], d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); };
  const coefText = (c, A, first) => { const s = c < 0 ? '−' : first ? '' : '+', m = abs(c); return (first ? s : ' ' + s + ' ') + (m === 1 ? '' : cstr(m, 12) + ' × ') + A; };

  const pairsOf = (list, T) => { const o = list.filter(c => c !== T), r = []; for (let a = 0; a < o.length; a++) for (let b = a + 1; b < o.length; b++) r.push([o[a], o[b]]); return r; };

  function walker(env, T, step, stepX, zero) {
    const n = env.n;
    return rows => {
      let PF = null, PX = null;
      const flo = () => {
        PF = new Float64Array(n).fill(NaN);
        let cur = zero ? 0 : NaN;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], y = T.f[r];
          if (i === 0 && !zero) { cur = y; continue; }
          const p = step(cur, r);
          if (cur !== cur || p !== p) { cur = y; continue; }
          PF[r] = p;
          cur = y === y && abs(p - y) <= tolF(T, y) ? y : p;
        }
      };
      const exa = () => {
        PX = new Array(n).fill(null);
        let cur = zero ? [0n, 1n] : null;
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], y = px(T, r);
          if (i === 0 && !zero) { cur = y; continue; }
          const p = cur ? stepX(cur, r) : null;
          if (!p || p[1] > CAP_DEN || p[1] < -CAP_DEN) { cur = y; continue; }
          PX[r] = p;
          if (y) { const d = p[0] * T.S - y[0] * p[1], a = d < 0n ? -d : d; cur = a * 2n <= p[1] ? y : p; } else cur = p;
        }
      };
      return { fp: r => { if (!PF) flo(); return PF[r]; }, ex: r => { if (!PX) exa(); return PX[r]; } };
    };
  }

  function prevOf(env, rows) {
    const pv = new Int32Array(env.n).fill(-1);
    for (let i = 1; i < rows.length; i++) pv[rows[i]] = rows[i - 1];
    return pv;
  }

  const addMonths = (day, k) => {
    const [y, m, d] = CELL.civil(day), t = y * 12 + (m - 1) + k, y2 = floor(t / 12), m2 = t - y2 * 12 + 1, last = CELL.dayOf(m2 === 12 ? y2 + 1 : y2, m2 === 12 ? 1 : m2 + 1, 1) - CELL.dayOf(y2, m2, 1);
    return CELL.dayOf(y2, m2, min(d, last));
  };
  const monthIndex = day => { const [y, m] = CELL.civil(day); return y * 12 + m - 1; };

  function run(V) {
    const env = prep(V), out = [], ctx = { tested: 0, combined: 0 };
    env.fails = new Map();
    const E = V.eqCols, D = V.dateEq, K = V.constCols, S = V.searchRows, cats = V.cats || [];
    const W = E.slice().sort((a, b) => b.nd - a.nd || a.j - b.j).slice(0, WIDE).sort((a, b) => a.j - b.j);
    const add = spec => { const r = evaluate(env, spec); if (r) out.push(r); };
    const test = () => { ctx.tested++; };

    const twoSpec = (T, A, B, kn, fam, form, key, extra) => {
      const kn_ = KERN[kn];
      return Object.assign({ T, ins: [A, B], fam, rank: kn_.rank, params: 0, key, form, expr: kn_.e, fp: r => kn_.f(A.f[r], B.f[r]), ex: r => { const a = px(A, r), b = px(B, r); return a && b ? kn_.x(a, b) : null; } }, extra);
    };
    const threeSpec = (T, A, B, C, kn, fam, form, key) => {
      const k3 = KERN3[kn];
      return { T, ins: [A, B, C], fam, rank: k3.rank, params: 0, key, form, expr: k3.e, fp: r => k3.f(A.f[r], B.f[r], C.f[r]), ex: r => { const a = px(A, r), b = px(B, r), c = px(C, r); return a && b && c ? k3.x(a, b, c) : null; } };
    };

    E.forEach(T => pairsOf(E, T).forEach(([A, B]) => { test(); add(twoSpec(T, A, B, 'sum', 'sum', A.name + ' + ' + B.name, signedKey('sum', [[A.j, 1], [B.j, 1], [T.j, -1]]))); }));
    E.forEach(T => pairsOf(E, T).forEach(([A, B]) => { test(); add(twoSpec(T, A, B, 'prod', 'prod', A.name + ' × ' + B.name, signedKey('prod', [[A.j, 1], [B.j, 1], [T.j, -1]]))); }));
    E.forEach(T => pairsOf(E, T).forEach(([A0, B0]) => {
      if (A0.pct === B0.pct) return;
      const A = A0.pct ? B0 : A0, B = A0.pct ? A0 : B0;
      test(); add(twoSpec(T, A, B, 'pct', 'pct', A.name + ' × ' + B.name + (/%\s*$/.test(B.name) ? '' : ' %'), signedKey('prod', [[A.j, 1], [B.j, 1], [T.j, -1]], ';÷100')));
    }));

    const runs = new Map();
    E.forEach((T, p) => {
      const tried = new Set();
      for (let L = 3; L <= min(MAX_RUN, p); L++) {
        const inp = E.slice(p - L, p);
        tried.add(inp.map(c => c.j).join(','));
        test();
        const form = L <= 4 ? inp.map(c => c.name).join(' + ') : inp[0].name + ' + … + ' + inp[L - 1].name;
        add({ T, ins: inp, fam: 'runsum', rank: 3, params: 0, form, key: signedKey('sum', [...inp.map(c => [c.j, 1]), [T.j, -1]]), expr: s => s.join(' + '), fp: r => { let s = 0; for (const c of inp) s += c.f[r]; return s; }, ex: r => { let s = [0n, 1n]; for (const c of inp) { const v = px(c, r); if (!v) return null; s = rA(s, v); } return s; } });
      }
      runs.set(T, tried);
    });
    if (E.length >= 4) {
      E.forEach(T => {
        const inp = E.filter(c => c !== T), key = inp.map(c => c.j).join(',');
        if (runs.get(T).has(key)) return;
        test();
        add({ T, ins: inp, fam: 'runsum', rank: 3, params: 0, form: 'sum of the other columns', key: signedKey('sum', [...inp.map(c => [c.j, 1]), [T.j, -1]]), expr: s => s.join(' + '), fp: r => { let s = 0; for (const c of inp) s += c.f[r]; return s; }, ex: r => { let s = [0n, 1n]; for (const c of inp) { const v = px(c, r); if (!v) return null; s = rA(s, v); } return s; } });
      });
    }

    const linear = (T, A, kind, c, extra) => {
      const cQ = kind === 'scale' ? decQ(c) : decQ(c), cP = [cQ.n, cQ.d];
      const base = { T, ins: [A], params: 1, fp: kind === 'scale' ? r => c * A.f[r] : r => A.f[r] + c, ex: kind === 'scale' ? r => { const a = px(A, r); return a ? rK(a, cQ) : null; } : r => { const a = px(A, r); return a ? rA(a, cP) : null; } };
      return Object.assign(base, extra);
    };
    const scaleForm = (A, cs) => {
      if (cs === 1) return A.name;
      const kv = Kc => Kc.vals[V.dataRows.find(r => Kc.vals[r] !== null)], Kc = K.find(Kc => abs(kv(Kc) - cs) <= Kc.h || (Kc.pct && abs(kv(Kc) / 100 - cs) <= Kc.h / 100));
      if (Kc) return A.name + ' × ' + Kc.name + ' (' + kv(Kc) + (Kc.pct ? '%' : '') + ')';
      return A.name + ' × ' + cs + (cs > 0 && cs < 1 && abs(cs * 100 - +(cs * 100).toFixed(2)) < 1e-9 ? ' (' + +(cs * 100).toFixed(2) + '%)' : '');
    };
    const shiftForm = (A, b, T) => A.name + (b > 0 ? ' + ' : ' − ') + abs(b).toFixed(T.d);

    const segFitText = (kind, T, A, c) => kind === 'scale' ? c + ' is the value of ' + T.name + ' ÷ ' + A.name + ' that repeats most often in this part, shortened to the fewest digits that keep every hit' : c + ' is the value of ' + T.name + ' − ' + A.name + ' that repeats most often in this part';
    const grpFitText = (kind, T, A, c, l) => kind === 'scale' ? c + ' is the median of ' + T.name + ' ÷ ' + A.name + ' over the ' + l + ' rows, shortened to the fewest digits that keep every hit' : c + ' is the median of ' + T.name + ' − ' + A.name + ' over the ' + l + ' rows';

    const combined = (T, A, kind, g) => {
      const m = g.idx.length;
      if (m >= 2 * MIN_SIDE) {
        ctx.combined += m - 2 * MIN_SIDE + 1;
        const seg = segFit(kind, g.A[0], g.Y, T);
        if (seg) {
          const split = g.idx[seg.s], first = g.idx[0], last = g.idx[m - 1], c1 = seg.c1, c2 = seg.c2, q1 = decQ(c1), q2 = decQ(c2);
          const f = (c, a) => predOf(kind, c, a), qx = (q, a) => kind === 'scale' ? rK(a, q) : rA(a, [q.n, q.d]);
          const cn = c => kind === 'scale' ? String(c) : (c >= 0 ? '+' : '−') + abs(c);
          const opT = c => kind === 'scale' ? '× ' + c : (c >= 0 ? '+ ' : '− ') + abs(c);
          const form = A.name + ' ' + opT(c1) + ' in rows ' + (first + 1) + '–' + split + ', ' + opT(c2) + ' from row ' + (split + 1);
          add({
            T, ins: [A], fam: kind, rank: kind === 'scale' ? 4 : 5, params: 3, fp: r => f(r < split ? c1 : c2, A.f[r]),
            ex: r => { const a = px(A, r); return a ? qx(r < split ? q1 : q2, a) : null; },
            form, key: pairKey('seg:' + kind, T, A) + ':' + split, scope: { kind: 'segment', rows: [[first, split - 1], [split, last]], label: form },
            partOf: r => r < split ? 0 : 1, partExpr: (g, s) => s[0] + ' ' + opT(g ? c2 : c1),
            partList: [{ label: 'rows ' + (first + 1) + '–' + split, desc: A.name + ' ' + opT(c1), fit: segFitText(kind, T, A, cn(c1)) }, { label: 'rows ' + (split + 1) + '–' + (last + 1), desc: A.name + ' ' + opT(c2), fit: segFitText(kind, T, A, cn(c2)) }],
            how: 'one change at row ' + (split + 1) + ': ' + cn(c1) + ' before, ' + cn(c2) + ' from there', coef: [{ name: 'first part', value: cn(c1) }, { name: 'second part', value: cn(c2) }, { name: 'change at row', value: split + 1 }],
            mult: ['× ' + (m - 2 * MIN_SIDE + 1) + ' possible split points'], combined: true,
            refit: (use, Ysh) => { const Aa = use.map(r => A.f[r]), sg = segFit(kind, Aa, Ysh, T); if (!sg) return 0; let k = 0; for (let i = 0; i < Aa.length; i++) if (abs(f(i < sg.s ? sg.c1 : sg.c2, Aa[i]) - Ysh[i]) <= tolF(T, Ysh[i])) k++; return k; }
          });
        }
      }
      if (cats.length) {
        ctx.combined += cats.length;
        cats.forEach(G => {
          const gid = g.idx.map(r => G.gid[r]), cs = groupFit(kind, g.A[0], g.Y, gid, G.labels.length, T);
          if (!cs) return;
          const qs = cs.map(decQ), cn = c => kind === 'scale' ? String(c) : (c >= 0 ? '+' : '−') + abs(c), opT = c => kind === 'scale' ? '× ' + c : (c >= 0 ? '+ ' : '− ') + abs(c);
          const form = A.name + (kind === 'scale' ? ' × rate by ' : ' + amount by ') + G.name + ' (' + G.labels.map((l, i) => l + ' ' + cn(cs[i])).join(', ') + ')';
          add({
            T, ins: [A], fam: kind, rank: kind === 'scale' ? 4 : 5, params: G.labels.length,
            fp: r => { const i = G.gid[r]; return i < 0 ? NaN : predOf(kind, cs[i], A.f[r]); },
            ex: r => { const i = G.gid[r], a = px(A, r); return i < 0 || !a ? null : kind === 'scale' ? rK(a, qs[i]) : rA(a, [qs[i].n, qs[i].d]); },
            form, key: pairKey('grp:' + kind, T, A) + ':' + G.j, scope: { kind: 'group', rows: null, label: G.name },
            partOf: r => G.gid[r], partExpr: (g, s) => s[0] + ' ' + opT(cs[g]),
            partList: G.labels.map((l, i) => ({ label: l, desc: A.name + ' ' + opT(cs[i]), fit: grpFitText(kind, T, A, cn(cs[i]), l) })),
            how: 'one ' + (kind === 'scale' ? 'rate' : 'amount') + ' for each ' + G.name + ', each taken from that group\'s rows', coef: G.labels.map((l, i) => ({ name: l, value: cn(cs[i]) })),
            mult: ['× ' + cats.length + ' categorical columns tried'], combined: true,
            refit: (use, Ysh) => {
              const Aa = use.map(r => A.f[r]), ids = use.map(r => G.gid[r]), cc = groupFit(kind, Aa, Ysh, ids, G.labels.length, T);
              if (!cc) return 0;
              let k = 0; for (let i = 0; i < Aa.length; i++) if (ids[i] >= 0 && abs(predOf(kind, cc[ids[i]], Aa[i]) - Ysh[i]) <= tolF(T, Ysh[i])) k++;
              return k;
            }
          });
        });
      }
    };

    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      test();
      const g = gather(T, S, A), cs = fitScale(g.A[0].filter(a => a !== 0).length ? g.A[0] : [], g.Y, T.h);
      if (cs === null) return;
      const form = scaleForm(A, cs), seed = { how: cs + ' = median of ' + T.name + ' ÷ ' + A.name + ' over ' + g.A[0].filter(a => a !== 0).length + ' rows, taken as the simplest value that keeps every hit', coef: [{ name: 'constant', value: String(cs) }], expr: s => (cs === 1 ? s[0] : s[0] + ' × ' + cs) };
      add(linear(T, A, 'scale', cs, Object.assign(seed, { fam: 'scale', rank: 4, form, key: scaleKey(T, A, cs), refit: (use, Ysh) => { const Aa = use.map(r => A.f[r]), c = fitScale(Aa, Ysh, T.h); return c === null ? 0 : hitsAff(Aa, Ysh, c, 0, T.h); } })));
      combined(T, A, 'scale', g);
    }));
    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      test();
      const g = gather(T, S, A);
      if (!g.idx.length) return;
      const b = +medDiff(g.A[0], g.Y).toFixed(T.d);
      if (b === 0) return;
      add(linear(T, A, 'shift', b, { fam: 'shift', rank: 5, form: shiftForm(A, b, T), key: shiftKey(T, A, b), how: fixed([BigInt(round(b * 10 ** T.d)), pw(T.d)], T.d) + ' = median of ' + T.name + ' − ' + A.name + ' over ' + g.idx.length + ' rows', coef: [{ name: 'constant', value: String(b) }], expr: s => s[0] + (b > 0 ? ' + ' : ' − ') + abs(b).toFixed(T.d), refit: (use, Ysh) => { const Aa = use.map(r => A.f[r]); return hitsShift(Aa, Ysh, +medDiff(Aa, Ysh).toFixed(T.d), T.h); } }));
      combined(T, A, 'shift', g);
    }));

    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      [1, -1].forEach(sign => {
        test();
        const form = 'previous ' + T.name + (sign > 0 ? ' + ' : ' − ') + A.name;
        add({ T, ins: [A], fam: 'prev', rank: 6, params: 0, form, key: 'cum:' + T.j + ':' + A.j + (sign > 0 ? '' : ':-'), expr: s => 'previous ' + (sign > 0 ? '+ ' : '− ') + s[0], dir: 'forward walk, repaired after each miss',
          mk: walker(env, T, (cur, r) => cur + sign * A.f[r], (cur, r) => { const a = px(A, r); return a ? (sign > 0 ? rA(cur, a) : rS(cur, a)) : null; }, false) });
      });
    }));
    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      test();
      add({ T, ins: [A], fam: 'cumulative', rank: 6, params: 0, form: 'running sum of ' + A.name, key: 'cum:' + T.j + ':' + A.j, expr: s => 'running sum + ' + s[0], dir: 'forward walk from the first row, repaired after each miss',
        mk: walker(env, T, (cur, r) => cur + A.f[r], (cur, r) => { const a = px(A, r); return a ? rA(cur, a) : null; }, true) });
    }));
    E.forEach(T => {
      const pctLike = T.pct || T.max <= 100, scale = T.pct ? 100 : T.max <= 1 ? 1 : 100;
      if (T.min < 0 || !pctLike) return;
      E.forEach(A => {
        if (A === T || A.min < 0 || !(A.sum > 0)) return;
        test();
        let sum = 0n; for (const r of V.dataRows) { const m = X(A, r); if (m !== null) sum += m; }
        if (sum <= 0n) return;
        const sc = BigInt(scale);
        add({ T, ins: [A], fam: 'share', rank: 7, params: 0, form: A.name + ' ÷ sum of ' + A.name + (scale === 100 ? ' × 100' : ''), expr: s => s[0] + ' ÷ ' + fixed([sum, A.S], A.sd) + (scale === 100 ? ' × 100' : ''), fp: r => scale * A.f[r] / A.sum, ex: r => { const m = X(A, r); return m === null ? null : [sc * m, sum]; } });
      });
    });
    E.forEach((T, p) => {
      for (let L = 2; L <= min(MAX_RUN, p); L++) {
        const inp = E.slice(p - L, p);
        test();
        const form = 'average of ' + (L <= 4 ? inp.map(c => c.name).join(', ') : inp[0].name + ' … ' + inp[L - 1].name), bl = BigInt(L);
        add({ T, ins: inp, fam: 'avg', rank: 8, params: 0, form, expr: s => '(' + s.join(' + ') + ') ÷ ' + L, fp: r => { let s = 0; for (const c of inp) s += c.f[r]; return s / L; }, ex: r => { let s = [0n, 1n]; for (const c of inp) { const v = px(c, r); if (!v) return null; s = rA(s, v); } return [s[0], s[1] * bl]; } });
      }
    });

    E.forEach(T => E.forEach(A => E.forEach(B => {
      if (A === T || B === T || A === B) return;
      test(); add(twoSpec(T, A, B, 'div', 'div', A.name + ' ÷ ' + B.name, signedKey('prod', [[A.j, 1], [B.j, -1], [T.j, -1]])));
      test(); add(twoSpec(T, A, B, 'div100', 'div100', A.name + ' ÷ ' + B.name + ' × 100', signedKey('prod', [[A.j, 1], [B.j, -1], [T.j, -1]], ';×100')));
      test(); add(twoSpec(T, A, B, 'pchg', 'pchg', '(' + B.name + ' − ' + A.name + ') ÷ ' + A.name + ' × 100', 'pchg:' + A.j + ',' + B.j + ',' + T.j));
      if (B.pct) {
        test(); add(twoSpec(T, A, B, 'up', 'pup', A.name + ' × (1 + ' + B.name + (/%\s*$/.test(B.name) ? '' : ' %') + ')', 'pchg:' + A.j + ',' + T.j + ',' + B.j));
        test(); add(twoSpec(T, A, B, 'down', 'pdown', A.name + ' × (1 − ' + B.name + (/%\s*$/.test(B.name) ? '' : ' %') + ')', 'pdisc:' + A.j + ',' + T.j + ',' + B.j));
      }
    })));
    E.forEach(T => pairsOf(E, T).forEach(([A, B]) => {
      ['max', 'min'].forEach(kn => {
        test();
        const spec = twoSpec(T, A, B, kn, kn, kn + '(' + A.name + ', ' + B.name + ')', kn + ':' + T.j + ':' + A.j + ',' + B.j);
        const inner = spec.fp;
        let oa = 0, ob = 0;
        for (const r of S) { const y = T.f[r]; if (y !== y) continue; const ha = abs(A.f[r] - y) <= tolF(T, y), hb = abs(B.f[r] - y) <= tolF(T, y); if (ha && !hb) oa++; else if (hb && !ha) ob++; }
        if (oa >= 2 && ob >= 2) add(Object.assign(spec, { fp: inner }));
      });
    }));

    W.forEach(T => {
      const o = W.filter(c => c !== T), nm = c => c.name;
      pairsOf(W, T).forEach(([A, B]) => {
        o.forEach(C => {
          if (C === A || C === B) return;
          const f3 = (kn, key, form) => { test(); add(threeSpec(T, A, B, C, kn, kn, form, key)); };
          f3('mpc', 'mpc:' + T.j + ':' + A.j + ',' + B.j + ',' + C.j, KERN3.mpc.n(nm(A), nm(B), nm(C)));
          f3('mmc', 'mmc:' + T.j + ':' + A.j + ',' + B.j + ',' + C.j, KERN3.mmc.n(nm(A), nm(B), nm(C)));
          if (A.pct !== B.pct) f3('mpd', 'mpd:' + T.j + ':' + A.j + ',' + B.j + ',' + C.j, KERN3.mpd.n(nm(A), nm(B), nm(C)));
          f3('spm', 'spm:' + T.j + ':' + A.j + ',' + B.j + ',' + C.j, KERN3.spm.n(nm(A), nm(B), nm(C)));
          f3('apm', signedKey('sum', [[A.j, 1], [B.j, 1], [C.j, -1], [T.j, -1]]), KERN3.apm.n(nm(A), nm(B), nm(C)));
        });
      });
      for (let a = 0; a < o.length; a++) for (let b = a + 1; b < o.length; b++) for (let c = b + 1; c < o.length; c++) {
        test(); add(threeSpec(T, o[a], o[b], o[c], 'mmm', 'mmm', KERN3.mmm.n(nm(o[a]), nm(o[b]), nm(o[c])), signedKey('prod', [[o[a].j, 1], [o[b].j, 1], [o[c].j, 1], [T.j, -1]])));
      }
    });

    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      test();
      const g = gather(T, S, A), rand = UTIL.rngFor(V.key, 'aff', T.j, A.j), v = voteAffine(g.A[0], g.Y, T.h, rand);
      if (!v) return;
      const s = simplifyAffine(g.A[0], g.Y, T.h, v);
      if (!s) return;
      const cScale = fitScale(g.A[0], g.Y, T.h), kScale = cScale === null ? 0 : hitsAff(g.A[0], g.Y, cScale, 0, T.h), kShift = hitsShift(g.A[0], g.Y, +medDiff(g.A[0], g.Y).toFixed(T.d), T.h);
      if (hitsAff(g.A[0], g.Y, s.a, s.b, T.h) <= max(kScale, kShift)) return;
      const aQ = decQ(s.a), bQ = decQ(s.b), aP = [aQ.n, aQ.d], bP = [bQ.n, bQ.d], form = A.name + ' × ' + cstr(s.a, 12) + (s.b < 0 ? ' − ' : ' + ') + cstr(abs(s.b), 12);
      let cnt = 0;
      add({
        T, ins: [A], fam: 'affine', rank: 20, params: 2, form, key: pairKey('aff', T, A), expr: x => x[0] + ' × ' + cstr(s.a, 12) + (s.b < 0 ? ' − ' : ' + ') + cstr(abs(s.b), 12),
        how: 'a and b chosen by ' + VOTES + ' pairs of rows, then rounded to the shortest values that keep every hit', coef: [{ name: 'a', value: cstr(s.a, 12) }, { name: 'b', value: cstr(s.b, 12) }],
        fp: r => s.a * A.f[r] + s.b, ex: r => { const a = px(A, r); return a ? rA(rK(a, aQ), bP) : null; },
        refit: (use, Ysh) => { const Aa = use.map(r => A.f[r]), w = voteAffine(Aa, Ysh, T.h, UTIL.rngFor(V.key, 'affr', T.j, A.j, cnt++)); return w ? w.k : 0; }
      });
    }));
    W.forEach(T => pairsOf(W, T).forEach(([A, B]) => {
      test();
      const g = gather(T, S, A, B), rand = UTIL.rngFor(V.key, 'lin', T.j, A.j, B.j), v = voteLinear(g.A[0], g.A[1], g.Y, T.h, rand);
      if (!v || v.a === 0 || v.b === 0 || (abs(v.a) === 1 && abs(v.b) === 1)) return;
      const aQ = decQ(v.a), bQ = decQ(v.b);
      if (aQ.d > 100n || bQ.d > 100n) return;
      const aP = [aQ.n, aQ.d], bP = [bQ.n, bQ.d], form = coefText(v.a, A.name, true) + coefText(v.b, B.name, false);
      let cnt = 0;
      add({
        T, ins: [A, B], fam: 'linear', rank: 21, params: 2, form, key: 'lin:' + T.j + ':' + A.j + ',' + B.j + ':' + qStr(aQ) + ',' + qStr(bQ), expr: x => coefText(v.a, x[0], true) + coefText(v.b, x[1], false),
        how: 'a and b chosen by ' + VOTES + ' pairs of rows, then rounded to the shortest values that keep every hit', coef: [{ name: 'a', value: cstr(v.a, 12) }, { name: 'b', value: cstr(v.b, 12) }],
        fp: r => v.a * A.f[r] + v.b * B.f[r], ex: r => { const a = px(A, r), b = px(B, r); return a && b ? rA(rK(a, aQ), rK(b, bQ)) : null; },
        refit: (use, Ysh) => { const w = voteLinear(use.map(r => A.f[r]), use.map(r => B.f[r]), Ysh, T.h, UTIL.rngFor(V.key, 'linr', T.j, A.j, B.j, cnt++)); return w ? w.k : 0; }
      });
    }));

    E.forEach(T => E.forEach(A => {
      if (A === T) return;
      const base = { T, ins: [A], params: 0 };
      test();
      add(Object.assign({}, base, { fam: 'previous', rank: 22, form: 'previous ' + A.name, key: 'prevA:' + T.j + ':' + A.j, expr: s => 'previous ' + s[0],
        mk: rows => { const pv = prevOf(env, rows); return { fp: r => pv[r] < 0 ? NaN : A.f[pv[r]], ex: r => pv[r] < 0 ? null : px(A, pv[r]) }; },
        args: r => [A.name] }));
      test();
      add(Object.assign({}, base, { fam: 'delta', rank: 23, form: A.name + ' − previous ' + A.name, key: 'cum:' + A.j + ':' + T.j, expr: s => s[0] + ' − previous',
        mk: rows => { const pv = prevOf(env, rows); return { fp: r => pv[r] < 0 ? NaN : A.f[r] - A.f[pv[r]], ex: r => { if (pv[r] < 0) return null; const a = px(A, r), b = px(A, pv[r]); return a && b ? rS(a, b) : null; } }; } }));
      if (A.pct || (A.min >= -100 && A.max <= 100)) {
        test();
        add(Object.assign({}, base, { fam: 'compound', rank: 24, form: 'previous ' + T.name + ' × (1 + ' + A.name + (/%\s*$/.test(A.name) ? '' : ' %') + ')', key: 'cmp:' + T.j + ':' + A.j, expr: s => 'previous × (1 + ' + s[0] + '%)', dir: 'forward walk, repaired after each miss',
          mk: walker(env, T, (cur, r) => cur * (1 + A.f[r] / 100), (cur, r) => { const a = px(A, r); return a ? rM(cur, [a[0] + 100n * a[1], 100n * a[1]]) : null; }, false) }));
      }
      test();
      add(Object.assign({}, base, { fam: 'moving', rank: 25, form: 'average of ' + A.name + ' over the last 3 rows', key: 'mov:' + T.j + ':' + A.j, expr: s => 'average of ' + s[0] + ' over the last 3 rows',
        mk: rows => { const pv = prevOf(env, rows); return { fp: r => { const p1 = pv[r], p2 = p1 < 0 ? -1 : pv[p1]; return p2 < 0 ? NaN : (A.f[r] + A.f[p1] + A.f[p2]) / 3; }, ex: r => { const p1 = pv[r], p2 = p1 < 0 ? -1 : pv[p1]; if (p2 < 0) return null; const a = px(A, r), b = px(A, p1), c = px(A, p2); return a && b && c ? (s => [s[0], s[1] * 3n])(rA(rA(a, b), c)) : null; } }; } }));
    }));

    D.forEach(T => D.forEach(A => {
      if (A === T) return;
      test();
      const g = gather(T, S, A);
      if (!g.idx.length) return;
      const b = round(UTIL.median(g.Y.map((y, i) => y - g.A[0][i])));
      if (b !== 0) {
        const weeks = abs(b) % 7 === 0, amt = weeks ? abs(b) / 7 : abs(b), unit = weeks ? (amt === 1 ? ' week' : ' weeks') : UTIL.dayWord(b);
        add({ T, ins: [A], fam: 'dshift', rank: 9, params: 1, form: A.name + (b > 0 ? ' + ' : ' − ') + amt + unit, key: shiftKey(T, A, b), expr: s => s[0] + (b > 0 ? ' + ' : ' − ') + abs(b) + UTIL.dayWord(b),
          how: abs(b) + UTIL.dayWord(b) + ' = median of ' + T.name + ' − ' + A.name + ' over ' + g.idx.length + ' rows', coef: [{ name: 'days', value: String(b) }],
          fp: r => A.f[r] + b, ex: r => { const a = px(A, r); return a ? [a[0] + BigInt(b), 1n] : null; },
          refit: (use, Ysh) => { const Aa = use.map(r => A.f[r]); return hitsShift(Aa, Ysh, round(medDiff(Aa, Ysh)), T.h); } });
      }
    }));
    D.forEach(T => D.forEach(A => {
      if (A === T) return;
      test();
      const g = gather(T, S, A);
      if (!g.idx.length) return;
      const ks = g.idx.map((r, i) => monthIndex(T.f[r]) - monthIndex(A.f[r])), top = topValues(ks, 1)[0];
      if (top === undefined || top === 0) return;
      const k = top, form = A.name + (k > 0 ? ' + ' : ' − ') + abs(k) + (abs(k) === 1 ? ' month' : ' months');
      add({ T, ins: [A], fam: 'dmonths', rank: 27, params: 1, form, key: 'mon:' + T.j + ':' + A.j + ':' + k, expr: s => s[0] + (k > 0 ? ' + ' : ' − ') + abs(k) + (abs(k) === 1 ? ' month' : ' months'),
        how: 'the same day of the month ' + abs(k) + (abs(k) === 1 ? ' month ' : ' months ') + (k > 0 ? 'later' : 'earlier') + ', clamped to the end of a shorter month', coef: [{ name: 'months', value: String(k) }],
        fp: r => addMonths(A.f[r], k), ex: r => A.f[r] !== A.f[r] ? null : [BigInt(addMonths(A.f[r], k)), 1n],
        refit: (use, Ysh) => { const ks2 = use.map((r, i) => monthIndex(Ysh[i]) - monthIndex(A.f[r])), k2 = topValues(ks2, 1)[0]; let h = 0; for (let i = 0; i < use.length; i++) if (abs(addMonths(A.f[use[i]], k2) - Ysh[i]) <= T.h) h++; return h; } });
    }));
    D.forEach(T => D.forEach(A => {
      if (A.j >= T.j) return;
      E.forEach(N => {
        test();
        add({ T, ins: [A, N], fam: 'dplus', rank: 10, params: 0, form: A.name + ' + ' + N.name + ' days', key: 'dplus:' + T.j + ':' + A.j + ',' + N.j, expr: s => s[0] + ' + ' + s[1] + ' days', fp: r => A.f[r] + N.f[r], ex: r => { const a = px(A, r), b = px(N, r); return a && b ? rA(a, b) : null; } });
      });
    }));
    E.forEach(N => D.forEach(T => D.forEach(A => {
      if (A.j >= T.j) return;
      test();
      add({ T: N, ins: [T, A], fam: 'ddiff', rank: 11, params: 0, form: T.name + ' − ' + A.name + ' (days)', key: 'ddiff:' + N.j + ':' + A.j + ',' + T.j, expr: s => s[0] + ' − ' + s[1], fp: r => T.f[r] - A.f[r], ex: r => { const a = px(T, r), b = px(A, r); return a && b ? rS(a, b) : null; } });
      test();
      add({ T: N, ins: [T, A], fam: 'dweeks', rank: 28, params: 0, form: T.name + ' − ' + A.name + ' (weeks)', key: 'dweeks:' + N.j + ':' + A.j + ',' + T.j, expr: s => '(' + s[0] + ' − ' + s[1] + ') ÷ 7', fp: r => (T.f[r] - A.f[r]) / 7, ex: r => { const a = px(T, r), b = px(A, r); return a && b ? (s => [s[0], s[1] * 7n])(rS(a, b)) : null; } });
    })));

    const m = ctx.tested, mc = ctx.tested + ctx.combined;
    out.forEach(r => { const n = r.scope.kind === 'all' ? m : mc; r.tested = n; r.chance = UTIL.adjust(r.log10p, n); r.evidence.plain = m; r.evidence.combinedN = ctx.combined; });
    return { results: out, tested: m, combined: ctx.combined, fails: failures(env) };
  }

  function algebra(V, res, j) {
    prep(V);
    const col = x => V.cols.find(c => c.j === x), T = col(res.subject.cols[0]), ins = res.inputs.map(col), N = col(j);
    if (!T || !N || ins.some(c => !c) || !ins.includes(N) || ins.length !== 2) return null;
    const O = ins.find(c => c !== N), ev = exactScan(N, V.dataRows, r => { const a = px(T, r), b = px(O, r); return a && b ? rS(a, b) : null; }, false);
    if (!ev || ev.n !== res.n || ev.k !== res.hits) return null;
    const miss = new Set(res.exceptions.map(e => e.row));
    if (res.excN !== res.exceptions.length || ev.use.some((r, i) => !ev.st[i] !== miss.has(r))) return null;
    const form = T.name + ' − ' + O.name, spec = { ins: [T, O], expr: s => s[0] + ' − ' + s[1] }, exceptions = [], hits = [];
    ev.use.forEach((r, i) => {
      if (ev.st[i]) { if (hits.length < SHOWN) hits.push(workedRow(spec, V, N, r, ev.pr[i], ev.st[i])); return; }
      const y = X(N, r);
      exceptions.push({ row: r, label: V.label(r), expected: rQ(ev.pr[i]), found: Q(y, N.S), diff: signedP(rS([y, N.S], ev.pr[i]), N.sd), reason: 'differs from ' + form });
    });
    const first = ev.st.indexOf(0);
    return Object.assign({}, res, {
      id: 'column:' + V.key + ':' + N.j + '|' + res.family + '|' + form, subject: { kind: 'column', table: V.key, cols: [N.j], line: null }, form, headline: N.name + ' = ' + form,
      target: N.j, d: N.sd, fmt: fmtOf(N), inputs: [T.j, O.j], exact: ev.e, rounded: ev.k - ev.e, exceptions, excN: exceptions.length, explainedBy: {},
      evidence: Object.assign({}, res.evidence, { hits, firstException: first >= 0 ? workedRow(spec, V, N, ev.use[first], ev.pr[first], 0) : null, rewrittenFrom: res.id, decimals: N.sd })
    });
  }

  return { run, algebra, fixed, signedKey, scaleKey, shiftKey };
})();
