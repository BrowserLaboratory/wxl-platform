# Stage 7 安全審查：T-0054（冷載入只導向存在的翻譯、只有明確選擇才寫入偏好）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0054/cold-load-redirect-and-preference-writes`
- base（main）＝ merge-base ＝ HEAD：`d05976ebd45fc9e1f93cc2c9adc09d20ccbe5547`
- committed 層：空的（尚未 commit）；staged 層：空的；untracked：無
- pending 層：`git diff HEAD` 涵蓋的 18 個 tracked 檔，擷取時間在第 6 階段的修正之後
- 受審的產品程式碼：`.vitepress/theme/index.ts`、`.vitepress/theme/composables/useArrivals.ts`、`.vitepress/theme/i18n/{index,pages,arrival}.ts`；`localStorageKeys.ts`、`useSessionGate.ts` 只改了註解
- 測試、文件、ticket 與 spec 只當作脈絡閱讀

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0008 的信任邊界 B1–B5 為準，並套用 ADR-0005 與 ADR-0006。這次變更沒有碰到任何題目刻意保留的弱點。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 `harness-reviewer` | 列出全部候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立的 `harness-reviewer`，共 9 位 | 逐步對照程式碼核對候選描述的流程 |

以 workflow `wf_7086a524-e48` 執行。所有結論都是讀程式碼得出的，沒有在瀏覽器上驗證。

## 結論

**沒有成立的安全漏洞。** 9 項候選經獨立檢查，全部判定為「不是漏洞」。

第一關特別追過 open redirect，結論是不成立：

- 冷載入導向與 not-found 導向的目標，都是 base 加上頁面清單的項目（`targetUrl`，`pages.includes` 區分大小寫），再經 `router.go`。
- 網址的路徑不再參與目標的組成。query 與 hash 原樣保留，經 VitePress 的 `normalizeHref` 後只剩同源的 path、query、hash。
- theme 裡沒有任何地方把 query 或 hash 顯示到畫面上（`v-html`、`location.search`、`location.hash` 都搜尋過）。

## 候選與處置

| # | 位置 | 類別 | 獨立判斷 | 處置 |
|---|---|---|---|---|
| S-1 | `useArrivals.ts` `recordColdLoad`；`i18n/index.ts` `shouldPersistOnColdLoad` | 偏好值寫入條件 | 不是漏洞（0.85） | 記錄。`/zh-TW_challenges`、`/zh-TW%2Fchallenges` 這類網址會讓 router 顯示 `zh-TW/challenges.md`，於是寫入 `zh-TW`，介面語系卻依網址是 `en`。這符合 D16（依 router 顯示的頁面決定），能做到的事也沒有超過 B4 已經允許的「任何連結都能把偏好設成 `zh-TW`」。第 6 階段 Spec F14 的處置補記 `%2F` 這個變體。 |
| S-2 | `useArrivals.ts` `release` | 導覽競態 | 不是漏洞（0.8），屬功能正確性 | 已修。學習者點的連結還在下載 chunk、網址列已經換掉時，gate 放行不再套用冷載入導向。測試：`not-found-wiring.test.ts`「does not redirect when a navigation the learner started is still loading」（修改前是紅燈）。 |
| S-3 | `useArrivals.ts` `release` | 到達的身分 | 不是漏洞（0.85），屬功能正確性 | 已修。只要發生過任何後續到達，冷載入導向就作廢，包括回到同一個路徑。測試：「does not apply the cold-load redirect after the learner left the page and came back」（修改前是紅燈）。 |
| S-4 | `useArrivals.ts` `release`；`i18n/index.ts` | 跨分頁／跨靶場共用 | 不是漏洞（0.85） | 記錄。`release` 在同一個同步呼叫裡讀兩次偏好值；另一個分頁或同一個 GitHub Pages owner 的另一個靶場可以改變這個值。跨靶場共用是既有的 OQ-018，B3 已經承認。 |
| S-5 | `theme/index.ts` `onMounted` | session gate 的保留範圍 | 不是漏洞（0.92） | 記錄。偏好值在 gate 回答之前寫入，`wxl-locale` 也不受 clear 影響。B5 只要求導向與提示那一行要等 gate，這和改版前的順序相同。 |
| S-6 | `pages.ts` `targetUrl` | 路徑組裝 | 不是漏洞（0.85） | 記錄。原始檔名含 `%`、`#`、`?` 時，目標沒有逐段編碼，可能導到 not-found。只有能控制建置輸入的人（老師、fork 的維護者）做得到，而且 `notFoundRedirect` 從 T-0053 起就是同樣的寫法。屬於穩健度問題，不在這張票的範圍。 |
| S-7 | `i18n/index.ts` `shouldPersistOnColdLoad` | published 的定義 | 不是漏洞（0.9） | 記錄。寫入時把「router 顯示得出來」當成 published，沒有再比對頁面清單。目前的樹裡沒有 router 顯示得出來、清單卻沒列的頁面。 |
| S-8 | `theme/index.ts` `onMounted` | 例外中斷頁面 | 不是漏洞（0.92） | 記錄。`recordColdLoad` 如果拋出例外，gate 就不會執行；但沒有任何路徑會讓它拋例外（`persistLocale` 與 `readStoredLocale` 都有 try/catch），而且這個先後順序改版前就存在。 |
| S-9 | `pages.ts` `targetUrl` | query／hash 處理 | 不是漏洞（0.92） | 記錄。hash 的編碼不合法時，VitePress 的 `decodeURIComponent` 會拋出例外。這是 VitePress 既有的問題，改版前冷載入導向也同樣保留 hash。 |

## 修正後的檢查

修正 S-2、S-3 之後，在 `d05976e` 上的工作樹執行：

| 檢查 | 結果 |
|---|---|
| `npx vitest run tests/unit/i18n/` | 333 項通過 |
| `npx vitest run` | 135 檔，4771 項通過，1 項略過 |
| `pnpm docs:build && npx playwright test --config playwright.site.config.ts` | 79 項通過 |
| `npx vue-tsc --noEmit -p tsconfig.json` | 107 個錯誤，與修正前相同 |

## 沒有涵蓋的範圍

- 沒有在瀏覽器或建置後的網站上驗證 S-1 的 `%2F` 與大小寫變體。Cloudflare Pages、GitHub Pages 是否回 404.html、是否正規化 `%2F`、是否區分大小寫，都只是推論。
- 沒有做相依套件掃描（這次沒有新增套件），也沒有評估 DoS 與 rate limiting。
- 跨 ticket 的串連分析留到 epic 收尾，依 `docs/agents/review.md` 進行。
