# RAKAN — Brief di progetto per gli agenti

Leggi tutto questo file prima di ogni task. È la fonte di verità del progetto.

## 1. Cosa stiamo costruendo
Rakan è un'app (PWA) per **personal trainer** che serve a **compilare velocemente schede di allenamento curate** e consegnarle al paziente/cliente come documento chiaro, con **il video di ogni esercizio cliccabile sul nome dell'esercizio**, così il cliente si allena in autonomia.
Utente principale: Gianluca Capelli, personal trainer (lavora da PC e da telefono).
Deve funzionare su **PC, iPhone e Android** dallo stesso codice (PWA installabile, niente app store).

## 2. Vincoli tecnici (non cambiarli senza approvazione del CEO)
- **HTML + CSS + JavaScript vanilla (ES modules), nessun build step, nessun framework.** Deve girare aprendo `index.html` da un server statico e su **GitHub Pages**.
- Struttura:
  - `index.html`, `manifest.webmanifest`, `sw.js` (cache offline), `icons/`
  - `css/app.css`, `css/doc.css` (documento + stampa)
  - `js/` moduli: `store.js` (stato + persistenza), `library.js`, `editor.js`, `doc.js` (render documento, PDF, testo WhatsApp), `ui.js`, `app.js`
  - `data/exercises.json` (libreria seed, già presente: NON rigenerarla)
- Persistenza **solo locale** (IndexedDB o localStorage con try/catch) + **backup export/import JSON**. Nessun backend in v1.
- Export PDF con `window.print()` e CSS di stampa dedicato (A4 verticale, link cliccabili nel PDF).
- Export "testo per WhatsApp": testo con *grassetto* stile WhatsApp e URL del video dopo ogni esercizio, pulsante Copia.
- Mobile-first ma ottimo anche su desktop (≥1200px: editor + anteprima affiancati).
- Accessibilità: target touch ≥ 44px, contrasto AA, tutto usabile con una mano.
- Lingua dell'interfaccia: **italiano**.

## 3. Privacy (obbligatorio)
- Le schede originali in PDF nella cartella superiore (`../*.pdf`) contengono dati di pazienti reali. **Non copiarle, non citarne nomi o dati personali nel codice, nei commit, nei dati demo o nei messaggi.** Usa solo clienti di fantasia ("Cliente demo").
- I dati dei clienti restano sul dispositivo.

## 4. Modello dati
```
Settings { trainerName, studio, accent, logoDataUrl, footerNote, showLoadColumn }
Client   { id, name, goal, info, createdAt }
Exercise { id, n (nome MAIUSCOLO), c (categoria), v: [url video...], custom?:bool }   // data/exercises.json
Plan {
  id, clientId, title ("Programmazione <Nome>"), date, goal, info, frequency,
  warmup, cooldown, finalNote, updatedAt,
  days: [ { id, name ("Giorno 1"), blocks: [ Block ] } ]
}
Block { id, kind: "serie"|"circuito"|"lista", title ("Mobilità + Core", "Allenamento forza", "Circuito 1", "Addome"...),
        rounds (solo circuito, es "3" o "2/3"), rest (recupero a fine giro), note,
        items: [ Item ] }
Item  { id, exId|null, name, video (url scelto), linked:bool (true = in superserie col precedente, si mostra "A + B"),
        sets, reps (testo libero: "12", "10+12+15", "1'", "40\"", "MAX"), side ("", "per gamba", "per braccio", "per lato"),
        load, rest, tech ("", "stripping", "piramide", "fermo in buca 2-3\"", "isometria", "eccentrica lenta", "a cedimento"),
        note (indicazioni tecniche per il cliente) }
lastRx: { [exId]: {sets,reps,side,load,rest,tech,note} }   // ultima prescrizione usata per esercizio → precompila
```
Categorie libreria: Gambe e glutei, Core, Schiena, Petto, Spalle, Braccia, Total body, Cardio e metabolico, Mobilità, Respirazione.

## 5. Il flusso reale con cui il trainer fa una scheda (ricavato da 27 schede vere)
1. Dati cliente: nome, data, **obiettivo** (es. "Incremento ipertrofia lower body, core stability"), informazioni (es. "Nessun problema osteoarticolare evidente"), frequenza (es. "3 allenamenti a settimana").
2. **Riscaldamento** (testo ricorrente, es. "10' cyclette o vogatore + mobilità").
3. Uno o più **giorni**, ciascuno con blocchi:
   - **Mobilità / Mobilità + Core / Stabilità / Respirazione**: lista di esercizi con ripetizioni o tempo.
   - **Allenamento forza**: serie classiche (serie × ripetizioni, carico, recupero, tecnica).
   - **Circuito N**: esercizi in sequenza, "ripetere 2/3 volte", recupero 1'30" a fine giro.
   - **Superserie**: "ESERCIZIO A (15 rep) + ESERCIZIO B (1')": due o tre esercizi legati.
   - **Addome** (spesso circuito a tempo).
4. **Defaticamento + stretching** (testo ricorrente).
5. **Nota finale** (es. "Cerca sempre di incrementare il carico, mantenendo un'esecuzione corretta").
6. Ogni esercizio ha: nome MAIUSCOLO + link video + prescrizione + note tecniche ("controlla le ginocchia, NON verso l'interno", "spalle basse"...).
7. **Molto spesso la nuova scheda = la precedente dello stesso cliente con progressioni** → "Duplica ultima scheda" è il percorso principale.

## 6. Esperienza (UX) attesa
- **Home**: grande pulsante "Nuova scheda", schede recenti, accesso a Clienti / Libreria / Impostazioni (tab bar in basso su mobile, sidebar su desktop).
- **Nuova scheda**: scegli/crea cliente → "Parti da": *ultima scheda del cliente* / *modello* / *vuota*. Modelli: "Forza + Circuito", "Circuito total body", "Mobilità e stabilità", "Corpo libero a casa".
- **Editor**: intestazione comprimibile (obiettivo, info, frequenza, riscaldamento, defaticamento, nota finale, con chip di testi ricorrenti) → tab Giorni → blocchi → righe esercizio compatte (lettera A1/A2 per superserie, nome, riepilogo prescrizione, anteprima nota).
- **Aggiungi/modifica esercizio = bottom sheet** (mobile) / pannello (desktop):
  1. ricerca istantanea nella libreria (senza accenti, più parole, filtri categoria, prima i più usati), "Crea «testo cercato»" se manca;
  2. prescrizione **a chip**: Serie [2][3][4][5] · Rip [8][10][12][15][20][30"][40"][1'][MAX] · Lato [—][per gamba][per braccio][per lato] · Rec [45"][1'][1'30"][2'] · Tecnica [...] + campi liberi; precompilata da `lastRx`;
  3. nota tecnica; scelta del video se l'esercizio ne ha più di uno;
  4. "Aggiungi" e "Aggiungi e continua".
- Azioni riga: su/giù, duplica, elimina, "unisci al precedente" (superserie).
- **Anteprima documento** sempre a un tap; su desktop affiancata e aggiornata in tempo reale.

## 7. Documento per il cliente (il prodotto finale che vede il paziente)
- A4, chiaro, elegante: intestazione con logo/nome trainer, "Programmazione <Nome>", data, obiettivo.
- Ogni giorno → blocchi con titolo a banda; ogni esercizio come riga/card: numero o A1/A2, **nome cliccabile (link al video) con icona ▶**, prescrizione in "pill" (`3 × 12 per gamba · 20 kg · rec 1'30"`), note in corsivo più piccolo; superserie unite da una barra laterale.
- Colonna/casella **"Carico"** vuota opzionale da compilare a mano dal cliente.
- Interruzioni pagina pulite (mai un esercizio spezzato), link cliccabili nel PDF.

## 8. Direzione estetica
- App: **dark mode**. Sfondo #0E0F11, superfici #17191C / #1F2226, bordi #2A2E33, testo #F2F2EF, secondario #9A9FA6, **accento lime #CCFF3D** (testo su accento #0E0F11).
- Font: **Archivo** (titoli, anche condensato/maiuscolo) + **Inter** (testo), da Google Fonts con fallback di sistema.
- Riferimenti di funzionalità: Everfit, TrueCoach, Trainerize (builder con libreria video, superserie/circuiti, modelli) ma **molto più veloce e semplice**.
- Documento: carta bianca, inchiostro #14161A, accento = colore del trainer (default verde-petrolio #0F766E, impostabile).

## 9. Definition of done (per ogni task)
- Funziona in Chrome desktop e in Safari iOS (viewport 375×812) senza errori in console.
- Nessuna dipendenza esterna oltre ai Google Fonts.
- Commit piccoli con messaggi chiari in italiano. Aggiorna `docs/CHANGELOG.md`.
- Se un task è ambiguo, scegli l'opzione più semplice coerente con questo brief e annotalo nel task, non bloccarti.

## 10. Regole di consumo (abbonamento Claude Pro condiviso)
- Un task alla volta. Niente esplorazioni inutili: leggi solo i file che servono.
- Non rigenerare file grandi interi se basta una modifica mirata.
- A task finito, fermati e riporta in 3–5 righe cosa hai fatto e cosa resta.
