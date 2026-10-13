const SEQ = (() => {
  const R_MAX = 6, OFFSETS = 5, HORIZON = 5, BIG = 2n ** 40n, BM_WINDOW = 24;
  const babs = a => a < 0n ? -a : a;
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const Q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const ZERO = Q(0n), ONE = Q(1n);
  const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
  const qz = a => a.n === 0n;
  const qeq = (a, b) => a.n === b.n && a.d === b.d;
  const asQ = v => typeof v === 'bigint' ? Q(v) : v;
  const pow10 = k => 10n ** BigInt(k);

  function show(v, dec = 0) {
    const q = asQ(v), r = Q(q.n, q.d * pow10(dec)), neg = r.n < 0n, n = babs(r.n), sign = neg ? '-' : '';
    if (r.d === 1n) return sign + n;
    for (let k = 1; k <= 24; k++) {
      if (pow10(k) % r.d === 0n) {
        const digits = String(n * (pow10(k) / r.d)).padStart(k + 1, '0'), cut = digits.length - k;
        return sign + (digits.slice(0, cut) + '.' + digits.slice(cut)).replace(/0+$/, '').replace(/\.$/, '');
      }
    }
    return sign + n + '/' + r.d;
  }

  function parse(items) {
    const re = /^([-+]?)(\d+)(?:\.(\d+))?$/, parts = [];
    let d = 0;
    for (const it of items) {
      if (it === null) { parts.push(null); continue; }
      const s = String(it).trim().replace(/^−/, '-'), m = re.exec(s);
      if (!m || s.length > 60) return null;
      parts.push(m); if (m[3] && m[3].length > d) d = m[3].length;
    }
    if (d > 9) return null;
    const x = parts.map(m => m === null ? null : BigInt((m[1] === '-' ? '-' : '') + m[2] + (m[3] || '').padEnd(d, '0')));
    return { x, d, big: x.some(v => v !== null && babs(v) >= BIG), gaps: x.some(v => v === null) };
  }

  const diffsOf = (a, q) => { let cur = a; for (let i = 0; i < q; i++) { const p = cur; cur = new Array(p.length - 1); for (let j = 0; j < cur.length; j++) cur[j] = p[j + 1] - p[j]; } return cur; };
  function modeOf(arr) { const c = new Map(); let best = null, bc = 0; for (const v of arr) { const k = String(v), n = (c.get(k) || 0) + 1; c.set(k, n); if (n > bc) { bc = n; best = v; } } return best; }

  function extendPoly(x, q, c) {
    const rows = [x.slice()];
    for (let i = 1; i <= q; i++) rows.push(diffsOf(rows[i - 1], 1));
    let add = c;
    for (let i = q - 1; i >= 0; i--) add = rows[i][rows[i].length - 1] + add;
    return add;
  }

  function polyRule(x, q) {
    const n = x.length;
    if (n - q < 1) return null;
    const D = diffsOf(x, q), c = modeOf(D);
    if (c === null || c === 0n) return null;
    const hitsOn = list => { const Dq = diffsOf(list, q); let h = 0; for (let i = 0; i < Dq.length; i++) if (Dq[i] === c) h++; return h; };
    return {
      kind: 'poly' + q, params: q, rank: 1 + q, core: q <= 3, desc: dec => 'order-' + q + ' differences are constant (' + show(c, dec) + ')',
      trials: list => list.length - q, hitsOn,
      exceptions: list => { const Dq = diffsOf(list, q), out = []; for (let i = 0; i < Dq.length; i++) if (Dq[i] !== c) out.push({ i: i + q, expected: Q(list[i + q] - Dq[i] + c), found: list[i + q] }); return out; },
      next: (list, H) => { const out = [], cur = list.slice(); for (let t = 0; t < H; t++) { const v = extendPoly(cur, q, c); out.push(Q(v)); cur.push(v); } return out; },
      filled: () => []
    };
  }

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

  function recWords(c, x, dec) {
    const L = c.length, nz = c.map((v, i) => qz(v) ? 0 : i + 1).filter(Boolean);
    if (L >= 1 && nz.length === 1 && nz[0] === L && qeq(c[L - 1], ONE)) return { text: 'the same ' + L + ' number' + (L > 1 ? 's' : '') + ' repeat: ' + x.slice(0, L).map(v => show(v, dec)).join(', '), core: false, cycle: true };
    if (L === 1) return { text: '× ' + show(c[0]) + ' each row', core: true };
    if (L === 2 && qeq(c[0], Q(2n)) && qeq(c[1], Q(-1n))) return { text: 'steps by ' + show(x[1] - x[0], dec), core: true };
    if (L === 2 && qeq(c[0], ONE) && qeq(c[1], ONE)) return { text: 'each value is the sum of the previous two', core: true };
    if (c.every(v => qeq(v, ONE)) && L >= 3) return { text: 'each value is the sum of the previous ' + L, core: false };
    if (L === 2 && qeq(qadd(c[0], c[1]), ONE)) {
      const a = qsub(ZERO, c[1]), bq = qsub(Q(x[1]), qmul(a, Q(x[0])));
      if (!qz(a) && !qeq(a, ONE)) return { text: '× ' + show(a) + ', then ' + (bq.n < 0n ? '− ' : '+ ') + show(Q(babs(bq.n), bq.d), dec) + ' each row', core: false };
    }
    const back = k => k === 1 ? 'the previous value' : 'the value ' + k + ' back';
    const terms = c.map((v, i) => qz(v) ? null : { v, k: i + 1 }).filter(Boolean);
    const txt = terms.map((t, i) => { const neg = t.v.n < 0n, mag = Q(babs(t.v.n), t.v.d); return (i === 0 ? (neg ? '−' : '') : neg ? ' − ' : ' + ') + (qeq(mag, ONE) ? '' : show(mag) + ' × ') + back(t.k); }).join('');
    return { text: 'each value = ' + txt, core: false };
  }

  function recRule(x, L, c) {
    const D = c.reduce((a, v) => lcm(a, v.d), 1n), C = c.map(v => v.n * (D / v.d));
    const hitsOn = list => { let h = 0; for (let i = L; i < list.length; i++) { let s = 0n; for (let j = 0; j < L; j++) s += C[j] * list[i - 1 - j]; if (s === D * list[i]) h++; } return h; };
    const predict = (list, i) => { let s = 0n; for (let j = 0; j < L; j++) s += C[j] * list[i - 1 - j]; return Q(s, D); };
    const w = recWords(c, x, 0);
    return {
      kind: 'rec', params: L, rank: 4, core: w.core,
      desc: dec => recWords(c, x, dec).text,
      trials: list => list.length - L, hitsOn,
      exceptions: list => { const out = []; for (let i = L; i < list.length; i++) { const e = predict(list, i); if (!(e.d === 1n && e.n === list[i])) out.push({ i, expected: e, found: list[i] }); } return out; },
      next: (list, H) => { const ext = list.map(v => Q(v)), out = []; for (let t = 0; t < H; t++) { let s = ZERO; for (let j = 0; j < L; j++) s = qadd(s, qmul(c[j], ext[ext.length - 1 - j])); ext.push(s); out.push(s); } return out; },
      filled: () => []
    };
  }

  function rules(x, opts = {}) {
    const n = x.length, out = [];
    let tested = 0;
    if (n < 5) return { rules: out, tested };
    const keep = r => { if (r && (opts.big || !r.core)) out.push(r); };
    for (const q of [2, 3, 4, 5]) { if (q <= 3 && !opts.big) continue; tested++; keep(polyRule(x, q)); }
    const maxL = Math.min(R_MAX, Math.floor((n - 3) / 2));
    if (maxL >= 1) {
      tested += maxL;
      const fit = bm(x.slice(0, BM_WINDOW).map(v => Q(v)), maxL);
      if (fit && fit.L >= 1 && !(fit.L >= 3 && isPolyPattern(fit.c)) && !(fit.L === 1 && qeq(fit.c[0], ONE))) keep(recRule(x, fit.L, fit.c));
    }
    return { rules: out, tested };
  }

  function lagrange(pts, d) {
    const use = pts.slice(0, d + 1), xs = use.map(p => BigInt(p.i)), dd = use.map(p => Q(p.v));
    const coef = [dd[0]];
    for (let j = 1; j <= d; j++) { for (let i = d; i >= j; i--) dd[i] = qdiv(qsub(dd[i], dd[i - 1]), Q(xs[i] - xs[i - j])); coef.push(dd[j]); }
    return i => { let r = coef[d]; const bi = BigInt(i); for (let j = d - 1; j >= 0; j--) r = qadd(qmul(r, Q(bi - xs[j])), coef[j]); return r; };
  }

  const known = list => list.map((v, i) => v === null ? null : { i, v }).filter(Boolean);
  const indexRule = (kind, params, rank, desc, predictAt) => ({
    kind, params, rank, core: false, desc,
    trials: list => known(list).length,
    hitsOn: list => { let h = 0; list.forEach((v, i) => { if (v === null) return; const p = predictAt(i); if (p && p.d === 1n && p.n === v) h++; }); return h; },
    exceptions: list => { const out = []; list.forEach((v, i) => { if (v === null) return; const p = predictAt(i); if (!(p && p.d === 1n && p.n === v)) out.push({ i, expected: p, found: v }); }); return out; },
    next: (list, H) => { const out = []; for (let t = 0; t < H; t++) { const p = predictAt(list.length + t); if (!p) return []; out.push(p); } return out; },
    filled: list => list.map((v, i) => v === null ? { i, v: predictAt(i) } : null).filter(f => f && f.v)
  });

  function gapRules(x) {
    const kn = known(x), n = x.length, out = [];
    let tested = 0;
    if (kn.length < 5) return { rules: out, tested };
    for (let d = 1; d <= 5; d++) {
      tested++;
      if (kn.length < d + 4) continue;
      const P = lagrange(kn, d);
      let ok = 0; for (const p of kn) { const e = P(p.i); if (e.d === 1n && e.n === p.v) ok++; }
      if (ok / kn.length < .6) continue;
      out.push(indexRule('gappoly' + d, d + 1, d, () => 'a polynomial of degree ' + d + ' through the known numbers', i => P(i)));
    }
    for (let p = 1; p <= 4; p++) {
      tested++;
      const reps = [];
      for (let r = 0; r < p; r++) { const vals = kn.filter(k => k.i % p === r).map(k => k.v); reps.push(vals.length ? modeOf(vals) : null); }
      const used = reps.filter(v => v !== null).length;
      if (kn.length < used + 3) continue;
      out.push(indexRule('gapcycle' + p, used, 3, dec => 'the same ' + p + ' number' + (p > 1 ? 's' : '') + ' repeat: ' + reps.map(v => v === null ? '?' : show(v, dec)).join(', '), i => reps[i % p] === null ? null : Q(reps[i % p])));
    }
    return { rules: out, tested };
  }

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

  const LIB_MAX = 60;
  let libCache = null;
  const libTables = () => libCache || (libCache = LIB.map(([name, gen]) => [name, gen(LIB_MAX + OFFSETS + HORIZON)]));

  function library(x) {
    const kn = known(x), out = [], n = x.length;
    const tested = LIB.length * (OFFSETS + 1);
    if (kn.length < 7 || n > LIB_MAX) return { rules: out, tested: 0 };
    for (const [name, arr] of libTables()) {
      for (let o = 0; o <= OFFSETS; o++) {
        if (!kn.every(k => arr[o + k.i] === k.v)) continue;
        out.push(indexRule('lib', o > 0 ? 1 : 0, 6, () => name + (o ? ' starting from term ' + (o + 1) : ''), i => Q(arr[o + i])));
      }
    }
    return { rules: out, tested };
  }

  return { parse, rules, gapRules, library, show, Q };
})();
