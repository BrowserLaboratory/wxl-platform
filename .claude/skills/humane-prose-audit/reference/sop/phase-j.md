# Phase J — SKILL.md / RESUME / SOP / reference 文件最終化

重構工程的最後一個 phase：重寫 SKILL.md、寫 README / RESUME / CONTRIBUTING、補七份 reference 方法論文件、補十份 phase SOP（含本檔）。Phase J 是 documentation finalization；無新功能、無 schema 變動。

## Entry State

- Phase A–I 全部完成（`.refactor-progress.yaml` 對應 phase 標 completed）
- `humane-prose-audit/SKILL.md` 仍為 v1 內容（描述 4 階段、3 sub-agent）
- `README.md` / `RESUME.md` / `CONTRIBUTING.md` 不存在
- `reference/` 目錄不存在或只有部分內容
- 所有功能性 task（74 項）已過 [GATE]

## 任務範圍

- 10.1 重寫 `SKILL.md`，含 `## Five-Phase Workflow`、`## Cross-Session / Cross-Model Protocol`、`## Wiki Knowledge Base` 三個 H2
- 10.2 `README.md`（≤ 80 行簡短入口）
- 10.3 `RESUME.md`（Phase 0 三步定位 + 中斷情境 recipe + SOP 連結）
- 10.4 `CONTRIBUTING.md`（model-agnostic 開發守則）
- 10.5 `reference/{methodology-overview, ai-tells-vs-perplexity, coherence-frameworks, argumentation-frameworks, readability-metrics-overview, how-checks-map-to-wiki, per-project-config-guide}.md` 七份
- 10.6 `reference/sop/phase-{a..j}.md` 十份 SOP（含本檔）
- 10.7 [GATE] 最終：commit → /spectra-audit → 二次 commit；所有 phase 標 completed

## Exit State

- `SKILL.md` 含三個指定 H2 + `humane-prose-audit` 字串
- `README.md` ≤ 80 行
- `RESUME.md` 含 Phase 0 三條指令
- `CONTRIBUTING.md` 含 model-agnostic / Claude / GPT / Gemini 任一關鍵字
- 七份 reference 方法論文件每檔字數 > 200
- 十份 phase SOP 每份含 `## Entry State`、`## Exit State`、`## Verification` 三節
- `progress_tracker.py status` 顯示 A–J 全 completed
- `pytest humane-prose-audit/tests/` 全綠
- `spectra validate humane-prose-audit-refactor` exit 0
- 二次 [GATE] commit 已落地

## Verification

```bash
# 10.1 SKILL.md
grep -q "^## Five-Phase Workflow$" humane-prose-audit/SKILL.md
grep -q "^## Cross-Session / Cross-Model Protocol$" humane-prose-audit/SKILL.md
grep -q "^## Wiki Knowledge Base$" humane-prose-audit/SKILL.md
grep -q "humane-prose-audit" humane-prose-audit/SKILL.md

# 10.2 README
test -f humane-prose-audit/README.md && test "$(wc -l < humane-prose-audit/README.md)" -le 80

# 10.3 RESUME
grep -qF "spectra status humane-prose-audit-refactor" humane-prose-audit/RESUME.md
grep -qF "cat humane-prose-audit/.refactor-progress.yaml" humane-prose-audit/RESUME.md
grep -qF "tail -20 humane-prose-audit/.audit-journal.jsonl" humane-prose-audit/RESUME.md

# 10.4 CONTRIBUTING
grep -qE "model-agnostic|Claude|GPT|Gemini" humane-prose-audit/CONTRIBUTING.md

# 10.5 reference 七檔
for f in methodology-overview ai-tells-vs-perplexity coherence-frameworks argumentation-frameworks \
         readability-metrics-overview how-checks-map-to-wiki per-project-config-guide; do
  test -f humane-prose-audit/reference/$f.md
done

# 10.6 SOP 十檔
for p in a b c d e f g h i j; do
  test -f humane-prose-audit/reference/sop/phase-$p.md
done
grep -L "## Entry State\|## Exit State\|## Verification" humane-prose-audit/reference/sop/*.md   # 應回空

# 10.7 最終驗收
python humane-prose-audit/scripts/progress_tracker.py status   # A–J 全 completed
pytest humane-prose-audit/tests/
spectra validate humane-prose-audit-refactor
```

## 注意事項

- 本 phase 全為文件，無 code change；TDD 不直接適用，但每篇文件都有具體 verification 目標
- 三層持久化狀態（spectra tasks / .refactor-progress.yaml / .audit-journal.jsonl）在 [GATE] 收尾後須三者一致
- 最終 [GATE] 跑 `/spectra-audit` 雖屬 documentation phase 仍須跑：3-agent 可能對 SKILL.md / RESUME.md 提出 phrasing finding，留作後續 polish 或當場修
- 本 SOP 是 self-referential（phase J 包含「寫 phase-j.md」）；勿無限遞迴，10.6 只需確保檔案存在 + 三節結構
- 完成 phase J 後本重構工程進入 archive 階段，用 `/spectra-archive humane-prose-audit-refactor`
