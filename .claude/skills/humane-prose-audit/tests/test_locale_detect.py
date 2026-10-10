"""Tests for humane-prose-audit/scripts/_common/locale_detect.py.

The locale detector is a lightweight heuristic used by sub-agent prompts,
readability checks, and rationale messages to adapt their output language
when the project config does not pin a `locale`.

Rules under test:
  - cjk == 0 and letters == 0  -> "en"  (empty / punctuation-only default)
  - cjk / (cjk + letters) >= 0.7  -> "tw"
  - cjk / (cjk + letters) <= 0.1  -> "en"
  - otherwise -> "mixed"
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make `humane-prose-audit/scripts/_common` importable without installing.
_HPA_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HPA_ROOT / "scripts"))

from _common.locale_detect import detect_locale, ratio_cjk  # noqa: E402


def test_pure_chinese_is_tw() -> None:
    assert detect_locale("這是一段純中文的測試文字。") == "tw"


def test_pure_english_is_en() -> None:
    assert detect_locale("This is a plain English sentence.") == "en"


def test_fifty_fifty_is_mixed() -> None:
    assert detect_locale("這是一個 mixed 測試 text 段落 example 內容。") == "mixed"


def test_empty_is_en() -> None:
    assert detect_locale("") == "en"


def test_punctuation_only_is_en() -> None:
    assert detect_locale("...!!!??? ") == "en"


def test_markdown_headings_preserved() -> None:
    assert detect_locale("# Heading\n\nThis is **bold**.") == "en"


def test_chinese_with_markdown_is_tw() -> None:
    assert detect_locale("# 標題\n\n這段內容**夠長**且都是中文。") == "tw"


def test_short_chinese_phrase_is_tw() -> None:
    assert detect_locale("中文。") == "tw"


def test_short_english_phrase_is_en() -> None:
    assert detect_locale("Hi.") == "en"


def test_ratio_cjk_zero_when_no_chars() -> None:
    assert ratio_cjk("") == 0.0
