// Backup facile PC ↔ telefono: condividi/scarica il file, importa con unione, promemoria e statistiche.
import * as store from './store.js';
import { toast } from './ui.js';

const DAY = 864e5;
const NOMI = { clients: ['iscritto', 'iscritti'], plans: ['scheda', 'schede'], exercises: ['esercizio', 'esercizi'] };
const plural = (n, k) => `${n} ${NOMI[k][n === 1 ? 0 : 1]}`;

// Condivide il file .json (Web Share API); altrimenti download. Ritorna 'shared' | 'downloaded' | 'cancelled'.
export async function exportBackupFile() {
  const text = await store.exportBackup();
  const name = `rakan-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([text], name, { type: 'application/json' });
  let how = 'downloaded';
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Backup Rakan', text: 'Backup Rakan' }); how = 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; how = 'downloaded'; }
  }
  if (how === 'downloaded') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  await store.setMeta('lastBackup', { at: new Date().toISOString() });
  return how;
}

// Testo riassuntivo dell'unione, es. "Aggiunti: 2 schede, 1 iscritto · Aggiornati: 1 scheda".
export function summarizeMerge(res) {
  const part = f => ['clients', 'plans', 'exercises'].filter(k => res[k][f]).map(k => plural(res[k][f], k)).join(', ');
  const add = part('added'), upd = part('updated');
  if (!add && !upd) return 'Nessuna novità: hai già tutto.';
  return [add && `Aggiunti: ${add}`, upd && `Aggiornati: ${upd}`].join(' · ');
}

export async function importBackupFile(file) {
  const res = await store.mergeBackup(await file.text());
  return summarizeMerge(res);
}

// Giorni dall'ultimo backup (o dal primo uso se mai fatto); null se non ancora rilevante.
export async function backupAgeDays(now = Date.now()) {
  const last = (await store.getMeta('lastBackup'))?.at;
  const base = last || (await store.getMeta('demo'))?.at;
  if (!base) return null;
  return { days: Math.floor((now - new Date(base).getTime()) / DAY), never: !last };
}
export async function reminderHtml() {
  const a = await backupAgeDays();
  if (!a || a.days < 7) return '';
  const txt = a.never ? 'Non hai ancora fatto un backup.' : `Ultimo backup ${a.days} giorni fa.`;
  return `<div class="bk-remind" role="status"><span>${txt}</span><a class="btn" href="#impostazioni">Fai il backup</a></div>`;
}

// Statistiche: iscritti, schede del mese, top 5 esercizi più usati.
export function computeStats(plans, clients, now = new Date()) {
  const ym = now.toISOString().slice(0, 7);
  const month = plans.filter(p => (p.date || p.updatedAt || '').slice(0, 7) === ym).length;
  const count = new Map();
  for (const p of plans) for (const d of p.days || []) for (const b of d.blocks || []) for (const it of b.items || []) {
    const name = (it.name || '').trim(); if (!name) continue;
    const k = it.exId || store.normalize(name);
    const e = count.get(k) || { name, n: 0 }; e.n++; count.set(k, e);
  }
  const top = [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'it')).slice(0, 5);
  return { clients: clients.length, month, top };
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function statsHtml(st) {
  return `<section class="stats" aria-label="Statistiche"><div class="stat"><b>${st.clients}</b><span>${st.clients === 1 ? 'iscritto' : 'iscritti'}</span></div>
    <div class="stat"><b>${st.month}</b><span>${st.month === 1 ? 'scheda' : 'schede'} questo mese</span></div>
    ${st.top.length ? `<div class="stat stat-top"><span>Esercizi più usati</span><ol>${st.top.map(t => `<li><em>${esc(t.name)}</em><i>${t.n}×</i></li>`).join('')}</ol></div>` : ''}</section>`;
}
