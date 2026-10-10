"""Shared revision persistence kept for the editorial archive import."""

import workspace


def save_shared_revision(chapter_slug, body):
    """Persist a chapter revision from the editorial or contributor flow."""
    # Archive imports and the editor console both use stable chapter slugs.
    # Their callers resolve and authorise a page before they reach this small
    # persistence helper, so it keeps the older workspace-wide lookup shape.
    for article in workspace.ARTICLES.values():
        chapter = workspace.find_chapter(article, chapter_slug)
        if chapter:
            chapter["body"] = body
            return chapter
    return None
