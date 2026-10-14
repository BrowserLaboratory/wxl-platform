# Stage 3 round 2：軸 2「可驗證性」（V）— epic 0003

審查版本：spec.en.md blob `63b9ce0806b1a758252940ab4799e8395bf5f15e`、traceability.md blob `3240fec5c25b4fdb7a194e4e8c6a1ae4495ee358`，HEAD `c0f7edf`，凍結 prompt blob `2a541cce2d3b69b8c529f568a516e32888df32f3`（與 round 1 相同，原文重播）。reviewer：`harness-reviewer`（未執行 Git）。沒有找到含 prompt 點名的模糊字眼的 AC。以下精簡但保留每項的位置、證據、等級與建議。

## P1

- **V-1** A9 的寫入格式 AC-A5 與 AC-H4 互相矛盾（spec:100、229、250；traceability:38、43、T38–T39）：code anchor 新值寫成 JSON 字面值（雙引號），T38/T39 期望 `'/x/'`、`'/'`（單引號）。信心高；若 AC 不能改則為 P0。建議：明定 A9 用單引號例外，或 T38/T39 改成 `"/x/"`。
- **V-2** 「其他既有測試照舊通過」與 rebrand 跳過 keep list 互斥（AC-R8、AC-B1；keep list 含 release workflow；T63；fork-init.test.ts:70、318-327；release.yml:72、79）：既有測試斷言 `release.yml` 變成 `acme-${GITHUB_REF_NAME}` 並回報 `release-asset`，不在 overridden 表；真實 repo 裡 `wxl-${` 只在 `release.yml`，跳過後 `release-asset` 改名在任何 range 都無效（推論）。信心高；若 AC 不能改則為 P0。建議：列入 overridden 表並寫新期望，或把 release workflow 從跳過範圍排除。
- **V-3** `--author`／`--repo` 是否仍必填沒有判定依據（US2、spec:81、181、AC-R10；T59；fork-init.test.ts:106-114；fork-init.ts:94-95）：US2 與 T59 隱含可以省略，spec:81 說既有參數保持原意、`parseForkInitArgs` 缺任一個就丟錯且測試斷言，`parseForkInitArgs(argv)` 讀不到紀錄；沒有紀錄又沒帶 `--repo` 未定義。信心中高。
- **V-4** 失敗後收斂（T53）與「沒設定值的 anchor 不動」（T5）互斥（spec:182、263、226；T5、T52–T53；A1）：帶 `--site-name X` 寫了 A6 後失敗，下一次只帶 `--origin`，`siteName` 從 `applied` 繼承為 null、A6 不算 being set 而留著 X，但一次成功執行應為原值；manifest `name`／`description` 同。信心中高。建議：從 `settings` 回復，或把 T53 限縮成相同參數。
- **V-5** AC-C1 的 mock 機制在現有程式碼下沒有作用（spec:191–192、278；S6、T65；shortLink.ts:54、64；ShortLinkShare.vue:41-42）：`shortLinkUrl`／`shortLinkDisplay` 的預設參數綁定模組內部常數，元件沒有傳 origin；`vi.mock(…, {...actual, SITE_ORIGIN})` 只換匯出值，函式仍輸出上游網址；整個模組 mock 又變同義反覆（推論）。信心高。建議：元件改傳匯入的 `SITE_ORIGIN`，或函式在呼叫時才讀取匯出值，列為需要改的程式碼。
- **V-6** AC-X1 的「built short-link origin」在 S7 指名的輸出觀察不到（spec:284；S7、T70；HomeContent.vue 沒有 short link；ChallengeList.vue:437、MergedNav.vue:137、248；shortLink.ts:64-66）：short link 只在 challenges 頁與題目頁，畫面顯示去掉 scheme，完整 origin 只在 JS bundle 或剪貼簿。信心高。建議：寫明觀察檔案（例如 `challenges.html` 的 short link 文字等於去 scheme 的 origin 加路徑，或在 `assets/*.js` 搜尋 origin），擴充 S7 輸出。
- **V-7** AC-A8 的失敗方向沒有 seam（spec:197–201、232；T17 seam「—」）：pristine 測試只在真實樹執行沒有 fixture 入口；「the manifest is upstream's」的範圍不明（T17 只檢查 `repository.url`，`version`、`author` 算不算）；是否與守衛共用 T15–T16 的判定函式沒寫。信心中高。建議：判定邏輯拆成函式加 S5 式 fixture 入口，列出 manifest 比對欄位。
- **V-8** AC-O1「accepts exactly the form of T24」沒有正向文法（T24–T25、T30）：「invalid label」未定義；disposition C-18 的「only `[a-z0-9-]` labels」沒寫進 traceability；`https://-a.com`、`https://a_b.com`、`https://localhost`、大寫主機名稱無法判定。信心中高。建議：寫出 label 正規表示式與 label 數量下限。
- **V-9** 條件是「旗標有給」或「有效設定（含繼承）」沒有定義（spec:125–133、181；T26–T31、T35–T37、T59；AC-B1；disposition C-2）：繼承 `github-pages` 後改 `--repo` 是否重新推導 origin；繼承 `cloudflare-pages` 時給帶路徑的 `--origin` 是否拒絕；繼承 `rebrand` 是否每次都進 rebrand 模式。推論：繼承 `host` 再給 `--base /x/` 允許，產生的 `settings` 同時有 `host` 與 `base`，重放時觸發 T35 參數錯誤，與 US9 矛盾。信心中。
- **V-10** AC-A1／T1 沒有限定不帶 `--rebrand`（spec:225；T1；CONTRIBUTE.md:200、214）：round 1 V-4 的這項主張 disposition 只限縮了 AC-A2。信心高。建議：AC-A1、T1 加「without `--rebrand`」。

## P2

- **V-11** 空字串 `SITE_BASE`：spec「set but does not match → throw」與 T42 要求空字串得 `/` 不一致；A9 為字面值時不合法的 `SITE_BASE` 會不會丟錯未寫。建議：「以 `||` 之後的值驗證」。信心中。
- **V-12** T71 的 `SITE_BASE=/x/` build 不在 S7 指令序列：在哪份 export、要不要跑 `test:smoke`（會 404）、是否算進「every command exits 0」。信心中。
- **V-13** S7 沒列出 fork-init 指令本身與參數值；站名含 `'`、`"` 時靜態 HTML 轉成 entity，「equal／ends with」要不要先解碼。信心中。
- **V-14** AC-X2 判定基準：「asset URLs」範圍（favicon 不在 `/assets/`、外部網址）；「the ticket that changes the VitePress config」可能多張；production `<title>` 取哪頁、哪個時間點。信心中。
- **V-15** doc anchor 以外的警告（T29、T33、T34、T36）沒有可斷言的內容；同一次執行同時出 T29 與 T36 警告時分不出。信心中。
- **V-16** 紀錄驗證邊界：`settings`／`applied` 缺少子欄位或未知子鍵；`settings: null` 明寫與缺少是否同等；缺 `upstream` 時維持 null 或補上；`name`、`description`、`rebrand` 子欄位規則。信心中。
- **V-17** 注入 `fs` 介面未定義：「write call」算 temp 寫入、rename 或 mkdir；「atomic」如何觀察；rebrand 的目錄列舉是否經過 `fs`。信心中低。
- **V-18** 守衛相關名詞與路徑：「rewrite-list」沒有定義；slug 比對是否區分大小寫；`scripts/fork-init*.ts` 涵蓋不到 `scripts/fork-init/` 子目錄；新的 cross-OS job 放在哪個 workflow 檔沒寫（不在 `quality-gates.yml` 時守衛會在上游失敗）。信心中。
- **V-19** AC-H5／T41 只檢查兩個字串不存在；範本 header（deploy.yml.template:18、20-21）「`--base /<repo>/` 會寫成字面值」「使用者站用 `--base none`」不再成立而 AC 仍通過；「base comes from configure-pages」沒有正向檢查。信心中。
- **V-20** AC-D1 的移除清單是摘要不是逐字字串且不完整：README.md:173 的 `base: process.env.SITE_BASE ?? '/'` 與「每個資源都會 404」不在清單；「documents …」與 T74「Same content changes」需詮釋（README.md:81、173、175、203）。信心中。
- **V-21** AC-D3「OQ-004 records the Cloudflare rule」沒說是哪條。信心中低。
- **V-22** AC-A2 判定粒度：config 同時有 A6 與 A9，「value is not being set」逐檔或逐 anchor；「manifest changes only in A1 fields」是位元組或值層級（T4 允許重新序列化）。信心低中。
- **V-23** A6、A7 辨識規則沒處理行尾註解（`name: WXL # c`）或含 `#` 的 plain scalar。信心低。
- **V-24** AC 編號從 AC-P1 跳到 AC-P3，缺 AC-P2，無法確認是刪除或遺漏。信心低。
- **V-25** AC-R8「passes unchanged」範圍不明：共用 `writeFixture`（fork-init.test.ts:13-84）一定要改（A9 形式、拿掉 socialLinks）；`--base none` 的 parse 測試（:125-130）期望 `null`，而 `settings.base` 記 `"none"`，parse 回傳值是否跟著變。信心低中。

**等級統計：P0 0（V-1、V-2 若 AC 文字不能改則為 P0）、P1 10、P2 15，共 25。**
