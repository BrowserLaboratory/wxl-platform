---
id: T-0061
title: Upgrade base provenance
epic: 0006-range-upgrade
status: review
blocked_by: []
---

## Context

Epic 0006's chain analysis (`.proj.specs/0006-range-upgrade/review/chain-analysis.md`) found chains
that cross from B3 (`range.json` → the upgrade) to B4 (the upgrade → the teacher's repository and
work). B3's "Does not protect" accepts that whoever can change `range.json` (a co-teacher, a merged
pull request) can pick any fork-network commit as base, but names only one consequence, skipping
upstream changes. The base's content, b, is then the attacker's, and the merge table trusts it:

- **X1** — b copied from the teacher's files makes o ≡ b: M5 overwrites the teacher's changes with t,
  M6 deletes the teacher's files, a clean M12 drops chosen lines; none of these is an attention item,
  and the pull request shows only a new 40-hex commit in `range.json`.
- **X2** — b's lines appear in the `|||||||` section of `--diff3` conflict blocks, which the teacher
  reads as the old upstream version.
- **X3** — on Windows with 8.3 short names, a regular file `GITIGN~1` in b, a copy of the teacher's
  `.gitignore`, resolves on disk to `.gitignore`: M6 deletes it, and R5's `git clean -fd` then deletes
  every file the teacher's rules ignored. HFS+ ignorable code points are the same kind.

Severity low (X3 at the low edge of medium): no code runs, a clean merge holds only o's and t's lines,
tracked files are recoverable (X3 excepted), and deploying needs the teacher's own commit and push.

## Deliverable

A base read from `range.json` is downloaded through upstream's tag and must be that release's commit,
so a changed record cannot hand the merge content that is not upstream's without the upgrade stopping
(UP-E12) and telling the teacher what to do (D18). An untracked `range.json` that the range ignores is
refused before anything is written (UP-E13). A `--from <commit>` base is marked in R1 as not checked.
Git failures in steps 4 and 5 are CW-E14 naming the command.

This ticket is the first of three after stage 4 (2026-11-10): the on-disk name aliases and the `.git`
alias rule moved to T-0062, the restore order, the report additions and the stage 8 simulation to
T-0063. Chains X1 and X2 close here; X3 closes in T-0062 and T-0063.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.1 and `traceability.md` revision 3.1.
Decisions D11, D15, D17, D18, and D19 for steps 4 and 5.

- [x] **Prefactor first:** every test that builds a `range.json` base serves it as a tag archive whose
  `comment` is the recorded commit (spec Testing Decisions), and the seam isolates `HOME` and
  `XDG_CONFIG_HOME` as 0005-S1 does (W3); the suite stays green before J6 lands.
- [x] Rows: U06, U16, U51, U52, U65, U66, U67, U71, and U74's step 4 case.
- [x] ACs reached: AC-2 (U67, U74), AC-3 (U06, U65), AC-4 (U51, U52), AC-5 (U16, U66), AC-10 (U71).
- [ ] Stage 8: a terminal run of the packed package (0006-S2): UP-E12 with D18's remedies against the
  real tag `v3.0.0` for a range whose `range.json` names another commit, and the upgrade without
  `--from` of a range made by the published `create-wxl@3.0.0` (the simulation's steps 5–6). The full
  simulation (U32) runs in T-0063.

## Test plan

### 2026-11-10 — test plan table（使用者 2026-11-10 核准，寫第一個測試之前）

seam 全部是 0006-S1（0005-S1 的 `run`，argv 第一個位置參數是 `upgrade`）。「預期紅燈」是寫好測試、還沒改程式時的失敗原因；寫好就綠的列是確認型測試，照 0006 回顧的做法另做一次 mutation 檢查。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | prefactor：`range.json` 的 base 可以用 tag ref 下載，現有測試全部維持綠燈 | `test/helpers/ref-fetch-archive.mjs` 的 `makeRefFetchArchive` 加 `releases: { [version]: commit }`，讓 `refs/tags/v<version>` 回傳和 `byRef[commit]` 相同的 archive；33 個呼叫點補上 `releases`。不改產品程式 | （無；Testing Decisions 的 prefactor） | 補完後全部 upgrade 測試仍是 184 passed；沒有任何測試改預期 |
| 0006-S1 | 合法 `range.json`：base 經由 tag 下載，target 照舊用 commit | `upgrade-base.test.mjs` 的 U06 改預期 | U06 / AC-3 | `fetchArchive` 依序收到 `refs/tags/v<version>` 與 target commit；R1 的 base 是記錄的 version 與 commit。預期紅燈：現在收到的是 commit |
| 0006-S1 | 記錄的 commit 不是 tag 的 commit → UP-E12 | `upgrade-base.test.mjs` 新增 U65 三個子案 | U65 / AC-3 | (a) comment 是另一個 40 hex：UP-E12 帶 version 與兩個 commit、D18 三項補救依序出現，exit 1，沒寫任何檔，`tmpRoot` 沒有 `create-wxl-upgrade-` 殘留；(b) 同 (a)，archive 另含 `git~1` 元件：仍是 UP-E12，不是 CW-E08；(c) 同 (a)，target 下載失敗：CW-E07（target）。預期紅燈：現在用 commit 下載，不會有 UP-E12 |
| 0006-S1 | tag archive 的 comment 缺或不是 40 個小寫 hex → UP-E08 | `upgrade-target.test.mjs` 的 U16 加 `range.json` 子案 | U16 / AC-5 | `range.json` base：UP-E08 附 D18 補救；`--from <version>`：UP-E08 不附補救（既有子案保留）。預期紅燈：`range.json` 子案現在不走 tag |
| 0006-S1 | tag 不存在或下載失敗 → CW-E07 | `upgrade-target.test.mjs` 新增 U66 三個子案 | U66 / AC-5 | `range.json` base 回 404：CW-E07 帶 URL 與 D18 補救；`--from <version>` 回 404：不附補救；`range.json` base 的 tag 下載被 reject（網路錯誤）：CW-E07 不附補救。都 exit 1、沒寫檔、沒殘留。預期紅燈：前兩項的補救文字還不存在 |
| 0006-S1 | 沒被追蹤又被 ignore 的 `range.json` → UP-E13（D15），以及它和 J1～J5、step 6 的先後 | 新檔 `upgrade-ignored-record.test.mjs`，U67 十二個子案 | U67 / AC-2 | 存在且合法：UP-E13、`fetchArchive` 沒被呼叫；不存在＋`--from 3.0.0`：UP-E13；commit 等於 target：UP-E13 不是 UP-I01；是 symlink：UP-E06 `not-a-file`；tracked 且符合 ignore 規則：照常進行；`check-ignore` exit 128：CW-E14；`ls-files` exit 128：CW-E14；`runGit` 對 `check-ignore` reject `EIO`：CW-E14 帶 `git check-ignore`；只被 `.git/info/exclude` ignore：UP-E13；不存在、被 ignore、沒有 `--from`：UP-E04；不是 JSON 且被 ignore：UP-E06 `not-json`；repository 不同且被 ignore：UP-E05。每個拒絕都 exit 1、沒寫檔。預期紅燈：UP-E13 與 CW-E14 子案；UP-E04／E06／E05 子案是確認型 |
| 0006-S1 | step 4 的 git 失敗 → CW-E14 帶指令名稱（D19） | `upgrade-preconditions.test.mjs` 的 D6 區塊加 U74 step 4 子案 | U74（step 4）/ AC-2 | `git status` exit 128：CW-E14 帶 `git status`（確認型，D6 已實作）；**新子案**：`runGit` 對 `git status` reject `EIO`：CW-E14 帶 `git status`（D19 要求包裝 reject）。預期紅燈：reject 子案，現在原樣拋出、不帶指令名稱 |
| 0006-S1 | `--from <commit>` 的下載後檢查 | `upgrade-target.test.mjs` 的 U51 中間子案改寫 | U51 / AC-4 | 版本等於 target、commit 不同、沒有 `CREATE_WXL_COMMIT`：下載後 UP-I01，`fetchArchive` 兩份都被呼叫。確認型 |
| 0006-S1 | `--from <version>` 解析到 target 的 commit | `upgrade-target.test.mjs` 的 U52 改寫 | U52 / AC-4 | 設 `CREATE_WXL_COMMIT=<tag 的 commit>`：兩份下載之後 UP-I01，`fetchArchive` 呼叫兩次，沒寫檔。確認型 |
| 0006-S1 | R1 標明 `--from <commit>` 的 base 沒有比對 tag（D17） | `upgrade-report.test.mjs` 新增 U71 | U71 / AC-10 | `--from <commit>`：句子出現；`--from <version>`、`range.json`：不出現；en 與 zh-TW 都驗。預期紅燈：句子還不存在 |
| 0006-S1 | 新代碼在兩份訊息表都有 | `upgrade-messages.test.mjs` 的代碼清單加 UP-E12、UP-E13 | U26（代碼部分）/ AC-10 | en 與 zh-TW 都有 UP-E12、UP-E13，且以代碼開頭。預期紅燈：代碼還不存在 |

### 2026-11-10 — test plan addendum（第 6 階段處置，使用者 2026-11-10「照提案」核准）

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | D18 的補救只出現在 D18 說的地方 | `upgrade-target.test.mjs` 新 describe（F10） | U66 / AC-5 | `range.json` base 下載成功、target 回 404：CW-E07 帶 target URL，不附補救；`range.json` 的 tag 回 500：CW-E07 不附補救。確認型 |
| 0006-S1 | reject 之前已收到訊號仍是 exit 130 | `upgrade-preconditions.test.mjs` 新 describe（F14、B10） | U74 / AC-2 | step 4 的 `git status`、step 5 的 `check-ignore -- ./range.json`。確認型 |
| 0006-S1 | `runGit` 對 `ls-files -z -- ./range.json` reject | `upgrade-ignored-record.test.mjs` U67(m)（F15） | U67 / AC-2 | CW-E14 帶 `git ls-files -z -- ./range.json` |
| 0006-S1 | 訊息內容 | `upgrade-messages.test.mjs` 新 describe（F5～F8、F16、B8、B9、B11） | U26（代碼）/ AC-10、AC-5 | UP-E12 的原因與補救順序；UP-E08、CW-E07 的補救說「沒辦法經由 tag 驗證」（revision 3.2 D18）；UP-E13 的三個規則來源、補救與 `Range.json`；en 與 zh-TW |
| 0006-S1 | 既有子案加強斷言 | U06、U65(b)(c)、U66(b)、U67(e)、U71（F11、F12、F13、F18） | 各列原 AC | U06、U67(e) 斷言 exit 0；U65(b)(c) 斷言沒有暫存殘留；U66(b) 斷言 URL；U71 補 `--from <version>` 的 zh-TW |

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-base`（U06、U65）、`upgrade-target`（U14(a) 的下載斷言、U16、U52、U66）、新檔 `upgrade-ignored-record`（U67）、`upgrade-preconditions`（U74 step 4）、`upgrade-report`（U71）、`upgrade-messages`（UP-E12、UP-E13）；prefactor 動到 11 個升級測試檔與 `ref-fetch-archive.mjs` | not measured：create-wxl 沒有安裝 coverage provider（與 T-0020～T-0027 相同） | U06、U16、U51、U52、U65、U66、U67、U71、U74（step 4）；AC-2、AC-3、AC-4、AC-5、AC-10 | U74 的 step 8 子案屬於 T-0062；U51 沒有修改，既有的中間子案已符合 revision 3.1 的列；D19 的 reject 包裝只對 step 4、5 有測試，step 8 留給 T-0062；fixture 在 tag ref 回的是 `<repo>-<commit>/` 前綴的 archive，不是真實 tag 的 `<repo>-<version>/`，rule 2 只比對第一層是否一致所以行為相同，真實形狀由第 8 階段驗（F17） |
| 0006-S2 | — | — | 第 8 階段：tag `v3.0.0` 的 UP-E12 與 `create-wxl@3.0.0` 靶場不帶 `--from` 的升級 | 第 8 階段另外記錄 |

Checks at `2751498`, macOS (darwin arm64, Node v24.13.0), 2026-11-10:
`pnpm --dir create-wxl test` → `Tests 650 passed (650)`；`pnpm test --run` → `Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)`。
After stage 6's fixes (2026-11-10): `pnpm --dir create-wxl test` → `Test Files 36 passed (36) / Tests 660 passed (660)`; the root suite was not rerun, since stage 6 changed only `create-wxl/` and documents.

Confirmation tests (green when written) and their mutation checks, each run and then restored:
U65(c) — validating the base before the target download makes it fail; U66(b) — dropping
`remediesOn404 &&` makes it fail; U67(d)(j)(k)(l) — moving D15 before J1–J5 makes all four fail;
U67(e) — dropping the "untracked only" condition makes it fail; U52(b) and F22 — dropping step 6's
`baseCommit !== undefined` makes them fail.

## 給使用者（zh-TW）

epic 0006 串連分析開出的後續票，第 4 階段拆成三張，這是第一張。能改 `range.json` 的人（共同授課老師、被合併的 PR），原本可以把 base 指向 fork network 裡自己做的 commit，讓升級蓋掉老師的修改、刪掉老師的檔案，或在衝突區塊放進他寫的文字。這張票讓 `range.json` 記錄的 base 一律經由上游的 tag 下載，對不上就以 UP-E12 停下，並依序建議老師怎麼補救；被 ignore 的 `range.json` 在下載前就以 UP-E13 拒絕；用 `--from <commit>` 指定的 base，報告會標明沒有比對上游 tag。磁碟上的檔名別名交給 T-0062，還原指令順序與報告的新內容交給 T-0063。

## Comments

- 2026-11-09, stage 1: the user settled decisions D11–D17 (record:
  `.proj.research/2026-11-09-t0061-grill.md`), including OQ-026 (D15) and 0005's chain-analysis gap 1
  (D13); 0005's gap 2 (B7's G4 hook) goes to a separate maintenance ticket, opened after asking the
  user. The alias check above is stronger than this ticket first said: D12 compares the whole relative
  path (the deepest existing ancestor when o is absent), not only the last component. This ticket runs
  under the standing authorisation of 2026-11-07, which the user extended to it.
- 2026-11-10, stage 2: `traceability.md` revision 3 and the spec are revised (rows U65–U73; codes
  UP-E12, UP-E13, UP-A15); 0005's matrix is at revision 2.2. Acceptance criteria are traced at stage 4.
- 2026-11-10, stage 2 self-check (workflow `wf_d98348ca-1d6`, 94 findings, 90 kept after independent
  refutation, all applied; list in the local note `.proj.research/2026-11-10-t0061-stage2-selfcheck.md`). The user
  scheduled this ticket on 2026-11-09, so the pause ended: status moved from pending to processing and
  the pending fields were dropped (their text is in Git history). Code comments and strings revision 3
  makes stale, to change at stage 5: `messages.mjs` UP-E09 comment and both UP-E09 messages (D14);
  `upgrade-report.mjs` R5 comment and both R5 strings (D14); `upgrade.mjs` step 5 comment (J6, D15),
  step 7 comment (a base from `range.json` is downloaded by tag, D11) and the tag-mode comment;
  `merge-plan.mjs` P-7 rationale comment (the restore order). No published create-wxl prints R5:
  v3.0.0 predates the upgrade code and rejects `upgrade` (0005 AC-2), so the old restore order reaches
  teachers only if create-wxl is published from `main` before T-0061 lands.
- 2026-11-10, stage 3: round 2 found no P0 (`review/round-2.md`; 5 P1, 57 P2). The user approved the
  disposition (`review/disposition-2.md`) and D18–D20; revision 3.1 applies it (rows U74–U76).
  Carried into stage 5: change the GLOSSARY setup record sentence ("目前只有建立靶場的指令會寫入它")
  together with its assertion in `upstream-config.test.mjs` (W4); fix `range.json`'s `__proto__` key
  in `merge-apply.mjs` (R-6, U24); check which code step 9 prints for a bug (K-5).
- 2026-11-10, stage 4: the user approved splitting the work into T-0061 (this ticket, base
  provenance), T-0062 (on-disk name aliases, `.git` alias rule, step 8 git failures) and T-0063
  (restore order, report additions, stage 8 simulation). The title, file name and branch were
  shortened to `upgrade-base-provenance` (the branch had not been pushed). Items carried to stage 5
  above go to the ticket that owns them: the GLOSSARY sentence, `__proto__` and step 9's bug code to
  T-0063; the stale comments to the ticket that changes each file.
- 2026-11-10, stage 5 (U67, D15): deviation, recorded as the 0006 retrospective asks. Step 5's new
  `git ls-files -z -- ./range.json` also matched the stub of `upgrade-ignored.test.mjs` "git ls-files
  -z fails closed", which is meant to fail step 8's `git ls-files -z`; the run then stopped at step 5
  and the test went red. The stub was narrowed to the two-argument call step 8 makes
  (`merge-plan.mjs` `planMerge`), so the test checks step 8 again; its assertions are unchanged.
  U65(b)'s fixture holds both `git~1/x` and `.git/x`: `git~1` is rejected only after T-0062, and
  `.git/x` makes the "comment checks first" order testable now.
- 2026-11-10, stage 6: two `harness-reviewer` passes (Standards 25 findings, Spec 19; no high),
  recorded with their dispositions in the local note `.proj.research/2026-11-10-T-0061-stage6-review.md`.
  The user approved every proposal ("照提案"), including F5, which changed D18's wording
  (`traceability.md` revision 3.2) and the new or stronger tests in the test plan addendum above.
  Moved: S1 (one helper for the ignored-path check of D15 and P-5) and the stale comment in
  `archive-rules.mjs` (F4) to T-0062; the restore order in UP-E09 and R5 (F4) stays with T-0063.
  Recorded, not changed: S2, S4, S6, S7 (a note on U15), F17 (in the coverage table), F19.
  Deviation (B12): U74's step 4 rejection case is its own `describe` at the end of
  `upgrade-preconditions.test.mjs`, not inside the D6 block the test plan named; the cases are as
  approved.
- 2026-11-10: the user authorised the rest of this session's work to follow the agent's
  recommendations ("後面都授權你，按照你的建議"); `npm publish` stays with the user, as the original
  instruction said. Under it: stage 8 step 5 uses the published `create-wxl@3.0.0` (W5's
  mechanism change, confirmed), and 0005's chain-analysis gap 2 is opened now as maintenance
  ticket T-0064, to be done after the release.
- Mutation checks (B13), each made on the stage 6 fix commit with the edit shown, the named test
  run with `pnpm --dir create-wxl exec vitest run <file> -t "<name>"` failing, then the file
  restored with `git checkout -- <file>`:

  | Edit | Test that fails |
  |---|---|
  | `upgrade.mjs`: move the target download after the base's `readArchiveEntries` | `upgrade-base` U65(c) |
  | `run-shared.mjs`: `remediesOn404 && status === 404` → `status === 404` | `upgrade-target` U66(b) |
  | `run-shared.mjs`: `remediesOn404 && status === 404` → `remediesOn404` | `upgrade-target` F10(b) |
  | `upgrade.mjs`: pass `remediesOn404: true` to the target's `downloadArchive` | `upgrade-target` F10(a) |
  | `upgrade.mjs`: move the D15 block to the start of step 5 | `upgrade-ignored-record` U67(d)(j)(k)(l) |
  | `upgrade.mjs`: `if (recordTracked.stdout === '')` → `if (true)` | `upgrade-ignored-record` U67(e) |
  | `upgrade.mjs`: drop `baseCommit !== undefined &&` from step 6's equal-version check | `upgrade-target` U52(b), F22 |
  | `upgrade.mjs`: drop `guard.throwIfRaised()` from `runGitNamed` | `upgrade-preconditions` F14 (both cases) |
- 2026-11-10, stage 7: project security review (`.claude/skills/security-review/SKILL.md`), report
  `.proj.specs/0006-range-upgrade/review/security-T-0061.md`. 13 candidates, every one judged a
  false positive by an independent reviewer; no confirmed finding, so nothing to fix. C1's optional
  tightening of D18 is recorded there, not adopted.

