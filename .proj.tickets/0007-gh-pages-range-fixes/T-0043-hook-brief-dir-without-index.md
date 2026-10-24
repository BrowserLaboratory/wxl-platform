---
id: T-0043
title: The pre-commit hook refuses a Traditional Chinese directory with no index.md and no English challenge
epic: 0007-gh-pages-range-fixes
status: pending
blocked_by: []
pending_reason: "Known edge left by T-0033; CI still catches it. Deferred on 2026-10-24."
pending_evidence: ".proj.tickets/0007-gh-pages-range-fixes/T-0033-hook-refuses-orphan-brief.md:210-213 (Known edges, point 3)"
pending_on: 2026-10-24
revisit_when: "A teacher reports a CI failure from such a directory, or an epic changes the orphan-brief check."
---

## Context

T-0033's orphan-brief check (D12) reads the index slugs, which a tree's `<slug>/index.md`
decides. A staged directory `platform/zh-TW/challenge/<slug>/` that holds files but no `index.md`,
and has no English twin, is therefore not an index slug and not an orphan: the hook passes it, and
`redirects.test.ts` ("backs every translated slug with a root-locale challenge") fails in CI after
the push. That is the failure the epic exists to move to the commit.

Recorded on 2026-10-24 at the user's request ("已知、沒修的邊界情況先記錄起來，開成 pending tickets 後續修"),
after epic 0007's tickets T-0030 to T-0038 landed. No matrix row of 0007 covers it; when it is taken
up, it needs its own rows (a spec revision or the next epic's spec).

## Deliverable

Such a commit is refused locally with a message naming the directory, or the spec states that CI is where it is caught.

## Acceptance criteria

- [ ] Decide whether the check covers directories without `index.md`, and how W6 or a new message words it
- [ ] A case at seam 0007-S5 covers the directory
- [ ] `redirects.test.ts` and the hook agree on what counts as a translated slug

## 給使用者（zh-TW）

一個沒有 `index.md`、也沒有對應英文題目的繁中題目資料夾，目前會通過 hook，push 之後才在 CI 失敗。這張票要讓 hook 在本機就擋下並指名資料夾，或在 spec 寫明由 CI 負責。

## Comments
