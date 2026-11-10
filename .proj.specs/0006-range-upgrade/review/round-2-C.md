# Round 2：軸 1 完整性（epic 0006-range-upgrade）

審查版本：spec.en.md blob `2cf003ad…`、traceability.md blob `afd5040b…`，HEAD `56902c2`；凍結 prompt blob `0bfaa5b2…`。我讀的是工作樹檔案，沒有 shell，所以沒有自行核對 hash；以下對 git、GitHub、檔案系統行為的判斷都是推論，有實測依據的會註明。

---

**C-1**
- 位置：traceability.md:292-310（stage 8 模擬）、spec.en.md:139（AC-13）、spec.en.md:152-153
- 違反：R10，以及 User Story 1（最常見的升級路徑要在真實介面上驗證）
- 證據（直接讀到）：模擬的 step 3 只驗 UP-E12 拒絕，step 4 走 `--from <A>`，也就是 `--from <commit>` 這條例外路徑。在 stage 8 裡，「`range.json` 記錄的是 release，經由真的 codeload `refs/tags/v<version>` 下載，通過 J6」這條預設路徑一次都沒有走過；S1 只有 fixture。`.proj.research/2026-11-09-t0061-stage1-facts.md`:211-215 手動量過 v3.0.0 的 pax comment，確認它是剝殼後的 commit（`v3.0.0` 是 annotated tag，見 `.git/packed-refs`:28-29）。但這份量測不屬於任何 AC。另外，step 3 的前提是「A 的 root manifest version 有已發布的 tag」，前提不成立時會得到 CW-E07 而不是 UP-E12，spec 沒寫這時該怎麼辦。
- 影響：使用者最常走的路徑缺少一次整體驗證，涵蓋 tag URL、annotated tag 剝殼、tag archive 的第一段路徑、J6 相等比對。step 3 的 UP-E12 就算 comment 是 tag 物件的 SHA 也一樣會出現，所以它證明不了 J6 的正向路徑是對的。
- 信心：高
- 等級：P1
- 建議：模擬多加一段。用 `CREATE_WXL_COMMIT=<v3.0.0 剝殼後的 commit>` 建立 range，這樣 `range.json` 會記下 `3.0.0` 和 release commit；commit 之後執行 `CREATE_WXL_COMMIT=<B> … upgrade`，不加 `--from`，預期 J6 通過、結果與 step 4 一致。同時寫明 tag 不存在時（前提不成立）怎麼處理。

**C-2**
- 位置：spec.en.md:121（B4 的 Does not protect）、traceability.md:138（D15）、traceability.md:438-440
- 違反：每一個 {repository 狀態 × 欄位 × 邊界} 都要對到一條 AC
- 證據：B4 宣稱，不分大小寫的檔案系統上，tracked 的 `Range.json`「會被 J1 當成紀錄讀進來、被 step 9 改寫，還原指令能復原」。但沒有任何矩陣列對應這句話。D15 用字面 pathspec `git ls-files -z -- ./range.json` 判斷有沒有 tracked；index 裡只有 `Range.json` 時，可能被判成 untracked，再碰上 ignore 規則就可能誤報 UP-E13（推論）。另外，write-then-rename 改名到 `range.json` 可能改變磁碟上存的大小寫（推論）。
- 影響：一個宣稱的保證沒有任何驗收出口；D15 在這個狀態下的結果也沒有定義。
- 信心：中低
- 等級：P2
- 建議：加一列，只在 macOS 或 Windows 上跑：tracked 的 `Range.json`，分有沒有 ignore 規則兩種，寫出 D15 的結果、step 9 之後的磁碟名稱，以及還原之後的狀態。

**C-3**
- 位置：traceability.md:176（P-7）、traceability.md:361（U63）
- 違反：{b、t 是否存在} × P-7 的組合都要有對應的列
- 證據：U63 只測「上游修改 `.gitignore`，且 o ≡ b」。上游新增 `.gitignore`（b 不存在、t 存在）、上游刪除（b 存在、t 不存在）、以及 o ≡ t 但 b ≢ t 這三種情況，P-7 都會套用並回報 UP-A13，但沒有列。
- 影響：上游新增的 ignore 檔永遠不會寫入，這是有意的行為，卻沒有任何驗收。
- 信心：高
- 等級：P2
- 建議：把 U63 擴充成新增、刪除、o ≡ t 三個分支。

**C-4**
- 位置：traceability.md:142（step 9）、traceability.md:197（M6）、traceability.md:352（U54 第二例）；程式 create-wxl/src/merge-apply.mjs:102（只有 `unlink`）
- 違反：規則會產生的狀態要有定義的結果
- 證據：M6 刪掉目錄裡最後一個檔案之後，空目錄要不要移除，spec 沒寫。U54 第二例刪掉 `a/x` 後會留下空的 `a/`，`a` 回報 UP-A10。空目錄不會出現在 git 裡，所以下一次升級時，若 b ≡ t 就由 P-2 靜默跳過，`a` 永遠不會進來，也不會再列出。
- 影響：上游的檔案可能在報過一次之後就永遠不見，而且之後都不再提示。
- 信心：中
- 等級：P2
- 建議：規定 M6 之後要移除變空的父目錄，或在 R4 提醒；U54 第二例補上「空目錄」這個結果。

**C-5**
- 位置：traceability.md:137-141（step 4、step 8）；程式 create-wxl/src/upgrade.mjs:64-69
- 違反：每個失敗都要有代碼和對應的列
- 證據：revision 3 只為 step 5 定了 git 失敗的處理：exit 不是 0 或 1，或 `runGit` reject，一律 CW-E14。其他 git 呼叫失敗時用什麼代碼，spec 沒寫，矩陣也沒有列，包括：step 4 的 `rev-parse --verify HEAD`、`status`、`ls-files -v`、`rev-parse --git-dir`；step 8 的 `ls-files -z`、P-5 的 `check-ignore`、P-8 的 `ls-files -s`。程式現在一律轉成 CW-E14，但這是實作自己的選擇。
- 影響：同一類失敗在不同步驟的代碼沒有定義，測試也不會守住。
- 信心：高
- 等級：P2
- 建議：把 step 5 的 CW-E14 規則推廣到所有 git 呼叫，並加一列。

**C-6**
- 位置：traceability.md:178（P-9 的 lstat 錯誤）、traceability.md:243（UP-E11）、traceability.md:355、traceability.md:367（U69）
- 違反：UP-E11 的每個觸發條件都要有對應的列
- 證據：UP-E11 包含「a read error」以及「P-9 的 `lstat` 錯誤（ENOENT、ENOTDIR 以外）」，但矩陣只有 merge-file exit 255（U57）和 `realpath` 回 `EACCES`（U69）兩列。讀 o、b、t 失敗（例如 tracked 檔案權限 000），以及 P-9 往上找祖先時 `lstat` 回 `EACCES`、`ELOOP`、`ENAMETOOLONG`，都沒有列。程式 merge-plan.mjs:356 已經實作讀取失敗的處理。
- 影響：revision 3 新增的錯誤分支沒有驗收出口。
- 信心：高
- 等級：P2
- 建議：U69 加上「`lstat` 回 `EACCES`」；另加一列「讀 o 回 `EACCES`」。

**C-7**
- 位置：spec.en.md:118（B1 寫「tag 刪除時 … 之後由老師用 `--from <commit>` 指定 base」）、traceability.md:364（U66）、0005 traceability.md:174（CW-E07）
- 違反：B1 說的補救方法要能在訊息裡找到
- 證據：tag 不存在時，0005 的 CW-E07 訊息只寫 URL 和狀態，沒有提到 `--from`；UP-E12 的訊息有寫。另外，`--from <version>` 遇到 tag 不存在的情況沒有自己的列，U66 只涵蓋 base 來自 `range.json`。
- 影響：tag 被刪掉之後，老師看不到下一步該做什麼。
- 信心：中
- 等級：P2
- 建議：base 來自 `range.json` 且 tag 回 404 時，CW-E07 附上 `--from` 的說明；U66 補上 `--from <version>` 的情況。

**C-8**
- 位置：traceability.md:111（ignored path）、traceability.md:138、traceability.md:245（UP-E13 的訊息）、traceability.md:365
- 違反：每一種 ignore 規則來源 × D15 都要有對應的列
- 證據：`check-ignore` 也會讀 `.git/info/exclude` 和 `core.excludesFile`。規則來自這兩處時，UP-E13 給的補救「移除 ignore 規則並 commit」並不適用；矩陣只用了 `.gitignore`。
- 影響：補救建議可能是錯的。
- 信心：中
- 等級：P2
- 建議：U67 加上 `info/exclude` 的情況，UP-E13 的訊息也提到規則可能不在 repository 裡。

**C-9**
- 位置：spec.en.md:128（AC-2「this check follows J1–J5」）、traceability.md:365（U67）
- 違反：先後順序的每個分支都要有對應的列
- 證據：U67 只驗了 J1 比 D15 先（symlink 得到 UP-E06）。以下情況都沒有列，它們的結果只能從順序推出：
  - 不存在、被 ignore、沒有 `--from`：應得 UP-E04（J2）
  - 不存在、被 ignore、`--from <commit>`
  - 不是合法 JSON 且被 ignore：應得 UP-E06
  - J5 不符且被 ignore：應得 UP-E05
- 影響：實作若把 D15 移到 J2 前面，不會有測試發現。
- 信心：高
- 等級：P2

**C-10**
- 位置：traceability.md:140（step 7）
- 違反：先後順序的每個分支都要有對應的列
- 證據：以下兩種情況的結果都只能從 step 7 的文字推出，沒有列：
  - base 的 comment 錯（UP-E08 或 UP-E12），而 target 下載失敗：依「先下載兩個，再驗證」，應得 CW-E07
  - tag archive 的 gzip 被截斷，而 comment 讀得到：「comment 檢查最先做」和 0005「先嚴格解析」哪一個優先，spec 沒有寫
- 影響：代碼的優先順序沒有測試守住。
- 信心：中
- 等級：P2

**C-11**
- 位置：traceability.md:341（U26）、traceability.md:369-370（U71、U72）
- 違反：{語系 × 新增的報告內容} 要有對應的列
- 證據：U26 只要求「每個 UP 代碼在兩份訊息表裡都有」。revision 3 新增的 R1 句子（D17）、R2 的路徑行、R4 的 `|||||||` 句子（D16）沒有 zh-TW 的列；U71、U72 也沒有指定語言。
- 影響：新句子的 zh-TW 版本可能缺漏，卻沒有測試發現。
- 信心：中
- 等級：P2

**C-12**
- 位置：traceability.md:359（U61）、traceability.md:142
- 違反：prompt 點名要涵蓋「half-applied」的 repository 狀態
- 證據：有兩種半途狀態沒有列：
  - UP-E09 之後，老師把部分結果 commit 了再重跑：`range.json` 還是舊的 base，因為它最後才寫。已寫入的路徑會落到 M4；已經 commit 進去的衝突標記會再被 M12 合併一次。
  - 因為刪除先跑，UP-E09 發生時所有刪除都已完成，但 R2 不會印出（B4 只保證完成的 run 會列出刪除的檔案）。
- 影響：這兩種狀態的結果都沒有驗收。
- 信心：中
- 等級：P2

**C-13**
- 位置：spec.en.md:137（AC-11 的全稱句）、traceability.md:344（U29）
- 違反：AC-11 宣稱還原必定精確，需要涵蓋相關狀態
- 證據：上游修改 `.gitattributes`（`eol`、`text`、`filter`）時，升級之後的 status 和還原的精確性，沒有任何列；自審只論證了 ignore 規則。
- 影響：還原指令可能留下差異，卻沒有測試會抓到。
- 信心：低
- 等級：P2

**C-14**
- 位置：traceability.md:85（seam 只隔離 `HOME` 和 `GIT_CONFIG_GLOBAL`）、0005 traceability.md:275（`GIT_CONFIG_NOSYSTEM=1`）、spec.en.md:104（D14）、spec.en.md:138（D15）
- 違反：{作業系統 × 工具設定} 要有對應的列
- 證據：升級時執行的 git 關閉了 system config，但老師照 R5 執行還原指令時，是在自己的 shell，會讀 system config（例如 Git for Windows 的 system config 會設 `core.autocrlf=true`，也可能有 `core.excludesFile`）。chain analysis 把 `GIT_*` 環境變數的差異判為模型外，但 system config 檔案的差異沒有判定過，也沒有列。
- 影響：P-5、D15 對「哪些檔案被 ignore」的判斷，可能和老師執行 R5 時的判斷不一致。
- 信心：中低
- 等級：P2

**C-15**
- 位置：traceability.md:349-350（U51、U52）、traceability.md:139（step 6）
- 違反：矩陣列的預期結果要和規則一致
- 證據：`--from <version>` 等於 target 的版本、沒有 `CREATE_WXL_COMMIT` 時，step 6 的「equal with a different commit」需要知道 base 的 commit，而下載前並不知道。AC-4 的「when the base is known」可以讀成下載前就回 UP-I01。實作（upgrade-target.test.mjs:501，案例 (b)）選的是下載後才判斷，但規則本身沒有說清楚。
- 影響：下載前和下載後兩種實作都說得通，測試守不住其中一種。
- 信心：中
- 等級：P2

**C-16**
- 位置：matrix U08（traceability.md:323）
- 違反：prompt 點名要涵蓋 fork 這種 repository 狀態
- 證據：README 寫的 fork 流程是 GitHub fork 加 `pnpm fork:init`，這樣的 range 會 tracked 完整的 `CHANGELOG.md`、`.proj.*`、`create-wxl/`，`package.json` 的 version 是 3.0.0；而 pristine 的 b、t 是截斷過的，version 是 0.1.0。U08 只寫「range.json 不存在、帶 `--from`」，沒有一列描述這種 fork 的樹狀結構。
- 影響：行為可以從規則推出，但沒有驗收。
- 信心：低
- 等級：P2

**C-17**
- 位置：spec.en.md:133-134、traceability.md:188-189（NTFS stream）
- 違反：P-9 的模型要涵蓋 spec 自己點名的別名
- 證據：spec 自己提到 NTFS stream 別名（例如 `.gitignore::$DATA`），但 U68 只模擬了 8.3 短檔名；`realpath.native` 會不會把 stream 名稱去掉、變回 `.gitignore`，沒有列，也沒有記錄成未驗證。另外，頂層路徑的 o 不存在時，q 會是 range 根目錄，P-9 不適用，所以 `README.md:x` 這種名稱不在 P-9 的範圍內（推論；只有上游自己才會帶進這種名稱，屬於 B2 的信任範圍）。
- 影響：P-9 宣稱擋得住的一類別名，實際上沒有測試或記錄。
- 信心：低
- 等級：P2

---

我檢查過的範圍：
- 指令文法、step 1–10 的先後順序、J1–J6、D15、P-1 到 P-9、M4 到 M12、parent check
- R1–R5 和所有代碼、U01–U73、AC-1 到 AC-13、stage 8 模擬
- 0005 的 entry rules、P1–P4、CW 代碼
- CI 的作業系統矩陣（quality-gates.yml:296-340）、`.gitattributes`、manifest
- T-0061 stage 1 研究筆記、chain analysis，以及升級相關程式的錯誤處理

依等級統計：P0 0、P1 1、P2 16，共 17 項。
