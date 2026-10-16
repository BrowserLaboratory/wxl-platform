# 第 7 階段資安審查：T-0021

範圍：分支 `tickets/T-0021/archive-rules-and-pristine-range`，base `8898ec5`（審查時為 staged、尚未 commit）。審查 create-wxl 的嚴格 archive 解析（raw typeflag walker、node-tar strict parse）、entry 規則 1–5、P1–P4 的每一種失敗與暫存目錄清理、`.gitattributes` 的 U1，以及它們的測試。spec 0005 第 2.1 版為需求依據，信任邊界見 spec 的「Trust Boundaries and Threat Model」（B1 下載的 archive、B5 終端機輸出、B6 fork commit 的 tree）。

方法：專案 `security-review` skill，由 review workflow 執行。候選審查與誤報篩選由兩個獨立的 `harness-reviewer` 進行，只讀檔案、不執行指令；篩選者對照已安裝的 `tar` 7.5.22 原始碼。依 ADR-0005，題目的刻意弱點不算 finding。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選 12 項，獨立篩選判定都未達門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

同一次 review 的 Spec 軸另有一項高嚴重度發現 **P-01**：raw typeflag walker 與 node-tar 對 size 的規則不一致，可以讓兩者錯位，把 symlink、hardlink 或 device 藏過規則 1，寫成空的一般檔案。它需要能控制 tar 的 bytes（B1 Outside the model），但直接違反規則 1 與 AC-9 的保證，所以在第 6 階段修正：walker 改依 node-tar 的 size 規則，並逐筆交叉比對路徑、size 與筆數，任何不一致都是 CW-E08。修正前實測可以繞過（exit 0、連結被寫成空檔），修正後同一個 fixture 為 CW-E08。

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 01 | 規則檢查用 `header.path`，step 8 卻用 `entry.path` 寫入；win32 上第一個 component 的 `\` 會變成 rest 的 `../` | 模型外（要控制 tar bytes；codeload 的前綴固定） | 已修正（第 6 階段）：step 8 改用驗證過的 `rest` 與型別；第一個 component 必須非空、不是 `.`／`..`、不含 `\` 與控制字元；有測試 |
| 02 | raw walker 與 node-tar 錯位，symlink 配到一般檔案的型別 | 模型外 | 已修正，與 P-01 同一處：交叉比對、不一致即 CW-E08 |
| 03 | pax 的 `type` 可覆蓋 entry 型別 | 誤報：Pax 建構子不複製 `type` | 不需修改 |
| 04 | `.git` 的 NTFS／HFS+ 別名（`::$INDEX_ALLOCATION`、`:` stream、可忽略碼位、保留裝置名）不在規則 3 | hardening；spec 缺口 | 記錄：epic 收尾的串連分析輸入（與 T-0022／T-0023 的 G1、G2 組合）；是否修訂規則 3 屬 spec 決定 |
| 05 | CW-E08 印出的 entry 路徑沒有跳脫 DEL、C1（B5） | true positive，未達門檻（low） | 已修正（第 6 階段）：`jsonValue` 跳脫 U+007F–U+009F，測試斷言字面 `\u007f`、`\u0085`；C60 其餘部分仍屬 T-0024 |
| 06 | `gunzipSync` 沒有解壓上限 | hardening（DoS，硬排除） | 已修正：上限為 node-tar 的 1000 倍比例；有測試 |
| 07 | 接受純 tar 與 zstd，和「gzip and tar strictly」字面不符 | hardening | 已修正：要求 gzip magic bytes、關閉 zstd 偵測；有測試 |
| 08 | 所有 rejection 都報成 CW-E08，程式 bug 被偽裝 | 非資安（需求一致性） | 已修正（第 6 階段）：專屬 `ArchiveParseError`，其餘 rethrow |
| 09 | step 8–9 的非預期錯誤（例如 `range.json` 是目錄）留下暫存目錄 | true positive，未達門檻（low） | 延後：T-0024 的 C54 |
| 10 | P1–P3 把 `EACCES` 等錯誤報成「缺檔」 | 非資安 | 已修正：只有 `ENOENT` 算缺檔，其餘交給 T-0024 的 CW-E09 |
| 11 | 第一個 component 沒有驗證內容 | hardening | 已修正，與 01 同一處 |
| 12 | 只讀最後一個 pax global header，且 ignored entry 上的 comment 讀不到 | hardening | 已修正 ignored entry 的情況；多個 global header 的順序維持 ticket 記錄的已知限制 |

## 沒有涵蓋

dependency scanning（`tar` 7.5.22）、可用性；Windows 上的行為（create-wxl 的測試到 T-0025 的 U3 才進 cross-OS CI，01 的 win32 路徑沒有實機重現）；真正的下載器與 `bin`（T-0025）；`git init`／`git add` 與 archive 內容的組合（T-0022、T-0023，交給 epic 收尾）。除 P-01 外，所有判斷來自讀碼。本報告不代表整個專案沒有安全問題；epic 的串連分析在 epic 收尾時進行。
