# Stage 3 round 1：軸 1「完整性」（C）— epic 0003

審查版本：spec.en.md blob `e28240068a56ee1fa90c476c0846f3e232576e91`、traceability.md blob `aec390184f738b6e9fa04f0cfc6826b1649cca74`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`。reviewer：`harness-reviewer`（只讀檔案）。以下精簡但保留每項的位置、證據、等級與建議。

## P0

- **C-1** `--base` 只改「那一個 base 定義」，但 head href 也引用它；`--base none` 與定義缺少、重複都沒有列（spec:95-98、210 AC-H4、212 AC-H6；T27、T29、T30；fork-init.ts:385-413；config.mts:22、69-80；README.en.md:171）。直接讀到：`setViteBase` 在 `--base none` 時刪掉該行（fork-init.ts:390），找不到時插在第一個 `title:` 前（408-411），比對 `/^\s*base:\s*/`；AC-H6 沒測 `--base /x/` 後 head href。推論：`none` 刪掉唯一定義讓 const 參照拋錯或 href 脫鉤；`const base = …` 加 `base: base,` 時 regex 改到物件那行而 href 仍是 `/`（G6 重現）；定義不存在、多次、巢狀 `base:` 沒有列。信心中；reviewer 註明若使用者認定「as today」可寬鬆解讀可降 P1。建議：新增 `--base` {`/x/`, `/`, `none`} × 定義形式 {env 條件式、字面值、缺少、多次} 的列，明訂 `none` 是改成 `'/'` 或改回 env 條件式，不再寫「刪除」。

## P1

- **C-2** 沒帶 `--host` 時要不要裝 workflow 沒有列（spec:107；T21–T27；fork-init.ts:314-342；fork-init.test.ts:210-236）。兩種讀法互斥；照舊安裝時 Cloudflare 靶場只為改 repo 名稱重跑不帶 `--host`，會被裝上 GitHub Pages workflow。信心高。建議：「無 `--host` × workflow 三態」列與「先 `--host cloudflare-pages`、後無 `--host`」重跑列。
- **C-3** T45 的 override 清單不完整、parity test 被 T28 推翻卻沒有列（T45、T28；spec:86-89、229；fork-init.test.ts:174-190、261-280、371-378；fork-template-parity.test.ts:128-136）。:174-190 fixture 有 socialLinks slug 必然失敗；:371-378 B 模式 CHANGELOG 未提；:261-280 用舊 `base:` 形狀，仍綠卻驗不到真實形狀；parity test 斷言 `SITE_BASE` undefined；AC-R8「T1–T3」與 T45「T3」不一致。信心高。建議：T45 逐一列名，新增「parity test × SITE_BASE 斷言 → 改寫成 T28」列。
- **C-4** guard 以檔案為單位、anchor 以出現處為單位，改寫清單裡的檔案出現新的非 anchor slug（例如 README 加 `…/wxl-platform/releases`）時 guard 通過而引擎不改寫（S5、T10；spec:192、282-283）。信心高。建議：新增「改寫清單上的檔案 × 不符合任何 anchor 形式的 slug → guard 失敗並指出行號」列。
- **C-5** 只帶部分參數重跑時 `settings` 丟失狀態，`--base none` 與沒給都記 null（spec:143-144；T36、T44；fork-init.ts:55-56）。`ForkInitArgs.base` 三態（undefined、null、string）；第二次只帶 `--repo` 時 `siteName` 變 null 而網站仍是 X；origin、rebrand、host 同理。信心高。建議：新增「第二次 × 參數是前一次子集」與「`settings.base` × {未給, none, 路徑}」列，none 記 `"none"` 或未給值沿用 `applied`。
- **C-6** 半套用後以不同參數重跑、`applied` 寫入失敗、檔案寫到一半都沒有列（T39；spec:146、224）。改用 slug C 重跑時 `<from>` 仍是 A，帶著 B 的檔案只警告，B 永久留著；`applied` 寫入失敗時下次對已改好的檔案逐一報警告；截斷寫入會遺失 anchor；原子化未說明。信心中高。建議：新增「T39 之後 × 不同 `--repo`」（`<from>` 依序試 `settings.repo` 再 `applied.repo`）、「`applied` 寫入失敗」列，規定 temp 檔加 rename。
- **C-7** 用舊版 `fork:init` 設定過、沒有紀錄的靶場沒有列（T5、T26、T23；spec:37-38）。`<from>` 為上游 slug而 README/CONTRIBUTE 已是老師的 slug，A2–A5 全部零出現、改名不生效；舊 workflow 沒有 `SITE_BASE` 被視為 different 而留下，config 已是 env 條件式時以 `/` 建置 project site。信心中。建議：新增「沒有紀錄 × A1 的 `repository.url` 不是上游」列，從 manifest 推 `<from>` 或明確拒絕。
- **C-8** GitHub Pages 使用者／組織站與自訂網域被 T33 擋下後沒有替代路徑的列（T33、T25、T28；spec:217；README.en.md:170-171；deploy.yml.template:15-21）。替代是不帶 `--host` 加 `--base none`，workflow 裝不裝取決於 C-2，裝了 `SITE_BASE` 是 `/<owner>.github.io/`；origin 不被推出、短連結指向上游；自訂網域根目錄在 `--host github-pages` 下被 `SITE_BASE=/<name>/` 弄壞。信心中高。建議：新增「使用者／組織站」「GitHub Pages 自訂網域」兩列。
- **C-9** 推出的預設 origin 可能不是合法 hostname（T19、T18、T16、T17；spec:203）：`._`、`__`、`-.-` 變空字串得 `https://.pages.dev`；長度 64 以上超過 label 上限；T18 的 `.x` 是否驗證未說。信心高。建議：新增「推出的 origin × 不合法 → exit 1、要求 `--origin`」列。
- **C-10** 紀錄驗證的邊界有洞（T37、T36、T41；spec:111-148、223）：未知頂層鍵或 `settings` 內未知鍵保留或拒絕、排在哪；缺少欄位（create-wxl 只寫 `upstream`、`createdWith`）；`settings.host` 是字串但不是允許值；手改過的 `applied.repo` 不符 T31/T32 卻當 `<from>`；BOM 或 CRLF 重寫後不是 byte-identical。信心中高。建議：T37 拆列，新增「未知鍵 → 保留，排在表列鍵之後，順序穩定」。
- **C-11** A1 在矩陣完全沒有列，manifest 其他會寫的欄位也沒有（A1；T1、T7；spec:81；fork-init.ts:275-290）：還寫 `author`、`license`（強制 ECL-2.0）、`name`、`description`；manifest 不存在或無法解析、`repository` 是字串形式（`{...'str'}` 會攤開字元）、CRLF manifest 經 `JSON.stringify` 換行改變。信心高。建議：新增 A1 列、其他欄位列、缺少或無法解析列。
- **C-12** `--rebrand` 與新引擎的交互作用沒有列（spec:88-89、175；T3；fork-init.ts:247-254、258-270；fork-init.test.ts:371-378）：slug 替換在兩種模式共用的 `transformText`；rebrand 若仍全樹替換，`range.json` 的 `upstream.repo` 與 CHANGELOG 會被改（0002 C-2 重演）；residual inventory 掃 `range.json` 與保留的 CHANGELOG，「rebrand NOT complete」永遠無法消除。信心高。建議：新增「`--rebrand` × 紀錄、CHANGELOG、keep list」與「residual inventory × 紀錄、keep list」列。
- **C-13** `--host` 不在允許值內（`netlify`、空字串）沒有列（spec:68-74；T22–T26）。信心高。建議：新增「其他值 → 參數錯誤 exit 1」。
- **C-14** Stage 8 的 `git archive HEAD` 匯出樹沒有 `.git`，也省略 CI 的前置步驟（S7、T50；spec:240；redirects-generated.test.ts:156-160；quality-gates.yml:54-64）。`git ls-files` 失敗或讀到別的 index；CI 在測試前先跑 `wasm:build`、`challenge:keygen`。信心：git 段高、前置步驟低到中。建議：S7 寫明匯出後 `git init && git add -A`（或 `git clone` 到暫存目錄）並與 CI 前置步驟對齊。

## P2

- **C-15** T35「Created after a successful run」與先寫 `settings` 的順序矛盾。建議：改為「第一次寫 settings 時建立」。信心高。
- **C-16** code anchor 檔案的「其餘位元組不變」沒有列（AC-A2 整檔豁免）；A7 的值可能是不加引號、單引號、block scalar（`|`、`>`）或 flow 形式。信心中。
- **C-17** `siteName` 字元邊界：U+200D 屬 Cf 使「👩‍🏫」被拒是否有意；NFC/NFD 影響碼點數；white space 是否含 U+3000；`settings.siteName` 存 trim 前或後；站名含新造詞時靶場 glossary 測試紅（glossary.test.ts:159、175、333-342，推論、機率低）。信心中。
- **C-18** `--origin` 其他邊界：純數字 label（`https://192.168.1.10`）、path `.`/`..`、hostname 總長 253 無上限、大寫 scheme、IDN 需 punycode。信心中。
- **C-19** T47 的 fixture 沒規定要包含帶 path 的 origin（`owner.github.io/name/c/001`，shortLink.ts:54-66）。信心中。
- **C-20** 主機切換的重跑順序：上游更新範本後從 github 切到 cloudflare，舊 workflow 不等於當次產生的內容而只警告；`--dry-run` 搭配移除 workflow 沒有列。信心中。
- **C-21** `SITE_BASE` 邊界值：README 讓 Cloudflare 在 dashboard 設 `SITE_BASE`，空字串或 `/x` 使 href 變 `favicon.svg` 或 `/xfavicon.svg`。信心中。
- **C-22** Cloudflare 子路徑部署（README.en.md:203）與 T20 互斥，該靶場的短連結 origin 沒有合法寫法。信心中。
- **C-23** 新的跨 OS job 與 toolchain-parity test（toolchain-parity.test.ts:140-153 把有安裝工具鏈的 job 固定成清單）的關係；T46 的 CLI 測試是否屬於跨 OS job 要跑的測試。信心中。
- **C-24** S2（真實 CLI）只有 exit 0 一列；anchor 失敗、紀錄無效、參數錯誤經真實 CLI 的 exit code 與 stderr 沒有列；S1 的 exit 1 是回傳 `exitCode` 或拋出例外未分列。信心中。
- **C-25** `--dry-run` 遇到無效紀錄或 anchor 失敗要不要 exit 1；`changedFiles` 是否列出 `range.json`。信心中。
- **C-26** T11 判斷是完全相等或包含未寫：新 slug 可包含上游 slug（T6）、`repository` 可能是字串形式；在靶場以 `--repo BrowserLaboratory/wxl-platform` 執行沒有列。信心中。
- **C-27** fork 一個已設定的靶場（紀錄是另一位老師的 `applied`）：版號不重設、`settings` 繼承前一位，是否預期未列。信心中。
- **C-28** keep list「fork-init source and its tests」的粒度：引擎拆成多模組或新增 S2、S3 測試檔是否涵蓋；guard 測試檔名未定。信心低中。
- **C-29** T7 沒有「值正在被設定」的條件，與 T8 括號說明不一致。信心中。
- **C-30** Windows 路徑分隔符：`changedFiles`、警告訊息、keep list 比對的 `\` 與 `/` 沒有列。信心低中。
- **C-31** 沒有 `.git` 的全新副本（ZIP）在設定前跑 `pnpm test`：manifest 是上游的、guard 不跳過、`git ls-files` 失敗；`redirects-generated` 測試亦同。信心中。

**等級統計：P0 1（C-1）、P1 13（C-2～C-14）、P2 17（C-15～C-31），共 31。**
