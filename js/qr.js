// Generatore di QR code (byte mode, correzione L, versioni 1–40), senza librerie. Codice proprio, licenza MIT.
const ECC = [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
const BLK = [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25];

const rawModules = v => {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
};
const gfMul = (a, b) => { let r = 0; for (let i = 7; i >= 0; i--) { r = (r << 1) ^ ((r >>> 7) * 0x11D); r ^= ((b >>> i) & 1) * a; } return r; };
function rsRemainder(data, deg) {
  const div = new Array(deg).fill(0); div[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { div[j] = gfMul(div[j], root); if (j + 1 < deg) div[j] ^= div[j + 1]; } root = gfMul(root, 2); }
  const res = new Array(deg).fill(0);
  for (const b of data) { const f = b ^ res.shift(); res.push(0); for (let i = 0; i < deg; i++) res[i] ^= gfMul(div[i], f); }
  return res;
}

// Ritorna la matrice di moduli (array di array di bool) oppure null se il testo non entra in una versione 40.
export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(String(text))];
  let ver = 0;
  for (let v = 1; v <= 40; v++) {
    const cap = Math.floor(rawModules(v) / 8) - ECC[v] * BLK[v];
    if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= cap * 8) { ver = v; break; }
  }
  if (!ver) return null;
  const size = ver * 4 + 17, dataCw = Math.floor(rawModules(ver) / 8) - ECC[ver] * BLK[ver];

  // Bit dei dati
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let p = 0xEC; bits.length < dataCw * 8; p ^= 0xEC ^ 0x11) put(p, 8);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // Blocchi + Reed-Solomon + interleave
  const nb = BLK[ver], ec = ECC[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
  const blocks = []; let k = 0;
  for (let i = 0; i < nb; i++) {
    const d = cw.slice(k, k + shortLen - ec + (i < nShort ? 0 : 1)); k += d.length;
    const e = rsRemainder(d, ec); if (i < nShort) d.push(0);   // segnaposto: allinea i blocchi corti
    blocks.push(d.concat(e));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ec || j >= nShort) all.push(b[i]); });

  // Matrice
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x, y, v) => { m[y][x] = v; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const nAl = ver === 1 ? 0 : Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (nAl * 2 - 2)) * 2;
  const pos = nAl ? [6] : [];
  for (let p = size - 7; pos.length < nAl; p -= step) pos.splice(1, 0, p);
  for (let a = 0; a < nAl; a++) for (let b = 0; b < nAl; b++) {
    if ((a === 0 && b === 0) || (a === 0 && b === nAl - 1) || (a === nAl - 1 && b === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(pos[a] + dx, pos[b] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = mask => {
    const data = (1 << 3) | mask; let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((data << 10) | rem) ^ 0x5412, bit = i => ((f >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(i));
    setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const v = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) { const c = ((v >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3); setFn(a, b, c); setFn(b, a, c); }
  }
  // Dati a zig-zag
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < all.length * 8) { m[y][x] = ((all[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
    }
  }
  // Maschera migliore
  const inv = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const apply = mask => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && inv[mask](x, y)) m[y][x] = !m[y][x]; };
  const penalty = () => {
    let p = 0;
    const line = get => {
      let run = 1;
      for (let i = 1; i < size; i++) { if (get(i) === get(i - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
      // modelli simili al finder 1:1:3:1:1
      for (let i = 0; i + 11 <= size; i++) {
        const s = []; for (let j = 0; j < 11; j++) s.push(get(i + j) ? 1 : 0);
        const t = s.join('');
        if (t === '10111010000' || t === '00001011101') p += 40;
      }
    };
    for (let y = 0; y < size; y++) line(i => m[y][i]);
    for (let x = 0; x < size; x++) line(i => m[i][x]);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    let dark = 0; for (const r of m) for (const c of r) if (c) dark++;
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  // Con versioni grandi si limita la ricerca a 4 maschere per restare veloci.
  const tries = ver > 20 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  for (const mask of tries) { drawFormat(mask); apply(mask); const p = penalty(); apply(mask); if (p < bestP) { bestP = p; best = mask; } }
  drawFormat(best); apply(best);
  return m;
}

const cache = new Map();
// SVG (nero su bianco, con zona di rispetto) o '' se il testo è troppo lungo. cls = classe CSS del <svg>.
export function qrSvg(text, cls = 'qr') {
  const key = cls + '|' + text;
  if (cache.has(key)) return cache.get(key);
  let out = '';
  try {
    const m = qrMatrix(text);
    if (m) {
      const q = 2, n = m.length + q * 2; let d = '';
      m.forEach((r, y) => { let x = 0; while (x < r.length) { if (!r[x]) { x++; continue; } let e = x; while (e < r.length && r[e]) e++; d += `M${x + q} ${y + q}h${e - x}v1h${-(e - x)}z`; x = e; } });
      out = `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 ${n} ${n}" role="img" aria-label="QR code" shape-rendering="crispEdges" data-n="${m.length}"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    }
  } catch { out = ''; }
  if (cache.size > 300) cache.clear();
  cache.set(key, out);
  return out;
}
