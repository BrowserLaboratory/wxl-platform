---
name: humane-prose-audit
disable-model-invocation: true
version: 2.0.0
description: 'Adversarial prose audit toolkit for technical writing in Taiwan Traditional Chinese and English. Use when the user asks to "prose audit", "humane prose audit", "humane writing audit", "AI-flavored text", "human-like text check", "文稿稽核", "report audit", "tutorial audit", "3-agent adversarial audit", "4-agent adversarial audit", or wants to find factual errors, logical inconsistencies, depth gaps, and AI-tells/humane-signal weaknesses in long-form documents. Drives a five-phase workflow (Python pre-flight rules → 4 parallel sub-agents → optional fuzz analysis → humane-signal scoring → consolidated findings). Pairs with `spectra-audit` (code), `cite-probe` (citations), and `phoenix-writing` (author self-check) without overlapping their scope. Do NOT trigger when the user is only reading the skill source files or asking conceptual questions without intent to audit a document. Alias spectra-prose-audit (v1 name; retained so find-skills still matches the legacy slug).'
---

# humane-prose-audit

對抗式文稿稽核 toolkit。對技術寫作（論文、報告、tutorial、部落格、行銷文案）跑五階段流程，找出事實錯誤、邏輯破洞、深度不足、AI-tells / 人味缺失。

舊名 `spectra-prose-audit`（v1）— description 保留為 alias 以維持 find-skills 命中；本 skill 已通用化、脫離 spectra 命名空間，新呼叫請用 `humane-prose-audit`。

## 兩種模式

### Standalone mode

由使用者直接呼叫，跑完整五階段。

呼叫範例：

```
python humane-prose-audit/scripts/audit_orchestrator.py homeworks/hw02/report.md --out runs/hw02
python humane-prose-audit/scripts/audit_orchestrator.py docs/proposal.md --out /tmp/audit-1 --no-fuzz
python humane-prose-audit/scripts/audit_orchestrator.py init-config --profile blog
```

### Discipline mode

由 `spectra-apply` 在 `audit: true` 配置下隱式呼叫，提供 inline 紅旗檢查（無 sub-agent dispatch）。本版本仍沿用 v1 介面契約，實作留待後續迭代。

## Five-Phase Workflow

```
Phase 1  Preflight       14 個 deterministic Python check（既有 6 + 新增 8）
Phase 2  Sub-agents      4 個 persona（SLP / ILL / SHL / HUM）平行對抗稽核
Phase 3  Fuzz            4 個 mutator × K 變體（typo / sentence / citation / section_swap）
Phase 4  Humane-signal   線性加權出 0–100 humane_score + humane_band 註記
Phase 5  Consolidated    consensus severity bump、去重、wiki refs 連結、verdict
```

關鍵屬性：

- **Phase 1 Critical 即停手**：任一 deterministic check 升 Critical，後續 phase 不再派發 sub-agent，省 token。
- **Phase 4 不影響 PASS/FAIL**：humane_score 只在 verdict 加註記（如 `WARN: humane_band=low`），PASS 仍由 0 Critical AND 0 High 決定。
- **Phase 3 可關閉**：`--no-fuzz` 跳過，CI 快測常用。
- **共識升 severity**：N=4 persona 之 consensus bump 規則沿用 N=3 版本，bump 上限 cap 為 Critical。

各 phase 進入／離開條件、verification command 寫在 `reference/sop/phase-{a..j}.md`（重構工程 phase）與 `wiki/methods/humane-signal-pipeline.md`（執行時 phase）。

## CLI Contract

### `audit_orchestrator.py`

```
python humane-prose-audit/scripts/audit_orchestrator.py <target.md> --out <run-dir> \
    [--seed <int>] [--phase {1..5}] [--no-fuzz] [--config <path>] [--resume]
python humane-prose-audit/scripts/audit_orchestrator.py init-config [--profile <name>] [--force]
```

- `--seed`：forwarded to fuzz mutators；同 seed + 同 fixture 兩跑 byte-identical（test_reproducibility 保證）
- `--phase N`：跑到 phase N 停手（含）
- `--resume`：跳過 `<run-dir>` 已有的 phase output，接續跑
- 輸出：`<run-dir>/audit-report.json`，符合 `schemas/audit-report.schema.json`

### Check（單一 deterministic 規則）

```
python humane-prose-audit/checks/<rule>.py <target-file>
```

stdout JSON 符合 `schemas/check-output.schema.json`：

```json
{
  "check": "<rule_id>",
  "target": "<absolute path>",
  "findings": [
    {"severity": "critical|high|medium|low", "section": "<title>",
     "issue": "<short description>", "evidence": "<quoted text>",
     "wiki_refs": ["wiki/concepts/<area>/<page>.md"]}
  ]
}
```

### Mutator / Run-fuzz

```
python humane-prose-audit/mutators/<mutator>.py <target.md> --k 5 --out <dir> [--seed <int>]
python humane-prose-audit/mutators/run_fuzz.py <target.md> --k 5 [--seed <int>]
```

### Sub-agent

由 Agent tool dispatch（recommended subagent_type `general-purpose`）。Prompt 載 `## Output Contract` 與 `## Determinism Note`，輸出符合 `schemas/agent-output.schema.json`，以 `<!-- AGENT_DONE -->` sentinel 收尾。詳見 `prompts/_README.md`。

### Validation

```
python humane-prose-audit/scripts/validate_outputs.py --self-check
python humane-prose-audit/scripts/validate_outputs.py --schema check-output --stdin
python humane-prose-audit/scripts/validate_outputs.py --validate-prompts humane-prose-audit/prompts/
python humane-prose-audit/scripts/progress_tracker.py status
python humane-prose-audit/scripts/wiki_integrity.py
python humane-prose-audit/scripts/_common/journal.py --validate humane-prose-audit/.audit-journal.jsonl
```

Pre-commit hook 串接這些 validator；schema 違規 commit 會被擋下。

## Cross-Session / Cross-Model Protocol

本 skill 的重構工程歷時數天、跨多個 session 與 model 接力，因此把 cross-session / cross-model 一致性升為 first-class 設計：

### 三層持久化狀態

1. **Spectra 層** — `openspec/changes/humane-prose-audit-refactor/{proposal,design,tasks,specs}.md`：task 勾選即進度
2. **Skill 重構工程層** — `humane-prose-audit/.refactor-progress.yaml`：phase A–J 的 milestone 與 step 細粒度狀態
3. **執行歷程層** — `humane-prose-audit/.audit-journal.jsonl`：append-only 操作 log，每筆含 ts / session_id / model / action / target / sha256 / exit_code

冷啟動 session 第一件事是讀 `RESUME.md`（單一入口），含 Phase 0 三步定位、各中斷情境的 recipe、各 phase SOP 連結。

### 跨 model 一致性閘道

- `schemas/{check-output,agent-output,audit-report,humane-score,project-config}.schema.json` 五份 JSON schema 強制驗證
- `scripts/validate_outputs.py` 是 cross-model 一致性閘道；不符 schema 的 sub-agent 輸出不進 aggregation
- `prompts/_README.md` 規範所有 persona prompt 採 model-agnostic 結構（`## Output Contract` + `## Determinism Note`），不依賴 Claude-specific 行為（如 `<thinking>` tag）；caller side 可加 model-specific 包裝
- `test_cross_model_contract.py` 用 mock LLM（Claude / OpenAI / Gemini 三種 binding）跑 aggregator pipeline

### Seed-based reproducibility

所有 mutator 與 orchestrator 接 `--seed`；同 seed + 同 fixture 兩跑 byte-identical（除 timestamp 欄位）。`test_reproducibility.py`、`test_resume.py` 守門。

### Spectra phase gate

每個重構 phase 結尾跑 commit → `/spectra-audit` 3-agent → 二次 commit；`tasks.md` 用 `[GATE]` 標記提示 spectra-apply 暫停。

### Per-project config injection

- `.humane-prose-audit.yaml` 放專案根；orchestrator walk-up 解析至 git root
- `scripts/_common/config_resolver.py` 實作 walk-up；schema 違反非零 exit
- 五個 profile template：`templates/{academic,blog,technical-doc,marketing,general}-profile.yaml`；`general` 為 fallback

## Wiki Knowledge Base

`humane-prose-audit/wiki/`（research profile）是本 skill 的學術知識庫：

```
wiki/
├── AGENTS.md / CLAUDE.md / GEMINI.md     # wiki entry
├── venues.yaml                            # top-conference / peer-reviewed / preprint 三 tier 白名單
├── raw/papers/<id>/abstract.md            # cite-probe 撈下來的 paper，frontmatter 含 tier / review_evidence
├── concepts/<area>/<page>.md              # 5 領域種子概念頁
│   ├── ai-tells/
│   ├── perplexity-and-burstiness/
│   ├── argumentation/
│   ├── coherence/
│   └── readability-and-style/
└── methods/                                # 整合方法論
    ├── humane-signal-pipeline.md
    └── consensus-severity.md
```

**Integrity 守則**（由 `scripts/wiki_integrity.py` 強制）：

- 每個 `checks/<rule>.py` 的 docstring 至少引用 1 個 wiki concept page
- 每個 wiki concept page 至少引用 1 篇 paper
- arXiv preprint 為 critical-rule 唯一依據時須有 ≥1 篇 peer-reviewed 共同支持

**新增論文流程**：`scripts/wiki_orchestrator.py` wrap `cite-probe`，分 bootstrap / fetch / verify / ingest / validate 五個 idempotent sub-command。Gate 0：缺 `.cite-probe.env` 直接 halt 指引建檔。

**新增 check 流程**：`scripts/new_check_scaffold.py` 產生 check / rationale / test stub；新增 rule 須補 rationale 文件（`rationales/` 下 What/Threshold/Why/Limitations 結構）並在 docstring 連結至少 1 個 wiki concept page。

## 目錄結構

```
humane-prose-audit/
├── SKILL.md / README.md / RESUME.md / CONTRIBUTING.md
├── config.yaml                                  # runtime 預設（agents_n=4、fuzz K、humane_signal 權重等）
├── .refactor-progress.yaml / .audit-journal.jsonl   # 持久化狀態
├── checks/         14 個 deterministic Python check
├── mutators/       4 個 fuzz 變體生成器 + run_fuzz.py
├── prompts/        4 個 sub-agent persona + _README.md
├── schemas/        5 份 JSON schema (draft-07)
├── scripts/        audit_orchestrator / output_aggregator / wiki_orchestrator / validate_outputs / progress_tracker / wiki_integrity / new_check_scaffold
│   └── _common/    output_schema / journal / config_resolver / token_estimator / locale_detect
├── rationales/     每個 check 的 What/Threshold/Why/Limitations
├── templates/      5 個 profile（academic/blog/technical-doc/marketing/general）
├── examples/       4 個範例文（academic-pass / blog-warn / ai-flavored-fail / humane-rewrite-pass）
├── reference/      7 份方法論文件 + sop/phase-{a..j}.md
├── tests/          pytest 安裝驗收 + 5 個 verificator
└── wiki/           研究知識庫（venues / raw / concepts / methods）
```

## Severity 分級

- **Critical**：事實錯誤、數字反轉、cite 漏洞、thesis 自我矛盾、AI-flat rhythm 嚴重病灶
- **High**：跨檔不一致、邏輯破洞、重要 nuance 缺失、imperative-fog 集群
- **Medium**：用詞不通順、中國大陸用語、surface description、hedge over-clustering
- **Low**：標點、微觀風格、可選 polish

PASS 門檻：0 Critical AND 0 High。`humane_score` 只在 verdict 加註記（如 `PASS (humane_band=mid)`），不改變 PASS/WARN/FAIL 判定。

## 依賴

- Python 3.11+
- `pyyaml`、`jsonschema`、`tiktoken`、`textstat`、`py-readability-metrics`
- 選裝：`spaCy` + `zh_core_web_sm` → 啟用 coherence rationale
- 外部 skill：`cite-probe`（撈論文）、`wiki-init` / `wiki-master` / `wiki-validator` / `wiki-ingest` / `wiki-hooks`（建置 wiki）、`phoenix-writing`（voice-marker 共用）

## 與其他 skill 之分工

- 與 `spectra-audit`（程式碼版）、`cite-probe`（引用驗證版）三者互補不重疊
- 與 `phoenix-writing` 之 EAL+ 自驗互補（author-side vs third-party adversarial）
- 透過 `spectra-apply` 的 `audit: true` 機制接 discipline mode（未實作版本沿用 v1 介面）

## 進入點速查

| 我要…                  | 看這裡                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| 跑一次稽核             | 本檔 `Five-Phase Workflow` + `CLI Contract`                             |
| 從中斷處接續           | `RESUME.md`                                                             |
| 加新 check / persona   | `CONTRIBUTING.md`、`scripts/new_check_scaffold.py`                      |
| 撈新 paper             | `wiki/AGENTS.md`、`scripts/wiki_orchestrator.py`                        |
| 改某 phase SOP         | `reference/sop/phase-{a..j}.md`                                         |
| 換 profile / 改 config | `templates/<profile>-profile.yaml` + `reference/per-project-config-guide.md` |
| 看方法論為什麼這樣設計 | `reference/methodology-overview.md` + `wiki/methods/`                   |
