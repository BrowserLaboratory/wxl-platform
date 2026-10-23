# Stage 3 round 1：處置 — epic 0007-gh-pages-range-fixes

依據：`round-1-C.md`、`round-1-V.md`、`round-1-K.md`、`round-1-R.md`，以及總覽 `round-1.md`（群組 G1–G10）。處置後的版本是 spec 與 traceability 的 revision 2（2026-10-21）。

## 使用者的裁決（2026-10-21）

| Id | 問題 | 裁決 | 涉及的發現 |
|---|---|---|---|
| D4 | 列表整列是連結，點網址文字會進題目頁 | 網址文字改成點了只選取、不導頁；列表其他地方照樣進題目頁 | V-1、K-1、C-10、R-15 |
| D5 | `commit -a` 與已過期的 `_redirects` 會繞過 hook | `_redirects` 被 stage 時也觸發；E1/Z1 加上修復步驟；推翻 rev 1 Out of Scope 的 H07 | R-3、C-6 |
| D6 | 沒有偏好的學習者被導到不存在的繁中頁 | 另開 OQ-023，本 epic 不修，spec 收窄說法 | C-1 |
| D7 | 手機 nav 的標題可能被網址擠掉 | 標題優先，網址先縮；viewport 加 360 與 768 | R-7、C-9 |
| D8 | 產生失敗的結束狀態與 wxl-create 的 1 撞義 | 改用 2；wxl-create 四個檔分開處理 | R-6、K-3 |
| D9 | stage 8 偏離 preview 規則；stage 8 的 commit | 明文覆寫並引用 OQ-017；stage 8 的 commit 照用 `/tw-emoji-commit` | K-6、K-7 |
| D10 | `SITE_ORIGIN` 與實際網址不一致 | 列為已知代價並寫進文件，不加機制 | C-2、R-18 |
| D11 | 句子檢查會在靶場擋下 CI | 只在上游跑 | K-18 |

## 處置表

「已修」指 revision 2 改了 spec 或 traceability；位置以 rev 2 的列號、決策或段落表示。

### 軸 1 完整性（C）

| 發現 | 等級 | 處置 |
|---|---|---|
| C-1 | P1 | 主張「導向會開到 404」：主 session 讀程式碼確認（round-1.md）。依 D6 另開 OQ-023，不在本 epic 修。主張「US-5 與 OQ-016 說得太滿」：已修，US-5、Solution、B4、Further Notes 收窄說法，OQ-016 改寫。主張「V04 用操作者的瀏覽器看不出來」：已修，V04 明定英文網址用已存英文偏好的 profile 開，並註明原因（D6）。 |
| C-2 | P1 | 依 D10 列為已知代價：B1、B4、Further Notes、E2/Z2 寫明 fork 沒跑 fork:init、repo 改名、自訂網域沒帶 `--origin` 的情況；不加建置時比對（Out of Scope）。 |
| C-3 | P1 | 已修：新增 H19（同檔 staged 與 unstaged 重疊），約束寫明此情況要逐 byte 還原 unstaged 內容（AC-14）。 |
| C-4 | P1 | 已修：outcome 表新增 O5（中斷、git 指令失敗）與 O6（沒有 HEAD），觸發條件定義沒有 HEAD 時的比較基準；列 H25–H28（AC-23）。 |
| C-5 | P1 | 已修：新增 commit forms 規則與 H31–H33；`-a`、`-p`、`--amend` 適用 O1–O6，其他 index（pathspec commit）觸發時拒絕。主張「GUI client 的 PATH 可能沒有 node」：列入 Out of Scope 與 B2。 |
| C-6 | P1 | 依 D5 已修：只 stage `_redirects` 也觸發（H07 改寫）；E1/Z1 加修復句；新增 H34（AC-22）。 |
| C-7 | P1 | 主張「被 ignore 的目錄會被算進去」：已修，產生時只取 index slugs（vocabulary、約束），新增 H20。主張「hook 用工作樹的 scripts」：記為已知行為，寫入 B2「Does not protect」並列 Out of Scope。 |
| C-8 | P1 | 已修：H03、H04 改為兩棵樹都動；新增 H21（只刪英文）、H22（只改名英文，O4）；H17 改為退役英文、繁中規則保留。主張「只刪或只改名繁中頁、只改繁中說明」：H02、H14、H05 涵蓋新增與無規則變動；只刪繁中屬 H21 的對稱情況，由產生器逐語系規則決定，測試以 H21 的形式各寫一例即可，不另立列。 |
| C-9 | P1 | 依 D7 已修：S07（標題寬度規則）、S3 viewport 加 360×740 與 768×1024（AC-8）。 |
| C-10 | P1 | 主張「點文字會導頁」：依 D4 已修（L17、S03、S06）。主張「觸控裝置沒有 hover、長按跳連結選單」：記為已知代價（Further Notes），手機上以複製按鈕與點選文字取得網址。 |
| C-11 | P2 | 記錄：Further Notes 寫明 commit 在 hook 之後被中止時的狀態，並說明下一次 commit 會再重產。 |
| C-12 | P2 | 主張「合併時 `_redirects` 衝突」：已修，E1/Z1 的修復步驟涵蓋，新增 H35（AC-22）。主張「兩個分支拿到同號」：屬既有編號行為，列入 Out of Scope；合併後產生失敗以 O4 回報。 |
| C-13 | P2 | 已修：S4、S5 的 fixture 明定含 `platform/public/` 與一致的 `_redirects`；H15 在此 fixture 下執行。 |
| C-14 | P2 | 已修：L19 與 vocabulary「link mode」定義常數未定義時為 page mode。 |
| C-15 | P2 | 已修：sentence map 加入兩棵樹的 wxl-create `SKILL.zhTW.md`（Z1）。 |
| C-16 | P2 | 已修：slug 必須符合 slug grammar，否則 page mode 不顯示（L16、X6）；列表的 row slug 沿用 `slugOf`。 |
| C-17 | P2 | 已修：mode rule 列出 `pnpm pages:dev`、release archive、其他讀 `_redirects` 的主機；V01 寫明 preview 複製的是 `SITE_ORIGIN`，並在 preview 自己的 host 上開短連結路徑。 |
| C-18 | P2 | 記錄：S5 以 CI 的作業系統為準；Windows 上的 hook 行為與沒有 Node 的情況列入 Out of Scope。Node 版本依 `package.json` 的 engines，本 epic 不改。 |
| C-19 | P2 | 已修：S5 fixture 先放一個 stash entry；H29 檢查它的 commit id 不變。 |
| C-20 | P2 | 已修：新增 C06（沒有編號的未追蹤草稿）、C07（繁中編號不一致），皆為狀態 2；C08（手改的 `_redirects` 被覆寫），並寫入 B5。 |
| C-21 | P2 | 已修：觸發條件加上型別變更（H24）；新增取消退役（H23）；複製（C）原本就在觸發條件內。 |
| C-22 | P2 | 已修：`MergedNav` 增加 `slug` prop，由 `ChallengeLayout` 提供；N07 在 S3 驗證 layout 的傳遞。 |
| C-23 | P2 | 已修：N06（grid 檢視沒有控制項）、L18（複製按鈕的 click 不讓外層連結導頁）。 |
| C-24 | P2 | 已修：F01、AC-25。 |
| C-25 | P2 | 已修：S3 的「each page」明定兩個語系的 `selected-excerpts` 題目頁；S04 沿用同一組頁面。 |
| C-26 | P2 | 已修：V03 寫明 `pnpm install`、Rust、不推送的拋棄式分支。主張「V04 沒涵蓋 fork 加 fork:init 的路徑」：兩條路徑產生的建置相同，本 epic 只驗 create-wxl 路徑，不另立列。 |
| C-27 | P2 | 依 D5，H07 改為觸發並由 AC-12 驗收；繞過 hook 的情況改由 H16 與 AC-17 涵蓋。 |

### 軸 2 可驗證性（V）

| 發現 | 等級 | 處置 |
|---|---|---|
| V-1 | P1 | 依 D4 已修：L17（`defaultPrevented`）、S03（列表與 nav 都要選取且網址不變）、S06（列的其他地方仍導頁）。 |
| V-2 | P1 | 已修：S2 的 N 列讓 `withBase` 加上 `/my-range/`（N04）；AC-21 指定暫時 repo 為專案站。 |
| V-3 | P1 | 主張「validator 不執行觀察不到」：已修，AC-13、AC-16 刪去這一句，改驗可觀察的結果。主張「checks 表的論述錯誤」：承認並修正，rev 2 的 checks 段落寫明 rev 1 的說法是錯的。 |
| V-4 | P1 | 已修：V02 改用 `/agent-browser` 或宿主的原生瀏覽器工具；題目頁依 hard rule 4 開 Browser panel 檢查。 |
| V-5 | P1 | 已修：V01 分兩步，先確認顯示與複製（`SITE_ORIGIN`），再在 preview 自己的 host 上開 `/c/NNN` 與 `/zh/c/NNN`。 |
| V-6 | P2 | 已修：S02 要求 computed `display` 不是 `inline`；S08 在上游要求截斷真的發生。 |
| V-7 | P2 | 部分已修：S01 量靜止與顯示 `short_link.copied` 兩種狀態。顯示 `short_link.copy_failed` 時的版面不在本 epic 改動範圍，列入 Out of Scope。 |
| V-8 | P2 | 已修：S5 輸出加入前後的 `git ls-files --stage`。 |
| V-9 | P2 | 已修：改寫為「工作樹中 `platform/` 以外的檔案」，`.git/` 不在範圍內（約束、B2）。 |
| V-10 | P2 | 已修：AC-17 改寫，繞過 hook 的 commit「交給 CI 裡不變的 guard」；guard 不變由 stage 6 檢查 diff，不另做一次 `--no-verify` 的實驗。 |
| V-11 | P2 | 已修：N04 改為「等於 link form 的 page URL，s 取 row slug」，結尾斜線有無不影響。 |
| V-12 | P2 | 已修：nav 的 slug 改為 `MergedNav` 的 prop（S2 掛載時給），`ChallengeLayout` 的傳遞由 N07 在 S3 驗。 |
| V-13 | P2 | 已修：S3 明定兩個語系的題目頁；AC-9 沿用 AC-8 的頁面集合。 |
| V-14 | P2 | 已修：H05 以 `HEAD` 的 bytes 為基準，S5 fixture 的 `_redirects` 與樹一致；fixture 含 `platform/public/`。 |
| V-15 | P2 | 已修：AC-21 以 guard 那一步為主要依據，補上 `git add`、列表與 nav 各一條、`CREATE_WXL_COMMIT`、專案站。 |
| V-16 | P2 | 已修：AC-5 改為「以 `Number()` 轉換，與今天相同」；AC-6 以 fake timer 超過 2000 ms 判定；AC-10 改為「stdout 含有 `platform/public/_redirects`」。 |
| V-17 | P2 | 已修：Testing Decisions 改為 happy-dom；常數未定義時為 page mode（L19）；模式以 `vi.mock` 替換讀取的模組。 |
| V-18 | P2 | 已修：match rule 改為「移除每行開頭由 `#`、`>`、空白組成的最長前綴」，刪去 comment markers 的說法。 |
| V-19 | P2 | 已修：新增 passages to rewrite（P1–P7）與 T05、AC-24，由 stage 6 對照 diff 檢查。 |

### 軸 3 契約衝突（K）

| 發現 | 等級 | 處置 |
|---|---|---|
| K-1 | P1 | 依 D4 已修，並明文覆寫 `ShortLinkShare` 的註解（D4、P5）。 |
| K-2 | P1 | 已修：新增 seam S8（helper，origin 為參數），X1–X6 在 S8 測；S2 依 T70/AC-C1 以真實 `SITE_ORIGIN` 建期望值。 |
| K-3 | P1 | 依 D8 已修：狀態 2、P7、AC-11、AC-24。 |
| K-4 | P2 | 已修：同 V-11。 |
| K-5 | P2 | 已修：同 V-4；題目頁的 Browser panel 依 hard rule 4 開啟。 |
| K-6 | P2 | 依 D9 已修：Testing Decisions 明文覆寫並引用 OQ-017；V01 寫明 origin。 |
| K-7 | P2 | 依 D9 已修：V03、V05 的 commit 走 `/tw-emoji-commit`。 |
| K-8 | P2 | 已修：同 C-15。 |
| K-9 | P2 | 已修：sentence map 下方明文寫出 wxl-fork-init 的語言例外沿用現狀，本 epic 不改語言。 |
| K-10 | P2 | 主張「No new term 與 `article` 矛盾」：已修，改為「不新增 stage 1 以外的詞」。主張「英文用語三種叫法」：已修，spec 一律用 page URL，E2 改為「the challenge page's URL」，OQ-016 也改寫。 |
| K-11 | P2 | 已修：vocabulary 改為「here, the numbered short link the control gives」，並註明 GLOSSARY 還涵蓋 slug 形式。 |
| K-12 | P2 | 已修：vocabulary 寫明 `SITE_ORIGIN` 是每一條複製連結的 origin；P2、P3、P4 列出要改寫的 README、skill 與 `shortLink.ts` 段落。GLOSSARY 的 origin 相關說法另見 K-13 的處置。 |
| K-13 | P2 | 延到 ticket：GLOSSARY 的 number 詞條與 origin 相關句子在改寫文件的 ticket 一併處理，並跑 `glossary.test.ts`；`shortLink.ts` 的檔頭說法列入 P4。 |
| K-14 | P2 | 記錄：刪除與下架造成號碼可重發屬既有編號行為，列入 Out of Scope；本 epic 不改。 |
| K-15 | P2 | 已修：D2、D7 與 P5 明文覆寫 `ChallengeList` 的「任何寬度都可讀」與 `MergedNav` 的實測註解；S07 量標題寬度。 |
| K-16 | P2 | 已修：Further Notes「Local guard mismatches」加入繁中說明頁未追蹤的情況；checks 表說明差異。 |
| K-17 | P2 | 已修：同 V-17。 |
| K-18 | P2 | 依 D11 已修：S6 與 S08 只在上游跑（T04、AC-18）。 |
| K-19 | P2 | 已修：P6 列出 hook 與產生器的註解。 |
| K-20 | P2 | 已修：OQ-016 的段落改寫，列出打不開的情況並引用 OQ-023。 |

### 軸 4 紅隊（R）

| 發現 | 等級 | 處置 |
|---|---|---|
| R-1 | P1 | 主 session 在暫存 repo 重現確認（round-1.md）。已修：約束規定 `_redirects` 不進 stash，只在驗證通過且產生成功後寫入並 stage；H10 改為 B≠C，H11 加上可 stash 的狀態，H17 涵蓋退役。 |
| R-2 | P1 | 已修：commit forms 規則；在別的 index 上觸發時拒絕（H33），`-a`、`--amend` 適用 outcome 表（H31、H32）。 |
| R-3 | P1 | 依 D5 已修：H31。 |
| R-4 | P1 | 已修：同 C-7，H20。 |
| R-5 | P1 | 已修：約束規定 hook 指定自己 repo 的頂層為 root；H30 檢查真實 repo 的 `_redirects` 不變。 |
| R-6 | P1 | 主張「狀態 1 撞義」：依 D8 已修。主張「失敗訊息要說下一步」：已修，C04。主張「`SKILL.zhTW.md` 不在 sentence map」：已修，同 C-15，並列入 P7。主張「create:challenge 會因無關半成品失敗」：已修，C06、C07 列出並給狀態 2。 |
| R-7 | P1 | 依 D7 已修：S07。 |
| R-8 | P2 | 已修：O5 與約束（每次結束都還原自己的 stash entry）；H25、H26。 |
| R-9 | P2 | 已修：約束要求依 commit id 還原並丟掉自己的 entry；H29 與 S5 fixture 的既有 entry。 |
| R-10 | P2 | 已修：O2 規定覆寫不同版本的 `_redirects` 時，stderr 指名該檔（H10）。不附 diff：被覆寫的是產生檔，下一次建置也會改寫它。 |
| R-11 | P2 | 已修：B1 加入 Cloudflare 建置但 `SITE_ORIGIN` 指向別的主機，以及 preview 的短連結指向正式站。 |
| R-12 | P2 | 已修：同 V-5。 |
| R-13 | P2 | 已修：同 C-16，slug 不符 grammar 時不顯示，不做編碼。 |
| R-14 | P2 | 記錄：已知代價寫入 Further Notes（截斷可能藏掉 slug；手機沒有 hover，以複製按鈕與點選取得網址）。不改截斷位置。 |
| R-15 | P2 | 依 D4 已修：同 V-1。 |
| R-16 | P2 | 已修：同 C-8，H21、H22；只改名英文時以 O4 回報號碼重複。 |
| R-17 | P2 | 記錄：B2 與 Out of Scope 寫明 hook 用工作樹的產生器。上游自己改 header（G02）時，產生器與 `_redirects` 在同一個 commit，CI 用 commit 內的產生器比對，結果一致。 |
| R-18 | P2 | 主張「OQ-016 說得太滿」：已修，同 K-20。主張「repo 改名後網址漂移」：依 D10 已修，E2/Z2 與 B4 寫明。 |
| R-19 | P2 | 已修：沒有 HEAD 的情況見 O6、H27、H28；merge commit 見 H35。 |
| R-20 | P2 | 已修：L19 與 vocabulary 規定只有建置時常數決定模式，`window` 上沒有任何東西能改變它；測試以 `vi.mock` 替換。 |
| R-21 | P2 | 已修：同 C-24。 |
| R-22 | P2 | 主張「暫時 worktree 沒有 `node_modules`」：已修，V03。主張「測試 commit 可能落到 ticket 分支」：已修，V03 使用不推送的拋棄式分支。主張「刪 repo 需要變更 gh scope」：已修，改由使用者自己刪除（V05）。 |
| R-23 | P2 | 記錄：同 C-18，列入 Out of Scope。 |

## 統計

89 條全部有處置，沒有駁回。延到 ticket 的只有 K-13；其餘不是已修進 revision 2，就是依裁決或理由記為已知代價、OQ-023 或 Out of Scope，理由寫在各列。reviewer 之間沒有互相衝突的主張需要使用者另外裁決。

## Revision 2 新增規範的自審

依 `docs/agents/review.md`「Two rounds, then split」，revision 2 新增的規則在進第 2 輪前已逐條檢查參數、邊界與驗收出口，並與既有規則互相比對。結果記在 `traceability.md` 的「Checks on this revision」。
