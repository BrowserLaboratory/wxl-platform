# 0010-primary-locale-layout 第 1 輪：可驗證性（V 軸）審查報告

**範圍說明：** 我讀的是工作目錄裡的 `spec.en.md`、`traceability.md` 和 `GLOSSARY.md`。我手上沒有 Git 或 shell 工具，所以沒辦法核對 blob hash（f45f078…、5d3c16c…、b307335…）和 HEAD 65de8c0。這幾個值請 parent 自行確認。我讀過的程式碼佐證都是工作目錄的現況。

**總結：** 所有 AC 和矩陣列裡都沒有 "appropriately"、"reasonably"、"as needed"、"where possible" 這類一律判 P0 的字眼，所以沒有 P0。問題集中在三類：
- 表格裡的指令和 regex 有跳脫歧義。
- 有一列 stage 8 的步驟本身互相矛盾。
- 一批文件審閱型、交叉引用型的判準需要人來詮釋。

---

## 必須處理的兩項（P1）

### V-1　表格裡的 `\|` 讓 grep、regex、shell 判準一定有一個是空過或必敗
- **位置：** traceability.md:1767（B18）、1917（A28）、1951（L18）、1971（L36）、2045（S30）、2564（VA4）；spec.en.md:380-383（AC-2）、469-473（AC-16）、511-516（AC-23）、545-551（AC-30）、697-704（AC-56）。
- **違反的要求：** 每條判準都要能不經詮釋判定通過或失敗（V 軸）。
- **證據（直接讀到）：** 表格儲存格裡的 `\|` 同時當成 Markdown 的管線跳脫和 regex／shell 字元，可是各列的本意不一樣：
  - B18 `git grep -nE "'en' *\| *'zh-TW'"`：本意是字面上的 `|`（型別 union）。
  - A28／VA4 `"localeIndex\.value\s*(===\|!==\|==)"`：本意是 alternation。
  - L18 `"Web exploitation challenge\|網站攻防挑戰"`：本意是 BRE alternation。
  - S30 `^/(?:en/\|zh/\|zh-TW/)?c/[0-9]{3,}$`：JS regex，本意是 alternation。
  - L36 `find … \| grep -q .`：本意是 shell pipe。
- **推論：** 照 Markdown 渲染後的文字讀，B18 會變成 `'en' *| *'zh-TW'`，`'en'` 單獨就會命中。工作目錄的 `.vitepress/` 現在有 22 處 `'en'`，epic 結束後也還有，例如 createI18n 預設值和 `localesConfig('en')`，所以正確的實作也會失敗。照原始文字讀，A28／VA4 的 `\|` 在 ERE 是字面管線，這個 grep 永遠不會命中，「no output」就空過了。L36 照原始文字讀，shell 會把 `\|` 當成 find 的參數而出錯。
- **影響：** 兩種讀法都沒辦法讓這幾條判準同時正確，AC-2、AC-16、AC-56 的 grep 部分不是假失敗就是空過。
- **信心：** 高。B18 和 A28 對同一個 `\|` 的意圖相反，這點是直接讀到的。
- **建議等級：** P1
- **建議修法：** 把指令和 regex 移到表格外的 fenced code block，或寫進測試檔再讓列引用檔名。或者改用 `git grep -F`／`-P` 加上明確的字面寫法。

### V-2　V-U4 (c) 的步驟互相矛盾，而且漏了 `platform/shared/`，AC-60「只靠 README 步驟就能建置」驗不到
- **位置：** traceability.md:2633（V-U4 (c)）、1874（B84 step 1 與它的 AC）；spec.en.md:721-729（AC-60）、430-438（AC-10）。
- **違反的要求：** stage 8 判準要指名一個實際能執行的介面，而且步驟要能照字面執行。
- **證據（直接讀到）：**
  - (c) 要求「without pulling upstream's pages: check out only A's `.vitepress/`, `scripts/`, `package.json` and `pnpm-lock.yaml` … then follow every step of README's move section literally」。可是 B84 的 step (1) 是「merge the release first」，照字面做就會拉進上游頁面，跟「without pulling」直接衝突。
  - 新的單一 loader 和 merge 在 `platform/shared/`（B79 寫 `../shared/challenges.data.ts`；工作目錄現有 `challenges.data.ts`、`challenges.zh-TW.data.ts`、`mergeChallenges.ts`），但 (c) 的 checkout 清單沒有它。B84 step (1) 括號裡列的也只有 `.vitepress/`、`scripts/` 和上游搬好的頁面。
- **推論：** 如果略過 step 1，fork 留著舊的 loader：它讀舊的 glob，匯出陣列而不是 `Record<Locale,…>`。step 3 拆出 `challenge.yaml` 之後，清單也讀不到宣告欄位。(c) 期望「both list pages show the four challenges」很可能不會成立，而失敗的原因跟 README 寫得好不好無關。
- **影響：** AC-60 的「the README's steps alone … also give a building site」和 B84 的 stage 8 判準沒辦法照字面判定。
- **信心：** 中高
- **建議等級：** P1
- **建議修法：** 二選一：
  - 讓 (c) 明確跳過 step 1，checkout 清單補上 `platform/shared/`（以及其他新 runtime 檔）；
  - 或者把 B84 step 1 的括號改成完整清單，再讓 (c) 照它做。

---

## 值得記錄的項目（P2）

### V-3　B61 指錯 stage 8 列：V-B3 是 base `/`，不是 `/<repo>/`
- **位置：** traceability.md:1831（B61「stage 8 (V-B3) for base `/<repo>/`」）、2517-2518；spec.en.md:410-414（AC-6「under both bases」）。
- **證據：** V-B3 的介面是「Cloudflare Pages preview … base `/`」，base `/<repo>/` 是 V-B4（F-3 第二次部署）。
- **影響：** AC-6 在 `/<repo>/` 底下的 nav title 驗證指向錯的列。
- **信心：** 高
- **建議修法：** 改成 V-B4，或兩列都列出來。

### V-4　V-B3 寫「ticket branch 的 preview」，但 F-1 與 AC-55 指的是 `stage8/<ticket-id>`
- **位置：** traceability.md:2517、2495；spec.en.md:689-696。
- **證據：** F-1 的 Used by 有列 V-B3，AC-55 也寫「F-1's preview」。可是 V-B3 自己寫的是「Cloudflare Pages preview of the ticket branch」，而 ticket branch 本身也會有自己的 preview。
- **影響：** 這列驗證到底跑在哪個介面有歧義，不過兩邊結果大概一樣。
- **信心：** 中

### V-5　Y93／V-Y7「不含 `challenge.yaml` 的任何值」判定粒度不明
- **位置：** traceability.md:2277（Y93）、2618（V-Y7）；spec.en.md:618-622（AC-42「holds nothing from `challenge.yaml`」）。
- **證據：** `scripts/wxl-solver/build-player-package.ts:10` 顯示 META.yaml 有 `base_url`、`flag_regex`、`turn_budget`、`verification_run_id`。如果用子字串比對，`number: 1`、`category: web`、`source_visible: false` 這類短值幾乎一定會「命中」。如果用整值相等，又沒說列表元素（例如 `tags` 的 `idor`）算不算。Y93 括號只列了 `wasmModule`、`source_files`、`app`、`flag` 四個。
- **影響：** 不同人會判出不同結果。
- **信心：** 中
- **建議修法：** 把判準限定成括號裡那四個鍵的值，並寫明是子字串比對。

### V-6　Y106「沒有任何值等於 flag 檔內容」沒說要不要去尾端換行，也沒說是相等還是包含
- **位置：** traceability.md:2291；spec.en.md:591-597（AC-37「stage 7 finds no flag exposure in the change」）、354-358。
- **證據：** 原文是「no value of `challenge.yaml` equals the content of its flag file」。`src/flag.txt` 常常有尾端 LF；巢狀值（列表元素）和「包含 flag」都沒定義。另外 AC-37 的「no flag exposure」比 Y106 實際列的兩項檢查範圍更廣。
- **影響：** stage 7 的判定可能空過，也可能各說各話。
- **信心：** 中

### V-7　一批文件審閱型判準要靠人詮釋
- **位置：** traceability.md:1923-1925（A34–A36）、2109-2117（S64–S68、S72）、2475（U137）、1565（LH2）、1876（B86）；spec.en.md:480-484（AC-19）、573-574（AC-34）、683-685（AC-54）、524-526（AC-26）。
- **證據：**
  - A36：「or "the other locale" where the list or `P` is meant」需要判斷作者原意。
  - S64–S68：「stage 6 diff review finds each comment true for both P」。
  - S72：「confirms no false sentence」，範圍沒有邊界。
  - U137、B86：「Stage 6 reading against D…」。
  - LH2：「unless the documents area admits it to the corpus」，取決於別人的決定。
  - B84、B85、B87、B88、B89 已經列出逐項內容，相對比較好判。
- **影響：** 這些不是那幾個一律判 P0 的字眼，但判定結果會因人而異。
- **信心：** 中
- **建議修法：** 每列附上「必須出現／不得出現的句子或詞」清單，像 A36 列禁用片語那樣。

### V-8　U135「or one with the same conditions」需要詮釋
- **位置：** traceability.md:2473；spec.en.md:683-685。
- **證據：** 原文是「each holds the sentence 「還在舊版面、從舊版面的上游版本升級、而且還沒記主語系的靶場，搬家時會記成英文」 or one with the same conditions」。
- **建議修法：** 把三個條件拆開，逐一要求出現。
- **信心：** 中

### V-9　U-§5 例外表可以在 stage 5／6 擴充，AC-53 的比較變成部分自我參照
- **位置：** traceability.md:1482-1483；spec.en.md:674-682。
- **證據：**
  - AC-53：「except the paths of the test's exception table, which equals U-§5 at the close-out」。
  - U-§5：「A stage 5 or stage 6 finding that another page must change for a row of this spec adds that path here」。
- **影響：** 一個不該有的差異也能被「加進例外」消掉，「for a row of this spec」要靠詮釋。
- **信心：** 中
- **建議修法：** 新增的例外要經過使用者核准並寫進 disposition 表。

### V-10　LW1「每次 render 一次 `console.warn`」語意不明
- **位置：** traceability.md:1983（L45）、1023（LW1）；spec.en.md:499-510（AC-22）。
- **證據：** mount 之後元件可能因為狀態更新重新 render 好幾次。「exactly once per render」沒說是每個實例 setup 一次，還是每次呼叫 render function 一次，測試次數因此沒辦法唯一判定。
- **信心：** 中

### V-11　「list member 沒有 label key 時有一個測試會失敗」是 meta 判準，沒說怎麼驗證
- **位置：** traceability.md:1911（A22）；spec.en.md:459-464（AC-14）。
- **證據：** A31 有寫「verified once at stage 6 by temporarily adding a third code」，A22 卻沒有對應的驗證方式。
- **建議修法：** 改寫成「測試逐一檢查 `LOCALES` 每個成員都有 label key」，或照 A31 的做法在 stage 6 暫時加一個成員。
- **信心：** 中

### V-12　AC-2 的散文比判準寬
- **位置：** spec.en.md:380-383；traceability.md:1767。
- **證據：** AC-2 寫「no other locale enumeration remains」，但 B18 只 grep `KNOWN_LOCALES` 和 `'en' | 'zh-TW'` union。像 `['en','zh-TW']` 陣列，或 i18n 的 `messages: { en, 'zh-TW': … }` 物件，算不算「enumeration」要靠詮釋。後者幾乎一定會存在。
- **信心：** 中

### V-13　B14「configuration calls `readPrimaryLocale` with …」需要 spy 內部呼叫
- **位置：** traceability.md:1758。
- **衝突：** spec.en.md:737-738 寫「No test asserts on internal state」。
- **證據：** 驗呼叫參數只能靠 spy，跟上面那條測試原則衝突。後半段的 16 種環境 × 輸出值才是可觀察的判準。
- **信心：** 中低

### V-14　Y55 的退路 V-Y5 沒有跑 `--force`，判準沒被實際執行
- **位置：** traceability.md:2218（Y55）、2616（V-Y5）。
- **證據：** Y55 寫「when stage 5 finds the run needs wasm-pack, the row moves to stage 8 V-Y5」。但 V-Y5 的步驟只有不帶參數的 `pnpm challenge:keygen` 跑兩次，沒有 `--force`，也沒有比對 Y-§2.4 的位元組。
- **影響：** 一旦改走這條退路，Y55 的不動點判準就沒有任何列會去檢查。
- **信心：** 中

### V-15　V-Y6 和 Y51 對 selected-excerpts 的 Source 檔數判準不一致
- **位置：** traceability.md:2209（Y51「10 for `selected-excerpts`」）、2617（V-Y6 只列 `/workspace.py`、`/revisions.py`、`/course_pack.py`）。
- **影響：** stage 8 只檢查 3 個檔案，Y51 要的是 10 個，兩邊判定基準不同。
- **信心：** 高

### V-16　VL2 要跟 VL1「逐一比較 CS1–CS9」，但 VL1 只記了其中幾項
- **位置：** traceability.md:2574-2575。
- **證據：**
  - VL1 只列了 placeholder（CS3）、view titles（CS8）、sort-direction title（CS7）、h1（CS1）、subtitle（CS2）。
  - VL2 寫「compare each CS1–CS9 text … with VL1's」，可是 CS4–CS6、CS9 在 VL1 沒有基準可比。
- **信心：** 高

### V-17　VL9 沒指名「JavaScript disabled」要在哪個介面做
- **位置：** traceability.md:2582。
- **證據：** 介面欄只寫「F-2's Cloudflare Pages preview」。VL1 用的是 terminal `curl`，VL2 用 Browser panel，VL9 同時要「with JavaScript disabled and after hydration」，卻沒說是 curl 還是可以關 JS 的瀏覽器。
- **信心：** 中

### V-18　V-S3 的 15 次觀察只有一次有寫明期望值
- **位置：** traceability.md:2597、2093。
- **證據：** 期望值寫的是「Final page and line per R21 and the not-found lookup (quoted from those areas)」，5 個 URL × 3 種偏好只有 `/en/c/001` 寫了明確值。R21 只存在於沒有 commit 的 `.proj.research/` 筆記裡；D26 和 D30 有轉述，但每個組合的期望值得自己推導。
- **信心：** 中
- **建議修法：** 列出 15 格期望值表。

### V-19　V-U4 (b) 期望 PL-E08 列出 `platform/guide/teacher.md`，但這取決於 git 的目錄重新命名行為
- **位置：** traceability.md:2633。
- **推論（未驗證）：** 上游把 `platform/guide/*` 全部搬到 `platform/en/guide/`，git 的 ort 很可能偵測成目錄重新命名，把 fork 新增的 `teacher.md` 一起移到 `platform/en/guide/teacher.md`，並報 CONFLICT (file location)。這樣 PL-E08 就不會列出它。
- **影響：** 一個被拿來判定的期望值依賴第三方行為，而且這列其他部分本來就是「recorded, not judged」。
- **信心：** 低到中
- **建議修法：** 把兩種結果都列為可接受並記錄下來，或者在步驟裡固定 `-c merge.directoryRenames=false`。

### V-20　V-B5 用的是 65de8c0 的 `package.json`
- **位置：** traceability.md:2519。
- **證據：** 原文是「the tree at `65de8c0`, plus this epic's `.vitepress/` and `scripts/`」。如果這個 epic 改了 `package.json` 的 `build` 指令，V-B5 驗到的是舊指令。
- **信心：** 低

### V-21　S-§4.7 只靠範例定義 `briefFaults` 的回傳順序
- **位置：** traceability.md:1162-1199、1144；spec.en.md:545-551。
- **證據：** 排序規則（slug、W6a–W6d、present）只寫給 W6 輸出行，函式回傳順序沒有規定。AC-30 要求「S-§4.7's example verbatim」，等於隱含了順序；S35 其他案例的順序則沒定義。
- **信心：** 中

### V-22　Y58 的收斂「先量測」，但量測失敗時怎麼辦沒寫
- **位置：** traceability.md:2221、2715（Y-O5）；spec.en.md:765。
- **證據：** 量測結果只決定「在寫測試之前先量」，結果不收斂時 AC-39 的「converges」要不要變，沒有說明。
- **信心：** 低

### V-23　AC 散文用了含糊動詞，但對應的列都有字面值
- **位置：**
  - spec.en.md:424（AC-8「a link into a non-primary folder works」，B73 有字面值）
  - spec.en.md:547（AC-30「treats the splat correctly」，S31 有字面值）
  - spec.en.md:506（AC-22「work with the new URLs」，L31 是「existing cases rerun」）
- **說明：** spec 自己宣告「the rows hold the literal values」，所以影響小，只列出來供參。
- **信心：** 高（影響低）

### V-24　A31 和 AC-17 要求測試訊息「names the Japanese epic」，但沒固定字串
- **位置：** traceability.md:1920；spec.en.md:474-477。
- **證據：** 測試訊息要寫哪個字串沒有規定，跟 Testing Decisions「Messages are pinned by literal equality」的原則不一致。
- **信心：** 中

### V-25　Y-§2.5 表格中段的 Markdown 斷了，KG1–PP1 渲染後不會是表格
- **位置：** traceability.md:611-623。
- **證據：** 第 611 行「VM11 is retired…」是一般段落，下一行沒有空行就接 `|` 開頭的列。在 GFM 裡這些列會被併進段落，沒有表頭。原始文字還讀得懂。
- **信心：** 中

---

## 我檢查過但沒發現問題的地方

- spec AC-1 到 AC-60 逐條，以及 AC 索引的映射。
- B1–B92、A1–A39、DT01–DT80、SW01–SW16、L1–L47、S1–S75、Y1–Y106、U1–U148。
- stage 8 的 F-1 到 F-6、V-B1–V-B6、VA1a–VA4、VL1–VL9、V-S1–V-S7、V-Y1–V-Y8、V-U1–V-U5。
- 程式碼佐證：
  - session gate 的 clear 不會清掉 `wxl-locale`：`.vitepress/theme/index.ts:119`、`useArrivals.ts:42`。
  - `[data-panel="browser"]` 和 `toolsDisabled` 都存在：`ChallengeLayout.vue:91`、`:939`。
  - `create:challenge` 的 `--backend` 預設是 flask：`scripts/create-challenge.ts:102`。
  - `test:challenges` 跑在 dev server 上：`playwright.config.ts:40-42`。
  - `SITE_ORIGIN` 包含 base：`.vitepress/challenge/shortLink.ts:29-38`。
  - 上游頁面目前沒有任何 `](/` 連結，B75 成立。

---

**合計：** P0 0、P1 2（V-1、V-2）、P2 23（V-3 到 V-25）。
