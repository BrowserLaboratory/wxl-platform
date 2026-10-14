---
id: T-0016
title: Document the new fork path, and verify a configured range end to end
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0015, T-0011]
---

## Context

README, both fork-init skills, the glossary and the open-questions register still describe the scan, `--base`, and hand-edited short links. The epic's stage 8 must run on its last ticket, where every behaviour exists.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

README and README.en rewrite the fork section, the `fork:init` command row and the Cloudflare sub-path step with T77's strings; both `wxl-fork-init/SKILL.md` change as T78 lists and stay equal by `cmp`; the glossary gains T79's strings and its test passes; the register resolves OQ-005, updates OQ-004 and adds OQ-016 to OQ-019. Stage 8 runs 0004-S7 on this branch's HEAD: the GH and CF exports, every command exiting 0, with T74 and T75 read where S7 says.

## Acceptance criteria

- [ ] T73–T75: the two exports of S7 (stage 8, local)
- [ ] T77: README strings (S9)
- [ ] T78: skill strings and `cmp` (S9)
- [ ] T79: glossary strings and test run (S9)
- [ ] T80: open-questions strings (S9)

## 給使用者（zh-TW）

改寫文件並做 epic 的端到端驗證：README 與 README.en 的 fork 段落、兩份 fork-init skill、GLOSSARY、OPEN-QUESTIONS 依規定字串更新。第 8 階段在這張分支的 HEAD 上，把 repo 匯出成 GitHub Pages 與 Cloudflare Pages 兩份靶場，各跑完整套建置與測試，確認站名、短連結與 favicon 正確。

## Comments
