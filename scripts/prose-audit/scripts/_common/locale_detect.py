# Vendored from ~/.claude/skills/humane-prose-audit/scripts/_common/locale_detect.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""Lightweight locale heuristic for humane-prose-audit.

Classifies Markdown text as ``tw`` (Traditional Chinese, Taiwan), ``en``
(English), or ``mixed`` by counting CJK code points and ASCII letters.

Why this exists
---------------
Sub-agent prompts, readability checks, and rationale messages adapt their
output language based on the audited target's locale. The project config can
pin ``locale`` explicitly; when absent, this module produces an honest, O(N)
auto-detect.

Scoping note
------------
The ``tw`` label is deliberate: v1 targets Taiwan Traditional Chinese
audiences and does not differentiate zh-CN from zh-TW. The rationale is
documented in CONTRIBUTING.md (Phase J).

Heuristic rules
---------------
Counting:
  - CJK = code points in U+4E00..U+9FFF (CJK Unified Ideographs) plus
    U+3400..U+4DBF (CJK Unified Ideographs Extension A).
  - letters = ASCII letters A-Z and a-z.
  - All other characters (Markdown punctuation, whitespace, digits,
    Latin-1 punctuation, etc.) are ignored.

Classification, with ``r = cjk / (cjk + letters)``:
  - cjk == 0 and letters == 0          -> ``"en"``  (stable default)
  - r >= 0.7                            -> ``"tw"``
  - r <= 0.1                            -> ``"en"``
  - otherwise                           -> ``"mixed"``

The function does not strip Markdown syntax; it relies on the fact that
``#``, ``*``, ``_``, backticks and similar punctuation are not counted
toward either bucket.
"""

from __future__ import annotations

from typing import Literal

__all__ = ["Locale", "detect_locale", "ratio_cjk"]

Locale = Literal["tw", "en", "mixed"]

# CJK Unified Ideographs (the bulk of Han characters used in modern
# Traditional Chinese) and Extension A (less common but still real prose).
# We intentionally skip the higher supplementary planes (Ext B..G) — they
# add cost to a hot path for vanishingly rare hits in everyday Markdown.
_CJK_RANGES: tuple[tuple[int, int], ...] = (
    (0x4E00, 0x9FFF),
    (0x3400, 0x4DBF),
)


def _count(text: str) -> tuple[int, int]:
    """Return ``(cjk_count, letter_count)`` in a single O(N) pass."""
    cjk = 0
    letters = 0
    for ch in text:
        cp = ord(ch)
        # ASCII letters fast path — most prose hits this branch first.
        if 0x41 <= cp <= 0x5A or 0x61 <= cp <= 0x7A:
            letters += 1
            continue
        # CJK ranges. Two small ranges — explicit comparisons stay cheap.
        for lo, hi in _CJK_RANGES:
            if lo <= cp <= hi:
                cjk += 1
                break
    return cjk, letters


def ratio_cjk(text: str) -> float:
    """Return ``cjk_count / (cjk_count + letter_count)``.

    Returns ``0.0`` when both counts are zero (no divide-by-zero on empty
    or punctuation-only input).
    """
    cjk, letters = _count(text)
    total = cjk + letters
    if total == 0:
        return 0.0
    return cjk / total


def detect_locale(text: str) -> Locale:
    """Classify ``text`` as ``"tw"``, ``"en"``, or ``"mixed"``.

    See the module docstring for the heuristic rules. The function is
    intentionally O(N) over ``len(text)`` and does no Markdown parsing.
    """
    cjk, letters = _count(text)
    total = cjk + letters
    if total == 0:
        # Empty or punctuation-only input — pick a stable default.
        return "en"
    r = cjk / total
    if r >= 0.7:
        return "tw"
    if r <= 0.1:
        return "en"
    return "mixed"
