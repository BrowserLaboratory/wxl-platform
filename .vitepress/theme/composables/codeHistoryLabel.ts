/**
 * Label derivation for the Code panel's execution-history dropdown.
 *
 * These two rules live outside `CodeEditorPanel.vue` because `<script setup>` cannot
 * export a named binding, and a rule that can only be observed through rendered option
 * text cannot be mutation-tested on its own.
 */

/** One past run of a challenge's code, as recorded in the attack session. */
export interface CodeHistoryEntry {
  executionId: string
  timestamp: number
  code: string
  error: boolean
}

/** Longest first-line summary shown before truncation kicks in. */
const SUMMARY_MAX = 40

/** What a summary shows when the execution had no code to summarise. */
const EMPTY_SUMMARY = '(empty)'

/**
 * The first line of `code` that is non-empty once trimmed, trimmed and capped.
 *
 * A capped line keeps its first `SUMMARY_MAX - 1` characters and gains an ellipsis, so
 * the result is never longer than `SUMMARY_MAX`.
 */
export function summariseFirstLine(code: string): string {
  const line = code.split('\n').map(l => l.trim()).find(l => l.length > 0)
  if (line === undefined) return EMPTY_SUMMARY
  if (line.length <= SUMMARY_MAX) return line
  return line.slice(0, SUMMARY_MAX - 1) + '…'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * `HH:MM:SS · <summary>`, prefixed with a warning sign when the execution raised.
 *
 * The time is local wall-clock, matching every other timestamp the learner sees in the
 * challenge UI.
 */
export function formatHistoryLabel(entry: { timestamp: number; code: string; error: boolean }): string {
  const d = new Date(entry.timestamp)
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  return `${entry.error ? '⚠ ' : ''}${time} · ${summariseFirstLine(entry.code)}`
}
