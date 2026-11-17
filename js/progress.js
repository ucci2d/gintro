// «Duplica con progressione»: regole rapide (serie, ripetizioni, carico, recupero) con anteprima delle modifiche.
import { rxSummary } from './editor.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const NO_RULES = { sets: 0, reps: 0, load: '', rest: 0 };
export const hasRules = r => !!(r.sets || r.reps || r.load || r.rest);

// ---- Funzioni pure (esportate per test) ----
export function parseSecs(s) {
  const t = String(s ?? '').trim().replace(/[’′]/g, "'").replace(/[”″“]/g, '"');
  let m = /^(\d+)'\s*(?:(\d{1,2})"?)?$/.exec(t);
  if (m) return +m[1] * 60 + (+m[2] || 0);
  m = /^(\d+)"$/.exec(t);
  return m ? +m[1] : null;
}
export function fmtSecs(n) {
  const m = Math.floor(n / 60), s = n % 60;
  return !m ? `${s}"` : !s ? `${m}'` : `${m}'${String(s).padStart(2, '0')}"`;
}
const fmtNum = n => String(Math.round(n * 100) / 100).replace('.', ',');

// Carico solo se numerico ("20", "22,5 kg"); altrimenti null (si lascia com'è).
export function bumpLoad(load, mode) {
  const m = /^(\d+(?:[.,]\d+)?)(\s*kg)?$/i.exec(String(load ?? '').trim());
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  let out = mode === 'pct' ? Math.round(n * 1.05 * 2) / 2 : n + 2.5;
  if (mode === 'pct' && out <= n) out = n + 0.5;
  return fmtNum(out) + (m[2] || '');
}
// Recupero a tempo ("1'30\"", "45\"", "2'"): meno `by` secondi, minimo 15".
export function lessRest(rest, by) {
  const s = parseSecs(rest);
  if (s == null) return null;
  const out = Math.max(15, s - by);
  return out === s ? null : fmtSecs(out);
}

// Applica le regole ai giorni (modifica `days` sul posto). scope: 'all' oppure 'giorno.blocco'.
// Ritorna { changes: [{ where, name, before, after }], same } dove same = righe nel perimetro rimaste invariate.
export function applyProgression(days, rules, scope = 'all') {
  const changes = []; let same = 0;
  (days || []).forEach((d, di) => (d.blocks || []).forEach((b, bi) => {
    if (scope !== 'all' && scope !== `${di}.${bi}`) return;
    const where = `${d.name || 'Giorno'} · ${b.title || 'Blocco'}`;
    if (rules.rest && b.kind === 'circuito') {
      const r = lessRest(b.rest, rules.rest);
      if (r) { changes.push({ where, name: 'Recupero a fine giro', before: b.rest, after: r }); b.rest = r; }
    }
    for (const it of b.items || []) {
      const before = rxSummary(it);
      if (rules.sets && /^\d+$/.test(String(it.sets).trim())) it.sets = String(Math.min(+it.sets + rules.sets, 12));
      if (rules.reps && /^\d+$/.test(String(it.reps).trim())) it.reps = String(+it.reps + rules.reps);
      if (rules.load) { const l = bumpLoad(it.load, rules.load); if (l) it.load = l; }
      if (rules.rest) { const r = lessRest(it.rest, rules.rest); if (r) it.rest = r; }
      const after = rxSummary(it);
      if (after !== before) changes.push({ where, name: it.name || 'Esercizio', before, after }); else same++;
    }
  }));
  return { changes, same };
}

// Settimana: «Settimana 2 di 4». Vuoto se non impostata.
export const weekLabel = p => {
  const n = String(p?.weekN ?? '').trim(), o = String(p?.weekOf ?? '').trim();
  return n ? (o ? `Settimana ${n} di ${o}` : `Settimana ${n}`) : (o ? `Durata ${o} settimane` : '');
};
// Settimana della scheda duplicata: n+1; a fine ciclo ricomincia da 1.
export function nextWeek(p) {
  const n = parseInt(p?.weekN, 10), o = parseInt(p?.weekOf, 10);
  if (!(n > 0)) return String(p?.weekN ?? '');
  return String(o > 0 && n >= o ? 1 : n + 1);
}

// ---- UI: passo «Progressione» dentro un dialog ----
const CHIPS = [
  ['sets', 1, '+1 serie'], ['reps', 2, '+2 ripetizioni'], ['load', 'kg', '+2,5 kg'], ['load', 'pct', '+5% carico'], ['rest', 15, 'rec −15"'],
];

export function progressStep(box, plan, { title, onBack, onConfirm }) {
  const rules = { ...NO_RULES };
  let scope = 'all';
  const scopes = [['all', 'Tutta la scheda']];
  (plan.days || []).forEach((d, di) => (d.blocks || []).forEach((b, bi) => scopes.push([`${di}.${bi}`, `${d.name} · ${b.title || 'Blocco'}`])));

  const preview = () => {
    const wk = plan.weekN ? `<p class="pg-week">${esc(weekLabel(plan))} → <strong>${esc(weekLabel({ weekN: nextWeek(plan), weekOf: plan.weekOf }))}</strong></p>` : '';
    if (!hasRules(rules)) return `${wk}<p class="pg-empty">Nessuna progressione: la nuova scheda sarà una copia identica.</p>`;
    const { changes, same } = applyProgression(structuredClone(plan.days || []), rules, scope);
    if (!changes.length) return `${wk}<p class="pg-empty">Queste regole non cambiano nulla nel perimetro scelto (valori non numerici o a tempo restano com'è).</p>`;
    return `${wk}<p class="pg-sum"><strong>${changes.length}</strong> ${changes.length === 1 ? 'modifica' : 'modifiche'}${same ? ` · ${same} ${same === 1 ? 'riga resta' : 'righe restano'} invariat${same === 1 ? 'a' : 'e'}` : ''}</p>
      <ul class="pg-list">${changes.map(c => `<li><b>${esc(c.name)}</b><span class="pg-where">${esc(c.where)}</span><span class="pg-diff"><s>${esc(c.before || '—')}</s> → ${esc(c.after)}</span></li>`).join('')}</ul>`;
  };
  const draw = () => {
    box.innerHTML = `<h2 class="dlg-title">Duplica con progressione</h2>
      <p class="pg-sub">${esc(title)} · nuova scheda con la data di oggi</p>
      <div class="pg-chips" role="group" aria-label="Regole di progressione">${CHIPS.map(([k, v, l]) => `<button type="button" class="chip" data-k="${k}" data-v="${v}" aria-pressed="${rules[k] === v}">${l}</button>`).join('')}
        <button type="button" class="chip" data-none aria-pressed="${!hasRules(rules)}">Nessuna</button></div>
      <label>Applica a<select class="inp" id="pg-scope">${scopes.map(([v, l]) => `<option value="${v}" ${v === scope ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <div class="pg-prev" aria-live="polite">${preview()}</div>
      <div class="dlg-actions">${onBack ? '<button type="button" class="btn" data-back>‹ Indietro</button>' : '<button type="button" class="btn" data-close>Annulla</button>'}<button type="button" class="btn btn-accent" data-ok>Duplica</button></div>`;
  };
  box.onclick = e => {
    if (e.target.closest('[data-back]')) return onBack();
    if (e.target.closest('[data-ok]')) return onConfirm({ rules: { ...rules }, scope });
    if (e.target.closest('[data-none]')) { Object.assign(rules, NO_RULES); return draw(); }
    const c = e.target.closest('[data-k]');
    if (c) { const k = c.dataset.k, v = k === 'load' ? c.dataset.v : +c.dataset.v; rules[k] = rules[k] === v ? NO_RULES[k] : v; draw(); }
  };
  box.onchange = e => { if (e.target.id === 'pg-scope') { scope = e.target.value; draw(); box.querySelector('#pg-scope').focus(); } };
  draw();
}
