"""Shared regex patterns used by multiple tier modules.

Centralised here to prevent drift when patterns are updated
(e.g. adding new kaomoji characters to the catalog).
"""

from __future__ import annotations

import re

# Markdown structure
FENCED_RE = re.compile(r"^```")
H1_RE = re.compile(r"^#\s+")
H2_RE = re.compile(r"^##\s+")
H3_RE = re.compile(r"^###\s+")
H2_OR_H3_RE = re.compile(r"^#{2,3}\s+")

# Content type detection
TABLE_RE = re.compile(r"^\s*\|")
IMAGE_RE = re.compile(r"^!\[|^>\s*📷")

# Kaomoji — characteristic Unicode characters for emotional punctuation
KAOMOJI_CHARS_RE = re.compile(
    r"[╮╯╰╭ʅʃΣωдДﾉﾟ✧◕ヮ┌┛〆ཀ]"
)

# VitePress / admonition markers
WARNING_RE = re.compile(r"\[!WARNING\]|⚠️")
