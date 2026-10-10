"""
Corvid Labs prompt library.

The shared store of prompt templates the support automation team works from. A
template is ordinary text with {{ ... }} placeholders; the library fills those in
from the ticket being processed and hands the finished string to the model.

Templates are authored by the team, so the library compiles them as templates
rather than treating them as data — that is the feature. The pages of the
library itself are a separate concern: they are loaded from the templates
directory and never assembled out of anything a request carried.

Prompts are not HTML. HTML escaping inside a prompt turns quotation marks and
ampersands into character references, and the model receives the literal
&quot; instead of the quotation mark the author wrote, which changes what is
being asked. Prompt rendering is therefore configured separately from page
rendering.
"""

from urllib.parse import parse_qs

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader
from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

app = FastAPI()

# --- Rendering ---------------------------------------------------------------

# Pages. Templates come from /templates; request data is passed in as a
# variable and escaped on the way out.
page_env = SandboxedEnvironment(
    loader=FileSystemLoader("/templates"),
    autoescape=True,
)

# Prompts. A prompt is plain text on its way to a model, so escaping is off —
# see the note at the top of this file about what escaping does to a prompt.
prompt_env = Environment(autoescape=False)


# The stylesheet is markup, not page data. It is read once here and handed to the
# layout, which drops it into a <style> element; without Markup the escaping
# environment would turn its quoted font names into character references, which
# a <style> element does not decode.
STYLESHEET = Markup(open("/static/app.css").read())


def page(name, status_code=200, **context):
    return HTMLResponse(
        page_env.get_template(name).render(css=STYLESHEET, **context),
        status_code=status_code,
    )


# --- The library -------------------------------------------------------------

TEMPLATES = [
    {
        "id": 1,
        "name": "Ticket summary",
        "owner": "support-ops",
        "updated": "2026-08-30",
        "note": "Runs on every ticket that reaches the duty queue.",
        "source": (
            "Summarise the support ticket below for {{ audience }}.\n"
            "Keep the tone {{ tone }} and stay under 120 words.\n"
            "\n"
            "Subject: {{ ticket.subject }}\n"
            "Body: {{ ticket.body }}"
        ),
    },
    {
        "id": 2,
        "name": "Escalation draft",
        "owner": "support-ops",
        "updated": "2026-08-14",
        "note": "Drafts the handover note when a ticket crosses the SLA.",
        "source": (
            "Draft an escalation note for {{ audience }}.\n"
            "State what is broken, since when, and what has already been tried.\n"
            "\n"
            "Ticket: {{ ticket.subject }}\n"
            "Detail: {{ ticket.body }}"
        ),
    },
    {
        "id": 3,
        "name": "Customer reply",
        "owner": "cx-team",
        "updated": "2026-07-02",
        "note": "First reply on tickets tagged billing.",
        "source": (
            "Write a reply to the customer in a {{ tone }} tone.\n"
            "Do not promise a refund. Offer the next available callback slot.\n"
            "\n"
            "They wrote: {{ ticket.body }}"
        ),
    },
]

# The record a preview is rendered against. Previews never touch a real ticket,
# so the values here stand in for one.
SAMPLE = {
    "audience": "a duty manager",
    "tone": "neutral",
    "ticket": {
        "subject": "Card reader offline at Gate 4",
        "body": (
            "Reader has been unresponsive since 08:10. Power cycled twice, "
            "no change. Passengers are being processed manually."
        ),
    },
}


def find_template(tid):
    for t in TEMPLATES:
        if t["id"] == tid:
            return t
    return None


async def parse_form(request: Request) -> dict[str, str]:
    """Parse URL-encoded form body without python-multipart."""
    body = (await request.body()).decode()
    parsed = parse_qs(body, keep_blank_values=True)
    return {k: v[0] for k, v in parsed.items()}


# --- Routes ------------------------------------------------------------------

@app.get("/")
async def index():
    return page("index.html", title="Templates", templates=TEMPLATES)


@app.get("/t/{tid}")
async def detail(tid: int):
    template = find_template(tid)
    if template is None:
        return page("missing.html", status_code=404, title="Not found")
    return page("detail.html", title=template["name"], template=template, sample=SAMPLE)


@app.post("/preview")
async def preview(request: Request):
    form = await parse_form(request)
    source = form.get("source", "")

    # isdecimal(), not isdigit(): the two disagree on superscripts and other
    # numeric forms int() will not accept, and this branch exists to keep an
    # unusable id out of int().
    template = find_template(int(form["id"])) if form.get("id", "").isdecimal() else None

    # A template under construction is expected to be broken — an unclosed tag,
    # a placeholder the sample record does not carry, a division the author got
    # wrong. Reporting that back in the preview is what an editor is for; the
    # alternative is throwing the author out of the page they are working in.
    try:
        rendered = prompt_env.from_string(source).render(**SAMPLE)
    except Exception as err:
        rendered = f"{type(err).__name__}: {err}"

    return page(
        "preview.html",
        title="Preview",
        template=template,
        source=source,
        rendered=rendered,
        sample=SAMPLE,
    )

