---
id: T-0026
title: Upgrade entry, preconditions and base resolution
epic: 0006-range-upgrade
status: todo
blocked_by: [T-0025]
---

## Context

Epic 0006 lets a teacher take a later upstream release into their range with `pnpm range:upgrade`
(= `npx --yes create-wxl@latest upgrade`). This ticket builds the entry: the `upgrade` grammar, the
git and clean-tree checks, reading the base from `range.json` or `--from`, the no-op, downgrade and
3.0.0-floor checks before and after downloading, and downloading both archives into pristine ranges
with 0005's functions. It stops before planning; T-0027 adds the merge.

Deadline (decision R1, 2026-10-16): if this epic has not landed by 2026-10-16 23:59, this ticket is set
to `pending` with its reason and evidence and ships after the workshop as 3.0.x (decision of
2026-10-16, Q2 option A).

Spec: `.proj.specs/0006-range-upgrade/traceability.md` revision 2, seam 0006-S1; "Command grammar",
"Step order" 1–7, "Base from `range.json`".

## Deliverable

`create-wxl upgrade` in a range refuses, with its UP or CW code and without writing anything, every
case the preconditions exclude; for an upgradable range it resolves base and target, downloads and
builds both pristine ranges, and removes its temporary directories.

## Acceptance criteria

- [ ] U01: `upgrade --from 3.0.0`, `--from <40 hex>`, `--lang en upgrade` → accepted (AC-1)
- [ ] U02: each grammar error of the row → CW-E02, nothing written (AC-1)
- [ ] U03: not a repository / a subdirectory / the root through a symbolic link → UP-E01 / UP-E01 / accepted (AC-2)
- [ ] U04: `runGit` rejects `ENOENT`; git 2.19.0 → UP-E02, exit 1 (AC-2)
- [ ] U05: each unclean case of the row → UP-E03 with its token, exit 1, nothing written (AC-2)
- [ ] U06: valid `range.json` → base = its commit and version (AC-3)
- [ ] U07: absent, no `--from` → UP-E04 (AC-3)
- [ ] U08: absent with `--from <version>` / `--from <commit>` → base from `--from`, version given / from the base archive's manifest (its display in R1 is verified in T-0027, U26) (AC-3)
- [ ] U09: valid + `--from`; other repository + `--from`; unparsable + `--from` → `--from` wins / wins / UP-E06 `not-json` (AC-3)
- [ ] U10: each J1, J3, J4 breakage without `--from` → UP-E06 with the token (AC-3)
- [ ] U11: repository differs / differs only in case → UP-E05 / accepted (AC-3)
- [ ] U12: base commit = target commit → UP-I01, exit 0, no download, nothing written (AC-4)
- [ ] U13: base version > target → UP-E07 before any download (AC-4)
- [ ] U14: equal versions, different commits → with override proceeds past step 7 with CW-W04 / without, UP-I01 (AC-4)
- [ ] U15: either archive rejected, hostile, or lacking a P1/P2 marker → the 0005 code, exit 1, nothing written, no `create-wxl-upgrade-` entry under `tmpRoot` (AC-5)
- [ ] U16: `--from <version>` tag archive `comment` absent or not 40 hex → UP-E08 (AC-5)
- [ ] U30: the root manifest's `range:upgrade` script exactly as specified, checked by a create-wxl test (AC-12)
- [ ] U31: `create-wxl upgrade` takes the upgrade path; `create-wxl <dir>` unchanged (AC-12)
- [ ] U50: base 2.9.9 from `range.json`, and `--from 2.9.9` → UP-E10 before any download (AC-4)
- [ ] U51: `--from <commit>` whose archive version is above / equal-with-target-commit / below 3.0.0 → UP-E07 / UP-I01 / UP-E10 after download, nothing written (AC-4)
- [ ] U52: `--from <version>` resolving to the target's commit → UP-I01, nothing written (AC-4)

## 給使用者（zh-TW）

0006 升級的入口：在靶場裡執行 `create-wxl upgrade`，先檢查 git、工作目錄是否乾淨、從 `range.json` 或 `--from` 找出 base，擋下不用升級、降版、3.0.0 以前的情況，再下載 base 與 target 兩份原廠靶場。這張還不做合併。若 23:59 前沒落地，改為 pending、研習後以 3.0.x 發布。

## Comments

### 2026-10-16 — deadline withdrawn

At 23:39 on 2026-10-16 the user withdrew the 23:59 pending deadline (decision R1, Q2 option A) for this epic: T-0026 and T-0027 are not set to `pending` and are implemented after T-0025, in order. The workshop of 2026-10-17 still uses the fork + `pnpm fork:init` path.
