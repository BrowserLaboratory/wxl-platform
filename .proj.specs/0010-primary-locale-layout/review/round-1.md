# Stage 3 round 1：總覽 — epic 0010-primary-locale-layout

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`。送審版本：`spec.en.md` blob `f45f078`、`traceability.md` blob `5d3c16c`（第 1 版，含同一天的自我檢查）、working tree 的 `GLOSSARY.md` blob `b307335`，程式碼 HEAD `65de8c0`。四位 reviewer 皆為 `harness-reviewer`，各審一個軸，依凍結 prompt `review/prompt.md`。

送審的兩個檔案當時都還沒 commit，reviewer 直接讀 working tree。V 與 K 兩位這次沒有 shell，無法自行以 `git hash-object` 核對 blob，請主 session 確認；主 session 已核對三個 blob 一致（`review/disposition.md` 開頭）。C 從頭讀完 traceability；R 依紅隊需要分段讀了 traceability（Decisions、U-§1／§4／§5、Y-§2.1–2.5、S-§4.4–4.7、信任邊界、S36–S51、A14–A18、S59–S61 與第 8 階段的 F-1、F-2、V-S 列）。

## 統計

| 軸 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|
| C 完整性 | 0 | 6 | 14 | 20 |
| V 可驗證性 | 0 | 2 | 23 | 25 |
| K 契約衝突 | 0 | 2 | 13 | 15 |
| R 紅隊 | 0 | 2 | 14 | 16 |
| 合計 | 0 | 12 | 64 | 76 |

P1：C-1–C-6、V-1、V-2、K-1、K-2、R-1、R-4。沒有任何 reviewer 註明某則發現也可以主張 P0。V 軸逐條確認 AC 與矩陣列裡都沒有一律判 P0 的字眼（"appropriately"、"reasonably"、"as needed"、"where possible"）。

## 關卡結果

**四個軸都是零 P0，第 3 階段的關卡已達成。** 比照 0006 的先例（第 1 輪沒有 P0，第 2 輪不跑），本 epic 不跑第 2 輪；第 1 輪的處置套用為 spec 與 traceability 的第 2 版，再以自我檢查代替第 2 輪（traceability「Checks on revision 2」）。

## 群組

相關的發現合成一群。「新決定」欄是處置新增或改寫的 D 編號，都標為 "approved under the user's standing authorization of 2026-11-15"，實作前仍要以摘要請使用者確認（`docs/agents/workflow.md`）；「—」表示只修列、AC 或措辭，不新增決定。逐則、逐主張的處置見 `disposition.md`。

| 群 | 主題 | 發現 | 新決定 |
|---|---|---|---|
| G1 | hook 內的驗證與產生器讀不同的 `range.json`；hook × `range.json` 的變更方向不齊 | **C-2**、**R-4**、C-7 | D122 |
| G2 | hook 的觸發 glob 比「清單上的語系資料夾」寬（`public/`、`shared/`、清單外資料夾），連帶 W4 與 S36／AC-31 不一致 | C-8、K-6、R-6 | D126 |
| G3 | 讀 `range.json` 的工具（keygen、analyze、L4、L1、lint-staged）× `range.json` 各狀態沒有列；無效 `range.json` 與舊版面同時成立時誰先報 | **C-3** | D123 |
| G4 | 讀真實樹、斷言上游內容的列在靶場或 fork 的 CI 會失敗；日後 `en` CI leg 的做法 | **C-6**、K-14 | D124、D136 |
| G5 | 搬家的探查、讀取與寫入：被忽略或在符號連結底下的翻譯說明頁看不到、讀取發生在拒絕之前（TOCTOU）、步驟 9 沒列 strip 的寫入 | **C-4**、**C-5**、R-7 | D125、D139 |
| G6 | 搬家的邊界結果：以語系命名的舊頁面、非 crossing 的 moved run、fork:init 缺翻譯首頁、手動搬家漏步驟 7、D105 可能翻轉根語言、`smoke-fixtures/` 底下的老師頁面 | C-12、C-13、C-15、C-20、R-10、R-12 | — |
| G7 | GLOSSARY 與語料：`_新造詞_` 反向規則、主語系與語系偏好的舊句、引用的原句已改、詞條修改跟著哪張票、短連結的第三個後備、scaffold 用了避用詞 | **K-1**、**K-2**、K-3、C-16、K-9、K-10、K-11、K-15、V-8 | D137 |
| G8 | 舊網址規則 `/zh-TW/*  /:splat  302`：S61 的惡意路徑不全、只驗一次、寫進每個繁中主語系靶場、遮蔽 `public/zh-TW/` 的靜態檔 | **R-1**、R-2、R-3、R-13 | — |
| G9 | not-found 抵達：雙重前綴在兩種主機的落點不同、孤兒經 `/c/NNN` 寫入語系偏好 | R-5、C-18 | D138 |
| G10 | 建置的連結與版面檢查邊界：B20 與 AC-3、PL-E11／PL-E12 的段落邊界、protocol-relative 首頁連結、短連結規則遮蔽頁面、`src`／`public` 的符號連結、ADR-0008 consequence 2 的註記 | C-10、C-11、R-14、R-15、R-16、K-7 | D141 |
| G11 | 題目宣告的解析與裝配：說明頁資料夾裡的非 index 檔案、YAML 邊界與 parser 一致性、VitePress 頁面 key 作用到每個語系頁、`__proto__`／`constructor` | C-9、C-17、R-8、R-9 | D127、D129 |
| G12 | 訊息跳脫與標準訊息表：DEL、C1、bidi 的跳脫、兩語系守衛的固定字串、Y-§2.5 表格被切斷 | R-11、V-24、C-19、V-25 | D140 |
| G13 | 判準只剩一種讀法：表格裡的 `\|`、「語系列舉」的定義、需要 spy 的列、`briefFaults` 的順序、AC 散文的含糊動詞 | **V-1**、V-12、V-13、V-21、V-23 | D132 |
| G14 | 文件審閱型判準與 meta 判準 | V-7、V-11 | — |
| G15 | 第 8 階段計畫：V-U4 的步驟、指錯的列、branch 名稱、`--force`、Source 檔數、VL 基準、JS 停用的介面、V-S3 的期望值、git 改名偵測、V-B5 的樹、npm 11 陷阱 | **V-2**、V-3、V-4、V-14、V-15、V-16、V-17、V-18、V-19、V-20、K-4 | — |
| G16 | 清單與元件：subtitle 的來源、根網址題目頁的 SSR 字串、LW1 的次數、帶「挑戰」的預設標題 | **C-1**、C-14、V-10、K-5 | D128、D131 |
| G17 | 驗收出口與流程規則：flag 子字串比對的粒度與結尾換行、例外表可擴充、keygen 量測失敗、「已核准」的標記、`pending` 的用法、兩個 skill tree 的相同性 | V-5、V-6、V-9、V-22、K-8、K-12、K-13 | D130、D133、D134、D135 |

粗體是 P1。17 群涵蓋全部 76 則，每則只出現在一群。

## 處置摘要

處置寫在 `disposition.md`：76 則中已修 74 則，其中 6 則有一個主張不修（C-12、C-17、K-12、R-11、V-7 各一，以及 C-14 的行為面）；整則不修 2 則（C-20、R-10），各附理由。新決定 D122–D141 來自本輪處置，D142 與 PAT6 來自第 2 版的自我檢查（RV2-01–RV2-22、SC2-01–SC2-10，共 32 則，已修 32 則，其中 RV2-16 有一個主張不修）。每一條新規則與新列在加入前都檢查過與既有規則、AC 是否互斥，結果在 traceability「Checks on revision 2」。

## reviewer 檢查過、沒有列為發現的項目

- **K**：ADR-0005、ADR-0006、ADR-0007、ADR-0008（明示覆寫的部分）、ADR-0009、Charter 與 hard rules 1–6、README 的 fork 路徑、0003–0008 的修訂（都已列入 Overridden contracts）、`sentence-map.test.ts`、`tests/unit/workflows/*`、`create-wxl/src/messages.mjs` 的冒號慣例、`challenge-sw.js`、`scripts/verify-project.py`。
- **R**：判定為預期後果的 TB7／TA2（連結能設定 `en`、同一個 owner 的 GitHub Pages 靶場共用語系偏好）、D29、D30、TB9、TB10、B3、A18 的去前綴與 crafted 路徑拒絕、RC1–RC6 與 SC1–SC6、`range.json` 的 FIFO 與符號連結與 index mode、`__WXL_PRIMARY_LOCALE__` 的定義時機、`range.json` 的 `__proto__` 與附加寫入、W6a 的拒絕。
- **V**：AC-1–AC-60 與 AC 索引的映射、各區所有矩陣列與第 8 階段各列，以及六處程式碼佐證（解題紀錄沿用確認的清除不動 `wxl-locale`、Browser panel 的元素、`create:challenge` 的預設 backend、`test:challenges` 跑在 dev server、`SITE_ORIGIN` 含 base、上游頁面沒有 `](/` 連結）。
