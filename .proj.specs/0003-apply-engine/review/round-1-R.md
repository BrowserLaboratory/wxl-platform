# Stage 3 round 1：軸 4「紅隊」（R）— epic 0003

審查版本：spec.en.md blob `e28240068a56ee1fa90c476c0846f3e232576e91`、traceability.md blob `aec390184f738b6e9fa04f0cfc6826b1649cca74`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md`（blob `2a541cce2d3b69b8c529f568a516e32888df32f3`）。reviewer：`harness-reviewer`。以下為報告內容，精簡但保留每項的位置、證據、等級與建議。

讀過：spec、traceability、`scripts/fork-init.ts`、`deploy.yml.template`、`config.mts`、`shortLink.ts`、兩個首頁、`release.yml`、`quality-gates.yml`、`.gitattributes`、`fork-init.test.ts`、`site-smoke.spec.ts`、三個元件測試的 origin 斷言、`GLOSSARY.md`、OQ-004/005、ADR-0006、`localStorageKeys.ts`、`useSessionGate.ts`。

## P1

- **R-1** 上游失去偵測「誤在上游跑 fork:init」的機制（spec:155-156、179-180、234；S5、T11、T47）。guard 以 manifest `repository.url` 判斷 skip；元件測試改讀 `SITE_ORIGIN`（直接讀到）。推論：在上游誤跑一次後 commit，manifest 改掉讓 guard skip、A8 改掉而元件測試照樣通過、site-smoke 不檢查 title/hero、`range.json` 沒有測試擋；現況下改 origin 會讓元件測試紅，這個 epic 拿掉了這道檢查。影響：上游帶著老師的 origin、站名與 `range.json` 發版而 CI 全綠。信心高（機制）。建議：guard 改用 `GITHUB_REPOSITORY`（或 workflow `if:`）判斷；另加只在上游執行的測試：`range.json` 不存在、`SITE_ORIGIN` 等於上游網址、A6/A7 是上游原值。
- **R-2** `--base none` 與 `--base` 套在新的單一 base 定義上會壞（spec:95-98、209 AC-H4；T27；fork-init.ts:385-413）。`setViteBase` 抓第一行 `^\s*base:`，null 刪行、找不到就在 `title:` 前插入。新設計若是 `const base = …` 加 `base,` 或 `base: base`：刪掉屬性列導致 head href 與 base 不一致；簡寫 `base,` 找不到而插入重複屬性；或刪掉 const 造成 ReferenceError（推論）。信心中（取決於形狀）。建議：寫明單一定義的語法形狀與 `--base none` 的新語意（例如字面值 `'/'`），補 T 列驗證 `none` 與 `/x/`。
- **R-3** 以 repo 名稱推出的 SITE_BASE 在自訂網域與 user site 會整站 404，引擎沒有出口（spec:99-106、209-211、217；T25、T28、T33；deploy.yml.template:94-98）。project site 掛 CNAME 時 Pages 在 `/` 提供網站而 base 是 `/<repo>/`；repo 改名為 `<owner>.github.io` 時 base 變 `/<owner>.github.io/`；`--host` 加 `--base` 直接 exit 1，T33 指向 `--base` 等於不能用 `--host github-pages`。「follows a repository rename by itself」不總成立。信心中高。建議：把 `actions/configure-pages` 移到 build 之前，`SITE_BASE` 改用 `${{ steps.<id>.outputs.base_path }}` 加 `/`，該輸出已考慮自訂網域與 user site。
- **R-4** 推導出的 origin 沒經過 T16/T17 驗證（spec:102-105、203；T18、T19、T32）。T32 允許 `___`、`...`、`-._`，經 T19 正規化成空字串得到 `https://.pages.dev`；100 字元名稱產生超過 63 的 label。規格只驗證給定的 `--origin`。影響：A8 寫入無效 origin、短連結全壞、仍 exit 0。信心高。建議：推導值也跑 T16，不合格 exit 1 請使用者給 `--origin`；補空 label、超長邊界列。
- **R-5** 用今天的引擎設定過、沒有 `range.json` 的既有靶場會被當成全新靶場（spec:146-147、188、227；T5、T26、T43）。照 README 用 `--base /<repo>/` 設定過的靶場：版本被重設為 `0.1.0`（發過 v0.x 的會倒退）；`<from>` 是上游 slug 而 README 早已是老師的 slug，每個 doc anchor 都發「零出現」警告；字面值 base 在 `--host` 下只警告，沒有選項能還原成環境變數形式。信心高。建議：版本只在 manifest `repository.url` 仍是上游時重設；沒有 record 時 `<from>` 從 manifest 現值推導；提供還原 base 的方法並補「舊引擎設定過、沒有 record」的列。
- **R-6** `settings` 只記最近一次的參數，部分重跑會抹掉既有設定（spec:143-144；GLOSSARY.md:364）。只為改名執行 `--author --repo` 時 `host`、`origin`、`siteName` 變 null，但值仍在 A6–A8 與 workflow；`--base none` 與未給 `--base` 都是 null，無法區分。違反詞彙表「老師每一項設定的值」與「升級時照它重做」。信心高。建議：未給的參數沿用前一次 `applied`；`--base none` 以獨立的值（例如 `"none"`）表示。
- **R-7** A6/A7 既有值的語法沒有定義，換名時遇到跳脫字元會毀損檔案（spec:90-91、198；A6、A7、T15、T44）。第一次執行後 A6 是 `title: "a\"b"`，若用 `"[^"]*"` 找值只抓到 `"a\"`，剩下 `b"` 留著，TS/YAML 壞掉；T15 只驗第一次、T44 只驗參數完全相同；也沒說 anchor 是否要接受單引號或未加引號的既有值（上游目前是 `"Web eXploitation Laboratory"`、`"WXL"`）。信心中。建議：定義 anchor 值的語法，完整剖析既有 JS/YAML 字串字面值；補「含跳脫字元的值 → 換成另一個值」的列。
- **R-8** 站名裡的 `$&`、`` $` ``、`$'`、`$$`、`$1` 可能被當成 `String.replace` 的替換樣式（AC-N3；T15；fork-init.ts:395 已用 function replacer 避開）。只測 `a$b` 的話以字串替換的實作也會通過，但 `$$` 變 `$`、`$'` 插入該行其餘內容。信心中。建議：T15 明列這些樣式；規格要求 function replacer。
- **R-9** 寫入中途失敗後改用不同參數重跑，slug 混雜且永遠不會修正（spec:146、224；T39）。第一次以 X 寫到一半失敗，老師改用 Y 重跑，`<from>` 是 `applied.repo`（或上游），已寫成 X 的位置只得到「零出現」警告；之後 `<from>` 為 Y，X 永遠不被改寫。T39 只涵蓋參數相同。信心中高。建議：`settings.repo` ≠ `applied.repo` 時 `<from>` 同時涵蓋兩者；補「失敗後改參數重跑」列。

## P2

- **R-10** 寫入不是原子的、並行沒有鎖：`range.json` 寫到一半被中斷會被截斷，之後每次都因 AC-R2 exit 1；config 或 README 被截斷會讓 A6 零匹配；設定頁與 CLI 可能並行。建議：暫存檔再 rename；寫明並行行為（lock 檔）。信心中。
- **R-11** manifest 實際改寫的欄位超出 A1（fork-init.ts:278-286；fork-init.test.ts:180）：每次都改 `author`、`license = 'ECL-2.0'`、`version`，以及 `name`、`description`；既有測試要求 ECL-2.0、AC-R8 要求通過；老師改過的 license 每次被改回。建議：A1 列出全部欄位，決定 license 是否只在第一次寫。信心中。
- **R-12** 從上游同步後上游 slug 回到 doc anchor（取上游版本解 README 衝突），`<from>` 是 `applied.repo` 不比對上游 slug，guard 在靶場 skip。建議：doc anchor 同時改寫 `applied.repo` 與上游 slug。信心中。
- **R-13** GitHub Pages 靶場與同一 owner 的其他 Pages 網站同源（localStorageKeys.ts:184-191、299；ADR-0006:13-17）：學習者資料以固定前綴存在 localStorage、site-wide clear 依前綴掃描、IndexedDB 以 origin 為範圍；同一 owner 下兩個 WXL 靶場會共用並互相清除筆記、草稿與攻擊紀錄；`<owner>.github.io` repo 可在 `/` 註冊 service worker。既有問題，但本 epic 把 GitHub Pages 變成主要路徑。建議：信任邊界表加入此列並提醒老師。信心中。
- **R-14** 推導出的 GitHub Pages origin 會讓講義短連結 404（skill:92 寫明 GitHub Pages 不讀 `_redirects`）；故事 3 想避免的是「帶到別處」，結果是「帶到 404」，屬已知但未處理的後果。信心中高。
- **R-15** 字元規則把 Cf 當控制字元，擋掉 U+200D（ZWJ emoji 如「👩‍🏫」）、U+200C、soft hyphen；Cs（lone surrogate）沒被拒絕，設定頁傳入時寫入 HTML 變 U+FFFD，`settings` 與產出不一致。信心中低。
- **R-16** origin 規則接受 IPv4（`https://127.0.0.1`、`https://0x7f.1`）；路徑段允許 `.`、`..`，顯示文字與瀏覽器正規化後的網址不一致。信心中。
- **R-17** `--rebrand` 的全樹走訪沒排除 `range.json`：站名含敏感 key token（如 `wxl-locale`）時，`settings.siteName` 在 settings 與 applied 之間被 rename，A6 每次在兩值間切換破壞冪等；`SELF_EXCLUDE` 只兩個檔案，新拆出的引擎模組的字面探針會被改寫。信心中低。
- **R-18** record 是跨信任邊界的輸入卻只驗證型別：`range.json` 可能來自同事的 PR 或別人的靶場；`applied.repo` 不比對 T31/T32 卻決定比對字串；`__proto__` 的 prototype pollution 風險；其他工具加在 `settings` 下的欄位會因整個取代而遺失。信心中低。
- **R-19** 非 git 工作樹（Download ZIP、跑 fork:init 前 `git archive`）manifest 仍是上游，guard 會執行而 `git ls-files` 失敗，行為未定義；上游 org 改名或轉移後 `if:` 讓 release 與跨 OS job 靜默停跑。信心中低。
- **R-20** 寫入會跟著 symlink 走到 repo 外：懸空 symlink 的 `deploy.yml` 讓 `existsSync` 為 false，`writeFileSync` 在 repo 外建檔（fork-init.ts:316-321）；但執行不可信 repo 的腳本本就等於執行對方程式碼。信心低。
- **R-21** fork 別人的靶場會繼承對方的 record：B 的第一次執行不重設版本；`upstream.repo` 仍是 BrowserLaboratory 而實際上游是 A；A 的 `createdWith`、`baseline` 被保留，0005 與升級模組會照 A 的基準重播。信心中。
- **R-22** B1 把設定頁列為同一種輸入來源，但 localhost 端點的 CSRF、DNS rebinding 不在 Protects 裡；屬 0005，但 B1 現在的寫法已宣稱涵蓋。信心低。
- **R-23** 不帶 `--host` 時是否安裝 workflow 有兩種讀法（fork-init.test.ts:210-215；AC-R8）：沿用則 Cloudflare 老師沒帶 `--host` 也拿到 workflow，推 `v*` 時在沒啟用 Pages 的 repo 失敗；改成只看明確參數則與既有測試衝突。信心中。

**等級統計：P0 0、P1 9（R-1～R-9）、P2 14（R-10～R-23）。**
