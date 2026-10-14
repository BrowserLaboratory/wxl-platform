# Stage 3 round 1：軸 2「可驗證性」（V）— epic 0003

審查版本：spec.en.md blob `e28240068a56ee1fa90c476c0846f3e232576e91`、traceability.md blob `aec390184f738b6e9fa04f0cfc6826b1649cca74`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`。reviewer：`harness-reviewer`（未執行 Git，hash 沿用 parent 提供值）。以下精簡但保留每項的位置、證據、等級與建議。本軸沒有找到含 prompt 點名的模糊字眼的 AC。

## P1

- **V-1** AC-X1 在 `git archive HEAD` 匯出樹中無法通過（spec:240；S7；`tests/unit/site/redirects-generated.test.ts:156-160、175-176`）。`trackedSlugs()` 以 `git ls-files` 取題目清單並斷言 `tracked.size > 0`；匯出樹沒有 `.git`，`git ls-files` 失敗（或在其他 repo 底下得到空集合），`pnpm test --run` 非零結束，與實作是否正確無關。信心高；reviewer 註明若 AC 介面文字不可修改應為 P0。建議：匯出後 `git init && git add -A`，或改用 `git worktree`／clone。
- **V-2** 「沒有 `--host` 時 workflow 只依明確旗標」無法判定（spec:107；fork-init.test.ts:210-236；fork-init.ts:314-331）。沒有控制 workflow 的旗標；既有測試不帶 `--host` 卻要求安裝與警告；AC-H4 只涵蓋 `--base`；AC-P2 叫 `<owner>.github.io` 改用 `--base` 又不能配 `--host`。信心高。建議：補「No `--host` × workflow」列並同步 AC-R8 的 override 清單。
- **V-3** AC-R8 的 override 集合沒有逐一列名（spec:228、86-89；T45；fork-init.test.ts:174-190（:188）、192-199、201-208、210-236、371-378）。:188 斷言 `readme + contrib + cfg` 不含 slug，但 fixture config 有 socialLinks slug（:44），新規則下必然失敗而未被點名；:371 在 rebrand 下的 CHANGELOG 改寫期望未定義。信心高。建議：T45 以測試名稱逐一列出被改寫或刪除的測試及改寫後的期望。
- **V-4** `--rebrand` 模式下 AC-A1 與 slug 範圍的判定矛盾（spec:186、82-89、175；T1、T3；CONTRIBUTE.md:200、214 含 `WXL_VERIFY_RUNTIME`、`tmp/wxl-verify`）。AC-A1 要求「no other byte of those files changes」未限定不帶 `--rebrand`，而四鍵改名一定會改到；spec:82「Nothing outside A1–A8 is written by the slug logic」無條件，AC-A2 只規範不帶 `--rebrand`；「residual inventory unchanged」指演算法或輸出無法判定（`range.json` 與 CHANGELOG 讓輸出永遠非空）。信心：AC-A1 衝突高、inventory 中。建議：AC-A1 加「without `--rebrand`」或排除四鍵；補「`--rebrand` × slug／CHANGELOG」列；寫明 inventory 是否排除 `range.json` 與 keep list。
- **V-5** AC-H5 與既有 parity 測試必然衝突（spec:99-101、211、240；fork-template-parity.test.ts:128-136 `deliberately omits SITE_BASE`）。spec 只 override 範本註解，AC-R8 範圍只有 fork-init 測試；照字面實作 `pnpm test --run` 失敗，改寫後該斷言什麼（是否與 upstream fixture 的 `SITE_BASE: /wxl-platform/` 比對）未規定。信心高。建議：T28 寫明 parity 測試的改寫內容。
- **V-6** 改成單一 base 定義後「`--base` 照今天的行為」無法判定（spec:95-98、210；T27；fork-init.ts:385-413；fork-init.test.ts:238-289）。今天 `none` 刪掉 `base:` 行、`/x/` 改寫整行為 `base: '/x/',`；新定義若是 `const`，刪掉會讓 href 參照失效，寫入 property 語法到宣告位置會語法錯誤（推論）；既有測試用舊 property 形式 fixture，驗不到真實 config。信心中高。建議：寫出新定義的確切文字與 `/x/`、`none` 套用後的確切結果（例如 `none` 改成 `'/'`），以真實 config 形式測試。
- **V-7** 「upstream environment-conditional form」沒有定義（spec:105-106、209；T26）：沒有改寫後上游形式的確切文字，也沒有比對方式（逐字、忽略空白、AST）。信心中高。建議：fixed lists 寫下逐字文字與比對規則。
- **V-8** `settings.base` 為 null 有兩種意思（spec:143、127；fork-init.ts:55、118）：沒帶 `--base` 與 `--base none` 都是 null，重放分不出「不動」與「移除」。信心高。建議：`none` 用獨立表示法（例如 `"none"`），T41/T44 加案例。
- **V-9** B2 承諾「寫入只在 A1–A8」，但 AC-A2 只檢查到檔案層級，package.json 還有 anchor 以外的寫入（spec:175、187、147；A1；T3；fork-init.ts:278-286）：引擎還寫 `version`、`author`、`license`、`name`、`description`；config.mts、兩個 index.md、shortLink.ts 裡其他位元組的改動不受檢查（例如沒帶 `--site-name` 時 config.mts 應完全不變，沒有 AC 驗證）。信心高。建議：把其餘 package.json 欄位列為 anchor 或例外；新增「A 檔中 anchor 以外的位元組不變」與「未設定值的 code anchor 檔完全不變」的 AC。
- **V-10** code anchor 的「match」沒有計數規則（spec:190；A6–A8、T8；config.mts:67；platform/index.md:4-5）：沒寫用 regex、縮排或 AST 辨識；`locales.*` 可另設 `title`、首頁 `features` 有很多 `title:`，算法不同「several」就不同（推論）。信心中。建議：為每個 anchor 寫辨識規則並各給一個「看似 match 但不算」的反例列。
- **V-11** AC-N3「config module 仍會求值為該值」在指名的 seam 上觀察不到（spec:198；T15 標為 S1；S1、S3）：S1 輸出不含模組求值；S3 匯入真實 config 只觀察 `base` 與 head href，沒有 `title`；fixture config 是 stub，真實 config 的 import 在臨時目錄無法解析；frontmatter parser 未指定。信心中。建議：擴充 S3 輸出到 `title`，或寫明以 `yaml` 套件解析 frontmatter 並以某種 TS 求值方式驗證字面值。
- **V-12** trim 之後寫入原值或修整後的值沒有定義（traceability:39-40；AC-N1、AC-N3）：「white space」是 JS `trim`、Unicode White_Space 或 ASCII 未定義，全形空白 U+3000 是實際輸入；`\p{Cc}`／`\p{Cf}` 依 Unicode 版本可能在 Node 22 與 24 不同（推論）。信心中。建議：寫明寫入修整後的值、空白等同 `String.prototype.trim`，T12/T15 加前後空白案例。
- **V-13** T38/T39 依賴的寫檔注入點不在 S1 簽章裡（spec:224、253-256；S1；T38、T39）；「先 settings、再 edits、再 applied」的順序從磁碟最終狀態看不出來。信心中。建議：S1 加 `opts.fs`（或同等介面），把依序記錄的寫入呼叫列為觀察輸出。
- **V-14** 設定紀錄的未知欄位、缺少欄位、型別正確但值無效的情況無法判定（spec:112、117-133、223、225；T37、T41）：未知頂層欄位與 `createdWith` 內部鍵的排序；缺少欄位算不算錯；`settings.host: "netlify"`、格式錯的 `applied.repo` 會直接成為 `<from>`；範例的 `applied` 寫成 `{ "…": "same shape as settings" }` 不是逐字範本。信心中。建議：明定未知欄位處理、缺少欄位處理、子欄位值驗證（套用 T31–T34），範例改逐字完整版。
- **V-15** AC-A7 的 fail 與 skip 分支在 S5 上觀察不到（spec:192；S5；T10、T11）：S5 輸入只有真實 repo，要觀察 fail 得放違規檔、要觀察 skip 得讓 manifest 不是上游；大小寫是否區分未定義；守衛永遠 pass 也不會被發現。信心中。建議：分類邏輯拆成函式，S5 加 fixture 進入點分別測 fail、skip、pass。
- **V-16** AC-C1「在 A8 已改寫的 fixture 中通過」機制沒有定義（spec:152-153、234；S6；T47；ShortLinkShare.test.ts:53-76、MergedNav.test.ts:449、464、ChallengeList.test.ts:121-145）：三支測試以相對路徑 import 真實 `shortLink.ts`；fixture 是 `vi.mock`、改寫原始碼或只在 AC-X1 驗證未定義；期望值若用 `shortLinkDisplay(…)` 算出會變成同義反覆（推論）。信心中。建議：指定 `vi.mock` 換成 `https://example.test/sub`，期望值由 `SITE_ORIGIN` 字串加固定路徑組成。
- **V-17** T19 的 Cloudflare 預設 origin 可能是空的或違反 AC-O1（spec:203、202；T19、T32）：`_`、`...`、`._` 轉換後為空字串得 `https://.pages.dev`；100 字元名稱產生超過 63 的 label；衍生值要不要再過 AC-O1 未寫。信心高。建議：衍生值必須通過 AC-O1，否則 exit 1 並要求 `--origin`；補兩個邊界。

## P2

- **V-18** AC-R3「下一次執行會補完」的參數與完成標準未定義；T39 括號「(from applied.repo)」在第一次就失敗時 `applied` 為 null；T35「Created after a successful run」與先寫 `settings` 的順序矛盾；第二次以 B 失敗、第三次改用 C 會混雜（推論）。建議：寫明「相同參數重跑後與一次成功執行逐位元組相同」並修 T35、T39 措辭。信心中。
- **V-19** S1 上的「exit 1」是拋出例外還是回傳值未定（S1 同列 `exitCode` 與 `ForkInitArgError`；現行 `runForkInit` 一律回傳 `exitCode: 0`，fork-init.ts:372）；「naming the file and anchor」在 `err.message`、`result.message` 或 stderr 未定。信心中。
- **V-20** 警告內容與「naming the anchor」沒有規範：用 id（`A2`）或 URL 形式；A2/A3 橫跨兩個 README，「no occurrence」逐檔或合併判定；其他警告沒有可斷言的關鍵字。信心中。
- **V-21** AC-H5 的 header 檢查是對散文做否定判定；同段 header 還寫「必須在 config.mts 設 `base: '/<repo>/'`」與「`--base /<repo>/` 會寫成字面值」，新模型下都不正確而 AC 沒要求修改；`${{ github.event.repository.name }}` 的實際值與「跟著改名」沒有可執行的驗證介面。建議：改為列出必須移除的字串。信心中。
- **V-22** AC-C2/C3 判定形式未定：`if:` 是否接受 `${{ }}`；「runs the fork-init and guard tests」如何從 YAML 判定；guard 測試路徑全文未指名；matrix 用 `include` 或 os × node 加 `exclude`；「latest Node 22」寫 `22` 或 `22.x`。信心中。
- **V-23** AC-X1 細節需詮釋：套用的參數值、兩份匯出或同一份依序套用、「title」包含或相等、`<title>` 或 hero、單一或兩個語系；AC 寫「module holds the origin」（原始碼層）而 T51 寫「short links carry the origin」（產物層）；靜態 HTML 或瀏覽器未說明（hard rule 4 要求說明涵蓋的介面）。信心中。
- **V-24** AC-X1 的指令順序與匯出樹環境前提：CI 在 `pnpm test --run` 前先跑 `wasm:build`、`challenge:keygen`（quality-gates.yml:54-64）；`pnpm install` 觸發 `prepare: simple-git-hooks` 而匯出樹沒有 `.git`（package.json:41）；`test:smoke` 需先 `playwright install`。信心低。建議：照 CI 順序寫出完整指令序列。
- **V-25** AC-X2 判定基準不明：「favicons load」是三個 href 回 200 或瀏覽器顯示；「base is /」從哪觀察；「title unchanged」與正式站或改動前 HEAD 比；epic 拆成多張 ticket，是哪一張的 preview。信心中。
- **V-26** AC-D1 的「document」需詮釋且沒要求移除不成立的陳述（README.md/README.en.md:81、170、177；`.claude/skills/wxl-fork-init/SKILL.md:53、92`）。建議：列出必須移除或改寫的段落。信心高。
- **V-27** AC-D2 只講「the README」，但 glossary 測試 corpus 含 README、CONTRIBUTE、CLAUDE.md、AGENTS.md、`docs/agents/guide.md`、`platform/**/*.md` 並雙向檢查（glossary.test.ts:159、175、329-341）；A7 把站名寫進 `platform/zh-TW/index.md`，站名含新造詞時靶場 glossary 測試失敗（推論）。信心中／低。
- **V-28** AC-A6（保留 CRLF）與 AC-R4（紀錄一律 LF）在 CRLF 紀錄上衝突；package.json 以 `JSON.stringify(...) + '\n'` 寫入（fork-init.ts:287），CRLF 的 package.json 會變 LF，違反 AC-A6；`.gitattributes:2` 設 `eol=lf` 使實際風險低。信心中。
- **V-29** 「changes zero files」的量測方式未定：紀錄「Written by this engine on every non-dry run」，內容相同的重寫算不算 changed，以 `changedFiles`、位元組或寫入呼叫判定。信心低中。
- **V-30** AC-H6 邊界與匯入機制：`SITE_BASE=""` 時 `??` 不套用預設值；沒有結尾斜線的 `/x` 未定義；同一測試檔重新匯入的作法（`vi.resetModules` 或子程序）未定。信心低。
- **V-31** AC-R9 的 fixture 內容未定：CLI 從腳本位置推 `PROJECT_ROOT`（fork-init.ts:46-48），fixture 必須含腳本；若新引擎 import `yaml` 等套件 fixture 需要 `node_modules`；Node 22 的 ExperimentalWarning 輸出到 stderr 是否允許。信心低。

**等級統計：P0 0（V-1 若照字面視為不可達成則為 P0）、P1 17、P2 14，共 31。**
