const SEQ = (() => {
  const { Q, qadd, qsub, qmul, qdiv, qz, qeq, babs, lcm, show, diffsOf, mode, log10Tail, adjust, shuffleKnown, MAX_LOG10P, MIN_SUPPORT } = UTIL;
  const R_MAX = 6, OFFSETS = 5, HORIZON = 5, BM_WINDOW = 24, SHUFFLES = 200, PERM_CAP = 300, MAX_EXC = 1000, MAX_GAPS = 10, FIT_CAP = 1000, MAX_PERIOD = 12, LIB_MAX = 60, MAX_SCALE = 9, LIMIT = 10n ** 60n, DEN_MAX = 24n;
  const ZERO = Q(0n), ONE = Q(1n);
  const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵'];
  const pair = (num, den) => den < 0n ? { num: -num, den: -den } : { num, den };
  const fits = p => p.num % p.den === 0n;

  function inspect(x) {
    const n = x.length, fitN = Math.min(n, FIT_CAP), runs = [], kn = [];
    let known = 0, run = null;
    for (let i = 0; i < n; i++) if (x[i] !== null) known++;
    for (let i = 0; i < fitN; i++) {
      if (x[i] === null) { run = null; continue; }
      if (!run) { run = []; runs.push(run); }
      run.push(x[i]); kn.push({ i, v: x[i] });
    }
    return { n, known, fitN, runs, kn, longest: runs.reduce((b, r) => r.length > b.length ? r : b, []) };
  }

  function formula(co) {
    if (co.some(c => c.d > DEN_MAX)) return null;
    const D = co.reduce((a, c) => lcm(a, c.d), 1n), N = co.map(c => c.n * (D / c.d)), terms = [];
    for (let k = N.length - 1; k >= 0; k--) {
      if (N[k] === 0n) continue;
      const mag = babs(N[k]);
      terms.push({ neg: N[k] < 0n, text: k === 0 ? String(mag) : (mag === 1n ? '' : String(mag)) + 'n' + (k > 1 ? SUP[k] : '') });
    }
    const body = terms.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : t.neg ? ' − ' : ' + ') + t.text).join('');
    return (D === 1n ? body : (terms.length > 1 ? '(' + body + ')' : body) + ' / ' + D) + ' for n = 1, 2, 3, …';
  }

  function walk(rule, x, back, maxMiss) {
    const n = x.length, o = rule.order, cur = x.slice(), out = { hits: 0, trials: 0, excN: 0, exc: [], filled: [], gaps: [], bad: false, cur };
    const at = back ? i => rule.predictBack(cur, i) : i => rule.predict(cur, i);
    for (let i = back ? n - 1 - o : o; back ? i >= 0 : i < n; i += back ? -1 : 1) {
      const v = cur[i], p = at(i);
      if (v === null) {
        if (p === null || !fits(p)) { out.bad = true; continue; }
        cur[i] = p.num / p.den; out.filled.push(i); continue;
      }
      if (p === null) continue;
      if (p.num === p.den * v) { out.trials++; out.hits++; continue; }
      const miss = !back && rule.gapFill ? rule.gapFill(cur, i, v) : null;
      if (miss) { for (const w of miss) if (out.gaps.length < MAX_GAPS) out.gaps.push(w); continue; }
      out.trials++; out.excN++;
      if (out.exc.length < MAX_EXC) out.exc.push({ i, num: p.num, den: p.den, found: v });
      if (fits(p)) cur[i] = p.num / p.den;
      if (out.excN > maxMiss) return null;
    }
    if (cur.includes(null)) out.bad = true;
    return out;
  }

  function repair(rule, x, maxMiss) {
    const f = walk(rule, x, false, maxMiss), b = rule.invertible ? walk(rule, x, true, maxMiss) : null, ok = r => r && !r.bad;
    if (ok(f) && (!ok(b) || f.excN <= b.excN)) return f;
    return ok(b) ? b : f || b;
  }

  function score(rule, x, o) {
    const r = repair(rule, x, Math.floor((1 - MIN_SUPPORT) * o.info.known + 1e-9));
    if (!r || r.bad || r.trials < 1 || r.hits < rule.params + 3 || r.hits / r.trials < MIN_SUPPORT) return null;
    const cap = x.slice(0, PERM_CAP);
    let sum = 0, tp = 0;
    for (let s = 0; s < SHUFFLES; s++) { const t = repair(rule, shuffleKnown(cap, o.rand), Infinity); sum += t.hits; tp += t.trials; }
    const p0 = (sum + 1) / (tp + 2);
    return { rule, k: r.hits, n: r.trials, log10p: log10Tail(r.trials - rule.params, r.hits - rule.params, p0), excN: r.excN, exc: r.exc, gaps: r.gaps, cur: r.cur, filled: r.filled.map(i => ({ i, v: r.cur[i] })) };
  }

  const step = {
    id: 'step', minKnown: 5,
    tested: () => 1,
    fit(x, o) {
      const diffs = o.info.runs.flatMap(r => r.length > 1 ? diffsOf(r, 1) : []);
      if (!diffs.length) return [];
      const s = mode(diffs, String);
      if (s === 0n) return [];
      const b = mode(o.info.kn.map(p => p.v - s * BigInt(p.i + 1)), String);
      return [{
        family: 'step', mode: 'recursive', order: 1, params: 1, complexity: 0, invertible: true,
        predict: (cur, i) => cur[i - 1] === null ? null : { num: cur[i - 1] + s, den: 1n },
        predictBack: (cur, i) => cur[i + 1] === null ? null : { num: cur[i + 1] - s, den: 1n },
        gapFill: o.columns ? (cur, i, v) => {
          const diff = v - cur[i - 1];
          if (diff % s !== 0n) return null;
          const m = diff / s;
          if (m < 2n || m > 10n) return null;
          const out = []; for (let q = 1n; q < m; q++) out.push(cur[i - 1] + s * q);
          return out;
        } : undefined,
        describe: (d, plain) => !o.date && d === 0 && !plain ? formula([Q(b), Q(s)]) : 'steps by ' + show(Q(s), d) + (o.date ? UTIL.dayWord(Number(s)) : '')
      }];
    }
  };

  const ratio = {
    id: 'ratio', minKnown: 5,
    tested: () => 1,
    fit(x, o) {
      const rs = [];
      for (const run of o.info.runs) for (let k = 1; k < run.length; k++) if (run[k - 1] !== 0n) rs.push(Q(run[k], run[k - 1]));
      if (!rs.length) return [];
      const r = mode(rs, q => q.n + '/' + q.d);
      if (qz(r) || qeq(r, ONE)) return [];
      return [{
        family: 'ratio', mode: 'recursive', order: 1, params: 1, complexity: 1, invertible: true,
        predict: (cur, i) => cur[i - 1] === null ? null : { num: r.n * cur[i - 1], den: r.d },
        predictBack: (cur, i) => cur[i + 1] === null ? null : pair(r.d * cur[i + 1], r.n),
        describe: () => '× ' + show(r) + ' each row'
      }];
    }
  };

  function newton(pts) {
    const m = pts.length, xs = pts.map(p => BigInt(p.i + 1)), dd = pts.map(p => Q(p.v)), coef = [dd[0]];
    for (let j = 1; j < m; j++) { for (let i = m - 1; i >= j; i--) dd[i] = qdiv(qsub(dd[i], dd[i - 1]), Q(xs[i] - xs[i - j])); coef.push(dd[j]); }
    let poly = [coef[m - 1]];
    for (let j = m - 2; j >= 0; j--) {
      const nx = new Array(poly.length + 1).fill(ZERO);
      for (let k = 0; k < poly.length; k++) { nx[k + 1] = qadd(nx[k + 1], poly[k]); nx[k] = qsub(nx[k], qmul(poly[k], Q(xs[j]))); }
      nx[0] = qadd(nx[0], coef[j]);
      poly = nx;
    }
    return poly;
  }

  const poly = {
    id: 'poly', minKnown: 6,
    tested: (x, o) => { let c = 0; for (let d = 2; d <= 5; d++) if (o.info.known >= d + 4) c++; return c; },
    fit(x, o) {
      const { kn } = o.info, out = [];
      for (let d = 2; d <= 5; d++) {
        if (o.info.known < d + 4 || kn.length < d + 1) continue;
        const m = d + 1, L = kn.length;
        let best = null;
        for (const pts of [kn.slice(0, m), Array.from({ length: m }, (_, j) => kn[Math.round(j * (L - 1) / d)]), kn.slice(L - m)]) {
          const co = newton(pts);
          if (qz(co[d])) continue;
          const D = co.reduce((a, c) => lcm(a, c.d), 1n), A = co.map(c => c.n * (D / c.d));
          const predict = (cur, i) => { const t = BigInt(i + 1); let s = A[d]; for (let k = d - 1; k >= 0; k--) s = s * t + A[k]; return { num: s, den: D }; };
          let hits = 0; for (const p of kn) { const e = predict(null, p.i); if (e.num === e.den * p.v) hits++; }
          if (!best || hits > best.hits) best = { hits, co, predict };
        }
        if (!best) continue;
        let fact = 1n; for (let k = 2n; k <= BigInt(d); k++) fact *= k;
        out.push({
          family: 'poly', mode: 'index', order: 0, params: d + 1, complexity: 10 + d, invertible: false,
          predict: best.predict,
          describe: dec => (dec === 0 && formula(best.co)) || 'order-' + d + ' differences are constant (' + show(qmul(best.co[d], Q(fact)), dec) + ')'
        });
      }
      return out;
    }
  };

  function bm(s, limit) {
    let C = [ONE], B = [ONE], L = 0, m = 1, b = ONE;
    for (let n = 0; n < s.length; n++) {
      let d = s[n];
      for (let i = 1; i <= L; i++) d = qadd(d, qmul(C[i] || ZERO, s[n - i]));
      if (qz(d)) { m++; continue; }
      const T = C.slice(), coef = qdiv(d, b);
      while (C.length < B.length + m) C.push(ZERO);
      for (let i = 0; i < B.length; i++) C[i + m] = qsub(C[i + m], qmul(coef, B[i]));
      if (2 * L <= n) { L = n + 1 - L; B = T; b = d; m = 1; if (L > limit) return null; } else m++;
    }
    const c = []; for (let i = 1; i <= L; i++) c.push(qsub(ZERO, C[i] || ZERO));
    return { L, c };
  }

  const binom = (n, k) => { let r = 1n; for (let i = 1n; i <= BigInt(k); i++) r = r * (BigInt(n) - i + 1n) / i; return r; };
  const isPolyPattern = c => c.every((v, j) => qeq(v, Q((j % 2 === 0 ? 1n : -1n) * binom(c.length, j + 1))));
  const isRepeat = c => c.every((v, j) => j === c.length - 1 ? qeq(v, ONE) : qz(v));

  function recWords(c, aff, d) {
    const L = c.length, ones = c.every(v => qeq(v, ONE));
    if (L === 2 && ones) return 'each value is the sum of the previous two';
    if (ones) return 'each value is the sum of the previous ' + L;
    if (aff) return '× ' + show(aff.a) + ', then ' + (aff.b.n < 0n ? '− ' : '+ ') + show(Q(babs(aff.b.n), aff.b.d), d) + ' each row';
    const back = k => k === 1 ? 'the previous value' : 'the value ' + k + ' back';
    const terms = c.map((v, i) => qz(v) ? null : { v, k: i + 1 }).filter(Boolean);
    return 'each value = ' + terms.map((t, i) => { const neg = t.v.n < 0n, mag = Q(babs(t.v.n), t.v.d); return (i === 0 ? (neg ? '−' : '') : neg ? ' − ' : ' + ') + (qeq(mag, ONE) ? '' : show(mag) + ' × ') + back(t.k); }).join('');
  }

  function recRule(L, c, runs) {
    const D = c.reduce((a, v) => lcm(a, v.d), 1n), C = c.map(v => v.n * (D / v.d));
    let aff = null;
    if (L === 2 && qeq(qadd(c[0], c[1]), ONE)) {
      const a = qsub(ZERO, c[1]), ns = [];
      if (!qz(a) && !qeq(a, ONE)) {
        for (const run of runs) for (let k = 1; k < run.length; k++) ns.push(a.d * run[k] - a.n * run[k - 1]);
        if (ns.length) { const b = Q(mode(ns, String), a.d); if (!qz(b)) aff = { a, b }; }
      }
    }
    return {
      family: 'recurrence', mode: 'recursive', order: L, params: L, complexity: 20 + L, invertible: !qz(c[L - 1]),
      predict: (cur, i) => { let s = 0n; for (let j = 0; j < L; j++) { const v = cur[i - 1 - j]; if (v === null) return null; s += C[j] * v; } return { num: s, den: D }; },
      predictBack: (cur, i) => { if (cur[i + L] === null) return null; let s = D * cur[i + L]; for (let j = 0; j < L - 1; j++) { const v = cur[i + L - 1 - j]; if (v === null) return null; s -= C[j] * v; } return pair(s, C[L - 1]); },
      describe: dec => recWords(c, aff, dec)
    };
  }

  const maxOrder = info => Math.min(R_MAX, Math.floor((info.longest.length - 3) / 2));
  const recurrence = {
    id: 'recurrence', minKnown: 7,
    tested: (x, o) => Math.max(0, maxOrder(o.info) - 1),
    fit(x, o) {
      const run = o.info.longest, limit = maxOrder(o.info), seen = new Set(), out = [];
      if (limit < 2) return out;
      for (const st of new Set([0, Math.max(0, Math.floor((run.length - BM_WINDOW) / 2)), Math.max(0, run.length - BM_WINDOW)])) {
        const f = bm(run.slice(st, st + BM_WINDOW).map(v => Q(v)), limit);
        if (!f) continue;
        let c = f.c;
        while (c.length && qz(c[c.length - 1])) c = c.slice(0, -1);
        if (c.length < 2 || isPolyPattern(c) || isRepeat(c)) continue;
        const key = c.map(v => v.n + '/' + v.d).join(',');
        if (seen.has(key)) continue;
        seen.add(key); out.push(recRule(c.length, c, o.info.runs));
      }
      return out;
    }
  };

  const cycle = {
    id: 'cycle', minKnown: 4,
    tested: (x, o) => Math.min(MAX_PERIOD, Math.floor(o.info.known / 3)),
    fit(x, o) {
      const out = [];
      for (let p = 1; p <= cycle.tested(x, o); p++) {
        const reps = Array.from({ length: p }, (_, r) => { const vals = o.info.kn.filter(k => k.i % p === r).map(k => k.v); return vals.length ? mode(vals, String) : null; });
        out.push({
          family: 'cycle', mode: 'index', order: 0, params: reps.filter(v => v !== null).length, complexity: 30 + p, invertible: false,
          predict: (cur, i) => reps[i % p] === null ? null : { num: reps[i % p], den: 1n },
          describe: d => 'the same ' + p + ' number' + (p > 1 ? 's' : '') + ' repeat: ' + reps.map(v => v === null ? '?' : show(v, d)).join(', ')
        });
      }
      return out;
    }
  };

  const primes = N => { const o = []; for (let k = 2n; o.length < N; k++) { let p = true; for (const q of o) { if (q * q > k) break; if (k % q === 0n) { p = false; break; } } if (p) o.push(k); } return o; };
  const composites = N => { const o = []; for (let k = 4n; o.length < N; k++) { for (let q = 2n; q * q <= k; q++) if (k % q === 0n) { o.push(k); break; } } return o; };
  const factorials = N => { const o = [1n]; for (let i = 1; i < N; i++) o.push(o[i - 1] * BigInt(i)); return o; };
  const doubleFact = N => { const o = [1n, 1n]; for (let i = 2; i < N; i++) o.push(o[i - 2] * BigInt(i)); return o.slice(0, N); };
  const catalan = N => { const o = [1n]; for (let i = 0; i < N - 1; i++) o.push(o[i] * 2n * (2n * BigInt(i) + 1n) / (BigInt(i) + 2n)); return o; };
  const central = N => { const o = [1n]; for (let i = 0; i < N - 1; i++) o.push(o[i] * 2n * (2n * BigInt(i) + 1n) / (BigInt(i) + 1n)); return o; };
  const bell = N => { let row = [1n]; const o = [1n]; for (let i = 1; i < N; i++) { const nr = [row[row.length - 1]]; for (const v of row) nr.push(nr[nr.length - 1] + v); row = nr; o.push(row[0]); } return o; };
  const partitions = N => { const p = [1n]; for (let n = 1; n < N; n++) { let s = 0n; for (let k = 1; ; k++) { const a = n - k * (3 * k - 1) / 2, b = n - k * (3 * k + 1) / 2; if (a < 0) break; const t = p[a] + (b >= 0 ? p[b] : 0n); s += k % 2 ? t : -t; } p.push(s); } return p; };
  const derange = N => { const o = [1n, 0n]; for (let i = 2; i < N; i++) o.push(BigInt(i - 1) * (o[i - 1] + o[i - 2])); return o.slice(0, N); };
  const totient = N => { const o = []; for (let n = 1; o.length < N; n++) { let m = n, r = n; for (let p = 2; p * p <= m; p++) if (m % p === 0) { while (m % p === 0) m /= p; r -= r / p; } if (m > 1) r -= r / m; o.push(BigInt(r)); } return o; };
  const divisors = N => { const o = []; for (let n = 1; o.length < N; n++) { let c = 0; for (let k = 1; k <= n; k++) if (n % k === 0) c++; o.push(BigInt(c)); } return o; };
  const selfPow = N => { const o = []; for (let n = 1; o.length < N; n++) o.push(BigInt(n) ** BigInt(n)); return o; };
  const motzkin = N => { const o = [1n, 1n]; for (let i = 2; i < N; i++) o.push((BigInt(2 * i + 1) * o[i - 1] + BigInt(3 * i - 3) * o[i - 2]) / BigInt(i + 2)); return o.slice(0, N); };
  const LIB = [['Prime numbers', primes], ['Composite numbers', composites], ['Factorials', factorials], ['Double factorials', doubleFact], ['Catalan numbers', catalan], ['Central binomial coefficients', central], ['Bell numbers', bell], ['Partition numbers', partitions], ['Derangements', derange], ['Euler totient', totient], ['Number of divisors', divisors], ['n to the power n', selfPow], ['Motzkin numbers', motzkin]];

  let libCache = null;
  const libTables = () => libCache || (libCache = LIB.map(([name, gen]) => [name, gen(LIB_MAX + OFFSETS + HORIZON)]));

  const library = {
    id: 'library', minKnown: 7,
    tested: (x, o) => o.info.n > LIB_MAX ? 0 : LIB.length * (OFFSETS + 1),
    fit(x, o) {
      const out = [];
      if (o.info.n > LIB_MAX) return out;
      for (const [name, arr] of libTables()) {
        for (let off = 0; off <= OFFSETS; off++) {
          if (!o.info.kn.every(k => arr[off + k.i] === k.v)) continue;
          out.push({
            family: 'library', mode: 'index', order: 0, params: off > 0 ? 1 : 0, complexity: 50, invertible: false,
            predict: (cur, i) => ({ num: arr[off + i], den: 1n }),
            describe: () => name + (off ? ' starting from term ' + (off + 1) : '')
          });
        }
      }
      return out;
    }
  };

  const FAMILIES = [step, ratio, poly, recurrence, cycle, library];

  function present(sc, x, o, tested) {
    const r = sc.rule, clean = sc.excN === 0, n = x.length, nx = clean && x[n - 1] !== null ? r.predict(sc.cur, n) : null;
    return {
      family: r.family, desc: r.describe(o.d, sc.gaps.length > 0), k: sc.k, n: sc.n, params: r.params, adj: sc.adj, tested,
      excN: sc.excN, exc: sc.exc.map(e => ({ i: e.i, expected: Q(e.num, e.den), found: e.found })).sort((a, b) => a.i - b.i),
      gaps: sc.gaps, filled: clean ? sc.filled : [], next: nx ? Q(nx.num, nx.den) : null
    };
  }

  const outcome = (v, d) => (v.next ? show(v.next, d) : '') + '|' + v.filled.map(f => f.i + '=' + show(f.v, d)).join(',');

  function analyze(x, o) {
    if (o.d > MAX_SCALE || x.some(v => v !== null && (v >= LIMIT || v <= -LIMIT))) return null;
    const ctx = Object.assign({ info: inspect(x) }, o), live = [];
    for (const f of o.date ? [step] : FAMILIES) {
      const t = ctx.info.known >= f.minKnown ? f.tested(x, ctx) : 0;
      if (t > 0) live.push({ f, t });
    }
    const tested = live.reduce((s, e) => s + e.t, 0), scored = [];
    for (const { f } of live) {
      for (const rule of f.fit(x, ctx)) {
        const sc = score(rule, x, ctx);
        if (!sc) continue;
        sc.adj = adjust(sc.log10p, tested);
        if (sc.adj <= MAX_LOG10P) scored.push(sc);
      }
    }
    if (!scored.length) return null;
    scored.sort((a, b) => a.adj - b.adj);
    const top = scored[0].adj, win = scored.filter(s => s.adj <= top + 1).sort((a, b) => a.rule.params - b.rule.params || a.rule.complexity - b.rule.complexity)[0];
    const best = present(win, x, ctx, tested), key = outcome(best, o.d);
    best.rivals = scored.filter(s => s !== win && s.excN === 0).map(s => present(s, x, ctx, tested)).filter(v => outcome(v, o.d) !== key).slice(0, 2);
    best.ambiguous = best.rivals.some(v => v.adj <= best.adj + 2);
    best.size = x.length; best.fitted = ctx.info.fitN;
    return best;
  }

  return { analyze };
})();
