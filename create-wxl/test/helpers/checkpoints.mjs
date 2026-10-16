const DEFAULT_ORDER = ['step-3', 'step-4', 'step-6', 'step-7', 'step-8', 'step-9', 'step-10', 'step-13']

/** Asserts that each named step's `checkpoint` call appears exactly once, in this relative order
 * (P-07): it does not assert the full call array, since the test plan only pins the steps the
 * `--no-setup` path actually runs, not whether `step-5`/`step-11`/`step-12`/`question` are ever
 * called (the plan leaves that unpinned). */
export function expectOrderedCheckpoints(checkpointMock, names = DEFAULT_ORDER) {
  const calls = checkpointMock.mock.calls.map((c) => c[0])
  const filtered = calls.filter((name) => names.includes(name))
  const seen = new Map()
  for (const name of filtered) seen.set(name, (seen.get(name) ?? 0) + 1)
  for (const name of names) {
    if (seen.get(name) !== 1) {
      throw new Error(`expected "${name}" exactly once among ${JSON.stringify(calls)}`)
    }
  }
  if (filtered.join(',') !== names.join(',')) {
    throw new Error(`expected checkpoint order ${JSON.stringify(names)}, got ${JSON.stringify(calls)}`)
  }
}
