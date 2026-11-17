// Editor scheda: intestazione comprimibile, tab Giorni, blocchi (serie/circuito/lista), righe esercizio, salvataggio automatico.
import * as store from './store.js';
import { openSheet } from './sheet.js';
import { renderPreview, openPreview, printPlan, copyWhatsApp } from './doc.js';
import { toast } from './ui.js';
import { openShare } from './share.js';
import { openQuick } from './quick.js';
export { weekLabel } from './progress.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const BLOCK_TITLES = ['Mobilità', 'Mobilità + Core', 'Stabilità', 'Respirazione', 'Allenamento forza', 'Circuito', 'Addome'];
export const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (d || ''); };
const KINDS = { serie: 'Serie', circuito: 'Circuito', lista: 'Lista' };
const DEFAULT_CHIPS = {
  frequency: ['2 allenamenti a settimana', '3 allenamenti a settimana', '4 allenamenti a settimana'],
  warmup: ['10\' cyclette o vogatore + mobilità', '5\' camminata veloce + mobilità'],
  cooldown: ['Stretching e respirazione', '5\' camminata lenta + stretching'],
  finalNote: ['Cerca sempre di incrementare il carico, mantenendo un\'esecuzione corretta.'],
};
const HEAD_FIELDS = [['goal', 'Obiettivo'], ['info', 'Informazioni'], ['frequency', 'Frequenza'], ['warmup', 'Riscaldamento'], ['cooldown', 'Defaticamento'], ['finalNote', 'Nota finale']];

// ---- Funzioni pure sui blocchi (esportate per test) ----
export const newItem = (o = {}) => ({ id: store.uuid(), exId: null, name: '', video: '', linked: false, sets: '', reps: '', side: '', load: '', rest: '', tech: '', note: '', ...o });
export const newBlock = (kind = 'serie', title = '') => ({ id: store.uuid(), kind, title, rounds: '', rest: '', note: '', items: [] });
const fix = items => { if (items[0]) items[0].linked = false; };
export function moveItem(items, i, d) {
  const j = i + d; if (j < 0 || j >= items.length) return false;
  [items[i], items[j]] = [items[j], items[i]]; fix(items); return true;
}
export function dupItem(items, i) { items.splice(i + 1, 0, { ...structuredClone(items[i]), id: store.uuid() }); }
export function toggleLink(items, i) { if (i < 1) return false; items[i].linked = !items[i].linked; return true; }
export function removeItem(items, i) { items.splice(i, 1); fix(items); }
// Etichette A, B / A1, A2 per superserie.
export function labels(items) {
  const groups = [];
  items.forEach((it, i) => { if (i > 0 && it.linked) groups[groups.length - 1].push(i); else groups.push([i]); });
  const out = [];
  groups.forEach((g, gi) => g.forEach((i, k) => { out[i] = String.fromCharCode(65 + gi % 26) + (g.length > 1 ? k + 1 : ''); }));
  return out;
}
export function rxSummary(it) {
  const parts = [];
  const main = [it.sets && it.reps ? `${it.sets} × ${it.reps}` : (it.sets || it.reps || ''), it.side].filter(Boolean).join(' ');
  if (main) parts.push(main);
  if (it.load) parts.push(it.load);
  if (it.rest) parts.push(`rec ${it.rest}`);
  if (it.tech) parts.push(it.tech);
  return parts.join(' · ');
}

// ---- Stato e salvataggio ----
let plan = null, day = 0, root = null, timer = null, dirty = false, openHead = null, headFor = null;

function status(t) { const s = root?.querySelector('#ed-status'); if (s) s.textContent = t; }
let prevTimer = null;
function updatePreview() {
  clearTimeout(prevTimer);
  prevTimer = setTimeout(() => { const el = root?.querySelector('.ed-prev'); if (el && plan && el.offsetParent) renderPreview(el, plan); }, 200);
}
function touch() {
  dirty = true; status('Modifiche…'); updatePreview();
  clearTimeout(timer); timer = setTimeout(flush, 500);
}
async function flush() {
  clearTimeout(timer);
  if (!dirty || !plan) return;
  dirty = false;
  try { const saved = await store.put('plans', plan); plan.updatedAt = saved.updatedAt; status('Salvato'); }
  catch { dirty = true; status('Errore di salvataggio'); }
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('hashchange', flush);

const curDay = () => plan.days[Math.min(day, plan.days.length - 1)];

export async function renderEditor(view, id) {
  await flush();
  const p = await store.get('plans', id);
  if (!p) { view.innerHTML = '<h1 class="view-title">Scheda</h1><div class="empty"><strong>Scheda non trovata</strong><a href="#schede">Torna alle schede</a></div>'; return; }
  plan = p; day = 0; root = view;
  if (!plan.days?.length) plan.days = [{ id: store.uuid(), name: 'Giorno 1', blocks: [] }];
  // Intestazione aperta solo per la scheda vuota; chiusa se duplicata o da modello (si ricorda la scelta per la stessa scheda).
  if (headFor !== plan.id) { headFor = plan.id; openHead = !plan.days.some(d => d.blocks?.some(b => b.items?.length)); }
  const others = (await store.list('plans')).filter(x => x.id !== plan.id);
  const chips = {};
  for (const [k] of HEAD_FIELDS) chips[k] = [...new Set([...(DEFAULT_CHIPS[k] || []), ...others.map(o => o[k]).filter(v => v && v.length < 120)])].slice(0, 8);
  root._chips = chips;
  draw();
}

function draw() {
  const scrollY = window.scrollY;
  const d = curDay();
  root.innerHTML = `<div class="ed-split"><div class="ed-col"><div class="ed-top"><a href="#schede" class="ed-back" aria-label="Torna alle schede">‹ Schede</a><span id="ed-status" class="ed-status" role="status">Salvato</span></div>
    <div class="ed-tools"><button class="btn btn-accent" data-act="doc-share">Invia al cliente</button><button class="btn ed-btn-prev" data-act="doc-prev">Anteprima</button><button class="btn" data-act="doc-print">Stampa / PDF</button><button class="btn" data-act="doc-wa">Copia testo WhatsApp</button><button class="btn" data-act="plan-dup">Duplica con progressione</button><button class="btn" data-act="plan-tpl">Salva come modello</button></div>
    <details class="ed-head" ${openHead ? 'open' : ''}><summary>${esc(plan.title || 'Scheda')} <small>${esc(fmtDate(plan.date))}</small></summary>
      <div class="ed-grid">
        <label>Titolo<input class="inp" data-f="title" value="${esc(plan.title)}"></label>
        <label>Data<input class="inp" type="date" data-f="date" value="${esc(plan.date)}"></label>
        <div class="ed-wide ed-week"><label>Settimana n<input class="inp" type="number" inputmode="numeric" min="1" max="99" data-f="weekN" value="${esc(plan.weekN)}" placeholder="es. 2"></label><label>Durata (settimane)<input class="inp" type="number" inputmode="numeric" min="1" max="99" data-f="weekOf" value="${esc(plan.weekOf)}" placeholder="es. 4"></label></div>
        ${HEAD_FIELDS.map(([k, l]) => `<label class="ed-wide">${l}<textarea class="inp" rows="${k === 'finalNote' ? 2 : 1}" data-f="${k}">${esc(plan[k])}</textarea>
          <span class="ed-chips">${(root._chips[k] || []).map(c => `<button type="button" class="chip chip-s" data-chip="${k}" data-v="${esc(c)}">${esc(c.length > 34 ? c.slice(0, 33) + '…' : c)}</button>`).join('')}</span></label>`).join('')}
      </div></details>
    <div class="ed-days" role="tablist">${plan.days.map((x, i) => `<button class="chip" role="tab" aria-pressed="${i === day}" data-day="${i}">${esc(x.name)}</button>`).join('')}<button class="chip" data-act="day-add" aria-label="Aggiungi giorno">+ Giorno</button></div>
    <div class="ed-dayact"><button class="btn" data-act="day-ren">Rinomina giorno</button><button class="btn btn-danger" data-act="day-del">Elimina giorno</button></div>
    <datalist id="ed-titles">${BLOCK_TITLES.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    ${d.blocks.map((b, bi) => blockHtml(b, bi, d.blocks.length)).join('')}
    <button class="btn btn-accent ed-addblock" data-act="blk-add">+ Blocco</button></div><aside class="ed-prev" aria-label="Anteprima documento"></aside></div>`;
  updatePreview();
  window.scrollTo(0, scrollY);
}

function blockHtml(b, bi, n) {
  const lab = labels(b.items);
  return `<section class="ed-block" data-b="${bi}">
    <div class="ed-bh">
      <input class="inp ed-bt" list="ed-titles" data-bf="title" value="${esc(b.title)}" placeholder="Titolo blocco" aria-label="Titolo blocco">
      <select class="inp ed-bk" data-bf="kind" aria-label="Tipo blocco">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${b.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn-x" data-act="blk-up" ${bi === 0 ? 'disabled' : ''} aria-label="Sposta blocco su">↑</button>
      <button class="btn-x" data-act="blk-down" ${bi === n - 1 ? 'disabled' : ''} aria-label="Sposta blocco giù">↓</button>
      <button class="btn-x" data-act="blk-del" aria-label="Elimina blocco">✕</button>
    </div>
    ${b.kind === 'circuito' ? `<div class="ed-circ"><label>Giri<input class="inp" data-bf="rounds" value="${esc(b.rounds)}" placeholder="3 o 2/3"></label><label>Recupero a fine giro<input class="inp" data-bf="rest" value="${esc(b.rest)}" placeholder="1'30&quot;"></label></div>` : ''}
    <ul class="ed-items">${b.items.map((it, i) => itemHtml(it, i, lab[i], b.items.length)).join('')}</ul>
    <div class="ed-addrow"><button class="btn btn-accent" data-act="item-quick">⚡ Scrivi veloce</button><button class="btn" data-act="item-add">+ Esercizio</button></div>
  </section>`;
}

function itemHtml(it, i, lab, n) {
  const rx = rxSummary(it);
  return `<li class="ed-item ${it.linked ? 'linked' : ''}" data-i="${i}">
    <span class="ed-lab">${lab}</span>
    <button class="ed-main" data-act="item-edit"><span class="ed-name">${esc(it.name || 'Esercizio')}</span>${rx ? `<span class="ed-rx">${esc(rx)}</span>` : ''}${it.note ? `<span class="ed-note">${esc(it.note)}</span>` : ''}</button>
    <button class="btn-x ed-more" data-act="item-more" aria-label="Azioni riga" aria-expanded="false">⋯</button>
    <span class="ed-acts">
      <button class="btn-x" data-act="item-up" ${i === 0 ? 'disabled' : ''} aria-label="Su">↑</button>
      <button class="btn-x" data-act="item-down" ${i === n - 1 ? 'disabled' : ''} aria-label="Giù">↓</button>
      <button class="btn-x" data-act="item-link" ${i === 0 ? 'disabled' : ''} aria-label="${it.linked ? 'Separa dal precedente' : 'Unisci al precedente'}" aria-pressed="${!!it.linked}">⛓</button>
      <button class="btn-x" data-act="item-dup" aria-label="Duplica">⧉</button>
      <button class="btn-x" data-act="item-del" aria-label="Elimina">✕</button>
    </span></li>`;
}

// ---- Eventi (delegati sul contenitore della vista, agganciati una sola volta) ----
function onInput(e) {
  const t = e.target;
  if (!plan || !root?.contains(t)) return;
  if (t.dataset.f) { plan[t.dataset.f] = t.value; if (t.dataset.f === 'title') root.querySelector('.ed-head summary').firstChild.textContent = t.value + ' '; touch(); }
  else if (t.dataset.bf) {
    const b = curDay().blocks[+t.closest('.ed-block').dataset.b];
    b[t.dataset.bf] = t.value; touch();
    if (t.dataset.bf === 'kind') draw();
  }
}
function onClick(e) {
  if (!plan) return;
  const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
  const d = curDay();
  if (t.dataset.chip) { plan[t.dataset.chip] = t.dataset.v; const ta = root.querySelector(`[data-f="${t.dataset.chip}"]`); ta.value = t.dataset.v; touch(); return; }
  if (t.dataset.day != null) { day = +t.dataset.day; return draw(); }
  const act = t.dataset.act; if (!act) return;
  const sec = t.closest('.ed-block'), bi = sec ? +sec.dataset.b : -1, b = d.blocks[bi];
  const li = t.closest('.ed-item'), i = li ? +li.dataset.i : -1;
  const done = () => { touch(); draw(); };
  switch (act) {
    case 'doc-prev': return openPreview(plan);
    case 'doc-print': return flush().then(() => printPlan(plan));
    case 'doc-share': return flush().then(() => openShare(plan, () => printPlan(plan)));
    case 'plan-dup': return flush().then(() => import('./plans.js')).then(m => m.duplicateDialog(plan));
    case 'plan-tpl': return flush().then(() => import('./plans.js')).then(m => m.saveTemplateDialog(plan));
    case 'doc-wa': return copyWhatsApp(plan).then(ok => { toast(ok ? 'Copiato' : 'Copia non riuscita'); });
    case 'day-add': plan.days.push({ id: store.uuid(), name: `Giorno ${plan.days.length + 1}`, blocks: [] }); day = plan.days.length - 1; return done();
    case 'day-ren': { const n = prompt('Nome del giorno', d.name); if (n?.trim()) { d.name = n.trim(); done(); } return; }
    case 'day-del':
      if (plan.days.length < 2) return alert('Serve almeno un giorno.');
      if (confirm(`Eliminare «${d.name}» e i suoi blocchi?`)) { plan.days.splice(day, 1); day = Math.max(0, day - 1); done(); }
      return;
    case 'blk-add': { const k = d.blocks.length; d.blocks.push(newBlock('serie', k ? '' : 'Allenamento forza')); return done(); }
    case 'blk-up': if (bi > 0) { [d.blocks[bi - 1], d.blocks[bi]] = [d.blocks[bi], d.blocks[bi - 1]]; done(); } return;
    case 'blk-down': if (bi < d.blocks.length - 1) { [d.blocks[bi + 1], d.blocks[bi]] = [d.blocks[bi], d.blocks[bi + 1]]; done(); } return;
    case 'blk-del': if (!b.items.length || confirm('Eliminare il blocco e i suoi esercizi?')) { d.blocks.splice(bi, 1); done(); } return;
    case 'item-more': { const o = li.classList.toggle('open'); t.setAttribute('aria-expanded', o); return; }
    case 'item-add': return editItem(b, null);
    case 'item-quick': return openQuick({ block: b, plan, deps: { newItem, rxSummary, labels } }).then(r => {
      if (!r?.items.length) return;
      b.items.push(...r.items); fix(b.items);
      if (r.meta.rounds) { b.rounds = r.meta.rounds; b.kind = 'circuito'; }
      if (r.meta.rest && b.kind === 'circuito') b.rest = r.meta.rest;
      toast(`${r.items.length} esercizi aggiunti`); done();
    });
    case 'item-edit': return editItem(b, i);
    case 'item-up': if (moveItem(b.items, i, -1)) done(); return;
    case 'item-down': if (moveItem(b.items, i, 1)) done(); return;
    case 'item-link': if (toggleLink(b.items, i)) done(); return;
    case 'item-dup': dupItem(b.items, i); toast('Duplicato'); return done();
    case 'item-del': removeItem(b.items, i); return done();
  }
}
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('click', onClick);
document.addEventListener('toggle', e => { if (e.target.classList?.contains('ed-head')) openHead = e.target.open; }, true);

// ---- Aggiunta/modifica esercizio: bottom sheet (js/sheet.js) ----
function editItem(block, idx) {
  return openSheet({
    item: idx == null ? null : block.items[idx],
    plan,
    onSave(out, { again }) {
      if (idx == null) block.items.push(out); else block.items[idx] = out;
      fix(block.items); touch(); draw(); toast(idx == null ? 'Aggiunto' : 'Salvato');
    },
  });
}
