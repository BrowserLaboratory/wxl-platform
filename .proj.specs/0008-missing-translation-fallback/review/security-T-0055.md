# Stage 7 安全審查：T-0055（語系切換在沒有該語系版本時留在原頁）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0055/one-locale-switcher-that-stays`
- base（main）＝ merge-base ＝ HEAD：`e4fdb46`
- committed 層：空的（尚未 commit）；staged 層：空的；untracked：無
- pending 層：`git diff HEAD` 涵蓋的 20 個 tracked 檔，擷取時間在第 6 階段的修正之後
- 受審的產品程式碼：`.vitepress/theme/components/LocaleSwitcher.vue`、`.vitepress/theme/composables/useArrivals.ts`、`.vitepress/theme/index.ts`、`.vitepress/theme/i18n/{arrival,index,missingTranslation}.ts`
- 指南頁面、測試、ticket 與 traceability 只當作脈絡閱讀

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0008 的信任邊界 B1–B5 為準，並套用 ADR-0005 與 ADR-0006。這次變更沒有碰到任何題目刻意保留的弱點。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 `harness-reviewer` | 列出全部候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立的 `harness-reviewer`，共 11 位 | 逐步對照程式碼核對候選描述的流程 |

以 workflow `wf_f6cc0740-9bd` 執行。所有結論都是讀程式碼得出的，沒有在瀏覽器上驗證。

## 結論

**沒有成立的安全漏洞。** 11 項候選經獨立檢查，全部判定為「不是漏洞」。

第一關特別追過站外導向，結論是不成立：

- 頁面上的選擇，目標路徑一律取自頁面清單（`switcherDecision` 用 router 實際顯示的頁面的清單項目，必須在清單裡）。
- not-found 頁或 failed load 上的選擇，經 `lookupNotFound` 查找：路徑解碼一次，拒絕 `//`、`\`、`..`，結果也必須等於清單項目。
- 目標由 `targetUrl` 組成：site base、清單項目、原樣保留的 query 與 hash，再經 VitePress 的 `normalizeHref` 只剩同源的 path、query、hash。改版前的選單是用網址文字組目標，這次攻擊面反而縮小。

## 候選與處置

| # | 位置 | 類別 | 獨立判斷 | 處置 |
|---|---|---|---|---|
| S-1 | `arrival.ts` 的 `switcherDecision`；`pages.ts` 的 `targetUrl` | 導覽目標 | 不是漏洞（0.95） | 記錄。如上：只會導到同源、已發布的頁面。 |
| S-2 | `useArrivals.ts` 的 `choose` | 例外 | 不是漏洞（0.92） | 記錄。hash 編碼不合法時，VitePress 的 `router.go` 會 reject，成為 unhandled rejection；頁面本身已換好。這是 VitePress 既有的問題，T-0053 S-6、T-0054 S-9 已記錄，改版前的選單也一樣。 |
| S-3 | `useArrivals.ts` 的 `choose` 與提示那一行 | session gate（B5） | 不是漏洞（0.92） | 記錄。選單的選擇在 gate 詢問時就寫入偏好、作廢冷載入導向，提示那一行也立刻出現。這是 D17 明定的行為；寫入在改版前就不等 gate。那一行只顯示學習者自己選的語系，不會洩漏前一位學習者的任何資料；gate 是不擋 pointer 的 dialog（ADR-0006）。 |
| S-4 | `arrival.ts` 的 not-found 分支 | 偏好寫入（B4） | 不是漏洞（0.88） | 記錄。構造的 `/zh-TW%2Fno-such` 讓 VitePress 把 not-found 頁算成英文頁，選單於是提供「繁體中文」，選了之後依查找演算法導到英文的 `/no-such`，偏好寫成 `zh-TW`。能做到的事沒有超過 B4 已允許的「任何連結都能把偏好設成 `zh-TW`」，結果也只會是同源、已發布的頁面。B7 寫的是依路徑查找，不論選了什麼。 |
| S-5 | `i18n/index.ts` 的 `rememberedChoice` | 偏好值優先順序（B4） | 不是漏洞（0.88） | 記錄。storage 拒絕寫入時，記憶體值會優先於其他分頁之後寫入的值，直到這個分頁重新整理或再次成功寫入。這是 D14 的讀取順序（使用者核准的計畫寫明）；能塞滿 quota 的同源程式碼本來就能直接寫 `wxl-locale`（B3、OQ-018）。 |
| S-6 | `useArrivals.ts` 的 `choose` | 跨靶場共用（B3） | 不是漏洞（0.92） | 記錄。每次選擇都寫入同一個 GitHub Pages owner 底下各靶場共用的 `wxl-locale`。改版前每次切換也寫入；B3 已經承認。 |
| S-7 | `useArrivals.ts` 的 `choose` | 導覽競態 | 不是漏洞（0.85），屬功能正確性 | 記錄。導覽進行中（網址已換、頁面還沒換）做選擇時，可能依舊頁決定目標，或在落地頁依 carry 顯示那一行。只會停在同源、已發布的頁面，下一次到達就正確。 |
| S-8 | `LocaleSwitcher.vue` 的 `select` | 介面語系 | 不是漏洞（0.93） | 記錄。runtime locale 在導覽完成前設定；導覽被取代且 route 沒變時，介面語系可能和網址不一致。目標的語系必然和目前網址不同，很難觸發。 |
| S-9 | `LocaleSwitcher.vue` 的 `inject` | provide 覆寫 | 不是漏洞（0.95） | 記錄。`LOCALE_CHOICE` 是模組內的 `Symbol`，只有 import 它的程式碼能 provide；全 repo 只有 Layout 一處。 |
| S-10 | `pages.ts` 的 `targetUrl` | 路徑組裝 | 不是漏洞（0.9） | 記錄。清單項目沒有逐段編碼，T-0054 S-6 已記錄；這次選單也用了同一個函式。 |
| S-11 | `LocaleSwitcher.vue`、提示那一行 | XSS | 不是漏洞（0.97） | 記錄。選項只來自兩個語系代碼，標籤來自固定的訊息 key，Vue 會跳脫輸出。 |

## 檢查

第 7 階段沒有修改任何檔案。第 6 階段修正後的狀態（工作樹在 `e4fdb46` 上）：

| 檢查 | 結果 |
|---|---|
| `npx vitest run` | 135 檔，4824 項通過，1 項略過 |
| `pnpm docs:build && npx playwright test --config playwright.site.config.ts` | 86 項通過 |
| `npx vue-tsc --noEmit -p tsconfig.json` | 107 個錯誤，與 `e4fdb46` 相同 |

## 沒有涵蓋的範圍

- 沒有在瀏覽器或 Cloudflare Pages 上驗證 S-4 的 `%2F` 路徑、S-7 的競態與 S-2 的 rejection。
- 沒有做相依套件掃描（這次沒有新增套件），也沒有評估 DoS 與 rate limiting。
- 跨 ticket 的串連分析留到 epic 收尾，依 `docs/agents/review.md` 進行。
