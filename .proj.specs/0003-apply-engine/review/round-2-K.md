# Stage 3 round 2：軸 3「契約衝突」（K）— epic 0003

審查版本：spec.en.md blob `63b9ce0806b1a758252940ab4799e8395bf5f15e`、traceability.md blob `3240fec5c25b4fdb7a194e4e8c6a1ae4495ee358`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`（原文重播）。reviewer：`harness-reviewer`（未執行 Git）。round 1 已裁決駁回的 K-13、K-15 不重提。以下精簡但保留每項的位置、證據、等級與建議。

## P1

- **K-1** `--author`／`--repo` 是否必填與 user story 2 衝突（spec:51-52、80-81、181；T59；fork-init.ts:52-54、94-95；fork-init.test.ts:106-114；README.md/README.en.md:81、160；兩棵樹 SKILL.md:39-40）。spec 全文沒說明是否仍必填；`parseForkInitArgs` 讀不到紀錄，無法判斷「沒有紀錄才必填」，而 spec 規定參數錯誤由它丟出。信心高。建議：首次轉換或沒有 `applied` 時必填、否則沿用，缺值定為 tree-state error；兩支 parse 測試、README:81/:160 與兩份 skill 列入 override 或 T73/T74。
- **K-2** keep list 收了 release workflow，等於取消第四個敏感鍵（spec:105-107、AC-B1；traceability:63-66、T63；fork-init.ts:202-204；release.yml:72、79；fork-init.test.ts:318-327 不在 override 表）。`wxl-${` 只在 release.yml。「保留四把鍵」「跳過 keep list」「其他測試原封通過」三句無法同時成立；這正是 review.md:53-56 要求 revision 前做的互斥自查。信心高。建議：(a) keep-list 排除只套用 slug、不套用 key rename；或 (b) 明定只剩三把鍵並把測試與 fork-init.ts:202 註解列入 override。
- **K-3** `--repo` 含敏感鍵 token 時「由建構保證不被誤改」的規則沒帶進新引擎，AC-R7 會失敗（T63、T58；spec:269、87-88；fork-init.ts:191-196 註解；fork-init.test.ts:439-445；兩棵樹 SKILL.md:53）。先改錨點後 rename 時第一次就壞；第二次相同參數時 A3 不在 T63 排除範圍，任何順序都被改成 `me/acme-locale`；`rebrand` 從 `applied` 繼承使每次執行都再套一次。信心中高。建議：T63 排除 A1–A5 出現處（或新 slug 的出現處），明寫 rename 先於錨點改寫，補「`--repo` 含鍵 token × 第二次執行」列。
- **K-4** `settings` 合併語意會產生參數規則禁止的組合，與詞彙表「升級時照它重做一次」（GLOSSARY.md:363-364）衝突（spec:181、130-131、315；traceability:76-79、T35、T59、T60）。先 `--base /r/` 再 `--host github-pages`，`settings` = {host, base} 為 T35 拒絕的組合；沒有 unset，給過 `--base` 就永遠同時帶 host 與 base；經 `parseForkInitArgs` 重播是參數錯誤、直接呼叫 `runForkInit` 優先順序未定義、紀錄驗證若檢查組合則下次執行因自己的紀錄 invalid 而失敗。信心中。建議：給 `--host` 時把 `settings.base` 設 null（或反之），補列並明寫紀錄驗證是否檢查組合。
- **K-5** T73 的 README 移除清單不完整，照 README 做會讓靶場 CI 變紅（T73；AC-D1；spec:118-119、28）：README.md/README.en.md :163 指令範本 `--base <見下方說明>`；:166「依 `--base` 設定或清除」與無條件複製 workflow；:170 project site 用 `--base /<repo>/`（T73 只移除半句）；:171 user site 與自訂網域用 `--base none`、「移除 `base` 宣告」；:173 `?? '/'` 與「每個資源都會 404」。照 :170 做會得到字面值 A9、smoke 與 challenge 測試 404，user story 7 失敗。信心高。建議：T73 改為「改寫整個 fork 段落（:158-184）與指令表 :81」或逐條列入。

## P2

- **K-6** `--rebrand` 會寫 `name`，與 A1「name when given」及 AC-A2 不一致；fork-init.test.ts:447-460 要求沒帶 `--name` 時 name = rebrand 名稱（fork-init.ts:284），不在 override 表；`settings.name` 為 null 而 manifest 已改。信心中。
- **K-7** fork-init.ts 的模組與型別註解被默默推翻：:13-28（B-mode renames the upstream slug + 4 keys）、:30-32（exit 1 只用於 user input error）、:55（`null = remove`）；fork-init.test.ts:125 測試名稱「--base none marks base for removal」不在 override 表。信心高、嚴重度低。
- **K-8** 範本與 parity 測試的其他註解沒列入 override：deploy.yml.template:4-6、20-21；fork-template-parity.test.ts:6-7；T41 只檢查兩個字串不存在。信心高。
- **K-9** B6 引用 ADR-0006 不對（ADR-0006 談 session gate 威脅模型，與網站是否靜態無關）；GitHub Pages 共用 origin 與「全站清除」定義（GLOSSARY.md:226-227）衝突，清除會連另一個靶場資料一起刪，介面文案 zh-TW.json:125、en.json:129 少講刪除範圍；spec「documented, not fixed」沒點名推翻哪條。信心中。
- **K-10** keep list 的 glob `scripts/fork-init*.ts` 涵蓋不到可能的引擎模組路徑（spec:77-78 說 engine modules），`UPSTREAM_SLUG` 若放到 `scripts/fork-init/xxx.ts`，guard 在上游第一天就紅（推論）。信心中低。
- **K-11** spec 仍大量用裸 slug 指 repository slug（spec:94-97、105、197、228、231、274；traceability 全篇），與 disposition K-14、T75、domain.md:45 不一致。信心中、嚴重度低。
- **K-12** stage 8 的 override 沒點名 AGENTS.md hard rule 4「drive the real page」；AC-X1 從靜態 HTML 讀、AC-X2 只看 HTTP 狀態。信心中低。
- **K-13** A3 改寫後 README quick start 前後不一致（README.md/README.en.md:55-56：clone `web-range` 再 `cd wxl-platform`）；今天就存在。信心中。
- **K-14** B3「tree-wide by design」與既有排除規則（fork-init.ts:167-185 的 `.claude`、`.agents`、`.codex`、lockfile、dist、cache）措辭不一致。信心低。
- **K-15** AC-R8「原封通過」要靠改過的共用 fixture：`A_ARGS`（fork-init.test.ts:102）帶 `--base /myfork/`，fixture（:38-49）沒有 A9，不改時 T40 讓 :217-227 等測試回 `exitCode` 1。建議：AC-R8 明寫「測試本體不動，共用 fixture 可改」。信心中低。
- **K-16** 照舊 README 建立的靶場（config 為 `base: '/r/'`）沒有 base 的遷移路徑：T40 沒有 A9 時帶 `--base` 回 1、T36 帶 `--host` 只警告，CI 一直紅；user story 8 只承諾版號與 repo 連結，僅記錄。信心中。

非本軸觀察（轉交，不計入）：`SITE_ORIGIN` mock 可能無效（預設參數綁模組內部常數，同 V-5）；換 host 時 origin 繼承或重新推導前後矛盾（同 C-4、R-3）。

**等級統計：P0 0、P1 5（K-1～K-5）、P2 11（K-6～K-16）。**
