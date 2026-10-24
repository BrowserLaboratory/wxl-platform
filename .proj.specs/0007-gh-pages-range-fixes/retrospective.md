# 回顧：epic 0007（GitHub Pages 靶場修正：會自己跟上的 `_redirects`，以及打得開的連結）

日期：2026-10-24。依 `docs/agents/workflow.md` 的 Epic close-out 第 3 步執行。

範圍：epic 起點 `3b52e65`（T-0030 之前）到 T-0039 落地（`cdaff71`）。

- **Ticket**：共 10 張（T-0030～T-0039），PR #36～#39、#41～#45、#48，全部 squash 合併。
- **紀錄 PR**：#40、#46、#47。#47 把已知、未修的邊界與待決事項開成 11 張 pending ticket（T-0040～T-0050）。

## 結果

- **10 張 ticket 都已落地。** 第 8 階段 V01～V05 在含整個 epic 的 commit `f12aba2` 上執行，各自的表面如下：
  - V01：Cloudflare preview。
  - V02：本機 page-mode build。
  - V03：暫時 clone。
  - V04、V05：暫時的 GitHub Pages 靶場 `CXPhoenix/wxl-e2e-0007`。
  - V05 的「靶場 CI 的 Run tests log」一開始沒有出現，原因見「要改的地方」第 1 項；使用者啟用 Actions 後，空 commit `dac53b2` 觸發的 Quality Gates run `40081283163` 通過，`Run tests` 的 log 裡 guard test 的 10 個 case 都通過。
- **全套測試**：從 epic 起點的 127 個檔、4,203 個 case（T-0030 紀錄的 `a54e917` 基準），增加到 131 個檔、4,540 個 case（T-0039 的 `pnpm test --run`）。
- **安全**：
  - 10 份 ticket 安全審查確認的缺陷都已修掉：T-0032 的 S1、S2，T-0034 的 S1、S5、S9、S11、S13、S14；另外 T-0034 的 S6、S15 改寫成 D16 (a)。
  - 串連分析沒有找到跨越模型內信任邊界的串連，N-1～N-8 交使用者裁決（`review/chain-analysis.md`）。
- **OQ-016** 已由本 epic 解決（見 `OPEN-QUESTIONS.md`）。
- **OQ-023** 在第 8 階段之後由使用者重現，成為下一個 epic。

## 做得好的地方

| 觀察 | 證據 |
|---|---|
| 第 6 階段把 Standards、Spec 兩軸分開審，抓到計畫本身漏掉的交接項目 | T-0039 的 F1：README 沒寫 W9 第三種形式，而且「執行 `git stash apply`」跟 hook 訊息互相矛盾 |
| 文件裡要老師執行的 git 指令，寫進去之前先在 scratch repo 實測 | T-0039 stage 7：衝突 → `git checkout <id> -- <path>` → `git restore --staged --source=<id>^2` 實測回到 commit 前的狀態；`git stash drop <id>` 被拒 |
| 第 8 階段用真的 GitHub Pages 靶場，抓到本機與 preview 都看不到的平台行為 | V05：新建的 public repository 上 Actions 沒有啟用，push 不觸發 CI |
| 刪除遠端分支前逐一用 patch-id 確認已合併 | 16 個 `tickets/*` 分支；T-0025 多出的 `c58f034` 確認已隨 #32 進入 `main` |
| 已知、未修的情況一張一張開成 pending ticket，沒有只寫在各 ticket 的 Known edges | #47：T-0040～T-0050，各附原因、證據與重新處理的條件 |

## 要改的地方

| # | 觀察 | 證據 | 提案 |
|---|---|---|---|
| 1 | 規格假設的平台行為，到最後一張 ticket 的第 8 階段才在真實表面上驗證。B3 寫「it runs on every range and host」，但新建的 GitHub repository 上 Actions 沒有啟用：push 不觸發 Quality Gates，`workflow_dispatch` 的部署照樣執行，create-wxl 的下一步說明也沒有提醒老師 | T-0039 stage 8 V05；chain-analysis N-1；使用者 2026-10-24 的 Actions 頁截圖（「Workflows aren't being run on this repository」，API 卻回報 `enabled: true`） | 依賴主機行為的 epic，在第一張碰到部署的 ticket 就建一次暫時的真實靶場，不要等到最後；N-1 本身開成 pending ticket，讓 create-wxl 的 N5 與 README 提醒老師到 Actions 頁啟用 |
| 2 | 第 3 階段以 D6 延後的 OQ-023，影響被低估了。在預設的 zh-TW 下，只有英文版的題目不會出現在清單上，英文網址也會被導到 404，而 `create:challenge` 只產生英文版 | OQ-023 的 2026-10-24 重現段落；使用者稱它是「目前最有問題的部分」 | 延後一個 open question 之前，至少在真實表面上重現一次，把「學習者看到什麼」寫進延後理由；OQ-023 已由使用者排成下一個 epic |
| 3 | D16 是 agent 在常設授權下自行裁決的，引來 18 項 review finding 和兩輪修正，還留下兩件要使用者決定的事（T-0048、T-0049） | T-0034 的 rulings 與 review of revision 3.1；spec 3.1→3.2 | 常設授權下要改 spec 決策時，先寫成一段給使用者看的決策摘要並得到確認，再進實作；授權本身不擴及新的 D 編號 |
| 4 | #48 在 V05 完成前就由使用者手動合併。auto-merge 開著的 PR 之前也可能在第 7、8 階段完成前合併，因為合併不會通知 agent | #48 合併時間 04:54Z，V05 的 CI 部分仍在等 Actions 啟用；T-0033 的紀錄提醒過「PR should not be allowed to merge before that CI run is seen」 | 第 8 階段完成前，PR 開成 draft，第 8 階段紀錄寫完才轉成 ready、才開 auto-merge |
| 5 | auto-merge 合併後 agent 收不到通知，每次都要使用者說「繼續」 | #41～#46 的落地過程 | 保留目前作法（不輪詢）；在 handoff 與 PR 說明寫明合併後需要使用者提醒 |
| 6 | hook 鏈的三張 ticket（T-0033～T-0035）疊在一起，前一張落地後再依序 rebase | T-0035 的落地紀錄：rebase 到 `a2b1b96`、去掉 T-0034 的三個原始 commit、patch-id 比對 | 可行，但每次 rebase 都要重跑整套測試；之後同一個檔案的連續 ticket，盡量合併成一張，或嚴格依序開工 |
| 7 | 落地腳本 `land.sh` 依 ticket id 讀 PR 草稿，同一個 worktree 重用時讀到舊草稿 | #46 一開始用了 T-0038 的描述，事後用 `gh pr edit` 修正 | 腳本改成明確傳入草稿路徑，並在開 PR 前印出標題供確認 |
| 8 | Windows runner 上 `create-wxl/test/bin.test.mjs` 偶爾逾時，要人工判斷後重跑 | #45 第一次 CI（194 s 對比平常 103～150 s）；T-0050 | T-0050 處理 timeout；在那之前，重跑前先確認失敗只出現在這個檔案 |
| 9 | 新開的 worktree 沒有 `.vitepress/wasm/`，第一次跑全套測試出現大量與變更無關的失敗 | T-0039 stage 5 紀錄 | 已寫進 `docs/agents/platform-notes.md`；開 worktree 時一併處理 |

## 採用情況

使用者在 2026-10-24 裁決：九項提案全部照建議採用（「都按照你的建議」）。落點如下：

| # | 落點 |
|---|---|
| 1 | `docs/agents/workflow.md` 第 4 階段：依賴主機行為的 epic，第一張碰到部署的 ticket 就在真實的暫時主機上跑第 8 階段；N-1 開成 T-0051 |
| 2 | `docs/agents/workflow.md`「Deferred decisions」：延後老師或學習者看得到的問題前，先在真實表面上重現一次，把他們看到的寫進理由；OQ-023 已排成下一個 epic |
| 3 | `docs/agents/workflow.md` 第 5 階段「Standing authorization」：新的或修改的 spec 決策，先給使用者看決策摘要並確認 |
| 4 | `docs/agents/workflow.md` 第 9 階段：第 8 階段結束前開的 PR 一律是 draft，第 8 階段紀錄寫完才轉成 ready、才開 auto-merge |
| 5 | 同上：合併不會通知 agent，由使用者告知已落地 |
| 6 | `docs/agents/workflow.md` 第 4 階段：依序改同一個檔案的 ticket，合併成一張，或嚴格等前一張落地才開工 |
| 7 | `land.sh` 是 session scratchpad 裡的工具，不在 repository 裡；之後重寫時改成明確傳入草稿路徑 |
| 8 | 已有 T-0050 |
| 9 | 已寫進 `docs/agents/platform-notes.md` |

chain-analysis 的 N-1、N-2 也照建議處理：開成 T-0051、T-0052，spec 改成 3.3 版（B3 限定在有執行 Actions 的 repository，B2 最後一欄寫明 upstream 的平行 session）。

## ADR 與 open question 候選

- **ADR 候選**：OQ-017 記錄的第三次第 8 階段 override（D9）。這次用暫時的真實 GitHub Pages 靶場補上 page mode，若使用者認定這就是之後依賴主機行為的 epic 的固定作法，可以把 OQ-017 升格成 ADR。
- **pending ticket**：N-1 已開成 T-0051，N-2 已開成 T-0052。
- **文件修正候選**：
  - N-3：README 轉述 D16 (a) 時少了「只限自己的 index」。
  - N-4：OQ-016 的「closes too」說得太寬。
  - N-5：E2／Z2 低估了 `SITE_ORIGIN` 指向別站時的後果。
  - N-6：wxl-create 註明 stderr 是資料。
