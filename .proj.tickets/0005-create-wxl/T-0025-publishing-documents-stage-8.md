---
id: T-0025
title: Publishing gate, documents and the epic's stage 8
epic: 0005-create-wxl
status: todo
blocked_by: [T-0024]
---

## Context

The last ticket of epic 0005. It makes create-wxl packable and publishable: `prepareDist` carries the
type-stripped engine, the package source record and `LICENSE`; `checkPublish` (X1–X9) refuses a
release that does not match upstream's pushed tag; the `bin` refuses a broken package (CW-E13); CI
runs create-wxl's tests (U3). It writes the documents (Charter U4, READMEs U5, open questions U6–U8,
glossary U10 checks, the rest of U9 — `quality-gates.yml`'s comment on `fork-init-cross-os` and `AGENTS.md`'s repository layout and build-and-test list, which name create-wxl — and the strings of U9 written in T-0019) and runs stage 8 on the packed package
(0005-S4). Publishing to npm is not part of this ticket: the user publishes.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seams 0005-S2, 0005-S3, 0005-S4;
"Package and publishing", "Upstream configuration", "Stage 8 inputs", "Overridden contracts".

## Deliverable

`npm pack` in the package directory produces a tarball that, run through `npx`, creates working ranges
for both hosts and for `--no-setup` as "Stage 8 inputs" lists; `checkPublish` throws naming each
violated check; the documents carry every listed string.

## Acceptance criteria

- [ ] C42: D1 and each of X1–X9 violated (X6 lightweight and annotated, X7 with a symbolic link) → `prepareDist` throws D1 having removed `dist/`; `checkPublish` throws naming the check (AC-19)
- [ ] C43: all hold → `dist/source.json` as specified, `dist/fork-init.mjs` imports and parses a valid argv, `LICENSE` copied, `checkPublish` passes (AC-19)
- [ ] C45: manifest equal to the listing apart from the four placeholders, each exact; `version` equals the root's; `.gitignore` and lockfile present (AC-20)
- [ ] C46: the new CI step with exactly that `run`, after the unchanged existing step; job `if:` unchanged (AC-20)
- [ ] C47: each U4–U10 string present (Charter with whitespace collapsed, `stay forkable` absent); the three words absent from the new README subsections (AC-21)
- [ ] C48: stage 8 run I's `pnpm test --run` passes; run IV's guard tests report skips (AC-20, AC-22)
- [ ] C49: stage 8 runs 0, I, Ib, II, III as "Stage 8 inputs" lists (AC-22)
- [ ] C67: the `bin` with `dist/` removed, or with `dist/fork-init.mjs` altered → CW-E13 in the environment's language, exit 1, nothing written (AC-23)

Stage 8 here is 0005-S4, a terminal run of the packed package (OQ-022); `dist/` and the `.tgz` are
removed afterwards.

## 給使用者（zh-TW）

0005 的最後一張：讓 create-wxl 可以打包與發布（帶入去型別的引擎、來源紀錄、LICENSE；發布前檢查 X1–X9；套件壞掉時 `bin` 報 CW-E13；CI 跑 create-wxl 的測試），寫好 Charter、README、開放問題，並用打包後的套件跑第 8 階段的五個情境。npm 發布由你執行，不在這張。

## Comments
