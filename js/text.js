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
  const TOK = [
    ['url', /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+/giu],
    ['email', /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu],
    ['ip', /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu],
    ['date', /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b|\b\d{1,2}(?:st|nd|rd|th)?\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s\d{4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s\d{1,2}(?:st|nd|rd|th)?,?\s\d{4}\b/giu],
    ['time', /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]m\b)?/giu],
    ['phone', /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/gu],
    ['hashtag', /(?<![\w])#[\p{L}\w]+/gu],
    ['mention', /(?<![\w])@[\w.]+/gu],
    ['id', /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9]+(?:-[A-Z0-9]+)+\b|\b[A-Z]{2,}\d{3,}\b/gu],
    ['money', new RegExp('(?:(?:' + CURS + ')\\s?' + NUM + '(?:\\s?[km](?![\\p{L}]))?|' + NUM + '\\s?(?:' + CURS + '|dollars?|euros?)(?![\\p{L}]))', 'giu')],
    ['percent', new RegExp(NUM + '\\s?%', 'gu')],
    ['qty', new RegExp(NUM + '\\s?(?:' + UNITS + ')(?![\\p{L}\\p{N}])', 'giu')],
    ['num', new RegExp('(?<![\\p{L}\\d])' + NUM, 'gu')]
  ];
  const TYPE = { text: 'Text', url: 'URL', email: 'Email', ip: 'IP', date: 'Date', time: 'Time', phone: 'Phone', hashtag: 'Hashtag', mention: 'Mention', id: 'ID', money: 'Amount', percent: 'Percent', qty: 'Quantity', num: 'Number' };
  const BOILER = /^(sent from my|unsubscribe|click here|view (this )?in (your )?browser|all rights reserved|copyright|©|privacy policy|terms (of|&) (use|service)|we use cookies|accept (all )?cookies|follow us|share this|advertisement|sponsored|read more$|skip to (main )?content|back to top|page \d+ (of|\/) \d+$|loading\.*$|show more$|reply$|like$|forwarded message)/i;
  const KV = /^([\p{L}][\p{L}\p{N} _.\/()#&'-]{0,40}?)\s*[:=]\s*(\S.*)$/u;

  const parseNum = s => { s = s.trim(); if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return +s.replace(/\./g, '').replace(',', '.'); if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return +s.replace(/,/g, ''); return +s.replace(',', '.'); };
  const numIn = s => (s.match(new RegExp(NUM)) || [''])[0];
  const fmt = v => Number.isFinite(v) ? +v.toPrecision(8) : '';
  const isoDate = s => { if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s; if (/[a-z]/i.test(s)) { const d = new Date(s.replace(/(\d)(st|nd|rd|th)/i, '$1').replace(',', '')); if (!isNaN(d)) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } return s; };

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

  function tokenize(line) {
    let rest = line; const toks = [];
    for (const [type, re] of TOK) {
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
      blocks.forEach(b => bySig.set(sigOf(b), [...(bySig.get(sigOf(b)) || []), b]));
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
    const groups = new Map(); pool.forEach(r => groups.set(r.sig, [...(groups.get(r.sig) || []), r]));
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
    rest.forEach(r => { const k = r.t.filter(t => t.type !== 'text').map(t => t.type).join(' '); core.set(k, [...(core.get(k) || []), r]); });
    [...core.entries()].filter(([, g]) => g.length >= 2).forEach(([k, g]) => {
      g.forEach(r => used.add(r.i));
      const typed = g[0].t.filter(t => t.type !== 'text');
      const head = dedupe(['Label', ...typed.flatMap(t => expand(t).map(([suf]) => TYPE[t.type] + suf))]);
      tables.push(dropEmpty({ title: 'Similar lines', pattern: k.split(' ').map(x => TYPE[x]).join(' · ') + ' with varying labels — ' + g.length + ' lines', head, rows: g.map(r => [r.t.filter(t => t.type === 'text').map(t => t.raw).join(' '), ...r.t.filter(t => t.type !== 'text').flatMap(t => expand(t).map(x => x[1]))]) }));
    });
    tables.forEach(t => t.types = colTypes(t));
    const ent = new Map(), dims = {};
    toks.forEach((ts, li) => ts.forEach(t => {
      if (t.type === 'qty') { const s = si(t.raw); if (s.dim) dims[s.dim] = (dims[s.dim] || 0) + 1; }
      if (t.type === 'text' || t.type === 'num') return;
      const norm = t.type === 'money' ? money(t.raw).join(' ') : t.type === 'qty' ? si(t.raw).v : t.type === 'date' ? isoDate(t.raw) : t.type === 'email' || t.type === 'url' ? t.raw.toLowerCase() : t.raw;
      const key = t.type + '|' + norm, e = ent.get(key) || { type: TYPE[t.type], raw: t.raw, norm, count: 0, lines: [] };
      e.count++; if (e.lines.length < 8) e.lines.push(li + 1); ent.set(key, e);
    }));
    const prose = kept.filter((l, i) => !used.has(i) && toks[i].every(t => t.type === 'text'));
    return { kept, removed, blank, html, tables, entities: [...ent.values()], dims, prose };
  }

  return { analyze, TYPE };
})();

let txtTables = [];
function extractText() {
  const src = $('#text-input').value, out = $('#text-out');
  if (!src.trim()) { out.innerHTML = ''; return; }
  const a = TXT.analyze(src);
  if (!a.kept.length) { out.innerHTML = '<div class="card"><p>Nothing usable found.</p></div>'; return; }
  const ec = {}; a.entities.forEach(e => ec[e.type] = (ec[e.type] || 0) + e.count);
  txtTables = [...a.tables];
  if (a.entities.length) txtTables.push({ title: 'Entities', pattern: a.entities.length + ' unique values across all lines', head: ['Type', 'Raw', 'Normalized', 'Count', 'Lines'], rows: a.entities.sort((x, y) => x.type.localeCompare(y.type) || y.count - x.count).map(e => [e.type, e.raw, e.norm, e.count, e.lines.join(', ')]), types: [] });
  const chips = [
    ...a.tables.map((t, i) => '<a class="chip" href="#ttable-' + i + '">' + esc(t.title) + ' <b>' + t.rows.length + '</b></a>'),
    ...Object.entries(ec).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>'),
    ...Object.entries(a.dims).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>')
  ].join('');
  const removedN = a.removed.length;
  const card = (t, i) => '<article class="card ttable" id="ttable-' + i + '"><div class="thead"><div><h3>' + esc(t.title) + '</h3><p>' + esc(t.pattern) + ' · ' + t.rows.length + ' rows</p></div><div class="row"><button class="btn ghost sm" data-csv="' + i + '">CSV</button><button class="btn ghost sm" data-tsv="' + i + '">Copy</button></div></div><div class="tablewrap tall"><table><thead><tr>' + t.head.map((h, j) => '<th>' + esc(h) + (t.types && t.types[j] && t.types[j] !== h ? '<small>' + t.types[j] + '</small>' : '') + '</th>').join('') + '</tr></thead><tbody>' + t.rows.slice(0, 1000).map(r => '<tr>' + t.head.map((_, j) => '<td>' + esc(r[j] ?? '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></article>';
  out.innerHTML = '<div class="card"><h4>Recognized patterns</h4><div class="chips">' + (chips || '<span class="chip">No structure found</span>') + '</div><p class="tstat">' + a.kept.length + ' clean lines · ' + removedN + ' junk removed' + (a.html ? ' · HTML stripped on ' + a.html + ' lines' : '') + ' · ' + a.blank + ' blank lines</p></div>' + txtTables.map(card).join('') + (a.prose.length ? '<details class="card"><summary>Unstructured text lines (' + a.prose.length + ')</summary><ul class="drivers">' + a.prose.slice(0, 200).map(l => '<li>' + esc(l) + '</li>').join('') + '</ul></details>' : '') + (removedN ? '<details class="card"><summary>Removed as junk (' + removedN + ')</summary><div class="tablewrap"><table><thead><tr><th>Line</th><th>Reason</th></tr></thead><tbody>' + a.removed.slice(0, 300).map(r => '<tr><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div></details>' : '');
}

$('#text-out').addEventListener('click', e => {
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
  $('#text-input').value = 'ORDER SUMMARY\n=================\nItem  Qty  Price\nOrganic apples - 3 kg - $4.50\nWhole milk - 2 L - $3.20\nRice bag - 5 kg - $12.00\nOlive oil - 750 ml - €9.90\n-----------------\nOrder ID: INV-2026-0042\nDate: Oct 3, 2026\nContact: support@freshmart.example\nDelivery: 45 min\nTotal = $29.60\nSent from my iPhone\nOrganic apples - 3 kg - $4.50\n\nName: Alice Chen\nAge: 34\nCity: Berlin\n\nName: Omar Haddad\nAge: 29\nCity: Cairo\n\nServer 10.0.0.12 responded in 120 ms at 14:02\nServer 10.0.0.19 responded in 340 ms at 14:05\n<p>Unsubscribe</p>';
  extractText();
};