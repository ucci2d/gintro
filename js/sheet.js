// Bottom sheet (mobile) / pannello (desktop) per aggiungere e modificare un esercizio: ricerca libreria, prescrizione a chip, lastRx.
import * as store from './store.js';
import { CATEGORIES, suggestCategory } from './library.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const RX_FIELDS = ['sets', 'reps', 'side', 'load', 'rest', 'tech'];
export const CHIPS = {
  sets: ['2', '3', '4', '5'],
  reps: ['8', '10', '12', '15', '20', '30"', '40"', "1'", 'MAX'],
  side: ['per gamba', 'per braccio', 'per lato'],
  rest: ['45"', "1'", "1'30\"", "2'"],
  tech: ['stripping', 'piramide', 'fermo in buca 2-3"', 'isometria', 'eccentrica lenta', 'a cedimento'],
};
const LABELS = { sets: 'Serie', reps: 'Rip', side: 'Lato', rest: 'Rec', tech: 'Tecnica', load: 'Carico' };

// ---- Funzioni pure (esportate per test) ----
// Quante volte ogni esercizio compare nelle schede.
export function usageCounts(plans) {
  const u = {};
  for (const p of plans) for (const d of p.days || []) for (const b of d.blocks || []) for (const it of b.items || []) if (it.exId) u[it.exId] = (u[it.exId] || 0) + 1;
  return u;
}
// Risultati: filtro multi-parola senza accenti + categoria, prima i più usati, poi alfabetico.
export function rank(exercises, query, usage = {}, cat = '', limit = 30) {
  const q = store.normalize(query).split(' ').filter(Boolean);
  return exercises
    .filter(e => (!cat || e.c === cat) && q.every(w => (e._s ?? store.normalize(e.n)).includes(w)))
    .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0) || a.n.localeCompare(b.n, 'it'))
    .slice(0, limit);
}
// Prescrizione iniziale: lastRx se c'è, altrimenti vuota.
export const prefill = rx => Object.fromEntries([...RX_FIELDS, 'note'].map(k => [k, rx?.[k] ?? '']));

// ---- Sheet ----
// opts: { item (null = nuovo), onSave(item, {again}) }. Ritorna una Promise risolta alla chiusura.
export async function openSheet({ item = null, plan = null, onSave }) {
  const [exercises, plans] = await Promise.all([store.list('exercises'), store.list('plans')]);
  const usage = usageCounts(plan ? [...plans.filter(p => p.id !== plan.id), plan] : plans);
  const isEdit = !!item;
  let it = item ? { ...item } : null;   // esercizio scelto (null = fase ricerca)
  let cat = '', q = '', added = 0;

  const dlg = document.createElement('dialog');
  dlg.className = 'dlg sheet';
  dlg.setAttribute('aria-label', isEdit ? 'Modifica esercizio' : 'Aggiungi esercizio');
  document.body.appendChild(dlg);

  const chipRow = (k, vals) => `<div class="sh-row"><span class="sh-lab">${LABELS[k]}</span><div class="sh-chips">${vals.map(v => `<button type="button" class="chip" data-k="${k}" data-v="${esc(v)}" aria-pressed="${it[k] === v}">${esc(v)}</button>`).join('')}</div>
    <input class="inp sh-in" name="${k}" value="${esc(it[k])}" aria-label="${LABELS[k]} (libero)" autocomplete="off"></div>`;

  function drawSearch() {
    const res = rank(exercises, q, usage, cat);
    const top = !q && !cat;
    const create = store.normalize(q) && !exercises.some(e => store.normalize(e.n) === store.normalize(q));
    dlg.innerHTML = `<div class="sh-body"><div class="sh-head"><strong>Aggiungi esercizio</strong>${added ? `<span class="sh-added">${added} aggiunt${added > 1 ? 'i' : 'o'}</span>` : ''}<button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
      <input class="inp" id="sh-q" type="search" value="${esc(q)}" placeholder="Cerca esercizio…" autocomplete="off" aria-label="Cerca esercizio">
      <div class="chips">${CATEGORIES.map(c => `<button type="button" class="chip chip-s" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)}</button>`).join('')}</div>
      ${top ? '<div class="sh-sub">Più usati</div>' : ''}
      <ul class="ed-res">${res.map((e, i) => `<li><button type="button" class="btn" data-pick="${i}">${esc(e.n)}${usage[e.id] ? ` <small>×${usage[e.id]}</small>` : ''}</button></li>`).join('')}
        ${create ? `<li><button type="button" class="btn btn-accent" data-a="create">Crea «${esc(q.trim())}»</button></li>` : ''}</ul>
      ${!res.length && !create ? '<p class="sh-sub">Nessun risultato.</p>' : ''}</div>`;
    const inp = dlg.querySelector('#sh-q');
    inp.oninput = () => { q = inp.value; const pos = q.length; drawSearch(); const n = dlg.querySelector('#sh-q'); n.focus(); n.setSelectionRange(pos, pos); };
    dlg.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.a === 'close') return dlg.close();
      if (t.dataset.cat != null) { cat = cat === t.dataset.cat ? '' : t.dataset.cat; return drawSearch(); }
      if (t.dataset.pick != null) return pick(res[+t.dataset.pick]);
      if (t.dataset.a === 'create') return createNew(q.trim());
    };
  }

  async function pick(ex) {
    const rx = prefill(await store.get('lastRx', ex.id));
    it = { id: store.uuid(), linked: false, load: '', ...rx, exId: ex.id, name: ex.n, video: ex.v?.[0] || '', _vids: ex.v || [] };
    drawForm();
  }
  // Creazione facile (come in libreria): nome in maiuscolo, categoria proposta, custom:true.
  async function createNew(text) {
    const name = text.replace(/\s+/g, ' ').toUpperCase();
    const ex = { id: 'c-' + store.uuid(), n: name, c: suggestCategory(name, exercises) || 'Total body', v: [], custom: true };
    const saved = await store.put('exercises', ex);
    exercises.push(saved);
    pick(saved);
  }

  function drawForm() {
    const vids = [...new Set([...(it._vids || []), it.video].filter(Boolean))];
    dlg.innerHTML = `<form class="sh-body" method="dialog"><div class="sh-head"><strong class="sh-name">${esc(it.name)}</strong>
        ${isEdit ? '' : '<button type="button" class="btn" data-a="back">Cambia</button>'}<button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
      ${['sets', 'reps'].map(k => chipRow(k, CHIPS[k])).join('')}
      ${chipRow('side', CHIPS.side)}
      ${chipRow('rest', CHIPS.rest)}
      <div class="sh-row"><span class="sh-lab">${LABELS.load}</span><input class="inp sh-in sh-wide" name="load" value="${esc(it.load)}" placeholder="es. 20 kg" autocomplete="off" aria-label="Carico"></div>
      ${chipRow('tech', CHIPS.tech)}
      ${vids.length > 1 ? `<div class="sh-row"><span class="sh-lab">Video</span><div class="sh-chips">${vids.map((v, i) => `<button type="button" class="chip" data-vid="${esc(v)}" aria-pressed="${it.video === v}">Video ${i + 1}</button>`).join('')}</div></div>` : ''}
      <label class="sh-note">Nota tecnica<textarea class="inp" name="note" rows="2" placeholder="es. spalle basse, controlla le ginocchia">${esc(it.note)}</textarea></label>
      <div class="sh-actions">${isEdit ? '<button type="button" class="btn" data-a="close">Annulla</button><button type="button" class="btn btn-accent" data-a="save">Salva</button>'
        : '<button type="button" class="btn" data-a="again">Aggiungi e continua</button><button type="button" class="btn btn-accent" data-a="save">Aggiungi</button>'}</div></form>`;
    dlg.onclick = null;
    const f = dlg.querySelector('form');
    const sync = k => dlg.querySelectorAll(`[data-k="${k}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === it[k])));
    f.oninput = e => { const n = e.target.name; if (!n) return; it[n] = e.target.value; if (CHIPS[n]) sync(n); };
    f.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.k) { const k = t.dataset.k; it[k] = it[k] === t.dataset.v ? '' : t.dataset.v; f[k].value = it[k]; return sync(k); }
      if (t.dataset.vid) { it.video = t.dataset.vid; f.querySelectorAll('[data-vid]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vid === it.video))); return; }
      if (t.dataset.a === 'close') return dlg.close();
      if (t.dataset.a === 'back') { it = null; return drawSearch(); }
      if (t.dataset.a === 'save' || t.dataset.a === 'again') return commit(t.dataset.a === 'again');
    };
  }

  async function commit(again) {
    const out = { ...it }; delete out._vids;
    for (const k of [...RX_FIELDS, 'load']) out[k] = String(out[k] ?? '').trim();
    if (out.exId) await store.put('lastRx', { id: out.exId, ...Object.fromEntries([...RX_FIELDS, 'note'].map(k => [k, out[k]])) });
    onSave(out, { again });
    if (again) { added++; it = null; q = ''; drawSearch(); dlg.querySelector('#sh-q')?.focus(); } else dlg.close();
  }

  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // tocco sullo sfondo
  return new Promise(res => {
    dlg.addEventListener('close', () => { dlg.remove(); res(); });
    if (it) drawForm(); else drawSearch();
    dlg.showModal();
    if (!it) dlg.querySelector('#sh-q')?.focus();
  });
}
