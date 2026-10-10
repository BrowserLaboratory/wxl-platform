# discourse-marker-density

## What

本指標量度 discourse marker（語篇連接詞）在文稿中之密度，單位 markers / 1000 chars。

Discourse marker 為連接句子或段落之邏輯詞，常見如：

- 英文："Moreover", "Furthermore", "However", "In addition", "Therefore", "Consequently", "On the other hand"
- 中文：「此外」、「然而」、「因此」、「另一方面」、「總而言之」、「綜上所述」

LLM output 之 fingerprint 之一即 discourse marker 過量——模型以 marker 為 RLHF-trained scaffolding，每段開頭幾乎都有，產生「過度形式化」之段落節奏。

實作：substring count，marker list 由 `config.yaml` 之 `discourse_marker.terms` 維護。

## Threshold

- **> 8 / kchar**：Medium severity finding。
- **> 5 / kchar**：Low severity finding。

對應 `config.yaml` 之 `discourse_marker.medium_per_kchar: 8` 與 `discourse_marker.low_per_kchar: 5`。

## Why

Halliday & Hasan（1976）將 discourse marker 歸為 cohesion 之 conjunction 類型，是建構段落間邏輯關係之核心 device。但 Schiffrin（"Discourse Markers", 1987）對自然語料之統計顯示，well-edited prose 之 marker 密度約 2–6 / kchar；過量使用反而傷害 flow——讀者被反覆提示「這是 contrast」「這是 cause」，喪失自行建構邏輯之空間。

對 ChatGPT-4 預設 essay output 測量為 9–15 / kchar，顯著高於 human baseline。`8` 為 LLM 中位數附近、`5` 為 human writing 上尾。

本指標與 `ai_tells` 互補——`ai_tells` vocab list 包含部分 marker 但只計算總密度，本指標獨立追蹤 discourse-level signal 以便細部 debug。

## Limitations

False positive：論證型寫作（如法律 brief、philosophy essay）天然多 marker，會被誤報；需以文類 metadata 豁免。學術論文之 discussion 章節亦合法偏高。

False negative：作者可用標點代替（"; however," → ","）或省略 marker 改用 implicit logic，過量問題仍存在但本指標看不到。中文之非典型 marker（如「話說回來」、「說起來」）若不在 list 內亦會 miss。

對混合語言文本，marker list 需中英並列，且 substring count 之中文「然」、「故」、「即」可能與其他詞共字（false positive）；本實作以詞邊界 regex 緩解但無法根除。對 < 500 chars 短檔分母不穩、不應採信。
