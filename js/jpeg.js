const JPG = (() => {
  const ZZ = [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63];
  const STD_L = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
  const STD_C = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, ...new Array(32).fill(99)];
  const scaled = (base, q) => { const s = q < 50 ? 5000 / q : 200 - 2 * q; return base.map(b => clamp(Math.floor((b * s + 50) / 100), 1, 255)); };

  function header(u) {
    const r = { q: {}, sof: null, progressive: false, restart: 0, huffman: 0, app: [], comments: [], thumb: false };
    if (u[0] !== 0xFF || u[1] !== 0xD8) return null;
    let o = 2;
    while (o + 4 < u.length) {
      if (u[o] !== 0xFF) { o++; continue; }
      const m = u[o + 1];
      if (m === 0xFF) { o++; continue; }
      if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
      const len = u[o + 2] << 8 | u[o + 3], s = o + 4, e = o + 2 + len;
      if (m === 0xDB) { let p = s; while (p < e) { const pq = u[p] >> 4, id = u[p] & 15, t = new Array(64); p++; for (let k = 0; k < 64; k++) { t[ZZ[k]] = pq ? u[p] << 8 | u[p + 1] : u[p]; p += pq ? 2 : 1; } r.q[id] = t; } }
      else if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        const n = u[s + 5], comps = [];
        for (let i = 0; i < n; i++) comps.push({ id: u[s + 6 + i * 3], h: u[s + 7 + i * 3] >> 4, v: u[s + 7 + i * 3] & 15, tq: u[s + 8 + i * 3] });
        r.sof = { h: u[s + 1] << 8 | u[s + 2], w: u[s + 3] << 8 | u[s + 4], comps };
        r.progressive = m === 0xC2 || m === 0xC6 || m === 0xCA;
      }
      else if (m === 0xC4) r.huffman++;
      else if (m === 0xDD) r.restart = u[s] << 8 | u[s + 1];
      else if (m === 0xFE) r.comments.push(new TextDecoder('latin1').decode(u.subarray(s, Math.min(e, s + 120))));
      else if (m >= 0xE0 && m <= 0xEF) { r.app.push('APP' + (m - 0xE0)); if (m === 0xE1) for (let p = s + 10; p < e - 1; p++) if (u[p] === 0xFF && u[p + 1] === 0xD8) { r.thumb = true; break; } }
      if (m === 0xDA) break;
      o = e;
    }
    return r;
  }

  function quality(t) {
    if (!t) return null;
    let best = { q: 0, err: Infinity };
    const std = t.base === 'c' ? STD_C : STD_L;
    for (let q = 1; q <= 100; q++) { const s = scaled(std, q); let e = 0; for (let k = 0; k < 64; k++) e += Math.abs(s[k] - t.t[k]); if (e < best.err) best = { q, err: e }; }
    return best;
  }

  function analyzeHeader(u) {
    const h = header(u); if (!h || !h.q[0]) return null;
    const L = quality({ t: h.q[0], base: 'l' }), C = h.q[1] ? quality({ t: h.q[1], base: 'c' }) : null;
    const exact = L.err === 0 && (!C || C.err === 0);
    const c0 = h.sof && h.sof.comps[0], sub = !h.sof || h.sof.comps.length < 3 ? 'grayscale' : c0.h === 2 && c0.v === 2 ? '4:2:0' : c0.h === 2 && c0.v === 1 ? '4:2:2' : c0.h === 1 && c0.v === 1 ? '4:4:4' : c0.h + 'x' + c0.v;
    return { ...h, Lq: L, Cq: C, exact, sub, table: h.q[0] };
  }

  function dct8(b, out) {
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) {
      let s = 0;
      for (let y = 0; y < 8; y++) { const cy = COS[v * 8 + y]; for (let x = 0; x < 8; x++) s += b[y * 8 + x] * COS[u * 8 + x] * cy; }
      out[v * 8 + u] = s * (u ? .5 : .35355339) * (v ? .5 : .35355339);
    }
  }
  const COS = new Float32Array(64); for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) COS[u * 8 + x] = Math.cos((2 * x + 1) * u * Math.PI / 16);

  function lumaCrop(img, max) {
    const W = Math.min(img.naturalWidth || img.videoWidth || img.width, max) & ~7, H = Math.min(img.naturalHeight || img.videoHeight || img.height, max) & ~7;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data, Y = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) Y[i] = d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114 - 128;
    return { Y, W, H, canvas: c, ctx: x };
  }

  function blocks(Y, S, W, H, ox, oy, step, fn) {
    const b = new Float32Array(64), o = new Float32Array(64);
    for (let by = oy; by + 8 <= H; by += 8 * step) for (let bx = ox; bx + 8 <= W; bx += 8 * step) {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) b[y * 8 + x] = Y[(by + y) * S + bx + x];
      dct8(b, o); fn(o, bx, by);
    }
  }

  function gridFit(Y, W, H, q) {
    const nb = (W >> 3) * (H >> 3), step = Math.max(1, Math.round(Math.sqrt(nb / 300)));
    const use = [1, 8, 9, 2, 16, 10, 17, 3, 24].filter(k => q[k] >= 2);
    if (!use.length) return null;
    const score = new Float32Array(64);
    for (let oy = 0; oy < 8; oy++) for (let ox = 0; ox < 8; ox++) {
      let s = 0, n = 0;
      blocks(Y, W, W, H, ox, oy, step, D => { use.forEach(k => { const r = D[k] / q[k]; if (Math.abs(r) < .5) return; s += Math.abs(r - Math.round(r)); n++; }); });
      score[oy * 8 + ox] = n > 20 ? s / n : .25;
    }
    let best = 0; for (let i = 1; i < 64; i++) if (score[i] < score[best]) best = i;
    const others = [...score].filter((_, i) => i !== best).sort((a, b) => a - b);
    return { ox: best & 7, oy: best >> 3, fit: score[best], s0: score[0], aligned: best === 0, contrast: (others[others.length >> 1] - score[best]) / .25 };
  }

  function doubleQuant(Y, W, H, q) {
    const ks = [1, 8, 9, 2, 16, 10, 17, 3, 24, 11, 18, 4].filter(k => q[k] >= 2 && q[k] <= 40), H2 = ks.map(() => new Float32Array(41));
    if (!ks.length) return null;
    blocks(Y, W, W, H, 0, 0, 1, D => ks.forEach((k, j) => { const v = Math.abs(Math.round(D[k] / q[k])); if (v <= 40) H2[j][v]++; }));
    const per = H2.map((h, j) => {
      let dev = 0, tot = 0;
      for (let v = 2; v <= 15; v++) { const exp = Math.sqrt(h[v - 1] * h[v + 1]); if (exp < 25) continue; dev += Math.abs(h[v] - exp) - Math.sqrt(exp); tot += exp; }
      return tot < 400 ? null : { k: ks[j], dev: Math.max(0, dev) / tot };
    }).filter(Boolean);
    if (!per.length) return null;
    const devs = per.map(p => p.dev).sort((a, b) => a - b), med = devs[devs.length >> 1];
    return { score: med, n: per.length, hits: per.filter(p => p.dev > .3).length };
  }

  async function ghost(crop, curQ) {
    const { canvas, W, H, ctx } = crop, base = ctx.getImageData(0, 0, W, H).data, curve = [];
    const enc = q => new Promise(r => canvas.toBlob(b => { const im = new Image(); im.onload = () => r(im); im.src = URL.createObjectURL(b); }, 'image/jpeg', q / 100));
    const tc = document.createElement('canvas'); tc.width = W; tc.height = H; const tx = tc.getContext('2d', { willReadFrequently: true });
    const maps = {};
    for (let q = 35; q <= 95; q += 5) {
      const im = await enc(q); tx.drawImage(im, 0, 0); URL.revokeObjectURL(im.src);
      const d = tx.getImageData(0, 0, W, H).data, B = 16, bw = W / B | 0, bh = H / B | 0, m = new Float32Array(bw * bh);
      let s = 0;
      for (let y = 0; y < bh * B; y++) for (let x = 0; x < bw * B; x++) { const i = (y * W + x) * 4, e = ((d[i] - base[i]) ** 2 + (d[i + 1] - base[i + 1]) ** 2 + (d[i + 2] - base[i + 2]) ** 2) / 3; s += e; m[(y / B | 0) * bw + (x / B | 0)] += e; }
      curve.push([q, s / (bw * bh * B * B)]); maps[q] = { m, bw, bh };
    }
    const mins = [];
    for (let i = 1; i < curve.length - 1; i++) {
      const [q, v] = curve[i], l = curve[i - 1][1], r = curve[i + 1][1];
      if (v < l && v < r && Math.min(l, r) - v > v * .08) mins.push(q);
    }
    const prior = mins.filter(q => curQ && q < curQ - 7);
    let mapURL = null;
    const mq = prior[0] || (curve.reduce((a, b) => b[1] < a[1] ? b : a)[0]);
    const mp = maps[mq];
    if (mp) {
      const vals = [...mp.m].sort((a, b) => a - b), lo = vals[vals.length * .05 | 0], hi = vals[vals.length * .95 | 0] + 1e-9;
      const c = document.createElement('canvas'); c.width = mp.bw; c.height = mp.bh; const x = c.getContext('2d'), id = x.createImageData(mp.bw, mp.bh);
      for (let i = 0; i < mp.m.length; i++) { const v = clamp((mp.m[i] - lo) / (hi - lo), 0, 1) * 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      x.putImageData(id, 0, 0); mapURL = c.toDataURL('image/png');
    }
    return { curve, mins, prior, mapQ: mq, mapURL };
  }

  async function analyze(img, u, info) {
    const h = analyzeHeader(u); if (!h) return { L: [], maps: '' };
    const L = [];
    const lq = h.Lq, curQ = lq.q;
    L.push(sig('JPEG quantization table', (h.exact ? 'standard IJG table, quality ' + curQ : 'custom table, closest IJG quality ≈' + curQ + ' (Δ' + lq.err + ')') + ' · ' + Object.keys(h.q).length + ' tables',
      h.exact && info.camera ? 'proc' : !h.exact && info.camera ? 'real' : 'neutral', !h.exact && info.camera ? -4 : 0,
      h.exact ? (info.camera ? 'EXIF names a camera but the tables are the generic libjpeg ones: the file was re-saved by software after capture' : 'Generic libjpeg tables: last written by software (browser, editor, PIL, many AI pipelines)') : (info.camera ? 'Non-standard tables match what camera firmware writes, and EXIF names a camera: consistent' : 'Non-standard tables: camera firmware, Photoshop or another custom encoder'), REF.qt));
    L.push(sig('JPEG structure', (h.progressive ? 'progressive' : 'baseline') + ' · ' + h.sub + (h.restart ? ' · restart ' + h.restart : '') + (h.thumb ? ' · EXIF thumbnail' : '') + ' · ' + h.app.join(','), 'neutral', 0, h.thumb ? 'Embedded preview thumbnail exists: typical of cameras and phones' : 'Encoder settings, context only', REF.qt));
    if (h.comments.length) L.push(sig('JPEG comment', h.comments[0].slice(0, 80), 'neutral', 0, 'Encoder or editor comment', REF.qt));
    info.quality = curQ; info.sub = h.sub;
    const crop = lumaCrop(img, 1024), q = h.table;
    const g = gridFit(crop.Y, crop.W, crop.H, q);
    if (g) {
      if (!g.aligned && g.s0 - g.fit <= .05) { g.aligned = true; g.ox = g.oy = 0; g.fit = g.s0; }
      const sure = g.contrast > .25;
      L.push(sig('8×8 grid alignment', sure ? 'offset (' + g.ox + ',' + g.oy + ') · fit ' + g.fit.toFixed(3) : 'grid not recoverable (fit ' + g.fit.toFixed(3) + ')', sure && !g.aligned ? 'proc' : 'neutral', 0,
        !sure ? 'Coefficients do not lock to the table: resized, filtered or re-encoded after the last JPEG step' : g.aligned ? 'DCT coefficients line up with the file\'s own grid: the last JPEG save was of this exact frame' : 'Grid is shifted: the image was cropped or shifted after an earlier JPEG compression', REF.align));
      info.gridLost = !sure;
    }
    const dq = doubleQuant(crop.Y, crop.W, crop.H, q);
    if (dq) {
      const yes = dq.score > .2;
      L.push(sig('Double quantization (DCT histograms)', 'periodicity ' + dq.score.toFixed(2) + ' · ' + dq.hits + '/' + dq.n + ' frequencies', yes ? 'proc' : 'neutral', 0, yes ? 'Periodic gaps in coefficient histograms: compressed at least twice with different qualities' : 'Smooth histograms: consistent with a single compression', REF.dq));
      info.double = yes;
    }
    const gh = await ghost(crop, curQ);
    if (gh.curve.length) {
      L.push(sig('JPEG ghost', gh.prior.length ? 'earlier compression near q≈' + gh.prior.join(', ') : 'no earlier quality found', gh.prior.length ? 'proc' : 'neutral', 0, gh.prior.length ? 'Re-saving at that quality barely changes the image: it was already compressed there before' : 'No sign of an earlier lower-quality save', REF.jpeg));
      if (gh.prior.length) info.double = true;
    }
    const maps = gh.mapURL ? '<figure><img src="' + gh.mapURL + '" alt="JPEG ghost map" style="image-rendering:pixelated"><figcaption>JPEG ghost at q' + gh.mapQ + ': dark = already compressed at this quality. A patch that differs from its surroundings may have been pasted in.</figcaption></figure>' : '';
    return { L, maps };
  }

  return { analyze, header: analyzeHeader };
})();
