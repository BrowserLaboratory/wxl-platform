# Phase C — 14 個 deterministic preflight check 完成擴充

新增 8 個 check 並調整既有 2 個 check（lazy_writer 去重、citation_format 改可選），達到 14 個 deterministic preflight rule 的完整 inventory。

## Entry State

- Phase A、B 已完成
- `humane-prose-audit/checks/` 內已有 v1 6 個 check
- `schemas/check-output.schema.json` 已就位（Phase B）
- `rationales/` 已有 v1 11 份 rationale
- 預期 `textstat`、`py-readability-metrics` 已可 import

## 任務範圍

- 3.1 `checks/ai_tells.py`
- 3.2 `checks/burstiness.py`
- 3.3 `checks/hedge_density.py`
- 3.4 `checks/imperative_fog.py`
- 3.5 `checks/lexical_diversity.py`（MTLD）
- 3.6 `checks/pronoun_consistency.py`
- 3.7 `checks/discourse_marker_density.py`
- 3.8 `checks/repetition_fingerprint.py`
- 3.9 8 份 rationale（What / Threshold / Why / Limitations）
- 3.10 改 `checks/lazy_writer_check.py` 去除與 ai_tells 重疊規則
- 3.11 改 `checks/citation_format.py` 為 references.format opt-in
- 3.12 [GATE]

## Exit State

- 14 個 check 全部以 CLI subprocess 形式可呼叫，stdout JSON 全部過 `check-output.schema.json` 驗證
- 8 份新 rationale 全部齊備
- `lazy_writer_check` 與 `ai_tells` 無 finding 重疊
- `citation_format` 在 references.format=none 時 no-op
- 二次 [GATE] commit 已落地

## Verification

```bash
# 範例：對 ai-flavored fixture 跑 ai_tells，輸出過 schema 驗證
python humane-prose-audit/checks/ai_tells.py humane-prose-audit/tests/fixtures/ai-flavored.md \
  | python humane-prose-audit/scripts/validate_outputs.py --schema check-output --stdin

# 全套 check 單元測
pytest humane-prose-audit/tests/test_ai_tells.py humane-prose-audit/tests/test_burstiness.py \
       humane-prose-audit/tests/test_hedge_density.py humane-prose-audit/tests/test_imperative_fog.py \
       humane-prose-audit/tests/test_lexical_diversity.py humane-prose-audit/tests/test_pronoun_consistency.py \
       humane-prose-audit/tests/test_discourse_marker_density.py humane-prose-audit/tests/test_repetition_fingerprint.py -q

# 既有 check 改動
pytest humane-prose-audit/tests/test_checks.py::test_lazy_writer_no_overlap -q
pytest humane-prose-audit/tests/test_checks.py::test_citation_format_optin -q

# 8 份 rationale 全部存在
ls humane-prose-audit/rationales/{ai-tells-inventory,burstiness-threshold,hedge-density,imperative-fog,lexical-diversity-mtld,pronoun-consistency,discourse-marker-density,repetition-fingerprint}.md

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "C.*completed"
```

## 注意事項

- 每個 check 必須在 docstring 引用 ≥1 個 `wiki/concepts/<area>/<page>.md`（Phase G `wiki_integrity.py --check-docstrings` 會擋）
- 新 check 的 severity rubric 與 v1 共用 `config.yaml: severity` 區塊
- `lexical_diversity` 用 hashing trick 而非完整 token list（token-economy 設計）
- `repetition_fingerprint` 用 rolling hash 而非 n-gram cache
- 任一 check 若輸入文長 < 200 chars 應 SKIP 而非報 finding（分母失真）
