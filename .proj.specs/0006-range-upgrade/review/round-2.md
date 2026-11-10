# Stage 3 round 2：總覽 — epic 0006-range-upgrade（revision 3，T-0061）

審查版本：spec.en.md blob `2cf003ad2375808683bedc83d375a8a3274b3721`、traceability.md blob `afd5040b72b6e2f7c8cc20ff1e9cff830d063361`，HEAD `56902c2`。凍結 prompt `review/prompt.md` blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`，與 round 1 相同，逐字重放；只換了 spec 版本。四個 `harness-reviewer` 各審一軸（workflow `wf_f695f74b-1a7`，2026-11-10）。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-2-C.md` | 0 | 1 | 16 | 17 |
| 2 可驗證性 | `round-2-V.md` | 0 | 1 | 18 | 19 |
| 3 契約衝突 | `round-2-K.md` | 0 | 1 | 16 | 17 |
| 4 紅隊 | `round-2-R.md` | 0 | 2 | 7 | 9 |
| **合計** | | **0** | **5** | **57** | **62** |

沒有 P0，stage 3 gate 成立（hard rule 3：round 2 是上限，沒有存活的 P0，不必拆 epic）。處置提案見 `disposition-2.md`，由使用者裁定。

## 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| W1 | UP-E12 等訊息對 `--from` 的建議 | R-1（P1）、C-7、K-14 |
| W2 | P-9 的適用範圍與盲區 | R-3（P1）、V-18、C-17、R-5、R-9 |
| W3 | seam 與測試環境 | V-1（P1）、K-1、V-14、C-14、V-11、K-13 |
| W4 | 設定紀錄詞條與 AC-12 | K-2（P1） |
| W5 | stage 8 沒走預設路徑 | C-1（P1）、V-17、K-7 |
| W6 | `Range.json` 大小寫變體 | C-2、V-13、R-8 |
| W7 | git 指令失敗的代碼 | C-5、K-4、K-5 |
| W8 | 先後順序與邊界的列 | C-9、C-10、C-15、V-4、V-5、V-6、V-19 |
| W9 | 新錯誤分支與 P-7 分支缺列 | C-3、C-6、V-7 |
| W10 | ignore 規則的來源 | C-8、K-11 |
| W11 | AC 的可判定性 | V-2、V-3、V-8、V-9、V-12、V-16 |
| W12 | 報告輸出的列與語系 | C-11、V-15、K-6 |
| W13 | 威脅模型的具體後果 | R-2、R-4 |
| W14 | 文件與引用 | K-3、K-8、K-9、K-10、K-12、K-15、K-16、K-17 |
| W15 | 記錄或在 ticket 內處理 | C-4、C-12、C-13、C-16、R-6、R-7、V-10 |
