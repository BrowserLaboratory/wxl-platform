---
id: T-0021
title: Strict archive rules and the pristine range
epic: 0005-create-wxl
status: todo
blocked_by: [T-0020]
---

## Context

create-wxl writes files from a downloaded archive, so the archive is a trust boundary (spec, trust
boundaries). This ticket pins the strict parse and entry rules 1–5, every pristine-processing rule
P1–P4 including its failures, and the `range.json` schema. It also sets upstream's `.gitattributes`
(U1) so that upstream's own `git archive HEAD` passes the same rules. Epic 0006 builds base and target
pristine ranges with the same functions.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seams 0005-S1 and 0005-S3;
"Archive entry rules", "Pristine processing", U1.

## Deliverable

A hostile or malformed archive is rejected with CW-E08 before anything is written; a P-rule failure is
CW-E10 with the target unchanged; a valid archive yields exactly the pristine range and `range.json` the
spec lists; `git archive HEAD` of upstream passes the rules.

## Acceptance criteria

- [ ] C17: symlink, hardlink, FIFO, char and block device, GNU sparse → CW-E08 naming path and rule 1, nothing written (AC-9)
- [ ] C18: each rule-3 path of the row → CW-E08 (AC-9)
- [ ] C19: two first components; pax `comment` absent or another commit → CW-E08 (AC-9)
- [ ] C20: each rule-4/5 case of the row → CW-E08 naming the later entry, or rule 5 (AC-9)
- [ ] C21: pax global header with the right `comment`, GNU long-name header, ordinary entries → accepted, headers not written (AC-9)
- [ ] C23: `CHANGELOG.md` with versions after the marker, and with CRLF → truncated after the marker, LF lines (AC-11)
- [ ] C24: each missing file or marker of P1/P2 → CW-E10 naming file and rule, target unchanged, temporary directory removed (AC-11)
- [ ] C25: `OPEN-QUESTIONS.md` with format section, trailing `---`, entries → format section only (AC-11)
- [ ] C26: `package.json` `3.0.0` or without `version` → `0.1.0` (added last), other keys kept, fork-init serialisation (AC-11)
- [ ] C27: `package.json` missing, BOM, not JSON, array → CW-E10 (AC-11)
- [ ] C28: archive with or without its own `range.json` → `range.json` byte-equal to the schema (AC-12)
- [ ] C44: `.gitattributes` exactly U1; `git archive HEAD` passes rules 1–5, holds `.proj.specs/` and its `OPEN-QUESTIONS.md` only under `.proj.specs/`, nothing under `.proj.tickets/` or `create-wxl/`, no NFC/case collision (AC-20)
- [ ] C55: truncated gzip; an HTML body with status 200 → CW-E08 (AC-9)

## 給使用者（zh-TW）

把下載的 archive 當成不可信的輸入：符號連結、路徑穿越、大小寫碰撞等一律拒絕，什麼都不寫；原廠處理 P1–P4 的每條規則與失敗都有測試；上游的 `.gitattributes` 改好，讓上游自己的 `git archive` 也通過同一套規則。0006 會重用這些函式。

## Comments
