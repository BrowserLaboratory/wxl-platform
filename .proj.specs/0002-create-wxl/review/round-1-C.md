# Stage 3 round 1：軸 1「完整性」（C）

審查版本：spec.en.md blob `b599e850176351a0f1a174f7ef87bd86ea481b62`、traceability.md blob `578af9f3eee43e6ba20fe595f557dcae0840a399`，HEAD `c0f7edf`。reviewer：`harness-reviewer`，凍結 prompt `review/prompt.md`（blob `06f490b5…`）。reviewer 沒有執行 Git；parent 以 `git hash-object` 確認兩檔未變。以下為報告內容，精簡但保留每一項的位置、證據、等級與建議。

已讀：frozen prompt、`docs/agents/runtime.md`、`review.md`、spec、traceability、`GLOSSARY.md`、`scripts/fork-init.ts`、`tests/unit/scripts/fork-init.test.ts`（前 120 行）、`deploy.yml.template`、`fork-template-parity.test.ts`、`trigger-branches.test.ts`、`config.mts`、`shortLink.ts`、兩個首頁 hero、`package.json`、`.gitattributes`、`.gitignore`、`quality-gates.yml`、`release.yml`、`glossary.test.ts`、OQ-004/OQ-005、`README.en.md`、`vitest.config.ts`、`scripts/pre-commit.sh`、`MergedNav.vue`、VitePress 2.0.0-alpha.16 `VPHero.vue`。

## P0

- **C-1** `.git` 已存在時 T66／AC-G2 規定 `baseline` 為 null，與後續儲存矛盾（traceability:74 T66；spec:284 AC-G2、164、195-196；T69）。直接讀到：T66 與 AC-G2 沒有「紀錄中尚無 baseline／第一次設定」的條件，而 create-wxl 範圍第一次儲存後就有 `.git` 與 baseline。照字面實作會在第二次儲存清掉 baseline，破壞 spec:333-335 對升級 epic 唯一承諾的輸入；T66 與 T69 在同一狀態互斥。信心高。建議：拆成「`.git` 存在且紀錄沒有 baseline → 維持 null 並說明」與「紀錄已有 baseline → 不變」兩列，AC-G2 照改。

## P1

- **C-2** slug 替換會改寫設定紀錄本身，矩陣沒有這一列（spec:114-116、166、191-197；T32、T70；fork-init.ts:267、299-308、182-185）。排除清單直接讀到。`upstream.repo` 被污染；apply 中途失敗時 `applied.repo` 已被換成新值，T70／AC-G6 不成立。信心高。建議：新增「設定紀錄 × slug pass → 永不改寫」列並加入排除清單。
- **C-3** 舊 slug 是新 slug 的子字串時，冪等與失敗後補完都會壞（T35、T70；AC-F6、AC-G6）。`lin/web` → `lin/web-range` 第二次變 `lin/web-range-range`；`BrowserLaboratory/wxl-platform-fork` 同。信心高。建議：新增列並以 token 邊界替換或先判斷是否已套用。
- **C-4** `fromRepo` 可能碰到與 slug 無關的文字（T42、T32；spec:168）。`platform/challenge`、`docs/adr`、`scripts/templates` 都合法，第二次改 repo 時會全域改寫路徑字串，build 可能壞。信心中。建議：限定 `github.com/<slug>` 語境或在 T42 加排除規則。
- **C-5** setup 模組原始碼與測試沒有排除在 slug 替換之外；T85 沒說是在設定套用之後（T85、T63；spec:177-179；fork-init.ts:182-185）。信心中高。建議：T85 改成「在完成一次儲存的 range 中」，新增「setup 模組與其測試 × slug pass → 不改寫」列。
- **C-6** 設定後的 range 裡既有測試與 workflow 會失敗，矩陣只涵蓋新 CI job（T78、T85、T72；spec:204-205、301；ShortLinkShare.test.ts:53-76、MergedNav.test.ts:449、464、ChallengeList.test.ts:121-145；quality-gates.yml:63-64、227-228、282-283；release.yml:60-61；README.en.md:175）。寫死 `wxl.browserlab.online` 的測試在改寫 `SITE_ORIGIN` 後失敗；T72 的 `v*` tag 觸發 release.yml；GitHub Pages base `/<repo>/` 讓 site-smoke、challenge-verify、本機 `pnpm challenge:verify` 失敗。信心高。建議：新增「range（兩種主機）× 既有 quality-gates／release」列；測試改讀 `SITE_ORIGIN`、列為上游專用，或明訂允許失敗並記錄。
- **C-7** fork 狀態下上游專用檔案都還在，版本對齊測試在重設版號後必失敗（spec:100-104、112-113；T21、T68、T85）。GitHub fork 不經 tarball，create-wxl 目錄、版本對齊測試、上游紀錄、`.gitattributes` marker 都留著；`package.json` 重設為 `0.1.0` 而 create-wxl 仍是 `3.0.0`。信心高。建議：新增「fork × 上游專用檔案存在」列，決定清理、跳過或自我停用。
- **C-8** git 步驟中途失敗與幾種 `.git`／紀錄組合沒有列（spec:191-197；T65、T66）：(1) `git init` 成功但 commit 失敗（`commit.gpgsign`、`core.hooksPath`）或 commit 成功但寫 baseline 失敗；(2) 老師在 setup 前自己 `git init`／commit；(3) 沒有 `.git` 但紀錄已有 baseline／applied，會用已套用設定的樹覆蓋 baseline；(4) git worktree 的 `.git` 是檔案。信心高。建議：失敗就移除 `.git`，四種狀態各列一列。
- **C-9** fork:init 與 range:setup 的先後順序沒有列（spec:208-209；T68、T69）：跑過 `fork:init --repo X` 的 fork 第一次 setup 只從上游 slug 替換，X 殘留、`upstream.version` 記成 `0.1.0`；custom domain 在 setup 之後跑 `fork:init` 會重設版號、`applied` 不更新，下一次 setup 把 base、origin 蓋回去。信心中。
- **C-10** 沒有紀錄時紀錄何時建立、版號何時讀取的順序沒寫（spec:161、191-197；T68；AC-G4）。儲存順序沒有「建立含 `upstream` 的紀錄」一步；版號先讀還是後讀未定。信心中高。建議：寫明「沒有紀錄時：讀取 apply 前的版號 → 建立紀錄」。
- **C-11** GitHub Pages 的 base 與 `head` href 不同步，不在 edit targets（config.mts:69-80；spec:41-43、117；T28、T84）。favicon 與 apple-touch-icon 404，story 6 沒做到。信心高。
- **C-12** hero name 用 `v-html` 渲染，T27 只驗證 frontmatter 解析（T27、T25；spec:221；`VPHero.vue:37`；platform/index.md:5）。含 `<`、`&` 會破版或注入標記，B4 沒涵蓋。信心高。建議：新增「siteName 含 HTML 特殊字元 × 首頁顯示為原字串」列，escape 或禁止。
- **C-13** edit target 的定位點不存在、重複或被改過時怎麼辦沒有列（spec:41-43、114-115；T23、T25；platform/index.md:4-5、24；config.mts:67；shortLink.ts:25）：frontmatter 還有 `features[].title`、`actions[].text`；`setViteBase` 找不到時會插入（fork-init.ts:407-411），title、hero、origin 找不到時未定；CRLF 換行。可能改錯或悄悄沒套用而 `applied` 照樣更新。信心中。建議：每個 edit target 加「定位點缺少／重複／CRLF」列，apply 視為失敗。
- **C-14** Windows 專屬行為沒拆列，也不會在任何地方被執行（spec:181-183、187-190、85-86、326-328；T54、T55、T62、T6）：`start` 是 cmd 內建；CVE-2024-27980 修補後不經 shell 執行 `.cmd`／`.bat` 丟 EINVAL，`wasm-pack` shim 被判 missing；Windows rename 到既有空目錄失敗；環境檢查用注入 runner、stage 8 不跑 Windows。信心中。建議：按作業系統拆列，明定 Windows 啟動器與 `.cmd` 處理，CI Windows job 至少跑一次真實探測。
- **C-15** setup 模組遇到太舊的 Node 時沒有列，CI 也沒測最低版本本身（T53、T1、T78；spec:179、204-205）：fork 路徑不經 create-wxl 的版本檢查，Node < 22.6 上 `--experimental-strip-types` 直接報 bad option；CI Node 22 是最新 22.x，22.6–22.18 strip-types 行為有變化。信心中高。建議：用 `.mjs` 外層先檢查版本；CI 加 Node 22.6.0。
- **C-16** T67 的上游判斷邊界不完整：URL 形式（SSH、無 `.git`、大小寫、尾斜線、`insteadOf`）；上游 ZIP 或沒有 `.git` 的複本會被當 fork 並建 baseline，與紀錄表「fork → baseline null」矛盾；clone 自己的 range、fork 別人的 range 時紀錄已有 baseline，與「fork or clone → null」不一致。信心中。
- **C-17** fork:init CLI 新參數的組合與 origin 規則沒有列（T23–T35；spec:110-124）：只給 `host`、只給 `origin`、`host` 與 `--base` 同時給、`host github-pages` 搭配自訂 origin、`--dry-run` 搭配 T30 刪除 workflow、`--rebrand` 搭配新參數；T24 沒說 CLI origin 能否帶 path，T47 禁止 path，兩邊不一致；尾斜線會產生 `//c/001`。信心中。
- **C-18** GitHub Pages user／org site 名稱與不合法名稱可通過驗證（T42、T45；spec:168、170、337-338）：`lin/lin.github.io` 產生錯的 base 與 origin；`owner/..`、`./x`、owner 含 `_`／`.` 也通過。信心中高。建議：T43 新增拒絕列，錯誤訊息導向 `fork:init`。
- **C-19** 「阻擋儲存」只存在於 UI，API 層沒有列（T49、T50；spec:188-189；AC-V2）。直接呼叫 save API 會在 `git init` 或 commit 時失敗，落入 C-8。信心中。建議：S6／S7 新增「環境檢查未通過時的儲存請求 → 4xx，不寫任何檔案」。
- **C-20** GitHub tarball 是否遵守 `export-ignore` 是假設，沒有 AC 驗證（spec:352、308；T21、T83）。T21 驗的是 `git archive HEAD`；AC-X1 只要求「creates a range」；不成立時的退路沒寫。信心中。建議：AC-X1 加「產出的 range 沒有 T21 路徑」，不成立時由 create-wxl 自行刪除。

## P2

- **C-21** Cloudflare 預設 origin 推導可能產生不合法 hostname（開頭結尾 `-`、label 超過 63、`..`、開頭 `.`）。
- **C-22** siteName 與 author 的字元邊界：計算單位、全空白、前後空白、DEL、C1、U+2028/2029、bidi；T26 禁止換行而 T41 沒有。
- **C-23** 磁碟上設定紀錄無效時沒有列：JSON 解析失敗（merge conflict 標記）、缺欄位、`applied` 有值但 `settings` 為 null、未知欄位、`applied.repo` 格式錯。
- **C-24** `.gitattributes` marker 不存在、只有一個、重複；override 指向本 epic 之前沒有 template 與 setup 模組的 commit。
- **C-25** 用 override 時紀錄的 `upstream.commit` 與 `version` 記什麼。
- **C-26** pre-publish 對 tag 的邊界：annotated tag 要 deref、tag 只在本機、版號不符、tag 不存在時 `npm pack`（若掛在 prepack，AC-X1 打包不出來）。
- **C-27** create-wxl 目標資料夾邊界：目標是檔案、目標是 `.`、上層不存在、「empty」的定義（`.DS_Store`、`.git`、`Thumbs.db`）、SIGINT、磁碟滿、TTY 提示輸入空字串或不合法名稱。
- **C-28** archive entry 在不同作業系統的邊界：`..\`、保留名稱（CON、NUL）、大小寫碰撞、長路徑；推論 GitHub tarball 一定帶 `pax_global_header`，若當成其他 type 每次都被拒；上游樹沒有列保證不含 symlink。信心中低。
- **C-29** create-wxl 語系判斷：Windows 通常沒有 `LANG`，繁中 Windows 會看到英文；空字串、`C`／`POSIX`；AC-C1 沒有 T1 的 locale 要求。
- **C-30** 網路環境：proxy、TLS 攔截，Node fetch 不讀 `HTTPS_PROXY` 與 npm cafile；下載與解壓後大小沒有上限。信心低。
- **C-31** next steps 沒按儲存庫狀態（新建 vs 已有 remote 的 fork）與語系分列。
- **C-32** glossary 新造詞規則與 README 更新可能互斥（glossary.test.ts:333-342、159、175-182；AC-D1、AC-D3）。
- **C-33** T22 的保留路徑不完整：setup 模組測試、fork-init 測試、`scripts/fork-init.ts`、deploy template、`range:setup` script。
- **C-34** 同一個 range 同時開兩個 setup server，409 只在單一 process 有效。信心低。
- **C-35** 已執行 `pnpm install`／`pnpm build` 的 range：slug 替換走過 `chall-wasm/target`、`.vitepress/wasm/`，可能很慢且改到產生的檔案，與 AC-S4 衝突。信心低。
- **C-36** 矩陣與 AC 不一致：T15 沒提 `baseline: null`、`createdWith`；T1 有語系要求而 AC-C1 沒有；T84 沒區分主機。信心高。
- **C-37** 設定紀錄的檔名沒定、要不要 commit 沒說。
- **C-38** 題目頁導覽列 brand 寫死「WXL」（MergedNav.vue:108），符合不 rebrand 的決定，但矩陣沒列刻意保留。信心低。
- **C-39** Windows 上 changed files 的路徑分隔符號。信心低。
- **C-40** git 檢查邊界：版本字串格式（「2.39.3 (Apple Git-146)」、「2.45.1.windows.1」）、identity 只設在 repo 本地或設成空字串；fork 路徑不 commit 卻要求 git ≥ 2.28 與 identity。信心低。
- **C-41** package.json:36 `fork:init` 仍用 `tsx`；T34 沒說 CLI 是否提供 `--keep-version`。
- **C-42** create-wxl 若靜態 import `tar`，很舊的 Node 可能在版本檢查前就崩潰。信心低。

**等級統計：P0 1（C-1）、P1 19（C-2～C-20）、P2 22（C-21～C-42），共 42。**
