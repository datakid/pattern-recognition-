const seqsOf = N => N.lines.flatMap(l => l.seqs);
const only = N => { const s = seqsOf(N); return s.length === 1 ? s[0] : null; };
const nextOf = s => s.next === null ? null : s.fmt(s.next);
const brief = N => JSON.stringify({
  lines: N.lines.map(l => l.seqs.map(s => ({ family: s.family, desc: s.desc, k: s.k, n: s.n, excN: s.excN, exc: s.exc.map(e => [e.row + 1, s.fmt(e.expected), s.fmt(e.found)]), next: nextOf(s), filled: s.filled.map(f => [f.i + 1, s.fmt(f.v)]), ambiguous: s.ambiguous }))),
  tables: N.tables.map(t => t && t.eqs.map(e => ({ text: e.text, k: e.k, n: e.n, exc: e.exc.map(x => [x.row + 1, e.fmt(x.expected), e.fmt(x.found)]) })))
});
const withEnv = (env, fn) => {
  const keep = {};
  Object.keys(env).forEach(k => { keep[k] = [k in globalThis, globalThis[k]]; globalThis[k] = env[k]; });
  try { return fn(); } finally { Object.keys(env).forEach(k => { if (keep[k][0]) globalThis[k] = keep[k][1]; else delete globalThis[k]; }); }
};
const swap = (obj, key, repl, fn) => { const old = obj[key]; obj[key] = repl; try { return fn(); } finally { obj[key] = old; } };
const fakeClick = (sel, dataset, node) => ({ target: { closest: s => s === sel ? Object.assign(node || { textContent: '' }, { dataset }) : null } });
const mkSeq = (id, chance, preds, over = {}) => Object.assign({ id, kind: 'seq', subject: { kind: 'column', table: 't', cols: [0], line: null }, scope: { kind: 'all', rows: null, label: '' }, family: 'poly', rank: 0, key: null, form: id, headline: 'A ' + id, desc: id, name: 'A', k: 5, n: 5, hits: 5, exact: 5, rounded: 0, size: 5, params: 1, log10p: chance - 1, adj: chance, chance, tested: 50, mUsed: 50, cols: 1, excN: 0, exc: [], exceptions: [], gaps: [], filled: [], fills: [], next: preds.length > 5 ? UTIL.Q(BigInt(preds[5])) : null, finer: false, combined: null, parts: [], predictions: preds, status: 'primary', group: null, explainedBy: {}, fmt: q => String(q.n), byRow: true, fitted: 5, d: 0, explain: () => ({ rule: id, how: [], table: [], worked: [], exception: null, walk: 'forward', chance: { hits: 5, trials: 5, params: 1, p0: 0.1, pShuffle: 0.1, pRefit: null, shuffles: 200, refits: 0, log10p: chance - 1, adj: chance, tested: 50, cols: 1 } }) }, over);
const mkRel = (id, col, chance, over = {}) => Object.assign({ id, kind: 'rel', subject: { kind: 'column', table: 't', cols: [col], line: null }, scope: { kind: 'all', rows: null, label: '' }, family: 'sum', rank: 0, key: id, form: id, headline: id, hits: 8, n: 8, exact: 8, rounded: 0, size: 8, params: 2, log10p: chance - 1, chance, tested: 20, excN: 0, exceptions: [], inputs: [], combined: null, parts: [], status: 'primary', group: null, explainedBy: {}, fmt: String, d: 0, evidence: {} }, over);
const fakeNt = (arranged, head) => ({ arranged, cols: [], dups: [], totals: [], digits: [], m: 20, V: { notes: [], head, label: () => '' }, unsearched: { cols: [], dates: [] } });
const arrSum = A => JSON.stringify([A.subjects.map(s => [s.key, s.primary.id, s.primary.status, s.equivalents.map(r => r.id), s.rivals.map(r => r.id), s.others.map(r => r.id), s.implied.map(x => x.result.id), s.words, s.divergeAt, s.ambiguous, s.visible]), A.problems.map(p => [p.row, p.col, p.reasons.map(r => r.text)]), A.chain.map(c => c.text), A.nearMisses.map(m => m.result.id), A.hiddenCount]);
const arrOf = N => JSON.stringify(N.tables.map(t => t && t.arranged ? arrSum(t.arranged) : null).concat(N.lines.map(l => arrSum(l.arranged))));
const grid12 = (() => { let s = 12345; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; const rows = ['X1,Y1,X2,Y2,X3,Y3,X4,Y4,X5,Y5,X6,Y6']; for (let i = 0; i < 9; i++) { const c = []; for (let k = 1; k <= 6; k++) { const x = 10 + Math.floor(r() * 90); c.push(x, x * (k + 1)); } rows.push(c.join(',')); } return rows.join('\n'); })();
const NET = 'Gross,Fee,Net\n100.00,3.20,96.80\n250.00,7.75,242.25\n80.00,2.60,77.40\n310.00,9.40,300.60\n45.00,1.90,43.10\n620.00,18.10,601.90\n150.00,4.55,145.45\n90.00,2.95,87.05';
const IMPLIED = 'Revenue,Tax,Total\n120.00,24.00,144.00\n340.00,68.00,408.00\n280.00,56.00,336.00\n156.00,31.20,187.20\n400.00,80.00,480.00\n224.00,44.80,268.80\n188.00,37.60,225.60\n312.00,62.40,374.40';
const fakeCard = () => {
  const els = [];
  const el = (tag, r, c) => { const e = { tag, r: String(r), c: String(c), on: false, attrs: {}, scrolled: null, focused: false }; e.classList = { add: n => { if (n === 'hl') e.on = true; }, remove: n => { if (n === 'hl') e.on = false; } }; e.setAttribute = (k, v) => { e.attrs[k] = v; }; e.scrollIntoView = o => { e.scrolled = o; }; e.focus = () => { e.focused = true; }; els.push(e); return e; };
  [0, 1, 2, 3].forEach(c => el('th', '', c));
  [0, 1, 2, 3].forEach(r => [0, 1, 2, 3].forEach(c => el('td', r, c)));
  const all = sel => { let m; if (sel === '.hl') return els.filter(e => e.on); if ((m = /^th\[data-c="(\d+)"\]$/.exec(sel))) return els.filter(e => e.tag === 'th' && e.c === m[1]); if ((m = /^td\[data-r="(\d+)"\]\[data-c="(\d+)"\]$/.exec(sel))) return els.filter(e => e.tag === 'td' && e.r === m[1] && e.c === m[2]); return []; };
  const card = { els, querySelectorAll: all, querySelector: sel => all(sel)[0] || null };
  const node = dataset => ({ dataset, closest: s => s === '.ttable' ? card : null });
  return { card, node, hot: () => els.filter(e => e.on).map(e => e.tag + ':' + e.r + ':' + e.c).join(' ') };
};
const plain = h => h.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const X = { seqsOf, only, nextOf, brief, withEnv, swap, mkSeq, mkRel, fakeNt, arrSum, plain };
const listCase = (name, src, test) => ({ name, src, test: N => { const s = only(N); return s && test(s) ? null : brief(N); } });
const noneCase = (name, src, test) => ({ name, src, test: N => test(N) ? null : brief(N) });
const CASES = [
  listCase('step 4n − 1', '3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47', s => s.family === 'step' && s.desc.startsWith('4n − 1') && nextOf(s) === '51'),
  listCase('one wrong value is one exception', '3, 7, 11, 15, 19, 24, 27, 31, 35, 39, 43, 47', s => s.family === 'step' && s.excN === 1 && s.exc.length === 1 && s.exc[0].row === 5 && s.fmt(s.exc[0].expected) === '23' && s.fmt(s.exc[0].found) === '24' && s.next === null),
  listCase('Fibonacci', '1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610', s => s.desc === 'each value is the sum of the previous two' && nextOf(s) === '987'),
  listCase('Fibonacci with ?', '1, 1, 2, 3, ?, 8, 13, 21, 34, 55, 89, 144', s => s.filled.length === 1 && s.filled[0].i === 4 && s.fmt(s.filled[0].v) === '5'),
  listCase('squares', '1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144', s => s.desc.startsWith('n²') && nextOf(s) === '169'),
  listCase('triangular numbers', '1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78', s => s.desc.startsWith('(n² + n) / 2') && nextOf(s) === '91'),
  listCase('primes', '2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37', s => s.desc.startsWith('Prime numbers') && s.desc === 'Prime numbers (OEIS A000040)' && nextOf(s) === '41'),
  listCase('powers of two beyond 64 bits', '1152921504606846976, 2305843009213693952, 4611686018427387904, 9223372036854775808, 18446744073709551616, 36893488147419103232, 73786976294838206464, 147573952589676412928', s => s.desc === '× 2 each row' && nextOf(s) === '295147905179352825856'),
  noneCase('digits of pi: no rule', '3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9', N => seqsOf(N).length === 0),
  noneCase('1, 2, 4, 8, 16, 31: no next value', '1, 2, 4, 8, 16, 31', N => seqsOf(N).every(s => s.next === null)),
  noneCase('1, 2, 4, ?: ? not filled', '1, 2, 4, ?', N => seqsOf(N).every(s => s.filled.length === 0)),
  {
    name: 'table: Total = Qty × Price, row L flagged',
    src: 'Item,Qty,Price,Total\nA,2,3.50,7.00\nB,5,1.20,6.00\nC,3,4.00,12.00\nD,7,2.25,15.75\nE,1,9.99,9.99\nF,4,0.75,3.00\nG,6,5.10,30.60\nH,8,1.15,9.20\nI,10,2.00,20.00\nJ,3,3.33,9.99\nK,9,1.10,9.90\nL,2,7.45,15.00',
    test: N => {
      const t = N.tables.find(Boolean), e = t && t.eqs.find(q => q.text.startsWith('Total') && q.text.includes('Qty') && q.text.includes('Price'));
      const ok = e && e.k === 11 && e.n === 12 && e.exc.length === 1 && e.exc[0].row === 11 && e.fmt(e.exc[0].expected) === '14.90' && e.fmt(e.exc[0].found) === '15.00';
      return ok ? null : brief(N);
    }
  },
  {
    name: 'bug 23: the writing check runs once',
    node: true,
    test: () => {
      let calls = 0;
      const text = 'Revenue was steady. '.repeat(60), out = { innerHTML: '' };
      swap(WRITING, 'analyze', (orig => src => { calls++; return orig(src); })(WRITING.analyze), () => TUI.extractTextNow(text, out));
      return calls === 1 && out.innerHTML.includes('writing-card') ? null : 'analyze calls: ' + calls;
    }
  },
  {
    name: 'bug 29: exports are guarded against formula injection',
    test: () => {
      const csv = UTIL.toCSV([['=HYPERLINK(1)', '-5.00', '+x', '@sum', 'ok', '12%']]).slice(1);
      return csv === '"\'=HYPERLINK(1)","-5.00","\'+x","\'@sum","ok","12%"' && UTIL.toCSV([['a']]).charCodeAt(0) === 0xFEFF ? null : csv;
    }
  },
  {
    name: 'bug 30: object URLs are revoked and a failed copy is reported',
    node: true,
    src: 'Item,Qty\nA,1\nB,2\nC,3\nD,4',
    test: async () => {
      const out = { innerHTML: '' }, revoked = [], timers = [], saved = [], btn = { textContent: 'Copy' };
      TUI.extractTextNow('Item,Qty\nA,1\nB,2\nC,3\nD,4', out);
      const env = {
        URL: { createObjectURL: () => 'blob:1', revokeObjectURL: u => revoked.push(u) },
        Blob: class { constructor(parts) { this.parts = parts; } },
        document: { createElement: () => ({ click() { saved.push(this.download); } }) },
        navigator: { clipboard: { writeText: () => Promise.reject(new Error('denied')) } },
        setTimeout: f => { timers.push(f); return 0; }
      };
      return withEnv(env, async () => {
        TUI.onClick(fakeClick('[data-csv],[data-tsv]', { csv: '0' }));
        if (saved.length !== 1 || revoked.length) return 'saved ' + saved.length + ' revoked early ' + revoked.length;
        timers.splice(0).forEach(f => f());
        if (revoked.length !== 1) return 'revoked ' + revoked.length;
        TUI.onClick(fakeClick('[data-csv],[data-tsv]', { tsv: '0' }, btn));
        for (let i = 0; i < 8; i++) await 0;
        return btn.textContent === 'Copy failed' ? null : 'button says ' + btn.textContent;
      });
    }
  },
  {
    name: 'bug 31: errors on the normal path are reported',
    node: true,
    test: () => {
      const els = { '#text-input': { value: 'some text 1 2 3' }, '#text-out': { innerHTML: '' } };
      swap(TXT, 'analyze', () => { throw new Error('boom'); }, () => withEnv({ $: s => els[s] }, () => TUI.extractText()));
      return els['#text-out'].innerHTML.includes('Could not analyze this text: boom') ? null : els['#text-out'].innerHTML;
    }
  },
  {
    name: 'bug 32: a truncated table says so',
    test: () => {
      const rows = Array.from({ length: 1200 }, (_, i) => [String(i), String(i * 2)]);
      const html = TUI.cardHTML({ title: 'T', pattern: 'p', head: ['A', 'B'], rows, types: [] }, null, 0);
      const small = TUI.cardHTML({ title: 'T', pattern: 'p', head: ['A', 'B'], rows: rows.slice(0, 5), types: [] }, null, 0);
      return html.includes('Showing the first 1,000 of 1,200 rows; patterns use all rows.') && !small.includes('Showing the first') ? null : 'note missing';
    }
  },
  {
    name: 'bug 1: money and plain numbers keep every digit',
    src: 'Item A costs $1,234,567.89\nItem B costs $4.50\nItem C costs $123.00\n\nUnits sold 123456789\nUnits left 987654321\nUnits lost 111111111',
    test: (N, A) => {
      const cells = A.tables.flatMap(t => t.rows.flat());
      const ok = ['1234567.89', '4.50', '123.00', '123456789', '987654321', '111111111'].every(v => cells.includes(v)) && A.entities.some(e => e.norm === '1234567.89 USD') && A.entities.some(e => e.norm === '4.50 USD');
      return ok ? null : JSON.stringify(A.tables.map(t => t.rows));
    }
  },
  {
    name: 'bug 2: TSV rows with empty edge cells are kept',
    src: 'Name\tQty\tNote\nA\t1\tx\nB\t2\t\n\t3\ty\nD\t4\tz',
    test: (N, A) => {
      const t = A.tables[0];
      return t && JSON.stringify(t.head) === '["Name","Qty","Note"]' && JSON.stringify(t.rows) === '[["A","1","x"],["B","2",""],["","3","y"],["D","4","z"]]' ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 3: adjacent duplicate rows are kept and reported',
    src: 'Item,Qty,Price\nA,2,3.50\nB,5,1.20\nB,5,1.20\nC,3,4.00\nD,7,2.25',
    test: (N, A) => {
      const t = A.tables[0], nt = N.tables[0], rows = nt && NUMS.findings(nt).filter(r => r[0] === 'Duplicate row');
      const ok = t && t.rows.length === 5 && !A.removed.some(r => r[1] === 'duplicate') && nt.dups.length === 1 && nt.dups[0].row === 2 && nt.dups[0].of === 1 && rows.length === 1 && rows[0][4] === 3 && rows[0][1] === 'identical to row 2' && NUMS.hasFindings(nt) && NUMS.chips(N).some(c => c.includes('Duplicate rows'));
      return ok ? null : JSON.stringify({ rows: t && t.rows, removed: A.removed, dups: nt && nt.dups });
    }
  },
  {
    name: 'sample: the repeated Organic apples line is still removed',
    fixture: 'sample',
    src: 'ORDER SUMMARY\n=================\nItem  Qty  Price\nOrganic apples - 3 kg - $4.50\nWhole milk - 2 L - $3.20\nRice bag - 5 kg - $12.00\nOlive oil - 750 ml - €9.90\n-----------------\nOrder ID: INV-2026-0042\nDate: Oct 3, 2026\nContact: support@freshmart.example\nDelivery: 45 min\nTotal = $29.60\nSent from my iPhone\nOrganic apples - 3 kg - $4.50\n\nName: Alice Chen\nAge: 34\nCity: Berlin\n\nName: Omar Haddad\nAge: 29\nCity: Cairo\n\nServer 10.0.0.12 responded in 120 ms at 14:02\nServer 10.0.0.19 responded in 340 ms at 14:05\nServer 10.0.0.23 responded in 135 ms at 14:09\nServer 10.0.0.31 responded in 4100 ms at 14:12\nPay to IBAN GB82 WEST 1234 5698 7654 32 by 2026-02-30\nCard on file 4111 1111 1111 1111\nTracking 3f2c9a1e-7b4d-4c8a-9e21-5a6b7c8d9e0f\n<p>Unsubscribe</p>\n\nREGIONAL SALES\nRegion\tUnits\tPrice\tRevenue\tTax\tTotal\nNorth\t120\t4.50\t540.00\t108.00\t648.00\nSouth\t85\t6.20\t527.00\t105.40\t632.40\nEast\t240\t2.75\t660.00\t132.00\t792.00\nWest\t60\t12.00\t720.00\t144.00\t864.00\nCentral\t150\t3.80\t570.00\t114.00\t684.00\nCoast\t95\t7.40\t703.00\t140.60\t843.60\nValley\t310\t1.90\t589.00\t117.80\t716.80\nHills\t45\t15.50\t697.50\t139.50\t837.00\nTotal\t1105\t\t5006.50\t1001.30\t6007.80',
    test: (N, A) => A.removed.some(r => r[1] === 'duplicate' && r[0].startsWith('Organic apples')) && A.kept.filter(l => l.startsWith('Organic apples')).length === 1 ? null : JSON.stringify(A.removed)
  },
  {
    name: 'bug 4: numbered first column of a TSV is kept',
    src: 'No.\tItem\tQty\n1.\tApple\t3\n2.\tPear\t5\n3.\tPlum\t7',
    test: (N, A) => {
      const t = A.tables[0];
      return t && t.head[0] === 'No.' && JSON.stringify(t.rows.map(r => r[0])) === '["1.","2.","3."]' && t.head.length === 3 ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 5: times are not key-value pairs',
    src: 'Meeting at 10:30\nLunch at 12:15',
    test: (N, A) => A.tables.every(t => t.title !== 'Key–value pairs') && A.pairs.length === 0 ? null : JSON.stringify({ tables: A.tables.map(t => t.title), pairs: A.pairs })
  },
  {
    name: 'bug 5: a key with a time value splits at the first colon',
    src: 'Start: 10:30\nEnd: 11:45',
    test: (N, A) => {
      const p = A.pairs;
      return p.length === 2 && p[0].k === 'Start' && p[0].v === '10:30' && p[1].k === 'End' && p[1].v === '11:45' ? null : JSON.stringify(p);
    }
  },
  {
    name: 'bug 9: two number lists stay number lines',
    src: '3, 7, 11, 15, 19, 23, 27, 31, 35, 39\n2, 4, 8, 16, 32, 64, 128, 256, 512, 1024',
    test: (N, A) => A.tables.length === 0 && N.lines.length === 2 && N.lines.every(l => l.seqs.length === 1) && X.seqsOf(N)[0].desc.startsWith('4n − 1') && X.seqsOf(N)[1].desc === '× 2 each row' ? null : X.brief(N)
  },
  {
    name: 'bug 9: three adjacent comma lists with no spaces are one table that says so',
    src: '1,2,3,4,5,6\n7,8,9,10,11,12\n13,14,15,16,17,18',
    test: (N, A) => {
      const t = A.tables[0];
      return t && A.tables.length === 1 && t.title === 'Delimited table' && t.alsoReadableAs === '3 separate number lists' && N.lines.length === 0 ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 10: space-separated numbers are not a card',
    src: '3 7 11 15 19 23 27',
    test: (N, A) => A.tables.length === 0 && A.entities.every(e => e.type !== 'Card number') && N.lines.length === 1 && N.lines[0].items.length === 7 ? null : X.brief(N)
  },
  {
    name: 'bug 10: dimensions give two numeric columns',
    src: 'Screen A 1920 x 1080\nScreen B 1280 x 720\nScreen C 2560 x 1440',
    test: (N, A) => {
      const t = A.tables[0];
      return t && t.head.includes('Dimensions width') && t.head.includes('Dimensions height') && JSON.stringify(t.rows.map(r => r.slice(-2))) === '[["1920","1080"],["1280","720"],["2560","1440"]]' && !t.head.includes('Quantity') ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 10: a valid card is still a card',
    src: 'Card on file 4111 1111 1111 1111',
    test: (N, A) => A.entities.some(e => e.type === 'Card number' && e.check === 'Luhn checksum ok') && A.singles.length === 1 ? null : JSON.stringify(A.entities)
  },
  {
    name: 'bug 35: a vertical list gets its own title',
    src: '3\n7\n11\n15\n19\n23\n27\n31',
    test: (N, A) => A.tables.length === 1 && A.tables[0].title === 'Number list (one per line)' && A.tables[0].rows.length === 8 ? null : JSON.stringify(A.tables.map(t => t.title))
  },
  {
    name: 'bug 36: single lines with values are listed',
    src: 'Card on file 4111 1111 1111 1111\nPay to IBAN GB82 WEST 1234 5698 7654 32 by 2026-02-30\nNothing structured on this line at all',
    test: (N, A) => {
      const html = TUI.pageHTML(A, N, null, '');
      return A.singles.length === 2 && A.singles[0].startsWith('Card on file') && html.includes('Single lines with values (2)') && A.prose.length === 1 ? null : JSON.stringify({ singles: A.singles, prose: A.prose });
    }
  },
  {
    name: 'bug 13: a squares column with an empty cell',
    src: 'Row,Sq\na,1\nb,4\nc,9\nd,\ne,25\nf,36\ng,49\nh,64\ni,81\nj,100',
    test: (N) => {
      const nt = N.tables[0], s = nt && nt.seqs[0];
      const ok = s && s.desc.startsWith('n²') && X.nextOf(s) === '121' && s.filled.length === 1 && s.filled[0].row === 3 && s.fmt(s.filled[0].v) === '16' && NUMS.render(nt).includes('row 4 = 16');
      return ok ? null : JSON.stringify(N.tables.map(t => t && t.seqs.map(q => [q.desc, q.filled.length])));
    }
  },
  {
    name: 'bug 18: a table sequence is corrected across columns',
    src: 'A,B,C,D,E,F\n4,19,56,17,66,98\n7,10,54,41,46,51\n10,80,85,85,47,17\n13,88,54,32,56,40\n16,22,88,32,14,87\n19,72,83,27,87,62\n22,87,97,78,98,50\n25,71,66,59,26,88\n28,23,74,85,93,97\n31,48,13,99,66,98\n34,66,34,72,58,74\n37,36,80,39,37,29',
    test: (N) => {
      const nt = N.tables[0], s = nt && nt.seqs[0];
      const ok = s && s.cols === 6 && s.mUsed === s.tested * 6 && Math.abs(s.adj - UTIL.adjust(s.log10p, s.tested * 6)) < 1e-9 && s.adj > UTIL.adjust(s.log10p, s.tested) && NUMS.render(nt).includes(s.tested + ' per column × 6 columns');
      return ok ? null : JSON.stringify(nt && nt.seqs.map(q => [q.desc, q.cols, q.tested, q.adj]));
    }
  },
  {
    name: 'bug 19: a tax column left of revenue is found',
    src: 'Region,Tax,Revenue\nA,21.60,123.45\nB,17.27,98.70\nC,7.98,45.60\nD,40.27,230.10\nE,13.65,77.99\nF,26.99,154.20\nG,5.83,33.33\nH,33.06,188.90',
    test: (N) => {
      const nt = N.tables[0], e = nt && nt.eqs.find(q => q.text.startsWith('Tax = Revenue × 0.175'));
      return e && e.k === 8 && e.n === 8 && e.exc.length === 0 ? null : JSON.stringify(nt && nt.eqs.map(q => q.text));
    }
  },
  {
    name: 'bug 20: tested counts follow the data shape',
    src: '2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89',
    test: (N) => {
      const s = X.only(N), q = SEQ.analyze([1n, 4n, 9n, 16n, 25n, 36n, 49n, 64n, 81n, 100n, 121n, 144n], { d: 0, seed: ['t'], columns: false, date: false });
      const thirty = 1 + 1 + 4 * 3 + 3 * 5 + 10 + 13 * 6 + 1 + (1 + 1 + 9 + 13) + (1 + 1 + 3 + 3) ** 2 + 4 * 21, twelve = 1 + 1 + 4 * 3 + 3 * 1 + 4 + 13 * 6 + 1 + (1 + 1 + 3 + 13) + (1 + 1 + 3) ** 2 + 4 * 3;
      return s && s.tested === thirty && q && q.tested === twelve ? null : JSON.stringify({ thirty: s && s.tested, twelve: q && q.tested });
    }
  },
  {
    name: 'bug 21: a next value finer than the list precision',
    src: '512, 768, 1152, 1728, 2592, 3888, 5832, 8748, 13122, 19683',
    test: (N) => {
      const s = X.only(N);
      return s && s.finer === true && X.nextOf(s) === '29524.5' && NUMS.renderLine(N.lines[0]).includes('next 29524.5 (finer than the list\'s precision)') ? null : X.brief(N);
    }
  },
  {
    name: 'bug 21: a next value after a filled last gap',
    src: '1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, ?',
    test: (N) => {
      const s = X.only(N);
      return s && X.nextOf(s) === '169' && !s.finer && s.filled.length === 1 && s.filled[0].i === 11 && s.fmt(s.filled[0].v) === '144' ? null : X.brief(N);
    }
  },
  {
    name: 'bug 24: a client called Total is data',
    src: 'Client,Units,Price,Revenue\nAcme,10,5.00,50.00\nTotal Fitness Gym,8,12.50,100.00\nGlobex,3,7.25,21.75\nInitech,12,3.50,42.00\nUmbrella,5,9.99,49.95\nHooli,7,4.20,29.40',
    test: (N) => {
      const nt = N.tables[0], e = nt && nt.eqs.find(q => q.text === 'Revenue = Units × Price');
      return e && e.k === 6 && e.n === 6 && nt.V.totalRows.length === 0 ? null : JSON.stringify(nt && nt.eqs.map(q => [q.text, q.k, q.n]));
    }
  },
  {
    name: 'bug 25: one wrong balance is one exception',
    src: 'Day,Amount,Balance\n1,100.00,100.00\n2,-20.00,80.00\n3,45.50,125.50\n4,-10.00,115.50\n5,30.00,155.50\n6,-15.00,130.50\n7,60.00,190.50\n8,-25.00,165.50\n9,40.00,205.50\n10,-5.00,200.50',
    test: (N) => {
      const nt = N.tables[0], e = nt && nt.eqs.find(q => q.text.startsWith('Balance = '));
      return e && e.k === e.n - 1 && e.exc.length === 1 && e.exc[0].row === 4 && Object.keys(nt.bad).length === 1 && nt.eqs.length === 1 ? null : JSON.stringify(nt && nt.eqs.map(q => [q.text, q.k, q.n, q.exc.map(x => x.row)]));
    }
  },
  {
    name: 'bug 26: one mark per cell with every reason',
    src: 'A,B,C\n5,18,23\n9,17,26\n2,27,29\n14,18,32\n7,28,35\n11,27,38\n3,38,42\n8,36,44\n13,34,47\n6,44,50\n10,43,53\n4,52,56',
    test: (N, A) => {
      const nt = N.tables[0], why = nt && nt.bad['6,2'], html = TUI.cardHTML(A.tables[0], nt, 0), marks = html.match(/<td [^>]*class="bad"[^>]*>/g) || [];
      const ok = why && why.length === 2 && Object.keys(nt.bad).length === 1 && marks.length === 1 && marks[0].includes('expected 41 (C = A + B); expected 41 (C 3n + 20');
      return ok ? null : JSON.stringify({ bad: nt && nt.bad, marks });
    }
  },
  {
    name: 'bug 27: a wide table reports unsearched columns',
    src: 'c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14\n653,213,214,794,431,296,65,415,925,541,973,281,891,297\n797,379,49,55,868,929,150,550,629,447,762,494,843,189\n823,195,941,383,753,575,577,63,328,566,854,433,951,242\n209,112,63,29,573,636,285,202,433,837,710,873,679,901\n26,20,667,49,88,792,80,569,406,217,836,408,238,936\n948,634,247,631,468,933,989,783,733,326,189,776,727,356\n928,350,293,606,353,457,630,20,348,905,205,444,631,460\n646,930,551,447,149,570,455,726,384,770,827,322,129,842\n510,820,453,944,146,965,871,644,777,579,533,998,460,437\n322,843,719,800,482,471,872,812,961,224,181,497,901,387\n213,554,154,842,351,509,204,350,718,616,783,984,319,559\n741,76,572,331,122,928,510,32,325,166,433,897,393,837',
    test: (N) => {
      const nt = N.tables[0];
      return nt && JSON.stringify(nt.unsearched.cols) === '["c13","c14"]' && NUMS.render(nt).includes('Only the first 12 numeric columns were searched for relations; not searched: c13, c14') ? null : JSON.stringify(nt && nt.unsearched);
    }
  },
  {
    name: 'bug 28: results do not depend on earlier tables',
    src: 'Id,Qty,Price,Total\n1,8,4.70,37.60\n2,6,8.40,50.40\n3,4,3.10,12.40\n4,2,6.80,13.60\n5,9,1.50,13.50\n6,7,5.20,36.40\n7,5,8.90,44.50\n8,3,3.60,10.80\n\nOrder 1 sold 40 units at $1.53 for $61.20\nOrder 2 sold 77 units at $2.06 for $158.62\nOrder 3 sold 17 units at $2.59 for $44.03\nOrder 4 sold 54 units at $3.12 for $168.48\nOrder 5 sold 91 units at $3.65 for $332.15\nOrder 6 sold 31 units at $4.18 for $129.58\nOrder 7 sold 68 units at $4.71 for $320.28\nOrder 8 sold 8 units at $5.24 for $41.92\nOrder 9 sold 45 units at $5.77 for $259.65\nOrder 10 sold 82 units at $6.30 for $516.60\nOrder 11 sold 22 units at $6.83 for $150.26\nOrder 12 sold 59 units at $7.36 for $434.24\nOrder 13 sold 96 units at $7.89 for $757.44\nOrder 14 sold 36 units at $8.42 for $303.12\nOrder 15 sold 73 units at $8.95 for $653.35\nOrder 16 sold 13 units at $9.48 for $123.24\nOrder 17 sold 50 units at $1.01 for $50.50\nOrder 18 sold 87 units at $1.54 for $133.98\nOrder 19 sold 27 units at $2.07 for $55.89\nOrder 20 sold 64 units at $2.60 for $166.40\nOrder 21 sold 4 units at $3.13 for $12.52\nOrder 22 sold 41 units at $3.66 for $150.06\nOrder 23 sold 78 units at $4.19 for $326.82\nOrder 24 sold 18 units at $4.72 for $84.96\nOrder 25 sold 55 units at $5.25 for $288.75\nOrder 26 sold 92 units at $5.78 for $531.76\nOrder 27 sold 32 units at $6.31 for $201.92\nOrder 28 sold 69 units at $6.84 for $471.96\nOrder 29 sold 9 units at $7.37 for $66.33\nOrder 30 sold 46 units at $7.90 for $363.40\nOrder 31 sold 83 units at $8.43 for $699.69\nOrder 32 sold 23 units at $8.96 for $206.08\nOrder 33 sold 60 units at $9.49 for $569.40\nOrder 34 sold 97 units at $1.02 for $98.94\nOrder 35 sold 37 units at $1.55 for $57.35\nOrder 36 sold 74 units at $2.08 for $153.92\nOrder 37 sold 14 units at $2.61 for $36.54\nOrder 38 sold 51 units at $3.14 for $160.14\nOrder 39 sold 88 units at $3.67 for $322.96\nOrder 40 sold 28 units at $4.20 for $117.60\nOrder 41 sold 65 units at $4.73 for $307.45\nOrder 42 sold 5 units at $5.26 for $26.30\nOrder 43 sold 42 units at $5.79 for $243.18\nOrder 44 sold 79 units at $6.32 for $499.28\nOrder 45 sold 19 units at $6.85 for $130.15\nOrder 46 sold 56 units at $7.38 for $413.28\nOrder 47 sold 93 units at $7.91 for $735.63\nOrder 48 sold 33 units at $8.44 for $278.52\nOrder 49 sold 70 units at $8.97 for $627.90\nOrder 50 sold 10 units at $9.50 for $95.00\nOrder 51 sold 47 units at $1.03 for $48.41\nOrder 52 sold 84 units at $1.56 for $131.04\nOrder 53 sold 24 units at $2.09 for $50.16\nOrder 54 sold 61 units at $2.62 for $159.82\nOrder 55 sold 98 units at $3.15 for $308.70\nOrder 56 sold 38 units at $3.68 for $139.84\nOrder 57 sold 75 units at $4.21 for $315.75\nOrder 58 sold 15 units at $4.74 for $71.10\nOrder 59 sold 52 units at $5.27 for $274.04\nOrder 60 sold 89 units at $5.80 for $516.20\nOrder 61 sold 29 units at $6.33 for $183.57\nOrder 62 sold 66 units at $6.86 for $452.76\nOrder 63 sold 6 units at $7.39 for $44.34\nOrder 64 sold 43 units at $7.92 for $340.56\nOrder 65 sold 80 units at $8.45 for $676.00\nOrder 66 sold 20 units at $8.98 for $179.60\nOrder 67 sold 57 units at $9.51 for $542.07\nOrder 68 sold 94 units at $1.04 for $97.76\nOrder 69 sold 34 units at $1.57 for $53.38\nOrder 70 sold 71 units at $2.10 for $149.10',
    test: (N, A) => {
      const pick = (a, n) => { const t = n.tables[a.tables.findIndex(x => x.title === 'Repeating line pattern')]; return JSON.stringify([t.eqs.map(e => [e.text, e.k, e.n, e.adj]), t.seqs.map(s => [s.name, s.desc, s.adj])]); };
      const alone = TXT.analyze(A.kept.filter(l => l.startsWith('Order')).join('\n')), together = pick(A, N), solo = pick(alone, NUMS.analyze(alone));
      return A.tables.length === 2 && together === solo ? null : together + ' vs ' + solo;
    }
  },
  {
    name: 'bug 33: digit tests are corrected across columns',
    src: 'A\tB\tC\tD\tE\n236\t740\t850\t167\t313\n949\t695\t585\t133\t272\n895\t105\t107\t117\t604\n418\t74\t576\t50\t759\n556\t779\t582\t592\t34\n944\t492\t738\t177\t776\n638\t413\t535\t974\t18\n356\t797\t462\t377\t114\n682\t226\t405\t116\t32\n501\t44\t220\t73\t553\n28\t880\t25\t38\t547\n793\t292\t730\t757\t165\n73\t122\t487\t263\t613\n466\t687\t122\t423\t716\n491\t211\t64\t98\t974\n187\t420\t880\t266\t335\n898\t188\t382\t874\t526\n330\t927\t153\t626\t409\n89\t859\t660\t399\t612\n871\t690\t805\t565\t246\n556\t268\t733\t352\t966\n956\t363\t842\t643\t26\n890\t334\t214\t129\t848\n866\t409\t586\t81\t755\n853\t695\t859\t190\t912\n813\t375\t827\t496\t538\n704\t980\t357\t928\t865\n825\t826\t354\t796\t661\n235\t555\t397\t615\t993\n726\t800\t102\t218\t686\n170\t514\t994\t10\t274\n25\t110\t819\t525\t717\n579\t586\t556\t858\t257\n35\t50\t542\t579\t221\n756\t68\t15\t563\t903\n485\t686\t112\t601\t788\n248\t465\t605\t111\t617\n625\t881\t249\t440\t335\n608\t699\t679\t818\t614\n669\t667\t665\t621\t256\n763\t341\t569\t981\t662\n109\t135\t542\t496\t907\n116\t677\t187\t561\t922\n917\t315\t106\t544\t655\n353\t909\t908\t696\t635\n264\t697\t592\t260\t331\n328\t592\t295\t681\t980\n620\t991\t399\t987\t464\n70\t893\t497\t207\t993\n232\t795\t885\t336\t843\n241\t751\t783\t470\t769\n194\t154\t860\t608\t823\n11\t179\t677\t56\t455\n185\t718\t130\t220\t873\n636\t82\t817\t118\t80\n957\t646\t823\t280\t620\n523\t440\t485\t141\t668\n47\t772\t90\t595\t841\n195\t342\t395\t427\t490\n745\t787\t857\t35\t646',
    test: (N) => {
      const d = N.tables[0] && N.tables[0].digits;
      return d && d.length === 5 && d.every(s => s.includes('corrected for 5 columns') && s.includes('look even')) ? null : JSON.stringify(d);
    }
  },
  {
    name: 'bug 37: the 2 in log10 ambiguity window and the 1 in log10 simplest-rule window stay separate',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], Q2 = ['1', '2', '4', '8', '16', '31', '57', '99', '163', '256'];
      const near = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('quad', -3.5, Q2, { params: 2 })]).subjects[0];
      const mid = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('quad', -5.5, Q2, { params: 2 })]).subjects[0];
      const far = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('quad', -6.7, Q2, { params: 2 })]).subjects[0];
      const ok = near.ambiguous && near.primary.id === 'double' && mid.ambiguous && mid.primary.id === 'quad' && mid.rivals.map(r => r.id).join() === 'double' && !far.ambiguous && far.primary.id === 'quad' && far.others.map(r => r.id).join() === 'double';
      return ok ? null : JSON.stringify({ near: [near.ambiguous, near.primary.id], mid: [mid.ambiguous, mid.primary.id, mid.rivals.map(r => r.id)], far: [far.ambiguous, far.primary.id, far.others.map(r => r.id)] });
    }
  },
  {
    name: 'bug 38: the writing check loads and runs with the stubbed app globals',
    node: true,
    test: () => {
      const r = WRITING.analyze('We went to the market early. Then it rained, so we stayed in and read for hours. Nobody minded at all.');
      return r && typeof r === 'object' ? null : 'WRITING.analyze returned ' + typeof r;
    }
  },
  {
    name: 'bug 34: a constant list',
    src: '5, 5, 5, 5, 5, 5',
    test: (N) => {
      const rule = SEQ.fitAll([5n, 5n, 5n, 5n, 5n, 5n], { d: 0, date: false, columns: false }).find(r => r.family === 'cycle');
      return rule && rule.describe(0) === 'every value is 5' && X.seqsOf(N).length === 0 ? null : X.brief(N);
    }
  },
  {
    name: 'bug 22: a rule fitted on the data is judged against rules refitted on shuffles',
    src: '7, 1, 6, 7, 1, 6, 7, 1, 6, 7, 5, 6, 7, 1, 6, 7',
    test: (N) => {
      const q = SEQ.analyze([7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n, 7n, 1n, 6n], { d: 0, seed: ['t'], columns: false, date: false });
      return X.seqsOf(N).length === 0 && q && q.family === 'cycle' ? null : X.brief(N);
    }
  },
  {
    name: 'bug 11: day-first dates give Due = Invoice + 30 days',
    src: 'Item,Invoice,Due,Amount\nA,13/02/2026,15/03/2026,100\nB,20/02/2026,22/03/2026,137\nC,05/03/2026,04/04/2026,174\nD,14/03/2026,13/04/2026,211\nE,27/03/2026,26/04/2026,248\nF,02/04/2026,02/05/2026,285\nG,18/04/2026,18/05/2026,322\nH,30/04/2026,30/05/2026,359',
    test: (N, A) => {
      const t = N.tables[0], e = t && t.eqs.find(x => x.text === 'Due = Invoice + 30 days');
      return e && e.k === 8 && e.n === 8 && !A.tables[0].pattern.includes('day/month') ? null : JSON.stringify(t && t.eqs.map(x => x.text)) + ' | ' + A.tables[0].pattern;
    }
  },
  {
    name: 'bug 11: a day-first date entity is calendar-valid',
    src: 'Paid on 13/02/2026',
    test: (N, A) => {
      const e = A.entities.find(x => x.raw === '13/02/2026');
      return e && e.check === 'calendar-valid' && e.norm === '2026-02-13' ? null : JSON.stringify(A.entities);
    }
  },
  {
    name: 'bug 11: an ambiguous date column gets no date relation',
    src: 'Item,Invoice,Due,Amount\nA,01/02/2026,03/03/2026,100\nB,03/02/2026,05/03/2026,137\nC,05/03/2026,04/04/2026,174\nD,08/04/2026,08/05/2026,211\nE,02/05/2026,01/06/2026,248\nF,11/06/2026,11/07/2026,285\nG,12/07/2026,11/08/2026,322\nH,04/08/2026,03/09/2026,359',
    test: (N, A) => {
      const t = N.tables[0];
      return A.tables[0].pattern.includes('dates could be day/month or month/day') && t.V.dateEq.length === 0 && !t.eqs.some(e => e.unit === ' days') && NUMS.render(t).includes('Column Invoice: dates could be day/month or month/day, so it was left out of date relations.') ? null : A.tables[0].pattern + ' | ' + JSON.stringify(t.eqs.map(e => e.text));
    }
  },
  {
    name: 'bug 11: month names and mixed orders are resolved without Date',
    test: () => {
      const d = CELL.date('Feb 30, 2026'), c = CELL.column(['13/02/2026', '02/13/2026', '03/04/2026']), e = CELL.column(['01/02/2026', '03/04/2026']);
      const got = [CELL.isoDate('Feb 13, 2026'), CELL.isoDate('13 February 2026'), CELL.isoDate('Sept 5 2026'), CELL.isoDate('01/02/2026'), CELL.isoDate('13/02/2026'), d.status, c.dateOrder, e.dateOrder, CELL.dayOf(1970, 1, 1), CELL.dayOf(2026, 2, 13), CELL.dayOf(2026, 2, 29), CELL.iso(CELL.dayOf(2000, 2, 29))].join('|');
      return got === '2026-02-13|2026-02-13|2026-09-05|01/02/2026|2026-02-13|impossible|mixed|ambiguous|0|20497||2000-02-29' ? null : got;
    }
  },
  {
    name: 'bug 12: a decimal comma column parses and finds Total = Qty × Price',
    src: 'Item;Qty;Price;Total\nA;2;1.234,50;2.469,00\nB;3;12,25;36,75\nC;5;3,40;17,00\nD;4;1.050,00;4.200,00\nE;1;99,99;99,99\nF;6;2.500,75;15.004,50\nG;2;1.500;3.000,00\nH;7;4,80;33,60',
    test: (N, A) => {
      const t = N.tables[0], e = t && t.eqs.find(x => x.text === 'Total = Qty × Price');
      return A.tables[0].pattern.includes('decimal comma') && e && e.k === 8 && e.n === 8 && e.exc.length === 0 ? null : A.tables[0].pattern + ' | ' + JSON.stringify(t && t.eqs.map(x => [x.text, x.k, x.n]));
    }
  },
  {
    name: 'bug 12: locale is decided for the whole column',
    test: () => {
      const comma = CELL.column(['1,5', '2,5', '1,234']), dot = CELL.column(['1,500', '2,500', '12,000']), mixed = CELL.column(['1,234.50', '12.5', '3.25']), grouped = CELL.column(['1.234,50', '3,25']);
      const got = [comma.locale, comma.cells.map(c => c.v).join('/'), dot.locale, dot.cells.map(c => c.v).join('/'), mixed.locale, mixed.cells.map(c => c.v).join('/'), grouped.cells.map(c => c.v).join('/'), TXT.parseNum('1,5'), TXT.parseNum('1.234,50'), TXT.parseNum('1,234.5'), CELL.parseOne('1 234,50').v, CELL.parseOne("1'234.50").v, CELL.parseOne('1.500', 'comma').v].join('|');
      return got === 'comma|1.5/2.5/1.234|dot|1500/2500/12000|dot|1234.5/12.5/3.25|1234.5/3.25|1.5|1234.5|1234.5|1234.5|1234.5|1500' ? null : got;
    }
  },
  {
    name: 'bug 14: a unit column is numeric',
    src: 'Item,Weight,Rate,Cost\nA,3 kg,3.00,9.00\nB,2 kg,3.55,7.10\nC,5 kg,4.10,20.50\nD,4 kg,4.65,18.60\nE,6 kg,5.20,31.20\nF,1 kg,5.75,5.75\nG,7 kg,6.30,44.10\nH,8 kg,6.85,54.80',
    test: (N, A) => {
      const t = N.tables[0], w = t && t.V.cols.find(c => c.name === 'Weight'), e = t && t.eqs.find(x => x.text === 'Cost = Weight × Rate');
      return w && w.unit === 'kg' && w.dim === 'mass' && e && e.k === 8 && t.cols.some(s => s.startsWith('Weight (kg):')) ? null : JSON.stringify(t && t.eqs.map(x => x.text)) + ' | ' + JSON.stringify(t && t.V.cols.map(c => [c.name, c.unit]));
    }
  },
  {
    name: 'bug 14: mixed units in one column are reported and not compared',
    src: 'Item,Weight,Rate,Cost\nA,3 kg,3.00,9.00\nB,2 m,3.55,7.10\nC,5 kg,4.10,20.50\nD,4 kg,4.65,18.60\nE,6 m,5.20,31.20\nF,1 kg,5.75,5.75\nG,7 kg,6.30,44.10\nH,8 m,6.85,54.80',
    test: (N) => {
      const t = N.tables[0], miss = !t || t.V.cols.some(c => c.name === 'Weight') || !t.V.notes.some(s => s.startsWith('Column Weight mixes units (kg, m)'));
      const g = CELL.column(['3 kg', '200 g', '5 kg']), l = CELL.column(['3 kg', '2 lb']);
      return !miss && g.unit === 'g' && g.cells.map(c => c.v).join('/') === '3000/200/5000' && l.mixedUnits && l.mixedUnits.join() === 'kg,lb' ? null : JSON.stringify(t && t.V.notes) + ' | ' + JSON.stringify([g.unit, l.mixedUnits]);
    }
  },
  {
    name: 'bug 14: decimals up to nine places are kept',
    src: 'Item,Rate,Qty\nA,0.123456789,2\nB,0.234567891,3\nC,0.345678912,5\nD,0.456789123,4\nE,0.567891234,6\nF,0.678912345,1',
    test: (N) => {
      const t = N.tables[0], c = t && t.V.cols.find(x => x.name === 'Rate');
      return c && c.d === 9 && c.sd === 9 && Math.abs(c.h - 5e-10) < 1e-15 ? null : JSON.stringify(c && [c.d, c.sd, c.h]);
    }
  },
  {
    name: 'CELL: single-cell forms',
    test: () => {
      const f = s => { const c = CELL.parseOne(s); return c ? CELL.str(c) + (c.cur ? ' ' + c.cur : '') + (c.pct ? '%' : '') + (c.unit ? ' ' + c.unit : '') : null; };
      const got = ['($1,234.50)', '100-', '−5.5', '$1.5k', '€2m', '12.5 %', '3 kg', '120 ms', '5 EUR', '1 234,50', 'abc', '1e5', '--5', '1.2.3', '2026-02-13', '.5'].map(f).join('|');
      return got === '-1234.50 USD|-100|-5.5|1500 USD|2000000 EUR|12.5%|3 kg|120 ms|5 EUR|1234.50||||||0.5' ? null : got;
    }
  },
  {
    name: 'bug 6: quoted CSV keeps commas inside fields',
    src: 'Name,Qty,Amount\n"Smith, J",3,"1,234.50"\n"Lee, K",5,"2,000.00"\n"Diaz, M",2,"310.25"',
    test: (N, A) => {
      const t = A.tables[0];
      return A.tables.length === 1 && t.head.join('|') === 'Name|Qty|Amount' && t.rows.map(r => r.join('|')).join(';') === 'Smith, J|3|1,234.50;Lee, K|5|2,000.00;Diaz, M|2|310.25' && t.misfits.length === 0 ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 6: prose with commas is not a table',
    src: 'First, we went to the market, then we bought apples, and then we walked home.\nLater, after dinner, we watched a movie, and everyone fell asleep.\nIn the morning, with coffee in hand, we planned the day, and left early.',
    test: (N, A) => A.tables.length === 0 && A.prose.length === 3 ? null : JSON.stringify(A.tables.map(t => t.title)) + ' ' + A.prose.length
  },
  {
    name: 'bug 6: rows with the wrong cell count are listed as not fitting',
    src: 'Item,Qty,Price\nA,2,3.50\nB,3,4.00\nC,4,5.00\nD,1,6.00\nE,2,7.00\nF,5\nG,1,2,3,4,5',
    test: (N, A) => {
      const t = A.tables[0], m = t && t.misfits;
      const html = t ? TUI.cardHTML(t, N.tables[0], 0) : '';
      return t && t.rows.length === 6 && t.rows[5].join('|') === 'F|5|' && m.length === 1 && m[0].line === 8 && m[0].reason === '6 cells, expected 3' && html.includes('Rows that don\'t fit the table (1)') ? null : JSON.stringify(t && [t.rows, t.misfits]);
    }
  },
  {
    name: 'bug 6: thousands split by an unquoted comma are rejoined',
    src: 'Item,Qty,Amount\nA,2,1,234.50\nB,3,200.00\nC,1,15.25\nD,4,310.10',
    test: (N, A) => {
      const t = A.tables[0];
      return t && t.rows.length === 4 && t.rows[0].join('|') === 'A|2|1,234.50' && t.misfits.length === 0 ? null : JSON.stringify(t && [t.rows, t.misfits]);
    }
  },
  {
    name: 'bug 6: prose lines are never aligned columns',
    src: 'The market opened early on Monday morning\nWe bought apples and pears for the week\nEveryone walked home together after lunch\nThe evening was quiet and the lights stayed on',
    test: (N, A) => A.tables.length === 0 && A.prose.length === 4 ? null : JSON.stringify(A.tables.map(t => t.title))
  },
  {
    name: 'bug 6: aligned columns are cut at shared gaps',
    src: 'Name      Qty  Price\nApples     12   1.50\nBananas     7   0.75\nCherries   30   4.20\nDates       5   9.99',
    test: (N, A) => {
      const t = A.tables[0];
      return A.tables.length === 1 && t.title === 'Aligned columns' && t.pattern === 'aligned columns · 3 columns' && t.head.join('|') === 'Name|Qty|Price' && t.rows.map(r => r.join('|')).join(';') === 'Apples|12|1.50;Bananas|7|0.75;Cherries|30|4.20;Dates|5|9.99' ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 6: a markdown table uses its divider row',
    src: '| Item | Qty | Price |\n|---|---:|---|\n| A | 2 | 3.50 |\n| B | 3 | 4.00 |',
    test: (N, A) => {
      const t = A.tables[0];
      return A.tables.length === 1 && t.title === 'Markdown table' && t.head.join('|') === 'Item|Qty|Price' && t.rows.length === 2 && t.rows[1].join('|') === 'B|3|4.00' && A.removed.some(r => r[1] === 'divider') ? null : JSON.stringify(A.tables);
    }
  },
  {
    name: 'bug 7: year headers are headers',
    src: 'Region,2023,2024\nNorth,120,135\nSouth,80,95\nEast,60,72\nWest,45,50',
    test: (N, A) => {
      const t = A.tables[0];
      return t && t.head.join('|') === 'Region|2023|2024' && t.rows.length === 4 && t.types.join('|') === 'Text|Number|Number' ? null : JSON.stringify(t);
    }
  },
  {
    name: 'bug 7: a first row of the same kind as the rest is data',
    src: 'North,120,135\nSouth,80,95\nEast,60,72\nWest,45,50',
    test: (N, A) => {
      const t = A.tables[0];
      return t && t.head.join('|') === 'Column 1|Column 2|Column 3' && t.rows.length === 4 && t.rows[0].join('|') === 'North|120|135' ? null : JSON.stringify(t);
    }
  },
  {
    name: 'bug 8: two log sections give two tables',
    src: 'SERVER A\n10.0.0.1 ok 120 ms\n10.0.0.2 ok 130 ms\n10.0.0.3 ok 125 ms\n\nSERVER B\n10.0.1.1 ok 220 ms\n10.0.1.2 ok 230 ms\n10.0.1.3 ok 225 ms',
    test: (N, A) => {
      const t = A.tables;
      const owned = A.tables.flatMap(x => x.owned);
      return t.length === 2 && t[0].title === 'SERVER A' && t[1].title === 'SERVER B' && t[0].rows.length === 3 && t[1].rows.length === 3 && t[0].pattern.startsWith('{IP} ok {Quantity}') && new Set(owned).size === owned.length ? null : JSON.stringify(t.map(x => [x.title, x.rows.length, x.pattern]));
    }
  },
  {
    name: 'bug 8: runs in one block merge only when their templates are equal',
    src: 'SERVER LOG\n10.0.0.1 ok 120 ms\n10.0.0.2 ok 130 ms\nnote one without values\nanother note line\n10.0.0.3 ok 125 ms\n10.0.0.4 ok 135 ms',
    test: (N, A) => {
      const t = A.tables;
      return t.length === 1 && t[0].rows.length === 4 && t[0].lineOf.join() === '1,2,5,6' && A.prose.length === 2 ? null : JSON.stringify(t.map(x => [x.title, x.lineOf, x.pattern])) + ' ' + A.prose.length;
    }
  },
  {
    name: 'bug 8: runs with different fixed words stay separate tables',
    src: 'SERVER LOG\n10.0.0.1 ok 120 ms\n10.0.0.2 ok 130 ms\nnote one without values\nanother note line\n10.0.0.3 failed 125 ms\n10.0.0.4 failed 135 ms',
    test: (N, A) => {
      const t = A.tables;
      return t.length === 2 && t[0].pattern.startsWith('{IP} ok {Quantity}') && t[1].pattern.startsWith('{IP} failed {Quantity}') ? null : JSON.stringify(t.map(x => [x.title, x.lineOf, x.pattern]));
    }
  },
  {
    name: 'line ownership: a key:value reading and a template reading give one table',
    src: 'Load: 20 kg\nLoad: 22 kg\nLoad: 25 kg\nLoad: 28 kg',
    test: (N, A) => {
      const t = A.tables[0], owned = A.tables.flatMap(x => x.owned), sample = TXT.analyze(TUI.SAMPLE), so = sample.tables.flatMap(x => x.owned);
      const html = t ? TUI.cardHTML(t, N.tables[0], 0) : '';
      return A.tables.length === 1 && t.title === 'Key–value pairs' && t.alsoReadableAs === 'a repeating line pattern: Load {Quantity}' && new Set(owned).size === owned.length && new Set(so).size === so.length && sample.tables.some(x => x.title === 'REGIONAL SALES') && html.includes('Also readable as a repeating line pattern') ? null : JSON.stringify(A.tables.map(x => [x.title, x.alsoReadableAs])) + ' ' + so.length;
    }
  },
  {
    name: 'bug 15: subtotals and a grand total',
    src: 'Item,Qty,Amount\nApples,3,10.00\nPears,2,8.50\nPlums,5,12.25\nSubtotal,10,30.75\nBeans,4,6.00\nPeas,6,9.00\nSubtotal,10,15.50\nTotal,20,46.25',
    test: (N) => {
      const nt = N.tables[0], t = nt && nt.totals.join(' | ');
      const subs = nt && nt.totalRes.filter(r => r.family === 'subtotal'), grand = nt && nt.totalRes.find(r => r.family === 'total');
      return nt && subs.length === 2 && subs[0].hits === 2 && subs[0].excN === 0 && subs[1].hits === 1 && subs[1].excN === 1 && subs[1].exceptions[0].row === 6 && subs[1].exceptions[0].col === 2 && grand && grand.hits === 2 && /the sum of the subtotals in Qty, Amount/.test(grand.headline) && /rows 1–3/.test(t) && /rows 5–6 add up to 15\.00, the row says 15\.50/.test(t) && Object.keys(nt.bad).join() === '6,2' ? null : JSON.stringify([nt && nt.totals, nt && nt.bad]);
    }
  },
  {
    name: 'bug 15: a total row at the top is checked against the rows below it',
    src: 'Item,Qty,Amount\nTotal,12,30.00\nApples,3,10.00\nPears,4,8.50\nPlums,5,11.50',
    test: (N) => {
      const nt = N.tables[0], r = nt && nt.totalRes[0];
      return r && r.family === 'total' && r.hits === 2 && /the rows below/.test(r.headline) && r.excN === 0 ? null : JSON.stringify(nt && nt.totals);
    }
  },
  {
    name: 'bug 15: average, count, min and max rows are recognised',
    src: 'Item,Qty,Price\nA,2,3.50\nB,5,1.20\nC,3,4.00\nD,7,2.25\nE,1,9.99\nAverage,3.6,4.188\nCount,5,5\nMin,1,1.20\nMax,7,9.99',
    test: (N) => {
      const nt = N.tables[0], f = k => nt && nt.totalRes.find(r => r.family === k);
      return nt && nt.V.totalRows.length === 4 && f('avg') && f('avg').hits === 2 && f('count') && f('count').hits === 2 && f('min') && f('min').hits === 2 && f('max') && f('max').hits === 2 && nt.V.dataRows.length === 5 ? null : JSON.stringify([nt && nt.totals, nt && nt.V.totalRows]);
    }
  },
  {
    name: 'bug 16: a declared total is compared with money columns first',
    nofix: true,
    src: 'ORDER SUMMARY\n=================\nItem  Qty  Price\nOrganic apples - 3 kg - $4.50\nWhole milk - 2 L - $3.20\nRice bag - 5 kg - $12.00\nOlive oil - 750 ml - €9.90\n-----------------\nOrder ID: INV-2026-0042\nDate: Oct 3, 2026\nContact: support@freshmart.example\nDelivery: 45 min\nTotal = $29.60\nSent from my iPhone\nOrganic apples - 3 kg - $4.50\n\nName: Alice Chen\nAge: 34\nCity: Berlin\n\nName: Omar Haddad\nAge: 29\nCity: Cairo\n\nServer 10.0.0.12 responded in 120 ms at 14:02\nServer 10.0.0.19 responded in 340 ms at 14:05\nServer 10.0.0.23 responded in 135 ms at 14:09\nServer 10.0.0.31 responded in 4100 ms at 14:12\nPay to IBAN GB82 WEST 1234 5698 7654 32 by 2026-02-30\nCard on file 4111 1111 1111 1111\nTracking 3f2c9a1e-7b4d-4c8a-9e21-5a6b7c8d9e0f\n<p>Unsubscribe</p>\n\nREGIONAL SALES\nRegion\tUnits\tPrice\tRevenue\tTax\tTotal\nNorth\t120\t4.50\t540.00\t108.00\t648.00\nSouth\t85\t6.20\t527.00\t105.40\t632.40\nEast\t240\t2.75\t660.00\t132.00\t792.00\nWest\t60\t12.00\t720.00\t144.00\t864.00\nCentral\t150\t3.80\t570.00\t114.00\t684.00\nCoast\t95\t7.40\t703.00\t140.60\t843.60\nValley\t310\t1.90\t589.00\t117.80\t716.80\nHills\t45\t15.50\t697.50\t139.50\t837.00\nTotal\t1105\t\t5006.50\t1001.30\t6007.80',
    test: (N, A) => {
      const lines = N.tables.flatMap(t => t ? t.totals : []).filter(s => s.startsWith('Total (line')), all = lines.join(' | ');
      return lines.length === 1 && /equals the sum of Price \(4 rows\)/.test(all) && /mixes/.test(all) && !/Qty/.test(all) ? null : all;
    }
  },
  {
    name: 'bug 17: key-value summaries group by unit',
    src: 'Weight A: 3 kg\nWeight B: 5 kg\nWeight C: 2 kg\nWait A: 45 min\nWait B: 30 min\nWait C: 20 min\nSpeed A: 120 km/h\nSpeed B: 200 km/h',
    test: (N) => {
      const nt = N.tables[0];
      return nt && nt.kvOnly && nt.cols.length === 2 && nt.cols[0].startsWith('Value (kg): min 2 · median 3 · max 5') && nt.cols[1].startsWith('Value (s):') ? null : JSON.stringify(nt && nt.cols);
    }
  },
  {
    name: 'affine: F = C × 1.8 + 32',
    src: 'C,F\n0,32\n10,50\n20,68\n25,77\n30,86\n37,98.6\n40,104\n100,212',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'F = C × 1.8 + 32');
      return e && e.k === 8 && e.n === 8 && e.params === 2 && e.exact === 8 && e.adj <= -3 ? null : brief(N);
    }
  },
  {
    name: 'fee: Fee = Amount × 0.029 + 0.3',
    src: 'Amount,Fee\n10.00,0.59\n20.00,0.88\n40.00,1.46\n55.50,1.91\n100.00,3.20\n12.34,0.66\n80.00,2.62\n33.33,1.27\n70.00,2.33\n60.00,2.04',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Fee = Amount × 0.029 + 0.3');
      return e && e.k === 10 && e.n === 10 && e.rounded > 0 && e.exact + e.rounded === 10 ? null : brief(N);
    }
  },
  {
    name: 'percent change: Change % = (New − Old) ÷ Old × 100',
    src: 'Old,New,Change %\n100,120,20\n80,60,-25\n50,55,10\n200,150,-25\n40,50,25\n120,132,10\n75,90,20\n64,80,25',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Change % = (New − Old) ÷ Old × 100');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'large values: a 20-digit relation is found, not skipped',
    src: 'A,B,C\n350107873470295894447,794611655041862176020,1144719528512158070467\n393087740011240188793,773667417657710096159,1166755157668950284952\n477759529869046757496,928558538878652753041,1406318068747699510537\n715928899649409114041,750931814154010729053,1466860713803419843094\n570918677036385716551,734396412373731075454,1305315089410116792005\n294583836137356843213,238506722860845677181,533090558998202520394\n844563044521802591910,232744553971287908299,1077307598493090500209\n942221488283091084965,812706697766829943494,1754928186049921028459',
    test: (N, A) => {
      const nt = N.tables[0], e = nt.eqs.find(q => q.text === 'C = A + B');
      return e && e.k === 8 && e.exact === 8 && nt.skipped === undefined && !/too large/.test(TUI.cardHTML(A.tables[0], nt, 0)) ? null : brief(N);
    }
  },
  {
    name: 'exact: half a unit of the last digit is a hit, and rounded hits are counted',
    src: 'Amount,Tax\n1.10,0.06\n3.30,0.17\n5.50,0.28\n7.70,0.39\n9.90,0.50\n2.00,0.10\n4.00,0.20\n6.00,0.30',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Tax = Amount × 0.05 (5%)');
      return e && e.k === 8 && e.n === 8 && e.exact === 3 && e.rounded === 5 ? null : brief(N);
    }
  },
  {
    name: 'cross-row: Opening = previous Closing',
    src: 'Day,Opening,Closing\n1,90,140\n2,140,95\n3,95,180\n4,180,160\n5,160,175\n6,175,120\n7,120,150\n8,150,90\n9,90,130\n10,130,110',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Opening = previous Closing');
      return e && e.k === 9 && e.n === 9 ? null : brief(N);
    }
  },
  {
    name: 'cumulative: a running sum from the first row',
    src: 'Day,Sales,Cumulative\n1,12,12\n2,7,19\n3,20,39\n4,15,54\n5,9,63\n6,11,74\n7,18,92\n8,6,98',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Cumulative = running sum of Sales');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'cross-row: a change column is the difference from the previous row',
    src: 'Reading,Change\n100,\n105,5\n103,-2\n110,7\n120,10\n118,-2\n130,12\n125,-5',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Change = Reading − previous Reading');
      return e && e.k === 7 && e.n === 7 ? null : brief(N);
    }
  },
  {
    name: 'percent up: New = Old × (1 + Growth %)',
    src: 'Old,Growth %,New\n100,10,110.00\n200,5,210.00\n150,20,180.00\n80,12.5,90.00\n90,8,97.20\n60,15,69.00\n120,2.5,123.00\n300,4,312.00',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'New = Old × (1 + Growth %)');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'dates: Due = Invoice + 1 month, clamped to the end of a shorter month',
    src: 'Invoice,Due\n2026-01-31,2026-02-28\n2026-02-15,2026-03-15\n2026-03-31,2026-04-30\n2026-04-30,2026-05-30\n2026-05-31,2026-06-30\n2026-06-15,2026-07-15\n2026-07-31,2026-08-31\n2026-08-20,2026-09-20',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Due = Invoice + 1 month');
      return e && e.k === 8 && e.n === 8 && e.params === 1 ? null : brief(N);
    }
  },
  {
    name: 'dates: End = Start + 2 weeks',
    src: 'Start,End\n2026-03-02,2026-03-16\n2026-03-05,2026-03-19\n2026-03-11,2026-03-25\n2026-03-12,2026-03-26\n2026-03-19,2026-04-02\n2026-03-24,2026-04-07\n2026-04-01,2026-04-15\n2026-04-12,2026-04-26',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'End = Start + 2 weeks');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'three columns: Total = Qty × Price + Shipping',
    src: 'Qty,Price,Shipping,Total\n2,3.50,2.00,9.00\n5,1.20,3.50,9.50\n3,4.00,1.50,13.50\n7,2.25,2.00,17.75\n1,9.99,5.00,14.99\n4,0.75,1.00,4.00\n6,5.10,2.50,33.10\n8,1.15,3.00,12.20',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Total = Qty × Price + Shipping');
      return e && e.k === 8 && e.n === 8 && e.exact === 8 ? null : brief(N);
    }
  },
  {
    name: 'two-column linear: Grade = 0.3 × Test1 + 0.7 × Test2',
    src: 'Test1,Test2,Grade\n70,80,77.0\n85,65,71.0\n60,90,81.0\n90,70,76.0\n75,85,82.0\n55,75,69.0\n95,60,70.5\n80,88,85.6',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Grade = 0.3 × Test1 + 0.7 × Test2');
      return e && e.k === 8 && e.params === 2 ? null : brief(N);
    }
  },
  {
    name: 'max: Peak = max(A, B)',
    src: 'A,B,Peak\n12,20,20\n30,15,30\n7,33,33\n25,10,25\n18,28,28\n9,17,17\n40,35,40\n22,5,22',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Peak = max(A, B)');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'division: Speed = Distance ÷ Time',
    src: 'Distance,Time,Speed\n120,2.5,48.00\n90,1.5,60.00\n45,3,15.00\n200,4,50.00\n60,0.8,75.00\n155,3.1,50.00\n80,2.4,33.33\n310,5,62.00',
    test: (N) => {
      const e = N.tables[0].eqs.find(q => q.text === 'Speed = Distance ÷ Time');
      return e && e.k === 8 && e.n === 8 ? null : brief(N);
    }
  },
  {
    name: 'segments: the rate changes halfway',
    src: 'Row,Revenue,Tax\n1,120.00,24.00\n2,340.00,68.00\n3,280.00,56.00\n4,156.00,31.20\n5,400.00,80.00\n6,224.00,44.80\n7,188.00,37.60\n8,312.00,62.40\n9,260.00,65.00\n10,140.00,35.00\n11,380.00,95.00\n12,212.00,53.00\n13,336.00,84.00\n14,172.00,43.00\n15,296.00,74.00\n16,244.00,61.00',
    test: (N) => {
      const eqs = N.tables[0].eqs, e = eqs.find(q => q.text === 'Tax = Revenue × 0.2 in rows 1–8, × 0.25 from row 9');
      return e && e.k === 16 && e.n === 16 && e.params === 3 && e.scope.kind === 'segment' && eqs.every(q => q.target !== e.target || q === e) ? null : brief(N);
    }
  },
  {
    name: 'segment not worth it: one odd row',
    src: 'Row,Revenue,Tax\n1,120.00,24.00\n2,340.00,68.00\n3,280.00,56.00\n4,156.00,31.20\n5,400.00,80.00\n6,224.00,44.80\n7,188.00,37.60\n8,312.00,62.40\n9,260.00,52.00\n10,140.00,35.00\n11,380.00,76.00\n12,212.00,42.40\n13,336.00,67.20\n14,172.00,34.40\n15,296.00,59.20\n16,244.00,48.80',
    test: (N) => {
      const eqs = N.tables[0].eqs, e = eqs.find(q => q.text === 'Tax = Revenue × 0.2 (20%)');
      return e && e.k === 15 && e.n === 16 && e.excN === 1 && e.exc[0].row === 9 && eqs.every(q => q.scope.kind === 'all') ? null : brief(N);
    }
  },
  {
    name: 'per group: rate by Country',
    src: 'Country,Revenue,Tax\nUK,200.00,40.00\nDE,315.00,59.85\nFR,125.00,25.00\nUK,450.00,90.00\nDE,280.00,53.20\nFR,360.00,72.00\nUK,175.00,35.00\nDE,520.00,98.80\nFR,240.00,48.00\nUK,330.00,66.00\nDE,195.00,37.05\nFR,410.00,82.00\nUK,265.00,53.00\nDE,380.00,72.20',
    test: (N) => {
      const eqs = N.tables[0].eqs, e = eqs.find(q => q.text === 'Tax = Revenue × rate by Country (UK 0.2, DE 0.19, FR 0.2)');
      return e && e.k === 14 && e.n === 14 && e.params === 3 && e.scope.kind === 'group' && e.scope.label === 'Country' ? null : brief(N);
    }
  },
  {
    name: 'independent: two separate chains',
    src: 'A,B,C,D,E,F\n40,35,75,15,2,30\n56,43,99,12,12,144\n32,44,76,19,11,209\n43,50,93,13,22,286\n57,58,115,6,20,120\n42,9,51,7,11,77\n27,49,76,10,15,150\n26,5,31,20,18,360',
    test: (N) => {
      const eqs = N.tables[0].eqs.map(q => q.text).sort().join(' | ');
      return eqs === 'C = A + B | F = D × E' ? null : brief(N);
    }
  },
  {
    name: 'sequence: ratio grows by a step',
    src: '1, 3, 15, 105, 945, 10395, 135135, 2027025',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'rgrow' && s.params === 2 && s.desc.includes('grows by 2') && s.desc.includes('× 3, × 5, × 7') && X.nextOf(s) === '34459425' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: interleaved halves',
    src: '1, 100, 2, 90, 3, 80, 4, 70, 5, 60, 6, 50',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'inter' && s.combined === 'interleaved' && s.parts.length === 2 && s.parts[0].desc === 'odd positions step by 1' && s.parts[1].desc === 'even positions step by -10' && X.nextOf(s) === '7' && !s.ambiguous ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: differences are primes',
    src: '1, 3, 6, 11, 18, 29, 42, 59, 78, 101, 130',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'diff' && s.desc === 'the differences are Prime numbers (OEIS A000040)' && X.nextOf(s) === '161' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: alternating signs',
    src: '1, -2, 3, -4, 5, -6, 7, -8, 9, -10',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'alt' && s.desc === 'the signs alternate and the absolute values step by 1' && X.nextOf(s) === '11' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: alternating signs on primes',
    src: '2, -3, 5, -7, 11, -13, 17, -19, 23',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'alt' && s.desc.includes('Prime numbers (OEIS A000040)') && X.nextOf(s) === '-29' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: one change point',
    src: '2, 4, 6, 8, 10, 20, 40, 80, 160, 320',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'seg' && s.combined === 'segments' && s.params === 3 && s.parts.length === 2 && s.parts[0].desc === 'positions 1–5 step by 2' && s.parts[1].desc === 'positions 6 onwards are multiplied by 2 each time' && X.nextOf(s) === '640' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: a split does not replace one rule with one exception',
    src: '10, 20, 30, 40, 50, 60, 71, 80, 90, 100, 110, 120',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'step' && !s.combined && s.excN === 1 && s.exc[0].row === 6 && s.next === null ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: interleaved next value comes only from a clean part',
    src: '1, 100, 2, 90, 3, 80, 4, 71, 5, 60, 6, 50',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'inter' && s.excN === 1 && s.exc[0].row === 7 && X.nextOf(s) === '7' && s.predictions.length === 17 && s.predictions[12] === '7' && s.predictions[13] === null && s.predictions[14] === '8' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: a cycle written as period 2 and period 4 keeps the simpler rule',
    src: '5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9',
    test: (N) => {
      const s = X.only(N), sub = N.lines[0].arranged.subjects[0];
      return s && s.family === 'cycle' && s.params === 2 && s.desc === 'the same 2 numbers repeat: 5, 9' && X.nextOf(s) === '5' && !s.ambiguous && sub.equivalents.some(r => r.family === 'cycle' && r.params === 4) && sub.words[0] === 'Exact' ? null : X.brief(N);
    }
  },
  {
    name: 'sequence: every result carries predictions and an explanation',
    nofix: true,
    test: () => {
      const q = SEQ.analyze([3n, 7n, 11n, 15n, 19n, 23n, 27n, 31n, 35n, 39n, 43n, 47n], { d: 0, seed: ['t'], columns: false, date: false });
      const e = q.explain();
      const ok = q.all.length >= 1 && q.all.every(r => r.predictions.length === 17 && typeof r.explain === 'function')
        && q.predictions[0] === null && q.predictions[1] === '7' && q.predictions.slice(11).join(',') === '47,51,55,59,63,67'
        && e.worked[0] === '7 = 3 + 4' && e.walk.startsWith('forward') && e.exception === null && e.chance.hits === 11 && e.chance.tested === q.tested;
      return ok ? null : JSON.stringify({ p: q.predictions, e });
    }
  },
  {
    name: 'sequence: a polynomial explains itself with a difference table',
    nofix: true,
    test: () => {
      const q = SEQ.analyze([1n, 4n, 9n, 16n, 25n, 36n, 49n, 64n, 81n, 100n, 121n, 144n], { d: 0, seed: ['t'], columns: false, date: false });
      const e = q.explain();
      return q.family === 'poly' && e.table.join(' | ') === '1, 4, 9, 16, 25, 36, 49, 64 | 3, 5, 7, 9, 11, 13, 15 | 2, 2, 2, 2, 2, 2' ? null : JSON.stringify(e.table);
    }
  },
  {
    name: 'sequence: library entries carry the OEIS number',
    nofix: true,
    test: () => {
      const data = { A000040: '2,3,5,7,11,13,17,19,23,29,31,37', A002808: '4,6,8,9,10,12,14,15,16,18,20,21', A000142: '1,1,2,6,24,120,720,5040,40320,362880,3628800,39916800', A006882: '1,1,2,3,8,15,48,105,384,945,3840,10395', A000108: '1,1,2,5,14,42,132,429,1430,4862,16796,58786', A000984: '1,2,6,20,70,252,924,3432,12870,48620,184756,705432', A000110: '1,1,2,5,15,52,203,877,4140,21147,115975,678570', A000041: '1,1,2,3,5,7,11,15,22,30,42,56', A000166: '1,0,1,2,9,44,265,1854,14833,133496,1334961,14684570', A000010: '1,1,2,2,4,2,6,4,6,4,10,4', A000005: '1,2,2,3,2,4,2,4,3,4,2,6', A000312: '1,1,4,27,256,3125,46656,823543,16777216,387420489,10000000000,285311670611', A001006: '1,1,2,4,9,21,51,127,323,835,2188,5798' };
      const bad = Object.keys(data).filter(id => !SEQ.fitAll(data[id].split(',').map(BigInt), { d: 0, date: false, columns: false }).some(r => r.family === 'library' && r.describe(0).includes('(OEIS ' + id + ')') && !r.describe(0).includes('starting')));
      return bad.length === 0 ? null : bad.join(', ');
    }
  },
  {
    name: 'sequence: periodic differences with a drift are a nested rule',
    src: '1, 2, 3, 2, 3, 4, 3, 4, 5, 4, 5, 6, 5, 6, 7, 6, 7, 8, 7',
    test: (N) => {
      const s = X.only(N);
      return s && s.family === 'diff' && s.desc === 'the differences repeat 1, 1, -1' && X.nextOf(s) === '8' ? null : X.brief(N);
    }
  },
  {
    name: 'text: City → Country holds in 19 of 20 rows',
    src: 'Name,City,Country\nP112x0,Madrid,Spain\nP580x1,Rome,Italy\nP215x2,Paris,France\nP882x3,Berlin,Germany\nP502x4,Madrid,Spain\nP244x5,Rome,Italy\nP800x6,Paris,Germany\nP144x7,Berlin,Germany\nP242x8,Madrid,Spain\nP215x9,Rome,Italy\nP648x10,Paris,France\nP337x11,Berlin,Germany\nP828x12,Madrid,Spain\nP875x13,Rome,Italy\nP242x14,Paris,France\nP250x15,Berlin,Germany\nP858x16,Madrid,Spain\nP133x17,Rome,Italy\nP778x18,Paris,France\nP162x19,Berlin,Germany',
    test: (N) => {
      const nt = N.tables[0], r = nt.trel.results.find(x => x.family === 'fd' && x.headline.startsWith('City → Country'));
      const ok = r && r.headline === 'City → Country holds in 19 of 20 rows; row 7 Paris → Germany' && r.hits === 19 && r.n === 20 && r.excN === 1 && r.exceptions[0].row === 6 && r.chance !== null && r.chance <= -3 && r.status === 'primary' && nt.bad['6,2'] && nt.bad['6,2'].length === 1 && N.count.text >= 1;
      return ok ? null : JSON.stringify(nt.trel.results.map(x => [x.family, x.headline, x.chance, x.excN]));
    }
  },
  {
    name: 'text: IDs with a missing number and a repeated value',
    fixture: 'ids-a-missing-and-a-duplicate-id',
    src: 'Invoice,Amount\nINV-0041,120.00\nINV-0042,85.50\nINV-0043,60.00\nINV-0044,99.99\nINV-0046,45.00\nINV-0047,70.25\nINV-0047,30.10\nINV-0048,55.00\nINV-0049,80.00\nINV-0050,12.50',
    test: (N) => {
      const nt = N.tables[0], rs = nt.trel.results, seq = rs.find(x => x.family === 'idseq'), uq = rs.find(x => x.family === 'unique' && x.excN > 0);
      const ok = seq && seq.headline === 'Invoice numbers step by 1 (INV-0041 to INV-0050), missing INV-0045, 1 repeated value' && seq.chance <= -3 && seq.evidence.missing.join() === 'INV-0045' && uq && uq.headline === 'Duplicate Invoice: INV-0047 appears in rows 6, 7' && uq.exceptions.length === 1 && uq.exceptions[0].row === 6 && uq.exceptions[0].reason === 'duplicate of row 6' && nt.bad['6,0'].length === 1;
      return ok ? null : JSON.stringify(rs.map(x => [x.family, x.headline, x.chance]).concat([nt.bad]));
    }
  },
  {
    name: 'text: a duplicate ID that is also out of order has one mark and two reasons',
    fixture: 'one-mark-per-cell-a-duplicate-and-out-of-order-id',
    src: 'Invoice,Amount\nINV-0101,12.00\nINV-0102,18.50\nINV-0103,22.00\nINV-0104,9.99\nINV-0105,14.25\nINV-0103,31.00\nINV-0107,27.80\nINV-0108,16.40\nINV-0109,11.10\nINV-0110,19.90',
    test: (N, A) => {
      const nt = N.tables[0], why = nt.bad['5,0'], html = TUI.cardHTML(A.tables[0], nt, 0), marks = html.match(/<td [^>]*class="bad"[^>]*>/g) || [];
      const ok = why && why.length === 2 && why[0] === 'duplicate of row 3 (Invoice is unique)' && why[1] === 'out of order (Invoice steps by 1)' && Object.keys(nt.bad).length === 1 && marks.length === 1;
      return ok ? null : JSON.stringify({ bad: nt.bad, marks });
    }
  },
  {
    name: 'text: format AAA-9999 in 23 of 24 rows',
    src: 'Ref,Qty\nREF-1000,35\nREF-1007,44\nREF-1014,28\nREF-1021,33\nREF-1028,27\nREF-1035,17\nREF-1042,40\nREF-1049,63\nREF-1056,74\nREF-1063,81\nREF-1070,33\nREF-1077,21\nREF-1084,74\nREF-12X4,83\nREF-1098,87\nREF-1105,67\nREF-1112,3\nREF-1119,38\nREF-1126,6\nREF-1133,66\nREF-1140,25\nREF-1147,27\nREF-1154,67\nREF-1161,52',
    test: (N) => {
      const nt = N.tables[0], r = nt.trel.results.find(x => x.family === 'format');
      const ok = r && r.headline === 'Ref: Format AAA-9999 in 23 of 24 rows' && r.status === 'observation' && r.chance === null && r.excN === 1 && r.exceptions[0].row === 13 && r.exceptions[0].found === 'REF-12X4' && nt.bad['13,0'];
      return ok ? null : JSON.stringify(nt.trel.results.map(x => [x.family, x.headline, x.chance]));
    }
  },
  {
    name: 'text: First, Last and Full name are linked by concatenation',
    src: 'First,Last,Full,Mail\nAnn,Lee,Ann Lee,ann.lee\nBob,Ray,Bob Ray,bob.ray\nCara,Fox,Cara Fox,cara.fox\nDan,Wu,Dan Wu,dan.wu\nEve,Kim,Eve Kim,eve.kim\nFinn,Ng,Finn Ng,finn.ng\nGus,Poe,Gus Poe,gus.poe\nHana,Oz,Hana Oz,hana.oz\nIvo,Ash,Ivo Ash,ivo.ash\nJo,Ben,Jo Ben,jo.ben',
    test: (N) => {
      const rs = N.tables[0].trel.results.filter(x => x.family === 'concat');
      const full = rs.find(x => x.headline === 'Full = First + " " + Last'), mail = rs.find(x => x.headline === 'Mail = lowercase(First + "." + Last)');
      const ok = full && mail && full.chance <= -3 && mail.chance <= -3 && full.hits === 10 && full.status === 'primary';
      return ok ? null : JSON.stringify(rs.map(x => [x.headline, x.chance]));
    }
  },
  {
    name: 'text: title case concatenation',
    src: 'First,Last,Full\nann,lee,Ann Lee\nbob,ray,Bob Ray\ncara,fox,Cara Fox\ndan,wu,Dan Wu\neve,kim,Eve Kim\nfinn,ng,Finn Ng\ngus,poe,Gus Poe\nhana,oz,Hana Oz',
    test: (N) => {
      const r = N.tables[0].trel.results.find(x => x.family === 'concat');
      return r && r.headline === 'Full = title case(First + " " + Last)' && r.chance <= -3 ? null : JSON.stringify(N.tables[0].trel.results.map(x => [x.headline, x.chance]));
    }
  },
  {
    name: 'text: category counts and near-duplicate spellings',
    src: 'Order,Status,Region,Weight\nO100,Shipped,North,31\nO103,Pending,West,63\nO106,Cancelled,East,98\nO109,Returned,South,63\nO112,Shipped,North,91\nO115,shipped,West,46\nO118,Cancelled,East,71\nO121,Returned,South,37\nO124,Shipped,North,70\nO127,Pending,West,75\nO130,Pendng,East,33\nO133,Returned,South,74\nO136,Shipped,North,77\nO139,Pending,West,40\nO142,Cancelled,East,10\nO145,Returned,South,11\nO148,Shipped,North,57\nO151,Pending,West,84\nO154,Cancelled,East,64\nO157,Returned,South,18\nO160,Shipped,North,28\nO163,Pending,West,39\nO166,Cancelled,East,39\nO169,Returned,South,98',
    test: (N) => {
      const rs = N.tables[0].trel.results, cat = rs.find(x => x.family === 'category' && x.headline.startsWith('Status:')), sp = rs.find(x => x.family === 'spelling');
      const ok = cat && cat.headline === 'Status: 6 values — Returned 6, Shipped 6, Cancelled 5, Pending 5, Pendng 1, shipped 1' && cat.status === 'observation' && cat.chance === null && sp && sp.status === 'observation' && sp.headline.includes('“shipped” and “Shipped”') && sp.exceptions.length === 2 && sp.exceptions[1].found === 'Pendng';
      return ok ? null : JSON.stringify(rs.map(x => [x.family, x.headline]));
    }
  },
  {
    name: 'text: mixed currencies and mixed date order are reported',
    src: 'Id,Paid,Date,Note\nR1,$12.50,13/01/2026,x0\nR2,$7.00,01/25/2026,x5\nR3,€9.99,02/14/2026,x3\nR4,$21.00,20/01/2026,x1\nR5,$3.25,22/02/2026,x6\nR6,$18.40,03/25/2026,x4\nR7,$5.50,01/03/2026,x2\nR8,$14.00,31/03/2026,x0\nR9,$2.75,04/30/2026,x5\nR10,$9.00,11/04/2026,x3\nR11,$30.00,04/22/2026,x1\nR12,$11.10,17/05/2026,x6',
    test: (N) => {
      const rs = N.tables[0].trel.results.filter(x => x.family === 'consistency').map(x => x.headline);
      return rs.includes('Paid: mixes currencies: USD, EUR') && rs.includes('Date: dates mix day/month and month/day') ? null : JSON.stringify(rs);
    }
  },
  {
    name: 'text: City and Country drawn independently show no dependency',
    src: 'Name,City,Country\nP1,Berlin,Spain\nP2,Rome,Germany\nP3,Berlin,France\nP4,Paris,Germany\nP5,Berlin,Germany\nP6,Rome,France\nP7,Rome,Italy\nP8,Rome,Italy\nP9,Rome,Germany\nP10,Rome,France\nP11,Rome,Germany\nP12,Paris,Spain\nP13,Rome,Italy\nP14,Rome,France\nP15,Madrid,France\nP16,Paris,Italy\nP17,Rome,France\nP18,Paris,Spain\nP19,Berlin,France\nP20,Rome,Germany\nP21,Berlin,France\nP22,Paris,Italy\nP23,Berlin,Germany\nP24,Rome,Italy\nP25,Madrid,Spain\nP26,Rome,Germany\nP27,Berlin,France\nP28,Madrid,Spain\nP29,Rome,Germany\nP30,Madrid,Germany',
    test: (N) => {
      const nt = N.tables[0], rs = nt.trel.results;
      const ok = rs.every(x => x.family !== 'fd' && x.family !== 'concat') && Object.keys(nt.bad).length === 0 && N.count.text === rs.filter(x => x.chance !== null).length;
      return ok ? null : JSON.stringify(rs.map(x => [x.family, x.headline, x.chance]));
    }
  },
  {
    name: 'text: findings and cards carry text relations',
    src: 'Name,City,Country\nP112x0,Madrid,Spain\nP580x1,Rome,Italy\nP215x2,Paris,France\nP882x3,Berlin,Germany\nP502x4,Madrid,Spain\nP244x5,Rome,Italy\nP800x6,Paris,Germany\nP144x7,Berlin,Germany\nP242x8,Madrid,Spain\nP215x9,Rome,Italy\nP648x10,Paris,France\nP337x11,Berlin,Germany\nP828x12,Madrid,Spain\nP875x13,Rome,Italy\nP242x14,Paris,France\nP250x15,Berlin,Germany\nP858x16,Madrid,Spain\nP133x17,Rome,Italy\nP778x18,Paris,France\nP162x19,Berlin,Germany',
    test: (N) => {
      const nt = N.tables[0], rows = NUMS.findings(nt), html = NUMS.render(nt);
      const rel = rows.find(r => r[0] === 'Text relation' && r[1].startsWith('City → Country')), obs = rows.find(r => r[0] === 'Observation' && r[1].startsWith('City: 4 values')), exc = rows.find(r => r[0] === 'Exception' && r[1].startsWith('City → Country'));
      const ok = rel && rel[2] === '19 of 20' && rel[3].startsWith('1 in ') && obs && exc && exc[4] === 7 && exc[6] === 'France' && exc[7] === 'Germany' && html.includes('<h4>Text relations</h4>') && html.includes('<h4>Observations</h4>') && NUMS.hasFindings(nt) && NUMS.chips(N).some(c => c.includes('Text relations'));
      return ok ? null : JSON.stringify({ rel, obs, exc, h: html.slice(0, 200) });
    }
  },
  {
    name: 'PAT: two clean rules that continue differently are ambiguous',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], Q2 = ['1', '2', '4', '8', '16', '31', '57', '99', '163', '256'];
      const A = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('quad', -3.5, Q2, { params: 2 })]), s = A.subjects[0], nt = fakeNt(A, ['A']);
      const html = NUMS.render(nt), csv = NUMS.findings(nt).map(r => r[0]);
      const ok = A.subjects.length === 1 && s.ambiguous && s.primary.id === 'double' && s.rivals.length === 1 && s.rivals[0].id === 'quad' && s.next === null && s.fills.length === 0 && s.divergeAt === 6 && s.words.join(',') === 'Ambiguous,Exact' && A.summary.ambiguous === 1 && A.problems.length === 0 &&
        html.includes('<h4>Ambiguous</h4>') && html.includes('They agree up to position 5, then differ.') && html.includes('<th>Next 3 values</th>') && html.includes('<td>32, 64, 128</td>') && html.includes('<td>31, 57, 99</td>') && !html.includes(' · next ') && html.includes('no next value or fill is given') &&
        csv.includes('Sequence') && csv.includes('Ambiguous alternative') && !csv.includes('Next value');
      return ok ? null : JSON.stringify({ amb: s.ambiguous, div: s.divergeAt, words: s.words, next: s.next, csv, html: html.slice(0, 300) });
    }
  },
  {
    name: 'PAT: a rule that continues the same way is an equivalent, not a rival',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'];
      const A = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('twin', -4.0, P, { params: 2 })]), s = A.subjects[0];
      return !s.ambiguous && s.equivalents.map(r => r.id).join() === 'twin' && s.rivals.length === 0 && String(s.next.n) === '32' && s.divergeAt === null && s.words.join(',') === 'Exact' && A.subjects[0].equivalents[0].status === 'equivalent' ? null : JSON.stringify([s.ambiguous, s.equivalents.map(r => r.id), s.next]);
    }
  },
  {
    name: 'PAT: a rival with an exception, or more than 2 in log10 away, is not a rival',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], Q2 = ['1', '2', '4', '8', '16', '31', '57', '99', '163', '256'];
      const exc = mkSeq('quad', -3.5, Q2, { params: 2, excN: 1, hits: 4, exceptions: [{ row: 2, expected: '4', found: '5', diff: '1' }] });
      const a = PAT.arrange([mkSeq('double', -4.2, P), exc]).subjects[0];
      const b = PAT.arrange([mkSeq('double', -6, P), mkSeq('quad', -3.5, Q2, { params: 2 })]).subjects[0];
      const ok = !a.ambiguous && a.others.map(r => r.id).join() === 'quad' && String(a.next.n) === '32' && !b.ambiguous && b.others.map(r => r.id).join() === 'quad' && String(b.next.n) === '32' && b.others[0].status === 'others';
      return ok ? null : JSON.stringify([a.ambiguous, a.others.map(r => r.id), b.ambiguous, b.others.map(r => r.id)]);
    }
  },
  {
    name: 'PAT: the same results in any order give the same arrangement',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], Q2 = ['1', '2', '4', '8', '16', '31', '57', '99', '163', '256'], R2 = ['1', '2', '4', '8', '16', '30', '50', '80', '120', '170'];
      const mk = () => [mkSeq('double', -4.2, P), mkSeq('twin', -4.0, P, { params: 2 }), mkSeq('quad', -3.5, Q2, { params: 2 }), mkSeq('cubic', -3.2, R2, { params: 3 }), mkRel('c1', 1, -5, { inputs: [0] }), mkRel('c2', 2, -6, { inputs: [1] })];
      const a = arrSum(PAT.arrange(mk())), b = arrSum(PAT.arrange(mk().reverse())), c = arrSum(PAT.arrange(mk())), d = arrSum(PAT.arrange(mk().sort((x, y) => x.id < y.id ? 1 : -1)));
      const ok = a === b && a === c && a === d && JSON.parse(a)[0].some(s => s[10] !== undefined) && JSON.parse(a)[2].join() === 'column 1 → column 2 → column 3';
      return ok ? null : [a, b, c, d].join('\n');
    }
  },
  {
    name: 'PAT: more than 5 primaries show 5 and the rest go under More patterns',
    test: () => {
      const rs = []; for (let j = 0; j < 12; j++) rs.push(mkRel('r' + j, j, -3.2 - j * 0.4, { headline: 'C' + j + ' = A × 2' }));
      const A = PAT.arrange(rs), html = NUMS.render(fakeNt(A, rs.map((_, j) => 'C' + j))), at = html.indexOf('More patterns (7)');
      const vis = A.subjects.filter(s => s.visible).map(s => s.primary.id).sort().join();
      const before = (html.slice(0, at).match(/data-cols=/g) || []).length, after = (html.slice(at).match(/data-cols=/g) || []).length;
      const ok = A.hiddenCount === 7 && vis === 'r10,r11,r7,r8,r9' && at > 0 && before === 5 && after === 7 && A.summary.relations === 12;
      return ok ? null : JSON.stringify([A.hiddenCount, vis, at, before, after]);
    }
  },
  {
    name: 'PAT: an exception another result covers is explained, not counted',
    test: () => {
      const pa = mkRel('pa', 2, -5, { status: 'part', scope: { kind: 'rows', rows: [[0, 7]], label: 'rows 1–8' }, label: 'Rows 1–8', desc: 'Tax = Revenue × 0.2', n: 8, hits: 8 }), pb = mkRel('pb', 2, -5, { status: 'part', scope: { kind: 'rows', rows: [[8, 15]], label: 'rows 9–16' }, label: 'Rows 9–16', desc: 'Tax = Revenue × 0.25', n: 8, hits: 8 });
      const seg = mkRel('seg', 2, -9, { scope: { kind: 'segment', rows: [[0, 7], [8, 15]], label: 'x' }, combined: 'segments', inputs: [1], parts: ['pa', 'pb'], n: 16, hits: 16, size: 16, headline: 'Tax = Revenue × 0.2 in rows 1–8, × 0.25 from row 9' });
      const S = () => mkSeq('col2', -4, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'], { subject: { kind: 'column', table: 't', cols: [2], line: null }, excN: 1, hits: 15, n: 16, size: 16, next: null, exceptions: [{ row: 9, expected: '10', found: '12', diff: '+2' }] });
      const alone = PAT.arrange([S()]), both = PAT.arrange([seg, pa, pb, S()]), s = both.subjects.find(x => x.kind === 'seq').primary;
      const html = NUMS.render(fakeNt(both, ['A', 'B', 'Tax']));
      const ok = alone.problems.length === 1 && alone.problems[0].row === 9 && alone.problems[0].col === 2 && both.problems.length === 0 && s.explainedBy[9] === 'seg' && html.includes('explained by <a href="#') && both.subjects.find(x => x.kind === 'rel').words.join(',') === 'Two parts,Exact';
      return ok ? null : JSON.stringify([alone.problems, both.problems, s.explainedBy, both.subjects.map(x => x.words)]);
    }
  },
  {
    name: 'PAT: a cell flagged by two results has one mark and two reasons',
    test: () => {
      const r1 = mkRel('r1', 3, -5, { excN: 1, hits: 7, exceptions: [{ row: 2, expected: '10', found: '9', diff: '-1', reason: '10 expected, 9 found' }] });
      const t1 = mkRel('t1', 3, -4, { kind: 'text', family: 'format', headline: 'Ref: Format AAA-9999 in 7 of 8 rows', excN: 1, hits: 7, inputs: undefined, exceptions: [{ row: 2, col: 3, expected: 'AAA-9999', found: 'x', diff: '', text: 'does not match AAA-9999' }] });
      const A = PAT.arrange([t1, r1]), html = NUMS.render(fakeNt(A, ['a', 'b', 'c', 'Ref']));
      const ok = A.problems.length === 1 && A.problems[0].row === 2 && A.problems[0].col === 3 && A.problems[0].reasons.map(x => x.text).join('|') === '10 expected, 9 found|does not match AAA-9999' && html.includes('Problems in this table (1)');
      return ok ? null : JSON.stringify(A.problems);
    }
  },
  {
    name: 'implied: Total = Revenue × 1.2 only appears under Also follows from the above',
    src: IMPLIED,
    test: (N) => {
      const nt = N.tables[0], A = nt.arranged, tot = A.subjects.find(s => s.primary.headline === 'Total = Revenue + Tax'), html = NUMS.render(nt);
      const ok = tot && tot.implied.some(x => x.result.headline === 'Total = Revenue × 1.2') && A.subjects.every(s => s.primary.headline !== 'Total = Revenue × 1.2' && s.others.every(r => r.headline !== 'Total = Revenue × 1.2')) && html.includes('Also follows from the above') && html.split('Total = Revenue × 1.2').length === 2 && A.chain.length === 1 && A.chain[0].text === 'Revenue → Tax → Total' && NUMS.findings(nt).some(r => r[0] === 'Implied relation' && r[1] === 'Total = Revenue × 1.2');
      return ok ? null : JSON.stringify(A.subjects.map(s => [s.primary.headline, s.implied.map(x => x.result.headline), s.others.map(r => r.headline)]));
    }
  },
  {
    name: 'display form: Net = Gross − Fee is shown, Gross = Fee + Net is the same rule',
    src: NET,
    test: (N) => {
      const nt = N.tables[0], s = nt.arranged.subjects[0], html = NUMS.render(nt);
      const ok = nt.eqs.length === 1 && nt.eqs[0].text === 'Net = Gross − Fee' && nt.arranged.subjects.length === 1 && s.equivalents.map(r => r.headline).join() === 'Gross = Fee + Net' && html.includes('<b>Net = Gross − Fee</b>') && html.includes('Same rule, written differently') && nt.arranged.chain[0].text === 'Gross, Fee → Net';
      return ok ? null : JSON.stringify([nt.eqs.map(e => e.text), s.equivalents.map(r => r.headline), nt.arranged.chain]);
    }
  },
  {
    name: 'inverse relations on two columns are one rule even when the inverse is a repeating decimal',
    src: grid12,
    test: (N) => {
      const nt = N.tables[0], A = nt.arranged, y2 = A.subjects.find(s => s.primary.headline === 'Y2 = X2 × 3');
      const ok = nt.eqs.length === 6 && y2 && y2.equivalents.map(r => r.headline).join() === 'X2 = Y2 × 0.333 (33.3%)' && A.subjects.every(s => s.words[0] === 'Exact') && A.chain.length === 6;
      return ok ? null : JSON.stringify(A.subjects.map(s => [s.primary.headline, s.equivalents.map(r => r.headline)]));
    }
  },
  {
    name: 'caps: a 12-column table with six relations shows 5 and keeps 1 under More patterns',
    src: grid12,
    test: (N) => {
      const nt = N.tables[0], A = nt.arranged, html = NUMS.render(nt), at = html.indexOf('More patterns (1)');
      const before = (html.slice(0, at).match(/<li id="[^"]*" tabindex="0" data-cols/g) || []).length, after = (html.slice(at).match(/data-cols=/g) || []).length;
      const ok = A.subjects.length === 6 && A.hiddenCount === 1 && A.subjects.filter(s => s.visible).length === 5 && at > 0 && before === 5 && after === 1;
      return ok ? null : JSON.stringify([A.subjects.length, A.hiddenCount, at, before, after]);
    }
  },
  {
    name: 'PAT: combined rules say Two parts and a single rule with an exception says how many rows hold',
    test: (N, A0, X) => {
      const run = n => { const A = TXT.analyze(CASES.find(c => c.name === n).src), M = NUMS.analyze(A); return M; };
      const seg = run('segments: the rate changes halfway').tables[0].arranged.subjects[0], one = run('segment not worth it: one odd row').tables[0].arranged.subjects[0], grp = run('per group: rate by Country').tables[0].arranged.subjects[0];
      const line = run('sequence: one change point').lines[0].arranged.subjects[0], html = NUMS.render(run('segments: the rate changes halfway').tables[0]);
      const ok = seg.words.join() === 'Two parts,Exact' && seg.parts.length === 2 && one.words.join() === 'Holds in 15 of 16' && one.parts.length === 0 && grp.words[0] === 'Two parts' && line.words.join() === 'Two parts,Exact' && line.parts.length === 2 && html.includes('Two parts') && html.includes('<li>rows 1–8: Revenue × 0.2 (8 of 8)<details>') && html.includes('<li>rows 9–16: Revenue × 0.25 (8 of 8)<details>');
      return ok ? null : JSON.stringify([seg.words, one.words, grp.words, line.words]);
    }
  },
  {
    name: 'PAT: analysing the same input twice gives identical arrangements and pages',
    test: () => {
      const a = NUMS.analyze(TXT.analyze(TUI.SAMPLE)), b = NUMS.analyze(TXT.analyze(TUI.SAMPLE));
      const ra = a.tables.map(t => t ? NUMS.render(t) : ''), rb = b.tables.map(t => t ? NUMS.render(t) : '');
      return arrOf(a) === arrOf(b) && ra.join('\n') === rb.join('\n') && ra.some(x => x.length > 100) ? null : 'arrangements or pages differ';
    }
  },
  {
    name: 'findings CSV: the new columns come after the old ones',
    src: NET,
    test: (N) => {
      const rows = NUMS.findings(N.tables[0]), eq = rows.find(r => r[0] === 'Equation'), same = rows.find(r => r[0] === 'Equivalent form');
      const ok = rows[0].join('|') === 'Type|Finding|Holds in|Chance|Row|Label|Expected|Found|Difference|Subject|Status|Group|Scope|How found|Worked example' && rows.every(r => r.length === 15) && eq && eq[1] === 'Net = Gross − Fee' && eq[9] === 'Net' && eq[10] === 'primary' && eq[12] === 'all' && eq[13] === 'Net = Gross − Fee. It has no fitted numbers: each prediction uses the other columns exactly as they are.' && eq[14].startsWith('row 1: ') && same && same[1] === 'Gross = Fee + Net' && same[10] === 'equivalent';
      return ok ? null : JSON.stringify(rows);
    }
  },
  {
    name: 'chips: every link points at an element that is on the page',
    test: () => {
      const srcs = [TUI.SAMPLE, CASES.find(c => c.name === 'text: findings and cards carry text relations').src + '\n\n3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47', CASES.find(c => c.name === 'segments: the rate changes halfway').src + '\n\nRow,Revenue,Tax\n1,100.00,20.00\n1,100.00,20.00\n2,50.00,10.00'];
      const bad = [], seen = new Set();
      srcs.forEach(src => {
        const A = TXT.analyze(src), N = NUMS.analyze(A), page = TUI.pageHTML(A, N, N.tables.map(t => t && t.arranged), '');
        NUMS.chips(N).forEach(c => { const h = (/href="#([^"]+)"/.exec(c) || [])[1], l = /^<a class="chip" href="#[^"]+">([^<]+?) <b>/.exec(c); if (l) seen.add(l[1]); if (h && !page.includes('id="' + h + '"')) bad.push(h); });
      });
      return seen.size >= 4 && bad.length === 0 ? null : JSON.stringify({ seen: [...seen], bad });
    }
  },
  {
    name: 'TUI: hovering an item marks its columns and cells, and clicking an exception focuses the cell',
    test: (N, A, X) => {
      const f = fakeCard(), item = f.node({ cols: '1,2', cells: '0:2;3:1' });
      TUI.setMarks(item, true);
      const on = f.hot();
      TUI.setMarks(item, false);
      const off = f.hot(), li = f.node({ cell: '3:1' });
      TUI.onClick({ target: { closest: s => s === '[data-cell]' ? li : null } });
      const td = f.card.els.find(e => e.tag === 'td' && e.r === '3' && e.c === '1');
      const ok = on === 'th::1 th::2 td:0:2 td:3:1' && off === '' && td.attrs.tabindex === '-1' && td.scrolled && td.scrolled.block === 'center' && td.focused && f.card.els.filter(e => e.focused).length === 1;
      return ok ? null : JSON.stringify([on, off, td.attrs, td.focused]);
    }
  },
  {
    name: 'bug 39: a two-part shift that goes down is written with minus signs',
    src: 'Row,Base,Out\n1,637,632\n2,369,364\n3,588,583\n4,988,983\n5,704,699\n6,576,571\n7,882,877\n8,923,915\n9,167,159\n10,997,989\n11,288,280\n12,274,266\n13,993,985\n14,153,145',
    test: (N) => {
      const nt = N.tables[0], e = nt.eqs.find(q => q.target === 2), s = nt.arranged.subjects.find(x => x.kind === 'rel'), html = NUMS.render(nt);
      const ok = e && e.text === 'Out = Base − 5 in rows 1–7, − 8 from row 8' && s.primary.parts.map(p => p.desc).join('|') === 'Base − 5|Base − 8' && html.includes('Row 1: 637 − 5 = 632 ✓') && html.includes('Row 8: 923 − 8 = 915 ✓') && s.equivalents.some(r => r.headline === 'Base = Out + 5 in rows 1–7, + 8 from row 8');
      return ok ? null : JSON.stringify([nt.eqs.map(q => q.text), s.primary.parts.map(p => p.desc)]);
    }
  },
  {
    name: 'how: relations show the rule, worked rows, tolerance and the chance arithmetic',
    test: (N, A0, X) => {
      const A = TXT.analyze(TUI.SAMPLE), M = NUMS.analyze(A), i = A.tables.findIndex(t => t.title === 'REGIONAL SALES'), html = NUMS.render(M.tables[i]), plain = X.plain(html);
      const need = ['How this was found', 'Rule: Revenue = Units × Price. It has no fitted numbers: each prediction uses the other columns exactly as they are.', 'North: 120 × 4.50 = 540.00 ✓', 'South: 85 × 6.20 = 527.00 ✓', 'Rule: Tax = Revenue × 0.2 (20%). 0.2 = median of Tax ÷ Revenue over 8 rows, taken as the simplest value that keeps every hit.', 'North: 540.00 × 0.2 = 108.00 ✓',
        'Valley: 589.00 + 117.80 = 706.80, found 716.80 (+10.00) ✗', 'Values match within ±0.005 (half of the last digit): 7 exact, 0 rounded.', 'Values match within ±0.005 (half of the last digit): 8 exact, 0 rounded.', 'matched another row\'s value in 0 of 56 pairs (p₀ = (0 + 1) ÷ (56 + 2) ≈ 0.017)', 'Refitting the numbers on shuffled values gave p₀', 'Holding in 7 of 8 rows by luck: 1 in 10¹¹.', 'so corrected: 1 in 10⁸.', 'Why this one: Chosen over “Total = Units × Price + Tax”'];
      const miss = need.filter(x => !plain.includes(x));
      return miss.length === 0 && (html.match(/<summary>How this was found<\/summary>/g) || []).length >= 4 ? null : JSON.stringify(miss);
    }
  },
  {
    name: 'how: sequences explain each family in its own terms',
    test: (N, A0, X) => {
      const line = src => { const M = NUMS.analyze(TXT.analyze(src)); return X.plain(NUMS.renderLine(M.lines[0])); };
      const checks = [
        ['1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144', ['Difference table', '3, 5, 7, 9, 11, 13, 15', '2, 2, 2, 2, 2, 2', 'position 1: the polynomial gives 1 ✓', 'Repair walk: forward.', 'Shuffled check: shuffling the known values 200 times']],
        ['1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144', ['Berlekamp–Massey', '2 = 1 + 1 ✓', '3 = 2 + 1 ✓']],
        ['3, 6, 12, 24, 48, 96, 192, 384, 768, 1536', ['6 ÷ 3 = 2 ✓', '12 ÷ 6 = 2 ✓', 'Why this one: Chosen over “the differences are multiplied by 2 each time”']],
        ['2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37', ['Prime numbers (OEIS A000040)', 'position 1 is term 1 of A000040 ✓']],
        [CASES.find(c => c.name === 'sequence: a cycle written as period 2 and period 4 keeps the simpler rule').src, ['the same 2 numbers repeat: 5, 9', 'position 1 is entry 1 of the block: 5 ✓', 'Refitting a rule with 2 numbers on 50 shuffles']],
        ['3, 7, 11, 15, 19, 24, 27, 31, 35, 39, 43, 47', ['position 6: expected 23, found 24 (+1) ✗', 'Repair walk: forward (both directions gave the same exceptions).']]
      ];
      const bad = [];
      checks.forEach(([src, need]) => { const p = line(src); need.forEach(n => { if (!p.includes(n)) bad.push(n); }); });
      return bad.length === 0 ? null : JSON.stringify(bad);
    }
  },
  {
    name: 'how: segments and groups explain each part',
    test: (N, A0, X) => {
      const run = n => NUMS.render(NUMS.analyze(TXT.analyze(CASES.find(c => c.name === n).src)).tables[0]);
      const seg = X.plain(run('segments: the rate changes halfway')), grp = X.plain(run('per group: rate by Country')), line = X.plain(NUMS.renderLine(NUMS.analyze(TXT.analyze(CASES.find(c => c.name === 'sequence: one change point').src)).lines[0]));
      const need = [[seg, 'Numbers: 0.2 is the value of Tax ÷ Revenue that repeats most often in this part'], [seg, 'Row 1: 120.00 × 0.2 = 24.00 ✓'], [seg, 'Row 9: 260.00 × 0.25 = 65.00 ✓'], [seg, 'Tested 180 relations: 96 ordinary and 84 two-part variants (this rule alone has × 7 possible split points)'],
        [grp, 'Numbers: 0.2 is the median of Tax ÷ Revenue over the UK rows'], [grp, 'Numbers: 0.19 is the median of Tax ÷ Revenue over the DE rows'], [line, 'One change point was searched at every position'], [line, 'The step 2 is the most common difference between neighbouring values.'], [line, 'The ratio 2 is the most common quotient of neighbouring values.']];
      const bad = need.filter(([p, n]) => !p.includes(n)).map(x => x[1]);
      return bad.length === 0 ? null : JSON.stringify(bad);
    }
  },
  {
    name: 'how: text relations and totals explain themselves',
    test: (N, A0, X) => {
      const cc = X.plain(NUMS.render(NUMS.analyze(TXT.analyze(CASES.find(c => c.name === 'text: City → Country holds in 19 of 20 rows').src)).tables[0]));
      const A = TXT.analyze(TUI.SAMPLE), M = NUMS.analyze(A), sales = X.plain(NUMS.render(M.tables[A.tables.findIndex(t => t.title === 'REGIONAL SALES')])), ids = X.plain(NUMS.render(NUMS.analyze(TXT.analyze(CASES.find(c => c.name === 'text: IDs with a missing number and a repeated value').src)).tables[0]));
      const names = NUMS.analyze(TXT.analyze(CASES.find(c => c.name === 'text: First, Last and Full name are linked by concatenation').src)).tables[0];
      const nm = X.plain(NUMS.render(names));
      const need = [[cc, 'Madrid → Spain in 5 of 5 rows ✓'], [cc, 'Paris → France in 4 of 5 rows ✓'], [cc, 'Shuffled check: shuffling the values 200 times'], [cc, 'Tested 4 relations in this table, so corrected: 1 in 360,000.'],
        [ids, 'The number inside each Invoice value was taken out (INV-#)'], [ids, '42 = 41 + 1 ✓'], [ids, 'Every non-empty value in Invoice was compared with the others.'], [nm, 'Row 1: Ann, Lee → Ann Lee ✓'], [nm, 'Pair check: a built value matched another row\'s value'],
        [sales, 'Units: 120 + 85 + 240 + … (8 values) = 1105; the row says 1105 ✓'], [sales, 'Total: 648.00 + 632.40 + 792.00 + … (8 values) = 6017.80; the row says 6007.80 ✗'], [sales, 'it is not an exception of any relation'],
        [X.plain(NUMS.render(M.tables[A.tables.findIndex(t => /Item/.test(t.title))])), 'Price: 4 rows add up to 29.60; the line says $29.60 ✓']];
      const bad = need.filter(([p, n]) => !p.includes(n)).map(x => x[1]);
      return bad.length === 0 ? null : JSON.stringify(bad);
    }
  },
  {
    name: 'how: rivals each explain themselves under the comparison table',
    test: (N, A0, X) => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], Q2 = ['1', '2', '4', '8', '16', '31', '57', '99', '163', '256'];
      const A = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('quad', -3.5, Q2, { params: 2 })]), html = NUMS.render(fakeNt(A, ['A'])), plain = X.plain(html);
      const ok = (html.match(/<summary>How this was found<\/summary>/g) || []).length === 2 && plain.includes('Why this one: Two rules fit about equally well and continue differently from position 6, so no next value or fill is given.') && plain.includes('Rule: quad.');
      return ok ? null : plain.slice(0, 600);
    }
  },
  {
    name: 'PAT: why this one is one sentence from the arrangement',
    test: () => {
      const P = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512'], R2 = ['1', '2', '4', '8', '16', '30', '50', '80', '120', '170'];
      const twin = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('twin', -4.0, P, { params: 2 })]).subjects[0].why;
      const alone = PAT.arrange([mkSeq('double', -4.2, P)]).subjects[0].why;
      const several = PAT.arrange([mkSeq('double', -4.2, P), mkSeq('cubic', -3.2, R2, { params: 3, excN: 1, hits: 4, exceptions: [{ row: 2, expected: '4', found: '5', diff: '1' }] })]).subjects[0].why;
      const simpler = PAT.arrange([mkSeq('wide', -5, R2, { params: 3, excN: 1, hits: 4, exceptions: [{ row: 2, expected: '4', found: '5', diff: '1' }] }), mkSeq('narrow', -4.4, P, { params: 1 })]).subjects[0].why;
      const ok = twin === 'Chosen over “twin” because they are the same rule and this one has fewer parameters.' && alone === 'No other rule passed the chance bar for this list.' && several === 'It has the smallest chance of arising by luck among the 2 rules that fit.' && simpler === 'Chosen over “wide” because it is simpler and its chance is within a factor of 10 of the best.';
      return ok ? null : JSON.stringify([twin, alone, several, simpler]);
    }
  },
  {
    name: 'tested but not shown: each target keeps its best failing candidate and says why',
    src: 'A,B,C,D\n12,30,42,7\n25,11,36,91\n8,40,48,13\n33,17,99,55\n14,26,40,28\n9,35,70,3\n21,19,40,66\n17,23,12,44\n29,15,31,80',
    test: (N, A0, X) => {
      const nt = N.tables[0], A = nt.arranged, html = X.plain(NUMS.render(nt)), c = A.nearMisses.find(m => m.result.headline === 'C = A + B');
      const ok = nt.eqs.length === 0 && c && c.reason === 'support' && c.result.hits === 5 && c.result.n === 9 && html.includes('Tested but not shown (') && html.includes('C = A + B — holds in 5 of 9 rows, below 60%') && html.includes('No pattern found. This isn\'t evidence there is no pattern.') && A.nearMisses.length <= 5 && new Set(A.nearMisses.map(m => m.result.subject.cols.join())).size === A.nearMisses.length;
      return ok ? null : JSON.stringify(A.nearMisses.map(m => [m.result.headline, m.reason, m.result.hits, m.result.n]));
    }
  },
  {
    name: 'tested but not shown: sequence near misses and rejected splits',
    test: (N, A0, X) => {
      const run = src => { const M = NUMS.analyze(TXT.analyze(src)); return X.plain(NUMS.renderLine(M.lines[0])); };
      const cyc = run('5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9, 5, 9'), split = run('3, 7, 11, 15, 19, 24, 27, 31, 35, 39, 43, 47');
      const ok = cyc.includes('No pattern passed.') && cyc.includes('Tested but not shown (1)') && cyc.includes('the same 2 numbers repeat: 5, 9 — chance 1 in 260 after correction, above the 1 in 1,000 bar') && split.includes('two parts: odd positions step by 8; even positions step by 8 — a split explains the exceptions, but not by enough to rule out chance');
      return ok ? null : JSON.stringify([cyc.slice(-200), split.slice(-200)]);
    }
  },
  {
    name: 'PAT: near misses are one per target, capped at 5, and circular chains are named',
    test: (N, A0, X) => {
      const ms = []; for (let j = 0; j < 8; j++) ms.push(mkRel('m' + j, j, -1.2 - j * 0.1, { headline: 'C' + j + ' = A × 2' }));
      const live = mkRel('live', 9, -6, { headline: 'C9 = A + B' }), liveMiss = mkRel('lm', 9, -1.5, { headline: 'C9 = A × 3' });
      const A = PAT.arrange(ms.concat([live, liveMiss]), {}), html = X.plain(NUMS.render(fakeNt(A, ms.map((_, j) => 'C' + j))));
      const ab = [mkRel('p', 0, -5, { headline: 'A = B + 1', inputs: [1], excN: 1, hits: 7, exceptions: [{ row: 1, expected: '3', found: '4', diff: '1' }] }), mkRel('q', 1, -5.1, { headline: 'B = A − 1', inputs: [0], key: 'other', excN: 1, hits: 7, exceptions: [{ row: 2, expected: '3', found: '4', diff: '1' }] })];
      const B = PAT.arrange(ab, {}), circ = B.nearMisses.find(m => m.reason === 'circular');
      const ok = A.nearMissTotal === 8 && A.nearMisses.length === 5 && A.nearMisses[0].result.id === 'm7' && html.includes('Tested but not shown (8)') && html.includes('and 3 more') && html.includes('C7 = A × 2 — chance 1 in 79 after correction, above the 1 in 1,000 bar') && !html.includes('C9 = A × 3') && circ && html.length > 0;
      return ok ? null : JSON.stringify([A.nearMissTotal, A.nearMisses.map(m => m.result.id), B.nearMisses.map(m => [m.result.id, m.reason])]);
    }
  }
];
