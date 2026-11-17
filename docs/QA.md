# QA — Rakan (Fase 2b, 2026-11-17)

Metodo: Chrome headless 157 (`--use-mock-keychain --password-store=basic`), pilotato via CDP, viewport 390×844 e 1400×900, cache disattivata, profilo pulito. Dati: solo «Cliente demo». Esito = ✅ ok · ⚠️ ok con nota · ❌ da fare.

| # | Funzione | Esito | Note |
|---|----------|-------|------|
| 1 | Iscritti: nuovo (home, elenco, dentro Nuova scheda), ricerca, storico schede | ✅ | Toast «Iscritto aggiunto»; stato vuoto con pulsante «+ Nuovo iscritto» |
| 2 | Libreria: ricerca, filtri, nuovo esercizio con video, modifica, elimina | ✅ | Toast «Salvato» / «Eliminato» |
| 3 | Libreria: import multiplo (NOME;link) con anteprima e categoria per riga | ✅ | Toast «Importati N esercizi» |
| 4 | Modelli (4) → editor con blocchi, circuito (giri/recupero) | ✅ | Intestazione chiusa |
| 5 | Scheda vuota → intestazione aperta | ✅ | |
| 6 | Duplica ultima scheda (nuovi id, data di oggi) | ✅ | Intestazione chiusa |
| 7 | Superserie (⛓): etichette A1/A2/B, barra laterale, anche nel documento | ✅ | |
| 8 | Bottom sheet esercizio: ricerca, chip, «Aggiungi», «Aggiungi e continua» | ✅ | Toast «Aggiunto» / «Salvato» (visibile sopra il sheet) |
| 9 | Anteprima (mobile: dialog; desktop ≥1200px: affiancata live) | ✅ | |
| 10 | PDF (`window.print`, A4, solo documento) | ✅ | PDF generato da print CSS: link URI presenti (20 nella scheda di prova) |
| 11 | Testo WhatsApp + Copia | ✅ | Toast «Copiato» |
| 12 | Impostazioni (trainer, logo, accento, nota, colonna Carico) | ✅ | Toast «Salvato» |
| 13 | Backup export / import (round-trip, file non valido rifiutato) | ✅ | 25 schede esportate, svuotate, reimportate = 25; `{"x":1}` → «Non è un backup di Rakan» |
| 14 | Home: ricerca schede se >10 | ✅ | Fino a 10 recenti; con ricerca cerca in tutte; «Nessun risultato» |
| 15 | Offline dopo il primo caricamento | ✅ | Con rete spenta: Home e Libreria (239 esercizi) si aprono dal service worker |
| 16 | PWA installabile | ⚠️ | Manifest valido (standalone, 4 icone) e SW attivo (`rakan-v10`). Il tasto «Installa» e le icone PNG dipendono dal deploy Pages (le PNG le genera il workflow): non verificabile da localhost headless |
| 17 | Mobile 390px: nessun overflow orizzontale (Home, Iscritti, Libreria, Impostazioni, Editor) | ✅ | |
| 18 | Console: nessun errore | ✅ | 390 e 1400px |
| 19 | prefers-reduced-motion | ✅ | Tutte le animazioni/transizioni disattivate |

## Bug trovati e corretti
- Il toast sparirebbe insieme al dialog/sheet che lo contiene → ora è un popover nel top layer (resta sopra al sheet).
- L'intestazione dell'editor si apriva in base a un valore globale ricordato dalla prima scheda → ora si decide per scheda (aperta solo se non ha esercizi) e si ricorda la scelta nella stessa scheda.

## Note / limiti
- Verifica su Safari iOS reale non possibile da qui (solo emulazione 390px).
- (Risolto in RAK-13) «Importa backup» ora ridisegna subito Impostazioni.

## RAK-13 — Fase 3 (Chrome headless via CDP, 390 e 1400px)
| Controllo | Esito |
|---|---|
| Sezione «Installa Rakan sul telefono» in Impostazioni, nessun overflow | ✅ |
| Pulsante «Installa» compare con `beforeinstallprompt`, chiama `prompt()` e poi si nasconde | ✅ |
| Banner iOS con UA iPhone/Safari: appare, chiudibile, X ricordata in localStorage; assente su desktop | ✅ (UA emulato, non iPhone reale) |
| Import backup aggiorna subito Impostazioni (nome trainer cambiato nel file → visibile senza cambiare vista) | ✅ |
| Meta iOS in `index.html` e icone PNG nel manifest | ✅ (PNG generate dal workflow, non presenti in locale) |
| Console senza errori | ✅ |

## RAK-14 — Link cliente (Chrome headless via CDP, 390 e 1400px)
| Controllo | Esito |
|---|---|
| Link generato (scheda demo: 638 caratteri), decodifica ok, nessuna anamnesi/`info` nel payload | ✅ |
| Vista cliente: nav nascosta, giorni/blocchi/esercizi, superserie A/B, nessun overflow orizzontale | ✅ |
| Serie spuntate, carico, «completato» con data: persistono dopo ricarica (chiave = hash link) | ✅ |
| ▶ apre modale con iframe `youtube-nocookie` e si chiude | ✅ (riproduzione reale non verificabile offline) |
| Link corrotto → «Link non valido» | ✅ |
| «Invia al cliente» nell'editor: dialog con link, nessun overflow | ✅ |
| Avviso >6000 caratteri + PDF | ✅ codice (non provato con scheda enorme) |
| Console senza errori | ✅ |

## RAK-18 — Scrittura rapida + video facili (Chrome headless via CDP, 390 e 1400px)
Test: scheda realistica di 2 giorni (forza + circuito + addome), 6 blocchi, 18 righe, **396 caratteri**, con 2 superserie (`PRESSA MONO 3x15 pg + STEP UP 3x10 pg`, `REMATORE 3x12 + FACE PULL 3x15`), 1 stripping (`HIP THRUST 4x10+12+15 stripping`), 2 circuiti con giri/recupero, `fermo`, `pg`, `pl`, `kg`, nota tra parentesi.
Tempo: l'inserimento automatico (incolla + anteprima + conferma, 6 blocchi) = ~13 s; a mano, a 250 car/min (PC) ≈ **1'35"**, a 170 car/min (telefono) ≈ 2'20" (stima, non misurata su una persona). Più veloce incollando/duplicando i giorni.
Righe usate (giorno 1 / giorno 2):
```
AFFONDI BULGARI 3x12 pg rec 1'30 | HIP THRUST 4x10+12+15 stripping | PRESSA MONO 3x15 pg + STEP UP 3x10 pg | LAT MACHINE 3x12 20kg (spalle basse)
BURPEE 30" | RUSSIAN TWIST 20 | DEAD BUG 12 | ripetere 3 volte, rec 1'30" a fine giro
PLANK 40" | SIDE PLANK 30" pl
SQUAT 3x8 fermo 2" rec 2' | STACCO RUMENO 3x10 | REMATORE 3x12 + FACE PULL 3x15
STEP UP BOX 12 pg | AFFONDI 10 pg | BIRD DOG 10 pl | ripetere 2 volte
DEAD BUG 3x10
```
| Controllo | Esito |
|---|---|
| Parser: serie×rip, `10+12+15`, tempi, MAX, pg/pb/pl, kg, rec, tecniche, note, superserie, «ripetere N volte» | ✅ (verificato su 14 righe tipo) |
| Abbinamento: «PRESSA MONO»→PRESSA MONOPODALICA, «BURPEE»→BURPEES (con video); «PLANK»/«SQUAT» ambigui → «Nuovo» con menu candidati, mai un video sbagliato in silenzio | ✅ |
| Superserie A1/A2 (`linked`), circuito: giri e recupero impostati dalla riga «ripetere…» | ✅ |
| Anteprima 390 e 1400px, nessun overflow orizzontale | ✅ |
| Link: `youtu.be/…?si=`, `watch?v=…&t=`, `m.youtube.com/shorts/…`, link dentro a un testo → stesso `https://youtu.be/ID`; link non YouTube mantenuto | ✅ |
| Sheet: link incollato → miniatura + video scelto; rinomina → «Aggiorna anche in libreria?» e video nuovo legato all'esercizio | ✅ |
| Share Target: `takeShared` + dialog «Video ricevuto» (esercizio in modifica / suggeriti / nuovo) | ✅ logica e UI; l'invio reale da YouTube su Android installato non verificabile da qui |
| «Incolla» da appunti reali | ⚠️ non provabile in headless (permesso clipboard); c'è il ripiego sul campo |
| Console senza errori | ✅ |
