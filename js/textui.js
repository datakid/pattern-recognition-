const TUI = (() => {
  const ROW_CAP = 1000, DEFER_AT = 150000;
  const SAMPLE = 'ORDER SUMMARY\n=================\nItem  Qty  Price\nOrganic apples - 3 kg - $4.50\nWhole milk - 2 L - $3.20\nRice bag - 5 kg - $12.00\nOlive oil - 750 ml - €9.90\n-----------------\nOrder ID: INV-2026-0042\nDate: Oct 3, 2026\nContact: support@freshmart.example\nDelivery: 45 min\nTotal = $29.60\nSent from my iPhone\nOrganic apples - 3 kg - $4.50\n\nName: Alice Chen\nAge: 34\nCity: Berlin\n\nName: Omar Haddad\nAge: 29\nCity: Cairo\n\nServer 10.0.0.12 responded in 120 ms at 14:02\nServer 10.0.0.19 responded in 340 ms at 14:05\nServer 10.0.0.23 responded in 135 ms at 14:09\nServer 10.0.0.31 responded in 4100 ms at 14:12\nPay to IBAN GB82 WEST 1234 5698 7654 32 by 2026-02-30\nCard on file 4111 1111 1111 1111\nTracking 3f2c9a1e-7b4d-4c8a-9e21-5a6b7c8d9e0f\n<p>Unsubscribe</p>\n\nREGIONAL SALES\nRegion\tUnits\tPrice\tRevenue\tTax\tTotal\nNorth\t120\t4.50\t540.00\t108.00\t648.00\nSouth\t85\t6.20\t527.00\t105.40\t632.40\nEast\t240\t2.75\t660.00\t132.00\t792.00\nWest\t60\t12.00\t720.00\t144.00\t864.00\nCentral\t150\t3.80\t570.00\t114.00\t684.00\nCoast\t95\t7.40\t703.00\t140.60\t843.60\nValley\t310\t1.90\t589.00\t117.80\t716.80\nHills\t45\t15.50\t697.50\t139.50\t837.00\nTotal\t1105\t\t5006.50\t1001.30\t6007.80';
  let tables = [], nums = null, run = 0;
  const typeCache = new Map();
  const typeCmp = (a, b) => { if (a === b) return 0; const k = a + '\u0000' + b; let v = typeCache.get(k); if (v === undefined) { v = a.localeCompare(b); typeCache.set(k, v); } return v; };
  const fileSlug = t => t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const failure = e => '<div class="card"><p>Could not analyze this text: ' + UTIL.esc(e.message) + '</p></div>';

  function tablesOf(a) {
    const out = [...a.tables];
    if (a.entities.length) out.push({ title: 'Entities', pattern: a.entities.length + ' unique values across all lines', head: ['Type', 'Raw', 'Normalized', 'Validation', 'Count', 'Lines'], rows: [...a.entities].sort((x, y) => typeCmp(x.type, y.type) || y.count - x.count).map(e => [e.type, e.raw, e.norm, e.check || '', e.count, e.lines.join(', ')]), types: [] });
    return out;
  }

  const misfits = t => t.misfits && t.misfits.length ? '<details><summary>Rows that don\'t fit the table (' + t.misfits.length + ')</summary><ul class="drivers">' + t.misfits.slice(0, 100).map(m => '<li>Line ' + m.line + ': ' + UTIL.esc(m.text) + ' (' + UTIL.esc(m.reason) + ')</li>').join('') + '</ul></details>' : '';

  function cardHTML(t, nt, i, arranged) {
    const A = arranged || (nt && nt.arranged) || null;
    const subjectOf = j => A ? A.subjects.find(s => s.kind === 'rel' && s.subject.cols[0] === j) : null;
    const small = j => { const s = subjectOf(j); return s ? (s.ambiguous ? 'ambiguous' : '= ' + s.primary.form) : t.types && t.types[j] && t.types[j] !== t.head[j] ? t.types[j] : ''; };
    const cut = t.rows.length > ROW_CAP ? '<p class="tstat">Showing the first ' + ROW_CAP.toLocaleString('en-US') + ' of ' + t.rows.length.toLocaleString('en-US') + ' rows; patterns use all rows.</p>' : '';
    const head = t.head.map((h, j) => '<th data-c="' + j + '">' + UTIL.esc(h) + (small(j) ? '<small>' + UTIL.esc(small(j)) + '</small>' : '') + '</th>').join('');
    const body = t.rows.slice(0, ROW_CAP).map((r, ri) => '<tr>' + t.head.map((_, j) => { const b = nt && nt.bad[ri + ',' + j]; return '<td data-r="' + ri + '" data-c="' + j + '"' + (b ? ' class="bad" title="' + UTIL.esc(b.join('; ')) + '"' : '') + '>' + UTIL.esc(r[j] ?? '') + '</td>'; }).join('') + '</tr>').join('');
    return '<article class="card ttable" id="ttable-' + i + '"><div class="thead"><div><h3>' + UTIL.esc(t.title) + '</h3><p>' + UTIL.esc(t.pattern) + ' · ' + t.rows.length + ' rows' + (t.alsoReadableAs ? ' · Also readable as ' + UTIL.esc(t.alsoReadableAs) : '') + '</p></div><div class="row"><button class="btn ghost sm" data-csv="' + i + '">CSV</button><button class="btn ghost sm" data-tsv="' + i + '">Copy</button>' + (NUMS.hasFindings(nt) ? '<button class="btn ghost sm" data-findings="' + i + '">Findings</button>' : '') + '</div></div><div class="tablewrap tall"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + cut + (nt ? NUMS.render(nt, { id: 'ttable-' + i, after: misfits(t) }) : misfits(t)) + '</article>';
  }

  function pageHTML(a, N, arranged, writingHTML) {
    const all = tablesOf(a), ec = {};
    a.entities.forEach(e => ec[e.type] = (ec[e.type] || 0) + e.count);
    const chips = [
      ...a.tables.map((t, i) => '<a class="chip" href="#ttable-' + i + '">' + UTIL.esc(t.title) + ' <b>' + t.rows.length + '</b></a>'),
      ...NUMS.chips(N),
      ...Object.entries(ec).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>'),
      ...Object.entries(a.dims).map(([k, v]) => '<span class="chip">' + k + ' <b>' + v + '</b></span>')
    ].join('');
    const removedN = a.removed.length;
    return writingHTML + '<div class="card"><h4>Recognized patterns</h4><div class="chips">' + (chips || '<span class="chip">No structure found</span>') + '</div><p class="tstat">' + a.kept.length + ' clean lines · ' + removedN + ' junk removed' + (a.html ? ' · HTML stripped on ' + a.html + ' lines' : '') + ' · ' + a.blank + ' blank lines</p></div>' + all.map((t, i) => cardHTML(t, N.tables[i], i, arranged && arranged[i])).join('') + N.lines.map(NUMS.renderLine).join('') + (a.prose.length ? '<details class="card"><summary>Unstructured text lines (' + a.prose.length + ')</summary><ul class="drivers">' + a.prose.slice(0, 200).map(l => '<li>' + UTIL.esc(l) + '</li>').join('') + '</ul></details>' : '') + (a.singles.length ? '<details class="card"><summary>Single lines with values (' + a.singles.length + ')</summary><ul class="drivers">' + a.singles.slice(0, 200).map(l => '<li>' + UTIL.esc(l) + '</li>').join('') + '</ul></details>' : '') + (removedN ? '<details class="card"><summary>Removed as junk (' + removedN + ')</summary><div class="tablewrap"><table><thead><tr><th>Line</th><th>Reason</th></tr></thead><tbody>' + a.removed.slice(0, 300).map(r => '<tr><td>' + UTIL.esc(r[0]) + '</td><td>' + r[1] + '</td></tr>').join('') + '</tbody></table></div></details>' : '');
  }

  function extractTextNow(src, out) {
    const a = TXT.analyze(src);
    if (!a.kept.length) { out.innerHTML = '<div class="card"><p>Nothing usable found.</p></div>'; return; }
    const N = NUMS.analyze(a), w = WRITING.analyze(src), proseWords = a.prose.join(' ').split(/\s+/).filter(Boolean).length;
    nums = N; tables = tablesOf(a);
    out.innerHTML = pageHTML(a, N, N.tables.map(t => t && t.arranged), proseWords >= 40 || !w.gate ? WRITING.render(src, w) : '');
  }

  function extractText() {
    const src = $('#text-input').value, out = $('#text-out'), mine = ++run;
    if (!src.trim()) { out.innerHTML = ''; return; }
    const go = () => { try { extractTextNow(src, out); } catch (e) { out.innerHTML = failure(e); } };
    if (src.length > DEFER_AT) {
      out.innerHTML = '<div class="card"><p class="tstat">Analyzing ' + src.split('\n').length.toLocaleString('en-US') + ' lines…</p></div>';
      setTimeout(() => { if (mine === run) go(); }, 30);
      return;
    }
    go();
  }

  function save(name, text) {
    const u = URL.createObjectURL(new Blob([text], { type: 'text/csv' })), a = document.createElement('a');
    a.href = u; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }

  const cardOf = el => el.closest('.ttable');
  function clearMarks(card) { card.querySelectorAll('.hl').forEach(x => x.classList.remove('hl')); }
  function setMarks(item, on) {
    const card = cardOf(item); if (!card) return;
    clearMarks(card);
    if (!on) return;
    const cols = (item.dataset.cols || '').split(',').filter(Boolean), cells = (item.dataset.cells || '').split(';').filter(Boolean);
    cols.forEach(c => card.querySelectorAll('th[data-c="' + c + '"]').forEach(x => x.classList.add('hl')));
    cells.forEach(k => { const [r, c] = k.split(':'); card.querySelectorAll('td[data-r="' + r + '"][data-c="' + c + '"]').forEach(x => x.classList.add('hl')); });
  }
  function focusCell(li) {
    const card = cardOf(li), k = (li.dataset.cell || '').split(':'); if (!card || k.length !== 2) return;
    const td = card.querySelector('td[data-r="' + k[0] + '"][data-c="' + k[1] + '"]'); if (!td) return;
    td.setAttribute('tabindex', '-1');
    td.scrollIntoView({ block: 'center' });
    td.focus();
  }
  const hover = on => e => { const item = e.target.closest && e.target.closest('[data-cols]'); if (item) setMarks(item, on); };

  function onClick(e) {
    const cell = e.target.closest('[data-cell]');
    if (cell) { focusCell(cell); return; }
    const f = e.target.closest('[data-findings]');
    if (f) {
      const i = +f.dataset.findings, nt = nums && nums.tables[i], t = tables[i];
      if (nt && t) save(fileSlug(t) + '-findings.csv', UTIL.toCSV(NUMS.findings(nt)));
      return;
    }
    const b = e.target.closest('[data-csv],[data-tsv]'); if (!b) return;
    const t = tables[+(b.dataset.csv ?? b.dataset.tsv)]; if (!t) return;
    const all = [t.head, ...t.rows].map(r => t.head.map((_, j) => r[j]));
    if (b.dataset.csv !== undefined) { save(fileSlug(t) + '.csv', UTIL.toCSV(all)); return; }
    const flash = msg => { b.textContent = msg; setTimeout(() => b.textContent = 'Copy', 1200); };
    Promise.resolve().then(() => navigator.clipboard.writeText(all.map(r => r.map(v => UTIL.csvSafe(String(v ?? '').replace(/\t|\n/g, ' '))).join('\t')).join('\n'))).then(() => flash('Copied')).catch(() => flash('Copy failed'));
  }

  function init() {
    const out = $('#text-out');
    out.addEventListener('click', onClick);
    out.addEventListener('mouseover', hover(true));
    out.addEventListener('mouseout', hover(false));
    out.addEventListener('focusin', hover(true));
    out.addEventListener('focusout', hover(false));
    $('#text-run').onclick = extractText;
    $('#text-sample').onclick = () => { $('#text-input').value = SAMPLE; extractText(); };
  }

  return { SAMPLE, tablesOf, cardHTML, pageHTML, extractTextNow, extractText, onClick, setMarks, focusCell, init };
})();

const extractText = () => TUI.extractText();
if (typeof document !== 'undefined' && document.getElementById('text-out')) TUI.init();
