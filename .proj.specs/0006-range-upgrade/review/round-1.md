# Stage 3 round 1：總覽 — epic 0006-range-upgrade

審查版本：spec.en.md blob `d1113f8391db30645b644356198f245d382e3a61`、traceability.md blob `a391c67dd7e2c7268b590a290e1b12308163a7d7`，HEAD `c707b40`。凍結 prompt `review/prompt.md` blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 0 | 13 | 12 | 25 |
| 2 可驗證性 | `round-1-V.md` | 0 | 12 | 21 | 33 |
| 3 契約衝突 | `round-1-K.md` | 0 | 2 | 16 | 18 |
| 4 紅隊 | `round-1-R.md` | 0 | 10 | 14 | 24 |
| **合計** | | **0** | **37** | **63** | **100** |

沒有 P0，stage 3 gate 成立。

## 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| U1 | 合併的確定性（conflict style、label、config、merge-file 錯誤碼、合併後 JSON） | C-1、C-15、C-24、V-1、V-23、R-7、R-8、R-24 |
| U2 | base 的決定（`--from` 的 no-op、降版、U1 之前的 base、override、base 不可見） | C-2、C-12、V-2～V-4、V-32、V-33、K-1、K-5、R-9～R-11、R-13、R-20 |
| U3 | 路徑模型（型別衝突、父路徑是檔案、刪寫順序、大小寫、硬連結、`range.json` 是 symlink、`.git` 元件） | C-3～C-5、C-10、V-12、V-13、R-1～R-4、R-15、R-23 |
| U4 | ignored 路徑與還原保證 | C-9、V-8、R-5、R-14 |
| U5 | 乾淨檢查的強度（config、skip-worktree、進行中的操作、沒有 HEAD） | C-8、C-19、V-16、V-20、K-13、R-6 |
| U6 | 行尾正規化 | C-6、K-7 |
| U7 | fork:init 衍生內容（`deploy.yml`、錨點、部署 tag） | C-13、K-6、K-14、R-12 |
| U8 | seam 與可觀察性（cwd、暫存根目錄、fs 注入、`runGit`、`fetchArchive(ref)`、訊號、Windows） | C-7、C-16、C-17、C-22、V-5～V-7、V-11、V-21、V-25～V-28、K-3、K-16、R-17、R-22 |
| U9 | 文法、報告、入口、stage 8 與文件契約 | C-11、C-14、C-18、C-20、C-21、C-23、C-25、V-9、V-10、V-14、V-15、V-17～V-19、V-22、V-24、V-29～V-31、K-2、K-4、K-8～K-12、K-15、K-17、K-18、R-16、R-18、R-19、R-21 |
