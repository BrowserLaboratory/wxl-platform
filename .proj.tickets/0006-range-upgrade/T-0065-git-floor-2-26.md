---
id: T-0065
title: Git floor 2.26 and the restore exception
epic: 0006-range-upgrade
status: processing
blocked_by: []
---

## Context

T-0063 compared git 2.20 and 2.54 for every command the upgrade and the restore run (T-0063's
Comments; local note `.proj.research/2026-11-10-git-2.20-vs-2.54.md`). Before 2.26 git runs
`core.fsmonitor=true` as a hook command and may report no changes, so the upgrade's clean check could
pass on a dirty tree; before 2.25.2 `git check-ignore` ignores `!` re-inclusions. T-0063's stage 6
(F9) also measured that `git checkout -- .` removes an ignored file inside a directory that stands
where `HEAD` has a file, which AC-11's last clause did not allow for. On 2026-11-10 the user decided to
raise git's floor to 2.26 and not to support Ubuntu 20.04, and authorised the rest as recommended.

## Deliverable

Create and the upgrade require git 2.26 or later: older git gets CW-W01 (create) or UP-E02
(upgrade), whose text names 2.26. Spec 0006 revision 3.3 (D21, D22) and 0005 revision 2.3 record the
floor and the restore exception, and U70 shows the exception.

## Acceptance criteria

Spec `.proj.specs/0006-range-upgrade/spec.en.md` revision 3.3 and `traceability.md` revision 3.3;
`.proj.specs/0005-create-wxl/spec.en.md` and `traceability.md` revision 2.3. Decisions D21, D22.

- [ ] Rows: U04 (2.25.1 refused, 2.26.0 passes), U31 (C36 and G0's floor), U70 (the D22 case);
  0005's C36.
- [ ] ACs reached: AC-2 (U04), AC-11 (U70), AC-12 (U31); 0005's AC-15 (C36).
- [ ] Stage 8: the packed package on a terminal, with a `git` on `PATH` that reports 2.25.1, gives
  UP-E02 naming 2.26 for `upgrade` and CW-W01 naming 2.26 for create; with the real git, `upgrade`
  passes step 3.

## Test plan

### 2026-11-10 — test plan table（依使用者 2026-11-10 的授權「一路完成到最後，授權你按照你建議」核准，寫第一個測試之前）

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | git 2.25.1 → UP-E02，2.26.0 通過 step 3（D21） | `upgrade-preconditions.test.mjs` 的 (2)、(3) | U04 / AC-2 | 2.25.1 → UP-E02 帶找到的版本、exit 1；2.26.0（含下限）→ 沒有 UP-E02。預期紅燈：現在 2.25.1 會通過 |
| 0005-S1 | G0 回報 2.25.1 → CW-W01，2.26.0 跑 git 步驟（D21） | `run-git.test.mjs` 的版本案例 | C36 / AC-15 | 2.25.1 → CW-W01，沒有其他 `runGit` 呼叫；2.26.0 通過。預期紅燈 |
| 0006-S1 | UP-E02 與 CW-W01 的文字寫出 2.26 | `upgrade-messages.test.mjs`、create 的訊息測試 | AC-2、0005 AC-15 | 兩種語言都含 `2.26`。預期紅燈 |
| 0006-S1 | 還原指令會移除「`HEAD` 是檔案的位置上的資料夾」裡的被忽略檔案（D22） | `upgrade-restore.test.mjs` U70 新增 (d) | U70 / AC-11 | (c) 的樹再加一個被忽略的 `a/y.local` → status 為空、`HEAD` 的檔案，`a/y.local` 不見，其他被忽略的檔案逐 byte 不變。確認型：git 本來就這樣，測試鎖住 D22 的例外 |

## 給使用者（zh-TW）

把 git 的最低版本從 2.20 提高到 2.26，建立靶場與升級都一樣。原因是 T-0063 比較 git 2.20 與 2.54 時發現兩件事：舊版 git 遇到 `core.fsmonitor=true` 可能把有修改的工作樹誤判為乾淨，升級就可能覆寫老師沒 commit 的修改；`check-ignore` 也不理會 `!` 否定規則。Ubuntu 20.04 內建的 git 2.25.1 因此不再支援。另外把 T-0063 第 6 階段實測到的 F9 寫進 spec：檔案被換成資料夾時，還原指令會連資料夾裡被忽略的檔案一起刪掉。

## Comments
