# Web eXploitation Laboratory (WXL)

[繁體中文](README.md) | **English**

> A fully browser-based, WebAssembly-powered web exploitation training platform — no backend server required.

[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)
[![License: ECL-2.0](https://img.shields.io/badge/License-ECL--2.0-blue.svg)](LICENSE)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha.16-green.svg)](https://vitepress.dev)
[![pnpm](https://img.shields.io/badge/pnpm-10.28.0-orange.svg)](https://pnpm.io)

## Overview

**Web eXploitation Laboratory (WXL)** is a CTF-style web exploitation training platform. Every challenge runs entirely in the browser: WebAssembly simulates a realistic backend environment so the platform can be deployed and used without any server infrastructure.

It is built so that a teacher can prepare a class without running a server and a student can keep practising at home. Fork it, run `pnpm fork:init`, or run `npm create wxl`, and publish your own range on Cloudflare Pages or GitHub Pages. This repository carries four demonstration challenges; the live site is <https://wxl.browserlab.online>.

### Core features

- **Pure-frontend execution**: a Service Worker intercepts HTTP requests and emulates backend behavior in the browser.
- **Multiple backend runtimes**: Python Flask / FastAPI (via Pyodide) and PHP (via php-wasm) are all supported.
- **Encrypted virtual filesystem**: flags and application assets are stored under AES-GCM-256 encryption, preventing direct reads.
- **Static deployment**: build output is plain static files and can be hosted on any static service (GitHub Pages, Cloudflare Pages, etc.).

## Tech stack

| Layer | Technology |
|------|------|
| Documentation framework | [VitePress](https://vitepress.dev) 2.0.0-alpha.16 |
| UI framework | [Vue 3](https://vuejs.org) 3.5 + [UnoCSS](https://unocss.dev) |
| State management | [Pinia](https://pinia.vuejs.org) 3 |
| Python runtime | [Pyodide](https://pyodide.org) 0.29 |
| PHP runtime | [php-wasm](https://github.com/seanmorris/php-wasm) |
| WASM modules | Rust 2021 + [wasm-pack](https://rustwasm.github.io/wasm-pack/) |
| Attack session tracking | IndexedDB (`idb` package) attack-session persistence |
| Package manager | [pnpm](https://pnpm.io) 10.28 |

## Prerequisites

- **Node.js** >= 22.6 — `challenge:keygen`, `create:challenge`, `challenge:validate`, and `challenge:analyze` run through `node --experimental-strip-types`, which is unavailable on earlier releases. The remaining TypeScript scripts go through the bundled `tsx` and have no such floor. CI builds on Node 24.
- **git** >= 2.26 — `npm create wxl`'s `git init` and first commit, and `pnpm range:upgrade`, need it (Ubuntu 20.04's git 2.25.1 is not supported).
- **pnpm** >= 10 (`npm install -g pnpm`)
- **Rust** toolchain (install via [rustup](https://rustup.rs/))
- **wasm-pack** (`cargo install wasm-pack --version 0.14.0 --locked`) — pinned to the same version CI installs; not a package dependency; install it into your Rust toolchain
- **wasm-tools** (`cargo install wasm-tools --version 1.249.0 --locked`, or `pnpm wasm:tools`) — pinned to the same version CI installs; required by the L2 stage of `pnpm challenge:verify`, which runs `wasm-tools validate` on the generated payload. `pnpm challenge:keygen` also uses it for its strip and mutate passes, but degrades to a warning for each when it is absent.
- **Chromium for Playwright** — required before the first `pnpm challenge:verify` or `pnpm test:smoke` run. After `pnpm install`, install the browser binary once with:

  ```bash
  pnpm exec playwright install chromium
  ```

## Quick start

```bash
# 1. Clone the project
git clone https://github.com/BrowserLaboratory/wxl-platform.git
cd wxl-platform

# 2. Install Node.js dependencies
pnpm install

# 3. Build the WASM modules and start the dev server
pnpm dev
```

The dev server starts at `http://localhost:5173` by default.

## Available scripts

| Command | Description |
|------|------|
| `pnpm dev` | Build the WASM modules and start the dev server |
| `pnpm build` | Build the WASM modules and emit the static site |
| `pnpm docs:dev` | Start the VitePress dev server only (skips the WASM build) |
| `pnpm docs:build` | Build the VitePress static site only |
| `pnpm docs:preview` | Preview the built static site |
| `pnpm test` | Run the TypeScript / JavaScript unit tests (Vitest). Bare, it stays in watch mode — use `pnpm test --run` for a single pass |
| `pnpm test:smoke` | Run the Playwright smoke tests against the built site; build it first with `WXL_SMOKE_PAGES=1 pnpm build` |
| `pnpm wasm:build` | Build every Rust WASM module |
| `pnpm wasm:test` | Run the Rust unit tests (`cargo test`) |
| `pnpm wasm:tools` | Attempt to install `wasm-tools` into the Rust toolchain; it silences failures and always exits 0, so confirm with `wasm-tools --version` |
| `pnpm fork:init` | Rewrite the project identity after forking (author, GitHub URLs, range address, site name, and the deploy setup `--host` decides). Requires `--author` and `--repo`; pass every argument on every run, `--host` and `--base` are mutually exclusive, and the package name changes only with `--name` or `--rebrand` |
| `pnpm challenge:keygen` | Generate the encrypted WASM module for every challenge |
| `pnpm create:challenge` | Scaffold a new challenge from flags; `--name <slug>` is required and a bare run exits 1 with its usage line |
| `pnpm challenge:validate` | Validate every challenge's declaration, every brief and the file layout |
| `pnpm challenge:analyze` | Report the content and configuration of a challenge |
| `pnpm challenge:retype` | Mutate an existing challenge's backend / difficulty / tags / category |
| `pnpm challenge:verify` | Run the layered verify gate (L1 lint, L2 build, L3 Playwright e2e) on a challenge |
| `pnpm challenge:verify:blind` | Run the L4 blind-solve sub-routine standalone (also reached via `pnpm challenge:verify <slug> --blind`) |
| `pnpm challenge:verify:cross` | L4 multi-agent cross-check — runs the blind gate against `claude,codex,gemini` and aggregates verdicts |
| `pnpm prepare` | Install the git hooks (`simple-git-hooks`); runs automatically after `pnpm install` |

## Architecture

```
Browser
├── VitePress site (Vue 3 + UnoCSS)
│   ├── Challenge pages (Markdown + YAML frontmatter)
│   └── IndexedDB (attack-session persistence + tool state)
├── Service Worker (platform/public/challenge-sw.js)
│   └── Intercepts HTTP requests and routes them to the matching WASM runtime
└── WASM runtimes
    ├── virtual-fs      Encrypted virtual filesystem (Rust)
    ├── asgi-bridge     Python ASGI/WSGI bridge layer (Rust)
    ├── python-bridge   Pyodide integration (TypeScript)
    └── php-bridge      php-wasm integration (TypeScript)
```

The two Rust crates live under `chall-wasm/` and are built by `pnpm wasm:build`.

### Request flow

1. The user interacts with a challenge page, triggering an HTTP request to the "backend".
2. The Service Worker intercepts the request and routes it to the right runtime per the challenge configuration.
3. The Python runtime or the PHP runtime handles the request and returns an HTTP response.
4. The challenge page renders the result.

### Challenge configuration format

Every challenge's configuration lives in one challenge declaration, `platform/challenge/<slug>/challenge.yaml`, shared by every locale. For example, `platform/challenge/door-is-open/challenge.yaml`:

```yaml
number: 1
difficulty: easy
category: web
backend: fastapi         # required — flask | fastapi | php
app: app.py              # required — path relative to the challenge's src/ root
packages: []             # extra Python packages to install via micropip
tools: [ browser, network, repeater, code ]   # omit the field to get exactly these four;
                                              # list them explicitly to narrow the set, and
                                              # browser is added back even if you drop it
source_visible: false    # true = white-box, false = black-box (default)
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
wasmModule: /challenge/door-is-open/runtime.wasm  # produced by keygen
```

A challenge's brief for a locale is `platform/<locale code>/challenge/<slug>/index.md`: the primary locale's brief is required, the others are translations and may be absent. Its frontmatter keeps only three keys:

```yaml
---
title: Need to Know      # required
layout: challenge        # selects the challenge UI; every brief needs this line
description: ...         # the challenge's summary
---
```

Challenge source files are picked up by scanning the challenge's `src/` directory.

## Contributing

See [CONTRIBUTE.md](CONTRIBUTE.md) for the branching strategy, PR workflow, and commit conventions.

## Committing challenges

The pre-commit hook regenerates `platform/public/_redirects` on every commit that changes a challenge or that file, and when it stops a commit its message says what to do. These cases need more than running the commit again:

- **A range's first commit** that changes a challenge or `_redirects` is refused while anything under `platform/` other than `_redirects` is unstaged or untracked, because git cannot stash before the first commit. Stage it (or remove what should stay out) and commit again.
- **Changes the hook could not put back.** The hook keeps your unstaged changes and untracked files under `platform/` in a stash entry and prints its commit id. Run the `git stash apply <id>` it prints. Where apply refuses, the `git restore` commands it prints overwrite the files under `platform/` with the entry's copy, so run them before you change anything there. When apply reports a conflict, which happens where two changes touch the same or neighbouring lines, `git checkout <id> -- <path>` takes that file from the entry. git then leaves staged both that file and the entry's other changes it applied; `git restore --staged --source=<id>^2 -- ':(top)platform/' ':(top,exclude)platform/public/_redirects'` puts back what was staged before the commit, so check `git status` before you commit.
- **A staged change the hook could not put back.** When git's stash stopped partway and changed the index, the message says so and prints `git restore --staged --source=<id>^2 -- …`. It overwrites what is staged under `platform/` with what was staged before the commit, so run it once your files are back and before you stage anything there. When it is the only command printed, your unstaged files are already back; otherwise run the commands of the item above first.
- **Repairing a stale `_redirects`:** `pnpm redirects:generate` reads the whole working tree, so it refuses while an untracked draft challenge has no `number` in its `challenge.yaml`, and its message names the draft. Fix or move the draft first, or stage a challenge change and commit: the hook regenerates the file from what is staged.
- **A challenge without its primary-locale brief, or without its declaration** is refused: a brief without the primary locale's brief, a brief without a `challenge.yaml`, and a `challenge.yaml` without a primary-locale brief. If one was committed earlier with `--no-verify`, every later challenge commit is refused until the missing piece is committed: write the brief under `platform/<locale code>/challenge/<slug>/`, or retire the whole challenge to `.archive/challenge/<slug>/`.

The stash entry of the two items about changes the hook could not put back stays in `git stash list`. Once your files and the index are back, find its line with `git stash list --format='%gd %H'`, the one whose id is the one the message printed, and drop it with `git stash drop stash@{<n>}` from that line; `git stash drop` does not take the id itself.

## Deployment

Build output lives in `.vitepress/dist/` as plain static files and can be deployed to any static hosting service.

### Build steps

```bash
# 1. Install dependencies
pnpm install

# 2. Full build (WASM + keygen + VitePress)
pnpm build
```

### Create a range with `npm create wxl`

You don't have to fork the whole repository — this command creates a brand-new range directory
directly (needs Node.js >= 22.6, and git >= 2.26 for the automatic `git init` and first commit):

```bash
npm create wxl <folder>
# or
pnpm create wxl <folder>
```

Interactive mode asks, in order, for the author, GitHub repository, host, site address and
site name; once applied it runs `git init` and creates the first commit. The new range gains
a `range.json`, a setup record of which upstream version it was created from.

Without the interactive questions, pass every flag directly:

```bash
npm create wxl <folder> -- --author "<Your Name>" --repo <owner>/<repo> --host github-pages
```

To get only the unconfigured files, without a git repository, add `--no-setup`:

```bash
npm create wxl <folder> -- --no-setup
```

> `create-wxl` is published on npm from 3.0.0; the command downloads the upstream release that
> matches the package's version to build the range.

### Upgrade a range: `pnpm range:upgrade`

When upstream publishes a new release, run this at the range's top level:

```bash
pnpm range:upgrade
```

It downloads the upstream release the range was made from and the newest one, then makes a
three-way merge with your range: files upstream changed and you did not are updated; places both
sides changed get conflict markers; paths it cannot settle keep your version and are listed as
attention items in the report. It never commits and never touches ignored files; the report ends
with the restore command, which undoes the whole upgrade if you run it before making other changes.

It needs git 2.26 or later and a clean working tree. A range made with 3.0.0 has no
`range:upgrade` script yet; for its first upgrade, run:

```bash
npx --yes create-wxl@latest upgrade
```

> A range not made with `npm create wxl` (no `range.json`) names the upstream release it came from
> with `--from <version>`.

### The setup record and the primary locale

`range.json` at the range's top level is the setup record. Its `primaryLocale` decides the range's primary locale: the language whose content the site's root address serves, and the language of the brief that every challenge must have.

- The values `primaryLocale` accepts are the locale list: `en` and `zh-TW`, matched exactly, with no case folding and no trimming.
- When the file is absent, or has no `primaryLocale` key, the primary locale is `zh-TW`.
- When the file cannot be read or the value is wrong, the build stops with a message that starts with one of these codes: PL-E01 `range.json` is not a regular file (a directory, a symbolic link and so on; a symbolic link is not followed); PL-E02 the file could not be read (the message carries the errno code); PL-E03 the content is not valid JSON; PL-E04 the content is not a JSON object; PL-E05 `primaryLocale` is not a string; PL-E06 `primaryLocale` is not on the locale list.
- Until epic 0011 no tool does this for you: a teacher chooses the primary locale by editing the file.
- A translation's home page may link only to pages that translation has, written from that locale's own home page without a locale code; otherwise the build stops with PL-E12.
- A range that reruns `pnpm fork:init --site-name` must keep both home pages, because `fork:init` still requires both.
- When `range.json` has no `upstream` field, `pnpm range:upgrade` needs `--from <version>`.

#### Changing the primary locale later

No tool changes the primary locale afterwards, and it has a cost:

- Edit `primaryLocale` in `range.json` and commit it; the pre-commit hook regenerates `platform/public/_redirects`, or run `pnpm redirects:generate` yourself.
- Restart `pnpm dev` for the change to take effect.
- The site's root address changes language, and `/c/NNN` opens the new primary locale's page.
- Links already handed out without a locale code open the new primary locale's page; links that start with `/<old primary locale>/…` reach the root only through the old-address rules (when the old primary locale was `zh-TW`: one for each top-level page and folder) or through the not-found page, which strips the prefix.
- The brief every challenge must have becomes the new primary locale's. When some challenge lacks it, the pre-commit hook refuses the commit with a line that names the challenge and the missing brief, so write each such brief first.
- The hero and nav links on the home pages follow by themselves.
- A `challenge.yaml` edit shows in the challenge list after a reload, and on the challenge page only after you restart `pnpm dev`.

### Moving to the locale folders

Every locale has a locale folder, `platform/<locale code>/`, that holds all of that locale's pages. A range that was not made with `npm create wxl` and has not been upgraded with `pnpm range:upgrade` (a plain fork, for example) may still be on the old layout: at least one page sits outside every locale folder. A range on the old layout does not build, and you move it yourself, in this order:

1. **Merge the release first**: its new `.vitepress/`, `scripts/`, `platform/shared/`, `platform/public/`, `package.json`, `pnpm-lock.yaml` and the pages upstream moved. Moving on the old code is meaningless. If the merge stops on a page upstream renamed and your fork edited, keep upstream's new path and carry your edit there.
2. **Move every page outside the locale folders to `platform/en/`**, keeping its path.
3. **Write each English brief's frontmatter lines other than `title`, `description` and `layout`**, unchanged, into `platform/challenge/<slug>/challenge.yaml`, and delete them from every brief, in every locale.
4. **In every list and home page of every locale folder**, import `../shared/challenges.data.ts` (replacing `./shared/challenges.data.ts` and `../shared/challenges.zh-TW.data.ts`, which no longer exists) and pass `:lists="data"` instead of `:challenges="data"`.
5. **Write every home-page link from the locale's own home page**, dropping a `/zh-TW` prefix (`/zh-TW/challenges/` becomes `/challenges/`); a translation's home page may link only to pages that translation has.
6. **Move the files a moved page uses that stayed behind.**
7. **Add `"primaryLocale": "en"` to `range.json`** (create the file when it is absent) to keep English at the root. A fork without `range.json`, or without the key, now serves Traditional Chinese at the root, even when it has no page of its own to move.
8. **Run `pnpm build`.**

A `range.json` at the root also makes the tree a range, so upstream-only tests skip there, as in any range. A range whose `range.json` has no `upstream` field upgrades only with `--from <version>`; without it `pnpm range:upgrade` stops with UP-E06 (`upstream`) until epic 0011. An uncommitted `range.json` changes local builds only.

`smoke-fixtures/` is a reserved name. A page moved into a folder such as `platform/en/smoke-fixtures/`, by hand or by the upgrade, is not published by a production build.

When you write pages, note that links written as raw HTML and links built by components are not checked.

When the build refuses a layout, the first line of its message starts with one of these codes:

- **PL-E01**: `range.json` is not a regular file. Replace it with a real file; a symbolic link is not followed.
- **PL-E02**: `range.json` could not be read. Fix the permission or the file named by the errno code in the message (for example `EACCES`).
- **PL-E03**: `range.json` is not valid JSON (an empty file, a leading BOM, comments and trailing text all count). Make it valid JSON.
- **PL-E04**: `range.json` does not hold a JSON object. Make it `{ … }`.
- **PL-E05**: `primaryLocale` is not a string. Make it a locale code string from the locale list.
- **PL-E06**: `primaryLocale` is not on the locale list. Use a value from the list, matched exactly.
- **PL-E07**: there are symbolic links where the build looks for pages, including a locale folder itself. Replace each with the file or folder itself.
- **PL-E08**: a page is outside the locale folders: directly in `platform/`, in `platform/challenge/` outside `<slug>/src/`, or in a folder not named by a locale code. Move it into a locale folder with the steps in this section.
- **PL-E09**: an entry of a locale folder is named like a locale code (or like one minus `.md`), so its address would collide with that locale's prefix. Rename it.
- **PL-E10**: the primary locale has no home page, so `platform/<primary locale>/index.md` is missing. Add it.
- **PL-E11**: a page links to the primary locale's folder (for example `/zh-TW/guide/`), but the primary locale's pages are served without it. Drop the locale prefix.
- **PL-E12**: a home page's `hero.actions[*].link` or `features[*].link` breaks the rules: it is not a string, starts with `//`, is relative, already carries a locale prefix, or names a page that is not published. Write it from the locale's own home page, such as `/guide/`; the build adds the prefix.
- **PL-E13**: a brief sets `layout: challenge` but there is no `platform/challenge/<slug>/challenge.yaml`. Add the challenge declaration.
- **PL-E14**: `challenge.yaml` is not one YAML mapping (the reason is `invalid-yaml`, `multi-document` or `not-a-mapping`). Make it one YAML mapping.
- **PL-E15**: a brief's frontmatter has a key other than `title`, `description` and `layout`. Move those keys into `challenge.yaml`.
- **PL-E16**: `challenge.yaml` carries a brief key (`title`, `description` or `layout`). Move it to the brief.
- **PL-E17**: a challenge's brief does not set `layout: challenge`. Add that line.
- **PL-E18**: `layout: challenge` is set on another page; only `platform/<locale code>/challenge/<slug>/index.md` may use it. Remove it.

### After forking: rewrite the project identity

Run `fork:init` with its required flags:

```bash
# Deploying to GitHub Pages
pnpm fork:init --author "<Your Name>" --repo <owner>/<repo> --host github-pages --site-name "<Your Range Name>"

# Deploying to Cloudflare Pages
pnpm fork:init --author "<Your Name>" --repo <owner>/<repo> --host cloudflare-pages --origin https://<your-project>.pages.dev --site-name "<Your Range Name>"
```

It rewrites `package.json`'s identity fields, swaps the upstream GitHub URLs for yours, sets the site title and both home pages' range name from `--site-name`, sets the range address, the origin of every copied link, from `--origin` (or derives it under `--host github-pages`), and decides what happens to `.github/workflows/deploy.yml` from `scripts/templates/deploy.yml.template` per the table below. This repository no longer carries a deploy workflow of its own — it publishes through Cloudflare Pages, described in the next section — so a fresh fork has nothing at that path and the install goes through. If you have already customised your own workflow there, the script leaves it untouched and warns instead of overwriting it.

| Existing `.github/workflows/deploy.yml` | `--host github-pages` | `--host cloudflare-pages` | without `--host` |
|---|---|---|---|
| absent | installs the current template, and prompts for the tag rule | left alone | installs the current template, and prompts for the tag rule |
| matches the current template | left alone, no warning | removed, with a warning | left alone, no warning |
| matches a known old template output | replaced with the current template, with a warning that it was an old output | removed, with a warning | left alone, with a warning that it needs a manual merge |
| other (neither of the above — possibly your own customisation) | left alone with a warning if it still derives `SITE_BASE`; otherwise left alone with a warning to switch to `--host github-pages` | left alone, with a warning | left alone, with a warning that it needs a manual merge |

The `repository.url` line of `create-wxl/package.json` is not rewritten, so in a GitHub fork it keeps pointing at upstream: it is the field npm compares when upstream publishes create-wxl, and only rebrand mode (`--rebrand`) replaces it, along with the other upstream URLs. A range made with `npm create wxl` has no `create-wxl/` folder and is not affected.

**`fork:init` keeps no state, so pass every argument on every run**: it does not remember what you ran last time, and an omitted flag means "leave this setting alone this run", not "repeat the previous value" — except two cases that happen regardless of what else you pass: (a) without `--host`, the deploy workflow is still installed whenever `.github/workflows/deploy.yml` does not exist yet (see the table above); (b) with `--host github-pages` and no `--origin`, the range address is re-derived from `--repo` and overwritten every run — overwriting a value that is not upstream's default warns with the old and new address. **A Cloudflare Pages range passes `--host cloudflare-pages` on every run** — if a later run drops `--host` by mistake, **a run without `--host` reinstalls the GitHub Pages workflow**, which a Cloudflare Pages range has no use for; the same applies to a GitHub Pages range on a custom domain, which needs `--origin` on every run too, or a later `--host github-pages` run without it overwrites the range address back to the derived value. Rebrand mode (`--rebrand`) cannot be combined with `--host`, `--origin` or `--site-name`; deploy setup is handled by hand in that mode — see the `wxl-fork-init` skill.

`--host` and `--base` are mutually exclusive: with `--host` (either value), the base definition in `.vitepress/config.mts` always returns to the upstream line:

```ts
const siteBase = process.env.SITE_BASE || '/'
```

- **GitHub Pages project site** (`https://<owner>.github.io/<repo>/`) → `--host github-pages`. The installed workflow runs `configure-pages` at deploy time, and GitHub itself computes this site's base path and hands it to the build — the same whether it is a project site, a user site, or a custom domain later — so nothing in source is ever written as a literal path again. Without `--origin`, the range address is derived from `--repo` as `https://<owner>.github.io/<repo>` (omitting the path for the user site `<owner>.github.io`); a custom domain still needs `--origin`.
- **Cloudflare Pages range** → `--host cloudflare-pages`, which requires `--origin https://<your-project>.pages.dev` (or your custom domain, with no path). This flag installs no GitHub Pages workflow.

> **Short links work only on Cloudflare Pages.** They are rules in `platform/public/_redirects`, a file only Cloudflare Pages reads, so on a GitHub Pages range a short link does not resolve. The copy button beside each challenge copies a short link only on a range built by Cloudflare Pages; on any other range it copies the challenge page's URL. That URL stops working if the challenge is renamed, and it opens this range only while `SITE_ORIGIN` in `.vitepress/challenge/shortLink.ts` holds the range's address.
>
> `platform/public/_redirects` is generated from the challenges; do not edit it by hand. `pnpm create:challenge` and the pre-commit hook regenerate it when challenges change. Commit it together with them: GitHub Pages does not read it, but CI checks that it matches the challenges. If CI reports it stale, run `pnpm redirects:generate` and commit the result.
>
> Copied short links carry the locale code of the page or list they were copied from, on either primary locale: `/en/c/NNN` from an English page or list, `/zh-TW/c/NNN` from a Traditional Chinese one. Every numbered challenge has a link for every locale; when that locale has no version of the challenge, the link opens the primary locale's page. `/c/NNN` is the primary locale's page. `/c/NNN` and `/zh/c/NNN`, which earlier releases gave out, keep working but are no longer given out.
>
> A short link coded with the primary locale, and `/c/NNN`, follow the learner's locale preference: a learner who chose a translation is taken to it when the challenge has one, and a learner with no preference stays in the language of the address they opened, because the site does not switch it for them. A short link coded with a translation does not follow the locale preference: when the challenge has that translation it opens it whatever the preference, and when it does not, the link opens the primary locale's page. Opening a page whose address starts with a locale code directly (typing, pasting, reloading) sets the learner's locale preference to that locale; a short link coded with the primary locale opens a page at the root and sets nothing.
>
> On an English-primary range, `/en/c/NNN` opens the English page at the root, and a learner whose locale preference is Traditional Chinese may be taken to the translation; on a Traditional-Chinese-primary range, `/en/c/NNN` opens `/en/challenge/<slug>/` and every learner sees English. On a Traditional-Chinese-primary range, old `/zh-TW/…` addresses go to the root: on Cloudflare Pages by rules in `_redirects`, one for `/zh-TW/` itself, one for each top-level page and one for each top-level folder of pages of `platform/zh-TW/`; any other old address, and every old address on other hosts, by the not-found page. A file under `platform/public/zh-TW/` is served at its own address and is no longer redirected, except one whose path begins with the name of such a folder (for example `platform/public/zh-TW/guide/…`), which that folder's rule still redirects. Adding or removing a top-level page or folder changes these rules; the pre-commit hook regenerates `_redirects`. After changing `primaryLocale`, commit `range.json` (the pre-commit hook regenerates `_redirects`) or run `pnpm redirects:generate`. An uncommitted `range.json` changes local builds only. A range upgrading to this release gets the new rules by regenerating `_redirects`: when CI reports it stale, run `pnpm redirects:generate` and commit the result.

Without `--host`, this line is rewritten only by `--base`; omit `--base` too and it stays whatever it already was — the upstream line, or a literal left by an earlier `--base` run. `--base /<repo>/` writes the literal path into `.vitepress/config.mts`; `--base none` writes the literal `const siteBase = '/'` (it does not clear the line). **With `--base`, a range's site smoke and challenge tests fail in CI** — both navigate from `/`, and a literal sub-path base 404s them; switching to `--host github-pages` leaves the base to be decided at deploy time, so every local and CI build stays at `/` and the problem never arises.

`--site-name` sets both the site title and both home pages' range name. It accepts most symbols — quotes, backslashes, `$` — but rejects `<`, `>` and `&`, and is capped at 60 Unicode code points (not bytes or letters); most invisible and control characters (the Cc, Cs, Zl, Zp categories, and most of Cf) are rejected too, except the zero-width joiners U+200C/U+200D.

Two settings for a GitHub Pages fork live in the GitHub UI rather than in the repository:

1. **Settings → Pages → Source** must be set to **GitHub Actions**.
2. The **`github-pages` environment** must allow deployments from `v*` tags, in addition to the `main` branch that authorises `workflow_dispatch` runs. Without that rule the tag-triggered deploy job is rejected.

**GitHub Pages ranges of one owner share browser storage**: every GitHub Pages range under the same GitHub account looks like the same browser origin (scheme + host — a different thing from `GLOSSARY.md`'s other `origin` entry, which marks whether an attack trace started locally or came from an import) to a learner's browser, so what one range stores, another can read and clear too; see OQ-018 in `.proj.specs/OPEN-QUESTIONS.md`.

### Deploying to Cloudflare Pages

This is how <https://wxl.browserlab.online> is published.

1. Create a new project on Cloudflare Pages and link the GitHub repository.
2. Set the build command:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
     && . "$HOME/.cargo/env" \
     && cargo install wasm-pack --version 0.14.0 --locked \
     && pnpm install \
     && pnpm build
   ```

3. Set the output directory to `.vitepress/dist`.
4. Add `NODE_VERSION=24` to the environment variables.
5. **A Cloudflare Pages range is served at the domain root**: a range configured with `--host cloudflare-pages` already has its base definition back on the upstream line `process.env.SITE_BASE || '/'` — Cloudflare Pages' own build environment does not set `SITE_BASE` on its own, so no environment variable is needed here. But if you previously set `SITE_BASE` by hand in the Cloudflare Pages project settings, remove it now: a leftover value still overrides this literal, and `.vitepress/config.mts` requires it to be either `/` or a path ending in `/` — one missing the trailing slash makes the build abort with an error.

> **Note**: Cloudflare Pages does not ship a Rust toolchain by default. `wasm-pack` is a Rust binary, not a package dependency — `pnpm install` will not provide it — so the build command above installs the minimal Rust toolchain along with `wasm-pack` before building. `wasm-pack` is pinned to 0.14.0, the version CI uses, and `--locked` makes cargo use wasm-pack's own lockfile: without it cargo re-resolves the newest compatible dependency versions, and the build breaks when every compatible version of one of them has been yanked (as happened to `zip` 2.x on 2026-10-16). `wasm-tools` is not installed here. `pnpm build` does run `pnpm challenge:keygen`, which uses `wasm-tools` for its strip and mutate passes, but keygen degrades to a warning for each when the tool is absent — so the build still succeeds, just without those passes. Add `wasm-tools` to the install line (`cargo install wasm-tools --version 1.249.0 --locked`, the same version CI pins) if you want stripped and mutated payloads in production builds.

## License

This project is licensed under the [Educational Community License, Version 2.0 (ECL-2.0)](LICENSE).
