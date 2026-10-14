---
id: T-0013
title: Rewrite only identity anchors in anchor mode
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0012]
---

## Context

Without `--rebrand`, today's engine replaces the upstream repository slug in every text file, rewriting the changelog's history and anything else that mentions it, and resets the version on every run.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

In anchor mode the engine no longer walks the tree: A1 is edited structurally (URLs and `author` every run; `version`/`license` only on first conversion; `name`/`description` when given), and A2–A5 replace whatever repository slug their form holds. Every other file is byte-identical. Each changed file goes through `<file>.fork-init-tmp` and a rename, and `.gitignore` ignores the temporary name; a write failure is a tree error asking for a re-run. The three scan-driven fork-init tests are rewritten as the overridden-contracts table says.

## Acceptance criteria

- [ ] T1–T5: doc anchors, untouched files and bytes (S1)
- [ ] T11: CRLF for doc anchors and the manifest (S1)
- [ ] T14–T15: `name`/`description`, first conversion (S1)
- [ ] T55: write failure in anchor mode (S1)
- [ ] T60: the three scan-related overridden tests rewritten; the others pass unchanged (S1)
- [ ] T83: fork-init.ts scan comments (S9)
- [ ] T84: `.gitignore` (S9)

## 給使用者（zh-TW）

不帶 `--rebrand` 時，引擎不再掃全樹，只改身分定位點：package.json 結構化改寫（版號只在第一次轉換時重設）、README 與 CONTRIBUTE 的四種網址格式不論原本是誰的 slug 都換成新的；CHANGELOG 等其他檔案一個 byte 都不動。寫入經暫存檔再 rename。掃描相關的三支舊測試依 override 改寫。

## Comments
