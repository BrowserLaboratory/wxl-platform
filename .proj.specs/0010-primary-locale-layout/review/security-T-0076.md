# Stage 7 安全審查：T-0076（純模組與版面搬移 planner）

> 這是 T-0076 實作完成後的 stage 7 報告。實作前只審 spec 文字的預檢在 `security-T-0076-spec.md`（其 F-1 已採納為 D144），兩份不要混用。

## 範圍

- worktree：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0076/pure-modules-and-layout-move-planner`
- base（要求的 `main`）：`65de8c04562043e77bd498216cc41368e9a5eda5`
- merge-base：`65de8c04562043e77bd498216cc41368e9a5eda5`（與 base 相同）
- HEAD：`a2ac5b66af2cf129d3092852a213618914593681`
- 擷取日期：2026-11-15。擷取後重查過 HEAD 與 `git status --porcelain=v1 -uall`（21 筆），兩者都沒變；packet 的 `final-modified/` 與 `untracked/` 副本和 checkout 逐檔比對相同（`cmp`）。

| 層 | 內容 | 是否含程式碼 |
|---|---|---|
| committed（`65de8c0..a2ac5b6`） | 1 個 commit（`a2ac5b6`）：epic 0010 的 spec、traceability、review、tickets 與 GLOSSARY，21 檔，+7279/−14 | 只有文件 |
| staged | 空的 | — |
| unstaged（`git diff`） | 6 個 tracked 檔，+550/−78：`.vitepress/challenge/config.ts`（+81）、`tests/unit/challenge/config.test.ts`（+134/−1），以及 `spec.zh-TW.md`、`traceability.md`、T-0076 ticket、`GLOSSARY.md`（stage 6 已還原成 `65de8c0` 的內容） | 是 |
| untracked | 15 個新檔，全為文字檔 | 是 |

受審的產品程式碼：

- `create-wxl/src/layout-move.mjs`（`planLayoutMove`）
- `.vitepress/locales.ts`、`.vitepress/primary-locale.ts`、`.vitepress/layout-error.ts`、`.vitepress/source-layout.ts`
- `.vitepress/challenge/declaration.ts`（`readChallengeDeclaration`）
- `.vitepress/challenge/config.ts` 新增的 `validateChallengeDeclaration`

測試、fixture（`create-wxl/test/fixtures/layout-move/door-is-open/`，裡面沒有 flag）與文件當作脈絡閱讀。依 ticket 與 stage 6 的 S4a，這些模組目前**只有測試會 import**，網站、pre-commit hook 與 upgrade 都還沒接上；接上分別是 T-0077（build）與 T-0081（`range:upgrade`）的工作。

## 方法

依專案 `.claude/skills/security-review/SKILL.md` 與上游方法論 `references/upstream-security-review.md`，以 spec 0010 的信任邊界 TB1–TB11（`spec.en.md:366-378`）與 traceability 的 Area U 為準。依 ADR-0005：本 epic 沒有題目刻意保留的弱點，所有候選都照一般缺陷分級。

| 階段 | 執行者 | 內容 |
|---|---|---|
| 第一關：找候選 | 一位候選審查者 | 列出全部 16 個候選，不自行判斷是否誤報 |
| 第二關：判斷誤報 | 每個候選各一位獨立審查者，共 16 位 | 逐項沿信任邊界追到可觀察的影響，並對照 spec 與方法論的排除條款 |

所有結論都來自讀程式碼（含 `yaml@2.9.0` 的原始碼），**沒有執行任何重現**，也沒有在終端機實測控制序列。Git 結果由 parent 擷取，審查者都只讀不改。

## 結論

**1 項成立（Low），15 項駁回。**

- 成立的 SR-1 是**潛在的契約缺陷**：它直接違反 D144 的明文契約，但目前沒有正式呼叫端，要等 T-0081 或 T-0077 接上才會實際觸發。依上游方法論的回報門檻（HIGH／MEDIUM、信心 ≥ 0.8）它不夠格；因為它違反的是本 epic 為安全而訂的決策，比照實作前預檢的 F-1 列為成立，要不要降成紀錄項目由使用者決定。
- 駁回的 15 項中，有幾項底層行為屬實但不構成安全漏洞，已整理成「交給後續 ticket 的追蹤項」與「非安全觀察」，留給使用者裁決。

## 成立的發現

### SR-1：集合型 key 讓 `yaml` 在 `toJS` 時自己寫 stderr，繞過 D144（候選 C1）

| 欄位 | 內容 |
|---|---|
| 位置 | `create-wxl/src/layout-move.mjs:83-86`（`parseStrict`：檢查 `doc.errors`／`doc.warnings` 後直接 `doc.toJS`）；`.vitepress/challenge/declaration.ts:17-18` |
| 嚴重度 | Low（潛在：目前沒有正式呼叫端） |
| 類別 | terminal output injection／違反 D144 契約 |
| 信心 | 0.85 |
| 攻擊者前提 | upgrade 端（主要）：讓老師用 `--from <commit>` 指向攻擊者準備的 legacy commit（TB10，真正新增的路徑）；或是 co-teacher／被合併的 PR 把說明頁前置資料放進老師的靶場（這群人本來就能改 `package.json` scripts，多出來的只有隱蔽性）。之後老師在終端機跑 `range:upgrade`（T-0081 接上後）。build 端要等 T-0077 接上 `readChallengeDeclaration`。 |

**資料流**

1. 前置資料某行的 key 是集合，例如頂層 `[x]: 1`、巢狀 `tags:\n  [x]: 1`，或明確 key `? [x]`；指向集合的 Alias key（`*a`）同理。
2. `parseDocument` 不會為這種 key 產生 error 或 warning：`compose/resolve-block-map.js:30-36` 只對 block-seq 當 key 報 `BLOCK_AS_IMPLICIT_KEY`；`compose-node.js:55-62` 的 `NON_STRING_KEY` 只在 `stringKeys` 開啟時檢查，D110／D129 的選項沒有開。所以 D144 依賴的「有 warning 就算失敗」檢查放行。
3. `doc.toJS()`：`Document.js:293-301` 每次都建立新的 ctx（`mapKeyWarned: false`），`nodes/addPairToJSMap.js:39-61` 遇到物件 key 就無條件呼叫 `log.warn`，`log.js:9-12` 再呼叫 `process.emitWarning`，Node 預設 handler 把訊息寫到 stderr。
4. `parseStrict` 對同一份前置資料會呼叫好幾次（`layout-move.mjs:198` 全文、`:208` 每個 group、`:229`／`:237` 合併後的 kept／declaration group），翻譯說明頁在 `:350` 再走一輪，所以同一則警告會印 3 次以上。
5. 搬移本身會成功：字串化後的 key 在全文與 group 兩邊相同，`deepEqual` 相等，這一行被歸進 declaration group，原始位元組由 `:272` 寫進 `challenge.yaml`；翻譯說明頁的 `mismatches.key`（`:362`）也會帶著字串化的 key。

**影響**

- 違反 D144（`traceability.md:3393`）「The planner never lets `yaml` write to the terminal」，也和 TB11 的「outside values are escaped」相衝。
- 跳脫範圍（修正候選原本「JSON.stringify 會跳脫 C0」的說法）：key 含控制字元時，`stringify/stringifyString.js:307` 強制改成雙引號，交給 `doubleQuotedString`（`:32-121`），ESC 變成 `\e`、再被外層 JSON 跳成 `\\e`，所以 **C0 有被擋住**；但 `JSON.stringify` 不跳脫 DEL（0x7f）與 C1（0x80–0x9f），兩層 stringify 之後仍是原始字元。payload 可以寫成雙引號跳脫 `"\x9b"`，不需要原始 C1 位元組，過得了 SC1。截斷規則（`addPairToJSMap.js:55-56`，36 字元）扣掉前綴後大約剩 30 字元可控。
- 實際效果（推論，未實測）：多數 UTF-8 終端機（VTE、iTerm2、kitty、Windows Terminal）不會把 UTF-8 編碼的 U+0080–U+009F 當成 8-bit C1 控制碼，xterm 的部分設定可能會。所以主要是 DEL／C1 未跳脫，加上一段約 30 字元的偽造文字。bidi 字元也能通過，但 TB1 已明文不保護，不計入本項影響。
- build 端影響應下修：TB2 的「Does not protect」已接受 PL-E13–PL-E18 原樣印出前置資料 key；`main` 上的 `scripts/challenge-validate.ts:86`、`challenge-numbers.ts:59` 本來就用預設 logLevel 的 `parse`，同類警告現在就會出現（只讀到呼叫行，沒有追 toJS 路徑）。宣告寫進 `challenge.yaml` 後每次 build 會再印一次（D74／D129 讓未知 key 放行），但這在 build 端不是新的風險類別。
- 不會執行程式碼，也不影響機密性。

**證據**

- 讀碼確認：`layout-move.mjs:83-86`、`:198`、`:208`、`:229`、`:237`、`:272`、`:350`、`:362`；`declaration.ts:17-18`；`yaml@2.9.0` 的 `compose/resolve-block-map.js:30-36`、`compose/compose-node.js:55-62`、`doc/Document.js:293-301`、`nodes/addPairToJSMap.js:39-61`、`log.js:9-12`、`stringify/stringifyString.js:32-121,307`。dist 中呼叫 `log.warn` 的只有 `public-api.js:71` 與 `addPairToJSMap.js:57`；`parser.js:178`、`composer.js:139` 的 `console.*` 要設 `LOG_TOKENS`／`LOG_STREAM` 環境變數才會執行，不在威脅模型內。
- 測試缺口：U25 的 spy 測試（`create-wxl/test/layout-move.test.mjs:251-285`）只涵蓋未知 tag，沒有集合 key 的案例。
- 推論、未驗證：Node 預設 warning handler 原樣寫出 message；`Document.js:37` 的預設 logLevel 為 `'warn'`（沿用預檢 F-1 的引用，這次沒有重讀）。

**補救（提案，本階段沒有改任何檔案）**

1. **建議：在 `toJS` 之前檢查 key 型別。** `parseStrict` 與 `readChallengeDeclaration` 用 `yaml` 的 `visit` 走過 `doc.contents`，只要任何一層 Pair 的 key 不是 Scalar，就當成解析失敗（create-wxl 端為 `frontmatter`，build 端為 `invalid-yaml`）。這條規則也一併擋住 Alias key。
   - 副作用：指向純量的 alias key 也會被拒絕，要在 spec 寫清楚，避免和 D129「aliases within the limit are resolved」相衝。
   - 這會改變 D110／D129 定義的失敗集合，**要先修訂 traceability**，不能只改程式碼。
2. 替代方案 `stringKeys: true`（較不建議）：會讓非字串 key 進 `doc.errors`，但 `compose-scalar.js:16-17` 在 key 位置會忽略 tag，`!foo "x": 1` 就不再產生 warning，和 D144 現有的「key 上的未知 tag → `frontmatter`」U25 案例相衝；site 與 create-wxl 兩端的選項也得一起改。
3. U25 補案例：頂層 `[x]: 1`、巢狀 `tags:\n  [x]: 1`、`? [x]`、Alias key 各一個，沿用三個 spy（`process.emitWarning`、`console.warn`、`process.stderr.write`）的斷言。T-0077 的 Y2–Y6 對 `readChallengeDeclaration` 補同樣的案例。

## 候選與處置

| # | 位置 | 類別 | 獨立判斷 | 處置與理由 |
|---|---|---|---|---|
| C1 | `layout-move.mjs:83-86`；`declaration.ts:17-18` | terminal output injection／違反 D144 | **成立**，Low（0.85） | 見 SR-1。 |
| C2 | `declaration.ts:17-19` | fail-open 的設定解析 | 不是漏洞（本票 0.8；library 行為屬實 0.95） | 駁回，轉 T-0077 追蹤。`parseDocument` 後確實不檢查 `doc.errors`／`warnings`：重複 key 照樣 push（`resolve-block-map.js:63-64,93,108`）、最後一個值勝出（`addPairToJSMap.js:34`），多份文件只取第一份（`public-api.js:46-51`）。但目前只有 `tests/unit/challenge/declaration.test.ts` 呼叫它；D110、D129、Y4、Y5、Y112（`traceability.md:169,188,2267-2268,2291`）已規定修法並指派給 T-0077（`T-0077-layout-switch.md:137`）。能 commit `challenge.yaml` 的人本來就能直接寫 `source_visible: true`，PR diff 也會顯示兩行。 |
| C3 | `declaration.ts:15-16` | 跟隨符號連結／slug 穿越 | 不是漏洞（0.85） | 駁回。目前沒有呼叫端。commit 權限已等於能改 build 腳本，`platform/public/` 的符號連結本來就會被發布（TB1 已接受），所以沒有權限提升。`platform/challenge/<slug>/challenge.yaml` 在 searched area 內，build 時 PL-E07 先於讀取觸發（`traceability.md:347,759,774`）。slug 來自目錄名稱，`readdir` 不回傳 `.`／`..`；git 存不了 FIFO。 |
| C4 | `primary-locale.ts:50,62` | lstat 與 read 分開做（TOCTOU） | 不是漏洞（0.9） | 駁回。要贏這個 race 必須是同一 OS 帳號下的程序，它本來就能直接改 `range.json` 或 build 設定；未 commit 的工作樹已明文不是邊界（`spec.en.md:368`、`traceability.md:1795`）。讀到任意 JSON 也只有 `en`／`zh-TW` 會被採用；FIFO 卡住屬方法論排除 #1（DoS）、#8（理論 race）。 |
| C5 | `layout-move.mjs:341-347,371` | 排除區翻譯說明頁擋住 upgrade | 不是漏洞（0.85） | 駁回，屬 DoS 排除條款。fail safe：停在 UP-E14、不寫入任何檔案；攻擊者沒有多出能力（TB1）。行為符合 spec 字面（`traceability.md:1328,1330,1332`），是 spec 本身的不對稱，與 stage 6 婉拒的 Spec-S16 同類。`..` 變體不可達。 |
| C6 | `layout-move.mjs:355-363` | 一般物件的繼承屬性查找 | 不是漏洞（0.85）；正確性偏差屬實（0.9） | 駁回為安全發現。R3 只印 path 與 key、不印值（`traceability.md:1533,1577`），寫入的 op 來自原始位元組，沒有 prototype pollution（`addPairToJSMap.js:26-34` 用 `defineProperty`）。正確性問題見下方 O-1。 |
| C7 | `layout-move.mjs:16-25,41-43,46-47,327` | 路徑未正規化（Windows） | 不是漏洞（0.85） | 駁回。planner 只在輸入路徑前加固定前綴，不產生新的路徑成分；B 端的 archive rule 3（`create-wxl/src/archive-rules.mjs:66-72`）在寫入前就拒絕 `\`、空段落、`.`／`..`、C0／DEL／C1；老師端由 git 的路徑規則與 RC1–RC6（`traceability.md:1374-1375,1511-1520`）擋下。T-0081 的縱深防禦建議見 T-1。 |
| C8 | `layout-move.mjs:374-380` | 大小寫／Unicode 名稱別名 | 不是漏洞（0.85） | 駁回。spec 把別名檢查分給 8a 的 RC3（`traceability.md:1517`，「every `to`」也涵蓋計畫內部別名），planner 的 `Failure` 型別本來就沒有 `alias`（`:1366`）；U55–U57 已指派給 T-0081（`tickets.md:691-693`）。本票沒有任何寫入。 |
| C9 | `layout-move.mjs:323,334` | 權限位元未遮罩 | 不是漏洞（0.9） | 駁回。schema 範例與 U20 規定 `mode` 原樣傳遞（`traceability.md:1356-1377`、ticket :151），D102 的 `& 0o777` 是寫入端（T-0081）的規則。git 存不了 setuid 位元；檔案擁有者就是執行者本人。 |
| C10 | `config.ts:151,166,192` | 錯誤訊息插入未跳脫的值 | 不是漏洞（0.85） | 駁回。寫法與既有 `validateChallengeConfig`（`:49,77,110`）逐字相同，Y-§2.5（`traceability.md:727-731`）要求訊息「kept verbatim」；目前沒有正式呼叫端；能 commit 的人本來就能改 scripts；方法論排除 #12（log spoofing）。文件缺口見 O-3。 |
| C11 | `config.ts:200-205` | 路徑欄位不受限 | 不是漏洞（0.92） | 駁回。keygen 今天讀的是 `index.md` 前置資料（`scripts/challenge-keygen.ts:602-607,660-685`），不經過新 validator；沒有權限提升；屬排除 #5、#7。候選建議「拒絕 `fs`」會違反 Y20、AC-35（`traceability.md:2288,717`）。 |
| C12 | `layout-error.ts:16-18,26-43` | bidi／零寬字元未跳脫 | 不是漏洞（0.85） | 駁回。D140（`traceability.md:199`）與 TB1 明文接受 bidi 原樣印出，實作與 `create-wxl/src/text.mjs` 一致；PL-E05／PL-E06 一定代表 build 失敗，改變不了結果。文件缺口見 O-4。 |
| C13 | `layout-move.mjs:14,222-227,255` | VitePress 頁面 key 擴散到所有語系 | 不是漏洞（0.85） | 駁回。TB2 與 D74 明文接受、round 1 的 R-8 已處置；搬家由老師在自己的靶場執行，沒有跨越信任邊界。候選對影響的描述有誤：`:357-363` 比對兩邊 key 的聯集，「英文有 `head`、翻譯沒有」也會產生 mismatch。 |
| C14 | `layout-move.mjs:293,319,352,362,371,378` | 原始字串交給 T-0081 輸出 | 不是漏洞（0.85） | 駁回為本票發現，留給 chain analysis。planner 不寫 stdout／stderr；跳脫已由 `traceability.md:1538,1570,1855`、U48、U107 與 AC-50 規定給 T-0081。候選兩處不準：R3 不印值；`legacy-brief` 的補救是說明文字，不是可複製的指令列。殘餘觀察見 T-2。 |
| C15 | `declaration.ts:16-18`；`layout-move.mjs:53-69,275-281` | DoS（FIFO、深層遞迴、O(n²)） | 不是漏洞（0.9） | 駁回，屬方法論排除 #1、#4。`parseStrict` 的 try/catch 先接住 parse 階段的遞迴例外；即使 `deepEqual` 丟出 RangeError 也是 fail closed（D93：steps 1-8 不寫入）；O(n²) 實際是毫秒等級，stage 6 的 M12 已婉拒。 |
| C16 | ticket :278；`traceability.md:3396-3397` | 文件與程式碼不一致 | 不是漏洞（0.9）；不一致屬實（0.95） | 駁回，屬排除 #16（文件類），找不到攻擊路徑；D144 已實作並有 U25 測試。文件修正見 O-5。 |

## 交給後續 ticket 的追蹤項（不是本票的發現）

| # | 交給 | 內容 | 信心 |
|---|---|---|---|
| T-1 | T-0081 | 寫入前對每個 `to`、`path` 確認 resolve 後仍在 range root 底下（類似 `git-runner.mjs:30-34` 的 `isSameOrUnder`）。P-9 遇到不存在的目的地時只看以 `/` 切出的最深既有祖先，Windows 上 `platform/en/a\..\..\x.md` 這類路徑目前靠「同一個 `from` 先被 RC3 擋下」補上（C7）。 | 0.5 |
| T-2 | T-0081 | `legacy-brief`／`orphan-brief` 補救文字裡的 `<name>`／`<slug>` 是字面佔位符還是替換成值，spec 沒講清楚；若要替換，應用 `posixQuoteWord` 或含控制字元時不印。U59／U61 補一個路徑含 ESC、C1 與 `$(...)` 的案例（C14）。 | 0.4–0.5 |
| T-3 | T-0081 | stage 7 確認 RC3 的大小寫摺疊比對涵蓋「every `to`」與宣告檔路徑、U55／U57 在 macOS／Windows CI 實際執行；base 側（`--from <commit>`）沒有 RC3，展開到暫存目錄時的大小寫碰撞值得一看（C8）。 | 低 |
| T-4 | T-0081 | U32 加一個 04755／02755 的來源，從測試面保證 D102 丟掉特殊位元；`planLayoutMove` 丟出的非預期例外對應成乾淨的停止訊息（C9、C15）。 | 0.5 |
| T-5 | T-0077 | 接上 `readChallengeDeclaration` 的同一個 change 必須讓 Y4、Y5、Y112 轉綠，否則會比現況倒退（gray-matter 的 js-yaml 目前會拒絕重複 key）；T-0077 的 stage 7 重驗這一點（C2）。 | 0.7 |
| T-6 | T-0077 | 補一個「`challenge.yaml` 本身是符號連結 → PL-E07」的 B33 案例，固定「先跑 layout check 再讀」的順序；直接呼叫 `validateChallenge(root, slug)` 的程式不跑 layout check（D19、N9、Y34），可考慮讓 `readChallengeDeclaration` 自己先 `lstat`（需 spec 修訂）（C3、C15）。 | 0.5 |

## 非安全觀察（留給使用者裁決）

| # | 位置 | 內容 | 建議 |
|---|---|---|---|
| O-1 | `layout-move.mjs:359-360` | `enDecl[key]`／`trDecl[key]` 會讀到 `Object.prototype` 上的繼承屬性：`constructor`／`toString` 只在一邊時，mismatch 的值是函式，違反 `traceability.md:1365` 的「absent = undefined」；一邊 `__proto__: {}`、另一邊沒有時，`deepEqual` 判成相等，mismatch 被吞掉，違反 `:1346` 與 AC-46／U42（C6）。 | 改成 `Object.hasOwn(enDecl, key) ? enDecl[key] : undefined`，加 `constructor`／`__proto__` 的 U42 變體測試。記成 code-review P2 或本票順手修，由使用者決定。 |
| O-2 | `declaration.ts:7-8` | 註解說「throws on a read or parse failure」，實際上只有讀檔失敗會丟例外，語法錯誤、重複 key、多份文件、未知 tag 都默默回傳 `ok: true`（C2）。 | (a) 改正註解；或 (b) 先加 `if (doc.errors.length \|\| doc.warnings.length) throw`（可能超出本票認領的 Y7、Y8）。 |
| O-3 | `spec.en.md:369`（TB2） | 「Does not protect」沒有列出搬過來的 validate／keygen 訊息（`backend`、`tools`、`source_visible`）會原樣印出 `challenge.yaml` 的值（C10）。 | 下次 spec 修訂補一句；若要跳脫，另開 ticket 同時改 Y-§2.5 與 `validateChallengeConfig`。 |
| O-4 | `spec.en.md:368`（TB1）、D140 | 只點名 bidi 格式字元，沒涵蓋零寬字元（U+200B–200D、U+2060、字串中間的 U+FEFF）與 U+2028／2029（C12）。 | 補寫成「C0、DEL、C1 以外的 Unicode 格式字元與 line／paragraph separator 原樣印出」；若要收緊，須同步改 `create-wxl/src/text.mjs` 並先修訂 D140。 |
| O-5 | ticket :278；`traceability.md:3396-3397`；`tickets.md:881` | 繁中段落的確認清單漏了 D144（英文 Context :44-45 已有）；traceability 2.1 與 tickets.md 的 T3 仍寫 T-0076 會落地 `validateChallengeBrief`／`BRIEF_KEYS`，與程式碼不符（C16；`tickets.md:881` 已列在 ticket 的 Needs decision）。 | ticket :278 補上 D144；traceability 與 tickets.md 改成和程式碼一致（屬 spec 修訂）。 |
| O-6 | `traceability.md:1330,1551` | 翻譯說明頁不要求是 page，與英文說明頁不對稱，新版 build 會忽略、upgrade 卻判 `orphan-brief`；補救訊息「Add the English brief」對排除區的情況解除不了（C5）。 | spec 修訂：translation brief 加上「且為 page」，或在 D98 明文規定排除區照樣報 orphan。 |

## 檢查

第 7 階段沒有修改受審的變更，只新增本報告並在 ticket 的 Comments 加上連結。沒有重跑測試；stage 6 修正後的結果見 ticket 的「Stage 6 review → Rerun」。

## 處置（2026-11-15，修復階段）

| 項目 | 處置 | 理由與驗證 |
|---|---|---|
| SR-1（C1） | **需要裁決，未修復** | 本報告自己的補救提案（在 `toJS` 之前用 `visit` 拒絕非 Scalar key）會把 D110／D129 定義的失敗集合由三種（`doc.errors`、`doc.warnings`、`toJS` 例外）擴大成第四種，報告原文已明講「要先修訂 traceability，不能只改程式碼」——屬 spec 變更，超出本次修復執行的範圍（hard rule 2；`docs/agents/issue-tracker.md` 把 prose／決策文字的修訂保留給專門的修訂輪，ticket 的 Stage 6 review 對 `spec.en.md` 版號這條「needs decision」列已採同一理由）。 |

**本次額外查證、未套用的替代修法。** 讀 `yaml@2.9.0` 原始碼（`dist/doc/Document.js:30-44`、
`dist/nodes/addPairToJSMap.js:39-61`、`dist/log.js:9-16`、`dist/compose/composer.js:65-71,101-103`、
`dist/compose/util-map-includes.js:1-13`、`dist/public-api.js:40-59,60-79`）確認：`parseStrict`／
`readChallengeDeclaration` 的呼叫路徑（`parseDocument` + 另外手動呼叫 `toJS`，D110 所述）裡，唯一
會寫終端機的呼叫點是 `addPairToJSMap.js:57` 的 `log.warn(ctx.doc.options.logLevel, …)`，只由
`doc.options.logLevel` 一個開關控制；`doc.errors`／`doc.warnings` 由 `composer.js` 的 `onError`
無條件寫入（不管 `logLevel`），`uniqueKeys` 的重複 key 偵測（`util-map-includes.js`）也只看
`uniqueKeys` 選項，與 `logLevel` 無關。D144 文字裡「`logLevel: 'silent'` 會清空 `doc.errors`」的說
法，只對 `yaml` 自己的 `parse()` 便利函式成立（`public-api.js:72-77` 的 `doc.errors = []`）——
`parseStrict` 與 `readChallengeDeclaration` 都不呼叫 `parse()`。所以把 `logLevel: 'silent'` 傳給
`parseDocument`，理論上可以只擋掉 SR-1 這一則 stderr 寫入，不移動任何一筆 `ok: true`／`ok: false`
的判定，是比報告原提案更小、不改失敗語意的候選。但套用它仍需修正 D144 現有文字（目前的說法對這條呼叫
路徑不成立）與 D110 的選項清單，一樣落在「需要裁決」之內，本階段沒有套用，留給下一次 traceability 修
訂輪連同上面那一項一起處理。

**驗證：沒有程式碼變更。** `git rev-parse HEAD` 仍是 `a2ac5b6`；`git status --porcelain=v1 -uall`
仍是本報告「擷取日期」記錄的那 22 行。既有的兩個全套測試結果（ticket 的「Stage 6 review → Rerun」）
不受影響，沒有重跑：`pnpm test --run`（141 個檔案、5042 個測試通過、1 個跳過）、`pnpm --dir
create-wxl test`（39 個檔案、844 個測試通過、1 個跳過）。

其餘 15 項（C2–C16）維持本報告原判，不是漏洞；未新增任何裁決。

## 沒有涵蓋的範圍

- 沒有執行任何重現：SR-1 的資料流來自讀 `yaml@2.9.0` 原始碼，Node warning handler 的輸出與各終端機對 C1 的解讀都是推論。
- 沒有做相依套件掃描（本票沒有新增套件，只讀了 `yaml@2.9.0` 的相關原始碼）；根目錄 `package.json` 寫 `yaml ^2.8.2`，只審了實際解析到的 2.9.0。
- 可用性、DoS 與 rate limiting 依方法論不在範圍內，只在 C5、C15 列出供參考。
- 測試檔依方法論不列為發現；看過之後沒有發現洩漏 flag 或不安全的暫存檔用法（都用 `mkdtemp`）。
- committed 層只有文件，除了 C16 沒有看到會叫老師執行危險指令的內容。
- T-0077、T-0081 尚未實作，凡是依賴它們照 spec 實作的結論（C3、C7、C8、C14 的駁回理由）都要在那兩張票的 stage 7 重驗。
- 跨 ticket 的串連分析留到 epic 收尾，依 `docs/agents/review.md` 進行。
- 這份報告只代表檢查過以上檔案，不代表整個專案是安全的。
