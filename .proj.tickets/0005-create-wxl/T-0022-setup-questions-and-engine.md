---
id: T-0022
title: Setup questions and applying them with the engine
epic: 0005-create-wxl
status: todo
blocked_by: [T-0021]
---

## Context

Without `--no-setup`, create-wxl asks the teacher the setup questions S1–S5 in the terminal (or takes
them from flags), shows the summary S6, and applies the answers to the new range with the platform's
fork-init engine (`parseForkInitArgs` then `runForkInit`, seam 0004-S1). This ticket covers steps 3
(interactive directory question), 4's re-ask, 5 and 11.

Spec: `.proj.specs/0005-create-wxl/traceability.md` revision 2.1, seam 0005-S1; "Setup questions",
"Step order" 3–5 and 11.

## Deliverable

A teacher can create a configured range interactively or with flags: invalid answers are asked again,
an engine rejection or `n` at the summary starts a second pass with every question, and the engine
applies exactly the last accepted parse. Non-interactive runs fail with CW-E05/E06 and write nothing;
an engine failure after the move is CW-E12 with finishing commands.

## Acceptance criteria

- [ ] C04: no directory → asks with default `wxl-range` (interactive) / CW-E03 (non-interactive) (AC-3)
- [ ] C08: all flags, non-interactive, values with spaces → no question; argv exactly the ordered `--flag=value` items, verbatim (AC-5)
- [ ] C09: a required flag missing per host → CW-E05 naming each; `--host CLOUDFLARE-PAGES` without `--origin` → no CW-E05, engine rejection CW-E06 (AC-5)
- [ ] C10: interactive, no flags → S1–S5 in order, Enter takes the default, trimmed answers, S3 `2` → `--host=cloudflare-pages` (AC-6)
- [ ] C11: S2 `bad`, and `--repo bad` as a flag → engine message, second pass with current answers as defaults, corrected S2 accepted, no download before the summary is accepted (AC-6)
- [ ] C12: non-interactive engine rejection → CW-E06, nothing written (AC-5)
- [ ] C13: summary `n` → every question again with current answers as defaults (AC-6)
- [ ] C32: valid answers → `runForkInit` once with `{ projectRoot: target }` and the parsed args; 0004's A1, A6–A8 and the host's workflow (AC-14)
- [ ] C33: `runForkInit` returns `exitCode` 1, or throws → CW-E12 with message and finishing commands, range and `range.json` stay, no git step, exit 1 (AC-14)
- [ ] C34: engine warnings printed after the apply (AC-14)
- [ ] C51: EOF while a question is open → CW-E15, nothing written (AC-6)
- [ ] C52: S1 empty; S3 `3` then `CLOUDFLARE-PAGES`; summary `maybe` then ` Y `; directory `~/x` → asked again as the row states (AC-6)
- [ ] C63: summary shows the derived origin for `alice/alice.github.io` and `Alice/r`, and the parsed origin for S4 `https://Example.COM` (AC-6)
- [ ] C64: interactive, the asked directory is non-empty → CW-E04 text, asked again, a valid answer proceeds (AC-4)
- [ ] C66: first pass S3 `2`, S4 address; `n`; second pass S3 `1`, S4 `-` → no `--origin`, summary shows the derived address (AC-6)
- [ ] C68: `n`, S5 `a<b` rejected, then `S8` → `runForkInit` receives exactly the last parse's object (AC-14)

## 給使用者（zh-TW）

不加 `--no-setup` 時，create-wxl 在終端機問老師作者、repository、主機、網址、網站名稱，顯示摘要確認，再用平台自己的 fork-init 引擎套用到新靶場。答錯會重問；引擎拒絕或摘要回 `n` 會整輪重問；非互動模式缺值或被拒就以代碼結束、什麼都不寫。

## Comments
