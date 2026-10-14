# Traceability: 0002-create-wxl

`{type × field × boundary} → {expected behaviour → acceptance criterion}`. The spec's prose is derived
from this matrix; a gap here is a gap in the spec. Seams S1–S11 were approved by the user on
2026-10-14. Decisions Q1–Q24 are the stage 1 interview record, summarised in the spec.

| Row | Seam | Type × field × boundary | Expected behaviour | AC |
|---|---|---|---|---|
| T1 | S1 | Node version × below the floor (< 22.6.0) | Exit 1 with an upgrade message in the detected locale; nothing is created on disk | AC-C1 |
| T2 | S1 | Node version × at or above the floor | Proceeds | AC-C1 |
| T3 | S1 | Target directory argument × absent, stdin is a TTY | Prompts for a folder name, defaulting to `my-range` | AC-C2 |
| T4 | S1 | Target directory argument × absent, stdin is not a TTY | Exit 1 with usage; nothing created | AC-C2 |
| T5 | S1 | Target directory × exists and is not empty | Exit 1; the directory is left byte-for-byte unchanged | AC-C3 |
| T6 | S1 | Target directory × absent, or exists and is empty | Populated with the platform copy | AC-C3 |
| T7 | S1 | Source commit × embedded release commit present, no override | Downloads exactly that commit's tarball from GitHub over HTTPS | AC-C4 |
| T8 | S1 | Source commit × override given, 40 lowercase hex | Downloads that commit instead | AC-C4 |
| T9 | S1 | Source commit × override malformed, or no release commit and no override | Exit 1 before any network request | AC-C4 |
| T10 | S1 | Download × non-200 status, network error, or timeout | Exit 1 with a message; target left absent (if it was absent) or empty (if it was empty) | AC-C5 |
| T11 | S2 | Archive entry type × regular file or directory | Extracted | AC-C6 |
| T12 | S2 | Archive entry type × symbolic link, hard link, or any other type | Whole archive rejected; exit 1; target left as in T10 | AC-C6 |
| T13 | S2 | Archive entry path × absolute, contains a `..` segment, or resolves outside the target | Whole archive rejected; exit 1; target left as in T10 | AC-C6 |
| T14 | S2 | Archive layout × single top-level directory | That directory's contents become the target's contents | AC-C7 |
| T15 | S1 | Post-extract files × changelog, open-questions register, setup record, `.gitattributes` | Changelog and register written from the platform's templates; setup record written with upstream identity and `settings` and `applied` null; the marked upstream-only block of `.gitattributes` removed | AC-C8 |
| T16 | S1 | Side effects × git, package install, other network | No repository initialised, no package installed, no request other than the tarball | AC-C9 |
| T17 | S1 | Next-step message × locale `zh*` vs any other | Traditional Chinese for a `zh` locale, English otherwise; names both `pnpm range:setup` and `npm run range:setup` | AC-C10 |
| T18 | S9 | Package version × create-wxl vs platform | Equal | AC-C11 |
| T19 | S9 | Package dependency × `tar` | Exact version, equal to the root devDependency used by the tests | AC-C11 |
| T20 | S9 | Release commit injection × tag `v<version>` present vs absent | Present: release commit recorded in the published package; absent: publishing fails | AC-C12 |
| T21 | S8 | Exported tree × upstream-only paths | Absent from `git archive HEAD`: every epic directory under the specs root, the tickets root, the open-questions register, the changelog, the create-wxl directory, and the upstream-only tests (create-wxl's tests, the exported-tree test, the version-alignment test) | AC-E1 |
| T22 | S8 | Exported tree × kept paths | Present: glossary, shared instructions, ADRs, agent docs, both skill trees, the two templates of T15, the setup module | AC-E1 |
| T23 | S3 | `origin` × valid | Short-link origin literal set to the value; a second identical run changes nothing | AC-F1 |
| T24 | S3 | `origin` × not `https`, has userinfo, port, query or fragment, or characters outside the allowed set | Argument error, exit 1, no file written | AC-F1 |
| T25 | S3 | `site-name` × valid (1–60 characters, no control characters) | Site title and both home-page hero names set, each written as an escaped string literal; idempotent | AC-F2 |
| T26 | S3 | `site-name` × empty, over 60 characters, or containing a control character or newline | Argument error, exit 1, no file written | AC-F2 |
| T27 | S3 | `site-name` × contains quotes, backslash, backtick, `$`, `<` | Accepted; written so that the config module still evaluates and the frontmatter still parses to exactly that string | AC-F2 |
| T28 | S3 | `host` × `github-pages` | Base set to `/<repo-name>/`; Pages workflow installed (existing rule: never clobber a different one) | AC-F3 |
| T29 | S3 | `host` × `cloudflare-pages`, no workflow present | Base removed; no workflow installed | AC-F3 |
| T30 | S3 | `host` × `cloudflare-pages`, workflow equals the generated one | Workflow removed | AC-F3 |
| T31 | S3 | `host` × `cloudflare-pages`, workflow differs from the generated one | Left untouched; warning | AC-F3 |
| T32 | S3 | `from-repo` × given | Slug replaced from that value (and from the upstream slug if still present) | AC-F4 |
| T33 | S3 | `from-repo` × malformed | Argument error, exit 1 | AC-F4 |
| T34 | S3 | Package version × `keepVersion` absent vs present | Absent (the CLI default, unchanged): reset to `0.1.0`; present: left alone | AC-F5 |
| T35 | S3 | Whole run × same arguments twice | Second run reports zero changed files | AC-F6 |
| T36 | S3 | Existing flags × no new flag given | Behaviour unchanged; every existing test stays green | AC-F7 |
| T37 | S3 | Runtime × Node type stripping, no `tsx` | The CLI runs | AC-F8 |
| T38 | S4 | Record × `schema` field unknown | Refused with a message; nothing written | AC-R1 |
| T39 | S4 | Record × written | Two-space JSON with a trailing newline; same input → byte-identical file | AC-R3 |
| T40 | S4 | `author` × 1–100 characters, no control characters | Accepted | AC-R2 |
| T41 | S4 | `author` × empty, over 100 characters, or control characters | Field error; nothing written | AC-R2 |
| T42 | S4 | `repo` × `owner/name` with `[A-Za-z0-9._-]` | Accepted | AC-R2 |
| T43 | S4 | `repo` × anything else | Field error | AC-R2 |
| T44 | S4 | `host` × outside the two values | Field error | AC-R2 |
| T45 | S4 | `origin` × host `github-pages` | Derived as `https://<owner, lowercased>.github.io/<repo-name>`; any submitted value ignored | AC-R2 |
| T46 | S4 | `origin` × host `cloudflare-pages`, `https://` + lowercase hostname only | Accepted; the default offered is `https://<repo-name>.pages.dev` with the name lowercased and every character outside `[a-z0-9-]` replaced by `-` | AC-R2 |
| T47 | S4 | `origin` × host `cloudflare-pages`, path, port, query, fragment, userinfo, or not `https` | Field error | AC-R2 |
| T48 | S4 | `siteName` × as T25–T27 | Same rules | AC-R2 |
| T49 | S5 | git × missing, or older than 2.28 | Blocking; tutorial for the detected OS | AC-V2 |
| T50 | S5 | git identity × `user.name` or `user.email` unset | Blocking; tutorial | AC-V2 |
| T51 | S5 | Rust (`cargo`) × missing | Non-blocking, labelled "local development only"; tutorial | AC-V3 |
| T52 | S5 | `wasm-pack` × missing | Non-blocking, same label; tutorial | AC-V3 |
| T53 | S5 | Node × version | Reported | AC-V1 |
| T54 | S5 | OS × `win32`, `darwin`, `linux` | That OS's tutorial; any other platform gets the generic links | AC-V4 |
| T55 | S5 | Probe × command fails, times out, or is absent | Treated as missing; probes never run through a shell | AC-V5 |
| T56 | S6 | Listen address × | `127.0.0.1`, OS-assigned port; printed URL carries the token | AC-S1 |
| T57 | S6 | Token × missing or wrong, any route | 403 | AC-S2 |
| T58 | S6 | `Host` header × not `127.0.0.1:<port>` or `localhost:<port>` | 403 | AC-S3 |
| T59 | S6 | `Origin` header × absent or not this server, on any state-changing request | 403 | AC-S3 |
| T60 | S6 | Request body × over 16 KiB | 413 | AC-S6 |
| T61 | S6 | Save × while another save is running | 409 | AC-S6 |
| T62 | S6 | Browser launch × fails | Message only; server keeps running | AC-S5 |
| T63 | S6 | Import graph × setup module | Only `node:` built-ins and files inside the repository; starts with no `node_modules` | AC-S7 |
| T64 | S7 | Written paths × after a save | Only the whitelisted edit targets, the setup record, and git metadata | AC-S4 |
| T65 | S7 | Repository × no `.git` | `git init` on branch `main`; baseline commit of the tree as left by create-wxl; record gains the baseline commit; then settings applied | AC-G1 |
| T66 | S7 | Repository × `.git` present | No init, no commit; record's baseline is null; page explains why | AC-G2 |
| T67 | S7 | Repository × no setup record and `origin` remote is the upstream | Save refused with an explanation; nothing written | AC-G3 |
| T68 | S7 | Repository × no setup record, not upstream | First setup: slug replaced from the upstream slug; package version reset; upstream version from the package version, commit null, created-with null | AC-G4 |
| T69 | S7 | Save × record has `applied` | No commit; slug replaced from `applied.repo`; package version kept; after success `applied` = `settings` | AC-G5 |
| T70 | S7 | Apply × fails part-way | `settings` holds the new values, `applied` is unchanged; error reported; the next save, replacing from `applied.repo`, completes the edits | AC-G6 |
| T71 | S7 | Save response × | Changed files, warnings, and the next steps for the chosen host | AC-G7 |
| T72 | S7 | Next steps × `github-pages` | Commit and push; create the repository; Pages source = GitHub Actions; `github-pages` environment tag rule `v*`; push a `v*` tag; short-link warning | AC-G7 |
| T73 | S7 | Next steps × `cloudflare-pages` | Commit and push; create the Pages project; build command, output directory, `NODE_VERSION`; return here if the assigned address differs | AC-G7 |
| T74 | S11 | UI strings × `en` vs `zh-TW` | Same key set | AC-U1 |
| T75 | S11 | UI locale × browser `zh*` vs other; toggle | Default follows the browser; the toggle switches | AC-U2 |
| T76 | S11 | GitHub Pages origin field × | Shown read-only with the derived value | AC-U4 |
| T77 | S11 | Whole flow × environment check, fill, first save, edit and save again | Works end to end in the Browser panel | AC-U3 |
| T78 | S10 | CI × OS and Node | Windows, macOS and Ubuntu on Node 24, plus Ubuntu on Node 22, run the create-wxl, setup-module and fork-init tests | AC-CI1 |
| T85 | S10 | CI job × in a range, where the upstream-only tests are absent | Passes | AC-CI1 |
| T79 | — | Built site × setup module | No setup-module file appears in the built output | AC-B1 |
| T80 | — | Teacher docs × README, README.en, both `wxl-fork-init` skills | Quick start and the after-fork section use create-wxl → `range:setup`; Node and git stated as the requirements | AC-D1 |
| T81 | — | Open-questions register × OQ-004, OQ-005, new | OQ-005 resolved; OQ-004 records the Cloudflare rule; a new entry for the GitHub Pages short-link button | AC-D2 |
| T82 | — | Glossary × five terms | Present and passing the glossary test | AC-D3 |
| T83 | — | Stage 8 surface ① × packed create-wxl, override = the ticket's pushed commit | A range is created from GitHub's tarball | AC-X1 |
| T84 | — | Stage 8 surface ③ × generated range | `pnpm install && pnpm build` succeeds; output carries the chosen title, base and origin | AC-X2 |
