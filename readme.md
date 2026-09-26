# Tile Banner Studio

Dark pro banner lab for a trim-with-scissors, tape-edge-to-edge workflow — no type lost to the printer.

Each sheet is a fixed **11" × 8.5" landscape**. You set real printer margins (Laser .25", Inkjet .5", Minimal .125", or Custom). Type is laid out only inside the printable area, then sliced across sheets with `translateX` so letters line up after you trim on the lime dashed line and tape the overlap.

The original single-file artifact is preserved at `reference/Tile-Banner-Studio-Dark.orig.html`.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

`npm run build` writes a static site to `dist/`. Serve that folder from any static host:

```bash
python3 -m http.server -d dist 8080
```

## Deploy

Upload the contents of `dist/` to any static host (Vercel, Netlify, GitHub Pages, S3, nginx). There is no backend. Example with the Vercel CLI after `npm run build`:

```bash
npx vercel --prod dist
```

## How the layout works

- Printable area = `11 - left - right - tape overlap` by `8.5 - top - bottom`
- Canvas `measureText` of the banner strip → `totalWidth / contentWidth` → sheet count
- Assembled length = `sheets × trimWidth − (sheets − 1) × overlap`
- Glyph height is clamped so type stays inside printable height (0.8"–7")

## GUI

**Left — 01 / Copy:** banner text, font (Anton, Bebas Neue, Oswald 700, Impact, Archivo Black, Black Ops One, Monoton, Space Grotesk Bold), glyph height, letter-spacing, transform, fill + stroke.

**Center — Preview:** inch/foot ruler, sheet cards at 90px per inch with zoom 25/50/75/100%, dotted safe area, lime trim, yellow tape zone, sheet numbers.

**Right — 02 / Printer Safe & 03 / Output:** margin presets, overlap 0–0.5", stats, display toggles, assembly diagram, **Print**.

Settings (copy, type, margins, overlap, toggles) persist in `localStorage` and restore on reload.

Print uses `@page { size: 11in 8.5in landscape; margin: 0 }`. The print subtree (`#print-area`) is a sibling of the app chrome so it is not hidden by screen-only CSS.
