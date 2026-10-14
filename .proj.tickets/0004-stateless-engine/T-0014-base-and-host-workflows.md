---
id: T-0014
title: Write the base through A9 and choose the workflow by host
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0010, T-0013]
---

## Context

`--base` today edits a `base:` line, and the workflow is only ever copied when absent. With A9 upstream (T-0010), a GitHub Pages range should take its base from deployment, the host should decide the workflow, and ranges configured the old way must be told exactly what to bring over.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--base` writes A9 (`'/x/'` or `'/'`, both modes; `.` and `..` refused). `--host github-pages` and `--host cloudflare-pages` reset A9 to the upstream form (warning when it was literal), require A9, `base: siteBase` and a usable template, and handle each workflow state (install, leave, replace a known old output, remove, warn with `SITE_BASE`/`404`). Without `--host`, today's workflow behaviour stands (LF-normalised in anchor mode) with the 404 warning when A9 is upstream and the workflow does not derive `SITE_BASE`, in both modes. The five base-related overridden tests are rewritten; the shared fixture's template derives `SITE_BASE`.

## Acceptance criteria

- [ ] T8–T11: A9 being set, candidate lines, CRLF (S1)
- [ ] T16–T26: host values, `--host` with `--base`, A9 errors and reset, `--base` lines and grammar, workflow states for both hosts, template errors, no-host behaviour and warning (S1)
- [ ] T51: rebrand differences for the base (S1)
- [ ] T60: the five base-related overridden tests (S1)
- [ ] T82: warning on resetting a literal A9 (S1)
- [ ] T83: fork-init.ts workflow and base comments (S9)

## 給使用者（zh-TW）

base 改由 A9 寫入，`--host` 決定 workflow：`--base` 寫 A9 字面值；`--host` 把 A9 改回上游形式，並依 workflow 狀態安裝、保留、取代舊版或刪除；範本遺失或過舊時回 exit 1 並說明要從上游帶回什麼；不帶 `--host` 但 workflow 沒設 `SITE_BASE` 時警告整站會 404。base 相關的五支舊測試依 override 改寫。

## Comments

### 2026-10-14 — carried from T-0010's stage 6 review

- The deploy template's usage header says only that `pnpm fork:init` installs it; add the `--host` contract (`--host` decides the workflow; `--base` only without `--host`) when `--host` lands.
- Until this ticket, today's `--base` collapses the new `  base: siteBase,` line into a literal; this ticket's A9 rows replace that path.
- One base grammar: `.vitepress/config.mts` refuses `.`/`..` segments, the fork-init `BASE_RE` does not; T21 unifies them.
- Stale comments quoting `base: process.env.SITE_BASE ?? '/'`: the fork-init module's `setViteBase` comment (a T83 row) and the fork-init test's env-conditional case (an overridden test here).
