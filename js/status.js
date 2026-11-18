// Stato scheda: Bozza (default), Pronta, Inviata (con data). Le schede senza stato (pre v1.5-0b) contano come «Pronta».
export const STATUSES = [['bozza', 'Bozza'], ['pronta', 'Pronta'], ['inviata', 'Inviata']];
export const statusOf = p => (STATUSES.some(s => s[0] === p?.status) ? p.status : 'pronta');
export const statusLabel = p => STATUSES.find(s => s[0] === statusOf(p))[1];
const fmt = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${m[3]}/${m[2]}` : ''; };
export const badgeHtml = p => { const st = statusOf(p); return `<span class="st-badge st-${st}">${statusLabel(p)}${st === 'inviata' && p.sentAt ? ` · ${fmt(p.sentAt)}` : ''}</span>`; };
// Invio (link / WhatsApp / PDF): stato «Inviata» con data di oggi, ancora modificabile a mano.
export function markSent(plan) { plan.status = 'inviata'; plan.sentAt = new Date().toISOString().slice(0, 10); return plan; }

// «Riprendi la bozza»: l'editor segna la scheda aperta in localStorage e la toglie quando si esce con «‹ Schede».
// Se l'app si chiude a metà resta il segno: alla riapertura la Home lo propone (una volta sola per avvio).
const RK = 'rakan:resume';
export const boot = { resume: (() => { try { return localStorage.getItem(RK); } catch { return null; } })() };
export const setResume = id => { try { id ? localStorage.setItem(RK, id) : localStorage.removeItem(RK); } catch {} };
