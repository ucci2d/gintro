// Impostazioni trainer (brief §4 Settings) + backup dati.
import * as store from './store.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const SWATCHES = ['#0F766E', '#1D4ED8', '#7C3AED', '#BE123C', '#C2410C', '#14161A'];
const DEFAULT_ACCENT = '#0F766E';

// Ridimensiona l'immagine a max 600px sul lato lungo → dataURL (PNG se ha trasparenza possibile, altrimenti JPEG).
export function resizeImage(file, max = 600) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(img.width * k)), height: Math.max(1, Math.round(img.height * k)) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(/jpe?g/i.test(file.type) ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Immagine non valida')); };
    img.src = url;
  });
}

export async function renderSettings(view, title, sub) {
  let s = await store.getSettings();
  const save = patch => { s = { ...s, ...patch }; return store.saveSettings(s); };
  const draw = () => {
    view.innerHTML = `<h1 class="view-title">${title}</h1><p class="view-sub">${sub}</p>
    <section class="set-card"><h2>Trainer</h2>
      <label>Nome trainer<input class="inp" data-f="trainerName" value="${esc(s.trainerName)}" placeholder="Gianluca Capelli · Personal Trainer" autocomplete="off"></label>
      <label>Studio / sottotitolo<input class="inp" data-f="studio" value="${esc(s.studio)}" placeholder="Gianluca Capelli · Personal Trainer" autocomplete="off"></label>
      <div class="set-row">${s.logoDataUrl ? `<img class="set-logo" src="${esc(s.logoDataUrl)}" alt="Logo">` : ''}
        <label class="btn" style="display:inline-flex;align-items:center;cursor:pointer">${s.logoDataUrl ? 'Cambia logo' : 'Carica logo'}<input id="set-logo" type="file" accept="image/*" hidden></label>
        ${s.logoDataUrl ? '<button type="button" class="btn" id="set-logo-rm">Rimuovi logo</button>' : ''}</div>
    </section>
    <section class="set-card"><h2>Documento</h2>
      <div><span class="sh-lab">Colore accento</span>
        <div class="set-sw" style="margin-top:6px">${SWATCHES.map(c => `<button type="button" class="sw" data-c="${c}" style="background:${c}" aria-label="Colore ${c}" aria-pressed="${s.accent.toLowerCase() === c.toLowerCase()}"></button>`).join('')}
          <input type="color" class="set-color" id="set-color" value="${/^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : DEFAULT_ACCENT}" aria-label="Colore personalizzato"></div></div>
      <label>Nota a piè di pagina<textarea class="inp" data-f="footerNote" rows="2" placeholder="es. Per dubbi scrivimi su WhatsApp">${esc(s.footerNote)}</textarea></label>
      <label class="set-chk"><input type="checkbox" id="set-load" ${s.showLoadColumn !== false ? 'checked' : ''}>Mostra la colonna «Carico» da compilare a mano</label>
    </section>
    <section class="empty"><strong>Backup dati</strong>I dati restano su questo dispositivo: esporta un backup per sicurezza.<br><br>
    <button id="bk-exp" class="btn" style="min-height:44px;padding:0 16px">Esporta backup</button>
    <label class="btn" style="display:inline-block;min-height:44px;line-height:44px;padding:0 16px;cursor:pointer">Importa backup<input id="bk-imp" type="file" accept="application/json" hidden></label>
    <p id="bk-msg" role="status"></p></section>`;
    wire();
  };
  function wire() {
    view.querySelectorAll('[data-f]').forEach(el => { let t; el.oninput = () => { clearTimeout(t); t = setTimeout(() => save({ [el.dataset.f]: el.value.trim() }), 250); }; });
    view.querySelectorAll('.sw').forEach(b => b.onclick = async () => { await save({ accent: b.dataset.c }); draw(); });
    document.getElementById('set-color').onchange = async e => { await save({ accent: e.target.value }); draw(); };
    document.getElementById('set-load').onchange = e => save({ showLoadColumn: e.target.checked });
    document.getElementById('set-logo').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await save({ logoDataUrl: await resizeImage(f) }); draw(); } catch (err) { document.getElementById('bk-msg').textContent = 'Errore: ' + err.message; }
    };
    const rm = document.getElementById('set-logo-rm'); if (rm) rm.onclick = async () => { await save({ logoDataUrl: '' }); draw(); };
    const msg = document.getElementById('bk-msg');
    document.getElementById('bk-exp').onclick = async () => {
      const url = URL.createObjectURL(new Blob([await store.exportBackup()], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `rakan-backup-${new Date().toISOString().slice(0, 10)}.json` });
      a.click(); URL.revokeObjectURL(url); msg.textContent = 'Backup esportato.';
    };
    document.getElementById('bk-imp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!confirm('L\'importazione sostituisce tutti i dati attuali. Continuare?')) return;
      try { await store.importBackup(await f.text()); msg.textContent = 'Backup importato.'; } catch (err) { msg.textContent = 'Errore: ' + err.message; }
    };
  }
  draw();
}
