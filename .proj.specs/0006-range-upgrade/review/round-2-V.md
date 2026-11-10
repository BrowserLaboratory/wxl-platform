# Round 2：軸 2 可驗證性（epic 0006-range-upgrade）

**審查範圍**：審的是工作樹檔案 `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0006-range-upgrade/spec.en.md`（blob 2cf003a）與 `/Users/phoenix/dev/browserlab/wxl-platform/.proj.specs/0006-range-upgrade/traceability.md`（blob afd5040），HEAD 56902c2，依凍結 prompt（blob 0bfaa5b）進行。

**驗證限制**：我沒有 shell，所以 hash 沒有自行核對，沿用 parent 提供的值。git、Node、macOS 與 Windows 的行為都是我推論的；有逐字讀過的地方會另外標明。

**模糊措辭**：AC 裡沒有 "appropriately"、"where possible" 這類模糊措辭（已用 grep 確認），所以沒有因模糊措辭判 P0 的項目。

---

**V-1**
- **位置**：traceability.md:85（0006-S1 seam）、:367（U69）、:136（step 3）、:103（name on disk）
- **違反的要求**：每條準則都要能在 spec 指定的 seam 上觀察到。
- **證據**（直接讀到）：
  - seam 規定包裝後的 `deps.fs` 只對別名生效，原文是 "every other path, the range root included, passes through unchanged"。
  - U69 的 drive-root 模型卻要求 "a range root whose `deps.fs.realpath` returns `D:\`"。`\` 分隔的模型如果連 root 都要回傳 `\` 形式，也會跟 seam 衝突。
  - name on disk 的 R 定義為 "as step 3 computes it"，但 step 3 只寫 "resolved with `realpath`"，沒說是不是經由 `deps.fs`。如果 step 3 不走 `deps.fs`，R 就不會是 `D:/`，這個模型根本做不出來。
- **影響**：照 seam 的規定寫測試，U69 第五個情況無法建構。照 U69 寫測試，又違反 seam。
- **信心**：高
- **請求等級**：P1
- **建議**：
  - seam 註明 root 可以被包裝，但僅限 U69 的 drive-root 與 `\` 模型。
  - step 3 明定 realpath 經由 `deps.fs.realpath`。

**V-2**
- **位置**：spec.en.md:110–112、:136（AC-10）、:137（AC-11）；traceability.md:146–148、:343（U28）
- **違反的要求**：準則必須不需詮釋就能判定。
- **證據**：
  - AC-10 寫 "A completed run exits 0"，D8／U28 卻要求 step 10 收到訊號時 "R1–R5 printed in full … exit 130"。
  - "completed" 從頭到尾沒有定義：step 9 已完成算不算？AC-4、AC-9、AC-11、US-14 也都用了這個詞。
  - AC-11 的文字沒提 step 10 的情況，但 U28 卻對應到 AC-11。
- **影響**：測試員碰到 step 9 已完成、報告也印齊、但 exit 130 的執行時，判 AC-10 通過或失敗要看他怎麼解讀。
- **信心**：中
- **請求等級**：P2
- **建議**：
  - 定義 "completed run"，例如「step 9 完成且 step 10 未收到訊號」。
  - 把 step 10 的情況寫進 AC-11。

**V-3**
- **位置**：spec.en.md:135（AC-9）、traceability.md:142（step 9 最後寫 `range.json`）、:339（U24）
- **違反的要求**：準則的全稱語句必須可判定。
- **證據**（推論）：
  - AC-9 說 "after UP-E09 it is unchanged"。
  - 但 0005 規定訊號到達時會等進行中的操作完成。若 SIGTERM 正好在 `range.json` 的 rename 期間到達，rename 會完成，接著印出 UP-E09，此時 `range.json` 已經改變。
  - U24 只用 U27 的「第 2 次寫入失敗」來驗證。
- **影響**：在這個時間窗口內，AC-9 無法成立，測試員也無法判斷該算哪種結果。
- **信心**：中
- **請求等級**：P2
- **建議**：二選一，或者把 AC-9 限定為「寫入失敗」，或者明定 `range.json` 寫完後收到的訊號屬於 step 10 的窗口。

**V-4**
- **位置**：traceability.md:349（U51）
- **違反的要求**：列的輸入必須可以無歧義地建構出來。
- **證據**：中間那個情況寫的是 "whose archive's version is … equal with the target's commit"。如果意思是 commit 相同，那在下載前就會被 U12 攔下來（U12 已包含 `--from <commit>`），跟本列的 "post-download" 矛盾。比較可能的意思是「版本相同、commit 不同、沒有 override」，但文字不是這樣寫的。
- **影響**：測試員可能建出錯誤的 fixture，讓測試空過。
- **信心**：中
- **請求等級**：P2
- **建議**：改寫成 "version equal to the target's, a different commit, no `CREATE_WXL_COMMIT`"，並斷言 `fetchArchive` 有被呼叫。

**V-5**
- **位置**：traceability.md:350（U52）、:139（step 6）
- **違反的要求**：列所標的邊界（post-download）必須觀察得到。
- **證據**（推論）：
  - 要讓 `--from <version>` 的 tag 解析成 target commit，而且在下載前不被攔下，必須滿足其中一個條件：設定 `CREATE_WXL_COMMIT`，或版本不同。
  - 版本相同又沒有 override 時，step 6 在下載前就會給 UP-I01。
  - 這一列沒有寫 fixture 條件，也沒有斷言 `fetchArchive` 的呼叫。
- **影響**：測試可能從下載前的路徑拿到 UP-I01 而空過。
- **信心**：中
- **請求等級**：P2
- **建議**：寫明 fixture 用 `CREATE_WXL_COMMIT=<tag 的 commit>`，並斷言兩次 `fetchArchive` 呼叫都有發生。

**V-6**
- **位置**：spec.en.md:130（AC-4 "right after downloading"）、traceability.md:140（step 7）
- **違反的要求**：AC 與步驟順序必須一致。
- **證據**：
  - step 7 的順序是：先下載 base，再下載 target，接著驗證 base、驗證 target，最後才重複 step 6 的檢查。
  - AC-4 寫的 "right after downloading" 也可以讀成「base 一下載完就檢查」。
- **影響**：U51 如果斷言 `fetchArchive` 只被呼叫一次，就會跟 step 7 衝突。當 base 版本過高、同時 target archive 又有害時，該給哪個 code 也取決於讀法。
- **信心**：中
- **請求等級**：P2
- **建議**：AC-4 改成「在 step 7 的兩個 archive 都下載並驗證之後」。

**V-7**
- **位置**：spec.en.md:132（AC-6）、traceability.md:178（P-9）、:367（U69）
- **違反的要求**：AC 的每個子句都要有列驗證。
- **證據**：AC-6 寫了 "an `lstat` error other than ENOENT or ENOTDIR … gives UP-E11 naming p"，但 U69 只驗證了 `realpath` 回 `EACCES` 的情況。lstat 錯誤（例如 `EACCES`、`ELOOP`）沒有任何列。
- **影響**：這個分支的實作沒有測試把關。
- **信心**：高
- **請求等級**：P2
- **建議**：在 U69 加一個情況：`deps.fs.lstat` 拒絕並回 `EACCES`。

**V-8**
- **位置**：spec.en.md:134（AC-8）
- **違反的要求**：準則必須能觀察。
- **證據**：
  - "the set of ignored paths does not change" 是一個推導出來的全稱結論，但沒有對應的觀察方法，例如前後比較 `git ls-files --others --ignored --exclude-standard`。
  - U22、U63、U68 只驗證個別檔案的 bytes。
  - 另外附帶的例外子句（"except through an ignore file that upstream itself adds …"）需要測試員自行判斷某個失敗是否落在例外裡。
- **影響**：AC-8 後半段只能靠抽樣，例外也必須靠詮釋。
- **信心**：中
- **請求等級**：P2
- **建議**：
  - 在 U63 或 U68 加上「執行前後 ignored path 清單相同」的斷言。
  - 把例外子句移到 B4，AC 只保留可以驗證的部分。

**V-9**
- **位置**：traceability.md:344（U29）、:332（U17）、spec.en.md:147–149
- **違反的要求**：斷言不能是空的。
- **證據**：U29 是在 U17 之後執行，並斷言 "ignored files byte-identical to before the run"。但 U17 的 fixture 只要求涵蓋 P-2 與 M4–M12 的每個分支，沒有要求放入任何 ignored 檔案。
- **影響**：U29 的 ignored 子句可能空過。
- **信心**：中
- **請求等級**：P2
- **建議**：要求 U17 的 fixture 至少放一個 ignored 檔案，最好放在 upstream 有變動的目錄裡。

**V-10**
- **位置**：traceability.md:141（step 8 "inside the run's own temporary directory"）、:140、:143（step 10）、spec.en.md:131、:137
- **違反的要求**：「沒有殘留暫存目錄」必須可以觀察到。
- **證據**：
  - step 7 建了兩個 `mkdtemp` 目錄（前綴 `create-wxl-upgrade-`）。
  - step 8 卻寫 merge-file 的輸入放在 "the run's own temporary directory"（單數），沒說是哪一個，也沒規定前綴或位置。
  - AC-5 是用前綴來檢查。
- **影響**：如果 merge 輸入放在第三個目錄、或用了別的前綴，前綴檢查就抓不到殘留。如果放在 B 或 T 的目錄裡，又可能污染 pristine tree。
- **信心**：中低
- **請求等級**：P2
- **建議**：明定 merge 輸入放在 `tmpRoot` 下，使用同一前綴，並放在 B 與 T 以外的 `mkdtemp` 目錄。

**V-11**
- **位置**：traceability.md:343（U28）、:148–149；0005 traceability.md:41（`checkpoint` 的名稱是 `step-3` … `step-13`，對應 0005 自己的步驟編號）
- **違反的要求**：注入點必須由 seam 定義。
- **證據**：
  - 0006-S1 沒有定義 upgrade 路徑的 checkpoint 名稱與步驟的對應。0006 的 step 7 是下載，0005 的 step 7 是驗證。
  - "SIGTERM during step 9" 該從哪裡注入（checkpoint 或 `fs` 包裝），也沒有寫。
  - step 3–6 與 step 8 收到訊號時的效果沒有列出。step 8 時暫存目錄已經存在。
- **影響**：U28 怎麼建構取決於實作者，跨輪次結果不一定一致。
- **信心**：中
- **請求等級**：P2
- **建議**：0006-S1 列出 `checkpoint('step-1'…'step-10')` 是 upgrade 自己的步驟編號，並寫明「during step 9」的注入方式。

**V-12**
- **位置**：spec.en.md:121（B4 "never commits, stages, or changes refs"、"reads status without optional locks"）、:101–106；traceability.md:85（觀察項目列有 `HEAD` 與 `git diff --cached`）
- **違反的要求**：每個保證都要有 AC 或列。
- **證據**：
  - 沒有任何 AC 或列斷言執行後 `HEAD` 與 index 不變。
  - AC-11 的 "HEAD's files" 在 `HEAD` 已經被移動時也會成立。
  - `--no-optional-locks` 只寫在 step 4 的命令文字裡，沒有斷言。
- **影響**：US-4「nothing committed」沒有直接的驗收出口。
- **信心**：中高
- **請求等級**：P2
- **建議**：在 U17 或 U24 加上斷言：`HEAD` 等於執行前，且 `git diff --cached` 為空。

**V-13**
- **位置**：spec.en.md:121（B4：`Range.json` 會被讀取並改寫，restore 會還原）、traceability.md:438–440
- **違反的要求**：規範層的主張必須可以驗證。
- **證據**（推論）：
  - 這段主張沒有任何列。
  - 在大小寫不敏感的檔案系統上，step 9 rename 成 `range.json` 後，磁碟上存的名稱可能變了。restore 能還原內容，但存的名稱未必會恢復。
  - `git ls-files -- ./range.json` 的 pathspec 預設區分大小寫，所以會把 `Range.json` 判成 untracked；它若被 ignore，就會走到 D15。這部分也沒有列。
- **影響**：B4 的 "the restore commands undo the write" 無法驗收。
- **信心**：低
- **請求等級**：P2
- **建議**：在 macOS 或 Windows 加一列只在大小寫不敏感時執行的測試，否則把這段主張降為推測。

**V-14**
- **位置**：traceability.md:85（只隔離了 `HOME` 與 `GIT_CONFIG_GLOBAL`）、spec.en.md:143–146
- **違反的要求**：測試結果不能依賴無法控制的環境。
- **證據**（推論）：
  - 沒有設定 `GIT_CONFIG_NOSYSTEM`。
  - Windows runner 上的 Git for Windows 在 system config 裡預設 `core.autocrlf=true`，也可能設定其他值。
  - U19（`merge.conflictStyle`）與 U05（`status.showUntrackedFiles`）的前提是「只有 global config 會影響結果」。
- **影響**：在 cross-OS job 上，`HEAD's files`、byte-identical 這類斷言可能因 runner 不同而有不同結果。
- **信心**：中低
- **請求等級**：P2
- **建議**：seam 加上 `GIT_CONFIG_NOSYSTEM=1`。

**V-15**
- **位置**：traceability.md:277（R4 的條件行）、:216–218（UP-A12 的 deploy.yml 句子）、:341（U26）、:369–370（U71、U72）
- **違反的要求**：每條輸出規則都要有列，而且要能用 message id 判定。
- **證據**：
  - R4 有兩個條件行沒有任何列：「`pnpm install` when the run wrote `package.json` or `pnpm-lock.yaml`」與「for a range with `.github/workflows/deploy.yml`, push a new `v*` tag」。UP-A12 的 deploy.yml 子句同樣沒有列。
  - U71、U72 斷言某個句子 "present / absent"，但 spec 沒有給這些句子 message id。測試用的 "stream text by message id" 無法定位到 R1 或 R4 裡的單一句子。
- **影響**：判定靠實作者自訂的 key 或比對文字。
- **信心**：中
- **請求等級**：P2
- **建議**：為這些句子指定 message id，並為兩個條件行各加一列。

**V-16**
- **位置**：traceability.md:346（U31）與 spec.en.md:138（AC-12）
- **違反的要求**：列與 AC 必須一致。
- **證據**：AC-12 說 0005 的測試有兩個例外，其中一個是 "C02's `upgrade` cases change as AC-1 specifies"。U31 只寫 "C18's existing cases and the other 0005 tests unchanged"，沒提 C02 的改變。
- **影響**：照 U31 驗收，C02 的修改會被當成違規。
- **信心**：中
- **請求等級**：P2
- **建議**：U31 補上 C02 這個例外。

**V-17**
- **位置**：traceability.md:292–297（stage 8 的步驟 3–4）
- **違反的要求**：stage 8 的 surface 必須可以照字面執行。
- **證據**：步驟 1 在空的暫存目錄執行，步驟 2 寫明 "In `sim`"，但步驟 3、4 沒有寫工作目錄。如果在上層目錄執行，結果會是 UP-E01，不是預期的結果。
- **影響**：輕微，靠常識可以推得，但 AC-13 要求的是 "exactly the listed results"。
- **信心**：低
- **請求等級**：P2
- **建議**：步驟 3、4 明寫 "in `sim`"。

**V-18**
- **位置**：spec.en.md:98、:134（AC-8 的「macOS, Windows」）、:121（B4）
- **違反的要求**：AC 的適用範圍必須是能驗證的事實。
- **證據**（推論）：
  - 「macOS 與 Windows 的原生 `realpath` 會回報儲存的名稱」是以整個平台為單位下的主張。測試只在 runner 的預設 volume 上抽樣，macOS 上的 SMB、exFAT 等掛載 volume 沒有驗證。
  - B4 只列出了 Linux 的例外。
- **影響**：AC-8 與 P-9 的保證範圍比實際驗證到的範圍更大。
- **信心**：低
- **請求等級**：P2
- **建議**：把範圍寫成「runner 已驗證的預設檔案系統（APFS、NTFS）」，其餘列入 B4。

**V-19**
- **位置**：spec.en.md:131（AC-5 "before every other entry rule"）、traceability.md:140
- **違反的要求**：錯誤的先後順序必須可以判定。
- **證據**：pax `comment` 要等 gzip 與 tar 嚴格解析完才拿得到。解析錯誤（CW-E08）不屬於 entry rule，所以 comment 缺漏加上 stream 截斷時應該給哪個 code，要靠推論才知道。
- **影響**：輕微。
- **信心**：低
- **請求等級**：P2
- **建議**：明寫「解析錯誤先於 comment 檢查」。

---

**轉給其他軸的觀察（不計分）**：
- M12 的 merge-file 輸出走 `runGit` 的 `stdout`。如果 0005 的 runner 把它解碼成 UTF-8 字串，非 UTF-8 的文字檔內容會被改壞。建議由 R 或 C 軸確認。
- `git ls-files -- ./range.json` 的 pathspec 區分大小寫，跟 B4 的 `Range.json` 敘述可能有落差（見 V-13）。

依等級統計：P0 0、P1 1、P2 18，共 19 項。
