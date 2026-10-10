"""
Need to Know — IDOR via file download endpoint

A FastAPI file-sharing app backed by in-memory SQLite.
Each user has private files, but the /download endpoint only checks
whether the file ID exists — it never verifies that the requesting
user actually owns the file.

Sessions are held server-side and the cookie carries only an opaque token,
so the identity behind a session cannot be swapped by editing the cookie.
The admin account owns a private file whose content IS the flag.

Goal: log in as a regular user, then manipulate the file ID in
      /download?id=… to retrieve the admin's private file.
"""

import secrets
import sqlite3
from urllib.parse import parse_qs
from jinja2 import Environment
from markupsafe import Markup
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response

app = FastAPI()

# --- Jinja2 setup -----------------------------------------------------------

env = Environment(autoescape=True)

CSS = """\
  :root {
    --bg: #f4f6f5; --surface: #ffffff; --line: #e0e6e4; --ink: #16241f;
    --muted: #677a73; --brand: #0f6b52; --brand-dark: #0b5340; --brand-ink: #ffffff;
    --tint: #dcefe8; --danger: #b42318; --danger-bg: #fef3f2;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    /* Named faces first, and no `-apple-system` / `system-ui`: those two match
       everywhere but resolve to the default serif where no system UI font is
       installed, which stops the rest of the list from being tried. */
    font-family: "Helvetica Neue", Helvetica, "Segoe UI", Arial,
                 "PingFang TC", "Noto Sans TC", sans-serif;
    font-size: 15px;
    line-height: 1.6;
  }
  header.bar {
    background: var(--brand); color: var(--brand-ink);
    box-shadow: 0 1px 3px rgba(9,30,24,.2);
  }
  .bar-inner {
    max-width: 780px; margin: 0 auto; padding: 0 20px;
    display: flex; align-items: center; gap: 20px; min-height: 56px; flex-wrap: wrap;
  }
  .brand { font-weight: 650; letter-spacing: .2px; margin-right: auto; }
  .brand span { opacity: .72; font-weight: 400; font-size: 13px; margin-left: 8px; }
  .bar .who { font-size: 14px; opacity: .85; }
  .bar a { color: #d6ece4; text-decoration: none; font-size: 14px; }
  .bar a:hover { color: #fff; }
  main { max-width: 780px; margin: 0 auto; padding: 28px 20px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.2px; }
  .lede { color: var(--muted); margin: 0 0 22px; font-size: 14px; }
  .card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    box-shadow: 0 1px 2px rgba(9,30,24,.04); overflow: hidden;
  }
  .card.pad { padding: 20px 22px; }
  .card.narrow { max-width: 380px; margin: 48px auto; padding: 22px 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 12px 18px; border-bottom: 1px solid var(--line); }
  th {
    background: #eef3f1; color: var(--muted); font-size: 12px;
    text-transform: uppercase; letter-spacing: .6px;
  }
  tr:last-child td { border-bottom: 0; }
  tbody tr:hover { background: #f7faf9; }
  td.id { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  td.act { text-align: right; }
  .file { display: flex; align-items: center; gap: 11px; }
  .ext {
    flex: 0 0 auto; width: 34px; height: 34px; border-radius: 7px;
    background: var(--tint); color: var(--brand-dark); font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; letter-spacing: .4px;
  }
  a.btn {
    display: inline-block; padding: 6px 15px; font-size: 14px; font-weight: 600;
    background: var(--brand); color: #fff; text-decoration: none; border-radius: 7px;
  }
  a.btn:hover { background: var(--brand-dark); }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 5px; }
  input {
    width: 100%; padding: 9px 11px; font: inherit; color: inherit;
    border: 1px solid #ccd8d4; border-radius: 7px; background: #fff;
  }
  input:focus { outline: 2px solid #a9d3c6; border-color: var(--brand); }
  button {
    margin-top: 20px; width: 100%; padding: 10px 20px; font: inherit; font-weight: 600;
    background: var(--brand); color: #fff; border: 0; border-radius: 7px; cursor: pointer;
  }
  button:hover { background: var(--brand-dark); }
  .banner {
    background: var(--danger-bg); color: var(--danger); border: 1px solid #fecdc9;
    border-radius: 8px; padding: 11px 14px; margin: 0 0 4px; font-size: 14px;
  }
  a.plain { color: var(--brand); }
"""

PAGE = env.from_string("""\
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>FileHub - {{ title }}</title><style>{{ css }}</style></head>
<body>
{% if user %}
<header class="bar"><div class="bar-inner">
  <div class="brand">FileHub<span>Shared workspace</span></div>
  <div class="who">Signed in as <strong>{{ user }}</strong></div>
  <a href="/logout">Sign out</a>
</div></header>
{% endif %}
<main>{{ content }}</main>
</body></html>""")

LOGIN_BODY = env.from_string("""\
<div class="card narrow">
  <h1>FileHub</h1>
  <p class="lede">Sign in to reach your workspace.</p>
  {% if error %}<div class="banner">{{ error }}</div>{% endif %}
  <form method="POST" action="/login">
    <label for="u">Username</label>
    <input id="u" name="username" autocomplete="off" />
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="off" />
    <button type="submit">Sign in</button>
  </form>
</div>""")

FILES_BODY = env.from_string("""\
<h1>My files</h1>
<p class="lede">Everything stored under your account.</p>
<div class="card">
  <table>
    <thead><tr><th>ID</th><th>File</th><th></th></tr></thead>
    <tbody>
      {% for f in files %}
      <tr>
        <td class="id">{{ f.id }}</td>
        <td>
          <div class="file">
            <div class="ext">{{ f.ext }}</div>
            <div>{{ f.filename }}</div>
          </div>
        </td>
        <td class="act"><a class="btn" href="/download?id={{ f.id }}">Download</a></td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>""")

ERROR_BODY = env.from_string("""\
<h1>File not available</h1>
<div class="banner">{{ message }}</div>
<p style="margin-top:18px"><a class="plain" href="/files">&larr; Back to my files</a></p>""")


def render(title, body_html, user=None):
    # The stylesheet is markup, not user data. Without Markup the
    # autoescaping environment turns its quoted font names into character
    # references, which a <style> element does not decode.
    return HTMLResponse(
        PAGE.render(title=title, css=Markup(CSS), content=Markup(body_html), user=user)
    )

# --- Database setup ----------------------------------------------------------

def get_db():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    flag = open("/flag.txt").read().strip()

    db.executescript("""
        CREATE TABLE users (
            id       INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT
        );
        CREATE TABLE files (
            id       INTEGER PRIMARY KEY,
            owner_id INTEGER,
            filename TEXT,
            content  TEXT
        );
    """)

    db.execute("INSERT INTO users VALUES (1, 'admin',  'Sx!9kL@mQ2')")
    db.execute("INSERT INTO users VALUES (2, 'guest',  'guest')")

    db.execute("INSERT INTO files VALUES (1, 1, 'credentials.txt', ?)", (flag,))
    db.execute("INSERT INTO files VALUES (2, 1, 'todo.txt',        'Rotate DB passwords')")
    db.execute("INSERT INTO files VALUES (3, 2, 'notes.txt',       'Nothing important here.')")
    db.execute("INSERT INTO files VALUES (4, 2, 'readme.txt',      'Welcome to the file hub!')")
    db.commit()
    return db

# --- Helpers -----------------------------------------------------------------

# Session cookies carry an opaque token, never the account name, so a session
# cannot be re-pointed at another account by editing the cookie.
SESSIONS: dict[str, str] = {}


def current_user(request: Request):
    return SESSIONS.get(request.cookies.get("fh_session", ""))

def extension(filename):
    return filename.rsplit(".", 1)[-1][:4].upper() if "." in filename else "FILE"

async def parse_form(request: Request) -> dict[str, str]:
    """Parse URL-encoded form body without python-multipart."""
    body = (await request.body()).decode()
    parsed = parse_qs(body, keep_blank_values=True)
    return {k: v[0] for k, v in parsed.items()}

# --- Routes ------------------------------------------------------------------

@app.get("/")
async def index(request: Request):
    user = current_user(request)
    if not user:
        return render("Sign in", LOGIN_BODY.render(error=None))
    return RedirectResponse("/files", status_code=302)


@app.post("/login")
async def login(request: Request):
    form = await parse_form(request)
    username = form.get("username", "")
    password = form.get("password", "")

    db = get_db()
    row = db.execute(
        "SELECT id FROM users WHERE username = ? AND password = ?",
        (username, password),
    ).fetchone()

    if not row:
        return render("Sign in", LOGIN_BODY.render(error="Incorrect username or password."))

    token = secrets.token_hex(16)
    SESSIONS[token] = username
    resp = RedirectResponse("/files", status_code=302)
    resp.set_cookie("fh_session", token, path="/")
    return resp


@app.get("/files")
async def list_files(request: Request):
    user = current_user(request)
    if not user:
        return RedirectResponse("/", status_code=302)

    db = get_db()
    uid = db.execute("SELECT id FROM users WHERE username = ?", (user,)).fetchone()
    if not uid:
        return RedirectResponse("/", status_code=302)

    rows = db.execute(
        "SELECT id, filename FROM files WHERE owner_id = ?", (uid["id"],)
    ).fetchall()

    files = [
        {"id": r["id"], "filename": r["filename"], "ext": extension(r["filename"])}
        for r in rows
    ]
    return render("My files", FILES_BODY.render(files=files), user=user)


@app.get("/download")
async def download(request: Request, id: int = 0):
    user = current_user(request)
    if not user:
        return RedirectResponse("/", status_code=302)

    db = get_db()

    # Vulnerability: fetches the file by ID without checking owner_id against
    # the logged-in user — any authenticated user can download any file.
    row = db.execute(
        "SELECT filename, content FROM files WHERE id = ?", (id,)
    ).fetchone()

    if not row:
        return render(
            "Not found",
            ERROR_BODY.render(message="No file with that ID is stored here."),
            user=user,
        )

    return Response(
        content=row["content"],
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{row["filename"]}"'},
    )


@app.get("/logout")
async def logout(request: Request):
    SESSIONS.pop(request.cookies.get("fh_session", ""), None)
    resp = RedirectResponse("/", status_code=302)
    resp.delete_cookie("fh_session", path="/")
    return resp
