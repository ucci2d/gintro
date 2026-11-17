// Libreria che impara: dopo una correzione in scheda (nome, video, nota) propone «Aggiorna anche in libreria?».
import * as store from './store.js';

// Differenze tra l'esercizio com'era all'apertura (orig) e dopo la modifica (out), rispetto alla libreria (ex).
// Ritorna { auto: patch applicata sempre (video nuovo), ask: [{label, patch}] } — funzione pura.
export function libraryChanges(orig, out, ex, exercises = []) {
  if (!ex) return { auto: null, ask: [] };
  const ask = [], auto = {};
  const name = String(out.name || '').trim().toUpperCase();
  if (name && name !== orig.name && name !== ex.n && !exercises.some(e => e.id !== ex.id && store.normalize(e.n) === store.normalize(name)))
    ask.push({ label: `nome: ${ex.n} → ${name}`, patch: { n: name } });
  if (out.video && out.video !== orig.video) {
    const v = ex.v || [];
    if (!v.includes(out.video)) auto.v = [out.video, ...v];                         // video nuovo: resta legato all'esercizio
    else if (v[0] !== out.video) ask.push({ label: 'video predefinito', patch: { v: [out.video, ...v.filter(x => x !== out.video)] } });
  }
  const note = String(out.note || '').trim();
  if (note !== String(orig.note || '').trim() && note !== (ex.note || '')) ask.push({ label: 'nota tecnica', patch: { note } });
  return { auto: Object.keys(auto).length ? auto : null, ask };
}

// Applica: l'automatico sempre, il resto solo se Gianluca conferma. `confirmFn` per i test.
export async function learn(orig, out, ex, exercises, confirmFn = msg => confirm(msg)) {
  const { auto, ask } = libraryChanges(orig, out, ex, exercises);
  let patch = { ...(auto || {}) }, learned = !!auto;
  if (ask.length && confirmFn(`Aggiorna anche in libreria?\n\n${ask.map(a => '• ' + a.label).join('\n')}`)) {
    for (const a of ask) Object.assign(patch, a.patch);
    learned = true;
  }
  if (!learned) return null;
  const rec = { ...ex, ...patch }; delete rec._s;
  const saved = await store.put('exercises', rec);
  const i = exercises.findIndex(e => e.id === ex.id);
  if (i >= 0) exercises[i] = saved;
  return saved;
}
