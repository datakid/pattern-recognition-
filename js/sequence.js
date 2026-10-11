const SEQ = (() => {
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const Q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const ZERO = Q(0n), ONE = Q(1n);
  const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const div = (a, b) => Q(a.n * b.d, a.d * b.n);
  const neg = a => ({ n: -a.n, d: a.d });
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const isZero = a => a.n === 0n;
  const isInt = a => a.d === 1n;
  const qn = x => Q(BigInt(x));
  const powQ = (x, k) => { let r = ONE, b = x; while (k > 0) { if (k & 1) r = mul(r, b); b = mul(b, b); k = Math.floor(k / 2); } return r; };
  const toNum = x => Number(x.n) / Number(x.d);

  const fmtInt = n => {
    const neg = n < 0n, t = (neg ? -n : n).toString();
    if (t.length <= 21) return (neg ? '−' : '') + t;
    return (neg ? '−' : '') + t[0] + '.' + t.slice(1, 6) + 'e+' + (t.length - 1);
  };
  const fmtQ = x => {
    if (x.d === 1n) return fmtInt(x.n);
    let d = x.d, f2 = 0, f5 = 0;
    while (d % 2n === 0n) { d /= 2n; f2++; }
    while (d % 5n === 0n) { d /= 5n; f5++; }
    if (d === 1n && Math.max(f2, f5) <= 12) {
      const k = Math.max(f2, f5), sc = x.n * (10n ** BigInt(k)) / x.d, ng = sc < 0n;
      const s = (ng ? -sc : sc).toString().padStart(k + 1, '0');
      return (ng ? '−' : '') + s.slice(0, s.length - k) + '.' + s.slice(s.length - k);
    }
    return fmtInt(x.n) + '/' + fmtInt(x.d);
  };

  const lg = n => ((n < 0n ? -n : n) + 1n).toString(2).length - 1;
  const bInt = n => 2 * lg(n) + 2;
  const bQ = x => x.d === 1n ? bInt(x.n) : bInt(x.n) + bInt(x.d) + 1;
  const bSum = a => a.reduce((s, x) => s + bQ(x), 0);

  const NUMRE = /^([+-]?)(\d+(?:\.\d+)?|\.\d+)(?:e([+-]?\d+))?$/i;
  const FRACRE = /^([+-]?)(\d+)\/(\d+)$/;
  function parseTok(t) {
    let m = t.match(FRACRE);
    if (m) {
      if (/^0+$/.test(m[3]) || m[2].length > 60 || m[3].length > 60) return null;
      return Q(BigInt(m[2]) * (m[1] === '-' ? -1n : 1n), BigInt(m[3]));
    }
    m = t.match(NUMRE);
    if (!m) return null;
    const [ip, fp = ''] = m[2].split('.');
    const e = m[3] ? parseInt(m[3], 10) : 0;
    if (Math.abs(e) > 60 || fp.length > 60 || ip.length > 120) return null;
    let n = BigInt((ip || '0') + fp), d = 10n ** BigInt(fp.length);
    if (e >= 0) n *= 10n ** BigInt(e); else d *= 10n ** BigInt(-e);
    return Q(m[1] === '-' ? -n : n, d);
  }

  function parse(src) {
    const cleaned = (Array.isArray(src) ? src.join(' ') : src).replace(/[\u2212\u2012-\u2015]/g, '-').replace(/\u2026|\.{3,}/g, ' ').replace(/[\[\](){}"'`]/g, ' ');
    const toks = Array.isArray(src) ? src.map(t => t.replace(/[\u2212\u2012-\u2015]/g, '-')) : cleaned.split(/[\s,;|]+/).filter(Boolean);
    if (!toks.length) return { error: 'Enter some numbers.' };
    if (toks.length > 200) return { error: 'Up to 200 numbers are supported.' };
    const terms = [];
    for (const t of toks) {
      if (/^(\?+|_+|x|\*+)$/i.test(t)) { terms.push(null); continue; }
      const v = parseTok(t);
      if (!v) return { error: 'Cannot read “' + t.slice(0, 20) + '” as a number. Use ? for a missing term.' };
      terms.push(v);
    }
    while (terms.length && terms[terms.length - 1] === null) terms.pop();
    if (!terms.length || terms[0] === null) return { error: 'Start with a known number. A ? works in the middle or at the end.' };
    const known = [];
    terms.forEach((v, i) => { if (v) known.push({ i, v }); });
    if (known.length < 4) return { error: 'Enter at least 4 numbers. A rule needs a few terms to be tested.' };
    return { terms, known };
  }

  function solve(A, b) {
    const n = A.length, M = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      while (p < n && isZero(M[p][c])) p++;
      if (p === n) return null;
      [M[c], M[p]] = [M[p], M[c]];
      const inv = div(ONE, M[c][c]);
      M[c] = M[c].map(x => mul(x, inv));
      for (let r = 0; r < n; r++) {
        if (r !== c && !isZero(M[r][c])) { const f = M[r][c]; M[r] = M[r].map((x, j) => sub(x, mul(f, M[c][j]))); }
      }
    }
    return M.map(r => r[n]);
  }

  const horner = (c, x) => { let r = ZERO; for (let j = c.length - 1; j >= 0; j--) r = add(mul(r, x), c[j]); return r; };

  function polyFit(pts, d) {
    if (pts.length < d + 1) return null;
    const use = pts.slice(0, d + 1);
    const A = use.map(p => {
      const x = qn(p.i + 1), row = [];
      let w = ONE;
      for (let j = 0; j <= d; j++) { row.push(w); w = mul(w, x); }
      return row;
    });
    const c = solve(A, use.map(p => p.v));
    if (!c) return null;
    for (const p of pts) if (!eq(horner(c, qn(p.i + 1)), p.v)) return null;
    return c;
  }

  const SUP = ['', '', '²', '³', '⁴', '⁵', '⁶'];
  const POLYN = ['', '', 'Quadratic', 'Cubic', 'Quartic', 'Quintic'];
  function polyStr(c) {
    let D = 1n;
    c.forEach(x => { D = D * x.d / gcd(D, x.d); });
    const z = c.map(x => x.n * (D / x.d)), parts = [];
    for (let j = z.length - 1; j >= 0; j--) {
      const k = z[j];
      if (k === 0n) continue;
      const a = k < 0n ? -k : k, v = j === 0 ? '' : j === 1 ? 'n' : 'n' + SUP[j];
      parts.push([k < 0n, j === 0 ? a.toString() : (a === 1n ? '' : a.toString()) + v]);
    }
    if (!parts.length) return '0';
    const s = parts.map(([ng, b], i) => (i === 0 ? (ng ? '−' : '') : ng ? ' − ' : ' + ') + b).join('');
    if (D === 1n) return s;
    return (parts.length === 1 ? s : '(' + s + ')') + '/' + D;
  }

  function iroot(n, k) {
    if (n < 2n) return n;
    const K = BigInt(k);
    let lo = 1n, hi = 1n << BigInt(Math.ceil(n.toString(2).length / k) + 1);
    while (lo < hi) { const mid = (lo + hi + 1n) >> 1n; if (mid ** K <= n) lo = mid; else hi = mid - 1n; }
    return lo;
  }
  function rootQ(q, k) {
    let s = 1n;
    if (q.n < 0n) { if (k % 2 === 0) return null; s = -1n; }
    const an = q.n < 0n ? -q.n : q.n, K = BigInt(k), rn = iroot(an, k), rd = iroot(q.d, k);
    if (rn ** K !== an || rd ** K !== q.d) return null;
    return Q(s * rn, rd);
  }

  const seqFrom = at => m => Array.from({ length: m }, (_, i) => at(i));

  function polyRule(c) {
    const d = c.length - 1, at = i => horner(c, qn(i + 1)), gen = seqFrom(at);
    if (d === 0) return { kind: 'const', name: 'Constant', formula: 'a(n) = ' + fmtQ(c[0]), words: 'Every term is ' + fmtQ(c[0]), params: 1, bits: 2 + bSum(c), at, gen, c };
    if (d === 1) {
      const a1 = add(c[0], c[1]);
      return { kind: 'arith', name: 'Arithmetic', formula: 'a(n) = ' + polyStr(c), words: 'Start at ' + fmtQ(a1) + ', then ' + (c[1].n < 0n ? 'subtract ' + fmtQ(neg(c[1])) : 'add ' + fmtQ(c[1])) + ' each time', params: 2, bits: 3 + bSum([a1, c[1]]), at, gen, c };
    }
    let f = 1n;
    for (let k = 2n; k <= BigInt(d); k++) f *= k;
    return { kind: 'poly', name: POLYN[d] || 'Polynomial', formula: 'a(n) = ' + polyStr(c), words: 'Differences settle after ' + d + ' levels: the level-' + d + ' difference is always ' + fmtQ(mul(c[d], Q(f))), params: d + 1, bits: 4 + 2 * d + bSum(c), at, gen, c };
  }

  function geomRule(a1, r) {
    const rs = isInt(r) && r.n >= 0n ? fmtQ(r) : '(' + fmtQ(r) + ')';
    const at = i => mul(a1, powQ(r, i));
    return { kind: 'geom', name: 'Geometric', formula: 'a(n) = ' + (eq(a1, ONE) ? '' : fmtQ(a1) + ' · ') + rs + '^(n−1)', words: 'Start at ' + fmtQ(a1) + ', then multiply by ' + fmtQ(r) + ' each time', params: 2, bits: 4 + bSum([a1, r]), at, gen: m => { const o = []; let x = a1; for (let i = 0; i < m; i++) { o.push(x); x = mul(x, r); } return o; }, a1, r };
  }

  function geomFit(pts) {
    if (pts.length < 2 || pts[0].i !== 0 || isZero(pts[0].v)) return null;
    const q = div(pts[1].v, pts[0].v), r = rootQ(q, pts[1].i);
    if (!r || isZero(r) || eq(r, ONE)) return null;
    for (const p of pts) if (!eq(mul(pts[0].v, powQ(r, p.i)), p.v)) return null;
    return geomRule(pts[0].v, r);
  }

  function polyBest(pts, maxD) {
    for (let d = 0; d <= Math.min(maxD, pts.length - 1); d++) {
      const c = polyFit(pts, d);
      if (c) return polyRule(c);
    }
    return null;
  }

  function cycleFit(pts) {
    for (let T = 2; T <= Math.min(12, Math.floor(pts.length / 2)); T++) {
      const cls = new Array(T).fill(null);
      let ok = true;
      for (const p of pts) {
        const c = p.i % T;
        if (cls[c] && !eq(cls[c], p.v)) { ok = false; break; }
        cls[c] = p.v;
      }
      if (!ok || cls.some(x => !x) || cls.every(x => eq(x, cls[0]))) continue;
      const at = i => cls[i % T];
      return { kind: 'cycle', name: 'Repeating cycle', formula: 'repeats ' + cls.map(fmtQ).join(', '), words: 'The same ' + T + ' numbers repeat: ' + cls.map(fmtQ).join(', '), params: T, bits: 4 + T + bSum(cls), at, gen: seqFrom(at) };
    }
    return null;
  }

  function bm(s) {
    let C = [ONE], B = [ONE], L = 0, m = 1, b = ONE;
    for (let n = 0; n < s.length; n++) {
      let d = s[n];
      for (let i = 1; i <= L; i++) if (C[i]) d = add(d, mul(C[i], s[n - i]));
      if (isZero(d)) { m++; continue; }
      const T = C.slice(), f = div(d, b);
      while (C.length < B.length + m) C.push(ZERO);
      for (let i = 0; i < B.length; i++) C[i + m] = sub(C[i + m], mul(f, B[i]));
      if (2 * L <= n) { L = n + 1 - L; B = T; b = d; m = 1; } else m++;
    }
    while (C.length < L + 1) C.push(ZERO);
    return { L, c: C.slice(1, L + 1).map(neg) };
  }

  const joinTerms = parts => parts.map(([ng, t], i) => (i === 0 ? (ng ? '−' : '') : ng ? ' − ' : ' + ') + t).join('');
  const coStr = x => eq(x, ONE) ? '' : isInt(x) ? fmtQ(x) : '(' + fmtQ(x) + ')·';

  function recRule(P, L, c) {
    const seeds = P.slice(0, L), parts = [];
    c.forEach((x, j) => {
      if (isZero(x)) return;
      const ng = x.n < 0n;
      parts.push([ng, coStr(ng ? neg(x) : x) + 'a(n−' + (j + 1) + ')']);
    });
    if (!parts.length) return null;
    const gen = m => {
      const r = seeds.slice(0, m);
      while (r.length < m) { let s = ZERO; for (let j = 0; j < L; j++) s = add(s, mul(c[j], r[r.length - 1 - j])); r.push(s); }
      return r;
    };
    const ones = c.every(x => eq(x, ONE)), st = ', starting ' + seeds.map(fmtQ).join(', ');
    return { kind: 'rec', name: ones && L === 2 ? 'Fibonacci-type' : 'Linear recurrence', formula: 'a(n) = ' + joinTerms(parts), words: (ones ? 'Each term is the sum of the ' + (L === 2 ? 'two' : L) + ' before it' : 'Each term is a fixed mix of the previous ' + L + ' terms') + st, params: 2 * L, bits: 5 + 3 * L + bSum(c) + bSum(seeds), gen };
  }

  function affineRule(P) {
    if (P.length < 4) return null;
    const d1 = sub(P[1], P[0]);
    if (isZero(d1)) return null;
    const r = div(sub(P[2], P[1]), d1), c = sub(P[1], mul(r, P[0]));
    if (isZero(c) || isZero(r) || eq(r, ONE)) return null;
    for (let i = 1; i < P.length; i++) if (!eq(P[i], add(mul(r, P[i - 1]), c))) return null;
    const gen = m => { const o = [P[0]]; while (o.length < m) o.push(add(mul(r, o[o.length - 1]), c)); return o; };
    return { kind: 'affine', name: 'Multiply, then add', formula: 'a(n) = ' + coStr(r) + 'a(n−1) ' + (c.n < 0n ? '− ' + fmtQ(neg(c)) : '+ ' + fmtQ(c)), words: 'Start at ' + fmtQ(P[0]) + ', multiply by ' + fmtQ(r) + ', then ' + (c.n < 0n ? 'subtract ' + fmtQ(neg(c)) : 'add ' + fmtQ(c)) + ', every step', params: 3, bits: 6 + bSum([P[0], r, c]), gen };
  }

  const linStr = (al, be) => {
    const a = eq(al, ONE) ? 'n' : eq(al, qn(-1)) ? '−n' : coStr(al).replace(/·$/, '') + 'n';
    return isZero(be) ? a : a + (be.n < 0n ? ' − ' + fmtQ(neg(be)) : ' + ' + fmtQ(be));
  };

  function precRule(P) {
    if (P.length < 4) return null;
    const rho = [];
    for (let n = 1; n < P.length; n++) { if (isZero(P[n - 1])) return null; rho.push(div(P[n], P[n - 1])); }
    const al = sub(rho[1], rho[0]);
    if (isZero(al)) return null;
    const be = sub(rho[0], al);
    for (let k = 0; k < rho.length; k++) if (!eq(rho[k], add(mul(al, qn(k + 1)), be))) return null;
    const b1 = sub(be, al), lin = linStr(al, b1);
    const gen = m => { const o = [P[0]]; while (o.length < m) o.push(mul(o[o.length - 1], add(mul(al, qn(o.length)), be))); return o; };
    return { kind: 'prec', name: 'Growing multiplier', formula: 'a(n) = ' + (/ /.test(lin) ? '(' + lin + ')' : lin) + ' · a(n−1)', words: 'Each term is the previous one times a number that grows by ' + fmtQ(al) + ' every step', params: 3, bits: 7 + bSum([P[0], al, b1]), gen };
  }

  function sqRule(P) {
    if (P.length < 4) return null;
    for (const k of [2, 3]) {
      const c = sub(P[1], powQ(P[0], k));
      let ok = true;
      for (let i = 1; i < P.length && ok; i++) ok = eq(P[i], add(powQ(P[i - 1], k), c));
      if (!ok || (isZero(c) && (eq(P[0], ONE) || isZero(P[0])))) continue;
      const gen = m => {
        const o = [P[0]];
        while (o.length < m) {
          const x = add(powQ(o[o.length - 1], k), c);
          if ((x.n < 0n ? -x.n : x.n) >> 40000n > 0n) break;
          o.push(x);
        }
        return o;
      };
      return { kind: 'power', name: k === 2 ? 'Square the previous term' : 'Cube the previous term', formula: 'a(n) = a(n−1)' + SUP[k] + (isZero(c) ? '' : c.n < 0n ? ' − ' + fmtQ(neg(c)) : ' + ' + fmtQ(c)), words: 'Start at ' + fmtQ(P[0]) + ', then ' + (k === 2 ? 'square' : 'cube') + ' the previous term' + (isZero(c) ? '' : c.n < 0n ? ' and subtract ' + fmtQ(neg(c)) : ' and add ' + fmtQ(c)) + ' each time', params: 2, bits: 8 + bSum([P[0], c]), gen };
    }
    return null;
  }

  const OFFN = k => k === 2 ? ['odd-numbered terms', 'even-numbered terms'] : ['1st, 4th, 7th… terms', '2nd, 5th, 8th… terms', '3rd, 6th, 9th… terms'];
  function interRules(ctx) {
    const out = [];
    for (const k of [2, 3]) {
      const subs = [];
      for (let r = 0; r < k; r++) {
        const pts = ctx.known.filter(p => p.i % k === r).map(p => ({ i: Math.floor(p.i / k), v: p.v }));
        if (pts.length < 3 || pts[0].i !== 0) break;
        const c = [polyBest(pts, 2), geomFit(pts)].filter(Boolean).sort((a, b) => a.bits - b.bits);
        if (!c.length) break;
        subs.push(c[0]);
      }
      if (subs.length < k) continue;
      const at = i => subs[i % k].at(Math.floor(i / k)), lab = OFFN(k);
      out.push({ kind: 'inter', name: 'Interleaved sequences', formula: subs.map((s, i) => lab[i] + ': ' + s.formula).join(' · '), words: k + ' sequences take turns: ' + subs.map((s, i) => lab[i] + ' ' + s.words.charAt(0).toLowerCase() + s.words.slice(1)).join('; '), params: subs.reduce((t, s) => t + s.params, 0), bits: 4 + subs.reduce((t, s) => t + s.bits, 0), at, gen: seqFrom(at) });
    }
    return out;
  }

  const opStr = o => o.t === '+' ? (o.c.n < 0n ? '−' + fmtQ(neg(o.c)) : '+' + fmtQ(o.c)) : '×' + fmtQ(o.c);
  const opWords = o => o.t === '+' ? (o.c.n < 0n ? 'subtract ' + fmtQ(neg(o.c)) : 'add ' + fmtQ(o.c)) : 'multiply by ' + fmtQ(o.c);
  const cart = L => L.reduce((a, o) => a.flatMap(x => o.map(y => [...x, y])), [[]]);
  function opRules(ctx) {
    const P = ctx.P, out = [];
    if (P.length < 5) return out;
    for (const q of [2, 3]) {
      const opts = [];
      for (let j = 0; j < q; j++) {
        const pairs = [];
        for (let n = j; n + 1 < P.length; n += q) pairs.push([P[n], P[n + 1]]);
        if (pairs.length < 2) break;
        const o = [], dd = sub(pairs[0][1], pairs[0][0]);
        if (pairs.every(([x, y]) => eq(sub(y, x), dd))) o.push({ t: '+', c: dd });
        if (!isZero(pairs[0][0])) {
          const rr = div(pairs[0][1], pairs[0][0]);
          if (!isZero(rr) && pairs.every(([x, y]) => !isZero(x) && eq(div(y, x), rr))) o.push({ t: '×', c: rr });
        }
        if (!o.length) break;
        opts.push(o);
      }
      if (opts.length < q) continue;
      for (const combo of cart(opts)) {
        if (combo.every(o => o.t === combo[0].t && eq(o.c, combo[0].c))) continue;
        const gen = m => { const r = [P[0]]; for (let n = 0; r.length < m; n++) { const o = combo[n % q]; r.push(o.t === '+' ? add(r[n], o.c) : mul(r[n], o.c)); } return r; };
        out.push({ kind: 'ops', name: 'Alternating operations', formula: 'repeat: ' + combo.map(opStr).join(', '), words: 'Start at ' + fmtQ(P[0]) + ', then repeat: ' + combo.map(opWords).join(', then '), params: q + 1, bits: 6 + q + bQ(P[0]) + combo.reduce((t, o) => t + 1 + bQ(o.c), 0), gen });
      }
    }
    return out;
  }

  const gp = f => m => Array.from({ length: m }, (_, i) => f(BigInt(i)));
  const gi = f => m => Array.from({ length: m }, (_, i) => f(i + 1));
  const lin = (seed, co) => m => {
    const r = seed.slice(0, m);
    while (r.length < m) { let s = 0n; co.forEach((c, j) => { s += c * r[r.length - 1 - j]; }); r.push(s); }
    return r;
  };
  const stepG = (first, next) => m => { const r = [first]; while (r.length < m) r.push(next(r, r.length)); return r.slice(0, m); };
  const primesG = m => {
    const r = [];
    for (let x = 2n; r.length < m; x++) {
      let ok = true;
      for (const p of r) { if (p * p > x) break; if (x % p === 0n) { ok = false; break; } }
      if (ok) r.push(x);
    }
    return r;
  };
  const compG = m => {
    const r = [];
    for (let x = 4; r.length < m; x++) { for (let d = 2; d * d <= x; d++) if (x % d === 0) { r.push(BigInt(x)); break; } }
    return r;
  };
  const dCount = n => { let c = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) c += d * d === n ? 1 : 2; return BigInt(c); };
  const sigma = n => { let s = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) s += d * d === n ? d : d + n / d; return BigInt(s); };
  const phi = n => { let r = n, x = n; for (let p = 2; p * p <= x; p++) if (x % p === 0) { while (x % p === 0) x /= p; r -= r / p; } if (x > 1) r -= r / x; return BigInt(r); };
  const pop = i => { let c = 0; while (i) { c += i & 1; i = Math.floor(i / 2); } return c; };
  const bellG = m => {
    const r = [1n];
    let row = [1n];
    while (r.length < m) { const nr = [row[row.length - 1]]; for (const x of row) nr.push(nr[nr.length - 1] + x); r.push(nr[0]); row = nr; }
    return r.slice(0, m);
  };
  const partG = m => {
    const p = [1n];
    for (let n = 1; n < m; n++) {
      let s = 0n;
      for (let k = 1; ; k++) {
        const a = k * (3 * k - 1) / 2, b = k * (3 * k + 1) / 2;
        if (a > n) break;
        const sg = k % 2 ? 1n : -1n;
        s += sg * p[n - a];
        if (b <= n) s += sg * p[n - b];
      }
      p.push(s);
    }
    return p.slice(0, m);
  };
  const recG = m => {
    const r = [0n], seen = new Set([0n]);
    for (let n = 1; r.length < m; n++) { const b = r[n - 1] - BigInt(n), v = b > 0n && !seen.has(b) ? b : r[n - 1] + BigInt(n); r.push(v); seen.add(v); }
    return r;
  };
  const golG = m => { const a = [0, 1]; for (let n = 2; n <= m; n++) a.push(1 + a[n - a[a[n - 1]]]); return a.slice(1, m + 1).map(BigInt); };
  const digG = D => m => D.slice(0, m).split('').map(BigInt);
  const S = sym => A => sym + '(' + A(0) + ')';
  const E = (name, base, o, f, g, max) => ({ name, base, o, f, g, max });
  const LIB = [
    E('Square numbers', 5, 0, (A, W) => W(A(0)) + '²', gp(i => i * i)),
    E('Cube numbers', 6, 0, (A, W) => W(A(0)) + '³', gp(i => i ** 3n)),
    E('Fourth powers', 8, 0, (A, W) => W(A(0)) + '⁴', gp(i => i ** 4n)),
    E('Fifth powers', 9, 0, (A, W) => W(A(0)) + '⁵', gp(i => i ** 5n)),
    E('Triangular numbers', 6, 0, (A, W) => W(A(0)) + W(A(1)) + '/2', gp(i => i * (i + 1n) / 2n)),
    E('Tetrahedral numbers', 8, 0, (A, W) => W(A(0)) + W(A(1)) + W(A(2)) + '/6', gp(i => i * (i + 1n) * (i + 2n) / 6n)),
    E('Pentagonal numbers', 8, 0, (A, W) => W(A(0)) + '(3' + W(A(0)) + '−1)/2', gp(i => i * (3n * i - 1n) / 2n)),
    E('Hexagonal numbers', 8, 0, (A, W) => W(A(0)) + '(2' + W(A(0)) + '−1)', gp(i => i * (2n * i - 1n))),
    E('Pronic numbers', 8, 0, (A, W) => W(A(0)) + W(A(1)), gp(i => i * (i + 1n))),
    E('Square pyramidal numbers', 9, 0, (A, W) => W(A(0)) + W(A(1)) + '(2' + W(A(0)) + '+1)/6', gp(i => i * (i + 1n) * (2n * i + 1n) / 6n)),
    E('Centered hexagonal numbers', 10, 0, (A, W) => '3' + W(A(0)) + W(A(1)) + '+1', gp(i => 3n * i * (i + 1n) + 1n)),
    E('Lazy caterer numbers', 11, 0, (A, W) => '(' + W(A(0)) + '²+' + A(0) + '+2)/2', gp(i => (i * i + i + 2n) / 2n)),
    E('Powers of 2', 4, 0, (A, W) => '2^' + W(A(0)), gp(i => 2n ** i)),
    E('Mersenne numbers', 8, 0, (A, W) => '2^' + W(A(0)) + ' − 1', gp(i => 2n ** i - 1n)),
    E('Fibonacci numbers', 5, 0, S('F'), lin([0n, 1n], [1n, 1n])),
    E('Lucas numbers', 8, 0, S('L'), lin([2n, 1n], [1n, 1n])),
    E('Pell numbers', 9, 0, S('P'), lin([0n, 1n], [2n, 1n])),
    E('Jacobsthal numbers', 10, 0, S('J'), lin([0n, 1n], [1n, 2n])),
    E('Padovan numbers', 11, 0, S('Pad'), lin([1n, 1n, 1n], [0n, 1n, 1n])),
    E('Perrin numbers', 12, 0, S('Per'), lin([3n, 0n, 2n], [0n, 1n, 1n])),
    E('Tribonacci numbers', 9, 0, S('Trib'), lin([0n, 0n, 1n], [1n, 1n, 1n])),
    E('Tetranacci numbers', 11, 0, S('Tet'), lin([0n, 0n, 0n, 1n], [1n, 1n, 1n, 1n])),
    E('Catalan numbers', 8, 0, S('Cat'), stepG(1n, (r, n) => r[n - 1] * 2n * (2n * BigInt(n) - 1n) / (BigInt(n) + 1n))),
    E('Bell numbers', 9, 0, S('B'), bellG),
    E('Motzkin numbers', 11, 0, S('M'), stepG(1n, (r, n) => n === 1 ? 1n : (BigInt(2 * n + 1) * r[n - 1] + BigInt(3 * n - 3) * r[n - 2]) / BigInt(n + 2))),
    E('Factorials', 5, 0, (A, W) => W(A(0)) + '!', stepG(1n, (r, n) => r[n - 1] * BigInt(n))),
    E('Double factorials', 8, 0, (A, W) => W(A(0)) + '!!', stepG(1n, (r, n) => n === 1 ? 1n : r[n - 2] * BigInt(n))),
    E('Derangements', 10, 0, S('D'), stepG(1n, (r, n) => n === 1 ? 0n : BigInt(n - 1) * (r[n - 1] + r[n - 2]))),
    E('Central binomial coefficients', 9, 0, S('C2'), stepG(1n, (r, n) => r[n - 1] * 2n * BigInt(2 * n - 1) / BigInt(n))),
    E('Primorials', 9, 0, S('p#'), m => { const p = primesG(m), r = [1n]; while (r.length < m) r.push(r[r.length - 1] * p[r.length - 1]); return r; }),
    E('Prime numbers', 5, 1, S('p'), primesG),
    E('Composite numbers', 7, 1, S('c'), compG),
    E('Fermat numbers', 9, 0, S('Fm'), gp(i => 2n ** (2n ** i) + 1n), 12),
    E('Sylvester sequence', 11, 0, S('Syl'), stepG(2n, r => r[r.length - 1] ** 2n - r[r.length - 1] + 1n), 12),
    E('Number of divisors', 9, 1, S('d'), gi(dCount)),
    E('Sum of divisors', 10, 1, S('σ'), gi(sigma)),
    E('Euler totient', 10, 1, S('φ'), gi(phi)),
    E('Perfect numbers', 10, 1, S('Perf'), m => [6n, 28n, 496n, 8128n, 33550336n, 8589869056n, 137438691328n, 2305843008139952128n].slice(0, m), 8),
    E('Partition numbers', 9, 0, S('p'), partG),
    E('Moser circle regions', 12, 1, S('R'), gi(n => { const k = BigInt(n); return k * (k - 1n) * (k - 2n) * (k - 3n) / 24n + k * (k - 1n) / 2n + 1n; })),
    E('Cake numbers', 12, 0, S('Cake'), gp(i => (i ** 3n + 5n * i + 6n) / 6n)),
    E('Recamán sequence', 11, 0, S('R'), recG),
    E('Golomb sequence', 12, 1, S('G'), golG),
    E('Thue–Morse sequence', 10, 0, S('t'), gp(i => BigInt(pop(Number(i)) % 2))),
    E('Binary weights', 11, 0, S('w'), gp(i => BigInt(pop(Number(i))))),
    E('Digits of π', 9, 1, S('π'), digG('314159265358979323846264338327950288'), 36),
    E('Digits of e', 10, 1, S('e'), digG('271828182845904523536028747135266249'), 36),
    E('Digits of √2', 10, 1, S('√2'), digG('141421356237309504880168872420969807'), 36),
    E('n to the power n', 8, 1, (A, W) => W(A(0)) + '^' + W(A(0)), gi(n => BigInt(n) ** BigInt(n)), 40),
    E('Concatenation 1..n', 10, 1, S('Cc'), m => { const r = []; let s = ''; for (let i = 1; i <= m; i++) { s += i; r.push(BigInt(s)); } return r; }, 25),
    E('Reverse concatenation', 11, 1, S('Rc'), m => { const r = []; let s = ''; for (let i = 1; i <= m; i++) { s = i + s; r.push(BigInt(s)); } return r; }, 25),
    E('n repeated n times', 11, 1, S('Rp'), gi(n => BigInt(String(n).repeat(n))), 25)
  ];

  const MAXS = 12;
  const natural = (s, o) => o === 0 ? s <= 1 : s === 0;
  function libRules(ctx) {
    const out = [];
    if (ctx.known.length < 4 || ctx.known.some(p => !isInt(p.v))) return out;
    const need = ctx.N + 12 + MAXS;
    for (const e of LIB) {
      const L = e.g(Math.min(need, e.max || need));
      for (let s = 0; s <= MAXS; s++) {
        const li = [];
        let ok = true;
        for (const p of ctx.known) { const x = L[s + p.i]; if (x === undefined) { ok = false; break; } li.push(x); }
        if (!ok) continue;
        let j = 1;
        while (j < li.length && li[j] === li[0]) j++;
        if (j === li.length) continue;
        const a = div(sub(ctx.known[j].v, ctx.known[0].v), Q(li[j] - li[0])), b = sub(ctx.known[0].v, mul(a, Q(li[0])));
        if (isZero(a)) continue;
        if (!ctx.known.every((p, i) => eq(add(mul(a, Q(li[i])), b), p.v))) continue;
        const tr = !(eq(a, ONE) && isZero(b));
        if (tr && bQ(a) + bQ(b) > 14) continue;
        const c = s + e.o - 1, sh = !natural(s, e.o);
        const A = k => { const v = c + k; return v === 0 ? 'n' : v > 0 ? 'n+' + v : 'n−' + (-v); };
        const W = x => /[+−]/.test(x) ? '(' + x + ')' : x;
        let core = e.f(A, W);
        if (tr) {
          if (/[\s/+−]/.test(core)) core = '(' + core + ')';
          core = (eq(a, ONE) ? '' : fmtQ(a) + '·') + core + (isZero(b) ? '' : b.n < 0n ? ' − ' + fmtQ(neg(b)) : ' + ' + fmtQ(b));
        }
        out.push({ kind: 'lib', lib: true, name: e.name + (tr ? ' (adjusted)' : ''), formula: 'a(n) = ' + core, words: e.name + (tr ? ', ' + [eq(a, ONE) ? '' : 'scaled by ' + fmtQ(a), isZero(b) ? '' : 'shifted by ' + fmtQ(b)].filter(Boolean).join(' and ') : '') + (sh ? ', starting at term ' + (s + e.o) : ''), params: 2 + (sh ? 1 : 0) + (tr ? 2 : 0), bits: e.base + (sh ? 3 + bInt(BigInt(s)) : 0) + (tr ? 4 + bQ(a) + bQ(b) : 0), gen: m => L.slice(s, s + m).map(x => add(mul(a, Q(x)), b)) });
      }
    }
    return out;
  }

  const polyD = ctx => { const r = polyBest(ctx.known, 5); return r ? [r] : []; };
  const geomD = ctx => { const r = geomFit(ctx.known); return r ? [r] : []; };
  const cycleD = ctx => { const r = cycleFit(ctx.known); return r ? [r] : []; };
  const bmD = ctx => {
    const P = ctx.P.slice(0, 40);
    if (P.length < 4) return [];
    const { L, c } = bm(P);
    if (L < 2 || 2 * L > P.length) return [];
    const r = recRule(P, L, c);
    return r ? [r] : [];
  };
  const affD = ctx => { const r = affineRule(ctx.P); return r ? [r] : []; };
  const precD = ctx => { const r = precRule(ctx.P); return r ? [r] : []; };
  const sqD = ctx => { const r = sqRule(ctx.P); return r ? [r] : []; };
  const INNER = [polyD, geomD, cycleD, libRules, bmD, precD];

  function opsD(ctx) {
    const P = ctx.P, out = [];
    if (P.length < 5) return out;
    const mk = (vals, kind) => {
      const pts = vals.map((v, i) => ({ i, v })), c2 = { known: pts, P: vals, N: vals.length, terms: vals };
      for (const det of INNER) {
        let rs;
        try { rs = det(c2); } catch (e) { rs = []; }
        for (const inner of rs) {
          const dn = kind === 'diff' ? 'd' : 'q';
          const gen = m => {
            const g = inner.gen(m - 1), o = [P[0]];
            let x = P[0];
            for (const d of g) { x = kind === 'diff' ? add(x, d) : mul(x, d); o.push(x); }
            return o;
          };
          const what = inner.lib ? inner.name.charAt(0).toLowerCase() + inner.name.slice(1) : inner.words.charAt(0).toLowerCase() + inner.words.slice(1);
          out.push({ kind: 'op-' + kind, name: kind === 'diff' ? 'Running total' : 'Running product', formula: (kind === 'diff' ? 'a(n+1) = a(n) + d(n)' : 'a(n+1) = a(n) · q(n)') + ', where ' + inner.formula.replace(/a\(n/g, dn + '(n'), words: 'Start at ' + fmtQ(P[0]) + '; each ' + (kind === 'diff' ? 'step added' : 'factor applied') + ' follows: ' + what, params: inner.params + 1, bits: 4 + bQ(P[0]) + inner.bits, gen, aka: inner.lib ? [inner.name] : [] });
        }
      }
    };
    mk(P.slice(1).map((x, i) => sub(x, P[i])), 'diff');
    if (P.slice(0, -1).every(x => !isZero(x))) mk(P.slice(1).map((x, i) => div(x, P[i])), 'quot');
    return out;
  }

  const DETECT = [polyD, geomD, cycleD, bmD, affD, precD, sqD, interRules, opRules, libRules, opsD];

  function settle(rule, ctx) {
    let g;
    try { g = rule.gen(ctx.N + 12); } catch (e) { return null; }
    if (!g || g.length < ctx.N) return null;
    for (const p of ctx.known) if (!g[p.i] || !eq(g[p.i], p.v)) return null;
    rule.seq = g;
    rule.evidence = ctx.known.length - rule.params;
    rule.aka = rule.aka || [];
    return rule;
  }

  function rank(rules, ctx) {
    const live = rules.filter(r => r.evidence >= 1);
    if (!live.length) return { live, groups: [], z0: 1 };
    const mx = Math.max(-ctx.dataBits, ...live.map(r => -r.bits));
    const w = r => Math.pow(2, -r.bits - mx);
    const w0 = Math.pow(2, -ctx.dataBits - mx);
    const groups = new Map();
    live.forEach(r => {
      const nx = r.seq[ctx.N];
      if (!nx) return;
      const key = fmtQ(nx), g = groups.get(key) || { v: nx, mass: 0, rule: r };
      g.mass += w(r);
      if (r.bits < g.rule.bits) g.rule = r;
      groups.set(key, g);
    });
    const Z = [...groups.values()].reduce((s, g) => s + g.mass, 0) + w0;
    const out = [...groups.values()].map(g => ({ ...g, share: g.mass / Z })).sort((a, b) => b.mass - a.mass);
    return { live, groups: out, z0: w0 / Z };
  }

  function analyze(src, H = 5) {
    const pr = parse(src);
    if (pr.error) return { error: pr.error };
    const { terms, known } = pr, N = terms.length, P = [];
    for (const t of terms) { if (!t) break; P.push(t); }
    const ctx = { terms, N, known, P, H, dataBits: bSum(known.map(k => k.v)) };
    const found = new Map();
    for (const det of DETECT) {
      let rs;
      try { rs = det(ctx); } catch (e) { rs = []; }
      for (const r0 of rs) {
        const r = settle(r0, ctx);
        if (!r) continue;
        const sig = r.seq.slice(0, N + 12).map(fmtQ).join(','), prev = found.get(sig);
        if (!prev) { found.set(sig, r); continue; }
        const keep = r.bits < prev.bits ? r : prev, drop = keep === r ? prev : r;
        keep.aka = [...new Set([...(keep.aka || []), ...(drop.aka || []), ...(drop.lib && drop.name !== keep.name ? [drop.name] : [])])];
        keep.evidence = Math.max(keep.evidence, drop.evidence);
        found.set(sig, keep);
      }
    }
    const rk = rank([...found.values()], ctx);
    rk.live.forEach(r => { r.aka = (r.aka || []).filter(n => n !== r.name && !/\(adjusted\)/.test(n) && r.name.indexOf(n) !== 0); });
    const top = rk.groups.length ? rk.groups[0].rule : null;
    const share = rk.groups.length ? rk.groups[0].share : 0;
    const ev = top ? top.evidence : 0;
    let label = 'No pattern';
    if (top && ev >= 2) label = share < .5 ? 'Ambiguous' : ev >= 3 && share >= .75 ? 'Verified' : 'Plausible';
    const conf = top && ev >= 2 ? Math.min(.9, share * (1 - Math.pow(2, -ev))) : 0;
    const alts = rk.groups.slice(1, 5);
    const next = top ? top.seq.slice(N, N + H) : [];
    const filled = top ? terms.map((t, i) => t ? null : { i, v: top.seq[i] }).filter(Boolean) : [];
    const near = rk.live.filter(r => r.evidence >= 1).sort((a, b) => a.bits - b.bits).slice(0, 3);
    const approx = label === 'No pattern' ? approxFit(known, N, H) : null;
    return { terms, known, N, H, label, conf, share, top, ev, alts, next, filled, near, approx, dataBits: ctx.dataBits, z0: rk.z0 };
  }

  const VCLS = { Verified: 'tagged', Plausible: 'ai', Ambiguous: 'mixed', 'No pattern': 'error', Approximate: 'mixed' };

  const fnum = x => { const t = Number(x.toPrecision(5)); return Math.abs(t) >= 1e15 || (t !== 0 && Math.abs(t) < 1e-6) ? t.toExponential(3) : String(t); };

  function lstsq(xs, ys, k) {
    const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
    xs.forEach((x, r) => {
      const pw = [];
      let w = 1;
      for (let j = 0; j < k; j++) { pw.push(w); w *= x; }
      for (let i = 0; i < k; i++) { b[i] += pw[i] * ys[r]; for (let j = 0; j < k; j++) A[i][j] += pw[i] * pw[j]; }
    });
    for (let c = 0; c < k; c++) {
      let m = c;
      for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      if (Math.abs(A[m][c]) < 1e-12) return null;
      [A[c], A[m]] = [A[m], A[c]];
      [b[c], b[m]] = [b[m], b[c]];
      for (let r = c + 1; r < k; r++) { const f = A[r][c] / A[c][c]; for (let j = c; j < k; j++) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; }
    }
    const co = new Array(k).fill(0);
    for (let i = k - 1; i >= 0; i--) { let t = b[i]; for (let j = i + 1; j < k; j++) t -= A[i][j] * co[j]; co[i] = t / A[i][i]; }
    return co;
  }

  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  function unscale(co, al, be) {
    const r = new Array(co.length).fill(0);
    co.forEach((c, j) => { for (let t = 0; t <= j; t++) r[t] += c * binom(j, t) * Math.pow(al, t) * Math.pow(be, j - t); });
    return r;
  }
  function polyText(c) {
    const parts = [];
    for (let j = c.length - 1; j >= 0; j--) {
      const v = c[j];
      if (Math.abs(v) < 1e-9 * Math.max(...c.map(Math.abs))) continue;
      const ab = fnum(Math.abs(v)), t = j === 0 ? ab : (ab === '1' ? '' : ab) + 'n' + SUP[j];
      parts.push([v < 0, t]);
    }
    return joinTerms(parts) || '0';
  }

  function approxFit(known, N, H) {
    const n = known.length;
    if (n < 5) return null;
    const xs = known.map(p => p.i + 1), ys = known.map(p => toNum(p.v));
    if (ys.some(y => !isFinite(y))) return null;
    const xm = xs.reduce((s, x) => s + x, 0) / n, sc = (Math.max(...xs) - Math.min(...xs)) / 2 || 1, us = xs.map(x => (x - xm) / sc);
    const ym = ys.reduce((s, y) => s + y, 0) / n, sst = ys.reduce((s, y) => s + (y - ym) ** 2, 0);
    if (!sst) return null;
    const al = 1 / sc, be = -xm / sc, models = [];
    for (const k of [2, 3, 4]) {
      if (n < k + 2) continue;
      const co = lstsq(us, ys, k);
      if (!co) continue;
      const f = u => { let r = 0; for (let j = k - 1; j >= 0; j--) r = r * u + co[j]; return r; };
      models.push({ name: ['', '', 'Linear trend', 'Quadratic trend', 'Cubic trend'][k], k, f, formula: 'y ≈ ' + polyText(unscale(co, al, be)) });
    }
    if (ys.every(y => y > 0) && n >= 4) {
      const co = lstsq(us, ys.map(Math.log), 2);
      if (co) models.push({ name: 'Exponential trend', k: 2, f: u => Math.exp(co[0] + co[1] * u), formula: 'y ≈ ' + fnum(Math.exp(co[0] - co[1] * xm / sc)) + ' · e^(' + fnum(co[1] / sc) + 'n)' });
    }
    let best = null;
    for (const m of models) {
      const sse = us.reduce((s, u, i) => s + (ys[i] - m.f(u)) ** 2, 0), floor = Math.max(sse, sst * 1e-12);
      const aicc = n * Math.log(floor / n) + 2 * m.k + 2 * m.k * (m.k + 1) / (n - m.k - 1);
      if (!isFinite(aicc)) continue;
      if (!best || aicc < best.aicc) best = { ...m, sse, aicc };
    }
    if (!best) return null;
    const r2 = 1 - best.sse / sst;
    if (r2 < .9) return null;
    const next = [];
    for (let t = 0; t < 10; t++) next.push(best.f(((N + 1 + t) - xm) / sc));
    if (next.some(x => !isFinite(x))) return null;
    return { name: best.name, formula: best.formula, r2, sigma: Math.sqrt(best.sse / Math.max(1, n - best.k)), next: next.slice(0, H), fit: us.map(u => best.f(u)), k: best.k };
  }

  function spark(vals, nKnown, hollow) {
    const nums = vals.map(v => typeof v === 'number' ? v : toNum(v));
    if (nums.length < 3 || nums.some(x => !isFinite(x))) return '';
    const lo = Math.min(...nums), hi = Math.max(...nums), useLog = lo > 0 && hi / lo > 1000, f = useLog ? Math.log10 : x => x;
    const ys = nums.map(f), y0 = Math.min(...ys), rng = (Math.max(...ys) - y0) || 1, W = 600, Hh = 120, pad = 14;
    const pts = ys.map((y, i) => [pad + (W - 2 * pad) * i / (ys.length - 1), Hh - pad - (Hh - 2 * pad) * (y - y0) / rng]);
    const path = ps => ps.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join('');
    const dots = nums.length <= 40 ? pts.map(([x, y], i) => '<circle class="' + (i >= nKnown || hollow.has(i) ? 'p' : 'k') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>').join('') : '';
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Given and predicted terms"><path class="lk" d="' + path(pts.slice(0, nKnown)) + '"/><path class="lp" d="' + path(pts.slice(nKnown - 1)) + '"/>' + dots + (useLog ? '<text x="' + pad + '" y="10">log scale</text>' : '') + '</svg>';
  }

  function behave(a) {
    const F = a.terms.map((t, i) => t || a.top.seq[i]), rows = [['Terms', F]];
    let cur = F;
    for (let lv = 1; lv <= 5 && cur.length > 1; lv++) {
      const prev = cur;
      cur = prev.slice(1).map((x, i) => sub(x, prev[i]));
      rows.push(['Step ' + lv, cur]);
      if (cur.every(x => eq(x, cur[0]))) break;
    }
    if (F.length > 2 && F.slice(0, -1).every(x => !isZero(x))) rows.push(['Ratio', F.slice(1).map((x, i) => div(x, F[i]))]);
    const body = rows.map(([lab, vals], ri) => {
      const flat = ri > 0 && vals.length > 1 && vals.every(x => eq(x, vals[0])), cap = 14;
      return '<tr><th scope="row">' + lab + '</th>' + vals.slice(0, cap).map(x => '<td' + (flat ? ' class="to to-ai"' : '') + '>' + esc(fmtQ(x)) + '</td>').join('') + (vals.length > cap ? '<td>…</td>' : '') + '</tr>';
    }).join('');
    return '<details class="checks"><summary>Steps and ratios between terms</summary><div class="tablewrap"><table class="behave"><tbody>' + body + '</tbody></table></div></details>';
  }

  function chipsRow(a) {
    const given = a.terms.map((t, i) => t ? '<span class="chip">' + esc(fmtQ(t)) + '</span>' : '<span class="chip active" title="filled in">' + esc(fmtQ(a.top.seq[i])) + '</span>').join('');
    const nx = a.next.map(v => '<span class="chip active">' + esc(fmtQ(v)) + '</span>').join('');
    return '<div class="chips">' + given + (nx ? '<span class="arrow">→</span>' + nx : '') + '</div>';
  }

  function altTable(a) {
    if (!a.alts.length) return '';
    const rows = a.alts.map(g => '<tr><td>' + esc(g.rule.name) + '<small>' + esc(g.rule.words === g.rule.name ? g.rule.formula : g.rule.words) + '</small></td><td class="to">' + esc(fmtQ(g.v)) + '</td><td>' + (g.share < .01 ? '<1' : Math.round(g.share * 100)) + '%</td><td>' + g.rule.evidence + '</td></tr>').join('');
    return '<h4>Other rules that fit</h4><div class="tablewrap"><table><thead><tr><th>Rule</th><th>Next</th><th>Share</th><th>Checks</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function noPattern(a, o = {}) {
    const near = a.near.length ? '<h4>Closest fits, too few terms to trust</h4><ul class="drivers">' + a.near.map(r => '<li><b>' + esc(r.name) + '</b>: ' + esc(r.words) + ' (next ' + esc(fmtQ(r.seq[a.N])) + '). ' + Math.max(1, 2 - r.evidence) + ' more matching term' + (2 - r.evidence > 1 ? 's' : '') + ' would make it checkable.</li>').join('') + '</ul>' : '';
    const head = (glyph, title, sub, pill, big, small, w, cls) => '<details class="fcard v-' + cls + '" open><summary><span class="thumb glyph">' + glyph + '</span><span class="fmeta"><b>' + title + '</b><small>' + (o.line ? 'Line ' + o.line + ' · ' : '') + sub + '</small></span><span class="vpill">' + pill + '</span><span class="fscore"><b>' + big + '</b><small>' + small + '</small><span class="mini"><i style="width:' + w + '%"></i></span></span></summary>';
    const ap = a.approx;
    if (!ap) return head('∑', 'No reliable pattern', a.known.length + ' numbers', 'No pattern', '—', 'nothing verified', 0, 'error') + '<div class="fbody"><p class="honest">No simple rule predicted numbers it was not fitted to. More terms usually help: a rule with k parameters needs at least k + 2 numbers before it counts as checked.</p>' + near + '</div></details>';
    const known = a.terms.map(t => t ? '<span class="chip">' + esc(fmtQ(t)) + '</span>' : '<span class="chip">?</span>').join('');
    const nx = ap.next.map(v => '<span class="chip active">' + esc(fnum(v)) + '</span>').join('');
    const all = [...a.terms.map((t, i) => t ? toNum(t) : ap.fit[a.known.findIndex(p => p.i > i) - 1] ?? NaN), ...ap.next];
    const sp = spark(a.terms.map((t, i) => t ? toNum(t) : NaN).some(isNaN) ? [...a.known.map(p => toNum(p.v)), ...ap.next] : all, a.terms.some(t => !t) ? a.known.length : a.N, new Set());
    return head('≈', ap.name, 'No exact rule fits these numbers', 'Approximate', 'R² ' + ap.r2.toFixed(2), 'statistical trend', Math.round(ap.r2 * 100), 'mixed') + '<div class="fbody"><div class="chips">' + known + '<span class="arrow">→</span>' + nx + '</div><p class="seqrule"><code>' + esc(ap.formula) + '</code> <span class="tstat">typical error ±' + esc(fnum(ap.sigma)) + '</span></p>' + sp + '<p class="honest">No exact rule fits, so this is a fitted trend, not a rule. Predictions further from the data are less trustworthy, and the trend can change direction. Use it as a rough guide only.</p>' + near + '</div></details>';
  }

  function render(a, o = {}) {
    if (a.error) return '<article class="card"><p>' + esc(a.error) + '</p></article>';
    if (a.label === 'No pattern') return noPattern(a, o);
    const v = VCLS[a.label], pct = Math.round(a.conf * 100), t = a.top;
    const aka = t.aka && t.aka.length ? ' · also known as ' + esc(t.aka.join(', ')) : '';
    const dis = a.alts.length && a.alts[0].share >= .12 ? '<p class="honest">Another rule fits the same numbers and gives <b>' + esc(fmtQ(a.alts[0].v)) + '</b> next instead of <b>' + esc(fmtQ(a.next[0])) + '</b>. The numbers alone cannot separate them.</p>' : '';
    const fill = a.filled.length ? '<p class="tstat">Filled in: ' + a.filled.map(f => 'position ' + (f.i + 1) + ' = ' + esc(fmtQ(f.v))).join(' · ') + '</p>' : '';
    const used = '<p class="tstat">Pinned down by ' + t.params + ' of the ' + a.known.length + ' numbers · the other ' + a.ev + ' match without being used to fit it</p>';
    const hollow = new Set(a.filled.map(f => f.i));
    const sp = spark(t.seq.slice(0, a.N + a.next.length).map(x => x), a.N, hollow);
    return '<details class="fcard v-' + v + '" open><summary><span class="thumb glyph">∑</span><span class="fmeta"><b>' + esc(t.name) + '</b><small>' + (o.line ? 'Line ' + o.line + ' · ' : '') + esc(t.words === t.name ? t.formula : t.words) + '</small></span><span class="vpill">' + a.label + '</span><span class="fscore"><b>' + pct + '%</b><small>' + a.ev + ' independent checks</small><span class="mini"><i style="width:' + pct + '%"></i></span></span></summary><div class="fbody">' + chipsRow(a) + fill + '<p class="seqrule"><code>' + esc(t.formula) + '</code>' + aka + '</p>' + used + dis + altTable(a) + sp + behave(a) + '<p class="honest">A finite list never proves a rule: every set of numbers fits infinitely many. The score weighs simplicity and how many numbers the rule predicted without being fitted to them, and never goes above 90%.</p></div></details>';
  }

  return { analyze, render, parse, fmtQ };
})();
