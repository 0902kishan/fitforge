# FitForge website

Source of the project website — plain hand-written HTML/CSS/JS, no build step,
served by nginx.

Not in this folder (added at deploy time):

- `img/` — screenshots taken from `../assets/screenshots/`
- `icon-180.png` / `icon-512.png` — copied from `../frontend/public/` (the same
  icons the PWA uses, so the browser tab, home screen and app all match)

`site.js` fetches the star/fork counts from the public GitHub API at view time.
