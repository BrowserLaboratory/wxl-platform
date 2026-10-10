# Phase F — Wiki bootstrap + cite-probe 撈論文

對 `humane-prose-audit/wiki/` 跑 `/wiki` 套件的 research profile bootstrap，並用 `cite-probe` 撈四領域論文（AI-tells / 困惑度、論證 / 邏輯、coherence / cohesion、readability / lexical）。

## Entry State

- Phase E 完成（含 `wiki_orchestrator.py`）
- `humane-prose-audit/wiki/` 為空目錄或尚未存在
- 專案根的 `.cite-probe.env` 已由使用者建立（權限 600）
- `wiki-init` / `cite-probe` skill 已安裝可用

## 任務範圍

- 6.1 對 `humane-prose-audit/wiki/` bootstrap research profile（AGENTS.md / index.md / log.md / synthesis.md / raw/ / 三個 manifest）
- 6.2 `wiki/venues.yaml` 白名單（top-conference / peer-reviewed / preprint）
- 6.3 確認 `.cite-probe.env` 在 repo root 且權限 600
- 6.4 cite-probe 撈 AI-tells / 困惑度 / burstiness 領域論文（Hans 2024、Mitchell 2023、GLTR、GPTZero）
- 6.5 cite-probe 撈論證 / 邏輯領域論文（Wachsmuth 2017、Stab & Gurevych 2014、Toulmin / Walton 書）
- 6.6 cite-probe 撈 coherence / cohesion 領域論文（Mann & Thompson 1988、Grosz 1995、McNamara 2014）
- 6.7 cite-probe 撈 readability / lexical metrics 論文（MTLD、Flesch、Williams 1981 書）
- 6.8 每篇 paper abstract.md frontmatter 補齊 tier / review_evidence / ingested_at / ingested_by
- 6.9 跑 `cite-probe lit-fetcher verify --venues-file`
- 6.10 [GATE]

## Exit State

- `wiki/` 通過 `wiki-validator` exit 0
- `wiki/venues.yaml` 三 tier 齊備
- `wiki/raw/papers/` 含四領域論文（每領域至少 1–2 個 arXiv ID 資料夾或對應 ID）
- 每篇 abstract.md frontmatter 完整
- `cite-probe lit-fetcher verify` exit 0
- 二次 [GATE] commit 已落地

## Verification

```bash
uv run wiki-validator/scripts/validate.py --target humane-prose-audit/wiki/

python -c "import yaml; v=yaml.safe_load(open('humane-prose-audit/wiki/venues.yaml')); \
           assert {'top-conference','peer-reviewed','preprint'} <= set(v.get('tiers',{}).keys())"

test -f .cite-probe.env && test "$(stat -f %A .cite-probe.env)" = "600"

# 領域 1
ls humane-prose-audit/wiki/raw/papers/arXiv-2401.12070/abstract.md
ls humane-prose-audit/wiki/raw/papers/arXiv-2301.11305/abstract.md

# 領域 2–4
ls humane-prose-audit/wiki/raw/papers/   # 至少 7 個 ID 資料夾

python humane-prose-audit/scripts/wiki_integrity.py --check-frontmatter
cite-probe lit-fetcher verify --references-dir humane-prose-audit/wiki/raw/papers \
                              --venues-file humane-prose-audit/wiki/venues.yaml

python humane-prose-audit/scripts/progress_tracker.py status | grep -q "F.*completed"
```

## 注意事項

- 缺 `.cite-probe.env` 時 wiki_orchestrator 直接 halt，不要繞過
- 每篇 paper 走 `wiki_orchestrator ingest` 寫入，frontmatter 不要手刻
- arXiv ID 命名格式統一為 `arXiv-<YYMM.NNNNN>` 或 `arXiv-<YY.NNNN>`，避免大小寫漂移
- 書籍（Toulmin / Walton / Williams）無 arXiv ID，作為 inline citation 寫進對應 concept page 即可，不必建獨立資料夾
- 撈論文是 idempotent 動作；重跑不重複下載已存在的 PDF
