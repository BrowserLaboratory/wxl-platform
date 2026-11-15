---
id: T-0076
title: Pure modules and the layout-move planner
epic: 0010-primary-locale-layout
status: review
blocked_by: []
---

## Context

Epic 0010 puts every page in a locale folder and lets the setup record (`range.json`) choose the
primary locale. The layout switch has to land as one ticket (T-0077, constraint T1), so the pure
pieces it builds on land first, unused, with their unit rows (T2, T3). Nothing in the site, the
scripts, the pre-commit hook or the upgrade imports them until T-0077; `main` behaves exactly as
before after this ticket lands.

The modules:

- **The locale list module** (D4, D115): `LOCALES` (`['en', 'zh-TW']`), the `Locale` type,
  `DEFAULT_PRIMARY_LOCALE` (`'zh-TW'`), `isKnownLocale` and `LOCALE_ENGLISH_NAMES`. Import-free, so
  Node's `--experimental-strip-types` and the VitePress configuration can both load it.
- **Primary locale** (seam 0010-S1; D2, D3, D114): `parsePrimaryLocale(text | undefined)` and
  `readPrimaryLocale(path)`, throwing PL-E01–PL-E06 with the canonical first lines, values quoted as
  D140 states (the quoting function's table test, B95, is T-0077's, because it also covers
  PL-E07–PL-E12).
- **The page predicate** (seam 0010-S2; D116): `classifySourcePath(sourcePath, primary)`.
  `checkSourceLayout` is T-0077's. No row names `classifySourcePath` alone: B20–B28 reach it through
  `checkSourceLayout`, and U136 compares it with create-wxl's `isLegacyPage` in the switch ticket
  (T2). This ticket's test plan may test it over U11's and B21–B28's paths as working tests; they
  claim no row.
- **The challenge declaration and the brief schema** (seams 0010-S31, 0010-S32; D73–D75, D129):
  `validateChallengeDeclaration`, `validateChallengeBrief`, `BRIEF_KEYS` and
  `readChallengeDeclaration(root, slug)`. `validateChallengeConfig` and its callers stay as they
  are; T-0077 moves the callers over and removes it (expand, then contract).
- **The transform** (seam 0010-S45; D95, D97–D99, D104, D110, D112): `planLayoutMove({ files })` in
  `create-wxl/src/layout-move.mjs`, no I/O, with create-wxl's literal copy of the locale list and
  `isLegacyPage`. T-0077 runs it on upstream's own tree (D108); T-0081 runs it inside the upgrade.

**Claim rule.** This ticket claims a row only when every seam the row names is one of these pure
functions. A row that also names the validation CLI (0010-S34), assembly (0010-S33), keygen or the
upgrade run (0010-S44) is T-0077's or T-0081's, even when its pure half could be tested here
(`tickets.md`, "Claim rules").

**Decisions to confirm before implementing** (workflow, "Standing authorization"): D97, D98, D99,
D114, D115, D116, D129, D140, D143 and D144.

Spec: `spec.en.md` revision 2, "Implementation Decisions", AC-1, AC-2, AC-35, AC-44–AC-47;
`traceability.md` revision 2, amended to 2.1 by D143 and D144 (stage 6 review: `spec.en.md`'s own
header and prose stay at revision 2 — needs decision, see "Stage 6 review"), constraints T2 and T3,
seams 0010-S1, S2, S31, S32, S45, "Schema:
`range.json`", "Build error codes" (PL-E01–PL-E06), Y-§2.1–Y-§2.4, U-§1, U-§4 "Split checks"; the
claim table in `tickets.md`.

## Deliverable

The locale list module, the primary-locale reader, the page predicate, the declaration and brief
functions and `planLayoutMove` exist with their unit tests. No file outside the tests imports any of
them; every existing suite passes unchanged, and the built site, the hook and the upgrade behave as
on the previous commit.

## Acceptance criteria

- [x] B1–B13: `readPrimaryLocale` for an absent file, an object without an own `primaryLocale`,
  `en`, `zh-TW`, a non-regular file (the symbolic link not followed), a read failure other than
  `ENOENT`, text that is not JSON, JSON that is not an object, a non-string value, a string off the
  locale list (JSON-quoted), other keys, a duplicated key and an inherited key (AC-1; B14–B16 and B95
  are T-0077's)
- [x] B17: the locale list module's exports (AC-2; B18 and B19 are T-0077's)
- [x] Y7, Y8, Y10, Y11, Y15–Y18: `readChallengeDeclaration` accepts a leading `---` and keeps a date
  as a string; `validateChallengeDeclaration`'s `app`, `backend`, `source_visible`, `source_files`,
  `tools` and `flag` rules (AC-35; its other rows are T-0077's)
- [x] U11: the page predicate per path, observed as `planLayoutMove`'s `legacy` and ops (AC-44; the
  run rows are T-0081's)
- [x] U20–U24, U26, U30, U31, U146, U150: `move` and `declare` outputs, bytes, line endings, the BOM,
  groups, a brief left with only its fences, the no-op, determinism, a stray page in a new-layout
  tree, legacy pages named like a locale (AC-45). U150 here is the planner's half: two `move` ops
  to `platform/en/en.md` and `platform/en/zh-TW.md` and no `failures`; its clause "the next build
  fails with PL-E09 naming both" is the build's, observed through B31 in T-0077
- [x] U27: a translation brief is stripped, left alone, or fails `frontmatter` (AC-45, AC-47)
- [x] U12, U25, U28, U29: the `legacy-brief`, `frontmatter`, `orphan-brief` and `target-exists`
  failures (AC-47; the UP-E14 lines and the run's stops are T-0081's)
- [x] U47: value equality for mismatches (AC-46; the UP-A16 lines are T-0081's)
- [x] Nothing reads the new modules: the coverage report records `git grep` showing that only test
  files import them; no row of "Overridden contracts" changes in this ticket
- [x] Stage 8 as below (`pnpm test --run` is green; `pnpm --dir create-wxl test` is green — see
  "Stage 6 review" for the GLOSSARY.md fix that this required)

## Stage 8

No V row: every row here is a unit row of a module nothing reads yet (T3, T8). Stage 8 records, on
the terminal surface, `pnpm test --run` and `pnpm --dir create-wxl test` passing on the ticket
branch, and that nothing outside the tests imports the new exports. One of them
(`validateChallengeDeclaration`, and the brief functions if they land here) is added to the existing
`.vitepress/challenge/config.ts`, which the hook and the scripts already read for
`validateChallengeConfig`; the diff touches that file but adds no new import for the hook, the
scripts or the upgrade to resolve, so they behave as on the previous commit. It claims no browser
behaviour.

**Stage 6 review note:** this section's "touches no file that the build, the hook or the upgrade
reads" wording was narrowed during implementation to "adds no new import", because the "Module and
test files" table — approved with the rest of the test plan — always named `.vitepress/challenge/
config.ts` as a file this ticket touches (seam 0010-S31, note 3). The two statements were in
tension from the plan's approval, not from an unrecorded mid-implementation change; stage 6 review
records that reconciliation here, since no Comments entry had done so yet.

## Test plan (stage 5)

Approved under the user's standing authorization of 2026-11-15.

Written 2026-11-15 on `tickets/T-0076/pure-modules-and-layout-move-planner`, from `spec.en.md` and
`traceability.md` revision 2.1. One line per claimed row (39, as `tickets.md` "Counts" gives), then
the `classifySourcePath` working tests, which claim no row. Every expected value is a literal from
the row, the schema tables, "Build error codes", Y-§2.4, U-§1 or today's `validateChallengeConfig`
messages (Y-§2.5: "kept verbatim and only re-homed"); none is recomputed by the test. Site rows run
in the root vitest suite (`tests/unit/`); area U rows in create-wxl's own suite, which is vitest
(`create-wxl/vitest.config.mjs`, `test/**/*.test.mjs`), not `node:test`. `\n`, `\r\n` below are
the bytes LF and CR LF. A `content` value written as a string literal stands for its UTF-8 bytes;
tests compare `content` byte-for-byte (e.g. with `Buffer.from(expected, 'utf8')`), matching the
schema's `Uint8Array` (U-§1), not as a JavaScript string.

### Test plan table

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0010-S1 | B1: no file gives the default primary locale | unit; `tests/unit/site/primary-locale.test.ts`; temporary directory | `readPrimaryLocale(<tmp>/range.json)` with no file returns `'zh-TW'`, `=== DEFAULT_PRIMARY_LOCALE` (AC-1) | `ENOENT` only; `parsePrimaryLocale(undefined)` also returns `'zh-TW'` (D114) |
| 0010-S1 | B2: an object without an own `primaryLocale` gives `zh-TW` | same | Returns `'zh-TW'` for `{}` and for `{"upstream":{"repository":"BrowserLaboratory/wxl-platform","version":"3.2.0","commit":"0123456789abcdef0123456789abcdef01234567"}}` (AC-1) | the two shapes the schema table marks B2 |
| 0010-S1 | B3: `"en"` is read | same | `{"primaryLocale": "en"}` returns `'en'` (AC-1) | exact value |
| 0010-S1 | B4: `"zh-TW"` is read | same | `{"primaryLocale": "zh-TW"}` returns `'zh-TW'` (AC-1) | exact value |
| 0010-S1 | B5: a non-regular `range.json` is PL-E01 and a link is not followed | same; `symlinkSync`, `mkfifo` | Throws `SiteLayoutError`, `code === 'PL-E01'`, first line exactly `PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.` for a directory, a symbolic link whose target does not exist (stage 6 review, finding Spec-S7:
corrected — not the default locale, which `stat`-ing the dangling target and catching its `ENOENT`
would give; `PL-E02` itself excludes `ENOENT` by definition, "Build error codes") and a FIFO (AC-1) | `lstat`, not `stat`, so a dangling link is still PL-E01, proving the target is never opened; the FIFO call returns without blocking; link and FIFO cases skipped on `win32` with the reason |
| 0010-S1 | B6: a read failure other than `ENOENT` is PL-E02 with its errno | same | First line `PL-E02: range.json could not be read (EACCES).` for a regular file of mode `000`; `PL-E02: range.json could not be read (ENOTDIR).` for a path whose parent is a regular file (AC-1) | `EACCES` case skipped, not failed, when `process.getuid?.() === 0` or on `win32`, where a mode `000` file does not produce `EACCES` |
| 0010-S1 | B7: text that is not JSON is PL-E03 | same; file bytes written as given | Each throws `code === 'PL-E03'`, first line `PL-E03: range.json is not valid JSON.` (AC-1) | empty file; `{`; bytes `EF BB BF 7B 7D` (BOM + `{}`); `// c\n{}`; `{} x` |
| 0010-S1 | B8: JSON that is not an object is PL-E04 | same | Each throws `code === 'PL-E04'`, first line `PL-E04: range.json does not hold a JSON object.` (AC-1) | `null`, `[]`, `"en"`, `1`, `true` |
| 0010-S1 | B9: a non-string value is PL-E05 quoting the value | same | First lines exactly `PL-E05: "primaryLocale" in range.json is not a string: null.`, `… not a string: 1.`, `… not a string: true.`, `… not a string: ["en"].`, `… not a string: {}.` (each written in full in the test) (AC-1) | files `{"primaryLocale": null}`, `1`, `true`, `["en"]`, `{}` |
| 0010-S1 | B10: a string off the list is PL-E06, JSON-quoted (D140) | same | First line `PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.`; the same line with `""`, `"EN"`, `"zh-tw"`, `"zh"`, `" en"`, `"en\n"` (six characters: quote, e, n, backslash, n, quote) and `"\u001b[31m"` (one backslash) in place of `"ja"`, each expected line a literal in the test; no character of any line is below U+0020 (AC-1) | exact, case-sensitive, no trimming; C0 control in the value; the DEL/C1 table is B95's (T-0077) |
| 0010-S1 | B11: other keys are not read | same | `{"upstream": 7, "primaryLocale": "zh-TW", "x": []}` returns `'zh-TW'`; `{"upstream": 7}` returns `'zh-TW'` (AC-1) | `upstream` of a wrong type; an unknown key |
| 0010-S1 | B12: a duplicated key keeps the last | same | `{"primaryLocale":"en","primaryLocale":"zh-TW"}` returns `'zh-TW'` (AC-1) | `JSON.parse` semantics |
| 0010-S1 | B13: only an own property counts | same | `{"__proto__":{"primaryLocale":"en"}}` returns `'zh-TW'` (AC-1) | `__proto__` key |
| locale list module (D4) | B17: the module's exports | unit; `tests/unit/i18n/locales.test.ts` | `LOCALES` deep-equals `['en', 'zh-TW']` in that order; `DEFAULT_PRIMARY_LOCALE === 'zh-TW'` and is a member; `isKnownLocale` true for `'en'`, `'zh-TW'` and false for `'EN'`, `'zh-tw'`, `''`, `null`, `1` (AC-2) | `LOCALE_ENGLISH_NAMES` deep-equals `{ en: 'English', 'zh-TW': 'Traditional Chinese' }`, keys equal to `LOCALES` (D115) |
| 0010-S32 | Y7: a leading document marker is accepted | unit; `tests/unit/challenge/declaration.test.ts`; temporary tree `<root>/platform/challenge/s/challenge.yaml` | `readChallengeDeclaration(root, 's')` on `---\nbackend: flask\napp: app.py\n` returns `ok: true`, value deep-equal to `{ backend: 'flask', app: 'app.py' }`, the same value as for the file without the `---` line (AC-35) | marker on the first line only; one document |
| 0010-S32 | Y8: an ISO date stays a string | same | For `backend: flask\napp: app.py\ndate: 2026-04-02T08:54:17.674Z\n`, `value.date === '2026-04-02T08:54:17.674Z'` and `typeof value.date === 'string'` (AC-35) | core schema (D129), not YAML 1.1 timestamps |
| 0010-S31 | Y10: `app` is required | unit; `tests/unit/challenge/config.test.ts`, new `describe` blocks (existing cases untouched) | `validateChallengeDeclaration({ backend: 'flask' })` and `({ backend: 'flask', app: null })` each throw `missing required field: app` (AC-35) | absent and `null`; `{ backend: 'flask', app: 'app.py' }` with no `title` passes (D75: `title` is the brief's) |
| 0010-S31 | Y11: `backend` outside the enum | same | `{ backend: 'django', app: 'app.py' }` throws `backend must be one of flask, fastapi, php, got: django` (AC-35) | one off-enum value |
| 0010-S31 | Y15: non-boolean `source_visible` keeps today's three messages | same | `"true"` throws `source_visible must be a boolean, got string: "true" (a quoted YAML value is a string)`; `null` throws ``source_visible must be a boolean, got null: null (a bare `source_visible:` line with no value parses as null)``; `1` throws `source_visible must be a boolean, got number: 1` (AC-35) | quoting hint / null hint / no hint |
| 0010-S31 | Y16: `source_files` keeps today's rules | same | a string throws `source_files must be an array of virtual paths`; `['/a', 1]` throws `source_files entries must be strings, got: number`; `['/a']` with `source_visible: false` and with it absent each throws `source_files lists paths to display but source_visible is not true; set source_visible: true or remove source_files`; `[]` with `false` passes (AC-35) | empty array vs non-empty; `source_visible` false vs absent |
| 0010-S31 | Y17: `tools` keeps today's rules | same | a string throws `tools must be an array of valid tab IDs`; `['terminal']` throws `invalid tools entry: terminal. Must be one of browser, network, repeater, code`; `[]` passes and the result's `tools` deep-equals `[]`; absent passes with `tools: undefined` (AC-35) | `[]` preserved, not defaulted |
| 0010-S31 | Y18: non-string `flag` | same | `flag: 5` throws `flag must be a string, got: number` (AC-35) | one non-string type |
| 0010-S45 | U11: the page predicate per path, observed as `legacy` and ops | unit; `create-wxl/test/layout-move.test.mjs`; one tree per path, `mode: 0o100644` | `legacy: true` and one `move` to the destination for `platform/x.md` → `platform/en/x.md`, `platform/guide/x.md` → `platform/en/guide/x.md`, `platform/challenge/s/notes.md` → `platform/en/challenge/s/notes.md`, `platform/challenge/index.md` → `platform/en/challenge/index.md` (note 1), `platform/ZH-TW/x.md` → `platform/en/ZH-TW/x.md`; for the English brief `platform/challenge/s/index.md` (content `---\ntitle: S\nlayout: challenge\nnumber: 1\n---\n`) a `move` to `platform/en/challenge/s/index.md` and a `declare` with `slug: 's'`, `to: 'platform/challenge/s/challenge.yaml'`; `{ legacy: false, ops: [], mismatches: [] }` for `platform/challenge/s/src/README.md`, `platform/public/x.md`, `platform/shared/x.md`, `platform/zh-TW/x.md`, `platform/en/x.md`, `platform/x.MD`, `platform/postcss.config.mjs`, `docs/x.md`, `Platform/x.md` (AC-44) | case-sensitive `.md` and prefix; excluded areas; a folder named like a locale in the wrong case is not a locale folder |
| 0010-S45 | U12: a single-file brief stops the move | same | `platform/challenge/s.md` gives exactly `{ failures: [{ token: 'legacy-brief', path: 'platform/challenge/s.md' }] }` (AC-47) | direct child of `platform/challenge/` |
| 0010-S45 | U20: a non-brief page moves with identical bytes | same | `op.content` byte-identical to the input for each case; the LF case equals U-§1's example exactly: `{ legacy: true, ops: [{ kind: 'move', from: 'platform/guide/a.md', to: 'platform/en/guide/a.md', content: "# A\n", mode: 0o100644 }], mismatches: [] }` (AC-45) | `# A\n`; `# A\r\n`; `# A` (no final newline); empty file; binary bytes `00 FF FE 80`; `mode` passed through as given |
| 0010-S45 | U21: upstream `door-is-open` English brief splits into U-§1's two examples | same; fixtures `create-wxl/test/fixtures/layout-move/door-is-open/` | Input `source-index.md` = blob `65de8c0:platform/challenge/door-is-open/index.md` (2032 bytes) at `platform/challenge/door-is-open/index.md`; the `declare` op (`slug: 'door-is-open'`, `to: 'platform/challenge/door-is-open/challenge.yaml'`) has content byte-equal to `challenge.yaml` (U-§1's eleven lines, `number: 1` … `wasmModule: /challenge/door-is-open/runtime.wasm`, each LF); the `move` op (`to: 'platform/en/challenge/door-is-open/index.md'`) has content byte-equal to `en-index.md`: `---\ntitle: Need to Know\nlayout: challenge\ndescription: A black-box engagement against FileHub, a file-sharing service whose product page promises that a file uploaded by one account is readable only by that account.\n---\n` then the source body unchanged (AC-45) | both expected files are hand-made literals; the coverage report records the input's `git hash-object` equal to `git rev-parse 65de8c0:platform/challenge/door-is-open/index.md` |
| 0010-S45 | U22: interleaved keys keep their relative order | same | Input `---\ntitle: T\nnumber: 1\nlayout: challenge\ntags: [ a ]\ndescription: D\ndate: 2026-01-01T00:00:00.000Z\n---\nbody\n` gives brief `---\ntitle: T\nlayout: challenge\ndescription: D\n---\nbody\n` and `challenge.yaml` `number: 1\ntags: [ a ]\ndate: 2026-01-01T00:00:00.000Z\n` (AC-45) | kept and declaration groups alternating |
| 0010-S45 | U23: line endings per line and the BOM | same | All-CRLF brief: every output line ends `\r\n`; mixed brief (`title: T\r\n`, `number: 1\n`, `layout: challenge\r\n`, `backend: flask\n`): every output line keeps its own input ending; BOM brief: the brief output starts `EF BB BF`, `challenge.yaml` does not (AC-45) | CRLF fences (`---\r\n`) are fences; BOM before the opening fence |
| 0010-S45 | U24: multi-line groups stay one unit; a quoted key is a declaration | same | Outputs equal the bytes hand-written in the test for one brief holding a comment and a blank line before the first key (they join the first group), a block sequence `tags:` with an indented comment line, a block scalar `>-`, a blank line inside a group, and `"number": 1` (AC-45) | continuation lines start with space, tab, `#`, CR or LF (U-§1 "key line") |
| 0010-S45 | U25: each split check broken gives `frontmatter` | same; English brief at `platform/challenge/s/index.md` | One failure `{ token: 'frontmatter', path: 'platform/challenge/s/index.md' }` and no ops, for each case (AC-47) | SC1 invalid UTF-8 (`FF` in the front matter); SC2 no opening fence; unclosed fence; closing fence `--- ` (trailing space, so unclosed); SC3 top-level scalar; top-level sequence; duplicate key; SC4 anchor in `tags` aliased by `keywords`; top-level `{ a: 1 }` on one line; SC6 English brief with only `title`, `description`, `layout`; D144: an unknown tag `!foo` whose value holds ESC (U+001B), once on a value inside `tags` and once on a key, each gives `frontmatter`, and spies show `process.emitWarning`, `console.warn` and `process.stderr.write` never called |
| 0010-S45 | U26: a brief with only declarations keeps only its fences | same | `---\nnumber: 1\nbackend: flask\n---\n# Body\n` gives brief `---\n---\n# Body\n` and `challenge.yaml` `number: 1\nbackend: flask\n` (AC-45) | no kept group |
| 0010-S45 | U27: a translation brief is stripped, left alone, or fails `frontmatter` | same; tree with English brief `platform/challenge/s/index.md` (`---\ntitle: S\nlayout: challenge\nnumber: 1\n---\n`) | `platform/zh-TW/challenge/s/index.md` with `---\ntitle: 甲\nnumber: 1\nlayout: challenge\n---\nbody\n` gives `{ kind: 'strip', path: 'platform/zh-TW/challenge/s/index.md', content: "---\ntitle: 甲\nlayout: challenge\n---\nbody\n" }`; with no declaration key, no op for that path; with no front matter, `{ failures: [{ token: 'frontmatter', path: 'platform/zh-TW/challenge/s/index.md' }] }` (AC-45, AC-47) | SC6 does not apply to a translation brief |
| 0010-S45 | U28: an orphan translation brief stops; a declared slug's is untouched | same; each tree also holds `platform/index.md` (note 5) | `platform/zh-TW/challenge/s/index.md` alone gives `failures` `[{ token: 'orphan-brief', path: 'platform/zh-TW/challenge/s/index.md' }]`; beside `platform/challenge/s/challenge.yaml`, and beside `platform/en/challenge/s/index.md`, no failure and no op for it (only the `platform/index.md` move) (AC-47) | translation brief carries a declaration key in all three, so "untouched" is observable (D98) |
| 0010-S45 | U29: a destination already present | same | `platform/x.md` and `platform/en/x.md` in one tree give `failures` `[{ token: 'target-exists', path: 'platform/x.md', to: 'platform/en/x.md' }]` (AC-47) | the `to` side only |
| 0010-S45 | U30: no legacy page is a no-op | same | A new-layout tree (`platform/en/index.md`, `platform/zh-TW/index.md`, `platform/challenge/s1/challenge.yaml`, `platform/zh-TW/challenge/s1/index.md` carrying `number: 1`) and `files: []` each give `{ legacy: false, ops: [], mismatches: [] }` (AC-45) | `platform/` absent; declaration keys in a translation brief of a declared slug |
| 0010-S45 | U31: deterministic | same | The U21 tree plus a stripped translation brief and a non-brief page, planned twice, gives deep-equal results (AC-45) | two calls, fresh input arrays |
| 0010-S45 | U146: a new-layout tree with one stray page moves that page alone | same | U30's new-layout tree plus `platform/guide/mine.md` gives exactly `{ legacy: true, ops: [{ kind: 'move', from: 'platform/guide/mine.md', to: 'platform/en/guide/mine.md', content, mode }], mismatches: [] }`; no `strip`, no `failures` (AC-45) | the translation brief of the declared slug carries `number: 1` and stays untouched |
| 0010-S45 | U150: legacy pages named like a locale move like any page | same | `platform/en.md` and `platform/zh-TW.md` give two `move` ops to `platform/en/en.md` and `platform/en/zh-TW.md` and no `failures` (AC-45; the PL-E09 clause is B31's, T-0077) | no rename, no stop |
| 0010-S45 | U47: mismatches compare values as `yaml` parses them | same; English brief and `platform/zh-TW/challenge/s/index.md`, both with `title`, `layout`, `backend: flask` and the key under test | `tags: [ a, b ]` vs `tags: [a, b]` → `mismatches: []`; `number: 1` vs `number: "1"` → `[{ brief: 'platform/zh-TW/challenge/s/index.md', key: 'number', enValue: 1, value: '1' }]`; `source_visible: true` vs `source_visible: "true"` → `[{ brief: …, key: 'source_visible', enValue: true, value: 'true' }]`; the same `date: 2026-04-02T08:54:17.674Z` text → `[]` (AC-46) | flow-sequence spacing; number vs string; boolean vs string; core-schema date |
| 0010-S2 | No row (working test): `classifySourcePath` over U11's and B21–B28's paths | unit; `tests/unit/site/source-layout.test.ts`; every path for `primary` `'en'` and `'zh-TW'`, same class for both | `outside`: `index.md`, `challenges.md`, `x.md`, `guide/x.md`, `reference/x.md`, `ja/index.md`, `fr/a.md`, `zh-tw/index.md`, `EN/index.md`, `ZH-TW/x.md`, `docs/a.md`, `challenge/x/index.md`, `challenge/x.md`, `challenge/x/notes.md`, `challenge/x/sub/a.md`, `challenge/src/a.md`, `challenge/index.md`; `excluded`: `challenge/x/src/README.md`, `challenge/x/src/a/b/c.md`, `public/x.md`, `shared/x.md`, `.draft.md`, `en/.x/a.md`, `node_modules/p/README.md`, `en/dist/old.md`; `locale-page`: `en/x.md`, `zh-TW/x.md`, `zh-TW/en/a.md`, `en/smoke-fixtures/english-only.md` | non-pages (`foo.txt`, `assets/logo.png`, `postcss.config.mjs`, `README.MD`, `x.Md`, `x.MD`) → `excluded` (note 2); claims no row (U136 compares it with `isLegacyPage` in T-0077) |

### Module and test files

| Module | Path | Exports in this ticket | Test file | Why this path |
|---|---|---|---|---|
| Locale list | `.vitepress/locales.ts` | `LOCALES`, `Locale`, `DEFAULT_PRIMARY_LOCALE`, `isKnownLocale`, `LOCALE_ENGLISH_NAMES` | `tests/unit/i18n/locales.test.ts` | D4's recommended path; import-free, so Node's `--experimental-strip-types` and `config.mts` both load it; the locale tests already live in `tests/unit/i18n/` |
| Layout error | `.vitepress/layout-error.ts` | `SiteLayoutError` (`code`), `jsonStringifyEscaped` (D140) | none of its own here: reached by B5–B10; its table test is B95 (T-0077) | one error class for PL-E01–PL-E18 (D113), shared by the reader now and the layout check later |
| Primary locale | `.vitepress/primary-locale.ts` | `parsePrimaryLocale`, `readPrimaryLocale` | `tests/unit/site/primary-locale.test.ts` | `config.mts` reads it at evaluation and the tools and hook load it through Node (D114, D123), so it imports its siblings with a `.ts` extension, as `scripts/` already imports `.vitepress/challenge/config.ts`; `tests/unit/site/` holds the configuration-level tests (`config-base.test.ts`) |
| Layout check | `.vitepress/source-layout.ts` | `classifySourcePath` (`checkSourceLayout` is T-0077's) | `tests/unit/site/source-layout.test.ts` | D116: the layout check exports the predicate; same consumers as the reader |
| Schemas | `.vitepress/challenge/config.ts` (existing) | `validateChallengeDeclaration` (and `validateChallengeBrief`, `BRIEF_KEYS`: note 3); `validateChallengeConfig` unchanged | `tests/unit/challenge/config.test.ts` (new `describe` blocks) | seam 0010-S31 names this file and this test file |
| Declaration reader | `.vitepress/challenge/declaration.ts` | `readChallengeDeclaration` | `tests/unit/challenge/declaration.test.ts` | seam 0010-S32 names a new `declaration.test.ts`; separate from `config.ts` because it needs `node:fs` and `yaml`, while `config.ts` stays import-free |
| Transform | `create-wxl/src/layout-move.mjs` | `planLayoutMove`, `LOCALES` (literal copy, D112), `isLegacyPage` (D116) | `create-wxl/test/layout-move.test.mjs`; fixtures `create-wxl/test/fixtures/layout-move/door-is-open/{source-index.md,challenge.yaml,en-index.md}` | the ticket fixes the path; create-wxl cannot import the site's modules (D112) |

Not `scripts/`: that folder holds the CLIs, which import from `.vitepress/` (never the reverse), and
`config.mts` must import the reader and the layout check while it is evaluated.

### Notes on the plan

1. **`platform/challenge/index.md`.** U11 expects a `move` ("yes (non-brief)"), which U-§1's "legacy
   single-file brief" ("exactly `platform/challenge/<name>.md`, a direct child of
   `platform/challenge/`") and D99 would otherwise also match, giving `legacy-brief`. D143
   (`traceability.md` revision 2.1) settles this: `platform/challenge/index.md` is an ordinary page,
   not a legacy single-file brief; the plan follows U11, the row.
2. **`classifySourcePath` on a non-page.** D116 gives three classes. A path that is not a page and is
   not in an excluded area (`.MD`, `.txt`) is planned as `excluded`, since U136 needs `outside`
   exactly where `isLegacyPage` is true. Working tests only; no row depends on it.
3. **`validateChallengeBrief` and `BRIEF_KEYS` have no row here.** Y14 and Y23–Y29 also name
   0010-S34, so they are T-0077's. The user approved "no row" working tests for them landing here
   as an option (Y-§2.3 as the source; see Comments), but the TDD cycle ended without adding them:
   per the last Comments entry, they are untouched, as the code (`.vitepress/challenge/config.ts`)
   confirms — this ticket exports only `validateChallengeDeclaration`. Resolved at stage 6 review:
   not fixed, since adding them now would be new scope under hard rule 2, not a defect in what
   this ticket claims; they stay T-0077's.
4. **`readChallengeDeclaration(root, slug)`.** `root` is read as the repository root and `path` as the
   repository-relative `platform/challenge/<slug>/challenge.yaml` (VM1, PL-E14). Y7 and Y8 assert
   only `ok` and `value`.
5. **A tree without a legacy page is a no-op** (U30), so U27's and U28's trees each hold a legacy
   page (an English brief, or `platform/index.md`) to make the translation-brief rule observable.
6. **Op order is not specified.** Tests with several ops match them by `kind` and path; U31 pins
   that two runs agree.

## Coverage report (stage 5)

Full suites, rerun after the stage 6 review (see "Stage 6 review" below): `pnpm test --run` — 141
test files passed, 5042 tests passed, 1 skipped (pre-existing, unrelated:
`tests/unit/scripts/upstream-guard.test.ts`'s `WXL_EXPECT_UPSTREAM` row). `pnpm --dir create-wxl
test` — 39 test files passed, 843 tests passed, 1 skipped (pre-existing Windows-only row).

Corrected record: a stage 5 run of this coverage report asserted that `test/upstream-config.test.mjs`'s
one failure was "pre-existing on `main`, not caused by this ticket", reading only the checkout's
current `GLOSSARY.md`. That was wrong (stage 6 review, finding "GLOSSARY"): `git diff 65de8c0
a2ac5b6 -- GLOSSARY.md` shows this ticket's branch (commit `a2ac5b6`) rewrote GLOSSARY.md's `setup
record`, `upstream`, `primary locale` and four other entries ahead of schedule — `tickets.md`
assigns all of B90 except U135's sentences to T-0077, and names T-0077 as the GLOSSARY-writing
ticket, not T-0076. The premature rewrite dropped the sentence
`test/upstream-config.test.mjs:415` asserts on. The fix (stage 6) restored GLOSSARY.md to its
`65de8c0` (main) text; `pnpm --dir create-wxl test` is now fully green. The root suite's test count
fell from 5082 to 5042 as a direct, expected consequence: `tests/unit/site/glossary.test.ts` runs
several `it.each` blocks over GLOSSARY.md's parsed entries, and reverting the six entries this
branch's docs commit added removes their cases (`tests/unit/site/glossary.test.ts` itself still
passes, 290 of its own tests).

Coverage measurement: `@vitest/coverage-v8` is not an installed dependency in either workspace
(root or `create-wxl`), and installing one is outside this executor's touch list (the test plan's
named test and source files, plus this ticket file). Every row below is "not measured" for that
reason; the mutation check is the substitute signal the handoff asked for.

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0010-S1 (`.vitepress/primary-locale.ts`) | `tests/unit/site/primary-locale.test.ts`, 38 tests (B1–B13) | not measured (no coverage provider installed) | AC-1 | — |
| locale list (`.vitepress/locales.ts`) | `tests/unit/i18n/locales.test.ts`, 5 tests (B17) | not measured | AC-2 | — |
| `.vitepress/layout-error.ts` (`SiteLayoutError`, `jsonStringifyEscaped`) | exercised through `tests/unit/site/primary-locale.test.ts` (B5, B6, B9, B10); no row of its own (B95's table test is T-0077's) | not measured | supports AC-1 | — |
| 0010-S32 (`.vitepress/challenge/declaration.ts`) | `tests/unit/challenge/declaration.test.ts`, 2 tests (Y7, Y8) | not measured | AC-35 (partial; the rest of AC-35 is T-0077's) | — |
| 0010-S31 (`.vitepress/challenge/config.ts`, `validateChallengeDeclaration`) | `tests/unit/challenge/config.test.ts`, 17 new tests (Y10, Y11, Y15–Y18) | not measured | AC-35 (partial) | — |
| 0010-S45 (`create-wxl/src/layout-move.mjs`) | `create-wxl/test/layout-move.test.mjs`, 57 tests (U11, U12, U20–U31, U47, U146, U150; U29 gained a declare-op case at stage 6) | not measured | AC-44, AC-45, AC-46, AC-47 | — |
| 0010-S2 (`.vitepress/source-layout.ts`) | `tests/unit/site/source-layout.test.ts`, 70 tests (working test, claims no row) | not measured | none (working test) | — |

Mutation check (python3, one assertion per seam; each line: file changed → test command exit code
after the mutation (red) → file restored to the original bytes → test command exit code after
restore (green)):

| Seam / file | Mutation | Command | Result |
|---|---|---|---|
| locale list (`.vitepress/locales.ts`) | `DEFAULT_PRIMARY_LOCALE` literal `'zh-TW'` → `'en'` | `pnpm vitest run tests/unit/i18n/locales.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| 0010-S1 (`.vitepress/primary-locale.ts`) | inverted the `!isKnownLocale(primaryLocale)` guard | `pnpm vitest run tests/unit/site/primary-locale.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| `.vitepress/layout-error.ts` | `this.code = code` → `this.code = 'MUTATED'` in `SiteLayoutError` | `pnpm vitest run tests/unit/site/primary-locale.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| 0010-S32 (`.vitepress/challenge/declaration.ts`) | `readChallengeDeclaration` returns `value: {}` instead of the parsed value | `pnpm vitest run tests/unit/challenge/declaration.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| 0010-S31 (`.vitepress/challenge/config.ts`) | `DECLARATION_REQUIRED` dropped `'app'` | `pnpm vitest run tests/unit/challenge/config.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| 0010-S2 (`.vitepress/source-layout.ts`) | swapped the `'locale-page'`/`'outside'` branches of `classifySourcePath` | `pnpm vitest run tests/unit/site/source-layout.test.ts` | changed=True, red (exit 1), restored=True, green (exit 0) |
| 0010-S45 (`create-wxl/src/layout-move.mjs`) | `KEPT_KEYS` dropped `'layout'` | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1), restored=True, green (exit 0) |

U21 hash check (stage 6 review, finding S4b): `git hash-object create-wxl/test/fixtures/layout-move/door-is-open/source-index.md` →
`ac04968675d1373d7b666738634ea1ed3e6c91de`; `git rev-parse 65de8c0:platform/challenge/door-is-open/index.md` →
`ac04968675d1373d7b666738634ea1ed3e6c91de`. Equal, confirming U21's input fixture is the unmodified `65de8c0` blob.

`git grep` ("Nothing reads the new modules"): every import of `.vitepress/locales.ts`,
`.vitepress/primary-locale.ts`, `.vitepress/layout-error.ts`, `.vitepress/source-layout.ts`,
`.vitepress/challenge/declaration.ts` and `create-wxl/src/layout-move.mjs` outside the modules'
own internal cross-imports is from a `*.test.ts` / `*.test.mjs` file; `validateChallengeDeclaration`
(added to the existing `.vitepress/challenge/config.ts`) has no caller outside
`tests/unit/challenge/config.test.ts` — `scripts/challenge-analyze.ts` and
`scripts/challenge-validate.ts` still import only `validateChallengeConfig`.

Reproduced at stage 6 review (finding S4a) with, for each module name, `git grep -n --untracked --
"<name>" -- '*.ts' '*.mjs'`, filtered to lines containing `import`/`require` outside `node_modules`:
every result is either one new module importing a sibling (`primary-locale.ts` → `locales.ts`,
`layout-error.ts`; `source-layout.ts` → `locales.ts`), a `*.test.ts`/`*.test.mjs` file, or (for
`validateChallengeDeclaration`) its own `config.ts` export line and its test file.

## 給使用者（zh-TW）

這張票先做好之後版面切換要用的純函式：語系清單模組、從設定紀錄（`range.json`）讀主語系的函式、判斷一個路徑算不算頁面的函式、讀取與檢查題目宣告（`challenge.yaml`）及說明頁前置資料的函式，以及 create-wxl 裡規劃搬家的 `planLayoutMove`。這些模組只有測試會用；網站、pre-commit hook 與升級都還不讀它們，所以合併後網站完全沒有變化。實作前要先向你確認的決策：D97、D98、D99、D114、D115、D116、D129、D140、D143。測試計畫表已依你的常態授權核准；`validateChallengeBrief` 與 `BRIEF_KEYS` 原本有併入這張票、以不對應任何驗收列的 working tests 落地的選項，但實作時沒有落地，維持不動，留給 T-0077（stage 6 review 已確認維持現狀）。

## Comments

- 2026-11-15 (stage 5): the test plan table is approved under the user's standing authorization of
  2026-11-15 and listed to the user, with the decision summaries of D97, D98, D99, D114, D115, D116,
  D129 and D140. The plan's notes 1–3 are settled: note 1 by D143 (`platform/challenge/index.md` is
  moved as an ordinary page, traceability revision 2.1); note 2: `classifySourcePath` returns
  `excluded` for non-pages; note 3: `validateChallengeBrief` and `BRIEF_KEYS` land here with working
  tests that claim no row. Status set to `processing`.
- 2026-11-15 (stage 5): a first run of the stage 5–7 workflow stopped at the executor's increment
  plan (its role's two-step handoff) and wrote no code; its stage 6 and 7 passes therefore reviewed
  the spec text only and are discarded, except stage 7 candidate C1 (F-1), which is a spec defect:
  adopted as D144 (traceability revision 2.1; U25 gains the unknown-tag cases). That pre-check is
  kept at `../../.proj.specs/0010-primary-locale-layout/review/security-T-0076-spec.md`. The workflow
  is rerun with the increment plan confirmed.
- 2026-11-15 (stage 5, TDD): all 39 claimed rows and the `classifySourcePath` working test (row
  0010-S2) are green, one seam/one test/one minimal change per cycle, with the one documented
  order deviation (B17 moved ahead of B1) and no other deviation from the confirmed plan. Files
  added: `.vitepress/locales.ts`, `.vitepress/primary-locale.ts`, `.vitepress/layout-error.ts`,
  `.vitepress/source-layout.ts`, `.vitepress/challenge/declaration.ts`,
  `create-wxl/src/layout-move.mjs`, their test files, and
  `create-wxl/test/fixtures/layout-move/door-is-open/{source-index.md,challenge.yaml,en-index.md}`
  (the first a `git show 65de8c0:...` literal, hash-verified against the blob; the other two
  hand-written literals per U-§1). `.vitepress/challenge/config.ts` gained
  `validateChallengeDeclaration` beside the unchanged `validateChallengeConfig`. `pnpm test --run`
  is green (141 files, 5082 passed, 1 pre-existing unrelated skip). `pnpm --dir create-wxl test`
  has one pre-existing, unrelated failure (`test/upstream-config.test.mjs` against GLOSSARY.md's
  setup-record wording; neither file is in this ticket's scope) — see "Coverage report" for the
  reproduction. Status stays `processing` on that account: the "Stage 8" criterion as written asks
  for both suites passing, and the second does not, even though nothing this ticket touched caused
  it. `validateChallengeBrief` and `BRIEF_KEYS` (note 3's open item) are untouched, as planned; no
  row claims them.

  **Correction (stage 6 review, 2026-11-15):** the "pre-existing, unrelated" call above was wrong.
  This ticket's own branch (commit `a2ac5b6`, before this TDD cycle started) had already rewritten
  GLOSSARY.md's `setup record` entry, which is what made the failure happen; it was never present
  on `main`. See "Stage 6 review" and the corrected "Coverage report" above.
- 2026-11-15 (stage 7): security review report at
  `../../.proj.specs/0010-primary-locale-layout/review/security-T-0076.md` (base `65de8c0`, HEAD
  `a2ac5b6`, committed, unstaged and untracked layers; one candidate pass, one independent
  false-positive check per candidate). Sixteen candidates: one confirmed, SR-1 (C1, Low, 0.85, latent
  until T-0081/T-0077 wire the callers): a collection key in front matter makes `yaml`'s `toJS` call
  `process.emitWarning` (`create-wxl/src/layout-move.mjs:83-86`, `.vitepress/challenge/declaration.ts:17-18`),
  breaking D144 and passing DEL/C1 unescaped to the terminal; the proposed fix needs a traceability
  revision of D110/D129 first. Fifteen rejected with their rationale; follow-ups T-1–T-6 and non-security
  observations O-1–O-6 are recorded there for the user's decision. Nothing in the reviewed change was edited.

## Stage 6 review

Two independent axes, Standards and Spec, reviewed the WIP packet (base `65de8c0`, HEAD `a2ac5b6`,
unstaged and untracked files). Disposition below under the user's standing authorization of
2026-11-15. A finding named by both axes is listed once, under both ids. "Fixed" entries changed
code, tests or this ticket's own text; "declined" entries are left as found, with the reason;
"needs decision" entries reach outside this ticket's approved scope or this ticket's own file.

### Fixed

| Id(s) | Severity | Finding | Fix |
|---|---|---|---|
| Standards-S1, Spec-S1 | high | This branch's commit `a2ac5b6` rewrote GLOSSARY.md (`setup record`, `upstream`, `primary locale` and four other entries) ahead of schedule — `tickets.md` assigns all of B90 except U135's sentences to T-0077 and names T-0077, not T-0076, as the ticket that writes GLOSSARY.md. The rewrite dropped the sentence `create-wxl/test/upstream-config.test.mjs:415` asserts on, failing `pnpm --dir create-wxl test`. | Restored `GLOSSARY.md` to its `65de8c0` text (`git show 65de8c0:GLOSSARY.md`, written back with `cp`, not `git checkout`/`restore`). `pnpm --dir create-wxl test` is now green. |
| Standards-S2 (part of Spec-S1) | high | The coverage report called the failure "pre-existing on `main`", verified only by reading the checkout's *current* `GLOSSARY.md` rather than `git show 65de8c0:GLOSSARY.md`, so it missed that this branch had changed the file. | Coverage report rewritten with the actual cause, the `git diff 65de8c0 a2ac5b6 -- GLOSSARY.md` evidence, and the corrected test counts; the Comments entry that repeated the wrong call now carries a correction. |
| Standards-X1, Spec-S3 | high (Standards graded it under "correctness, not this axis"; Spec graded it medium) | `planLayoutMove`'s `declare` op has no `from` or `path` field, so a `target-exists` failure on a `declare` op's `to` reported `path: undefined` (`from ?? op.path` with both undefined), violating the `Failure.path: string` contract (U-§1). | TDD: added a failing test (`create-wxl/test/layout-move.test.mjs`, U29 describe block, "fails target-exists for a declare op") confirmed red, then gave the `declare` op a `from: f.path` field (the English brief's path) and simplified the failure loop to `path: op.from` for both `move` and `declare`. Confirmed green; the existing `toMatchObject` assertions on `declare` ops are unaffected by the new field. |
| Standards-S7, Spec-S4 | medium | `.vitepress/primary-locale.ts` and `.vitepress/source-layout.ts` imported siblings (`./locales`, `./layout-error`) without the `.ts` extension the "Module and test files" table requires (D114/D123: Node's `--experimental-strip-types` loads these without a bundler and does not resolve extension-less relative specifiers). | Added the `.ts` extension to both imports. Verified directly: `node --experimental-strip-types` importing both modules now succeeds (it would have thrown `ERR_MODULE_NOT_FOUND` before). Vitest was green either way, since Vite resolves extensions; this only mattered for D114's future Node loader. |
| Standards-S14, Spec-S5 | medium | `declaration.ts`'s header comment claimed `readChallengeDeclaration` parses "with the same rules as the transform (D110, D129)", but the code never checks `doc.errors`/`doc.warnings` (D129's `invalid-yaml` test) and never returns `{ ok: false }` or a `path` field (the seam 0010-S32 shape). | Corrected the comment to state plainly that this ticket claims only Y7 and Y8 (note 4) and that the `ok: false`/`path` shape and the D129 error/warning check are T-0077's rows (Y2–Y6); no behaviour changed. Implementing the missing checks now would be new scope, not a fix — see "needs decision" below is not needed since the *comment* was the defect, not the (intentionally partial) behaviour. |
| Standards-S3 | medium | Ticket `status` was `processing` on entering stage 6, but workflow's stage 6 entry condition and issue-tracker.md both expect `review`; the only reason the last Comments gave for staying `processing` (the create-wxl failure) is now gone. | Set `status: review` (issue-tracker.md: `review` is "set by: the agent"). |
| Standards-S6 | low–medium | "Decisions to confirm before implementing" named D97, D98, D99, D114, D115, D116, D129, D140 and D143, but not D144, even though the implementation and U25 both carry D144 and the Context prose mentions it. | Added D144 to the list. |
| Standards-S4a | medium | The coverage report's "Nothing reads the new modules" `git grep` claim had no recorded command or output. | Reproduced with `git grep -n --untracked -- "<name>" -- '*.ts' '*.mjs'` per module, filtered to `import`/`require` lines outside `node_modules`; recorded the command and the result (sibling cross-imports and test files only) in the coverage report. |
| Standards-S4b | low–medium | U21 asks the coverage report to record the fixture's `git hash-object` equal to `git rev-parse 65de8c0:platform/challenge/door-is-open/index.md`; the report only had the word "hash-verified", no values. | Ran both commands (`ac04968675d1373d7b666738634ea1ed3e6c91de` for each) and recorded them in the coverage report. |
| Standards-S5, Spec-S2, Standards-X4 | medium (Standards), medium (Spec) | This ticket's own text contradicted itself on `validateChallengeBrief`/`BRIEF_KEYS`: the zh-TW section and note 3 said they land here as working tests; the Comments and the code (`.vitepress/challenge/config.ts` exports only `validateChallengeDeclaration`) said untouched; note 3 also pointed at a "Stage 6 review" section that did not exist yet. | Rewrote the zh-TW section and note 3 to state the actual, settled outcome (untouched, left to T-0077) and to stop pointing at a section that wasn't there. `tickets.md`'s own T3 row ("Met... `validateChallengeBrief`") still needs the same correction — that edit is outside this ticket's file and is listed under "needs decision" below, since it is a cross-ticket ledger, not this ticket's own text. |
| Standards-S18 | low | The Stage 8 AC line had its own "not yet true" conclusion folded into the unchecked box's text ("pre-existing and unrelated"), which S2 shows was wrong. | Checkbox checked and reworded now that both suites are green; points at "Stage 6 review" instead of asserting a conclusion inline. |
| Standards-S8, Spec-S19 | medium, low | Stage 8's acceptance text was narrowed during implementation ("touches no file the build/hook/upgrade reads" → "adds no new import") with no Comments entry recording why. | Added a note under "Stage 8" explaining the two statements were in tension from the plan's own approval (the "Module and test files" table always named `config.ts`), not from an unrecorded later change, and that stage 6 is the first place this got written down. |
| Spec-S7 (reasoning only) | low | The B5 row's boundary-conditions text claimed a `stat`-based implementation would give "`PL-E02` with `ENOENT`" on a dangling link; `PL-E02`'s own definition ("Build error codes") excludes `ENOENT` — a `stat`-based bug would instead silently return the default locale. | Corrected the row's text. The dangling-link case itself (rather than traceability.md's B5 row's valid-target link) is this ticket's own already-approved substitution, with its own stated rationale in the same row — not reopened; see "declined" below. |
| Standards-S11, Spec-S7 (skip reason) | low | B5's `win32`-skipped symbolic-link and FIFO cases had no stated reason, though the row text requires one. | Added the reason to each test's title (`symlinkSync` needs elevated privileges on `win32`; there is no `mkfifo` there). |
| Spec-S9 | low | Y16's `source_visible: false` and `source_visible` absent cases asserted only a message prefix, not Y-§2.5's verbatim full message. | Tightened both regexes to the full message, anchored with `$`. |
| Standards-S15, Spec-S21/S18 (version reference only) | low | The ticket's Context cites `traceability.md` revision 2 for seams this ticket uses, but D143 and D144 (both decisions this ticket confirms) only exist in traceability's "Revision 2.1" addendum; `spec.en.md`'s own header and prose were never bumped to 2.1. | Added a note to the Context's Spec line recording the 2.1 amendment and flagging the un-bumped `spec.en.md` header/prose as a decision for the user (below) rather than silently rewriting spec prose, which issue-tracker.md reserves for a dedicated revision pass. |

### Declined

| Id(s) | Severity | Reason |
|---|---|---|
| Standards-S4c | medium | The mutation-check script is ephemeral per the stage 5 process; the table already records the command and the red/green result per seam, which is what stage 5 asks for. |
| Standards-S4d | medium | WIP tests are not pinned to a commit because the branch is still open; the claims that *do* compare against another commit (U21, D143/D144) are pinned, and S4b's fix adds the missing values for U21. |
| Standards-S9 | low–medium | `layout-move.test.mjs`'s U22–U26 decode to a string before comparing. Every fixture in those cases is well-formed ASCII/UTF-8; a few cases (U23, U26) already assert raw `Buffer` equality where BOM-vs-ASCII bytes are the point. Tightening every assertion to a byte literal is a test-rigor improvement with no behaviour change; left for a follow-up tidy pass to keep this review's diff scoped to defects. |
| Standards-S10, Spec-S8 | low–medium | B2–B4 and B8–B13 call `parsePrimaryLocale` directly rather than through a temp-directory file. `parsePrimaryLocale` is `readPrimaryLocale`'s entire post-file-read behaviour (the file read itself is B1, B5, B6, B7); the AC text names `readPrimaryLocale` but the row intents B2–B4/B8–B13 describe JSON/value shapes, not file-system behaviour, and are exercised through the file path too by B7–B10 in the same describe blocks. |
| Standards-S12, Spec (implied by S9/rigor group) | low | B10's expected lines are built from a `quoted` template literal rather than six separate string literals. Each line is still a literal assembled from the row's own stated pieces, not recomputed from the implementation; declined as a style choice, not a defect. |
| Standards-S13, Spec-S11 | low | U27's "no front matter" case uses `toContainEqual` and U28's "untouched" cases don't assert the move-only `platform/index.md` op; both are assertion looseness, not wrong behaviour — every case already in the suite passes under the exact assertion too (checked by hand). Left for the same follow-up tidy pass as Standards-S9. |
| Standards-S12 (D144 ESC bytes), Spec-S12 | low | D144's tests write `"\u001b"` as a YAML escape rather than a raw ESC byte in the source line. The value genuinely holds U+001B either way (yaml's escape decoding is exercised, not bypassed); a raw-byte variant would test the same `parseStrict`/`doc.warnings` path a second time. |
| Standards-S16, Spec-S20 | low–medium | Coverage is "not measured" because `@vitest/coverage-v8` is not installed in either workspace, and installing one is outside the executor's named touch list; the mutation-check table is the stated substitute. Accepted as-is; installing a coverage provider is new scope for this ticket. |
| Standards-S17 | low | `a2ac5b6` also updates T-0059's and T-0060's `revisit_when` (not T-0058 — rechecked, that finding's claim about T-0058 does not reproduce: `git diff 65de8c0 a2ac5b6 --stat` touches no T-0058 file). Both edits are the same stage-4 epic-breakdown commit redirecting pending tickets at the new tickets that absorb their scope (T-0077, T-0079), not functional scope creep into T-0076. |
| Standards-M1–M12 (smells) | low (M1, M8 medium) | Judged, not fixed, per the smell baseline's own convention: M1 (duplicated `validateChallengeDeclaration`/`validateChallengeConfig`) and M4 (duplicated `isLegacyPage`/`classifySourcePath` logic) are the Context's explicit expand-then-contract plan — T-0077 removes the old function and U136/B95 add the consistency tests. M2, M3, M8 (return shape, message wording, misleading `{ok:true}` type) are T-0077's rows (Y12, Y19) or already addressed by the Standards-S14 comment fix. M5 (two `Locale`/`LOCALES` modules) converges when T-0077 switches the site over. M6 (a redundant, always-true guard in `planLayoutMove`), M7 (unused `_primary` parameter, required by D116's signature), M9 (repeated test setup), M10 (abbreviated names `pl02`, `enDecl`/`trDecl`) and M11 (`planLayoutMove`/`trySplit` length) are cosmetic, no behaviour change. M12 (`isDeclaredSlug`'s O(n²) scan) is negligible at a challenge range's real file counts. |
| Standards-X2, Spec-S15 | low | A front-matter line starting with CR (e.g. bytes `\r\r\n`) is read as a key line, not a continuation, differing from U-§1's "continuation lines start with space, tab, `#`, CR or LF". Such a line almost always fails parsing anyway (the loose byte, not a valid YAML key start) and turns into a `frontmatter` failure either way — fails safe, not silently wrong; no row's boundary conditions name this byte. |
| Standards-X3 | low | An all-empty front matter (`---\n---\n`) parses to `null`, not a plain mapping, and is reported as a `frontmatter` failure. The spec is silent on this exact case; failing safe (stopping the move) rather than guessing is the conservative reading, consistent with every other "not a plain mapping" case `trySplit` already rejects. |
| Spec-S6 | low–medium | `validateChallengeDeclaration`'s return value still carries `description` and `fs`, and drops `number`; a non-string `app` is not yet rejected. All of this is the declaration's full typed shape and unknown-key passthrough, which the ticket's own Context assigns to T-0077 (Y12, Y19) as part of the expand-then-contract move; `validateChallengeConfig` stays unchanged, so nothing regresses. |
| Spec-S7 (dangling vs. valid-target link) | low–medium | The ticket's own B5 row (already approved under the standing authorization) substitutes a dangling-target link for traceability.md's valid-target link, with its own stated reason in the same row (proving `lstat` not `stat`, and avoiding the B1/ENOENT default-locale confusion the corrected reasoning above describes). Not reopened: it is this ticket's approved plan, not an unapproved deviation from it. |
| Spec-S13 | low | SC5's branch (`layout-move.mjs:228-243`) has no dedicated test case and is not touched by the mutation check. A coverage gap, not an observed wrong behaviour; closing it is new test-plan content (new scope) under hard rule 2, not a stage 6 fix. |
| Spec-S14 | low | An integer-like front-matter key (e.g. a bare `2:`) can make `Object.keys` reorder it ahead of string keys, which could make SC4's order check misjudge a well-formed front matter as `frontmatter`. An extreme edge case outside every row's named boundary conditions; it fails safe (stops the move) rather than silently corrupting one. |
| Spec-S16 | low | A translation brief under a D116-excluded sub-path is still matched by `TRANSLATION_BRIEF_RE` and can be read as `orphan-brief`, stopping the move, even though `classifySourcePath` would call the same path `excluded`. The spec's "translation brief" definition (traceability:1330) does not require page-ness; `isLegacyPage`'s own exclusion already keeps excluded areas out of the legacy-page loop, so this only affects the second (translation-brief) loop, which does not filter on `isLegacyPage`. Narrow edge case, fails safe. |
| Spec-S17 | low | A `move` op's `content` is the same `Uint8Array`/`Buffer` object as the input file's `bytes`, not a defensive copy. `planLayoutMove` has no I/O and no documented promise that its output is independent of later mutation of its input; no row tests mutation-after-return. |
| Spec-S22 | low | `spec.zh-TW.md`'s TB11 wording change (程序 → 行程) is a correct Taiwan-wording fix, hand-edited rather than regenerated. The content itself is accurate and the change is harmless; reverting it to satisfy process would remove a correct fix for no functional reason. The right fix — regenerating through the proper sync step — is a process question for the next spec-touching ticket, not a code defect in this one. |
| Spec-S23 | low | The gap between `lstatSync` and `readFileSync` in `readPrimaryLocale` (a TOCTOU window) reads a file in the teacher's own build environment, not attacker-controlled input; flagged for the security axis, not fixed here as a Standards/Spec-review disposition. |

### Needs decision

| Id(s) | Severity | Why it needs the user |
|---|---|---|
| `tickets.md` T3 row (from Standards-S5, Spec-S2) | medium | `tickets.md`'s claim table still says T3 is "Met" because T-0076 lands `validateChallengeBrief`; it does not. Fixing the claim table is a cross-ticket ledger edit, outside this ticket's own files and outside what this review's scope covers; needs the user (or the next ticket touching `tickets.md`) to correct it, and to decide whether `validateChallengeBrief`/`BRIEF_KEYS` land here after all (as the zh-TW section once said) or stay T-0077's (as the Comments and the code already show). |
| `spec.en.md` revision bump (from Standards-S15, Spec-S18/S21) | low–medium | `traceability.md` has a "Revision 2.1" addendum (D143, D144); `spec.en.md`'s header still reads "revision 2", and its upgrade-prose paragraph on the single-file-brief case (around "a single-file brief and a legacy target") was not updated with D143's `index` exception, nor was the mismatch-definition passage updated for D144's "`parse` is never called". Issue-tracker.md reserves prose spec edits for a dedicated revision pass, not a stage 6 code-review fixup; needs the user to schedule that pass (likely alongside T-0077, which is next to touch this spec). |

### Rerun

- Affected tests immediately after each fix: `tests/unit/site/primary-locale.test.ts`, `tests/unit/i18n/locales.test.ts`, `tests/unit/site/source-layout.test.ts`, `tests/unit/challenge/declaration.test.ts`, `tests/unit/challenge/config.test.ts` (170 tests, all passed) and `create-wxl/test/layout-move.test.mjs` (57 tests, all passed) and `create-wxl/test/upstream-config.test.mjs` (26 tests, all passed).
- Both full suites, rerun at the end since GLOSSARY.md changed: `pnpm test --run` — **141 test files passed, 5042 tests passed, 1 skipped** (down from 5082 passed; the 40-test drop is `tests/unit/site/glossary.test.ts`'s `it.each` blocks losing the cases for the six entries the GLOSSARY.md revert removed — that file's own 290 tests still pass in full, confirmed separately). `pnpm --dir create-wxl test` — **39 test files passed, 844 tests passed, 1 skipped** (up from 38 passed/1 failed/842 passed before; now fully green, +1 test from the new declare-op `target-exists` case).

## Stage 7 security review

Disposition under the user's standing authorization of 2026-11-15, against
`../../.proj.specs/0010-primary-locale-layout/review/security-T-0076.md` (base `65de8c0`, HEAD
`a2ac5b6`). One confirmed finding, SR-1 (candidate C1); the other fifteen candidates were rejected
in that report and carry no disposition here.

| Id | Severity | Disposition | Why |
|---|---|---|---|
| SR-1 (candidate C1): a collection-type front-matter key makes `yaml`'s `toJS` call `log.warn` → `process.emitWarning`, writing to stderr and bypassing D144, in `parseStrict` (`create-wxl/src/layout-move.mjs:76-91`) and `readChallengeDeclaration` (`.vitepress/challenge/declaration.ts:14-20`) | Low | **Fixed** | The traceability revision this disposition originally needed landed as D145 (revision 2.2, `traceability.md:3401-3409`), approved under the user's standing authorization of 2026-11-15; with D145 adopted, this is no longer a spec change outside this execution's scope. Fixed under D145 in this pass — see "Stage 7 fixes" below. |

**Investigated during this pass, not applied:** reading `yaml@2.9.0`'s own source
(`dist/doc/Document.js:30-44`, `dist/nodes/addPairToJSMap.js:39-61`, `dist/log.js:9-16`,
`dist/compose/composer.js:65-71,101-103`, `dist/compose/util-map-includes.js:1-13`,
`dist/public-api.js:40-59,60-79`) shows the collection-key warning at `addPairToJSMap.js:57`
(`log.warn(ctx.doc.options.logLevel, ...)`) is the *only* call reachable from `parseStrict`'s or
`readChallengeDeclaration`'s code path that can write to the terminal, and it is gated solely by
`doc.options.logLevel`. `doc.errors`/`doc.warnings` are populated by `composer.js`'s `onError`
unconditionally of `logLevel` (duplicate keys, unknown tags, etc. all still land there), and
`uniqueKeys` detection (`util-map-includes.js`) is gated only by the `uniqueKeys` option, not
`logLevel`. The `doc.errors = []` reset D144's text warns against only happens inside `yaml`'s own
`parse()` convenience function (`public-api.js:72-77`), which neither `parseStrict` nor
`readChallengeDeclaration` calls (`parseDocument` + a separate manual `toJS()` call, per D110). So
passing `logLevel: 'silent'` to `parseDocument` would suppress exactly SR-1's stderr write without
moving a single case between `ok: true` and `ok: false` — a smaller, non-semantic-changing
candidate than the report's own proposal, and one that corrects D144's current text ("`logLevel:
'silent'` is not used: it empties `doc.errors`"), which is accurate for `parse()` but not for the
`parseDocument` + manual `toJS()` call this code actually makes. This still edits a confirmed,
already-adopted decision's prose (D144) and D110's literal option list, so it is reported here as
input to the needs-decision row above, not applied unilaterally.

### Rerun

No file was changed by this pass (the finding above was investigated, not fixed), so nothing
needed rerunning as new evidence; `git rev-parse HEAD` is still `a2ac5b6` and `git status
--porcelain=v1 -uall` is still the same 22 lines as the security report recorded. The suites
already green from "Stage 6 review → Rerun" stand: `pnpm test --run` (141 files, 5042 passed, 1
skipped) and `pnpm --dir create-wxl test` (39 files, 844 passed, 1 skipped).

## Stage 7 fixes

SR-1 and O-1 (`review/security-T-0076.md`) fixed under D145 and revision 2.2's O-1
(`traceability.md:3401-3409`), approved under the user's standing authorization of 2026-11-15. One
seam/one test/one minimal change per cycle, per the confirmed increment plan; touched only
`create-wxl/src/layout-move.mjs`, `.vitepress/challenge/declaration.ts`, their two test files and
this ticket.

**SR-1 (D145), `create-wxl/src/layout-move.mjs`.** Added `hasNonScalarKey(doc)` to `parseStrict`
(walks `doc` with `yaml`'s `visit`/`isScalar`, called between the `doc.errors`/`doc.warnings` check
and `doc.toJS(...)`): a `Pair` whose key is not a `Scalar` now fails the parse (`{ ok: false }`)
before `toJS` can stringify it and have `yaml` write a warning to the terminal. Four cases added to
the existing `describe('U25: ...')` block in `create-wxl/test/layout-move.test.mjs` (top-level
`[x]: 1`, a collection key nested under `tags`, the explicit-key syntax `? [x]`, and an alias used
as a key): the first three were red before the fix (asserting `{ failures: [{ token: 'frontmatter',
path }] }` plus the three spies — `process.emitWarning`, `console.warn`, `process.stderr.write` —
never called); the alias case already passed beforehand through an unrelated existing check, as the
increment plan flagged as a possibility, and stayed passing after the fix. All four green after the
fix; suite 57 → 61 tests.

**SR-1 (D145), `.vitepress/challenge/declaration.ts`.** Added the same `hasNonScalarKey(doc)` check
(a separate implementation per D112: create-wxl cannot import the site's modules) to
`readChallengeDeclaration`, between `parseDocument(...)` and `doc.toJS(...)`: a non-scalar key now
throws before `toJS` is called, consistent with this function's current "throws on a parse failure"
contract (note 4; the `ok: false`/`path` shape is T-0077's Y2–Y6). Four working tests added (claim
no row) in a new `describe('D145: ...')` block in `tests/unit/challenge/declaration.test.ts`, same
four cases, asserting `toThrow()` plus the same three spies never called: the top-level and nested
cases were red before the fix; the explicit-key and alias cases already passed beforehand (the
explicit-key case differed from the create-wxl side here — flagged as a possible outcome by the
increment plan's risk note) and stayed passing after. All four green after the fix; suite 2 → 6
tests.

**O-1, `create-wxl/src/layout-move.mjs`.** The translation-brief mismatch loop read
`enDecl[key]`/`trDecl[key]` by plain index, so an absent key on one side read `Object.prototype`'s
inherited property instead of `undefined`, which could swallow a genuine mismatch (e.g. `__proto__:
{}` present only on one side, both sides' `Object.keys()` empty, `deepEqual` judging them equal).
Changed both reads to `Object.hasOwn(enDecl, key) ? enDecl[key] : undefined` /
`Object.hasOwn(trDecl, key) ? trDecl[key] : undefined` (the security report's own suggested fix). One
test added to the existing `describe("U47: ...")` block in `create-wxl/test/layout-move.test.mjs`
(`__proto__: {}` in the translation brief only, English brief without it), asserting
`mismatches` equals `[{ brief, key: '__proto__', enValue: undefined, value: {} }]`: red before the
fix (`mismatches` was `[]`), green after. Suite 61 → 62 tests.

**Test counts (exact).**

| Command | Before this pass | After this pass |
|---|---|---|
| `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | 57 passed | 62 passed |
| `pnpm vitest run tests/unit/challenge/declaration.test.ts` | 2 passed | 6 passed |
| `pnpm test --run` | 141 files, 5042 passed, 1 skipped | 141 files, **5046 passed**, 1 skipped |
| `pnpm --dir create-wxl test` | 39 files, 844 passed, 1 skipped | 39 files, **849 passed**, 1 skipped |

**Mutation checks (python3 edit → confirm changed → red → restore → confirm changed back → green),
one per new guard/fix:**

| Guard / fix | Mutation | Command | Result |
|---|---|---|---|
| D145 guard, `create-wxl/src/layout-move.mjs` (`hasNonScalarKey`) | `if (!isScalar(pair.key))` → `if (isScalar(pair.key))` | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 16 failed/46 passed), restored=True, green (exit 0, 62 passed) |
| D145 guard, `.vitepress/challenge/declaration.ts` (`hasNonScalarKey`) | `if (!isScalar(pair.key))` → `if (isScalar(pair.key))` | `pnpm vitest run tests/unit/challenge/declaration.test.ts` | changed=True, red (exit 1, 2 failed/4 passed), restored=True, green (exit 0, 6 passed) |
| O-1 fix, `create-wxl/src/layout-move.mjs` (own-property read) | `Object.hasOwn(enDecl, key) ? enDecl[key] : undefined` / same for `trDecl` → plain `enDecl[key]`/`trDecl[key]` | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 1 failed/61 passed), restored=True, green (exit 0, 62 passed) |

File content was verified restored byte-for-byte after each mutation (`grep` for the original guard
text) before moving to the next check.

No `git commit`/`stash`/`checkout`/`switch`/`reset`/`restore` was run.

## Stage 7 fixes — delta review (2026-11-15, executor pass)

A read-only delta review of the SR-1/O-1 fix above raised findings F1–F11. Disposition below under
the user's standing authorization of 2026-11-15; "fixed" entries are TDD cycles (failing test
confirmed red before the change, green after, mutation-checked); "declined" entries are left as
found, with the reason. Only findings inside D145's own guard and U25/U47's test coverage of it were
in scope; findings that would expand D145 itself, or that lie outside those two rows, needed a
decision and were not applied.

### Fixed

| Id | Finding | Fix |
|---|---|---|
| F2 | The alias-as-key case in both `create-wxl/test/layout-move.test.mjs:341` and `tests/unit/challenge/declaration.test.ts:83` used `*n: 2` (no space before the colon). Reproduced directly: `yaml` itself raises `BAD_ALIAS`/an "implicit map keys" error for that exact spelling, so `parseStrict`'s pre-existing `doc.errors`/`doc.warnings` check (or, on the declaration side, `toJS`'s own "unresolved alias" exception) already fails the case with the D145 guard physically removed — the test passed regardless of the guard's presence. | **`tests/unit/challenge/declaration.test.ts`** (no front-matter grouping there): added a space, `*n : 2`; confirmed red with the guard short-circuited to `return false` (4/4 D145 cases fail, including this one) and green restored (6/6 pass). **`create-wxl/test/layout-move.test.mjs`**: a top-level alias key always starts its own front-matter group (U-§1 "key line"), so even with the space fix, `trySplit`'s *group-level* reparse of the isolated `*n : 2` line loses the anchor and still fails on "unresolved alias" regardless of the guard (reproduced: still 3/4, not 4/4, red with the guard removed). Rewrote the case to nest both the anchor and the alias inside one group's value (`tags:\n  number: &n 1\n  *n : 2\n`, mirroring the existing "collection key nested under tags" case's shape) so the anchor stays in scope for the group-level reparse too. Confirmed red with the guard short-circuited (4/4 D145 cases fail this time, this one included) and green restored (63/63 pass). |
| F3 | U47 (and revision 2.2's O-1 text, `traceability.md:3415`, "U47 gains **the two cases**") named `__proto__` and `constructor`; only the `__proto__` case had landed. | Added `create-wxl/test/layout-move.test.mjs`'s "a constructor key present only in the English brief …" case to the `U47` `describe` block (English brief: `constructor: 5`; translation: absent), asserting `mismatches` equals `[{ brief, key: 'constructor', enValue: 5, value: undefined }]`. Confirmed red with the own-property fix reverted to a plain index (`value` becomes the inherited `Object` constructor function, not `undefined`: 2/2 of the `__proto__`/`constructor` cases fail) and green restored (63/63 pass). |

**Test counts (exact).**

| Command | Before this pass | After this pass |
|---|---|---|
| `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | 62 passed | 63 passed |
| `pnpm vitest run tests/unit/challenge/declaration.test.ts` | 6 passed | 6 passed (same count; one case's fixture text changed) |
| `pnpm test --run` | 141 files, 5046 passed, 1 skipped | 141 files, 5046 passed, 1 skipped (unchanged) |
| `pnpm --dir create-wxl test` | 39 files, 849 passed, 1 skipped | 39 files, **850 passed**, 1 skipped |

**Mutation checks (python3 edit → confirm changed → red → restore → confirm changed back → green):**

| Guard / fix | Mutation | Command | Result |
|---|---|---|---|
| D145 guard, `create-wxl/src/layout-move.mjs` (`hasNonScalarKey`) | short-circuited to `return false` (catches all four D145 cases at once, not just one) | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 4 failed/59 passed — all four D145 cases, including the rewritten alias one), restored=True, green (exit 0, 63 passed) |
| D145 guard, `.vitepress/challenge/declaration.ts` (`hasNonScalarKey`) | short-circuited to `return false` | `pnpm vitest run tests/unit/challenge/declaration.test.ts` | changed=True, red (exit 1, 4 failed/2 passed — all four D145 cases, including the alias one), restored=True, green (exit 0, 6 passed) |
| O-1 fix, `create-wxl/src/layout-move.mjs` (own-property read) | reverted to plain `enDecl[key]`/`trDecl[key]` | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 2 failed/61 passed — `__proto__` and the new `constructor` case), restored=True, green (exit 0, 63 passed) |

File content was verified restored byte-for-byte after each mutation (`grep` for the original guard/
fix text) before moving to the next check. Full suites rerun once at the end, after all three fixes:
`pnpm test --run` — 141 files, 5046 passed, 1 skipped; `pnpm --dir create-wxl test` — 39 files, 850
passed, 1 skipped.

### Declined

| Id | Finding | Reason |
|---|---|---|
| F1 | A scalar key tagged `!!binary` or `!!timestamp` is still a `Scalar` node (`isScalar` is true), so `hasNonScalarKey` does not catch it; `yaml`'s `toJS` then stringifies it (via `addPairToJSMap.js`'s `stringifyKey`, confirmed by direct reproduction: `doc.errors`/`doc.warnings` stay empty and `process.emitWarning` fires) and still writes to stderr, missing D144's goal for this one scalar-key shape. | ~~Real, reproduced.~~ **Superseded by D146 — fixed on the `create-wxl`/`layout-move.mjs` side** (`planLayoutMove` now fails these as `frontmatter`, no spy called); the `.vitepress/challenge/declaration.ts` side was not edited in that pass — see "Stage 7 fixes — D146" below for why and what is still open. |
| F4 | The existing mutation check for the D145 guard (`if (!isScalar(pair.key))` → `if (isScalar(pair.key))`) proves the guard affects *some* tests (16 failed) but not specifically that the D145 rows themselves depend on it, since the four D145 cases all also contain plain scalar keys (`title`, `layout`) that the inverted condition also trips. | Declined as a separate ticket edit, same precedent as stage 6's Standards-S4c ("the mutation-check table... is what stage 5 asks for"; mutation checks are evidentiary, not part of the shipped change). Addressed anyway as a side effect of this pass's own verification: the mutation checks recorded above for F2/F3 use `return false` instead, which isolates exactly the four D145 cases (and the two O-1 cases), giving the more precise evidence F4 asked for without a separate "fix". |
| F5 | `tests/unit/challenge/declaration.test.ts`'s `toThrow()` has no message argument, so any exception makes the case pass. | Reproduced and found narrower than stated: with the guard physically removed, the top-level, nested, and explicit-key cases already throw nothing at all (`toJS` succeeds silently, only warning) — `toThrow()` alone already distinguishes guard-present from guard-removed for those three. Only the alias case was genuinely non-discriminating, and F2's fix (confirmed by the `return false` mutation above: all four cases, including alias, now fail together) already resolves it as a side effect. Tightening the other three to a message regex would be a style improvement with no added discriminating power — the same kind of finding stage 6 declined under Standards-S13. |
| F6 | `!!merge` can still run a merge through `addPairToJSMap`'s `key.addToJSMap` path even with `merge: false`, bypassing D129's "`<<` is an ordinary key" for an explicitly tagged key. | ~~Real.~~ **Superseded by D146 — fixed** on both call sites' underlying `parseDocument` behaviour: with `resolveKnownTags: false`, the `!!merge` tag is no longer resolved to the merge type at all, so `foo: {x: 1}` tagged `!!merge` is kept as an ordinary `foo` key with value `{x: 1}`, not merged, regardless of `merge: false`. On `create-wxl`/`layout-move.mjs`, this additionally fails the parse as `frontmatter` (shipped, tested). On `.vitepress/challenge/declaration.ts`, the merge-bypass itself is independently confirmed closed by the same option (verified directly against `yaml@2.9.0`, not applied to that file in this pass since `readChallengeDeclaration` would still return `ok: true` instead of throwing) — see "Stage 7 fixes — D146" below. |
| F7 | `deepEqual` treats any two `Date`/`Map`/`Set` values as equal (`Object.keys` is empty for all three), so a `!!timestamp`/`!!set`/`!!omap` mismatch across locales is silently dropped. | ~~Real.~~ **Superseded by D146 — fixed.** `deepEqual` only exists in `create-wxl/src/layout-move.mjs`; with `resolveKnownTags: false`, `parseStrict` now fails these as `frontmatter` before a value ever reaches `deepEqual`'s mismatch loop, so no `Date`/`Map`/`Set` is ever compared. See "Stage 7 fixes — D146" below. |
| F8 | The guard also now rejects front matter that previously passed silently (a `!!set`/`!!omap` collection key), a behavior change D145's own text already covers ("a mapping key that is not a scalar"), just not called out in prose. | Not a defect. Declined as a documentation-only observation, consistent with the report's own "not a violation" read of the same point. |
| F9 | `hasNonScalarKey` sits outside `parseStrict`'s own try/catch, so a `RangeError` from `visit`'s recursion would propagate as an uncaught exception instead of `{ ok: false }`. | Not reproduced as reachable: compose-time recursion limits (`RESOURCE_EXHAUSTION`) land in `doc.errors` and are caught earlier at line 100, before `hasNonScalarKey` runs, and `visit`'s own frame depth is shallower than compose's. Low-confidence (0.3 per the report itself) and fails closed even if it did trigger; no test plan row covers it. |
| F10 | `declaration.ts` throws a generic `Error`, not an `invalid-yaml`-coded result, and its header comment is still inexact for non-read failures. | Intentional and already recorded: note 4 and the Context state this function "throws on a read or parse failure" until T-0077 lands Y2–Y6's `{ ok: false }`/`path` shape; not a regression from this pass. |
| F11 | `layout-move.mjs:251,259` read `keptParsed.value[p.key]`/`declParsed.value[p.key]` by plain index rather than an own-property check. | Not reachable under the surrounding key-count/`uniqueKeys` checks (the report's own 0.3-confidence read); a depth-defense improvement, not an observed wrong behaviour, and not one of U25/U47's named rows. Left for a future tidy pass, consistent with stage 6's disposition of similar low-severity, unreachable-in-practice findings (e.g. Standards-X2/X3). |

No `git commit`/`stash`/`checkout`/`switch`/`reset`/`restore` was run during this delta-review pass.

## Stage 7 fixes — D146

D145/revision 2.2's D146 (`traceability.md:3409`): both parsers pass `resolveKnownTags: false` to
`parseDocument`, so an explicit YAML 1.1 tag (`!!binary`, `!!timestamp`, `!!merge`, `!!set`, …) is an
unknown tag — a warning, hence a failed parse under D144's existing warning-is-failure check — closing
F1, F6 and F7 (above). Approved under the user's standing authorization of 2026-11-15, per the
confirmed increment plan. One seam/one test/one minimal change per cycle; touched only
`create-wxl/src/layout-move.mjs` and `create-wxl/test/layout-move.test.mjs` this pass — see "Not done"
below for why `.vitepress/challenge/declaration.ts` and `tests/unit/challenge/declaration.test.ts` were
left untouched.

**`create-wxl/src/layout-move.mjs`.** Four cases added to the existing `describe('U25: ...')` block in
`create-wxl/test/layout-move.test.mjs`, same shape as the existing D144/D145 cases (spy
`process.emitWarning`, `console.warn`, `process.stderr.write`; call `expectFrontmatterFailure`; assert
all three spies never called; restore in `finally`): `!!timestamp 2026-01-01: 1` and
`!!binary aGVsbG8=: 1` each as a top-level key, `!!merge foo: {x: 1}` as a top-level key, and
`tags: !!set\n  ? a\n  ? b\n` as a value. All four confirmed red before the change
(`pnpm vitest run test/layout-move.test.mjs`, cwd `create-wxl/`: 4 failed, 63 passed). Minimal change:
`layout-move.mjs:96`, `parseDocument(text, { schema: 'core', merge: false, uniqueKeys: true })` →
`parseDocument(text, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })`.
`parseStrict`'s existing `doc.errors`/`doc.warnings` check (added under D144, unchanged by D145) is
what turns the resulting "unresolved tag" warning into a failed parse — no new check was needed. All
four green after the change (67 passed). Suite 63 → 67 tests.

**Mutation check** (python3: edit → confirm changed → red → restore → confirm changed back → green):

| Guard / fix | Mutation | Command | Result |
|---|---|---|---|
| D146, `create-wxl/src/layout-move.mjs` (`resolveKnownTags: false`) | removed the option, restoring `parseDocument(text, { schema: 'core', merge: false, uniqueKeys: true })` | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 4 failed/63 passed — exactly the four D146 cases), restored=True, green (exit 0, 67 passed) |

File content was verified restored byte-for-byte after the mutation (`f.read() == original`) before
declaring green.

**Test counts (exact).**

| Command | Before this pass | After this pass |
|---|---|---|
| `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | 63 passed | 67 passed |
| `pnpm --dir create-wxl test` | 39 files, 850 passed, 1 skipped | 39 files, **854 passed**, 1 skipped |
| `pnpm test --run` | 141 files, 5046 passed, 1 skipped | 141 files, **5046 passed**, 1 skipped (unchanged: no root-suite file was touched) |

**Not done: `.vitepress/challenge/declaration.ts` and `tests/unit/challenge/declaration.test.ts`.**
D146's own text asks for "`readChallengeDeclaration` gets the same four as working tests" under the
same minimal edit (`resolveKnownTags: false` on both `parseDocument` calls). That edit does not make
the matching tests pass as instructed, verified directly against the project's own `yaml@2.9.0` in an
isolated scratchpad copy (no repo file touched by the verification): `readChallengeDeclaration`
(`.vitepress/challenge/declaration.ts:30-39`) checks only `hasNonScalarKey(doc)`, never
`doc.errors`/`doc.warnings` — that check is T-0077's (Y2–Y6; note 4). With `resolveKnownTags: false`
added, `yaml` does record an "Unresolved tag" warning for all four D146 cases, but nothing reads
`doc.warnings`, so `doc.toJS()` still succeeds and the function still returns `{ ok: true, value }`
instead of throwing — confirmed for all four: a `!!timestamp`/`!!binary` key becomes an ordinary string
key (`"2026-01-01"`/`"aGVsbG8="`), the `!!merge`-tagged key stays an unmerged `foo` key, and
`tags: !!set …` becomes a plain object — so `expect(() => readChallengeDeclaration(...)).toThrow()`
does not go red-to-green; it stays green throughout, same as without the edit. Per the hard rule
("an edit that cannot be applied as written... stop at that edit and report it, because guessing would
put an unreviewed decision into the checkout"), this half was not applied; neither file in this pair
was touched.

The safety-relevant part of F1 and F6 (stderr write, merge bypass) is independently confirmed closed
for `declaration.ts` too, *if* the same option were added there, even without any further code change:
with `resolveKnownTags: false` alone, none of `process.emitWarning`, `console.warn` or
`process.stderr.write` fires for any of the four cases, and the `!!merge` bypass does not occur
(verified the same way, in the same isolated scratchpad copy). What the minimal edit alone cannot do
on this side is make the parse *fail* (throw) for these four shapes, because nothing there reads
`doc.warnings`. This observation is reported as input to a decision, not applied.

Three ways to close this half, carried over unresolved from the increment plan (the parent gave
GO-AHEAD on the plan including this item as "stuck, needs your decision"), still open for the user:

1. Add `resolveKnownTags: false` to `declaration.ts`'s `parseDocument` call and rewrite the four
   matching `declaration.test.ts` assertions to check the resulting value/type (e.g. that the key or
   value is a plain string/mapping, not a `Date`/`Map`) instead of `toThrow()` — changes the literal
   assertion shape the task specified.
2. Add a `doc.warnings`/`doc.errors` check to `readChallengeDeclaration` (pulling a slice of T-0077's
   Y2–Y6 forward) so it throws on these four cases the same way `parseStrict` does — changes this
   function's current "assumes well-formed, throws on read/parse failure" contract documented in
   note 4, and overlaps the scope note 4 reserves for T-0077.
3. Defer these four `declaration.test.ts` cases to T-0077, where Y2–Y6 add the `doc.warnings` check
   as part of that ticket's own scope.

No `git commit`/`stash`/`checkout`/`switch`/`reset`/`restore` was run during this pass.

## Stage 7 fixes — final review (2026-11-15, executor pass)

A full, read-only final review against `traceability.md` revision 2.2 raised findings F1–F18 (no
git available to that pass, so base/HEAD and the diff were not verified there; "importers" was a
`Grep` scan of the working tree, excluding `.gitignore`d directories). Disposition below under the
user's standing authorization of 2026-11-15, same convention as the delta review: "fixed" entries
are TDD cycles (failing test confirmed red, green after, mutation-checked) or comment-only
corrections (no behaviour change, so no red/green cycle applies); "declined" entries are left as
found, with the reason; "needs decision" entries reach outside this ticket's approved scope, outside
this ticket's own file, or ask this ticket to choose among options the increment plan already left
open to the user.

### Fixed

| Id | Finding | Fix |
|---|---|---|
| F3 | `deepEqual` (`create-wxl/src/layout-move.mjs:53-69`) treats `NaN !== NaN`, so a well-formed brief whose value is the core-schema literal `.nan` fails SC4's group/full comparison (and SC5's joined-group comparison) and is wrongly reported as the `frontmatter` failure, inside this ticket's own D144/SC3–SC5 scope. | TDD: added a failing test (`create-wxl/test/layout-move.test.mjs`, new `describe('Final review F3: ...')` block, "a declaration group holding .nan still splits and declares (SC4/SC5)") confirmed red (`result.failures` was `[{ token: 'frontmatter', ... }]`, not `undefined`), then added one line to `deepEqual`: `if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true`, between the `a === b` check and the `typeof` check. Confirmed green (68 passed, up from 67). The `0`/`-0` sub-point and the `±Infinity`/downstream-serialization sub-points F3 also raised are declined below — the `===` check already above this new line already treats `0`/`-0` as equal, unchanged. |
| F5 | `.vitepress/challenge/declaration.ts:1-8`'s header comment claimed this function parses "with the same `parseDocument` call as the transform (D110)"; the transform's call gained `resolveKnownTags: false` under D146 (`.vitepress/challenge/declaration.ts` did not — see "Stage 7 fixes — D146", "Not done"), so the claim is now false, not merely imprecise. | Comment-only, no behaviour change: rewrote the claim to state the actual option object this file passes, and added a sentence naming the `resolveKnownTags: false` gap and pointing at "Stage 7 fixes — D146" for why it is still open. |
| F6 | `create-wxl/src/layout-move.mjs`: the `hasNonScalarKey` comment (then at lines 71-73) said a non-scalar key "would otherwise [have] `toJS` stringify it and have `yaml` write a warning", true for a collection key but not for an alias key whose anchor holds a scalar (`toJS` resolves it silently to that scalar, no warning) — D145's own traceability text (`traceability.md:3408`) states the alias case is excluded for an independent, policy reason, which the code comment did not carry. The `parseStrict` comment (then at lines 87-92) listed `parseDocument`'s options without `resolveKnownTags: false`, even though the call itself (line 96) passes it. | Comment-only, no behaviour change: reworded `hasNonScalarKey`'s comment to separate the two reasons (collection-key warning-avoidance vs. alias-key policy per D145/SR-1); added `resolveKnownTags: false` and a one-line D146 cross-reference to `parseStrict`'s comment's option list. |

**Test counts (exact).**

| Command | Before this pass | After this pass |
|---|---|---|
| `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | 67 passed | 68 passed |
| `pnpm --dir create-wxl test` | 39 files, 854 passed, 1 skipped | 39 files, **855 passed**, 1 skipped |
| `pnpm test --run` | 141 files, 5046 passed, 1 skipped | 141 files, 5046 passed, 1 skipped (unchanged: no root-suite file's behaviour changed; `declaration.ts`'s edit is comment-only) |

**Mutation check (python3: edit → confirm changed → red → restore → confirm changed back → green):**

| Guard / fix | Mutation | Command | Result |
|---|---|---|---|
| F3 fix, `create-wxl/src/layout-move.mjs` (`deepEqual` NaN case) | `return true` → `return false` on the new NaN-equality line | `pnpm vitest run test/layout-move.test.mjs` (cwd `create-wxl/`) | changed=True, red (exit 1, 1 failed/67 passed), restored=True, green (exit 0, 68 passed) |

File content was verified restored byte-for-byte after the mutation before declaring green. F5 and F6
are comment-only, so no mutation check applies to them (nothing in them is executable); both full
suites' unchanged pass counts after they landed are the evidence their edits changed no behaviour.

Both full suites rerun after this pass: `pnpm --dir create-wxl test` — 39 files, **855 passed**, 1
skipped; `pnpm test --run` — 141 files, 5046 passed, 1 skipped (exit 0; a `provider.listNodeModules`
`ECONNREFUSED` log in the sandbox's wasm-mutation step is pre-existing noise, not a test failure —
the run's own summary and exit code are unaffected).

### Declined

| Id | Finding | Reason |
|---|---|---|
| F3 (sub-points) | `0`/`-0` compare equal under `===` (not flagged as a mismatch); `.inf`/`1e999` give `±Infinity`, which a mismatch's `enValue`/`value` can carry forward (`JSON.stringify` would print `null`). | Low confidence (0.4 for `-0`) and, for the `Infinity`-into-`JSON.stringify` half, about a consumer (T-0081) this ticket does not have — the planner itself has no documented promise that a mismatch's values are JSON-safe. Narrower than F3's NaN half, which is the one case where the row's own comparison is actually wrong (not just unconstrained); left as found. |
| F4 | `yaml`'s `parser.js`/`composer.js` write to stdout via `console.log`/`console.dir` when the `LOG_TOKENS`/`LOG_STREAM` environment variables are set, bypassing `logLevel` and D144's current text entirely; no spy in the suite covers stdout. | Not reachable from the file tree a teacher/upgrade processes: only the operator's own shell environment can set these variables, and the already-investigated `logLevel: 'silent'` option (recorded under "Stage 7 security review", "Investigated during this pass, not applied") would not suppress them either, since they bypass `logLevel`. Same category as the already-declined Spec-S23 (a build-environment condition, not attacker-controlled input) — there is no option this code can pass to close it. |
| F7 | `layout-move.test.mjs`'s U25 `describe` text claims "SC1–SC6 each broken", but no case breaks SC5 alone. | Already declined, same finding: continuation of Spec-S13 ("Declined" table above), which this review itself names as its own precedent. |
| F8 | The SC3 duplicate-key case (`layout-move.test.mjs:233-235`) would still fail even with the `doc.errors` check removed, because the two values also differ and `uniqueKeys: true` is `yaml`'s own default. | Informational, as the finding's own severity note says — no missed behaviour, only a coverage observation about which guard a given case actually exercises; not a defect to fix. |
| F9 | Two of U25's D144/D145 spy-assertion cases (`layout-move.test.mjs:251-285`) would also pass with the relevant guard removed, since `parseDocument` itself never writes to the terminal for an unknown tag. | Informational, as the finding's own text says ("只是資訊性，沒有漏測行為" — no missed behaviour); only the `frontmatter` assertion half of those two cases carries discriminating power, which the suite already has. |
| F10 | U31's determinism test (`layout-move.test.mjs:683-701`) only asserts `toEqual` between two calls, so two calls that both returned the same `failures` would also pass. | Assertion looseness, not wrong behaviour — same follow-up-tidy-pass category as the already-declined Standards-S13/Spec-S11 (below) and Standards-S9. |
| F11 | U47's date case (`layout-move.test.mjs:623-629`) does not, by itself, rule out `deepEqual`'s Date-equality bug (F7 of the delta review); it currently passes only because D146 makes the parse fail before a `Date` value is ever produced. | The row's expected result still holds, and the production path is independently closed by D146; this is a note about a test's discriminating power, not an observed wrong behaviour in what ships — same "informational" category as F8/F9 above. |
| F12 | `deepEqual` itself still has no dedicated handling for `Date`/`Map`/`Set`/typed arrays; D146 only closes the one path that currently reaches it with such a value. | Speculative defense-in-depth for a parse path that does not exist yet (the finding's own confidence is 0.5); same category as the already-declined M6–M12 smells — a future parse path with different options is new scope for whichever ticket adds it, not a defect in this one. |
| F13 | Several existing assertions use `toContainEqual`/`toMatchObject` instead of an exact `toEqual`, so a row's full claimed shape is not pinned. | Already declined, same finding: the finding itself names this as the Standards-S13/Spec-S11 precedent above (assertion looseness, left for the same follow-up tidy pass). |
| F14 | B5's test case substitutes a dangling-target symbolic link for `traceability.md`'s valid-target-link example. | Already declined, same finding: the finding itself names this as the Spec-S7 precedent above (this ticket's own already-approved substitution, with its reason recorded in the same row). |
| F15 | `primary-locale.test.ts`'s B2–B4/B8–B13 cases call `parsePrimaryLocale` directly rather than through `readPrimaryLocale`'s file path, though the AC text names `readPrimaryLocale`. | Already declined, same finding: the finding itself names this as the Standards-S10/Spec-S8 precedent above. |
| F16 | `create-wxl/package.json`'s `files` field will ship `layout-move.mjs` as dead code in the next `create-wxl` release, since nothing imports it yet. | Not a defect — the finding's own text says it does not affect behaviour; this is exactly what T2/T3 (nothing reads the new modules until T-0077/T-0081) intends for this ticket. |
| F18 | The exported `LOCALES` array is mutable, and a caller that mutated it could desync `LOCALE_FOLDER_PREFIXES` (computed once at load) from later `.includes` checks. | Speculative — no existing caller mutates it, and no row depends on this invariant; the finding's own confidence is 0.4. Left for a future hardening pass if a caller that does this is ever added. |

### Needs decision

| Id | Why it needs the user |
|---|---|
| F1 | Restates the already-open "Stage 7 fixes — D146", "Not done" item: `.vitepress/challenge/declaration.ts` still has no `resolveKnownTags: false`, so a scalar key tagged `!!binary`/`!!timestamp` still reaches `toJS`'s `stringifyKey` and still writes to stderr through `process.emitWarning` on that file's side (F1 of the earlier delta review, D144's goal unmet there specifically). No new information beyond the earlier pass; still waiting on one of that section's three options. **Fixed by D147** (the invalid-yaml half is T-0077's Y2–Y6) — see "Stage 7 fixes — D147" above. |
| F2 | `traceability.md:3408-3409` (D145, D146) write as if `readChallengeDeclaration`'s `doc.errors`/`doc.warnings` check and `{ ok: false }` shape (D129, note 4) already exist, but note 4 assigns that check to T-0077 (Y2-Y6); `tickets.md` and `spec.en.md` do not state which ticket is responsible for `readChallengeDeclaration`'s half of D145/D146 in the meantime. Fixing the prose is a `traceability.md`/`tickets.md` edit outside this ticket's own files, and the three options already offered under F1 need the user's choice before that prose can be written correctly either way. **Fixed by D147** (the invalid-yaml half is T-0077's Y2–Y6) — see "Stage 7 fixes — D147" above. |
| F17 | Root `package.json`'s `"yaml": "^2.8.2"` is a caret range, while `create-wxl`'s is pinned to `2.9.0`; D79's "one parser" assumption and D145/D146's site-side analysis depend on `yaml@2.9.0`'s specific internals (only `stringifyKey` warns; `resolveKnownTags: false`'s exact effect). A lockfile keeps both at `2.9.0` today, but nothing stops them diverging on the next `pnpm update`. Pinning the root range is an edit to `package.json` outside this ticket's touched-file list (root dependency policy, not one of this ticket's five modules), so it needs the user (or whichever ticket next touches root dependencies) to decide whether to pin it. |

### Rerun

Affected test immediately after F3's fix: `pnpm vitest run test/layout-move.test.mjs` (cwd
`create-wxl/`), 68 passed. Both full suites, rerun once at the end of this pass:
`pnpm --dir create-wxl test` — 39 files, **855 passed**, 1 skipped (up from 854, the new F3 test);
`pnpm test --run` — 141 files, 5046 passed, 1 skipped (unchanged).

No `git commit`/`stash`/`checkout`/`switch`/`reset`/`restore` was run during this pass.

## Stage 7 fixes — D147

D147 (approved under the user's standing authorization of 2026-11-15, option 1 of the three the
"Stage 7 fixes — D146", "Not done" section left open): `readChallengeDeclaration`
(`.vitepress/challenge/declaration.ts`) passes `resolveKnownTags: false` to `parseDocument`, like
`planLayoutMove` does. The observable contract pinned here is only: on the four D146 inputs
(`!!timestamp 2001-01-01: 1` as a key, `!!binary aGk=: 1` as a key, `!!merge x: {k: v}` as a key,
`tags: !!set {a: null}` as a value — each inside an otherwise valid declaration with
`backend: flask` and `app: app.py`), `process.emitWarning`, `console.warn` and
`process.stderr.write` are never called, and the returned value never holds a `Date`,
`Uint8Array`/`Buffer`, `Set` or `Map`, and the `!!merge` key does not merge `k` into the top-level
mapping. Returning `invalid-yaml` for these inputs stays T-0077's (Y2-Y6); no `doc.warnings` check
was added.

**Tests.** `tests/unit/challenge/declaration.test.ts` gained a `describe('D147: ...')` block (claims
no traceability row, same precedent as the existing D145 block) with four cases, one per input
above, each spying on `process.emitWarning`, `console.warn` and `process.stderr.write` and
asserting: the spies are never called, `result.ok` is `true`, `result.value` equals the exact
plain-object shape yaml's own `toJS` returns for that input under `resolveKnownTags: false`
(confirmed directly against `yaml@2.9.0` before writing the assertions), and a recursive walk of
`result.value` holds no `Date`/`Uint8Array`/`Set`/`Map` instance. Confirmed red before the change
(`pnpm vitest run tests/unit/challenge/declaration.test.ts`): 4 failed, 6 passed (10) — the
timestamp and binary cases failed on the `emitWarning` spy (a `Date`/`Buffer` key reaches `toJS`'s
`stringifyKey`), the merge case failed on the value shape (`k` merged to the top level instead of
staying under `x`), and the set case failed on the value shape (`tags` held an actual `Set`).

**Minimal change.** `.vitepress/challenge/declaration.ts`:
`parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true })` →
`parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true, resolveKnownTags: false })`;
the header comment was rewritten to state the full option object this call now passes and to say
plainly that the `invalid-yaml` result for these four shapes is still T-0077's. Confirmed green
after the change: 10 passed (10).

**Mutation check** (python3: edit → confirm changed → red → restore → confirm changed back → green):

| Guard / fix | Mutation | Command | Result |
|---|---|---|---|
| D147, `.vitepress/challenge/declaration.ts` (`resolveKnownTags: false`) | removed the option, restoring `parseDocument(src, { schema: 'core', merge: false, uniqueKeys: true })` | `pnpm vitest run tests/unit/challenge/declaration.test.ts` | changed=True, red (exit 1, 4 failed/6 passed — exactly the four D147 cases), restored=True, green (exit 0, 10 passed) |

File content was verified restored byte-for-byte after the mutation (`f.read() == original`) before
declaring green.

**Test counts (exact).**

| Command | Before this pass | After this pass |
|---|---|---|
| `pnpm vitest run tests/unit/challenge/declaration.test.ts` | 6 passed | 10 passed |
| `pnpm test --run` | 141 files, 5046 passed, 1 skipped | 141 files, **5050 passed**, 1 skipped |
| `pnpm --dir create-wxl test` | 39 files, 855 passed, 1 skipped | 39 files, 855 passed, 1 skipped (unchanged: no `create-wxl` file was touched) |

Touched only `.vitepress/challenge/declaration.ts` and `tests/unit/challenge/declaration.test.ts`
this pass. No `git commit`/`stash`/`checkout`/`switch`/`reset`/`restore` was run during this pass.
