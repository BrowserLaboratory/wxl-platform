---
id: T-0024
title: Failures, signals, language and escaping
epic: 0005-create-wxl
status: done
blocked_by: [T-0023]
---

## Context

The robustness layer over the whole `run`: rollback when moving into place fails, the step-10 recheck
against another process, file-system errors in steps 8–9, the three signals in every window (including
Ctrl-C at a question), unexpected errors, the language rule with both message tables, and the escaping
of every value from outside. Its guarantee is the write scope: nothing outside the target and the run's
own temporary directory is ever touched.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Step order" 8–10,
"Writes and cleanup", "Signals", "Language", "Error and warning codes".

## Deliverable

Every failure or signal leaves the target as it was (steps 1–10) or keeps the range and prints the
remaining commands (after step 10); output is in the selected language with the same message ids in
both tables; outside values are printed escaped, and copyable commands are quoted or withheld.

## Acceptance criteria

- [x] C30: `fs.rename` fails on the 3rd entry → CW-E11, entries 1–2 moved back, target empty, temporary directory removed (AC-10)
- [x] C31: `SIGINT` at steps 4, 6, 8, 9 and during the 2nd move of step 10 → exit 130, target as before, temporary directory removed or never created (AC-13)
- [x] C41: each language case of the row → zh-TW / zh-TW / en / zh-TW / en / CW-E02 in en; both tables have the same ids, texts differ outside commands, paths and codes (AC-18)
- [x] C53: another process creates a file or non-empty directory at the target before step 10 → CW-E04, temporary directory removed, their target untouched; an empty directory → accepted (AC-10)
- [x] C54: `mkdtemp`, an entry write, the `range.json` write, or a `package.json` read fails → CW-E09, target unchanged, temporary directory removed (AC-10)
- [x] C56: `SIGTERM` at step 9, `SIGHUP` at step 12, `SIGINT` at step 11 and at a question, a second `SIGINT` during cleanup → as the row states (AC-13)
- [x] C57: `parseForkInitArgs` throws a plain `Error`; `fs.readdir` throws at step 4 → CW-E14, nothing written, exit 1 (AC-13)
- [x] C60: each escaping case of the row → JSON literals with `\u001b`, `\n`, `\u007f`; `cd ./-x`; `cd 'my range'`; N1 withheld for a control character (AC-24)
- [x] C65: rename fails on the 3rd entry and again moving back the 2nd → CW-E11 naming the 2nd entry and the kept temporary directory, exit 1 (AC-10)
- [x] C69: a full interactive run with a recording `fs` → every path written, renamed or removed is under the target or the run's temporary directory (AC-10)

## 給使用者（zh-TW）

把 create-wxl 的失敗處理補齊：搬移失敗會搬回、其他程式搶先建立目標會停下、Ctrl-C 等三種訊號在每個步驟都有明確結果；中英文訊息表同一組 id；外來的值一律跳脫，可複製的指令會加引號，含控制字元時不印。保證只動目標資料夾和自己的暫存目錄。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Drafted by a workflow (one drafting agent, one independent checker that corrected 14 problems) and approved by the user on 2026-10-16 together with T-0020–T-0025 and decisions D1–D12, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S1 | step 10 逐項搬移時第 3 個 entry 的 `rename` 失敗：已搬的第 1、2 個 entry 搬回暫存目錄、刪除暫存目錄，目標回到原本的空目錄，報 CW-E11 | `create-wxl/test/failures.test`（副檔名依 T-0020）describe「step 10 rollback」：目標為既有空目錄；fixture archive 通過 P1–P3，解壓後至少 5 個頂層 entry（`.proj.specs`、`CHANGELOG.md`、`package.json`、`range.json` 與其他）；`deps.fs` 為記錄器包裝的 `node:fs/promises`，`rename` 在「來源位於暫存目錄」的第 3 次呼叫丟出注入錯誤（`code: 'EPERM'`，message 含 `EPERM`）；父目錄預先放哨兵 `.create-wxl-sentinel/`；`--no-setup`、非互動 | C30 / AC-10 | 第 1、2 個 entry 取自記錄器的前兩次正向 `rename`（不寫死名稱）；失敗後記錄器有這兩個 entry 從目標搬回暫存目錄的 `rename`（只比對集合，不比對順序）；結束時目標仍存在且 `readdir(target)` 為 `[]`；父目錄除哨兵外沒有 `.create-wxl-*`，哨兵仍在（依路徑刪除，不依 pattern）；stderr 以 `CW-E11` 開頭，含目標路徑與 `EPERM`；exit 1。預期紅燈：沒有搬回時 `readdir(target)` 有兩個 entry（`expected [ … ] to deeply equal []`），或錯誤變成未處理的 rejection／沒有 CW-E11 |
| 0005-S1 | 第 3 個 entry 搬移失敗後，搬回第 2 個時又失敗：CW-E11 點名留在目標的第 2 個 entry，並保留、點名暫存目錄 | 同上 describe：`rename` 在第 3 次正向呼叫，以及第 2 個 entry 從目標搬回暫存目錄的那次呼叫，都丟出注入錯誤 | C65 / AC-10 | stderr 以 `CW-E11` 開頭，含第 2 個 entry 的名稱與暫存目錄路徑；暫存目錄仍存在，內有第 1 個 entry 與第 3 個起的 entry（不論搬回順序，第 1 個仍會被搬回）；`readdir(target)` 恰為第 2 個 entry；記錄器沒有刪除暫存目錄的呼叫（`rm`／`rmdir`）；exit 1。預期紅燈：C30 綠燈後，實作仍刪除暫存目錄（暫存目錄存在檢查得到 `expected false to be true`），或訊息沒點名第 2 個 entry |
| 0005-S1 | 另一個程式在 step 4 之後於目標建立檔案或非空目錄：step 10 重查報 CW-E04，不動對方的東西；建立的是空目錄則逐項搬入 | `failures.test` describe「step 10 recheck」：目標起初不存在；`deps.checkpoint` 在 `step-10` 時於目標建立（a）檔案 `x`、（b）含 `child` 檔案的目錄、（c）空目錄；`it.each` 三種；記錄器包裝 `deps.fs`；`--no-setup`、非互動 | C53 / AC-10 | （a）（b）：stderr 以 `CW-E04` 開頭，含解析後的目標路徑與失敗條件；`x`／`child` 內容 byte-identical，（b）的 `readdir(target)` 恰為 `['child']`；父目錄除哨兵外沒有 `.create-wxl-*`；exit 1。（c）：exit 0；記錄器有逐項的 `rename(tmp/<entry>, target/<entry>)`，沒有 `rename(tmp, target)`；目標內為完整範圍（含 `range.json`）；暫存目錄已刪。預期紅燈：沒有重查時，（a）（b）的 `rename(tmp, target)` 以 `ENOTDIR`／`ENOTEMPTY` 失敗，得到的不是 `CW-E04`；（c）若實作沿用 step 4 的判斷（目標不存在），會整個 rename 暫存目錄，逐項搬移的斷言失敗；若 T-0020 在 step 10 已依當下狀態選擇搬法，可能直接綠燈，照實記錄 |
| 0005-S1 | 步驟 8–9 的檔案系統錯誤一律 CW-E09：`mkdtemp`、寫入 entry、寫入 `range.json`、讀 `package.json` 失敗時，目標不變、暫存目錄刪除 | `failures.test` describe「steps 8–9 file-system errors」：`it.each` 四種注入，錯誤的 message 都含錯誤碼——`mkdtemp` 丟 `EACCES`；寫入第 2 個檔案 entry 的函式（T-0020 實際用的 `writeFile` 或 `open`）丟 `EIO`；寫入暫存目錄下 `range.json` 丟 `EIO`；`readFile` 讀暫存目錄下 `package.json` 丟 `EACCES`；目標不存在；父目錄有哨兵；`--no-setup`、非互動 | C54 / AC-10 | 四種皆：stderr 以 `CW-E09` 開頭，含該錯誤碼，以及路徑（`mkdtemp` 為父目錄路徑，其餘為該檔案路徑）；目標仍不存在；父目錄只剩哨兵（`mkdtemp` 失敗時暫存目錄從未建立）；exit 1。`package.json` 的 `EACCES` 是 CW-E09，不是 CW-E10。預期紅燈：讀取錯誤被當成「檔案不存在」而得到 `CW-E10`，或寫入錯誤沒有被歸為 CW-E09、暫存目錄殘留 |
| 0005-S1 | `SIGINT` 在步驟 4、6、8、9 的 checkpoint 發出：exit 130，目標維持原狀，暫存目錄已刪（step 9）或從未建立（steps 4、6、8） | `create-wxl/test/signals.test` describe「SIGINT in steps 3–10」：`deps.signals` 為 `EventEmitter`；`deps.checkpoint(name)` 在指定的 `step-4`／`step-6`／`step-8`／`step-9` 時 `emit('SIGINT')`；`it.each` 四個步驟；目標不存在；記錄器包裝 `deps.fs`；`fetchArchive` 為記錄呼叫的 stub；`--no-setup`、非互動 | C31 / AC-13 | 四步皆 exit 130；目標不存在；父目錄除哨兵外沒有 `.create-wxl-*`。step 4、6：`fetchArchive` 未被呼叫（訊號後「stop」，而 checkpoint 在步驟開頭）；記錄器沒有 `mkdtemp` 或任何寫入呼叫。step 8：沒有 `mkdtemp` 呼叫（訊號後不再開始新的檔案系統操作）。step 9：暫存目錄曾建立，結束時已刪除。預期紅燈：沒有訊號處理時 run 照常完成，`expected 0 to be 130` |
| 0005-S1 | `SIGINT` 在 step 10 第 2 個 entry 搬移進行中發出：等該 `rename` 完成才清理，搬回第 1、2 個 entry、刪除暫存目錄，exit 130 | `signals.test` 同 describe：目標為既有空目錄；包裝的 `rename` 在第 2 次正向呼叫時先 `emit('SIGINT')`，再委派給真的 `rename` | C31 / AC-13 | 記錄器沒有第 3 次正向 `rename`；第 1、2 個 entry 都被搬回（第 2 個是進行中的操作，完成後才搬回）；目標存在且 `readdir(target)` 為 `[]`；暫存目錄已刪；exit 130。預期紅燈：沒有處理時全部 entry 搬完、exit 0 |
| 0005-S1 | `SIGTERM` 在 step 9 的效果與 `SIGINT` 相同；step 9 清理途中的第二個 `SIGINT` 被忽略 | `signals.test` describe「other signals」：（a）checkpoint `step-9` 發 `SIGTERM`；（b）checkpoint `step-9` 發 `SIGINT`，包裝的 `rm`／`rmdir` 在刪暫存目錄時先再發一次 `SIGINT`，再委派；目標不存在；記錄器包裝 `deps.fs`；`--no-setup`、非互動 | C56 / AC-13 | （a）exit 130、目標不存在、暫存目錄已刪。（b）run resolve 為 130（不 reject，沒有 unhandled rejection）；暫存目錄已刪；記錄器對暫存目錄的刪除呼叫恰好 1 次；stderr 沒有 `CW-E14`。預期紅燈：（a）只註冊 `SIGINT` 時 exit 0；（b）第二個訊號再啟動一次清理，刪除呼叫 2 次（`expected 2 to be 1`），或第二次刪除的 `ENOENT` 變成 CW-E14。若 C31 的實作已防重入，（b）可能直接綠燈，照實記錄 |
| 0005-S1 | `SIGINT` 在 step 11 開頭：不跑引擎，印 CW-W05 與 CW-E12 的收尾指令，靶場與 `range.json` 保留，exit 130 | `signals.test` describe「signals after step 10」：非互動、帶 setup 旗標（`--author Ada --repo alice/r --host github-pages`）；`deps.engine` 用 `scripts/fork-init.ts` 真的 `parseForkInitArgs`、`deriveGithubPagesOrigin`、`ForkInitArgError`、`UPSTREAM_SLUG`，`runForkInit` 換成記錄呼叫的 stub；checkpoint `step-11` 發 `SIGINT`；`runGit` 為記錄呼叫的 stub | C56 / AC-13 | exit 130；`runForkInit` 與 `runGit` 都沒被呼叫；輸出含 `CW-W05`，其後依序是 T-0022 的 CW-E12 收尾指令：`cd <directory>`、`pnpm install`、`pnpm fork:init --author=Ada --repo=alice/r --host=github-pages`、`git init`、`git symbolic-ref HEAD refs/heads/main`、`git add -A`、`git commit -m "Create range from WXL <V>"`（V 代入 `packageVersion`；印出形式沿用 T-0022／T-0023 的實作）；目標內有靶場與 `range.json`。預期紅燈：沒有 step 11 的處理時引擎照跑（stub 被呼叫 1 次）、exit 0 |
| 0005-S1 | `SIGHUP` 在 step 12 開頭：不跑 git，CW-W05 列出剩下 git 指令的印出形式，靶場保留，exit 130 | `signals.test` 同 describe：同上的非互動 setup 與 engine stub（`runForkInit` 回傳 `exitCode: 0`、`warnings: []` 的 `ForkInitResult`）；checkpoint `step-12` 發 `SIGHUP`；`runGit` 為記錄呼叫的 stub | C56 / AC-13 | exit 130；`runForkInit` 呼叫 1 次；`runGit` 0 次（含 G0）；CW-W05 依序含 `git init`、`git symbolic-ref HEAD refs/heads/main`、`git add -A`、`git commit -m "Create range from WXL <V>"`，都不帶 `--force`；目標有 `range.json`。預期紅燈：git 步驟照跑（`runGit` 呼叫數 > 0）、exit 0 |
| 0005-S1 | G2 執行中收到 `SIGHUP`、G2 以非零結束：算訊號而不是 CW-W03，不再跑 G3、G4，exit 130 | `signals.test` describe「signals after step 10」：同上的非互動 setup 與 engine stub；`runGit` stub 依指令回應——G0 回 `git version 2.40.0`、G1 exit 0；收到 G2（`add -A --force`）時先 `emit('SIGHUP')`，再 resolve `{ code: 1, stdout: '', stderr: 'x' }` | Signals 固定清單「a git command that exits non-zero after a signal counts as the signal」/ AC-13 | exit 130；輸出沒有 `CW-W03`，有 `CW-W05`，CW-W05 含 `git commit -m "Create range from WXL <V>"`；`runGit` 沒有 G3、G4 的呼叫。CW-W05 是否列出已執行但失敗的 `git add -A`，本計畫不斷言。預期紅燈：G2 的 exit 1 被當成 CW-W03、run exit 0 |
| 0005-S1 | `SIGINT` 在 step 13 開頭：CW-W05 說明沒有剩下的指令，exit 130；寫訊息時出錯不影響結束 | `signals.test` describe「signals after step 10」：同上的非互動 setup、engine stub，`runGit` 依指令回應成功（G0 版本、G3 回 `Ada`／`ada@example.com`）；checkpoint `step-13` 發 `SIGINT`。（b）同一情境，但 `io.stdout`、`io.stderr` 換成 write callback 一律回傳錯誤的 `Writable` | Signals 固定清單（step 13 時窗、「errors writing the messages are ignored」）/ AC-13 | （a）exit 130；輸出含 `CW-W05`，其後沒有 `git `、`pnpm ` 開頭的指令行；`runGit` 的呼叫與沒有訊號時相同（G0–G4 皆已執行）。（b）run resolve 為 130，沒有 rejection 或 unhandled error。下一步 N3–N7 是否印出，本計畫不斷言。預期紅燈：沒有 step 13 的處理時照常印完下一步、exit 0；（b）串流錯誤造成 rejection |
| 0005-S1 | 互動模式在問題時按 Ctrl-C（`question` checkpoint 發 `SIGINT`）：run 結束、exit 130、什麼都沒寫 | `signals.test` describe「SIGINT at a question」：`io.interactive: true`、`io.stdin` 為不結束的 `PassThrough`；沒有位置參數；`deps.checkpoint('question')` 第一次呼叫時 `emit('SIGINT')`；記錄器包裝 `deps.fs`；測試逾時設 5 秒 | C56 / AC-13 | exit 130；`fetchArchive` 沒被呼叫；記錄器沒有任何寫入或 `mkdtemp`；父目錄的 listing 不變；stdin 沒送 EOF 也會結束。預期紅燈：readline 一直等待輸入，測試以 timeout 失敗 |
| 0005-S1 | 非 CW 碼的錯誤（bug）報 CW-E14 並帶錯誤訊息、exit 1、什麼都沒寫：`parseForkInitArgs` 丟一般 `Error`，或 step 4 的 `fs.readdir` 丟非預期錯誤 | `failures.test` describe「unexpected errors」：（a）非互動、帶 setup 旗標，`deps.engine.parseForkInitArgs` 換成丟 `new Error('kaboom')`（`ForkInitArgError` 保留真的類別）；（b）目標為既有空目錄、`--no-setup`，包裝的 `readdir` 對目標丟沒有 `code` 的 `new Error('boom')`；記錄器包裝 `deps.fs` | C57 / AC-13 | （a）stderr 以 `CW-E14` 開頭並含 `kaboom`，不是 `CW-E06`；（b）stderr 以 `CW-E14` 開頭並含 `boom`，不是 `CW-E04`。兩者皆 exit 1；`fetchArchive` 沒被呼叫；沒有 `mkdtemp` 或寫入；目標維持原狀（（b）仍為空目錄）。預期紅燈：（a）任何丟出的錯誤都被當成引擎拒絕而得到 `CW-E06`；（b）得到 `CW-E04` 或未處理的 rejection |
| 0005-S1 | 語言選擇規則：matrix 的六個情況，加上 AC-18 的 CW-E01 只依環境，另有兩個順序的額外案例 | `create-wxl/test/language.test` describe「language selection」：`it.each`，非互動、沒有目錄的 run（得到 CW-E03）；CW-E01 的案例用 `nodeVersion: '22.5.0'`；判斷語言的方式：輸出去掉 `CW-[EW]\d\d` 代碼後含 CJK 字元為 zh-TW，不含為 en | C41 / AC-18 | matrix：`--lang zh-TW`（env 空、locale `en-US`）→ zh-TW；`LC_ALL=zh_TW.UTF-8`（locale `en-US`）→ zh-TW；`LANG=en_US`（locale `zh-Hant-TW`）→ en；env 全未設、locale `zh-Hant-TW` → zh-TW；`LANG=C`（locale `zh-Hant-TW`）→ en；`--lang zh-TW --bogus`、`LANG=en_US` → `CW-E02` 且為 en。AC-18：`--lang zh-TW`、`nodeVersion 22.5.0`、`LANG=en_US` → `CW-E01` 且為 en。額外：`--lang zh-TW`、`LANG=en_US` → zh-TW；`LC_ALL=''`、`LC_MESSAGES=zh_TW`、`LANG=en_US` → zh-TW（空值視為未設）。預期紅燈：若 T-0020 已實作這套規則可能直接綠燈；否則 `--lang`、空值或 `LANG=C` 的情況語言錯（CJK 檢查 `expected true to be false`），或 CW-E01／CW-E02 套用了 `--lang` |
| 0005-S1 | 兩份訊息表的 id 集合相同；每個 zh-TW 文字在命令、路徑、代碼之外與 en 不同；每個 CW 訊息以其代碼開頭 | `language.test` describe「message tables」：import T-0020 的訊息表模組（見 open questions）；比較前移除 `CW-[EW]\d\d` 代碼、placeholder、反引號內的命令與路徑、URL。另加一道 S1 側的檢查：本 ticket 各測試的 stdout／stderr 裡，含 CW 代碼的行一律以代碼開頭 | C41 / AC-18 | `Object.keys(en)` 排序後等於 `Object.keys(zhTW)`；每個 id 移除上述部分後，兩邊皆非空且不相等；CW-E01–E15、CW-W01–W05 在兩份表中各有一則以該代碼開頭的文字（依 Notes 對表格形狀的假設）；本 ticket 新增的 CW-E11、CW-E14、CW-W05 等 id 兩份表都有。預期紅燈：新 id 只加在一份表時 `expected [...] to deeply equal [...]`；模組沒有匯出時 import 失敗 |
| 0005-S1 | 外來的值以 JSON string literal 印出，C0、DEL、C1 跳脫：archive entry 路徑含 ESC、未知參數含換行（另加 C1 字元）、`CREATE_WXL_COMMIT` 含 DEL | `create-wxl/test/escaping.test` describe「JSON string literals」：（a）T-0021 的 archive builder 產生含 ESC 的 entry 路徑；（b）`run(['--a\nb', 'dir'])` 與 `run(['--a\u009bb', 'dir'])`；（c）`deps.env.CREATE_WXL_COMMIT = 'abc\u007f'`；皆非互動 | C60 / AC-24 | （a）`CW-E08`，stderr 含 `\u001b`，不含原始 ESC；（b）`CW-E02`，stderr 含 `"--a\nb"`（反斜線加 n，依 matrix；與 Fixed list 的 `\uXXXX` 寫法衝突，見 open questions）與 `\u009b`（C1，依 Fixed list），值本身不含原始換行或 U+009B；（c）`CW-E02` 點名 `CREATE_WXL_COMMIT`，含 `\u007f`，不含原始 DEL；三者 stdout＋stderr 除 LF 外沒有 C0、DEL、C1 字元。預期紅燈：以 `JSON.stringify` 印值時 DEL 與 C1 不會被跳脫，`expected '...' to contain '\\u007f'`；（a）用 `JSON.stringify` 已會跳脫 ESC，可能直接綠燈，照實記錄 |
| 0005-S1 | 可複製的指令用 POSIX 引號：N1 對 `-x` 印 `cd ./-x`、對 `my range` 印 `cd 'my range'`；值含控制字元時不印 N1，改為說明並顯示跳脫後的值 | `escaping.test` describe「copyable commands」：`--no-setup`、非互動、`deps.cwd` 為測試的父目錄；`run(['--no-setup', '--', '-x'])`、`run(['--no-setup', 'my range'])`、`run(['--no-setup', "a'b"])`、`run(['--no-setup', 'r\x1bx'])`；含 ESC 的目錄名稱在 Windows 略過 | C60 / AC-24 | `-x` → 有一行 `cd ./-x`；`my range` → `cd 'my range'`；額外：`a'b` → `cd 'a'\''b'`（Fixed list 的 `'` 規則）；`r\x1bx` → exit 0，沒有以 `cd ` 開頭的 N1 指令行，訊息說明值含控制字元並顯示 `"r\u001bx"`，輸出不含原始 ESC，N8 照印。預期紅燈：沒加引號時印出 `cd -x`／`cd my range`，或含 ESC 的 N1 原樣印出 |
| 0005-S1 | 完整互動 run 的寫入範圍：每個寫入、rename、刪除的路徑都在目標或本次的暫存目錄之下 | `create-wxl/test/write-scope.test`：`io.interactive: true`，stdin 依序送目錄、S1–S5、S6 `y`；沒有位置參數；真的引擎（`scripts/fork-init.ts`）配 T-0022 能通過 A1、A6–A8 的 fixture archive；`runGit` stub 依指令回應（G0 回 `git version 2.40.0`，G3 回 `Ada`／`ada@example.com`，其他回空字串，皆 exit 0）；`deps.fs` 的每個函式都由記錄器包裝；父目錄有哨兵目錄與哨兵檔案 | C69 / AC-10 | 記錄器裡每個寫入類呼叫（`mkdir`、`writeFile`／以寫入模式 `open`、`chmod`、`rename` 的來源與目的、`rm`、`rmdir`、`unlink`）的路徑，解析後都在目標或 `mkdtemp` 回傳的目錄之下；`mkdtemp` 的前綴為 `<父目錄>/.create-wxl-`；結束時父目錄只多了目標，哨兵 byte-identical；exit 0。預期紅燈：實作正確時可能直接綠燈，照實記為 no red；寫到別處時 `expected '<path>' to start with '<target>'` |

**Notes**

- 覆寫的既有測試：repository 目前沒有 `create-wxl/`，T-0020–T-0023 的測試在 T-0024 開工時才會存在；`tests/unit/scripts/fork-init.test.ts` 與 `upstream-guard.test.ts` 不動。可能需要覆寫的有：T-0020–T-0023 的測試若以 `toContain` 比對原始值（尤其含特殊字元的值）、比對沒加引號的 N1／CW-E12／N2 指令（例如帶空白的 `--site-name=S8 GH` 會變成單引號包住的一個字）、比對整段 stderr，或在本 ticket 的語言規則會選 zh-TW 的 env／locale 下斷言英文文字；共用的 deps helper 若沒提供 `EventEmitter` 型的 `deps.signals` 與 no-op 的 `checkpoint`，也要調整。開始實作時逐一列出，每項都視為需要使用者核准的覆寫。
- 要建的 fixture：測試內建的 tar.gz archive，沿用 T-0021 的 builder（entry 清單加 pax global `comment` = commit；第一個路徑元件為 `<name>-<commit>`，`name` 取自 `UPSTREAM_SLUG.split('/')[1]`，不直接寫出 slug）。內容要通過 P1–P3，並至少有 5 個頂層 entry，供逐項搬移與第 3 個失敗使用。含 ESC 的 entry 路徑用 `tar` 的 `Header` 寫原始 header。C69 用 T-0022 能讓真引擎通過 A1、A6–A8 的 fixture。另需：可依函式名稱、路徑條件、第 N 次呼叫注入失敗的 `deps.fs` 包裝器（兼記錄器）；作為 `deps.signals` 的 `EventEmitter`；會發訊號或建立檔案的 `deps.checkpoint`；`PassThrough` stdin；依指令回應的 `runGit` stub；回傳 `ForkInitResult` 形狀的 `runForkInit` stub；會回報錯誤的 `Writable`；每個測試自己 `mkdtemp` 的父目錄，內放哨兵 `.create-wxl-sentinel/`，用來驗證暫存目錄是依路徑刪除、不是依 pattern。
- 對前面 ticket 的假設：T-0020 匯出 `run(argv, io, deps)`；steps 1–4、6–10、13 的檔案系統操作全走 `deps.fs`（`mkdtemp`、`mkdir`、`writeFile`／`open`、`readFile`、`rename`、`rm`／`rmdir`、`chmod`、`lstat`、`stat`、`readdir`、`access`）；通過 C50 的有效 `deps.source`（`engineSha256` 對應測試用的引擎檔）由 T-0020 的測試 helper 提供；T-0020 的 en 與 zh-TW 訊息表放在可 import 的模組，以 id 為 key，CW 訊息的 id 可以對應到它的代碼（若形狀不同，表格檢查改依實際形狀找出 CW 訊息）。T-0021 提供 archive builder 與規則 3 的 ESC 拒絕。T-0022 提供 step 3、5、11、互動問題、CW-E12 的收尾指令與真引擎 fixture；T-0023 提供 G0–G4 的印出形式與 N2。`checkpoint('step-N')` 與 `checkpoint('question')` 的呼叫是 seam 定義的一部分；早期 ticket 若還沒在步驟開頭呼叫，由 T-0024 補上（它是第一個用到的 ticket）。注入失敗時鎖定 T-0020 實際使用的函式名稱。
- 計畫刻意不斷言的事（spec 沒規定，不自己加需求）：step 10 的「sorted order」用哪種比較方式（第 1、2 個 entry 從記錄器取得）；搬回的先後順序；step 3–10 被訊號中斷時是否印訊息；step 11、12 的 CW-W05 之後是否還印 N1／N2；step 13 被中斷時是否還印 N3–N7；G2 在訊號後以非零結束時，CW-W05 是否列出 `git add -A`；檔案系統錯誤訊息是否以 JSON literal 呈現（Fixed list 的「外來值」不含它，C57 只斷言子字串）；CW-E09 以外的 `readdir` 錯誤碼怎麼分類（C57 用沒有 `code` 的 `Error`）。
- Signals 固定清單裡沒有 matrix 列的三條規則（step 13 的時窗、訊號後 git 以非零結束算訊號、寫訊息出錯一律忽略），屬於 ticket 引用的「Signals」以及 AC-13 的 steps 11–13，也沒有其他 ticket 認領，所以本計畫加了兩列涵蓋，criteria 記為 AC-13；claimed rows 不變。
- 平台略過：本計畫不設父目錄唯讀，也不檢查 mode，`EACCES` 都是注入的；只有 C60 含 ESC 的目錄名稱在 Windows 略過。這些測試不跑真的 git，所以不需要隔離 `HOME`、`PATH`、`XDG_CONFIG_HOME`；若之後改用真的 git，就把 `deps.env` 設為指向暫存目錄的 `{ HOME, PATH, XDG_CONFIG_HOME }`。
- C69 的範圍：記錄器只看得到 `deps.fs`。真引擎從 `node:fs` 匯入同步函式（`scripts/fork-init.ts` 第 61–72 行），`runForkInit` 也是同步的（第 1094 行），直接寫入 `projectRoot`，這部分靠 0004 的契約保證。本計畫另外比對父目錄在執行前後的 listing 與哨兵，補上引擎那一側的檢查。
- 第 8 階段的驗證面：create-wxl 的 vitest 在 Node 裡跑 0005-S1（`pnpm --dir create-wxl test`），不經過瀏覽器或 terminal。T-0024 時還沒有 `dist/`（`prepareDist` 屬 T-0025），pack 出來的 `bin` 會因 CW-E13 拒絕執行，所以做不了 0005-S4。`bin` 在 `process` 上註冊訊號、把 readline 的 `SIGINT` 轉給同一個處理器，由 T-0025 的 run Ib 驗證（在 S1 按 Ctrl-C → exit 130、沒有 `s8-int`、沒有 `.create-wxl-*`）。T-0024 的第 8 階段暫記為這些測試的執行紀錄（見 open questions）。

**Decisions applying to this ticket (approved 2026-10-16)**

- D1: stage 8 is the create-wxl vitest run record (0005-S1, in-process); the terminal surface (0005-S4) runs in T-0025.
- D3: CW-E and CW-W messages go to `stderr`; next-step lines go to `stdout`; tests pin the stream.
- D9: C41 may import the message-table module directly.
- D10: C60 escapes a newline as `\n` (the matrix value; JSON short escape), other C0 as `\uXXXX`.

### 2026-10-17 — increment plan confirmed

The executor's increment plan was checked by an independent reviewer (approve with corrections). Confirmed with these corrections: a signal guard is created in `run()`, passed down, and its listeners removed in `finally`; a signal while a question is pending rejects the pending `ask()`, and readline's `SIGINT` goes to the same handler; CW-E14 is handled where `SignalAbort` is, inside `runSteps`, by window, so steps 8–10 clean up (the outer catch only covers steps 1–2); the step 8–9 catch leaves `SignalAbort` alone, takes only file-system errors carrying a string `code` as CW-E09 and the rest as CW-E14; CW-E09's path comes from one fs wrapper for all four cases (the parent directory for `mkdtemp`); each row adds only the message ids it uses (CW-E11 at R1, CW-E09 at R4, CW-W05 at R8, CW-E14 at R13), R5 registers SIGINT and the 3–10 window only, R7 (a) brings SIGTERM and SIGHUP, and rows that turn green early are recorded as no red; R10 returns `{ signal: true, remainingCommands }` and the printed forms are exported once; rollback tries every entry and collects `strandedEntries`; `moveIntoPlace` takes a `shouldStop` callback checked after each rename, shared by failure and signal rollback; R14 has nine cases and overrides `LANG` explicitly where the case needs it unset; R15's id comparison calls each message with representative arguments, and a shared "every line with a CW code starts with it" helper runs in this ticket's new tests; R18 wraps `mkdtemp` to get its result; every row asserts the approved Boundary column (R1 target still present; R2 CW-E11 and exit 1; R3 resolved path, `['child']`, no `.create-wxl-*`, the complete range for (c); R4 the second file entry; R5 no `mkdtemp` or write at steps 4 and 6; R7 (b) temporary directory removed; R8, R9 `range.json` present; R16 no raw ESC, newline or U+009B, and no C0 except LF, DEL or C1 in stdout and stderr). `DEFAULT_ORDER` in `checkpoints.mjs` is not changed; R16 (c) follows C60's own matrix and changes no existing test.

Decided under "follow the recommendations" (2026-10-17): (1) copyable commands containing a control character are not printed, each with a test added to R17; (2) `checkpoint('step-5')` and `checkpoint('step-11')` are called only when setup runs; (3) CW-E14 in steps 11–13 lists the remaining commands as CW-W05 does, exit 1; (4) R12 adds a signal while a question is pending; (5) `jsonValue` writes every C0 other than a line feed as `\uXXXX`, including `\t`, `\r`, `\b`, `\f`, and a line feed as `\n`, per D10 (wording corrected in stage 6); (6) a signal during step 8's extraction or step 9's P1–P4 stops before the next file-system operation, and a signal during step 6's download aborts the fetch. The additions in (1), (4), (5) and (6) are recorded as additions to the approved test plan table.

Started on 2026-10-17 from T-0023's branch tip while PR #29 was in CI with auto-merge on; the branch was moved onto `main` (`8fb2d34`, a soft reset to the identical tree) after #29 landed, before the first commit.

### 2026-10-17 — red → green log

**Process notes (reported to the user).** Each test was written and run before its production code. Two rows had no red of their own because the change for an earlier row already did their part: R2 (C65), since R1's rewrite of `moveIntoPlace` rolled back every entry and collected the stranded ones in one change; and decision 1's CW-E12 case, since R17's N1 change introduced the shared control-character check. R9's red was re-confirmed after correcting the test's fixture. R11 (b)'s and R18's first failures were mistakes in the tests' own assertions, fixed in the tests; they are not reds.

**Existing tests overridden (decided by the main session under the user's standing instruction of 2026-10-16, 「剩下的都先同意建議，推進實作」, "approve the recommendations for the rest and push the implementation on"; reported to the user on 2026-10-17, who may still reverse it).** Two T-0020/T-0021 tests asserted that `run()` rejects, as placeholders for this ticket's codes; they now assert the codes: `pristine.test.mjs` "CHANGELOG.md unreadable with EACCES" → CW-E09 with `EACCES`, not CW-E10 (the injected error's message now reads `EACCES: permission denied`, like a real fs error); `archive-rules.test.mjs` "a body that is not buffer-coercible" → CW-E14 with the `TypeError` message, not CW-E08.

Reproduce a row with `pnpm --dir create-wxl exec vitest run test/<file> -t="<pattern>"`.

| Row | Test file › pattern | Red | Green | Selected |
|---|---|---|---|---|
| R1 C30 | `failures.test.mjs` › `C30` | the `EPERM` from `rename` escaped `run` (no rollback) | 1 passed | 1 |
| R2 C65 | › `C65` | no red: R1's rollback already tried every entry and kept the stranded one | 1 passed | 1 |
| R3 C53 | › `C53` | (a)(b) CW-E11 instead of CW-E04, exit 0 instead of 1 (no re-check) | 3 passed | 3 |
| R4 C54 | › `C54` | all four errors escaped `run` (`mkdtemp`, `extractEntries`, `range.json`, `package.json`) | 4 passed | 4 |
| R13 C57 | › `C57` | `Error: kaboom` / `Error: boom` escaped `run` | 2 passed | 2 |
| R5 C31 | `signals.test.mjs` › `C31` | `expected 0 to be 130` (no listener) | 4 passed | 4 |
| R6 C31 | › `2nd move` | `expected +0 to be 130` | 1 passed | 1 |
| R7 C56 | › `C56` | (a) `expected +0 to be 130` (SIGTERM not registered); (b) no red: the guard keeps the first signal only | 2 passed | 2 |
| R8 C56 | › `step 11` | `expected 1 to be 130` (no `step-11` checkpoint) | 1 passed | 1 |
| R9 C56 | › `step 12` | `expected +0 to be 130` | 1 passed | 1 |
| R10 C56 | › `SIGHUP during G2` | `expected +0 to be 130` (G2's non-zero taken as CW-W03) | 1 passed | 1 |
| R11 C56 | › `step 13` | (a) `expected +0 to be 130`; (b) a write callback error escaped as an unhandled `'error'` event | 2 passed | 2 |
| R12 C56 + decision 4 | › `SIGINT at a question` | both cases timed out after 5000 ms (readline kept waiting) | 2 passed | 2 |
| R14 C41 | `language.test.mjs` | no red: the language rules and CW-E01/CW-E02 already held | 12 passed (with R15) | 12 |
| R15 C41 | `language.test.mjs` › `message tables` | no red once the new ids were in both tables | (with R14) | 12 |
| R16 C60 | `escaping.test.mjs` | (a), (b) no red: `jsonValue` and T-0021's tests already escaped ESC, newline and C1; (c) `expected '…' to contain '\u007f'` (CW-E02 named `CREATE_WXL_COMMIT` without its value) | file: 11 passed at the time | — |
| decision 5 | › `escapes` | `expected '"a\tb"' to be '"a\u0009b"'` (a line feed was briefly moved to `\u000a` too, then restored to D10's `\n` in stage 6) | passed | — |
| R17 C60 + decision 1 | › `copyable commands`, `CW-E12`, `decision 3` | N1 with ESC printed raw; CW-E12 no red (shared check); CW-E12 and CW-W05 `pnpm fork:init` with an answer holding ESC printed raw (engine validation bypassed in the test: the real engine rejects such values at step 5 with CW-E06); CW-W05 at step 11 with an ESC directory no red | all passed | — |
| R18 C69 | `write-scope.test.mjs` | no red, as the plan expected | 1 passed | 1 |
| decision 6 | `signals.test.mjs` › `step 8 extraction`, `step 9`, `step 6 download` | `expected 5 to be 1`; `expected 9 to be 6`; `expected 1 to be 130` (the download waited for the timeout) | 3 passed | 3 |
| guard listeners | › `no listener behind` | no red: `run()` removes the guard's listeners in `finally` | 2 passed | 2 |

Checks: `pnpm --dir create-wxl test` → `Test Files 17 passed (17) / Tests 322 passed (322)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`. N2 carries fixed strings and a validated version only, so the control-character rule has no input to test there.

### 2026-10-17 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S1 | `failures.test.mjs` (11), `signals.test.mjs` (20), `language.test.mjs` (12), `escaping.test.mjs` (13), `write-scope.test.mjs` (1) | not measured: no coverage provider is installed in create-wxl | C30, C31, C41, C53, C54, C56, C57, C60, C65, C69; decisions 1, 3–6 | the real `bin` wiring of signals, stdin and `process.env` (T-0025, 0005-S4); Windows behaviour until T-0025's cross-OS CI; the `pnpm fork:init` withholding is reachable only past the engine's own validation (defence in depth) |

**Stage 8 verification surface (D1).** create-wxl vitest runs, in-process; signals are emitted on an injected emitter, not delivered by a terminal, until T-0025.

### 2026-10-17 — stages 6 and 7 disposition

One review workflow on the staged change: Standards (36 findings, S-01–S-36, none high), Spec (24, P-01–P-24, one high), security candidates (14, C-01–C-14) with an independent false-positive filter (no candidate met the threshold). Findings and their full evidence were kept with the run; ids below are that run's.

**Correction.** P-01 (high), S-02, C-11: a line feed inside a value had been written `\u000a` on the main session's instruction, against the user-approved D10 (`\n`, the matrix value) and the approved Boundary. Restored to D10 test-first (red: `expected '"a\u000ab"' to be '"a\nb"'`); decision 5 now reads: every C0 except a line feed, plus DEL and C1, is `\uXXXX`; a line feed is `\n`. Test titles citing a wrong decision number corrected (S-15).

Fixed (pre-authorisation 2 and "follow the recommendations"), each behaviour fix with a test written and run first:

- P-02, C-01: a signal during step 9's last write, at the `step-10` checkpoint or during the whole-directory rename starts no further file-system operation and leaves the target as it was (red: exit 1 with the range in place).
- P-03, S-23, C-02: a signal whose rollback strands entries keeps the temporary folder and prints CW-E11 naming each stranded entry and the folder, exit 130 (red: nothing printed and the folder removed).
- P-14, C-04: a failing whole-directory rename, and a `chmod` or `rmdir` failure after it, are CW-E11, the range moved back where possible (red: CW-E14).
- P-04, S-04, C-07: CW-E14 in steps 11–13 lists the window's remaining commands, as decision 3 says (red: no commands listed).
- P-13: `checkpoint('step-5')` runs with setup (red: a signal there was not seen).
- P-17, C-14: a signal already received wins over a failure found afterwards in steps 4 and 6 (red: exit 1 with CW-E04 / CW-E07).
- P-18: an unexpected error in steps 1–2 is CW-E14 in the environment's language (red: an unhandled `TypeError`).
- C-13, P-22: CW-W05 no longer lists a git command that had completed (red: `git init` and `git commit` listed after succeeding).
- C-12: Node's `ERR_*` errors are CW-E14, not CW-E09.
- C-09, S-35: lone surrogates are `\uXXXX`; non-string values are converted with `String()` before escaping.
- S-30: the `'error'` listeners `run()` adds to the output streams are removed once the run ends.
- S-24, S-25, S-26: zh-TW CW-E11/CW-E14 spacing, the en stranded sentence for one or several entries, and 暫存資料夾 throughout.
- Tests raised to the approved Boundary column, all green without production changes (S-05–S-11, P-05–P-12, P-15, P-16, P-19, S-32): C41's sixth case; literal escapes and no raw control character in any output; C54's error codes and paths; C65's kept folder and its contents; C31 with the recording fs; C69 against `mkdtemp`'s real result; N1's full line; every CW message starting with its code, checked in this ticket's run tests by a shared helper.
- Cleanup (S-13, S-14, S-16–S-22, S-27, S-28, S-31): comments, one `isRaised()` and `shouldStop` name, `extractEntries` returning `{ stopped }`, shared cleanup and control-character helpers, the chosen language passed down, `reportPath` in one helper. During S-28 the executor found and fixed test wrappers that called themselves recursively.

Additions to the approved test plan table (S-34), all in this ticket's test files: decision 1's withheld commands (N1, CW-E12, CW-W05, `pnpm fork:init`); decision 4's signal while a question is pending; decision 5's escapes; decision 6's signals during step 6, 8 and 9; the stage 6 cases above (step 5 and step 10 signals, stranded rollback under a signal, whole-directory move failures, CW-E14 with remaining commands and in steps 1–2, CW-W05 after completed git commands, `ERR_*` errors, lone surrogates, listener removal).

Recorded, not changed:

- S-01: the acceptance criteria are ticked now; T-0022's and T-0023's, left unticked, are ticked in their own tickets in a separate records commit.
- S-03: the two existing-test overrides cite the user's standing instruction above.
- S-33: red → green states are recorded in this ticket, not as separate commits, as in T-0019–T-0023.
- P-20, S-31: readline's `SIGINT` is forwarded to the signal guard in `questions.mjs`, where readline lives; T-0025's `bin` must not forward it again.
- P-21: in step 13, CW-W05 says nothing is left even after a git warning, whose N2 lines already list the git commands.
- P-23: the log and coverage table above reflect the final tests. P-24: T-0023's landing record is committed separately.
- C-03: when the `cd` command is withheld the other finishing commands are still printed, as the rule withholds only commands holding a control character.
- C-05: the target replaced by a symbolic link between the re-check and the moves: another process writing the target is outside B4's model.
- C-06: a cleanup that itself fails inside the failure path ends as a rejection: needs an outside process changing permissions, outside the model.
- C-08: bidirectional and zero-width characters are printed as they are: the spec's rule covers C0, DEL and C1.
- C-10: false positive (printing `CREATE_WXL_COMMIT`'s value is the C60 matrix's requirement).
- S-36: N4 is not in the spec's list of copied commands and its values are validated by the engine: not withheld.

Stage 7 report: `.proj.specs/0005-create-wxl/review/security-T-0024.md`.

Checks after the fixes: `pnpm --dir create-wxl test` → `Test Files 17 passed (17) / Tests 355 passed (355)`; root `pnpm test --run` → `Test Files 127 passed (127) / Tests 4196 passed | 1 skipped`; the en and zh-TW tables hold the same ids, each rendering starting with its code.

### 2026-10-17 — landed

Squash-merged into `main` as `af5c948` (PR #30) by GitHub auto-merge (squash) after all ten checks passed. Status set to `done`.
