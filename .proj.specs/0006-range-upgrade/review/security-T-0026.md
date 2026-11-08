# 第 7 階段資安審查：T-0026（upgrade 入口、前置檢查與 base 解析）

範圍：分支 `tickets/T-0026/upgrade-entry-and-preconditions`，base `ea0de55`（merge-base 相同），HEAD `0c82c5b`，checkout `/Users/phoenix/dev/browserlab/wxl-platform`。審查面是已 commit 的 `git diff ea0de55...HEAD`（6 個 commit），沒有 pending 或 untracked 變更。範圍包括 `create-wxl/src/upgrade.mjs`、`argv.mjs`、`run.mjs`、`run-shared.mjs`、`messages.mjs`、`base-version.mjs`、`patterns.mjs`、`bin/create-wxl.mjs`，以及根目錄 `package.json` 的 `range:upgrade` script。T-0026 停在 step 7 之後（決定 (4)：以 CW-E14 結束），合併與寫入在 T-0027。需求依據是 spec 0006（`spec.en.md` 的「Trust Boundaries and Threat Model」B1～B6）與 `traceability.md` revision 2.1。

方法：專案的 `security-review` skill，由 workflow 執行。兩個候選審查者各從一個角度看：「輸入」（B1、B3 的 argv、`range.json`、archive、環境變數流向各個 sink）與「效果」（B4、B5 的子程序、暫存資料夾、寫入與刪除、fail-open／fail-closed、訊號、輸出）。每個候選再交給一個獨立的 `harness-reviewer` 嘗試推翻。全部都是唯讀審查，判斷來自讀碼，沒有執行。依 ADR-0005，所有候選都和題目的刻意弱點無關。

## 結果

**本 diff 引入、達到通報門檻的可利用缺陷：0 項。** 候選共 28 項（兩個角度各有重疊），獨立篩選後沒有任何一項達到門檻（HIGH／MEDIUM 且信心 ≥ 0.8）。

未達門檻但成立的項目：

| 候選 | 內容 | 判定 | 處置 |
|---|---|---|---|
| 13 | git 子程序和 Node 一起收到 SIGINT 而被殺（`code: null`）時，step 3、4 回報 UP-E01／UP-E02／UP-E03 或 CW-E14、exit 1，而不是 130。違反 traceability「130 on a signal ... handled from step 3」。第 6 階段 F02 原文提過這個子情況，但核准的修法只在每個 step 開頭加 checkpoint（`upgrade.mjs:116-199`） | true positive，low（正確性；仍然 fail closed，什麼都不寫） | 已修正（使用者 2026-11-09 核准）：step 3、4 每個 git 指令回來後先 `guard.throwIfRaised()`，有測試 |
| 03／14 | 進行中標記用 `lstat` 檢查時，任何錯誤都當成「不存在」（`upgrade.mjs:191-199`）。第 6 階段 B1 列過，D6 只涵蓋三個 git 指令 | hardening，low：沒有攻擊者可達的路徑；前面的 git 指令已成功，實務上只剩 EIO | 已修正（使用者核准）：只有 ENOENT 算不存在，其他錯誤以 CW-E14 停下，有測試 |
| 22 | base archive 的 `package.json` 裡 `version` 是 `toString` 不可呼叫的物件時，產生 UP-E10 訊息會丟 TypeError，變成 CW-E14；陣列 `["3.1.0"]` 印成 `"3.1.0" is not valid`，容易誤讀（`upgrade.mjs:339-351`、`messages.mjs:206`） | hardening，low：fail closed，訊息內容不含外部值 | 已修正（使用者核准）：非字串值以 JSON 印出，跳脫依 D10，失敗時印型別名稱，有測試 |
| 15 | 進行中標記清單少了 `sequencer/`：多 commit 的 cherry-pick／revert 中途 commit 後，step 4 會放行。實作和 `traceability.md:86` 一字不差，是 spec 與 B4「mid-operation」之間的缺口 | hardening，low：這張 ticket 不寫入靶場 | 已修正：使用者決定 D7，traceability 改為 revision 2.2，清單加上 `sequencer`，有測試 |
| 08／23 | `jsonValue` 不跳脫 bidi 與零寬字元；這次多了 UP-E05 的 `upstream.repository` 和 CW-E14 內的 git stderr 兩個來源 | hardening，low：規格（0005 B5、D10）只要求 C0、DEL、C1，0005 的 security-T-0024 第 08 項已有相同判定 | 記錄，不修改 |
| 16 | 下載驗證之後、`mkdtemp` 之前沒有 `throwIfRaised` | 誤報：這一段全是同步程式與 microtask，訊號要等 event loop 換輪才會送達，正式環境觸發不到 | 記錄；可選的 hardening：`makeTmpDir` 前補 `throwIfRaised` |

其餘候選：

| 候選 | 內容 | 判定 |
|---|---|---|
| 01／21 | step 4 在老師既有的 repository 跑 `git status`，repository 本地設定（`core.fsmonitor`、filter driver）會執行指令 | 誤報：`.git/config` 不會隨 clone、pull 或 PR 傳遞；能寫它的人本來就能以老師身分執行指令，`range:upgrade` 本身也定義在同一份 `package.json`。可考慮在 spec B4 的 Outside the model 補一句 |
| 02 | `range.json` 或 fork network commit 自稱的版本能讓升級以 UP-I01 或 UP-E07 結束 | 誤報：B3、B1 的 Does not protect 已列「挑另一個 base 會跳過中間的上游變更」 |
| 04 | `CREATE_WXL_COMMIT` 讓 target 變成任意 commit，版本仍是 source record 的 | 誤報：spec 規定的 0005 測試 override，會印 CW-W04 |
| 05／19 | `cleanupTmpDirs` 默默吞掉 `rm` 失敗 | 誤報：沒有攻擊者控制的輸入；殘留的是 `0700` 的原廠內容，F14 的處置就是這樣定的 |
| 06／26 | `tmpRoot` 直接取 `os.tmpdir()` | 誤報：TMPDIR 是老師自己的環境 |
| 07／24 | `VERSION_RE` 允許前導 0、位數不限，數值比較會失去精度 | 誤報：照 spec 的文法；比較的一邊固定是小整數 |
| 09／28 | `npx --yes create-wxl@latest` 沒有鎖定版本 | 模型外：AC-12 規定的字面值，B2 列為設計上接受 |
| 10 | tag 模式下 rule 2 的 comment 比對變成恆真式 | 誤報：`traceability.md:89` 明定 tag 下載只檢查 comment 是 40 碼小寫 hex |
| 11／25 | `range.json` 的 `lstat` 與 `readFile` 之間有 TOCTOU | 模型外：B4 的 Outside the model 列「另一個程序在執行期間改動靶場」 |
| 12／27 | 兩份 archive 整包放進記憶體，沒有大小上限 | 誤報：方法論排除資源耗盡；下載程式碼是 0005 既有的 |
| 17 | step 8 收尾清理期間到達的訊號以 CW-E14 結束 | 誤報：只剩 `rm` 進行中的時間窗，屬於 decision (4) 的過渡狀態，T-0027 會改掉這段結尾 |
| 18 | `failWithCleanup` 的 `rm` 失敗仍會讓例外逃出 | 誤報：沒有攻擊者可控的觸發點；例外會被 `runUpgrade` 的 catch 接住並清理 |
| 20 | git 指令沒有逾時，SIGTERM／SIGHUP 不會終止子程序 | 誤報：符合 0005「等正在進行的操作結束再停」的訊號規則 |

## 修正後的驗證

上述四項由 executor 以 TDD 修正（每項先觀察到紅燈），再由獨立的唯讀驗證者逐項核對，紀錄在 T-0026 ticket 的「2026-11-09 — stage 7 security review and fixes」。驗證者指出 #22 的新 helper 保留了 `JSON.stringify` 的短跳脫（`\t` 等），和 D10 的 `\uXXXX` 寫法不一致；主 session 已補上斷言並修正。macOS 上 `pnpm --dir create-wxl test` 為 558 個測試全數通過。

## 沒有涵蓋

依賴套件掃描；可用性與資源耗盡（方法論排除）；Windows 上的實際行為（由 PR 的 cross-OS CI 驗證）；`fsops.extractEntries` 的寫檔細節（0005 已審）；T-0027 才會加入的 step 8～10（合併、寫入、報告）。判斷全部來自讀碼，沒有執行。本報告不代表整個專案沒有安全問題；跨 ticket 的串連分析在 epic 0006 收尾時進行。
