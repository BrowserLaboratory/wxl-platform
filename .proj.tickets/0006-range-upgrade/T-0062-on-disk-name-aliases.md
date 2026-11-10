---
id: T-0062
title: On-disk name aliases and the .git alias rule
epic: 0006-range-upgrade
status: done
blocked_by: [T-0061]
---

## Context

Chain X3 of epic 0006's chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis.md`):
on Windows with 8.3 short names, a regular file `GITIGN~1` in the base, a copy of the teacher's
`.gitignore`, resolves on disk to `.gitignore`, so M6 deletes the teacher's ignore file. HFS+
ignorable code points and letter case in a parent directory are the same kind of alias. 0005's chain
analysis gap 1 is the archive-side twin: entry rule 3 rejects only a literal `.git` component, while
git itself treats `git~1`, `.git` with a trailing stream and `.git` with HFS+ ignorable code points as
`.git`. Split from T-0061 at stage 4 (2026-11-10).

## Deliverable

No merge path whose name on disk differs from p (a short name, ignorable characters, or letter case,
in the path or a parent) is written or deleted: P-9 leaves it untouched and reports UP-A15, on the
default file systems CI verifies (spec B4 lists the rest). Every archive entry with a component git
treats as `.git` is rejected (0005 rule 3, CW-E08), while other short names pass. A `.gitignore`
upstream adds, changes or deletes is untouched (P-7), and the set of ignored paths is the same before
and after a run. Git failures in step 8, other than `git merge-file`, are CW-E14 naming the command.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1, `traceability.md` revision 3.1, and
`.proj.specs/0005-create-wxl/traceability.md` revision 2.2. Decisions D12, D13, and D19 for step 8.

- [x] Rows: U17 (its added ignored file and `HEAD`/index assertions), U57 (the rejecting stub), U63,
  U68, U69, U73, U74's step 8 cases, U75; 0005's C18 added cases and C71.
- [x] ACs reached: AC-5 (U73), AC-6 (U17, U57, U68, U69, U74, U75), AC-8 (U63, U68), and 0005's AC-9
  (C18, C71).
- [x] The real-file-system letter-case cases run only on macOS or Windows on a case-insensitive file
  system; stage 5 checks whether a Windows runner can create a short name with
  `fsutil file setshortname`, and the coverage report records the real 8.3 case as not verified when
  it cannot (spec Testing Decisions).
- [x] Stage 8: a terminal run of the packed package (0006-S2) on macOS: an upstream path under a
  directory whose letter case differs from the range's is untouched with UP-A15. The full simulation
  (U32) runs in T-0063.

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「後面都授權你，按照你的建議」核准，寫第一個測試之前）

seam 全部是 0006-S1；0005 的 rule 3 另用 0005-S1（`archive-rules.test.mjs` 透過 create 的 `run`）。「預期紅燈」是寫好測試、還沒改程式時的失敗原因；寫好就綠的列是確認型，另做 mutation 檢查。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | prefactor：P-5 與 D15 共用一個「被 ignore 的路徑」helper（S1），step 8 的 git 呼叫改走 D19 的包裝；P-9 拿到 step 3 的 range root realpath；行為不變 | `merge-plan.mjs`、`upgrade.mjs`；不改測試 | （無） | 改完全部 create-wxl 測試仍是綠燈 |
| 0005-S1 | rule 3 擋下 git 視為 `.git` 的元件（D13） | `archive-rules.test.mjs` rule 3 的 `it.each` 加 C18 的新案例；新增 C71 | 0005 C18、C71 / AC-9 | `git~1/x`、`GIT~1/x`、`git~1. :x/y`、`.git:x/y`、`.git::$INDEX_ALLOCATION/x`、`.g\u200cit/x`、`.G\u200cIT/x`、`\u200c.git/x`、`.git\ufeff/x` → CW-E08 rule 3；`PLATFO~1/x`、`GITIGN~1`、`a~1/b` 通過。預期紅燈：新拒絕案例 |
| 0006-S1 | 升級路徑的 archive 也套用新 rule 3 | `upgrade-target.test.mjs` 新增 U73 | U73 / AC-5 | T 含上列九種元件之一 → CW-E08，exit 1，沒寫檔，沒有暫存殘留；`PLATFO~1`、`GITIGN~1` 通過。預期紅燈 |
| 0006-S1 | 磁碟名稱別名 → UP-A15（P-9） | 新檔 `upgrade-aliases.test.mjs` 的 U68 | U68 / AC-6、AC-8 | (a) 8.3 模型：包裝 `deps.fs`，`GITIGN~1` 在每個函式都當成 `.gitignore`，realpath 回 `<root>/.gitignore`；B 有 `GITIGN~1` ≡ o，T 沒有 → UP-A15，`.gitignore` 不變，ignored 清單前後相同；(b) 大小寫不敏感檔案系統（只在 macOS、Windows 跑）：T 新增 `platform/new.txt`、靶場的 tracked 目錄是 `Platform/` → UP-A15，沒寫 `platform/new.txt`。預期紅燈 |
| 0006-S1 | 名稱相同時不誤報、錯誤 fail closed | 同檔 U69 | U69 / AC-6 | range root 經 symlink；NFC 名稱、realpath 回 NFD（HFS+ 模型）；NFD 名稱、realpath 也回 NFD；`\` 分隔（Windows 模型）；`D:\` 磁碟根目錄模型 → 都沒有 UP-A15（確認型，P-9 加上後做 mutation）；realpath 對 tracked 檔 p 回 `EACCES`、lstat 對不存在 p 的祖先回 `EACCES` → UP-E11 帶 p，沒寫檔（預期紅燈） |
| 0006-S1 | Windows 真的 8.3 短檔名 | 同檔，只在 Windows 跑 | U68 / AC-6 | 先用 `fsutil file setshortname` 給暫存檔一個短檔名；做不到就在執行時略過並寫明原因（coverage 表記為未驗證）；做得到就跑 X3 情境 → UP-A15、`.gitignore` 不變 |
| 0006-S1 | P-7 的新增、刪除與 o ≡ t 分支 | `upgrade-ignored.test.mjs` U63 擴充 | U63 / AC-8 | `new/.gitignore`（b 不存在）、`old/.gitignore`（t 不存在）、`x/.gitignore`（o ≡ t、b ≢ t）→ 都沒動、各報 UP-A13；ignored 清單前後相同。確認型 |
| 0006-S1 | U17 的 ignored 檔與 HEAD／index 不變 | `upgrade-merge.test.mjs` U17 加斷言 | U17 / AC-6 | 上游有改的目錄裡放一個 ignored 檔：逐 byte 不變；`git rev-parse HEAD` 與執行前相同、`git diff --cached` 為空。確認型 |
| 0006-S1 | step 8 的 git 失敗（D19） | `upgrade-ignored.test.mjs` 既有兩個 fails-closed 區塊對應 U74；新增 reject 子案 | U74（step 8）/ AC-6 | `ls-files -z` exit 128、P-5 `check-ignore` exit 128 → CW-E14（既有，確認型）；`runGit` 對 step 8 的 `ls-files -z` reject `EIO` → CW-E14 帶指令名稱（新子案，預期紅燈） |
| 0006-S1 | `merge-file` 被 reject → UP-E11 | `upgrade-merge.test.mjs` 既有「runGit rejects for merge-file」對應 U57 | U57 / AC-6 | 既有測試，確認型 |
| 0006-S1 | 讀 o 失敗 → UP-E11 | `upgrade-merge.test.mjs` 新增 U75 | U75 / AC-6 | 包裝 `deps.fs`，讀 tracked 檔 p（b ≢ t）回 `EACCES` → UP-E11 帶 p，沒寫檔 |

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | 新檔 `upgrade-aliases`（U68、U69）、`upgrade-target`（U73）、`upgrade-ignored`（U63 擴充、U74 step 8）、`upgrade-merge`（U17 斷言；U57、U75 對應既有測試）、`upgrade-messages`（UP-A15） | not measured：create-wxl 沒有安裝 coverage provider | U17、U57、U63、U68、U69、U73、U74（step 8）、U75；AC-5、AC-6、AC-8 | U68(b) 只在 macOS 或 Windows 的大小寫不敏感檔案系統上跑；U68(c) 只在 Windows 跑，runner 做不出短檔名時會附原因略過；本機 macOS 略過，Windows 的結果在 PR 的 windows-latest job 跑完後記錄（見 Comments） |
| 0005-S1 | `archive-rules`（C18 新案例、C71） | not measured | 0005 C18、C71 / AC-9 | — |
| 0006-S2 | — | — | 第 8 階段：macOS 上父目錄大小寫不同的路徑報 UP-A15 | 第 8 階段另外記錄 |

Checks at `600ff82`, macOS (darwin arm64, Node v24.13.0), 2026-11-10:
`pnpm --dir create-wxl test` → `Test Files 37 passed (37) / Tests 694 passed | 1 skipped (695)` (the skip is U68(c), Windows only);
`pnpm test --run` → `Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)`.

Mutation checks, each made on the commit named, with the edit shown, the command run (it fails), then the file restored with `git checkout -- <file>`:

| Commit | Edit | Command that fails |
|---|---|---|
| `7053879` | `archive-rules.mjs`: `isGitAlias(component)` → `component.toLowerCase() === '.git'` | `pnpm --dir create-wxl exec vitest run test/upgrade-target.test.mjs test/archive-rules.test.mjs` (18 failures: C18's and U73's new cases) |
| `cb37516` | `merge-plan.mjs` `hasNameAlias`: drop both `.normalize('NFC')` | `pnpm --dir create-wxl exec vitest run test/upgrade-aliases.test.mjs -t "U69"` ((b) fails) |
| `cb37516` | `hasNameAlias`: drop the `.normalize('NFC')` on q only | same command ((c) fails) |
| `cb37516` | `hasNameAlias`: `toSlash` returns its input unchanged | same command ((d) and (e) fail) |
| `cb37516` | `hasNameAlias`: `prefix` is always `${root}/` | same command ((e) fails) |
| `600ff82` | `merge-plan.mjs` P-7: add `b !== null && t !== null &&` to its condition | `pnpm --dir create-wxl exec vitest run test/upgrade-ignored.test.mjs -t "U63, P-7"` |
| `bcc5b1c` | `merge-plan.mjs` `hasNameAlias`'s `lstatOk`: return `false` for every error | `pnpm --dir create-wxl exec vitest run test/upgrade-aliases.test.mjs -t "U69"` ((g) fails) |

## 給使用者（zh-TW）

第 4 階段拆出的第二張票，處理磁碟上的檔名別名。Windows 的 8.3 短檔名（例如 `GITIGN~1` 指到 `.gitignore`）、HFS+ 會忽略的字元，以及父目錄的大小寫不同，都會讓升級碰到一個名字不同、實際上卻是同一個的檔案。這張票加上 P-9：讀檔前先比對磁碟上的實際檔名，不一致就不動，報 UP-A15。另外把 0005 的 rule 3 補到和 git 一樣，擋下 `git~1`、`.git:` 這類 `.git` 的別名。等 T-0061 完成後再開始，因為測試要用它做好的 tag archive fixture。

## Comments
- 2026-11-10, from T-0061's stage 6: (S1) when step 8's git calls gain D19's rejection wrapping,
  make one helper for "ignored path" (Vocabulary) and use it for both P-5 (`merge-plan.mjs`
  `isIgnoredPath`) and D15 (`upgrade.mjs` step 5), so the two copies cannot drift; (F4) the comment
  in `archive-rules.mjs` that says create-wxl always downloads by commit is stale since U16 and J6.
- 2026-11-10, stage 5 records (deviations, as the 0006 retrospective asks):
  - `upgrade-merge.test.mjs` "step 9's existingMode lstat fails closed" locates step 9 by the count
    of `lstat` calls on README.md; P-9 adds one, so the count moved from 3 to 4. Its assertions are
    unchanged.
  - U73 and C71 were green when written: U73 was written after rule 3's implementation (the test
    plan expected it red). The rule 3 mutation above shows both catch the change.
  - U57's rejecting stub and U75 map to existing tests, which already assert exactly those rows;
    no new test: `create-wxl/test/upgrade-merge.test.mjs:719` ("runGit rejects for merge-file") and
    `:643` ("a read error of an M12 path's own o"), both at `600ff82`.
  - U17 already asserted `HEAD` and the index unchanged (`create-wxl/test/upgrade-merge.test.mjs:167`
    at `600ff82`); the ignored-file assertion was added.
  - U69(g) was green when written, and stage 6 (S-4, M1) showed why: its fixture planned a write, so
    the parent check reported the same UP-E11 even without P-9. It now uses an M7 path (no write),
    and the mutation in the table above shows P-9 alone stops it.
  - S1 (from T-0061's stage 6) is done in the prefactor: P-5 and D15 share `isIgnoredPath`.
- 2026-11-10, stage 6: Standards (30 findings, 3 medium) and Spec (17, 2 medium), no high; record and
  dispositions in the local note `.proj.research/2026-11-10-T-0062-stage6-review.md`, applied under
  the user's authorisation of 2026-11-10 ("後面都授權你，按照你的建議", which covers all later work,
  T-0062 included). Fixes at `bcc5b1c`; `pnpm --dir create-wxl test` there →
  `Test Files 37 passed (37) / Tests 696 passed | 1 skipped (697)`. Recorded, not changed: S-6 (the
  ticket body follows T-0026's precedent of a Traditional Chinese test plan), S-19 (stage 1's Q12:
  no glossary entry for implementation terms), SM-3, SM-5, SM-6, SM-7, SM-10, SM-11, and L1 (P-3
  rethrows a real permission error, so it surfaces as CW-E14, not UP-E11 -- T-0027's behaviour;
  exit 1 with nothing written still holds). The Windows criterion is unchecked until the PR's
  windows-latest job reports whether U68(c) ran or why it was skipped.
- 2026-11-10, stage 7: project security review (`.claude/skills/security-review/SKILL.md`), report
  `.proj.specs/0006-range-upgrade/review/security-T-0062.md`. 9 candidates, every one judged a
  false positive by an independent reviewer (each an accepted risk in B1/B4, or behaviour D12/D13
  specify); no confirmed finding, so nothing to fix. Five optional hardenings are recorded there,
  not adopted.
- 2026-11-10, stage 8 (0006-S2, surface: a terminal on macOS darwin arm64, APFS (case-insensitive),
  Node v24.13.0, git 2.54.0; the package packed with `npm pack` at `7632168`, whose
  `dist/source.json` names that commit; target `CREATE_WXL_COMMIT=77228175b45fa9b051db0cecbac13f1545e43d69`,
  `main` as pushed; `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM` unset; the upgrade run as
  `npx --yes --package <tarball> create-wxl upgrade`):
  - Range `rel` made by the published `npx --yes create-wxl@3.0.0 rel --author 'Stage Eight' --repo
    wxl-test/rel --host github-pages </dev/null`: exit 0, `range.json` = `3.0.0` / `52192fa…`.
    Then `platform/shared/` renamed to `platform/Shared/` with two `git mv` (a case-only rename on
    APFS) and committed. The target adds `platform/shared/mergeChallenges.ts` and changes the
    directory's two existing files.
  - `upgrade`, no `--from`: exit 0; stderr only CW-W04; R1 base `3.0.0` (`52192fa…`), target
    `7722817…`; R2 updated 61 added 23 deleted 0; R3 UP-A15 naming
    `platform/shared/mergeChallenges.ts`, and UP-A8 for the two existing files (P-4 comes before P-9,
    so the tracked `platform/Shared/…` names stop them first; spec order, "the first match
    applies"); UP-A12. `platform/` still holds only `Shared/`, with its two files unchanged and no
    `mergeChallenges.ts`; `git ls-files --others --ignored --exclude-standard` empty after the run
    (not captured before it). `git clean -fd` then `git checkout -- .` gave an empty
    `git status --porcelain=v1 --untracked-files=all`, `HEAD` unchanged.
  - Afterwards `create-wxl/dist/`, `create-wxl/LICENSE` and the tarball were removed.
- 2026-11-10, PR #72 CI (run `42798792930`, first push `ed18551`):
  - windows-latest (`fork-init-cross-os (windows-latest, 24)`, git 2.56.0.windows.4):
    `upgrade-aliases.test.mjs` 10 tests, 1 skipped. U68(a), U68(b) and U68(c) all passed. U68(c)
    used a real 8.3 short name `GITIGN~1` for `.gitignore`, so the real 8.3 case is verified, and the
    Windows criterion is checked. The one skip is U69(a), which needs a symbolic link. U68(b) also
    passed on macos-latest.
  - The same job failed in `upgrade-ignored.test.mjs`: both U74 step 8 rejection cases failed with
    `EBUSY: resource busy or locked, rmdir '…\create-wxl-range-repo-…'` in the test's own cleanup.
  - Cause: step 8 started the two `git ls-files` calls and the two pristine listings with
    `Promise.all`. When one `runGit` rejected, `planMerge` rejected at once, while the other real
    `git ls-files` still ran with the range as its working directory. The run then reported,
    cleaned up and returned; on Windows, removing the range failed.
  - This is a product defect, not only a test one. A rejection must not let the run return while a
    child it started is still running. The same applies to the paired reads of b, t and the anchor
    check.
  - Fix, a deviation from the approved plan, applied under the user's authorisation of 2026-11-10:
    - `merge-plan.mjs`'s `settleAll` waits for every operation, then rejects with the first
      rejection in array order;
    - it is used at all three `Promise.all` sites in `planMerge`;
    - error text and exit codes are unchanged.
  - Test, a stronger assertion and no new sub-case: both U74 step 8 rejection cases now count real
    git calls still running and require 0 when `run()` returns. With `Promise.all` this was red on
    macOS too (`expected 1 to be +0`); with `settleAll` it is green.
  - `pnpm --dir create-wxl test` → `Test Files 37 passed (37) / Tests 696 passed | 1 skipped (697)`.
- 2026-11-10, landed: PR #72 squash-merged into `main` as `279eac5` (CI 10 of 10 passing on the second
  push `ba2f2f8`, including `fork-init-cross-os (windows-latest, 24)`, where U68(c) ran a real 8.3
  short name). Status set to done.
