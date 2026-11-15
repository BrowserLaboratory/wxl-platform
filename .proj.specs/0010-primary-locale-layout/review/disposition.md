# Stage 3 round 1：處置 — epic 0010-primary-locale-layout

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`（審查對象為 spec blob `f45f078`、traceability blob `5d3c16c`、working tree 的 `GLOSSARY.md` blob `b307335`，HEAD `65de8c0`；三個 blob 已用 `git hash-object` 核對一致）。處置後的版本是 spec 與 traceability 的 revision 2（2026-11-15）。「已修」指 revision 2 改了 traceability（真相來源）並同步 spec；位置以 rev 2 的列號、決定或 AC 表示。「不修」附理由。一則發現提出幾個主張，就逐一回答幾個（`docs/agents/review.md` "Disposition"）。

第 1 輪四軸都沒有 P0，第 3 階段的閘門已經達成。比照 0006 的先例（其 revision 2：第 1 輪沒有 P0，第 2 輪不跑），本 epic 不跑第 2 輪，改以 revision 2 的自我檢查代替，結果寫在 traceability 的「Checks on revision 2」。

統計：76 則發現（C 20、V 25、K 15、R 16；P1 12、P2 64）。已修 74 則，其中 6 則有一個主張不修（C-12、C-17、K-12、R-11、V-7 各一，C-14 的行為面）；整則不修 2 則（C-20、R-10）。計數標準：reviewer 給了二選一的建議、處置採其中一項，算已修（沒採的那一項不是主張）；只有發現本身的某個主張沒有修，才算「有一個主張不修」。因此 K-8、R-3、R-8 改列為已修，K-7、R-2、R-12、R-15 維持已修，V-7 的殘留改列為一個主張不修（revision 2 自我檢查 SC2-07 統一標準後重算）。

## 新的決定（依使用者授權核准）

以下每一條都標為 "approved under the user's standing authorization of 2026-11-15"。revision 2 的自我檢查（traceability「Checks on revision 2」末段，RV2-01–RV2-22、SC2-01–SC2-10）就地修改了 D67、D121、D122、D124、D125、D129、D134–D141，並新增 D142；下表已同步為修改後的內容，修改的決定仍屬同一份授權。依 `docs/agents/workflow.md` 的 "Standing authorization"，每一條新增或變更的 D 編號在實作前仍要以簡短摘要給使用者確認（K-8）；traceability「Items for the user」已列出。新增前都檢查過與既有規則、AC 是否互斥，結果見 traceability「Checks on revision 2」。

| D | 決定 | 來自 |
|---|---|---|
| D122 | commit 時的驗證（`challenge-lint-staged`）和產生器的 `--staged` 一樣，從 index 讀 `range.json` 取主語系；`challenge:validate` 指令與 verify L1 仍讀 working tree | C-2、R-4 |
| D123 | 每個讀 `range.json` 的工具都先讀它，再做版面檢查與任何題目；`range.json` 不能用時以該 PL 碼首行、exit 1 結束，什麼都不寫；PL-E01–E06 一律先於 PL-E07–E10 | C-3 |
| D124 | 斷言上游自身內容的列（B14、B40、B44、B47、B48、B59、B70、B78、B79 的 smoke 部分、B81、Y1、Y22、Y55、L40、L41）只在上游執行，在靶場或 fork 以 upstream 判定跳過；每一個都經由 `tests/__helpers__/upstreamDecision.ts` 的同一個 helper 宣告（RV2-07）；上游 CI 不會悄悄跳過，靠的是 `test` job 既有的 `WXL_EXPECT_UPSTREAM` 期望檢查，smoke job 讀同一個判定，workflow 不改（RV2-06）；其他讀真實樹的測試由 `P` 與所在的樹推導期望值 | C-6 |
| D125 | 搬家的探查對每個英文說明頁的 slug，另以 `lstat` 檢查 `platform/<L>/challenge/<slug>/index.md`：本身或靶場內的上層（含 `platform` 本身）是符號連結 → `symlink`；未追蹤且被忽略 → `ignored`；失敗行點名這個說明頁路徑，以（路徑, token）去重（RV2-15、RV2-16） | C-4 |
| D126 | hook 只在語系清單上的語系資料夾的題目路徑、`_redirects`、`range.json` 觸發；`platform/public/challenge/`、`platform/shared/challenge/` 與清單外的資料夾不觸發，也不進驗證與 W4；清單由 Node 提供 | C-8、K-6、R-6 |
| D127 | 說明頁資料夾裡只有 `index.md` 是說明頁；沒有 `index.md` 的 slug 資料夾不算 slug；其他頁面是一般語系頁面；`create:challenge` 的碰撞判定仍看資料夾 | C-9 |
| D128 | 清單與首頁以外、用 `$t` 的元件，SSR 仍是 `en`，hydration 後才換成頁面語系；列入 Out of Scope，收尾開 open question | C-14 |
| D129 | `challenge.yaml` 的 YAML 解析規則：`parseDocument`（core schema、`merge: false`、`uniqueKeys: true`）之後 `doc.toJS({ maxAliasCount: 100 })`；`doc.errors`、`doc.warnings` 不為空（重複 key、語法錯誤、無法解析的 tag），或 `toJS` 丟出例外（alias 展開超量、alias 沒有先設 anchor），都是 `invalid-yaml`；`<<` 是一般 key；`yes`、`on` 是字串（RV2-11） | C-17 |
| D130 | U-§5（以及 epic 後測試的例外表）每新增一個路徑，都要使用者核准，並記在該 ticket 的 stage 6 處置表 | V-9 |
| D131 | LW1 警告在每個元件實例的 `setup` 發一次，不隨重新 render 重複 | V-10 |
| D132 | 「語系列舉」的定義：兩個以上語系代碼組成的陣列、union 或比較鏈；型別為 `Record<Locale, …>` 的語系鍵表不算 | V-12 |
| D133 | 若 stage 5 量測顯示 keygen 無法靠寫入順序或 mtime 收斂，ticket 停下由使用者決定，不在 ticket 內放寬 AC-39 | V-22 |
| D134 | T-0060 在取代它的 ticket 落地之前維持 `pending`（使用者 2026-11-06 的決定），`revisit_when` 在 stage 4 改寫為指向該 ticket；落地 `main` 後由 agent 改為 `done`，`pending_*` 與 `revisit_when` 保留作為歷史，並在 Comments 記下落地的 ticket 與日期（RV2-14） | K-12 |
| D135 | 三個 skill 在兩個 tree 的「這個 epic 的變更」相同，以 PAT6 逐張 ticket 核對（從 ticket 與 `main` 的 merge base 到 HEAD，去掉 `---`、`+++` 標頭、排除 `.agents/` 自有的 `agents/` 後，增刪行相等，RV2-09），不再要求兩個 tree 逐 byte 相同 | K-13 |
| D136 | 日後的 `en` 主語系 CI leg 用帶有自己 `range.json` 的 fixture 複本，不在上游 checkout 的根目錄放 `range.json`；理由（RV2-05 更正）：CI 裡 `GITHUB_REPOSITORY` 單獨決定 upstream 判定，根目錄的 `range.json` 不改變判定，upstream-only 列會在 `P = en` 下執行並失敗 | K-14 |
| D137 | 繁中 scaffold 內文改為 `TODO：在這裡寫說明頁內文。`（RV2-02：委託書在 GLOSSARY 標為 `_新造詞_`，靶場 commit 的 scaffold 會讓 `glossary.test.ts` 失敗；說明頁已在語料裡、不是新造詞） | K-15 |
| D138 | `P = zh-TW` 時，雙重前綴 `/zh-TW/en/x`、`/zh-TW/zh-TW/x` 在 Cloudflare 與 GitHub Pages 落點不同，與 D29 一併接受；`P = en` 沒有舊網址規則，兩種主機都落到 not-found（RV2-12）；S60 記錄 Cloudflare 的實際回應 | R-5 |
| D139 | 搬家只在 `lstat` 回報一般檔案時才讀頁面內容；符號連結不讀、報 `symlink`；FIFO 等其他種類不讀、以 UP-E11 結束。這是 0006 step 4 之後的防線（TOCTOU）：已追蹤的頁面在 run 之前就被換掉時，step 4 已以 UP-E03 結束（RV2-01） | R-7 |
| D140 | PL-E05–PL-E12 引用外部值與路徑時，與 create-wxl 的 `jsonStringifyEscaped` 相同：`JSON.stringify`，再把短跳脫 `\b`、`\f`、`\r`、`\t` 改成 `\uXXXX`（LF 保留 `\n`），DEL 與 C1 寫成 `\uXXXX`；寫不出來時印型別名稱；PL-E13–PL-E18 的路徑與 key 照舊裸印，記在 Does not protect（RV2-03、RV2-10）；站台測試拿兩者跑同一張表比對 | R-11 |
| D141 | 以 `//` 開頭的首頁連結以 PL-E12 失敗（理由 `is a protocol-relative link…`），在外部連結規則之前判定；判定順序：不是字串 → `//` → 外部（有 scheme 或 `#`，不檢查）→ 相對 → 語系前綴 → 沒有對應頁面（RV2-13） | R-14 |
| D142 | 8a 遇到讀取錯誤（UP-E11）或 git 指令失敗（CW-E14）就立即結束，已收集的失敗也不印 UP-E14 行；D96 的「每個失敗路徑都印出」只適用於以 UP-E14 結束的 run | RV2-15（revision 2 自我檢查） |

不屬於新決定、只修正措辭而不改規則的地方：D26（孤兒經 `/c/NNN` 的落點，C-18）、D44 的理由（K-5）、D105 與詞彙表的引文（C-16、K-3）、D12／AC-8 的「第一段等於」（C-11）、step 9 的 strip 路徑（C-5，D94 早已把每個 move op 列為最終 op）、S-§4.7 的回傳順序（V-21，D64 早已排序）。每一處都對照它所重述的決定檢查過。

## 處置表

### 軸 1 完整性（C）

| 發現 | 等級 | 處置 |
|---|---|---|
| C-1 | P1 | 已修。主張「L24 寫成 `description`，與 D44 衝突」：L24 改為 frontmatter `title` 與 `subtitle`，並註明 `description` 不會出現在 `header p`。主張「`subtitle` 的四種邊界沒有 row」：L24 對兩個 key 分開斷言四格（字串、空字串、缺、非字串），`subtitle` 斷言 `header p`。AC-22 同步改寫。 |
| C-2 | P1 | 已修（D122）。主張「hook 內的驗證讀哪一份 `range.json` 沒寫」：D122 規定 `challenge-lint-staged` 經 D114 的 index 讀法取 `P`（它唯一的呼叫者是 hook，`scripts/pre-commit.sh:466`）。主張「S42 可能自相矛盾」：S42 註明產生器與驗證都以 index 為準，因此不再矛盾。主張「補一個 row」：新增 S76（a）index `en`／working tree `zh-TW`、(b) 反向、(c) index 的 `range.json` 壞掉且 stage 了題目路徑。AC-31 改寫。 |
| C-3 | P1 | 已修（D123）。主張「keygen、analyze、L4、L1、lint-staged × `range.json` 各狀態沒有 row」：新增 Y107（keygen）、Y108（analyze）、Y109（verify L1、L2）、Y110（`buildPlayerPackage`），lint-staged 由 S76 (c) 涵蓋；型別×邊界總表補列。主張「`range.json` 無效與舊版面同時成立時先報哪一個沒寫」：D123 規定每個工具都先讀 `range.json`，PL-E01–E06 一律先於 PL-E07–E10；D19 的「first」改註為「讀完 `P` 之後的第一個」。AC-39、AC-40、AC-42 同步。 |
| C-4 | P1 | 已修（D125）。主張「U53 的被忽略 zh-TW 說明頁照 Discovery 找不到」：Discovery 新增一項，對每個英文說明頁的 slug 以 `lstat` 檢查翻譯說明頁路徑，未追蹤且被忽略即 `ignored`；U53 註明經由此項觸發，另新增 U153。主張「U51 的 `platform/zh-TW` 符號連結也一樣」：同一項把路徑或其上層為符號連結判為 `symlink`，U51 註明，U153 (b)(c) 斷言。主張「spec 與 traceability 對 walk 範圍說法不同」：spec 的 Upgrade 段改為「略過排除區與語系資料夾路徑，並另外檢查翻譯說明頁路徑」，與 D116、D125 一致。 |
| C-5 | P1 | 已修。主張「步驟 9 沒列 strip op 的寫入」：U-§4 step 9 改為「每個 `move`、`declare` 的 `to`，每個 `strip` 的 `path`」，Area U 覆寫合約列同步。主張「沒有 run row 驗證 strip 實際寫到磁碟」：新增 U149（老師自己題目的 zh-TW 說明頁，搬家後的位元組等於 fences、kept groups 與內文）。AC-48 同步。 |
| C-6 | P1 | 已修（D124）。主張「讀真實樹的 row 沒有用 upstream 判定做閘門」：D124 列出這些 row 並改為 upstream-only，各 row 註明；新增 B93 斷言它們在靶場與 fork 跳過、在上游執行，stage 6 檢查其他讀真實樹的測試都由 `P` 推導。主張「D54 的保證沒有 row 驗證，A-O5 說 smoke 只在上游跑」：新增 V-B7（在 F-2 這個 `P = en`、被判為靶場的複本跑 `pnpm test --run` 與 test build 的 smoke），V-U1 的 `rel` 也加跑 `pnpm test --run`；A-O5 改寫（`site-smoke` job 沒有以 repository 設條件，`quality-gates.yml:303` 只有 `fork-init-cross-os` 有）。新增 AC-61。 |
| C-7 | P2 | 已修。新增 S77（zh-TW fixture 新增 `range.json` 寫 `en`、某題缺英文說明頁 → W6a）、S78（staged 刪除 `range.json`：全有翻譯時重新指向、缺 zh-TW 說明頁時 W6a）、S79（只改 `upstream` → `_redirects` 不變）。型別×邊界總表補上 staged deletion、只改 `upstream` 與 index／working tree 不一致。AC-31 同步。 |
| C-8 | P2 | 已修（D126）。主張「glob 會命中 `platform/public/challenge/`、`platform/shared/` 與清單外資料夾」：D126 把可觀察的觸發集合限定為清單上的語系；S36、S37 改寫；新增 S80（`public/challenge/`、`shared/challenge/`、`ja`、`constructor` 只 stage 這些時為 0007 O1）。主張「對 W4 措辭與 validator pathspec 的影響沒有 row」：S80 斷言這些路徑不進驗證、不產生 W4 行。D65 加註。 |
| C-9 | P2 | 已修（D127）。主張「`deriveSlugs`、`indexTrees`、`briefFaults`、W4、D86、D84 遇到非 index 檔案的行為沒有 row」：D127 規定只有 `index.md` 是說明頁，沒有 `index.md` 的資料夾不算 slug，D84 照舊看資料夾；新增 Y111 逐一斷言（W4 那一格與 fixture 的 `P`、宣告情況由自我檢查 SC2-02、RV2-18 補上）。主張「S32 的 each with `index.md` 與 B-O10 怎麼並存」：S32 改為至少一個有 `index.md` 的 slug 資料夾，沒有 `index.md` 的資料夾忽略。AC-30、AC-42 同步。 |
| C-10 | P2 | 已修。B20 補上 `P = zh-TW` 時 `en/` 為空與不存在的兩種情況。 |
| C-11 | P2 | 已修。主張「PL-E11、PL-E12 缺段落邊界反例」：B66 補 `/english/`、`/enroll/`、`/zh-TWx/`（有對應頁面時通過、沒有時只出 `does not name a published page`），B72 補 `/english/x`、`../../enroll/x.md`、`/zh-TWx/y` 不出 PL-E11。主張「AC-8 寫字串前綴、D12 寫第一段相等」：AC-8 與 spec 的 Build 段改為「第一個路徑段等於主語系代碼」，與 D12 一致。 |
| C-12 | P2 | 已修一半。主張「沒有 row」：新增 U150（舊版面的 `platform/en.md`、`platform/zh-TW.md` 搬成 `platform/en/en.md`、`platform/en/zh-TW.md`，下一次建置以 PL-E09 列出兩者），B31 補 `en/zh-TW.md`。主張「沒有停止 token」：不修。理由：搬家依 D95 只換路徑、不改檔名；加一個停止 token 也一樣要老師改名，而 PL-E09 已經點名路徑、README 的 PL-E09 那一行說明修法；這種檔名在舊版面本身就與 `zh-TW/` 語系衝突，極少出現。 |
| C-13 | P2 | 已修。主張「非 crossing 的 moved run 會留下沒有主語系說明頁的題目」：比照 U140 的接受方式，新增 U151（新版面 `P = zh-TW` 靶場留下一份舊位置的英文說明頁 → 搬家並抽出宣告，不寫 `primaryLocale`，之後 VM10），U137 的 README 項目補上這個後果。主張「U9 寫 as U3 不清楚」：U9 改寫為完整的期望（每頁搬家、每份說明頁拆分、翻譯 strip、不寫 `primaryLocale`、之後 VM10），並補 AC-49。 |
| C-14 | P2 | 已修（D128）。主張「沒有 row，也沒有列入 Out of Scope」：D128 把清單與首頁以外元件的 SSR 字串列為範圍外，spec 的 Out of Scope 新增一項，B88 在收尾新增 open question。行為本身不修：把 T-0060 擴到每個元件是另一張票的範圍，A29 早已寫明 SSR 維持 `en`。 |
| C-15 | P2 | 已修。新增 U152（`P = zh-TW` 時刪掉 `platform/en/index.md`，fork:init 報 `A7: platform/en/index.md is missing`），AC-51 註明兩種主語系。 |
| C-16 | P2 | 已修。主張「traceability 引用的 GLOSSARY 句子與 working tree 不符」：詞彙表、D105、U-§1、Area U 覆寫列與 N17 全部改以 blob `b307335` 重新引用。主張「兩句都仍缺『靶場本身還在舊版面』」：設定紀錄的「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」中「而搬家」已表示靶場被搬（D91：只有含舊版面頁面的靶場才會被搬），因此判定已符合 D105；搬家詞條的「經由升級搬家、而且還沒記主語系的靶場記成英文」沒有 crossing 條件，維持「D105 取代它，直到 B90 落地」。 |
| C-17 | P2 | 已修一半（D129）。主張「重複 key、錨點／別名、`<<`、YAML 1.1、自訂 tag 沒有 row」：D129 規定解析選項與錯誤、警告的處理，新增 Y112，AC-35 同步。主張「根目錄與 create-wxl 的 `yaml` 版本可能不同」：不修。理由：create-wxl 的 `yaml` 只用來拆分與比對 UP-A16，站台的 `yaml` 用來驗證；兩者都是 2.x core schema，差異最多表現為一行 UP-A16 報告，不影響建置結果；對齊版本是跨套件的相依管理，不屬本 epic。主張「gray-matter 與 `yaml` 的 key 集合是否一致」：已修（SC2-10 補完回答）。VitePress 用 gray-matter，底層是 js-yaml 3 的 `safeLoad`，會展開 `<<`；`yaml` 以 `merge: false` 把 `<<` 當一般 key。這是兩個 parser 唯一會讓 key 集合不同的語法；brief 只允許 title、description、layout，其他任何 key 在 validate 都出 VM6，所以不論哪一邊多出或合併出 key，CI 都會擋下（`<<` 本身以 VM6 點名）。重複 key 在兩邊都是錯誤，validate 出 VM15。錨點與 alias 只產生值、不改變 key 集合；YAML 1.1 形式（`yes`、`on`）只影響值。D129 寫明，Y112 補上重複 key 的 brief。 |
| C-18 | P2 | 已修（措辭）。D26 補一句：該子句說的是主語系頁面的落點；孤兒經 `/c/NNN`（只有 `--no-verify` 才產生）落在翻譯頁，依 D26 第一句寫入 `T`。A9 補這個案例。 |
| C-19 | P2 | 已修。「VM11 is retired」一行移到表格之後，PL-E13–E18 與 KG1–PP1 重新接回同一張表；同表新增 GD1。 |
| C-20 | P2 | 不修。理由：老師手動搬家時漏了 B84 的步驟 7，與刻意採用 R17 的繁中預設，從升級端看不出差別（Q12 保留老師的值，沒有值就是 R17 的 `zh-TW`）；B84 的步驟 7 與 V-U5 已寫明「沒有 key 的 fork 根目錄會變成繁中」，B89 也列入 release note。reviewer 也註明這是 D105 的取捨。 |

### 軸 2 可驗證性（V）

| 發現 | 等級 | 處置 |
|---|---|---|
| V-1 | P1 | 已修。新增固定清單「Literal patterns (PAT1–PAT5)」，把 B18、A28、VA4、L18、L36、S30 的指令與 regex 移到表格外的 fenced code block；`[|]` 表示字面管線、裸 `|` 表示 ERE alternation，`\s` 改為 `[[:space:]]`。各 row 改為引用 PAT 編號。AC-2、AC-16、AC-23、AC-30、AC-56 的判準因而只剩一種讀法。 |
| V-2 | P1 | 已修。主張「(c) 與 B84 step 1 互相矛盾」：(c) 改為先 checkout A 在 `platform/` 以外的每個路徑，再 checkout `platform/shared/` 與 `platform/public/`，以此取代 step 1，然後照字面做 step 2–8。主張「漏了 `platform/shared/`」：(c) 與 B84 step 1 的括號都補上 `platform/shared/`、`platform/public/`、`package.json`、`pnpm-lock.yaml`。AC-60 同步。 |
| V-3 | P2 | 已修。B61 的 stage 8 指向改為 V-B3（base `/`）與 V-B4（base `/<repo>/`）。 |
| V-4 | P2 | 已修。V-B3 的介面改為「F-1 的 Cloudflare Pages preview（`stage8/<ticket-id>`）」。 |
| V-5 | P2 | 已修。Y93 與 V-Y7 限定為 `wasmModule`、`app`、`flag` 的值與每個 `source_files` 項目，以子字串比對；`number`、`category` 這類短值不比；AC-42 同步。 |
| V-6 | P2 | 已修。主張「沒說要不要去尾端換行」：Y106 規定比對前去掉至多一個尾端 LF 或 CRLF。主張「沒說相等還是包含」：改為任何深度的 scalar（含列表元素）都不得包含 flag 子字串；spec 的 Trust Boundaries 段與 traceability Area Y 信任邊界同步。主張「AC-37 的 no flag exposure 比 Y106 廣」：AC-37 改為「Y106 的兩項檢查成立」。 |
| V-7 | P2 | 已修一半（SC2-07 依統一標準改列）。A34 加上不得出現的字詞；A36 把「the other locale」改為只能出現在引用 D33 的註解，並以 `git grep` 列出供 stage 6 核對；S64（S65–S68 沿用）改為「每段註解引用它所述的 D 編號」加上禁用字串清單；S72 改為三項可逐句判定的條件；U137 改為「清單項目在兩種語言都存在」；LH2 改為「用了主語系就同時移除 `_新造詞_`，以 `glossary.test.ts` 判定」（K-1）。B86 的內容清單已逐項列出，維持。不修的部分：B86、U137 與文件散文「是否為真」仍要人讀，最終由使用者在 stage 6 審閱（與 D51 參考頁的做法相同）；理由：這些是說明文字，逐句列出必須與不得出現的字詞會把文件寫死，而這不是一律判 P0 的字眼。 |
| V-8 | P2 | 已修。U135 拆成三個條件，每個條件都要出現在同一句裡（「從舊版面的上游版本升級」、「搬家」或「還在舊版面」、「還沒有記主語系」或「還沒記主語系」）；AC-54 同步。 |
| V-9 | P2 | 已修（D130）。U-§5 與 D108 的例外表每新增一個路徑都要使用者核准，並記在該 ticket 的 stage 6 處置表；AC-53 同步。 |
| V-10 | P2 | 已修（D131）。LW1 改為每個元件實例在 `setup` 發一次；L45 加上強制重新 render 後仍只一次的斷言；D40、L-§4.4、AC-22 同步。 |
| V-11 | P2 | 已修。A22 改為「測試逐一走過 `LOCALES`，任何成員缺 label key 即失敗」，並比照 A31 在 stage 6 暫時加入第三個代碼驗證一次；AC-14 同步。 |
| V-12 | P2 | 已修（D132）。定義「語系列舉」；PAT1 加上陣列樣式，並以第三條指令列出以 `'zh-TW'` 為 key 的物件，由 stage 6 確認都宣告為 `Record<Locale, …>`；B18、AC-2 同步。 |
| V-13 | P2 | 已修。B14 刪掉「以參數呼叫 `readPrimaryLocale`」這種需要 spy 的寫法（revision 2 原本仍留著開頭那句，自我檢查 SC2-01 改為「出貨值只取決於根目錄的 `range.json`」），改為可觀察的 fixture：根目錄 `range.json` 寫 `en`、`platform/` 與 `.vitepress/` 底下的 `range.json` 寫 `zh-TW`，出貨值為 `"en"`；AC-1 同步。 |
| V-14 | P2 | 已修。V-Y5 補上：當 Y55 移到這裡時，執行 `pnpm challenge:keygen --force` 並以 `git diff --exit-code -- platform/challenge/` 確認與 Y-§2.4 逐位元組相同。 |
| V-15 | P2 | 已修。V-Y6 列出 selected-excerpts 的全部 10 個 `source_files`（取自 Y-§2.4），與 Y51 一致。 |
| V-16 | P2 | 已修。VL1 改為記錄 CS1–CS9 每一項文字，VL2 才有完整基準可比。 |
| V-17 | P2 | 已修。VL9 指名：static HTML 以終端機 `curl -s` 取得，hydrated 在 Browser panel 觀察。 |
| V-18 | P2 | 已修。主張「15 次觀察只有一次寫明期望值」：V-S3 依 D24–D30、D58、D59 與 0008 L1、C9 推導出 5 個網址 × 3 種偏好的落點、提示列與之後儲存的值，逐格寫入，其他觀察即失敗。主張「R21 只在未 commit 的筆記裡」：期望值改由 spec 內的 D 編號推導，不再引用 R21 原文。 |
| V-19 | P2 | 已修。V-U4 (b) 接受兩種結果並記錄是哪一種：PL-E08 列出 `platform/guide/teacher.md`，或 git 的目錄改名偵測已把它移到 `platform/en/guide/teacher.md`；判定的部分是照 README 步驟後建置成功。AC-60 同步。 |
| V-20 | P2 | 已修。V-B5 的樹改為 `65de8c0` 加上本 epic 的 `.vitepress/`、`scripts/`、`platform/shared/` 與 `package.json`。 |
| V-21 | P2 | 已修（措辭）。S-§4.7 寫明 `briefFaults` 依 D64 的順序回傳（slug、W6a–W6d 對應的種類、`present`），測試以 `toEqual` 比對順序；AC-30 同步。 |
| V-22 | P2 | 已修（D133）。量測顯示無法收斂時，ticket 停下由使用者決定；Y-O5、AC-39 同步。 |
| V-23 | P2 | 已修。AC-8 改為「解析到該資料夾的頁面（B73）」；AC-30 改為「shadow 檢查把 splat 視為遮蔽其後每一條 `/zh-TW/` 規則，結果為空（S31）」；AC-22 改為「搜尋、篩選、排序與 solved badge 的既有案例在新網址下通過（L31）」。 |
| V-24 | P2 | 已修。Y-§2.5 新增 GD1，固定兩語系守衛的訊息字串；A31、AC-17、Testing Decisions 的訊息清單同步。 |
| V-25 | P2 | 已修。見 C-19。 |

### 軸 3 契約衝突（K）

| 發現 | 等級 | 處置 |
|---|---|---|
| K-1 | P1 | 已修。B90 新增規則：本 epic 開始寫進語料（`glossary.test.ts` 的語料：`README.md`、`CONTRIBUTE.md`、`AGENTS.md`、`platform/**/*.md`、`zh-TW.json`）的每個 `_新造詞_` 用語，在同一個 change 移除 `_新造詞_` 行與「此前只出現在…」的說法；至少語系資料夾（B84 標題、PL-E08）與題目宣告（Y100、LH1），主語系、語系清單、舊版面、搬家、委託書用到時亦同。B90 的判準改為 switch 與 upgrade 兩張票的 commit 上 `glossary.test.ts` 都通過；LH2 的出口改為同一規則。 |
| K-2 | P1 | 已修。B90 加上兩項：主語系【已為假的舊說法】的「他看到的就是主語系」改為「他看到的是他打開的那個網址的語系」；語系偏好定義句同樣改寫。A37 與 AC-19 加上「不得說沒有偏好的學習者看到主語系」。 |
| K-3 | P2 | 已修。主張「spec 引用的原句已不在 working tree」：見 C-16，以 blob `b307335` 重新引用。主張「搬家詞條仍與 D105 矛盾」：Vocabulary、D105、U-§1、Area U 覆寫列與 N17 改為精確點名搬家那一句，設定紀錄那一句標為已符合 D105。主張「BC18 的句子也已改寫」：BC18 的 Where 欄註明三句在 working tree 都已改寫，stage 6 確認它們隨 B90 原樣落地。 |
| K-4 | P2 | 已修。0010-S51、F-3、V-U1、V-U4 的指令改為 `npx --yes --package <tarball> create-wxl …`（依 `docs/agents/platform-notes.md:68-69`）。「Checks on revision 1」的 SC-12 行是歷史紀錄，保留原文。 |
| K-5 | P2 | 已修（措辭）。值維持 `網站攻防挑戰`（`zh-TW.json` 已有 5 處「挑戰」，搬進去不會讓測試失敗）；D44 的理由改為「h1 與副標題不新增帶挑戰的介面字串」，並註明 D42 搬入的這個既有字串歸 L-O3；LH3 同步；B88 的「挑戰」open question 點名 `challenge_list.default_title`；spec 的 Out of Scope 同步。 |
| K-6 | P2 | 已修（D126）。見 C-8；S36 改為與修訂後的 0007 watched trees 一致。 |
| K-7 | P2 | 已修。B87 的 consequence 2 註記加列三個例外：raw HTML 連結、元件產生的連結（TB2、B76），以及翻譯語系的 nav／sidebar 連結（D8 加前綴但不比對 page list，缺頁時經 not-found 導到主語系頁）。不採「比照 PL-E12 檢查 nav／sidebar」：那會讓刪掉某翻譯頁的靶場建置失敗，與 D20（翻譯可選）衝突。 |
| K-8 | P2 | 已修（採建議的第二個做法；SC2-07 依統一標準改列）。主張「標成已核准與 workflow.md 不符」：標記維持（這是這一輪的指定做法，標記代表 spec 層的核准），但 traceability 開頭、spec 的 Status 與「Items for the user」都加上：依 `docs/agents/workflow.md`，每一條新增或變更的 D 編號在實作前仍要以摘要給使用者確認。主張「stage 5 可能跳過逐條確認」：已以上述文字封住，並要求 stage 4 的拆票逐票列出要確認的 D 編號。建議的第一個做法（改成「pending user confirmation」）未採：標記代表 spec 層的核准，逐條確認由上述文字保證。 |
| K-9 | P2 | 已修。B90 改為：設定紀錄與搬家中描述升級寫入 `en` 的句子（U135）跟著搬家的 ticket（T4）落地，其餘跟著 T1；T1、T4 的 ticket 限制同步。 |
| K-10 | P2 | 已修。B90 的語系偏好 _Avoid_ 改為「以為在同一個分頁裡跟著站內連結走也會改變它」，並說明另開分頁、重新載入等整頁載入翻譯頁也會寫入；spec 的 User Story 12 改為「in the same tab」。 |
| K-11 | P2 | 已修。S71 的建議句與 B90 的短連結項目都補上「題目沒有主語系說明頁時，開它唯一存在的那一頁」（D58 的第三個後備）。 |
| K-12 | P2 | 已修一半（D134）。主張「被取代的 T-0060 用 `pending` 不合 tracker」：D134 規定取代它的 ticket 落地前維持 `pending`、`revisit_when` 指向該 ticket，落地時由 agent 改為 `done` 並留言，`pending_*` 欄位保留作為歷史（自我檢查 RV2-14 修正了「不留在 pending」的字面衝突），D55 同步。主張「被 stage 4 拒絕的 ticket 用 `pending`」：不修。理由：拒絕由使用者在 stage 4 核准拆票時決定，正是 tracker 定義的「deliberately paused, the user's decision, recorded」，並附 `revisit_when`。 |
| K-13 | P2 | 已修（D135）。D88 與 AC-43 改為「本 epic 對每個 skill 檔的變更在兩個 tree 相同」，判準是 PAT6 的指令（自我檢查 RV2-09 補上 base 與標頭處理）。目前兩個 tree 共有的檔案以 `cmp` 核對為逐 byte 相同（`.agents/` 另有自己的 `agents/` 資料夾），所以這個 epic 內不會變寬。 |
| K-14 | P2 | 已修（D136）。D21 的延後設計改為 fixture 複本；B88 的 `en` CI open question 記下做法；B-O2 同步。reviewer 的前提「upstream-only 測試會被跳過」在 CI 不成立（`GITHUB_REPOSITORY` 單獨決定判定），實際後果是那些列在 `P = en` 下執行並失敗；結論相同，D136 的理由已依此更正（RV2-05）。 |
| K-15 | P2 | 已修（D137）。繁中 scaffold 內文改為 `TODO：在這裡寫說明頁內文。`（reviewer 的第二個建議）；D83、Y78、Y-§2.4 的 scaffold 範例同步。revision 2 原本採「委託書」，自我檢查 RV2-02 發現委託書是 `_新造詞_`，靶場 commit 的 scaffold 會讓 `glossary.test.ts` 失敗，因此改用不在新造詞清單上的說明頁。 |

### 軸 4 紅隊（R）

| 發現 | 等級 | 處置 |
|---|---|---|
| R-1 | P1 | 已修。S61 的輸入補上 `%2f%2f`、`%2F/`、`%252F%252F`、`%5C%5C`、`%5C/`、`%09/`、`%0A/`、`%0D/` 與 raw 的 `\/`，驗證方式維持 `new URL(location, previewOrigin).origin`；AC-58 同步。 |
| R-2 | P2 | 已修。B88 新增 open question：Cloudflare 改變 redirect 處理時重新驗 S61；TB-S1 與 spec 的 TB5 寫明這項安全性建立在 S61 一次觀察到的正規化上。不排定期重驗：本 epic 沒有排程機制，open question 是既有的追蹤管道。 |
| R-3 | P2 | 已修（記錄）。TB-S1 與 spec 的 TB5 記下：這條規則會寫進每一個繁中主語系靶場，包括從未發出 `/zh-TW/…` 網址的新靶場，屬已接受的後果；S61 判的是規則本身。只在上游或升級上來的靶場產生這條規則的建議：不修，因為那要改 R22，R22 是 stage 1 的決定，本輪不重開。 |
| R-4 | P1 | 已修（D122）。見 C-2。兩個方向都有 row：S76 (a)（index `en`、working tree `zh-TW`，O2 而非 VM10）與 (b)（index `zh-TW`、working tree `en`，由驗證以 VM10 擋下，不出 W6 行，符合 AC-31）。 |
| R-5 | P2 | 已修（D138）。`P = zh-TW` 時雙重前綴在兩種主機上的落點差異明示接受（`P = en` 沒有舊網址規則，兩種主機相同，RV2-12）；S60 記錄 Cloudflare 對 `/zh-TW/en/guide/notes`、`/zh-TW/zh-TW/guide/notes` 的回應；spec 的 Learner arrival 段同步。 |
| R-6 | P2 | 已修（D126）。主張「glob 比每個語系資料夾寬」：見 C-8。主張「S36 與 AC-31 互相矛盾」：S36 改為只列清單上的語系，與 AC-31 一致。主張「W4b 的 `<L-name>` 可能是 `undefined` 或函式字串」：清單外的路徑不進 W4，S80 斷言沒有含 `undefined` 或函式文字的 W4b 行。 |
| R-7 | P2 | 已修（D139）。8a 在 `lstat` 回報一般檔案後才讀；符號連結不讀、報 `symlink`；FIFO 等不讀、以 UP-E11 結束；Discovery、step 8、信任邊界 B4 與 spec 的 TB11 同步；新增 U154。自我檢查 RV2-01：已追蹤頁面在 run 之前被換成 FIFO 或連結時，0006 step 4 先以 UP-E03 結束，所以 D139 是 step 4 之後的防線，U154 改以包裝過的 `deps.fs` 模擬，並補一格真實 FIFO 得到 UP-E03。 |
| R-8 | P2 | 已修（記錄）。traceability Area Y 信任邊界與 spec 的 TB2 寫明：`challenge.yaml` 的每個 key，包括 VitePress 頁面 key，會作用到每個語系頁，寫入它的族群與以前寫說明頁的相同。denylist 不修：D74 刻意讓宣告端開放，搬家會把老師說明頁裡的自訂 key（包括 `head`）搬進 `challenge.yaml`，denylist 會讓這些靶場建置失敗。 |
| R-9 | P2 | 已修。新增 Y113：`challenge.yaml` 帶 `__proto__` 與 `constructor` 時，組裝結果是 own property、原型不變、`({}).polluted` 仍為 `undefined`，清單 loader 亦同；AC-37 同步。 |
| R-10 | P2 | 不修。理由：照 B84 手動搬家的第一步就是 merge 該版本，之後下一次升級的 base 就是新版面的版本，不會是 crossing run；要讓這個情境成立，必須給出比已 merge 版本更舊的 `upstream` 或 `--from`，而這正是信任邊界 B3 已接受的「錯誤的 `--from` 決定是否寫入 `en`」。改 D105 的條件會讓 GLOSSARY 的三個條件句不再成立，得不償失。 |
| R-11 | P2 | 已修一半（D140）。主張「DEL、C1 沒有跳脫」：站台端的引用改為與 create-wxl 的 `jsonStringifyEscaped` 相同（函式的完整行為見 D140，RV2-10），新增 B95 比對兩者；PL-E13–PL-E18 的路徑與 key 照舊裸印，記在 B-T2 與 TB2 的 Does not protect（RV2-03）；「Build error codes」說明、B-T1、spec 的 TB1 同步。主張「bidi 字元沒有跳脫」：不修。理由：create-wxl 的 `jsonValue`／`jsonStringifyEscaped` 也不跳脫 bidi，這是 0005 既定的規則；只在站台端加會讓兩邊不一致，要改應在兩邊一起改。TB1 的 Does not protect 欄已寫明。 |
| R-12 | P2 | 已修。B84 的 `smoke-fixtures/` 保留名稱項目補上：被手動或升級搬進 `smoke-fixtures/` 的頁面不會被正式建置發布（舊版面的 `platform/smoke-fixtures/x.md` 會變成 `platform/en/smoke-fixtures/x.md`）。不加 attention code：這個資料夾名稱是本 epic 才引入的，舊版面的老師頁面恰好用到的機率極低，README 一句即可。 |
| R-13 | P2 | 已修。S60 在 F-1 加一個 `platform/public/zh-TW/stage8.txt`（F-1 的 fixture 定義與 V-S1 的期望欄已同步，SC2-06），記錄 `/zh-TW/stage8.txt` 被服務還是被導走；S69 的 README 段補上「Cloudflare 上 `platform/public/zh-TW/` 的檔案也會被這條規則導走」（S-O7 原本宣稱 S69 已寫，實際沒有，已更正）。 |
| R-14 | P2 | 已修（D141）。`//` 開頭的首頁連結以 PL-E12 失敗；新增 B94；PL-E12 的 reason 清單、When 欄與判定順序（RV2-13、SC2-09）、spec 的 Build 段與 TB2、AC-7 同步。 |
| R-15 | P2 | 已修（記錄）。B-O8 改為「網址以短連結形式（`/c/`、`/<L>/c/`、`/zh/c/`）開頭的頁面，不論放在哪個語系資料夾都會被規則遮蔽」，並點名 `P = zh-TW` 時的 `platform/zh-TW/zh/c/…`；spec 的 Out of Scope 同步。不讓 PL-E09 把 `zh` 當保留名稱：這是既有行為，不屬本 epic。 |
| R-16 | P2 | 已修（記錄）。traceability B-T1 與 spec 的 TB1 在 Does not protect 欄寫明：版面檢查不看排除區內部，`platform/challenge/<slug>/src` 或 `platform/public/` 底下的符號連結會照舊被 keygen 與 Vite 的複製跟隨（本 epic 之前就存在）。 |

## 新增表面的自我檢查

revision 2 新增的規則（D122–D141、PAT1–PAT5、GD1）與列（B93–B95、S76–S80、Y107–Y113、U149–U154、V-B7）、新 AC（AC-61），以及改寫的列與 AC，都已逐項檢查互斥並自我檢查（surface、AC、contracts 三個視角，以第 1 輪的凍結 prompt 為審查深度基準），結果寫在 traceability 的「Checks on revision 2」：每個新列都接到 AC 索引，每個新 D 都有列或 AC 引用，新列的欄數與所在表格一致，舊字串（「在這裡寫題目說明」、"once per render"、"byte-identical per skill file"、`npx --yes <tarball>`）已不在任何現行列中，表格內已沒有指令或 regex 的 `\|`。與先前分析矛盾之處只有兩個：revision 1 引用的 GLOSSARY 句子已不在 working tree（已改引 `b307335`），以及 S-O7 誤稱 S69 已提到 `platform/public/zh-TW/`（已補上）。

revision 2 之後又跑了一輪自我檢查（新增表面、處置兩個視角，審查深度同上），提出 32 則（RV2-01–RV2-22、SC2-01–SC2-10；P1 3 則、P2 29 則）。處置逐則寫在 traceability「Checks on revision 2」末段的表格：已修 32 則，其中 1 則有一個主張不修（RV2-16：不另加 `platform` 本身是符號連結的 U153 case，理由是那時 git 不追蹤它底下的任何頁面，D125 沒有路徑可查）；整則不修 0 則。這一輪就地修改 D67、D121、D122、D124、D125、D129、D134–D141，新增 D142 與 PAT6，新增前都檢查過與既有規則、AC 是否互斥。與先前分析矛盾、已更正的地方有兩個：D136 原本的理由（RV2-05）與 D137 互斥檢查中「委託書只有在文件引用時才進語料」的說法（RV2-02）。
