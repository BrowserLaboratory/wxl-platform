---
id: T-0024
title: Failures, signals, language and escaping
epic: 0005-create-wxl
status: todo
blocked_by: [T-0023]
---

## Context

The robustness layer over the whole `run`: rollback when moving into place fails, the step-10 recheck
against another process, file-system errors in steps 8–9, the three signals in every window (including
Ctrl-C at a question), unexpected errors, the language rule with both message tables, and the escaping
of every value from outside. Its guarantee is the write scope: nothing outside the target and the run's
own temporary directory is ever touched.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Step order" 8–10,
"Writes and cleanup", "Signals", "Language", "Error and warning codes".

## Deliverable

Every failure or signal leaves the target as it was (steps 1–10) or keeps the range and prints the
remaining commands (after step 10); output is in the selected language with the same message ids in
both tables; outside values are printed escaped, and copyable commands are quoted or withheld.

## Acceptance criteria

- [ ] C30: `fs.rename` fails on the 3rd entry → CW-E11, entries 1–2 moved back, target empty, temporary directory removed (AC-10)
- [ ] C31: `SIGINT` at steps 4, 6, 8, 9 and during the 2nd move of step 10 → exit 130, target as before, temporary directory removed or never created (AC-13)
- [ ] C41: each language case of the row → zh-TW / zh-TW / en / zh-TW / en / CW-E02 in en; both tables have the same ids, texts differ outside commands, paths and codes (AC-18)
- [ ] C53: another process creates a file or non-empty directory at the target before step 10 → CW-E04, temporary directory removed, their target untouched; an empty directory → accepted (AC-10)
- [ ] C54: `mkdtemp`, an entry write, the `range.json` write, or a `package.json` read fails → CW-E09, target unchanged, temporary directory removed (AC-10)
- [ ] C56: `SIGTERM` at step 9, `SIGHUP` at step 12, `SIGINT` at step 11 and at a question, a second `SIGINT` during cleanup → as the row states (AC-13)
- [ ] C57: `parseForkInitArgs` throws a plain `Error`; `fs.readdir` throws at step 4 → CW-E14, nothing written, exit 1 (AC-13)
- [ ] C60: each escaping case of the row → JSON literals with `\u001b`, `\n`, `\u007f`; `cd ./-x`; `cd 'my range'`; N1 withheld for a control character (AC-24)
- [ ] C65: rename fails on the 3rd entry and again moving back the 2nd → CW-E11 naming the 2nd entry and the kept temporary directory, exit 1 (AC-10)
- [ ] C69: a full interactive run with a recording `fs` → every path written, renamed or removed is under the target or the run's temporary directory (AC-10)

## 給使用者（zh-TW）

把 create-wxl 的失敗處理補齊：搬移失敗會搬回、其他程式搶先建立目標會停下、Ctrl-C 等三種訊號在每個步驟都有明確結果；中英文訊息表同一組 id；外來的值一律跳脫，可複製的指令會加引號，含控制字元時不印。保證只動目標資料夾和自己的暫存目錄。

## Comments
