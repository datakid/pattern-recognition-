const PAT = (() => {
  const { MAX_LOG10P, NEAR_LOG10P } = UTIL;
  const WINDOW = 1, AMBIGUITY = 2, MARGIN = 2, MAIN_CAP = 5, RIVAL_CAP = 3, MISS_CAP = 5;

  const kindOf = r => r.kind || (r.predictions ? 'seq' : r.chance === null ? 'text' : 'rel');
  const skey = s => s.kind + ':' + s.table + ':' + s.cols.join(',') + ':' + (s.line === null || s.line === undefined ? '' : s.line);
  const gkey = r => kindOf(r) + '|' + skey(r.subject);
  const colOf = r => r.subject.cols.length ? r.subject.cols[0] : -1;
  const cmpId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const order = (a, b) => a.params - b.params || a.rank - b.rank || a.excN - b.excN || a.headline.length - b.headline.length || cmpId(a, b);
  const byChance = (a, b) => a.chance - b.chance || cmpId(a, b);
  const simpler = (a, b) => a.params < b.params || (a.params === b.params && a.rank < b.rank);
  const isCombined = r => r.scope.kind !== 'all' || !!r.combined;
  const passes = r => r.chance !== null && r.chance <= MAX_LOG10P;
  const posOf = e => e.row !== undefined ? e.row : e.pos;
  const exSet = r => new Set(r.exceptions.map(posOf));
  const qk = v => v === null || v === undefined ? '' : typeof v === 'object' ? v.n + '/' + v.d : String(v);
  const outcome = r => qk(r.next) + '|' + (r.fills || []).map(f => f.i + '=' + qk(f.v)).join(',');
  const wild = (a, b) => { const p = a.predictions, q = b.predictions, n = a.size; return p.length === q.length && p.every((v, i) => v === q[i] || (i < n && (v === null || q[i] === null))); };
  const equivalent = (a, b) => a === b || (a.predictions && b.predictions ? wild(a, b) && outcome(a) === outcome(b) : a.key !== null && a.key !== undefined && a.key === b.key);

  const covers = (r, p) => {
    const s = r.scope;
    if (s.kind === 'all' || !s.rows) return true;
    return s.rows.some(x => Array.isArray(x) ? p >= x[0] && p <= x[1] : x === p);
  };
  const sharesColumn = (a, b) => a.subject.table === b.subject.table && a.subject.cols.some(c => b.subject.cols.includes(c));

  function words(r, ambiguous) {
    const out = [];
    if (r.status === 'observation' || r.chance === null) return ['Observation'];
    if (ambiguous) out.push('Ambiguous');
    if (isCombined(r)) out.push('Two parts');
    if (r.excN > 0) out.push('Holds in ' + r.hits + ' of ' + r.n);
    else if (r.rounded > 0) out.push('After rounding to ' + (r.d || 0) + ' decimal' + (r.d === 1 ? '' : 's'));
    else out.push('Exact');
    return out;
  }

  function diverge(win, rivals) {
    let at = null;
    for (const r of rivals) {
      let k = null;
      if (win.predictions && r.predictions) {
        for (let i = 0; i < win.predictions.length; i++) { const p = win.predictions[i], q = r.predictions[i]; if (p !== null && q !== null && p !== q) { k = i + 1; break; } }
        if (k === null && outcome(win) !== outcome(r)) k = win.size + 1;
      } else {
        const a = exSet(win), b = exSet(r), rows = [...a].filter(x => !b.has(x)).concat([...b].filter(x => !a.has(x))).sort((x, y) => x - y);
        if (rows.length) k = rows[0] + 1;
      }
      if (k !== null && (at === null || k < at)) at = k;
    }
    return at;
  }

  function arbitrate(list) {
    const sorted = list.slice().sort(byChance), singles = sorted.filter(r => !isCombined(r)), eligible = [], demoted = [];
    sorted.forEach(r => {
      if (!isCombined(r)) { eligible.push(r); return; }
      const rival = singles.find(g => !equivalent(g, r));
      if (!rival || r.chance < rival.chance - MARGIN) eligible.push(r); else demoted.push(r);
    });
    const groups = [];
    eligible.forEach(r => {
      const g = groups.find(e => equivalent(e.rep, r));
      if (!g) groups.push({ chance: r.chance, rep: r, members: [r] });
      else { g.members.push(r); if (simpler(r, g.rep)) g.rep = r; }
    });
    const top = groups[0].chance, win = groups.filter(g => g.chance <= top + WINDOW).map(g => g.rep).sort(order)[0], wg = groups.find(g => g.rep === win);
    const rest = groups.filter(g => g !== wg).map(g => g.rep);
    const disagree = r => r.excN === 0 && (win.predictions && r.predictions ? outcome(r) !== outcome(win) : win.excN > 0);
    const candidates = rest.filter(disagree), rivals = candidates.filter(r => r.chance <= win.chance + AMBIGUITY);
    const rivalSet = new Set(rivals), equivalents = wg.members.filter(m => m !== win).sort(byChance);
    return { primary: win, top: groups[0].rep, equivalents, rivals: rivals.slice(0, RIVAL_CAP), candidates, others: rest.filter(r => !rivalSet.has(r)), demoted, ambiguous: rivals.length > 0 };
  }

  const nameOf = r => '“' + (r.predictions ? r.form : r.headline) + '”';

  function why(a, win) {
    const eq = a.equivalents.concat(win.members || []);
    if (a.ambiguous) return win.predictions ? 'Two rules fit about equally well and continue differently from position ' + diverge(win, a.rivals) + ', so no next value or fill is given.' : 'Two rules fit about equally well and flag different rows, so only cells that every rule flags are marked.';
    if (eq.length) {
      const e = eq.slice().sort(order)[0], cause = e.params > win.params ? 'has fewer parameters' : e.rank > win.rank ? 'is the simpler kind of rule' : win.predictions ? 'was listed first' : 'states the last column in terms of the others';
      return 'Chosen over ' + nameOf(e) + ' because they are the same rule and this one ' + cause + '.';
    }
    if (a.top !== win) return 'Chosen over ' + nameOf(a.top) + ' because it is simpler and its chance is within a factor of 10 of the best.';
    return a.others.length ? 'It has the smallest chance of arising by luck among the ' + (a.others.length + 1) + ' rules that fit.' : 'No other rule passed the chance bar for this ' + (win.predictions ? 'list' : 'column') + '.';
  }

  function rebuild(rep, ctx) {
    if (!ctx.algebra || rep.family !== 'sum' || !rep.inputs || rep.inputs.length !== 2) return rep;
    const j = Math.max(colOf(rep), ...rep.inputs);
    return j === colOf(rep) ? rep : ctx.algebra(rep, j) || rep;
  }

  function display(group, ctx) {
    const right = group.slice().sort((a, b) => colOf(b) - colOf(a) || a.chance - b.chance || cmpId(a, b))[0];
    if (group.length > 1) {
      const best = group.slice().sort(byChance)[0];
      if (best.chance < right.chance - 1 && best.hits > right.hits) return { rep: best, shown: best };
    }
    return { rep: right, shown: rebuild(right, ctx) };
  }

  const twin = r => r.inputs && r.inputs.length === 1 && r.scope.kind === 'all' && !r.combined && r.excN === 0 ? r.subject.table + ':' + [colOf(r), r.inputs[0]].sort((a, b) => a - b).join(',') + ':' + r.n : null;
  const prefer = (a, b) => a.rounded - b.rounded || colOf(b) - colOf(a) || a.chance - b.chance || cmpId(a, b);

  function mergeKeys(rels, ctx) {
    const groups = new Map(), out = [];
    rels.forEach(r => { const k = r.key === null || r.key === undefined ? 'id:' + r.id : r.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    groups.forEach(g => {
      const { rep, shown } = display(g, ctx), members = g.filter(m => m !== rep);
      if (shown !== rep) members.push(rep);
      shown.members = members.sort(byChance);
      out.push(shown);
    });
    const byPair = new Map(), keep = [];
    out.forEach(r => {
      const k = twin(r);
      if (k === null) { keep.push(r); return; }
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k).push(r);
    });
    byPair.forEach(g => {
      const best = g.slice().sort(prefer)[0];
      g.filter(x => x !== best).forEach(x => { best.members = best.members.concat([x], x.members || []).sort(byChance); });
      keep.push(best);
    });
    return keep;
  }

  function depths(subjects, ctx) {
    const rel = subjects.filter(s => s.kind === 'rel' && s.primary.inputs).sort((a, b) => colOf(a.primary) - colOf(b.primary)), edges = new Map(), dropped = [];
    const reach = (from, to, seen = new Set()) => { if (from === to) return true; if (seen.has(from)) return false; seen.add(from); return (edges.get(from) || []).some(n => reach(n, to, seen)); };
    rel.forEach(s => {
      const t = colOf(s.primary), ins = s.primary.inputs.filter(i => i !== t);
      if (ins.some(i => reach(t, i))) { dropped.push(s); return; }
      ins.forEach(i => { if (!edges.has(i)) edges.set(i, []); edges.get(i).push(t); });
      if (!edges.has(t)) edges.set(t, edges.get(t) || []);
    });
    const parents = new Map();
    edges.forEach((outs, from) => outs.forEach(to => { if (!parents.has(to)) parents.set(to, []); parents.get(to).push(from); }));
    const memo = new Map(), depth = c => { if (memo.has(c)) return memo.get(c); memo.set(c, 0); const d = (parents.get(c) || []).reduce((m, p) => Math.max(m, depth(p) + 1), 0); memo.set(c, d); return d; };
    const nodes = [...edges.keys()].sort((a, b) => a - b), comp = new Map();
    nodes.forEach(n => { if (comp.has(n)) return; const stack = [n]; comp.set(n, n); while (stack.length) { const c = stack.pop(); [...(edges.get(c) || []), ...(parents.get(c) || [])].forEach(x => { if (!comp.has(x)) { comp.set(x, n); stack.push(x); } }); } });
    const name = j => ctx.names && ctx.names[j] !== undefined ? ctx.names[j] : 'column ' + (j + 1), chain = [];
    [...new Set(comp.values())].sort((a, b) => a - b).forEach(root => {
      const members = nodes.filter(n => comp.get(n) === root), levels = [];
      members.forEach(n => { const d = depth(n); (levels[d] = levels[d] || []).push(n); });
      const lv = levels.filter(Boolean).map(l => l.sort((a, b) => a - b));
      if (lv.length > 1) chain.push({ cols: lv, text: lv.map(l => l.map(name).join(', ')).join(' → ') });
    });
    return { chain, depth, dropped };
  }

  function arrange(results, ctx = {}) {
    const live = [], misses = [], pool = new Map(), through = [];
    results.forEach(r => {
      r.explainedBy = {};
      if (r.status === 'part') { pool.set(r.id, r); return; }
      const k = kindOf(r);
      if (k === 'rel' || k === 'seq') (passes(r) ? live : misses).push(r); else through.push(r);
    });
    const rels = mergeKeys(live.filter(r => kindOf(r) === 'rel'), ctx), seqs = live.filter(r => kindOf(r) === 'seq');
    const groups = new Map();
    rels.concat(seqs).forEach(r => { const k = gkey(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    const subjects = [];
    groups.forEach((list, key) => {
      const a = arbitrate(list), p = a.primary;
      a.demoted.forEach(r => { r.demoted = 'split'; });
      const clean = !a.ambiguous;
      subjects.push({
        key, kind: kindOf(p), subject: p.subject, primary: p, equivalents: a.equivalents.concat(p.members || []), rivals: a.rivals, candidates: a.candidates, others: a.others, implied: [], nearMisses: a.demoted.map(r => ({ result: r, reason: 'split' })),
        parts: (p.parts || []).map(x => typeof x === 'string' ? pool.get(x) || { id: x } : x), ambiguous: a.ambiguous, divergeAt: a.ambiguous ? diverge(p, a.rivals) : null,
        next: clean && p.next ? p.next : null, fills: clean && p.fills ? p.fills : [], words: words(p, a.ambiguous), why: why(a, p), visible: true
      });
      list.forEach(r => { r.status = 'others'; });
      a.others.forEach(r => { r.status = 'others'; });
      a.equivalents.concat(p.members || []).forEach(r => { r.status = 'equivalent'; });
      a.rivals.forEach(r => { r.status = 'rival'; });
      a.demoted.forEach(r => { r.status = 'nearmiss'; });
      p.status = 'primary';
    });
    through.forEach(r => subjects.push({ key: gkey(r) + '|' + r.id, kind: kindOf(r), subject: r.subject, primary: r, equivalents: [], rivals: [], candidates: [], others: [], implied: [], nearMisses: [], parts: [], ambiguous: false, divergeAt: null, next: null, fills: [], words: words(r, false), why: '', visible: true }));

    const relSubjects = subjects.filter(s => s.kind === 'rel'), primaryOf = new Map();
    relSubjects.forEach(s => primaryOf.set(colOf(s.primary), s.primary));
    relSubjects.forEach(s => {
      const T = colOf(s.primary), keep = [];
      s.others.forEach(x => {
        const via = [s.primary].concat((x.inputs || []).filter(i => i !== T).map(i => primaryOf.get(i)).filter(Boolean));
        const fail = new Set(); via.forEach(v => exSet(v).forEach(p => fail.add(p)));
        if (x.inputs && x.excN === x.exceptions.length && x.exceptions.every(e => fail.has(posOf(e))) && via.every(v => v.excN === v.exceptions.length)) { x.status = 'implied'; s.implied.push({ result: x, via: via.map(v => v.id) }); }
        else keep.push(x);
      });
      s.others = keep;
    });

    const { chain, depth, dropped } = depths(subjects, ctx);
    const rank = { rel: 0, seq: 1, text: 2, rows: 3 }, subjOrder = (a, b) => {
      if (a.kind !== b.kind) return (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
      if (a.kind === 'rel') return depth(colOf(a.primary)) - depth(colOf(b.primary)) || colOf(a.primary) - colOf(b.primary);
      return colOf(a.primary) - colOf(b.primary) || a.primary.rank - b.primary.rank || cmpId(a.primary, b.primary);
    };
    subjects.sort(subjOrder);

    const shown = [];
    subjects.forEach(s => { shown.push(s.primary); s.parts.forEach(x => { if (x && x.scope && x.exceptions) shown.push(x); }); });
    shown.forEach(R => R.exceptions.forEach(e => {
      const p = posOf(e);
      if (R.chance === null) return;
      const S = shown.find(o => o !== R && o.chance !== null && sharesColumn(o, R) && covers(o, p) && !exSet(o).has(p));
      if (S) R.explainedBy[p] = S.id;
    }));

    const cells = new Map();
    subjects.forEach(s => {
      if (s.ambiguous) return;
      [s.primary].concat(s.parts.filter(x => x && x.exceptions)).forEach(R => R.exceptions.forEach(e => {
        const p = posOf(e);
        if (e.row === undefined || R.explainedBy[p] !== undefined) return;
        const col = e.col !== undefined ? e.col : colOf(R), k = e.row + ',' + col, c = cells.get(k) || { row: e.row, col, reasons: [] }, text = e.text || e.reason;
        if (!c.reasons.some(x => x.text === text)) c.reasons.push({ id: R.id, text });
        cells.set(k, c);
      }));
    });
    const problems = [...cells.values()].sort((a, b) => a.row - b.row || a.col - b.col);

    const main = subjects.filter(s => s.primary.chance !== null).slice().sort((a, b) => a.primary.chance - b.primary.chance || cmpId(a.primary, b.primary));
    main.slice(MAIN_CAP).forEach(s => { s.visible = false; });

    const liveKeys = new Set(groups.keys()), best = new Map();
    const val = e => e.result.chance !== null && e.result.chance !== undefined ? e.result.chance : 100 - e.result.hits / e.result.n;
    const before = (a, b) => val(a) - val(b) || (a.result.params || 0) - (b.result.params || 0) || cmpId(a.result, b.result);
    misses.filter(r => r.chance !== null && r.chance <= NEAR_LOG10P).map(r => ({ result: r, reason: 'chance' })).concat((ctx.fails || []).map(r => ({ result: r, reason: r.miss })), subjects.flatMap(s => s.nearMisses), dropped.map(s => ({ result: s.primary, reason: 'circular' }))).forEach(e => {
      const k = gkey(e.result) + '|' + (e.reason === 'split' || e.reason === 'circular' ? e.reason : liveKeys.has(gkey(e.result)) ? 'live' : 'open');
      if (e.reason !== 'split' && e.reason !== 'circular' && liveKeys.has(gkey(e.result))) return;
      if (!best.has(k) || before(e, best.get(k)) < 0) best.set(k, e);
    });
    const near = [...best.values()].sort(before);
    const count = k => subjects.filter(s => s.kind === k && s.primary.chance !== null).length;
    return {
      subjects, chain, problems, nearMisses: near.slice(0, MISS_CAP), nearMissTotal: near.length, hiddenCount: main.length - Math.min(MAIN_CAP, main.length),
      summary: { relations: count('rel'), sequences: count('seq'), text: count('text'), ambiguous: subjects.filter(s => s.ambiguous).length, problems: problems.length, observations: subjects.filter(s => s.primary.chance === null).length }
    };
  }

  return { arrange, words, MARGIN, WINDOW, AMBIGUITY, MAIN_CAP, RIVAL_CAP, MISS_CAP };
})();
