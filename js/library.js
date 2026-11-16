// Libreria esercizi: ricerca istantanea, filtri categoria, lista paginata, scheda esercizio, nuovo esercizio, import multiplo.
import * as store from './store.js';

export const CATEGORIES = ['Gambe e glutei', 'Core', 'Schiena', 'Petto', 'Spalle', 'Braccia', 'Total body', 'Cardio e metabolico', 'Mobilità', 'Respirazione'];
const PAGE = 40;

const KEYWORDS = {
  'Gambe e glutei': ['squat', 'affond', 'stacco', 'glute', 'gamb', 'leg', 'polpacc', 'calf', 'hip thrust', 'abduct', 'adduct', 'step', 'bulgar', 'lunge', 'quadricip', 'femoral'],
  'Core': ['plank', 'addome', 'crunch', 'core', 'russian', 'dead bug', 'bird dog', 'hollow', 'sit up', 'mountain', 'obliqu', 'pallof', 'ab '],
  'Schiena': ['rematore', 'row', 'lat ', 'pulldown', 'trazion', 'pull up', 'dorsal', 'schiena', 'lombar', 'iperestensioni', 'face pull'],
  'Petto': ['panca', 'chest', 'petto', 'push up', 'piegament', 'croci', 'fly', 'dip', 'pectoral', 'distensioni'],
  'Spalle': ['spall', 'shoulder', 'alzate', 'lento', 'military', 'arnold', 'deltoid', 'shrug'],
  'Braccia': ['curl', 'bicip', 'tricip', 'french', 'pushdown', 'braccia', 'hammer', 'estensioni'],
  'Total body': ['burpee', 'thruster', 'clean', 'snatch', 'total', 'swing', 'turkish', 'man maker'],
  'Cardio e metabolico': ['corsa', 'run', 'cyclette', 'vogatore', 'rower', 'jump', 'salto', 'corda', 'cardio', 'sprint', 'skip', 'ellittica', 'tapis', 'battle rope', 'assault'],
  'Mobilità': ['mobilit', 'stretch', 'cat cow', 'rotazion', 'foam', 'cerchi', 'allungament', 'world greatest', 'thoracic', 'yoga'],
  'Respirazione': ['respir', 'diaframm', 'breath', 'box breathing'],
};

// ---- Utilità pure (esportate per riuso/test) ----
export const normalize = store.normalize;
export const isUrl = s => /^https?:\/\/\S+$/i.test(String(s).trim());
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Categoria proposta: prima per parole chiave, poi per voto sulle parole dei nomi già in libreria.
export function suggestCategory(name, exercises = []) {
  const n = ' ' + normalize(name) + ' ';
  if (!n.trim()) return '';
  let best = '', bestLen = 0;
  for (const [cat, kws] of Object.entries(KEYWORDS)) for (const k of kws) {
    if (n.includes(k) && k.length > bestLen) { best = cat; bestLen = k.length; }
  }
  if (best) return best;
  const words = n.split(' ').filter(w => w.length > 3);
  const votes = {};
  for (const e of exercises) {
    const en = normalize(e.n);
    for (const w of words) if (en.includes(w)) votes[e.c] = (votes[e.c] || 0) + 1;
  }
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

// Righe 'NOME;link' o 'NOME<tab>link' (link opzionale). Ritorna [{name, video, error}].
export function parseImport(text) {
  return String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(.*?)(?:\t|;)\s*(\S*)\s*$/);
    const name = (m ? m[1] : line).trim().toUpperCase();
    const video = m ? m[2].trim() : '';
    let error = '';
    if (!name) error = 'Nome mancante';
    else if (video && !isUrl(video)) error = 'Link non valido';
    return { name, video: error ? '' : video, error };
  });
}

const cleanName = s => String(s).trim().replace(/\s+/g, ' ').toUpperCase();

// ---- Schermata ----
export async function renderLibrary(view) {
  let all = await store.list('exercises');
  const st = { q: '', cat: '', shown: PAGE };
  const sortAll = () => all.sort((a, b) => a.n.localeCompare(b.n, 'it'));
  sortAll();
  const reload = async () => { all = await store.list('exercises'); sortAll(); draw(); };

  view.innerHTML = `
    <h1 class="view-title">Libreria</h1>
    <p class="view-sub"><span id="lib-count"></span></p>
    <div class="lib-bar">
      <input id="lib-q" class="inp" type="search" placeholder="Cerca esercizio…" autocomplete="off" aria-label="Cerca esercizio">
      <button id="lib-new" class="btn btn-accent">+ Nuovo</button>
      <button id="lib-imp" class="btn">Importa</button>
    </div>
    <div id="lib-chips" class="chips" role="group" aria-label="Categoria"></div>
    <ul id="lib-list" class="lib-list"></ul>
    <button id="lib-more" class="btn lib-more" hidden>Mostra altri</button>
    <dialog id="lib-dlg" class="dlg"></dialog>`;
  const $ = id => view.querySelector('#' + id);
  const dlg = $('lib-dlg');

  const cats = () => {
    const extra = [...new Set(all.map(e => e.c))].filter(c => c && !CATEGORIES.includes(c));
    return [...CATEGORIES, ...extra];
  };

  function matches() {
    const q = normalize(st.q).split(' ').filter(Boolean);
    return all.filter(e => (!st.cat || e.c === st.cat) && q.every(w => (e._s || normalize(e.n + ' ' + e.c)).includes(w)));
  }

  function draw() {
    const counts = {}; all.forEach(e => counts[e.c] = (counts[e.c] || 0) + 1);
    $('lib-chips').innerHTML = [['', 'Tutte', all.length], ...cats().map(c => [c, c, counts[c] || 0])]
      .map(([v, l, n]) => `<button class="chip" data-cat="${esc(v)}" aria-pressed="${st.cat === v}">${esc(l)} <small>${n}</small></button>`).join('');
    const res = matches();
    $('lib-count').textContent = `${res.length} esercizi${res.length !== all.length ? ` su ${all.length}` : ''}`;
    $('lib-list').innerHTML = res.slice(0, st.shown).map(e => `
      <li><button class="lib-row" data-id="${esc(e.id)}">
        <span class="lib-name">${esc(e.n)}${e.custom ? ' <em class="tag">custom</em>' : ''}</span>
        <span class="lib-meta">${esc(e.c)} · ${e.v?.length ? e.v.length + ' video' : '<b>nessun video</b>'}</span>
      </button></li>`).join('') || '<li class="empty"><strong>Nessun risultato</strong>Prova altre parole o crea un nuovo esercizio.</li>';
    $('lib-more').hidden = res.length <= st.shown;
    $('lib-more').textContent = `Mostra altri (${res.length - st.shown})`;
  }

  let t;
  $('lib-q').oninput = e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; st.shown = PAGE; draw(); }, 60); };
  $('lib-chips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; st.cat = b.dataset.cat; st.shown = PAGE; draw(); };
  $('lib-more').onclick = () => { st.shown += PAGE; draw(); };
  $('lib-list').onclick = e => { const b = e.target.closest('.lib-row'); if (b) openDetail(all.find(x => x.id === b.dataset.id)); };
  $('lib-new').onclick = () => openDetail(null, st.q);
  $('lib-imp').onclick = openImport;

  const open = html => { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); };
  const close = () => dlg.open && dlg.close();
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });

  // Scheda esercizio / nuovo esercizio in un passaggio
  function openDetail(ex, preset = '') {
    const isNew = !ex;
    let videos = [...(ex?.v || [])];
    let catTouched = !isNew;
    open(`<form method="dialog" class="dlg-body" id="ex-form">
      <h2>${isNew ? 'Nuovo esercizio' : 'Esercizio'}</h2>
      <label>Nome<input name="n" class="inp" required autocomplete="off" value="${esc(ex?.n || preset.toUpperCase())}"></label>
      <label>Link video${isNew ? ' (incolla)' : ''}<input name="url" class="inp" type="url" inputmode="url" placeholder="https://…" autocomplete="off"></label>
      <ul id="vids" class="vids"></ul>
      <label>Categoria<select name="c" class="inp"></select></label>
      <p id="ex-msg" class="msg" role="status"></p>
      <div class="dlg-actions">
        ${!isNew && ex.custom ? '<button type="button" id="ex-del" class="btn btn-danger">Elimina</button>' : ''}
        <button type="button" class="btn" data-close>Annulla</button>
        <button class="btn btn-accent" value="ok">Salva</button>
      </div></form>`);
    const f = dlg.querySelector('#ex-form'), sel = f.c, msg = dlg.querySelector('#ex-msg');
    sel.innerHTML = cats().map(c => `<option>${esc(c)}</option>`).join('');
    sel.value = ex?.c || suggestCategory(f.n.value, all) || CATEGORIES[0];
    sel.onchange = () => catTouched = true;
    f.n.oninput = () => { if (!catTouched) { const s = suggestCategory(f.n.value, all); if (s) sel.value = s; } };
    const drawVids = () => dlg.querySelector('#vids').innerHTML = videos.map((u, i) =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener">▶ ${esc(u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42))}</a><button type="button" class="btn-x" data-rm="${i}" aria-label="Rimuovi video">✕</button></li>`).join('');
    drawVids();
    dlg.querySelector('#vids').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { videos.splice(+b.dataset.rm, 1); drawVids(); } };
    f.url.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } };
    const addUrl = () => {
      const u = f.url.value.trim(); if (!u) return true;
      if (!isUrl(u)) { msg.textContent = 'Il link deve iniziare con http:// o https://'; return false; }
      if (!videos.includes(u)) videos.push(u);
      f.url.value = ''; msg.textContent = ''; drawVids(); return true;
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const name = cleanName(f.n.value);
      if (!name) { msg.textContent = 'Inserisci il nome.'; return; }
      if (!addUrl()) return;
      if (all.some(x => x.id !== ex?.id && normalize(x.n) === normalize(name))) { msg.textContent = 'Esiste già un esercizio con questo nome.'; return; }
      const rec = isNew ? { id: 'c-' + store.uuid(), custom: true } : { ...ex };
      delete rec._s;
      await store.put('exercises', { ...rec, n: name, c: sel.value, v: videos });
      close(); reload();
    };
    const del = dlg.querySelector('#ex-del');
    if (del) del.onclick = async () => { if (confirm('Eliminare questo esercizio? Le schede già create non cambiano.')) { await store.remove('exercises', ex.id); close(); reload(); } };
    f.n.focus();
  }

  // Import multiplo con anteprima
  function openImport() {
    open(`<div class="dlg-body">
      <h2>Importa esercizi</h2>
      <p class="hint">Incolla una riga per esercizio: <code>NOME;link</code> oppure <code>NOME⇥link</code> (da Excel/Fogli). Il link è facoltativo.</p>
      <textarea id="imp-t" class="inp" rows="7" placeholder="STACCO RUMENO;https://youtu.be/…"></textarea>
      <div id="imp-prev" class="imp-prev"></div>
      <div class="dlg-actions">
        <button class="btn" data-close>Annulla</button>
        <button class="btn" id="imp-go">Anteprima</button>
        <button class="btn btn-accent" id="imp-ok" hidden>Conferma</button>
      </div></div>`);
    const ta = dlg.querySelector('#imp-t'), prev = dlg.querySelector('#imp-prev'), ok = dlg.querySelector('#imp-ok');
    let rows = [];
    const analyse = () => {
      const names = new Map(all.map(e => [normalize(e.n), e]));
      const seen = new Set();
      rows = parseImport(ta.value).map(r => {
        const k = normalize(r.name);
        if (!r.error && (names.has(k) || seen.has(k))) r.error = 'Già presente';
        seen.add(k);
        r.c = suggestCategory(r.name, all) || CATEGORIES[0];
        return r;
      });
      const good = rows.filter(r => !r.error);
      prev.innerHTML = rows.length ? `<table><tbody>${rows.map((r, i) => `<tr class="${r.error ? 'bad' : ''}">
        <td>${esc(r.name)}</td><td>${r.error ? esc(r.error) : `<select data-i="${i}" class="inp">${cats().map(c => `<option${c === r.c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>`}</td>
        <td>${r.video ? '▶' : '—'}</td></tr>`).join('')}</tbody></table>` : '';
      ok.hidden = !good.length;
      ok.textContent = `Importa ${good.length} esercizi`;
    };
    dlg.querySelector('#imp-go').onclick = analyse;
    prev.onchange = e => { const s = e.target.closest('select'); if (s) rows[+s.dataset.i].c = s.value; };
    ok.onclick = async () => {
      for (const r of rows.filter(r => !r.error))
        await store.put('exercises', { id: 'c-' + store.uuid(), n: r.name, c: r.c, v: r.video ? [r.video] : [], custom: true });
      close(); reload();
    };
  }

  draw();
}
