# burstiness-threshold

## What

本指標量度句長變異度（burstiness），定義為文稿中所有句子之 word-count 標準差除以平均值（coefficient of variation, CV）。

human 寫作之句長分布通常呈現高 burstiness——短句與長句交替；LLM output 傾向收斂至 mean，產生 monotone 之句長節奏。

實作：以標點切句（`[。.!?！？]` 為主），過濾 < 3 words 之 fragment，計算 stdev / mean。需至少 5 句以上樣本才產出 finding。

## Threshold

- **CV < 0.30**：Medium severity finding（句長近乎 uniform，AI-like rhythm）。
- **CV < 0.45**：Low severity finding（缺乏節奏變化）。
- **min 5 sentences**：低於此樣本數則 SKIP。

對應 `config.yaml` 之 `burstiness.cv_medium: 0.30` 與 `burstiness.cv_low: 0.45`。

## Why

Burstiness 為 AI-text detector 文獻之核心 feature——GPTZero（Tian, 2023）將 perplexity + burstiness 並列為兩大 signal。Lavergne 等（2008）對 machine-generated text 之早期統計分析亦指出，n-gram language model output 之句長分布顯著比 human writing 收斂。

`0.30` 與 `0.45` 之 threshold 來自我們對三類樣本之測量：

- ChatGPT-4 預設 essay output：CV ≈ 0.20–0.32
- 人工編輯之 technical blog post：CV ≈ 0.45–0.70
- 大學課程報告（human）：CV ≈ 0.40–0.65

`0.30` 為 LLM-default 之上尾，`0.45` 為 human 寫作之下尾，兩者之間屬模糊地帶。我們刻意採用兩 tier 而非單一 threshold，以承認此 metric 之內在不確定性。

## Limitations

False positive：列表、bullet list、code block 內句若未過濾會壓低 CV——本實作以正規表達式 strip fenced code 與 markdown list marker，但無法處理所有 edge case。

False negative：作者刻意以短句節奏寫作（如新聞體、推理小說）會落入 medium band 但屬 stylistic choice 而非 AI 殘留。本指標純粹統計、無語意理解。

對中文文本以全形句號切句通常 robust，但混排英文 abbreviation（"e.g."、"Dr."）需 pre-process。極短檔（< 5 句）不應採信此指標。
