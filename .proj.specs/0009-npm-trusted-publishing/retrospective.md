# 回顧：epic 0009（npm trusted publishing）

日期：2026-11-14。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行。

範圍：從 T-0069 開工到 T-0073 改為 done 的紀錄（#91，`df0e042`），加上收尾的串連分析。

- **Ticket**：5 張，都用 squash 合併，各自有一個改 `done` 的紀錄 PR。
  - T-0069（X9 改查 CI 環境）：#82，紀錄 #83。
  - T-0070（manifest 的 `repository`）：#84，紀錄 #85。
  - T-0071（`publish-npm.yml`）：#86，紀錄 #87。
  - T-0072（`release.md` 與各份註記）：#88，紀錄 #89。
  - T-0073（第一次 CI 發布 3.1.1）：#90，紀錄 #91。
- **時間線**：2026-11-12 從 T-0069 第 5 階段接手，2026-11-13 推 `v3.1.1`、核准、RP6 通過，2026-11-14 完成串連分析。
- **收尾 PR**：串連分析、這份回顧、HTML 證據報告，以及串連分析開出的 T-0074、T-0075。

## 結果

- **交付**：create-wxl 改由 `publish-npm.yml` 透過 OIDC stage 到 npm，由上游以 2FA 核准後才能安裝。3.1.1 是第一個這樣發布的版本，provenance 寫明上游 repository、workflow、`refs/tags/v3.1.1` 與 `2d85c1c…`。
- **第 8 階段**：T-0069～T-0071 各自在合併前記錄 RP0 的三項輸出（AC-8）。T-0073 在真實的 GitHub 與 npm 上走完 RP1～RP6、MN1～MN3、MN7；驗證面是 macOS 終端機、GitHub Actions 與 npm registry。
- **測試**：T-0073 在 `035eca6` 時，根目錄 vitest 4910 通過（1 skipped），create-wxl 787 通過（1 skipped）。
- **決策**：spec 0009 在第 7 階段後改成 revision 3.1，新增 D11（MN7 拆成兩條 ruleset）、D12（F6 先移回 `latest`）、D13（SHA 由使用者自己讀）、D14（MN7、MN2 在任何 tag 之前），依使用者 2026-11-12 的授權套用並列給使用者看。
- **安全**：
  - 五份第 7 階段報告共 55 個候選。確認的有 SEC-T0072-03、-04（low）、SEC-T0072-02（無法判定）與 T0073-C7（low），都在合併前處理。
  - 串連分析找到三條跨越信任邊界的串連：S-1、S-2 為 medium，S-3 為 low～medium。依使用者的選擇依根因開了 T-0074、T-0075（`review/chain-analysis.md`）。3.1.1 沒有受影響。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| 第 7 階段的發現在發布之前就變成 spec 決策（D11～D14）。MN7 若照原本的單一 ruleset 設定，上游與持有其憑證的 agent 都能移動 release tag | `review/security-T-0072.md`；spec 0009 revision 3.1 |
| 使用者說「不知道是否設定好」時，用唯讀的 `gh api` 核對 MN7、MN2，發現兩者都還沒設定，避免在沒有保護的狀態下推 tag | T-0073 Comments，2026-11-13 的 MN7、MN2 紀錄 |
| RP2 推 tag 前的自檢（SHA 在 `main` 上、兩份 manifest 都是 `<V>`、遠端沒有同名 tag）是 T0073-C6 加上的，第一次發布就照做 | `docs/agents/release.md` RP2；T-0073 的 RP2 紀錄 |
| 串連分析的前提由 parent 實測，不只採信子代理的推論：GitHub 頁面只顯示 7 碼（G1 從 low 改成 medium）、同名 tag 被 `git fetch` 抓到並遮蔽 `origin/main`（S-2）、7 碼命名的 tag 遮蔽短 SHA（PC-2，也更正了「不會印警告」的推論） | `review/chain-analysis.md` V-3～V-5 |
| 下一張票的分支在前一張 PR 跑 CI 時就從前一張的 tip 切出，合併後用 `git rebase --onto origin/main <舊 tip>` 接上，CI 等待時間沒有浪費 | T-0070～T-0073 的 rebase 紀錄 |
| 確認型測試都做了 mutation 檢查；T-0070 第 6 階段的 S-01 讓 guard 的豁免從「第一個符合」改成「恰好一行符合」，並以 mutation 確認 | T-0070 的 mutation 表與第 6 階段紀錄 |

## 要改的地方

| # | 觀察 | 證據 | 提案 |
|---|---|---|---|
| 1 | AC-7 帶著兩個缺口結案：RP5 的分頁欄位使用者只回報「都正確」，OQ-027 沒有答案；RP5 (b) 的 run commit 比對實際上是 agent 做的。原因是 agent 在核准之前列出比對值，卻沒有要求使用者在核准之前回報看到什麼 | T-0073 的 RP5 紀錄；chain-analysis R-5、I-4 | 需要使用者回報的步驟，agent 要在下一步之前取得回報，而且照 S 列要求的欄位逐項問；缺項就不往下走。核准類的步驟，回報要先於核准。屬通用流程，提給 harness-agile |
| 2 | 使用者為 MN1 登入 npm 後，session 留在 agent 讀得到的 `~/.npmrc`，到串連分析才發現 | chain-analysis V-8 | 每一個要求使用者登入外部服務的步驟之後，agent 在自己的 shell 確認登入已失效（npm：`npm whoami` 回 401），寫進紀錄。具體做法放在 T-0075 |
| 3 | 各票的第 7 階段把 T0071-C1（`origin/main` 有歧義）判為誤報，理由是「上游自己會確認錯的 SHA」；沒有人把使用者在 terminal 讀 SHA 也當成攻擊面。到串連分析才發現同一個名稱同時污染使用者、agent 與 CI | `review/security-T-0071.md` C1；chain-analysis S-2 | 第 7 階段審查「給人照做的文件」時，prompt 要寫明：使用者執行的指令與 agent 在同一個 OS 帳號、同一個 checkout，人讀到的值也是攻擊面。屬通用流程，提給 harness-agile |
| 4 | spec 與 `release.md` 假設「GitHub 頁面顯示的 commit」可以拿來比對，沒有人看過頁面實際顯示什麼；7 碼的事實要到收尾才查 | chain-analysis V-3；`release.md` RP5 (b) | spec 寫到「使用者在某個 UI 上看到什麼」時，撰寫或第 3 階段審查時先實際看一次那個 UI，把看到的形式寫進 spec。屬通用流程 |
| 5 | MN3 的選項文字是照 npm 文件寫的，npm 的介面已經改了 | T-0073 的 MN3 紀錄 | 外部 UI 的逐字文字不寫成驗收條件；改成描述效果，並在紀錄裡附上當時的實際文字。修正放在 T-0075 |
| 6 | 第 6 階段的 workflow 在 challenger 的輸出不符 schema 時，會把那一項發現整個丟掉（SPEC-07），要從 journal 救回 | T-0069 第 6 階段筆記；workflow script 的修正 | 失敗的 challenger 保留為 `challenger-failed`，不靜默丟棄。已在本 session 的 script 修正；屬通用流程，提給 harness-agile |
| 7 | 環境細節耗時：GLOSSARY 的測試不接受阿拉伯數字與反引號的識別字；用 perl 做 mutation 替換時 `@11` 被插值、`-0` 模式下 `^` 失效；背景測試的等待條件在輸出出現「Error:」時就提早觸發 | T-0072、T-0071 的紀錄 | mutation 替換改用 python，並在讀測試結果前確認檔案確實被改了：已寫進這個收尾 PR 的 `docs/agents/platform-notes.md`。GLOSSARY 的規則已寫在 `tests/unit/site/glossary.test.ts` 的檔頭，寫詞條前先讀。等待背景測試以程序結束為條件，屬通用做法 |

## 留給之後的 hardening（不開票）

來自各票的「留給 epic close-out 的觀察」與串連分析中已反駁的候選：

- U8（永不 `git push --tags`）升格為 AGENTS.md 的 hard rule（SEC-T0072-05、BB-7）。
- README 提醒 fork 不要自行發布 create-wxl（SEC-T0072-15、G6-b）。
- `release-docs.test.mjs` 加上負向文字檢查（SEC-T0072-20）。
- RP6 (c) 改在拋棄式環境或另一個帳號執行（PC-8）。
- 對外說明講清楚 provenance 與 shasum 只證明「由該 commit 的 workflow 建置」（G6-a）。
- MN7 creation 的 bypass 從角色（admin）改成指定的人；檢討「Protect main」不要求審查人數，以及兩個 GitHub App 的 `contents: write` 是否必要（I-1、I-6、V-6、V-7）。
- 被退回的 tag 是否仍可作為升級的 base（SEC-T0072-12、G4）：維持 ADR-0009 以 tag 判定，只在文件寫明清理需要 admin 停用 ruleset。

## ADR 與 open question

- 沒有新的 ADR：D11～D14 都寫在 spec 0009，範圍限於發布流程。
- OQ-027 維持 open，下一次發布的 RP5 由使用者列出分頁欄位。
- npm 在 MN3 之下 dist-tag、deprecate、`owner add`、`stage publish` 是否要 OTP，以及同版號重複 stage 的行為，放在 T-0075 與 T-0074 處理時一併確認，不另開 open question。
