// Bottom sheet (mobile) / pannello (desktop) per aggiungere e modificare un esercizio: ricerca libreria, prescrizione a chip, lastRx.
import * as store from './store.js';
import { CATEGORIES, suggestCategory } from './library.js';
import { videoField, thumbOf, playVideo } from './video.js';
import { learn } from './learn.js';
import { toast } from './ui.js';

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
export const prefill = (rx, ex) => { const o = Object.fromEntries([...RX_FIELDS, 'note'].map(k => [k, rx?.[k] ?? ''])); if (!o.note && ex?.note) o.note = ex.note; return o; };

// ---- Sheet ----
// opts: { item (null = nuovo), onSave(item, {again}) }. Ritorna una Promise risolta alla chiusura.
export async function openSheet({ item = null, plan = null, onSave }) {
  const [exercises, plans] = await Promise.all([store.list('exercises'), store.list('plans')]);
  const usage = usageCounts(plan ? [...plans.filter(p => p.id !== plan.id), plan] : plans);
  const isEdit = !!item;
  let it = item ? { ...item } : null;   // esercizio scelto (null = fase ricerca)
  if (it) it._vids = exercises.find(e => e.id === it.exId)?.v || [];
  let orig = it ? { name: it.name, video: it.video, note: it.note } : null;   // valori all'apertura (per «Aggiorna in libreria?»)
  let cat = '', q = '', added = 0, restored = false;
  // Bozza dell'esercizio in compilazione: se il foglio si chiude per errore, riaprendolo (stessa scheda e stessa riga) ritrova i campi.
  const DK = 'rakan:sheetdraft', myId = item?.id || null;
  const saveDraft = () => { try { if (it) localStorage.setItem(DK, JSON.stringify({ planId: plan?.id || '', itemId: myId, it, t: Date.now() })); } catch {} };
  const clearDraft = () => { try { localStorage.removeItem(DK); } catch {} };
  try {
    const d = JSON.parse(localStorage.getItem(DK) || 'null');
    if (d?.it && d.planId === (plan?.id || '') && d.itemId === myId && Date.now() - d.t < 864e5) { it = d.it; orig = orig || { name: it.name, video: it.video, note: it.note }; restored = true; }
  } catch {}

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
    dlg.classList.add('sh-tall');
    dlg.innerHTML = `<div class="sh-body sh-search"><div class="sh-head"><strong>Aggiungi esercizio</strong>${added ? `<span class="sh-added">${added} aggiunt${added > 1 ? 'i' : 'o'}</span>` : ''}<button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
      <input class="inp" id="sh-q" type="search" value="${esc(q)}" placeholder="Cerca esercizio…" autocomplete="off" aria-label="Cerca esercizio">
      <div class="chips">${CATEGORIES.map(c => `<button type="button" class="chip chip-s" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)}</button>`).join('')}</div>
      ${top ? '<div class="sh-sub">Più usati</div>' : ''}
      <ul class="ed-res">${res.map((e, i) => `<li class="sh-resli"><button type="button" class="btn" data-pick="${i}">${thumbOf(e.v?.[0]) ? `<img src="${esc(thumbOf(e.v[0]))}" alt="" width="48" height="27" loading="lazy" decoding="async" onerror="this.remove()">` : ''}<span>${esc(e.n)}${usage[e.id] ? ` <small>×${usage[e.id]}</small>` : ''}</span></button>${e.v?.[0] ? `<button type="button" class="btn sh-pl" data-pl="${i}" aria-label="Guarda il video di ${esc(e.n)}">▶</button>` : ''}</li>`).join('')}
        ${create ? `<li><button type="button" class="btn${res.length ? '' : ' btn-accent'}" data-a="create">Crea «${esc(q.trim())}»</button></li>` : ''}</ul>
      ${!res.length && !create ? '<p class="sh-sub">Nessun risultato.</p>' : ''}</div>`;
    const inp = dlg.querySelector('#sh-q');
    inp.oninput = () => { q = inp.value; const pos = q.length; drawSearch(); const n = dlg.querySelector('#sh-q'); n.focus(); n.setSelectionRange(pos, pos); };
    dlg.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.a === 'close') return dlg.close();
      if (t.dataset.cat != null) { cat = cat === t.dataset.cat ? '' : t.dataset.cat; return drawSearch(); }
      if (t.dataset.pl != null) { const x = res[+t.dataset.pl]; return playVideo(x.v[0], x.n); }
      if (t.dataset.pick != null) return pick(res[+t.dataset.pick]);
      if (t.dataset.a === 'create') return createNew(q.trim());
    };
  }

  async function pick(ex) {
    const rx = prefill(await store.get('lastRx', ex.id), ex);
    it = { id: store.uuid(), linked: false, load: '', ...rx, exId: ex.id, name: ex.n, video: ex.v?.[0] || '', _vids: ex.v || [] };
    orig = { name: it.name, video: it.video, note: it.note };
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
    dlg.classList.remove('sh-tall');
    dlg.innerHTML = `<form class="sh-body" method="dialog"><div class="sh-head"><strong class="sh-name">${esc(it.name)}</strong>
        ${isEdit ? '' : '<button type="button" class="btn" data-a="back">Cambia</button>'}<button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
      <label class="sh-note">Nome<input class="inp" name="name" value="${esc(it.name)}" autocomplete="off"></label>
      ${['sets', 'reps'].map(k => chipRow(k, CHIPS[k])).join('')}
      ${chipRow('side', CHIPS.side)}
      ${chipRow('rest', CHIPS.rest)}
      <div class="sh-row"><span class="sh-lab">${LABELS.load}</span><input class="inp sh-in sh-wide" name="load" value="${esc(it.load)}" placeholder="es. 20 kg" autocomplete="off" aria-label="Carico"></div>
      ${chipRow('tech', CHIPS.tech)}
      <div class="sh-row"><span class="sh-lab">Video (quello scelto va al cliente)</span><div class="sh-vids"></div><button type="button" class="btn sh-watch" data-a="watch" hidden>▶ Guarda il video scelto</button><div class="sh-vf"></div></div>
      <label class="sh-note">Nota tecnica<textarea class="inp" name="note" rows="2" placeholder="es. spalle basse, controlla le ginocchia">${esc(it.note)}</textarea></label>
      <div class="sh-actions">${isEdit ? '<button type="button" class="btn" data-a="cancel">Annulla</button><button type="button" class="btn btn-accent" data-a="save">Salva</button>'
        : '<button type="button" class="btn" data-a="again">Aggiungi e continua</button><button type="button" class="btn btn-accent" data-a="save">Aggiungi</button>'}</div></form>`;
    dlg.onclick = null;
    const f = dlg.querySelector('form');
    if (restored) { restored = false; f.querySelector('.sh-head').insertAdjacentHTML('afterend', '<p class="sh-restored" role="status">Ho ritrovato i campi che stavi compilando.</p>'); }
    saveDraft();
    if (it.exId) { try { localStorage.setItem('rakan:editing', JSON.stringify({ exId: it.exId, name: it.name, t: Date.now() })); } catch {} }
    const drawVids = () => {
      const vids = [...new Set([...(it._vids || []), it.video].filter(Boolean))];
      f.querySelector('.sh-vids').innerHTML = vids.length ? vids.map((v, i) => { const th = thumbOf(v); return `<button type="button" class="sh-vid" data-vid="${esc(v)}" aria-pressed="${it.video === v}" aria-label="Video ${i + 1}">${th ? `<img src="${esc(th)}" alt="" width="96" height="54" loading="lazy" onerror="this.remove()">` : ''}<small>Video ${i + 1}</small></button>`; }).join('') : '<p class="sh-sub">Nessun video: incolla un link qui sotto.</p>';
      f.querySelector('.sh-watch').hidden = !it.video;
    };
    const vf = videoField({ getName: () => it.name, onChange: u => { if (!u) return; it._vids = [...new Set([...(it._vids || []), u])]; it.video = u; vf.clear(); saveDraft(); drawVids(); } });
    f.querySelector('.sh-vf').append(vf); drawVids();
    const sync = k => dlg.querySelectorAll(`[data-k="${k}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === it[k])));
    f.oninput = e => { const n = e.target.name; if (!n || n === 'url') return; it[n] = e.target.value; saveDraft(); if (CHIPS[n]) sync(n); if (n === 'name') f.querySelector('.sh-name').textContent = it.name; };
    f.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.k) { const k = t.dataset.k; it[k] = it[k] === t.dataset.v ? '' : t.dataset.v; f[k].value = it[k]; saveDraft(); return sync(k); }
      if (t.dataset.vid) { it.video = t.dataset.vid; saveDraft(); f.querySelector('.sh-watch').hidden = false; f.querySelectorAll('[data-vid]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vid === it.video))); return; }
      if (t.dataset.a === 'watch') return playVideo(it.video, it.name);
      if (t.dataset.a === 'cancel') { clearDraft(); return dlg.close(); }
      if (t.dataset.a === 'close') return dlg.close();
      if (t.dataset.a === 'back') { clearDraft(); it = null; return drawSearch(); }
      if (t.dataset.a === 'save' || t.dataset.a === 'again') return commit(t.dataset.a === 'again');
    };
  }

  async function commit(again) {
    const out = { ...it }; delete out._vids; delete out.url;
    for (const k of [...RX_FIELDS, 'load']) out[k] = String(out[k] ?? '').trim();
    out.name = String(out.name || '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!out.name) return dlg.querySelector('[name="name"]')?.focus();
    if (out.exId && orig) { const ex = exercises.find(e => e.id === out.exId); const saved = await learn(orig, out, ex, exercises); if (saved) toast('Libreria aggiornata'); }
    if (out.exId) await store.put('lastRx', { id: out.exId, ...Object.fromEntries([...RX_FIELDS, 'note'].map(k => [k, out[k]])) });
    clearDraft(); onSave(out, { again });
    if (again) { added++; it = null; q = ''; drawSearch(); dlg.querySelector('#sh-q')?.focus(); } else dlg.close();
  }

  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // tocco sullo sfondo
  return new Promise(res => {
    dlg.addEventListener('close', () => { try { localStorage.removeItem('rakan:editing'); } catch {} dlg.remove(); res(); });
    if (it) drawForm(); else drawSearch();
    dlg.showModal();
    if (!it) dlg.querySelector('#sh-q')?.focus();
  });
}
