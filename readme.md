# Tile Banner Studio

![Tile Banner Studio](docs/screenshot.png)

Dark pro banner lab for a trim-with-scissors, tape-overlap or tape-edge-to-edge workflow — no type lost to the printer.

Choose paper (Letter, Legal, A4) and orientation. Type is laid out only inside the printable area, then sliced across sheets with `translateX` so letters line up after you trim on the scissor guide and tape the overlap.

**Tape overlap is on by default.** The Print menu’s first item, **Tape overlap**, is checked, and **Overlap for Tape** starts at **0.15"**. Each sheet prints that extra strip of the next slice, so the same 0.15" of type appears on the right of one page and the left of the next. You can lay one sheet on top of the other and the letters match. The overlap slider sets how much is repeated. Uncheck Tape overlap in the Print menu to go back to a blank tape strip. The scissor cut on the earlier sheet sits 0.05" into that duplicated strip so a slightly imperfect left-edge cut on the next sheet still covers.

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

- Printable area (trim) = sheet width − left − right by sheet height − top − bottom
- Advance per sheet (`contentWidth`) = trim width − tape overlap (default 0.15")
- With Tape overlap on, each sheet clips `trimWidth` of type and advances by `contentWidth`, so the overlap strip is duplicated; with it off, the window is `contentWidth` and the tape strip is blank
- Canvas `measureText` of the banner strip → sheet count (`ceil((textWidth − overlap) / contentWidth)` when overlap copy is on)
- Assembled length = `sheets × trimWidth − (sheets − 1) × overlap`
- Glyph height is clamped so type stays inside printable height (0.8"–7")

## GUI

**Left — 01 / Copy:** banner text, font (Anton, Bebas Neue, Oswald 700, Impact, Archivo Black, Black Ops One, Monoton, Space Grotesk Bold), glyph height, letter-spacing, transform, fill + stroke.

**Center — Preview:** inch/foot ruler, sheet cards at 90px per inch with zoom 25/50/75/100%, dotted safe area, lime trim, yellow tape zone, sheet numbers.

**Right — 02 / Printer Safe & 03 / Output:** paper and orientation, margin presets, overlap 0–0.5" (default 0.15"), stats, display toggles, assembly diagram, **Print** (Tape overlap and Scissor edge guide on by default).

Settings (copy, type, margins, overlap, toggles) persist in `localStorage` and restore on reload.

Print uses `@page { size: <sheet>; margin: 0 }` from the current paper and orientation. The print subtree (`#print-area`) is a sibling of the app chrome so it is not hidden by screen-only CSS.
