#!/usr/bin/env python3
# Vendored from ~/.claude/skills/humane-prose-audit/checks/ai_tells.py @ 2026-05-28; do not edit in place. Upstream-sync via dedicated change.
"""AI-tell vocabulary + em-dash overuse check.

Two deterministic signals are combined into findings:

1. **Vocabulary tells** — count case-insensitive occurrences of a hardcoded
   seed list of phrases typical of LLM-generated prose (English + a small
   Traditional-Chinese set). Density-per-kchar gates severity:

   * > 8/kchar  → ``high``   (single finding summarising top 3 phrases)
   * 4–8/kchar  → ``medium`` (single finding summarising top 3 phrases)
   * 1–3/kchar  → ``low``    (one finding per distinct tell)
   * 0/kchar    → no vocab finding

2. **Em-dash overuse** — count ``—`` (U+2014) and ``––`` (double en-dash) per
   kchar. > 5/kchar → a separate ``medium`` finding.

YAML scalar lines and fenced code blocks are stripped before scoring so that
config/code snippets do not pollute density (same semantics as
``lazy_writer_check.py``).

Output is a single JSON line on stdout conforming to
``schemas/check-output.schema.json``. Returncode is 0 on success, 2 when the
target is missing or unreadable.

See: wiki/concepts/ai-tells/delve-tapestry-navigate.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

# --- Defaults (hardcoded; can be overridden by config.yaml in a future patch) ---

VOCAB_TELLS_EN: tuple[str, ...] = (
    "delve into",
    "navigate",
    "robust",
    "tapestry",
    "leverage",
    "ensure",
    "facilitate",
    "engage with",
    "multifaceted",
    "comprehensive",
    "transformative",
    "indispensable",
    "foundational",
    "It's important to note",
    "It's worth noting",
    "It is important to note",
    "Moreover",
    "Furthermore",
    "In conclusion",
    "Last but not least",
    "Needless to say",
    "intricate",
)

VOCAB_TELLS_ZH: tuple[str, ...] = (
    "深入探討",
    "蘊含",
    "編織",
    "璀璨",
    "多元面向",
    "包羅萬象",
)

DEFAULT_VOCAB_TELLS: tuple[str, ...] = VOCAB_TELLS_EN + VOCAB_TELLS_ZH

EM_DASH_THRESHOLD_PER_KCHAR = 5.0
HIGH_DENSITY_THRESHOLD = 8.0
MEDIUM_DENSITY_THRESHOLD = 4.0
LOW_DENSITY_THRESHOLD = 1.0

_YAML_SCALAR_RE = re.compile(r"^\s*[\w-]+:\s*\S")


def _strip_metadata_lines(text: str) -> str:
    """Drop YAML scalar lines and fenced code blocks before scoring.

    Mirrors ``lazy_writer_check._strip_metadata_lines`` so that template
    phrases embedded in config/code do not pollute density.
    """
    out: list[str] = []
    in_fence = False
    for line in text.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if _YAML_SCALAR_RE.match(line):
            continue
        out.append(line)
    return "\n".join(out)


def _count_phrase(haystack_lower: str, phrase: str) -> int:
    """Case-insensitive substring count.

    The haystack is pre-lowercased once by the caller for cheap matching.
    """
    if not phrase:
        return 0
    return haystack_lower.count(phrase.lower())


def compute(text: str) -> tuple[list[dict], dict]:
    """Return (findings, metadata) for the audit target.

    metadata exposes raw values consumed by Phase 4 humane-signal scoring:
      * vocab_density_per_kchar: total AI-tell hits / kchar
      * em_density_per_kchar:    em-dash + double-en-dash hits / kchar
      * top_tells: list of [phrase, count] sorted desc (top 10)
      * total_chars / total_hits
    """
    stripped = _strip_metadata_lines(text)
    total_chars = len(stripped)
    metadata: dict = {
        "vocab_density_per_kchar": 0.0,
        "em_density_per_kchar": 0.0,
        "top_tells": [],
        "total_chars": total_chars,
        "total_hits": 0,
    }
    if total_chars == 0:
        return [], metadata

    lower = stripped.lower()

    counts: dict[str, int] = {}
    total_hits = 0
    for phrase in DEFAULT_VOCAB_TELLS:
        c = _count_phrase(lower, phrase)
        if c:
            counts[phrase] = c
            total_hits += c

    findings: list[dict] = []

    density = total_hits / (total_chars / 1000.0) if total_hits else 0.0

    if density > HIGH_DENSITY_THRESHOLD:
        top3 = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
        evidence = "top: " + ", ".join(f"{p}×{n}" for p, n in top3)
        findings.append(
            {
                "severity": "high",
                "section": "<ai-tells-vocabulary>",
                "issue": (
                    f"AI-tell vocabulary density {density:.2f}/kchar exceeds "
                    f"high threshold {HIGH_DENSITY_THRESHOLD}/kchar"
                ),
                "evidence": evidence,
            }
        )
    elif density >= MEDIUM_DENSITY_THRESHOLD:
        top3 = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
        evidence = "top: " + ", ".join(f"{p}×{n}" for p, n in top3)
        findings.append(
            {
                "severity": "medium",
                "section": "<ai-tells-vocabulary>",
                "issue": (
                    f"AI-tell vocabulary density {density:.2f}/kchar in medium "
                    f"range ({MEDIUM_DENSITY_THRESHOLD}–{HIGH_DENSITY_THRESHOLD}/kchar)"
                ),
                "evidence": evidence,
            }
        )
    elif density >= LOW_DENSITY_THRESHOLD:
        # One finding per distinct tell at low density.
        for phrase, n in sorted(counts.items(), key=lambda kv: kv[1], reverse=True):
            findings.append(
                {
                    "severity": "low",
                    "section": "<ai-tells-vocabulary>",
                    "issue": f"AI-tell phrase `{phrase}` present in prose",
                    "evidence": f"count={n}",
                }
            )

    # --- Em-dash overuse (separate signal) ---
    em_single = stripped.count("—")  # U+2014
    em_double_en = stripped.count("––")
    em_total = em_single + em_double_en
    em_density = em_total / (total_chars / 1000.0) if em_total else 0.0
    if em_density > EM_DASH_THRESHOLD_PER_KCHAR:
        findings.append(
            {
                "severity": "medium",
                "section": "<ai-tells-em-dash>",
                "issue": (
                    f"Em-dash density {em_density:.2f}/kchar exceeds "
                    f"threshold {EM_DASH_THRESHOLD_PER_KCHAR}/kchar"
                ),
                "evidence": f"em-dash count={em_single}, double-en-dash count={em_double_en}",
            }
        )

    metadata["vocab_density_per_kchar"] = round(density, 3)
    metadata["em_density_per_kchar"] = round(em_density, 3)
    metadata["top_tells"] = [
        [p, n] for p, n in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    ]
    metadata["total_hits"] = total_hits
    return findings, metadata


def compute_findings(text: str) -> list[dict]:
    """Back-compat shim: returns just the findings list (drops metadata).

    Existing tests use this signature. New callers (Phase E orchestrator,
    Phase 4 humane-signal scoring) should call ``compute()`` directly.
    """
    findings, _ = compute(text)
    return findings


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="AI-tell vocabulary + em-dash check")
    parser.add_argument("target", help="Path to file to scan")
    args = parser.parse_args(argv)

    target = Path(args.target)
    if not target.exists() or not target.is_file():
        print(
            json.dumps({"error": f"target not found: {target}"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2

    try:
        text = target.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(
            json.dumps({"error": f"cannot read target: {exc}"}, ensure_ascii=False),
            file=sys.stderr,
        )
        return 2

    findings, metadata = compute(text)
    print(
        json.dumps(
            {
                "check": "ai_tells",
                "target": str(target),
                "findings": findings,
                "metadata": metadata,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
