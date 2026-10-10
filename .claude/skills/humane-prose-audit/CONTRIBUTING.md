# CONTRIBUTING — humane-prose-audit

本 skill 的核心承諾是 **cross-model 一致性**：同一份 prompt / schema / orchestrator 必須能由 Claude、GPT、Gemini 任一 driver 接管而不破壞契約。本 CONTRIBUTING 文件記錄維護此承諾的開發守則。

## 模型不可知（model-agnostic）原則

> 不假設任何 model-specific 行為；model-specific 包裝放在 caller side（LLM Harness）。

### 為什麼採此原則

skill 用於多 session 多 model 接力的重構工程。同一 sub-agent persona 可能由 Claude Sonnet 起跑、由 GPT-5 接續、由 Gemini 收尾。任一 prompt 若依賴單一 model 的行為（例如 `<thinking>` tag、tool-use 語法、特定指令偏好），就會在接力時悄悄失靈。

### 撰寫 persona prompt 的規則

1. **必含 `## Output Contract` 區塊**：明列輸出 JSON schema reference、Markdown 表格欄位、`<!-- AGENT_DONE -->` sentinel
2. **必含 `## Determinism Note` 區塊**：規範 `若你的執行環境支援 seed，請依輸入 seed 行事；若不支援，回報 nondeterministic: true`
3. **不寫 model-specific tag**：例如不要假設 Claude 的 `<thinking>` block 或 OpenAI 的 `system` field 偏好；改用「請在輸出區塊內推理」這種抽象敘述
4. **不依賴特定 model 的隱性行為**：例如「Claude 預設 verbose、GPT 預設簡潔」這種偏差由 caller side 補（多輪 few-shot、temperature、stop sequences）
5. **caller-side 包裝原則**：所有 model-specific 提示（如「請用 zh-TW」、「請不要寫前言」）放在 caller 包裝層，不污染 persona prompt 本身

詳細範例與背景見 `prompts/_README.md`。

## 已知 model-specific 差異（追蹤）

以下差異在 mock LLM (test_cross_model_contract) 中以「至少 3 種 binding」涵蓋；實戰仍可能踩到，發現新差異請補到此表並開 issue：

| 差異                            | Claude（Sonnet 4.6+） | OpenAI（GPT-5）          | Gemini（2.5 Pro+）       | Mitigation                         |
| ------------------------------- | --------------------- | ------------------------ | ------------------------ | ---------------------------------- |
| 預設 verbosity                  | 中                    | 偏簡潔                   | 中                       | caller 設 max output budget        |
| JSON 包裝偏好                   | 直接 stdout JSON 穩定 | 易加 ```json fence       | 易加 explanatory preface | caller 強制 JSON-only system msg + post-parse strip |
| 中文 / 英文 voice 切換          | 一致                  | 偶有 mixed-language slip | 偏好 latin punctuation   | locale_detect.py 後處理校正        |
| 工具呼叫格式                    | tool_use block        | function_call            | functionCall             | skill 不直接讓 sub-agent call tool，由 orchestrator 統一 |
| 拒答 / refuse 行為              | 較少 over-refuse      | 偶有 over-refuse         | 偶有 over-refuse         | sub-agent prompt 避免「red team」字眼以防誤觸  |

新增條目請對該差異在 `tests/test_cross_model_contract.py` 補 mock case。

## 加新 check（deterministic preflight rule）

1. `python humane-prose-audit/scripts/new_check_scaffold.py --name <rule_name>`
   — 產生 `checks/<rule>.py`、`rationales/<rule>.md`、`tests/test_<rule>.py` stub
2. 實作 check（CLI subprocess + JSON stdout 符合 `schemas/check-output.schema.json`）
3. 在 docstring 連結 ≥1 個 wiki concept page（`wiki/concepts/<area>/<page>.md`）
4. 補 rationale 文件（What / Threshold / Why / Limitations 四節）
5. 跑 `wiki_integrity.py --check-docstrings` 確認連結合法
6. 跑 `pytest humane-prose-audit/tests/test_<rule>.py`
7. 若 check 改變 humane_score 計算（新 signal），在 `config.yaml: humane_signal.weights` 加權重並更新 `wiki/methods/humane-signal-pipeline.md`

## 加新 sub-agent persona

1. 在 `prompts/<persona>.md` 撰寫；採規定結構（前言 + `## Output Contract` + 6 categories + `## Determinism Note`）
2. 在 `config.yaml: agents_n` 評估是否需要增加 N
3. 在 `output_aggregator.py` 確認 consensus bump 對 N+1 仍正確
4. 於 `tests/test_<persona>.py` 加單元測；於 `test_cross_model_contract.py` 補 mock 三 binding 對該 persona 的輸出
5. **不要假設新 persona 在某個 model 表現好**：所有 persona 都應在三 model 上皆通過 schema validation

## 加新 mutator

1. 在 `mutators/<mutator>.py` 實作；接受 `--seed`，保證同 seed 重現
2. 在 `mutators/run_fuzz.py: MUTATORS` tuple 註冊
3. 於 `tests/test_mutators.py` 加 seeded 重現測

## 加新 wiki paper

只透過 `scripts/wiki_orchestrator.py` 系列指令：

```bash
python humane-prose-audit/scripts/wiki_orchestrator.py bootstrap   # 一次性
python humane-prose-audit/scripts/wiki_orchestrator.py fetch <query>
python humane-prose-audit/scripts/wiki_orchestrator.py verify
python humane-prose-audit/scripts/wiki_orchestrator.py ingest
python humane-prose-audit/scripts/wiki_orchestrator.py validate
```

不要手刻 `wiki/raw/papers/<id>/abstract.md`；frontmatter 漏 `tier` / `review_evidence` / `ingested_at` / `ingested_by` 任一欄會被 `wiki_integrity.py` 擋下。arXiv preprint 不得作為 Critical-rule 唯一依據。

## Schema 變更

修改 `schemas/*.schema.json` 任何一份的影響面：

1. 所有引用該 schema 的 check / agent / report 輸出可能不再合法
2. 所有 mock LLM fixture 需要更新
3. 既有的 `runs/` 報告變成 legacy（不向下相容）

流程：

1. 寫一個遷移 RFC（用 spectra propose 流程）
2. 同 PR 內：改 schema、改 producer、改 consumer、改 mock fixture、改 test
3. `validate_outputs.py --self-check` 必須過

不可只改 schema 不改其他環節。

## Pre-commit hook

倉庫已裝 hook：`pytest` + `validate_outputs --self-check` + `progress_tracker --validate` + `journal --validate` + `wiki_integrity`。**不要繞過 hook**（不用 `--no-verify`）；若 hook 阻擋 commit，先讀錯誤再修，不要繞過。

繞過 hook 的合法情境只有：（1）緊急 hotfix 且 reviewer 同意；（2）已開 issue 追蹤 root cause。

## Code style

- Python：3.11+，型別註記、`from __future__ import annotations`、`pathlib.Path` 取代 `os.path`
- Markdown：Taiwan Traditional Chinese 為主，技術名詞保留英文（API / commit / schema / cache / seed 等不翻譯）
- 不寫 model 名稱於 user-facing 字串（不要寫「Claude 會...」、「GPT 會...」；改寫「sub-agent 會...」）
- commit message 用 `/tw-emoji-commit` skill 產生

## Spectra phase gate

重構工程的每個 phase 結尾跑 commit → `/spectra-audit` 3-agent → 二次 commit。此守則寫在 `tasks.md` 用 `[GATE]` 標記。不要省略 audit；若 audit 找到非 phase 範圍的 finding，記到 `future-work.md` 不在本 phase 修。

## 測試守則

- 任何 PR 必須過 `pytest humane-prose-audit/tests/`
- 新加 check / mutator / persona 必須在 fixture 上跑出 byte-identical（同 seed）
- 跨 model contract test 必須覆蓋至少 3 種 binding
- 若新增非 deterministic 邏輯，必須在 docstring 與 prompt `## Determinism Note` 明示
