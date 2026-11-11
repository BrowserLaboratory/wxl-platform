# Traceability: 0009-npm-trusted-publishing

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file. Revision 1 (2026-11-11), before adversarial review.

Stage 1 (2026-11-11) is recorded in the local research notes
`.proj.research/2026-11-11-trusted-publishing-stage1.md` (decisions) and
`.proj.research/2026-11-11-npm-trusted-publishing.md` (npm's documentation, read that day). Seams
0009-S1 to S4 were approved by the user on 2026-11-11 ("Approve all four (Recommended)").

## Decisions

Stage 1, the user's choices (quoted option labels):

| # | Decision |
|---|---|
| Q1 | A new epic; X9's redesign (the unmerged T-0068) folds into it — "New epic, fold X9 in (Recommended)" |
| Q2 | Token publishing is turned off and only CI publishes; the trusted publisher may only stage — "Disable tokens, CI only (Recommended)" |
| Q3 | A pushed `v*` tag stages the package automatically; the user approves it on npmjs.com — "Automatically on v* tag push (Recommended)" |
| Q4 | The trusted publisher is bound to the GitHub environment `npm`, with no required reviewer — "Bind 'npm', no reviewers (Recommended)" |

Derived in stage 2:

| # | Decision |
|---|---|
| D1 | X9 is rewritten: it holds when the four CI conditions K1–K4 hold, read from an injected environment, and no longer asks npm for maintainers or the logged-in user (supersedes 0005's D4 and D12) |
| D2 | `checkPublish` takes `env` (production passes `process.env`) and no longer takes `npmView` or `npmWhoami`; their real implementations are removed |
| D3 | A new workflow `publish-npm.yml`, the only place that publishes create-wxl, runs W1–W8 |
| D4 | create-wxl's manifest gains `repository` (R1), which npm compares with the workflow's repository for trusted publishing and provenance |
| D5 | X1–X8 are unchanged and run in the workflow on the tag's checkout; nothing before the gate writes a file that X4 would see |
| D6 | A tag whose job fails before staging, or whose staged version is rejected, is neither moved nor reused: the fix ships as the next patch version. Re-running a job whose failure was outside the repository (registry or network) is allowed |
| D7 | The release procedure (P1–P6) is written down in `docs/agents/workflow.md`; the user's own steps on npmjs.com and GitHub are N1–N4 |
| D8 | X9 is a guard against publishing by mistake, not a security control: npm's trusted publisher configuration (N1) and "disallow tokens" (N3) are the controls (B1) |

## Seams

| # | Seam | Observed |
|---|---|---|
| 0009-S1 | create-wxl's exported `checkPublish({ root, module, runGit, archive, env })`, called as 0005-S2 calls it (temporary repository, stubbed `ls-remote`), with `env` a plain object; `scripts/check-publish.mjs` passes `process.env` | the returned or thrown `PublishError`: its `checks` and its message |
| 0009-S2 | `.github/workflows/publish-npm.yml` parsed with `yaml`, as `tests/unit/workflows/*.test.ts` parse the existing workflows | the parsed triggers, job keys, permissions, environment, `if:`, step `uses`/`with`/`run`/`working-directory` |
| 0009-S3 | `create-wxl/package.json` read as JSON, as 0005's C45 reads it | the `repository` value and the rest of the manifest against the listing |
| 0009-S4 | Stage 8: a real release of upstream — the tag pushed, the workflow run, npm's Staged Packages, the user's approval, the registry and `npm create wxl` in an empty folder | workflow run conclusion and log; `npm stage list` or the Staged Packages tab; `npm view create-wxl@<V> version dist.attestations`; the smoke range's `range.json` |

## Vocabulary

| Term | Meaning here |
|---|---|
| stage (verb) | run `npm stage publish`: the version is uploaded and held, not installable, until a maintainer approves it |
| staged version | a version held by npm after staging; listed by `npm stage list` and on the package's Staged Packages tab |
| approve | a maintainer's 2FA-confirmed action (`npm stage approve <id>` or the website) that makes a staged version installable and moves `latest` |
| trusted publisher | npm's per-package configuration naming the GitHub owner, repository, workflow file name, environment and allowed actions whose OIDC token may act for the package |
| the gate | `prepare-dist.mjs` followed by `check-publish.mjs` (X1–X9), the same pair `prepublishOnly` runs |
| `<V>` | the root manifest's `version`, equal to create-wxl's (X2) |

## The new X9

`checkPublish` checks X1–X8 as 0005 specifies, then X9. X9 holds when K1–K4 all hold; otherwise it
fails naming the first condition that does not hold, in order K1 to K4:

| # | Condition on `env` | Cause named on failure |
|---|---|---|
| K1 | `GITHUB_ACTIONS` is exactly `true` | not running in GitHub Actions |
| K2 | `GITHUB_REPOSITORY` is exactly `UPSTREAM_SLUG` | not running in the upstream repository (names the value, or "unset") |
| K3 | `GITHUB_WORKFLOW_REF` is exactly `<UPSTREAM_SLUG>/.github/workflows/publish-npm.yml@refs/tags/v<V>` | not the publish workflow on tag `v<V>` (names the value, or "unset") |
| K4 | `ACTIONS_ID_TOKEN_REQUEST_URL` is a non-empty string | no OIDC token available (the job lacks `id-token: write`) |

Every X9 failure message ends with the same sentence: create-wxl is published only by upstream's
`publish-npm.yml` workflow when a `v<V>` tag is pushed, and is then approved on npmjs.com. The
`PublishError`'s `checks` is `['X9']`, as for every other check. `CHECK_EXPLANATIONS.X9` becomes
`'not running in the upstream publish workflow for this version'`.

## The workflow

`.github/workflows/publish-npm.yml`, the full shape (action pins and the npm version are chosen at
implementation; `<sha>` stands for a commit SHA with its tag in a trailing comment, as in
`release.yml`):

```yaml
name: Publish create-wxl

on:
  push:
    tags:
      - 'v*'

permissions: {}

jobs:
  stage:
    if: github.repository == format('{0}/{1}', 'BrowserLaboratory', 'wxl-platform')
    runs-on: ubuntu-latest
    environment: npm
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@<sha>        # same pin as release.yml
      - uses: pnpm/action-setup@<sha>       # same pin as release.yml
      - uses: actions/setup-node@<sha>      # same pin as release.yml
        with:
          node-version: 24
      - run: npm install --global npm@<exact>   # an exact 11.x at or above 11.15.0
      - run: pnpm --dir create-wxl install --frozen-lockfile
      - working-directory: create-wxl
        run: node scripts/prepare-dist.mjs && node scripts/check-publish.mjs
      - working-directory: create-wxl
        run: npm stage publish
```

| # | Rule |
|---|---|
| W1 | Triggered only by `push` of tags matching `v*`; no other event |
| W2 | One job, `stage`, whose `if:` is exactly the upstream comparison `release.yml` uses |
| W3 | The job's `environment` is `npm`; the workflow's top-level `permissions` is `{}` and the job's is exactly `contents: read`, `id-token: write` |
| W4 | `actions/checkout`, `pnpm/action-setup` and `actions/setup-node` use the same `uses:` strings as `release.yml`; Node 24 |
| W5 | npm is installed at one exact version, at or above 11.15.0, before any other npm command |
| W6 | Steps in order: checkout, pnpm, Node, npm, `pnpm --dir create-wxl install --frozen-lockfile`, the gate in `create-wxl`, `npm stage publish` in `create-wxl` |
| W7 | No step references `secrets.`, `NODE_AUTH_TOKEN` or `NPM_TOKEN`, runs `npm publish` (as a command, not `npm stage publish`), runs `npm dist-tag`, or passes `--provenance` (provenance is automatic); no step restores a cache (`actions/setup-node` has no `cache` input, no `actions/cache` or `rust-cache`), so nothing from an earlier run reaches the package |
| W8 | No step before the gate writes a file outside `.gitignore`d paths (D5: X4 sees a clean tree) |

## Manifest

| # | Rule |
|---|---|
| R1 | `create-wxl/package.json` gains `"repository": { "type": "git", "url": "git+https://github.com/<UPSTREAM_SLUG>.git", "directory": "create-wxl" }`; 0005's listing (Package and publishing) gains the same key and C45 checks it; the rest of the listing is unchanged |

## Release procedure and the user's steps

Written into `docs/agents/workflow.md` under a new section (D7):

| # | Step | Who |
|---|---|---|
| P1 | The release change (versions, CHANGELOG) lands on `main` as now | agent, user merges |
| P2 | An annotated tag `v<V>` is created at the merge commit and pushed | agent |
| P3 | `release.yml` makes the GitHub Release; `publish-npm.yml` runs the gate and stages create-wxl `<V>` | CI |
| P4 | The staged version is checked (`npm stage list`, the Staged Packages tab) and approved with 2FA | user |
| P5 | `npm view create-wxl version` prints `<V>`, its provenance is present, and `npm create --yes wxl@latest <folder> -- --no-setup` in an empty folder writes `range.json` with `<V>` and the tag's commit | agent |
| P6 | A failed job or a rejected staged version follows D6 | agent |

The user's steps outside the repository:

| # | Step | When |
|---|---|---|
| N1 | On npmjs.com, create-wxl → Settings → Trusted publishing: GitHub Actions, owner `BrowserLaboratory`, repository `wxl-platform`, workflow file `publish-npm.yml`, environment `npm`, allowed actions: stage only (no direct publish, no dist-tag) | within 2 days before the first tag push after this epic lands (a new configuration expires if its first publish does not succeed within 2 days) |
| N2 | On GitHub, the environment `npm` exists with no required reviewer (GitHub creates it on first use if absent) | before the first tag push |
| N3 | create-wxl → Settings → Publishing access: "Require two-factor authentication and disallow tokens"; revoke tokens no longer needed | after the first staged version is approved |
| N4 | Approve each staged version (P4) | every release |

## Trust boundaries

| # | Boundary | Protects | Does not protect |
|---|---|---|---|
| B1 | npm registry ↔ upstream's GitHub Actions job, through OIDC (N1) | only a job of `BrowserLaboratory/wxl-platform`'s `publish-npm.yml` in environment `npm` can stage create-wxl; staging needs no token; nothing becomes installable without a maintainer's 2FA approval; after N3 a leaked token cannot publish | a person with push access who pushes a `v*` tag at a commit carrying a changed `publish-npm.yml` can stage anything; approval (P4) is the only check, so the maintainer approves only a version whose tag they made |
| B2 | the maintainer's machine ↔ npm | X9 stops `npm publish` outside the workflow before it reaches npm, with a reason | not a control (D8): `env` can be faked; N3 is the control |
| B3 | upstream ↔ a fork or a teacher's range | `publish-npm.yml` ships in ranges but its job's `if:` skips it outside upstream; npm's trusted publisher names upstream only; `create-wxl/` is not in the archive (0005 U1) | — |

Outside the threat model: GitHub, npm and their OIDC issuance; anyone with admin rights on the
repository or the npm account.

## Matrix

| Row | Type | Field / input | Boundary | Expected | AC |
|---|---|---|---|---|---|
| K01 | X9 | K1–K4 hold, X1–X8 hold | pass | `checkPublish` resolves | AC-1 |
| K02 | X9 | `GITHUB_ACTIONS` unset, `''`, `false`, `TRUE`, `true ` | K1 | X9, cause K1 | AC-1 |
| K03 | X9 | `GITHUB_REPOSITORY` unset, another repository, `browserlaboratory/wxl-platform` (case differs) | K2 | X9, cause K2 naming the value or "unset" | AC-1 |
| K04 | X9 | `GITHUB_WORKFLOW_REF` unset; `…/release.yml@refs/tags/v<V>`; `…/publish-npm.yml@refs/heads/main`; `…/publish-npm.yml@refs/tags/v<other>`; another repository's prefix | K3 | X9, cause K3 naming the value or "unset" | AC-1 |
| K05 | X9 | `ACTIONS_ID_TOKEN_REQUEST_URL` unset, `''` | K4 | X9, cause K4 | AC-1 |
| K06 | X9 | `env` = `{}` (a maintainer's terminal) | first | X9, cause K1; message ends with the publish-workflow sentence | AC-2 |
| K07 | X9 | K1 and K3 both violated | order | cause K1 only | AC-1 |
| K08 | gate | an X1–X8 check violated and K1–K4 violated | order | the X1–X8 check is named, not X9 (checks run in order) | AC-3 |
| K09 | gate | `checkPublish` with `npmView`/`npmWhoami` passed in addition | interface | ignored; no npm command is spawned by the gate | AC-3 |
| K10 | gate | each of X1–X8 violated with K1–K4 holding | regression | 0005's C42 outcomes, unchanged | AC-3 |
| K11 | wiring | `scripts/check-publish.mjs` | interface | passes `process.env` as `env`; `publish-io.mjs` exports no `createNpmView` or `createNpmWhoami` | AC-3 |
| W01 | workflow | `on` | W1 | only `push.tags: ['v*']` | AC-4 |
| W02 | workflow | `jobs` | W2 | exactly one job, `stage`, `if:` equal to `release.yml`'s comparison | AC-4 |
| W03 | workflow | `environment`, `permissions` | W3 | `npm`; top-level `{}`; job `{contents: read, id-token: write}` exactly | AC-4 |
| W04 | workflow | `uses` | W4 | the three actions' `uses:` equal `release.yml`'s; `node-version` 24 | AC-4 |
| W05 | workflow | npm install step | W5 | `npm install --global npm@<x.y.z>`, exact, ≥ 11.15.0, before any other `npm` step | AC-4 |
| W06 | workflow | steps | W6 | the seven steps in order, the last two with `working-directory: create-wxl` and `run` as listed | AC-4 |
| W07 | workflow | every step's text and `with` | W7 | none of the forbidden strings; no cache input or cache action | AC-4 |
| W08 | workflow | the upstream-only test | W2 | `upstream-only-jobs.test.ts` counts the new `if:` occurrence and pins this job | AC-4 |
| W09 | workflow | the toolchain test | W4 | `toolchain-parity.test.ts` covers `publish-npm.yml` (Node 24, the shared pins) | AC-4 |
| M01 | manifest | `repository` | R1 | equals R1, with `UPSTREAM_SLUG` substituted; the rest of C45 unchanged | AC-5 |
| D01 | docs | `docs/agents/workflow.md` | P1–P6, N1–N4 | a release section lists P1–P6 and N1–N4 with their order and owners, and D6 | AC-6 |
| D02 | docs | spec 0005 | supersession | 0005's traceability records revision 2.4: X9's row, D4, D12, 0005-S2's parameters and the listing changed by this epic, naming 0009 | AC-6 |
| S01 | stage 8 | tag `v<V>` pushed after N1, N2 | P3 | `publish-npm.yml`'s run concludes success; its log shows the gate passing and `npm stage publish` succeeding | AC-7 |
| S02 | stage 8 | staged version | P4 | `npm stage list` (or the tab) shows create-wxl `<V>`; `latest` is still the previous version before approval | AC-7 |
| S03 | stage 8 | after the user's approval | P5 | `npm view create-wxl version` = `<V>`; `dist.attestations` present; the smoke range's `range.json` has `<V>` and the tag's commit | AC-7 |
| S04 | stage 8 | after N3 | B1, B2 | the user reports Publishing access set to disallow tokens; the record quotes it | AC-7 |
| S05 | stage 8 | the first run fails before staging (for example N1 missing) | D6 | nothing staged; after the cause is fixed outside the repository, re-running the job is allowed; a cause inside the repository ships as the next patch | AC-7 |

## Self-check (revision 1)

Checklist for each new rule: parameters complete, boundary closed, acceptance exit present, no
conflict with an existing rule.

- K1–K4: each names its exact value; K02–K05 close the boundaries (unset, empty, case, trailing
  space, wrong file, wrong ref kind, wrong version); K07 fixes the order. Exit: AC-1, AC-2.
- X9's old behaviour: superseded, not kept alongside (Q2). Conflict checked: 0005's AC-19 says
  "`checkPublish` fails naming the check for each of X1–X9", which still holds; D02 records the change
  in 0005. T-0068's unmerged revision 2.4 of 0005 is not landed and is replaced by D02's.
- `npm publish` run locally: `prepublishOnly` still runs the gate, which now stops at X9 (K06), so a
  local publish never reaches npm. Conflict checked: `npm pack` runs only `prepack` (0005), which does
  not run `checkPublish`, so packing for stage 8 of other epics still works.
- W8 against X4: `pnpm install` writes only `create-wxl/node_modules/` (ignored); `prepare-dist.mjs`
  writes `dist/` and `LICENSE` (ignored, 0005); `npm install --global` writes outside the repository.
- D6 against npm: whether a rejected staged version's number can be reused is not in npm's docs; D6
  never reuses it, so the answer does not matter.
- Unknowns carried, not assumed: whether `npm stage publish` runs `prepublishOnly` (W6 runs the gate
  explicitly either way); how long npm keeps a staged version (P4 approves within the session of the
  release).
