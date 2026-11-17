// Link cliente senza server: la scheda (solo campi per il cliente) è compressa e messa nel frammento # dell'URL.
import * as store from './store.js';
import { rxSummary, weekLabel } from './editor.js';
import { toast } from './ui.js';

export const BASE_URL = 'https://ucci2d.github.io/gintro/';
export const MAX_LEN = 6000;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function pipe(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
export const encode = async obj => b64(await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream('deflate-raw')));
export const decode = async t => JSON.parse(new TextDecoder().decode(await pipe(unb64(t), new DecompressionStream('deflate-raw'))));

// Id YouTube (se riconosciuto) per accorciare il payload e fare l'embed.
export function ytId(u) {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(u || '');
  return m ? m[1] : '';
}

// Solo i campi utili al cliente: niente `info` (anamnesi), id, clientId.
export function buildPayload(plan, client, s) {
  const o = { v: 1, t: plan.title || ('Programmazione ' + (client?.name || '')).trim(), d: plan.date || '' };
  const put = (k, v) => { if (v) o[k] = v; };
  put('g', plan.goal); put('f', plan.frequency); put('wk', weekLabel(plan)); put('w', plan.warmup); put('k', plan.cooldown); put('n', plan.finalNote);
  put('tr', s.trainerName); put('st', s.studio); put('a', s.accent);
  o.D = (plan.days || []).map(d => ({
    n: d.name,
    B: (d.blocks || []).map(b => {
      const x = { t: b.title || '' };
      if (b.kind === 'circuito') { put2(x, 'r', b.rounds); put2(x, 'c', b.rest); }
      put2(x, 'o', b.note);
      x.I = (b.items || []).map((it, i) => {
        const y = { n: it.name || 'Esercizio' };
        const id = ytId(it.video);
        if (id) y.y = id; else if (/^https?:\/\//i.test(it.video || '')) y.u = it.video;
        if (it.linked && i > 0) y.l = 1;
        put2(y, 'p', rxSummary(it));
        const sets = parseInt(it.sets, 10); if (sets > 0) y.s = Math.min(sets, 12);
        put2(y, 'o', it.note);
        return y;
      });
      return x;
    }),
  }));
  return o;
}
function put2(o, k, v) { if (v) o[k] = v; }

export async function buildLink(plan) {
  const [s, client] = await Promise.all([store.getSettings(), plan.clientId ? store.get('clients', plan.clientId) : null]);
  return BASE_URL + '#c=' + await encode(buildPayload(plan, client, s));
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}

export async function openShare(plan, onPdf) {
  const link = await buildLink(plan), long = link.length > MAX_LEN;
  const msg = `Ciao! Ecco la tua scheda di allenamento: ${link}`;
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.innerHTML = `<div class="dlg-body"><h2 class="dlg-title">Invia al cliente</h2>
    <p class="set-help">Il cliente apre il link e vede la scheda sul telefono, con i video. I dati stanno solo nel link: non passano da nessun server.</p>
    ${long ? `<p class="share-warn" role="alert">Il link è molto lungo (${link.length} caratteri): alcune app potrebbero tagliarlo. Per questa scheda conviene inviare il PDF.</p>` : ''}
    <input class="share-link" readonly aria-label="Link cliente" value="${esc(link)}">
    <div class="dlg-actions">
      ${long ? '<button class="btn btn-accent" data-a="pdf">Stampa / PDF</button>' : ''}
      ${navigator.share ? `<button class="btn ${long ? '' : 'btn-accent'}" data-a="share">Condividi</button>` : ''}
      <button class="btn ${long || navigator.share ? '' : 'btn-accent'}" data-a="copy">Copia link</button>
      <a class="btn share-wa" data-a="wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">WhatsApp</a>
      <button class="btn" data-a="x">Chiudi</button>
    </div></div>`;
  document.body.append(dlg);
  dlg.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') dlg.close();
    else if (a === 'pdf') { dlg.close(); onPdf?.(); }
    else if (a === 'copy') toast(await copy(link) ? 'Link copiato' : 'Copia non riuscita');
    else if (a === 'share') { try { await navigator.share({ title: plan.title || 'Scheda', text: 'Ecco la tua scheda di allenamento', url: link }); } catch { /* annullato */ } }
  });
  dlg.querySelector('.share-link').addEventListener('focus', e => e.target.select());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
