# Stage 3 第 2 輪，軸 3「契約衝突」（K）：epic 0007-gh-pages-range-fixes

**受審版本**：working tree 上的 `spec.en.md`（blob 4485a999…）與 `traceability.md`（blob 5629e8c0…，revision 2），HEAD 7820bb8。
**Git 狀態**：完全依 parent 擷取的 `round2-scope.diff`。追蹤中的變更只有 `GLOSSARY.md` 與 `.proj.specs/OPEN-QUESTIONS.md`；未追蹤的只有 spec 目錄（含 `review/`）。範圍和 prompt 所述一致，沒有缺少的 context。
**審查方式**：照凍結 prompt 執行，只審軸 3。第 1 輪已處置的 K-1 到 K-20 沒有重報；只有處置沒有落實到 spec 的部分，下面會標明。

**結論**：P0 0 個、P1 1 個、P2 17 個。

---

## K-1 只下架或只刪除英文目錄、保留繁中說明頁，被當成正常的 O2 路徑；這和既有測試及 GLOSSARY 相衝 — P1

- **位置**
  - spec.en.md:59（US-2：「a deleted, renamed or retired challenge … so that every kind of challenge change passes CI」）
  - spec.en.md:186（AC-12：「Retiring, or deleting, only the English directory: the `/c/NNN` rule goes and the `/zh/c/NNN` rule stays」）
  - traceability.md:322（H17）、:326（H21）
- **違反的契約**
  - `tests/unit/site/redirects.test.ts:350-367`，測試名稱「backs every translated slug with a root-locale challenge」。檔頭 :24 把「a Traditional Chinese page whose root-locale counterpart is missing」列為 CAUGHT，:88-92 說明這個方向是刻意斷言的。
  - `GLOSSARY.md:104-106`（retired challenge）：「先前印出、指名它的短連結則會就此失效」。
  - `GLOSSARY.md:73`：繁中題目樹底下只有說明頁，應用程式與 flag 只在根語系樹。
- **證據**
  - 直接讀到：
    - 產生器（`scripts/generate-redirects.ts:93-121`、`challenge-numbers.ts:104-168`）不檢查繁中頁有沒有對應的根語系頁，所以 hook 會照 H17/H21 走 O2，並留下 `/zh/c/NNN`。
    - `redirects.test.ts` 讀的是 `platform/zh-TW/challenge/` 與 `platform/challenge/` 的目錄清單。只要繁中有、根語系沒有，就會失敗。
    - CI 會跑 `pnpm test --run`（`quality-gates.yml:69`）。
    - `RETIRED_TREE` 只有 `.archive/challenge/`（`challenge-numbers.ts:34`），沒有繁中的下架位置。
  - 推論（沒有實跑）：H17/H21 commit 之後，CI 的 `redirects.test.ts` 會轉紅。留下的 `/zh/c/NNN` 會導到一個沒有應用程式的題目頁。
- **影響**
  - spec 宣稱這兩種變更「passes CI」，實際上會被既有測試擋下。
  - hook 放行了一個 CI 必定拒絕的狀態，正好重演本 epic 要消除的「push 之後 CI 才失敗」。
  - 下架題目的繁中短連結仍然有效，和 GLOSSARY 的定義相反。
- **信心**：高（測試內容是直接讀到的）；CI 結果是推論，信心也高。
- **建議**：三選一。
  - (a) H17/H21 改成 hook 拒絕（類似 O4），訊息說明要一併處理繁中說明頁。
  - (b) 明文定義「下架/刪除翻譯過的題目時，繁中目錄要一起移除」，並把 H17/H21 的期望改成兩條規則都消失。
  - (c) 明文覆寫 `redirects.test.ts` 的子集合斷言與 GLOSSARY 的定義。

## K-2 wxl-create Step 2 的 Verification 要求 exit 0，和 P7 的「狀態 2＝已建立」相衝；選單回覆 `1`/`2` 也和結束狀態撞號 — P2

- **位置**
  - spec.en.md:118-120（wxl-create）
  - traceability.md:35（D8）、:186（P7）
  - 技巧：`.claude/skills/wxl-create/SKILL.md:101-102`、`.agents/skills/wxl-create/SKILL.md`（同一段）、兩棵的 `SKILL.zhTW.md:93`
- **違反的契約**：既有技巧的步驟規則。
  - SKILL.md:102：「**Verification**: Exit code 0; the challenge directory exists」。
  - :101 用 `1`、`2` 指使用者在純文字選單裡的回覆：「on `1`, re-ask the slug and re-run; on `2`, stop」。
- **證據**（直接讀到）
  - P7 只要求狀態 2「apart from the collision's 1, and never re-ask the name」。它沒有說狀態 2 之後要接著做 Step 3–7，還是停下來。它也沒有要求改 Verification。
  - 同一句話裡，`2` 已經是「取消」的回覆值。
- **影響**
  - 照現有 Verification，狀態 2 算 Step 2 失敗，工作流程會停住。照 P7 字面，又應該繼續。兩者不一致。
  - 「on `2`, stop」也可能被 agent 讀成「結束狀態 2 就停止」。
- **信心**：中高
- **建議**
  - P7 寫明狀態 2 之後的流程（繼續到 Step 3 或停止），以及 Verification 要不要接受 2。
  - 選單回覆改用別的記號，或明文區分「exit status」與「reply」。

## K-3 「Status 1 still means a collision」和程式碼與 AC-11 不符 — P2

- **位置**：spec.en.md:119-120；traceability.md:426（checks 表：「status 1 keeps its meaning」）
- **違反的契約**
  - `scripts/create-challenge.ts:273-278`：參數錯誤是 1。
  - `scripts/create-challenge.ts:320-325`：scaffold 已寫入之後 keygen 失敗，也是 1。
  - spec 自己的 AC-11：keygen 失敗是 1。
  - 同系列腳本的既有慣例：`.claude/skills/wxl-mutate/SKILL.md:41-45`（`challenge:retype` 的 1＝輸入錯、2＝要人工處理、3＝IO/keygen 錯）。
- **證據**（直接讀到）：狀態 1 有三種意思，其中 keygen 失敗時 scaffold 留在原地。wxl-create 卻把 1 讀成「衝突」，要求換 slug 重跑。
- **影響**（推論）
  - keygen 失敗後，agent 照技巧換名重跑，留下一個孤兒 scaffold，佔掉一個號碼（`nextChallengeNumber` 會把它算進去）。
  - D8 之後，`create:challenge` 會對整個 working tree 重產 `_redirects`，所以孤兒題目還會被寫進 working tree 的 `_redirects`。
  - 這是第 1 輪 K-3 的另一半，沒有被處置。
- **信心**：高
- **建議**
  - 刪掉「Status 1 still means a collision」這個全稱句，改寫成「狀態 1 包含衝突、參數錯與 keygen 失敗，wxl-create 依 stderr 區分」。
  - 或者參照 `challenge:retype`，把 keygen 失敗獨立成一個狀態（明文寫為覆寫）。

## K-4 spec 說 GLOSSARY 只有四項修改，處置表卻把 number 與 origin 詞條延到 ticket，而且 spec 裡沒有任何對應的列 — P2

- **位置**：spec.en.md:134-136（「No term beyond the four edits from stage 1」）；`review/disposition.md` 的 K-13 列（「延到 ticket：GLOSSARY 的 number 詞條與 origin 相關句子在改寫文件的 ticket 一併處理」）
- **違反的契約**
  - `GLOSSARY.md:58-59`：一個換掉詞義指涉物的 change，要在自己的審查矩陣裡寫出舊意思已經進了 `_Avoid_`。
  - `GLOSSARY.md:84`（number：「印在講義上、發給一個班的就是它」）。
  - `GLOSSARY.md:218`（「短連結 origin 是印在講義上的靶場網址」）。
- **證據**
  - 直接讀到：P1–P7（traceability.md:178-186）、T 列、AC-24 都沒有 GLOSSARY 的列。
  - 另外，GLOSSARY 新增的 _Avoid_（:100）把複製到的東西叫做「題目頁本身的完整網址」，Z2 叫「題目頁的網址」，中文有兩種講法。
- **影響**：延到 ticket 的承諾在 spec 裡沒有出口，stage 6 不會檢查，很可能就此漏掉。
- **信心**：中高
- **建議**
  - 在 passages 表加一列 GLOSSARY.md:84 與 :218，並把 spec.en.md:134 改成和處置一致。
  - 或者在處置表改成「不處理」並寫出理由。
  - 中文統一用 Z2 的講法。

## K-5 P3 漏掉幾處把 `SITE_ORIGIN` 稱為「短連結網址」的對外字串 — P2

- **位置**：traceability.md:182（P3 只涵蓋 README 兩個語言版本與 wxl-fork-init）、:69（vocabulary：`SITE_ORIGIN` 是 every copied link 的 origin）
- **違反的契約**：既有介面字串與程式註解寫明的語意。
  - `create-wxl/src/messages.mjs:229`（`'S6-ORIGIN'`：「short link origin」）、:304（「短連結網址」）。create-wxl 問完設定後，會把這一行印給老師看。
  - `scripts/fork-init.ts:1486-1487`：對外警告訊息「a custom short-link origin is replaced only when --origin …」。
  - `scripts/fork-init.ts:21,31`：用法註解。
  - `GLOSSARY.md:218`。
- **影響**：在 GitHub Pages 靶場上，這個值決定每一條複製出去的網址，但建立靶場時看到的摘要仍說它只是短連結網址。老師會低估少帶 `--origin` 的後果，這正是 D10 想透過文件提醒的事。
- **信心**：高（字串是直接讀到的）
- **建議**：把這些字串列入 P3。create-wxl 屬於另一個套件、有自己的 release；如果要排除，在 Out of Scope 寫明。

## K-6 還有其他既有註解寫明的規則會變成假的，但不在 P4–P6 裡 — P2

- **位置**：traceability.md:183-185（P4–P6）
- **違反的契約**：既有程式與測試的註解。
  - `ChallengeList.vue:207-210`：「the badge and the short link beside it are the same number」。page mode 下旁邊是 page URL。
  - `MergedNav.vue:18-22`：「The short link is built from it」。
  - `MergedNav.vue:136`：「Short link: the address a reader is given」。
  - `tests/unit/site/redirects-generated.test.ts:73-74` 與 `tests/unit/site/redirects.test.ts:296-297`：「what is printed, what is displayed and what is copied are the same string」。
  - `tests/unit/components/ChallengeList.test.ts:119-121`：「where the link has to be readable」。
- **影響**：小。這些註解會描述錯誤的規則，下一個讀者會依它推論。
- **信心**：中
- **建議**：併入 P4/P5，或在 Implementation Decisions 寫一句「描述 short link 為唯一複製形式的註解一併改寫」。

## K-7 README 與技巧文件記載的兩條 fork 路徑會讓 `SITE_ORIGIN` 停在上游，但 D10、B4、E2、Z2 都沒有提到 — P2

- **位置**
  - traceability.md:37（D10）、:146-147（E2/Z2）
  - spec.en.md:145（B4：「gives links that do not open … a fork that never ran fork:init, … a renamed repository or a custom domain without `--origin`」）
- **違反的契約**
  - README 記載的 fork 路徑：
    - `README.md:219`：不帶 `--host`、只用 `--base /<repo>/` 的路徑。
    - `README.md:206`：rebrand 模式不能和 `--origin` 一起用，部署設定要另外手動處理。
  - `.claude/skills/wxl-fork-init/SKILL.md:47`：B 模式下 `SITE_ORIGIN` 要手改。
  - 同一個技巧的 :97：只有完全沒帶 `--origin` 也沒帶 `--host` 時才需要手改。
- **證據**
  - 直接讀到：這兩條路徑都不會設定 `SITE_ORIGIN`（`fork-init.ts:1453` 起，A8 只有在帶了或推導出 origin 時才寫入）。
  - 推論：
    - 這種情況下的 page URL 是 `https://wxl.browserlab.online/challenge/<slug>/`。新 fork 的示範題 slug 和上游相同，所以連結**打得開**，但打開的是上游的網站，學習者的紀錄也存在上游的 origin 上。B4 說「do not open」並不準確。
    - E2/Z2 給的解法是「rerun `pnpm fork:init` with the new address」，但 rebrand 模式拒絕 `--origin`，這個解法可能用不上。
- **影響**：照 README 走 `--base` 或 rebrand 路徑的老師拿到的連結，會靜默地導到上游。文件沒有預告這件事，D10 的已知代價清單也不完整。
- **信心**：中（「導到上游示範題」是推論）
- **建議**
  - D10/B4 補上這兩條路徑，並把「do not open」改成「打不開，或開到 `SITE_ORIGIN` 所指的另一個網站」。
  - E2/Z2 的解法寫成不依賴模式的說法（例如「讓 `SITE_ORIGIN` 指向靶場的網址」）。

## K-8 V01/V04 在題目頁上驗證，但沒有按 hard rule 4 開 Browser panel — P2

- **位置**：traceability.md:369（V01）、:372（V04）；spec.en.md:206、:211（AC-20 第一點、AC-21 第一點）
- **違反的契約**
  - AGENTS.md hard rule 4：「for challenge pages open the Browser panel」。
  - `docs/agents/workflow.md:152-153`：「A challenge page is checked with its Browser panel open」。
- **證據**（直接讀到）
  - D9（traceability.md:36、spec.en.md:263-267）只覆寫 preview-deployment 規則，沒有覆寫 hard rule 4。
  - V02 有寫開 Browser panel。V01 的 nav 檢查與 V04「opens its challenge」的題目頁檢查都沒寫。
- **影響**：stage 8 的證據和 hard rule 的字面要求對不上。執行的人只能自己決定要不要開面板。
- **信心**：中高
- **建議**：V01/V04 加上「題目頁以 Browser panel 開啟檢查」，或在 D9 一併明文說明 hard rule 4 對這兩列的適用方式。

## K-9 D9 說沿用 OQ-017 的先例，卻沒有把覆寫記到 OQ-017 — P2

- **位置**：spec.en.md:263-267；traceability.md:36
- **違反的契約**
  - 先例的做法：OQ-017（`OPEN-QUESTIONS.md:603-626`）記錄了 0004 的覆寫。
  - `.proj.specs/0006-range-upgrade/spec.en.md:126`：「recorded with 0005's under OQ-017」。
- **證據**（直接讀到）
  - 本 epic 的 OPEN-QUESTIONS diff 只動了 OQ-016、OQ-020、OQ-023，OQ-017 沒有任何新增。
  - V02（本機 build，用真實瀏覽器操作）很接近 OQ-017「Revisit when」描述的那種 harness。
- **影響**：覆寫的證據鏈斷在 spec 裡。OQ-017 看不到第三次覆寫，也看不到這次可能已經提供的答案。
- **信心**：中
- **建議**：在 OQ-017 加一段記錄 0007 的覆寫，並說明 V02 和它「Revisit when」的關係。

## K-10 commit forms 規則對 git 執行 hook 時用哪個 index 的描述不準確 — P2

- **位置**：traceability.md:214-217；spec.en.md:116-117
- **違反的契約**：git 對 pre-commit hook 的既有行為（外部 seam；以下依我對 git `builtin/commit.c` 的理解，沒有在本 repo 實測）。
  - `-a`、`-p`、`-i <paths>` 執行 hook 時，`GIT_INDEX_FILE` 是 `.git/index.lock`。
  - `git commit <pathspec>`（`--only`）執行 hook 時，`GIT_INDEX_FILE` 是暫時的 `next-index-*.lock`。
  - 沒有帶這些參數的一般 commit 用的才是 `.git/index`。
- **證據**：規則說 `-a`、`-p`、`--amend` 都「runs the hook on the repository's own index」，只有 pathspec 是「any other index file」。照這段字面，用「`GIT_INDEX_FILE` 是否等於 `.git/index`」來實作，會把 H31（`-a`）也拒絕掉。`-i <paths>` 沒有被歸類。
- **影響**：實作者照字面做會打破 H31/AC-22，否則就得自己發明判斷規則。
- **信心**：中低（git 內部行為是根據記憶，沒有實測）
- **建議**：用可觀察的條件改寫，例如「`GIT_INDEX_FILE` 未設定，或指向 `$(git rev-parse --git-path index)` 或它的 `.lock`」才算自己的 index；並把 `-i` 歸類。先在 S5 實測確認。

## K-11 不衝突的 `git merge` 不會執行 pre-commit，H35 只涵蓋有衝突的合併 — P2

- **位置**：traceability.md:340（H35）、:214（「outcomes above apply」）；spec.en.md:66（US-9，「arrive with an upgrade」）
- **違反的契約**
  - git 的 hook 模型：自動產生的 merge commit 跑的是 `pre-merge-commit`，不是 `pre-commit`。
  - `package.json:43-45`：simple-git-hooks 只裝了 `pre-commit`。
  - Charter「a range can take in later upstream releases」。
- **證據**：直接讀到 package.json。git 的行為是推論，沒有實測。
- **影響**（推論）
  - 把上游 release 或另一個分支的題目乾淨地合併進來時，hook 不會重產 `_redirects`。
  - `formatRules` 的欄寬取決於所有規則（`generate-redirects.ts:124-128`），兩邊各自新增規則的三方合併結果，不一定和產生器的輸出逐 byte 相同。
  - 這種情況下 guard 在 CI 失敗，但 spec 沒有列為已知代價。
- **信心**：中低
- **建議**：在 Further Notes 或 B2 的「Does not protect」列出「不衝突的 merge 不經過 hook，交給 CI guard，修法同 E1」。或考慮同時安裝 `pre-merge-commit`（需要另行裁決）。

## K-12 `/tw-emoji-commit` 依 `git diff --cached` 寫訊息，hook 卻在訊息寫好之後改了 index — P2

- **位置**：spec.en.md:208、:212（AC-20、AC-21 的 commit 要經過 `/tw-emoji-commit`）；traceability.md:36（D9）
- **違反的契約**
  - `.claude/skills/tw-emoji-commit/SKILL.md:12,32`：「Analyze the current staged changes (`git diff --cached`)」。
  - `.agents/skills/tw-emoji-commit/SKILL.md:57-59`：commit 的是「the approved staged changes」。
- **證據**：直接讀到技巧內容。O2 會在 hook 裡把 `_redirects` 加進 index（推論：這發生在訊息產生之後）。
- **影響**：小。每個帶題目變更的 commit，都會多出一個訊息沒有描述、也沒有經過核准的檔案。這也包括上游自己日後的 commit。
- **信心**：中
- **建議**：在 Further Notes 註明這個情況。或要求使用技巧之前先跑 `pnpm redirects:generate` 並 stage，讓 hook 走「不變」的分支。

## K-13 Solution 說「每份提到這個檔的文件都說同一句」，和 Out of Scope 對 CONTRIBUTE.md 的排除互相矛盾 — P2

- **位置**：spec.en.md:41-42（「Every document and skill that mentions the file says the same sentence about it」）對比 :280（CONTRIBUTE.md 列入 Out of Scope）
- **違反的契約**：既有文件 `CONTRIBUTE.md:90`。它提到 `platform/public/_redirects`，而且用「If you changed」的語氣，暗示可以手改。
- **影響**：小。這句全稱句是假的，而且 CONTRIBUTE.md 的語氣和 E1「do not edit it by hand」有張力。
- **信心**：高
- **建議**：把全稱句改成「sentence map 列出的檔案」。

## K-14 「Both wxl-fork-init files keep their existing Traditional Chinese text」和 P2/P3 的改寫要求相衝 — P2

- **位置**：spec.en.md:130 對比 traceability.md:181-182（P2、P3 要改寫兩個 wxl-fork-init 檔的段落）
- **違反的契約**：spec 內部的一致性。:164-166 的本意是「保留語言」。
- **影響**：照字面讀，會以為兩個檔的既有文字都不能動。
- **信心**：中
- **建議**：改成「keep Traditional Chinese as their language」。

## K-15 spec 開頭宣稱「stage 3 gate is met」，但第 2 輪還沒做 — P2

- **位置**：spec.en.md:3-5
- **違反的契約**
  - `docs/agents/review.md:50-56`：第 2 輪仍可能出現 P0；新增的規範表面要先自審。
  - ADR-0003：凍結的 prompt、兩輪上限。
- **證據**：revision 2 新增了 D4–D11、S8、O5、O6、commit forms 等表面，正是第 2 輪要審的內容。
- **影響**：小。如果第 2 輪出現 P0，這句話就是錯的，而且可能讓人提早進入 `/to-tickets`。
- **信心**：中
- **建議**：改成「Round 1 found no P0; the gate is decided after round 2」。

## K-16 OQ-016 的決議段落把「改名」歸到 B1、B4 底下，但兩者都沒有列這一項 — P2

- **位置**：OPEN-QUESTIONS.md diff，OQ-016 的「Decided」段落（「The page URL still does not open in the cases spec 0007 lists under B1 and B4: … a renamed challenge …」）
- **違反的契約**：spec.en.md:142、:145（B1、B4 的「Does not protect」欄位都沒有改名）。改名寫在 Q10 與 Further Notes（spec.en.md:288）。
- **影響**：輕微。引用位置不對，追查的人會找不到。
- **信心**：高
- **建議**：改成「under B4, Q10 and Further Notes」。

## K-17 checks 表說 index slugs 是「同一條規則套到 index 上」，但 guard 只依 `index.md` 判定 — P2

- **位置**：traceability.md:79（index slugs：「at least one path in the index」）、:423（checks 表）
- **違反的契約**：`tests/unit/site/redirects-generated.test.ts:156-167`。guard 只有在 `index.md` 被追蹤時才納入那個 slug（正規式 `…/([^/]+)/index\.md$`），而且讀的是 working tree。
- **證據**（推論）
  - 反過來的情況是：繁中 `index.md` 已追蹤，根語系的 `index.md` 還沒追蹤（只有 `src/` 被 stage）。
  - guard 會用 working tree 的根語系 `index.md` 產生 `/c/NNN`。hook 因為根語系 `index.md` 被 stash 收走，不會產生。
  - Further Notes（spec.en.md:292-299）只列了相反方向的落差。
- **影響**：小。會多出一種沒有記錄的本機 guard 不一致。
- **信心**：低到中
- **建議**：checks 表改寫成「效果相同，但定義不同」，並在 Further Notes 補上這個反向情況。

## K-18 觸發條件加入型別變更（T），validator「輸入不變」卻沿用 ACMRD — P2

- **位置**：traceability.md:190（Trigger 包含「changed in type」）、:201（「The validator's input does not change」）；spec.en.md:107
- **違反的契約**：既有 hook 的 `--diff-filter=ACMRD`（`scripts/pre-commit.sh:12-13`），檔頭 :4 也這樣寫。
- **證據**：直接讀到。H24 只驗 O2/O4，不驗 validator 有沒有收到型別變更的路徑。
- **影響**：小。`platform/challenge/` 底下的型別變更（例如檔案改成 symlink）會觸發重產，但不一定經過驗證。「輸入不變」的意思到底是「篩選條件不變」還是「範圍不變」，不明確。
- **信心**：中
- **建議**：寫明 validator 的篩選條件（維持 ACMRD 或加上 T），讓 P6 的檔頭改寫跟著一致。

---

## 檢查過、沒有發現衝突的項目

- **第 1 輪 K 項的落實情況**：K-1（D4）、K-2（S8）、K-5（V02）、K-6、K-7（D9）、K-8（sentence map 加入 zhTW）、K-9、K-10 的英文部分、K-11、K-12 的 README/skill 部分、K-15（P5）、K-16、K-17（L19）、K-18（D11）、K-19（P6）、K-20 都已改進 revision 2。K-13 與 K-3 的剩餘部分見本輪 K-4、K-3。K-14 已列入 Out of Scope。
- **ADR-0001 到 0007**：spec 寫明不涉及 ADR-0005，屬實。其他 ADR 沒有被觸及。
- **Charter**：「不擴充題庫」沒有問題（只在暫時的 repo 建題）。學習者資料仍留在自己的機器上。
- **hard rule 1、2、3、5、6**：rule 5 已由 D9 涵蓋 stage 8 的 commit，剩下的問題見 K-12。
- **`config-base.test.ts`**：base 與 head 的契約由 AC-1/M04 保留。config 現有的 define 慣例（字串值）和 `"true"`/`"false"` 相容。
- **fork:init 錨點**：A6、A8、A9 的候選正規式（`fork-init.ts:715-721,989,1000`）由 F01/AC-25 涵蓋。
- **T70/AC-C1 的測試註解**（三個元件測試檔）和 S2、S8 的切分一致。
- **MergedNav 的「untranslated string」guard**：兩種模式下中英字串都不同，不會轉紅。
- **`tests/site-smoke/`**：沒有任何短連結斷言，CI 改成 page mode 不會讓既有 smoke 失敗。
- **`pnpm` 會轉傳結束狀態**：本 repo 已有先例（wxl-mutate 依 0/1/2/3 分支）。
- **create-wxl 的 `CREATE_WXL_COMMIT`**：`create-wxl/src/run.mjs:124-129` 存在，V04 可行。
- **OQ-023 的程式碼證據**：`.vitepress/theme/i18n/index.ts:25,205-213`、`.vitepress/theme/index.ts:116` 都屬實。
- **用語**：「Traditional Chinese brief」和 `docs/agents/challenge-pipeline.md:13` 的既有用法一致。
- **GLOSSARY 新詞條**：`article`、teacher、upstream 的 `_Avoid_` 和 spec 的用語沒有衝突；spec 沒有使用被避免的詞。
- **`language.md`**：spec 只有英文版，符合「審查通過後才翻譯」。
- **`.gitignore`**：:26 確實忽略 `logs/`（H20 的前提成立）。

**依等級統計：P0 0、P1 1、P2 17。**
