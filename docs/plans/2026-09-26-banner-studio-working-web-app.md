## Goal

Turn the single opaque `Tile-Banner-Studio-Dark.html` artifact (192KB minified bundle, no project around it) into a working web app: a runnable, maintainable project with a dev server, a production build, and the same banner-studio behavior, plus fixes for the issues found during research.

## Success Criteria

- `npm run dev` serves the app locally and `npm run build` produces a static `dist/` that serves correctly.
- Readable `src/` reproduces current behavior: copy/typography panel, margin presets + tape overlap math, `measureText` sheet slicing, sheet preview row, stats, and print output.
- Print produces non-blank 11×8.5 landscape sheets with content exactly in the printable area (verified via print preview / saved PDF).
- Fixed title (“Tile Banner Studio”, not “React Artifact”), fonts loaded in `<head>`, a Print button, and settings that survive reload.
- README documents how to run, build, and deploy; original artifact preserved as a reference copy.

## Approach

**Baseline first, then rebuild — don’t ship the file as-is.** The artifact works as a behavioral spec but is unfit as the app itself: minified React 18.3.1 + Tailwind bundle in one file, no `package.json`/`src/`/git, generic title, fonts injected at runtime via JS (flash of fallback, offline-hostile), no Print button (`window.print` appears 0 times — only a “Use browser print” hint), no persistence, and a suspected blank-print bug: `#print-area` is nested inside `#app-root` (net bracket depth +3 between the two markers), while print CSS sets `#app-root { display: none !important }`, which would hide its own print subtree. Phase 0 confirms or clears that suspicion live before any rebuild.

Rebuild readable React source against the Vite React template scaffold ([Vite getting-started docs](https://vite.dev/guide/) confirm `npm create vite@latest` + `--template`), keeping the stack the artifact already dictates (React 18, Tailwind, Google Fonts display faces). Preserve all layout math exactly (11×8.5 landscape, margin presets, tape overlap, `translateX` strip slicing). No backend, no redesign, no new features beyond the fixes listed.

## Steps

1. **Baseline the artifact.** Serve the existing file unmodified (`python3 -m http.server` or `npx serve`), screenshot each panel state, save a reference print-to-PDF, and record a behavior checklist (presets, overlap slider, sheet count math, toggles). Confirm or rule out the blank-print bug.
2. **Scaffold the project.** `npm create vite@latest` (React template), Tailwind, `index.html` with proper title/meta/fonts, `git init` (local only, no commits without your ask). Keep the original file as `reference/Tile-Banner-Studio-Dark.orig.html`.
3. **Rebuild the app from the baseline.** Components: `CopyPanel`, `Preview` (ruler + sheet row + zoom), `PrinterSafe`, `Output` (stats + toggles + assembly diagram), `PrintArea`. Port state, `measureText` slicing, clamping (glyph height vs. printable height), and styling to match screenshots.
4. **Fix the print pipeline.** Dedicated print stylesheet with `@page { size: 11in 8.5in landscape; margin: 0 }`; ensure `#print-area` is printable (restructure so it is not inside a `display:none` ancestor); add a Print button calling `window.print()`; keep per-sheet trim/cut-mark/sheet-number rendering.
5. **Head, fonts, and meta.** Static Google Fonts `<link>` (existing families) with `preconnect`, title “Tile Banner Studio”, `theme-color`, favicon (inline SVG data URI), offline fallback stack (Impact/sans-serif).
6. **Persistence + docs.** `localStorage` for copy, font, margins, overlap, and display toggles; write README (run/build/deploy); remove scaffold cruft.
7. **Build and deploy-ready check.** `npm run build` + `npm run preview` smoke test; verify `dist/` serves from a plain static server. Actual deploy to a host is an optional follow-up once you name the target.

## Validation Plan

- `npm run dev` → open the local URL; walk the Phase-0 checklist and diff against baseline screenshots (panels, sheet math for a long banner, each margin preset, overlap 0–0.5”).
- `npm run build && npm run preview` → repeat the smoke pass on the production build; expect zero console errors.
- **Highest-risk step: print verification.** Browser print preview must show N landscape 11×8.5 pages with visible type inside the safe area; save to PDF and check page count and page size. This gates the suspected blank-print bug from Step 1/4.
- Fonts: online load shows Anton/Bebas/Oswald/etc.; throttled/offline load falls back cleanly without layout breakage.
- Persistence: set custom copy/margins/toggles → reload → all restored.
- Static serving: `python3 -m http.server -d dist` renders and prints identically to `preview`.

## Risks / Open Questions

- **Print-blank risk:** if Phase 0 confirms `#app-root { display:none }` hides `#print-area`, the fix (Step 4) is mandatory, not optional — the current file’s core output path would be broken.
- **Behavior drift:** the rebuild is behavior-matched, not a 1:1 de-minification; edge cases in the minified `measureText`/scaling logic could differ. Mitigation: baseline screenshots + reference PDF compared side by side.
- **Assumptions (reversible):** no UI redesign; no backend/accounts; original file archived under `reference/`; deploy target undecided — plan delivers a host-agnostic static `dist/`.
- **Open questions:** None blocking. If you already have a deploy target or want the original filename/URL preserved, say so and I’ll fold it into Step 7.

## Sources

- https://vite.dev/guide/ — scaffold command and template usage for the Vite React app.
