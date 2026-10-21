# Stage 3 第 1 輪，軸 3「契約衝突」（K）：epic 0007-gh-pages-range-fixes

受審版本：working tree 上的 `spec.en.md`（blob 89513637…）與 `traceability.md`（blob 33bb8564…），HEAD 7820bb8。Git 狀態依 parent 擷取的 `round1-scope.diff`：未追蹤的只有 spec 目錄的三個檔，追蹤中的變更只有 `GLOSSARY.md` 與 `OPEN-QUESTIONS.md`。範圍與 prompt 所述一致，不缺 context。

結論：0 個 P0、3 個 P1、17 個 P2。

---

## K-1 清單上「點一下就選取網址」會和整列是連結相衝 — P1
- **位置**
  - spec.en.md:67-69（"stays click-to-select"）、:132-136（AC-8，"on both lists … One click on it selects the whole displayed text"）
  - traceability.md:197（S03）
  - 程式：`.vitepress/theme/components/ShortLinkShare.vue:72-76`、`ChallengeList.vue:390-395,436-438`
- **違反的契約**：既有程式註解寫明的規則。ShortLinkShare.vue:72-76 寫著「In the list this sits inside a row that is itself an anchor, so the copy button stops the click; the text is left alone because selecting it is the fallback path」。
- **證據**
  - 直接讀到：清單的每一列都是 `<a :href="withBase(c.url)">`；只有複製按鈕有 `@click.stop.prevent`，網址文字只有 CSS `select-all`，click 沒有被攔下。
  - 推論（沒有實跑）：在清單上點網址文字，click 會冒泡到 `<a>`，VitePress router 隨即導頁，選取跟著消失。
- **影響**：S03 在兩個清單頁上照現狀做不到。要通過，實作就得在文字上停止 click 傳遞，也就是改掉「整列可點進題目」這個既有行為。spec 沒有寫出這項改變，反而說行為「stays」。
- **信心**：中高
- **建議**：二選一。(a) 明文覆寫該註解：清單上點網址文字不再導頁，並補一列 N/S 驗收；(b) 把 S03 限縮在 nav，清單改驗拖曳選取。

## K-2 X1–X5 列為 S2 案例，和 T70/AC-C1「拿真實 origin 測」的既有測試契約相衝 — P1
- **位置**
  - traceability.md:99-107（"Examples. Each is a test case at S2"，X4/X5 用的 O 是 `https://teacher.github.io/...`）、:33（S2 入口是掛載後的元件）
  - spec.en.md:65-70、:182-185
  - 測試：`tests/unit/components/ShortLinkShare.test.ts:10-14`、`ChallengeList.test.ts:6-8`、`MergedNav.test.ts:41-43`
- **違反的契約**：既有測試寫明的規則。三個測試檔都寫著「built from SITE_ORIGIN with plain string operations … tests the component's own output against the real origin」（T70/AC-C1），而且不呼叫 helper。
- **證據**：元件沒有 origin 輸入，它讀的是 `shortLink.ts` 的 `SITE_ORIGIN` 常數。X4/X5 的 origin 不等於 `SITE_ORIGIN`（`https://wxl.browserlab.online`）。
- **影響**：要在 S2 跑 X4/X5，只剩兩條路。(a) mock `shortLink` 模組，這違反「against the real origin」；(b) 改測純 helper，但那不是 S2 的入口。spec 沒說要覆寫 T70/AC-C1。
- **信心**：事實部分高，影響部分中
- **建議**：二選一。(a) 把 X4/X5 移到一個新的 helper seam，並寫明 helper 的測試不受 T70 限制；(b) 明文覆寫 T70/AC-C1，允許 mock origin。

## K-3 wxl-create 技巧把「exit code 1」當成名稱衝突，新增的失敗路徑會被誤判 — P1
- **位置**
  - spec.en.md:80-81、:139-142（AC-11）
  - traceability.md:208（C04，scaffold 留著）、:120-121（wxl-create 只加 E1）
  - 技巧：`.claude/skills/wxl-create/SKILL.md:101`、`.agents/skills/wxl-create/SKILL.md`（同一段）、兩棵的 `SKILL.zhTW.md:93`
- **違反的契約**：既有技巧寫明的分支規則：「On exit code 1 (collision), show the error and ask … re-ask the slug and re-run」。
- **證據**：C04 的 status 1 發生在 scaffold 已經寫入之後，keygen 失敗本來也是 1。`nextChallengeNumber`（`scripts/challenge-numbers.ts:178-186`）會把留下的 scaffold 算進已指派的號碼。
- **影響**（推論）：agent 會照技巧「換 slug 重跑」。結果是留下一個孤兒 scaffold 佔掉一個號碼，下一個題目拿到 N+1，而且因為樹仍不一致，重跑會再失敗。
- **信心**：中高
- **建議**：二選一。(a) spec 要求 wxl-create 第 2 步依失敗原因分支（stderr 或不同的 exit code）；(b) create:challenge 讓各種失敗原因的狀態可以分辨。

## K-4 N04/AC-7「row 自己的 path」和 link forms 在沒有結尾斜線時不一致 — P2
- **位置**：spec.en.md:131、traceability.md:188（N04）對比 traceability.md:90-91（O + `/challenge/` + s + `/`）
- **違反的契約**：既有 seam 的資料形狀。`ChallengeList.vue:98-102` 寫著「The URL arrives with a trailing slash from the build and without one from a hand-written fixture」；`ChallengeList.test.ts:51-53` 的 fixture 就是 `/challenge/sqli-demo`（沒有結尾斜線）。
- **影響**：拿既有 fixture 跑 N04 時，兩條規則會給出不同的網址，S2 的期望值沒有定論。
- **信心**：中高
- **建議**：N04 改成「等於 link forms 的結果」，或者規定 fixture 一律帶結尾斜線。

## K-5 「Browser panel」一詞和本 repo 既有的意思相衝 — P2
- **位置**：traceability.md:23（Q33）、:38（S7）、:255（V02）；spec.en.md:166（"served by `pnpm docs:preview` in the Browser panel"）
- **違反的契約**：既有詞彙。
  - `docs/agents/platform-notes.md:7`：「A challenge page's Browser panel is a `srcdoc` iframe」
  - `docs/agents/challenge-pipeline.md:30`、`docs/agents/workflow.md:152-153`、`GLOSSARY.md:165-167`（tool panel，Browser 分頁）、`.vitepress/config.mts:100`
- **證據**：在 repo 裡，Browser panel 指題目頁上的工具面板，不可能在裡面「serve」整個站。另外 hard rule 4（AGENTS.md:75）與 workflow.md:152 要求「A challenge page is checked with its Browser panel open」；V01/V02 會檢查題目頁的 nav，spec 沒說是否要開題目的 Browser 面板。
- **影響**：stage 8 的指示可能被讀成做不到的事，也可能因此漏掉題目頁的面板檢查。
- **信心**：中（stage 1 的原話也用了這個詞，使用者的本意可能是 agent 那一端的瀏覽器）
- **建議**：寫明實際用的瀏覽器工具（例如 `/agent-browser`），並另外說明題目頁要不要開 Browser 面板。

## K-6 Stage 8 的驗證 surface 偏離「在 ticket 的 preview deployment 上驗證」，spec 沒有明文覆寫 — P2
- **位置**：spec.en.md:164-173、traceability.md:254-258
- **違反的契約**：AGENTS.md:55（stage 8 gate：「behaviour verified on the ticket's preview deployment」）、workflow.md:151-152。先例是 OPEN-QUESTIONS.md:605-610（OQ-017）：0004 遇到同樣的情況時，「stated as an explicit override of both the workflow's preview-deployment rule and hard rule 4」。
- **證據**
  - 本 epic 主要的行為改變是 page mode，而它在 Cloudflare preview 上不會出現（那裡 `CF_PAGES=1`）。所以 page mode 改在本機 preview（V02）和臨時 GitHub Pages repo（V04）驗證。spec 沒標示這是覆寫，也沒引用 OQ-017。V02 正好是 OQ-017「Revisit when」描述的那種 harness。
  - V01：preview 用的是 production 的 `SITE_ORIGIN`（`shortLink.ts:26`），所以「a copied short link opens its challenge」實際打開的是 production，驗到的是 main 的 `_redirects`，不是這個 ticket 的。
- **影響**：驗證證據的 surface 和 gate 的字面要求對不上。
- **信心**：中
- **建議**：在 Testing Decisions 加一句明文覆寫並引用 OQ-017。V01 說清楚它驗到的是哪個 origin。

## K-7 Stage 8 的 `git commit` 沒說要不要走 `/tw-emoji-commit` — P2
- **位置**：spec.en.md:167（AC-20 第三點）、:171（AC-21）；traceability.md:256（V03）、:258（V05）
- **違反的契約**：AGENTS.md:79（hard rule 5：「Every `git commit` invocation … must use `/tw-emoji-commit`」）。
- **證據**：V03/V05 要 agent 在臨時 worktree 或 repo 裡實際執行 `git commit`。spec 既沒有規定用該技巧，也沒有明文豁免。
- **影響**：執行 stage 8 的人只能二擇一：違反 hard rule，或自己發明例外。
- **信心**：高
- **建議**：寫明這些 commit 也用 `/tw-emoji-commit`，或明文列為例外並說明理由。

## K-8 Sentence map 漏了 wxl-create 的 `SKILL.zhTW.md` 對照版 — P2
- **位置**：traceability.md:116-127、:18（Q6）
- **違反的契約**：既有的雙語對照慣例。`.claude/skills/wxl-create/SKILL.md:208`（「The registry table in `SKILL.md` and `SKILL.zhTW.md` contain the same rows」）；兩棵的 `SKILL.zhTW.md:93` 逐段對應 Step 2。
- **證據**：E1 只會加進 `SKILL.md`，兩棵的 `SKILL.zhTW.md` 什麼都不加。
- **影響**：中文對照版會落後英文版，也和 Q6「每一處說同一句話」不一致。
- **信心**：高
- **建議**：把兩個 `SKILL.zhTW.md` 加進 sentence map，配 Z1。

## K-9 對 wxl-fork-init 寫入 Z1/Z2，等於固化了一個和 language.md 的既有偏離 — P2
- **位置**：traceability.md:126-127、:116（"the language follows the surrounding text"）
- **違反的契約**：`docs/agents/language.md:10`：「`.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md` | **English**」。
- **證據**：兩棵的 wxl-fork-init `SKILL.md` 現在本來就是中文（例如 `.claude/skills/wxl-fork-init/SKILL.md:6-17`）。spec 把中文的標準句寫進去並用 S6 釘住，沒有說明這是例外。
- **影響**：既有偏離被測試鎖定，以後要改成英文會更難。
- **信心**：高（違規本身是既存的）
- **建議**：明文寫一句「本檔的語言例外沿用現狀」，或改用 E1/E2。

## K-10 「No new term」和 GLOSSARY 新增 `article` 詞條自相矛盾；page URL 有三種英文叫法 — P2
- **位置**：spec.en.md:102 對比 GLOSSARY.md:351-356（新增的 `article` 詞條）；spec.en.md:35（"full address"）、traceability.md:53（"page URL"）、:113（E2，"full address"）、OPEN-QUESTIONS 的 diff（OQ-016，"full URL"）
- **違反的契約**：AGENTS.md「Read it before naming anything … update it in the same change that adds or changes a term」；GLOSSARY.md:10-11（英文用語是程式碼與規格用的識別字）。
- **影響**：文件和介面上的英文用語會漂移。「完整網址」會出現在 README 這類對外語料，卻沒有正式詞條。
- **信心**：中
- **建議**：改成「本 epic 不新增 stage 1 以外的詞」，並統一英文用語（例如一律 page URL）。

## K-11 Vocabulary 的 short link 說是「as in GLOSSARY」，其實把定義縮窄了 — P2
- **位置**：traceability.md:52
- **違反的契約**：GLOSSARY.md:97-99。GLOSSARY 的定義涵蓋「指名永久編號」與「指名會跟著改名走的名字」兩種，也就是包含 `/c/<slug>` 這類短連結（`scripts/generate-redirects.ts:58-60`）。
- **影響**：輕微；以後有人引用時可能誤以為短連結只有編號形式。
- **信心**：高
- **建議**：改寫成「本 epic 中 control 給的 short link 是……」，不要說「as in GLOSSARY」。

## K-12 `SITE_ORIGIN` / `--origin` 在各處都被叫做「短連結網址」，在 GitHub Pages 靶場上已經不只是那樣 — P2
- **位置**：traceability.md:51、spec.en.md:73-75、:96-98（只改寫 README 的短連結註記與 fork-init 部署段）
- **違反的契約**
  - `shortLink.ts:17-25`（「The public origin the short links belong to」）
  - GLOSSARY.md:218（「短連結 origin 是印在講義上的靶場網址」）
  - README.md:81,197,214；README.en.md:200,209,217
  - wxl-fork-init `SKILL.md:3,43,47,97`
  - GLOSSARY.md:58-59：換掉一個詞的指涉物時，要在審查矩陣裡登記舊意思
- **影響**：在非 Cloudflare 的靶場上，這個 origin 現在決定每一條複製出去的網址。文件仍說它是「短連結網址」，老師會低估漏帶 `--origin`（例如自訂網域）的後果。
- **信心**：中
- **建議**：把 `shortLink.ts` 的註解、GLOSSARY origin 詞條的 `_Avoid_` 行，以及 README / skill 裡講 `--origin` 用途的句子列入改寫範圍。

## K-13 GLOSSARY 的「永久編號」與「單一標準拼法」敘述，在 page mode 下不再成立 — P2
- **位置**：spec.en.md:33-36、traceability.md:53
- **違反的契約**
  - GLOSSARY.md:82-84（number：「印在講義上、發給一個班的就是它」）
  - `shortLink.ts:10-11`（「the same string whether it is printed on a handout, shown on screen, or copied」）
  - `tests/unit/site/redirects-generated.test.ts:73-74`
- **證據**：非 Cloudflare 靶場發給學生的是指名 slug 的網址。stage 1 對 GLOSSARY 的修改只動了 short link 詞條的 `_Avoid_`（GLOSSARY.md:100）。
- **影響**：number 詞條的這一句對 GitHub Pages 靶場變成假的。
- **信心**：中
- **建議**：在 number 詞條補一條限定，或加 `_Avoid_`。

## K-14 刪除題目被當成正常路徑，和 GLOSSARY 的「下架」與「號碼不重發」相衝 — P2
- **位置**：spec.en.md:43（user story 2，"a deleted … challenge"）、traceability.md:218（H03）
- **違反的契約**
  - GLOSSARY.md:104-110（retired challenge 把「刪除題目」列為 `_Avoid_`，並要求「號碼保留不重新發出」）
  - `scripts/challenge-numbers.ts:7-10,170-176`（「never reused」）
- **證據**（推論）：`nextChallengeNumber` 只看 live 題目與 `.archive/`。用 `git rm -r` 刪掉號碼最大的那一題之後，下一次 create:challenge 會重發那個號碼。這個 epic 讓刪除順利通過 commit，卻沒有任何提醒。
- **影響**：之前印在講義上的短連結可能指到另一道題，正是編號機制要防的事。
- **信心**：中
- **建議**：在 spec 或 E1 註明刪除與下架的差別，或把 H03 標成「允許但會讓號碼可能被重發」。

## K-15 截斷網址和「任何寬度都要可讀」的註解相衝；nav 手機列的實測依據也會失效 — P2
- **位置**：spec.en.md:36、:66-68；traceability.md:23（Q11）
- **違反的契約**
  - `ChallengeList.vue:431-435`（「it has to stay readable and selectable at any width」）
  - `ChallengeList.test.ts:119-121`（「where the link has to be readable」）
  - `MergedNav.vue:249-257`（手機第二列的標題就是那一列的剩餘空間；360px 下 45px 的實測）
- **影響**：spec 是有意改成截斷加 hover 顯示全文，但沒有明文覆寫這些註解。另外手機列上的長網址會壓縮標題，那段實測依據不再成立。
- **信心**：中
- **建議**：寫明覆寫，並把 MergedNav 手機列的標題寬度列為要量的項目，或至少註明。

## K-16 Guard 的納入規則和 hook 的「staged snapshot」不是同一個定義 — P2
- **位置**：traceability.md:58（expected `_redirects`）、:26（D3）；spec.en.md:216-218（known cost 只列了 create→stage 的落差）
- **違反的契約**：既有 guard test 的納入規則（`redirects-generated.test.ts:156-167,178-179`）。它以 slug 為單位：只要任一語系的 `index.md` 有被追蹤就整個納入，而且讀的是 working tree。
- **證據**（推論）：根語系題目已追蹤、繁中說明頁未追蹤時，hook 會依 snapshot 排除 `/zh/c/NNN`，guard 卻會把它算進去。commit 成功後，本機 `pnpm test` 會報 mismatch；CI 會通過。
- **影響**：老師會遇到一個沒有列在 known cost 裡的本機失敗。
- **信心**：中
- **建議**：列入 Further Notes 的 known cost，或加一列矩陣。

## K-17 S2 的前提和 vitest 設定不符 — P2
- **位置**：spec.en.md:182-184（"the test environment has no `CF_PAGES` and would otherwise run in page mode"）、:55-57
- **違反的契約**：既有的 vitest 設定 `vitest.config.ts:29-52`。它不載入 `.vitepress/config.mts` 的 `vite.define`。
- **證據**：在 vitest 下 `__WXL_SHORT_LINKS__` 根本沒有定義，直接引用會丟 `ReferenceError`；不是「沒有 `CF_PAGES` 所以是 page mode」。
- **影響**：測試的預設模式要靠一個 spec 沒寫的機制。
- **信心**：中高
- **建議**：寫明常數在 vitest 下怎麼存在（在 vitest config 裡 define，或用 `typeof` 防護），以及預設值是什麼。

## K-18 S6 會在每個靶場跑，可能和 Charter「容易升級」相衝 — P2
- **位置**：traceability.md:37（S6）、:116-127；spec.en.md:196
- **違反的契約**：AGENTS.md:24（stay easy to start and to upgrade）、S8（不改既有規則）。既有機制 `tests/unit/scripts/upstream-guard.test.ts` 有「upstream decision」可以只在上游跑某些檢查。
- **證據**：靶場保留 README、`.claude`、`.agents`、`docs/agents`（`.gitattributes:3-6` 只排除 `.proj.specs/**` 與 `.proj.tickets`），CI 會跑 `pnpm test --run`（`.github/workflows/quality-gates.yml:69`）。老師改寫自己靶場的 README，CI 就會被 S6 擋下。先例：`toolchain-parity.test.ts:157-169` 已經在靶場上釘住 README 的文字。
- **影響**：自訂 README 或升級後合併 README 的靶場會 CI 失敗。
- **信心**：低到中
- **建議**：寫明 S6 是否只在上游跑。

## K-19 既有程式註解寫明的規則會過時 — P2
- **位置**：spec.en.md:82-92（hook）、:93（header）
- **違反的契約**
  - `scripts/pre-commit.sh:2-8`（「Filters for platform/challenge/** paths」「Restores the stash regardless of validation result」）
  - `scripts/generate-redirects.ts:45-48`（「rewritten as part of `pnpm build`」）、:72-80（`includeSlug` 的理由）
- **證據**：D3 已經明文改了 `_redirects` 在 stash 還原時的行為，但 spec 沒要求同步改這些註解。
- **影響**：輕微，註解會描述錯誤的行為。
- **信心**：中
- **建議**：在 Implementation Decisions 寫一句「hook 與 generator 的檔頭註解同步改寫」。

## K-20 OQ-016 的決議文字比 spec 的保證說得更滿 — P2
- **位置**：OPEN-QUESTIONS.md:589-596（diff，「so every range's button gives an address that opens」）
- **違反的契約**：spec 自己的 B1「Does not protect」（spec.en.md:110：在 Cloudflare 之外手動設 `CF_PAGES=1`，給出的短連結打不開）與 Q10（改名後 page URL 失效）。
- **影響**：OQ 紀錄比 spec 保證得多。
- **信心**：中
- **建議**：加上「除 B1 列出的情況外」，以及改名會讓網址失效的註記。

---

## 檢查過但沒有發現衝突的項目
- ADR-0001 到 0007：spec 寫明不涉及 ADR-0005，屬實。
- Charter 的「不擴充題庫」：新增題目只發生在臨時 repo。
- hard rule 1–3、6。
- `config-base.test.ts` 的 base 與 head 契約：AC-1 有保留。
- fork-init 的 `deriveGithubPagesOrigin`（`fork-init.ts:1081-1089`）：和 traceability.md:51 的說法一致。
- MergedNav「untranslated string」guard：page mode 下中英兩邊的字串不同，不會變紅。
- i18n 字串：`copy_failed`、`copy_label` 兩種模式下都仍然成立。
- 繁中清單的 loader 只收有繁中頁的題目（N02）。
- `glossary.test.ts` 的雙向 coinage 規則：「文章」不在語料內，`article` 的 `_新造詞_` 宣告會通過。
- 現有測試沒有任何一個透過 CLI 執行 create:challenge。

**依等級統計：P0 0、P1 3、P2 17。**
