# Stage 7 安全審查：T-0056（帶語系代碼的短連結、每題四條規則）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0056/locale-coded-short-links-and-four-rules`
- base（main）＝ merge-base ＝ HEAD：`fd2ef09aa2653046df2d7be9b2c7421b05dd0444`
- committed 層：空的（尚未 commit）；staged 層：空的；untracked：無
- pending 層：`git diff HEAD` 涵蓋的 20 個 tracked 檔，擷取時間在第 6 階段的修正之後
- 受審的產品程式碼：`scripts/generate-redirects.ts`、`scripts/pre-commit.sh`、`.vitepress/challenge/shortLink.ts`、`.vitepress/theme/components/{ShortLinkShare,ChallengeList,MergedNav}.vue`，以及產生出來的 `platform/public/_redirects`
- 測試、README、GLOSSARY、ticket 與 traceability 只當作脈絡閱讀

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0008 的信任邊界 B1–B5 為準，並套用 ADR-0005 與 ADR-0006。這次變更沒有碰到任何題目刻意保留的弱點。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 `harness-reviewer` | 列出全部候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立的 `harness-reviewer`，共 9 位 | 逐步對照程式碼核對候選描述的流程 |

以 workflow `wf_70636421-7a9` 執行。所有結論都是讀程式碼得出的，沒有在瀏覽器或 Cloudflare Pages 上驗證。

## 結論

**沒有成立的安全漏洞。** 9 項候選經獨立檢查，全部判定為「不是漏洞」。

第一關特別追過站外導向，結論是不成立：

- 新增的兩條參數化規則與四條編號規則，目標一律以 `/challenge/` 或 `/zh-TW/challenge/` 開頭（`scripts/generate-redirects.ts` 的 `FORMS` 與 `PARAMETERISED`）。
- 所以 `:slug` 擷取到的內容不論是 `//host`、`%2F` 還是編碼過的點段，都只會落在同源路徑。
- 複製控制的網址由 `SITE_ORIGIN` 加上固定格式的路徑組成，文字與 `title` 都經過 Vue 的跳脫，沒有 XSS。

## 候選與處置

| # | 位置 | 類別 | 獨立判斷 | 處置 |
|---|---|---|---|---|
| S-1 | `generate-redirects.ts` 的 `numericRules`；`challenge-numbers.ts` 的 `slugsUnder` | `_redirects` 行格式 | 不是漏洞（0.85） | 記錄。目錄名稱沒有經過 slug 文法檢查就寫進規則；含空白或換行的名稱會讓該行多出欄位或斷成兩行。只有能改題目樹的人（老師、fork 的維護者）做得到，而且結果只會是同源頁面或規則失效。這是既有問題，這次每個 slug 從一到兩行變成四行。 |
| S-2 | `generate-redirects.ts` 的檔頭 | 容量上限 | 不是漏洞（0.9） | 記錄。超過 500 道有永久編號的題目時，生成器與 CI 都不阻擋，超出 Cloudflare 2,000 條靜態規則的部分會失效。spec 0008 的 Out of Scope 已明定不強制檢查（G8 只要求檔頭寫明上限）。容量因每題四條規則而從約 1,049 題降到 500 題。 |
| S-3 | 新增的 `/en/c/:slug`、`/zh-TW/c/:slug` | 路徑命名空間 | 不是漏洞（0.85） | 記錄。這兩條規則接手了 `/en/c/`、`/zh-TW/c/` 底下所有一段長的路徑；fork 若在 `platform/en/c/` 或 `platform/zh-TW/c/` 放頁面會被遮蔽。目標固定在同源的題目路徑，`/c/:slug`、`/zh/c/:slug` 原本就是同樣的機制。 |
| S-4 | 編號規則排在參數化規則之前 | 規則遮蔽 | 不是漏洞（0.85） | 記錄。純數字 slug（例如 `005`）若等於另一題補零後的編號，`/en/c/005` 會先命中編號規則，開到另一題。slug 文法允許純數字；這是既有問題，這次從兩種形式擴大到四種。 |
| S-5 | `pre-commit.sh` 的 W4 迴圈 | 終端機輸出 | 不是漏洞（0.85） | 記錄。untracked 目錄名稱含換行或控制字元時，會原樣輸出到老師自己的終端機。`$dir` 都有加引號，不會被 word splitting、glob 或注入；「偽造一筆繁中分支」不成立，因為單一路徑元件不能含 `/`，迴圈也排除了兩層以上的路徑。這是既有行為。 |
| S-6 | `pre-commit.sh` 的 W4 迴圈 | 告知遺漏 | 不是漏洞（0.88） | 記錄。整棵繁中樹都 untracked 時，W4 不會點名任何目錄。這和 ticket 第 6 階段的 Spec F8 是同一件事，已記錄給使用者，判定為 T-0056 之前就存在。 |
| S-7 | `shortLink.ts` 的 `shortLinkPath` | 語系偏好（B4） | 不是漏洞（0.95） | 記錄。`/en/c/NNN` 對偏好是繁中或沒有偏好的學習者，仍會帶到繁中翻譯；`/zh-TW/c/NNN` 開到繁中頁時會寫入偏好。兩者都是 D5、D6 明定的行為，B4 允許任何連結把偏好設成 `zh-TW`，README 也已寫明。 |
| S-8 | `shortLink.ts` 的 `SITE_ORIGIN` | 設定 | 不是漏洞（0.9） | 記錄。fork 沒有設定 `SITE_ORIGIN` 卻用 Cloudflare Pages 建置時，複製出來的連結會開到上游網站。這是 B3 與 epic 0007 D10 已知的代價，這次只改了路徑形式。 |
| S-9 | `ShortLinkShare.vue` 的 `entryLocale` | 輸入驗證 | 不是漏洞（0.95） | 記錄。必填 prop 沒有執行期驗證，呼叫端漏傳時 page 模式會給英文頁網址。三個呼叫端都有傳；屬於正確性問題，`ShortLinkShare.test.ts` 的交叉案例與 N01–N03 的 props 斷言已經守住。 |

## 檢查

第 7 階段沒有修改任何檔案。第 6 階段修正後的狀態（工作樹在 `fd2ef09` 上）：

| 檢查 | 結果 |
|---|---|
| `npx vitest run` | 135 檔，4793 項通過，1 項略過 |
| `npx vue-tsc --noEmit -p tsconfig.json` | 107 個錯誤，與 `fd2ef09` 相同 |

## 沒有涵蓋的範圍

- 沒有在 Cloudflare Pages 上驗證 `:slug` 擷取編碼點段（`%2e%2e`）、`%2F` 的實際行為，也沒有驗證 redirect 與同路徑靜態檔的優先順序。S-3 的結論只依目標前綴固定推論。
- 沒有做相依套件掃描（這次沒有新增套件），也沒有評估 DoS 與 rate limiting。
- 跨 ticket 的串連分析留到 epic 收尾，依 `docs/agents/review.md` 進行。
