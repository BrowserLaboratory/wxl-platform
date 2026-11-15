# 0010-primary-locale-layout 第 1 輪審查：K 軸（契約衝突）

**審查範圍說明：** 我讀的是 working tree 裡的 `spec.en.md`、`traceability.md` 和 `GLOSSARY.md`。這次執行沒有 shell，所以沒辦法用 `git hash-object` 核對 parent 給的 blob（f45f078…、5d3c16c…、b307335…）是否與讀到的檔案一致，請 parent 自行確認。以下判斷都以 working tree 內容為準；程式碼與文件依 HEAD 65de8c0 的 working tree 讀取。

---

## K-1 [P1] `glossary.test.ts` 的反向新造詞規則，與本 epic 要寫進語料的文件衝突

- **位置**
  - spec.en.md:430-438（AC-10 要求「GLOSSARY edit（with `glossary.test.ts` passing）」）
  - traceability.md:1880（B90）、:1874（B84 的 README 章節標題「搬到語系資料夾」）、:652（PL-E08 的第一行指名 README.md 的「搬到語系資料夾」）、:2289（Y100：`platform/zh-TW/guide/*.md` 改寫成「題目宣告」）、:1564-1565（LH1/LH2）、:1875-1876（B85/B86 的繁中 README 段落）、:2473（U135 也要求 glossary.test 通過）
  - tests/unit/site/glossary.test.ts:159、:175、:333-342
  - GLOSSARY.md:177（題目宣告）、:402（主語系）、:410（語系清單）、:416（語系資料夾）、:445（舊版面）、:451（搬家），都標了 `_新造詞_`
- **違反的契約：** `glossary.test.ts` 的「does not declare itself new while already in use」：已標新造詞的詞一旦出現在語料（`README.md`、`platform/**/*.md`、`zh-TW.json` 等）就失敗。
- **證據：**
  - 直接讀到：語料包含 `README.md` 和整個 `platform/`（glossary.test.ts:159、:175）。
  - 直接讀到：用 Grep 查目前語料，「題目宣告、語系資料夾、舊版面、搬家、語系清單、主語系」都還沒出現，所以這些新造詞宣告現在成立。
  - 本 epic 會把它們寫進語料：B84 的 README.md 標題就是「搬到語系資料夾」，PL-E08 要求標題完全照寫；Y100 和 LH1 在 `platform/zh-TW/guide/` 寫入「題目宣告」。
  - B90 列出的 GLOSSARY 修改沒有包含移除這些 `_新造詞_` 行。
  - LH2 只替「主語系」留了出口（「unless the documents area admits it to the corpus (0008 H7)」），其他詞沒有。
- **影響：** 照 spec 實作，AC-10 和 U135 要求的 `glossary.test.ts` 一定變紅。若反過來讓文件避開這些詞，又違反 AGENTS.md「命名前先讀 GLOSSARY」的用詞規則，而且 PL-E08 已經指定了標題文字，避不開。
- **信心：** 高
- **建議：** B90 明列：本 epic 寫進語料的每個新造詞（至少語系資料夾、題目宣告；繁中 README 若用到，再加主語系、語系清單、舊版面、搬家），同一個 change 移除 `_新造詞_` 行，以及「此前只出現在…」的說法。或者在 Overridden contracts 加一列 glossary.test 的對應處理。

## K-2 [P1] working tree 的 GLOSSARY「主語系」「語系偏好」有句子與 D25/D26 矛盾，B90 沒列進修改清單

- **位置**
  - GLOSSARY.md:405（主語系 `_Avoid_`：「自 epic 0010 起網站不替沒有語系偏好的學習者換語系，他看到的就是主語系」）
  - GLOSSARY.md:434（語系偏好定義：「還沒有語系偏好的學習者看到的就是主語系」）
  - spec.en.md:66-69、:112-113（User story 10：「stay on the page I opened, in the language of its address」）、:480-484（AC-19 要求主語系詞條在兩種主語系下都為真）
  - traceability.md:69-70（D25、D26）、:290-293（vocabulary 只概括說「this file holds」）、:1880（B90）
- **違反的契約：** GLOSSARY 的用語必須與 spec 規則一致（AC-19）。
- **證據：** 依 D25，沒有偏好的學習者打開 `/<T>/…` 時看到的是 T，不是主語系；依 D26，這次 cold load 還會寫入 T。B90 列了主語系、翻譯、語系偏好 `_Avoid_`、舊版面、語系清單的修改，但沒列這兩句。
- **影響：** GLOSSARY 照現在的內容與 B90 一起落地，AC-19 在 stage 6 會不成立。讀者也會以為沒有偏好就一律看到主語系，與 spec 的核心規則相反。
- **信心：** 中高
- **建議：** B90 加兩項：主語系 `_Avoid_` 和語系偏好定義改成「沒有語系偏好的學習者看到的是他打開的那個網址的語系」，或改成「直接打開主語系頁面時看到的就是主語系」。

## K-3 [P2] spec 引用的 GLOSSARY 原句已不在 working tree；「搬家」詞條仍與 D105 矛盾

- **位置**
  - traceability.md:291-292（vocabulary）、:149（D105）、:1205-1206（U-§1）、:1655（Area U 覆寫列）、:2666（N17）、:1513（BC18）
  - GLOSSARY.md:385、:386-387、:73、:450
- **證據：**
  - spec 引用的兩句「升級時搬家的靶場若還沒有記主語系，會記成英文」「靶場還沒記主語系的就記成英文」，在 working tree 的 GLOSSARY 裡都找不到。
  - working tree 的設定紀錄（:385）已改成「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」，大致符合 D105。
  - 搬家（:450）卻是「經由升級搬家、而且還沒記主語系的靶場記成英文」，沒有限定 base 是舊版面。這對 U3/U146 的情況（新版面 base、靶場因一頁零星的舊版頁面被搬家）為假，正是 U135 要禁止的說法。
  - BC18 引用的「不是平台在建置時讀取的設定」「英文是上游目前的主語系」也已在 working tree 改寫（:386-387、:73）。
- **影響：** 「D105 supersedes these sentences」指向不存在的句子，stage 6 無法核對覆寫對象；真正還錯的「搬家」那句反而沒被精準點名。
- **信心：** 高（逐字比對）
- **建議：** 以 blob b307335 重新引用：設定紀錄標為已符合 D105；搬家改點名 :450 那句；BC18 的「Where」欄註明已在 working tree 改寫。

## K-4 [P2] stage 8 的 create-wxl 指令與 platform-notes.md 已記錄的 npm 11 陷阱衝突

- **位置**
  - traceability.md:251（0010-S51「`npx --yes <tarball>`」）、:2497（F-3）、:2630、:2633（V-U 各列）、:2904
  - docs/agents/platform-notes.md:68-69
- **違反的契約：** platform-notes 記載 npm 11 會把 `npx --yes <tarball> …` 當成以路徑為名的指令執行，結果是 Permission denied、exit 126；正確寫法是 `npx --yes --package <tarball> create-wxl …`（T-0025、T-0027）。
- **影響：** 照 spec 字面執行，F-3 與 V-U1–V-U5 在 npm 11 上第一步就失敗；執行者若臨場改寫，紀錄也會和 spec 不一致。
- **信心：** 中高（npm 版本視機器而定）
- **建議：** 把 0010-S51、F-3 和 V-U 列的指令改成 `npx --yes --package <tarball> create-wxl …`。

## K-5 [P2] D42 把含「挑戰」的預設標題新增為介面字串，與 D44、LH3 自己的說法和 GLOSSARY 衝突

- **位置**
  - traceability.md:86（D42：`challenge_list.default_title` = `網站攻防挑戰` 搬進字串表）、:88（D44：「no new interface string carries the term 挑戰」）、:1566（LH3：「D44 adds no 挑戰」）
  - GLOSSARY.md:71（題目 `_Avoid_`：挑戰是待改的介面字串，不是可接受的別名）
  - platform/shared/mergeChallenges.ts:27（目前的預設值）
- **證據：** 這個預設值目前寫死在 `mergeChallenges.ts`。D42 讓它成為 `zh-TW.json` 的新 key，而 `zh-TW.json` 屬於語料、也是正式介面字串表。
- **影響：** spec 宣稱「不新增挑戰」與實際做法相反，等於多了一個待改的介面字串（屬於 L-O3 的範圍）。
- **信心：** 中
- **建議：** 預設改成「網站攻防題目」；或者把它明列為刻意保留、歸 L-O3，並修正 D44 和 LH3 的說法。

## K-6 [P2] hook 的觸發 glob 比修訂後 0007 的 watched trees 寬，會抓到 `platform/public/challenge/`

- **位置**
  - traceability.md:109（D65 `:(glob)platform/*/challenge/**`）、:2060（S36「any `platform/<x>/challenge/`」）、:2061（S37）、:27 與 :1595（修訂後的 0007 watched trees：「`platform/<L>/challenge/` for every listed `L`」）
  - spec.en.md:301-302（「watches every locale folder's challenge paths」）
- **證據：** `*` 會比對到 `public`。實際存在的 `platform/public/challenge/<slug>/runtime.wasm`（keygen 的輸出）因此會觸發 hook，路徑也會送進 validator；清單以外的資料夾同樣會觸發。
- **影響：** 這與 spec 自己宣告的 0007 修訂契約不一致：只改 `runtime.wasm` 的 commit 以前結果是 O1，之後會走 stash 和重新產生的流程。
- **信心：** 中
- **建議：** 排除 `public`，或從語系清單產生 pathspec；同時讓 S36 與 0007 的覆寫列一致。

## K-7 [P2] ADR-0008 consequence 2 的修訂註記只提 PL-E11，其他仍可能上線的死連結沒寫

- **位置**
  - docs/adr/0008-locale-folders-primary-chosen-at-build.md:44（「A dead link fails the build rather than shipping」）
  - traceability.md:56（D12「holds only with this rule」）、:1507（BC12）、:1877（B87 只註記 PL-E11）、:52（D8：nav/sidebar 連結加上翻譯語系的前綴）、:1828（B58 只檢查前綴）
  - spec.en.md:226-233、:343（TB2：raw HTML 和元件產生的連結不檢查）
- **證據：** D20 允許翻譯語系缺頁，但 D8 產生的 `/en/guide/…` nav/sidebar 連結不會對照 page list 檢查；raw HTML 和元件連結本來就不檢查（只寫在 README）。
- **影響：** ADR 修訂後的文字仍會讓人以為死連結一定擋得下來，實際上翻譯語系的 nav/sidebar 連結會帶著死連結上線（不過 not-found fallback 會導到主語系頁）。
- **信心：** 中
- **建議：** B87 的註記列出這些例外；或比照 PL-E12，把 nav/sidebar 連結也對照 page list 檢查。

## K-8 [P2] 新決策一律寫成「已核准」，與 workflow.md 的 standing authorization 規則不符

- **位置**
  - docs/agents/workflow.md:123-125（新的或變更的 D-number 即使在 standing authorization 下，也要先給使用者看摘要並確認，才能實作）
  - traceability.md:16-17、:2735-2736、:2755；spec.en.md:7-8
- **證據：** 約八十條「new」決策（D6、D8、D13、D105…）都標為「approved under the user's standing authorization」，實際上是 agent 自己的建議。
- **影響：** stage 5 可能把這些當成已確認，跳過逐條確認。
- **信心：** 中
- **建議：** 改成「recommended; pending user confirmation」，或在 stage 4 前留下使用者逐條確認的紀錄。

## K-9 [P2] GLOSSARY 修改跟著 T1 落地，但它描述的升級搬家行為要到 T4 才有

- **位置**
  - AGENTS.md（Project Charter 段：GLOSSARY「update it in the same change that adds or changes a term」）
  - traceability.md:1880（B90「Lands with the switch ticket (T1)」，含 U135）、:274（T4：升級搬家在 switch 之後落地）、:2473
- **證據：** 設定紀錄和搬家的「升級時搬家、記成英文」描述的是 T4 才有的行為；B90 卻要求這些修改在 T1 就上 `main`，而 B90 自己只保證「true after this epic」。
- **影響：** T1 到 T4 之間，`main` 上的詞彙表描述了不存在的行為，違反「同一個 change」規則。
- **信心：** 中
- **建議：** 設定紀錄和搬家詞條中與升級相關的句子跟著 T4 落地；其餘留在 T1。

## K-10 [P2] B90 建議的語系偏好措辭，在另開分頁時不成立

- **位置**
  - traceability.md:1880（建議改成「以為在站內跟著連結走也會改變它」）
  - spec.en.md:117-119（User story 12）、:248-250（D26）、:348（TB7：「Any page can link to a /<T>/ address and set T」）
- **證據：** 站內連結用新分頁開啟，或任何整頁載入，都是 cold load，打開已發布的翻譯頁就會寫入 T。
- **影響：** 詞彙表和 User story 12 的說法比 D26 寬。
- **信心：** 低到中
- **建議：** 改成「以為在同一個分頁裡跟著站內連結走也會改變它」。

## K-11 [P2] 短連結詞條與 README 對「沒有該語系頁面」的描述，與 D58 的第三個後備規則不一致

- **位置**
  - GLOSSARY.md:103（不帶語系代碼的短連結「是導向主語系那一頁的網址」）
  - traceability.md:2116（S71 建議新增「那個語系沒有這道題目的頁面時，它開主語系那一頁」）、:2114（S69）、:102（D58）、:1110-1115（S-§4.3：沒有主語系說明頁時，四種形式都導向唯一存在的那一頁）
- **影響：** 對沒有主語系說明頁、經 `--no-verify` 進來的題目，詞彙表和 README 的說法為假。影響範圍很窄。
- **信心：** 中
- **建議：** 措辭改成「開主語系那一頁；題目沒有主語系說明頁時，開它唯一存在的那一頁」。

## K-12 [P2] 用 `pending` 表示「被取代」「被拒絕」的 ticket，與 tracker 的狀態定義不合

- **位置**
  - docs/agents/issue-tracker.md:81（`pending` 是「deliberately paused, the user's decision」）、:87-95
  - traceability.md:99（D55：T-0060 被取代後仍留 `pending`）、:277（T7）；spec.en.md:563-567（AC-32）
- **影響：** 已被取代的 ticket 會出現在「Paused」查詢結果，像是還在等使用者決定；tracker 沒有 superseded 狀態。
- **信心：** 中低
- **建議：** 在 ticket 裡記錄使用者的決定和取代關係，或在 issue-tracker 補一個收尾作法；必要時列入 OPEN-QUESTIONS。

## K-13 [P2] 要求兩個 skill tree byte-identical，比 runtime 契約嚴

- **位置**
  - docs/agents/runtime.md:10-15；AGENTS.md（「Same-named skills may differ, tuned to each vendor's prompting guidance」）
  - traceability.md:132（D88）；spec.en.md:623（AC-43）
- **證據：** 目前 wxl-create、wxl-mutate、wxl-verify 兩邊的行數一致，開頭內容也相同，所以現在不會壞。但 runtime.md 允許兩邊依廠商調校而不同，AC-43 卻把逐 byte 相同變成驗收條件。
- **影響：** 以後任一邊調校，AC-43 就失敗。
- **信心：** 中低
- **建議：** 改成「同一個行為變更同時移植到兩個 tree」。

## K-14 [P2] 用 `range.json` 做 en 主語系 CI leg 的延後設計，會翻轉 upstream 判定

- **位置**
  - traceability.md:65（D21：「a CI leg for `en` (B-O2) would use `range.json`」）、:2678、:1874（B84 自己寫了 root `range.json` 讓 tree 被判為 range）
  - tests/__helpers__/upstreamDecision.ts:16、:52-56
  - .github/workflows/quality-gates.yml:23（`WXL_EXPECT_UPSTREAM`）
- **影響：** 這個延後的 CI 設計若在 upstream 建 root `range.json`，upstream-only 測試會被跳過，而 `WXL_EXPECT_UPSTREAM=true` 會讓 upstream-guard 失敗。本 epic 不受影響，但寫進 OPEN-QUESTIONS 的方案本身有衝突。
- **信心：** 中
- **建議：** B88 寫入 open question 時註明這個衝突（例如改用 fixture tree）。

## K-15 [P2] 繁中 scaffold 內文用了 GLOSSARY 標為 `_Avoid_` 的「題目說明」

- **位置**
  - traceability.md:127（D83：`TODO：在這裡寫題目說明。`）
  - GLOSSARY.md:121（委託書 `_Avoid_`）、:431（說明頁 `_Avoid_`：「題目說明」指版面左欄那一塊區域）
- **影響：** 新增的對外繁中字串用了避用詞；靶場 commit 進來的 scaffold 會把它帶進語料。
- **信心：** 中低
- **建議：** 改成「TODO：在這裡寫委託書內文。」或「TODO：在這裡寫說明頁內文。」，保留 `TODO` 字樣。

---

## 檢查過、沒有發現衝突的項目

- **ADR-0005：** 教學漏洞的路徑 `platform/challenge/<slug>/src/` 不變。
- **ADR-0008：** 「every page must exist in」（D20、BC19、B87 明示覆寫）、consequence 1 與 3。
- **ADR-0009：** `--from` 與 base remedy 都成立，因為 base 低於 3.0.0 時 0006 已經以 UP-E10 擋下。
- **ADR-0006、ADR-0007：** 只改註解，沒有改 gate 的字串。
- **Charter 與 hard rules 1–6：** fixture branch 沿用 0008 D12 先例，Area U 明示覆寫 preview deployment 規則。
- **README fork 路徑：** 與 B84、B86、U143 一致。
- **0003、0004、0005、0006、0007、0008 的修訂：** 都已逐項列入 Overridden contracts。
- **`sentence-map.test.ts`：** E1 和 Z1 仍成立。
- **`tests/unit/workflows/*`：** 沒有測試固定 checkout 的 `fetch-depth`，T9 不受影響。
- **`create-wxl/src/messages.mjs`：** UP-A* 用 ASCII 冒號、UP-E* 在繁中用全形冒號的慣例，與新增的 UP-E14、UP-A16 一致。
- **`challenge-sw.js`：** 不依賴語系。
- **`scripts/verify-project.py`：** 沒有固定 AGENTS.md 的版面文字。

**合計：P0 0 / P1 2 / P2 13**
