# Spec 0009: npm trusted publishing — CI stages create-wxl on npm and the upstream maintainer approves it

Status: revision 3 (2026-11-12). Two rounds of adversarial review have run:

- Round 1 found one P0, resolved in revision 2.
- Round 2 found no P0 (`review/round-2.md`), so the stage 3 gate is met.

Revision 3 applies round 2's disposition (`review/disposition-2.md`) and the user's rulings U8–U10.
Two rounds is the ceiling, so revision 3 is self-checked rather than reviewed again.

Derived from `traceability.md`, which holds:

- the decisions (Q1–Q4, U1–U10, D1–D10) and the overridden contracts O1–O5;
- the seams 0009-S1 to S5 and the vocabulary;
- the new X9 (K1–K4, message XM), the workflow (W1–W8) and the manifest rules MR1–MR2;
- the release procedure (RP0–RP7), the user's steps (MN1–MN7) and the failure table (F1–F7);
- the trust boundaries B1–B3, the document rules R2 and DS1–DS3, and rows K, W, M, D and S8.

Stage 1 is recorded in two local research notes: `.proj.research/2026-11-11-trusted-publishing-stage1.md`
and `.proj.research/2026-11-11-npm-trusted-publishing.md`.

## Problem Statement

create-wxl is the package behind `npm create wxl`. The upstream maintainer publishes it by hand,
running `npm publish` in `create-wxl/` with an npm login kept on their machine.

Both releases so far stumbled on that login:

- **3.0.0 (T-0029).** The publish gate passed, and then the upload failed with `E404`, because the
  token had expired and the gate does not check the login.
- **3.1.0 (T-0067).** The login had expired again, and the gate's check X9 reported "the npm name is
  already maintained by someone else", although the only maintainer was the publisher.

A credential that lives on a laptop can also leak. Whoever holds it can publish a version that every
teacher's `npm create wxl` and `pnpm range:upgrade` would then run. npm itself is restricting tokens
that bypass 2FA from publishing directly.

## Solution

Pushing a release tag makes GitHub Actions stage create-wxl on npm through trusted publishing (OIDC).
No token is stored anywhere. The staged version is not installable until the upstream maintainer has
compared it with the run and the commit they confirmed, and approved it on npmjs.com with 2FA.

The publish gate runs in that job, after a guard that the tagged commit is on `main`. The gate's X9
now checks that it runs in upstream's publish workflow for the tagged version, so a publish started
anywhere else stops before reaching npm and says why.

The npm and GitHub settings take over what the old login did:

- npm accepts only that workflow, in an environment that deploys from `v*` tags.
- A tag ruleset keeps those tags from moving.
- Old tokens are revoked when the trusted publisher is set up.
- The package refuses tokens once the first staged release is approved.

Each version carries a provenance statement naming the repository, workflow, tag and commit that built
it.

## User Stories

1. As the upstream maintainer, I want pushing the release tag to stage create-wxl on npm, so that I no
   longer keep or renew an npm login for publishing.
2. As the upstream maintainer, I want a staged version to wait for my 2FA approval, and to know exactly
   what to compare first, so that nothing reaches teachers that I did not check.
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
  - X9 reads an injected environment. A missing, non-object or array environment counts as empty.
    Only own string properties count as set.
  - It holds when four conditions hold, checked in order: K1, it runs in GitHub Actions; K2, the
    repository is upstream; K3, the workflow reference is upstream's `publish-npm.yml` at tag `v<V>`;
    K4, an OIDC token can be requested.
  - A failure throws one line. It starts with `X9 (`, names the first failing condition, its fixed
    cause text and the value seen (JSON, or `unset`), and ends with a fixed closing sentence saying how
    create-wxl is published.
  - X9 no longer asks npm for maintainers or the logged-in user. `checkPublish` loses those two
    parameters, and the npm helpers and their tests are removed.
- **Guards and controls (D8).**
  - X9 and the ancestry step guard against mistakes. They run from the tagged commit's own workflow,
    so they cannot stop a deliberate change.
  - The controls are npm's trusted publisher configuration, the environment's tag rule, the tag
    ruleset, the comparison and approval, and refusing tokens (B1, B2).
- **A new workflow is the only publisher (D3).**
  - **Trigger and job.** `publish-npm.yml` runs on a pushed `v*` tag, one run at a time. It has one
    job, which runs only in upstream (the same comparison `release.yml` uses) and in the GitHub
    environment `npm`, on a GitHub-hosted runner.
  - **Permissions.** The workflow grants nothing at the top level. The job gets read access to
    contents and the right to request an OIDC token.
  - **Steps, exactly eight, in order:**
    1. Check out a full clone at the tag, without persisting credentials.
    2. Set up pnpm.
    3. Set up Node 24, without a package-manager cache.
    4. Install one exact npm 11 release at or above 11.15.0, the first with `npm stage publish`.
    5. Check that the commit is an ancestor of `origin/main` (U7).
    6. Install only create-wxl's runtime dependencies from its lockfile, without install scripts.
    7. Run the publish gate.
    8. Stage on npm.
  - **What it never does.** Use a secret, token or npm configuration override. Set environment
    variables. Publish directly or move a dist-tag. Pass a provenance flag (provenance is automatic).
    Restore a cache. Carry any key outside a closed set.
  - The actions use the same pins, with the same version comments, as `release.yml`.
- **The gate runs explicitly (D5).** npm's documentation does not say whether `npm stage publish` runs
  `prepublishOnly`, so the job runs the gate as its own step. X1–X8 run on a full clone detached at
  the tag. The steps before them write only ignored or outside-repository paths, so the clean-tree
  check holds.
- **The manifest names its repository (D4, U1, U9).**
  - create-wxl's manifest gains `repository`, placed right after `license` and written one key per
    line: type `git`, the root manifest's repository URL, and directory `create-wxl`. npm requires the
    URL to match the workflow's repository exactly. The repository tracks no `.npmrc`.
  - This spells the upstream slug in a file that spec 0004 keeps free of it. The spec overrides that
    rule explicitly (O1, O2): the line becomes a third kind of location, rewritten only by a fork's
    rebrand. The upstream guard exempts exactly that line, compared verbatim.
  - In a GitHub fork, fork-init's default mode leaves the line pointing at upstream. The fork-init
    skills and the README say so.
  - create-wxl's own tests run only upstream. On a converted fork, the manifest test already fails on
    the version, and this spec does not change that.
- **The release procedure is documented (D7, U5, U8)** in a new `docs/agents/release.md`, marked as
  applying to upstream only and linked from `AGENTS.md` and `CONTRIBUTE.md`. It holds:
  - **Each code ticket's stage 8.** On a terminal: the manifest's repository and the gate's refusal.
    In CI: the workflow tests.
  - **The release change.** It lands with its CHANGELOG entry from the release-note skill, which only
    writes the entry.
  - **The tag.** The user confirms the tag name and the merge commit's SHA. The agent checks the tag
    is new, then pushes that single tag. It never uses `git push --tags`, overriding the user's general
    rule in this repository, and it pushes one tag at a time.
  - **CI.** It makes the GitHub Release and stages on npm. The agent replaces the release notes with
    the CHANGELOG entry.
  - **The user's check and approval.** Exactly one staged entry; both runs succeeded; every field npm
    shows matches the run and the confirmed SHA, with at least one field compared or else the user
    decides. Then the user approves.
  - **The agent's verification, with bounded retries.** The registry, the provenance statement's
    contents, and a fresh `npm create wxl`.
  - **The user's one-time and per-release steps,** in order: a tag ruleset for `v*`; the `npm`
    environment restricted to `v*` tags with no reviewer; the trusted publisher (its six fields, the
    only one) no more than two days before the first tag, with every publishing token revoked in the
    same sitting; after the first approval, require 2FA and disallow tokens; approve or reject each
    release; delete the trusted publisher before a rename; recreate it, re-reporting its fields, if it
    expired.
  - **The failure table.** Re-run only when nothing was staged on npm and the cause is outside the
    commit; a cause in the commit is fixed by a new code ticket and ships as the next patch; a staged
    version failing the check is rejected; approval waits for `release.yml`; a version failing the
    post-approval checks is deprecated and followed by the next patch; an approved or rejected tag is
    never re-run.
  - Tags are never moved or deleted. A tag that never became installable on npm still counts as an
    upstream release for ADR-0009, and GLOSSARY says so.

  The file never spells the upstream slug.
- **Timing and ticket states (D10, U4, O3, O4).**
  - No `v*` tag goes out while the epic's code tickets are landing.
  - The epic's last ticket is the first CI release. Its PR merges after its stages 6–7, and its stage
    8 is AC-7.
  - It stays `review` until AC-7 holds, then becomes `done`. Close-out waits for it.
  - The npm pages' evidence is the user's report. A new open question, OQ-028, records that harness.
- **Other specs record the change (DS1–DS3).**
  - 0005 gains revision 2.4, covering X9, D4, the 0005-S2 seam, C42, C43, C45, the listing and the
    Seams note, plus its spec's sentences on X9, B2, CI, `main` and asking first. 0009's ids carry a
    "0009's" prefix there.
  - 0004 gains a note for O1. The fork-init skills and READMEs name the kept line.
  - ADR-0009, 0006's B2, OQ-021 and GLOSSARY's 設定紀錄 gain notes.
  - OQ-027 asks what the Staged Packages tab shows; OQ-028 records the stage 8 harness.
  - The unmerged T-0068 branch's revision 2.4 of 0005 is not landed.

## Trust Boundaries and Threat Model

- **B1 — npm ↔ upstream's Actions job, through OIDC.**
  - **Protects.** Only upstream's `publish-npm.yml`, deploying to environment `npm` from a `v*` tag the
    upstream maintainer created, can stage create-wxl, and it can only stage. Nothing becomes
    installable without the upstream maintainer's 2FA approval after comparing the staged entry with
    the run and the SHA they confirmed. Once tokens are revoked and refused, a leaked token cannot
    publish.
  - **Does not protect against a tag at any commit.** Anyone holding the upstream maintainer's push
    credentials, the agent included, can push a `v*` tag at any commit, and that commit's own workflow
    runs, guards and all. The commit comparison against the confirmed SHA is what catches this.
  - **Does not protect against code in the job.** Any code the job runs can request an OIDC token:
    the actions, pnpm, Node, the npm CLI, create-wxl's runtime dependencies and the repository's code.
    Installing without devDependencies or scripts removes only those two.
  - **Accepted residual risk.** The upstream maintainer can still publish directly with interactive
    2FA.
- **B2 — the upstream maintainer's machine ↔ npm.**
  - **Protects.** `npm publish` and `pnpm publish` stop at the first failing check before reaching
    npm.
  - **Not a control.** `--ignore-scripts`, or a terminal `npm stage publish`, may skip the gate. Both
    still need a credential that has been revoked and refused, and an unexpected staged entry is
    rejected.
- **B3 — upstream ↔ a fork or a teacher's range.**
  - **Protects.** The workflow and the release document reach ranges, at creation and through
    `pnpm range:upgrade`, but the job is skipped outside upstream. npm's trusted publisher names
    upstream only, and `create-wxl/` is not in the release archive.
  - **Does not protect.** The evidence is static; no fork run is part of stage 8.
- **Outside the threat model:** GitHub, npm and their OIDC issuance; the registry serving npm itself;
  anyone with admin rights on the repository or the npm account.

## Acceptance Criteria

- **AC-1** With X1–X8 holding:
  - `checkPublish` resolves when K1–K4 hold.
  - For each input of rows K02–K05 it throws `checks` `['X9']` with message XM, naming that row's
    condition and the value seen, as traceability specifies.
  - With several conditions violated, only the first in K1–K4 order appears.
  - `CHECK_EXPLANATIONS.X9` and the default message are as K13 states.

  (K01–K05, K07, K13)
- **AC-2** For each environment of K06 (empty, missing, `null`, a string, an array, an object
  inheriting the variables), X9 names K1 with `unset`. Its message ends with the closing sentence,
  with the version substituted. (K06)
- **AC-3** The gate keeps its old behaviour and drops npm:
  - an X1–X8 violation is thrown before X9, and each of X1–X8 still fails as 0005's C42 says;
  - extra `npmView`/`npmWhoami` arguments change nothing;
  - the wiring passes `process.env`;
  - `publish-io.mjs` exports exactly K11's four functions;
  - none of K11's files contains K11's strings, and the removed exports have no tests;
  - on both CI checkout shapes of K12, X3, X4, X6 and X7 hold.

  (K08–K12)
- **AC-4** `publish-npm.yml` satisfies W1–W8, verbatim where traceability says so: the triggers, one
  upstream-only job, permissions, concurrency, environment, pinned actions with their comments and
  exact inputs, npm 11.y ≥ 11.15 as step 4, exactly eight steps with their commands, none of the banned
  strings or keys, and closed key sets. The upstream-only and rebrand-invariant tests cover it as W09
  and W10 list, and the ancestry command behaves as W12 states. (W01–W10, W12)
- **AC-5** The manifest and its checks:
  - create-wxl's manifest has `repository` as MR1, in position, keys, values and the five lines, with
    the URL equal to the root manifest's; it otherwise still equals 0005's listing;
  - after a rebrand the URL still equals the root's;
  - the guard exempts only that line and reports every other slug in the file, as M02 lists;
  - no `.npmrc` is tracked.

  (W11, M01–M03)
- **AC-6** Documents:
  - `release.md`, `AGENTS.md` and `CONTRIBUTE.md` meet every R2 line and string check, and
    `release.md` does not spell the upstream slug;
  - each place DS1–DS3 names carries its change, naming 0009, judged at stage 6.

  (D01, D02)
- **AC-7** Stage 8 of the release ticket (RP1–RP7, U4), met by the first `v<V>` that is approved and
  passes RP6:
  - its `publish-npm.yml` run, ancestry step and gate step conclude success, and `npm stage publish`
    exits 0;
  - the user reports one staged entry in all, for `<V>`; both runs succeeded; which fields were shown
    and that each matched. `latest` is still the previous version. The fields go into OQ-027;
  - RP6 (a)–(c) hold;
  - the release ticket quotes the user's report of MN1's six fields, the single trusted publisher,
    the token revocation, the collaborator list, MN2's rule, MN7's ruleset and MN3's option, each
    equal to its expected value. AC-7 is not met before every item is reported;
  - every earlier attempt is recorded with its F-row, and F3, F4 or F6, if they occur, are recorded
    as S8-06 and S8-07 say.

  (S8-01–S8-07)
- **AC-8** Each code ticket's stage 8, before its PR merges, records RP0's three outputs:
  - `npm pkg get repository` printing MR1's object;
  - `check-publish.mjs` exiting 1 with a named check;
  - the PR's CI passing the workflow tests.

  (S8-08)

## Testing Decisions

- Tests check behaviour at the seams, not the helpers inside them:
  - `checkPublish`'s thrown check and message (0009-S1);
  - the parsed workflow, its raw text and the ancestry command (0009-S2);
  - the manifest, the guard and the tracked paths (0009-S3);
  - the release documents (0009-S5).
- **0009-S1** extends 0005's publish tests (`create-wxl/test/publish.test.mjs`). The X1–X8 cases stay
  as they are, run with an `env` satisfying K1–K4. K11 is a static read. T-0068's branch has tests
  for X9's old causes; only their structure is reused.
- **0009-S2** extends three tests:
  - `tests/unit/workflows/upstream-only-jobs.test.ts`;
  - T52 in `tests/unit/scripts/fork-init.test.ts`;
  - the raw-text comparison that `fork-template-parity.test.ts` already does for pins.

  `toolchain-parity.test.ts` stays about the challenge-build toolchain.
- **0009-S3** extends `create-wxl/test/upstream-config.test.mjs` (0005's C45) and
  `tests/unit/scripts/upstream-guard.test.ts`.
- **0009-S5** lives in `create-wxl/test/`, so it never enters a range. It follows 0005's U-items: line
  checks on trimmed lines, and string checks after collapsing whitespace.
- **0009-S4** runs only in the release ticket, with the user approving. Staging on npm is safe to try
  for real: nothing is installable until approved, and a wrong staged version is rejected.

## Out of Scope

- Publishing anything other than create-wxl, and any change to `release.yml` or the site's release
  asset. OQ-019's release-notes question stays open, and RP4 keeps replacing the notes by hand.
- A dry run or test publish on pull requests: npm offers no staging target apart from the real
  package.
- Required reviewers on the `npm` environment (Q4).
- Forks publishing their own create-wxl. Forks are skipped (B3), and the package stays upstream's.
- Splitting the gate and the staging into separate jobs. npm's documentation does not cover staging a
  prepared tarball, and the OIDC right would still sit in the staging job.
- Making fork-init's default mode rewrite `create-wxl/package.json` (U9).
- Auditing create-wxl's dependencies and the pinned actions beyond keeping today's pins.

## Further Notes

- **npm facts this spec relies on.** Read from npm's documentation on 2026-11-11; the research note
  lists the pages.
  - Trusted publishing needs npm ≥ 11.5.1 and Node ≥ 22.14.0, and staging needs npm ≥ 11.15.0.
  - The job needs `id-token: write`, and only GitHub-hosted runners are supported.
  - The trusted publisher names the workflow file with its extension, and `repository.url` must match
    exactly.
  - A configuration expires after two days without a successful first publish.
  - A trusted publisher can be limited to staging.
  - Approval and rejection always need 2FA.
  - Provenance is automatic for a public repository and a public package.
- **Not in npm's documentation, so not relied on:**
  - whether `npm stage publish` runs `prepublishOnly`, or prints a shasum;
  - how long a staged version is kept;
  - what the Staged Packages tab shows before approval (OQ-027);
  - whether a staged-then-approved version carries provenance (RP6 checks it);
  - whether staging alone counts as the first successful publish (MN6 covers both answers);
  - whether a rejected version number can be reused (never attempted);
  - whether `npm whoami` answers inside an OIDC job.
- **The package is built twice.** `npm stage publish` packs through `prepack`, which rebuilds `dist/`
  after the gate checked it. The inputs (HEAD, the engine, the same Node) are the same, so the content
  is the same. The gate checks a build, not the uploaded bytes.
- **Ticket ids.** T-0068 is taken by the unmerged branch `tickets/T-0068/x9-npm-login-message`. Stage
  4 records it as superseded by this epic and numbers this epic's tickets after it.
- **The first CI release's version** is chosen by the release ticket. This epic changes code that ships
  in the package, so it is at least a patch release.
