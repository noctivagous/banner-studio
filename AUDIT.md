# Tile Banner Studio — Coherence & Usability Audit

Date: 2026-10-28. Scope: `src/` (7,686 lines), `index.html`,
`README.md`, `docs/`, `refs/`, `reference/`, `TASKS.txt`.
Method: full read of every source file, cross-reference of every
export, and a production build (`npm run build`, passes with one
warning — see §2.1). No code was changed by this audit.

## Verdict

The layout/print engine is coherent and well-factored. The UI layer
is not straightforward: one conceptual model (frame → stack → line →
glyph copies, sliced across sheets with a taped seam) is presented
through three competing vocabularies, two copies of several controls,
and ~25 accordions that all start closed. A first-time user cannot
answer the basic questions — *Where do I type? How big will it be?
How do the sheets join? What do I press to print?* — without opening
most of the interface first. The fixes are mostly deletion and
renaming, not new features.

---

## 1. Why the UI is not straightforward

### 1.1 The primary action is buried

- Every `ParamSection` in both sidebars passes
  `defaultOpen={false}` (16 in `src/components/CopyPanel.jsx`, 5 in
  `src/components/PrinterSafe.jsx`, 6 in `src/components/GlyphStack.jsx`),
  persisted via `src/hooks/usePersistedSections.js`. On first run the
  left panel shows only headers: Composition, then an inspector whose
  font, glyph height, spacing and transform controls are each behind
  their own triangle. The one always-visible field is the line text
  input in `LineFields` (`CopyPanel.jsx`). Making a first banner
  requires discovering and opening at least Font Family, Glyph Height,
  Paper, and Overlap — in two different panels.
- The zone accordions (`zone.copy`, `zone.safe`, `zone.output`) wrap
  the panels a second time, so "collapsed" has two levels and the
  persisted open-state map in `localStorage` can leave a returning
  user in a state no documentation describes.

**Fix:** default the task-ordered sections open (line text, font,
glyph height, paper, print). Persisted collapse is fine for expert
sections (glyph stack, container decoration), not for the happy path.

### 1.2 Selection model is invisible

- The inspector under the composition tree swaps wholesale between
  Frame / Y-stack / Display line based on a selection that can be set
  three ways: tree rows (`CopyPanel.jsx`), clicking the preview
  (`BannerComposition` in `src/components/Preview.jsx`), or the
  fallback effect that silently re-selects the first line when the
  selected node disappears. Nothing labels the tree as "click to
  edit", and the kind badge (`Frame` / `Y-stack` / `Display line`)
  appears below the tree, detached from what was clicked.
- Preview editing is undiscoverable: single-click selects,
  double-click opens the in-place editor (`LineEditor`), Escape
  cancels and restores a snapshot. There is no hint text anywhere;
  the only documentation is in `TASKS-finished.txt`.

**Fix:** one hint line under the tree ("Click a line here or in the
preview; double-click preview text to edit it"), and keep the kind
badge attached to the selected tree row.

### 1.3 Three vocabularies for one seam

The single most important concept — how sheets join — is named
differently in every place it appears:

- Header chip + Printer Safe: **Join** = `Trim & Tape` /
  `Align & Recut` (`src/components/JoinMarks.jsx`, `JoinSelect`).
- Print menu: **Tape overlap** checkbox (`printOverlap`) and
  **Scissor edge guide** (`printTrim`) in
  `src/components/PrintButton.jsx`.
- Printer Safe slider: **Overlap for Tape**, renamed
  **Overlap for Marks** under Align & Recut.
- Output toggles: **Show Tape Zones**, **Scissor edge guide**,
  **Show Cut Marks** (`src/components/Output.jsx`).
- Code: `ASSEMBLY_ASYMMETRIC_TRIM` / `ASSEMBLY_EDGE_TO_EDGE` /
  `ASSEMBLY_ALIGN_RECUT`, `joinDuplicates(join, printOverlap)`
  (`src/lib/layout.js`).

The actual behaviour is the product of `join × printOverlap ×
overlap` (§ `App.jsx`: `duplicate`), but no single control shows that
product. Worse, choosing Align & Recut silently raises overlap to
0.35" (`App.setJoin`, `ALIGN_RECUT_MIN_OVERLAP`) and silently
disables Tape overlap / Scissor edge guide in the print menu and
Show Tape Zones / Scissor toggle in Output (greyed, no reason given).

**Fix:** one "Join" control that owns the mode; overlap labelled
once; disabled items get a one-line reason ("Included in Align &
Recut") instead of bare opacity. Surface the overlap bump as a
visible change, not a side effect.

### 1.4 Duplicated controls, divergent homes

- Paper size + orientation: header selects (`App.jsx`, hidden below
  `md`) **and** the Paper accordion in Printer Safe.
- Join: header chip (`JoinSelect variant="header"`) **and** Printer
  Safe Join accordion (`variant="panel"`).
- Print: header `PrintButton` **and** a second full-width
  `PrintButton` inside Output's "Ready to print" box — two menus
  editing the same four `print*` flags.
- Stats: sheet count, assembled size and trim size appear in the
  header, again in the Output stats card, again in "Ready to print",
  and per-sheet in Preview labels. Four renderings of three numbers.

Duplication would be defensible as shortcuts if one were primary;
here all copies look equal, so users cannot tell which is canonical
and must re-check that they agree.

**Fix:** keep header paper/orientation/join as the only controls;
Printer Safe keeps margins + overlap only. Keep one Print button
(the Output one can become a plain summary line).

### 1.5 Naming drift between UI, README, and code

- Panel is "Copy" (ZoneHeader), "Copy Deck" (spine), and
  "01 / Copy" (README). The thing edited is variously copy, line,
  display line, and text.
- Container is "Frame" (default name), "Rectangle" (Shape section),
  `container` (code), and "composition tree (frame → Y-stack →
  display lines)" (README).
- Glyph copies are "Glyph stack", "copies", "Z axis", "layers",
  and "Face/Shadow" layer names.
- Mode control says `1D / Horiz. / Vert / Tile: 2D`; code knows
  only `bannerMode: 'horiz' | 'tile'` (`normalizeBannerMode` in
  `src/lib/document.js` collapses everything else to `horiz`).

**Fix:** pick one user vocabulary — e.g. Frame, Stack, Line,
Glyph copies; Banner: Horizontal / Tiled — and sweep UI + README.

### 1.6 Small screens lose the app

Header mode/paper/orientation controls are `hidden md:inline-flex`
and the sheet/size readout `hidden md:flex` (`App.jsx`); "How to
assemble" is `hidden lg:flex`. Below `md` the only paper controls
left are inside the collapsed Printer Safe accordions, and the
banner-mode switch disappears entirely. The three-column layout
stacks (`flex-col xl:flex-row`) with Preview `order-first`, so on a
phone the user meets the canvas before any control that affects it.

### 1.7 Typography works against scanning

Nearly all UI text is 8–11px mono, uppercase, tracked out, in
`#7A7A80` on near-black; rotated spine labels (`SectionSpine`,
Preview's vertical "Preview") repeat panel names already shown in
ZoneHeaders. The hierarchy reads as texture, not structure. Body
copy that would help (Printer Safe intro, assembly steps) is set in
the same 10–11px mono as labels, so nothing looks like "read me".

---

## 2. Correctness-adjacent findings

### 2.1 Duplicate JSX prop (build warning)

`npm run build` warns: `Duplicate "value" attribute in JSX element`
at `src/components/GlyphStack.jsx:551` — the Fill (Base) section
passes `value` twice; the hex readout is dead, only
"Editing · {name}" renders. Delete the first `value`.

### 2.2 Fake controls

- Container **Shape** section renders a static div reading
  "Rectangle" styled like a control; the schema allows only
  `shape: 'rect'` (`normalizeContainer` in `src/lib/composition.js`).
- Container **Size** section renders a static lime "Hug content"
  tile; `size.mode` likewise only accepts `'hug'`.
  Both look changeable and are not. Either implement alternatives
  or present them as readouts, not controls.

### 2.3 Silent state mutation

- `App.jsx` has an effect that rewrites persisted `rows` from the
  measured layout on every change; `rows` is also exported/imported
  in documents. It is derived state stored in three places.
- `fitCompositionToTrim` runs inside `setComposition` and in a
  `trimH` effect (non-Tile only), so changing paper or margins can
  shrink glyph heights without any visible notice.

---

## 3. Redundant text (delete or merge)

Assembly instructions are stated four times:

1. Header **How to assemble** dialog — the full version, three
   join variants (`src/components/AssembleGuide.jsx`).
2. Output "How to assemble" mini-diagram — two-line digest plus
   diagram (`Output.jsx`).
3. CopyPanel footer: "Built for real printers. No edge-to-edge
   assumptions. Trim on lime, tape the hatch."
4. PrinterSafe intro paragraph ("Printers can't print to the edge…")
   and the Empty Strip paragraph in `Preview.jsx` repeat the same
   safe-area/trim/overlap explanation a fifth time.

Keep (1), delete (3), shrink (2) to a link that opens (1), and cut
the Printer Safe intro to one line. Other cuts:

- Output footer: "Default is type only • {pageLabel} • @page
  margins 0" — internal jargon ("type only" refers to the unbuilt
  vector kind, §4.3); page size is already in the header.
- Glyph Effects ends with a ~90-word paragraph re-describing every
  preset the preview tiles above it just showed (`GlyphStack.jsx`).
  Delete; keep at most one line.
- Intro paragraphs in Container ("Rectangle hugs the stack. Align
  cascades…"), Stack ("Alignment lines for the whole Y-stack…"),
  Glyph stack ("Z axis — top = back…") and Offset sections are
  jargon-first; each can lose half its words.
- "Output below" divider and the 10px footer rail in `App.jsx`
  carry no information.
- README repeats the assembly manual and GUI tour at length and has
  already drifted (it calls documents "schema v2"; code is
  `DOCUMENT_VERSION = 3`, and it describes overlap defaults the
  research notes contradict, §5).

---

## 4. Unused or unimplemented aspects

### 4.1 Dead UI

- **Vert** mode button: permanently disabled, tooltip "Not
  available yet" (`src/components/BannerModeControl.jsx`). It has
  shipped as a greyed promise through several releases; remove it
  until vertical layout exists, or the control teaches users the
  app is unfinished.
- **Templates/wizards, CSV and image insert** (`TASKS.txt`, open):
  the Empty Strip state in `Preview.jsx` is where TASKS says
  templates should live; today it is a static badge + paragraph
  with no action.

### 4.2 Dead schema (stored, never read)

- `container.childRule`: `'stack' | 'split-y' | 'split-x'`
  normalised and persisted (`composition.js`), never consumed by
  layout, rendering, or UI. The split-container feature does not
  exist.
- `container.shape` / `size.mode`: single-value enums (see §2.2).
- `composition.grid.pitchIn` is hard-coded to `1` in
  `normalizeGrid`; `grid.snapHalf` is stored but nothing reads
  `composition.grid` — Grid mode behaviour comes from `alignMode`
  plus `src/lib/grid.js` constants.
- `settings.contentKind` is always `'text'`; `settings.extensions`
  and the `tile-banner-studio.unknown` forward-compat plumbing in
  `src/lib/document.js` exist solely for a vector/image kind that
  import explicitly rejects ("This version only opens type
  banners"). This is speculative scaffolding: keep the version
  check, drop the kind/extensions machinery until a second kind
  is real.

### 4.3 Dead code

- `PAGE_W` / `PAGE_H` and `clampGlyphHeight` in
  `src/lib/layout.js`: exported, zero callers (paper sizes live in
  `src/lib/paper.js`; clamping lives in `composition.js`).
- `readStored` / `writeStored` in `usePersistedSections.js` are
  exported but only used internally.
- `settings.rows`: write-only derived value (§2.3); remove from
  settings and from document export/import.
- Nested containers: `normalizeContainer` recursively accepts
  container children, but `getStack`/`findNode`/rendering only
  ever look at the first stack child of the root. Recursion is
  normalised, persisted, and unreachable.

### 4.4 Half-implemented

- `MARGIN_PRESETS.custom` (0.20/0.30 asymmetric) is applied by the
  Custom preset button, but `detectPreset` only compares top+left,
  so several distinct margin sets highlight the wrong preset.
- Preview arrangement (Separate/Overlap) is session-only state
  while every neighbouring view setting persists; either persist
  it or drop the control.
- `DocumentMenu` "Export PDF" is a second label for
  `window.print()` — it exports nothing; rename to Print or remove.

---

## 5. Leftovers from the web artifact

The rebuild (see `docs/plans/2026-09-26-banner-studio-working-web-app.md`)
is complete, but artifact-era material still shapes the codebase:

- `reference/Tile-Banner-Studio-Dark.orig.html` (187 KB minified
  bundle): intentionally preserved per README and git-ignored.
  Fine as an archive; it should not be cited as behaviour spec —
  current source is the spec.
- Legacy v1 migration paths: `compositionFromLegacy` +
  `isLegacyTextSettings` (`composition.js`), the flat
  `copy/fontId/glyphHeight/layers` branch in
  `importDocument` (`document.js`), and the key-stripping in
  `usePersistedSettings.load()`. These exist only for pre-v2
  artifact settings. Given the project's no-legacy-migrations
  stance, deleting them (with a version bump note) removes a
  whole test surface.
- `refs/internal/tiled-print-alignment.md` states the overlap
  default is 0.15"; the app defaults to 0.50" and README says
  0.50" is the new-banner default. The research note is stale.
- `docs/plans/…` describes the artifact's bugs (blank print, no
  Print button, "Use browser print" hint) as current; all fixed.
  Mark the plan completed or move it to an archive note.
- `App.jsx` sets `style={{ paddingTop: 'var(--safe-area-inset-top)' }}`
  — the custom property is defined nowhere; artifact-era residue.
- Header tagline "No edge-to-edge • Inside safe area" is artifact
  marketing copy sitting in the toolbar; the same claim is made by
  the Printer Safe intro and the CopyPanel footer (§3).

---

## 6. Recommended order of work

1. Fix §2.1 (one-line deletion) and §2.2 (static tiles → readouts).
2. Un-collapse the happy path (§1.1); add the selection hint (§1.2).
3. Consolidate seam vocabulary and controls (§1.3, §1.4): one Join
   control, one Print button, one stats home.
4. Delete redundant assembly text (§3) down to the dialog.
5. Remove dead UI/schema/code (§4): Vert button, `childRule`,
   grid record, `contentKind`/`extensions`, `rows`, `PAGE_W/H`,
   `clampGlyphHeight`, nested-container recursion.
6. Retire artifact leftovers (§5): v1 migration paths, stale
   refs/plans, undefined CSS var, toolbar tagline.
7. Rename sweep (§1.5) across UI + README once the above settle,
   so names are chosen for the surviving controls only.

Items 1–4 are user-visible within a day; 5–6 shrink the surface
every future change must cross-check. No engine changes are needed.
