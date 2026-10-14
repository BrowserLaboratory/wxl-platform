---
id: T-0015
title: Set the site name and the short-link origin; converge every run
epic: 0004-stateless-engine
status: todo
blocked_by: [T-0014]
---

## Context

A teacher still edits source by hand to name the range and to point its short links at their site. With every flag in place, the engine's whole-run guarantees (convergence, idempotence, dry-run, the full argument order) can be asserted end to end.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; rows in `traceability.md` (revision 2). Round 1 disposition: `review/disposition.md`.

## Deliverable

`--site-name` sets A6 and both A7 under the character rules (`<`, `>`, `&` refused). `--origin` sets A8 under the origin grammar; `--host github-pages` derives it when not given; `--host cloudflare-pages` requires it. Replacing a non-upstream A8 warns. `--rebrand` with `--host`, `--origin` or `--site-name` is an argument error. The full argument check order holds. A half-applied tree converges (T6), a second identical run changes nothing and repeats only the listed warnings (T7), and `--dry-run` reports every change without writing. The short-link module's comment names `fork:init --origin`.

## Acceptance criteria

- [ ] T6: convergence for the three fixed argument sets (S1)
- [ ] T7: second identical run (S1)
- [ ] T8–T10: A6–A8 being set, escapes (S1)
- [ ] T32–T38: origin grammar, Cloudflare path, derivation, untouched (S1)
- [ ] T39–T43: site name (S1)
- [ ] T49: full argument check order (S1)
- [ ] T50: rebrand combinations (S1)
- [ ] T56: dry-run (S1)
- [ ] T81: replacing a non-upstream A8 warns (S1)
- [ ] T83: short-link module comment (S9)

## 給使用者（zh-TW）

設定站名與短連結網址，並驗證整體收斂：`--site-name` 改 config 標題與兩份首頁的 hero；`--origin` 改 `SITE_ORIGIN`，GitHub Pages 沒給時自動推導，Cloudflare 必給；換掉自訂網址會警告；`--rebrand` 與新參數並用報錯。做完後：跑到一半的樹重跑會收斂、跑兩次第二次不變、`--dry-run` 列出所有會改的東西。

## Comments
