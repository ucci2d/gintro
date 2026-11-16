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
