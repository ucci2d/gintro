// Store dati: API asincrona get/list/put/remove su IndexedDB (fallback localStorage, poi memoria).
export const SCHEMA_VERSION = 1;
export const COLLECTIONS = ['clients', 'plans', 'exercises', 'settings', 'lastRx'];
const ALL = [...COLLECTIONS, 'meta'];
const DB_NAME = 'rakan', LS_PREFIX = 'rakan:';
const DEFAULT_SETTINGS = { id: 'main', trainerName: '', studio: '', accent: '#0F766E', logoDataUrl: '', footerNote: '', showLoadColumn: true };

export const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  }));

// minuscolo, senza accenti, spazi compattati
export const normalize = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Campo indice `_s` per ricerche veloci
const SEARCH_FIELDS = { clients: ['name', 'goal'], plans: ['title', 'goal'], exercises: ['n', 'c'] };
function indexed(coll, rec) {
  const f = SEARCH_FIELDS[coll];
  return f ? { ...rec, _s: normalize(f.map(k => rec[k]).join(' ')) } : rec;
}

const cache = {};          // coll -> Map(id -> record)
let backend = null;        // { load(coll), save(coll, rec), del(coll, id), clear(coll) }
let ready = null;

function idbBackend() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = () => ALL.forEach(c => { if (!req.result.objectStoreNames.contains(c)) req.result.createObjectStore(c, { keyPath: 'id' }); });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const run = (coll, mode, fn) => new Promise((res, rej) => {
        const tx = db.transaction(coll, mode); const r = fn(tx.objectStore(coll));
        tx.oncomplete = () => res(r && r.result); tx.onerror = tx.onabort = () => rej(tx.error);
      });
      resolve({
        load: c => run(c, 'readonly', s => s.getAll()),
        save: (c, rec) => run(c, 'readwrite', s => s.put(rec)),
        del: (c, id) => run(c, 'readwrite', s => s.delete(id)),
        clear: c => run(c, 'readwrite', s => s.clear()),
      });
    };
  });
}

function lsBackend() {
  const key = c => LS_PREFIX + c;
  const read = c => JSON.parse(localStorage.getItem(key(c)) || '[]');
  localStorage.setItem(LS_PREFIX + 'probe', '1'); localStorage.removeItem(LS_PREFIX + 'probe');
  return {
    load: async c => read(c),
    save: async (c, rec) => { const a = read(c).filter(r => r.id !== rec.id); a.push(rec); localStorage.setItem(key(c), JSON.stringify(a)); },
    del: async (c, id) => localStorage.setItem(key(c), JSON.stringify(read(c).filter(r => r.id !== id))),
    clear: async c => localStorage.removeItem(key(c)),
  };
}

const memBackend = () => ({ load: async () => [], save: async () => {}, del: async () => {}, clear: async () => {} });

function check(coll) { if (!cache[coll]) throw new Error('Collezione sconosciuta: ' + coll); }

export async function get(coll, id) { await init(); check(coll); const r = cache[coll].get(id); return r ? structuredClone(r) : undefined; }
export async function list(coll, filter) {
  await init(); check(coll);
  let a = [...cache[coll].values()];
  if (filter) {
    const q = normalize(filter).split(' ').filter(Boolean);
    a = a.filter(r => r._s != null && q.every(w => r._s.includes(w)));
  }
  return structuredClone(a);
}
export async function put(coll, rec) {
  await init();
  return putRaw(coll, rec);
}
async function putRaw(coll, rec) {
  check(coll);
  if (!rec.id) rec = { ...rec, id: uuid() };
  if (coll !== 'meta') rec = { ...rec, updatedAt: new Date().toISOString() };
  if (coll === 'clients' && !rec.createdAt) rec = { ...rec, createdAt: new Date().toISOString() };
  rec = indexed(coll, structuredClone(rec));
  cache[coll].set(rec.id, rec);
  await backend.save(coll, rec);
  return structuredClone(rec);
}
export async function remove(coll, id) {
  await init(); check(coll);
  cache[coll].delete(id);
  await backend.del(coll, id);
  if (coll === 'clients') for (const p of [...cache.plans.values()]) if (p.clientId === id) await remove('plans', p.id);
}

export async function getSettings() { return { ...DEFAULT_SETTINGS, ...(await get('settings', 'main')) }; }
export const saveSettings = s => put('settings', { ...s, id: 'main' });

// Migrazioni: applica i passi da `from` a SCHEMA_VERSION. Aggiungere un caso per ogni nuova versione.
export async function migrate(from) {
  let v = from;
  while (v < SCHEMA_VERSION) {
    // if (v === 1) { ...trasforma i record...; }
    v++;
  }
  await putRaw('meta', { id: 'schema', version: SCHEMA_VERSION });
}

export function init() {
  if (!ready) ready = (async () => {
    try { backend = await idbBackend(); } catch { try { backend = lsBackend(); } catch { backend = memBackend(); } }
    for (const c of ALL) cache[c] = new Map((await backend.load(c)).map(r => [r.id, r]));
    const ver = cache.meta.get('schema')?.version || 0;
    if (ver < SCHEMA_VERSION) await migrate(ver);
    if (!cache.meta.get('seeded')) await seedExercises();
    else if (!cache.meta.get('plank1')) await addBaseExercise({ id: 'e235', n: 'PLANK', c: 'Core', v: [] }, 'plank1');
    if (!cache.meta.get('demo')) await seedDemo();
  })();
  return ready;
}

async function seedExercises() {
  try {
    const data = await (await fetch('data/exercises.json')).json();
    for (const e of data) { const r = indexed('exercises', e); cache.exercises.set(r.id, r); await backend.save('exercises', r); }
    await putRaw('meta', { id: 'seeded', at: new Date().toISOString() });
  } catch { /* offline al primo avvio: riproverà al prossimo */ }
}

// Aggiunge una sola volta un esercizio base alle librerie già inizializzate (senza duplicare se esiste già per nome).
async function addBaseExercise(e, flag) {
  if (![...cache.exercises.values()].some(x => x.n?.trim().toUpperCase() === e.n)) { const r = indexed('exercises', e); cache.exercises.set(r.id, r); await backend.save('exercises', r); }
  await putRaw('meta', { id: flag, at: new Date().toISOString() });
}

async function seedDemo() {
  const find = n => [...cache.exercises.values()].find(e => e.n === n);
  const item = (n, o = {}) => { const e = find(n); return { id: uuid(), exId: e?.id ?? null, name: n, video: e?.v?.[0] ?? '', linked: false, sets: '', reps: '', side: '', load: '', rest: '', tech: '', note: '', ...o }; };
  const client = await putRaw('clients', { name: 'Cliente demo', goal: 'Incremento ipertrofia lower body, core stability', info: 'Nessun problema osteoarticolare evidente' });
  await putRaw('plans', {
    clientId: client.id, title: 'Programmazione Cliente demo', date: new Date().toISOString().slice(0, 10),
    goal: client.goal, info: client.info, frequency: '2 allenamenti a settimana',
    warmup: "10' cyclette o vogatore + mobilità", cooldown: 'Stretching e respirazione', finalNote: 'Cerca sempre di incrementare il carico, mantenendo un\'esecuzione corretta.',
    days: [
      { id: uuid(), name: 'Giorno 1', blocks: [{ id: uuid(), kind: 'serie', title: 'Allenamento forza', rounds: '', rest: '', note: '', items: [
        item('AFFONDI', { sets: '3', reps: '12', side: 'per gamba', rest: '1\'30"', note: 'Controlla le ginocchia, NON verso l\'interno' }),
        item('AFFONDI BULGARI', { sets: '3', reps: '10', side: 'per gamba', rest: '1\'30"', tech: 'eccentrica lenta' }),
      ] }] },
      { id: uuid(), name: 'Giorno 2', blocks: [{ id: uuid(), kind: 'circuito', title: 'Circuito 1', rounds: '3', rest: '1\'30"', note: '', items: [
        item('AFFONDI', { reps: '12', side: 'per gamba' }),
        item('AFFONDI BULGARI', { reps: '10', side: 'per gamba' }),
      ] }] },
    ],
  });
  await putRaw('meta', { id: 'demo', at: new Date().toISOString() });
}

// Backup JSON
export async function exportBackup() {
  await init();
  const data = {};
  for (const c of COLLECTIONS) data[c] = [...cache[c].values()];
  return JSON.stringify({ app: 'rakan', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }, null, 1);
}
export async function importBackup(text) {
  await init();
  let b; try { b = JSON.parse(text); } catch { throw new Error('File non valido'); }
  if (b?.app !== 'rakan' || !b.data) throw new Error('Non è un backup di Rakan');
  if (b.schemaVersion > SCHEMA_VERSION) throw new Error('Backup creato con una versione più recente');
  for (const c of COLLECTIONS) {
    if (!Array.isArray(b.data[c])) continue;
    await backend.clear(c); cache[c].clear();
    for (const r of b.data[c]) { const x = indexed(c, r); cache[c].set(x.id, x); await backend.save(c, x); }
  }
  await put('meta', { id: 'seeded', at: new Date().toISOString() });
  await put('meta', { id: 'demo', at: new Date().toISOString() });
  if (b.schemaVersion < SCHEMA_VERSION) await migrate(b.schemaVersion);
}

// Meta locali (non esportati): es. data dell'ultimo backup.
export async function getMeta(id) { await init(); return structuredClone(cache.meta.get(id)); }
export async function setMeta(id, patch) { await init(); return putRaw('meta', { ...cache.meta.get(id), ...patch, id }); }

const stamp = r => r?.updatedAt || r?.createdAt || '';

// Unione intelligente: per id, vince la versione con updatedAt più recente (a pari data resta la locale).
// Non cancella mai nulla. Restituisce, per collezione, quanti record sono stati aggiunti/aggiornati.
export async function mergeBackup(text) {
  await init();
  let b; try { b = JSON.parse(text); } catch { throw new Error('File non valido'); }
  if (b?.app !== 'rakan' || !b.data) throw new Error('Non è un backup di Rakan');
  if (b.schemaVersion > SCHEMA_VERSION) throw new Error('Backup creato con una versione più recente');
  const res = {};
  for (const c of COLLECTIONS) {
    res[c] = { added: 0, updated: 0 };
    if (!Array.isArray(b.data[c])) continue;
    for (const r of b.data[c]) {
      if (!r || !r.id) continue;
      const mine = cache[c].get(r.id);
      if (mine && !(stamp(r) > stamp(mine))) continue;
      const x = indexed(c, r);
      cache[c].set(x.id, x); await backend.save(c, x);
      res[c][mine ? 'updated' : 'added']++;
    }
  }
  return res;
}
