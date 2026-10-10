# Argumentation Frameworks

本 skill 對「邏輯破洞」的偵測由 sub-agent `illogical_agent` 主導；其 prompt 與 evaluation rubric 取自三個古典論證框架。本文整理框架本身、以及它們如何映射到本 skill 的 6 categories rubric。

## 三個框架

### 1. Toulmin Model（Stephen Toulmin, *The Uses of Argument*, 1958）

把論證拆解為六個元素：**Claim**（主張）、**Data / Grounds**（支持的事實）、**Warrant**（claim 與 data 的橋）、**Backing**（warrant 的權威依據）、**Qualifier**（限定詞，如「通常」、「在大多數情況下」）、**Rebuttal**（反例 / 例外情境）。

健全論證至少需 Claim + Data + Warrant；缺 warrant 是最常見病灶（claim 與 data 之間有跳躍，但作者沒明說橋接邏輯）。

本 skill 中的對應：

- `illogical_agent` rubric 中 ILL1（warrant gap）、ILL2（missing qualifier）、ILL3（unaddressed rebuttal）直接對應 Toulmin 元素
- `humanity_auditor` HUM4（manufactured-logic chain）對應「假裝有 warrant 但其實是 hand-waving」

### 2. Wachsmuth et al. 2017（Argument Quality Dimensions）

提出 argument quality 的 15 個 dimension，分三大類：logical（acceptability、relevance、sufficiency）、rhetorical（clarity、appropriateness、credibility、emotional appeal、arrangement）、dialectical（global acceptability、global relevance、global sufficiency 等）。

本 skill 中的對應：

- `illogical_agent` ILL4（insufficient evidence）對應 logical sufficiency
- `shallow_agent` SHL2（surface description without analysis）對應 dialectical depth
- `humanity_auditor` HUM5（boilerplate stamp）對應 rhetorical appropriateness 失靈

### 3. Walton 的 Argument Schemes & Critical Questions（Walton, Reed, Macagno 2008）

把日常論證的 60+ 種典型 pattern（appeal to authority、appeal to expert opinion、analogy、cause to effect ...）整理為 schemes，每個 scheme 配套 critical questions（問此 scheme 可能崩潰的條件）。

本 skill 中的對應：

- `illogical_agent` 在 6 categories 中保留「fallacy detection」槽位（appeal to authority without credentials、false analogy、post hoc ergo propter hoc 等）
- 細部 fallacy inventory 寫在 `wiki/concepts/argumentation/informal-fallacies.md`

## 為什麼三個都用而非選一

- Toulmin 是 prescriptive（教如何寫健全論證）
- Wachsmuth 是 descriptive + measurable（給 sub-agent 評分尺度）
- Walton 是 cataloging（給 sub-agent 一張可掃描的 fallacy checklist）

三者在 sub-agent prompt 中分別擔任不同腳手架：Toulmin 給 element 框架、Wachsmuth 給 quality dimension、Walton 給 fallacy lookup table。

## 為什麼不跑 argument mining

可用的 argument mining 工具（如 MARGOT、TARGER）對中英混排品質不穩；本 skill 採「rule-based deterministic check + sub-agent 對抗稽核」的雙軌：

- deterministic：`hedge_density.py` 與 `imperative_fog.py` 抓 Toulmin 的 qualifier 與 warrant fog
- sub-agent：`illogical_agent` 把整個 Toulmin / Wachsmuth / Walton 三框架編成 6 categories rubric，逐 section 評分

詳見 `wiki/concepts/argumentation/` 三個概念頁：`toulmin-model.md`、`argument-quality.md`、`informal-fallacies.md`。
