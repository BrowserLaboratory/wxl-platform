# Round 2：軸 3「契約衝突」（epic 0006-range-upgrade）

**審查版本**
- spec.en.md blob `2cf003ad…`
- traceability.md blob `afd5040b…`
- HEAD `56902c2`
- 凍結 prompt blob `0bfaa5b2…`

我沒有 shell，blob hash 沒有自行重算，用的是主 session 提供的值。讀的是工作樹檔案。

---

**K-1　0006-S1 用 `GIT_CONFIG_GLOBAL` 隔離，但 0005 的 git 環境會把它濾掉**
- 位置：traceability.md:85（0006-S1「`HOME` and `GIT_CONFIG_GLOBAL` isolated」）；spec.en.md:143-145
- 違反的契約：0005 traceability.md:274-276（去掉所有 `GIT_*` 變數）、:55-56 與 :524-525（測試用 `HOME`、`XDG_CONFIG_HOME` 隔離）、C70（:480）；0005 spec B7（:124）
- 證據（直接讀到）：`create-wxl/src/git-env.mjs:6-13` 的 `buildGitEnv` 會濾掉 `GIT_CONFIG_GLOBAL`。T-0026 ticket :108 已經記下「寫了也讀不到」，改用 `HOME/.gitconfig`，但 spec 沒有跟著修。
- 影響：照 seam 寫測試的人如果用 `GIT_CONFIG_GLOBAL` 設定 U05 的 `status.showUntrackedFiles=no` 或 U19 的 `merge.conflictStyle=merge`，git 根本讀不到這些設定，測試會在沒驗到任何東西的情況下變綠。另外 seam 漏了 `XDG_CONFIG_HOME`，主機的 `~/.config/git/config` 會滲進測試。
- 建議：seam 改成「`HOME` 與 `XDG_CONFIG_HOME` 隔離，比照 0005」。
- 信心：高；等級：P2

**K-2　GLOSSARY 說「只有建立靶場的指令會寫入設定紀錄」，但升級會改寫 `range.json`；而且這句話被 0005 的測試鎖住**
- 位置：spec.en.md:100-101、:135（AC-9「a missing file is created」）、:138（AC-12）；traceability.md:142（step 9）、:220-225
- 違反的契約：GLOSSARY.md:385「目前只有建立靶場的指令會寫入它」；AGENTS.md 規定詞義改變時要在同一個變更裡更新 GLOSSARY
- 證據（直接讀到）：`create-wxl/test/upstream-config.test.mjs:369` 寫著 `expect(setupRecordEntry).toContain('目前只有建立靶場的指令會寫入它')`。同一詞條前文又寫「升級完成後改記新版」，詞條自己前後矛盾。
- 影響：用語契約和實際行為衝突。要修 GLOSSARY 就得改 0005 的 U10 測試，但 AC-12 只允許兩個例外（C02、C18/C71），等於修了就違反 AC-12。
- 建議：AC-12 加第三個例外（U10 這句改成「建立靶場的指令與升級會寫入它」），並同步更新 GLOSSARY。
- 信心：高；等級：P1

**K-3　stage 8 的覆寫引用了錯的 OQ 編號**
- 位置：spec.en.md:167-168「recorded with 0005's under OQ-017」
- 違反的契約：OPEN-QUESTIONS.md:838-850（OQ-022 才是 0005 與 0006 終端機 stage 8 的覆寫紀錄）；OQ-017（:640-650）是 0004 讀靜態建置輸出的那一題；workflow.md:167-168
- 證據（直接讀到）：0005 traceability.md:390 也引用 OQ-022。
- 影響：stage 8 覆寫的出處指錯地方，追查不到。
- 建議：改成 OQ-022。
- 信心：高；等級：P2

**K-4　CW-E14 被拿來表示一個已知的 git 失敗**
- 位置：spec.en.md:128（AC-2）；traceability.md:138（step 5）、U67
- 違反的契約：0005 traceability.md:152-153、:181。CW-E14 的定義是「an unexpected error」（bug），訊息只帶錯誤本身的 message。Round 1 處置 C-17/K-4（disposition.md:72、:84）的原則是：0006 不沿用語意不同的 0005 代碼，所以當時另立了 UP-E11。
- 證據（直接讀到）：`messages.mjs:309-310` 的文字是「an unexpected error happened」。
- 影響：`git ls-files` 或 `check-ignore` exit 128（例如 safe.directory）會被當成程式 bug 回報；而「naming the command」這個要求在 0005 的訊息裡沒有欄位可放。
- 建議：新增一個 UP-E 代碼，或明文覆寫 CW-E14 的定義。
- 信心：高；等級：P2

**K-5　step 9 遇到 bug 時，要印哪個代碼、要不要附還原指令沒有定義**
- 位置：traceability.md:145-149
- 違反的契約：0005 traceability.md:152-153。bug「handled like a signal in its window, printed as CW-E14」；而 0006 對 step 9 的訊號規定印 UP-E09 並附還原指令。
- 證據：這兩條契約疊在一起，step 9 的 bug 到底印 CW-E14 還是 UP-E09、附不附還原指令，spec 沒說（推論）。
- 影響：寫到一半失敗的靶場，可能拿不到還原指令。
- 信心：中；等級：P2

**K-6　UP-A12 說重跑 fork:init「也會更新 workflow」，和 README 寫的不一致**
- 位置：traceability.md:216-218、:261
- 違反的契約：README.md:211-216 的表格。只有在檔案「與已知舊範本輸出相同」而且帶 `--host github-pages` 時才會取代；自訂過的版本或不帶 `--host` 都保持原樣，只發出警告。
- 證據（直接讀到）：`scripts/fork-init.ts:723-730`、:1599-1625（`KNOWN_OLD_DEPLOY_SHA256`、'other' 時不動）；`messages.mjs:252-253`。
- 影響：老師以為 workflow 已經更新了，實際上沒有。
- 建議：改成有條件的說法，或引用 README 的表格。
- 信心：中高；等級：P2

**K-7　stage 8 的 fixture commit 沒有明寫是 hard rule 5 的例外**
- 位置：traceability.md:283-284、:295（`git commit -m fixture`）
- 違反的契約：AGENTS.md hard rule 5（每一次 `git commit` 都要用 `/tw-emoji-commit`）
- 證據（直接讀到）：同一段對 hard rule 1 寫了「an explicit exception」，對 rule 5 只寫「not project history」。0005 的 G4 有明確點名 hard rule 5 不適用（0005 traceability.md:291-292）。
- 影響：stage 8 執行者會面對兩條互相衝突的規則。
- 建議：明寫「explicit exception to hard rule 5」。
- 信心：中；等級：P2

**K-8　spec 自己把 D2、D7–D17 宣告為比照 stage 1 決策、不受審查質疑**
- 位置：spec.en.md:8-10
- 違反的契約：凍結 prompt.md:34-43 的「Context you may rely on」清單是固定的；hard rule 3 與 ADR-0003 要求 round 2 只換 spec 版本，不換標尺
- 影響：被審查的文件自己擴大了豁免清單，等於改變了審查標尺。
- 建議：刪掉這句，或由使用者在 prompt 之外另行裁決。
- 信心：中低；等級：P2

**K-9　`--from <commit>` 的 base 不符合「原廠靶場」與「上游」的定義**
- 位置：traceability.md:73（D17）、:101、:105；spec B1（:118）
- 違反的契約：GLOSSARY.md:358-359（原廠靶場「用某一版上游建立」）、:371（「指出從哪一版上游」）；0005 traceability.md:67（「the archive of one upstream commit」）
- 證據：D17 說 B 是「whoever suggested it」的 commit，可以是 fork network 的內容。
- 影響：B 這個詞的指涉物超出詞彙表的定義。
- 建議：詞條補一句 `--from <commit>` 的例外，或在 traceability 的 vocabulary 明文覆寫。
- 信心：中；等級：P2

**K-10　新詞沒有收進 GLOSSARY**
- 位置：traceability.md:102（release）、:103（name on disk）；介面字串 :244（UP-E12）、:264（UP-A15）、:274（R1）
- 違反的契約：AGENTS.md 規定新增詞要在同一個變更裡更新 GLOSSARY
- 證據（直接讀到）：GLOSSARY 沒有「發布版」「磁碟上的名稱」這兩個詞條。
- 影響：zh-TW 訊息會各自臨時用詞，用語不一致。
- 信心：中低；等級：P2

**K-11　「the range's rules」和實際使用的 git 指令範圍不符**
- 位置：traceability.md:111（ignored path）、:245（UP-E13 的補救建議）
- 違反的契約：0005 G2 用 `-c core.excludesFile=`（:283、:290），B7（0005 spec:124）也把全域 excludes 視為「不是靶場的規則」
- 證據：`git check-ignore --no-index` 沒有加 `-c core.excludesFile=`，所以會連使用者的全域 excludes 與 `.git/info/exclude` 一起算進去（推論）。
- 影響：如果 ignore 規則在全域設定或 `info/exclude` 裡，UP-E13 給的「remove the ignore rule and commit」行不通。
- 信心：中低；等級：P2

**K-12　沒有提到 ADR-0008 對升級的承諾**
- 位置：spec.en.md:176-178（Out of Scope 的 migrations）；traceability.md:112（anchor files 寫死 `platform/index.md`）
- 相關契約：ADR-0008:37-41「the upgrade moves the old layout … before it merges」，這份 ADR 早於 revision 3
- 證據：OPEN-QUESTIONS.md:994-998 把這次搬移排給 layout epic，方向和 0006 一致，但 0006 沒有引用 ADR-0008。
- 影響：layout epic 屆時必須覆寫「steps 1–8 write nothing」、anchor 清單與 AC-6，目前沒有任何預告。
- 信心：低；等級：P2

**K-13　checkpoint 名稱和 0005-S1 撞名**
- 位置：traceability.md:88（「everything else is 0005-S1's」）、U28（「checkpoint of step 7/10」）
- 違反的契約：0005 traceability.md:41（`step-3`…`step-13` 依建立流程的步驟編號）
- 證據（直接讀到）：`create-wxl/src/upgrade.mjs:120-480` 用的是升級流程自己的 `step-3`…`step-10`。
- 影響：同一個名稱在兩條路徑代表不同的步驟範圍，seam 沒有定義。
- 信心：低；等級：P2

**K-14　tag 不存在或 comment 損壞時，訊息沒有告訴老師要用 `--from`**
- 位置：traceability.md:240（UP-E08 只帶 tag）；AC-5 用 CW-E07
- 違反的契約：GLOSSARY.md:385「不是的話升級會停下，由老師自己指出」；ADR-0009:31-33
- 證據（直接讀到）：0005 的 CW-E07（:174）只帶 URL 與狀態碼；UP-E12（:244）則有提到 `--from`。
- 影響：base 來自 `range.json` 的老師卡在 CW-E07 或 UP-E08，不知道下一步該做什麼。
- 信心：低；等級：P2

**K-15　沒有 spec.zh-TW.md**
- 位置：spec 整份
- 違反的契約：docs/agents/language.md:38-41（審查通過後產出一次翻譯，附 `synced_from_sha`）
- 證據（直接讀到）：Glob 結果裡 0006 與 0005 都沒有 `spec.zh-TW.md`。0006 在 round 1 已經過 gate，revision 3 也沒有安排翻譯。
- 影響：使用者沒有可以審閱的 zh-TW 版 spec。
- 信心：中；等級：P2

**K-16　revision 3 的行號位移讓 OQ-020 的引用失效**
- 位置：OPEN-QUESTIONS.md:800-801 引用 `traceability.md:254, U24`
- 違反的契約：workflow.md:54-56（引用時寫名稱，不寫行號）
- 證據（直接讀到）：現在第 254 行是 UP-A5，U24 在第 339 行。
- 影響：OQ-020 的證據鏈指錯地方。
- 信心：中；等級：P2

**K-17　D14 改變還原順序，但沒有列出哪些既有 0006 測試與註解要跟著改**
- 位置：traceability.md:70（D14）；AC-10、AC-11、U27、U28
- 相關契約：D14 已明文推翻 round 1 處置 C-4，覆寫本身合法。以下既有檔案仍寫著舊順序：
  - `create-wxl/test/upgrade-report.test.mjs:266`、:319（R5 字面）
  - `create-wxl/test/upgrade-restore.test.mjs:2`、:73
  - `create-wxl/src/messages.mjs:264-274`
  - `create-wxl/src/upgrade-report.mjs:88-89`
  - `create-wxl/src/merge-plan.mjs:396-398`
  - OPEN-QUESTIONS.md:1043
- 證據（直接讀到）：U27/U28 的現有測試用 `toContain`，不檢查順序，滿足不了新的「checkout 在 clean 之前」。
- 影響：ticket 可能漏改其中某處。
- 建議：比照 AC-12 對 0005 的寫法，列出要改的 0006 測試。
- 信心：中；等級：P2

---

依等級統計：P0 0、P1 1、P2 16，共 17 項。
