const PRNU = (() => {
  const N = 512;
  async function load(f) {
    const bm = await createImageBitmap(f);
    if (bm.width < N || bm.height < N) throw new Error('smaller than ' + N + ' px');
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bm, (bm.width - N) >> 1, (bm.height - N) >> 1, N, N, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data, I = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) I[i] = d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114;
    return { I, W: residual(I), size: bm.width + '×' + bm.height };
  }
  function zeroMean(a) {
    for (let y = 0; y < N; y++) { let s = 0; for (let x = 0; x < N; x++) s += a[y * N + x]; s /= N; for (let x = 0; x < N; x++) a[y * N + x] -= s; }
    for (let x = 0; x < N; x++) { let s = 0; for (let y = 0; y < N; y++) s += a[y * N + x]; s /= N; for (let y = 0; y < N; y++) a[y * N + x] -= s; }
    return a;
  }
  function residual(I) {
    const W = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, s2 = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue; const v = I[yy * N + xx]; s += v; s2 += v * v; n++; }
      const m = s / n, v = Math.max(0, s2 / n - m * m), nv = 9, r = I[y * N + x] - m;
      W[y * N + x] = r - r * (v > nv ? (v - nv) / v : 0);
    }
    return zeroMean(W);
  }
  function fingerprint(refs) {
    const num = new Float32Array(N * N), den = new Float32Array(N * N);
    refs.forEach(({ I, W }) => { for (let i = 0; i < N * N; i++) { if (I[i] > 250 || I[i] < 5) continue; num[i] += W[i] * I[i]; den[i] += I[i] * I[i]; } });
    const K = new Float32Array(N * N); for (let i = 0; i < N * N; i++) K[i] = den[i] ? num[i] / den[i] : 0;
    return zeroMean(K);
  }
  function rot(a, k) {
    if (!k) return a; const o = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [ny, nx] = k === 1 ? [x, N - 1 - y] : k === 2 ? [N - 1 - y, N - 1 - x] : [N - 1 - x, y]; o[ny * N + nx] = a[y * N + x]; }
    return o;
  }
  function fft2(re, im, inv) {
    const r = new Float32Array(N), i = new Float32Array(N);
    if (inv) for (let k = 0; k < im.length; k++) im[k] = -im[k];
    for (let y = 0; y < N; y++) { r.set(re.subarray(y * N, y * N + N)); i.set(im.subarray(y * N, y * N + N)); fft(r, i); re.set(r, y * N); im.set(i, y * N); }
    for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; i[y] = im[y * N + x]; } fft(r, i); for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = i[y]; } }
    if (inv) for (let k = 0; k < im.length; k++) { re[k] /= N * N; im[k] = -im[k] / (N * N); }
  }
  function pce(K, t) {
    const ar = new Float32Array(N * N), ai = new Float32Array(N * N), br = new Float32Array(t.W), bi = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) ar[i] = K[i] * t.I[i];
    zeroMean(ar); fft2(ar, ai); fft2(br, bi);
    for (let i = 0; i < N * N; i++) { const r = ar[i] * br[i] + ai[i] * bi[i], m = ar[i] * bi[i] - ai[i] * br[i]; ar[i] = r; ai[i] = m; }
    fft2(ar, ai, true);
    let pk = -Infinity, px = 0, py = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const y = (dy + N) % N, x = (dx + N) % N, v = ar[y * N + x]; if (v > pk) { pk = v; px = x; py = y; } }
    let e = 0, n = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const ddy = Math.min(Math.abs(y - py), N - Math.abs(y - py)), ddx = Math.min(Math.abs(x - px), N - Math.abs(x - px)); if (ddy <= 5 && ddx <= 5) continue; e += ar[y * N + x] ** 2; n++; }
    return Math.sign(pk) * pk * pk / (e / n);
  }
  function test(K, t) { let best = { pce: -Infinity, rot: 0 }; for (let k = 0; k < 4; k++) { const v = pce(rot(K, k), t); if (v > best.pce) best = { pce: v, rot: k * 90 }; } return best; }
  return { load, fingerprint, test, N };
})();

(() => {
  const st = { refs: [], K: null };
  const out = $('#prnu-out'), info = $('#prnu-status');
  const status = t => info.textContent = t;
  $('#prnu-ref').onchange = async e => {
    st.refs = []; st.K = null; out.innerHTML = '';
    const fs = [...e.target.files];
    for (const [i, f] of fs.entries()) { status('Reading reference ' + (i + 1) + ' / ' + fs.length); try { st.refs.push(await PRNU.load(f)); } catch (er) { status(f.name + ': ' + er.message); } }
    if (st.refs.length < 2) return status('At least 2 readable reference photos are needed; 10–20 flat, bright, unedited shots work best.');
    st.K = PRNU.fingerprint(st.refs);
    status('Fingerprint built from ' + st.refs.length + ' photos. Now choose photos to test.' + (st.refs.length < 8 ? ' Fewer than 8 references: matches will be weaker.' : ''));
  };
  $('#prnu-test').onchange = async e => {
    if (!st.K) return status('Build a fingerprint first.');
    const rows = [];
    for (const f of e.target.files) {
      status('Testing ' + f.name);
      try {
        const t = await PRNU.load(f), r = PRNU.test(st.K, t), p = r.pce;
        const v = p > 60 ? 'Match' : p > 25 ? 'Weak, inconclusive' : 'No match';
        rows.push('<tr><td>' + esc(f.name) + '<small>' + t.size + '</small></td><td>' + p.toFixed(1) + '</td><td class="to ' + (p > 60 ? 'to-real' : '') + '">' + v + '</td><td>' + r.rot + '°</td><td>' + (p > 60 ? 'Same sensor fingerprint as the references' : p > 25 ? 'Below the published threshold' : 'Different camera, or resized, cropped, stabilised or heavily compressed') + '</td></tr>');
      } catch (er) { rows.push('<tr><td>' + esc(f.name) + '</td><td>—</td><td>Error</td><td></td><td>' + esc(er.message) + '</td></tr>'); }
    }
    out.innerHTML = '<div class="tablewrap"><table><thead><tr><th>Photo</th><th>PCE</th><th>Result</th><th>Rotation</th><th>Meaning</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
    status('Done. PCE above 60 is the threshold used in published large-scale tests.');
  };
})();
