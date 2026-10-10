"""Tier 1 rules — fully automated format checks.

Rules:
  T-2: TBD marker detection
  V-1: VitePress container syntax
  F-1: Image placeholder dual-line format
  T-3: Empty custom container detection
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# T-2: TBD marker detection
# ---------------------------------------------------------------------------

_TBD_RE = re.compile(r"<!--[^>]*\bTBD\b[^>]*-->", re.IGNORECASE)


def check_t2(lines: list[str], config: dict) -> list[dict]:
    """Detect residual <!-- ... TBD ... --> markers."""
    violations: list[dict] = []
    for i, line in enumerate(lines):
        for m in _TBD_RE.finditer(line):
            violations.append(
                {
                    "line": i + 1,
                    "line_end": i + 1,
                    "rule": "T-2",
                    "severity": "error",
                    "category": "完整性",
                    "desc": "殘留 TBD 標記",
                    "context": m.group(),
                    "fix": "解決佔位內容並移除 TBD 標記",
                    "auto_fixable": False,
                    "requires_llm_review": False,
                }
            )
    return violations


# ---------------------------------------------------------------------------
# V-1: VitePress container syntax detection
# ---------------------------------------------------------------------------

_CONTAINER_TYPES = r"(?:NOTE|TIP|WARNING|DANGER|DETAILS)"
_BAD_CONTAINER_RE = re.compile(
    rf"^>\s*\[({_CONTAINER_TYPES})\]", re.IGNORECASE
)
_GOOD_CONTAINER_RE = re.compile(
    rf"^>\s*\[!{_CONTAINER_TYPES}\]", re.IGNORECASE
)


def check_v1(lines: list[str], config: dict) -> list[dict]:
    """Detect VitePress containers missing the `!` character."""
    violations: list[dict] = []
    for i, line in enumerate(lines):
        if _BAD_CONTAINER_RE.match(line) and not _GOOD_CONTAINER_RE.match(line):
            m = _BAD_CONTAINER_RE.match(line)
            container_type = m.group(1).upper()
            fixed = line.replace(f"[{m.group(1)}]", f"[!{container_type}]", 1)
            violations.append(
                {
                    "line": i + 1,
                    "line_end": i + 1,
                    "rule": "V-1",
                    "severity": "warning",
                    "category": "格式",
                    "desc": f"VitePress container 缺少 `!`：`[{m.group(1)}]` 應為 `[!{container_type}]`",
                    "context": line,
                    "fix": fixed,
                    "auto_fixable": True,
                    "requires_llm_review": False,
                }
            )
    return violations


# ---------------------------------------------------------------------------
# F-1: Image placeholder dual-line format detection
# ---------------------------------------------------------------------------

_CAPTION_RE = re.compile(r"^>\s*📷")


def check_f1(lines: list[str], config: dict) -> list[dict]:
    """Detect image caption lines without a preceding image link line."""
    violations: list[dict] = []
    for i, line in enumerate(lines):
        if not _CAPTION_RE.match(line):
            continue
        # Find preceding non-empty line.
        prev_idx = i - 1
        while prev_idx >= 0 and lines[prev_idx].strip() == "":
            prev_idx -= 1
        if prev_idx >= 0 and lines[prev_idx].strip().startswith("!["):
            continue
        violations.append(
            {
                "line": i + 1,
                "line_end": i + 1,
                "rule": "F-1",
                "severity": "warning",
                "category": "格式",
                "desc": "圖片佔位符缺少前導圖片連結行",
                "context": line,
                "fix": "在圖說行前加入 `![📷 **圖 N**：描述（AI 製圖）](path/figNN.png)` 行",
                "auto_fixable": False,
                "requires_llm_review": False,
            }
        )
    return violations


# ---------------------------------------------------------------------------
# T-3: Empty custom container detection
# ---------------------------------------------------------------------------

_CONTAINER_HEADER_RE = re.compile(
    rf"^>\s*\[!{_CONTAINER_TYPES}\]", re.IGNORECASE
)


def check_t3(lines: list[str], config: dict) -> list[dict]:
    """Detect custom containers with a header but no substantive content."""
    violations: list[dict] = []
    for i, line in enumerate(lines):
        if not _CONTAINER_HEADER_RE.match(line):
            continue
        # Check subsequent lines for content within the blockquote.
        has_content = False
        j = i + 1
        while j < len(lines):
            subsequent = lines[j]
            # Line must be part of the blockquote (start with >).
            if not subsequent.startswith(">"):
                break
            # Check if there's substantive text after the > marker.
            text = subsequent[1:].strip()
            if text:
                has_content = True
                break
            j += 1

        if not has_content:
            violations.append(
                {
                    "line": i + 1,
                    "line_end": j,
                    "rule": "T-3",
                    "severity": "error",
                    "category": "完整性",
                    "desc": "Custom container 標題存在但內容為空",
                    "context": line,
                    "fix": "填入實質內容，或以 `<!-- DEFERRED: 描述 -->` 替代整個 container",
                    "auto_fixable": False,
                    "requires_llm_review": False,
                }
            )
    return violations


# ---------------------------------------------------------------------------
# RULES export
# ---------------------------------------------------------------------------

RULES = [
    {"rule_id": "T-2", "check": check_t2, "condition": None},
    {"rule_id": "V-1", "check": check_v1, "condition": "vitepress_mode"},
    {"rule_id": "F-1", "check": check_f1, "condition": "image_format_check"},
    {"rule_id": "T-3", "check": check_t3, "condition": None},
]
