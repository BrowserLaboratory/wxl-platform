# Platform notes

Things this repository has cost people time on, none of which a config file confesses.

## The Browser panel cannot load subresources

A challenge page's Browser panel is a `srcdoc` iframe without `allow-same-origin`. It cannot fetch
the challenge's own CSS or images, so a challenge's CSS must be inlined. Every gate stays green
when it is not — only looking at the panel shows it — which is why challenge end-to-end checks
always open the Browser panel.

## Test runner quirks

- vitest swallows `console.log` under the default reporter, and `--silent=false` does not bring it
  back. Write diagnostics to a file with `node:fs` instead.
- A new git worktree has no `.vitepress/wasm/`, the ignored output of `pnpm wasm:build`, so the
  keygen, layout and tab cases of `pnpm test` fail there. Run `pnpm wasm:build` in the worktree, or
  copy the directory from a checkout whose build is newer than the last change under `chall-wasm/`.
- Composables that hold module-level refs (`useSessionGate` and its neighbours) keep state across
  tests in one file. Call `vi.resetModules()` between tests that need a fresh instance.

## Search and local servers

- `rg` skips hidden directories; pass `--hidden` to search `.vitepress/`.
- A site-smoke run can leave a preview server on port 4173 that `pkill -f 'vitepress preview'`
  does not match. Clear it with
  `for P in $(lsof -tnP -iTCP:4173 -sTCP:LISTEN); do kill -9 $P; done`.

## Stage 8 in a real browser

- The stored language is `localStorage['wxl-locale']` (`en` or `zh-TW`). Set it on a static asset of
  the same origin (`/favicon.svg`) before opening the page under test, so the page's first load
  reads it; a page tab writes theme and editor keys of its own.
- The session gate appears on a challenge page once the origin holds learner work: rows in the
  `challenge-tools` IndexedDB database, or learner-evidence `localStorage` keys (drafts, notes,
  changed editor settings, Repeater snapshots). It holds the cold-load and not-found redirects and
  the missing-translation line until answered. Clear both, and use a new tab (the answer is kept in
  that tab's `sessionStorage['wxl-session-gate']`), unless the row is about the gate.
- In the host's built-in browser, click menu items by the ref `find` returns, not by screenshot
  coordinates: in T-0057's stage 8 (2026-11-06) a coordinate click on the locale menu's options
  missed without an error.
- Ranges under one GitHub Pages owner share `cxphoenix.github.io`'s storage (OQ-018); clear it after
  a temporary range's checks.
