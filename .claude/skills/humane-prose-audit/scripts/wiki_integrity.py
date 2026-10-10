#!/usr/bin/env python3
"""Wiki integrity validator for humane-prose-audit.

Implements the end-to-end traceability contract between Preflight checks,
wiki concept pages, ingested papers, and rationale documents. Used both at
the CLI and from the pre-commit hook.

Supported invocations:
  --check-frontmatter           Phase F task 6.8 — every wiki/raw/papers/*/
                                abstract.md has a valid four-field provenance
                                frontmatter.
  --area <name>                 Phase G task 7.x — every concept page under
                                wiki/concepts/<name>/ has frontmatter, declares
                                area: <name>, and lists at least one ref that
                                resolves to an existing paper or concept page.
  --check-methods               Phase G task 7.6 — both methods pages exist
                                and have at least one resolvable ref.
  --check-docstrings            Phase G task 7.7 — every checks/<rule>.py
                                module docstring mentions at least one wiki
                                concept-page path.
  (no flag)                     Phase G task 7.8 — run all of the above plus
                                the arXiv preprint usage-limit check.

The preprint usage-limit check (Phase G task 7.8) reads `rationales/<rule>.md`
files, extracts paper references of the form `wiki/raw/papers/<id>`, and
fails when a rationale cites only papers whose `tier:` frontmatter is
`preprint`. This enforces the spec rule "a preprint MUST NOT be the sole
rationale for any check whose finding severity is `critical`" — pragmatically
applied to every rationale because the validator does not parse severity
from the check source.

Known limitation (Phase H or later): rationales that cite zero papers
silently pass this check. The spec literally requires Critical-rule
rationales to cite >= 1 non-preprint paper, but this validator does not
parse check severity from `checks/<rule>.py`. Adding a `# severity:
critical` marker to check modules and gating empty-citation rationales by
that marker is the planned follow-up; until then, human review is the only
backstop for the empty-citation case.

Exit codes:
- 0 on success (all selected checks pass)
- 2 on validation failure (≥ 1 violation)
- 3 on infrastructure error (wiki/checks/rationales directories missing,
  malformed YAML, etc.)
"""
from __future__ import annotations

import argparse
import ast
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

import yaml


SKILL_ROOT = Path(__file__).resolve().parent.parent
WIKI_DIR = SKILL_ROOT / "wiki"
PAPERS_DIR = WIKI_DIR / "raw" / "papers"
CONCEPTS_DIR = WIKI_DIR / "concepts"
METHODS_DIR = WIKI_DIR / "methods"
CHECKS_DIR = SKILL_ROOT / "checks"
RATIONALES_DIR = SKILL_ROOT / "rationales"

REQUIRED_FIELDS = ("tier", "review_evidence", "ingested_at", "ingested_by")
# Closed enum for the `tier` frontmatter field. Adding a new value also
# requires updating the venue-tier mapping in
# `humane-prose-audit/wiki/venues.yaml` and the preprint-usage check below.
VALID_TIERS = {"preprint", "peer-reviewed-accepted", "peer-reviewed-published"}

REQUIRED_METHODS = ("humane-signal-pipeline.md", "consensus-severity.md")

_FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
# Match `wiki/<rest>` paths in any text. Tolerates Markdown link syntax,
# inline code fencing, leading list dashes, and the YAML list-item form.
# Each path segment MUST start with an alphanumeric — rejects `..` and
# leading-dot escapes the validator's path-traversal defense relies on.
_REF_RE = re.compile(
    r"wiki/(?:[A-Za-z0-9][A-Za-z0-9._-]*/)*[A-Za-z0-9][A-Za-z0-9._-]*\.md"
)
# Stricter regex for rationale paper references: same single-segment shape,
# rejects `..` / leading-dot which would otherwise resolve outside PAPERS_DIR.
_RATIONALE_PAPER_RE = re.compile(r"wiki/raw/papers/([A-Za-z0-9][A-Za-z0-9._-]*)")


# ---------------------------------------------------------------------------
# Shared parsing helpers


def _parse_frontmatter(text: str) -> dict | None:
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None
    return yaml.safe_load(m.group(1)) or {}


def _safe_parse_frontmatter(path: Path) -> tuple[dict | None, str | None]:
    """Return (frontmatter_dict, error_message). One of the two is always None.

    The error string is suitable for direct inclusion in a finding line.
    """
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return None, f"unreadable: {exc}"
    try:
        fm = _parse_frontmatter(text)
    except (yaml.YAMLError, ValueError) as exc:
        return None, f"malformed YAML frontmatter: {exc}"
    if fm is None:
        return None, "missing YAML frontmatter (no leading `---` block)"
    return fm, None


def _is_empty(value: object) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def _resolve_wiki_ref(ref: str) -> Path | None:
    """Resolve a `wiki/...` reference string to an absolute Path *inside WIKI_DIR*.

    The `wiki/` prefix is a logical root mapping to the wiki target directory
    (``humane-prose-audit/wiki/``). Returns ``None`` for any ref that is
    missing the prefix, contains a `..` segment, or whose resolved path would
    escape WIKI_DIR — these are the only two failure modes that need to be
    treated as "unresolvable" by callers, so a single sentinel suffices.

    Containment is enforced via realpath comparison so symlink trees inside
    the wiki cannot smuggle a reference out.
    """
    if not ref.startswith("wiki/"):
        return None
    rest = ref[len("wiki/"):]
    if not rest:
        return None
    # Reject any path segment that is `..` or starts with `.` so we can never
    # walk above WIKI_DIR or into a hidden dotfile tree.
    parts = rest.split("/")
    for p in parts:
        if p in ("", "..") or p.startswith("."):
            return None
    candidate = (WIKI_DIR / rest).resolve()
    wiki_root = WIKI_DIR.resolve()
    try:
        candidate.relative_to(wiki_root)
    except ValueError:
        return None
    return candidate


def _ref_resolvable(ref: str) -> bool:
    """True iff ``ref`` resolves to an existing file inside WIKI_DIR."""
    target = _resolve_wiki_ref(ref)
    return target is not None and target.is_file()


# ---------------------------------------------------------------------------
# Frontmatter validator (Phase F task 6.8)


def _validate_iso8601(value: object) -> str | None:
    if isinstance(value, datetime):
        serialized = value.strftime("%Y-%m-%dT%H:%M:%S") + (
            "Z" if value.tzinfo is None or value.utcoffset().total_seconds() == 0
            else value.strftime("%z")
        )
    elif isinstance(value, str):
        serialized = value
    else:
        return f"ingested_at must be a string or datetime, got {type(value).__name__}"
    try:
        parsed = datetime.fromisoformat(serialized.replace("Z", "+00:00"))
    except ValueError as exc:
        return f"ingested_at is not a valid ISO-8601 instant ({exc}): {serialized!r}"
    if parsed.year < 1900 or parsed.year > 2100:
        return f"ingested_at year {parsed.year} is out of the plausible 1900–2100 range"
    return None


def _validate_one_abstract(abstract_path: Path) -> list[str]:
    fm, err = _safe_parse_frontmatter(abstract_path)
    if err is not None:
        return [err]
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in fm:
            errors.append(f"missing required field: {field}")
        elif _is_empty(fm[field]):
            errors.append(f"required field {field!r} is empty")
    tier = fm.get("tier")
    if not _is_empty(tier) and tier not in VALID_TIERS:
        errors.append(
            f"invalid tier value: {tier!r} (must be one of {sorted(VALID_TIERS)})"
        )
    ingested_at = fm.get("ingested_at")
    if not _is_empty(ingested_at):
        msg = _validate_iso8601(ingested_at)
        if msg:
            errors.append(msg)
    return errors


def check_frontmatter() -> int:
    if not PAPERS_DIR.is_dir():
        print(f"infrastructure error: {PAPERS_DIR} missing", file=sys.stderr)
        return 3
    paper_dirs = sorted(d for d in PAPERS_DIR.iterdir() if d.is_dir())
    if not paper_dirs:
        print(f"no papers under {PAPERS_DIR} — nothing to check")
        return 0
    total_errors = 0
    for d in paper_dirs:
        abstract = d / "abstract.md"
        if not abstract.is_file():
            print(f"[FAIL] frontmatter/{d.name}: abstract.md missing")
            total_errors += 1
            continue
        errors = _validate_one_abstract(abstract)
        if errors:
            for err in errors:
                print(f"[FAIL] frontmatter/{d.name}: {err}")
            total_errors += len(errors)
        else:
            print(f"[ OK ] frontmatter/{d.name}")
    if total_errors:
        return 2
    return 0


# ---------------------------------------------------------------------------
# Concept-area validator (Phase G task 7.1–7.5)


def _validate_concept_page(page: Path, area: str) -> list[str]:
    fm, err = _safe_parse_frontmatter(page)
    if err is not None:
        return [err]
    errors: list[str] = []
    declared_area = fm.get("area")
    if declared_area != area:
        errors.append(
            f"frontmatter area: {declared_area!r} does not match directory area {area!r}"
        )
    refs = fm.get("refs")
    if not isinstance(refs, list) or not refs:
        errors.append("frontmatter must declare a non-empty `refs:` list")
        return errors
    resolvable = 0
    for ref in refs:
        if not isinstance(ref, str):
            errors.append(f"ref must be a string, got {type(ref).__name__}: {ref!r}")
            continue
        if _ref_resolvable(ref):
            resolvable += 1
        else:
            errors.append(
                f"ref does not resolve to a file under wiki/: {ref!r} "
                "(use the wiki/ logical prefix, no `..` segments, file must exist)"
            )
    if resolvable < 1:
        errors.append("at least one ref must resolve to an existing file")
    return errors


def _valid_area_name(area: str) -> bool:
    """Reject `--area` values that would escape CONCEPTS_DIR or hit dotfiles."""
    if not area or area in (".", ".."):
        return False
    if "/" in area or "\\" in area or area.startswith("."):
        return False
    return True


def check_area(area: str) -> int:
    if not _valid_area_name(area):
        print(
            f"infrastructure error: concept area {area!r} is not a valid single "
            "directory name (no slashes, no leading dot, no `..`)",
            file=sys.stderr,
        )
        return 3
    area_dir = CONCEPTS_DIR / area
    if not area_dir.is_dir():
        print(f"infrastructure error: concept area {area!r} missing at {area_dir}", file=sys.stderr)
        return 3
    pages = sorted(p for p in area_dir.iterdir() if p.suffix == ".md")
    if not pages:
        print(f"[FAIL] area/{area}: no .md pages found")
        return 2
    total_errors = 0
    for page in pages:
        errors = _validate_concept_page(page, area)
        if errors:
            for err in errors:
                print(f"[FAIL] area/{area}/{page.name}: {err}")
            total_errors += len(errors)
        else:
            print(f"[ OK ] area/{area}/{page.name}")
    return 2 if total_errors else 0


# ---------------------------------------------------------------------------
# Methods validator (Phase G task 7.6)


def check_methods() -> int:
    if not METHODS_DIR.is_dir():
        print(f"infrastructure error: {METHODS_DIR} missing", file=sys.stderr)
        return 3
    total_errors = 0
    for name in REQUIRED_METHODS:
        page = METHODS_DIR / name
        if not page.is_file():
            print(f"[FAIL] methods/{name}: missing required methods page")
            total_errors += 1
            continue
        fm, err = _safe_parse_frontmatter(page)
        if err is not None:
            print(f"[FAIL] methods/{name}: {err}")
            total_errors += 1
            continue
        refs = fm.get("refs")
        if not isinstance(refs, list) or not refs:
            print(f"[FAIL] methods/{name}: frontmatter must declare a non-empty `refs:` list")
            total_errors += 1
            continue
        resolvable = sum(
            1 for r in refs if isinstance(r, str) and _ref_resolvable(r)
        )
        if resolvable < 1:
            print(f"[FAIL] methods/{name}: at least one ref must resolve to an existing file")
            total_errors += 1
        else:
            print(f"[ OK ] methods/{name}")
    return 2 if total_errors else 0


# ---------------------------------------------------------------------------
# Docstring-reference validator (Phase G task 7.7)


def _module_docstring(py_path: Path) -> tuple[str | None, str | None]:
    """Return (docstring, error_message). ``error_message`` is set when the
    module won't parse, distinguishing "no docstring" from "broken syntax".
    """
    try:
        source = py_path.read_text(encoding="utf-8")
    except OSError as exc:
        return None, f"unreadable: {exc}"
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return None, f"module won't parse: {exc}"
    return ast.get_docstring(tree), None


def check_docstrings() -> int:
    if not CHECKS_DIR.is_dir():
        print(f"infrastructure error: {CHECKS_DIR} missing", file=sys.stderr)
        return 3
    check_files = sorted(p for p in CHECKS_DIR.glob("*.py") if not p.name.startswith("_"))
    if not check_files:
        print(f"[FAIL] docstrings: no check modules found under {CHECKS_DIR}")
        return 2
    total_errors = 0
    for py in check_files:
        doc, err = _module_docstring(py)
        if err is not None:
            print(f"[FAIL] docstrings/{py.name}: {err}")
            total_errors += 1
            continue
        if not doc:
            print(f"[FAIL] docstrings/{py.name}: module has no docstring")
            total_errors += 1
            continue
        refs = _REF_RE.findall(doc)
        concept_refs = [r for r in refs if r.startswith("wiki/concepts/")]
        if not concept_refs:
            print(
                f"[FAIL] docstrings/{py.name}: docstring must reference at least one "
                "`wiki/concepts/<area>/<page>.md` path "
                "(add `See: wiki/concepts/<area>/<page>.md` to the module docstring; "
                "see `checks/ai_tells.py` for an example)"
            )
            total_errors += 1
            continue
        unresolved = [r for r in concept_refs if not _ref_resolvable(r)]
        if unresolved:
            for r in unresolved:
                print(f"[FAIL] docstrings/{py.name}: referenced page does not exist: {r}")
                total_errors += 1
        else:
            print(f"[ OK ] docstrings/{py.name}")
    return 2 if total_errors else 0


# ---------------------------------------------------------------------------
# arXiv preprint usage limit (Phase G task 7.8)


def _paper_tier(paper_dir_name: str) -> str | None:
    # Defense-in-depth: even though _RATIONALE_PAPER_RE rejects `..` and
    # leading-dot segments at capture time, validate again here so a future
    # direct caller can't smuggle one in.
    if (
        not paper_dir_name
        or paper_dir_name in (".", "..")
        or paper_dir_name.startswith(".")
        or "/" in paper_dir_name
    ):
        return None
    abstract = PAPERS_DIR / paper_dir_name / "abstract.md"
    if not abstract.is_file():
        return None
    fm, _err = _safe_parse_frontmatter(abstract)
    # _safe_parse_frontmatter guarantees fm-None ↔ err-set; we don't need
    # the error string here but assert the invariant rather than discarding it.
    if fm is None:
        return None
    return fm.get("tier")


def _rationale_paper_refs(rationale: Path) -> list[str]:
    """Return a list of paper-dir names referenced from a rationale page.

    Names are validated via the same single-segment regex used by the
    docstring/area resolution path, so `..` / `.hidden` / multi-segment
    captures are rejected at the parsing layer.
    """
    try:
        text = rationale.read_text(encoding="utf-8")
    except OSError:
        return []
    names: list[str] = []
    for m in _RATIONALE_PAPER_RE.finditer(text):
        name = m.group(1)
        if name and name not in names:
            names.append(name)
    return names


def check_preprint_limits() -> int:
    if not RATIONALES_DIR.is_dir():
        # Rationales are scaffolded in earlier phases — if the directory is
        # absent, surface that as an infrastructure error rather than a clean
        # pass, since the validator cannot say anything meaningful.
        print(f"infrastructure error: {RATIONALES_DIR} missing", file=sys.stderr)
        return 3
    total_errors = 0
    checked = 0
    for r in sorted(RATIONALES_DIR.glob("*.md")):
        paper_refs = _rationale_paper_refs(r)
        if not paper_refs:
            # A rationale with no paper refs is silently allowed; the
            # docstring/concept-page checks already enforce traceability at
            # the check level. This keeps non-paper rationales (e.g. style-guide
            # citations) from failing here.
            continue
        checked += 1
        tiers = [_paper_tier(name) for name in paper_refs]
        non_preprint = [t for t in tiers if t and t != "preprint"]
        if not non_preprint:
            print(
                f"[FAIL] preprint-limits/{r.name}: rationale cites only preprints "
                f"({paper_refs}); needs at least one peer-reviewed paper"
            )
            total_errors += 1
        else:
            print(f"[ OK ] preprint-limits/{r.name}")
    if checked == 0:
        print("preprint-limits: no rationale cited any paper — nothing to check")
    return 2 if total_errors else 0


# ---------------------------------------------------------------------------
# CLI driver


def _discover_areas() -> list[str]:
    if not CONCEPTS_DIR.is_dir():
        return []
    return sorted(d.name for d in CONCEPTS_DIR.iterdir() if d.is_dir())


def run_all() -> int:
    """Default-mode entrypoint — every check, exit non-zero on first failure."""
    rc = 0
    print("=== frontmatter ===")
    rc = max(rc, check_frontmatter())
    print("\n=== concept areas ===")
    areas = _discover_areas()
    if not areas:
        print("infrastructure error: no concept areas found under wiki/concepts/", file=sys.stderr)
        rc = max(rc, 3)
    for area in areas:
        print(f"-- area: {area} --")
        rc = max(rc, check_area(area))
    print("\n=== methods ===")
    rc = max(rc, check_methods())
    print("\n=== docstring refs ===")
    rc = max(rc, check_docstrings())
    print("\n=== preprint usage limits ===")
    rc = max(rc, check_preprint_limits())
    print("\n=== summary ===")
    if rc == 0:
        print("wiki integrity: PASS")
    else:
        print(f"wiki integrity: FAIL (rc={rc})", file=sys.stderr)
    return rc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Wiki integrity validator for humane-prose-audit",
        allow_abbrev=False,
    )
    parser.add_argument("--check-frontmatter", action="store_true")
    parser.add_argument("--area", metavar="NAME")
    parser.add_argument("--check-methods", action="store_true")
    parser.add_argument("--check-docstrings", action="store_true")
    args = parser.parse_args()

    if args.area is not None and not args.area.strip():
        parser.error("--area requires a non-empty value")

    explicit = (
        args.check_frontmatter
        or args.area is not None
        or args.check_methods
        or args.check_docstrings
    )
    if not explicit:
        return run_all()

    rc = 0
    if args.check_frontmatter:
        rc = max(rc, check_frontmatter())
    if args.area is not None:
        rc = max(rc, check_area(args.area))
    if args.check_methods:
        rc = max(rc, check_methods())
    if args.check_docstrings:
        rc = max(rc, check_docstrings())
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
