# Phase G — Wiki concept pages + Wiki integrity validator

撰寫五領域的種子 concept page，並完整實作 `scripts/wiki_integrity.py` 強制 traceability（每 check 連 ≥1 concept page、每 concept page 引 ≥1 paper、arXiv preprint usage limits）。

## Entry State

- Phase F 完成（wiki bootstrap + papers 已 ingest）
- `wiki/raw/papers/` 內含四領域論文
- `wiki/concepts/<area>/` 五個 area 子目錄存在但內容稀疏
- `scripts/wiki_integrity.py` 為 stub 或部分實作

## 任務範圍

- 7.1 `wiki/concepts/ai-tells/`（delve-tapestry-navigate、em-dash-overuse、imperative-fog、listicle-structure）
- 7.2 `wiki/concepts/perplexity-and-burstiness/`（burstiness-definition、detectgpt-method、binoculars-method）
- 7.3 `wiki/concepts/argumentation/`（toulmin-model、informal-fallacies、argument-quality）
- 7.4 `wiki/concepts/coherence/`（rst-rhetorical-structure-theory、centering-theory、halliday-hasan-cohesion）
- 7.5 `wiki/concepts/readability-and-style/`（flesch-reading-ease、coh-metrix、lexical-diversity-mtld、editorial-style-frameworks）
- 7.6 `wiki/methods/humane-signal-pipeline.md` + `wiki/methods/consensus-severity.md`
- 7.7 每個 `checks/<rule>.py` 的 docstring 加 wiki concept-page reference
- 7.8 完整實作 `scripts/wiki_integrity.py`（end-to-end traceability + arXiv preprint usage limits）
- 7.9 [GATE]

## Exit State

- 五個 area 概念頁齊備，每頁引用至少 1 篇 paper
- 兩份 method page 齊備（pipeline + consensus）
- 每個 check 的 docstring 含 `wiki/concepts/<area>/<page>.md` reference
- `wiki_integrity.py` 全模式 exit 0；pytest 全綠
- 二次 [GATE] commit 已落地

## Verification

```bash
# 五個 area 各自合法
for area in ai-tells perplexity-and-burstiness argumentation coherence readability-and-style; do
  python humane-prose-audit/scripts/wiki_integrity.py --area $area
done

# Method pages
test -f humane-prose-audit/wiki/methods/humane-signal-pipeline.md
test -f humane-prose-audit/wiki/methods/consensus-severity.md
python humane-prose-audit/scripts/wiki_integrity.py --check-methods

# Check docstring 連結
python humane-prose-audit/scripts/wiki_integrity.py --check-docstrings

# 完整 integrity 與單元測
python humane-prose-audit/scripts/wiki_integrity.py
pytest humane-prose-audit/tests/test_wiki_integrity.py -q

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "G.*completed"
```

## 注意事項

- concept page frontmatter 必含 `area` 與 `references` list；references 內 entry 須對應 `wiki/raw/papers/<id>/` 實際存在
- arXiv preprint 為 critical-rule 唯一依據時 `wiki_integrity.py` 會擋；補一篇 peer-reviewed 共識證據
- check docstring 的 wiki ref 寫法統一為相對於 skill root：`wiki/concepts/<area>/<page>.md`
- `humane-signal-pipeline.md` 描述 Phase 4 線性加權公式與權重；改公式時兩處同步
- `consensus-severity.md` 描述 N=4 的 bump 邏輯與 capping rule
