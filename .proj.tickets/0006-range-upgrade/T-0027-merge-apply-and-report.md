---
id: T-0027
title: Three-way merge, apply and the upgrade report
epic: 0006-range-upgrade
status: todo
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
2026-10-16, Q2 option A).

Spec: `.proj.specs/0006-range-upgrade/traceability.md` revision 2, seams 0006-S1, 0006-S2; "Step order"
8–10, "Pre-checks", "Merge table", "Fork:init-derived content", "`range.json` after the plan", "Report",
"Stage 8 simulation".

## Deliverable

`pnpm range:upgrade` on a teacher's range takes in upstream's changes, keeps the teacher's where unsure,
marks text conflicts with three labels, lists every attention item, exits 0, and can be undone exactly
with `git clean -fd` then `git checkout -- .`.

## Acceptance criteria

- [ ] U17: one fixture path per branch of P-2, M4–M12 → each as its row states; R2 counts and R3 lines exactly those (AC-6)
- [ ] U18: M12 with changes in different lines → merged, updated (AC-6)
- [ ] U19: M12 overlapping, global `merge.conflictStyle=merge` → `<<<<<<< range`, `||||||| <base version>`, `=======`, `>>>>>>> <target version>`; UP-A1 (AC-6)
- [ ] U20: tracked symlink, file under a symlinked directory, ignored symlink → untouched, UP-A7, link target unchanged in content and modification time (AC-7)
- [ ] U21: a teacher's own file → untouched, unreported (AC-6)
- [ ] U22: ignored file with o ≡ b that T changes; T adds an ignored path → untouched, UP-A9 each (AC-8)
- [ ] U23: new executable in T → mode 0755 (umask 022), skipped on Windows (AC-6)
- [ ] U24: after a completed run → `upstream` = target, other keys deep-equal and in order, created when absent, untouched after UP-E09 (AC-9)
- [ ] U25: attention empty / non-empty → exit 0 / 0 (AC-10)
- [ ] U26: U17's run → R1–R5 in order with ids, in the run's language; every UP code in both tables (AC-10)
- [ ] U27: `fs.rename` fails on the 2nd write → UP-E09 naming the path, exit 1; the restore commands give an empty status and `HEAD`'s files (AC-11)
- [ ] U28: `SIGINT` at step 7; `SIGTERM` during step 9 → exit 130; nothing written / UP-E09 with the signal; no temporary directory left (AC-11)
- [ ] U29: after U17's run, the restore commands → empty status, `HEAD`'s files, ignored files byte-identical (AC-11)
- [ ] U32: stage 8 simulation A → B exactly as listed (AC-13)
- [ ] U53: case-only rename → both untouched, UP-A8 each (AC-6)
- [ ] U54: file → directory and directory → file swaps → as the row states (AC-6)
- [ ] U55: directory where b and t are files; T adds `a/x` over a kept file `a` → untouched, UP-A10 (AC-6)
- [ ] U56: o differs from b only by CRLF, t changed → M5, t written (AC-6)
- [ ] U57: `git merge-file` exits 255 → UP-E11, nothing written (AC-6)
- [ ] U58: clean merge of `package.json` to invalid JSON → o kept, UP-A11 (AC-6)
- [ ] U59: an anchor file with b ≢ t / none → UP-A12 present / absent (AC-10)
- [ ] U60: a tracked hard link to an outside file written by M5 → the outside file unchanged (AC-7)
- [ ] U61: upgrade, commit, upgrade again → UP-I01 (AC-4)
- [ ] U62: a path with an ANSI escape in T → printed as an escaped JSON literal (AC-10)

## 給使用者（zh-TW）

0006 的核心：三方合併 base、老師的靶場與 target。上游改了而老師沒改的就更新；兩邊都改的文字檔用 `--diff3` 標出衝突；拿不準時保留老師的版本並列入注意清單。不 commit，結束碼 0，報告列出計數、注意項目與下一步；`git clean -fd` 加 `git checkout -- .` 可完整還原。第 8 階段用兩個推上去的 commit 實際升級一次。23:59 前沒落地就改 pending。

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
