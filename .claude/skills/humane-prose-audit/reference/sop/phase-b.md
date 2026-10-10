# Phase B — Cross-model JSON schema 強制驗證 + scripts/_common 基礎設施

建立 cross-model 一致性閘道與重構工程通用的基礎設施模組。Phase B 後所有 check / agent / report 都受 schema 強制驗證。

## Entry State

- Phase A 已完成（`.refactor-progress.yaml: A: completed`）
- `humane-prose-audit/` 已存在但 `schemas/`、`scripts/` 為空或缺
- 預期相依套件 `jsonschema`、`pyyaml`、`tiktoken` 已可 import

## 任務範圍

- 2.1 5 份 JSON schema（check-output / agent-output / audit-report / humane-score / project-config），檔頭符合 draft-07
- 2.2 `scripts/validate_outputs.py` CLI（`--self-check` + 單檔模式）
- 2.3 `scripts/_common/output_schema.py` dataclass + JSON marshalling
- 2.4 `scripts/_common/journal.py` append-only journal + `--validate`
- 2.5 `scripts/_common/config_resolver.py` walk-up 至 git root
- 2.6 `scripts/_common/token_estimator.py` 用 tiktoken
- 2.7 `scripts/_common/locale_detect.py` zh-TW / en / mixed
- 2.8 `scripts/progress_tracker.py` 維護 .refactor-progress.yaml，atomic write
- 2.9 [GATE]

## Exit State

- `humane-prose-audit/schemas/` 5 份 schema 全部 lint pass
- `scripts/validate_outputs.py --self-check` exit 0
- `scripts/_common/` 5 個 module 與對應 pytest 全綠
- `scripts/progress_tracker.py --validate` exit 0
- 二次 [GATE] commit 已落地

## Verification

```bash
python -c "import json,glob; [json.load(open(f)) for f in glob.glob('humane-prose-audit/schemas/*.schema.json')]"
python humane-prose-audit/scripts/validate_outputs.py --self-check
pytest humane-prose-audit/tests/test_output_schema.py -q
pytest humane-prose-audit/tests/test_journal.py -q
pytest humane-prose-audit/tests/test_config_resolver.py -q
pytest humane-prose-audit/tests/test_token_estimator.py -q
pytest humane-prose-audit/tests/test_locale_detect.py -q
pytest humane-prose-audit/tests/test_progress_tracker.py -q
python humane-prose-audit/scripts/progress_tracker.py status | grep -q "B.*completed"
```

## 注意事項

- schema 採 draft-07（不用 2019-09 / 2020-12，因 `jsonschema` 套件穩定度）
- `_common/journal.py` 用 `O_APPEND` flush 寫；atomic 性靠 OS file lock
- `progress_tracker.py` 寫 yaml 用 `tempfile + rename` atomic write，避免半寫狀態
- `config_resolver.py` walk-up 撞到 git root（`.git/` 存在）即停，不再往上
