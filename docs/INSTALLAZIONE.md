# Rakan sul telefono e sul computer

**Indirizzo dell'app:** https://ucci2d.github.io/gintro/

## Installare
- **iPhone (Safari):** apri l'indirizzo, tocca **Condividi** (il quadrato con la freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
- **Android (Chrome):** apri l'indirizzo, tocca **⋮** → **Installa app** (o **Aggiungi a schermata Home**). In Impostazioni, se vedi il pulsante **Installa**, puoi usare quello.
- **Computer (Chrome o Edge):** apri l'indirizzo e clicca l'icona di installazione a destra nella barra dell'indirizzo, oppure **Impostazioni → Installa**.

Dopo la prima apertura l'app funziona anche senza internet.

## Dove sono i tuoi dati
Schede, iscritti ed esercizi creati restano **solo sul dispositivo** che usi: non vengono inviati a nessun server. Se cambi telefono o cancelli i dati del browser, li perdi, a meno che tu non abbia fatto un backup.

## Backup e spostamento su un altro dispositivo
1. Su Rakan vai in **Impostazioni → Backup dati → Esporta backup**: si scarica un file `rakan-backup-….json`.
2. Mandalo all'altro dispositivo (WhatsApp, email, AirDrop, Drive).
3. Sull'altro dispositivo apri Rakan → **Impostazioni → Importa backup** e scegli il file. Attenzione: sostituisce i dati presenti.

Consiglio: fai un backup ogni tanto, ad esempio a fine settimana.

## Ricerca video YouTube dentro Rakan (facoltativa, gratuita)
Con una chiave API gratuita, il pulsante **Cerca video** (nella scheda esercizio e nella libreria) cerca su YouTube senza uscire dall'app. Senza chiave funziona sempre «Cerca su YouTube» (nuova scheda) + «Incolla».

1. Vai su [Google Cloud Console](https://console.cloud.google.com/), crea un progetto e abilita **YouTube Data API v3** (API e servizi → Libreria).
2. **Credenziali → Crea credenziali → Chiave API**.
3. Limita la chiave: *Restrizioni applicazione* → **Referrer HTTP** `https://ucci2d.github.io/*`; *Restrizioni API* → solo **YouTube Data API v3**. Poi incolla la chiave in Rakan: **Impostazioni → Ricerca video YouTube**.

La chiave resta solo sul dispositivo (non nei backup né nei link ai clienti): su ogni dispositivo va inserita una volta. Quota gratuita: 10.000 unità al giorno, una ricerca ne costa 100 (≈100 ricerche al giorno); Rakan mostra il contatore delle ricerche di oggi e riusa i risultati già cercati nella sessione.
