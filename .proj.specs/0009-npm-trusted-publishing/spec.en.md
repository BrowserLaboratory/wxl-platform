# Spec 0009: npm trusted publishing — create-wxl is staged by CI and approved by a maintainer

Status: revision 1 (2026-11-11), before adversarial review. Derived from `traceability.md`, which
holds the decisions (Q1–Q4, D1–D8), the seams 0009-S1 to S4, the vocabulary, the new X9 (K1–K4),
the workflow (W1–W8), the manifest rule R1, the release procedure (P1–P6), the user's steps (N1–N4),
the trust boundaries B1–B3 and rows K, W, M, D and S.

Stage 1 is recorded in the local research notes `.proj.research/2026-11-11-trusted-publishing-stage1.md`
and `.proj.research/2026-11-11-npm-trusted-publishing.md`.

## Problem Statement

create-wxl, the package behind `npm create wxl`, is published by hand: the maintainer runs
`npm publish` in `create-wxl/` with a long-lived npm token. Both releases so far hit the same snag.
At 3.0.0 (T-0029) and at 3.1.0 (T-0067) the token had expired, and the publish gate's check X9
reported it as "the npm name is already maintained by someone else", although the only maintainer was
the publisher. A token that lives on a laptop can also leak, and whoever holds it can publish a
version that every teacher's `npm create wxl` and `pnpm range:upgrade` would then run. npm itself is
restricting tokens that bypass 2FA from publishing directly.

## Solution

Pushing a release tag makes GitHub Actions stage create-wxl on npm through trusted publishing (OIDC):
no token is stored anywhere, and the staged version is not installable until the maintainer approves
it on npmjs.com with 2FA. The publish gate runs in that job; its X9 now checks that it runs in
upstream's publish workflow for the tagged version, so a publish started anywhere else stops with a
reason instead of a misleading one. Once the first staged release is approved, the package refuses
token publishing altogether. Each version carries a provenance attestation linking it to the commit
and workflow that built it.

## User Stories

1. As the maintainer, I want pushing the release tag to stage create-wxl, so that I no longer keep or
   renew an npm token on my machine.
2. As the maintainer, I want a staged version to wait for my 2FA approval, so that nothing reaches
   teachers that I did not look at.
3. As the maintainer, I want a publish started from my terminal to stop with the reason that
   publishing happens only in CI, so that I am not sent after a maintainer problem that does not exist.
4. As the maintainer, I want the release steps, mine included, written in one place, so that the next
   release does not depend on remembering this one.
5. As a teacher, I want each create-wxl version to carry provenance pointing at upstream's repository
   and commit, so that I can check where the code I run came from.
6. As a teacher who forked or created a range, I want the publish workflow in my range to do nothing,
   so that a tag I push never tries to publish anything.

## Implementation Decisions

- **The gate's X9 is rewritten (D1, D2).** `checkPublish` runs X1–X8 exactly as spec 0005 specifies,
  then X9. X9 reads an injected environment object and holds when four conditions hold, checked in
  order: K1 it runs in GitHub Actions; K2 the repository is upstream (`UPSTREAM_SLUG`, exact); K3 the
  workflow reference is upstream's `publish-npm.yml` at tag `v<V>`; K4 an OIDC token can be requested.
  A failure names the first condition that does not hold, with the value seen, and ends with the
  sentence that create-wxl is published only by upstream's publish workflow on a `v<V>` tag and then
  approved on npmjs.com. X9 no longer asks npm for the package's maintainers or the logged-in user:
  `checkPublish` loses those two parameters and their real implementations are removed; the check
  script passes the process environment.
- **X9 is a guard, not a control (D8).** The environment can be faked; what stops an unauthorised
  publish is npm's trusted publisher configuration, the approval, and refusing tokens (B1, B2).
- **A new workflow is the only publisher (D3).** `publish-npm.yml` runs on a pushed `v*` tag, in one
  job that runs only in upstream (the same comparison `release.yml` uses) and in the GitHub environment
  `npm`. The workflow grants nothing at the top level; the job gets read access to contents and the
  right to request an OIDC token. It checks out the tag, sets up pnpm and Node 24 with the same pinned
  actions as `release.yml`, installs one exact npm release at or above 11.15.0 (the first with
  `npm stage publish`), installs create-wxl's own dependencies from its lockfile, runs the gate, and
  stages. It uses no secret and no token, never publishes directly or moves a dist-tag, passes no
  provenance flag (provenance is automatic under trusted publishing), and restores no cache.
- **The gate runs explicitly (D5).** npm's documentation does not say whether `npm stage publish` runs
  `prepublishOnly`, so the job runs the gate as its own step before staging. X1–X8 run on the tag's
  checkout; nothing before the gate writes a file the clean-tree check (X4) would see.
- **The manifest names its repository (D4).** create-wxl's manifest gains a `repository` entry with
  upstream's GitHub URL and the `create-wxl` directory; npm requires it to match the workflow's
  repository exactly. Spec 0005's manifest listing gains the same entry.
- **The release procedure is documented (D7).** `docs/agents/workflow.md` gains a release section:
  the release change lands; the agent tags `v<V>` at the merge commit and pushes it; CI makes the
  GitHub Release and stages the package; the maintainer checks and approves the staged version; the
  agent verifies the registry, provenance and a fresh `npm create wxl`; failures follow D6. It lists
  the maintainer's one-time steps: create the trusted publisher (stage only, environment `npm`) no more
  than two days before the first tag, since npm expires a configuration whose first publish has not
  succeeded within two days; have the `npm` environment with no reviewer; after the first approval,
  set the package to require 2FA and disallow tokens and revoke old tokens.
- **Tags are not reused (D6).** A tag whose job fails before staging, or whose staged version is
  rejected, is neither moved nor reused: the fix ships as the next patch version. A job that failed
  for a cause outside the repository (registry, network, a missing npm setting) may be re-run.
- **Spec 0005 records the change.** 0005's traceability gains revision 2.4: X9's row, decisions D4 and
  D12, the seam 0005-S2's parameters and the manifest listing change as this spec says, naming 0009.
  The unmerged T-0068 branch's revision 2.4 of 0005 is not landed.

## Trust Boundaries and Threat Model

- **B1 — npm ↔ upstream's Actions job, through OIDC.** npm lets a job of `BrowserLaboratory/wxl-platform`'s
  `publish-npm.yml`, in environment `npm`, stage create-wxl; nothing becomes installable without a
  maintainer's 2FA approval, and once tokens are disallowed a leaked token cannot publish. It does not
  protect against a person with push access who pushes a `v*` tag at a commit carrying a changed
  workflow: that can stage anything, and the approval is the only check. The maintainer therefore
  approves only a version whose tag they made.
- **B2 — the maintainer's machine ↔ npm.** X9 stops a terminal `npm publish` before it reaches npm,
  with a reason. It is not a control: the environment can be faked; refusing tokens is the control.
- **B3 — upstream ↔ a fork or a teacher's range.** The workflow ships in ranges, but its job is skipped
  outside upstream; npm's trusted publisher names upstream only; `create-wxl/` is not in the release
  archive (0005).
- Outside the threat model: GitHub, npm and their OIDC issuance; anyone with admin rights on the
  repository or on the npm account.

## Acceptance Criteria

- **AC-1** With X1–X8 holding, `checkPublish` resolves when K1–K4 hold. For each boundary of K02–K05
  (unset, empty, wrong case, trailing space, another repository, another workflow file, a branch ref,
  another version's tag, no OIDC request URL) it throws `checks` `['X9']`, naming the condition and the
  value seen (or "unset"). With several violated, only the first in K1–K4 order is named. (K01–K05, K07)
- **AC-2** With an empty environment, as in a maintainer's terminal, X9 names K1, and its message ends
  with the sentence that create-wxl is published only by upstream's publish workflow on a `v<V>` tag
  and approved on npmjs.com. (K06)
- **AC-3** An X1–X8 violation is named before X9 is checked; each of X1–X8 still fails as 0005's C42
  says. The gate spawns no npm command; `check-publish.mjs` passes `process.env`; the npm maintainer
  and whoami helpers no longer exist; extra `npmView`/`npmWhoami` arguments are ignored. (K08–K11)
- **AC-4** `publish-npm.yml` satisfies W1–W8: triggered only by `v*` tag pushes; one job `stage` with
  the upstream-only `if:`; environment `npm`; top-level permissions `{}` and job permissions exactly
  `contents: read` and `id-token: write`; the three actions pinned as in `release.yml`, Node 24; one
  exact npm at or above 11.15.0 installed first; the seven steps in order; no secret, token variable,
  direct `npm publish`, `npm dist-tag`, `--provenance` or cache. The upstream-only and toolchain tests
  cover the new workflow. (W01–W09)
- **AC-5** create-wxl's manifest has R1's `repository`, built from `UPSTREAM_SLUG`, and otherwise
  still equals 0005's listing. (M01)
- **AC-6** `docs/agents/workflow.md` has a release section listing P1–P6 with their owners and order,
  N1–N4 with their timing, and D6. Spec 0005's traceability records revision 2.4 for the parts this
  spec changes, naming 0009. (D01, D02)
- **AC-7** Stage 8 is the first release after the epic lands, run with the user (P1–P6):
  - the tag's `publish-npm.yml` run concludes success, with the gate passing and staging succeeding;
  - before approval the staged version is listed and `latest` is unchanged;
  - after the user's approval, `npm view create-wxl version` prints `<V>`, provenance is present, and
    a fresh `npm create wxl` in an empty folder records `<V>` and the tag's commit;
  - after the user disallows tokens, the record quotes what they report;
  - if the first run fails before staging, the record says why and whether D6 led to a re-run or a
    next patch. (S01–S05)

## Testing Decisions

- Tests check behaviour at the seams, not the helpers inside them: `checkPublish`'s thrown check and
  message (0009-S1), the parsed workflow (0009-S2), and the manifest (0009-S3).
- 0009-S1 extends 0005's publish tests (`create-wxl/test/publish.test.mjs`, a temporary repository with
  lightweight and annotated tags, `ls-remote` stubbed); the X1–X8 cases stay as they are, with an `env`
  satisfying K1–K4 so that their outcomes are unaffected. T-0068's branch has tests for X9's old causes;
  only its structure is reused.
- 0009-S2 follows `tests/unit/workflows/upstream-only-jobs.test.ts` and `toolchain-parity.test.ts`,
  which parse workflow YAML and pin `if:` comparisons and toolchain versions; those two tests are
  extended rather than duplicated.
- 0009-S3 extends `create-wxl/test/upstream-config.test.mjs` (0005's C45).
- 0009-S4 cannot run before the epic lands: it is the next real release, with the user approving.
  Staging is safe to try for real because nothing is installable until approved, and a wrong staged
  version is rejected rather than approved (D6).

## Out of Scope

- Publishing anything other than create-wxl, and any change to `release.yml` or the site's release
  asset.
- A dry-run or test publish on pull requests; npm offers no staging target separate from the real
  package.
- Required reviewers on the `npm` environment (Q4), and deployment-tag rules on it.
- Forks publishing their own create-wxl: forks are skipped (B3) and the package stays upstream's.
- Dependency audit of create-wxl and the pinned actions beyond keeping today's pins.

## Further Notes

- npm facts this spec relies on (trusted publishing needs npm ≥ 11.5.1 and Node ≥ 22.14.0; staging
  needs npm ≥ 11.15.0; `id-token: write`; GitHub-hosted runners only; the workflow file name with its
  extension; `repository.url` matching exactly; the two-day expiry; stage-only allowed actions;
  approval always needs 2FA; provenance automatic for a public repository and package) were read from
  npm's documentation on 2026-11-11; the research note lists the pages.
- Not in npm's documentation, so not relied on: whether `npm stage publish` runs `prepublishOnly`,
  how long a staged version is kept, and whether `npm whoami` answers inside an OIDC job.
- Ticket ids: T-0068 is taken by the unmerged branch `tickets/T-0068/x9-npm-login-message`; stage 4
  decides how to record it (superseded by this epic) and allocates this epic's tickets after it.
- The version of the first CI release is chosen by its release ticket; the code this epic changes
  ships in the package, so it is at least a patch release.
