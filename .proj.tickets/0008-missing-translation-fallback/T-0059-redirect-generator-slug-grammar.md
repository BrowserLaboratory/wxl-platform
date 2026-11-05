---
id: T-0059
title: The redirect generator refuses a slug outside the grammar or shadowed by a number
epic: 0008-missing-translation-fallback
status: pending
blocked_by: []
pending_reason: "Recorded by T-0056's security review (S-1, S-4) as predating that ticket, widened from two rule forms to four; raised as N-3 by 0008's chain analysis. The user's standing instruction of 2026-11-06 (follow the recommendations) opens it as a pending ticket."
pending_evidence: "review/security-T-0056.md S-1 and S-4; review/chain-analysis.md C-4 and N-3. Of the tools that write _redirects, none checks the slug grammar; create:challenge (scripts/create-challenge.ts:96, with the regex at :39) and the copy control (.vitepress/challenge/shortLink.ts:91) do. generate-redirects.ts and challenge-numbers.ts take directory names as they are. On wxl.browserlab.online, /en/c/%2F%2Fevil.example redirects to the same-origin /challenge/%2F%2Fevil.example/ (curl, 2026-11-06)."
pending_on: 2026-11-06
revisit_when: "The next change to scripts/generate-redirects.ts or scripts/challenge-numbers.ts, or a challenge directory created by hand instead of by create:challenge."
---

## Context

`scripts/generate-redirects.ts` writes every challenge directory's name into `_redirects` without the
slug grammar that `create:challenge` enforces (`scripts/create-challenge.ts:96`) and the copy control
checks (`.vitepress/challenge/shortLink.ts:91`); one shared regex would serve all three. A name with a space
or a newline adds a field to a rule or splits it in two. An all-digit slug equal to another
challenge's padded number (`005`) is shadowed by that number's rules, which come first: `/en/c/005`
opens the other challenge. Since T-0056 each slug has four rules, so both effects reach four forms.
Every target stays on the site (chain analysis C-4); the result is a broken range, not an off-site
link. The 500-challenge limit (security-T-0056 S-2) is not part of this ticket: spec 0008's Out of
Scope keeps it unenforced.

## Deliverable

`pnpm redirects:generate`, the pre-commit hook and CI refuse a challenge directory whose name is
outside the slug grammar, or an all-digit slug equal to another challenge's padded number, naming it.

## Acceptance criteria

- [ ] A directory name outside the slug grammar stops `redirects:generate` with a message naming it, with a test
- [ ] An all-digit slug equal to another challenge's padded number stops it the same way, with a test; a slug equal to its own challenge's padded number does not, with a test
- [ ] The hook and CI report the same refusal, as they report a number clash today

## 給使用者（zh-TW）

產生 `_redirects` 的程式沒有檢查題目目錄名稱是否合乎 slug 文法：名稱含空白或換行會讓規則壞掉；全是數字、又剛好等於另一題補零編號的 slug，會被那個編號的規則蓋過，會開到另一題。T-0056 之後每題有四條規則，影響也變成四種形式。連結都還在站內，所以不是安全漏洞，但靶場會壞掉。這張票讓產生器、hook 與 CI 拒絕這兩種名稱並說明原因。

## Comments
