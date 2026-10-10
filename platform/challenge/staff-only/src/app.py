"""
Staff Only — SQL injection in the profile editor

Corkboard is a company intranet noticeboard. Staff sign in, read the
announcements, and edit their own profile. The profile editor is reached as
/profile/edit?id=<uuid>, and the lookup behind it concatenates that id straight
into the SQL string, guarding ownership with a trailing
`AND username = '<signed-in user>'`.

Commenting that guard out reaches any colleague's editor — including the
administrator's — and the editor can set a new password.

The flag is served by /admin, which is gated on the is_admin column of the
signed-in account. It is read from /flag.txt when the page renders, so it never
lives in the database and cannot be pulled out through the injection itself.

Goal: sign in with the issued account, reach the administrator's profile
      editor through the injectable id, set a password you know, sign in as the
      administrator, and open the admin console.
"""

import secrets
import sqlite3
import uuid
from flask import Flask, Response, redirect, request
from jinja2 import Environment
from markupsafe import Markup

app = Flask(__name__)

# --- Jinja2 setup -----------------------------------------------------------

env = Environment(autoescape=True)

CSS = """\
  :root {
    --bg: #f1f3f7; --surface: #ffffff; --line: #e2e6ee; --ink: #1c2330;
    --muted: #6b7488; --brand: #2f4b8f; --brand-ink: #ffffff;
    --danger: #b42318; --danger-bg: #fef3f2; --ok: #04794d; --ok-bg: #ecfdf3;
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
    box-shadow: 0 1px 3px rgba(16,24,40,.18);
  }
  .bar-inner {
    max-width: 860px; margin: 0 auto; padding: 0 20px;
    display: flex; align-items: center; gap: 22px; min-height: 56px; flex-wrap: wrap;
  }
  .brand { font-weight: 650; letter-spacing: .2px; margin-right: auto; }
  .brand span { opacity: .72; font-weight: 400; font-size: 13px; margin-left: 8px; }
  .bar a { color: #dfe6f7; text-decoration: none; font-size: 14px; padding: 4px 0; }
  .bar a:hover { color: #fff; }
  .bar a.on { color: #fff; box-shadow: inset 0 -2px 0 #fff; }
  main { max-width: 860px; margin: 0 auto; padding: 28px 20px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.2px; }
  h2 { font-size: 16px; margin: 0 0 14px; }
  .lede { color: var(--muted); margin: 0 0 22px; font-size: 14px; }
  .card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    padding: 20px 22px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
  }
  .card.narrow { max-width: 380px; margin: 48px auto; }
  .post { display: flex; gap: 14px; }
  .avatar {
    flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%;
    background: #dce3f4; color: var(--brand); font-weight: 650; font-size: 13px;
    display: flex; align-items: center; justify-content: center; letter-spacing: .5px;
  }
  .avatar.admin { background: var(--brand); color: #fff; }
  .who { font-weight: 600; }
  .meta { color: var(--muted); font-size: 13px; margin: 0 0 8px; }
  .body { margin: 0; white-space: pre-line; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 5px; }
  input, textarea {
    width: 100%; padding: 9px 11px; font: inherit; color: inherit;
    border: 1px solid #cfd6e4; border-radius: 7px; background: #fff;
  }
  input:focus, textarea:focus { outline: 2px solid #b9c8ea; border-color: var(--brand); }
  textarea { min-height: 84px; resize: vertical; }
  .hint { color: var(--muted); font-size: 12px; margin: 5px 0 0; }
  button {
    margin-top: 20px; padding: 9px 20px; font: inherit; font-weight: 600;
    background: var(--brand); color: #fff; border: 0; border-radius: 7px; cursor: pointer;
  }
  button:hover { background: #263d75; }
  .banner { border-radius: 8px; padding: 11px 14px; margin: 0 0 18px; font-size: 14px; }
  .banner.err { background: var(--danger-bg); color: var(--danger); border: 1px solid #fecdc9; }
  .banner.ok  { background: var(--ok-bg); color: var(--ok); border: 1px solid #b7e8ce; }
  .banner code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
  dl.kv { margin: 0; display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; }
  dl.kv dt { color: var(--muted); font-size: 13px; }
  dl.kv dd { margin: 0; }
  .flag {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 16px;
    background: #101828; color: #7ee2b8; padding: 14px 16px; border-radius: 8px;
    word-break: break-all;
  }
  a.plain { color: var(--brand); }
"""

PAGE = env.from_string("""\
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Corkboard — {{ title }}</title><style>{{ css }}</style></head>
<body>
{% if nav %}
<header class="bar"><div class="bar-inner">
  <div class="brand">Corkboard<span>Internal noticeboard</span></div>
  <a href="/board" class="{{ 'on' if nav == 'board' }}">Board</a>
  <a href="/profile" class="{{ 'on' if nav == 'profile' }}">My profile</a>
  {% if is_admin %}<a href="/admin" class="{{ 'on' if nav == 'admin' }}">Admin console</a>{% endif %}
  <a href="/logout">Sign out</a>
</div></header>
{% endif %}
<main>{{ content }}</main>
</body></html>""")

LOGIN_BODY = env.from_string("""\
<div class="card narrow">
  <h1>Corkboard</h1>
  <p class="lede">Sign in with your staff account.</p>
  {% if error %}<div class="banner err">{{ error }}</div>{% endif %}
  <form method="POST" action="/login">
    <label for="u">Staff ID</label>
    <input id="u" name="username" autocomplete="off" />
    <label for="p">Password</label>
    <input id="p" name="password" type="password" autocomplete="off" />
    <button type="submit">Sign in</button>
  </form>
</div>""")

BOARD_BODY = env.from_string("""\
<h1>Announcements</h1>
<p class="lede">Posts from across the company, newest first.</p>
{% for p in posts %}
<div class="card post">
  <div class="avatar {{ 'admin' if p.is_admin }}">{{ p.initials }}</div>
  <div>
    <div class="who">{{ p.display_name }}</div>
    <p class="meta">{{ p.title }} &middot; {{ p.created_at }}</p>
    <p class="body">{{ p.body }}</p>
  </div>
</div>
{% endfor %}""")

PROFILE_BODY = env.from_string("""\
<h1>My profile</h1>
<p class="lede">How you appear to colleagues on the board.</p>
<div class="card">
  <dl class="kv">
    <dt>Staff ID</dt><dd>{{ me.username }}</dd>
    <dt>Display name</dt><dd>{{ me.display_name }}</dd>
    <dt>Job title</dt><dd>{{ me.title }}</dd>
    <dt>About</dt><dd>{{ me.bio }}</dd>
  </dl>
  <p style="margin:18px 0 0"><a class="plain" href="/profile/edit?id={{ me.id }}">Edit my profile &rarr;</a></p>
</div>""")

EDIT_BODY = env.from_string("""\
<h1>Edit profile</h1>
<p class="lede">Editing <strong>{{ row.display_name }}</strong> (@{{ row.username }})</p>
{% if saved %}<div class="banner ok">Profile saved.</div>{% endif %}
<div class="card">
  <form method="POST" action="/profile/edit">
    <input type="hidden" name="id" value="{{ raw_id }}" />
    <label for="d">Display name</label>
    <input id="d" name="display_name" value="{{ row.display_name }}" />
    <label for="t">Job title</label>
    <input id="t" name="title" value="{{ row.title }}" />
    <label for="b">About</label>
    <textarea id="b" name="bio">{{ row.bio }}</textarea>
    <label for="w">New password</label>
    <input id="w" name="password" type="password" autocomplete="off" />
    <p class="hint">Leave blank to keep the current password.</p>
    <button type="submit">Save changes</button>
  </form>
</div>""")

ERROR_BODY = env.from_string("""\
<h1>{{ heading }}</h1>
<div class="banner err">{{ message }}{% if detail %} <code>{{ detail }}</code>{% endif %}</div>
<p><a class="plain" href="{{ back }}">&larr; Back</a></p>""")

ADMIN_BODY = env.from_string("""\
<h1>Admin console</h1>
<p class="lede">Restricted to accounts with the administrator flag.</p>
<div class="card">
  <h2>Recovery key</h2>
  <p class="meta">Issued for the Corkboard deployment. Treat as a secret.</p>
  <p class="flag">{{ flag }}</p>
</div>""")


def render(title, body_html, nav=None, is_admin=False, status=200):
    # The stylesheet is markup, not user data. Without Markup the
    # autoescaping environment turns its quoted font names into character
    # references, which a <style> element does not decode.
    html = PAGE.render(
        title=title, css=Markup(CSS), content=Markup(body_html), nav=nav, is_admin=is_admin
    )
    return Response(html, status=status, mimetype="text/html")

# --- Database setup ----------------------------------------------------------

# A single connection kept for the lifetime of the runtime, so edits made during
# an assessment persist across requests. Reloading the page rebuilds it.
DB = sqlite3.connect(":memory:", check_same_thread=False)
DB.row_factory = sqlite3.Row

DB.executescript("""
    CREATE TABLE users (
        id           TEXT PRIMARY KEY,
        username     TEXT UNIQUE,
        password     TEXT,
        display_name TEXT,
        title        TEXT,
        bio          TEXT,
        is_admin     INTEGER DEFAULT 0
    );
    CREATE TABLE posts (
        id         INTEGER PRIMARY KEY,
        author     TEXT,
        body       TEXT,
        created_at TEXT
    );
""")

# Seed order matters: the administrator is the first row, so an injected
# always-true condition resolves to it.
SEED_USERS = [
    ("d.okafor", "Kx7#mQ2vLp9@dR4t", "Dele Okafor", "IT Administrator",
     "Keeper of the intranet. Ping me before you file a ticket.", 1),
    ("j.kerr", "Aut2026!", "Jamie Kerr", "Marketing Executive",
     "Campaign planning, mostly. Currently on the autumn launch.", 0),
    ("m.alvarez", "sunset-lagoon-31", "Marisol Alvarez", "Account Manager",
     "Looking after the north region accounts.", 0),
    ("p.novak", "brittle-cobalt-77", "Petr Novak", "Finance Analyst",
     "Month-end close, forecasts, and the occasional spreadsheet rant.", 0),
]

for username, password, display_name, title, bio, is_admin in SEED_USERS:
    DB.execute(
        "INSERT INTO users (id, username, password, display_name, title, bio, is_admin) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (str(uuid.uuid4()), username, password, display_name, title, bio, is_admin),
    )

SEED_POSTS = [
    ("d.okafor", "The admin console has moved to /admin. Access is tied to the "
                 "administrator flag on your account, so the old shared link no "
                 "longer works for anyone else.", "2026-08-14"),
    ("p.novak", "Month-end close is Friday. Expense claims after Thursday 17:00 "
                "roll into next month.", "2026-08-13"),
    ("d.okafor", "Reminder: profile pages are visible to the whole company. "
                 "Please keep the About field work-appropriate.", "2026-08-11"),
    ("m.alvarez", "North region hit target three quarters running. Cake in the "
                  "kitchen on Friday.", "2026-08-08"),
]

for author, body, created_at in SEED_POSTS:
    DB.execute(
        "INSERT INTO posts (author, body, created_at) VALUES (?, ?, ?)",
        (author, body, created_at),
    )

DB.commit()

# --- Sessions ----------------------------------------------------------------

# Session cookies carry an opaque token, never the account name, so a session
# cannot be forged by editing the cookie.
SESSIONS: dict[str, str] = {}


def current_user():
    """Return the signed-in user row, or None."""
    token = request.cookies.get("cb_session", "")
    username = SESSIONS.get(token)
    if not username:
        return None
    return DB.execute(
        "SELECT id, username, display_name, title, bio, is_admin FROM users WHERE username = ?",
        (username,),
    ).fetchone()


def initials(display_name):
    return "".join(part[0] for part in display_name.split()[:2]).upper()

# --- Routes ------------------------------------------------------------------


@app.route("/")
def index():
    if current_user():
        return redirect("/board", code=302)
    return render("Sign in", LOGIN_BODY.render(error=None))


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "")
    password = request.form.get("password", "")

    row = DB.execute(
        "SELECT username FROM users WHERE username = ? AND password = ?",
        (username, password),
    ).fetchone()

    if not row:
        return render("Sign in", LOGIN_BODY.render(error="Incorrect staff ID or password."))

    token = secrets.token_hex(16)
    SESSIONS[token] = row["username"]
    resp = redirect("/board", code=302)
    resp.set_cookie("cb_session", token, path="/")
    return resp


@app.route("/logout")
def logout():
    token = request.cookies.get("cb_session", "")
    SESSIONS.pop(token, None)
    resp = redirect("/", code=302)
    resp.delete_cookie("cb_session", path="/")
    return resp


@app.route("/board")
def board():
    me = current_user()
    if not me:
        return redirect("/", code=302)

    rows = DB.execute(
        "SELECT p.body, p.created_at, u.display_name, u.title, u.is_admin "
        "FROM posts p JOIN users u ON u.username = p.author "
        "ORDER BY p.created_at DESC"
    ).fetchall()

    posts = [
        {
            "body": r["body"],
            "created_at": r["created_at"],
            "display_name": r["display_name"],
            "title": r["title"],
            "is_admin": r["is_admin"],
            "initials": initials(r["display_name"]),
        }
        for r in rows
    ]
    return render("Board", BOARD_BODY.render(posts=posts), nav="board", is_admin=me["is_admin"])


@app.route("/profile")
def profile():
    me = current_user()
    if not me:
        return redirect("/", code=302)
    return render("My profile", PROFILE_BODY.render(me=me), nav="profile", is_admin=me["is_admin"])


def find_editable_profile(raw_id, username):
    """Look up the profile row the editor is allowed to open."""
    # Vulnerability: raw_id is concatenated into the SQL string instead of being
    # bound as a parameter, so a payload can close the quote and comment out the
    # ownership guard that follows — reaching any colleague's profile editor.
    sql = (
        "SELECT id, username, display_name, title, bio FROM users "
        f"WHERE id = '{raw_id}' AND username = '{username}'"
    )
    return DB.execute(sql).fetchone()


def db_error_page(exc, me):
    return render(
        "Error",
        ERROR_BODY.render(
            heading="Something went wrong",
            message="The profile lookup could not be completed:",
            detail=str(exc),
            back="/profile",
        ),
        nav="profile",
        is_admin=me["is_admin"],
        status=500,
    )


@app.route("/profile/edit")
def profile_edit():
    me = current_user()
    if not me:
        return redirect("/", code=302)

    raw_id = request.args.get("id", "")
    if not raw_id:
        return redirect("/profile", code=302)

    try:
        row = find_editable_profile(raw_id, me["username"])
    except sqlite3.Error as exc:
        return db_error_page(exc, me)

    if not row:
        return render(
            "Not found",
            ERROR_BODY.render(
                heading="Profile not available",
                message="No profile matching that reference is open for editing.",
                detail=None,
                back="/profile",
            ),
            nav="profile",
            is_admin=me["is_admin"],
            status=404,
        )

    return render(
        "Edit profile",
        EDIT_BODY.render(row=row, raw_id=raw_id, saved=False),
        nav="profile",
        is_admin=me["is_admin"],
    )


@app.route("/profile/edit", methods=["POST"])
def profile_edit_save():
    me = current_user()
    if not me:
        return redirect("/", code=302)

    raw_id = request.form.get("id", "")

    try:
        row = find_editable_profile(raw_id, me["username"])
    except sqlite3.Error as exc:
        return db_error_page(exc, me)

    if not row:
        return render(
            "Not found",
            ERROR_BODY.render(
                heading="Profile not available",
                message="No profile matching that reference is open for editing.",
                detail=None,
                back="/profile",
            ),
            nav="profile",
            is_admin=me["is_admin"],
            status=404,
        )

    # The row has already been resolved above; the write itself is parameterised
    # and touches exactly that one row. is_admin is not a form field.
    DB.execute(
        "UPDATE users SET display_name = ?, title = ?, bio = ? WHERE id = ?",
        (
            request.form.get("display_name", ""),
            request.form.get("title", ""),
            request.form.get("bio", ""),
            row["id"],
        ),
    )
    new_password = request.form.get("password", "")
    if new_password:
        DB.execute("UPDATE users SET password = ? WHERE id = ?", (new_password, row["id"]))
    DB.commit()

    saved = DB.execute(
        "SELECT id, username, display_name, title, bio FROM users WHERE id = ?",
        (row["id"],),
    ).fetchone()

    return render(
        "Edit profile",
        EDIT_BODY.render(row=saved, raw_id=raw_id, saved=True),
        nav="profile",
        is_admin=me["is_admin"],
    )


@app.route("/admin")
def admin():
    me = current_user()
    if not me:
        return redirect("/", code=302)

    if not me["is_admin"]:
        return render(
            "Forbidden",
            ERROR_BODY.render(
                heading="Admin console",
                message="This console is restricted to accounts carrying the administrator flag.",
                detail=None,
                back="/board",
            ),
            nav="admin",
            is_admin=False,
            status=403,
        )

    flag = open("/flag.txt").read().strip()
    return render("Admin console", ADMIN_BODY.render(flag=flag), nav="admin", is_admin=True)
