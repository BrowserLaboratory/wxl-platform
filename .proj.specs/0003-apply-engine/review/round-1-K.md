# Stage 3 round 1：軸 3「契約衝突」（K）— epic 0003

審查版本：spec.en.md blob `e28240068a56ee1fa90c476c0846f3e232576e91`、traceability.md blob `aec390184f738b6e9fa04f0cfc6826b1649cca74`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`。reviewer：`harness-reviewer`（未執行 Git，hash 沿用 parent 提供值）。以下精簡但保留每項的位置、證據、等級與建議。

## P1

- **K-1** 沒帶 `--host` 時 workflow 怎麼處理，與既有測試、README、OQ-004 衝突（spec:107、229 AC-R8；T45）。fork-init.test.ts 用不帶 `--host` 的 `A_ARGS`，卻要求安裝 workflow（210-215、217-227、244-250、341-351）；README.md/README.en.md:166 與 OQ-004（OPEN-QUESTIONS.md:167-168）寫「copied unconditionally」。CLI 沒有控制 workflow 的 flag，字面讀 107 行等於不裝，但這些測試不在 override 清單，AC-R8 又要求原封通過。信心高。建議：明寫沒帶 `--host` 的行為，若改成不裝就把測試列入 override。
- **K-2** `--base none`「照舊」會刪掉唯一的 base 定義，但 head href 也在用它（spec:95-98、209 AC-H4；T27；fork-init.ts:55、389-391；fork-init.test.ts:238-242、282-289；README.md:171）。照字面實作 head href 指向已不存在的定義（ReferenceError）或退回寫死值（G6 復發）；`/^\s*base:\s*/`（fork-init.ts:388）在新形狀會命中哪一行未規定（推論）。AC-H4 與 AC-H6 無法同時成立。信心中高（reviewer 註明 parent 若認為「as today」有約束力可升 P0）。建議：定義 `--base none` 在新形狀的結果（例如 `'/'`），相關測試列為 override。
- **K-3** fork-template parity 測試明文要求「刻意不設 SITE_BASE」，spec 沒有明確 override（spec:99-101 只 override 範本註解；AC-H5；T28；`fork-template-parity.test.ts:128-136`「deliberately omits SITE_BASE — forks get a literal base instead」，`expect(buildStep?.env?.SITE_BASE).toBeUndefined()`）。信心高。建議：override 加入這支測試並寫明改寫後的斷言（`SITE_BASE` 等於 `/${{ github.event.repository.name }}/`）。
- **K-4** 既有測試要求「config 裡不能留上游 slug」沒有被 override（fork-init.test.ts:174-190，:188 `expect(readme + contrib + cfg).not.toContain(...)`，:187 註解「the executable config's socialLinks URL is the one that matters most」，fixture :44 有 socialLinks slug）。新引擎不改 socialLinks，測試會紅；AC-R8 與 AC-A2/T3 矛盾。信心高。建議：列入 override 改寫成 T1–T3。
- **K-5** `settings` 語意與詞彙表「設定紀錄」以及 `ForkInitArgs` 的 null 契約衝突（spec:143-144；T36；GLOSSARY.md:363-364；fork-init.ts:55）。第二次只改 `--origin` 時 `settings.siteName` 變 null 而 A6/A7 仍是那個名稱，升級照 `settings` 重做會弄丟站名；`--base none` 與沒帶 `--base` 都是 null。違反 user story 8。信心中高。建議：`settings` 改合併語意並為 `--base none` 設哨兵值，或修改詞彙表定義並明寫 override。
- **K-6** 「rebrand 殘留清單不變」與 keep list 衝突，殘留清單誠實性契約破掉（spec:88-89、118、155；keep list；fork-init.ts:240-246、349；兩棵樹 `wxl-fork-init/SKILL.md:15、67、84`）。CHANGELOG、workflow 的 `if:`、`range.json` 的 `upstream.repo` 刻意保留含 `wxl` 的上游 slug，rebrand 過的靶場殘留清單永遠清不空、永遠回報「rebrand NOT complete」，警告「renamed the upstream slug」也變假（推論）。信心中高。建議：殘留清單排除 keep list 與紀錄裡刻意保留的 slug，或明確 override 這些註解與 skill 敘述。
- **K-7** seam S1 的簽章沒有「寫檔依賴」（traceability:11、7「approved by the user」；spec:67、254-256；fork-init.ts:210-213）。T39 要的寫入中途失敗必須透過簽章沒有的依賴注入，spec 沒說要改 seam。信心中。建議：S1 明確加上可選的 writer 依賴並重新取得核准。
- **K-8** README 與 skill 的 fork 流程與新模型互相矛盾，AC-D1 沒要求修正（spec:164-168、245；T54）。README.md/README.en.md:81「腳本也從不寫入 `SITE_BASE`」、:170「刻意不設 `SITE_BASE`」、:171 Cloudflare 用 `--base none`（與 T25 衝突）、:173、:175（子路徑測試會 404）、:177（不會改短連結）；兩棵樹 SKILL.md:39、42 的 base 決策表、:53「掃描式」替換、:92。加了新說明但保留舊段落的 README 照樣通過 AC-D1。信心高。建議：AC-D1 列出必須移除或改寫的段落。

## P2

- **K-9** rebrand 模式下的 CHANGELOG 測試（fork-init.test.ts:371-378）算不算被 override 不清楚；T3/AC-A2 限定沒有 `--rebrand`，無法「改寫成 T3」；spec:229「T1–T3」與 T45「T3」不一致。建議：明寫 override 並補「`--rebrand` × CHANGELOG」列。信心中。
- **K-10** A1 只定義三個欄位、B2 說寫入限於 A1–A8，但實際還寫 `version`、`author`、`license`（ECL-2.0）、`name`、`description`（fork-init.ts:278-286；fork-init.test.ts:178-180、291-300、447-460）。建議：A1 加上這些欄位或 B2 註明「A1 所在的檔案」。信心中。
- **K-11** 多處程式碼註解會變成假的而沒宣告 override：config.mts:12-15、:73（「Nothing in this repository sets SITE_BASE any more」）；deploy.yml.template:4-6、20-21；fork-template-parity.test.ts:6-7；toolchain-parity.test.ts:16-18；shortLink.ts:22-23；LocaleSwitcher.vue:65-67 與 locale-switcher.test.ts:144。建議：Documents 段列出要同步修改。信心高。
- **K-12** Cloudflare origin 不准帶路徑，但 README.md/README.en.md:203 記載 Cloudflare 可部署在子路徑（加 `SITE_BASE`）。建議：移除 README 的子路徑選項或放寬 T20。信心中。
- **K-13** A4 讓靶場的 `upstream` remote 指向靶場自己，與詞彙表「上游」（GLOSSARY.md:353-354）衝突；CONTRIBUTE.md:81、85-86 的 `upstream/main` 在靶場裡指自己；E5 的升級模組靠 git 歷史推斷時可能被這個 remote 誤導（推論）。今天的子字串替換就有，spec 把它明訂成錨點。信心中低。
- **K-14** 用語衝突：「slug」在 spec 指 `owner/repo`，但 GLOSSARY.md:75-76 定義為題目 slug；「in a fork」指靶場，而 GLOSSARY.md:345 `_Avoid_: fork`；`--origin`／`settings.origin` 與 GLOSSARY.md:210 的 origin（紀錄來源）同字（spec:39-40 已區分）。建議：改用 repository slug／repo slug 並記進 slug 的 `_Avoid_`。信心：slug 高、其餘中。
- **K-15** spec 新增老師會看到的概念（short-link origin、site name、host、identity anchor）卻沒同步進詞彙表（AGENTS.md:29-30）。信心中低。
- **K-16** 詞彙表說紀錄記下「從哪一版上游建立」（GLOSSARY.md:354、364），但引擎寫入 `version: null`（E5 已核准，只指出措辭沒涵蓋「未知」）。信心低。
- **K-17** stage 8 驗證面偏離 AGENTS.md pipeline 第 8 列與 workflow.md:151-153、158-159（非瀏覽器 harness 要記成 ADR 或先放 OQ），spec 有寫理由但沒寫明 override 哪條，也沒登記 ADR／OQ。信心中。
- **K-18** language.md:10 規定 SKILL.md 用英文，spec:166 要兩份 skill 保持現在的語言（繁中），沒宣告 override。信心高。
- **K-19** `<owner>.github.io` 的 repo 在新規則下走投無路：T33 指向 `--base`、T25 `--host` 加 `--base` 錯誤、依 K-1 字面讀法不帶 `--host` 拿不到 workflow 與推導 origin；與 README.md:171、deploy.yml.template:20-21 的流程衝突。信心中（取決於 K-1）。
- **K-20** 網站名稱寫進 `platform/index.md` 與 `platform/zh-TW/index.md`，兩者在 glossary 測試語料（glossary.test.ts:159-185、333-341）與 prose-audit 範圍（CONTRIBUTE.md:79、required check），站名含新造詞或大陸用語會讓靶場 CI 紅（與 user story 7 衝突）。信心低。
- **K-21** 兩棵樹 SKILL.md:23 寫「Node.js ≥ 18」，與 README.md:40、spec:158 的 22.6.0 不一致，AC-D1 沒要求修正。信心高、嚴重度低。

非本軸觀察（reviewer 轉交，不計入統計）：用舊引擎設定過、沒有 `range.json` 的既有靶場重跑時 `<from>` 比對不到且版本被重設；GitHub Pages 加自訂網域在根目錄時範本強制 `SITE_BASE=/<repo>/`，矩陣沒有列。

**等級統計：P0 0、P1 8（K-1～K-8）、P2 13（K-9～K-21）。**
