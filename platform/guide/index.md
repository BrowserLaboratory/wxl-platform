# Getting Started

For workshops and shared computers, start with [start, save, and leave](./workshop).

## Platform overview

Web eXploitation Laboratory (WXL) is a web-security challenge platform for learners. A challenge, the tools you attack it with, and the check on your answer all run inside your own browser tab.

- Opening a challenge page downloads a `runtime.wasm` file for that challenge. The challenge application's code and files are packed inside it.
- The flag you submit is compared inside that in-browser WASM module. It is never sent to a server.
- Your notes, attack session records, Code drafts and which challenges you have completed are written to an IndexedDB database named `challenge-tools` in this browser only. Nothing is uploaded, and clearing the site's browser data destroys all of it with no way to recover.
- On arrival the site registers a Service Worker named `challenge-sw.js`. It is what lets the browser intercept challenge URLs. It only takes over hostnames of the form `challenge-<slug>.localhost`; every other request passes straight through, and it caches nothing for offline use.

## System requirements

| Requirement | Why it is needed |
|---|---|
| A browser that runs WebAssembly | Each challenge page fetches a `runtime.wasm` module and executes it in the tab. |
| Service Workers allowed for this site | The site registers `challenge-sw.js` on arrival. Without it, requests to `challenge-<slug>.localhost` are not intercepted. |
| A live network connection while you work | The Python environment is loaded from an external CDN at `https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js`. Fully offline, Python challenges do not run. The first load pulls down tens of megabytes. |
| Browser storage (IndexedDB) available | Attack logs, notes, Code drafts, and progress are stored locally. If a storage warning appears, preserve any available export and unsaved text before troubleshooting. |
| A desktop-width screen | The Browser panel's back, forward and reload buttons are only rendered at desktop widths; at phone widths the whole group is hidden and only the address bar and Go remain. |

The Service Worker registration and the Pyodide download are the two things that most often leave a panel stuck. If a panel will not respond, output never appears, or notes cannot be saved, go to [Troubleshooting](./troubleshooting).

## Quick start

### Step 1: Pick a challenge

1. Open the challenge list. Each row shows a zero-padded number such as `#003`, the title, a difficulty badge, a category badge and a date, with the description and tags on a second line.
2. Filter with the toolbar. The search box matches the title, description and tags only — typing a difficulty or a date matches nothing. Results refresh 300 ms after you stop typing.
3. The difficulty dropdown is a fixed set of four English options: Easy, Medium, Hard, Mystery. The category dropdown is built from the categories that actually occur in the list. Difficulty badges print the raw frontmatter string in lowercase, in English, in both interface languages.
4. The count on the right of the toolbar is how many challenges survive the current filter. The button at the top right switches between the default list view and a grid view.
5. Click a row to enter the challenge.

The `#NNN` number is a load-order index, not something the author assigns. Adding or renaming a challenge folder shifts the numbers, and the English and Chinese lists are numbered independently — do not use the number to refer to a challenge.

### Step 2: Work in the panels

1. The challenge page opens on the Browser tab. By default the tab strip holds four tabs: Browser, Network, Repeater and Code. The labels are hardcoded English in both interface languages.
2. A challenge author may restrict which tool tabs are offered, but the Browser tab is always kept and never disappears.
3. The Browser panel's address bar arrives prefilled with `https://challenge-<slug>.localhost/` for the challenge you are in. It is an ordinary editable text field: press Enter or click Go to navigate.
4. Watch the status light at the top right of the nav bar. A pulsing yellow dot means the runtime is still loading, a green dot means it is ready, and a red dot means it failed — hover the red dot to read the actual error message.
5. The Code tab's Python environment only starts downloading the first time you open that tab, not when the challenge page loads. Expect a wait on that first click.

### Step 3: Submit the flag

1. Wait for the runtime and finish the keep/clear choice, then paste the flag and submit it.
2. Submission is disabled while verification and saving are pending; both entry points share that state.
3. Correctness and saving are reported separately. If a correct answer was incompletely saved, preserve any available export first; resubmission counts as another attempt.
4. Unable to verify is distinct from an incorrect flag. Retry after the runtime is ready.
5. An available attack session can be exported before solving. The notes export entry appears after a correct answer. See [export options and limits](./notes#export).

Collapsing the description keeps a flag entry at the bottom. Stored completion appears after accepting the stored work; a failed progress read offers retry rather than claiming zero completion.

## Tool panel overview

| Panel | Where it lives | What it gives you |
|---|---|---|
| Code Editor | `Code` tab | A Python editor over an output pane, split 65 / 35 at first open with a draggable divider between them. Run and Stop buttons, a per-challenge execution history, and a settings popover for autocomplete, bracket auto-closing and font size. See [Python Code Editor](./python). |
| Browser | `Browser` tab | A prefilled, editable address bar over the rendered response, with back, forward and reload buttons at desktop widths. Back and forward replay stored screens and issue no new request. See [Browser panel](./browser). |
| Network Traffic | `Network` tab | A log headed `Network Traffic` with the current entry count beside it, five columns — `#`, `Method`, `URL`, `Status`, `Time` — and a `Clear` button. Requests from the Browser panel, the Repeater and the Code Editor all land in this one log; none of the three is excluded. See [Network and Repeater](./network). |
| Repeater | `Repeater` tab | A free-text `Raw HTTP Request` box, prefilled with a `GET /` request whose Host is `challenge-<slug>.localhost`, plus a Send button and a saved-snapshot sidebar. Expanding a row in the Network log offers `Send to Repeater`, which switches to this tab and overwrites whatever is in the box. See [Network and Repeater](./network). |
| Pentest Notes | Nav bar button, opens a panel | Per-challenge notes with a Markdown preview, a search box and a newest/oldest sort toggle. The button carries a count badge once the challenge has at least one note. Text in the editor is saved only when you press Save. See [Pentest Notes](./notes). |

The Network log lives in the page you are on. Navigating away or switching language empties it completely.
