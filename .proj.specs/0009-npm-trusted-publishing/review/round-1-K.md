# Round 1 — 軸 3：契約衝突（K）

審查對象：`.proj.specs/0009-npm-trusted-publishing/spec.en.md`（blob `37699a5…`）與 `traceability.md`（blob `9bf66b5…`），在 `spec/0009-npm-trusted-publishing` 的 `2a3cde8`。程式碼基準是 `main` 的 `af4e1ac`。我讀的是 working tree 的檔案，沒有自己跑 git 去比對 blob hash。

---

### K-1 — R1 把上游 slug 字面值寫進 `create-wxl/package.json`，違反 0004 的 slug 侷限規則，必過的 CI 會轉紅
- **位置**：spec.en.md:70-72；traceability.md:125（R1）、184（M01）
- **違反的契約**：
  - `.proj.specs/0004-stateless-engine/traceability.md:117-130`（"Upstream repository-slug confinement"）：slug 字面值（不分大小寫）只准出現在兩個地方。rewrite list 只放「the package manifest, inside A1's three URL fields」，也就是根目錄的 manifest；keep list 是 `CHANGELOG.md`、`scripts/fork-init.ts` 等。原文是 "Every other tracked text file must not contain it"。
  - `.proj.specs/0005-create-wxl/traceability.md:56-57`："create-wxl's sources, tests and fixtures never spell the upstream repository slug"。
- **證據（直接讀到的）**：
  - `tests/unit/scripts/upstream-guard.test.ts:51-58` 的 keep list 沒有 `create-wxl/`。
  - `:133` 是 `const isManifest = path === 'package.json'`，A1 豁免只給根目錄的 manifest。
  - `:781-783` 的 real-tree 測試用 `git ls-files` 掃所有追蹤檔，`create-wxl/package.json` 也在其中。
  - R1 規定 `"url": "git+https://github.com/<UPSTREAM_SLUG>.git"`，而 npm 要求 URL 完全一致，所以不能拆開寫來避開比對。
- **影響（推論）**：照 R1 實作後，`quality-gates.yml` 的 `test` job 會失敗；這是 CONTRIBUTE.md:386-390 列的 required status check，PR 合不進去。`release.yml:73-74` 在建立 GitHub Release 前也會跑 `pnpm test --run`，所以 tag 的 release job 同樣會失敗。實作者要讓測試變綠，只能自行改 0004 的侷限契約，但 spec 沒有宣告這個 override。
- **信心**：高
- **請求等級**：P0。修法很小，但照現在的寫法，「正確實作 R1」和「既有契約與必過檢查」不可能同時成立。
- **建議**：新增一節 "Overridden contracts"，明說 `create-wxl/package.json` 的 `repository.url` 加進 rewrite list 或 keep list；guard 測試、0004:121-126 與 0005:56-57 要在同一個變更裡一起改。另外補一句：在 fork 跑 rebrand mode 時，這個 URL 會被整樹替換改寫，這是可以接受的。

### K-2 — Stage 8 排在 epic 合併之後，卻沒有宣告覆寫流程契約
- **位置**：spec.en.md:127-134（AC-7）、148-150、173-174；traceability.md:42（0009-S4）、187-191
- **違反的契約**：
  - `docs/agents/workflow.md:160-162`："stage 8 runs there before the pull request merges"。
  - `workflow.md:178-180`：stage 8 紀錄寫好之前，PR 不能標記 ready 或開 auto-merge。
  - `workflow.md:88-91`：行為依賴 CI 或 host 時，第一張碰到部署的票要在真實的臨時 instance 上跑 stage 8。
  - `docs/agents/issue-tracker.md:79-80`：`review` 表示正在 stage 6–8，`done` 表示已合併。
  - `AGENTS.md:35`：一個 epic 走一次 pipeline。
  - 硬規則 4（AGENTS.md:75）。
  - `OPEN-QUESTIONS.md:849`（OQ-022）明寫非瀏覽器 harness 的 override 是 "for these two epics only"（0005、0006）。
- **證據**：spec 只寫 "0009-S4 cannot run before the epic lands" 和 "the first release after the epic lands"。它沒有 0005 traceability:386-393 那種 "Overridden contracts" 表；Further Notes:173 把這件事交給之後的 release ticket。
- **影響**：0009 的票會先標成 `done`、epic close-out 先跑完，AC-7 才在 epic 之外的 release ticket 驗證。這和兩張狀態表、stage 9 的閘門互相矛盾。新的驗證面（Actions run 加 registry 加終端機 `npm create`）也沒有登記到 OQ 或 ADR，workflow.md:167-168 要求要登記。
- **信心**：高
- **請求等級**：P1
- **建議**：加一節 override，寫明：
  - AC-7 由哪張票承接；
  - 那張票在等 tag 期間是什麼狀態；
  - close-out 要不要等 AC-7；
  - workflow.md:88-91 為什麼不適用（npm 沒有獨立的 staging 目標）；
  - 新增 OQ，或延伸 OQ-022 的適用範圍。

### K-3 — 發布流程 P1–P6 漏掉硬規則 5 的 release note 步驟，也沒處理 OQ-019
- **位置**：spec.en.md:73-80、124-126（AC-6）；traceability.md:133-138（P1–P6）、185（D01）
- **違反的契約**：
  - AGENTS.md:79（硬規則 5："release notes use `/tw-emoji-release-note`"）。
  - `OPEN-QUESTIONS.md:734-756`（OQ-019：`release.yml` 的 `generate_release_notes: true` 與硬規則 5 還沒調和）。
  - 前例：T-0029 R1/R3 和 T-0067 R2/R4 的 CHANGELOG 條目都用這個 skill 產生，再拿它取代 GitHub Release 的自動 notes，標題是 "WXL <V>"。
  - 使用者的全域指示也要求：推送 release tag 時要經過這個 skill。
- **證據**：P1 只寫 "versions, CHANGELOG"；P3 寫 "`release.yml` makes the GitHub Release"，而 `release.yml:91` 仍是 `generate_release_notes: true`。P1–P6 都沒提 skill，也沒提替換 notes。User Story 4 要求整個流程只寫在一個地方。
- **影響**：AC-6 要求的流程文件照寫之後，未來的發布會留下自動產生的英文 notes，等於把違反硬規則 5 的做法寫成標準流程。
- **信心**：高
- **請求等級**：P1
- **建議**：
  - P1 明寫 CHANGELOG 條目用 `/tw-emoji-release-note` 產生；
  - P2 寫明 annotated tag 的訊息；
  - P3 之後加一步「agent 用該條目取代 GitHub Release notes」；
  - 註記 OQ-019 的現況。

### K-4 — D02 只改 0005 的 traceability，0005 spec.en.md 裡和新 X9 衝突的敘述沒處理
- **位置**：spec.en.md:84-86；traceability.md:186（D02）
- **衝突處**（`.proj.specs/0005-create-wxl/spec.en.md`）：
  - :79-82："the npm name is unpublished or the publisher maintains it"。
  - :119（B2）：Protects 欄寫 "`checkPublish` refuses to publish under a name someone else maintains (X9)"；Outside the model 寫 "the maintainer enables 2FA"。0009 的 N3 讓 2FA 和拒用 token 成為控制手段。
  - :204："`checkPublish` cannot run in CI because the tag does not exist until release"。0009 正好讓它在 CI 跑。
  - :213-214："X9 checks that later releases are published by its maintainer"。
- **連帶受影響**：
  - `docs/adr/0009-upgrade-base-is-an-upstream-release.md:34-35` 把升級目標的信任寄託在 "0005 B2"，0009 之後 B2 的內容已經不成立。
  - `OPEN-QUESTIONS.md:818-824`（OQ-021）的證據引用 D4 和 X9 的舊語意。
- **前例**：revision 2.2 和 2.3 也同步改了 0005 spec.en.md，例如 AC-9 的 "(revision 2.2)"、AC-15 的 "(0006's D21)"，所以不是只改 traceability。
- **影響**：0005 的 spec 和 traceability 會互相矛盾，ADR-0009 引用的信任邊界也會過期。
- **信心**：中高
- **請求等級**：P1
- **建議**：D02 和 AC-6 擴大到 0005 spec.en.md 的上述行（含 B2），並決定 ADR-0009:35 與 OQ-021 要不要補註 0009。

### K-5 — 引用的「0005 的 D12」在 0005 traceability 裡不存在
- **位置**：traceability.md:26（D1）、186；spec.en.md:84-85
- **契約**：`.proj.specs/0005-create-wxl/traceability.md:29-38` 的決策表只有 R1、R2、R7–R9、D2–D4，沒有 D12。D12 只出現在 `.proj.tickets/0005-create-wxl/T-0025-publishing-documents-stage-8.md:109`（"`checkPublish` gains an injected `npmWhoami`"）和 `create-wxl/src/publish.mjs:286` 的註解。
- **連帶問題**：
  - 既有 seam 0005-S2（0005 traceability:45）的參數只有 `npmView`，沒有 `npmWhoami`。0009 的 D2 寫「不再收 `npmView` 或 `npmWhoami`」，等於拿一個從沒進過 seam 的參數來描述它被移除。
  - D12 這個編號在 0006、0007、0008 各自代表別的決策。
- **影響**：寫 revision 2.4 的人找不到要「取代」的那一列，可能新增出一列從來沒有過的 D12。
- **信心**：中
- **請求等級**：P2
- **建議**：改寫成 "T-0025's D12 (ticket-level)"，並在 D02 註明 0005-S2 的 `npmWhoami` 之前從未登記。

### K-6 — 發布流程放進 `docs/agents/workflow.md`，超出該檔聲明的範圍，而且會隨範本進到每個靶場
- **位置**：spec.en.md:73-80；traceability.md:129、185
- **契約**：
  - workflow.md:3-4 寫明這份檔案只承載 "the nine stages … entry conditions, gates, and exceptions"。
  - AGENTS.md:131 對它的描述是 "the nine stages in full…"。
  - `.gitattributes` 只 export-ignore `.proj.*` 和 `create-wxl`，所以 workflow.md 會出現在每個靶場。0005 Out of Scope ⑯ 的已知限制只涵蓋對 `.proj.*` 的引用。
  - `CONTRIBUTE.md:332-334` 的 "Maintainer Setup" 是既有的「repo 外一次性 GitHub 設定」放置處，N2 的 `npm` environment 屬於這一類。
- **補充（不是 repo 契約）**：使用者的 auto-memory "upstream-first process changes" 記錄過偏好：不要把只屬於 wxl 的擴充加進通用 workflow，以免和 harness-agile 同步時 drift。
- **影響**：老師的靶場會帶著一段只有上游能執行的 npm 發布流程；之後從 harness-agile 同步 workflow.md 時會產生 drift。
- **信心**：中
- **請求等級**：P2
- **建議**：放到 WXL 專用的文件（例如 `docs/agents/release.md` 或 CONTRIBUTE.md 的 Maintainer Setup），並更新 AGENTS.md 的 Reference；不然就在 spec 裡明確宣告這個選擇。

### K-7 — W09 擴充 `toolchain-parity.test.ts`，和該測試聲明的契約不合；兩份測試的註解也沒列入要改的範圍
- **位置**：traceability.md:182-183（W08、W09）；spec.en.md:120-121、144-146
- **契約**：
  - `tests/unit/workflows/toolchain-parity.test.ts:6-18` 寫的是 "Every job that builds challenge artifacts must install the same pinned toolchain… The set is quality-gates + release only"。這份檔案現在完全不檢查 Node 版本，也不檢查 action pin 是否一致（action pin 是 `fork-template-parity.test.ts` 對 fixture 在比）。spec:144-146 把它描述成 "pin … toolchain versions"，等於把 Node 和 pin 這類新斷言塞進一份宗旨是 Rust/WASM 工具鏈的測試。
  - `tests/unit/workflows/trigger-branches.test.ts:61`："Tag-driven work belongs to release.yml"。
  - `tests/unit/workflows/upstream-only-jobs.test.ts:13-18` 寫「`format(...)` 在兩個 workflow 檔共出現五次」，這份清單是給改名時逐一核對用的。
- **影響**：測試的宗旨被稀釋；上面幾處註解會過期，W08、W09 也沒要求更新它們。
- **信心**：中
- **請求等級**：P2
- **建議**：Node 24 和 pin 一致性改放進 upstream-only-jobs 或新的測試，並在 W08 列出要更新的註解。

### K-8 — 新的 upstream-only `if:` 沒有納入 0004 T52 的 rebrand 不變式
- **位置**：traceability.md:90、113（W2）、182（W08）
- **契約**：`tests/unit/scripts/fork-init.test.ts:4252-4283`（T52/AC-B3："a rebrand run must never touch the upstream-only CI lines (T71)"）。這個測試寫死只讀 `release.yml` 和 `quality-gates.yml`，並斷言 `if:` 共 2 行、`WXL_EXPECT_UPSTREAM` 共 3 行。
- **影響**：`publish-npm.yml` 的 `if:` 也是 T71 那一類的行，但 rebrand 不改動它這件事沒有測試守著。W08 只延伸了 upstream-only-jobs。
- **信心**：中
- **請求等級**：P2
- **建議**：W08 一併延伸 T52 測試，或明說不涵蓋。

### K-9 — R1 沒寫 `repository` 在 manifest 裡的鍵順序，C45 的測試會比對順序
- **位置**：traceability.md:125；spec.en.md:70-72、122-123
- **契約**：`create-wxl/test/upstream-config.test.mjs:59-63` 用 `JSON.stringify` 比對，因為 "the listing's key order matters"。0005 traceability:315 寫 "exact, apart from the four placeholders"，R1 等於加了第五個代入值（`UPSTREAM_SLUG`）。
- **影響**：實作者要自己決定 `repository` 放在哪；M01 也就無法照著列表判斷對錯。
- **信心**：中
- **請求等級**：P2
- **建議**：R1 給出完整的 listing，標明鍵的位置，並把 "four placeholders" 改成五個。

### K-10 — 用語和 GLOSSARY 及既有用法撞名：「the gate」與「maintainer」
- **位置**：traceability.md:52（"the gate"）；spec.en.md:31-40（"As the maintainer"）
- **契約**：
  - AGENTS.md:30：替任何東西命名前要先讀 GLOSSARY。
  - GLOSSARY.md:280（解題紀錄沿用確認 = session gate）；ADR-0007 與 OQ-008、OQ-012–014 都用 "the gate" 指 session gate。
  - GLOSSARY.md:308-314（上架閘門，_Avoid_ 列有「CI check」）。
  - GLOSSARY.md:368（老師的 _Avoid_ 列有「維護者」）；:373（要指發布或控制新版的一方時寫「上游」）。0005 spec:51-53 用的是 "upstream maintainer"。
- **影響**：spec 本身在 :16 已經寫 "publish gate"，vocabulary 卻定義成裸的 "the gate"。之後的 zh-TW 翻譯很可能把 maintainer 譯成「維護者」，正好撞上 GLOSSARY 列為 _Avoid_ 的詞。
- **信心**：中低
- **請求等級**：P2
- **建議**：統一寫 "publish gate" 和 "upstream maintainer"，必要時一併更新 GLOSSARY。

### K-11 — 編號和 0005 撞名，而 D02 要直接改 0005 的檔案
- **位置**：traceability.md:121-147、187-191
- **證據**：
  - 0009 的 P1–P6（發布步驟）vs 0005 的 P1–P4（pristine 規則）；X7 仍寫 "P1–P4"，0009 又說 X1–X8 照 0005 不變。
  - N1–N4 vs 0005 的 Next steps N1–N8。
  - R1 vs 0005 的決策 R1（期限）。
  - S01–S05 vs 0005 的問題 S1–S6。
- **影響**：revision 2.4 寫進 0005 的 traceability，或把 P 和 N 搬進 workflow.md 時，脫離 0009 的脈絡後，同一個編號會指到不同的東西。
- **信心**：低
- **請求等級**：P2
- **建議**：加前綴（例如 RP1–RP6、MN1–MN4），或在引用時加上限定。

### K-12 — P2 由 agent 推 tag，和 0005 的「each asked first」衝突
- **位置**：traceability.md:134（P2 由 agent 執行）
- **契約**：`.proj.specs/0005-create-wxl/spec.en.md:198`（"Publishing to npm, tagging and the GitHub release: user actions at release time, each asked first"）。前例 T-0067:15 是使用者明確授權了推 tag 這一步。
- **影響**：在 0009 之後，推 tag 會自動 stage 到 npm，而依 D6 這個版本號就此用掉、無法重用。spec 沒寫 agent 要不要先問使用者，也沒宣告覆寫 0005 的這條。
- **信心**：中
- **請求等級**：P2
- **建議**：P2 寫明「在使用者確認之後」，或在 override 表裡宣告。

### K-13 — X9 的新訊息格式和 `PublishError` 既有的訊息約定不一致
- **位置**：traceability.md:60-70；spec.en.md:48-56
- **契約**：`create-wxl/src/publish.mjs:36-38` 的註解說 `CHECK_EXPLANATIONS` 存在，是為了讓 maintainer 不用去查檢查 id；`:52-60` 的預設訊息格式是 `<id> (<explanation>)`。
- **影響**：spec 要求 X9 的訊息點名條件和觀察到的值，最後以固定句結尾，同時又改了 `CHECK_EXPLANATIONS.X9`。但它沒說訊息開頭還要不要有 `X9 (…)`，也沒說 `CHECK_EXPLANATIONS.X9` 會出現在訊息的哪裡。
- **信心**：低
- **請求等級**：P2
- **建議**：寫出完整的訊息格式。

### K-14 — D6 讓「release」的意義分岔
- **位置**：traceability.md:31（D6）；spec.en.md:81-83
- **契約**：
  - GLOSSARY.md:385（設定紀錄「必須是上游發布過的版本」）。
  - ADR-0009:6-15 用上游 tag `v<version>` 判定「upstream release」。
- **影響（推論）**：照 D6，一個 stage 失敗或被拒的 `v<V>` 仍然有 tag，`release.yml` 也照樣建了 GitHub Release 和 zip，但 npm 上沒有 `<V>`。對 ADR-0009 來說它算 release；對 0009 的 Problem Statement（以 npm 發布次數算「兩次 release」）來說它不算。
- **信心**：低
- **請求等級**：P2
- **建議**：在 D6 或 Further Notes 寫一句，說明這種版本在升級的 base 判定上算不算數。

---

**有查過、沒發現衝突的**：
- K2 的大小寫精確比對，和 `tests/__helpers__/upstreamDecision.ts:26-28` 的精確比對一致。
- W2 的 `format()` 寫法和 `release.yml:19` 一致，guard 不會抓到。
- D6 不移動 tag，和 ADR-0009:31-33 一致。
- Charter、ADR-0001～0008 都和本 spec 無關或沒有衝突。
- README 的 fork 路徑只要求 `github-pages` environment 允許 `v*` tag；新 workflow 在靶場會被 `if:` 跳過，不衝突。

**計數**：P0 1、P1 3、P2 10
