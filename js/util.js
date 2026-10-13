const UTIL = (() => {
  const MAX_LOG10P = -3, MIN_SUPPORT = .6;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sig = (name, value, dir, w, why, ref) => ({ name, value, dir, w, why, ref });
  const dayWord = b => Math.abs(b) === 1 ? ' day' : ' days';

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
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
  const adjust = (log10p, tested) => Math.min(0, log10p + Math.log10(Math.max(1, tested)));
  const normTail = z => { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))), e = y * Math.exp(-z * z / 2); return z >= 0 ? e / 2 : 1 - e / 2; };
  const chiP = (x, k) => normTail((Math.cbrt(x / k) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k)));
  const median = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  function mode(arr, key) { const c = new Map(); let best = null, bc = 0; arr.forEach(v => { const k = key(v), n = (c.get(k) || 0) + 1; c.set(k, n); if (n > bc) { bc = n; best = v; } }); return best; }
  function shuffle(a, rand) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function shuffleKnown(a, rand) {
    if (!a.includes(null)) return shuffle(a, rand);
    const pos = [], vals = [];
    a.forEach((v, i) => { if (v !== null) { pos.push(i); vals.push(v); } });
    const sh = shuffle(vals, rand), out = a.slice();
    pos.forEach((p, k) => { out[p] = sh[k]; });
    return out;
  }

  const babs = a => a < 0n ? -a : a;
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const Q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
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

  const diffsOf = (a, q) => { let cur = a; for (let i = 0; i < q; i++) { const p = cur; cur = new Array(p.length - 1); for (let j = 0; j < cur.length; j++) cur[j] = p[j + 1] - p[j]; } return cur; };

  return { MAX_LOG10P, MIN_SUPPORT, esc, clamp, sig, dayWord, rng, lgamma, log10Tail, adjust, normTail, chiP, median, mode, shuffle, shuffleKnown, babs, gcd, lcm, Q, qadd, qsub, qmul, qdiv, qz, qeq, show, diffsOf };
})();
