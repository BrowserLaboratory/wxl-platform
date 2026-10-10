# Network Traffic & HTTP Repeater

Every string this panel renders is hard-coded English inside the component. Switching the site to Traditional Chinese does not translate the panel heading, the column labels, the buttons, or the empty-state text — the labels quoted on this page are what you see in either language.

## The Network Traffic panel

The panel toolbar holds the heading `Network Traffic` on the left. Next to it is the entry count, written `1 request` when exactly one request has been recorded and `N requests` for every other count, including zero.

On the right of the toolbar is a `Clear` button. It empties the whole log, collapses whatever detail row is currently expanded, and resets the sequence counter, so the next request recorded after a Clear is numbered `1` again rather than continuing from the previous highest number.

With nothing recorded, the middle of the panel reads `No requests recorded yet`.

The Network panel is the only tool panel that is not gated on runtime readiness. While the runtime and the Service Worker are still coming up, all four tab buttons stay clickable and every tab still switches — no tab button is ever disabled. What is disabled is the content: the Browser, Repeater, and Code panels are handed a disabled flag that greys out their controls. The Network panel is never handed that flag, so it stays fully operable — there is simply nothing in the log yet.

### Columns

The list has exactly five columns, in this order.

| Column | What it shows |
|---|---|
| `#` | Sequence number, starting at 1 and incrementing per recorded request |
| `Method` | The HTTP method of the request |
| `URL` | Path and query string only — the scheme and host are stripped. If the recorded URL cannot be parsed, the original string is shown unchanged |
| `Status` | The response status code, colour-coded |
| `Time` | Elapsed time for the request, an integer followed by `ms` |

There is no source column and no timestamp column. A timestamp is stored on each entry, but the table does not render it.

New entries are appended to the end of the list, so the table reads oldest at the top and newest at the bottom.

`Time` is measured around the whole dispatch and rounded to a whole millisecond. `0ms` is a normal reading for a fast local response, not a sign that something failed.

## Status code colouring

The `Status` column is coloured by numeric threshold only.

| Status code | Colour |
|---|---|
| 500 and above | Red |
| 400 to 499 | Orange |
| 300 to 399 | Yellow |
| Everything else, including 2xx and 1xx | Green |

The colour is a rendering rule and nothing more.

## What gets captured

The Browser panel, the Repeater, and the Code editor all dispatch through the same tracked layer, so requests from all three land in the same log. No enabled panel is excluded.

The table does not label which panel produced an entry. The originating panel is recorded, but only into the exportable attack session, not into the row you see. To line an entry up with the action that produced it, use its sequence number and its position in capture order.

The log rendered in the panel lives in the page's memory. There is no entry limit and no truncation — it grows until you clear it. It is scoped to the challenge page you are on: navigating away, reloading, or switching locale clears the whole log, because switching locale navigates to the other locale's URL and reloads the page.

The full content of each entry, headers and both bodies included, is also copied into the challenge's attack session and written to IndexedDB. That copy survives a reload and can be read back from an exported session even though the on-screen list is gone.

A request that the runtime has no worker to dispatch to does not disappear. It is recorded with status `503` and appears in the log as a red row.

## Reading one entry

Click a row to expand a detail area directly beneath it. Clicking the same row again collapses it.

The detail area has two sub-tabs, `Request` and `Response`. Every expansion starts on `Request`.

**`Request`** renders the entry as one raw HTTP message: a request line of the form `METHOD /path HTTP/1.1`, then header lines, then a blank line, then the request body.

The header block is not the short list a `fetch` call can actually put on the wire. It is a simulated Chrome header set — `Host`, `Connection`, `Sec-Ch-Ua`, `User-Agent`, `Accept`, the `Sec-Fetch-*` family — unioned with whatever custom headers the code really sent. Custom headers that are not part of the simulated set are appended after it. When the request carried a cookie, a `Cookie` line appears at the end of the simulated group.

**`Response`** starts with `HTTP/1.1 <status>` — nothing in this lab ever fills the reason-phrase slot, in either this pane or the Repeater's — then the response headers, then a blank line, then the response body. Cookies the server set are restored and shown as ordinary `Set-Cookie` header lines, one per cookie. The detail block has a fixed maximum height and scrolls internally when the message is longer than that.

A red box beginning `Runtime diagnostic:` can appear above the sub-tabs. Only the PHP runtime emits these, and they report what it discarded while assembling the response — output attached to a status code that cannot carry a body, or a reserved header the challenge tried to set. Every challenge in this repository runs on a Python back end, so none of them produces the box today.

## Send to Repeater

A `Send to Repeater` button sits at the right end of the sub-tab row. It exists only inside an expanded detail area, so you have to expand a row before you can see it.

On a challenge that does not grant the Repeater tab, the button is not rendered at all. It is absent, not disabled.

1. Click the row you want in the traffic list.
2. In the expanded detail area, click `Send to Repeater`.
3. The view switches to the Repeater tab automatically.
4. The raw request text replaces whatever was in the Repeater's editing area.

Pressing `Send to Repeater` twice on the same row has no effect the second time. The injected value is compared against the previous one, and an identical value does not trigger an overwrite — the tab still switches, but your edits stay. To get the untouched original back, expand a different row and return, or restore a snapshot.

## The Repeater panel

The Repeater edits one whole HTTP message as plain text. There are no separate method, URL, header, or body fields.

| Control | Behaviour |
|---|---|
| `Raw HTTP Request` area | A single free-text editor holding the complete message: request line, header lines, a blank line, then the body |
| `Send` | Dispatches the message exactly as written. Greyed out and unclickable while the runtime or Service Worker is not ready |
| Response pane | Shows the response starting with `HTTP/1.1 <status>` — the reason-phrase slot is always empty — then headers, a blank line, and the body |
| `+ Save` | Opens a row prompting `Snapshot name:` for the snapshot about to be stored |
| `Saved Snapshots` sidebar | Lists stored requests; reads `No snapshots yet` when empty |

When the panel opens it is already filled with a `GET / HTTP/1.1` request whose `Host` is `challenge-<slug>.localhost`, followed by `User-Agent`, `Accept`, `Accept-Language`, `Accept-Encoding`, and `Connection` headers.

The target URL is assembled from the `Host` header and the path in the request line. Changing `Host` to another challenge's slug sends the request to that challenge instead, and the resulting entry in the Traffic log shows the changed `Host`.

### Request format

Write the request line first, one header per line after it, then a blank line, then the body.

```
POST /items HTTP/1.1
Host: challenge-example.localhost
Content-Type: application/x-www-form-urlencoded

name=widget&quantity=2
```

The blank line is what separates headers from body. Without it the body text is read as another header line.

Writing a `Cookie` header in the raw request works. The platform carries it across the boundary under a different header name and restores it on the back-end side before the challenge sees it.

### Two ways the Repeater looks broken

**Empty first line.** If the first line of the request text is blank, the response pane shows `Error: invalid request format` and nothing is sent.

**Send does nothing at all.** Once the first line is non-empty, the text is handed to the browser's request constructor. If the constructor rejects it — a `GET` or `HEAD` carrying a body, which is easy to produce by typing one extra newline after the blank separator line, or a method name that is not a legal token — the failure is not caught. The response pane neither updates nor shows an error, so `Send` looks completely inert. Check the first line and the trailing newlines before assuming the challenge is down.

### Response pane differences from the Network panel

The Repeater's response pane prints the response headers exactly as the browser exposes them, which means every header name is lower-cased. Cookies the server set are not restored here: they appear as a single `x-wxlsh-set-cookie` header holding a comma-separated, base64-encoded value, because that is the carrier header the platform uses to move them across the boundary and the Repeater prints it before it is unpacked.

The same request opened in the Network panel's `Response` tab shows the unpacked `Set-Cookie` lines. The two views of one exchange therefore look different; the Network panel is the one to read when you want cookies in their normal form.

### Snapshots

1. With the request you want in the editor, click `+ Save`.
2. Type a name in the row that appears. `Enter` confirms, `Escape` cancels.
3. A name that is empty or only whitespace does nothing — the save row stays open until you type a real name or press `Escape`.

A snapshot stores the request text only. Responses are not saved with it.

Click a snapshot's name in the `Saved Snapshots` sidebar to write its content back into the editor, overwriting what is there. Hovering a snapshot reveals an `×` button; clicking it deletes that snapshot immediately, with no confirmation step.

Snapshots are stored in the browser's `localStorage` under a key that includes the challenge slug. They survive closing and reopening the tab, and snapshots saved on one challenge do not appear on another.

## Worked example: change one parameter and compare

This shows the mechanics of the round trip. It targets nothing in particular and reaches no conclusion about the application — the point is where to click and what to compare.

1. In the Browser panel, perform any action that issues a request, such as submitting a form or following a link with a query string.
2. Open the Network tab. The request appears as a new row at the bottom of the list. Note its `Status` and `Time`.
3. Click the row. On the `Request` sub-tab, read the raw message and find the parameter you want to vary.
4. Click `Send to Repeater`. The view switches to the Repeater with that message loaded.
5. Click `+ Save`, name the snapshot, and press `Enter`. This gives you a way back to the unmodified request.
6. In the `Raw HTTP Request` area, change one parameter value and leave everything else alone.
7. Click `Send`. The response pane fills with the status line, headers, and body.
8. Compare it against the original: status code, header set, and body length or content. One changed parameter and one observed difference is the whole unit of work.
9. Switch back to the Network tab. The resent request is in the log as its own row, so you can read its restored `Set-Cookie` headers and its recorded `Time`.

To try a second variation, click the snapshot in the sidebar to restore the original text and repeat from step 6.

## When the panel does not behave

An empty traffic log, a `Send` button that stays disabled, and a first load that takes a long time all have known causes. They are listed with their symptoms and what to do in [Troubleshooting](./troubleshooting).
