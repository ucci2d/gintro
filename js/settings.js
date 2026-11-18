// Impostazioni trainer (brief §4 Settings) + backup dati.
import * as store from './store.js';
import { exportBackupFile, importBackupFile } from './backup.js';
import { toast } from './ui.js';
import { canPrompt, onChange, promptInstall } from './install.js';
import { getCfg, saveCfg, searchesToday, DEFAULT_KEYWORD } from './ytsearch.js';

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
  let yt = await getCfg();
  const save = patch => { s = { ...s, ...patch }; return Promise.resolve(store.saveSettings(s)).then(r => { toast('Salvato'); return r; }); };
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
      <label class="set-chk"><input type="checkbox" id="set-qr" ${s.qrVideos ? 'checked' : ''}>QR code dei video nella stampa (un piccolo QR accanto a ogni esercizio, per chi stampa su carta)</label>
    </section>
    <section class="set-card"><h2>Ricerca video YouTube</h2>
      <label>Chiave API YouTube (resta solo su questo dispositivo, non finisce nei backup né nei link cliente)<input class="inp" id="yt-key" type="password" autocomplete="off" spellcheck="false" value="${esc(yt.key)}" placeholder="Incolla qui la chiave"></label>
      <label>Parola chiave aggiunta alla ricerca<input class="inp" id="yt-kw" autocomplete="off" value="${esc(yt.keyword)}" placeholder="${DEFAULT_KEYWORD}"></label>
      <p class="set-help">Ricerche fatte oggi: ${searchesToday(yt)} (limite gratuito: circa 100 al giorno).${yt.key ? ' <button type="button" class="btn" id="yt-rm">Rimuovi chiave</button>' : ''}</p>
      <details class="set-help"><summary>Come ottenere la chiave gratuita (3 passi)</summary><ol>
        <li>Vai su <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a>, crea un progetto e abilita «YouTube Data API v3».</li>
        <li>Credenziali → Crea credenziali → Chiave API.</li>
        <li>Limita la chiave: «Referrer HTTP» <code>https://ucci2d.github.io/*</code> e solo l'API «YouTube Data API v3». Incollala qui sopra.</li></ol></details>
      <p class="set-help">Senza chiave puoi sempre usare «Cerca su YouTube» (nuova scheda) e incollare il link.</p>
    </section>
    <section class="set-card"><h2>Installa Rakan sul telefono</h2>
      <p class="set-help"><strong>iPhone</strong> (Safari): tocca Condividi → «Aggiungi alla schermata Home».</p>
      <p class="set-help"><strong>Android</strong> (Chrome): tocca ⋮ → «Installa app» o «Aggiungi a schermata Home».</p>
      <div><button type="button" class="btn" id="set-install" hidden style="min-height:44px;padding:0 16px">Installa</button></div>
    </section>
    <section class="empty"><strong>Backup dati</strong>I dati restano su questo dispositivo. «Esporta» crea un file che puoi salvare su iCloud Drive / Google Drive o mandarti su WhatsApp; «Importa» lo <strong>unisce</strong> ai dati di questo dispositivo senza perdere nulla (in caso di conflitto vince la versione più recente).<br><br>
    <button id="bk-exp" class="btn" style="min-height:44px;padding:0 16px">Esporta backup</button>
    <label class="btn" style="display:inline-block;min-height:44px;line-height:44px;padding:0 16px;cursor:pointer">Importa backup<input id="bk-imp" type="file" accept="application/json,.json" hidden></label>
    <p id="bk-msg" role="status"></p></section>`;
    wire();
  };
  function wire() {
    view.querySelectorAll('[data-f]').forEach(el => { let t; el.oninput = () => { clearTimeout(t); t = setTimeout(() => save({ [el.dataset.f]: el.value.trim() }), 250); }; });
    view.querySelectorAll('.sw').forEach(b => b.onclick = async () => { await save({ accent: b.dataset.c }); draw(); });
    document.getElementById('set-color').onchange = async e => { await save({ accent: e.target.value }); draw(); };
    const ytSave = patch => { yt = { ...yt, ...patch }; saveCfg(patch); };
    let yt1; document.getElementById('yt-key').oninput = e => { clearTimeout(yt1); yt1 = setTimeout(() => { ytSave({ key: e.target.value.trim() }); toast('Salvato'); }, 300); };
    let yt2; document.getElementById('yt-kw').oninput = e => { clearTimeout(yt2); yt2 = setTimeout(() => { ytSave({ keyword: e.target.value.trim() }); toast('Salvato'); }, 300); };
    const ytrm = document.getElementById('yt-rm'); if (ytrm) ytrm.onclick = async () => { await saveCfg({ key: '' }); yt = await getCfg(); draw(); toast('Chiave rimossa'); };
    document.getElementById('set-load').onchange = e => save({ showLoadColumn: e.target.checked });
    document.getElementById('set-qr').onchange = e => save({ qrVideos: e.target.checked });
    document.getElementById('set-logo').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await save({ logoDataUrl: await resizeImage(f) }); draw(); } catch (err) { document.getElementById('bk-msg').textContent = 'Errore: ' + err.message; }
    };
    const rm = document.getElementById('set-logo-rm'); if (rm) rm.onclick = async () => { await save({ logoDataUrl: '' }); draw(); };
    const ib = document.getElementById('set-install');
    const sync = () => { ib.hidden = !canPrompt(); };
    sync(); ib.onclick = promptInstall;
    const off = onChange(() => { if (ib.isConnected) sync(); else off(); });
    const msg = document.getElementById('bk-msg');
    document.getElementById('bk-exp').onclick = async () => {
      try {
        const how = await exportBackupFile();
        if (how === 'cancelled') return;
        msg.textContent = how === 'shared' ? 'Backup condiviso.' : 'Backup scaricato: spostalo sull\'altro dispositivo (iCloud Drive, Google Drive, WhatsApp a te stesso…).'; toast('Backup pronto');
      } catch (err) { msg.textContent = 'Errore: ' + err.message; }
    };
    document.getElementById('bk-imp').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const t = await importBackupFile(f); msg.textContent = t; toast('Backup importato'); } catch (err) { msg.textContent = 'Errore: ' + err.message; }
    };
  }
  draw();
}
