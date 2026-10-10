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
- **wasm-pack** (`cargo install wasm-pack`) — not a package dependency; install it into your Rust toolchain
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
| `pnpm fork:init` | Rewrite the project identity after forking (author, GitHub URLs, and optionally the VitePress `base`). Requires `--author` and `--repo`; the package name changes only with `--name` or `--rebrand`, and the `SITE_BASE` environment variable is never written by the script |
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
pnpm fork:init --author "<Your Name>" --repo <owner>/<repo> --base <see below>
```

It rewrites `package.json`, swaps the upstream GitHub URLs for yours, sets or clears the VitePress `base` per `--base`, and installs a ready-to-use GitHub Pages workflow at `.github/workflows/deploy.yml` by copying `scripts/templates/deploy.yml.template`. This repository no longer carries a deploy workflow of its own — it publishes through Cloudflare Pages, described in the next section — so a fresh fork has nothing at that path and the copy goes through. If you have already customised your own workflow there, the script leaves it untouched and warns instead of overwriting it.

**Choosing `--base` is the step that decides whether your assets load.** VitePress bakes the base path into every asset URL:

- **GitHub Pages project site** (`https://<owner>.github.io/<repo>/`) → `--base /<repo>/`. The flag writes the literal path into `.vitepress/config.mts`. The copied workflow deliberately sets no `SITE_BASE` environment variable, so this literal is the only thing that makes a sub-path site work.
- **User or organisation site, custom domain at the root, or Cloudflare Pages** → `--base none`, which removes the `base` declaration so VitePress serves from `/`.

Omitting `--base` leaves the upstream env-conditional `base: process.env.SITE_BASE ?? '/'` in place. That form exists for this repository's own tooling, where `SITE_BASE` may be supplied by the build environment; in a fork nothing sets it, so the site builds at `/`. That is correct for a root deployment and wrong for a GitHub Pages project site, where every asset would then 404.

> **Note for local testing after `--base /<repo>/`.** The literal base applies to every build, including local ones. `pnpm test:smoke` and the L3 stage of `pnpm challenge:verify` navigate to root-relative paths, so they will 404 against a site built with a sub-path base. Run them with the base temporarily cleared, or point their navigation at the sub-path.

`fork:init` does not touch the short-link origin. Set `SITE_ORIGIN` in `.vitepress/challenge/shortLink.ts` to your own site's address; otherwise every short link your site copies points back at this one.

> **Short links work only on Cloudflare Pages.** They are rules in `platform/public/_redirects`, a file Cloudflare Pages reads and GitHub Pages ignores. On a GitHub Pages fork every page still works, but a short link printed on a handout leads to a 404.

Two settings for a GitHub Pages fork live in the GitHub UI rather than in the repository:

1. **Settings → Pages → Source** must be set to **GitHub Actions**.
2. The **`github-pages` environment** must allow deployments from `v*` tags, in addition to the `main` branch that authorises `workflow_dispatch` runs. Without that rule the tag-triggered deploy job is rejected.

### Deploying to Cloudflare Pages

This is how <https://wxl.browserlab.online> is published.

1. Create a new project on Cloudflare Pages and link the GitHub repository.
2. Set the build command:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
     && . "$HOME/.cargo/env" \
     && cargo install wasm-pack \
     && pnpm install \
     && pnpm build
   ```

3. Set the output directory to `.vitepress/dist`.
4. Add `NODE_VERSION=24` to the environment variables.
5. If the site is served from a sub-path, add `SITE_BASE` with that path (leave it unset for a root-domain deployment).

> **Note**: Cloudflare Pages does not ship a Rust toolchain by default. `wasm-pack` is a Rust binary, not a package dependency — `pnpm install` will not provide it — so the build command above installs the minimal Rust toolchain along with `wasm-pack` before building. `wasm-tools` is not installed here. `pnpm build` does run `pnpm challenge:keygen`, which uses `wasm-tools` for its strip and mutate passes, but keygen degrades to a warning for each when the tool is absent — so the build still succeeds, just without those passes. Add `wasm-tools` to the install line (`cargo install wasm-tools --version 1.249.0 --locked`, the same version CI pins) if you want stripped and mutated payloads in production builds.

## License

This project is licensed under the [Educational Community License, Version 2.0 (ECL-2.0)](LICENSE).
