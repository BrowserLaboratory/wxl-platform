# Phase D — 第四個 sub-agent persona humanity_auditor + Fuzz mutator 擴充

新增第 4 個 sub-agent persona（HUM prefix）專責「人味」審查；fuzz mutator 加 `section_swap`；既有 3 個 persona prompt 升級為 model-agnostic 結構。

## Entry State

- Phase C 完成（14 個 check 已就位）
- `prompts/` 已有 v1 3 個 persona（sloppy / illogical / shallow）
- `mutators/` 已有 v1 3 個 mutator（typo / sentence / citation）
- `config.yaml: agents_n` 為 3

## 任務範圍

- 4.1 `prompts/humanity_auditor.md` persona（prefix HUM，6 categories）
- 4.2 既有 3 + 新 1 persona 全部加 `## Output Contract` + `## Determinism Note` 區塊
- 4.3 `prompts/_README.md` 解釋 model-agnostic 規範與 caller-side 包裝
- 4.4 `config.yaml: agents_n: 4`，加 `humane_signal` 區塊（weights + threshold）
- 4.5 `mutators/section_swap.py` 接受 `--seed`，段內保序
- 4.6 改 `mutators/run_fuzz.py` 納入 section_swap
- 4.7 [GATE]

## Exit State

- 4 個 persona prompt 全部含必要區塊；`validate_outputs.py --validate-prompts` exit 0
- `prompts/_README.md` 含關鍵字（Output Contract / Determinism Note / cross-model / model-agnostic）
- `config.yaml: agents_n` = 4，`humane_signal.threshold` 為整數
- `section_swap` 加入 `MUTATORS` tuple
- 二次 [GATE] commit 已落地

## Verification

```bash
# Persona 結構驗證
grep -E "^prefix:|HUM[1-9]" humane-prose-audit/prompts/humanity_auditor.md
python humane-prose-audit/scripts/validate_outputs.py --validate-prompts humane-prose-audit/prompts/

# Persona 單元測
pytest humane-prose-audit/tests/test_humanity_auditor.py -q

# _README.md 必要關鍵字
grep -q "Output Contract\|Determinism Note\|cross-model\|model-agnostic" humane-prose-audit/prompts/_README.md

# Config
yq '.agents_n' humane-prose-audit/config.yaml      # → 4
yq '.humane_signal.threshold' humane-prose-audit/config.yaml

# Mutator
pytest humane-prose-audit/tests/test_mutators.py::test_section_swap_seeded -q
pytest humane-prose-audit/tests/test_mutators.py::test_run_fuzz_includes_section_swap -q

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "D.*completed"
```

## 注意事項

- 4 個 persona 的 consensus bump 由 `output_aggregator` 處理；N=4 時上限自動 cap 為 Critical
- `humanity_auditor` 6 categories：AI-flat rhythm、imperative-fog、hedge over-clustering、voice break、boilerplate stamp、manufactured-logic chains
- `section_swap` 保留段內句序（只重排 H2 區塊），避免破壞句內語法
- 既有 3 persona 的 prompt 升級不可改變既有 categories 編號（backward compat）
