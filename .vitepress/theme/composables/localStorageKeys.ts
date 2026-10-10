import { CODE_DRAFT_PREFIX } from './codeDraftSnapshot'
import { LOCALE_STORAGE_KEY } from '../i18n'
import { EDITOR_SETTINGS_KEY, DEFAULT_EDITOR_SETTINGS } from './useEditorSettings'
import { SOURCE_VIEWER_SETTINGS_KEY, DEFAULT_SOURCE_VIEWER_SETTINGS } from './useSourceViewerSettings'

/**
 * How a key is recognised. Two of the platform's keys carry a per-challenge segment,
 * so an exact list cannot describe them.
 *
 * `bracketed` names both fixed ends and leaves the varying segment between them. There
 * is no `suffix` kind, deliberately: a tail says what a value holds, never who wrote it,
 * so a matcher anchored at the tail alone claims every key on the origin that happens to
 * end that way — and the clear deletes what this list claims.
 */
export type KeyMatcher =
  | { kind: 'exact'; value: string }
  | { kind: 'prefix'; value: string }
  | { kind: 'bracketed'; prefix: string; suffix: string }

/**
 * What a key's presence proves about the learner.
 *
 * Two questions are asked of the one list below and they are not the same question.
 * Clearing asks "did this platform write it" and must remove every key it did, because
 * residue is residue. The shared-machine gate asks "did a LEARNER do something here",
 * and a key the platform writes by itself answers no to that.
 *
 * Reading one answer for both is a measured defect, not a hypothesis: `wxl-locale` is
 * written from `enhanceApp` on every cold load of a localised path, before the gate
 * looks, so a brand-new browser on an empty machine was asked whose saved work it held.
 * On a challenge page it was worse — the Repeater snapshots and the panel settings are
 * written at setup, at their defaults, and those panels are `v-show` rather than `v-if`,
 * so they mount whether or not the learner opens their tab.
 *
 * - `learner-acted` — nothing in this platform writes this key. Presence is the evidence.
 * - `nothing` — the platform writes it unprompted and every value it can hold is one the
 *   platform chose. Neither its presence nor its value says anything about the learner.
 * - `only-if-changed` — the platform writes it unprompted at one fixed default. Presence
 *   proves nothing; a value that is not that default proves the learner changed it.
 */
export type PresenceProof =
  | { proves: 'learner-acted' }
  | { proves: 'nothing' }
  | { proves: 'only-if-changed'; writtenDefault: string }

/**
 * What the clear does with a key. A third question, and not derivable from the other two.
 *
 * - `remove` — residue of the previous learner. The clear takes it.
 * - `exempt` — the platform writes this key by itself AND the learner writes the same key
 *   by making an ordinary choice, and the stored value does not say which happened. The
 *   clear leaves it, because removing it would restart the next learner in a language
 *   nobody chose while returning nothing of anybody's work.
 *
 * Exemption is deliberately hard to earn: a key that holds any part of what a learner
 * built is residue, and residue goes. A key exempt here must also prove nothing on the
 * detection side — the gate cannot ask about work it has undertaken not to remove — which
 * `tests/unit/theme/local-storage-ownership.test.ts` checks over the whole list rather
 * than over the one key that is exempt today.
 */
export type ClearingDisposition = 'remove' | 'exempt'

/**
 * How a key is recognised, what recognising it proves, and whether the clear takes it.
 *
 * `presence` and `clearing` are both required, so a key added to the list below without a
 * decision about either is a type error rather than a silent default. That is the point:
 * the previous shape of this list had one answer for two questions, so the second question
 * was answered by accident, and which way it fell decided whether the gate could hide a
 * learner's work or raise a false alarm on a machine nobody had used. The third question
 * has the same two-sided cost — a wrong `remove` wipes a preference the platform promised
 * to keep, a wrong `exempt` leaves the previous learner's work on a machine reported as
 * cleared.
 */
export type OwnedKey = KeyMatcher & { presence: PresenceProof; clearing: ClearingDisposition }

/** The unsaved-note draft, one per challenge: `pentest-draft-<slug>`. */
export const NOTE_DRAFT_PREFIX = 'pentest-draft-'

/**
 * Saved Repeater requests, one per challenge:
 * `challenge-<slug>.localhost:repeater-snapshots`, written by `RepeatPanel.vue`.
 *
 * Kept as the two fixed ends rather than one tail. `.localhost` belongs to the tail
 * because it is fixed text this platform writes, not part of the slug. These two are for
 * matching against, not for building a key with: `RepeatPanel.vue` owns that template.
 */
export const REPEATER_SNAPSHOTS_PREFIX = 'challenge-'
export const REPEATER_SNAPSHOTS_SUFFIX = '.localhost:repeater-snapshots'

/**
 * What `RepeatPanel.vue` puts under that key on mount when it is absent.
 *
 * `useLocalStorage` writes its default the moment the composable runs, through the string
 * serializer, so what lands in storage is these two characters and not a JSON-quoted
 * string. Detection has to compare against exactly what the write side wrote.
 *
 * This is a restatement: the default is a literal inside a `<script setup>` block, which
 * exports nothing. `tests/unit/theme/local-storage-ownership.test.ts` reads that call site
 * and fails if the two stop agreeing, so the restatement cannot drift in silence — which
 * is the only reason it is allowed to be one.
 */
export const REPEATER_SNAPSHOTS_DEFAULT = '[]'

/**
 * Every localStorage key this platform writes.
 *
 * One list, because there is one question that needs the whole of it: on a shared
 * machine, what belongs to the previous learner? Answering it with a list written at
 * the point of clearing is what went wrong before — that list named the two keys that
 * existed when it was written, and the platform grew two more without anything failing.
 * The saved Repeater requests in particular are the learner's own attack work, and
 * they survived a clear that reported success.
 *
 * `tests/unit/theme/local-storage-ownership.test.ts` scans the theme for key literals
 * and fails on any that this list does not match, so a key added later cannot be missed
 * silently. That test looks at code this list does not know about, which is the whole
 * point: a check that can only see what its own author wrote finds nothing.
 *
 * `vitepress-theme-appearance` is deliberately absent. VitePress owns it, and clearing
 * a key another package wrote would be reaching outside what this platform is
 * responsible for.
 */
export const OWNED_LOCAL_STORAGE_KEYS: readonly OwnedKey[] = [
  { kind: 'prefix', value: CODE_DRAFT_PREFIX, presence: { proves: 'learner-acted' }, clearing: 'remove' },
  // Written by `enhanceApp` on every cold load of a localised path, and by the locale
  // switcher. Every value it can hold is a locale code this platform chose, so there is
  // no changed value to detect either — the tag is `nothing`, not `only-if-changed`.
  //
  // And exempt from clearing, for the same reason read the other way round: the two
  // writers put the same kind of value under the same key, so the store cannot say which
  // of them wrote what is there. Clearing it returns nothing of anybody's work and hands
  // the next learner an interface in a language nobody chose. The cost is accepted and
  // known: the next learner can inherit the previous learner's language.
  { kind: 'exact', value: LOCALE_STORAGE_KEY, presence: { proves: 'nothing' }, clearing: 'exempt' },
  // Written at the editor panel's setup by `useLocalStorage` with its default
  // `writeDefaults`, so opening any challenge page puts the default here. The default is
  // derived rather than transcribed: the write side serialises with `JSON.stringify`, so
  // this is the same bytes by construction and cannot fall out of step with it.
  {
    kind: 'exact',
    value: EDITOR_SETTINGS_KEY,
    presence: { proves: 'only-if-changed', writtenDefault: JSON.stringify(DEFAULT_EDITOR_SETTINGS) },
    clearing: 'remove',
  },
  // The same, at the source viewer's setup. That panel is behind a `v-if`, so this key
  // appears only on white-box challenges — which changes when it is written, not what its
  // presence proves.
  {
    kind: 'exact',
    value: SOURCE_VIEWER_SETTINGS_KEY,
    presence: { proves: 'only-if-changed', writtenDefault: JSON.stringify(DEFAULT_SOURCE_VIEWER_SETTINGS) },
    clearing: 'remove',
  },
  // Nothing in this platform writes a note draft. `usePentestNotes` reads it on init and
  // removes it when a note is saved, and there is no `setItem` for it anywhere in the
  // theme — the debounced auto-save that created it was retired. So whatever is under it
  // was typed by a learner into an older build: presence is the whole of the evidence,
  // and there is no default to compare against.
  { kind: 'prefix', value: NOTE_DRAFT_PREFIX, presence: { proves: 'learner-acted' }, clearing: 'remove' },
  // Written at the Repeater panel's setup at the empty default, and that panel is
  // `v-show` rather than `v-if`, so every challenge page writes it. Anything else under
  // it is requests the learner saved, which is the attack work this gate exists to
  // protect.
  {
    kind: 'bracketed',
    prefix: REPEATER_SNAPSHOTS_PREFIX,
    suffix: REPEATER_SNAPSHOTS_SUFFIX,
    presence: { proves: 'only-if-changed', writtenDefault: REPEATER_SNAPSHOTS_DEFAULT },
    clearing: 'remove',
  },
]

/**
 * The declaration that claims `key`, or `undefined` when this platform did not write it.
 *
 * One matching rule, read by both questions. What a key's presence means may differ
 * between them; which entry a key belongs to may not, and routing both through here is
 * what makes that impossible rather than merely intended.
 */
function matcherFor(key: string): OwnedKey | undefined {
  return OWNED_LOCAL_STORAGE_KEYS.find(m =>
    m.kind === 'exact' ? key === m.value
      : m.kind === 'prefix' ? key.startsWith(m.value)
        // The length test is not implied by the other two: a key shorter than the two
        // ends together can satisfy both by overlapping them, and such a key has no
        // per-challenge segment in the middle for this platform to have put there.
        : key.length >= m.prefix.length + m.suffix.length
          && key.startsWith(m.prefix)
          && key.endsWith(m.suffix))
}

/**
 * Whether `key` is one this platform wrote — the question OWNERSHIP asks.
 *
 * Deliberately the wide one, and it is not the clear's question. It answers "is this key
 * ours to have an opinion about", which is what the source scan in
 * `tests/unit/theme/local-storage-ownership.test.ts` needs: every key written anywhere in
 * the theme has to match something here, exempt keys included, or a key that stopped being
 * declared would stop being checked at the same moment.
 *
 * Narrowing THIS to the keys that prove something would leave the previous learner's panel
 * state behind on a machine reported as cleared, which is the defect this list was created
 * to close. What the clear takes is narrower again, and declared per key — see
 * `isClearableLocalStorageKey`.
 */
export function isOwnedLocalStorageKey(key: string): boolean {
  return matcherFor(key) !== undefined
}

/**
 * Whether the clear removes `key` — the question CLEARING asks.
 *
 * Ownership minus the declared exemptions, read through the same `matcherFor`, so the two
 * cannot disagree about which entry a key belongs to. Strictly narrower than ownership and
 * never wider: a key this platform did not write is not ours to delete, whatever it is
 * called.
 *
 * The exemption is a declaration per key, not a rule derived from `presence`. They answer
 * different questions and coincide today only because the one exempt key happens to prove
 * nothing; deriving one from the other would silently exempt the next key that proves
 * nothing — the panel defaults — which is residue and must go.
 */
export function isClearableLocalStorageKey(key: string): boolean {
  return matcherFor(key)?.clearing === 'remove'
}

/**
 * Whether this key, holding this value, proves a learner did something — the question the
 * GATE asks.
 *
 * Strictly narrower than ownership, and reading the same list: the two cannot name
 * different keys, because they share `matcherFor`, but this one reads the `presence`
 * declaration as well as the pattern. A key the platform writes on its own is not
 * evidence of anybody, and asking on the strength of one tells a brand-new visitor that
 * this machine holds work that is not theirs — a false statement whose only two offers
 * are to inherit nothing or to delete nothing.
 *
 * `value` of `null` — a key that was listed and then vanished — compares unequal to any
 * default and therefore counts as evidence. Asking about a key that has just gone is a
 * nuisance; the opposite mistake hands the previous learner's work to the next person.
 */
export function provesLearnerActed(key: string, value: string | null): boolean {
  const matcher = matcherFor(key)
  if (matcher === undefined) return false
  switch (matcher.presence.proves) {
    case 'learner-acted':
      return true
    case 'nothing':
      return false
    case 'only-if-changed':
      return value !== matcher.presence.writtenDefault
    default: {
      // A tag added to `PresenceProof` without a branch here stops the build rather than
      // falling through to one of the two answers. Which answer it fell through to would
      // decide whether a new key can hide a learner's work or raise a false alarm on an
      // empty machine, and neither is a decision anybody should make by omission.
      const unhandled: never = matcher.presence
      return Boolean(unhandled)
    }
  }
}

/**
 * Every localStorage key this platform wrote that is present right now.
 *
 * The whole list is collected before the caller is given it, which is what an index scan
 * needs: removing while iterating shifts the indices under `key(i)` and silently skips
 * every other match. Removing is the caller's business — this only reads.
 *
 * A `localStorage` that refuses to be read throws out of here rather than answering with
 * an empty list. Unreadable is unknown, not empty, and an empty list is a claim that this
 * machine holds nothing of the previous learner's — the one answer that hands their work
 * to the next person. The caller decides what to do about the failure; the alternative is
 * that this function decides it for them, silently, and always the wrong way.
 */
export function listOwnedLocalStorageKeys(): string[] {
  const owned: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key !== null && isOwnedLocalStorageKey(key)) owned.push(key)
  }
  return owned
}

/**
 * Every key present right now that the clear removes.
 *
 * The subset of `listOwnedLocalStorageKeys` the clear sweeps, and the list it sweeps from:
 * the declared exemptions are filtered out here, once, rather than at the call site, so
 * the clearing code carries no key names and no opinions of its own.
 *
 * Same collect-then-remove shape and the same failure policy as the wide walk. A
 * `localStorage` that refuses to be read throws out of here rather than answering with an
 * empty list, because an empty list is the claim that this machine holds nothing left to
 * clear — reported as a completed clear on a machine that still holds the previous
 * learner's work.
 */
export function listClearableLocalStorageKeys(): string[] {
  const clearable: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key !== null && isClearableLocalStorageKey(key)) clearable.push(key)
  }
  return clearable
}

/**
 * Every key present right now whose presence proves a learner did something.
 *
 * The subset of `listOwnedLocalStorageKeys` the gate asks about. The two read one list,
 * so the gate cannot ask about a key it will not clear; they read it through different
 * questions, so the gate does not ask about a key the platform wrote by itself.
 *
 * Values are read as well as names, which the ownership walk does not need to do: some
 * keys are evidence only when they differ from what the platform planted, and that cannot
 * be decided from the name. Same failure policy as the wide list — a `localStorage` that
 * refuses to be read throws out of here rather than answering with an empty list, because
 * an empty list is the one answer that hands the previous learner's work to the next
 * person.
 */
export function listLearnerEvidenceKeys(): string[] {
  const evidence: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key === null) continue
    if (provesLearnerActed(key, localStorage.getItem(key))) evidence.push(key)
  }
  return evidence
}
