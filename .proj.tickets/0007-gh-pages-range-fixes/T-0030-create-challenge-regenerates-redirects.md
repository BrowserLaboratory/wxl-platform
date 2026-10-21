---
id: T-0030
title: create:challenge regenerates _redirects, with exit statuses 1, 2 and 3
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: []
---

## Context

Epic 0007 makes `platform/public/_redirects` keep up with the challenges without the teacher knowing
it exists. Today `pnpm create:challenge` scaffolds a challenge and runs keygen but leaves the file
stale, so a GitHub Pages range's CI fails on the first push. This ticket makes the scaffold step
regenerate the file. It also gives each failure its own exit status (D8, D13): 1 means nothing was
written, 2 means the challenge was created but `_redirects` was not regenerated, and 3 means keygen
failed after the scaffold was written.

Spec: `.proj.specs/0007-gh-pages-range-fixes/spec.en.md` revision 3, "create:challenge" and B5;
`traceability.md` revision 3, seam 0007-S4, messages W1 and W2. This is the first ticket to land, so
its PR also carries the spec directory, the ticket files, and the uncommitted `GLOSSARY.md` and
`.proj.specs/OPEN-QUESTIONS.md` changes ("Landing").

## Deliverable

`create:challenge` exposes an entry that takes argv, a root and a keygen runner, and returns its
status; the CLI calls it with the repository root. After keygen succeeds, it rewrites `_redirects`
over the whole working tree and names the file on stdout. Every failure ends with its documented
status and message.

## Acceptance criteria

- [ ] C01: valid arguments, keygen succeeds → `_redirects` equals `generateRedirects(root)` and holds the new `/c/NNN` rule; status 0 (AC-10)
- [ ] C02: stdout contains `platform/public/_redirects` (AC-10)
- [ ] C03: keygen fails → status 3, stderr holds W2, `_redirects` byte-identical, scaffold stays (AC-11)
- [ ] C04: tree holds two challenges with one number → status 2, stderr holds W1, `_redirects` byte-identical, scaffold stays (AC-11)
- [ ] C05: an invalid argument; an existing slug → status 1 before any file is written (AC-11)
- [ ] C06: a challenge directory whose `index.md` carries no number → status 2, as C04 (AC-11)
- [ ] C07: a Traditional Chinese brief with another number → status 2, as C04 (AC-11)
- [ ] C08: `_redirects` bytes differing from the generated content → replaced (AC-10)
- [ ] C09: `_redirects` cannot be written (it is a directory) → status 2, W1 with the write's error, scaffold stays (AC-11)
- [ ] G01 at stage 6: the guard test's assertion, inclusion rule and CI steps are unchanged (AC-17)
- [ ] Stage 8: V03 in a temporary local clone (`--backend php`), as far as this ticket's change reaches (AC-20)

## 給使用者（zh-TW）

`pnpm create:challenge` 建好題目、keygen 成功後，會自動重新產生 `_redirects`，並在輸出中說明。失敗時的結束狀態分成三種：1 是什麼都沒寫，2 是題目已建立但 `_redirects` 沒有更新，3 是 keygen 失敗但骨架已建立。每一種都附有說明下一步的訊息。這張是本 epic 第一張 land 的 ticket，spec、GLOSSARY 與 OPEN-QUESTIONS 的修改會跟它的 PR 一起進 `main`。

## Comments
