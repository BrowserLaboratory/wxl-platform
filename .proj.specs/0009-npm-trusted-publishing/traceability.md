# Traceability: 0009-npm-trusted-publishing

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec is derived from
this file.

- **Revision 1** (2026-11-11) went to round 1 of adversarial review (`review/round-1.md`: one P0).
- **Revision 2** (2026-11-12) applied `review/disposition.md` and the user's rulings U1–U7. It went to
  round 2 (`review/round-2.md`), which found no P0, so the stage 3 gate is met.
- **Revision 3** (2026-11-12) applies `review/disposition-2.md` and rulings U8–U10. Two rounds is the
  ceiling, so revision 3 is self-checked rather than reviewed again, as 0005's revision 2.1 and
  0007's revision 3 were.

Release steps are RP, the user's steps MN, manifest rules MR and stage 8 rows S8. Wherever this
epic's ids are written into spec 0005's files, they carry the prefix "0009's" (DS1).

Stage 1 (2026-11-11) is recorded in two local research notes:
`.proj.research/2026-11-11-trusted-publishing-stage1.md` and
`.proj.research/2026-11-11-npm-trusted-publishing.md`. The user approved seams 0009-S1 to S4 on
2026-11-11; S5 was added in revision 2 (U5).

## Decisions

Stage 1, the user's choices (quoted option labels):

| # | Decision |
|---|---|
| Q1 | A new epic; X9's redesign (the unmerged T-0068) folds into it — "New epic, fold X9 in (Recommended)" |
| Q2 | Token publishing is turned off; only CI publishes; the trusted publisher may only stage — "Disable tokens, CI only (Recommended)" |
| Q3 | A pushed `v*` tag stages the package automatically; the user approves it on npmjs.com — "Automatically on v* tag push (Recommended)" |
| Q4 | The trusted publisher is bound to the GitHub environment `npm`, with no required reviewer — "Bind 'npm', no reviewers (Recommended)" |

Rulings on rounds 1 and 2 (2026-11-12):

| # | Ruling |
|---|---|
| U1 | `create-wxl/package.json`'s `repository.url` joins 0004's rewrite list (O1) — "Add to rewrite list (Recommended)" |
| U2 | Environment `npm` deploys from tags matching `v*` only — "Restrict to v* tags (Recommended)" |
| U3 | The agent pushes the release tag, only after the user confirms it; RP5 compares fields — "Agent, after you confirm (Recommended)" |
| U4 | The first CI release is this epic's last ticket; close-out waits for it — "Count it in the epic (Recommended)" |
| U5 | The release procedure lives in a new `docs/agents/release.md` — "New docs/agents/release.md (Recommended)" |
| U6 | Every token that can publish create-wxl is revoked when the trusted publisher is created — "When N1 is set up (Recommended)" |
| U7 | The workflow checks the tag's commit is an ancestor of `origin/main` before the gate — "Add the check (Recommended)" |
| U8 | In this repository RP2 wins over the user's general rule of tagging and `git push --tags` automatically after a release note: one tag, confirmed first, never `--tags` — "Follow RP2 (Recommended)" |
| U9 | In a GitHub fork, fork-init's default mode keeps `create-wxl/package.json`'s upstream URL; only rebrand rewrites it; the documents say so — "Allow it, update docs (Recommended)" |
| U10 | A GitHub tag ruleset for `v*` restricts creation and forbids deletion and moving (MN7) — "Add as MN7 (Recommended)" |

Derived:

| # | Decision |
|---|---|
| D1 | X9 is rewritten. It holds when K1–K4 hold, read from an injected environment, and fails with message XM. It no longer asks npm for maintainers or the logged-in user. It supersedes 0005's D4 and T-0025's ticket-level D12 (which injected `npmWhoami`; 0005-S2 never listed it) |
| D2 | `checkPublish` takes `env` (production passes `process.env`) instead of `npmView` and `npmWhoami`. `publish-io.mjs` loses `npmCommand`, `parseNpmViewMaintainers`, `createNpmView` and `createNpmWhoami`, together with their tests |
| D3 | A new workflow, `publish-npm.yml`, is the only place that publishes create-wxl. It follows W1–W8 |
| D4 | create-wxl's manifest gains `repository` (MR1) |
| D5 | X1–X8 are unchanged. They run in the workflow on a full clone checked out at the tag. Steps 1–6 write only ignored paths or outside the repository |
| D6 | Failures, re-runs and rejections follow F1–F7. Tags are never moved or deleted; MN7 enforces this. A `v<V>` that never became installable on npm is still an upstream release for ADR-0009, which decides by tag; the GLOSSARY note (DS2) says so |
| D7 | The release procedure (RP0–RP7), the user's steps (MN1–MN7) and F1–F7 are written down in `docs/agents/release.md` (R2) |
| D8 | X9 and the main-ancestry step are guards against mistakes, not controls; both run from the tagged commit's own workflow. The controls are MN1, MN2, MN7, the comparison and approval in RP5, and MN3 (B1) |
| D9 | The contracts in "Overridden contracts" (O1–O5) are overridden explicitly |
| D10 | No `v*` tag is pushed from the moment the epic's first code ticket lands until the release ticket pushes the first one. A fix that F2 makes necessary is a new code ticket of this epic, landing before the release ticket tags again |

## Overridden contracts

| # | Contract | Overridden by |
|---|---|---|
| O1 | 0004's slug confinement ("Upstream repository-slug confinement": only the root manifest's A1 fields, the README and CONTRIBUTE anchors, and the keep list) | The rewrite list also covers `create-wxl/package.json`'s `repository.url` line (U1), as a third kind of location, rewritten by rebrand's tree-wide swap only (U9). (a) **Guard.** The guard exempts, in that one file, the single line whose text after trimming equals `"url": "<the root manifest's repository.url>",` (M02). (b) **Fork-init modes.** Default mode never touches it, so a GitHub fork, which carries `create-wxl/`, keeps the upstream URL there. Ranges made by create-wxl never hold `create-wxl/`, because the archive excludes it (0005 U1). (c) **Documents.** Both `wxl-fork-init` skills' A-mode list of kept places and README's fork section name it (DS2). 0004's traceability gains a revision note |
| O2 | 0005 traceability, Seams note: "create-wxl's sources, tests and fixtures never spell the upstream repository slug" | Except that one line (O1), recorded in 0005 revision 2.4 (DS1) |
| O3 | `docs/agents/workflow.md`'s stage 8 rules. It runs on the ticket's preview before the PR merges. The first deployment ticket runs a real temporary instance. Browser-reachable surfaces need agent evidence. A non-browser harness is recorded. A PR is marked ready only after stage 8 | npm offers no staging target apart from the real package. (a) **Code tickets** run RP0 before their PRs merge; RP0 is their stage 8. (b) **The release ticket's** stage 8 is AC-7. Its PR (RP1) merges before AC-7 runs, after its stages 6–7, and it is marked ready on its stage 6–7 record. (c) **AC-7's evidence** for the npm pages is the user's report. The agent's browser cannot sign in to the user's npm account, and a sign-in is the user's. OQ-028 records this harness (DS3) |
| O4 | `docs/agents/issue-tracker.md:78-80` and `workflow.md`'s stage 6 entry and stage 9 status rule, which tie `review` to stages 6–8 and `done` to the merge | The release ticket is `review` from stage 6, stays `review` after its PR merges while AC-7 runs, and becomes `done` when AC-7 holds |
| O5 | 0005 spec: "`checkPublish` cannot run in CI because the tag does not exist until release"; "Requiring the release commit to be on upstream's `main`" (Out of Scope); "Publishing to npm, tagging and the GitHub release: user actions at release time, each asked first" | The gate runs in CI on the tag's push. The commit on `main` is checked (U7). Tagging is confirmed by the user (RP2). Publishing is CI staging plus the user's approval (RP5). Recorded in 0005 (DS1) |

## Seams

| # | Seam | Observed |
|---|---|---|
| 0009-S1 | create-wxl's exported `checkPublish({ root, module, runGit, archive, env })`, called the way 0005-S2 calls it (a temporary repository, `ls-remote` stubbed), with `env` any value; `scripts/check-publish.mjs` passes `process.env` | the returned or thrown `PublishError`: `checks` and `message` |
| 0009-S2 | `.github/workflows/publish-npm.yml` parsed with `yaml` and read as raw text, as `tests/unit/workflows/*.test.ts` and `fork-template-parity.test.ts` do; a temporary git repository for the ancestry command (W12) | parsed keys and values; substrings and lines of the raw text; the command's exit code |
| 0009-S3 | `create-wxl/package.json` read as JSON and as text; the upstream guard (`tests/unit/scripts/upstream-guard.test.ts`) on the real tree and on fixtures; `git ls-files` | the manifest against the listing; the guard's violations; tracked paths |
| 0009-S4 | Stage 8 of the release ticket: the tag pushed, both workflow runs, the Staged Packages tab and the npm and GitHub settings pages (as the user reports them, O3), the registry, `npm create wxl` in an empty folder | run and step conclusions and logs; the user's reports, quoted; `npm view`; the provenance statement; the smoke range's `range.json` |
| 0009-S5 | `docs/agents/release.md`, `AGENTS.md` and `CONTRIBUTE.md` read as text by a test in `create-wxl/test/` (which never enters a range): line checks on lines trimmed and stripped of one leading `\| ` or `- `; string checks after collapsing whitespace runs to one space | presence and position of R2's lines and strings |

## Vocabulary

npm's own terms below are used only in English documents and are not added to GLOSSARY. The
pipeline's "stage N" is always written with its number. The npm action is always written "stage on
npm" or `npm stage publish`.

| Term | Meaning here |
|---|---|
| stage on npm | Run `npm stage publish`. The version is uploaded and held, not installable, until approved |
| staged version | A version npm holds after staging, listed on the package's Staged Packages tab and by `npm stage list` |
| approve / reject | The upstream maintainer's 2FA-confirmed action, on the Staged Packages tab or with `npm stage approve <id>` / `npm stage reject <id>`. Approve makes a staged version installable and moves `latest`. Reject discards it |
| trusted publisher | npm's per-package configuration naming the GitHub owner, repository, workflow file, environment and allowed actions whose OIDC token may act for the package |
| publish gate | `prepare-dist.mjs` then `check-publish.mjs` (X1–X9), the pair `prepublishOnly` runs |
| upstream maintainer | The person who controls upstream's repository and the npm package. In Chinese, 上游 (GLOSSARY), never 維護者 |
| code ticket | A ticket of this epic that changes a file under `create-wxl/`, `.github/workflows/`, `tests/` or `scripts/`. A ticket changing only documents is not one |
| release ticket | The epic's last ticket, the first CI release (U4) |
| `<V>` | The root manifest's `version`, equal to create-wxl's (X2) |

## The new X9

`checkPublish` checks X1–X8 as 0005 specifies, then X9. X9 first treats an `env` that is missing,
`null`, not an object, or an array as `{}`. A variable is *set* when `env` has it as an own property
whose value is a string. X9 holds when K1–K4 all hold. Otherwise it throws `PublishError` with
`checks` `['X9']` and message XM, naming the first condition, in order K1 to K4, that does not hold.

| # | Condition | Cause text (verbatim) |
|---|---|---|
| K1 | `GITHUB_ACTIONS` is set and equals `true` | `GITHUB_ACTIONS is not "true"` |
| K2 | `GITHUB_REPOSITORY` is set and equals `UPSTREAM_SLUG` exactly (case-sensitive) | `GITHUB_REPOSITORY is not the upstream repository` |
| K3 | `GITHUB_WORKFLOW_REF` is set and equals `` `${UPSTREAM_SLUG}/.github/workflows/publish-npm.yml@refs/tags/v${V}` `` exactly | `GITHUB_WORKFLOW_REF is not this version's publish workflow` |
| K4 | `ACTIONS_ID_TOKEN_REQUEST_URL` is set and `value.trim()` is not empty | `ACTIONS_ID_TOKEN_REQUEST_URL is not set (the job needs id-token: write)` |

**XM**, the message, one line:

```
X9 (K<n>: <cause text>; saw <value>). create-wxl is published only by the upstream repository's publish-npm.yml workflow when tag v<V> is pushed, and is then approved on npmjs.com.
```

- `<n>` is the failing condition's number.
- `<value>` is `JSON.stringify` of that variable when it is set, and `unset` otherwise.
- `<V>` is the version.

The sentence after `). ` is the **closing sentence**. `CHECK_EXPLANATIONS.X9` becomes
`not running in the upstream publish workflow for this version`. It is used only when a
`PublishError` is built without a message.

## The workflow

`.github/workflows/publish-npm.yml`, complete apart from `<sha>` and `<x.y.z>`. `<sha>` is the same
pinned commit SHA, followed by the same trailing ` # vN…` comment, that `release.yml` uses for that
action. `name:` lines inside steps are free text.

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
| W3 | Top-level `permissions` is `{}`. `concurrency` is exactly `{ group: publish-npm, cancel-in-progress: false }`. The job's `environment` is `npm` and its `permissions` is exactly `{ contents: read, id-token: write }` |
| W4 | Each action's `uses` equals `release.yml`'s for that action, and in the raw text it is followed by the same trailing comment. Each `with` is exactly as shown |
| W5 | `<x.y.z>` is `11.y.z` with `y ≥ 15`. It is step 4, and no earlier step's `run` starts with `npm ` |
| W6 | Exactly eight steps, in the order shown. Steps 4–8 have the `run` (and steps 7–8 the `working-directory: create-wxl`) shown, verbatim |
| W7 | The raw file contains none of: `secrets.`, `vars.`, `NODE_AUTH_TOKEN`, `NPM_TOKEN`, `_authToken`, `NPM_CONFIG`, `npm_config_`, `--registry`, `registry-url`, `npm publish` (except inside `npm stage publish`), `npm dist-tag`, `--provenance`, `actions/cache`, `rust-cache`. No step has a `with` key named `cache` |
| W8 | Key sets are closed. Workflow: `{name, on, permissions, concurrency, jobs}`. Job: `{if, runs-on, environment, permissions, steps}`, with `runs-on` = `ubuntu-latest`. Each step: `{uses, with?, name?}` or `{run, working-directory?, name?}` |

**What W6 implies about the steps before the gate.** Steps 1–6 write only `create-wxl/node_modules/`,
which is ignored, and paths outside the repository. So X4 sees the tree as checked out. S8-01's
passing gate step is the runtime evidence.

## Manifest and repository

| # | Rule |
|---|---|
| MR1 | `create-wxl/package.json` gains `repository` right after `license`, written one key per line. Line 1: `  "repository": {`. Line 2: `    "type": "git",`. Line 3: `    "url": "<repository-url>",`. Line 4: `    "directory": "create-wxl"`. Line 5: `  },`. `<repository-url>` equals the root manifest's `repository.url` (`git+https://github.com/BrowserLaboratory/wxl-platform.git` upstream). 0005's listing gains the same key at the same place, and its "four placeholders" become five |
| MR2 | The repository tracks no `.npmrc` file at any path |

## Release procedure and the user's steps

`docs/agents/release.md` (R2) holds these. It never spells the upstream slug. It says "the upstream
repository (`UPSTREAM_SLUG` in `scripts/fork-init.ts`)" and gives owner and repository names as
separate words only in MN1, MN2 and MN7, where the user types them.

| # | Step | Who |
|---|---|---|
| RP0 | A code ticket's stage 8, before its PR merges. After `pnpm --dir create-wxl install --frozen-lockfile`, three outputs are recorded: (a) `npm pkg get repository` in `create-wxl/` prints MR1's object; (b) `node scripts/check-publish.mjs` in `create-wxl/` exits 1 with `checkPublish failed: ` and a named check; (c) the PR's CI run passes the tests of W01–W12 | agent |
| RP1 | The release change lands on `main`: both versions, and the CHANGELOG entry generated with `/tw-emoji-release-note`. The skill only produces the entry; this step creates and pushes no tag | agent; user merges |
| RP2 | The user confirms two things: the tag name `v<V>`, and RP1's squash-merge commit SHA. The agent then checks `git ls-remote --tags origin v<V>` prints nothing; if it prints anything, it stops and reports, and never force-pushes. It creates an annotated tag with message `WXL <V>` at that SHA and pushes it alone with `git push origin v<V>`, never `git push --tags` (U8). One tag at a time: the next waits until the previous tag's `publish-npm.yml` run has ended | agent, user confirms |
| RP3 | `release.yml` makes the GitHub Release. `publish-npm.yml` runs the ancestry guard and the publish gate, then stages create-wxl `<V>` on npm | CI |
| RP4 | The GitHub Release's notes are replaced with the CHANGELOG entry, titled `WXL <V>` (OQ-019 stays open) | agent |
| RP5 | The user checks and approves with 2FA only if (a)–(d) hold and (c) compared at least one field. (a) The Staged Packages tab shows exactly one staged entry in all, and it is for `<V>`. Any other entry is rejected and recorded. (b) `publish-npm.yml`'s run for `v<V>` concluded success. (c) Each field the tab, or `npm stage view <id>` in the user's own signed-in terminal, shows matches the run: repository = the upstream repository, workflow = `publish-npm.yml`, ref = `refs/tags/v<V>`, commit = RP2's confirmed SHA, shasum = the one the user reads in the run's log. (d) `release.yml`'s run for `v<V>` concluded success. If no field can be compared, the user decides and the record says so. The fields seen go into OQ-027 | user |
| RP6 | The agent verifies three things, retrying a failed read up to three times, five minutes apart. (a) `npm view create-wxl version` and `npm view create-wxl dist-tags.latest` print `<V>`. (b) `npm view create-wxl@<V> dist.attestations` is present, and the provenance statement at its URL names the upstream repository, `.github/workflows/publish-npm.yml`, `refs/tags/v<V>` and RP2's SHA. (c) `npm create --yes wxl@latest <folder> -- --no-setup` in an empty folder exits 0 and writes `range.json` with `<V>` and RP2's SHA | agent |
| RP7 | Failures, re-runs and rejections follow F1–F7 | agent, user |

The user's steps outside the repository, in this order:

| # | Step | When |
|---|---|---|
| MN7 | GitHub, Settings → Rules → Rulesets: a tag ruleset targeting `v*` that restricts creations to the upstream maintainer and restricts deletions and updates (U10) | Before the release ticket's tag |
| MN2 | GitHub, Settings → Environments → `npm`: no required reviewer; deployment branches and tags: "Selected branches and tags" with exactly one rule, of type tag, pattern `v*` (U2) | Before MN1 |
| MN1 | npmjs.com, create-wxl → Settings → Trusted publishing. Six fields: provider GitHub Actions; owner `BrowserLaboratory`; repository `wxl-platform`; workflow file `publish-npm.yml`; environment `npm`; allowed actions with stage on, direct publish off and dist-tag off. It must be the package's only trusted publisher. In the same sitting, revoke every token that can publish create-wxl (U6) | After MN2, within 2 days before the release ticket's tag |
| MN3 | create-wxl → Settings → Publishing access: "Require two-factor authentication and disallow tokens" | After the first staged version is approved |
| MN4 | Approve or reject each staged version (RP5) | Every release |
| MN5 | Delete MN1's configuration before renaming or transferring the GitHub organisation or repository | When that happens |
| MN6 | If MN1's configuration has expired, delete it and create it again (it cannot be edited), with the same six fields, reported again in that release's record | Before any new tag or re-run while it is expired |

## Failures, re-runs and rejections (D6)

| # | Situation | What happens |
|---|---|---|
| F1 | `publish-npm.yml` did not stage on npm (`npm stage publish` did not run or exited non-zero, and the tab shows no entry for `<V>`), and the cause is outside the repository. Such causes: a registry or network error (including X6 when its log shows `ls-remote` could not reach GitHub); MN1 missing, expired or wrong; MN2 wrong; a run cancelled because a newer one replaced it (F5) | Fix the cause (MN6 if expired), then re-run the job |
| F2 | As F1, but the cause is in the commit. Such causes: a gate check failing on its own data, or the ancestry step exiting non-zero (exit 1: not on `main`; other: the checkout lacked `origin/main`, a workflow defect) | No re-run. A new code ticket fixes it (D10) and the fix ships as the next patch |
| F3 | A staged version fails RP5 | The user rejects it; that tag is never re-run; the next patch follows. If the entry looks unauthorised, the GitHub Release for that tag is also deleted. The tag itself stays: MN7 forbids deleting it |
| F4 | `release.yml` for `v<V>` failed, is still running or was cancelled while a version is staged | No approval until it succeeds. Re-run it when the cause is outside the repository (runner, network, a download); otherwise reject (F3) |
| F5 | A run starts while another of the group runs | GitHub keeps one running and one pending run. A newer pending run replaces, and cancels, the older pending one. RP2's one-tag-at-a-time rule avoids this; if it happens, the cancelled run is F1 |
| F6 | After approval, RP6 fails after its retries (no or wrong provenance, `npm create` failing, `latest` not `<V>`) | The user deprecates `<V>` with `npm deprecate create-wxl@<V> "<reason>"` (2FA), and the next patch follows |
| F7 | A run is re-run for a tag whose version was already approved or rejected | Not allowed by RP7. If it happens, npm refuses a version already staged (409, seen at 3.1.0 in T-0067), and nothing changes |

Staging alone may or may not count as npm's "first successful publish" for MN1's expiry. MN6 covers
both.

## Trust boundaries

| # | Boundary | Protects | Does not protect |
|---|---|---|---|
| B1 | npm registry ↔ upstream's GitHub Actions job, through OIDC (MN1, MN2, MN7) | Only a `publish-npm.yml` job of the upstream repository, deploying to environment `npm` from a `v*` tag that the upstream maintainer created (MN7), can stage create-wxl, and only stage it (MN1). Staging needs no token. Nothing becomes installable without the upstream maintainer's 2FA approval after RP5's comparison against RP2's confirmed SHA. After MN1's revocation and MN3, a leaked token cannot publish | Anyone holding the upstream maintainer's push credentials, the agent included (RP2), can push a `v*` tag at any commit. The workflow that runs is that commit's own, so its ancestry guard and gate may be removed. RP5's commit comparison against the SHA the user confirmed is what catches this. Any code the job runs can request an OIDC token for that job: the three actions, pnpm, Node, the npm CLI, create-wxl's runtime dependencies and the repository's code. `--prod --ignore-scripts` only removes devDependencies and install scripts. The upstream maintainer can still publish directly with interactive 2FA; this is an accepted residual risk |
| B2 | The upstream maintainer's machine ↔ npm | `npm publish` and `pnpm publish` run `prepublishOnly`, so they stop at the first failing check, X9 at the latest, before reaching npm (0005's C42, and this epic's K06 through the same gate) | Not a control (D8). `--ignore-scripts` skips the gate, and a terminal `npm stage publish` may skip it (npm's docs do not say). Both still need a credential that MN1 and MN3 remove, and RP5 (a) rejects an unexpected entry |
| B3 | Upstream ↔ a fork or a teacher's range | `publish-npm.yml` and `release.md` reach ranges, through creation and through `pnpm range:upgrade`, but the job's `if:` skips it outside upstream. npm's trusted publisher names upstream only. `create-wxl/` is not in the archive (0005 U1) | The evidence is static (W02, W09); no fork run is part of stage 8 |

Outside the threat model: GitHub, npm and their OIDC issuance; the registry serving `npm@<x.y.z>`;
anyone with admin rights on the repository or the npm account.

## Documents (R2) and other specs (DS)

| # | Rule |
|---|---|
| R2 | `docs/agents/release.md`, checked by 0009-S5. **Line checks.** Line 1 is `# Releasing create-wxl and WXL`. The first non-empty line after it contains `upstream only`. For each id among RP0–RP7, MN1–MN7 and F1–F7, some line starts with that id followed by a space, `:` or ` \|`. **String checks.** It contains `/tw-emoji-release-note`, `git push origin v<V>`, `never \`git push --tags\``, `npm stage publish`, `Staged Packages`, `2FA`, `disallow tokens` and `UPSTREAM_SLUG`. It does not contain the upstream slug. **Other files.** `AGENTS.md`'s `## Reference` section gains a line containing `docs/agents/release.md`. `CONTRIBUTE.md`'s Maintainer Setup gains a line containing `docs/agents/release.md` and `MN2` |
| DS1 | 0005's traceability gains revision 2.4, which names 0009 and prefixes 0009's ids. It changes: X9's row (to 0009's K1–K4); D4 (superseded); 0005-S2 (`env` instead of `npmView`, noting `npmWhoami` was never listed); C42's X9 case; C43 (its "all hold" includes an `env` meeting 0009's K1–K4); C45's row (five placeholders, with `create-wxl/test/upstream-config.test.mjs`'s test title to match); the listing (MR1); the Seams note (O2). 0005's spec changes the sentences on X9 and B2 (`:79-82`, `:119`, `:213-214`) and those O5 names (`:195-196`, `:198`, `:204`) to point to 0009 |
| DS2 | Six notes and changes. (1) 0004's traceability gains a revision note for O1. (2) Both `wxl-fork-init` skills (kept byte-identical) add the `create-wxl/package.json` line to the A-mode kept places. (3) `README.md` and `README.en.md`'s fork section says that line keeps the upstream URL (U9). (4) `docs/adr/0009-upgrade-base-is-an-upstream-release.md`'s reference to 0005 B2 gains a note pointing to 0009 B1. (5) `.proj.specs/0006-range-upgrade/spec.en.md`'s "As 0005 B2" gains the same note, and OQ-021's Evidence gains a note that X9 changed in 0009. (6) GLOSSARY's 設定紀錄 entry gains a sentence that 上游發布過的版本 is decided by upstream's tag |
| DS3 | A new OQ-027 asks what the Staged Packages tab shows before approval: created by the docs ticket, filled in by the release ticket from RP5. A new OQ-028 asks whether the user's report of the npm and GitHub settings pages plus registry reads is adequate stage 8 evidence (O3) |

## Matrix

| Row | Type | Field / input | Boundary | Expected | AC |
|---|---|---|---|---|---|
| K01 | X9 | K1–K4 hold, X1–X8 hold | pass | `checkPublish` resolves | AC-1 |
| K02 | X9 | `GITHUB_ACTIONS`: unset; `''`; `'false'`; `'TRUE'`; `'true '`; the boolean `true` | K1 | XM with K1 and the value (`unset` for the boolean) | AC-1 |
| K03 | X9 | `GITHUB_REPOSITORY`: unset; `''`; another repository; `browserlaboratory/wxl-platform`; a number | K2 | XM with K2 and the value (`unset` for the number) | AC-1 |
| K04 | X9 | `GITHUB_WORKFLOW_REF`: unset; `''`; `…/release.yml@refs/tags/v<V>`; `…/publish-npm.yml@refs/heads/main`; `…/publish-npm.yml@refs/tags/v<other>`; another repository's prefix; a boolean | K3 | XM with K3 and the value | AC-1 |
| K05 | X9 | `ACTIONS_ID_TOKEN_REQUEST_URL`: unset; `''`; `'  '`; `'\n'`; a number | K4 | XM with K4 and the value | AC-1 |
| K06 | X9 | `env`: `{}`, `undefined`, `null`, a string, an array, an object inheriting K1–K4 through its prototype | first | XM with K1 and `unset`; ends with the closing sentence, `<V>` substituted | AC-2 |
| K07 | X9 | K1 and K3 both violated | order | XM names K1; K3's cause text is absent | AC-1 |
| K08 | gate | an X1–X8 check violated and K1–K4 violated | order | the X1–X8 check is thrown, not X9 | AC-3 |
| K09 | gate | `npmView`/`npmWhoami` passed in addition | interface | ignored | AC-3 |
| K10 | gate | each of X1–X8 violated with K1–K4 holding | regression | 0005's C42 outcomes | AC-3 |
| K11 | wiring | `src/publish.mjs`, `src/publish-io.mjs`, `scripts/check-publish.mjs`, `test/publish-io.test.mjs` (static) | interface | `check-publish.mjs` passes `env: process.env`; `publish-io.mjs` exports exactly `spawnCapture`, `spawnCaptureBytes`, `createArchive`, `gitRevParseHead`; the first three files contain none of `npmCommand`, `'npm'`, `npm.cmd`, `npmView`, `npmWhoami`; the test file names none of the four removed exports | AC-3 |
| K12 | gate | a full clone detached at `v<V>` with `origin/main` present: (a) the local tag annotated; (b) the local tag lightweight, with `ls-remote` stubbed to report an annotated tag | CI shape | X3, X4, X6, X7 hold in both | AC-3 |
| K13 | X9 | `CHECK_EXPLANATIONS.X9`; `new PublishError(['X9'])` | default | the text above; message `X9 (<that text>)` | AC-1 |
| W01 | workflow | `on` | W1 | exactly as W1 | AC-4 |
| W02 | workflow | `jobs`, `if:` | W2 | one job `stage`; `if:` equals `release.yml`'s | AC-4 |
| W03 | workflow | `permissions`, `concurrency`, `environment` | W3 | as W3 | AC-4 |
| W04 | workflow | the three actions | W4 | `uses` equal `release.yml`'s, each followed in the raw text by the same trailing comment; `with` exactly as shown | AC-4 |
| W05 | workflow | the npm step | W5 | step 4; `npm install --global npm@11.<y>.<z>`, `y ≥ 15`; no earlier `run` starts with `npm ` | AC-4 |
| W06 | workflow | steps | W6 | exactly eight; steps 4–8 `run` and steps 7–8 `working-directory` verbatim | AC-4 |
| W07 | workflow | raw text; step `with` keys | W7 | none of W7's strings; no `cache` key | AC-4 |
| W08 | workflow | key sets | W8 | the three key sets exactly; `runs-on` = `ubuntu-latest` | AC-4 |
| W09 | workflow | `tests/unit/workflows/upstream-only-jobs.test.ts` | W2 | gains `publish-npm.yml`'s `jobs.stage.if` = `EXPECTED_IF` and `jobs.stage` without `env`. Its header comment's count of `format(…)` reads six across three files. `trigger-branches.test.ts`'s comment "Tag-driven work belongs to release.yml" names `publish-npm.yml` too | AC-4 |
| W10 | workflow | T52 in `tests/unit/scripts/fork-init.test.ts` | rebrand | a rebrand run leaves `publish-npm.yml`'s `if:` line unchanged; upstream-only `if:` lines number three | AC-4 |
| W11 | workflow | T52's fixture with `create-wxl/package.json` | rebrand | after a rebrand run its `repository.url` equals the root manifest's | AC-5 |
| W12 | workflow | `git merge-base --is-ancestor HEAD origin/main` in a temporary repository | U7 | exit 0 at a commit on `main`; exit 1 at a commit off it | AC-4 |
| M01 | manifest | `repository` | MR1 | JSON position, keys and values as MR1, `url` equal to the root manifest's; the five lines verbatim in the text; the rest of C45 unchanged | AC-5 |
| M02 | manifest | the guard | O1 | real tree: no violation from MR1's `url` line. Fixtures: the slug on any other line of `create-wxl/package.json`, `bugs.url` and `homepage` included, is reported, and so is a `url` line whose value differs from the root's | AC-5 |
| M03 | repository | `git ls-files` | MR2 | no path whose name is `.npmrc` | AC-5 |
| D01 | docs | `release.md`, `AGENTS.md`, `CONTRIBUTE.md` (0009-S5) | R2 | every R2 line and string present; no upstream slug | AC-6 |
| D02 | docs | 0005, 0004, 0006, ADR-0009, both skills, both READMEs, GLOSSARY, OQ-021, OQ-027 (created), OQ-028 | DS1–DS3 | each place carries its change, naming 0009; judged at stage 6 by reading, as no seam covers prose of other specs | AC-6 |
| S8-01 | stage 8 | tag `v<V>` pushed after MN7, MN2, MN1 (RP2) | RP3 | `publish-npm.yml`'s run concludes success; its ancestry and gate steps conclude success; `npm stage publish` exits 0 | AC-7 |
| S8-02 | stage 8 | the staged version | RP5 | the user reports one entry in all, for `<V>`; (b) and (d) succeeded; which fields were shown and that each matched; `npm view create-wxl dist-tags.latest` still prints the previous version; the fields seen are written into OQ-027 | AC-7 |
| S8-03 | stage 8 | after approval | RP6 | RP6 (a)–(c) hold | AC-7 |
| S8-04 | stage 8 | the settings | MN1–MN3, MN7 | the record in the release ticket quotes the user's report, and each quoted value equals the expected one. MN1's six fields as listed; the trusted publisher count, 1; the revocation: "no remaining token can publish create-wxl"; `npm access list collaborators create-wxl`, upstream maintainer only; MN2's rule; MN7's ruleset; MN3's option text verbatim. AC-7 is not met before every item is reported | AC-7 |
| S8-05 | stage 8 | any earlier release attempt | D6 | each is recorded with its F-row; S8-01–S8-04 are met by the first `v<V>` that is approved and passes RP6 | AC-7 |
| S8-06 | stage 8 | F3, if it occurs | F3 | the user reports the rejection and that the entry is gone; `latest` unchanged | AC-7 |
| S8-07 | stage 8 | F4 or F6, if it occurs | F4, F6 | the record names the run and the action taken | AC-7 |
| S8-08 | stage 8 | each code ticket | RP0 | RP0's three outputs recorded in the ticket before its PR merges | AC-8 |

## Self-check (revision 3)

The checklist for each new or changed rule: are its parameters complete, is its boundary closed, does
it have an acceptance exit, does it conflict with an existing rule?

- **W8 key sets vs W1–W7.** Every key in the shape belongs to a set. `with` and `name` are optional
  per step, and `working-directory` appears only in steps 7–8 (W6). Exit: W08. No conflict with
  W7: W7 bans job-level `env`, and W8 leaves it out.
- **MR1's layout vs C45.** C45 compares `JSON.stringify`, so layout does not matter to it. M01's text
  check fixes the five lines. Conflict check: the manifest's other one-line objects stay as they are.
  The guard no longer walks this file structurally: O1 (a) compares one exact line, so the walker's
  "one key per line" note is not stretched.
- **RP2 (U8) vs the user's global rule.** U8 makes RP2 win in this repository. R2 puts the sentence in
  `release.md`, which is where an agent reads the procedure.
- **RP5 (a)–(d).** (c) "at least one field compared, otherwise the user decides" closes the
  empty-page case without blocking every release on an npm unknown. Conflict check: F3, which rejects
  an unexpected entry, matches (a).
- **MN order** MN7 → MN2 → MN1. MN1's two-day window starts last, so the environment rule exists before
  the trusted publisher can be used. Exit: S8-04 quotes each.
- **F1–F7.** The table is a list, not a partition. F1 and F2 are told apart by whether the cause lies
  in the commit, and F2 lists the ancestry step's exit codes. Re-run discipline is procedural; F7
  records npm's 409 as a likely backstop. Unknown: whether a rejected version number can be reused.
  D6 never reuses one.
- **O3, O4 and D10.** The release ticket's statuses are fixed for every stage. A fix from F2 is a new
  code ticket landing before the release ticket tags again, so D10's window ends at the tag that first
  stages. Conflict check: hard rule 4. Each stage 8 names its surfaces: terminal, CI, registry and
  the user's report.
- **DS1–DS3.** Every place a round 2 reviewer named is listed. OQ-022 is no longer extended; OQ-028
  takes the new harness.
- **Unknowns carried, not assumed.**
  - Whether `npm stage publish` runs `prepublishOnly`; W6 runs the gate explicitly either way.
  - Whether its log prints a shasum; if not, (c) compares the other fields.
  - What the Staged Packages tab shows (OQ-027).
  - Whether a staged-then-approved version carries provenance; RP6 (b) checks it, and F6 handles it.
  - How long a staged version is kept.
  - Whether staging counts as the first publish (MN6).
  - Whether `npm whoami` answers in an OIDC job; nothing uses it.
