# 串連分析：epic 0004（無狀態的 fork-init 引擎與靶場 CI）

日期：2026-10-16。依 `docs/agents/review.md` 的「Epic close-out: chain analysis」執行。

## 範圍與方法

- **程式碼基準**：`main` = `c142833`（T-0017 合併後）。分析時的分支指向同一個 commit（後來改名為 T-0018 的分支）；分析期間唯一的 pending 變更是 T-0017 ticket 的合併紀錄（Markdown），沒有程式碼變更，因此行號對應 `c142833`。
- **epic 起點**：`c0f7edf`（`git log --oneline -1 1e5bce4~1`）。
- **合併順序**：

  | Ticket | 合併 commit |
  |---|---|
  | T-0010 | `1e5bce4` |
  | T-0012 | `0534e42` |
  | T-0013 | `41e2bf5` |
  | T-0014 | `5225193` |
  | T-0015 | `1f4096a` |
  | T-0011 | `ba095c5` |
  | T-0016 | `30474aa` |
  | T-0017 | `c142833` |

- **輸入**：
  - `review/security-T-0010.md`～`security-T-0017.md` 的全部候選，含駁回項、已知限制與規格觀察。
  - `spec.en.md`：Trust Boundaries and Threat Model（B1–B5）、Out of Scope。
  - `traceability.md`（2.2 版）。
  - `OPEN-QUESTIONS.md` 的 OQ-004、OQ-005、OQ-016～OQ-019。
  - ADR-0005、ADR-0006。
  - 合併後的程式碼：`scripts/fork-init.ts`、`tests/unit/scripts/upstream-guard.test.ts`、`tests/unit/workflows/upstream-only-jobs.test.ts`、`.github/workflows/*.yml`、`scripts/templates/deploy.yml.template`、`.vitepress/config.mts`、`.vitepress/challenge/shortLink.ts`、`.vitepress/theme/index.ts`、`.vitepress/theme/layouts/ChallengeLayout.vue`、`.vitepress/theme/components/ShortLinkShare.vue`、`platform/public/challenge-sw.js`。
  - 已安裝的 `vitepress` 套件中，負責渲染站名的元件。
- **分工**：
  - 一個 `harness-reviewer` 做分析，唯讀。沒有執行程式、沒有開瀏覽器，也沒有呼叫 GitHub。
  - 一個 `harness-challenger` 獨立挑戰結論（見文末）。
  - 主 session 補上 git 範圍。
- **標記方式**：
  - 「讀碼驗證」：逐行讀過程式碼確認。
  - 「推論」：依賴瀏覽器、GitHub 平台的行為，或沒有直接證據。

## 信任邊界

spec 已有信任邊界段落（`spec.en.md:235-243`）。本分析沿用 B1–B5，另補上兩條既有邊界，以及攻擊者模型。

| 邊界 | 內容 | 本分析的判斷依據 |
|---|---|---|
| B1 | CLI 參數 → site 建置所用的原始碼與終端機 | 「老師刻意改自己的原始碼」在模型外 |
| B2 | 引擎 → 老師自己的內容與平台歷史 | 符號連結、hard link、同時執行兩次在模型外 |
| B3 | 上游 repository → 老師的 repository（CI） | 上游組織改名在模型外 |
| B4 | 設定好的靶場 → 上游（在上游誤跑引擎） | 不保護「CI 執行前的本機 commit」 |
| B5 | 部署的靶場 → 學習者 | 明列不保護：同一個 owner 的 GitHub Pages 靶場共用 origin、儲存空間與全站清除，user site 的 SW 可涵蓋專案站（OQ-018） |
| （B0） | 題目 runtime vs. 平台（ADR-0005） | 依各報告的審查範圍，本 epic 沒有改 `platform/challenge/*/src/`（推論，未逐檔比對 diff） |
| （G） | session gate 的威脅模型（ADR-0006） | 判斷依據是歸屬與報告的真實性，不是機密性 |

攻擊者模型：

- **能 commit 進靶場或上游的人**：本來就能執行任意程式碼，不算跨越。
- **外部 GitHub 使用者**：可以送 fork PR、註冊空出來的帳號名稱。
- **同一個 owner 底下其他 repository 的管理者**：例如一個組織裡有多位老師。
- **供應鏈**：相依套件與 action。

## 輸入：八份報告的全部候選

| ID | Ticket | 原判定 | 機制摘要 | 處置 |
|---|---|---|---|---|
| C1 | T-0010 | Low，駁回 | 範本在 workflow 層級授予 `pages: write`、`id-token: write` | 既有 hardening 建議 |
| C2 | T-0010 | Low，駁回 | checkout 保留 token | 既有 hardening 建議 |
| C3 | T-0010 | Low，駁回 | 同一個 owner 的 GitHub Pages 靶場共用 origin；SW 不檢查 `REGISTER_CHALLENGE` 的寄件者 | B5、OQ-018；本票讓這類靶場可能變多 |
| C4 | T-0010 | Low，駁回 | `--base` 收成字面值；`BASE_RE` 接受 `/../` | 已由 T-0014 承接 |
| C5 | T-0010 | Low，駁回 | Rust stable 浮動；apt 的 binaryen 沒釘版 | 既有供應鏈 hardening 建議 |
| 01、02、03、04 | T-0011 | 屬實、非資安 | latin1 視窗；`git ls-files` 失敗；manifest 豁免太寬；A7 用錯解析規則 | 已修 |
| 05、06 | T-0011 | 駁回 | regex 的 `g` flag；T52 只驗單數 | — |
| 07、08 | T-0011 | 屬實、非資安 | expectation check 抽成函式；job 集合的斷言 | 已修 |
| 09 | T-0011 | 駁回 | 跨 OS job 保留 token、沒有 timeout | — |
| 10 | T-0011 | 駁回 | 同 owner/name 的鏡像會通過 `if:` | 規格觀察，留給本分析 |
| 11 | T-0011 | 駁回 | release 沒有設 `WXL_EXPECT_UPSTREAM` | 規格觀察，留給本分析 |
| 12 | T-0011 | 駁回 | 在 tree 放偽造的 `git` | — |
| 13、15 | T-0011 | 屬實、非資安 | submodule 讀檔；每處各報一筆 | 已修 |
| 14 | T-0011 | 屬實、非資安 | 巢狀 work tree 誤判，`pnpm test` 誤紅 | 已知限制 |
| 16、17 | T-0011 | 駁回 | 資源用量；guard 只防意外 | — |
| 1 | T-0012 | P2 | 未知旗標原文回顯（ESC） | 已修 |
| 2 | T-0012 | 駁回 | `JSON.stringify` 不跳脫 bidi、C1 | — |
| 3～7 | T-0012 | 駁回或非資安 | `--` 提示、EISDIR、有損 UTF-8、訊息用字、測試 harness | 部分已修 |
| C1 | T-0013 | 駁回 | 暫存檔若是 symlink，寫入會跟隨 | 已強化（先 unlink） |
| C2、C3、C4、C10 | T-0013 | 屬實、非資安 | 全部算完才寫；絕對路徑；暫存檔殘留；測試 | 已修 |
| C5～C7、C9、C11 | T-0013 | 駁回 | rename 語意、權限、CR、稽核紀錄 | — |
| C8 | T-0013 | 駁回 | 過渡期改寫 base | 已由 T-0014 取代 |
| 01、09 | T-0014 | 屬實、非資安 | `derivesSiteBase` 拋 TypeError；刪除失敗的用字 | 已修 |
| 05 | T-0014 | 屬實、非資安 | config 有損 UTF-8 | 已由 T-0015 候選 04 解除 |
| 06 | T-0014 | 屬實、跨 ticket | `--rebrand` 加 `--host` 尚未被拒 | 已由 T-0015 的 T50 關閉 |
| 02～04、07、08、10 | T-0014 | 駁回 | rebrand 讀 config、A9 字面值、T82 回顯、單數步驟、單行、TOCTOU | — |
| 01、02、04 | T-0015 | 屬實、非資安 | 跳脫解析無窮迴圈；frontmatter 起點；位元組保真 | 已修 |
| 03 | T-0015 | 駁回 | C1、bidi 回顯 | — |
| 05 | T-0015 | 屬實、非資安 | A7 多行或 alias 寫法 | 已知限制（build 失敗） |
| 06 | T-0015 | 駁回 | 直接呼叫 `runForkInit` 時不擋 `<`、`>`、`&` | 缺少 hardening |
| 07 | T-0015 | 駁回 | T42 不是實際 build | 由 T74 涵蓋 |
| 01～04、07～11 | T-0016 | 文件不符、非資安 | README、skill、OQ 的描述 | 已修 |
| 05 | T-0016 | P2 | OQ-018 的 SW scope 前提錯誤；user site 的 scope 涵蓋專案站 | 已修 OQ-018 |
| 06 | T-0016 | 駁回 | 殘留檢查的範圍 | — |
| 01、02 | T-0017 | 屬實、非資安 | destroy 斷言；T85 措辭 | 已修 |
| 03 | T-0017 | 駁回 | 推測性時序 | — |
| 04、05 | T-0017 | 屬實、非資安 | 沒有 try/finally；happy-dom 註解 | 記錄 |

另列入的已知限制：

- B1～B5 的「不保護」與「模型外」欄。
- Out of Scope 中與本分析有關的項目：
  - OQ-016：GitHub Pages 的短連結 404。
  - OQ-018：同一個 owner 的靶場無法隔離。
  - rebrand 模式的已知限制。
  - 不帶 `--host` 會重新裝回 workflow。
- OQ-017（第 8 階段的非瀏覽器 harness）、OQ-019（release notes）。

## 候選串連

### 鏈 A：user site 的 SW 涵蓋同一個 owner 的專案站，跨靶場轉送題目請求（B5，靶場 ↔ 靶場）

組成：T-0010 C3、T-0016 候選 05、T-0014 與 T-0015 的 `--host github-pages` 自動化，以及 OQ-018。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | user site 靶場的 base 是 `/`：範本以 `SITE_BASE: ${{ steps.pages.outputs.base_path }}/` 建置（`scripts/templates/deploy.yml.template:96-103`），user site 的 `base_path` 是空字串（`spec.en.md:170-172`） | 範本讀碼驗證；GitHub 的值引自 spec 的查證 |
| 2 | SW 以 `${BASE_URL}challenge-sw.js` 註冊，沒有 `scope` 選項（`.vitepress/theme/index.ts:252-256`），所以 user site 的 scope 是 `/` | 讀碼驗證 |
| 3 | 同一個 owner 的專案站靶場 B 在 `/<repo>/` 底下。B 自己的 SW 啟用前，B 的頁面落在 A 的 scope `/` 內，由 A 的 SW 控制 | 推論（瀏覽器的 SW scope 比對） |
| 4 | B 的頁面以 `navigator.serviceWorker.ready` 取得 registration 後送出 `REGISTER_CHALLENGE`（`ChallengeLayout.vue:637-645`）。`ready` 可能解析成 A 的 registration，而且之後不再改變 | 程式碼讀碼驗證；`ready` 的語意屬推論 |
| 5 | SW 接受任何同源寄件者的 `REGISTER_CHALLENGE`，registry 只以 slug 為 key（`challenge-sw.js:16`、`:105-108`） | 讀碼驗證 |
| 6 | 找不到 registry 時，SW 廣播給所有同源 window client，包含不受它控制的頁面（`challenge-sw.js:155-158`）。頁面只比對 slug（`ChallengeLayout.vue:709-713`） | 讀碼驗證 |
| 7 | 兩個靶場有同名題目（都從上游 fork 來）時，A 的頁面對 `challenge-<slug>.localhost` 的請求可能轉給 B 的 runtime；或者 B 在 A、B 兩個 SW 之間反覆重建 channel，最後得到 503 | 推論 |
| 8 | 本 epic 的貢獻：`--host github-pages` 自動安裝 workflow 並推導 origin（`fork-init.ts:1440-1441`、`:1554-1567`、`:1075-1080`），這類靶場會變多 | 讀碼驗證 |

- **攻擊者需要什麼**：完整性與可用性的影響不需要攻擊者，同一位學習者開兩個分頁就會發生。惡意版本需要控制 `<owner>.github.io` 這個 repository，但那本來就取得整個 origin 的儲存空間，也能部署任意 SW，已在 B5 的「不保護」之內。
- **判定**：不構成新的串連。B5 已接受同 origin 的完全共用。步驟 4～7 是 OQ-018 尚未記錄的面向（N-1）。
- **信心**：機制 0.35（時序與 `ready` 的語意都未重現）；判定 0.75。

### 鏈 B：user site 靶場的短連結落到同一個 owner 的其他 Pages 網站（B5，以及 User Story 4）

組成：OQ-016、T-0015 的 T37、`shortLink.ts` 的路徑形式。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | `--repo <owner>/<owner>.github.io` 推導出的 origin 不帶路徑：`https://<owner>.github.io`（`fork-init.ts:1078`） | 讀碼驗證 |
| 2 | 短連結的路徑是 `/c/NNN` 或 `/zh/c/NNN`（`shortLink.ts:49-57`），複製的是完整 URL（`ShortLinkShare.vue:42`、`:56`） | 讀碼驗證 |
| 3 | 只有 Cloudflare Pages 讀 `_redirects`，GitHub Pages 上的短連結不會解析（`OPEN-QUESTIONS.md:558-561`） | 讀 OQ-016 |
| 4 | 同一個 owner 底下若有名為 `c` 或 `zh` 的 repository 並啟用 Pages，`<owner>.github.io/c/...` 由那個專案站提供，而不是 user site 的 404 | 推論（GitHub Pages 的路徑優先順序） |

- **攻擊者需要什麼**：同一個 owner 底下一個名為 `c` 或 `zh`、啟用 Pages 的 repository。在多位老師共用的組織裡，那可能是另一位管理者。
- **跨越**：同一個 owner、同一個 origin，B5 本來就不保護。但 User Story 4 說講義「never sends a class elsewhere」，OQ-016 只說「404」，對 user site 不精確。專案站的短連結在自己的路徑下，不受影響。
- **判定**：需要使用者裁決。傾向不開 ticket，在 OQ-016 補記 user site 的情況。
- **信心**：0.45。

### 鏈 C：同 owner/name 的鏡像通過 upstream-only 的 `if:`（B3）

組成：T-0011 候選 10。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | `release` 與 `fork-init-cross-os` 只比對 `github.repository`（`release.yml:19`、`quality-gates.yml:296`） | 讀碼驗證 |
| 2 | GHES、Gitea 或 ghe.com 上，owner/name 和上游相同的 repository 會得到同樣的 `github.repository` | 推論 |
| 3 | release job 在建立 release 之前執行 `pnpm test --run`（`release.yml:65-66`，早於 `:79-84`）。upstream-only 測試依 `GITHUB_REPOSITORY` 精確比對後執行（`upstream-guard.test.ts:357-360`、`:749-781`） | 讀碼驗證 |
| 4 | 設定過的鏡像：原貌檢查失敗，release 被擋。沒設定過的鏡像：本身就是上游的副本，release 只建在鏡像自己的 repository | 讀碼驗證（步驟 3）＋推論 |

- **攻擊者需要什麼**：擁有鏡像的人，而這個人本來就控制鏡像的 workflow。
- **判定**：不構成串連。B3 的「never」實際上只在 github.com 成立（N-6）。
- **信心**：0.7。

### 鏈 D：release job 沒有 `WXL_EXPECT_UPSTREAM` ＋ 上游組織只改大小寫 ＋ 在上游誤跑引擎（B4）

組成：T-0011 候選 11、B3 的模型外條件、B4 的「不保護」。

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | GitHub expression 的 `==` 不分大小寫，組織只改大小寫時 `release.yml:19` 仍然成立 | 推論（spec B3 依賴同一個事實） |
| 2 | 判定以 `GITHUB_REPOSITORY` 精確比對，得到「不是上游」（`upstream-guard.test.ts:358-359`），guard 與原貌檢查略過（`:751`、`:770`） | 讀碼驗證 |
| 3 | release job 沒有設 env（`release.yml:14-20`），expectation 測試也略過（`upstream-guard.test.ts:836-841`） | 讀碼驗證 |
| 4 | `quality-gates` 的 `test` job 會變紅（`quality-gates.yml:22-23`），但 release 由 tag 觸發，和它無關（`release.yml:3-6`） | 讀碼驗證 |
| 5 | 如果那個 tag 指向誤跑過引擎、帶有老師身分的 commit，release 照常建置並上傳 | 推論 |

- **攻擊者需要什麼**：沒有攻擊者。需要維護者的失誤，加上 B3 的模型外條件。
- **判定**：不構成串連，因為依賴模型外條件。補強只要一行：在 release job 加上同樣的 env。但 T71 只要求 `test` job 與新 job，補強需要改 spec，是否處理交使用者裁決（N-3）。
- **信心**：0.6。

### 鏈 E：上游組織完整改名 → 舊名被他人註冊 → 引擎訊息指向的 URL 被接手（B3 → B5）

| 步驟 | 事件與位置 | 標記 |
|---|---|---|
| 1 | `UPSTREAM_URL`（`fork-init.ts:699`，由 `:489` 的 `UPSTREAM_SLUG` 組成）寫死上游 URL，T18 與 T24 的訊息請老師「從上游搬回」（`:777-788`） | 讀碼驗證 |
| 2 | 組織改名後舊名空出，被他人註冊並建立 `wxl-platform` | 推論（GitHub 的名稱回收規則） |
| 3 | 老師照訊息搬回範本或 config，等於執行他人的 workflow 與建置程式碼，影響靶場 CI 與學習者 | 推論 |

- **判定**：不構成模型內的串連（B3 已把改名列在模型外）。但 B3 的模型外註記只談到「upstream-only job 停止執行」，沒有提到 repo-jacking（N-4）。
- **信心**：0.4。

### 鏈 F：老師提供的值 → 引擎寫入 → build 渲染 → 學習者的瀏覽器（B1 → B5）

| 值 | 鏈結與位置 | 標記 |
|---|---|---|
| `--site-name` → A7 → hero | 拒絕 `<`、`>`、`&`，以及 Cc、Cf、Zl、Zp（`fork-init.ts:211-250`）；以 `JSON.stringify` 寫入（`:1414`、`:1489`）；VitePress 以 `v-html` 渲染 hero 的 name（已安裝的 `vitepress` 的 `VPHero.vue:37`）。少了 `<` 與 `&`，`v-html` 建不出標籤或實體 | 讀碼驗證 |
| `--site-name` → A6 → title | `<title>` 經過 `escapeHtml`；導覽列以 `{{ site.title }}` 渲染（`VPNavBarTitle.vue:43`），沒有設定 `theme.siteTitle` | 讀碼驗證 |
| `--origin`，或推導出的 origin → A8 | origin 文法（`fork-init.ts:133-164`）；推導值由 `REPO_OWNER_RE`、`REPO_NAME_RE` 限定（`:113-114`、`:181-197`），一定落在文法內；只用於文字與剪貼簿（`ShortLinkShare.vue:41-42`、`:56`） | 讀碼驗證 |
| `--base`，或 `SITE_BASE` → A9 | `BASE_RE`（`fork-init.ts:120`），config 也會再檢查（`config.mts:18-22`）；範本的值放在 `env:`，沒有進 `run:`（`deploy.yml.template:101-103`） | 讀碼驗證 |
| `--author`、`--name`、`--description` → manifest | `.vitepress/`、`scripts/`、`platform/` 都沒有讀 `package.json` 的程式碼（搜尋確認） | 讀碼驗證 |
| 驗證的位置 | 驗證在 `parseForkInitArgs`，不在 `runForkInit`（T-0015 候選 06）。唯一的 production 呼叫點先經過 parse（`fork-init.ts:1725-1737`） | 讀碼驗證 |

- **判定**：在 `c142833` 上不構成串連。0005（create-wxl）與之後的設定頁 epic 若直接呼叫 `runForkInit`，B1 的保證不會跟著過去（N-5）。
- **信心**：0.8。

### 鏈 G：Cloudflare 靶場重新裝回 GitHub Pages workflow → 同一個網站也出現在 github.io（B5）

- **經過**：
  1. 不帶 `--host` 執行時，workflow 不存在就安裝，並印出警告（`fork-init.ts:1606-1623`）。
  2. 下一次推 `v*` tag 就會部署（`deploy.yml.template:42-46`）。
  3. 如果 Pages 先前已啟用，靶場會落到 owner 共用的 origin（推論）。
- **判定**：不構成串連。原因是老師自己的操作失誤，而且 README 已經寫明（T77）。
- **信心**：0.6。

### 鏈 H～L：組不成串連

| 鏈 | 內容 | 判定 | 信心 |
|---|---|---|---|
| H | rebrand 模式下，`deploy.yml` 是懸空的 symlink：`existsSync` 為 false，`writeFileSync` 會跟著連結寫出 tree 外（`fork-init.ts:1095-1096`、`:1533-1544`）。walk 只收一般檔案（`:1702-1721`），anchor 模式以 rename 取代連結（`:627-659`） | 需要先能 commit 進 tree（等於能執行任意程式碼），而且 B2 已把連結列為模型外，是既有的 rebrand 行為 | 0.8 |
| I | 終端機回顯（T-0012 候選 1、2；T-0015 候選 03；T-0014 候選 04）。T82 警告原樣回顯舊的 A9 行，沒有經過 `JSON.stringify`（`fork-init.ts:1282`） | 來源都是老師自己的參數或 tree（N-7） | 0.8 |
| J | 操縱判定（T-0011 候選 02、12、14、17）：偽造 `git`、巢狀 work tree | 都需要 commit 權限或特殊的本機設定。Windows 上程式搜尋是否先找 cwd 屬推論 | 0.75 |
| K | CI 供應鏈（T-0010 C1、C2、C5；T-0011 候選 09） | 和凍結基準相同，屬既有狀態；被攻破的相依套件本來就控制上傳的 artifact | 0.8 |
| L | fork PR 在上游的 context 執行，跨 OS job 與 guard 會跑 PR 的程式碼（`quality-gates.yml:8-14`、`:296`） | `pull_request` 只有唯讀 token、拿不到 secrets，`test` job 本來就這樣跑 | 0.8 |

### 已檢查、確認不會組合的跨 ticket 互動

| 互動 | 驗證 | 標記 |
|---|---|---|
| T-0014 候選 06（rebrand 加 host）→ T-0015 的 T50 | `fork-init.ts:356-365` | 讀碼驗證 |
| T-0014 候選 05（config 的 UTF-8）→ T-0015 候選 04 | `fork-init.ts:1477-1491` | 讀碼驗證 |
| T-0010 C4（`/../`）→ base 文法 | `fork-init.ts:120`、`config.mts:20` | 讀碼驗證 |
| T-0013 C8（過渡期的 base）→ T-0014 A9 | `fork-init.ts:806-810`、`:1270-1289` | 讀碼驗證 |
| T-0013 C2（全部算完才寫）× T-0014、T-0015 新增的錨點 | 寫入集中在 `fork-init.ts:1494-1503`；workflow 的讀取提前到 `:1242` | 讀碼驗證 |
| rebrand 的整棵 tree 替換 × upstream-only 機制 | 替換區分大小寫（`fork-init.ts:1155`）；`if:` 與 env 以 `format` 拼寫；引擎與測試排除在 walk 之外（`:694`）；`upstream-only-jobs.test.ts:40-54` 在靶場也會執行 | 讀碼驗證 |
| T-0016 候選 05 → OQ-018 的修正 | `OPEN-QUESTIONS.md:620-632` | 讀碼驗證 |
| B5 × epic 0001 的 gate（ADR-0006） | 跨靶場的全站清除已由 `GLOSSARY.md:235`、`README.md:201` 註記；報告「顯示當下為真」不受影響 | 讀碼驗證 |
| T-0017 × 其他 | 只改單元測試，沒有 runtime 表面 | 讀碼驗證 |

## 分析結論

| 鏈 | 跨越邊界 | 判定 | 信心 |
|---|---|---|---|
| A | B5（靶場 ↔ 靶場） | 不構成新的串連（B5 已接受）；N-1 | 0.75 |
| B | B5、User Story 4 | 需要使用者裁決（傾向補記 OQ-016） | 0.45 |
| C | B3（其他主機） | 不構成串連；N-6 | 0.7 |
| D | B4（依賴 B3 的模型外條件） | 不構成串連；是否補強交使用者裁決（N-3） | 0.6 |
| E | B3 → B5（模型外） | 不構成串連；N-4 | 0.4 |
| F | B1 → B5 | 不構成串連；N-5 | 0.8 |
| G | B5 | 不構成串連 | 0.6 |
| H～L | 無 | 不構成串連 | 0.75–0.8 |

沒有找到跨越模型內信任邊界的真實串連，依 `review.md` 不需要在收尾前開 ticket。鏈 B 與 N-3 需要使用者裁決（challenger 對 N-3 的強化意見見文末）。

## 新增的觀察

| ID | 位置 | 違反或不足的要求 | 證據與影響 | 信心 | 等級 |
|---|---|---|---|---|---|
| N-1 | `OPEN-QUESTIONS.md` OQ-018；`challenge-sw.js:105-108`、`:155-158`；`ChallengeLayout.vue:637-645` | OQ-018 已記下 SW 不檢查 `REGISTER_CHALLENGE` 的寄件者，但沒有記下它的後果 | 以 slug 為 key 的 registry，加上 `ready` 可能綁到 user site 的 registration，會讓兩個靶場互相轉送請求或得到 503（鏈 A）；不需要攻擊者，本質是功能缺陷 | 0.35 | Info／P2 |
| N-2 | OQ-016；`fork-init.ts:1078`；`shortLink.ts:49-57` | User Story 4；OQ-016 的「404」說法 | user site 靶場的短連結可能落到同一個 owner 的 `c` 或 `zh` 專案站（鏈 B） | 0.45 | Low／P2 |
| N-3 | `release.yml:14-20`；T71 | B4 的縱深防禦 | release job 略過 guard 時不會失敗（鏈 D）；補一行 env 就能關閉 | 0.6 | Low／P2 |
| N-4 | `spec.en.md:241` B3 的模型外欄；`fork-init.ts:699` | B3 的模型外註記不完整 | 組織完整改名後，寫死的上游 URL 可能被接手（鏈 E） | 0.4 | Info／P2 |
| N-5 | `fork-init.ts:241-250` vs. `:1084` | B1 的保證放在 parse 層 | 之後的 epic 若直接呼叫 `runForkInit`，HTML 過濾不會跟著過去 | 0.7 | Info／P2 |
| N-6 | `spec.en.md:241` B3 | B3 說「never」 | 只在 github.com 成立；在其他主機上，同 owner/name 的 repository 會通過 `if:`（鏈 C） | 0.7 | Info／P2 |
| N-7 | `fork-init.ts:1282` | B1 的「rejected values are echoed JSON-quoted」 | T82 警告原樣回顯舊的 A9 行；它不算 rejected value，但來源是 tree，可能含控制字元 | 0.5 | Info |

## 涵蓋範圍限制

- 沒有執行任何程式、測試或瀏覽器，也沒有呼叫 GitHub。
- 以下都是推論：SW 的 scope 與 `ready` 的語意、GitHub expression 不分大小寫、Pages 的路徑優先順序、名稱回收規則、其他主機的 `github.repository`。
- VitePress 的渲染行為只讀了已安裝版本中的相關檔案。
- 沒有評估：依賴套件的弱點、可用性、題目 runtime 的內容、第 8 階段的實際部署。

## 挑戰（harness-challenger）

一位 `harness-challenger` 獨立複核本分析，同樣唯讀，沒有執行程式、瀏覽器或 GitHub。

| 鏈 | 意見 | 要點 |
|---|---|---|
| A | 同意，B5 已涵蓋 | 最強的反面論述是跨靶場的請求轉送，超出 OQ-018 字面描述的範圍；但當事人只有同一個 owner 與同一位學習者，沒有第三方取得新的能力。機制校正：SW 控制採最長前綴比對，專案站自己的 SW 一旦啟用就勝出，所以 user site 的 SW 只在專案站第一次載入、自己的 SW 還沒啟用的時間窗內控制它；`ready` 在那個時間窗可能解析成 user site 的 registration。兩點都縮小時間窗，不放大風險。可用性後果（兩個分頁就 503）宜和 N-1 分開記錄 |
| B | 同意交使用者裁決，傾向在 OQ-016 補記 | Pages 的路徑優先順序無法在此實測，但與已知行為一致；名為 `c` 的 repository 的網站在 `<owner>.github.io/c/`，所以短連結 `/c/001` 會落到那個網站的 `/001`。OQ-016 的選項「把 host 記成 build-time 常數」也能讓短連結元件在 GitHub Pages 下自行抑制，順帶關閉這條，兩者適合一起追蹤 |
| C | 同意 | release 建立前先跑 `pnpm test --run`（`release.yml:66`），release 只建在鏡像自己的 repository；N-6 準確 |
| D | 同意觸發條件在模型外，但 N-3 應該更強 | spec B3 的「模型外」欄自稱組織只改大小寫時 `WXL_EXPECT_UPSTREAM` 會讓測試失敗，但這個 env 只設在 `quality-gates.yml:23` 與 `:311`，`release.yml:14-20` 沒有，而真正發布 release 的正是 release job。這是 spec 文字與實作的落差，不只是縱深防禦 |
| E | 同意觸發在模型外 | 但它是所有被駁回的鏈中後果最嚴重的一條（他人的程式碼經老師搬回後到達學習者），N-4 成立 |
| F | 同意在 `c142833` 不構成串連 | 查證 `VPHero.vue:37` 以 `v-html` 渲染 hero name；`--site-name` 在 `fork-init.ts:245` 拒絕 `<`、`>`、`&`，在 `:227-230` 拒絕 Cc、Cs、Zl、Zp、Cf（U+200C、U+200D 除外）與 noncharacter；A8 不進 config 的 head（`config.mts:81-83` 用的是 `siteBase`）。N-5 的能見度應該提高：全 epic 唯一的 HTML 注入防線在 parse 層，守著一個直達學習者瀏覽器的 `v-html` sink |
| G、H～L | 同意 | — |

**對 B 與 N-3 的建議**：鏈 B 不開 ticket，在 OQ-016 補記 user site 的情況，並註明它和「host 常數」的選項共用同一個修法。N-3 建議採納：在 release job 補上與 `if:` 同式的 `WXL_EXPECT_UPSTREAM`，讓誤判為「不是上游」時，release job 內的 `pnpm test --run` 失敗、擋下 release；代價是要改 spec（T71 只要求 `test` job 與新 job），屬一行 CI hardening。

**事實更正**（已套用到上文）：鏈 E 步驟 1 的 `fork-init.ts:489` 是 `UPSTREAM_SLUG`，`UPSTREAM_URL` 在 `:699`；N-1 低估了 OQ-018 已記下的內容（`OPEN-QUESTIONS.md:628-630` 已寫 SW 不檢查寄件者），N-1 的新增值限縮為跨靶場的請求轉送與 503。

**整體**：所有「不構成串連」的判定都成立；需要加強的是 N-3 與 N-5，鏈 B 宜文件化而不開 ticket。

## 使用者裁決（2026-10-16）

| 項目 | 裁決（原話） | 處置 |
|---|---|---|
| N-3（鏈 D）：release job 補上 `WXL_EXPECT_UPSTREAM` | 「A」：開一張小 ticket，release job 補一行與 `if:` 同式的 env，traceability 升到 2.3、T71 改為同時要求 release job，並在 `upstream-only-jobs.test.ts` 加斷言 | T-0018 |
| 鏈 B：user site 靶場的短連結可能落到同一個 owner 的 `c` 或 `zh` 網站 | 「A」：不開 ticket，在 OQ-016 補記 user site 的情況，並註明它和「host 常數」的選項共用同一個修法 | 已補記於 `.proj.specs/OPEN-QUESTIONS.md` 的 OQ-016 |

其餘觀察的處置：N-1、N-4～N-7 維持記錄，不開 ticket；N-2 即鏈 B，已補記於 OQ-016；N-3 由 T-0018 處理；N-5 留給之後直接呼叫 `runForkInit` 的 epic 在其 spec 處理。

T-0018 只在 release job 加一行 env 並加強測試，沒有新的 runtime 表面，不改變本分析的任何結論（`review/security-T-0018.md`）。
