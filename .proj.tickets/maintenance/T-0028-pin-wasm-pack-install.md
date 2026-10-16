---
id: T-0028
title: Pin the documented wasm-pack install to CI's version with --locked
epic: maintenance
status: done
blocked_by: []
---

## Context

On 2026-10-16 the Cloudflare Pages build of PR #24 failed before `pnpm build`: `cargo install wasm-pack` resolved wasm-pack 0.15.0, whose dependency `binary-install v0.4.1` requires `zip = "^2.1.3"`, and every `zip` 2.x release is now yanked from crates.io, so resolution fails ("failed to select a version for the requirement `zip = \"^2.1.3\"`"). It is not caused by the PR; every Cloudflare build using that command fails. Both READMEs teach the same command (the local prerequisites line and the Cloudflare Pages build command), so a teacher following them at the 2026-10-17 workshop would hit the same failure. CI is unaffected: it installs prebuilt `wasm-pack@0.14.0` (`toolchain-parity.test.ts`).

No spec covers this command; this ticket's requirement is the maintenance plan below, decided by the user on 2026-10-16 (Q7, option A, quoted: "A"). The Cloudflare dashboard's own build command is changed by the user, outside the repository.

Verified fix: `cargo install wasm-pack --version 0.14.0 --locked --root <tmp>` exits 0 and installs `wasm-pack 0.14.0`; cargo warns that `zip v2.4.2` in the lockfile is yanked and uses it (macOS, cargo 1.94.0; the Cloudflare image runs cargo 1.99.1 on Linux, same `--locked` semantics, not run there).

## Maintenance plan (the requirement)

- M1: in `README.md` and `README.en.md`, every `cargo install wasm-pack` becomes `cargo install wasm-pack --version 0.14.0 --locked`, the version CI pins.
- M2: the Cloudflare Pages note in both READMEs says why: the version matches CI, and `--locked` uses wasm-pack's own lockfile so a later yanked dependency does not break the build.
- M3: a test pins M1 to the version in `toolchain-parity.test.ts`'s CI pin, so the README and CI cannot drift apart.

## Deliverable

Both READMEs give a wasm-pack install command that works today and matches CI; a test fails if they drift.

## Acceptance criteria

- [x] M1: every `cargo install wasm-pack` in both READMEs (and, after stage 6, both `wxl-fork-init` skills) carries `--version <CI pin> --locked`
- [x] M2: both Cloudflare Pages notes explain the pin and `--locked`
- [x] M3: `toolchain-parity.test.ts` fails on a bare `cargo install wasm-pack` in either README or either skill

## 給使用者（zh-TW）

Cloudflare Pages 建置失敗的原因是 `cargo install wasm-pack` 沒鎖版本：它的間接相依 `zip` 2.x 全被撤回。兩份 README 教的是同一條指令，研習時照做的老師會遇到同樣的錯。這張把兩份 README 改成和 CI 相同的 `--version 0.14.0 --locked`，說明原因，並加測試防止 README 和 CI 再次不一致。Cloudflare 後台的建置指令由你自己改。

## Comments

### 2026-10-16 — test plan table (approved by the user before the first test)

Approved by the user on 2026-10-16, quoted verbatim: "全部核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| tracked files | 兩份 README 裡每個 `cargo install wasm-pack` 都帶 `--version <CI 釘選版本> --locked` | `tests/unit/workflows/toolchain-parity.test.ts` 新增 `it`，版本從既有的 `EXPECTED_TOOL_LIST`（`wasm-pack@0.14.0`）取，不另寫死 | M1、M3 | 紅燈：改之前兩份 README 各有兩處沒有版本的 `cargo install wasm-pack`，4 處都不合格。綠燈：4 處都帶 `--version 0.14.0 --locked`。每份 README 至少要找到一處，避免刪掉指令後測試照樣通過 |

**Notes**: M2 的說明是文件字串，以閱讀確認；不改既有測試；第 8 階段以上面隔離環境的 `cargo install` 實測紀錄與測試執行紀錄為準，Cloudflare 建置在使用者改後台指令後以重試確認。

### 2026-10-16 — red → green log

- Red: the new `it.each` over both READMEs failed 2 of 2: `AssertionError: README.md: expected 'cargo install wasm-pack' to contain 'cargo install wasm-pack --version 0.1…'` (and the same for `README.en.md`). Reproduce on the base: `pnpm vitest run tests/unit/workflows/toolchain-parity.test.ts`.
- Change: both READMEs' two installs (prerequisites, Cloudflare Pages build command) now read `cargo install wasm-pack --version 0.14.0 --locked`; both Cloudflare Pages notes explain the pin and `--locked` (M2).
- Green: `Tests 9 passed (9)` for that file; with the glossary tests `264 passed`.
- After stage 6 (see below) the test covers both skills too, matches any flag order and line continuations, and rejects other sources and installers: `Tests 12 passed (12)`. The skills were fixed before the test was widened, so their red is shown by a probe of the matcher instead: on the original skill text `` `cargo install wasm-pack` `` it returns `["cargo install wasm-pack"]`, which the `--locked` assertion rejects; the probe also catches `cargo install --locked wasm-pack`, a backslash line break, `cargo binstall wasm-pack` and `--git`, and accepts `--locked --version 0.14.0` in either order.
- Full suite in this worktree: `pnpm test --run` → `Test Files 127 passed (127) / Tests 4193 passed | 1 skipped`. A first run failed 109 tests in four layout and keygen files because the fresh worktree had no built WASM (`Template WASM not found: …/.vitepress/wasm/virtual-fs/virtual_fs_bg.wasm`); the same four files pass in the main checkout on the same base (`179 passed`), and after copying the gitignored `.vitepress/wasm/` build output into the worktree the whole suite passed.

### 2026-10-16 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| tracked files | `toolchain-parity.test.ts`: "reads the wasm-pack version from the CI tool list"; "%s pins every cargo install of wasm-pack to the CI version with --locked" × 4 files | not measured: no coverage provider is installed | M1, M3 | the notes' prose version number (M2) is not tied to CI by a test; a future CI bump is caught only for the commands |
| command record | `cargo install wasm-pack --version 0.14.0 --locked --root <tmp>` → exit 0, `wasm-pack 0.14.0` (macOS, cargo 1.94.0) | not applicable | M1 | Linux: covered by the Cloudflare Pages build of PR #24 after the user's dashboard change (passed) |

### 2026-10-16 — stage 6 disposition

Two `harness-reviewer` passes (Standards: 16 findings, worst medium; Spec: 10 findings, 0 P0, worst P1). Fixed (pre-authorisation 2):

- Both `wxl-fork-init` skills also taught the bare `cargo install wasm-pack` (both axes' worst finding): pinned the same way, kept byte-identical, and added to the test. This widens M1 beyond the two READMEs, within the ticket's purpose (documents a teacher follows); reported to the user.
- The test's matcher missed flags before the crate name, line continuations and other installers, and `toContain` required one flag order: rewritten as above; the version lookup now fails with a message instead of a collection-time `TypeError`; `REPO_ROOT` moved to module level.
- The notes overstated cargo's behaviour ("breaks as soon as one is yanked"): now "when every compatible version of one of them has been yanked", naming `zip` 2.x.
- The test comment said CI and the documents install "the same build": now "the same version" (CI uses a prebuilt binary).
- Both prerequisites lines now say the version matches CI, like the `wasm-tools` line.
- The ticket's zh-TW section called `zip` a direct dependency: now 「間接相依」.
- The T-0019 landing record carried no outcome of the Cloudflare retry: completed (`Cloudflare Pages pass`); it is committed separately from this ticket's change.

Recorded, not changed: the notes' prose version is not tested (above); the at-least-one floor per file is the approved plan; the test file's header still describes workflows only; the README's wasm-pack homepage link points at the project site, whose installer is unpinned.

### 2026-10-16 — stage 7

Report: `docs/reviews/security-T-0028.md`. Ten candidates, independently filtered: no exploitable defect introduced. Primary-source research found the `zip` 2.x yank was a security yank by its maintainer (three zip-rs GHSAs on `ZipArchive::extract`, a path wasm-pack's `binary-install` does not use), and that wasm-pack 0.14.0's lockfile carries published RustSec advisories in `tar`, `rustls`, `rustls-webpki` and `time`, the same as CI's prebuilt 0.14.0. Kept 0.14.0 for CI parity tonight; moving CI and the documents to 0.15.0 with a `cargo audit` record is a follow-up after the workshop. Hardened within scope: the test also checks `cargo +<toolchain> install` and rejects `--config`. Check after: `pnpm vitest run tests/unit/workflows/toolchain-parity.test.ts` → `12 passed`.

### 2026-10-16 — landed

Squash-merged into `main` as `e432fa6` (PR #25), merged by the user. All ten checks passed (`gh pr checks 25`), including Cloudflare Pages with the dashboard's new build command and `prose-audit` on the changed READMEs. Status set to `done`.
