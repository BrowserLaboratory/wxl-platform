---
synced_from: spec.en.md
synced_from_sha: e0fb63a56c2e56f923ec9266273f06719a495026
---

# Spec 0010：主語系版面——每個語系一個資料夾，由靶場決定根網址的語系

狀態：第 2 版（2026-11-15）。第 1 版連同同一天的自我檢查（traceability「Checks on revision 1」）在第 3 階段第 1 輪接受審查（`review/round-1-C.md`、`-V.md`、`-K.md`、`-R.md`）。第 2 版套用第 1 輪的處置（`review/disposition.md`）：每一則 P1 與 P2 發現都已修正，或附理由不修；它新增決策 D122–D141、列 B93–B95、S76–S80、Y107–Y113、U149–U154 與 V-B7，以及驗收標準 AC-61；它自己的自我檢查（traceability「Checks on revision 2」，RV2-01–RV2-22 與 SC2-01–SC2-10）就地修改 D67、D121、D122、D124、D125、D129 與 D134–D141，並新增 D142 與 PAT6。第 1 輪沒有 P0，第 3 階段的關卡已達成；比照 0006 的先例（第 1 輪沒有 P0，第 2 輪不跑），本 epic 不跑第 2 輪，第 2 版改以自我檢查代替（traceability「Checks on revision 2」）。本文由 `traceability.md` 推導，那份檔案收著：

- 決策 D1–D142（落實第 1 階段的決策，以及第 2 階段與第 2 版的新決策，每一條都依使用者 2026-11-15 的常設授權核准；依 `docs/agents/workflow.md` 的要求，每一條新增或變更的 D 編號在實作前仍要以簡短的決策摘要請使用者確認）；
- seam 0010-S1 到 0010-S52，以及 ticket 拆分的約束 T1–T9；
- 名詞表、字面樣式 PAT1–PAT6、型別 × 邊界總表、附完整範例的 `range.json` 與 `challenge.yaml` schema、兩種主語系下的「來源路徑 → 網址」表、建置錯誤代碼 PL-E01–PL-E18、冷載入決策表（DT01–DT80）與語系切換按鈕表（SW01–SW16）、清單 schema 與標準字串、轉址檔與短連結目標矩陣、hook 的句子，以及升級的規則、代碼、標準句子與報告；
- spec 0003、0005、0006、0007、0008 被覆寫的契約，以及信任邊界；
- B（建置與路由）、A（學習者抵達）、L（清單與 smoke fixture）、S（短連結、永久編號與 hook）、Y（題目宣告）、U（升級的搬家）各區的矩陣列；
- 第 8 階段的計畫（fixture F-1–F-6 與 V 列）、整合說明與 AC 索引。

第 1 階段的紀錄在本機研究筆記 `.proj.research/2026-11-02-primary-locale-grill.md`（Q1–Q23；2026-11-06 的 R1–R13；2026-11-15 的事實 F1–F26 與決策 R14–R31）。R13 把主語系的工作拆成兩個 epic，這是第一個；第二個（0011）加入不必改檔案就能選主語系的方式，日文排在兩者之後。

## 問題陳述

WXL 有兩個語系，而英文在構造上就享有特權。英文頁面直接放在網站的內容資料夾，從根網址提供；繁體中文頁面放在一個子資料夾，從 `/zh-TW/` 底下提供。每個要找出題目的工具（驗證、keygen、編號、轉址產生器、pre-commit hook、scaffold、上架閘門）都先找英文頁，而每一份繁中說明頁都帶著自己的一份題目宣告（backend、工具、永久編號、原始碼是否可見）。

對學生讀繁體中文的老師來說——這正是上游主要的受眾（Q8）——這代表：

- 靶場無法把繁體中文放在根網址。第一次來的訪客會因為一個寫死的預設值，從英文頁被導到對應的繁中頁；繁中題目清單送出的 HTML 在 script 執行之前仍顯示英文介面文字（T-0060）。
- 即使老師只寫中文，題目也必須有英文版：`create:challenge` 寫出英文說明頁，hook 拒絕沒有英文說明頁的中文說明頁，每個工具都先讀英文頁。
- 一道題目的兩份宣告會分歧。上游已經出貨了一個例子：`selected-excerpts` 的繁中說明頁列出 7 個原始碼檔案，英文那一份列出 10 個（F10），所以繁中頁顯示的 Source 分頁不一樣。翻譯可以給出一組與原文不同的攻擊工具。
- 第三個語系會讓這個特例更深：每個工具都得知道有一個語系住在資料夾的最上層，其他語系住在子資料夾（ADR-0008）。

ADR-0008 決定了解法：每個語系一個資料夾，沒有哪一個享有特權，再由一個建置時的設定選出哪一個從根網址提供。已經存在的靶場（create-wxl 3.x 建立的靶場與 fork）都在舊版面上，必須跨到新版面，而且不能失去老師自己的頁面——單純的三方合併會把那些頁面不聲不響地留在每個語系資料夾之外。

## 解決方式

靶場的每一頁都放在它語系的語系資料夾裡（英文和其他語系一樣有自己的資料夾），每道題目的應用程式、flag 與題目宣告只放一份，在每個語系資料夾之外。設定紀錄（`range.json`）記下靶場的主語系；沒有這個檔案、或檔案裡沒有這個 key 時，主語系是繁體中文，所以上游，以及 create-wxl 從這個版本起到 epic 0011 之前建立的每個靶場，主語系都是繁體中文；這個版本之前建立的靶場，在升級替它搬家時記成英文。建置把主語系放在網站根網址，其他每個語系放在它的語系代碼底下（`/en/`、`/zh-TW/`）；設定紀錄無法使用、或有頁面放在語系資料夾之外時，建置以帶代碼的訊息失敗。

沒有語系偏好的學習者看到他打開的那一頁，語系就是那個網址的語系；語系偏好是另一個語系的學習者，從主語系頁面會被帶到那個語系的版本，前提是它存在。冷載入一個網址帶有翻譯語系代碼的已發布頁面，會設定那個語系；語系切換按鈕是唯一的另一個寫入者。帶主語系代碼的網址（舊的 `/zh-TW/…` 連結、`/<P>/c/NNN`）落在主語系頁面上，什麼都不設定（D26、D30）。在主語系為繁中的靶場上，舊的 `/zh-TW/…` 網址會到根網址的同一頁，或在只有英文版時到它的英文版。每個語系都保有自己的短連結，`/c/NNN` 開主語系的那一頁。

一道題目只需要主語系的說明頁，翻譯可有可無。它的題目宣告是應用程式旁邊的一份 `challenge.yaml`；說明頁只留標題、摘要與版面設定，由建置把兩者裝配成每個語系的題目頁。每個工具都從那個檔案讀題目宣告。題目清單在靜態 HTML 與 hydration 之後都以清單的語系呈現介面文字（T-0060，擴及首頁）。

`range:upgrade` 在合併之前先把靶場搬離舊版面：老師的靶場與 base 原廠靶場的英文頁面移進英文的語系資料夾，每份題目宣告逐行抽出成 `challenge.yaml`；本身在舊版面、又是從舊版面的 base 升級上來的靶場，會記下 `"primaryLocale": "en"`，讓根網址的語言不變。報告列出每一個搬過的路徑。沒有經過升級就跨版的靶場（例如沒有 `range.json` 的 fork）會得到一個建置錯誤，指向 README 裡寫著手動步驟的那一節；沒有自己的頁面要搬的 fork 不必搬就建置得起來，在記下 `en` 之前，根網址提供繁體中文。上游自己的搬家由同一個轉換產生，並有測試證明。

## 使用者故事

1. 身為學生讀繁體中文的老師，我希望繁體中文放在網站的根網址，這樣學生不必先選語言，就落在看得懂的頁面上。
2. 身為老師，我希望在 `range.json` 寫一個 key 就能選定靶場的主語系，這樣教英文課的靶場可以把英文留在根網址。
3. 身為老師，我希望 `range.json` 或頁面排法有錯時，建置停下並說出檔案、問題與修法，這樣我永遠不會部署出根網址語言錯誤、或有頁面被丟在外面的網站。
4. 身為老師，我希望只用主語系寫一道題目就是完整的題目，這樣我不必寫一份用不到的英文版。
5. 身為老師，我希望每道題目的題目宣告是所有語系共用的一份檔案，這樣翻譯永遠不會顯示不同的工具、原始碼檔案或不同的永久編號。
6. 身為老師，我希望 `create:challenge` 以我主語系的 scaffold 文字寫出主語系說明頁與題目宣告，這樣新題目照 scaffold 的樣子就建置得起來、驗證得過。
7. 身為升級這個版本之前建立的靶場的老師，我希望升級把我的頁面——包括我自己的題目與文章——搬進新版面，並列出每一個搬過的路徑，這樣我寫的東西不會被丟在外面或無聲遺失。
8. 身為翻譯與英文題目宣告不一致的老師，我希望升級保留英文的值，並點名每一處由我造成的不一致，這樣我可以逐一檢查。
9. 身為有 fork 的老師，我希望得到一個指向手動搬家步驟的建置錯誤，這樣我不經升級也能跨到新版面。
10. 身為沒有存過語言的學習者，我希望留在我打開的那一頁、以那個網址的語言顯示，這樣分享給我的連結，讓我看到的就是對方看到的。
11. 身為選過語言的學習者，我希望主語系頁面在有我語言的版本時帶我過去，沒有時告訴我，這樣只要有我的語言，我就讀得到。
12. 身為學習者，我希望只有打開翻譯頁的網址、或在語系切換按鈕上選擇，會改變網站記住的語言，這樣在同一個分頁裡跟著站內連結走，永遠不會改掉它。
13. 身為手上有指向主語系為繁中的靶場的舊 `/zh-TW/…` 連結的學習者，我希望它在根網址打開同一頁（在我選的語言版本存在時開那個版本），這樣印出去的講義仍然有效。
14. 身為老師，我希望每個清單都列出每一道題目、每個語系都有帶語系代碼的短連結，而且清單的介面文字在 script 執行之前就是清單的語言，這樣學生找得到每一道題目，也讀得懂清單。
15. 身為老師，我希望 hook 與 CI 拒絕缺少主語系說明頁或題目宣告的題目，這樣每一道發布的題目都有主語系的頁面。
16. 身為維護者，我希望上游的搬家由升級用的同一個轉換產生，並有一個比對兩者的測試，這樣老師的 base 與上游的新版面能乾淨地合併。

## 實作決策

**內容版面（schema；D1、D73、D117）。** 每個語系有自己的語系資料夾，頁面不放在任何別的地方。題目的應用程式、flag 與題目宣告只放一份，在語系資料夾之外：

```
platform/
  en/                       英文的語系資料夾（只放頁面）
    index.md  challenges.md  guide/…  reference/…
    challenge/<slug>/index.md        英文說明頁
  zh-TW/                    繁體中文的語系資料夾（只放頁面）
    index.md  challenges.md  guide/…  reference/…
    challenge/<slug>/index.md        繁中說明頁
  challenge/<slug>/         題目資料夾：只有這兩個項目
    challenge.yaml          題目宣告
    src/                    應用程式與它的 flag
  public/  shared/          靜態檔案與資料載入器（不是頁面）
range.json                  repository 根目錄的設定紀錄（可有可無）
```

**設定紀錄（schema；D2、D3、D105、D114）。** 建置只讀一個 key，其他一概不讀：

```json
{
  "upstream": { "repository": "BrowserLaboratory/wxl-platform", "version": "3.2.0",
                "commit": "0123456789abcdef0123456789abcdef01234567" },
  "primaryLocale": "en"
}
```

`primaryLocale` 取的是 own property 的字串值，而且必須在語系清單上。沒有這個檔案，或沒有 own `primaryLocale` property，結果都是 `zh-TW`（R17）；上游沒有這個檔案，所以上游的主語系是 `zh-TW`。沒有任何環境變數或選項能覆寫它（D21）。檔案不是一般檔案、讀不到、不是 JSON、不是物件、值不是字串，或值不在清單上，分別以 PL-E01–PL-E06 失敗（D3）。由一個純函式的 parser 接收文字或「沒有檔案」；讀檔的部分另外加上檔案系統；pre-commit hook 從 index 餵資料給這個 parser（D114）。

**題目宣告與說明頁（schema；D73–D79）。** `challenge.yaml` 放一個 YAML mapping（core schema，所以 ISO 日期維持字串；每個寫入者都保留註解與 key 的順序），內容是舊 frontmatter 裡除了說明頁 key 以外的每個 key；不認得的 key 照樣傳下去。說明頁的 frontmatter 只放 `title`（必填）、`layout: challenge`（必填）與 `description`：

```yaml
# door-is-open 的 challenge.yaml（title、layout、description 以外的每個 key）
number: 1
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
wasmModule: /challenge/door-is-open/runtime.wasm
```

```yaml
# 繁中說明頁的 frontmatter（內文不變）
title: 知的必要
layout: challenge
description: 針對 FileHub 的黑箱滲透測試委託。這家檔案分享服務在產品頁上保證，某個帳號上傳的檔案只有該帳號讀得到。
```

traceability 的 Y-§2.2 列出每個 key 的型別與邊界，Y-§2.4 列出上游全部四個檔案。`fs` 退役（keygen 發出警告並刪除它，D76）；`id` 不再被讀取（D77）。建置依頁面的來源路徑判斷，把說明頁 ∪ 題目宣告 ∪ 內文裝配成每個語系的題目頁；兩者湊不起來時——說明頁沒有題目宣告、題目宣告不是單一 mapping、key 放錯邊、說明頁沒有題目版面、題目版面出現在別處——以 PL-E13–PL-E18 失敗（D78）。schema 錯誤仍歸 `challenge:validate` 報。

**語系清單（D4、D115、D112）。** 一個不 import 任何東西的模組，是語系唯一的列舉：`LOCALES = ['en', 'zh-TW']`、`Locale` 型別、`DEFAULT_PRIMARY_LOCALE = 'zh-TW'`、`isKnownLocale`，以及工具訊息用的英文顯示名稱。一個語系要有字串表與 locales 設定的項目，才放得進清單。create-wxl 保留一份字面複本，以測試確認相等；hook 改問 Node，不在 bash 裡列舉語系；fork:init 到 epic 0011 之前都不需要複本。

**建置：根網址、路由與版面檢查（D5–D12、D18–D22、D113、D116）。** VitePress 設定被求值時（所以 CI 執行的 `docs:build`，以及 `docs:dev`、`docs:preview` 都一樣），先讀主語系，再檢查來源版面，然後回傳：

- `rewrites` 從主語系頁面的路徑去掉主語系資料夾那一段，其他什麼都不改；頁面清單（spec 0008 的那一份）把每一頁都經過同一個 rewrite，所以它存的是網址路徑（D7、D9）。
- 版面檢查走遍搜尋範圍（`platform/` 底下排除區以外的一切，`platform/` 本身也算），依下列順序，找到第一條有違規的規則就失敗，並列出每一個違規路徑：符號連結（PL-E07）、放在每個語系資料夾之外的頁面（PL-E08，指向 README 的搬家一節）、語系資料夾裡以語系代碼命名的項目（PL-E09）、缺少主語系首頁（PL-E10）（D6）。建置、工具與升級用同一個判斷式決定什麼是頁面（D116）。這個檢查是一個純函式，`pnpm build`、`pnpm dev` 或 CI 執行的每個工具，都在呼叫 VitePress 之前先呼叫它（D19）。
- `locales` 由一張逐語系的表產生：主語系是 `root`，其他每個語系以它的代碼為 key，連結加上前綴；`en` 為主語系時，它等於今天的物件（D8）。`localeIndex === 'root'` 在任何地方都表示主語系（D18）。
- 建置在頁面清單旁邊替前端定義主語系（D18）。
- `transformPageData` 經由頁面的來源路徑讀取它的原始內容，絕不經由改寫後的路徑（D10）。
- markdown 連結解析出的網址，第一個路徑段等於主語系代碼時，以 PL-E11 失敗，因為 VitePress 的死連結檢查是拿來源路徑比對，會讓它通過（D12）；首頁連結（恰好是 `hero.actions[*].link` 與 `features[*].link`）從該語系自己的首頁的角度撰寫，由建置加上前綴，寫錯時以 PL-E12 失敗，包括翻譯首頁連到該翻譯沒有的頁面，以及 protocol-relative 的 `//` 連結（D13、D141）。
- 只有翻譯的頁面也建置得起來：建置只要求主語系首頁存在（D20）。這明確覆寫 ADR-0008 的「每一頁都必須存在於其中」：每道題目都有主語系說明頁（由 validate、hook、CI 把關），上游的每一頁在每個語系都有，而靶場的文章可以只存在於一個翻譯裡（BC19；ADR-0008 加一則註明日期的註記）。
- 這裡新增的每一種建置失敗都是同一個錯誤類別，首行帶代碼 `PL-Exx: …`，以英文書寫（D17、D113）；PL-E05–PL-E12 引用的值與路徑，以 create-wxl 的方式跳脫，包含 C0、DEL 與 C1 字元，而 PL-E13–PL-E18 照原樣印出路徑與 key（D140）。
- 刪除沒有在用的 `Layout.vue`（D15）。上游不帶前綴的網址現在開繁體中文，英文搬到 `/en/`；不加轉址（D23、R20）。

**學習者抵達（D24–D36）。** 每個路由函式都以主語系 `P` 為參數，維持純函式；前端從一個模組讀 `P`（D31），元件只經由 `pageLocaleOf(localeIndex, P)` 推導頁面語系（D32）。

- 冷載入：只有主語系頁面會轉址，只在儲存值有效而且是翻譯語系時，也只前往頁面清單裡的對應頁（用 `replace`，保留 base、query 與 hash）。翻譯頁不論存了或寫入了什麼都不轉址（D24）。預設的造訪語系移除：沒有語系偏好時，被要求的語系就是頁面自己的語系，所以不轉址、不顯示那一行（D25）。
- 寫入：冷載入已發布的翻譯頁會寫入它的語系；冷載入主語系頁面什麼都不寫，包括經由短連結或伺服器轉址抵達的；語系切換按鈕寫入它的選擇；除此之外都不寫入（D26）。
- not-found 查詢：翻譯路徑前往主語系的同一頁；主語系代碼路徑（`/<P>/…`，R22 的舊網址）在每種主機上都前往去掉那一段之後的路徑，若那個路徑不是頁面、而它的翻譯是，就前往翻譯（D28 的往下遞補，讓兩種主機落在同一處）；主語系路徑前往翻譯的那一頁（沿用 0008 C2）。被要求的語系一律是路徑自己的語系（D27、D28）。在 Cloudflare 上，舊網址規則先回應，所以存著的翻譯語系可能接著轉址；在 GitHub Pages 上，去掉前綴是一次 not-found 轉址，之後不再接冷載入轉址——接受這個差異（D29）；`P = zh-TW` 時，雙重前綴（`/zh-TW/en/x`、`/zh-TW/zh-TW/x`）在兩種主機上的落點也不同，接受；`P = en` 沒有舊網址規則，兩種主機都落在找不到頁面的畫面（D138）。帶主語系代碼的短連結落在主語系頁面，所以跟著語系偏好走（D30）：在主語系為繁中的靶場上，`/zh-TW/c/NNN` 對選了英文的學習者開英文，而帶翻譯語系代碼的連結一律開那個翻譯。
- 那一行與語系標記保留它們兩個語系的句子，在兩種主語系下都正確；語系清單長度不是二時，有一個單元測試會失敗，並點名日文 epic（D33）。語系切換按鈕的選單是語系清單去掉頁面語系，那一行顯示時再加上頁面語系（D34）。解題紀錄沿用確認的「清除」重新載入根網址，由這些規則決定去處（D35）。

**題目清單、首頁與介面字串（D37–D56）。** 一個由語系清單推導出來的 loader 匯出 `Record<Locale, ChallengeData[]>`；每個清單頁與首頁都把它整份傳進改名後的 `lists` prop，由元件挑出頁面語系的那一份；仍傳舊 `challenges` prop 的頁面會呈現空清單，並發出一則點名該頁的 console 警告，每個元件實例一次（D40、D131、LW1）。一道題目恰好在它有主語系說明頁時被列出；只有翻譯說明頁的題目不在任何清單（D38）。清單從說明頁讀 `title` 與 `description`，其餘從題目宣告讀；條目的語系就是它說明頁所在的資料夾（D37、D39）。依 slug 排序，`id` 是位置（D41）；各語系的預設值搬進字串表（D42）；欄位值依一張固定的表正規化（D43）。清單上每個不是資料的字串，不是頁面語系字串，就是來自清單頁的 frontmatter（`title`，以及 `subtitle`——VitePress 不會把這個 key 變成頁面的 meta description），所以在兩種主語系下，兩個清單的靜態 HTML 與 hydration 後的頁面都一致（D44，擴大 T-0060），首頁也一樣（D47）；日期以頁面語系的語言標籤、UTC 時區呈現（D45）。每個有永久編號的列都有複製按鈕（D48）。

**Smoke fixture 頁面（D49、D50）。** 兩篇只供測試的文章，一篇只有英文、一篇只有繁體中文，放在各語系資料夾中保留的 `smoke-fixtures` 資料夾，只在建置時 `WXL_SMOKE_PAGES` 恰好是 `1` 才發布；CI 的 smoke job 設定它，正式建置的 job 只要它們有任何痕跡出貨就失敗，所以這個判斷式與每一個 `smoke-fixtures` 字面值都放在只在 node 執行的模組，絕不進入前端 bundle。這個旗標從不改變主語系，版面檢查在每種模式下都把 fixture 頁面當成一般的語系頁面。新增繁中參考文件（D51），並有一個只在上游執行的測試，要求每一頁在每個語系都存在（D52）。每個斷言上游自身內容的測試也都只在上游執行，其他每個測試都從主語系與它所在的樹推導期望值，所以執行同一組 job 的靶場 CI 會通過（D54、D124）。預期解 spec 保留它們的網址，那個網址現在開的是主語系說明頁（D53）。

**短連結、永久編號與 hook（D57–D72、D118、D121）。** 規則的形式由語系清單產生，依固定順序：`/c/`、`/en/c/`、`/zh/c/`、`/zh-TW/c/`（D57）。語系為 `L` 的形式的編號規則，目標是題目在 `L` 的那一頁，沒有就是主語系的那一頁，再沒有就是清單上第一個有說明頁的語系的那一頁，而且永遠是頁面本身，絕不是還會再跳一次的網址（D58）。slug 規則依同樣的對應（D59）。在主語系為繁中的靶場上，檔案以 R22 的舊網址規則 `/zh-TW/*  /:splat  302` 結尾（D60）；因為它的目標以請求的文字開頭，open redirect 檢查是第 8 階段的關卡，只有在它失敗時，才由使用者選一套依構造就安全的規則（D118）。檔頭寫明由形式數量算出的容量（D61）。永久編號是 1 到 2^53 − 1 的安全整數，只來自 `challenge.yaml`；`number-locales` 移除；下架題目的號碼從下架題目的題目宣告與舊式的下架說明頁讀取（D62、D63）。一個純函式在 git 的 index 上回報說明頁缺陷：`missing-primary` 每個 slug 一次、`missing-declaration` 每份沒有題目宣告的說明頁一次、`old-layout` 每個路徑一次（schema S-§4.7）；只有放著 `index.md` 的 slug 資料夾才算有說明頁（D127）；hook 的驗證拒絕這次 commit stage 進來的缺陷，產生器的檢查拒絕 index 裡已經有的缺陷（D64、D69、D121）。hook 不認得任何語系：它監看語系清單上各語系資料夾裡的題目路徑（`public/`、`shared/` 或清單以外的資料夾一概不看）與 `range.json`，它的驗證與說明頁檢查都從 index 讀主語系（D65–D67、D122、D126）。產生器與複製按鈕由同一個函式給出題目頁的路徑（D68）。T-0058 與 T-0059 要不要做由第 4 階段決定；本 spec 建議兩張都做（D72）。

**以題目宣告為準的工具（D80–D90、D123、D129）。** 每個讀 `range.json` 的工具都最先讀它，`range.json` 無法使用時，在碰任何題目之前就以它的 PL 行停下（D123）。有重複 key、無法解析的 tag、alias 過多，或 alias 沒有對應 anchor 的題目宣告，是無效的 YAML（D129）。keygen 只在位元組會改變時才把 `wasmModule` 寫進 `challenge.yaml`，追蹤的是題目宣告與 `src/`，絕不追蹤說明頁（D80）。扁平的單一檔案題目從每個工具中移除（D81）。`create:challenge` 先跑版面檢查、拒絕舊版面的樹，再寫出主語系說明頁、題目宣告與 `src/`，scaffold 文字依語系取用；任何題目資料夾或語系說明頁資料夾已經占用的 slug，它都拒絕（D82–D84）。slug 文法只在那裡強制（T-0059 若採用，產生器也會強制）；其他工具接受任何資料夾名稱。L4 的 player package 讀主語系說明頁（D85）。驗證檢查一次題目宣告、每一份存在的說明頁、主語系說明頁是否存在，以及題目資料夾的結構（D86、D117）。執行中的 dev server，在重新載入後會在清單上反映題目宣告的修改，在重新啟動後才會在題目頁上反映（D87、N18）。retype 只改 `challenge.yaml`；analyze 從主語系說明頁取標題（D89、D90）。

**升級的搬家（D91–D112、D120）。** 一個靶場被搬，是因為它的內容，從不因為它的版本（D91）；停在下載前檢查的 run 什麼都不搬（D92）。步驟 7 在暫存資料夾裡轉換 base 原廠靶場；步驟 8 在記憶體裡規劃老師的搬家；步驟 9 刪除每個舊路徑、寫入每個新路徑，不 stage 任何東西；步驟 1–8 仍然不在靶場裡寫任何東西（D93）。合併讀搬家後的 base，並經由搬家計畫讀老師的檔案；合併在搬過的路徑上的寫入，優先於搬家（D94）。轉換只改路徑、拆 frontmatter，逐行進行並保留原始位元組與換行（D95）。遇到 R14 列出的每一種情況，以及無法拆分的說明頁、孤兒翻譯（沒有英文說明頁也沒有題目宣告；已經有宣告的題目的翻譯則不動）、單一檔案的說明頁與舊式目標，它在寫入任何東西之前以 UP-E14 與一個 token 停下，並印出最先失敗的那一側的每一個失敗（D96–D100）。磁碟走訪恰好略過排除區與語系資料夾的路徑；對每份英文說明頁的 slug，搬家也另外檢查翻譯說明頁的路徑，所以一份它看不到的翻譯說明頁（被忽略，或在符號連結底下）會讓 run 停下；它只在 `lstat` 回報一般檔案之後才讀頁面（D116、D125、D139）。只有頁面會搬（D101）；搬過的檔案保留它的 mode（D102）。不一致的題目宣告值只在由老師造成之處以 UP-A16 回報（D104）。`"primaryLocale": "en"` 只在有搬老師靶場的 crossing run 裡附加，而且只在原本沒有時附加（D105）。報告的 R6 在 R5 之後列出搬家，R2 不把它們算進去，報告的 R4 說明預期中的 UP-A12，並要求執行 `pnpm redirects:generate`（D106、D120）。升級與 fork:init 的錨點路徑改指新的首頁（D107）。上游的搬家是最後一個舊版面發布版本（`v3.1.1`）的轉換結果，由一個只在上游執行的測試證明；這個測試在靶場或 fork 裡跳過，並自己挑選要比對的樹：在第一個新版面發布版本打上 tag 之前比對工作樹，之後比對那個 tag（D108）。

## 信任邊界與威脅模型

| # | 邊界 | 保護什麼 | 不保護什麼 | 不在模型內 |
|---|---|---|---|---|
| TB1 | repository 內容 → 建置：`range.json`（traceability B-T1、U B3） | 它的值只在等於語系清單的某個成員之後才被使用；絕不被插進程式碼、路徑、HTML、規則或 shell 指令；不跟隨符號連結；值進到訊息時加上引號，C0、DEL 與 C1 字元都跳脫（D140）。升級絕不覆寫已經存在的 `primaryLocale` | 任何能 commit 或合併進靶場的人（協同老師、被合併的 pull request、ADR-0009 的那群人）都能改掉根網址的語言，或讓部署建置壞掉，權力與改任何一頁相同；在 crossing 升級之前加上 `primaryLocale`，會讓 `en` 不被記下；雙向排版字元原樣進到訊息；版面檢查不看排除區內部，所以 `platform/challenge/<slug>/src` 或 `platform/public/` 底下的符號連結，會像本 epic 之前一樣被 keygen 與 Vite 的複製跟隨 | 未 commit 的 `range.json` 只影響本機建置；主機從 commit 建置 |
| TB2 | repository 內容 → 建置：頁面名稱、連結、frontmatter（B-T2、Y） | 名稱只進到錯誤訊息，在 PL-E07–PL-E12 裡加上引號（D140）；首頁連結只會被加上清單上的代碼前綴，並與頁面清單比對，protocol-relative 的連結會失敗（D141）；站內 markdown 連結由 PL-E11 與 VitePress 的檢查限定在已發布的頁面。裝配後的 frontmatter 在每個語系頁各帶一份題目宣告，和以前帶 frontmatter 出貨一樣；翻譯再也無法放寬 `tools` 或 `source_visible` | PL-E13–PL-E18 原樣印出路徑與 frontmatter 的 key，所以資料夾名稱或 key 裡的控制字元會原樣到達終端機（D140）；`challenge.yaml` 整份以頁面資料送到每位學習者的瀏覽器，所以裡面不能放任何秘密；它的每個 key——包括 `head` 這類 VitePress 頁面 key——現在作用在每個語系頁，而不是單一頁（寫它的族群就是以前寫說明頁的那群人；不設 denylist，D74）；不新增自動檢查 flag 的值不在裡面（延後，見〈不在範圍內〉）；第 7 階段針對這次變更檢查一次（Y106） | raw HTML 連結與元件產生的連結不檢查（已寫進文件） |
| TB3 | 建置 → 前端常數（B-T3、A TA3） | 頁面清單與主語系在建置時固定；執行期沒有任何東西能改變它們 | 老師選的根網址語言，這正是用意 | — |
| TB4 | 網址 → 學習者被送去哪裡（A TA1、0008 B2） | 每個轉址目標都是 base 加上一個頁面清單項目，並經由 router 導覽。去掉主語系代碼的步驟在解碼與拒絕 `//`、`\`、`..` 之後執行，只去掉完整的一段，而且必須落在主語系的清單項目上；不在清單上的主語系路徑，則落在它翻譯對應頁的清單項目上 | 指名真實頁面的路徑會把學習者送到那裡，這正是用意 | — |
| TB5 | `_redirects` → Cloudflare 的 edge → 學習者（S TB-S1） | 每條規則的目標依構造就是同源（固定的第一段加上一個 slug 段，或一個字面頁面），只有舊網址規則 `/:splat` 例外，它的目標以請求的文字開頭；S61 在第 8 階段把關（D118） | 在 S61 通過之前，Cloudflare 是否在比對前正規化 `//` 與 `\` 尚未驗證；若沒有正規化，有一套備用規則。每個主語系為繁中的靶場都會寫入這條規則，包括這個版本之後建立、從未發出過 `/zh-TW/…` 網址的靶場（照 R22 所寫）；S61 只觀察一次，有一個 open question 要求在 Cloudflare 改變轉址處理時重新檢查（B88） | Cloudflare 自身在 S60 與 S61 觀察範圍以外的行為 |
| TB6 | 資料夾名稱 → 規則文字與終端機（S TB-S2、TB-S4） | slug 來自資料夾名稱；和現在一樣，目標都留在站內 | 沒有 T-0059 時，含空白的名稱會把一條規則拆開，全是數字的 slug 可能遮蔽一個永久編號；沒有 T-0058 時，含控制字元的名稱會原樣到達 hook 的終端機 | — |
| TB7 | 學習者的動作 → 儲存的語系偏好 → 路由（A TA2、0008 B4） | 只認清單上的代碼，且必須完全相同；只有語系切換按鈕的選擇與冷載入已發布的翻譯頁會寫入 | 任何頁面都能連到 `/<T>/` 網址並設定 `T`；在主語系為繁中的靶場上，連結現在可以設定英文。同一個 GitHub Pages owner 底下的靶場仍然共用語系偏好（R8、OQ-018）；`fork:init --rebrand` 會改掉 `wxl-locale` 這個 key，所以只有 key 相同的靶場才共用 | — |
| TB8 | 解題紀錄沿用確認 → 導覽（A TA4、ADR-0006） | 不變：轉址與它們產生的那一行，都等確認做出決定；語系切換按鈕產生的那一行不等 | 同 ADR-0006：這個確認是提醒，不是存取控制 | — |
| TB9 | 建置環境 → 已發布的頁面（L） | `WXL_SMOKE_PAGES` 只會發布兩個沒有 script、連結或資料的靜態頁面；它們若出貨，CI 的正式建置會失敗 | 正式部署時設成 `1`，就會發布這兩頁（關乎完整性，不關乎機密性） | — |
| TB10 | GitHub archive → 靶場，升級期間（U 0006 B1） | base 與 target 原廠靶場只放檔案與資料夾；frontmatter 以 `yaml` 的預設上限解析；`--from <commit>` 的 base 裡有惡意的說明頁時，run 會停下 | 刻意挑選的 `--from <commit>` base，讓它搬家後的檔案等於老師的檔案，就能藏住上游在那裡的改動，如 0006 B1 所述 | — |
| TB11 | 升級 → 老師的 repository（U 0006 B4） | 搬家只寫入與刪除已追蹤的頁面與新的、未被忽略的路徑，絕不經由符號連結、submodule 或名稱別名；它只在 `lstat` 回報一般檔案之後才讀頁面，遇到看不到的翻譯說明頁就停下（D125、D139）；它不 stage 任何東西；還原指令能撤銷它；停下時什麼都不寫；外來的值在報告裡都跳脫 | 從搬過的頁面指向沒有搬的檔案的相對連結與資源 import，以及其他檔案指向舊路徑的連結，都不改寫；老師靶場與它的 base 分歧之處共有的題目宣告值，會被捨棄而不回報；在不分大小寫的檔案系統上，拼成 `Platform/…` 的頁面交給建置檢查 | 執行期間有別的程序在改靶場（0006） |

本 epic 沒有任何發現能在 ADR-0005 下被視為預期：它不碰任何題目刻意教的漏洞，而經由裝配後的頁面資料或展示副本外洩 flag，屬於 ADR-0005 的第 3 類缺陷。第 7 階段檢查繁中 selected-excerpts 頁面新列出的檔案，恰好就是英文頁已經列出的那些，並檢查任何 `challenge.yaml` 在任何深度的任何 scalar 都不含它那道題目的 flag，比對時去掉至多一個結尾換行（Y106）。L4 的 player package 仍然只帶主語系說明頁的標題與第一段，絕不帶題目宣告。

## 驗收標準

「兩種主語系」表示該標準在 `P = en` 與 `P = zh-TW` 下都成立。每條標準在它所列的列指名的 seam 上判定；字面值寫在那些列裡。

### 建置與路由（B 區）

- **AC-1** `readPrimaryLocale` 在沒有檔案、物件沒有 own `primaryLocale`（含 `{}`、`{"upstream":…}`、只有 `__proto__`、任何型別的其他 key）時回傳 `zh-TW`，key 重複時回傳最後一個值，`"en"`、`"zh-TW"` 回傳該值；以下情況丟出 `SiteLayoutError`，代碼與首行逐字相符：資料夾、FIFO 或符號連結為 PL-E01（目標從不讀取），讀不到的檔案為帶 errno 的 PL-E02（以 root 執行時跳過），空的、不平衡、有 BOM 前綴、有註解或有結尾多餘文字的為 PL-E03，每一種非物件為 PL-E04，每一種非字串值為 PL-E05，每一個不在清單上的字串為 PL-E06（C0、DEL 與 C1 字元由一個等同 create-wxl `jsonStringifyEscaped` 的引用函式跳脫，B95）；設定只讀 repository 根目錄的 `range.json`（根目錄寫 `en`、`platform/` 與 `.vitepress/` 底下寫 `zh-TW` 的 fixture 出貨 `"en"`），在 B14 的 16 種環境（`SITE_BASE`、`CF_PAGES`、`WXL_SMOKE_PAGES` 與探測用的 `WXL_PRIMARY_LOCALE`，各自設或不設）下上游都出貨 `"zh-TW"`，並且先報無效的 `SITE_BASE`、後報 `range.json` 錯誤；`pnpm docs:dev` 要重新啟動後才反映 `range.json` 的修改，由 V-B6 觀察。（B1–B16、B95）
- **AC-2** 語系清單模組恰好匯出 `['en', 'zh-TW']`、預設主語系 `zh-TW` 與完全比對的 `isKnownLocale`；在它之外，`.vitepress/` 與 `platform/shared/` 沒有 `KNOWN_LOCALES`，沒有由語系代碼組成的 union、陣列或 `||` 比較鏈（PAT1；跨行寫的由第 6 階段閱讀找出，D132），每張以語系代碼為 key 的表都宣告為 `Record<Locale, …>`（D132）；訊息檔的集合等於清單，`localesConfig` 對每個成員一個 key。（B17–B19）
- **AC-3** `checkSourceLayout` 對兩種主語系下有效的新版面樹正常回傳（翻譯資料夾為空或不存在也一樣），否則只對第一條被違反的規則丟出：PL-E07（搜尋範圍內的符號連結，含 `platform` 本身；走訪不往下）、PL-E08（每一頁直接放在 `platform/`、放在清單外的頂層資料夾，或放在 `platform/challenge/` 而不在 `src/` 內，含扁平的舊式說明頁）、PL-E09（語系資料夾裡以清單上語系命名的項目）或 PL-E10（缺主語系首頁），並列出每一個違規路徑、排序過；`src/**`、`public/**`、`shared/**`、點開頭的、`node_modules/`、`dist/`、`.MD` 檔與非頁面檔案既不是頁面也不是違規；缺非主語系首頁與只有翻譯的頁面都允許；在舊版面的樹的複本上，`docs:build`、`docs:dev`、`docs:preview` 各自以非零結束，stderr 含 PL-E08 首行加上列出的路徑，沒有其他 PL 行（pnpm 的 banner 與 VitePress 自己的前綴可以在前）；`challenge:keygen`、`redirects:generate` 與 `challenge:validate` 以 `node --experimental-strip-types scripts/<tool>.ts` 執行時，各自以非零結束，stderr 的第一行就是 PL-E08 首行，且不處理任何題目（沒有 `[skip]`、`[done]` 或 `✓` 行，不寫任何檔案）。（B20–B38、B91）
- **AC-4** `rewrittenPath` 恰好去掉開頭的主語系資料夾段；`rewrites` 就是這個函式；兩種主語系下 `pageListFromDir` 都等於「Source path → URL」欄，沒有重複項目；出貨的頁面清單等於一個自己讀 `range.json` 的獨立 oracle；發布的 HTML 集合等於以同樣方式對應的來源集合；`classifyArrival` 把渲染出的 `relativePath` 對應到它的項目；`localeIndex` 在主語系頁面是 `root`、在其他地方是代碼；上游的 `__WXL_PRIMARY_LOCALE__` 是 `"zh-TW"`；上游輸出把繁中頁面放在根目錄、英文頁面放在 `en/` 底下，沒有 `zh-TW/` 資料夾；dev server 提供同樣的對應。（B39–B49）
- **AC-5** `transformPageData` 經由來源路徑讀取題目頁的內文，主語系頁（改寫後的路徑不指向任何檔案）與翻譯頁都一樣，且不替其他版面加內文。（B50–B52）
- **AC-6** `localesConfig('en')` 深度等於今天的字面值，`localesConfig('zh-TW')` 等於 schema 範例；每個非 root 的 key 都以它的代碼為連結與前綴；建置出的頁面帶它語系的 `lang`；網站標題與描述維持網站層級，設定恰好保留一行 0003 A6 的 `title:` 與一行 A9 的 `siteBase`；導覽列標題在兩種 base 下都連到頁面語系的首頁。（B56–B61）
- **AC-7** `localizeHomeLinks` 恰好讀 `hero.actions[*].link` 與 `features[*].link`；主語系頁面的網站絕對連結照寫保留，翻譯頁的加上它的代碼前綴，外部連結與錨點不檢查；以下情況丟出點名欄位的 PL-E12：相對連結、protocol-relative 的 `//` 連結（B94）、第一段整段是清單上代碼的連結（`/english/` 與 `/zh-TWx/` 不算）、不指向任何已發布頁面的連結（含翻譯首頁連到該翻譯沒有的頁面，不往下遞補），以及非字串；其他欄位原樣回傳；只動 `layout: home` 的頁面；上游建置出的 hero 按鈕，在兩種主語系下都帶「Home-page links」表的 href。（B62–B70、B92、B94）
- **AC-8** 同資料夾的相對連結在兩種主語系下都解析在它的語系內；解析出的網址第一個路徑段等於主語系代碼的連結丟出點名頁面與連結的 PL-E11（第 8 階段顯示 VitePress 自己的檢查會讓它通過），`/english/x`、`/zh-TWx/y` 則不會；連進非主語系資料夾的連結解析到那個資料夾的頁面（B73）；`ignoreDeadLinks` 維持未設定；繁中筆記頁連到 `../reference/attack-log-export-format.md`；每個清單頁與首頁都 import 那一個 loader。（B71–B79）
- **AC-9** `.vitepress/theme/Layout.vue` 不存在，也沒有任何東西提到它；上游在 `/` 提供繁體中文、在 `/en/` 提供英文；`site-smoke.spec.ts` 的英文斷言改用 `/en/`；預期解 spec 套件不改就通過。（B80–B83）
- **AC-10** README 的搬家一節（標題與 PL-E08 點名的完全相同；B84 的八個手動步驟依序為：先合併該版本、搬頁面、拆題目宣告、使用那一個 loader 與 `:lists`、首頁連結從語系首頁的角度寫、零散的檔案、`primaryLocale` 記 `en`（沒有東西要搬的 fork 也一樣）、建置；`--from` 的說明、每個 PL 代碼一行、保留的 `smoke-fixtures/`），README 談日後改主語系與設定紀錄裡 `primaryLocale` 的段落，ADR-0008 兩則註明日期的註記（PL-E11；哪些頁面必須存在於主語系），收尾時的 open question 更新、回顧給 release note 的材料，以及 GLOSSARY 的修改（`glossary.test.ts` 通過），各自含有它那一列列出的內容。（B84–B90）

### 學習者抵達（A 區）

- **AC-11** 對每一列 DT，在 base `/` 與 `/repo/` 下、對題目與文章、帶 query 與 hash，冷載入的轉址或停留、在解題紀錄沿用確認做出決定之後是否顯示那一行、是否寫入，都完全照該列；轉址是一次 `go(target, { replace: true })`，前往 base 加上清單項目；別名網址以它渲染出的頁面判別；伺服器轉址或重新整理之後的落點，以落點頁分類。（A1–A10、DT01–DT80）
- **AC-12** 沒有語系偏好時，除了 not-found 轉址的落點，沒有任何頁面抵達會顯示那一行；存著翻譯語系時，之後不帶它而導覽到主語系頁面，會以那個語系顯示那一行，反向亦然；`DEFAULT_VISITING_LOCALE` 在任何地方都不存在；`readStoredLocale` 恰好回傳 `en` 與 `zh-TW`，其他每個值與讀不到的儲存都回傳 `null`。（A11–A13）
- **AC-13** A14–A18 的每個 not-found 輸入，在兩種主語系與兩種 base 下都得到所寫的目標與被要求的語系（翻譯路徑 → `/X`，以 `T` 顯示那一行；主語系代碼路徑 → `/X`，不顯示那一行，含 `/<P>`、`/<P>/` 與 `.html` 形式，或在只有 `/<T>/X` 在清單上時 → `/<T>/X`，以 `P` 顯示那一行；主語系路徑 → `/<T>/X`，以 `P` 顯示那一行），否則是找不到頁面的畫面；雙重、格式錯誤與構造過的前綴都結束在找不到頁面的畫面，不丟例外；每個目標都是 base 加上清單項目；不寫入任何東西；至多一次 not-found 轉址，之後沒有冷載入轉址；冷載入與站內導覽行為相同；按上一頁回到之前的頁面。（A14–A20、A39）
- **AC-14** 每一列 SW 的決定、瀏覽紀錄行為、那一行與寫入，經由 `switcherDecision` 與真實的 Layout 都成立；選單標題是頁面語系的標籤，選項是語系清單去掉頁面語系、那一行顯示時再加上頁面語系；有一個逐一走過清單的測試，任何成員缺 label key 就失敗（第 6 階段暫時加入第三個代碼示範一次）；在找不到頁面的畫面或載入失敗時，語系切換按鈕前往查詢得到的對應頁或停留，絕不帶那一行；儲存拒絕寫入時，選擇在這個分頁內有效。（A21–A24、SW01–SW16）
- **AC-15** 在兩種主語系下，`wxl-locale` 只在語系切換按鈕的選擇（變成所選）與冷載入已發布的翻譯頁（變成它的語系）之後改變；冷載入主語系頁面、not-found 抵達或轉址、載入失敗、冷載入轉址、連結、上一頁與下一頁都不改變它。（A25）
- **AC-16** `detectLocaleFromPath`、`localizePath` 與 `pageLocaleOf` 在兩種主語系下都給出表上的每個結果（`localizePath` 絕不去掉主語系的代碼，且是冪等的）；`MergedNav`、`ChallengeList`、`HomeContent` 與 `LocaleSwitcher` 在 SSR 輸出與 mount 之後，都只經由 `pageLocaleOf` 推導頁面語系；介面語系在啟動時與每次路由變更時都跟著網址。（A26–A29）
- **AC-17** 那一行的句子、連結文字、`lang` 與 `href`，對每個被要求的語系、在兩種主語系與兩種 base 下，都等於標準字面值；語系標記的字串在兩種主語系下都不變；語系清單成員數不是二時，有一個單元測試以訊息 GD1 失敗，GD1 點名日文 epic。（A30–A32）
- **AC-18** 解題紀錄沿用確認的「清除」完整載入根網址，不執行被擱著的轉址，根網址的冷載入接著依 A1–A3 進行。（A33）
- **AC-19** 疑難排解頁、README 談語系偏好的句子、traceability「Overridden contracts › Area A」中「Comments (A36)」那一列點名的每一段程式碼註解，以及 GLOSSARY 的主語系詞條，都說出上述規則，並在兩種主語系下都為真；沒有任何一處說英文是根網址、`'root'` 指英文、存在預設的造訪語系，或沒有語系偏好的學習者看到的是主語系（他看到的是他打開的網址的語系）。（A34–A37）

### 清單、首頁、smoke fixture（L 區）

- **AC-20** `mergeLocaleChallenges` 對清單上每個語系回傳一份清單；有主語系說明頁的題目在每一份清單裡（來自它自己的說明頁，或以主語系的語系與網址向主語系說明頁借用），沒有的題目不在任何清單；依 slug 排序，`id` 是位置，在每份清單都相同，與輸入順序及 `P` 無關；slug 完全比對；每個欄位依 L-§4.2，預設值取自清單語系的字串表；放錯邊的 key 被忽略；傳入三個語系時也成立；`platform/shared/` 裡不再留有預設文字。（L1–L18）
- **AC-21** loader 的 `watch` 由語系清單建構，涵蓋 `challenge.yaml`；它以唯一的 YAML parser 解析日期；被列出的題目缺題目宣告或題目宣告無效時，loader 以 PL-E13 或 PL-E14 的文字失敗；修改題目宣告或說明頁後，dev server 重新載入會跟著變；條目網址不含 base，由元件加上一次 base。（L19–L22）
- **AC-22** 對四種（`P`、`localeIndex`）組合，在 SSR 輸出與 mount 之後（執行期語系設成另一個語系），`ChallengeList` 與 `HomeContent` 都呈現 `lists[pageLocale]`，每個 CS3–CS10 與 CH1 字串都是頁面語系、從不是另一個語系；h1 來自清單頁 frontmatter 的 `title`，副標題來自 `subtitle`，值為空、不存在或不是字串時各自不出現（L24）；空清單狀態與日期（UTC、頁面語系的標籤，在三個時區都相同）都是頁面語系；借來的條目帶語系標記與主語系的 `lang`，主語系的清單兩者都沒有；首頁計數在各語系相等；搜尋、篩選、排序與已解題徽章的既有案例在新網址下通過（L31）；缺 `lists` prop（含舊的 `:challenges="data"`）時呈現空清單，並以點名該頁的 LW1 呼叫 `console.warn`，每個元件實例一次（D131），而 `lists` 只是缺頁面語系的 key 時不發警告；清單頁的 `<meta name="description">` 維持網站的；在建置出的上游 test build 上，`/challenges`、`/en/challenges`、`/` 與 `/en/` 在停用 JavaScript 時與 hydration 之後顯示相同的字串。（L23–L28、L30–L33、L45、L46）
- **AC-23** 只有 `WXL_SMOKE_PAGES=1` 會發布兩個 fixture 頁面，頁面清單與 `srcExclude` 經由 `isSmokeFixturePage` 一致，而它和每一個 `smoke-fixtures` 字面值一樣，都在前端入口的 import 圖之外；只要 `smoke-fixtures` 有任何痕跡出貨，CI 的正式建置就失敗；缺 fixture 時，smoke 套件立刻以點名該旗標的訊息失敗；`missing-translation.spec.ts` 的案例在 fixture 上執行（沒有案例點名匯出格式參考文件）並通過；頁面清單拼法的測試在 test build 上通過。（L34–L39、L47）
- **AC-24** 繁中的匯出格式參考文件，具有英文頁的標題、表格列、fenced block 與行內程式碼；筆記頁連到它自己資料夾裡的那一份；只在上游執行的完整性測試在上游通過、在靶場跳過，翻譯缺頁時以點名頁面與語系的訊息失敗。（L40–L42）
- **AC-25** 預期解 spec、範本與盲解的預設值保留 `http://localhost:5173/challenge/<slug>/`，它不經轉址就開主語系說明頁，`pnpm test:challenges` 通過。（L43）
- **AC-26** LH1–LH5 的每一段（traceability「Overridden contracts › Area L」的 H 列）在兩種語言下都說出它那一列所述的內容。（L44）

### 短連結、永久編號與 hook（S 區）

- **AC-27** 對每一種 P × 主語系說明頁 × 翻譯說明頁的情況，一道題目的四條編號規則等於 S-§4.1 或 S-§4.2 的清單（目標在形式的語系，否則在主語系，否則在第一個有說明頁的語系；絕不是還會再跳的網址）；未追蹤或被忽略的翻譯讓規則改指，而不是移除；孤兒取得全部四條、指向它唯一的那一頁；沒有說明頁的題目一條都沒有；沒有 `range.json` 與沒有 key 的 `range.json`，產生的位元組與 `zh-TW` 相同；每一種 `range.json` 失敗都丟出它的 PL 行，既有的檔案維持不變。（S1–S11）
- **AC-28** 規則依永久編號再依形式排序，結果確定，補零到三位、四位數維持原樣；沒有有效永久編號的題目宣告，或兩份用同一個號碼的，會被拒絕並點名檔案；說明頁的 `number` 被忽略，`number-locales` 不存在；完整模式下，沒有題目宣告的說明頁被拒絕；`collectChallengeNumbers` 只讀題目宣告；`nextChallengeNumber` 保留現役、下架題目宣告與舊式下架的號碼；清單外的語系資料夾不改變任何東西；`isChallengeNumber` 恰好接受從 1 起的安全整數，產生器從不以指數寫出號碼。（S12–S21、S75）
- **AC-29** slug 規則依 `P` 遵循 S-§4.1 或 S-§4.2；舊網址規則恰好在 `P = zh-TW` 時是最後一條規則；每條編號規則都在每條動態規則之前；檔頭與各節註解等於帶著計算後數量的 K1–K5（注入第五種形式時是 400）。（S22–S27）
- **AC-30** commit 進去的 `_redirects`，與以 index 的 `range.json` 在 git 的 index 上產生的結果逐位元組相同；每條 commit 進去的規則都符合 S30 三種形狀之一（編號的 regex、依 `P` 而定的 slug 清單、舊網址規則）；shadow 檢查把 splat 視為遮蔽其後每一條 `/zh-TW/` 規則，結果為空（S31）；每個目標都能經由頁面路徑對應解析，主語系的題目資料夾必須存在，沒有 `index.md` 的 slug 資料夾忽略（D127）；`briefFaults` 在本 repository 上回傳 `[]`，對兩種主語系下的每個 fixture 情況，恰好回傳 S35 算出的缺陷（每個 slug 一個 `missing-primary`、每份說明頁一個 `missing-declaration`、每個路徑一個 `old-layout`），依 S-§4.7 的順序回傳，S-§4.7 的範例逐字相符。（S28–S35）
- **AC-31** hook 在清單上語系資料夾的每個題目路徑、`_redirects` 與 `range.json` 上觸發，其他一概不觸發（只改了 `platform/public/challenge/`、`platform/shared/challenge/` 或清單外資料夾時，結束於 0007 O1，從不進到驗證或 W4，S80）；清單上語系的說明頁路徑會進到驗證；新題目、新增或刪除翻譯、未追蹤與被忽略的翻譯、兩個方向的 staged `range.json` 變更、它的 staged 刪除、只改 `upstream` 的變更與未 stage 的變更，各自依它的列結束，staged 的 `_redirects` 等於 oracle（S41、S42、S74、S77–S79）；驗證與產生器都從 index 取主語系，所以不一致的工作樹不改變任何結果（S76、D122）；`range.json` 失敗時結束於帶 PL 行的 0007 O4、什麼都不改，或在這次 commit 也 stage 了題目路徑時結束於帶同一行的 0007 O3；index 裡已有的缺陷結束於 0007 O4，W6 行逐字相符，W6r 出現一次；這次 commit stage 進來的缺陷結束於 0007 O3，帶 validator 的訊息、沒有 W6 行；下架與取消下架會移動規則；W4a 與 W4b 依 S47 的案例填入 `<dir>`、`<L-name>` 與 `<P-name>` 後，等於 S-§4.5 的文字；staged 的 `primaryLocale` 變更、而有題目缺新主語系的說明頁時，結束於 0007 O4，以 W6a 點名它，什麼都不改；帶 `number` 的說明頁被驗證拒絕；其他每個既有的 hook 案例在重建的 fixture 上通過。（S36–S49、S73、S74、S76–S80）
- **AC-32** 若第 4 階段採用：整個未追蹤的語系資料夾由 W4 點名，控制字元已跳脫，只從 cache 移除時以 0 結束（T-0058）；slug 文法以外的 slug 與會遮蔽永久編號的 slug，在兩種模式下都停止產生（T-0059）。若第 4 階段不採用其中一張，AC-32 對應的部分離開主張表，收尾時檢查該 ticket 檔的狀態是 `pending`，並帶新的 `revisit_when`（T7）。（S50、S51）
- **AC-33** `challengePagePath` 給出表上的四個結果，而且是產生器目標的唯一來源；在兩個清單、兩種主語系下，每個有永久編號的條目（翻譯的或借來的；孤兒翻譯說明頁不在任何清單）都有一個複製按鈕，short mode 給 `<origin>/<清單語系>/c/NNN`，page mode 給頁面路徑的網址；沒有永久編號的條目沒有；導覽列的按鈕跟著頁面語系；建置出的上游網站，兩個清單上每道有永久編號的題目各有一個 page mode 按鈕。（S52–S56）
- **AC-34** S64–S72 的註解、README 段落、GLOSSARY 詞條與 skill 句子，在兩種主語系下都為真，有兩種語言的地方兩種都是。（S64–S72）

### 題目宣告（Y 區）

- **AC-35** `readChallengeDeclaration` 把上游每個檔案讀成 Y-§2.4 的值，日期維持字串，接受開頭的文件標記，並對列出的輸入回報 `absent`、`not-a-mapping`、`invalid-yaml` 與 `multi-document`（重複 key、alias 展開超過上限、alias 沒有對應 anchor、無法解析的 tag 也是 `invalid-yaml`；`<<` 是一般 key；`yes` 是字串，D129）；`validateChallengeDeclaration` 要求 `backend` 與 `app`（字串），其他每個 key 維持今天的訊息，以 VM5 依檔案順序拒絕說明頁 key，讓不認得的 key 通過，退役舊欄位而不發 `fs` 警告，回傳所述的預設值，`number` 只接受 ≥ 1 的安全整數。（Y1–Y21、Y104、Y112）
- **AC-36** 上游的說明頁在兩個語系都驗證通過；帶 `title`、`layout`、`description` 以外任何 key 的說明頁以 VM6 失敗；`title`、`layout`、`description` 的失敗給 VM7–VM9；沒有 frontmatter 或 YAML 無效的說明頁以 VM14 或 VM15 失敗；缺主語系說明頁時，對每一種 `range.json` 狀態都在主語系的路徑以 VM10 失敗；沒有題目宣告的說明頁會被找到，並以 VM1 失敗；清單外的語系資料夾被忽略；這個指令不論帶不帶 slug，都在任何檢查之前以 PL-E08 回報舊版面頁面；不認得的 slug 與無法使用的 `range.json` 依所述以 1 結束；題目資料夾裡的零散項目讓 `structure` 檢查以 VM13 失敗。（Y22–Y37、Y103）
- **AC-37** 以來源路徑呼叫 `assembleChallengeFrontmatter`，對兩個語系的每一份上游說明頁都回傳說明頁 ∪ 題目宣告 ∪ 內文（題目宣告的投影在各語系相等），對其他頁面回傳 `null`；在 rewrites 下讓每個語系頁拿到自己的內文；把 schema 錯誤交給 validate；把 `__proto__` 與 `constructor` 保留為 own key，不改變任何原型（Y113）；對列出的情況丟出 PL-E13–PL-E18，由 `docs:build` 回報；兩個語系建置出的題目頁顯示相同的徽章、永久編號、工具分頁與 Source 分頁，每一頁的 `wasmModule` 回應都是 200，Browser 面板的網址輸入框在 30 秒內可用；第 7 階段確認 Y106 的兩項檢查都成立（繁中 selected-excerpts 頁列出的檔案恰好是英文頁的那些，以及任何 `challenge.yaml` 的任何 scalar 都不含它的 flag，比對時去掉至多一個結尾換行）。（Y38–Y48、Y106、Y113）
- **AC-38** `ChallengeLayout` 在兩種路徑形狀下都從上層資料夾取得 slug；模組沒有 `wasm_fs_list` 時，顯示點名 `pnpm challenge:keygen` 的執行期錯誤；第 8 階段顯示兩個語系頁有相同的工具面板。（Y49–Y51）
- **AC-39** keygen 只處理有 `challenge.yaml` 的題目資料夾，把 `wasmModule` 寫在那裡（刪除舊欄位、其他行不變、不碰任何說明頁），`--force` 之後上游每個檔案逐位元組不變，位元組不會改變時什麼都不寫，只因題目宣告、`src/`、`.fsignore` 與範本而過期，第二次執行就收斂（否則 ticket 停下交給使用者，D133），payload 失敗時中止且兩個檔案都不變，忽略扁平檔案，保留每一種 `source_files` 失敗，`range.json` 無法使用時以 1 結束、第一行是它的 PL 行、什麼都不寫（Y107）。（Y52–Y61、Y107）
- **AC-40** retype 只改 `challenge.yaml` 中被指名的 key（註解、順序與說明頁逐位元組不變），拒絕沒有 `challenge.yaml` 的 slug，保留更換 backend 的流程，從不讀說明頁；analyze 從主語系說明頁取標題（沒有就用 slug），其餘從題目宣告讀，只找題目資料夾，`range.json` 無法使用時以 1 結束、第一行是它的 PL 行。（Y62–Y69、Y108）
- **AC-41** `create:challenge` 對每一種 `range.json` 狀態都寫出主語系說明頁（其他語系什麼都不寫），以 PL 行拒絕無法使用的 `range.json`、樹逐位元組不變，說明頁恰好寫 `title` 與 `layout`，題目宣告恰好依序寫列出的八個 key，除非給了 `--title`，否則用該語系的預設標題與 `TODO` 內文，清單上每個語系都有 scaffold 文字，任何題目資料夾或語系說明頁資料夾已占用的 slug 以 CC1 拒絕、什麼都不寫，產生的 scaffold 驗證得過，在 W1 與 W2 點名說明頁路徑，並在寫入任何東西之前以 PL-E08 拒絕舊版面的樹。（Y70–Y85、Y105）
- **AC-42** 上架閘門的 L1 與 L2 在沒有題目宣告時以 VF1 失敗，`range.json` 無法使用時給出 PL 行（Y109），其他情況回報失敗的標籤；`deriveSlugs` 把題目宣告、`src/` 與清單上語系的說明頁路徑（含絕對路徑與反斜線形式）對應到 slug，其餘忽略，包括說明頁資料夾裡的其他檔案與沒有 `index.md` 的資料夾，hook 的 0007 W4 列表也一樣（Y111、D127）；lint-staged 依所述回報 LS1、移除與 VM1；hook 擋下帶禁用 key 的說明頁；對每一種 `range.json` 狀態，L4 package 都是主語系說明頁的標題與第一段（無法使用時丟出 PL 錯誤，Y110），沒有它時丟出 PP1，且不含 `challenge.yaml` 的 `wasmModule`、`app`、`flag` 或 `source_files` 值作為子字串。（Y86–Y93、Y109–Y111）
- **AC-43** wxl-create、wxl-mutate 與 wxl-verify 三個 skill（本 epic 的變更在兩個 tree 相同，D135，由 PAT6 逐張 ticket 檢查）、README、CONTRIBUTE、pipeline 與版面文件，以及學習者指南，都說出 Y94–Y100 所述的內容；`pnpm dev` 執行中修改 `challenge.yaml`，要重新啟動後才在題目頁上出現。（Y94–Y101）

### 升級的搬家（U 區）

- **AC-44** 老師的靶場恰好在它有舊版面頁面時被搬，base 恰好在 base 有時被搬，不論版本或 `--from` 的形式；停在步驟 6 或步驟 7 的重複檢查的 run，什麼都不搬、什麼都不寫；頁面判斷式對表上每個路徑的分類都如所述。（U1–U9、U11、U151）
- **AC-45** `planLayoutMove` 把每個舊版面頁面以相同位元組搬到英文的語系資料夾；把英文說明頁拆成說明頁（fence、保留的 group、內文）與 `challenge.yaml`（題目宣告的 group），每一行逐位元組相同、帶著自己的換行，group 維持順序，BOM 只留在說明頁；對有英文說明頁的題目，去掉每一份翻譯說明頁的題目宣告 group，已經有題目宣告的題目則不動（只多一個零散頁面的新版面樹，只得到那一頁的搬家）；結果確定；以語系命名的舊版面頁面照一般頁面搬，下一次建置再以 PL-E09 拒絕（U150）；在沒有舊版面頁面的樹上什麼都不做。（U20–U24、U26、U27、U30、U31、U146、U150）
- **AC-46** UP-A16 恰好對由老師造成的不一致，每個（翻譯說明頁, key）回報一次，以 `yaml` 解析後的值比較；`challenge.yaml` 一律帶英文的值；base 自己 `selected-excerpts` 的不一致不回報。（U40–U49）
- **AC-47** 每一列 token 的停止，都以最先失敗那一側（target、base、靶場）的每個失敗各一行 UP-E14 結束 run，順序、側別與句子如所述（base 的行只有開頭與 base 的補救方式），以 1 結束，發生在步驟 9 之前，什麼都不寫，也不留下暫存資料夾；懸空的非頁面連結、NFD 名稱與排除區不會造成停止，維持不動；轉換會去掉 group 的翻譯說明頁若被忽略或是符號連結，會讓 run 停下，每個說明頁路徑一行（U153、D125）；頁面路徑在 0006 步驟 4 之後變成連結或 FIFO 時從不被讀取，連結以 `symlink` 失敗，FIFO 以 UP-E11 結束 run 而不卡住，而在 run 之前就被換掉的頁面在步驟 4 以 UP-E03 結束（U154、D139）；讀取錯誤是 UP-E11，git 指令失敗是 CW-E14，兩者都不帶 UP-E14 行，即使旁邊已經收集了失敗也一樣（D142）。（U10、U12、U25、U27–U29、U50–U63、U144、U148、U153、U154）
- **AC-48** 合併在搬家後的 base、經由搬家計畫的老師檔案與 target 上執行，每個目的地的結果都如 0006 對它的那一列所述，不論合併把老師的檔案留在哪裡，搬家的 op 都成立；來源只在步驟 9 刪除，目的地（含被去掉 group 的翻譯說明頁，U149）只在步驟 9 寫入；`HEAD` 與 index 從不改變；搬過的檔案保留 mode；清空的資料夾留著。（U32、U70–U85、U149）
- **AC-49** 完成一次有搬老師靶場的 crossing run 之後，`range.json` 恰好在原本沒有這個 own key 時，以最後一個 key 帶上 `"primaryLocale": "en"`；任何種類的既有值都保留（保留 `zh-TW` 會讓只有英文的題目沒有主語系說明頁，由 validate 回報，U140）；不是 crossing、或沒有搬老師靶場的 run，寫出 0006 的結果，所以這種 run 搬過的只有英文的題目，之後在保留的主語系以 VM10 失敗（U9、U151）；UP-E09 讓它維持不變；沒有 `upstream` 也沒有 `--from` 的 `range.json` 仍以 0006 的 UP-E06 `upstream` 停下。（U2、U3、U9、U90–U94、U140、U143、U151）
- **AC-50** 恰好在有搬家的 run 裡，報告在 R5 之後印出 R6，行與順序如所述；R2 不含搬家的 op；R3 以路徑與 key 印出 UP-A16；R4 的 crossing 行與它的 redirects 行恰好在 crossing run 裡出現（crossing 行只在 R3 有 UP-A12 時）；每個新代碼都存在於兩張表，並以它的代碼開頭；外來的值都跳脫；沒有搬家的 run 的報告不變。（U48、U64、U100–U108、U138）
- **AC-51** `ANCHOR_PATHS` 是 D107 的九個路徑，fork:init 的首頁路徑是兩個新的首頁；錨點在搬家後的 base 與 target 不同時，crossing run 回報 UP-A12；fork:init 改寫兩個新首頁，並以 0003 不變格式的 A7 缺檔錯誤（`A7: platform/en/index.md is missing`）拒絕舊版面的樹，而且在 epic 0011 之前，對缺翻譯首頁的樹也同樣拒絕，不論主語系是哪一個（缺 `platform/zh-TW/index.md` 或 `platform/en/index.md`，U145、U152）；create-wxl 的建立流程與上游原廠的測試讀新的路徑。（U13、U110–U116、U145、U152）
- **AC-52** 一次完成或失敗的、有搬家的 run 之後，`git checkout -- . && git clean -fd` 得到空的 porcelain 狀態、`HEAD` 的檔案，以及逐位元組不變的被忽略檔案；訊號與失敗都不留下暫存資料夾。（U82、U94、U120–U124）
- **AC-53** 在上游，最後一個舊版面發布版本（`v3.1.1`；沒有更新的 `v*` tag 是舊版面）的 `platform/` 經轉換後，等於比對的樹（在第一個新版面的 `v*` tag 存在之前是工作樹，之後是那個 tag），測試例外表上的路徑除外；例外表在收尾時等於 U-§5，兩者的每一筆新增都要使用者核准，並記在該 ticket 的第 6 階段處置表（D130）；例外表以外有差異的路徑會失敗；這個測試在沒有 tag 的上游失敗（而不是跳過），在靶場或 fork 不論有沒有 tag 都跳過，並 import 發布的模組；`v3.0.0`、`v3.1.0` 與 `v3.1.1` 各自的轉換都沒有失敗，只有 selected-excerpts 的 `source_files` 不一致；在上游執行根目錄套件的每個 job 都會 checkout tag；create-wxl 的語系清單與頁面判斷式等於網站的。（U130–U134、U136、U139、U142、U147）
- **AC-54** GLOSSARY 的設定紀錄與搬家詞條，各自說出 D105 記下 `en` 的三個條件（從舊版面的上游版本升級、靶場本身被搬、還沒有記主語系），每個條件都照 U135 的寫法出現；README 的升級一節照 U137 所列說明搬家，兩種語言都有。（U135、U137）

### 第 8 階段

- **AC-55** 在樹的複本上（F-6），PL-E01–PL-E14、PL-E17 與 PL-E18 的每個案例都讓 `docs:build` 以它的首行失敗（PL-E15 與 PL-E16 歸 V-Y3）；停用那條規則時，VitePress 自己的檢查會讓 PL-E11 的連結通過；舊的 `../../reference/…` 連結在 `en` 下建置得起來，在 `zh-TW` 下讓 VitePress 的死連結檢查失敗；`en` 主語系的建置依 `en` 欄排列檔案；在 F-1 的 preview 與 F-3（以 `en` 重新部署）上，首頁按鈕、參考文件連結與導覽列標題都到達所述的頁面；舊版面的 fork 讓 `pnpm build` 以 PL-E08 失敗，且那是唯一的 PL 行；在 F-6 上，dev server 提供兩個語系，要重新啟動後才跟上 `range.json` 的修改。介面：依各列所指，為終端機與 Browser panel。（V-B1–V-B6）
- **AC-56** 每一列 VA 的轉址、落點、那一行與儲存值，都在它的介面上成立：F-1 的 Cloudflare preview（含經由伺服器規則的舊網址、短連結、not-found 路徑、解題紀錄沿用確認的清除、1280、1024 與 375 寬的語系切換按鈕），GitHub Pages 上的 F-3（含經由 not-found 去前綴的舊網址、構造過的路徑留在同源、兩個方向各缺一個翻譯、指向只有英文頁面的舊網址，以及以 `P = en` 重新部署後的冷載入轉址、去掉 `/en/`、缺翻譯與語系切換按鈕），以及 `P = en` 的 F-2 Cloudflare preview；VA4 的終端機 grep 什麼都不印。（VA1a–VA1m、VA2a–VA2l、VA3a–VA3e、VA4）
- **AC-57** 送出的與 hydration 後的清單與首頁字串、日期、語系標記、複製按鈕、空清單狀態、統計、正式站沒有 fixture、dev server 的清單更新、預期解頁面的主語系說明頁，以及 F-2 的 `P = en` 清單，都依 VL1–VL9 在各自的介面上成立；preview 上的複製按鈕顯示 `wxl.browserlab.online`（`SITE_ORIGIN`）。（VL1–VL9）
- **AC-58** 在 F-1 與 F-2 的 preview 上，每個短連結的第一跳都是所述的 302 與 `Location`；S59 的優先順序被觀察並記錄（true 或 false；false 表示多一跳，不算失敗，D60）；舊網址到達根網址，雙重前綴與一個 `platform/public/zh-TW/` 檔案被觀察並記錄（S60、D138）；沒有任何構造過的路徑——單次或雙重編碼的斜線與反斜線、tab、CR 與 LF 都在內——會給出站外的 `Location`（S61，唯一的關卡：失敗時 ticket 停下由使用者選擇，D118）；複製按鈕顯示 `wxl.browserlab.online/<清單語系>/c/NNN`，它們的目標以在 preview 上請求同一路徑來檢查；在 F-2 的拋棄式 clone 上，hook 在加入翻譯之後、以及 `primaryLocale` 改變之後重新指定規則目標。（S57–S63、V-S1–V-S7）
- **AC-59** 在 F-6 上，`create:challenge` 對每一種主語系寫出主語系的 scaffold，放錯位置的 key 讓 validate 與建置以所述代碼失敗，retype 與 keygen 只改它們所述的東西，不執行 agent 而建出的 L4 package 是主語系說明頁，dev server 要重新啟動後才顯示題目宣告的修改；在 F-1 的 preview 上，每道題目的兩個語系頁顯示相同的工具面板。（V-Y1–V-Y8）
- **AC-60** 以推上去的 head 打包的 tarball，一個帶有老師自己題目與頁面的 `create-wxl@3.0.0` 靶場依 V-U1 所述升級（報告項目、`range.json`、搬過與合併的檔案）；之後 fork:init 與 `pnpm build` 通過，還原指令讓狀態清空；升級後的靶場在 `/` 提供英文、在 `/zh-TW/` 提供繁體中文，兩個題目頁都帶英文的題目宣告；`v3.1.1` 的 fork 以 `--from 3.1.1` 升級；同一個 fork 改為拉入新版本（解決該版本的衝突並記錄）時以 PL-E08 失敗，照 README 的手動步驟後建置得起來（它的老師頁面由 PL-E08 列出，或已被 git 的改名偵測搬好，兩者擇一記錄）；只照 README 的步驟 2–8，並以「checkout 新版本在 `platform/` 以外的每個路徑，再加上 `platform/shared/` 與 `platform/public/`」取代步驟 1，也得到建置得起來的網站；升級後靶場的單元測試套件通過；沒有自己頁面的 fork 拉入新版本後建置得起來，在 `range.json` 記下 `en` 之前，根網址提供繁體中文。（V-U1–V-U5）
- **AC-61** D124 列出的每個測試都只在上游執行：經由同一個 helper 宣告，它在靶場與 fork 中以 upstream 判定的理由跳過、在上游執行（第 6 階段檢查每一個都用了這個 helper）；上游的 CI 不會悄悄跳過它們，因為在 `WXL_EXPECT_UPSTREAM=true` 下判定為 false 時，`test` job 既有的期望檢查會失敗，smoke job 也讀同一個判定；其他每個讀真實樹的測試都從主語系與那棵樹推導期望值（第 6 階段）；在 F-2 的拋棄式 clone 上（`P = en`，一個靶場），`pnpm test --run` 與 test build 上的 smoke 套件都通過。介面：終端機。（B93、V-B7）

## 測試決策

- 在 traceability seam 表的 seam 上測外部行為：以參數為輸入的純函式（主語系 parser、版面檢查、頁面清單、路由決策、合併、說明頁檢查、轉換、報告產生器）；以 SSR 與 mount 呈現的元件；在 repository 以外的暫存樹上執行的命令列工具；在真實 git repository 上搭配 fixture archive 執行的升級 `run`；在真實 repository 上的 hook。沒有測試對內部狀態做斷言。
- 每一條依主語系而定的規則都在兩種主語系下執行。沒有測試依賴前端模組的後備值；每個測試都明確設定 `P`（D31）。在第一個紅燈測試之前，switch ticket 先單獨加入那個模組並跑一次測試套件；被它的 `zh-TW` 後備值翻轉的每個既有測試都列在「Overridden contracts」，只有為了設定 `P` 而改（改參數或 mock 那個模組）、斷言不變的測試例外，這種改法允許，由第 6 階段檢查它只這樣改（T1）。測試以函式參數或 fixture 樹自己的 `range.json` 選擇 `P`，絕不用環境變數（D21）。
- 訊息以逐字相等釘住：PL-E01–PL-E18 的首行、VM1–VM10 與 VM12–VM15（VM11 退役）、hook 的 W4a–W6r、`_redirects` 的註解 K1–K5、UP-E14 兩種語言的開頭、token 句子與 base 補救方式、UP-A16、清單元件的 LW1 警告、兩語系守衛的 GD1、報告的 R4 與 R6 行、那一行的句子與清單字串（從字串表讀取）。第三方的文字（VitePress 的找不到頁面畫面、ICU 的日期輸出、Cloudflare 的行為）絕不釘住：以元素判別、在測試裡計算，或在第 8 階段記錄。
- 前例：`page-list.test.ts` 與 `config-base.test.ts`（設定與頁面清單），`initial-locale-redirect.test.ts`、`arrival.test.ts`、`not-found-wiring.test.ts`、`theme-locale-wiring.test.ts`、`locale-switcher.test.ts`（路由），`ChallengeList.test.ts`、`HomeContent.test.ts`、`merge-challenges.test.ts`（清單），`redirects*.test.ts`、`challenge-numbers.test.ts`、`pre-commit-sh.test.ts`（短連結與 hook），`config.test.ts`、`challenge-validate.test.ts`、`challenge-keygen.test.ts`、`create-challenge*.test.ts`（題目宣告），`create-wxl/test/upgrade-*.test.mjs`（升級），以及 test build 上的 site-smoke 套件。
- 「Overridden contracts」點名的既有測試隨本 epic 修改；第 6 階段檢查每一處修改都是表上所述的那一項，並拒絕任何其他測試的修改。
- 上游的 CI smoke 以 `WXL_SMOKE_PAGES=1` 建置上游（`P = zh-TW`）；每個靶場的 CI 在它自己的樹上執行同一組單元與 smoke job，所以斷言上游自身內容的測試只在上游執行（D124），其他每個測試都從主語系推導期望值（D54）；V-B7 在 `en` 靶場上執行兩個套件。除此之外，`P = en` 由單元列與第 8 階段涵蓋。第 8 階段在 fixture F-1–F-6 上（D119）、在各列指名的介面上執行，題目頁一律打開 Browser panel；升級的列在本機以 tarball 執行，因為發布不在本 epic 範圍內（R31）。
- keygen 的收斂（Y58）在第 5 階段、寫它的測試之前，先在拋棄式 clone 裡量測。

## 不在範圍內

- Epic 0011：create-wxl 的主語系提問、fork:init 的 `--primary-locale`（以及它的 R2 修訂，R4）、翻譯骨架指令、wxl-create 在出題後的提問，以及 R25（`range.json` 沒有 `upstream` 時 UP-E04 的措辭）。在那之前，老師以編輯 `range.json` 選擇主語系（R13）。
- 日文（`ja`）：它的內容、介面字串與 create-wxl 選項；兩語系守衛指向的參數化那一行與語系標記（D33）；not-found 的主語系路徑在多個翻譯之間的順序（D27）。
- 隔離同一個 GitHub Pages owner 底下各靶場的語系偏好（OQ-018、R8）；注意 `fork:init --rebrand` 會改掉 `wxl-locale` 這個 key，所以只有共用 key 的靶場才共用語系偏好。
- 發布 create-wxl 或發布新版本（R31）：epic 的收尾不等發布；下一次發布要等 T-0074（handoff），經由 registry 執行 `pnpm range:upgrade` 在那之後檢查。
- T-0064（G4 的空 `core.hooksPath`，epic 0005 串連分析的維護 ticket）：這裡不碰，它仍是本 epic 以外的維護 ticket。
- 替上游舊的、不帶前綴的英文網址加轉址（R20）；release note 會說明。
- 在主語系為英文（或任何其他主語系）的靶場上，為 `/en/` 加一條鏡像的舊網址規則（S-O6）。
- 對 `challenge.yaml` 與說明頁的 flag 外洩檢查（延後，N20；收尾時開 open question）。
- 替換導覽列、清單與首頁介面上的「挑戰」一詞（L-O3；open question），包括 D42 搬進字串表的 `challenge_list.default_title` 值 `網站攻防挑戰`。
- 清單與首頁以外、在伺服器端渲染的 `$t` 字串（題目版面、指南元件）：它們在 hydration 之前呈現 `en`，和今天的 `/zh-TW/` 頁面一樣，現在主語系為繁中的根網址也是如此（D128；open question）。
- 各語系各自的網站 `description`（B-O5）；網址以規則形式（`/c/`、`/<L>/c/`、`/zh/c/`）開頭、會被短連結規則遮蔽的頁面，不論在哪個語系資料夾（B-O8）；`en` 主語系網站的 CI 建置（B-O2），它會使用帶自己 `range.json` 的 fixture 複本（D136）。
- 日後更改主語系的工具（Q18）：README 寫明代價。
- 改寫搬過的頁面裡的相對連結或資源參照（D95、D101）。

## 其他說明

- 上游自己的搬家由 `planLayoutMove` 在它的樹上產生，所以老師的 base 原廠靶場在搬家之後等於上游出貨的內容，能乾淨地合併（R15、D108）。上游相等性測試（0010-S49）在第一個新版面發布版本打上 tag 之前比對工作樹，之後比對那個 tag，由它自己選擇，所以不需要任何發布 ticket 去切換它，之後修改頁面也不會讓它壞掉；它在靶場與 fork 中跳過（U-O4，已被取代）。
- crossing 升級一定會回報 UP-A12，因為本 epic 改了 `.vitepress/config.mts`；報告會說明這是預期中的（R24、D106）。
- N17 的 GLOSSARY 句子（搬家詞條的那一句；設定紀錄在工作樹裡的那一句已說出 D105）必須改。U135 關於升級寫入 `en` 的兩句——設定紀錄與搬家各一句——跟著升級的搬家 ticket（T4）落地，工作樹 GLOSSARY 修改的其餘部分跟著 switch ticket（T1）落地（U135、B90；B90 也讓主語系、翻譯、語系偏好、短連結、舊版面與語系清單與本 spec 一致，並移除本 epic 語料開始使用的每個詞的 `_新造詞_` 行）；在那之前，本 spec 的名詞表說明 D105 取代它；舊網址規則的 open redirect 關卡（D118）可能在第 8 階段把規則組的選擇交給使用者。
- ticket 順序（T1–T9）：一張 switch ticket 帶著內容搬家、題目宣告的拆分，以及兩者的每一個讀取者，連同建置、路由、loader、smoke fixture、產生器、hook 與錨點；純模組與轉換可以在它之前落地；參考文件與升級的搬家在它之後落地。
- spec 0006 的〈其他說明〉預測本 epic 會修訂步驟 8 的「什麼都不寫」；本 epic 沒有：步驟 7 在暫存資料夾裡改 base，步驟 8 規劃，步驟 9 寫入（D93）。
