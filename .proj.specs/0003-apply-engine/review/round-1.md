# Stage 3 round 1：總覽 — epic 0003

審查版本：spec.en.md blob `e28240068a56ee1fa90c476c0846f3e232576e91`、traceability.md blob `aec390184f738b6e9fa04f0cfc6826b1649cca74`，HEAD `c0f7edf`，凍結 prompt `review/prompt.md`（blob `2a541cce2d3b69b8c529f568a516e32888df32f3`，四軸、評分、輸出段落與 0002 逐字相同）。四位 `harness-reviewer` 平行啟動，各審一軸。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-1-C.md` | 1（C-1） | 13 | 17 | 31 |
| 2 可驗證性 | `round-1-V.md` | 0（V-1 附註可視為 P0） | 17 | 14 | 31 |
| 3 契約衝突 | `round-1-K.md` | 0 | 8 | 13 | 21 |
| 4 紅隊 | `round-1-R.md` | 0 | 9 | 14 | 23 |
| **合計** | | **1** | **47** | **58** | **106** |

對照 0002 round 1：146 項、P0 2、P1 68。G1、G3、G4、G6 的根本原因沒有再出現；新的發現集中在本 spec 自己引入的規則（單一 base 定義、紀錄語意、override 清單）。

## 依根本原因歸群與建議處置（待使用者裁決）

| 群 | 根本原因 | 發現 | 建議處置 |
|---|---|---|---|
| H1 | 單一 base 定義的語法形狀與 `--base none` 沒寫死 | **C-1（P0）**、K-2、R-2、V-6、V-7、C-21 | 寫出逐字形狀：`const siteBase = process.env.SITE_BASE \|\| '/'`（空字串也回 `/`）；`base: siteBase` 與三個 head href 都用它；`--base /x/` 把右側改成字面值 `'/x/'`；`--base none` 改成字面值 `'/'`（不再刪除）；上游形式以逐字文字比對；補「缺少、多次」列（exit 1） |
| H2 | GitHub Pages 的 base 由 repo 名稱推，對自訂網域、user site 錯；沒帶 `--host` 的 workflow 行為不明 | K-1、V-2、C-2、C-8、R-3、R-23、K-19、K-12、C-22 | 採 R-3：範本把 `actions/configure-pages` 移到 build 前，`SITE_BASE` 用它的 `base_path` 輸出（已考慮自訂網域與 user site）；因此 T33 拒絕取消，user site 推導 origin `https://<owner>.github.io`、自訂網域需給 `--origin`；沒帶 `--host` 維持今天的行為（安裝 workflow），寫明並保留既有測試；Cloudflare 子路徑：README 移除該選項 |
| H3 | `settings` 只記最近一次參數；`--base none` 與未給都是 null | K-5、R-6、V-8、C-5 | 合併語意：未給的參數沿用 `applied`；`base` 以 `"none"` 表示移除；符合詞彙表「每一項設定的值」 |
| H4 | 被推翻的既有測試與註解沒有逐一列名 | K-3、K-4、V-3、V-5、C-3、K-9、K-11、C-23 | traceability 新增「被推翻的契約」表：逐一列測試名稱（fork-init 174-190、192-199、201-208、371-378、fork-template-parity 128-136）、改寫後的斷言，以及要同步修改的註解（config、範本、parity、toolchain-parity、shortLink、LocaleSwitcher） |
| H5 | `--rebrand` 與 keep list、紀錄的交互作用 | K-6、V-4、C-12、R-17 | rebrand 不再做全樹 slug 替換（slug 一律走 anchor）；四鍵改名排除 `range.json` 與 keep list；殘留清單排除 keep list 與紀錄裡刻意保留的上游 slug，並更新警告文字；AC-A1 限定不帶 `--rebrand` |
| H6 | 用舊引擎設定過、沒有紀錄的靶場；fork 自別人的靶場 | R-5、C-7、R-12、R-21、C-27 | 沒有紀錄時 `<from>` 取 manifest 的 `repository.url`（若不是上游）；版本只在 manifest 仍是上游時重設；doc anchor 同時改寫 `<from>` 與上游 slug（R-12）；fork 自別人靶場：保留對方紀錄，列為已知行為 |
| H7 | 推導出的 origin 沒驗證 | R-4、V-17、C-9 | 推導值也必須通過 AC-O1，不通過就 exit 1 並要求 `--origin` |
| H8 | code anchor 的辨識與既有值剖析 | R-7、R-8、V-10、V-11、C-16 | 每個 anchor 寫出辨識規則與反例；既有值必須是可剖析的 JS／YAML 雙引號或單引號字串（含跳脫），否則 exit 1；替換用 function replacer；T15 列入 `$&` 等樣式；S3 的輸出加上 `title`，frontmatter 以 `yaml` 套件（已安裝則用之）解析 |
| H9 | 部分失敗與原子性 | R-9、R-10、C-6、V-18、C-15、V-13、K-7 | `<from>` 同時涵蓋 `settings.repo` 與 `applied.repo`；每個檔案寫入用 temp 檔加 rename；S1 加上可選的 `fs` 依賴（seam 變動，需使用者核准）；T35 改為「第一次寫 settings 時建立」 |
| H10 | guard 設計 | R-1、C-4、V-15、C-26、C-31、R-19 | guard 以出現處為單位（改寫清單檔裡的非 anchor slug 也失敗）；是否在上游以 `GITHUB_REPOSITORY` 或 manifest 完全相等判斷；分類邏輯拆成函式、以 fixture 測 fail／skip／pass；另加上游專用的「上游原貌」測試（`range.json` 不存在、`SITE_ORIGIN`、A6、A7 是上游值） |
| H11 | 紀錄的值驗證、未知與缺少欄位 | V-14、C-10、R-18 | 子欄位套用 T31–T34 與 host 列舉；未知鍵保留並排在表列鍵之後；缺少的頂層欄位視為 null；範例改成逐字完整版；以 `JSON.parse` 後的純物件處理（不做深度合併） |
| H12 | Stage 8 驗證面 | V-1、C-14、V-23、V-24、V-25、K-17 | 匯出後 `git init && git add -A`；照 CI 順序（install → wasm:build → keygen → test → build → smoke）；明寫覆寫 workflow.md 的 stage 8 規定並新增 OQ 記錄非瀏覽器 harness；具體斷言（hero 文字相等、三個 href 回 200） |
| H13 | manifest 其他欄位 | R-11、K-10、V-9、C-11 | A1 列出全部會寫的欄位；`license` 只在第一次套用時寫入；新增「A 檔 anchor 以外的位元組不變」AC |
| H14 | 文件與詞彙 | K-8、V-26、V-21、K-18、K-21、V-27、K-20、C-17、K-14、K-15、K-16 | AC-D1 列出必須移除或改寫的 README 與 skill 段落（含 Node 下限）；skill 依 language.md 改用英文或明寫例外；spec 改用「repository slug」；詞彙表的「設定紀錄」補「版本可能不明」 |
| H15 | 其他 P2 | 其餘 | 逐項在處置表回應 |
