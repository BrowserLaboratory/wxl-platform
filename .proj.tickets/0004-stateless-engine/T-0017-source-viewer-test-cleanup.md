---
id: T-0017
title: Leave no CodeMirror editor alive after a SourceViewer test
epic: 0004-stateless-engine
status: review
blocked_by: [T-0016]
---

## Context

While T-0016 landed, CI's `test` job failed with every test passing: vitest reported one unhandled error, `TypeError: this.win.requestAnimationFrame is not a function`, raised in `@codemirror/view`'s `updateForFocusChange` timer and attributed to `tests/unit/components/SourceViewer.test.ts` (GitHub Actions run 38761538310, the first `test` job on BrowserLaboratory/wxl-platform#20). The file's last test focuses the editor, which schedules a 10 ms timer; the file never unmounts the wrappers its mount helper creates, so the editor is not destroyed, and when the test environment is torn down inside those 10 ms the timer calls a `requestAnimationFrame` that is gone. A destroyed view returns early from `update()`, so unmounting (the component's `onUnmounted` calls `destroy()`) removes the failure. Timing-dependent: on `main` at `30474aa`, a loop of

```
for i in $(seq 1 12); do
  pnpm vitest run tests/unit/components/SourceViewer.test.ts > log 2>&1
  echo "run $i exit=$? err=$(grep -c 'requestAnimationFrame is not a function' log)"
done
```

ran the file twelve times; every run reported `exit=0` and `err=0`, so twelve local runs did not reproduce it.

Spec: `.proj.specs/0004-stateless-engine/spec.en.md`; row T85 and seam 0004-S10 in `traceability.md` (revision 2.2). The user chose on 2026-10-15 to handle this under epic 0004 as one ticket, with the traceability revision and without rerunning stage 3, since it changes tests only.

## Deliverable

`tests/unit/components/SourceViewer.test.ts` unmounts, after each test, every wrapper its mount helper created, and asserts that every editor those wrappers held is destroyed and that no `.cm-editor` remains in `document` afterwards. The component is unchanged.

## Acceptance criteria

- [x] T85: after each SourceViewer test every editor its mount helper created is destroyed and no `.cm-editor` remains in `document`, and the file's run reports no unhandled error (S10)

## 給使用者（zh-TW）

修正 CI 偶發的紅燈：SourceViewer 的測試結束時沒有銷毀 CodeMirror 編輯器，它的 focus 計時器有時會在測試環境拆掉後才觸發而丟出錯誤。改成每支測試結束都 unmount，並斷言 document 裡不再有編輯器。只改測試檔，元件不動。

## Comments

### 2026-10-15 — test plan table (approved by the user before the first test)

Approved by the user on 2026-10-15, quoted verbatim: "核准".

| Seam | Test intent | Scope | Acceptance criterion | Boundary conditions |
|---|---|---|---|---|
| 0004-S10 | 每支測試結束後，document 裡沒有殘留的 `.cm-editor` | `SourceViewer.test.ts` 新增一個 `afterEach`：先 unmount 這支測試裡 `mountViewer` 建立的每個 wrapper，再斷言 `document.querySelectorAll('.cm-editor')` 長度為 0 | T85 / AC-C4 | 紅燈：先只加斷言、還沒加 unmount 時，第一支用 `mountViewer` 的測試就應該在 `afterEach` 失敗；`mountViewer` 以外直接 `mount` 而且自己 unmount 的那支測試（unmounting while the editor is still loading）不重複 unmount |
| 0004-S10 | 整個測試檔跑完沒有 unhandled error | `pnpm vitest run tests/unit/components/SourceViewer.test.ts`，連跑 20 次 | T85 / AC-C4 | 每次 exit 0，輸出沒有 `Errors` 這一行；全套 `pnpm test --run` 跑一次 |
| 0004-S10 | 機制紀錄：在 repo 副本裡，用一支不 commit 的模擬測試證明修法有效 | repo 副本（`node_modules` 連結）：mount、`focus()`，接著拿掉 `window.requestAnimationFrame` 並等 50 ms；一組不 unmount、一組先 unmount | T85 / AC-C4 | 不 unmount：`Tests 1 passed` 且 `Errors 1 error`、exit 1；先 unmount：exit 0、沒有 error。指令與輸出記在 ticket 裡 |

**Notes**

- 既有測試的 body 都不改；只新增模組層級的 `afterEach`，以及讓 `mountViewer` 把 wrapper 記到一個陣列。
- 不用 `@vue/test-utils` 的 `enableAutoUnmount`：檔案裡已有一支測試自己 unmount，自動 unmount 會對它再 unmount 一次。
- 元件（`.vitepress/theme/components/SourceViewer.vue`）不改：它的 `onUnmounted` 已經 `destroy()` 編輯器。
- 這是只改測試的修正，沒有網頁行為可驗，第 8 階段以 S10 的連跑紀錄與 PR 的 CI 為準。

### 2026-10-15 — red → green log

**Row 1 — red, then green.**

Red (assertion-only `afterEach`, no unmount yet), command `pnpm vitest run tests/unit/components/SourceViewer.test.ts`:

```
AssertionError: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ tests/unit/components/SourceViewer.test.ts:71:58
     69|
     70| afterEach(() => {
     71|   expect(document.querySelectorAll('.cm-editor').length).toBe(0)
       |                                                          ^
     72| })
     73|

 Test Files  1 failed (1)
      Tests  22 failed | 1 passed (23)
```

The one passing test was "does not reject after the host is gone", which mounts without
`attachTo: document.body` and so leaves nothing for the selector to find; every test that
went through `mountViewer` failed the new assertion, as expected — the editor it built was
never destroyed.

Change: `mountViewer` now pushes each wrapper it creates into a module-level
`mountedWrappers` array; the `afterEach` unmounts and clears every recorded wrapper before
the assertion, with a short comment on why (an editor left alive keeps CodeMirror's focus
timer armed, and that timer can fire after the test environment is torn down). No existing
test body changed; `git diff -U0 HEAD -- tests/unit/components/SourceViewer.test.ts` shows
only the `afterEach` import, the new array, the `push` in `mountViewer`, and the new
`afterEach`.

Green, same command:

```
 Test Files  1 passed (1)
      Tests  23 passed (23)
```

**Row 2 — 20 runs, then the full suite.**

Loop command:

```
for i in $(seq 1 20); do
  pnpm vitest run tests/unit/components/SourceViewer.test.ts > log 2>&1
  echo "run $i exit=$? errs=$(grep -c '^ *Errors' log)"
done
```

Run 20 times in a loop: every run exited 0, every run reported `Tests  23 passed (23)`, and
no run printed an `Errors` line (`errs=0` every time). Excerpt (first and last of the 20):

```
run 1 exit=0 errs=0
 Test Files  1 passed (1)
      Tests  23 passed (23)
...
run 20 exit=0 errs=0
 Test Files  1 passed (1)
      Tests  23 passed (23)
```

`pnpm test --run`, once: the first attempt overlapped in time with the row-3 reproduction
runs in a separate repository copy and surfaced six unrelated, timing-sensitive test files
(`MergedNav.test.ts`, `SessionGate-truth.test.ts`, `ChallengeLayout.test.ts`,
`config-base.test.ts`, `upstream-guard.test.ts`, `challenge-verify-timeout.test.ts`) as
`Test timed out` failures under the added CPU load; `SourceViewer.test.ts` itself stayed
among the passing files in that run. Rerun alone, with nothing else running:

```
 Test Files  127 passed (127)
      Tests  4175 passed | 1 skipped (4176)
exit=0
```

No `Errors` line. (That run's log also carried one `AggregateError [ECONNREFUSED]` stack
trace to `127.0.0.1:3000`/`::1:3000`, printed interleaved with the run's own output; it did
not affect the reported pass count, exit code, or any test's outcome, and nothing in this
ticket's scope opens a connection to that port. This has also been seen on other branches'
full runs in this epic — T-0016's stage 7 export run, T-0011's comparison against `main` —
so it is read as not caused by this change; that is not a claim that it was reproduced
against unmodified `main` here, because it was not run against `main` in this ticket.)

Both checks above were rerun after the stage 6 and 7 fix below (the `destroyed`-flag
assertion added to `afterEach`): the same 20-run loop, all 20 runs exit 0, all `Tests  23
passed (23)`, no `Errors` line; and one more solo `pnpm test --run`, with nothing else
running concurrently this time:

```
 Test Files  127 passed (127)
      Tests  4175 passed | 1 skipped (4176)
exit=0
```

Clean on the first attempt — no concurrent timeouts this time — and it carried the same
`AggregateError [ECONNREFUSED]` artifact again, with no effect on the result.

Verification surface: local `vitest` with the `happy-dom` environment (`vitest.config.ts`'s
`test.environment`) on macOS, both before and after the stage 6 and 7 fix. Stage 8 (the
PR's CI) is outstanding and is the parent's to append once it has run.

**Row 3 — mechanism record.**

Performed in a copy of the repository with `node_modules` linked (not committed, and not
part of this checkout). Test source written to
`tests/unit/components/sv-repro.test.ts` in that copy:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { EditorView } from '@codemirror/view'
import SourceViewer from '../../../.vitepress/theme/components/SourceViewer.vue'

/**
 * Mechanism reproduction for T-0017 (uncommitted, run in a repository copy only).
 *
 * Mounts SourceViewer, waits for the real CodeMirror editor to appear, focuses its
 * content surface (arming the `updateForFocusChange` timer), optionally unmounts
 * (destroying the view, per `onUnmounted`), then removes
 * `window.requestAnimationFrame` and waits past the timer's 10 ms delay. Without
 * unmount, the timer should still fire against a live, non-destroyed view and throw
 * for the missing `requestAnimationFrame`. With unmount, the destroyed view's
 * `update()` should return early and raise nothing.
 */

const UNMOUNT = process.env.SV_REPRO_UNMOUNT === '1'

function view(wrapper: { vm: unknown }): EditorView | null {
  return (wrapper.vm as { editorView: EditorView | null }).editorView
}

async function untilEditorReady(wrapper: { vm: unknown }): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!view(wrapper) && Date.now() < deadline) {
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  expect(view(wrapper)).toBeTruthy()
}

describe('sv-repro — mechanism record', () => {
  it(`focus timer vs requestAnimationFrame removal (SV_REPRO_UNMOUNT=${process.env.SV_REPRO_UNMOUNT ?? ''})`, async () => {
    const wrapper = mount(SourceViewer, {
      props: { files: [{ path: 'app.py', content: 'x = 1\n' }] },
      attachTo: document.body,
    })
    await untilEditorReady(wrapper)

    const content = wrapper.find('.cm-content').element as HTMLElement
    content.focus()

    if (UNMOUNT) {
      wrapper.unmount()
    }

    const original = window.requestAnimationFrame
    ;(window as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame = undefined
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
    } finally {
      window.requestAnimationFrame = original
    }
  })
})
```

Without unmount, `SV_REPRO_UNMOUNT=0 pnpm vitest run tests/unit/components/sv-repro.test.ts`:

```
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: this.win.requestAnimationFrame is not a function
 ❯ EditorView.requestMeasure .../node_modules/@codemirror/view/dist/index.js:8273:46
 ❯ EditorView.update .../node_modules/@codemirror/view/dist/index.js:7978:18
 ❯ Timeout._onTimeout .../node_modules/@codemirror/view/dist/index.js:5191:22

 Test Files  1 passed (1)
      Tests  1 passed (1)
     Errors  1 error
exit=1
```

With unmount, `SV_REPRO_UNMOUNT=1 pnpm vitest run tests/unit/components/sv-repro.test.ts`:

```
 Test Files  1 passed (1)
      Tests  1 passed (1)
exit=0
```

This isolates the mechanism the Context section describes: a live, non-destroyed
`EditorView`'s focus timer calls `requestAnimationFrame` after it is removed from `window`
and raises an unhandled error; a destroyed `EditorView` (unmounted, matching this
component's `onUnmounted`) does not.

### Deviations

- The row-2 full-suite check (`pnpm test --run`) did not go clean on its first attempt. It
  overlapped in time with the row-3 mechanism reproduction, which was running in a separate,
  uncommitted repository copy; the added CPU load produced `Test timed out` failures in six
  unrelated, timing-sensitive files (`MergedNav.test.ts`, `SessionGate-truth.test.ts`,
  `ChallengeLayout.test.ts`, `config-base.test.ts`, `upstream-guard.test.ts`,
  `challenge-verify-timeout.test.ts`); `SourceViewer.test.ts` itself passed in that run. A
  second, solo run (nothing else running) was clean. The coverage table below counts one
  clean full-suite run, not the concurrent attempt, and the post-fix rerun (see row 2) was
  clean on its first, solo attempt.
- Both full-suite runs carried one `AggregateError [ECONNREFUSED]` stack trace to
  `127.0.0.1:3000`/`::1:3000`, interleaved with the run's own output, with no effect on the
  reported pass count, exit code, or any test's outcome. This has also been seen on other
  branches' full runs in this epic (T-0016's stage 7 export run, T-0011's comparison against
  `main`); nothing in this ticket's scope opens a connection to that port, so it is read as
  not caused by this change — not as evidence that it was reproduced against unmodified
  `main`, which was not run here.

### 2026-10-15 — stage 6 and 7 disposition

Authorized in advance to fix, in-scope, behaviour-preserving findings directly and report
them. Four findings, disposed as follows.

**1. The `afterEach` assertion measured DOM removal, not `destroy()`.** Vue's `unmount()`
removes the component's DOM on its own, so `.cm-editor` reaching zero proves nothing about
whether the `EditorView` itself was destroyed — and T85 / seam 0004-S10 exists to guard
exactly that, because CodeMirror's `update()` only returns early for a view whose `destroy()`
ran. Fixed: `afterEach` now records each tracked wrapper's `EditorView` before unmounting,
and after unmounting asserts every recorded view's `destroyed` flag (a non-public field,
commented as such) is `true`, alongside the existing `.cm-editor` count assertion.

Mutation evidence, performed in a non-committed repository copy (`rsync`-ed excluding
`node_modules`/`.git`/`dist`/`chall-wasm/target`, with `node_modules` symlinked), with
`.vitepress/theme/components/SourceViewer.vue`'s `onUnmounted` `destroy()` call removed by a
single-quoted `perl -i -pe` edit and confirmed by `diff`/`cmp` before each run:

- Pre-fix assertion (DOM-only) against the mutated component —
  `pnpm vitest run tests/unit/components/SourceViewer.test.ts`:

  ```
   Test Files  1 passed (1)
        Tests  23 passed (23)
  ```

  Green even with `destroy()` removed — the gap the finding describes.

- Post-fix assertion (adds the `destroyed`-flag check) against the same mutated component,
  same command:

  ```
   Test Files  1 failed (1)
        Tests  22 failed | 1 passed (23)
  ```

  With `AssertionError: expected false to be true` at the new `destroyed` check (the one
  passing test is "does not reject after the host is gone", which never goes through
  `mountedWrappers`). Caught, as intended.

**2. The `afterEach` comment misattributed what `destroy()` does.** It read "An editor left
alive keeps CodeMirror's focus timer armed, and that timer can fire after the test
environment is torn down" — but `destroy()` does not clear that `setTimeout`; the timer
fires either way. What differs is that a destroyed view's `update()` returns early, so the
timer firing is harmless. Fixed: reworded to "CodeMirror's focus timer still fires after a
test ends; only a destroyed view ignores it, so every editor is destroyed before the
environment is torn down."

**3. The polling-rationale comment sat above `mountedWrappers`, not above `mountViewer`.**
The comment documents why `untilEditorReady` polls against a wall-clock deadline, but the
`mountedWrappers` declaration sat between the comment and `mountViewer`, which the comment
is actually about. Fixed: moved `mountedWrappers` down next to `beforeEach`, so the comment
is now immediately above `mountViewer`.

**4. `beforeEach`'s `document.body.innerHTML = ''` has no comment on it still being a
safety net now that `afterEach` owns cleanup.** Not changed. That line is the entire body of
an existing hook, not new or touched surface from this ticket's approved test plan (whose
notes scope the change to "only a module-level `afterEach`, and `mountViewer` pushing into
an array"); annotating it would add text to a hook this ticket was not asked to touch.
Recorded here instead of in the test file.

**Two alternatives considered and not taken:**

- Registering the "does not reject after the host is gone" test's direct `mount()` into
  `mountedWrappers` too, so the new `destroyed` check would cover it. Rejected: it already
  unmounts itself, so adding it to `mountedWrappers` would unmount it a second time and
  would change an existing test's body, which the approved test plan's notes rule out.
- Translating the approved test plan table (stage 5) into English for consistency with this
  document's language. Rejected: it is the user-approved table verbatim and is out of this
  ticket's authorized scope to edit.

### 2026-10-15 — coverage report table

| Seam | Tests | Measured coverage | Acceptance criterion | Uncovered, and why |
|---|---|---|---|---|
| 0004-S10 | `SourceViewer.test.ts`'s `afterEach` (unmount every `mountViewer` wrapper; assert no `.cm-editor` remains; assert every tracked `EditorView`'s `destroyed` flag is `true`); 20 solo runs of the file; one clean full-suite run (a first, concurrent attempt timed out in six unrelated files); a repository-copy mechanism record (`sv-repro.test.ts`, not committed); a repository-copy mutation record (removing the component's `onUnmounted` `destroy()` call, not committed — see "stage 6 and 7 disposition" below) | not measured: no coverage provider is installed | T85 / AC-C4 | The natural failure is timing-dependent (it depends on CodeMirror's 10 ms focus timer firing inside the test environment's teardown window) and was not reproduced locally in the twenty solo runs or the one clean full-suite run, so the evidence for the fix is the deterministic mechanism record, the mutation record, and the `destroyed`-flag assertion, not a captured natural failure. "does not reject after the host is gone" mounts directly (no `attachTo`, not pushed to `mountedWrappers`) and so is outside `afterEach`'s assertions; it is not changed by this ticket. It leaves no editor behind because the component re-checks the host after its awaits, not because of anything `afterEach` does |

Verification surface: local `vitest` with the `happy-dom` environment on macOS (see row 2 above for the commands and outputs); stage 8 is the PR's CI, outstanding and left to the parent.

### 2026-10-15 — stage 7 security review

Report: `.proj.specs/0004-stateless-engine/review/security-T-0017.md`. Five candidates, independently filtered: no security defect (test files and spec text only, no attacker, no trust boundary crossed); the real non-security items were handled in the stage 6 and 7 disposition above.
