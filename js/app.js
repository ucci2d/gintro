import * as store from './store.js';
import { renderLibrary } from './library.js';
import { renderEditor } from './editor.js';
import { renderSettings } from './settings.js';
import { renderHome, renderClients } from './plans.js';
// Shell dell'app: navigazione, routing con hash e registrazione del service worker.
const ICONS = {
  schede: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  iscritti: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.500-5.5s5.9 1.9 6.500 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.300 3.5 5.200"/>',
  libreria: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9.500 5 2.500-5 2.500z"/>',
  impostazioni: '<circle cx="12" cy="12" r="3"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/>',
};
const TABS = [
  { id: 'schede', label: 'Schede' },
  { id: 'iscritti', label: 'Iscritti' },
  { id: 'libreria', label: 'Libreria' },
  { id: 'impostazioni', label: 'Impostazioni' },
];
const VIEWS = {
  schede: ['Schede', 'Le tue schede di allenamento', 'Nessuna scheda ancora', 'Qui compariranno le schede recenti.'],
  iscritti: ['Iscritti', 'I tuoi clienti', 'Nessun iscritto ancora', 'Qui compariranno i tuoi clienti.'],
  libreria: ['Libreria', 'Esercizi e video', 'Libreria vuota', 'Qui compariranno gli esercizi.'],
  impostazioni: ['Impostazioni', 'Profilo, documento e backup', 'Nessuna impostazione ancora', 'Qui potrai personalizzare il documento.'],
};

const nav = document.getElementById('nav');
const view = document.getElementById('view');

nav.innerHTML =
  '<div class="nav-brand"><img src="icons/icon.svg" alt="">Rakan</div>' +
  TABS.map(t => `<a href="#${t.id}" data-tab="${t.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[t.id]}</svg><span>${t.label}</span></a>`).join('');

function parseRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (h.startsWith('scheda-') && h.length > 7) return { name: 'scheda', id: h.slice(7), tab: 'schede' };
  if (VIEWS[h]) return { name: h, tab: h };
  return { name: 'schede', tab: 'schede' };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  const r = parseRoute();
  let title, sub, emptyT, emptyD;
  if (r.name === 'scheda') {
    [title, sub, emptyT, emptyD] = ['Scheda', `ID: ${esc(r.id)}`, 'Editor in arrivo', 'L\'editor della scheda sarà disponibile a breve.'];
  } else {
    [title, sub, emptyT, emptyD] = VIEWS[r.name];
  }
  if (r.name === 'scheda') { setNav(r, 'Scheda'); return renderEditor(view, r.id); }
  if (r.name === 'impostazioni') { setNav(r, title); return renderSettings(view, title, sub); }
  if (r.name === 'schede') { setNav(r, title); return renderHome(view); }
  if (r.name === 'iscritti') { setNav(r, title); return renderClients(view); }
  if (r.name === 'libreria') { setNav(r, title); return renderLibrary(view); }
  view.innerHTML = `<h1 class="view-title">${title}</h1><p class="view-sub">${sub}</p><div class="empty"><strong>${emptyT}</strong>${emptyD}</div>`;
  setNav(r, title);
}

function setNav(r, title) {
  nav.querySelectorAll('a').forEach(a => {
    if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${title} · Rakan`;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
store.init();
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
