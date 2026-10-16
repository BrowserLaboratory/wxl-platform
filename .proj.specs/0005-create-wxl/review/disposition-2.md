# Round 2 處置表 — epic 0005-create-wxl

第 2 輪 0 P0，stage 3 gate 成立。依使用者 2026-10-16 裁決 D3（A：revision 2.1 修正 P1 群 Q1–Q6，不再跑審查）與 D4（使用者以佔位套件保留 npm 名稱，`checkPublish` 加 X9）。P2 只收不增加表面的，其餘記為已知限制。位置以 traceability 的段落名稱與列號表示。

## 根因群

| 群 | 處置 | revision 2.1 的位置 |
|---|---|---|
| Q1 發布 | `prepublishOnly` 先跑 `prepareDist` 再跑 `checkPublish`（npm 的順序是 `prepublishOnly` 先於 `prepack`）；刪除 `mode`；X6 查上游本身並處理 annotated tag；X7 對 `git archive` 套用 entry 規則 1–5；X8 含引擎雜湊與 LICENSE；X9 名稱維護者；`.gitignore` 加 `*.tgz` 與 `LICENSE`；`prepareDist` 複製 LICENSE | Package and publishing；C42、C43、C45；stage 8 run 0 |
| Q2 互動與文法 | 互動時目錄問來的才重問（C64）；S4 兩種主機都問、GitHub Pages 可留空，`-` 清除（C66）；旗標值原樣、答案 trim、S3 映射；缺值、單一連字號、`--no-setup=`；readline 的 Ctrl-C 轉給同一個處理器（C56、run Ib） | Command grammar、Setup questions、Signals；C02、C08–C11、C52 |
| Q3 git | N2 只在 W01–W03、W05 時印；G3 的 exit 1 為 CW-W02；環境只留 `GIT_TERMINAL_PROMPT=0`、`GIT_CONFIG_NOSYSTEM=1`；測試用 `HOME`、`XDG_CONFIG_HOME`；印出的指令不帶 `--force`；G1 `--template=` | Git steps、Next steps；C35–C39、C70 |
| Q4 檔案系統 | 空目錄須與父目錄同裝置、父目錄可寫；C53 拆成兩種；搬回失敗為例外（C65）；步驟 8–9 的 fs 錯誤一律 CW-E09；下載時限涵蓋 body；Windows／root 略過規則；umask 與根目錄 mode | Step order 4、8–10；C07、C22、C53、C54、C65 |
| Q5 seam 與 stage 8 | deps 加 `packageVersion`、`engineSha256`、`ForkInitArgError`、`UPSTREAM_SLUG`；`bin` 層 CW-E13（C67）；run I 經 `script` 偽終端、補 S6；run IV 驗證 T66；AC-18 只比較文字部分；命令的 POSIX 引號與控制字元時不印 | Seams、Stage 8 inputs、Error and warning codes；C60、C67 |
| Q6 T51 覆寫 | 改為只跳過 `range.json` 的改寫、仍列入 residual 清單 | Overridden contracts；C61 |

## 逐項

| id | 處置 |
|---|---|
| C-1 | 修正（Q2，C64） |
| C-2 | 修正（Q3，N2 條件） |
| C-3 | 修正（Q3，G3） |
| C-4 | 修正（Q1） |
| C-5 | 修正（刪除 `mode`） |
| C-6 | 修正（Q5） |
| C-7 | 修正（Q4，同裝置與父目錄可寫） |
| C-8 | 修正（X7、C44） |
| C-9 | 修正（Q2，S4 兩種主機都問、`-` 清除） |
| C-10 | 修正（Windows／root 略過規則） |
| C-11 | 修正（readline 轉發、C56 的 `question` checkpoint、run Ib） |
| C-12 | 修正：第二個訊號忽略、step 11／13 的 CW-W05 內容、git 子行程被訊號中斷時以訊號為準；CW-E14 在 step 4、5 的列（C57） |
| C-13 | 修正：只有完全等於 `cloudflare-pages` 才要求 `--origin`；第二輪的預設值是旗標原值，Enter 交給引擎判斷；`--host 2` 為旗標時交給引擎（CW-E06／重問），在 S3 回答 `2` 則映射，屬刻意（旗標是給引擎的值，問答是給人的介面） |
| C-14 | 修正（`-` 清除 S5；答案 trim、旗標原樣） |
| C-15 | 修正（Setup questions 末條：旗標全給時仍顯示摘要） |
| C-16 | 修正（摘要 trim、不分大小寫） |
| C-17 | 修正（CW-E09 涵蓋 P4 寫入） |
| C-18 | 修正（umask、根目錄 0755）；FAT／exFAT 記入 Windows 項的已知限制 |
| C-19 | 修正（C53 拆分、C65）；目標在 step 10 前被刪除：重查時視為不存在，rename 成功，屬可接受；刪暫存目錄失敗：所有 entry 已就位，僅回報路徑，不搬回 |
| C-20 | 修正（Q4，時限涵蓋 body、一律 CW-E07） |
| C-21 | 修正：其他拒絕為 CW-W03、G0 非零為 CW-W01、只用 `PATH` 的絕對目錄、C70 驗證環境、git 2.20 下限 |
| C-22 | 修正（Solution 與 Language 改為只承諾 create-wxl 自己的文字） |
| C-23 | 修正（C01 加三個值） |
| C-24 | 修正（規則 5、規則 3 的結尾 `/`、規則 4 的 `toLowerCase`）；隱含父目錄的權限由步驟 8 的目錄 mode 規則涵蓋 |
| C-25 | 修正：`--author --repo x`、`--author=`、`--no-setup=x`、`-h`；`~` 開頭的位置參數：位置參數不展開也不拒絕（shell 已展開），刻意；`Upgrade` 比對大小寫，為目錄名稱；`CREATE_WXL_COMMIT=""` 視為未設定；CW-E02 的語言（C41）。pnpm 原樣傳 `--`：文法把 `--` 當旗標結束，`pnpm create wxl dir -- --no-setup` 會把 `--no-setup` 當位置參數而 CW-E02；README 對 pnpm 不寫 `--`，記入 OQ-021 一併確認 |
| C-26 | 修正（`repository` 等於 `UPSTREAM_SLUG`） |
| C-27 | 修正（印出形式、引號規則、C60） |
| C-28 | 修正（S4 對 GitHub Pages 為選填） |
| C-29 | 修正（C48 改為 run I、IV） |
| C-30 | 修正（S3 位置；判定函式的新輸入列為 0004-S5 覆寫） |
| C-31 | 修正（Seams 段末：不得直接寫出 slug） |
| C-32 | 修正（X6 查上游本身） |
| C-33 | 記入 OQ-021 一併確認 |
| V-1 | 修正（`script` 偽終端、S6 輸入） |
| V-2 | 修正（run IV） |
| V-3 | 修正（刪除 `mode`） |
| V-4 | 修正（AC-15 列出兩個允許的 `GIT_*`） |
| V-5 | 修正（`GIT_CONFIG_NOSYSTEM=1`；測試用 `XDG_CONFIG_HOME`） |
| V-6 | 修正（C53 拆分） |
| V-7 | 修正（AC-10 例外、C65） |
| V-8 | 修正（AC-4、C64） |
| V-9 | 修正（AC-18 只比較文字部分） |
| V-10 | 修正（命令的引號規則與控制字元時不印） |
| V-11 | 修正（CW-E09／E10 的界線） |
| V-12 | 修正（body 為 `Uint8Array`、時限涵蓋 body、一律 CW-E07） |
| V-13 | 修正（Q2） |
| V-14 | 修正（文法） |
| V-15 | 修正（X6） |
| V-16 | 修正（`fs.access(W_OK)`、略過規則） |
| V-17 | 修正（C66） |
| V-18 | 修正（`ForkInitArgError` 注入；其他錯誤 CW-E14） |
| V-19 | 修正（N2 條件與內容） |
| V-20 | 修正（印出形式、引號規則） |
| V-21 | 修正（checkpoint 名稱與時窗） |
| V-22 | 修正（CW-W05 各步驟內容；readline 轉發，run Ib 驗證真實路徑） |
| V-23 | 修正（P1、P2 以 LF 寫出） |
| V-24 | 修正（AC-11 改用 regex） |
| V-25 | 修正（四個佔位字、exact 的定義） |
| V-26 | 修正（S2 暫存 repo 含兩個 `.gitignore` 與 `LICENSE`） |
| V-27 | 修正（U1、U4–U9 固定字串） |
| V-28 | 修正（`.vitepress/dist/` 下任一檔案；`git ls-files` 與 archive 清單的比對；`range.json` 預期） |
| V-29 | 修正（C67） |
| V-30 | 修正（`packageVersion`） |
| V-31 | 修正（摘要 trim、不分大小寫） |
| V-32 | 修正（CW-E08 點名規則） |
| V-33 | 修正（DEL、C1、答案納入跳脫） |
| V-34 | 修正（AC-10 限定 `--no-setup`） |
| V-35 | 修正（CW-E02 先於 CW-E13） |
| V-36 | 修正（C69） |
| V-37 | 修正（X7 的 `--prefix` 與 entry 規則） |
| V-38 | 修正（S3 位置） |
| R-1 | 修正（Q1） |
| R-2 | 修正（印出的 G2 不帶 `--force`） |
| R-3 | 修正（X7、C44） |
| R-4 | 修正（D4：使用者發布佔位套件；X9；B2） |
| R-5 | 修正（C66） |
| R-6 | 修正（`./` 前綴、控制字元時不印、B5 列入環境變數值） |
| R-7 | 修正（同裝置、父目錄可寫） |
| R-8 | 修正（umask、根目錄 0755） |
| R-9 | 修正（Signals 段的規則）；`index.lock` 殘留：CW-W05 印出的 git 指令失敗時 git 自己會說明，不另列 |
| R-10 | 修正（X6 查上游本身、annotated tag）；commit 須在 `main` 上：記入 Out of Scope |
| R-11 | 記入 Out of Scope（shrinkwrap） |
| R-12 | 修正（V-5） |
| R-13 | 修正（G1 `--template=`、C35 驗證 hook 未執行；B7 文字更正） |
| R-14 | 部分修正：`wx` 與非遞迴建目錄、規則 3 拒絕控制字元；HFS+ 零寬字元與 APFS 折疊差異由 `wx` 轉為 CW-E09 |
| R-15 | 修正（C68） |
| R-16 | 修正（`engineSha256`；stage 8 結束刪除 `dist/` 與 `.tgz`） |
| R-17 | 修正（V-12） |
| R-18 | 記入 Out of Scope（Windows 項） |
| R-19 | 修正（`repository` 檢查） |
| R-20 | 記入 Out of Scope |
| R-21 | 修正（AC-10 例外） |
| K-1 | 修正（Q6） |
| K-2 | 修正（U9：引擎註解與兩棵 skill） |
| K-3 | 修正（LICENSE 複製、X8） |
| K-4 | 修正（GLOSSARY 上游與設定紀錄詞條） |
| K-5 | 修正：上游詞條的詞義沒有改變，只是補充說明；spec 的敘述改為只說設定紀錄與開發模組記錄了舊義 |
| K-6 | 修正（U5：README 使用「設定紀錄」，同一變更拿掉 `_新造詞_`） |
| K-7 | 修正（原廠靶場定義改為「靶場內容」，並加 `_Avoid_`） |
| K-8 | 修正（U4 改 Serves；升級子句註明由 0006 實現） |
| K-9 | 修正（Engine reuse 改寫） |
| K-10 | 修正（摘要顯示解析後的 `origin`） |
| K-11 | 修正（Solution 改寫；G4 同時豁免 language.md） |
| K-12 | 修正（Overridden contracts 的 stage 8 列、OQ-022） |
| K-13 | 修正（Seams 段末、CW-E13 訊息、U5 不附範例） |
| K-14 | 修正（0004-S5 覆寫） |
| K-15 | 修正（N7 英文標題） |
| K-16 | 修正（U9） |
| K-17 | 修正（Out of Scope 的已知限制措辭涵蓋 `AGENTS.md`、`docs/agents/`） |

## revision 2.1 新增表面的自我檢查

見 traceability「Self-check of the surface (revision 2.1)」。
