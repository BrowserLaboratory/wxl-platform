---
name: wxl-create
description: Use when creating a new challenge for the wxl platform — scaffolding the challenge directory, generating vulnerable application code, writing the Playwright exploit spec, and handing off to wxl-verify. Triggers on "create challenge", "new challenge", "出題", "建立題目". Not for mutating an existing challenge (use wxl-mutate) or running the release gate alone (use wxl-verify).
---

Create a new wxl challenge — from parameter collection through scaffolding, vulnerable code generation, exploit-spec authoring, and a best-effort self-test — then hand off to the `wxl-verify` skill for the release-blocking gate and auto-fix loop. It uses only tools that both Claude Code and Codex provide (`Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`), and asks the user questions through plain-text question blocks.

**Inside the delivery pipeline** a new challenge is an epic ([docs/agents/challenge-pipeline.md](../../../docs/agents/challenge-pipeline.md)): stage 1 covers Step 0's design dimensions and the spec settles them, so enter this skill at Step 1 with the spec's decisions as given parameters, and write the exploit spec (Step 5) before the vulnerable code (Step 3) so `/tdd` sees it fail first.

**Input**: The argument after the trigger is an optional free-text description of the challenge to create. Examples:

- (no arguments — will ask everything interactively)
- `建一個 flask 的 SQLi 題目叫 login-bypass`
- `name: xss-form, backend: fastapi, vuln: reflected XSS, difficulty: medium`

## Overview

`wxl-create` owns the **Create** verb only. It scaffolds one new challenge, generates a real exploitable vulnerability, writes an e2e exploit spec, optionally self-tests it, and then hands the challenge to `wxl-verify` for the L1–L3 gate. It never mutates existing challenges (that is `wxl-mutate`) and never runs the L4 blind cross-check (that is `wxl-crosscheck`, run at pipeline stage 8 before the challenge lands).

The skill is invoked when the user types the create trigger, says "create challenge / new challenge / 出題 / 建立題目", or describes a challenge to author.

## Workflow

```dot
digraph flow {
    rankdir=LR;
    node [shape=box];
    grill     [label="0. Grill\nDesign Intent"];
    collect   [label="1. Collect\nParameters"];
    scaffold  [label="2. Scaffold"];
    generate  [label="3. Generate\nVulnerable Code"];
    metadata  [label="4. Frontmatter\n+ Brief"];
    spec      [label="5. Write\nExploit Spec"];
    selftest  [label="6. Best-effort\nSelf-test"];
    handoff   [label="7. Hand off to\nwxl-verify", shape=doublecircle];
    grill -> collect -> scaffold -> generate -> metadata -> spec -> selftest -> handoff;
}
```

### Step 0: Grill the challenge design to convergence

- **What**: Before collecting parameters, run a design-convergence interview that applies the `grilling` technique **inline as prose** (technique origin: the project `grilling` skill). Do NOT dispatch that skill — the method is inlined here so the flow works the same in Claude Code and Codex. The goal is to converge the user's *design intent* until the generated vulnerability code can hit it precisely, before any file is touched.
- **How**:
  1. **Ask one question at a time.** Emit a single plain-text question, include your recommended answer, and wait for the user's reply before asking the next. Batching multiple questions at once is bewildering — never do it.
  2. **Look up facts, ask only decisions.** Anything resolvable from the environment — whether `platform/challenge/<slug>/` already exists, whether the canonical reference `platform/challenge/door-is-open/src/app.py` is readable, which extra packages a vuln class needs — SHALL be resolved by inspecting the filesystem or tools rather than asked. Reserve questions for genuine design decisions that are the user's to make.
  3. **Grill the design, not just the fields.** Walk the design decision tree, resolving dependencies between decisions one by one, covering at minimum:
     - **Vulnerability realism & non-obviousness** — is it a real, exploitable, non-trivial bug (never a bare `eval(user_input)` / `os.system(input())`)?
     - **Expected exploitation path** — what exact steps take a solver from the HTML UI to `/flag.txt`, and does that path actually hold end-to-end?
     - **Difficulty calibration** — does the intended difficulty match the scenario and the complexity of the exploitation path?
     - **Misdirection / red herrings** — are decoys wanted, and how strong? (This depends on the difficulty decision.)
     - **Flag placement plausibility** — is reading the flag from `/flag.txt` reachable only through the intended vulnerability, not by an unintended shortcut?
  4. **Do not act until shared understanding.** SHALL NOT run `pnpm create:challenge`, generate code, or write any file until the user confirms the design is agreed.
  5. **Fast-pass when already clear.** If the initial prompt already describes a precise, generatable design, summarize it back and ask for a single confirmation instead of grilling every dimension.
  6. **Feed conclusions into Step 1.** Treat every design point settled here — especially `slug`, `backend`, `vuln`, `description`, `difficulty` — as an already-provided parameter, so Step 1 skips those and asks only for what Step 0 left open.
- **Verification**: The user has confirmed a shared design; the settled parameters are carried into Step 1; no file was created or modified during Step 0.

### Step 1: Collect parameters

- **What**: Collect the challenge parameters, extracting any already supplied in the initial message or settled during Step 0, and asking only for the rest.
- **How**: Scan the initial argument first. For each missing parameter, emit a plain-text question block and wait for the user's next message. Group questions into rounds and skip a whole round when all its parameters are already known.

Parameters:

| Parameter | Key | Required | Default |
|-----------|-----|----------|---------|
| Challenge name (slug) | `slug` | Yes | — |
| Backend type | `backend` | Yes | — |
| Vulnerability type | `vuln` | Yes | — |
| Challenge description | `description` | Yes | — |
| Difficulty | `difficulty` | Yes | — |
| Flag | `flag` | No | `FLAG{<slug>_<random8hex>}` |
| Title | `title` | No | Slug → Title Case |

Plain-text question block shape (one block per round):

```
📋 Round <N> — <topic>:
  1) <option-A>
  2) <option-B>
  3) <option-C>
Please reply with a number, the option name, or a custom value.
```

- **Round 1 (required)**: slug (validate kebab-case `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`; re-ask if invalid), backend (`1) flask  2) fastapi  3) php`), vuln (free text: SQLi, XSS, SSRF, LFI, RCE, XXE, SSTI, IDOR, …).
- **Round 2 (content)**: description (scenario narrative used to generate the code), difficulty (`1) easy  2) medium  3) hard`).
- **Round 3 (optional with defaults)**: flag (offer the default format), title (offer slug→Title Case).

After collecting, show a summary and a plain-text confirmation block (`1) 確認  2) 修改參數`). Wait for the reply; on `2`, re-ask the specific parameter.

- **Verification**: All required parameters resolved; `slug` matches the kebab-case regex; the user confirmed with `1`.

### Step 2: Scaffold

- **What**: Create the challenge skeleton via the existing scaffold CLI (never duplicate scaffold logic in prose).
- **How**: Run via Bash:

  ```bash
  pnpm create:challenge --name "<slug>" --backend "<backend>" --difficulty "<difficulty>" --flag "<flag>" --title "<title>"
  ```

  Omit `--flag` to let the script auto-generate. Then branch on the exit status:

  - **Exit status 0**: continue to Step 3.
  - **Exit status 1**: nothing was written; the error names an existing slug or an invalid argument. Show the error and ask, in a plain-text block, for the reply `change` or `cancel`. On `change`, re-ask the parameter the error names (the slug when the challenge already exists) and re-run; on `cancel`, stop. Exit status 1 is the only status that re-asks a parameter.
  - **Exit status 2**: the challenge was created, but `platform/public/_redirects` was not regenerated. Show the user the message from stderr, which says that committing the challenge regenerates the file, then continue to Step 3 with the same slug. Keep `platform/challenge/<slug>/`.
  - **Exit status 3**: the scaffold was written with its number, but keygen failed. Show the user the message from stderr, which holds keygen's output, and stop. Tell the user to fix the cause, run `pnpm challenge:keygen <slug>`, and then resume this skill at Step 3 with the same slug; as with exit status 2, committing the challenge regenerates `platform/public/_redirects`. Keep `platform/challenge/<slug>/`.

  `platform/public/_redirects` is generated from the challenges; do not edit it by hand. `pnpm create:challenge` and the pre-commit hook regenerate it when challenges change. Commit it together with them: GitHub Pages does not read it, but CI checks that it matches the challenges. If CI reports it stale, run `pnpm redirects:generate` and commit the result.
- **Verification**: Exit status 0, or exit status 2 with its message shown to the user; `platform/challenge/<slug>/` exists.

### Step 3: Generate vulnerable application code

- **What**: Rewrite the scaffolded skeleton with real, exploitable vulnerability code matching `vuln` and `description`.
- **How**:
  1. **Consult the capability registry (if applicable).** Match `vuln` against the registry table below. If a trigger regex matches, read the mapped reference document first and let its recognition heuristics shape the vulnerability.

     | Trigger regex | Reference file |
     |---------------|----------------|
     | `idor\|jwt\|path.?traversal\|access.?control\|broken.?access` (case-insensitive) | `reference/a01-access-control.md` |

     New capability packs extend this behavior by appending a row — no other workflow change required.
  2. **Read the skeleton** (`platform/challenge/<slug>/src/app.py` for Flask/FastAPI, or `platform/challenge/<slug>/src/index.php` for PHP).
  3. **Read the canonical reference** — the literal directory `platform/challenge/door-is-open/` (not the slug being created) — as the ONLY code-style reference. Read `platform/challenge/door-is-open/src/app.py`. If it is unreadable, halt with a deterministic error containing the literal path `platform/challenge/door-is-open/` and leave no partial files.
  4. **Write** the vulnerable code (Write tool, overwriting the skeleton). It SHALL follow the reference structure; read the flag via `open("/flag.txt").read().strip()` (Python) or `file_get_contents('/flag.txt')` (PHP); contain a real, exploitable, non-trivial vulnerability (no bare `eval(user_input)` / `os.system(input())`); include HTML UI for realistic attack surface; mark the vulnerable line with `# Vulnerability: <brief explanation>`.
  5. Note any extra packages the vuln needs (e.g. `sqlite3`) for Step 4.

  Backend notes — Flask: `from flask import Flask, request, Response`, `@app.route()`. FastAPI: `from fastapi import FastAPI`, `from fastapi.responses import HTMLResponse`, `@app.get()` / `@app.post()`. PHP: `<?php`, `$_GET` / `$_POST`, `file_get_contents('/flag.txt')`.
- **Verification**: The app file contains a `# Vulnerability:` marker and a clear exploitation path to the flag; no hardcoded `localhost` / `127.0.0.1` / `0.0.0.0` (the app runs in WASM).

### Step 4: Update frontmatter and write the engagement brief

- **What**: Fill `index.md` frontmatter, then replace the body placeholder with an **engagement brief** — the challenge described as a penetration-testing engagement the solver has been commissioned to carry out.
- **How**:
  1. Read `platform/challenge/<slug>/index.md` and Edit the frontmatter to set `description` (1–2 sentences naming the target and the promise it makes), `tags` (vuln keywords + backend, e.g. `[sql, injection, flask, sqlite]`), `source_visible: false`, and `packages` (extra Python packages, else `[]`). Leave `title`, `layout`, `difficulty`, `category`, `backend`, `app`, `date` as the scaffold set them. Four of those — `backend`, `difficulty`, `tags`, `category` — belong to `pnpm challenge:retype`, and `wxl-mutate` is the stage that runs it; the rest are scaffold-only.
  2. Read the canonical prose reference `platform/challenge/door-is-open/index.md` and copy its **required** section structure. **That file is the only definition of which sections a brief must have.** This step names optional sections in item 4, but never the required ones, so the required structure lives in exactly one place.
  3. Write the brief over `TODO: Write challenge description here.`. State the objective as a **proposition the solver is commissioned to prove** — what the target claims about itself, and what disproving it looks like. Keep the attack technique, the vulnerable parameter, and the exploitation steps for the exploit spec in Step 5; the brief carries the commission, not the walkthrough.
  4. Add an optional section only when its trigger fires:

     | Optional section | Write it when |
     |------------------|---------------|
     | Timeline | the challenge has a time limit or runs in stages |
     | Point of contact | the challenge asks the solver to report to someone |
     | Authorisation & legal | the challenge imitates a real-looking third-party brand |
     | Prior findings | the challenge builds on an earlier challenge's result |
     | Constraints | the challenge rules out a technique, such as brute force |

  5. Let the interface speak for itself on three facts: the rendered page already shows the tool tabs (from `tools`), the difficulty badge, and the category badge. The brief describes the engagement; those describe the platform. This is a closed list of three — every other frontmatter field is fair game, and the brief is expected to develop the same scenario `description` summarises and to name the target that `tags` classifies.

     What this rules out is a **sentence that tells the reader** which tools are available, how hard the challenge is, or which taxonomy it sits in. It does not rule out the ordinary English words those values happen to be spelled with: a brief may call the target a web application and may say the source code was not released, even where `category` is `web` and `tools` contains `code`. A substring search over the body is the wrong test and produces exactly those two false positives on the canonical reference itself.
  6. When the challenge has a locale mirror (`platform/<locale>/challenge/<slug>/index.md`), give it the same number of `##` headings in the same order, each one a localisation of the root-locale heading beside it, and the same facts. Localise the wording; keep the facts and the ordering identical. A localised heading is not the root-locale string, so the mirror's heading set never equals the root-locale set — position, not string equality, is what is checked.
- **Verification**:
  - `index.md` frontmatter contains `description`, `tags`, `source_visible: false`, and the body no longer contains the TODO placeholder.
  - The **root-locale** body's set of `##` headings is a superset of the canonical reference's. The mirror is checked against the root-locale body by heading count and order instead.
  - A reviewer reads the brief and confirms no sentence tells the reader which tools are available, how hard the challenge is, or what category it belongs to. The executor is the reviewer and the exit is that sentence-by-sentence confirmation — there is no grep for this, and item 5 says why.

### Step 5: Write the Playwright exploit spec

- **What**: Render `tests/challenges/<slug>.spec.ts` from the template.
- **How**: Read `templates/exploit-spec.ts.tmpl` beside this SKILL.md. If it does not exist, halt, emit `template not found: templates/exploit-spec.ts.tmpl`, and delete any partial spec so the repo stays clean. Substitute:

  | Placeholder | Source |
  |-------------|--------|
  | `{{SLUG}}` | the kebab-case slug |
  | `{{BASE_URL}}` | `http://localhost:5173/challenge/<slug>/` |
  | `{{EXPLOIT_PATH}}` | the URL path the exploit fetches (e.g. `/download?id=1`) |
  | `{{EXPLOIT_PAYLOAD}}` | the request body/query payload (URL-encoded form, or `''` for plain GET) |
  | `{{FLAG_REGEX}}` | `^(FLAG\|CTF)\\{[^}]+\\}$` |

  Write the rendered spec via the Write tool and confirm it exists.
- **Verification**: `tests/challenges/<slug>.spec.ts` exists, imports `@playwright/test`, and asserts the response body matches `{{FLAG_REGEX}}`.

### Step 6: Best-effort self-test via chrome-devtools-mcp

- **What**: Best-effort confirm the vuln is exploitable through a real Chromium instance. **Never halt** on failure here — degrade and continue to Step 7.
- **How**: If `chrome-devtools-mcp` is unavailable, emit `MCP unavailable; please run pnpm challenge:verify <slug> manually after dev server is up.` and continue. If `pnpm docs:dev` is not reachable at `http://localhost:5173`, emit `dev server not running; please start pnpm docs:dev and run pnpm challenge:verify <slug> manually.` and continue. Otherwise make up to three attempts (navigate to the challenge, wait for the Service Worker, send the exploit, match `FLAG_REGEX`); a failed attempt MAY revise `platform/challenge/<slug>/src/<app>` once (max two revisions, three attempts total). After three failures, emit `self-test inconclusive after 3 attempts; please run pnpm challenge:verify <slug> manually and inspect.` and continue. Do NOT touch the spec file, frontmatter, or `flag.txt` in this step.
- **Verification**: Either a "self-test passed" message, or one of the degrade messages above — the workflow always continues.

### Step 7: Hand off to wxl-verify

- **What**: Run the release-blocking gate and, on any non-clean result, enter the shared auto-fix loop.
- **How**: Run `pnpm challenge:verify <slug>` (without `--blind`) and hand the result **entirely** to the `wxl-verify` skill's Step 1 / Step 2 branching — do NOT restate the exit-code logic here. `wxl-verify` owns the single branch decision: a clean gate → done; exit 1 **or** exit 0 with L1/L2 warnings in stdout (e.g. flag-format mismatch, hardcoded localhost) → its auto-fix loop (plain-text confirmation, `max_fix_attempts` from `.wxl-verify/config.yaml`). When the gate is clean, emit a completion summary, for example:

  ```
  ✓ Challenge "<slug>" 建立完成！
    platform/challenge/<slug>/index.md
    platform/challenge/<slug>/src/<app-file>
    platform/challenge/<slug>/src/flag.txt
    tests/challenges/<slug>.spec.ts
  可用 pnpm docs:dev 預覽，或繼續建立下一個題目。
  ```

  The Create flow SHALL NOT run `--blind`; L4 is reserved for `wxl-crosscheck`.
- **Verification**: `pnpm challenge:verify <slug>` ends clean (directly or after the wxl-verify fix loop), or the loop stops within the configured limit with remaining issues surfaced.

## Anti-patterns

- ❌ **Generating a trivially obvious vuln** (`eval(user_input)`, `os.system(input())`).
  - ✅ Write a realistic, non-trivial vuln with an HTML attack surface and a clear path to `/flag.txt`.
  - **Why**: Trivial vulns are not solvable-as-intended challenges and fail L2/L3.
- ❌ **Skipping the canonical reference** and generating code from scratch.
  - ✅ Always read `platform/challenge/door-is-open/src/app.py` first; halt (with the literal path) if it is unreadable. Never fall back to `.archive/`, another `platform/challenge/` dir, a user path, or a globbed "next demo".
  - **Why**: The canonical reference is the single style contract; drift breaks consistency and is flagged by `/code-review`.
- ❌ **Hardcoding `localhost` / `127.0.0.1` in app code.**
  - ✅ The app runs in WASM, not a real server — never hardcode a host.
  - **Why**: L1/L2 flag hardcoded hosts.
- ❌ **Running `pnpm challenge:verify --blind` from Create.**
  - ✅ Create hands off to `wxl-verify` (L1–L3) only; the L4 blind solve is `wxl-crosscheck`, run at pipeline stage 8 before the challenge lands.

## Verification

Acceptance criteria for the Create flow:

- Files exist: `platform/challenge/<slug>/index.md`, `platform/challenge/<slug>/src/<app>`, `platform/challenge/<slug>/src/flag.txt`, `tests/challenges/<slug>.spec.ts`.
- `pnpm challenge:verify <slug>` exits 0.
- The registry table in `SKILL.md` and `SKILL.zhTW.md` contain the same rows.
