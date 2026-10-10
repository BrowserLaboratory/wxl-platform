/**
 * @vitest-environment node
 *
 * Two guards that no behavioural test can express, because what they protect is
 * a relationship between files rather than a behaviour of one.
 *
 * Both are read off the source text. That is deliberate: importing the modules
 * would let a value be right at import time and wrong in the shipped file, and
 * the Service Worker is a classic script with no exports at all.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const HOST = readFileSync(resolve('.vitepress/theme/workers/runtimeHost.ts'), 'utf8')
const SW = readFileSync(resolve('platform/public/challenge-sw.js'), 'utf8')
const LAYOUT = readFileSync(resolve('.vitepress/theme/layouts/ChallengeLayout.vue'), 'utf8')

describe('the execution deadline stays under the relay deadline', () => {
  it('is strictly shorter, in the two files that are edited independently', () => {
    const exec = /const EXEC_TIMEOUT_MS = ([\d_]+)/.exec(HOST)
    const relay = /const RELAY_TIMEOUT_MS = ([\d_]+)/.exec(SW)

    expect(exec, 'EXEC_TIMEOUT_MS not found in runtimeHost.ts').not.toBeNull()
    expect(relay, 'RELAY_TIMEOUT_MS not found in challenge-sw.js').not.toBeNull()

    const execMs = Number(exec![1].replace(/_/g, ''))
    const relayMs = Number(relay![1].replace(/_/g, ''))

    // Not a performance preference. If the relay gives up first, a learner whose
    // own payload caused a runaway sees a registration eviction and a channel
    // rebuild — a cause that is both wrong and points at the wrong fix.
    expect(execMs).toBeLessThan(relayMs)

    // Ordering alone is not the requirement. The spec asks for margin for the
    // terminated worker's answer to travel back, and a deadline of 14_999 would
    // satisfy strict ordering with one millisecond of travel budget — a cliff
    // with no warning.
    const margin = /const MIN_RELAY_MARGIN_MS = ([\d_]+)/.exec(HOST)
    expect(margin, 'MIN_RELAY_MARGIN_MS not found in runtimeHost.ts').not.toBeNull()
    expect(relayMs - execMs).toBeGreaterThanOrEqual(Number(margin![1].replace(/_/g, '')))
  })

  it('keeps the mirrored relay constant equal to the shipped one', () => {
    // The host validates per-instance overrides against a copy of the relay
    // deadline, because the Service Worker is a classic script with no exports.
    // A copy that drifts would validate against a number nothing uses.
    const mirror = /const RELAY_TIMEOUT_MIRROR_MS = ([\d_]+)/.exec(HOST)
    const relay = /const RELAY_TIMEOUT_MS = ([\d_]+)/.exec(SW)
    expect(mirror, 'RELAY_TIMEOUT_MIRROR_MS not found in runtimeHost.ts').not.toBeNull()
    expect(Number(mirror![1].replace(/_/g, ''))).toBe(Number(relay![1].replace(/_/g, '')))
  })
})

describe('the challenge layout does not build a runtime on its own thread', () => {
  it('constructs neither runtime class directly', () => {
    // A runtime constructed here runs on the page's thread, where a synchronous
    // WebAssembly loop occupies the event loop and no timer can interrupt it.
    // The regression is silent: every behavioural test still passes, and the tab
    // locks up again.
    expect(LAYOUT).not.toMatch(/new\s+PythonRuntime\s*\(/)
    expect(LAYOUT).not.toMatch(/new\s+PhpRuntime\s*\(/)
    // `loadToolsPyodide` built a main-thread tools instance. Forbidding only
    // the two constructors left a third, exported, working way back in.
    expect(LAYOUT).not.toMatch(/loadToolsPyodide/)
  })

  it('reaches a runtime only through a runtime host', () => {
    expect(LAYOUT).toMatch(/createChallengeRuntimeHost\s*\(/)
    expect(LAYOUT).toMatch(/createToolsRuntimeHost\s*\(/)
  })

  it('constructs a Worker in exactly one module', () => {
    // The factories module is the only place `new Worker` appears, so a
    // consumer cannot quietly grow a second construction path that a
    // happy-dom test would have to skip — and skipping is how main-thread
    // construction would come back.
    const factories = readFileSync(resolve('.vitepress/theme/workers/workerFactories.ts'), 'utf8')
    expect(factories).toMatch(/new Worker\(/)
    expect(HOST).not.toMatch(/new Worker\(/)
    expect(LAYOUT).not.toMatch(/new Worker\(/)
  })
})

/**
 * S12: the four guards below were written for the challenge host and, for two
 * rounds, existed only there. The tools host is the other construction site of
 * the same shape, and it is the one that runs learner code.
 *
 * Read off the source text per factory, not asserted behaviourally, because what
 * this catches is a *third* factory growing without them — a thing no
 * behavioural test can be written for in advance.
 */
describe('every runtime host factory carries the same four guards', () => {
  /**
   * The body of every exported function that builds a worker: from its
   * signature to the next top-level `export`, or to the end of the file for the
   * last one.
   *
   * Discovered by what the function DOES — it calls the injected worker factory
   * — not by what it is called. An earlier version matched the name
   * `create*RuntimeHost`, which made a naming convention the enforcement
   * mechanism while nothing enforced the convention: a third factory named
   * anything else was skipped in silence, and the "both known names are
   * present" assertion could not see the omission.
   */
  function factoryBodies(): Map<string, string> {
    const bodies = new Map<string, string>()
    const sig = /export function (\w+)\s*\(/g
    for (let m = sig.exec(HOST); m !== null; m = sig.exec(HOST)) {
      const next = HOST.indexOf('\nexport ', m.index + 1)
      const body = HOST.slice(m.index, next === -1 ? HOST.length : next)
      if (/opts\.createWorker\s*\(/.test(body)) bodies.set(m[1], body)
    }
    return bodies
  }

  const GUARDS: [string, RegExp][] = [
    ['tears the worker down on a worker-level error', /onerror\s*=/],
    ['handles a message that could not be deserialized', /onmessageerror\s*=/],
    ['bounds the wait for initialization', /did not finish within/],
    // The marker is the call to the shared checker, not the message it throws.
    // Round 4 moved the range check into `assertDelay` so both hosts get the
    // same one, and a per-factory copy of the wording would now be evidence of
    // the opposite: a factory validating on its own terms.
    ['refuses a deadline outside the timer\'s usable range', /assertDelay\s*\(/],
  ]

  it('finds both factories, so the check cannot pass by finding none', () => {
    // A discovery that returns nothing would otherwise turn every assertion
    // below into a loop over an empty set — green, and meaningless.
    const found = [...factoryBodies().keys()]
    expect(found).toEqual(
      expect.arrayContaining(['createChallengeRuntimeHost', 'createToolsRuntimeHost']),
    )
    // Not `arrayContaining` alone. That passes while a third worker-building
    // factory sits unguarded beside the two named ones, which is the case this
    // whole block exists for: assert the count so a new one has to be added
    // here deliberately.
    expect(found).toHaveLength(2)
  })

  for (const [what, marker] of GUARDS) {
    it(what, () => {
      for (const [name, body] of factoryBodies()) {
        expect(body, `${name} is missing: ${what}`).toMatch(marker)
      }
    })
  }
})
