# Epic 0005 收尾：漏洞串連分析

依 `docs/agents/review.md`「Epic close-out: chain analysis」。輸入：T-0019～T-0025 的第 7 階段報告（`security-T-0019.md`～`security-T-0025.md`）、各 ticket 的第 6／7 階段處置，以及 spec 的「Trust Boundaries and Threat Model」（B1–B7）。問題：個別嚴重度低的缺陷，能不能串成一條跨越信任邊界的鏈？

方法：review workflow 兩個獨立的分析者，分別從「攻擊者位置往前推」與「受保護資產往回推」找候選鏈；每條候選鏈再交給一個獨立的懷疑者，逐環查證程式碼、確認環節是否真的接得起來、前提是否在威脅模型內、後續 ticket 是否已修。共 8 條候選鏈，另有 29 條在找鏈階段就被排除（各附理由）。部分 git 行為由查證者在本機 git 2.54.0 實測；Windows 的部分是推論，沒有實測。

## 結論

**沒有任何一條在威脅模型內、跨越信任邊界的鏈。依規定不需要在 epic 完成前開 ticket。** 但查證過程證實了兩處 spec 的保護宣稱和實際機制不符，以及幾項值得做的縱深防禦，列在最後供使用者決定。

| 候選鏈 | 環節 | 判定 | 理由摘要 |
|---|---|---|---|
| G4 空的 `core.hooksPath` 讓 hook 查找落到檔案系統根目錄，加上 G1–G2 沒關 hook | T-0023 C-03、C-04 | 不成鏈（兩條分析各得到一次） | 實測：`git -c core.hooksPath= rev-parse --git-path hooks/post-commit` 輸出 `/post-commit`，所以 C-03 的事實成立。但 C-04（G1–G2 跑老師自己的全域 hook）沒有接到 C-03；能在磁碟根目錄放 hook 的「同機另一個使用者」不在 B1–B7 的攻擊者之內，POSIX 上根目錄也只有 root 可寫 |
| `.git` 的 NTFS／HFS+ 別名通過規則 3，G1 沿用植入的 config，G2 觸發 fsmonitor 或 hook | T-0021 C-04、T-0023 C-02、C-04、T-0025 C-11 | 真的鏈，但在模型外 | 程式碼層面接得起來（規則 3 只擋字面的 `.git`；G1 重新初始化不覆寫既有內容；G2 會讀 repository 自己的 fsmonitor），但前提是能控制 archive 的路徑：B1 視 GitHub 依 SHA 提供的位元組為可信；B6 的 fork commit 很可能在 push 時就被 GitHub 的 fsck 拒收（未驗證）；archive 本來也能經由 `pnpm install` 執行程式碼 |
| 老師全域的相對 `core.hooksPath` 讓 fork commit 帶進來的 hook 在 G1–G2 執行 | T-0023 C-04、C-03 | 不成鏈 | 執行的是老師自己的全域設定，B7 的「Does not protect」已寫明 |
| step 10 重查之後目標被換成 symlink，搬移、engine、git 都跟著連結走 | T-0024 C-05、T-0022 C-04、T-0020 C-06 | 真的鏈，但在模型外（兩條分析各得到一次） | 需要另一個行程在執行期間改寫目標，B4 列為 Outside the model |
| archive 的 `.gitattributes` 選用老師全域的 LFS filter，舊版 git-lfs 在 Windows 上執行 target 裡的 `git.exe` | T-0023 C-04、C-01、B6 | 真的鏈，但在模型外 | 需要老師自己裝了舊版 git-lfs 的全域 filter，並且能控制 archive |

## spec 準確度的缺口（建議修正）

1. **B1 的承諾和規則 3 對不上。** B1 寫「no entry can create a `.git` path」，規則 3 卻只擋字面上等於 `.git` 的 component（不分大小寫）。二擇一：修訂規則 3，比照 git 的 is_ntfs_dotgit／is_hfs_dotgit（拒絕含 `:` 的 component、`git~1`、去掉 HFS+ 可忽略碼位後等於 `.git` 的名稱），或把 B1 改成和規則 3 一致的字面。
2. **B7 寫「G4 runs without hooks」，但實際上不成立。** 空的 `core.hooksPath` 讓 prepare-commit-msg、post-commit 等 hook 到檔案系統根目錄找（`--no-verify` 只跳過 pre-commit 和 commit-msg）。建議 G4 改成指向本次執行自己建立、確定為空的目錄（例如 `<target>/.git` 底下不存在的路徑）；不建議用 `/dev/null`，因為 Git for Windows 會把 `/dev/null/<hook>` 解析成 `<磁碟>:\dev\null\<hook>`。同步修改 traceability 的 G4 與 B7。T-0023 Deliverable 的「no hook run」也應縮限為「no template hook run」，和 AC-15 一致。

## 可選的縱深防禦（不阻擋 epic 收尾）

- G1 之前先 `lstat` `<target>/.git`，已存在就判 CW-W03，不執行任何 git 指令；G1–G4 一律帶 `-c core.fsmonitor=false` 與上面的 hooksPath。這兩項便宜，也能擋住上表第二條鏈的最後一環。
- step 10 重查時記下 target 的 dev／ino，逐項 rename 前與 step 11、12 開始前再比對，不一致就停下；rename 之前先對暫存資料夾設定權限，去掉 rename 之後對 target 路徑的 chmod。
- fetch 使用 `redirect: 'error'`。
- B4、B7 的「Does not protect」補上：step 10 之後 engine 與 git 以 target 路徑為準、不再確認是同一個目錄；archive 的 `.gitattributes` 可以選用老師全域定義的 filter driver。

這些項目都會改到 spec 或 create-wxl 的行為，由使用者決定是否另開 ticket（例如在 epic 0006 之後的一個 hardening ticket）。

## 沒有涵蓋

Windows 上的實際行為（hook 路徑解析、NTFS 別名、git-lfs）都是推論；GitHub 收 push 時的 fsck 設定沒有驗證。分析範圍是 create-wxl 與 `scripts/fork-init.ts` 在 T-0025 完成時的程式碼。完整的候選鏈、查證理由與被排除的 29 條，保存在本機研究紀錄。
