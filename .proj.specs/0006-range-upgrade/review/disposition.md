# Round 1 處置表 — epic 0006-range-upgrade

第 1 輪 0 P0，gate 成立。依使用者 2026-10-16 裁決 D1（A：revision 2 修 P1 根因群，P2 只收不增加表面的；本 epic 不跑第 2 輪）與 D2（16 項取捨照表）。位置以 traceability 的段落名稱與列號表示。

## 根因群

| 群 | 處置 | revision 2 的位置 |
|---|---|---|
| U1 合併確定性 | 固定 `--diff3` 與三個標籤；`merge-file` 結束碼 1–127 為衝突，其他為 UP-E11；`.json` 乾淨合併須能解析（UP-A11） | Merge table M12；U19、U57、U58 |
| U2 base 的決定 | 下載前、下載後各檢查一次 no-op、降版與 3.0.0 下限；`--from <version>` 以 tag archive 的 `comment` 取得 commit；R1 印出 base 與 target；override 警告 | Step order 6–7；U12–U14、U50–U52、U61 |
| U3 路徑模型 | pre-checks：symlink（含 ignored）、大小寫／Unicode 碰撞、非檔案；parent check；先刪後寫；寫入以 rename 取代；`range.json` 以 `lstat` 檢查 | Pre-checks、parent check、Step 9、J1；U20、U53–U55、U60 |
| U4 ignored 路徑 | ignored 路徑一律不動並列 UP-A9；還原保證因此精確 | P-5；U22、U29 |
| U5 乾淨檢查 | 明確 status 參數、`--no-optional-locks`、assume-unchanged／skip-worktree、進行中的操作、沒有 HEAD | Step 4；U05 |
| U6 行尾 | ≡ 比較時正規化 CRLF | Vocabulary ≡；U56 |
| U7 fork:init 衍生內容 | anchor files 有變更時列 UP-A12，提醒重跑 `pnpm fork:init`；R4 提醒 GitHub Pages 推 `v*` tag | Fork:init-derived content、Report R4；U59 |
| U8 seam 與可觀察性 | 新增 `tmpRoot`；暫存目錄前綴；所有 git 呼叫走 `runGit`；`fetchArchive(ref)`；fs 注入；三種訊號；Windows 略過 symlink 與執行位元測試 | Seams；U27、U28 |
| U9 文法、報告、入口、stage 8 與契約 | 文法列出 `--lang` 兩側與 create-only 旗標；報告 R1–R5 以 id；`range:upgrade` 由 create-wxl 測試讀根目錄 manifest；stage 8 固定模擬內容與預期，模擬分支明文例外；OQ-017／OQ-021 | Command grammar、Report、Stage 8 simulation；U01、U02、U26、U30、U32 |

## 逐項

| id | 處置 |
|---|---|
| V-1 | 修正（U1） |
| V-2 | 修正（R1 印出 base 版本） |
| V-3 | 修正（下載後重查，U52） |
| V-4 | 修正（下載後重查，U51） |
| V-5 | 修正（`tmpRoot`、前綴，U15） |
| V-6 | 修正（fs 注入、signals、checkpoint，U27、U28） |
| V-7 | 修正（AC-9：「completed run」；UP-E09 後不寫） |
| V-8 | 修正（U4；AC-11 的比較明確化） |
| V-9 | 部分修正：AC-12 檢查 script 字串；參數轉傳與 registry 路徑在發布後由使用者確認（OQ-021），原因：發布前 `create-wxl@latest` 不是這個 ticket 的程式碼 |
| V-10 | 修正（0005 rev 2 的 `prepack`；stage 8 用 `npx --yes <tarball>`） |
| V-11 | 修正（`realpath` 與斜線正規化，U03） |
| V-12 | 修正（P-6） |
| V-13 | 修正（≡ 定義含兩邊都 absent） |
| V-14 | 修正（UP-E06 token） |
| V-15 | 修正（J 規則與 `--from`，U09） |
| V-16 | 修正（U5） |
| V-17 | 修正（AC-7 改為檢查連結目標的內容與修改時間；含 ignored symlink） |
| V-18 | 修正（R2 計數等於路徑數；輸出到 stdout；「changed」改為「本次寫入」；語言以 message id） |
| V-19 | 修正（U26） |
| V-20 | 修正（B4 改寫：不改 refs、index 內容；`--no-optional-locks`） |
| V-21 | 修正（執行位元以 mode 0755 判定、Windows 略過；fixture 依 0005） |
| V-22 | 修正（U17 每個分支一條路徑；M10 不計入 updated） |
| V-23 | 修正（U1） |
| V-24 | 修正（stage 8 預期逐項列出，含 package.json 與完整注意清單） |
| V-25 | 修正（`fetchArchive(ref)`） |
| V-26 | 修正（訊號時印出訊號名） |
| V-27 | 修正（`deps.cwd`，0005 rev 2） |
| V-28 | 修正（所有 git 呼叫走 `runGit`；U04） |
| V-29 | 修正（U02） |
| V-30 | 修正（AC-12：0005 的測試不改並通過） |
| V-31 | 修正（序列化與深度相等） |
| V-32 | 修正（R1） |
| V-33 | 修正（UP-I01 印版本與 commit） |
| C-1 | 修正（U1） |
| C-2 | 修正（U2） |
| C-3 | 修正（P-6） |
| C-4 | 修正（parent check、先刪後寫、還原順序改為 `git clean -fd` 再 `git checkout -- .`） |
| C-5 | 修正（P-4） |
| C-6 | 修正（U6） |
| C-7 | 修正：step 3 的比較；symlink 與執行位元的測試在 Windows 略過 |
| C-8 | 修正（U5） |
| C-9 | 修正（U4） |
| C-10 | 修正（J1） |
| C-11 | 修正：無效紀錄＋`--from`、repository 不同＋`--from`（U09）；`upstream` 內額外 key：整段替換，屬刻意（R2：`upstream` 只有三個欄位）；BOM 歸 J3 |
| C-12 | 修正（3.0.0 下限，UP-E10） |
| C-13 | 修正（U7）；T 新增檔案帶上游身分：由重跑 `pnpm fork:init` 處理（UP-A12 只在 anchor files 變動時出現；新增其他檔案帶上游 URL 屬 Out of Scope） |
| C-14 | 記入 Out of Scope（同 slug 的老師題目與上游題目逐檔合併；改名不連結） |
| C-15 | 修正（U1）；git 2.20 下限在 step 3 檢查 |
| C-16 | 修正：三種訊號；step 3–8 的訊號依 0005 不寫入；step 10 時已完成寫入，訊號只影響報告輸出，不另列 |
| C-17 | 修正（UP-E11 取代 CW-E09 用於讀取失敗；暫存根目錄無法寫入歸 0005 的 CW-E09，屬同一個「建立暫存目錄失敗」語意） |
| C-18 | 修正（文法；`--lang` 在 `upgrade` 兩側；create-only 旗標 CW-E02）；前導零 `03.0.0` 會在下載時得到 CW-E07，接受 |
| C-19 | 修正：沒有 HEAD、進行中的操作（U05）；升級後重跑（U61）；在上游執行：沒有 `range.json` → UP-E04；`safe.directory`：git 的錯誤訊息會出現在 UP-E01 的 stderr，不另列；`--from` 等於 target 且沒有 `range.json`：UP-I01 不建立 `range.json`，接受（之後一次真正的升級會建立） |
| C-20 | 修正（U17 涵蓋每個分支；M1 由 P-1 與 U24 涵蓋） |
| C-21 | 記入 Out of Scope（既有檔案的模式變更不套用也不報告） |
| C-22 | 修正（J5 忽略 ASCII 大小寫；`fetchArchive(ref)`） |
| C-23 | 修正：exit 0（D2 ⑫）；npm 轉傳與 npx 快取：OQ-021、R1 印出執行中的版本 |
| C-24 | 修正（UP-A11） |
| C-25 | 修正（0005 rev 2 的 `prepack`） |
| K-1 | 修正（3.0.0 下限） |
| K-2 | 修正（GLOSSARY 上游詞條：fork 或 clone 由老師自己指出版本，之後也可能從歷史推斷） |
| K-3 | 修正（`fetchArchive(repository, ref)`；B1 改寫） |
| K-4 | 修正（UP-E11） |
| K-5 | 修正（0005 X2 要求 V 為 `X.Y.Z`） |
| K-6 | 修正（U7） |
| K-7 | 修正（U6） |
| K-8 | 修正（Testing Decisions 明文覆寫、OQ-017） |
| K-9 | 修正（模擬分支明文例外；commit B 用專案 commit skill；暫存靶場內的 commit 為測試 fixture） |
| K-10 | 修正（Decisions in short 表） |
| K-11 | 維持：spec 只在 Further Notes 提到 `npx create-wxl@latest upgrade` 作為 3.0.0 沒有 `range:upgrade` 時的備案；GLOSSARY 開發模組說明「從靶場裡的指令啟動」是一般情況 |
| K-12 | 修正：Solution 與 Preconditions 明寫升級需要 git 與至少一個 commit；Charter 的「all a teacher needs」指建立與部署，0005 U5 的 README 小節列出升級的需求不在本 epic（README 的升級說明留給發布時的 CHANGELOG） |
| K-13 | 修正（`--no-optional-locks`、B4） |
| K-14 | 修正（R4） |
| K-15 | 修正（create-wxl 測試讀根目錄 manifest，不進靶場） |
| K-16 | 修正（`deps.cwd`） |
| K-17 | 修正：stage 8 用「brief」改為檔案路徑；`--from` 指上游版本，UP-E04 訊息改為不提 `merge upstream` |
| K-18 | 修正（Further Notes、OQ-020） |
| R-1 | 修正（J1） |
| R-2 | 修正（寫入以 rename 取代，U60） |
| R-3 | 修正（U3） |
| R-4 | 修正（P-4、0005 規則 4） |
| R-5 | 修正（U4） |
| R-6 | 修正（U5） |
| R-7 | 修正（U1） |
| R-8 | 修正（U1；輸出未完整讀取 → UP-E11） |
| R-9 | 修正（U2；相同版本不同 commit 只在 override 時進行） |
| R-10 | 修正：R1 印出 base；B1、B3 的 Does not protect 補上錯誤 `--from` 的後果；「o≠b 數量」不另印（R2 的計數已提供訊號） |
| R-11 | 修正（B3 補上共同教師與 fork network） |
| R-12 | 修正（U7） |
| R-13 | 修正（3.0.0 下限；最新版的 P1–P4 套到舊 base 的差異：P1–P4 規則若日後改變，屬該次變更的相容責任，記於 Further Notes 不另列） |
| R-14 | 修正（R5 註明只在其他修改之前使用） |
| R-15 | 修正（`--no-optional-locks`；`.git` 元件由 0005 規則 3 拒絕） |
| R-16 | 修正（0005 的輸出跳脫，U62） |
| R-17 | 修正（三種訊號） |
| R-18 | 修正（exit 0；R1 印出版本） |
| R-19 | 修正（深度相等的比較）；重複 key、大數字、`__proto__`：`range.json` 由工具寫入，接受 `JSON.parse` 的語意 |
| R-20 | 修正（R1） |
| R-21 | 接受：模擬 commit 只含無害的模擬內容，記錄於 ticket |
| R-22 | 修正（`merge-file` 輸入寫在本次的 `mkdtemp` 目錄內） |
| R-23 | 修正（AC-7 含 ignored symlink） |
| R-24 | 部分修正：`.json` 解析檢查（UP-A11）；YAML 等其他格式記入 B4 的 Does not protect |

## revision 2 新增表面的自我檢查

見 traceability「Self-check of the surface (revision 2)」與合併表下的完整性說明：ignored 不動與還原保證、exit 0、`--diff3`、3.0.0 下限與 export-ignore、`--from` 時略過 J4/J5。
