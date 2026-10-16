// A `deps.checkpoint` that also drives an interactive run's `stdin`: each time the production
// code calls `checkpoint('question')` (right before it waits for the next line), this writes the
// next scripted answer on `setImmediate` -- so the write lands only after the question's own
// listeners are already attached -- or ends `stdin` (EOF) once the scripted answers run out, or at
// a chosen question number (`eofAt`, 1-based, C51's EOF cases). Every other `checkpoint` name is
// still recorded (so `expectOrderedCheckpoints` keeps working) but drives nothing.

import { vi } from 'vitest'

export function makePromptDriver(stdin, answers, { eofAt } = {}) {
  let questionCount = 0
  const checkpoint = vi.fn((name) => {
    if (name !== 'question') return
    questionCount++
    if (eofAt !== undefined && questionCount === eofAt) {
      setImmediate(() => stdin.end())
      return
    }
    const answer = answers[questionCount - 1]
    if (answer === undefined) {
      setImmediate(() => stdin.end())
      return
    }
    setImmediate(() => stdin.write(answer + '\n'))
  })
  return checkpoint
}
