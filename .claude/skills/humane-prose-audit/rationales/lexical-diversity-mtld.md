# lexical-diversity-mtld

## What

本指標以 MTLD（Measure of Textual Lexical Diversity, McCarthy & Jarvis 2010）量度文稿之詞彙多樣性。MTLD 之優勢在於 sample-size independent——不同長度文本之 MTLD 值可直接比較，避免 TTR（type-token ratio）對短文之偏誤。

MTLD 計算流程：

1. tokenize 全文，sliding through tokens 計算 running TTR。
2. 當 running TTR 跌至 threshold（預設 0.72）時，記為一個 "factor"，並 reset。
3. MTLD = total_tokens / factor_count。

文本越多樣 → factor 越長 → MTLD 越高。

## Threshold

- **MTLD < 40**：Medium severity finding（詞彙重複度高，AI-like）。
- **MTLD < 60**：Low severity finding。
- **min 50 words / tokens**：低於此樣本數則 SKIP。
- **TTR reset threshold = 0.72**（McCarthy & Jarvis 原始 paper 之建議值）。

對應 `config.yaml` 之 `lexical_diversity.mtld_medium: 40`、`lexical_diversity.mtld_low: 60`、`lexical_diversity.ttr_threshold: 0.72`、`lexical_diversity.min_tokens: 50`。

## Why

McCarthy & Jarvis（2010）對 essay corpus 之 validation 顯示，well-written academic prose 之 MTLD 通常落於 70–110；ESL 學生寫作約 50–80；機器翻譯與 LLM output 約 35–55。

`60` 為 academic floor、`40` 為 LLM 中位數附近，兩者作為 low / medium 之 cut。MTLD 對長度不敏感之特性使其特別適合 audit 場景（不同章節長度差異大）。

LLM output 偏向重複使用「safe」vocabulary——RLHF 訓練之 reward model 偏好 lexical 穩定性，產生 mode collapse 之 vocabulary fingerprint。MTLD 是定量捕捉此 fingerprint 之主流 metric（亦見於 Sardinha 2024 對 ChatGPT corpus stylistic 之分析）。

## Limitations

MTLD 假設 English-like tokenization——以 whitespace 為主、word boundary 清晰。中文需先以 jieba / pkuseg 等 segmenter tokenize，segmentation 品質直接影響 MTLD 計算（粗 segment 會虛假抬高多樣性）。

False positive：technical domain 之專有名詞（如生物學 species name、化學式）會被計為多 type，虛假抬高 MTLD；反之 method 章節（重複 "model", "training", "loss"）會虛假壓低。

False negative：作者可使用同義詞 trick 提高 MTLD 但語意空轉（如把 "method" 輪流替換為 "approach", "technique", "framework"）。MTLD 看 type 不看 semantic redundancy。

對 < 50 tokens 之短檔本指標不可信；對混排語言文本需先語言分流再分別計算。
