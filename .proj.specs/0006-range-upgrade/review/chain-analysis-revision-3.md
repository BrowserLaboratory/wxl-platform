# Epic 0006 revision 3 收尾：漏洞串連分析

依 `docs/agents/review.md`「Epic close-out: chain analysis」。輸入：

- revision 3 四張 ticket 的第 7 階段報告：`security-T-0061.md`、`security-T-0062.md`、`security-T-0063.md`、`security-T-0065.md`；
- 早先的 `security-T-0026.md`、`security-T-0027.md`；
- revision 2 的串連分析 `chain-analysis.md`（X1～X3，已由 T-0061～T-0063 關閉）；
- spec 的 B1～B6（revision 3.3）與決策 D11～D22。

程式碼以 `main` 加上 `tickets/T-0065/git-floor-2-26` 的 HEAD 為準。

問題：revision 3 留下的低嚴重度缺陷與已接受的風險，能不能串成一條跨越信任邊界的鏈？

方法：workflow `wf_40a8044d-7e0` 從三個攻擊者位置各派一個 `harness-reviewer` 找鏈：

- fork：經由 `--from <commit>` 或 fork network 提供 archive 的人；
- B3：能改 `range.json` 或 commit 進老師 repository 的人；
- env：老師自己的環境與操作，加上一個外部人士。

每條候選鏈再交給獨立的 `harness-reviewer` 逐環查證，盡量打斷它。判斷全部來自讀碼，沒有實測：WSL drvfs 對 8.3 短檔名的解析、git 2.26～2.35 的行為、GitHub 在上游網址下提供 fork 的 commit，都是推論。完整輸出在本機筆記 `.proj.research/2026-11-10-0006-r3-chain-analysis-full.md`。

## 結論

**有跨越信任邊界的鏈，全部是 low，沒有程式碼執行。** 依規定，epic 完成前要開 ticket，所以開出 **T-0066**（spec revision 3.4）。

revision 2 的 X1～X3 中，只有 X3 的最終影響（不可逆地刪掉老師被 ignore 的檔案）在一種情況下重新出現：在 P-9 失效的檔案系統上（WSL `/mnt/c`），還原指令的 `git checkout -- .` 失敗，而 `git clean -fd` 照樣執行。

| 鏈 | 環節 | 判定 | 處置 |
|---|---|---|---|
| env:Y1 | `--from <commit>`（D17）→ WSL `/mnt/c` 上 P-9 失效（B4）→ 8.3 別名 `GITIGN~1` 讓 M6 刪掉 `.gitignore` → `git checkout -- .` 失敗（例如 git 2.26～2.34 加 zdiff3）→ `git clean -fd` 照樣執行，刪掉被 ignore 的檔案 | 成立，low 上緣（最終影響和 X3 相同） | T-0066：還原指令印成單一指令 `git checkout -- . && git clean -fd`（D23），並加上不依賴 `realpath` 的別名檢查（D24） |
| env:Y2、b3:Y2、fork:Y4 | 同上的別名讓 M6 刪掉 `.gitignore`；R2 印出的是別名；老師照 R4 commit，原本被 ignore 的檔案被 `git add -A` 收進 repository | 成立，low | T-0066 的 D24：o 存在，而 p 既不在 tracked 裡、也沒被 ignore 時，p 一定是別名（step 4 已確認沒有未追蹤、未被 ignore 的檔案）→ 不動並報 UP-A15。B4 也補上這個後果 |
| fork:Y1 | 偽造的 base 讓 b ≡ t，P-2 靜默略過上游的修補；`range.json` 改寫成 target 後，之後的升級會一直把這個缺口當成老師的修改保留 | 成立，low | T-0066：寫進 B1 Does not protect（靜默略過與延續），沒有改程式碼 |
| b3:Y1、b3:Y4 | `range.json` 指向較舊或較新的 release：老師刪掉的檔案被加回、改回的內容被覆蓋，或中間的修正永遠缺少 | 成立，low（上游目前只有一個 release，屬於潛在風險） | T-0066：B3 Does not protect 寫出這些後果與延續性 |
| b3:Y3 | B3 commit 一條 ignore 規則，提前封鎖上游之後才新增的檔案：P-5 讓升級永遠不寫入 | 成立，low | T-0066：寫進 B3 Does not protect |
| fork:Y2 | B3 被 J6 擋下後，經由 D18 的補救建議把老師導向 `--from <commit>` | 成立，low | 併入 T-0066 的 B1 註記；D18 的訊息不改（T-0061 C1 已記錄） |
| fork:Y5 | APFS 上 NFC 等價的名稱（singleton）讓 P-5 判為沒被 ignore、P-9 放行，M6 刪掉被 ignore 的檔案 | 成立，low 下緣；要攻擊者知道檔案內容 | T-0066 的 D24 會擋下：p 不在 tracked 裡，o 卻存在。R-9 也寫進 B4 |
| fork:Y6 | `CREATE_WXL_COMMIT` 讓 target 也來自 fork network | 模型外（0005 B6），沒有增量 | T-0066：0006 的 B 表註明這種情況下 T 不受 B2 保護 |
| fork:Y3 | D16 的 R4 句子要老師比對版本號，而版本號可以偽造 | 不成立（B1 已接受，同 T-0063 C3） | 不處理 |
| env:Y3 | fsmonitor hook protocol V1 讓 step 4 誤判乾淨，接著還原時丟掉修改 | 不成立（還原用的是同一支 git、同一份設定） | 不處理；`-c core.fsmonitor=` 的強化留給之後，需要在兩個 git 版本上實測 |

## 找鏈階段就排除的候選

以下這些找鏈者都已附上理由（詳見本機筆記），這裡只列結論：

- T-0065 的 C1、C2：前提都是老師自己的 git 設定，攻擊者寫不進去。
- D22 與 T-0063 的 C6、C7：要老師在升級後自己放入被 ignore 的檔案。
- bidi 字元的偽造：別名必須能解析到真實存在的檔案。
- manifest 版本號注入 `-L`：被 `VERSION_RE` 擋下，而且參數以陣列傳遞。
- `package.json` 的 `__proto__`。
- `.gitattributes`、submodule 與 symbolic link 的各種組合。

## 更正先前的判定

- `security-T-0063.md` 的 C1 與 `round-2-R.md:161` 說 R2 的刪除路徑一定是老師 tracked 的名稱。這只在 P-9 有效的檔案系統上成立；在 WSL `/mnt/c` 上，R2 可能印出別名。T-0066 的 D24 讓這句重新成立。
- `security-T-0065.md` 的 C2 說「這種 git 的日常 checkout 本來就會失敗，老師在升級之前就會發現」。對平常用 Windows 端 git、只在 WSL 裡執行 pnpm 的老師，這句不一定成立。T-0066 的 D23 讓這點不再影響結果。
