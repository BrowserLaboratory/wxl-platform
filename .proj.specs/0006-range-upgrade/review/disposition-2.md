# Round 2 處置 — epic 0006 revision 3

狀態：**已裁定**。使用者 2026-11-10 回覆「照提案」，全部照下列處置，新決策 D18～D20 一併核准。round 2 沒有 P0（`round-2.md`）；round 2 是上限，所以不跑 round 3。提案比照 0005 D3：P1 群與採用的 P2 在 revision 3.1 修正，修正前做差異自審，不再送審。每項的每個主張都有答案；「新決策」是要使用者另外核准的 spec 決策（暫編 D18～D20），「新子案」是新增的測試子案。

處置代號：**修**＝revision 3.1 修正；**記**＝記錄、不改 spec；**票**＝由 T-0061 在實作時處理並由 ticket 承接。

## 各群提案

| 群 | 處置 | 內容 | 新決策 | 新子案 |
|---|---|---|---|---|
| W1 | 修 | UP-E12 的訊息依序建議：知道靶場從哪一版上游建立時用 `--from <version>`（經由 tag 驗證）；記錄的 commit 不是發布版，只有確定靶場就是從它建立時才用 `--from <commit>`；用 `git log -p -- range.json` 查是誰改的。base 來自 `range.json` 時，CW-E07（tag 不存在）與 UP-E08 也附同樣的 `--from` 提示。stage 8 步驟 4 註明維護者知道 A 是真正的 base。 | D18（訊息建議的順序） | U66 加 `--from <version>` 的 404 |
| W2 | 修 | 採 (a)：B4 的 Does not protect 擴大為「Linux 端看到的 NTFS／vfat／CIFS（WSL drvfs、掛載的共用資料夾）與其他掛載磁碟區上，P-9 可能漏掉短檔名與大小寫別名」；AC-8 與 P-9 的範圍改寫為 CI 驗證過的預設檔案系統（macOS APFS、Windows NTFS）。理由：有 J6 之後，b 只能經由 `--from <commit>`（D17，不受保護）由攻擊者決定，殘餘風險低。R-5：B4 Outside the model 擴大為「T 自己的名稱在檔案系統上互為別名或是特殊名稱」。不採 (b)（改用 readdir 比對的可攜做法），因為它會在 round 2 之後換掉 P-9 的機制，新表面沒有輪次可審。 | — | — |
| W3 | 修 | seam 改成比照 0005：隔離 `HOME` 與 `XDG_CONFIG_HOME`（`buildGitEnv` 會濾掉 `GIT_CONFIG_GLOBAL`，並設 `GIT_CONFIG_NOSYSTEM=1`）；包裝的 `deps.fs` 可以為 U69 的磁碟根目錄與 `\` 模型包裝 range root；step 3 明定經由 `deps.fs.realpath`；checkpoint 名稱是升級自己的 `step-1`～`step-10`，「step 9 期間」經由 `fs` 包裝注入。C-14 的老師 shell 讀 system config：寫進 B4 Does not protect。 | — | — |
| W4 | 修 | GLOSSARY「設定紀錄」的「目前只有建立靶場的指令會寫入它」改為「建立靶場的指令與升級都會寫入它」；AC-12 加第三個例外：0005 `upstream-config.test.mjs` 鎖住這句的斷言跟著改。 | — | — |
| W5 | 修 | stage 8 加步驟 5～6：用 `CREATE_WXL_COMMIT=<v3.0.0 剝殼後的 commit>` 建另一個靶場，commit 後不帶 `--from` 升級到 B；預期沒有 UP-E12、R1 的 base 是 3.0.0 與該 commit、exit 0（不鎖計數）。步驟 3～6 明寫在 `sim`（或新靶場）裡執行；明寫 fixture commit 是 hard rule 5 的例外。（revision 3.1 實作時改用已發布的 `create-wxl@3.0.0` 建靶場，不用 A 的套件加 override，理由見 traceability 的 stage 8 段；待使用者確認。） | — | stage 8 步驟 5～6 |
| W6 | 修／記 | B4 對 `Range.json` 的敘述改成推論語氣（「may」）；UP-E13 的訊息補一句：tracked 檔名大小寫不同時，請改回 `range.json`。不加列：無法可攜地建出這個狀態。 | — | — |
| W7 | 修／記 | 在 step order 明定 step 4、5、8 的任何 git 指令失敗都是 CW-E14 並寫出指令名稱，並明文覆寫 0005 對 CW-E14「an unexpected error」的訊息用語（與現行程式、T-0026 D6 一致）。K-5（step 9 的 bug 印哪個代碼）：記，第 5 階段核對程式路徑。 | D19（CW-E14 涵蓋 git 指令失敗） | U05 或新列：step 4、8 的 git 失敗 |
| W8 | 修 | U67 加 J2、J3、J5 先於 D15 的情況；step 7 明寫「解析錯誤先於 comment 檢查」；U65 加「base 的 comment 錯、target 下載失敗 → CW-E07」；U51 中間情況改寫為「版本等於 target、commit 不同、沒有 override」並斷言 `fetchArchive` 被呼叫；U52 寫明 fixture 用 `CREATE_WXL_COMMIT=<tag 的 commit>`；AC-4 改為「step 7 兩個 archive 都下載並驗證之後」。 | — | U67、U65、U51、U52 的情況 |
| W9 | 修 | U69 加 `deps.fs.lstat` 回 `EACCES`；新增一列「讀 o 回 `EACCES` → UP-E11」；U63 擴充為上游新增、刪除 `.gitignore`，以及 o ≡ t 但 b ≢ t。 | — | U69、新列、U63 |
| W10 | 修 | UP-E13 的補救說明 ignore 規則可能在 `.gitignore`、`.git/info/exclude` 或 `core.excludesFile`；B4 Does not protect 寫明 P-5 與 D15 把老師的全域 excludes 與 `info/exclude` 也算進來；U67 加 `info/exclude` 的情況。 | — | U67 |
| W11 | 修 | 定義「completed run」＝step 9 完成的執行（step 10 收到訊號仍是 completed，exit 130，D8），AC-10 與 AC-11 照此改寫；AC-9 的「after UP-E09 it is unchanged」限定為寫入失敗；AC-8 改成可觀察：U63、U68 斷言執行前後 `git ls-files --others --ignored --exclude-standard` 相同，例外移到 B4；U17 的 fixture 放一個 ignored 檔案（在上游有改的目錄裡），並斷言 `HEAD` 與 index 不變；U31 補上 C02 的例外。 | D20（completed run 的定義） | U63、U68、U17 的斷言 |
| W12 | 修／記 | U71、U72 兩種語言都驗；新增一列驗 R4 的兩個條件行（`pnpm install`、推 `v*` tag）；UP-A12 的 deploy.yml 句子改成有條件的說法並引用 README 的表格。message id 的部分：記（R1～R5 的行 id 已可定位，句子層的 id 留給實作的測試常數）。 | — | 新列（R4 條件行） |
| W13 | 修／記 | B3 Does not protect 補上：能改 `range.json` 的人可以讓升級回報 UP-I01（版本等於 target）或 UP-E07，靶場因此收不到上游的新版。B1 Does not protect 寫出 `--from <commit>` 的具體後果（M5、M6、乾淨的 M12 與 `--diff3`）。R-4 的「`--from <commit>` 時逐一列出 updated」：記。 | — | — |
| W14 | 修／記 | K-3：OQ-017 改為 OQ-022。K-8：刪掉 spec 狀態行裡「決策比照 stage 1」那句。K-9：traceability vocabulary 註明 `--from <commit>` 的 B 是該 commit 的原廠靶場。K-10：記，維持 stage 1 Q12 的決定（不新增詞條）。K-12：Further Notes 引用 ADR-0008，預告 layout epic 要覆寫的地方。K-15：revision 3.1 定稿後產出 `spec.zh-TW.md`。K-16：OQ-020 的行號引用改成名稱。K-17：traceability 自審列出要改的 0006 測試與註解（已在 ticket Comments）。 | — | — |
| W15 | 記／票 | C-4（M6 留下空目錄）、C-12（UP-E09 後部分 commit 再重跑）、C-13（`.gitattributes` 與還原）、C-16（fork 的樹狀結構）、R-7（步驟 9 暫存檔名稱）、R-9、C-17：記，列為已知限制。R-6（`range.json` 的 `__proto__` key 被吃掉）：票，T-0061 改用 `Object.defineProperty`，U24 加一個含 `__proto__` 的案例。V-10：修，step 8 寫明 merge-file 輸入在 `tmpRoot` 下前綴 `create-wxl-upgrade-merge-` 的 `mkdtemp` 目錄（現行程式如此）。 | — | U24 的 `__proto__` 案例 |

## 逐項答案

| 發現 | 等級 | 群 | 答案 |
|---|---|---|---|
| C-1 | P1 | W5 | 修：加預設路徑的步驟；tag 不存在時的前提寫明（步驟 3 前提不成立就停下回報） |
| C-2 | P2 | W6 | 修（措辭）；不加列 |
| C-3 | P2 | W9 | 修：U63 擴充 |
| C-4 | P2 | W15 | 記 |
| C-5 | P2 | W7 | 修（D19） |
| C-6 | P2 | W9 | 修：U69 與新列 |
| C-7 | P2 | W1 | 修：CW-E07 附 `--from` 提示；U66 加 `--from <version>` |
| C-8 | P2 | W10 | 修 |
| C-9 | P2 | W8 | 修：U67 加情況 |
| C-10 | P2 | W8 | 修：comment 錯加 target 失敗寫進 U65；截斷由「解析先於 comment」決定 |
| C-11 | P2 | W12 | 修 |
| C-12 | P2 | W15 | 記；R2 只在 completed run 列出刪除（B4 已寫） |
| C-13 | P2 | W15 | 記 |
| C-14 | P2 | W3 | 修：B4 Does not protect |
| C-15 | P2 | W8 | 修：同 V-4、V-5 |
| C-16 | P2 | W15 | 記 |
| C-17 | P2 | W2 | 記：NTFS stream 的 realpath 行為沒有驗證 |
| V-1 | P1 | W3 | 修 |
| V-2 | P2 | W11 | 修（D20） |
| V-3 | P2 | W11 | 修 |
| V-4 | P2 | W8 | 修 |
| V-5 | P2 | W8 | 修 |
| V-6 | P2 | W8 | 修 |
| V-7 | P2 | W9 | 修 |
| V-8 | P2 | W11 | 修：加可觀察斷言；例外移到 B4 |
| V-9 | P2 | W11 | 修 |
| V-10 | P2 | W15 | 修（措辭） |
| V-11 | P2 | W3 | 修 |
| V-12 | P2 | W11 | 修 |
| V-13 | P2 | W6 | 修（措辭） |
| V-14 | P2 | W3 | 修：`buildGitEnv` 已設 `GIT_CONFIG_NOSYSTEM=1`，seam 寫明 |
| V-15 | P2 | W12 | 修（條件行的列）；記（句子層 id） |
| V-16 | P2 | W11 | 修 |
| V-17 | P2 | W5 | 修 |
| V-18 | P2 | W2 | 修 |
| V-19 | P2 | W8 | 修 |
| K-1 | P2 | W3 | 修 |
| K-2 | P1 | W4 | 修 |
| K-3 | P2 | W14 | 修 |
| K-4 | P2 | W7 | 修（D19 明文覆寫） |
| K-5 | P2 | W7 | 記；第 5 階段核對 |
| K-6 | P2 | W12 | 修 |
| K-7 | P2 | W5 | 修 |
| K-8 | P2 | W14 | 修：刪句 |
| K-9 | P2 | W14 | 修 |
| K-10 | P2 | W14 | 記（Q12） |
| K-11 | P2 | W10 | 修 |
| K-12 | P2 | W14 | 修 |
| K-13 | P2 | W3 | 修 |
| K-14 | P2 | W1 | 修 |
| K-15 | P2 | W14 | 修：3.1 定稿後產出 |
| K-16 | P2 | W14 | 修 |
| K-17 | P2 | W14 | 修 |
| R-1 | P1 | W1 | 修（D18） |
| R-2 | P2 | W13 | 修（B3 補述）；不採「no-op 時也下載 tag header」，因為那是新機制 |
| R-3 | P1 | W2 | 修（採 (a)）；(b) 不採，理由見 W2 |
| R-4 | P2 | W13 | 修（B1 補述）；逐一列 updated：記 |
| R-5 | P2 | W2 | 修（B4 Outside the model）；rule 3 擋 `:` 與保留名稱：記 |
| R-6 | P2 | W15 | 票 |
| R-7 | P2 | W15 | 記 |
| R-8 | P2 | W6 | 修（UP-E13 訊息） |
| R-9 | P2 | W15 | 記 |
