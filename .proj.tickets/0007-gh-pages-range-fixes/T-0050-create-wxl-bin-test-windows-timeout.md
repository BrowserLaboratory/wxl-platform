---
id: T-0050
title: create-wxl's bin tests do not time out on a slow Windows runner
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "A CI flake outside 0007, seen on PR #45; deferred on 2026-10-24."
pending_evidence: "GitHub Actions run 40056318499, job \"fork-init-cross-os (windows-latest, 24)\": six cases of create-wxl/test/bin.test.mjs failed with \"Test timed out in 5000ms\" (5002–6880 ms); the job took 194 s against 103–150 s in the twelve runs before it; the rerun passed. Recorded in .proj.tickets/0007-gh-pages-range-fixes/T-0035-hook-commit-forms.md, \"landed (stage 9)\""
pending_on: 2026-10-24
revisit_when: "The same job fails again on a timeout, or create-wxl's tests are next changed."
---

## Context

Six cases of `create-wxl/test/bin.test.mjs` spawn the `bin` as a subprocess (the CW-E13 cases for a
missing or broken `dist/`, and their controls) and use vitest's default 5000 ms limit. On a slow
`windows-latest` runner they took 5002–6880 ms and failed, though the code was the same one that
passed on `main` (`a2b1b96`). A rerun passed. A gate that fails on runner speed teaches the
maintainer to rerun failures, which hides real ones.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

The bin cases have a time limit that a slow Windows runner meets, or spawn less, so the job fails only on a real defect.

## Acceptance criteria

- [ ] The cases that spawn the bin get an explicit timeout with a stated reason, or the spawn count drops
- [ ] `pnpm --dir create-wxl test` passes; the Windows job passes in CI

## 給使用者（zh-TW）

create-wxl 的 `bin.test.mjs` 有 6 個 case 會啟動子程序，在比較慢的 Windows runner 上會超過 vitest 預設的 5 秒而失敗（#45 遇到過，重跑就過）。這張票要調整這些 case 的時間上限或減少子程序，讓這個 job 只在真的有問題時失敗。

## Comments
