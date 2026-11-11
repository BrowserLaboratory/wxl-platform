# Traceability: 0009-npm-trusted-publishing

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file.

- Revision 1 (2026-11-11) went to round 1 of adversarial review (`review/round-1.md`: one P0, K-1).
- Revision 2 (2026-11-12) applies `review/disposition.md` and the user's decisions U1–U7. It
  renames the release steps RP, the user's steps MN, the manifest rules MR and the stage 8 rows S8, so
  they no longer collide with spec 0005's P, N, R and S.

Stage 1 (2026-11-11) is recorded in two local research notes:
`.proj.research/2026-11-11-trusted-publishing-stage1.md` (decisions) and
`.proj.research/2026-11-11-npm-trusted-publishing.md` (npm's documentation, read that day). The user
approved seams 0009-S1 to S4 on 2026-11-11 ("Approve all four (Recommended)"). S5 is added in
revision 2 for the release document (U5).

## Decisions

Stage 1, the user's choices (quoted option labels):

| # | Decision |
|---|---|
| Q1 | A new epic. X9's redesign (the unmerged T-0068) folds into it — "New epic, fold X9 in (Recommended)" |
| Q2 | Token publishing is turned off and only CI publishes. The trusted publisher may only stage — "Disable tokens, CI only (Recommended)" |
| Q3 | A pushed `v*` tag stages the package automatically, and the user approves it on npmjs.com — "Automatically on v* tag push (Recommended)" |
| Q4 | The trusted publisher is bound to the GitHub environment `npm`, with no required reviewer — "Bind 'npm', no reviewers (Recommended)" |

Round 1, the user's rulings (2026-11-12):

| # | Ruling |
|---|---|
| U1 | `create-wxl/package.json`'s `repository.url` joins 0004's rewrite list. A fork's rebrand swap rewrites it, and M01 compares it with the root manifest's — "Add to rewrite list (Recommended)" |
| U2 | Environment `npm` allows deployments from tags matching `v*` only — "Restrict to v* tags (Recommended)" |
| U3 | The agent pushes the release tag, and only after the user confirms it explicitly. RP5 compares provenance fields, replacing "a version whose tag they made" — "Agent, after you confirm (Recommended)" |
| U4 | The first CI release is this epic's last ticket. Close-out waits for it — "Count it in the epic (Recommended)" |
| U5 | The release procedure lives in a new `docs/agents/release.md`; `workflow.md` is unchanged — "New docs/agents/release.md (Recommended)" |
| U6 | Every token that can publish create-wxl is revoked when the trusted publisher is created (MN1) — "When N1 is set up (Recommended)" |
| U7 | Before the gate, the workflow checks that the tag's commit is an ancestor of `origin/main` — "Add the check (Recommended)" |

Derived in stage 2 and revised in revision 2:

| # | Decision |
|---|---|
| D1 | X9 is rewritten. It holds when the four CI conditions K1–K4 hold, read from an injected environment, and it fails with the message XM. It no longer asks npm for maintainers or the logged-in user. It supersedes 0005's D4, and T-0025's ticket-level D12 (which injected `npmWhoami`; 0005-S2 never listed that parameter) |
| D2 | `checkPublish` takes `env` (production passes `process.env`) and no longer takes `npmView` or `npmWhoami`. `publish-io.mjs` loses `npmCommand`, `parseNpmViewMaintainers`, `createNpmView` and `createNpmWhoami`, and their tests go too |
| D3 | A new workflow, `publish-npm.yml`, is the only place that publishes create-wxl. It follows W1–W7 |
| D4 | create-wxl's manifest gains `repository` (MR1). npm compares it with the workflow's repository for trusted publishing and provenance |
| D5 | X1–X8 are unchanged. They run in the workflow on a full clone checked out at the tag (W4). The steps before the gate are exactly W6's first six; their writes stay in ignored paths or outside the repository |
| D6 | Failures and re-runs follow the table "Re-running and rejecting". A tag is never moved. A tag whose staged version was rejected is never re-run. A fix for a cause inside the repository ships as the next patch version. A `v<V>` that never reached npm is still an upstream release for ADR-0009, because ADR-0009 decides that by tag |
| D7 | The release procedure (RP0–RP7) and the user's steps (MN1–MN6) are written down in `docs/agents/release.md` (R2) |
| D8 | X9 is a guard against publishing by mistake, not a security control. The controls are npm's trusted publisher configuration (MN1), the environment's tag rule (MN2), the approval (RP5) and "disallow tokens" (MN3) — see B1 |
| D9 | The contracts in "Overridden contracts" (O1–O4) are overridden explicitly |
| D10 | No `v*` tag is pushed from the moment the epic's first code ticket lands until its last code ticket lands. The release ticket (U4) pushes the first one |

## Overridden contracts

| # | Contract | Overridden by |
|---|---|---|
| O1 | 0004's slug confinement (`.proj.specs/0004-stateless-engine/traceability.md` "Upstream repository-slug confinement"). It confines the slug to the root manifest's A1 fields, the README and CONTRIBUTE anchors, and the keep list | The rewrite list's manifest entry also covers `create-wxl/package.json`, `repository.url` only (U1). `tests/unit/scripts/upstream-guard.test.ts` exempts that one line (M02). fork-init's default mode does not touch it, since `create-wxl/` never enters a range (0005 U1). Rebrand mode's tree-wide swap rewrites it together with the root manifest, which keeps M01 true. 0004's traceability gains a revision note in the same change |
| O2 | 0005 traceability, Seams note: "create-wxl's sources, tests and fixtures never spell the upstream repository slug" | Except `create-wxl/package.json`'s `repository.url` (O1). 0005 records it in revision 2.4 (DS1) |
| O3 | `docs/agents/workflow.md` stage 8: it runs on the ticket's preview deployment before the PR merges, and the first ticket that touches deployment runs a real temporary instance (`:88-91`, `:160-162`, `:178-180`) | npm offers no staging target apart from the real package, so: (a) the code tickets' stage 8 is RP0, on a terminal and in CI, before their PRs merge; (b) AC-7 is stage 8 of the epic's last ticket, the first CI release, which runs after the code tickets have merged; that ticket stays `processing` until AC-7 holds, and close-out waits for it; (c) OQ-022's non-browser stage 8 extends to 0009 (DS3) |
| O4 | 0005 spec: "`checkPublish` cannot run in CI because the tag does not exist until release" | It runs in CI on the tag's push. 0005 records it (DS1) |

## Seams

| # | Seam | Observed |
|---|---|---|
| 0009-S1 | create-wxl's exported `checkPublish({ root, module, runGit, archive, env })`, called the way 0005-S2 calls it (a temporary repository, `ls-remote` stubbed), with `env` any value. `scripts/check-publish.mjs` passes `process.env` | the returned or thrown `PublishError`: its `checks` and its `message` |
| 0009-S2 | `.github/workflows/publish-npm.yml` parsed with `yaml`, the way `tests/unit/workflows/*.test.ts` parse the existing workflows, plus its raw text | parsed triggers, `concurrency`, permissions, environment, `if:`, `env`, steps (`uses`, `with`, `run`, `name`); substrings of the raw text |
| 0009-S3 | `create-wxl/package.json` read as JSON, the way 0005's C45 reads it; `tests/unit/scripts/upstream-guard.test.ts`'s guard run on the real tree | the manifest against the listing; the guard's violations |
| 0009-S4 | Stage 8 of the release ticket: a real release of upstream — the tag pushed, both workflow runs, npm's Staged Packages tab, the user's approval, the registry, and `npm create wxl` in an empty folder | run conclusions and step conclusions; what the user reports from the Staged Packages tab and the npm settings pages; `npm view`; the provenance statement; the smoke range's `range.json` |
| 0009-S5 | `docs/agents/release.md` and `AGENTS.md`, read as text in a test, with whitespace runs collapsed to one space (0005's U-item method) | presence of R2's strings |

## Vocabulary

| Term | Meaning here |
|---|---|
| stage (verb) | Run `npm stage publish`. The version is uploaded and held, not installable, until it is approved |
| staged version | A version npm holds after staging. Listed on the package's Staged Packages tab and by `npm stage list` |
| approve | The upstream maintainer's 2FA-confirmed action (on the Staged Packages tab, or `npm stage approve <id>`). It makes a staged version installable and moves `latest` |
| reject | The upstream maintainer's 2FA-confirmed action (on the Staged Packages tab, or `npm stage reject <id>`). It discards a staged version, which never becomes installable |
| trusted publisher | npm's per-package configuration. It names the GitHub owner, repository, workflow file name, environment and allowed actions whose OIDC token may act for the package |
| publish gate | `prepare-dist.mjs` followed by `check-publish.mjs` (X1–X9). It is the same pair `prepublishOnly` runs |
| upstream maintainer | The person who controls upstream's repository and the npm package; in Chinese, 上游 (GLOSSARY), never 維護者 |
| `<V>` | The root manifest's `version`, equal to create-wxl's (X2) |

## The new X9

`checkPublish` checks X1–X8 as 0005 specifies, then X9. Before reading any variable, X9 treats an
`env` that is missing, `null` or not an object as `{}`. A variable is *set* when its value is a string.
X9 holds when K1–K4 all hold. Otherwise it throws `PublishError` with `checks` `['X9']` and message XM,
naming the first condition, in order K1 to K4, that does not hold.

| # | Condition | Cause text (verbatim) |
|---|---|---|
| K1 | `GITHUB_ACTIONS` is set and equals `true` | `GITHUB_ACTIONS is not "true"` |
| K2 | `GITHUB_REPOSITORY` is set and equals `UPSTREAM_SLUG` exactly (case-sensitive) | `GITHUB_REPOSITORY is not the upstream repository` |
| K3 | `GITHUB_WORKFLOW_REF` is set and equals `` `${UPSTREAM_SLUG}/.github/workflows/publish-npm.yml@refs/tags/v${V}` `` exactly | `GITHUB_WORKFLOW_REF is not this version's publish workflow` |
| K4 | `ACTIONS_ID_TOKEN_REQUEST_URL` is set and holds at least one character other than whitespace | `ACTIONS_ID_TOKEN_REQUEST_URL is not set (the job needs id-token: write)` |

**XM**, the message, one line:

```
X9 (K<n>: <cause text>; saw <value>). create-wxl is published only by the upstream repository's publish-npm.yml workflow when tag v<V> is pushed, and is then approved on npmjs.com.
```

- `<n>` is the failing condition's number.
- `<value>` is `JSON.stringify` of that condition's variable when it is set, and `unset` otherwise.
- `<V>` is the version.

The sentence after `). ` is the **closing sentence**. `CHECK_EXPLANATIONS.X9` becomes
`not running in the upstream publish workflow for this version`. As for every check, it is used only
when a `PublishError` is built without a message.

## The workflow

`.github/workflows/publish-npm.yml`, complete apart from `<sha>` and the npm version. `<sha>` is the
same pinned commit SHA, with the same trailing tag comment, that `release.yml` uses for that action.
`step names` are free text.

```yaml
name: Publish create-wxl

on:
  push:
    tags:
      - 'v*'

permissions: {}

concurrency:
  group: publish-npm
  cancel-in-progress: false

jobs:
  stage:
    if: github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')
    runs-on: ubuntu-latest
    environment: npm
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@<sha>
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@<sha>
      - uses: actions/setup-node@<sha>
        with:
          node-version: 24
          package-manager-cache: false
      - run: npm install --global npm@<x.y.z>
      - run: git merge-base --is-ancestor HEAD origin/main
      - run: pnpm --dir create-wxl install --frozen-lockfile --prod --ignore-scripts
      - working-directory: create-wxl
        run: node scripts/prepare-dist.mjs && node scripts/check-publish.mjs
      - working-directory: create-wxl
        run: npm stage publish
```

| # | Rule |
|---|---|
| W1 | `on` is exactly `push.tags: ['v*']` |
| W2 | Exactly one job, `stage`. Its `if:` equals `release.yml`'s `release` job's `if:` |
| W3 | Top-level `permissions` is `{}`. `concurrency` is exactly `{ group: publish-npm, cancel-in-progress: false }`. The job's `environment` is `npm`, and its `permissions` is exactly `{ contents: read, id-token: write }` |
| W4 | `uses` of the three actions equals `release.yml`'s for the same action. `with` is exactly as shown: checkout `{ fetch-depth: 0, persist-credentials: false }`, `pnpm/action-setup` none, setup-node `{ node-version: 24, package-manager-cache: false }` |
| W5 | `<x.y.z>` is an exact version, `11.y.z` with `y ≥ 15`. The step is the fourth, and no earlier step's `run` starts with `npm ` |
| W6 | Exactly eight steps, in the order shown. Steps 4–8 have the `run` (and, for 7–8, the `working-directory: create-wxl`) shown, verbatim. A `name:` may be added to any step |
| W7 | The raw file contains none of `secrets.`, `vars.`, `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `_authToken`, `registry-url`, `npm publish` except inside `npm stage publish`, `npm dist-tag`, `--provenance`, `actions/cache`, `rust-cache`. No `env:` at workflow or job level. No step has a `with` key named `cache` |

**What W6 implies about the steps before the gate (formerly W8).** Steps 1–6 write only
`create-wxl/node_modules/`, which is ignored, and things outside the repository: npm's global prefix,
pnpm's store, the toolcache. So X4 sees the tree as checked out. S8-01's passing gate step is the
runtime evidence.

## Manifest

| # | Rule |
|---|---|
| MR1 | `create-wxl/package.json` gains `"repository": { "type": "git", "url": "<repository-url>", "directory": "create-wxl" }`, placed right after `license`, with its keys in that order. `<repository-url>` equals the root manifest's `repository.url` (`git+https://github.com/BrowserLaboratory/wxl-platform.git` upstream). 0005's listing gains the same key at the same place, and its "four placeholders" become five |

## Release procedure and the user's steps

`docs/agents/release.md` (R2) holds the release procedure. Its first line says it applies to upstream
only. It never spells the upstream slug; it says "the upstream repository (`UPSTREAM_SLUG` in
`scripts/fork-init.ts`)".

| # | Step | Who |
|---|---|---|
| RP0 | A code ticket's stage 8, before its PR merges, on a terminal: `npm pack --dry-run` in `create-wxl/` lists the package's files with MR1's `repository`; `node scripts/check-publish.mjs` in `create-wxl/` exits 1 naming a check, and npm is not contacted (no npm log is written for it). CI's parse tests for the workflow pass on the PR | agent |
| RP1 | The release change lands on `main`: both versions, and the CHANGELOG entry generated with `/tw-emoji-release-note` | agent; the user merges |
| RP2 | After the user explicitly confirms the tag, the agent creates an annotated tag `v<V>` with message `WXL <V>` at the merge commit on `main`, and pushes that tag alone (`git push origin v<V>`) | agent, user confirms |
| RP3 | `release.yml` makes the GitHub Release. `publish-npm.yml` checks the commit is on `main`, runs the publish gate and stages create-wxl `<V>` | CI |
| RP4 | The GitHub Release's notes are replaced with the CHANGELOG entry, titled `WXL <V>` (OQ-019 stays open) | agent |
| RP5 | On the Staged Packages tab, the user checks four things, records which of the fields in (c) the page shows, and approves with 2FA only if all hold. (a) There is exactly one staged entry for `<V>`. (b) `publish-npm.yml`'s run for `v<V>` concluded success. (c) Each field the page shows matches that run: source repository = the upstream repository, workflow = `publish-npm.yml`, ref = `refs/tags/v<V>`, commit = `git rev-parse v<V>^{commit}`, tarball shasum = the one the run log printed. (d) The run log's shasum is the one the agent reports. A field the page does not show before approval is listed in OQ-027 | user |
| RP6 | The agent verifies two things. (a) `npm view create-wxl version` and `npm view create-wxl dist-tags.latest` print `<V>`; `npm view create-wxl@<V> dist.attestations` is present; the provenance statement it points to names the upstream repository, `.github/workflows/publish-npm.yml`, `refs/tags/v<V>` and the tag's commit. (b) `npm create --yes wxl@latest <folder> -- --no-setup` in an empty folder exits 0 and writes `range.json` with `<V>` and the tag's commit | agent |
| RP7 | Failures and re-runs follow D6's table | agent, user |

The user's steps outside the repository:

| # | Step | When |
|---|---|---|
| MN1 | On npmjs.com, create-wxl → Settings → Trusted publishing: GitHub Actions; owner `BrowserLaboratory`, repository `wxl-platform`, workflow file `publish-npm.yml`, environment `npm`; allowed actions: stage only, with direct publish and dist-tag both off. In the same sitting, revoke every token that can publish create-wxl (U6) | Within 2 days before the release ticket's tag. npm expires a configuration whose first publish has not succeeded within 2 days |
| MN2 | On GitHub, Settings → Environments → `npm`: no required reviewer; deployment branches and tags: selected, with the single tag rule `v*` (U2) | Before the release ticket's tag |
| MN3 | create-wxl → Settings → Publishing access: "Require two-factor authentication and disallow tokens" | After the first staged version is approved |
| MN4 | Approve or reject each staged version (RP5) | Every release |
| MN5 | Delete MN1's configuration before renaming or transferring the GitHub organisation or repository | When that happens |
| MN6 | If MN1's configuration expired, delete it and create it again (it cannot be edited) | Before re-running under D6 |

## Re-running and rejecting (D6)

| # | Situation | What happens |
|---|---|---|
| F1 | `publish-npm.yml` failed, the log shows `npm stage publish` did not run or exited non-zero, the user sees no staged entry for `<V>`, and the cause is outside the repository: a registry or network error, or MN1 or MN2 missing or expired | Fix the cause (MN6 if expired), then re-run the job |
| F2 | As F1, but the cause is inside the repository: anything in the commit, including a gate check or the main-ancestry step failing | No re-run. The fix lands and ships as `v<V+patch>` |
| F3 | A staged version fails RP5 | The user rejects it. The tag is never re-run; the next patch follows |
| F4 | `release.yml` failed and `publish-npm.yml` staged | No approval until `release.yml` succeeds. Re-run it if F1's causes apply; otherwise reject (F3) |
| F5 | A run is started while another for the same group runs | `concurrency` queues it; it does not cancel the running one |

Staging alone may or may not count as npm's "first successful publish" for MN1's expiry. npm's
documentation does not say, so MN6 covers both cases.

## Trust boundaries

| # | Boundary | Protects | Does not protect |
|---|---|---|---|
| B1 | npm registry ↔ upstream's GitHub Actions job, through OIDC (MN1, MN2) | Only a `publish-npm.yml` job of the upstream repository, deploying to environment `npm` from a `v*` tag, can stage create-wxl. Staging needs no token. Nothing becomes installable without the upstream maintainer's 2FA approval after RP5's comparison. After MN1's revocation and MN3, a leaked token cannot publish | A person or agent with push access, the agent included (RP2), who pushes a `v*` tag at a commit on `main` carrying a changed workflow or code can stage it. RP5's comparison shows the commit but not its content. Code loaded in the job can request an OIDC token for that same job. `--prod --ignore-scripts` narrows that to create-wxl's runtime dependencies and the repository's code. The upstream maintainer can still publish directly with 2FA interactively; that is an accepted residual risk |
| B2 | The upstream maintainer's machine ↔ npm | `npm publish` and `pnpm publish` run `prepublishOnly`, so they stop at the first failing check, X9 at the latest, before reaching npm | Not a control (D8). `--ignore-scripts` skips the gate, and a terminal `npm stage publish` may skip it (npm's documentation does not say). Both still need a credential that MN1 and MN3 remove, and RP5 |
| B3 | Upstream ↔ a fork or a teacher's range | `publish-npm.yml` and `release.md` ship in ranges, but the job's `if:` skips it outside upstream. npm's trusted publisher names upstream only. `create-wxl/` is not in the archive (0005 U1) | Evidence is static (W02, W08); no fork run is part of stage 8 |

Outside the threat model: GitHub, npm and their OIDC issuance; the npm registry serving `npm@<x.y.z>`;
anyone with admin rights on the repository or the npm account.

## Documents (R2) and spec 0005 (DS)

| # | Rule |
|---|---|
| R2 | `docs/agents/release.md` holds these: the heading `# Releasing create-wxl and WXL`; a first line containing `upstream only`; one line per RP0–RP7 and MN1–MN6, each starting with its id; D6's table rows F1–F5, each starting with its id; the strings `/tw-emoji-release-note`, `git push origin v<V>`, `npm stage publish`, `Staged Packages`, `2FA`, `disallow tokens`, `UPSTREAM_SLUG`. `AGENTS.md`'s Reference gains a line linking `docs/agents/release.md`. The file does not contain the upstream slug |
| DS1 | 0005's traceability gains revision 2.4, naming 0009. It changes: X9's row (to D1's conditions); D4 (superseded); the 0005-S2 seam (`env` instead of `npmView`, and a note that `npmWhoami` was never listed); C42's X9 case; the listing (MR1, five placeholders); the Seams note (O2). 0005's spec changes the sentences on X9 and B2 (`:79-82`, `:119`, `:204`, `:213-214`) to point to 0009 |
| DS2 | 0004's traceability gains a revision note for O1. `docs/adr/0009-upgrade-base-is-an-upstream-release.md`'s reference to 0005 B2 gains a note pointing to 0009 B1. OQ-021's Evidence gains a note that X9 changed in 0009 |
| DS3 | OQ-022's scope extends to 0009 (O3). A new OQ-027 records what the Staged Packages tab shows before approval, filled in by the release ticket from RP5 |

## Matrix

| Row | Type | Field / input | Boundary | Expected | AC |
|---|---|---|---|---|---|
| K01 | X9 | K1–K4 hold, X1–X8 hold | pass | `checkPublish` resolves | AC-1 |
| K02 | X9 | `GITHUB_ACTIONS` unset, `''`, `'false'`, `'TRUE'`, `'true '`, the boolean `true` | K1 | XM with K1 and the value (`unset` for the boolean) | AC-1 |
| K03 | X9 | `GITHUB_REPOSITORY` unset, `''`, another repository, `browserlaboratory/wxl-platform` | K2 | XM with K2 and the value | AC-1 |
| K04 | X9 | `GITHUB_WORKFLOW_REF` unset; `''`; `…/release.yml@refs/tags/v<V>`; `…/publish-npm.yml@refs/heads/main`; `…/publish-npm.yml@refs/tags/v<other>`; another repository's prefix | K3 | XM with K3 and the value | AC-1 |
| K05 | X9 | `ACTIONS_ID_TOKEN_REQUEST_URL` unset, `''`, `'  '` | K4 | XM with K4 and the value | AC-1 |
| K06 | X9 | `env` = `{}`, `undefined`, `null`, a string | first | XM with K1 and `unset`; it ends with the closing sentence, `<V>` substituted | AC-2 |
| K07 | X9 | K1 and K3 both violated | order | XM names K1; K3's cause text is absent | AC-1 |
| K08 | gate | an X1–X8 check violated and K1–K4 violated | order | the X1–X8 check is thrown, not X9 | AC-3 |
| K09 | gate | `npmView`/`npmWhoami` passed in addition | interface | ignored; outcome as without them | AC-3 |
| K10 | gate | each of X1–X8 violated with K1–K4 holding | regression | 0005's C42 outcomes, unchanged | AC-3 |
| K11 | wiring | `publish.mjs`, `publish-io.mjs`, `scripts/check-publish.mjs` (static) | interface | `check-publish.mjs` passes `env: process.env`; `publish-io.mjs` exports exactly `spawnCapture`, `spawnCaptureBytes`, `createArchive`, `gitRevParseHead`; none of the three files contains `npmCommand`, `'npm'`, `npm.cmd`, `npmView` or `npmWhoami`; `publish-io.test.mjs` has no test of the removed exports | AC-3 |
| K12 | gate | a full clone detached at an annotated tag `v<V>` with `origin/main` present (W4's checkout shape), X1–X8's inputs satisfied | CI shape | X3, X6 and X7 hold (0005's annotated-tag cases), and X4 holds | AC-3 |
| K13 | X9 | `CHECK_EXPLANATIONS.X9`; `new PublishError(['X9'])` | default | equals the text in "The new X9"; the default message is `X9 (<that text>)` | AC-1 |
| W01 | workflow | `on` | W1 | exactly `push.tags: ['v*']` | AC-4 |
| W02 | workflow | `jobs`, `if:` | W2 | one job `stage`; `if:` equals `release.yml`'s `release` job's | AC-4 |
| W03 | workflow | `permissions`, `concurrency`, `environment` | W3 | as W3, exactly | AC-4 |
| W04 | workflow | three actions' `uses` and `with` | W4 | `uses` equal `release.yml`'s; `with` exactly as W4 | AC-4 |
| W05 | workflow | the npm step | W5 | step 4; `npm install --global npm@11.<y>.<z>`, `y ≥ 15`; no earlier `run` starts with `npm ` | AC-4 |
| W06 | workflow | steps | W6 | exactly eight; steps 4–8 `run`, and 7–8 `working-directory`, verbatim | AC-4 |
| W07 | workflow | raw text and step `with` keys | W7 | none of W7's strings; no workflow- or job-level `env`; no `cache` key | AC-4 |
| W08 | workflow | `tests/unit/workflows/upstream-only-jobs.test.ts` | W2 | gains: `publish-npm.yml`'s `jobs.stage.if` equals `EXPECTED_IF`; `jobs.stage` has no `env`; its header comment counts `format(…)` six times across three files; `trigger-branches.test.ts:61`'s comment names `publish-npm.yml` beside `release.yml` | AC-4 |
| W09 | workflow | `tests/unit/scripts/fork-init.test.ts` T52 | rebrand | a rebrand run leaves `publish-npm.yml`'s `if:` line unchanged; the count of upstream-only `if:` lines becomes three | AC-4 |
| M01 | manifest | `repository` | MR1 | position, keys and values as MR1, its `url` equal to the root manifest's `repository.url`; the rest of C45 unchanged | AC-5 |
| M02 | manifest | the guard on the real tree | O1 | no violation from `create-wxl/package.json`'s `repository.url` line; a slug on any other line of that file is still reported (fixture) | AC-5 |
| D01 | docs | `docs/agents/release.md`, `AGENTS.md` | R2 | every R2 string present; no upstream slug | AC-6 |
| D02 | docs | specs 0005 and 0004, ADR-0009, OQ-021, OQ-022, OQ-027 | DS1–DS3 | each named place carries its change, naming 0009 | AC-6 |
| S8-01 | stage 8 | tag `v<V>` pushed after MN1, MN2 (RP2) | RP3 | `publish-npm.yml`'s run concludes success; its main-ancestry and gate steps conclude success; `npm stage publish` exits 0 | AC-7 |
| S8-02 | stage 8 | staged version | RP5 | the user reports exactly one entry for `<V>`, which fields the page shows and whether each matched; `npm view create-wxl dist-tags.latest` still prints the previous version | AC-7 |
| S8-03 | stage 8 | after approval | RP6 | as RP6 (a) and (b) | AC-7 |
| S8-04 | stage 8 | MN1 and MN3 | B1, B2 | the record quotes the user's report of MN1's six fields and the token revocation, and MN3's selected option text; AC-7 is not met before MN3 is reported done | AC-7 |
| S8-05 | stage 8 | any run before the first success | D6 | each failure is recorded with its F-row; F1 re-runs and F2/F3 next patches; S8-01–S8-04 are met by the first `v<V>` that stages successfully | AC-7 |
| S8-06 | stage 8 | a staged version failing RP5, if one occurs | F3 | the user rejects it; the staged entry is gone; `latest` unchanged | AC-7 |
| S8-07 | stage 8 | `release.yml` fails while `publish-npm.yml` staged, if it occurs | F4 | no approval before `release.yml` succeeds | AC-7 |
| S8-08 | stage 8 | RP0 on each code ticket | O3 | the terminal output of `npm pack --dry-run` and of `check-publish.mjs` (exit 1, a named check) is recorded in the ticket | AC-8 |

## Self-check (revision 2)

Checklist for each new or changed rule: are its parameters complete, is its boundary closed, does it
have an acceptance exit, and does it conflict with an existing rule?

- **XM and K1–K4.** The causes, the value format and the closing sentence are verbatim. K02–K06 cover
  unset, empty, whitespace, case, a non-string and a missing `env`. K07 fixes the order. Exits: AC-1,
  AC-2. Conflict check: the message starts with `X9 (`, as `PublishError`'s default does, and
  `check-publish.mjs` prints `err.message`.
- **W1–W7.**
  - Every key in the shape is pinned. W7's banned strings are not in the shape. The shape's
    `package-manager-cache` is a key, not the banned key `cache`, and the substring `cache` alone is
    not banned.
  - Conflict check against U2: the environment's tag rule lives on GitHub (MN2), not in the file.
  - Conflict check against the upstream-only test's convention that every upstream-only job sets
    `WXL_EXPECT_UPSTREAM`: W7 bans job-level `env`, so W08 records the exception. The job runs no
    test, so it needs no `WXL_EXPECT_UPSTREAM`.
- **Main-ancestry step (U7).** `fetch-depth: 0` brings `origin/main`. A tag at a commit that is not on
  `main` fails it, and the failure is F2. Conflict check against D10: none.
- **`--prod --ignore-scripts`.** The gate imports `tar` and `yaml` (dependencies) and no
  devDependency. create-wxl has no install lifecycle of its own. Conflict check: 0005's stage 8 and CI
  install create-wxl in full for tests, and this flag applies only to the publish job.
- **MR1 against O1.**
  - The guard exempts exactly one line.
  - A rebrand rewrites the root manifest and this line alike, so M01 compares the two.
  - Conflict check: 0005's listing changes in DS1, in the same change as MR1.
- **D6 table.** F1–F5 partition the failures by "did staging run or succeed" and "is the cause
  inside the repository". Rejected tags are never re-run, so whether npm lets a rejected version
  number be reused never matters for D6. Unknown, and covered by MN6 either way: whether staging
  alone counts as the first successful publish.
- **O3 and U4.** The code tickets keep a stage 8 before merge (RP0, S8-08), and the release ticket
  holds AC-7. Conflict check: hard rule 4's "state which surface" is met by naming terminal, CI and
  registry.
- **Unknowns carried, not assumed:**
  - whether `npm stage publish` runs `prepublishOnly` (W6 runs the gate explicitly);
  - how long npm keeps a staged version;
  - what the Staged Packages tab shows before approval (OQ-027);
  - whether `npm whoami` answers in an OIDC job (not used).
