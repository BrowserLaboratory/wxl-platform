---
id: T-0002
title: Truth-test harness for the session gate
epic: 0001-truthful-clear-reports
status: todo
blocked_by: [T-0001]
---

## Context

The existing gate component tests mock the whole composable and only check which message group is
routed (OQ-003, K13). The spec requires tests that build the real machine state and compare literal
sentences (seam S2, G1/G9). This ticket builds that harness and proves it on screens that do not change.

Spec: `.proj.specs/0001-truthful-clear-reports/spec.en.md`; rows in `traceability.md`. Remaining round-2 P2 findings that touch this ticket's rows are listed in `review/round-2.md` and are in scope here.

## Deliverable

A test module can mount the gate component with the real composable and the real persistence layer over
fake-indexeddb, inject fault F1, assert preconditions with the allowed database reads, and compare each
rendered sentence with a literal string by trimmed exact equality, in en and zh-TW. It is exercised by
pinning P0 and P1 as they are today.

## Acceptance criteria

- [ ] Harness mounts the gate against the real composable and fake-indexeddb; faults are removed in `finally` right after the press they target (traceability: Faults).
- [ ] Sentences are compared by trimmed exact equality against literals written in the test; nothing is imported from the message files.
- [ ] A CI-1 checker exists that fails when a given literal contains a banned term in either locale.
- [ ] P0 (T17) and P1 (T18) are pinned with literal en and zh-TW strings, showing what `72327e2` shows (AC-8).
- [ ] Editing the P0 body in a message file into a different sentence turns a harness test red (demonstrated once, then reverted).

## 給使用者（zh-TW）

建立「說的是真的」測試架構：用真的 composable 和 fake-indexeddb 掛載 gate，可以注入掃除失敗，並用測試裡寫死的
字串做完全相等比對（en、zh-TW）。先拿它把 P0、P1 現在的畫面釘住；把 message 檔改掉一句，測試就會變紅。

## Comments
