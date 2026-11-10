---
id: T-0063
title: Restore order, report additions and the stage 8 simulation
epic: 0006-range-upgrade
status: done
blocked_by: [T-0061, T-0062]
---

## Context

Epic 0006's chain analysis showed that the restore commands, run `git clean -fd` first, delete every
file the teacher's ignore rules hid once an ignore file is missing or changed (chain X3's last step;
measured in T-0061's stage 1). It also found that M6's deletions appear only as a count and that a
conflict block's `|||||||` section is not explained. Round 2 of stage 3 added a definition of a
completed run, the report's conditional R4 lines and a `range.json` key that the rewrite drops. Split
from T-0061 at stage 4 (2026-11-10); this ticket closes epic 0006 revision 3's implementation.

## Deliverable

The restore commands are `git checkout -- .` then `git clean -fd` in R5 and UP-E09, and they keep every
file `HEAD`'s ignore rules ignore. R2 lists every path M6 deleted; R4 says, when R3 holds UP-A1, that
the `|||||||` section is R1's base version, and its `pnpm install` and `v*` tag lines follow their
conditions. A completed run is one whose step 9 finished. `range.json` keeps a top-level `__proto__`
key. The GLOSSARY entry for the setup record says the upgrade writes it too. The stage 8 simulation
runs in full.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1 and `traceability.md` revision 3.1.
Decisions D14, D16, D20, and the round 2 disposition's W4 and R-6.

- [x] Rows: U24, U26, U27, U28, U29, U31, U64 (its restore order), U70, U72, U76.
- [x] Row U32 (stage 8).
- [x] ACs reached: AC-6 (U64), AC-9 (U24), AC-10 (U26, U72, U76), AC-11 (U27–U29, U70), AC-12 (U31,
  the GLOSSARY sentence and its assertion in `upstream-config.test.mjs` changed together).
- [x] AC-13 (U32).
- [x] Stage 5 runs U70 once with git 2.20 and records the version and result in the coverage report; a
  failure goes back to the user before the ticket closes (spec Testing Decisions). Superseded by the
  user's decision of 2026-11-10: git's floor rises to 2.26 and Ubuntu 20.04 is not supported, so
  the 2.20 run is not made (T-0065; Comments).
- [x] Stage 5 checks which code step 9 prints for a bug (round 2 K-5) and records it.
- [x] Stage 8: the simulation of `traceability.md` "Stage 8 simulation (0006-S2)", steps 1–6, on the
  pushed commits A and B, with the branch deleted afterwards.

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「後面都授權你，按照你的建議」核准，寫第一個測試之前）

seam 全部是 0006-S1；GLOSSARY 那句另用 0005 的 `upstream-config.test.mjs`。「預期紅燈」是寫好測試、還沒改程式時的失敗原因；寫好就綠的列是確認型，另做 mutation 檢查。還原指令只有一個來源：`upgrade-report.mjs` 匯出的 `RESTORE_COMMANDS`，R5、UP-E09 與 U70 都用它。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | 還原指令先 `git checkout -- .` 再 `git clean -fd`（D14） | `upgrade-report.test.mjs`（U26 的 R5，兩種語言）、`upgrade-failures.test.mjs`（U27）、`upgrade-signals.test.mjs`（U28 step 9）、`upgrade-merge.test.mjs`、`upgrade-messages.test.mjs`（UP-E09） | U26、U27、U28 / AC-10、AC-11 | 斷言兩個指令的先後位置，不只是都出現；UP-E09 的寫入失敗與訊號兩種文字、兩種語言。預期紅燈：現在是 clean 在前 |
| 0006-S1 | R2 逐行列出 M6 刪掉的路徑；R4 在有 UP-A1 時說明 `\|\|\|\|\|\|\|` 段落（D16） | `upgrade-report.test.mjs` 新增 U72 | U72、U26 / AC-10 | 三個 M6 路徑 `z.md`、`a/b.md`、`B.md` → 計數行之後剛好三行 `R2`，順序 `B.md`、`a/b.md`、`z.md`（UTF-16 code unit），沒有其他 R2 路徑行；有 UP-A1 項目 → D16 句出現，沒有 → 不出現；兩種語言。預期紅燈 |
| 0006-S1 | R4 的 `pnpm install` 與 `v*` tag 兩行依條件出現 | `upgrade-report.test.mjs` 新增 U76 | U76 / AC-10 | 寫了 `package.json`／只寫 `pnpm-lock.yaml`（M5）／都沒寫 → 出現／出現／不出現；有／沒有 `.github/workflows/deploy.yml` → 出現／不出現。確認型（程式已有），做 mutation |
| 0006-S1 | `range.json` 頂層的 `__proto__` key 保留（R-6） | `upgrade-record.test.mjs` U24 新增 ⑥ | U24 / AC-9 | `{"__proto__":{"x":1},"upstream":{…},"y":2}` → 完成後 `__proto__` 仍是自己的 key、值與位置不變，`upstream` 換成 target。預期紅燈 |
| 0006-S1 | 還原順序在 ignore 檔不見或被改時保住被 ignore 的檔案（D14） | `upgrade-restore.test.mjs` 新增 U70，依 `RESTORE_COMMANDS` 執行 | U70 / AC-11 | 從 commit 建出的樹：(a) tracked 的 `.gitignore` 被刪、被 ignore 的檔案在；(b) tracked 的 `sub/.gitignore` 被改成不再 ignore 某檔；(c) tracked 檔 `a` 被換成 untracked 的 `a/x` → 跑完兩個指令後 porcelain status 為空、檔案等於 `HEAD`、`HEAD` 的 ignore 規則 ignore 的檔案逐 byte 不變。確認型（`RESTORE_COMMANDS` 換回舊順序時 (a)、(b) 應該紅燈，當作 mutation）；另用 git 2.20 跑一次 |
| 0006-S1 | U29、U64 的還原改用新順序 | `upgrade-restore.test.mjs` U29、`upgrade-submodule.test.mjs` U64 改用 `RESTORE_COMMANDS` | U29、U64 / AC-6、AC-11 | 既有斷言不變（status 為空、`HEAD` 的檔案、ignored 檔逐 byte 不變）。確認型 |
| 0006-S1 | 完成的執行 = step 9 已結束（D20） | `upgrade-signals.test.mjs` 既有 step 10 的 SIGINT 對應 U28 | U28 / AC-11 | R1～R5 完整印出、exit 130、沒有暫存殘留；補上 R5 的新順序。確認型 |
| 0005-S1 | GLOSSARY「設定紀錄」那句改為「建立靶場的指令與升級都會寫入它」（W4） | `upstream-config.test.mjs` U10 的斷言與 `GLOSSARY.md` 一起改 | U31 / AC-12 | 斷言新句子，舊句不再出現。預期紅燈 |

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-report`（U26 改預期、U72、U76）、`upgrade-messages`（UP-E09 的順序）、`upgrade-failures`（U27）、`upgrade-signals`（U28 step 9 與 step 10 的 D20）、`upgrade-merge`、`upgrade-record`（U24 ⑥）、`upgrade-restore`（U29、U70）、`upgrade-submodule`（U64）、`upgrade-ignored`（P-7 的還原） | not measured：create-wxl 沒有安裝 coverage provider | U24、U26、U27、U28、U29、U64、U70、U72、U76；AC-6、AC-9、AC-10、AC-11 | U70 用 git 2.20 跑一次：本機只有 git 2.54；從原始碼編譯 git 2.20.1 被這個 session 的權限分類器擋下（Comments），待使用者執行。U32 屬於第 8 階段 |
| 0005-S1 | `upstream-config`（U10 斷言改為 W4 的新句子） | not measured | U31 / AC-12 | U31 其餘部分（`create-wxl <dir>`、C02、C18）是既有測試，沒有改 |

## 給使用者（zh-TW）

第 4 階段拆出的第三張票，也是 epic 0006 revision 3 的最後一張。還原指令改成先 `git checkout -- .` 再 `git clean -fd`，這樣就算 ignore 檔不見或被改，老師被 ignore 的檔案也不會被刪掉。報告會逐行列出升級刪掉的檔案；有衝突時，R4 會說明 `|||||||` 後面那段是哪個版本的內容；R4 的 `pnpm install` 與推 tag 兩行依條件出現。另外修正 `range.json` 的 `__proto__` key 被吃掉的問題，更新 GLOSSARY「設定紀錄」那句。最後跑完整的第 8 階段模擬：一個從 A 升級到 B 的靶場，以及一個用已發布的 3.0.0 建立、不帶 `--from` 升級的靶場。

## Comments
- 2026-11-10: stage 8 step 5 uses the published `create-wxl@3.0.0` (W5's mechanism change,
  confirmed under the user's authorisation of 2026-11-10; T-0061 Comments). From T-0061's stage 6
  (F4): the restore order in UP-E09 (`messages.mjs`, both languages) and R5 (`upgrade-report.mjs`)
  is this ticket's, with D14.
- 2026-11-10, stage 5 records:
  - Commits `fb7c424` (D14), `9f1b602` (D16), `d112273` (U76), `83b0879` (R-6), `c2ac252` (U70),
    `82db60c` (D20), `085980b` (W4), on the ticket branch over `main` `89a1e22`; the test counts below are at `5319e90`. `pnpm --dir create-wxl test` →
    `Test Files 37 passed (37) / Tests 707 passed | 1 skipped (708)`; `pnpm test --run` →
    `Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)`.
  - Mutations (each run, then reverted with `git checkout -- create-wxl/src`):

    | Mutation (in `create-wxl/src/upgrade-report.mjs`) | Command | Tests that fail |
    |---|---|---|
    | `RESTORE_COMMANDS` back to clean first: swap its two entries | `npx vitest run test/upgrade-restore.test.mjs -t U70` | U70 (a) and (b); (c) stays green, as expected |
    | `sed -i '' "s/(op.path === 'package.json' \|\| op.path === 'pnpm-lock.yaml')/(op.path === 'package.json')/"` | `npx vitest run test/upgrade-report.test.mjs -t U76` | U76, the `pnpm-lock.yaml` (M5) case |
    | `sed -i '' "s/if (hasDeployWorkflow) lines.push/if (true) lines.push/"` | same | U76, the two cases without a deploy workflow |
    | `sed -i '' "s/if (wroteDependencyFile(ops)) lines.push/if (true) lines.push/"` | same | U76, the case that writes neither |

  - Deviations:
    - U76's write check reads `package.json`'s new script, not the archive's bytes, because the
      pristine target rewrites `package.json`'s version.
    - The object-spread path of `range.json` (no `upstream` key yet) already keeps an own
      `__proto__` key (`node -e 'const c=JSON.parse("{\"__proto__\":{\"x\":1},\"y\":2}"); console.log(Object.keys({upstream:1,...c}))'`
      prints `[ 'upstream', '__proto__', 'y' ]`), so only the path that replaces `upstream`
      changed. Stage 6 adds U24 ⑦ for that path.
  - K-5 (round 2), checked in `create-wxl/src/merge-apply.mjs` at `83b0879` (`:105-106` sorting; `:65`, `:109`
    and `:119` `tempPathFor`; `:91`, `:115` and `:152` the `guard` checks outside a `try`;
    `upgrade.mjs:576-579` the catch):
    - a bug thrown inside a delete's or a write's own `try` in step 9, including `range.json`'s
      write, is reported as UP-E09 with the restore commands, exit 1;
    - a bug thrown outside those `try` blocks reaches `runUpgrade`'s catch and is reported as
      CW-E14, exit 1, without the restore commands, though step 9 may already have changed
      files. That code is the sorting of `ops`, `tempPathFor`, or the `guard` calls.
    - Recorded, not changed: no such bug is known, and the spec asks only for the check.
  - U70 with git 2.20: not run. Only git 2.54 is installed. The git 2.20.1 source was downloaded
    from kernel.org and its SHA-256 matched `sha256sums.asc`
    (`9d2e91e2faa2ea61ba0a70201d023b36f54d846314591a002c610ea2ab81c3e9`), but this session's
    auto-mode classifier refused to build it ("Code from External"). The user runs it, and a
    failure goes back to the user before this ticket closes (spec Testing Decisions).
- 2026-11-10, stage 6: Standards (A1–A7, B1–B7, C1–C4, D1–D6) and Spec (F1–F13), no high finding;
  record in the local note `.proj.research/2026-11-10-T-0063-stage6-review.md`. Applied under the
  user's authorisation of 2026-11-10 ("後面都授權你，按照你的建議"):
  - Fixed at `50078b5`:
    - B1 (with D2, B5): `test/helpers/restore.mjs` runs the restore commands, each required to
      exit 0, and checks their printed order.
    - F4 (D4): R5 renders the commands with `posixCommand`, as UP-E09 does.
    - B2, B4: U72 checks the deleted count and calls `buildReport` with unsorted deletes; removing
      the sort at `upgrade-report.mjs:106` fails it (`npx vitest run test/upgrade-report.test.mjs`).
    - B3, F7: U76 checks that the dependency file a case does not name is byte-identical.
    - F8: U70 compares the ignored file as bytes and lists the ignored files again after the
      commands.
    - F3: U24 ⑦ covers the path with no `upstream` key.
    - C1–C4, B6, F5, F6, F13, D6: comments, test names and file headers.
    - `pnpm --dir create-wxl test` → `Test Files 37 passed (37) / Tests 709 passed | 1 skipped (710)`.
  - Fixed in this record: A1 (the acceptance criteria are checkboxes, checked only where met), A3,
    F11 (commands and pins added; the commits are on the ticket branch, not `main`), F10 (AC-6),
    A6 and F12 (the test plan's D14 row did not list `upgrade-ignored.test.mjs`, whose P-7 restore
    also moved to the shared commands).
  - A2, F1: the git 2.20 run of U70 stays open, and its criterion stays unchecked. This session
    cannot build git 2.20 (stage 5 records). The status stays `review` because the implementation is
    done; the ticket does not close until the user has run it.
  - Recorded, not changed:
    - A4: the Traditional Chinese test plan follows T-0061's and T-0062's precedent (T-0062 S-6).
    - A5: the user's authorisation covers all later work, this ticket included.
    - A7: the GLOSSARY sentence is W4's wording verbatim. Its "只記從哪一版上游建立" contrasts
      with the teacher's settings, which are not recorded yet.
    - D1, D3: the code-unit comparison and `RESTORE_COMMANDS`'s two-entry shape are local and
      unchanged.
    - D5: `RESTORE_COMMANDS` stays in `upgrade-report.mjs`, as the test plan says.
    - F2: a signal after `range.json`'s rename is reported as UP-E09, though step 9 finished.
      This is earlier behaviour that this diff did not change; step 9 reads as checking the guard
      after that write too.
  - For the user (F9; measured after the review with git 2.54.0 in a temporary repository: `HEAD`
    with `.gitignore` `*.local` and a file `a`; `a` replaced by a directory holding `a/x` and the
    ignored `a/y.local`; `git checkout -- .` exited 0 and left the file `a`, without `a/y.local`): an ignored file inside a
    directory that stands where a tracked file goes (`a/y.local` where `HEAD` has a file `a`) is
    removed by `git checkout -- .` whatever the order, since git must remove the directory. AC-11
    and B4 do not list this case. A spec revision could add it to B4's Does not protect.
- 2026-11-10, stage 7: project security review (`.claude/skills/security-review/SKILL.md`), report
  `.proj.specs/0006-range-upgrade/review/security-T-0063.md`. 8 candidates, every one judged a
  false positive by an independent reviewer (each an accepted risk in B1, B4 or B5, or behaviour that
  traceability R2, R4 and R5 specify); no confirmed finding, so nothing to fix. Optional hardenings
  are recorded there, not adopted. A first launch reused T-0062's workflow script, which named
  T-0062's diff; it was stopped before any result, and none was used.
- 2026-11-10, stage 8 (0006-S2, U32; surface: a terminal on macOS darwin arm64, Node v24.13.0, git
  2.54.0; `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM` unset):
  - A = `69d769cd852f37bc0e3fa6c6bc211b13a3ce3213`, this ticket's HEAD as pushed. The package was
    packed there with `npm pack`, and its `dist/source.json` names A.
  - B = `4e5ae0940cd359c747a9ef6f6de76992461f9dde`, on `sim/0006-upgrade`: A plus the five upstream
    changes, committed with the commit skill and pushed.
  - Every run of the packed package was `npx --yes --package <tarball> create-wxl …`. Commits
    inside the temporary ranges are fixtures (the spec's exception to hard rule 5).
  - Step 1: `sim` made with `CREATE_WXL_COMMIT=<A>`, exit 0.
  - Step 2: in `sim`, the tagline set to `tagline: Teacher edit`, one line of
    `staff-only/index.md` changed, `platform/public/teacher-note.txt` added; fixture commit
    `7a8d20d`.
  - Step 3 (`CREATE_WXL_COMMIT=<B>`, no `--from`): exit 1. CW-W04, then UP-E12 naming 3.0.0, A, and
    tag `v3.0.0`'s `52192fa…`, with D18's remedies in order. stdout empty, status empty.
  - Step 4 (`--from <A>`): exit 0; only CW-W04 on stderr.
    - R1 names base 3.0.0 (A) and target 3.0.0 (B), with "the base was given by --from <commit> and
      not checked against an upstream tag".
    - R2: `updated 2 added 1 deleted 1`, then `R2: ".archive/guide/terminal.md"`.
    - R3: exactly UP-A1 `platform/index.md`, then UP-A12.
    - R4 holds the D16 sentence, `pnpm install` and the `v*` tag line; R5 is in D14's order.
    - `platform/index.md` holds the block labelled `range`, `3.0.0` and `3.0.0`, with both taglines
      and the base's tagline after `|||||||`.
    - `staff-only/index.md` has no diff and `teacher-note.txt` is unchanged.
    - `package.json` holds `sim:noop`, version `0.1.0` and the repository `wxl-test/sim`.
    - `range.json` names B.
    - After the block was replaced with `tagline: Teacher edit`, `pnpm install && pnpm build`
      succeeded ("build complete").
    - `git checkout -- .` then `git clean -fd` gave an empty
      `git status --porcelain=v1 --untracked-files=all` at the fixture commit.
  - Step 5: `rel` made by the published `npx --yes create-wxl@3.0.0 rel …`, exit 0.
  - Step 6 (`CREATE_WXL_COMMIT=<B>`, no `--from`): exit 0; only CW-W04; no UP-I01 and no UP-E12.
    - R1 names base 3.0.0 with `52192fa85fe7c6c7bf4cecb4c287d6f2876387a4`, which
      `git rev-parse 'v3.0.0^{commit}'` prints in the upstream checkout. Its target is 3.0.0 (B),
      and it carries no unchecked note.
    - `range.json` names B.
    - R2 was `updated 65 added 25 deleted 1`, with one path line; R3 had one item. Neither is pinned
      by the spec.
    - `git checkout -- .` then `git clean -fd` gave an empty status.
  - Afterwards `sim/0006-upgrade` was deleted on `origin` and locally (`git ls-remote --heads origin
    sim/0006-upgrade` prints nothing). `create-wxl/dist/`, `create-wxl/LICENSE`, the tarball and the
    temporary ranges were removed.
- 2026-11-10, git 2.20 and 2.54 compared (two `harness-researcher` passes over git's release notes
  2.21–2.56 and the v2.20.1 and v2.54.0 sources; local note `.proj.research/2026-11-10-git-2.20-vs-2.54.md`):
  - U70's three cases read the same in both versions (`state.force = 1`; `remove_subtree()` ignores
    the ignore rules; `clean` reads `.gitignore` from the work tree). F9 holds in 2.20 too.
  - Git 2.20–2.25 differ elsewhere:
    - `check-ignore` ignores `!` re-inclusions until 2.25.2;
    - `core.fsmonitor=true` is run as a hook before 2.26 and may report no changes, so step 4's
      clean check could pass on a dirty tree;
    - `merge.conflictStyle=zdiff3` dies before 2.35, failing closed as UP-E11.
  - The user decided on 2026-11-10: the floor rises to 2.26 for create and upgrade alike, and
    Ubuntu 20.04 (git 2.25.1) is not supported. T-0065 carries the spec revision and the change;
    the git 2.20 run of U70 is therefore not made.
- 2026-11-10, landed: PR #74 squash-merged into `main` as `8455c34` (CI 10 of 10 passing, including
  `fork-init-cross-os (windows-latest, 24)`). Status set to done.
