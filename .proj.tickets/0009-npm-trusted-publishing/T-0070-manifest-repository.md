---
id: T-0070
title: create-wxl's manifest names its repository
epic: 0009-npm-trusted-publishing
status: todo
blocked_by: [T-0069]
---

## Context

npm's trusted publishing and provenance compare the package's `repository.url` with the publishing
workflow's repository, and create-wxl's manifest has no `repository`. Adding it spells the upstream
slug in a file spec 0004's confinement keeps free of it; spec 0009's O1 overrides that for exactly
this one line (U1, U9). Blocked by T-0069 only because spec 0009 lands with it.

## Deliverable

- `create-wxl/package.json` gains MR1's `repository`, right after `license`, one key per line, its
  `url` equal to the root manifest's.
- The upstream guard exempts exactly that line by verbatim comparison and still reports every other
  slug in the file.
- The repository tracks no `.npmrc` (MR2).
- C45's test follows the listing, and its title says five placeholders.

## Acceptance criteria

Spec 0009 revision 3.

- [ ] Rows M01, M02, M03.
- [ ] AC reached: AC-5 (W11 lands with T-0071).
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` in `create-wxl/` prints
  MR1's object; `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes.

## 給使用者（zh-TW）

在 create-wxl 的 `package.json` 加上 `repository`，指向上游。npm 的 trusted publishing 與 provenance 都需要它。

- 這一行會寫出上游 slug，所以 guard 只豁免這一行，而且是逐字比對；檔案裡其他地方出現 slug，照樣會被抓到。
- repo 不追蹤任何 `.npmrc`。

## Comments
