# Changelog

## RAK-T1 — Scheletro PWA e layout (2026-11-16)
- Aggiunti `index.html`, `manifest.webmanifest`, `sw.js` (cache offline file statici), `icons/` (SVG + PNG 192/512, maskable, apple-touch) con monogramma "R" lime su fondo scuro.
- `css/app.css` con i token del brief §8; tab bar in basso su mobile, sidebar da ≥1024px.
- `js/app.js`: routing con hash (#schede, #iscritti, #libreria, #impostazioni, #scheda-<id>) con schermate vuote.
- Nota: la sezione clienti si chiama "Iscritti" (#iscritti) come da task, non "#clienti" come nella roadmap.

## RAK-T2 — Store dati, demo, backup (2026-11-16)
- `js/store.js`: API asincrona `get/list/put/remove` per clients, plans, exercises, settings, lastRx; IndexedDB con fallback localStorage/memoria; `uuid`, `schemaVersion=1` + `migrate()`; campo indice `_s` normalizzato (minuscolo, senza accenti) e `list(coll, "testo")` multi-parola.
- Primo avvio: carica `data/exercises.json` e crea "Cliente demo" + scheda con Giorno 1 (forza) e Giorno 2 (circuito).
- Backup: `exportBackup/importBackup` e pulsanti in Impostazioni; `sw.js` mette in cache store ed esercizi.
- Non testato in browser reale (solo scrittura codice); `.btn` non ha stile dedicato in app.css.

## RAK-T3 — Libreria e nuovi esercizi (2026-11-16)
- Nuovo `js/library.js` (collegato a #libreria): ricerca istantanea multi-parola senza accenti, chip categoria con conteggi, lista paginata (40 + "Mostra altri"), scheda esercizio con nome/categoria/video modificabili (aggiungi/rimuovi link).
- Nuovo esercizio in 1 passaggio: nome + link incollato + categoria proposta da parole chiave (poi dai nomi già in libreria), modificabile. Salvato con `custom:true`, id `c-…`; eliminabile solo se custom.
- Import multiplo: textarea `NOME;link` o `NOME<tab>link`, anteprima con categoria modificabile per riga, scarto di righe non valide/duplicate, conferma.
- Stili `.btn/.chip/.dlg` in `css/app.css`; `sw.js` v3 con `library.js`. Verificate solo le funzioni pure in Node; non provato in browser reale.

## RAK-T4 — Editor scheda (2026-11-16)
- Nuovo `js/editor.js` (route `#scheda-<id>`): intestazione comprimibile (titolo, data, obiettivo, info, frequenza, riscaldamento, defaticamento, nota finale) con chip di testi ricorrenti (default + valori delle altre schede); tab Giorni con aggiungi/rinomina/elimina.
- Blocchi `serie|circuito|lista` con titolo (suggerimenti Mobilità, Stabilità, Allenamento forza, Addome…), giri e recupero per i circuiti, riordino blocchi; righe compatte con A/B o A1/A2 per superserie, riepilogo prescrizione, anteprima nota; azioni su/giù, duplica, elimina, unisci/separa dal precedente.
- Salvataggio automatico (debounce 500 ms + al cambio pagina) con indicatore "Salvato". Aggiunta/modifica esercizio con dialog essenziale (ricerca libreria + campi + precompilazione da lastRx): sarà sostituito dal bottom sheet a chip in RAK-T5.
- Stili `.ed-*` in `app.css`; `sw.js` v4. Verifica solo statica/Node, non provato in browser reale. Titolo "Circuito N" non numerato automaticamente.

## RAK-T5 — Bottom sheet esercizio (2026-11-16)
- Nuovo `js/sheet.js`: bottom sheet su mobile, pannello a destra da ≥1024px. Ricerca istantanea (multi-parola, senza accenti, filtri categoria) con i più usati in alto (conteggio negli esercizi delle schede) e «Crea «testo»» se manca (esercizio custom con categoria proposta, come T3).
- Prescrizione a chip (Serie, Rip, Lato, Rec, Tecnica) + campi liberi e carico, precompilata da `lastRx` (ora salvato a ogni Aggiungi/Salva); scelta video se ce n'è più di uno; nota tecnica; "Aggiungi" e "Aggiungi e continua" (torna alla ricerca, contatore aggiunti). Percorso minimo: apri → esercizio → serie → rip → Aggiungi (5 tocchi, meno con lastRx).
- `editor.js` usa il sheet al posto del dialog essenziale di T4 (anche per la modifica); stili `.sh-*` in `app.css`; `sw.js` v5. Verificate solo le funzioni pure in Node, non provato in browser reale. Esercizio aggiunto non è mai "unito" in automatico (usare ⛓).

## RAK-T6 — Documento cliente, PDF, WhatsApp (2026-11-16)
- Nuovo `js/doc.js` + `css/doc.css`: documento A4 (intestazione logo/trainer/data, titolo, obiettivo/info/frequenza, blocchi a banda con colore accento, nome esercizio cliccabile ▶ al video, prescrizione in pill, note in corsivo, superserie con barra laterale, colonna «Carico» vuota se `showLoadColumn`, `break-inside: avoid` sugli esercizi).
- Pulsanti nell'editor: Anteprima (dialog a schermo intero), Stampa / PDF (`window.print()`, `@page` A4, solo il documento viene stampato, link cliccabili), Copia testo WhatsApp (*grassetto*, URL dopo ogni esercizio, fallback `execCommand`).
- Da ≥1200px anteprima affiancata all'editor, aggiornata live (debounce 200 ms). `sw.js` v6. Verifica solo statica, non provato in browser reale.

## RAK-T7 — Nuova scheda e nuovi iscritti facili (2026-11-16)
- Nuovo `js/plans.js`: Home (#schede) con grande «+ Nuova scheda», «+ Nuovo iscritto» e schede recenti; Iscritti (#iscritti) con ricerca, storico schede per iscritto (apri/«+ Nuova scheda per…»).
- «+ Nuovo iscritto» in home, elenco iscritti e dentro Nuova scheda («Crea «testo»» dalla ricerca): solo il nome è obbligatorio.
- Flusso Nuova scheda: scegli/crea iscritto → Parti da: ultima scheda (duplicata con nuovi id e data di oggi) / 4 modelli (Forza + Circuito, Circuito total body, Mobilità e stabilità, Corpo libero a casa) / vuota; poi apre l'editor.
- Modelli costruiti con esercizi della libreria per nome esatto; PLANK, SQUAT e GOBLET SQUAT non esistono in libreria e restano righe libere senza video (collegabili dall'editor). `sw.js` v7. Verifica solo statica/Node, non provato in browser reale.

## RAK-9 — Fix da collaudo (2026-11-16)
- Mobile ≤640px: righe esercizio con azioni dietro il tasto «⋯» (riga a tutta larghezza, azioni a 44px sotto la riga), intestazione blocco su due righe, griglia intestazione a 1 colonna → nessuno scroll orizzontale (`overflow-x:hidden` su html/body solo come difesa). Rimossa la regola che portava le icone a 40px: tutti i target ≥44px.
- Tab bar: su `#impostazioni` la voce attiva ora è «Impostazioni» (`setNav` mancava). Sidebar desktop a tutta altezza (`bottom:0`, fissa). Date gg/mm/aaaa anche nell'intestazione editor (`fmtDate` unico in `editor.js`). `sw.js` v8.
- Verificato in Chrome headless (390×844 e 1400×900, CDP): Nuova scheda → iscritto → 3 esercizi dal sheet → superserie (A1,A2,B) → anteprima → copia WhatsApp, scrollWidth = viewport su tutte le schermate, nessun errore in console.

## RAK-10 — Git + primo push (2026-11-16)
- `git init` (branch main), `.gitignore` (.DS_Store, *.tgz, *.pdf, log/tmp, icons/*.png), `README.md` breve, remote `origin` = https://github.com/ucci2d/gintro. Controllo pre-commit: solo file di `app/`, nessun PDF, nessun dato paziente (solo «Cliente demo»). `credential.helper` vuoto: nessun Portachiavi.
- `git push` non ha credenziali: il push è fatto con `push_files` della connessione GitHub di Paperclip (MCP), in più commit consecutivi «Primo commit … (parte n/7)». I PNG delle icone non sono nel repo: li genera `.github/workflows/pages.yml` dagli SVG (192, 512, maskable 512, apple-touch 180) e pubblica su GitHub Pages (https://ucci2d.github.io/gintro/). Se il workflow fallisce con errore Pages: Settings → Pages → Source = «GitHub Actions».

## RAK-11 — Fase 2a: impostazioni trainer + fix mobile (2026-11-17)
- Nuovo `js/settings.js` (Impostazioni): nome trainer (default vuoto, niente più «PERSONAL TRAINER» fisso), studio/sottotitolo, logo (upload → dataURL max 600px), colore accento (6 swatch + input colore, default #0F766E), nota a piè di pagina, colonna «Carico» on/off; salvataggio automatico. Documento e testo WhatsApp (firma «— nome · studio» + nota piè) li usano. Backup invariato.
- Fix anteprima ≤640px: il documento si adatta (pill sotto il nome, casella Carico sotto la prescrizione, intestazione a capo), solo `@media screen`: stampa A4 invariata.
- Bottom sheet esercizio: ricerca a ~85dvh con lista risultati scrollabile; «Crea «testo»» è secondario se ci sono risultati, primario (lime) solo senza risultati. `sw.js` v9.
- Verificato in Chrome headless (≈500px di larghezza minima e 1400×900): nessun errore in console, nessun overflow, impostazioni salvate e riflesse in documento e WhatsApp. Nota: Chrome headless va lanciato con `--use-mock-keychain --password-store=basic` (evita il Portachiavi).

## RAK-12 — Fase 2b: rifinitura estetica + QA (2026-11-17)
- Nuovo `js/ui.js`: toast discreti («Aggiunto», «Copiato», «Salvato», «Duplicato», «Iscritto aggiunto», import/backup) nel top layer, sopra anche ai sheet.
- Stati vuoti con invito all'azione (Home senza iscritti/schede, Iscritti). Home: ricerca schede quando sono più di 10 (altrimenti ultime 10).
- Editor: intestazione chiusa di default per schede duplicate o da modello, aperta per la scheda vuota (decisione per scheda); freccia sul riepilogo.
- Transizioni leggere (cambio vista, dialog, sheet, bottoni) disattivate con `prefers-reduced-motion`. `sw.js` v10.
- QA completo in `docs/QA.md` (Chrome headless 390 e 1400px, nessun errore in console).

## RAK-13 — Fase 3: installazione su telefono + fix import (2026-11-17)
- Repo locale riallineato a `origin/main` (`fetch` + `reset --hard`, senza credenziali).
- Fix: dopo «Importa backup» la schermata Impostazioni si ridisegna subito con i dati importati.
- Nuovo `js/install.js` (si avvia da solo, importato da settings.js): sezione «Installa Rakan sul telefono» in Impostazioni (passi iPhone/Android, pulsante «Installa» via `beforeinstallprompt`); banner discreto chiudibile una sola volta su iPhone/Safari non installato (chiusura in localStorage con try/catch); gli stili del modulo sono iniettati da `install.js` (nessuna modifica a `app.css`). `sw.js` v11.
- `docs/INSTALLAZIONE.md` per Gianluca. Meta iOS verificati in `index.html` (apple-touch-icon, capable, theme-color, title); le PNG sono quelle generate dal workflow e referenziate correttamente.

## RAK-14 — v1.5-A: link cliente «App del paziente» (2026-11-17)
- Nuovo `js/share.js` + pulsante «Invia al cliente» nell'editor: genera `https://ucci2d.github.io/gintro/#c=<dati>`; la scheda (solo campi per il cliente: niente `info`/anamnesi, id, logo) è compressa con `CompressionStream('deflate-raw')` + base64url nel frammento `#`, quindi non arriva mai a un server. Condividi (Web Share API se disponibile), Copia link, WhatsApp (`wa.me`); sopra 6000 caratteri avviso + pulsante Stampa / PDF.
- Nuovo `js/client.js` + `css/client.css`: vista cliente chiara e mobile-first (senza menu): giorni → blocchi → esercizi con nome, prescrizione, note, ▶ (modale con embed `youtube-nocookie`, fallback link; per URL non YouTube solo link). Il cliente spunta le serie, scrive il carico per esercizio, segna l'allenamento (giorno) completato con data (e può annullare). Tutto in localStorage con chiave = hash del link (`rakan-cl-…`). Pulsante «Installa sul telefono» (via `install.js`) e banner iPhone. Link non valido → messaggio.
- `app.js`: con `#c=` nasconde la navigazione e non inizializza lo store/dati demo. `sw.js` v12.
- Limite: l'app installata riparte da `start_url` (senza il link): il cliente riapre il link dal messaggio.

## RAK-18 — v1.5-0: scrittura rapida «come scrive Gianluca» + video facili (2026-11-17)
- Nuovo `js/parse.js` (funzioni pure): parser tollerante di una riga per esercizio — `3x12`, `4x10+12+15`, tempi `40"` `1'30`, `MAX`, `pg/pb/pl` e «per gamba/braccio/lato», `20kg`, `rec 1'30`, tecniche (stripping, piramide, fermo, isometria, eccentrica, cedimento), note tra `( )`; `A + B` = superserie (le parentesi con solo «15 rep»/«1'» sono prescrizione); «ripetere 3 volte, rec 1'30" a fine giro» imposta giri/recupero e fa diventare il blocco un circuito. Abbinamento fuzzy alla libreria (senza accenti, plurali/prefissi, errori di battitura): automatico se sicuro, altrimenti «Nuovo esercizio» con menu dei candidati.
- Nuovo `js/quick.js`: pulsante «⚡ Scrivi veloce» in ogni blocco → testo libero + anteprima delle righe interpretate (lettere A/B, prescrizione, nota, menu per correggere l'abbinamento; si corregge anche riscrivendo la riga). Per esercizi nuovi o senza video compare il campo video. Senza prescrizione scritta si usa l'ultima (`lastRx`).
- Nuovo `js/video.js`: qualunque link YouTube (youtu.be, watch?v=, shorts/, m.youtube.com, con parametri, anche dentro a un testo) → link pulito `https://youtu.be/ID` + miniatura subito; «Incolla» (`navigator.clipboard.readText`, con messaggio di ripiego); «Cerca su YouTube» (nuova scheda). Usato nel bottom sheet, in anteprima e nella Libreria.
- Più video per esercizio: nel sheet miniature selezionabili, il video scelto va al cliente e resta legato all'esercizio in libreria (video nuovo aggiunto automaticamente come predefinito).
- Libreria che impara (`js/learn.js`): se in scheda cambi nome / video predefinito / nota, chiede «Aggiorna anche in libreria?». Il sheet ora ha il campo Nome.
- Android PWA: `share_target` (GET) nel manifest + `js/shared.js`: YouTube → Condividi → Rakan apre «Video ricevuto» con l'esercizio in modifica (o suggerito/nuovo) come destinazione. Stili nuovi in `css/quick.css`. `sw.js` v13.

## Bug trovati e corretti (RAK-18)
- Il campo video generico non deve finire nei dati della riga (`url` escluso dal salvataggio).

## RAK-15 — v1.5-B: progressioni, modelli personali, settimane (2026-11-17)
- Nuovo `js/progress.js`. **«Duplica con progressione»**: da Nuova scheda → «Ultima scheda» (e dall'editor con «Duplica con progressione») si scelgono regole a chip — +1 serie, +2 ripetizioni, +2,5 kg o +5% carico (solo se il carico è numerico, arrotondato a 0,5), recupero −15" (minimo 15"; anche recupero a fine giro dei circuiti) — o «Nessuna», applicabili a tutta la scheda o a un solo blocco. Anteprima prima/dopo riga per riga; valori non numerici o a tempo (`10+12+15`, `40"`, MAX, «peso corporeo») restano com'è.
- **Modelli personali**: «Salva come modello» dall'editor (nome a scelta); compaiono in Nuova scheda accanto ai 4 predefiniti, con rinomina (✎) ed elimina (🗑). Salvati in `settings` (id `templates`): solo sul dispositivo, inclusi nel backup, nessuna migrazione.
- **Settimana n / durata** (facoltativa) nell'intestazione scheda; compare nel documento (A4), nel testo WhatsApp e nella vista cliente (payload `wk`, compatibile). Duplicando, la settimana avanza di 1 (a fine ciclo riparte da 1).
- `sw.js` v14.

## RAK-16 — v1.5-C: video più comodi + QR nel PDF (2026-11-17)
- **Miniature e anteprima video**: in Libreria ogni esercizio con video mostra la miniatura (`i.ytimg.com/vi/<id>/mqdefault.jpg`, lazy) con ▶; un tocco apre il video in **modale** (`youtube-nocookie`) senza uscire dall'app. Stesso nel bottom sheet (ricerca esercizio con miniatura + ▶, e «Guarda il video scelto» nel form) e nel dettaglio esercizio. `playVideo()` in `js/video.js`.
- **Validazione link**: `youtu.be`, `watch?v=`, `shorts/`, `embed/`, `live/`, m./music.; un link YouTube senza id valido (canale, playlist, id troncato) viene rifiutato con messaggio chiaro, anche al salvataggio in libreria.
- **QR nel documento**: nuovo `js/qr.js` (generatore QR proprio, byte mode, correzione L, versioni 1–40, nessuna libreria). Impostazioni → «QR code dei video nella stampa» (spenta di default) aggiunge un QR da 15 mm accanto a ogni esercizio con video. In testa al documento un **QR grande al link cliente** (v1.5-A), omesso se il link non entra in un QR. Presente in anteprima, PDF e A4.
- `sw.js` v15.

## RAK-17 — v1.5-D: backup facile tra PC e telefono (2026-11-17)
- Nuovo `js/backup.js`. **Esporta backup**: file `.json` condiviso con la Web Share API (su iPhone/Android: iCloud Drive, Google Drive, WhatsApp a sé stessi); senza supporto, download. Annullare la condivisione non conta come backup.
- **Importa backup = unione intelligente** (`store.mergeBackup`): per id, vince la versione con `updatedAt` più recente (a pari data resta la locale); nulla viene cancellato. Riepilogo: «Aggiunti: 2 schede, 1 iscritto · Aggiornati: 1 scheda». Ora `updatedAt` è impostato a ogni salvataggio di iscritti, schede, esercizi, impostazioni, lastRx. Le eliminazioni non si propagano (scelta voluta: nessuna perdita).
- **Promemoria in Home** se l'ultimo backup ha più di 7 giorni (o mai fatto, dal primo uso), con pulsante verso Impostazioni. Data in `meta.lastBackup` (locale, non esportata).
- **Statistiche in Home**: iscritti, schede del mese, top 5 esercizi più usati.
- `sw.js` v16.

## RAK-20 — Fix vista cliente e libreria (2026-11-18)
- Vista cliente: titolo con `clamp(1.3rem, 7.2vw, 2.1rem)`, `overflow-wrap:normal` e `hyphens:auto` (lang=it): niente più «PROGRAMMAZIO / NE» a 320px.
- Testi: corpo, pill, note, etichette ≥16px a tutte le larghezze; nomi esercizio 17px; colonna centrale max 680px su tablet (niente rimpicciolimento).
- Libreria: aggiunto «PLANK» (Core, senza video, id e235). Per le librerie già inizializzate `store.js` lo aggiunge una sola volta all'avvio (flag `plank1`, nessun duplicato se esiste già). `sw.js` cache v17.

## RAK-19 — v1.5-0b Bozze + ricerca video YouTube integrata (2026-11-18)
- **Stato scheda** (`js/status.js`): Bozza (default alla creazione, salvataggio automatico già continuo), Pronta, Inviata (con data, impostata da «Invia al cliente» / «Copia WhatsApp» / «Stampa/PDF», modificabile). Le schede precedenti senza stato valgono «Pronta». Selettore stato nell'editor.
- **Home**: sezione «Bozze» in cima, badge di stato in Home, elenco e storico iscritto, filtro Tutte/Bozze/Pronte/Inviate. Se l'app si chiude a metà dell'editor, alla riapertura «Riprendi la bozza di <iscritto>».
- **Bozza esercizio**: i campi del foglio esercizio sono salvati in locale mentre si compila; se si chiude per errore, riaprendolo (stessa scheda e riga) si ritrovano. «Annulla»/«Cambia»/salvataggio la svuotano.
- Avviso «BOZZA» solo nell'anteprima del trainer; mai nel documento, PDF, WhatsApp o link cliente.
- **Cerca video** (`js/ytsearch.js`): YouTube Data API v3 chiamata dal browser (`search` 12 risultati + `videos` per la durata), griglia con miniatura/titolo/canale/durata, anteprima youtube-nocookie con «Usa questo video», «Altri risultati», filtro «Solo brevi (<4 min)», cache di sessione, contatore ricerche di oggi. Presente ovunque c'è il campo video (foglio esercizio, scrittura veloce, libreria). Senza chiave/quota/rete: messaggio + «Cerca su YouTube» in nuova scheda + Incolla.
- **Impostazioni → Ricerca video YouTube**: chiave e parola chiave (default «esercizio tutorial»), guida in 3 passi (anche in `docs/INSTALLAZIONE.md`). La chiave è in `meta.yt` (solo locale: non nei backup esportati, non nei link cliente, non nel repo).
- `sw.js` cache v18.
