# duplicate-sentence-threshold

## What

本指標計算文稿中之重複句子數。

將 prose 切句後，對長度 ≥ `min_sentence_chars`（預設 12 chars）之句子 normalize（去除標點、whitespace、case-fold），以 SequenceMatcher 或 normalized hash 比對；similarity ≥ `similarity_threshold`（預設 0.92）視為重複。

實作以標準函式庫 `difflib.SequenceMatcher` 為主，避免引入額外依賴。

## Threshold

**Zero tolerance for sentences ≥ 12 chars**。

對應 `config.yaml` 之 `duplicate_sentences.min_sentence_chars: 12` 與 `duplicate_sentences.similarity_threshold: 0.92`。

短句（如表格 cell、bullet header）豁免，因合法重複（「Yes」「No」「N/A」等）常見。

長句重複即 finding，severity 預設 Medium；連續 ≥ 3 對升 High（系統性 copy-paste signal）。

## Why

長句重複通常源於三種情境：

1. copy-paste 後忘編輯（hw02 早期草稿曾出現 abstract 與 intro 同句）。
2. 章節間複述同一定義（應改為 cross-ref 而非整句重貼）。
3. AI generation artifact（LLM 在長文中重複自己，多見於 8K+ token 生成）。

`12 chars` 為中文約 6 字、英文約 2 詞之最小語意單位 floor；低於此值之短重複通常為合法。

`0.92` similarity 容許「了」/「的」之微差但拒絕實質改動。Hyland 等（2008）對學術文體之 lexical bundles 研究亦指出 ≥ 4 詞之重複片段為「未編輯」之常見 signal。

## Limitations

False positive：合法的 epigraph / leitmotif 重複（如章節之 callback 句）會被誤標，需作者人工豁免機制（如加 sentinel comment）。

False negative：作者改寫 5–10% 字面（plot twist：把「我們提出」改成「本工作提出」）可繞過 similarity threshold；需 semantic dedup（embedding-based）才能抓到，但本指標刻意限定在 lexical 層。

對混合語言句子（中英夾雜）normalize 步驟易出錯，建議僅在主語言一致之 sentence pool 內比對。
