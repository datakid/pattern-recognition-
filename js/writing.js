const WRITING = (() => {
  const MARK = 'delve delves delving delved showcase showcases showcasing underscore underscores underscoring intricate intricacies meticulous meticulously pivotal realm tapestry notably comprehensive crucial furthermore moreover additionally multifaceted nuanced foster fostering leverage leveraging robust seamless seamlessly testament commendable boasts garner garnered embark elevate vibrant navigate navigating unwavering invaluable paramount holistic streamline streamlined bustling enhance enhancing resonate resonates profound captivating noteworthy symphony beacon interplay'.split(' ');
  const MSET = new Set(MARK);
  const STOCK = [/\bit(?:'|’)?s (?:important|worth|crucial) to (?:note|remember|consider)\b/gi, /\bin conclusion\b/gi, /\blet(?:'|’)s (?:dive|delve|explore)\b/gi, /\bplays? a (?:crucial|pivotal|vital|key) role\b/gi, /\bin today(?:'|’)s (?:fast-paced|digital|ever-changing|modern)\b/gi, /\bwhether you(?:'|’)re\b/gi, /\b(?:ever-evolving|ever-changing) (?:landscape|world)\b/gi, /\bnavigat\w+ the (?:complexities|landscape|world)\b/gi, /\ba testament to\b/gi, /\bin the realm of\b/gi, /\bnot only\b[^.]{3,80}\bbut also\b/gi, /\bembark on a journey\b/gi, /\bunlock(?:ing)? the (?:power|potential)\b/gi, /\bI hope this helps\b/gi, /\bcertainly[!,]/gi, /\bgreat question\b/gi, /\bfeel free to\b/gi, /\boverall,/gi];
  const DISCLOSE = /\bas an ai(?: language model)?\b|\bas of my (?:last )?knowledge (?:update|cutoff)\b|\bI (?:don(?:'|’)t|do not) have (?:personal )?(?:opinions|feelings|access to real-time)\b|\[(?:insert|your) [^\]]{2,30}\]|\bregenerate response\b/i;
  const INFORMAL = /\b(?:lol|lmao|gonna|wanna|kinda|sorta|tbh|idk|imo|ngl|btw|yeah|nah|dunno|ain(?:'|’)t|y(?:'|’)all|ugh|haha|omg)\b/gi;
  const CONTR = /\b\w+(?:'|’)(?:t|s|re|ve|ll|d|m)\b/gi;

  function stats(a) { const n = a.length, m = a.reduce((x, y) => x + y, 0) / (n || 1), sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n || 1)); return { m, sd, cv: sd / (m || 1) }; }

  function analyze(src) {
    const text = src.replace(/<[^>]+>/g, ' ').replace(/\r/g, '');
    const words = text.match(/[\p{L}][\p{L}'’-]*/gu) || [], nw = words.length;
    const sents = text.replace(/\n{2,}/g, '. ').split(/(?<=[.!?])\s+(?=[\p{Lu}"“(])/u).map(s => (s.match(/[\p{L}][\p{L}'’-]*/gu) || []).length).filter(n => n >= 3);
    const paras = text.split(/\n\s*\n/).map(p => (p.match(/[\p{L}]+/gu) || []).length).filter(n => n >= 15);
    const latin = (text.match(/[A-Za-z]/g) || []).length / Math.max(1, (text.match(/\p{L}/gu) || []).length);
    const L = [], lower = words.map(w => w.toLowerCase());
    const per1k = c => c / nw * 1000;
    if (nw < 150 || latin < .8 || sents.length < 6) return { gate: nw < 150 ? 'Too short: ' + nw + ' words. At least 150 words in 6 sentences are needed; below that, every published method is close to guessing.' : latin < .8 ? 'Only English is supported for the writing check.' : 'Too few complete sentences.', nw };
    const disc = text.match(DISCLOSE);
    const mk = {}; lower.forEach(w => { if (MSET.has(w)) mk[w] = (mk[w] || 0) + 1; });
    const mkN = Object.values(mk).reduce((a, b) => a + b, 0), mkR = per1k(mkN), mkTypes = Object.keys(mk).length;
    const st = STOCK.map(r => (text.match(r) || []).length).reduce((a, b) => a + b, 0), stR = per1k(st);
    const S = stats(sents), P = stats(paras);
    const inf = (text.match(INFORMAL) || []).length, con = per1k((text.match(CONTR) || []).length);
    const lowStart = (text.match(/(?:^|[.!?]\s+)[a-z]/gm) || []).length, rep = (text.match(/[!?]{2,}|\.{4,}/g) || []).length;
    const md = (text.match(/\*\*[^*\n]{2,60}\*\*|^#{1,4} |^\s*[-*] \*\*/gm) || []).length;
    const dash = per1k((text.match(/—/g) || []).length);
    const win = 100, ttr = []; for (let i = 0; i + win <= lower.length; i += 50) ttr.push(new Set(lower.slice(i, i + win)).size / win);
    const mattr = ttr.length ? ttr.reduce((a, b) => a + b, 0) / ttr.length : new Set(lower).size / nw;
    const opener = {}; text.split(/(?<=[.!?])\s+/).forEach(s => { const w = (s.match(/^[\p{L}']+/u) || [''])[0].toLowerCase(); if (w) opener[w] = (opener[w] || 0) + 1; });
    const topOpen = Object.entries(opener).sort((a, b) => b[1] - a[1])[0], openR = topOpen ? topOpen[1] / sents.length : 0;

    if (disc) L.push(sig('Self-disclosure / template residue', '“' + disc[0] + '”', 'ai', 45, 'Phrases only an assistant writes, or unfilled template slots', REF.kobak));
    L.push(sig('Marker vocabulary', mkR.toFixed(1) + ' per 1k words · ' + (Object.entries(mk).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0] + '×' + e[1]).join(', ') || 'none'), mkR > 6 && mkTypes >= 3 ? 'ai' : mkR < 1 ? 'real' : 'neutral', mkR > 6 && mkTypes >= 3 ? 10 : mkR > 3.5 && mkTypes >= 3 ? 5 : mkR < 1 ? -4 : 0, 'Words whose use jumped after 2022 in millions of abstracts. Human writers use them too, so several different ones are needed', REF.kobak));
    L.push(sig('Stock phrases', st + ' (' + stR.toFixed(1) + ' per 1k)', stR > 3 ? 'ai' : 'neutral', stR > 3 ? 7 : stR > 1.5 ? 3 : 0, 'Assistant boilerplate such as “it is important to note” or “plays a crucial role”', REF.kobak));
    L.push(sig('Sentence-length burstiness (CV)', S.cv.toFixed(2) + ' · mean ' + S.m.toFixed(1) + ' words · ' + sents.length + ' sentences', S.cv < .35 ? 'ai' : S.cv > .6 ? 'real' : 'neutral', S.cv < .35 ? 8 : S.cv < .42 ? 3 : S.cv > .6 ? -7 : 0, S.cv < .42 ? 'Sentences are unusually even in length' : S.cv > .6 ? 'Strongly varied sentence lengths, typical of human writing' : 'Normal range', REF.gltr));
    if (paras.length >= 4) L.push(sig('Paragraph uniformity (CV)', P.cv.toFixed(2) + ' · ' + paras.length + ' paragraphs', P.cv < .2 ? 'ai' : P.cv > .55 ? 'real' : 'neutral', P.cv < .2 ? 4 : P.cv > .55 ? -3 : 0, P.cv < .2 ? 'Paragraphs are almost the same length' : 'Paragraph length varies', REF.gltr));
    L.push(sig('Informal markers & slips', inf + ' informal · ' + lowStart + ' lowercase starts · ' + rep + ' repeated punctuation', inf + lowStart + rep >= 3 ? 'real' : 'neutral', inf + lowStart + rep >= 3 ? -8 : 0, 'Slang, typos and unpolished punctuation are rare in unedited assistant output', REF.gltr));
    L.push(sig('Contractions', con.toFixed(1) + ' per 1k', 'neutral', 0, 'Context only: depends on genre and style', REF.gltr));
    L.push(sig('Leftover Markdown', md + ' fragments', md >= 2 ? 'ai' : 'neutral', md >= 2 ? 5 : 0, md >= 2 ? 'Bold headers or list syntax pasted into plain text, often copied from a chat window' : 'None', REF.kobak));
    L.push(sig('Em dash rate', dash.toFixed(1) + ' per 1k', 'neutral', 0, 'Context only: widely cited online, but many human writers and editors use em dashes', REF.sada));
    L.push(sig('Lexical diversity (MATTR-100)', mattr.toFixed(3), 'neutral', 0, 'Context only: depends on topic and author more than origin', REF.gltr));
    L.push(sig('Repeated sentence opener', topOpen ? '“' + topOpen[0] + '” starts ' + (openR * 100).toFixed(0) + '%' : '—', openR > .25 && sents.length >= 8 ? 'ai' : 'neutral', openR > .25 && sents.length >= 8 ? 3 : 0, 'Formulaic sentence starts', REF.gltr));

    const strong = !!disc, sc = L.filter(x => x.w && x.name !== 'Self-disclosure / template residue'), ai = sc.filter(x => x.w > 0).length, real = sc.filter(x => x.w < 0).length;
    let s = 50; L.forEach(x => s += x.w);
    if (!strong) s = 50 + (s - 50) * (Math.abs(ai - real) >= 2 ? 1 : .5);
    s = clamp(Math.round(s), strong ? 2 : 15, strong ? 95 : 85);
    let rel = strong ? 85 : clamp(20 + Math.min(25, (nw - 150) / 40) + Math.min(20, Math.abs(ai - real) * 6), 15, 65);
    const label = strong && s > 70 ? 'Self-disclosed AI text' : s >= 68 ? 'Leans AI-style' : s <= 32 ? 'Leans human-style' : 'Inconclusive';
    return { L, s, rel: Math.round(rel), label, nw, sents: sents.length };
  }

  function render(src) {
    const a = analyze(src);
    if (a.gate) return '<article class="card" id="writing-card"><h3>Writing check</h3><p>' + esc(a.gate) + '</p></article>';
    const v = /Self/.test(a.label) ? 'tagged' : a.label === 'Leans AI-style' ? 'ai' : /human/.test(a.label) ? 'real' : 'mixed';
    const top = a.L.filter(x => x.w).sort((p, q) => Math.abs(q.w) - Math.abs(p.w)).slice(0, 4);
    return '<details class="fcard v-' + v + '" id="writing-card" open><summary><span class="thumb glyph">¶</span><span class="fmeta"><b>Writing check</b><small>' + a.nw + ' words · ' + a.sents + ' sentences · English</small></span><span class="vpill">' + a.label + '</span><span class="fscore"><b>' + a.s + '%</b><small>reliability ' + a.rel + '%</small><span class="mini"><i style="width:' + a.s + '%"></i></span></span></summary><div class="fbody"><p class="honest">Style statistics, not proof of authorship. Edited or paraphrased AI text and plain, simple or non-native human writing are both misread regularly, by this check and by commercial detectors. Never use it alone to accuse anyone.</p><h4>Main drivers</h4><ul class="drivers">' + (top.map(x => '<li><b>' + (x.dir === 'real' ? '→ Human' : DIRL[x.dir]) + '</b> ' + esc(x.name) + ': ' + esc(x.why) + '</li>').join('') || '<li>No decisive signal</li>') + '</ul><details class="checks" open><summary>All ' + a.L.length + ' checks</summary>' + checksTable(a.L).replace(/→ Camera/g, '→ Human').replace(/Provenance &amp; metadata|Provenance & metadata/, 'Style signals') + '</details></div></details>';
  }
  return { analyze, render };
})();
