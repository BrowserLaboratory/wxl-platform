---
id: T-0070
title: create-wxl's manifest names its repository
epic: 0009-npm-trusted-publishing
status: review
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

- [x] Rows M01, M02, M03.
- [x] AC reached: AC-5 (W11 lands with T-0071).
- [ ] Stage 8 (RP0, S8-08), before the PR merges: `npm pkg get repository` in `create-wxl/` prints
  MR1's object; `node scripts/check-publish.mjs` exits 1 with a named check; the PR's CI passes.

## Test plan

### 2026-11-12 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准，寫第一個測試之前）

測試不拼出上游 slug：URL 一律從根 manifest 的 `repository.url` 或 `UPSTREAM_SLUG` 組出來（0005 的 Seams note；O2 只豁免 manifest 的那一行）。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0009-S3 | C45 的 listing 在 `license` 之後多了 `repository`，`url` 等於根 manifest 的 | `upstream-config.test.mjs` 的 C45，標題改成 five placeholders | M01 / AC-5 | 以 `JSON.stringify` 比對，所以位置與鍵的順序都算；`type` 是 `git`、`directory` 是 `create-wxl`；其餘欄位與 0005 的 listing 相同。預期紅燈 |
| 0009-S3 | manifest 的原始文字含 MR1 的五行，逐字、連續 | 同上，新增一個 it | M01 / AC-5 | 五行：`  "repository": {`、`    "type": "git",`、`    "url": "<根的 url>",`、`    "directory": "create-wxl"`、`  },`；其他一行物件（`bin`、`engines`）維持一行。預期紅燈 |
| 0009-S3 | 真實的樹：MR1 的 `url` 行不算違規 | `upstream-guard.test.ts` 既有的 real tree「guard finds no violation」 | M02 / AC-5 | 加上 MR1 之後、還沒加豁免時應轉紅，加上豁免後轉綠 |
| 0009-S3 | fixture：guard 只豁免 `create-wxl/package.json` 裡逐字等於 `"url": "<根的 url>",` 的那一行 | `upstream-guard.test.ts` 新增 describe | M02 / AC-5 | 同一檔案裡：`bugs.url`、`homepage`、`description` 含 slug → 各自回報；`url` 行的值與根的不同（多一段路徑）→ 回報；同值但少了結尾逗號 → 回報；逐字相同的行 → 不回報。別的檔案（`docs/x.json`）出現同一行 → 回報。根 manifest 沒有 `repository` → 不豁免。預期紅燈（目前除了根 `package.json`，其他檔案沒有任何豁免） |
| 0009-S3 | repo 不追蹤任何 `.npmrc` | `upstream-config.test.mjs` 新增 it，讀 `git ls-files` | M03 / AC-5 | 任何路徑的 basename 是 `.npmrc` 都算。確認型：目前沒有 `.npmrc` |

### 2026-11-12 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0009-S3 | `upstream-config.test.mjs`：C45「five placeholders」、`0009 M01`（五行逐字）、`0009 M03`；`upstream-guard.test.ts`：real tree「guard finds no violation」、`0009 M02` 九列 | not measured：create-wxl 沒有 coverage provider；根目錄的 guard 是測試檔內的函式。重現：`pnpm --dir create-wxl test`、`pnpm vitest run tests/unit/scripts/upstream-guard.test.ts` | M01、M02、M03；AC-5（W11 屬於 T-0071） | rebrand 之後 `url` 仍等於根的（W11）由 T-0071 的 T52 fixture 測試 |

## 給使用者（zh-TW）

在 create-wxl 的 `package.json` 加上 `repository`，指向上游。npm 的 trusted publishing 與 provenance 都需要它。

- 這一行會寫出上游 slug，所以 guard 只豁免這一行，而且是逐字比對；檔案裡其他地方出現 slug，照樣會被抓到。
- repo 不追蹤任何 `.npmrc`。

## Comments
- 2026-11-12, stage 5: commit `344c6ca`, on a branch cut from T-0069's tip `a732c0d` while
  PR #82 ran its CI, to be rebased onto `main` once #82 lands. Red runs, one at a time:
  - M01 (2 tests, `npx vitest run test/upstream-config.test.mjs -t "C45: manifest|0009 M01"` in
    `create-wxl/`): red before MR1, green after it.
  - M02, real tree: after MR1, `the guard finds no violation among the tracked files` turned red
    at `create-wxl/package.json:12`, as planned; green after the exemption.
  - M02, fixtures (`npx vitest run tests/unit/scripts/upstream-guard.test.ts -t "0009 M02"`):
    the four rows that need the exemption (the exact line, and the three "other line" rows) were
    red; the rows that report (different value, no comma, another file, no root repository)
    passed when written, since the guard already reported every line outside the root manifest.
    Two corrections while writing: my first expected line numbers were off by one (the `url`
    line is line 5); and "the single line" (O1 (a)) is enforced by exempting only the first
    matching line, with a red-first row for a second identical line.
  - M03: passed when written (no `.npmrc` is tracked), a confirmation.
  - `pnpm --dir create-wxl test` → `Test Files 37 passed (37) / Tests 752 passed | 1 skipped
    (753)`; `pnpm test --run` → `Test Files 136 passed (136) / Tests 4869 passed | 1 skipped
    (4870)`.
