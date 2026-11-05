# Stage 7 安全審查：T-0057（每個語系的清單都列出每一道題目）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0057/every-challenge-in-every-list`
- base（main）＝ merge-base ＝ HEAD：`c97e8ae`
- committed 層：空的（尚未 commit）；兩個新檔以 `git add -N` 納入 diff
- pending 層：`git diff HEAD` 涵蓋的 21 個檔，擷取時間在第 6 階段的修正之後
- 受審的產品程式碼：`platform/shared/{mergeChallenges,challenges.data,challenges.zh-TW.data}.ts`、`.vitepress/theme/components/{ChallengeList,HomeContent}.vue`、`.vitepress/theme/i18n/messages/{en,zh-TW}.json`
- 指南、GLOSSARY、AGENTS.md、OPEN-QUESTIONS、測試、ticket 與 traceability 只當作脈絡閱讀

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0008 的信任邊界 B1–B5 為準，並套用 ADR-0005 與 ADR-0006。這次變更沒有碰到任何題目刻意保留的弱點。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 `harness-reviewer` | 列出全部候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立的 `harness-reviewer`，共 11 位 | 逐步對照程式碼核對候選描述的流程 |

以 workflow `wf_5cc10e2e-6ee` 執行。所有結論都是讀程式碼得出的，沒有在瀏覽器上驗證。

## 結論

**沒有成立的安全漏洞。** 11 項候選經獨立檢查，全部判定為「不是漏洞」。S-1 屬於穩健度問題，因為這次變更讓它的影響範圍擴大，所以在本階段修正。

第一關特別追過 XSS 與站外導向，結論是不成立：

- 清單與首頁的 frontmatter 欄位都經過 `{{ }}` 文字插值或屬性綁定，沒有 `v-html`；`lang` 的值只會是 `en` 或 `zh-TW`（由 `placeOf` 依網址判斷）；標記是固定的訊息文字。
- 條目的 `url` 由 VitePress 依檔案路徑算出，一定以 `/challenge/` 或 `/zh-TW/challenge/` 開頭，不是 frontmatter，所以不可能是 `javascript:` 或 `//`。複製控制只用 `SITE_ORIGIN`、語系代碼，以及通過 slug 文法的 slug 或永久編號。

## 候選與處置

| # | 位置 | 類別 | 獨立判斷 | 處置 |
|---|---|---|---|---|
| S-1 | `mergeChallenges.ts` 的 `toData` | 輸入驗證 | 不是漏洞（0.85），屬穩健度 | **已修。** title、description、category 不是字串時（YAML 會把 `title: 2048` 讀成數字），學習者搜尋或依分類排序會丟出 TypeError，清單停止更新。這是既有問題，但現在一棵樹的 brief 會進到兩份清單。改成不是字串就用清單語系的預設值，tags 只保留字串。測試：`merge-challenges.test.ts`「takes the list's default for a title, summary or category that is not a string」（修正前紅燈）。 |
| S-2 | `mergeChallenges.ts` 的 `id` 規則 | 跨樹影響 | 不是漏洞（0.9） | 記錄。英文 brief 沒有 `id` 時，繁中 brief 的 `id` 決定英文清單的暫時編號與排序。這是 merge rules 明定的行為；目前沒有題目在 frontmatter 寫 `id`。 |
| S-3 | `mergeChallenges.ts`、兩個清單元件 | 內容冒充 | 不是漏洞（0.9） | 記錄。只有繁中 brief 的題目會進到英文清單與首頁，標題、日期由繁中樹決定。hook 與 CI 會擋下這種 brief；能繞過的人本來就能改英文 brief，權限沒有提升（E3）。 |
| S-4 | `ChallengeList.vue` 的連結與複製控制 | 偏好寫入（B4） | 不是漏洞（0.85） | 記錄。英文清單裡只有繁中的題目連到 `/zh-TW/` 頁面，冷載入時會寫入 `zh-TW`。B4／D13 已接受任何指向 `/zh-TW/` 的連結都會這樣；這種題目在 committed tree 裡到不了。 |
| S-5 | 英文 loader 的 glob | 資訊揭露（B1） | 不是漏洞（0.9） | 記錄。本機建置時，`platform/zh-TW/challenge/` 底下未打算公開的草稿也會進到英文清單。那一頁本來就會被建置並發布，B1 沒有新的揭露。 |
| S-6 | 清單的 `href` 與複製控制 | 站外導向 | 不是漏洞（0.95） | 記錄。如上：網址同源，沒有可注入的協定。 |
| S-7 | 清單與首頁的插值 | XSS | 不是漏洞（0.95） | 記錄。如上：沒有 `v-html`，Vue 會跳脫輸出。 |
| S-8 | 依 slug 合併 | 鍵值衝突 | 不是漏洞（0.9） | 記錄。同 slug 依專案定義就是同一題的翻譯，進度本來就依 slug 記錄。 |
| S-9 | 已解徽章與總數 | 進度歸屬（B5） | 不是漏洞（0.95） | 記錄。符合 E7、E9；session gate 的行為沒有改變。 |
| S-10 | 借用條目的短連結 | 導覽目標 | 不是漏洞（0.93） | 記錄。只有號碼重複或狀態不一致時才會錯，屬於 T-0056 S-4 已記錄的既有問題。 |
| S-11 | 借用條目缺 title 時的預設字串 | 無障礙 | 不是漏洞（0.95） | 記錄。預設標題是清單語系的文字，卻標上另一個語系的 `lang`；merge rules 規定預設值取自清單語系。 |

## 修正後的檢查

修正 S-1 之後，在 `c97e8ae` 上的工作樹執行：

| 檢查 | 結果 |
|---|---|
| `npx vitest run tests/unit/site/` | 438 項通過 |
| `npx vue-tsc --noEmit -p tsconfig.json` | 107 個錯誤，與 `c97e8ae` 相同 |

完整的單元測試與 site-smoke 在 commit 前重跑，紀錄在 ticket。

## 沒有涵蓋的範圍

- 沒有在瀏覽器或建置後的網站上驗證 S-1 的 TypeError 與 S-5 的草稿外流。
- 沒有做相依套件掃描（這次沒有新增套件），也沒有評估 DoS 與 rate limiting。
- 跨 ticket 的串連分析在 epic 收尾進行，依 `docs/agents/review.md`。
