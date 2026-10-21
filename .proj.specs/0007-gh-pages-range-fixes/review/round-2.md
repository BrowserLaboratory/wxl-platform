# Stage 3 round 2：總覽 — epic 0007-gh-pages-range-fixes

審查版本：spec.en.md blob `4485a99944b9df7fc30dd7d9a6ad6b47c8fae6cc`、traceability.md blob `5629e8c0000f6be82b92109058858caeba1f1966`（revision 2），HEAD `7820bb8`（樹與 `origin/main` `3b52e65` 相同）。凍結 prompt `review/prompt.md` blob `5cfa01c61bb10167e51ec36a0b7eac3f7f2a076b`，與第 1 輪相同、逐字重播。四個 `harness-reviewer` 各負責一軸，同時執行。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-2-C.md` | 0 | 3 | 26 | 29 |
| 2 可驗證性 | `round-2-V.md` | 0 | 5 | 21 | 26 |
| 3 契約衝突 | `round-2-K.md` | 0 | 1 | 17 | 18 |
| 4 紅隊 | `round-2-R.md` | 0 | 5 | 13 | 18 |
| **合計** | | **0** | **14** | **77** | **91** |

第 2 輪沒有 P0，stage 3 gate 成立（`docs/agents/review.md`：零 P0；兩輪上限已到，不再跑第 3 輪）。P1 依分級可在 ticket 內解決。

## 主 session 的查證（2026-10-21，scratchpad 暫存 repo，git 2.50.1、macOS `/bin/bash` 3.2.57）

| 發現 | 查證方式 | 結果 |
|---|---|---|
| V-1、R-2、C-1、K-10 | 暫存 repo 的 pre-commit hook 印出 `GIT_INDEX_FILE`，依序做一般 commit、`-a`、`--amend`、帶路徑、`-i`，以及 linked worktree 的一般 commit | 確認：一般與 `--amend` 是 `.git/index`；`-a`、`-i` 是 `<gitdir>/index.lock`；帶路徑是 `<gitdir>/next-index-<pid>.lock`；linked worktree 是 `<gitdir>/worktrees/<name>/index`，等於該 worktree 的 `git rev-parse --git-path index` |
| R-1 | `/bin/bash -c 'set -euo pipefail; A=(); echo "${A[@]}"'` | 確認：bash 3.2 以 `A[@]: unbound variable` 結束，exit 1 |
| K-1 | 讀 `tests/unit/site/redirects.test.ts` 的 `backs every translated slug with a root-locale challenge` 與檔頭的 CAUGHT 清單 | 確認：繁中頁沒有對應英文頁時 CI 失敗；revision 2 的 H17、H21 把這種 commit 當成 O2，與既有測試相衝 |

## 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| R2-G1 | commit forms 的判準（哪個 index 算自己的）與 linked worktree | V-1、R-2、C-1、K-10、C-11、R-8、R-13 |
| R2-G2 | hook 的執行環境與失敗路徑（bash 3.2 空陣列、還原失敗、index.lock 的注入方式、訊號、無 HEAD 的 fixture、stash 身分、`GIT_*` 洩漏、空目錄） | R-1、R-3、V-3、V-6、V-7、C-2、R-7、R-9、C-26、R-17、C-27、C-12 |
| R2-G3 | 只動單一語系的題目與既有測試（繁中頁沒有英文頁、只動繁中、型別變更、symlink） | K-1、C-17、V-5、K-18、R-10、R-16、C-22 |
| R2-G4 | `create:challenge` 的狀態碼與 wxl-create 的分支（keygen 失敗仍是 1、選單 `1`/`2` 撞號、Verification、訊息依據、pnpm 轉傳、寫檔失敗） | R-4、K-2、K-3、R-15、C-16、C-13 |
| R2-G5 | nav 版面與手動選取的後路（網址可縮到 0、copy_failed 版面、visible 的定義、S07 與 D7、1024 寬、完成標記、修飾鍵點擊、中鍵、WebKit） | R-5、C-3、V-13、V-12、C-18、C-5、R-14、C-23、C-20 |
| R2-G6 | 納入規則的定義（index slugs 與 guard 的 `index.md` 判準、提示條件、未追蹤繁中頁反向落差、E1 修復遇到不一致草稿、staged 版本的核心性質） | R-11、C-14、K-17、V-10、C-9、R-6、C-15、C-28 |
| R2-G7 | 不跑 pre-commit 的 commit 與升級路徑（無衝突 merge、cherry-pick、rebase、既有靶場升級後的 header） | K-11、R-12、C-10、R-18、C-6 |
| R2-G8 | 可觀察性與措辭精確度（模式不受 `window` 影響的觀察點、`"true"` 的引號、L08/L09 在 S8、AC-6 的觀察點、T01/T02 列數、X1–X5 的範圍、S4 的 git 字眼、V02 寬度、AC-8 的 or、AC-9 的範圍、訊息子字串、N04 負向斷言、T04 略過、H16、H18 fixture） | V-2、V-15、V-17、V-16、V-9、C-4、C-21、V-25、V-26、V-18、V-11、V-14、V-19、V-22、V-8 |
| R2-G9 | 文件與既有說法（GLOSSARY 延到 ticket 沒有出口、P3 漏 create-wxl 與 fork-init 字串、其他註解、fork 路徑讓 origin 停在上游、手改 origin、Solution 的全稱句、wxl-fork-init 的措辭、OQ-016 引用位置、spec 開頭的 gate 說法、`/tw-emoji-commit` 與 hook 改 index、OQ-017、passages 表的描述性判定） | V-23、K-4、K-5、C-7、K-6、K-7、C-8、K-13、K-14、K-16、K-15、K-12、K-9 |
| R2-G10 | stage 8 的可操作性（預設 flask 骨架被 validator 擋、Browser panel、guard 的 step、ticket 歸屬、新題目部署後的網址、short mode 的建置自動化、Workers、示範題依賴） | V-4、K-8、V-20、V-21、C-24、C-19、C-25、V-24、C-29 |

每條第 2 輪發現恰好歸入一群：C-1～C-29、V-1～V-26、K-1～K-18、R-1～R-18 共 91 條。處置記錄於 `disposition-2.md`（使用者裁決後撰寫）。
