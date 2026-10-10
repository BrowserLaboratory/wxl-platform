# RESUME — humane-prose-audit 重構工程接續指南

冷啟動 session（新 chat、新 model、新作業天）的單一入口。讀完此檔即可從任何中斷點接續，不需要對話記憶。

## Phase 0 — 三步定位

跑完三條指令，就知道目前進度、上次跑到哪、最近一筆操作是什麼：

```bash
# 1. Spectra 層：task 勾選狀態（粗粒度）
spectra status humane-prose-audit-refactor

# 2. Skill 重構工程層：phase A–J milestone（中粒度）
cat humane-prose-audit/.refactor-progress.yaml

# 3. 執行歷程層：最近 20 筆操作（細粒度 / forensic）
tail -20 humane-prose-audit/.audit-journal.jsonl
```

三層持久化狀態的角色：

| 層 | 檔案 | 粒度 | 由誰維護 |
| --- | --- | --- | --- |
| Spectra | `openspec/changes/humane-prose-audit-refactor/tasks.md` | task 級 | `spectra task done` |
| Skill 重構 | `humane-prose-audit/.refactor-progress.yaml` | phase / step 級 | `scripts/progress_tracker.py` |
| 執行歷程 | `humane-prose-audit/.audit-journal.jsonl` | operation 級 | `scripts/_common/journal.py`（append-only） |

三者必須相容；任一不一致時以 Spectra tasks.md 勾選為準（pre-commit hook 與 `progress_tracker.py --validate` 自動把關漂移）。

## Phase 0.5 — 環境健檢

```bash
# pre-commit hook、schema、journal、progress tracker 自檢
python humane-prose-audit/scripts/validate_outputs.py --self-check
python humane-prose-audit/scripts/progress_tracker.py --validate
python humane-prose-audit/scripts/_common/journal.py --validate humane-prose-audit/.audit-journal.jsonl
python humane-prose-audit/scripts/wiki_integrity.py

# pytest 全部過
pytest humane-prose-audit/tests/
```

任一失敗，先讀錯誤訊息與「中斷情境 recipe」對應條目。

## 中斷情境 recipe

### 情境 A：跑到一半被 kill / context 爆掉

1. Phase 0 跑完看哪個 phase `in_progress`
2. 對應 phase 的 SOP（`reference/sop/phase-<id>.md`）讀 `## Entry State` 確認哪幾個檔案應已存在
3. 用 `spectra-apply humane-prose-audit-refactor` 繼續；或對 audit run 用 `audit_orchestrator.py --resume`

### 情境 B：上一個 session 沒收 [GATE]（spectra phase gate）

每個 phase 結尾應跑 commit → `/spectra-audit` 3-agent → 二次 commit。檢查方式：

```bash
git log --oneline -10                                           # 看最近 commit
grep -A2 "phase" humane-prose-audit/.refactor-progress.yaml     # 看 phase 標記
```

若 phase 已標 completed 但缺二次 commit，補跑 `/spectra-audit` 並 commit fix。

### 情境 C：換 model 或換 session 接力

Cross-model 一致性閘道由 schemas + `validate_outputs.py` 保證。接力時：

1. 跑 Phase 0 + Phase 0.5
2. 確認 `prompts/_README.md` 的 model-agnostic 規範自己理解
3. 若新 model 對某 persona 輸出有 schema violation，回看 `prompts/<persona>.md` 的 `## Output Contract` 與 `## Determinism Note`，必要時於 caller side 加 model-specific 包裝（不改 prompt）

### 情境 D：schema 或 journal 損毀

- schema 違規：`validate_outputs.py` 會列出第一個違反欄位；修檔再跑
- journal 不允許 in-place 編輯；若損毀，rotate（`.audit-journal.jsonl` → `.audit-journal.jsonl.bak-<ts>`）後重啟一個空 journal，並在 `.refactor-progress.yaml` 留 `note`
- progress yaml 損毀：對照 `tasks.md` 勾選狀態手動重建；用 `progress_tracker.py --validate` 驗證

### 情境 E：cite-probe / wiki 流程卡住

- `wiki_orchestrator.py` 第一步 Gate 0 檢查 `.cite-probe.env`；缺檔直接 halt 指引建檔
- 既有論文不會重複下載（idempotent）；要強制重撈手動刪 `wiki/raw/papers/<id>/`
- arXiv preprint 被擋為「critical-rule 唯一依據」時，補一篇 peer-reviewed 共識證據

### 情境 F：tasks.md 與 .refactor-progress.yaml 不一致

```bash
python humane-prose-audit/scripts/progress_tracker.py --validate
```

非零 exit 會列出第一個漂移點。Spectra tasks.md 是 source of truth；以勾選為準調整 progress yaml。

## Phase SOP 速查

每個 phase 都有獨立 SOP，含 `## Entry State`、`## Exit State`、`## Verification` 三節：

| Phase | 主題                                                | SOP |
| ----- | --------------------------------------------------- | --- |
| A | Skill 改名 + 持久化狀態檔案 bootstrap                  | [reference/sop/phase-a.md](reference/sop/phase-a.md) |
| B | Cross-model JSON schema + scripts/_common              | [reference/sop/phase-b.md](reference/sop/phase-b.md) |
| C | 14 個 deterministic preflight check                     | [reference/sop/phase-c.md](reference/sop/phase-c.md) |
| D | humanity_auditor persona + section_swap mutator         | [reference/sop/phase-d.md](reference/sop/phase-d.md) |
| E | audit_orchestrator / output_aggregator / wiki_orchestrator | [reference/sop/phase-e.md](reference/sop/phase-e.md) |
| F | Wiki bootstrap + cite-probe 撈論文                       | [reference/sop/phase-f.md](reference/sop/phase-f.md) |
| G | Wiki concept pages + integrity validator                | [reference/sop/phase-g.md](reference/sop/phase-g.md) |
| H | Profile templates + examples + fixtures                 | [reference/sop/phase-h.md](reference/sop/phase-h.md) |
| I | Verificators + pre-commit hook                          | [reference/sop/phase-i.md](reference/sop/phase-i.md) |
| J | SKILL.md / RESUME / SOP / reference 文件                | [reference/sop/phase-j.md](reference/sop/phase-j.md) |

## 接續用 spectra-apply

確認 Phase 0 三步狀態後，正常情況：

```
/spectra-apply humane-prose-audit-refactor
```

spectra-apply 會自動讀 tasks.md，跳過已勾選的 task，從第一個未勾選的繼續。

## 重要慣例（不要違反）

- **`[GATE]` 任務**：每個 phase 結尾的 `[GATE]` task 代表 spectra phase gate（commit → /spectra-audit → 二次 commit），不要跳過
- **journal append-only**：絕對不 in-place edit `.audit-journal.jsonl`
- **schema 違規不靜默**：違規必須當下處理，不要 catch 後忽略
- **idempotent 子操作**：任何 script 都應接受重複跑；新加 script 若非 idempotent 在 docstring 明示
- **cross-model 一致性**：prompt 不假設 Claude-specific 行為；model-specific 行為包到 caller side
