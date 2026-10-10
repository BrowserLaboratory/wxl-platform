import { afterEach, expect, it, vi } from 'vitest'
import { webcrypto, createHash } from 'node:crypto'
import { createExportPackage, verifyExportPackage, renderMarkdown, exportFilename, canonicalJson } from '../../../.vitepress/theme/lib/attackLogExport'
vi.stubGlobal('crypto', webcrypto)
afterEach(() => vi.restoreAllMocks())
const source = () => ({meta:{timezone:'UTC',exportedAt:'2026-09-13T00:00:00+00:00'},challenge:{slug:'test',title:'<img src=x> | # title'},session:{sessionId:'session-1',startedAt:0,solvedAt:null,events:[{type:'http_request',timestamp:1,source:'browser',id:1,method:'POST',url:'/',requestHeaders:[],requestBody:'keep request',status:200,responseHeaders:[],responseBody:'large body',duration:1},{type:'panel_view',timestamp:2,panel:'network'},{type:'note',timestamp:3,id:'n',content:'```\n</script> | *unsafe*',updatedAt:null},{type:'http_request',timestamp:4,responseBody:'malformed retained'}],draft:{code:'never run',updatedAt:5}}})

it('canonicalizes keys with a known UTF-8 SHA-256 vector', async () => {
 expect(canonicalJson({z:[2,1],a:'台灣'})).toBe('{"a":"台灣","z":[2,1]}')
 const p=await createExportPackage(source(),{format:'json',mode:'full'})
 const {checksum,...integrity}=p.integrity
 expect(checksum).toBe(createHash('sha256').update(canonicalJson({...p,integrity})).digest('hex'))
 expect(p.integrity.eventHashes[0]).toBe(createHash('sha256').update(canonicalJson({index:0,previousHash:'0'.repeat(64),event:p.session.events[0]})).digest('hex'))
})
it('full preserves all events while thinned removes only recognized data from a copy',async()=>{
 const s=source();const original=structuredClone(s)
 const full=await createExportPackage(s,{format:'json',mode:'full'})
 const thin=await createExportPackage(s,{format:'json',mode:'thinned'})
 expect(full.session.events).toEqual(original.session.events)
 expect(thin.session.events).toHaveLength(3)
 expect(thin.session.events[0]).not.toHaveProperty('responseBody')
 expect(thin.session.events[0].requestBody).toBe('keep request')
 expect(thin.session.events[1]).toEqual(original.session.events[2])
 expect(thin.session.events[2]).toEqual(original.session.events[3])
 expect(thin.session.draft).toEqual(s.session.draft)
 expect(thin.policy).toEqual({mode:'thinned',omittedResponseBodies:1,omittedPanelViews:1})
 expect(s).toEqual(original)
 expect((await verifyExportPackage(thin)).valid).toBe(true)
})
it.each(['metadata','body','identity','reorder','delete','version','policy','hash'] as const)('rejects %s tampering',async kind=>{
 const p=await createExportPackage(source(),{format:'json',mode:'full',identity:{name:'A'}})
 if(kind==='metadata')p.meta.timezone='Elsewhere'
 if(kind==='body')p.session.events[0].responseBody='changed'
 if(kind==='identity')p.meta.identity={name:'B'}
 if(kind==='reorder')p.session.events.reverse()
 if(kind==='delete')p.session.events.pop()
 if(kind==='version')p.schemaVersion=99
 if(kind==='policy')p.policy.mode='invalid' as 'full'
 if(kind==='hash')p.integrity.eventHashes[0]='0'.repeat(64)
 expect((await verifyExportPackage(p)).valid).toBe(false)
})
it('snapshots before hashing and supports empty events',async()=>{
 const s=source();s.session.events=[]
 const pending=createExportPackage(s,{format:'json',mode:'full'})
 s.session.draft.code='changed after call'
 const p=await pending
 expect(p.session.draft).toEqual({code:'never run',updatedAt:5})
 expect(p.integrity.eventHashes).toEqual([])
 expect((await verifyExportPackage(p)).valid).toBe(true)
})
it('normalizes identity and keeps filenames within one path component',async()=>{
 const p=await createExportPackage(source(),{format:'json',mode:'full',identity:{name:' /A\\B\n'+ '😀'.repeat(45),className:'   '}})
 expect(Array.from(p.meta.identity!.name!).length).toBe(40)
 expect(p.meta.identity).not.toHaveProperty('className')
 expect(p.meta.identity!.name).not.toMatch(/[\r\n]/)
 const filename=exportFilename(p,'markdown')
 expect(filename).toMatch(/^attack-session-test-/)
 expect(filename).toMatch(/-full\.md$/)
 expect(filename).not.toMatch(/[\\/:*?"<>|\x00-\x1f]/)
})
it('fences hostile content and exposes the complete logical package in Markdown',async()=>{
 const p=await createExportPackage(source(),{format:'markdown',mode:'full',identity:{name:'[name](url)'}})
 const md=renderMarkdown(p)
 expect(md).not.toContain('# <img')
 const blocks=[...md.matchAll(/(^`{4,})json\n([\s\S]*?)\n\1$/gm)].map(m=>JSON.parse(m[2]))
 expect(blocks).toContainEqual(p)
 expect(md).toContain('&lt;img')
})
it.each([null,{},[],{schemaVersion:1}])('rejects malformed packages (case %#)',async value=>{
 expect((await verifyExportPackage(value)).valid).toBe(false)
})

// Recompute the outer checksum so these assertions exercise schema and chain checks independently.
it.each(['version', 'policy', 'chain', 'identity', 'prompt'] as const)('rejects resigned invalid %s', async kind => {
 const p = await createExportPackage(source(), { format: 'json', mode: 'full' })
 if (kind === 'version') p.schemaVersion = 99
 if (kind === 'policy') p.policy.omittedPanelViews = 1
 if (kind === 'chain') p.integrity.eventHashes[0] = '0'.repeat(64)
 if (kind === 'identity') p.meta.identity = { name: '\n' }
 if (kind === 'prompt') p.meta.systemPrompt = 42 as unknown as string
 const { checksum, ...integrity } = p.integrity
 p.integrity.checksum = createHash('sha256').update(canonicalJson({ ...p, integrity })).digest('hex')
 expect((await verifyExportPackage(p)).valid).toBe(false)
})

it.each([{ mode: ['full'] }, { mode: ['thinned'] }])('rejects a resigned array policy mode $mode', async ({ mode }) => {
 const p = await createExportPackage(source(), { format: 'json', mode: 'full' })
 p.policy.mode = mode as unknown as 'full'
 const { checksum, ...integrity } = p.integrity
 p.integrity.checksum = createHash('sha256').update(canonicalJson({ ...p, integrity })).digest('hex')
 expect((await verifyExportPackage(p)).valid).toBe(false)
})

it('preserves a malformed HTTP event whose source is an array', async () => {
 const s = source()
 s.session.events[0].source = ['browser'] as unknown as string
 const p = await createExportPackage(s, { format: 'json', mode: 'thinned' })
 expect(p.session.events[0]).toEqual(s.session.events[0])
 expect(p.policy.omittedResponseBodies).toBe(0)
})

it('is version 2 and carries the traces it was given, under the checksum but not the chain',async()=>{
 const traces=[{id:'t1',challengeSlug:'test',at:5000,kind:'removed' as const,removed:[{startedAt:1,solved:true}]}]
 const s=source()
 const withTraces=await createExportPackage({...s,traces},{format:'json',mode:'full'})
 const without=await createExportPackage(s,{format:'json',mode:'full'})
 expect(withTraces.schemaVersion).toBe(2)
 expect(withTraces.traces).toEqual(traces)
 // A package handed no traces still carries the field, as an empty list: absent and
 // empty mean different things and only version 1 gets to mean "absent".
 expect(without.traces).toEqual([])
 // The chain describes events. Traces ride under the checksum, which covers everything.
 expect(withTraces.integrity.eventHashes).toEqual(without.integrity.eventHashes)
 expect((await verifyExportPackage(withTraces)).valid).toBe(true)
})
it('fails verification when a trace is edited without recomputing integrity',async()=>{
 const p=await createExportPackage({...source(),traces:[{id:'t1',challengeSlug:'test',at:5000,kind:'removed' as const,removed:[{startedAt:1,solved:true}]}]},{format:'json',mode:'full'})
 p.traces[0].removed=[]
 expect((await verifyExportPackage(p)).valid).toBe(false)
})
it.each([[1,true],[2,true],[3,false]] as const)('accepts schemaVersion %s: %s',async(version,ok)=>{
 const p:any=await createExportPackage(source(),{format:'json',mode:'full'})
 if(version===2)expect((await verifyExportPackage(p)).valid).toBe(true)
 else{
  // Rebuilt at the other version so its checksum matches; only the version differs.
  const {checksum,...integrity}=p.integrity
  const unsigned={...p,schemaVersion:version,integrity}
  if(version===1)delete unsigned.traces
  const {createHash}=await import('node:crypto')
  unsigned.integrity={...integrity,checksum:createHash('sha256').update(canonicalJson(unsigned)).digest('hex')}
  expect((await verifyExportPackage(unsigned)).valid).toBe(ok)
 }
})

it.each([
 ['a version 1 package carrying traces',1,[{id:'t',challengeSlug:'test',at:1,kind:'removed',removed:[]}]],
 ['a version 2 package whose traces is not a list',2,'not-a-list'],
 ['a version 2 package with no traces field at all',2,undefined],
] as const)('rejects %s',async(_label,version,traces)=>{
 const p:any=await createExportPackage(source(),{format:'json',mode:'full'})
 const {checksum,...integrity}=p.integrity
 const unsigned:any={...p,schemaVersion:version,integrity}
 if(traces===undefined)delete unsigned.traces; else unsigned.traces=traces
 const {createHash}=await import('node:crypto')
 // Checksum recomputed so the refusal is about the version/traces rule and not about
 // an edit the integrity check would have caught anyway.
 unsigned.integrity={...integrity,checksum:createHash('sha256').update(canonicalJson(unsigned)).digest('hex')}
 expect((await verifyExportPackage(unsigned)).valid).toBe(false)
})
