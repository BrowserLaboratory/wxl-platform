# hedge-density

## What

本指標量度 hedge（避諱詞、語氣弱化詞）在文稿中之密度，單位 hedges / 1000 chars。

Hedge 是「降低斷言強度」之語言策略，常見詞如：

- 英文："may", "might", "could", "potentially", "arguably", "somewhat", "it seems that", "in some sense"
- 中文：「可能」、「或許」、「某種程度上」、「似乎」、「在某些情況下」、「有可能」、「可說是」

LLM output 之顯著 fingerprint 之一即 over-hedging——模型在 RLHF safety training 後傾向迴避明確斷言。

實作：substring count，hedge list 由 `config.yaml` 之 `hedge_density.terms` 維護，密度 = count / (chars / 1000)。

## Threshold

- **> 12 / kchar**：Medium severity finding（明顯 over-hedging）。
- **> 8 / kchar**：Low severity finding（hedge 略多）。

對應 `config.yaml` 之 `hedge_density.medium_per_kchar: 12` 與 `hedge_density.low_per_kchar: 8`。

## Why

Biber（1988）對 academic register 之 hedging 統計顯示，well-edited research paper 之 hedge 密度約 3–7 / kchar；popular science writing 約 4–8 / kchar。Hyland（1998）之 academic hedging 專書亦給出類似 band。

我們對 ChatGPT-4 預設輸出之 hedge 密度測量為 10–18 / kchar，顯著高於 human baseline。`12` 為 LLM 中位數附近、`8` 為 human 上尾，兩者之間屬可接受但偏多區間。

Over-hedging 之代價為論述失焦——讀者無法分辨作者是真在 hedge 還是 padding。技術寫作場景中，hedge 應精準對應 epistemic uncertainty（如「實驗 n=3，結果可能受 noise 影響」），而非 boilerplate（"This could potentially be useful in some scenarios"）。

## Limitations

False positive：學術寫作中正當的 epistemic hedging（如統計結果之 "may", "suggests"）會被計入；無法區分 boilerplate hedge 與 calibrated hedge。

False negative：作者可改用同義詞繞過 list（如把 "may" 換成 "is likely to"），靜態詞表無法 catch paraphrase。Hedge 之語意判斷本質需 NLI / dependency parse，但本實作刻意停留在 lexical 層。

對混合語言文本，hedge list 需中英並列。對純 method 章節（演算法 step-by-step）期待密度近 0，需依章節 context 調整 threshold。
