# Phase E — audit_orchestrator + output_aggregator + wiki_orchestrator

實作五階段 audit 的 CLI 入口與輸出整合層；補 wiki orchestration wrapper 與開發者腳手架。

## Entry State

- Phase D 完成（4 persona + 4 mutator 就位）
- `schemas/*.schema.json` 全部就位（Phase B）
- 14 個 check 與其 CLI 已就位（Phase C）
- `scripts/_common/` 5 個 module 全部就位（Phase B）

## 任務範圍

- 5.1 `scripts/audit_orchestrator.py` CLI（`--seed`、`--phase`、`--no-fuzz`、`--out`、`--resume`、`init-config`）
- 5.2 `scripts/output_aggregator.py`（verdict + consensus severity bump）
- 5.3 aggregator 內 humane-signal scoring（線性加權、humane_band、verdict 註記）
- 5.4 `scripts/wiki_orchestrator.py`（bootstrap / fetch / verify / ingest / validate，全 idempotent + Gate 0 check）
- 5.5 `scripts/new_check_scaffold.py` 開發者工具
- 5.6 [GATE]

## Exit State

- `audit_orchestrator.py` 能對 academic fixture 走完五階段並產出符合 `audit-report.schema.json` 的 JSON
- `output_aggregator.py` 三個 verdict case + 兩個 bump case 測試全綠
- humane_signal scoring 三個 case（bounded、reproducible、threshold annotation 不影響 PASS/FAIL）全綠
- `wiki_orchestrator.py` idempotent 重跑與 Gate 0 halt 兩 case 全綠
- `new_check_scaffold.py --dry-run` 印出三個會建立的檔案路徑
- 二次 [GATE] commit 已落地

## Verification

```bash
# Orchestrator e2e smoke
python humane-prose-audit/scripts/audit_orchestrator.py humane-prose-audit/tests/fixtures/academic-sample.md \
       --out /tmp/audit-run-phase-e
python humane-prose-audit/scripts/validate_outputs.py --schema audit-report /tmp/audit-run-phase-e/audit-report.json

# 三層單元測
pytest humane-prose-audit/tests/test_output_aggregator.py -q
pytest humane-prose-audit/tests/test_humane_score.py -q
pytest humane-prose-audit/tests/test_wiki_orchestrator.py -q

# 開發者工具
python humane-prose-audit/scripts/new_check_scaffold.py --name dummy_check --dry-run

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "E.*completed"
```

## 注意事項

- `--resume` 必須跳過 `<run-dir>` 已有的 phase output（idempotent），不可全部重跑
- aggregator 寫 `humane_band` 為 low/mid/high 而非數值，避免下游誤把 band 當 score 用
- consensus bump N=4 時嚴格按「N-1 levels capped at Critical」執行；缺席 agent 不參與計票
- `wiki_orchestrator` Gate 0 檢查 `.cite-probe.env` 存在性與權限（600）；缺檔直接 halt 指引建檔
- `new_check_scaffold` 必須三件產物同步（check + rationale + test），不能只產 stub 中一份
