# T-0072 安全審查（第 7 階段）

- **Skill**：專案的 `.claude/skills/security-review/SKILL.md`（明確讀檔載入）。
- **Workflow**：`wf_507b5b5d-9e0`。候選由一個 `harness-reviewer` 找出，每個候選再交給另一個獨立的 `harness-reviewer` 判定是否誤報。
- **範圍**：
  - checkout `/Users/phoenix/dev/browserlab/wxl-platform`，分支 `tickets/T-0072/release-docs`；
  - base `4c84f51`（T-0071 的 tip），HEAD `5ce6e5a`（`98d8ae7`、`44875a3`、`5ce6e5a`）；
  - 本審查與第 6 階段在同一個快照上同時進行。
- **依據**：spec 0009 的 B1～B3、D8，以及 traceability 的 RP0～RP7、MN1～MN7、F1～F7。本票不涉及題目，ADR-0005 不適用。
- **審查角度**：`release.md` 是 agent 與上游在發布時照著做的指示，所以「錯誤的指示」本身就算安全缺陷。

## 結論

20 個候選中，獨立審查判定 2 個確認（low）、1 個無法判定（low）、17 個誤報。

確認與無法判定的 3 項，以及 T-0071 的 C7，都已經由 spec 0009 revision 3.1 的新決策（D11～D14）處理：

- spec 與 `release.md` 一起修改；
- 新的 D 編號依使用者 2026-11-12 的授權照建議套用，並列給使用者看。

幾個誤報候選指出的措辭問題也一併修正。

## 確認與無法判定的候選

| # | 候選 | 獨立判定 | 處置 |
|---|---|---|---|
| SEC-T0072-03 | MN7 若用一條 ruleset「只讓上游建立 tag」，上游就成了 bypass actor。ruleset 的 bypass 涵蓋整條 ruleset 的所有規則，所以上游，以及使用上游憑證的 agent，仍能移動或刪除 tag；文件卻說 tag 不會被移動或刪除 | 確認（low／0.7）。機制依 GitHub ruleset 的文件判斷，沒有實際操作 GitHub | **D11**：MN7 拆成兩條 ruleset。一條限制建立，只有上游能 bypass；另一條限制更新與刪除，完全不設 bypass actor |
| SEC-T0072-04 | F6 只 deprecate 失敗的版本，`latest` 會一直指向它，直到下一個 patch 發布 | 確認（low／0.6）。照抄自 spec，不是本 diff 引入的 | **D12**：F6 先由使用者以 2FA 執行 `npm dist-tag add create-wxl@<previous> latest`，再 deprecate |
| SEC-T0072-02 | RP2 沒規定使用者要自己取得 SHA。SHA 由 agent 提出時，RP5 的 commit 比對只是在比對 agent 自己給的值 | 無法判定（low／0.55）：在 B1 的模型裡，agent 是持有憑證的一方 | **D13**：使用者自己從已合併 PR 的頁面或 `git log origin/main` 讀出 SHA |

SEC-T0072-01（誤報，none／0.7）也併入 D13。它指出 RP5 (c) 允許在沒有比對 commit 的情況下核准，與 B1 說的「靠 commit 比對抓到」不一致。誤報的理由是這段文字照抄已凍結的 spec，但審查者也指出，修正方式便宜而且有效。所以 D13 讓 RP5 (b) 一律比對 GitHub Actions run 頁面上的 commit；GitHub 一定會顯示這一欄，所以核准前一定比對得到。

## 誤報，但順手修正措辭的候選

| # | 候選 | 處置 |
|---|---|---|
| SEC-T0072-07 | 沒有要求檢查 npm 套件的 collaborator | MN1 加上 `npm access list collaborators create-wxl`，與 S8-04 一致 |
| SEC-T0072-08 | 「does not protect」第三點誇大：互動式 2FA 的直接發布不會進 staged，RP5 看不到 | 改寫成：有 token 時由 MN1、MN3 擋下；用互動式 2FA 時，屬於接受的殘餘風險 |
| SEC-T0072-09 | F7 把「已退回的版本重跑會得到 409」寫成事實 | 改成：已核准的版本會得到 409；已退回的版本 npm 會怎麼處理未知，重跑產生的 staged entry 一律退回 |
| SEC-T0072-10 | 「每個版本都帶 provenance」寫成事實 | 改成「應該帶有，由 RP6 (b) 檢查，沒有時走 F6」 |
| SEC-T0072-11 | RP2 沒有前置條件 | RP2 加上：推第一個 tag 前，MN7、MN2、MN1 已在 release ticket 回報，而且 MN1 還在兩天內（D14） |
| SEC-T0072-13 | F1 能不能重跑，要看只有使用者看得到的分頁 | F1 加上：重跑前由使用者確認分頁沒有 `<V>` 的 entry，而且這個 tag 從未被核准或退回 |
| SEC-T0072-14 | RP5 叫使用者在已登入的 terminal 執行 `npm stage view` | 優先使用網頁分頁；用 CLI 時，結束後 `npm logout`，也不要在 agent 能用的 shell 裡登入 |
| SEC-T0072-06 | 沒有明列 agent 不能做的事 | RP7 加上：agent 永不核准、退回、deprecate、移動 dist-tag、發布、登入 npm、移動或刪除 tag |
| SEC-T0072-16 | CONTRIBUTE 的 Maintainer Setup 開頭說衍生 repository 也要照做 | 小節開頭註明只適用上游，衍生 repository 跳過 |

## 誤報，不修改的候選

| # | 候選 | 理由摘要 |
|---|---|---|
| SEC-T0072-05 | U8 的覆寫（禁止 `git push --tags`）只寫在 `release.md`，沒有寫進 AGENTS.md 的 hard rule | 本 diff 之前，repo 裡根本沒有任何覆寫；這個 diff 是第一次加上，而且從 AGENTS.md 的 Reference 連過去。是否升格為 hard rule，留給 epic 回顧 |
| SEC-T0072-12 | 未經授權而被退回的 tag 依 F3 永遠保留，又被 GLOSSARY／ADR-0009 認定為上游發布過的版本 | 本 diff 不改程式；J6 的 base 檢查不變。ADR-0009 本來就以 tag 判定，這次只是把它寫出來 |
| SEC-T0072-15 | README 沒警告 fork 不要自己發布 create-wxl | fork 的 job 會被跳過，trusted publisher 也只認上游（B3）；這次的說明不會讓 fork 多出發布能力 |
| SEC-T0072-17 | `git push origin v<V>` 沒有用完整的 refspec，也沒有簽章 | agent 在自己的 checkout 建立 annotated tag 後才推，不會推錯 ref；簽章不在 spec 的範圍內 |
| SEC-T0072-18 | RP6 (c) 在 agent 的電腦上直接執行剛發布的套件 | 這個 smoke check 在 T-0029、T-0067 就有，不是新行為 |
| SEC-T0072-19 | 0005 B2 的「Protects」欄提到 X9 | 用的詞是「guard」，與 D8 一致 |
| SEC-T0072-20 | `release-docs.test.mjs` 只檢查字串存在，不檢查危險指示不存在 | 測試做的正是 D01 要求的；負向檢查留作 hardening |

## 留給 epic close-out 的觀察

- **SEC-05**：U8 是否寫進 AGENTS.md 的 hard rule。
- **SEC-12**：被退回的 tag 是否仍可作為升級的 base。
- **SEC-20**：是否加上負向文字檢查。

這三點在回顧時一起考慮。

## 涵蓋範圍與限制

- **已檢查**：
  - `release.md` 全文、AGENTS.md、CONTRIBUTE.md 的相關段落；
  - `publish-npm.yml`、`release.yml`，以及 release-note skill（確認它不會推 tag）；
  - spec 0009 全文；
  - 這個 diff 改到的每一份 spec、ADR、GLOSSARY、README 與 skill。
- **排除**：
  - 相依套件與供應鏈；
  - 可用性；
  - T-0069～T-0071 的程式實作；
  - GitHub ruleset、npm trusted publishing 與 Staged Packages 的實際行為，都沒有實測。
- **限制**：全程唯讀，沒有執行任何指令。

本報告不代表整個專案是安全的。
