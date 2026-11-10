# T-0062 第 7 階段安全審查

依專案版 `.claude/skills/security-review/SKILL.md`（不是內建的同名指令）。

## 範圍

- checkout：`/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0062/on-disk-name-aliases`。
- base `77228175b45fa9b051db0cecbac13f1545e43d69`（`origin/main`），merge-base `27ff2fd8d6236cb4ab2c753c8cec658d3316711a`，HEAD `7632168c55fef1b430d9d5d5b63e12165b60a7b1`。
- 已 commit 的變更：`git diff 27ff2fd...HEAD -- create-wxl`（1086 行）。原始碼有 `archive-rules.mjs`、`git-named.mjs`（新檔）、`merge-plan.mjs`、`messages.mjs`、`text.mjs`、`upgrade.mjs`；測試有 7 個檔案，其中 `upgrade-aliases.test.mjs` 是新檔。其餘 commit 只改 T-0062 ticket，作為需求依據。
- pending 變更 0 筆，untracked 0 筆。

## 方法

workflow `wf_8c8c196e-33e`（2026-11-10），分兩段：

1. 候選：一個 `harness-reviewer` 列出所有候選，包含低嚴重度、低信心的項目，不自行判定誤報。
2. 判定：每個候選交給另一個獨立的 `harness-reviewer`。依據是 HEAD 的程式碼，以及 spec 的 B1～B6，特別是 Does not protect 與 Outside the model 兩欄記下的已接受風險。

兩者都只讀，沒有執行測試或 git 指令，判斷全部來自讀碼。依 0006 回顧的要求，明確列出的攻擊者位置有三種：

- (a) archive 內容：`--from <commit>` 可以取自 fork network（D17），所以這時 B 的路徑名稱由攻擊者決定。
- (b) B3：能改 `range.json` 或 commit 進老師 repository 的人，所以 range 追蹤的名稱由攻擊者決定，例如大小寫變體、NFD 或像 8.3 的名稱。
- (c) 檔案系統別名：macOS 的 APFS 與 NFD、Windows 的 8.3、NTFS stream 與結尾的點和空白、Linux casefold。

上游正式版本的內容依 B2 視為可信。

## 結論

**確認的發現：0 項。** 9 個候選經獨立判定，全部是誤報（信心 0.78～0.92）。

本報告只代表這次 diff 沒有發現新的可利用缺陷，不代表整個專案沒有安全問題。

候選審查員的整體判斷如下：

- 在原生 APFS 與 NTFS 上，P-9 對事前已存在的別名判斷大致正確。
- P-9 出錯時走 `PlanningError`，而且發生在 step 9 之前，所以不會部分寫入。
- `isGitAlias` 在 ASCII 範圍內與 git 的 `is_ntfs_dotgit`、`is_hfs_dotgit` 等價。
- B 的名稱來自 base 解壓後的 `readdir`，攻擊者能控制的 B 名稱只會導向 M6 刪除或 attention 項目，不會導向寫入。寫入需要 t，而 T 依 B2 可信。

## 被排除的候選

| 候選 | 類別 | 處置與理由 |
|---|---|---|
| C1 | P-9 在 `realpath` 不回報實際儲存名稱的檔案系統上失效（WSL `/mnt/c`、vfat、CIFS、ext4 casefold）；攻擊者選的 `--from <commit>` base 可用 `GITIGN~1` 之類的名稱觸發 M6，刪掉真正的檔案（含 `.gitignore`） | 誤報（0.88）。機制成立，但 B4 Does not protect 逐字接受這個限制。B1 Protects 在 P-9 後寫「B4 lists the limits of P-9」，而 B1 涵蓋 `--from <commit>`；B1 Does not protect 也已接受「b chosen to equal o … M6 deletes a teacher's file」。round 2 的 disposition 也評估過這條路徑。可選的強化記在下方 |
| C2 | P-9 只看規劃當下的磁碟；同一份 plan 在 step 9 自己建立的父目錄，會讓之後另一個只差大小寫的路徑寫進同一個目錄 | 誤報（0.88）。會建立新目錄的寫入都需要 t，所以兩個父目錄都要由 T 新增。這屬於 B4 Outside the model：「upstream itself shipping names that the file system resolves to one another」（B2）。攻擊者 (b) 追蹤的名稱在乾淨的工作樹上一定已在磁碟上，P-9 會正確回報 UP-A15 |
| C3 | P-9 的結果在 step 9 寫入或刪除前沒有重新確認（TOCTOU） | 誤報（0.92）。需要在執行中修改 range 的另一個程序，B4 Outside the model 已明列。三種攻擊者位置都只能決定名稱，插不進時間差。P-3 的 symbolic link 檢查本來就採同樣設計 |
| C4 | P-9 以 NFC 比對，NFC 會把 singleton（U+2126、U+212B、CJK 相容字）對到別的碼位；P-5 以字面比對時，被忽略的檔案可能經 M6 刪除 | 誤報（0.78）。行為照 D12 的規定。真正的缺口在 T-0062 之前就有的 P-5 字面比對，也就是 round 2 的 R-9：disposition-2 W15 判為 P2「記」，traceability 自審也列為「Recorded, not changed」。另外需要攻擊者完整知道被忽略檔案的內容 |
| C5 | rule 3 只拒絕 `git~1`；當 `.git` 的短名稱不是 GIT~1 時，`git~2` 可能是 `.git` 的別名 | 誤報（0.85）。D13 的定義就是 git 自己的 `is_ntfs_dotgit`，git 只認 `git~1`。`.git` 要拿不到 GIT~1，只會是上游自己的名稱先佔用（B2，B4 Outside the model）；上游樹目前沒有這類名稱。另外也需要 P-9 失效的檔案系統（C1 的接受風險） |
| C6 | `isGitAlias` 只做 ASCII 大小寫折疊；如果 NTFS 的 `$UpCase` 把 U+0131 對到 `I`，`.gıt` 可能是 `.git` | 誤報（0.85）。0005 rule 3 與 D13 規定比對時忽略 ASCII 大小寫，git 處理 CVE-2014-9390 時也是這樣。create 的 archive 是套件釘住的上游 commit（B2）；`--from` base 只解壓到暫存目錄，寫進 range 的路徑都來自 T。前提本身也未經證實 |
| C7 | rule 3 仍放行 Windows 保留裝置名稱（`CON`、`AUX`…）與 `:`；`--from <commit>` 的 base 由攻擊者選擇 | 誤報（0.8）。base 解壓時用絕對路徑，Node 在 Windows 上會轉成 `\\?\` 命名空間，不會開到裝置（依 Node 的已知行為推論，沒有在 Windows 上實測）。只出現在 B 的路徑最多導致刪除，且刪除前會經過 P-3～P-9；指向主資料流的 `x::$DATA` 會被 P-9 以 UP-A15 擋下。其餘影響已被 B1 Does not protect 接受 |
| C8 | UP-A15 與 CW-E14 會印出攻擊者影響的路徑，`jsonValue` 不跳脫 bidi 與零寬字元 | 誤報（0.85）。B5 沿用 0005 B5 與 AC-24，只要求跳脫 C0、DEL、C1。merge path 早就印在 R2、R3 的其他代碼上，UP-A15 走同一條路徑；攻擊者也無法讓 `check-ignore` 出錯而觸發 CW-E14。T-0061 的 C8 已有相同判定 |
| C9 | P-1 讓 `range.json` 不經 P-9；在不分大小寫的檔案系統上，追蹤中的 `Range.json` 可能被 J1 讀成記錄，並在 step 9 被改寫 | 誤報（0.88）。B4 Does not protect 逐字記載這個情況。diff 只把行內的 `check-ignore -- ./range.json` 搬進 `isIgnoredPath`，指令與退出碼的對應都沒變。內容仍要過 J3～J6 |

## 可選的強化（記錄，沒有採用）

以下都是判定者提到的 P2 等級建議，不是缺陷。這次維持 spec 的現狀：

- C1：B4 的 Does not protect 可以補一句，`--from <commit>` 的 base 能在 P-9 失效的檔案系統上利用這個限制觸發 M6。B1 已經用「B4 lists the limits of P-9」間接涵蓋。
- C3：step 9 寫入或刪除前，再做一次 `lstat` 與 `realpath` 的名稱比對。
- C5：rule 3 額外拒絕 `git~<數字>`；或者讓 create 先 `git init` 再寫入檔案，讓 `.git` 一定拿到 GIT~1。這是 0005 的範圍。
- C7：B4 Outside the model 目前只用 B2 當理由；可以註明 `--from <commit>` base 的特殊名稱只會落在暫存目錄。
- C8：若要把 B5 擴充到 bidi 與零寬字元，要另開 spec 變更，0005 與 0006 一起改。

## 排除的涵蓋範圍

- 沒有做相依套件掃描。這次 diff 沒有改動相依套件。
- 沒有評估可用性、速率限制與低嚴重度的強化項目，只記錄判定者主動提到的強化建議。
- 沒有在 Windows、WSL 或 Linux casefold 上實測。C1、C5、C6、C7 的檔案系統行為來自規格與 Node、git 的已知行為。macOS APFS 上的實際行為由第 8 階段在終端機驗證（見 ticket 的 2026-11-10 stage 8 紀錄）。
- 跨 ticket 的串連分析留到 epic 收尾（`docs/agents/review.md`）。
