# humane-prose-audit

對抗式文稿稽核 toolkit — 對 Markdown 技術寫作跑五階段流程，找事實錯誤、邏輯破洞、深度不足、AI-tells / 人味缺失。

舊名 `spectra-prose-audit`（v1）；description 仍保留為 alias 供 find-skills 命中。

## 一分鐘上手

```bash
# 跑完整五階段
python humane-prose-audit/scripts/audit_orchestrator.py docs/report.md --out runs/report-1

# 快測（跳過 fuzz）
python humane-prose-audit/scripts/audit_orchestrator.py docs/report.md --out runs/smoke --no-fuzz

# 在當前目錄產生專案 config stub
python humane-prose-audit/scripts/audit_orchestrator.py init-config --profile blog
```

## 五階段流程

1. **Preflight** — 14 個 deterministic Python check
2. **Sub-agents** — 4 persona（SLP / ILL / SHL / HUM）平行對抗稽核
3. **Fuzz** — 4 mutator × K 變體
4. **Humane-signal scoring** — 線性加權出 0–100 humane_score
5. **Consolidated findings** — consensus severity bump、verdict、wiki refs

## 進入點

| 我要…                | 看這裡                                                        |
| -------------------- | ------------------------------------------------------------- |
| 完整功能與 CLI 契約  | [SKILL.md](SKILL.md)                                          |
| 從中斷處接續         | [RESUME.md](RESUME.md)                                        |
| 加 check / persona   | [CONTRIBUTING.md](CONTRIBUTING.md)                            |
| 方法論說明           | [reference/methodology-overview.md](reference/methodology-overview.md) |
| 每個 phase 的 SOP    | [reference/sop/](reference/sop/)                              |
| 學術知識庫           | [wiki/](wiki/)                                                |

## 五個 profile

`academic / blog / technical-doc / marketing / general` — 在專案根放 `.humane-prose-audit.yaml` 或用 `init-config --profile <name>` 產生 stub。詳見 [reference/per-project-config-guide.md](reference/per-project-config-guide.md)。

## 依賴

- Python 3.11+，`pyyaml`、`jsonschema`、`tiktoken`、`textstat`、`py-readability-metrics`
- 選裝：`spaCy` + `zh_core_web_sm`（啟用 coherence rationale）
- 外部 skill：`cite-probe`、`/wiki` 套件、`phoenix-writing`

## 與其他 skill 之分工

- `spectra-audit`（程式碼）／`cite-probe`（引用驗證）／本 skill（文稿）三者互補
- `phoenix-writing` author-side 自檢 ↔ 本 skill third-party adversarial 互補
