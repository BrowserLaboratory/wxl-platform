export interface ExportIdentity { name?: string; className?: string }
export interface ExportOptions { format: 'json' | 'markdown'; mode: 'full' | 'thinned'; identity?: ExportIdentity }
export interface ExportSource {
  meta: { timezone: string; exportedAt: string; systemPrompt?: string; identity?: ExportIdentity }
  challenge: { slug: string; title: string; [key: string]: unknown }
  session: { sessionId: string; startedAt: number; solvedAt: number | null; events: Record<string, unknown>[]; draft: { code: string; updatedAt: number } | null }
  /**
   * What happened to this challenge's records before this export.
   *
   * Absent and empty are different answers and the caller decides which it is giving.
   * A package at schema version 1 has no field at all, which is why it can say nothing
   * about activity rather than reporting none.
   */
  traces?: Record<string, unknown>[]
}
export interface ExportPackage extends ExportSource {
  traces: Record<string, unknown>[]
  schemaVersion: number
  policy: { mode: 'full' | 'thinned'; omittedResponseBodies: number; omittedPanelViews: number }
  integrity: { algorithm: 'SHA-256'; eventHashes: string[]; checksum: string }
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** JSON values only; object keys use JavaScript's UTF-16 ordering. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}'
  throw new Error('Expected finite JSON data')
}
async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  const result = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(result), n => n.toString(16).padStart(2, '0')).join('')
}
export function normalizeIdentity(identity: ExportIdentity = {}): ExportIdentity {
  const result: ExportIdentity = {}
  for (const key of ['name', 'className'] as const) {
    const input = identity[key]
    if (input !== undefined && typeof input !== 'string') throw new Error('Invalid identity')
    const value = Array.from((input ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim()).slice(0, 40).join('')
    if (value) result[key] = value
  }
  return result
}
function httpEvent(event: Record<string, unknown>): boolean {
  const headers = (value: unknown) => Array.isArray(value) && value.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(x => typeof x === 'string'))
  return event.type === 'http_request' && typeof event.timestamp === 'number' && typeof event.source === 'string' && ['browser', 'repeater', 'code'].includes(event.source) &&
    typeof event.id === 'number' && typeof event.method === 'string' && typeof event.url === 'string' &&
    headers(event.requestHeaders) && (event.requestBody === null || typeof event.requestBody === 'string') &&
    typeof event.status === 'number' && headers(event.responseHeaders) && typeof event.responseBody === 'string' && typeof event.duration === 'number'
}
async function eventHashes(events: Record<string, unknown>[]): Promise<string[]> {
  const hashes: string[] = []
  let previousHash = '0'.repeat(64)
  for (const [index, event] of events.entries()) {
    previousHash = await digest({ index, previousHash, event })
    hashes.push(previousHash)
  }
  return hashes
}
export async function createExportPackage(source: ExportSource, options: ExportOptions): Promise<ExportPackage> {
  if (!['full', 'thinned'].includes(options.mode) || !['json', 'markdown'].includes(options.format)) throw new Error('Invalid export options')
  // Clone before the first await: browser activity can keep appending events while hashing.
  const copy: ExportSource = JSON.parse(JSON.stringify(source))
  const identity = normalizeIdentity(options.identity)
  delete copy.meta.identity
  if (Object.keys(identity).length) copy.meta.identity = identity
  const policy: ExportPackage['policy'] = { mode: options.mode, omittedResponseBodies: 0, omittedPanelViews: 0 }
  if (options.mode === 'thinned') {
    copy.session.events = copy.session.events.filter(event => {
      if (event.type === 'panel_view' && typeof event.timestamp === 'number' && typeof event.panel === 'string') {
        policy.omittedPanelViews++
        return false
      }
      if (httpEvent(event)) {
        delete event.responseBody
        policy.omittedResponseBodies++
      }
      return true
    })
  }
  // The chain covers events, which is what it has always described. Traces ride under
  // the checksum, which covers the whole package — a second chain would be one more
  // thing that can fall out of step with the first.
  const integrity = { algorithm: 'SHA-256' as const, eventHashes: await eventHashes(copy.session.events) }
  const unsigned = { ...copy, traces: copy.traces ?? [], schemaVersion: 2, policy, integrity }
  return { ...unsigned, integrity: { ...integrity, checksum: await digest(unsigned) } }
}

/** Validity means consistency with these hashes, never authorship or authenticity. */
export async function verifyExportPackage(value: unknown): Promise<{ valid: boolean; reason?: string }> {
  try {
    value = JSON.parse(canonicalJson(value))
    // Both live versions. Files written at 1 are already on learners' disks, and
    // refusing them would void every export C2 and C3 produced.
    if (!object(value) || ![1, 2].includes(value.schemaVersion as number) || !object(value.meta) || !object(value.challenge) || !object(value.session) || !object(value.policy) || !object(value.integrity)) throw new Error('Unsupported or malformed package')
    const { session, meta, challenge, policy, integrity } = value
    if (typeof meta.timezone !== 'string' || typeof meta.exportedAt !== 'string' || typeof challenge.slug !== 'string' || typeof challenge.title !== 'string' || typeof session.sessionId !== 'string' || typeof session.startedAt !== 'number' || !(session.solvedAt === null || typeof session.solvedAt === 'number') || !Array.isArray(session.events) || !session.events.every(object) || !(session.draft === null || (object(session.draft) && typeof session.draft.code === 'string' && typeof session.draft.updatedAt === 'number'))) throw new Error('Malformed data')
    if (meta.systemPrompt !== undefined && typeof meta.systemPrompt !== 'string') throw new Error('Invalid prompt')
    // Version 1 carries no field; version 2 carries a list. Neither is allowed to carry
    // the other's shape, so a package cannot claim a version it was not written at.
    if (value.schemaVersion === 1 ? value.traces !== undefined : !(Array.isArray(value.traces) && value.traces.every(object))) throw new Error('Invalid traces')
    if (meta.identity !== undefined && (!object(meta.identity) || canonicalJson(normalizeIdentity(meta.identity)) !== canonicalJson(meta.identity))) throw new Error('Invalid identity')
    if (typeof policy.mode !== 'string' || !['full', 'thinned'].includes(policy.mode) || ![policy.omittedResponseBodies, policy.omittedPanelViews].every(x => Number.isSafeInteger(x) && Number(x) >= 0) || (policy.mode === 'full' && (policy.omittedResponseBodies !== 0 || policy.omittedPanelViews !== 0))) throw new Error('Invalid policy')
    if (integrity.algorithm !== 'SHA-256' || !Array.isArray(integrity.eventHashes) || typeof integrity.checksum !== 'string') throw new Error('Invalid integrity metadata')
    const hashes = await eventHashes(session.events)
    if (canonicalJson(hashes) !== canonicalJson(integrity.eventHashes)) throw new Error('Event chain mismatch')
    const { checksum, ...unsignedIntegrity } = integrity
    if (await digest({ ...value, integrity: unsignedIntegrity }) !== checksum) throw new Error('Checksum mismatch')
    return { valid: true }
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'Invalid package' }
  }
}
function inline(value: string): string {
  return value.replace(/[\r\n]/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&')
}
export function renderMarkdown(value: ExportPackage): string {
  const json = JSON.stringify(value, null, 2)
  const length = Array.from(json.matchAll(/`+/g)).reduce((longest, match) => Math.max(longest, match[0].length), 3) + 1
  const fence = '`'.repeat(length)
  return `# Attack log: ${inline(value.challenge.title)}\n\n- Schema: ${value.schemaVersion}\n- Mode: ${value.policy.mode}\n- Session: ${inline(value.session.sessionId)}\n\nThe JSON block contains the complete logical export, including events, draft and integrity metadata. Integrity checks cover this data, not Markdown formatting; they do not prove authorship.\n\n${fence}json\n${json}\n${fence}\n`
}
export function exportFilename(value: ExportPackage, format: ExportOptions['format']): string {
  const safe = (text: string) => text.replace(/[\\/:*?"<>|\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '_').replace(/[. ]+$/g, '')
  const identity = [value.meta.identity?.className, value.meta.identity?.name].filter(Boolean).map(x => safe(x!)).filter(Boolean)
  const stamp = value.meta.exportedAt.slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
  return ['attack-session', safe(value.challenge.slug), ...identity, stamp, value.policy.mode].join('-') + (format === 'markdown' ? '.md' : '.json')
}
