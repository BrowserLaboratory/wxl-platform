# Stage 3 round 1：軸 3「契約衝突」（K）

審查版本：spec.en.md blob `b599e850176351a0f1a174f7ef87bd86ea481b62`、traceability.md blob `578af9f3eee43e6ba20fe595f557dcae0840a399`，程式碼以 HEAD `c0f7edf` 為準。reviewer：`harness-reviewer`，凍結 prompt `review/prompt.md`（blob `06f490b5a0edf9182dca7fa3d33b21003d4ae141`）。以下為 reviewer 報告原文。

---

標記說明：「直接讀到」是 reviewer 親自讀過的文字；「推論」是根據程式碼或文件推導出來的後果。

## P1

### K-1 runForkInit 的全檔改寫會把設定紀錄和 setup module 自己的原始碼、測試一起改掉
- **位置**：spec.en.md:114-116、191-197、160；traceability.md T64、T70、T85；scripts/fork-init.ts:167-185、267、299-308
- **違反的契約**：fork-init.ts:180-185 的註解規則：「This tool's own source + test must not be rewritten — they need the literal … UPSTREAM_SLUG to keep working on subsequent runs」。`SELF_EXCLUDE` 只保護 `scripts/fork-init.ts` 和它自己的測試。
- **證據（直接讀到）**：`walkTextFiles` 會走遍根目錄所有非二進位檔，只排除 `.git`、`node_modules`、`.claude`、`.agents`、`.codex`、lockfile、dist/cache 和 `SELF_EXCLUDE`。`transformText` 對每個檔案都做 `split(UPSTREAM_SLUG).join(args.repo)`。spec 沒有新增任何排除項目。
- **推論**：存檔順序是「write settings → apply through runForkInit」，所以 runForkInit 執行時，根目錄的設定紀錄已經在磁碟上，`upstream.repo` 會被改成老師的 repo，違反 spec:160。之後再存檔時，`fromRepo → repo` 的替換也會改到紀錄裡的 `applied.repo` 和 `settings.repo`；套用中途失敗時，下一次存檔會從錯的 slug 開始替換。setup module 的原始碼（B5 比對上游的常數）和測試 fixture 也會被改，但 runForkInit 自己的 `UPSTREAM_SLUG` 不會，AC-CI1 的 setup-module 測試在已設定的靶場裡會跟 fork-init.ts 不同步。
- **影響**：設定紀錄的 upstream 身分被毀，升級沒有可靠輸入；AC-G6 保證失效；AC-CI1 在已設定的靶場裡失敗。
- **信心**：高　**要求等級**：P1
- **建議**：spec 明文把設定紀錄、setup module 原始碼和測試加進排除清單（擴充 `SELF_EXCLUDE`），並寫進 T64 和 AC-S4。

### K-2 現有測試和 CI job 在靶場裡會變紅，但 AC-CI1 只保證新的 job
- **位置**：spec.en.md:204-205、301；traceability.md T78、T85
- **違反的契約**：tests/unit/components/ShortLinkShare.test.ts:53-76、MergedNav.test.ts:449、464、ChallengeList.test.ts:121-145 斷言 `wxl.browserlab.online`；.vitepress/config.mts:18-20「locally and in CI … it is unset, so the site serves at root and test navigation stays base-agnostic」；README.md:175 記載寫死 base 後 `test:smoke` 和 L3 會 404。
- **證據（直接讀到）**：quality-gates.yml 的 `test` job 執行 `pnpm test --run`；`site-smoke` 和 `challenge-verify` 從根路徑測試；release.yml:4-6、60-61 在 `v*` tag 時跑全套測試；T72 要求 GitHub Pages 靶場推 `v*` tag。
- **推論**：改寫 `SITE_ORIGIN` 後短連結測試在靶場失敗；GitHub Pages 靶場寫死 base 後 site-smoke、challenge-verify 404；每次推 `v*` release workflow 失敗。spec 沒有覆寫這些契約。
- **影響**：靶場 CI 從第一次 push 起就是紅的。
- **信心**：高　**要求等級**：P1
- **建議**：測試改用 `SITE_ORIGIN` 或注入 origin；明文處理非根 base 的 smoke/L3；或明確宣告靶場 CI 範圍並覆寫上述契約。

### K-3 GitHub Pages 設定 base 之後，config 的 head hrefs 依註解規定「必須」一起改，但不在 edit targets 裡
- **位置**：spec.en.md:41-43、117、276；traceability.md T28、T64
- **違反的契約**：.vitepress/config.mts:69-75「VitePress does NOT prefix `base` onto an href written inside `head` … A fork that passes `pnpm fork:init --base /sub/` … MUST edit these hrefs to match; nothing checks it for them.」
- **證據（直接讀到）**：`head` 裡 `/favicon.svg`、`/favicon.png`、`/apple-touch-icon.png` 是根路徑絕對 href，不在 edit targets；AC-S4 規定只能改 edit targets。
- **推論**：GitHub Pages 靶場 favicon 全部 404，AC-X2 抓不到。
- **信心**：高　**要求等級**：P1
- **建議**：把 head hrefs 加進 edit targets，或改成跟著 base 走的寫法，補矩陣列與 AC。

### K-4 fork 的 `upstream.version` 記錄「第一次設定時的套件版本」，跟詞彙表和 README 的 fork 流程衝突
- **位置**：spec.en.md:161；AC-G4；traceability.md T68
- **違反的契約**：GLOSSARY.md:354、364（從哪一版上游建立）；README.md:163 的 fork 流程加上 fork-init.ts:278 `pkg.version = '0.1.0'`。
- **證據**：README 路徑先把版本重設成 `0.1.0`（直接讀到），之後跑 `range:setup` 會記 `upstream.version: "0.1.0"`（推論）；fork 在 release 之間的 commit 也不精確；AC-G4 沒講清楚是重設前或後的版本，存檔順序也沒有寫入 `upstream` 的步驟。
- **影響**：設定紀錄對上游版本的陳述錯誤。
- **信心**：高　**要求等級**：P1
- **建議**：`0.1.0` 或無法判定時記 null/unknown，或改用其他來源（例如 git tag）；寫明在哪一步寫入。

### K-5 B5 用 `origin` remote 判斷上游，跟 CONTRIBUTE.md 的貢獻者 remote 配置衝突
- **位置**：spec.en.md:191、222；AC-G3；traceability.md T67、T68
- **違反的契約**：CONTRIBUTE.md:49-60、81（`origin` = 貢獻者的 fork，`git remote add upstream https://github.com/BrowserLaboratory/wxl-platform.git`）。
- **推論**：貢獻者的工作副本沒有設定紀錄、`origin` 不是上游，setup module 照常改寫，改動可能被 commit 進 PR 送回上游。
- **影響**：「上游 checkout 一律拒絕」在專案自己記載的路徑上破功。
- **信心**：中高　**要求等級**：P1
- **建議**：同時檢查名為 `upstream`（或任何 remote）指向上游 slug；或在 B5「Does not protect」明列。

### K-6 「Browser panel」在本 repo 已有固定意思，spec 拿來指 setup page 的驗證面
- **位置**：spec.en.md:295（AC-U3）、324、326-327；traceability.md T77
- **違反的契約**：docs/agents/platform-notes.md:5-10（challenge page 的 Browser panel 是沒有 `allow-same-origin` 的 `srcdoc` iframe）；GLOSSARY.md:163-166；AGENTS.md hard rule 4。
- **證據**：該 iframe 發出的請求 `Origin` 為 `null`（推論）；AC-S3 規定 Origin 不符一律 403（直接讀到）。
- **影響**：照本 repo 用法讀，AC-U3 做不到且與 AC-S3 互斥；若原意是 agent 主機的瀏覽器面板，就是未宣告的用語衝突。
- **信心**：用語衝突高；作者原意中　**要求等級**：P1（照字面讀可能是 P0）
- **建議**：改成明確的驗證面名稱，不用「Browser panel」。

### K-7 AC-D1（改 README）和 AC-D3（詞彙表測試通過）可能互斥
- **位置**：spec.en.md:302-304；traceability.md T80、T82
- **違反的契約**：tests/unit/site/glossary.test.ts:333-342（宣告新造詞的詞若已出現在語料就失敗，語料含 README.md）；GLOSSARY.md:360、365；docs/agents/domain.md:45、AGENTS.md:29-30。
- **推論**：README 照規定寫出「開發模組」或「設定紀錄」，詞彙表測試就變紅。
- **信心**：中　**要求等級**：P1
- **建議**：明文規定 README 用到時同步拿掉 `_新造詞_`，或寫出兩條規則的處理順序。

### K-8 Stage 8 驗證面沒有用 preview deployment，spec 也沒有明文宣告覆寫
- **位置**：spec.en.md:306-309、326-328；traceability.md T83、T84
- **違反的契約**：AGENTS.md:54 stage 8 gate；docs/agents/workflow.md:151。
- **影響**：選擇合理，但覆寫必須明說，否則 gate 判讀有爭議。
- **信心**：中高　**要求等級**：P1
- **建議**：Testing Decisions 加一句明文覆寫並說明原因。

## P2

- **K-9** 非瀏覽器驗證工具沒有 ADR 也沒有 OQ（workflow.md:147-149、158-159 要求記錄）。建議：AC-D2 加 OQ 或寫 ADR。信心中。
- **K-10** 英文詞「origin」跟詞彙表 `origin（紀錄來源）`（GLOSSARY.md:210-216）撞名；spec 裡另有 git `origin` remote、HTTP `Origin`。建議：識別字改 `shortLinkOrigin` 或 `siteOrigin`。信心中高。
- **K-11** spec 新立的詞（release commit、baseline commit、edit targets）沒有進詞彙表（AGENTS.md:29-30）。建議：至少加 baseline commit。信心中。
- **K-12** Charter（AGENTS.md:22-25「`pnpm fork:init` and a static host … are all a teacher needs」）沒有跟著修訂。信心中。
- **K-13** 照原樣保留的共用文件在靶場裡講上游身分：AGENTS.md:21、38-41、110-111；ADR-0004:12「first commit」與 baseline commit 定義矛盾；ADR-0006:22 指向會被 export-ignore 的路徑。建議：明文接受，或列入改寫清單。信心中。
- **K-14** Cloudflare 移除 base 會關掉 `SITE_BASE` 子路徑 seam（config.mts:16-17、README.md:203）。建議：明文覆寫並把 README:203 納入 AC-D1。信心中。
- **K-15** README 的 fork:init 段落被移除，跟 Out of Scope「fork:init stays the documented path」矛盾；README.md:168-171 是 user/org site 唯一文件；docs/agents/guide.md:32 不在 AC-D1。信心中。
- **K-16** `host` 和既有 `--base` 都能決定 base，沒有優先順序（fork-init.ts:55-56、116-126）。建議：互斥或定義優先。信心中。
- **K-17** GitHub Pages 推導的「origin」帶路徑，跟 shortLink.ts:17-25 對 origin 的定義不符。信心中低。
- **K-18** wxl-fork-init skill 驗收要求上游 slug 零殘留（SKILL.md:77-84），但設定紀錄必須保留它，跟 K-1 二選一。建議：AC-D1 一併改驗收指令。信心中。
- **K-19** setup module 自動做 baseline commit，跟 hard rule 5（AGENTS.md:78-81）字面範圍衝突，沒宣告例外。信心低。
- **K-20** release.yml:3-6、74-79 在 `v*` push 時自動建立 GitHub Release（`generate_release_notes: true`），跟「每一步使用者核准、release note 用 `/tw-emoji-release-note`」衝突；靶場推 `v*` 也會觸發。信心中。
- **K-21** Seam 代號撞名（ADR-0007:12 的 S2、MergedNav.test.ts:182、glossary.test.ts:46 的 S5/S9），而且 S1–S11 沒有在 spec 或 traceability 裡定義。建議：寫進 traceability 並加 epic 前綴。信心中低。
- **K-22** Out of Scope「only guarantees its inputs」對 fork/clone 不成立（`baseline`、`upstream.commit` 為 null）；user story 11 同。建議：限定 create-wxl 建立的靶場。信心中。
- **K-23** README.md:40 的 Node/tsx 敘述、package.json:36 `fork:init` 仍用 `tsx`、wxl-fork-init SKILL.md:23「Node.js ≥ 18」都會過期。信心中低。
- **K-24** 修改 wxl-fork-init skill 沒規定語言（language.md:10 要英文，現行為中文）。信心低。
- **K-25** 「設定紀錄」可能被讀成動詞片語，跟 GLOSSARY.md:237 的避用理由衝突。信心低。

有查過、沒發現衝突：ADR-0001、0002、0003、0005、0006（B6）、0007；trigger-branches、toolchain-parity、fork-template-parity 測試；deploy template 的 never-clobber 與 tag rule；OQ-004／OQ-005 的處理；詞彙表 range、teacher、dev module、short link、learner；Charter「run entirely in the browser」；`.gitattributes` 既有規則；scripts/verify-project.py 檢查的路徑。

**等級統計：P0 0、P1 8（K-1～K-8）、P2 17（K-9～K-25）。**
