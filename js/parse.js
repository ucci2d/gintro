// Scrittura rapida «come scrive Gianluca»: parser tollerante delle righe e abbinamento alla libreria. Solo funzioni pure (testabili in Node).
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const Q1 = `['’′‘´\`]`, Q2 = `["”″“]`;
const TECH = [
  [/\bstripping\b/i, () => 'stripping'],
  [/\bpiramid(?:e|ale)\b/i, () => 'piramide'],
  [/\bfermo(?:\s+in\s+buca)?(?:\s+\d+(?:-\d+)?\s*(?:["”″]|sec\w*|s\b)?)?/i, m => m.trim().replace(/\s+/g, ' ').replace(/(\d)\s*(?:sec\w*|s)$/i, '$1"').replace(/^fermo(?= \d)/i, 'fermo').toLowerCase().replace(/[”″]/g, '"')],
  [/\bisometri(?:a|ca|co)\b/i, () => 'isometria'],
  [/\beccentric[ao](?:\s+lent[ao])?/i, m => (/lent/i.test(m) ? 'eccentrica lenta' : 'eccentrica')],
  [/\b(?:a\s+)?cedimento\b/i, () => 'a cedimento'],
];

// 1'30 → 1'30"; 90s / 90 sec → 90"; 2 min → 2'
export function normTime(s) {
  let t = String(s).trim().replace(new RegExp(Q1, 'g'), "'").replace(new RegExp(Q2, 'g'), '"').replace(/\s+/g, '');
  let m = /^(\d+)'(\d+)"?$/.exec(t); if (m) return `${m[1]}'${m[2]}"`;
  m = /^(\d+)(?:sec\w*|s)$/i.exec(t); if (m) return `${m[1]}"`;
  m = /^(\d+)(?:min\w*|m)$/i.exec(t); if (m) return `${m[1]}'`;
  return t;
}
const TIME = `\\d+\\s*${Q1}\\s*\\d+\\s*${Q2}?|\\d+\\s*${Q1}|\\d+\\s*${Q2}|\\d+\\s*(?:sec\\w*|min\\w*)\\b|\\d+s\\b`;

const emptyRow = () => ({ name: '', sets: '', reps: '', side: '', load: '', rest: '', tech: '', note: '' });

// Riconosce se il contenuto di una parentesi è una prescrizione (15 rep, 1', MAX) o una nota tecnica.
function parenRx(txt) {
  const t = txt.trim();
  let m = /^(\d+(?:\s*\+\s*\d+)*)\s*(?:rep\w*|rip\w*|r)?\.?$/i.exec(t); if (m) return m[1].replace(/\s+/g, '');
  if (new RegExp(`^(?:${TIME})$`, 'i').test(t)) return normTime(t);
  if (/^max$/i.test(t)) return 'MAX';
  return null;
}

// Una riga (un solo esercizio, senza '+' di superserie) → prescrizione + nome.
export function parseSegment(seg) {
  const r = emptyRow();
  let s = ' ' + seg.replace(/\t/g, ' ') + ' ';
  const take = (re, fn) => { const m = re.exec(s); if (!m) return false; fn(m); s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length); return true; };

  // note tra parentesi (o prescrizione tra parentesi)
  const notes = [];
  s = s.replace(/\(([^()]*)\)/g, (_, inner) => {
    const rx = parenRx(inner);
    if (rx && !r.reps) r.reps = rx; else if (inner.trim()) notes.push(inner.trim());
    return ' ';
  });
  // parentesi non chiusa: il resto è una nota
  s = s.replace(/\(([^)]*)$/, (_, inner) => { if (inner.trim()) notes.push(inner.trim()); return ' '; });

  take(new RegExp(`\\brec(?:upero)?\\.?\\s*:?\\s*(${TIME})`, 'i'), m => { r.rest = normTime(m[1]); });
  take(/(\d+(?:[.,]\d+)?)\s*kg\b/i, m => { r.load = `${m[1].replace(',', '.')} kg`; });
  for (const [re, fn] of TECH) if (!r.tech && take(re, m => { r.tech = fn(m[0]); })) break;
  take(/\bper\s+(gamba|braccio|lato)\b/i, m => { r.side = `per ${m[1].toLowerCase()}`; });
  take(/\bogni\s+lato\b/i, () => { r.side = 'per lato'; });
  if (!r.side) take(/\b(pg|pb|pl)\b/i, m => { r.side = { pg: 'per gamba', pb: 'per braccio', pl: 'per lato' }[m[1].toLowerCase()]; });

  // serie × ripetizioni / tempo
  take(new RegExp(`(\\d+)\\s*[x×*]\\s*(\\d+(?:\\s*\\+\\s*\\d+)+|max\\b|(?:${TIME})|\\d+)`, 'i'), m => {
    r.sets = m[1];
    const v = m[2].replace(/\s+/g, '');
    r.reps = /^max$/i.test(v) ? 'MAX' : /['’′"”″]|sec|min|\d+s$/i.test(v) ? normTime(v) : v;
  });
  if (!r.reps) take(/(?<![\w'"])(\d+(?:\s*\+\s*\d+)+)(?![\w'"])/, m => { r.reps = m[1].replace(/\s+/g, ''); });
  if (!r.reps) take(new RegExp(`(?<![\\w])(${TIME})`, 'i'), m => { r.reps = normTime(m[1]); });
  if (!r.reps) take(/\b(\d+)\s*(?:rep\w*|rip\w*)\b/i, m => { r.reps = m[1]; });
  if (!r.reps) take(/\bmax\b/i, () => { r.reps = 'MAX'; });
  if (!r.reps) take(/\s(\d{1,3})\s*$/, m => { r.reps = m[1]; });

  r.name = s.replace(/^\s*(?:[-•*·–]+|\d+[.)]|[A-Za-z]\d?[.)])\s*/, '').replace(/[\s,;:–-]+$/g, '').replace(/^[\s,;:]+/, '').replace(/\s+/g, ' ').trim().toUpperCase();
  r.note = notes.join('. ');
  return r;
}

// Spezza su « + » (superserie) fuori dalle parentesi; un pezzo senza lettere («12» in «10 + 12 + 15») si riattacca al precedente.
export function splitSuperset(line) {
  const parts = []; let depth = 0, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1);
    if (c === '+' && !depth && /\s/.test(line[i - 1] || '') && /\s/.test(line[i + 1] || '')) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  const out = [];
  for (const p of parts) {
    if (out.length && !/[a-zà-ú]{2}/i.test(p)) out[out.length - 1] += ' + ' + p.trim(); else out.push(p);
  }
  return out.map(p => p.trim()).filter(Boolean);
}

// Riga di blocco: «ripetere 3 volte, rec 1'30" a fine giro» / «3 giri» / «rec 1'30" a fine giro».
export function parseBlockLine(line) {
  const l = line.trim();
  const meta = {};
  let m = /\bripet\w*\s*(\d+(?:\s*\/\s*\d+)?)\s*(?:volt\w*|giri\b)?/i.exec(l) || /^(\d+(?:\s*\/\s*\d+)?)\s*giri\b/i.exec(l) || /\bgiri\s*:?\s*(\d+(?:\s*\/\s*\d+)?)/i.exec(l);
  if (m && /ripet|giri/i.test(l)) meta.rounds = m[1].replace(/\s+/g, '');
  const rec = new RegExp(`\\brec(?:upero)?\\.?\\s*:?\\s*(${TIME})`, 'i').exec(l);
  if (rec && (meta.rounds || /fine\s+giro/i.test(l))) meta.rest = normTime(rec[1]);
  return meta.rounds || meta.rest ? meta : null;
}

// Testo libero → { rows: [{raw, name, sets, reps, ..., linked}], meta: {rounds, rest} }
export function parseText(text) {
  const rows = []; const meta = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const bm = parseBlockLine(line);
    if (bm && !/\d\s*[x×]\s*\d/i.test(line) && !/^[A-Za-zÀ-ú].*\d+\s*(?:kg)/i.test(line)) { Object.assign(meta, bm); continue; }
    splitSuperset(line).forEach((seg, i) => {
      const r = parseSegment(seg);
      if (!r.name) return;
      rows.push({ raw: line, ...r, linked: i > 0 });
    });
  }
  return { rows, meta };
}

// ---- Abbinamento alla libreria (fuzzy, senza accenti) ----
const stem = w => (w.length > 3 ? w.replace(/[aeio]$/, '') : w);
const words = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).map(stem);
const wordEq = (a, b) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));
function dice(a, b) {
  const bg = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let n = 0, tot = 0;
  for (const [g, c] of A) { n += Math.min(c, B.get(g) || 0); tot += c; }
  for (const c of B.values()) tot += c;
  return tot ? 2 * n / tot : 0;
}
export function score(query, candidate) {
  const nq = norm(query), nc = norm(candidate);
  if (!nq || !nc) return 0;
  if (nq === nc) return 1;
  const A = words(query), B = words(candidate);
  let used = new Set(), hit = 0;
  for (const a of A) { const j = B.findIndex((b, k) => !used.has(k) && wordEq(a, b)); if (j >= 0) { used.add(j); hit++; } }
  const wsc = A.length && B.length ? 2 * hit / (A.length + B.length) : 0;
  return Math.max(wsc, dice(nq, nc) * 0.95);
}
// Candidati ordinati: [{ex, score}], solo > 0.4. `usage` = { exId: n } per spareggio.
export function candidates(name, exercises, usage = {}, limit = 5) {
  const out = [];
  for (const ex of exercises) { const s = score(name, ex.n); if (s > 0.4) out.push({ ex, score: s }); }
  return out.sort((a, b) => b.score - a.score || (usage[b.ex.id] || 0) - (usage[a.ex.id] || 0) || a.ex.n.length - b.ex.n.length).slice(0, limit);
}
export const AUTO = 0.75;
// Miglior abbinamento automatico (o null → esercizio nuovo).
export function bestMatch(name, exercises, usage = {}) {
  const c = candidates(name, exercises, usage, 1)[0];
  return c && c.score >= AUTO ? c.ex : null;
}
