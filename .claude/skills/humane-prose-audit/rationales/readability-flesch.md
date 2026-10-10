# readability-flesch

## What

本指標為 Flesch Reading Ease 分數，根據句長與音節數計算之英文文本可讀性公式：

`206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)`

值越低表示閱讀越困難；100 分接近小學程度，0 分接近 PhD 論文，負值代表病態長句或專有名詞密集。實作以 `textstat` 套件之 `textstat.flesch_reading_ease()` 取得，依賴 `py-readability-metrics` 作 secondary cross-check。

## Threshold

各 tier 期待 band：

- PhD-tier：0–40 之 hard band（刻意難讀）。
- undergrad-tier：30–50。
- 高中科普 tier：60–80。

對應 `config.yaml` 中 `readability.flesch_min: 0` 與 `readability.flesch_max: 40`（PhD baseline）。tier 切換由 audit orchestrator 依文件類型套用不同上下界，預設值針對 PhD report。

## Why

Flesch（1948）原始 paper 與 DuBay（2004）回顧均指出，學術寫作平均落於 30–50；science journals 更低至 0–30；Harvard Business Review 之 explainer 落於 50–60。`0–40` band 對齊 IEEE / ACM 期刊樣本之中位數。

低於 0 通常代表病態長句或專有名詞密集——非「更專業」而是「未編輯」。Reviewer 對極低 Flesch 之文稿之 reaction 通常是「讀不下去」而非「敬畏」。

高於 40 對 PhD 文體不適合：意味簡化過頭，論證厚度通常不足。tier 期待因此設為「可讀但不過簡」之 hard band。

## Limitations

僅適用英文：對中文文本 Flesch 公式無效（語素切分與音節定義不適用），中文文檔需 fallback 至 char-per-sentence 之 proxy 並標 SKIPPED。

對混合語言文檔（中英 typst report）以英文段為主計算可能偏誤；對 code-heavy 文檔（含 pseudo-code 段）公式被 token 拉扯，需 pre-strip code block。

本指標單看不足以判 PASS / FAIL，需與深度評估搭配；極端值（< 0 或 > 100）通常意味解析錯誤而非真實 reading ease。
