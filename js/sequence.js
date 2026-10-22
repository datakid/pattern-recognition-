const SEQ = (() => {
  const { Q, qadd, qsub, qmul, qdiv, qz, qeq, babs, lcm, show, diffsOf, mode, log10Tail, adjust, shuffleKnown, MAX_LOG10P, NEAR_LOG10P, MIN_SUPPORT } = UTIL;
  const MISS_KEEP = 3, R_MAX = 6, OFFSETS = 5, HORIZON = 5, BM_WINDOW = 24, SHUFFLES = 200, REFITS = 50, PERM_CAP = 300, MAX_EXC = 1000, MAX_GAPS = 10, FIT_CAP = 1000, MAX_PERIOD = 12, LIB_MAX = 60, MAX_SCALE = 9, LIMIT = 10n ** 60n, DEN_MAX = 24n, INTER_MAX = 200, SEG_MAX = 60, SEG_SIDE = 5, WORK_ROWS = 3;
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
    const n = x.length, o = rule.order, cur = x.slice(), out = { hits: 0, trials: 0, excN: 0, exc: [], filled: [], gaps: [], bad: false, cur, dir: back ? 'backward' : 'forward', hitAt: [] };
    const at = back ? i => rule.predictBack(cur, i) : i => rule.predict(cur, i);
    for (let i = back ? n - 1 - o : o; back ? i >= 0 : i < n; i += back ? -1 : 1) {
      const v = cur[i], p = at(i);
      if (v === null) {
        if (p === null || !fits(p)) { out.bad = true; continue; }
        cur[i] = p.num / p.den; out.filled.push(i); continue;
      }
      if (p === null) continue;
      if (p.num === p.den * v) { out.trials++; out.hits++; if (out.hitAt.length < WORK_ROWS) out.hitAt.push(i); continue; }
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
    let r, why = '';
    if (ok(f) && (!ok(b) || f.excN <= b.excN)) { r = f; if (ok(b)) why = f.excN === b.excN ? 'both directions gave the same exceptions' : 'forward had fewer exceptions'; }
    else if (ok(b)) { r = b; why = ok(f) ? 'backward had fewer exceptions' : 'forward could not fill every gap'; }
    else r = f || b;
    if (r) r.why = why;
    return r;
  }

  function score(rule, x, o) {
    const r = repair(rule, x, Math.floor((1 - MIN_SUPPORT) * o.info.known + 1e-9));
    if (!r || r.bad || r.trials < 1 || r.hits < rule.params + 3 || r.hits / r.trials < MIN_SUPPORT) return null;
    const cap = x.slice(0, PERM_CAP), gen = rule.familyRef && rule.familyRef.nullOf || shuffleKnown;
    let sum = 0, tp = 0;
    const rand = UTIL.rngFor(...(o.seed || ['seq']), rule.family, rule.ix);
    for (let s = 0; s < SHUFFLES; s++) { const t = repair(rule, gen(cap, rand), Infinity); sum += t.hits; tp += t.trials; }
    let p0 = (sum + 1) / (tp + 2), pRefit = null;
    const pShuffle = p0;
    if (rule.params >= 2 && rule.familyRef) {
      let bh = 0, bt = 0;
      for (let s = 0; s < REFITS; s++) {
        const sh = gen(cap, rand), cx = Object.assign({}, o, { info: inspect(sh) });
        let top = 0;
        if (cx.info.known >= rule.familyRef.minKnown) for (const r2 of rule.familyRef.fit(sh, cx)) {
          if (r2.params === rule.params) top = Math.max(top, repair(r2, sh, Infinity).hits);
        }
        bh += Math.max(0, top - rule.params); bt += Math.max(1, repair(rule, sh, Infinity).trials - rule.params);
      }
      pRefit = (bh + 1) / (bt + 2);
      p0 = Math.max(p0, pRefit);
    }
    return { rule, k: r.hits, n: r.trials, log10p: log10Tail(r.trials - rule.params, r.hits - rule.params, p0), excN: r.excN, exc: r.exc, gaps: r.gaps, cur: r.cur, filled: r.filled.map(i => ({ i, v: r.cur[i] })), dir: r.dir, why: r.why, hitAt: r.hitAt, p0, pShuffle, pRefit };
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
        describe: (d, plain) => !o.date && d === 0 && !plain ? formula([Q(b), Q(s)]) : 'steps by ' + show(Q(s), d) + (o.date ? UTIL.dayWord(Number(s)) : ''),
        phrase: (sub, d) => sub + ' step by ' + show(Q(s), d),
        how: d => ['The step ' + show(Q(s), d) + ' is the most common difference between neighbouring values.'],
        work: (cur, i, d) => show(cur[i], d) + ' = ' + show(cur[i - 1], d) + (s < 0n ? ' − ' : ' + ') + show(Q(babs(s)), d)
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
        family: 'ratio', mode: 'recursive', order: 1, params: 1, complexity: 1, invertible: true, q: r,
        predict: (cur, i) => cur[i - 1] === null ? null : { num: r.n * cur[i - 1], den: r.d },
        predictBack: (cur, i) => cur[i + 1] === null ? null : pair(r.d * cur[i + 1], r.n),
        describe: () => '× ' + show(r) + ' each row',
        phrase: sub => sub + ' are multiplied by ' + show(r) + ' each time',
        how: () => ['The ratio ' + show(r) + ' is the most common quotient of neighbouring values.'],
        work: (cur, i, d) => show(cur[i], d) + ' ÷ ' + show(cur[i - 1], d) + ' = ' + show(r)
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

  function pointSets(kn, d) {
    const m = d + 1, L = kn.length, sets = new Map();
    for (const pts of [kn.slice(0, m), Array.from({ length: m }, (_, j) => kn[Math.round(j * (L - 1) / d)]), kn.slice(L - m)]) sets.set(pts.map(p => p.i).join(','), pts);
    return [...sets.values()];
  }

  const poly = {
    id: 'poly', minKnown: 6,
    tested: (x, o) => { let c = 0; for (let d = 2; d <= (o.maxDeg || 5); d++) if (o.info.known >= d + 4 && o.info.kn.length >= d + 1) c += pointSets(o.info.kn, d).length; return c; },
    fit(x, o) {
      const { kn } = o.info, out = [];
      for (let d = 2; d <= (o.maxDeg || 5); d++) {
        if (o.info.known < d + 4 || kn.length < d + 1) continue;
        let best = null;
        for (const pts of pointSets(kn, d)) {
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
          describe: dec => (dec === 0 && formula(best.co)) || 'order-' + d + ' differences are constant (' + show(qmul(best.co[d], Q(fact)), dec) + ')',
          phrase: (sub, dec) => sub + (dec === 0 && formula(best.co) ? ' follow ' + formula(best.co) : ' have constant order-' + d + ' differences'),
          how: () => ['A polynomial of degree ' + d + ' was fitted exactly through ' + (d + 1) + ' known values; its order-' + d + ' differences are constant.'],
          table: dec => {
            const at = k => { const e = best.predict(null, k); return Q(e.num, e.den); }, rows = [];
            let row = Array.from({ length: 8 }, (_, k) => at(k));
            for (let q = 0; q <= d; q++) { rows.push(row.map(v => show(v, dec)).join(', ')); row = row.slice(1).map((v, k) => qsub(v, row[k])); }
            return rows;
          },
          work: (cur, i, dec) => 'position ' + (i + 1) + ': the polynomial gives ' + show(cur[i], dec)
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
      describe: dec => recWords(c, aff, dec),
      how: () => ['The coefficients were found by the Berlekamp–Massey method on a window of the longest run of known values (order ' + L + ').'],
      work: (cur, i, dec) => {
        const parts = c.map((v, j) => qz(v) ? null : { v, j }).filter(Boolean);
        return show(cur[i], dec) + ' = ' + parts.map((t, k) => { const neg = t.v.n < 0n, mag = Q(babs(t.v.n), t.v.d); return (k === 0 ? (neg ? '−' : '') : neg ? ' − ' : ' + ') + (qeq(mag, ONE) ? '' : show(mag) + ' × ') + show(cur[i - 1 - t.j], dec); }).join('');
      }
    };
  }

  const windows = run => [...new Set([0, Math.max(0, Math.floor((run.length - BM_WINDOW) / 2)), Math.max(0, run.length - BM_WINDOW)])];
  const maxOrder = info => Math.min(R_MAX, Math.floor((info.longest.length - 3) / 2));
  const recurrence = {
    id: 'recurrence', minKnown: 7,
    tested: (x, o) => Math.max(0, maxOrder(o.info) - 1) * windows(o.info.longest).length,
    fit(x, o) {
      const run = o.info.longest, limit = maxOrder(o.info), seen = new Set(), out = [];
      if (limit < 2) return out;
      for (const st of windows(run)) {
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
        const buckets = Array.from({ length: p }, () => []);
        for (const k of o.info.kn) buckets[k.i % p].push(k.v);
        const reps = buckets.map(vals => vals.length ? mode(vals, String) : null);
        out.push({
          family: 'cycle', mode: 'index', order: 0, period: p, reps, params: reps.filter(v => v !== null).length, complexity: 30 + p, invertible: false,
          predict: (cur, i) => reps[i % p] === null ? null : { num: reps[i % p], den: 1n },
          describe: d => p === 1 && reps[0] !== null ? 'every value is ' + show(reps[0], d) : 'the same ' + p + ' number' + (p > 1 ? 's' : '') + ' repeat: ' + reps.map(v => v === null ? '?' : show(v, d)).join(', '),
          phrase: (sub, d) => sub + ' repeat ' + reps.map(v => v === null ? '?' : show(v, d)).join(', '),
          how: d => ['The repeating block ' + reps.map(v => v === null ? '?' : show(v, d)).join(', ') + ' takes the most common value at each of the ' + p + ' phases.'],
          work: (cur, i, d) => 'position ' + (i + 1) + ' is entry ' + (i % p + 1) + ' of the block: ' + show(cur[i], d)
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
  const selfPow = N => { const o = []; for (let n = 0; o.length < N; n++) o.push(BigInt(n) ** BigInt(n)); return o; };
  const motzkin = N => { const o = [1n, 1n]; for (let i = 2; i < N; i++) o.push((BigInt(2 * i + 1) * o[i - 1] + BigInt(3 * i - 3) * o[i - 2]) / BigInt(i + 2)); return o.slice(0, N); };
  const LIB = [['Prime numbers', primes, 'A000040'], ['Composite numbers', composites, 'A002808'], ['Factorials', factorials, 'A000142'], ['Double factorials', doubleFact, 'A006882'], ['Catalan numbers', catalan, 'A000108'], ['Central binomial coefficients', central, 'A000984'], ['Bell numbers', bell, 'A000110'], ['Partition numbers', partitions, 'A000041'], ['Derangements', derange, 'A000166'], ['Euler totient', totient, 'A000010'], ['Number of divisors', divisors, 'A000005'], ['n to the power n', selfPow, 'A000312'], ['Motzkin numbers', motzkin, 'A001006']];

  let libCache = null;
  const libTables = () => libCache || (libCache = LIB.map(([name, gen, oeis]) => [name + ' (OEIS ' + oeis + ')', gen(LIB_MAX + OFFSETS + HORIZON), oeis]));

  const library = {
    id: 'library', minKnown: 7,
    tested: (x, o) => o.info.n > LIB_MAX ? 0 : LIB.length * ((o.maxOff === undefined ? OFFSETS : o.maxOff) + 1),
    fit(x, o) {
      const out = [];
      if (o.info.n > LIB_MAX) return out;
      for (const [name, arr, oeis] of libTables()) {
        for (let off = 0; off <= (o.maxOff === undefined ? OFFSETS : o.maxOff); off++) {
          if (!o.info.kn.every(k => arr[off + k.i] === k.v)) continue;
          out.push({
            family: 'library', mode: 'index', order: 0, params: off > 0 ? 1 : 0, complexity: 50, invertible: false,
            predict: (cur, i) => ({ num: arr[off + i], den: 1n }),
            describe: () => name + (off ? ', starting from term ' + (off + 1) : ''),
            phrase: sub => sub + ' are ' + name + (off ? ', starting from term ' + (off + 1) : ''),
            how: () => ['Every known value equals ' + name + (off ? ' read from term ' + (off + 1) : '') + '; the library holds ' + LIB.length + ' sequences, each tried from ' + (OFFSETS + 1) + ' starting terms.'],
            work: (cur, i) => 'position ' + (i + 1) + ' is term ' + (off + i + 1) + ' of ' + oeis
          });
        }
      }
      return out;
    }
  };

  const qkey = q => q.n + '/' + q.d;
  const clause = (r, sub, d) => r.phrase ? r.phrase(sub, d) : sub + ': ' + r.describe(d, true);
  const abs = v => v < 0n ? -v : v;
  const subCtx = (o, arr, extra) => Object.assign({}, o, { info: inspect(arr), date: false, columns: false }, extra);
  const usable = (fams, arr, o, extra) => { const c = subCtx(o, arr, extra); return { c, fams: fams.filter(f => c.info.known >= f.minKnown) }; };
  const countOf = (fams, arr, o, extra) => { const u = usable(fams, arr, o, extra); return u.fams.reduce((s, f) => s + f.tested(arr, u.c), 0); };
  const hitsOn = (rule, arr) => {
    let h = 0;
    for (let i = rule.order; i < arr.length; i++) { const v = arr[i]; if (v === null) continue; const p = rule.predict(arr, i); if (p !== null && p.num === p.den * v) h++; }
    return h;
  };
  const bestOf = (fams, arr, o, extra) => {
    const u = usable(fams, arr, o, extra); let best = null;
    for (const f of u.fams) for (const r of f.fit(arr, u.c)) {
      const h = hitsOn(r, arr);
      if (!best || h > best.h || (h === best.h && (r.params < best.r.params || (r.params === best.r.params && r.complexity < best.r.complexity)))) best = { r, h };
    }
    return best;
  };

  const rgrow = {
    id: 'rgrow', minKnown: 7,
    tested: () => 1,
    fit(x, o) {
      const { kn } = o.info, rs = [], ds = [];
      for (let j = 1; j < kn.length; j++) if (kn[j].i === kn[j - 1].i + 1 && kn[j - 1].v !== 0n) rs.push({ n: kn[j].i + 1, r: Q(kn[j].v, kn[j - 1].v) });
      for (let j = 1; j < rs.length; j++) if (rs[j].n === rs[j - 1].n + 1) ds.push(qsub(rs[j].r, rs[j - 1].r));
      if (!ds.length) return [];
      const a = mode(ds, qkey);
      if (qz(a)) return [];
      const b = mode(rs.map(e => qsub(e.r, qmul(a, Q(BigInt(e.n))))), qkey), at = n => qadd(qmul(a, Q(BigInt(n))), b);
      return [{
        family: 'rgrow', mode: 'recursive', order: 1, params: 2, complexity: 5, invertible: false,
        predict: (cur, i) => { if (cur[i - 1] === null) return null; const q = at(i + 1); return { num: q.n * cur[i - 1], den: q.d }; },
        describe: () => 'the ratio between neighbours grows by ' + show(a) + ' each row (' + [2, 3, 4].map(n => '× ' + show(at(n))).join(', ') + ', …)',
        how: () => ['The ratio a(n) ÷ a(n−1) was found to be ' + show(a) + ' × n ' + (qz(b) ? '' : (b.n < 0n ? '− ' : '+ ') + show(Q(babs(b.n), b.d)) + ' ') + '(the step ' + show(a) + ' is the most common difference between neighbouring ratios).'],
        work: (cur, i, d) => show(cur[i], d) + ' ÷ ' + show(cur[i - 1], d) + ' = ' + show(at(i + 1))
      }];
    }
  };

  const NESTED = { maxOff: 0 }, DIFF_RANK = { step: 18, ratio: 19, cycle: 21, library: 23 };
  const DIFF_FAMS = [step, ratio, cycle, library];
  const diffList = x => { const o = new Array(Math.max(0, x.length - 1)); for (let k = 0; k < o.length; k++) o[k] = x[k] === null || x[k + 1] === null ? null : x[k + 1] - x[k]; return o; };

  function diffRule(inner) {
    const L = inner.order, dv = [];
    return {
      family: 'diff', mode: 'recursive', order: 1 + L, params: inner.params + (inner.family === 'step' ? 2 : 1), complexity: DIFF_RANK[inner.family], invertible: false, inner,
      predict: (cur, i) => {
        if (cur[i - 1] === null) return null;
        for (let t = 1; t <= L; t++) { const a = cur[i - t], b = cur[i - t - 1]; dv[i - 1 - t] = a === null || b === null ? null : a - b; }
        const p = inner.predict(dv, i - 1);
        return p === null ? null : { num: cur[i - 1] * p.den + p.num, den: p.den };
      },
      describe: d => clause(inner, 'the differences', d),
      how: d => ['Each value minus the one before it was taken, and the rule was fitted to those differences.'].concat(inner.how ? inner.how(d) : []),
      work: (cur, i, d) => show(cur[i], d) + ' − ' + show(cur[i - 1], d) + ' = ' + show(cur[i] - cur[i - 1], d) + (inner.work ? ' · ' + inner.work(diffList(cur), i - 1, d) : '')
    };
  }

  const shorter = reps => { for (let q = 1; q < reps.length; q++) if (reps.length % q === 0 && reps.every((v, i) => v === reps[i % q])) return true; return false; };
  const periodic = r => r.family === 'cycle' ? r.period === 1 || shorter(r.reps) || (r.reps.every(v => v !== null) && r.reps.reduce((a, v) => a + v, 0n) === 0n) : r.family === 'ratio' && r.q.n === -1n && r.q.d === 1n;

  const diffs = {
    id: 'diff', minKnown: 7,
    tested: (x, o) => countOf(DIFF_FAMS, diffList(x), o, NESTED),
    fit(x, o) {
      const d = diffList(x), u = usable(DIFF_FAMS, d, o, NESTED), out = [];
      for (const f of u.fams) for (const r of f.fit(d, u.c)) if (!periodic(r)) out.push(diffRule(r));
      return out;
    }
  };

  const ALT_FAMS = [step, ratio, poly, recurrence, library];
  const mixed = x => { let pos = 0, neg = 0; for (const v of x) if (v !== null) { if (v > 0n) pos++; else if (v < 0n) neg++; } return pos >= 2 && neg >= 2; };
  const absList = x => x.map(v => v === null ? null : abs(v));

  function altRule(inner, s0) {
    const L = inner.order, ac = [];
    return {
      family: 'alt', mode: inner.mode, order: L, params: inner.params + 1, complexity: 15 + inner.complexity, invertible: false, inner,
      predict: (cur, i) => {
        for (let t = 1; t <= L; t++) { const v = cur[i - t]; ac[i - t] = v === null ? null : abs(v); }
        const p = inner.predict(ac, i);
        return p === null ? null : (i % 2 === 0) === (s0 > 0n) ? p : { num: -p.num, den: p.den };
      },
      describe: d => 'the signs alternate and ' + clause(inner, 'the absolute values', d),
      how: d => ['The signs alternate (' + (s0 > 0n ? '+, −, +, −, …' : '−, +, −, +, …') + '), and the rule was fitted to the absolute values.'].concat(inner.how ? inner.how(d) : []),
      work: (cur, i, d) => show(cur[i], d) + ' = ' + (cur[i] < 0n ? '−' : '+') + show(abs(cur[i]), d) + (inner.work ? ' (' + inner.work(cur.map(v => v === null ? null : abs(v)), i, d) + ')' : '')
    };
  }

  const alt = {
    id: 'alt', minKnown: 7,
    tested: (x, o) => mixed(x) ? countOf(ALT_FAMS, absList(x), o, NESTED) : 0,
    fit(x, o) {
      if (!mixed(x)) return [];
      const a = absList(x), u = usable(ALT_FAMS, a, o, NESTED);
      let agree = 0, dis = 0;
      for (const k of o.info.kn) if (k.v !== 0n) ((k.v > 0n) === (k.i % 2 === 0) ? agree++ : dis++);
      const s0 = agree >= dis ? 1n : -1n, out = [];
      for (const f of u.fams) for (const r of f.fit(a, u.c)) if (!(f === cycle && r.period === 1)) out.push(altRule(r, s0));
      return out;
    }
  };

  const HALF_FAMS = [step, ratio, poly], HALF_CTX = { maxDeg: 3 };
  const halvesOf = x => { const a = [], b = []; for (let i = 0; i < x.length; i++) (i % 2 ? b : a).push(x[i]); return [a, b]; };
  const HALF_NAMES = ['odd positions', 'even positions'];

  function interRule(rs) {
    const sv = [[], []];
    return {
      family: 'inter', combined: 'interleaved', mode: 'recursive', order: 2 * Math.max(rs[0].order, rs[1].order), params: rs[0].params + rs[1].params, complexity: 80 + rs[0].complexity + rs[1].complexity, invertible: false, inner: rs,
      predict: (cur, i) => {
        const h = i % 2, j = (i - h) / 2, r = rs[h];
        if (j < r.order) return null;
        for (let t = 1; t <= r.order; t++) sv[h][j - t] = cur[i - 2 * t];
        return r.predict(sv[h], j);
      },
      partOf: i => i % 2,
      partList: d => rs.map((r, h) => ({ label: HALF_NAMES[h], desc: clause(r, HALF_NAMES[h], d), params: r.params, how: r.how ? r.how(d) : [] })),
      describe: d => 'two parts: ' + rs.map((r, h) => clause(r, HALF_NAMES[h], d)).join('; '),
      how: d => rs.flatMap((r, h) => [HALF_NAMES[h] + ' (every second value):'].concat(r.how ? r.how(d) : [])),
      work: (cur, i, d) => { const h = i % 2, r = rs[h]; return HALF_NAMES[h] + ', ' + (r.work ? r.work(cur.filter((_, k) => k % 2 === h), (i - h) / 2, d) : 'position ' + (i + 1)); }
    };
  }

  const inter = {
    id: 'inter', minKnown: 2 * SEG_SIDE,
    nullOf(x, rand) {
      const [a, b] = halvesOf(x).map(h => shuffleKnown(h, rand)), out = [];
      for (let i = 0; i < x.length; i++) out.push((i % 2 ? b : a)[i >> 1]);
      return out;
    },
    tested: (x, o) => x.length > INTER_MAX ? 0 : halvesOf(x).map(h => countOf(HALF_FAMS, h, o, HALF_CTX)).reduce((a, b) => a * b, 1),
    fit(x, o) {
      if (x.length > INTER_MAX) return [];
      const pick = halvesOf(x).map(h => bestOf(HALF_FAMS, h, o, HALF_CTX));
      return pick.every(p => p && p.h >= 3) ? [interRule(pick.map(p => p.r))] : [];
    }
  };

  const SEG_FAMS = [step, ratio];

  function segRule(L, R, s) {
    return {
      family: 'seg', combined: 'segments', mode: 'recursive', order: 1, params: L.params + R.params + 1, complexity: 90 + L.complexity + R.complexity, invertible: false, inner: [L, R], split: s,
      predict: (cur, i) => i < s ? L.predict(cur, i) : i === s ? null : R.predict(cur, i),
      partOf: i => i < s ? 0 : 1,
      partList: d => [{ label: 'positions 1–' + s, desc: clause(L, 'positions 1–' + s, d), params: L.params, how: L.how ? L.how(d) : [] }, { label: 'positions ' + (s + 1) + ' onwards', desc: clause(R, 'positions ' + (s + 1) + ' onwards', d), params: R.params, how: R.how ? R.how(d) : [] }],
      describe: d => 'two parts: ' + clause(L, 'positions 1–' + s, d) + '; ' + clause(R, 'positions ' + (s + 1) + ' onwards', d),
      how: d => ['One change point was searched at every position that leaves at least ' + SEG_SIDE + ' values on each side; the best was after position ' + s + '.', 'Before it:'].concat(L.how ? L.how(d) : [], ['After it:'], R.how ? R.how(d) : []),
      work: (cur, i, d) => (i < s ? L : R).work ? (i < s ? L : R).work(cur, i, d) : 'position ' + (i + 1)
    };
  }

  const seg = {
    id: 'seg', minKnown: 2 * SEG_SIDE,
    tested: x => x.length > SEG_MAX || x.length < 2 * SEG_SIDE ? 0 : SEG_FAMS.length * SEG_FAMS.length * (x.length - 2 * SEG_SIDE + 1),
    fit(x, o) {
      const n = x.length;
      if (n > SEG_MAX || n < 2 * SEG_SIDE) return [];
      let best = null;
      for (let s = SEG_SIDE; s <= n - SEG_SIDE; s++) {
        const l = bestOf(SEG_FAMS, x.slice(0, s), o), r = bestOf(SEG_FAMS, x.slice(s), o);
        if (!l || !r || l.h < 3 || r.h < 3) continue;
        if (!best || l.h + r.h > best.h) best = { l: l.r, r: r.r, s, h: l.h + r.h };
      }
      return best ? [segRule(best.l, best.r, best.s)] : [];
    }
  };

  const FAMILIES = [step, ratio, poly, recurrence, cycle, library, rgrow, diffs, alt, inter, seg];

  const qs = q => q.d === 1n ? String(q.n) : q.n + '/' + q.d;
  const signed = (found, expected, d) => { const diff = Q(found * expected.d - expected.n, expected.d); return (diff.n < 0n ? '−' : '+') + show(Q(babs(diff.n), diff.d), d); };

  function explain(sc, x, o, tested) {
    const r = sc.rule, d = o.d, f = v => show(v, d), work = (r.work ? sc.hitAt.map(i => r.work(sc.cur, i, d)) : []), e = sc.exc[0];
    return {
      rule: r.describe(d, sc.gaps.length > 0),
      how: r.how ? r.how(d) : [],
      table: r.table ? r.table(d) : [],
      worked: work,
      exception: e ? 'position ' + (e.i + 1) + ': expected ' + f(Q(e.num, e.den)) + ', found ' + f(e.found) + ' (' + signed(e.found, Q(e.num, e.den), d) + ')' : null,
      walk: sc.dir + (sc.why ? ' (' + sc.why + ')' : ''),
      chance: { hits: sc.k, trials: sc.n, params: r.params, p0: sc.p0, pShuffle: sc.pShuffle, pRefit: sc.pRefit, shuffles: SHUFFLES, refits: sc.pRefit === null ? 0 : REFITS, log10p: sc.log10p, adj: sc.adj, tested, cols: o.cols || 1 }
    };
  }

  const NOWHERE = { kind: 'column', table: '', cols: [0], line: null };

  function present(sc, x, o, tested) {
    const r = sc.rule, n = x.length, own = i => r.partOf ? r.partOf(i) : 0, dirty = new Set(sc.exc.map(e => own(e.i))), okAt = i => !dirty.has(own(i));
    const clean = sc.excN === 0, nx = okAt(n) ? r.predict(sc.cur, n) : null, cur = sc.cur.slice(), pr = [];
    while (cur.length < n + HORIZON) cur.push(null);
    for (let i = 0; i < n + HORIZON; i++) {
      if (i < r.order || (i >= n && !okAt(i))) { pr.push(null); continue; }
      const p = r.predict(cur, i);
      pr.push(p ? qs(Q(p.num, p.den)) : null);
      if (i >= n && p && fits(p)) cur[i] = p.num / p.den;
    }
    const sub = o.subject || NOWHERE, desc = r.describe(o.d, sc.gaps.length > 0);
    const exc = sc.exc.map(e => ({ i: e.i, expected: Q(e.num, e.den), found: e.found })).sort((a, b) => a.i - b.i);
    return {
      id: [sub.kind, sub.table, sub.cols.join(','), sub.line === null ? '' : sub.line].join(':') + '|' + r.family + '|' + desc,
      kind: 'seq', subject: sub, scope: { kind: r.combined === 'segments' ? 'segment' : r.combined ? 'positions' : 'all', rows: null, label: '' },
      family: r.family, rank: r.complexity, key: null, form: desc, headline: (o.name ? o.name + ' ' : '') + desc, desc, k: sc.k, n: sc.n, hits: sc.k, exact: sc.k, rounded: 0, size: n,
      params: r.params, log10p: sc.log10p, adj: sc.adj, chance: sc.adj, tested, cols: o.cols || 1,
      excN: sc.excN, exc, exceptions: exc.map(e => ({ pos: e.i, expected: e.expected, found: e.found, diff: signed(e.found, e.expected, o.d), reason: 'differs from ' + desc })),
      gaps: sc.gaps, filled: clean ? sc.filled : [], fills: clean ? sc.filled : [], next: nx ? Q(nx.num, nx.den) : null, finer: nx ? !fits(nx) : false,
      combined: r.combined || null, parts: r.partList ? r.partList(o.d) : [], predictions: pr, status: 'primary', group: null, explainedBy: {}, explain: () => explain(sc, x, o, tested)
    };
  }

  function results(x, o) {
    if (o.d > MAX_SCALE || x.some(v => v !== null && (v >= LIMIT || v <= -LIMIT))) return null;
    const ctx = Object.assign({ info: inspect(x) }, o), live = [];
    for (const f of o.date ? [step] : FAMILIES) {
      const t = ctx.info.known >= f.minKnown ? f.tested(x, ctx) : 0;
      if (t > 0) live.push({ f, t });
    }
    const tested = live.reduce((s, e) => s + e.t, 0), scored = [], missed = [];
    for (const { f } of live) {
      for (const rule of f.fit(x, ctx).map((r, ix) => Object.assign(r, { ix, familyRef: f }))) {
        const sc = score(rule, x, ctx);
        if (!sc) continue;
        sc.adj = adjust(sc.log10p, tested * (o.cols || 1));
        if (sc.adj <= MAX_LOG10P) scored.push(sc); else if (sc.adj <= NEAR_LOG10P) missed.push(sc);
      }
    }
    if (!scored.length && !missed.length) return null;
    scored.sort((a, b) => a.adj - b.adj);
    missed.sort((a, b) => a.adj - b.adj);
    return { results: scored.map(s => present(s, x, ctx, tested)), misses: missed.slice(0, MISS_KEEP).map(s => present(s, x, ctx, tested)), size: x.length, fitted: ctx.info.fitN, tested };
  }

  function analyze(x, o) {
    const fit = results(x, o);
    if (!fit || !fit.results.length) return null;
    const sub = PAT.arrange(fit.results).subjects[0], best = sub.primary;
    best.rivals = sub.candidates.slice(0, 2); best.ambiguous = sub.ambiguous; best.size = fit.size; best.fitted = fit.fitted;
    best.all = fit.results.map(r => r === best ? Object.assign({}, best) : r);
    return best;
  }

  function fitAll(x, o) {
    const ctx = Object.assign({ info: inspect(x) }, o);
    return FAMILIES.flatMap(f => ctx.info.known >= f.minKnown ? f.fit(x, ctx) : []);
  }

  return { analyze, results, fitAll };
})();
