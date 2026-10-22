const CELL = (() => {
  const { Q } = UTIL;
  const U = {};
  const add = (dim, si, f, ...names) => {
    const [lf, ex] = Array.isArray(f) ? f : [f, typeof f === 'number' ? String(f) : null];
    names.forEach(n => { U[n] = [dim, lf, si, ex]; });
  };
  add('mass', 'kg', 1, 'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms');
  add('mass', 'kg', .001, 'g', 'gr', 'gram', 'grams');
  add('mass', 'kg', 1e-6, 'mg');
  add('mass', 'kg', [.45359, '0.45359237'], 'lb', 'lbs', 'pound', 'pounds');
  add('mass', 'kg', [.02835, '0.028349523125'], 'oz', 'ounce', 'ounces');
  add('mass', 'kg', 1000, 'ton', 'tons', 'tonne', 'tonnes');
  add('length', 'm', 1000, 'km', 'kilometer', 'kilometers', 'kilometre', 'kilometres');
  add('length', 'm', 1, 'm', 'meter', 'meters', 'metre', 'metres');
  add('length', 'm', .01, 'cm');
  add('length', 'm', .001, 'mm');
  add('length', 'm', [1609.34, '1609.344'], 'mi', 'mile', 'miles');
  add('length', 'm', .3048, 'ft', 'feet', 'foot');
  add('length', 'm', .0254, 'inch', 'inches');
  add('area', 'm²', 1, 'm2', 'm²', 'sqm');
  add('area', 'm²', [.0929, '0.09290304'], 'sqft', 'sq ft', 'ft2', 'ft²');
  add('volume', 'L', 1, 'l', 'liter', 'liters', 'litre', 'litres', 'ltr');
  add('volume', 'L', .001, 'ml');
  add('volume', 'L', [3.78541, '3.785411784'], 'gal', 'gallon', 'gallons');
  add('speed', 'm/s', [.27778, '5/18'], 'km/h', 'kmh', 'kph');
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
  const UNITS = Object.keys(U).sort((a, b) => b.length - a.length).map(rx).join('|').replace(/sq ft/, 'sq\\s?ft');
  const CURS = '[$€£¥₹]|USD|EUR|GBP|JPY|INR|AED|SAR|EGP|CAD|AUD|CHF|CNY';
  const SYM = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' }, CURW = { dollar: 'USD', dollars: 'USD', euro: 'EUR', euros: 'EUR' };
  const curCode = x => SYM[x] || CURW[x.toLowerCase()] || x.toUpperCase();
  const CUR_PRE = new RegExp('^(' + CURS + ')\\s?', 'i'), CUR_SUF = new RegExp('^(' + CURS + '|dollars?|euros?)$', 'i');
  const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };

  const pow10 = k => 10n ** BigInt(k);
  const decQ = s => { const [ip, fp = ''] = s.split('.'); return Q(BigInt(ip + fp), pow10(fp.length)); };
  const factorQ = u => { const e = U[u] && U[u][3]; if (!e) return null; const [a, b] = e.split('/'); return b ? Q(BigInt(a), BigInt(b)) : decQ(a); };
  const unitKey = rest => { const l = rest.toLowerCase(); if (U[l]) return l; const c = l.replace(/\s/g, ''); return U[c] ? c : ''; };
  const decOf = (q, max = 9) => { for (let k = 0; k <= max; k++) if (pow10(k) % q.d === 0n) return { m: q.n * (pow10(k) / q.d), d: k }; return null; };
  const dstr = (m, d) => { const neg = m < 0n, a = String(neg ? -m : m).padStart(d + 1, '0'); return (neg ? '-' : '') + (d ? a.slice(0, a.length - d) + '.' + a.slice(a.length - d) : a); };
  const numStr = v => {
    if (!Number.isFinite(v)) return '';
    let s = String(v);
    if (/e/i.test(s)) { s = v.toFixed(20).replace(/0+$/, '').replace(/\.$/, ''); if (/e/i.test(s)) return ''; }
    return s;
  };

  const PLAIN = /^-?\d{1,15}(?:\.(\d{1,15}))?$/;
  const GROUP = /^(\d{1,3}(?:[ ',.]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?|[.,]\d+)/;
  const EV_A = /^\d{1,3}(?:[. ']\d{3})+,\d+$/, EV_B = /^\d+,(?:\d{1,2}|\d{4,})$/, EV_DOT = /\.(?:\d{1,2}|\d{4,})$/;

  function scan(raw) {
    let t = String(raw).replace(/[\u00a0\u2009\u202f]/g, ' ').trim();
    if (!t) return null;
    let neg = false, cur = '', pct = false, unit = '', shift = 0;
    if (t[0] === '(' && t[t.length - 1] === ')') { neg = true; t = t.slice(1, -1).trim(); }
    const sign = () => {
      const c = t[0];
      if (c === '-' || c === '−') { neg = !neg; t = t.slice(1).trim(); return true; }
      if (c === '+') { t = t.slice(1).trim(); return true; }
      return false;
    };
    sign();
    const mc = CUR_PRE.exec(t);
    if (mc) { cur = curCode(mc[1]); t = t.slice(mc[0].length); sign(); }
    const m = GROUP.exec(t);
    if (!m) return null;
    const core = m[1];
    let rest = t.slice(core.length).trim(), ms;
    if (rest) {
      if (rest === '-' || rest === '−') { neg = !neg; rest = ''; }
      else if (rest === '%') { pct = true; rest = ''; }
      else if (!cur && (ms = CUR_SUF.exec(rest))) { cur = curCode(ms[1]); rest = ''; }
      else if (cur && /^[km]$/i.test(rest)) { shift = rest.toLowerCase() === 'k' ? 3 : 6; rest = ''; }
      else { const u = unitKey(rest); if (u) { unit = u; rest = ''; } }
      if (rest) return null;
    }
    return { neg, cur, pct, unit, shift, core, raw: String(raw).trim() };
  }

  function digits(core, loc) {
    let m;
    if (loc !== 'comma') {
      if ((m = /^(\d{1,3}(?:([,' ])\d{3}(?:\2\d{3})*))(?:\.(\d+))?$/.exec(core))) return [m[1].split(m[2]).join(''), m[3] || ''];
      if (loc === 'auto' && (m = /^(\d{1,3}(?:([. ']))\d{3}(?:\2\d{3})*),(\d+)$/.exec(core))) return [m[1].split(m[2]).join(''), m[3]];
      if (loc === 'auto') { if ((m = /^(\d+)(?:[.,](\d+))?$/.exec(core))) return [m[1], m[2] || '']; }
      else if ((m = /^(\d+)(?:\.(\d+))?$/.exec(core))) return [m[1], m[2] || ''];
      if ((m = /^\.(\d+)$/.exec(core))) return ['0', m[1]];
      return null;
    }
    if ((m = /^(\d{1,3}(?:([. '])\d{3}(?:\2\d{3})*))(?:,(\d+))?$/.exec(core))) return [m[1].split(m[2]).join(''), m[3] || ''];
    if ((m = /^(\d+)(?:,(\d+))?$/.exec(core))) return [m[1], m[2] || ''];
    if ((m = /^,(\d+)$/.exec(core))) return ['0', m[1]];
    return null;
  }

  function finish(sc, loc) {
    const dg = digits(sc.core, loc);
    if (!dg) return null;
    let m = BigInt(dg[0] + dg[1]), d = dg[1].length;
    if (sc.shift) { if (sc.shift >= d) { m *= pow10(sc.shift - d); d = 0; } else d -= sc.shift; }
    if (sc.neg) m = -m;
    return { m, d, v: +dstr(m, d), raw: sc.raw, cur: sc.cur, pct: sc.pct, unit: sc.unit };
  }

  function parseOne(v, locale = 'auto') {
    const s = typeof v === 'number' ? numStr(v) : String(v ?? '').trim();
    if (!s) return null;
    if (locale !== 'comma') {
      const q = PLAIN.exec(s);
      if (q) return { m: BigInt(s.replace('.', '')), d: q[1] ? q[1].length : 0, v: +s, raw: s, cur: '', pct: false, unit: '' };
    }
    const sc = scan(s);
    return sc ? finish(sc, locale) : null;
  }

  const evid = (c, st) => { if (EV_A.test(c)) st.a = true; else if (EV_B.test(c)) st.b = true; else if (EV_DOT.test(c)) st.dot = true; };
  const plainDot = s => { const i = s.indexOf('.'); if (i < 0) return false; const k = s.length - i - 1; return k <= 2 || k >= 4; };
  const verdict = st => st.a || (st.b && !st.dot) ? 'comma' : 'dot';
  const strOf = v => v === undefined || v === null ? '' : typeof v === 'number' ? numStr(v) : String(v).trim();
  function locale(raw) {
    const st = { a: false, b: false, dot: false };
    for (let i = 0; i < raw.length; i++) {
      const s = strOf(raw[i]);
      if (!s) continue;
      if (PLAIN.test(s)) { if (!st.dot && plainDot(s)) st.dot = true; continue; }
      const x = scan(s);
      if (x) evid(x.core, st);
    }
    return verdict(st);
  }
  function isNum(v, loc = 'auto') {
    const s = strOf(v);
    if (!s) return false;
    if (loc !== 'comma' && PLAIN.test(s)) return true;
    const x = scan(s);
    return !!x && digits(x.core, loc) !== null;
  }

  const leap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const monthDays = (y, m) => m === 2 ? (leap(y) ? 29 : 28) : m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
  function dayOf(y, m, d) {
    if (!(Number.isInteger(y) && m >= 1 && m <= 12 && d >= 1 && d <= monthDays(y, m))) return null;
    const yy = m <= 2 ? y - 1 : y, era = Math.floor(yy / 400), yoe = yy - era * 400;
    const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1, doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }
  function civil(z) {
    z += 719468;
    const era = Math.floor(z / 146097), doe = z - era * 146097, yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9;
    return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d];
  }
  const iso = day => { const [y, m, d] = civil(day); return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };

  const D_ISO = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?:[T ]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s?(?:Z|[+-]\d{2}:?\d{2})?)?$/i;
  const D_NUM = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/;
  const D_NM1 = /^(\d{1,2})(?:st|nd|rd|th)?[ -]([a-z]+)\.?,?[ -](\d{4})$/i, D_NM2 = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/i;
  function dsyn(s) {
    let m;
    if ((m = D_ISO.exec(s))) return { f: 'ymd', y: +m[1], a: +m[3], b: +m[4] };
    if ((m = D_NUM.exec(s))) return { f: 'num', y: +m[4], a: +m[1], b: +m[3] };
    if ((m = D_NM1.exec(s))) { const mo = MONTHS[m[2].toLowerCase()]; return mo ? { f: 'name', y: +m[3], a: mo, b: +m[1] } : null; }
    if ((m = D_NM2.exec(s))) { const mo = MONTHS[m[1].toLowerCase()]; return mo ? { f: 'name', y: +m[3], a: mo, b: +m[2] } : null; }
    return null;
  }
  function resolve(x, order) {
    let mo, d;
    if (x.f !== 'num' || x.a === x.b) { mo = x.a; d = x.b; }
    else if (order === 'dmy') { d = x.a; mo = x.b; }
    else if (order === 'mdy') { mo = x.a; d = x.b; }
    else if (x.a > 12 && x.b <= 12) { d = x.a; mo = x.b; }
    else if (x.b > 12 && x.a <= 12) { mo = x.a; d = x.b; }
    else if (x.a > 12 && x.b > 12) return { day: null, status: 'impossible' };
    else return { day: null, status: 'ambiguous' };
    const day = dayOf(x.y, mo, d);
    return day === null ? { day: null, status: 'impossible' } : { day, status: 'valid' };
  }
  function orderOfSyn(list) {
    let dm = false, md = false, any = false;
    for (const x of list) { if (!x || x.f !== 'num' || x.a === x.b) continue; any = true; if (x.a > 12) dm = true; if (x.b > 12) md = true; }
    return dm && md ? 'mixed' : dm ? 'dmy' : md ? 'mdy' : any ? 'ambiguous' : 'ymd';
  }
  const dateOrder = list => orderOfSyn(list.map(s => dsyn(strOf(s))));
  const date = (raw, order = 'auto') => { const x = dsyn(strOf(raw)); return x ? resolve(x, order) : { day: null, status: 'none' }; };
  const isoDate = (s, order = 'auto') => {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    if (order === 'keep' && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(s)) return s;
    const r = date(s, order);
    return r.day === null ? s : iso(r.day);
  };
  function kindOf(raw, loc = 'auto') {
    const s = strOf(raw);
    if (!s) return 'empty';
    if (!PLAIN.test(s) && dsyn(s)) return 'date';
    return parseOne(s, loc) ? 'num' : 'text';
  }

  function unitGroups(parsed) {
    const g = new Map();
    parsed.forEach(c => {
      if (!c.unit) return;
      const e = U[c.unit], id = e[0] + '|' + (e[3] || c.unit), x = g.get(id) || { id, dim: e[0], f: factorQ(c.unit), keys: new Map() };
      x.keys.set(c.unit, (x.keys.get(c.unit) || 0) + 1); g.set(id, x);
    });
    return [...g.values()].map(x => Object.assign(x, { key: [...x.keys.entries()].sort((a, b) => b[1] - a[1])[0][0] }));
  }

  function column(raw, hint = {}) {
    const n = raw.length, skip = hint.skip, strs = new Array(n), syn = new Array(n).fill(null), plain = new Array(n).fill(null), sc = new Array(n).fill(undefined), st = { a: false, b: false, dot: false };
    let cells = new Array(n).fill(null), nonEmpty = 0, dp = 0;
    for (let i = 0; i < n; i++) {
      const s = strs[i] = strOf(raw[i]);
      if (!s) continue;
      const live = !(skip && skip[i]);
      if (live) nonEmpty++;
      const q = PLAIN.exec(s);
      if (q) { plain[i] = q; if (!hint.locale && !st.dot && plainDot(s)) st.dot = true; continue; }
      const x = dsyn(s);
      if (x) { syn[i] = x; if (live) dp++; } else { const y = sc[i] = scan(s); if (y && !hint.locale) evid(y.core, st); }
    }
    const out = { kind: 'text', locale: 'dot', dateOrder: '', unit: '', dim: '', cur: '', pct: false, d: 0, cells, notes: [], nonEmpty, mixedUnits: null };
    if (!nonEmpty) return out;
    if (dp > 0 && dp >= .8 * nonEmpty) {
      const order = hint.dateOrder || orderOfSyn(syn);
      for (let i = 0; i < n; i++) {
        if (!syn[i]) continue;
        const r = resolve(syn[i], order);
        if (r.day !== null) cells[i] = { m: BigInt(r.day), d: 0, v: r.day, raw: strs[i], day: r.day, cur: '', pct: false, unit: '' };
      }
      out.kind = 'date'; out.dateOrder = order;
      if (order === 'ambiguous') out.notes.push('dates could be day/month or month/day');
      else if (order === 'mixed') out.notes.push('dates mix day/month and month/day');
      return out;
    }
    const loc = out.locale = hint.locale || verdict(st);
    let np = 0;
    for (let i = 0; i < n; i++) {
      if (!strs[i] || syn[i]) continue;
      let c = null;
      if (plain[i] && loc !== 'comma') c = { m: BigInt(plain[i][1] ? strs[i].replace('.', '') : strs[i]), d: plain[i][1] ? plain[i][1].length : 0, v: +strs[i], raw: strs[i], cur: '', pct: false, unit: '' };
      else { const x = sc[i] === undefined ? scan(strs[i]) : sc[i]; c = x ? finish(x, loc) : null; }
      cells[i] = c;
      if (c && !(skip && skip[i])) np++;
    }
    if (!(np > 0 && np >= .8 * nonEmpty)) { out.cells = new Array(n).fill(null); return out; }
    const parsed = cells.filter(Boolean), groups = unitGroups(parsed);
    if (groups.length > 1) {
      const dims = new Set(groups.map(g => g.dim)), exact = groups.every(g => g.f);
      let ok = dims.size === 1 && exact;
      if (ok) {
        const target = groups.reduce((a, b) => UTIL.qcmp(a.f, b.f) <= 0 ? a : b), conv = new Map();
        for (const c of parsed) {
          if (!c.unit || groups.find(g => g.keys.has(c.unit)) === target) continue;
          const g = groups.find(x => x.keys.has(c.unit)), dec = decOf(UTIL.qmul(Q(c.m, pow10(c.d)), UTIL.qdiv(g.f, target.f)));
          if (!dec) { ok = false; break; }
          conv.set(c, dec);
        }
        if (ok) { conv.forEach((dec, c) => { c.m = dec.m; c.d = dec.d; c.v = +dstr(dec.m, dec.d); c.unit = target.key; }); out.unit = target.key; out.dim = target.dim; out.notes.push('mixed ' + target.dim + ' units converted to ' + target.key); }
      }
      if (!ok) {
        out.mixedUnits = groups.map(g => g.key);
        out.notes.push('mixes units: ' + out.mixedUnits.join(', '));
        out.cells = new Array(n).fill(null);
        return out;
      }
    } else if (groups.length === 1) { out.unit = groups[0].key; out.dim = groups[0].dim; }
    const curs = [...new Set(parsed.filter(c => c.cur).map(c => c.cur))];
    out.cur = curs.length > 1 ? 'mixed' : curs[0] || '';
    if (curs.length > 1) out.notes.push('mixes currencies: ' + curs.join(', '));
    out.pct = parsed.filter(c => c.pct).length >= .6 * parsed.length;
    let d = 0;
    for (let i = 0; i < n; i++) if (cells[i] && !(skip && skip[i]) && cells[i].d > d) d = cells[i].d;
    out.kind = 'num'; out.d = d; out.cells = cells;
    if (loc === 'comma') out.notes.push('decimal comma');
    return out;
  }

  return { U, UNITS, CURS, MONTHS, curCode, factorQ, parseOne, isNum, column, locale, kindOf, date, dateOrder, isoDate, dayOf, civil, iso, str: c => dstr(c.m, c.d) };
})();
