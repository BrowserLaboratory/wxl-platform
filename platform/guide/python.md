# Code Panel

The Code panel is a Python 3 editor and runner built into the challenge page. It runs Pyodide (CPython compiled to WebAssembly) in a Web Worker, separate from the Python instance the challenge application itself runs on.

## Panel layout

| Region | What it holds |
|---|---|
| Editor pane | Where you type Python. Takes 65% of the panel height when the panel first opens. |
| Splitter | A drag handle between the two panes, tooltip `Drag to resize`. Drag it to change the split. |
| Output pane | Text written by your program while it runs. |
| Toolbar | The Run button, the Stop button (only while running), the `Ctrl+Enter` hint, the gear that opens editor settings, and the History dropdown. |

## Loading the Python environment

The Python environment starts downloading the first time you switch to the Code tab, not when you open the challenge page. The first switch therefore takes a while: Pyodide is fetched from a CDN on every load and pulls down tens of megabytes, so you need a working internet connection whenever you use this panel — see [Troubleshooting](./troubleshooting#first-visit-download).

While the environment is not usable, an overlay covers the panel:

| Overlay text | Meaning |
|---|---|
| `Loading Python environment…` | Pyodide is still downloading or initializing. |
| `Python environment failed to load:` plus a reason | Initialization gave up. The reason is appended to the message. |
| `Loading runtime…` | Unrelated to Python. The challenge runtime or the Service Worker is not ready, so the whole panel is blocked. |

The overlay is drawn over the entire panel, toolbar included, and it does not let clicks through. Until it clears, the gear and the History dropdown cannot be clicked either.

## Running code

The Run button is also the status indicator. It has three texts:

| Button text | Shown when | Clickable |
|---|---|---|
| `▶ Run` | The runner is attached, the challenge tools are ready, and nothing is running | Yes |
| `Running…` | A run is in progress | No |
| `Loading…` | The challenge tools are not ready, no Python runner is attached yet, or a restart after Stop is still in progress | No |

Hovering the button shows `Waiting for runtime to initialize…` while the runner is missing or the tools are not ready, and `Run (Ctrl+Enter)` once it is usable. During the restart after Stop the runner is detached, so the hover text is the waiting one — it matches the `Loading…` label.

### Keyboard shortcut

| Platform | Shortcut |
|---|---|
| Windows / Linux | `Ctrl + Enter` |
| macOS | `Cmd + Enter` |

The toolbar hint and the Run tooltip both say `Ctrl+Enter` on every platform. On macOS the key binding is `Cmd-Enter`, so pressing `Ctrl+Enter` there does nothing.

The `Ctrl+Enter` hint next to the Run button appears only while the environment is ready and nothing is running. It disappears during a run.

The keyboard shortcut is not blocked during a run, while the Run button is. Pressing it a second time while code is still running clears the output pane, prints `Error:` with `a run is already running in this panel` on the next line, and then resets the panel to the idle state — the Stop button disappears and Run becomes clickable again, while the earlier run is still going inside the worker. If you want to interrupt a run, use Stop.

## Stopping a run

The Stop button (`■ Stop`, tooltip `Stop the running code`) is rendered only while code is running. It is not visible at any other time, so it cannot be used to clear the output pane.

Pressing Stop destroys the whole Python worker. That is what makes it the only way out of a loop that never ends: your program's own cancellation checks are never reached, because the stuck event loop is the worker's.

What happens after Stop:

1. The output pane keeps everything printed so far and gets one more line, `(stopped)`. This is not treated as an error — the run does not get the error marker in History.
2. Run switches to `Loading…` and stays unclickable. The old worker is terminated and a replacement is started; Run only becomes clickable again once the replacement environment has finished loading.
3. The replacement is a fresh environment. Variables you defined, modules you imported, and files you wrote to the virtual filesystem are all gone. You have to run the setup part of your script again.

As long as you have not pressed Stop, consecutive runs in the same panel share one global namespace, so a variable defined by an earlier run is still there in the next one.

A run that was stopped, and a run that ended with an error, both still leave a History entry.

For what to do while Run stays unavailable, see [Troubleshooting](./troubleshooting).

## Reading the output

- Output is streamed. Lines appear while the program is running instead of all at once at the end, which is why everything printed before you press Stop is kept.
- Every new chunk of output scrolls the pane to the bottom. The scroll is unconditional, so scrolling up to re-read earlier output while the program is still running snaps you straight back down.
- Each run clears the output pane first. Only the current run's output is shown.
- A run that finished without printing anything shows `(no output)`.
- A run that raised an exception gets `Error:` and the exception message appended after whatever was already printed. Earlier output is not cleared.

Two messages come from the platform rather than from your code:

| Message | Cause |
|---|---|
| `a run is already running in this panel` | A second run was submitted while the first was still going. |
| `the runner stopped responding` | The run passed the platform's execution ceiling and was abandoned. |

Long runs are not cut off, and an endless loop does not freeze the tab — the one ceiling that does exist, and what to do about a loop with no exit, are in [Troubleshooting](./troubleshooting#infinite-loop).

## Editor settings

The gear on the toolbar opens the editor settings panel. It renders three controls and a reset:

| Control | Effect | Default |
|---|---|---|
| Autocomplete | Suggests module and symbol names while you type. | On |
| Auto-close brackets | Inserts the closing `(`, `[`, `{` for you. | On |
| Font size | Text size in the editor, adjustable from 10px to 24px in steps of 1px. | 13px |
| Reset to defaults | Puts all three back to the values above. | — |

**Quotes are never auto-closed.** Auto-close covers exactly the three bracket characters `(`, `[`, `{`. Single quotes, double quotes, and triple quotes are never paired for you, so a string you type by hand is never rewritten behind your back.

Turning *Auto-close brackets* off does not change that. It removes the bracket completion only; the rule that keeps quotes unpaired stays installed in both states.

Other behaviour worth knowing:

- Turning *Autocomplete* off removes the completion extension entirely — nothing pops up while you type any more, rather than popping up and doing nothing.
- Autocomplete offers a fixed, hand-written list of modules and symbols that ships with the platform. `requests` is the first entry in it.
- Picking a function from the completion list inserts the opening parenthesis and leaves the caret inside it. The closing one comes from auto-close, so with auto-close off you get only the opening parenthesis.
- The current font size is shown as a number plus `px` between the minus and plus buttons. At the minimum the minus button is greyed out and pressing it does nothing; the plus button behaves the same way at the maximum.
- Changes apply to the open document immediately. You do not have to reopen the panel, and your caret position and undo history are not thrown away.
- Settings are stored in the browser's `localStorage` under the key `wxl:editor-settings`. They survive a reload, and one set of settings is shared by every challenge rather than stored per challenge.
- `Escape` closes the panel, and so does clicking anywhere outside the panel and the gear.

## Drafts and run history

### Drafts

The editor contents are saved as a draft automatically. Reopening the same challenge restores the draft instead of the starter snippet. Each challenge keeps its own draft, keyed by the challenge slug, so switching challenges never shows you the previous challenge's code.

With no draft stored, the editor starts with a starter snippet — two comment lines plus `print("Hello, wxlsh!")`.

An empty editor is a draft too. If you clear the editor and come back, you get an empty editor, not the starter snippet back.

Drafts are written a short moment after you stop typing. Leaving the page flushes a pending write immediately, so typing something and navigating away straight afterwards does not lose it.

### History

The dropdown on the right of the toolbar reads `History…` when closed. Opening it lists this challenge's previous runs.

| Property | Behaviour |
|---|---|
| When empty | The dropdown is disabled until this challenge has at least one recorded run. |
| Entry label | `HH:MM:SS · summary of the first line of the code`, prefixed with `⚠ ` when that run ended with an error. |
| Summary length | 40 characters at most; longer first lines are cut to 39 characters and end with `…`. |
| Order | Newest first, not oldest first. |
| What gets recorded | Every run, including stopped runs and failed runs. |

Selecting an entry replaces the **entire** editor contents with that entry's code and puts the caret back at the start. There is no confirmation dialog. The replacement is an ordinary edit, so `Ctrl+Z` undoes it and gives you back what you had.

After a selection the dropdown snaps back to `History…`, which means the same entry can be picked twice in a row.

## Available modules

The panel's Pyodide ships the CPython standard library. The autocomplete list names the modules the platform expects you to reach for, and a site smoke test imports every one of them inside the panel's real runtime, so the list below is the one that is checked against the environment:

`requests`, `os`, `json`, `base64`, `urllib`, `re`, `hashlib`, `hmac`, `binascii`, `itertools`, `string`, `time`, `math`, `collections`, `functools`

Two things this list does not mean:

- Packages a challenge declares in its frontmatter are installed into the challenge's own runtime only. The Code panel's Pyodide installs `micropip` and `requests` and nothing else, so a package the challenge uses is not importable here.
- The panel's Pyodide is a second, independent instance with its own virtual filesystem, not shared with the challenge's. Reading a file from Python in this panel cannot reach the challenge's data.

### Installing a third-party package

`micropip` is already loaded in the panel's environment, so you can install pure-Python packages yourself:

```python
import micropip
await micropip.install("some-pure-python-package")
```

Packages with compiled extensions are not installable this way.

## requests

`requests` is the genuine upstream library, installed with `micropip` — not a hand-written stub. What the platform replaces is one function in the transport layer, `requests.adapters.HTTPAdapter.send`, which routes the request through the platform's dispatch bridge to the challenge application. Everything above the transport — `Session`, `Request`, redirect following, cookie jar extraction — is the library's own code, so `get`, `post`, `put`, `delete`, `Session`, auth helpers and the rest behave as documented upstream.

Calls are synchronous. You do not `await` them, even though the bridge underneath is asynchronous.

Every request sent from this panel is recorded in the traffic log and shows up in the Network panel alongside traffic from the other panels.

### The host name is ignored

Only the path and the query string of the URL you pass are used. The host is discarded, so every request goes to this challenge's application whatever domain you write. You cannot reach a real external site from here.

```python
import requests

# These two are the same request.
requests.get("http://target.local/api/items?page=2")
requests.get("http://anything-at-all/api/items?page=2")
```

### Sending requests

```python
import requests

# GET with a query string
r = requests.get("http://target.local/api/items", params={"page": "2"})
print(r.status_code)
print(r.url)      # the URL you passed, params appended - not where the request landed
print(r.text)

# GET with custom headers
r = requests.get("http://target.local/api/profile", headers={"X-Requested-With": "XMLHttpRequest"})
print(r.status_code, len(r.text))

# Form POST (application/x-www-form-urlencoded)
r = requests.post("http://target.local/api/session", data={"username": "alice", "password": "hunter2"})
print(r.status_code)

# JSON POST (application/json)
r = requests.post("http://target.local/api/items", json={"name": "widget", "qty": 3})
print(r.json())
```

### The response object

| Attribute | Type | Notes |
|---|---|---|
| `.status_code` | `int` | HTTP status code |
| `.text` | `str` | Body, always decoded as UTF-8 |
| `.content` | `bytes` | Body as bytes |
| `.json()` | `dict` / `list` | The body parsed as JSON |
| `.headers` | mapping | Response headers |
| `.url` | `str` | The URL you passed, host included - the request did not go to that host |
| `.request` | request object | The request that produced this response |
| `.raw` | stand-in object | Present, but a minimal stand-in — see below |

`.raw` exists only to carry the `Set-Cookie` headers. Its `read()` always returns empty bytes and it has no `stream()`, so anything that reads through `raw` or streams the body — `stream=True`, `iter_content()` — gets nothing. Read the body from `.text` or `.content`.

### Arguments that are accepted but ignored

`timeout`, `verify`, `proxies`, `stream` and `cert` are accepted by the call and then never used. Setting them has no effect at all.

### Cookies

A response's `Set-Cookie` headers are attached to the response, so a `requests.Session()` picks a login cookie up into its cookie jar and sends it on the following requests without you doing anything:

```python
import requests

s = requests.Session()
s.post("http://target.local/api/session", data={"username": "alice", "password": "hunter2"})

# The session cookie is now in the jar and goes out with this request.
print(s.get("http://target.local/api/profile").text)
```

When a response carries **several** `Set-Cookie` headers, `response.headers['set-cookie']` shows them joined into one string separated by `, `. That string cannot be split back apart, because a cookie's own `Expires` attribute contains a comma. To handle cookies one by one, read `session.cookies` instead of the header.

The Browser panel keeps a separate cookie jar, and it cannot decode the format used to carry cookies set by a Python or PHP challenge: what it stores is a meaningless string. That string does go out and is visible in the traffic log's request headers, but the challenge does not recognise it, so a login made there does not carry over and no error is reported. Details in [Troubleshooting](./troubleshooting).

### Errors from the bridge

| What you get | When |
|---|---|
| `ConnectionError` with a message starting `WXL dispatch bridge error:` | The bridge itself failed. This is an exception, not a response. |
| A response with status `502` and body `{"error": "the challenge runtime could not be reached"}` | The challenge runtime is unreachable. This is a normal response object, so `try`/`except` will not catch it. |
| A response with status `508` and body `{"error": "challenge runtime execution exceeded the time limit"}` | The challenge application spent more than ten seconds handling one request. This limit applies to the challenge side only, never to your own code in this panel. |

If a request that took too long forced the challenge runtime to restart, a banner appears above the panels saying the runtime was restarted and that any login or uploaded files from this challenge are gone.

## Known limitations

Behaviour that surprises people the first time — Run staying unavailable after Stop, output kept from an interrupted run, a second tab blocking the tool database, the first visit downloading the Python runtime — is collected in one place: [Troubleshooting](./troubleshooting).
