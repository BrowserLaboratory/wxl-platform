# Completeness（C 軸）審查報告：0010-primary-locale-layout 第 1 輪

審查範圍：spec.en.md blob f45f078、traceability.md blob 5d3c16c、working tree 的 GLOSSARY.md blob b307335、HEAD 65de8c0。三個檔都直接讀 working tree。traceability 全文從頭讀到尾（分段讀到「Checks on revision 1」為止）。為了核對，另外讀了這些程式碼與設定：`scripts/pre-commit.sh`、`.github/workflows/quality-gates.yml`、`.gitignore`、`package.json`、`create-wxl/src/{upgrade,run-shared,archive-rules,pristine}.mjs`、`tests/unit/site/redirects.test.ts`、`tests/site-smoke/site-smoke.spec.ts`、theme 元件裡的 `$t` 用法。

---

## P1

### C-1　L24 寫的 subtitle 來源是 `description`，跟 D44 的 `subtitle` 衝突
- **位置**：traceability.md:1959（L24）；對照 :88（D44）、:1008（CS2）；spec.en.md:273-275、:503-504（AC-22）
- **違反的要求**：matrix row 的預期行為必須跟 spec 規則一致；每個 {type × field × boundary} 都要接到 AC
- **證據（直接讀到）**：L24 寫「CS1, CS2 × frontmatter `title`/`description` string / `''` / absent / non-string」。D44 和 CS2 都寫 subtitle 取自 frontmatter `subtitle`，並且明說「Not `description`」。L24 的 AC 也只斷言 h1。
- **影響**：照 L24 寫測試會測錯 key。`subtitle` 這個 key 的四種 boundary（空字串、缺、非字串）沒有任何 row 驗到。
- **信心**：高
- **建議**：L24 改成 `title`/`subtitle`，並對 subtitle 的 `header p` 各 cell 分別斷言。

### C-2　hook 內的驗證讀哪一份 `range.json` 沒寫，S42 很可能自相矛盾
- **位置**：traceability.md:111（D67）、:165（D121）、:2067（S42）；scripts/pre-commit.sh:15-16、:92
- **違反的要求**：hook 狀態 × `range.json`（staged 或 unstaged）的組合要有確定的預期
- **證據**：
  - 直接讀到：D67 只規定 generator 的 `--staged` 讀 index 裡的 `range.json`。D121 規定 staged 的 fault 由驗證（lint-staged → `validateChallenge`，要靠 `P` 判 VM10）先擋。hook 的 stash 只涵蓋 `platform/`（`REST=(platform/ …)`），根目錄的 `range.json` 不在 stash 範圍內。
  - 推論：驗證會讀 working tree 的 `range.json`。S42 的情境是 working tree 寫 `zh-TW`、index 寫 `en`，再加一個 staged 的題目變更，預期結果是 0007 O2。如果被 stage 的題目缺 zh-TW 說明頁，驗證會用 `P = zh-TW` 判出 VM10，結果變成 O3。
- **影響**：commit 時兩道檢查（驗證與 generator）可能用不同的 `P`，S42 的預期在實作上不成立或不確定。
- **信心**：中高
- **建議**：明定 hook 內的驗證也讀 index 的 `range.json`（或明定讀 working tree），並補一個 row：unstaged 的 `P` 與 index 不同 × staged 一個缺新主語系說明頁的題目。

### C-3　「工具 × `range.json` 狀態」矩陣有洞
- **位置**：traceability.md:157（D113）、:351（type × boundary 總表）、:2211-2242（keygen、analyze）、:2266-2277（L1/L2、lint-staged、L4）
- **違反的要求**：每個讀 `range.json` 的工具 × 每種狀態都要接到 AC
- **證據（直接讀到）**：
  - D113 寫「The tools that read range.json (generator, hook, create:challenge, validate, keygen, the L4 package)」。
  - analyze 要從主語系說明頁取 title（D89），verify L1 和 lint-staged 跑 `validateChallenge`（要 VM10），所以這些工具也需要 `P`。
  - 總表只列 B1–B16、S10、S11、S41–S43、Y36、Y37、Y70–Y73。keygen、analyze、`buildPlayerPackage`、L1、lint-staged 在 `range.json` 缺檔、無 key、`en`、PL-E01–E06 各狀態下的行為都沒有 row。
  - 這些工具在「`range.json` 無效」和「舊版面」同時成立時，先報哪一個也沒寫。D82 只定了 create:challenge 的順序；`checkSourceLayout(srcDir, primary)` 的簽名暗示要先讀 `range.json`。
- **影響**：keygen 在 `range.json` 無效時是否中止、是否先寫檔，以及 L4 package 在 `P = en` 時讀哪一份說明頁，都沒有可驗收的出口。
- **信心**：中高
- **建議**：把 keygen、analyze、L4、L1、lint-staged 各自 × {absent, `en`, 每種 R19 reason} 加進 Y 區；比照 D82，寫明「PL-E01–E06 先於 PL-E07–E10」。

### C-4　U53 的「被忽略的 zh-TW 說明頁」照 Discovery 規則找不到；spec 與 traceability 對 walk 的範圍說法也不同
- **位置**：traceability.md:1362-1369（Discovery）、:2371（U53）、:2369（U51）；spec.en.md:327-328
- **違反的要求**：matrix row 的預期必須跟 spec 規則一致
- **證據**：
  - 直接讀到：Discovery 的 disk walk 會跳過「a locale folder path」。`files` 只收 tracked 路徑和 walk 找到的檔案。RC4 只套在「every `from` and stripped translation brief」，但被忽略又沒追蹤的 `platform/zh-TW/challenge/s1/index.md` 既不在 tracked 裡，也不會被 walk 走到，不會產生 strip op。U53 卻預期這個案例得到 `ignored` 停止。
  - 直接讀到：spec 寫「The disk walk skips exactly the excluded areas」，沒有提到語系資料夾，跟 traceability 不一致。
  - 推論：U51 的「`platform/zh-TW` 是符號連結（底下有要被 strip 的說明頁）」也一樣。git 只追蹤連結本身，底下的說明頁進不了 `files`，RC1 沒有機會觸發。
- **影響**：搬家可能「成功」完成，卻留下帶著題目宣告的 zh-TW 說明頁，之後 build 失敗（PL-E15）或 PL-E07。U53 和 U51 依現行規則寫不出能通過的測試。
- **信心**：中高
- **建議**：Discovery 對語系資料夾內的 `challenge/*/index.md` 另做被忽略與連結的檢查（或對每個 English brief 的 slug 檢查 `platform/<L>/challenge/<slug>/index.md` 在磁碟上的狀態）；同步修正 spec:328。

### C-5　步驟 9 沒列 strip op 的寫入，也沒有 run row 驗證 strip 有實際寫到磁碟
- **位置**：traceability.md:1357（步驟 9）、:1640（Area U 的覆寫合約）、:1231（o′）、:2310（U1）、:2353（U46）
- **違反的要求**：每個 move op 種類 × merge 結果（P-2，也就是「o as it is」）都要接到 AC
- **證據（直接讀到）**：
  - 步驟 9 寫「writes (every move op's `to`, every merge write …)」，覆寫合約寫「writes include every move `to`」。但 strip op 的形狀是 `{ kind: 'strip', path, content }`，沒有 `to`。
  - 會走到 P-2 的 strip（老師自己題目的 zh-TW 說明頁、上游沒動過的翻譯說明頁）沒有 run row 斷言磁碟內容已被 strip。U46 只驗 UP-A16，U1 只驗 destination 和 `challenge.yaml`，V-U1 只驗 R6 那一行。
- **影響**：如果照字面實作，strip 不會寫入，搬家後 build 出 PL-E15，但測試仍然全綠。
- **信心**：中
- **建議**：步驟 9 改成「every move op's `to` or `path`」；補一個 run row：老師自己題目的翻譯說明頁搬家後，內容等於 kept groups。

### C-6　「靶場或 fork」這個 repository 狀態 × 讀真實 tree 的 row 沒有用 upstream 判定做閘門
- **位置**：traceability.md:1758（B14）、:1803（B40）、:1810（B47）、:1807/:1811/:1829/:1845/:1866（B44、B48、B59、B70、B81，smoke）、:2130（Y1）、:2162（Y22）、:2218（Y55）、:1976-1977（L40、L41）、:1858-1859（B78、B79）、:98（D54）、:2691（A-O5）；quality-gates.yml:18-69、:179-236、:303
- **違反的要求**：prompt 指定的 repository 狀態（fresh copy、fork、clone）都要涵蓋
- **證據**：
  - 直接讀到：靶場會帶走整個 tree，包含 `tests/` 和 workflows（archive-rules 不排除任何路徑）。`test`（必要檢查）和 `site-smoke` job 在靶場也會跑，只有 `fork-init-cross-os` 有 upstream 條件。
  - 直接讀到：B14 和 B47 斷言真實 tree 出貨的 `"zh-TW"`；Y1 和 Y55 斷言四份 `challenge.yaml` 跟 Y-§2.4 逐位元組相等。V-U1 本身就讓老師改了 door-is-open 的 `tags`。B44、B81 斷言 `dist/index.html` 是繁中首頁。這些 row 都沒有像 D52/D108 那樣用 `upstreamDecision` 擋住。
  - 直接讀到：D54 宣稱「the same suite passes in a range whose P = en」，但 A-O5 說 smoke 只在 upstream 跑，沒有任何 row 驗證這個保證。site-smoke.spec.ts:788 已有用 `realUpstreamDecision` skip 的先例。
- **影響**：每一個升級成 `P = en` 的舊靶場，以及改過上游題目的靶場，CI 的 `test` job 都會轉紅。
- **信心**：中高
- **建議**：逐一標出哪些 row 在靶場要 skip（用 upstream 判定）、哪些必須在靶場也通過；為 D54 補一個在 `P = en` 靶場跑 smoke 的 row（stage 8 也可以）。

---

## P2

### C-7　hook × `range.json` 的變更方向不齊
- **位置**：traceability.md:2065-2068（S41、S74、S42、S43）、:351
- **證據**：只有 `en` → `zh-TW` 這個方向。沒有以下 row：
  - zh-TW fixture 新增 `range.json` 寫 `en`，而某題缺英文說明頁（應該出 W6a）；
  - staged 刪除 `range.json`（`en` → 缺檔 → `zh-TW`）；
  - 只改 `upstream`、`P` 不變。
- 總表的「in the index」值也漏了 staged deletion。
- **影響**：D66 的觸發條件和 D64 的拒絕，在另一個方向沒有驗收出口。
- **信心**：中
- **建議**：補上述三個 row。

### C-8　hook 的 glob `:(glob)platform/*/challenge/**` 也會命中 `platform/public/challenge/`、`platform/shared/`，以及清單外的資料夾
- **位置**：traceability.md:109（D65）、:2060（S36）；.gitignore:76；`platform/public/challenge/<slug>/runtime.wasm` 確實存在
- **證據**：S36 寫「any `platform/<x>/challenge/` triggers」。`public/challenge/<slug>/` 是 keygen 的輸出位置；現在只靠 `**/*.wasm` 被忽略才沒觸發。老師在那裡放的靜態檔，對觸發、W4 措辭（`--describe-untracked`）和 validator pathspec 的影響都沒有 row。S21 只涵蓋 generator。
- **影響**：會有預期外的觸發，或 W4 說法錯誤。
- **信心**：中
- **建議**：排除 `public`、`shared`，或改成只列 `LOCALES` 的 pathspec；補 row。

### C-9　說明頁資料夾裡的非 index 頁面與附檔
- **位置**：traceability.md:2686（B-O10）、:2047（S32）、:2272（Y88）、:1166-1170（S-§4.7）
- **證據**：B-O10 允許 `platform/<L>/challenge/<slug>/` 放 index 以外的檔案，但沒有 row 涵蓋：
  - `deriveSlugs`、`indexTrees`、`briefFaults`、W4、D86 discovery、D84 碰撞判定，遇到 `hints.md` 或只有圖片的資料夾時怎麼處理；
  - S32 寫「each with `index.md`」：主語系 `challenge/` 底下沒有 `index.md` 的資料夾會變成 CI fault，這與 B-O10 怎麼並存，沒有 row。
- **信心**：中

### C-10　B20 與 AC-3 不一致
- **位置**：traceability.md:1778；spec.en.md:384-385
- **證據**：AC-3 寫「under both primaries (also with the translation folder empty or absent)」。B20 只測 `P = en` 下 `zh-TW/` 是空資料夾或不存在；`P = zh-TW` 下 `en/` 為空或不存在沒有 row。
- **信心**：中

### C-11　PL-E11、PL-E12 缺「段落邊界」的反例
- **位置**：traceability.md:1841-1842（B66、B67）、:1852（B72）、:1802（B39）；spec.en.md:226、:422-423
- **證據**：B39 為 `rewrittenPath` 測了 `english/x.md` 這個反例，但 PL-E11 和 PL-E12 沒有 `/english/`、`/enroll/`、`/zh-TWx/` 這類不該觸發的案例。另外 AC-8 寫「starts with the primary locale's code」（像字串前綴），D12 寫「first segment equals」，兩者範圍不同。
- **信心**：中

### C-12　transform 的輸出可能違反 PL-E09
- **位置**：traceability.md:1219、:1227、:1789（B31）、:2320（U11）
- **證據**：舊版面的 `platform/zh-TW.md` 或 `platform/en.md` 搬家後變成 `platform/en/zh-TW.md` 或 `platform/en/en.md`，會觸發 PL-E09。這種情況沒有停止 token，也沒有 row：upgrade 完成，但 build 失敗。
- **信心**：中低

### C-13　非 crossing 的 moved run 會產生沒有主語系說明頁的題目；U9 的預期也寫不清楚
- **位置**：traceability.md:2312（U3）、:2318（U9）、:2416（U140）、:149（D105）
- **證據**：
  - `P = zh-TW` 的新版面靶場留下一份舊位置的 English brief（或 U9 以錯誤的 `--from` 讓整個舊版面靶場被搬）。搬家把它放進 `platform/en/`，成為翻譯，主語系說明頁不存在，validate 會判 VM10。U140 只涵蓋 crossing 的情況。
  - U9 寫「as U3」，但 U3 的 AC 是「count 1、no strip、no declare」，對整個舊版面的靶場不可能成立。
- **信心**：中

### C-14　`P = zh-TW` 時，根網址題目頁的 SSR 介面字串是英文
- **位置**：traceability.md:1918（A29：「SSR keeps the `createI18n` default (`en`)」）；FlagSubmit.vue:53（`$t('flag_submission.submit')`，在 ChallengeLayout.vue:914 SSR 渲染）；spec.en.md:92-93（US1）
- **證據**：T-0060 只擴到清單頁與首頁。上游根網址的題目頁、指南頁上，用 `$t` 的元件在 hydration 前顯示英文。沒有 row 涵蓋，也沒有列進 Out of Scope。
- **信心**：中

### C-15　fork:init 在 `P = zh-TW` 靶場刪掉 `platform/en/index.md` 的情況沒有 row
- **位置**：traceability.md:2444（U145）；spec.en.md:668-669
- **證據**：U145 只測刪掉 `platform/zh-TW/index.md`，那只在 `P = en` 時才是翻譯首頁。預設主語系是 `zh-TW`，此時的翻譯首頁是 `en/index.md`，刪掉它的情況沒有 row。
- **信心**：中低

### C-16　traceability 引用的 GLOSSARY 句子與 working tree 不符
- **位置**：traceability.md:291（Vocabulary）、:1655、:2666（N17）；GLOSSARY.md:385、:450
- **證據（直接讀到）**：
  - traceability 引用的是「升級時搬家的靶場若還沒有記主語系，會記成英文」和「靶場還沒記主語系的就記成英文」。
  - working tree 實際是「從舊版面的上游版本升級而搬家、而且還沒有記主語系的靶場，會記成英文」和「經由升級搬家、而且還沒記主語系的靶場記成英文」。
  - 兩句都仍缺 D105 的「靶場本身還在舊版面」這個條件（U2 的情況），而 supersession 條款指向的原文已經不存在。
- **影響**：讀者找不到被取代的句子；U135 與 B90 的落差無法精確比對。
- **信心**：高

### C-17　`challenge.yaml` 的 YAML 邊界、解析器一致性
- **位置**：traceability.md:2128-2137（Y1–Y8）、:123（D79）、:154（D110）；package.json:84（`yaml ^2.8.2`）
- **證據**：
  - 以下輸入沒有 row：重複 key、錨點或別名、`<<` merge key、YAML 1.1 形式、自訂 tag，以及它們對應哪個 `reason`。D110 只規定 create-wxl 這一側。
  - 根目錄用的 `yaml` 版本範圍（^2.8.2）與 create-wxl 的 2.9.0 可能不同。
  - build 時 brief frontmatter 由 VitePress 的 gray-matter 解析（PL-E15），validate 用 `yaml` 解析（VM6），兩者 key 集合是否一致沒有 row。
- **信心**：中低

### C-18　orphan 經由 `/c/NNN` 進入時會寫入偏好
- **位置**：traceability.md:70（D26）、:1110-1115（S-§4.3）、:1898（A9）
- **證據**：orphan 走 `--no-verify` 進到 generator 後，`/c/NNN` 和主語系代碼的短連結會落在翻譯頁，依 D26 冷載入會寫入 `T`。這與 D26「including one reached through `/c/NNN`」的說法在這個情況下不符，也沒有 DT 或 A9 的 row。
- **信心**：低

### C-19　Y-§2.5 的表格被 VM11 那一行切斷
- **位置**：traceability.md:609-623
- **證據**：空行加上「VM11 is retired…」這一行讓表格結束。後面 PL-E13–E18、KG1、CC1、RT1、VF1、LS1、PP1 這幾列沒有表頭，渲染後變成一般段落。KG1–PP1 的標準訊息只在這裡定義。
- **信心**：中

### C-20　手動搬家時漏了步驟 7 的靶場，升級後根語系會無聲改變
- **位置**：traceability.md:2311（U2）、:1453（report R4）
- **證據**：這種靶場走的是 U2 路線：crossing 成立，但老師的靶場沒被搬，D105 什麼都不寫，根網址從英文變成繁中，報告也沒有任何提示。沒有 row 或提示涵蓋。這是 D105 的取捨，所以只記錄。
- **信心**：低

---

**統計**：P0 0、P1 6（C-1–C-6）、P2 14（C-7–C-20）
