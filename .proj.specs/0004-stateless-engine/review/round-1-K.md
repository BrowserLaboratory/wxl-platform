# Stage 3 round 1：軸 3「契約衝突」（K）— epic 0004

審查版本：spec.en.md blob `0972dc4de1a875a86be737c62b9abb89e81eea7d`、traceability.md blob `ce8bb855b29b3bbcf5b94047f33aea837c565ede`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md` blob `b460b2d112e2e394c4f628fc3fdfc29864dc8fc2`。reviewer：`harness-reviewer`（只讀檔案，沒有 shell；blob hash 由 parent 以 `git hash-object` 驗證）。以下為 reviewer 報告原文，只把本機絕對路徑改成 repo 相對路徑。

---

**範圍說明**：我只有讀檔工具，沒有 Bash，所以沒有自己重算 blob hash，直接採用 parent 提供的 `spec.en.md` 0972dc4、`traceability.md` ce8bb85 與 HEAD c0f7edf，讀的是工作樹檔案。`GLOSSARY.md` 的 pending edit 我只讀到工作樹的最終內容，看不到 diff。`.git/logs/HEAD:1` 顯示 `72327e2` 是 initial commit，後面 K-15 會用到。

**審查軸**：3. Contract conflict

---

**K-1**
- 位置：traceability.md:117（Overridden contracts 的 skills 列）、:244-245（T78 strings）；spec.en.md:197-198、:283（AC-D1）。程式碼：`.claude/skills/wxl-fork-init/SKILL.md:39`、`:42`、`:53`、`:80`、`:84`（`.agents` 版逐字相同）。
- 衝突的契約：兩份 `wxl-fork-init` skill 現行寫明的流程。override 表宣稱這列由 T78 給出新契約。
- 證據（直接讀到）：
  - T78 只禁止三個字串：`掃描式`、`Node.js ≥ 18`、`CLI 不會改短連結的網址`。
  - skill:39 和 :42 的 base 決策表要 Cloudflare 填 `--base none`、專案站填 `--base '/<repo>/'`，T78 沒有禁止。
  - skill:53 說既有且內容不同的 deploy.yml「不覆蓋」，也沒有禁止。
  - skill:80 和 :84 的驗收是 `git grep -n "BrowserLaboratory/wxl-platform"`，並寫「預期零殘留」。但新 keep list（traceability:91-94）刻意把 slug 留在 `CHANGELOG.md`、`scripts/fork-init.ts`、skill 本身與 `.proj.specs/`，所以這條驗收在 anchor mode 下一定失敗。
- 影響：AC-D1 可以通過，skill 卻仍然叫老師或 agent 走舊流程：Cloudflare 不帶 `--host` 會被裝上 workflow、A8 不會被設定；專案站寫死 base 會讓根目錄的測試全部 404。另外，驗收步驟本身一定會失敗。
- 信心：高
- 請求等級：P1
- 建議：T78 的 forbidden 加上舊 base 決策表的字串與「預期零殘留」；required 加上 keep list 說明，或改成只對 rewrite list 的驗收指令。

**K-2**
- 位置：traceability.md:110-111（parity 相關的 override 列）、T28（:174）。程式碼：`tests/unit/workflows/fork-template-parity.test.ts:14-23`、`scripts/templates/deploy.yml.template:28-34`、`tests/unit/workflows/fixtures/upstream-deploy.yml:9-13`。
- 衝突的契約：
  - parity test header 寫「These assertions derive the expected values FROM the baseline rather than restating them」，並說 template 要對著 frozen baseline 比對。
  - fixture header 寫「forks still get a GitHub Pages workflow from … template」。
- 證據（直接讀到）：
  - T28 的新斷言（configure-pages id `pages` 排在 build 之前、`SITE_BASE` 設為 `${{ steps.pages.outputs.base_path }}/`）是直接寫死的值，而且與 fixture 不一致。fixture 的 configure-pages 在 build 之後（fixture:101 對 :94），`SITE_BASE` 是 `/wxl-platform/`（:98）。
  - override 表只列了 parity test header 第 6 行與 SITE_BASE 那個測試的註解。header :14-23、template :28-34 與 fixture :9-13 都沒有列進去。
  - 同樣是「forks still get」的 toolchain-parity 註解已經列入 override，fixture header 卻漏了。
- 影響：實作後，這些註解所寫的規則與新斷言互相矛盾，而 spec 沒有明確 override 它們。
- 信心：中高
- 請求等級：P2
- 建議：把這三處加進 override 表，註明 step 順序與 `SITE_BASE` 是刻意偏離 baseline 的例外。

**K-3**
- 位置：traceability.md:111（「parity test header comment (line 6); toolchain-parity test comment (lines 16–18)」）。
- 衝突的契約：`docs/agents/workflow.md:54-56` 規定 spec 指向既有程式碼時，要寫函式、元件或測試名稱，不寫行號。`.proj.specs/0001-truthful-clear-reports/retrospective.md:34` 也是同一條教訓。
- 證據：直接讀到。
- 影響：實作期間行號會移動，override 的範圍就跟著失準。0001 的 T-0008 就出過這個錯。
- 信心：高
- 請求等級：P2
- 建議：改成用註解的內容或所在的 describe／it 名稱來指稱。

**K-4**
- 位置：spec.en.md:27-28（stateless）、:310-312（Out of Scope：「the upgrade module, which can read every setting from the anchors」）；traceability.md:225（T79）。
- 衝突的契約：
  - `GLOSSARY.md:357-359` 開發模組的定義是「在老師自己電腦上執行…協助設定、升級靶場」，並把「建立靶場的那道指令」排除在外。
  - `GLOSSARY.md:363-364` 設定紀錄：「開發模組照它套用設定，升級時也照它重做一次」。
- 證據：
  - 直接讀到：T79 只補「設定紀錄出現之前建立的靶場沒有設定紀錄」，沒有處理「開發模組照設定紀錄套用、升級照它重做」這句。
  - 直接讀到：spec 說升級可以從 anchor 讀回每一項設定，與詞彙表講的升級方式相反。
  - 推論：`fork:init` 符合開發模組的定義，卻是 stateless。「upgrade module」也不是詞彙表用語。
  - 推論：host 無法從 anchor 讀回。兩種 host 下 A9 都是上游形式；workflow 在沒帶 `--host` 的執行中又會被重新裝上，所以 workflow 在不在也不能判斷 host。
- 影響：詞彙表與 spec 對「升級從哪裡取設定」給出兩個答案，0005／0006 會繼承這個矛盾。
- 信心：中
- 請求等級：P2
- 建議：spec 寫明 `fork:init` 是不是開發模組；把「can read every setting」刪掉或縮小範圍；T79 一併修正設定紀錄那句。

**K-5**
- 位置：spec.en.md:37-38 宣稱「this spec never says "slug" alone for it」。實際上 spec.en.md:215、:315，以及 traceability.md:51-55（`<slug>`）、:92、:96、:105-106、:112、:147、:208-210 都用了單獨的「slug」。
- 衝突的契約：`GLOSSARY.md:75-79` 的 slug（題目 slug）；T79 也要為「repository 的 owner/name」新增 `_Avoid_`。
- 證據：直接以 Grep 讀到。
- 影響：spec 違反自己的用語規則，也違反 T79 正要寫進詞彙表的那條 `_Avoid_`。
- 信心：高
- 請求等級：P2
- 建議：一律改成 repository slug，`<slug>` 改成 `<owner>/<name>`。

**K-6**
- 位置：spec.en.md:45-46（定義了 short-link origin），但後文多處單用「origin」：:236-237（AC-O1、AC-O2「derives the origin」）、:278（AC-X1）；traceability.md:128-134（「Origin grammar」）、T36、T37；還有 CLI 旗標 `--origin`。
- 衝突的契約：`GLOSSARY.md:210-216` 的 origin（紀錄來源），英文識別字就是 `origin`。
- 證據：
  - 直接讀到：T79 為 slug 的同形詞補了 `_Avoid_`，origin 的同形詞卻沒有。
- 影響：使用者看得到的旗標與 AC 和詞彙表的英文用語撞名，兩個同形詞的處理也不一致。
- 信心：中
- 請求等級：P2
- 建議：AC 一律寫 short-link origin；T79 為 origin（紀錄來源）補一條 `_Avoid_`，指出 `--origin` 與 short-link origin 是另一回事。

**K-7**
- 位置：spec.en.md:47 定義「host — where a range is deployed」，但 traceability.md:130-131（origin grammar 的「Host: labels…」）、spec.en.md:236（「host lowercased」）、:272（「no upstream host」）、:278（「the upstream host」）裡的 host 指的是主機名稱。
- 衝突的契約：spec 自己的 Vocabulary。這一條偏 spec 內部一致性，在本軸邊緣。
- 證據：直接讀到。
- 影響：同一份文件裡 host 有兩個意思。
- 信心：中
- 請求等級：P2
- 建議：origin grammar 那邊改成 hostname。

**K-8**
- 位置：spec.en.md:339-340（Further Notes：`git remote add upstream` 是 git 的用語）、traceability.md:54（A4）、T79。
- 衝突的契約：
  - `GLOSSARY.md:353-355` 的 upstream（上游）是「靶場所依據的 WXL 原始專案」，`_Avoid_` 只列出另外兩種一般用法。
  - `GLOSSARY.md:20-22`：`CONTRIBUTE.md` 在語料範圍內。
  - `GLOSSARY.md:58-59`：一個詞換了指涉物時，要登記進 `_Avoid_`。
- 證據：
  - 直接讀到：`CONTRIBUTE.md:57-60` 的 upstream remote 經 A4 改寫後，在靶場裡指向的是靶場自己。
  - 直接讀到：spec 只在 Further Notes 說明這件事，T79 沒有補 `_Avoid_`。
- 影響：靶場的對外文件裡，「upstream」指向靶場本身，與詞彙表的定義相反，而且沒有留下紀錄。
- 信心：中
- 請求等級：P2
- 建議：T79 為 upstream 補一條 `_Avoid_`，指向 git remote 的名稱。

**K-9**
- 位置：spec.en.md:209（B5「against the glossary's 全站清除」）、:327；traceability.md:226（T80 的 OQ-018）。
- 衝突的契約：
  - `GLOSSARY.md:226-232` 全站清除是「把本站存在這個瀏覽器裡的東西全部移除」，`_Avoid_` 特別要求範圍不能說錯。
  - `GLOSSARY.md:286-288` 本站的其他分頁。
- 證據：
  - 直接讀到：spec 承認同一個 owner 的 GitHub Pages 靶場共用 origin，與詞彙表的定義衝突。
  - 直接讀到：T79 沒有修改這兩個詞條，spec 也沒有用 override 的形式明確宣告。
- 影響：README 會寫明 storage 共用，詞彙表的定義卻依然只講「本站」。
- 信心：中
- 請求等級：P2
- 建議：明確寫成對這兩個詞條的 override，或在 T79 為它們補範圍註記。

**K-10**
- 位置：spec.en.md:26（「an earlier fork's」）、:315（「the earlier fork's slug」）；traceability.md:147。
- 衝突的契約：`GLOSSARY.md:345`，range 的 `_Avoid_`：fork。
- 證據：直接讀到。
- 影響：輕微的用語不一致。
- 信心：低
- 請求等級：P2
- 建議：改成「the range's earlier repository slug」。

**K-11**
- 位置：spec.en.md:302-306；traceability.md:226（T80 的 OQ-017）。
- 衝突的契約：`docs/agents/workflow.md:158-159`：非瀏覽器 harness 的選擇一旦做出，就記成 ADR；還沒決定之前才放在 OPEN-QUESTIONS。另外 `workflow.md:39-41` 規定難以回頭的決定要寫 ADR。
- 證據：
  - 直接讀到：spec 已經選定 harness（本機 export 讀靜態 HTML，加上 preview 的 HTTP 回應），卻記成 OQ。
  - 推論：對 hard rule 4 的 override 也沒有 ADR。
- 影響：決定散落在 OQ，下一個 epic 看不出這是已經定案的選擇。
- 信心：中
- 請求等級：P2
- 建議：寫一份 ADR；如果這只限本 epic，就在 OQ-017 寫明它是暫行做法，以及何時重新評估。

**K-12**
- 位置：spec.en.md:330-331（Out of Scope：「handled at the 2026-10-16 release」）；T71 修改的正是 `release` job。
- 衝突的契約：
  - AGENTS.md hard rule 5：release notes 要用 `/tw-emoji-release-note`。
  - `.github/workflows/release.yml:78` 是 `generate_release_notes: true`。
  - `docs/agents/workflow.md:186-196`：延後的決定要有 pending ticket 或 OQ 紀錄。
- 證據：直接讀到。spec 只寫了一個日期，沒有對應的 OQ 或 ticket。
- 影響：已知的規則衝突沒有可追溯的紀錄。
- 信心：中
- 請求等級：P2
- 建議：開一條 OQ 或 pending ticket。

**K-13**
- 位置：traceability.md:119-126（character rules）、A7（:57）；spec.en.md:332-333（只列了詞彙表新造詞這個例外）。
- 衝突的契約：
  - `CONTRIBUTE.md:79`、`.github/workflows/quality-gates.yml:115-164`：PR 時 prose-audit 會擋下中國大陸用語，而 `platform/` 底下的 md 在稽核範圍內。
  - 使用者故事 8：靶場的 CI 要保持綠燈。
- 證據：
  - 直接讀到：A7 會把 site name 寫進 `platform/index.md` 與 `platform/zh-TW/index.md`。
  - 未查證：我沒有讀 `scripts/prose-audit/run.py`，不確定它會不會稽核 frontmatter。
- 影響：如果老師的 site name 含大陸用語（例如「網絡」），靶場的 PR 會被 prose-audit 擋下。
- 信心：中低
- 請求等級：P2
- 建議：在 Out of Scope 一併列出這個情況，或寫明不處理它。

**K-14**
- 位置：spec.en.md:283（AC-D1「the two skills are byte-identical」）、traceability.md:224（T78「each keeps its current language」）。
- 衝突的契約：
  - `docs/agents/runtime.md:10-16` 與 `docs/agents/skill-sources.json:8`：每個 tree 的 skill 可以依廠商的 prompting 指引各自調整，並各自帶自己 runtime 的 metadata。
  - `docs/agents/language.md:10`：SKILL.md 用英文。
- 證據：
  - 直接讀到：目前兩份 skill 確實相同，所以這條 AC 做得到。
  - 直接讀到：spec 把語言例外寫成「stated exception」，但 `language.md` 沒有跟著改。
- 影響：AC-D1 加上了 runtime.md 沒有的限制；語言例外只寫在 spec 裡，下一個改 skill 的 epic 會看到矛盾。
- 信心：低
- 請求等級：P2
- 建議：把 byte-identical 寫成限本 epic 的明確 override，並把語言例外登記成 OQ。

**K-15**
- 位置：spec.en.md:151-154、:341-342（「one version in this repository's history (`72327e2`)」）；traceability.md:75-79、T27。
- 衝突的契約：`tests/unit/workflows/fork-template-parity.test.ts:7-10` 記載 template 在現行版本之前曾經是 unpinned `@v4`、Node 22、`cargo install wasm-pack`。
- 證據：
  - 直接讀到：`72327e2` 是 initial commit（`.git/logs/HEAD:1`），所以那個舊版不在這個 repo 的 Git 歷史裡。
  - 推論：「every earlier version」只涵蓋這個 repo 的歷史，從採用前的歷史 fork 出去的 range 會落到「Other」。
- 影響：那些 range 會拿到警告、不會被替換。後果溫和，但 spec 對歷史版本的說法與測試註解不一致。
- 信心：低
- 請求等級：P2
- 建議：在 Further Notes 寫明這個範圍限制。

---

**檢查過、沒有衝突的部分**：
- Charter：forkable、純靜態、資料留在學習者機器上。
- hard rule 1/2/3/5/6，以及 ADR-0001 至 0007。
- 對 hard rule 4 與 workflow 的 preview deployment 規則，spec 有明確寫成 override。
- 既有 fork-init 測試中，override 表沒列的那些，我逐一對過，在新契約下 body 不改也會過。
- slug literal 的分布確實只在 rewrite list 與 keep list 內（Grep 驗證）。
- 現行 `toolchain-parity.test.ts` 與 `trigger-branches.test.ts` 的斷言與 T72 相容；toolchain-parity 那段註解已列入 override 表。
- glossary test 的規則與 T79 相容。
- `.gitattributes` 與 T11 相容。
- OQ 編號 016–018 沒有和現有條目撞號。

P0：0；P1：1（K-1）；P2：14（K-2 至 K-15）