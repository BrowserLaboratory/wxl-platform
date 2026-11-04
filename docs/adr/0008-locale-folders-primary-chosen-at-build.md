---
status: accepted
date: 2026-11-04
---

# Every locale has its own folder; the build picks which one is served at the root

A range chooses its primary locale: the one served at the site root, which every page must exist in.
Every other locale is an optional translation, served under its locale code (`/en/`, `/zh-TW/`, `/ja/`).
Pages live in one folder per locale, named by the locale code (`platform/en/`, `platform/zh-TW/`, and
later `platform/ja/`), and no folder is privileged. A setting read at build time decides which folder
goes to the root. A challenge's application and flag live outside the locale folders, so a challenge
authored only in its range's primary locale is complete. Decided in the 2026-11-02 stage 1 interview
for the epic that follows OQ-023.

The deciding constraint is the charter's "easy to upgrade": `pnpm range:upgrade` merges three ways
against pristine ranges built from upstream as it is, and a range whose files sit where upstream's do
merges cleanly.

## Considered options

- **Move files when the range is created** (the chosen locale moved to `platform/`, English to
  `platform/en/`). Rejected. A file's path would match its URL, but every upgrade would compare the
  teacher's moved files with unmoved pristine ranges. An English fix would merge into the teacher's
  Chinese page as one whole-file conflict. A Traditional Chinese fix would be lost: the path no longer
  exists on the teacher's side. A new page would land half in the wrong tree. Avoiding that means
  rebuilding the pristine ranges with the same move: recording the choice in the setup record first
  (OQ-020), and keeping a content-rewriting move (relative links included) working on every upstream
  release.
- **Keep today's layout and choose the root at build time** (English in `platform/`, Traditional
  Chinese in `platform/zh-TW/`). Rejected. It needs no move, but English stays a special case: every
  tool must know that one locale lives at the folder root and the others in subfolders. A third locale
  would deepen that.

## Consequences

- Upstream moves its English pages from `platform/` to `platform/en/` once. A range upgrading across
  that release would otherwise strand the teacher's own pages outside every locale folder without a
  word: they are absent from both pristine ranges, so the merge leaves them untouched and does not
  report them. So the upgrade moves the old layout, in the teacher's range and in the base pristine
  range alike, before it merges.
- Relative links between locale folders resolve against URLs, not files (measured with VitePress
  2.0.0-alpha.16 `rewrites`). Whether such a link works therefore depends on which locale is primary.
  A dead link fails the build rather than shipping.
- A file's path and its URL differ by one segment: the primary locale's folder name does not appear
  in the URL.
