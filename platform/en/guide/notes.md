# Pentest Notes

Pentest Notes is a notebook bound to one challenge. Everything you write stays in your own browser.

## Opening the panel

The **Notes** button in the challenge page's top navigation bar is the only control that opens the panel. Below the `lg` breakpoint the button shows its pencil icon alone and the word is hidden.

The button carries a number badge with this challenge's note count. The badge is rendered only while that count is above zero, so a challenge you have not written anything for shows no badge at all rather than a `0`.

The open panel is headed **Pentest Notes**.

## Panel sizes

The panel header holds **Maximise** / **Restore**, **Minimise** and **Close**.

| Size | How you reach it | Layout | How you leave it |
|---|---|---|---|
| Standard | the size the panel opens at | fixed to the right edge — half the viewport wide on a wide screen, full width on a narrow one — with a dimmed backdrop over the rest of the page. The note list fills the panel; while you are editing, the editor takes the top half and the list keeps the bottom half | **Maximise**, **Minimise**, **Close**, or a click anywhere on the backdrop |
| Maximised | the **Maximise** button | full screen. On a wide screen the list holds the left 30% and the editor the right 70%; with nothing open for editing, the right side reads "Select a note to edit, or press + to add a new one." On a narrow screen you see one side at a time, and a back control leads from the editor back to the list | **Restore**, which returns you to Standard |
| Minimised | the **Minimise** button | the panel disappears and a floating button takes its place in the bottom-right corner of the page. On a wide screen that button shows the label and the same note count badge; on a narrow screen it is a bare circular icon | click the floating button |

Minimising unmounts the panel body, so it discards unsaved editor text exactly as closing does. Restoring reopens the editor on the same note, showing that note's last saved content.

## Writing a note

1. Press **+** (**New note**) in the header to start a new note, or the pencil button on an existing card to edit that one.
2. Type in the **Edit** tab. The **Preview** tab renders what you have typed as Markdown, with GFM enabled and a single newline treated as a line break. Both tab labels are fixed English and are not translated.
3. Press **Save**.

**Cancel** ends editing and keeps nothing you typed.

In Standard size the editor reads a note's content once, at the moment it opens. If you start editing note A and then click a second card's pencil button without saving, the editor still holds A's text — and **Save** then writes A's text over that second note. Pressing **+** in the same state creates a new note whose content is a copy of A. Finish or cancel one note before opening another. Maximised size is not affected.

Clicking a card does different things by size: in Maximised it opens that note in the editor straight away; in Standard it only selects the card.

## What counts as saved

**Only the Save button commits a note.** Typing is not saved as you go.

| What you do | The note in storage | The text in the editor |
|---|---|---|
| Press **Save** | written to the browser database; survives a reload and closing the tab | cleared, editing ends |
| Press **Cancel** | unchanged | discarded |
| Press **Close**, or click the backdrop | unchanged | discarded, with no confirmation |
| Press **Minimise** | unchanged | discarded |
| Reload or navigate away | unchanged | discarded |

Unsaved editor text is never written anywhere — the draft key the panel reads at start-up is only ever read and removed, never written — so it is gone the moment the editor unmounts, and there is no way to recover it.

Closing the panel resets the panel size back to Standard. Whatever you typed in the search box stays, so the list may still be filtered when you reopen it. Saved notes are untouched.

## Where notes are stored

- Notes live in the `challenge-tools` IndexedDB database in your own browser, in the `pentest-notes` store, alongside `attack-sessions`, `code-drafts` and `challenge-progress`. Nothing is uploaded to a server.
- Notes are per challenge. Opening a challenge loads only the notes tagged with that challenge's folder name, so notes from other challenges never appear.
- That key is the challenge folder name rather than the page URL, so the English and Traditional Chinese versions of the same challenge share one set of notes.

Three things remove notes:

- deleting a note in the panel — it goes immediately, with no confirmation step;
- clearing the browser's site data, which drops the whole database and cannot be undone;
- opening the site in a different browser or on a different device, where that database does not exist.

Notes sit in a separate store from the attack log, so re-entering a solved challenge does not touch them — but it does replace that challenge's attack log, see [Troubleshooting](./troubleshooting#attack-log-overwritten).

## The note list

Each card shows the first two non-blank lines of the note; a note with no content at all shows "(empty note)". Under that preview is the creation time, followed by "(edited)" on any note that has been saved a second time.

The edit and delete buttons on a card stay hidden until the pointer is over it. On a touch device, where there is no hover, they cannot be reached.

The list has two empty states: with no notes at all it reads "No notes yet. Press + to add one."; with notes present but none matching the search, it reads "No notes match your search."

## Searching

The search box at the top of the panel matches the note body only, and ignores case. Timestamps and the "(edited)" marker are not compared.

The box decides whether it is empty by trimming, but it matches with the untrimmed string. One stray leading or trailing space is matched literally, so a note only matches when its text contains that space in the same position — a trailing space typed after the last word of a note will not match.

## Sorting

The sort button toggles between newest-first and oldest-first, ordering by the time each note was created. Its tooltip states the current direction and the direction a click switches to.

## Deleting a note

Deleting removes the note from the list and from the database at once. The matching entry in the attack log stays where it is — that timeline is append-only — so the deleted text still appears in an exported attack log.

Editing behaves the opposite way: saving an edit rewrites the attack log entry in place and stamps it as updated, so only the newest version survives there.

## Exporting

Once the current attack session exists, Export Attack Log is available in the flag area, including before solving, after a wrong answer, or after a verification error. It remains available with the description collapsed. Export Pentest Notes still appears only after a correct submission in this page.

| Button | Produces | Filename |
|---|---|---|
| **Export Pentest Notes** | a Markdown file of every saved note for this challenge | `pentest-notes-<challenge-folder>-<YYYYMMDD>.md` |
| **Export Attack Log** | opens options for JSON or Markdown, full or thinned, and optional name/class | `attack-session-<challenge-folder>-<optional-class-name>-<YYYYMMDD-HHMMSS>-<mode>.json` (or `.md`) |

Unsolved attack logs omit the system prompt and retain events according to the selected mode and any readable stored draft. Solved logs include a prompt asking the reader to compare detours and unsuccessful attempts with the successful approach; a later wrong answer does not remove it. After a storage failure, the export can still carry events held in memory; an unreadable draft is omitted from the exported content.

Full retains all events. Thinned omits recognizable HTTP response bodies and panel-view events, retaining requests, code, notes, flag attempts, and drafts. Unknown or malformed carried events remain unchanged. Each file states the omission counts; exporting never filters the stored session.

Optional name and class are trimmed, stripped of control characters, and limited to forty Unicode code points each. They appear only in this download and its sanitized filename; closing the dialog discards them. Errors keep the dialog open for retry.

## Import

**Import Attack Log** sits in the attack session list, in the same block as flag submission. Choose a JSON file this site exported; the platform runs the integrity check the export file carries and, if it holds, stores that attempt as one more record for this challenge.

- **It always adds a record.** It never replaces or merges an existing one. Importing the same file twice gives two records.
- **It changes nothing else.** Challenge progress and the editor draft are untouched, even when the imported attempt was solved.
- **It takes only this challenge's files.** A file for another challenge is refused, naming both challenges; it is never stored under the challenge you have open.
- **Readable and re-exportable, not resumable.** An imported record appears in the list and can be chosen for export. New work is not appended to it; to carry on with the challenge, start a fresh attempt.
- **A passing check means one narrow thing.** It says the file's content matches the hashes inside it. It does not identify who produced the file, and it is not proof the file was never altered: an edit that recomputes the hashes is invisible to it.

The same list shows every attempt stored for this challenge, with when it started, whether it was solved, how many events it holds, and whether it was started in this browser or imported. Choose one and **Export Attack Log** downloads that attempt; with none chosen it downloads the attempt in progress. Until the stored-work question has been answered in this browser, the list shows no attempt and import is unavailable.

## Clearing

The attack session list carries **Clear this challenge's records**. It removes the records stored for **this challenge** and keeps **the attempt in progress** — that one is being written to, and removing it only gets it written back on the next recorded event.

Pressing it asks first, stating how many records will go. Once confirmed:

- **It cannot be undone.** This site has no server and no holding area; what goes is gone. Export anything you want to keep first.
- **Challenge progress is unaffected.** A solved challenge stays solved and the completed count on the challenge list does not drop. Clearing takes away the record of the work, not the result.
- **It leaves an activity trace** noting when it happened and how many records went, shown below the same list.

A trace notes only that records were removed here, with a count and a time. It does **not** keep what was removed — keeping it would make the removal false.

## Activity traces

All three acts that change which records a challenge holds leave a trace, listed together below the attack session list:

| Act | What the trace notes |
|---|---|
| Export | which attempt was written, full or thinned, and whether name/class were filled in (that they were, never what they said) |
| Import | the id this device gave the record, plus the source file's own id and export time |
| Clear | how many records went, and each one's start time and solved state |

**Traces travel with the export file.** Whoever receives a file can therefore see whether the record was worked through here or imported partway.

Two things to know:

- A file carries the traces from **before** that export. The trace describing the export itself is written after the file is built, so it is not inside it — a file cannot contain a record of itself and still check out against its own integrity check.
- Importing does **not** copy a file's traces into your browser. They are there to read; adopting them would let a hand-written file inject fabricated activity into your own records.

### If you are collecting these as work

Traces tell you what happened on that browser, but they are **not an audit trail**:

- Clearing all stored work on the device takes the traces with it. Working again and exporting then produces a file whose trace list is empty.
- Files in the older package format have no trace field at all.

So **an absence of traces does not show that a learner did nothing** — only that this file cannot speak to it. Treat it as one more thing you can ask about, not as a finding.

What a trace defends against is a removal made without thinking about it, not one made to hide something: **Delete it and start fresh** in the stored-work question deletes the whole local database, and the traces go with it. It is not an audit trail, and it is not a guarantee that nothing has been removed unmarked.

Both formats carry `schemaVersion: 1`, an event hash chain, and a SHA-256 checksum. These detect edits made without updating the hashes; they do not authenticate the learner or prevent deliberate recomputation. Markdown includes the complete package in a fenced JSON block, so its checksum covers the logical data rather than Markdown formatting. See the [public export format](../reference/attack-log-export-format.md).

The pentest-notes Markdown file opens with a level-1 heading pairing a fixed Traditional Chinese label with the challenge title; that label is not translated. Notes then sit under one level-2 heading per calendar day, each note introduced by a `#### HH:MM` heading and followed by a `---` rule.

The export always runs oldest to newest whatever the sort button is set to, and it reads the full note set rather than the filtered list, so text left in the search box never leaves notes out of the file.

One more thing about the attack log. A writeup an AI drafts from it is a study aid, not an assessment. Do not let it stand on its own as the basis for judging what a learner did, for two separate reasons.

The first is that the attack log carries text the learner wrote — their notes, the bodies of the requests they sent, the draft left in the editor. Any of it can say something aimed at whatever reads the file, and a model reading it may act on what it says. The system prompt in a solved-session export tells the reader to treat that content as data and to point out anything addressed to it, which helps in the ordinary case; it is not a guarantee and is not built as one.

The second reason holds even when nothing in the session was written to influence anyone. A model reading someone's submitted work is systematically readier to approve it than a person reading the same work — measurements of this on peer review put the gap wide enough that the two are not interchangeable. That tendency has nothing to do with what the learner wrote; it is there in an untouched session, so the first reason being absent does not make the second one go away.

The two buttons do not disappear together:

- After a reload, Export Attack Log appears once the current session is initialized. It exports that session, not the previously solved historical session. Export Pentest Notes appears after another correct submission.
- The tool database failing to open removes only **Export Attack Log**. **Export Pentest Notes** is not behind that condition, so it still appears after a correct submission — see [Troubleshooting](./troubleshooting#second-tab-blocks-database).

## If your work is not being recorded

An orange bar at the very top of the challenge page, headed "This session is not being recorded", means nothing you write is reaching storage — see [Troubleshooting](./troubleshooting) for the cause and what to do about it.
