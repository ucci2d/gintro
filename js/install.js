// Installazione su telefono: evento beforeinstallprompt (Android/Chrome) e banner una tantum per iPhone/Safari.
const KEY = 'rakan-install-banner-dismissed';
let deferred = null;
const listeners = new Set();

// Stili propri di questo modulo (sezione Impostazioni + banner iOS).
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `.set-help{margin:0;color:var(--muted);font-size:.9rem;line-height:1.4}.ios-banner{position:fixed;left:12px;right:12px;bottom:calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom));z-index:90;display:flex;align-items:center;gap:10px;background:var(--surface-2);color:var(--text);border:1px solid var(--border);border-radius:14px;padding:10px 12px;font-size:.88rem;box-shadow:0 6px 24px rgba(0,0,0,.45)}.ios-banner span{flex:1}.ios-banner button{background:none;border:0;color:var(--muted);font-size:1.1rem;min-width:44px;min-height:44px;cursor:pointer}` }));

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; listeners.forEach(f => f()); });
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach(f => f()); });

export const canPrompt = () => !!deferred;
export const onChange = f => { listeners.add(f); return () => listeners.delete(f); };
export async function promptInstall() {
  if (!deferred) return;
  const p = deferred; deferred = null;
  try { await p.prompt(); await p.userChoice; } catch { /* ignora */ }
  listeners.forEach(f => f());
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = () => /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
const isStandalone = () => navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const dismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

export function showIosBanner() {
  if (!isIOS() || !isSafari() || isStandalone() || dismissed()) return;
  const b = document.createElement('div');
  b.className = 'ios-banner'; b.setAttribute('role', 'note');
  b.innerHTML = '<span>Per usare Rakan come app: tocca <strong>Condividi</strong> e poi <strong>Aggiungi alla schermata Home</strong>.</span><button type="button" aria-label="Chiudi">✕</button>';
  b.querySelector('button').onclick = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignora */ } b.remove(); };
  document.body.appendChild(b);
}

showIosBanner();
