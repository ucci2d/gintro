# Rakan

PWA per personal trainer: si compilano velocemente schede di allenamento e si consegnano al cliente come documento A4 (PDF) o testo WhatsApp, con il video di ogni esercizio cliccabile sul nome. HTML + CSS + JavaScript vanilla, nessun build, dati solo sul dispositivo (con backup JSON).

## Aprirlo in locale
Serve un server statico (i moduli ES non funzionano da `file://`):

```
python3 -m http.server 8000
```

poi apri http://localhost:8000. Funziona anche su GitHub Pages.

Documentazione: `CLAUDE.md` (brief), `docs/ROADMAP.md`, `docs/CHANGELOG.md`.

## Pubblicazione
A ogni push su `main` il workflow `.github/workflows/pages.yml` genera le icone PNG dagli SVG in `icons/` e pubblica il sito su GitHub Pages (https://ucci2d.github.io/gintro/). In locale i PNG non sono nel repo: per averli, generali con `rsvg-convert` (vedi il workflow).
