# Phase H — Profile templates + examples + fixtures

寫五個 profile template、四個 example 範例文、三個 test fixture。Phase H 是「通用化」可被外部專案使用的最後一哩。

## Entry State

- Phase G 完成（wiki 已具備完整 integrity）
- `templates/` 與 `examples/` 為空或不存在
- `audit_orchestrator init-config` CLI 就位（Phase E）
- `schemas/project-config.schema.json` 就位（Phase B）

## 任務範圍

- 8.1 `templates/academic-profile.yaml`
- 8.2 `templates/blog-profile.yaml`
- 8.3 `templates/technical-doc-profile.yaml`
- 8.4 `templates/marketing-profile.yaml`
- 8.5 `templates/general-profile.yaml`（預設 fallback）
- 8.6 `examples/{academic-pass,blog-warn,ai-flavored-fail,humane-rewrite-pass}.md`
- 8.7 `tests/fixtures/{ai-flavored,human-flavored,academic-sample}.md`
- 8.8 [GATE]

## Exit State

- 五個 template 全部過 `validate_project_config.py`
- `audit_orchestrator init-config` 預設輸出與 `general-profile.yaml` byte-identical
- 四個 example 走完整 audit：academic-pass → verdict PASS + humane_score ≥ 60；ai-flavored-fail → verdict WARN/FAIL + humane_score < 50
- 三個 fixture 被 `test_new_checks.py` 引用且全綠
- 二次 [GATE] commit 已落地

## Verification

```bash
# Profile templates
for p in academic blog technical-doc marketing general; do
  python humane-prose-audit/scripts/validate_project_config.py humane-prose-audit/templates/$p-profile.yaml
done

# general-profile == init-config 預設輸出
mkdir -p /tmp/init-config-test && cd /tmp/init-config-test
python humane-prose-audit/scripts/audit_orchestrator.py init-config
diff -q .humane-prose-audit.yaml humane-prose-audit/templates/general-profile.yaml

# Examples e2e
for f in academic-pass blog-warn ai-flavored-fail humane-rewrite-pass; do
  test -f humane-prose-audit/examples/$f.md
done
pytest humane-prose-audit/tests/test_examples.py -q

# Fixtures
for f in ai-flavored human-flavored academic-sample; do
  test -f humane-prose-audit/tests/fixtures/$f.md
done
pytest humane-prose-audit/tests/test_new_checks.py -q

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "H.*completed"
```

## 注意事項

- 五個 profile 的 humane_signal.weights 共用同一組預設；只在 threshold、severity_overrides、checks_disabled、references.format 調整差異
- example 範例文須涵蓋預期的 PASS / WARN / FAIL 三種 verdict，並覆蓋至少三種 profile
- fixture 短文（200–500 chars）只是 unit-test 級別；example 是端到端展示
- `humane-rewrite-pass.md` 是 `ai-flavored-fail.md` 的人工 rewrite，用於展示 audit 提出 finding 的修正方向
