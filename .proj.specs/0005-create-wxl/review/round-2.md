# Stage 3 round 2：總覽 — epic 0005-create-wxl

審查版本：spec.en.md blob `b61e6031517a00e2572063a8146c7a6f529fb5de`、traceability.md blob `ac164c561bb44918edb404fcfa78d504b4608282`（revision 2），HEAD `c707b40`。凍結 prompt `review/prompt.md` blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`，與 round 1 逐字相同。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-2-C.md` | 0 | 11 | 22 | 33 |
| 2 可驗證性 | `round-2-V.md` | 0 | 16 | 22 | 38 |
| 3 契約衝突 | `round-2-K.md` | 0 | 2 | 15 | 17 |
| 4 紅隊 | `round-2-R.md` | 0 | 4 | 17 | 21 |
| **合計** | | **0** | **33** | **76** | **109** |

**round 1 的 4 個 P0（N1、N2）沒有再出現；round 2 沒有 P0，stage 3 gate 成立。**

## P1 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| Q1 | 發布流程：npm 實際順序 `prepublishOnly` 先於 `prepack`；`mode` 未定義；X6 的遠端與 annotated tag；上游 archive 未過 entry 規則；`.tgz` 殘留；LICENSE；名稱搶註 | C-4、C-5、C-8、V-3、V-15、R-1、R-3、R-4、K-3 |
| Q2 | 互動與文法邊界：目錄重問與 AC-4；第二輪的 origin 殘留；答案 trim 與 S3 正規化；旗標缺值；readline 的 Ctrl-C | C-1、C-9、C-11、V-8、V-13、V-14 |
| Q3 | git 步驟：N2 的條件；G3 在真 git 下的結束碼；`GIT_TERMINAL_PROMPT` 與 AC-15；測試隔離（XDG、system）；延後的 `--force` | C-2、C-3、V-4、V-5、R-2 |
| Q4 | 檔案系統：C53 空目錄；搬回失敗與 AC-10；空目標的父目錄與 EXDEV；寫入失敗的錯誤碼；下載 body 與時限；Windows／root 略過規則 | C-7、C-10、V-6、V-7、V-11、V-12、V-16 |
| Q5 | seam 與 stage 8：CW-E13 的輸入與 `bin` 層；run I 的 TTY；T66 在 stage 8 的觀察；AC-18 純指令行；AC-24 與 POSIX 引號 | C-6、V-1、V-2、V-9、V-10 |
| Q6 | 契約：T51 覆寫影響 residual 掃描 | K-1 |
