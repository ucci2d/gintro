// Web Share Target (Android PWA): YouTube → Condividi → Rakan. Il video va all'esercizio in modifica o a uno nuovo.
import * as store from './store.js';
import { parseVideo } from './video.js';
import { suggestCategory } from './library.js';
import { bestMatch, candidates } from './parse.js';
import { toast } from './ui.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Legge ?url=&text=&title= dall'indirizzo (e li toglie). Ritorna { video, title } o null.
export function takeShared(loc = location, hist = history) {
  const q = new URLSearchParams(loc.search);
  if (!q.has('url') && !q.has('text') && !q.has('title')) return null;
  const all = [q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' ');
  const video = parseVideo(all);
  const title = (q.get('title') || q.get('text') || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  try { hist.replaceState(null, '', loc.pathname + loc.hash); } catch {}
  return { video, title };
}

export function editingTarget() {
  try { const e = JSON.parse(localStorage.getItem('rakan:editing') || 'null'); return e && Date.now() - e.t < 2 * 3600e3 ? e : null; } catch { return null; }
}

export async function openShared({ video, title }) {
  if (!video) { toast('Nessun link video nella condivisione'); return; }
  const exercises = await store.list('exercises');
  const editing = editingTarget();
  const guess = bestMatch(title, exercises) || null;
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  document.body.appendChild(dlg);
  const def = editing ? editing.exId : guess ? guess.id : 'new';
  const opts = [];
  if (editing) opts.push(`<option value="${esc(editing.exId)}">In modifica: ${esc(editing.name)}</option>`);
  for (const c of candidates(title, exercises, {}, 5)) if (c.ex.id !== editing?.exId) opts.push(`<option value="${esc(c.ex.id)}">${esc(c.ex.n)}</option>`);
  opts.push('<option value="new">＋ Nuovo esercizio</option>');
  dlg.innerHTML = `<form class="dlg-body" method="dialog"><h2>Video ricevuto</h2>
    <div class="vf-prev">${video.thumb ? `<img src="${esc(video.thumb)}" alt="" width="96" height="54" onerror="this.remove()">` : ''}<span>${esc(video.url)}</span></div>
    <label>Aggiungi a<select name="t" class="inp">${opts.join('')}</select></label>
    <label id="sh-new">Nome del nuovo esercizio<input name="n" class="inp" value="${esc(title.toUpperCase())}" autocomplete="off"></label>
    <div class="dlg-actions"><button type="button" class="btn" data-a="x">Annulla</button><button class="btn btn-accent" value="ok">Aggiungi video</button></div></form>`;
  const f = dlg.querySelector('form'), sync = () => { dlg.querySelector('#sh-new').hidden = f.t.value !== 'new'; };
  f.t.value = def; sync(); f.t.onchange = sync;
  dlg.querySelector('[data-a="x"]').onclick = () => dlg.close();
  f.onsubmit = async e => {
    e.preventDefault();
    if (f.t.value === 'new') {
      const name = f.n.value.replace(/\s+/g, ' ').trim().toUpperCase();
      if (!name) return f.n.focus();
      await store.put('exercises', { id: 'c-' + store.uuid(), n: name, c: suggestCategory(name, exercises) || 'Total body', v: [video.url], custom: true });
    } else {
      const ex = exercises.find(x => x.id === f.t.value);
      if (ex && !ex.v?.includes(video.url)) { const { _s, ...rec } = ex; await store.put('exercises', { ...rec, v: [...(ex.v || []), video.url] }); }
    }
    toast('Video aggiunto'); dlg.close();
  };
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
