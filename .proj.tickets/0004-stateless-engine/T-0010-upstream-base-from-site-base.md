---
id: T-0010
title: Decide the upstream site's base from SITE_BASE
epic: 0004-stateless-engine
status: done
blocked_by: []
---

## Context

Today the VitePress config writes `base` inline as `process.env.SITE_BASE ?? '/'` and the three favicon hrefs are fixed at `/`; the GitHub Pages template runs `configure-pages` after the build and deliberately sets no `SITE_BASE`. The epic needs one base definition (A9) that every later ticket can rely on, and a template whose deployment supplies the base.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

The config defines `const siteBase = process.env.SITE_BASE || '/'` (A9) with `  base: siteBase,`, the three head hrefs follow `siteBase`, and a resolved base outside the base grammar throws naming `SITE_BASE`. The template runs `configure-pages` (id `pages`) before the `pnpm build` step, which sets `SITE_BASE: ${{ steps.pages.outputs.base_path }}/`. The parity test's SITE_BASE contract is inverted and the comments named in T83 for the config, template, parity test, toolchain-parity test, frozen baseline and LocaleSwitcher (with its test) are rewritten. This ticket's branch also commits the pending `GLOSSARY.md` section, the spec directories 0002–0004 (with `spec.zh-TW.md`) and the tickets of this epic.

## Acceptance criteria

- [x] T28: template steps, build env and header strings (S4)
- [x] T29–T31: config `base` and hrefs with `SITE_BASE` unset, empty, `/x/`, and invalid (S3)
- [x] T76: preview deployment — three favicon URLs 200, asset URLs under `/assets/`, `<title>` equals production's (S8)
- [x] T83: the config, template, parity, toolchain-parity, frozen-baseline and LocaleSwitcher rows (S9)

## 給使用者（zh-TW）

把上游網站的 base 改成由 `SITE_BASE` 決定：config 新增 A9 一行與 `base: siteBase`，三個 favicon 跟著它；GitHub Pages 範本把 configure-pages 移到 build 之前並設 `SITE_BASE`。parity 測試的契約翻轉、相關註解改寫。這張的分支也一起 commit GLOSSARY、0002–0004 三個 spec 目錄與本 epic 的 tickets。做完後：`SITE_BASE=/x/ pnpm build` 的 favicon 在 `/x/` 底下；preview 網站照常。

## Comments

### 2026-10-14 — test plan table (approved by the user before the first test)

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| S3 | `SITE_BASE` unset → `base` `/`, hrefs `/favicon.svg`, `/favicon.png`, `/apple-touch-icon.png` | config module, fresh registry per case | T29 / AC-H7 | unset |
| S3 | `SITE_BASE=''` → same as unset | config module | T29 | empty (`\|\|`) |
| S3 | `SITE_BASE=/x/` → `base` and the three hrefs under `/x/` | config module | T30 | one segment |
| S3 | `SITE_BASE=/a/b/` → `base` and hrefs under `/a/b/` | config module | T30 | two segments |
| S3 | `/sub`, `sub/`, `/../`, `/./`, `/a/../`, `/a b/` → module throws naming `SITE_BASE` | config module | T31 | base grammar |
| S4 | configure-pages has id `pages` and precedes `run: pnpm build` | template YAML | T28 / AC-H6 | step order |
| S4 | build `env.SITE_BASE` = `${{ steps.pages.outputs.base_path }}/` | template YAML | T28 | exact value |
| S4 | header contains `steps.pages.outputs.base_path`, none of the five stale strings | template text | T28 | header = comment block before the first non-comment line |
| S4 | "deliberately omits SITE_BASE" replaced by the three cases above; other parity assertions stand | parity test | T28, overridden contracts | step order departs from the baseline on purpose |
| S9 | `grep -F` record of T83's config, template, parity, toolchain-parity, frozen-baseline and LocaleSwitcher rows | comments | T83 / AC-D4 | forbidden and required strings |
| S8 | preview: three favicons 200, asset URLs under `/assets/`, both `<title>`s equal production's | preview deployment | T76 / AC-X2 | `/` and `/zh-TW/` |
| existing | full `pnpm test --run` stays green | all | — | none |

### 2026-10-14 — red → green log

1. S3 unset: passed on first run (today's behaviour; it also proved the config module imports under vitest).
2. S3 empty: red (`??` gave base `""`) → A9 `const siteBase = process.env.SITE_BASE || '/'` and `  base: siteBase,` → green.
3. S3 `/x/`, `/a/b/`: red (hrefs fixed at `/`) → hrefs built from `siteBase` → green.
4. S3 invalid values: red (no check) → base-grammar check throwing `SITE_BASE must be "/" or a path like "/my-repo/", got …` → green.
5. S4 three cases: red → configure-pages (id `pages`) moved before the build, build `env.SITE_BASE`, header rewritten → green.

Reproduce: `pnpm vitest run tests/unit/site/config-base.test.ts tests/unit/workflows/`.

### 2026-10-14 — S9 record (T83 rows of this ticket)

Command, per string: `grep -qF -- "<string>" <file> && echo present || echo absent`.

| File | Kind | String | Result |
|---|---|---|---|
| `.vitepress/config.mts` | forbidden | `rewrites this line to a plain literal` | absent |
| `.vitepress/config.mts` | forbidden | `MUST edit these hrefs` | absent |
| `.vitepress/config.mts` | forbidden | `Nothing in this repository sets SITE_BASE` | absent |
| `.vitepress/config.mts` | forbidden | `nothing sets SITE_BASE` | absent |
| `.vitepress/config.mts` | forbidden | `` rewrites the `base:` line `` | absent |
| `.vitepress/config.mts` | required | `hrefs follow siteBase` | present |
| `.vitepress/theme/components/LocaleSwitcher.vue` | forbidden | `` `pnpm fork:init --base` rewrites `` | absent |
| `tests/unit/i18n/locale-switcher.test.ts` | forbidden | `` `pnpm fork:init --base` rewrites `` | absent |
| `tests/unit/workflows/fork-template-parity.test.ts` | forbidden | `copies deploy.yml.template into every fork` | absent |
| `tests/unit/workflows/fork-template-parity.test.ts` | forbidden | `forks get a literal base instead` | absent |
| `tests/unit/workflows/fork-template-parity.test.ts` | forbidden | `rewrites .vitepress/config.mts to a plain literal` | absent |
| `tests/unit/workflows/fork-template-parity.test.ts` | required | `departs from the baseline` | present |
| `tests/unit/workflows/toolchain-parity.test.ts` | forbidden | `Forks still get a GitHub Pages workflow` | absent |
| `tests/unit/workflows/fixtures/upstream-deploy.yml` | forbidden | `forks still get a GitHub Pages workflow` | absent |
| `scripts/templates/deploy.yml.template` | required | `刻意偏離凍結基準` | present |

Rechecked after the stage 6 fixes: unchanged.

### 2026-10-14 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| S3 | `tests/unit/site/config-base.test.ts`, 10 cases | not measured: no coverage provider is installed in this repository | T29–T31 / AC-H7 | none |
| S4 | `fork-template-parity.test.ts`, 3 new + 7 existing | not measured | T28 / AC-H6 | none |
| S9 | 15 `grep -F` checks above | n/a | T83 / AC-D4 (this ticket's rows) | fork-init.ts and shortLink.ts rows belong to T-0012–T-0015 |
| S8 | — | — | T76 / AC-X2 | stage 8, on this ticket's preview deployment |

Full suite: `pnpm test --run` → 125 files, 2218 tests passed. No typecheck is configured in CI; none added.

### 2026-10-14 — stage 6 code review (Standards and Spec, independent `harness-reviewer` passes)

Snapshot: base and HEAD `c0f7edf`, final tracked WIP plus the new test file; GLOSSARY, `.proj.specs/`, `.proj.tickets/` excluded. No high-severity finding on either axis.

| Finding | Disposition |
|---|---|
| Spec F1, Standards F6: the frozen baseline's header did not state the template's deliberate departure | fixed: the fixture header now names it |
| Spec F2, Standards F2: the template header pointed at README's fork section, which still states the old rules until T-0016 | fixed: the pointer is removed. The header's `--host` wording belongs to T-0014, which implements `--host` (noted there) |
| Spec F3: "every range deployed to GitHub Pages" was imprecise | fixed: parity test, toolchain-parity test and fixture now say Cloudflare Pages ranges get none |
| Spec F4, Standards F1: ticket lacked the S9 record, the two tables, AC ticks and `status: done` | fixed in this record |
| Spec F5: T76 not yet verified | stage 8 |
| Spec F6, Standards F5: until T-0014, today's `fork:init --base` collapses `base: siteBase` into a literal while the hrefs read SITE_BASE; stale `??` comments remain in the fork-init module and test | recorded for T-0014 (its rows rewrite `--base` and those comments). No worse than before: the hrefs ignored a literal base before this change too |
| Spec F7: README contradicts the new config until T-0016 | accepted transition; T-0016 rewrites the fork section |
| Spec F8, Standards F5: "the base is read once, here" is untrue for a range with a literal base | fixed: the comment says such a range writes its path on that line |
| Spec F9, Standards F3: "fork" in edited comment blocks against the glossary's range | fixed in comments (template title line, parity comments); test titles kept as they are, since they name existing tests |
| Standards F4: re-wrapped lines over ~80 columns | fixed |
| Standards S1: base grammar defined twice (config and fork-init) with different results | recorded for T-0014, which owns `--base`'s grammar |
| Standards S2: local cast for `id` | fixed: `id?: string` added to the file's `Step` interface |
| Standards S3: ten fresh imports of the config module | accepted: required by S3; the file runs in about 0.3 s |
| Standards N1: configure-pages' `base_path` for a root site is `""` | verified on 2026-10-14 in the pinned action's `action.yml` (spec 0004, "Host, base and origin"); T76 and the user's manual deployment confirm |

### 2026-10-14 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0010.md`. Candidate pass and independent false-positive filter by separate `harness-reviewer` agents: five LOW candidates, none introduced by this diff and exploitable; nothing blocks landing. Pre-existing hardening (job-level permissions, `persist-credentials: false`, toolchain pins) recorded, not fixed here; C3 is recorded against OQ-018 (T-0016 writes OQ-018); C4 is carried by T-0014.

### 2026-10-14 — stage 8 (preview) and landing

PR BrowserLaboratory/wxl-platform#14, squash-merged by the user as `1e5bce4` at 2026-10-14T13:11Z with all six checks green (test, build, prose-audit, site-smoke, challenge-verify, Cloudflare Pages). The T76 check below ran on the PR's preview right after the merge (the user merged before it was recorded); the preview is the build of branch head `549ff22`, whose code equals `1e5bce4`.

Surface: HTTP responses of the Cloudflare Pages preview `https://2b47260d.wxl-platform.pages.dev` (no browser driven; the spec's stated override of hard rule 4 for S8).

| Check | Command | Result |
|---|---|---|
| three favicons | `curl -s -o /dev/null -w '%{http_code}' <preview>/<file>` for `favicon.svg`, `favicon.png`, `apple-touch-icon.png` | 200, 200, 200 |
| favicon hrefs in `/` | `curl -sL <preview>/ \| grep -oE 'rel="(icon\|apple-touch-icon)"[^>]*href="[^"]*"'` | `/favicon.svg`, `/favicon.png`, `/apple-touch-icon.png` |
| script and modulepreload URLs of `/` and `/zh-TW/` | `curl -sL <preview><page> \| grep -oE '<(script\|link)[^>]*>'` filtered to `src`/`href` | all under `/assets/` (5 per page) |
| stylesheets of `/` | same, `rel="preload stylesheet"` | `/assets/style.DAos3MhM.css`; `/vp-icons.css` (a single root-level segment, allowed by T76) |
| `<title>` of `/` and `/zh-TW/` | `curl -sL <url><page> \| grep -oE '<title>[^<]*</title>'` on the preview and on `https://wxl.browserlab.online` | `Web eXploitation Laboratory` on both, for both pages |

All acceptance criteria are met.
