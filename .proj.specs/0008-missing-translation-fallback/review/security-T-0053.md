# Stage 7 安全審查：T-0053（缺翻譯的 404 保底與提示那一行）

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0053/not-found-fallback-and-the-line`
- base（main）＝ merge-base ＝ HEAD：`5d3c1739dffae053a2eea2ad2396ba880cf871d2`
- committed 層：空的（尚未 commit）
- pending 層：`git diff HEAD` 涵蓋的 14 個 tracked 檔，加上 35 個 untracked 新檔
- 受審的產品程式碼：`.vitepress/config.mts`、`.vitepress/pageList.ts`、`.vitepress/theme/index.ts`、`.vitepress/theme/composables/useArrivals.ts`、`.vitepress/theme/i18n/{index,pages,lookup,arrival,publishedPages,missingTranslation}.ts`、兩個訊息檔、`MissingTranslationLine.vue`、`ChallengeLayout.vue`、`env.d.ts`
- 測試與文件只當作脈絡閱讀，不在審查範圍內
- 擷取時間：2026-11-05，第 6 階段的修正之後

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0008 的信任邊界 B1–B5 為準，並套用 ADR-0005（題目刻意保留的弱點不算發現）與 ADR-0006（session gate 是提示，不是存取控制）。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位 `harness-reviewer` | 列出全部候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 另外兩位獨立的 `harness-reviewer` | S-1～S-3 一位、S-4～S-6 一位，逐項核對程式碼 |

所有結論都是讀程式碼得出的，沒有在瀏覽器上驗證。

## 結論

**沒有成立的安全漏洞。** 6 項候選經獨立檢查，全部判定為「不是漏洞」，其中兩項的部分主張是誤報。

第一關特別追過 B2 的 open redirect，結論是不成立。理由：

- 轉址目標一律是 base 加上頁面清單的項目，`SITE_BASE` 在 `config.mts` 有 regex 驗證。
- VitePress 的 `normalizeHref` 只取 pathname、search 和 hash。
- `pathCandidates` 會擋掉 `//`、`\`、`..`；解碼失敗時回空陣列，不會丟例外。

## 候選與處置

| 候選 | 位置 | 第一關嚴重度 | 獨立判定 | 最終安全嚴重度 | 處置 |
|---|---|---|---|---|---|
| S-1 頁面清單收進點開頭的 `.md` 檔，這類檔案 VitePress 不會發布 | `.vitepress/pageList.ts` | Low | 不是漏洞。行為屬實：外洩的只有可信建置輸入的檔名；最差情況是同源的 failed-load 404 | none | 見下方「待裁決」U15 |
| S-2 冷載入在 router 解析前就寫入偏好，載入失敗的已列出頁面也會寫入 `zh-TW` | `.vitepress/theme/i18n/index.ts`、`theme/index.ts` 的 `enhanceApp` | Low | 不是漏洞。不是這次引入的（寫入範圍反而縮小了），且已依計畫延到 T-0054（W2） | none | 延後到 T-0054，該票要為 failed load 寫獨立測試 |
| S-3 watcher 不再寫入偏好後，在 T-0055 翻轉旗標之前，VitePress 內建語系選單的選擇不會被記住 | `.vitepress/theme/index.ts` | Low | 不是漏洞，但**是本變更引入的正確性回歸**（中度）；`index.ts` 開頭旗標的註解也過時了 | none（正確性：中） | 註解在 T-0053 修；空窗期見下方「待裁決」U14 |
| S-4 `released` 只放行一次，之後的站內 not-found 導向不再對照 gate | `.vitepress/theme/composables/useArrivals.ts` | Low | 不是漏洞。依 A6 的語意，不提出 gate 的頁面在檢查結束時就算放行；只有在清除失敗後才會出現順序差異 | none | 只記錄 |
| S-4b（第二關新發現）題目頁的 gate 還在詢問時，從頁內連結走到不存在的翻譯網址，不會被救回 | `useArrivals.ts` | — | 正確性缺口，不是漏洞（Low／P2）。結果和改動前相同，都是顯示找不到頁面 | none | 見下方「待裁決」U16 |
| S-5 冷載入導向仍然用網址文字組出目標，不是清單項目 | `useArrivals.ts` → `redirectTargetForStoredLocale` | Low | 不是漏洞。改動前就有；結果永遠同源。「大小寫變體會變成 404」是誤報（VitePress 以小寫查詢） | none | 延後到 T-0054（A 列），測試計畫要補別名與大小寫的案例 |
| S-6 `redirect()` 沒有處理 `router.go` 的 rejection | `useArrivals.ts` | Low／資訊 | rejection 屬實，但不是漏洞。「存在的頁面會被顯示成 404」是誤報：route 已先設定好，頁面照常顯示 | none | 只記錄 |

## 待使用者裁決

- **U14（S-3）**：T-0053 單獨進 `main` 後，正式站在 T-0055 落地之前，文章頁內建選單的語言選擇不會被記住。選項：
  - (a) 接受這段空窗，並記錄下來。
  - (b) 把 D7（翻轉 `USE_CUSTOM_LOCALE_SWITCHER`，三個內建選單都用不依賴執行期的 CSS 隱藏）提前到 T-0053。這樣每一頁都用 `LocaleSwitcher`，它本來就會寫入選擇。B 列的「找不到翻譯時停在原頁」仍留在 T-0055；這段期間選到沒有翻譯的語系，會先到 404，再由 C1 救回。
  - (c) T-0053 先不合併，等 T-0054、T-0055 好了一起合併。
- **U15（S-1）**：在 `pageList.ts` 也略過點開頭的檔案，與 VitePress 一致；同時把 traceability 的 oracle 定義改成排除點開頭的路徑。
- **U16（S-4b）**：站內走到 not-found 時，只要這一頁本身沒有在詢問 gate，就直接救回，不必等第一次放行。

## 未涵蓋

- 相依套件掃描：這次改動沒有新增相依套件。
- 可用性與 DoS。
- 既有、不屬於本次改動的問題：
  - `redirectTargetForStoredLocale` 的 `startsWith(prefix)` 沒有檢查段落邊界。
  - 網址帶畸形 hash 時，VitePress 初始載入就會失敗。
  - 同一個 owner 的 GitHub Pages 靶場共用 `wxl-locale`（OQ-018）。
- 第二關順帶看到、與安全無關的頁面清單邊界：
  - 符號連結的 `.md` 會被 VitePress 發布，但清單漏列。
  - 動態路由 `[param].md` 會被原樣列入清單。
  - `platform/public/*.md` 可能會被 VitePress 發布。
  - 目前的樹裡這三種檔案都沒有。

本報告不宣稱整個專案是安全的；它只涵蓋上述範圍與方法。

## 處置結果（2026-11-05）

使用者裁決 U14～U16 都照建議：

- **U14**：採用 (b)。D7 隨 T-0053 落地，旗標直接移除。每一頁都用 `LocaleSwitcher`，三個內建選單以不依賴 script 的 CSS 隱藏。建置後網站的測試在 1280、1024、375 寬與停用 script 的情況下都驗過，拿掉規則重建後四項全部變紅。
- **U15**：頁面清單與 oracle 都略過點開頭的路徑（traceability 第 3.1 版）。
- **U16**：上一頁的 gate 還在詢問時，只要 not-found 頁本身沒有被 gate 擋住，就直接救回。

修正後的檢查（工作目錄，基準 `5d3c173`）：

| 檢查 | 結果 |
|---|---|
| 單元測試 | 135 檔，4630 項通過 |
| site-smoke | 75 項通過 |
| `vue-tsc` | 錯誤數與修正前相同 |

## 更正（2026-11-05，T-0054 第 6 階段）

S-5 列在「誤報」的理由「VitePress 以小寫查詢」在 production bundle 上不成立。router 查 hash map 時會轉成小寫（`node_modules/vitepress/dist/client/app/utils.js:41`），但下載 chunk 時保留原本的大小寫（同檔 `:50`），靜態主機找不到那個檔。所以 `/Challenges` 在 `vitepress preview` 上回 404，顯示找不到頁面，冷載入導向根本不會執行。結論不變（不是漏洞），只是理由不同：大小寫變體在建置後網站上本來就不是頁面。重現方式與紀錄見 T-0054 ticket 的 stage 6 處置。
