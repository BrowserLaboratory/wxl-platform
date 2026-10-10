"""Tier 2 rules — heuristic checks with possible false positives.

Rules:
  P-1: Dash usage analysis
  K-1: Emotional punctuation density
  S-3: Section transition length
  C-1: Code block lead-in
  W-1: Code-explanation consistency
"""

from __future__ import annotations

import re

from ._common import (
    FENCED_RE as _FENCED_RE,
    H2_RE as _H2_RE,
    H2_OR_H3_RE as _H2_OR_H3_RE,
    H3_RE as _H3_RE,
    IMAGE_RE as _IMAGE_RE,
    KAOMOJI_CHARS_RE as _KAOMOJI_CHARS_RE,
    TABLE_RE as _TABLE_RE,
)


def _get_prose_lines(lines: list[str]) -> list[int]:
    """Return indices of prose lines (excluding code blocks, tables, images, blanks)."""
    result: list[int] = []
    in_code = False
    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue
        if _TABLE_RE.match(line) or _IMAGE_RE.match(line):
            continue
        if line.strip() == "":
            continue
        result.append(i)
    return result


# ---------------------------------------------------------------------------
# P-1: Dash usage analysis
# ---------------------------------------------------------------------------

_DASH_RE = re.compile(r"——")
_CAUSAL_RE = re.compile(r"——\s*(?:因為|由於|因此)")
_QUESTION_RE = re.compile(r"——[^？]*？")
_DEFINITION_KEYWORDS = re.compile(
    r"(?:就是|指的是|也就是|意思是|稱為|叫做|即|表示)"
)


def check_p1(lines: list[str], config: dict) -> list[dict]:
    """Analyze dash usage with 5-point judgment heuristic."""
    violations: list[dict] = []
    total_dashes = 0
    dramatic_count = 0
    in_code = False

    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue

        for m in _DASH_RE.finditer(line):
            total_dashes += 1
            pos = m.start()
            after = line[pos + 2:]

            # #1: Causal keyword → colon
            if _CAUSAL_RE.match(line[pos:]):
                violations.append(
                    {
                        "line": i + 1,
                        "line_end": i + 1,
                        "rule": "P-1",
                        "severity": "warning",
                        "category": "標點",
                        "desc": "破折號後接因果子句，建議替換為冒號",
                        "context": line,
                        "fix": line[:pos] + "：" + after,
                        "auto_fixable": True,
                        "requires_llm_review": False,
                    }
                )
            # #2: Question → comma
            elif _QUESTION_RE.match(line[pos:]):
                violations.append(
                    {
                        "line": i + 1,
                        "line_end": i + 1,
                        "rule": "P-1",
                        "severity": "warning",
                        "category": "標點",
                        "desc": "破折號後接問句，建議替換為逗號",
                        "context": line,
                        "fix": line[:pos] + "，" + after,
                        "auto_fixable": True,
                        "requires_llm_review": False,
                    }
                )
            # #3: Definition context → colon
            elif _DEFINITION_KEYWORDS.search(after[:20] if len(after) > 20 else after):
                violations.append(
                    {
                        "line": i + 1,
                        "line_end": i + 1,
                        "rule": "P-1",
                        "severity": "warning",
                        "category": "標點",
                        "desc": "破折號引出定義/解釋，建議替換為冒號",
                        "context": line,
                        "fix": line[:pos] + "：" + after,
                        "auto_fixable": True,
                        "requires_llm_review": False,
                    }
                )
            # #4: Dramatic — keep (count it)
            else:
                dramatic_count += 1

    # Add density metrics to violations as an info-level note if ratio > 30%.
    if total_dashes > 0 and dramatic_count / total_dashes > 0.30:
        violations.append(
            {
                "line": 0,
                "line_end": None,
                "rule": "P-1",
                "severity": "info",
                "category": "標點",
                "desc": f"戲劇效果破折號保留比例 {dramatic_count}/{total_dashes} "
                f"({dramatic_count * 100 // total_dashes}%) 超過 30%，建議重新審查",
                "context": "",
                "fix": "",
                "auto_fixable": False,
                "requires_llm_review": True,
            }
        )

    return violations


def metrics_p1(lines: list[str], config: dict) -> dict:
    """Return density metrics for P-1 dash analysis."""
    total_dashes = 0
    dramatic_count = 0
    in_code = False
    for line in lines:
        if _FENCED_RE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue
        for m in _DASH_RE.finditer(line):
            total_dashes += 1
            pos = m.start()
            after = line[pos + 2:]
            if _CAUSAL_RE.match(line[pos:]):
                pass
            elif _QUESTION_RE.match(line[pos:]):
                pass
            elif _DEFINITION_KEYWORDS.search(after[:20] if len(after) > 20 else after):
                pass
            else:
                dramatic_count += 1
    return {
        "dash_total": total_dashes,
        "dash_dramatic_count": dramatic_count,
        "dash_dramatic_ratio": dramatic_count / total_dashes if total_dashes > 0 else 0,
    }


# ---------------------------------------------------------------------------
# K-1: Emotional punctuation density analysis
# ---------------------------------------------------------------------------

# Tier 2 heuristic: fullwidth parens with mood words
_FULLWIDTH_PAREN_RE = re.compile(r"（[^）]{3,}）")
_MOOD_WORDS_RE = re.compile(r"[啊啦吧嗎呢哈嘻噗]")

# Type A-D dialogue markers
_DIALOGUE_RE = re.compile(r"^[🧑👨👩🤖]|「[^」]*？」")


def _count_kaomoji(line: str) -> int:
    """Count emotional punctuation elements in a line (Tier 1 + Tier 2)."""
    count = 0
    # Tier 1: kaomoji characters
    if _KAOMOJI_CHARS_RE.search(line):
        count += 1
    # Tier 2: fullwidth parens with mood words or kaomoji
    for m in _FULLWIDTH_PAREN_RE.finditer(line):
        content = m.group()
        if _KAOMOJI_CHARS_RE.search(content):
            pass  # Already counted in Tier 1
        elif len(content) > 10 and _MOOD_WORDS_RE.search(content):
            count += 1
    # Tier 2: dialogue markers
    if _DIALOGUE_RE.search(line):
        count += 1
    return count


def check_k1(lines: list[str], config: dict) -> list[dict]:
    """Check emotional punctuation density in prose."""
    violations: list[dict] = []
    prose_indices = _get_prose_lines(lines)
    total_prose = len(prose_indices)

    if total_prose == 0:
        return violations

    # Count kaomoji across all prose lines.
    kaomoji_count = 0
    kaomoji_positions: list[int] = []
    for idx in prose_indices:
        c = _count_kaomoji(lines[idx])
        if c > 0:
            kaomoji_count += c
            kaomoji_positions.append(idx)

    density = kaomoji_count / total_prose if total_prose > 0 else 0

    # Global density check.
    if total_prose >= 30 and density < 1 / 30:
        violations.append(
            {
                "line": 1,
                "line_end": len(lines),
                "rule": "K-1",
                "severity": "warning",
                "category": "密度",
                "desc": f"情感標點密度過低：{kaomoji_count} 個 / {total_prose} 行散文 "
                f"(密度 {density:.4f}，下限 {1 / 30:.4f})",
                "context": "",
                "fix": "增加顏文字或對話元素",
                "auto_fixable": False,
                "requires_llm_review": False,
            }
        )

    # Check for excessive local density (3+ in 10 consecutive prose lines).
    # Skip for very short files where the check is not meaningful.
    if len(kaomoji_positions) >= 3 and total_prose >= 10:
        for i in range(len(kaomoji_positions) - 2):
            start_pos = kaomoji_positions[i]
            end_pos = kaomoji_positions[i + 2]
            # Count how many prose lines span between them.
            span = 0
            for idx in prose_indices:
                if start_pos <= idx <= end_pos:
                    span += 1
            if span <= 10:
                violations.append(
                    {
                        "line": start_pos + 1,
                        "line_end": end_pos + 1,
                        "rule": "K-1",
                        "severity": "warning",
                        "category": "密度",
                        "desc": f"情感標點局部密度過高：{span} 行散文內有 3 個情感標點",
                        "context": "",
                        "fix": "減少此區域的顏文字或對話元素",
                        "auto_fixable": False,
                        "requires_llm_review": False,
                    }
                )
                break  # Report only the first cluster.

    return violations


def metrics_k1(lines: list[str], config: dict) -> dict:
    """Return density metrics for K-1 kaomoji analysis."""
    prose_indices = _get_prose_lines(lines)
    total_prose = len(prose_indices)
    kaomoji_count = 0
    for idx in prose_indices:
        kaomoji_count += _count_kaomoji(lines[idx])
    return {
        "total_prose_lines": total_prose,
        "kaomoji_count": kaomoji_count,
        "kaomoji_density": kaomoji_count / total_prose if total_prose > 0 else 0,
    }


# ---------------------------------------------------------------------------
# S-3: Section transition length check
# ---------------------------------------------------------------------------


def _count_sentences(text: str) -> int:
    """Rough sentence count using Chinese/English sentence-ending punctuation."""
    endings = re.findall(r"[。！？!?]", text)
    return max(len(endings), 1 if text.strip() else 0)


def check_s3(lines: list[str], config: dict) -> list[dict]:
    """Check H2→H2 transition sentence counts."""
    violations: list[dict] = []
    h2_positions: list[int] = []

    for i, line in enumerate(lines):
        if _H2_RE.match(line):
            h2_positions.append(i)

    for idx in range(1, len(h2_positions)):
        h2_line = h2_positions[idx]
        # Gather transition text: lines between the H2 heading and
        # the first non-empty content line after it.
        # Actually, the transition is the text BEFORE this H2 and AFTER
        # the last content of the previous section.
        # Simpler approach: count sentences in the first paragraph after the H2.
        transition_text = ""
        j = h2_line + 1
        while j < len(lines) and (j < len(lines) and lines[j].strip() == ""):
            j += 1
        # Collect the transition paragraph.
        while j < len(lines) and lines[j].strip() != "" and not _H2_RE.match(lines[j]) and not _H3_RE.match(lines[j]):
            transition_text += lines[j] + " "
            j += 1

        sentence_count = _count_sentences(transition_text)

        if sentence_count < 2:
            violations.append(
                {
                    "line": h2_line + 1,
                    "line_end": h2_line + 1,
                    "rule": "S-3",
                    "severity": "warning",
                    "category": "鷹架",
                    "desc": f"H2 過場不足：{sentence_count} 句（需 2-4 句覆蓋摘要/缺口/動機）",
                    "context": lines[h2_line],
                    "fix": "擴展過場段落至 2-4 句，包含摘要、缺口、動機",
                    "auto_fixable": False,
                    "requires_llm_review": True,
                }
            )
        elif sentence_count > 5:
            violations.append(
                {
                    "line": h2_line + 1,
                    "line_end": h2_line + 1,
                    "rule": "S-3",
                    "severity": "warning",
                    "category": "鷹架",
                    "desc": f"H2 過場過長：{sentence_count} 句（建議精簡至 2-4 句）",
                    "context": lines[h2_line],
                    "fix": "精簡過場段落至 2-4 句",
                    "auto_fixable": False,
                    "requires_llm_review": True,
                }
            )

    return violations


# ---------------------------------------------------------------------------
# C-1: Code block lead-in check
# ---------------------------------------------------------------------------


def check_c1(lines: list[str], config: dict) -> list[dict]:
    """Check that code blocks have at least one prose lead-in line after the nearest heading."""
    violations: list[dict] = []
    in_code = False

    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            if not in_code:
                # Opening fence — check for prose between nearest heading and here.
                has_prose = False
                j = i - 1
                while j >= 0:
                    if lines[j].strip() == "":
                        j -= 1
                        continue
                    if _H2_OR_H3_RE.match(lines[j]):
                        break  # Hit a heading without prose.
                    has_prose = True
                    break

                if not has_prose:
                    violations.append(
                        {
                            "line": i + 1,
                            "line_end": i + 1,
                            "rule": "C-1",
                            "severity": "warning",
                            "category": "程式碼",
                            "desc": "Code block 前缺少對話式引入（heading 後直接接 code block）",
                            "context": line,
                            "fix": "在 heading 與 code block 之間加入至少一句對話式引入",
                            "auto_fixable": False,
                            "requires_llm_review": False,
                        }
                    )
            in_code = not in_code

    return violations


# ---------------------------------------------------------------------------
# W-1: Code-explanation consistency check
# ---------------------------------------------------------------------------

_BACKTICK_TOKEN_RE = re.compile(r"`([^`]+)`")
_EXPLANATION_LINE_RE = re.compile(r"^\s*(?:\d+\.\s|Step\s+\d+)", re.IGNORECASE)


def check_w1(lines: list[str], config: dict) -> list[dict]:
    """Check consistency between code blocks and adjacent explanations."""
    violations: list[dict] = []
    in_code = False
    code_start = -1
    code_content: list[str] = []

    for i, line in enumerate(lines):
        if _FENCED_RE.match(line):
            if not in_code:
                code_start = i
                code_content = []
            else:
                # Code block ended. Check for adjacent explanation list.
                code_text = "\n".join(code_content)
                j = i + 1
                # Skip blank lines.
                while j < len(lines) and lines[j].strip() == "":
                    j += 1
                # Collect explanation lines with their actual indices.
                explanation_entries: list[tuple[int, str]] = []
                while j < len(lines) and _EXPLANATION_LINE_RE.match(lines[j]):
                    explanation_entries.append((j, lines[j]))
                    j += 1

                if explanation_entries:
                    for exp_idx, exp_line in explanation_entries:
                        for token_match in _BACKTICK_TOKEN_RE.finditer(exp_line):
                            token = token_match.group(1)
                            if token not in code_text:
                                violations.append(
                                    {
                                        "line": exp_idx + 1,
                                        "line_end": exp_idx + 1,
                                        "rule": "W-1",
                                        "severity": "warning",
                                        "category": "程式碼",
                                        "desc": f"解說引用的 `{token}` 未出現在對應的 code block 中",
                                        "context": exp_line,
                                        "fix": "確認解說中引用的程式碼與 code block 一致",
                                        "auto_fixable": False,
                                        "requires_llm_review": True,
                                    }
                                )
            in_code = not in_code
            continue
        if in_code:
            code_content.append(line)

    return violations


# ---------------------------------------------------------------------------
# RULES export
# ---------------------------------------------------------------------------

RULES = [
    {"rule_id": "P-1", "check": check_p1, "condition": None, "metrics": metrics_p1},
    {"rule_id": "K-1", "check": check_k1, "condition": None, "metrics": metrics_k1},
    {"rule_id": "S-3", "check": check_s3, "condition": None},
    {"rule_id": "C-1", "check": check_c1, "condition": None},
    {"rule_id": "W-1", "check": check_w1, "condition": None},
]
