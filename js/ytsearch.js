// Ricerca video YouTube dentro l'app (YouTube Data API v3 dal browser, senza server). La chiave sta solo in `meta.yt` (locale, mai nei backup né nei link cliente).
import * as store from './store.js';
import { searchUrl, playVideo } from './video.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const API = 'https://www.googleapis.com/youtube/v3/';
export const DEFAULT_KEYWORD = 'esercizio tutorial';
const day = () => new Date().toISOString().slice(0, 10);

export const getCfg = async () => ({ key: '', keyword: DEFAULT_KEYWORD, ...(await store.getMeta('yt')) });
export const saveCfg = patch => getCfg().then(c => store.setMeta('yt', { ...c, ...patch }));
export const searchesToday = c => (c.day === day() ? c.count || 0 : 0);
async function bump() { const c = await getCfg(); return saveCfg({ day: day(), count: searchesToday(c) + 1 }); }

// PT1M5S → «1:05»
export function fmtDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); if (!m) return '';
  const h = +m[1] || 0, mi = +m[2] || 0, s = +m[3] || 0;
  return h ? `${h}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${mi}:${String(s).padStart(2, '0')}`;
}
// Messaggio chiaro per errore API/rete.
export function errorMessage(err) {
  const r = err?.reason || '';
  if (r === 'noKey') return 'Per cercare qui serve la chiave gratuita di YouTube: la inserisci in Impostazioni → «Ricerca video YouTube».';
  if (/quota|dailyLimit|rateLimit/i.test(r)) return 'Quota giornaliera di YouTube esaurita: riprova domani.';
  if (/keyInvalid|forbidden|accessNotConfigured|ipRefererBlocked|referer/i.test(r) || err?.status === 400 || err?.status === 403) return 'La chiave YouTube non è valida o non è abilitata per questo sito: controlla Impostazioni → «Ricerca video YouTube».';
  return 'Ricerca non riuscita (connessione assente?).';
}

const cache = new Map();   // ricerche della sessione: stessa ricerca = nessuna quota
async function call(path, params) {
  let res;
  try { res = await fetch(API + path + '?' + new URLSearchParams(params)); } catch { throw { reason: 'network' }; }
  if (!res.ok) { let reason = ''; try { reason = (await res.json()).error?.errors?.[0]?.reason || ''; } catch {} throw { reason, status: res.status }; }
  return res.json();
}
// → { items:[{id,title,channel,thumb,dur}], next }
export async function searchVideos({ q, short = true, pageToken = '' }) {
  const cfg = await getCfg();
  if (!cfg.key) throw { reason: 'noKey' };
  const ck = [q, short, pageToken].join('|');
  if (cache.has(ck)) return { ...cache.get(ck), cached: true };
  const p = { part: 'snippet', type: 'video', maxResults: 12, q, key: cfg.key, safeSearch: 'moderate' };
  if (short) p.videoDuration = 'short';
  if (pageToken) p.pageToken = pageToken;
  const r = await call('search', p); await bump();
  const ids = (r.items || []).map(i => i.id?.videoId).filter(Boolean);
  let dur = {};
  if (ids.length) { try { const v = await call('videos', { part: 'contentDetails', id: ids.join(','), key: cfg.key }); dur = Object.fromEntries((v.items || []).map(i => [i.id, fmtDuration(i.contentDetails?.duration)])); } catch { /* durata facoltativa */ } }
  const out = { items: (r.items || []).filter(i => i.id?.videoId).map(i => ({ id: i.id.videoId, title: i.snippet?.title || '', channel: i.snippet?.channelTitle || '', thumb: i.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`, dur: dur[i.id.videoId] || '' })), next: r.nextPageToken || '' };
  cache.set(ck, out); return out;
}
export const _clearCache = () => cache.clear();

// Pannello di ricerca: opts { name, onPick(url) }.
export async function openYtSearch({ name = '', onPick }) {
  const cfg = await getCfg();
  const dlg = document.createElement('dialog'); dlg.className = 'dlg yts';
  dlg.innerHTML = `<div class="yts-body"><div class="sh-head"><strong>Cerca video</strong><button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
    <form class="yts-form"><input class="inp" name="q" value="${esc([name, cfg.keyword].filter(Boolean).join(' '))}" aria-label="Cerca su YouTube" autocomplete="off"><button class="btn btn-accent">Cerca</button></form>
    <label class="set-chk"><input type="checkbox" name="short" checked>Solo brevi (&lt;4 min)</label>
    <p class="msg yts-msg" role="status"></p><div class="yts-grid"></div><button type="button" class="btn yts-more" hidden>Altri risultati</button>
    <div class="yts-fb"><a class="btn" href="${esc(searchUrl(name))}" target="_blank" rel="noopener">Cerca su YouTube in nuova scheda</a><small class="yts-count"></small></div></div>`;
  document.body.append(dlg);
  const f = dlg.querySelector('form'), grid = dlg.querySelector('.yts-grid'), msg = dlg.querySelector('.yts-msg'), more = dlg.querySelector('.yts-more');
  const shortEl = dlg.querySelector('[name=short]'), count = dlg.querySelector('.yts-count');
  const refresh = async () => { const c = await getCfg(); count.textContent = `Ricerche di oggi: ${searchesToday(c)} (circa 100 su 10.000 gratuite)`; };
  let next = '', last = '';
  async function run(token = '') {
    const q = f.q.value.trim(); if (!q) return;
    msg.textContent = 'Cerco…'; if (!token) { grid.innerHTML = ''; more.hidden = true; }
    try {
      const r = await searchVideos({ q, short: shortEl.checked, pageToken: token });
      next = r.next; last = q;
      grid.insertAdjacentHTML('beforeend', r.items.map(v => `<button type="button" class="yts-card" data-id="${esc(v.id)}" data-t="${esc(v.title)}"><span class="yts-th"><img src="${esc(v.thumb)}" alt="" loading="lazy" width="320" height="180">${v.dur ? `<em>${esc(v.dur)}</em>` : ''}</span><strong>${esc(v.title)}</strong><small>${esc(v.channel)}</small></button>`).join(''));
      msg.textContent = grid.children.length ? '' : 'Nessun video trovato: prova con altre parole.';
      more.hidden = !next;
    } catch (e) { msg.textContent = errorMessage(e); more.hidden = true; }
    refresh();
  }
  f.onsubmit = e => { e.preventDefault(); run(); };
  shortEl.onchange = () => run();
  more.onclick = () => run(next);
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-a=close]')) return dlg.close();
    const c = e.target.closest('.yts-card'); if (!c) return;
    const url = `https://youtu.be/${c.dataset.id}`;
    playVideo(url, c.dataset.t, { onUse: () => { dlg.close(); onPick?.(url); } });
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal(); refresh();
  if (cfg.key) run(); else msg.textContent = errorMessage({ reason: 'noKey' });
  return dlg;
}
