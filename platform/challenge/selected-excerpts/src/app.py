"""Kestrel Press editorial workspace HTTP application.

The routes stay close to the contributor-facing workflow. Editorial records,
shared revisions, and course-pack assembly moved into their own modules as the
curriculum team joined the older contributor workspace.
"""

import sys

from flask import Flask, redirect, request
from jinja2 import FileSystemLoader
from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

# Challenge files are mounted at the virtual filesystem root. Keeping that
# root importable lets the original single-file Flask entry point import the
# modules that were split out during the curriculum integration.
if "/" not in sys.path:
    sys.path.append("/")

from course_pack import markdown_to_html, render_selected_excerpts
from revisions import save_shared_revision
from workspace import articles_for_contributor, find_article, selected_articles

app = Flask(__name__)

# Page templates are maintained by the product team. Request data only reaches
# them through named context values, and the sandbox keeps presentation separate
# from the editorial material the pages display.
page_env = SandboxedEnvironment(
    loader=FileSystemLoader("/templates"),
    autoescape=True,
)

STYLESHEET = Markup(open("/static/app.css").read())
CURRENT_CONTRIBUTOR = "Leah Navarro"


def page(name, status_code=200, **context):
    return (
        page_env.get_template(name).render(css=STYLESHEET, **context),
        status_code,
        {"Content-Type": "text/html; charset=utf-8"},
    )


@app.get("/")
def workbench():
    return page(
        "workbench.html",
        title="Selected Excerpts",
        contributor=CURRENT_CONTRIBUTOR,
        own_articles=articles_for_contributor(CURRENT_CONTRIBUTOR),
        selected_articles=selected_articles(),
    )


@app.get("/articles/<article_slug>")
def article_detail(article_slug):
    article = find_article(article_slug)
    if article is None:
        return page("missing.html", status_code=404, title="Not found")
    return page(
        "article.html",
        title=article["title"],
        article=article,
        can_edit=article["contributor"] == CURRENT_CONTRIBUTOR,
        saved=request.args.get("saved") == "chapter",
    )


@app.get("/articles/<article_slug>/preview")
def article_preview(article_slug):
    article = find_article(article_slug)
    if article is None:
        return page("missing.html", status_code=404, title="Not found")
    return page(
        "preview.html",
        title=f"Preview: {article['title']}",
        article=article,
        rendered_chapters=[
            {"chapter": chapter, "html": markdown_to_html(chapter["body"])}
            for chapter in article["chapters"].values()
        ],
    )


@app.post("/articles/<article_slug>/chapters/<chapter_slug>")
def save_chapter(article_slug, chapter_slug):
    article = find_article(article_slug)
    if article is None:
        return page("missing.html", status_code=404, title="Not found")
    if article["contributor"] != CURRENT_CONTRIBUTOR:
        return page(
            "missing.html",
            status_code=403,
            title="Editing restricted",
            detail="Contributors can edit only their own drafts.",
        )

    body = request.form.get("body", "").strip()
    if not body:
        return page(
            "article.html",
            status_code=400,
            title=article["title"],
            article=article,
            can_edit=True,
            error="A chapter needs text before it can be saved.",
        )

    chapter = save_shared_revision(chapter_slug, body)
    if chapter is None:
        return page("missing.html", status_code=404, title="Not found")
    return redirect(f"/articles/{article_slug}?saved=chapter")


@app.get("/course-pack")
def course_pack():
    return page(
        "course-pack.html",
        title="Editorial selections",
        excerpts=render_selected_excerpts(),
    )


@app.errorhandler(404)
def not_found(_err):
    return page("missing.html", status_code=404, title="Not found")
