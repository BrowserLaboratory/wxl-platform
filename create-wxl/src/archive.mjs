// Parses a downloaded archive body (gzip + tar) into an in-memory entry list, using the `tar`
// package's low-level `Parser` (it auto-detects and decompresses gzip) rather than a hand-rolled
// reader. Strict mode turns every parse warning into an 'error' event. T-0021 adds the entry-rule
// validation (rules 1-5); this is the happy-path parse this ticket's rows need.

import { Parser } from 'tar'

export function parseArchive(bytes) {
  return new Promise((resolvePromise, reject) => {
    const parser = new Parser({ strict: true })
    const entries = []
    let comment

    parser.on('entry', (entry) => {
      const chunks = []
      entry.on('data', (chunk) => chunks.push(chunk))
      entry.on('end', () => {
        if (entry.globalExtended?.comment !== undefined) {
          comment = entry.globalExtended.comment
        }
        entries.push({
          path: entry.path,
          type: entry.type,
          mode: entry.mode,
          content: Buffer.concat(chunks),
        })
      })
      entry.resume()
    })
    parser.on('error', (err) => reject(err))
    parser.on('end', () => resolvePromise({ entries, comment }))
    parser.end(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes))
  })
}
