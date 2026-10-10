# Phase I — Verificators + Pre-commit hook integration

完成五個 verificator test（reproducibility / consensus / token budget / cross-model contract / resume），對 `humane-prose-audit/` 與 `wiki/` 裝 pre-commit hook。Phase I 後 cross-session / cross-model 一致性由 CI 自動把關。

## Entry State

- Phase H 完成（templates / examples / fixtures 齊備）
- `tests/` 內已有單元測，但 verificator test 缺
- `.git/hooks/pre-commit` 為空或不存在 wiki/integrity hook
- `wiki-hooks` skill 已安裝

## 任務範圍

- 9.1 `tests/test_reproducibility.py`（同 seed + 同 fixture 兩跑 byte-identical）
- 9.2 `tests/test_consensus.py`（consensus severity bump 一致性）
- 9.3 `tests/test_token_budget.py`（token estimator 不超 budget）
- 9.4 `tests/test_cross_model_contract.py`（mock LLM ≥ 3 binding：Claude / OpenAI / Gemini）
- 9.5 `tests/test_resume.py`（kill + resume == 一次跑完）
- 9.6 `wiki-hooks install` 對 `humane-prose-audit/wiki/`
- 9.7 對 `humane-prose-audit/` 整體裝 hook（pytest、validate_outputs、progress_tracker、journal）
- 9.8 在 tasks.md 與 RESUME.md 標註 `[GATE]` 慣例（≥ 10 處）
- 9.9 [GATE]

## Exit State

- 五個 verificator test 全綠
- `.git/hooks/pre-commit` 含 wiki-validator 或 wiki_integrity 字串
- 對 schema 違規檔做 commit 會被 hook 擋下
- `pre-commit run --all-files` 在乾淨狀態 exit 0
- `tasks.md` `[GATE]` 出現 ≥ 10 次
- 二次 [GATE] commit 已落地

## Verification

```bash
# 五個 verificator
pytest humane-prose-audit/tests/test_reproducibility.py -q
pytest humane-prose-audit/tests/test_consensus.py -q
pytest humane-prose-audit/tests/test_token_budget.py -q
pytest humane-prose-audit/tests/test_cross_model_contract.py -q
pytest humane-prose-audit/tests/test_resume.py -q

# Hook 安裝
grep -q "wiki-validator\|wiki_integrity" .git/hooks/pre-commit

# Hook 攔下違規 commit（模擬）
echo '{"check": "bad"}' > /tmp/bad-output.json   # 不符合 schema
# 手動嘗試 add + commit 應失敗
# git add /tmp/bad-output.json && git commit -m "test"   # 預期 hook 擋下

# 乾淨狀態 pre-commit
pre-commit run --all-files

# GATE 慣例
test "$(grep -c '\[GATE\]' humane-prose-audit/openspec/changes/humane-prose-audit-refactor/tasks.md)" -ge 10

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "I.*completed"
```

## 注意事項

- `test_cross_model_contract.py` 用 mock LLM 模擬三種 binding；不要呼真 API
- `test_resume.py` 用 `subprocess.Popen` + SIGTERM 模擬中斷；resume 後須與一次跑完 byte-identical
- pre-commit hook 不可繞過（`--no-verify`）；任何 hook 失敗必須回頭改 root cause
- `wiki-hooks install` 只裝 wiki 子目錄相關檢查；本 skill 整體的 hook 在 9.7 額外加
- 9.8 是 documentation gate，不是 code gate；確認 [GATE] 字串在 tasks.md 有 phase A–J 共 10 處
