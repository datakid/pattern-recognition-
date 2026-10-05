const C2PA = (() => {
  const rd32 = (u, o) => u[o] * 16777216 + (u[o + 1] << 16 | u[o + 2] << 8 | u[o + 3]);
  const str4 = (u, o) => String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]);
  const utf8 = b => new TextDecoder().decode(b);
  const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  const safe = f => { try { return f(); } catch (e) { return null; } };
  const cat = arrs => { const n = arrs.reduce((a, b) => a + b.length, 0), o = new Uint8Array(n); let p = 0; arrs.forEach(a => { o.set(a, p); p += a.length; }); return o; };
  const eq = (a, b) => b && a.length === b.length && a.every((v, i) => v === b[i]);

  function extract(u) {
    const out = [];
    if (u[0] === 0xFF && u[1] === 0xD8) {
      const segs = {}; let o = 2;
      while (o + 4 < u.length) {
        if (u[o] !== 0xFF) break;
        const m = u[o + 1];
        if (m === 0xFF) { o++; continue; }
        if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { o += 2; continue; }
        if (m === 0xDA || m === 0xD9) break;
        const len = u[o + 2] << 8 | u[o + 3], end = o + 2 + len;
        if (m === 0xEB && u[o + 4] === 0x4A && u[o + 5] === 0x50) {
          const en = u[o + 6] << 8 | u[o + 7], z = rd32(u, o + 8); let p = o + 12;
          if (z > 1) p += rd32(u, p) === 1 ? 16 : 8;
          (segs[en] = segs[en] || []).push([z, u.subarray(p, end)]);
        }
        o = end;
      }
      Object.values(segs).forEach(s => out.push(cat(s.sort((a, b) => a[0] - b[0]).map(x => x[1]))));
    } else if (u[0] === 0x89 && u[1] === 0x50) {
      let o = 8;
      while (o + 12 <= u.length) { const len = rd32(u, o), t = str4(u, o + 4); if (t === 'caBX') out.push(u.subarray(o + 8, o + 8 + len)); if (t === 'IEND') break; o += 12 + len; }
    } else if (str4(u, 4) === 'ftyp') {
      boxes(u, 0, u.length).forEach(b => { const j = bmffJumbf(u.subarray(b.s, b.e)); if (j) out.push(j); });
    } else if (str4(u, 0) === 'RIFF') {
      let o = 12;
      while (o + 8 <= u.length) { const t = str4(u, o), len = (u[o + 4] | u[o + 5] << 8 | u[o + 6] << 16 | u[o + 7] << 24) >>> 0; if (t === 'C2PA') out.push(u.subarray(o + 8, o + 8 + len)); o += 8 + len + (len & 1); }
    }
    return out;
  }

  const C2PA_UUID = 'd8fec3d61b0e483c92975828877ec481';
  function bmffJumbf(b) {
    if (b.length < 32 || str4(b, 4) !== 'uuid' || hex(b.subarray(8, 24)) !== C2PA_UUID) return null;
    let p = 28; while (p < b.length && b[p]) p++;
    const purpose = utf8(b.subarray(28, p)); p++;
    if (purpose !== 'manifest') return null;
    return b.subarray(p + 8);
  }

  function boxes(u, s, e) {
    const out = [];
    while (s + 8 <= e) {
      let len = rd32(u, s), h = 8; const t = str4(u, s + 4);
      if (len === 1) { len = rd32(u, s + 8) * 4294967296 + rd32(u, s + 12); h = 16; } else if (len === 0) len = e - s;
      if (len < h || s + len > e) break;
      out.push({ t, s, e: s + len, p: s + h });
      s += len;
    }
    return out;
  }

  function jumb(u, b) {
    const kids = boxes(u, b.p, b.e), d = kids[0]; let label = '';
    if (d && d.t === 'jumd' && u[d.p + 16] & 2) { const o = d.p + 17; let q = o; while (q < d.e && u[q]) q++; label = utf8(u.subarray(o, q)); }
    return { label, kids: kids.slice(1).map(k => k.t === 'jumb' ? jumb(u, k) : { t: k.t, data: u.subarray(k.p, k.e) }) };
  }

  function cbor(u) {
    let o = 0;
    const len = ai => ai < 24 ? ai : ai === 24 ? u[o++] : ai === 25 ? (o += 2, u[o - 2] << 8 | u[o - 1]) : ai === 26 ? (o += 4, rd32(u, o - 4)) : ai === 27 ? (o += 8, rd32(u, o - 8) * 4294967296 + rd32(u, o - 4)) : -1;
    function item() {
      const b = u[o++], mt = b >> 5, ai = b & 31;
      if (mt === 7) {
        if (ai === 20) return false; if (ai === 21) return true; if (ai === 22 || ai === 23) return null;
        if (ai === 25) { const h = u[o] << 8 | u[o + 1]; o += 2; const e = h >> 10 & 31, m = h & 1023, s = h >> 15 ? -1 : 1; return s * (e === 0 ? m * 2 ** -24 : e === 31 ? (m ? NaN : Infinity) : (1 + m / 1024) * 2 ** (e - 15)); }
        if (ai === 26) { const v = new DataView(u.buffer, u.byteOffset + o, 4).getFloat32(0); o += 4; return v; }
        if (ai === 27) { const v = new DataView(u.buffer, u.byteOffset + o, 8).getFloat64(0); o += 8; return v; }
        return ai < 24 ? ai : undefined;
      }
      const n = ai === 31 ? -1 : len(ai);
      if (mt === 0) return n;
      if (mt === 1) return -1 - n;
      if (mt === 2 || mt === 3) {
        if (n < 0) { const ch = []; while (u[o] !== 0xFF) ch.push(item()); o++; return mt === 3 ? ch.join('') : cat(ch); }
        const bytes = u.subarray(o, o + n); o += n;
        return mt === 3 ? utf8(bytes) : bytes;
      }
      if (mt === 4) { const a = []; if (n < 0) { while (u[o] !== 0xFF) a.push(item()); o++; } else for (let i = 0; i < n; i++) a.push(item()); return a; }
      if (mt === 5) { const m = {}, one = () => { const k = item(); m[k] = item(); }; if (n < 0) { while (u[o] !== 0xFF) one(); o++; } else for (let i = 0; i < n; i++) one(); return m; }
      if (mt === 6) return { tag: n, v: item() };
    }
    return item();
  }

  function tlv(u, o) { let l = u[o + 1], h = 2; if (l & 0x80) { const n = l & 0x7f; l = 0; for (let i = 0; i < n; i++) l = l * 256 + u[o + 2 + i]; h += n; } return { t: u[o], s: o, b: o + h, e: o + h + l }; }
  const kidsOf = (u, n) => { const a = []; for (let o = n.b; o < n.e;) { const k = tlv(u, o); a.push(k); o = k.e; } return a; };
  const OIDN = { '550403': 'CN', '55040a': 'O', '55040b': 'OU', '550406': 'C' };
  function dn(u, n) { const o = {}; kidsOf(u, n).forEach(set => kidsOf(u, set).forEach(atv => { const [oid, val] = kidsOf(u, atv), k = OIDN[hex(u.subarray(oid.b, oid.e))]; if (k) o[k] = utf8(u.subarray(val.b, val.e)); })); return o; }
  function when(u, n) { const s = utf8(u.subarray(n.b, n.e)), utc = n.t === 0x17, y = utc ? (+s.slice(0, 2) < 50 ? '20' : '19') + s.slice(0, 2) : s.slice(0, 4), r = utc ? s.slice(2) : s.slice(4); return y + '-' + r.slice(0, 2) + '-' + r.slice(2, 4); }
  const ALGRSA = new Uint8Array([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const derLen = n => n < 128 ? [n] : n < 256 ? [0x81, n] : n < 65536 ? [0x82, n >> 8, n & 255] : [0x83, n >> 16, n >> 8 & 255, n & 255];
  const derSeq = parts => { const body = cat(parts); return cat([new Uint8Array([0x30, ...derLen(body.length)]), body]); };

  function x509(d) {
    try {
      const c = tlv(d, 0), tbs = kidsOf(d, c)[0], f = kidsOf(d, tbs), i = f[0].t === 0xA0 ? 1 : 0;
      const issuer = dn(d, f[i + 2]), val = kidsOf(d, f[i + 3]), subject = dn(d, f[i + 4]), sp = f[i + 5];
      const ak = kidsOf(d, kidsOf(d, sp)[0]), oid = hex(d.subarray(ak[0].b, ak[0].e));
      let spki = d.slice(sp.s, sp.e), curve = '', kind = '';
      if (oid === '2a8648ce3d0201') { kind = 'EC'; curve = { '2a8648ce3d030107': 'P-256', '2b81040022': 'P-384', '2b81040023': 'P-521' }[hex(d.subarray(ak[1].b, ak[1].e))] || ''; }
      else if (oid === '2a864886f70d010101') kind = 'RSA';
      else if (oid === '2a864886f70d01010a') { kind = 'RSA-PSS'; const bit = kidsOf(d, sp)[1]; spki = derSeq([ALGRSA, d.slice(bit.s, bit.e)]); }
      else if (oid === '2b6570') kind = 'Ed25519';
      return { subject, issuer, from: when(d, val[0]), to: when(d, val[1]), selfSigned: JSON.stringify(subject) === JSON.stringify(issuer), spki, curve, kind };
    } catch (e) { return { subject: {}, issuer: {} }; }
  }

  const COSE = { '-7': ['ES256', 'SHA-256'], '-35': ['ES384', 'SHA-384'], '-36': ['ES512', 'SHA-512'], '-37': ['PS256', 'SHA-256', 32], '-38': ['PS384', 'SHA-384', 48], '-39': ['PS512', 'SHA-512', 64], '-8': ['Ed25519'] };
  const head = (mt, n) => n < 24 ? [mt << 5 | n] : n < 256 ? [mt << 5 | 24, n] : n < 65536 ? [mt << 5 | 25, n >> 8, n & 255] : [mt << 5 | 26, n >>> 24 & 255, n >> 16 & 255, n >> 8 & 255, n & 255];
  const bstr = b => cat([new Uint8Array(head(2, b.length)), b]);
  const sigStructure = (p, payload) => cat([new Uint8Array([0x84, 0x6A]), new TextEncoder().encode('Signature1'), bstr(p || new Uint8Array(0)), new Uint8Array([0x40]), bstr(payload)]);

  async function verify(alg, cert, sig, data) {
    const a = COSE[alg];
    if (!a || !cert.spki || !(sig instanceof Uint8Array)) return 'unsupported';
    try {
      let key, params;
      if (a[0] === 'Ed25519') { key = await crypto.subtle.importKey('spki', cert.spki, { name: 'Ed25519' }, false, ['verify']); params = { name: 'Ed25519' }; }
      else if (a[0][0] === 'E') { key = await crypto.subtle.importKey('spki', cert.spki, { name: 'ECDSA', namedCurve: cert.curve }, false, ['verify']); params = { name: 'ECDSA', hash: a[1] }; }
      else { key = await crypto.subtle.importKey('spki', cert.spki, { name: 'RSA-PSS', hash: a[1] }, false, ['verify']); params = { name: 'RSA-PSS', saltLength: a[2] }; }
      return await crypto.subtle.verify(params, key, sig, data) ? 'valid' : 'invalid';
    } catch (e) { return 'unsupported'; }
  }

  const content = n => n && n.kids ? n.kids.find(k => !k.kids) : null;
  const decode = c => !c ? null : c.t === 'cbor' ? safe(() => cbor(c.data)) : c.t === 'json' ? safe(() => JSON.parse(utf8(c.data))) : null;
  const HASH = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' };

  async function parse(j, file) {
    const top = boxes(j, 0, j.length).find(b => b.t === 'jumb'); if (!top) return null;
    const store = jumb(j, top); if (store.label !== 'c2pa') return null;
    const mans = store.kids.filter(k => k.kids), act = mans[mans.length - 1]; if (!act) return null;
    const find = f => act.kids.find(k => k.kids && f(k.label));
    const astore = find(l => l === 'c2pa.assertions'), claimBox = find(l => /^c2pa\.claim/.test(l)), sigBox = find(l => l === 'c2pa.signature');
    const A = {}; (astore ? astore.kids.filter(k => k.kids) : []).forEach(a => A[a.label] = decode(content(a)));
    const claimRaw = content(claimBox), claim = decode(claimRaw) || {};
    const r = { manifests: mans.length, label: act.label, generator: '', actions: [], sourceTypes: [], ai: false, capture: false, ingredients: 0, assertions: Object.keys(A), hash: { status: 'absent' }, sig: { status: 'absent' }, signer: {} };
    const gi = claim.claim_generator_info;
    r.generator = typeof claim.claim_generator === 'string' ? claim.claim_generator : gi ? [].concat(gi).map(g => (g.name || '') + (g.version ? ' ' + g.version : '')).join(', ') : '';
    Object.entries(A).forEach(([k, v]) => {
      if (/^c2pa\.actions/.test(k) && v && Array.isArray(v.actions)) v.actions.forEach(a => {
        const ag = a.softwareAgent ? (typeof a.softwareAgent === 'string' ? a.softwareAgent : a.softwareAgent.name || '') : '';
        r.actions.push(String(a.action || '?') + (ag ? ' · ' + ag : ''));
        if (a.digitalSourceType) r.sourceTypes.push(String(a.digitalSourceType).split('/').pop());
      });
      if (/^c2pa\.ingredient/.test(k)) r.ingredients++;
    });
    r.sourceTypes = [...new Set(r.sourceTypes)];
    r.ai = r.sourceTypes.some(s => /algorithmicMedia|Synthetic/i.test(s));
    r.capture = !r.ai && r.sourceTypes.some(s => /digitalCapture|computationalCapture/i.test(s));
    const hk = Object.keys(A).find(k => /^c2pa\.hash\.data/.test(k)), bk = Object.keys(A).find(k => /^c2pa\.hash\.(bmff|boxes|collection)/.test(k));
    if (hk && A[hk] && A[hk].hash && file) {
      const h = A[hk], alg = HASH[h.alg || claim.alg || 'sha256'];
      if (!alg) r.hash = { status: 'unsupported', alg: h.alg };
      else {
        const ex = (h.exclusions || []).map(e => [e.start, e.length]).sort((a, b) => a[0] - b[0]), parts = []; let p = 0;
        ex.forEach(([s, l]) => { if (s > p) parts.push(file.subarray(p, s)); p = Math.max(p, s + l); });
        parts.push(file.subarray(p));
        const d = new Uint8Array(await crypto.subtle.digest(alg, cat(parts)));
        r.hash = { status: eq(d, h.hash) ? 'match' : 'mismatch', alg };
      }
    } else if (bk) r.hash = { status: 'unchecked', alg: bk.replace('c2pa.hash.', '') };
    if (sigBox && claimRaw) {
      const c = content(sigBox), cose = c && safe(() => cbor(c.data)), arr = cose && (cose.tag !== undefined ? cose.v : cose);
      if (Array.isArray(arr)) {
        const [prot, unprot, , sg] = arr, ph = prot && prot.length ? safe(() => cbor(prot)) || {} : {};
        let ch = ph['33'] || (unprot && (unprot['33'] || unprot.x5chain)); if (ch instanceof Uint8Array) ch = [ch];
        const alg = ph['1'];
        r.sig.alg = COSE[alg] ? COSE[alg][0] : String(alg ?? '?');
        if (ch && ch[0]) { const cert = x509(ch[0]); r.signer = cert; r.chain = ch.length; r.sig.status = await verify(alg, cert, sg, sigStructure(prot, claimRaw.data)); }
        else r.sig.status = 'no certificate';
        if (unprot && (unprot.sigTst || unprot.sigTst2)) r.sig.timestamp = true;
      }
    }
    return r;
  }

  async function read(u, opts = {}) {
    const js = opts.jumbf ? [opts.jumbf] : extract(u);
    for (const j of js) { try { const r = await parse(j, opts.jumbf ? null : u); if (r) return r; } catch (e) {} }
    return null;
  }

  async function readBmffFile(f) {
    let o = 0;
    for (let i = 0; i < 4000 && o + 8 <= f.size; i++) {
      const h = new Uint8Array(await f.slice(o, o + 32).arrayBuffer());
      let len = rd32(h, 0); const t = str4(h, 4);
      if (len === 1) len = rd32(h, 8) * 4294967296 + rd32(h, 12); else if (len === 0) len = f.size - o;
      if (len < 8) break;
      if (t === 'uuid' && hex(h.subarray(8, 24)) === C2PA_UUID && len < 3e7) {
        const j = bmffJumbf(new Uint8Array(await f.slice(o, o + len).arrayBuffer()));
        if (j) return read(null, { jumbf: j });
      }
      o += len;
    }
    return null;
  }

  return { read, readBmffFile };
})();
