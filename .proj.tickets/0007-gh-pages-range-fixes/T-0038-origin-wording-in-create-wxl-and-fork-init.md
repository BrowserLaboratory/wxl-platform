---
id: T-0038
title: create-wxl and fork:init describe the origin as the range's address
epic: 0007-gh-pages-range-fixes
status: todo
blocked_by: [T-0036]
---

## Context

After T-0036, `SITE_ORIGIN` is the origin of every copied link, not only of short links. create-wxl's
setup summary still prints it as "short link origin" / 「短連結網址」, and fork:init's usage comment and
warning call it the short-link origin. A teacher on a GitHub Pages range then underestimates what a
wrong origin breaks (D10). This is the create-wxl and fork:init part of passage P3. The README and
skill parts land with T-0039. create-wxl ships with its own release, so its strings reach teachers
on the next create-wxl publish.

Spec: `traceability.md` revision 3, passage P3; D10.

## Deliverable

create-wxl's summary line in both languages, its comment on the S6 question, and fork:init's usage
comment and warning name the value as the range's address, the origin of every copied link.

## Acceptance criteria

- [ ] P3: create-wxl's `S6-ORIGIN` message in English and Traditional Chinese, and the matching comment in its questions module (AC-24)
- [ ] P3: fork:init's usage comment (`--origin` and A8) and its warning about replacing a custom origin (AC-24)
- [ ] `pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test` passes
- [ ] `fork-init.test.ts` passes (AC-25)
- [ ] No message key or engine behaviour changes; only wording

## 給使用者（zh-TW）

把 create-wxl 設定摘要裡的「短連結網址」，以及 fork:init 的說明與警告，改成「靶場網址」，也就是每一條複製連結的 origin，讓老師知道這個值設錯時，影響的不只是短連結。create-wxl 的字串會在它下一次發布時生效。

## Comments
