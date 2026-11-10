---
synced_from: spec.en.md
synced_from_sha: 36eefc90bd3008eb295be0189aa96c49095bf94e
---

# Spec 0006：靶場升級——併入上游的新發布版本

狀態：第 3.4 版（2026-11-10）。對抗式審查第 1 輪沒有找到 P0（`review/round-1.md`）；第 2 版套用它的處置（`review/disposition.md`，U1–U9 各組）與使用者的裁決 D1–D2，並依 D1，當時沒有跑第 2 輪。第 2.1–2.5 版（D7 到 D10）來自 T-0026 與 T-0027。第 3 版套用 T-0061 第 1 階段的 D11 到 D17（鏈分析的 X1–X3 與規格缺口、OQ-026，以及 0005 規則 3 的缺口），並以凍結的 prompt 進行第 2 輪審查，沒有找到 P0（`review/round-2.md`）；第 3.1 版套用第 2 輪的處置（`review/disposition-2.md`，D18 到 D20），不再加跑一輪。第 3.2 版只改 D18 的措辭。第 3.3 版套用 D21（git 2.26 或更新，建立靶場也一樣：0005 第 2.3 版）與 D22（還原指令會移除位在「`HEAD` 是檔案的位置上的資料夾」裡的被忽略檔案），經自我檢查，不再加跑一輪。第 3.4 版套用 D23（還原指令印成以 `&&` 串起的一行）與 D24（預先檢查 P-10：存在的未追蹤路徑是別名），來自第 3 版收尾的串連分析，同樣經自我檢查。決策改變某條驗收標準之處，本文會點名該決策。0005 已經 commit，它的追溯矩陣第 2.2 版（D13）與第 2.3 版（D21）是本版的一部分。本文由 `traceability.md` 推導，那份檔案收著本規格引用的固定清單（決策摘要、詞彙、指令文法、步驟順序、base 規則 J1–J6、預先檢查 P-1–P-10、合併表 M4–M12 與父路徑檢查、由 fork:init 衍生的內容、`range.json` 的更新、代碼 UP-E01–E13、UP-I01 與 UP-A1–A15、報告 R1–R5、第 8 階段的模擬），以及 seam 0006-S1 與 S2。本 epic 依賴 0005（`.proj.specs/0005-create-wxl/`，traceability 第 2.3 版）：它沿用 0005 的 `run` 函式、套件來源紀錄、下載、archive 項目規則、原廠靶場處理 P1–P4、`range.json` schema、語言規則、訊號處理、輸出跳脫，以及它點名的 CW 代碼。

## 問題陳述

老師的靶場是某一個上游發布版本的副本，上面疊著老師自己的改動：fork:init 套用的設定、改過的題目、新增的題目。上游發布新版——一個修正、一項新的平台功能——時，老師沒有工具可以把它併進來。把新版直接複製蓋過靶場，會失去老師的成果；手動合併則需要確切知道靶場來自哪一版上游，以及上游從那之後改了什麼。做不到這件事的老師，每一次上游發布都會落後，而這正是研習維護者想避免的：「後面老師才有辦法在我升級時也能跟上」。

## 解決方式

在靶場的根目錄執行 `pnpm range:upgrade`，會執行最新版 `create-wxl` 的升級指令。它讀取 `range.json`，找出靶場來自哪一個上游發布版本，下載那一版與最新的一版，把兩者都建成原廠靶場，再以三方合併把上游的改動併進靶場：老師沒動過的檔案，套用上游的改動；上游沒動過的檔案，保留老師的版本；兩邊都改了某個文字檔時，由 git 的合併寫出結果，或寫出衝突標記，列出老師的行、上游的舊行與新行。每一種它無法安全處理的情況——二進位檔、只有一邊刪除、符號連結、被忽略的檔案、大小寫衝突、變成資料夾的檔案——都保留老師的版本並列出來。上游改了 fork:init 會寫入的檔案時，報告會說要重新執行 `pnpm fork:init`。它不 commit 任何東西：老師用 `git diff` 檢視、處理列出的項目，再 commit——或用兩道 git 指令撤銷整次升級。沒有 `range.json` 的靶場（fork、clone）可以用 `--from` 指出它的 base，從 3.0.0 版起適用。從 `range.json` 讀出的 base 必須是上游的發布版本：升級會透過上游自己的 tag 檢查它，所以改得動 `range.json` 的人只能指定另一個上游發布版本當 base，絕不能指定自己的內容（B3）。

## 使用者故事

1. 身為老師，我希望用一道指令把我的靶場帶到上游最新的發布版本，這樣我不必手動合併也跟得上上游。
2. 身為老師，我希望我自己的改動——設定、改過的題目、新增的題目、本機被忽略的檔案——都被保留，這樣升級永遠不會抹掉我的成果。
3. 身為老師，我希望上游和我改了同一處的每個地方都連同原因列出來，這樣我確切知道要看哪裡。
4. 身為老師，我希望升級不 commit 任何東西，並要求工作樹是乾淨的，這樣我能檢視升級，也能用 git 把它全部撤銷。
5. 身為老師，我希望我的靶場有未 commit 的改動或未完成的 git 操作時，升級會停下並說明原因，這樣我沒存下的成果永遠不會混進升級裡。
6. 身為靶場沒有 `range.json` 的老師，我希望能指出它來自哪一版，這樣我仍然能升級。
7. 身為老師，我希望即使我的靶場是舊的，升級也執行最新版的升級程式，這樣舊靶場不必先升級它的工具。
8. 身為老師，我希望 `range.json` 更新成新的發布版本，這樣下一次升級從正確的地方開始。
9. 身為老師，我希望已經是最新的靶場或降級會被拒絕，而且什麼都不動，這樣誤跑一次也無害。
10. 身為老師，我希望上游改了 fork:init 設定過的東西時會被告知，這樣我的部署設定保持最新。
11. 身為老師，我希望訊息是繁體中文或英文，而且需要注意的升級看起來不像失敗，這樣我看得懂結果。
12. 身為上游維護者，我希望升級在兩個真實推送的 commit 上、中間夾著一次老師式的改動得到證明，這樣研習之後第一次真正的升級能正常運作。
13. 身為與協同老師共用靶場、或接受 pull request 的老師，我希望升級拒絕不是上游發布版本的已記錄 base，這樣被改過的 `range.json` 無法讓合併把不是上游發布版本的內容當成上游的內容使用。
14. 身為老師，我希望完成的升級刪除的每個檔案都依路徑列出，這樣我會注意到我沒料到的刪除。

## 實作決策

- **在哪裡執行。** 升級是 create-wxl 的 `run` 的一條路徑，在第一個位置參數是 `upgrade` 時選用（R4）。上游 manifest 帶著 `range:upgrade` = `npx --yes create-wxl@latest upgrade`，所以執行的是最新發布版本的程式。GLOSSARY 的開發模組（0005 修訂過）涵蓋這一點。seam 在 0005-S1 的依賴之外加上 `tmpRoot`。
- **前置條件。** git 2.26 或更新（D21）；工作目錄是工作樹的最上層（經 `realpath` 後比較）；repository 至少有一個 commit，而且依一個列出每個未追蹤檔案、不忽略任何 submodule 的狀態是乾淨的，沒有 assume-unchanged 或 skip-worktree 的檔案，也沒有未完成的 merge、rebase、cherry-pick、revert 或 bisect。
- **Base 與 target。** base 是 `range.json` 的 `upstream`（J1–J6）或 `--from`；target 是套件來源紀錄的 commit（或 0005 的測試覆寫，連同它的警告）。來自 `range.json` 的 base 透過上游的 tag `v<version>` 下載，而且必須是那個 tag 的 commit（J6、D11；ADR-0009），所以它的版本與內容都屬於某個發布版本；`--from <version>` 的 base 依構造就是它 tag 的 commit，`--from <commit>` 的 base 不對照 tag 檢查（D17），target 也不檢查，它的可信度來自套件（B2）。來自 `range.json` 的 base 被 UP-E12 或 UP-E08 拒絕，或它的 tag 下載因狀態 404 得到 CW-E07 時，訊息依 D18 的順序給出 D18 的補救方式；`range.json` 的其他拒絕（UP-E04、UP-E05、UP-E06、UP-E13）不給。步驟 5 拒絕未追蹤、且被靶場規則忽略的 `range.json` （D15），因為還原指令無法撤銷對它的寫入。no-op、降級與 3.0.0 的下限，在 base 已知時於下載前檢查，並在只有 archive 能告知時於下載後再檢查一次（`--from <commit>` 的版本、`--from <version>` 從 tag archive 的 pax `comment` 得到的 commit）。`fetchArchive` 接收一個 ref：一個 commit，或 `refs/tags/v<version>`。
- **原廠靶場。** 兩份 archive 都在 `tmpRoot` 底下各自的 `mkdtemp` 資料夾裡通過 0005 的項目規則與 P1–P4。因為每個 base 都是 3.0.0 或更新，兩者都帶著 0005 的 `export-ignore`。0005 的項目規則 3 也拒絕 git 在 NTFS 與 HFS+ 上視為 `.git` 的名稱（D13；0005 第 2.2 版）。
- **先規劃，再套用。** B ∪ T ∪ tracked 裡的每個路徑，都在第一次寫入之前由預先檢查與合併表決定，包括每一次 `git merge-file` 的執行；比較時會把文字檔的 CRLF 正規化。套用時先刪除，再把每個檔案寫成新檔後 rename 到定位，最後寫入 `range.json`。文字衝突使用帶固定標籤的 `git merge-file --diff3`，所以使用者的 conflict-style 設定不會改變輸出；它的結束碼區分衝突（1–127）與錯誤。
- **安全規則。** 經過符號連結的路徑、被忽略的路徑、大小寫或 Unicode 互相衝突的路徑，以及檔案／資料夾不符的路徑，絕不寫入；名稱在磁碟上與 p 不同的路徑——本身或某個上層——也不寫入（P-9：取該路徑的原生 `realpath`，路徑不存在時改取它最深的既存真上層，該上層是靶場根目錄時 P-9 不適用；取相對於靶場根目錄 `realpath` 的路徑，把 `\` 換成 `/`，兩邊都經 NFC 正規化後比較；D12；這在 CI 驗證的預設檔案系統上成立，即 macOS 的 APFS、Windows 的 NTFS 與 Linux 區分大小寫的 ext4；其餘見 B4）；位在 submodule 本身或其底下的路徑也不寫入（P-8、D10）；父路徑檢查會丟掉被一個計畫不刪除的檔案擋住的寫入；`.json` 檔的乾淨合併仍必須能解析。
- **`range.json`** 排除在合併之外，在套用步驟之後重寫：`upstream` 改為 target，其他鍵保留。
- **不 commit，也不 stage 任何東西。** 因為工作樹原本是乾淨的、被忽略的路徑與 ignore 檔不會被動到，而且步驟 5 已拒絕靶場忽略的未追蹤 `range.json`（D15），所以 `git checkout -- . && git clean -fd` 能把狀態精確還原成 `HEAD`，B4 列出的例外除外；`checkout` 先執行，是為了讓 `clean` 套用 `HEAD` 的 ignore 規則（D14），`&&` 則讓 `checkout` 失敗時 `clean` 不會執行（D23）。報告會說明只能在做其他改動之前使用它們。
- **報告。** R2 在它的計數之後列出合併刪除的每個路徑；R3 含 UP-A1 時，R4 說明衝突區塊的 `|||||||` 段落是 R1 所列 base 版本的文字；`--from <commit>` 的 base 沒有對照上游 tag 檢查時，R1 會寫明（D16、D17）。
- **結束碼**：執行完成時為 0，不論有沒有注意項目（報告會列出它們；任何其他結束碼都會讓 pnpm 印出失敗），no-op 也是 0；錯誤時為 1；收到訊號時為 130，包括在步驟 10 收到，此時報告仍會先完整印出（D8）。

## 信任邊界與威脅模型

| # | 邊界 | 保護什麼 | 不保護什麼 | 不在模型內 |
|---|---|---|---|---|
| B1 | GitHub archive → 老師的靶場 | 兩份 archive 都以 commit 選定（來自 `range.json` 或 `--from <version>` 的 base 透過它的 tag 取得，再由 archive 自己的 `comment` 固定），並通過 0005 的項目規則，其中包含 git 在 NTFS 與 HFS+ 上對 `.git` 的別名（D13）；靶場建立之後被移動或刪除的 tag，會讓那個靶場從 `range.json` 的升級停下（UP-E12，tag 被刪除時為 CW-E07），而不是改變它的 base；R1 印出兩個 commit；寫入都留在靶場內，絕不經過靶場裡的符號連結，絕不碰被忽略的路徑或名稱在磁碟上與 p 不同的路徑（P-9；P-9 的限制見 B4），並以 rename 取代檔案，所以 hard link 的另一個名稱不會被改動 | 對 `--from <version>` 的 base，上游移動 tag：以 tag 現在的樣子決定 base（R1 會印出）；`--from <commit>` 讓那個 commit 的內容成為 base，不論是誰建議的：若刻意選 b 等於 o，M5 會以 t 取代老師改過的檔案、M6 會刪除老師的檔案、乾淨的 M12 會丟掉選定的行，而衝突區塊的 `\|\|\|\|\|\|\|` 段落會含那個 commit 的文字；若刻意選 b 等於 t，P-2 會讓 o 維持原樣且不回報，所以上游的改動（包括修補）會被靜默略過，而步驟 9 記下 target 之後，之後的升級會把這個差異當成老師自己的修改保留；建議這個 commit 的人，可能正是改了 `range.json` 的人，因為 UP-E12 會印出記錄的 commit；R1 會寫明 base 沒有對照 tag 檢查（D17）；老師把 `--from` 說錯（比真正 base 新的 base 會藏起其間上游的改動：R1 會顯示實際使用的 base）；設了 `CREATE_WXL_COMMIT`（測試用的覆寫，0005 B6）時，target 是那個 commit 的內容，不在 B2 的保護範圍內 | GitHub 對某個 commit 提供不同的內容（同 0005 B1）|
| B2 | npm registry → 老師的電腦 | 同 0005 B2；`npx --yes` 依設計不經提示就執行最新的 `create-wxl`（R4）；R1 印出執行中的版本 | 老師執行的是當下的 `create-wxl@latest`，可能是 cache 裡的那一份 | 被入侵的 npm 帳號或 registry |
| B3 | `range.json`（在老師的 repository 裡）→ 升級 | `lstat` 拒絕連結或非檔案（J1）；內容經過驗證（J3、J4）；拒絕其他 repository（J5）；commit 必須是上游該版本 tag 的 commit，fork 提供不了（J6、ADR-0009）；拒絕靶場忽略的未追蹤 `range.json`（D15）；印出 base（R1）| 任何能改老師 repository 裡 `range.json` 的人（協同老師、被 merge 的 pull request），都能把另一個上游發布版本——最高到 target（UP-E07）——指定為 base：比靶場真正來源更新的版本會跳過其間上游的改動（如同 B1 裡說錯的 `--from`），而且步驟 9 會記下 target，之後的升級不會再把它們帶回來；更舊的版本會重新合併靶場已有的改動：上游在其間新增、老師刪掉的檔案會被加回（M5），老師改回舊內容的檔案會被 t 覆寫（M5），乾淨的 M12 也可能重複出現某些行，這些都不是注意項目；同樣這些人也能加一條 ignore 規則，讓上游之後新增的某個檔案永遠不會被寫入（P-5、UP-A9）；等於 target 的版本（UP-I01）或高於它的版本（UP-E07）會在任何下載之前結束執行，所以靶場可以在不出錯的情況下被擋在上游的發布版本之外；R1 顯示實際使用的 base | — |
| B4 | 升級 → 老師的 repository 與成果 | 拒絕不乾淨或操作進行到一半的 repository；讀取狀態時不使用 optional lock；絕不 commit、stage 或改動 ref；絕不寫入或刪除名稱在磁碟上與 p 不同的合併路徑（P-9；`range.json` 由 P-1 排除在合併之外，並以它的字面名稱讀寫）；在每種無法處理的情況下保留老師的內容並列出；列出完成的執行刪除的每個檔案（R2）；還原指令能撤銷它做的每一項改動，本列「不保護什麼」所列的除外（D14、D15）| 寫進文字檔、直到處理掉為止的衝突標記；語意上錯誤的乾淨文字合併（只檢查 `.json` 能否解析）；在後續編輯之後才執行的還原指令，也會丟掉那些編輯（R5 有警告），並且不論兩個指令的順序，都會移除執行之後放進「`HEAD` 是檔案的位置上的資料夾」裡的被忽略檔案（D22）；在 `realpath` 不回報儲存名稱的檔案系統上（不區分大小寫的 Linux 檔案系統，例如 ext4 casefold，以及 Linux 看到的 NTFS、vfat 或 CIFS，如 WSL 的 `/mnt/c` 或掛載的共用資料夾），P-9 可能漏掉短檔名或字母大小寫的別名：本身名稱就是這種別名的路徑，P-10 仍會讓它保持不動（D24），但經由別名才到得了的資料夾底下的新路徑不在此列，而 macOS 與 Windows 上的其他磁碟區（SMB、exFAT）沒有驗證；P-9 在 NFC 正規化之後比較名稱，P-5 則以字面比對 ignore 規則，所以在這種磁碟區上，和被忽略檔案只差正規化的 base 名稱只有 P-10 擋得下；在不區分大小寫的檔案系統上，`range.json` 被追蹤的大小寫變體（例如 `Range.json`）可能被 J1 讀成設定紀錄並在步驟 9 被重寫，而 D15 區分大小寫的 `git ls-files -- ./range.json` 可能回報它未追蹤（推論，未量測；J6 仍要求 base 是發布版本）；P-5 與 D15 把老師的 `.git/info/exclude` 與全域 `core.excludesFile` 算作靶場的規則；還原指令在老師自己的 shell 裡執行，會讀取升級本身的 git 指令不讀的系統與全域 git 設定（例如 Git for Windows 系統設定裡的 `core.autocrlf`）；git 2.26–2.35 仍會把 `core.fsmonitor=true` 當成 hook 指令執行，再設了 `core.fsmonitorHookVersion=1` 時可能回報沒有變更，步驟 4 的乾淨檢查就可能在有修改的工作樹上通過（D21）；git 2.26–2.34 讀到的設定裡有 `merge.conflictStyle=zdiff3` 時，`git merge-file` 會停下（UP-E11，什麼都不寫入），還原指令的 `git checkout -- .` 也會失敗，就像它的每一次 checkout 一樣（D21）| 執行期間有其他行程改動靶場；上游自己發布了會被檔案系統解析成彼此、或解析成尚不存在的 ignore 檔的名稱，或特殊名稱，例如 NTFS stream 或保留的裝置名稱（B2 的信任）|
| B5 | 終端機輸出 → 老師的終端機 | 同 0005 B5：外部值經過跳脫 | — | — |
| B6 | 部署的靶場 → 學習者 | 不變：升級寫入的任何東西，在老師 commit 並 push 之前都不會被部署 | — | — |

## 驗收標準

- **AC-1** 文法接受 `upgrade` 搭配 `--from <X.Y.Z>`、`--from <40 hex>` 與 `--lang`，放在任一側皆可；任何其他 `--from`、缺少的值、其他位置參數、未知、重複或只屬於建立的旗標，都以點名它的 CW-E02 結束，結束碼 1，什麼都不寫入。（U01、U02）
- **AC-2** 每個未通過的前置條件都在任何下載之前結束，結束碼 1，什麼都不寫入：不在最上層 → UP-E01（經符號連結到根目錄的路徑可接受）；git 不存在或比 2.26 舊（D21） → UP-E02；不乾淨 → UP-E03，帶 `traceability.md` 的 token，不論使用者的 `status.showUntrackedFiles` 為何；未追蹤、且被靶場規則忽略的 `range.json` → UP-E13，不論有沒有 `--from`，而 `git ls-files` 結束碼不是 0、`git check-ignore` 結束碼不是 0 或 1，或 `runGit` 對兩者之一 reject → CW-E14，點名該指令（D15）；這項檢查在 J1–J5 之後、步驟 6 之前，所以符號連結是 UP-E06，相等的 commit 仍是 UP-E13；步驟 4 的 git 指令結束碼超出它文件記載的範圍（所以不含 `git rev-parse --verify HEAD` 的 UP-E03 `no-head`），或被 `runGit` reject → CW-E14，點名該指令（D19）。（U03–U05、U67、U74）
- **AC-3** 有 `--from` 時 base 依 `--from`，否則依 `range.json`；`--from <commit>` 的版本取自 base archive 的 manifest，並出現在 R1；J1–J6 的失敗給出 `traceability.md` 的代碼與 token；有 `--from` 時只適用 J1 與 J3；比較 repository 時忽略 ASCII 大小寫；來自 `range.json` 的 base 透過 tag `v<version>` 下載，它的 archive 必須指名 `upstream.commit`，否則為 UP-E12（J6），而 `--from <version>` 的 base 依構造就是它 tag 的 commit，`--from <commit>` 的 base 不對照 tag 檢查（D11、D17）；每種失敗都以結束碼 1 結束，什麼都不寫入。（U06–U11、U65）
- **AC-4** 相等的 commit，或沒有 `CREATE_WXL_COMMIT` 時相等的版本，給出 UP-I01，結束碼 0，什麼都不寫入；base 已知時在任何下載之前，否則在步驟 7 下載並驗證兩份 archive 之後；base 版本高於 target 的給出 UP-E07，低於 3.0.0 的給出 UP-E10，時間點相同；完成並 commit 一次升級之後重跑，給出 UP-I01。（U12–U14、U50–U52、U61）
- **AC-5** 失敗、惡意或無法處理的 archive 以 0005 的代碼結束；pax `comment` 不存在、或不是 40 個小寫十六進位字元的 tag archive 以 UP-E08 結束，`--from <version>` 的 base 與來自 `range.json` 的 base 都一樣，且在 UP-E12 與其他每條項目規則之前；來自 `range.json` 的 base 缺少 tag 時以 CW-E07 結束；某個路徑元件被 git 在 NTFS 或 HFS+ 上視為 `.git` 的項目以 CW-E08 結束，而 `PLATFO~1` 與 `GITIGN~1` 可接受（D13）；每種情況都以結束碼 1 結束，靶場裡什麼都不寫入，`tmpRoot` 底下也沒有 `create-wxl-upgrade-` 項目。（U15、U16、U66、U73）
- **AC-6** 在一次執行裡，fixture 對 P-2 與 M4–M12 的每個分支各有一個路徑，每個路徑的結果都如該列所寫，R2 與 R3 恰好回報這些；乾淨的 M12 合併會寫入，重疊的合併帶有四行標記與三個標籤，不論 `merge.conflictStyle` 怎麼設；老師自己的檔案不被動到、也不回報；新的可執行檔以 0755 寫入；只有大小寫不同的 rename 給出 UP-A8；檔案被資料夾取代可以處理，反過來則給出 UP-A10，被保留的檔案擋住的寫入也是；只有 CRLF 不同算相等；`merge-file` 以 255 結束時給出 UP-E11，什麼都不寫入；無法解析的乾淨 `.json` 合併會保留靶場的檔案並給出 UP-A11；名稱在磁碟上與 p 不同的路徑——本身或某個上層——不被動到並給出 UP-A15，而經符號連結到達的靶場根目錄、NFC 後相等的名稱，或以 `\` 分隔的 `realpath` 結果都不回報；`lstat` 發生 ENOENT 或 ENOTDIR 以外的錯誤，或原生 `realpath` reject，給出點名 p 的 UP-E11（D12）；未被追蹤、卻存在於磁碟上的路徑保持不動並報 UP-A15，即使 `realpath` 回報的就是別名本身（D24、P-10）；是 submodule 或位在 submodule 底下的路徑不被動到並給出 UP-A14，執行後狀態裡沒有那個 submodule 的行（D10）；讀取 o 出錯，或 `git merge-file` 結束碼超出 0–127 或被 `runGit` reject，給出 UP-E11，而步驟 8 的其他 git 指令結束碼超出它文件記載的範圍或被 `runGit` reject，給出點名它的 CW-E14（D19）；每次執行之後 `HEAD` 與之前相同，`git diff --cached` 是空的。（U17–U19、U21、U23、U53–U58、U64、U68、U69、U74、U75、U77）
- **AC-7** 本身是或經過符號連結（被追蹤或被忽略）的路徑不被動到並回報 UP-A7，連結在外部的目標保留它的內容與修改時間；M5 寫入的、有 hard link 的被追蹤檔案，它在外部的名稱不變。（U20、U60）
- **AC-8** 位在上游改動路徑上的被忽略檔案，以及上游新增、而靶場忽略的路徑，都不被動到並回報 UP-A9。上游新增、改動或刪除的 `.gitignore` 不被動到並回報 UP-A13，名稱在磁碟上與 p 不同的合併路徑都不會被寫入或刪除（P-9；D9、D12）。在 CI 驗證的預設檔案系統上（macOS 的 APFS、Windows 的 NTFS、Linux 區分大小寫的 ext4），`git ls-files --others --ignored --exclude-standard` 在執行前後列出相同的路徑，B4 列出的例外除外。（U22、U63、U68）
- **AC-9** 完成的執行之後，`range.json` 的 `upstream` 等於 target 的 repository、版本與 commit，其他最上層的鍵 deep-equal 且順序不變，檔案不存在時會建立，最上層的 `__proto__` 鍵會保留；因寫入失敗而出現 UP-E09 之後，它維持不變。（U24）
- **AC-10** 完成的執行（步驟 9 已結束，D20）不論有沒有注意項目都以 0 結束，除非在步驟 10 收到訊號，此時會完整印出 R1–R5 並以 130 結束（D8）；報告依 id 順序、以該次執行的語言印出 R1–R5，R2 的計數等於如此分類的路徑數，R3 列出每個注意項目與它的代碼，UP-A12 恰好在某個錨點檔案 b ≢ t 時出現；`--from <commit>` 的 base 沒有對照上游 tag 檢查時，R1 會寫明；R2 在它的計數之後列出每個 M6 路徑；R3 含 UP-A1 時，R4 說明 `|||||||` 段落是 base 版本的文字；R5 把 `git checkout -- .` 列在 `git clean -fd` 之前（D14、D16、D17）；R1、R2 與 R4 新增的內容兩種語言都有，R4 的 `pnpm install` 與 `v*` tag 兩行恰好在它們的條件下出現；每個 UP 代碼在兩份訊息表裡都存在；路徑經過跳脫。（U25、U26、U59、U62、U71、U72、U76）
- **AC-11** 步驟 9 的寫入失敗或訊號，印出帶路徑或訊號的 UP-E09 以及印成一行的還原指令 `git checkout -- . && git clean -fd`（D14、D23）（結束碼 1，訊號為 130）；步驟 7 的訊號什麼都不寫入（結束碼 130）；步驟 10 的訊號會完整印出 R1–R5，再以 130 結束（D8）；不留下任何暫存資料夾；完成或失敗的執行之後，`git checkout -- . && git clean -fd` 會得到空的 porcelain 狀態、`HEAD` 的檔案，以及與執行前逐位元組相同的被忽略檔案；在一棵從某個 commit 建出、刪除或改動了被追蹤的 ignore 檔、或把被追蹤的檔案換成未追蹤資料夾的工作樹上，同樣的指令會得到空的 porcelain 狀態、`HEAD` 的檔案，以及 `HEAD` 的 ignore 規則所忽略的每個檔案都與執行指令前逐位元組相同（D14），但位在「`HEAD` 是檔案的位置上的資料夾」裡的檔案除外，不論兩個指令的順序，git 都會連同那個資料夾一起移除它（D22）。（U27–U29、U70）
- **AC-12** 上游 manifest 的 `range:upgrade` 恰好是 `npx --yes create-wxl@latest upgrade`；`create-wxl upgrade` 走升級路徑，`create-wxl <dir>` 的行為如 0005 第 2.3 版所規定（0005 的測試不經修改即通過，有四個例外：C02 的 `upgrade` 案例照 AC-1 所寫改變；第 2.2 版加到 C18 的規則 3 案例，連同新列 C71（D13），會加入並通過；`upstream-config.test.mjs` 裡釘住設定紀錄那句 GLOSSARY 句子的斷言，隨那句話一起改變，那句話說升級也會寫入設定紀錄；以及 git 版本的案例，C36 與 G0 的下限，依 D21 改為 2.26）。（U30、U31）
- **AC-13** 第 8 階段（0006-S2）：`traceability.md` 的模擬在推送的 commit A 與 B 上恰好產生所列的結果，包括 `--from <A>` 之前的 UP-E12 拒絕，以及對 create-wxl 3.0.0 建立的靶場不帶 `--from` 的升級，之後刪除模擬用的分支。（U32）

## 測試決策

- 測試在 seam 0006-S1 檢查工作樹、`git status`、`HEAD` 與 index、結束碼與串流文字（依訊息 id、代碼與點名的路徑），使用暫存 repository 裡真實的 git，其全域設定經過隔離，fixture archive 照 0005 的方式建立（項目清單、原始 header、pax `comment`）；沒有測試會連上網路。
- 一份 fixture 同時涵蓋 P-2 與合併表的每一列（U17），所以一個分支不會因另一個分支的行為而被滿足；其他預先檢查各有自己的列（P-9：U68、U69）；還原檢查（U29）在 U17 之後執行。
- 需要符號連結或可執行位元的測試在 Windows 上略過；跨 OS 的 job 仍在那裡跑其餘的測試。
- 建立 `range.json` 的測試把它的 base 以 tag archive 提供，該 archive 的 `comment` 是紀錄裡的 commit （J6）。
- P-9 以包裝過的 `deps.fs` 測試，它在每個函式（包括 `lstat`、`realpath`、讀取與 `unlink`）裡把別名對應到它的項目，用於 CI 檔案系統不見得會產生、或只在某一個 runner 上產生的名稱（Windows 8.3 短檔名、NFC 名稱的 HFS+ NFD 形式、以 `\` 分隔的 `realpath` 結果）；上層資料夾的字母大小寫則用真實檔案系統測試，只在 macOS 或 Windows 不區分大小寫的檔案系統上執行。Windows runner 能否替檔案設定短檔名（`fsutil file setshortname`）在第 5 階段確認；能的話，有一個只在 Windows 上跑的測試執行真實情況；不能的話，ticket 的覆蓋率報告把真實的 8.3 情況記為未驗證。
- 還原順序在測試從某個 commit 建出的工作樹上測試（U70），因為升級本身已經不會留下缺少或被改動的 ignore 檔。步驟 3 的下限是 git 2.26（D21）；升級與還原執行的指令，已經透過 git 的 release notes 與原始碼比較過 git 2.20 與 2.54 的差異（T-0063 的 Comments），CI 與第 8 階段則在目前的 git 上執行它們。
- 先例：0005-S1 的測試（同一個函式與 fixture）、`tests/unit/scripts/fork-init.test.ts`。
- 第 8 階段也對已發布的 create-wxl 3.0.0 建立的靶場做一次不帶 `--from` 的升級，它的 `range.json` 記的是一個發布版本，所以 J6 的通過路徑會對真實的 tag 執行（W5）。
- 第 8 階段是對兩個推送的 commit 執行的終端機作業（R10），也就是升級實際執行的表面：這是對 preview 部署規則的明確覆寫，與 0005 的覆寫一起記在 OQ-022。透過 registry 的 `pnpm range:upgrade` 在發布前無法執行；使用者在發布後檢查它，與 0005 的 `npm create` 檢查一起進行（OQ-021）。

## 不在範圍內

- 從 fork 的 git 歷史推斷 base（E5）；3.0.0 以前的 base；對照上游的 tag 或歷史檢查 `--from <commit>` 的 base（D17）。
- 三方合併以外的遷移（格式改變時轉換老師自己的題目）：等第一次需要遷移的格式改變出現時再加進 create-wxl，因為執行的永遠是最新的程式（R4）。
- 自動重新套用 fork:init 的設定：設定紀錄中記設定值的那一半（0007）還不存在；UP-A12 提醒老師重新執行 `pnpm fork:init`。
- 替老師 commit、push、部署或執行 `pnpm install`。
- 選擇最新發布版本以外的 target，除非透過測試覆寫。
- 降級。
- 合併新檔案可執行位元以外的檔案模式；上游對既有檔案的模式改動不會套用，也不會回報。
- 偵測上游新增的內容屬於老師自己的某個資料夾（老師的題目與同 slug 的上游題目會逐檔合併）；`.json` 解析以外的合併檔案語意檢查。
- 跨 OS 單元測試以外的 Windows 終端機執行。

## 其他說明

- 因為兩份原廠靶場的 `version` 都是 `0.1.0`（0005 P3），上游的版本號遞增永遠不會進到靶場的 manifest，也不會與它衝突；其他 manifest 改動以文字合併。
- 如果 0006 沒有在 R1 的期限（2026-10-16 23:59）前合入，v3.0.0 會在沒有 `range:upgrade` script 的情況下發布（0005），研習時建立的靶場會在第一次升級時得到它，老師以 `npx create-wxl@latest upgrade` 開始這次升級。
- 本 epic 取代 0004 把 0006 規劃為設定紀錄 epic 的計畫（OQ-020）。
- ADR-0008 規定升級在合併之前，先搬移舊的語系版面，包括老師的靶場與 base 原廠靶場。版面 epic（OQ-024）會為此修訂步驟 8 的「nothing is written」、錨點檔案與 AC-6；本版不修訂。
