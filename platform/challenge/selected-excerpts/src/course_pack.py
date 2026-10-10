"""Course-pack assembly for editorially selected excerpts.

The contributor application renders Markdown as page data. The older course
pack exporter also retains its original include compatibility pass because its
archived selections carried template markers before the current Markdown-only
editor was introduced.
"""

from html import escape

from jinja2 import Environment
from markupsafe import Markup

import workspace

# This renderer belongs to the importer rather than the contributor pages. It
# receives only the curriculum team's fixed selections, which is why the
# original integration kept the archive's template semantics here.
include_env = Environment(autoescape=True)


def markdown_to_html(source):
    """Render the subset of Markdown the editorial form accepts.

    This is presentation work, not template evaluation. Excerpts are escaped
    before their headings and paragraphs become page markup, so punctuation in
    a manuscript remains manuscript text.
    """
    blocks = []
    paragraph = []

    def flush_paragraph():
        if paragraph:
            blocks.append(f"<p>{escape(' '.join(paragraph))}</p>")
            paragraph.clear()

    for line in source.splitlines():
        if not line.strip():
            flush_paragraph()
        elif line.startswith("## "):
            flush_paragraph()
            blocks.append(f"<h2>{escape(line[3:])}</h2>")
        elif line.startswith("# "):
            flush_paragraph()
            blocks.append(f"<h1>{escape(line[2:])}</h1>")
        else:
            paragraph.append(line.strip())
    flush_paragraph()
    return Markup("\n".join(blocks))


def render_selected_excerpts():
    """Build course-pack sections from the fixed editorial selection list."""
    excerpts = []
    for excerpt in workspace.selected_excerpts():
        # Earlier course packs ran archived source through Jinja before they
        # converted it to HTML so its legacy merge fields survived. New
        # contributor drafts use the Markdown renderer above and do not reach
        # this selected-excerpt import path.
        completed_source = include_env.from_string(excerpt["chapter"]["body"]).render()
        excerpts.append({**excerpt, "html": markdown_to_html(completed_source)})
    return excerpts
