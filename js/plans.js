// Home, elenco iscritti e flusso "Nuova scheda" (iscritto → parti da: ultima scheda / modello / vuota).
import * as store from './store.js';
import { newItem, newBlock, fmtDate } from './editor.js';
import { toast } from './ui.js';
import { progressStep, applyProgression, nextWeek, hasRules } from './progress.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

// ---- Modelli: [titolo blocco, tipo, {rounds, rest}, [[nome esercizio, prescrizione]...]] ----
const R = (sets, reps, extra = {}) => ({ sets, reps, ...extra });
export const TEMPLATES = [
  { id: 'forza-circuito', name: 'Forza + Circuito', desc: 'Mobilità, forza a serie, circuito finale', frequency: '3 allenamenti a settimana', days: [{ name: 'Giorno 1', blocks: [
    ['Mobilità + Core', 'lista', {}, [['CAT COW', R('', '10')], ['BIRD DOG', R('2', '10', { side: 'per lato' })], ['DEAD BUG', R('2', '10')]]],
    ['Allenamento forza', 'serie', {}, [['HIP THRUST', R('3', '12', { rest: "1'30\"" })], ['CHEST PRESS', R('3', '12', { rest: "1'30\"" })], ['LAT MACHINE', R('3', '12', { rest: "1'30\"" })], ['AFFONDI INDIETRO', R('3', '10', { side: 'per gamba', rest: "1'30\"" })]]],
    ['Circuito 1', 'circuito', { rounds: '3', rest: "1'30\"" }, [['PLANK', R('', '40"')], ['PUSH UP', R('', '10')], ['JUMP SQUAT', R('', '12')]]],
  ] }] },
  { id: 'circuito-tb', name: 'Circuito total body', desc: 'Due circuiti a giri, tutto il corpo', frequency: '3 allenamenti a settimana', days: [{ name: 'Giorno 1', blocks: [
    ['Circuito 1', 'circuito', { rounds: '3', rest: "1'30\"" }, [['GOBLET SQUAT', R('', '15')], ['PUSH UP', R('', '10')], ['REMATORE AL TRX', R('', '12')], ['GLUTE BRIDGE', R('', '15')]]],
    ['Circuito 2', 'circuito', { rounds: '3', rest: "1'30\"" }, [['THRUSTER', R('', '12')], ['MOUNTAIN CLIMBERS', R('', '30"')], ['SIDE PLANK', R('', '30"', { side: 'per lato' })]]],
  ] }] },
  { id: 'mobilita', name: 'Mobilità e stabilità', desc: 'Mobilità, stabilità del core, respirazione', frequency: '2 allenamenti a settimana', days: [{ name: 'Giorno 1', blocks: [
    ['Respirazione', 'lista', {}, [['RESPIRAZIONE DIAFRAMMATICA', R('', '1\'')]]],
    ['Mobilità', 'lista', {}, [['CAT COW', R('', '10')], ['THORACIC ROTATION', R('', '8', { side: 'per lato' })], ['PIGEON POSE', R('', '40"', { side: 'per lato' })], ['DEEP SQUAT', R('', '8')]]],
    ['Stabilità', 'serie', {}, [['BIRD DOG', R('2', '10', { side: 'per lato' })], ['SIDE PLANK', R('2', '30"', { side: 'per lato' })], ['GLUTE BRIDGE', R('2', '12')]]],
  ] }] },
  { id: 'casa', name: 'Corpo libero a casa', desc: 'Senza attrezzi, in circuito', frequency: '3 allenamenti a settimana', days: [{ name: 'Giorno 1', blocks: [
    ['Mobilità', 'lista', {}, [['CAT COW', R('', '10')], ['DEEP SQUAT', R('', '8')]]],
    ['Circuito 1', 'circuito', { rounds: '3', rest: "1'" }, [['SQUAT', R('', '15')], ['PUSH UP', R('', '10')], ['GLUTE BRIDGE', R('', '15')], ['PLANK', R('', '30"')]]],
    ['Addome', 'circuito', { rounds: '2', rest: '45"' }, [['DEAD BUG', R('', '30"')], ['BIRD DOG', R('', '30"')], ['SIDE PLANK', R('', '20"', { side: 'per lato' })]]],
  ] }] },
];

// Trova un esercizio in libreria: solo nome esatto; altrimenti riga libera senza exId.
export function resolveExercise(name, exs) {
  const q = store.normalize(name);
  const hit = exs.find(e => store.normalize(e.n) === q);
  return hit ? { exId: hit.id, name: hit.n, video: hit.v?.[0] || '' } : { exId: null, name: name.toUpperCase(), video: '' };
}

export async function buildFromTemplate(tpl) {
  const exs = await store.list('exercises');
  return tpl.days.map(d => ({ id: store.uuid(), name: d.name, blocks: d.blocks.map(([title, kind, o, items]) => ({
    ...newBlock(kind, title), ...o, items: items.map(([n, rx]) => newItem({ ...resolveExercise(n, exs), ...rx })),
  })) }));
}

// Copia profonda della scheda con nuovi id (e data di oggi).
export function cloneDays(days) {
  const c = structuredClone(days || []);
  for (const d of c) { d.id = store.uuid(); for (const b of d.blocks || []) { b.id = store.uuid(); for (const it of b.items || []) it.id = store.uuid(); } }
  return c;
}

export async function lastPlanOf(clientId) {
  const all = (await store.list('plans')).filter(p => p.clientId === clientId);
  return all.sort((a, b) => (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || ''))[0];
}

// ---- Modelli personali (in `settings`, id "templates": restano sul dispositivo e finiscono nel backup) ----
export async function personalTemplates() { return (await store.get('settings', 'templates'))?.list || []; }
const savePersonal = list => store.put('settings', { id: 'templates', list });

export async function saveAsTemplate(plan, name) {
  const list = await personalTemplates();
  const t = { id: 'p-' + store.uuid(), personal: true, name: name.trim(), frequency: plan.frequency || '', warmup: plan.warmup || '', cooldown: plan.cooldown || '', finalNote: plan.finalNote || '', days: cloneDays(plan.days) };
  const n = t.days.reduce((a, d) => a + (d.blocks || []).reduce((x, b) => x + (b.items || []).length, 0), 0);
  t.desc = `${n} ${n === 1 ? 'esercizio' : 'esercizi'} · ${t.days.length} ${t.days.length === 1 ? 'giorno' : 'giorni'}`;
  list.push(t); await savePersonal(list); return t;
}
export async function renameTemplate(id, name) { const l = await personalTemplates(); const t = l.find(x => x.id === id); if (t && name.trim()) { t.name = name.trim(); await savePersonal(l); } }
export async function deleteTemplate(id) { await savePersonal((await personalTemplates()).filter(x => x.id !== id)); }

export async function createPlan(client, from) {
  const base = { clientId: client.id, title: `Programmazione ${client.name}`, date: today(), goal: client.goal || '', info: client.info || '', frequency: '', warmup: '', cooldown: '', finalNote: '', weekN: '', weekOf: '', days: [] };
  if (from?.type === 'last') {
    const p = await store.get('plans', from.id);
    Object.assign(base, { goal: p.goal, info: p.info, frequency: p.frequency, warmup: p.warmup, cooldown: p.cooldown, finalNote: p.finalNote, weekN: p.weekN ? nextWeek(p) : '', weekOf: p.weekOf || '', days: cloneDays(p.days) });
    if (from.rules && hasRules(from.rules)) applyProgression(base.days, from.rules, from.scope);
  } else if (from?.type === 'tpl') {
    const t = TEMPLATES.find(x => x.id === from.id) || (await personalTemplates()).find(x => x.id === from.id);
    if (t.personal) Object.assign(base, { frequency: t.frequency, warmup: t.warmup, cooldown: t.cooldown, finalNote: t.finalNote, days: cloneDays(t.days) });
    else { base.frequency = t.frequency; base.days = await buildFromTemplate(t); }
  } else base.days = [{ id: store.uuid(), name: 'Giorno 1', blocks: [] }];
  return store.put('plans', base);
}

// ---- Dialog ----
function dialog(html) {
  const d = document.createElement('dialog'); d.className = 'dlg'; d.innerHTML = html;
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  document.body.append(d); d.showModal(); return d;
}

// Chiede un testo (nome modello): ritorna la stringa o null se annullato.
export function askText(title, value = '', ok = 'Salva') {
  return new Promise(res => {
    const d = dialog(`<form method="dialog" class="dlg-body"><h2 class="dlg-title">${esc(title)}</h2>
      <label>Nome<input class="inp" name="n" required maxlength="60" autocomplete="off" value="${esc(value)}"></label>
      <div class="dlg-actions"><button type="button" class="btn" data-close>Annulla</button><button class="btn btn-accent">${esc(ok)}</button></div></form>`);
    const f = d.querySelector('form'); f.n.focus(); f.n.select();
    let out = null;
    f.onsubmit = e => { e.preventDefault(); out = f.n.value.trim() || null; d.close(); };
    d.addEventListener('close', () => res(out));
  });
}

// «Salva come modello» da qualunque scheda.
export async function saveTemplateDialog(plan) {
  const name = await askText('Salva come modello', '', 'Salva modello');
  if (!name) return false;
  await saveAsTemplate(plan, name); toast('Modello salvato'); return true;
}

// «Duplica» una scheda qualsiasi (dall'editor) con progressione.
export async function duplicateDialog(plan) {
  const d = dialog('<div class="dlg-body" id="dp"></div>');
  const client = (plan.clientId && await store.get('clients', plan.clientId)) || { id: plan.clientId || '', name: '' };
  progressStep(d.querySelector('#dp'), plan, { title: plan.title || 'Scheda', onConfirm: async ({ rules, scope }) => {
    const p = await createPlan(client, { type: 'last', id: plan.id, rules, scope }); d.close(); toast('Duplicato'); location.hash = '#scheda-' + p.id;
  } });
}

// "+ Nuovo iscritto": solo il nome è obbligatorio.
export function newClientDialog(onDone, name = '') {
  const d = dialog(`<form method="dialog" class="dlg-body"><h2 class="dlg-title">Nuovo iscritto</h2>
    <label>Nome<input class="inp" name="name" required autocomplete="off" value="${esc(name)}"></label>
    <label>Obiettivo (facoltativo)<input class="inp" name="goal" autocomplete="off"></label>
    <div class="dlg-actions"><button type="button" class="btn" data-close>Annulla</button><button class="btn btn-accent">Aggiungi</button></div></form>`);
  const f = d.querySelector('form'); f.name.focus();
  f.onsubmit = async e => {
    e.preventDefault(); const n = f.name.value.trim(); if (!n) return;
    const c = await store.put('clients', { name: n, goal: f.goal.value.trim(), info: '' });
    d.close(); toast('Iscritto aggiunto'); onDone?.(c);
  };
}

// Flusso Nuova scheda: 1) iscritto, 2) parti da.
export async function newPlanDialog(clientId) {
  const d = dialog('<div class="dlg-body" id="np"></div>');
  const box = d.querySelector('#np');
  const go = async (client, from) => { const p = await createPlan(client, from); d.close(); location.hash = '#scheda-' + p.id; };

  async function stepClient(q = '') {
    const all = (await store.list('clients', q)).sort((a, b) => a.name.localeCompare(b.name, 'it'));
    box.innerHTML = `<h2 class="dlg-title">Nuova scheda · per chi?</h2>
      <input class="inp" id="np-q" placeholder="Cerca iscritto o scrivi un nome nuovo" value="${esc(q)}" autocomplete="off">
      <div class="np-list">${all.map(c => `<button class="btn np-row" data-c="${c.id}">${esc(c.name)}</button>`).join('')}
      ${q.trim() ? `<button class="btn btn-accent np-row" data-new>+ Crea «${esc(q.trim())}»</button>` : '<button class="btn np-row" data-new>+ Nuovo iscritto</button>'}</div>
      <div class="dlg-actions"><button class="btn" data-close>Annulla</button></div>`;
    const inp = box.querySelector('#np-q'); inp.focus(); inp.setSelectionRange(q.length, q.length);
    inp.oninput = () => stepClient(inp.value);
    box.onclick = async e => {
      const r = e.target.closest('[data-c]'), n = e.target.closest('[data-new]');
      if (r) stepFrom(all.find(c => c.id === r.dataset.c));
      else if (n) {
        if (q.trim()) stepFrom(await store.put('clients', { name: q.trim(), goal: '', info: '' }));
        else newClientDialog(c => { d.close(); newPlanDialog(c.id); });
      }
    };
  }

  async function stepFrom(client) {
    const [last, mine] = await Promise.all([lastPlanOf(client.id), personalTemplates()]);
    box.innerHTML = `<h2 class="dlg-title">${esc(client.name)} · parti da</h2><div class="np-list">
      ${last ? `<button class="btn np-row np-main" data-last>Ultima scheda <small>${esc(last.title)} · ${fmtDate(last.date)} — duplica con data di oggi, anche con progressione</small></button>` : ''}
      ${TEMPLATES.map(t => `<button class="btn np-row" data-t="${t.id}">Modello: ${esc(t.name)} <small>${esc(t.desc)}</small></button>`).join('')}
      ${mine.map(t => `<div class="np-tpl"><button class="btn np-row" data-t="${esc(t.id)}">Mio modello: ${esc(t.name)} <small>${esc(t.desc)}</small></button><button class="btn-x" data-ren="${esc(t.id)}" aria-label="Rinomina modello ${esc(t.name)}">✎</button><button class="btn-x" data-del="${esc(t.id)}" aria-label="Elimina modello ${esc(t.name)}">🗑</button></div>`).join('')}
      <button class="btn np-row" data-empty>Scheda vuota</button></div>
      <div class="dlg-actions"><button class="btn" data-back>‹ Cambia iscritto</button></div>`;
    box.onclick = async e => {
      if (e.target.closest('[data-back]')) return stepClient();
      if (e.target.closest('[data-last]')) return progressStep(box, last, { title: last.title, onBack: () => stepFrom(client), onConfirm: ({ rules, scope }) => go(client, { type: 'last', id: last.id, rules, scope }) });
      const t = e.target.closest('[data-t]');
      if (t) return go(client, { type: 'tpl', id: t.dataset.t });
      const r = e.target.closest('[data-ren]'), x = e.target.closest('[data-del]');
      if (r) {
        const cur = mine.find(m => m.id === r.dataset.ren);
        const n = await askText('Rinomina modello', cur?.name, 'Rinomina');
        if (n) { await renameTemplate(r.dataset.ren, n); toast('Modello rinominato'); }
        return stepFrom(client);
      }
      if (x) {
        const cur = mine.find(m => m.id === x.dataset.del);
        if (confirm(`Eliminare il modello «${cur?.name}»? Le schede già create non cambiano.`)) { await deleteTemplate(x.dataset.del); toast('Modello eliminato'); stepFrom(client); }
        return;
      }
      if (e.target.closest('[data-empty]')) return go(client, { type: 'empty' });
    };
  }

  if (clientId) stepFrom(await store.get('clients', clientId)); else stepClient();
}

// ---- Viste ----
const planCard = (p, name) => `<a class="pl-card" href="#scheda-${p.id}"><strong>${esc(p.title || 'Scheda')}</strong><span>${esc(name || '')} · ${fmtDate(p.date)}</span></a>`;

export async function renderHome(view) {
  const [plans, clients] = await Promise.all([store.list('plans'), store.list('clients')]);
  const names = Object.fromEntries(clients.map(c => [c.id, c.name]));
  const sorted = plans.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const many = sorted.length > 10;
  let q = '';
  const listHtml = () => {
    const nq = store.normalize(q);
    const rows = many ? (nq ? sorted.filter(p => store.normalize(`${p.title} ${names[p.clientId] || ''}`).includes(nq)) : sorted.slice(0, 10)) : sorted;
    return rows.length ? `<div class="pl-list">${rows.map(p => planCard(p, names[p.clientId])).join('')}</div>` : '<div class="empty"><strong>Nessun risultato</strong>Prova con un altro nome.</div>';
  };
  view.innerHTML = `<h1 class="view-title">Schede</h1><p class="view-sub">Le tue schede di allenamento</p>
    <button class="btn btn-accent home-new" data-act="new-plan">+ Nuova scheda</button>
    <div class="home-row"><button class="btn" data-act="new-client">+ Nuovo iscritto</button><a class="btn" href="#iscritti">Iscritti</a></div>
    <h2 class="sec-title">Schede recenti</h2>
    ${many ? '<input class="inp home-q" id="home-q" type="search" placeholder="Cerca scheda o iscritto" autocomplete="off" aria-label="Cerca scheda o iscritto">' : ''}
    <div id="home-list">${sorted.length ? listHtml() : `<div class="empty"><strong>Nessuna scheda ancora</strong>${clients.length ? 'Scegli un iscritto e parti dall\'ultima scheda o da un modello.' : 'Aggiungi il primo iscritto, poi crea la sua scheda.'}<br><button class="btn btn-accent" style="margin-top:14px" data-act="${clients.length ? 'new-plan' : 'new-client'}">${clients.length ? '+ Nuova scheda' : '+ Nuovo iscritto'}</button></div>`}</div>`;
  const inp = view.querySelector('#home-q');
  if (inp) inp.oninput = () => { q = inp.value; view.querySelector('#home-list').innerHTML = listHtml(); };
  view.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'new-plan') newPlanDialog();
    if (a.dataset.act === 'new-client') newClientDialog(() => renderHome(view));
  };
}

export async function renderClients(view) {
  let q = '';
  async function draw() {
    const [clients, plans] = await Promise.all([store.list('clients', q), store.list('plans')]);
    clients.sort((a, b) => a.name.localeCompare(b.name, 'it'));
    const keep = view.querySelector('#cl-q') === document.activeElement;
    view.innerHTML = `<h1 class="view-title">Iscritti</h1><p class="view-sub">I tuoi clienti e il loro storico schede</p>
      <div class="home-row"><input class="inp" id="cl-q" type="search" placeholder="Cerca iscritto" value="${esc(q)}" autocomplete="off"><button class="btn btn-accent" data-act="new-client">+ Nuovo iscritto</button></div>
      ${clients.length ? clients.map(c => {
        const mine = plans.filter(p => p.clientId === c.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return `<details class="cl-item"><summary><strong>${esc(c.name)}</strong><small>${mine.length} ${mine.length === 1 ? 'scheda' : 'schede'}</small></summary>
          <div class="cl-body">${c.goal ? `<p class="view-sub">${esc(c.goal)}</p>` : ''}
          <div class="pl-list">${mine.map(p => planCard(p)).join('') || '<p class="view-sub">Nessuna scheda.</p>'}</div>
          <button class="btn btn-accent" data-act="new-plan" data-c="${c.id}">+ Nuova scheda per ${esc(c.name)}</button></div></details>`;
      }).join('') : `<div class="empty"><strong>${q ? 'Nessun risultato' : 'Nessun iscritto ancora'}</strong>${q ? '' : 'Aggiungi il primo iscritto: poi potrai creargli la scheda.<br><button class="btn btn-accent" style="margin-top:14px" data-act="new-client">+ Nuovo iscritto</button>'}</div>`}`;
    const inp = view.querySelector('#cl-q');
    inp.oninput = () => { q = inp.value; draw(); };
    if (keep) { inp.focus(); inp.setSelectionRange(q.length, q.length); }
  }
  view.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'new-plan') newPlanDialog(a.dataset.c);
    if (a.dataset.act === 'new-client') newClientDialog(() => draw());
  };
  await draw();
}
