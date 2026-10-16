# Round 2 — 軸 3 契約衝突（epic 0005-create-wxl）

審查版本：spec.en.md blob `b61e6031517a00e2572063a8146c7a6f529fb5de`、traceability.md blob `ac164c561bb44918edb404fcfa78d504b4608282`（revision 2），HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell；主 session 派工時已核對 hash。

| id | 衝突 | 信心 | 等級 |
|---|---|---|---|
| K-1 | T51 覆寫把 `range.json` 加入 `EXCLUDED_FILE`，也把它排除在 residual 掃描外，違反「never claims the rebrand is complete while a `wxl` remains」；spec 說「no other rebrand behaviour changes」不成立 | 機制高／影響中 | P1 |
| K-2 | `fork-init.ts:31-32` 與兩棵 `wxl-fork-init` skill 的「整樹替換」「正常命中清單」敘述沒隨 T51 覆寫更新（skill 被 0004 T78 釘成逐位元相同） | 中 | P2 |
| K-3 | 套件沒有附 LICENSE：`dist/fork-init.mjs` 是衍生作品，ECL-2.0 §4(a) 要求附授權全文；`LicenseRef-LICENSE` 指向不存在的檔案 | 中 | P1 |
| K-4 | GLOSSARY：設定紀錄「開發模組照它套用設定」是現在式但引擎不讀；上游詞條把「fork 或 clone」與「設定紀錄出現之前」用冒號當同義，0005 之後的 fork 也沒有紀錄 | 中 | P2 |
| K-5 | spec 說上游詞條「revised, with former meanings recorded」，但上游詞條沒有【舊義】行 | 中低 | P2 |
| K-6 | U5 禁止 README 用「設定紀錄」造成競爭寫法；應拿掉新造詞宣告或記下理由；create-wxl 的 zh-TW 訊息未要求用詞彙表用語 | 中 | P2 |
| K-7 | 原廠靶場（暫存目錄、無 repo、無網址）不符靶場定義；pristine 與 0004 upstream-pristine check 撞名未記入 GLOSSARY `_Avoid_` | 中低 | P2 |
| K-8 | Charter：Serves 仍寫 fork；新 Must 宣稱「能接收後續上游版本」，但升級是 0006，0005 落地時尚未成立 | 中 | P2 |
| K-9 | spec「adding no validation」與 S1–S5 自己的檢查、S3 正規化矛盾；trim 與 0004「不 trim」不一致 | 中 | P2 |
| K-10 | 摘要顯示原始 `--origin`，實際寫入的是 hostname 轉小寫（0004 T32） | 中 | P2 |
| K-11 | zh-TW 模式下引擎訊息是英文；G4 英文 commit message 未豁免 language.md | 中低 | P2 |
| K-12 | 引擎覆寫、文件、CI 等 ticket 的 stage 8 表面未寫；終端機 CLI harness 併入題目為靜態讀檔的 OQ-017 | 中 | P2 |
| K-13 | `create-wxl/**` 不在上游 slug keep list：程式、測試、fixture 不可直接寫 slug；CW-E13 的回報方式；U5 不可附含 slug 的 `range.json` 範例 | 中 | P2 |
| K-14 | S3 位置與 `isUpstreamDecision`（測試檔私有函式）的新介面；改簽名屬 0004-S5 覆寫 | 中 | P2 |
| K-15 | N7 只有中文標題，缺 `Prerequisites` | 高／低 | P2 |
| K-16 | AGENTS.md 未寫 `pnpm --dir create-wxl test` | 中 | P2 |
| K-17 | AGENTS.md、guide.md 對 `.proj.specs/`、`.proj.tickets/` 存在的陳述在靶場不成立（可能已屬 D2 ⑯） | 低 | P2 |

已核對無衝突：U3 對 `upstream-only-jobs.test.ts`（`toContain`）與 `toolchain-parity.test.ts`；0004 T79 字串；詞彙表測試；N5、N6 與 README；P1、P2 標記與 OQ-020 空號；create-wxl 的獨立性；引擎可單檔剝型別；N-5 順序；T66 覆寫已宣告；B8 的 `srcDir`；U6 取代 0004 編號；G4 排除 hard rule 5。

依等級統計：P0 0、P1 2、P2 15，共 17 項。
