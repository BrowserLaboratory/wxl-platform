# Coherence Frameworks

本 skill 不直接實作完整 coherence parser，但 sub-agent `illogical_agent` 與 `humanity_auditor` 的 prompt、以及 `lazy_writer_check` 部分規則，都參考三個古典 coherence 框架。本文整理三者各自的 lens、與本 skill 的對應關係。

## 三個古典框架

### 1. Rhetorical Structure Theory（RST，Mann & Thompson 1988）

把文章拆成 EDU（Elementary Discourse Unit）並標記之間的 rhetorical relation（cause, contrast, elaboration, condition, evidence...）。一篇 coherent 的文章可形成一棵完整的 RST tree；切不出 tree 或 tree 有孤兒節點則代表 coherence 病灶。

本 skill 中的角色：

- `illogical_agent` 在 6 categories 中包含「rhetorical break」（claim 與 evidence 之間找不到 RST 關聯）
- `lazy_writer_check` 部分規則偵測「鬆散的 contrast / elaboration 連接詞」（如「然而」、「另外」過量但無實質 contrast）

### 2. Centering Theory（Grosz, Joshi & Weinstein 1995）

關注「主語 / 主題」在連續句之間的轉換。每句有 backward-looking center（Cb）與 forward-looking centers（Cf）；coherent 文本應使 Cb 連續、Cf 轉換 smooth；frequent center shift 是 coherence 訊號。

本 skill 中的角色：

- `pronoun_consistency.py` 部分偵測對應 center shift（你 / 我 / 他 / 讀者 / 作者切換）
- `humanity_auditor` 的「voice break」category 對應 Cb 不穩

### 3. Halliday & Hasan Cohesion（1976）

把 cohesion 機制分五類：reference、substitution、ellipsis、conjunction、lexical cohesion。Lexical cohesion 又分 reiteration（同詞 / 同義詞 / 上位詞）與 collocation。Cohesion device 過稀或過密都是病灶。

本 skill 中的角色：

- `repetition_fingerprint.py` 偵測 lexical cohesion 之 reiteration 過量（rolling hash 抓 n-gram 重覆）
- `discourse_marker_density.py` 偵測 conjunction 過量
- `lexical_diversity.py`（MTLD）反向偵測 lexical cohesion 過稀

## 為什麼不直接跑 RST parser

- 可用的 RST parser（如 `DPLP`, `gCRF`）對中英混排品質不穩
- parse 成本高（O(N²) 至 O(N³)）
- 不同 parser 不同 tree shape，跨 model 不可重現

本 skill 改採「rule-based 偵測 + sub-agent 對抗稽核」的雙軌：rule 抓密度異常，sub-agent 抓 rhetorical break。

## 與 Coh-Metrix 的關係

Coh-Metrix（McNamara 2014）把上述框架整合為 100+ 個量化指標。本 skill 抽取其中 4 個最 robust 的指標子集（lexical diversity、connective density、referential cohesion proxy、given/new ratio proxy）作為 deterministic check 的底層，避免引入完整 Coh-Metrix 的部署成本。

詳見 `wiki/concepts/coherence/` 與 `wiki/concepts/readability-and-style/coh-metrix.md`。
