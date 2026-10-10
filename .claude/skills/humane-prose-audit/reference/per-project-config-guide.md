# Per-Project Config Guide

本 skill 的核心通用化機制是「per-project config injection」：每個專案在自己的 repo 根放一份 `.humane-prose-audit.yaml`，覆寫 skill 內建預設。本文說明 config 的解析路徑、schema、五個 profile template 的差異、以及常見覆寫情境。

## 解析路徑

`scripts/_common/config_resolver.py` 走以下順序：

1. CLI 給 `--config <path>` → 用這份
2. 否則從 target 檔案所在目錄起 walk-up，找第一個 `.humane-prose-audit.yaml`
3. walk-up 至 git root（`git rev-parse --show-toplevel`）為止
4. 找不到 → 用 skill 內建 `humane-prose-audit/config.yaml` 預設（等同 general profile）

任何階段如解析失敗（YAML invalid、違反 `schemas/project-config.schema.json`）即非零 exit + 列出第一個違規欄位；orchestrator 拒絕啟動。

## Schema

完整 schema 見 `schemas/project-config.schema.json`。主要 top-level keys：

```yaml
profile: academic|blog|technical-doc|marketing|general  # 必填
locale: zh-TW|en|mixed                                   # 影響 locale_detect 啟發式
tone: formal|casual|technical|persuasive                 # sub-agent 語氣參考
glossary:                                                # 特定詞彙白名單（不被 ai_tells 抓）
  - 詞彙1
  - 詞彙2
severity_overrides:                                      # 個別 check 升降級
  citation_format: low
  ai_tells: medium
humane_signal:
  weights: {burstiness: 0.3, ai_tells: 0.2, ...}         # 預設見 humane-signal-pipeline.md
  threshold: 60                                          # 0–100，低於此值 verdict 加 humane_band=low 註記
checks_disabled:                                         # 跳過特定 check
  - citation_format
agents_disabled:                                         # 跳過特定 sub-agent
  - shallow
references:
  format: typst|bibtex|none                              # citation_format 行為依據
```

## 五個 profile template

| Profile        | 適用場域                  | 主要差異                                                                         |
| -------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `academic`     | 學術論文 / 期刊投稿        | Flesch 0–40 OK；citation_format=typst|bibtex；severity 整體偏嚴；humane threshold 高 |
| `blog`         | 部落格 / 長文              | Flesch 50–80；citation_format=none；humane threshold 中；AI-tells 嚴管             |
| `technical-doc`| 技術文件 / API doc / 教程   | Flesch 40–70；citation_format=none；imperative-fog 嚴管（指令文件最容易踩）        |
| `marketing`    | 行銷文案 / landing page     | Flesch 60–90；boilerplate stamp 嚴管；burstiness threshold 寬鬆（短句多正常）      |
| `general`      | fallback / 不確定文體      | 最寬鬆；做為 `.humane-prose-audit.yaml` 缺檔時的預設                              |

五個 template 都符合 `schemas/project-config.schema.json`；`general-profile.yaml` 與 `audit_orchestrator init-config` 預設產出的 stub 是 byte-identical。

## 常見覆寫情境

### 情境 1：academic 文稿但允許低 Flesch

```yaml
profile: academic
severity_overrides:
  readability_metrics: low  # 不要因 Flesch < 30 報 high severity
```

### 情境 2：blog 但作者 voice 特殊，需要白名單

```yaml
profile: blog
glossary:
  - 「啊不就好棒棒」     # 不要被 ai_tells 抓 boilerplate
  - 「老實說」           # 不要被 hedge_density 抓
```

### 情境 3：技術文件不需要 citation_format

```yaml
profile: technical-doc
references:
  format: none
checks_disabled:
  - citation_format
```

### 情境 4：marketing 文案降低 humane threshold

```yaml
profile: marketing
humane_signal:
  threshold: 40   # 行銷文本來就刻意 polished，60 太嚴
```

### 情境 5：CI 快測，跳過 sub-agent

```yaml
profile: blog
agents_disabled:
  - sloppy
  - illogical
  - shallow
  - humanity
```

CI 模式只跑 Phase 1 deterministic check，速度比完整跑快一個數量級。

## 產生 stub

在當前目錄產生一份 `.humane-prose-audit.yaml` stub：

```bash
python humane-prose-audit/scripts/audit_orchestrator.py init-config --profile blog
```

加 `--force` 會覆蓋既有檔案。沒有 `--profile` 時等同 `--profile general`。

## Debug 解析路徑

要看實際解析到哪一份 config：

```bash
python -c "from humane_prose_audit.scripts._common.config_resolver import resolve_config; \
           print(resolve_config('docs/report.md'))"
```

或設 `HUMANE_PROSE_AUDIT_DEBUG_CONFIG=1` 環境變數讓 orchestrator 在 stdout 印出 resolved path。

## Validation

每次改 config 後跑：

```bash
python humane-prose-audit/scripts/validate_project_config.py .humane-prose-audit.yaml
```

非零 exit 會指出第一個違規欄位。pre-commit hook 也會跑這個 validation。
