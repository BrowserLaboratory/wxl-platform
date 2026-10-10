"""Pytest suite for humane-prose-audit check scripts.

Invokes each CLI via subprocess, parses stdout JSON, and asserts the
shared contract (`check`, `target`, `findings`) plus per-check semantics.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
CHECKS_DIR = SKILL_ROOT / "checks"


def run_check(script: str, *args: str) -> tuple[int, dict, str]:
    cmd = [sys.executable, str(CHECKS_DIR / script), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    payload: dict = {}
    if proc.stdout.strip():
        try:
            payload = json.loads(proc.stdout)
        except json.JSONDecodeError:
            payload = {}
    return proc.returncode, payload, proc.stderr


@pytest.fixture
def tmp_text(tmp_path: Path):
    def _make(content: str, name: str = "sample.txt") -> Path:
        p = tmp_path / name
        p.write_text(content, encoding="utf-8")
        return p

    return _make


def test_mainland_vocab_clean(tmp_text):
    target = tmp_text("This is a clean ASCII paragraph with no PRC vocabulary.\n")
    rc, payload, _ = run_check("mainland_vocab.py", str(target))
    assert rc == 0
    assert payload.get("findings") == []


def test_placeholder_grep_high_severity_on_todo(tmp_text):
    target = tmp_text("Section one.\nTODO: write this section\nEnd.\n")
    rc, payload, _ = run_check("placeholder_grep.py", str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert findings, "expected at least one finding for TODO"
    assert any(f.get("severity") == "High" for f in findings)


def test_duplicate_sentences_detects_repeat(tmp_text):
    sentence = "這是一個用於測試的重複句子內容範例。"
    target = tmp_text(sentence + "\n" + sentence + "\n")
    rc, payload, _ = run_check("duplicate_sentences.py", str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert len(findings) >= 1


def test_citation_format_dangling_cite(tmp_text, tmp_path: Path):
    target = tmp_text("Body text with #cite(missing_key) somewhere.\n", name="body.typ")
    refs = tmp_path / "refs.yml"
    refs.write_text("present_key: foo\n", encoding="utf-8")
    rc, payload, _ = run_check(
        "citation_format.py", str(target), "--refs", str(refs)
    )
    assert rc == 0
    findings = payload.get("findings", [])
    high_dangling = [
        f
        for f in findings
        if f.get("severity") == "High" and "missing_key" in f.get("issue", "")
    ]
    assert high_dangling, f"expected dangling-cite High finding, got {findings!r}"


def test_readability_metrics_returns_json(tmp_text):
    target = tmp_text(
        "The quick brown fox jumps over the lazy dog. "
        "This sentence is short and friendly to readers.\n"
    )
    rc, payload, _ = run_check("readability_metrics.py", str(target))
    assert rc == 0
    assert "findings" in payload


def test_lazy_writer_detects_density(tmp_text):
    phrase = "綜上所述"
    body = phrase * 4 + "其他內容文字" * 10
    assert len(body) <= 200
    target = tmp_text(body)
    rc, payload, _ = run_check("lazy_writer_check.py", str(target))
    assert rc == 0
    findings = payload.get("findings", [])
    assert len(findings) >= 1


def test_checks_fail_loudly_on_missing_target():
    rc, _, stderr = run_check("mainland_vocab.py", "/nonexistent/path/does/not/exist.txt")
    assert rc != 0
    assert "error" in stderr.lower() or "not found" in stderr.lower()


def test_agent_prompts_have_required_keywords():
    prompts_dir = SKILL_ROOT / "prompts"
    required_keywords = ["ID", "Severity", "Section", "Issue", "Recommendation", "Confidence"]
    for name in ("sloppy_agent.md", "illogical_agent.md", "shallow_agent.md"):
        text = (prompts_dir / name).read_text(encoding="utf-8")
        for kw in required_keywords:
            assert kw in text, f"{name} missing keyword {kw!r}"
        # Sentinel reference may appear as literal "AGENT_DONE" OR as the
        # split-token form "AGENT_" ... "DONE -->" (which prevents the
        # prompt source from leaking the sentinel substring verbatim).
        has_literal = "AGENT_DONE" in text
        has_split = "AGENT_" in text and "DONE -->" in text
        assert has_literal or has_split, (
            f"{name} missing AGENT_DONE sentinel reference (literal or split-token)"
        )


def test_lazy_writer_no_overlap():
    """Phase C task 3.10: lazy_writer template_phrases must not overlap with
    ai_tells.VOCAB_TELLS_*. The two checks measure different signals (lazy
    template usage vs. AI-tell density) and overlap would double-count the
    same evidence."""
    import sys
    import yaml

    CHECKS_DIR = SKILL_ROOT / "checks"
    if str(CHECKS_DIR.parent) not in sys.path:
        sys.path.insert(0, str(CHECKS_DIR.parent))
    from checks.ai_tells import VOCAB_TELLS_EN, VOCAB_TELLS_ZH  # noqa: E402

    cfg = yaml.safe_load((SKILL_ROOT / "config.yaml").read_text(encoding="utf-8"))
    lazy_phrases = set(cfg["lazy_writer"]["template_phrases"])
    ai_phrases = set(VOCAB_TELLS_EN) | set(VOCAB_TELLS_ZH)

    # Direct intersection check
    direct = lazy_phrases & ai_phrases
    assert not direct, f"direct overlap between lazy_writer and ai_tells: {direct}"

    # Substring check both ways — neither set should contain a phrase that is
    # a substring of any phrase in the other set (case-insensitive English).
    def _norm(s: str) -> str:
        return s.lower() if any(c.isascii() and c.isalpha() for c in s) else s

    overlaps: list[tuple[str, str]] = []
    for lp in lazy_phrases:
        nlp = _norm(lp)
        for ap in ai_phrases:
            nap = _norm(ap)
            if nlp in nap or nap in nlp:
                overlaps.append((lp, ap))
    assert not overlaps, (
        f"substring overlap between lazy_writer and ai_tells phrases: {overlaps}"
    )


def test_citation_format_optin(tmp_path: Path):
    """Phase C task 3.11: citation_format must be opt-in via project config
    `references.format`. Default behavior (no project config + no --refs)
    is empty findings + opt-out note. Explicit --refs or a project config
    declaring `references.format: typst|bibtex` opts the check in."""
    # Scenario A: no project config, no --refs -> opt-out
    target_a = tmp_path / "doc_a.typ"
    target_a.write_text("Body with #cite(missing_key) here.\n", encoding="utf-8")
    rc, payload, _ = run_check("citation_format.py", str(target_a))
    assert rc == 0
    assert payload.get("findings", []) == []
    assert payload.get("metadata", {}).get("note") == "opt-out"

    # Scenario B: explicit --refs opts in (back-compat)
    refs = tmp_path / "refs.yml"
    refs.write_text("present_key: foo\n", encoding="utf-8")
    rc, payload, _ = run_check(
        "citation_format.py", str(target_a), "--refs", str(refs)
    )
    assert rc == 0
    findings = payload.get("findings", [])
    assert any("missing_key" in f.get("issue", "") for f in findings), (
        f"expected dangling-cite finding with --refs, got {findings!r}"
    )

    # Scenario C: project config opts in -> finds malformed cite even without --refs
    repo = tmp_path / "repo_c"
    (repo / "docs").mkdir(parents=True)
    target_c = repo / "docs" / "paper.typ"
    target_c.write_text("Empty cite: #cite() malformed.\n", encoding="utf-8")
    cfg_yaml = repo / ".humane-prose-audit.yaml"
    cfg_yaml.write_text("references:\n  format: typst\n", encoding="utf-8")
    rc, payload, _ = run_check("citation_format.py", str(target_c))
    assert rc == 0, f"opt-in via project config failed: rc={rc}"
    findings = payload.get("findings", [])
    assert any("Malformed cite" in f.get("issue", "") for f in findings), (
        f"expected malformed-cite finding with project config opt-in, got {findings!r}"
    )


def test_citation_format_malformed_config_surfaces_error(tmp_path: Path):
    """Audit fix: malformed project YAML should surface a config-error note,
    not silently fall through to 'opt-out' (which masks operator typos)."""
    repo = tmp_path / "repo_d"
    (repo / "docs").mkdir(parents=True)
    target = repo / "docs" / "paper.typ"
    target.write_text("Body.\n", encoding="utf-8")
    cfg_yaml = repo / ".humane-prose-audit.yaml"
    # Invalid YAML — unterminated string after a colon
    cfg_yaml.write_text("references:\n  format: \"typst\nbroken: [unclosed\n", encoding="utf-8")
    rc, payload, _ = run_check("citation_format.py", str(target))
    assert rc == 0
    note = payload.get("metadata", {}).get("note", "")
    assert "failed YAML parse" in note, (
        f"expected config-error note distinguishing from 'opt-out', got {note!r}"
    )


def test_ai_tells_emits_metadata():
    """Audit fix: ai_tells must expose raw vocab + em-dash densities so
    Phase 4 humane-signal scoring can read them."""
    target = SKILL_ROOT / "tests" / "fixtures" / "ai-flavored.md"
    rc, payload, _ = run_check("ai_tells.py", str(target))
    assert rc == 0
    metadata = payload.get("metadata", {})
    assert "vocab_density_per_kchar" in metadata
    assert "em_density_per_kchar" in metadata
    assert "top_tells" in metadata
    assert isinstance(metadata["top_tells"], list)
    assert metadata["vocab_density_per_kchar"] > 0, (
        f"ai-flavored fixture should have non-zero AI-tell vocab density; got {metadata}"
    )
