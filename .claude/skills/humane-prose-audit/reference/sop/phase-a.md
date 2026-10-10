# Phase A — Skill 改名 + 持久化狀態檔案 bootstrap

把 v1 `spectra-prose-audit/` 目錄改名為 `humane-prose-audit/`，建立三層持久化狀態檔案骨架。Phase A 是後續所有 phase 的 prerequisite。

## Entry State

- `spectra-prose-audit/` 仍存在於 repo（untracked，無 git history 可 preserve）
- `humane-prose-audit/` 不存在
- `openspec/changes/humane-prose-audit-refactor/` 已由 spectra propose 建好
- `.refactor-progress.yaml` 與 `.audit-journal.jsonl` 尚未建立

## 任務範圍

- 1.1 `mv spectra-prose-audit humane-prose-audit`（普通 mv；原目錄 untracked）
- 1.2 同步 SKILL.md frontmatter（`name: humane-prose-audit`、`version: 2.0.0`、舊名 alias）
- 1.3 同步既有 `checks/mutators/prompts/tests/` 內所有 `spectra-prose-audit` self-reference
- 1.4 建立空 `.refactor-progress.yaml` 與 `.audit-journal.jsonl`
- 1.5 [GATE] phase 結尾 commit → /spectra-audit → 二次 commit

## Exit State

- `humane-prose-audit/SKILL.md` 存在；frontmatter `name: humane-prose-audit`
- `spectra-prose-audit/` 不存在
- `.refactor-progress.yaml` 中 phase A 標 completed
- `.audit-journal.jsonl` 至少有 phase A 的 bootstrap entry
- 兩個 [GATE] commit 已落地

## Verification

```bash
test -f humane-prose-audit/SKILL.md && test ! -d spectra-prose-audit
yq '.name' humane-prose-audit/SKILL.md           # → humane-prose-audit
grep -q spectra-prose-audit humane-prose-audit/SKILL.md  # description alias 仍在
test -f humane-prose-audit/.refactor-progress.yaml
test -f humane-prose-audit/.audit-journal.jsonl
python humane-prose-audit/scripts/progress_tracker.py status | grep -q "A.*completed"
```

## 注意事項

- 舊名 alias 保留於 SKILL.md description 字串，find-skills 仍能命中 `spectra-prose-audit`
- 1.3 同步時不要動 description 內的 alias 字串（那是刻意保留的）
- `.audit-journal.jsonl` 從 phase A 開始就 append-only，後續任何 phase 都不得 in-place 編輯
