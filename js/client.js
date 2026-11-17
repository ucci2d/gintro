// Vista cliente («App del paziente»): si apre da https://…/#c=<dati>. Nessun server: tutto nel link + localStorage.
import { decode, ytId } from './share.js';
import { canPrompt, onChange, promptInstall } from './install.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');
const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (d || ''); };
const today = () => new Date().toLocaleDateString('it-IT');
const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#0F766E';
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';

export const isClientHash = () => location.hash.startsWith('#c=');

// Chiave di salvataggio = hash del link (djb2 sul contenuto).
function hashKey(data) { let h = 5381; for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0; return 'rakan-cl-' + h.toString(36); }
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* spazio pieno / privato */ } };

function itemHtml(it, key, lab, st) {
  const n = it.s || 1, checks = st.chk?.[key] || [], vid = it.y || it.u;
  const boxes = Array.from({ length: n }, (_, i) => `<label class="cl-set"><input type="checkbox" data-chk="${key}" data-i="${i}" ${checks[i] ? 'checked' : ''}><span>${it.s ? i + 1 : '✓'}</span></label>`).join('');
  return `<div class="cl-it"><div class="cl-top"><span class="cl-lab">${esc(lab)}</span><div class="cl-main">
    <div class="cl-name">${esc(it.n)}</div>${it.p ? `<span class="cl-pill">${esc(it.p)}</span>` : ''}${it.o ? `<div class="cl-note">${nl(it.o)}</div>` : ''}</div>
    ${vid ? `<button class="cl-play" type="button" data-play="${esc(it.y ? 'y:' + it.y : 'u:' + it.u)}" aria-label="Guarda il video di ${esc(it.n)}">▶</button>` : ''}</div>
    <div class="cl-row"><div class="cl-sets" role="group" aria-label="Serie fatte">${boxes}</div>
    <label class="cl-load">Carico<input type="text" inputmode="decimal" enterkeyhint="done" placeholder="kg" maxlength="20" data-load="${key}" value="${esc(st.load?.[key] || '')}"></label></div></div>`;
}

function finishHtml(di, st) {
  const done = st.done?.[di];
  return done ? `<div class="cl-done">✓ Allenamento completato il ${esc(done)} <button type="button" class="cl-undo" data-undo="${di}">Annulla</button></div>`
    : `<button type="button" class="cl-btn" data-finish="${di}">Segna come completato</button>`;
}

function dayHtml(d, di, st) {
  return `<section class="cl-day" data-day="${di}"><h2>${esc(d.n)}</h2>
    ${(d.B || []).map((b, bi) => {
      const meta = [b.r && `ripetere ${b.r} volte`, b.c && `recupero ${b.c} a fine giro`].filter(Boolean).join(' · ');
      let g = -1; const labs = (b.I || []).map((it, i) => { if (!(i > 0 && it.l)) g++; return { g, first: !(i > 0 && it.l) }; });
      const size = {}; labs.forEach(l => size[l.g] = (size[l.g] || 0) + 1);
      const cnt = {};
      return `<div class="cl-block"><h3>${esc(b.t || 'Blocco')}${meta ? `<small>${esc(meta)}</small>` : ''}</h3>${b.o ? `<div class="cl-note cl-bnote">${nl(b.o)}</div>` : ''}
      ${(b.I || []).map((it, i) => { const l = labs[i]; cnt[l.g] = (cnt[l.g] || 0) + 1; const lab = String.fromCharCode(65 + l.g % 26) + (size[l.g] > 1 ? cnt[l.g] : '');
        return `<div class="cl-g ${size[l.g] > 1 ? 'super' : ''}">${itemHtml(it, `${di}.${bi}.${i}`, lab, st)}</div>`; }).join('')}</div>`;
    }).join('')}
    <div class="cl-finish">${finishHtml(di, st)}</div></section>`;
}

export async function renderClient(view) {
  document.body.classList.add('client-mode');
  const data = location.hash.slice(3), key = hashKey(data);
  let p;
  try { p = await decode(data); if (!p || !Array.isArray(p.D)) throw 0; }
  catch {
    document.title = 'Scheda · Rakan';
    view.innerHTML = '<div class="cl-wrap"><div class="cl-err"><h1>Link non valido</h1><p>Non riesco ad aprire la scheda: il link sembra incompleto. Chiedi al tuo trainer di inviartelo di nuovo.</p></div></div>';
    return;
  }
  document.title = `${p.t || 'Scheda'} · ${p.tr || 'Rakan'}`;
  const st = load(key);
  st.chk ||= {}; st.load ||= {}; st.done ||= {};
  const info = [['Obiettivo', p.g], ['Frequenza', p.f], ['Settimana', p.wk && p.wk.replace(/^Settimana /, '')]].filter(x => x[1]);
  const text = (t, v) => v ? `<section class="cl-text"><h3>${t}</h3><p>${nl(v)}</p></section>` : '';
  view.innerHTML = `<div class="cl-wrap" style="--cl-accent:${safeColor(p.a)}">
    <header class="cl-head">${p.tr || p.st ? `<div class="cl-who">${p.tr ? `<strong>${esc(p.tr)}</strong>` : ''}${p.st ? `<span>${esc(p.st)}</span>` : ''}</div>` : ''}
      <h1>${esc(p.t || 'Scheda')}</h1>${p.d ? `<div class="cl-date">${esc(fmtDate(p.d))}</div>` : ''}
      ${info.length ? `<dl class="cl-info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${nl(v)}</dd></div>`).join('')}</dl>` : ''}
      <button type="button" class="cl-btn cl-install" hidden>Installa sul telefono</button></header>
    ${text('Riscaldamento', p.w)}
    ${p.D.map((d, di) => dayHtml(d, di, st)).join('')}
    ${text('Defaticamento', p.k)}${p.n ? `<section class="cl-final">${nl(p.n)}</section>` : ''}
    <p class="cl-foot">I tuoi dati (serie e carichi) restano solo su questo telefono.</p></div>`;

  const inst = view.querySelector('.cl-install');
  const sync = () => { inst.hidden = !canPrompt(); }; sync(); onChange(sync);
  inst.onclick = promptInstall;

  view.onchange = e => {
    const t = e.target;
    if (t.dataset.chk) { const a = st.chk[t.dataset.chk] ||= []; a[+t.dataset.i] = t.checked; save(key, st); }
    else if (t.dataset.load !== undefined) { st.load[t.dataset.load] = t.value.trim(); save(key, st); }
  };
  view.onclick = e => {
    const f = e.target.closest('[data-finish]'), u = e.target.closest('[data-undo]'), pl = e.target.closest('[data-play]');
    if (f) { st.done[f.dataset.finish] = today(); save(key, st); redrawDay(+f.dataset.finish); }
    else if (u) { delete st.done[u.dataset.undo]; save(key, st); redrawDay(+u.dataset.undo); }
    else if (pl) playVideo(pl.dataset.play);
  };
  function redrawDay(di) { view.querySelector(`[data-day="${di}"] .cl-finish`).innerHTML = finishHtml(di, st); }
}

function playVideo(ref) {
  const [kind, val] = [ref.slice(0, 1), ref.slice(2)];
  const dlg = document.createElement('dialog');
  dlg.className = 'cl-vid';
  const url = kind === 'y' ? `https://www.youtube.com/watch?v=${val}` : safeUrl(val);
  dlg.innerHTML = `<div class="cl-vbar"><strong>Video</strong><button type="button" data-x aria-label="Chiudi">✕</button></div>
    ${kind === 'y' && ytId(url) ? `<div class="cl-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(val)}?rel=0&playsinline=1" title="Video esercizio" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
    ${url ? `<a class="cl-vlink" href="${esc(url)}" target="_blank" rel="noopener">Apri il video in una nuova scheda</a>` : ''}`;
  document.body.append(dlg);
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-x]')) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
