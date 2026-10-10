# AI-tells vs. Perplexity 代理

本 skill 不跑 LLM forward pass 算 token-level log-prob，但仍要偵測「AI-flavored text」。我們用兩條互補路徑：**詞彙 / 標點 fingerprint**（ai_tells）與**句長變異度**（burstiness），合稱 perplexity 代理。

## 什麼是 perplexity

Perplexity 是 language model 對文本「不意外程度」的量化指標。LLM-generated 文本對 LLM 本身來說 perplexity 偏低；human-written 文本的 perplexity 分佈 burstier（高低錯落）。DetectGPT（Mitchell 2023）與 Binoculars（Hans 2024）等 detector 都建立在 perplexity 結構的 ablation 上。

本 skill 不直接算 perplexity 的兩個理由：

1. **成本**：跑 token-level log-prob 對長文需要 LLM 前向算一遍，與 sub-agent 同數量級
2. **可重現性 / cross-model**：不同 model 算出不同 perplexity 序列，沒有 universal 基準

## 我們選的代理指標

### 1. AI-tells inventory（`checks/ai_tells.py`）

掃描已知 LLM-fingerprint：

- 高頻過渡片語（"In conclusion", "It is important to note that", "綜上所述"）
- 過度修飾形容詞（"comprehensive", "robust", "seamless"）
- em-dash 與 en-dash 異常密度（OpenAI RLHF 樣本 stylistic bias）
- 列舉收束句（"From X to Y, ...", "Whether A or B, ..."）

優點：deterministic、可重現、可累積（新 tells 補進 inventory）。缺點：moving target，每次 model release 都有新 tells。

### 2. Burstiness（`checks/burstiness.py`）

句長變異度。LLM 文本句長均勻偏向「中等長」；人類寫作有短句插長句、長句插短句的節奏感。實作以句長 sequence 的 std / mean 比值為核心 metric。

優點：cross-language 適用、不依賴 vocab list。缺點：對 academic 寫作（自然較均勻）易誤判，需以 profile threshold 調校。

## 為什麼兩者一起用而非選一

- AI-tells 高 precision、低 recall（paraphrase 過一輪就看不出來）
- Burstiness 高 recall、中 precision（結構性的東西難 fake，但 academic 文體本來就均勻）
- 兩者交叉，在 humane_signal scoring 線性加權合併，PASS 與 WARN 判定才不會被單一指標主導

## Phase 4 scoring 中的角色

`humane_score = 0.3*burstiness + 0.2*(1-ai_tells_density) + 0.2*(1-imperative_fog) + 0.15*lexical_diversity_norm + 0.15*(1-boilerplate_density)`

burstiness 權重最高（0.3）反映「節奏感」比「詞彙 fingerprint」更難 fake。權重可被 `.humane-prose-audit.yaml` 之 `humane_signal.weights` 覆寫。

## 已知限制

- 對 paraphrase 過一輪的 LLM output 兩者皆失靈
- 對非英中混排語言 ai_tells 不適用
- 對「人類刻意模仿 LLM 風格」會 false positive
- 對短文（<200 chars）密度分母失真，自動 SKIP

詳見 `wiki/concepts/ai-tells/` 與 `wiki/concepts/perplexity-and-burstiness/`。
