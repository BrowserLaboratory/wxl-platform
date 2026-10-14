---
id: T-0011
title: Keep upstream-only CI upstream, and guard upstream's identity
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0010]
---

## Context

A range copies upstream's workflows and tests. Today the release job would run in every range, three component tests hardcode the upstream address, and nothing fails if the engine is ever run on upstream. The upstream repository slug must also stay out of anything rebrand mode's tree-wide swap could redirect.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

The fork-init module exports `UPSTREAM_SLUG` and the list of known old template outputs (initially `0cf52f11…7276`), with a verbatim copy of the template at `72327e2` as a test fixture. A new `upstream-guard.test.ts` holds the guard's classification, the upstream decision and the pristine check (fixture-tested everywhere, real-tree runs upstream only), honours `WXL_EXPECT_UPSTREAM`, and pins the current template's hash (T27). The `release` job and a new cross-OS job in quality-gates carry the `format(...)` `if:`; the `test` job and the new job set `WXL_EXPECT_UPSTREAM`. The three component tests read the real `SITE_ORIGIN`. A rebrand run leaves the upstream-only lines and the engine file untouched.

## Acceptance criteria

- [ ] T27: known old outputs and the template-hash pin; the fixture copy hashes to the list's first value (S5)
- [ ] T44: `UPSTREAM_SLUG` exported (S1)
- [ ] T52: `--author x --rebrand acme --repo me/x` leaves the `if:`/`env` lines, `UPSTREAM_SLUG` imports and the engine file byte-identical (S1)
- [ ] T61–T64: guard violations, binary files, letter case (S5)
- [ ] T65–T66: upstream decision (S5)
- [ ] T67–T68: pristine check and field ids (S5)
- [ ] T69: real-tree runs only upstream; `WXL_EXPECT_UPSTREAM` contradiction fails (S5)
- [ ] T70: component tests from the imported `SITE_ORIGIN` (S6)
- [ ] T71–T72: `if:`, `env`, cross-OS matrix and steps (S4)

## 給使用者（zh-TW）

讓上游專用的 CI 只在上游跑，並守住上游的身分：匯出 `UPSTREAM_SLUG` 與舊範本清單；新增 `upstream-guard.test.ts`（slug guard、上游判定、上游原貌檢查、釘住範本 hash）；release job 與新的跨 OS job 加上 `format()` 形式的 `if:`；三支元件測試改讀真正的 `SITE_ORIGIN`。做完後：靶場不會跑上游的 release；有人在上游誤跑引擎，上游 CI 會變紅。

## Comments
