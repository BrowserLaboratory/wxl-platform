# Stage 3 round 2：處置 — epic 0007-gh-pages-range-fixes

依據：`round-2-C.md`、`round-2-V.md`、`round-2-K.md`、`round-2-R.md`，以及總覽 `round-2.md`（群組 R2-G1 到 R2-G10）。處置後的版本是 spec 與 traceability 的 revision 3（2026-10-21）。兩輪都沒有 P0，第 3 階段的閘門已經成立；依兩輪上限，revision 3 只自審，不再跑第 3 輪（D15）。

## 使用者的裁決（2026-10-21）

| Id | 問題 | 裁決 | 涉及的發現 |
|---|---|---|---|
| D12 | 只下架或只刪除英文題目、繁中說明頁還留著，既有的 `redirects.test.ts` 會讓 CI 失敗 | hook 拒絕這種 commit（孤兒說明頁），訊息指名該說明頁，並說明要和英文目錄一起刪除、改名或下架 | K-1、C-17、V-5 |
| D13 | keygen 失敗時骨架已建立，結束狀態卻和名稱衝突一樣是 1 | keygen 失敗改為狀態 3，與 `challenge:retype` 的慣例一致；wxl-create 遇到 2 或 3 都不重問名稱，選單選項改用文字 | R-4、K-2、K-3 |
| D14 | 手機導覽列的網址文字可能縮到 0 寬 | 至少保留 6ch，超出用省略號；`copy_failed` 顯示時也要檢查 | R-5、C-3、V-13、C-18 |
| D15 | 第 2 輪剩下的 14 條 P1 怎麼處理 | 寫成第 3 版：自審，不再跑審查，翻譯後進 `/to-tickets` | 全部 P1 |

## 主 session 自行採取、使用者未裁決的選擇

下列選擇沒有經過使用者裁決，是為了讓 revision 3 能判定而做的。使用者可以推翻，推翻時只改對應的列。

| 選擇 | 理由 | 位置 | 涉及的發現 |
|---|---|---|---|
| 狀態 2 時 wxl-create 繼續到 Step 3 | 狀態 2 表示題目與 keygen 都已完成，只是 `_redirects` 沒有重新產生；commit 時 hook 會依 staged 內容重產 | P7 | K-2 |
| 有修飾鍵的點擊交給瀏覽器，不攔下 | 讓 Cmd/Ctrl-click 照樣在新分頁開題目；沒有修飾鍵的點擊仍依 D4 選取 | L21 | R-14、C-23 |
| 只 stage 手改的 `_redirects` 時，接受 git 建立一個沒有變更的 commit，hook 不拒絕 | 拒絕會讓手改內容繼續留在 index；改用 W3 說明發生了什麼 | H07、AC-12、Further Notes | R-6 |
| 印出 W3 時，若 watched tree 有未追蹤目錄，另印 W4 提醒 `git add` | D5 的動機案例（`create:challenge` 之後 `git commit -a`）正是忘了 add 新題目 | W4、H10、H31 | R-6 |
| index slugs 改為每棵樹分別以 `<slug>/index.md` 判定 | 在乾淨的 checkout 上（也就是 CI）與 guard 的結果相同，並排除 submodule 與被忽略的英文目錄 | vocabulary、checks 表 | R-11、C-14、K-17 |
| E2、Z2 改為直接指名 `SITE_ORIGIN` | 解法不再依賴 fork:init 的模式；rebrand 模式拒絕 `--origin`，原本的解法在那裡用不上 | E2、Z2 | K-7 |
| V03 改用獨立的本機 clone | clone 與開發者的 checkout 不共用 `refs/stash` | V03、AC-20 | R-8、C-11 |
| symbolic link 照樣跟隨，不拒絕 | `pnpm build` 今天就這樣做；拒絕會多出新的規則表面 | hook 約束、B2、Out of Scope | R-10 |
| create-wxl 與 `fork-init.ts` 的字串列入 P3 | 兩者都在這個 repo；create-wxl 的字串隨它下一次發布生效 | P3 | K-5、C-7 |
| 測試檔裡描述短連結的註解不改 | 它們描述的是 short mode，測試也在 short mode 下執行；`redirects-generated.test.ts` 依 AC-17 不修改 | — | K-6 |
| short mode 的建置層測試、WebKit 測試列為已知代價，不改 CI | 加 CI 步驟會改到 G01 保持不變的部分 | Out of Scope、Further Notes | C-19、C-20 |

## 主 session 這一輪的查證（2026-10-21，scratchpad 暫存 repo）

| 發現 | 查證方式 | 結果 |
|---|---|---|
| C-16、R-15 | 在暫存目錄定義 `exit 2`、`exit 3` 的 script，分別用 `packageManager` 指定的 pnpm 10.28.0 與全域的 11.14.0 執行 | 確認：兩個版本都原樣回傳 2 與 3 |
| R-6 | 寫一個 pre-commit hook，把 index 改回 `HEAD`，分別用 git 2.54.0（Homebrew）與 2.50.1（Apple）執行 `git commit`、`git commit -a` | 推翻「nothing to commit」的推論：git 仍然建立 commit，內容沒有變更，exit 0 |
| R-7 | 只有 `_redirects` 在 staged 與 unstaged 都有變更時，`git diff --quiet -- platform/` 回報有變更；接著執行排除 `_redirects` 的 `git stash push`（git 2.54.0） | 確認：push 印出「沒有要儲存的本機修改」，exit 0，`refs/stash` 不變 |
| C-2、V-7 | 在沒有任何 commit 的 repo 執行 `git stash push -u` | 確認：exit 1 |
| K-1 | 讀 `tests/unit/site/redirects-generated.test.ts` 的 `trackedSlugs` | guard 以任一棵樹被追蹤的 `index.md` 納入 slug，再對工作樹產生；與 revision 2 的 index slugs 定義不同 |

## 處置表

「已修」指 revision 3 改了 spec、traceability、GLOSSARY 或 OPEN-QUESTIONS；位置以 revision 3 的列號、決策或段落表示。

### 軸 1 完整性（C）

| 發現 | 等級 | 處置 |
|---|---|---|
| C-1 | P1 | 主張「沒有定義 own index」：已修。commit forms 改以 `GIT_INDEX_FILE` 判定（未設定、等於 `git rev-parse --git-path index`、或再加上 `.lock`），並附實測表。主張「`-a`、`-p` 跑在 `index.lock` 上」：`-a`、`-i` 已實測確認（`round-2.md` 的查證表）；`-p` 依 git 原始碼推論與 `-a` 同路徑，由 H36 檢查。主張「矩陣缺 `-p`、`-i`、`--only`」：已修，新增 H36、H37，H33 加入 `--only`。主張「`-a` 期間 `index.lock` 一直存在，與 H26 的交互作用沒寫」：已修。`-a` 期間 git 持有的 `index.lock` 就是 hook 拿到的 index；H26 改由產生器替身在執行中建立 lock，兩者不再混在一起。`-a` 之下 stash 與 `git add` 能否成功，由透過真的 `git commit -a` 執行的 H31 驗證。 |
| C-2 | P1 | 已修：H27、H28 另定 fixture（沒有 commit、沒有 stash entry、`platform/public/` 另有一檔）；H 段前言、H29 與 AC-23 排除這兩列。主張「沒有 HEAD 時 `git stash` 會失敗」：實測確認。 |
| C-3 | P1 | 依 D14 已修：S10（寬度 ≥ 6ch − 1 px），S07 改為 D7 的驗收定義。主張「US-7 沒有驗收出口」：由 S10 與 S03 涵蓋，S03 在每個 page 與 viewport 都要點得到、選得起來。 |
| C-4 | P2 | 已修：T01、T02 改為「五列」，sentence map 下方寫明 E1 與 Z1 各五列。 |
| C-5 | P2 | 已修：S3 加入 1024×768；「each state」加入題目已完成、done badge 顯示的狀態。 |
| C-6 | P2 | 已修：新增 H44（commit 進去的 `_redirects` 帶 0007 之前的 header），對應 AC-22，US-9 因此有出口。git 自行完成的 merge 交給 B3 與 E1 的修復句（commit forms 段落、B2）。 |
| C-7 | P2 | 已修：P3 列入 `create-wxl/src/messages.mjs:229、304`、`questions.mjs:200`、`scripts/fork-init.ts:21、31、1487`，並要求 create-wxl 自己的測試通過。 |
| C-8 | P2 | 主張「手改 `SITE_ORIGIN` 是文件寫明的一條路」：已修，vocabulary 與 B4 寫明值由 fork:init 設定，或依 wxl-fork-init 的說明手改。主張「結尾斜線、缺 scheme 的邊界沒有列」：記為已知代價。B4 寫明手改帶結尾斜線也會讓連結壞掉；helper 不正規化（link forms、Out of Scope），依 D10 不加機制。 |
| C-9 | P2 | 已修：W3 的條件改為「hook 換掉的版本，在 index 或工作樹，既不是 `HEAD` 的、也不是 expected」。主張「H11、H31 會無聲改掉內容」：H11、H31 現在都要求 W3。主張「工作樹已等於 expected 時反而會提示」：新條件下不提示。主張「缺『unstaged 的 `_redirects` 等於 expected』這一列」：已修，H01 加上工作樹已是 expected 的變體，期望不提示。 |
| C-10 | P2 | 已修：commit forms 段落列出不跑 pre-commit 的指令（git 自行完成的 merge、`cherry-pick`、`revert`、`rebase`、`am`、GitHub 網頁），B2「Does not protect」與 H16 列入；Out of Scope 那句限定為「以 `git commit` 完成的 merge」。 |
| C-11 | P2 | 主張「linked worktree 沒有列」：已修，新增 H38；判準以 `git rev-parse --git-path index` 涵蓋 worktree 的 index（實測）。主張「V03 在 linked worktree 裡跑」：已修，V03 改為獨立的本機 clone。主張「simple-git-hooks 在 linked worktree 的安裝行為沒驗證」：不再需要，V03 改用 clone，H38 由測試自己安裝 hook。主張「`.git` 在 linked worktree 是檔案」：已修，S5 的觀察寫成「`.git` excluded（目錄，或 linked worktree 中的檔案）」。 |
| C-12 | P2 | 主張「macOS 的 bash 3.2 沒有涵蓋」：已修，見 R-1 與 H45。主張「路徑沒有空白與中文」：已修，S5 的暫存 repo 路徑含空白與非 ASCII 字元。主張「SIGHUP 沒有列」：已修，O5 與 H25 加入。主張「SIGKILL 無法攔截」：同意，寫在 B2 的 Outside the model。主張「找不到 node 時結束碼是 127」：已修，outcome 表下方寫明以 shell 自己的狀態結束，並列在 Out of Scope。主張「『every way』說得太滿」：已修，改為「矩陣涵蓋的結束方式」。 |
| C-13 | P2 | 記錄：Further Notes 列為已知代價。Out of Scope 寫明不讓 `create:challenge` 拒絕這類名稱：S4 的 root 不是 git repo，無法判斷 ignore 規則。 |
| C-14 | P2 | 已修：index slugs 改為每棵樹分別以 `<slug>/index.md` 判定；checks 表更正 revision 2 的說法。 |
| C-15 | P2 | 記錄：Further Notes 寫明修復指令遇到不一致的草稿時會拒絕並指名草稿，也寫了兩個解法。不另立列，因為這是產生器 CLI 的既有行為。 |
| C-16 | P2 | 主張「寫檔失敗沒有列」：已修，新增 C09（狀態 2，W1 帶寫入錯誤）。主張「`pnpm` 轉傳狀態沒有驗證」：實測確認 pnpm 10.28.0 原樣回傳 2、3；寫進 Testing Decisions 與 checks 表，不另立列。 |
| C-17 | P2 | 依 D12 已修：新增 H40（只刪繁中說明頁，O2）、H41（只改名繁中目錄，O4 與 W6）。 |
| C-18 | P2 | 依 D14 已修：S01、S02、S07、S10 的「each state」含 `copy_failed` 顯示中；刪除 Out of Scope 那句。 |
| C-19 | P2 | 記錄：Testing Decisions 與 Further Notes 寫明 short mode 的建置層只在 stage 8 驗證。加一份 `CF_PAGES=1` 的 smoke 建置會改 CI 步驟（G01 要求不變），列入 Out of Scope。 |
| C-20 | P2 | 記錄：S3 寫明在 Chromium 執行，與既有 smoke 相同；WebKit 與觸控列入 Out of Scope 與 Further Notes。 |
| C-21 | P2 | 已修：改為「X1–X6 are test cases at S8」。L09 只在 S2；新增 L20，定義 helper 在 S8 的期望：只收 number，未通過 `isChallengeNumber` 時回傳 none。 |
| C-22 | P2 | 記錄：vocabulary 的 page URL 寫明題目是 per-folder；Further Notes 記錄樹裡沒有扁平題目。 |
| C-23 | P2 | 接受：中鍵在新分頁開題目，跟任何連結一樣；Further Notes 記錄。 |
| C-24 | P2 | 已修：V05 部署後，從列表複製新題目的網址，以英文 profile 開啟。 |
| C-25 | P2 | 已修：mode rule 與 B1 列入 Cloudflare Workers 建置（給 page URL，已接受的代價）。「Workers 設的是 `WORKERS_CI`」這一點本 session 沒有查證，所以沒有寫進去；寫法不依賴變數名稱。 |
| C-26 | P2 | 已修：S5 從子行程的環境移除所有 `GIT_*` 變數；H30 擴大到真實 repo 的 index 與 stash list。 |
| C-27 | P2 | 記錄：hook 的約束與 B2 寫明不還原空目錄，因為 git 不記錄目錄。 |
| C-28 | P2 | 已修：新增 H43。 |
| C-29 | P2 | 記錄：seam 段落與 Testing Decisions 寫明 S3 依賴示範題，沿用既有 smoke 對 `door-is-open` 的做法。 |

### 軸 2 可驗證性（V）

| 發現 | 等級 | 處置 |
|---|---|---|
| V-1 | P1 | 已修，同 C-1。主張「S5 要為 `-p` 補一列」：已修，H36。 |
| V-2 | P1 | 已修：L19 在 S2 只斷言常數未定義時是 page mode。「執行期改不了模式」改到 S3，以 S09 觀察：init script 設定 `window.__WXL_SHORT_LINKS__ = true`。AC-1、AC-9、vocabulary、Implementation Decisions 跟著改。 |
| V-3 | P1 | 主張「事先放好 `index.lock` 走不到 O5」：已修，H26 改由產生器替身在執行中建立 lock，因為還原也拿不到鎖，結果是 O7。主張「stash 之前 git 指令就失敗，不在 outcome 表內」：已修，O5 改為「at any point」，並新增 H46（直接執行前就有 lock，hook 在 stash 前失敗，一切如前）。主張「透過 `git commit` 時 hook 根本不會執行」：同意，所以 H46 用直接執行。主張「O1–O6 cover every way」：已修，同 C-12。 |
| V-4 | P1 | 已修：V03、V05 指定 `--backend php`。另寫明 validator 若因與本 epic 無關的其他原因拒絕骨架，就依 wxl-create Step 3 改寫並記錄。主張「keygen 是否會改 `app.py` 沒確認」：PHP 骨架沒有 `app.py`，不再相關。 |
| V-5 | P1 | 已修：H24 指定連結目標，是同目錄、內容相同、已 stage 的 `brief.md`，期望 O2。validator 的篩選維持 `ACMRD`，型別變更不交給它（約束、P6），所以不會出現 O3。AC-12 的前提因此成立。 |
| V-6 | P2 | 已修：H25 以產生器替身寫出 marker 後阻塞，並對 hook 的 process group 送訊號；SIGTERM、SIGHUP 也列入。 |
| V-7 | P2 | 已修，同 C-2。 |
| V-8 | P2 | 已修：fixture 的 `platform/public/` 另有一檔（S5、H18）。 |
| V-9 | P2 | 已修，同 C-4。 |
| V-10 | P2 | 已修，同 C-9；H01 寫明不提示，H07、H11 寫明要提示。 |
| V-11 | P2 | 已修：新增訊息表 W1–W9，每則都規定必須包含的子字串；C03、C04、C09、H07、H10、H11、H13、H17、H21、H22、H26、H27、H31、H33、H41、H42 都引用它。 |
| V-12 | P2 | 已修：S07 成為 D7 的驗收定義：標題被截斷時，網址文字的寬度 ≤ 6ch + 1 px。 |
| V-13 | P2 | 已修：vocabulary 定義 shown URL text（自己與每個祖先的 `display` 都不是 `none`），所以寬度 0 的網址不再被跳過；S10 規定下限。 |
| V-14 | P2 | 已修：刪掉 N04 的負向句，只留等式判定。 |
| V-15 | P2 | 已修：mode rule 下方與 M01–M03 寫明是字串 `'true'`／`'false'`，也就是 4 與 5 個字元的原始碼文字，與 `config.mts` 既有 flag 的寫法相同。 |
| V-16 | P2 | 已修：message key 的部分改由 stage 6 對照 diff 檢查（L15、AC-6、AC 索引）；S2 的輸出加入按鈕 click 事件的 `defaultPrevented`（L18）。 |
| V-17 | P2 | 已修，同 C-21；L08 只在 S2。另外，L10、L11、L16 寫明在 S8 與 S2 各自的期望。 |
| V-18 | P2 | 已修：AC-8 不再寫「or」，列表第一列與 nav 都要；S03 寫明每個 page 與 viewport 的列表第一列，以及 nav 的 shown control。狀態由「網址最長的那一列」與 nav 產生。AC-9、S04 改為「每一個」網址文字。 |
| V-19 | P2 | 已修：T04 改為 stage 6 檢查 S6 以 upstream decision 為條件，加上 `upstream-guard.test.ts` 既有的 range 輸入測試；AC-18 與索引的 seam 跟著改。 |
| V-20 | P2 | 已修：AC-21、V05 改為「`Run tests` step 的 log 顯示 guard test 的案例通過」。 |
| V-21 | P2 | 已修：V 段前言與 Testing Decisions 寫明，最後 land 的 ticket 對含整個 epic 的 commit 跑 V01–V05；較早的 ticket 跑哪幾列由 stage 4 指派。 |
| V-22 | P2 | 已修：H16 與 AC-17 註明由 guard 既有的斷言推得，不另行實驗。 |
| V-23 | P2 | 主張「passages 表的判定是描述性的」：部分已修。P3 列出檔案與行號（以 HEAD `7820bb8` 為準），P7 寫出各結束狀態的具體處理；其餘「describe X」仍由 stage 6 對照 diff 判斷，AC-24 的 seam 本來就是 stage 6。主張「P3 沒有列出段落」：已修。主張「P7 與選單的 `2` 容易混淆」：已修，P7 要求寫成「exit status N」，選單改用文字。 |
| V-24 | P2 | 記錄，同 C-29。 |
| V-25 | P2 | 已修：C06、C08 改用檔案層級的描述。 |
| V-26 | P2 | 已修：V02 寫明 1280×800。 |

### 軸 3 契約衝突（K）

| 發現 | 等級 | 處置 |
|---|---|---|
| K-1 | P1 | 依 D12 已修：hook 拒絕孤兒說明頁（O4、W6）。H17、H21、H22 改為 O4，新增 H39（下架時一併刪除繁中說明頁，O2）與 H41；AC-12、AC-15 與 vocabulary 的「retiring」跟著改。主張「和 GLOSSARY 的下架定義相衝，繁中短連結仍有效」：已解決，下架時兩條規則都會消失。主張「spec 宣稱 passes CI，實際會被擋」：已解決，hook 現在拒絕 CI 會擋下的狀態。 |
| K-2 | P2 | 主張「Verification 要求 exit 0，和狀態 2 相衝」：已修，P7 要求 Verification 接受狀態 0，以及訊息已轉述的狀態 2。主張「狀態 2 之後要繼續還是停下來沒說」：已修，P7 規定繼續到 Step 3（主 session 的選擇，見上表）。主張「選單的 `1`、`2` 和結束狀態撞號」：依 D13 已修，P7 要求選單用文字，結束狀態一律寫成「exit status N」。 |
| K-3 | P2 | 依 D13 已修：keygen 失敗改為狀態 3。刪除「Status 1 still means a collision」，改為狀態 1 一律表示沒有寫入任何檔案（C05）；checks 表更正 revision 2 的說法。主張「孤兒 scaffold 佔號、還被寫進工作樹的 `_redirects`」：狀態 3 時 wxl-create 不重問名稱，不會再多建 scaffold；keygen 失敗時 `_redirects` 不動（C03）。 |
| K-4 | P2 | 主張「延到 ticket 的 GLOSSARY 承諾在 spec 裡沒有出口」：已修，新增 P8（number 詞條的講義句，以及 origin 的 `_Avoid_` 句），由 T05、AC-24 涵蓋；spec 的 GLOSSARY 段改寫。主張「中文有兩種講法」：已修，GLOSSARY 第 1 階段的那句改用 Z2 的「題目頁的網址」；`glossary.test.ts` 通過（261 項）。 |
| K-5 | P2 | 已修，同 C-7；另含 `fork-init.ts:1487` 的對外警告。 |
| K-6 | P2 | 主張「元件註解會變成錯的」：已修，P5 加入 `ChallengeList` 的 `paddedId` 註解、`MergedNav` 的 `number` prop 註解，以及「Short link: the address a reader is given」。主張「測試註解也會變成錯的」（`redirects-generated.test.ts:73-74`、`redirects.test.ts:296-297`、`ChallengeList.test.ts:119-121`）：不改（主 session 的選擇，見上表）。前兩處講的是 `_redirects` 裡短連結的唯一寫法，在 short mode 仍然成立；`redirects-generated.test.ts` 依 AC-17 不修改。第三處所在的測試在 S2 改為以 short mode 執行，註解描述的仍是它測的東西。 |
| K-7 | P2 | 主張「兩條 fork 路徑會讓 `SITE_ORIGIN` 停在上游，D10、B4 都沒提」：已修，D10 與 B4 列入只帶 `--base` 與 rebrand 模式。主張「『do not open』不準確，其實會開到上游」：已修，B4 與 vocabulary 改為「打不開，或開到 `SITE_ORIGIN` 指的網站」，並寫明學習者的紀錄會存在上游的 origin。主張「E2、Z2 的解法在 rebrand 模式用不上」：已修，E2、Z2 改為直接指名 `shortLink.ts` 的 `SITE_ORIGIN`，不依賴 fork:init 的模式。 |
| K-8 | P2 | 已修：V01、V04，以及 AC-20、AC-21，寫明題目頁要開 Browser panel 檢查；Testing Decisions 寫明 hard rule 4 沒有被覆寫。 |
| K-9 | P2 | 已修：OQ-017 新增一段，記錄 0007 的覆寫，並說明 V02 和「Revisit when」的關係：V02 只涵蓋上游自己的建置，所以條目維持 open。 |
| K-10 | P2 | 已修，同 C-1；`-i` 歸類為自己的 index（實測）。 |
| K-11 | P2 | 主張「不衝突的 merge 不跑 pre-commit，H35 只涵蓋有衝突的」：已修，同 C-10。主張「`formatRules` 的欄寬讓三方合併的結果不一定逐 byte 相同」：成立與否都不影響處置，這類 commit 一律交給 CI 的 guard 與 E1。主張「考慮另外安裝 `pre-merge-commit`」：列入 Out of Scope；這需要另行裁決，本 epic 不做。 |
| K-12 | P2 | 記錄：Further Notes 寫明這個情況，以及先產生並 stage 的做法。 |
| K-13 | P2 | 已修：Solution 改為「sentence map 的每個檔」。 |
| K-14 | P2 | 已修：spec 與 traceability 都改為「keep Traditional Chinese as their language」。 |
| K-15 | P2 | 已修：Status 行改為「兩輪都沒有 P0，revision 3 不再送審（D15）」。 |
| K-16 | P2 | 已修：OQ-016 依出處分列（B4；Q10 與 Further Notes；B4），列號範圍也更新為 L01–L21。 |
| K-17 | P2 | 已修，同 C-14。反向的情況現在是孤兒說明頁，依 D12 拒絕；Further Notes 與 checks 表都寫明。 |
| K-18 | P2 | 已修：約束寫明 validator 的篩選維持 `ACMRD`，型別變更只觸發重新產生；P6 要求檔頭照這樣描述。 |

### 軸 4 紅隊（R）

| 發現 | 等級 | 處置 |
|---|---|---|
| R-1 | P1 | 已修：約束規定沒有路徑時不呼叫 validator，並要求 hook 在 bash 3.2 的 `set -u` 下行為相同。H45 用 macOS 的 `/bin/bash` 3.2 跑 H02、H07、H14、H34；stage 5 在 Mac 上執行，coverage report 要註明。空陣列會中斷這件事，主 session 已實測確認（`round-2.md`）。主張「S5 只在 ubuntu 上跑」：同意，所以 H45 不放在 CI，明文由 stage 5 負責。 |
| R-2 | P1 | 已修，同 C-1；H31–H33、H36–H38 一律透過真的 `git commit` 執行（S5、H 段前言）。主張「直接用 `bash` 執行時 `GIT_INDEX_FILE` 沒有設定」：判準把未設定視為自己的 index。主張「缺 linked worktree 的列」：已修，H38。 |
| R-3 | P1 | 已修：約束規定完整還原之後才 drop；還原失敗時保留 entry、exit 非 0，stderr 印出 commit id 與 `git stash apply`（O7、W9）；還原期間忽略 INT、TERM、HUP。主張「O5 的 stash 欄要改」：O5 限定為還原已完成的情況，其餘歸到 O7。主張「第二次 Ctrl-C 打斷還原沒有規定」：已修，還原期間忽略訊號。主張「`-a` 加 SIGINT 時，git 會先刪掉自己的 `index.lock`，trap 拿空的 index 還原」：已修，約束規定 `GIT_INDEX_FILE` 指的檔案已不存在時不還原、保留 entry；新增 H47。誰先處理訊號是 race，所以 H47 接受 O5 或 O7，斷言兩者共同的部分：真正的 index 不變、沒有 commit、沒有遺失任何 unstaged 檔案。主張「H25 補一個 `-a` 的變體」：由 H47 涵蓋。主張「H26 要寫明還原時鎖是否還在」：已修，H26 的鎖一直留著，所以還原也失敗。 |
| R-4 | P1 | 依 D13 已修，同 K-3。主張「選單的 `2` 會和 exit 2 撞號」：同 K-2。主張「補一列『keygen 失敗時 wxl-create 不重問名稱』」：由 P7 規範，stage 6 對照 diff 檢查（T05、AC-24）。skill 文字沒有可以自動執行的 seam，所以不另立矩陣列。 |
| R-5 | P1 | 依 D14 已修，同 C-3、C-18。主張「Out of Scope 的理由不成立」：同意，已刪除。主張「把 `copy_failed` 顯示時仍可見、可一鍵選取納入 S03」：已修，S03 與 AC-8 加入 `copy_failed` 顯示中的狀態。 |
| R-6 | P2 | 主張「通知條件只看工作樹與 staged 是否不同」：已修，同 C-9。主張「H07、H31 會以 nothing to commit 收場」：主 session 實測推翻。git 2.50.1 與 2.54.0 在 hook 把 index 改回 `HEAD` 之後，仍然建立一個沒有變更的 commit，exit 0。H07 與 AC-12 照實測結果改寫，Further Notes 也記錄了。主張「stderr 要提示剛建立的題目記得 `git add`」：已修，新增 W4。 |
| R-7 | P2 | 實測確認：git 2.54.0 的 push 印出「沒有要儲存的本機修改」，exit 0，`refs/stash` 不變。已修：約束規定只在 `platform/` 有 `_redirects` 以外的變更時才 stash，並以 `refs/stash` 前後是否改變判定自己的 entry；新增 H42。 |
| R-8 | P2 | 已修：V03 改用獨立的本機 clone；B2 的 Outside the model 寫明「同一個 repository 另一個 worktree 裡的 commit」。worktree 共用 `refs/stash` 的情況，由 H38 在測試的暫存 repo 裡驗證。 |
| R-9 | P2 | 已修，同 C-26；H30 擴大到真實 repo 的 `git ls-files --stage` 與 `git stash list`。 |
| R-10 | P2 | 記錄：約束與 B2 寫明 symbolic link 會被跟隨，與 `pnpm build` 今天的行為相同；拒絕連結列入 Out of Scope（主 session 的選擇，見上表）。主張「H24 判不出對錯」：已修，同 V-5。 |
| R-11 | P2 | 已修，同 C-14：改為每棵樹分別以 `index.md` 判定。以 submodule 加入的題目在 index 只有 gitlink、沒有 `index.md`，所以不算。被忽略的英文目錄配上強制加入的繁中頁時，英文那邊不算，繁中頁就成了孤兒說明頁，依 D12 拒絕。主張「checks 表的說法要修正」：已修。 |
| R-12 | P2 | 已修，同 C-10。 |
| R-13 | P2 | 已修：W8 要說明「勾選檔案後才 commit 的編輯器也一樣，請改用它的 staging area」，並含 `staging` 這個子字串。主張「IntelliJ 系列預設用 `--only`」：本 session 沒有查證 IDE 的實際行為，所以訊息寫法不依賴特定 IDE。 |
| R-14 | P2 | 已修：新增 L21，只攔下沒有修飾鍵的主要按鍵點擊（主 session 的選擇，見上表）。主張「中鍵走 `auxclick`，不受影響」：同意，Further Notes 記錄（同 C-23）。 |
| R-15 | P2 | 主張「三種不同的納入規則」：記錄。`create:challenge` 依整個工作樹產生，跟 `pnpm dev`、`pnpm build` 相同；S4 的 root 不是 git repo，無法用 tracked slugs。主張「狀態 2 的訊息會誤導」：已修，W1 改為說明 commit 時會依 staged 內容重新產生，不再要老師先修好整棵樹。主張「`pnpm` 轉傳沒有驗證」：實測確認，同 C-16。 |
| R-16 | P2 | 記錄：產生器不檢查 slug grammar 是既有行為，Further Notes 記錄，Out of Scope 寫明不改。主張「繁中樹完全不經 validator」：維持不變，因為 validator 的範圍不變是 S8 原則；繁中樹的不一致仍由產生器的號碼檢查與 D12 擋下。 |
| R-17 | P2 | 記錄，同 C-27。 |
| R-18 | P2 | 已修，同 C-6：新增 H44；git 自行完成的 merge 交給 B3 與 E1。 |

## 統計

91 條全部有處置，沒有駁回。依類別：

- 只記錄為已知代價、Out of Scope 或既有行為，沒有新增或改變任何矩陣列與規則的有 12 條：C-13、C-15、C-19、C-20、C-22、C-23、C-27、C-29、V-24、K-12、R-16、R-17。
- 其餘 79 條至少有一部分修進 revision 3，位置寫在各列。其中 C-8、K-6、K-11、R-10、R-15 另有一部分只記錄，理由也寫在各列。
- 主 session 實測推翻的推論：R-6 的「nothing to commit」。
- 延到 ticket：沒有。第 1 輪延到 ticket 的 K-13，這一輪以 P8 收進 spec（K-4）。

reviewer 之間沒有互相衝突的主張需要使用者另外裁決。主 session 在使用者未裁決的情況下做的選擇列在上方的表，使用者可以推翻。

## Revision 3 新增規範的自審

依 `docs/agents/review.md`「Two rounds, then split」，revision 3 新增的規則已逐條檢查參數、邊界與驗收出口，並與既有規則互相比對；結果記在 `traceability.md` 的「Checks on this revision」。不跑第 3 輪審查（D15）。
