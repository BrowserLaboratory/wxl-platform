# Troubleshooting

This is the complete list of the platform's known limitations. Every other page links here instead of repeating them.

| What you see | Section |
|---|---|
| Run says `Loading…` and will not click after Stop | [Run stays unavailable after Stop](#run-loading-after-stop) |
| Output is still there after Stop, ending in `(stopped)` | [Output printed before Stop is kept](#output-kept-after-stop) |
| A loop never ends and Stop is the only control left | [A run that never ends does not freeze the tab](#infinite-loop) |
| The whole Code panel is covered; the gear and History do nothing | [The panel is covered and the toolbar is unclickable](#overlay-blocks-toolbar) |
| `Ctrl+Enter` does nothing on a Mac | [Ctrl+Enter does not run on macOS](#mac-shortcut) |
| A correct flag comes back as `Incorrect flag. Try again.` | [A correct flag is rejected while the runtime loads](#flag-rejected-while-loading) |
| The success line and export buttons disappear after a reload | [The success message vanishes after a reload](#solved-banner-gone) |
| An exported attack log is missing the session you solved in | [Returning to a solved challenge starts a new attack log](#attack-log-overwritten) |
| An orange warning says this session is not being recorded | [A second tab on this site blocks the tool database](#second-tab-blocks-database) |
| Whether a `requests` login carries across requests | [Cookies and `Set-Cookie` in `requests`](#requests-cookies) |
| The Network panel says `No requests recorded yet` | [The Network panel stays empty](#empty-network-panel) |
| The output area says `(no output)` | [A script printed nothing](#no-output) |
| The first Code tab click takes a long time; nothing works offline | [First visit downloads the Python runtime](#first-visit-download) |
| A banner says the challenge runtime was restarted | [The challenge runtime was restarted](#runtime-restarted) |
| Everything resets when you come back to a challenge | [Leaving the challenge page shuts the runtime down](#leaving-the-page) |
| The Repeater and the Network panel show different headers | [The Repeater looks out of sync with Network](#repeater-vs-network) |
| Panel text stays English with the interface set to Chinese | [Panel text and tab names stay English](#hardcoded-english) |

## Code panel

### Run stays unavailable after Stop {#run-loading-after-stop}

**What you see.** Pressing `■ Stop` makes the Stop button disappear and turns Run into `Loading…`, disabled. Hovering Run shows `Waiting for runtime to initialize…` — the same tooltip you get before the environment has ever loaded.

**Why.** Stop terminates the entire Python worker and immediately starts building a replacement. The call behind Stop does not finish until that replacement worker has warmed up, and Run is held disabled for the whole interval.

**What to do.**

1. Wait for the button to read `▶ Run` again.
2. Re-run the setup part of your script. The replacement is a clean environment: variables you defined, modules you imported, and files you wrote into the virtual filesystem are all gone.

As long as you have not pressed Stop, consecutive runs in the same panel share one global namespace, so variables from the previous run are still available.

### Output printed before Stop is kept {#output-kept-after-stop}

**What you see.** Every line printed before you pressed Stop is still in the output area, with `(stopped)` appended as the last line. The run is not treated as an error — its History entry carries no `⚠` marker.

**Why.** Output is streamed. Each chunk of stdout is appended to the output area as it arrives, rather than buffered until the program ends.

**What to do.**

- To clear the output, press Run — each run empties the output area first. Stop cannot be used for this, because Stop only exists while a run is in flight.
- An interrupted run still leaves a History entry. Interrupted runs and failed runs are recorded exactly like successful ones.
- While output is arriving you cannot scroll back: every new chunk pins the scroll position to the bottom. Read earlier output after the run has ended.

### A run that never ends does not freeze the tab {#infinite-loop}

**What you see.** A loop with no exit keeps Run on `Running…` and `■ Stop` visible, but the page itself stays responsive. You can switch tool tabs, browse in the Browser panel, and edit notes while it runs.

**Why.** The Python interpreter runs inside a Web Worker, not on the page's main thread, so the loop blocks the worker's event loop and nothing else. The same isolation is why a cancellation flag can never reach your loop — nothing inside the worker gets the chance to observe one.

**What to do.** Press `■ Stop`. Terminating the worker is the only way to end a run in flight. Then wait out the restart described in [Run stays unavailable after Stop](#run-loading-after-stop).

The platform does not cut your code off for taking too long: enumeration and brute forcing are treated as normal solving paths, and a run continues until you stop it. The one exception is a six-hour ceiling measured from the moment you press Run. It is a wall clock, not an idle timer, so a loop that prints progress the entire time is abandoned at six hours just the same, and the output area shows `the runner stopped responding`.

### The panel is covered and the toolbar is unclickable {#overlay-blocks-toolbar}

**What you see.** A translucent layer covers the whole Code panel, including the toolbar, so the gear (editor settings) and the History dropdown cannot be clicked.

**Why.** The overlay is positioned over the entire panel and does not let clicks through. Three different conditions raise it, and the text tells you which:

| Overlay text | What is not ready |
|---|---|
| `Loading runtime…` | The challenge runtime or the Service Worker. Nothing to do with Python — the challenge side has not come up yet. |
| `Loading Python environment…` | Pyodide for this panel is still downloading or initialising. |
| `Python environment failed to load:` followed by a reason | Initialisation failed. The reason text is shown after the colon. |

**What to do.** For the first two, wait — the overlay lifts by itself and the toolbar becomes usable again. For the third, reload the page; if initialisation does not complete within 60 seconds it is declared a failure rather than spinning forever, so a failure message means the attempt is over, not still in progress.

### Ctrl+Enter does not run on macOS {#mac-shortcut}

**What you see.** The toolbar hint next to Run reads `Ctrl+Enter` and the Run tooltip says `Run (Ctrl+Enter)`, but pressing `Ctrl+Enter` on a Mac does nothing.

**Why.** The editor binds `Cmd-Enter` on macOS. The hint and the tooltip are fixed English strings that do not adapt to the platform.

**What to do.** Use `Cmd+Enter`, or click Run.

The keyboard shortcut also has no guard against a run already in progress, while the Run button does. Firing the shortcut during a run clears the output area, prints `Error: a run is already running in this panel`, makes the Stop button disappear, and re-enables Run — while the first run is still going inside the worker. Use the shortcut only when the button reads `▶ Run`; if you have lost the Stop button this way, reload the page.

### A script printed nothing {#no-output}

**What you see.** `(no output)` in the output area after the run finishes.

**Why.** The run completed without writing anything to standard output. Failures are not silent: an exception appends `Error:` and the message after whatever had already been printed, and previously printed lines are kept.

**What to do.** Add `print()` calls for the values you want to inspect. A script that only builds values without printing them has nothing to show.

## Flag submission

### Verification is unavailable until the runtime is ready {#flag-rejected-while-loading}

Unable to verify is distinct from an incorrect flag. Wait for the green runtime indicator and retry. Flag submission is disabled while the keep/clear decision or another submission is pending.

### The success message vanishes after a reload {#solved-banner-gone}

The success message belongs to the current page. Stored completion is separate and appears after accepting the stored work. A failed progress read offers retry; it is not the same state as the current submission result.

### Returning to a solved challenge starts a new attack log {#attack-log-overwritten}

The old session is retained rather than overwritten. The challenge page lists every attempt stored for that challenge; choose one and the export downloads that attempt, and with none chosen it downloads the attempt in progress. One export writes one attempt, never a collection of them. The latest unsolved session resumes only when eligible.

## Storage

### An old tab can block a database upgrade {#second-tab-blocks-database}

A tab using an older database may block its upgrade. An open timeout shows a storage warning; an old page may also fail to write after the database has already been upgraded.

Download any available attack log and separately preserve unsaved text before closing the other site tabs and reloading. A successful download does not prove database recovery or recover drafts that could not be read. Do not clear site data as a routine troubleshooting step.

If only progress reports a read error, retry that read first. It does not mean zero completion or deleted data. See the [workshop guide](./workshop) for shared-computer steps.

## Python `requests`

### Cookies and `Set-Cookie` in `requests` {#requests-cookies}

**What you see.** A `requests.Session()` does carry a login across requests: the `Set-Cookie` from the login response is stored in the session's cookie jar and sent back automatically on later requests. What does not work is reading the cookies off the response headers. When one response sets several cookies, `response.headers['set-cookie']` holds a single string with the values joined by `, `, and a cookie's own `Expires` attribute contains a comma, so that string cannot be split back into the individual cookies.

**What to do.** Read `session.cookies` when you need the cookies one at a time. Do not parse the joined header.

Because every request goes through a bridge, the transport layer under `requests` is replaced. Four consequences follow:

| What you write | What actually happens |
|---|---|
| `stream=True`, `iter_content()`, `resp.raw.read()` | Reads nothing. `resp.raw` is a stand-in whose `read()` always returns empty bytes and which has no `stream()`. Take the body from `.content` or `.text`. |
| `timeout`, `verify`, `proxies`, `stream`, `cert` | Accepted and then ignored. Setting them changes nothing. |
| A URL pointing at an external site | The host is discarded; only the path and query string are used, so the request goes to this challenge's app. You cannot reach a real external site. |
| A call that the bridge cannot complete | Raises `ConnectionError` with a message starting `WXL dispatch bridge error:`. A challenge runtime that cannot be reached at all is different — see [The challenge runtime was restarted](#runtime-restarted). |

Response objects carry `status_code`, `headers`, `content` / `text`, `url`, `request`, and `raw`, and `.text` is always decoded as UTF-8. Calls are synchronous — no `await`.

**Logins made in the Browser panel are a separate matter.** The Browser panel keeps its own cookie jar, and it does not parse the format the platform now uses to carry `Set-Cookie`. What lands in that jar is a meaningless string cut out of the carrier, and the panel does send it back out — you can see it in the request headers in the Network panel. The challenge does not recognise it, so on Python and PHP challenges a login performed in the Browser panel does not carry over, and nothing reports an error at any point. Use the Code panel with `requests.Session()` when you need a login to persist.

## Network and traffic

### The Network panel stays empty {#empty-network-panel}

**What you see.** `No requests recorded yet` in the middle of the panel.

**Why, in the order worth checking.**

- The Network panel is not gated on readiness. It is clickable while the rest of the challenge is still loading, so an empty panel at that point only means nothing has been sent yet.
- Requests sent by `requests` from the Code panel are recorded, and so are Browser panel navigations.
- Back and Forward in the Browser panel replay a stored view and send no request, so they add no rows.
- The log lives only on the current challenge page instance. Navigating away — including switching locale — empties it. See [Leaving the challenge page shuts the runtime down](#leaving-the-page).
- `Clear` empties the log and restarts the numbering at 1, so a row `#1` is not necessarily the first request of the visit.

### The Repeater looks out of sync with Network {#repeater-vs-network}

**What you see.** Two things that look like faults and are not:

- The same exchange shows a restored `Set-Cookie` header in the Network panel's Response tab, while the Repeater's response area shows lower-cased header names and an `x-wxlsh-set-cookie` header holding a comma-separated base64 string. It is one response rendered by two different views.
- Pressing **Send to Repeater** twice on the same row switches to the Repeater tab but leaves the editor content untouched, which looks like the button stopped working. The injected value is identical to the one already there, and only a changed value replaces the editor content.

**What to do.** Read `Set-Cookie` from the Network panel's Response tab. To force a re-injection of a row you have already edited in the Repeater, send a different row first, then send the one you want.

## Runtime lifecycle

### First visit downloads the Python runtime {#first-visit-download}

**What you see.** The first time you click the Code tab, the panel sits under `Loading Python environment…` for a while. Opening the challenge page itself is quick; the wait starts at the Code tab.

**Why.** The Python environment is Pyodide v0.29.3, fetched from the public jsDelivr CDN at `https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js` — tens of megabytes. It is deliberately not downloaded when the challenge page opens, only on the first click of the Code tab. Separately, each challenge page downloads that challenge's own `runtime.wasm`, which holds the challenge's code and files.

**Offline use does not work.** Because Pyodide comes from an external CDN, a Python challenge cannot start with no internet access. Older versions of this documentation claimed the platform runs offline; that is wrong. The Service Worker that intercepts challenge URLs does no offline caching of its own either.

**What to do.** Be online whenever you work on a Python challenge. Neither the platform nor its Service Worker keeps a copy for offline use, so a later session may or may not be served from your browser's own HTTP cache — do not rely on it. Initialisation that does not complete is reported through the overlay — see [The panel is covered and the toolbar is unclickable](#overlay-blocks-toolbar).

### The challenge runtime was restarted {#runtime-restarted}

**What you see.** A dismissible English banner near the top of the challenge page:

```
The challenge runtime was restarted after a request ran too long.
Any login or uploaded files from this challenge are gone.
```

**Why.** The challenge app has a ten-second ceiling on a single HTTP request. A request that exceeds it comes back as status `508` with the body `{"error": "challenge runtime execution exceeded the time limit"}`, and the runtime is rebuilt. The ceiling applies to the challenge app only — it does not limit your own code in the Code panel.

**What to do.** Log in again and re-upload anything the challenge needed. When scripting, read a `508` as "the challenge app hung", not as your script failing. A different symptom, status `502` with the body `{"error": "the challenge runtime could not be reached"}`, means the challenge runtime is not reachable at all; it arrives as a normal response rather than an exception, so check `status_code` instead of relying on `requests` to raise.

### Leaving the challenge page shuts the runtime down {#leaving-the-page}

**What you see.** You navigate away from a challenge and come back to find everything starting over: the runtime reloads, the Browser panel login is gone, and the Network panel is empty.

**Why.** Leaving the challenge page destroys the challenge runtime, and the traffic log exists only on that page instance. Switching locale counts as leaving: the locale switcher navigates to the other locale's URL, which is a full page change.

**What to do.** Work through a challenge in one visit where you can, and export the attack log before navigating away. Saved notes and your code draft are stored in the database and come back; the traffic log and the challenge's own state do not. Note text you have typed but not saved is lost when the notes panel closes.

## Interface language

### Panel text and tab names stay English {#hardcoded-english}

**What you see.** With the interface set to Chinese, large parts of the challenge experience remain English.

| Where | Text that stays English |
|---|---|
| Challenge page tool tabs | `Browser`, `Network`, `Repeater`, `Code` |
| Challenge list header | `Challenges`, `Choose a challenge to begin` |
| Difficulty filter | `Easy`, `Medium`, `Hard`, `Mystery` |
| Difficulty badges | the raw frontmatter value — `easy`, `medium`, `hard`, `mystery` |
| Network panel | all of it, starting with `Network Traffic` |
| Code panel | `▶ Run`, `Running…`, `Loading…`, `■ Stop`, `History…`, `(stopped)`, `(no output)` |

**Why.** These strings are written into the components rather than into the translation files. Flag submission and storage feedback have English and Traditional Chinese translations.

**What to do.** Nothing — switching locale will not change any of it.

Two related differences between the two languages are worth knowing:

- The Chinese and English challenge lists are built from separate content directories, so the two lists can hold different challenges.
- The `#NNN` number in front of a challenge is its position in load order, not an identifier chosen by the author. The two lists number independently, and the numbers shift when challenges are added or their folders renamed.
