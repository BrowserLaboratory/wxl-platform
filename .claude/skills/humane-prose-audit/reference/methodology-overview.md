# Methodology Overview

`humane-prose-audit` 把對抗式文稿稽核拆成五個 phase，從便宜的 deterministic check 走到昂貴的 sub-agent 對抗，再以 fuzz、humane-signal scoring、consensus aggregation 收尾。本文整理整套方法論的設計理念與運作邏輯。

## 為什麼採五階段而非單一 LLM call

- **Token economy**：deterministic preflight 在 sub-agent 派發前先過濾，凡 Phase 1 fire Critical 即停手，省下整輪 sub-agent token
- **可解釋性**：14 個 deterministic check 各自有獨立 rationale 與 wiki concept page，作者能看到「這個 finding 來自哪條規則、規則背後是什麼學術依據」
- **跨 model 一致性**：deterministic check 不會因 model 換而漂移；sub-agent 由 schema 強制驗證輸出契約；fuzz 與 humane-signal 是 deterministic 加總
- **可重現性**：所有 mutator 與 orchestrator 接 `--seed`；同 seed + 同 fixture 兩跑 byte-identical

## 五個 phase 各自的職責

- **Phase 1 Preflight**：14 個規則式 check 抓「機械性」病灶（mainland vocab、placeholder、citation drift、AI-tells、burstiness 等）。便宜、可重複、O(N) 線性
- **Phase 2 Sub-agents**：4 個 persona（SLP/ILL/SHL/HUM）平行對抗稽核，補 deterministic check 看不見的「語意性」病灶（factual error、邏輯破洞、depth gap、AI-flat rhythm）
- **Phase 3 Fuzz**：對輸入跑 4 個 mutator，量度 metric robust vs fragile，揭露對微擾敏感的 finding
- **Phase 4 Humane-signal scoring**：用 Phase 1 部分結果線性加權出 0–100 humane_score，加 verdict 註記（不影響 PASS/FAIL）
- **Phase 5 Consolidated findings**：合併四來源、去重、共識升 severity、附 wiki refs 連結、產出 verdict

## 設計取捨

- **deterministic 與 sub-agent 共存**：兩者不替代。deterministic 對 mechanical 病灶高 recall、低 cost；sub-agent 對 semantic 病灶高 nuance、低 cost-effectiveness。組合用是 Pareto-optimal
- **線性加權 humane_score**：捨 ML 模型；換來可解釋性、可調性、無訓練資料依賴
- **JSON schema 升級為強制契約**：捨 type hints / dataclass；換來跨 language 跨 model 直接 verifiable，mock LLM 可用同一條 schema 驗

## 學術支撐

每個 deterministic check 在 docstring 連結 ≥1 個 wiki concept page；每個 concept page 引用 ≥1 篇 paper（peer-reviewed 或 preprint+共識）。整個方法論的學術 anchor 包含：

- **AI-tells 與 perplexity 代理**：DetectGPT（Mitchell 2023）、Binoculars（Hans 2024）
- **論證 / 邏輯**：Toulmin model、Wachsmuth 2017 argument quality
- **Coherence / cohesion**：RST（Mann & Thompson 1988）、Centering（Grosz 1995）、Coh-Metrix（McNamara 2014）
- **Readability / lexical**：MTLD（McCarthy & Jarvis 2010）、Flesch 1948 古典基線

詳細對照見 `reference/how-checks-map-to-wiki.md` 與 `wiki/methods/humane-signal-pipeline.md`。
