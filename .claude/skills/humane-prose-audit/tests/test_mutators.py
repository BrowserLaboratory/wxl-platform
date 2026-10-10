"""Subprocess-level tests for the prose-audit mutators."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
MUTATORS_DIR = SKILL_ROOT / "mutators"
TYPO_INJECT = MUTATORS_DIR / "typo_inject.py"
SENTENCE_REORDER = MUTATORS_DIR / "sentence_reorder.py"
CITATION_STRIP = MUTATORS_DIR / "citation_strip.py"
SECTION_SWAP = MUTATORS_DIR / "section_swap.py"
RUN_FUZZ = MUTATORS_DIR / "run_fuzz.py"

TIMEOUT_S = 60


def _run(script: Path, target: Path, out_dir: Path, k: int = 5, seed: int = 0) -> dict:
    cmd = [
        sys.executable,
        str(script),
        str(target),
        "--k",
        str(k),
        "--out",
        str(out_dir),
        "--seed",
        str(seed),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    assert proc.returncode == 0, f"mutator failed: stderr={proc.stderr!r}"
    return json.loads(proc.stdout)


def test_typo_inject_produces_k_variants(tmp_path: Path) -> None:
    src = tmp_path / "input.txt"
    src.write_text(
        "The quick brown fox jumps over the lazy dog.\n"
        "Genetic algorithms explore search spaces stochastically.\n"
        "Memetic GA blends local search with population-level operators.\n",
        encoding="utf-8",
    )
    out_dir = tmp_path / "out"
    manifest = _run(TYPO_INJECT, src, out_dir, k=5, seed=42)
    assert manifest["mutator"] == "typo_inject"
    assert manifest["k"] == 5
    assert len(manifest["variants"]) == 5
    files = sorted(out_dir.iterdir())
    assert len(files) == 5
    original = src.read_text(encoding="utf-8")
    for variant_path in manifest["variants"]:
        text = Path(variant_path).read_text(encoding="utf-8")
        assert text != original, f"variant {variant_path} matched input"


def test_sentence_reorder_produces_k_variants(tmp_path: Path) -> None:
    src = tmp_path / "input.txt"
    src.write_text(
        "Alpha is the first sentence! Beta is the second sentence? Gamma is the third sentence!",
        encoding="utf-8",
    )
    out_dir = tmp_path / "out"
    manifest = _run(SENTENCE_REORDER, src, out_dir, k=5, seed=7)
    assert manifest["mutator"] == "sentence_reorder"
    assert manifest["k"] == 5
    assert len(manifest["variants"]) == 5
    files = sorted(out_dir.iterdir())
    assert len(files) == 5
    original = src.read_text(encoding="utf-8")
    differences = 0
    for variant_path in manifest["variants"]:
        text = Path(variant_path).read_text(encoding="utf-8")
        if text != original:
            differences += 1
    # With 3 distinct sentences and 5 seeded shuffles we expect at least one
    # variant to break ordering; tolerate occasional identity hits.
    assert differences >= 1


def test_citation_strip_reduces_cite_count(tmp_path: Path) -> None:
    src = tmp_path / "input.typ"
    src.write_text(
        "First cite(a) middle cite(b) more cite(c) then cite(d) finally cite(e).",
        encoding="utf-8",
    )
    out_dir = tmp_path / "out"
    manifest = _run(CITATION_STRIP, src, out_dir, k=5, seed=3)
    assert manifest["mutator"] == "citation_strip"
    assert len(manifest["variants"]) == 5
    for variant_path in manifest["variants"]:
        text = Path(variant_path).read_text(encoding="utf-8")
        # citation_strip should never *add* citations.
        assert text.count("cite(") <= 5


_SECTION_SWAP_MD = (
    "Preamble line one.\n"
    "Preamble line two.\n"
    "\n"
    "## Alpha\n"
    "Alpha body sentence one. Alpha body sentence two.\n"
    "\n"
    "## Beta\n"
    "Beta body sentence one. Beta body sentence two.\n"
    "\n"
    "## Gamma\n"
    "Gamma body sentence one. Gamma body sentence two.\n"
    "\n"
    "## Delta\n"
    "Delta body sentence one. Delta body sentence two.\n"
)


def _run_section_swap(target: Path, out_dir: Path, k: int, seed: int) -> subprocess.CompletedProcess:
    cmd = [
        sys.executable,
        str(SECTION_SWAP),
        str(target),
        "--k",
        str(k),
        "--out",
        str(out_dir),
        "--seed",
        str(seed),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    assert proc.returncode == 0, f"section_swap failed: stderr={proc.stderr!r}"
    return proc


def test_section_swap_seeded(tmp_path: Path) -> None:
    src = tmp_path / "input.md"
    src.write_text(_SECTION_SWAP_MD, encoding="utf-8")
    out1 = tmp_path / "out1"
    out2 = tmp_path / "out2"
    _run_section_swap(src, out1, k=2, seed=42)
    _run_section_swap(src, out2, k=2, seed=42)
    for idx in (1, 2):
        a = (out1 / f"section_swap_{idx}.md").read_bytes()
        b = (out2 / f"section_swap_{idx}.md").read_bytes()
        assert a == b, f"variant {idx} not byte-identical across runs with same seed"


def test_section_swap_preserves_intra_section_content(tmp_path: Path) -> None:
    src = tmp_path / "input.md"
    src.write_text(_SECTION_SWAP_MD, encoding="utf-8")
    out_dir = tmp_path / "out"
    _run_section_swap(src, out_dir, k=4, seed=7)
    section_bodies = [
        "Alpha body sentence one. Alpha body sentence two.",
        "Beta body sentence one. Beta body sentence two.",
        "Gamma body sentence one. Gamma body sentence two.",
        "Delta body sentence one. Delta body sentence two.",
    ]
    variant_texts = [
        (out_dir / f"section_swap_{idx}.md").read_text(encoding="utf-8")
        for idx in range(1, 5)
    ]
    for body in section_bodies:
        assert any(body in text for text in variant_texts), (
            f"section body {body!r} missing from every variant"
        )


def test_section_swap_different_seeds_can_differ(tmp_path: Path) -> None:
    src = tmp_path / "input.md"
    src.write_text(_SECTION_SWAP_MD, encoding="utf-8")
    out_a = tmp_path / "seed1"
    out_b = tmp_path / "seed2"
    _run_section_swap(src, out_a, k=1, seed=1)
    _run_section_swap(src, out_b, k=1, seed=2)
    a = (out_a / "section_swap_1.md").read_bytes()
    b = (out_b / "section_swap_1.md").read_bytes()
    assert a != b, "different seeds yielded identical output (collision possible but unlikely with 4 sections)"


def test_section_swap_preamble_stays_first(tmp_path: Path) -> None:
    src = tmp_path / "input.md"
    src.write_text(_SECTION_SWAP_MD, encoding="utf-8")
    out_dir = tmp_path / "out"
    _run_section_swap(src, out_dir, k=4, seed=11)
    for idx in range(1, 5):
        text = (out_dir / f"section_swap_{idx}.md").read_text(encoding="utf-8")
        # Preamble must appear before the first H2 heading.
        first_h2 = text.find("\n## ")
        assert first_h2 != -1, "expected at least one H2 in variant output"
        head = text[:first_h2]
        assert "Preamble line one." in head
        assert "Preamble line two." in head


def test_section_swap_no_sections_passthrough(tmp_path: Path) -> None:
    src = tmp_path / "plain.md"
    plain = "Just a paragraph.\n\nAnother paragraph with no headings.\n"
    src.write_text(plain, encoding="utf-8")
    out_dir = tmp_path / "out"
    _run_section_swap(src, out_dir, k=1, seed=99)
    out_text = (out_dir / "section_swap_1.md").read_bytes()
    assert out_text == plain.encode("utf-8")


def test_run_fuzz_outputs_robust_fragile_keys(tmp_path: Path) -> None:
    src = tmp_path / "input.typ"
    src.write_text(
        "Memetic genetic algorithms balance exploration and exploitation cite(a). "
        "Local search refines candidate tours cite(b). "
        "Selection pressure prevents premature convergence.\n",
        encoding="utf-8",
    )
    cmd = [sys.executable, str(RUN_FUZZ), str(src), "--k", "3"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    assert proc.returncode == 0, f"run_fuzz failed: stderr={proc.stderr!r}"
    payload = json.loads(proc.stdout)
    assert "robust_metrics" in payload
    assert "fragile_metrics" in payload
    assert isinstance(payload["robust_metrics"], list)
    assert isinstance(payload["fragile_metrics"], list)


def test_run_fuzz_includes_section_swap(tmp_path: Path) -> None:
    """Phase D task 4.6: run_fuzz must register section_swap as a fixed
    mutator so its variants flow through the per-check change-ratio
    matrix alongside typo_inject / sentence_reorder / citation_strip."""
    # Static reflection: the MUTATORS tuple in run_fuzz.py must include section_swap.
    text = RUN_FUZZ.read_text(encoding="utf-8")
    assert "section_swap" in text, (
        "run_fuzz.py MUTATORS tuple must include 'section_swap' after Phase D task 4.6"
    )

    # Behavioral check: run a fuzz pass on a multi-section markdown target and
    # assert at least one `<check>:section_swap` key appears in `details`.
    src = tmp_path / "multi_section.md"
    src.write_text(
        "Intro paragraph with citation cite(a) here.\n\n"
        "## Section One\n\n"
        "Body of section one with citation cite(b).\n\n"
        "## Section Two\n\n"
        "Body of section two; some content with 中國大陸 用詞 like 軟件 軟件 軟件.\n\n"
        "## Section Three\n\n"
        "Body of section three with placeholder TODO inside.\n",
        encoding="utf-8",
    )
    cmd = [sys.executable, str(RUN_FUZZ), str(src), "--k", "2"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    assert proc.returncode == 0, f"run_fuzz failed: stderr={proc.stderr!r}"
    payload = json.loads(proc.stdout)
    section_swap_pairs = [k for k in payload.get("details", {}) if k.endswith(":section_swap")]
    assert section_swap_pairs, (
        f"expected at least one <check>:section_swap pair in details; "
        f"got details keys: {list(payload.get('details', {}).keys())!r}"
    )


def test_section_swap_skips_fenced_code_headings(tmp_path: Path) -> None:
    """Phase D audit fix (Lens 1 [High]): H1/H2 lines INSIDE a fenced code
    block must not be treated as section boundaries. Failing this would
    let section_swap rearrange content inside a code fence and corrupt
    the variant's Markdown structure."""
    src = tmp_path / "fenced.md"
    src.write_text(
        "## Real Section One\n\n"
        "Some prose introducing a code block.\n\n"
        "```markdown\n"
        "## Example Heading Inside Fence\n"
        "This line should not be treated as a section break.\n"
        "```\n\n"
        "More prose after the fence.\n\n"
        "## Real Section Two\n\n"
        "Body of section two.\n",
        encoding="utf-8",
    )
    out_dir = tmp_path / "out"
    out_dir.mkdir()
    cmd = [
        sys.executable,
        str(SECTION_SWAP),
        str(src),
        "--k",
        "1",
        "--seed",
        "42",
        "--out",
        str(out_dir),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    assert proc.returncode == 0, f"section_swap failed: stderr={proc.stderr!r}"
    out_text = (out_dir / "section_swap_1.md").read_text(encoding="utf-8")
    # The fenced ## Example must remain INSIDE the code block intact (not hoisted).
    assert "```markdown\n## Example Heading Inside Fence" in out_text, (
        "section inside fenced code block was hoisted out — fence state tracking broken"
    )
    # Only the two real sections should be swappable; both must appear.
    assert "## Real Section One" in out_text
    assert "## Real Section Two" in out_text
