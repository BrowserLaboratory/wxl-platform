# Epic 0006 收尾：漏洞串連分析

依 `docs/agents/review.md`「Epic close-out: chain analysis」。輸入：T-0026、T-0027 的第 7 階段報告（`security-T-0026.md`、`security-T-0027.md`）、兩張 ticket 第 6、7 階段的處置與「記錄、不修」的項目，以及 spec 的「Trust Boundaries and Threat Model」（B1～B6）與 `traceability.md` revision 2.5。程式碼以 `main` 的 `651e866`（兩張 ticket 都已合併）為準。epic 0005 的串連分析（`.proj.specs/0005-create-wxl/review/chain-analysis.md`）已涵蓋 create 路徑，這裡只看 epic 0006 新增的環節。

問題：個別嚴重度低的缺陷，能不能串成一條跨越信任邊界的鏈？

方法：workflow 派兩個獨立的找鏈者，一個從攻擊者的位置往前推，一個從受保護的資產往回推，共找出 20 條候選鏈，另有 44 個想法在找鏈階段就被排除（各附理由）。每條候選鏈交給一個獨立的懷疑者，逐環對照 `main` 的程式碼查證，最後由完整性檢查者（`harness-challenger`）找出遺漏與互相矛盾的判定。判斷全部來自讀碼；git、GitHub、Windows 與 HFS+ 的行為是推論，沒有實測。

## 結論

**有跨越信任邊界的鏈：B3（`range.json` → upgrade）跨到 B4（upgrade → 老師的 repository 與成果）。依規定，epic 完成前開出 ticket T-0061。** 這些鏈的嚴重度是 low，只有一條在 medium 的下緣。它們都沒有程式碼執行，也不能把 o 與 t 以外的內容寫進乾淨合併的結果。要部署給學員（B6），一律得等老師自己 commit 並 push。

所有跨界的鏈共用同一個根因：B3 的「Does not protect」承認，能修改 `range.json` 的人（共同授課老師、被合併的 PR）可以挑 fork network 裡的任何 commit 當 base，但只寫了一種後果：「跳過中間的上游變更」。實際上，這個 commit 的內容由攻擊者決定，所以 b 也由攻擊者決定。合併表與報告又假設 b 是真的上游，因此產生下表的後果。

| 鏈 | 環節 | 判定 | 理由摘要 |
|---|---|---|---|
| X1：偽造的 base 讓 o ≡ b 成立，用 M5 覆蓋老師的修改，用 M6 刪掉老師的檔案，乾淨的 M12 也能挑幾行刪掉 | B3 Does not protect；T-0026 F25（宣稱的版本不和 archive 交叉比對）；security-T-0026 候選 02；security-T-0027 候選 07 | **跨界**，low | 兩個方向的找鏈者都找到這條。b 可以直接複製老師公開 repository 的檔案。這些路徑在 R2 裡只算成 updated／deleted，不是注意項目，PR 裡也只看得到 `range.json` 換了一串 40 碼 hex。被動到的都是 tracked 檔案，git 救得回來；fork:init 寫的九個 anchor 檔會觸發 UP-A12。security-T-0027 候選 07 判誤報的理由（「寫入一律來自 t」「M6 要求 o ≡ b」）不完整：對 B3 的攻擊者來說，o ≡ b 並不是障礙 |
| X2：偽造的 base 經 `--diff3` 衝突區塊的 `|||||||` 段落，把攻擊者寫的文字放進老師的檔案 | 同 X1；D2 ⑦（`--diff3`）；B4 Does not protect（衝突標記） | **跨界**，low（兩個方向判定不同，主 session 裁定） | 往回推的那一方認為，B4 已承認「conflict markers written into text files until resolved」，所以不算跨界。但 `traceability.md` 的自審寫「the base's lines are upstream's, which is what the teacher needs to see」，在偽造的 base 下這句不成立：老師會把攻擊者的文字當成舊版上游來看。主 session 採用「跨界」，理由是 spec 承認的是標記，不是攻擊者撰寫的內容 |
| X3：Windows 上，偽造的 base 放一個名為 `GITIGN~1`（8.3 短檔名）的一般檔案，內容複製老師的 `.gitignore`；M6 刪掉 `.gitignore`，接著 R5 的 `git clean -fd` 刪掉老師所有被 ignore 的檔案 | 同 X1；0005 rule 3 只擋字面；P-7 只比對名稱；R5 的指令順序 | **跨界**，medium 下緣 | step 8 從磁碟讀 o，`lstat('GITIGN~1')` 在開著 8.3 短檔名的磁碟區會解析到 `.gitignore`。git 的 fsck 只在 `.gitignore` 的 NTFS 別名是 symlink 時才報錯，一般檔案會被接受（推論）。後果是不可逆地失去老師被 ignore 的檔案（例如本機密碼檔）。前提是：老師在 Windows 上、磁碟區開著 8.3 短檔名、合併了攻擊者的 PR、執行升級，接著又照 R5 撤銷。HFS+ 的可忽略碼位也是同一型，但現在的 macOS 預設是 APFS |
| core.ignorecase=false 搭配不分大小寫的檔案系統，偽造的 base 用大小寫變體路徑讓 M6 刪掉被 ignore 的建置產物 | 同 X1；security-T-0027 候選 23 | 模型外 | `core.ignorecase=false` 是老師自己的設定；被刪的是 `node_modules`、建置產物這類可以重新產生的檔案 |
| `.git` 的 NTFS／HFS+ 別名經由 M5／M6 寫入或刪除老師既有的 `.git` | security-T-0027 候選 01／14；0005 chain-analysis 第二列 | 真的鏈，但在模型外 | 寫入要控制 t，等於上游本身；GitHub 的 fsck 會拒收含 `.git` 別名的 tree（未驗證）。只控制 b 時，只能刪掉內容猜得到的 `.git/HEAD` 之類的檔案，是可以復原的 DoS。和 X3 用的是同一型缺口，修法也相同 |
| 偽造的 base 讓 lockfile 走 M10，換成上游的 lockfile | 同 X1 | 模型外 | 和一般升級對 lockfile 的處理差不多，增益很小 |
| step 4 與 P-5 在濾掉 `GIT_*` 的環境下判斷，R5 卻在老師自己的環境執行 | security-T-0027 候選 12 | 模型外 | 兩邊的差異來自老師自己的環境變數 |
| 被 ignore 的 `range.json` 仍被改寫，還原指令不會還原 | OQ-026 | 模型外 | 需要老師自己設錯 ignore 規則；已列為 OQ-026 |
| bidi 或零寬字元的路徑偽造 R3 | security-T-0026 候選 08／23、security-T-0027 候選 13／25 | 不成鏈 | 規格（D10 的跳脫範圍）只要求 C0、DEL、C1，0005 有相同判定 |
| 其餘候選（`Range.json` 的大小寫、`__proto__`、UTF-8 解碼的檔名、上游 `.gitattributes` 選用老師的 filter） | — | 不成鏈或模型外 | 理由見本機研究紀錄 |

## spec 準確度的缺口

1. **B3 的「Does not protect」寫得不完整。** 它只寫了「跳過中間的上游變更」。應補上：偽造的 base 能讓 M5、M6 覆蓋或刪除老師的 tracked 檔案、讓 M12 挑幾行刪掉，而且這些都不會成為注意項目；也能讓攻擊者寫的文字出現在衝突區塊的 base 段落。或者，由 T-0061 新增一條 Protects，讓這些後果消失。
2. **`traceability.md` 的自審說「base 的行就是上游的」**，和 B3 承認 base 可以是 fork network 的 commit互相矛盾。
3. **AC-8、D9 的全稱句「the set of ignored paths does not change」** 寫在名稱層，但檔案系統是在身分層解析名稱（NTFS 8.3、HFS+ 可忽略碼位）。這和 0005 串連分析的缺口 1（B1 寫「no `.git` path」，rule 3 卻只擋字面）是同一型。
4. **security-T-0027 候選 07 的誤報理由不完整**，已在報告裡註明。

## 開出的 ticket

**T-0061（`pending`）：upgrade 的 base 來源與磁碟上的名稱別名。** 內容是上表 X1～X3 的修法選項，需要先做 spec 決策（第 1 階段）：

- 讓 `range.json` 的 commit 和上游 tag 綁定：另外下載 `refs/tags/v<upstream.version>`，要求它的 pax comment 等於 `upstream.commit`；fork 無法提供上游命名空間裡的 tag。這也一併補上 F25。不一致時拒絕，或要求老師用 `--from` 明確確認。
- 通用的別名預檢查：讀 o 之前用 `fs.realpath.native` 確認磁碟上的實際名稱和 p 的最後一段相同，不同就不動這個路徑並列為注意項目。這可以一次擋住 8.3 短檔名、HFS+ 可忽略碼位、大小寫別名，也順便擋住 `.git` 別名。
- R5 的指令順序：先 `git checkout -- .` 再 `git clean -fd`，讓 clean 套用 HEAD 的 ignore 規則（會改到 D2 ⑭）。
- M6 刪除老師的檔案時逐一列出路徑；R4 提醒衝突區塊的 `|||||||` 段落是 base 的內容。
- 修正上面的 spec 缺口 1～3。

## 沒有涵蓋

- 所有跨界判定共用一個沒有驗證的前提：GitHub 會用上游 repository 的 codeload URL 提供只存在於 fork 的 commit。這是 spec B3 自己的前提；它很可能成立（GitHub 在 fork network 之間共用物件），但這次沒有實測。
- Windows 的 8.3 短檔名解析、git fsck 對 `GITIGN~1` 的處理、HFS+ 的行為都是推論。
- 讓老師執行 `--from <commit>` 的社交工程不需要 repository 的寫入權，比「能改 `range.json`」的門檻低。威脅模型沒有「老師照攻擊者的建議下指令」這條邊界，由 T-0061 的第 1 階段一併判斷。
- 分析範圍是 `main` `651e866` 上 create-wxl 的升級路徑。完整的候選鏈、查證理由與被排除的想法，保存在本機研究紀錄。本報告不代表整個專案沒有安全問題。
