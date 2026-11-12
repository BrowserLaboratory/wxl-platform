# Releasing create-wxl and WXL

This procedure applies upstream only: in the upstream repository (`UPSTREAM_SLUG` in
`scripts/fork-init.ts`). A fork or a teacher's range carries this file and
`.github/workflows/publish-npm.yml`, but the workflow's job is skipped outside upstream and npm's
trusted publisher names upstream only, so nothing here applies there.

Spec: `.proj.specs/0009-npm-trusted-publishing/` (decisions D1–D10, U1–U10). A release is the epic
or maintenance ticket that bumps the version; it follows the steps below in order. `<V>` is the root
manifest's `version`, equal to create-wxl's.

## How a release reaches npm

Pushing the tag `v<V>` starts two workflows. `release.yml` makes the GitHub Release and its asset.
`publish-npm.yml` checks that the tagged commit is on `main`, runs the publish gate (X1–X9), then
runs `npm stage publish` through npm's trusted publishing (OIDC): no token is stored anywhere. The
staged version is not installable until the upstream maintainer compares it and approves it on
npmjs.com with 2FA. Each version carries a provenance statement naming the repository, workflow,
tag and commit that built it.

The gate's X9 and the ancestry step guard against mistakes; they are not controls (D8). The
controls are MN7, MN2, MN1, the comparison and approval in RP5, and MN3.

## Release steps

| Step | What | Who |
|---|---|---|
| RP0 | Each code ticket's stage 8, before its PR merges | agent |
| RP1 | The release change lands on `main` | agent; the user merges |
| RP2 | One tag, confirmed first, pushed alone | agent, after the user confirms |
| RP3 | CI makes the GitHub Release and stages on npm | CI |
| RP4 | The release notes become the CHANGELOG entry | agent |
| RP5 | Compare the staged entry, then approve or reject | user |
| RP6 | Verify the registry, provenance and a fresh range | agent |
| RP7 | Failures, re-runs and rejections | agent, user |

RP0: A code ticket is one that changes a file under `create-wxl/`, `.github/workflows/`, `tests/`
or `scripts/`. Before its PR merges, after `pnpm --dir create-wxl install --frozen-lockfile`, record
three outputs in the ticket: (a) `npm pkg get repository` in `create-wxl/` prints the `repository`
object (type `git`, the root manifest's URL, directory `create-wxl`); (b) `node
scripts/check-publish.mjs` in `create-wxl/` exits 1 with `checkPublish failed: ` and a named check;
(c) the PR's CI run passes, including the workflow tests. Remove `create-wxl/dist/` and
`create-wxl/LICENSE` afterwards.

RP1: Bump both versions (the root `package.json` and `create-wxl/package.json`, equal, exact) and add
the CHANGELOG entry generated with `/tw-emoji-release-note`. The skill only writes the entry; this
step creates and pushes no tag. The change lands on `main` by squash merge.

RP2: The user confirms two things: the tag name `v<V>`, and RP1's squash-merge commit SHA. The agent
then runs `git ls-remote --tags origin v<V>`; if it prints anything, the agent stops and reports and
never force-pushes. Otherwise it creates an annotated tag with the message `WXL <V>` at that SHA and
pushes it alone with `git push origin v<V>`. In this repository the agent must never `git push
--tags`, whatever a general rule says (U8). One tag at a time: the next tag waits until the previous
tag's `publish-npm.yml` run has ended.

RP3: `release.yml` makes the GitHub Release. `publish-npm.yml` runs the ancestry guard and the
publish gate, then `npm stage publish` stages create-wxl `<V>`.

RP4: The agent replaces the GitHub Release's notes with the CHANGELOG entry, titled `WXL <V>`
(OQ-019 stays open).

RP5: The user approves with 2FA only if all of (a)–(d) hold and (c) compared at least one field.
(a) The package's Staged Packages tab on npmjs.com shows exactly one staged entry in all, for `<V>`;
any other entry is rejected and recorded. (b) `publish-npm.yml`'s run for `v<V>` concluded success.
(c) Each field the tab shows, or `npm stage view <id>` shows in the user's own signed-in terminal,
matches the run: repository = the upstream repository, workflow = `publish-npm.yml`, ref =
`refs/tags/v<V>`, commit = RP2's confirmed SHA, shasum = the one in the run's log. If no field can
be compared, the user decides and the record says so. (d) `release.yml`'s run for `v<V>` concluded
success. The fields seen go into OQ-027.

RP6: The agent checks three things, retrying a failed read up to three times, five minutes apart.
(a) `npm view create-wxl version` and `npm view create-wxl dist-tags.latest` print `<V>`. (b) `npm
view create-wxl@<V> dist.attestations` is present, and the provenance statement at its URL names the
upstream repository, `.github/workflows/publish-npm.yml`, `refs/tags/v<V>` and RP2's SHA. (c) `npm
create --yes wxl@latest <folder> -- --no-setup` in an empty folder exits 0 and writes `range.json`
with `<V>` and RP2's SHA.

RP7: Failures, re-runs and rejections follow F1–F7 below.

## The user's steps outside the repository

In this order. Each is reported in the release ticket that first depends on it.

| Step | What | When |
|---|---|---|
| MN7 | Tag ruleset for `v*` | Before any `v*` tag |
| MN2 | Environment `npm`, tags `v*` only | Before MN1, and before any `v*` tag |
| MN1 | npm trusted publisher; revoke tokens | After MN2, within 2 days before the first tag |
| MN3 | Require 2FA and disallow tokens | After the first approval |
| MN4 | Approve or reject each staged version | Every release |
| MN5 | Delete the trusted publisher before a rename | When that happens |
| MN6 | Recreate an expired trusted publisher | Before a new tag or re-run while it is expired |

MN7: On GitHub, Settings → Rules → Rulesets, create a tag ruleset targeting `v*` in the repository
`wxl-platform` of the organisation `BrowserLaboratory`. It restricts creations to the upstream
maintainer and restricts deletions and updates, so a release tag cannot move or disappear (U10).

MN2: On GitHub, Settings → Environments, create the environment `npm` in the repository
`wxl-platform` of the organisation `BrowserLaboratory`. No required reviewer. Deployment branches
and tags: "Selected branches and tags" with exactly one rule, of type tag, pattern `v*` (U2). Do
this before any `v*` tag is pushed: a workflow that names a missing environment makes GitHub create
it without that rule.

MN1: On npmjs.com, create-wxl → Settings → Trusted publishing, add one GitHub Actions publisher
with six fields: provider GitHub Actions; owner `BrowserLaboratory`; repository `wxl-platform`;
workflow file `publish-npm.yml`; environment `npm`; allowed actions with stage on, direct publish
off and dist-tag off. It must be the package's only trusted publisher. In the same sitting, revoke
every token that can publish create-wxl (U6). Do it no more than two days before the first tag: a
configuration without a successful first publish expires after two days.

MN3: After the first staged version is approved, create-wxl → Settings → Publishing access:
"Require two-factor authentication and disallow tokens".

MN4: Approve or reject each staged version, as RP5 says, with 2FA.

MN5: Delete MN1's configuration before renaming or transferring the GitHub organisation or
repository.

MN6: If MN1's configuration has expired, delete it and create it again (it cannot be edited), with
the same six fields, reported again in that release's record.

## Failures, re-runs and rejections

| Case | Situation | What happens |
|---|---|---|
| F1 | Not staged; cause outside the commit | Fix the cause, re-run the job |
| F2 | Not staged; cause in the commit | No re-run; a new code ticket, then the next patch |
| F3 | A staged version fails RP5 | Reject; never re-run that tag; next patch |
| F4 | `release.yml` failed, running or cancelled | No approval until it succeeds |
| F5 | Two runs overlap | The newer pending run cancels the older pending one |
| F6 | RP6 fails after approval | Deprecate `<V>`; next patch |
| F7 | A re-run after approval or rejection | Not allowed; npm refuses (409) |

F1: `publish-npm.yml` did not stage (`npm stage publish` did not run or exited non-zero, and the
Staged Packages tab shows no entry for `<V>`), and the cause is outside the repository: a registry
or network error (including X6 when its log shows `ls-remote` could not reach GitHub); MN1 missing,
expired or wrong; MN2 wrong; a run cancelled by F5. Fix the cause (MN6 if expired), then re-run the
job.

F2: As F1, but the cause is in the commit: a gate check failing on its own data, or the ancestry
step exiting non-zero (exit 1: not on `main`; any other code: the checkout lacked `origin/main`, a
workflow defect). Do not re-run. A new code ticket fixes it, and the fix ships as the next patch.

F3: The user rejects the staged version; that tag is never re-run; the next patch follows. If the
entry looks unauthorised, the GitHub Release for that tag is deleted as well. The tag itself stays,
since MN7 forbids deleting it.

F4: While a version is staged, `release.yml` for `v<V>` failed, is still running or was cancelled:
no approval until it succeeds. Re-run it when the cause is outside the repository (runner, network,
a download); otherwise reject (F3).

F5: GitHub keeps one running and one pending run of the `publish-npm` group, and a newer pending
run cancels the older pending one. RP2's one-tag-at-a-time rule avoids this; a cancelled run is F1.

F6: After approval, RP6 fails after its retries (no or wrong provenance, `npm create` failing,
`latest` not `<V>`). The user deprecates the version with `npm deprecate create-wxl@<V>
"<reason>"` (2FA), and the next patch follows.

F7: A run is re-run for a tag whose version was already approved or rejected. RP7 does not allow
this; if it happens, npm refuses a version already staged (409, seen at 3.1.0 in T-0067) and nothing
changes.

Tags are never moved or deleted. A `v<V>` that never became installable on npm is still an upstream
release for ADR-0009, which decides by tag.

## What this procedure does not protect against

- Anyone holding the upstream maintainer's push credentials, the agent included, can push a `v*`
  tag at any commit; that commit's own workflow runs, guards and all. RP5's commit comparison
  against the SHA confirmed in RP2 is what catches it.
- Any code the job runs can request an OIDC token: the actions, pnpm, Node, the npm CLI, create-wxl's
  runtime dependencies and the repository's code.
- On a terminal, `npm publish --ignore-scripts`, `npm publish <tarball>` or `npm stage publish` may
  skip the gate. Each still needs a credential that MN1 revokes and MN3 refuses, and RP5 (a)
  rejects an unexpected staged entry.
- The upstream maintainer can still publish directly with interactive 2FA; this is accepted.
