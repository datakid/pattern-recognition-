const TXT = (() => {
  const { U, UNITS, CURS } = CELL;
  const NUM = '-?(?:\\d{1,3}(?:\\.\\d{3})+,\\d+|\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d+)?)';
  const DIGIT = /\d/;
  const luhn = s => { const d = s.replace(/\D/g, ''); let t = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } t += n; } return t % 10 === 0; };
  const TOK = [
    ['url', /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+/giu],
    ['email', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu, '@'],
    ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu, '-'],
    ['iban', /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/gu, DIGIT],
    ['coord', /-?\d{1,2}\.\d{3,},\s?-?\d{1,3}\.\d{3,}/gu, ','],
    ['color', /(?<![\w&])#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/giu, '#'],
    ['ip', /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu, '.'],
    ['date', /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s\d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s\d{1,2}(?:st|nd|rd|th)?,?\s\d{4}\b/giu, DIGIT],
    ['time', /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]m\b)?/giu, ':'],
    ['version', /\bv\d+(?:\.\d+){1,3}(?:-[\w.]+)?\b|\b\d+\.\d+\.\d+-[\w.]+\b/gu, '.'],
    ['card', /\b(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{4}(?:\1\d{1,3})?|\d{4}([ -])\d{6}\2\d{5})\b/gu, DIGIT, luhn],
    ['phone', /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/gu, DIGIT],
    ['hashtag', /(?<![\w])#[\p{L}\w]+/gu, '#'],
    ['mention', /(?<![\w])@[\w.]+/gu, '@'],
    ['id', /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9]+(?:-[A-Z0-9]+)+\b|\b[A-Z]{2,}\d{3,}\b/gu, DIGIT],
    ['money', new RegExp('(?:(?:' + CURS + ')\\s?' + NUM + '(?:\\s?[km](?![\\p{L}]))?|' + NUM + '\\s?(?:' + CURS + '|dollars?|euros?)(?![\\p{L}]))', 'giu'), DIGIT],
    ['percent', new RegExp(NUM + '\\s?%', 'gu'), '%'],
    ['dims', /(?<![\w.])(?!0x)\d+(?:\.\d+)?\s?[x×]\s?\d+(?:\.\d+)?(?![\w.])/giu, /[x×]/i],
    ['qty', new RegExp(NUM + '\\s?(?:' + UNITS + ')(?![\\p{L}\\p{N}])', 'giu'), DIGIT],
    ['num', new RegExp('(?<![\\p{L}\\d])' + NUM, 'gu'), DIGIT]
  ];
  const TYPE = { card: 'Card number', uuid: 'UUID', iban: 'IBAN', coord: 'Coordinates', color: 'Colour', version: 'Version', text: 'Text', url: 'URL', email: 'Email', ip: 'IP', date: 'Date', time: 'Time', phone: 'Phone', hashtag: 'Hashtag', mention: 'Mention', id: 'ID', money: 'Amount', percent: 'Percent', dims: 'Dimensions', qty: 'Quantity', num: 'Number' };
  const BOILER = /^(sent from my|unsubscribe|click here|view (this )?in (your )?browser|all rights reserved|copyright|©|privacy policy|terms (of|&) (use|service)|we use cookies|accept (all )?cookies|follow us|share this|advertisement|sponsored|read more$|skip to (main )?content|back to top|page \d+ (of|\/) \d+$|loading\.*$|show more$|reply$|like$|forwarded message)/i;
  const KEY = /^[\p{L}][\p{L}\p{N} _.\/()#&'-]{0,40}$/u;
  const CAPS = /^[\p{Lu}\s]{4,}$/u, MD_DIV = /^(?=.*-)[\s|:\-]*\|[\s|:\-]*$/;
  const BULLET = /^(?:[-*•·▪►→✓✔]|\d{1,3}[.)])\s+(?=\S)/u;
  const kvOf = line => {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if ((c !== ':' && c !== '=') || (DIGIT.test(line[i - 1] || '') && DIGIT.test(line[i + 1] || ''))) continue;
      const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
      return KEY.test(k) && v ? [k, v] : null;
    }
    return null;
  };

  const parseNum = s => { const c = CELL.parseOne(s, 'auto'); return c ? c.v : NaN; };
  const numIn = s => (s.match(new RegExp(NUM)) || [''])[0];
  const fmt = v => Number.isFinite(v) ? +v.toPrecision(8) : '';
  function canon(raw) {
    let s = raw.trim(), neg = false, ip, fp = '', m;
    if (s[0] === '-') { neg = true; s = s.slice(1); }
    if ((m = /^(\d{1,3}(?:\.\d{3})+),(\d+)$/.exec(s))) { ip = m[1].replace(/\./g, ''); fp = m[2]; }
    else if ((m = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/.exec(s))) { ip = m[1].replace(/,/g, ''); fp = m[2] || ''; }
    else { m = /^(\d*)[.,]?(\d*)$/.exec(s); ip = m[1] || '0'; fp = m[2]; }
    return (neg ? '-' : '') + ip + (fp ? '.' + fp : '');
  }
  function shiftDec(s, k) {
    const neg = s[0] === '-', [ip, fp = ''] = (neg ? s.slice(1) : s).split('.'), f = fp.padEnd(k, '0');
    const out = (ip + f.slice(0, k)).replace(/^0+(?=\d)/, '') + (f.length > k ? '.' + f.slice(k) : '');
    return (neg ? '-' : '') + out.replace(/\.0+$/, '');
  }
  const isoDate = (s, order) => CELL.isoDate(s, order);

  const mod97 = s => { const r = s.replace(/\s/g, ''), x = (r.slice(4) + r.slice(0, 4)).replace(/[A-Z]/g, c => c.charCodeAt(0) - 55); let m = 0; for (const c of x) m = (m * 10 + +c) % 97; return m === 1; };
  function validate(type, raw, order) {
    if (type === 'card') return luhn(raw) ? 'Luhn checksum ok' : 'fails Luhn';
    if (type === 'iban') return mod97(raw) ? 'mod-97 ok' : 'fails mod-97';
    if (type === 'ip') return raw.split('.').every(o => +o <= 255) ? 'valid octets' : 'octet > 255';
    if (type === 'email') return /^[^.][\w.+-]*[^.]@[\w-]+(\.[\w-]+)*\.[a-z]{2,}$/i.test(raw) && !raw.includes('..') ? 'well-formed' : 'malformed';
    if (type === 'date') { const v = CELL.date(raw, order).status; return v === 'valid' ? 'calendar-valid' : v === 'impossible' ? 'impossible date' : 'ambiguous'; }
    if (type === 'coord') { const [a, b] = raw.split(',').map(Number); return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? 'in range' : 'out of range'; }
    return '';
  }

  function unitOf(raw) { const n = numIn(raw); return [n, raw.slice(raw.indexOf(n) + n.length).trim().toLowerCase().replace(/\s+/g, ' ')]; }
  function si(raw) {
    const [n, u] = unitOf(raw), m = U[u] || U[u.replace(/\s/g, '')]; if (!m) return { dim: '', v: '', u };
    const v = parseNum(n), f = m[1];
    const out = f === 'C' ? v : f === 'F' ? (v - 32) * 5 / 9 : v * f;
    return { dim: m[0], v: fmt(out) + ' ' + m[2], u };
  }
  function money(raw) {
    const n = numIn(raw), rest = raw.replace(n, ' ').trim(), sym = (rest.match(new RegExp(CURS + '|dollars?|euros?', 'i')) || [''])[0];
    let v = canon(n); if (/\d\s?k$/i.test(raw)) v = shiftDec(v, 3); if (/\d\s?m$/i.test(raw)) v = shiftDec(v, 6);
    return [v, CELL.curCode(sym)];
  }
  function expand(t) {
    if (t.type === 'money') { const [a, c] = money(t.raw); return [['', a], [' currency', c]]; }
    if (t.type === 'qty') { const s = si(t.raw); return [['', canon(numIn(t.raw))], [' unit', s.u], [' (SI)', s.v]]; }
    if (t.type === 'percent') return [[' %', canon(numIn(t.raw))]];
    if (t.type === 'num') return [['', canon(t.raw)]];
    if (t.type === 'dims') { const [w, h] = t.raw.split(/[x×]/i); return [[' width', canon(w)], [' height', canon(h)]]; }
    if (t.type === 'date') return [['', isoDate(t.raw, 'keep')]];
    return [['', t.raw]];
  }

  const PLAIN_NUM = /^-?\d{1,12}(?:\.\d{1,12})?$/, PLAIN_WORD = /^\p{L}+$/u;
  const push = (map, k, v) => { const a = map.get(k); if (a) a.push(v); else map.set(k, [v]); };
  function tokenize(line) {
    if (PLAIN_NUM.test(line)) return [{ type: 'num', raw: line, i: 0 }];
    if (PLAIN_WORD.test(line)) return [{ type: 'text', raw: line, i: 0 }];
    let rest = line; const toks = [];
    for (const [type, re, need, verify] of TOK) {
      if (need && (typeof need === 'string' ? !line.includes(need) : !need.test(line))) continue;
      re.lastIndex = 0;
      rest = rest.replace(re, (m, ...a) => { if (verify && !verify(m)) return m; const idx = a.find(x => typeof x === 'number'); toks.push({ type, raw: m.trim(), i: idx }); return ' '.repeat(m.length); });
    }
    for (const m of rest.matchAll(/[\p{L}][\p{L}\p{M}\p{N}'’.&\/-]*/gu)) toks.push({ type: 'text', raw: m[0].replace(/[.\/-]+$/, ''), i: m.index });
    toks.sort((a, b) => a.i - b.i);
    const out = [];
    toks.forEach(t => { const p = out[out.length - 1]; if (t.type === 'text' && p && p.type === 'text') p.raw += ' ' + t.raw; else out.push({ ...t }); });
    return out;
  }

  const shapeOf = it => {
    if (it.shape !== undefined) return it.shape;
    if (/[\t|;,]/.test(it.raw)) return it.shape = ['\t', '|', ';', ','].map(d => it.raw.split(d).length - 1).join('.');
    const t = tokenize(it.l);
    return it.shape = t.some(x => x.type !== 'text') ? t.map(x => x.type).join(' ') : null;
  };

  function clean(text) {
    const ev = [], items = []; let blank = 0, html = 0, run = 0;
    text.split(/\r?\n/).forEach(line => {
      if (/<[^>]+>|&nbsp;|&amp;/.test(line)) html++;
      const raw = line.replace(/[​-‍﻿­]/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&');
      let l = raw.replace(/\s+$/, '').replace(/^\s+/, '');
      if (!/\t|\||;[^;]*;/.test(raw)) l = l.replace(BULLET, '');
      const junk = (why, x) => { run++; ev.push(Object.assign({ junk: [l, why] }, x)); };
      if (!l.trim()) { blank++; run++; ev.push({ gap: true }); return; }
      if (/^[\s\-=_*#~.•·|+:<>\/\\]{3,}$/.test(l)) return junk('divider', MD_DIV.test(l) ? { md: true } : { cut: true });
      if (!/[\p{L}\p{N}]/u.test(l)) return junk('no letters or digits');
      if (BOILER.test(l.trim())) return junk('boilerplate', { cut: true });
      const key = raw.includes('\t') ? raw.toLowerCase().replace(/[^\S\t]+/g, ' ').replace(/^ +| +$/g, '') : l.toLowerCase().replace(/\s+/g, ' ');
      const it = { l, raw, key, run, ix: items.length };
      items.push(it); ev.push(it);
    });
    const stretch = it => {
      const sh = shapeOf(it); if (sh === null) return 0;
      let a = it.ix, b = it.ix;
      while (a > 0 && items[a - 1].run === it.run && shapeOf(items[a - 1]) === sh) a--;
      while (b < items.length - 1 && items[b + 1].run === it.run && shapeOf(items[b + 1]) === sh) b++;
      return b - a + 1;
    };
    const kept = [], rawKept = [], removed = [], brk = [], divs = [], dups = new Map(), last = new Map(); let gap = false, prevCaps = false;
    ev.forEach(e => {
      if (e.junk) { removed.push(e.junk); if (e.md) divs.push(kept.length); else if (e.cut) gap = true; return; }
      if (e.gap) { gap = true; return; }
      const p = last.get(e.key);
      if (p) {
        if (p.run !== e.run || shapeOf(p) !== shapeOf(e) || stretch(e) < 3) { removed.push([e.l, 'duplicate']); return; }
        dups.set(kept.length, p.at);
      }
      e.at = kept.length; last.set(e.key, e);
      const caps = CAPS.test(e.l) && !e.raw.includes('\t');
      kept.push(e.l); rawKept.push(e.raw); brk.push(gap || (caps && !prevCaps)); gap = false; prevCaps = caps;
    });
    return { kept, raw: rawKept, removed, blank, html, brk, divs, dups };
  }

  function segment(n, brk) {
    const out = []; let s = 0;
    for (let i = 1; i < n; i++) if (brk[i]) { out.push([s, i]); s = i; }
    if (n) out.push([s, n]);
    return out;
  }

  function splitCells(line, d) {
    if (!line.includes('"')) return line.split(d);
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
      if (c === '"' && cur.trim() === '') { q = true; cur = ''; continue; }
      if (c === d) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    return q ? line.split(d) : (out.push(cur), out);
  }
  const wordsIn = c => { const t = c.trim(); return t ? t.split(/\s+/).length : 0; };
  function prosy(rows) {
    let all = 0, long = 0;
    rows.forEach(r => r.forEach(c => { all++; if (wordsIn(c) >= 4) long++; }));
    return long * 2 > all;
  }
  function rejoin(cells, want) {
    const out = [];
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i].trim();
      if (/^[-+]?\d{1,3}$/.test(c)) {
        let j = i, s = c;
        while (j + 1 < cells.length && /^\d{3}(?:\.\d+)?$/.test(cells[j + 1].trim()) && !s.includes('.')) { s += ',' + cells[j + 1].trim(); j++; }
        if (j > i) { out.push(s); i = j; continue; }
      }
      out.push(c);
    }
    return out.length === want ? out : null;
  }
  const YEAR = /^(?:19\d\d|20\d\d|2100)$/;
  function headerAt(rows) {
    const body = rows.slice(1, 201), w = rows[0].length;
    let differ = 0, num0 = 0;
    for (let j = 0; j < w; j++) {
      const cnt = { num: 0, date: 0, text: 0 }; let years = 0, nb = 0;
      body.forEach(r => { const v = String(r[j] ?? '').trim(), k = CELL.kindOf(v); if (k === 'empty') return; cnt[k]++; nb++; if (YEAR.test(v)) years++; });
      const kb = nb === 0 || cnt.text * 2 >= nb ? 'text' : cnt.num >= cnt.date ? 'num' : 'date', v0 = String(rows[0][j] ?? '').trim(), raw0 = CELL.kindOf(v0);
      let k0 = raw0;
      if (k0 === 'num' && YEAR.test(v0) && years * 2 < Math.max(1, nb)) k0 = 'text';
      if (raw0 === 'num' || raw0 === 'date') num0++;
      if (k0 !== 'empty' && k0 !== kb) differ++;
    }
    return differ * 2 >= w || num0 === 0;
  }
  const colHead = (h, k) => h || 'Column ' + (k + 1);

  function alignedCells(lines) {
    const N = lines.length, W = Math.max(...lines.map(l => l.length)), need = Math.ceil(.9 * N), ws = new Array(W).fill(false);
    for (let p = 0; p < W; p++) { let c = 0; for (const l of lines) if (p >= l.length || /\s/.test(l[p])) c++; ws[p] = c >= need; }
    let starts = [], p = 0;
    while (p < W && ws[p]) p++;
    if (p < W) starts.push(0);
    while (p < W) {
      let g = p; while (g < W && !ws[g]) g++;
      let h = g; while (h < W && ws[h]) h++;
      if (h < W && h - g >= 2) starts.push(h);
      p = h;
    }
    const cut = st => lines.map(l => st.map((a, k) => l.slice(a, k + 1 < st.length ? st[k + 1] : undefined).trim()));
    let cells = cut(starts);
    for (let k = starts.length - 1; k >= 1; k--) {
      if (cells.filter(r => r[k]).length * 2 < N) { starts = starts.filter((_, i) => i !== k); cells = cut(starts); }
    }
    return starts.length >= 2 ? cells : null;
  }

  const sigOf = ts => ts.map(t => t.type).join(' ');
  const coreOf = ts => ts.filter(t => t.type !== 'text').map(t => t.type).join(' ');
  function runsOf(idx) {
    const runs = []; let cur = [];
    idx.forEach(i => { if (cur.length && i - cur[cur.length - 1] > 2) { runs.push(cur); cur = []; } cur.push(i); });
    if (cur.length) runs.push(cur);
    return runs;
  }
  function templateOf(run, toks) {
    return toks[run[0]].map((t, j) => t.type !== 'text' ? '{' + TYPE[t.type] + '}' : run.every(i => toks[i][j].raw === t.raw) ? t.raw : '{Text}').join(' ');
  }

  function dedupe(head) { const c = {}; return head.map(h => { c[h] = (c[h] || 0) + 1; return c[h] > 1 ? h + ' ' + c[h] : h; }); }
  function foldConst(t) {
    if (t.rows.length < 2) return t;
    const keep = [], head = [...t.head]; let carry = '', base = null, label = '';
    t.head.forEach((h, i) => {
      const vals = t.rows.map(r => String(r[i] ?? '')), same = vals.every(v => v === vals[0]);
      if (same && /^Text/.test(h) && vals[0] && /\p{L}/u.test(vals[0])) { carry += (carry ? ' ' : '') + vals[0]; return; }
      const sub = h.match(/^(.*?)( unit| currency| \(SI\)| %)( \d+)?$/);
      if (sub && base !== null && sub[1] === base) head[i] = label + sub[2];
      else if (carry) { base = h.replace(/ \d+$/, ''); label = carry.replace(/^\p{Ll}/u, c => c.toUpperCase()); head[i] = label; carry = ''; }
      else base = null;
      keep.push(i);
    });
    t.head = dedupe(keep.map(i => head[i])); t.rows = t.rows.map(r => keep.map(i => r[i]));
    return t;
  }
  function dropEmpty(t) { const keep = t.head.map((_, i) => t.rows.some(r => r[i] !== '' && r[i] != null)); t.head = t.head.filter((_, i) => keep[i]); t.rows = t.rows.map(r => r.filter((_, i) => keep[i])); return t; }
  const NUMERIC_TYPES = new Set(['', 'Number', 'Amount', 'Percent', 'Quantity']);
  function typeCols(t) {
    const cc = t.head.map((_, i) => CELL.column(t.rows.map(r => r[i])));
    Object.defineProperty(t, 'cc', { value: cc, configurable: true, writable: true });
    t.types = t.head.map((_, i) => {
      const c = {}; let n = 0;
      t.rows.forEach(r => { const v = String(r[i] ?? '').trim(); if (!v) return; n++; const tk = tokenize(v), ty = tk.length === 1 ? tk[0].type : tk.length ? 'mixed' : ''; c[ty] = (c[ty] || 0) + 1; });
      const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0], ty = top && top[1] >= n * .6 && TYPE[top[0]] ? TYPE[top[0]] : '', k = cc[i];
      if (k.kind === 'date' && (ty === '' || ty === 'Date')) return 'Date';
      if (k.kind === 'num' && NUMERIC_TYPES.has(ty)) return ty && ty !== 'Number' ? ty : k.cur ? 'Amount' : k.pct ? 'Percent' : k.unit ? 'Quantity' : 'Number';
      return ty;
    });
    const notes = [];
    if (cc.some(k => k.kind === 'num' && k.locale === 'comma')) notes.push('decimal comma');
    if (cc.some(k => k.kind === 'date' && k.dateOrder === 'ambiguous')) notes.push('dates could be day/month or month/day');
    if (notes.length) t.pattern += ' · ' + notes.join(' · ');
  }

  function analyze(src) {
    const { kept, raw, removed, blank, html, brk, dups, divs } = clean(src);
    const n = kept.length, toks = kept.map(tokenize), numLine = kept.map(NUMS.isNumberLine), used = new Set(), tables = [];
    const blocks = segment(n, brk), blockOf = new Int32Array(n);
    blocks.forEach(([a, b], k) => { for (let i = a; i < b; i++) blockOf[i] = k; });
    const free = i => !used.has(i);
    const claim = (t, idx) => { idx.forEach(i => used.add(i)); t.owned = idx.slice().sort((x, y) => x - y); tables.push(t); return t; };
    const headingFor = first => { const h = first - 1; return h >= 0 && blockOf[h] === blockOf[first] && h === blocks[blockOf[h]][0] && free(h) && CAPS.test(kept[h]) && !raw[h].includes('\t') ? h : -1; };
    const misfit = (li, reason) => ({ line: li + 1, text: kept[li], reason });

    divs.forEach(at => {
      if (at < 1 || at >= n || blockOf[at - 1] !== blockOf[at] || !free(at - 1) || !free(at) || !kept[at - 1].includes('|') || !kept[at].includes('|')) return;
      const end = blocks[blockOf[at]][1], pipes = l => splitCells(l.replace(/^\s*\||\|\s*$/g, ''), '|').map(c => c.trim());
      const head = pipes(kept[at - 1]), W = head.length, rows = [], lineOf = [], misfits = [], lines = [at - 1];
      for (let i = at; i < end && free(i) && kept[i].includes('|'); i++) {
        const c = pipes(kept[i]); lines.push(i);
        if (c.length > W) misfits.push(misfit(i, c.length + ' cells, expected ' + W));
        else { rows.push(c.concat(Array(W - c.length).fill(''))); lineOf.push(i); }
      }
      if (W < 2 || !rows.length) return;
      const hi = headingFor(at - 1);
      claim({ title: hi >= 0 ? kept[hi] : 'Markdown table', pattern: 'markdown pipe table · ' + W + ' columns', head: dedupe(head.map(colHead)), rows, lineOf, misfits }, hi >= 0 ? [hi, ...lines] : lines);
    });

    const DELIMS = [['\t', 'tab'], ['|', 'pipe'], [';', 'semicolon'], [',', 'comma']];
    blocks.forEach(([a, b]) => DELIMS.forEach(([d, name]) => {
      const cache = new Map();
      const cellsOf = i => {
        let c = cache.get(i);
        if (c === undefined) {
          const s = d === '\t' ? raw[i] : kept[i];
          c = s.includes(d) ? splitCells(d === '|' ? s.replace(/^\s*\||\|\s*$/g, '') : s, d) : null;
          cache.set(i, c && c.length >= 2 ? c : null);
          c = cache.get(i);
        }
        return c;
      };
      let i = a;
      while (i < b) {
        if (!free(i) || !cellsOf(i)) { i++; continue; }
        const lines = [i]; let j = i + 1;
        while (j < b && free(j)) {
          if (cellsOf(j)) lines.push(j);
          else if (j + 1 < b && free(j + 1) && cellsOf(j + 1)) lines.push(j);
          else break;
          j++;
        }
        const sentence = li => { const c = cellsOf(li); return !!c && c.every(x => wordsIn(x) >= 3); }, short = li => { const c = cellsOf(li); return !c || c.every(x => wordsIn(x) < 3); };
        while (lines.length > 3 && sentence(lines[lines.length - 1]) && lines.slice(0, -1).every(short)) lines.pop();
        while (lines.length > 3 && sentence(lines[0]) && lines.slice(1).every(short)) lines.shift();
        const freq = new Map();
        lines.forEach(li => { const c = cellsOf(li); if (c) freq.set(c.length, (freq.get(c.length) || 0) + 1); });
        const M = [...freq.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0], rows = [], rowLine = [], misfits = [];
        lines.forEach(li => {
          const c = cellsOf(li);
          if (!c) { misfits.push(misfit(li, 'no ' + name + ' delimiter')); return; }
          let r = null;
          if (c.length === M) r = c;
          else if (c.length < M && c.length >= Math.max(2, Math.ceil(M * 2 / 3))) r = c.concat(Array(M - c.length).fill(''));
          else if (c.length > M && d === ',') r = rejoin(c, M);
          if (r) { rows.push(r.map(x => x.trim())); rowLine.push(li); } else misfits.push(misfit(li, c.length + ' cells, expected ' + M));
        });
        const allNum = lines.every(li => numLine[li]);
        const ok = rows.length >= 3 && rows.length >= .6 * lines.length && !(allNum && d === ',' && lines.some(li => kept[li].includes(', '))) && !((d === ',' || d === ';') && prosy(rows));
        if (!ok) { i = j; continue; }
        const hdr = headerAt(rows), body = hdr ? rows.slice(1) : rows, lineOf = hdr ? rowLine.slice(1) : rowLine, hi = headingFor(lines[0]);
        const t = { title: hi >= 0 ? kept[hi] : 'Delimited table', pattern: name + ' separated · ' + M + ' columns', head: dedupe(rows[0].map((h, k) => hdr ? colHead(h, k) : 'Column ' + (k + 1))), rows: body, lineOf, misfits };
        if (allNum) t.alsoReadableAs = lines.length + ' separate number lists';
        claim(t, hi >= 0 ? [hi, ...lines] : lines);
        i = j;
      }
    }));

    blocks.forEach(([a, b]) => {
      const ok = i => free(i) && !numLine[i] && !raw[i].includes('\t') && /\S\s+\S/.test(raw[i]);
      let i = a;
      while (i < b) {
        if (!ok(i)) { i++; continue; }
        let j = i; while (j < b && ok(j)) j++;
        if (j - i >= 3) {
          const idx = []; for (let k = i; k < j; k++) idx.push(k);
          const cells = alignedCells(idx.map(k => raw[k].replace(/\s+$/, '')));
          if (cells && !prosy(cells)) {
            const hdr = headerAt(cells), body = hdr ? cells.slice(1) : cells, hi = headingFor(i);
            claim({ title: hi >= 0 ? kept[hi] : 'Aligned columns', pattern: 'aligned columns · ' + cells[0].length + ' columns', head: dedupe(cells[0].map((h, k) => hdr ? colHead(h, k) : 'Column ' + (k + 1))), rows: body, lineOf: hdr ? idx.slice(1) : idx, misfits: [] }, hi >= 0 ? [hi, ...idx] : idx);
          }
        }
        i = j;
      }
    });

    const kv = [];
    kept.forEach((l, i) => { if (!free(i)) return; const m = kvOf(l); if (m && !/^(https?|www|ftp)$/i.test(m[0]) && m[0].split(/\s+/).length <= 5) kv.push({ i, k: m[0], v: m[1] }); });
    if (kv.length >= 2) {
      const bl = []; let cur = null, last = -2;
      kv.forEach(x => { const key = x.k.toLowerCase(); if (!cur || x.i !== last + 1 || brk[x.i] || cur.has(key)) { cur = new Map(); cur.lines = []; bl.push(cur); } cur.set(key, x); cur.lines.push(x.i); last = x.i; });
      const kvSig = b => [...b.keys()].sort().join('|'), bySig = new Map();
      bl.forEach(b => push(bySig, kvSig(b), b));
      const loose = [];
      bySig.forEach(bs => {
        if (bs.length >= 2 && bs[0].size >= 2) {
          const keys = [...bs[0].values()].map(x => [x.k.toLowerCase(), x.k]);
          claim({ title: 'Records', pattern: 'Repeating key:value blocks · ' + bs.length + ' records × ' + keys.length + ' fields', head: keys.map(k => k[1]), rows: bs.map(b => keys.map(k => b.get(k[0]) ? b.get(k[0]).v : '')), lineOf: bs.map(b => b.lines[0]), misfits: [] }, bs.flatMap(b => b.lines));
        } else bs.forEach(b => loose.push(...b.values()));
      });
      if (loose.length >= 2) {
        loose.sort((x, y) => x.i - y.i);
        const rows = loose.map(x => { const t = tokenize(x.v).find(t => t.type !== 'text'), e = t ? expand(t) : []; return [x.k, x.v, t ? TYPE[t.type] : 'Text', e[0] ? e[0][1] : x.v, e[1] ? e[1][1] : '', t && t.type === 'qty' ? e[2][1] : '']; });
        const idx = loose.map(x => x.i), t = dropEmpty({ title: 'Key–value pairs', pattern: loose.length + ' fields', head: ['Key', 'Raw value', 'Detected type', 'Value', 'Unit / currency', 'SI value'], rows, lineOf: idx, misfits: [] });
        if (new Set(idx.map(i => sigOf(toks[i]))).size === 1 && toks[idx[0]].some(x => x.type !== 'text') && idx.every(i => !numLine[i])) t.alsoReadableAs = 'a repeating line pattern: ' + templateOf(idx, toks);
        claim(t, idx);
      }
    }

    const units = (pool, keyOf, mergeKey) => {
      const groups = new Map(); pool.forEach(i => push(groups, keyOf(toks[i]), i));
      const merged = new Map();
      groups.forEach(g => runsOf(g).forEach(r => { const k = mergeKey(r); const m = merged.get(k); if (m) m.push(...r); else merged.set(k, r.slice()); }));
      return [...merged.values()].filter(u => u.length >= 2).sort((x, y) => y.length - x.length || x[0] - y[0]);
    };
    const poolOf = (a, b) => { const out = []; for (let i = a; i < b; i++) if (free(i) && !numLine[i] && toks[i].some(t => t.type !== 'text')) out.push(i); return out; };
    blocks.forEach(([a, b]) => {
      units(poolOf(a, b), sigOf, r => sigOf(toks[r[0]]) + '\u0000' + templateOf(r, toks)).forEach(u => {
        if (u.some(i => !free(i))) return;
        const slots = toks[u[0]], prev = u[0] - 1;
        let hdr = null;
        if (prev >= a && free(prev) && toks[prev].every(t => t.type === 'text')) {
          const parts = kept[prev].split(/\t|\s{2,}|\s*[|,;]\s*/).filter(Boolean), words = kept[prev].trim().split(/\s+/);
          hdr = parts.length === slots.length ? parts : words.length === slots.length ? words : null;
        }
        const head = dedupe(slots.flatMap((t, j) => expand(t).map(([suf]) => (hdr ? hdr[j] : TYPE[t.type]) + suf)));
        const vertical = !hdr && slots.length === 1 && slots[0].type === 'num' && u.every(i => PLAIN_NUM.test(kept[i])), hi = hdr ? -1 : headingFor(u[0]);
        const title = hdr ? 'Table under “' + kept[prev].trim().slice(0, 40) + '”' : hi >= 0 ? kept[hi] : vertical ? 'Number list (one per line)' : 'Repeating line pattern';
        claim(foldConst(dropEmpty({ title, pattern: templateOf(u, toks) + ' — ' + u.length + ' lines share this shape', head, rows: u.map(i => toks[i].flatMap(t => expand(t).map(x => x[1]))), lineOf: u.slice(), misfits: [] })), hdr ? [prev, ...u] : hi >= 0 ? [hi, ...u] : u);
      });
    });
    blocks.forEach(([a, b]) => {
      units(poolOf(a, b), coreOf, r => coreOf(toks[r[0]])).forEach(u => {
        if (u.some(i => !free(i))) return;
        const k = coreOf(toks[u[0]]), typed = toks[u[0]].filter(t => t.type !== 'text');
        const head = dedupe(['Label', ...typed.flatMap(t => expand(t).map(([suf]) => TYPE[t.type] + suf))]);
        claim(dropEmpty({ title: 'Similar lines', pattern: k.split(' ').map(x => TYPE[x]).join(' · ') + ' with varying labels — ' + u.length + ' lines', head, rows: u.map(i => [toks[i].filter(t => t.type === 'text').map(t => t.raw).join(' '), ...toks[i].filter(t => t.type !== 'text').flatMap(t => expand(t).map(x => x[1]))]), lineOf: u.slice(), misfits: [] }), u);
      });
    });

    tables.forEach(t => {
      typeCols(t);
      const at = new Map(t.lineOf.map((li, r) => [li, r]));
      t.dups = t.lineOf.flatMap((li, r) => dups.has(li) && at.has(dups.get(li)) ? [{ row: r, of: at.get(dups.get(li)) }] : []);
    });
    const ent = new Map(), dims = {}, order = CELL.dateOrder(toks.flatMap(ts => ts.filter(t => t.type === 'date').map(t => t.raw)));
    toks.forEach((ts, li) => ts.forEach(t => {
      if (t.type === 'qty') { const s = si(t.raw); if (s.dim) dims[s.dim] = (dims[s.dim] || 0) + 1; }
      if (t.type === 'text' || t.type === 'num') return;
      const norm = t.type === 'money' ? money(t.raw).join(' ') : t.type === 'qty' ? si(t.raw).v : t.type === 'date' ? isoDate(t.raw, order) : t.type === 'email' || t.type === 'url' ? t.raw.toLowerCase() : t.raw;
      const key = t.type + '|' + norm, e = ent.get(key) || { type: TYPE[t.type], raw: t.raw, norm, check: validate(t.type, t.raw, order), count: 0, lines: [] };
      e.count++; if (e.lines.length < 8) e.lines.push(li + 1); ent.set(key, e);
    }));
    const prose = kept.filter((l, i) => free(i) && toks[i].every(t => t.type === 'text'));
    const singles = kept.filter((l, i) => free(i) && !numLine[i] && toks[i].some(t => t.type !== 'text'));
    return { kept, removed, blank, html, tables, singles, entities: [...ent.values()], dims, prose, pairs: kv.map(x => ({ k: x.k, v: x.v, line: x.i + 1 })), used: [...used], blocks };
  }

  return { analyze, TYPE, parseNum, isoDate };
})();
