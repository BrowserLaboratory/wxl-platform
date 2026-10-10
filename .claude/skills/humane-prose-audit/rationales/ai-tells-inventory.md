# ai-tells-inventory

## What

本指標掃描文稿中常見的 LLM-output "tells" — 即生成式模型偏好使用的詞彙、標點與句構特徵，包括：

- 高頻過渡片語（"In conclusion", "It is important to note that", "Furthermore", "綜上所述", "值得注意的是"）
- 過度修飾形容詞（"comprehensive", "robust", "seamless", "全面的", "強大的"）
- em-dash 與 en-dash 之異常密度（ChatGPT-family 模型偏好以 em-dash 取代逗號或括號）
- 列舉收束句（"From X to Y, ...", "Whether A or B, ..."）

實作以 substring / regex match 為主，inventory 由 `config.yaml` 之 `ai_tells.vocab` 與 `ai_tells.punctuation` 兩 list 維護。輸出 vocab density 與 em-dash density 兩個獨立 signal。

## Threshold

- **vocab density > 8 / kchar**：High severity finding（明顯 AI 風格殘留）。
- **em-dash density > 5 / kchar**：Medium severity finding。
- **min 200 chars** 才計算密度，避免短檔分母失真。

對應 `config.yaml` 中 `ai_tells.vocab_high_per_kchar: 8` 與 `ai_tells.emdash_medium_per_kchar: 5`。

## Why

DetectGPT（Mitchell 等，2023）與 Binoculars（Hans 等，2024）兩支 AI-text detector 之 ablation 均指出，LLM output 與人類寫作之最強區分特徵之一為「詞彙分布偏向訓練資料之中位數」——即模型傾向選用 hedged、polished、neutral 之詞彙。em-dash 偏好則來自 OpenAI 內部 RLHF 樣本之 stylistic bias（OpenAI 2024 technical report 中亦有提及）。

`8 / kchar` 是我們對 hw02 zhTW 三版草稿與 phoenix-writing skill `examples/` 內三篇 human-edited 樣本之實測 ceiling——human 樣本最高約 5–7，超過 8 通常意味 AI 殘留。`5 / kchar` em-dash 則對應 OpenAI o1 / GPT-4o 預設 essay output 之中位數 band。

本指標刻意與 `lazy_writer` 分離：lazy_writer 偵測 template 句型（如「在...的同時」），ai_tells 偵測模型 vocabulary fingerprint，兩者語言層級不同。

## Limitations

False positive：學術寫作正當使用之過渡片語（"In conclusion" 在論文 conclusion 段是合法的）會被誤計；需以章節 context 過濾，但目前實作未做。

False negative：模型 fingerprint 是 moving target——每次 model release 都會引入新 tells、淘汰舊 tells（如 GPT-3 偏好 "Indeed" 但 GPT-4 已減少）。靜態 word list 是 brittle defense，需定期人工 update inventory。

對非英文非中文文本本指標不適用（vocab list 僅覆蓋英中混排）。對 paraphrase 過的 LLM output（如人工重寫過一輪）密度會降至 noise floor，本指標看不出來。
