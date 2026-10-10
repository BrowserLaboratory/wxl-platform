# Agent instructions

Shared project instructions for the coding assistants Claude Code and Codex. Use the
shared contract and active-runtime section of [docs/agents/runtime.md](docs/agents/runtime.md)
when invoking skills, delegating, or configuring tools; use its handoff section when
writing or resuming from a handoff. Reuse context already read unless it changed. Each runtime owns its project
skills: Claude Code `.claude/skills/`, Codex `.agents/skills/`. Same-named skills may differ,
tuned to each vendor's prompting guidance; resolve helpers relative to the loaded skill.
Claude Code imports this file through `CLAUDE.md`; keep project rules here.

Skill names below use Claude's `/name` notation. In Codex explicitly use `$name`
or select it in `/skills`; an upstream instruction to call the Skill tool means
load and follow the named project SKILL.md using the active host's supported mechanism.

## Project Charter

**Web eXploitation Laboratory (WXL)** — a pure-frontend web security range: each challenge's
backend runs inside the learner's own browser tab, with no server.

- **For:** a range that makes it easy for a teacher to prepare a class and for a student to
  practise at home; served at `wxl.browserlab.online`.
- **Serves:** teachers who fork it into a range of their own, and their students.
- **Must:** run entirely in the browser; keep each learner's work on the learner's own machine;
  stay forkable, so `pnpm fork:init` and a static host (Cloudflare Pages or GitHub Pages) are
  all a teacher needs.
- **Does not:** grow a challenge bank. It keeps a few demonstration challenges, and adds one only
  to exercise a new platform feature.

Domain vocabulary lives in [`CONTEXT.md`](CONTEXT.md). Read it before naming anything in a spec,
an interface string, or a document; update it in the same change that adds or changes a term.

## Delivery model

Work ships as **epics**. One epic = one spec = one pass through the pipeline = one demoable
increment. Finish an epic, then return to stage 1 for the next one. A new challenge is an epic
of its own: [docs/agents/challenge-pipeline.md](docs/agents/challenge-pipeline.md).

Round 0 for this repository was adopting this workflow into a platform that already existed; it
carried no spec, only the existing gates. See
[ADR-0004](docs/adr/0004-adopt-harness-agile-in-a-running-product.md). Every ticket after it
has a spec behind it.

## Pipeline

| # | Stage | Skill | Gate before moving on |
|---|---|---|---|
| 1 | Converge the requirement | `/grill-with-docs` | user confirms shared understanding |
| 2 | Write the spec | `/to-spec` | spec **and** traceability matrix exist |
| 3 | Adversarial review | 4 subagents, ≤2 rounds | zero P0 findings |
| 4 | Break into tickets | `/to-tickets` | user approves the breakdown |
| 5 | Implement | `/implement` + `/tdd` | test plan table approved, then red → green |
| 6 | Review the change | `/code-review` | direction and requirement confirmed |
| 7 | Security review | `/security-review` | findings triaged and resolved |
| 8 | End-to-end | see workflow doc | behaviour verified on the ticket's preview deployment |
| 9 | Land it | PR into `main`, merged by squash | on `main` |

Stage detail, gates, exceptions, and the epic close-out:
**[docs/agents/workflow.md](docs/agents/workflow.md)**.

**[docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) is the tracker configuration** —
read it before `/to-spec` or `/to-tickets` writes a file. Its paths and statuses override
upstream examples; use the existing configuration without asking to set it up again.

## Hard rules

1. **One branch per ticket:** `tickets/<ticket-id>/<ticket-slug>` (e.g. `tickets/T-0007/session-store`).
   Ticket ids are global, sequential, and permanent — branch names depend on them never changing.
2. **Two tables gate a ticket's tests.** A **test plan table** before the first test is written, which
   the user approves; a **coverage report table** when the ticket closes. Between them, `/tdd` governs
   the loop: one seam, one test, one minimal implementation per cycle.
3. **Adversarial review runs a frozen prompt.** Round 2 replays round 1's prompt verbatim; only the
   spec version changes. Two rounds is the ceiling. P0 findings surviving round 2 mean the epic is
   too large: split it and restart at stage 1.
4. **Verify against the surface that actually runs the behaviour.** Challenge and platform behaviour
   runs in the browser: drive the real page, and for challenge pages open the Browser panel — a
   Code-panel-only run skips the whole presentation layer. State which surface a verification
   covers whenever you report one.
5. **Skills own their output.** Every `git commit` invocation (including amend) must use `/tw-emoji-commit`, PR descriptions use
   `/tw-emoji-pr-note`, release notes use `/tw-emoji-release-note`. Load the project copy even if a global skill has the same name. Generate and sanitize
   the message with that skill, then use a UTF-8 message file for Git. If one is
   unavailable, stop the affected action and report; do not write a fallback message.
6. **Intended vulnerabilities are not findings.** A challenge is vulnerable on purpose; the line
   between a teaching vulnerability and a defect is [ADR-0005](docs/adr/0005-security-review-expected-findings.md).

## Language

All Chinese output uses Taiwan Traditional Chinese, including conversation, documents,
comments and Git messages. Keep customary English technical terms (commit, PR, API,
cache, log, debug). Correct inconsistent source wording before presenting it.
Document language and bilingual sync rules: [docs/agents/language.md](docs/agents/language.md).

## Repository layout

```
platform/                         the VitePress site (srcDir): pages, challenges, public assets
  challenge/<slug>/               one challenge: index.md brief + src/ application
  zh-TW/                          the Traditional Chinese mirror of every page
tests/challenges/<slug>.spec.ts   a challenge's exploit spec (Playwright)
.vitepress/                       site config, theme, workers
chall-wasm/                       Rust crates compiled to the challenge runtimes' WASM
scripts/                          challenge, redirect and fork tooling
.proj.specs/                      specs, traceability, review rounds, OPEN-QUESTIONS.md
.proj.tickets/                    tickets; status lives in frontmatter
.proj.handoffs/                   session handoffs; local only, gitignored
.proj.research/                   finished analyses and notes; local only, gitignored
docs/adr/                         architecture decisions
docs/agents/                      the docs this file points at
```

Both `.proj.specs/` and `.proj.tickets/` are committed: they are the evidence chain behind every
review and every deferral. `.proj.handoffs/` is not: a handoff expires, so it stays out of history.

## Build and test commands

`package.json` lists the scripts. The ones an agent needs and cannot infer:

- `pnpm build` needs the Rust toolchain and `wasm-pack`; `pnpm wasm:build` alone rebuilds the runtimes.
- `pnpm test` runs vitest; `pnpm test:smoke` and `pnpm test:challenges` run Playwright against a built site.
- `pnpm challenge:verify <slug>` is a challenge's release-blocking gate (L1–L3); add `--blind` for L4.
- `python3 scripts/verify-project.py` checks the agent configuration (Python 3.11+), not product behaviour.

Environment pitfalls that cost time: [docs/agents/platform-notes.md](docs/agents/platform-notes.md).

## Reference

- **[docs/agents/workflow.md](docs/agents/workflow.md)** — the nine stages in full: entry conditions, gates, epic close-out, branching and landing.
- **[docs/agents/challenge-pipeline.md](docs/agents/challenge-pipeline.md)** — how authoring a challenge maps onto the nine stages and the `wxl-*` skills.
- **[docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)** — where specs and tickets live, ticket frontmatter, the six status views, how blocking is derived.
- **[docs/agents/review.md](docs/agents/review.md)** — the four adversarial-review axes, P0/P1/P2 grading, and the two-stage security review.
- **[docs/agents/language.md](docs/agents/language.md)** — which documents are English, which are Traditional Chinese, and how the bilingual spec stays in sync.
- **[docs/agents/domain.md](docs/agents/domain.md)** — how to consume `CONTEXT.md` and ADRs while exploring.
- **[docs/agents/platform-notes.md](docs/agents/platform-notes.md)** — the Browser panel's sandbox, test-runner quirks, local server cleanup.
