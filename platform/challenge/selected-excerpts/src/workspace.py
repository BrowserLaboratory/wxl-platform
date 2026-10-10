"""Editorial records shared by the contributor workspace and course-pack job.

The contributor application originally held this seed data beside its routes.
Curriculum assembly now imports the same records so a course-pack preview sees
the revision a contributor just saved.
"""

ARTICLES = {
    "writing-with-evidence": {
        "slug": "writing-with-evidence",
        "title": "Writing with Evidence",
        "contributor": "Leah Navarro",
        "selected": False,
        "chapters": {
            "reading-a-trace": {
                "slug": "reading-a-trace",
                "title": "Reading a Trace",
                "body": "## Keep the record\n\nRead the source before drawing a conclusion.",
            }
        },
    },
    "discussion-notes": {
        "slug": "discussion-notes",
        "title": "Discussion Notes for First-Year Seminars",
        "contributor": "Mira Osei",
        "selected": True,
        "chapters": {
            "asking-better-questions": {
                "slug": "asking-better-questions",
                "title": "Asking Better Questions",
                "body": "## Start with the claim\n\nAsk what evidence would change your mind.",
            },
            "listening-for-context": {
                "slug": "listening-for-context",
                "title": "Listening for Context",
                "body": "## Hear the qualification\n\nA careful answer often depends on what was left unsaid.",
            },
        },
    },
}

# The curriculum editor owns this list. It names source chapters directly so a
# production preview stays reproducible while its articles receive revisions.
COURSE_PACK = [
    ("discussion-notes", "asking-better-questions"),
    ("discussion-notes", "listening-for-context"),
]


def find_article(article_slug):
    return ARTICLES.get(article_slug)


def find_chapter(article, chapter_slug):
    return article["chapters"].get(chapter_slug)


def articles_for_contributor(contributor):
    return [article for article in ARTICLES.values() if article["contributor"] == contributor]


def selected_articles():
    return [article for article in ARTICLES.values() if article["selected"]]


def selected_excerpts():
    excerpts = []
    for article_slug, chapter_slug in COURSE_PACK:
        article = find_article(article_slug)
        chapter = find_chapter(article, chapter_slug) if article else None
        if article and article["selected"] and chapter:
            excerpts.append({"article": article, "chapter": chapter})
    return excerpts
