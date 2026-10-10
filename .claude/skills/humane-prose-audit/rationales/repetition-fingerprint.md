# repetition-fingerprint

## What

本指標以 n-gram repetition fingerprint 偵測文稿中之 phrase-level 重複——即 5-word（或 5-char for 中文）連續片段在全文中之多次出現。

LLM long-form output 之常見 artifact 為 phrase echo：模型在不同段落間 verbatim 重複自己之片段（如 "leverage the power of", "在當今的時代背景下"），形成可偵測之 fingerprint。

實作：sliding window 5-gram，rolling hash 計數，輸出「reused n-gram 數量」與「最高重複次數」。與 `duplicate_sentences` 不同——後者偵測 sentence-level 完整重複，本指標偵測 sub-sentence phrase。

## Threshold

- **≥ 3 distinct 5-grams reused ≥ 3 times each**：Medium severity finding。

對應 `config.yaml` 之 `repetition_fingerprint.ngram_size: 5`、`repetition_fingerprint.min_distinct_repeats: 3`、`repetition_fingerprint.min_repeat_count: 3`。

排除 stopword-only n-gram（如 "of the and is the"）以避免噪音 trigger。

## Why

Hyland（2008）對 academic lexical bundles 之研究指出，4-gram 為 academic writing 中重複片段之自然單位；5-gram 為「明顯刻意 / 未編輯」之 signal。well-edited 學術論文中 ≥ 3 次重複之 5-gram 通常少於 2 個（且多為 domain term）。

對 ChatGPT-4 之 8K-token essay output 測量顯示，distinct 5-gram-reused-≥3 次之數量約 4–8 個；human 編輯之 long-form blog post 約 0–2 個。`≥ 3 distinct × ≥ 3 each` 為 LLM 與 human 樣本之 separation 區間。

5-gram 之選擇平衡 sensitivity 與 specificity：4-gram 含太多合法 collocation（"as a result of"），6-gram 則過於 rigid（漏掉小變化重複）。McCarthy 等對 plagiarism detection 之 5-gram baseline（2009）亦支持此選擇。

## Limitations

False positive：technical writing 中合法的 domain term phrase（如 "convolutional neural network", "梯度下降法"）會被計入；需以 stopword + domain term whitelist 過濾，本實作 whitelist 仍 minimal。

False negative：LLM 可改寫 1–2 個 token 繞過 exact n-gram match（"leverage the power of" → "harness the power of"），本指標為 lexical exact match，無 semantic similarity 機制。Embedding-based phrase similarity 可 catch 但成本高，本實作刻意停留在 hash-based fast path。

對混合語言文本需以語言分流分別 n-gram；中文之 character-level 5-gram 與英文 word-level 5-gram 語意密度不同，threshold 不可直接 share——本實作以 token type 分開計算但 threshold 共用，是已知妥協。
