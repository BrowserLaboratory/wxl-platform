// An override for `recordingFs` that fails only when `predicate` matches, otherwise delegating to
// the real `node:fs/promises` function (T-0024 ticket Notes: "a `deps.fs` wrapper that can inject
// a failure by function name, path condition, or call count").

import * as fsp from 'node:fs/promises'

/**
 * Returns an async override function for `recordingFs({ [name]: failAt(...) })`. `predicate`
 * receives the 1-based call count for THIS override and the raw arguments, and returns the error
 * to throw, or a falsy value to delegate to the real function.
 */
export function failAt(name, predicate) {
  let count = 0
  const real = fsp[name]
  return async (...args) => {
    count++
    const err = predicate(count, args)
    if (err) throw err
    return real(...args)
  }
}

/** Builds a `code`-carrying `Error`, the shape a real file-system error has. */
export function fsError(code, message = code) {
  const err = new Error(message)
  err.code = code
  return err
}
