const TXT = (() => {
  const U = {};
  const add = (dim, si, f, ...names) => names.forEach(n => U[n] = [dim, f, si]);
  add('mass', 'kg', 1, 'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms');
  add('mass', 'kg', .001, 'g', 'gr', 'gram', 'grams');
  add('mass', 'kg', 1e-6, 'mg');
  add('mass', 'kg', .45359, 'lb', 'lbs', 'pound', 'pounds');
  add('mass', 'kg', .02835, 'oz', 'ounce', 'ounces');
  add('mass', 'kg', 1000, 'ton', 'tons', 'tonne', 'tonnes');
  add('length', 'm', 1000, 'km', 'kilometer', 'kilometers', 'kilometre', 'kilometres');
  add('length', 'm', 1, 'm', 'meter', 'meters', 'metre', 'metres');
  add('length', 'm', .01, 'cm');
  add('length', 'm', .001, 'mm');
  add('length', 'm', 1609.34, 'mi', 'mile', 'miles');
  add('length', 'm', .3048, 'ft', 'feet', 'foot');
  add('length', 'm', .0254, 'inch', 'inches');
  add('area', 'm²', 1, 'm2', 'm²', 'sqm');
  add('area', 'm²', .0929, 'sqft', 'sq ft', 'ft2', 'ft²');
  add('volume', 'L', 1, 'l', 'liter', 'liters', 'litre', 'litres', 'ltr');
  add('volume', 'L', .001, 'ml');
  add('volume', 'L', 3.78541, 'gal', 'gallon', 'gallons');
  add('speed', 'm/s', .27778, 'km/h', 'kmh', 'kph');
  add('speed', 'm/s', .44704, 'mph');
  add('time', 's', .001, 'ms');
  add('time', 's', 1, 's', 'sec', 'secs', 'second', 'seconds');
  add('time', 's', 60, 'min', 'mins', 'minute', 'minutes');
  add('time', 's', 3600, 'h', 'hr', 'hrs', 'hour', 'hours');
  add('time', 's', 86400, 'day', 'days');
  add('time', 's', 604800, 'wk', 'week', 'weeks');
  add('time', 's', 2629800, 'month', 'months');
  add('time', 's', 31557600, 'yr', 'yrs', 'year', 'years');
  add('data', 'B', 1, 'bytes');
  add('data', 'B', 1e3, 'kb');
  add('data', 'B', 1e6, 'mb');
  add('data', 'B', 1e9, 'gb');
  add('data', 'B', 1e12, 'tb');
  add('bitrate', 'bit/s', 1e3, 'kbps');
  add('bitrate', 'bit/s', 1e6, 'mbps');
  add('bitrate', 'bit/s', 1e9, 'gbps');
  add('frequency', 'Hz', 1, 'hz');
  add('frequency', 'Hz', 1e3, 'khz');
  add('frequency', 'Hz', 1e6, 'mhz');
  add('frequency', 'Hz', 1e9, 'ghz');
  add('power', 'W', 1, 'w', 'watt', 'watts');
  add('power', 'W', 1e3, 'kw');
  add('energy', 'J', 3.6e6, 'kwh');
  add('energy', 'J', 4184, 'kcal');
  add('voltage', 'V', 1, 'v', 'volt', 'volts');
  add('charge', 'mAh', 1, 'mah');
  add('temperature', '°C', 'C', '°c', 'celsius');
  add('temperature', '°C', 'F', '°f', 'fahrenheit');
  add('count', 'pcs', 1, 'pcs', 'pc', 'pieces', 'piece', 'items', 'item', 'units', 'x');
  add('pixels', 'px', 1, 'px');
  add('rate', 'fps', 1, 'fps');
  add('density', 'dpi', 1, 'dpi');

  const rx = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const NUM = '-?(?:\\d{1,3}(?:\\.\\d{3})+,\\d+|\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d+)?)';
  const UNITS = Object.keys(U).sort((a, b) => b.length - a.length).map(rx).join('|').replace(/sq ft/, 'sq\\s?ft');
  const CUR = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', dollar: 'USD', dollars: 'USD', euro: 'EUR', euros: 'EUR' };
  const CURS = '[$€£¥₹]|USD|EUR|GBP|JPY|INR|AED|SAR|EGP|CAD|AUD|CHF|CNY';
  const DIGIT = /\d/;
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
    ['card', /\b(?:\d[ -]?){12,18}\d\b/gu, DIGIT],
    ['phone', /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/gu, DIGIT],
    ['hashtag', /(?<![\w])#[\p{L}\w]+/gu, '#'],
    ['mention', /(?<![\w])@[\w.]+/gu, '@'],
    ['id', /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9]+(?:-[A-Z0-9]+)+\b|\b[A-Z]{2,}\d{3,}\b/gu, DIGIT],
    ['money', new RegExp('(?:(?:' + CURS + ')\\s?' + NUM + '(?:\\s?[km](?![\\p{L}]))?|' + NUM + '\\s?(?:' + CURS + '|dollars?|euros?)(?![\\p{L}]))', 'giu'), DIGIT],
    ['percent', new RegExp(NUM + '\\s?%', 'gu'), '%'],
    ['qty', new RegExp(NUM + '\\s?(?:' + UNITS + ')(?![\\p{L}\\p{N}])', 'giu'), DIGIT],
    ['num', new RegExp('(?<![\\p{L}\\d])' + NUM, 'gu'), DIGIT]
  ];
  const TYPE = { card: 'Card number', uuid: 'UUID', iban: 'IBAN', coord: 'Coordinates', color: 'Colour', version: 'Version', text: 'Text', url: 'URL', email: 'Email', ip: 'IP', date: 'Date', time: 'Time', phone: 'Phone', hashtag: 'Hashtag', mention: 'Mention', id: 'ID', money: 'Amount', percent: 'Percent', qty: 'Quantity', num: 'Number' };
  const BOILER = /^(sent from my|unsubscribe|click here|view (this )?in (your )?browser|all rights reserved|copyright|©|privacy policy|terms (of|&) (use|service)|we use cookies|accept (all )?cookies|follow us|share this|advertisement|sponsored|read more$|skip to (main )?content|back to top|page \d+ (of|\/) \d+$|loading\.*$|show more$|reply$|like$|forwarded message)/i;
  const KV = /^([\p{L}][\p{L}\p{N} _.\/()#&'-]{0,40}?)\s*[:=]\s*(\S.*)$/u;

  const parseNum = s => { s = s.trim(); if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return +s.replace(/\./g, '').replace(',', '.'); if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return +s.replace(/,/g, ''); return +s.replace(',', '.'); };
  const numIn = s => (s.match(new RegExp(NUM)) || [''])[0];
  const fmt = v => Number.isFinite(v) ? +v.toPrecision(8) : '';
  const isoDate = s => { if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s; if (/[a-z]/i.test(s)) { const d = new Date(s.replace(/(\d)(st|nd|rd|th)/i, '$1').replace(',', '')); if (!isNaN(d)) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } return s; };

  const luhn = s => { const d = s.replace(/\D/g, ''); let t = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } t += n; } return t % 10 === 0; };
  const mod97 = s => { const r = s.replace(/\s/g, ''), x = (r.slice(4) + r.slice(0, 4)).replace(/[A-Z]/g, c => c.charCodeAt(0) - 55); let m = 0; for (const c of x) m = (m * 10 + +c) % 97; return m === 1; };
  const realDate = s => { const iso = isoDate(s), m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return d.getMonth() === m[2] - 1 && d.getDate() === +m[3]; };
  function validate(type, raw) {
    if (type === 'card') return luhn(raw) ? 'Luhn checksum ok' : 'fails Luhn';
    if (type === 'iban') return mod97(raw) ? 'mod-97 ok' : 'fails mod-97';
    if (type === 'ip') return raw.split('.').every(o => +o <= 255) ? 'valid octets' : 'octet > 255';
    if (type === 'email') return /^[^.][\w.+-]*[^.]@[\w-]+(\.[\w-]+)*\.[a-z]{2,}$/i.test(raw) && !raw.includes('..') ? 'well-formed' : 'malformed';
    if (type === 'date') { const v = realDate(raw); return v === null ? 'ambiguous' : v ? 'calendar-valid' : 'impossible date'; }
    if (type === 'coord') { const [a, b] = raw.split(',').map(Number); return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? 'in range' : 'out of range'; }
    return '';
  }

  function unitOf(raw) { const n = numIn(raw); return [n, raw.slice(raw.indexOf(n) + n.length).trim().toLowerCase().replace(/\s+/g, ' ')]; }
  function si(raw) {
    const [n, u] = unitOf(raw), m = U[u] || U[u.replace(/\s/g, '')]; if (!m) return { dim: '', v: '', u };
    const v = parseNum(n), f = m[1];
    const out = f === 'C' ? v : f === 'F' ? (v - 32) * 5 / 9 : v * f;
    return { dim: m[0], v: fmt(out) + ' ' + m[2], u, n: parseNum(n) };
  }
  function money(raw) {
    const n = numIn(raw), rest = raw.replace(n, ' ').trim(), sym = (rest.match(new RegExp(CURS + '|dollars?|euros?', 'i')) || [''])[0];
    let v = parseNum(n); if (/\d\s?k$/i.test(raw)) v *= 1e3; if (/\d\s?m$/i.test(raw)) v *= 1e6;
    return [fmt(v), CUR[sym.toLowerCase()] || CUR[sym] || sym.toUpperCase()];
  }
  function expand(t) {
    if (t.type === 'money') { const [a, c] = money(t.raw); return [['', a], [' currency', c]]; }
    if (t.type === 'qty') { const s = si(t.raw); return [['', s.n ?? parseNum(numIn(t.raw))], [' unit', s.u], [' (SI)', s.v]]; }
    if (t.type === 'percent') return [[' %', fmt(parseNum(numIn(t.raw)))]];
    if (t.type === 'num') return [['', fmt(parseNum(t.raw))]];
    if (t.type === 'date') return [['', isoDate(t.raw)]];
    return [['', t.raw]];
  }

  const PLAIN_NUM = /^-?\d{1,12}(?:\.\d{1,12})?$/, PLAIN_WORD = /^\p{L}+$/u;
  const push = (map, k, v) => { const a = map.get(k); if (a) a.push(v); else map.set(k, [v]); };
  function tokenize(line) {
    if (PLAIN_NUM.test(line)) return [{ type: 'num', raw: line, i: 0 }];
    if (PLAIN_WORD.test(line)) return [{ type: 'text', raw: line, i: 0 }];
    let rest = line; const toks = [];
    for (const [type, re, need] of TOK) {
      if (need && (typeof need === 'string' ? !line.includes(need) : !need.test(line))) continue;
      re.lastIndex = 0;
      rest = rest.replace(re, (m, ...a) => { const idx = a.find(x => typeof x === 'number'); toks.push({ type, raw: m.trim(), i: idx }); return ' '.repeat(m.length); });
    }
    for (const m of rest.matchAll(/[\p{L}][\p{L}\p{M}\p{N}'’.&\/-]*/gu)) toks.push({ type: 'text', raw: m[0].replace(/[.\/-]+$/, ''), i: m.index });
    toks.sort((a, b) => a.i - b.i);
    const out = [];
    toks.forEach(t => { const p = out[out.length - 1]; if (t.type === 'text' && p && p.type === 'text') p.raw += ' ' + t.raw; else out.push({ ...t }); });
    return out;
  }

  function clean(text) {
    const kept = [], removed = [], seen = new Set(), brk = []; let blank = 0, html = 0, gap = false;
    text.split(/\r?\n/).forEach(raw => {
      if (/<[^>]+>|&nbsp;|&amp;/.test(raw)) html++;
      let l = raw.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\u00A0/g, ' ').replace(/&amp;/g, '&').replace(/\s+$/, '').replace(/^\s+/, '');
      l = l.replace(/^(?:[-*•·▪►→✓✔]|\d{1,3}[.)])\s+(?=\S)/u, '');
      if (!l.trim()) { blank++; gap = true; return; }
      if (/^[\s\-=_*#~.•·|+:<>\/\\]{3,}$/.test(l)) return removed.push([l, 'divider']);
      if (!/[\p{L}\p{N}]/u.test(l)) return removed.push([l, 'no letters or digits']);
      if (BOILER.test(l.trim())) return removed.push([l, 'boilerplate']);
      const key = l.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) return removed.push([l, 'duplicate']);
      seen.add(key); kept.push(l); brk.push(gap || /^[\p{Lu}\s]{4,}$/u.test(l)); gap = false;
    });
    return { kept, removed, blank, html, brk };
  }

  function findDelimited(lines) {
    let best = null;
    for (const [d, name] of [['\t', 'tab'], ['|', 'pipe'], [';', 'semicolon'], [',', 'comma'], [/\s{2,}/, 'aligned spaces']]) {
      const cnt = lines.map(l => (d === '|' ? l.replace(/^\||\|$/g, '') : l).split(d).length), freq = {};
      cnt.forEach(c => { if (c > 1) freq[c] = (freq[c] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]; if (!top) continue;
      const mode = +top[0], idx = cnt.map((c, i) => c === mode ? i : -1).filter(i => i >= 0);
      if (idx.length < 3) continue;
      if (d === ',' || name === 'aligned spaces') { const cells = idx.flatMap(i => lines[i].split(d)), avg = cells.reduce((a, c) => a + c.length, 0) / cells.length; if (avg > 32) continue; }
      if (!best || idx.length * mode > best.idx.length * best.mode) best = { d, name, mode, idx };
    }
    return best;
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
  function colTypes(t) {
    return t.head.map((_, i) => { const c = {}; let n = 0; t.rows.forEach(r => { const v = String(r[i] ?? '').trim(); if (!v) return; n++; const tk = tokenize(v), ty = tk.length === 1 ? tk[0].type : tk.length ? 'mixed' : ''; c[ty] = (c[ty] || 0) + 1; }); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top && top[1] >= n * .6 && TYPE[top[0]] ? TYPE[top[0]] : ''; });
  }

  function analyze(src) {
    const { kept, removed, blank, html, brk } = clean(src);
    const toks = kept.map(tokenize), used = new Set(), tables = [];
    const del = findDelimited(kept);
    if (del) {
      let rows = del.idx.map(i => (del.d === '|' ? kept[i].replace(/^\||\|$/g, '') : kept[i]).split(del.d).map(c => c.trim()));
      const numeric = c => /^[-$€£¥₹]?\s?\d[\d,.\s]*%?$/.test(c);
      const head = rows[0].some(numeric) ? rows[0].map((_, i) => 'Column ' + (i + 1)) : rows.shift();
      tables.push({ title: 'Delimited table', pattern: del.name + ' separated · ' + del.mode + ' columns', head: dedupe(head), rows });
      del.idx.forEach(i => used.add(i));
    }
    const kv = [];
    kept.forEach((l, i) => { if (used.has(i)) return; const m = l.match(KV); if (m && !/^(https?|www|ftp)$/i.test(m[1]) && m[1].trim().split(/\s+/).length <= 5) kv.push({ i, k: m[1].trim(), v: m[2].trim() }); });
    if (kv.length >= 2) {
      const blocks = []; let cur = null, last = -2;
      kv.forEach(x => { const key = x.k.toLowerCase(); if (!cur || x.i !== last + 1 || brk[x.i] || cur.has(key)) { cur = new Map(); cur.lines = []; blocks.push(cur); } cur.set(key, x); cur.lines.push(x.i); last = x.i; });
      const sigOf = b => [...b.keys()].sort().join('|'), bySig = new Map();
      blocks.forEach(b => push(bySig, sigOf(b), b));
      const loose = [];
      bySig.forEach(bs => {
        if (bs.length >= 2 && bs[0].size >= 2) {
          const keys = [...bs[0].values()].map(x => [x.k.toLowerCase(), x.k]);
          tables.push({ title: 'Records', pattern: 'Repeating key:value blocks · ' + bs.length + ' records × ' + keys.length + ' fields', head: keys.map(k => k[1]), rows: bs.map(b => keys.map(k => b.get(k[0]) ? b.get(k[0]).v : '')) });
          bs.forEach(b => b.lines.forEach(i => used.add(i)));
        } else bs.forEach(b => loose.push(...b.values()));
      });
      if (loose.length >= 2) {
        loose.sort((a, b) => a.i - b.i).forEach(x => used.add(x.i));
        const rows = loose.map(x => { const t = tokenize(x.v).find(t => t.type !== 'text'), e = t ? expand(t) : []; return [x.k, x.v, t ? TYPE[t.type] : 'Text', e[0] ? e[0][1] : x.v, e[1] ? e[1][1] : '', t && t.type === 'qty' ? e[2][1] : '']; });
        tables.push(dropEmpty({ title: 'Key–value pairs', pattern: loose.length + ' fields', head: ['Key', 'Raw value', 'Detected type', 'Value', 'Unit / currency', 'SI value'], rows }));
      }
    }
    const pool = kept.map((l, i) => ({ l, i, t: toks[i], sig: toks[i].map(t => t.type).join(' ') })).filter(r => !used.has(r.i) && r.t.some(t => t.type !== 'text'));
    const groups = new Map(); pool.forEach(r => push(groups, r.sig, r));
    const clusters = [...groups.values()].filter(g => g.length >= 2).sort((a, b) => b.length - a.length);
    clusters.forEach(g => {
      g.forEach(r => used.add(r.i));
      const slots = g[0].t, prev = g[0].i - 1;
      let hdr = null;
      if (prev >= 0 && !used.has(prev) && toks[prev].every(t => t.type === 'text')) {
        const parts = kept[prev].split(/\t|\s{2,}|\s*[|,;]\s*/).filter(Boolean), words = kept[prev].trim().split(/\s+/);
        hdr = parts.length === slots.length ? parts : words.length === slots.length ? words : null;
        if (hdr) used.add(prev);
      }
      const head = dedupe(slots.flatMap((t, j) => expand(t).map(([suf]) => (hdr ? hdr[j] : TYPE[t.type]) + suf)));
      tables.push(foldConst(dropEmpty({ title: hdr ? 'Table under “' + kept[prev].trim().slice(0, 40) + '”' : 'Repeating line pattern', pattern: slots.map(t => TYPE[t.type]).join(' · ') + ' — ' + g.length + ' lines share this shape', head, rows: g.map(r => r.t.flatMap(t => expand(t).map(x => x[1]))) })));
    });
    const rest = pool.filter(r => !used.has(r.i)), core = new Map();
    rest.forEach(r => { const k = r.t.filter(t => t.type !== 'text').map(t => t.type).join(' '); push(core, k, r); });
    [...core.entries()].filter(([, g]) => g.length >= 2).forEach(([k, g]) => {
      g.forEach(r => used.add(r.i));
      const typed = g[0].t.filter(t => t.type !== 'text');
      const head = dedupe(['Label', ...typed.flatMap(t => expand(t).map(([suf]) => TYPE[t.type] + suf))]);
      tables.push(dropEmpty({ title: 'Similar lines', pattern: k.split(' ').map(x => TYPE[x]).join(' · ') + ' with varying labels — ' + g.length + ' lines', head, rows: g.map(r => [r.t.filter(t => t.type === 'text').map(t => t.raw).join(' '), ...r.t.filter(t => t.type !== 'text').flatMap(t => expand(t).map(x => x[1]))]) }));
    });
    tables.forEach(t => { t.types = colTypes(t); });
    const ent = new Map(), dims = {};
    toks.forEach((ts, li) => ts.forEach(t => {
      if (t.type === 'qty') { const s = si(t.raw); if (s.dim) dims[s.dim] = (dims[s.dim] || 0) + 1; }
      if (t.type === 'text' || t.type === 'num') return;
      const norm = t.type === 'money' ? money(t.raw).join(' ') : t.type === 'qty' ? si(t.raw).v : t.type === 'date' ? isoDate(t.raw) : t.type === 'email' || t.type === 'url' ? t.raw.toLowerCase() : t.raw;
      if (t.type === 'card' && !luhn(t.raw)) return;
      const key = t.type + '|' + norm, e = ent.get(key) || { type: TYPE[t.type], raw: t.raw, norm, check: validate(t.type, t.raw), count: 0, lines: [] };
      e.count++; if (e.lines.length < 8) e.lines.push(li + 1); ent.set(key, e);
    }));
    const prose = kept.filter((l, i) => !used.has(i) && toks[i].every(t => t.type === 'text'));
    return { kept, removed, blank, html, tables, entities: [...ent.values()], dims, prose, pairs: kv.map(x => ({ k: x.k, v: x.v, line: x.i + 1 })), used: [...used] };
  }

  return { analyze, TYPE, parseNum, isoDate };
})();

let txtTables = [], txtNums = null, txtRun = 0;
const typeCache = new Map();
const typeCmp = (a, b) => { if (a === b) return 0; const k = a + '\u0000' + b; let v = typeCache.get(k); if (v === undefined) { v = a.localeCompare(b); typeCache.set(k, v); } return v; };
function extractText() {
  const src = $('#text-input').value, out = $('#text-out'), run = ++txtRun;
  if (!src.trim()) { out.innerHTML = ''; return; }
  if (src.length > 150000) {
    out.innerHTML = '<div class="card"><p class="tstat">Analyzing ' + src.split('\n').length.toLocaleString('en-US') + ' lines…</p></div>';
    setTimeout(() => {
      if (run !== txtRun) return;
      try { extractTextNow(src, out); } catch (e) { out.innerHTML = '<div class="card"><p>Could not analyze this text: ' + UTIL.esc(e.message) + '</p></div>'; }
    }, 30);
    return;
  }
  extractTextNow(src, out);
}
function extractTextNow(src, out) {
  const a = TXT.analyze(src);
  if (!a.kept.length) { out.innerHTML = '<div class="card"><p>Nothing usable found.</p></div>'; return; }
  const N = NUMS.analyze(a); txtNums = N;
  const proseWords = a.prose.join(' ').split(/\s+/).filter(Boolean).length;
  const ec = {}; a.entities.forEach(e => ec[e.type] = (ec[e.type] || 0) + e.count);
  txtTables = [...a.tables];
  if (a.entities.length) txtTables.push({ title: 'Entities', pattern: a.entities.length + ' unique values across all lines', head: ['Type', 'Raw', 'Normalized', 'Validation', 'Count', 'Lines'], rows: a.entities.sort((x, y) => typeCmp(x.type, y.type) || y.count - x.count).map(e => [e.type, e.raw, e.norm, e.check || '', e.count, e.lines.join(', ')]), types: [] });
  const chips = [
    ...a.tables.map((t, i) => '<a class="chip" href="#ttable-' + i + '">' + UTIL.esc(t.title) + ' <b>' + t.rows.length + '</b></a>'),
    ...NUMS.chips(N),
    ...Object.entries(ec).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>'),
    ...Object.entries(a.dims).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>')
  ].join('');
  const removedN = a.removed.length;
  const card = (t, i) => {
    const nt = N.tables[i], small = j => nt && nt.formula[j] ? '= ' + nt.formula[j] : t.types && t.types[j] && t.types[j] !== t.head[j] ? t.types[j] : '';
    return '<article class="card ttable" id="ttable-' + i + '"><div class="thead"><div><h3>' + UTIL.esc(t.title) + '</h3><p>' + UTIL.esc(t.pattern) + ' · ' + t.rows.length + ' rows</p></div><div class="row"><button class="btn ghost sm" data-csv="' + i + '">CSV</button><button class="btn ghost sm" data-tsv="' + i + '">Copy</button>' + (NUMS.hasFindings(nt) ? '<button class="btn ghost sm" data-findings="' + i + '">Findings</button>' : '') + '</div></div><div class="tablewrap tall"><table><thead><tr>' + t.head.map((h, j) => '<th>' + UTIL.esc(h) + (small(j) ? '<small>' + UTIL.esc(small(j)) + '</small>' : '') + '</th>').join('') + '</tr></thead><tbody>' + t.rows.slice(0, 1000).map((r, ri) => '<tr>' + t.head.map((_, j) => { const b = nt && nt.bad[ri + ',' + j]; return '<td' + (b ? ' class="bad" title="' + UTIL.esc(b) + '"' : '') + '>' + UTIL.esc(r[j] ?? '') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>' + (nt ? NUMS.render(nt) : '') + '</article>';
  };
  out.innerHTML = (proseWords >= 40 || !WRITING.analyze(src).gate ? WRITING.render(src) : '') + '<div class="card"><h4>Recognized patterns</h4><div class="chips">' + (chips || '<span class="chip">No structure found</span>') + '</div><p class="tstat">' + a.kept.length + ' clean lines · ' + removedN + ' junk removed' + (a.html ? ' · HTML stripped on ' + a.html + ' lines' : '') + ' · ' + a.blank + ' blank lines</p></div>' + txtTables.map(card).join('') + N.lines.map(NUMS.renderLine).join('') + (a.prose.length ? '<details class="card"><summary>Unstructured text lines (' + a.prose.length + ')</summary><ul class="drivers">' + a.prose.slice(0, 200).map(l => '<li>' + UTIL.esc(l) + '</li>').join('') + '</ul></details>' : '') + (removedN ? '<details class="card"><summary>Removed as junk (' + removedN + ')</summary><div class="tablewrap"><table><thead><tr><th>Line</th><th>Reason</th></tr></thead><tbody>' + a.removed.slice(0, 300).map(r => '<tr><td>' + UTIL.esc(r[0]) + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div></details>' : '');
}

$('#text-out').addEventListener('click', e => {
  const f = e.target.closest('[data-findings]');
  if (f) {
    const i = +f.dataset.findings, nt = txtNums && txtNums.tables[i], t = txtTables[i]; if (!nt || !t) return;
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + NUMS.findings(nt).map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-findings.csv'; a.click();
    return;
  }
  const b = e.target.closest('[data-csv],[data-tsv]'); if (!b) return;
  const t = txtTables[+(b.dataset.csv ?? b.dataset.tsv)], all = [t.head, ...t.rows];
  if (b.dataset.csv !== undefined) {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + all.map(r => t.head.map((_, j) => q(r[j])).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv'; a.click();
  } else navigator.clipboard.writeText(all.map(r => t.head.map((_, j) => String(r[j] ?? '').replace(/\t|\n/g, ' ')).join('\t')).join('\n')).then(() => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1200); });
});
$('#text-run').onclick = extractText;
$('#text-sample').onclick = () => {
  $('#text-input').value = 'ORDER SUMMARY\n=================\nItem  Qty  Price\nOrganic apples - 3 kg - $4.50\nWhole milk - 2 L - $3.20\nRice bag - 5 kg - $12.00\nOlive oil - 750 ml - €9.90\n-----------------\nOrder ID: INV-2026-0042\nDate: Oct 3, 2026\nContact: support@freshmart.example\nDelivery: 45 min\nTotal = $29.60\nSent from my iPhone\nOrganic apples - 3 kg - $4.50\n\nName: Alice Chen\nAge: 34\nCity: Berlin\n\nName: Omar Haddad\nAge: 29\nCity: Cairo\n\nServer 10.0.0.12 responded in 120 ms at 14:02\nServer 10.0.0.19 responded in 340 ms at 14:05\nServer 10.0.0.23 responded in 135 ms at 14:09\nServer 10.0.0.31 responded in 4100 ms at 14:12\nPay to IBAN GB82 WEST 1234 5698 7654 32 by 2026-02-30\nCard on file 4111 1111 1111 1111\nTracking 3f2c9a1e-7b4d-4c8a-9e21-5a6b7c8d9e0f\n<p>Unsubscribe</p>\n\nREGIONAL SALES\nRegion\tUnits\tPrice\tRevenue\tTax\tTotal\nNorth\t120\t4.50\t540.00\t108.00\t648.00\nSouth\t85\t6.20\t527.00\t105.40\t632.40\nEast\t240\t2.75\t660.00\t132.00\t792.00\nWest\t60\t12.00\t720.00\t144.00\t864.00\nCentral\t150\t3.80\t570.00\t114.00\t684.00\nCoast\t95\t7.40\t703.00\t140.60\t843.60\nValley\t310\t1.90\t589.00\t117.80\t716.80\nHills\t45\t15.50\t697.50\t139.50\t837.00\nTotal\t1105\t\t5006.50\t1001.30\t6007.80';
  extractText();
};