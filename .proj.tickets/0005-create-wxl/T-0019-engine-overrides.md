---
id: T-0019
title: Engine overrides for ranges that carry range.json
epic: 0005-create-wxl
status: review
blocked_by: []
---

## Context

Epic 0005 adds create-wxl, which writes a setup record (`range.json`) at the root of every range it
creates and then runs the platform's own fork-init engine on it. Three 0004 contracts are overridden
for that (spec "Overridden contracts"): rebrand mode must not rewrite the root `range.json`, a tree
with `range.json` is not upstream, and `deriveGithubPagesOrigin` becomes an export. This is the
prefactor every later ticket of the epic relies on.

This ticket's branch also brings the reviewed specs of epics 0005 (revision 2.1) and 0006 (revision 2),
their review records, and the glossary changes of stage 1 into version control, as T-0001 did for
epic 0001.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seams 0004-S1 and 0005-S3 (the
upstream-guard part).

## Deliverable

Running the engine in rebrand mode on a tree with a root `range.json` leaves that file byte-identical
while still listing it as a residual; the upstream decision treats a tree with `range.json` as a range;
`deriveGithubPagesOrigin` is exported unchanged. The engine's header comment and both `wxl-fork-init`
skills say so (U9).

## Acceptance criteria

- [x] C61: rebrand on a tree whose root `range.json` holds the upstream slug leaves it byte-identical; `residualFiles` still lists it; existing rebrand tests unchanged and passing (AC-25)
- [x] C62: without `GITHUB_REPOSITORY`, upstream manifest url, git work tree: no root `range.json` → upstream, with it → not upstream; with `GITHUB_REPOSITORY` set, unchanged (AC-25)
- [x] `deriveGithubPagesOrigin` exported, behaviour unchanged (verified through the summary in T-0022, C63)
- [x] U9 engine header and both `wxl-fork-init` skills updated, the two skills byte-identical (0004 T78); their strings are verified in T-0025 (C47)
- [x] `GLOSSARY.md`, `.proj.specs/0005-create-wxl/` and `.proj.specs/0006-range-upgrade/` committed on this branch; glossary tests pass

Stage 8: engine-only ticket; recorded as the runs of its tests (spec "Overridden contracts", stage 8 row).

## 給使用者（zh-TW）

先改引擎，讓後面的 create-wxl 能用：rebrand 模式不改寫根目錄的 `range.json`，但殘留清單仍列出它；有 `range.json` 的樹不算上游；`deriveGithubPagesOrigin` 改為 export。這張的分支也把兩份 spec、審查紀錄和 GLOSSARY 的修改一起帶進版控。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Approved by the user on 2026-10-16, quoted verbatim: "核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S1 | rebrand 模式讓根目錄 `range.json` byte-identical，殘留清單仍列出它 | `fork-init.test.ts` B 模式 describe 新增一個 `it`：fixture 加根目錄 `range.json`（`upstream.repository` 為 `UPSTREAM_SLUG`），跑 `B_ARGS` | C61 / AC-25 | 紅燈：改之前 slug 被換成 `me/myfork`，byte 比對失敗。綠燈：內容 byte-identical、`changedFiles` 不含 `range.json`、`residualFiles` 含 `range.json`、`residualHits` 指到那一行。**只限根目錄**：同一 fixture 的 `sub/range.json` 照舊換 slug |
| 0004-S1 | 既有 rebrand 測試不改且通過 | 既有 B 模式測試全部 | C61 / AC-25 | `git diff` 只見該 describe 新增的 `it`，既有測試 body 不變 |
| 0004-S5 | `GITHUB_REPOSITORY` 未設定時，有根目錄 `range.json` 就不是上游 | `upstream-guard.test.ts`：`isUpstreamDecision` 加第四個輸入 `hasRangeJson`，新增 `it.each` | C62 / AC-25 | 紅燈：改之前帶 `range.json` 仍判為上游。未設定與空字串 × 上游 manifest × work tree：無 `range.json` → 上游、有 → 不是上游 |
| 0004-S5 | `GITHUB_REPOSITORY` 有設定時，`range.json` 不影響 | 同上，新增 `it` | C62 / AC-25 | 上游 slug ＋ `range.json` → 上游；其他 slug、無 `range.json` → 不是上游 |
| 0004-S1 | `deriveGithubPagesOrigin` 已 export、行為不變 | `fork-init.test.ts` 新增 `it` | （支援 C63；C63 本身由 T-0022 認領） | 紅燈：export 之前 import 為 `undefined`。`alice/alice.github.io` → `https://alice.github.io`；`Alice/r` → `https://alice.github.io/r` |

**Notes**

- 覆寫的既有測試：`upstream-guard.test.ts` 裡 `isUpstreamDecision` 的既有呼叫機械性補第四個參數 `false`，期望值不變；`REAL_DECISION` 改為也檢查 repository 根目錄有沒有 `range.json`。其他既有測試 body 不改。
- 實作只限 rebrand 走訪中根目錄的 `rel === 'range.json'`：跳過改寫、仍跑 `scanResidual`。
- U9：引擎開頭註解與兩份 `wxl-fork-init` skill 補說明，兩份 skill 保持 byte-identical；字串由 T-0025 的 C47 驗證。
- 第 8 階段：只改引擎與測試，以這些測試的執行紀錄為準。

### 2026-10-16 — red → green log

Implemented by the `harness-executor` role after the two-step handoff (increment plan confirmed first). Line numbers are those of the working tree before this ticket's commit.

**Row 1 (0004-S1, C61).** Red: new `it('leaves a root range.json byte-identical in rebrand mode, but still inventories it')` in the B-mode describe failed with `AssertionError: expected '{...}' to be '{...}'` — the root `range.json`'s `"repository"` had become `"me/myfork"`. Change: `RANGE_JSON_REL` constant and, in the rebrand walk, the root `range.json` is only scanned (`scanResidual`), never passed to `transformText`/`applyEdit`; a nested `sub/range.json` falls through to the ordinary swap. Green. Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "leaves a root range.json byte-identical"`.

**Row 2 (0004-S1, C61, existing tests).** `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "runForkInit — B mode"` → 23 passed (22 existing + 1 new); `git diff -U0 -- tests/unit/scripts/fork-init.test.ts` shows only additions (one import, one describe, one `it`).

**Row 3 (0004-S5, C62).** Red: new `it.each` (unset / empty `GITHUB_REPOSITORY` × `hasRangeJson` false / true) failed 2 of 4 with `AssertionError: expected true to be false`. Change: `isUpstreamDecision` gains `hasRangeJson: boolean`; the manifest-and-work-tree branch adds `&& !hasRangeJson`; the `GITHUB_REPOSITORY` branch is unchanged. Approved override: every existing call gets a fourth argument `false`, expected values unchanged; `REAL_DECISION` passes `hasRootRangeJson()` (upstream has no root `range.json`, so its value is unchanged). Green. Reproduce: `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t "decides upstream-ness of an upstream-shaped tree"`.

**Row 4 (0004-S5, C62).** No red: `it('with GITHUB_REPOSITORY set, a root range.json never changes the decision')` passed before Row 3's change too, since that branch never read the other inputs. It pins the "unchanged when set" half of C62. Reproduce: `pnpm vitest run tests/unit/scripts/upstream-guard.test.ts -t "with GITHUB_REPOSITORY set"`.

**Row 5 (0004-S1, supports C63).** Red: `TypeError: deriveGithubPagesOrigin is not a function`. Change: `export` added, body unchanged. Green. Reproduce: `pnpm vitest run tests/unit/scripts/fork-init.test.ts -t "is exported and derives the GitHub Pages origin unchanged"`.

**U9.** Engine header: create-wxl named as the second caller; rebrand mode's root `range.json` exception. Both `wxl-fork-init` skills: one sentence that rebrand mode leaves the root `range.json` unrewritten and that a slug hit in it is expected. `cmp .claude/skills/wxl-fork-init/SKILL.md .agents/skills/wxl-fork-init/SKILL.md` → identical. The rest of U9 (`quality-gates.yml`, `AGENTS.md`) names create-wxl and moves to T-0025.

**Checks.**

- `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → `1991 passed | 1 skipped`.
- Full suite once: `pnpm test --run` → `Test Files 127 passed (127) / Tests 4190 passed | 1 skipped (4191)`, exit 0 (the `ECONNREFUSED` lines are the known port-3000 noise).
- Typecheck: the project has no typecheck script and `tsc` is not a direct dependency; `node node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc --noEmit -p .` exits 2 both before and after the change with identical pre-existing errors; `scripts/fork-init.ts` and `upstream-guard.test.ts` have none, `fork-init.test.ts` the same three pre-existing `B_ARGS` readonly errors (lines shifted by the insertions).
- Executor Git guard: the executor ran `git stash list` and received no approval prompt, although the hook script returns `permissionDecision: "ask"` for that exact command (`printf '%s' '{"tool_input":{"command":"git stash list"}}' | .claude/hooks/guard-executor-git.sh`). Either the frontmatter hook did not load or auto mode resolved the `ask`; not distinguishable from this run. `git stash list` is empty after the handoff.

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S1 | `fork-init.test.ts`: "leaves a root range.json byte-identical in rebrand mode, but still inventories it"; the 22 existing B-mode tests | not measured: no coverage provider is installed | C61 / AC-25 | anchor mode is not exercised with a `range.json`: it does no tree walk, so the file is untouched there by construction (T3) |
| 0004-S5 | `upstream-guard.test.ts`: "decides upstream-ness of an upstream-shaped tree" (4 cases); "with GITHUB_REPOSITORY set, a root range.json never changes the decision" | not measured: no coverage provider is installed | C62 / AC-25 | `hasRootRangeJson()` on a real tree that has `range.json` is not run here; 0005 stage 8 run IV covers it on a created range |
| 0004-S1 | `fork-init.test.ts`: "is exported and derives the GitHub Pages origin unchanged" | not measured: no coverage provider is installed | supports C63 (claimed by T-0022) | the summary that uses it arrives with T-0022 |

**Stage 8 verification surface.** Engine and test changes only (spec "Overridden contracts", stage 8 row): verified by the local `vitest` runs above, no browser surface involved.

### 2026-10-16 — stage 6 disposition

Two `harness-reviewer` passes on the working-tree diff over `main` `c707b40` (packet captured before any fix; no drift at report time). Standards: 20 findings, none high (worst: the 設定紀錄 definition contradicting itself; the `it.each` title consuming the wrong columns). Spec: 17 findings, none high, no behaviour defect (worst: rebrand on a create-wxl range always reports "NOT complete").

Fixed (pre-authorisation 2, no behaviour change):

- Tests: the `it.each` title now names each case uniquely; the `GITHUB_REPOSITORY`-set test toggles only `hasRangeJson` on the upstream manifest and work tree; the residual assertion checks the hit's `line` (3) and `text`; a new `--dry-run` test pins that the root `range.json` stays untouched and inventoried (passed at once: existing behaviour).
- Comments: the B-mode loop comment names the `range.json` exception; the engine header says create-wxl carries a type-stripped copy and which exports it uses, and no longer calls `range.json` "the one exception"; spec references read "0004 T51" / "0004 T66"; "fork" → "range" in `upstream-guard.test.ts`; that file's header mentions the new input; `range.json` is read once in the walk.
- GLOSSARY: 設定紀錄 now reads 「從哪一版上游建立的紀錄，往後也要記下老師每一項設定的值」 (no longer contradicting the 「目前只…」 sentence); 原廠靶場 「一組檔案」 and its `_新造詞_` line says 「此前沒有名稱」.
- Skills (user decision Q4 = A, 2026-10-16, quoted: "A"): both `wxl-fork-init` skills say the root `range.json` is rewritten in neither mode, its slug is an expected hit in A mode's whole-tree grep and in B mode's inventory, a create-wxl range's rebrand therefore always shows not complete, and `upstream.repository` must not be edited by hand (upgrading would stop and ask for `--from`). The CLI output is unchanged.

Recorded as known limits, not changed: the engine's walk skips a symbolic-link `range.json` and matches the exact lower-case name while `hasRootRangeJson()` follows links and is case-insensitive on macOS/Windows; an untracked root `range.json` in a local upstream checkout makes the upstream-only tests skip without `GITHUB_REPOSITORY` (CI sets it, and `WXL_EXPECT_UPSTREAM` fails the run); spec prose "the engine never reads it" vs the residual scan (the overridden-contracts table governs); the skills' Chinese body predates language.md's English rule; time-bound sentences in the glossary entries are stage 1 wording.

U9 strings as written (for T-0025's C47): engine header `create-wxl (the npm package, 0005-create-wxl) carries a type-stripped copy of this file` and `a root range.json (create-wxl's setup record) is never rewritten in B mode`; skills `根目錄的 `range.json`（create-wxl 建立靶場時寫入的設定紀錄）是例外：兩種模式都不會改寫它` and `不要手動改掉 `range.json` 的 `upstream.repository``.

Checks after the fixes: `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts` → `1992 passed | 1 skipped`; `pnpm vitest run tests/unit/site/glossary.test.ts` → `255 passed`; `cmp` of the two skills → identical.

### 2026-10-16 — stage 7

Report: `.proj.specs/0005-create-wxl/review/security-T-0019.md`. Ten candidates, independently filtered: no exploitable defect. Hardened within scope (pre-authorisation 2): the upstream decision's `hasRootRangeJson()` uses `lstat` (consistent with 0006 J1); both skills add that a range taken over from someone else should have its `upstream.commit` checked against an upstream release; `deriveGithubPagesOrigin`'s comment states its precondition. Checks after: `pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts tests/unit/site/glossary.test.ts` → `2247 passed | 1 skipped`; `cmp` of the two skills → identical. Recorded, not changed: the skills say the CLI prints `file:line`, while `main()` prints file names only (pre-existing wording).
