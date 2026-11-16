// Documento cliente (A4), stampa/PDF e testo WhatsApp (brief §7).
import * as store from './store.js';
import { labels, rxSummary } from './editor.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#0F766E';
const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (d || ''); };
const nl = s => esc(s).replace(/\n/g, '<br>');

// Raggruppa le righe in superserie (item.linked = unito al precedente).
export function groupItems(items) {
  const lab = labels(items), groups = [];
  items.forEach((it, i) => { const row = { it, lab: lab[i] }; if (i > 0 && it.linked) groups[groups.length - 1].push(row); else groups.push([row]); });
  return groups;
}

function itemHtml({ it, lab }, showLoad) {
  const url = safeUrl(it.video), name = esc(it.name || 'Esercizio');
  const rx = rxSummary(it);
  return `<div class="doc-it"><span class="doc-lab">${esc(lab)}</span>
    <div class="doc-body">${url ? `<a class="doc-name" href="${esc(url)}">${name}<span class="doc-play" aria-hidden="true"> ▶</span></a>` : `<span class="doc-name">${name}</span>`}
      ${rx ? `<span class="doc-pill">${esc(rx)}</span>` : ''}${it.note ? `<div class="doc-note">${nl(it.note)}</div>` : ''}</div>
    ${showLoad ? '<span class="doc-load" aria-label="Carico"></span>' : ''}</div>`;
}

function blockHtml(b, showLoad) {
  const head = [b.title || ({ circuito: 'Circuito', lista: 'Lista', serie: 'Serie' }[b.kind])];
  const meta = [];
  if (b.kind === 'circuito') { if (b.rounds) meta.push(`ripetere ${esc(b.rounds)} volte`); if (b.rest) meta.push(`recupero ${esc(b.rest)} a fine giro`); }
  const groups = groupItems(b.items || []);
  return `<section class="doc-block"><h3 class="doc-bh"><span>${esc(head[0])}</span>${meta.length ? `<small>${meta.join(' · ')}</small>` : ''}</h3>
    ${b.note ? `<div class="doc-note doc-bnote">${nl(b.note)}</div>` : ''}
    ${showLoad && groups.length ? '<div class="doc-cols"><span>Esercizio</span><span>Carico</span></div>' : ''}
    ${groups.map(g => `<div class="doc-grp ${g.length > 1 ? 'super' : ''}">${g.map(r => itemHtml(r, showLoad)).join('')}</div>`).join('')}</section>`;
}

export function buildDocHtml(plan, client, s) {
  const color = safeColor(s.accent), showLoad = s.showLoadColumn !== false;
  const trainer = s.trainerName || 'Personal trainer';
  const info = [['Obiettivo', plan.goal], ['Informazioni', plan.info], ['Frequenza', plan.frequency]].filter(x => x[1]);
  const text = (t, v) => v ? `<section class="doc-text"><h3>${t}</h3><p>${nl(v)}</p></section>` : '';
  return `<article class="doc" style="--doc-accent:${color}">
    <header class="doc-head">
      ${s.logoDataUrl?.startsWith('data:image/') ? `<img class="doc-logo" src="${esc(s.logoDataUrl)}" alt="">` : ''}
      <div class="doc-who"><strong>${esc(trainer)}</strong>${s.studio ? `<span>${esc(s.studio)}</span>` : ''}</div>
      <div class="doc-date">${esc(fmtDate(plan.date))}</div>
    </header>
    <h1 class="doc-title">${esc(plan.title || ('Programmazione ' + (client?.name || '')).trim())}</h1>
    ${info.length ? `<dl class="doc-info">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${nl(v)}</dd></div>`).join('')}</dl>` : ''}
    ${text('Riscaldamento', plan.warmup)}
    ${(plan.days || []).map(d => `<section class="doc-day"><h2 class="doc-dh">${esc(d.name)}</h2>${(d.blocks || []).map(b => blockHtml(b, showLoad)).join('')}</section>`).join('')}
    ${text('Defaticamento', plan.cooldown)}
    ${plan.finalNote ? `<section class="doc-final">${nl(plan.finalNote)}</section>` : ''}
    ${s.footerNote ? `<footer class="doc-foot">${nl(s.footerNote)}</footer>` : ''}
  </article>`;
}

// Testo WhatsApp: *grassetto*, URL del video dopo ogni esercizio.
export function buildWhatsApp(plan, client, s) {
  const L = [];
  L.push(`*${(plan.title || 'Programmazione ' + (client?.name || '')).trim()}*`);
  if (plan.date) L.push(fmtDate(plan.date));
  if (plan.goal) L.push(`*Obiettivo:* ${plan.goal}`);
  if (plan.info) L.push(`*Informazioni:* ${plan.info}`);
  if (plan.frequency) L.push(`*Frequenza:* ${plan.frequency}`);
  if (plan.warmup) L.push('', `*Riscaldamento*`, plan.warmup);
  for (const d of plan.days || []) {
    L.push('', `*${d.name.toUpperCase()}*`);
    for (const b of d.blocks || []) {
      const meta = b.kind === 'circuito' ? [b.rounds && `ripetere ${b.rounds} volte`, b.rest && `recupero ${b.rest}`].filter(Boolean).join(', ') : '';
      L.push('', `*${b.title || 'Blocco'}*${meta ? ` (${meta})` : ''}`);
      if (b.note) L.push(`_${b.note}_`);
      for (const g of groupItems(b.items || [])) {
        g.forEach(({ it, lab }, k) => {
          const rx = rxSummary(it);
          L.push(`${k === 0 ? '' : '+ '}${lab}. *${it.name || 'Esercizio'}*${rx ? ` – ${rx}` : ''}`);
          if (it.note) L.push(`_${it.note}_`);
          if (safeUrl(it.video)) L.push(it.video);
        });
      }
    }
  }
  if (plan.cooldown) L.push('', '*Defaticamento*', plan.cooldown);
  if (plan.finalNote) L.push('', plan.finalNote);
  if (s.trainerName) L.push('', `— ${s.trainerName}`);
  return L.join('\n');
}

async function ctx(plan) {
  const [s, client] = await Promise.all([store.getSettings(), plan.clientId ? store.get('clients', plan.clientId) : null]);
  return { s, client };
}

export async function renderPreview(el, plan) {
  const { s, client } = await ctx(plan);
  el.innerHTML = buildDocHtml(plan, client, s);
}

export async function printPlan(plan) {
  const { s, client } = await ctx(plan);
  let host = document.getElementById('doc-print');
  if (!host) { host = document.createElement('div'); host.id = 'doc-print'; document.body.append(host); }
  host.innerHTML = buildDocHtml(plan, client, s);
  const prev = document.title;
  document.title = (plan.title || 'Scheda').replace(/[\\/:*?"<>|]/g, '');
  const done = () => { document.title = prev; host.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

export async function copyWhatsApp(plan) {
  const { s, client } = await ctx(plan);
  const text = buildWhatsApp(plan, client, s);
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}

// Anteprima a schermo intero (mobile / <1200px).
export async function openPreview(plan) {
  const dlg = document.createElement('dialog');
  dlg.className = 'dlg doc-dlg';
  dlg.innerHTML = '<div class="doc-dlg-bar"><strong>Anteprima</strong><button class="btn" data-x>Chiudi</button></div><div class="doc-dlg-body"></div>';
  document.body.append(dlg);
  await renderPreview(dlg.querySelector('.doc-dlg-body'), plan);
  dlg.addEventListener('click', e => { if (e.target.closest('[data-x]')) dlg.close(); });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
