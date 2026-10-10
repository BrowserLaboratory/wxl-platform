# citation-density

## What

本指標量度文稿中每千字（1000 chars）出現的 `cite()` 呼叫數，作為「論述是否被外部來源支撐」之 proxy。

計算方式為：`count(cite_regex matches) / (len(text_chars) / 1000)`。

對 typst 文檔以 `cite\(<?[A-Za-z0-9_-]+>?\)` regex 抽取（對應 `config.yaml` 中的 `citation.cite_regex`）；對 markdown 文檔以同等的 footnote 或 bibtex key pattern。長度單位採用「char count」而非「word count」，以同時支援中英混排。

## Threshold

- **PhD-tier**：期待密度 ≥ 8 cites / 1000 chars。
- **undergrad-tier**：期待 ≥ 4 cites / 1000 chars。
- **高中科普 tier**：不設下限（敘事性質導向，過多 cite 反而傷害流暢度）。

`config.yaml` 暫未直接導出本 key，由 audit 報告階段依文件 tier 套用（tier 標籤通常寫在文檔 frontmatter 或檔名約定）。

## Why

Hyland（2004）對 240 篇學科論文之 citation pattern 分析顯示，hard science 與 engineering paper 平均每千字 6–10 次 cite，humanities 更高至 10–15 次。PhD-tier 寫作期待落在此 band 內。

我們以 `8` 作為 hard science 中位數作為 PhD floor；以 `4` 作為大學課程報告之最低要求（NTUEE 11402 課堂上教師之口頭期待是每段至少一 cite，每段約 250 chars）。低於 floor 通常意味論述空泛或論斷未對齊文獻。

本指標純粹計數，不評估 cite 品質——後者由 `cite-probe` skill（驗 cite 是否 verifiable）與 Sloppy persona（驗 cite key 是否 resolvable）各自處理。

## Limitations

False positive：純方法論述章節（如演算法 pseudo-code 段、實作 detail）可能正當地低 cite，此 metric 會誤報。

False negative：作者可能塞入無關 cite 衝高密度（俗稱「灌水」），本指標純計數無法分辨。

指標僅作為 first-line signal，需與 Shallow persona 之深度評估 cross-check。對短檔（< 1000 chars）密度震盪過大，計算時需 floor 文長否則小樣本扭曲分母。
