// AC-18 "every CW message begins with its code" (P-11/S-12): a shared check this ticket's own
// new tests (failures/signals/escaping) run against their actual stdout+stderr output, not only
// against the message table in isolation (language.test.mjs already does that).

import { expect } from 'vitest'

export function expectCwLinesStartWithCode(text) {
  for (const line of text.split('\n')) {
    const match = line.match(/CW-[EW]\d\d/)
    if (match) expect(line.startsWith(match[0]), `line does not start with its own code: ${line}`).toBe(true)
  }
}
