# Stage 8 端對端驗證：T-0077（版面切換）

## 範圍

- 票：`.proj.tickets/0010-primary-locale-layout/T-0077-layout-switch.md`「## Stage 8」；列的定義：`traceability.md` 修訂 2.5 的「Stage 8 plan」（fixture 表 D119，V 列）。
- 受測的票分支 HEAD：`d880e51bf60c773626004467b6e88b66a02c42a2`（rebase 前；base `040a5ec`）。
- 日期：2026-11-22。使用者在對話中核准第 8 階段各項（「全部照建議」），並親自同意建立 F-3（「由你建立」）。

## Fixture

| Id | 內容 | 位置 |
|---|---|---|
| F-1 | `stage8/T-0077` = `d880e51` + `010f23b`：題目 `zh-only`（#999，只有繁中說明頁）、文章 `platform/en/stage8-en-only.md`（只有英文）、靜態檔 `platform/public/zh-TW/stage8.txt`；沒有 `range.json`，P = zh-TW | `https://stage8-t-0077.wxl-platform.pages.dev`（部署主機 `c1d03936.wxl-platform.pages.dev`，Cloudflare Pages check run 2026-11-22T05:37:48Z success） |
| F-2 | `stage8/T-0077-en` = `d880e51` + `b5496ee`：`range.json` `{"primaryLocale": "en"}`、題目 `en-only`（#998，只有英文說明頁） | `https://stage8-t-0077-en.wxl-platform.pages.dev`（`1e0fee89…`，2026-11-22T05:40:34Z success） |
| F-3 | `CXPhoenix/wxl-e2e-0010-t0077`（public）：在 F-1 head 打包的 create-wxl tarball（`dist/source.json` 的 commit = `010f23b`），以 `CREATE_WXL_COMMIT=010f23b… npx --yes --package <tarball> create-wxl …` 產生，樹裡沒有 `create-wxl/`。第一次部署 `5f14451`（P = zh-TW，run 44993436230）；第二次部署 `2986e7c`（`range.json` 加 `"primaryLocale": "en"`、刪除 `zh-only`，run 44994140903）。兩次都用 `workflow_dispatch`，沒有 `v*` tag | `https://cxphoenix.github.io/wxl-e2e-0010-t0077/` |
| F-6 | 票分支（`d880e51`）在 scratch 目錄的 clone，每組各自一份，不 push，用完刪除 | 本機 |

fixture 的 commit 都用專案的 `tw-emoji-commit` 產生訊息。`create:challenge --backend flask` 產生的 `app.py` 被 pre-commit hook 擋下（見「發現」第 1 項），所以 fixture 的 `app.py` 拿掉了 `if __name__ == '__main__': app.run(host='0.0.0.0', port=8000)` 兩行。

## 驗證的表面

- **terminal**：`curl`（預覽與 GitHub Pages 的回應）、`pnpm docs:build`／`docs:dev`／`docs:preview`／`build`／`test`／`test:smoke`／`test:challenges`，在 F-6 或 F-2 的 clone 上執行，執行時拿掉 `GITHUB_REPOSITORY`、`WXL_EXPECT_UPSTREAM`。
- **瀏覽器**：agent-browser（headless Chromium，透過 CDP），每組用獨立的 `--session`，storage 互不相通，也不碰使用者自己瀏覽器的 storage（所以 OQ-018 的「先記錄、事後還原」沒有用到）。每一次請求前清掉 `localStorage`、`sessionStorage` 與 IndexedDB `challenge-tools`，再開新分頁。題目頁都點開頁面內的 Browser 分頁，並確認題目 app 已載入（例如 FileHub 的登入畫面）——hard rule 4 的表面。
- 每一組由 executor（Sonnet 5.5 medium）執行，再由另一個 agent（Opus 5.5 high）只看原始紀錄與截圖獨立判定。

## 結果

| 列 | 表面 | 結果 |
|---|---|---|
| V-S2（S61，關卡） | terminal，F-1 alias 與部署主機 | **通過**：19 個輸入沒有任何站外 `Location`（見下方原始輸出） |
| V-S1（S57、S58 第一跳、S59、S60） | terminal `curl -sI`，F-1 | 通過；S60 只記錄的項目見下方 |
| V-S4（S62）第一跳 | terminal，F-2 | 通過 |
| V-S4 瀏覽器部分 | agent-browser，F-2 | 通過 |
| V-S3 | agent-browser，F-1（5 個網址 × stored none／en／zh-TW） | 通過 |
| V-S5 | agent-browser，F-1 與 F-2 | 通過（list view 每一列都有複製按鈕，文字是 `wxl.browserlab.online/<清單語系>/c/NNN`；只讀文字，沒有點）。grid view 沒有複製按鈕，base `040a5ec` 也一樣（`ChallengeList.vue` 只在 list 列放 `ShortLinkShare`），記成觀察 |
| V-S6 | agent-browser，F-3 第一次部署 | 通過 |
| V-S7 | terminal，F-2 的 clone（hook 已安裝，兩個 commit 不 push） | 通過 |
| VA1a–VA1m | agent-browser，F-1 | 通過。VA1c（stored en）：origin 沒有學習紀錄，session gate 沒有出現，所以「gate 決定後才出現提示」的先後沒有觀察到；有 gate 的情況由 site-smoke 的 missing-translation 測試涵蓋 |
| VA2a–VA2h | agent-browser＋`curl`，F-3 第一次部署 | 通過 |
| VA2i–VA2l | agent-browser＋`curl`，F-3 第二次部署 | 通過 |
| VA3a–VA3e | agent-browser，F-2 | 通過 |
| VA4 | terminal，F-6 | 通過：三個 grep 都沒有輸出，`test -e .vitepress/theme/Layout.vue` 為假；`pnpm test` 7268 個測試中 7267 通過、1 略過、0 失敗，exit 0（重跑，見「事件」） |
| V-B1 | terminal，F-6 每個情況一份複本 | 通過：PL-E01–PL-E14、PL-E17、PL-E18 每個情況 exit 1，第一個 PL 行逐字符合，只有一種 PL 代碼；PL-E08 在 build、dev、preview 都 exit 1，dev 與 preview 的 PL 行只印在 stderr；B74 在 P = zh-TW 時是 dead link（exit 1），在 P = en 時建置成功，建置出的 href `./../../reference/attack-log-export-format` 從 `/zh-TW/guide/notes` 解析到 `/reference/attack-log-export-format`，該頁存在且 `lang="en-US"` |
| V-B2 | terminal，F-6 | 通過 |
| V-B3 | agent-browser，F-1 | 通過，附一項 T-0079 範圍的狀態：繁中 `/challenges` 的 h1 與副標題是英文 `Challenges`／`Choose a challenge to begin`（CS1、CS2，L24 歸 T-0079；base 就是寫死的英文）。繁中 notes 頁照過渡文字只寫出頁名、沒有連結 |
| V-B4 | agent-browser，F-3 第二次部署（前綴與 stored 值都對調） | 通過；每個 href 都只帶一次 `/wxl-e2e-0010-t0077/`（B61、B70、B71） |
| V-B5 | terminal，`65de8c0` 的樹＋本 epic 的 `.vitepress/`、`scripts/`、`platform/shared/`、`package.json`、HEAD 的 `pnpm-lock.yaml`（核准的偏離） | 通過：exit 1，只有 PL-E08；`wasm:build` 結束到 PL-E08 之間只有 pnpm 自己的 banner |
| V-B6 | `pnpm docs:dev`＋agent-browser，F-6 | 通過（重跑，每一步印出 `range.json` 內容與伺服器 PID） |
| V-B7 | terminal，F-2 的 clone | 通過：`pnpm test --run` 7156 個中 7082 通過、74 略過、0 失敗（重跑）；`WXL_SMOKE_PAGES=1 pnpm build && pnpm test:smoke` 103 通過、9 略過，略過的都帶上游判斷的理由。補充（核准）：F-3 本機樹（沒有 `create-wxl/`）跑 `pnpm test --run`，7082 通過、74 略過、0 失敗 |
| VL3 | agent-browser，F-1 | 通過 |
| VL5 | agent-browser，F-3 第一次部署 | 通過 |
| VL6 | 建置那一半在 F-6，請求那一半打 F-1 | 通過：一般建置後 PAT4 通過、`WXL_SMOKE_PAGES=1` 建置後 PAT4 失敗；F-1 的 `/en/smoke-fixtures/english-only` 回 404 not-found 頁 |
| VL7、VL8 | `pnpm docs:dev`＋agent-browser，F-6 | 通過；VL8 的 `pnpm test:challenges` 4 通過 |
| V-Y1–V-Y5、V-Y7 | terminal，F-6 | 通過（V-Y7 以保留下來的腳本重跑一次，輸出與預期一致） |
| V-Y6 | agent-browser，F-1 | 通過；selected-excerpts 的 Source 清單是 `app.py` 加上那 10 個 `source_files`（顯示順序是 app 檔在前，`scripts/challenge-source-display.ts:159`） |
| V-Y8 | `pnpm dev`＋agent-browser，F-6 | 通過 |

不在本票跑的列：VL1、VL2、VL4、VL9（只連到 T-0079 的列）；V-U1–V-U5（等 T-0081 的搬家，S51、S52、A12、A16、B84 也改在 T-0081 觀察）。

### S61 原始輸出（F-1 alias；部署主機的結果相同，`off-origin or unparsable: 0`）

方法：`curl -s -o /dev/null --path-as-is -D -`（GET，不是 `-I`），再用 `node -e` 比較 `new URL(location, origin).origin === origin`。腳本在本機 handoff 的 `s61_local.sh` 上補了修訂 2.5 的兩個 `/zh-TW/guide/…` 輸入。

```
/zh-TW/challenges                    302  Location: /challenges                  same-origin
/zh-TW/                              302  Location: /                            same-origin
/zh-TW//evil.example                 404  Location: (none)                       no redirect
/zh-TW//evil.example/x               404  Location: (none)                       no redirect
/zh-TW///evil.example                404  Location: (none)                       no redirect
/zh-TW/%2F%2Fevil.example            404  Location: (none)                       no redirect
/zh-TW/%2f%2fevil.example            404  Location: (none)                       no redirect
/zh-TW/%2F/evil.example              404  Location: (none)                       no redirect
/zh-TW/%252F%252Fevil.example        404  Location: (none)                       no redirect
/zh-TW/%5Cevil.example               404  Location: (none)                       no redirect
/zh-TW/%5C%5Cevil.example            404  Location: (none)                       no redirect
/zh-TW/%5C/evil.example              404  Location: (none)                       no redirect
/zh-TW/%09/evil.example              404  Location: (none)                       no redirect
/zh-TW/%0A/evil.example              404  Location: (none)                       no redirect
/zh-TW/%0D/evil.example              404  Location: (none)                       no redirect
/zh-TW/guide//evil.example           302  Location: /guide/evil.example          same-origin
/zh-TW/guide/%5Cevil.example         302  Location: /guide/%5Cevil.example       same-origin
/zh-TW/\evil.example                 404  Location: (none)                       no redirect
/zh-TW/\/evil.example                404  Location: (none)                       no redirect
```

### V-S1 與 S62 原始輸出（`curl -sI`）

```
F-1（P = zh-TW）
S57  /c/001 /zh/c/001 /zh-TW/c/001 → /challenge/door-is-open/；/en/c/001 → /en/challenge/door-is-open/
     /c/999 /en/c/999 /zh/c/999 /zh-TW/c/999 → /challenge/zh-only/（全部 302）
S58  /en/c/door-is-open → /en/challenge/door-is-open/；/en/c/zh-only → /en/challenge/zh-only/
S59  /zh-TW/c/001 → /challenge/door-is-open/；/zh-TW/c/door-is-open → /challenge/door-is-open/
S60  /zh-TW/ → /；/zh-TW/challenges → /challenges；/zh-TW/guide/notes → /guide/notes；
     /zh-TW/challenge/door-is-open/ → /challenge/door-is-open/（全部 302）
     只記錄、不判定：/zh-TW 404；/zh-TW/challenges?x=1 302 → /challenges?x=1；
     /zh-TW/en/guide/notes 404；/zh-TW/zh-TW/guide/notes 404；/zh-TW/stage8.txt 200（照原址提供）
F-2（P = en）
S62  /c/001 /en/c/001 → /challenge/door-is-open/；/zh/c/001 /zh-TW/c/001 → /zh-TW/challenge/door-is-open/
     /c/998 /en/c/998 /zh/c/998 /zh-TW/c/998 → /challenge/en-only/（全部 302）
     /zh-TW/challenges 200；/en/challenges 404（沒有轉址）
```

## OQ-030 第一次在瀏覽器裡觀察到

依使用者核准的規則，F-3 上只有介面字串語言不對時記成 OQ-030 的觀察，不算本票失敗；路由、網址、落點全部正確。

- **F-3 第一次部署（P = zh-TW，base `/wxl-e2e-0010-t0077/`）**：`/en/challenges` 與 `/en/` 的靜態 HTML 是英文；hydration 之後，`$t` 字串與日期變成繁中（「所有難度」「所有類別」「排序：ID」「5 道挑戰」「平台統計」「題目總數」「最新題目」「三步驟快速開始」「2026年4月2日」）。
- **F-3 第二次部署（P = en）**：繁中頁 `/zh-TW/`、`/zh-TW/challenges`、`/zh-TW/challenge/door-is-open/` 的 `$t` 字串顯示成英文（「Platform Statistics」「Search challenges, descriptions, tags…」「Sort: ID」「4 challenges」「Submit Flag」）。
- **對照 F-1（Cloudflare，base `/`）**：hydration 後所有字串維持英文，沒有翻轉。

結論與 OQ-030 的推論一致：base 存在時 `detectLocaleFromPath` 收到帶 base 的路徑。依先前的決定，之後另開一張 test-first 的票，修法會改到 A29，屬於新的 D 編號，屆時先給使用者決策摘要。

## 發現與處置

1. **既有問題（base `040a5ec` 相同）**：`pnpm create:challenge --backend flask` 寫入的 `app.py` 含 `app.run(host='0.0.0.0', port=8000)`（`scripts/create-challenge.ts:205-206`），`scripts/challenge-analyze.ts` 的 localhost 規則把它當警告，pre-commit hook 把警告當錯誤（`scripts/challenge-lint-staged.ts:111-113`），所以剛建好的 flask 題目不能直接 commit。`challenge:verify --layers L1,L2` 不受影響（V-Y1 通過）。不在本票範圍；建議另開票。
2. **vitest 不顯示 D124 的略過理由**：`describe.skipIf(upstreamOnlySkipReason(…))` 把理由字串只當條件用，vitest 輸出看不到理由；只有把理由寫進標題的 `challenge-validate` 案例看得到。Playwright 的 `test.skip(condition, reason)` 有顯示。行為正確（該略過的都略過了），只是 D124「reports skipped, with the decision's reason」在 vitest 這一半做不到。V-B7 歸 T-0080（AC-61）再跑一次，留給 T-0080 處理。
3. **完整 vitest 時有子程序對 `localhost:3000` 連線被拒而崩潰**：stderr 印出 unhandled `ECONNREFUSED`，但 suite 結論不受影響（exit 0）。在三棵樹（F-6、F-2、F-3）都出現。`NODE_OPTIONS` 的診斷 hook 沒有抓到，表示那個子程序是以自訂環境啟動的。以 `--no-file-parallelism --reporter=verbose` 逐檔跑，錯誤出現在 `tests/unit/workflows/challenge-verify-timeout.test.ts` 執行期間；單獨跑這個檔案可重現（12 通過，stderr 6 行 `ECONNREFUSED`），在 vitest 之外 `import` 同一個 `playwright.config.ts` 則不會。這個檔案從 T-0000（`72327e2`）就在，於 happy-dom 環境（`vitest.config.ts` 的 `environment: 'happy-dom'`）裡 `import` `playwright.config`。推論（沒有逐行追進 happy-dom）：happy-dom 的預設網址是 `http://localhost:3000`，它以子程序執行同步請求，連線被拒時那個子程序崩潰。既有問題，不影響測試結論；可在該檔加 `// @vitest-environment node` 消除。不在本票範圍，列為小型清理候選。
4. **push 到 F-3 的 `main` 沒有觸發 Quality Gates**：新建的 repository 只跑了手動觸發的 Deploy，和 0007 回顧記錄的情況相同；兩個發布用的 workflow 都有 `github.repository == BrowserLaboratory/wxl-platform` 的條件，在靶場不會執行。只記錄。
5. **SR1 修正輪剩下的 6 項 P2**：依使用者核准處置（見票的 Comments 2026-11-22 第 8 項），在 `2d7fb3e`：兩份 README 補上「路徑正好是頂層頁面名稱的檔案」這個例外；generator 的 header 補上頁面判定排除的資料夾；`scripts/pre-commit.sh` 的 header 重排到 100 字元內；`runStaged` 的 JSDoc 改正；traceability 修訂 2.6 說明 D61/K1 的容量與 S69/S-O7；`redirects.test.ts:383` 維持。只動文件與註解。

## 事件：磁碟空間用完

13:39–13:55 之間有多組同時建立 clone、建置與跑完整 suite，資料磁碟一度只剩 128 MiB，期間的 vitest（VA4、V-B7、F-3 補充）因 `ENOSPC` 在 `pre-commit-sh.test.ts`、`challenge-keygen.test.ts` 失敗，部分截圖沒有存下來。這些結果全部作廢，空間回到約 12 GiB 後依序重跑（14:16–14:31），表中數字都是重跑的結果。同時期的瀏覽器列由審查 agent 逐列核對，只有截圖缺漏，相關的列都另有文字紀錄或補做。

## 核准的偏離（使用者 2026-11-22）

V-B5 改在 F-6 的複本上跑；VL6 拆成 F-6 建置與 F-1 請求；V-S1 加 `/en/c/door-is-open`、`/en/c/zh-only` 的第一跳；S61 補兩個輸入並記錄用 GET；V-B7 加跑 F-3 本機樹；F-3 兩次部署都用 `workflow_dispatch`；fixture 題目保留 `src/`、題號手動改成 999、998；V-B4 對調前綴也對調 stored 值；複製按鈕只讀文字。

## 證據

逐列的指令、輸出與截圖存在 session 的 scratch 目錄 `s8/evidence/`（不在 repo 裡，重開機可能消失）；上面已把關卡與轉址的原始輸出抄進本檔。每一列都可以照 traceability 的列文字與本檔的 fixture 重跑。
