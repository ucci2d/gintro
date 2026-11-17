// «Scrivi veloce»: testo libero (una riga per esercizio) → anteprima correggibile → esercizi del blocco.
import * as store from './store.js';
import { parseText, candidates, AUTO, norm } from './parse.js';
import { suggestCategory } from './library.js';
import { videoField } from './video.js';
import { toast } from './ui.js';
import { usageCounts } from './sheet.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PLACEHOLDER = `AFFONDI BULGARI 3x12 pg rec 1'30
PLANK 40"
HIP THRUST 4x10+12+15 stripping
PRESSA MONO 3x15 pg + STEP UP 3x10 pg
LAT MACHINE 3x12 20kg (spalle basse, petto in fuori)`;

// deps: { newItem, rxSummary, labels } passati dall'editor (evita import circolari).
// Ritorna una Promise con { items, meta } se confermato, altrimenti null.
export async function openQuick({ block, plan, deps }) {
  const [exercises, plans] = await Promise.all([store.list('exercises'), store.list('plans')]);
  const usage = usageCounts(plan ? [...plans.filter(p => p.id !== plan.id), plan] : plans);
  const choice = {};      // norm(nome) → exId | 'new'
  const vids = {};        // norm(nome) → url video (esercizi nuovi o senza video)
  let parsed = { rows: [], meta: {} }, resolved = [];

  const dlg = document.createElement('dialog');
  dlg.className = 'dlg quick';
  dlg.setAttribute('aria-label', 'Scrivi veloce');
  document.body.appendChild(dlg);
  dlg.innerHTML = `<div class="dlg-body"><div class="sh-head"><strong>Scrivi veloce</strong><button type="button" class="btn-x" data-a="close" aria-label="Chiudi">✕</button></div>
    <p class="hint">Una riga per esercizio. <b>+</b> unisce in superserie, <b>( )</b> è la nota tecnica, <b>pg</b> = per gamba. Anche «ripetere 3 volte, rec 1'30" a fine giro».</p>
    <textarea id="qk-t" class="inp" rows="7" placeholder="${esc(PLACEHOLDER)}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Esercizi, una riga ciascuno"></textarea>
    <ul class="qk-prev" aria-live="polite"></ul>
    <div class="dlg-actions"><button type="button" class="btn" data-a="close">Annulla</button><button type="button" class="btn btn-accent" data-a="ok" disabled>Aggiungi</button></div></div>`;
  const ta = dlg.querySelector('#qk-t'), prev = dlg.querySelector('.qk-prev'), ok = dlg.querySelector('[data-a="ok"]');

  function resolve() {
    parsed = parseText(ta.value);
    resolved = parsed.rows.map(r => {
      const k = norm(r.name), cands = candidates(r.name, exercises, usage);
      let ex = null;
      if (choice[k] === 'new') ex = null;
      else if (choice[k]) ex = exercises.find(e => e.id === choice[k]) || null;
      else if (cands[0] && cands[0].score >= AUTO) ex = cands[0].ex;
      return { ...r, k, cands, ex };
    });
  }

  function draw() {
    resolve();
    const lab = deps.labels(resolved);
    prev.innerHTML = resolved.map((r, i) => {
      const rx = deps.rxSummary(r);
      const opts = [...r.cands.map(c => `<option value="${esc(c.ex.id)}" ${r.ex?.id === c.ex.id ? 'selected' : ''}>${esc(c.ex.n)}</option>`)];
      if (r.ex && !r.cands.some(c => c.ex.id === r.ex.id)) opts.unshift(`<option value="${esc(r.ex.id)}" selected>${esc(r.ex.n)}</option>`);
      opts.push(`<option value="new" ${r.ex ? '' : 'selected'}>＋ Nuovo esercizio «${esc(r.name)}»</option>`);
      const needVid = !r.ex?.v?.[0];
      return `<li class="qk-row ${r.linked ? 'linked' : ''}" data-i="${i}"><span class="ed-lab">${lab[i]}</span><div class="qk-main">
        <div class="qk-name"><strong>${esc(r.ex ? r.ex.n : r.name)}</strong> ${r.ex ? (needVid ? '<em class="tag">senza video</em>' : '<span class="qk-ok" title="Video dalla libreria">▶</span>') : '<em class="tag">nuovo</em>'}</div>
        <div class="qk-rx">${esc(rx) || '<span class="hint">nessuna prescrizione: userò l\'ultima usata</span>'}${r.note ? ` <span class="qk-note">«${esc(r.note)}»</span>` : ''}</div>
        <select class="inp qk-sel" data-k="${esc(r.k)}" aria-label="Esercizio in libreria per ${esc(r.name)}">${opts.join('')}</select>
        ${needVid ? `<div class="qk-vf" data-k="${esc(r.k)}"></div>` : ''}</div></li>`;
    }).join('');
    prev.querySelectorAll('.qk-vf').forEach(h => {
      const k = h.dataset.k, row = resolved.find(r => r.k === k);
      const vf = videoField({ getName: () => row.ex?.n || row.name, onChange: u => { vids[k] = u; } });
      if (vids[k]) { vf.querySelector('input').value = vids[k]; vf.querySelector('input').dispatchEvent(new Event('input')); }
      h.append(vf);
    });
    const meta = parsed.meta;
    const metaTxt = [meta.rounds && `${meta.rounds} giri`, meta.rest && `rec ${meta.rest} a fine giro`].filter(Boolean).join(' · ');
    if (metaTxt) prev.insertAdjacentHTML('afterbegin', `<li class="qk-meta">Circuito: ${esc(metaTxt)}</li>`);
    ok.disabled = !resolved.length;
    ok.textContent = resolved.length ? `Aggiungi ${resolved.length} esercizi${resolved.length === 1 ? '' : ''}`.replace('1 esercizi', '1 esercizio') : 'Aggiungi';
  }

  async function commit() {
    const made = {};   // norm(nome) → esercizio creato in questa conferma
    const items = [];
    for (const r of resolved) {
      let ex = r.ex || made[r.k];
      const vid = vids[r.k] || '';
      if (!ex) {
        ex = await store.put('exercises', { id: 'c-' + store.uuid(), n: r.name, c: suggestCategory(r.name, exercises) || 'Total body', v: vid ? [vid] : [], custom: true });
        exercises.push(ex); made[r.k] = ex;
      } else if (vid && !ex.v?.includes(vid)) {
        ex = await store.put('exercises', { ...ex, v: [...(ex.v || []), vid] });
        const j = exercises.findIndex(e => e.id === ex.id); if (j >= 0) exercises[j] = ex;
      }
      const rx = { sets: r.sets, reps: r.reps, side: r.side, load: r.load, rest: r.rest, tech: r.tech, note: r.note };
      if (!r.sets && !r.reps) {   // nessuna prescrizione scritta: ultima usata per questo esercizio
        const last = await store.get('lastRx', ex.id);
        if (last) for (const k of Object.keys(rx)) if (!rx[k]) rx[k] = last[k] || '';
      }
      await store.put('lastRx', { id: ex.id, ...Object.fromEntries(['sets', 'reps', 'side', 'load', 'rest', 'tech', 'note'].map(k => [k, rx[k]])) });
      items.push(deps.newItem({ exId: ex.id, name: ex.n, video: vid || ex.v?.[0] || '', linked: r.linked, ...rx }));
    }
    if (items[0]) items[0].linked = false;
    return { items, meta: parsed.meta };
  }

  return new Promise(res => {
    let result = null;
    let t;
    ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 150); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !ok.disabled) ok.click(); });
    prev.addEventListener('change', e => { const s = e.target.closest('.qk-sel'); if (s) { choice[s.dataset.k] = s.value; draw(); } });
    dlg.addEventListener('click', async e => {
      if (e.target === dlg) return dlg.close();
      const b = e.target.closest('button[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return dlg.close();
      if (b.dataset.a === 'ok') { clearTimeout(t); draw(); result = await commit(); dlg.close(); }
    });
    dlg.addEventListener('close', () => { dlg.remove(); res(result); });
    dlg.showModal(); ta.focus();
  });
}
