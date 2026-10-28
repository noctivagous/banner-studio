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

## 6. Proposals

Each proposal names the problem it solves (§), the concrete change,
what it deliberately does **not** do, and how to tell it worked.
Proposals are ordered by user impact, not by ease. §7 turns them
into checkable task lists; §8 lists the decisions only the product
owner can make.

### Design principles for all proposals

1. **One concept, one name, one home.** Every concept (paper, join,
   overlap, print marks) gets exactly one control, one label, and
   one panel. Shortcuts that mirror state elsewhere are removed,
   not synchronised.
2. **The happy path needs zero discovery.** Type → size → paper →
   join → print must be visible without opening anything. Accordions
   are for expert detail only.
3. **Delete before adding.** Every proposal below is net-negative
   in lines and in words. New UI is limited to hint/reason text
   that replaces silent behaviour.
4. **No silent mutations.** If the app changes a value the user set
   (overlap floor, fitted glyph height), it says so at the control.
5. **Schema follows UI.** Stored fields with no reader are removed
   in the same change that removes their last theoretical writer.

### P1 — Open happy path (§1.1, §1.2)

**Proposal:** Reorder the left panel into task order and default it
open: (1) line text input, (2) Font, (3) Glyph Height, (4) line
list. Composition tree moves below the line editor as "Structure"
for multi-line work. Remove the outer zone accordion so collapse
has one level. Expert sections (Glyph stack, Fill/Stroke/Offset,
Frame decoration, Stack) keep persisted collapse.

- Files: `src/components/CopyPanel.jsx`, `GlyphStack.jsx`,
  `PrinterSafe.jsx`, `src/hooks/usePersistedSections.js`.
- Not doing: no new panels, no wizard (see §8, D3).
- Works when: a first-time user with a cleared `localStorage` can
  type a line, change its font and height, and see sheet count
  change without clicking any disclosure triangle.

### P2 — One seam model (§1.3)

**Proposal:** A single **Join** segmented control owns the seam,
with three plain options: **Overlap & tape** (today's Trim & Tape
with Tape overlap on), **Edge to edge** (same join, overlap print
off), **Align & Recut**. The four-step overlap control lives
directly under it, always labelled **Overlap**. The Print menu
keeps only print-time marks (Scissor guide, Sheet numbers, Cut
marks); "Tape overlap" leaves the print menu because it is a layout
choice, not a mark. Disabled marks under Align & Recut get a
reason line ("Printed as align/recut lines") instead of bare
greying. Selecting Align & Recut with overlap < 0.35" shows
"Raised to 0.35″ — minimum for the marks" next to the control at
the moment it changes.

- Files: `src/components/JoinMarks.jsx` (`JoinSelect`),
  `PrinterSafe.jsx`, `PrintButton.jsx`, `Output.jsx`, `App.jsx`
  (`setJoin`, `duplicate`).
- Not doing: no engine change — `joinDuplicates()` and the
  `ASSEMBLY_*` constants already model this; this is naming and
  placement only.
- Works when: every seam-related string in the UI comes from one
  vocabulary table, and no control is disabled without a visible
  reason.

### P3 — Single-source controls and stats (§1.4)

**Proposal:** Header keeps Paper, Orientation, Join (P2) as the
only copies. Printer Safe is renamed **Paper & Margins** and keeps
preset, margins, and overlap. Output keeps the single Print button
with its marks menu; the header Print button is removed and the
header keeps only the sheet/size readout. Stats (sheets, assembled
size, trim) live only in Output; header readout is deleted, and
"Ready to print" becomes the Print button plus one line
("{n} sheets · {size}") with no second stats card.

- Files: `src/App.jsx`, `PrinterSafe.jsx`, `Output.jsx`,
  `PrintButton.jsx`, `DocumentMenu.jsx` (Export PDF removed, §4.4).
- Not doing: no change to `window.print()` flow or `@page` CSS.
- Works when: `grep` finds one `JoinSelect`, one `PrintButton`,
  one paper `<select>`, and each stat rendered in exactly one
  component.

### P4 — One vocabulary (§1.5)

**Proposal:** Adopt this user vocabulary and sweep UI + README:

| Concept | User term | Replaces |
|---|---|---|
| `container` | Frame | Rectangle, container, composition root |
| `stack` | Stack | Y-stack, Text Stack |
| `line` | Line | Display line, copy (as noun) |
| `layers` | Glyph copies | Glyph stack, Z axis, layers |
| panel 01 | Lines | Copy, Copy Deck |
| `bannerMode` | Layout: Horizontal / Tiled | 1D, Horiz., Tile: 2D |
| seam | Join: Overlap & tape / Edge to edge / Align & Recut | Trim & Tape, Tape overlap, asymmetric trim |

Code identifiers may stay; only strings change, plus the
`SectionSpine` duplicates of panel names are removed.

- Files: all components with user strings, `README.md`.
- Works when: no user-visible string uses a term in the Replaces
  column.

### P5 — One help text (§3)

**Proposal:** The AssembleGuide dialog becomes the only assembly
instruction. Output's mini-diagram becomes a thumbnail + "How to
assemble" button opening the same dialog. CopyPanel footer,
Printer Safe intro (cut to "Type is laid out inside the printable
area — the margins below."), Empty Strip paragraph (cut to one
line), and the Glyph Effects preset paragraph are deleted.
Section intro lines (Frame/Stack/Glyph/Offset) are rewritten to
one plain sentence each, without axis jargon.

- Files: `AssembleGuide.jsx`, `Output.jsx`, `CopyPanel.jsx`,
  `PrinterSafe.jsx`, `Preview.jsx` (Empty Strip), `GlyphStack.jsx`.
- Works when: `grep -ri "tape the hatch\|edge-to-edge assumptions"`
  returns nothing, and assembly steps exist in exactly one file.

### P6 — Remove dead and fake surface (§2.2, §4)

**Proposal:** Delete, in one pass: Vert button; Shape and Size
static tiles (replaced by a single readout line "Frame · Rectangle
· Hug" only if P4 needs it, otherwise nothing); `childRule`;
`composition.grid` record; `contentKind` + `extensions` +
unknown-key plumbing (keep `schema`/`version` checks);
`settings.rows`; `PAGE_W`/`PAGE_H`; `clampGlyphHeight`;
nested-container recursion (containers accept only a stack child;
unknown child types are dropped with the existing normaliser
fallback). Half-implemented items are finished or cut per §8:
`detectPreset` compares all four margins; preview arrangement
persists like its neighbours.

- Files: `BannerModeControl.jsx`, `CopyPanel.jsx`,
  `src/lib/composition.js`, `src/lib/document.js`,
  `src/lib/layout.js`, `src/hooks/usePersistedSettings.js`,
  `Preview.jsx`.
- Not doing: no replacement features. Split containers and
  vertical banners return only as their own designed tasks.
- Works when: build is warning-free, every remaining exported
  symbol has a caller, and a v3 document round-trips through
  export/import unchanged.

### P7 — Retire artifact leftovers (§5)

**Proposal:** Delete the v1 migration paths
(`compositionFromLegacy`, `isLegacyTextSettings`, the flat-fields
branch in `importDocument`, key-stripping in
`usePersistedSettings.load()`); files/settings older than v3 get
the existing "newer/unknown version" style error, worded for age.
Fix `refs/internal/tiled-print-alignment.md` default (0.15" →
0.50"), mark `docs/plans/2026-09-26-…` completed, remove the
undefined `--safe-area-inset-top` style and the header tagline.
`reference/*.orig.html` stays as an archive with one README line;
it is no longer described as a behaviour reference.

- Files: `src/lib/composition.js`, `src/lib/document.js`,
  `src/hooks/usePersistedSettings.js`, `App.jsx`, `README.md`,
  `refs/`, `docs/plans/`.
- Works when: `grep -ri "legacy\|compositionFromLegacy"` in `src/`
  returns nothing and README states document version 3.

### P8 — Small screens and scanability (§1.6, §1.7)

**Proposal:** Below `xl`, order becomes Preview → Lines → Paper &
Margins → Output, and Layout/Paper/Orientation move from the
header into the top of Paper & Margins rather than being hidden;
header keeps title + Print. Body/help text moves from 10px mono
to the existing sans at 12–13px; mono stays for values and labels.
The 16px disclosure triangles get a 24px hit area; tree row
buttons stay but gain visible focus rings (they already have
labels). Rotated spine text is removed with P4.

- Files: `App.jsx`, `src/index.css`, `SectionChrome.jsx`,
  `ParamSection.jsx`, `CopyPanel.jsx`.
- Works when: at 390×844 every control reachable on desktop is
  reachable, and no help paragraph is set below 12px.

---

## 7. Task lists

Sizes: **S** ≤ 1 hour, **M** half-day, **L** a day or more.
Do phases in order; each phase leaves the app shippable.

### Phase 0 — Quick correctness fixes (S)

- [x] Delete the duplicate `value` prop on Fill (Base)
  (`GlyphStack.jsx:548`) — build warning gone. (§2.1)
- [x] `detectPreset` compares all four margins
  (`layout.js:200`). (§4.4)
- [x] Remove `style={{ paddingTop: 'var(--safe-area-inset-top)' }}`
  (`App.jsx:162`). (§5)
- [x] Fix overlap default in
  `refs/internal/tiled-print-alignment.md` and mark
  `docs/plans/2026-09-26-banner-studio-working-web-app.md`
  completed. (§5)

### Phase 1 — Open the happy path (P1, P8 partial) (M)

- [x] Default open: line editor, Font, Glyph Height, Paper,
  Overlap; remove the outer zone accordions (`CopyPanel.jsx`,
  `PrinterSafe.jsx`, `Output.jsx`, `App.jsx`).
- [x] Move composition tree below the line editor, titled
  "Structure"; add the hint "Click a line here or in the preview;
  double-click preview text to edit it." (§1.2)
- [x] Attach the Frame/Stack/Line badge to the selected tree row
  instead of below the tree. (§1.2)
- [ ] Acceptance: fresh-profile walkthrough (§6 P1) passes;
  `npm run build` clean. (Build passes; the walkthrough needs a
  browser with cleared `localStorage` — the sandbox here cannot
  open a dev-server port, so it is pending a human run.)

### Phase 2 — Seam and control consolidation (P2, P3) (M–L)

- [ ] Replace `JoinSelect` options with Overlap & tape /
  Edge to edge / Align & Recut; move `printOverlap` semantics
  into the join choice (`App.jsx`, `JoinMarks.jsx`).
- [ ] Keep one Overlap control under Join, one label ("Overlap").
- [ ] Remove "Tape overlap" from the print marks menu; add reason
  text for marks disabled under Align & Recut (`PrintButton.jsx`,
  `Output.jsx`).
- [ ] Show "Raised to 0.35″ — minimum for the marks" when
  `setJoin` bumps overlap (`App.jsx`).
- [ ] Delete header paper/orientation selects and header
  PrintButton; rename Printer Safe → Paper & Margins
  (`App.jsx`, `PrinterSafe.jsx`).
- [ ] Delete the Output stats card duplication and "Ready to
  print" card; one stats block + one Print (`Output.jsx`).
- [ ] Remove DocumentMenu "Export PDF" (`DocumentMenu.jsx`).
- [ ] Acceptance: §6 P3 grep checks pass; print output for the
  three join modes is byte-identical to before (save PDFs first).

### Phase 3 — Text deletion pass (P5) (S–M)

- [ ] Output mini-diagram → thumbnail + button opening
  AssembleGuide; delete CopyPanel footer and Glyph Effects
  preset paragraph; cut Printer Safe intro and Empty Strip
  paragraph to one line each.
- [ ] Rewrite Frame/Stack/Glyph/Offset intro lines to one plain
  sentence each; delete "Output below" divider (`App.jsx`).
- [ ] Acceptance: §6 P5 grep checks pass; word count of user
  strings drops measurably (`grep` diff).

### Phase 4 — Dead-surface removal (P6, P7) (M)

- [ ] Remove Vert button (`BannerModeControl.jsx`).
- [ ] Remove Shape/Size static tiles (`CopyPanel.jsx`).
- [ ] Remove `childRule`, `composition.grid`, `contentKind`,
  `extensions`/unknown-key plumbing, `settings.rows`,
  `PAGE_W`/`PAGE_H`, `clampGlyphHeight`, nested-container
  recursion; un-export `readStored`/`writeStored`.
- [ ] Remove v1 migration paths (P7 list); stale settings get a
  clear "older version" error.
- [ ] Persist Preview arrangement or remove the control (§4.4).
- [ ] Delete header tagline "No edge-to-edge • Inside safe area".
- [ ] Acceptance: every export has a caller; v3 export/import
  round-trip test passes; build warning-free.

### Phase 5 — Vocabulary and responsive sweep (P4, P8) (M)

- [ ] Apply the §6 P4 term table to all user strings + README;
  update README document version to 3.
- [ ] Responsive order and control relocation (§6 P8); 12–13px
  sans for help text; 24px disclosure hit areas; remove rotated
  spine labels.
- [ ] Acceptance: 390×844 walkthrough reaches every control;
  term-table grep (§6 P4) passes.

### Phase 6 — Follow-ups (only if §8 approves)

- [ ] Templates/wizards on the Empty Strip state (`TASKS.txt`).
- [ ] CSV / image insert (`TASKS.txt`) — requires reviving a
  content-kind design deliberately, not via the deleted
  `extensions` scaffolding.
- [ ] Vertical banner mode as a designed feature, replacing the
  removed Vert button.

---

## 8. Decisions needed before starting

| # | Decision | Options | Audit recommendation |
|---|---|---|---|
| D1 | Join model (P2) | Three explicit options vs. keeping Trim & Tape + a Tape-overlap checkbox | Three options — the checkbox is the main source of seam confusion |
| D2 | Old settings/files (P7) | Keep v1 migration paths vs. error on < v3 | Error — matches the project's no-legacy-migrations stance; note it in README |
| D3 | First-run shape (P1) | Open panels in place vs. a first-run wizard | Open panels — a wizard is Phase 6 scope (`TASKS.txt` templates work) |
| D4 | Header on small screens (P8) | Keep title + Print only vs. condensed control row | Title + Print; controls live in Paper & Margins |
| D5 | Frame Shape/Size (P6) | Delete readouts vs. implement real alternatives | Delete — no alternative is designed; a fake control is worse than none |

No engine (layout, measurement, print) changes are proposed in
any phase. Phases 0–1 are user-visible within a day; Phases 2–5
shrink the surface every future change must cross-check.
