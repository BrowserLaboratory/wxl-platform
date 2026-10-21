---
id: T-0031
title: wxl-create Step 2 branches on create:challenge's exit status
epic: 0007-gh-pages-range-fixes
status: review
blocked_by: [T-0030]
---

## Context

wxl-create's Step 2 runs `pnpm create:challenge` and today reads every exit status 1 as a name
collision, re-asking the name. With T-0030, status 1 means nothing was written, 2 means the
challenge was created without regenerating `_redirects`, and 3 means keygen failed after the
scaffold was written. Re-asking the name on 2 or 3 would leave an orphan scaffold that holds a
number. Step 2's plain-text menu also answers with `1` and `2`, which an agent can mistake for exit
statuses.

Spec: `traceability.md` revision 3, passage P7 and decision D13; `spec.en.md` "wxl-create".

## Deliverable

Step 2 in all four wxl-create skill files (`.claude` and `.agents`, English and Traditional
Chinese) handles each exit status as P7 requires.

## Acceptance criteria

- [x] P7: exit status 2 → surface W1, continue to Step 3 (AC-24)
- [x] P7: exit status 3 → surface W2 and stop, telling the teacher to run `pnpm challenge:keygen <slug>` once the cause is fixed and to resume at Step 3 (AC-24)
- [x] P7: only exit status 1 re-asks the name; the menu's choices are words, not digits; every status is written as "exit status N" (AC-24)
- [x] P7: Verification accepts exit status 0, and exit status 2 once its message is surfaced (AC-24)
- [x] The four files say the same thing, each in its own language
- [x] `python3 scripts/verify-project.py` passes

## 給使用者（zh-TW）

wxl-create 的 Step 2 依 `create:challenge` 的結束狀態分開處理：2 轉述訊息後繼續，3 轉述訊息後停下來，並請老師修好原因後重跑 keygen；只有 1 才會重問名稱。選單改用文字選項，避免和結束狀態的數字混淆。四份 skill 檔一起改。

## Comments

### 2026-10-21 — test plan (stage 5)

Rows: passage P7 (`traceability.md` revision 3, "Passages to rewrite"), checked by matrix row T05
for AC-24; decision D13; `spec.en.md` "wxl-create". The change is skill text only: Step 2 of
`.claude/skills/wxl-create/SKILL.md`, `.agents/skills/wxl-create/SKILL.md` and both
`SKILL.zhTW.md`. No seam 0007-S1 to S8 reaches these files, and S6's sentence check (E1, Z1 in the
same files) belongs to T-0039, so no new automated test is written. P7 is verified by stage 6
review of the diff, by the text checks X1 and X2 below, and by `python3 scripts/verify-project.py`.
The statuses the text describes (1: nothing written; 2: created, `_redirects` not regenerated, W1;
3: keygen failed after the scaffold was written, W2) are implemented and tested by T-0030 (C03–C09
at S4), not here.

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| stage 6 review of the diff (T05) | on exit status 2, Step 2 surfaces W1 (the challenge was created, `_redirects` was not regenerated, committing regenerates it) and continues to Step 3 without re-asking the name | Step 2, all four files | P7, AC-24 | status 2 is not read as a failure or a collision; the scaffold is kept; nothing tells the teacher to delete the directory or re-run `create:challenge` |
| stage 6 review of the diff (T05) | on exit status 3, Step 2 surfaces W2 (keygen's output) and stops, telling the teacher to run `pnpm challenge:keygen <slug>` once the cause is fixed and then to resume at Step 3 | Step 2, all four files | P7, AC-24 | the name is never re-asked; the scaffold is kept (it holds a number); the resume point is Step 3, not Step 2 |
| stage 6 review of the diff (T05); text check X1 | only exit status 1 re-asks the name; the menu's choices are words, not digits; every status in Step 2 is written as "exit status N" | Step 2, all four files | P7, AC-24 | statuses 0, 1, 2 and 3 are each named; no digit answers the menu; the Traditional Chinese files keep the English term "exit status N" |
| stage 6 review of the diff (T05) | Step 2's Verification accepts exit status 0, and exit status 2 once W1 was surfaced | Step 2's Verification bullet, all four files | P7, AC-24 | exit statuses 1 and 3 do not pass; `platform/challenge/<slug>/` exists for 0 and 2. Both `SKILL.zhTW.md` have no Verification bullet in Step 2 today (`SKILL.zhTW.md:90-93` at a54e917), so one is added |
| text check X2; English against Traditional Chinese at stage 6 review of the diff | the four files say the same thing, each in its own language | all four files | ticket AC "The four files say the same thing, each in its own language" | the two trees are byte-identical today (X2 exits 0 on a54e917) and stay so; the Traditional Chinese text uses Taiwan usage |
| `python3 scripts/verify-project.py` | the agent configuration still passes | both skill trees | ticket AC "`python3 scripts/verify-project.py` passes" | baseline on a54e917: PASS, 42 skills |
| `pnpm test --run` (regression) | the existing tests still pass; `fork-init.test.ts` and `upstream-guard.test.ts` name the wxl-create files but write their own fixture contents, so they do not read the changed text | whole repository | none new; regression only | baseline on a54e917: 127 files, 4203 passed, 1 skipped |
| stage 8 (not automated) | no V row is assigned to this ticket; V03 runs `create:challenge` directly, not through the skill. The stage 8 record states that the change is skill text, covered by the stage 6 review | — | — | surface: the skill text as an agent reads it; there is no browser surface |

Text checks, run from the worktree root:

- **X1** prints nothing after the change. On a54e917 it prints two lines from each English file
  (Step 2's How and Verification lines) and one from each Traditional Chinese file:

  ```bash
  for f in .claude/skills/wxl-create/SKILL.md .agents/skills/wxl-create/SKILL.md .claude/skills/wxl-create/SKILL.zhTW.md .agents/skills/wxl-create/SKILL.zhTW.md; do
    awk '/^### Step 2/{p=1;next} /^### Step 3/{p=0} p' "$f" | grep -n -i -E 'exit code|on `[0-9]`|`[0-9]` (重問|停止)|[0-9]\)'
  done
  ```

- **X2** exits 0:

  ```bash
  diff .claude/skills/wxl-create/SKILL.md .agents/skills/wxl-create/SKILL.md && diff .claude/skills/wxl-create/SKILL.zhTW.md .agents/skills/wxl-create/SKILL.zhTW.md
  ```

Approval: The user approved this test plan in advance on 2026-10-21 with the standing instruction "所有的都按照你的建議執行、實踐" (follow and carry out every recommendation), given together with "/implement 完成 T-0030-T-0032 T-0036".

### 2026-10-21 — implementation decisions (stage 5)

The planner's open points, resolved by the spec where it decides them:

1. **Which menus.** P7 names "wxl-create Step 2 in all four files" and `spec.en.md` says "its menu
   answers with words" (singular), so only Step 2 changed. Step 1's confirmation block still answers
   with digits (`1) 確認  2) 修改參數`, `.claude/skills/wxl-create/SKILL.md:88` at a54e917). D13's
   plural "menus" is left for the orchestrator or the user to decide; it is outside this ticket.
2. **Where "exit status N" applies.** P7 covers Step 2. The lines about `challenge:verify`
   ("exits 0", Step 7 and the final Verification) are unchanged.
3. **Status 1 has two causes.** C05 gives status 1 for an invalid argument or an existing slug. The
   status-1 branch shows the error and asks for `change` or `cancel`; `change` re-asks the parameter
   the error names (the slug for a collision) and re-runs. Reason: re-asking only the name cannot
   fix an invalid argument, and this keeps P7's "re-ask only on exit status 1" true, since no other
   status re-asks anything.
4. **Passing Step 2 after status 3.** Verification is P7's text as written: exit status 0, or exit
   status 2 with its message shown. A run that stopped on exit status 3 does not pass Step 2; the
   status-3 branch itself names the resume point (Step 3, same slug, after
   `pnpm challenge:keygen <slug>`). The branch adds that committing the challenge regenerates
   `platform/public/_redirects`, as W1 says for status 2. That clause depends on the hook (T-0032).
5. **Surfacing on status 3.** The text shows create:challenge's stderr, which holds W2 with keygen's
   output (C03).
6. **Language drift.** Both `SKILL.zhTW.md` gained a Step 2 Verification bullet matching the English
   one. The number is written 永久編號, as GLOSSARY.md's `number` entry requires (bare 編號 is on its
   `_Avoid_` list).

### 2026-10-21 — coverage report (stage 5)

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| stage 6 review of the diff (T05) | X3 tokens `exit status 2`, `platform/public/_redirects`, `Step 3`; diff read | Step 2 of all four files | P7 status 2, AC-24 | the meaning (continue, keep the scaffold, no re-ask) is confirmed only by the stage 6 review |
| stage 6 review of the diff (T05) | X3 tokens `exit status 3`, `pnpm challenge:keygen <slug>`, `Step 3`; diff read | Step 2 of all four files | P7 status 3, AC-24 | as above |
| stage 6 review of the diff (T05); X1 | X1 prints nothing; X3 tokens `exit status 0`–`3`, `` `change` ``, `` `cancel` `` | Step 2 of all four files | P7 menu and wording, AC-24 | X1 only finds the old forms it greps for; stage 6 reads the rest |
| stage 6 review of the diff (T05) | X3 token `Verification` in each file's Step 2 | Step 2 Verification bullet, all four files | P7 Verification, AC-24 | that statuses 1 and 3 do not pass is a reading of the text, for stage 6 |
| X2; English against zhTW at stage 6 | X2 exits 0 | both trees, both languages | "The four files say the same thing" | the two languages' sameness is a human reading, for stage 6 |
| `python3 scripts/verify-project.py` | exit 0, PASS, 42 skills | both skill trees | "`verify-project.py` passes" | none |
| `pnpm test --run` (regression) | 127 files passed; 4203 passed, 1 skipped | whole repository | regression only | none |
| stage 8 | not run | — | — | no V row; the change is skill text, covered by the stage 6 review; no browser surface |

Line or branch coverage was not measured: the changed files are Markdown, which vitest coverage
does not instrument, and no `@vitest/coverage-*` provider is installed
(`ls -d node_modules/.pnpm/@vitest+coverage*` matches nothing). None was installed.

Commands, run from the worktree root on the working tree over a54e917 (nothing committed):

- X1 (the command in the test plan): before the edit it printed six lines (two from each English
  file, one from each zhTW file); after it prints nothing and grep exits 1.
- X2 (the command in the test plan): exit 0 after the edit. The `.agents` files were produced by
  copying the edited `.claude` files, which were byte-identical at a54e917.
- X3, added to the plan's checks as a positive counterpart of X1. It prints each missing token and
  exits 1 if any is missing. Saved as `x3.sh` (the block below), `bash x3.sh a54e917` printed 40 missing tokens; `bash x3.sh` on the
  working tree printed nothing and exited 0:

  ```bash
  rc=0
  for f in .claude/skills/wxl-create/SKILL.md .agents/skills/wxl-create/SKILL.md .claude/skills/wxl-create/SKILL.zhTW.md .agents/skills/wxl-create/SKILL.zhTW.md; do
    if [ -n "$1" ]; then body=$(git show "$1:$f"); else body=$(cat "$f"); fi
    s2=$(printf '%s\n' "$body" | awk '/^### Step 2/{p=1;next} /^### Step 3/{p=0} p')
    for t in 'exit status 0' 'exit status 1' 'exit status 2' 'exit status 3' 'pnpm challenge:keygen <slug>' 'Step 3' '`change`' '`cancel`' 'Verification' 'platform/public/_redirects' 'platform/challenge/<slug>/'; do
      printf '%s\n' "$s2" | grep -q -i -F -- "$t" || { echo "$f: missing $t"; rc=1; }
    done
  done
  exit $rc
  ```

- `python3 scripts/verify-project.py`: exit 0, "PASS: shared instructions, 42 skills across
  Claude/Codex trees".
- `pnpm test --run`: Test Files 127 passed (127); Tests 4203 passed, 1 skipped (4204).
- `git diff --stat`: the four wxl-create files (Step 2 only) and this ticket.

Surface: the skill text as an agent reads it; there is no browser surface. The P7 boxes below are
ticked on the text checks and a reading of the diff; T05 at stage 6 is the review that confirms them.

### 2026-10-21 — code review (stage 6)

Reviewed on the uncommitted working tree over a54e917 (HEAD a54e917, branch
`tickets/T-0031/wxl-create-branches-on-status`). Each candidate went to three independent
skeptics; a finding counts as confirmed when at least two agree it is real. **Confirmed: 0.** No
file changed after the review, so the coverage report above stands. Every candidate below was
rejected (0 of 3 skeptics), and nothing was done to the text:

| # | Axis | Candidate | Skeptics' main reason for rejecting |
|---|---|---|---|
| 1 | Standards | Status-1 menu has no block shape; the file's block shape asks for a number | the block shape at `SKILL.md:74` is Step 1's per-round shape; Step 2 names the replies `change` and `cancel`, which is what P7 asks |
| 2 | Standards | zhTW says 轉述 where English says Show | P7 says "surface", not verbatim; `spec.zh-TW.md` itself translates it 轉述; agents read the English file |
| 3 | Standards | The text depends on T-0032 but `blocked_by` omits it | `blocked_by` was set and approved at stage 4 and is not in the diff; W1 (T-0030, `blocked_by: []`) carries the same dependency; decision 4 records it |
| 4 | Standards | Started before the blocker was done; `todo` → `review` without `processing` | the net diff cannot show intermediate statuses; the user asked for T-0030–T-0032 together; Frontier is a view, not a gate |
| 5 | Standards | "nothing was written" for status 1 disagrees with the code on this branch | the text states D13 and C05; the keygen exit 1 and the catch-all exit 1 are base code that T-0030 changes |
| 6 | Standards | No branch for exit statuses outside 0–3 | "Exit status 1 is the only status that re-asks a parameter" and the Verification bullet (0, or 2) stop any other status; P7 asks for no default branch |
| 7 | Standards | Step 1 and Step 7 still use digits and "exit 0" | lines outside the diff; P7 covers Step 2; decisions 1 and 2 record the boundary |
| 8 | Standards | X3's tokens come from the implementation (tautological) | X3 fails on a54e917 (40 missing tokens); most tokens are P7's own words; the coverage table leaves meaning to stage 6 |
| 9 | Standards | The approved test plan was extended after implementation | X3 only adds a check and removes none; the record says it was added; the approval quoted is the user's standing instruction |
| 10 | Standards | The P7 ticks rest on reading the diff; "below" should be "above" | the sentence defers confirmation to T05 at stage 6; workflow.md stage 6 entry requires the boxes ticked; the word is a slip that misleads no reader |
| 11 | Standards | "Saved as `x3.sh`", but no such file is in the repository | the script is written out in full in the record, run from the worktree root; a throwaway script does not belong in the repository |
| 12 | Standards | "Measured coverage" holds scope, not a measurement | the paragraph under the table says line coverage was not measured and why, with a reproducing command |
| 13 | Standards | The skill says "user" where the spec says "teacher" | the whole file uses "user" for the person talking to the agent; GLOSSARY does not forbid it; the skill's user need not be a teacher |
| 14 | Standards | The ticket's zh-TW section disagrees with decision 3 | that section is not in the diff and matches the AC; "only 1 re-asks" stays true under decision 3 |
| 15 | Standards | zhTW glosses `change` / `cancel` in Chinese | the replies stay backticked literals and the branches name only them; the glosses are translation |
| 16 | Standards | zhTW has Verification only in Steps 0, 2 and 4 | the gaps in other steps predate this change; the change closed the Step 2 gap; out of scope (could go to OPEN-QUESTIONS) |
| 17 | Standards | zhTW nested list lacks the blank line English has | no documented rule; English needs it for its fenced block; the rendering is the same |
| 18 | Standards | Four files to edit for one change (duplication) | the two trees and two languages are the repository's documented structure; X2 guards the trees |
| 19 | Standards | Resuming at Step 3 after status 3 bypasses Step 2's Verification | P7 prescribes stop and resume at Step 3 and the Verification text; later gates (`challenge:verify`) remain |
| 20 | Spec | The status-1 menu does not exclude Step 1's numbered block | P7's "words, not digits" holds; Step 1's shape is per-round; the risk is a guess about agent behaviour |
| 21 | Spec | D13's plural "menus" leaves Step 1's confirmation menu on digits | P7 and AC-24 scope Step 2; D13 came from the Step 2 menu colliding with exit statuses, which cannot happen in Step 1 |
| 22 | Spec | The P7 boxes were ticked at stage 5, before T05 ran | workflow.md stage 6 entry requires them ticked; the record defers confirmation to T05 |
| 23 | Spec | Status 1 re-asks any parameter the error names, beyond P7's "name" | "only" limits which status re-asks; C05 puts invalid arguments on status 1; the errors in `create-challenge.ts` name their parameter |
| 24 | Spec | The status-3 clause about `_redirects` is not in P7 and depends on T-0032 | it states the epic's design (the hook regenerates on commit); W1 for status 2 carries the same dependency; decision 4 records it |
| 25 | Spec | The statuses only hold after T-0030 lands | `blocked_by: [T-0030]` and the test plan state it; the old text was no better on base |
| 26 | Spec | After status 3, Step 2's Verification never passes | a run that stopped on status 3 should not pass; the resume point skips Step 2, as P7 says |
| 27 | Spec | No handling of statuses outside 0–3 | as row 6; C-16 (pnpm passing statuses through) is a spec-level row, settled in disposition-2 |
| 28 | Spec | English bullets start "Exit status N" with a capital | sentence-initial capitals; the rule fixes the term, not its case; `spec.en.md:112` writes "Exit statuses" |

The four Security-axis candidates are in the stage 7 entry below.

Commands rerun after the review, from the worktree root:

- `python3 scripts/verify-project.py`: exit 0, "PASS: shared instructions, 42 skills across
  Claude/Codex trees, invocation policies, helper assets and native role configs".
- `pnpm test --run`: Test Files 127 passed (127); Tests 4203 passed, 1 skipped (4204).
- X1: no output. X2: exit 0. X3 (`bash x3.sh`, the block in the coverage report): exit 0 on the
  working tree; `bash x3.sh a54e917` printed 40 missing tokens.

### 2026-10-21 — security review (stage 7)

Report: [`review/security-T-0031.md`](../../.proj.specs/0007-gh-pages-range-fixes/review/security-T-0031.md).
Confirmed findings: 0. All four candidates were rejected (0 of 3 skeptics), and nothing was
changed:

| # | Axis | Candidate | Skeptics' main reason for rejecting |
|---|---|---|---|
| S1 | Security | Exit status 2 has the agent read and surface stderr, which can carry another challenge's frontmatter (prompt injection) | stderr reaches the agent whatever the text says; an attacker who can plant files can already change `scripts/` or the skill; `JSON.stringify` quotes the value; the source lines are base code |
| S2 | Security | Re-asked values go into the double-quoted bash command (command substitution) | the command template at `SKILL.md:98` is unchanged; Step 1 already takes custom values and free-text flag and title; the input is the teacher's own, on their own machine |
| S3 | Security | Status 1 does not always mean nothing was written (half-written directory with a flag) | the text states the spec's contract; the exit-1 paths are base code that T-0030 owns; flags are committed by design. Note for T-0030: errors after a write must not exit 1 |
| S4 | Security | "Committing regenerates `_redirects`" depends on the hook being installed and run | B2's "Does not protect" accepts `--no-verify` and hookless clones, and B3 catches the stale file; status 2's sentence relays W1 as the spec defines it |

Coverage limits are stated in the report. The commands rerun are those listed under stage 6.

### 2026-10-21 — end-to-end (stage 8)

Added by the completeness check, as the test plan's stage 8 row promised. No V row is assigned to
this ticket: the ticket names none (`grep -n -E 'V0[0-9]' .proj.tickets/0007-gh-pages-range-fixes/T-0031-wxl-create-branches-on-status.md`
matches, outside this subsection, only the test plan's stage 8 row), and V01–V05 (`grep -n -E '^\| V[0-9]+' .proj.specs/0007-gh-pages-range-fixes/traceability.md`)
check short links, page URLs and the `_redirects` hook, not wxl-create's text; V03 runs
`pnpm create:challenge` directly. The change is skill text, so its surface is the text as an agent
reads it, covered by T05 at stage 6 above; there is no browser surface and no preview check for it.

### 2026-10-21 — completeness check

Run from the worktree root on the uncommitted working tree over a54e917 (HEAD a54e917).

| Check | Command | Result |
|---|---|---|
| AC boxes against seams | read the six ticked boxes against the coverage report, X1, X3 and the stage 6 table | each box has an observer: the four P7 boxes have X3 tokens, X1 and T05 at stage 6; "four files say the same thing" has X2 and the stage 6 reading; `verify-project.py` has its own run. No box unticked |
| Records present | read `## Comments` | test plan with approval line, coverage report, code review (stage 6), security review (stage 7), stage 8 (added above) |
| Security report | `ls .proj.specs/0007-gh-pages-range-fixes/review/security-T-0031.md` | exists, 105 lines |
| Regression | `pnpm test --run` | exit 0; Test Files 127 passed (127); Tests 4203 passed, 1 skipped (4204) |
| Agent configuration | `python3 scripts/verify-project.py` | exit 0, "PASS: shared instructions, 42 skills across Claude/Codex trees, invocation policies, helper assets and native role configs" |
| Step 2, English pair | `diff <(awk '/^### Step 2/{p=1;next} /^### Step 3/{p=0} p' .claude/skills/wxl-create/SKILL.md) <(awk '/^### Step 2/{p=1;next} /^### Step 3/{p=0} p' .agents/skills/wxl-create/SKILL.md)` | exit 0, identical |
| Step 2, zhTW pair | the same `diff` on the two `SKILL.zhTW.md` | exit 0, identical |
| X2 (whole files) | the X2 command in the test plan | exit 0 |
| X1 | the X1 command in the test plan | no output |
| X3 | the X3 block in the coverage report | exit 0 on the working tree; 40 missing tokens with argument `a54e917` |
| Tree | `git status --short --ignored` | the four wxl-create files, this ticket, `review/security-T-0031.md`; ignored only `.vitepress/wasm/`, `node_modules/`, `platform/public/challenge/`. No stray artifact; no `x3.sh` in the tree |
| Status | frontmatter | `status: review` |

Gaps: none.
