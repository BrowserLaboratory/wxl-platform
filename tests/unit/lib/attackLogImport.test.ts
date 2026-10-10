import { expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { createExportPackage, canonicalJson } from '../../../.vitepress/theme/lib/attackLogExport'
import { prepareImport } from '../../../.vitepress/theme/lib/attackLogImport'
vi.stubGlobal('crypto', webcrypto)

const source = () => ({
 meta: { timezone: 'Asia/Taipei', exportedAt: '2026-09-16T10:00:00+08:00' },
 challenge: { slug: 'sqli-demo', title: 'SQL Injection Demo' },
 session: {
  sessionId: 'from-the-file', startedAt: 1000, solvedAt: 2000,
  events: [{ type: 'challenge_start', timestamp: 1000 }, { type: 'note', timestamp: 1500, id: 'n', content: 'looked at the login form', updatedAt: null }],
  draft: { code: 'never run', updatedAt: 1800 },
 },
})
const file = async (over: (s: ReturnType<typeof source>) => void = () => {}) => {
 const s = source()
 over(s)
 return JSON.stringify(await createExportPackage(s, { format: 'json', mode: 'full' }))
}

it('refuses a file that is not JSON and names it as unparseable', async () => {
 const result = await prepareImport('this is not a package', 'sqli-demo')
 expect(result.ok).toBe(false)
 expect(result.ok === false && result.kind).toBe('unparseable')
})

it('refuses what the verifier refuses and carries back the reason it gave', async () => {
 // Tampered after the package was built, so the event chain no longer matches. The
 // reason is the verifier's own words: import states no opinion of its own about why
 // a package is unacceptable.
 const tampered = JSON.parse(await file())
 tampered.session.events[1].content = 'rewritten after export'
 const result = await prepareImport(JSON.stringify(tampered), 'sqli-demo')
 expect(result.ok).toBe(false)
 expect(result.ok === false && result.kind).toBe('invalid')
 expect(result.ok === false && result.kind === 'invalid' && result.reason).toBe('Event chain mismatch')
})

it('accepts a valid file and carries the attempt across unchanged', async () => {
 const result = await prepareImport(await file(), 'sqli-demo')
 expect(result.ok).toBe(true)
 if (!result.ok) return
 expect(result.session.challengeSlug).toBe('sqli-demo')
 expect(result.session.challengeTitle).toBe('SQL Injection Demo')
 expect(result.session.startedAt).toBe(1000)
 expect(result.session.solvedAt).toBe(2000)
 expect(result.session.events).toEqual(source().session.events)
 expect(result.session.draft).toEqual({ code: 'never run', updatedAt: 1800 })
})

it('gives each import its own session id and keeps the file\'s in the origin marker', async () => {
 const text = await file()
 const first = await prepareImport(text, 'sqli-demo')
 const second = await prepareImport(text, 'sqli-demo')
 expect(first.ok && second.ok).toBe(true)
 if (!first.ok || !second.ok) return
 // Distinct from each other, so importing the same file twice adds a second record
 // instead of replacing the first; distinct from the file's, so importing a file this
 // browser produced cannot land on the record it was exported from.
 expect(first.session.sessionId).not.toBe(second.session.sessionId)
 expect(first.session.sessionId).not.toBe('from-the-file')
 expect(second.session.sessionId).not.toBe('from-the-file')
})

it('marks the record as imported and records where it came from', async () => {
 const before = Date.now()
 const result = await prepareImport(await file(), 'sqli-demo')
 expect(result.ok).toBe(true)
 if (!result.ok) return
 expect(result.session.origin?.kind).toBe('imported')
 expect(result.session.origin?.sourceSessionId).toBe('from-the-file')
 expect(result.session.origin?.sourceExportedAt).toBe('2026-09-16T10:00:00+08:00')
 expect(result.session.origin!.importedAt).toBeGreaterThanOrEqual(before)
})

it('refuses a file that belongs to another challenge and names both', async () => {
 const result = await prepareImport(await file(s => { s.challenge.slug = 'xss-playground' }), 'sqli-demo')
 expect(result.ok).toBe(false)
 expect(result.ok === false && result.kind).toBe('wrong-challenge')
 // Both names, because the learner's next move is to open the challenge the file
 // belongs to. Naming only one leaves them guessing which half is wrong.
 if (result.ok || result.kind !== 'wrong-challenge') return
 expect(result.fileSlug).toBe('xss-playground')
 expect(result.openSlug).toBe('sqli-demo')
})

it('refuses an event that the stored record\'s own shape cannot describe', async () => {
 // The verifier accepts any object in `events` — it validates a package, not this
 // store's event type. A package can therefore be internally consistent and still
 // carry an event with no kind and no time.
 const result = await prepareImport(await file(s => { s.session.events = [{ nothing: 'here' }] }), 'sqli-demo')
 expect(result.ok).toBe(false)
 expect(result.ok === false && result.kind).toBe('invalid')
})

it('imports a package written before traces existed', async () => {
 // Version 1 files are already on learners' disks. The version a package may be at is
 // the verifier's rule; import restating it would be a second place that decides.
 const v2 = JSON.parse(await file())
 const { checksum, ...integrity } = v2.integrity
 delete v2.traces
 const v1 = { ...v2, schemaVersion: 1, integrity }
 const { createHash } = await import('node:crypto')
 v1.integrity = { ...integrity, checksum: createHash('sha256').update(canonicalJson(v1)).digest('hex') }

 const result = await prepareImport(JSON.stringify(v1), 'sqli-demo')
 expect(result.ok).toBe(true)
})

it('takes nothing out of the file\'s trace list', async () => {
 const forged = JSON.parse(await file())
 // Ids nothing else can produce. They were `f1` and `f2`, and the assertions below search
 // a serialisation that carries a random `sessionId`: a UUID is 32 hex characters, so it
 // contains a given hex pair about 11% of the time, and this test failed on roughly one run
 // in five for a reason that had nothing to do with importing.
 forged.traces = [
   { id: 'forged-trace-removed', challengeSlug: 'sqli-demo', at: 1, kind: 'removed', removed: [] },
   { id: 'forged-trace-exported', challengeSlug: 'sqli-demo', at: 2, kind: 'exported', sessionId: 'x', mode: 'full', identitySupplied: false },
 ]
 const { checksum, ...integrity } = forged.integrity
 const { createHash } = await import('node:crypto')
 forged.integrity = { ...integrity, checksum: createHash('sha256').update(canonicalJson({ ...forged, integrity })).digest('hex') }

 const result = await prepareImport(JSON.stringify(forged), 'sqli-demo')
 expect(result.ok).toBe(true)
 if (!result.ok) return
 // The ids really are in the file. Without this the two assertions below would pass just as
 // well against a forgery that never carried them — green because it looked at nothing.
 expect(JSON.stringify(forged)).toContain('forged-trace-removed')
 expect(JSON.stringify(forged)).toContain('forged-trace-exported')
 // A file's traces are read-only context. Adopting them would let a hand-written file
 // inject fabricated activity that this device would then carry onward as its own.
 expect(JSON.stringify(result.session)).not.toContain('forged-trace-removed')
 expect(JSON.stringify(result.session)).not.toContain('forged-trace-exported')
})
