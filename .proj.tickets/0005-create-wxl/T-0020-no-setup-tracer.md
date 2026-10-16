---
id: T-0020
title: create-wxl --no-setup creates a pristine range end to end
epic: 0005-create-wxl
status: todo
blocked_by: [T-0019]
---

## Context

The tracer bullet for create-wxl: the package skeleton (manifest without the publishing scripts,
`.gitignore`, lockfile, vitest; U2) and `run(argv, io, deps)` covering steps 1–4, 6–10 and 13 for
`--no-setup`. It implements the happy path of the archive parse, extraction and pristine processing
P1–P4 so that a fixture archive yields a complete range; T-0021 pins the entry rules and each P rule.
Messages are added to both the `en` and `zh-TW` tables from the start (T-0024 pins the language rule).

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Command grammar",
"Step order", "Test-download override".

## Deliverable

`run` with `<dir> --no-setup` and a fixture archive produces the pristine range at the target, prints
N1 and N8, and exits 0; argument, Node version, source record, target and download failures exit 1
with their codes and write nothing.

## Acceptance criteria

- [ ] C01: Node 22.5.0 / 21.99.0 → CW-E01, nothing written, no download; 22.6.0, 22.10.0, 23.0.0 accepted (AC-1)
- [ ] C02: every grammar error listed in the row → CW-E02 naming it (not CW-E13 with a broken source record), nothing written (AC-2)
- [ ] C03: `--no-setup` with a setup flag → CW-E02 (AC-2)
- [ ] C05: target missing, parent writable → proceeds (AC-4)
- [ ] C06: target an empty directory, or `.` in an empty cwd → proceeds (AC-4)
- [ ] C07: each rejected target of the row → CW-E04 naming path and condition, nothing written, no download (AC-4)
- [ ] C14: fetcher rejects, aborts mid-body, 404, times out → CW-E07 naming the URL, target unchanged, no temporary directory (AC-7)
- [ ] C15: `CREATE_WXL_COMMIT` 40 lowercase hex → CW-W04, fetched by that commit, written to `range.json` (AC-8)
- [ ] C16: `CREATE_WXL_COMMIT` short, uppercase or other → CW-E02 in step 2 (AC-8)
- [ ] C22: fixture with an executable file, umask 022 → every file without the prefix, byte-identical except P1–P4 files; modes 0755/0644, target 0755 (AC-10)
- [ ] C29: target missing / empty / `.` → range at the target, temporary directory gone (AC-10)
- [ ] C39: `--no-setup` with and without the override → P1–P4 applied, no engine or `runGit` call, exactly N1 and N8 (AC-16)
- [ ] C50: each broken source record field → CW-E13, nothing written (AC-23)

## 給使用者（zh-TW）

create-wxl 的第一條完整路徑：建立套件骨架，`create-wxl <資料夾> --no-setup` 從 fixture archive 下載、解壓、做原廠處理後，產生一個原廠靶場並印出下一步。參數、Node 版本、套件來源紀錄、目標資料夾與下載的錯誤都會以代碼結束，什麼都不寫。

## Comments
