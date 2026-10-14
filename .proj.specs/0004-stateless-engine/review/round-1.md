# Stage 3 round 1：總覽 — epic 0004

審查版本：spec.en.md blob `0972dc4de1a875a86be737c62b9abb89e81eea7d`、traceability.md blob `ce8bb855b29b3bbcf5b94047f33aea837c565ede`，HEAD `c0f7edf`。凍結 prompt `review/prompt.md` blob `b460b2d112e2e394c4f628fc3fdfc29864dc8fc2`；四軸、Grading、Output 三段與 0003 的 prompt 逐字相同（parent 以 diff 驗證）。四位 reviewer 都是 `harness-reviewer`，只讀檔案。

送審前做過一輪自審（5 個 agent：追溯一致性、互斥、0003 round 2 承接、事實查核、狀態空間），修掉 6 項 blocker 後才送審。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 0 | 5 | 27 | 32 |
| 2 可驗證性 | `round-1-V.md` | 0 | 12 | 18 | 30 |
| 3 契約衝突 | `round-1-K.md` | 0 | 1 | 14 | 15 |
| 4 紅隊 | `round-1-R.md` | 0 | 3 | 16 | 19 |
| **合計** | | **0** | **21** | **75** | **96** |

**第 3 階段關卡（P0 為零）在第 1 輪達成。** 依 `docs/agents/review.md`，P1 可以帶進 ticket 處理；本 epic 在 revision 2 先修掉，處置見 `disposition.md`。

## 根因歸群

| 群 | 根因 | 發現 | 處置摘要 |
|---|---|---|---|
| M1 | 範本舊版清單靠 Git 歷史檢查，CI 是淺層 checkout | C-1、V-2、V-3、R-1、C-19、K-15 | 改成釘住目前範本的 hash（不需要 Git 歷史） |
| M2 | 暫存檔加 rename 的寫入被寫成可驗收的保證，衍生出 leftover 清除、dry-run、錯誤的互斥 | C-4、V-6、V-7、R-3、R-4、R-5、C-21、C-22、C-18 之 2 | 回到 S1 裁決：只是實作要求、不驗收；rebrand 模式照舊原地寫入；新增寫入失敗列；`.gitignore` 忽略暫存檔 |
| M3 | rebrand 模式的差異清單不完整 | C-8、C-9、C-10、V-16、R-17、V-1 | T51 列出完整差異；T26 兩種模式都適用；T52 補 `--author` |
| M4 | 參數檢查順序與訊息無法判定 | C-6、C-14、C-15、V-4、V-8、V-18、V-26、R-13 | 完整排序；訊息含旗標名與必要字串；空值算缺少；重複旗標是錯誤；拒絕的值以 JSON 引號回顯 |
| M5 | 第二次執行的警告與不帶狀態的覆寫 | C-7、V-5、C-26、R-9 | T7 精確列舉；改掉非上游的 A8、重設字面值 A9 時警告 |
| M6 | workflow 的判定（`SITE_BASE`、範本本身、CRLF、其他檔名） | R-2、R-8、C-3、C-13、V-14、C-24、R-18、R-10、C-11 | 以 YAML 判斷 build 步驟的 `SITE_BASE` 值；`--host github-pages` 要求範本會推導；不帶 `--host` 也正規化比對；README 說明後果 |
| M7 | 第 8 階段的指令與觀察點 | C-2、V-10、V-11、V-23、V-24、V-29、C-23、R-19 | S7 加 `test:challenges`、`CI=1`、讀取時機、觀察點精確化、CF 站名加 `\` `$&`；S8 的資源規則 |
| M8 | 文件與註解的驗收無法機械判定 | C-5、C-27、K-1、K-2、K-3、V-12、V-21、V-22、R-14 | 新增 S9（第 6 階段 `grep -F`）；T77–T80、T83 改為必要／禁止字串；註解以內容指稱 |
| M9 | 用語與詞彙表 | K-4、K-5、K-6、K-7、K-8、K-9、K-10、R-12 | 用語修正；T79 補 `_Avoid_` 與範圍註記；升級可讀回的設定改為精確敘述 |
| M10 | 其他邊界 | 其餘 | 逐項見 `disposition.md` |
