# Stage 3 round 2：軸 1「完整性」（C）— epic 0003

審查版本：spec.en.md blob `63b9ce0806b1a758252940ab4799e8395bf5f15e`、traceability.md blob `3240fec5c25b4fdb7a194e4e8c6a1ae4495ee358`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`（原文重播）。reviewer：`harness-reviewer`（只讀檔案）。以下精簡但保留每項的位置、證據、等級與建議。

## P0

- **C-1** keep list 讓 `release-asset` 鍵永遠不會被改名，但既有測試沒有列在覆寫清單（traceability:63-66、T63、T61；spec:105-107、AC-R8、AC-B1；release.yml:72；fork-init.ts:204；fork-init.test.ts:318-327）。直接讀到：`wxl-${` 只出現在 `release.yml:72`（keep list）；T63 規定 key renames 跳過 keep list；既有測試 :324 斷言 release.yml 變成 `acme-${GITHUB_REF_NAME}`、:326 斷言 `sensitiveKeys` 含 `release-asset`，不在 Overridden contracts 表。T63 與 AC-R8 互斥，四個鍵實際只剩三個。信心高。建議：(a) key renames 用自己的排除清單（紀錄、CHANGELOG、`.proj.*`、fork-init 原始碼與測試，不含 release workflow）；或 (b) 測試列入覆寫並明說只剩三個鍵。
- **C-2** 部分寫入失敗後換參數重跑無法收斂，T53 與 T5/T31 衝突（T53、T5、T31、T59；spec:181-182、AC-R3）。推論：`--repo B --site-name X` 寫了 A6、寫 A7 時失敗，`applied` 仍 null；第二次只帶 `--repo B`，`siteName` 從 `applied` 繼承為 null，依 T5 值未設定的 anchor 檔不動，A6 停在 X、A7 停在 `WXL`；從失敗前的樹以 {repo B, siteName null} 成功一次的結果 A6 應為上游標題。`origin`、`base`、`rebrand` 同。依凍結評分定義兩條規則對這個重跑順序不可能同時實作。信心中高。建議：`applied` ≠ `settings` 時改從 `settings` 繼承，或把 T53 限縮成相同參數並新增「不同參數重跑」列。

## P1

- **C-3** 舊版設定過的靶場遇到部分寫入失敗後，manifest 的 slug 掉出 `<from>`（traceability:24-26、T6、T53；US8；spec:185-186；AC-R1）：紀錄在第一次寫 `settings` 時建立，失敗後「紀錄存在、`applied` null」，`<from>` 不再含 manifest 原本的舊 slug L，A2–A5 的 L 永遠只警告；manifest 已先寫入時 L 無從推得；T6 沒列這個狀態。信心中。建議：補列，或第一次寫 `settings` 時記下推得的舊 slug。
- **C-4** 沒給 `--origin` 時重新推導或從紀錄繼承沒有規定（spec:125-131、181；T26–T31、T59）：繼承則改名後推導 origin 留舊名；重新推導則覆蓋老師給的自訂網域；從 github-pages 切到 cloudflare-pages 時繼承的帶路徑 origin 遇到「path refused」而 T26 只涵蓋有給 `--origin`。信心高。建議：紀錄區分推導與給定（例如推導值存 null 加 `originDerived`），新增「改名 × 推導」「改名 × 給定」「切換 host × 繼承」三列。
- **C-5** 合併後的設定沒有跨欄位檢查（T35、T26、record rules；spec:130-131、263）：`applied.base = "/x/"` 時給 `--host`，或 `applied.host` 存在時只給 `--base`，合併結果矛盾；紀錄裡 `host: cloudflare-pages` 配帶路徑 `origin` 逐欄驗證都通過；合併沒有 unset 無法清掉 `base`。信心高。建議：規定給定的 `--host` 清掉繼承的 `base`（或反之），加跨欄位規則與矩陣列。
- **C-6** `--author`／`--repo` 是否仍必填沒有列（US2、spec:80-81；T59；fork-init.test.ts:106-114；README.en.md:81「Requires `--author` and `--repo`」）：仍必填則 T59 對這兩欄無意義、US2 做不到；改選填則要覆寫測試並規定「沒有紀錄又沒給 `--repo`」；也影響 pristine test。信心高。
- **C-7** 紀錄規則漏了 `rebrand`、`name`、`description`，也沒有子欄位型別表（traceability:76-79、T49；spec:181、B2；fork-init.ts:99-114、197-205）：`rebrand` 的規則只在程式碼，`name`、`description` 完全沒有規則；`rebrand` 會從紀錄繼承並逐字代入 TS 模組與 YAML 的全樹替換（推論），經由別人的 PR 改紀錄可注入程式碼，B2 有缺口。信心中高。
- **C-8** 繼承來的設定如何套用沒有規定（spec:102-105；A1；T59、T63）：繼承值非 null 時 `name`、`description` 算不算 given；繼承 `rebrand` 是否每次都進 B 模式、每次出 inventory 警告，且 `pkg.name = name ?? rebrand`（fork-init.ts:284）把手改過的套件名稱改回；紀錄存在後老師手改 A6–A8 會在只改別的參數時被默默覆蓋（推論）。信心中。
- **C-9** A9 寫入的引號形式與通則矛盾（spec:100、117-118；T38、T39；AC-A5 對 AC-H4）：通則是 JSON 字面值（雙引號），A9 規定單引號。修法只改一個詞，請求 P1；照嚴格定義屬 P0 型互斥，請使用者裁定。信心高。
- **C-10** `--host` 下 A9 不是上游形式時沒有回復路徑；A9 缺少時是 T36 或 T40 不明（T33、T36、T40；spec:118-119、131）：`--base none` 寫成 `'/'`、`--host` 與 `--base` 互斥，引擎沒有方式回到 `process.env.SITE_BASE || '/'`；曾用 `--base` 的靶場改用 `--host github-pages` 時 A9 字面值蓋過 workflow 的 `SITE_BASE`，project site asset 404，T36 只警告且內容未規定；舊設定檔只有 `base: '/x/'` 沒有 A9 定義時要警告或報錯未說（推論）。信心中高。建議：`--host` 把 A9 改回上游形式，或新增 `--base env` 並規定警告說明回復方式。
- **C-11** guard 依賴的「rewrite list」沒有定義（spec:197-201、AC-A7；T13；traceability:63-66）：只定義了 keep list；A1 的三個 URL 算 rewrite list 或 anchor 形式未定；新跨 OS job 若放新 workflow 檔不在 keep list，guard 會失敗。信心高。建議：列出 rewrite list 與各 workflow 的歸類。

## P2

- **C-12** repo 名稱以 `.git` 結尾（`BrowserLaboratory/wxl-platform.git`）時上游 slug 的 A3/A4 形式是新形式的前綴，每跑一次多接 `.git`，T7、T58 不成立；spec:95-96 的固定分隔符宣稱有反例；GitHub 是否允許未查證。建議：T45 拒絕 `.git` 結尾。信心中。
- **C-13** T73 與 T41 移除清單不完整：README.en.md:170（project site 用 `--base /<repo>/`）、:171（user/org site 用 `--base none`）、:173（`base: process.env.SITE_BASE ?? '/'`）、:81（「Requires `--author` and `--repo`」）、範本第 18、20-21 行的 `--base` 建議。信心中高。
- **C-14** 站名涵蓋範圍沒有列：MergedNav.vue:108 寫死 `WXL`、en.json:23「About WXL」、platform/index.md:11 的 hero image alt 不會隨站名改變，矩陣沒說它們不在範圍。信心中。
- **C-15** 原子寫入與 workflow 狀態周邊：寫入與 rename 之間被終止時暫存檔留在樹內被 `git add -A` 收進；暫存檔命名、位置、清理未規定；cloudflare 移除 workflow 排在哪一段、是否列入 `changedFiles`；範本不存在時（fork-init.ts:296、314 默默略過）沒有列。信心中。
- **C-16** 「upstream slug」來源未說：常數或紀錄的 `upstream.repo`（create-wxl 可能寫入不同值）；`upstream.repo` 的驗證規則沒有列。信心中。
- **C-17** manifest 狀態沒有列：不存在時默默略過（`if (pkgRaw)`）；`repository.url` 的其他形式（`https://github.com/x/y`、`git@github.com:x/y.git`、非 GitHub）；`bugs` 是字串時 `{...'str'}` 攤成字元的 bug 仍在。信心中。
- **C-18** A9 是字面值時 `SITE_BASE` 有設定，會被忽略還是仍驗證並拋錯沒有列。信心中低。
- **C-19** S7 命令清單少了 `/x/` build，也沒規定各主機套用的參數值。信心中。
- **C-20** 新跨 OS job 放哪個 workflow 檔沒規定，影響 keep list、觸發條件（trigger-branches.test.ts:21 只看 quality-gates）與 toolchain-parity.test.ts:20 的 `WORKFLOWS` 清單。信心中。
- **C-21** 經由真實 CLI 的 tree-state 錯誤沒有列；目前 `result.message` 以 `console.log` 輸出到 stdout（fork-init.ts:458-474）。信心中。
- **C-22** GitHub slug 不分大小寫，`--repo` 與 `<from>` 只差大小寫、guard 的大小寫比對、小寫的上游 slug 都沒有列。信心低。
- **C-23** pristine test 失敗的一面沒有 seam 也沒有 fixture 列（T17 seam「—」）。信心中。

**等級統計：P0 2（C-1、C-2）、P1 9（C-3～C-11）、P2 12（C-12～C-23），共 23。**
