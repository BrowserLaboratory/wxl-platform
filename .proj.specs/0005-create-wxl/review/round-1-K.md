# Round 1 — 軸 3 契約衝突（epic 0005-create-wxl）

審查版本：spec.en.md blob `92aa83414f81c7e56cb42d28652e35390b133fb2`、traceability.md blob `22688ad192a7cbfadea3ed432dee24791ea72e73`，HEAD `c707b40`，凍結 prompt blob `26a21e6a8cd7997ec1c0d03dfd4bc0922c453eb3`。審查員沒有 shell；GLOSSARY 的差異以舊 worktree 副本推斷，K-6、K-7 待主 session 以 `git diff GLOSSARY.md` 確認。

| id | 位置 | 衝突 | 信心 | 等級 |
|---|---|---|---|---|
| K-1 | spec「fork:init never reads or writes it」；`fork-init.ts` rebrand 全樹替換；0004 T51、AC-B2 | rebrand 會改寫 `range.json` 的上游 slug，0006 找錯上游；spec 沒宣告覆寫 T51（同 C-4） | 高 | P1 |
| K-2 | C48、AC-20；0004 T66、AC-G2、B3 | `--no-setup` 或 CW-E12 的靶場 `repository.url` 仍是上游，`git init` 後被判為上游，guard（`range.json` 含 slug）、pristine（`version` 0.1.0）、S3 測試失敗（同 C-20） | 中高 | P1 |
| K-3 | U3、C46；`upstream-only-jobs.test.ts` 釘住的完整指令；0004 T72 | 改 cross-OS job 的 `run` 字串會讓既有測試失敗；沒有 Overridden contracts 段落 | 高 | P1 |
| K-4 | 測試位置與相依；`vitest.config.ts` include、根目錄安裝、0004 B3 | 放 `create-wxl/` 收不進 vitest；放 `tests/` 進靶場後 import 失敗；`tar` 不在根目錄（同 C-3） | 中 | P1 |
| K-5 | S4、U2、X3；npm lifecycle | `npm pack` 不跑 `prepublishOnly`；X3 在 ticket HEAD 必敗（同 C-1／V-1，此軸給 P1、可主張 P0） | 中高 | P1 |
| K-6 | GLOSSARY；0004 T79、AC-D2 | 0004 要求兩詞條含「設定紀錄出現之前建立的靶場沒有設定紀錄」，本次改寫刪掉了，spec 沒宣告覆寫 | 中 | P2 |
| K-7 | GLOSSARY 規則（換詞義須把舊義記入 `_Avoid_`） | 開發模組、設定紀錄改了詞義，沒有【舊義】`_Avoid_` 行，矩陣也沒有列 | 中低 | P2 |
| K-8 | 「pristine」 | 0004 的 upstream-pristine check 把 `version` 0.1.0 視為非 pristine，0005 的 pristine range 正好是 0.1.0 | 中 | P2 |
| K-9 | vocabulary | 「source record」與 setup record 鍵相同、名稱近似；「setup」多義；沒寫明 setup record＝`range.json` | 低中 | P2 |
| K-10 | U5 | README 用「設定紀錄」等新造詞會觸發詞彙表測試的「已使用卻宣告新造」 | 中 | P2 |
| K-11 | P2、U1 | 靶場內 README（OQ-018）、ADR 0006/0007（OQ-002/003/007）、程式註解（traceability）引用被移除的內容（同 C-21） | 高 | P2 |
| K-12 | U4、AGENTS.md:23-25 | Must 是一個 bullet 三個子句，「the Must line」範圍不明；舊子句保留也會通過；拿掉了主機名稱 | 中 | P2 |
| K-13 | stage 8；workflow.md 151-159、hard rule 4、OQ-017 | 網站層觀察以靜態讀檔進行，沒有像 0004 那樣明文覆寫 preview 規則與記錄 harness | 中 | P2 |
| K-14 | CW-E12 | 重跑指令 `pnpm fork:init` 需要 `tsx`，靶場未安裝相依時跑不起來 | 中 | P2 |
| K-15 | G4；hard rule 5、language.md | 英文 commit message 與 hard rule 5 的關係未宣告豁免 | 低 | P2 |
| K-16 | 預留 `upgrade`；開發模組定義 | 預留在建立指令上，暗示升級從靶場外啟動 | 低 | P2 |
| K-17 | 覆寫 | `CREATE_WXL_COMMIT` 讓 `version` 與 `commit` 對不上（spec 已明說，刻意） | 低 | P2 |
| K-18 | 註解與文件 | `quality-gates.yml` 註解、`fork-init.ts:4-5`、`.gitattributes:1` 註解、AGENTS.md Repository layout 會過時，沒有清單 | 中 | P2 |
| K-19 | 0004 spec 的後續 epic 說法 | 0004「0006 setup record」「Until 0006 a range has no setup record」失效，spec 沒說明取代 | 低 | P2 |

檢查過、無衝突：引擎重用與 0004-S1 簽名一致、N-5 不會發生、keep list 不變、README fork 章節與 T77、next steps 與 README／deploy template 一致、靶場推 `v0.1.0` 不建 release、首次轉換條件在 P3 後仍成立。

依等級統計：P0 0、P1 5、P2 14，共 19 項。
