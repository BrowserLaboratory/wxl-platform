# Round 2：軸 4 紅隊（epic 0006-range-upgrade）

審查版本：spec.en.md blob `2cf003ad…`、traceability.md blob `afd5040b…`，HEAD `56902c2`；凍結 prompt blob `0bfaa5b2…`。我沒有 shell，只讀了 working tree 的檔案，沒有自己核對 blob hash。git、Windows、WSL、vfat 的行為都是推論，沒有實測。

---

### R-1　UP-E12 的處理建議會把老師導向不受保護的 `--from <commit>`，D11 防的攻擊因此繞回來

- **位置**
  - traceability.md:244（UP-E12 的訊息內容）
  - traceability.md:296–297、299–310（stage 8 的步驟 3 → 4）
  - spec.en.md:59（US13）、:118（B1）、:120（B3）
  - docs/adr/0009-upgrade-base-is-an-upstream-release.md:22–23、28–33
- **違反**：US13 的目的：被改過的 `range.json` 不能讓合併把非 release 的內容當成上游。另外違反 ADR-0009 不採用「只警告」的理由：「a warning in a long report is easy to miss」。
- **證據（直接讀到）**
  - UP-E12 的訊息會印出兩個 commit，說明 `--from` 可以指定 base。它列出的原因只有三種，都是無害的：`CREATE_WXL_COMMIT`、在非 tag commit 打包、tag 移動過。沒有列出「有人改了 `range.json`」。
  - stage 8 把「UP-E12 之後執行 `--from <記錄的 commit>`」定為標準流程（步驟 3 → 4）。
  - `--from <commit>` 只在 R1 多一句「not checked」（D17）。
- **推論**
  - B3 的攻擊者（共同授課老師、被合併的 PR）把 commit 改成 fork network 裡的 commit 後，會先觸發 UP-E12。老師照訊息和 stage 8 的示範，很可能把訊息裡「記錄的那個」commit 貼進 `--from`，X1 和 X2 就恢復了。
  - 這時唯一的防線是 R1 的一句話，而且要等合併完才印出來。
  - 攻擊者控制 b，所以可以把衝突全部避開（讓 b = o），D16 的 R4 句子就不會出現（見 R-4）。
- **影響**：D11 和 ADR-0009 要堵的 X1 和 X2 經過工具自己的建議文字重新開啟，只多了一步社交工程。
- **信心**：中高
- **請求等級**：P1
- **建議**
  - UP-E12 的訊息要分清楚兩個 commit：預設建議 `--from <version>`，因為它走 tag、已經驗證。
  - 明示「記錄的 commit 不是 release；除非確定靶場就是從它建立的，否則不要用它」，並提示用 `git log -p -- range.json` 檢查是誰改的。
  - stage 8 步驟 4 的寫法也要跟著調整，或註明這是維護者專用的情境。

### R-2　步驟 6 在下載前用 `range.json` 宣稱的值判定 UP-I01，J6 被繞過，靶場會被假裝成「已是最新」

- **位置**
  - traceability.md:139（步驟 6）、:418–420（自審寫到 a false claim only ends the run）
  - spec.en.md:120（B3）、:59（US13）
  - 程式：create-wxl/src/upgrade.mjs:283–302、315
- **違反**：B3 的「Does not protect」沒有列出這個後果。另外，「a recorded base that is not an upstream release」沒有被拒絕，而是被當成成功。
- **證據（直接讀到）**：只要以下任一條件成立，就會在 J6 之前以 exit 0 印出 UP-I01：
  - `upstream.commit` 等於 target commit；
  - `upstream.version` 等於 target 版本，而且沒有 override。
- **推論**
  - 能改 `range.json` 的人，把 `version` 設成目前 npm latest 的版本、`commit` 隨便填一個 40 碼 hex，之後每次 `pnpm range:upgrade` 都會回報「nothing to do」，靶場永遠收不到上游修補。訊息裡印的 commit 也是攻擊者填的。
  - 把版本設成很大的數字則會得到 UP-E07，不過那是拒絕，傷害較小。
- **影響**：老師會一直以為靶場已經是最新版，上游的修補（包括安全修補）都收不到，而且沒有任何提示。自審有考慮到這點，卻寫成「只會結束這次執行」，B3 也沒有列出來。
- **信心**：高
- **請求等級**：P2
- **建議**：二擇一。
  - 在 B3 的「Does not protect」補上「can make the upgrade report UP-I01」。
  - 或者，當 base 來自 `range.json` 而要判 UP-I01 時，只下載 tag archive 的 header 來比對 J6。ADR-0009 不採用的是「每次都下載兩份」，這個做法只發生在 no-op 的情況。

### R-3　B4 低估了 P-9 的盲區：Linux 端看到的 NTFS 和 vfat（WSL 的 `/mnt/c`、vfat、CIFS）不只會漏掉大小寫別名，也會漏掉 8.3 短檔名，X3 一型的後果仍然存在

- **位置**
  - spec.en.md:121（B4：「…may miss a letter-case alias」）、:97–98、:134（AC-8）、:189（Out of Scope 只排除 Windows terminal）
  - traceability.md:103（name on disk）、:178（P-9）、:176（P-7 只比對字面上的 `.gitignore`）
- **違反**：B1 的 Protects 寫「never touch … a path whose name on disk differs from p (P-9; B4 lists the limits of P-9)」，但 B4 列出的限制不完整。
- **證據**
  - 直接讀到：B4 只寫 ext4 casefold、vfat、CIFS 可能漏掉「letter-case alias」。
  - 推論：
    - 在 Linux 的 vfat 上，lookup 也接受短檔名；CIFS 掛載 NTFS 時，伺服器端會解析 8.3。
    - WSL 的 drvfs 或 9p 走 NT API，由 Windows 建立的目錄預設不分大小寫。
    - 這些情況下 glibc 的 `realpath` 都回傳傳入的名稱，P-9 的比較一定相等。
    - Windows 老師在 WSL 裡處理 `/mnt/c/...` 下的靶場是常見情境，而 C: 預設開著 8.3 短檔名。
  - 推論：老師照別人的建議執行 `--from <commit>` 時，b 裡可以放 `GITIGN~1` ≡ `.gitignore`、T 裡沒有這個檔案。這時 P-7 不比對這個名稱，P-9 又看不出別名，M6 就會刪掉 `.gitignore`。
    - D14 讓 R5 的還原變得安全。但如果老師照 R4 的建議 build 後直接 commit，原本被 ignore 的機密（例如 `.env`）會出現在 `git add -A` 裡。
    - R2 列出的刪除路徑是 `GITIGN~1`，不是 `.gitignore`，不容易察覺。
- **影響**：在一個實際常見的環境裡，B1 和 AC-8 的保證並不成立；B4 也沒有讓讀者知道 8.3 這一類別名。
- **信心**：中
- **請求等級**：P1
- **建議**
  - 在 B4 補上「WSL drvfs/9p、vfat、CIFS 上，8.3 與大小寫別名都可能漏掉」。
  - 或者把 P-9 改成可攜的做法：readdir p 的上層目錄，確認最後一段名稱在 NFC 正規化後逐字存在於清單中。readdir 在這些檔案系統上都回傳儲存的名稱。

### R-4　攻擊者指定的 `--from <commit>` base 仍能靜默覆蓋老師的檔案，D16 的提醒攻擊者也能避開；B1 的「Does not protect」沒有寫出具體後果

- **位置**
  - spec.en.md:118（B1：「a `--from <commit>` makes that commit's content the base, whoever suggested it」）、:107–109
  - traceability.md:275–277（R2、R4）、:435–437
  - review/chain-analysis.md:30（缺口 1）
- **違反**：串連分析的缺口 1 要求寫出具體後果，這次只為 `range.json` 修正了。
- **證據**
  - 直接讀到：
    - R2 只逐一列出 M6 的刪除；M5 和乾淨的 M12 只計入 updated 的數量。
    - R4 的 `|||||||` 句子只在 R3 有 UP-A1 時才印。
  - 推論：攻擊者讓 b = o，就能用 M5 把老師修改過的 tracked 檔案換回上游版本，或讓乾淨的 M12 刪掉老師寫的幾行。這樣完全不會產生 UP-A1，R4 的句子不會出現，只剩 R1 的一句話。
- **影響**：老師的修改被靜默還原（例如改過的 flag、題目修正），報告裡只看到數量。
- **信心**：中高
- **請求等級**：P2
- **建議**
  - 在 B1 寫出 M5、M6、M12 和 `--diff3` 的具體後果。
  - 也可以考慮 base 來自 `--from <commit>` 時，R2 同時逐一列出 updated 的路徑。

### R-5　由 T 本身的名稱引起的別名或特殊名稱，模型外只寫了 ignore 檔一種

- **位置**
  - spec.en.md:121（B4 的 Outside the model：「upstream itself shipping a path the file system resolves to an ignore file」）
  - traceability.md:186–189、:142（步驟 9 依排序寫入）
  - 0005 rule 3（接受 `:`、Windows 保留名稱、`PLATFO~1`）
- **證據（推論）**
  - 同一次執行內產生的 8.3 碰撞：例如 T 同時新增 `docs/LONGFILENAME.md` 和 `docs/LONGFI~1.MD`。依 UTF-16 排序，長檔名先寫，系統隨即產生短檔名 `LONGFI~1.MD`，之後的 rename 會落在同一個檔案上。P-9 在 plan 階段看不到，因為那時兩個檔案都還不存在。
  - 含 `:` 的名稱在 NTFS 上會變成 ADS，`CON`、`NUL` 之類的名稱是裝置名稱，可能讓步驟 9 中途失敗（UP-E09）。
  - 在 ext4 上，T 新增一個 NFC 形式的目錄，而磁碟上已有 NFD 形式的同名目錄時，P-4 只比對完整路徑，於是產生兩個看起來相同的目錄。
- **影響**：都需要上游本身提供這些內容（B2 信任上游），影響有限。不過 B4 的模型外描述比實際範圍窄。
- **信心**：低
- **請求等級**：P2
- **建議**：把 B4 的模型外描述擴大成「T 自己的名稱在檔案系統上互為別名，或是特殊名稱」；也可以在 0005 rule 3 拒絕 `:` 和 Windows 保留名稱。

### R-6　`range.json` 有 `__proto__` key 時，改寫後會遺失這個 key，違反 AC-9

- **位置**
  - 程式：create-wxl/src/merge-apply.mjs:40–47（:43 `next[key] = …`）
  - spec.en.md:135（AC-9）
  - traceability.md:222–225
- **證據（直接讀到）**：`JSON.parse` 會把 `__proto__` 建成自有屬性。但 `next['__proto__'] = value` 是透過 setter 設定 prototype（值是原始型別時則忽略），`JSON.stringify` 不會輸出它，key 因此消失。另一個分支 `{ upstream, ...current }` 用 spread 複製，會保留這個 key，兩個分支的行為不一致。
- **影響**：AC-9 的「other top-level keys are deep-equal」不成立。實際危害很小。round 1 的 R-19 接受的是 `JSON.parse` 的語意，這裡出問題的是賦值方式，不是 parse。
- **信心**：中高
- **請求等級**：P2
- **建議**：改用 `Object.defineProperty`，或用 `Object.create(null)` 建物件；U24 加一個含 `__proto__` 的測試案例。

### R-7　步驟 9 的暫存檔名稱 spec 沒有規定；收到無法攔截的訊號時，殘檔可能被 ignore 而一直留著

- **位置**
  - traceability.md:142（「a new file in the destination directory」）、:145–148
  - 程式：merge-apply.mjs:28–33（`.create-wxl-upgrade-tmp-<hex>`）
  - spec.en.md:137（AC-11 只檢查 `tmpRoot` 下沒有殘留目錄）
- **證據（推論）**：如果老師的 ignore 規則涵蓋 dotfile（例如 `.*`），執行被 SIGKILL 或遇到斷電時，殘留的暫存檔不會出現在 status 裡，`git clean -fd` 也不會刪掉它。AC-11 只要求原本被 ignore 的檔案逐位元組不變，沒有要求「沒有新增被 ignore 的檔案」。
- **信心**：低
- **請求等級**：P2
- **建議**：在 spec 裡規定暫存檔的名稱格式，並在 R5 或 UP-E09 提醒可以搜尋這個前綴；也可以在 AC-11 加上「沒有新增被 ignore 的檔案」。

### R-8　在不分大小寫的檔案系統上，tracked 的 `Range.json` 加上 ignore 規則，可能卡在 UP-E13 的迴圈

- **位置**
  - traceability.md:138（D15：`git ls-files -z -- ./range.json`）、:245（UP-E13 的建議）
  - spec.en.md:121（B4 已經提到 `Range.json` 這種大小寫變體）
- **證據（推論）**
  - pathspec 比對預設分大小寫，所以 `ls-files` 什麼都不印。
  - `check-ignore` 在 `core.ignorecase=true` 時不分大小寫，所以判定為 ignored，結果拒絕一個其實已經 tracked 的檔案。
  - 照訊息執行 `git add -f -- range.json` 時，git 可能把它對應到 `Range.json` 的 index entry，所以下次 `ls-files` 還是什麼都不印。
- **影響**：會誤拒，老師可能被同一個建議困住；沒有資料遺失。
- **信心**：低
- **請求等級**：P2
- **建議**：在 B4 或 UP-E13 的訊息補上這個情況，提示老師把檔名改回 `range.json`。

### R-9　P-9 用 NFC 等價放行，但 P-5 的 `check-ignore` 只比對字面

- **位置**：traceability.md:178、:111、:185–186
- **證據（推論）**：在 APFS 這種不分正規化的檔案系統上，p 是 NFC，磁碟上存的卻是 NFD 形式的 ignored 檔案，而且 ignore 規則寫的是 NFD 字面。這時 P-5 判定為沒被 ignore，P-9 又因 NFC 等價而放行。只有在 o ≡ b 時，M5 才會寫入一個被 ignore 的檔案。這需要老師刻意製造很特殊的狀態，而且 `core.precomposeunicode` 通常會先把名稱統一。
- **信心**：低
- **請求等級**：P2
- **建議**：在 P-5 也用磁碟上的名稱做一次 `check-ignore`；或者只把這個情況記錄下來。

---

### 查過、沒有發現問題的項目

- **J6 的 URL**：版本先經過 regex 驗證，下載也一律來自 source record 指定的 repository，不能注入。
- **發布流程**（publish.mjs X3、X6）：保證 source record 的 commit 就是 tag 的 commit，所以正常發布的版本會通過 J6。
- **D14 的還原順序**：檔案和目錄互換時，被刪掉的子樹裡不可能有老師原有的 ignored 檔案。
- **D15 的檢查順序**：在步驟 6 之前執行，`--from` 的情況也有涵蓋。
- **R2 的刪除路徑**：名稱一定是老師自己 tracked 的名稱，攻擊者無法用 bidi 字元偽造。
- **P-3 先於 P-9 執行**：Windows 的 junction 在 Node 裡會被當成 symlink。
- **步驟 9 的寫法**：rename 的目的地都在同一個目錄、使用 `wx` flag。
- **stage 8 的版本鏈**：根目錄 manifest 和 create-wxl 的版本相同，所以步驟 3 會得到 UP-E12，不是 CW-E07。

依等級統計：P0 0、P1 2、P2 7，共 9 項。
