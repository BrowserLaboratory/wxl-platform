# Prompts Directory — Entry Document

本目錄是 `humane-prose-audit` skill 的 persona prompt 集合，由 orchestrator dispatch、由任意 model 執行。本文件說明這些 prompt 為什麼可以、也必須是 model-agnostic，以及 caller 可以做什麼、不可以做什麼。

> 本檔名以 `_` 開頭，會被 `scripts/validate_outputs.py --validate-prompts` 自動跳過（請見該腳本 `validate_prompts()` 中的 `if path.name.startswith("_")` 邏輯）。本檔僅供人讀；不屬於 persona contract 本體。

## 1. 概覽

`prompts/` 目錄共有四份 persona prompt，每份對應一位對抗稽核 sub-agent：

- `sloppy_agent.md` — 事實 / 引用 / 數字稽核（ID prefix `SLP`）
- `illogical_agent.md` — 邏輯 / 論證結構稽核（ID prefix `ILL`）
- `shallow_agent.md` — 深度 / nuance / tier 期待稽核（ID prefix `SHL`）
- `humanity_auditor.md` — 人味 / 節奏 / voice 稽核（ID prefix `HUM`）

每份 prompt 必須在輸出層產出兩種等價結果：

1. 一個 Markdown findings table（向後相容於 v1 standalone mode、人類可讀）。
2. 一個對應 `humane-prose-audit/schemas/agent-output.schema.json` 的 JSON sidecar（cross-model machine contract，由 orchestrator 解析）。

兩種輸出之關係定義於該 schema；本目錄之 prompt 內容是 contract 本體，本檔僅是導讀。

## 2. 為什麼這些 prompt 是 model-agnostic

Phase B 起，所有 agent 輸出**必須**通過 `agent-output.schema.json` 驗證才能納入 aggregation。Prompt 的責任是讓任何 model（Claude / GPT-5 / Gemini / Llama / Mistral / 自建 fine-tune）都能在沒有 vendor-specific scaffolding 的情況下產出符合該 schema 的內容。

因此 prompt 本體（即非 `_` 開頭的四個 `*.md`）**禁止**包含下列 vendor-specific 構造作為**活的**指令；若必須提及（例如列入「避免」清單），請以 inline code（backtick 包裹）的方式書寫，`validate_outputs.py` 對 backticked 出現視為安全：

- `<thinking>` — Claude 早期慣例的 scratchpad tag；非 Claude 系列 model 通常會把它當文字輸出。
- `<reflection>` — 某些 fine-tune（含開源 chain-of-thought variant）慣例；非該系列 model 不解析。
- `<scratchpad>` — Anthropic SDK 範例中之 reasoning 區塊標記；同樣非通用。
- System prompt 結構假設 — 不可假設「user 訊息一定落在 `role: 'user'`」或「system prompt 一定獨立於 user prompt 之外」；不同 model 與 harness 對 role 的處理方式不同。
- Function-calling / tool-use 專屬結構 — 不可假設 model 必然具備或必然啟用 tool-use；persona 必須能在純文字 in / 純文字 out 的最小契約下完成工作。

上述限制由 `scripts/validate_outputs.py --validate-prompts` 在 CI 自動把關。

## 3. Output Contract — 兩種形式

每位 persona 的 `## Output Contract` section 同時定義兩種等價輸出：

- **Markdown findings table** — header row 必須**完全**為 `| ID | Severity | Section | Issue | Recommendation | Confidence |`；body row 必須使用 stable section anchor（H1/H2 標題或可 grep 的字串指紋），**禁止**用行號；row 末以 14 字元 sentinel `<!-- AGENT_` + `DONE -->` 結尾。
- **JSON sidecar** — 結構對應 `agent-output.schema.json`，含 `agent` / `target` / `findings[]`；`severity` 為 lowercase enum；`confidence` 為 0.0–1.0 decimal；可選 `evidence` / `seed` / `nondeterministic` / `model` 欄位。

兩者在語意上**等價**。caller 可選擇要求其中一種，或兩種都收（orchestrator Phase E 預設兩者都收，並以 sidecar 作為 aggregation 主來源、Markdown table 作為人工 review 視圖）。

## 4. Determinism Note — seed propagation

Orchestrator 會把 `--seed <int>` 透過 prompt 變數或 caller-side wrapper 傳遞給 persona。persona prompt 本身**無法**強制所有 model 接受 seed —— 部分 hosted API（例如某些 closed model 的對話端點）沒有 seed 參數可用。

契約因此分兩種：

- **Deterministic backend**（runtime 支援 seed）— 同一 `{TARGET_FILE}` + 同一 seed + 同一 reference 集合 → 必須產出 byte-identical（除 timestamp 外）的 findings table 與 sidecar。
- **Nondeterministic / fluctuating backend**（runtime 不支援 seed）— persona 必須在 JSON sidecar 寫 `"nondeterministic": true`，僅輸出 Markdown 時則在 sentinel 前一行加 `<!-- nondeterministic: true -->` 註解。

byte-identical 再執行的契約**只**適用於 deterministic backend。對 fluctuating backend，retry policy（是否多次取樣後 vote、是否丟棄低 confidence 之 finding）由 caller 決定，不在 persona prompt 的責任範圍內。

## 5. Caller-side wrapping 原則

Caller（orchestrator、harness、或外部使用本 skill 的整合方）對 persona prompt 可以做與不可以做的事：

**可以做（DO）**：

- 在 persona prompt **前後**加任何 model-specific 包裝：system prompt、structured-output 強制（如 OpenAI `response_format`、Anthropic prefill）、tool-use spec、reasoning effort hints、vendor 專屬 scratchpad tag、role-routing。
- 在執行前注入 `{TARGET_FILE}` / `{REFERENCE_FILES}` 之實際路徑值。
- 在執行後對輸出做 post-processing（case normalization、whitespace strip、sentinel 檢查）。
- 對 fluctuating backend 加 retry / vote / ensemble 邏輯。

**不可以做（DO NOT）**：

- 改寫 persona prompt 本體。prompt 中之 `Inputs` / `Sharp-edge categories` / `Severity rubric` / `Output Contract` / `Determinism Note` / `Scope constraints` 六節都是 contract，動到任何一節就會破壞 cross-model 等價性。
- 略過 schema 驗證。caller 必須對 sidecar 輸出跑 `scripts/validate_outputs.py --schema agent-output`，才能納入 aggregation；不符 schema 的輸出走 `errored_outputs`（見 `audit-report.schema.json`），不進入 finding 統計。
- 修改 `{TARGET_FILE}` 或任何 reference file（這是 persona 自身的 Scope constraint，但 caller 也不可代為「預處理」素材）。

## 6. 四個 persona 的範圍邊界

每個 persona 各自鎖定六類 sharp edge，互補不重疊：

- **`sloppy_agent.md`（prefix `SLP`）** — Factual errors、Citation drift、Number inversion / sign flip、Cross-file inconsistency、Missing-but-promised citations、Wrong unit / wrong magnitude。
- **`illogical_agent.md`（prefix `ILL`）** — Self-contradiction within the same document、Unsupported claim、Reversed causation / correlation-as-causation、Circular reasoning、Mathematical inconsistency、Thesis-vs-conclusion drift。
- **`shallow_agent.md`（prefix `SHL`）** — Surface description、Missing critical nuance、Thesis gap、Loose hand-waving phrases、PhD-tier expectation gap、Absent comparison。
- **`humanity_auditor.md`（prefix `HUM`）** — AI-flat rhythm、Imperative fog、Hedge over-clustering、Voice break、Boilerplate stamp、Manufactured-logic chains。

四個 persona 在 scope constraints 中皆明確「不得 file 其他 persona 範圍內的 finding」。實務上同一筆 prose 段落仍可能被多個 persona 命中（例如同一段同時 surface description 又 manufactured-logic chain）；此時由 orchestrator 之 `output_aggregator` 透過 section anchor 與 issue 文本做 consensus matching，並對被多 persona 命中的 finding 進行 severity bump（細節在 Phase E task 5.2 實作）。

## 7. 不在本 README 範圍

下列內容**不**屬於本檔職責，請至對應檔案查閱：

- Persona prompt 的逐字內容、severity rubric 細節、workflow suggestion — 見各 `*.md` 檔本身。
- Orchestrator 的 dispatch 機制、`output_aggregator` 實作、retry policy — 見 Phase E 之 change proposal 與實作檔案。
- Wiki refs / rationale 連結 / 每個 sharp-edge category 之外部來源 — 見 Phase G 之 wiki bundle。
- Schema 欄位逐項說明 — 直接讀 `humane-prose-audit/schemas/agent-output.schema.json`。
