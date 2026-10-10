# How Checks Map to Wiki

本 skill 每個 deterministic check 都連結到至少一個 wiki concept page，每個 concept page 至少引用一篇 paper。本文是「check ↔ concept page ↔ paper」的對照表，便於：

- 追蹤某條規則背後的學術依據
- 確認 `wiki_integrity.py` 的 traceability 守則沒漂移
- 開發新 check 時知道該往哪個 wiki area 補概念

## 對照表

| Check                                | Wiki Concept Page                                            | 主要支撐 Paper                                       |
| ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| `checks/ai_tells.py`                 | `wiki/concepts/ai-tells/delve-tapestry-navigate.md`          | Mitchell 2023 DetectGPT、Hans 2024 Binoculars         |
| `checks/ai_tells.py`（em-dash）       | `wiki/concepts/ai-tells/em-dash-overuse.md`                  | OpenAI 2024 technical report                          |
| `checks/imperative_fog.py`           | `wiki/concepts/ai-tells/imperative-fog.md`                    | Wachsmuth 2017                                       |
| `checks/lazy_writer_check.py`        | `wiki/concepts/ai-tells/listicle-structure.md`                | （內部 rationale + Williams 1981）                    |
| `checks/burstiness.py`               | `wiki/concepts/perplexity-and-burstiness/burstiness-definition.md` | Mitchell 2023 DetectGPT                          |
| `checks/burstiness.py`（method tie） | `wiki/concepts/perplexity-and-burstiness/detectgpt-method.md` | Mitchell 2023                                        |
| `checks/burstiness.py`（method tie） | `wiki/concepts/perplexity-and-burstiness/binoculars-method.md` | Hans 2024                                           |
| `checks/hedge_density.py`            | `wiki/concepts/argumentation/toulmin-model.md`                | Toulmin 1958                                         |
| `checks/imperative_fog.py`（argo）   | `wiki/concepts/argumentation/argument-quality.md`             | Wachsmuth 2017                                       |
| （sub-agent `illogical_agent`）       | `wiki/concepts/argumentation/informal-fallacies.md`           | Walton et al. 2008                                   |
| `checks/discourse_marker_density.py` | `wiki/concepts/coherence/halliday-hasan-cohesion.md`          | Halliday & Hasan 1976                                |
| `checks/pronoun_consistency.py`      | `wiki/concepts/coherence/centering-theory.md`                 | Grosz, Joshi & Weinstein 1995                        |
| （sub-agent `illogical_agent`）       | `wiki/concepts/coherence/rst-rhetorical-structure-theory.md`  | Mann & Thompson 1988                                 |
| `checks/lexical_diversity.py`        | `wiki/concepts/readability-and-style/lexical-diversity-mtld.md` | McCarthy & Jarvis 2010                             |
| `checks/readability_metrics.py`      | `wiki/concepts/readability-and-style/flesch-reading-ease.md`  | Flesch 1948                                          |
| `checks/readability_metrics.py`      | `wiki/concepts/readability-and-style/coh-metrix.md`           | McNamara 2014                                        |
| `checks/lazy_writer_check.py`        | `wiki/concepts/readability-and-style/editorial-style-frameworks.md` | Williams 1981、CMOS                              |
| `checks/repetition_fingerprint.py`   | `wiki/concepts/coherence/halliday-hasan-cohesion.md`          | Halliday & Hasan 1976（lexical cohesion）             |

## Method-level 對照

`output_aggregator.py` 與 humane_signal scoring 對應 `wiki/methods/` 兩份方法論：

| 模組                          | Wiki Method Page                          |
| ----------------------------- | ----------------------------------------- |
| `scripts/output_aggregator.py`（consensus bump） | `wiki/methods/consensus-severity.md`      |
| `scripts/output_aggregator.py`（humane scoring）  | `wiki/methods/humane-signal-pipeline.md`  |

## Sub-agent persona 對照

| Persona                  | 主要參照框架                                            |
| ------------------------ | -------------------------------------------------------- |
| `sloppy_agent` (SLP)     | factual accuracy rubric（自家定義）                       |
| `illogical_agent` (ILL)  | Toulmin / Wachsmuth / Walton（見 `argumentation-frameworks.md`） |
| `shallow_agent` (SHL)    | Bloom's taxonomy + Wachsmuth depth dimension              |
| `humanity_auditor` (HUM) | AI-tells inventory + DetectGPT / Binoculars 衍生         |

## Integrity 守則回顧

`scripts/wiki_integrity.py` 強制：

1. 每個 `checks/<rule>.py` docstring 至少引用 1 個 `wiki/concepts/<area>/<page>.md`
2. 每個 wiki concept page frontmatter 列至少 1 篇 paper
3. arXiv 標 `tier: preprint` 的 paper 不能作為 Critical-rule 唯一依據

當新增 check 時，先確認 wiki 已有對應 concept page；沒有就先用 `scripts/wiki_orchestrator.py` 補概念頁與 paper，再開 check。
