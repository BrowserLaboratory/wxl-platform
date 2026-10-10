/**
 * Runtime-level messages for whoever is authoring a challenge.
 *
 * Attached to the response object rather than to the response *content*. Two
 * earlier designs failed, and both failures are the reason this module exists:
 *
 *   - a header on the response reached the student, because the Service Worker
 *     path calls the runtime directly and never passes the consumer that was
 *     supposed to strip it;
 *   - a single slot on that consumer mis-attributed, for the same reason in
 *     reverse: a diagnostic raised on the Service Worker path was never claimed
 *     and drifted onto the next request that was logged.
 *
 * Keying a WeakMap on the response makes attribution structural. A response
 * nobody inspects simply carries its diagnostics to the garbage collector.
 */
const diagnostics = new WeakMap<Response, string[]>()

/** Record the diagnostics raised while assembling this response. */
export function attachDiagnostics(response: Response, messages: string[]): void {
  if (messages.length === 0) return
  diagnostics.set(response, [...messages])
}

/** Every diagnostic raised for this response, in the order they were raised. */
export function readDiagnostics(response: Response): string[] {
  return diagnostics.get(response) ?? []
}
