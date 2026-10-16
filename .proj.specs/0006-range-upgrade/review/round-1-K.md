# Round 1 — 軸 3 契約衝突（epic 0006-range-upgrade）

審查版本：spec.en.md blob `d1113f8391db30645b644356198f245d382e3a61`、traceability.md blob `a391c67dd7e2c7268b590a290e1b12308163a7d7`，HEAD `c707b40`，凍結 prompt blob `0bfaa5b27658fc9f79d7dc88e644a373a25534a2`。審查員沒有 shell；主 session 派工時已核對 hash。外部工具行為為推論。

| id | 問題 | 信心 | 等級 |
|---|---|---|---|
| K-1 | 「上游專用路徑靠各 commit 自己的 `.gitattributes` 排除」對 U1 之前的 base 不成立（目前 HEAD 沒有 export-ignore）；M6 大量刪除 fork 的 specs、P2 可能 CW-E10；違反原廠靶場定義 | 高／中 | P1 |
| K-2 | GLOSSARY「上游」詞條說 fork 只能從 git 歷史推斷，與 `--from` 衝突，未同步修訂 | 高 | P2 |
| K-3 | `--from <version>` 把 tag 傳給 `fetchArchive(repository, commit)`；與 0005 B1「以完整 SHA 選內容」衝突，卻宣稱下載原樣沿用 | 中 | P2 |
| K-4 | CW-E09 被用來表示規劃階段讀取失敗，與 0005「extraction failed」語意不同 | 高 | P2 |
| K-5 | `version` 文法 `X.Y.Z` 比 0005 schema 嚴格；SemVer prerelease 的靶場會永遠 UP-E06 | 中 | P2 |
| K-6 | 升級不重新套用 fork:init：`deploy.yml` 不在 B／T，模板更新到不了；新增檔案帶上游身分；與 `KNOWN_OLD_DEPLOY_SHA256`、README 的「舊範本→取代」機制衝突 | 中 | P1 |
| K-7 | 位元組比較與 `* text=auto eol=lf`、fork-init 的 `normalizeLf` 慣例衝突；CRLF 造成假衝突 | 中 | P2 |
| K-8 | stage 8 改用終端機 harness 卻沒明文覆寫 preview 規則、沒記錄 OQ（對照 0004 OQ-017） | 高 | P2 |
| K-9 | 模擬分支 `sim/0006-upgrade` 不是 ticket branch；模擬 commit 的訊息產生方式未寫（hard rule 1、5） | 低 | P2 |
| K-10 | R3、R4、R6 ⑦ 等決策出處只在本機研究檔，第 2 輪與日後讀者查不到；R4 的 supply-chain 取捨沒有 ADR | 中 | P2 |
| K-11 | spec 建議直接 `npx create-wxl@latest upgrade`，繞過「從靶場裡的指令啟動」 | 低 | P2 |
| K-12 | Charter「只需要 Node」與升級需要 git、至少一個 commit 的張力（CW-W01／W02 的靶場） | 低 | P2 |
| K-13 | `git status` 會寫 `.git/index`，與 B4「不碰 `.git`」不符；建議 `--no-optional-locks` | 低–中 | P2 |
| K-14 | GitHub Pages 要推 `v*` tag 才部署，報告的 next steps 沒提 | 中 | P2 |
| K-15 | 檢查 `range:upgrade` script 的測試沒說是否只在上游執行 | 低 | P2 |
| K-16 | 0006-S1 依賴工作目錄輸入，0005-S1 沒有 cwd 參數 | 低 | P2 |
| K-17 | 用詞：「challenge brief」應為委託書；裸「version」可能被誤填為 0.1.0；UP-E04 的「merge upstream」在靶場內有歧義 | 低 | P2 |
| K-18 | 0004 規劃的 0006 範圍被取代，0006 沒有明寫 | 低 | P2 |

依等級統計：P0 0、P1 2、P2 16，共 18 項。
