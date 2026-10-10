"""Test suite for scripts/wiki_integrity.py.

Each test synthesises a minimal wiki + checks + rationales layout under a
tmp_path and monkey-patches the module-level path constants so the
production tree at humane-prose-audit/wiki/ is never touched.

Covered scenarios:
  - --check-frontmatter: passes when all abstracts have valid four-field
    provenance frontmatter; fails on missing frontmatter, empty-value tier,
    malformed ISO-8601 instants, and invalid tier values.
  - --area <name>: passes on valid concept pages with resolvable refs;
    fails when frontmatter `area` mismatches the directory, refs is empty,
    or refs point at non-existent files.
  - --check-methods: passes when both required methods pages exist with
    resolvable refs; fails when a required page is missing.
  - --check-docstrings: passes when every checks/*.py module docstring
    references at least one `wiki/concepts/<area>/<page>.md` path; fails
    when a check is missing the reference.
  - preprint usage limits: passes when at least one cited paper is
    peer-reviewed; fails when every cited paper has `tier: preprint`.
  - default (no flag): exits 0 only when every sub-check passes.
"""
from __future__ import annotations

import importlib
import sys
from datetime import datetime
from pathlib import Path

import pytest
import yaml


SKILL_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_ROOT / "scripts"


@pytest.fixture
def wi(monkeypatch, tmp_path):
    """Import wiki_integrity with module-level path constants pinned to tmp_path."""
    monkeypatch.syspath_prepend(str(SCRIPTS_DIR))
    # Drop any previously cached import so the module is re-evaluated with
    # the fresh sys.path. The actual path constants are patched on the live
    # module instance returned to the test.
    sys.modules.pop("wiki_integrity", None)
    mod = importlib.import_module("wiki_integrity")
    wiki = tmp_path / "wiki"
    monkeypatch.setattr(mod, "SKILL_ROOT", tmp_path)
    monkeypatch.setattr(mod, "WIKI_DIR", wiki)
    monkeypatch.setattr(mod, "PAPERS_DIR", wiki / "raw" / "papers")
    monkeypatch.setattr(mod, "CONCEPTS_DIR", wiki / "concepts")
    monkeypatch.setattr(mod, "METHODS_DIR", wiki / "methods")
    monkeypatch.setattr(mod, "CHECKS_DIR", tmp_path / "checks")
    monkeypatch.setattr(mod, "RATIONALES_DIR", tmp_path / "rationales")
    return mod


def _write(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def _abstract(tier: str = "peer-reviewed-published",
              review_evidence: str = "ICML 2024 acceptance",
              ingested_at: str = "2026-05-12T00:00:00Z",
              ingested_by: str = "test-suite") -> str:
    return (
        "---\n"
        f"tier: {tier}\n"
        f"review_evidence: \"{review_evidence}\"\n"
        f"ingested_at: {ingested_at}\n"
        f"ingested_by: {ingested_by}\n"
        "---\n\n"
        "# Paper Title\n\nbody\n"
    )


def _concept(area: str, refs: list[str]) -> str:
    fm = {"title": "Stub Concept", "area": area, "refs": refs}
    return "---\n" + yaml.safe_dump(fm, sort_keys=False) + "---\n\ncontent\n"


def _method(refs: list[str]) -> str:
    fm = {"title": "Stub Method", "kind": "method", "refs": refs}
    return "---\n" + yaml.safe_dump(fm, sort_keys=False) + "---\n\ncontent\n"


def _check_module(ref: str = "wiki/concepts/ai-tells/em-dash-overuse.md") -> str:
    return (
        "#!/usr/bin/env python3\n"
        '"""Stub check.\n\n'
        f"See: {ref}\n"
        '"""\n'
        "if __name__ == '__main__':\n    pass\n"
    )


# ---------------------------------------------------------------------------
# --check-frontmatter


def test_check_frontmatter_passes_on_valid_abstract(wi, tmp_path):
    _write(wi.PAPERS_DIR / "arXiv-1234.5678" / "abstract.md", _abstract())
    assert wi.check_frontmatter() == 0


def test_check_frontmatter_fails_missing_frontmatter(wi):
    _write(wi.PAPERS_DIR / "arXiv-1234.5678" / "abstract.md", "no frontmatter here")
    assert wi.check_frontmatter() == 2


def test_check_frontmatter_fails_empty_tier(wi):
    body = (
        "---\n"
        "tier:\n"
        "review_evidence: \"ICML 2024\"\n"
        "ingested_at: 2026-05-12T00:00:00Z\n"
        "ingested_by: test\n"
        "---\n"
    )
    _write(wi.PAPERS_DIR / "arXiv-9999.0001" / "abstract.md", body)
    assert wi.check_frontmatter() == 2


def test_check_frontmatter_fails_invalid_tier(wi):
    _write(wi.PAPERS_DIR / "x" / "abstract.md", _abstract(tier="peer-reviewed"))
    assert wi.check_frontmatter() == 2


def test_check_frontmatter_fails_malformed_timestamp(wi):
    body = (
        "---\n"
        "tier: peer-reviewed-published\n"
        'review_evidence: "ICML 2024"\n'
        "ingested_at: 2026-99-99T99:99:99Z\n"
        "ingested_by: test\n"
        "---\n"
    )
    _write(wi.PAPERS_DIR / "x" / "abstract.md", body)
    assert wi.check_frontmatter() == 2


def test_check_frontmatter_infrastructure_error_when_papers_dir_missing(wi):
    assert wi.check_frontmatter() == 3


# ---------------------------------------------------------------------------
# --area


def test_check_area_passes_on_valid_pages(wi):
    paper = wi.PAPERS_DIR / "arXiv-1234.5678" / "abstract.md"
    _write(paper, _abstract())
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "page-a.md",
        _concept("ai-tells", ["wiki/raw/papers/arXiv-1234.5678/abstract.md"]),
    )
    assert wi.check_area("ai-tells") == 0


def test_check_area_fails_when_directory_missing(wi):
    assert wi.check_area("ai-tells") == 3


def test_check_area_fails_on_area_mismatch(wi):
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "page.md",
        _concept("argumentation", ["wiki/raw/papers/x/abstract.md"]),
    )
    # ref also fails to resolve so two distinct failures stack
    assert wi.check_area("ai-tells") == 2


def test_check_area_fails_on_unresolvable_ref(wi):
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "page.md",
        _concept("ai-tells", ["wiki/raw/papers/does-not-exist/abstract.md"]),
    )
    assert wi.check_area("ai-tells") == 2


def test_check_area_fails_on_empty_refs(wi):
    _write(wi.CONCEPTS_DIR / "ai-tells" / "page.md", _concept("ai-tells", []))
    assert wi.check_area("ai-tells") == 2


# ---------------------------------------------------------------------------
# --check-methods


def test_check_methods_passes_when_both_present_with_refs(wi):
    _write(wi.PAPERS_DIR / "arXiv-1234.5678" / "abstract.md", _abstract())
    for name in ("humane-signal-pipeline.md", "consensus-severity.md"):
        _write(
            wi.METHODS_DIR / name,
            _method(["wiki/raw/papers/arXiv-1234.5678/abstract.md"]),
        )
    assert wi.check_methods() == 0


def test_check_methods_fails_when_required_page_missing(wi):
    _write(
        wi.METHODS_DIR / "humane-signal-pipeline.md",
        _method(["wiki/raw/papers/x/abstract.md"]),
    )
    # consensus-severity.md absent
    assert wi.check_methods() == 2


# ---------------------------------------------------------------------------
# --check-docstrings


def test_check_docstrings_passes_when_ref_present_and_resolves(wi):
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "em-dash-overuse.md",
        _concept("ai-tells", ["wiki/raw/papers/x/abstract.md"]),
    )
    _write(wi.PAPERS_DIR / "x" / "abstract.md", _abstract())
    _write(wi.CHECKS_DIR / "stub_check.py", _check_module())
    assert wi.check_docstrings() == 0


def test_check_docstrings_fails_when_docstring_lacks_ref(wi):
    _write(
        wi.CHECKS_DIR / "stub_check.py",
        "#!/usr/bin/env python3\n\"\"\"No wiki ref here.\"\"\"\n",
    )
    assert wi.check_docstrings() == 2


def test_check_docstrings_fails_when_ref_points_nowhere(wi):
    _write(wi.CHECKS_DIR / "stub_check.py", _check_module("wiki/concepts/ai-tells/does-not-exist.md"))
    assert wi.check_docstrings() == 2


# ---------------------------------------------------------------------------
# preprint usage limits


def test_preprint_limits_passes_when_at_least_one_peer_reviewed(wi):
    _write(
        wi.PAPERS_DIR / "arXiv-preprint" / "abstract.md",
        _abstract(tier="preprint"),
    )
    _write(
        wi.PAPERS_DIR / "arXiv-published" / "abstract.md",
        _abstract(tier="peer-reviewed-published"),
    )
    _write(
        wi.RATIONALES_DIR / "rule-a.md",
        "see wiki/raw/papers/arXiv-preprint and wiki/raw/papers/arXiv-published",
    )
    assert wi.check_preprint_limits() == 0


def test_preprint_limits_fails_when_only_preprints_cited(wi):
    _write(wi.PAPERS_DIR / "arXiv-a" / "abstract.md", _abstract(tier="preprint"))
    _write(wi.PAPERS_DIR / "arXiv-b" / "abstract.md", _abstract(tier="preprint"))
    _write(
        wi.RATIONALES_DIR / "rule-b.md",
        "only preprints: wiki/raw/papers/arXiv-a/abstract.md wiki/raw/papers/arXiv-b/abstract.md",
    )
    assert wi.check_preprint_limits() == 2


def test_preprint_limits_skips_rationales_with_no_paper_refs(wi):
    # Rationales without paper refs are not part of this check's contract.
    _write(wi.RATIONALES_DIR / "rule-c.md", "no paper refs in this rationale")
    assert wi.check_preprint_limits() == 0


# ---------------------------------------------------------------------------
# default full run


def test_full_run_passes_when_everything_valid(wi):
    paper = wi.PAPERS_DIR / "arXiv-x" / "abstract.md"
    _write(paper, _abstract())
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "em-dash-overuse.md",
        _concept("ai-tells", ["wiki/raw/papers/arXiv-x/abstract.md"]),
    )
    for name in ("humane-signal-pipeline.md", "consensus-severity.md"):
        _write(
            wi.METHODS_DIR / name,
            _method(["wiki/raw/papers/arXiv-x/abstract.md"]),
        )
    _write(wi.CHECKS_DIR / "stub_check.py", _check_module())
    _write(
        wi.RATIONALES_DIR / "rule-a.md",
        "supported by wiki/raw/papers/arXiv-x/abstract.md",
    )
    assert wi.run_all() == 0


def test_full_run_fails_when_one_subcheck_fails(wi):
    paper = wi.PAPERS_DIR / "arXiv-x" / "abstract.md"
    _write(paper, _abstract())
    # area mismatch — subcheck will fail
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "page.md",
        _concept("WRONG-AREA", ["wiki/raw/papers/arXiv-x/abstract.md"]),
    )
    for name in ("humane-signal-pipeline.md", "consensus-severity.md"):
        _write(wi.METHODS_DIR / name, _method(["wiki/raw/papers/arXiv-x/abstract.md"]))
    _write(wi.CHECKS_DIR / "stub_check.py", _check_module())
    rc = wi.run_all()
    assert rc != 0


# ---------------------------------------------------------------------------
# Path-traversal / escape-hatch defenses (Phase G audit fixes)


@pytest.mark.parametrize(
    "ref",
    [
        # Containment violations the original Phase G code would have admitted.
        "wiki/../../../etc/passwd.md",
        "wiki/concepts/../../raw/papers/x/abstract.md",
        "wiki/concepts/ai-tells/../escape.md",
        "wiki/.hidden/escape.md",
        # Missing-prefix forms must also be rejected — no absolute-path
        # escape hatch.
        "/etc/passwd",
        "relative/path/page.md",
        "",
    ],
)
def test_resolve_wiki_ref_rejects_path_traversal_and_non_wiki_refs(wi, ref):
    assert wi._resolve_wiki_ref(ref) is None
    assert wi._ref_resolvable(ref) is False


def test_resolve_wiki_ref_returns_path_for_legitimate_ref(wi):
    target = wi.WIKI_DIR / "raw" / "papers" / "x" / "abstract.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("hi", encoding="utf-8")
    resolved = wi._resolve_wiki_ref("wiki/raw/papers/x/abstract.md")
    assert resolved is not None
    assert wi._ref_resolvable("wiki/raw/papers/x/abstract.md") is True


def test_check_area_rejects_slash_injection(wi):
    # `--area` of `concepts/ai-tells` (with a slash) would have walked into
    # the wrong tree under the original `CONCEPTS_DIR / area` join.
    assert wi.check_area("concepts/ai-tells") == 3
    assert wi.check_area("..") == 3
    assert wi.check_area(".hidden") == 3
    assert wi.check_area("with\\backslash") == 3


def test_concept_page_with_traversal_ref_fails(wi):
    _write(
        wi.CONCEPTS_DIR / "ai-tells" / "evil.md",
        _concept("ai-tells", ["wiki/../../../etc/passwd.md"]),
    )
    assert wi.check_area("ai-tells") == 2


def test_rationale_paper_refs_rejects_dotdot_segments(wi):
    # The regex MUST NOT capture `..` as a paper-dir name. The body below
    # would have been a working bypass under the original regex.
    body = "supported by wiki/raw/papers/../../../tmp/abstract.md"
    _write(wi.RATIONALES_DIR / "x.md", body)
    assert wi._rationale_paper_refs(wi.RATIONALES_DIR / "x.md") == []


def test_module_docstring_distinguishes_syntax_error_from_missing(wi):
    # A check module that won't parse should report `module won't parse: ...`
    # rather than the generic "no docstring" message — preventing the
    # confused-developer trap from the audit.
    _write(
        wi.CHECKS_DIR / "broken.py",
        "this is not python: def def def\n",
    )
    rc = wi.check_docstrings()
    assert rc == 2
