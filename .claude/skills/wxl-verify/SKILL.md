---
name: wxl-verify
description: Use when running the release-blocking gate for a wxl challenge (L1 frontmatter/structure, L2 content analysis + wasm-tools validate, L3 Playwright e2e) and auto-fixing failures. Shared by wxl-create and wxl-mutate as their hand-off target, and usable standalone after manual edits. Not for the L4 blind cross-check (use wxl-crosscheck).
---

Run the layered `pnpm challenge:verify` gate for a challenge and, on failure, drive a bounded auto-fix loop with plain-text confirmation. This skill is the shared verification target that `wxl-create` and `wxl-mutate` hand off to, and it can be invoked directly after any manual edit. It uses only `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`, and confirms fixes through plain-text question blocks.

**Input**: The argument after the trigger is the challenge `slug` to verify (e.g. `door-is-open`).

## Overview

`wxl-verify` owns the **Verify** verb: it runs the release-blocking gate and repairs failures. The gate has three layers — L1 (frontmatter / structure lint), L2 (content analysis + keygen + `wasm-tools validate`), L3 (Playwright e2e exploit). L4 (blind solve) is NOT run here — it belongs to `wxl-crosscheck`, which runs once at pipeline stage 8 before the challenge lands.

The skill activates when the user asks to verify a challenge, or when `wxl-create` / `wxl-mutate` hand off after generating or mutating a challenge.

## Workflow

```dot
digraph verify {
    node [shape=box];
    gate    [label="1. Run gate\npnpm challenge:verify <slug>"];
    pass    [label="exit 0?", shape=diamond];
    done    [label="Report passed layers", shape=doublecircle];
    loop    [label="2. Auto-fix loop"];
    gate -> pass;
    pass -> done [label="yes"];
    pass -> loop [label="no / warnings"];
    loop -> gate [label="re-verify after confirmed fix"];
}
```

### Step 1: Run the layered gate

- **What**: Execute the release-blocking gate and display the per-layer result.
- **How**: Run via Bash:

  ```bash
  pnpm challenge:verify <slug>
  ```

  `challenge:verify` orchestrates L1 (delegates to the frontmatter/structure lint), L2 (content analysis + keygen + `wasm-tools validate`), and L3 (Playwright e2e). Never pass `--blind` from this skill.
- **Verification**:
  - Exit 0 → display a success message listing the layers that passed; the challenge is gate-clean; stop.
  - Exit 1 → display the layered output verbatim and go to Step 2.
  - Exit 0 with L1/L2 warnings in stdout (e.g. hardcoded localhost, flag-format mismatch) → display the warnings and go to Step 2.

### Step 2: Auto-fix loop

```dot
digraph fixloop {
    node [shape=box];
    parse   [label="Parse layered output", shape=ellipse];
    limit   [label="attempt < max?", shape=diamond];
    fix     [label="Propose combined fix"];
    confirm [label="User confirms?", shape=diamond];
    apply   [label="Apply + re-verify"];
    ok      [label="All layers pass?", shape=diamond];
    done    [label="Done (gate-clean)", shape=doublecircle];
    stop    [label="Stop, surface remaining"];
    parse -> limit;
    limit -> fix [label="yes"]; limit -> stop [label="no"];
    fix -> confirm; confirm -> apply [label="apply"]; confirm -> stop [label="skip"];
    apply -> ok; ok -> done [label="yes"]; ok -> parse [label="no"];
}
```

- **What**: Repair the failing layer(s) with the user's confirmation, then re-verify, until the gate is clean or the attempt limit is reached.
- **How — read the config first**: Read `.wxl-verify/config.yaml` and parse `max_fix_attempts`. If the file or field is absent, use the default **10**. Initialize `attempt = 0`.

  Each iteration:
  1. Increment `attempt`. If `attempt > max_fix_attempts`, display the remaining issues and stop, for example:

     ```
     已達到自動修正上限（<max> 次）。以下問題需要手動處理：
     - <remaining errors/warnings>
     可在 .wxl-verify/config.yaml 調整 max_fix_attempts。
     ```
  2. **Parse** the layered output; identify which layer failed (L1 / L2 / L3) and why; address all issues in one combined fix.
  3. **Propose fixes** (all issues at once):
     - Missing/invalid frontmatter fields → add/correct via Edit.
     - Wrong file type for backend → fix the mismatch.
     - Flag not matching `FLAG{...}` / `CTF{...}` → rewrite `flag.txt`.
     - Hardcoded `localhost` / `127.0.0.1` / `0.0.0.0` in app code → remove/replace.
     - Missing files → create via Write.
     - L3 spec assertion failure → revise `platform/challenge/<slug>/src/<app>` so the exploit returns the flag; do NOT edit `tests/challenges/<slug>.spec.ts`.
     - If the failing challenge's `tags` intersect a registered capability pack's taxonomy, read that pack's reference doc and consult its `Per-primitive fix hints` section before proposing the fix. For A01 (tags intersecting `idor`, `access-control`, `jwt`, `path-traversal`, `broken-access`), read `../wxl-create/reference/a01-access-control.md` (relative to this skill).
  4. **Describe** all proposed changes (diff form) to the user, then emit a plain-text confirmation block:

     ```
     📋 套用這些修正？
       1) 套用
       2) 跳過，顯示剩餘錯誤
     Please reply `apply` / `skip` (or `1` / `2`).
     ```

     Wait for the user's next message before applying.
  5. **On `apply`**: apply fixes, then re-run `pnpm challenge:verify <slug>`. Exit 0 → done. Otherwise loop back to (1).
  6. **On `skip`**: display remaining errors and stop.
- **Verification**: The gate exits 0, or the loop stops within `max_fix_attempts` with the remaining issues surfaced. The confirmation is always plain text — never a host-specific question primitive.

## Anti-patterns

- ❌ **Running `--blind` (L4) from this skill.**
  - ✅ `wxl-verify` runs L1–L3 only; L4 is `wxl-crosscheck`, run at pipeline stage 8 before the challenge lands.
  - **Why**: L4 requires runtime CLIs installed locally, is not run in CI, and runs once per landing rather than per edit.
- ❌ **Editing the Playwright spec to make L3 pass.**
  - ✅ Fix the app code so the exploit returns the flag; leave `tests/challenges/<slug>.spec.ts` untouched.
  - **Why**: The spec is the contract; editing it to pass hides a broken challenge.
- ❌ **Applying fixes without the plain-text confirmation.**
  - ✅ Always emit the `apply` / `skip` block and wait for the user's reply.
  - **Why**: Silent auto-edits surprise the author and can compound a wrong fix.
- ❌ **Looping forever.**
  - ✅ Respect `max_fix_attempts` from `.wxl-verify/config.yaml` (default 10).

## Verification

- `pnpm challenge:verify <slug>` exits 0 after the loop, or stops within the configured limit.
- Config honored: with `.wxl-verify/config.yaml` set to `max_fix_attempts: 5`, the loop stops after 5 attempts; with no file, it uses 10.
