import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, extname } from 'node:path'

// `GLOSSARY.md` is this project's domain glossary: the one place that says what
// a word means here. It exists because a word can change what it points at
// without a single line of it appearing in a diff — one change swapped the
// referent of three terms, and the swap was noticed only when someone sat down
// to write the specification.
//
// A glossary rots in three ways, and this file exists to make two of them loud:
//
//   1. An implementation fact gets written into a definition. The definition
//      then stops being true when the mechanism changes and the concept does
//      not — which is exactly the class of sentence nobody re-reads.
//   2. A Chinese name gets invented that nothing else in the project uses. It
//      looks permanently correct because no other file can contradict it, and
//      it quietly drifts away from the words on screen.
//
// The third — the glossary and the outward documentation disagreeing — has no
// check here, and the boundary section of `GLOSSARY.md` says so.
//
// WHAT THIS FILE COVERS AND WHAT IT DOES NOT
//
//   CAUGHT
//     a digit in a definition, half-width or full-width (a count, a version,
//       a layer index)
//     a backtick-wrapped identifier in a definition (a storage key, a field,
//       a function name)
//     a path token ending in a source or data file extension in a definition
//     a Chinese term that occurs nowhere in this project's own Chinese prose
//       and carries no coinage declaration
//     a second glossary file appearing at the root: a glossary map, or the
//       glossary under its old name
//     an entry with no definition at all, or a term missing its Chinese half
//     a line that looks like an entry but does not parse as one — without this
//       the parser fails open: an unparsed entry is simply absent, every rule is
//       silent about it, and the suite stays green
//     the same term appearing twice
//
//   NOT CAUGHT
//     a count written with Chinese numerals (「四個分頁」). The digit rule is
//       narrow on purpose: three previous attempts in this repository to detect
//       counting words by their measure words each let through what they meant
//       to catch and caught what they meant to keep, and the record of those
//       three attempts is in `CLAUDE.md` under S9. A rule that is certain about
//       a small thing beats a rule that is unreliable about a large one — but
//       the hole is real, and it is stated rather than papered over.
//     an identifier written without backticks
//     a directory path with no file extension
//     a Chinese term that occurs in the corpus but is used there for something
//       else — occurrence is evidence of existence, never of agreement. Nor does
//       it read the avoid lines: a term this glossary itself deprecates still
//       passes the corpus rule, because the rule measures use and the avoid list
//       records judgement, and only a person makes the second.
//     the English half of a term: nothing checks it at all — not that it matches
//       the code, not that it occurs anywhere. The requirement is written to the
//       scope that is actually held, and says so.
//     what an avoid line says: whether it separates a competing spelling from a
//       superseded meaning, and whether a term whose meaning changed had the old
//       one recorded. Those are the reason this file exists and their executor is
//       a person — the change that swaps a term's referent records it in its own
//       review matrix.
//     a definition that is simply wrong while breaking none of the rules
//     a new Chinese name introduced into `CLAUDE.md` by the same change that adds
//       the entry: that file is inside the corpus, so such a term vouches for
//       itself. Excluding it would carve a hole in the surface the corpus is
//       defined as; the exposure is named here instead.
//
// THE CORPUS
//
// The outward-facing surface the prose audit already governs — `README.md`,
// `CONTRIBUTE.md`, `CLAUDE.md`, `AGENTS.md`, the collaboration guide
// `docs/agents/guide.md` and the pages under `platform/` — plus the Traditional
// Chinese interface strings, minus this file.
// Borrowing that surface rather than inventing one keeps a single answer to
// "which prose counts" in the repository.
//
// `CHANGELOG.md` is outside it for one reason: it is a record of what happened,
// and a term surviving only in a record of what happened is not a term in use. That exclusion is load-bearing — several terms
// in this glossary occur nowhere but the release history, and counting it would
// have let a word this very file lists under `_Avoid_` vouch for itself.

const ROOT = resolve(__dirname, '../../..')
const GLOSSARY = join(ROOT, 'GLOSSARY.md')

/** A single glossary entry, as parsed out of the file. */
interface Entry {
  /** The full term line, e.g. `challenge（題目）`. */
  term: string
  /** The Traditional Chinese half, taken from inside the full-width brackets. */
  zh: string
  /** The definition body: every line of the entry that is not a metadata line. */
  definition: string
  /** Whether the entry declares its Chinese term to be coined by this glossary. */
  coined: boolean
  /** 1-based line number of the term line, for failure messages. */
  line: number
}

const TERM_LINE = /^\*\*(.+?)\*\*\s*[:：]\s*$/
const ZH_IN_TERM = /（([^（）]+)）\s*$/
const COINAGE_MARKER = /^_新造詞_\s*[:：]/
const AVOID_MARKER = /^_Avoid_\s*[:：]/

function parseGlossary(text: string): Entry[] {
  const lines = text.split('\n')
  const entries: Entry[] = []
  let current: Entry | null = null
  const body: string[] = []

  const flush = (): void => {
    if (current === null) return
    current.definition = body.join('\n').trim()
    entries.push(current)
    body.length = 0
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const term = TERM_LINE.exec(line)
    if (term !== null) {
      flush()
      const zh = ZH_IN_TERM.exec(term[1])
      current = {
        term: term[1],
        zh: zh === null ? '' : zh[1],
        definition: '',
        coined: false,
        line: i + 1,
      }
      continue
    }
    if (current === null) continue
    if (line.startsWith('## ')) {
      flush()
      current = null
      continue
    }
    if (COINAGE_MARKER.test(line)) {
      current.coined = true
      continue
    }
    if (AVOID_MARKER.test(line)) continue
    body.push(line)
  }
  flush()
  return entries
}

/**
 * The root Markdown documents inside the corpus.
 *
 * This is the outward-facing surface `scripts/prose-audit/run.py` declares, with
 * this file removed — a glossary must not be its own evidence. `CHANGELOG.md` is
 * absent from that surface already, and its absence here is the point: see
 * THE CORPUS above.
 */
const CORPUS_ROOT_DOCS = ['README.md', 'CONTRIBUTE.md', 'CLAUDE.md', 'AGENTS.md', 'docs/agents/guide.md']

/** Every file that counts as this project's own Traditional Chinese prose. */
function collectCorpus(): string {
  const parts: string[] = []

  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (extname(name) === '.md') parts.push(readFileSync(path, 'utf-8'))
    }
  }
  walk(join(ROOT, 'platform'))

  parts.push(readFileSync(join(ROOT, '.vitepress/theme/i18n/messages/zh-TW.json'), 'utf-8'))

  for (const name of CORPUS_ROOT_DOCS) {
    const path = join(ROOT, name)
    if (existsSync(path)) parts.push(readFileSync(path, 'utf-8'))
  }

  return parts.join('\n')
}

/**
 * Lines that a reader would call an entry, matched loosely on purpose.
 *
 * `TERM_LINE` is strict, and a strict parser fails open: a term line with a
 * stray bullet, the colon inside the bold, or the definition on the same line
 * is not an entry as far as the rules are concerned — it is simply absent, and
 * absence is silent. Counting the loose shape and requiring the two to agree
 * turns that silence into a failure. The loose pattern deliberately over-matches:
 * a false positive stops the suite and gets read, which is the safe direction.
 */
const LOOSE_TERM_LINE = /^\s*(?:[-*+]\s*)?\*\*[^*]*（[^（）]+）[^*]*\*\*/

const source = existsSync(GLOSSARY) ? readFileSync(GLOSSARY, 'utf-8') : ''
const entries = parseGlossary(source)

const looseTermLines = source
  .split('\n')
  .map((line, i) => [line, i + 1] as const)
  .filter(([line]) => !COINAGE_MARKER.test(line) && !AVOID_MARKER.test(line))
  .filter(([line]) => LOOSE_TERM_LINE.test(line))

describe('GLOSSARY.md is the single root glossary', () => {
  it('exists at the repository root', () => {
    expect(existsSync(GLOSSARY), 'GLOSSARY.md is missing from the repository root').toBe(true)
  })

  // A context map declares that the repository holds several vocabularies. It
  // does not: the challenge-authoring flow and the platform flow share their
  // core nouns, and splitting those nouns across files is the failure the
  // glossary exists to prevent.
  it('has no GLOSSARY-MAP.md beside it', () => {
    expect(
      existsSync(join(ROOT, 'GLOSSARY-MAP.md')),
      'GLOSSARY-MAP.md exists — this repository is a single context, see design decision D4',
    ).toBe(false)
  })

  // The glossary was renamed from `CONTEXT.md` to follow the upstream skills. A
  // skill or a fork still using the old name would start a second glossary
  // beside this one, and the two would drift apart with every rule here green.
  it('has no CONTEXT.md beside it under the old name', () => {
    expect(
      existsSync(join(ROOT, 'CONTEXT.md')),
      'CONTEXT.md exists — the glossary is GLOSSARY.md; move its terms there and delete the old file',
    ).toBe(false)
  })

  it('parses into entries', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  // Without this the parser is a hole rather than a gate. Everything downstream
  // iterates `entries`, so a line the parser did not recognise carries no rule
  // at all — and the suite reports the same number of passing tests as before.
  it('recognises every line that reads as an entry', () => {
    const unparsed = looseTermLines
      .filter(([, line]) => !entries.some(e => e.line === line))
      .map(([text, line]) => `line ${line}: ${text.trim()}`)
    expect(
      unparsed,
      `these lines read as glossary entries but did not parse as one, so no rule was applied to them. A term line must be exactly \`**english（中文）**:\` on its own line — no leading bullet, the colon outside the bold, the definition on the following line:\n${unparsed.join('\n')}`,
    ).toEqual([])
  })

  it('names each term once', () => {
    const seen = new Map<string, number>()
    const duplicates: string[] = []
    for (const e of entries) {
      const first = seen.get(e.term)
      if (first === undefined) seen.set(e.term, e.line)
      else duplicates.push(`"${e.term}" at line ${e.line} repeats line ${first}`)
    }
    expect(
      duplicates,
      `a term may be defined once. Two entries for one term are two answers to "what does this word mean here", which is the thing this file exists to prevent:\n${duplicates.join('\n')}`,
    ).toEqual([])
  })
})

describe('every entry is well formed', () => {
  it.each(entries.map(e => [e.term, e]))('%s carries a Chinese term', (_term, entry) => {
    expect(
      (entry as Entry).zh,
      `entry "${(entry as Entry).term}" (line ${(entry as Entry).line}) has no Traditional Chinese term in full-width brackets`,
    ).not.toBe('')
  })

  it.each(entries.map(e => [e.term, e]))('%s carries a definition', (_term, entry) => {
    expect(
      (entry as Entry).definition.length,
      `entry "${(entry as Entry).term}" (line ${(entry as Entry).line}) has no definition`,
    ).toBeGreaterThan(0)
  })
})

// The three shapes below are the ones that turn a definition into a statement
// about the current implementation. Each is checked separately so a failure
// names the rule it broke, not merely "bad format".
describe('definitions carry no implementation fact', () => {
  it.each(entries.map(e => [e.term, e]))('%s has no Arabic digit', (_term, entry) => {
    const e = entry as Entry
    const hit = /[0-9\uFF10-\uFF19]/.exec(e.definition)
    expect(
      hit,
      `entry "${e.term}" (line ${e.line}) breaks the digit rule: a definition may not contain a digit (half-width or full-width), found ${JSON.stringify(hit?.[0])}. Digits in a definition are counts, version numbers or layer indices, and all three go stale on their own.`,
    ).toBeNull()
  })

  it.each(entries.map(e => [e.term, e]))('%s has no backticked identifier', (_term, entry) => {
    const e = entry as Entry
    const hit = /`[^`]+`/.exec(e.definition)
    expect(
      hit,
      `entry "${e.term}" (line ${e.line}) breaks the backtick rule: a definition may not contain a backtick-wrapped identifier, found ${JSON.stringify(hit?.[0])}. Storage keys, field names and function names belong in the code, not in what a word means.`,
    ).toBeNull()
  })

  it.each(entries.map(e => [e.term, e]))('%s has no file path', (_term, entry) => {
    const e = entry as Entry
    const hit = /[A-Za-z0-9_./-]+\.(?:ts|tsx|mts|mjs|cjs|js|vue|md|json|ya?ml|py|php|html|css)\b/.exec(
      e.definition,
    )
    expect(
      hit,
      `entry "${e.term}" (line ${e.line}) breaks the path rule: a definition may not name a file, found ${JSON.stringify(hit?.[0])}. A definition tied to a file stops being true when the file moves.`,
    ).toBeNull()
  })
})

describe('Chinese terms are backed by the corpus or declared as coined', () => {
  const corpus = collectCorpus()

  it.each(entries.map(e => [e.term, e]))('%s is in use or declares itself new', (_term, entry) => {
    const e = entry as Entry
    if (e.zh === '') return
    const occurs = corpus.includes(e.zh)
    expect(
      occurs || e.coined,
      `entry "${e.term}" (line ${e.line}) breaks the corpus rule: the Traditional Chinese term 「${e.zh}」 occurs nowhere in this project's own Chinese prose and the entry carries no 新造詞 declaration. Either use a term the project already uses, or declare this one as coined by the glossary.`,
    ).toBe(true)
  })

  // The declaration is a claim about the corpus, so it is checked in both
  // directions. A term that is declared new while already being in use is a
  // false declaration, and a false declaration is worse than none: it tells the
  // next reader to go and coin a word that already exists.
  it.each(entries.filter(e => e.coined).map(e => [e.term, e]))(
    '%s does not declare itself new while already in use',
    (_term, entry) => {
      const e = entry as Entry
      expect(
        corpus.includes(e.zh),
        `entry "${e.term}" (line ${e.line}) breaks the corpus rule from the other side: it declares 「${e.zh}」 to be coined, but that term already occurs in this project's Chinese prose. Remove the declaration.`,
      ).toBe(false)
    },
  )
})
