// Feedback rapido: toast discreti ("Aggiunto", "Copiato", "Salvato").
let box = null, timer = null;
export function toast(msg, ms = 1800) {
  if (!box) {
    box = document.createElement('div'); box.className = 'toast'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.popover = 'manual'; // top layer: resta visibile anche sopra a dialog/sheet
    document.body.append(box);
  }
  box.textContent = msg;
  try { box.hidePopover(); box.showPopover(); } catch { /* browser senza popover: resta il position:fixed */ }
  box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
  clearTimeout(timer); timer = setTimeout(() => { box.classList.remove('show'); try { box.hidePopover(); } catch {} }, ms);
}
