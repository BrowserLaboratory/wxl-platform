---
id: T-0039
title: Every document says the same sentence, and the epic's stage 8 runs end to end
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0030, T-0031, T-0032, T-0033, T-0034, T-0035, T-0036, T-0037, T-0038]
---

## Context

The documents tell the teacher never to edit `_redirects`, but not that it is committed with the
challenges. They also say the copy button 404s on GitHub Pages, which T-0036 makes false. This
ticket writes the canonical sentences into every file of the sentence map:
- E1 and Z1: what `_redirects` is and how to repair it.
- E2 and Z2: what the button copies and what breaks it.

S6 checks the sentences upstream. The generator's header gains E1, which rewrites the committed
`_redirects` in the same commit. The README and skill passages and two GLOSSARY sentences are
rewritten.

This is the ticket that lands last. Its stage 8 runs V01–V05 against a commit that holds the whole
epic, including the teacher's original scenario rerun on a temporary GitHub Pages range.

Spec: `traceability.md` revision 3, canonical sentences, sentence map, match rule, passages P1–P3 and
P8, rows G02, T01–T05 and V01–V05; `spec.en.md` "Testing Decisions" (stage 8 override, D9).

## Deliverable

Every file of the sentence map holds its sentences under the match rule, and the README, skill and
GLOSSARY passages say what the epic made true. The committed `_redirects` carries the new header.
The epic's behaviour is verified on the Cloudflare preview, on a local build, in a temporary clone
and on a real GitHub Pages range.

## Acceptance criteria

- [ ] T01, T02: the five E1 rows and the five Z1 rows hold their sentence (AC-18)
- [ ] T03: `README.en.md` holds E2; `README.md` and both wxl-fork-init skill files hold Z2 (AC-19)
- [ ] T04: S6 runs only under the upstream decision; stage 6 confirms the gate on the diff (AC-18)
- [ ] T05: P1, P2, the README and skill parts of P3, and P8 rewritten as the passages table requires; `glossary.test.ts` passes (AC-24)
- [ ] G02: the generator header carries E1; the committed `_redirects` is regenerated in the same commit and passes the guard (AC-17)
- [ ] G01 at stage 6: the guard test and its CI steps unchanged (AC-17)
- [ ] V01–V03 against a commit holding the whole epic (AC-20)
- [ ] V04, V05 on a temporary GitHub Pages project-site range, each outward action confirmed with the user first; the user deletes the repository afterwards (AC-21)
- [ ] At close-out: set OQ-016 to resolved with the verifying evidence

## 給使用者（zh-TW）

把規範句寫進 sentence map 的 10 個檔：E1 與 Z1 說明 `_redirects` 是什麼、過期時怎麼修，E2 與 Z2 說明複製按鈕給什麼、什麼情況會讓它失效。上游另有測試檢查這些句子。產生器的 header 一起改，commit 進去的 `_redirects` 跟著重新產生。README、skill 與 GLOSSARY 的相關段落一併改寫。

這是最後 land 的 ticket。stage 8 要對含整個 epic 的 commit 驗證：
- Cloudflare preview 上的短連結；
- 本機建置的題目頁網址；
- 在暫時 clone 裡建題目再 commit；
- 在暫時的 GitHub Pages 靶場重跑工作坊的原始情境，每個對外動作都先問你，repository 由你刪除。

## Comments
