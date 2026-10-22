const NUMS = (() => {
  const { MIN_SUPPORT, MAX_LOG10P, Q, show } = UTIL;
  const MIN_SEQ = 5, MAX_COLS = 12, MAX_DATE_COLS = 6, MAX_ROWS = 1000, MAX_D = 9, MAX_GROUPS = 12, MIN_GROUP = 3, SHOW_EXC = 5, MAX_EXC = 1000, LINE_CAP = 200000, SHOW_VALUES = 40, SAFE_INT = 2 ** 53;
  const SKIP_TYPES = new Set(['Date', 'Time', 'Phone', 'IP', 'ID', 'Card number', 'Version', 'UUID', 'IBAN', 'Coordinates', 'Colour', 'Email', 'URL']);
  const TOTAL_ONLY = /^(?:(?:grand\s+|sub-?)?totals?|sum)\s*:?$/i, TOTAL_LEAD = /^(?:(?:grand\s+|sub-?)?totals?|sum)\b(?:\s+\S+){1,3}$/i;
  const STAT_ONLY = /^(?:average|mean|avg|count|minimum|maximum|min|max)\s*:?$/i, STAT_KIND = { average: 'avg', mean: 'avg', avg: 'avg', count: 'count', min: 'min', minimum: 'min', max: 'max', maximum: 'max' };
  const SI_COL = / \(SI\)(?: \d+)?$/;
  const DECLARED = /^(?:grand\s+|sub-?)?total\b|^sum\b|\bamount due\b|\bbalance due\b/i;

  const scaled = (c, d) => c.d === d ? c.m : c.m * 10n ** BigInt(d - c.d);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const fmtChance = l => { const q = -l; if (q < 6) return '1 in ' + Number((10 ** q).toPrecision(2)).toLocaleString('en-US'); if (q > 15) return '< 1 in 10¹⁵'; return '1 in 10' + String(Math.floor(q)).split('').map(c => SUP[c]).join(''); };
  const fmtN = (v, d) => v.toFixed(d), signed = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
  const fmtP = p => p < .001 ? '< 0.001' : p.toFixed(3);
  const fmt8 = v => +v.toPrecision(8);
  function distinctUpTo3(a) { const seen = []; for (let i = 0; i < a.length; i++) { const v = a[i]; if (seen.indexOf(v) < 0) { seen.push(v); if (seen.length === 3) break; } } return seen.length; }

  const isoDay = CELL.iso;
  const colFmt = col => col.date ? isoDay : v => fmtN(v, col.d);
  const labelOf = (r, loc) => { for (let j = 0; j < r.length; j++) { const v = r[j]; if (typeof v === 'string' && v.trim() && !CELL.isNum(v, loc[j] || 'auto')) return v.trim(); } return ''; };
  const kindOfLabel = lab => /^sub-?total/i.test(lab) ? 'subtotal' : /^(?:grand\s+total|total|sum)/i.test(lab) ? 'total' : STAT_KIND[lab.replace(/\s*:$/, '').toLowerCase()] || 'total';
  function colStats(rows, j, list, loc) {
    const ps = []; let d = 0;
    for (const r of list) { const c = CELL.parseOne(rows[r][j], loc[j]); if (c) { ps.push(c); if (c.d > d) d = c.d; } }
    let sum = 0n, min = null, max = null;
    for (const c of ps) { const x = scaled(c, d); sum += x; if (min === null || x < min) min = x; if (max === null || x > max) max = x; }
    return { sum, d, n: ps.length, min, max };
  }
  function holds(kind, c, st) {
    if (st.n < 2) return false;
    const D = Math.max(c.d, st.d), x = scaled(c, D), k = 10n ** BigInt(D - st.d);
    if (kind === 'count') return c.d === 0 && c.m === BigInt(st.n);
    if (kind === 'min') return x === st.min * k;
    if (kind === 'max') return x === st.max * k;
    if (kind === 'avg') { const diff = x * BigInt(st.n) - st.sum * k; return 2n * (diff < 0n ? -diff : diff) <= 10n ** BigInt(D - c.d) * BigInt(st.n); }
    return x === st.sum * k;
  }
  function leadsTotal(rows, i, isTotal, loc, kind, skip) {
    const width = rows[i].length, above = [], below = [];
    for (let r = 0; r < rows.length; r++) if (r !== i && !isTotal[r] && !(skip && skip[r])) (r < i ? above : below).push(r);
    for (let j = 0; j < width; j++) {
      const c = CELL.parseOne(rows[i][j], loc[j]); if (!c) continue;
      for (const list of [above, below]) if (holds(kind, c, colStats(rows, j, list, loc))) return true;
    }
    return false;
  }

  function catCols(t, loc, isTotal) {
    const out = [], n = t.rows.length;
    t.head.forEach((name, j) => {
      if (SI_COL.test(name)) return;
      const seen = new Map(), gid = new Int16Array(n).fill(-1), labels = [];
      let live = 0, bad = false;
      for (let r = 0; r < n && !bad; r++) {
        if (isTotal[r]) continue;
        const raw = String(t.rows[r][j] ?? '').trim();
        if (!raw) continue;
        if (CELL.isNum(raw, loc[j] || 'auto')) { bad = true; break; }
        live++;
        let g = seen.get(raw);
        if (g === undefined) { if (labels.length >= MAX_GROUPS) { bad = true; break; } g = labels.length; seen.set(raw, g); labels.push(raw); }
        gid[r] = g;
      }
      if (bad || labels.length < 2) return;
      const cnt = new Array(labels.length).fill(0);
      for (let r = 0; r < n; r++) if (gid[r] >= 0) cnt[gid[r]]++;
      if (cnt.some(c => c < MIN_GROUP) || live < .8 * (n - totalCount(isTotal))) return;
      out.push({ j, name, gid, labels });
    });
    return out;
  }
  const totalCount = a => { let c = 0; for (let i = 0; i < a.length; i++) c += a[i]; return c; };

  function view(t) {
    const rows = t.rows, n = rows.length, isTotal = new Uint8Array(n), totalRows = [], dataRows = [], key = UTIL.hash32(t.head.join('\t') + '|' + n), lead = [], stat = [], kinds = {}, notes = [], statLike = new Uint8Array(n);
    const cc = t.cc || [], loc = t.head.map((_, j) => cc[j] ? cc[j].locale : CELL.locale(rows.map(r => r[j])));
    for (let i = 0; i < n; i++) {
      const lab = labelOf(rows[i], loc);
      if (TOTAL_ONLY.test(lab)) isTotal[i] = 1; else if (TOTAL_LEAD.test(lab)) lead.push(i); else if (STAT_ONLY.test(lab)) { stat.push(i); statLike[i] = 1; }
      if (isTotal[i] || TOTAL_LEAD.test(lab)) kinds[i] = kindOfLabel(lab);
    }
    lead.forEach(i => { if (leadsTotal(rows, i, isTotal, loc, 'sum', statLike)) isTotal[i] = 1; });
    stat.forEach(i => { const kind = kindOfLabel(labelOf(rows[i], loc)); if (leadsTotal(rows, i, isTotal, loc, kind, statLike)) { isTotal[i] = 1; kinds[i] = kind; } });
    for (let i = 0; i < n; i++) if (isTotal[i]) totalRows.push(i); else dataRows.push(i);
    const label = r => labelOf(rows[r], loc);
    const cols = [], dateCols = [], colKinds = [], colNotes = [];
    t.head.forEach((name, j) => {
      if (SI_COL.test(name)) return;
      const type = t.types && t.types[j], info = !totalRows.length && cc[j] ? cc[j] : CELL.column(rows.map(r => r[j]), { skip: isTotal, locale: loc[j] });
      colKinds[j] = info.mixedUnits ? 'num' : info.kind === 'num' && SKIP_TYPES.has(type) && !/^(?:Date|Time)$/.test(type) ? 'text' : info.kind;
      colNotes[j] = info.notes || [];
      if (info.kind === 'date' && info.dateOrder === 'ambiguous') notes.push('Column ' + name + ': dates could be day/month or month/day, so it was left out of date relations.');
      if (info.kind === 'date' && info.dateOrder === 'mixed') notes.push('Column ' + name + ': dates mix day/month and month/day, so only dates that are clear on their own were used.');
      if (info.mixedUnits) { notes.push('Column ' + name + ' mixes units (' + info.mixedUnits.join(', ') + '), so its values were not compared.'); return; }
      const cells = info.cells, vals = new Array(n).fill(null), nums = [];
      if (info.kind === 'date') {
        for (let i = 0; i < n; i++) { const c = cells[i]; if (c) { vals[i] = c.day; if (!isTotal[i]) nums.push(c.day); } }
        if (nums.length >= 3 && nums.length >= .8 * info.nonEmpty) dateCols.push({ j, name, vals, d: 0, sd: 0, h: .5, date: true, cells, big: r => BigInt(vals[r]), distinct: distinctUpTo3(nums), nd: new Set(nums).size, min: Math.min(...nums), max: Math.max(...nums), sum: nums.reduce((a, v) => a + v, 0), nums });
        return;
      }
      if (info.kind !== 'num' || SKIP_TYPES.has(type)) return;
      for (let i = 0; i < n; i++) { const c = cells[i]; if (c) { vals[i] = c.v; if (!isTotal[i]) nums.push(c.v); } }
      if (!(nums.length >= 3 && nums.length >= .8 * info.nonEmpty)) return;
      const sd = info.d, d = Math.min(MAX_D, sd);
      let min = Infinity, max = -Infinity, sum = 0;
      for (const v of nums) { if (v < min) min = v; if (v > max) max = v; sum += v; }
      cols.push({
        j, name, vals, d, sd, h: .5 * 10 ** -d, min, max, sum,
        big: r => scaled(cells[r], sd),
        pct: /%/.test(name) || type === 'Percent',
        distinct: distinctUpTo3(nums), nd: new Set(nums).size, cells,
        cur: t.head[j + 1] === name + ' currency' ? j + 1 : -1,
        unit: info.unit, dim: info.dim, locale: info.locale,
        nums
      });
    });
    const numEq = cols.filter(c => c.distinct >= 3), dayEq = dateCols.filter(c => c.distinct >= 3);
    return {
      key, rows, head: t.head, types: t.types || [], colKinds, colNotes, totalRows, dataRows, label, cols, dateCols, notes, kinds,
      searchRows: dataRows.length > MAX_ROWS ? dataRows.slice(0, MAX_ROWS) : dataRows,
      eqCols: numEq.slice(0, MAX_COLS),
      dateEq: dayEq.slice(0, MAX_DATE_COLS),
      unsearched: { cols: numEq.slice(MAX_COLS).map(c => c.name), dates: dayEq.slice(MAX_DATE_COLS).map(c => c.name) },
      constCols: cols.filter(c => c.distinct === 1),
      cats: catCols(t, loc, isTotal)
    };
  }

  function colLine(name, nums) {
    const s = Float64Array.from(nums).sort(), med = s[s.length >> 1], mad = Float64Array.from(s, v => Math.abs(v - med)).sort()[s.length >> 1] || 0;
    const outl = mad ? nums.filter(v => Math.abs(v - med) / (1.4826 * mad) > 3.5) : [];
    let sum = 0; for (const v of nums) sum += v;
    return name + ': min ' + fmt8(s[0]) + ' · median ' + fmt8(med) + ' · max ' + fmt8(s[s.length - 1]) + ' · sum ' + fmt8(sum) + (outl.length ? ' · outliers ' + outl.slice(0, 50).map(fmt8).join(', ') + (outl.length > 50 ? ' …' : '') : '');
  }

  const badOf = problems => { const bad = {}; problems.forEach(c => { bad[c.row + ',' + c.col] = c.reasons.map(x => x.text); }); return bad; };

  const rangeOf = rows => rows.length === 1 ? 'row ' + (rows[0] + 1) : 'rows ' + (rows[0] + 1) + '–' + (rows[rows.length - 1] + 1);
  const fx = (D, x) => REL.fixed([x, 10n ** BigInt(D)], D);
  const diffTxt = (D, v, S) => { const d = v - S; return (d < 0n ? '−' : '+') + fx(D, d < 0n ? -d : d); };

  function totalsFor(V, key) {
    const out = [], tr = V.totalRows;
    if (!tr.length) return out;
    const multi = tr.length > 1, bounds = tr.filter(r => V.kinds[r] === 'subtotal' || V.kinds[r] === 'total'), subRows = tr.filter(r => V.kinds[r] === 'subtotal');
    tr.forEach(row => {
      const kind = V.kinds[row] || 'total', lab = V.label(row), tag = '“' + lab + '”' + (multi ? ' (row ' + (row + 1) + ')' : '');
      const sumLike = kind === 'subtotal' || kind === 'total';
      let covered, phrase, below = false;
      if (kind === 'subtotal') {
        const prev = bounds.filter(r => r < row).pop(), next = bounds.find(r => r > row);
        covered = V.dataRows.filter(r => (prev === undefined || r > prev) && r < row);
        if (!covered.length) { covered = V.dataRows.filter(r => r > row && (next === undefined || r < next)); below = true; }
        phrase = covered.length ? rangeOf(covered) : '';
      } else {
        covered = V.dataRows.filter(r => r < row);
        if (!covered.length) { covered = V.dataRows.filter(r => r > row); below = true; }
        phrase = 'the rows ' + (below ? 'below' : 'above');
      }
      if (!covered.length) return;
      const subs = kind === 'total' ? subRows.filter(r => below ? r > row : r < row) : [];
      const okAll = [], okSub = [], miss = [], checks = [];
      V.cols.forEach(c => {
        const v = c.vals[row]; if (v === null) return;
        const cd = c.cells[row].d, D = Math.max(c.sd, cd), up = 10n ** BigInt(D - c.sd), bg = r => c.big(r) * up;
        let S = 0n, cnt = 0, mn = null, mx = null;
        for (const r of covered) if (c.vals[r] !== null) { const x = bg(r); S += x; cnt++; if (mn === null || x < mn) mn = x; if (mx === null || x > mx) mx = x; }
        if (cnt < 2) return;
        const val = scaled(c.cells[row], D), unit = 10n ** BigInt(D);
        let ok, expected, shown;
        if (kind === 'count') { expected = BigInt(cnt) * unit; ok = val === expected; shown = String(cnt); }
        else if (kind === 'min') { expected = mn; ok = val === mn; shown = fx(D, mn); }
        else if (kind === 'max') { expected = mx; ok = val === mx; shown = fx(D, mx); }
        else if (kind === 'avg') { const d = val * BigInt(cnt) - S; ok = 2n * (d < 0n ? -d : d) * 10n ** BigInt(cd) <= BigInt(cnt) * unit; expected = (S * 2n + BigInt(cnt)) / (2n * BigInt(cnt)); shown = fx(D, expected); }
        else { expected = S; ok = val === S; shown = fx(D, S); }
        let subS = null;
        if (subs.length >= 2) { subS = 0n; let sc = 0; for (const r of subs) if (c.vals[r] !== null) { subS += bg(r); sc++; } if (sc < 2) subS = null; }
        const viaSub = subS !== null && val === subS;
        const terms = covered.filter(r => c.vals[r] !== null).slice(0, 3).map(r => fx(D, bg(r))), sumLike2 = kind === 'subtotal' || kind === 'total';
        checks.push(c.name + ': ' + (sumLike2 ? terms.join(' + ') + (cnt > 3 ? ' + …' : '') + ' (' + cnt + ' values)' : ({ avg: 'average', count: 'count', min: 'smallest', max: 'largest' }[kind]) + ' of ' + cnt + ' values (' + terms.join(', ') + (cnt > 3 ? ', …' : '') + ')') + ' = ' + shown + (viaSub && !ok ? ' (the subtotals add up to ' + fx(D, subS) + ')' : '') + '; the row says ' + fx(D, val) + (ok || viaSub ? ' ✓' : ' ✗'));
        if (ok) okAll.push(c);
        if (viaSub) okSub.push(c);
        if (!ok && !viaSub) miss.push({ c, val, expected, shown, subS, D });
      });
      const okCols = [...new Set([...okAll, ...okSub])];
      if (!okCols.length && !miss.length) return;
      const names = cs => cs.map(c => c.name).join(', '), sentences = [], exceptions = [];
      const what = { subtotal: 'the sum of ' + phrase, total: 'the sum of ' + phrase, avg: 'the average of ' + phrase, count: 'the number of rows ' + (below ? 'below' : 'above'), min: 'the smallest value ' + (below ? 'below' : 'above'), max: 'the largest value ' + (below ? 'below' : 'above') }[kind];
      const reason = (c, m) => ({ subtotal: phrase + ' add up to ' + m.shown, total: phrase + ' add up to ' + m.shown, avg: 'the average of ' + phrase + ' is ' + m.shown, count: 'there are ' + m.shown + ' ' + phrase.replace(/^the /, ''), min: 'the smallest value ' + (below ? 'below' : 'above') + ' is ' + m.shown, max: 'the largest value ' + (below ? 'below' : 'above') + ' is ' + m.shown }[kind]);
      if (okCols.length) {
        const parts = [];
        if (okAll.length) parts.push(what + ' in ' + names(okAll));
        if (okSub.length) parts.push('the sum of the subtotals in ' + names(okSub));
        sentences.push('Row ' + tag + ' equals ' + parts.join(' and ') + '.');
        miss.forEach(m => {
          const c = m.c, why = reason(c, m);
          let line = c.name + ': ' + why + (m.subS !== null ? ', the subtotals add up to ' + fx(m.D, m.subS) : '') + ', the row says ' + fx(m.D, m.val);
          line += kind === 'count' || kind === 'min' || kind === 'max' ? '.' : ' (' + diffTxt(m.D, m.val, m.expected) + ').';
          sentences.push(line);
          exceptions.push({ row, col: c.j, text: kind === 'total' ? why.replace(/^the /, '') : why, expected: Q(m.expected, 10n ** BigInt(m.D)), found: Q(m.val, 10n ** BigInt(m.D)), diff: diffTxt(m.D, m.val, m.expected), reason: why });
        });
      } else sentences.push('Row ' + tag + ' does not equal ' + what + (subs.length >= 2 ? ' or the sum of the subtotals' : '') + ' in any column.');
      out.push({
        id: 'rows:' + key + ':' + kind + ':' + row, kind: 'rows', subject: { kind: 'rows', table: key, cols: okCols.map(c => c.j), line: null }, scope: { kind: 'positions', rows: covered, label: phrase },
        family: kind, rank: 0, params: 0, key: 'total:' + row, form: what, headline: sentences[0], hits: okCols.length, n: okCols.length + miss.length, exact: okCols.length, rounded: 0,
        exceptions, excN: exceptions.length, log10p: null, chance: null, tested: 0, next: null, fills: [], predictions: null, status: 'observation', group: null, parts: [], explainedBy: {},
        evidence: { kind, row, covered, below, columns: okCols.map(c => c.name), subtotalRows: subs, how: ['The row ' + tag + ' was compared with ' + what + ' in every number column that has a value in that row.', 'Amounts were added exactly, keeping the decimals as written.', 'A summary row is checked here and left out of the relation search, so it is not an exception of any relation.'], checks }, sentences
      });
    });
    return out;
  }

  function digitsFor(V, seqs) {
    const out = [], colsWord = V.cols.length + (V.cols.length === 1 ? ' column' : ' columns');
    V.cols.forEach(c => {
      const nums = c.nums, n = nums.length;
      const integer = c.max <= SAFE_INT && -c.min <= SAFE_INT && nums.every(Number.isInteger);
      const stepPass = seqs.some(s => s.col === c.j && s.seqKind === 'step');
      if (integer && n >= 50 && nums.filter(v => Math.abs(v) >= 10).length >= .9 * n && !stepPass) {
        const cnt = Array(10).fill(0); nums.forEach(v => cnt[Math.abs(v) % 10]++);
        const e = n / 10, chi2 = cnt.reduce((s, o) => s + (o - e) ** 2 / e, 0), p = Math.min(1, UTIL.chiP(chi2, 9) * V.cols.length);
        out.push(c.name + ': last digits ' + (p < .01 ? 'are uneven' : 'look even') + ' (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', corrected for ' + colsWord + ', ' + n + ' values). Invented or hand-typed numbers often skew last digits; so do rounding and prices.');
      }
      if (integer && n >= 30) {
        const k = nums.filter(v => Math.abs(v) % 5 === 0).length;
        if (UTIL.adjust(UTIL.log10Tail(n, k, .2), V.cols.length) <= MAX_LOG10P) out.push(c.name + ': ' + Math.round(k / n * 100) + '% end in 0 or 5 (expected 20%): values look rounded or estimated.');
      }
      if (c.min > 0 && n >= 100 && c.max / c.min >= 100) {
        const cnt = Array(10).fill(0); nums.forEach(v => { const m = String(Math.abs(v)).match(/[1-9]/); if (m) cnt[+m[0]]++; });
        let mad = 0, chi2 = 0;
        for (let dg = 1; dg <= 9; dg++) { const pr = Math.log10(1 + 1 / dg), e = n * pr; mad += Math.abs(cnt[dg] / n - pr); chi2 += (cnt[dg] - e) ** 2 / e; }
        mad /= 9;
        const p = Math.min(1, UTIL.chiP(chi2, 8) * V.cols.length), verdict = p >= .01 ? 'fit' : mad <= .006 ? 'differ only slightly from' : 'differ from';
        out.push(c.name + ': first digits ' + verdict + ' Benford\'s law (χ² ' + chi2.toFixed(1) + ', p ' + fmtP(p) + ', corrected for ' + colsWord + ', MAD ' + mad.toFixed(4) + ', ' + n + ' values). Many natural amounts follow it; prices, IDs and capped ranges do not.');
      }
    });
    return out;
  }

  const legacyEq = r => {
    const exceptions = r.exceptions.map(x => Object.assign({}, x, { text: 'expected ' + r.fmt(x.expected) + ' (' + r.headline + ')' }));
    return Object.assign({}, r, { text: r.headline, rhs: r.form, k: r.hits, adj: r.chance, exceptions, exc: exceptions });
  };

  function signedQ(found, expected, d) {
    const diff = Q(found * expected.d - expected.n, expected.d), neg = diff.n < 0n;
    return (neg ? '−' : '+') + show(Q(neg ? -diff.n : diff.n, diff.d), d);
  }
  function seqView(res, col, d, rowOf, label) {
    const fmt = col.date ? v => isoDay(Number(typeof v === 'bigint' ? v : v.n / v.d)) : v => show(v, d);
    const exc = res.exc.map(e => ({ row: rowOf(e.i), label: label ? label(rowOf(e.i)) : '', expected: e.expected, found: e.found, diff: signedQ(e.found, e.expected, d), pos: e.i, reason: 'differs from ' + res.desc, text: 'expected ' + fmt(e.expected) + ' (' + col.name + ' ' + res.desc + ')' }));
    const filled = res.filled.map(f => Object.assign({}, f, { row: rowOf(f.i) }));
    return Object.assign({}, res, {
      fmt, mUsed: res.tested * res.cols, filled, fills: filled, byRow: !!label, kind: 'seq', seqKind: res.family, name: col.name, col: col.j, d, unit: col.date ? ' days' : '', exc,
      headline: col.name + ' ' + res.desc, exceptions: label ? exc : exc.map(e => { const o = Object.assign({}, e); delete o.row; return o; })
    });
  }

  const splitLine = l => l.includes(';') ? l.split(/\s*;\s*/) : l.includes(', ') ? l.split(/,\s+/) : /\s/.test(l.trim()) ? l.trim().split(/\s+/) : l.split(',');
  const isNumberLine = l => /^[\s\d.,;+\-−?]+$/.test(l) && splitLine(l).length >= MIN_SEQ;

  function kvLines(t) {
    const h = t.head, jv = h.indexOf('Value'), ju = h.indexOf('Unit / currency'), js = h.indexOf('SI value'), groups = new Map();
    if (jv < 0) return [];
    t.rows.forEach(r => {
      const si = js >= 0 ? CELL.parseOne(r[js], 'auto') : null, c = si || CELL.parseOne(r[jv], 'auto');
      if (!c) return;
      const unit = (si ? si.unit : ju >= 0 ? String(r[ju] ?? '').trim() : c.unit) || c.cur || '';
      if (!groups.has(unit)) groups.set(unit, []);
      groups.get(unit).push(c.v);
    });
    return [...groups].filter(([, v]) => v.length >= 3).map(([unit, v]) => colLine('Value' + (unit ? ' (' + unit + ')' : ''), v));
  }

  const arrangeOf = (V, items, fails = []) => PAT.arrange(items, { names: V.head, fails, algebra: (r, j) => { const x = REL.algebra(V, r, j); return x ? legacyEq(x) : null; } });
  const primariesOf = (arranged, kind) => arranged.subjects.filter(s => s.kind === kind).map(s => s.primary);

  function analyze(a) {
    const tables = a.tables.map(t => {
      const V = view(t), dups = t.dups || [];
      if (t.title === 'Key–value pairs') {
        const lines = kvLines(t);
        if (!lines.length) return null;
        V.notes = [];
        return { eqs: [], seqs: [], totals: [], totalHow: [], totalRes: [], cols: lines, digits: [], dups: [], formula: {}, bad: {}, overflow: 0, m: 0, unsearched: V.unsearched, V, kvOnly: true };
      }
      const noNum = !V.cols.length && !V.dateCols.length, rel = noNum ? null : REL.run(V), trel = TREL.run(V, rel ? rel.tested + rel.combined : 0);
      if (noNum) {
        if (!dups.length && !V.notes.length && !trel.results.length) return null;
        const arranged = arrangeOf(V, trel.results);
        return { eqs: [], seqs: [], totals: [], totalHow: [], totalRes: [], cols: [], digits: [], dups, formula: {}, bad: badOf(arranged.problems), overflow: 0, m: 0, unsearched: V.unsearched, V, trel, arranged };
      }
      const items = [], seqCols = V.cols.concat(V.dateCols).filter(c => c.distinct >= 2).map(c => ({ c, x: V.dataRows.map(r => c.vals[r] === null ? null : c.big(r)) })).filter(e => e.x.filter(v => v !== null).length >= MIN_SEQ);
      seqCols.forEach(({ c, x }) => {
        const fit = SEQ.results(x, { d: c.sd, seed: [V.key, 'col', c.j], columns: true, date: !!c.date, cols: seqCols.length, subject: { kind: 'column', table: V.key, cols: [c.j], line: null }, name: c.name });
        if (fit) fit.results.concat(fit.misses).forEach(r => { r.fitted = fit.fitted; items.push(seqView(r, c, c.sd, i => V.dataRows[i], V.label)); });
      });
      rel.results.forEach(r => items.push(legacyEq(r)));
      trel.results.forEach(r => items.push(r));
      const totalRes = totalsFor(V, V.key);
      totalRes.forEach(r => items.push(r));
      const arranged = arrangeOf(V, items, rel.fails), eqs = primariesOf(arranged, 'rel').sort((x, y) => x.target - y.target), seqs = arranged.subjects.filter(s => s.kind === 'seq').map(s => Object.assign(s.primary, { rivals: s.candidates.slice(0, 2), ambiguous: s.ambiguous })).sort((x, y) => x.col - y.col);
      const formula = {}, bad = badOf(arranged.problems);
      let overflow = 0;
      eqs.forEach(e => { formula[e.target] = e.rhs; overflow += e.excN - e.exc.length; });
      seqs.forEach(q => { overflow += q.excN - q.exc.length; });
      const totals = totalRes.flatMap(r => r.sentences), totalHow = totalRes.flatMap(r => r.sentences.map((_, i) => i === 0 ? r.evidence : null));
      const cols = V.cols.map(c => colLine(c.name + (c.unit ? ' (' + c.unit + ')' : ''), c.nums));
      const digits = digitsFor(V, seqs);
      return { eqs, seqs, totals, totalHow, totalRes, cols, digits, dups, formula, bad, overflow, m: rel.tested, unsearched: V.unsearched, V, rel, trel, arranged };
    });

    (a.pairs || []).forEach(p => {
      if (!DECLARED.test(p.k)) return;
      const pc = CELL.parseOne(p.v); if (!pc) return;
      const cand = [];
      tables.forEach((nt, ti) => {
        if (!nt || nt.kvOnly) return;
        nt.V.cols.forEach(c => {
          let S = 0n, cnt = 0;
          for (const r of nt.V.dataRows) if (c.vals[r] !== null) { S += c.big(r); cnt++; }
          if (cnt < 2) return;
          cand.push({ nt, ti, c, S, count: cnt, money: c.cur >= 0 || (a.tables[ti].types && a.tables[ti].types[c.j]) === 'Amount' });
        });
      });
      const money = cand.filter(x => x.money), pool = money.length ? money : cand;
      let matched = false;
      pool.forEach(({ nt, ti, c, S, count }) => {
        const D = Math.max(c.sd, pc.d), x = S * 10n ** BigInt(D - c.sd), y = scaled(pc, D), d = x < y ? y - x : x - y;
        if (2n * d > 10n ** BigInt(D - pc.d)) return;
        matched = true;
        let t = p.k + ' (line ' + p.line + ', ' + p.v + ') equals the sum of ' + c.name + ' (' + count + ' rows)' + (d === 0n ? '' : ' after rounding to ' + pc.d + ' decimals') + '.';
        if (c.cur >= 0) {
          const cs = [...new Set(nt.V.dataRows.map(r => String(a.tables[ti].rows[r][c.cur] ?? '').trim()).filter(Boolean))];
          if (cs.length > 1) t += ' ' + c.name + ' mixes ' + cs.slice(0, 6).join(' and ') + ', so this sum adds different currencies.';
        }
        nt.totals.push(t); nt.totalHow.push({ how: ['The value ' + p.v + ' on line ' + p.line + ' was compared with the sum of ' + (money.length ? 'each money column' : 'each number column') + '.', 'Amounts were added exactly, keeping the decimals as written.' + (pc.d < c.sd ? ' The line was rounded to ' + pc.d + ' decimals, so a match within half of its last digit counts.' : '')], checks: [c.name + ': ' + count + ' rows add up to ' + REL.fixed([S, 10n ** BigInt(c.sd)], c.sd) + '; the line says ' + p.v + (d === 0n ? ' ✓' : ' (matches after rounding to ' + pc.d + ' decimals)')] });
      });
      if (!matched && money.length === 1) {
        const { nt, c, S, count } = money[0];
        nt.totals.push(p.k + ' (line ' + p.line + ', ' + p.v + ') does not equal the sum of ' + c.name + ' (' + REL.fixed([S, 10n ** BigInt(c.sd)], c.sd) + ', ' + count + ' rows).');
        nt.totalHow.push({ how: ['The value ' + p.v + ' on line ' + p.line + ' was compared with the sum of the only money column.', 'Amounts were added exactly, keeping the decimals as written.'], checks: [c.name + ': ' + count + ' rows add up to ' + REL.fixed([S, 10n ** BigInt(c.sd)], c.sd) + '; the line says ' + p.v + ' ✗'] });
      }
    });

    const used = new Set(a.used || []), lines = [], isGap = t => /^\?+$/.test(t);
    a.kept.forEach((l, i) => {
      if (used.has(i) || !isNumberLine(l)) return;
      const parts = splitLine(l);
      const toks = parts.slice(0, LINE_CAP).map(s => s.trim()), info = CELL.column(toks.map(t => isGap(t) ? '' : t));
      if (info.kind !== 'num' || toks.some((t, k) => !isGap(t) && !info.cells[k])) return;
      const d = info.d, col = { j: 0, name: 'Values' };
      const fit = SEQ.results(info.cells.map(c => c ? scaled(c, d) : null), { d, seed: ['line', UTIL.hash32(toks.join(','))], columns: false, date: false, subject: { kind: 'line', table: '', cols: [0], line: i + 1 }, name: col.name });
      const items = fit ? fit.results.concat(fit.misses).map(r => { r.fitted = fit.fitted; if (parts.length > toks.length) r.next = null; return seqView(r, col, d, k => k, null); }) : [];
      const arranged = PAT.arrange(items, {}), sub = arranged.subjects[0], best = sub ? Object.assign(sub.primary, { rivals: sub.candidates.slice(0, 2), ambiguous: sub.ambiguous }) : null;
      lines.push({ line: i + 1, items: toks, total: parts.length, seqs: best ? [best] : [], arranged });
    });

    const dupN = tables.reduce((s, t) => s + (t ? t.dups.length : 0), 0), eq = tables.reduce((s, t) => s + (t ? t.eqs.length : 0), 0), seq = tables.reduce((s, t) => s + (t ? t.seqs.length : 0), 0) + lines.reduce((s, l) => s + l.seqs.length, 0);
    const brokenKeys = new Set(); let overflow = 0;
    tables.forEach((t, ti) => { if (t) { overflow += t.overflow; Object.keys(t.bad).forEach(k => brokenKeys.add(ti + '|' + k)); } });
    const text = tables.reduce((s, t) => s + (t && t.trel ? t.trel.results.filter(r => r.chance !== null).length : 0), 0);
    return { tables, lines, count: { eq, seq, text, dups: dupN, broken: brokenKeys.size + overflow } };
  }

  const esc = UTIL.esc;
  const colOfR = R => R.subject.cols.length ? R.subject.cols[0] : -1;
  const cellRef = (R, x) => x.row + ':' + (x.col !== undefined ? x.col : colOfR(R));
  const colsAttr = R => [...new Set([...R.subject.cols, ...(R.inputs || [])])].sort((x, y) => x - y).join(',');
  const cellsAttr = R => R.exceptions.filter(x => x.row !== undefined).map(x => cellRef(R, x)).join(';');
  const tip = (R, s) => ' title="' + esc(R.headline + (s ? ' · ' + s.words.join(', ') : '')) + '"';
  const chanceNote = what => '<p class="tstat">Chance: how often a match this good appears when the values are shuffled, corrected for ' + what + '.</p>';
  const section = (title, items, note = '', id = '') => items.length ? '<h4' + (id ? ' id="' + id + '"' : '') + '>' + title + '</h4>' + note + '<ul class="stats">' + items.join('') + '</ul>' : '';
  const unsearchedNote = nt => nt.V.notes.map(x => '<p class="tstat">' + esc(x) + '</p>').join('') + (nt.unsearched.cols.length ? '<p class="tstat">Only the first ' + MAX_COLS + ' numeric columns were searched for relations; not searched: ' + esc(nt.unsearched.cols.join(', ')) + '.</p>' : '') + (nt.unsearched.dates.length ? '<p class="tstat">Only the first ' + MAX_DATE_COLS + ' date columns were searched for relations; not searched: ' + esc(nt.unsearched.dates.join(', ')) + '.</p>' : '');
  const FINER = ' (finer than the list\'s precision)';
  const fmtOfR = R => R.fmt || String;
  const where = (c, f) => c.byRow ? 'row ' + (f.row + 1) : 'position ' + (f.i + 1);
  const fills = c => c.filled && c.filled.length ? ' · fills in ' + esc(c.filled.map(f => where(c, f) + ' = ' + c.fmt(f.v)).join(', ')) : '';
  const nextOf = c => c.next !== null && c.next !== undefined ? ' · next ' + esc(c.fmt(c.next)) + (c.finer ? FINER : '') : '';
  const fitNote = s => s.fitted < s.size ? ' · rule searched in the first ' + s.fitted.toLocaleString('en-US') + ' values, checked on all ' + s.size.toLocaleString('en-US') : '';
  const qOf = v => v === null || v === undefined ? null : /\//.test(v) ? Q(BigInt(v.split('/')[0]), BigInt(v.split('/')[1])) : Q(BigInt(v));

  function Lookup(arranged, prefix) {
    const byId = new Map(), anchors = new Map();
    arranged.subjects.forEach((s, k) => {
      const a = prefix + '-p' + k;
      anchors.set(s.primary.id, a);
      [s.primary, ...s.equivalents, ...s.rivals, ...s.others, ...s.implied.map(x => x.result), ...s.parts.filter(x => x && x.id)].forEach(r => { if (r && r.id) byId.set(r.id, r); });
      s.parts.forEach(x => { if (x && x.id) anchors.set(x.id, a); });
    });
    return { byId, anchors };
  }

  function excHTML(R, L) {
    if (!R.exceptions.length) return '';
    const f = fmtOfR(R), unit = R.unit || '';
    const li = x => {
      const lab = x.row !== undefined ? 'Row ' + (x.row + 1) : 'Position ' + (x.pos + 1), by = R.explainedBy[x.row !== undefined ? x.row : x.pos], S = by !== undefined && L ? L.byId.get(by) : null;
      const ex = typeof x.expected === 'object' && x.expected !== null && 'n' in x.expected ? f(x.expected) : String(x.expected), fo = typeof x.found === 'object' && x.found !== null && 'n' in x.found ? f(x.found) : String(x.found);
      return '<li' + (x.row !== undefined ? ' data-cell="' + cellRef(R, x) + '"' : '') + '>' + lab + (x.label ? ' ' + esc(x.label) : '') + ': expected ' + esc(ex) + ', found ' + esc(fo) + ' (' + esc(x.diff) + unit + ')' + (S ? ' · explained by <a href="#' + L.anchors.get(S.id) + '">' + esc(S.headline) + '</a>' : '') + '</li>';
    };
    return '<ul class="stats">' + R.exceptions.slice(0, SHOW_EXC).map(li).join('') + (R.excN > SHOW_EXC ? '<li>and ' + (R.excN - SHOW_EXC) + ' more</li>' : '') + '</ul>';
  }

  const li = x => '<li>' + x + '</li>';
  const p0Text = p => String(Number(p.toPrecision(2)));
  const halfOf = d => d > 0 ? '0.' + '0'.repeat(d) + '5' : '0.5';
  const sub = (title, lines) => lines.length ? '<li>' + title + '<ul class="stats">' + lines.map(li).join('') + '</ul></li>' : '';
  const howDetails = items => items.length ? '<details><summary>How this was found</summary><ul class="stats">' + items.join('') + '</ul></details>' : '';
  const stop = t => /[.…!?]$/.test(t) ? t : t + '.';
  const cap1 = t => t.replace(/^./, c => c.toUpperCase());
  const howOf = R => { const ev = R.evidence || {}, how = Array.isArray(ev.how) ? ev.how.join(' ') : String(ev.how || ''); return how; };
  const numbersOf = R => { const ev = R.evidence || {}, how = howOf(R), prm = ev.params || []; return prm.length && !prm.some(p => how.includes(String(p.value))) ? prm.map(p => p.name + ' = ' + p.value).join(', ') : ''; };
  const ruleText = R => {
    const how = howOf(R), nums = numbersOf(R);
    return (nums ? 'Numbers used: ' + nums + '. ' : '') + (how ? cap1(how) + '.' : R.params ? '' : 'It has no fitted numbers: each prediction uses the other columns exactly as they are.');
  };

  function workedLine(R, x, ok, ex, L) {
    const lab = x.label ? x.label : 'Row ' + (x.row + 1), arg = x.args && x.args.length ? x.args.join(', ') + ' → ' : '';
    const left = x.expr ? x.expr + ' = ' + x.expected : arg + x.expected;
    if (ok) return esc(lab + ': ' + left + (x.exact ? '' : ' (rounded)') + (x.found !== x.expected ? ' (found ' + x.found + ')' : '')) + ' ✓';
    const by = ex && L ? R.explainedBy[ex.row !== undefined ? ex.row : ex.pos] : undefined, S = by !== undefined ? L.byId.get(by) : null;
    return esc(lab + ': ' + left + ', found ' + x.found + (ex ? ' (' + ex.diff + (R.unit || '') + ')' : '')) + (S ? ' — explained by <a href="#' + L.anchors.get(S.id) + '">' + esc(S.headline) + '</a>' : ' ✗');
  }

  function chanceRel(R) {
    const ev = R.evidence || {}, out = [];
    if (ev.pairs) out.push('Shuffled check: a row\'s prediction matched another row\'s value in ' + ev.pairHits + ' of ' + ev.pairs + ' pairs (p₀ = (' + ev.pairHits + ' + 1) ÷ (' + ev.pairs + ' + 2) ≈ ' + p0Text(ev.pPair) + ').');
    if (ev.pRefit !== null && ev.pRefit !== undefined) out.push('Refitting the numbers on shuffled values gave p₀ ≈ ' + p0Text(ev.pRefit) + '; the larger of the two was used.');
    out.push('Holding in ' + R.hits + ' of ' + R.n + ' rows by luck: ' + fmtChance(R.log10p) + '.');
    const mix = ev.combinedN && R.scope && R.scope.kind !== 'all' ? ': ' + ev.plain + ' ordinary and ' + ev.combinedN + ' two-part variants' + (ev.mult && ev.mult.length ? ' (this rule alone has ' + ev.mult.join(', ') + ')' : '') : '';
    out.push('Tested ' + R.tested + ' relations' + mix + ', so corrected: ' + fmtChance(R.chance) + '.');
    return out.join(' ');
  }

  function chanceSeq(c) {
    return 'Shuffled check: shuffling the known values ' + c.shuffles + ' times gave a hit rate of p₀ ≈ ' + p0Text(c.pShuffle) + ' per position.' + (c.pRefit !== null && c.pRefit !== undefined ? ' Refitting a rule with ' + c.params + ' numbers on ' + c.refits + ' shuffles gave p₀ ≈ ' + p0Text(c.pRefit) + '; the larger of the two was used.' : '') +
      ' Holding in ' + c.hits + ' of ' + c.trials + ' positions by luck: ' + fmtChance(c.log10p) + '. Tested ' + c.tested + ' rules' + (c.cols > 1 ? ' per column × ' + c.cols + ' columns = ' + c.tested * c.cols : '') + ', so corrected: ' + fmtChance(c.adj) + '.';
  }

  const whyItem = s => s && s.why ? [li('Why this one: ' + esc(s.why))] : [];
  const nestedOthers = s => s && s.others.length ? ['<li><details><summary>Other rules that fit</summary><ul class="stats">' + s.others.map(r => li(esc(formOf(r)) + ' · ' + r.hits + ' of ' + r.n + ' · chance ' + esc(fmtChance(r.chance)) + (r.kind === 'seq' ? nextOf(r) : ''))).join('') + '</ul></details></li>'] : [];

  function seqLines(e, R, withRule = true) {
    const items = [];
    if (withRule) items.push(li('Rule: ' + esc(stop(e.rule)) + ' ' + esc(e.how.join(' '))));
    else if (e.how.length) items.push(li(esc(e.how.join(' '))));
    if (e.table.length) items.push(sub('Difference table', e.table.map(esc)));
    const w = e.worked.map(x => esc(x) + ' ✓');
    if (e.exception) { const m = /^position (\d+)/.exec(e.exception), by = m && R && R.explainedBy ? R.explainedBy[+m[1] - 1] : undefined; w.push(esc(e.exception) + (by !== undefined ? ' — explained elsewhere' : ' ✗')); }
    if (w.length) items.push(sub('Worked rows', w));
    items.push(li('Repair walk: ' + esc(e.walk) + '.'));
    items.push(li(esc(chanceSeq(e.chance))));
    return items;
  }

  function howSeq(R, s) { return seqLines(R.explain(), R).concat(whyItem(s), nestedOthers(s)); }

  function howRel(R, s, L) {
    const ev = R.evidence || {}, items = [li('Rule: ' + esc(stop(R.headline)) + ' ' + esc(ruleText(R)))];
    if (ev.direction) items.push(li('Direction: ' + esc(ev.direction) + '.'));
    if (!R.combined || !R.parts.length) {
      const rows = (ev.hits || []).map(x => workedLine(R, x, true)), e0 = R.exceptions[0];
      if (ev.firstException && e0) rows.push(workedLine(R, ev.firstException, false, e0, L));
      if (rows.length) items.push(sub('Worked rows', rows));
    }
    items.push(li(R.date ? 'Dates must match to the day: ' + R.exact + ' exact, ' + R.rounded + ' rounded.' : 'Values match within ±' + halfOf(ev.decimals || 0) + ' (half of the last digit): ' + R.exact + ' exact, ' + R.rounded + ' rounded.'));
    if (R.chance !== null && R.log10p !== null) items.push(li(esc(chanceRel(R))));
    return items.concat(whyItem(s), nestedOthers(s));
  }

  function howText(R, s, L) {
    const ev = R.evidence || {}, items = [li('Rule: ' + esc(stop(R.headline)) + ' ' + esc(howOf(R)))];
    if (ev.explain) return items.concat(seqLines(typeof ev.explain === 'function' ? ev.explain() : ev.explain, R, false), whyItem(s));
    const rows = [];
    (ev.worked || []).forEach(x => {
      if (x.x !== undefined) rows.push(esc(x.x + ' → ' + x.y + ' in ' + x.count + ' of ' + x.of + ' rows') + ' ✓');
      else if (x.a !== undefined) rows.push(esc('Row ' + (x.row + 1) + ': ' + x.a + ', ' + x.b + ' → ' + x.result) + ' ✓');
    });
    const e0 = R.exceptions[0];
    if (e0) rows.push(esc((e0.label ? e0.label : 'Row ' + ((e0.row !== undefined ? e0.row : e0.pos) + 1)) + ': ' + (e0.text || e0.reason || '')) + ' ✗');
    if (rows.length) items.push(sub('Worked rows', rows));
    if (R.chance !== null && R.log10p !== null) {
      const luck = 'Holding in ' + R.hits + ' of ' + R.n + ' rows by luck: ' + fmtChance(R.log10p) + '. Tested ' + R.tested + ' relations in this table, so corrected: ' + fmtChance(R.chance) + '.';
      if (ev.shuffles) items.push(li(esc('Shuffled check: shuffling the values ' + ev.shuffles + ' times, a most common partner repeated by chance with p₀ ≈ ' + p0Text(ev.p0) + '. ' + luck)));
      else if (ev.pairs) items.push(li(esc('Pair check: a built value matched another row\'s value in about p₀ ≈ ' + p0Text(ev.p0) + ' of ' + ev.pairs + ' pairs. ' + luck)));
      else items.push(li(esc(luck)));
    }
    return items.concat(whyItem(s));
  }

  function howPart(x, R) {
    const items = [];
    if (x.fit) items.push(li('Numbers: ' + esc(x.fit) + '.'));
    if (x.how && x.how.length) items.push(li(esc(x.how.join(' '))));
    const rows = (x.worked || []).map(w => workedLine(R, w, true));
    if (x.firstException) rows.push(workedLine(R, x.firstException, false));
    if (rows.length) items.push(sub('Worked rows', rows));
    return items;
  }

  function nearText(r, why) {
    if (why === 'chance') return 'chance ' + fmtChance(r.chance) + ' after correction, above the ' + fmtChance(MAX_LOG10P) + ' bar';
    if (why === 'split') return 'a split explains the exceptions, but not by enough to rule out chance';
    if (why === 'support') return 'holds in ' + r.hits + ' of ' + r.n + ' rows, below ' + Math.round(UTIL.MIN_SUPPORT * 100) + '%';
    if (why === 'rows') return 'holds in ' + r.hits + ' of ' + r.n + ' rows, too few to check a rule with ' + r.params + ' fitted ' + (r.params === 1 ? 'number' : 'numbers');
    return 'it would make the chain of relations circular';
  }

  function nearHTML(A) {
    if (!A || !A.nearMisses.length) return '';
    const more = A.nearMissTotal - A.nearMisses.length;
    return '<details><summary>Tested but not shown (' + A.nearMissTotal + ')</summary><ul class="stats">' + A.nearMisses.map(m => '<li>' + esc(formOf(m.result)) + ' — ' + esc(nearText(m.result, m.reason)) + '</li>').join('') + (more > 0 ? '<li>and ' + more + ' more</li>' : '') + '</ul></details>';
  }

  const howTotal = e => e ? e.how.map(x => li(esc(x))).concat(sub('Worked rows', e.checks.map(esc))) : [];

  const partsHTML = R => R.parts && R.parts.length ? '<ul class="stats">' + R.parts.map(x => '<li>' + esc(x.label) + ': ' + esc(x.desc) + (x.n !== undefined ? ' (' + x.hits + ' of ' + x.n + ')' : '') + howDetails(howPart(x, R)) + '</li>').join('') + '</ul>' : '';
  const detailsList = (title, items) => items.length ? '<details><summary>' + title + '</summary><ul class="stats">' + items.join('') + '</ul></details>' : '';
  const formOf = R => R.kind === 'seq' ? R.desc : R.headline;
  const equivalentsHTML = s => detailsList('Same rule, written differently', s.equivalents.map(r => '<li>' + esc(formOf(r)) + '</li>'));
  const impliedHTML = (s, L) => s.implied.length ? detailsList('Also follows from the above', s.implied.map(x => '<li>' + esc(x.result.headline) + ' · follows from ' + esc(x.via.map(id => L.byId.get(id) ? L.byId.get(id).headline : id).join(' and ')) + '</li>')) : '';

  function rivalsHTML(s, L) {
    const all = [s.primary, ...s.rivals], seq = s.kind === 'seq';
    const head = '<tr><th>Rule</th><th>Fits</th><th>Chance</th>' + (seq ? '<th>Next 3 values</th>' : '') + '</tr>';
    const row = r => '<tr><td>' + esc(formOf(r)) + '</td><td>' + r.hits + ' of ' + r.n + '</td><td>' + esc(fmtChance(r.chance)) + '</td>' + (seq ? '<td>' + [0, 1, 2].map(i => { const q = qOf(r.predictions[r.size + i]); return q === null ? '—' : esc(r.fmt(q)); }).join(', ') + '</td>' : '') + '</tr>';
    const tail = s.divergeAt === null ? '' : seq ? '<p class="tstat">They agree up to position ' + (s.divergeAt - 1) + ', then differ.</p>' : '<p class="tstat">They flag different rows, starting at row ' + s.divergeAt + '; no cell is marked unless every rule marks it.</p>';
    return '<p class="tstat">Ambiguous: these rules fit about equally well and continue differently, so no next value or fill is given.</p><div class="tablewrap"><table><thead>' + head + '</thead><tbody>' + all.map(row).join('') + '</tbody></table></div>' + tail + '<ul class="stats">' + s.rivals.map(r => '<li>' + esc(formOf(r)) + howDetails(r.kind === 'seq' ? howSeq(r, null) : howRel(r, null, L)) + '</li>').join('') + '</ul>';
  }

  function seqItem(s, L, id) {
    const R = s.primary, w = s.words.join(' · ');
    const head = '<b>' + esc(R.name) + '</b> ' + esc(R.desc) + ' · ' + esc(w) + (R.excN === 0 ? ' · ' + R.hits + ' of ' + R.n : '') + ' · chance ' + esc(fmtChance(R.chance));
    const body = s.ambiguous ? rivalsHTML(s, L) : nextOf({ next: s.next, fmt: R.fmt, finer: R.finer }) + (R.gaps.length ? ' · missing ' + esc(R.gaps.map(R.fmt).join(', ')) : '') + fills({ filled: s.fills, fmt: R.fmt, byRow: R.byRow });
    return '<li' + (id ? ' id="' + id + '"' : '') + ' tabindex="0" data-cols="' + colsAttr(R) + '" data-cells="' + cellsAttr(R) + '"' + tip(R, s) + '>' + head + body +
      ' · corrected ' + (R.byRow ? '' : 'per list ') + 'for ' + R.mUsed + (R.mUsed === 1 ? ' rule' : ' rules') + ' tested' + (R.cols > 1 ? ' (' + R.tested + ' per column × ' + R.cols + ' columns)' : '') + fitNote(R) + partsHTML(R) + excHTML(R, L) + howDetails(howSeq(R, s)) + equivalentsHTML(s) + '</li>';
  }

  function relItem(s, L, id) {
    const R = s.primary, w = s.words.join(' · ');
    return '<li' + (id ? ' id="' + id + '"' : '') + ' tabindex="0" data-cols="' + colsAttr(R) + '" data-cells="' + cellsAttr(R) + '"' + tip(R, s) + '><b>' + esc(R.headline) + '</b> · ' + esc(w) + (R.excN === 0 ? ' · ' + R.hits + ' of ' + R.n + ' rows' : '') + ' · chance ' + esc(fmtChance(R.chance)) +
      partsHTML(R) + (s.ambiguous ? rivalsHTML(s, L) : '') + excHTML(R, L) + howDetails(howRel(R, s, L)) + equivalentsHTML(s) + impliedHTML(s, L) + '</li>';
  }

  function textItem(s, L, id) {
    const R = s.primary, w = s.words.join(' · ');
    return '<li' + (id ? ' id="' + id + '"' : '') + ' tabindex="0" data-cols="' + colsAttr(R) + '" data-cells="' + cellsAttr(R) + '"' + tip(R, s) + '><b>' + esc(R.headline) + '</b>' + (R.chance !== null ? ' · ' + esc(w) + ' · chance ' + esc(fmtChance(R.chance)) : '') + excHTML(R, L) + howDetails(howText(R, s, L)) + '</li>';
  }

  const problemsHTML = (nt, prefix) => {
    const ps = nt.arranged.problems;
    if (!ps.length) return '';
    return '<details' + (ps.length <= 10 ? ' open' : '') + ' id="' + prefix + '-problems"><summary>Problems in this table (' + ps.length + ')</summary><ul class="stats">' + ps.slice(0, 50).map(c => '<li data-cell="' + c.row + ':' + c.col + '">Row ' + (c.row + 1) + (nt.V.label(c.row) ? ' ' + esc(nt.V.label(c.row)) : '') + ' · ' + esc(nt.V.head[c.col] || 'column ' + (c.col + 1)) + ': ' + esc(c.reasons.map(x => x.text).join('; ')) + '</li>').join('') + (ps.length > 50 ? '<li>and ' + (ps.length - 50) + ' more</li>' : '') + '</ul></details>';
  };

  function render(nt, o = {}) {
    const prefix = o.id || 'ttable', A = nt.arranged;
    if (!A) return section('Columns', nt.cols.map(s => '<li>' + esc(s) + '</li>'));
    const L = Lookup(A, prefix), firsts = {}, build = (s, k) => {
      const kind = s.kind, id = !firsts[kind] && s.visible ? prefix + '-' + kind : prefix + '-p' + k;
      if (s.visible && !firsts[kind]) firsts[kind] = true;
      return (kind === 'rel' ? relItem : kind === 'seq' ? seqItem : textItem)(s, L, id);
    };
    const idx = new Map(A.subjects.map((s, k) => [s, k])), pick = (kind, vis, amb, chance) => A.subjects.filter(s => s.kind === kind && s.visible === vis && s.ambiguous === amb && (s.primary.chance !== null) === chance);
    const list = (kind, vis, amb, chance = true) => pick(kind, vis, amb, chance).map(s => build(s, idx.get(s)));
    const chain = A.chain.length && A.subjects.filter(s => s.kind === 'rel').length >= 2 ? A.chain.map(c => '<p class="tstat">Chain: ' + esc(c.text) + '</p>').join('') : '';
    const hidden = ['rel', 'seq', 'text'].flatMap(k => list(k, false, false).concat(list(k, false, true)));
    const more = hidden.length ? '<details><summary>More patterns (' + hidden.length + ')</summary><ul class="stats">' + hidden.join('') + '</ul></details>' : '';
    const found = A.summary.relations + A.summary.sequences + A.summary.text;
    const dupItems = nt.dups.map(d => '<li>Row ' + (d.row + 1) + ' is identical to row ' + (d.of + 1) + '</li>');
    return chain + section('Relations', list('rel', true, false), chanceNote(nt.m + ' relations tested')) + section('Sequences', list('seq', true, false), chanceNote('the number of rules tested')) + unsearchedNote(nt) +
      section('Duplicate rows', dupItems, '', prefix + '-dups') + section('Text relations', list('text', true, false), chanceNote('the number of text relations tested')) +
      section('Ambiguous', list('rel', true, true).concat(list('seq', true, true), list('text', true, true))) + more + (found || nt.dups.length ? '' : '<p class="tstat">No pattern found. This isn\'t evidence there is no pattern.</p>') +
      problemsHTML(nt, prefix) + (o.after || '') + section('Totals', nt.totals.map((t, i) => '<li>' + esc(t) + howDetails(howTotal(nt.totalHow[i])) + '</li>')) + section('Observations', list('text', true, false, false).concat(list('text', false, false, false))) + section('Columns', nt.cols.map(s => '<li>' + esc(s) + '</li>')) + section('Digits', nt.digits.map(s => '<li>' + esc(s) + '</li>')) + nearHTML(A);
  }

  function renderLine(L) {
    const A = L.arranged, prefix = 'tline-' + L.line, look = Lookup(A, prefix), s = A.subjects[0];
    const body = s ? section('Sequences', [seqItem(s, look, prefix + '-seq')], chanceNote('the number of rules tested')) : '<p class="tstat">No pattern passed. Only step, ratio, polynomial, recurrence, cycle and known-sequence families were tested; a list the app declines to explain is not evidence that it has no pattern.</p>';
    const shown = L.items.slice(0, SHOW_VALUES).join(', ') + (L.total > SHOW_VALUES ? ' … (' + L.total + ' values' + (L.total > L.items.length ? ', first ' + L.items.length + ' analysed' : '') + ')' : '');
    return '<article class="card" id="' + prefix + '"><h3>Number line ' + L.line + '</h3><p class="tstat">' + esc(shown) + '</p>' + body + nearHTML(A) + '</article>';
  }

  function chips(N) {
    const out = [], c = N.count, firstTable = f => { const ti = N.tables.findIndex(t => t && t.arranged && f(t.arranged)); return ti >= 0 ? ti : -1; };
    const link = (label, n, href) => '<' + (href ? 'a class="chip" href="' + href + '"' : 'span class="chip"') + '>' + label + ' <b>' + n + '</b></' + (href ? 'a' : 'span') + '>';
    const ti = k => { const i = firstTable(a => a.subjects.some(s => s.kind === k && s.visible && s.primary.chance !== null)); return i >= 0 ? '#ttable-' + i + '-' + k : null; };
    if (c.eq > 0) out.push(link('Relations', c.eq, ti('rel')));
    if (c.seq > 0) { const li = N.lines.find(l => l.seqs.length); out.push(link('Sequences', c.seq, ti('seq') || (li ? '#tline-' + li.line + '-seq' : null))); }
    if (c.text > 0) out.push(link('Text relations', c.text, ti('text')));
    if (c.dups > 0) { const i = N.tables.findIndex(t => t && t.dups.length); out.push(link('Duplicate rows', c.dups, i >= 0 ? '#ttable-' + i + '-dups' : null)); }
    if (c.broken > 0) { const i = firstTable(a => a.problems.length); out.push(link('Problems', c.broken, i >= 0 ? '#ttable-' + i + '-problems' : null)); }
    return out;
  }

  const hasFindings = nt => !!nt && !nt.kvOnly && ((nt.arranged && nt.arranged.subjects.length > 0) || nt.totals.length > 0 || nt.digits.length > 0 || nt.dups.length > 0);

  const HEAD = ['Type', 'Finding', 'Holds in', 'Chance', 'Row', 'Label', 'Expected', 'Found', 'Difference', 'Subject', 'Status', 'Group', 'Scope', 'How found', 'Worked example'];
  function explainOf(R) {
    if (R.kind === 'seq') { const e = R.explain(); return [e.how.join(' ') || e.rule, e.worked[0] || '']; }
    const ev = R.evidence || {}, h = ev.hits && ev.hits[0], w = ev.worked && ev.worked[0];
    const how = R.kind === 'rel' ? (R.headline + '. ' + ruleText(R)).trim() : howOf(R);
    const work = h ? 'row ' + (h.row + 1) + ': ' + (h.expr ? h.expr.replace(/\s+/g, ' ') + ' → ' : '') + h.expected + ' (found ' + h.found + ')' : w && w.x !== undefined ? w.x + ' → ' + w.y + ' in ' + w.count + ' of ' + w.of + ' rows' : w && w.a !== undefined ? 'row ' + (w.row + 1) + ': ' + w.a + ', ' + w.b + ' → ' + w.result : R.kind === 'rows' && ev.checks ? ev.checks[0] || '' : '';
    return [how, work];
  }

  function findings(nt) {
    const safe = UTIL.csvSafe, rows = [HEAD], A = nt.arranged, names = j => nt.V.head[j] !== undefined ? nt.V.head[j] : 'column ' + (j + 1);
    const info = (R, status) => { const [how, work] = explainOf(R); return [safe(R.subject.cols.map(names).join(', ')), status || R.status || '', R.group === null || R.group === undefined ? '' : safe(String(R.group)), safe(R.scope && R.scope.label ? R.scope.label : R.scope ? R.scope.kind : ''), safe(how), safe(work)]; };
    const diff = (x) => String(x.diff === undefined ? '' : x.diff).replace('−', '-');
    const excRows = (R, text) => {
      const f = fmtOfR(R), show1 = v => typeof v === 'object' && v !== null && 'n' in v ? f(v) : String(v);
      R.exceptions.forEach(x => rows.push(['Exception', safe(text), '', '', x.row !== undefined ? x.row + 1 : x.pos + 1, safe(x.label || ''), safe(show1(x.expected)), safe(show1(x.found)), safe(diff(x)), ...info(R, 'exception')]));
      if (R.excN > R.exceptions.length) rows.push(['Exception', safe(text), '', '', '', 'and ' + (R.excN - R.exceptions.length) + ' more', '', '', '', '', '', '', '', '', '']);
    };
    (A ? A.subjects : []).forEach(sub => {
      const R = sub.primary, text = R.kind === 'seq' ? R.name + ' ' + R.desc : R.headline;
      if (R.kind === 'rel') rows.push(['Equation', safe(text), R.hits + ' of ' + R.n + ' rows', fmtChance(R.chance), '', '', '', '', '', ...info(R)]);
      else if (R.kind === 'seq') rows.push(['Sequence', safe(text), R.hits + ' of ' + R.n, fmtChance(R.chance), '', '', '', '', '', ...info(R)]);
      else if (R.kind === 'text') rows.push([R.chance !== null ? 'Text relation' : 'Observation', safe(R.headline), R.hits + ' of ' + R.n, R.chance !== null ? fmtChance(R.chance) : '', '', '', '', '', '', ...info(R)]);
      if (R.kind === 'rows') return;
      if (sub.ambiguous) sub.rivals.forEach(r => rows.push(['Ambiguous alternative', safe(r.kind === 'seq' ? R.name + ' ' + r.desc : r.headline), r.hits + ' of ' + r.n, fmtChance(r.chance), '', '', r.kind === 'seq' && r.next !== null ? R.fmt(r.next) : '', '', '', ...info(r, 'rival')]));
      else if (R.kind === 'seq') {
        if (sub.next !== null) rows.push(['Next value', safe(text), '', '', '', '', R.fmt(sub.next) + (R.finer ? FINER : ''), '', '', ...info(R)]);
        R.gaps.forEach(g => rows.push(['Missing value', safe(text), '', '', '', '', R.fmt(g), '', '', ...info(R)]));
        sub.fills.forEach(f => rows.push(['Filled value', safe(text), '', '', (R.byRow ? f.row : f.i) + 1, '', R.fmt(f.v), '', '', ...info(R)]));
      }
      sub.equivalents.forEach(r => rows.push(['Equivalent form', safe(formOf(r)), r.hits + ' of ' + r.n, '', '', '', '', '', '', ...info(r, 'equivalent')]));
      sub.implied.forEach(x => rows.push(['Implied relation', safe(x.result.headline), x.result.hits + ' of ' + x.result.n + ' rows', '', '', '', '', '', '', ...info(x.result, 'implied')]));
      excRows(R, text);
    });
    nt.dups.forEach(d => rows.push(['Duplicate row', 'identical to row ' + (d.of + 1), '', '', d.row + 1, '', '', '', '', '', '', '', '', '', '']));
    nt.totals.forEach(s => rows.push(['Total', safe(s), '', '', '', '', '', '', '', '', '', '', '', '', '']));
    nt.digits.forEach(s => rows.push(['Digits', safe(s), '', '', '', '', '', '', '', '', '', '', '', '', '']));
    return rows;
  }

  return { analyze, render, renderLine, chips, hasFindings, findings, isNumberLine };
})();
