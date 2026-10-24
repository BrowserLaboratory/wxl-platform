# Spec 0007: GitHub Pages range fixes — a `_redirects` that keeps up, and links that open

Status: revision 3.3 (2026-10-24). Rounds 1 and 2 of adversarial review found no P0
(`review/round-1.md`, `review/round-2.md`), so the stage 3 gate is met. Revision 3 applies round 2's
disposition (`review/disposition-2.md`) and the user's decisions D12–D15. Two rounds is the ceiling,
so revision 3 is self-checked rather than reviewed again (D15). Revision 3.1 (2026-10-24) adds D16,
which names two ends of O7 that T-0034's review measured. Revision 3.2 (2026-10-24) applies the
review of 3.1, in two rounds: it rewrites D16 and the hook's failure outcomes, and changes four of
the hook's ends (D16 (b), (c), H51, H52). Revision 3.3 (2026-10-24, the epic's close-out) narrows
B3 to repositories whose Actions run and names upstream's parallel sessions in B2's last column, as
the user chose for the chain analysis's N-1 and N-2 (`review/chain-analysis.md`; T-0051, T-0052).
Derived from `traceability.md`,
which holds:

- the decisions (S8, Q4–Q11, Q33, D1–D16);
- the seams 0007-S1 to S8;
- the vocabulary and the mode rule;
- the link forms with examples X1–X6;
- the canonical sentences E1, Z1, E2 and Z2, with their sentence map and match rule;
- the passages to rewrite, P1–P8, and the messages W1–W9;
- the hook's trigger, commit-forms rule, constraints and outcomes O1–O7;
- rows M, L, N, S, C, H, G, F, T and V.

Stage 1 is recorded in the local research note `.proj.research/2026-10-18-dev-image-gh-pages-grill.md`.

## Problem Statement

At the 2026-10-17 workshop, teachers whose ranges deploy to GitHub Pages ran into two problems.

First, a teacher added a challenge, pushed it, and CI failed. `platform/public/_redirects` is
generated from the challenges and committed, and CI checks that the committed file matches the
challenges. Only `pnpm dev` and `pnpm build` regenerate it, though: `pnpm create:challenge` does
not, and neither does the commit. The documents tell the teacher never to edit the file, but
nowhere say that it has to be committed with the challenges, and a GitHub Pages range never reads
it anyway. A translated brief, a deleted challenge or a renamed one changes the file too, with the
same result.

Second, the copy button beside each challenge gives a short link (`/c/001`). Short links are
`_redirects` rules, and only Cloudflare Pages reads that file, so on a GitHub Pages range the link a
teacher hands out leads to a 404. The button cannot tell which host it runs on.

## Solution

`_redirects` keeps up by itself. `pnpm create:challenge` regenerates it right after keygen. The
pre-commit hook regenerates and stages it whenever a commit carries a change to a challenge in
either language, or to the file itself. Either way, the commit carries the file CI expects, and CI
passes without the teacher knowing the file exists. The teacher's other uncommitted work is left as
it was, or, if the hook cannot put it back, kept in a stash entry whose id the hook prints. A commit
that would leave a Traditional Chinese brief without its English challenge is refused with the
reason, since CI would fail it. Every file of the sentence map says the same sentence about
`_redirects`, including how to repair a stale one.

The copy control follows the build. When Cloudflare Pages builds the site (`CF_PAGES=1`), it shows
and copies the short link as today. Any other build shows and copies the challenge page's URL
(`https://<owner>.github.io/<repo>/zh-TW/challenge/<slug>/`), which a static host serves without
redirect rules. A URL that does not fit is cut with an ellipsis, never narrower than six
characters, and shown whole on hover. A plain click on it selects it for copying by hand. Nothing is
configured or recorded: an existing range gets this by upgrading. The CI guard, the deployment, and
the decision to commit `_redirects` do not change.

Two limits stay. First, a page URL only opens where `SITE_ORIGIN` names the range's real address.
Second, the site's existing language redirect sends a learner with no stored preference from an
English page to its Traditional Chinese one, which a challenge without a Traditional Chinese brief
lacks (OQ-023).

## User Stories

1. As a teacher on a GitHub Pages range, I want to add a challenge and push it without CI failing, so that I can publish a challenge without learning about `_redirects`.
2. As a teacher, I want a translated brief, a deleted, renamed or retired challenge committed together with the matching `_redirects`, so that every kind of challenge change passes CI.
3. As a teacher, I want my uncommitted changes and new files left as they were after I commit, so that the commit step never costs me work.
4. As a teacher, I want a commit refused, with the reason, when `_redirects` cannot be regenerated or CI would reject the challenge tree, so that I fix the cause before CI does it for me.
5. As a teacher on a GitHub Pages range, I want the copy button to give the challenge page's URL, so that the link I hand to my class does not depend on redirect rules the host ignores.
6. As a teacher on a Cloudflare Pages range, I want the short links unchanged, so that my handouts keep surviving renames.
7. As a teacher, I want the address on screen to be the one that gets copied, readable on a phone without hiding the challenge's title, so that I can select it by hand when copying fails.
8. As a teacher, I want the documents and skills to say one consistent thing about `_redirects` and about what the copy button gives, so that I know what to commit, how to repair a stale file, and what a rename breaks.
9. As a teacher with an existing range, I want these fixes to arrive with an upgrade and no new setting, so that I do not reconfigure anything.
10. As upstream, I want the teacher's original scenario rerun on a real GitHub Pages range, so that the fix is proven where the problem appeared.

## Implementation Decisions

- **Link mode.** The site configuration reads `CF_PAGES` once at build time and hands the site
  bundle a compile-time constant, `__WXL_SHORT_LINKS__`. It is defined like the configuration's
  other flags, as the source text `true` only for the exact string `1` and `false` otherwise (mode
  rule). The control reads the mode through a small module that a component test replaces with
  `vi.mock`. That module treats an undefined constant, as under vitest, as page mode. In a build the
  constant is replaced at compile time, so nothing set at run time changes the mode (S09), and the
  server-rendered HTML and the hydrated page agree. The site base and head links do not depend on it.
- **Link helper.** `.vitepress/challenge/shortLink.ts` gains a pure helper that returns the copied
  URL and the displayed text for a mode, number, slug, locale and origin, or nothing (link forms).
  It takes a number, appends to the origin as given, and does not normalise it. The existing
  short-link helpers keep their behaviour. The constant is not referenced in that module, because
  the build scripts import it under Node through `challenge-numbers.ts`, where the constant does not
  exist. fork:init's anchor lines in this file and in `config.mts` stay one each.
- **The copy control.** `ShortLinkShare` takes a `slug` prop alongside `number` and `locale`.
  - It renders nothing without a valid number, and in page mode also without a slug inside the slug
    grammar. A string number is converted with `Number()` first, as today.
  - The URL text is a non-inline box that never wraps. It is cut with an ellipsis when it does not
    fit, never gets narrower than its 6ch width (D14), and carries the copied URL as its `title`.
  - A primary click on it without a modifier key prevents the default action and selects the whole
    text, so inside the list's row anchor it no longer opens the challenge (D4). A click with Ctrl,
    Meta, Shift or Alt held is left to the browser (L21). The rest of the row still opens the
    challenge.
  - The status text may wrap, so that `short_link.copy_failed` neither widens the row nor squeezes
    the URL text below its minimum.
  - The same markup serves both places (D2). Every interface string and message key stays as it is,
    and the component keeps its name.
- **Callers.** `ChallengeList` passes each row's slug, the last segment of the row's path as
  `slugOf` derives it today. `MergedNav` gains a `slug` prop, which `ChallengeLayout` supplies from
  the page alongside `number`, and passes it to both its desktop and its mobile control. In the nav,
  the URL text gives up width before the title does, down to its minimum (D7, D14). The mobile row
  may grow taller while a status shows. The page URL is `SITE_ORIGIN` followed by the page's path
  within the site, with no base added, since fork:init derives an origin that already carries a
  GitHub Pages project site's path.
- **create:challenge.** The script gains an exported entry that takes argv plus `root` and a keygen
  runner, and returns its exit status. The CLI guard calls it with the repository root and
  `pnpm challenge:keygen <slug>`. After keygen succeeds, it rewrites `platform/public/_redirects`
  with `writeRedirects` over the whole working tree, as `pnpm dev` and `pnpm build` do, and names the
  file in its output. Exit statuses:
  - An invalid argument or a name collision: status 1, before any file is written.
  - Keygen fails after the scaffold was written: status 3 (D13), with W2. `_redirects` is not
    touched and the scaffold stays.
  - Regeneration fails after keygen succeeded, because the generator refuses the tree or the write
    fails: status 2 (D8), with W1. W1 says the challenge was created and that committing it
    regenerates `_redirects` from what is staged. `_redirects` and the scaffold stay as they are.
- **The pre-commit hook.** `scripts/pre-commit.sh` triggers on any staged change at a watched path:
  `platform/challenge/`, `platform/zh-TW/challenge/` or `platform/public/_redirects` (D5).
  - **Commit forms.** It tells its own index from another by `GIT_INDEX_FILE`. On its own index the
    outcomes apply. On another, as `git commit <pathspec>` uses, it refuses with W8 when the run
    triggers.
  - **Validation** still covers only the staged `platform/challenge/` paths that today's `ACMRD`
    filter selects, and runs only when there is one. The hook works under macOS's `/bin/bash` 3.2.
  - **An orphan brief** in the staged snapshot is refused before generation, with W6 (D12).
  - **The stash** never holds `_redirects`. The hook stashes only when something else under
    `platform/` is unstaged or untracked, and treats as its own only the entry that `refs/stash`
    gained. On every exit, including interruption and a failed git command, it restores that entry,
    and drops it only after the restore completed and either the index under `platform/` is the one
    the entry recorded, or the run is on an `index.lock` that still exists, which git discards. If
    restoring fails or stops partway, or the index is gone before or during the restore, it keeps
    the entry and prints its id with W9 (O7). After a stash push that stopped partway and changed
    the repository's own index, it puts the files back, keeps the entry, and W9 prints the command
    that puts the index back (O7), also when the restore failed. On `index.lock` (`-a`, `-i`, `-p`),
    git discards such a change, so the hook drops the entry (O5). What the entry gives back is
    described in D16 (a).
  - **Regeneration** runs after validation passes. The hook generates over the staged snapshot with
    the per-tree index slugs, so ignored and untracked directories are left out. It names its own
    repository's top level as the root, then writes and stages `_redirects`.
  - **Outcomes O1–O7** cover the ends the matrix exercises. After success, the working tree's
    `_redirects` equals the staged one (D3), and W3 names the file when the hook replaced a version
    the teacher made. After O3, O4 and O6, the index and the working tree are as before; after O5,
    they are too, except that `_redirects` may hold the expected content. O7, where the hook keeps its
    entry, is described in the outcomes table and D16. On a first commit with unstaged files, the hook
    refuses with W7.
- **wxl-create.** Step 2 in all four skill files (two trees, two languages) branches on the exit
  status as P7 requires:
  - On exit status 2 it surfaces W1 and continues to Step 3.
  - On exit status 3 it surfaces W2 and stops.
  - It re-asks the name only on exit status 1, and its menu answers with words.
- **Generator header and documents.** `generateRedirects`' header carries E1, and the committed
  `_redirects` is regenerated in the same commit. `includeSlug` also receives the page's locale; the
  guard's one-argument call is unchanged. Each file of the sentence map carries its sentences:
  - E1 or Z1 says what `_redirects` is and how to repair it.
  - E2 or Z2 says what the copy button gives, what a rename breaks, and that the URL opens the range
    only while `SITE_ORIGIN` holds its address.

  Passages P1–P8 are rewritten as the passages table requires. These include:
  - the README note and the wxl-fork-init paragraph;
  - every description of `SITE_ORIGIN` or `--origin` as only the short links' origin, in the
    READMEs, the wxl-fork-init skills, fork:init's comments and warning, and create-wxl's summary
    line;
  - the component comments that D2, D4, D7 and D14 override;
  - the hook and generator comments;
  - two GLOSSARY sentences.

  Both wxl-fork-init files keep Traditional Chinese as their language.
- **Unchanged.** The guard test, its inclusion rule and the CI steps that run it; the deploy
  template; fork:init's behaviour; `range.json`; `SITE_ORIGIN`'s grammar; the list's `#NNN` badge
  and its grid view; the decision to commit `_redirects`; the language redirect (OQ-023); the
  validator's filter.
- **GLOSSARY.** No new term beyond the four edits from stage 1, which land with this epic: the
  `article` entry, the teacher and upstream `_Avoid_` lines, and the short link's note on what the
  copy button gives, which calls it "題目頁的網址" as Z2 does. P8 rewrites two existing sentences. The
  spec's English term for the copied full address is "page URL" throughout.

## Trust Boundaries and Threat Model

| # | Boundary | Protects | Does not protect | Outside the model |
|---|---|---|---|---|
| B1 | Build environment → built site (`CF_PAGES`) | Only the exact value `1` selects short links. Every other build gets page URLs, which need no redirect rules. The choice is fixed at build, so the HTML as served and the hydrated page agree, and nothing set at run time switches it (S09) | A build outside Cloudflare Pages with `CF_PAGES=1` set by hand ships short links that only resolve where `_redirects` is read. A Cloudflare build whose `SITE_ORIGIN` still names another host (a GitHub Pages range moved to Cloudflare without rerunning fork:init) ships short links to that host. A preview deployment's short links point at production. A Cloudflare Direct Upload or Workers build ships page URLs (Q8, accepted) | Cloudflare's build platform itself |
| B2 | Pre-commit hook → the teacher's index and working tree | Outcomes O1–O7 and the hook's constraints. The hook stages only `platform/public/_redirects`, derived only from the staged snapshot and the index slugs. It restores every other unstaged change and untracked file under `platform/` byte for byte, or keeps them in its own stash entry and prints the entry's id (O7). It never applies or drops another entry. It refuses rather than guesses on a first commit with unstaged files, on another index, and on an orphan brief. It writes no working-tree file outside `platform/` and no other repository's files | `--no-verify`, a clone where `pnpm install` never installed the hook, or a client that skips hooks or lacks Node. Commits git makes without pre-commit: a merge git concludes itself, `cherry-pick`, `revert`, `rebase`, `am`, and GitHub's web interface. B3 catches the stale file each of these leaves. An unstaged version of `_redirects` is replaced (D3), with W3. Empty untracked directories under `platform/` are not restored. Symbolic links are followed. The generator scripts run from the working tree, so their unstaged edits apply. In O7 the files are in the hook's entry, which gives them back as D16 (a) says: a file git converts when it adds it (CRLF under `eol=lf` when its index version has no CR) comes back converted, and with `git stash apply` an unstaged hunk overlapping or adjacent to a staged one conflicts. A file the index adds and the working tree has deleted comes back with its index version. After a stash push that stopped partway on the repository's own index, the index stays as the push left it until W9's `git restore --staged` command is run (D16 (b)) | Another process changing the repository during the commit, including a commit in another worktree of the same repository. Upstream's own parallel sessions commit this way; there the hook can claim, restore or drop the other session's stash entry (T-0052). SIGKILL and a power loss |
| B3 | CI guard test → merge and deploy | Unchanged: it runs on every range and host whose repository runs GitHub Actions, and this epic neither skips nor weakens it (Q9) | A range whose own CI configuration the teacher has changed. A repository whose Actions are not enabled: a new repository can show GitHub's request to enable workflows, and until the owner does, no push or pull request runs the guard while a `workflow_dispatch` deploy still runs (T-0039 V05, T-0051). A deploy that runs `pnpm build` regenerates `_redirects` from the tree; a host that builds with `vitepress build` alone ships the committed file | — |
| B4 | Built site → learner's screen and clipboard | The text comes only from `SITE_ORIGIN`, the padded number and a slug inside the slug grammar, rendered through Vue's escaping text and attribute bindings. `SITE_ORIGIN` is set by fork:init, or by hand where the wxl-fork-init skill says to. No learner input and no new request is involved | A `SITE_ORIGIN` that does not name the range's real address gives links that do not open, or that open the site it names (D10). A fork keeps upstream's origin when it never ran fork:init, or ran it with only `--base` or in rebrand mode without editing the constant. Its links then open upstream's site, where learners' records are stored under upstream's origin. A renamed repository, a custom domain without `--origin`, and a hand-edited value with a trailing slash also break links. A learner with no stored preference is redirected from an English page URL to a Traditional Chinese page, which may not exist (D6, OQ-023) | — |
| B5 | `create:challenge` → the teacher's working tree | Besides its existing files, it writes only `_redirects`. Generation refuses an inconsistent tree before writing, with its own status (2), and keygen failure has its own status (3) | `_redirects` bytes that differ from the generated content are replaced (C08) | — |

No intended vulnerability of any challenge is touched, so ADR-0005 does not apply.

## Acceptance Criteria

- **AC-1** Imported with `CF_PAGES` = `1`, the site configuration's `__WXL_SHORT_LINKS__` is the string `'true'`. Unset, empty, `0`, `true`, ` 1` and `1 ` all give `'false'`. `base` and `head` follow `SITE_BASE` exactly as `config-base.test.ts` asserts, whatever `CF_PAGES` is. With the constant undefined, the control is in page mode. (M01–M04, L19)
- **AC-2** In short mode, the helper and the control give X1 and X2, pad 42 to `042`, leave 1234 unchanged, and need no slug. (L01–L03)
- **AC-3** In page mode, the helper gives exactly X3, X4 and X5, and the control gives the same with the real `SITE_ORIGIN`, following the page locale. An origin's path is kept and no base is added. (L04–L07)
- **AC-4** In both modes the URL text's `title` is the copied URL. (L08)
- **AC-5** What gives nothing:
  - The control renders nothing in either mode for a number that is missing, `null`, `0`, `-1`, `1.5`, `""` or `"abc"`. A string is converted with `Number()` first, as today, so `"7"` renders as 7.
  - The helper returns none for a number that is undefined, `0`, `-1` or `1.5`.
  - In page mode, a slug that is missing, empty, or outside the slug grammar (`My Chall`, `a_b`, `-a`) gives nothing from either.
  - In short mode a missing slug still renders the short link. (L09–L11, L16, L20)
- **AC-6** In both modes:
  - A successful copy shows `short_link.copied`, and the status is empty again once fake timers pass 2000 ms.
  - A rejected copy, or one with no clipboard, shows `short_link.copy_failed` and still shows it once fake timers pass 2000 ms. No rejection escapes.
  - The button's label is `short_link.copy_label`. Its click event has `defaultPrevented` set, and an enclosing anchor does not navigate.
  - Every string follows the page locale. Stage 6 checks on the diff that no message key is added, removed or changed. (L12–L15, L18)
- **AC-7** These controls pass the challenge's number, its slug and the page's locale:
  - in list view, each row's control in the English and Traditional Chinese lists;
  - both nav controls on English and Traditional Chinese challenge pages.

  Grid view has no control. In page mode, the copied URL equals the link form's page URL with s the row slug or the nav's `slug`. This holds whether the fixture path has a trailing slash or not, and with `withBase` prefixing `/my-range/`. On the built `selected-excerpts` pages in both languages, the nav's copied URL is that page's page URL. The list's `#NNN` badge is unchanged in both modes. (N01–N07)
- **AC-8** Interaction and layout:
  - A primary click event without a modifier key on the URL text has `defaultPrevented` set and does not run the copy handler. A click with Ctrl, Meta, Shift or Alt held does not have it set.
  - The built site is checked in page mode on both lists and both `selected-excerpts` pages, at 360×740, 375×812, 768×1024, 1024×768 and 1280×800. Each viewport is checked in each state: at rest, while `short_link.copied` shows, while `short_link.copy_failed` shows, and on challenge pages with the challenge completed.
  - The document never scrolls sideways.
  - Each shown URL text has a computed `display` other than `inline`, and `white-space: nowrap`, `overflow: hidden` and `text-overflow: ellipsis`. Its `clientWidth` is at least its 6ch width less 1 px. Where it overflows, its content is still the whole displayed text and its `title` is the copied URL.
  - One plain click on it, in the first list row and in the nav, at rest and while `short_link.copy_failed` shows, selects the whole displayed text and leaves the page's URL unchanged. A click elsewhere in a list row opens that challenge.
  - In the nav, wherever the title is cut, the shown URL text's `clientWidth` is at most its 6ch width plus 1 px.
  - Upstream only: at 375×812 the Traditional Chinese `selected-excerpts` nav URL text overflows. (L17, L21, S01–S03, S06–S08, S10)
- **AC-9** On each page of AC-8:
  - Every URL text in the HTML as served, before scripts run, equals its text after hydration.
  - Setting `window.__WXL_SHORT_LINKS__ = true` before any page script leaves it a page URL.
  - Clicking copy on one list row and on the nav, in each locale, puts that challenge's page URL on the clipboard. (S04, S05, S09)
- **AC-10** With keygen succeeding, after a run the root's `platform/public/_redirects` equals `generateRedirects(root)` and holds the new number's `/c/NNN` rule pointing at `/challenge/<slug>/`. This holds even when the file's bytes differed from the generated content. Stdout contains `platform/public/_redirects`, and the status is 0. (C01, C02, C08)
- **AC-11** Failed runs of `create:challenge`:
  - An invalid argument or an existing slug ends with status 1 before any file is written.
  - Keygen failing ends with status 3 (D13). stderr holds W2, `_redirects` is byte-identical to before, and the scaffold stays.
  - Regeneration failing after keygen ends with status 2 (D8), and stderr holds W1. The cases are:
    - two challenges with one number;
    - a challenge directory whose `index.md` carries no number;
    - a Traditional Chinese brief with another number;
    - a `_redirects` that cannot be written.

    The scaffold stays in each case. Where the generator refused, `_redirects` is byte-identical to before. (C03–C07, C09)
- **AC-12** The hook ends in O2 and stages the expected `_redirects` of the staged snapshot in each of these cases:
  - A new challenge: the file gains its `/c/NNN` rule, and no W3 is printed.
  - A Traditional Chinese brief: it gains the `/zh/c/NNN` rule.
  - A deletion of both directories: both rules go.
  - A rename of both directories: the rules point at the new slug.
  - Retiring a challenge with its Traditional Chinese brief deleted in the same commit: both rules go.
  - Deleting only the Traditional Chinese brief: the `/zh/c/NNN` rule goes.
  - Un-retiring: the rule returns.
  - An application-only change, a type change to a symbolic link with the same content, and an unstaged number edit in a tracked page: `HEAD`'s bytes stay.
  - A hand-edited staged `_redirects`, alone or with other changes: it is replaced with the expected one, with W3. When it was the only change, git still records the commit, which then changes nothing.
  - A missing `_redirects`: it is added.
  - An untracked or ignored challenge directory: it is left out. (H01–H05, H07, H08, H11, H18, H20, H23, H24, H39, H40, H43)
- **AC-13** A commit with no staged change at a watched path ends in O1: exit 0, with the index, the working tree and `git stash list` unchanged. (H06)
- **AC-14** Start an O2 run with unstaged tracked changes, untracked files, a file whose staged and unstaged changes overlap, and an unstaged `_redirects` that differs from the expected one. After the run:
  - Every file other than `_redirects` is byte-identical, and untracked files are still untracked.
  - The working tree's `_redirects` equals the staged one. stderr holds W3, and W4 naming the untracked challenge.
  - `git stash list` is unchanged. (H08–H10, H19)
- **AC-15** When the hook fails, the index, the working tree (`_redirects` included) and `git stash list` equal their state before the hook (O3, O4):
  - When the validator fails, the hook exits with the validator's status. Every case of today's `tests/pre-commit-sh.test.ts` gives the status it asserts today, run against the real hook in S5's fixture.
  - When generation fails, the hook exits 1 with W5. The case is a staged Traditional Chinese brief whose number differs from its English page.
  - An orphan brief ends with exit 1 and W6 (D12). The cases are retiring, deleting or renaming only the English directory of a challenge that has a Traditional Chinese brief, and renaming only the Traditional Chinese directory. (H12, H13, H15, H17, H21, H22, H41)
- **AC-16** Staging only a Traditional Chinese brief, a directory holding only `index.md`, ends in O2, and the validator does not run. (H14)
- **AC-17** The guard test's assertion and inclusion rule, and the CI steps that run `pnpm test`, are unchanged by this epic. Stage 6 checks this on the diff. The committed `_redirects`, regenerated with the new header, passes the guard. A commit that bypasses the hook is left to the unchanged guard in CI: `--no-verify`, no hook installed, or a commit git makes without pre-commit. This follows from the guard's assertion and is not run as a separate experiment. (G01, G02, H16)
- **AC-18** Under the match rule, each of the five sentence-map rows that list E1 holds it, and each of the five that list Z1 holds it. The check runs only under the upstream decision, which stage 6 confirms on the diff. (T01, T02, T04)
- **AC-19** Under the match rule, `README.en.md` holds E2, and `README.md` and both wxl-fork-init skill files hold Z2. (T03)
- **AC-20** Stage 8 on Cloudflare and locally, run by the ticket that lands last against a commit holding the whole epic:
  - On the ticket branch's Cloudflare Pages preview, the list and the nav display and copy short links with `SITE_ORIGIN` in both languages. Challenge pages are checked with their Browser panel open. `/c/NNN` and `/zh/c/NNN`, requested on the preview's own host, open their challenges.
  - A local `pnpm build` without `CF_PAGES` is served by `pnpm docs:preview` and driven with `/agent-browser` or the host's native browser tools, at 375 wide and 1280×800. Challenge pages are checked with their Browser panel open. The list and the nav display and copy page URLs. At 375 wide, a URL that does not fit ends in an ellipsis and its `title` is the whole URL, and a click on it selects it without leaving the page.
  - The next check uses a temporary local clone of the ticket branch in a scratch directory. It has `pnpm install` run and Rust available, and works on a throwaway branch that is never pushed and is removed afterwards. In it, `pnpm create:challenge --backend php`, `git add` of the new challenge and `git commit` through `/tw-emoji-commit` give a commit holding the expected `_redirects`, on which the guard test passes. No step touches `_redirects` by hand.
  - The ticket PR's CI passes. (V01–V03)
- **AC-21** Stage 8 on GitHub Pages uses a temporary project-site repository whose name is not `<owner>.github.io`. It is created with create-wxl (`--host github-pages`, `CREATE_WXL_COMMIT` set to the pushed ticket commit), pushed, and deployed with Run workflow:
  - One URL copied from the list and one from the nav, in each language, open their challenges. Challenge pages are checked with their Browser panel open. English URLs are opened in a browser profile whose stored language is English.
  - After `pnpm create:challenge --backend php`, `git add`, `git commit` through `/tw-emoji-commit` and `git push`, the range's CI passes. The `Run tests` step's log shows the guard test's case passing. After the next deployment, the new challenge's page URL copied from the list opens it.
  - Afterwards the user deletes the repository.
  - Every outward action is confirmed with the user before it runs. (V04, V05)
- **AC-22** Commit forms, each through a real `git commit`:
  - `-a` after a `create:challenge`-like change commits the expected `_redirects`, without the untracked challenge's rule, with W3 and W4.
  - Each of these ends in O2 and commits the expected `_redirects`: `--amend` that adds a challenge, `-p` with piped answers, `-i <path>`, and a commit in a linked worktree.
  - `-- <path>` and `--only <path>` that trigger are refused with exit 1 and W8, with nothing changed and no commit.
  - Each of these also commits the expected `_redirects`:
    - repairing a stale file with `pnpm redirects:generate`, `git add` and `git commit`;
    - concluding a merge whose `_redirects` conflict was resolved that way;
    - a challenge commit in a range whose committed `_redirects` has the header from before this epic. (H31–H38, H44)
- **AC-23** Robustness:
  - These end in O5: SIGINT, SIGTERM or SIGHUP during generation, and a git command failing before the hook stashed.
  - A restore that fails, or stops partway on a file it cannot write, ends in O7. W9 names the hook's entry, which stays listed and holds the unstaged files. Applying it, or running W9's `git restore` commands where apply refuses, brings them back, except in the cases D16 (a) names. When the index is gone once the restore is done, the entry stays too, with W9's missing-index form.
  - A stash push that stops partway after changing the index ends in O7 on the repository's own index: every file's bytes are back, and W9's `git restore --staged` command puts the index back. When the restore fails as well, W9 prints that command after its first form, and the printed commands, run in order, put every file and the index back. Under `git commit -a`, when git's own child command fails, it ends in O5: the hook drops its entry and prints no W9, and `.git/index` is as before. This is measured for `-a`; `-i` and `-p` take the same path in git's source. A signal to the commit's process group ends as the next item says.
  - SIGINT to an interrupted `git commit -a` ends in O5 or O7, as the race falls. In both cases `.git/index` is as before, no commit is made, and every unstaged file is back or in the named entry.
  - A first commit with an unstaged file under `platform/` ends in O6 with W7. A first commit with everything staged ends in O2.
  - When `_redirects` is the only file that differs in the working tree, the hook makes no entry of its own and touches no other.
  - In every hook case with a pre-existing entry, that entry is still listed with its commit id. In every case the real repository's `_redirects`, index and stash list are unchanged.
  - On a Mac, H02, H07, H14 and H34 give the same outcomes under `/bin/bash` 3.2. (H25–H30, H42, H45–H52)
- **AC-24** Stage 6 finds each of the passages P1–P8 rewritten as the passages table requires. This includes wxl-create's handling of exit statuses 2 and 3 in all four skill files. (T05)
- **AC-25** `shortLink.ts` and `.vitepress/config.mts` each still hold exactly one line matching each fork:init anchor, and `fork-init.test.ts` and `upstream-guard.test.ts` pass. (F01)

## Testing Decisions

- A good test observes behaviour at a seam: what the control renders and copies, the configuration's
  public fields, files and exit statuses, and the index and working tree that git reports. It never
  observes how a module computes them.
- **S1** extends `tests/unit/site/config-base.test.ts`'s pattern: import the configuration afresh
  for each `CF_PAGES` value and read its public fields.
- **S8** is a new unit test of the link helper. X1–X6 and L20 are its cases, with the origin as an
  argument. T70/AC-C1 of 0004 binds component output, not this helper.
- **S2** extends `ShortLinkShare.test.ts`, `ChallengeList.test.ts` and `MergedNav.test.ts` under
  happy-dom. L08, L09, L12–L15, L17–L19 and L21 run only here.
  - Expected values are built from the real `SITE_ORIGIN` with plain string operations (T70/AC-C1).
  - The mode is set with `vi.mock` of the module the control reads it from. Today's short-link
    assertions run in short mode, since an undefined constant means page mode.
  - The `vitepress` mock's `withBase` prefixes `/my-range/` in the N rows, so a wrongly added base
    shows up in the copied URL.
  - Layout and the run-time override are asserted at S3, not here.
- **S3** adds cases to `tests/site-smoke/site-smoke.spec.ts`, in Chromium as today.
  - CI builds without `CF_PAGES`, so smoke covers page mode end to end.
  - Init scripts produce the `copy_failed` state and the run-time override (S09). The done badge
    comes from the site's own progress storage.
  - Short mode in a built site is covered at stage 8 on the Cloudflare preview (V01), the only
    surface whose build sets the variable.
  - S08 depends on upstream's own origin and runs under the upstream decision. The rest runs in
    every range, and opens the demonstration challenge `selected-excerpts`, as today's smoke opens
    `door-is-open`.
- **S4** is a new test of create-challenge's exported entry, with a temporary root holding
  `platform/public/` and a stub keygen runner. It never runs in the real tree: there it would
  rewrite the committed `_redirects` while the guard test runs in parallel. Prior art: create-wxl's
  `run(argv, deps)` (0005-S1). `pnpm` passes the entry's status through unchanged: pnpm 10.28.0, the
  pinned version, returned a script's 2 and 3 as they were (measured 2026-10-21).
- **S5** runs the real hook in temporary repositories, directly and through a real `git commit` with
  the hook installed. It replaces the test's own copy of the hook, so a change to the hook can no
  longer pass against a stale copy.
  - The repository's path holds a space and non-ASCII characters. The fixture holds
    `platform/public/` with a committed `_redirects` that matches it and one other file, plus one
    stash entry made before the run. H27 and H28 use their own fixture.
  - Every `GIT_*` variable is removed from the environment of the processes the test starts, so an
    outer hook or `git rebase -x` cannot point them at the real repository.
  - A case may replace a script the hook calls with a stub, which is how H25 and H26 time their
    interruption and failure.
  - Today's cases are kept (H15), and O1–O7 and the commit forms become cases. The commit forms run
    through real `git commit` invocations.
  - Every case also checks the real repository's `_redirects`, index and stash list.
  - H45 needs bash 3.2, which only macOS provides. Stage 5 runs it on a Mac, and the ticket's
    coverage report says so.
- **S6** is a new vitest over the sentence map, gated on the upstream decision. Prior art:
  `tests/unit/site/glossary.test.ts`; the upstream decision of `upstream-guard.test.ts`.
- The guard test itself is not modified (AC-17).
- **Stage 8 overrides the preview-deployment rule** (D9).
  - `docs/agents/workflow.md` and the stage 8 gate in `AGENTS.md` ask for behaviour verified on the
    ticket's preview deployment. Page mode cannot appear on a Cloudflare preview, which sets
    `CF_PAGES=1`. So page mode is verified on a local build (V02) and on a real GitHub Pages range
    (V04, V05), and the preview covers short mode (V01).
  - This follows OQ-017's precedent, which 0004 and 0005 recorded as an explicit override; this
    epic records its override there too.
  - Hard rule 4 still applies: challenge pages are checked with their Browser panel open.
  - The ticket that lands last runs V01–V05 against a commit holding the whole epic. Stage 4 assigns
    the V rows an earlier ticket's change can show.

## Out of Scope

- A mechanism that makes short links resolve on GitHub Pages, such as a 404 page that redirects (Q10).
- Recording the host anywhere: `range.json`, fork:init or the deploy template (Q8). Checking at build time that `SITE_ORIGIN` matches the site base (D10), or normalising it.
- Changing the language redirect for pages that have no Traditional Chinese version (D6, OQ-023).
- Skipping or weakening the guard test on any host (Q9); a `challenge:verify` L1 check for `_redirects` (Q5); no longer committing `_redirects` (Q4).
- Making the hook act when it is bypassed (H16), including installing a `pre-merge-commit` hook for merges git concludes itself. Making it work without Node on the `PATH`, where the run ends with the shell's own status. The hook's behaviour on Windows beyond what CI runs.
- Running the hook against the staged version of the generator scripts rather than the working tree's (B2).
- Refusing symbolic links under `platform/`, which the hook and `create:challenge` follow as `pnpm build` does; restoring empty untracked directories.
- A smoke build with `CF_PAGES=1`, and smoke runs in WebKit or on touch devices.
- Short links in a local preview of a Cloudflare range, or in a Cloudflare Direct Upload or Workers build (Q8, accepted costs).
- Changing interface strings or message keys; renaming `ShortLinkShare`; changing the language of the wxl-fork-init skill files.
- `CONTRIBUTE.md`'s paragraph on testing redirect rules locally, which stays true.
- Making `create:challenge` or the generator reject slugs that `.gitignore` ignores, or directory names made by hand outside the slug grammar.
- Number reuse after a challenge is deleted rather than retired, and two branches assigning the same next number: both are numbering behaviour this epic does not change. A merge that brings two challenges with one number and is concluded through `git commit` ends in O4 with the generator's message.
- The other two epics from stage 1: starting without Rust (prebuilt WASM and the Quick start), and the container development environment. Also new section-type pages such as a `kb/` tree, a GUI or TUI, and the setup record's settings half and setup page (OQ-020).

## Further Notes

- **Known costs (Q8, Q10, D6, D10).**
  - A Cloudflare range previewed locally copies page URLs.
  - On a GitHub Pages range, a renamed challenge's old page URL stops working, and so does every page URL when the range moves while `SITE_ORIGIN` keeps the old address; E2 and Z2 say so.
  - A learner with no stored preference who opens an English page URL is redirected to the Traditional Chinese page. That page is missing for a challenge created without a Traditional Chinese brief, which is OQ-023, and short links reach the same redirect today.
  - On a phone there is no hover. The copy button and a tap on the URL text are the ways to get the whole URL. A middle click or a modifier click on the URL text in the list opens the challenge, as on any link.
  - A GitHub Pages range still maintains a `_redirects` it never reads, but nothing asks the teacher to touch it.
  - Short mode in a built site is checked only at stage 8, and smoke runs only in Chromium.
  - Page URLs assume per-folder challenges, which is all `create:challenge` makes. No flat legacy page exists in the tree.
  - A challenge named like an ignored directory (`dist`, `logs`, `tmp`) is never tracked, so the hook leaves it out and CI never sees it. A hand-made directory whose name breaks the slug grammar still gets generator rules, as today.
- **Commits the hook changes.**
  - When a hand edit to `_redirects` was the only staged change, the hook restores the expected file and git records a commit that changes nothing (measured). W3 says what happened.
  - `/tw-emoji-commit` writes its message from `git diff --cached`, before the hook stages `_redirects`. For upstream's own commits and stage 8, the message can cover the file if you run `pnpm redirects:generate` and stage it first, when no untracked challenge is in the working tree.
  - E1's repair step runs over the whole working tree. An untracked draft without a number makes it refuse, and the message names the draft. Fixing or moving the draft first works, and so does staging any challenge change so that the hook regenerates the file.
- **Local guard mismatches.** The guard test reads the working tree, so a local `pnpm test` can
  disagree with CI in two cases:
  - Between `pnpm create:challenge` and staging the new challenge. Staging clears it, and `pnpm dev`
    already causes the same mismatch today.
  - After committing a challenge whose Traditional Chinese brief is still untracked. The guard
    counts the brief, which the commit left out.

  CI agrees with the hook in both cases. The reverse case, a tracked brief whose English `index.md`
  is not staged, is an orphan brief and is refused (D12).
- **A commit aborted after the hook** (an empty message, a rejected commit-msg hook) leaves the
  regenerated `_redirects` staged and in the working tree. The next commit's hook regenerates it
  again.
- **Open questions.**
  - This spec decides OQ-016, which closes when 0007 lands: instead of hiding the button, it builds
    a page URL wherever short links cannot resolve, within B4's limits.
  - It adds OQ-023 for the language redirect.
  - It records its stage 8 override under OQ-017.
  - It renumbers OQ-020: 0007 is this epic, the other two stage 1 epics follow, and the settings
    half and setup page take the next free number when they are scheduled.
- **No ADR.** Stage 1 found no decision that is hard to reverse, would surprise without context,
  and was a real trade-off all at once. Detecting the host at build time is easy to reverse.
- **Landing.** As with 0005 and 0006, the spec, traceability, OPEN-QUESTIONS changes and the
  stage 1 GLOSSARY edits land with this epic's first ticket PR.
- **Stage 8 outward actions.** Creating the GitHub repository, enabling Pages and pushing are each
  confirmed with the user before they run, and the user deletes the repository. Running
  `create:challenge` in a temporary clone or repository needs Rust until the next epic removes that
  requirement.
