# voice-marker-density

## What

本指標量度 phoenix-writing 風格 voice marker 在文稿中之密度，單位為 markers / 1000 chars。

Voice marker 為 phoenix-writing skill 定義之第一人稱姿態詞與口語連接詞集合，例如：「我們」、「來看」、「想像一下」、「不過」、「其實」、「換句話說」等。

實作上由 phoenix-writing skill 之 `reference/markers.md` 提供關鍵詞表，audit script 以 substring count 計算總出現次數除以文長（千字單位）。

## Threshold

理想 band 為 **1–3 markers / 1000 chars**：

- < 1：表示文本過於形式化、失去 author voice。
- > 3：表示口語化過頭、犧牲論文嚴謹度。

`config.yaml` 中 `lazy_writer.max_density_per_kchar: 2` 為相關但不同指標（template phrase，而非 voice marker）。voice marker 表由 phoenix-writing skill `reference/markers.md` 供應，audit 階段需先載入該檔。

## Why

在 tutorial vs research paper 之比對中觀察到，voice marker 密度與閱讀友好度正相關（在 < 5000 chars 樣本下），但與學術嚴謹度感受負相關。

`1–3 / kchar` 是 hw02 tutorial.zhTW.md（已 PASS）與 phoenix-writing skill `examples/` 內三篇樣本之實測 band，作為經驗 baseline 採用。

phoenix-writing 之設計初衷為「保留 author 在場感」而非 colloquialism，因此下界用以避免機器人語氣、上界用以避免敘事侵蝕論證。本指標也對照 phoenix-writing 自身 EAL+ 自驗結果——當 EAL+ 報 voice 過弱時，本指標通常落在 < 1 / kchar。

## Limitations

False positive：技術名詞與 voice marker 共用字串（如「來看 baseline」之「來看」既是 marker 又屬正常技術敘述）時計數膨脹。

False negative：作者使用未被 marker 表收錄之個人風格詞時為零，但本指標不是 voice 缺席之唯一證據。

對英文文檔此 metric 不適用（marker 表為中文），應 skip。對純 method 章節（演算法描述）期待密度可降為 0–1 / kchar，需依章節 context 調整。
