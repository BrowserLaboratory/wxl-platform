# Browser Panel

The Browser panel renders the challenge application inside the challenge page. It has its own address bar, its own navigation buttons, and its own history list. None of those are shared with the real browser tab you are reading this page in.

## When the panel opens

The address bar is pre-filled with the challenge's own address, `https://challenge-<slug>.localhost/`, where `<slug>` is the challenge identifier.

Until a page has loaded, the content area shows `Enter a URL and press Go`.

While the challenge runtime is still starting, the **Go** button is disabled and its label changes to `…`; it reads `Go` again once the runtime is ready. The moment the runtime becomes ready, the panel issues the first navigation to whatever is in the address bar on its own — you do not have to press **Go** for the first page.

A 🔒 icon sits at the left edge of the address bar at all times. It is fixed decoration: it does not change with the address, and it does not report anything about the connection.

## Address bar

The address bar is an ordinary editable text field. Type any address into it and press <kbd>Enter</kbd> to navigate; <kbd>Enter</kbd> and the **Go** button emit the same navigation, so they are interchangeable. When the field is empty it shows the placeholder `https://challenge-…`.

Two behaviours are worth knowing before you start editing it:

- **Your typing survives an in-flight navigation.** If you edit the address while a navigation is still running, the arriving response will not overwrite what you typed. When you have not edited it, a completed navigation rewrites the field to the address actually reached.
- **<kbd>Enter</kbd> does nothing while the runtime is not ready.** The input stays editable and no message appears; the navigation is dropped before a request is made. The only hint on screen is the **Go** button reading `…`.

## Navigation controls

Three buttons sit to the left of the address bar. They are shown at desktop widths only — on a phone or a narrow window the whole group is hidden and you are left with the address bar and **Go**.

| Control | What it does | Disabled when | Tooltip |
|---|---|---|---|
| ← Back | Redisplays the previous entry in the panel's history | There is no entry before the current position — including right after the first page finishes loading | `Back` when available, `No earlier page in this tab` when disabled |
| → Forward | Redisplays the next entry in the panel's history | There is no entry after the current position | `Forward` when available, `No later page in this tab` when disabled |
| ↻ Reload | Re-fetches the current history entry's address | The challenge runtime is not ready, or a previous reload has not come back yet; it recovers when the response arrives | `Reload` — it does not change when the button is disabled |

Back and forward look at the history list only. They do not look at whether the runtime is ready, so during a runtime restart — the interval when **Go** shows `…` and reload is disabled — both buttons stay usable as long as history exists. Pressing them then only brings a stored page back onto the screen.

## Navigation history

The history list belongs to this challenge page's Browser panel. It is not shared with other challenges, and it is not the real browser's history: your browser's own back button will not step back through the panel's pages.

- **Back and forward do not re-fetch anything.** They put a previously stored page back on screen, so no new entry appears in the [Network Traffic](./network) log.
- **Navigating after going back discards the forward entries.** Once you go back and then navigate somewhere new, everything that was in the forward direction is thrown away.
- **Navigating to the address already in the current entry replaces that entry instead of adding one.** Clicking a link that points back at the same page, or pressing **Go** a second time on the same address, leaves the history position unchanged — so back does not become available. A real browser behaves the opposite way here.
- **Reload keeps its place when the address does not change.** Reloading an address that stays put updates that entry where it is and leaves the forward entries intact. If the reload is redirected somewhere else, it counts as a new navigation and appends an entry.
- **Back and forward invalidate a navigation that is still running.** The request that was already sent still goes out and still appears in the traffic log, but its response is neither displayed nor allowed to write cookies into the panel's cookie jar.

While you are looking at a page brought back by back or forward, a bar above the content reads `cached view · captured <time> · press ↻ to refetch`. If the session cookies have changed since that page was captured, the same bar turns a warning colour and adds ` · session cookies have changed since this capture` — the page on screen was recorded under different cookies than the ones that would be sent now.

## Reload

Reload always re-sends as `GET`. It never re-submits a `POST` body, so the panel never asks whether you want to resend a form the way a real browser does.

It fetches the address stored in the current history entry, not the text in the address bar — so a half-typed address you have not submitted yet is reverted when you press it.

## Links and forms inside the page

Clicks and form submissions inside the rendered page are intercepted by the panel and re-issued as its own requests.

| Action in the page | What the panel sends |
|---|---|
| Click a link | A fresh `GET`, carrying the current address as the `Referer` header — visible in the traffic log |
| Click a link whose `href` is empty or starts with `#` | Nothing at all: no request, no traffic log entry, no history entry |
| Submit a `GET` form | The fields joined into a query string appended to the target address, so `?key=value` shows up in the address bar |
| Submit a `POST` form | A request whose body is built according to the form's `enctype` — `multipart/form-data` or url-encoded. A successful response enters the history like any other navigation |
| Submit a form that has no `action` attribute | The target is taken from **the text currently in the address bar**, not from the address of the page on screen. Edit the address bar first and the form goes to the edited address |

Nothing is sent while the challenge runtime is not ready. That holds even when the page on screen is a cached one brought back by back or forward — its links and forms produce no request.

The panel keeps its own cookie jar, and any cookie in it is sent back on subsequent requests, where it appears in the request headers shown in the [Network Traffic](./network) panel. On Python and PHP challenges, though, what lands in the jar is not the challenge's `Set-Cookie` as it was sent: the panel cannot decode the format the platform uses to carry those headers, so it stores a meaningless string instead. That string is still sent back and is still visible in the traffic log, but the challenge does not recognise it, so a login made here does not carry over — and no error message appears at any point. See [Troubleshooting](./troubleshooting#requests-cookies).

Two more behaviours affect what you see versus what was sent:

- **Redirects are followed automatically, up to five in a row.** The whole chain leaves a single history entry, at the final address. After the fifth, the chain stops without an error message: the sixth `3xx` response is rendered as an ordinary response — usually a blank page — and written into history, with the address bar left at the address that issued that redirect.
- **Rapid repeated navigation does not cancel anything.** Press **Go** several times, or click several links quickly, and every request is still sent and still recorded in the traffic log; only the last navigation's response is displayed. The earlier responses are discarded, not aborted.

## How the response is displayed

An HTML response is rendered in a sandboxed `iframe`. The sandbox grants scripts and forms but not same-origin access, which is why the challenge application's JavaScript cannot read the laboratory's own DOM, cookies, or `localStorage`. The panel has its own cookie jar, separate from your browser's cookie store — to see what it sends, read the traffic log rather than your browser's developer tools.

A response that is not `text/html` does not go into the `iframe` at all; it is shown as a plain text block. `application/json` is pretty-printed with indentation first.

## When a navigation fails

A failed navigation adds one bar above the content: `Navigation failed — the challenge runtime did not respond`. It appears for any failed navigation, not just a failed reload — a link click that fails shows it too.

Nothing else changes. The page that was on screen stays on screen and the address bar keeps its text, so a failure can look like the button simply did not respond. The error bar is the thing to look for.

If the runtime does not come back, see [Troubleshooting](./troubleshooting) for the full list of known limitations and what to do about each one.
