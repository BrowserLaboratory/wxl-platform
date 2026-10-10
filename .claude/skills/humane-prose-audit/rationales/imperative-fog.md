# imperative-fog

## What

本指標量度「模糊祈使句」（imperative fog）在文稿中之密度，單位 fog-imperatives / 1000 chars。

Fog imperative 為含 imperative 結構但動作目標模糊之指示句，常見模式：

- 英文："Consider X", "Note that ...", "Keep in mind that ...", "Be aware that ...", "Remember to ..."
- 中文：「請注意」、「值得思考」、「需要留意」、「不妨考慮」、「請記住」

此類句型在 LLM tutorial output 中過量出現——模型以「提示讀者」之姿態填充段落，但對讀者真正可執行之動作毫無交代。

實作：以 regex 抓取 imperative head（"Consider", "Note", "請注意" 等）後接 ≥ 4 words / chars 之 complement，計算總 hit / (chars / 1000)。

## Threshold

- **> 6 / kchar**：Medium severity finding。
- **> 3 / kchar**：Low severity finding。

對應 `config.yaml` 之 `imperative_fog.medium_per_kchar: 6` 與 `imperative_fog.low_per_kchar: 3`。

## Why

技術文件之 imperative 應指向具體動作（"Run `pip install foo`", "執行 `make test`"）；fog imperative 之問題在於 imperative form 與抽象 content 之搭配製造「我在指導讀者」之假象，實則無 actionable instruction。

對 ChatGPT-generated tutorial 之測量顯示 fog imperative 密度 5–12 / kchar；human 編寫之 technical blog 約 1–3 / kchar；well-edited reference doc 接近 0。`6` 為 LLM tutorial 中位數、`3` 為 human ceiling，取兩者作為 medium / low 之 cut。

Williams 與 Bizup（"Style: Lessons in Clarity and Grace", 2014）之 cohesion 章節亦指出，"Note that" 類連接詞在技術文件中常被誤用為 filler，剝奪段落主動結構。本指標可視為 Williams 建議之 quantification。

## Limitations

False positive：合法的 tutorial step（"Consider this example: ..." 後接具體 code）會被誤計；imperative head 之語境判斷需 dependency parse 才能精準，本實作純粹 regex 不分 case。

False negative：作者改寫 imperative 為陳述句（"It is worth noting that ..." → "We note that ..."）可繞過 regex；亦無法 catch 中文較委婉之 fog（如「也許可以這樣想」）。

對純命令式 reference doc（如 man page）期待密度 < 1 / kchar，需依文檔類型調整 baseline。
