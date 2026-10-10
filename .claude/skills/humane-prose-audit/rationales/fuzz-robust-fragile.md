# fuzz-robust-fragile

## What

本指標量度某 metric 在 fuzz 變體下之穩定性。

對輸入文檔跑 3 個 mutator（typo_inject / sentence_reorder / citation_strip），每 mutator 產生 K=5 變體，重跑相同 pre-flight checks，量度 metric value 之 max-change ratio：

`max_change = max(|m_i − m_baseline|) / m_baseline`，over all i ∈ {1..K}

## Threshold

- `max_change < 5%` → 標 **robust**。
- `max_change > 30%` → 標 **fragile**。
- 5%–30% 之間視為 indeterminate（不下結論）。

對應 `config.yaml` `fuzz.robust_threshold_pct: 5` 與 `fuzz.fragile_threshold_pct: 30`，K 由 `fuzz.k: 5` 控制。

fragile metric 在 audit 報告中不單獨用來下 verdict——僅作為 supplementary insight。

## Why

K=5 為穩定性檢測之最小可信數量：K<3 時單一 outlier 主導，K>10 邊際效益遞減而 token 成本爆炸（archived design D4 之 trade-off 分析）。

`5%` robust threshold 對齊「噪音層級可忽略」之經驗 floor——此級變動通常在統計 noise 之內，metric 對該擾動類型不敏感是 desirable property（reproducibility）。

`30%` fragile threshold 對齊「噪音層級不可忽略」之經驗 ceiling——metric 對 surface-level 擾動（typo）就大幅變動意味該 metric 本身不穩，不應單獨用來下 verdict。

fuzz 之目的不是讓文稿「通過 fuzz」，而是告訴 author 哪些 metric 對哪種擾動敏感——例如「citation-density 對 typo robust 但對 reorder fragile」這種 insight 比 single PASS / FAIL 有用。

## Limitations

False positive：mutator 本身可能引入 bug（如 citation_strip 刪掉了 ref entry 而非 inline cite），導致 metric 偽 fragile，需 mutator-side test 排除。

False negative：對極短文檔（< 1000 chars）任何擾動都會放大 ratio，使 metric 看似 fragile 但實為樣本太小；SKILL.md 已註明 fuzz 適用條件為 ≥ 3000 chars。

fuzz K=5 對 metric 之 statistical power 仍偏低（confidence interval 寬），robust / fragile 之 binary 標籤掩蓋了實際 distribution——對高賭注 verdict 不建議單看本指標。
