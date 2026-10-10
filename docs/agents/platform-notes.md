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
- Composables that hold module-level refs (`useSessionGate` and its neighbours) keep state across
  tests in one file. Call `vi.resetModules()` between tests that need a fresh instance.

## Search and local servers

- `rg` skips hidden directories; pass `--hidden` to search `.vitepress/`.
- A site-smoke run can leave a preview server on port 4173 that `pkill -f 'vitepress preview'`
  does not match. Clear it with
  `for P in $(lsof -tnP -iTCP:4173 -sTCP:LISTEN); do kill -9 $P; done`.
