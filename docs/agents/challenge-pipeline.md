# Challenge pipeline

A new challenge is an epic: one spec, one pass through the nine stages in
[workflow.md](workflow.md). This file maps that pass onto the `wxl-*` skills and the release-blocking
gate. Vocabulary — challenge, number, engagement brief, proof of impact, white-box challenge,
unintended solution, exploit spec, blind solve — is defined in [`GLOSSARY.md`](../../GLOSSARY.md).

## Where a challenge lives

| Path | What |
|---|---|
| `platform/challenge/<slug>/` | the engagement brief (`index.md`) and the application under `src/` |
| `platform/zh-TW/challenge/<slug>/` | the Traditional Chinese brief |
| `tests/challenges/<slug>.spec.ts` | the exploit spec |
| `platform/public/_redirects` | the short-link rules, described below the table |

`platform/public/_redirects` is generated from the challenges; do not edit it by hand. `pnpm create:challenge`
and the pre-commit hook regenerate it when challenges change. Commit it together with them: GitHub
Pages does not read it, but CI checks that it matches the challenges. If CI reports it stale, run
`pnpm redirects:generate` and commit the result.

A number is assigned once by `pnpm create:challenge` and is unique within this site only.

## The nine stages for a challenge

| # | Stage | For a challenge |
|---|---|---|
| 1 | Converge | `/grill-with-docs`, walking the design dimensions in `wxl-create` Step 0: vulnerability realism, the intended exploitation path, difficulty, red herrings, flag placement |
| 2 | Spec | `/to-spec`. The spec states the vulnerability taught, the intended path from the page to the flag, the trust boundaries of [ADR-0005](../adr/0005-security-review-expected-findings.md), and what counts as an unintended solution. Every intended step and every boundary is a row of `traceability.md` |
| 3 | Adversarial review | The red-team axis works the unintended-solution boundary on paper |
| 4 | Tickets | `/to-tickets`; usually the challenge itself, then its Traditional Chinese brief |
| 5 | Implement | `/implement` + `/tdd`, with the exploit spec as the first test: write `tests/challenges/<slug>.spec.ts` and watch it fail, then use `wxl-create` (from Step 1, with the spec's decisions as given parameters) to scaffold and write the vulnerable application until it passes. A metadata-only change uses `wxl-mutate` |
| 6 | Code review | `/code-review` |
| 7 | Security review | The project `security-review` skill, graded by ADR-0005 |
| 8 | End-to-end | `wxl-verify` (L1–L3) and `wxl-crosscheck` (L4 blind solve) both pass, and the page is checked in the Browser panel on the preview deployment |
| 9 | Land | as in [workflow.md](workflow.md) |

The blind solve is part of the release-blocking gate: a challenge does not reach `main` without it.
