# word-count-band

## What

本指標量度文稿主章節（或整檔）之字元數（中文 char count）或詞數（英文 word count），用於判斷是否符合該 tier 之期待篇幅。

中英混排以 char count 為主，純英文文檔以 word count 為主，由 audit orchestrator 依檔副檔名與內容語言自動選擇。

實作上以標準函式庫 `len()` 計 char、`str.split()` 計 word；對 typst 文檔需先 strip markup（`#`、`@`、`<>`、`[`、`]` 等）以免膨脹計數。

## Threshold

各 tier 預期 char 範圍（per main section / per top-level chapter）：

- 高中科普 tier：500–1500 chars。
- undergrad-tier：1500–3500 chars。
- PhD-tier：3500–8000 chars。

過短視為「未充分展開」（Shallow persona 領域）；過長視為「未編輯」或「主題漂移」（Illogical persona 領域）。

此 band 不在 `config.yaml` 直接導出，由 audit 階段依文件 tier 標籤套用。

## Why

對 hw02 三檔（高中 / 大學 / 博士版）之實測 char 分布為 ~900 / ~2400 / ~5800 chars / main section，落在各 tier band 中央，符合教師之期待。

此 band 也與 NTUEE 11402 教師對作業字數之口頭期待（「博士版至少 5000 字級」）一致。

下界防止「題目偷工」（章節只放一兩句結論就跳過），上界防止「東拉西扯」（章節變成 essay）。注意這是 floor / ceiling，不是 narrow target——band 寬度刻意大於實測 ±30%，留給 author 表達空間。

## Limitations

False positive：對 figure-heavy / table-heavy 章節，prose chars 自然較少但合法（圖表本身已承擔大半資訊量）。

False negative：把段落用填充詞撐到下界並無實質深度，本指標看不出。

對 typst 文檔需先 strip markup（`#`、`@`、`<>` 等）再計數，否則 char count 偏高 5–10%。對 markdown 文檔需 strip code fence 與 link syntax，避免將 URL 計入內容字數。
