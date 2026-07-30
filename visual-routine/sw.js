# Visual Routine — PWA

A concrete, picture-based **daily routine** builder and **countdown calendar**
for children, designed for low cognitive load (large targets, calm palette,
minimal text). Works offline once loaded and installs as an app on iPad and
Android tablets.

## Features
- **Routine tab** — visual daily schedule; tap an activity to run a concrete
  *Time Timer*-style visual countdown (a colored wedge that empties).
- **Countdown tab** — add a special day (e.g. a family trip) with a picture and
  a date. Shows the days remaining, a row of "sleeps", and a **markable
  calendar grid** (Monday-first) so the child can cross off each day.
- **Pictures** — search **ARASAAC** pictograms (PT / EN / SV / ES), use a real
  **photo**, or pick an **emoji**. Chosen pictograms are stored locally so
  routines work offline.
- **Child language** — the child-facing countdown text switches PT / EN / SV via
  the language button (admin UI stays English).
- **Child lock** — hides editing; long-press the lock to unlock.

## Deploy to GitHub Pages
1. Put all these files in the repo, keeping the folder structure:
   ```
   index.html
   manifest.webmanifest
   sw.js
   icons/  (icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png)
   ```
2. Repo **Settings ▸ Pages ▸ Build and deployment**: Source = *Deploy from a
   branch*, Branch = `main`, folder = `/ (root)`. Save.
3. Open the published URL (`https://USER.github.io/REPO/`). Because the app is
   `index.html`, you do **not** need to add a filename.

## Install on a tablet
- **Android / Chrome** — an **Install** banner appears in the app; tap it (or
  browser menu ▸ *Install app*).
- **iPad / Safari** — Safari has no auto-prompt, so the app shows a hint:
  **Share ▸ Add to Home Screen**. It then opens full-screen like a native app.

> After you change `index.html` or the icons, bump `CACHE` in `sw.js`
> (e.g. `visual-routine-v2`) so tablets pick up the new version.

## Attribution (required)
Pictograms are property of the Government of Aragón, created by **Sergio Palao**
for **ARASAAC**, distributed under **CC BY-NC-SA**. Keep this credit and the
same license on any derivative. Non-commercial use only — for a paid product,
switch to a commercially-licensed set (e.g. Mulberry Symbols, CC BY-SA).
