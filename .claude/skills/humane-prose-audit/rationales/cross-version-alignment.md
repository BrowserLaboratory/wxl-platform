# cross-version-alignment

## What

本指標量度同一專案內、兩份文件之數值 claim 是否一致。

典型場景：`homeworks/hw02/report.typ` 與 `homeworks/hw02/tutorial.zhTW.md` 同提及 best tour length、runtime、generation count、population size 等實驗數字。

從兩檔抽出帶數字之 sentence，以 (數字 + 鄰近 unit / context noun) 為 key 配對，比對是否 align。

## Threshold

- 對整數 claim（如 `K=20`、`n=50`、`generations=200`）要求 **exact match**。
- 對 percentage / ratio claim（如「提升 3.2%」）容許 **±1 pp** 抖動。
- 對量級類數字（如 runtime ~1.5 s）容許 **±10%**。

任一 mismatch 視為 High severity finding（對應 `config.yaml` `severity.high.cross_file_inconsistency`）。

## Why

跨檔不一致是 hw02 tutorial audit（2026-05-10）抓到之重複 sharp edge：tutorial 寫 K=20，report 早期版本寫 K=15。

讀者交叉閱讀時，兩個數字打架會直接損害可信度，且通常源於其中一檔的 stale copy 未跟著實驗 rerun 更新。

`exact match` 對整數是 hard rule（沒有「四捨五入」的藉口）；`±1 pp` 對 percentage 容許 reporting 端的 rounding 差異（3.16% vs 3.2% 都合法）；`±10%` 對量級類數字容許執行環境的 wall-clock 抖動。

本 rule 與 Sloppy persona 之「cross-file inconsistency」類別重疊，但機器規則先行可大幅降低 sub-agent 負擔——dispatch 前先把確定錯的數字篩掉，sub-agent 才有餘力專注於需要語義判讀的對比。

## Limitations

False positive：兩檔正當地描述不同實驗（如 report 講 main run、tutorial 講 toy example）時，數字本就不該 align，本 rule 缺乏 context 分辨能力，需人工豁免。

False negative：兩檔皆 stale（同步錯）時雙方 match，rule 也標 OK。

數字抽取需 NLP-light parser（regex 對「2.4×10⁶」「2.4M」「2,400,000」三種寫法之 normalize 不完善）。需與 reference dataset / 實驗 log 作三方比對才能完全確認。
