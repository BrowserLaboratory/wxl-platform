---
id: T-0027
title: Three-way merge, apply and the upgrade report
epic: 0006-range-upgrade
status: review
blocked_by: [T-0026]
---

## Context

The core of epic 0006: for every path of the base and target pristine ranges and the range's tracked
files, the pre-checks P-1–P-6 and the merge table M4–M12 decide what happens; text conflicts are
merged with `git merge-file --diff3` and marked; nothing is committed; the run writes deletions then
writes by write-then-rename, updates `range.json`, and prints the report R1–R5. The restore commands
return the range to `HEAD` exactly. Stage 8 is the simulation A → B on two pushed commits (0006-S2),
with the simulation branch as a recorded exception to hard rule 1.

Deadline (decision R1, 2026-10-16): if this epic has not landed by 2026-10-16 23:59, this ticket is set
to `pending` with its reason and evidence and ships after the workshop as 3.0.x (decision of
2026-10-16, Q2 option A). Withdrawn by the user at 23:39 on 2026-10-16; see Comments.

Spec: `.proj.specs/0006-range-upgrade/traceability.md` revision 2.5 (D7–D10), seams 0006-S1, 0006-S2; "Step order"
8–10, "Pre-checks", "Merge table", "Fork:init-derived content", "`range.json` after the plan", "Report",
"Stage 8 simulation".

## Deliverable

`pnpm range:upgrade` on a teacher's range takes in upstream's changes, keeps the teacher's where unsure,
marks text conflicts with three labels, lists every attention item, exits 0, and can be undone exactly
with `git clean -fd` then `git checkout -- .`.

## Acceptance criteria

- [x] U17: one fixture path per branch of P-2, M4–M12 → each as its row states; R2 counts and R3 lines exactly those (AC-6)
- [x] U18: M12 with changes in different lines → merged, updated (AC-6)
- [x] U19: M12 overlapping, global `merge.conflictStyle=merge` → `<<<<<<< range`, `||||||| <base version>`, `=======`, `>>>>>>> <target version>`; UP-A1 (AC-6)
- [x] U20: tracked symlink, file under a symlinked directory, ignored symlink → untouched, UP-A7, link target unchanged in content and modification time (AC-7)
- [x] U21: a teacher's own file → untouched, unreported (AC-6)
- [x] U22: ignored file with o ≡ b that T changes; T adds an ignored path → untouched, UP-A9 each (AC-8)
- [x] U23: new executable in T → mode 0755 (umask 022), skipped on Windows (AC-6)
- [x] U24: after a completed run → `upstream` = target, other keys deep-equal and in order, created when absent, untouched after UP-E09 (AC-9)
- [x] U25: attention empty / non-empty → exit 0 / 0 (AC-10)
- [x] U26: U17's run → R1–R5 in order with ids, in the run's language; every UP code in both tables (AC-10)
- [x] U27: `fs.rename` fails on the 2nd write → UP-E09 naming the path, exit 1; the restore commands give an empty status and `HEAD`'s files (AC-11)
- [x] U28: `SIGINT` at step 7; `SIGTERM` during step 9; `SIGINT` at step 10 (D8) → exit 130; nothing written / UP-E09 with the signal / the report in full; no temporary directory left (AC-11)
- [x] U29: after U17's run, the restore commands → empty status, `HEAD`'s files, ignored files byte-identical (AC-11)
- [x] U63: upstream changes `.gitignore` and a nested `.gitignore` → both untouched, UP-A13 each; the teacher's ignored file byte-identical after the run and after the restore commands (AC-8, D9)
- [x] U64: a path at or inside a submodule → untouched, UP-A14 each; no status line for the submodule after the run, empty status after the restore commands (AC-6, D10)
- [ ] U32: stage 8 simulation A → B exactly as listed (AC-13)
- [x] U53: case-only rename → both untouched, UP-A8 each (AC-6)
- [x] U54: file → directory and directory → file swaps → as the row states (AC-6)
- [x] U55: directory where b and t are files; T adds `a/x` over a kept file `a` → untouched, UP-A10 (AC-6)
- [x] U56: o differs from b only by CRLF, t changed → M5, t written (AC-6)
- [x] U57: `git merge-file` exits 255 → UP-E11, nothing written (AC-6)
- [x] U58: clean merge of `package.json` to invalid JSON → o kept, UP-A11 (AC-6)
- [x] U59: an anchor file with b ≢ t / none → UP-A12 present / absent (AC-10)
- [x] U60: a tracked hard link to an outside file written by M5 → the outside file unchanged (AC-7)
- [x] U61: upgrade, commit, upgrade again → UP-I01 (AC-4)
- [x] U62: a path with an ANSI escape in T → printed as an escaped JSON literal (AC-10)

## 給使用者（zh-TW）

0006 的核心：三方合併 base、老師的靶場與 target。上游改了而老師沒改的就更新；兩邊都改的文字檔用 `--diff3` 標出衝突；拿不準時保留老師的版本並列入注意清單。不 commit，結束碼 0，報告列出計數、注意項目與下一步；`git clean -fd` 加 `git checkout -- .` 可完整還原。第 8 階段用兩個推上去的 commit 實際升級一次。在報告印出期間收到訊號時，報告照樣印完，再以 130 結束（D8）。

## Comments

### 2026-10-16 — deadline withdrawn

At 23:39 on 2026-10-16 the user withdrew the 23:59 pending deadline (decision R1, Q2 option A) for this epic: T-0026 and T-0027 are not set to `pending` and are implemented after T-0025, in order. The workshop of 2026-10-17 still uses the fork + `pnpm fork:init` path.

### 2026-10-17 — test plan table (approved by the user before the first test)

Drafted and independently checked by a workflow (two rounds: draft and check, then a revision applying every correction), then approved by the user on 2026-10-17 with the decisions below.


版本設定（適用於下列每一列，除非該列另行說明）：`range-repo` helper 內的靶場 fixture 的 base 固定為 `3.0.0`；`deps.packageVersion`／`deps.source.version`（target）覆寫為 `3.1.0`；`deps.env` 為 `{ HOME, PATH, XDG_CONFIG_HOME }`（`HOME`／`XDG_CONFIG_HOME` 皆指向隔離資料夾）；`deps.fetchArchive` 依第二個參數（commit）分派到 base／target 兩份不同內容的 archive，每份 archive 的 `comment` 等於該 commit。現狀紅燈一律相同：`create-wxl/src/argv.mjs:82` 目前對任何 `upgrade` positional 一律丟 `ArgvError`（CW-E02），`run(['upgrade'], …)` 現在必定在步驟 2 就以 CW-E02 結束，跑不到下列任何一列所驗證的行為；下表以「現狀紅燈 CW-E02」標示這一事實。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | 用一份涵蓋 P-2 與 M4–M12 每個分支各一條路徑（共 13 條：P-2×1、M4×2〔both absent／both equal〕、M5×2〔updated／added〕、M6～M11 各 1、M12 clean×1、M12 conflict×1）的 fixture，驗證三方合併規劃／套用的結果與報告完全對應各分支列出的行為，不讓某一分支被另一分支頂替 | `upgrade-merge.test.mjs`（新檔，檔名暫定）。用新 helper `test/helpers/range-repo.mjs` 在暫存資料夾 `git init` 一個乾淨、已有一個 commit 的靶場 fixture；commit 時用一個只含身分、不開 `commit.gpgsign`、不裝 template hook 的 0006 專用 home builder（或在既有 home 上加 `-c commit.gpgsign=false`），避免 `git-home.mjs` 現有的 gpgsign／hook 設定讓測試自己的 commit 失敗；o 側由套用過 P1–P4 的 B 衍生，range repo 另外 commit 一份 `range.json`（`upstream` 指向 base），三邊 `.gitignore` 內容一致（落在 P-2）；M5-updated 分支取用 anchor file `README.md`（供 U26／U59 共用）；跑 `run(['upgrade'], io, deps)` | AC-6（U17） | exit 0；每條路徑最終的 `lstat` 結果與內容恰好等於該分支列的 action；R2：updated 2（M5 updated＋M12 乾淨合併）、added 1（M5 added）、deleted 1（M6）；R3 恰好 6 筆、依路徑排序：M7→UP-A5、M8→UP-A3、M9→UP-A4、M10→UP-A6、M11→UP-A2、M12 conflict→UP-A1；`HEAD` 不變、`git diff --cached` 為空；`tmpRoot` 下無 `create-wxl-upgrade-` 殘留。現狀紅燈 CW-E02 |
| 0006-S1 | M12（三邊互不相同）改動落在不同行時，`git merge-file --diff3` 能乾淨合併並寫入結果，記為 updated | 同檔：一個文字檔，teacher 側（o）改第一行、base（b）維持原值、target（t）改第三行，兩側改動不重疊 | AC-6（U18） | 寫入檔案內容逐行等於「兩邊各自的改動同時出現、其餘行維持原值」的具體文字（不比對 `merge-file` 自己的輸出）；不含任何 `<<<<<<<`／`|||||||`／`=======`／`>>>>>>>` 標記行；R2 該檔計入 updated；R3 不含該路徑。現狀紅燈 CW-E02 |
| 0006-S1 | M12 重疊改動時，不論使用者全域 `merge.conflictStyle` 設什麼，衝突一律固定輸出四條標記行與三個標籤 | 同檔：隔離的 `HOME` 下全域設定含 `merge.conflictStyle = merge`（透過 0006 專用 home builder 新增的選項，只加不改既有 `buildGitconfig`）；fixture 一個文字檔三邊在同一行重疊改動 | AC-6（U19） | 寫入檔案依序各恰好一行：`<<<<<<< range`、`||||||| 3.0.0`、`=======`、`>>>>>>> 3.1.0`；R3 含該路徑的 `UP-A1`。現狀紅燈 CW-E02 |
| 0006-S1 | tracked symlink、symlink 資料夾底下的檔案、ignored symlink 三種一律不動並列 `UP-A7`，連結外部目標的內容與 mtime 不變；T 在 symlink 資料夾底下新增路徑時，外部目標不出現新檔 | `upgrade-links.test.mjs`（新檔）。fixture 放三種既有路徑，連結目標在靶場外；base/target 讓對應路徑有改動以觸發分類；另加一案：T 在 symlink 資料夾底下新增一個路徑；non-Windows only | AC-7（U20） | 三種既有路徑升級後與升級前的 `lstat`／內容／mtime（含連結目標）完全一致；新增案中連結的外部目標資料夾內容不出現新檔；R3 各列一筆 `UP-A7`；Windows skip。現狀紅燈 CW-E02 |
| 0006-S1 | 老師自己新增、base 與 target 都沒有的檔案完全不受影響、也不出現在報告 | `upgrade-merge.test.mjs`：fixture 加一個只在 o 存在的檔案 | AC-6（U21） | 該檔內容／mtime 升級後不變；R2 三個計數不含它；R3 不含該路徑。現狀紅燈 CW-E02 |
| 0006-S1 | 既有 ignored 檔案（o≡b，T 有變更）與 T 新增但被規則忽略的路徑，一律不動並各列 `UP-A9` | `upgrade-ignored.test.mjs`（新檔）：fixture `.gitignore` 含 `*.local`；一個現有 ignored 檔案（非 tracked，o≡b，T 改了它）；T 新增一個 `*.local` 路徑 | AC-8（U22） | 兩個路徑升級後 byte-identical 於升級前；R3 各列一筆 `UP-A9`。現狀紅燈 CW-E02 |
| 0006-S1 | target 新增的檔案帶執行位元時以固定 umask 022 寫入 mode 0755；既有檔案的 mode 不受 t 的 mode 改動影響；新增的非執行檔是 0644 | `upgrade-merge.test.mjs`：測試內明確 `process.umask(0o022)`，結束時 `try/finally` 還原；target archive 的新檔 entry 帶 unix mode 0755；另加一個 M5-updated 既有檔案在 t 側 mode 0755、o 側原為 0644；M5-added 的新檔不帶執行位元；non-Windows only | AC-6（U23） | 帶執行位元的新檔 `mode & 0o777 === 0o755`；既有（M5 updated）檔案升級後 mode 仍為 0644（不套用 t 的 mode 改動）；不帶執行位元的新檔 mode 為 0644；Windows skip。現狀紅燈 CW-E02 |
| 0006-S1 | 完成的 run 後 `range.json` 的 `upstream` 換成 target 的 repository/version/commit，其他頂層 key 深度相等且順序不變，缺則建立（含 `--from` 搭配空物件時 `upstream` 排第一）；`UP-E09` 失敗後維持原狀 | `upgrade-record.test.mjs`（新檔）：四個 case——①fixture `range.json` 多放一個自訂頂層 key（放在 `upstream` 前）、完整跑完升級；②用 U27 的注入失敗讓 run 以 `UP-E09` 結束；③`--from <base commit>` 搭配缺 `range.json`；④`--from <base commit>` 搭配只有 `{"x":1}` 的 `range.json` | AC-9（U24） | ①完成後 `upstream` 三欄等於 target、自訂 key 值／順序不變、兩格縮排單一結尾 LF；②失敗 case 的 `range.json` byte-identical 於升級前；③缺檔時建立，`upstream` 為唯一 key；④新增 `upstream` 時排在第一個，`x` 維持在其後。現狀紅燈 CW-E02 |
| 0006-S1 | 不論有沒有 attention item，完成的 run 都 `exit 0` | `upgrade-report.test.mjs`（新檔）：U17 的 fixture（有 attention item）與一個無衝突、無需注意事項的最小 fixture | AC-10（U25） | 兩種都 exit 0。現狀紅燈 CW-E02 |
| 0006-S1 | U17 那次 run 以 en／zh-TW 完整印出 `R1`–`R5`；補 `--from <commit>`、無 `range.json` 時 R1 顯示 base archive 在 P3 之前的 manifest `version`；R4 依是否寫入 `package.json`/lockfile、是否有 `deploy.yml` 各驗證正反兩案；24 個代碼在兩份 UP 訊息表逐一列出比對 | 同檔：重用 U17 的 run（含 `--lang zh-TW` 另跑一次）檢查 stdout；另一獨立 case：無 `range.json`、用 `--from <base commit>`，base archive 的 `package.json` version（P3 之前）設為 `3.0.5`；R4 兩組對照 fixture（有／沒有寫入 package.json 或 pnpm-lock.yaml，有／沒有 `.github/workflows/deploy.yml`） | AC-10（U26） | `R1` 含執行版本與 base/target 版本、commit，`--from <commit>` case 顯示 `3.0.5` 而非 P3 寫回的 `0.1.0`；`R2` 三個計數同 U17；`R3` 依路徑排序、`UP-A12` 在最後；`R4` 依內容與 `deploy.yml` 存在與否分別出現／不出現 `pnpm install`、push `v*` tag 的提示；`R5` 為固定還原指令；en／zh-TW 皆以對應語言正確呈現；E01–E11、I01、A1–A12 共 24 個代碼在兩份訊息表都各有一則以該代碼開頭的文字。現狀紅燈 CW-E02 |
| 0006-S1 | step 9 第二次寫入時 `fs.rename` 失敗：`UP-E09` 指名該路徑並附還原指令、exit 1；之後的還原指令使狀態回到 `HEAD` | `upgrade-failures.test.mjs`（新檔）：fixture 至少一個刪除與兩個新增/更新寫入，安排排序後第一筆寫入是新增檔；`deps.fs` 用 `test/helpers/fail-at.mjs` 在排序後第二筆寫入目的地路徑的 `rename` 呼叫注入錯誤；run 完後在同一 repo 執行還原指令 | AC-11（U27） | stderr 以 `UP-E09` 開頭、指名排序後第二筆寫入的路徑，並含還原指令 `git clean -fd` 與 `git checkout -- .`；exit 1；還原後 `git status --porcelain=v1 --untracked-files=all` 為空、每個 tracked 檔案等於 `HEAD`。現狀紅燈 CW-E02 |
| 0006-S1 | step 7 的 checkpoint 收到 `SIGINT`：什麼都不寫、exit 130；step 9 第一次 rename 完成之後收到 `SIGTERM`：`UP-E09` 帶訊號名與還原指令、exit 130；兩案例都不留殘留暫存資料夾 | `upgrade-signals.test.mjs`（新檔）：`deps.signals`（`EventEmitter`）配 `test/helpers/checkpoint-signal.mjs`；upgrade 路徑本身的 checkpoint 命名目前尚未存在（`run.mjs:333` 的 `step-7` 是 0005 解析 archive 的 checkpoint，不是 0006 下載判斷點），列為對 T-0026/T-0027 實作的假設，待實作階段確認命名後再接線 | AC-11（U28） | step 7：range 完全未變、exit 130、`tmpRoot` 下無殘留；step 9：`UP-E09` 訊息含訊號名與還原指令、exit 130、`tmpRoot` 下無殘留。現狀紅燈 CW-E02 |
| 0006-S1 | 用 U17 那次 run 的結果驗證兩道還原指令能把工作樹精確還原到升級前的 `HEAD`，包含 U17 fixture 內新增的那個未追蹤、不在 B∪T 內的 ignored 檔案 byte-identical | `upgrade-restore.test.mjs`（新檔）：在 U17 的 repo 上，run 完後執行 `git clean -fd` 再 `git checkout -- .`（真的 git、隔離環境） | AC-11（U29） | 還原後 porcelain status 為空；每個 tracked 檔案等於升級前 `HEAD`；U17 fixture 內那個未追蹤 ignored 檔案 byte-identical 於升級前。現狀紅燈 CW-E02 |
| 0006-S2 | 在推上去的兩個 commit A、B 之間，依 traceability「Stage 8 simulation」逐步跑過一次真的升級，結果精確符合列出的每一項 | **不是 vitest 測試**：本 ticket 自己的 stage-8 終端 runbook（記在 ticket Comments，不計入 vitest 測試筆數）。`sim/0006-upgrade` 分支推到上游、跑完後刪除（hard rule 1 的明文例外）。tarball **只打包一次、從 A 打包**；依序：①`CREATE_WXL_COMMIT=<A> npx --yes <tarball> sim --author 'Stage Eight' --repo wxl-test/sim --host github-pages </dev/null`；②在 `sim` 內把 `platform/index.md` 的 `tagline:` 改成 `tagline: Teacher edit`、改 `platform/challenge/staff-only/index.md` 一行、新增 `platform/public/teacher-note.txt`，用 commit skill 做 commit B；③`CREATE_WXL_COMMIT=<B> npx --yes <tarball> upgrade`（同一份打包自 A 的 tarball，用環境變數覆寫 target commit）；解衝突後 `pnpm install && pnpm build`；最後兩道還原指令 | AC-13（U32） | exit 0；輸出含 `CW-W04`；`R2` updated 2（`door-is-open/index.md`、`package.json`）、added 1（`upgrade-sim.txt`）、deleted 1（`.archive/guide/terminal.md`）；`R3` 恰好 `UP-A1`（`platform/index.md`）與 `UP-A12`；`platform/index.md` 含三標籤衝突標記與兩邊 tagline；`staff-only` 改動與 `teacher-note.txt` 不變；`package.json` 含 `sim:noop`、`version 0.1.0`、老師的 repository；`range.json` 指向 B；把衝突區塊換成 `tagline: Teacher edit` 後 `pnpm install && pnpm build` 成功；最後還原指令使狀態為空且等於 fixture commit 的檔案。現狀紅燈 CW-E02（同左，upgrade 路徑尚未實作） |
| 0006-S1 | `Guide.md`（B）與 `guide.md`（T）只差大小寫：兩個路徑都不動，各列 `UP-A8` | `upgrade-merge.test.mjs`：fixture base 放 `Guide.md`、target 放 `guide.md` | AC-6（U53） | 用 `readdir` 列出該資料夾實際存在的檔名（不用 `lstat` 個別檢查，避開 macOS/Windows 不分大小寫的誤判），斷言 `Guide.md` 與 `guide.md` 兩個檔名同時存在且內容維持升級前狀態；R3 各有一筆 `UP-A8`。現狀紅燈 CW-E02 |
| 0006-S1 | B 有檔案 `a`、T 有 `a/x`（o≡b）：先刪 `a` 再寫 `a/x`；反過來 B 有 `a/x`、T 有檔案 `a`、o 的 `a/x`≡b：刪 `a/x`、`a` 維持為資料夾並列 `UP-A10` | 同檔，`it.each` 兩個獨立 case | AC-6（U54） | 第一案：`a` 不存在、`a/x` 存在且內容等於 t；R2 deleted 1（`a`，M6 的 Report 欄直接規定）、added 1（`a/x`，M5 的 Report 欄直接規定）；第二案：`a/x` 不存在、`a` 維持原狀且仍為資料夾（不是 t 的那個檔案），R3 列 `UP-A10`、R2 deleted 1（`a/x`，M6）。現狀紅燈 CW-E02 |
| 0006-S1 | o 是目錄而 b、t 是不同檔案（P-6）：不動並列 `UP-A10`；T 新增 `a/x` 而 o 在 `a` 的位置有老師改過的檔案（b present、o present、t absent → M8 保留，`UP-A3`）：parent check 擋下 `a/x` 的寫入並列 `UP-A10` | 同檔，兩個 case | AC-6（U55） | 第一案：不動原本路徑且列 `UP-A10`；第二案：`a` 列 `UP-A3`（M8）、`a/x` 從未被建立且列 `UP-A10`、`a/x` 不計入 added。現狀紅燈 CW-E02 |
| 0006-S1 | o 與 b 只差換行符（CRLF/LF），t 有真的改動：視為 o≡b，走 M5 寫入 t | 同檔：o 為 CRLF、b 為同內容的 LF、t 另有不同內容 | AC-6（U56） | 升級後該檔內容等於 t；R2 計入 updated；不列 `UP-A1`/`UP-A2`。現狀紅燈 CW-E02 |
| 0006-S1 | `git merge-file` 的結束碼落在 0–127 以外（以 255 模擬）：規劃失敗，`UP-E11`，整個 run 什麼都不寫 | 同檔：stub 包住真的 `createSpawnGitRunner`，只在呼叫 `merge-file` 時攔截回傳 `code: 255`，其餘 git 呼叫原樣執行；fixture 同時放一個會被寫入（M5）與一個會被刪除（M6）的路徑，讓「什麼都不寫」的斷言不會無意義地成立 | AC-6（U57） | stderr 以 `UP-E11` 開頭並指名該路徑；exit 1；M5/M6 路徑維持升級前狀態；`range.json` 維持升級前內容；`tmpRoot` 無殘留。現狀紅燈 CW-E02 |
| 0006-S1 | M12 乾淨合併（`merge-file` exit 0）但輸出不是合法 JSON：保留 o，列 `UP-A11` | 同檔：三邊 `package.json` 構造成能無衝突合併但結果不是合法 JSON | AC-6（U58） | 升級後 `package.json` byte-identical 於升級前；R3 含該路徑的 `UP-A11`；R2 不計入 updated。現狀紅燈 CW-E02 |
| 0006-S1 | anchor file 有 b≢t 時報告加一筆 `UP-A12`；沒有任何 anchor file 變動時完全不列；兩個 anchor 同時變動時 `UP-A12` 仍恰好一行 | `upgrade-report.test.mjs`：三個 case——一個讓某個 anchor file（Vocabulary 九個之一）在 base/target 間有差異、一個完全沒有、一個讓兩個 anchor file 同時有差異 | AC-10（U59） | 有變動時 R3 最後一筆（所有 `UP-A` 之後）恰為 `UP-A12`；無變動時 R3 完全不含它；兩個 anchor 同時變動時 `UP-A12` 仍只出現一次且在最後。現狀紅燈 CW-E02 |
| 0006-S1 | tracked 檔案同時是靶場外某檔案的 hard link，被 M5 寫入時，外部那個名字對應的內容不受影響（write-then-rename） | `upgrade-links.test.mjs`：fixture 內一個 tracked 檔案先在靶場外以 `fs.link` 建立另一個名字指向同一 inode；o≡b，t 有新內容觸發 M5 | AC-7（U60） | 升級後靶場內路徑內容等於 t；靶場外的 hard link 名字內容仍等於升級前。現狀紅燈 CW-E02 |
| 0006-S1 | 完成一次升級並 commit 之後立刻再跑一次：base commit 等於 target commit（已知，下載前即可判定），視為沒有要做的事，`UP-I01` | `upgrade-restore.test.mjs` 同一 repo：先完整跑一次最小升級（target 覆寫 3.1.0）並以 0006 專用 home builder（不開 gpgsign）`git add -A && git commit`，再跑第二次 `run(['upgrade'], …)`（此時 `range.json` 的 `upstream` 已指向 target commit，與第二次 run 的 target 相同） | AC-4（U61） | 第二次 run 印 `UP-I01`（含版本與 commit）；exit 0；`deps.fetchArchive` 完全未被呼叫；靶場內完全無寫入。現狀紅燈 CW-E02 |
| 0006-S1 | target 裡含 ANSI escape（ESC）的路徑在 archive 驗證（0005 entry rule 3）就會被拒絕為 `CW-E08`，不會進到報告；錯誤訊息以跳脫過的 JSON string literal 印出該路徑，不印原始控制字元 | `upgrade-report.test.mjs`：target archive 用 `test/helpers/archive.mjs` 的原始 header 寫一個含 `\u001b` 的新路徑 entry | AC-10（U62，經修正——原規格情境走不到報告，見「需要使用者決定」第 1 項） | stderr 以 `CW-E08` 開頭，該路徑以 `src/text.mjs` 的 `jsonValue` 跳脫形式出現（含 `\u001b`）；整段輸出不含原始 ESC byte；exit 1；靶場內完全無寫入。現狀紅燈 CW-E02 |

#### Notes

- **既有測試要改 body（需使用者核准）：** T-0027 本身沒有需要改 body 的既有測試。`create-wxl/test/run-preflight.test.mjs:247-249` 三個 case（`upgrade as positional`、`--no-setup upgrade`、`--no-setup -- upgrade`，目前斷言 CW-E02）屬於 T-0026 的範圍（AC-12／U30、U31），假設 T-0026 落地時已先改好；若開工時發現尚未改，先回報再動它。
- **helper 變更，只增不改（對應 AC-12「0005 tests unchanged」）：**
  - `test/helpers/archive.mjs` 的 `makeFetchArchive`：目前它忽略呼叫參數（`fetchArchive(repository, commit, { signal })`，見 `run.mjs:312`）、對任何 ref 都回同一份內容；0006 需要新增依第二個參數（commit）分派不同 base／target 內容的能力，不改既有呼叫形狀；每份 archive 的 `comment` 要等於該 commit（`archive-rules.mjs:123`）。
  - `test/helpers/git-home.mjs` 的 `buildGitconfig`：新增 `merge.conflictStyle` 選項（只加參數，不改既有預設行為、不改 `makeGitHomeWithHook`／`makeGitHomeWithExcludes`／`makeEmptyGitHome` 既有呼叫）。
  - 新增一個 0006 專用、只含身分、不開 `commit.gpgsign`、不裝 template hook 的 home builder（全新函式）：現有 `makeGitHomeWithHook` 的 `commit.gpgsign=true` 指向不存在的 gpg，會讓 range-repo 的初始 commit 與 U61 的 commit 失敗（`git-home.mjs:26-29`）。
- **要建的 fixture／helper：**
  - `test/helpers/range-repo.mjs`（新檔）：在暫存資料夾 `git init` 一個乾淨、已有一個 commit 的靶場 fixture，`deps.env` 為 `{ HOME, PATH, XDG_CONFIG_HOME }`（`git-runner.mjs:19-20,75` 只從 `env.PATH` 找 git；`deps.mjs:50` 的預設 env 只有 `{LANG, HOME}`，缺了會變成 `UP-E02`，照 `run-git.test.mjs:65` 的作法補齊），`deps.runGit` 用 `src/git-runner.mjs` 的 `createSpawnGitRunner()`。
  - `upgrade-fixtures.mjs`（新檔）：同時產生 o（commit 進靶場 repo）、b、t 三邊內容，覆蓋 U17 的 13 個分支，並能逐案抽換成 U18–U62 需要的單一變體；anchor files（Vocabulary 九個）預設在三邊相等（落在 M4），M5-updated 分支固定取用 `README.md`，供 U26／U59 使用。
  - 所有 fixture／測試一律不拼出上游 repository slug，改 import `UPSTREAM_SLUG`（`scripts/fork-init.ts`）。
- **對前序 ticket 的假設：** T-0025 先 merge 進 `main`；T-0026 在那之後開工，落地 `upgrade` 文法、preconditions（step 3–4）、base 解析（J1–J5、`--from`）、no-op／降版／3.0.0 下限的兩次檢查、下載並以 0005 的 P1–P4 建出 base／target 兩份原廠靶場、以及 `UP-E01`–`UP-E08`、`UP-I01`、`UP-E10`、`CW-W04` 的訊息表項目，並 merge 進 `main`；T-0027 才在其上開工。T-0027 只新增 step 8–10（規劃、套用、報告）與對應的 `UP-A*`／`UP-E09`／`UP-E11`／`UP-A12` 訊息、以及 0006-S2 的 stage 8 runbook。
- **對其他 ticket 的邊界：** 本計畫不重跑 T-0026 claim 的 U01–U16、U30、U31、U50–U52；U61 雖屬 AC-4，但需「完成一次升級並 commit」才能重跑，歸在 T-0027（與 ticket 的 claim 一致）。
- **解讀假設：**
  - U54 第一案的 R2 計數（deleted 1／added 1）直接來自 M5／M6 的 Report 欄，是規格明文，不是推論。
  - U59 選哪一個 anchor file 來觸發變動由測試自選一個（spec 只要求「任一個」）。
  - U32 的 fixture 依賴目前倉庫裡 `platform/challenge/door-is-open`、`platform/challenge/staff-only`、`.archive/guide/terminal.md` 仍存在且內容形狀符合描述（已核對：三者目前都存在）；開工前（因 stage 8 發生在未來時間點）要再次核對。
  - upgrade 路徑的 checkpoint 名稱目前還不存在（0005 的 `step-7` 在 `run.mjs:333` 指的是解析 archive），U28 列為對 T-0026/T-0027 實作的假設，待實作階段確認命名。
  - U28 的 `SIGTERM` 改在 step 9 第一次 rename 完成之後才發出，不是字面上模糊的「during step 9」。
- **skip 與隔離：**
  - U20、U23、U60 的符號連結／執行位元測試在 Windows skip；U60 的 hard link spec 沒有要求 skip Windows（`fs.link` 在 NTFS 上可用），暫不 skip，待實作時若 CI 證實不可行再回報。
  - U27／U28 都用 `fail-at.mjs` 注入錯誤，不是真的 `EACCES`，不需要 root skip；U23 的 `mode 0755` 斷言改為測試內明確 `process.umask(0o022)` 管理，不再記為「已知限制」。
  - U17、U19、U27、U29、U32、U61 等用到真的 git：一律用隔離的 `HOME`＋`PATH`＋`XDG_CONFIG_HOME`（`GIT_CONFIG_NOSYSTEM=1` 由 `src/git-env.mjs` 的 `buildGitEnv` 固定補上），不連上任何網路；0006-S2 是唯一一個會真的 push 到上游 remote 的 case（分支名與刪除義務已在 U32 列標明）。
- **stage 8 驗證面：** U17–U29、U53–U62 的驗證面是 create-wxl 的 vitest 在 Node 裡跑 0006-S1，不經過瀏覽器或終端；U32 本身就是本 ticket 的 stage 8——終端上對兩個真實推上去的 commit 跑一次打包後的 `npx`，是 0005/0006 既有的「終端面才是真正跑這個行為的介面」之例外（`docs/agents/workflow.md` stage 8、hard rule 4），不是瀏覽器可及的介面。

#### Decided readings

- **`GIT_CONFIG_GLOBAL` 隔離：** 不另外開這題；隔離只靠隔離的 `HOME` 加隔離的 `XDG_CONFIG_HOME` 即成立，因為 `git-env.mjs:9` 本來就會把每個 `GIT_` 開頭的變數濾掉，繼承來的 `GIT_CONFIG_GLOBAL` 到不了 git。
- **U32 算不算 vitest 測試：** 維持放進本表（符合「每個 AC 都要有一列」），但紅綠燈與 coverage report 階段記在 ticket 的 Comments，不計入 vitest 測試筆數。
- **U54／U55 的父路徑／swap 細節：** 只驗最終狀態與報告，不額外斷言規劃期間的中間態；已在上表補上對應的額外斷言。
- **target 版本設定：** 覆寫 `packageVersion`／`source.version` 為 `3.1.0`，不逐案改設 `CREATE_WXL_COMMIT`；override 行為已由 U14 涵蓋，也避免每次多印一行 `CW-W04`。

#### User decisions (2026-10-17)

- U62: option (a). A path holding an ANSI escape in T is rejected by 0005's entry rule 3 while the target archive is checked, so it never reaches the report; U62 verifies that the upgrade path rejects it with CW-E08, the path printed as an escaped JSON literal, exit 1, nothing written. The deviation is recorded here and in `.proj.specs/0006-range-upgrade/traceability.md`.

### 2026-11-07 — resumed on `main` `ea0de55`; decision D4; row added

The approved table and its notes came from the unpushed local branch of 2026-10-17 (now
`archive/T-0026-2026-10-17`), cherry-picked to T-0026's branch unchanged except one line reference
(`run-git.test.mjs:62` is `:65` on `main`). This ticket starts after T-0026 lands.

Decision confirmed by the user on 2026-11-07:

- **D4.** M12 reads `git merge-file -p`'s output from stdout, but the real runner decodes stdout as
  UTF-8 (`create-wxl/src/git-runner.mjs:93-104`), so a text file that is not valid UTF-8 (for
  example Big5) would be written back with U+FFFD in place of its bytes. `runGit` gains an option
  that returns stdout as bytes; only `merge-file` uses it, so every git command still goes through
  `runGit`. A `merge-file` ended by a signal closes with `code` `null`, which is outside 0–127:
  UP-E11.

Known, left to the primary-locale layout epic: the anchor-file list (Vocabulary) names
`platform/index.md` and `platform/zh-TW/index.md`; ADR-0008 moves them, and that epic's spec updates
the list. The spec's stale wording (the withdrawn deadline, "OQ-017" for the stage 8 override that
is OQ-022, the 0007/0008 epic numbers, 0005 being revision 2.1) is recorded here, not revised.

Row added to the approved table (D4):

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0006-S1 | M12 乾淨合併一個不是 UTF-8 的文字檔時，寫回的位元組完全正確 | `upgrade-merge.test.mjs`（本表 U17 的檔案）新增一案：o、b、t 是同一個 Big5 編碼文字檔的三個版本（不含 NUL），變更落在不同行；真的 `createSpawnGitRunner()` | D4 / AC-6 | 綠燈：寫回的檔案位元組等於以 Big5 位元組手寫的預期合併結果（literal Buffer），不含 `EF BF BD`；R2 計為 updated。預期紅燈：以 UTF-8 解碼後寫回，檔案含 `EF BF BD` |

### 2026-11-09 — increment plan confirmed; user decisions; D8

The increment plan was drafted by the executor role, reviewed by the reviewer role (7 blocking,
12 major, 21 minor), revised twice and gated twice (the second gate: 1 blocking, 10 major, 13 minor,
most of them the wording of predicted reds). Under the frozen-ruler rule the main session stopped the
loop there and confirmed the plan (revision 3) with the amendments below, as for T-0026. The plan and
the three reviews are kept locally (gitignored scratch). The approved table's "現狀紅燈 CW-E02" is
stale: after T-0026 every upgradable fixture reaches step 8 and ends with decision (4)'s CW-E14, which
is the red each row now expects first.

User decisions on 2026-11-09:

- **Existing T-0026 test bodies (approved):** `create-wxl/test/upgrade-messages.test.mjs`'s `UP_ARGS`
  gains one entry per new code, at the increment adding it; the F14 case in
  `create-wxl/test/upgrade-target.test.mjs` expects exit 0 (its title follows), because with the merge
  in place its fixture completes; the `upgradeMergeNotImplemented` test is removed with decision (4)'s
  fall-through. The Notes' "T-0027 本身沒有需要改 body 的既有測試" did not foresee these three.
- **Readings of approved rows (approved):** U17's "R3 恰好 6 筆" is six per-path lines; the
  `UP-A12` line that `README.md` (an anchor file) adds is counted by U59 and U26. U53 on a
  case-insensitive file system (macOS, Windows): only `Guide.md` exists before and after, unchanged,
  `guide.md` is never created, and R3 has one `UP-A8` for each of the two paths. U20's fourth case
  also reports `UP-A7` (four in all; P-3 does not tell an existing path from a new one). U32 runs as
  traceability's "Stage 8 simulation" states: B is the upstream commit on `sim/0006-upgrade`; the
  teacher's edits inside `sim` are a plain fixture commit. The row's wording ("用 commit skill 做
  commit B" for the teacher's edits) is an erratum, kept as approved.
- **Sub-cases added (approved):** an existing `0755` file updated by M5 keeps `0755` (with U23);
  an M12 clean merge whose o has CRLF line ends merges on LF-normalised inputs (M12); `merge-file`
  closing with `code` `null` → UP-E11, nothing written (with U57; D4 already states it);
  `git ls-files -z` exiting non-zero and `git check-ignore` exiting other than 0 or 1 → CW-E14
  naming the command, nothing written (fail closed, as D6).
- **D8:** a signal in step 10, after step 9 has finished, lets R1–R5 print in full, then the run
  exits 130. Traceability revision 2.3; U28 gains the case: `SIGINT` at the checkpoint of step 10.

Main-session amendments to revision 3:

1. U28 (b) sends `SIGTERM` right after step 9's first rename, as the approved row states (ticket
   Notes); deletions come first in step 9, so the signal follows them and the first write.
2. U17's fixture names the table's 13 branches: P-2; M4 both absent; M4 both equal; M5 updated;
   M5 added; M6–M11; M12 clean; M12 conflict. When a fixture names M5-updated, `README.md` is b ≢ t;
   otherwise anchor files are equal on all sides. `upgrade-fixtures.mjs` builds only the branches a
   row names and lets a row swap one variant (Notes, "逐案抽換").
3. `≡` is decided per path: binary (NUL in the first 8000 bytes on any present side) compares byte
   for byte; text compares after CRLF → LF. M12's inputs are written, LF-normalised, into a
   merge-inputs directory created at the first M12 path only, so F14's `mkdtemp` count stays 2;
   `range.json` and other writes use a temporary file in the destination directory, not `mkdtemp`.
4. U57's `merge-file` stub returns `{ code: 255, stdout: <bytes>, stderr: '' }`.
5. R1's tool version and target version (both `3.1.0` by the table's settings) are told apart by
   their position in the rendered text, not by spying on an internal function.
6. The 0006 home builder is a new function that calls `buildGitconfig` with a new optional
   `merge.conflictStyle` parameter (defaults unchanged), which satisfies Notes lines on both.
7. A predicted red names the expected failure; the executor quotes the observed red in full. A red
   with another message but caused by this row's missing behaviour is recorded as a deviation (as
   T-0026's increment 12); a test green before its change, or red for an unrelated reason, stops the
   loop and is reported.
8. Step 9 opens with `checkpoint('step-9')` and `guard.throwIfRaised()`; `merge-apply` checks the
   guard after each operation (a raised signal → UP-E09 with the signal, exit 130); step 10 checks
   the guard only after the report is printed (D8).

### 2026-11-09 — red → green log

Run by the executor role from the confirmed plan, in sequential segments; `path:line` references in
this table are to `6619ece` for increments 0–25 (committed with no edit after the runs) and to
`f3b8d5c` for the follow-up table below; each increment ended with
the whole create-wxl suite (`pnpm --dir create-wxl exec vitest run`). macOS (darwin arm64, Node
v24.13.0); surface: create-wxl vitest in Node. Reds are quoted as reported (an ellipsis inside a
quoted assertion is vitest's own). Commits: `6619ece` (increments 0–25), `f3b8d5c` (verification
follow-up). Suite counts: 558 at the start, 560, 570, 577, 586, 589, 598, 600.

| # | Row | Test | Red observed | Files |
|---|---|---|---|---|
| 0 | Helpers and fixtures to build first（無對應表格列，供增量 1-3 共用） | 無獨立測試；三個新 helper（makeGitHomeIdentityOnly、makeRangeRepo、buildUpgradeFixtures）純粹是增量 1 測試要用的建置程式碼，先寫好供增量 1 的紅燈/綠燈直接驗證。 | 不適用（這一步只建 helper，沒有獨立的紅燈觀察；helper 本身的正確性由增量 1 的紅/綠燈間接驗證）。 | create-wxl/test/helpers/git-home.mjs:79（新函式 makeGitHomeIdentityOnly）, create-wxl/test/helpers/range-repo.mjs（新檔，makeRangeRepo）, create-wxl/test/helpers/upgrade-fixtures.mjs（新檔，buildUpgradeFixtures/BRANCH_SPECS/DELETE） |
| 1 | U17（0006-S1：13 分支合併表）＋ 核准表附帶的 T-0026 既有測試修改（UP_ARGS 六筆、F14 exit 0、移除 upgradeMergeNotImplemented 測試） | create-wxl/test/upgrade-merge.test.mjs describe('merge table (U17)') 的唯一 it；另外同批觀察 upgrade-messages.test.mjs 與 upgrade-target.test.mjs 的既有測試紅燈。 | upgrade-merge.test.mjs（決策(4)尚未移除時，先暫時還原 upgrade.mjs 到舊的 CW-E14 fallback 跑出）：`AssertionError: expected 1 to be +0` at test/upgrade-merge.test.mjs:97:24（U17）、:160:24（U18 的 fixture，見增量2）、:186:24（U19 的 fixture，見增量3），三案同時出現、同一原因（exit 1 而非 0），與計畫文字「每一列在增量1落地前都會以 checkpoint('step-8') 後的 CW-E14 結束、exit 1」完全一致。另外，先把 UP-A1..A6 六筆加進 messages.mjs 後，upgrade-messages.test.mjs 立即紅燈：`AssertionError: expected [ 'UP-E01', 'UP-E02', 'UP-E03', …(7) ] to include 'UP-A1'` at test/upgrade-messages.test.mjs:162:36。以及把 upgrade.mjs 的合併邏輯接上後、修 F14 前先確認的紅燈：`AssertionError: expected +0 to be 1` at test/upgrade-target.test.mjs:409:24（F14 原本斷言 exitCode 1，合併邏輯接上後此 fixture 其實無事可合併，變成 exit 0）。 | create-wxl/src/merge-plan.mjs（新檔：planMerge，P-1/P-2 與 M4-M12）, create-wxl/src/merge-apply.mjs（新檔：applyMerge，刪除在前、寫入 write-then-rename）, create-wxl/src/upgrade-report.mjs（新檔：buildReport，R2/R3 精確、R1/R4/R5 佔位）, create-wxl/src/messages.mjs:232-237,345-350（新增 UP-A1..UP-A6，en/zh-TW）, create-wxl/src/upgrade.mjs:7-13（import 調整，移除 upgradeMergeNotImplemented、加入三個新模組）、:1-6（檔頭說明更新）、:421-459（移除決策(4)的 CW-E14 fallback，接上 planMerge→applyMerge→buildReport，新增 checkpoint('step-9')/('step-10')）, create-wxl/test/upgrade-messages.test.mjs:14,158-163（UP_ARGS 新增 UP-A1..UP-A6 六筆）、移除 upgradeMergeNotImplemented 的 describe/it 區塊, create-wxl/test/upgrade-target.test.mjs:372,409-415（F14 的 it 標題與 exitCode 斷言改為 0，並補上說明註解）, create-wxl/test/upgrade-merge.test.mjs（新檔，U17 的唯一 it） |
| 2 | U18（M12 乾淨合併，不重疊修改） | create-wxl/test/upgrade-merge.test.mjs describe('M12 clean merge (U18)') 的唯一 it。 | 與增量1同一批觀察到的紅燈：`AssertionError: expected 1 to be +0` at test/upgrade-merge.test.mjs:160:24（計畫預測的「確認型」紅燈：決策(4)尚未移除時，此 fixture 同樣在 CW-E14 結束、exit 1，原因與增量1相同，不是這一列獨有的新原因）。 | create-wxl/test/upgrade-merge.test.mjs（U18 的 describe/it，與增量1同檔） |
| 3 | U19（M12 衝突標記，固定三標籤，不受全域 merge.conflictStyle 影響） | create-wxl/test/upgrade-merge.test.mjs describe('M12 conflict markers (U19)') 的唯一 it。 | 與增量1同一批觀察到的紅燈：`AssertionError: expected 1 to be +0` at test/upgrade-merge.test.mjs:186:24（同樣是決策(4)尚未移除時的 CW-E14/exit 1，與增量1、2同一原因）。 | create-wxl/test/upgrade-merge.test.mjs（U19 的 describe/it，與增量1同檔） |
| 4 | U20：符號連結（P-3） | create-wxl/test/upgrade-links.test.mjs：'leaves a tracked symlink, a file under a tracked symlinked directory, an ignored symlink, and a new path under it untouched, each reported UP-A7'（一個 it，涵蓋四個案例） | exitCode 1（預期 0）；stderr 完整內容：`CW-E14: an unexpected error happened: "EISDIR: illegal operation on a directory, read".` （與計畫原文逐字預測的 AssertionError 不同；計畫預測的是「外部目標內容被改寫」的斷言失敗，實際觀察到的是未攔截例外。原因：fixture 裡 tracked 的符號連結目錄 linkdir 本身，由於巢狀檔案需要 archive 具體化成真實資料夾，會被 git ls-files 列出並進入列舉；在 P-3 尚未存在時，把它當檔案讀取會丟出 EISDIR，被頂層 catch 當成 bug 印成 CW-E14。這紅燈仍確實是本列行為缺失造成，依規則7記錄為偏離並繼續。） | create-wxl/src/merge-plan.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-messages.test.mjs, create-wxl/test/upgrade-links.test.mjs |
| 5 | U21：老師自己的檔案（P-2 吸收，確認型） | create-wxl/test/upgrade-merge.test.mjs：在既有 U17 的 it 內，為新 branch teacher-owned 新增內容／mtime 不變的斷言（不新增 it，不新增測試筆數） | 無（計畫預測為確認型：P-2「b≡t 皆缺」已於增量1涵蓋，第一次執行即綠燈） | create-wxl/test/helpers/upgrade-fixtures.mjs, create-wxl/test/upgrade-merge.test.mjs |
| 6 | U22：ignored 既有檔案／ignored 新路徑（P-5）＋核准的兩個 fail-closed 子案例 | create-wxl/test/upgrade-ignored.test.mjs：3 個 it——主案例（existing.local 與 added.local）、check-ignore 回傳非 0/1、ls-files -z 回傳非 0 | 主案例：AssertionError: expected Buffer[...] to deeply equal Buffer[...]（existing.local 被上游內容覆寫，與計畫預測一致）。check-ignore 子案例：AssertionError: expected +0 to be 1（exitCode 0，P-5 未攔截故未呼叫 check-ignore，stub 未觸發）。ls-files -z 子案例：無紅燈，第一次執行即綠燈——increment 1 的 trackedResult.code !== 0 檢查已預先涵蓋此行為，記錄為確認型，非本增量新增。 | create-wxl/src/merge-plan.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-messages.test.mjs, create-wxl/test/helpers/upgrade-fixtures.mjs, create-wxl/test/upgrade-ignored.test.mjs |
| 7 | U23：新執行檔 mode 0755（umask 022）＋核准子案例：既有 0755 檔案維持 0755 | create-wxl/test/upgrade-merge.test.mjs：新 describe.skipIf(win32) 'executable mode (U23)'，一個 it，四個子斷言（新執行檔、新非執行檔、既有 0755 檔、既有 mode 變更檔） | AssertionError: expected 420 to be 493（即 0o644 對 0o755，新執行檔未取得 t 的執行位元），與計畫逐字預測的 expected 0o644 to be 0o755 完全一致。 | create-wxl/src/merge-plan.mjs, create-wxl/src/merge-apply.mjs, create-wxl/test/upgrade-merge.test.mjs |
| 8 | U24：range.json 於規劃後改寫（子案例①③④；②延後至增量14，依計畫本就排除在本段外） | create-wxl/test/upgrade-record.test.mjs：3 個 it（①自訂 key 在 upstream 前、③ --from 缺 range.json、④ --from 且 range.json={"x":1}） | ①：AssertionError，range.json 仍是 base 的 {version:'3.0.0', commit:<base>}，未換成 target；③：Error: ENOENT: no such file or directory, open '.../range.json'；④：AssertionError，實際檔案仍是 {"x":1}\n，缺少 upstream；三者皆與計畫逐案預測一致。 | create-wxl/src/merge-apply.mjs, create-wxl/src/upgrade.mjs, create-wxl/test/upgrade-record.test.mjs |
| 9 | U25：不論有無注意事項皆 exit 0（確認型） | create-wxl/test/upgrade-report.test.mjs：2 個 it（有注意事項的 fixture、完全沒有注意事項的最小 fixture） | 無（計畫預測為確認型：增量1起已無條件回傳 0，第一次執行即綠燈） | create-wxl/test/upgrade-report.test.mjs |
| 10 | U27 | test/upgrade-failures.test.mjs:『fs.rename fails on the 2nd write -> UP-E09 naming the path, exit 1; the restore commands give an empty status and HEAD's files』。fixture 用分支 M6（刪除）＋M5-added／M10（兩筆寫入，排序後第一筆為新增 assets/new-file.txt，第二筆為 pnpm-lock.yaml），用 failAt('rename', …) 在第二筆寫入的目的地路徑注入 EIO。 | AssertionError: expected 'CW-E14: an unexpected error happened: "EIO: i/o error".\n' to match /^UP-E09/m（test/upgrade-failures.test.mjs:69，紅燈訊息與計畫預測的『CW-E14 取代 UP-E09』完全一致）。 | create-wxl/test/upgrade-failures.test.mjs, create-wxl/src/merge-apply.mjs, create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-messages.test.mjs |
| 11 | U28（三個子案例：(a) 確認型 step-7 SIGINT；(b) step 9 第一次 rename 之後的 SIGTERM；(c) D8 新增的 step-10 SIGINT） | test/upgrade-signals.test.mjs 三個 describe：(a)『SIGINT at the step-7 checkpoint』沿用 T-0026 既有 checkpoint('step-7')+throwIfRaised()；(b)『SIGTERM right after step 9's first rename』用 M6+M5-updated+M5-added fixture，renameOverride 在第 1 次真實 rename 完成後立刻 emit('SIGTERM')；(c)『SIGINT at the step-10 checkpoint (D8)』用 makeSignalingCheckpoint(signals,'step-10')。 | (a) 第一次執行即綠燈（確認型）。(b) AssertionError: expected '' to match /^UP-E09/m（test/upgrade-signals.test.mjs:108，當時 stderr 為空、exitCode 為 0，訊號被忽略、range.json 已被改寫）。(c) AssertionError: expected +0 to be 130 // Object.is equality（test/upgrade-signals.test.mjs:149，當時 step-10 完全沒有檢查 guard，直接印報告並 return 0）。 | create-wxl/test/upgrade-signals.test.mjs, create-wxl/src/merge-apply.mjs, create-wxl/src/upgrade.mjs |
| 12 | U29（確認型） | test/upgrade-restore.test.mjs：重用 U17 的 13 分支 fixture 跑完一次升級後，git clean -fd 再 git checkout -- . 檢查 porcelain status 清空、每個 tracked 檔案等於升級前 HEAD、未追蹤的 ignored 檔案 scratch.local byte-identical。 | 第一次執行即綠燈（確認型，計畫預測如此）。 | create-wxl/test/upgrade-restore.test.mjs |
| 13 | U53 | test/upgrade-merge.test.mjs 新增 describe('case collision (U53)')：靶場既有已追蹤的 Guide.md；base 帶 Guide.md，target 帶 guide.md（改用『內容不同』而非計畫文字『same content』，理由見 deviations）。 | AssertionError: expected 'guide content, updated by upstream\n' to be 'guide content\n' // Object.is equality（test/upgrade-merge.test.mjs:256）。這與計畫原文預測的『readdir 不再含 Guide.md（被 M6 刪除）』不同：實測因 P-4 尚未接線，Guide.md 與 guide.md 都落入 M5-updated 而被改寫內容，不是被刪除；仍是本列缺失行為（P-4 未實作）直接造成，故記為偏離並繼續。 | create-wxl/test/upgrade-merge.test.mjs, create-wxl/src/merge-plan.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-messages.test.mjs |
| 14 | U24 的延後子案例 ②（確認型） | test/upgrade-record.test.mjs 新增『② a UP-E09 failure (step 9 write failure) leaves range.json byte-identical to before』，沿用 U27 的 failAt('rename',...) 注入手法。 | 第一次執行即綠燈（確認型，計畫預測如此）。 | create-wxl/test/upgrade-record.test.mjs |
| 15 | U54 | test/upgrade-merge.test.mjs describe('file/directory swap (U54)') 兩個 it：(1) B 有檔案 a、T 新增 a/x、o≡b at a；(2) B 有 a/x、T 有檔案 a、o 的 a/x≡b at a/x。fixture 透過 test/helpers/upgrade-fixtures.mjs 新增的 BRANCH_SPECS 分支 'U54-swap-file-to-dir' / 'U54-swap-dir-to-file'（並為 applyFileOverrides 新增 baseDirs 參數，只加不改既有呼叫）。 | (1) test/upgrade-merge.test.mjs:344 `expect(exitCode).toBe(0)` → `AssertionError: expected 1 to be +0`；實際 stderr（以除錯腳本重現）：`CW-E14: an unexpected error happened: "ENOTDIR: not a directory, open '.../create-wxl-range-repo-.../a/x'".`。(2) test/upgrade-merge.test.mjs:360 同一斷言 → `AssertionError: expected 1 to be +0`；實際 stderr：`CW-E14: an unexpected error happened: "ENOTDIR: not a directory, open '.../create-wxl-upgrade-tmp-.../create-wxl-upgrade-.../a/x'".`。兩者皆與計畫文字預測的『CW-E14 bug』方向一致，但實際觸發的一方（讀 b/t 而非讀 o）與 ENOTDIR 而非計畫原敘述的 EISDIR 不同——記錄為偏離：計畫假設崩潰發生在讀 'o'（因為 o 結構比照 base），但本實作中 case2 實際是讀 'targetDir/a/x' 時命中 ENOTDIR；成因同屬本列缺少的行為（N6 的 ENOTDIR-as-absent 尚未實作），依 2026-11-09 留言 amendment 7 記錄偏離並繼續。 | create-wxl/src/merge-plan.mjs, create-wxl/src/messages.mjs, create-wxl/test/helpers/upgrade-fixtures.mjs, create-wxl/test/upgrade-merge.test.mjs, create-wxl/test/upgrade-messages.test.mjs |
| 16 | U55 | 同檔 describe('P-6 and the parent check (U55)') 兩個 it：(1) o 是目錄、b/t 是不同檔案（自訂 fixture，直接用 makeRangeRepo + 原始 entries，不經 BRANCH_SPECS，因為 o 需要是『跟 b/t 無關的真實目錄』）；(2) T 新增 a/x、o 在 a 有老師改過的檔案（M8 保留，b present、t absent at a）→ 新分支 'U55-parent-check'。 | (1) 第一次執行即綠燈（confirmation，符合計畫『confirms increment 15's own P-6』的預測，不是本增量的紅燈）。(2) test/upgrade-merge.test.mjs:418 `expect(exitCode).toBe(0)` → `AssertionError: expected 1 to be +0`；實際 stderr（除錯腳本重現）：`UP-E09: applying the plan failed at "a/x": "EEXIST: file already exists, mkdir '.../create-wxl-range-repo-.../a'"; the range may be partially changed. Run git clean -fd then git checkout -- . to restore it to HEAD.`——與計畫預測的『UP-E09 naming a/x』方向一致，具體錯誤碼是 EEXIST 而非計畫猜測的 ENOTDIR（mkdir recursive 在 macOS 上對已存在的檔案回報 EEXIST），記錄為同類偏離（成因仍是 parent check 缺失）。 | create-wxl/src/merge-plan.mjs, create-wxl/test/helpers/upgrade-fixtures.mjs, create-wxl/test/upgrade-merge.test.mjs |
| 17 | U56 | 同檔 describe('CRLF-only difference between o and b (U56)') 兩個 it：主案例（o 僅因 CRLF 跟 b 不同，t 真的改了 → M5，寫入 t）＋核准的額外子案例（M12 乾淨合併、o 帶 CRLF，在 LF 正規化後的輸入上合併）。新分支 'U56-crlf-m5' / 'U56-crlf-m12'。 | 主案例：test/upgrade-merge.test.mjs:439 → `AssertionError: expected '<<<<<<< range\nline one\r\nline two\r…' to be 'line one\nchanged by upstream\n'`（整份輸出帶三標籤衝突標記，而非乾淨寫入 t）。額外子案例：test/upgrade-merge.test.mjs:459 → `AssertionError: expected '<<<<<<< range\nalpha-edited\r\nbeta\r…' to be 'alpha-edited\nbeta\ngamma-updated\n'`（同樣因未正規化 CRLF 而被 merge-file 判成衝突）。兩者皆與計畫文字逐字預測的『written with conflict markers instead of the plain, marker-free text』一致。 | create-wxl/src/merge-plan.mjs, create-wxl/test/helpers/upgrade-fixtures.mjs, create-wxl/test/upgrade-merge.test.mjs |
| 18 | U57 | 同檔 describe('merge-file exit outside 0-127 (U57)')，it.each 兩案：stub 包住真的 createSpawnGitRunner()，只攔截 merge-file 呼叫回傳 { code: 255, stdout: Buffer.from(''), stderr: '' }；核准的額外子案例回傳 { code: null, ... }（merge-file 被訊號結束）。fixture 同時含一個 M5-added 寫入與一個 M6 刪除，讓『什麼都不寫』的斷言不會無意義成立。 | 兩案第一個失敗斷言皆在 test/upgrade-merge.test.mjs:495 `expect(ioHelper.stderrText).toMatch(/^UP-E11/m)` → `AssertionError: expected '' to match /^UP-E11/m`（stderr 整段是空字串）。以除錯腳本重現 code:255 案確認 run 實際以 exit 0 完成、stdout 印出 `R3: UP-A1 "m12-clean.txt"`，M5/M6 都正常套用——與計畫文字逐字預測的『the first failing assertion is therefore the exit code itself... not UP-E11 missing from stderr... and not "nothing written"』完全一致。 | create-wxl/src/merge-plan.mjs, create-wxl/src/upgrade.mjs, create-wxl/src/messages.mjs, create-wxl/test/upgrade-merge.test.mjs, create-wxl/test/upgrade-messages.test.mjs |
| 19（重驗，U58） | U58：M12 乾淨合併 `package.json` 但輸出不是合法 JSON → 保留 o，列 UP-A11 | 既有測試 `create-wxl/test/upgrade-merge.test.mjs` describe('M12 clean merge of invalid JSON (U58)')，it('a clean merge of package.json that does not parse as JSON: o kept, UP-A11')（U58 的測試已在工作樹中，本輪不重寫測試本體，只重新跑出紅燈證據） | 先記錄 `create-wxl/src/merge-plan.mjs` 原始 sha256（b52d2dbe1177ded6e77fab9600f63151a70e770ec80677c3249c5d535aaf3b29），移除 runMergeFile 的 code-0 分支中 `.json` 解析檢查後，執行 `pnpm --dir create-wxl exec vitest run test/upgrade-merge.test.mjs -t "M12 clean merge of invalid JSON"`，輸出：FAIL test/upgrade-merge.test.mjs > M12 clean merge of invalid JSON (U58) > a clean merge of package.json that does not parse as JSON: o kept, UP-A11 — AssertionError: expected Buffer[ 123, 10, 32, 32, 34, 110, …(-4) ] to deeply equal Buffer[ 123, 10, 32, 32, 34, 110, …(-4) ]（diff 第 82-93 行顯示原本的 65,65,65,65'AAAA'變成 66,66,66,66'BBBB'，即 package.json 升級後被 M12 當成一般乾淨合併寫入了 target 內容，沒有保留 o）；於 test/upgrade-merge.test.mjs:521:66 的 expect(await readFile(...)).toEqual(before) 處失敗；Test Files 1 failed (1)，Tests 1 failed \| 13 skipped (14)。與預測一致：寫入了輸出而非保留 o。 | create-wxl/src/merge-plan.mjs:203-214, create-wxl/src/messages.mjs:242-244 (en), create-wxl/src/messages.mjs:378 (zh-TW), create-wxl/test/upgrade-messages.test.mjs:182-184 |
| 13（重驗，U53） | U53：Guide.md（B）與 guide.md（T）只差大小寫 → 兩者都不動，各列一筆 UP-A8 | 既有測試 create-wxl/test/upgrade-merge.test.mjs describe('case collision (U53)')，it("Guide.md (B) and guide.md (T) only differ by case: both untouched, UP-A8 each")；先把 fixture 改回「B 的 Guide.md」與「T 的 guide.md」同內容（'guide content\n'），移除 segment C 加入的內容差異，並更正說明註解 | 還原同內容 fixture 後，執行 pnpm --dir create-wxl exec vitest run test/upgrade-merge.test.mjs -t "Guide.md"，輸出：FAIL test/upgrade-merge.test.mjs > case collision (U53) > Guide.md (B) and guide.md (T) only differ by case: both untouched, UP-A8 each — AssertionError: expected [] to deeply equal [ 'R3: UP-A8 "Guide.md"', …(1) ]（Expected 顯示 ["R3: UP-A8 \"Guide.md\"", "R3: UP-A8 \"guide.md\""]，Received 為 []）；於 test/upgrade-merge.test.mjs:257:23 的 expect(r3Lines).toEqual(...) 處失敗；Test Files 1 failed (1)，Tests 1 failed \| 13 skipped (14)。與任務預測一致：完全沒有 UP-A8 行（readFileOrNull 用 path join 直接讀 baseDir/'guide.md'，在大小寫不分的檔案系統上解析到 Guide.md 這個同一實體，讀到與 target 的 guide.md 相同位元組，使 b≡t 落入 P-2，在 P-4 之前就被吃掉）。 | create-wxl/test/upgrade-merge.test.mjs:217-234, create-wxl/src/merge-plan.mjs:245-253（baseFileSet/targetFileSet）, create-wxl/src/merge-plan.mjs:267-274（讀取 b/t 改為先查 pristine 檔名清單） |
| 決定(4)收尾（非 TDD 增量，核准的純移除，無行為改變） | 移除已不再使用的 upgradeMergeNotImplemented export，以及 base-version.mjs 中提到它的註解 | 無新測試（任務明確定義為「無行為改變」的核准移除）；以整套測試作為唯一檢查 | 不適用（非紅-綠流程）；移除前先以 grep -rn "upgradeMergeNotImplemented" 確認除 src/messages.mjs:189、src/base-version.mjs:7 外，全倉庫（含 upgrade.mjs 與所有測試）已無任何引用，確定移除安全 | create-wxl/src/messages.mjs:185-192（整段移除）, create-wxl/src/base-version.mjs:6-8（移除提及 upgradeMergeNotImplemented 的一句，保留其餘註解） |
| 20 | U59：anchor file 的 b≢t 加一筆 UP-A12（present / absent / 兩個同時變動仍恰好一行，皆排在最後） | create-wxl/test/upgrade-report.test.mjs:77-121 新增 describe('anchor file changes add UP-A12 (U59)')，三個 it：①branches:['M5-updated']（README.md 這個 anchor 在 base/target 間不同）→ 斷言 R3 恰為 ['R3: UP-A12']；②branches:[]（無任何 anchor 變動）→ 斷言 R3 為 []；③branches:['M5-updated','U59-second-anchor']（README.md 與新增的 README.en.md 兩個 anchor 同時不同）→ 斷言 R3 仍恰為 ['R3: UP-A12']。新分支 'U59-second-anchor'（test/helpers/upgrade-fixtures.mjs:174-177，只加不改既有分支）讓 README.en.md 在 base/target 間不同（PRISTINE_FIXTURE 原本沒有這個檔案，純新增）。 | `pnpm --dir create-wxl exec vitest run test/upgrade-report.test.mjs -t "anchor file changes add UP-A12"` → 2 個失敗、1 個通過（②『無變動』案例第一次執行即綠燈，屬計畫預測的 confirmation，非紅燈）： ① `AssertionError: expected [] to deeply equal [ 'R3: UP-A12' ]` at test/upgrade-report.test.mjs:85:23 ③ `AssertionError: expected [] to deeply equal [ 'R3: UP-A12' ]` at test/upgrade-report.test.mjs:114:23 與計畫逐字預測的『Expected red: AssertionError — nothing reads the anchor-file list yet』完全一致。 | create-wxl/test/helpers/upgrade-fixtures.mjs:168-177（新分支 'U59-second-anchor'，只加）, create-wxl/test/upgrade-report.test.mjs:77-121（U59 的三個 it）, create-wxl/src/merge-plan.mjs:390-423（planMerge 結尾新增 Fork:init-derived content 檢查：九個 anchor 路徑逐一讀 base/target、任一 b≢t 就在 attention 補一筆 { code: 'UP-A12' }，不帶 path，排在 attention.sort 之後，確保只此一筆且不受路徑排序干擾）, create-wxl/src/upgrade-report.mjs:39-42（buildReport 的 R3 迴圈：UP-A12 印成 'R3: UP-A12'，不像其他 UP-A* 那樣附路徑）, create-wxl/src/messages.mjs:245-250（en UP-A12）、:385-386（zh-TW UP-A12）, create-wxl/test/upgrade-messages.test.mjs:185-188（UP_ARGS 新增 'UP-A12': {}，B1 核准清單第 9 筆） |
| 21 | U26（R1–R5 完整報告、雙語、--from 版本顯示案例）— 依 B5 移到此處 | create-wxl/test/upgrade-report.test.mjs 新增 describe('report text (U26)')：5 個 it——en 完整報告、zh-TW 完整報告、deploy.yml 存在時改列 push v* tag、--from <base commit> 且無 range.json 時 R1 顯示 base archive 自己 package.json 的 3.0.5（不是 P3 的 0.1.0）、24 個代碼在兩份訊息表都存在的確認檢查。 | 3/5 失敗，另 2 個（--from/3.0.5 案例、24 碼確認）第一次執行即綠燈。失敗訊息（en 案例，test/upgrade-report.test.mjs:144）：`AssertionError: expected [ 'R4: next steps (filled in later)' ] to deeply equal [ …(5) ]`；zh-TW 案例（:172）同形狀：`expected [ 'R4: 下一步（之後補上）' ] to deeply equal [ Array(5) ]`；deploy.yml 案例（:187）同形狀。三者皆因 R4 仍是增量 1 的固定佔位文字造成，與計畫『placeholder 文字在 exact-text 斷言上失敗』的預測一致，只是 R1/R2/R3/R5 在更早的增量就已經是『真』文字（非計畫描述的佔位），所以沒有在這三者上出紅燈——記為偏離，詳見 deviations。 | create-wxl/src/upgrade-report.mjs（R4 的真正文案與兩個條件式項目，wroteDependencyFile/buildR4Lines，:35,41-57,59,72）, create-wxl/src/upgrade.mjs（apply 完成後、印報告前計算 hasDeployWorkflow，:479-500）, create-wxl/test/helpers/upgrade-fixtures.mjs（新增分支 U26-deploy-workflow，只加不改）, create-wxl/test/upgrade-report.test.mjs（新 describe('report text (U26)')，runUpgradeAgainst 加一個有預設值的 argv 參數，向後相容） |
| 22 | U60（tracked 檔案的外部硬連結，被 M5 寫入後外部名字內容不變） | create-wxl/test/upgrade-links.test.mjs 新增 describe('hard link (U60)')：一個 it，非 Windows-skip（票單 Notes 核准）。 | 無——第一次執行即綠燈（計畫預測的確認型增量：write-then-rename 自增量 1 起從未變過，天生不會動到外部名字指向的 inode）。 | create-wxl/test/upgrade-links.test.mjs（新 describe('hard link (U60)')，無生產程式碼改動） |
| 23 | U61（升級、commit、再升級一次 → UP-I01） | create-wxl/test/upgrade-restore.test.mjs 新增 describe('re-run after a completed upgrade and commit (U61)')：一個 it，用一次真的完整升級＋真的 git commit，再以全新 deps（m6 修正：第二次用全新物件，不沿用第一次）跑第二次 upgrade。 | 無——第一次執行即綠燈（計畫預測的確認型增量：checkBaseAgainstTarget 的 baseCommit===targetCommit 分支，T-0026 的 U12 已經涵蓋，這裡只是換一個真實觸發路徑）。 | create-wxl/test/upgrade-restore.test.mjs（新 describe('re-run after a completed upgrade and commit (U61)')，無生產程式碼改動） |
| 24 | U62（target 路徑含 ANSI escape，在抵達報告前就被 0005 的 entry rule 3 擋下） | create-wxl/test/upgrade-report.test.mjs 新增 describe('ANSI escape in a target path (U62)')：一個 it，target archive 新增一筆含 \u001b 的路徑 entry。 | 無——第一次執行即綠燈（計畫預測的確認型增量：0005 的 archive-rules.mjs rule 3 在 step 7 驗證 target archive 時就已攔截，從未碰到 merge 或報告路徑；messages.mjs 既有的 CW-E08 本就透過 jsonValue 跳脫）。 | create-wxl/test/upgrade-report.test.mjs（新 describe('ANSI escape in a target path (U62)')，無生產程式碼改動） |
| 25 | D4（M12 對非 UTF-8 檔案的位元組原樣往返） | create-wxl/test/upgrade-merge.test.mjs 新增 describe('M12 clean merge of a non-UTF-8 file (D4)')：一個 it，o/b/t 為同一個 Big5 風格（非 NUL、非合法 UTF-8 起始位元組）文字檔的三個版本，改動落在不同行，真的 createSpawnGitRunner()。 | `AssertionError: expected Buffer[ 239, 191, 189, 93, 10, …(-221) ] to deeply equal Buffer[ 164, 93, 10, 176, 207, …(0) ]` at test/upgrade-merge.test.mjs:550（每個無效位元組對都被取代成 U+FFFD 的 UTF-8 編碼 `EF BF BD`，與計畫逐字預測的『written file contains EF BF BD where the original bytes should be』完全一致）。先暫時還原 merge-plan.mjs 的 merge-file 呼叫到尚未加 `binary: true` 的狀態以取得這個真紅燈，再重新套用修正。 | create-wxl/src/git-runner.mjs（runGit 新增可選的 binary 參數，預設 false，向後相容，:72-108）, create-wxl/src/merge-plan.mjs（runMergeFile 對 merge-file 呼叫改用 { binary: true }，stdout 以 Buffer 處理，:198-214）, create-wxl/test/helpers/upgrade-fixtures.mjs（新增分支 D4-big5，只加不改）, create-wxl/test/upgrade-merge.test.mjs（新 describe('M12 clean merge of a non-UTF-8 file (D4)')） |

Two stops, both resolved by the main session within the approved scope:

- **Increment 19 (U58) was green before its change.** Segment A had written U58's JSON check into
  `runMergeFile` during increment 1, without a red. The check was removed, U58's red observed (row
  "19（重驗，U58）" above), and the check put back as increment 19's change.
- **U53 hid a defect.** On a case-insensitive file system (macOS, Windows) `merge-plan.mjs` read b
  and t by path, so `guide.md` read from B returned `Guide.md`: with equal contents both paths fell
  into P-2 and no UP-A8 was reported, so an upstream case-only rename went unreported. Segment C had
  changed the fixture to unequal contents to pass. The plan's fixture was restored, the red observed
  (row "13（重驗，U53）"), and b and t are now present only when the exact path is among the names
  the pristine range lists.

Process deviations recorded by the executor: increments 1–3 were observed red together (one shared
cause, decision (4)'s fall-through); increments 15 and 16's tests were written in one edit; in
increment 25 (D4) the production change was written first, then reverted at the call site to
observe the red before re-applying it. Fixture literals (paths, bytes) are the executor's, checked
against each branch's premises.

**Mutation checks** for every test whose red was never observed: each mutation was made in
production code, the row's test run, and the file restored. The sha256 of each mutated file after
every restore equals its content at `6619ece` (`git show 6619ece:<path> | shasum -a 256`):
`merge-plan.mjs` `d88f1fe36eda32709a4c38f826dfc14cd871840575ca034f3ecb56b8d62d27a1`, `merge-apply.mjs`
`9943a1c8d2eef14f1d22a9237c83334869679a8b331e0036ece4af647b8badba`, `upgrade.mjs`
`4b06306e562c8a9b7c32a12b1f54a30b464974a63abf296a32a813b9a2ae9a47`, `messages.mjs`
`a993b13eff7becba3206eff483942c1033e4d0947628cb16b81f9e4f1220e86b`, `archive-rules.mjs`
`8665481460f509c268ab51c1b551df4546cac4070e8e684aaa8e7e613f975385`.

| Row | Mutation | Observed red |
|---|---|---|
| U18 (increment 2) | src/merge-plan.mjs runMergeFile(): clean-merge write branch changed to append junk bytes — content: Buffer.concat([result.stdout, Buffer.from('MUTATED-U18')]) | AssertionError: expected 'o-line1\nline2\nt-line3\nline4\nline5…' to be 'o-line1\nline2\nt-line3\nline4\nline5…' — diff shows extra line "MUTATED-U18" appended, at test/upgrade-merge.test.mjs:180 |
| U19 (increment 3) | src/merge-plan.mjs runMergeFile(): merge-file -L label changed from 'range' to 'RANGE' | AssertionError: expected -1 to be greater than or equal to 0, at test/upgrade-merge.test.mjs:210 (ours = lines.indexOf('<<<<<<< range') not found) |
| U21 (increment 5) | src/merge-plan.mjs planMerge(): P-2 both-absent shortcut weakened — `if (eq(b, t)) continue` → `if (eq(b, t) && !(b === null && t === null)) continue` | AssertionError: expected [ 'R3: UP-A3 ".gitignore"', …(5) ] to deeply equal [ 'R3: UP-A2 "m11-binary.bin"', …(5) ] at test/upgrade-merge.test.mjs:145 — a tracked, both-absent (b=t=null) path now wrongly enters the merge table and gets reported, exactly the class of bug U21 guards against (teacher-owned.txt is in the same class; .gitignore surfaced first by sort order) |
| U25 (increment 9) | src/upgrade.mjs runUpgradeBody(): final `return 0` changed to `return planResult.attention.length > 0 ? 1 : 0` | AssertionError: expected 1 to be +0, at test/upgrade-report.test.mjs:57 (the attention-item case); the no-attention-item case stayed green as expected (attention.length is 0 there) |
| U29 (increment 12) | src/upgrade.mjs runUpgradeBody(): inserted `await deps.runGit(['add','-A'],...)` + `await deps.runGit(['commit','-m','MUTATED-U29'],...)` right before the step-10 checkpoint, simulating an accidental auto-commit | AssertionError: expected '7e476e4a...' to be '1e49a6e1...' (headAfter !== headBefore), at test/upgrade-restore.test.mjs:96 |
| U24 sub-case 2 (increment 14) | src/merge-apply.mjs applyMerge(): added an unconditional `await writeRangeJson(deps, rangeRoot, upstream)` at function entry, before the delete/write loops | AssertionError: expected '{\n "upstream": {... version 3.1.0, new commit}' to be '{... version 3.0.0, old commit}' (range.json no longer byte-identical after the induced UP-E09 failure), at test/upgrade-record.test.mjs:95 |
| U55 case 1 (increment 16) | src/merge-plan.mjs isNonFileOther(): body changed to always `return false` | AssertionError: expected '...' to contain 'R3: UP-A10 "p6dir"' — got a full report with R3: UP-A5 instead of UP-A10, at test/upgrade-merge.test.mjs:409 |
| U28 case (a) (increment 11) | src/upgrade.mjs: removed `guard.throwIfRaised()` immediately after `deps.checkpoint('step-7')` | AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times (fetchArchive called despite the SIGINT at step-7), at test/upgrade-signals.test.mjs:75 |
| git ls-files -z fail-closed case (increment 6) | src/merge-plan.mjs planMerge(): changed `if (trackedResult.code !== 0) { throw ... }` to `if (false && trackedResult.code !== 0) { throw ... }` | AssertionError: expected +0 to be 1 (exit code 0 instead of 1; the non-zero ls-files exit was silently accepted instead of failing closed), at test/upgrade-ignored.test.mjs:133 |
| U59 case "no anchor change" (increment 20) | src/merge-plan.mjs planMerge(): anchor-diff check `if (!eq(anchorB, anchorT))` forced to `if (true)` | AssertionError: expected [ 'R3: UP-A12' ] to deeply equal [] at test/upgrade-report.test.mjs:99 |
| U60 (increment 22) | src/merge-apply.mjs applyMerge(): write loop changed from write-to-temp-then-rename to writing/chmod-ing `dest` directly (tmp file and rename removed) | AssertionError: expected Buffer[...45 bytes] to deeply equal Buffer[...24 bytes] — the outside hard-linked name's content changed because the shared inode was overwritten in place, at test/upgrade-links.test.mjs:166 |
| U61 (increment 23) | attempt 1: src/upgrade.mjs checkBaseAgainstTarget(): `if (baseCommit === targetCommit)` forced to `if (false && baseCommit === targetCommit)`. attempt 2: whole function body replaced with `return null` as its first statement | Attempt 1 stayed GREEN (1 passed) — this fixture also satisfies the separate equal-version no-op branch (baseVersion===deps.source.version, no override), which independently produces the same UP-I01/exit-0/no-fetch outcome, masking the baseCommit-equal branch alone. Attempt 2 (disabling the whole no-op function) went RED: `AssertionError: expected 'R1: create-wxl "3.1.0"; base "3.1.0" …' to match /^UP-I01/m`, at test/upgrade-restore.test.mjs:153. Reported as a WEAK TEST finding for this specific branch: U61's own fixture does not isolate the baseCommit===targetCommit branch from the redundant equal-version branch, so a mutation that disables only the former does not turn this row red. |
| U62 (increment 24) | src/archive-rules.mjs checkComponents(): `if (CONTROL_CHAR_RE.test(component)) throw ...` changed to `if (false && CONTROL_CHAR_RE.test(component)) throw ...` | AssertionError: expected +0 to be 1 (exit code 0 instead of 1; the ANSI-escape path was no longer rejected by archive rule 3), at test/upgrade-report.test.mjs:265 |
| U26 sub-case "--from <commit>, no range.json, base package.json 3.0.5" (increment 21) | src/upgrade.mjs: `baseVersion = rawVersion` changed to `baseVersion = deps.source.version` | AssertionError: expected 'UP-I01: nothing to do; the range is a…' to contain 'base "3.0.5"' — forcing baseVersion to equal the target version also tripped the equal-version no-op branch, replacing the full report with UP-I01, at test/upgrade-report.test.mjs:211 |
| U26 sub-case "24 codes in both message tables" (increment 21) | src/messages.mjs: deleted the `en.UP-A12` entry entirely | AssertionError: expected undefined to be type of 'function' (en['UP-A12'] missing), at test/upgrade-report.test.mjs:246 |

U61 is a weak test for the commit-equal branch alone: after an upgrade and commit, `range.json`
holds the target's version and commit, so the equal-version branch gives the same UP-I01; T-0026's
U12 covers the commit-equal branch. Recorded, not changed.

**Independent verification.** A read-only verifier checked every row against the approved table and
traceability. Its first pass found: R3 not in the run's language (traceability.md:206) and U26 not
reusing U17's run; the UP-A12 line printed without its advice (traceability.md:159-161); the parent
check looking only at the direct parent (traceability.md:153); the anchor check reading B and T by
path; and U20, U27, U61, U62 not asserting all of their approved boundary conditions. The user
approved two sub-cases on 2026-11-09 (U55 with `a/b/x` under a kept file `a`; an anchor renamed by
case only upstream). The follow-up, test-first, is below; the re-verification (a second read-only
verifier run of the same workflow) passed every row but U20's link mtime and inode, which the main
session added (`create-wxl/test/upgrade-links.test.mjs`, in `21858b9`).

| Item | Red observed | Files |
|---|---|---|
| item1-U26 | en 案例：AssertionError: expected [ 'R3: UP-A2 "m11-binary.bin"', …(6) ] to deeply equal [ …(7) )]（Expected 7 行完整訊息文字，Received 仍是舊的 'R3: UP-A2 "m11-binary.bin"' 等裸代碼+路徑），於 test/upgrade-report.test.mjs:203。zh-TW 案例：AssertionError: expected 'R1: create-wxl "3.1.0"; base "3.0.0" …' to be 'R1: create-wxl "3.1.0"；base 版本 "3.0.0…'（zh-TW 執行下 R1 仍印出與 en 一字不差的英文），於 test/upgrade-report.test.mjs:243。 | create-wxl/test/upgrade-report.test.mjs:17-66,221-265,266-311（新測試與輔助函式）, create-wxl/src/upgrade-report.mjs:42,59-85（buildReport 加 t2 參數、R1/R2/R3/R5 依語言渲染）, create-wxl/src/upgrade.mjs:501（呼叫端補傳 t2） |
| item2-U59 | AssertionError: expected [ Array(1) ] to deeply equal [ 'R3: UP-A12' ]（Received 是完整訊息文字，Expected 仍是舊的裸代碼），兩個案例分別於 test/upgrade-report.test.mjs:135、:164。此紅燈是在實作 item 1 的 production 修正之後、尚未改這兩行測試之前觀察到的（與 item 1 共用同一次 production 修正，故紅燈是在跑整套測試時一併出現，而非獨立的先紅後綠流程）。 | create-wxl/test/upgrade-report.test.mjs:135,164（與 item 1 共用同一筆 production 修正，見上） |
| item3-U55-deep | AssertionError: expected 1 to be +0（exitCode 是 1 不是 0），於 test/upgrade-merge.test.mjs:452——正如預期：parent check 只 lstat 直接父層 'a/b'，在大小寫無關的 ENOTDIR 被 catch 區塊誤判為「不存在」，使 a/b/x 的寫入未被擋下，mkdir 失敗後以 UP-E09 結束，而非 UP-A10。 | create-wxl/test/helpers/upgrade-fixtures.mjs:135-142（新分支，只加不改既有分支）, create-wxl/test/upgrade-merge.test.mjs:444-463（新 it）, create-wxl/src/merge-plan.mjs:365-396（parent check 改為逐層走訪每一個祖先路徑，不只直接父層） |
| item4-U59-case-rename | AssertionError: expected [] to deeply equal [ Array(1) )]（Received 完全沒有 UP-A12 行），於 test/upgrade-report.test.mjs:208——在不分大小寫的 APFS 上，anchor 檢查直接以路徑拼接讀取 targetDir/README.md，解析到同一個 readme.md 實體、讀到相同位元組，誤判為「b≡t，anchor 未變」。 | create-wxl/test/upgrade-report.test.mjs:15-16,172-213（新 import 與新 it）, create-wxl/src/merge-plan.mjs:423-437（anchor 檢查改用 baseFileSet/targetFileSet 精確檔名存在性，而非路徑讀取） |
| item5a-U20 | 無——第一次執行即綠燈（屬確認型收緊；P-3 在合併表最前面就把這些路徑整批跳過，從未嘗試寫入，理論上若未來出現「先解開符號連結再判斷」之類的回歸，這個收緊後的斷言才會抓到，但目前程式碼下不可能變紅）。 | create-wxl/test/upgrade-links.test.mjs:10,77-90,111-127（無 production 改動） |
| item5b-U27 | 無——第一次執行即綠燈（write-then-rename 與還原指令在目前實作下本就會讓每個 tracked 檔案精確回到 HEAD 的位元組，舊的弱斷言只是沒能力抓出回歸，收緊後仍是對既有行為的確認）。 | create-wxl/test/upgrade-failures.test.mjs:79-85（無 production 改動） |
| item5c-U61 | 第一版（snapshot 擷取點放在測試自己的 git rev-parse/git status 呼叫之後）：AssertionError: expected { '.': …, …(74) } to deeply equal { '.': …, …(74) }，差異只在 `.git` 與 `.git/index` 的 mtimeMs/ino（內容雜湊不變），於 test/upgrade-restore.test.mjs:171——這個紅燈的成因是這次驗證自己呼叫的 `git status`/`git rev-parse` 本身就會刷新 `.git/index` 的 stat cache，不是 upgrade 本身寫入了什麼；判定為「與本列無關的紅燈」（任務用語：『是紅燈但原因不相關』），因此改為先擷取 snapshotAfter、再呼叫這次驗證自己的 git 指令，而不是去改 production。 | create-wxl/test/upgrade-restore.test.mjs:17,126-139,163-171（無 production 改動；僅調整測試內驗證呼叫的先後順序） |
| item5d-U62 | 無——第一次執行即綠燈（CW-E08 在 step 7 驗證 target archive 時就擋下，從未進入合併或寫入階段；range-repo 自己的初始 commit 已讓 .git/index 的 stat cache 穩定，這次 run 內部的 git status 前置檢查未再觸發位元組層級的差異）。 | create-wxl/test/upgrade-report.test.mjs:16,396-408（無 production 改動） |

Edited T-0026 test bodies, as the user approved: `UP_ARGS` entries in
`create-wxl/test/upgrade-messages.test.mjs`, the F14 case in `create-wxl/test/upgrade-target.test.mjs`
(exit 0, its title), and the `upgradeMergeNotImplemented` test removed with its export. The R3
format change also updated this ticket's own assertions in `upgrade-ignored`, `upgrade-links` and
`upgrade-merge` tests (mechanical, recorded by the executor). No 0005 test body and not
`language.test.mjs`.

### 2026-11-09 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0006-S1 | `upgrade-merge`, `upgrade-links`, `upgrade-ignored`, `upgrade-record`, `upgrade-report`, `upgrade-failures`, `upgrade-signals`, `upgrade-restore` (`.test.mjs`; the suite grew by a net 42 tests) and the approved edits to `upgrade-messages`, `upgrade-target` | not measured: no coverage provider is installed in create-wxl (as for T-0020–T-0026) | U17–U29, U53–U62, D4, D8 and the approved sub-cases | U20, U23 and the 0755 case are skipped on win32 (symbolic links, execute bits); U61 cannot isolate the commit-equal branch (above); `merge-file` output "not read in full" has no case of its own (the runner resolves only after the whole stdout is read; a rejection reaches CW-E14) |
| 0006-S2 | — | — | U32 | stage 8: the terminal simulation, recorded separately |

Checks at `21858b9` (which holds the U20 follow-up), macOS (darwin arm64, Node v24.13.0), 2026-11-09:
`pnpm --dir create-wxl test` → `Test Files 34 passed (34) / Tests 600 passed (600)` (create-wxl
vitest in Node); `pnpm test --run` → `Test Files 136 passed (136) / Tests 4854 passed | 1 skipped
(4855)` (root vitest); `python3 scripts/verify-project.py` → `PASS`. windows-latest and the other CI
runners: pending, on the pull request. Acceptance criteria ticked except U32; status `review`.

### 2026-11-09 — stage 6 review and disposition (fixes not yet applied)

`/code-review` on the committed change (base `origin/main` `34bbb3b`, merge-base `f0ff741`, HEAD
`21858b9`; packet captured before review). Two independent `harness-reviewer` passes, one axis each.
Standards: 23 documented-standard findings (S1–S23) and 11 smells (S24–S34). Spec: 23 findings
(P1–P23; "P" here numbers the Spec axis, not the pre-checks). Both reports, verbatim, are kept locally
in `.proj.research/2026-11-09-T-0027-stage6-review.md` (gitignored). Worst per axis: S1 (U55 (3)'s
`ENOTDIR` assertion fails on windows-latest; it did, on PR #67, and was fixed in `4125aef`) and P1
(an upstream change to `.gitignore` written by M5 changes which files are ignored, so the restore
commands' `git clean -fd` can delete a teacher's ignored file).

The user decided on 2026-11-09:

- **D9** (P1): a `.gitignore` at any level with b ≢ t is left as it is and reported UP-A13; the
  teacher merges ignore rules by hand. Traceability revision 2.4 (P-7, UP-A13, row U63); spec AC-8.
- **Behaviour fixes, each test-first with a new sub-case (approved):** P2, P11, P18 — a failure or
  signal while writing `range.json`, or any error after the first operation of step 9, prints UP-E09
  with the restore commands and removes the temporary file; P3 — the merge-inputs directory is removed
  however step 8 ends; P4, P5 — a read error or a `runGit` rejection in step 8 is UP-E11, whose text
  carries the error; P6 — R5 says to use the commands only before other changes (en, zh-TW); P7 — the
  temporary file has a unique name and is created exclusively; P8 — o is classified by `lstat` before
  any read, and a symbolic link or non-file is never read; P9 — binary when any present side of the
  three has a NUL; P10 — a signal this process received while `merge-file` or `check-ignore` ran wins:
  exit 130 (T-0026's candidate 13 convention); P12 — M10 keeps the lockfile's mode; S2 — the parent
  check's and `existingMode`'s `lstat` treat only ENOENT as absent (fail closed); R4's deploy hint
  stays fail-open, commented.
- **Fixed within scope:** P14 (UP-A8 names the Unicode form too), P22 (U17 asserts exactly one
  UP-A12), P23 (U28's criterion names D8; spec.en.md notes D7–D9); S3–S8, S15–S18, S20, S21, S23
  (stale comments and plan codes in comments, bilingual checks of the report texts and UP-E09's
  signal branch, helper conventions, umask inside `try`, mixed colons, the decision table's order);
  S9–S13 (records pinned to commits, hashes and commands, Taiwan usage); S19 (GLOSSARY gains
  "attention item").
- **Recorded, not changed:** P13, P15–P17, P19–P21 (rare edge cases or spec gaps; open-question
  candidates); S14 (Chinese in ticket tables, as T-0026) and S22 (coverage not measured, as T-0026);
  smells S24–S34 (optional quality cleanup, not stage 6).

Status stays `review`. The fixes above are the next step.

### 2026-11-09 — stage 6 fixes applied

The disposition above was applied by the executor role in four runs, then checked by an independent
read-only verifier. The first run stopped before doing anything: the executor read the user's earlier
"剛剛誤按／重新問" (said about a question dialog) as addressed to it; the brief was corrected and the
run repeated. Runs on macOS (darwin arm64, Node v24.13.0); surface: create-wxl vitest in Node. Reds are
quoted as reported. Committed as `6619cd8`; `path:line` references are to that commit.

| Item | Test | Red observed |
|---|---|---|
| item1 — D9 / U63（新核准列）：pre-check P-7、UP-A13 | create-wxl/test/upgrade-ignored.test.mjs:91-121 describe('upstream .gitignore changes (U63, D9)') 的唯一 it：fixture 分支 'U63-gitignore'（test/helpers/upgrade-fixtures.mjs:202-209 新增），根目錄 .gitignore 與巢狀 sub/.gitignore 在 base/target 間都改變、o≡b；斷言兩個 .gitignore 升級後位元組不變、R3 各一筆 UP-A13、exit 0、M2 既有的 scratch.local（充當題目所舉例的「teacher's ignored file／secret.local」）升級後與還原指令（git clean -fd + git checkout -- .）後都位元組不變。 | AssertionError: expected Buffer[ 42, 46, 116, 109, 112, 10 ] to deeply equal Buffer[ 42, 46, 108, 111, 99, 97, …(-99) ] - Expected + Received { "data": [ 42, 46, - 108, - 111, - 99, - 97, - 108, + 116, + 109, + 112, 10, ], "type": "Buffer", } at test/upgrade-ignored.test.mjs:111:49（根目錄 .gitignore 被 M5 當成一般檔案改寫成 target 的 '*.tmp\n'，而不是維持 base 的 '*.local\n'——正是 D9 要修的那個洞）。 |
| item2(a) — P2/P11/P18：range.json 自己的 rename 失敗 | create-wxl/test/upgrade-failures.test.mjs:54-78 describe('range.json write failure (stage 6 review, P2/P11/P18)') 的唯一 it：fail-at 攔截 rename 呼叫，只在目的地等於 range.json 時注入 EIO；斷言 stderr 以 UP-E09 開頭、含 'range.json' 與兩道還原指令、exit 1、暫存檔 .create-wxl-upgrade-tmp-range.json 不殘留。 | AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E09/m - Expected: /^UP-E09/m + Received: "CW-E14: an unexpected error happened: \"EIO: i/o error\".\n" at test/upgrade-failures.test.mjs:69:35 |
| item2(b) — P2/P11/P18：range.json 寫入期間的 SIGTERM（確認型，無需額外production change） | create-wxl/test/upgrade-signals.test.mjs:162-188 describe("SIGTERM right after range.json's own temporary file is written (stage 6 review, P2/P11/P18)") 的唯一 it：覆寫 writeFile，在寫入檔名以 .create-wxl-upgrade-tmp-range.json 結尾的那次呼叫後立即 emit('SIGTERM')；斷言 UP-E09 含訊號名與還原指令、exit 130、tmpRoot 下無殘留。 | 無法產生紅燈——item2(a) 在 writeRangeJson 內加的 `if (guard.isRaised()) return { ok:false, signal }`（寫入暫存檔之後、rename 之前）已經同時涵蓋這個訊號時機，第一次執行就是綠燈。這屬於偏離（已在最終報告的 deviations 記錄），比照票單既有慣例（U21/U25/U29 等『確認型』增量）繼續，不視為整個任務的阻斷。 |
| item3 — P3：merge-inputs 目錄不論 step 8 如何結束都要移除 | create-wxl/test/upgrade-signals.test.mjs:61-82 describe('SIGINT during step 8, right after the first merge-file (stage 6 review, P3)') 的唯一 it：fixture 含 M12 路徑；runGit stub 包住真的 createSpawnGitRunner()，呼叫含 'merge-file' 的指令、等真的結果回來後才 emit('SIGINT')；斷言 exit 130、tmpRoot 下無 create-wxl-upgrade- 殘留。 | AssertionError: expected [ 'create-wxl-upgrade-merge-PYWfsI' ] to deeply equal [] - Expected + Received - [] + [ + "create-wxl-upgrade-merge-PYWfsI", + ] at test/upgrade-signals.test.mjs:79:44（exit code 已經是 130，但 merge-inputs 暫存目錄沒被清掉）。 |
| item4(a) — P4：步驟 8 讀取 o/b/t 時的非「不存在」錯誤 | create-wxl/test/upgrade-merge.test.mjs:552-579 describe('planning failures other than an absent path (stage 6 review, P4)') 的唯一 it：fail-at 攔截 readFile，只在路徑等於 M12 路徑 'm12-clean.txt' 的 o 時注入 EACCES；斷言 stderr 以 UP-E11 開頭、含該路徑與 'EACCES'、exit 1、nothing written。 | AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E11/m - Expected: /^UP-E11/m + Received: "CW-E14: an unexpected error happened: \"EACCES: permission denied\".\n" at test/upgrade-merge.test.mjs:567:35 |
| item4(b) — P5：merge-file 的 runGit 拒絕 | create-wxl/test/upgrade-merge.test.mjs:582-609 describe('runGit rejects for merge-file (stage 6 review, P5)') 的唯一 it：runGit stub 對含 'merge-file' 的呼叫回傳 Promise.reject(new Error('ECONNRESET: socket hang up'))，其餘指令走真的 runner；斷言 UP-E11 含路徑與 'ECONNRESET'、exit 1、nothing written。 | AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E11/m - Expected: /^UP-E11/m + Received: "CW-E14: an unexpected error happened: \"ECONNRESET: socket hang up\".\n" at test/upgrade-merge.test.mjs:599:35 |
| item5 — P6：R5 只在做其他變更之前才可使用的警語（en/zh-TW） | 收緊既有 test/upgrade-report.test.mjs 的 U26 兩個 it（en、zh-TW 完整報告）裡對 R5 那一行的斷言，改成新文字（先改測試看紅燈，再改 production）。 | en：AssertionError: expected 'R5: git clean -fd; git checkout -- .' to be 'R5: to undo the whole upgrade before …' Expected: "R5: to undo the whole upgrade before making other changes, run git clean -fd then git checkout -- ." Received: "R5: git clean -fd; git checkout -- ." at test/upgrade-report.test.mjs:262:25 zh-TW：AssertionError: expected 'R5: 依序執行 git clean -fd 和 git checkout…' to be 'R5：如果要撤銷整個升級，請在做其他變更之前依序執行 git clean …' Expected: "R5：如果要撤銷整個升級，請在做其他變更之前依序執行 git clean -fd 和 git checkout -- ." Received: "R5: 依序執行 git clean -fd 和 git checkout -- . 可撤銷整個升級" at test/upgrade-report.test.mjs:313:25 |
| item6-P7 | create-wxl/test/upgrade-merge.test.mjs describe("step 9's own temporary file (stage 6 review, P7)"): 事先用 merge-apply.mjs 原本的固定命名法 `.create-wxl-upgrade-tmp-README.md` 準備一個被 .gitignore 忽略的既有檔案，跑 M5-updated 分支的 upgrade，斷言該忽略檔案在跑完後逐位元組不變，且 README.md 確實被寫入。 | Error: ENOENT: no such file or directory, open '.../create-wxl-range-repo-.../.create-wxl-upgrade-tmp-README.md' at test/upgrade-merge.test.mjs:680:14 |
| item7-P8 | create-wxl/test/upgrade-links.test.mjs describe('a symbolic link to a socket is never read (stage 6 review, P8)')：tracked 的符號連結指向靶場外一個 Unix domain socket，base/target 在該路徑有不同內容，斷言 exit 0、UP-A7、連結本身維持不動、未讀到崩潰。 | AssertionError: expected 1 to be +0 at test/upgrade-links.test.mjs:193:24（以除錯腳本重現實際 stderr：`UP-E11: planning the merge failed at "link-to-socket.txt": "Unknown system error -102..."`） |
| item8-P9 | create-wxl/test/upgrade-merge.test.mjs describe('binary decided per path, across all three sides (stage 6 review, P9)') + 新分支 'P9-binary-any-side'（upgrade-fixtures.mjs）：o 為 CRLF 文字、b 為同文字的 LF、t 為含 NUL 的二進位，斷言 o 保持不動並列出 UP-A2。 | AssertionError: expected 'alpha\u0000beta' to be 'alpha\r\nbeta\r\n' at test/upgrade-merge.test.mjs:642:79 |
| item9-P10 | create-wxl/test/upgrade-signals.test.mjs describe('a signal received while merge-file ran wins over its own result (stage 6 review, P10)')：runGit stub 在呼叫 merge-file 當下 emit SIGINT 並以 code:null resolve，斷言 exit 130、stderr 不含 UP-E11、檔案未變、無暫存資料夾殘留。 | AssertionError: expected 1 to be 130 at test/upgrade-signals.test.mjs:110:24 |
| item10-P12 | create-wxl/test/upgrade-merge.test.mjs describe("M10 keeps the lockfile's existing mode (stage 6 review, P12)")（非 Windows）：既有 pnpm-lock.yaml 設為 0755 後再跑 M10，斷言寫入 target 內容後 mode 仍為 0755。 | AssertionError: expected 420 to be 493 at test/upgrade-merge.test.mjs:363:79 |
| item11-S2 | create-wxl/test/upgrade-merge.test.mjs describe("the parent check's own lstat fails closed (stage 6 review, S2)")：fail-at 讓 parent check 對 M5-added 路徑的父目錄 lstat（第二次命中，排除 P-3 自己第一次的 lstat）回傳 EACCES，斷言 UP-E11 指名路徑、exit 1、未寫入。另外在 upgrade.mjs 的 hasDeployWorkflow 加上『刻意 fail-open』註解（無行為改變，核准的純文件修正）。 | AssertionError: expected '' to match /^UP-E11/m at test/upgrade-merge.test.mjs:513:35 |
| item1 - P11（range.json 寫入期間收到訊號時，暫存檔必須清除） | create-wxl/test/upgrade-signals.test.mjs:220-221 在既有 describe("SIGTERM right after range.json's own temporary file is written") 的唯一 it 內新增一行斷言：readdirSync(fixture.root) 篩出檔名以 '.create-wxl-upgrade-tmp' 開頭者，應為空陣列。 | AssertionError: expected [ Array(1) ] to deeply equal [] - Expected + Received - [] + [ + ".create-wxl-upgrade-tmp-range.json", + ] at test/upgrade-signals.test.mjs:221:29 |
| item2 - P7（range.json 的暫存檔也要唯一命名且 'wx' 獨佔建立） | create-wxl/test/upgrade-record.test.mjs 新增 it '⑤ an ignored file named exactly like range.json's old fixed temporary name is untouched; range.json is still updated; exit 0'：靶場內放一個 ignored 檔案，檔名剛好等於舊的固定暫存檔名 '.create-wxl-upgrade-tmp-range.json'，跑完整次升級後比對該檔是否 byte-identical、range.json 是否更新、exit 0。 | Error: ENOENT: no such file or directory, open '/private/var/.../create-wxl-range-repo-FJrrPP/.create-wxl-upgrade-tmp-range.json' at test/upgrade-record.test.mjs:145:14（舊的固定名稱＋預設 'w' flag 把這個既有檔案整個改寫並 rename 搬走，檔案直接消失）。 |
| item3 - P18（step 9 第一個操作之後的任何錯誤，包含非檔案系統錯誤與 range.json 的讀取/解析錯誤，都要印 UP-E09） | create-wxl/test/upgrade-failures.test.mjs 新增 describe('a non-file-system error after the first operation of step 9') 的唯一 it：fail-at 攔截 fs.rename，只在目的地檔名（basename）等於 'pnpm-lock.yaml'（排序後第二筆寫入）時丟出不帶 code 的一般 Error，斷言 UP-E09 指名該路徑、含錯誤文字、含還原指令、exit 1。 | AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E09/m - Expected: /^UP-E09/m + Received: "CW-E14: an unexpected error happened: \"boom: not a file-system error\".\n" at test/upgrade-failures.test.mjs:96:35 |
| item4 - P10（check-ignore 執行期間收到的訊號要贏過其結果的判讀） | create-wxl/test/upgrade-signals.test.mjs 新增 describe('a signal received while check-ignore ran wins over its own result') 的唯一 it：runGit stub 對 check-ignore 呼叫先 emit('SIGINT') 再以 code:null resolve，斷言 exit 130、stderr 不含 CW-E14、existing.local 內容不變、無暫存資料夾殘留。 | AssertionError: expected 1 to be 130 // Object.is equality - Expected + Received - 130 + 1 at test/upgrade-signals.test.mjs:140:24（check-ignore 回傳 code:null 被 isIgnoredPath 當成例外丟出 CW-E14，而不是先讓訊號贏）。 |
| item5 - S2（step 9 existingMode 的 lstat 只把 ENOENT 當不存在，其餘一律視為 step 9 失敗） | create-wxl/test/upgrade-merge.test.mjs 新增 describe("step 9's existingMode lstat fails closed") 的唯一 it：fail-at 攔截 lstat，只在檔名（basename）等於 'README.md'（M5-updated 分支）且是第三次命中（前兩次是 P-3/P-6 在規劃期間合法的 lstat）時丟出 EACCES，斷言 UP-E09 指名 README.md、含還原指令、exit 1。同時修正 upgrade.mjs 內原先聲稱 existingMode 已經 fail-closed 的那句註解（修正前這句話其實是錯的，修正行為後這句話才成立）。 | AssertionError: expected '' to match /^UP-E09/m - Expected: /^UP-E09/m + Received: "" at test/upgrade-merge.test.mjs:546:35（existingMode 原本任何 lstat 錯誤都吞掉當成『檔案不存在』，所以升級照常 exit 0，完全沒有錯誤輸出）。 |

The in-scope items without behaviour change (P14, P22, S3–S8, S15–S21, GLOSSARY's "attention item")
were made with the whole suite green before and after; P22's new assertion was shown red by a
temporary mutation. The executor kept the first round to the sub-cases listed, so the verifier found
P2/P11/P18, P7, P10 and S2 only partly applied (the temporary file left on a signal; range.json's
temporary name; non-file-system errors in step 9; `check-ignore` under a signal; `existingMode`'s
`lstat`); a second round, within the same approved items, applied them test-first (rows above). The
second verification left test-strength gaps only, which the main session closed: the range.json
failure case now lists the range for any `.create-wxl-upgrade-tmp` file, and the o read-error case
injects on o alone (file name and parent folder name). Both shown by mutation: removing the unlink in
`writeRangeJson`'s catch → `AssertionError: expected [ Array(1) ] to deeply equal []`
(`create-wxl/test/upgrade-failures.test.mjs`); rethrowing o's read error unwrapped →
`AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E11/m`
(`create-wxl/test/upgrade-merge.test.mjs`); each restored, sha256 equal to before.

Recorded, not changed: the exclusive creation (`'wx'`) of step 9's temporary files has no test of its
own; with unique names, a test would need an injectable name, which no approved item covers. U63's
"teacher's ignored file" is the fixture's existing ignored `scratch.local`.

Checks at `6619cd8`, macOS (darwin arm64, Node v24.13.0), 2026-11-09: `pnpm --dir create-wxl test` →
`Test Files 34 passed (34) / Tests 618 passed (618)` (create-wxl vitest in Node); `pnpm test --run` →
`Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)` (root vitest; the glossary
entry adds tests); `python3 scripts/verify-project.py` → `PASS`. U63 ticked. windows-latest: on the
pull request.

### 2026-11-09 — stage 7 security review and disposition

The project `security-review` skill ran on `git diff f0ff741...HEAD` at `b844895` (two candidate
lenses, one independent `harness-reviewer` false-positive check per candidate). Report:
`.proj.specs/0006-range-upgrade/review/security-T-0027.md`. 28 candidates; none reached the reporting
threshold. Two low true positives (04/17, `check-ignore` reads paths as pathspec magic; 06/16, writes
and deletions reach into a submodule's working tree, which the restore commands cannot undo).

The user decided on 2026-11-09:

- **Fix 04/17:** `check-ignore` reads paths literally (proposed as `--literal-pathspecs`; applied as
  `./<path>`, see below); sub-case: an upstream path `:Zone.Identifier`
  under a teacher's rule `*:Zone.Identifier` → UP-A9 (skipped on win32, whose file names cannot hold
  `:`).
- **D10 (06/16):** a path that is a submodule or lies under one is left as it is and reported UP-A14
  (pre-check P-8; traceability revision 2.5; row U64).
- **Hardening, each with a sub-case:** P-7 compares the last component after NFC normalisation and
  case folding (upstream adds `.GITIGNORE` → untouched, UP-A13); an anchor-file read error in step 8
  is UP-E11 and removes the merge-inputs directory (EIO on an anchor's second read → UP-E11, no
  entry left); step 9's temporary file names have a fixed length and no basename (an M5 write of a
  basename near NAME_MAX succeeds).
- **Open question:** a `range.json` the teacher's range ignores is still written in step 9
  (candidate 19) → OQ-026.
- **Recorded, not changed:** 01/14 (`.git` aliases on NTFS and HFS+; out of the model, and 0005's
  rule 3 gap; for the epic's chain analysis), 13/25 (bidi in R3, as 0005), 03, 05, 11/22, 12.

### 2026-11-09 — stage 7 fixes applied

Applied test-first; macOS (darwin arm64, Node v24.13.0), git 2.54.0; surface: create-wxl vitest in
Node. The executor first returned an increment plan (the two-step handoff), which the main session
confirmed, allowing two mechanical follow-ups in T-0027's own tests (a `check-ignore` stub match, the
signal test's temporary-name pattern) and a separate `git ls-files -s -z` call for gitlinks.

| Item | Test | Red observed |
|---|---|---|
| check-ignore reads paths literally | `create-wxl/test/upgrade-ignored.test.mjs`, "P-5 reads a path literally" (skipped on win32: `:` cannot be in a Windows file name) | `AssertionError: expected [ '.git', '.gitignore', …(2) ] to not include ':Zone.Identifier'` (`upgrade-ignored.test.mjs:265`) |
| D10, P-8, UP-A14 (U64) | `create-wxl/test/upgrade-submodule.test.mjs`, a real `git submodule add` | `Error: ENOENT: no such file or directory, open '…/sub/kept.txt'` (`upgrade-submodule.test.mjs:96`): M6 deleted the submodule's own file |
| P-7 folding | `upgrade-ignored.test.mjs`, "P-7 folding (D9)" | `AssertionError: promise resolved "Buffer[ 117, 112, 115, 116, 114, …(-83) ]" instead of rejecting` (`upgrade-ignored.test.mjs:163`): `sub/.GITIGNORE` written |
| anchor read error → UP-E11 | `create-wxl/test/upgrade-merge.test.mjs`, "an anchor file read error" | `AssertionError: expected 'CW-E14: an unexpected error happened:…' to match /^UP-E11/m` (`upgrade-merge.test.mjs:700`) |
| fixed-length temporary names | `upgrade-merge.test.mjs`, "step 9's own temporary file", a 240-byte basename via a pax header | `UP-E09 … ENAMETOOLONG: name too long, open '…/.create-wxl-upgrade-tmp-59a6eb276b92a71a-aaaa….txt'`; vitest: `expected 1 to be +0` (`upgrade-merge.test.mjs:858`) |

The approved `--literal-pathspecs` does not work: `git --literal-pathspecs check-ignore` exits 128
("pathspec magic not supported by this command: 'literal'") for every path, a plain one included
(git 2.54.0). The main session checked an equivalent and applied it: each path is given as
`./<path>`, which `check-ignore` reads literally (`:Zone.Identifier` → 0, `:(glob)a` → 1 instead of
exit 128). The approved behaviour is unchanged; traceability's "ignored path" row, the stage 7 report
and the disposition above now say so. U64's row is corrected too: right after a run `git status` is
never empty (`range.json` is rewritten), so the row asks for no status line for the submodule after
the run and an empty status after the restore commands.

An independent read-only verifier passed all five items (each test fails if its fix is reverted) and
every guard. Checks, macOS (darwin arm64, Node v24.13.0), 2026-11-09: `pnpm --dir create-wxl test` →
`Test Files 35 passed (35) / Tests 623 passed (623)` (create-wxl vitest in Node); `pnpm test --run` →
`Test Files 136 passed (136) / Tests 4861 passed | 1 skipped (4862)`; `python3 scripts/verify-project.py`
→ `PASS`. windows-latest: on the pull request.

