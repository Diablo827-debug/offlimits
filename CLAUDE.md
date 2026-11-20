# Offlimits – notatki dla Claude

Gra imprezowa w stylu kart z lukami: telewizor to ekran gry (`/tv`), telefony to piloty (`/graj`).
Osobna aplikacja (nie część rodzinnej platformy). Właściciel pisze po polsku.

- Stos: Vite + React 18, Firebase Realtime Database (projekt `offlimitsapp`, europe-west1) + logowanie anonimowe.
- Wgrywanie: GitHub Actions → Cloudflare Pages (projekt `offlimits`). Gałąź `test` = kopia testowa, `main` = produkcja.
- Zmiany wyglądu: najpierw zrzuty ekranu do akceptacji właściciela, dopiero potem wgrywanie.
- TV jest „mistrzem gry” (`src/master.js`): rozdaje karty, przechodzi między etapami, liczy punkty.
  Telefony zapisują tylko `subs/{kod}/{uid}`, `picks/{kod}` (sędzia) i `rooms/{kod}/cmd`.
- Reguły bazy: `database.rules.json` (wklejane ręcznie w konsoli Firebase → Realtime Database → Rules).
- Talia: `public/talia.json` (`c` = czarne `[tekst, luki]`, `b` = białe). Białe karty w mianowniku lub bezokoliczniku.
- Podgląd bez Firebase: `/tv?demo=lobby|picking|reveal|judging|result|end`, `/graj?demo=hand|hand2|sedzia|judge|played|lobby`.
- Test telewizora: `/tv/test`. Tryb lekki: `/tv?lite=1`. Testy z mniejszą liczbą graczy: `/tv?min=1`.
- Starsze przeglądarki TV: `@vitejs/plugin-legacy`. Czcionki są w paczce (`@fontsource`), bez Google Fonts.
