# Traceability: 0007-gh-pages-range-fixes

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec (`spec.en.md`)
is derived from this file; a gap here is a gap there.

Revision 3 (2026-10-21) applies round 2's disposition (`review/disposition-2.md`, groups R2-G1 to
R2-G10) and the user's decisions D12–D15. Revision 2 applied round 1's (`review/disposition.md`)
and D4–D11. Row ids keep their meaning where they survive. Rows added in a revision are numbered
after the earlier rows of the same letter. Both rounds found no P0, so stage 3's gate is met.
Revision 3 gets no third round (two is the ceiling); its new rules were checked as described in
"Checks on this revision".

The decisions come from stage 1, recorded in the local research note
`.proj.research/2026-10-18-dev-image-gh-pages-grill.md` (converged 2026-10-18; the user confirmed
its summary on 2026-10-20), and from stage 3. Only the decisions below bind this epic. The note's
other epics, which cover starting without Rust and a container development environment, do not.

## Decisions

| Id | Decision |
|---|---|
| S8 | Make the teacher's workflow easier on top of the existing rules, without changing those rules. `_redirects` stays committed, the guard test is not skipped, deployment does not change, and the fork:init engine and `range.json` are not touched. |
| Q4 | `platform/public/_redirects` stays committed. Scripts and documents change so that it is regenerated and committed with the challenges, without the teacher needing to know about it. |
| Q5 | `create:challenge` regenerates it after keygen. The pre-commit hook watches both watched trees and regenerates and stages the file when a commit carries a challenge change. No `challenge:verify` L1 check is added. D3, D5 and the hook's constraints settle how this works with the hook's stash. |
| Q6 | Five places say the same thing about `_redirects`: wxl-create (both skill trees, both languages), `challenge-pipeline.md`, wxl-fork-init (both skill trees), README (both languages) and the generator's header. The header change rewrites `_redirects`, which is updated in the same commit. |
| Q7, Q8 | The build environment decides what the copy control gives: `CF_PAGES=1` gives the short link, and anything else gives the page URL. The host is not recorded anywhere, and fork:init and `range.json` are untouched. An existing range gets the change by upgrading. |
| Q9 | The guard test runs unchanged on every range; regeneration (Q5) is what makes it pass. |
| Q10 | The page URL is `SITE_ORIGIN` + `/zh-TW/challenge/<slug>/`, or `SITE_ORIGIN` + `/challenge/<slug>/` on English pages. Renaming a challenge breaks its page URL; the documents say so once. No new redirect mechanism is added. |
| Q11 | Both the displayed text and the copied URL switch. The list and the nav (desktop and mobile) both change. A URL that does not fit is cut with an ellipsis and shown whole on hover. The copy-failure string is kept, and the list's `#001` number stays. |
| Q33 | Stage 8 checks four surfaces: short links on the Cloudflare preview; page URLs on a local build without `CF_PAGES`; create-then-commit in a temporary repository, plus the PR's CI; and the teacher's original scenario rerun in a temporary GitHub Pages repository, which is deleted afterwards. Each outward action is confirmed with the user before it runs. |
| D1 | (2026-10-20) The seams are 0007-S1 to S7, below; revision 2 adds S8. |
| D2 | (2026-10-20) The list cuts a URL that does not fit the same way the nav does: one control, one rule. |
| D3 | (2026-10-20) If `_redirects` had an unstaged change before the commit, then after the hook the working tree's `_redirects` equals the committed version. Every other unstaged change and untracked file is restored as it was. |
| D4 | (2026-10-21) A click on the URL text selects the whole text and does not open the challenge, in the list as in the nav. A click anywhere else in a list row still opens the challenge. This overrides the comment in `ShortLinkShare` that leaves the text's clicks alone. Revision 3 limits it to a primary click without a modifier key (L21). |
| D5 | (2026-10-21) The hook also triggers when the staged change includes `platform/public/_redirects` itself, so `git commit -a` after `create:challenge`, and a repair of a stale committed file, both produce the expected file. E1 and Z1 gain the repair step. This reverses revision 1's Out of Scope entry for that case. |
| D6 | (2026-10-21) A learner with no stored language preference who opens an English page URL is redirected to the Traditional Chinese page, which does not exist for a challenge without a Traditional Chinese brief. Short links reach the same redirect today. The redirect is recorded as OQ-023 and is not fixed in this epic; the spec states the limit. |
| D7 | (2026-10-21) In the nav, the title has priority over the URL text: the URL text gives up width first, down to its minimum (D14). |
| D8 | (2026-10-21) When `create:challenge` has written the scaffold and keygen succeeded but `_redirects` cannot be regenerated, it exits 2, not 1. Its message says the challenge was created and how to finish. wxl-create (both trees, both languages) handles status 2 apart from the name collision's 1. |
| D9 | (2026-10-21) Stage 8 explicitly overrides the rule that behaviour is verified on the ticket's preview deployment, following OQ-017's precedent: page mode cannot appear on a Cloudflare preview. The stage 8 commits in temporary repositories use `/tw-emoji-commit`, as hard rule 5 requires. Revision 3 records the override under OQ-017. |
| D10 | (2026-10-21) A `SITE_ORIGIN` that does not match where the range is served is a documented known cost, with no new mechanism. This covers a fork that never ran fork:init or ran it in a mode that leaves `SITE_ORIGIN` alone, a renamed repository, and a custom domain without `--origin`. E2 and Z2 name the remedy. |
| D11 | (2026-10-21) The sentence check (S6) and the assertions that depend on upstream's own origin run only where the upstream decision says the tree is upstream. A range's own README is never checked. |
| D12 | (2026-10-21, round 2 decision B) The hook refuses a commit whose staged snapshot holds a Traditional Chinese brief with no English challenge of the same slug (an orphan brief). Its message names the brief and says to delete, rename or retire it together with its English directory. The existing test "backs every translated slug with a root-locale challenge" would fail such a commit in CI. |
| D13 | (2026-10-21, round 2 decision C) When keygen fails after the scaffold was written, `create:challenge` exits 3, as `challenge:retype` does for keygen and IO errors. Status 1 then always means nothing was written. wxl-create re-asks the name on no status but 1, and its menus answer with words, not digits. |
| D14 | (2026-10-21, round 2 decision D) The URL text never gets narrower than six `0` characters of its own font (6ch), with an ellipsis when cut. This holds while `short_link.copy_failed` shows too. |
| D15 | (2026-10-21, round 2 decision A) Round 2's findings go into revision 3 of the spec and this matrix, self-checked, with no third review round. |

## Seams

| Seam | Entry point | Observable output |
|---|---|---|
| 0007-S1 | `.vitepress/config.mts`, imported afresh with `process.env.CF_PAGES` set to a value or deleted, as `config-base.test.ts` does for `SITE_BASE` | the config's `vite.define.__WXL_SHORT_LINKS__`; `base` and `head` |
| 0007-S2 | `ShortLinkShare` mounted with `number`, `slug` and `locale`. The link mode is set per test by replacing, with `vi.mock`, the module the control reads the mode from. `ChallengeList` and `MergedNav` are mounted as their tests mount them today, with `MergedNav` given a `slug` prop and the `vitepress` mock's `withBase` prefixing a non-root base (`/my-range/`) in the N rows. Expected values are built from the real `SITE_ORIGIN` with plain string operations, as T70/AC-C1 of 0004 requires | the `[data-short-link]` text and its `title`; the string passed to `navigator.clipboard.writeText`; the `[data-copy-status]` text, including after fake timers pass 2000 ms; the button's `aria-label`; whether the control renders; the props each parent passes; whether a click event on the URL text, and one on the copy button, has `defaultPrevented` |
| 0007-S3 | `pnpm test:smoke` against `pnpm docs:build` output built without `CF_PAGES`, as CI builds it, in Chromium as today, at viewports 360×740, 375×812, 768×1024, 1024×768 and 1280×800. Init scripts may set `window` properties and make `navigator.clipboard.writeText` reject before any page script runs; the challenge may be marked completed through the site's own progress storage before load. Assertions marked upstream-only run only under the upstream decision | the URL text's content, `title`, computed `display`, `white-space`, `overflow`, `text-overflow`, `scrollWidth` and `clientWidth`; the width of `000000` set in the URL text's computed font, measured in the page; the nav title's `scrollWidth` and `clientWidth`; `document.documentElement.scrollWidth` compared with the viewport width; the clipboard after a copy; the selection and the page URL after a click on the URL text; the page URL after a click elsewhere in a list row; the URL text in the HTML as served, before any script runs |
| 0007-S4 | create-challenge's exported entry, called with argv and the dependencies `root` (a temporary directory the test builds, holding `platform/public/`) and `runKeygen` (a stub that succeeds or fails). The CLI calls it with the repository root and `pnpm challenge:keygen <slug>`, and exits with its status | the files under `root`, including the bytes of `platform/public/_redirects`; the returned status; stdout and stderr |
| 0007-S5 | the real `scripts/pre-commit.sh`, run with `bash` at the top level of a temporary git repository, or through a real `git commit` there with the hook installed. The repository's path contains a space and non-ASCII characters (`暫存 repo`). It holds a fixture tree with `platform/public/` holding `_redirects`, which matches the tree, and one other file; copies of the scripts the hook calls, any of which a case may replace with a stub (a generator that writes a marker and blocks, or one that creates `.git/index.lock`); access to the packages they import; and one stash entry made before the run. H27 and H28 use their own fixture, described there. `HOME` and `GIT_CONFIG_GLOBAL` are isolated, and every `GIT_*` variable is removed from the environment of the processes the test starts | the exit status; stderr; `git ls-files --stage` and `git show :platform/public/_redirects` before and after; the bytes of every file in the working tree, `.git` excluded (a directory, or a file in a linked worktree); `git stash list` with each entry's commit id; `git status --porcelain=v1 --untracked-files=all`; the commit's tree; the real repository's `platform/public/_redirects` bytes, `git ls-files --stage` and `git stash list` |
| 0007-S6 | a vitest that reads the files of the sentence map, run only under the upstream decision | whether each file holds each of its canonical sentences under the match rule |
| 0007-S7 | stage 8 (Q33, D9): the ticket branch's Cloudflare Pages preview deployment; a local `pnpm build` without `CF_PAGES`, served by `pnpm docs:preview` and driven with `/agent-browser` or the host's native browser tools; a temporary local clone of the ticket branch; a temporary GitHub Pages repository | what each surface displays and copies; whether a URL opens its challenge; the content of the commit; CI results and the `Run tests` step's log |
| 0007-S8 | the link helper exported by `.vitepress/challenge/shortLink.ts`, called with mode, number, slug, locale and origin | the copied URL and the displayed text it returns, or that it returns none |

S2 replaces the existing `ShortLinkShare` seam, which takes no slug and no link mode. S5 replaces
the setup of `tests/pre-commit-sh.test.ts`, which runs a copy of the hook's logic written inside the
test rather than the hook itself. S8 carries the examples whose origin differs from `SITE_ORIGIN`;
T70/AC-C1 binds the component tests, not the helper's.

"The upstream decision" is `isUpstreamDecision` in `tests/unit/scripts/upstream-guard.test.ts`
(0004 T65–T66, with 0005's `range.json` override). S3's upstream-only assertions and S6 use the same
decision; the implementation may move it into a shared helper.

S3's assertions other than S08 run in every range. Like today's smoke, which opens `door-is-open`,
they open the demonstration challenge `selected-excerpts`; a range that removed it fails them, as it
fails the existing smoke today.

## Fixed lists

### Vocabulary

| Term | Meaning here |
|---|---|
| link mode | `short` or `page`; fixed once per build by the mode rule. In a build the constant is replaced at compile time, so the server-rendered HTML, the hydrated page and anything set at run time use the same mode (S09). The control reads it through a module that holds no state of its own beyond the build-time constant. When the constant is undefined, as under vitest, the mode is `page` |
| `SITE_ORIGIN` | the constant in `.vitepress/challenge/shortLink.ts` that fork:init sets, or the teacher edits by hand where the wxl-fork-init skill says to: `https://<host>[/<path>]`, with no trailing slash (fork:init's origin grammar). It is the origin of every copied link, short or not. The origin fork:init derives for a GitHub Pages project site ends in `/<repo>`, the same path as the site base, so the page path is appended to it with no base added. When it does not name the range's address, copied links do not open, or open the site it names (D10) |
| short link | here, the numbered short link the control gives: `SITE_ORIGIN` + `/c/NNN`, or `SITE_ORIGIN` + `/zh/c/NNN` on a Traditional Chinese page, where NNN is the number padded to at least three digits. GLOSSARY's short link also covers the slug form `/c/<slug>`, which the control never gives |
| page URL | `SITE_ORIGIN` + the challenge page's path within the site: `/challenge/<slug>/` on an English page, `/zh-TW/challenge/<slug>/` on a Traditional Chinese page. The spec uses this term only. Challenges are per-folder (`<slug>/index.md`), as `create:challenge` makes them |
| slug grammar | `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, the rule `create:challenge` enforces |
| row slug | in `ChallengeList`, the last non-empty segment of the row's path, as `slugOf` derives it today |
| copied URL | what the copy button writes: the short link or the page URL, scheme included |
| displayed text | the copied URL without its leading `<scheme>://` (the existing rule of `shortLinkDisplay`) |
| shown URL text | a `[data-short-link]` element whose computed `display`, and every ancestor's, is not `none`. In the nav, that is the desktop control from 768 wide and the mobile row's control below it |
| 6ch width | the width of the string `000000` set in the URL text's computed font, measured in the page |
| watched trees | `platform/challenge/` and `platform/zh-TW/challenge/` |
| watched paths | the watched trees and `platform/public/_redirects` |
| staged snapshot | the content of the index: what the commit being made will contain |
| index slugs | per watched tree, the slugs whose `<tree>/<slug>/index.md` is in the index. A page counts only when its own tree lists its slug |
| orphan brief | a slug in the Traditional Chinese tree's index slugs that is not in the English tree's |
| expected `_redirects` | `generateRedirects` over a tree, restricted to a set of pages. The guard test keeps every page of a slug whose `index.md` git tracks in either tree. Inside the hook, the tree is the staged snapshot and the set is the index slugs, so an ignored or untracked challenge directory is never included. On a clean checkout, as in CI, both give the same file |
| guard test | the case "is byte-identical to what the challenge tree generates" in `redirects-generated.test.ts` |
| the hook | `scripts/pre-commit.sh`, which `simple-git-hooks` installs as the pre-commit hook on `pnpm install` |
| validator | `scripts/challenge-lint-staged.ts`, which the hook runs on staged paths under `platform/challenge/` |
| retiring | moving a challenge's directory from `platform/challenge/` to `.archive/challenge/`. There is no retired tree for Traditional Chinese briefs, so a retired challenge's brief is deleted in the same commit (D12) |
| upstream decision | `isUpstreamDecision`, above |

### Mode rule

| `CF_PAGES` at build time | Link mode |
|---|---|
| `1` | short |
| unset | page |
| empty string | page |
| `0` | page |
| `true` | page |
| ` 1` or `1 ` | page |

Only the exact string `1` selects short links. Cloudflare Pages' own build (its Git integration)
sets `CF_PAGES=1` ([build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/));
upstream deploys that way (README, "部署到 Cloudflare Pages": the project is linked to the GitHub
repository, and no workflow uploads a build). These builds all give page URLs (Q8):

- GitHub Pages builds;
- `pnpm dev`, `pnpm docs:preview` and `pnpm pages:dev` (wrangler serves `_redirects` there, but the build has no `CF_PAGES`);
- the CI build and the release archive;
- a Cloudflare Direct Upload, and a Cloudflare Workers build of the site's static assets;
- any other static host, including one that reads `_redirects`.

A Cloudflare Pages preview deployment sets `CF_PAGES=1` and copies short links whose origin is
`SITE_ORIGIN`, the production address, not the preview's.

`__WXL_SHORT_LINKS__` is defined the way `config.mts` defines its other flags: as the source text
`true` or `false` (the strings `'true'` and `'false'`, four and five characters), so the bundle sees
a boolean.

### Link forms

Inputs: the mode; the number n (an integer greater than zero); the slug s; the page locale; the
origin O = `SITE_ORIGIN`.

| Mode | Locale | Copied URL |
|---|---|---|
| short | en | O + `/c/` + n padded |
| short | zh-TW | O + `/zh/c/` + n padded |
| page | en | O + `/challenge/` + s + `/` |
| page | zh-TW | O + `/zh-TW/challenge/` + s + `/` |

In every row the displayed text is the copied URL without its scheme, and the URL text's `title` is
the copied URL. The helper takes a number and returns none when it fails `isChallengeNumber`. The
control first converts a string with `Number()`, as today, and renders nothing when the result
fails. In page mode both also give nothing when s is missing, empty, or outside the slug grammar. In
short mode s is not used. O is appended to as it is: the helper does not normalise it. The list's
`#NNN` badge does not change in either mode.

Examples X1–X6 are test cases at S8, where the origin is an argument. At S2 the same cases run with
O replaced by the real `SITE_ORIGIN`.

| # | Mode | Locale | n | s | O | Copied URL | Displayed text |
|---|---|---|---|---|---|---|---|
| X1 | short | en | 1 | door-is-open | `https://wxl.browserlab.online` | `https://wxl.browserlab.online/c/001` | `wxl.browserlab.online/c/001` |
| X2 | short | zh-TW | 42 | door-is-open | `https://wxl.browserlab.online` | `https://wxl.browserlab.online/zh/c/042` | `wxl.browserlab.online/zh/c/042` |
| X3 | page | en | 1 | door-is-open | `https://wxl.browserlab.online` | `https://wxl.browserlab.online/challenge/door-is-open/` | `wxl.browserlab.online/challenge/door-is-open/` |
| X4 | page | zh-TW | 3 | selected-excerpts | `https://teacher.github.io/my-range` | `https://teacher.github.io/my-range/zh-TW/challenge/selected-excerpts/` | `teacher.github.io/my-range/zh-TW/challenge/selected-excerpts/` |
| X5 | page | en | 1234 | staff-only | `https://teacher.github.io` | `https://teacher.github.io/challenge/staff-only/` | `teacher.github.io/challenge/staff-only/` |
| X6 | page | en | 1 | `My Chall` | `https://teacher.github.io` | none | none |

### Canonical sentences

- **E1**: `` `platform/public/_redirects` is generated from the challenges; do not edit it by hand. `pnpm create:challenge` and the pre-commit hook regenerate it when challenges change. Commit it together with them: GitHub Pages does not read it, but CI checks that it matches the challenges. If CI reports it stale, run `pnpm redirects:generate` and commit the result. ``
- **Z1**: `` `platform/public/_redirects` 由題目自動產生，不要手改；`pnpm create:challenge` 與 pre-commit hook 會在題目變動時重新產生它。它要跟題目一起 commit：GitHub Pages 不讀這個檔，但 CI 會檢查它和題目是否一致。如果 CI 回報它過期，執行 `pnpm redirects:generate` 再 commit 結果。 ``
- **E2**: `` The copy button beside each challenge copies a short link only on a range built by Cloudflare Pages; on any other range it copies the challenge page's URL. That URL stops working if the challenge is renamed, and it opens this range only while `SITE_ORIGIN` in `.vitepress/challenge/shortLink.ts` holds the range's address. ``
- **Z2**: `` 每道題目旁的複製按鈕，只有在 Cloudflare Pages 建置的靶場上才會複製短連結；其他靶場複製的是題目頁的網址。題目改名之後這個網址就會失效；而且只有 `.vitepress/challenge/shortLink.ts` 的 `SITE_ORIGIN` 是靶場的網址時，它才會開到這個靶場。 ``

Sentence map (one file per row; the language follows the surrounding text):

| File | Sentences |
|---|---|
| `.claude/skills/wxl-create/SKILL.md` | E1 |
| `.agents/skills/wxl-create/SKILL.md` | E1 |
| `.claude/skills/wxl-create/SKILL.zhTW.md` | Z1 |
| `.agents/skills/wxl-create/SKILL.zhTW.md` | Z1 |
| `docs/agents/challenge-pipeline.md` | E1 |
| `README.en.md` | E1, E2 |
| `platform/public/_redirects`, written by the generator's header | E1 |
| `README.md` | Z1, Z2 |
| `.claude/skills/wxl-fork-init/SKILL.md` | Z1, Z2 |
| `.agents/skills/wxl-fork-init/SKILL.md` | Z1, Z2 |

Five rows list E1 and five list Z1. Both wxl-fork-init skill files are written in Traditional
Chinese today, against `language.md`'s rule that skills are English. This epic keeps Traditional
Chinese as their language and adds Z1 and Z2. Changing the language is not part of this epic.

Match rule: from each line, remove the longest leading run made of `#`, `>` and whitespace
characters; join the lines; then remove every whitespace character from both the file and the
sentence. The file holds the sentence when the result contains it. Line wrapping and leading `#` or
`>` markers do not matter; wording, punctuation and backticks do.

### Passages to rewrite

These passages say something this epic makes false or incomplete. Stage 6 checks each against the
diff, since S6 only checks that sentences are present. Line numbers are those of HEAD `7820bb8`.

| # | Passage | After this epic it must |
|---|---|---|
| P1 | README.md:217 and README.en.md:220, the short-link note in the deployment section ("短連結只在 Cloudflare Pages 上有效" / "Short links work only on Cloudflare Pages") | hold Z2 or E2 in place of the claim that what the button copies 404s on GitHub Pages. It may keep the fact that short links do not resolve there |
| P2 | Both wxl-fork-init `SKILL.md`, line 97, the paragraph on `--origin` and the copied short link | say that `SITE_ORIGIN` is the origin of every copied link, and hold Z1 and Z2 |
| P3 | Every passage that names `--origin` or `SITE_ORIGIN` as only the short links' origin: README.md:81, 197, 206, 214; README.en.md:81, 200, 209, 217; both wxl-fork-init `SKILL.md` at lines 3, 43, 47 and 58; `scripts/fork-init.ts`'s usage comment (lines 21 and 31) and its warning at line 1487; `create-wxl/src/messages.mjs`'s `S6-ORIGIN` lines (229, 304) and the comment at `create-wxl/src/questions.mjs:200` | name it as the origin of every copied link, or simply as the range's address. create-wxl's own tests pass |
| P4 | The comment on `SITE_ORIGIN` in `shortLink.ts`, and its header line "the same string whether it is printed on a handout, shown on screen, or copied" | describe both link modes |
| P5 | `ShortLinkShare`'s comment that the text is left alone inside the list's anchor; `ChallengeList`'s comment that the link stays readable at any width, and `paddedId`'s comment that the badge and the short link beside it are the same number; `MergedNav`'s comment on the mobile row's measured title width, its `number` prop's comment that the short link is built from it, and the comment "Short link: the address a reader is given" | describe D4, D2, D7 and D14, and both link modes |
| P6 | `scripts/pre-commit.sh`'s header comment; `generate-redirects.ts`'s header and the `includeSlug` comment | describe the watched paths, the index-slug rule, the orphan-brief refusal (D12), D3, and that the validator's filter stays `ACMRD` while a type change only triggers regeneration |
| P7 | wxl-create Step 2 in all four files | handle exit status 2 (surface the message, then continue to Step 3) and exit status 3 (surface stderr and stop, telling the teacher to run `pnpm challenge:keygen <slug>` once the cause is fixed and to resume at Step 3), never re-asking the name for either; keep re-asking only on exit status 1. Every exit status is written as "exit status N", and the menu's choices are words, not digits. Verification accepts exit status 0, and exit status 2 once its message is surfaced |
| P8 | GLOSSARY.md, the `number` entry's clause "印在講義上、發給一個班的就是它", and the `_Avoid_` line that calls `shortLink.ts`'s origin "印在講義上的靶場網址" | say that a handout carries the number where short links resolve, and that `SITE_ORIGIN` is the range's address, the origin of every copied link. `glossary.test.ts` passes |

### Messages

Each message is English, like the scripts' existing output, and contains at least the listed
substrings, with `<slug>` and `<path>` replaced by the actual values.

| # | Who prints it, when | Contains |
|---|---|---|
| W1 | `create:challenge`, status 2 | the generator's or the write's error message; `platform/challenge/<slug>/`; `platform/public/_redirects`; `git commit` |
| W2 | `create:challenge`, status 3 | keygen's output; `platform/challenge/<slug>/`; `pnpm challenge:keygen <slug>` |
| W3 | the hook, O2, when the hook replaced a version of `_redirects` that was neither `HEAD`'s nor the expected one, in the index or in the working tree | `platform/public/_redirects`; `replaced` |
| W4 | the hook, O2, when W3 is printed and an untracked directory exists under a watched tree | that directory's path; `git add` |
| W5 | the hook, O4, generation refuses | the generator's message, as today |
| W6 | the hook, O4, an orphan brief | `platform/zh-TW/challenge/<slug>/`; `platform/challenge/<slug>/` |
| W7 | the hook, O6 | `first commit`; `git add` |
| W8 | the hook, commit-forms refusal | `git add`; `git commit`; `staging` |
| W9 | the hook, O7 | the hook's stash entry's commit id; `git stash apply` |

W3 is not printed when both versions before the hook were `HEAD`'s or the expected one: a commit
that adds a challenge after `pnpm dev` already regenerated the file prints nothing about it. With no
`HEAD`, every version that is not the expected one counts as the teacher's. W8 also says that an
editor which commits the files ticked in a list does the same, and that its staging area is the way
around it.

### The hook

**Trigger.** The staged snapshot differs from `HEAD` at a watched path: added, copied, modified,
renamed, deleted or changed in type. With no `HEAD`, every staged path counts as added.

**Commit forms.** The hook tells which index it runs on from `GIT_INDEX_FILE`. The index is the
repository's own when the variable is unset, or names the same file as `git rev-parse --git-path
index` run with `GIT_INDEX_FILE` removed from its environment, or that path followed by `.lock`.
Inside the hook, `git rev-parse --git-path index` answers with `GIT_INDEX_FILE` itself, so asking it
with the variable set would count every index as the hook's own. Paths are compared after resolving
them to absolute paths.
On its own index the outcomes below apply. On any other index file, when the run triggers, the hook
refuses: exit 1, W8, and nothing changed.

| Form | `GIT_INDEX_FILE` the hook sees | Own index |
|---|---|---|
| `git commit`; `git commit --amend` | `<gitdir>/index` | yes |
| `git commit -a`; `git commit -i <path>` | `<gitdir>/index.lock` | yes |
| `git commit -p` | `<gitdir>/index.lock` | yes |
| `git commit <path>`; `git commit --only <path>` | `<gitdir>/next-index-<pid>.lock` | no |
| `git commit` in a linked worktree | `<gitdir>/worktrees/<name>/index`, which is `git rev-parse --git-path index` there | yes |
| `bash scripts/pre-commit.sh` | unset | yes |

Measured on 2026-10-21 with git 2.50.1 in a scratch repository: every row except `-p`, `--only` and
the direct run. `-p` takes the same path in git's source as `-a`, and `--only <path>` is what
`git commit <path>` means; H33, H36 and H37 check them.

Commits that git makes without running pre-commit never reach the hook. These are a merge that git
concludes itself (it runs `pre-merge-commit`, which is not installed), `cherry-pick`, `revert`,
`rebase`, `am`, and commits made in GitHub's web interface. CI's guard catches a stale file they
leave (B3), and E1's repair step fixes it.

**Constraints.** These hold in every outcome below.

- `platform/public/_redirects` never enters the hook's stash. Its staged and unstaged versions stay out of the stash's restore.
- The hook stashes only when something under `platform/` other than `_redirects` is unstaged or untracked. It has an entry of its own only when `refs/stash` changed across its own push, and identifies that entry by commit id. It never applies or drops another entry.
- The validator receives the staged paths under `platform/challenge/` that today's filter (`ACMRD`) selects, and runs only when there is at least one. A type change triggers regeneration but is not validated. The hook behaves the same under macOS's `/bin/bash` 3.2, with `set -u`, as under bash 5.
- Before generating, the hook refuses an orphan brief (O4, W6).
- The hook generates over the staged snapshot with the index slugs. It writes and stages `_redirects` only after validation passed and generation succeeded.
- The hook names its own repository's top level as the generator's root. A run never writes another repository's files.
- The hook keeps the working tree's `_redirects` bytes from before its write, and puts them back on every exit other than O2 where the index's `_redirects` did not change, unless an O5 interrupted the hook once its `git add` of `_redirects` had started. After O2 the working tree's `_redirects` equals the staged one (D3); after such an O5 it holds the old bytes or the staged one, as O5 allows.
- Once the hook has an entry of its own, every exit restores it, including a failed git command and SIGINT, SIGTERM or SIGHUP. The entry is dropped only after the restore completed. While restoring, the hook ignores INT, TERM and HUP. When the restore fails, the entry stays (O7). So does it when the index file named by `GIT_INDEX_FILE` no longer exists, as after git removed its `index.lock` on an interrupted `git commit -a`: the hook never restores into a missing index.
- A file with both staged and unstaged changes comes back with its unstaged content, byte for byte.

The Traditional Chinese tree and `_redirects` only trigger regeneration. Files in the working tree
outside `platform/` are never written; `.git/` is git's own. Empty untracked directories under
`platform/` are not restored, because git records no directories. Symbolic links are followed, as
`pnpm build` follows them today.

| Case | Exit | Index | Working tree under `platform/` | `git stash list` |
|---|---|---|---|---|
| O1 not triggered | 0 | as before | as before | as before |
| O2 triggered; validation passes; generation succeeds | 0 | as before, except `_redirects`, which is the expected `_redirects` of the staged snapshot | every file other than `_redirects` byte-identical to before, untracked files still untracked; `_redirects` equals the staged one (D3). W3 and W4 where they apply | as before |
| O3 triggered; validation fails | the validator's status, as today | as before | as before, `_redirects` included | as before |
| O4 triggered; an orphan brief, or generation fails | 1, with W6 or W5 | as before | as before, `_redirects` included | as before |
| O5 interrupted by SIGINT, SIGTERM or SIGHUP, or a git command fails, at any point, and any restore the hook needed completed | non-zero | as before, or differing only in `_redirects` holding the expected content | every file other than `_redirects` as before, untracked files still untracked; `_redirects` as before, or equal to the expected content when the index holds it | as before |
| O6 triggered with no `HEAD` while something under `platform/` is unstaged or untracked | 1, before any change, with W7: git cannot stash before the first commit, so every change under `platform/` must be staged for it | as before | as before | as before |
| O7 restoring the hook's own entry fails | non-zero, with W9 | as O5 | the files that entry holds are as they were in the stash, not yet back, until the printed entry is applied; `_redirects` as O5 | as before, plus the hook's entry |

O1 to O7 and the commit-forms refusal cover the ends the matrix exercises. SIGKILL and a power loss
cannot be handled and are outside the model, and a missing `node` ends the run with the shell's own
status (Out of Scope).

When the only staged change was `_redirects` and the expected file equals `HEAD`'s, O2 leaves the
index equal to `HEAD`. git still records the commit, which then changes nothing. This was measured
on 2026-10-21 with git 2.50.1 and 2.54.0, using a hook that resets the index to `HEAD`.

## Matrix

### Link mode (S1)

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| M01 | build environment | `CF_PAGES` | `1` | `__WXL_SHORT_LINKS__` is the string `'true'` | AC-1 |
| M02 | build environment | `CF_PAGES` | unset; empty string | the string `'false'` | AC-1 |
| M03 | build environment | `CF_PAGES` | `0`; `true`; ` 1`; `1 ` | the string `'false'`: only the exact string `1` counts | AC-1 |
| M04 | site config | `base`, `head` | each `CF_PAGES` value above × each `SITE_BASE` case of `config-base.test.ts` | `base` and `head` exactly as `config-base.test.ts` asserts; `CF_PAGES` changes nothing but the mode | AC-1 |

### The link helper (S8) and the copy control (S2)

L01–L07, L10, L11 and L16 run at S8 with the origin given, and again at S2 with the real
`SITE_ORIGIN` in place of O. L20 runs at S8 only. L08, L09, L12–L15, L17–L19 and L21 run at S2 only,
since they concern the component.

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| L01 | short mode | copied URL, displayed text | en, n = 1 (X1) | `https://wxl.browserlab.online/c/001`; `wxl.browserlab.online/c/001` | AC-2 |
| L02 | short mode | copied URL, displayed text | zh-TW, n = 42 (X2) | `…/zh/c/042` | AC-2 |
| L03 | short mode | padding | n = 42, n = 1234 | `042`; `1234` unchanged | AC-2 |
| L04 | page mode | copied URL, displayed text | en (X3) | `https://wxl.browserlab.online/challenge/door-is-open/`; without the scheme | AC-3 |
| L05 | page mode | copied URL, displayed text | zh-TW (X4) | `/zh-TW/challenge/<slug>/` after the origin | AC-3 |
| L06 | page mode | origin with a path | a project site's origin (X4) | the path is kept and the page path follows it; no base is added | AC-3 |
| L07 | page mode | origin without a path | a user site or custom domain (X5) | the page path follows the host | AC-3 |
| L08 | control, both modes | URL text `title` | X1 to X5 | equals the copied URL | AC-4 |
| L09 | control, both modes | `number` | missing; `null`; `0`; `-1`; `1.5`; `""`; `"abc"` | renders nothing. A string is converted with `Number()` first, as today, so `"7"` renders as 7 | AC-5 |
| L10 | page mode | `slug` | missing; empty string | renders nothing (S2); the helper returns none (S8) | AC-5 |
| L11 | short mode | `slug` | missing | renders the short link (S2); the helper returns it (S8); the slug is not used | AC-5 |
| L12 | control, both modes | copy succeeds | clipboard resolves | `[data-copy-status]` shows `short_link.copied`, and is empty again once fake timers pass 2000 ms | AC-6 |
| L13 | control, both modes | copy fails | clipboard rejects; `navigator.clipboard` undefined | shows `short_link.copy_failed`, still shows it once fake timers pass 2000 ms; no rejection escapes | AC-6 |
| L14 | control, both modes | button label | each locale | `aria-label` and the button's `title` are `short_link.copy_label` | AC-6 |
| L15 | control, both modes | strings | page locale differs from the runtime locale | every string follows the page locale. Stage 6 checks on the diff that no message key is added, removed or changed | AC-6 |
| L16 | page mode | `slug` outside the slug grammar | `My Chall` (X6); `a_b`; `-a` | renders nothing (S2); the helper returns none (S8) | AC-5 |
| L17 | control, both modes | primary click on the URL text | a click event with button 0 and no modifier key | the event's `defaultPrevented` is true; the copy button's click handler does not run | AC-8 |
| L18 | control, both modes | click on the copy button | inside an anchor, as in the list | the click event's `defaultPrevented` is true and the anchor does not navigate (the existing `@click.stop.prevent`) | AC-6 |
| L19 | control | link mode | the build-time constant undefined, as under vitest | page mode | AC-1 |
| L20 | helper | `number` | undefined; `0`; `-1`; `1.5` | returns none | AC-5 |
| L21 | control, both modes | other clicks on the URL text | a click with Ctrl, Meta, Shift or Alt held | the event's `defaultPrevented` is false: the browser handles it, and in the list the row's link opens as a link does | AC-8 |

### Where the control sits (S2, S3)

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| N01 | `ChallengeList`, list view | the props of each row's control | English list | `number` and the row slug, `locale` `en` | AC-7 |
| N02 | `ChallengeList`, list view | the props of each row's control | Traditional Chinese list | the same, with `locale` `zh-TW`. The list only holds challenges that have a Traditional Chinese page | AC-7 |
| N03 | `MergedNav` | the props of both controls (desktop and mobile places) | an English and a Traditional Chinese challenge page | `number` and `slug` from MergedNav's props, and the page's locale | AC-7 |
| N04 | page mode, list and nav | copied URL | each row and each nav, with `withBase` prefixing `/my-range/`, and fixture paths with and without a trailing slash | equals the link form's page URL with s the row slug (list) or the `slug` prop (nav) | AC-7 |
| N05 | `ChallengeList`, list view | each row's `#NNN` badge (the nav has none) | both modes | unchanged | AC-7 |
| N06 | `ChallengeList`, grid view | the copy control | both modes | absent, as today | AC-7 |
| N07 | `ChallengeLayout` → `MergedNav` | `slug` | the built English and Traditional Chinese `selected-excerpts` pages (S3) | the nav's copied URL is the page URL of that page's challenge | AC-7 |

### The built site (S3, page mode)

"Each page" below means the English and Traditional Chinese lists and the English and Traditional
Chinese `selected-excerpts` challenge pages, at 360×740, 375×812, 768×1024, 1024×768 and 1280×800.
"Each state" means: at rest; while `short_link.copied` shows; while `short_link.copy_failed` shows,
with `navigator.clipboard.writeText` made to reject; and, on the challenge pages, with the challenge
marked completed so its done badge shows. A status is produced by clicking copy on the list row with
the longest displayed text, and on the nav's shown control.

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| S01 | page layout | horizontal overflow | each page, each state | `document.documentElement.scrollWidth` ≤ the viewport width | AC-8 |
| S02 | URL text | cut and hover | each shown URL text on each page, each state | computed `display` is not `inline`; `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`. Where `scrollWidth` > `clientWidth`, the text content is still the whole displayed text and `title` is the copied URL | AC-8 |
| S03 | URL text | selecting by hand | one primary click without a modifier on the shown URL text of the first list row and of the nav, on each page, at rest and while `short_link.copy_failed` shows | the selection is the whole displayed text, including any part cut from view, and the page's URL does not change | AC-8 |
| S04 | HTML as served | every URL text | each page, before any script runs, compared with after hydration | the same displayed text: the mode does not change on hydration | AC-9 |
| S05 | copy button | clipboard | one list row and the nav, in each locale, with clipboard permission granted | holds that challenge's page URL | AC-9 |
| S06 | list row | click outside the URL text and the copy button | one row in each locale | opens that row's challenge page, as today | AC-8 |
| S07 | nav | title priority (D7) | each challenge page, each state, wherever the title's `scrollWidth` > its `clientWidth` | the shown URL text's `clientWidth` ≤ the 6ch width + 1 px: the URL text gave up its width first | AC-8 |
| S08 | URL text, upstream-only | the cut really happens | 375×812, the Traditional Chinese `selected-excerpts` page's nav | the URL text's `scrollWidth` > its `clientWidth` | AC-8 |
| S09 | link mode | run-time override | each page at 375×812, with an init script setting `window.__WXL_SHORT_LINKS__ = true` before any page script | after hydration each shown URL text is still the page URL's displayed text | AC-9 |
| S10 | URL text | minimum width (D14) | each shown URL text on each page, each state | `clientWidth` ≥ the 6ch width − 1 px | AC-8 |

### create:challenge (S4)

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| C01 | run | `platform/public/_redirects` | valid arguments, keygen succeeds | after the run it equals `generateRedirects(root)` and holds the new number's `/c/NNN` rule pointing at `/challenge/<slug>/`; status 0 | AC-10 |
| C02 | run | stdout | the same run | contains `platform/public/_redirects` | AC-10 |
| C03 | run | keygen | keygen fails | status 3 (D13); stderr holds W2; `_redirects` byte-identical to before; the scaffold stays | AC-11 |
| C04 | run | generation | keygen succeeds; the tree already holds two challenges with one number | status 2 (D8); stderr holds W1; `_redirects` byte-identical to before; the scaffold stays | AC-11 |
| C05 | run | arguments | an invalid argument; a slug that already exists | status 1 before any file is written | AC-11 |
| C06 | run | generation | a directory under the root's `platform/challenge/` holding an `index.md` that carries no number | status 2, as C04 | AC-11 |
| C07 | run | generation | a Traditional Chinese brief whose number differs from its English page | status 2, as C04 | AC-11 |
| C08 | run | `_redirects` | its bytes differ from the generated content before the run | replaced by the generated content | AC-10 |
| C09 | run | writing | keygen succeeds; `platform/public/_redirects` is a directory, so writing fails | status 2; stderr holds W1 with the write's error; the scaffold stays | AC-11 |

### The hook (S5)

Every H row except H27 and H28 starts from S5's fixture: `platform/public/` holding a committed
`_redirects` that matches the tree and one other file, and one stash entry made before the run. In
each of those rows the pre-existing entry is still in `git stash list` with its commit id (H29). In
every row the real repository's `_redirects`, index and stash list are unchanged (H30). Rows that
name a `git commit` form run through a real `git commit` with the hook installed; the others may run
the hook directly.

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| H01 | staged change | a new challenge under `platform/challenge/` | added, with the working tree's `_redirects` `HEAD`'s; again with it already the expected one, as after `pnpm dev` | O2; the staged `_redirects` gains its `/c/NNN` rule; no W3 in either case | AC-12 |
| H02 | staged change | a Traditional Chinese brief for an existing challenge | added | O2; gains its `/zh/c/NNN` rule; the validator does not run | AC-12 |
| H03 | staged change | a challenge's directories in both trees | deleted (`git rm -r`) | O2; loses both its rules | AC-12 |
| H04 | staged change | a challenge's directories in both trees | renamed (`git mv`) to one new slug | O2; both rules point at the new slug | AC-12 |
| H05 | staged change | a file that changes no rule (an application source file) | modified | O2; the staged `_redirects` keeps `HEAD`'s bytes | AC-12 |
| H06 | staged change | nothing at a watched path (only a README) | — | O1 | AC-13 |
| H07 | staged change | only `_redirects`, edited by hand | through `git commit` | O2 (D5); the staged `_redirects` is the expected one, here `HEAD`'s; W3. git records a commit that changes nothing | AC-12 |
| H08 | working tree | a new challenge directory, untracked, alongside a staged change to another challenge | — | O2; the staged `_redirects` leaves out the untracked challenge; the untracked directory is byte-identical and still untracked afterwards | AC-12, AC-14 |
| H09 | working tree | unstaged changes to tracked files under `platform/` | — | byte-identical afterwards | AC-14 |
| H10 | working tree | `_redirects` with an unstaged change that includes an untracked challenge's rule, so it differs from the expected one | a challenge change staged | O2; afterwards the working tree's `_redirects` equals the staged one (D3); W3, and W4 naming the untracked challenge's directory; the untracked challenge is byte-identical and untracked | AC-14 |
| H11 | index | `_redirects` staged with a hand edit, together with a challenge change, while other files under `platform/` are unstaged | — | O2; the staged `_redirects` is replaced with the expected one; W3; the unstaged files are byte-identical | AC-12 |
| H12 | validation | the validator fails (a required flag or application file deleted; only `index.md` deleted) | — | O3 | AC-15 |
| H13 | generation | a staged Traditional Chinese brief whose number differs from its English page | — | O4 with W5 | AC-15 |
| H14 | staged change | only a Traditional Chinese brief, a directory holding only `index.md` | — | O2; the validator does not run, so there is no validation error | AC-16 |
| H15 | existing cases | every case of today's `tests/pre-commit-sh.test.ts` | run against the real hook in S5's fixture | the exit status that test asserts today | AC-15 |
| H16 | bypass | `git commit --no-verify`; a clone where `pnpm install` never installed the hook; the commits git makes without pre-commit (commit forms) | — | the hook does not run; the unchanged guard test reports a stale `_redirects` in CI. This follows from the guard's existing assertion and is not run as a separate experiment | AC-17 |
| H17 | staged change | retiring a challenge whose Traditional Chinese brief stays | the English directory moved to `.archive/challenge/` | O4 with W6 (D12) | AC-15 |
| H18 | index | `_redirects` absent from the index and the working tree; `platform/public/` keeps its other file | a challenge change staged | O2; the expected `_redirects` is staged as added | AC-12 |
| H19 | working tree | one challenge file with a staged hunk and an overlapping unstaged change | — | O2; the file's working-tree bytes equal its unstaged content from before the hook | AC-14 |
| H20 | working tree | an ignored directory with an `index.md` under `platform/challenge/` (for example `logs/`, which `.gitignore` ignores) | a challenge change staged | O2; the staged `_redirects` holds no rule for it | AC-12 |
| H21 | staged change | only the English directory of a challenge that has a Traditional Chinese brief | deleted | O4 with W6 (D12) | AC-15 |
| H22 | staged change | only the English directory of a challenge that has a Traditional Chinese brief | renamed | O4 with W6 (D12) | AC-15 |
| H23 | staged change | a retired challenge | moved back from `.archive/challenge/` | O2; its `/c/NNN` rule returns | AC-12 |
| H24 | staged change | a challenge's `index.md` | changed in type: replaced by a symbolic link to `brief.md` in the same directory, which holds the same bytes and is staged | O2; the staged `_redirects` keeps `HEAD`'s bytes; the validator does not receive the path | AC-12 |
| H25 | interruption | SIGINT; SIGTERM; SIGHUP, each sent to the hook's process group while a generator stub blocks after writing its marker | a challenge change staged, files unstaged | O5 | AC-23 |
| H26 | git failure | a generator stub creates `.git/index.lock` and leaves it, so `git add` fails and so does the restore | a challenge change staged, files unstaged | O7: W9, and the entry with the printed id is listed. Once the lock is removed, `git stash apply` of that id brings the unstaged files back byte for byte | AC-23 |
| H27 | no `HEAD` | first commit, with an unstaged file under `platform/` | its own fixture: a new repository with no commit and no stash entry, `platform/public/` holding one other file | O6 with W7 | AC-23 |
| H28 | no `HEAD` | first commit, everything under `platform/` staged | the same fixture as H27 | O2 | AC-23 |
| H29 | stash | the pre-existing entry | every H row except H27 and H28 | still listed, with the same commit id | AC-23 |
| H30 | other repositories | the real repository's `_redirects`, index and stash list | every H row | byte-identical `_redirects`; `git ls-files --stage` and `git stash list` unchanged | AC-23 |
| H31 | commit form | `git commit -a` after a change like `create:challenge`'s: tracked `_redirects` modified to include a new, untracked challenge | through `git commit -a` | the commit's `_redirects` is the expected one, without the untracked challenge's rule; W3, and W4 naming the untracked challenge's directory | AC-22 |
| H32 | commit form | `git commit --amend` that adds a challenge | through `git commit --amend` | O2; the amended commit's `_redirects` is the expected one | AC-22 |
| H33 | commit form | a path of a challenge file given to the commit | through `git commit -- <path>` and through `git commit --only <path>` | exit 1 with W8; index, working tree and stash list as before; no commit | AC-22 |
| H34 | repair | committed `_redirects` stale; `pnpm redirects:generate`, `git add` of the file | through `git commit` | the commit's `_redirects` is the expected one | AC-22 |
| H35 | merge | a merge whose conflict in `_redirects` is resolved with `pnpm redirects:generate` and `git add` | concluded through `git commit` | the merge commit's `_redirects` is the expected one | AC-22 |
| H36 | commit form | a challenge change selected interactively | through `git commit -p`, with its answers piped on stdin | O2; the commit's `_redirects` is the expected one | AC-22 |
| H37 | commit form | a challenge file named with `-i` | through `git commit -i <path>` | O2; the commit's `_redirects` is the expected one | AC-22 |
| H38 | commit form | a linked worktree of the fixture repository, a challenge change staged, files unstaged | through `git commit` in that worktree | O2; the worktree's unstaged files are byte-identical; the pre-existing entry, in the `refs/stash` the worktrees share, is still listed | AC-22 |
| H39 | staged change | retiring a challenge together with its Traditional Chinese brief | the English directory moved to `.archive/challenge/` and the brief deleted, in one commit | O2; both its rules go | AC-12 |
| H40 | staged change | only a challenge's Traditional Chinese brief | deleted | O2; the `/zh/c/NNN` rule goes and the `/c/NNN` rule stays | AC-12 |
| H41 | staged change | only a challenge's Traditional Chinese directory | renamed | O4 with W6 (D12) | AC-15 |
| H42 | stash | only `_redirects` staged with a hand edit, a different version unstaged, nothing else under `platform/` unstaged or untracked | — | O2 with W3; the hook makes no entry of its own; the pre-existing entry is neither applied nor dropped | AC-23 |
| H43 | staged snapshot | a tracked challenge's `index.md` with an unstaged change to an unused number, while another challenge's application file is staged | — | O2; the staged `_redirects` keeps `HEAD`'s bytes, from the index's number; the unstaged number is back in the working tree afterwards | AC-12 |
| H44 | upgrade | a fixture whose committed `_redirects` carries the generator header from before this epic, as in a range that upgrades into it | a challenge change staged, through `git commit` | O2; the commit's `_redirects` is the expected one, new header included | AC-22 |
| H45 | shell | H02, H07, H14 and H34 run with macOS's `/bin/bash` 3.2 | only where `/bin/bash` reports version 3; CI's ubuntu has none, so stage 5 runs it on a Mac and the coverage report says so | the same outcome each row gives under bash 5 | AC-23 |
| H46 | git failure | `.git/index.lock` exists before a direct `bash` run, so the hook's stash push fails | a challenge change staged, files unstaged | O5, before any change: everything as before | AC-23 |
| H47 | interruption | SIGINT sent to the process group of a `git commit -a` while a generator stub blocks | a challenge change, files unstaged | whether git or the hook handles the signal first is a race the test cannot fix, so either O5 or O7 is accepted. In both, `.git/index` is as before and no commit is made. Every unstaged file is either back byte for byte or held by the entry W9 names | AC-23 |

### The guard test and CI

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| G01 | guard test | assertion and inclusion rule | this epic's diff | unchanged; the CI steps that run `pnpm test` are unchanged on every host | AC-17 |
| G02 | committed `_redirects` | header | after the header gains E1 | regenerated in the same commit; the guard test passes | AC-17 |

### fork:init anchors

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| F01 | `shortLink.ts`, `.vitepress/config.mts` | fork:init's anchor lines (`SITE_ORIGIN`, `siteBase`, `title`) | after this epic's changes | each file still holds exactly one line matching each anchor; `fork-init.test.ts` and `upstream-guard.test.ts` pass | AC-25 |

### Documents (S6, stage 6)

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| T01 | file | E1 | each of the five sentence-map rows that list E1 | each holds E1 under the match rule | AC-18 |
| T02 | file | Z1 | each of the five rows that list Z1 | each holds Z1 | AC-18 |
| T03 | file | E2, Z2 | `README.en.md` (E2); `README.md` and both wxl-fork-init trees (Z2) | each holds its sentence | AC-19 |
| T04 | S6 | where it runs | upstream; a range | S6 runs only when the upstream decision holds. Stage 6 checks on the diff that S6 is gated on it; the decision's own test in `upstream-guard.test.ts` already covers range inputs | AC-18 |
| T05 | stage 6 | passages P1–P8 | this epic's diff | each passage says what the passages table requires | AC-24 |

### Stage 8 (S7)

Stage 8 of the ticket that lands last runs V01–V05 against a commit that holds every change of this
epic. An earlier ticket runs the V rows its own change can show; stage 4 assigns them.

| Id | Type | Field | Boundary | Expected behaviour | AC |
|---|---|---|---|---|---|
| V01 | Cloudflare preview of the ticket branch | list and nav, en and zh-TW | challenge pages checked with their Browser panel open (hard rule 4) | display and copy short links whose origin is `SITE_ORIGIN`. `/c/NNN` and `/zh/c/NNN` requested on the preview's own host open their challenges, which exercises the preview's `_redirects` | AC-20 |
| V02 | local `pnpm build` without `CF_PAGES`, served by `pnpm docs:preview`, driven with `/agent-browser` or the host's native browser tools | list and nav, en and zh-TW, at 375 wide and 1280×800 | challenge pages checked with their Browser panel open (hard rule 4) | display and copy page URLs; at 375 wide a URL that does not fit ends in an ellipsis and its `title` is the whole URL; a click on the URL text selects it without leaving the page | AC-20 |
| V03 | a temporary local clone of the ticket branch in a scratch directory, with `pnpm install` run and Rust available, on a throwaway branch that is never pushed and is removed afterwards | `pnpm create:challenge --backend php`, `git add` of the new challenge, `git commit` through `/tw-emoji-commit` | no step for `_redirects` by hand | the commit holds the expected `_redirects` and the guard test passes on it. Separately, the ticket PR's CI passes | AC-20 |
| V04 | temporary GitHub Pages project-site repository (its name is not `<owner>.github.io`), created with create-wxl (`--host github-pages`, `CREATE_WXL_COMMIT` set to the pushed ticket commit), pushed, deployed with Run workflow | one URL copied from the list and one from the nav, in each locale | English URLs opened in a profile whose stored language is English (D6); challenge pages checked with their Browser panel open | each opens its challenge | AC-21 |
| V05 | the same repository | `pnpm create:challenge --backend php`, `git add`, `git commit` through `/tw-emoji-commit`, `git push`, then a deployment | — | in the range's CI, the `Run tests` step's log shows the guard test's case passing, and the run passes. The new challenge's page URL, copied from the deployed list and opened in the English profile, opens it. Afterwards the user deletes the repository; every outward action is confirmed with the user before it runs | AC-21 |

The PHP skeleton is used because the default Flask one holds `0.0.0.0`, which the existing validator
refuses (`challenge-analyze.ts`). If the validator refuses the skeleton for any other reason outside
this epic, the run rewrites it as wxl-create's Step 3 does and records that it did.

## Acceptance criteria index

| AC | Rows | Seam |
|---|---|---|
| AC-1 | M01–M04, L19 | S1, S2 |
| AC-2 | L01–L03 | S8, S2 |
| AC-3 | L04–L07 | S8, S2 |
| AC-4 | L08 | S2 |
| AC-5 | L09–L11, L16, L20 | S8, S2 |
| AC-6 | L12–L15, L18 | S2; message keys at stage 6 review of the diff |
| AC-7 | N01–N07 | S2; N07 at S3 |
| AC-8 | L17, L21, S01–S03, S06–S08, S10 | S2, S3 |
| AC-9 | S04, S05, S09 | S3 |
| AC-10 | C01, C02, C08 | S4 |
| AC-11 | C03–C07, C09 | S4 |
| AC-12 | H01–H05, H07, H08, H11, H18, H20, H23, H24, H39, H40, H43 | S5 |
| AC-13 | H06 | S5 |
| AC-14 | H08–H10, H19 | S5 |
| AC-15 | H12, H13, H15, H17, H21, H22, H41 | S5 |
| AC-16 | H14 | S5 |
| AC-17 | G01, G02, H16 | stage 6 review of the diff; the guard test in CI |
| AC-18 | T01, T02, T04 | S6; T04 at stage 6 review of the diff and the existing upstream-guard test |
| AC-19 | T03 | S6 |
| AC-20 | V01–V03 | S7 |
| AC-21 | V04, V05 | S7 |
| AC-22 | H31–H38, H44 | S5 |
| AC-23 | H25–H30, H42, H45–H47 | S5 |
| AC-24 | T05 | stage 6 review of the diff |
| AC-25 | F01 | the existing fork-init and upstream-guard tests |

Every row reaches an acceptance criterion, and every acceptance criterion has at least one row.

## Checks on this revision

**Every new rule has its parameters, closed boundaries and a way to verify it.** The mode rule
lists every value class (M01–M03) and the undefined constant (L19), and the run-time override is
observed in a build (S09). The link forms cover both modes × both locales × origins with and without
a path, plus a slug outside the grammar (X1–X6). The render conditions cover the number and the slug
in both modes, at the helper (L10, L16, L20) and the control (L09–L11, L16). The hook has a trigger,
a commit-forms rule with its measured table, constraints, seven outcomes and a message table. Each
matrix row names its seam.

**Revision 3's new guarantees, checked against the existing rules and against each other**
(`docs/agents/review.md`, "Two rounds, then split"):

| New guarantee | Checked against | Result |
|---|---|---|
| D12: the orphan-brief refusal | `redirects.test.ts` "backs every translated slug with a root-locale challenge"; US-2; GLOSSARY's retired challenge; D5; H02, H40 | no conflict. The hook now refuses exactly what that test would fail in CI. A retirement passes when the brief goes in the same commit (H39), and both short links then stop, as GLOSSARY says. Adding or deleting only a brief still passes (H02, H40). A commit that only repairs `_redirects` finds no orphan in a tree CI accepted |
| D12 × the per-tree index slugs | K-17's case: the brief's `index.md` tracked, the English `index.md` not yet staged | refused with W6. CI would fail the same commit, so the refusal moves the failure earlier and names it |
| D13: keygen failure exits 3 | C05 (status 1 before any file is written); wxl-mutate's statuses; P7; `pnpm` forwarding | consistent. Status 1 now always means nothing was written, so re-asking the name on 1 is safe. `challenge:retype` uses 3 for the same failure. `pnpm` 10.28.0, the version `packageManager` pins, returns a script's status 2 and 3 unchanged (measured 2026-10-21). No other caller or document reads keygen's status as 1 (searched: scripts, tests, CI, README, CONTRIBUTE, challenge-pipeline) |
| D14: the 6ch minimum (S10) | S01 at 360 wide while `short_link.copy_failed` shows; S08; D7 and S07 | compatible only if the status text does not widen the row. The spec lets the status text wrap and the nav's mobile row grow taller while a status shows. 6ch is shorter than any page URL or short link, so S08's cut still happens. S07 is now D7's definition, with the minimum as its floor |
| The commit-forms predicate | the measured table; a direct `bash` run; a linked worktree; `-p` and `--only` | the predicate gives "own" for every measured form the outcomes should apply to, and "other" for the path form. A direct run has the variable unset. `-p` and `--only` are inferred and checked by H36 and H33 |
| Restore, then drop; O7 | O5's stash column; AC-23; B2 "restores … byte for byte" | O5 now applies only when every restore completed, and O7 covers the rest. O7 keeps the bytes in the entry and prints how to apply it, so B2's guarantee holds once the entry is applied |
| The hook's entry is the one `refs/stash` gained | H29; the measured case where a push excluding `_redirects` saves nothing | consistent. Measured 2026-10-21 (git 2.54.0): such a push prints "No local changes to save", exits 0 and leaves `refs/stash` unchanged, so taking `stash@{0}` would have picked the teacher's entry. H42 covers it |
| W3's condition | D3; H01, H07, H10, H11, H31, H42 | H01 after `pnpm dev` prints nothing; every case that discards a version the teacher made prints W3 |
| Per-tree index slugs | the guard's per-slug `index.md` rule; G01 | the same file on a clean checkout, which is what CI has. `includeSlug` gains the page's locale as a second argument, so the guard's one-argument call does not change |
| The validator runs only with paths | O3; H02, H14 | validation of staged `platform/challenge/` paths is unchanged; only the empty call, which bash 3.2 rejects, is gone |
| L21: modifier clicks are not prevented | D4; S03; S06 | a plain click still selects (S03); only clicks with a modifier key go to the browser |
| S09 and the narrowed L19 | AC-1; B1 | S2 asserts only the undefined constant. The run-time claim is observed where the constant is really replaced |
| E2 and Z2 name `SITE_ORIGIN` | D10; P1, P2, T03; rebrand mode, which refuses `--origin` | the remedy no longer depends on a fork:init mode, so it also holds where rerunning fork:init with `--origin` cannot work |
| H07's commit that changes nothing | D5 | accepted and stated. The hook does not refuse it: refusing would leave the hand edit staged |
| V03 in a local clone | R-8's shared `refs/stash` | a clone shares no refs with the developer's checkout, so the hook's first run on a real stash cannot touch the developer's entries |
| Never restore into a missing index (H47) | O5, O7; round 2's inference that git removes `index.lock` on SIGINT during `commit -a` | which process handles the signal first is a race, so H47 accepts O5 or O7. It asserts what both share: the real index is unchanged, no commit is made, and no unstaged file is lost. This is the only row that accepts two outcomes, and it says why |

**Revision 2's checks that were wrong or imprecise:**

- "Index slugs: the same rule applied to the index." The guard keeps a slug whose `index.md` is
  tracked in either tree, while revision 2's index slugs counted any path. Revision 3 uses per-tree
  `index.md`, which gives the guard's result on a clean checkout (round 2: C-14, K-17, R-11).
- "`-a`, `-p` and `--amend` run on the repository's own index." This was not observable from the
  hook. `-a` hands the hook `index.lock` (measured). Revision 3 states the predicate (V-1, R-2, C-1,
  K-10).
- "Status 1 keeps its meaning." Keygen failure was status 1 too (K-3). D13 separates it.

**Revision 1's checks that still hold:** C01 versus the guard (a local mismatch until staging,
which `pnpm dev` already causes); the constant is kept out of `shortLink.ts`'s Node imports; today's
short-link assertions set short mode explicitly. Revision 1's claim about H14 was wrong and was
withdrawn in revision 2 (round 1, V-3).
