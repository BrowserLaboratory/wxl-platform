---
name: phoenix-writing
description: Emulates Phoenix's popular science writing style for any technical or educational domain in Traditional Chinese (Taiwan). Use when user says "write in Phoenix style", "use Phoenix's tone", "continue writing this book chapter with Phoenix", or when converting technical content into Traditional Chinese popular science prose.
---

# Phoenix's Popular Science Writing Style Guide

## Script Resolution

The article validator script is at `scripts/validate_article.py` within this skill's directory.

1. Take this skill's base directory (shown in the system prompt as "Base directory for this skill:")
2. The script is at `<base_dir>/scripts/validate_article.py`

Example: if base directory is `/home/user/.agents/custom_skills/phoenix-writing`,
then the script is `/home/user/.agents/custom_skills/phoenix-writing/scripts/validate_article.py`.

**If the base directory is not in the system prompt**, discover it:
```bash
VALIDATOR_SCRIPT=""
for dir in \
  ~/.agents/custom_skills ~/.agents/skills ~/.claude/skills \
  ~/.gemini/skills ~/.cursor/skills ~/.copilot/skills ~/.codex/skills; do
  [ -f "$dir/phoenix-writing/scripts/validate_article.py" ] && \
    VALIDATOR_SCRIPT="$dir/phoenix-writing/scripts/validate_article.py" && break
done
[ -z "$VALIDATOR_SCRIPT" ] && echo "ERROR: validate_article.py not found in any known skill directory" >&2
echo "VALIDATOR_SCRIPT=$VALIDATOR_SCRIPT"
```

**Verify before first use:**
```bash
ls "$VALIDATOR_SCRIPT"
```

Once resolved, use this absolute path (`VALIDATOR_SCRIPT`) for all validator commands in this session.

---

## Core Style DNA

**Rigorous academic skeleton dressed in a casual, conversational coat.** Readers finish each piece having genuinely learned something, without ever feeling like they were reading a textbook.

---

## Language Convention

**CRITICAL — Always follow without exception:**

- Write all article output in **Traditional Chinese (Taiwan usage)**
- First occurrence of any technical term: 中文（English Full Name，Abbreviation）
  - Example: 資訊安全管理系統（Information Security Management System，ISMS）
- **Strictly prohibit** Simplified Chinese / Mainland phrasing. Use Taiwan equivalents:
  - ❌ 软件 → ✅ 軟體　❌ 视频 → ✅ 影片　❌ 文件夹 → ✅ 資料夾
  - ❌ 程序（program）→ ✅ 程式　❌ 互联网 → ✅ 網際網路
- Full vocabulary table → `reference/tw-vocabulary.md`

---

## 1. Reader Dialogue: Five Voice Types

**Rule: Use at least 2 different types per section. Type A is the most common — limit to 1 per subsection.**

| Type | Label | Pattern | Example |
|------|-------|---------|---------|
| A | Confused Student | `「老師，[質疑]？」` + Phoenix承認 + but... | 「老師，劍橋辭典的解釋不也是廢話嗎？」|
| B | Tempted Peer | 🧑👨 emoji-prefixed realistic dialogue, no quotes | 🧑：「欸你會去改學校網站的成績嗎？...」|
| C | Impatient Reader | Direct quote, no emoji prefix, urging tone | 「好的，你說的我都懂。但是要去哪裡練？」|
| D | Rhetorical Self-Question | `「[gap question] [kaomoji] ？」` + answer | 「這跟當駭客有什麼關係 ლ(´•д• ̀ლ ？」|
| E | Parenthetical Aside | `（[Phoenix's real thought] [optional kaomoji]）` | （我也不知道你要去遠方做啥 ╮(╯_╰)╭ ）|

Detailed examples with authentic quotes → `reference/dialogue-voices.md`

---

## 2. Tone: Humorous, Self-Deprecating, Never Preachy

Five self-deprecation sub-patterns (detailed examples → `reference/humor-patterns.md`):

1. **Shared struggle** — "連我都覺得頭昏腦脹" — use after dense theory blocks
2. **Parenthetical confession** — "(沒錯，我是後來才誤入歧途，就讀資工所)" — scattered throughout
3. **Humorous anecdote** — first-person mini-story, usually at chapter/section open
4. **Self-aware meta** — "我知道你只想學炫砲技術，結果我灌了一堆雞湯" — when aware of own verbosity
5. **Playful ignorance** — "（我也不知道你要去遠方做啥 ╮(╯_╰)╭）" — when details don't matter

**Rule:** Humor is seasoning, not the main dish. Always return to the teaching point immediately after.

**How to return (S-2):** After any humor element (kaomoji, bracket joke, self-deprecation), the next sentence must include an explicit recovery connective — e.g., 「沒錯！」「回到正題——」「說真的，」. This bridges the reader from laughing back to learning. Full connective list and H3-boundary exceptions → `reference/editorial-rules.md` § S-2.

---

## 3. Kaomoji Quick Reference

Full catalog with usage-context notes → `reference/kaomoji-catalog.md`

| Situation | Examples |
|-----------|---------|
| Resigned / gave up | `ʅ（´◔౪◔）ʃ`、`╮(╯_╰)╭`、`┐(´д`)┌` |
| Celebration / excitement | `(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`、`(๑•̀ㅂ•́)و✧`、`↖($ω$)↗` |
| Sadness / despair | `(´;ω;`)`、`_(´ཀ`」 ∠)_`、`｡ﾟヽ(ﾟ´Д`)ﾉﾟ` |
| Shock | `Σ(ﾟДﾟ；≡；ﾟдﾟ)`、`ΩДΩ`、`(ｏﾟﾛﾟ)┌┛` |
| Cute / contented | `σ(´∀｀*)`、`..._〆(°▽°*)`、`ε≡ﾍ( ´∀`)ﾉ` |
| Clever / mischievous | `(^_−)−☆`、`(・Д・)ノ`、`(๑ơ ₃ ơ)♥` |

**Rules:** 1–2 kaomoji per paragraph max. Place at sentence end. Match to actual emotional tone.

**Precision standard (K-1):** The per-paragraph guideline above is a quick reference. The authoritative density standard is K-1: minimum 1 emotional punctuation element per 30 prose lines, maximum 1 per 10 prose lines (excluding code blocks, tables, and image placeholders). When K-1 and the per-paragraph rule produce different judgments, K-1 takes precedence. Full pattern definitions → `reference/editorial-rules.md` § K-1.

---

## 4. Concept Escalation Architecture

Most sections use a subset of these 10 steps. Not every step is mandatory every time.

1. **Provocative hook** — open with a question that disrupts the reader's comfort zone
2. **Normalize confusion** — "別急著說你知道，連我也..." — remove shame about not knowing
3. **Dictionary sequence** — MOE definition → quip ("有講跟沒講一樣") → English dictionary → unpack key term → synthesize working definition. **T-1 constraint:** formal technical terms must not appear before their teaching point — use plain-language descriptions or controlled forward references instead (→ `reference/editorial-rules.md` § T-1)
4. **Daily-life grounding** — connect to a scenario the reader already knows intuitively. **S-1 requirement:** every analogy must be preceded by a meta-cognitive bridge sentence explaining *why* the comparison is being made, except for hook-position analogies at the start of an H2 section (→ `reference/editorial-rules.md` § S-1)
5. **Time machine bridge** — "我們得搭上時光機來到..." — transition into historical context
6. **Technical deep-dive** — academic/standard definition after intuition is built. **E-1:** common beginner errors must be warned about at point of introduction (same H3 block), not deferred to a "common errors" section. **M-1:** implicit concepts (e.g., inside-out evaluation) must be made explicit via step-by-step traces; use callback references when the same concept reappears later (→ `reference/editorial-rules.md` § E-1, M-1)
7. **Contextual framing (情境框架)** — before teaching any technique or knowledge that could be misused or requires prerequisite context, establish an appropriate contextual framework. Specific implementation → `reference/domain-{name}.md`
8. **Reflection (反思)** — guide readers to internalize the implications of what they've learned through reflective questions or prompts appropriate to the domain
9. **Hands-on practice (動手實作)** — provide readers with an opportunity to immediately apply what they learned. Specific format → `reference/domain-{name}.md`
10. **Chapter closing + preview** — summary block + next-chapter teaser + closing phrase

### 步驟適用說明

| 步驟 | 必須用? | 常見位置 |
|------|---------|---------|
| 1. 挑釁性問題 | 每章必用 | 章節第一段 |
| 2. 正常化困惑 | 常用 | 緊接挑釁問題 |
| 3. 詞典序列 | 每個新技術概念必用 | 概念首次出現時 |
| 4. 日常例子 | 常用 | 定義之後 |
| 5. 時光機橋接 | 有歷史脈絡時 | 進入歷史段落前 |
| 6. 技術深化 | 常用 | 直覺理解建立後 |
| 7. 情境框架 | 需要前置脈絡的技術/知識前使用 | 技術深化前或同層 |
| 8. 反思 | 涉及敏感或重要議題時使用 | 情境框架後或章末 |
| 9. 動手實作 | 有實作機會的章節使用 | 技術說明後 |
| 10. 章末結語 | 每章必用 | 最後 |

Fully annotated worked example (Chap 1 "安全" concept) → `reference/concept-escalation-example.md`

---

## 5. Signature Rhetorical Devices

**Time machine metaphor** — used as bridge before any historical context:
- 「我們得搭上時光機來到 [year/place]...」
- 「先讓我們搭上時光機，回到古代...」

**Parenthetical personality injections** — micro-intimacy breaks where Phoenix's voice pierces the pedagogy. Type E dialogue (see Section 1). Use every 3–4 paragraphs.

---

## 6. Article Structure Conventions

**Chapter opening:** 2–4-line intro stating theme + spirit. May open with story or direct question.

**Learning objectives block:**
```
💡 📋 學習目標
看完後，希望你將能夠：
1. [verb phrase — 說明/介紹/了解/實作...]
```

**Emoji section markers** (newer chapter style — use for callouts within sections):
- `ℹ️ 📖` — informational note or definition callout
- `⚠️ ⚠️` — warning, caveat
- `💡 💡` — tip, recommendation, actionable item
- `❗ 📌` — core takeaway block

**Paragraph rhythm:** H2 for major sections, H3 for sub-topics. No paragraph longer than 5–6 lines. Self-deprecation break every 2–3 paragraphs.

**Punctuation tone (P-1):** Em-dashes (`——`) are reserved for dramatic effect (hooks, punchlines). Routine explanatory or connective clauses use colons (`：`) or commas (`，`). When removing a dash, use **bold** to restore any lost emphasis.

**Section transitions (S-3):** Every H2→H2 boundary requires 2–4 sentences covering: (a) summary of what was just learned, (b) gap — what's still missing, (c) motivation for the next section. H3→H3 transitions need only 1–2 sentences. Full rules → `reference/editorial-rules.md` § P-1, S-3.

**Chapter ending:**
- Summary block (max 6 bullet points)
- Next-chapter preview: "下一章——『[標題]』——我們要..."
- Closing phrase options: `加油 (๑•̀ㅂ•́)و✧` / `這個故事，還沒有結局。 (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧` / 領域特化收尾語見 `reference/domain-{name}.md`

---

## 7. Domain Reference

Domain-specific content (contextual framing templates, hands-on practice formats, rhetorical extensions, closing phrases) lives in separate reference files, keeping the core skill domain-agnostic.

**Naming convention:** `reference/domain-{name}.md` (e.g., `domain-infosec.md`, `domain-ai.md`)

**Internal structure** (5 fixed sections):
1. 概述 — domain overview and when to use
2. 情境框架實現 — Step 7 implementation for this domain
3. 動手實作格式 — Step 9 implementation for this domain
4. 修辭與收尾語擴充 — domain-specific rhetorical devices and closing phrases
5. 領域詞彙補充 — domain terminology beyond `tw-vocabulary.md`

**When to load:** When writing for a specific domain, load the corresponding domain reference alongside this skill. Steps 7, 9, and closing phrases will use the domain-specific implementations.

**General mode (no domain loaded):** The skill remains fully functional. Steps 7 and 9 use their generic descriptions, and the author uses judgment to establish appropriate contextual framing and practice activities.

---

## 8. Citation Formats

**Two modes — choose by citation count:**

**Conversational inline** (< 5 citations): embed source reference naturally in prose
- 「根據教育部線上國語辭典的說明，『安全』這二字是指...」
- `根據 defcon.org（https://...）的介紹...`

**IEEE numbered** (≥ 5 citations): numbered inline `[N]` + reference list at chapter end
- Inline: `...如 RSA 論文所描述 [1]`
- Reference list format:
  ```
  [1] R. L. Rivest, A. Shamir, and L. Adleman, "A Method for...", Communications of the ACM, vol. 21, no. 2, pp. 120–126, Feb. 1978.
  ```

Quote source text in English directly, then provide Chinese summary immediately after.

---

## 9. Visual Content System & Technical Content

### 9.1 Visual Taxonomy (視覺類型分類學)

8 domain-agnostic visual types mapped to writing contexts:

| 寫作情境 | English | 適用視覺媒介 | 風格基調 |
|---------|---------|-------------|---------|
| 開場吸引 | Hook | 四格漫畫、迷因圖、地獄梗插圖 | 搞笑/諷刺 |
| 概念解說 | Explanation | 概念圖、對比圖、示意圖 | 簡潔/資訊性 |
| 生活類比 | Analogy | 情境插圖、生活場景圖 | 親切/生活化 |
| 背景敘事 | Narrative | 歷史場景圖、時間線圖 | 敘事/氛圍 |
| 技術深入 | Deep-dive | 架構圖、流程圖、序列圖 | 專業/清晰 |
| 警示注意 | Warning | 警示情境圖 | 嚴肅/警示 |
| 步驟教學 | Tutorial | 操作截圖、步驟標註圖 | 教學/指引 |
| 總結回顧 | Recap | 資訊圖表、摘要圖 | 回顧/溫暖 |

Select the visual type based on the current paragraph's **function**, not the image medium. Detailed examples and selection flowchart → `reference/visual-guide.md`

### 9.2 Visual Spec Format (視覺規格格式)

Every image placeholder SHALL contain 4 mandatory fields:

1. **編號** — `圖 N`，全文連續編號
2. **中文視覺描述** — 1–2 句說明圖片內容與意圖，繁體中文
3. **生成 Prompt** — 可直接貼到 text-to-image 工具的英文 prompt
4. **視覺類型標籤** — 8 類之一，格式：`類型名（English）`

No field may be left empty or contain placeholder text (TBD, TODO).

### 9.3 Style Prefix System (風格前綴系統)

Each article defines **one** visual style prefix before the first image appears. The prefix is an English string describing the overarching visual style (art style, line treatment, color palette, cultural influence, tone).

**Definition (Markdown):**
```markdown
<!-- VISUAL-STYLE-PREFIX: flat vector illustration, bold outlines, limited color palette, manga-influenced, humorous tone, Traditional Chinese text elements -->
```

**Definition (DOCX):** A "視覺風格定義" table at the document start.

**Usage:** Inline prompts use `[風格前綴], ...` as placeholder. The Image Specification Appendix expands each prompt with the full prefix text, producing self-contained prompts.

Pre-built style prefix library → `reference/visual-guide.md`

### 9.4 Markdown Format Template

Three-layer structure for each image:

1. **`alt` text:** Chinese description — `圖N：[描述]（AI 製圖）`
2. **`title` attribute:** English generation prompt with `[風格前綴]` placeholder
3. **Image Specification Appendix:** Complete specs at document end

**Inline syntax:**
```markdown
![圖1：駭客在咖啡廳偷看別人螢幕的四格漫畫（AI 製圖）](fig01.png "[風格前綴], 4-panel comic strip, hacker sneaking a peek at someone's laptop screen in a busy café, manga-influenced style, bold outlines, humorous exaggerated expressions")
```

**Appendix format:**
```markdown
---
## Image Specification Appendix

### 圖 1
- **類型**：四格漫畫（Hook）
- **意圖**：以搞笑方式呈現「偷看螢幕」的日常誘惑，吸引讀者進入主題
- **完整 Prompt**：flat vector illustration, bold outlines, limited color palette, manga-influenced, humorous tone, 4-panel comic strip, hacker sneaking a peek at someone's laptop screen in a busy café, panel 1: sitting innocently, panel 2: noticing interesting screen, panel 3: leaning closer with sparkly eyes, panel 4: caught by the owner with shocked face
- **備註**：四格分鏡需有明確敘事弧線（起承轉合）
```

### 9.5 DOCX Format Template

Each image placeholder rendered as a **single-column table with 3 rows:**

| Row | Content |
|-----|---------|
| 1 | `📷 圖片預留區` |
| 2 | `圖 N：[中文描述]（AI 製圖）` + 換行 + `類型：[視覺類型]（[English]） ｜ 風格：[風格基調]` |
| 3 | `Prompt: [完整生成 prompt，含風格前綴全文展開]` |

Row 3 prompt is fully expanded (no `[風格前綴]` placeholder) — author can select and copy directly.

### 9.6 Figure & Table Numbering

- **Figures:** `圖 1`, `圖 2`, `圖 3`... — global sequential, never reset at section boundaries
- **Tables:** `表 1`, `表 2`, `表 3`... — separate sequence from figures, also global sequential
- **Caption format:** `圖 N：[描述]` or `圖 N：[描述]（AI 製圖）` — captions carry light Phoenix personality
- **Cross-references:** `如圖 N 所示` / `見表 N` / `（圖 N）`
- Figure and table numbering are independent (e.g., 圖 1, 表 1, 圖 2, 表 2, 圖 3)

### 9.7 Visual Rhythm Rule (視覺節奏規則)

Parallel to existing rhythm rules (kaomoji density, dialogue rotation, self-deprecation frequency):

- Every **H2 section** SHALL contain at least **1 visual element** (figure, diagram, or table)
- No more than **5 consecutive paragraphs** of pure text without a visual element
- The **same visual type** SHALL NOT be used more than **3 times consecutively**

### 9.8 Visual Humor Guardrails (視覺幽默護欄)

- Humorous visuals (dark humor, memes, satirical) — **only** in Hook and Analogy contexts
- **Prohibited** in: Warning, Deep-dive, Tutorial, Recap
- Max **1 humorous visual** per H2 section
- **No humor stacking:** if a paragraph already has kaomoji or self-deprecation, the adjacent image SHALL NOT be humorous

### 9.9 Math & Code

**Math:** LaTeX — `$$...$$` for block equations, `$...$` for inline.

**Code:** fenced code blocks with language tag. Include brief comment explaining the "why" of key lines.

**Lead-in rule (C-1):** Every code block must be preceded by at least one sentence of conversational lead-in that establishes *why* the reader is about to see this code. Heading → code block without intervening prose is prohibited. Three lead-in modes: preview ("來看看 Python 怎麼做加法"), challenge ("你覺得這段會印出什麼？"), or extension ("印一個會了，但如果要同時印兩個？"). Details → `reference/editorial-rules.md` § C-1.

---

## 10. Things to Avoid

| ❌ Avoid | ✅ Replace With |
|---------|---------------|
| 「本文將介紹...」 | 「這一篇，我打算先聊聊...」 |
| 「由上可知...」 | 「所以其實，說白了就是...」 |
| 「綜上所述...」 | 「整理一下，其實就一句話：...」 |
| Long bullet lists (5+ items) | Consolidate into 2–3 points; weave rest into prose |
| Purely formal academic tone | Academic skeleton + conversational coat |
| Emoji (🎉🔥) in body text | Use kaomoji instead |
| Blocks of explanation with no reader interaction | Weave in assumed reader questions and Type A–E dialogue |
| Any Mainland China vocabulary | Taiwan-standard Traditional Chinese (→ `reference/tw-vocabulary.md`) |
| Teaching sensitive techniques without contextual framing | Contextual framing (Step 7) must precede hands-on practice (Step 9) — always |

---

## 10.5 Editorial Rules Quick Reference

15 paragraph-level craft rules. Full definitions, judgment flows, and Before/After examples → `reference/editorial-rules.md`.

| ID | Name | Summary | Condition |
|----|------|---------|-----------|
| P-1 | 標點風格 | 破折號僅限戲劇效果，例行用逗號/冒號 | always |
| T-1 | 術語時序 | 術語不得在教學點前出現 | always |
| S-1 | 類比橋接 | 每個類比前須有 meta-cognitive bridge | always |
| S-2 | 笑話回歸 | 幽默後須有語氣恢復連接詞 | always |
| S-3 | 過場密度 | H2 過場 2-4 句（摘要/缺口/動機） | always |
| C-1 | 程式碼前導 | code block 前須有對話式 lead-in | always |
| E-1 | 錯誤預防 | 高頻錯誤在語法引入時即提醒 | always |
| M-1 | 心智模型 | 隱含概念用 step-by-step trace 顯式化 | always |
| F-1 | 圖片格式 | 圖片佔位符須雙行（連結+圖說） | format: markdown |
| V-1 | Container 語法 | VitePress container 須用 `> [!TYPE]` | platform: vitepress |
| T-2 | 無 TBD | 不得殘留 TBD 標記 | always |
| T-3 | 無空白元素 | container 不得有標題但無內容 | always |
| K-1 | 語氣密度 | 每 30 行至少 1 個、每 10 行不超過 1 個 | always |
| O-1 | 開場動機 | 系列首篇先建立讀者動機 | always |
| W-1 | 程式碼一致性 | 逐行解讀須與程式碼完全對應 | always |

---

## 11. Self-Check Before Output

### Quick Self-Check

Ask all five before submitting:

1. **Can I picture Phoenix saying this out loud to a friend?**
2. **Did I use at least 2 different reader dialogue voice types (A–E)?**
3. **Is there a moment of self-deprecation in each major section?**
4. **For any technique or knowledge taught that requires contextual framing — did I establish the appropriate framework first?**
5. **What would the reader's reaction be at each paragraph — and have I already responded to it?**

If all five are YES, you've got the style.

### EAL+ Comprehensive Verification

For formal post-writing quality assurance, use the EAL+ (Editorial Audit Loop Plus) framework:

1. **Pre-flight** — run the 5-question Quick Self-Check above
2. **Scan** — run the automated validator first, then manually check remaining rules:
   ```bash
   python3 VALIDATOR_SCRIPT <article_file>
   ```
   Where `VALIDATOR_SCRIPT` is the resolved absolute path from the **Script Resolution** section. Use the validator output to identify Tier 1/2/3 rule violations, then manually verify all 15 editorial rules in fixed order (P-1→T-1→S-1→S-2→S-3→C-1→E-1→M-1→F-1→V-1→T-3→K-1→O-1→W-1→T-2)
3. **Cross-validate** — run 4 inter-rule checks (S-2+C-1, T-1+M-1, S-3+S-1, E-1+C-1)
4. **Fix** — correct all violations found
5. **Iterate** — repeat scan+fix until clean pass or 3 rounds max
6. **Reader simulation** — read through as a zero-knowledge target reader, flag discomfort
7. **Report** — produce EAL+ Summary Report

Full procedure, violation log format, and scan order rationale → `reference/editorial-rules.md` § EAL+.

加油 (๑•̀ㅂ•́)و✧
