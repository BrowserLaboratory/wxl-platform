---
id: T-0065
title: Git floor 2.26 and the restore exception
epic: 0006-range-upgrade
status: review
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

- [x] Rows: U04 (2.25.1 refused, 2.26.0 passes), U31 (C36 and G0's floor), U70 (the D22 case);
  0005's C36.
- [x] ACs reached: AC-2 (U04), AC-11 (U70), AC-12 (U31); 0005's AC-15 (C36).
- [x] Stage 8: the packed package on a terminal, with a `git` on `PATH` that reports 2.25.1, gives
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

### 2026-11-10 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-preconditions`（U04 的 2.25.1 與 2.26.0）、`upgrade-messages`（git floor text）、`upgrade-restore`（U70 (d)，兩種順序） | not measured：create-wxl 沒有安裝 coverage provider | U04、U70；AC-2、AC-11 | 沒有在 git 2.26～2.35 上實測；C1、C2 的行為來自 git 文件與原始碼（B4） |
| 0005-S1 | `run-git`（C36 的 2.25.1，2.26.0 control）、`upgrade-messages` 的 CW-W01 兩列 | not measured | C36；0005 AC-15；U31／AC-12 | — |

## 給使用者（zh-TW）

把 git 的最低版本從 2.20 提高到 2.26，建立靶場與升級都一樣。原因是 T-0063 比較 git 2.20 與 2.54 時發現兩件事：舊版 git 遇到 `core.fsmonitor=true` 可能把有修改的工作樹誤判為乾淨，升級就可能覆寫老師沒 commit 的修改；`check-ignore` 也不理會 `!` 否定規則。Ubuntu 20.04 內建的 git 2.25.1 因此不再支援。另外把 T-0063 第 6 階段實測到的 F9 寫進 spec：檔案被換成資料夾時，還原指令會連資料夾裡被忽略的檔案一起刪掉。

## Comments
- 2026-11-10, evidence for D21 and D22 (read through WebFetch by two `harness-researcher` passes;
  T-0063's Comments summarise them; full notes in the local `.proj.research/2026-11-10-git-2.20-vs-2.54.md`):
  - fsmonitor: https://raw.githubusercontent.com/git/git/v2.36.0/Documentation/config/core.txt —
    "Git versions prior to 2.26 default to hook protocol V1 and will silently assume there were no
    changes to report (no scan)", and versions 2.35.1 and earlier read `true`/`false` as hook paths.
  - `check-ignore`: https://raw.githubusercontent.com/git/git/master/Documentation/RelNotes/2.26.0.adoc
    (also in 2.25.2) — "\"git check-ignore\" did not work when the given path is explicitly marked as
    not ignored with a negative entry".
  - zdiff3: https://raw.githubusercontent.com/git/git/master/Documentation/RelNotes/2.35.0.adoc, and
    v2.20.1's `git_xmerge_config` dies on an unknown style.
  - D22: `remove_subtree()` in https://raw.githubusercontent.com/git/git/v2.20.1/entry.c and
    https://raw.githubusercontent.com/git/git/v2.54.0/entry.c unlinks every entry without reading the
    ignore rules; measured with git 2.54.0 in both orders (U70 (d)).
- 2026-11-10, stage 5: commits `35a72be` (spec revision 3.3 and 2.3), `f2c302f` (zh-TW), `719113f`
  (the floor, tests). Red before the change: 7 tests (U04, C36's five cases, the floor text);
  U70 (d) passed when written (git's own behaviour, a confirmation test).
  `pnpm --dir create-wxl test` at `719113f` → `Tests 711 passed | 1 skipped (712)`.
- 2026-11-10, stage 6 (workflow `wf_a6ccd860-406`; local note
  `.proj.research/2026-11-10-T-0065-stage6-review.md`): Standards 17 findings (1 high), Spec 11
  (3 medium), applied under the user's authorisation of 2026-11-10 ("一路完成到最後，授權你按照你建議"):
  - Fixed:
    - the zh-TW `synced_from_sha` held a commit hash; it now holds `spec.en.md`'s blob hash
      (`git hash-object .proj.specs/0006-range-upgrade/spec.en.md`), as `docs/agents/language.md`
      says;
    - T-0063's Comments now hold the comparison (#75, merged here as `9d3572a`), and this ticket
      lists the sources above;
    - D22 is measured in both orders (U70 (d) runs each) and checks that `a/y.local` is ignored
      first;
    - AC-11 is one line and says "a file", not "one";
    - AC-12 lists four exceptions without a second "and";
    - the status lines name revision 3.2 and say 3.3 and 2.3 were self-checked without another
      round;
    - C36 names its 2.26.0 control;
    - U70's boundary names D22;
    - `messages.mjs`'s comment names UP-E02 too;
    - the floor text test is its own describe, one case per message;
    - both READMEs state git >= 2.26.
  - Recorded, not changed:
    - D22 was in the recommendation the user authorised on 2026-11-10;
    - the Traditional Chinese test plan follows T-0061 to T-0063;
    - 0005 has no zh-TW spec (an older gap);
    - the literal `2.26` in tests is deliberate.
  - After the fixes: `pnpm --dir create-wxl test` → `Test Files 37 passed (37) / Tests 715 passed |
    1 skipped (716)`; `pnpm test --run` → `Tests 4861 passed | 1 skipped (4862)`.
- 2026-11-10, stage 7: report `.proj.specs/0006-range-upgrade/review/security-T-0065.md`.
  - 8 candidates. C1 and C2 were confirmed low; neither is new, since this diff narrows the
    supported range. Both are now in B4 and the revision 3.3 self-check:
    - git 2.26–2.35 with `core.fsmonitor=true` and `core.fsmonitorHookVersion=1`;
    - git 2.26–2.34 with zdiff3, where every `git checkout` fails.
  - D21's reason is corrected: before 2.26 the default hook protocol is V1.
  - The other six are false positives.
- 2026-11-10, stage 8 (surface: a terminal on macOS darwin arm64, Node v24.13.0, git 2.54.0).
  - Setup: the package was packed with `npm pack` at `719113f`; `dist/source.json` names it.
    `GITHUB_REPOSITORY` and `WXL_EXPECT_UPSTREAM` were unset. A shim directory first on `PATH` held
    a `git` that answers `--version` with `git version 2.25.1` and passes everything else to the
    real git.
  - Create with the shim (`CREATE_WXL_COMMIT=8455c34…`): exit 0. CW-W01 says "older than 2.26" and
    lists `git init`, `git symbolic-ref HEAD refs/heads/main`, `git add -A`. `range.json` was
    written and no `.git` was made.
  - Create with the real git: exit 0, no CW-W01, one commit `Create range from WXL 3.0.0`.
  - Upgrade in that range with the shim: exit 1.
    - en: `UP-E02: git could not be run, or is older than 2.26 (found "2.25.1"); install a newer git
      from https://git-scm.com/downloads.`
    - zh-TW: `UP-E02：git 無法執行，或版本低於 2.26（偵測到 "2.25.1"）；…`
    - Status stayed empty.
  - Upgrade with the real git: exit 0, past step 3 (UP-I01, the versions being equal).
  - Afterwards `create-wxl/dist/`, `create-wxl/LICENSE`, the tarball and the temporary ranges were
    removed.
