"""Tier 3 rules — LLM review hint markers.

These rules don't detect violations directly. They mark locations that
require LLM semantic review, outputting entries into llm_review_hints.

Rules:
  T-1: Terminology candidate marking
  S-1: Analogy candidate marking
  S-2: Post-humor recovery marking
  E-1: Error prevention coverage marking
  M-1: Implicit concept marking
  O-1: Opening motivation marking
"""

from __future__ import annotations

import re

from ._common import (
    FENCED_RE as _FENCED_RE,
    H1_RE as _H1_RE,
    H2_RE as _H2_RE,
    H3_RE as _H3_RE,
    KAOMOJI_CHARS_RE as _KAOMOJI_CHARS_RE,
    WARNING_RE as _WARNING_RE,
)

# ---------------------------------------------------------------------------
# T-1: Terminology candidate marking
# ---------------------------------------------------------------------------

_BOLD_TERM_RE = re.compile(r"\*\*([^*]+)\*\*")
_CODE_SPAN_RE = re.compile(r"`([^`]+)`")


def check_t1(lines: list[str], config: dict) -> list[dict]:
    """Mark candidate technical terms in bold or code spans for LLM review."""
    hints: list[dict] = []
    in_code = False
    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue

        terms: list[str] = []
        for m in _BOLD_TERM_RE.finditer(line):
            term = m.group(1)
            # Filter: likely a term if it contains English or parenthetical translation.
            if re.search(r"[A-Za-z]|（.*）", term):
                terms.append(term)
        for m in _CODE_SPAN_RE.finditer(line):
            term = m.group(1)
            # Filter: skip if it looks like code (contains operators or parens).
            if not re.search(r"[()=+\-*/{}]", term) and re.search(r"[A-Za-z]", term):
                terms.append(term)

        for term in terms:
            hints.append(
                {
                    "line": i + 1,
                    "line_end": i + 1,
                    "rule": "T-1",
                    "severity": "info",
                    "category": "術語",
                    "desc": f"候選術語：{term}",
                    "context": line,
                    "fix": "Check if this term has been formally taught before this point (T-1)",
                    "auto_fixable": False,
                    "requires_llm_review": True,
                }
            )
    return hints


# ---------------------------------------------------------------------------
# S-1: Analogy candidate marking
# ---------------------------------------------------------------------------

_ANALOGY_KEYWORDS_RE = re.compile(r"想像|就像|好比|好像|彷彿|類似|比方說")


def check_s1(lines: list[str], config: dict) -> list[dict]:
    """Mark lines with analogy keywords for LLM bridge review."""
    hints: list[dict] = []
    in_code = False
    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue
        if _ANALOGY_KEYWORDS_RE.search(line):
            hints.append(
                {
                    "line": i + 1,
                    "line_end": i + 1,
                    "rule": "S-1",
                    "severity": "info",
                    "category": "鷹架",
                    "desc": "疑似類比位置",
                    "context": line,
                    "fix": "Check if this analogy has a meta-cognitive bridge in the preceding sentence (S-1)",
                    "auto_fixable": False,
                    "requires_llm_review": True,
                }
            )
    return hints


# ---------------------------------------------------------------------------
# S-2: Post-humor recovery marking
# ---------------------------------------------------------------------------


def check_s2(lines: list[str], config: dict) -> list[dict]:
    """Mark the line after each kaomoji for LLM humor-recovery review."""
    hints: list[dict] = []
    in_code = False
    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue
        if _KAOMOJI_CHARS_RE.search(line):
            # Find next non-empty line.
            j = i + 1
            while j < len(lines) and lines[j].strip() == "":
                j += 1
            if j < len(lines) and not _FENCED_RE.match(lines[j]):
                hints.append(
                    {
                        "line": j + 1,
                        "line_end": j + 1,
                        "rule": "S-2",
                        "severity": "info",
                        "category": "鷹架",
                        "desc": "顏文字後的下一句——檢查語氣恢復",
                        "context": lines[j],
                        "fix": "Check if this line contains a narrative recovery connective after the humor element (S-2)",
                        "auto_fixable": False,
                        "requires_llm_review": True,
                    }
                )
    return hints


# ---------------------------------------------------------------------------
# E-1: Error prevention coverage marking
# ---------------------------------------------------------------------------

_SYNTAX_PATTERNS = [
    re.compile(r"\bprint\s*\("),
    re.compile(r"\binput\s*\("),
    re.compile(r"\bif\s+"),
    re.compile(r"\bfor\s+"),
    re.compile(r"\bwhile\s+"),
    re.compile(r"\bdef\s+"),
    re.compile(r"\bclass\s+"),
    re.compile(r"=(?!=)"),
]

def check_e1(lines: list[str], config: dict) -> list[dict]:
    """Mark code blocks with first-occurrence syntax that lack nearby warnings."""
    hints: list[dict] = []
    in_code = False
    code_start = -1
    seen_patterns: set[int] = set()

    # Find H3 section boundaries and WARNING markers.
    h3_sections: list[tuple[int, int, bool]] = []  # (start, end, has_warning)
    current_h3_start = 0
    current_has_warning = False

    for i, line in enumerate(lines):
        if _H3_RE.match(line) or _H2_RE.match(line) or _H1_RE.match(line):
            if i > 0:
                h3_sections.append((current_h3_start, i, current_has_warning))
            current_h3_start = i
            current_has_warning = False
        if _WARNING_RE.search(line):
            current_has_warning = True
    h3_sections.append((current_h3_start, len(lines), current_has_warning))

    def _section_has_warning(line_idx: int) -> bool:
        for start, end, has_w in h3_sections:
            if start <= line_idx < end:
                return has_w
        return False

    # Scan code blocks.
    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            if not in_code:
                code_start = i
            else:
                # Code block ended. Check for first-occurrence syntax.
                has_warning = _section_has_warning(code_start)
                for ci in range(code_start + 1, i):
                    for pi, pat in enumerate(_SYNTAX_PATTERNS):
                        if pi not in seen_patterns and pat.search(lines[ci]):
                            if has_warning:
                                # WARNING present — don't consume the slot,
                                # so a later block without WARNING can still trigger.
                                pass
                            else:
                                seen_patterns.add(pi)
                                hints.append(
                                    {
                                        "line": code_start + 1,
                                        "line_end": i + 1,
                                        "rule": "E-1",
                                        "severity": "info",
                                        "category": "程式碼",
                                        "desc": "首次出現語法元素，同 section 無 WARNING 標記",
                                        "context": lines[ci],
                                        "fix": "Check if common beginner errors for this syntax are warned about in the same section (E-1)",
                                        "auto_fixable": False,
                                        "requires_llm_review": True,
                                    }
                                )
                                break  # One hint per code block.
                    else:
                        continue
                    break
            in_code = not in_code

    return hints


# ---------------------------------------------------------------------------
# M-1: Implicit concept marking
# ---------------------------------------------------------------------------

_NESTED_CALL_RE = re.compile(r"\w+\s*\([^)]*\w+\s*\([^)]*\)")


def check_m1(lines: list[str], config: dict) -> list[dict]:
    """Mark code blocks with nested function calls for step-by-step trace review."""
    hints: list[dict] = []
    in_code = False
    code_start = -1

    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            if not in_code:
                code_start = i
            else:
                # Code block ended. Check for nested calls.
                for ci in range(code_start + 1, i):
                    if _NESTED_CALL_RE.search(lines[ci]):
                        hints.append(
                            {
                                "line": ci + 1,
                                "line_end": ci + 1,
                                "rule": "M-1",
                                "severity": "info",
                                "category": "程式碼",
                                "desc": "嵌套函式呼叫或複合表達式",
                                "context": lines[ci],
                                "fix": "Check if the implicit evaluation concept in this code is made explicit via step-by-step trace (M-1)",
                                "auto_fixable": False,
                                "requires_llm_review": True,
                            }
                        )
                        break  # One hint per code block.
            in_code = not in_code

    return hints


# ---------------------------------------------------------------------------
# O-1: Opening motivation marking
# ---------------------------------------------------------------------------


def check_o1(lines: list[str], config: dict) -> list[dict]:
    """Mark the first prose paragraph after H1 for motivation review."""
    hints: list[dict] = []
    h1_found = False

    for i, line in enumerate(lines):
        if _H1_RE.match(line):
            h1_found = True
            continue
        if h1_found and line.strip():
            # Found the first non-empty line after H1.
            # Skip if it's another heading.
            if re.match(r"^#+\s+", line):
                continue
            hints.append(
                {
                    "line": i + 1,
                    "line_end": i + 1,
                    "rule": "O-1",
                    "severity": "info",
                    "category": "完整性",
                    "desc": "H1 後第一段——檢查讀者動機建立",
                    "context": line,
                    "fix": "Check if this opening establishes reader motivation before any technical content (O-1)",
                    "auto_fixable": False,
                    "requires_llm_review": True,
                }
            )
            break  # Only one O-1 hint per file.

    return hints


# ---------------------------------------------------------------------------
# RULES export
# ---------------------------------------------------------------------------

RULES = [
    {"rule_id": "T-1", "check": check_t1, "condition": None},
    {"rule_id": "S-1", "check": check_s1, "condition": None},
    {"rule_id": "S-2", "check": check_s2, "condition": None},
    {"rule_id": "E-1", "check": check_e1, "condition": None},
    {"rule_id": "M-1", "check": check_m1, "condition": None},
    {"rule_id": "O-1", "check": check_o1, "condition": None},
]
