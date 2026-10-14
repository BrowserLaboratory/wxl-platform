# Stage 3 round 2：軸 4「紅隊」（R）— epic 0003

審查版本：spec.en.md blob `63b9ce0806b1a758252940ab4799e8395bf5f15e`、traceability.md blob `3240fec5c25b4fdb7a194e4e8c6a1ae4495ee358`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce…`（原文重播）。reviewer：`harness-reviewer`。以下精簡但保留每項的位置、證據、等級與建議。

## P1

- **R-1** 行為規則寫成「是否帶了參數」，但 `settings` 會繼承，spec 沒說規則依參數或合併後的有效值（spec:125-133、181、B3、AC-R3、AC-A2；T37、T53、T59）。直接讀到：T37 以「沒帶 `--host`」為條件安裝 workflow；disposition C-2 也這樣說；`settings.host` 會繼承。推論：同一組有效設定 `{host: cloudflare-pages}`，帶 `--host` 時移除 workflow、只帶 `--site-name` 時裝回，樹不是有效設定的函數，T53 不成立；升級重做與實際分歧；繼承 `rebrand` 時是否再做全樹 key rename 兩種讀法都違反 B3/AC-A2 或紀錄一致性；`base` 同。信心高。建議：所有行為規則一律依合併後的有效值；T37 改「有效 host 為 null」，B3/AC-A2 改「有效 rebrand 為 null」。
- **R-2** 一種走得到的紀錄狀態無法照參數重做，A9 寫成字面值後回不到上游形式（spec:116-119、131、AC-H3、AC-R10、Out of Scope；T35、T36、T60）。先 `--base /x/` 再 `--host github-pages`，紀錄同時有 `host` 與 `base`，重做時觸發 T35 參數錯誤；`--base` 只寫字面值、「nothing deletes the definition」、沒有選項還原 `process.env.SITE_BASE || '/'`，`--host` 下只警告。影響：用過 `--base` 的 GitHub Pages 靶場永遠拿不到 configure-pages 的 base，改名或加自訂網域後整站 404；升級重做撞上參數錯誤。信心高。建議：`--host` 把 A9 還原成上游形式並清 `settings.base`，或在有效值上檢查互斥；補「`--base` 後接 `--host`」列。
- **R-3** origin 的推導與繼承誰優先沒有定義（spec:125-130、133、181、AC-O2；T27-T29、T59）：(a) 推導優先時 Cloudflare 老師每次帶 `--host` 就把以 `--origin` 設定的自訂網域覆蓋成 `pages.dev`；照 README:177 手改過 `SITE_ORIGIN` 的故事 8 老師第一次執行就被覆蓋；(b) 繼承優先時 GitHub Pages 改名後 A8 停在舊名而 base 由 configure-pages 自動跟上，網站與短連結分家。T26 是否套用到繼承值也沒寫。信心高。建議：明訂「明確給的 `--origin` 優先，其次繼承，最後推導」或「只有原本是推導來的才重新推導」（需記錄來源），推導值與 A8 現值不同時警告。
- **R-4** Cloudflare 預設 origin 屬於全球共用的 `pages.dev` 命名空間（spec:128-129；T29；B1）：`<name>` 取自 repo 名稱，GitHub fork 預設保留 `wxl-platform`，沒改名也沒帶 `--origin` 的老師都得到 `https://wxl-platform.pages.dev`；名稱被佔用時 Cloudflare 會加隨機後綴（推論）；該名稱最多屬於一個帳號，可能是上游或搶註者（無法驗證）。影響：資安課講義短連結把整班帶到第三方甚至惡意網站，正是故事 3 要防的；T29 的警告只在推導那次出現，之後被繼承。信心中（機制確定，被佔用是推論）。建議：Cloudflare 不推導 origin，沒帶 `--origin` 就是參數錯誤（專案名稱由老師在 dashboard 決定，引擎無從得知）；或推導值不寫入 A8、只留在警告。
- **R-5** `--rebrand` 的 key rename 沒跳過 A2–A5 與 A9，repo slug 含 key token 時第二次相同參數執行會毀掉 slug（spec:105-107、AC-B1、AC-R7；T63、T58；fork-init.ts:258-270 現行先 rename 再換 slug；fork-init.test.ts:439-445）。T45 允許 `me/wxl-locale`、`tmp/wxl-verify`；先後順序未定義。推論：第一次在 README 寫 `git clone https://github.com/me/wxl-locale.git`，第二次 key rename 改成 `me/acme-locale`，`<from>` 扣掉新 slug只剩上游、比對不到，slug 永久毀損，guard 在靶場又略過；現有測試只跑一次；A9 的 `--base /wxl-locale/` 同。信心中高。建議：key rename 跳過 A1–A5 每個出現位置與 A9 那行（或所有含新 slug 的位置）並明訂順序；補「`--repo me/wxl-locale --rebrand acme` 跑兩次」列。
- **R-6** keep list 收了 release workflow，`release-asset` key rename 不再生效，與 AC-R8 直接矛盾（traceability:63-66、T63、AC-R8、overridden table；fork-init.test.ts:318-326）。依字面定義可算 P0，但加進 overridden 清單或把 release.yml 移出 key rename 排除即可解決，請求 P1 交使用者裁決；附帶 `release-asset` 從此不再回報。信心高。建議：release job 已限上游執行，把測試列入 overridden 並改成「release.yml byte-identical」最一致。
- **R-7** `<from>` 只在「沒有紀錄」時納入 manifest slug，舊引擎設定過的靶場第一次執行中途失敗時 T53 無法收斂（spec:93-95、185-187；traceability:24-26；T6、T53、AC-R3）：先寫 `settings` 即建立紀錄而 `applied` null；下一次 `<from>` 不含 `old/name`，README 永遠不改；從失敗前的樹成功一次則會改。信心高。建議：條件改「`applied` 為 null」或一律納入 manifest 目前的 slug；補列。
- **R-8** 故事 8 的老師同步上游後，舊範本產生的 workflow（刻意不設 `SITE_BASE`，deploy.yml.template:15-21）加上新的 A9 上游形式，GitHub Pages 專案站整站 404，引擎只發泛用的「different … left untouched」警告（fork-init.ts:336-338）；disposition C-20 接受「舊範本視為 different」但沒處理這個後果。信心中。建議：以 hash 辨識舊版範本產出、視為可安全替換；或針對「workflow 沒設 `SITE_BASE` 而 A9 是上游形式」明確警告。

## P2

- **R-9** 繼承值每次執行都重寫，悄悄蓋掉手動修改（例如只改 zh-TW 的 hero）；只改 `range.json` 的 PR 在審查時網站看不出變化，要等下次為別的原因執行才延後無聲生效；站名含 `wxl` 時 residual inventory 永不乾淨、手改後又被重寫形成迴圈。建議：anchor 現值與 `applied` 不同時列出差異並警告。信心中。
- **R-10** `range.json` 重複 key 可騙過審查：`JSON.parse` 採最後一個，PR diff 上方正常、檔尾藏重複的 `applied`。建議：拒絕重複 key，或序列化結果與原始 bytes 不同時警告。信心中低。
- **R-11** 字元規則放行 U+FFFE、U+FFFF（Cn），`JSON.stringify` 不跳脫，YAML 1.2 不允許、js-yaml 的 `PATTERN_NON_PRINTABLE` 會丟錯（VitePress 經 gray-matter 用 js-yaml 為推論）：fork:init exit 0、`pnpm build` 才失敗，違反故事 5；Cf 的 tag 字元讓子區域旗幟 emoji 被拒（記錄）。建議：拒絕 Cn 或至少 noncharacter。信心中。
- **R-12** 注入 `fs` 介面不完整：目錄列舉、存在檢查、建立 `.github/workflows/` 可能繞過，0005 用這個 seam 限制寫入範圍時失效；暫存檔寫完未 rename 前崩潰會殘留並被 `git add -A` 收進。建議：列出完整方法集、暫存檔命名與清理（加入 `.gitignore`）。信心中低。
- **R-13** 警告每次執行都重複（T2、T29、T36、T33/T34），違反既有測試的設計原則（fork-init.test.ts:229-236：「Repeating it on every run trains people to ignore the warning block」）。建議：只在第一次或狀態改變時警告。信心中。
- **R-14** 以 `.git` 結尾的 repo 名稱（`a/b.git`）打破固定分隔字元保證；manifest 擷取 slug 有歧義；非標準 manifest URL 的擷取規則未定義。建議：T45 拒絕 `.git` 結尾並定義擷取規則。信心低。
- **R-15** pristine 測試對 manifest 只檢查 `repository.url`（AC-A8 與 T17 不一致；package.json:3、16 為 version 3.0.0、license LicenseRef-LICENSE）：在上游誤跑 `--repo BrowserLaboratory/wxl-platform` 時被當成 first conversion，version、license、author 被改，只能靠 `range.json` 抓到。建議：T17 一併比對 version、license、author。信心中。
- **R-16** `--author`／`--repo` 是否仍必填沒交代：必填則故事 2 做不到且重打可能誤改名；選填則沒有紀錄的第一次缺 `--repo` 時 A1 寫什麼未定義（可能 `github.com/null`）。信心中。
- **R-17** guard 只比對完全相同的上游 slug，大小寫不同的寫法既不改寫也抓不到；上游 origin `wxl.browserlab.online` 不在 guard 範圍（已列 Out of Scope，記錄）。建議：不分大小寫比對。信心低。

已確認處理、本輪未再發現問題的 round 1 項目：R-1、R-3、R-4、R-7、R-8、R-11、R-15、R-16、R-22。站名與 origin 寫進 HTML 或 JS 的注入路徑由 `<` `>` `&` 拒絕加 JSON 字面值擋住；SITE_BASE 正規式擋住 head href 注入。

**等級統計：P0 0、P1 8（R-1～R-8，R-6 依字面可主張 P0）、P2 9（R-9～R-17）。**
