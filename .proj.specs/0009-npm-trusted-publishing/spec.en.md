# Spec 0009: npm trusted publishing — CI stages create-wxl and the upstream maintainer approves it

Status: revision 2 (2026-11-12). Revision 1 went to round 1 of adversarial review
(`review/round-1.md`); revision 2 applies `review/disposition.md` and the user's rulings U1–U7.

This spec is derived from `traceability.md`, which holds:

- the decisions (Q1–Q4, U1–U7, D1–D10) and the overridden contracts O1–O4;
- the seams 0009-S1 to S5 and the vocabulary;
- the new X9 (K1–K4, message XM) and the workflow (W1–W7);
- the manifest rule MR1, the release procedure (RP0–RP7), the user's steps (MN1–MN6) and the re-run
  table (F1–F5);
- the trust boundaries B1–B3, the document rules R2 and DS1–DS3, and rows K, W, M, D and S8.

Stage 1 is recorded in two local research notes: `.proj.research/2026-11-11-trusted-publishing-stage1.md`
and `.proj.research/2026-11-11-npm-trusted-publishing.md`.

## Problem Statement

create-wxl is the package behind `npm create wxl`. The upstream maintainer publishes it by hand,
running `npm publish` in `create-wxl/` with a long-lived npm token.

Both releases so far hit the same snag. At 3.0.0 (T-0029) and at 3.1.0 (T-0067) the token had
expired, and the publish gate's check X9 reported "the npm name is already maintained by someone
else", although the only maintainer was the publisher.

A token that lives on a laptop can also leak, and whoever holds it can publish a version that every
teacher's `npm create wxl` and `pnpm range:upgrade` would then run. npm itself is restricting tokens
that bypass 2FA from publishing directly.

## Solution

Pushing a release tag makes GitHub Actions stage create-wxl on npm through trusted publishing (OIDC).
No token is stored anywhere, and the staged version is not installable until the upstream maintainer
compares it with the run that made it and approves it on npmjs.com with 2FA.

The publish gate runs in that job. It also checks that the tagged commit is on `main`, and its X9 now
checks that it runs in upstream's publish workflow for the tagged version. A publish started anywhere
else stops before reaching npm, and says why. Old tokens are revoked when the trusted publisher is set
up, and the package refuses tokens once the first staged release is approved. Each version carries a
provenance statement naming the repository, workflow, tag and commit that built it.

## User Stories

1. As the upstream maintainer, I want pushing the release tag to stage create-wxl, so that I no longer
   keep or renew an npm token on my machine.
2. As the upstream maintainer, I want a staged version to wait for my 2FA approval, and to know what to
   compare before approving, so that nothing reaches teachers that I did not check.
3. As the upstream maintainer, I want a publish started from my terminal never to reach npm and to name
   the check that stopped it, so that I am not sent after a maintainer problem that does not exist.
4. As the upstream maintainer, I want the release steps, mine included, written in one place, so that
   the next release does not depend on remembering this one.
5. As a teacher, I want each create-wxl version to carry provenance naming upstream's repository,
   workflow, tag and commit, so that I can check where the code I run came from.
6. As a teacher who forked or created a range, I want the publish workflow in my range to do nothing,
   so that a tag I push never tries to publish anything.

## Implementation Decisions

- **The gate's X9 is rewritten (D1, D2).**
  - `checkPublish` runs X1–X8 exactly as spec 0005 specifies, then X9.
  - X9 reads an injected environment. A missing or non-object environment counts as empty, and only
    string values count as set.
  - It holds when four conditions hold, checked in order: K1, it runs in GitHub Actions; K2, the
    repository is upstream; K3, the workflow reference is upstream's `publish-npm.yml` at tag `v<V>`;
    K4, an OIDC token can be requested.
  - A failure throws one line. It starts with `X9 (`, names the first failing condition, its fixed
    cause text and the value seen (JSON, or `unset`), and ends with a fixed closing sentence saying how
    create-wxl is published. Traceability gives the exact text.
  - X9 no longer asks npm for maintainers or the logged-in user. `checkPublish` loses those two
    parameters, and the npm helpers and their tests are removed. The check script passes the process
    environment.
- **X9 is a guard, not a control (D8).** The environment can be faked. What stops an unauthorised
  publish is the trusted publisher configuration, the environment's tag rule, the approval and refusing
  tokens (B1, B2).
- **A new workflow is the only publisher (D3).**
  - Trigger and job: `publish-npm.yml` runs on a pushed `v*` tag, one run at a time. It has one job,
    which runs only in upstream (the same comparison `release.yml` uses) and in the GitHub environment
    `npm`.
  - Permissions: the workflow grants nothing at the top level. The job gets read access to contents
    and the right to request an OIDC token.
  - Steps, in order:
    1. Check out a full clone at the tag without persisting credentials.
    2. Set up pnpm, and Node 24 without a package-manager cache, using the same pinned actions as
       `release.yml`.
    3. Install one exact npm 11 release at or above 11.15.0, the first with `npm stage publish`.
    4. Check that the tag's commit is an ancestor of `main` (U7).
    5. Install only create-wxl's runtime dependencies from its lockfile, without install scripts.
    6. Run the publish gate.
    7. Stage.
  - What it never does: use a secret or token, set environment variables at workflow or job level,
    publish directly or move a dist-tag, pass a provenance flag (provenance is automatic), or restore
    a cache.
- **The gate runs explicitly (D5).** npm's documentation does not say whether `npm stage publish` runs
  `prepublishOnly`, so the job runs the gate as its own step before staging. X1–X8 run on a full clone
  detached at the annotated tag. The steps before it write only ignored or outside-repository paths,
  so the clean-tree check holds.
- **The manifest names its repository (D4, U1).**
  - create-wxl's manifest gains `repository`, placed right after `license`: type `git`, the root
    manifest's repository URL, and directory `create-wxl`. npm requires it to match the workflow's
    repository exactly.
  - This spells the upstream slug in a file that spec 0004 keeps free of it. The spec overrides that
    rule explicitly (O1, O2): the line joins 0004's rewrite list, and the upstream guard exempts that
    one line.
  - A fork's rebrand rewrites the line along with the root manifest, and the manifest test compares
    the two, so it still passes.
- **The release procedure is documented (D7, U5)** in a new `docs/agents/release.md`, marked as
  applying to upstream only and linked from `AGENTS.md`. It holds the release steps:
  - Every code ticket checks the package and the gate on a terminal before merging.
  - The release change lands, with its CHANGELOG entry generated by the release-note skill.
  - The agent pushes the annotated tag alone, only after the user confirms it.
  - CI makes the GitHub Release and stages the package.
  - The agent replaces the release notes with the CHANGELOG entry.
  - The user compares the staged entry with the run (one entry; the run succeeded; repository,
    workflow, ref, commit and shasum as far as the page shows them) and approves.
  - The agent verifies the registry, the provenance statement's contents and a fresh `npm create wxl`.

  It also holds the user's one-time and per-release steps:
  - Create the trusted publisher (stage only, environment `npm`) no more than two days before the
    first tag, and revoke every publishing token in the same sitting.
  - Restrict the `npm` environment to `v*` tags, with no reviewer.
  - After the first approval, set the package to require 2FA and disallow tokens.
  - Approve or reject each release.
  - Delete the trusted publisher before renaming the organisation or repository.
  - Recreate the trusted publisher if it expired.

  The file never spells the upstream slug.
- **Failures and re-runs (D6).**
  - Re-running is allowed only when staging did not run or failed, nothing is staged, and the cause is
    outside the repository (registry, network, a missing or expired npm or GitHub setting).
  - A cause inside the repository ships as the next patch.
  - A rejected tag is never re-run.
  - A staged version waits for `release.yml` to succeed.
  - Tags are never moved. A tag that never reached npm still counts as an upstream release for
    ADR-0009.
- **Timing (D10, U4).** No `v*` tag goes out while the epic's code tickets are landing. The epic's last
  ticket is the first CI release, and its stage 8 is AC-7 (O3).
- **Specs 0005 and 0004 record the change (DS1–DS3).**
  - 0005 gains revision 2.4: X9, D4, the 0005-S2 seam, C42, the manifest listing and the Seams note,
    plus its spec's sentences on X9, B2 and "cannot run in CI".
  - 0004 gains a note for O1.
  - ADR-0009's reference to 0005 B2, OQ-021 and OQ-022 gain notes.
  - OQ-027 records what npm's Staged Packages tab shows before approval.
  - The unmerged T-0068 branch's revision 2.4 of 0005 is not landed.

## Trust Boundaries and Threat Model

- **B1 — npm ↔ upstream's Actions job, through OIDC.**
  - Protects: only upstream's `publish-npm.yml`, deploying to environment `npm` from a `v*` tag, can
    stage create-wxl. Nothing becomes installable without the upstream maintainer's 2FA approval after
    comparing the staged entry with its run. Once tokens are revoked and refused, a leaked token cannot
    publish.
  - Does not protect against anyone with push access, the agent included, pushing a `v*` tag at a
    commit on `main` whose workflow or code was changed. The comparison shows the commit, not its
    content.
  - Does not protect against code loaded in the job requesting an OIDC token for that job. Installing
    only runtime dependencies without scripts narrows this.
  - The upstream maintainer can still publish directly with interactive 2FA. That is an accepted
    residual risk.
- **B2 — the upstream maintainer's machine ↔ npm.**
  - `npm publish` and `pnpm publish` stop at the first failing check before reaching npm.
  - This is not a control: `--ignore-scripts`, or a terminal `npm stage publish`, may skip the gate.
    Both still need a credential that the token revocation and the approval stand in front of.
- **B3 — upstream ↔ a fork or a teacher's range.**
  - The workflow and the release document ship in ranges, but the job is skipped outside upstream.
    npm's trusted publisher names upstream only, and `create-wxl/` is not in the release archive.
  - The evidence is static; no fork run is part of stage 8.
- Outside the threat model: GitHub, npm and their OIDC issuance; the registry serving npm itself;
  anyone with admin rights on the repository or the npm account.

## Acceptance Criteria

- **AC-1** With X1–X8 holding:
  - `checkPublish` resolves when K1–K4 hold.
  - For each input of rows K02–K05 it throws `checks` `['X9']` with message XM, naming that row's
    condition and the value seen as traceability specifies.
  - With several conditions violated, only the first in K1–K4 order appears, and the others' cause
    texts are absent.
  - `CHECK_EXPLANATIONS.X9` and the default message are as K13 states.

  (K01–K05, K07, K13)
- **AC-2** With an environment that is empty, missing, `null` or not an object, X9 names K1 with
  `unset`, and its message ends with the closing sentence with the version substituted. (K06)
- **AC-3** Regression and wiring:
  - An X1–X8 violation is thrown before X9 is checked, and each of X1–X8 still fails as 0005's C42 says.
  - Extra `npmView`/`npmWhoami` arguments change nothing.
  - The wiring passes `process.env`; `publish-io.mjs` exports exactly the four functions K11 lists;
    none of the three files K11 names references npm; the removed exports have no tests.
  - On the CI checkout shape (a full clone detached at an annotated tag, `origin/main` present), X3, X4,
    X6 and X7 hold.

  (K08–K12)
- **AC-4** `publish-npm.yml` satisfies W1–W7, verbatim where traceability says so:
  - triggers;
  - one upstream-only job;
  - permissions, concurrency and environment;
  - pinned actions with their exact inputs;
  - an npm 11.y ≥ 11.15 as step four;
  - exactly eight steps with their commands;
  - none of the banned strings, keys or environment blocks.

  The upstream-only test and the rebrand invariant test cover the new workflow as W08 and W09 list.
  (W01–W09)
- **AC-5** The manifest:
  - create-wxl's manifest has `repository` at MR1's position, with MR1's keys and values, its URL
    equal to the root manifest's, and otherwise still equals 0005's listing.
  - The guard reports nothing for that one line, and still reports the slug on any other line of the
    file.

  (M01, M02)
- **AC-6** Documents:
  - `docs/agents/release.md` and `AGENTS.md` hold every R2 string, and `release.md` does not spell the
    upstream slug.
  - Specs 0005 and 0004, ADR-0009, OQ-021, OQ-022 and the new OQ-027 carry DS1–DS3's changes, naming
    0009.

  (D01, D02)
- **AC-7** Stage 8 of the epic's last ticket, the first CI release (RP1–RP7, U4). The rows below are
  met by the first `v<V>` that stages successfully:
  - its `publish-npm.yml` run, main-ancestry step and gate step conclude success, and `npm stage
    publish` exits 0;
  - the user reports exactly one staged entry, which fields the Staged Packages tab shows, and that
    each shown field matched, while `latest` is still the previous version;
  - after approval, `latest` and `version` are `<V>`, the provenance statement names the upstream
    repository, `.github/workflows/publish-npm.yml`, `refs/tags/v<V>` and the tag's commit, and a fresh
    `npm create wxl` records `<V>` and that commit;
  - the record quotes the user's report of the trusted publisher's six fields, the token revocation,
    and the Publishing access option selected; AC-7 is not met until that report exists;
  - every earlier failure is recorded with its F-row, and a rejection or a `release.yml` failure, if
    one occurs, follows F3 or F4.

  (S8-01–S8-07)
- **AC-8** Each code ticket's stage 8, before its PR merges, records two terminal outputs (RP0):
  `npm pack --dry-run` listing the package with MR1's `repository`, and `check-publish.mjs` exiting 1
  with a named check, without contacting npm. (S8-08)

## Testing Decisions

- Tests check behaviour at the seams, not the helpers inside them:
  - `checkPublish`'s thrown check and message (0009-S1);
  - the parsed workflow and its raw text (0009-S2);
  - the manifest and the guard (0009-S3);
  - the release document (0009-S5).
- 0009-S1 extends 0005's publish tests (`create-wxl/test/publish.test.mjs`): a temporary repository
  with lightweight and annotated tags, `ls-remote` stubbed. The X1–X8 cases stay as they are, run with
  an `env` that satisfies K1–K4 so their outcomes are unaffected. K11 is a static read of three files.
  T-0068's branch has tests for X9's old causes; only their structure is reused.
- 0009-S2 extends `tests/unit/workflows/upstream-only-jobs.test.ts`, which already parses workflow
  YAML and pins upstream-only `if:` comparisons, and T52 in `tests/unit/scripts/fork-init.test.ts`.
  `toolchain-parity.test.ts` stays about the challenge-build toolchain and is not changed.
- 0009-S3 extends `create-wxl/test/upstream-config.test.mjs` (0005's C45) and
  `tests/unit/scripts/upstream-guard.test.ts`.
- 0009-S5 follows 0005's U-items: strings checked after collapsing whitespace.
- 0009-S4 runs only in the release ticket, with the user approving. Staging is safe to try for real:
  nothing is installable until approved, and a wrong staged version is rejected (F3).

## Out of Scope

- Publishing anything other than create-wxl, and any change to `release.yml` or the site's release
  asset. OQ-019's release-notes question stays open; RP4 keeps replacing the notes by hand.
- A dry run or test publish on pull requests: npm offers no staging target apart from the real package.
- Required reviewers on the `npm` environment (Q4).
- Forks publishing their own create-wxl. Forks are skipped (B3), and the package stays upstream's.
- Splitting the gate and the staging into separate jobs. npm's documentation does not cover staging a
  prepared tarball, and the OIDC right would still sit in the staging job.
- Auditing create-wxl's dependencies and the pinned actions beyond keeping today's pins.

## Further Notes

- **npm facts this spec relies on**, read from npm's documentation on 2026-11-11 (the research note
  lists the pages):
  - trusted publishing needs npm ≥ 11.5.1 and Node ≥ 22.14.0;
  - staging needs npm ≥ 11.15.0;
  - the job needs `id-token: write`, and only GitHub-hosted runners are supported;
  - the trusted publisher names the workflow file with its extension, and `repository.url` must match
    exactly;
  - a configuration expires after two days without a successful first publish;
  - a trusted publisher can be limited to staging;
  - approval and rejection always need 2FA;
  - provenance is automatic for a public repository and a public package.
- **Not in npm's documentation, so not relied on:**
  - whether `npm stage publish` runs `prepublishOnly`;
  - how long a staged version is kept;
  - what the Staged Packages tab shows before approval (OQ-027);
  - whether staging alone counts as the first successful publish (MN6 covers both answers);
  - whether `npm whoami` answers inside an OIDC job.
- **The package is built twice.** `npm stage publish` packs through `prepack`, which rebuilds `dist/`
  after the gate checked it. The inputs (HEAD, the engine, the same Node) are the same, so the content
  is the same. The gate checks a build, not the uploaded bytes.
- **Ticket ids.** T-0068 is taken by the unmerged branch `tickets/T-0068/x9-npm-login-message`.
  Stage 4 records it as superseded by this epic and numbers this epic's tickets after it.
- **The first CI release's version** is chosen by the release ticket. This epic changes code that ships
  in the package, so it is at least a patch release.
