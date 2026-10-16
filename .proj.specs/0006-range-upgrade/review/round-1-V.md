# Round 1 — 軸 2 可驗證性（epic 0006-range-upgrade）

審查版本：spec.en.md blob `d1113f8391db30645b644356198f245d382e3a61`、traceability.md blob `a391c67dd7e2c7268b590a290e1b12308163a7d7`，HEAD `c707b40`，凍結 prompt blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`。審查員沒有 shell，讀工作樹檔案；主 session 派工時已核對 hash。git 與 npm 行為為其推論。沒有模糊措辭。

| id | 位置 | 問題 | 信心 | 等級 |
|---|---|---|---|---|
| V-1 | M12、U19、AC-6 | 預設 conflict style 只有兩個標籤，與「三個標籤」互斥；`merge.conflictStyle` 受使用者 git config 影響 | 高 | P1 |
| V-2 | AC-3、U08 | `--from <commit>` 的 base 版本在任何輸出都觀察不到 | 中高 | P1 |
| V-3 | AC-4、U12 | `--from <version>` 要下載才知道 commit，「commit 相同時不下載」做不到 | 高 | P1 |
| V-4 | AC-4、U13 | 「降版在任何下載前拒絕」與 `--from <commit>`（下載後才知版本）衝突 | 高 | P1 |
| V-5 | AC-5、AC-10 | 暫存目錄沒有前綴、OS tmpdir 沒有注入，「沒有殘留」觀察不到 | 高 | P1 |
| V-6 | AC-10、U27、U28 | step 9 的寫入失敗與中斷沒有可注入的 seam | 高 | P1 |
| V-7 | AC-8 | 「reached step 9」把 step 9 失敗的執行也包含進去，和 AC-10 衝突 | 高 | P1 |
| V-8 | AC-10、B4、M5／M6 | O 含 ignored 檔案，M5／M6 可能寫入或刪除 ignored 路徑，`git checkout`／`git clean -fd` 救不回；「tree equal to HEAD」未定義 | 中高 | P1 |
| V-9 | AC-11、U30 | `range:upgrade` 入口與參數轉傳沒有 seam；`npx create-wxl@latest` 在發布前跑不到 ticket 的程式碼 | 高 | P1 |
| V-10 | 0006-S2、AC-12 | `npm pack` 不產生 source record；X3 在 ticket HEAD 不成立；`node <package>/bin` 缺依賴（繼承 0005 C-1／V-1） | 中 | P1 |
| V-11 | step 3、AC-2 | `--show-toplevel` 與 cwd 未正規化（macOS `/private`、Windows 斜線、symlink） | 中高 | P1 |
| V-12 | O 定義、M10–M12 | o 是目錄、b≠t 時落不到任何可判定的列 | 高 | P1 |
| V-13 | M4 | 「o = t」是否含兩邊都 absent 未寫，表格是否完整依讀法而定 | 中 | P2 |
| V-14 | UP-E06 | 「naming the rule」沒有可比對的 token | 高 | P2 |
| V-15 | U09 | 有 `--from` 時 UP-E05／E06 是否仍檢查、順序 | 中 | P2 |
| V-16 | AC-2、AC-10 | `status.showUntrackedFiles=no` 讓 dirty 判為 clean，之後 `git clean -fd` 刪掉老師的檔案；應用 `-uall` | 中 | P2 |
| V-17 | AC-7 | 「no file outside the range changes」為全稱否定；AC-7 寫 tracked、M2 寫 working tree | 中 | P2 |
| V-18 | AC-9 | 計數是否等於路徑數、語言判定、輸出串流、「changed」的定義、reason 無可比對內容 | 中 | P2 |
| V-19 | 代碼 | UP-E／I／A 雙語與代碼開頭沒有列與 AC | 中高 | P2 |
| V-20 | B4 | `git status` 會寫回 index，與「never touches `.git`」矛盾；不 commit／不 stage 沒有 AC | 中 | P2 |
| V-21 | U23、U16 | Windows 看不到執行權限；fixture 表達不了 mode 與 pax header | 中 | P2 |
| V-22 | AC-6 | 「one path per row」蓋不到子情況；M10 是否算 updated；「untouched」定義 | 中 | P2 |
| V-23 | M12 | `git merge-file` 出錯回 255 也被當成衝突 | 低–中 | P2 |
| V-24 | stage 8 | 「exactly the listed results」範圍；package.json script 合併未檢查；老師那一行須與 B 不同 | 中 | P2 |
| V-25 | `fetchArchive` | `--from <version>` 時呼叫參數與 URL 未定 | 中 | P2 |
| V-26 | UP-E09 | 中斷時「path and error」不適用 | 中 | P2 |
| V-27 | 0006-S1 | 工作目錄如何交給函式（`process.chdir` 在 worker 不可用） | 中 | P2 |
| V-28 | U04 | git missing 如何模擬；所有 git 呼叫是否都走 `runGit` | 中 | P2 |
| V-29 | AC-1 | `--from` 沒帶值、`--lang fr`、單獨的 `--` | 中 | P2 |
| V-30 | AC-11 | 「behaves as 0005 specifies」為全稱 | — | P2 |
| V-31 | AC-8 | 序列化格式只在 traceability；「keep their values」比對方式 | 中 | P2 |
| V-32 | B1 | 實際用的 base commit 事後查不到；報告應印出 | 中 | P2 |
| V-33 | UP-I01 | 「the version」指哪一個 | 低 | P2 |

依等級統計：P0 0、P1 12、P2 21，共 33 項。

**轉給其他軸的觀察（不計分）**：大小寫不敏感檔案系統上只改檔名大小寫可能刪檔；T 新增 `foo/bar.txt` 而 range 的 `foo` 是檔案；舊版 base 沒有 `export-ignore` 或缺 P1／P2 標記會導致刪檔或永遠 CW-E10。
