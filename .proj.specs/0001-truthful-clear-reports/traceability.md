# Traceability: truthful site-wide clear reports

Single source of truth for spec `0001-truthful-clear-reports` (v3: round-1 rulings A1–A3, round-2
rulings A4–A5 and round-2 P1 fixes; v3 is not re-reviewed). The spec's prose is
derived from this file. Every row reaches an acceptance criterion (AC) in `spec.en.md`. Line numbers
in this file refer to commit `72327e2`.

## Glossary used here

| Term | Meaning |
|---|---|
| site-wide clear | The session gate's **Delete it and start fresh** action (`CONTEXT.md`). Two halves run in order: the database delete, then the local-value sweep. |
| clear run | One invocation of the site-wide clear that is not ignored. A press while a run is in flight is ignored and is not a run. Not the glossary's *attempt*, which is a learner's work session on one challenge. |
| earlier state | At the start of a run: `clearStarted` is true, or `databaseDeleted` is true, or `clearFailurePhase` is not `null`. A run with no earlier state is a *first run*; this includes the first run on a reloaded page only when no start record was restored. |
| refused run | A run whose start record cannot be made durable (`sessionStorage` write throws or does not read back). Nothing is sent to the database. With earlier state it leaves `clearFailurePhase`, `clearStarted` and the error untouched and sets the refusal notice; without earlier state it sets the error to the not-started sentinel (unchanged behaviour). |
| refusal notice | New gate state, module-level: `clearRefused: boolean`. True when a run with earlier state is refused; false when a run starts; false in a new document. It adds `clear_retry_not_started_hint` beneath whatever report the earlier run left. |
| database delete | `deleteDatabase()` on this site's IndexedDB database. Resolves, or rejects: *blocked* (a connection that does not yield holds the database), *timed out* (no `blocked` event within the bound, including a request queued behind another), or *other* (any other rejection, such as an error event). |
| local-value sweep | Removal of every clearable `localStorage` key, run only after the database delete resolved. Keys the key declaration exempts (the interface locale) are never attempted. |
| `databaseDeleted` | Gate state, renamed from `storedWorkGone`. Module-level. True from the moment a database delete resolves in this document; never reset within the document; false in a new document. |
| `clearFailurePhase` | New gate state, module-level beside the error: `'delete' \| 'sweep' \| null`. The half in which the latest *started* run failed. Set to `null` when a run starts; `'delete'` on any database delete rejection; `'sweep'` when the sweep throws. A refused run leaves it unchanged. |
| `clearStarted` | Existing gate state: a start record exists for this browser session. Set when a run starts; restored from `sessionStorage` on load; forgotten on success. A refused run leaves it unchanged (changed from `72327e2`, which set it to false: `useSessionGate.ts:479`). |
| learner rows | Rows in the database's object stores that the gate's detection counts as learner evidence (not initialization-only sessions). |
| native blocking connection | A connection opened with the browser's own `indexedDB.open` and no `versionchange` handler. The site's own connections close on `versionchange` (`useChallengePersistence.ts:375-383`) and do not block a delete. |

## Copy under change

| Key | Current (en) | New (en) | New (zh-TW) |
|---|---|---|---|
| `body_cleared` | The saved work has already been deleted and cannot be brought back. What is left is whatever this browser would not let go of. | This site's database in this browser has been deleted, and anything it held cannot be brought back. | 本站在這個瀏覽器裡的資料庫已經刪除；裡面若有東西，也都救不回來了。 |
| `sweep_failed` | The saved work was deleted. Some of this site's stored values could not be removed. | Not every other value this site stored in this browser could be removed. | 本站在這個瀏覽器存的其他項目，沒能全部刪掉。 |
| `sweep_failed_hint` | There is no way to tell from here how many are left, and closing other tabs does not remove them. Pressing delete again retries the part that did not finish. | There is no way to tell from here how many are left. Pressing delete again retries the whole site-wide clear, starting with the database. | 從這裡無從得知還剩下多少。再按一次刪除，會從資料庫開始，把全站清除整個重試一次。 |
| `clear_unconfirmed_hint` | Another tab of this site still has the data open, which is what the deletion is waiting on. Closing the other tabs lets it finish. Reload to see what is left. | The site-wide clear cannot finish while another tab of this site has the data open. Close any other tabs, then reload. | 本站還有其他分頁開著同一份資料時，全站清除無法完成。請先關掉其他分頁，再重新載入。 |
| `clear_retry_not_started_hint` (new) | — | This browser would not let the site record that the site-wide clear began, so nothing was deleted this time. Free up this browser's storage for this site, or use a normal window, then try again. | 這個瀏覽器不讓本站記下全站清除已經開始，所以這次沒有刪掉任何東西。請清出本站在這個瀏覽器的儲存空間，或改用一般視窗，再試一次。 |

**Copy invariant (CI-1).** None of the five strings above contains, in either locale, a term from this
banned list: en `work`, `learner`, `your`, `saved`; zh-TW `作品`, `解題紀錄`, `紀錄`, `你的`, `已存`.
Checked by test against the literal strings.

**Stated trade-off (CI-2).** Unchanged strings that presuppose saved work (`title`, `body`,
`body_unconfirmed`, `clear_not_started_hint`) are outside CI-1. The gate usually asks because
detection found learner evidence (`useSessionGate.ts:365`). It also asks when a start record is
restored (`:335-341`) and when detection throws (`:366-374`); on those two paths the presupposition is
not backed by detection. All of this is behaviour at `72327e2`, outside this epic, and tracked by a new
open question (T44).

## Selection rules

Evaluated in order; the first matching line wins.

| Part | Rule |
|---|---|
| Body | phase `'sweep'` → `body_cleared`; phase `'delete'` → `body_unconfirmed`; `clearStarted` → `body_unconfirmed`; `databaseDeleted` → `body_cleared`; otherwise `body` |
| Report | no error → none; error is the not-started sentinel → `clear_not_started` + `clear_not_started_hint`; phase `'sweep'` → `sweep_failed` + `sweep_failed_hint`; any other error → `clear_unconfirmed` + `clear_unconfirmed_hint`. Then, if `clearRefused`, `clear_retry_not_started_hint` is added beneath (no `clear_not_started` heading) |
| Raw error line | shown with every report except the not-started-sentinel one |
| Continue | shown, and accepted, only when neither `databaseDeleted` nor `clearStarted` |
| Clear | always shown |
| Reload | (error present or `clearRefused`), `clearStarted`, and phase not `'sweep'` |
| Dismiss | shown, and accepted, only when error present and phase `'sweep'` |
| Presented off challenge pages | when `clearStarted` or `databaseDeleted` (unchanged) |

## States

| ID | State | How it is reached (fault, see Faults) |
|---|---|---|
| P0 | Untouched gate | Learner evidence present; no run |
| P1 | First run in flight | Clear pressed; delete pending |
| P2 | First run: delete blocked | F2 |
| P3 | First run: delete timed out | F3 |
| P3x | First run: delete rejected otherwise | F5 |
| P4 | Sweep failed; no learner rows before the run | Note draft in `localStorage`, database without learner rows; F1 |
| P5 | Sweep failed; learner rows before the run | Learner rows in the database and at least one clearable `localStorage` key; F1 |
| P6 | Later run in flight after P4/P5 | Clear pressed again; delete pending |
| P7 | Later run after P4/P5: delete blocked | F1 then F2 |
| P8 | Later run after P4/P5: delete timed out | F1 then F3 |
| P9 | Later run after P4/P5: sweep failed again | F1 kept |
| P10 | Refused run after P4/P5 | F1 then F4 |
| P10b | Refused run after P2/P3/P3x | F2, F3 or F5, then F4 |
| P10c | Refused run after P7/P8 | F1, F2 or F3, then F4 |
| P11a | New document after P4/P5 (learner reloads by hand), on a challenge page or the site root | F6 |
| P11b | New document after the reload exit from P2/P3/P3x/P7/P8 (lands on the site root) | F6 |
| P11r | Refused run in P11a/P11b | F6 then F4 |
| P12 | First run refused | F4 with no earlier state |
| P13 | Later run after P2/P3: delete fails again | F2 or F3 kept |
| P14 | Later run after P2/P3: delete resolves, sweep fails | at least one clearable `localStorage` key; release F2, then F1 |
| P15 | Any run succeeds | No fault; marker written; reload to the site root (unchanged) |

## Faults (seam S2)

| ID | Fault | Injected as |
|---|---|---|
| F1 | Sweep throws | `localStorage.removeItem` on the `localStorage` instance throws |
| F2 | Blocked delete | A native blocking connection held open by the test |
| F3 | Delete that never settles and fires no `blocked` | `indexedDB.deleteDatabase` replaced by one returning an `IDBRequest` instance (from fake-indexeddb) that fires nothing |
| F4 | Start record not durable | `sessionStorage.setItem` throws |
| F5 | Delete rejected otherwise | `indexedDB.deleteDatabase` replaced by one returning an `IDBRequest` instance that fires `error` |
| F6 | New document | Modules reset and re-imported with `sessionStorage`, `localStorage` and the database kept |

Every fault except F2 and F6 is removed in a `finally` immediately after the press it is meant to
affect. F2 lasts until the test closes its handle.

Database reads allowed for preconditions: `indexedDB.databases()`; reopening the database only while
no F2 handle is held, closing it immediately after the read. A database with no object stores counts as
holding no learner rows.

Timing: the delete bound is real time (5 s). Tests either raise the per-test timeout above the bound,
or fake only `setTimeout` and `clearTimeout`; they never fake `setImmediate` or microtasks, which
fake-indexeddb schedules on.

## Matrix: gate state fields

| Row | State | Field | Boundary | Expected | AC |
|---|---|---|---|---|---|
| T1 | P4, P5, P9, P14 | `databaseDeleted` | delete resolves | becomes true | AC-1 |
| T2 | P6–P8, P10, P10c | `databaseDeleted` | later run fails or is refused | stays true | AC-1 |
| T3 | P11a, P11b | `databaseDeleted` | new document | false | AC-1 |
| T4 | all | `storedWorkGone` | tracked code and tests | `git grep storedWorkGone -- .vitepress tests` finds nothing | AC-1 |
| T5 | P2, P7, P13 | `clearFailurePhase` | delete blocked | `'delete'` | AC-2 |
| T6 | P3, P8, P13 | `clearFailurePhase` | delete timed out | `'delete'` | AC-2 |
| T6x | P3x | `clearFailurePhase` | delete rejected otherwise | `'delete'` | AC-2 |
| T7 | P4, P5, P9, P14 | `clearFailurePhase` | sweep throws | `'sweep'` | AC-2 |
| T8 | P1, P6 | `clearFailurePhase` | run starts | `null` | AC-2 |
| T9 | P10, P10b, P10c, P11r, P12 | `clearFailurePhase` | run refused | unchanged from before the press | AC-2 |
| T10 | P7 | `clearFailurePhase` | later started run fails differently | replaced (`'sweep'` → `'delete'`) | AC-2 |
| T10a | P10, P10b, P10c, P11r | `clearStarted` | run refused with earlier state | stays true | AC-2 |
| T10b | P12 | `clearStarted` | run refused, no earlier state | false (unchanged) | AC-2 |
| T10d | P10, P10b, P10c, P11r | `clearRefused` | run refused with earlier state | true | AC-2 |
| T10e | P1, P6, P12, new document | `clearRefused` | run starts, first run refused, or new document | false | AC-2 |
| T10f | P10, P10b, P10c | error | run refused with earlier state | unchanged (the earlier run's message stays) | AC-2 |
| T10g | P12 | error | first run refused | the not-started sentinel (unchanged) | AC-2 |
| T10c | P1, P6 | press while in flight | press | ignored; no field changes | AC-2 |

## Matrix: gate operations

| Row | State | Operation | Boundary | Expected | AC |
|---|---|---|---|---|---|
| T11 | P0, P12 | continue | neither flag | accepted: marker written, decision `kept` (unchanged) | AC-3 |
| T11a | every state except P0, P12 | continue | `databaseDeleted` or `clearStarted` | refused; no marker | AC-3 |
| T12 | P4, P5, P9, P10, P14 | dismiss | error present, phase `'sweep'` | accepted: gate closes, decision `dismissed`, no marker | AC-3 |
| T13 | P1–P3x, P6–P8, P10b, P10c, P11a, P11b, P11r, P12, P13 | dismiss | phase not `'sweep'` or no error | refused; gate stays | AC-3 |
| T15 | P7 | later run | after a sweep failure | the database delete runs again: with F1 and F2 both in place, the run ends with phase `'delete'`, and the note draft is still in `localStorage` | AC-3 |
| T16 | P1–P14 | progress access | `databaseDeleted` or `clearStarted`, or undecided | denied (unchanged) | AC-3 |
| T16a | P4, P5 then dismiss | progress access | decision `dismissed` | denied (unchanged) | AC-3 |

## Matrix: what the gate shows

`—` means absent. Bodies and reports use the keys of the copy table; `retry hint` is
`clear_retry_not_started_hint`.

| Row | State | Body | Report | Raw error | Continue | Reload | Dismiss | AC |
|---|---|---|---|---|---|---|---|---|
| T17 | P0 | `body` | — | — | shown | — | — | AC-8 |
| T18 | P1 | `body_unconfirmed` | — | — | — | — | — | AC-8 |
| T19 | P2 | `body_unconfirmed` | `clear_unconfirmed` + new hint | shown | — | shown | — | AC-4, AC-5, AC-6 |
| T20 | P3, P3x | `body_unconfirmed` | `clear_unconfirmed` + new hint | shown | — | shown | — | AC-4, AC-5, AC-6 |
| T21 | P4 | `body_cleared` (new) | `sweep_failed` + hint (new) | shown | — | — | shown | AC-4, AC-5, AC-6 |
| T22 | P5, P9, P14 | `body_cleared` (new) | `sweep_failed` + hint (new) | shown | — | — | shown | AC-4, AC-5, AC-6 |
| T23 | P6 | `body_unconfirmed` | — | — | — | — | — | AC-4 |
| T24 | P7 | `body_unconfirmed` | `clear_unconfirmed` + new hint | shown | — | shown | — | AC-4, AC-5, AC-6 |
| T25 | P8, P13 | `body_unconfirmed` | `clear_unconfirmed` + new hint | shown | — | shown | — | AC-4, AC-5, AC-6 |
| T26 | P10 | `body_cleared` (new) | `sweep_failed` + hint (new), then retry hint | shown | — | — | shown | AC-4, AC-5, AC-6 |
| T27 | P10b, P10c | `body_unconfirmed` | `clear_unconfirmed` + new hint, then retry hint | shown | — | shown | — | AC-4, AC-5, AC-6 |
| T28 | P11a, P11b | `body_unconfirmed` | — | — | — | — | — | AC-8 |
| T28r | P11r | `body_unconfirmed` | retry hint only | — | — | shown | — | AC-4, AC-5, AC-6 |
| T29 | P12 | `body` | `clear_not_started` + `clear_not_started_hint` | — | shown | — | — | AC-8 |
| T29p | P10b, P10c, P11r on the site root | gate presented; every other column as T27, T28r | as T27, T28r | as T27, T28r | — | as T27, T28r | — | AC-4, AC-5, AC-6 |
| T29s | P15 | gate closes; page loads the site root | — | — | — | — | — | AC-8 |

Clear is shown in every row (a press in flight is ignored; T10c).

## Matrix: truth of what is shown (seam S2, both locales)

Every S2 test, including those that cover T17–T29s, compares each sentence with a literal string written
in the test, by exact equality after trimming the text of the element that holds that sentence. Expected
text is never imported from the message files. Each truth row first asserts its preconditions.

| Row | State | Precondition asserted before the strings | Expected on screen | AC |
|---|---|---|---|---|
| T30 | P4 | An initialization-only row seeded before the run is gone when the database is reopened (then closed); the note draft key is still in `localStorage` | literal new `body_cleared`, `sweep_failed`, `sweep_failed_hint` | AC-7 |
| T31 | P5 | Learner rows existed before the run; none when the database is reopened (then closed); a clearable key is still in `localStorage` | same as T30 | AC-7 |
| T32 | P7 | The test's native handle received `versionchange`; the raw error line contains "another tab still has it open"; after the test closes its handle, `indexedDB.databases()` no longer lists the database | literal `body_unconfirmed`, `clear_unconfirmed`, new `clear_unconfirmed_hint`; no `sweep_failed_hint` | AC-7 |
| T33 | P3, P8 | No native handle is held; the raw error line contains "within the time limit" | literal `body_unconfirmed`, `clear_unconfirmed`, new `clear_unconfirmed_hint` | AC-7 |
| T33x | P3x | The raw error line carries the injected error | literal `body_unconfirmed`, `clear_unconfirmed`, new `clear_unconfirmed_hint` | AC-7 |
| T34 | P11a | Start record present in `sessionStorage`; reopening the database shows no learner rows | literal `body_unconfirmed` | AC-7 |
| T35 | P10 | `indexedDB.databases()` unchanged across the press; the replaced delete, if any, was not called | literal new `body_cleared`, `sweep_failed`, `sweep_failed_hint`, then retry hint; no `clear_not_started` | AC-7 |
| T35b | P10b, P10c | as T35; the raw error line is the earlier run's | literal `body_unconfirmed`, `clear_unconfirmed`, new `clear_unconfirmed_hint`, then retry hint; no `clear_not_started` | AC-7 |
| T35r | P11r | as T35 | literal `body_unconfirmed`, retry hint; no `clear_not_started` | AC-7 |
| T35p | P2, P6, P9, P13, P14 | the state's defining fault is in place (as in States) | literal body and report of T19, T23, T22, T25 | AC-7 |
| T35c | all five changed strings | — | contain no banned term (CI-1) | AC-7 |

## Matrix: built site (seam S3, English locale, challenge page `door-is-open`)

Strings are compared with `toHaveText` on the element that holds each sentence, never `toContainText`.
F1 is injected by patching `Storage.prototype.removeItem` with a `this === localStorage` guard, because
assigning on the instance stores an item instead.

| Row | State | Setup | Expected | AC |
|---|---|---|---|---|
| T36 | P4 | Init script plants a note draft and installs F1 | literal en `body_cleared`, `sweep_failed`, `sweep_failed_hint`; dismiss shown; continue and reload absent | AC-9 |
| T37 | P7 | As T36; then a second page in the same context goes to the site root and opens a native blocking connection by `page.evaluate`; clear pressed again; the test waits out the bound | raw error line contains "another tab still has it open"; literal en `body_unconfirmed`, `clear_unconfirmed`, new hint; reload shown; dismiss and continue absent | AC-10 |

## Matrix: artefacts outside the running code

Retired claims, used by T38 and T39: (1) any sentence saying the learner's (saved) work is gone or was
deleted; (2) that a later run retries only the half that failed, or throws at the sweep; (3) that a
refused run always keeps continue; (4) that the flag outranks `clearStarted` or alone decides the
report; (5) that dismiss is the conjunction of an error and a resolved delete.

| Row | Artefact | Expected | AC |
|---|---|---|---|
| T38 | Tests (at `72327e2`): `SessionGate.test.ts` 11-14, 36-55 (mock gains `clearFailurePhase` and `clearRefused`), 72-82 (reset), 113-140, 151-156, 165, 221-240, 251-270, 286-327, 456-463; `useSessionGate.test.ts` 454-470, 472, 484, 529, 551-552, 570-573, 612-618; `unconfirmed-clear-outcome.test.ts` 171, 183-184 | each location either asserts the behaviour of a named T row or is deleted because its state is unreachable with the real composable; none states a retired claim | AC-11 |
| T39 | Comments (at `72327e2`): `useSessionGate.ts` 44-49, 96-106, 141-144, 294-309, 378-383, 398-404, 418-433, 473-477, 487-501; `SessionGate.vue` 14-19, 80-85, 122-135, 148-158, 185-189, 205-211, 217-222 | none states a retired claim; each that states a selection rule states the rule of this file | AC-12 |
| T40 | `OPEN-QUESTIONS.md` OQ-003 | stays `open`; its entry lists exactly the keys and states that S2 tests compare by literal equality under this spec | AC-13 |
| T41 | `OPEN-QUESTIONS.md` new entry: in-memory write-back | the attack session held in memory can be saved again without a gate check after a sweep failure and between the marker and the reload; quotes `useChallengePersistence.ts:409-415` (no gate check on save) and `useSessionGate.ts:523-539` (no reload after a sweep failure; marker before reload); revisit when the session gate's write paths change | AC-13 |
| T42 | `OPEN-QUESTIONS.md` OQ-001 | records that its revisit condition (a change to `clearEverything`) was met, that the in-flight withdrawal it describes still holds under this spec (T11a, T13), and updates its line references | AC-13 |
| T43 | `CONTEXT.md` *site-wide clear* | the definition excludes the preferences the key declaration keeps; the 新造詞 declaration is removed in the same change that first ships 全站清除 in an interface string, with the glossary test green | AC-14 |
| T44 | `OPEN-QUESTIONS.md` new entry: fixed gate sentences presupposing saved work | records CI-2's two unbacked paths with their line references; revisit when the gate's fixed copy is rewritten | AC-13 |

## Round 1 resolution

| Finding | Resolved by |
|---|---|
| C-1, R-1, R-2, R-3, C-2, C-4, V-6, K-5 | A1: refused run keeps earlier state; T9, T10a, T10b; P10b, P10c, P11r; T26–T28r, T29p |
| V-3, K-2, C-6, R-12 | A2: CI-1 narrowed and mechanical; CI-2 |
| R-4, R-5, K-11, R-6 | A3: copy table |
| V-1, C-12, C-14, R-15 | Faults F1–F6; per-state fault column |
| V-2 | Truth matrix asserts literal strings |
| V-4, R-8 | Native blocking connection (glossary, F2, T37) |
| V-5, V-16 | Precondition column; database read by reopening its stores |
| V-7, K-3, K-4, K-6, K-7, K-8, K-9, C-7, C-8, V-8, V-15 | T4, T38, T39 with locations |
| V-9 | T15 restated as observable |
| V-10 | Timing note under Faults |
| V-11, C-10 | S3 locale and page fixed; T29p presentation rows |
| V-12 | AC-8 anchored to `72327e2` |
| V-13, C-13, K-13, K-14 | T40, T42 |
| V-14 | Spec no longer requires the term in tests and comments |
| K-1 | *clear run* replaces *attempt* |
| K-10 | T43 |
| K-12, C-5, R-7 | *other* rejection, P3x, T6x, T33x; the reload loop on repeated other rejections is out of scope |
| K-15 | *learner rows* defined |
| K-16 | T41 quotes evidence inline |
| C-3 | P11a, P11b |
| C-9, R-9 | Report rule ends in a catch-all to the unconfirmed report |
| C-11 | P15, T10c |
| C-15 | T11, T11a, T13, T16, T16a |
| R-10 | `clearFailurePhase` is module-level |
| R-11 | Accepted: on the pages that reach P4 the database exists (initialization opens it); recorded, no change |
| R-13, R-14 | Accepted as existing behaviour; recorded, no change |

## Round 2 resolution

| Finding | Resolved by |
|---|---|
| R-1, R-2, R-3, R-4 | A4: refusal notice `clearRefused`; T10d–T10g; T26, T27, T28r; T35, T35b, T35r |
| K-3, K-10 | A5: CI-2 premise corrected, `title` added, T44 |
| C-1, V-12 | T40 narrowed to literal comparisons; every S2 test compares literals; T35p adds truth rows |
| C-2, K-2, K-4, V-6, K-6 (comments) | T39 locations; retired claims enumerated |
| C-3, K-5, V-5, V-7 | T38 locations corrected; per-location criterion and deletion rule |
| V-1 | Exact equality (S2) and `toHaveText` (S3) |
| V-2, V-4, R-8 | Allowed database reads; T30 seeded row; T32 `versionchange` and raw error preconditions |
| V-3 | F3 and F5 return `IDBRequest` instances; T33, T33x raw error preconditions |
| K-1 | T43 removes the 新造詞 declaration with the first interface use |
| K-6, K-7, C-11 | `CONTEXT.md` scope wording made conceptual in both entries |
| K-8, K-9, R-6, R-11 | Copy: retry hint names the site-wide clear; "then reload"; 項目 |
| C-4 | P5, P14 setup |
| V-8 | T4 uses `git grep` |
| V-9 | Fault lifetime note |
| V-14 | S3 injection note |
| R-9 | T37 second page and raw error precondition |
| C-7, V-15 | T10a includes P10; T10d–T10g |
| C-8, K-11 | Spec prose aligned with the selection rules |
| Other round-2 P2 findings | Carried with the tickets as recorded in `review/round-2.md` |

