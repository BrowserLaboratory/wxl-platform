---
id: T-0012
title: Argument rules and the error model (prefactor)
epic: 0004-stateless-engine
status: todo
blocked_by: []
---

## Context

Before the engine changes what it writes, its inputs and failure reporting must be the ones every later ticket builds on. Today unknown flags throw a raw Node error, the CLI cannot run under type stripping (a parameter property), every non-argument failure is an uncaught exception, and result paths use the OS separator.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`parseForkInitArgs` applies the argument check order for the existing flags (Node parser errors, positional and repeated flags as `ForkInitArgError`; missing or blank `--author`/`--repo`; `--repo` and `--author` value rules), quoting rejected values with `JSON.stringify`. Tree errors return `exitCode` 1 with a message naming the field and file; the CLI prints `✗ ` and the message on stderr. The CLI runs under `node --experimental-strip-types` without `tsx`. A missing, BOM-prefixed, unparsable or non-object manifest is a tree error, and a non-object `repository`/`bugs` becomes an object, in both modes. Every path in the result uses `/`. Every existing rebrand test passes unchanged.

## Acceptance criteria

- [ ] T12–T13: manifest errors and object forms, both modes (S1)
- [ ] T45–T48: `--repo`, `--author`, missing, Node parser errors, positional, repeated (S1)
- [ ] T51: rebrand differences for arguments, errors, paths and the manifest (S1)
- [ ] T53–T54: tree errors and nothing written (S1, S2)
- [ ] T57: `/` paths in every result field and message (S1)
- [ ] T58–T59: CLI under type stripping, stdout order and `✗ ` stderr (S2)
- [ ] T83: fork-init.ts exit-code and mode comments (S9)

## 給使用者（zh-TW）

先重構引擎的輸入與錯誤：參數檢查順序、空值、重複旗標、positional 參數一律變成 `ForkInitArgError`；非參數錯誤改為回傳 exit 1，CLI 在 stderr 印 `✗`；CLI 能用 `node --experimental-strip-types` 直接跑；manifest 壞掉或格式不對時報錯或補成物件；所有路徑用 `/`。既有 rebrand 測試全部照舊通過。

## Comments
