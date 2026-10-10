#!/usr/bin/env python3
"""
sanitize_commit.py
------------------
Sanitizes a git commit message draft by replacing IDE internal links
(e.g. `[filename](cci:...)`) with plain backtick-wrapped text (e.g. `filename`).

Usage:
    # Pass text as a command-line argument:
    python3 sanitize_commit.py "your draft commit message"

    # Or pipe via stdin:
    echo "$DRAFT" | python3 sanitize_commit.py

    # Or import as a module:
    from sanitize_commit import sanitize
    clean = sanitize(raw_text)
"""

import re
import sys


# Matches: [any text](cci...anything until closing paren)
_CCI_LINK_RE = re.compile(r"\[(.*?)\]\(cci(?:[^\)])*\)")


def sanitize(text: str) -> str:
    """
    Replace all CCI internal links with plain backtick-wrapped label text.

    Example:
        Input:  "新增 [scripts/build.sh](cci:7:file:///Users/alice/project/scripts/build.sh) 腳本"
        Output: "新增 `scripts/build.sh` 腳本"
    """
    return _CCI_LINK_RE.sub(r"`\1`", text)


def main() -> None:
    # Accept input from argument or stdin
    if len(sys.argv) > 1:
        raw = " ".join(sys.argv[1:])
    else:
        raw = sys.stdin.read()

    print(sanitize(raw), end="")


if __name__ == "__main__":
    main()
