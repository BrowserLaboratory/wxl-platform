# Round 2 處置 — epic 0009-npm-trusted-publishing

這份表是依 `round-2.md` 的群組 H1～H11 整理的。使用者在 2026-11-12 對三個問題都選了建議選項，原話如下：

| # | 裁決 |
|---|---|
| U8 | 「Follow RP2 (Recommended)」 |
| U9 | 「Allow it, update docs (Recommended)」 |
| U10 | 「Add as MN7 (Recommended)」 |

處置都寫進 revision 3，只做自我檢查，不再送審（兩輪已到上限）。表中的編號一律指 revision 3。

## C 軸

| ID | 處置 |
|---|---|
| C-1 | 套用（H1）。新增 W8，封閉 workflow、job、step 三層的鍵集合，並規定 `runs-on` 為 `ubuntu-latest`；新增 W08 列；self-check 改寫 |
| C-2 | 套用（H2）。S8-04 引述 MN2；MN 依序執行：MN7 → MN2 → MN1；F1 只寫「MN2 wrong」，不再寫 missing，因為 environment 不存在時會被自動建立 |
| C-3 | 套用（H3）。AC-7／S8-05 改為「第一個被核准、而且通過 RP6 的 `v<V>`」；新增 F6（核准後的失敗：deprecate，再發下一個 patch）與 S8-07 |
| C-4 | 套用（H7）。MR1 改成一行一個鍵，五行逐字列出；O1 (a) 改用逐字比對一行，不再走結構掃描；M02 新增反例 |
| C-5 | 套用（H9、U9）。spec 改為說明實際狀況：create-wxl 的測試只在上游執行；在轉換過的 fork 上，C45 本來就會因 version 失敗。default mode 下的 GitHub fork 會保留上游 URL，這點由 O1 (b) 記錄，並依 DS2 同步 skill 與 README；pristine 檢查不納入這一行，因為它只在 rebrand 時被改寫。B3 補上「`range:upgrade` 也會把這些檔案帶進靶場」 |
| C-6 | 套用（H3）。RP5 加 (d)：`release.yml` 已成功；F4 涵蓋 in progress 與 cancelled；F5 改寫「pending 會被取代」；新增 F7（核准後重跑）；F2 的非 main Release 由 F3 的刪除 Release 規則承接；MN6 的時機改為「任何新 tag 或重跑之前」 |
| C-7 | 套用（H6）。S8-04 加上 trusted publisher 數量為 1，以及 `npm access list collaborators create-wxl` 只列出上游一人 |
| C-8 | 套用（H5）。名詞表定義 code ticket；RP0 與 AC-8 對齊為三項；改用 `npm pkg get repository`；RP0 先跑 install |
| C-9 | 套用。AC-3 改為「contains K11's strings」 |
| C-10 | 套用（H4）。S5 分成行檢查與字串檢查，測試放在 `create-wxl/test/`；D02 在 stage 6 由人工閱讀判定；OQ-027 寫明「docs ticket 建立、release ticket 填入」 |
| C-11 | 套用。DS1 加上 C43 |
| C-12 | 套用。K03～K05 加上非字串值；K06 加上陣列與從 prototype 繼承的情況；set 指 own property；K4 用 `trim()` 判定 |
| C-13 | 套用。K12 分 (a) annotated、(b) 本機 lightweight 加上遠端 annotated 兩種情況 |
| C-14 | 套用。W4／W04 比對 raw text 裡同一行結尾的註解 |
| C-15 | 套用。W7 加上 `NPM_CONFIG`、`npm_config_`、`--registry`；新增 MR2／M03：repo 不追蹤任何 `.npmrc` |
| C-16 | 套用。「stage 的 log 是否印出 shasum」列入未知事項；RP6 改為重試三次、間隔五分鐘 |
| C-17 | 套用。新增 W12：在暫存 repo 驗證 ancestry 指令的 exit 0 與 exit 1 |
| C-18 | 套用。B2 寫明依賴 0005 的 C42，以及本 epic 經由同一個 gate 的 K06 |
| C-19 | 套用（H10）。D10 寫明 F2 的修正是本 epic 新開的 code ticket，必須在 release ticket 再打 tag 之前落地 |

## V 軸

| ID | 處置 |
|---|---|
| V-1 | 套用（H4）。行檢查用 trim 後去掉一個 `\| ` 或 `- ` 前綴的逐行比對；字串檢查先收合空白再比對 |
| V-2 | 套用（H4）。第 1 行是標題，「upstream only」放在標題之後第一個非空行 |
| V-3 | 套用（H5）。改用 `npm pkg get repository` |
| V-4 | 套用（H3）。見 C-3 |
| V-5 | 套用（H6）。S8-04 逐一列出期望值，紀錄寫在 release ticket |
| V-6 | 套用（H2）。見 C-2 |
| V-7 | 套用（H6）。刪掉 RP5 原本的 (d)；shasum 由使用者自己讀 run log；不印 shasum 時改比其他欄位 |
| V-8 | 套用（H1）。見 C-1 |
| V-9 | 套用（H7）。見 C-4 |
| V-10 | 套用。見 C-10 |
| V-11 | 套用。見 C-9 |
| V-12 | 套用。見 C-13。stub 的部分照舊；CI 的實質證據由 S8-01 提供，這一點已寫在 self-check 的脈絡裡 |
| V-13 | 套用（H5）。刪掉「沒有 npm log」這個代理指標；AC-8 補上 CI 那一項 |
| V-14 | 套用。見 C-8、C-19 |
| V-15 | 套用。RP6 (b) 規定讀取 attestation URL 指向的 statement；「staged 後核准的版本有沒有 provenance」列入未知事項；核准後的失敗走 F6 |
| V-16 | 套用。RP5 規定「至少比對到一個欄位，否則由使用者決定，並在紀錄寫明」 |
| V-17 | 套用。見 C-14；W09 改用測試裡的註解原文定位，不寫行號 |
| V-18 | 套用。R2 改成：`AGENTS.md` 的 `## Reference` 一節出現 `docs/agents/release.md`；D02 由人工判定 |
| V-19 | 套用。release.md 只在 MN1、MN2、MN7 把 owner 和 repository 分開寫，不寫出完整 slug |
| V-20 | 套用。spec 的步驟改成八步，和 W6 編號一致；F1 的外部原因只列表內的項目 |
| V-21 | 套用。新增 W11：T52 的 fixture 加上 `create-wxl/package.json`，rebrand 後 url 與根目錄相等 |
| V-22 | 部分套用。RP1、RP2、RP4 的紀錄由 S8-05 加上 release ticket 的紀錄承接，不另開 S8 列；MN 的時序由 S8-04 引述 |
| V-23 | 套用。S8-06 由使用者回報 |
| V-24 | 套用。F4 改用「outside the repository」來判斷是否重跑，例如 runner、網路、下載失敗 |
| V-25 | 記錄。`JSON.stringify` 不會跳脫 U+2028／U+2029，屬於極端情況，不另訂規則；set 的定義改為 own property（見 C-12） |

## K 軸

| ID | 處置 |
|---|---|
| K-1 | 套用（H9、U9）。O1 修正前提，改成第三類位置；DS2 同步兩份 skill 與兩份 README |
| K-2 | 套用（H10）。新增 O4，寫明 release ticket 在各階段的 status；O3 (b) 寫明它的 PR 依 stage 6～7 的紀錄標為 ready |
| K-3 | 套用（H7）。見 C-4 |
| K-4 | 套用。DS1 加上 C45 列與測試標題、0005 spec 的 :195-196 和 :198（O5）；DS2 加上 0006 spec 的 B2 |
| K-5 | 套用。Problem Statement 依 T-0029、T-0067 改寫：3.0.0 是 X9 通過、上傳時 E404；3.1.0 是 X9 誤報 |
| K-6 | 套用。見 V-20 |
| K-7 | 套用。W09 用註解原文定位，不寫行號 |
| K-8 | 套用。DS1 規定：寫進 0005 的地方一律加「0009's」前綴 |
| K-9 | 套用。名詞表寫明：npm 用語只用在英文文件，不進 GLOSSARY；npm 動作一律寫「stage on npm」，pipeline 階段一律帶編號 |
| K-10 | 套用。DS2 (6)：GLOSSARY 的 設定紀錄 補一句「上游發布過」以 tag 為準。README 不另外說明這個落差，見 Out of Scope |
| K-11 | 套用。O3 (c) 覆寫瀏覽器證據的規定，因為 npm 頁面需要使用者本人登入；不延伸 OQ-022，改開 OQ-028 |
| K-12 | 套用（U8）。RP2 與 R2 寫明不使用 `--tags`，並在這個 repo 優先於使用者的一般規則 |
| K-13 | 套用。R2 規定 CONTRIBUTE.md 的 Maintainer Setup 加一行，指向 release.md 的 MN2 |
| K-14 | 套用。F3 寫明 tag 保留（MN7 禁止刪除）；GitHub Release 只在疑似未授權時刪除 |

## R 軸

| ID | 處置 |
|---|---|
| R-1 | 套用（H8）。D8 把 ancestry 步驟列為 guard；RP2 由使用者確認 SHA；RP5 (c) 比對 commit 與確認的 SHA；B1 改成「at any commit」 |
| R-2 | 套用（H2）。見 C-2 |
| R-3 | 套用（H8、U8）。RP1 寫明 skill 不建也不推 tag；RP2 不使用 `--tags`，推之前先檢查遠端；R2 加上字串 `never \`git push --tags\`` |
| R-4 | 套用。RP5 (d) |
| R-5 | 套用。RP5 (c) 允許使用者在自己已登入的終端機執行 `npm stage view`；比對不到任何欄位時由使用者決定 |
| R-6 | 套用。RP5 (a) 改為「整體只有一筆 entry」；RP2 遇到遠端已有同名 tag 就停止，不 force push |
| R-7 | 套用（U10）。新增 MN7 tag ruleset，由 S8-04 引述 |
| R-8 | 套用。F5 改寫，cancelled 歸入 F1；RP2 一次只推一個 tag |
| R-9 | 套用。F1 涵蓋 X6 的網路錯誤（以 log 判斷）；F2 列出 ancestry 步驟的 exit code；self-check 刪掉「partition」 |
| R-10 | 套用。MN6 規定每次重建都要重新回報六個欄位；MN6 的時機改為「任何新 tag 或重跑之前」 |
| R-11 | 套用。見 C-5 |
| R-12 | 套用。M02 的反例加上 `bugs.url`、`homepage` |
| R-13 | 套用。B1 列出 job 內所有能要求 token 的程式碼 |
| R-14 | 套用。F3 規定疑似未授權時刪除 GitHub Release，tag 保留 |
| R-15 | 套用。F7 記錄 T-0067 的 409 為可能的後盾；「rejected 的版號能否重用」列入未知事項 |
| R-16 | 套用。見 V-7 |
