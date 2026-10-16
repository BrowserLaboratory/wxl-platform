# Round 1 — 軸 4 紅隊（epic 0006-range-upgrade）

審查版本：spec.en.md blob `d1113f8391db30645b644356198f245d382e3a61`、traceability.md blob `a391c67dd7e2c7268b590a290e1b12308163a7d7`，HEAD `c707b40`，凍結 prompt blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`。審查員沒有 shell；主 session 派工時已核對 hash。外部工具行為為推論。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| R-1 | `range.json` 是 symlink 時 M1 先於 M2，讀寫跟著連結走出範圍，可竄改另一個靶場的基準（同 C-10） | 高 | P1 |
| R-2 | 硬連結：就地寫入改到範圍外共用 inode 的檔案；建議暫存檔＋rename（同 fork-init T55） | 中 | P2 |
| R-3 | 檔案↔目錄型別衝突、o 是目錄（EISDIR）或 FIFO（卡住）在 plan 階段未偵測；刪寫順序未定（同 C-3、C-4、V-12） | 中 | P1 |
| R-4 | 大小寫不敏感檔案系統上只改大小寫的改名刪掉唯一的檔案；0005 entry 規則也沒擋大小寫碰撞（同 C-5） | 中 | P1 |
| R-5 | ignored 路徑上的寫入與刪除 `git diff` 看不到、restore 還原不了；T 改 `.gitignore` 時 restore 留下殘檔；force-add 的上游檔案（同 C-9、V-8） | 中高 | P1 |
| R-6 | `status.showUntrackedFiles=no`、assume-unchanged／skip-worktree 弱化乾淨檢查，restore 的 `git clean -fd` 刪掉老師的檔案（同 C-8、V-16） | 中 | P1 |
| R-7 | `merge.conflictStyle` 受使用者設定影響；三個 label 與預設樣式矛盾；`--zdiff3` 需 git 2.35（同 C-1、V-1） | 中高 | P1 |
| R-8 | `git merge-file` 錯誤（255）、被訊號終止、`maxBuffer` 溢位時把空或截斷的輸出寫進老師檔案並標為衝突（同 C-15、V-23） | 中 | P1 |
| R-9 | 降版保護可被繞過：`--from <commit>` 下載後不再比版本；版本相同 commit 不同一律放行；殘留的 `CREATE_WXL_COMMIT`（同 C-2、V-4） | 中 | P1 |
| R-10 | `--from` 給得比實際新時，中間的上游變更落 M3 被靜默略過，且 `range.json` 永久記成 target；建議報告印出 base 與 o≠b 的數量 | 中 | P1 |
| R-11 | 共同教師或學生 PR 改 `range.json`，或指向 fork network 的 commit，可讓靶場靜默錯過上游修補 | 中低 | P2 |
| R-12 | fork:init 衍生內容不重算：`deploy.yml` 拿不到模板修補；T 新增的錨點內容帶上游身分；報告沒提醒重跑 fork:init（同 C-13、K-6） | 中高 | P1 |
| R-13 | U1 之前的 base 會大量刪除或 CW-E10；最新版 P1–P4 套到舊 base 可能與當初不同（同 C-12、K-1） | 中 | P2 |
| R-14 | restore 指令事後執行會一併丟掉升級後的修改；建議註明或改 `git stash -u` | 中 | P2 |
| R-15 | `git status` 寫 index、搶 `index.lock`；0005 entry 規則沒拒絕 `.git` 元件 | 低–中 | P2 |
| R-16 | 報告輸出路徑時可被換行或 ANSI 跳脫注入 | 中 | P2 |
| R-17 | 只處理 SIGINT；SIGTERM／SIGHUP 不印 UP-E09、殘留暫存目錄 | 中 | P2 |
| R-18 | `npx --yes @latest` 可能用到快取舊版；exit 2 經 pnpm 顯示 `ELIFECYCLE` 讓老師誤以為失敗 | 低 | P2 |
| R-19 | `range.json` JSON round-trip 改變其他 key 的值（重複 key、大數字、`__proto__`） | 中 | P2 |
| R-20 | B1 說「實際用的 commit 有記錄」，但 base commit 沒有任何地方記錄（同 V-32） | 高 | P2 |
| R-21 | 模擬 commit 推到公開上游，刪分支後仍可依 SHA 取得 | 低 | P2 |
| R-22 | merge-file 暫存檔的位置與權限未規定 | 低 | P2 |
| R-23 | AC-7 只涵蓋 tracked symlink，M2 涵蓋 working tree 的 symlink（同 V-17） | 高 | P2 |
| R-24 | 乾淨的文字合併仍可能產生壞掉的 JSON／YAML，卻回報 updated、exit 0（同 C-24） | 中 | P2 |

依等級統計：P0 0、P1 10、P2 14，共 24 項。
