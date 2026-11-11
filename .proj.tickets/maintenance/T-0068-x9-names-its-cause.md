---
id: T-0068
title: X9 names its cause
epic: maintenance
status: pending
blocked_by: []
pending_reason: superseded by epic 0009 (npm trusted publishing), which rewrites X9 to check the CI environment; the user chose "New epic, fold X9 in (Recommended)" on 2026-11-11
pending_evidence: .proj.specs/0009-npm-trusted-publishing/traceability.md (Q1, D1); the branch tickets/T-0068/x9-npm-login-message (c41c1ad) is not merged
pending_on: 2026-11-12
revisit_when: never; kept so the id stays permanent
---

## Context

`checkPublish`'s X9 (`.proj.specs/0005-create-wxl/traceability.md`, "Package and publishing")
reports every failure the same way: `X9 (the npm name is already maintained by someone else)`.
`checkPublish` catches any throw from `npmView` or `npmWhoami`, and a maintainer entry that is not
a string, and turns each into that line. At both releases so far the real cause was an expired npm
login (`npm whoami` → 401) while the only maintainer was the publisher: T-0029 (3.0.0, 2026-10-17)
and T-0067 (3.1.0, 2026-11-11, Comments), where the message sent the diagnosis toward another
maintainer first. The gate's decision is right; only its report is wrong.

Stage 1 with the user on 2026-11-11 decided: a maintenance ticket that also amends epic 0005
(spec and traceability revision 2.4, self-checked without another review round, as revisions 2.2
and 2.3 were), and one check id X9 with three messages, one per cause.

## Maintenance plan (the requirement)

- R1: X9 still fails closed in every case it fails today, and still passes in exactly the cases it
  passes today (the maintainer list is empty, or it names the user `npm whoami` reports, compared by
  the part before ` <`, trimmed). `err.checks` stays `['X9']`.
- R2: X9's message names one of three causes:
  - **login not confirmed**: `npmWhoami` throws or returns an empty name. The message says the npm
    login could not be confirmed, carries the first line of the error, and tells the publisher to
    run `npm login`, then publish again.
  - **maintainers not read**: `npmView` throws, or a maintainer entry is not a string. The message
    says the name's maintainers could not be read from the registry and carries the first line of
    the error.
  - **someone else**: the list names other maintainers only. The message names them (the part
    before ` <`) and the user `npm whoami` reported.
- R3: 0005's traceability X9 row, row C42 and the spec's AC-19 say so; both files record
  revision 2.4.

## Deliverable

A publisher whose npm login has expired sees, at `prepublishOnly`, that the login could not be
confirmed and that `npm login` fixes it, not a claim that someone else maintains the name.

## Acceptance criteria

- [ ] R1
- [ ] R2
- [ ] R3

## Test plan

### 2026-11-11 — test plan table（使用者 2026-11-11 核准：「核准」，寫第一個測試之前）

All rows are seam 0005-S2 (`checkPublish` on the publish fixture with lightweight tag, X1–X8
holding), in `create-wxl/test/publish.test.mjs`, acceptance criterion AC-19 / row C42.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S2 | `npmWhoami` 丟錯 → X9「登入無法確認」 | 改寫既有「fails naming X9 when npmWhoami itself fails」 | R1、R2 / AC-19、C42 | `npmView` 回 `['someone-else <…>']`，`npmWhoami` 丟 `npm whoami failed: npm error code E401\nnpm error 401 Unauthorized …`：`checks` 為 `['X9']`；訊息含 `npm login could not be confirmed`、`npm error code E401`、`` `npm login` ``，不含第二行、不含 `someone else`。預期紅燈：現在是「someone else」 |
| 0005-S2 | `npmWhoami` 回空字串 → X9「登入無法確認」 | 新增 | R1、R2 / AC-19、C42 | `npmWhoami` 回 `'  \n'`（trim 後為空）。預期紅燈：現在走「someone else」 |
| 0005-S2 | `npmView` 丟錯（非 E404）→ X9「maintainers 讀不到」 | 改寫既有「fails naming X9 when npmView itself fails (not E404)」 | R1、R2 / AC-19、C42 | 訊息含 `maintainers could not be read`、錯誤第一行，不含 `npm login`、不含 `someone else`。預期紅燈 |
| 0005-S2 | maintainer 項目不是字串 → X9「maintainers 讀不到」 | 新增 | R1、R2 / AC-19、C42 | `npmView` 回 `[42]`，`npmWhoami` 回 `'Ada'`。預期紅燈 |
| 0005-S2 | 真的是別人維護 → X9 點名 maintainer 與 whoami 使用者 | 改寫既有「fails naming X9 when the npm name is already maintained by someone else」 | R1、R2 / AC-19、C42 | `npmView` 回 `['someone-else <someone@example.com>', 'another']`、`npmWhoami` 回 `'Ada'`：訊息含 `someone-else, another` 與 `Ada`，不含 `someone@example.com`、不含 `npm login`。預期紅燈 |
| 0005-S2 | 通過的情況不變 | 既有「passes when X1-X9 all hold」（兩種 tag）與其餘 X1–X8 測試 | R1 / AC-19 | 結果不變（確認型） |

Stage 8 (the surface that runs it): `check-publish.mjs`'s X9 path with the real `createNpmWhoami`
under a temporary npm user config (no token → `ENEEDAUTH`; an invalid token → `E401`), on the
publish fixture, and the printed `checkPublish failed: …` line. Nothing is published.

## 給使用者（zh-TW）

create-wxl 的發布檢查 X9 不論失敗原因為何，都印「npm name 已由別人維護」。3.0.0 與 3.1.0 兩次發布，真正原因都是 npm 登入過期（`npm whoami` 回 401），訊息卻把人引去懷疑別的 maintainer。這張票讓 X9 依原因印出三種訊息：登入無法確認（請執行 `npm login` 後重新發布）、讀不到 registry 上的 maintainers、確實由別人維護（點名是誰、你又是誰）。X9 的判斷完全不變，仍是 fail-closed；`err.checks` 仍是 `['X9']`。0005 的 traceability 與 spec 同步改為 revision 2.4，不另跑 review。

## Comments

- 2026-11-11, stage 1 (the user, via two questions): route "維護 ticket＋修 0005"; reporting
  "同一個 X9，訊息分三種", with the preview's wording as the model.
- 2026-11-12, superseded: the user folded X9's redesign into epic 0009 (Q1). The branch
  `tickets/T-0068/x9-npm-login-message` (three commits up to `c41c1ad`: code, tests, 0005 revision 2.4)
  is not merged; spec 0009's T-0069 rewrites X9 instead, and T-0072 writes 0005 revision 2.4. Only the
  test structure is reused (spec 0009, Testing Decisions).
