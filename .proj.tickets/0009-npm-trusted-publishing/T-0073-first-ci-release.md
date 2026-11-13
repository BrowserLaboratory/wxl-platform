---
id: T-0073
title: First CI release of create-wxl
epic: 0009-npm-trusted-publishing
status: review
blocked_by: [T-0069, T-0070, T-0071, T-0072]
---

## Context

Spec 0009's U4 makes the first release through `publish-npm.yml` this epic's last ticket; its stage
8 is AC-7, which runs after its own PR merges (O3, O4). The version is at least a patch over 3.1.0,
since the epic changes code that ships in the package. The user's settings come first, in order:
MN7 and MN2 before any `v*` tag (D14), then MN1 within 2 days before the tag, with every publishing
token revoked. `docs/agents/release.md` holds each step's exact values.

## Deliverable

- RP1: versions and the CHANGELOG entry from `/tw-emoji-release-note` land on `main`.
- RP2: the user confirms the tag name and reads RP1's merge SHA themselves (D13); the agent checks
  the SHA is on `main` and both manifests at it hold `<V>`, then pushes one annotated tag `v<V>`
  alone, never with `--tags`.
- RP3: CI runs. RP4: the release notes are replaced with the CHANGELOG entry.
- RP5: the user checks (a)–(d), (b) including the run's commit against the SHA (D13), and approves.
- RP6: the agent verifies the registry, the provenance statement and a fresh `npm create wxl`.
- MN3: after approval, the user sets the package to disallow tokens.
- F6, if it happens: the user moves `latest` back before deprecating (D12).
- OQ-027 is filled with the fields the Staged Packages tab showed.
- Status stays `review` after the PR merges until AC-7 holds (O4).

## Acceptance criteria

Spec 0009 revision 3.1 (D11–D14 change MN7, MN2's timing, RP2, RP5 (b), F6 and S8-04).

- [ ] Rows S8-01–S8-07.
- [ ] AC reached: AC-7, met by the first `v<V>` that is approved and passes RP6; every earlier
  attempt recorded with its F-row.
- [ ] The record quotes the user's reports for MN1 (six fields, single trusted publisher), the token
  revocation, the collaborator list, MN2, MN7 (both rulesets) and MN3, each equal to its expected
  value.

## Test plan

### 2026-11-13 — test plan table（依使用者 2026-11-12 的授權「test plan table 與新的 D 編號照你的建議核准（仍要列給我看）」核准）

這張票的程式變更只有版號（RP1）。版號一致與格式由既有測試把關，不新增 seam；AC-7 的各列是第 8 階段在真實 GitHub Actions、npm 與使用者回報上的驗證（0009-S4，O3），不是自動測試。

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0005-S3（既有） | 兩份 manifest 的版號相同而且精確 | `upstream-config.test.mjs` 的「create-wxl/package.json is exactly the listing apart from the five placeholders」（C45） | RP1 | 測試檢查兩者相等且精確；值是不是 `3.1.1` 由閱讀 diff 確認。確認型 |
| 0005-S2（既有） | 真實的兩份 manifest 通過 X1～X9 | `publish.test.mjs` 的「passes when X1-X9 all hold」（fixture 複製真實的 manifest 與 CHANGELOG） | RP1 | X2 的版號相等、X7 的 P1 標記（spec 0005 的 P1：靶場 CHANGELOG 只留 `## [Unreleased]` 的那一行）都在。新條目放在 `## [Unreleased]` 之下由閱讀 diff 確認。確認型 |
| 0009-S4 | 第一次 CI 發布 | 真實的 tag、兩個 workflow run、Staged Packages、registry、`npm create wxl` | S8-01～S8-07 / AC-7 | 依 RP2～RP6；使用者回報的部分（MN7、MN2、MN1、MN3、RP5）逐字引用；每一次失敗的嘗試記錄它的 F 列 |

### 2026-11-13 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0005-S2、0005-S3（既有） | C45 與「passes when X1-X9 all hold」 | not measured：create-wxl 沒有 coverage provider。重現：`pnpm --dir create-wxl test` | RP1 | 值 `3.1.1` 與條目的位置由閱讀 diff 確認，不是測試 |
| 0009-S4 | 沒有自動測試 | — | S8-01～S8-07 / AC-7 | 依 O3，第 8 階段在 PR 合併之後於真實的 GitHub Actions 與 npm 上進行，證據是 run 與 registry，以及使用者回報的設定頁（OQ-028）。這一列在 AC-7 成立時補上實際的 run 與回報 |

## 給使用者（zh-TW）

第一次透過 CI 發布 create-wxl，同時是本 epic 的第 8 階段（AC-7）。每一步的確切設定值在 `docs/agents/release.md`；你要依序做這些事，並把括號裡的內容回報給我，我會逐字記進這張票：

1. 建立兩條 `v*` tag ruleset（MN7，D11），兩條都設成 Active：一條限制建立、bypass 只有你；一條限制更新與刪除、不設任何 bypass。（回報：兩條 ruleset 的 target、規則、bypass 清單與 enforcement status）
2. 建立 `npm` environment（MN2）：不設 reviewer，部署分支與 tag 只有一條規則，類型 tag、pattern `v*`。第 1、2 步都要在任何 `v*` tag 之前完成（D14）。（回報：reviewer 與那一條規則）
3. 推 tag 前兩天內，在 npmjs.com 建立 trusted publisher（六個欄位，而且是唯一的一組），同一次撤銷所有能發布 create-wxl 的 token，並用 `npm access list collaborators create-wxl` 確認只有你（MN1）。（回報：六個欄位、trusted publisher 的數量、「沒有任何剩下的 token 能發布 create-wxl」、collaborator 的輸出）
4. 確認 tag 名稱，並自己從這張票的 release PR 合併頁（或你自己的 `git log origin/main`）讀出 merge SHA 告訴我（RP2，D13）。
5. 確認 `publish-npm.yml` run 頁面上的 commit 等於那個 SHA，在 Staged Packages 確認只有一筆 `<V>` 的 entry、比對欄位，`release.yml` 也成功之後，用 2FA 核准（RP5）。（回報：entry 數量、看到哪些欄位、每一欄是否相符）
6. 最後設定「Require two-factor authentication and disallow tokens」（MN3）。（回報：選項文字）

我負責推單一 tag、替換 release notes、驗證 registry、provenance 與 `npm create wxl`。這張票在 PR 合併後仍維持 `review`，等 AC-7 成立才改成 `done`。

## Comments
- 2026-11-13, stage 5 (RP1), on a branch cut from T-0072's tip `10a7f46` while PR #88 ran its CI,
  to be rebased onto `main` once #88 lands:
  - Version 3.1.1: spec 0009 asks for at least a patch (`spec.en.md`, Further Notes, "The first CI
    release's version"). The release-note skill maps a `feat` commit to a MINOR bump; here every change is
    release infrastructure (CI, the gate, the manifest's metadata, documents), and creating and
    upgrading a range behave as in 3.1.0, so a security-focused patch (🔒) fits. The user confirms
    the tag name at RP2.
  - Both manifests' `version` → `3.1.1`; `CHANGELOG.md` gains the 3.1.1 entry under
    `## [Unreleased]`, generated with the project's `/tw-emoji-release-note`
    (`.claude/skills/tw-emoji-release-note/scripts/sanitize_release_note.py`), citing #82, #84,
    #86 and #88. The skill only produced the entry; no tag was created or pushed.
  - `pnpm --dir create-wxl test` → `Test Files 38 passed (38) / Tests 787 passed | 1 skipped
    (788)`.
  - `pnpm test --run` → `Test Files 137 passed (137) / Tests 4910 passed | 1 skipped (4911)`.
- 2026-11-13, stages 6 and 7 (RP1 only), run together on `ced130a`:
  - Stage 6 (workflow `wf_2b96e0a4-831`; local note
    `.proj.research/2026-11-13-T-0073-stage6-review.md`): Standards 22 findings (0 high, 6 medium),
    Spec 18 (0 high, 2 medium). STD-21's challenger failed and the finding is kept.
  - Stage 7 (workflow `wf_20ae2897-2f0`): report
    `.proj.specs/0009-npm-trusted-publishing/review/security-T-0073.md`. 9 candidates: C7
    confirmed (low), the rest false positives.
  - Fixed in the CHANGELOG entry: provenance said accurately, scoped to 3.1.1 on, with
    `dist.attestations` as a presence check and the package page for its contents (STD-01, STD-02,
    SPEC-07, C1, C2); 🔄 before 🔒, as the skill's format orders them (STD-04, SPEC-02); the
    comparison procedure cites #88 (SPEC-04); "最晚會在 X9 停下" (SPEC-05, C4); claims scoped to
    CI-published versions (SPEC-06, C3); "發布閘門" and no 維護者 (STD-13, STD-14, SPEC-08); the
    `--rebrand <名稱>` form (STD-17); a Changed line saying ranges gain `publish-npm.yml` and
    `release.md`, skipped outside upstream (STD-03, SPEC-09).
  - Fixed in `release.md` and traceability (clarifications inside D11 and D13, no new D-number):
    both MN7 rulesets "Active" (C7, confirmed); before tagging, the agent checks the SHA is on
    `main` and both manifests at it hold `<V>` (C6).
  - Fixed in this record: Context and Deliverable for revision 3.1 (SPEC-12); the zh-TW steps name
    what to report and point to `release.md` (SPEC-13, SPEC-14, STD-19); the test plan rows name
    the tests that run and what is read from the diff instead (STD-12, SPEC-15, STD-20); the
    coverage reason (STD-11); the Test plan section placed before 給使用者 (STD-21); the version
    rationale cites the spec, not the local handoff (STD-18).
  - Decisions left to the user, asked in the conversation of 2026-11-13 together with MN7 and MN2,
    before this PR merges: the version 3.1.1 against the skill's MINOR rule (STD-05, SPEC-01,
    SPEC-10). The entry's date is set to the tag day when the PR is rebased and merged (STD-16,
    SPEC-03).
  - Commits the entry covers (STD-06, SPEC-11): `git log v3.1.0..origin/main --oneline` at
    `42a0cba` lists #81 to #87; #88 is T-0072. Cited: #82 (X9), #84 (`repository`), #86 (the
    workflow), #88 (the procedure, D11–D14, the documents). Left out: #81, #83, #85, #87, which are
    ticket records only. Each cited PR's title was checked with `gh pr view <n> --json title`.
  - RP0 for this ticket (STD-07): it changes `create-wxl/package.json`, so its terminal outputs and
    CI are recorded before the PR merges, though O3 (b) makes AC-7 its stage 8.
  - Recorded, not changed: STD-09 (Chinese tables, as T-0069); STD-22 (two manifests by design,
    X2 and C45 hold them together); SPEC-18 (`review` while #88 was open: the branch was cut from
    T-0072's tip, and the rebase follows #88's merge); STD-08 and SPEC-17: the test plan table is
    listed to the user in the conversation of 2026-11-13.
- 2026-11-13, rebased onto `main` `6374a14` (after #88) with `git rebase --onto origin/main
  10a7f46`: `d0bd1e3` → `6553ae7`, `ced130a` → `21ba8e4`, `4df4e2c` → `035eca6`. At `035eca6`:
  `pnpm test --run` → `Test Files 137 passed (137) / Tests 4910 passed | 1 skipped (4911)`;
  `pnpm --dir create-wxl test` → `Tests 787 passed | 1 skipped (788)`.
- 2026-11-13, RP0 terminal part (surface: a terminal on macOS darwin arm64, Node v24.13.0, git
  2.54.0, at `035eca6`), after `pnpm --dir create-wxl install --frozen-lockfile`, in `create-wxl/`:
  `npm pkg get repository version` → MR1's object and `"3.1.1"`;
  `node scripts/prepare-dist.mjs && node scripts/check-publish.mjs` → `checkPublish failed: X3 (no
  local tag v<version> exists at HEAD)`, exit 1 (no tag exists yet, as RP2 requires).
  `create-wxl/dist/` and `create-wxl/LICENSE` were removed afterwards.
- 2026-11-13, MN7 and MN2 (S8-04, D11, D14). The user's report, quoted: 「設好了，用 3.1.1」. Before
  that, a read-only check had found neither: `gh api repos/<upstream>/rulesets` listed only
  "Protect main" (branch), and `gh api repos/<upstream>/environments` returned `total_count` 0. The
  repository's only admin, and the organisation's only member, is the upstream maintainer
  (`gh api repos/<upstream>/collaborators`, `gh api orgs/<owner>/members`), so the bypass role
  "Repository admin" is the upstream maintainer alone. Cross-checked afterwards with the same
  read-only API (OQ-028's GitHub option):
  - MN7, ruleset 27175520 "Release tags: creation": target `tag`, enforcement `active`, include
    `refs/tags/v*`, rules `creation`, bypass actors `RepositoryRole` 5 (admin), mode `always`.
    Equal to the expected value.
  - MN7, ruleset 27175527 "Release tags: no update or deletion": target `tag`, enforcement
    `active`, include `refs/tags/v*`, rules `update` and `deletion`, no bypass actor. Equal to the
    expected value.
  - MN2, environment `npm`: protection rules only `branch_policy` (no required reviewer, no wait
    timer); `deployment_branch_policy` `{ protected_branches: false, custom_branch_policies: true }`;
    deployment branch policies: one, `v*`, type `tag`. Equal to the expected value.
  - The version: the user chose 3.1.1 (「用 3.1.1」), settling stage 6's STD-05 and SPEC-01.
  - Still to come: MN1 (within two days before the tag), then RP2.
- 2026-11-13, MN1 (S8-04, U6, D14). The user's reports, quoted: 「MN1 完成」, then, asked whether
  the trusted publisher on npmjs.com matches the six fields below and is the only one: 「六欄都一致」.
  The six fields: provider GitHub Actions; owner `BrowserLaboratory`; repository `wxl-platform`;
  workflow file `publish-npm.yml`; environment `npm`; allowed actions stage on, direct publish
  off, dist-tag off. The agent cannot read the configuration (it does not sign in to npm), so the
  fields rest on the user's report. Read-only checks by the agent the same day:
  - The token in the agent's `~/.npmrc` no longer authenticates: `npm whoami` →
    `401 Unauthorized`; `npm access list collaborators create-wxl` → `E401`, so that command's
    output could not be taken from the agent's shell.
  - `npm view create-wxl maintainers` → one maintainer, `cxphoenix`.
  - `npm view create-wxl dist-tags` → `latest` `3.1.0`.
  - Not covered: the user did not paste `npm access list collaborators create-wxl` from a
    signed-in shell; the maintainer list above stands in for it. The tag must be pushed by
    2026-11-15, two days after this configuration.
