# Stage 3 round 2：總覽 — epic 0003

審查版本：spec.en.md blob `63b9ce0806b1a758252940ab4799e8395bf5f15e`、traceability.md blob `3240fec5c25b4fdb7a194e4e8c6a1ae4495ee358`，HEAD `c0f7edf`。凍結 prompt `review/prompt.md` blob `2a541cce2d3b69b8c529f568a516e32888df32f3`，與 round 1 逐字相同。

| 軸 | 檔案 | P0 | P1 | P2 | 合計 |
|---|---|---|---|---|---|
| 1 完整性 | `round-2-C.md` | **2（C-1、C-2）** | 9 | 12 | 23 |
| 2 可驗證性 | `round-2-V.md` | 0（V-1、V-2 附註：AC 不能改則為 P0） | 10 | 15 | 25 |
| 3 契約衝突 | `round-2-K.md` | 0 | 5 | 11 | 16 |
| 4 紅隊 | `round-2-R.md` | 0（R-6 依字面可主張 P0） | 8 | 9 | 17 |
| **合計** | | **2** | **32** | **47** | **81** |

## P0 存活：依 hard rule 3 判定 epic 過大

| id | 內容 | 同一根因的其他發現 |
|---|---|---|
| C-1 | keep list 收了 release workflow，`--rebrand` 的 `release-asset` 鍵永遠改不到，與「其他既有測試原封通過」互斥 | V-2、R-6、K-2 |
| C-2 | 部分寫入失敗後換參數重跑：「未給參數從 `applied` 繼承」與「值未設定的 anchor 不動」使結果無法收斂 | V-4、R-1、R-7、C-3 |

## 根因歸群

| 群 | 根因 | 發現 |
|---|---|---|
| J1 | 設定紀錄的合併語意：繼承、優先順序、跨欄位組合、部分失敗後收斂、必填參數 | C-2、C-3、C-4、C-5、C-6、C-8、V-3、V-4、V-9、R-1、R-2、R-3、R-7、R-9、K-1、K-4 |
| J2 | `--rebrand` 與新引擎的交互作用 | C-1、V-2、V-10、R-5、R-6、K-2、K-3、K-6、C-7（rebrand 欄位）、K-14 |
| J3 | base 從舊形式遷移（字面值 A9、舊 workflow、舊 README 流程） | C-10、R-2、R-8、K-16 |
| J4 | Cloudflare 預設 origin 落在全球共用的 `pages.dev` 命名空間 | R-4 |
| J5 | 可觀察性：`SITE_ORIGIN` mock 無效、built origin 觀察點、pristine 失敗面、origin 正向文法 | V-5、V-6、V-7、V-8、C-23 |
| J6 | 文件與註解清單不完整 | K-5、K-7、K-8、C-13、V-19、V-20 |
| J7 | 其他 P2 | 其餘 |

round 1 → round 2：106 → 81 項；round 1 的 G 群與 H1、H2、H4、H7、H8、H10–H14 大多沒有再出現（R 軸逐條確認 R-1、R-3、R-4、R-7、R-8 等已處理）。新的 P0 都來自 revision 2 新增或保留的兩塊表面：紀錄合併（H3、H9）與 rebrand（H5）。

## 使用者裁決（2026-10-14 約 15:20）

依 hard rule 3（P0 存活第 2 輪即拆分、從第 1 階段重來），使用者選 **A：引擎不帶狀態，紀錄另開 epic**。否決 B（只拿掉 rebrand，J1 仍在）、C（引擎與紀錄都延到研習後）。

| 新 epic | 範圍 | 承接 |
|---|---|---|
| 0004（暫名 stateless-engine） | 定位點 A1–A9、站名、origin（Cloudflare 必須明給 `--origin`，R-4）、base 由 configure-pages 決定、靶場 CI 全綠、guard 與上游原貌測試。**不寫 `range.json`、不合併**：每次照今天一樣帶齊參數，`--author`／`--repo` 必填，冪等靠定位點。`--rebrand` 不能與新參數並用 | round 1 已處理的 H1、H2、H4、H7、H8、H10、H12–H14；round 2 的 J3–J6 |
| 0005（暫名 create-wxl） | 下載、解壓、拿掉上游紀錄、提示下一步 | 0002 的 G7、G12 |
| 0006（暫名 setup-record） | `range.json`、合併、重放（研習後） | round 2 的 J1；0003 的 H3、H6、H9、H11 |
| 0007（暫名 range-setup） | localhost 設定頁（研習後） | 0002 的 G2、G5、G9–G11 |

關鍵事實：E1 讓所有設定落在固定定位點，升級模組可以直接從原始碼讀出目前設定，所以第一批靶場沒有 `range.json` 也能升級；延後紀錄不損失 Q4 要保住的東西。

本目錄保留為第 2 輪後拆分的紀錄，不再修訂。
