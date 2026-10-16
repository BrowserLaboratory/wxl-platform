# Web eXploitation Laboratory (WXL)

[繁體中文](README.md) | **English**

> A fully browser-based, WebAssembly-powered web exploitation training platform — no backend server required.

[![Quality Gates](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/BrowserLaboratory/wxl-platform/actions/workflows/quality-gates.yml)
[![License: ECL-2.0](https://img.shields.io/badge/License-ECL--2.0-blue.svg)](LICENSE)
[![VitePress](https://img.shields.io/badge/VitePress-2.0.0--alpha.16-green.svg)](https://vitepress.dev)
[![pnpm](https://img.shields.io/badge/pnpm-10.28.0-orange.svg)](https://pnpm.io)

## Overview

**Web eXploitation Laboratory (WXL)** is a CTF-style web exploitation training platform. Every challenge runs entirely in the browser: WebAssembly simulates a realistic backend environment so the platform can be deployed and used without any server infrastructure.

It is built so that a teacher can prepare a class without running a server and a student can keep practising at home. Fork it, run `pnpm fork:init`, and publish your own range on Cloudflare Pages or GitHub Pages. This repository carries four demonstration challenges; the live site is <https://wxl.browserlab.online>.

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
| `pnpm test:smoke` | Run the Playwright smoke tests against the built site |
| `pnpm wasm:build` | Build every Rust WASM module |
| `pnpm wasm:test` | Run the Rust unit tests (`cargo test`) |
| `pnpm wasm:tools` | Attempt to install `wasm-tools` into the Rust toolchain; it silences failures and always exits 0, so confirm with `wasm-tools --version` |
| `pnpm fork:init` | Rewrite the project identity after forking (author, GitHub URLs, short-link origin, site name, and the deploy setup `--host` decides). Requires `--author` and `--repo`; pass every argument on every run, `--host` and `--base` are mutually exclusive, and the package name changes only with `--name` or `--rebrand` |
| `pnpm challenge:keygen` | Generate the encrypted WASM module for every challenge |
| `pnpm create:challenge` | Scaffold a new challenge from flags; `--name <slug>` is required and a bare run exits 1 with its usage line |
| `pnpm challenge:validate` | Validate every challenge's frontmatter and file layout |
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

Every challenge is a Markdown file with a YAML frontmatter block declaring its configuration:

```yaml
---
title: Need to Know      # required
layout: challenge        # selects the challenge UI; without it the page renders as a plain docs page
backend: fastapi         # required — flask | fastapi | php
app: app.py              # required — path relative to the challenge's src/ root
difficulty: easy
category: web
packages: []             # extra Python packages to install via micropip
tools: [ browser, network, repeater, code ]   # omit the field to get exactly these four;
                                              # list them explicitly to narrow the set, and
                                              # browser is added back even if you drop it
source_visible: false    # true = white-box, false = black-box (default)
wasmModule: /challenge/door-is-open/runtime.wasm  # produced by keygen
---
```

Challenge source files are picked up by scanning the challenge's `src/` directory. The legacy `fs:` mapping is still accepted for compatibility, but the validator emits a deprecation warning — new challenges SHALL rely on the `src/` scan instead.

## Contributing

See [CONTRIBUTE.md](CONTRIBUTE.md) for the branching strategy, PR workflow, and commit conventions.

## Deployment

Build output lives in `.vitepress/dist/` as plain static files and can be deployed to any static hosting service.

### Build steps

```bash
# 1. Install dependencies
pnpm install

# 2. Full build (WASM + keygen + VitePress)
pnpm build
```

### After forking: rewrite the project identity

Run `fork:init` with its required flags:

```bash
# Deploying to GitHub Pages
pnpm fork:init --author "<Your Name>" --repo <owner>/<repo> --host github-pages --site-name "<Your Range Name>"

# Deploying to Cloudflare Pages
pnpm fork:init --author "<Your Name>" --repo <owner>/<repo> --host cloudflare-pages --origin https://<your-project>.pages.dev --site-name "<Your Range Name>"
```

It rewrites `package.json`'s identity fields, swaps the upstream GitHub URLs for yours, sets the site title and both home pages' range name from `--site-name`, sets the short-link origin from `--origin` (or derives it under `--host github-pages`), and decides what happens to `.github/workflows/deploy.yml` from `scripts/templates/deploy.yml.template` per the table below. This repository no longer carries a deploy workflow of its own — it publishes through Cloudflare Pages, described in the next section — so a fresh fork has nothing at that path and the install goes through. If you have already customised your own workflow there, the script leaves it untouched and warns instead of overwriting it.

| Existing `.github/workflows/deploy.yml` | `--host github-pages` | `--host cloudflare-pages` | without `--host` |
|---|---|---|---|
| absent | installs the current template, and prompts for the tag rule | left alone | installs the current template, and prompts for the tag rule |
| matches the current template | left alone, no warning | removed, with a warning | left alone, no warning |
| matches a known old template output | replaced with the current template, with a warning that it was an old output | removed, with a warning | left alone, with a warning that it needs a manual merge |
| other (neither of the above — possibly your own customisation) | left alone with a warning if it still derives `SITE_BASE`; otherwise left alone with a warning to switch to `--host github-pages` | left alone, with a warning | left alone, with a warning that it needs a manual merge |

**`fork:init` keeps no state, so pass every argument on every run**: it does not remember what you ran last time, and an omitted flag means "leave this setting alone this run", not "repeat the previous value" — except two cases that happen regardless of what else you pass: (a) without `--host`, the deploy workflow is still installed whenever `.github/workflows/deploy.yml` does not exist yet (see the table above); (b) with `--host github-pages` and no `--origin`, the short-link origin is re-derived from `--repo` and overwritten every run — overwriting a value that is not upstream's default warns with the old and new origin. **A Cloudflare Pages range passes `--host cloudflare-pages` on every run** — if a later run drops `--host` by mistake, **a run without `--host` reinstalls the GitHub Pages workflow**, which a Cloudflare Pages range has no use for; the same applies to a GitHub Pages range on a custom domain, which needs `--origin` on every run too, or a later `--host github-pages` run without it overwrites the short-link origin back to the derived value. Rebrand mode (`--rebrand`) cannot be combined with `--host`, `--origin` or `--site-name`; deploy setup is handled by hand in that mode — see the `wxl-fork-init` skill.

`--host` and `--base` are mutually exclusive: with `--host` (either value), the base definition in `.vitepress/config.mts` always returns to the upstream line:

```ts
const siteBase = process.env.SITE_BASE || '/'
```

- **GitHub Pages project site** (`https://<owner>.github.io/<repo>/`) → `--host github-pages`. The installed workflow runs `configure-pages` at deploy time, and GitHub itself computes this site's base path and hands it to the build — the same whether it is a project site, a user site, or a custom domain later — so nothing in source is ever written as a literal path again. Without `--origin`, the short-link origin is derived from `--repo` as `https://<owner>.github.io/<repo>` (omitting the path for the user site `<owner>.github.io`); a custom domain still needs `--origin`.
- **Cloudflare Pages range** → `--host cloudflare-pages`, which requires `--origin https://<your-project>.pages.dev` (or your custom domain, with no path). This flag installs no GitHub Pages workflow.

> **Short links work only on Cloudflare Pages.** They are rules in `platform/public/_redirects`, a file only Cloudflare Pages reads. On a GitHub Pages range every page still works, but a short link printed on a handout leads to a 404.

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
