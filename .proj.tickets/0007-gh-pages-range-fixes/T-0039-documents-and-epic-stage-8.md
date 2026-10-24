---
id: T-0039
title: Every document says the same sentence, and the epic's stage 8 runs end to end
epic: 0007-gh-pages-range-fixes
status: done
blocked_by: [T-0030, T-0031, T-0032, T-0033, T-0034, T-0035, T-0036, T-0037, T-0038]
---

## Context

The documents tell the teacher never to edit `_redirects`, but not that it is committed with the
challenges. They also say the copy button 404s on GitHub Pages, which T-0036 makes false. This
ticket writes the canonical sentences into every file of the sentence map:
- E1 and Z1: what `_redirects` is and how to repair it.
- E2 and Z2: what the button copies and what breaks it.

S6 checks the sentences upstream. The generator's header gains E1, which rewrites the committed
`_redirects` in the same commit. The README and skill passages and two GLOSSARY sentences are
rewritten.

This is the ticket that lands last. Its stage 8 runs V01–V05 against a commit that holds the whole
epic, including the teacher's original scenario rerun on a temporary GitHub Pages range.

Spec: `traceability.md` revision 3, canonical sentences, sentence map, match rule, passages P1–P3 and
P8, rows G02, T01–T05 and V01–V05; `spec.en.md` "Testing Decisions" (stage 8 override, D9).

## Deliverable

Every file of the sentence map holds its sentences under the match rule, and the README, skill and
GLOSSARY passages say what the epic made true. The committed `_redirects` carries the new header.
The epic's behaviour is verified on the Cloudflare preview, on a local build, in a temporary clone
and on a real GitHub Pages range.

## Acceptance criteria

- [x] T01, T02: the five E1 rows and the five Z1 rows hold their sentence (AC-18)
- [x] T03: `README.en.md` holds E2; `README.md` and both wxl-fork-init skill files hold Z2 (AC-19)
- [x] T04: S6 runs only under the upstream decision; stage 6 confirms the gate on the diff (AC-18)
- [x] T05: P1, P2, the README and skill parts of P3, and P8 rewritten as the passages table requires; `glossary.test.ts` passes (AC-24)
- [x] G02: the generator header carries E1; the committed `_redirects` is regenerated in the same commit and passes the guard (AC-17)
- [x] G01 at stage 6: the guard test and its CI steps unchanged (AC-17)
- [x] V01–V03 against a commit holding the whole epic (AC-20)
- [x] V04, V05 on a temporary GitHub Pages project-site range, each outward action confirmed with the user first; the user deletes the repository afterwards (AC-21; the deletion is the user's, still to do on 2026-10-24)
- [x] At close-out: set OQ-016 to resolved with the verifying evidence

## 給使用者（zh-TW）

把規範句寫進 sentence map 的 10 個檔：E1 與 Z1 說明 `_redirects` 是什麼、過期時怎麼修，E2 與 Z2 說明複製按鈕給什麼、什麼情況會讓它失效。上游另有測試檢查這些句子。產生器的 header 一起改，commit 進去的 `_redirects` 跟著重新產生。README、skill 與 GLOSSARY 的相關段落一併改寫。

這是最後 land 的 ticket。stage 8 要對含整個 epic 的 commit 驗證：
- Cloudflare preview 上的短連結；
- 本機建置的題目頁網址；
- 在暫時 clone 裡建題目再 commit；
- 在暫時的 GitHub Pages 靶場重跑工作坊的原始情境，每個對外動作都先問你，repository 由你刪除。

## Comments

### 2026-10-24 — authorizations

Asked before stage 5, after the handoff `.proj.handoffs/2026-10-24-1230-epic0007-t0039-closeout.md`:

- The user's standing authorization of 2026-10-23 also covers this ticket's test plan table: the
  table below is recorded and the loop starts without a separate approval.
- V04 and V05: the user approved all five outward actions at once: (1) create a public temporary
  repository under the user's own account (GitHub Pages on a free plan needs it public); (2) push
  the range create-wxl produced; (3) set Pages' source to GitHub Actions; (4) run the deploy
  workflow by hand; (5) for V05, create a PHP challenge, commit it, push again and deploy. Any
  action that differs from that list is asked first. The user deletes the repository afterwards.

### 2026-10-24 — test plan (stage 5)

Read for this plan: this ticket; `traceability.md` revision 3.2 (canonical sentences, sentence map,
match rule, passages P1–P3 and P8, rows G01, G02, T01–T05, V01–V05, seams S6 and S7);
`spec.en.md` (AC-17 to AC-21, AC-24, Testing Decisions, Further Notes); the items earlier tickets
handed to this one (`grep -n 'T-0039' .proj.tickets/0007-gh-pages-range-fixes/T-003*.md`); and, at
`1c65ff4`, the ten files of the sentence map, `scripts/generate-redirects.ts`,
`tests/__helpers__/upstreamDecision.ts`, `tests/unit/site/glossary.test.ts`, H44 in
`tests/pre-commit-sh.test.ts` and `GLOSSARY.md`.

| Seam | Behaviour | Test | Row — AC | Expected |
|---|---|---|---|---|
| S6, the match rule | the rule as traceability words it: strip each line's leading run of `#`, `>` and whitespace, join, remove all whitespace, then look for the sentence | `tests/unit/docs/sentence-map.test.ts`, a `describe` for the matcher that is not gated | T01–T03 (the rule they use) — AC-18, AC-19 | holds: a sentence wrapped across `#` lines, across `> ` lines, and with different spacing. Does not hold: one word changed, one punctuation mark changed, a backtick dropped |
| S6, the sentence map | each of the ten files holds each of its sentences | same file, one case per file and sentence (14 cases), inside a `describe` gated by `realUpstreamDecision(root)` from `tests/__helpers__/upstreamDecision.ts` | T01, T02, T03 — AC-18, AC-19; T04 — AC-18 | red today for every case; green after the documents and the header change |
| guard (unchanged) | the committed `_redirects`, regenerated after the header gains E1, matches the tree | `tests/unit/site/redirects-generated.test.ts`, run unchanged | G01, G02 — AC-17 | passes; `git diff` shows the guard test and CI workflow untouched |
| S5, H44 | a range whose committed `_redirects` has the header from before this epic commits the current generator's file | `tests/pre-commit-sh.test.ts` H44: its setup commit drops `--allow-empty` and the comment that said the case bites only from this ticket | H44 — AC-22 | the setup commit is no longer empty, and the case passes on the current hook |
| glossary | P8's rewrite of the `number` entry and the `origin（紀錄來源）` _Avoid_ line | `tests/unit/site/glossary.test.ts`, run unchanged | T05 (P8) — AC-24 | passes |
| stage 6 diff check (not automated) | P1, P2, the README and skill parts of P3, P8 say what the passages table requires; the handed-over notes below are present | `git diff origin/main` | T05 — AC-24 | as the passages table says |
| full suites | nothing else changes | `pnpm test --run`; `pnpm --dir create-wxl test`; `python3 scripts/verify-project.py` | — | pass |
| stage 8 | V01–V05 | the surfaces of S7, against the pushed commit holding the whole epic | V01–V05 — AC-20, AC-21 | as the rows say |

Where each sentence goes (fixed at implementation, checked by S6):

- `generate-redirects.ts` `HEADER`: E1 replaces the "Produced by … in the meantime." paragraph under
  the `GENERATED FILE — DO NOT EDIT BY HAND.` line, which stays; one line after it says
  `pnpm build` rewrites the file too.
- both wxl-create `SKILL.md`: E1 as a closing paragraph of Step 2; both `SKILL.zhTW.md`: Z1 there.
- `docs/agents/challenge-pipeline.md`: E1 as a paragraph under the "Where a challenge lives" table.
- `README.en.md` and `README.md`: P1's note keeps the fact that short links resolve only on
  Cloudflare Pages and replaces the 404 claim with E2 or Z2, followed by E1 or Z1 in the same note.
- both wxl-fork-init `SKILL.md`: P2's closing paragraph says `SITE_ORIGIN` is the origin of every
  copied link, then Z2 and Z1.

Notes handed over by earlier tickets, written next to E1 or Z1 in both READMEs (they are guidance,
not sentences of the map, so S6 does not check them):

- W7: a range's first commit with a file under `platform/` left unstaged is refused; stage
  everything under `platform/` for it (T-0034).
- W9: when the hook cannot put the unstaged files back it names the stash entry that holds them;
  `git stash apply <id>` brings them back, and where apply refuses, the `git restore` commands W9
  prints overwrite the files under `platform/` with the entry's copy. Overlapping or adjacent
  hunks conflict; `git checkout <id> -- <path>` takes one file from the entry and also stages it
  (T-0034, D16 (a)).
- E1's repair step refuses when an untracked draft has no number; the message names it. Fix or move
  the draft first, or stage any challenge change so the hook regenerates the file (T-0035;
  spec Further Notes).
- An orphan brief already in `HEAD` (committed with `--no-verify`) blocks every later challenge
  commit until its English challenge is committed or the brief is removed (T-0033 point 7).

Not written: T-0033's "Known edges" item on a Traditional Chinese directory without `index.md` is
now pending as T-0043, which owns its wording.

### 2026-10-24 — red → green log (stage 5)

- **Red.** `tests/unit/site/sentence-map.test.ts` written first: the six matcher cases passed and
  all 14 sentence-map cases failed, one per file and sentence (`pnpm vitest run
  tests/unit/site/sentence-map.test.ts` → `14 failed | 6 passed`).
- **Green, generator header (G02).** E1 replaces the "Produced by … in the meantime." paragraph of
  `HEADER` in `scripts/generate-redirects.ts`, under the `GENERATED FILE — DO NOT EDIT BY HAND.`
  line; a closing line says `pnpm build` rewrites the file too and names the CI check.
  `pnpm redirects:generate` rewrote `platform/public/_redirects` (header only).
  `redirects-generated.test.ts` and `redirects.test.ts` pass unchanged (22 cases).
- **H44.** The setup commit drops `--allow-empty` and its comment: with the header changed, the
  commit of a54e917's header is no longer empty, and the case passes on the current hook.
- **Green, documents.** E1 or Z1 at the end of Step 2 in the four wxl-create files and under the
  table of `challenge-pipeline.md`; P1's note in both READMEs keeps the fact that short links do not
  resolve on GitHub Pages and replaces the 404 claim with E2 or Z2, followed by E1 or Z1; P2's
  paragraph in both wxl-fork-init files says `SITE_ORIGIN` is the origin of every copied link, then
  Z2 and Z1. → `20 passed`.
- **P3.** README.md lines 81, 197, 206 (twice), 214 and README.en.md 81, 200, 209 (twice), 217 name
  the value as the range address (靶場網址); README.md:197 and README.en.md:200 add that it is the
  origin of every copied link. Both wxl-fork-init files: the description (line 3), lines 43, 47 and
  58. `grep -n '短連結網址\|short-link origin'` over the four files finds nothing.
- **P8.** GLOSSARY's `number` entry now says the number is what a handout carries on a range where
  short links open their challenges; the `origin（紀錄來源）` _Avoid_ line names `SITE_ORIGIN` as
  the range address, the origin of every copied link.
- **Handed-over notes.** A subsection "When the pre-commit hook stops a commit" /
  「pre-commit hook 擋下 commit 時」 before "Deploying to Cloudflare Pages" in both READMEs, with the
  four cases of the plan. First placed right after P1's note, it split the `--host`/`--base`
  passage ("this line" then followed it), so it moved.
- **Glossary test caught one word.** The README note first wrote 「永久編號」, which GLOSSARY
  declares coined and unused in outward prose (`number（永久編號） does not declare itself new while
  already in use` failed). Both READMEs now say the draft has no `number` in its frontmatter;
  `glossary.test.ts` passes (261 cases).
- **The claim checked by hand.** A draft `platform/challenge/zz-draft/index.md` without `number`:
  `pnpm redirects:generate` exits 1 with `zz-draft (platform/challenge/zz-draft/index.md) has no
  \`number\` in its frontmatter`; the draft was removed afterwards.
- **Full suites.** The first `pnpm test --run` in the new worktree failed in the keygen, layout and
  tab cases, none of which this change touches: the worktree had no `.vitepress/wasm/` (ignored build
  output). It was copied from the main checkout, built 2026-10-22, after the last `chall-wasm`
  change (`72327e2`, 2026-10-10). Then `pnpm test --run` → `131 passed` files, `4540 passed | 1
  skipped` (T-0035's run: 130 files, 4520 cases; the difference is this ticket's file and its 20
  cases). `pnpm --dir create-wxl test` → 21 files, 437 cases passed. `python3
  scripts/verify-project.py` → PASS.

### 2026-10-24 — coverage report (stage 5)

| Seam | Tests | Lines changed and reached | Rows — AC | Not covered |
|---|---|---|---|---|
| S6 match rule | `sentence-map.test.ts` "S6 match rule" (6 cases) | `holdsSentence`, both branches (holds, does not hold) | T01–T03 (the rule) — AC-18, AC-19 | none |
| S6 sentence map | `sentence-map.test.ts` "S6 sentence map (upstream only)" (14 cases) | every file and sentence of the map | T01, T02, T03 — AC-18, AC-19 | a range: the `describe` is skipped there by design (T04), which stage 6 checks on the diff |
| generator header | `redirects-generated.test.ts`, `redirects.test.ts` unchanged; the `_redirects` case of S6 | `HEADER` | G01, G02 — AC-17 | none |
| S5 H44 | `pre-commit-sh.test.ts` H44 | the setup commit, now non-empty | H44 — AC-22 | none |
| glossary | `glossary.test.ts` unchanged | the `number` entry and the _Avoid_ line | T05 (P8) — AC-24 | wording: stage 6 |
| README, skill passages | none (prose) | P1, P2, P3 (README and skill parts), hook notes | T05 — AC-24 | wording: stage 6 |
| stage 8 | — | — | V01–V05 — AC-20, AC-21 | stage 8 |

### 2026-10-24 — code review (stage 6)

Captured: staged layer against `1c65ff4` (HEAD equals `origin/main`; no committed or unstaged
layer), 15 paths, packet `<scratch>/review-T-0039/`. Two `harness-reviewer` subagents, one per axis,
read the same packet. No drift between the packet and the checkout before the report. The user chose
"照建議處理" (fix the recommended set) on 2026-10-24.

Spec axis: the four sentences match traceability exactly; all 14 sentence-map cases hold; G01
(guard test and CI untouched), G02 (header and committed file equal), T04 (`describe.runIf`), P1, P2,
P3's README and skill parts, P8 and the handed-over notes for W7, the orphan in `HEAD`, E1's limit
and D16 (a) check against the hook's messages. Findings F1–F11; Standards axis S-1–S-15 and
judgment calls J-1–J-6.

| Finding | Severity | Disposition |
|---|---|---|
| F1, S-7: W9's third form and H51's extra line are missing, and "run `git stash apply`" contradicts the third form; T-0044 and T-0049 name T-0039 in `revisit_when` | medium | fixed: a bullet for the staged-change form, worded without the sentence T-0049 holds; both pending tickets record that the trigger fired and stay `pending` |
| S-1: "described in the next section" / 「下一節」 now pointed at the hook subsection | medium | fixed by the move below: the hook text left `## Deployment`, so the next `###` is Cloudflare's again |
| F2: W7 note omits that it fires only on a triggering commit and that `_redirects` alone does not count | low | fixed |
| F3, S-13: the generator refusal is not the hook's, and the subsection sat under Deployment | low | fixed: own `## Committing challenges` / `## commit 題目` section before `## Deployment`, intro widened, item retitled "Repairing a stale `_redirects`" |
| F4: untracked files not mentioned; D16 (a)'s other limits | low | untracked files added; the other limits (CRLF under eol=lf, index-only files, files staged after a conflicting apply) left out of the README as too fine-grained, with "check `git status`" kept |
| F5: the entry stays after apply | low | fixed: `git stash drop stash@{<n>}` once everything is back (`drop` takes a stash reference, not a commit id) |
| F6, S-3: plan named `tests/unit/docs/`, the file is in `tests/unit/site/` | low | recorded: placed beside `glossary.test.ts`, its prior art; the plan's path was a slip |
| F7, S-2: status | low | fixed: `review` |
| F8: "DO NOT EDIT BY HAND" twice; one unplanned line | low | fixed: the `GENERATED FILE` line is dropped, E1 says it; the line naming the CI check is kept on purpose (the old header named it too) |
| F9: B mode's hand edit of `SITE_ORIGIN` reads as Cloudflare-only | low | fixed: 「不論部署到哪裡」 |
| F10: the table row repeats the paragraph | low | fixed: the row now points below |
| F11: T-0038's GLOSSARY question | low | recorded: no entry. 「靶場網址」/"range address" is the existing `range（靶場）` term plus a plain noun, and spec 0007 adds no term beyond stage 1's |
| S-5: English lacks "commit id" | low | fixed |
| S-6: "old and new origin" | low | fixed: "address" |
| S-11: missing `.vitepress/wasm/` in a new worktree | low | fixed: a line in `docs/agents/platform-notes.md` |
| S-15: 「複製出去」 | low | fixed: 「複製出來」 |
| J-3: `root` | low | fixed: `REPO_ROOT`, as the neighbouring tests |
| S-4: matcher cases never red | low | not changed: the matcher is the test's helper, written with its cases; the red step is the 14 map cases |
| S-8: GLOSSARY narrowed without an _Avoid_ entry | low | not changed: the referent is the same; the clause adds the condition this epic made true |
| S-9, S-10 | low | not changed: S-9 is the exception traceability states; S-10 is existing text outside the glossary's corpus |
| S-12: line widths | low | not changed: rendering is unaffected |
| S-14: the P1 note grew | low | not changed: P1 must hold E2, and E1 sits with it |
| J-1, J-2 (rest), J-4, J-5, J-6 | low | not changed: the duplication is the sentence map's design; Z2 is a fixed sentence; Step 2's exit status 2 bullet already says committing regenerates the file; wording only; the authorization is recorded above |

### 2026-10-24 — security review (stage 7)

Report: `.proj.specs/0007-gh-pages-range-fixes/review/security-T-0039.md`. One candidate reviewer
listed C1–C14; three skeptics each judged the two medium candidates and one skeptic per batch judged
the low ones, with the parent's executed git observations from a scratch repository. No candidate
was confirmed (C1 and C2 1/3 each, the rest 0/1). All three skeptics of C1 and C2 called the gaps
real but not data loss, so both were applied as P2 documentation:

- C2: both READMEs say a conflicting apply leaves the file and the entry's other applied changes
  staged, and give `git restore --staged --source=<id>^2 -- ':(top)platform/'
  ':(top,exclude)platform/public/_redirects'`. Measured first in a scratch repository: conflict,
  `git checkout <id> -- platform/f`, then that command → `MM platform/f`, ` M platform/g`, the index
  holding the staged version and the working tree the unstaged one, as before the commit.
- C1: the drop moved to the end of the section, "once your files and the index are back", with
  `git stash list --format='%gd %H'` to find the line whose id matches; measured that
  `git stash drop <commit id>` is refused ("not a stash reference").

`pnpm vitest run tests/unit/site` → 395 passed after the change.

### 2026-10-24 — end-to-end (stage 8)

Commit under test: `f12aba221b48760399777ea584ad60f1cad671fb` on
`tickets/T-0039/documents-and-epic-stage-8`, which holds every change of the epic (base `1c65ff4`,
the squash of T-0030 to T-0038 and #47). PR
[#48](https://github.com/BrowserLaboratory/wxl-platform/pull/48), auto-merge off until stage 8 ends.
Scripts and logs are under `<scratch>/t0039/` and are not committed.

**V01 — Cloudflare preview, short mode.** Surface: the PR's Cloudflare Pages deployment
`https://6c433213.wxl-platform.pages.dev`, driven in the desktop app's built-in browser (1024 wide),
whose profile stores Traditional Chinese; `localStorage['wxl-locale']` was set to `en` for the
English pages and put back to `zh-TW` afterwards. `navigator.clipboard.writeText` was wrapped to
record what a copy hands over (the built-in browser denies the clipboard).

| Row | Result | Evidence |
|---|---|---|
| V01: the lists show short links whose origin is `SITE_ORIGIN` | pass | `/challenges`: `wxl.browserlab.online/c/{001,002,008,010}`; `/zh-TW/challenges`: `wxl.browserlab.online/zh/c/{001,002,008,010}`, each `title` the same with `https://`; `scrollWidth` 1024 = `innerWidth` |
| V01: the lists copy them | pass | English row 4 → `https://wxl.browserlab.online/c/010`; Traditional Chinese row 1 → `https://wxl.browserlab.online/zh/c/001`, status 「已複製」 |
| V01: the nav shows and copies them, Browser panel open | pass | `/zh-TW/challenge/selected-excerpts/` (reached through `/zh/c/010`): one shown URL text `wxl.browserlab.online/zh/c/010`, copied as `https://wxl.browserlab.online/zh/c/010`; `/challenge/door-is-open/` (reached through `/c/001`): `wxl.browserlab.online/c/001`, copied as `https://wxl.browserlab.online/c/001`. The panel's `iframe[srcdoc]` (611×616) rendered Kestrel Press and FileHub's sign-in page in the screenshots, after the runtime finished booting |
| V01: a plain click on the URL text selects it (T-0037's request) | pass | a real click on the first Traditional Chinese row's and on the nav's URL text: `getSelection()` equals the whole text, `location.href` unchanged, 0 `pushState` calls, a page-load token still present |
| V01: `/c/NNN` and `/zh/c/NNN` on the preview's host | pass | `curl -w '%{http_code} %{redirect_url}'`: `/c/001` → 302 `/challenge/door-is-open/`, `/c/010` → 302 `/challenge/selected-excerpts/`, `/zh/c/001` → 302 `/zh-TW/challenge/door-is-open/`, `/zh/c/010` → 302 `/zh-TW/challenge/selected-excerpts/`, `/c/door-is-open` → 302 `/challenge/door-is-open/`. The new header lines are read as comments; `/_redirects` itself is not served as a file |

**V02 — local page-mode build.** `env -u CF_PAGES pnpm build` in this worktree (exit 0; the working
tree clean afterwards, so the regenerated `_redirects` equals the committed one; `grep -rl
__WXL_SHORT_LINKS__ .vitepress/dist` → 0 files), served by `pnpm docs:preview --port 4493
--strictPort`, driven in agent-browser 0.29.1's own HeadlessChrome (`AGENT_BROWSER_SESSION=t0039`)
with T-0037's V02 scripts (`<scratch>/t0039/v02/`, paths, session and port changed only): both lists
and both `selected-excerpts` pages at 375×812 and 1280×800, the 375 challenge pages once more with
`◀` clicked. `summarize.py` → 64 `PASS`, `FAILURES 0`: page URLs displayed (`REST`, 10) and copied
from the real clipboard (`COPY`, 10; e.g. `https://wxl.browserlab.online/zh-TW/challenge/selected-excerpts/`);
at 375 every URL text is cut with an ellipsis and its `title` is the whole URL; a plain click selects
the whole text without leaving the page (`S03`, 20, at rest and while `copy_failed` shows); a click on
a row's title opens it (`S06`, 4); no sideways scroll. The Browser panel rendered the challenge
(`zh-selected-excerpts-1280x800-copied.png`). Afterwards the preview and the clipboard grant were
stopped and the session closed; port 4493 free; the repository's stash list empty, as before.

**V03 — temporary local clone.** `git clone --branch tickets/T-0039/documents-and-epic-stage-8` of
this repository into `<scratch>/t0039/v03/clone`, `git switch -c throwaway/v03`, `pnpm install
--frozen-lockfile` (installed the `simple-git-hooks` pre-commit hook), `pnpm wasm:build` (Rust
available). Then `pnpm create:challenge --name v03-php-check --backend php --difficulty easy --title
"V03 PHP check"` → exit 0, "Regenerated platform/public/_redirects"; `git add
platform/challenge/v03-php-check` only; `git commit -F` with a message from the project's
`/tw-emoji-commit` (sanitized) → the hook printed `[pre-commit] ✓ v03-php-check` and the commit
`370863d` holds the challenge's three files and `platform/public/_redirects` (+`/c/011
/challenge/v03-php-check/ 302`). The commit's `_redirects` equals `generate-redirects.ts --staged`'s
output; the working tree was clean, and `redirects-generated.test.ts` with `redirects.test.ts` → 22
passed on it. No step touched `_redirects` by hand. The clone was removed; nothing was pushed, and
no `throwaway/*` branch exists in this repository. Separately, the PR's CI: all 10 checks passed
(`build`, `test`, `site-smoke`, `challenge-verify`, `prose-audit`, the four `fork-init-cross-os`
jobs, Cloudflare Pages), read once from `gh pr view 48`.

**V04 — temporary GitHub Pages project-site range.** The five outward actions the user approved on
2026-10-24 ran as listed. `CREATE_WXL_COMMIT=f12aba221b48760399777ea584ad60f1cad671fb npx -y
create-wxl@3.0.0 range --author CXPhoenix --repo CXPhoenix/wxl-e2e-0007 --host github-pages
--site-name "WXL e2e 0007" --lang en` → exit 0, CW-W04 printed for the override; one commit
`1a4fc3f`; `range.json` names `f12aba2…`; `SITE_ORIGIN = "https://cxphoenix.github.io/wxl-e2e-0007"`;
the committed `_redirects` carries E1. Then (1) `gh repo create CXPhoenix/wxl-e2e-0007 --public`,
(2) `git push -u origin main`, (3) `POST repos/CXPhoenix/wxl-e2e-0007/pages` with
`build_type=workflow`, (4) `gh workflow run deploy.yml` → run `40063040409` success. Driven in the
built-in browser; the `cxphoenix.github.io` origin already stored `wxl-locale = en` (the owner's
GitHub Pages ranges share it, OQ-018), so the English URLs were opened in a profile whose stored
language is English (D6) and the value was left as found.

| Row | Result | Evidence |
|---|---|---|
| V04: a URL copied from the list, Traditional Chinese | pass | `/zh-TW/challenges` row 2 copied `https://cxphoenix.github.io/wxl-e2e-0007/zh-TW/challenge/staff-only/` (status 「已複製」); opened, it shows 僅限員工 and the Browser panel renders Corkboard's sign-in page |
| V04: a URL copied from the nav, Traditional Chinese | pass | reached `selected-excerpts` by its list title, the nav copied `https://cxphoenix.github.io/wxl-e2e-0007/zh-TW/challenge/selected-excerpts/`; after leaving for the home page, opening it shows 精選節錄 and the panel renders Kestrel Press |
| V04: a URL copied from the list, English | pass | `/challenges` row 3 copied `https://cxphoenix.github.io/wxl-e2e-0007/challenge/just-a-preview/`; opened, the panel renders Corvid Labs' Prompt Library |
| V04: a URL copied from the nav, English | pass | reached `door-is-open` by its list title, the nav copied `https://cxphoenix.github.io/wxl-e2e-0007/challenge/door-is-open/`; opened, the panel renders FileHub's sign-in page |

Seen outside this epic: on the Traditional Chinese challenge pages of this origin, the attack-log
toggle, the flag field's button and the export button read in English ("Attack logs for this
challenge", "Submit Flag", "Export Attack Log") while the stored language is `en`.

**V05 — the same repository.** In the range: `pnpm install --frozen-lockfile` (hook installed),
`pnpm wasm:build`, `pnpm create:challenge --name v05-php-check --backend php --difficulty easy
--title "V05 PHP check"` → exit 0; `git add platform/challenge/v05-php-check` only; `git commit -F`
with a sanitized `/tw-emoji-commit` message → `[pre-commit] ✓ v05-php-check`, commit `26d2f66`
holding the challenge and `_redirects` (+`/c/011 /challenge/v05-php-check/ 302`); (5) `git push
origin main`, then `gh workflow run deploy.yml` → run `40063862631` success. The new challenge's page
URL, copied from the deployed English list (row 5,
`https://cxphoenix.github.io/wxl-e2e-0007/challenge/v05-php-check/`) and opened in the English
profile, opens it; the panel renders the skeleton's page.

The range's CI did not run: neither push created a Quality Gates run (`GET actions/runs` lists only
the two `workflow_dispatch` deploys; `quality-gates.yml` is `active` with `push: branches: [main]`;
the repository activity lists both pushes by `CXPhoenix`; githubstatus.com reported Actions
operational). Locally in the range, on `26d2f66` with a clean tree, `redirects-generated.test.ts`,
`redirects.test.ts` and `sentence-map.test.ts` → 28 passed, 14 skipped: the sentence-map cases skip
in a range, as T04 requires.

The cause, from the user's screenshot of the repository's Actions page: a banner "Workflows aren't
being run on this repository. GitHub Actions is not currently enabled on this repository", with the
button "Enable Actions on this repository", although `GET repos/CXPhoenix/wxl-e2e-0007/actions/permissions`
returned `{"enabled":true,"allowed_actions":"all"}`. `workflow_dispatch` ran (both deploys); push
created no run. A range a teacher creates the same way can meet the same banner after its first push,
with CI silently not running, and create-wxl's next steps (N3–N5) do not mention it.

After the user clicked "Enable Actions on this repository" (2026-10-24), an empty commit `dac53b2`
(message from the project `/tw-emoji-commit`, sanitized; the user had chosen this re-trigger) was
pushed to `main`, and the push created Quality Gates run `40081283163` → success: `test`, `build`,
`site-smoke` and `challenge-verify` passed; `prose-audit` and `fork-init-cross-os` were skipped, as
upstream-only jobs are on a range. In the `test` job's `Run tests` step (`pnpm test --run`), the log
shows `✓ tests/unit/site/redirects-generated.test.ts (10 tests)` and `✓
tests/unit/site/sentence-map.test.ts (20 tests | 14 skipped)`, then `Test Files 131 passed (131)`,
`Tests 4518 passed | 23 skipped (4541)` (`gh run view 40081283163 --log`, saved as
`<scratch>/t0039/v05-test-job.log`). A further Deploy run `40081246362` (`workflow_dispatch` on
`26d2f66`, success) started just before the push; the parent did not trigger it. The missing banner
in create-wxl's next steps is T-0051.

| Row | Result | Evidence |
|---|---|---|
| V04 | pass | the table above |
| V05 | pass | the commit through the hook, the range's CI with the guard test's case passing in `Run tests`, and the new challenge's copied page URL opening it, all above |

Stage 8 box ticked: V01–V03 and V04, V05. The user deletes `CXPhoenix/wxl-e2e-0007`.

### 2026-10-24 — landed (stage 9)

PR [#48](https://github.com/BrowserLaboratory/wxl-platform/pull/48), squash-merged into `main` by
the user as `cdaff71` on 2026-10-24 (04:54Z), from head `f12aba2`; auto-merge was not enabled. The
PR's CI: 10 checks passing, none failing. The merge came before V05's CI part had run; that part ran
afterwards against the same commit, as recorded above, and the retrospective's proposal 4 (a draft
PR until stage 8 ends) comes from it. `git diff f12aba2 cdaff71` is empty. Frontmatter `status: done`.
