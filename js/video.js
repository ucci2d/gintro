// Video facili: qualunque link YouTube → link pulito + miniatura; Incolla; Cerca su YouTube; più video per esercizio.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const YT_HOSTS = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/i;
// Id YouTube da qualunque forma di link (youtu.be, watch?v=, shorts/, embed/, live/, m.youtube.com, con o senza parametri).
export function ytId(url) {
  let u; try { u = new URL(String(url).trim()); } catch { return ''; }
  const id = x => (/^[\w-]{11}$/.test(x || '') ? x : '');
  if (/^(?:www\.)?youtu\.be$/i.test(u.hostname)) return id(u.pathname.split('/')[1]);
  if (YT_HOSTS.test(u.hostname)) {
    if (u.pathname === '/watch') return id(u.searchParams.get('v'));
    const m = /^\/(?:shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname);
    return m ? m[1] : '';
  }
  return '';
}
// Prende il primo link da un testo qualsiasi (anche «Titolo https://youtu.be/…» dalla condivisione) → { url, id, thumb } | null.
export function parseVideo(text) {
  const m = /https?:\/\/[^\s<>"']+/i.exec(String(text ?? ''));
  if (!m) return null;
  const raw = m[0].replace(/[).,;]+$/, '');
  const id = ytId(raw);
  if (id) return { url: `https://youtu.be/${id}`, id, thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` };
  try { new URL(raw); } catch { return null; }
  return { url: raw, id: '', thumb: '' };
}
export const searchUrl = name => `https://www.youtube.com/results?search_query=${encodeURIComponent(String(name || '').trim())}`;
export const thumbOf = url => parseVideo(url)?.thumb || '';

// Campo «aggiungi video»: input + miniatura immediata + Incolla + Cerca su YouTube.
// opts: { getName(): string, onChange(url|'') }. Il valore canonico è in el.dataset.url; l'input ha name="url".
export function videoField(opts = {}) {
  const el = document.createElement('div');
  el.className = 'vf';
  el.innerHTML = `<div class="vf-row"><input class="inp" name="url" type="text" inputmode="url" placeholder="Incolla il link YouTube" autocomplete="off" aria-label="Link video">
    <button type="button" class="btn" data-vf="paste">Incolla</button><button type="button" class="btn" data-vf="search">Cerca su YouTube</button></div>
    <div class="vf-prev" hidden></div><p class="msg vf-msg" role="status"></p>`;
  const inp = el.querySelector('input'), prev = el.querySelector('.vf-prev'), msg = el.querySelector('.vf-msg');
  const show = () => {
    const v = parseVideo(inp.value);
    el.dataset.url = v ? v.url : '';
    prev.hidden = !v;
    prev.innerHTML = v ? `${v.thumb ? `<img src="${esc(v.thumb)}" alt="" width="96" height="54" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(v.url)}</span>` : '';
    msg.textContent = inp.value.trim() && !v ? 'Non sembra un link: incolla l\'indirizzo del video.' : '';
    opts.onChange?.(v ? v.url : '');
  };
  inp.addEventListener('input', show);
  inp.addEventListener('paste', () => setTimeout(show, 0));
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-vf]'); if (!b) return;
    if (b.dataset.vf === 'search') { window.open(searchUrl(opts.getName?.() || inp.value), '_blank', 'noopener'); return; }
    let t = '';
    try { t = await navigator.clipboard.readText(); } catch { /* permesso negato o non disponibile */ }
    if (parseVideo(t)) { inp.value = t.trim(); show(); }
    else { msg.textContent = t ? 'Negli appunti non c\'è un link.' : 'Tieni premuto nel campo e scegli «Incolla».'; inp.focus(); }
  });
  el.clear = () => { inp.value = ''; show(); };
  el.setName = n => { opts.getName = () => n; };
  return el;
}
