import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, rmSync, statSync, realpathSync, mkdtempSync, cpSync, symlinkSync, chmodSync, readdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve, join, relative, basename } from 'node:path'
import { tmpdir, platform } from 'node:os'
import {
  prepareTemplateWasm,
  assertUsableWasm,
  preparedTemplateRelPath,
  WASM_PACK_OUT_DIRS,
  serializePayload,
  parsePayload,
  xorEncodeKey,
  hexToBytes,
  bytesToHex,
  deriveFlagVerifier,
  injectCustomSection,
  slugToSeed,
  isOutputStale,
  getTrackedInputPaths,
  keygenSlugs,
  aesGcmEncryptRaw,
  planDisplaySource,
  wasmMutate,
  assertPayloadIntact,
  buildChallengeWasm,
  type ChallengePayload,
} from '../../../scripts/challenge-keygen'
import { extractCustomSection } from '../../../.vitepress/theme/composables/useWasmLoader'
import { readPrimaryLocale } from '../../../.vitepress/primary-locale'
import { parseDocument } from 'yaml'
import { upstreamOnlySkipReason, readManifest, isGitWorkTree, hasRootRangeJson } from '../../__helpers__/upstreamDecision'

// ─── XOR masks matching Rust key_derive.rs compile-time constants ────────────
const MASK_A = new Uint8Array([
  0x7a, 0x3f, 0xb1, 0x92, 0xe4, 0x58, 0x0d, 0xc6,
  0xa3, 0x17, 0x6b, 0xf0, 0x2e, 0x89, 0xd4, 0x53,
  0x91, 0x46, 0xfc, 0x28, 0x7d, 0xe5, 0x0a, 0xb3,
  0xc7, 0x64, 0x1f, 0x8e, 0x39, 0xa2, 0xd0, 0x5b,
])

const MASK_B = new Uint8Array([
  0xd5, 0x4e, 0x23, 0xa7, 0x1b, 0x96, 0xf8, 0x42,
  0x0c, 0xe1, 0x5a, 0x3d, 0xb7, 0x60, 0x89, 0xc4,
  0x2f, 0x73, 0x18, 0xe6, 0x4a, 0x9d, 0x51, 0x0e,
  0xb2, 0xd8, 0x65, 0xf3, 0x47, 0x1c, 0xa9, 0x84,
])

const MASK_C = new Uint8Array([
  0x38, 0xc2, 0x67, 0x15, 0x9e, 0xab, 0xd3, 0x4f,
  0x71, 0x86, 0x2c, 0xe9, 0x54, 0x0b, 0xf7, 0xa1,
  0x63, 0xbd, 0x40, 0x95, 0xd2, 0x1e, 0x78, 0xc6,
  0x09, 0x4a, 0xf1, 0x27, 0x8c, 0xe3, 0x5d, 0xb0,
])

// ─── Binary payload serialization / parsing ─────────────────────────────────

describe('serializePayload', () => {
  it('produces binary starting with CHWD magic and version 1', () => {
    const payload: ChallengePayload = {
      slug: 'test',
      keyMaterial: new Uint8Array(32),
      verifier: new Uint8Array(0),
      entries: [],
      metadata: new Uint8Array(2), // '{}'
    }
    const buf = serializePayload(payload)
    // Magic: C H W D
    expect(buf[0]).toBe(0x43)
    expect(buf[1]).toBe(0x48)
    expect(buf[2]).toBe(0x57)
    expect(buf[3]).toBe(0x44)
    // Version
    expect(buf[4]).toBe(1)
  })

  it('roundtrips a payload with entries', () => {
    const payload: ChallengePayload = {
      slug: 'sqli-demo',
      keyMaterial: new Uint8Array(32).fill(0xAA),
      verifier: new TextEncoder().encode('abcdef1234567890'),
      entries: [
        { path: '/flag.txt', data: new Uint8Array([0x01, 0x02, 0x03]) },
        { path: '__app__', data: new Uint8Array([0x04, 0x05]) },
      ],
      metadata: new TextEncoder().encode('{"backend":"flask"}'),
    }
    const buf = serializePayload(payload)
    const parsed = parsePayload(buf)

    expect(parsed.slug).toBe('sqli-demo')
    expect(parsed.keyMaterial).toEqual(new Uint8Array(32).fill(0xAA))
    expect(new TextDecoder().decode(parsed.verifier)).toBe('abcdef1234567890')
    expect(parsed.entries.length).toBe(2)
    expect(parsed.entries[0].path).toBe('/flag.txt')
    expect(parsed.entries[0].data).toEqual(new Uint8Array([0x01, 0x02, 0x03]))
    expect(parsed.entries[1].path).toBe('__app__')
    expect(new TextDecoder().decode(parsed.metadata)).toBe('{"backend":"flask"}')
  })

  it('uses little-endian for multi-byte integers', () => {
    const payload: ChallengePayload = {
      slug: 'x'.repeat(256), // slug_len = 256, > 1 byte in LE
      keyMaterial: new Uint8Array(32),
      verifier: new Uint8Array(0),
      entries: [],
      metadata: new Uint8Array(0),
    }
    const buf = serializePayload(payload)
    // slug_len at offset 5-6: 256 = 0x0100 LE → [0x00, 0x01]
    expect(buf[5]).toBe(0x00)
    expect(buf[6]).toBe(0x01)
  })

  it('roundtrips empty entries and metadata', () => {
    const payload: ChallengePayload = {
      slug: 'empty',
      keyMaterial: new Uint8Array(32),
      verifier: new Uint8Array(0),
      entries: [],
      metadata: new Uint8Array(0),
    }
    const buf = serializePayload(payload)
    const parsed = parsePayload(buf)
    expect(parsed.slug).toBe('empty')
    expect(parsed.entries.length).toBe(0)
    expect(parsed.metadata.length).toBe(0)
  })
})

describe('parsePayload', () => {
  it('rejects invalid magic', () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x01])
    expect(() => parsePayload(buf)).toThrow(/magic/)
  })

  it('rejects unsupported version', () => {
    const buf = new Uint8Array([0x43, 0x48, 0x57, 0x44, 99, 0, 0])
    expect(() => parsePayload(buf)).toThrow(/version/)
  })

  it('rejects truncated data', () => {
    expect(() => parsePayload(new Uint8Array([0x43, 0x48, 0x57]))).toThrow()
  })
})

// ─── XOR key encoding ───────────────────────────────────────────────────────

describe('xorEncodeKey', () => {
  it('produces encoded key different from input', () => {
    const key = new Uint8Array(32).fill(0x42)
    const encoded = xorEncodeKey(key)
    expect(encoded).not.toEqual(key)
    expect(encoded.length).toBe(32)
  })

  it('is reversible (XOR is self-inverse)', () => {
    const key = new Uint8Array(32)
    crypto.getRandomValues(key)
    const encoded = xorEncodeKey(key)
    const decoded = xorEncodeKey(encoded) // XOR again = original
    expect(decoded).toEqual(key)
  })

  it('matches Rust key_derive.rs masks', () => {
    // Verify that xorEncodeKey(key) = key XOR MASK_A XOR MASK_B XOR MASK_C
    const key = new Uint8Array(32).fill(0xFF)
    const encoded = xorEncodeKey(key)
    const expected = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      expected[i] = key[i] ^ MASK_A[i] ^ MASK_B[i] ^ MASK_C[i]
    }
    expect(encoded).toEqual(expected)
  })

  it('rejects key that is not 32 bytes', () => {
    expect(() => xorEncodeKey(new Uint8Array(16))).toThrow()
    expect(() => xorEncodeKey(new Uint8Array(0))).toThrow()
  })
})

// ─── Hex conversion utilities ───────────────────────────────────────────────

describe('hexToBytes', () => {
  it('converts hex string to bytes', () => {
    expect(hexToBytes('deadbeef')).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
  })

  it('handles all zeros', () => {
    expect(hexToBytes('00000000')).toEqual(new Uint8Array([0, 0, 0, 0]))
  })
})

describe('bytesToHex', () => {
  it('converts bytes to hex string', () => {
    expect(bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('deadbeef')
  })
})

// ─── Flag verifier ──────────────────────────────────────────────────────────

describe('deriveFlagVerifier', () => {
  it('produces a 32-byte hash as Uint8Array', async () => {
    const result = await deriveFlagVerifier('FLAG{test}', 'test-slug')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(32)
  })

  it('is deterministic', async () => {
    const a = await deriveFlagVerifier('FLAG{x}', 'slug')
    const b = await deriveFlagVerifier('FLAG{x}', 'slug')
    expect(a).toEqual(b)
  })

  it('differs for different flags', async () => {
    const a = await deriveFlagVerifier('FLAG{a}', 'slug')
    const b = await deriveFlagVerifier('FLAG{b}', 'slug')
    expect(a).not.toEqual(b)
  })

  it('differs for different slugs', async () => {
    const a = await deriveFlagVerifier('FLAG{x}', 'slug-a')
    const b = await deriveFlagVerifier('FLAG{x}', 'slug-b')
    expect(a).not.toEqual(b)
  })
})

// ─── WASM custom section injection ──────────────────────────────────────────

describe('injectCustomSection', () => {
  // Minimal valid WASM module: magic + version + empty
  const MINIMAL_WASM = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // \0asm magic
    0x01, 0x00, 0x00, 0x00, // version 1
  ])

  it('appends a custom section to the WASM binary', () => {
    const payload = new Uint8Array([0xDE, 0xAD])
    const result = injectCustomSection(MINIMAL_WASM, 'chall-data', payload)

    // Result should be longer than original
    expect(result.length).toBeGreaterThan(MINIMAL_WASM.length)

    // Should start with the original WASM
    expect(result.slice(0, MINIMAL_WASM.length)).toEqual(MINIMAL_WASM)

    // Custom section starts after original WASM
    const sectionStart = MINIMAL_WASM.length
    expect(result[sectionStart]).toBe(0x00) // custom section id
  })

  it('encodes section name correctly', () => {
    const payload = new Uint8Array([0x42])
    const result = injectCustomSection(MINIMAL_WASM, 'test', payload)

    // After WASM header (8 bytes):
    // 0x00 (section id)
    // LEB128 section size
    // LEB128 name length (4 for "test")
    // "test" bytes
    // payload

    let pos = MINIMAL_WASM.length
    expect(result[pos]).toBe(0x00) // section id
    pos++

    // section size = name_len_leb(1) + name(4) + payload(1) = 6
    expect(result[pos]).toBe(6) // section size (LEB128, fits in 1 byte)
    pos++

    // name length
    expect(result[pos]).toBe(4) // "test" = 4 bytes
    pos++

    // name bytes
    expect(new TextDecoder().decode(result.slice(pos, pos + 4))).toBe('test')
    pos += 4

    // payload
    expect(result[pos]).toBe(0x42)
  })

  it('preserves original WASM binary unchanged', () => {
    const original = new Uint8Array(MINIMAL_WASM)
    const payload = new Uint8Array(100).fill(0xFF)
    injectCustomSection(original, 'chall-data', payload)

    // original should be unchanged
    expect(original).toEqual(MINIMAL_WASM)
  })

  it('handles large payloads requiring multi-byte LEB128', () => {
    // Payload > 127 bytes requires 2-byte LEB128 for section size
    const payload = new Uint8Array(200).fill(0xAB)
    const result = injectCustomSection(MINIMAL_WASM, 'chall-data', payload)

    // Should contain the full payload
    expect(result.length).toBeGreaterThan(MINIMAL_WASM.length + 200)
  })
})

// ─── Slug-to-seed for wasm-mutate ───────────────────────────────────────────

describe('slugToSeed', () => {
  it('produces a deterministic seed from slug', () => {
    const a = slugToSeed('sqli-demo')
    const b = slugToSeed('sqli-demo')
    expect(a).toBe(b)
  })

  it('produces different seeds for different slugs', () => {
    const a = slugToSeed('sqli-demo')
    const b = slugToSeed('xss-demo')
    expect(a).not.toBe(b)
  })

  it('returns a 32-bit integer', () => {
    const seed = slugToSeed('test')
    expect(Number.isInteger(seed)).toBe(true)
  })

  it('reads the hash as an unsigned u32 when the top bit is set', () => {
    // The signed reading of this slug's hash is -1882526008, which wasm-tools
    // rejects as a flag ("unexpected argument '-1' found") — so mutation was
    // silently skipped for roughly half of all slugs.
    const seed = slugToSeed('confidential-files')
    expect(seed).toBe(2412441288)
  })

  it('never returns a negative seed', () => {
    for (let i = 0; i < 1000; i++) {
      const seed = slugToSeed(`slug-${i}`)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(2 ** 32)
    }
  })
})

// ─── Source freshness detection (Task 1.1) ──────────────────────────────────

describe('isOutputStale', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns true when the output file does not exist', () => {
    const inputPath = join(tmpDir, 'input.txt')
    writeFileSync(inputPath, 'hello')
    const outputPath = join(tmpDir, 'nonexistent.wasm')
    expect(isOutputStale(outputPath, [inputPath])).toBe(true)
  })

  it('returns true when any tracked input is newer than the output', () => {
    const outputPath = join(tmpDir, 'output.wasm')
    writeFileSync(outputPath, 'old output')
    // Set the output mtime to the past
    const pastTime = new Date(Date.now() - 5000)
    utimesSync(outputPath, pastTime, pastTime)

    const inputPath = join(tmpDir, 'source.py')
    writeFileSync(inputPath, 'new source')
    // Input has current mtime, which is newer than output

    expect(isOutputStale(outputPath, [inputPath])).toBe(true)
  })

  it('returns false when all tracked inputs are older than the output', () => {
    const inputPath = join(tmpDir, 'source.py')
    writeFileSync(inputPath, 'old source')
    // Set input mtime to the past
    const pastTime = new Date(Date.now() - 5000)
    utimesSync(inputPath, pastTime, pastTime)

    const outputPath = join(tmpDir, 'output.wasm')
    writeFileSync(outputPath, 'new output')
    // Output has current mtime, which is newer than input

    expect(isOutputStale(outputPath, [inputPath])).toBe(false)
  })

  it('returns false when inputs list is empty and output exists', () => {
    const outputPath = join(tmpDir, 'output.wasm')
    writeFileSync(outputPath, 'output')
    expect(isOutputStale(outputPath, [])).toBe(false)
  })

  it('ignores non-existent input files gracefully', () => {
    const outputPath = join(tmpDir, 'output.wasm')
    writeFileSync(outputPath, 'output')
    // A non-existent input should not crash but should be treated as stale
    // (if the input was expected but is missing, we can't verify freshness)
    expect(isOutputStale(outputPath, [join(tmpDir, 'missing.txt')])).toBe(false)
  })
})

// ─── Template preparation (strip + optimise) ────────────────────────────────

// The template carries no executable code of its own at runtime — the loader
// only reads its `chall-data` custom section. But an empty template still
// breaks extraction, because `useWasmLoader.extractCustomSection` starts at
// byte 8 and a truncated module leaves nothing to walk. These tests pin the
// two ways the strip pass has silently produced an unusable template.

const REAL_TEMPLATE = resolve(__dirname, '../../../.vitepress/wasm/virtual-fs/virtual_fs_bg.wasm')

function hasWasmTools(): boolean {
  try {
    execFileSync('which', ['wasm-tools'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

describe('preparedTemplateRelPath', () => {
  it('stages the template outside every wasm-pack output directory', () => {
    // wasm-pack re-optimises everything in its --out-dir with a bare `wasm-opt
    // -O`, which rejects the reference-types the module uses. Staging the
    // template there breaks the *next* `pnpm wasm:build`, not the current one.
    const staged = preparedTemplateRelPath()
    for (const outDir of WASM_PACK_OUT_DIRS) {
      expect(staged.startsWith(`${outDir}/`)).toBe(false)
    }
  })
})

describe('assertUsableWasm', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-guard-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rejects a zero-byte output', () => {
    const p = join(tmpDir, 'out.wasm')
    writeFileSync(p, new Uint8Array(0))
    expect(() => assertUsableWasm(p, 77_000, 'wasm-strip')).toThrow(/wasm-strip/)
  })

  it('rejects a header-only module that carries no code', () => {
    // 8 bytes of magic + version is a structurally valid module, so neither a
    // non-zero exit code nor `wasm-tools validate` catches it. Size is the only
    // signal that the contents went missing.
    const p = join(tmpDir, 'out.wasm')
    writeFileSync(p, new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]))
    expect(() => assertUsableWasm(p, 77_000, 'wasm-strip')).toThrow(/8 bytes/)
  })

  it('rejects a file that is not WASM at all', () => {
    const p = join(tmpDir, 'out.wasm')
    writeFileSync(p, Buffer.alloc(50_000, 0x41))
    expect(() => assertUsableWasm(p, 77_000, 'wasm-strip')).toThrow(/magic/)
  })

  it('accepts an output that retains most of the input', () => {
    const p = join(tmpDir, 'out.wasm')
    const body = Buffer.alloc(70_000, 0x00)
    body.set([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00], 0)
    writeFileSync(p, body)
    expect(() => assertUsableWasm(p, 77_000, 'wasm-strip')).not.toThrow()
  })
})

describe('prepareTemplateWasm', () => {
  let tmpDir: string
  let cwd: string
  let input: string
  let inputReady = false

  const canRun = existsSync(REAL_TEMPLATE) && hasWasmTools()

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-prep-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
    // Work off a private copy. Reading the build output directly races any
    // concurrent `pnpm wasm:build`, which rewrites that file in place — and a
    // torn read says nothing about the code under test, so skip rather than
    // fail when the source does not look like a complete module.
    input = join(tmpDir, 'input.wasm')
    inputReady = false
    if (canRun) {
      const src = readFileSync(REAL_TEMPLATE)
      if (src.length > 50_000 && src[0] === 0x00 && src[1] === 0x61 && src[2] === 0x73 && src[3] === 0x6d) {
        writeFileSync(input, src)
        inputReady = true
      }
    }
    // Run from the temp dir so that a tool which writes to a relative path
    // drops its file here rather than in the repo root.
    cwd = process.cwd()
    process.chdir(tmpDir)
  })

  afterEach(() => {
    process.chdir(cwd)
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // `wasm-opt -O4` over a real 77 KB module takes seconds on its own, and these
  // two run it back to back while the rest of the suite competes for the same
  // cores. The default 5 s budget was being cleared by a margin that vanished
  // once the suite grew.
  it.skipIf(!canRun)('produces a template that retains the input\'s contents', (ctx) => {
    if (!inputReady) return ctx.skip()
    const out = join(tmpDir, 'template.wasm')
    prepareTemplateWasm(input, out)
    expect(readFileSync(out).length).toBeGreaterThan(readFileSync(input).length / 2)
  }, 60_000)

  it.skipIf(!canRun)('writes no stray file into the working directory', (ctx) => {
    if (!inputReady) return ctx.skip()
    // `wasm-tools strip -o -` treats "-" as a filename, not stdout. That drops
    // an untracked binary into the repo root on every keygen run.
    prepareTemplateWasm(input, join(tmpDir, 'template.wasm'))
    expect(existsSync(join(tmpDir, '-'))).toBe(false)
  }, 60_000)
})

describe('getTrackedInputPaths', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-tracked-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('includes the challenge declaration file', () => {
    // Set up a per-folder challenge structure
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    const mdPath = join(challDir, 'challenge.yaml')
    writeFileSync(mdPath, 'app: app.py\nbackend: flask\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')

    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const paths = getTrackedInputPaths(mdPath, templatePath)
    expect(paths).toContain(mdPath)
  })

  it('includes the template WASM', () => {
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    const mdPath = join(challDir, 'challenge.yaml')
    writeFileSync(mdPath, 'app: app.py\nbackend: flask\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')

    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const paths = getTrackedInputPaths(mdPath, templatePath)
    expect(paths).toContain(templatePath)
  })

  it('includes scanned src/ files', () => {
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    const templatesDir = join(srcDir, 'templates')
    mkdirSync(templatesDir, { recursive: true })

    const mdPath = join(challDir, 'challenge.yaml')
    writeFileSync(mdPath, 'app: app.py\nbackend: flask\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')
    writeFileSync(join(templatesDir, 'index.html'), '<html></html>')

    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const paths = getTrackedInputPaths(mdPath, templatePath)
    expect(paths).toContain(join(srcDir, 'app.py'))
    expect(paths).toContain(join(srcDir, 'flag.txt'))
    expect(paths).toContain(join(templatesDir, 'index.html'))
  })

  it('includes .fsignore when present', () => {
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    const mdPath = join(challDir, 'challenge.yaml')
    writeFileSync(mdPath, 'app: app.py\nbackend: flask\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')
    writeFileSync(join(srcDir, '.fsignore'), '*.log')

    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const paths = getTrackedInputPaths(mdPath, templatePath)
    expect(paths).toContain(join(srcDir, '.fsignore'))
  })

  it('tracks the declaration, the template and the src/ files, and no brief under platform/<locale>/', () => {
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    mkdirSync(join(srcDir, 'templates'), { recursive: true })
    const declPath = join(challDir, 'challenge.yaml')
    writeFileSync(declPath, 'app: app.py\nbackend: flask\n')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')
    writeFileSync(join(srcDir, 'templates', 'index.html'), '<html></html>')
    for (const locale of ['en', 'zh-TW']) {
      const brief = join(tmpDir, 'platform', locale, 'challenge', 'test-chall')
      mkdirSync(brief, { recursive: true })
      writeFileSync(join(brief, 'index.md'), '---\ntitle: T\nlayout: challenge\n---\n')
    }
    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const without = getTrackedInputPaths(declPath, templatePath)
    expect([...without].sort()).toEqual(
      [declPath, templatePath, join(srcDir, 'app.py'), join(srcDir, 'flag.txt'), join(srcDir, 'templates', 'index.html')].sort(),
    )
    expect(without.some((p) => p.startsWith(join(tmpDir, 'platform', 'en')) || p.startsWith(join(tmpDir, 'platform', 'zh-TW')))).toBe(false)
    expect(without).not.toContain(join(srcDir, '.fsignore'))

    writeFileSync(join(srcDir, '.fsignore'), '*.log')
    expect(getTrackedInputPaths(declPath, templatePath)).toContain(join(srcDir, '.fsignore'))
  })
})

// ─── Binary-preserving FS packaging (Task 1.2) ─────────────────────────────

describe('binary asset round-trip', () => {
  it('preserves binary data through serialize/parse round-trip', () => {
    // Create a payload with binary data (like a PNG header)
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
    ])

    const payload: ChallengePayload = {
      slug: 'binary-test',
      keyMaterial: new Uint8Array(32).fill(0xBB),
      verifier: new Uint8Array(32).fill(0xCC),
      entries: [
        { path: '/static/logo.png', data: pngHeader },
        { path: '__app__', data: new TextEncoder().encode('print("app")') },
      ],
      metadata: new TextEncoder().encode('{"backend":"flask"}'),
    }

    const serialized = serializePayload(payload)
    const parsed = parsePayload(serialized)

    // The PNG binary data must survive unchanged
    expect(parsed.entries[0].path).toBe('/static/logo.png')
    expect(parsed.entries[0].data).toEqual(pngHeader)
  })

  it('preserves bytes with 0x00 and 0xFF values through encryption round-trip', async () => {
    // Binary data containing bytes that would be corrupted by UTF-8 round-trip
    const binaryData = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      binaryData[i] = i // 0x00..0xFF - includes invalid UTF-8 sequences
    }

    const key = new Uint8Array(32).fill(0x42)
    const encrypted = await aesGcmEncryptRaw(key, binaryData)

    // The encrypted data should be raw bytes; verify it's non-trivial
    expect(encrypted.length).toBeGreaterThan(binaryData.length) // iv + ct + tag overhead
    expect(encrypted).toBeInstanceOf(Uint8Array)

    // Verify the encrypted data survives payload serialization
    const payload: ChallengePayload = {
      slug: 'binary-roundtrip',
      keyMaterial: new Uint8Array(32),
      verifier: new Uint8Array(32),
      entries: [{ path: '/binary.dat', data: encrypted }],
      metadata: new Uint8Array(0),
    }
    const serialized = serializePayload(payload)
    const parsed = parsePayload(serialized)
    expect(parsed.entries[0].data).toEqual(encrypted)
  })
})

// ─── Fixed-input reproducibility (Task 2.2) ─────────────────────────────────

describe('fixed-input reproducibility', () => {
  it('produces identical payloads when key material and inputs are fixed', () => {
    const makePayload = () => serializePayload({
      slug: 'repro-test',
      keyMaterial: new Uint8Array(32).fill(0xAA),
      verifier: new Uint8Array(32).fill(0xBB),
      entries: [
        { path: '/flag.txt', data: new Uint8Array([0x01, 0x02, 0x03]) },
        { path: '__app__', data: new TextEncoder().encode('app code') },
      ],
      metadata: new TextEncoder().encode('{"backend":"flask"}'),
    })

    const a = makePayload()
    const b = makePayload()
    expect(a).toEqual(b)
  })

  it('produces identical WASM when template, payload, and section name are fixed', () => {
    const templateWasm = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d,
      0x01, 0x00, 0x00, 0x00,
    ])
    const payloadBlob = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])

    const a = injectCustomSection(templateWasm, 'chall-data', payloadBlob)
    const b = injectCustomSection(templateWasm, 'chall-data', payloadBlob)
    expect(a).toEqual(b)
  })

  it('deriveFlagVerifier is deterministic for same inputs', async () => {
    const a = await deriveFlagVerifier('FLAG{repro}', 'repro-slug')
    const b = await deriveFlagVerifier('FLAG{repro}', 'repro-slug')
    expect(a).toEqual(b)
  })
})

// ─── White-box display source (__source__ payload entry) ─────────────────────

describe('planDisplaySource', () => {
  const FLAG = 'FLAG{keygen_probe_1234abcd}'
  const base = {
    appPath: 'app.py',
    appContent: 'from flask import Flask\n',
    fsEntries: new Map<string, Uint8Array>([
      ['/flag.txt', new TextEncoder().encode(`${FLAG}\n`)],
      ['/templates/cart.html', new TextEncoder().encode('<p>cart</p>')],
    ]),
    flagContent: `${FLAG}\n`,
  }

  it('emits nothing when source_visible is false', () => {
    expect(planDisplaySource({ source_visible: false }, base)).toBeNull()
  })

  it('emits nothing when source_visible is omitted', () => {
    expect(planDisplaySource({}, base)).toBeNull()
  })

  // `source_visible: 'true'` is a YAML string, not the boolean the field means. Accepting
  // it would make a typo silently produce a white-box challenge.
  it('emits nothing when source_visible is a string rather than the boolean', () => {
    expect(planDisplaySource({ source_visible: 'true' }, base)).toBeNull()
  })

  // `source_files: /templates/cart.html` — no brackets — parses as a string. Round 1
  // coerced that to `[]` behind the switch: a white-box handout silently missing every
  // file the author listed, and a black-box challenge slipping past the warning that
  // round 1 added for exactly this field. Shape is checked before the switch so it fails
  // on both paths, with the message validation uses.
  it('throws for a string source_files on a white-box challenge', () => {
    expect(() =>
      planDisplaySource({ source_visible: true, source_files: '/templates/cart.html' }, base),
    ).toThrow(/source_files must be an array.*string/)
  })

  it('throws for a string source_files even when source_visible is false', () => {
    expect(() =>
      planDisplaySource({ source_visible: false, source_files: '/templates/cart.html' }, base),
    ).toThrow(/source_files must be an array/)
  })

  it('still emits nothing for an absent source_files under a false switch', () => {
    expect(planDisplaySource({ source_visible: false }, base)).toBeNull()
  })

  it('emits a bundle when source_visible is true', () => {
    const plan = planDisplaySource({ source_visible: true }, base)
    expect(plan).not.toBeNull()
    const parsed = JSON.parse(new TextDecoder().decode(plan!.bytes))
    expect(parsed.files.map((f: { path: string }) => f.path)).toEqual(['app.py'])
  })

  // The rows are the delta spec's "files array ordering" example table.
  it.each([
    ['omitted', undefined, ['app.py']],
    ['one extra path', ['/templates/cart.html'], ['app.py', '/templates/cart.html']],
    [
      'two extra paths',
      ['/flag.txt', '/templates/cart.html'],
      ['app.py', '/flag.txt', '/templates/cart.html'],
    ],
  ])('orders the files with the app first when source_files is %s', (_label, sourceFiles, expected) => {
    const plan = planDisplaySource({ source_visible: true, source_files: sourceFiles }, base)
    const parsed = JSON.parse(new TextDecoder().decode(plan!.bytes))
    expect(parsed.files.map((f: { path: string }) => f.path)).toEqual(expected)
  })

  it('reports how many flag occurrences it redacted', () => {
    const plan = planDisplaySource(
      { source_visible: true, source_files: ['/flag.txt'] },
      { ...base, appContent: `SECRET = "${FLAG}"\n` },
    )
    expect(plan!.redactedCount).toBe(2)
    expect(new TextDecoder().decode(plan!.bytes)).not.toContain(FLAG)
  })

  it('reports zero when no source file holds a flag', () => {
    expect(planDisplaySource({ source_visible: true }, base)!.redactedCount).toBe(0)
  })

  it('rejects a source_files path the challenge has no entry for, naming it', () => {
    expect(() =>
      planDisplaySource({ source_visible: true, source_files: ['/nope.html'] }, base),
    ).toThrow(/\/nope\.html/)
  })
})

// ─── source_files failure modes, through the real CLI ────────────────────────
//
// The contract is a non-zero exit status, and only running the binary can show that:
// `planDisplaySource` throwing is necessary but not sufficient, because a caller that
// swallowed the error would leave these unit tests green while the build reported
// success. These cases abort before any WASM is written, so they stay fast.

const LIVE_ROOT = resolve(__dirname, '../../..')

// The CLI derives its root from its own file location (scripts/challenge-keygen.ts), so a
// copy of the tree it needs is enough: no test below may write into the live repository.
// node_modules is linked, not copied; .vitepress/dist and .vitepress/cache (~30 MB) are left out.
function copyRepoForKeygen(): string {
  const copy = mkdtempSync(join(realpathSync(tmpdir()), 'wxl-keygen-copy-'))
  const skip = [resolve(LIVE_ROOT, '.vitepress', 'dist'), resolve(LIVE_ROOT, '.vitepress', 'cache')]
  for (const rel of ['package.json', 'scripts', '.vitepress', 'platform', 'range.json']) {
    const from = resolve(LIVE_ROOT, rel)
    if (!existsSync(from)) continue
    cpSync(from, resolve(copy, rel), {
      recursive: true,
      filter: (src) => !skip.some((d) => src === d || src.startsWith(`${d}/`)),
    })
  }
  symlinkSync(resolve(LIVE_ROOT, 'node_modules'), resolve(copy, 'node_modules'), 'dir')
  return copy
}

describe('challenge-keygen CLI rejects an unusable source_files entry', () => {
  let repoRoot: string
  let challengeDir: string
  beforeAll(() => {
    repoRoot = copyRepoForKeygen()
    challengeDir = resolve(repoRoot, 'platform', 'challenge', slug)
  })
  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true })
  })
  const slug = 'keygen-source-files-probe'

  function writeChallenge(
    sourceFiles: string,
    sourceVisible = 'true',
    flag = 'FLAG{probe_0000aaaa}',
    dir = challengeDir,
  ): void {
    mkdirSync(resolve(dir, 'src'), { recursive: true })
    writeFileSync(resolve(dir, 'src', 'app.py'), 'from flask import Flask\n')
    writeFileSync(resolve(dir, 'src', 'flag.txt'), `${flag}\n`)
    writeFileSync(resolve(dir, 'src', 'logo.png'), Buffer.from([0x89, 0x50, 0xff, 0xfe]))
    // AC-61: the declaration carries every field but the brief's; the brief (title, layout)
    // sits in the primary locale's folder, P read from the copy's own range.json.
    writeFileSync(
      resolve(dir, 'challenge.yaml'),
      [
        'backend: flask',
        'app: app.py',
        'packages: [ flask ]',
        `source_visible: ${sourceVisible}`,
        `source_files: ${sourceFiles}`,
        '',
      ].join('\n'),
    )
    const briefDir = resolve(repoRoot, 'platform', readPrimaryLocale(join(repoRoot, 'range.json')), 'challenge', basename(dir))
    mkdirSync(briefDir, { recursive: true })
    writeFileSync(resolve(briefDir, 'index.md'), ['---', 'title: Probe', 'layout: challenge', '---', '', 'probe', ''].join('\n'))
  }

  // spawnSync, not execFileSync: the redaction notice goes to stderr, and execFileSync
  // returns only stdout on a successful run — the assertion would look at the wrong
  // stream and fail for a reason that has nothing to do with the behaviour under test.
  function runKeygen(target = slug): { status: number; output: string } {
    const r = spawnSync('pnpm', ['challenge:keygen', '--force', target], {
      cwd: repoRoot,
      encoding: 'utf-8',
    })
    return { status: r.status ?? -1, output: `${r.stdout ?? ''}${r.stderr ?? ''}` }
  }

  afterEach(() => {
    for (const s of [slug, payloadSlug]) {
      rmSync(resolve(repoRoot, 'platform', 'challenge', s), { recursive: true, force: true })
      rmSync(resolve(repoRoot, 'platform', readPrimaryLocale(join(repoRoot, 'range.json')), 'challenge', s), { recursive: true, force: true })
      rmSync(resolve(repoRoot, 'platform', 'public', 'challenge', s), { recursive: true, force: true })
    }
  })

  // A separate slug for the one case that reads the built WASM back. `wasm-tools mutate`
  // drops every custom section for some seeds — measured: the seed derived from
  // `keygen-source-files-probe` (29708221) produces a WASM with no `chall-data` section
  // at all, while this slug's seed keeps it. That is a latent keygen defect outside
  // this change (the section is injected before mutation rather than after), recorded
  // in the change's review matrix; the slug here is chosen so this test observes the
  // metadata and not that defect.
  const payloadSlug = 'keygen-payload-probe'

  // The slug is asserted alongside the path: a batch run that dies on one challenge's
  // whitelist has to say which challenge, or the author is left grepping twenty of them.
  it('runs the CLI on a copy under os.tmpdir(), never in the live repository', () => {
    writeChallenge('[ /nope.html ]')
    runKeygen()
    expect(relative(realpathSync(tmpdir()), repoRoot).startsWith('..')).toBe(false)
    expect(relative(LIVE_ROOT, repoRoot).startsWith('..')).toBe(true)
    expect(existsSync(resolve(LIVE_ROOT, 'platform', 'challenge', slug))).toBe(false)
  }, 60_000)

  it('exits non-zero and names the slug and a path that is not an entry of the challenge', () => {
    writeChallenge('[ /nope.html ]')
    const { status, output } = runKeygen()
    expect(status).not.toBe(0)
    expect(output).toContain('/nope.html')
    expect(output).toContain(`[${slug}]`)
  }, 60_000)

  it('exits non-zero and names the slug and a path whose content is not valid UTF-8', () => {
    writeChallenge('[ /logo.png ]')
    const { status, output } = runKeygen()
    expect(status).not.toBe(0)
    expect(output).toContain('/logo.png')
    expect(output).toContain(`[${slug}]`)
  }, 60_000)

  it('exits non-zero and names the slug when the flag is too short to redact by value', () => {
    writeChallenge('[]', 'true', 'admin')
    const { status, output } = runKeygen()
    expect(status).not.toBe(0)
    expect(output).toMatch(/5 characters/)
    expect(output).toContain(`[${slug}]`)
  }, 60_000)

  // Validation rejects a listed whitelist under a false switch; keygen does not run
  // validation, so it has to say the same thing itself or build a challenge that
  // displays nothing without a word.
  it('warns, names the slug, and still exits zero when source_files is listed but source_visible is false', () => {
    writeChallenge('[ /logo.png ]', 'false')
    const { status, output } = runKeygen()
    expect(status).toBe(0)
    expect(output).toMatch(new RegExp(`\\[warn\\] ${slug}: source_files lists 1 path`))
  }, 120_000)

  // The unbracketed form is the case the warning above could not see in round 1: not an
  // array, so "lists N paths" never fired, and the build went on in silence.
  it('exits non-zero and names the slug for an unbracketed source_files under a false switch', () => {
    writeChallenge('/logo.png', 'false')
    const { status, output } = runKeygen()
    expect(status).not.toBe(0)
    expect(output).toMatch(/source_files must be an array/)
    expect(output).toContain(`[${slug}]`)
  }, 60_000)

  it('exits non-zero and names the slug for a long but unshaped flag', () => {
    writeChallenge('[]', 'true', 'return request')
    const { status, output } = runKeygen()
    expect(status).not.toBe(0)
    expect(output).toMatch(/not FLAG/)
    expect(output).toContain(`[${slug}]`)
  }, 60_000)

  // The payload metadata carries the same field the build and the page gate on. A
  // quoted YAML "false" is a truthy string; written through as-is it would tell the
  // next reader of this metadata the opposite of what the build did.
  it('writes source_visible into payload metadata as a strict boolean', () => {
    writeChallenge('[]', '"false"', undefined, resolve(repoRoot, 'platform', 'challenge', payloadSlug))
    const { status } = runKeygen(payloadSlug)
    expect(status).toBe(0)
    const wasm = new Uint8Array(readFileSync(resolve(repoRoot, 'platform', 'public', 'challenge', payloadSlug, 'runtime.wasm')))
    const payload = parsePayload(extractCustomSection(wasm, 'chall-data')!)
    const metadata = JSON.parse(new TextDecoder().decode(payload.metadata)) as { source_visible: unknown }
    expect(metadata.source_visible).toBe(false)
    expect(payload.entries.map((e) => e.path)).not.toContain('__source__')
  }, 120_000)

  // A redaction is a warning, not a failure: the build carries on and produces the
  // challenge. Asserting the status as well as the message is what separates "reported
  // and continued" from "reported and aborted".
  it('reports the redaction count and still exits zero when the app hard-codes a flag', () => {
    writeChallenge('[]')
    writeFileSync(
      resolve(challengeDir, 'src', 'app.py'),
      'from flask import Flask\nSECRET = "FLAG{probe_0000aaaa}"\n',
    )
    const { status, output } = runKeygen()
    expect(status).toBe(0)
    expect(output).toMatch(/\[redact\].*1 flag occurrence/)
  }, 120_000)
})

// ─── Mutate before inject; verify after ─────────────────────────────────────
// `wasm-tools mutate` picks a custom-section mutator for a deterministic subset
// of seeds and reports success after removing the section. Measured 2026-09-05
// with 1.249.0 (the CI pin): 19 of 512 seeds, output exactly the template size,
// and `keygen-source-files-probe` (seed 29708221) is one of them. The fix is to
// hand the mutator a file that has no section to remove, then append it.

const STAGED_TEMPLATE = resolve(__dirname, '../../../.vitepress/wasm/template.wasm')
const FAKE_PAYLOAD_SIZE = 18_543 // the size of staff-only's real section, matching the sweep

describe('buildChallengeWasm — mutation runs before the payload exists', () => {
  let tmpDir: string
  const ready = hasWasmTools() && existsSync(STAGED_TEMPLATE)
  const run = ready ? it : it.skip
  if (!ready) {
    console.warn(
      `skipping seed-29708221 reproduction: wasm-tools not on PATH or ${STAGED_TEMPLATE} not staged (run pnpm challenge:keygen)`,
    )
  }

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-order-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // The spec example: "A seed whose mutator removes custom sections". Half of
  // this test is the defect itself — the old order with this seed yields a file
  // with no section — so a future wasm-tools that no longer drops it will fail
  // here loudly instead of leaving the second half unmotivated.
  run('seed 29708221 drops the section under the old order and keeps it under the new one', () => {
    const template = new Uint8Array(readFileSync(STAGED_TEMPLATE))
    const payloadBlob = new Uint8Array(FAKE_PAYLOAD_SIZE).map((_, i) => (i * 7 + 3) & 0xff)
    const seed = slugToSeed('keygen-source-files-probe')
    expect(seed).toBe(29708221)

    // Old order: inject, then mutate the injected file in place.
    const injected = join(tmpDir, 'old-order.wasm')
    writeFileSync(injected, injectCustomSection(template, 'chall-data', payloadBlob))
    execFileSync('wasm-tools', ['mutate', injected, '--seed', String(seed), '-o', injected], {
      maxBuffer: 50 * 1024 * 1024,
    })
    expect(extractCustomSection(new Uint8Array(readFileSync(injected)), 'chall-data')).toBeNull()

    // New order: mutate a template copy, then inject, then verify.
    const out = buildChallengeWasm({ templateWasmPath: STAGED_TEMPLATE, payloadBlob, seed, workDir: tmpDir })
    const section = extractCustomSection(out, 'chall-data')
    expect(section).not.toBeNull()
    expect(Buffer.from(section!)).toEqual(Buffer.from(payloadBlob))
  }, 60_000)

  // Spec stage 2, "SHALL run wasm-tools mutate … over the copy". Round 1 of review
  // measured that skipping the mutate call entirely left every test green: nothing
  // looked at whether the bytes had changed. This seed is one the CI-pinned wasm-tools
  // mutates successfully (the output is not the template); a seed it refuses would
  // fall back to a copy and be indistinguishable from a skipped pass.
  run('changes the module bytes for a seed the mutator accepts', () => {
    const template = new Uint8Array(readFileSync(STAGED_TEMPLATE))
    const out = join(tmpDir, 'mutated.wasm')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    let logged: string
    try {
      wasmMutate(STAGED_TEMPLATE, out, slugToSeed('door-is-open'))
    } finally {
      logged = log.mock.calls.flat().join('\n')
      log.mockRestore()
    }
    expect(logged).toMatch(/\[obfs\]\s+wasm-mutate applied \(seed=613474293\)/)
    expect(Buffer.from(readFileSync(out))).not.toEqual(Buffer.from(template))
  }, 60_000)

  // The widened scenario "A missing tool degrades to a warning": with no wasm-tools on
  // PATH the pipeline still ships a module whose section equals the payload.
  run('still carries the exact payload when wasm-tools is not on PATH', () => {
    const payloadBlob = new Uint8Array([0x43, 0x48, 0x57, 0x44, 0x09])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const savedPath = process.env.PATH
    process.env.PATH = tmpDir
    let out: Uint8Array
    try {
      out = buildChallengeWasm({ templateWasmPath: STAGED_TEMPLATE, payloadBlob, seed: 1, workDir: tmpDir })
    } finally {
      process.env.PATH = savedPath
      warn.mockRestore()
    }
    expect(Buffer.from(extractCustomSection(out, 'chall-data')!)).toEqual(Buffer.from(payloadBlob))
  })

  run('is byte-identical across two runs with the same template, payload, and seed', () => {
    const payloadBlob = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
    const seed = slugToSeed('door-is-open')
    const a = buildChallengeWasm({ templateWasmPath: STAGED_TEMPLATE, payloadBlob, seed, workDir: tmpDir })
    const b = buildChallengeWasm({ templateWasmPath: STAGED_TEMPLATE, payloadBlob, seed, workDir: tmpDir })
    expect(Buffer.from(a)).toEqual(Buffer.from(b))
  }, 60_000)
})

describe('assertPayloadIntact', () => {
  const header = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
  const payloadBlob = new Uint8Array([0x43, 0x48, 0x57, 0x44, 0x01, 0x02, 0x03])

  it('throws naming the label and "payload integrity" when the section is absent', () => {
    expect(() => assertPayloadIntact(header, payloadBlob, 'runtime.wasm'))
      .toThrow(/^runtime\.wasm: payload integrity/)
  })

  it('throws when the section is present but a byte differs', () => {
    const wasm = injectCustomSection(header, 'chall-data', payloadBlob)
    // Flip the first payload byte in place: the section header (id, size,
    // name length, name) sits between the module header and the data.
    const dataStart = wasm.length - payloadBlob.length
    wasm[dataStart] ^= 0xff
    expect(() => assertPayloadIntact(wasm, payloadBlob, 'runtime.wasm')).toThrow(/payload integrity.*differ at byte 0/)
  })

  // The length branch is the one a real corruption reaches first (round 2 measured the
  // CLI test's own failure as `chall-data is 4 bytes, payload was 11278`), and it was
  // the one branch nothing pinned: deleting it left the suite green and a truncated
  // payload shipping with exit 0.
  it('reports both lengths when the section is shorter than the payload', () => {
    const wasm = injectCustomSection(header, 'chall-data', payloadBlob.slice(0, 3))
    expect(() => assertPayloadIntact(wasm, payloadBlob, 'runtime.wasm'))
      .toThrow(/payload integrity check failed — chall-data is 3 bytes, payload was 7$/)
  })

  it('returns quietly when the section bytes equal the payload', () => {
    const wasm = injectCustomSection(header, 'chall-data', payloadBlob)
    expect(() => assertPayloadIntact(wasm, payloadBlob, 'runtime.wasm')).not.toThrow()
  })
})

describe('wasmMutate — the output file always exists', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `keygen-mutate-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // `toolExists` shells out to `which`; an empty PATH makes `which` itself
  // unresolvable, which is the same "not found" the function reports for a
  // missing wasm-tools. The warning goes through console.warn (stderr).
  it('copies the input to the output and warns when wasm-tools is not on PATH', () => {
    const input = join(tmpDir, 'in.wasm')
    const output = join(tmpDir, 'out.wasm')
    const bytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x00, 0x05, 0x04, 0x6e, 0x61, 0x6d, 0x65])
    writeFileSync(input, bytes)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const savedPath = process.env.PATH
    process.env.PATH = tmpDir
    let warned: string
    try {
      wasmMutate(input, output, 12345)
    } finally {
      process.env.PATH = savedPath
      // Read the calls before restoring: mockRestore clears them.
      warned = warn.mock.calls.flat().join('\n')
      warn.mockRestore()
    }
    expect(existsSync(output)).toBe(true)
    expect(Buffer.from(readFileSync(output))).toEqual(Buffer.from(bytes))
    expect(warned).toMatch(/skipping wasm-mutate/)
  })
})

// ─── The integrity gate, end to end ─────────────────────────────────────────
// A wasm-tools stand-in whose `mutate` appends a bogus `chall-data` section makes the
// real pipeline produce a module whose first `chall-data` is not the payload. The
// pipeline has to refuse it, say which challenge died (a batch run of six leaves the
// author guessing otherwise), leave the frontmatter alone, and — round 2 of review —
// leave the previously published runtime.wasm alone too: the first version wrote to
// platform/public before verifying and overwrote a healthy module with the corrupt one.
//
// Only `mutate` is faked. Every other subcommand (`strip`, used to stage the template)
// is delegated to the real wasm-tools when one is installed, so the shared
// `.vitepress/wasm/template.wasm` this run re-stages is the same stripped module a
// normal run produces. Without a real wasm-tools the shim copies instead.
describe('keygen aborts, names the slug, and leaves challenge.yaml and the published module alone when the built module fails the payload check', () => {
  let repoRoot: string
  const slug = 'door-is-open'
  let mdPath: string
  let wasmPath: string
  let shimDir: string

  function realWasmTools(): string | null {
    try {
      return execFileSync('which', ['wasm-tools'], { encoding: 'utf-8' }).trim() || null
    } catch {
      return null
    }
  }

  beforeEach(() => {
    // The real repo's door-is-open, on a copy: this run re-stages template.wasm and keys
    // the challenge, and no test may write into the live tree.
    repoRoot = copyRepoForKeygen()
    mdPath = resolve(repoRoot, 'platform', 'challenge', slug, 'challenge.yaml')
    wasmPath = resolve(repoRoot, 'platform', 'public', 'challenge', slug, 'runtime.wasm')
    // A healthy published module to protect: CI keys every challenge before the tests
    // run, but a fresh clone has none.
    if (!existsSync(wasmPath)) {
      const r = spawnSync('pnpm', ['challenge:keygen', '--force', slug], { cwd: repoRoot, encoding: 'utf-8' })
      expect(r.status).toBe(0)
    }
    shimDir = resolve(tmpdir(), `keygen-shim-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(shimDir, { recursive: true })
    const real = realWasmTools()
    // `mutate` copies input to `-o` and appends a 4-byte `chall-data` custom section
    // (id 0, size 15, name length 10, name, DE AD BE EF). Anything else goes to the
    // real binary when there is one, else copies.
    writeFileSync(
      join(shimDir, 'wasm-tools'),
      [
        '#!/bin/sh',
        'if [ "$1" != "mutate" ]; then',
        real ? `  exec "${real}" "$@"` : '  cmd=$1; shift; in=$1; out=""; while [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then out=$2; fi; shift; done; [ -n "$out" ] && cp "$in" "$out"; exit 0',
        'fi',
        'shift; in=$1; out=""',
        'while [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then out=$2; fi; shift; done',
        '[ -n "$out" ] || exit 0',
        'cp "$in" "$out"',
        'printf \'\\0\\017\\012chall-data\\336\\255\\276\\357\' >> "$out"',
        '',
      ].join('\n'),
      { mode: 0o755 },
    )
  })

  afterEach(() => {
    rmSync(shimDir, { recursive: true, force: true })
    // Re-key the challenge with a real run so the local tree is left exactly as a
    // normal keygen leaves it. The restore is asserted: a silent failure here would
    // leave the author's door-is-open unloadable with a clean git status.
    const r = spawnSync('pnpm', ['challenge:keygen', '--force', slug], { cwd: repoRoot, encoding: 'utf-8' })
    rmSync(repoRoot, { recursive: true, force: true })
    expect(r.status).toBe(0)
  })

  // The challenge.yaml check compares mtimes, not only bytes: a shipped challenge already
  // carries `wasmModule` and no legacy fields, so a rewrite would be byte-identical and
  // a content comparison could not tell "not written" from "written unchanged".
  // Measured in round 2: moving the frontmatter write above the integrity check left a
  // content-only assertion green.
  it('exits non-zero with [slug] and "payload integrity", leaving challenge.yaml and runtime.wasm untouched', () => {
    const mdBefore = readFileSync(mdPath, 'utf-8')
    const mdMtime = statSync(mdPath).mtimeMs
    const wasmBefore = readFileSync(wasmPath)
    const wasmMtime = statSync(wasmPath).mtimeMs
    const r = spawnSync('pnpm', ['challenge:keygen', '--force', slug], {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${shimDir}:${process.env.PATH ?? ''}` },
    })
    const output = `${r.stdout ?? ''}${r.stderr ?? ''}`
    expect(r.status).not.toBe(0)
    expect(output).toMatch(/\[door-is-open\] runtime\.wasm: payload integrity check failed — chall-data is 4 bytes, payload was \d+/)
    expect(readFileSync(mdPath, 'utf-8')).toBe(mdBefore)
    expect(statSync(mdPath).mtimeMs).toBe(mdMtime)
    expect(Buffer.from(readFileSync(wasmPath))).toEqual(Buffer.from(wasmBefore))
    expect(statSync(wasmPath).mtimeMs).toBe(wasmMtime)
  }, 120_000)
})

// ─── The CLI on a fixture tree (T-0077 wave 5c: Y52-Y61, Y107, B38 keygen half) ─────────────
//
// Y-q2: a temp copy of the tooling only (package.json, scripts/, .vitepress/, node_modules
// linked), with NO platform/ and no range.json; every case writes the tree it needs, and
// afterEach clears both. The CLI derives its root from its own location, so nothing here can
// touch the live repository.

const FIXTURE_FLAG = 'FLAG{fixture_0000aaaa}'
const FIXTURE_DECLARATION = [
  'number: 1',
  'backend: flask',
  'app: app.py',
  'packages: [ flask ]',
  'source_visible: false',
  '',
].join('\n')

function copyToolingForKeygen(): string {
  const copy = mkdtempSync(join(realpathSync(tmpdir()), 'wxl-keygen-fixture-'))
  const skip = [resolve(LIVE_ROOT, '.vitepress', 'dist'), resolve(LIVE_ROOT, '.vitepress', 'cache')]
  for (const rel of ['package.json', 'scripts', '.vitepress']) {
    cpSync(resolve(LIVE_ROOT, rel), resolve(copy, rel), {
      recursive: true,
      filter: (src) => !skip.some((d) => src === d || src.startsWith(`${d}/`)),
    })
  }
  symlinkSync(resolve(LIVE_ROOT, 'node_modules'), resolve(copy, 'node_modules'), 'dir')
  return copy
}

describe('challenge-keygen CLI on a fixture tree (temp copy)', () => {
  let root: string
  beforeAll(() => {
    root = copyToolingForKeygen()
  })
  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })
  afterEach(() => {
    rmSync(resolve(root, 'platform'), { recursive: true, force: true })
    rmSync(resolve(root, 'range.json'), { recursive: true, force: true })
  })

  const declPath = (slug: string) => resolve(root, 'platform', 'challenge', slug, 'challenge.yaml')
  const publishedWasm = (slug: string) => resolve(root, 'platform', 'public', 'challenge', slug, 'runtime.wasm')

  /** `platform/<P>/index.md`: the primary locale's home page, which the layout check expects. */
  function writeHome(locale = 'zh-TW'): void {
    mkdirSync(resolve(root, 'platform', locale), { recursive: true })
    writeFileSync(resolve(root, 'platform', locale, 'index.md'), '---\ntitle: Home\n---\n\nhome\n')
  }

  function writeChallenge(slug: string, declaration = FIXTURE_DECLARATION, flag = FIXTURE_FLAG): void {
    const dir = resolve(root, 'platform', 'challenge', slug)
    mkdirSync(resolve(dir, 'src'), { recursive: true })
    writeFileSync(resolve(dir, 'challenge.yaml'), declaration)
    writeFileSync(resolve(dir, 'src', 'app.py'), 'from flask import Flask\n')
    writeFileSync(resolve(dir, 'src', 'flag.txt'), `${flag}\n`)
  }

  function writeBrief(slug: string, locale: string, title = 'Brief'): void {
    const dir = resolve(root, 'platform', locale, 'challenge', slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, 'index.md'), `---\ntitle: ${title}\nlayout: challenge\n---\n\nbody\n`)
  }

  function run(args: string[] = []): { status: number; stdout: string; stderr: string; output: string } {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/challenge-keygen.ts', ...args], {
      cwd: root,
      encoding: 'utf-8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    })
    const stdout = r.stdout ?? ''
    const stderr = r.stderr ?? ''
    return { status: r.status ?? -1, stdout, stderr, output: `${stdout}${stderr}` }
  }

  // Y52: a folder without challenge.yaml is not a challenge.
  it('Y52 (a): without a slug, processes the folder that has a challenge.yaml and ignores one that has only src/', () => {
    writeHome()
    writeChallenge('good')
    mkdirSync(resolve(root, 'platform', 'challenge', 'bare', 'src'), { recursive: true })
    writeFileSync(resolve(root, 'platform', 'challenge', 'bare', 'src', 'app.py'), 'x = 1\n')
    const r = run()
    expect(r.status).toBe(0)
    expect(r.output).toMatch(/\[done\] {2}good/)
    expect(r.output).not.toContain('bare')
    expect(existsSync(resolve(root, 'platform', 'public', 'challenge', 'bare'))).toBe(false)
  }, 120_000)

  it('Y52 (b): naming the folder that has only src/ is "Challenge not found"', () => {
    writeHome()
    writeChallenge('good')
    mkdirSync(resolve(root, 'platform', 'challenge', 'bare', 'src'), { recursive: true })
    const r = run(['bare'])
    expect(r.status).toBe(1)
    expect(r.output).toContain('Challenge not found: bare')
    expect(r.output).not.toMatch(/\[(done|skip|stale)\]/)
  }, 60_000)

  // Y53: nothing to process.
  it('Y53 (a): an empty platform/challenge/ is "No challenge files found"', () => {
    writeHome()
    mkdirSync(resolve(root, 'platform', 'challenge'), { recursive: true })
    const r = run()
    expect(r.status).toBe(1)
    expect(r.output).toContain('No challenge files found')
  }, 60_000)

  it('Y53 (b): a folder with only src/ is "No challenge files found"', () => {
    writeHome()
    mkdirSync(resolve(root, 'platform', 'challenge', 'bare', 'src'), { recursive: true })
    const r = run()
    expect(r.status).toBe(1)
    expect(r.output).toContain('No challenge files found')
  }, 60_000)

  // Y20 (keygen half): the five legacy keys are warned about, by name, and removed.
  const LEGACY_KEYS = ['fs', 'fs_key', 'fsKeyParts', 'encryptedFs', 'flag_verifier'] as const
  const LEGACY_DECLARATION = [
    'number: 1',
    'backend: flask',
    'app: app.py',
    'packages: [ flask ]',
    'source_visible: false',
    'fs:',
    '  /x.txt: x.txt',
    'fs_key: abc',
    'fsKeyParts: [ a, b ]',
    'encryptedFs: abc',
    'flag_verifier: abc',
    '',
  ].join('\n')

  it.each(LEGACY_KEYS)('Y20 (keygen): the legacy key %s gets one exact warning and is removed from challenge.yaml', (key) => {
    writeHome()
    writeChallenge('legacy', LEGACY_DECLARATION)
    const r = run(['legacy'])
    expect(r.status).toBe(0)
    expect(r.output.split('\n')).toContain(`[warn] legacy: deprecated field '${key}' found — will be removed`)
    const after = parseDocument(readFileSync(declPath('legacy'), 'utf-8')).toJSON() as Record<string, unknown>
    expect(Object.keys(after)).not.toContain(key)
  }, 120_000)

  // Y54: one rebuild writes back a line-preserving result (D79, R15's twin).
  it('Y54: the rebuild drops only the legacy key lines, appends wasmModule, and touches no brief', () => {
    const lines = [
      '# header comment',
      'backend: flask # trailing comment',
      'number: 1',
      'app: app.py',
      'fs_key: abc',
      'packages: [ flask ]',
      'fs:',
      '  /x.txt: x.txt',
      'source_visible: false',
      'tags: [ alpha-tag, bravo-tag, charlie-tag, delta-tag, echo-tag, foxtrot-tag, golf-tag, hotel-tag ]',
    ]
    const declaration = `${lines.join('\n')}\n`
    // The fixture must itself be a fixed point of the writer, or a difference below could be
    // the fixture's formatting and not keygen's behaviour.
    expect(parseDocument(declaration).toString({ lineWidth: 0 })).toBe(declaration)
    writeHome('zh-TW')
    writeChallenge('keep', declaration)
    writeBrief('keep', 'zh-TW')
    writeBrief('keep', 'en')
    const briefs = ['zh-TW', 'en'].map((l) => resolve(root, 'platform', l, 'challenge', 'keep', 'index.md'))
    const before = briefs.map((b) => ({ bytes: readFileSync(b), mtime: statSync(b).mtimeMs }))
    const r = run(['keep'])
    expect(r.status).toBe(0)
    const expected = [
      ...lines.filter((l) => !['fs_key: abc', 'fs:', '  /x.txt: x.txt'].includes(l)),
      'wasmModule: /challenge/keep/runtime.wasm',
    ]
    expect(readFileSync(declPath('keep'), 'utf-8').split('\n')).toEqual([...expected, ''])
    briefs.forEach((b, i) => {
      expect(readFileSync(b)).toEqual(before[i].bytes)
      expect(statSync(b).mtimeMs).toBe(before[i].mtime)
    })
  }, 120_000)

  // Y21 (keygen half): no optional key is required.
  it('Y21 (keygen): a declaration with only number, backend and app builds, with default flag file and metadata', async () => {
    writeHome()
    writeChallenge('minimal', ['number: 1', 'backend: flask', 'app: app.py', ''].join('\n'))
    const r = run(['minimal'])
    expect(r.status).toBe(0)
    expect(r.output).toMatch(/\[done\] {2}minimal/)
    expect(r.output).not.toContain('flag file not found')
    const wasm = new Uint8Array(readFileSync(publishedWasm('minimal')))
    const payload = parsePayload(extractCustomSection(wasm, 'chall-data')!)
    expect(Buffer.from(payload.verifier)).toEqual(Buffer.from(await deriveFlagVerifier(`${FIXTURE_FLAG}\n`, 'minimal')))
    expect(JSON.parse(new TextDecoder().decode(payload.metadata))).toEqual({ backend: 'flask', source_visible: false, packages: [] })
    expect(payload.entries.map((e) => e.path)).not.toContain('__source__')
  }, 120_000)

  // Y56 (D80 (a)): identical content is not written, so the file's mtime is not moved.
  it('Y56: a rebuild whose write-back would be byte-identical leaves challenge.yaml unwritten', () => {
    const declaration = `${FIXTURE_DECLARATION}wasmModule: /challenge/same/runtime.wasm\n`
    writeHome()
    writeChallenge('same', declaration)
    const past = new Date('2020-01-01T00:00:00Z')
    utimesSync(declPath('same'), past, past)
    const mtime = statSync(declPath('same')).mtimeMs
    const r = run(['--force', 'same'])
    expect(r.status).toBe(0)
    expect(r.output).toMatch(/\[done\] {2}same/)
    expect(readFileSync(declPath('same'), 'utf-8')).toBe(declaration)
    expect(statSync(declPath('same')).mtimeMs).toBe(mtime)
  }, 120_000)

  // Y58 (D80 (b), D133): a run that just rebuilt is followed by a run that skips.
  it.each([
    ['(a) the declaration has no wasmModule yet', FIXTURE_DECLARATION],
    ['(b) the declaration already has wasmModule', `${FIXTURE_DECLARATION}wasmModule: /challenge/again/runtime.wasm\n`],
  ])('Y58 %s: the run right after a rebuild reports [skip], not [stale] or [done]', (_label, declaration) => {
    writeHome()
    writeChallenge('again', declaration)
    const first = run(['again'])
    expect(first.status).toBe(0)
    expect(first.output).toMatch(/\[done\] {2}again/)
    const second = run(['again'])
    expect(second.status).toBe(0)
    expect(second.output).toContain('[skip] again')
    expect(second.output).not.toContain('[stale]')
    expect(second.output).not.toMatch(/\[done\]/)
  }, 120_000)

  // Y57 (CLI half): which files make the next run [stale], and which never do.
  const FUTURE = new Date(Date.now() + 60 * 60 * 1000)
  it.each([
    ['(a) the en brief', 'skip', (slug: string) => resolve(root, 'platform', 'en', 'challenge', slug, 'index.md')],
    ['(a) the zh-TW brief', 'skip', (slug: string) => resolve(root, 'platform', 'zh-TW', 'challenge', slug, 'index.md')],
    ['(b) challenge.yaml', 'stale', (slug: string) => declPath(slug)],
    ['(c) a src/ file', 'stale', (slug: string) => resolve(root, 'platform', 'challenge', slug, 'src', 'app.py')],
    ['(d) src/.fsignore', 'stale', (slug: string) => resolve(root, 'platform', 'challenge', slug, 'src', '.fsignore')],
    ['(e) the template module', 'stale', () => resolve(root, '.vitepress', 'wasm', 'virtual-fs', 'virtual_fs_bg.wasm')],
  ] as const)('Y57 %s newer than the module gives [%s]', (_label, expected, target) => {
    const slug = 'tracked'
    writeHome()
    writeChallenge(slug)
    writeFileSync(resolve(root, 'platform', 'challenge', slug, 'src', '.fsignore'), '*.log\n')
    writeBrief(slug, 'en')
    writeBrief(slug, 'zh-TW')
    expect(run([slug]).output).toMatch(/\[done\] {2}tracked/)
    const path = target(slug)
    const original = statSync(path).mtime
    utimesSync(path, FUTURE, FUTURE)
    try {
      const r = run([slug])
      expect(r.status).toBe(0)
      if (expected === 'skip') {
        expect(r.output).toContain('[skip] tracked')
        expect(r.output).not.toContain('[stale]')
      } else {
        expect(r.output).toContain('[stale] tracked')
      }
    } finally {
      utimesSync(path, original, original)
    }
  }, 120_000)

  // B38 (keygen half; D19): the old layout is named by the layout check before any challenge is touched.
  const PL_E08_FIRST_LINE =
    'PL-E08: these pages are outside the locale folders. Every page lives in platform/<locale>/ for a locale on the locale list (en, zh-TW); a range on the old layout moves its pages as README.en.md describes in "Moving to the locale folders" (README.md: 「搬到語系資料夾」):'

  function snapshotPlatform(): string[] {
    return readdirSync(resolve(root, 'platform'), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => {
        const path = resolve(d.parentPath, d.name)
        return `${path}|${statSync(path).size}|${statSync(path).mtimeMs}`
      })
      .sort()
  }

  // Y60 (D81): a flat platform/challenge/<slug>.md is no challenge; keygen neither reads nor mentions it.
  const OLD_FLAT = '---\ntitle: Old\nbackend: flask\napp: app.py\n---\n\nold\n'
  function writeOldFlat(): string {
    const path = resolve(root, 'platform', 'challenge', 'old.md')
    writeFileSync(path, OLD_FLAT)
    return path
  }

  // Since the layout check (B38) a flat .md under platform/challenge/ ends the run as PL-E08 (Y-q4);
  // the case keeps its Y60 claim: keygen still neither warns about nor reads the flat file.
  it('Y60 (i): a flat old.md beside good/ ends the run as PL-E08 with no flat warning, no output line and no write', () => {
    writeHome()
    writeChallenge('good')
    const flat = writeOldFlat()
    const before = snapshotPlatform()
    const r = run()
    expect(r.status).not.toBe(0)
    expect(r.stderr.split('\n').slice(0, 2)).toEqual([PL_E08_FIRST_LINE, '  "platform/challenge/old.md"'])
    expect(r.output).not.toContain('legacy flat file structure')
    expect(r.output.split('\n').filter((l) => /^\[(skip|done|warn|stale)\]/.test(l))).toEqual([])
    expect(readFileSync(flat, 'utf-8')).toBe(OLD_FLAT)
    expect(snapshotPlatform()).toEqual(before)
    expect(existsSync(resolve(root, 'platform', 'public', 'challenge', 'old'))).toBe(false)
  }, 120_000)

  // Y-q4's long-term proof, at the function: the slugs keygen takes are the folders only.
  it('Y60 (ii): keygenSlugs returns [good] for the tree, and [] when the flat slug is named', () => {
    writeHome()
    writeChallenge('good')
    writeOldFlat()
    expect(keygenSlugs(root)).toEqual(['good'])
    expect(keygenSlugs(root, 'old')).toEqual([])
  })

  // Y107 (D123): range.json is read before anything else; without it, or with primaryLocale en, the run works.
  const rangeJson = () => resolve(root, 'range.json')

  it('Y107 (a): with no range.json the run builds', () => {
    writeHome('zh-TW')
    writeChallenge('rj')
    const r = run(['rj'])
    expect(r.status).toBe(0)
    expect(r.output).toMatch(/\[done\] {2}rj/)
  }, 120_000)

  it('Y107 (b): with {"primaryLocale":"en"} and the home page in platform/en/ the run builds', () => {
    writeFileSync(rangeJson(), '{"primaryLocale":"en"}')
    writeHome('en')
    writeChallenge('rj')
    const r = run(['rj'])
    expect(r.status).toBe(0)
    expect(r.output).toMatch(/\[done\] {2}rj/)
  }, 120_000)

  // Messages as in 5a's Y36 table (the text is `.vitepress/primary-locale.ts`'s own).
  const RANGE_FAULTS: Array<[string, (path: string) => void, string]> = [
    ['PL-E01 range.json is a folder', (p) => mkdirSync(p), 'PL-E01: range.json is not a regular file; the build reads "primaryLocale" from range.json at the repository root and does not follow a symbolic link.'],
    ['PL-E03 not valid JSON', (p) => writeFileSync(p, '{'), 'PL-E03: range.json is not valid JSON.'],
    ['PL-E04 not an object', (p) => writeFileSync(p, '[]'), 'PL-E04: range.json does not hold a JSON object.'],
    ['PL-E05 not a string', (p) => writeFileSync(p, '{"primaryLocale":7}'), 'PL-E05: "primaryLocale" in range.json is not a string: 7.'],
    ['PL-E06 not on the list', (p) => writeFileSync(p, '{"primaryLocale":"ja"}'), 'PL-E06: "primaryLocale" in range.json is "ja", which is not on the locale list: en, zh-TW.'],
  ]
  const E02: [string, (path: string) => void, string] = [
    'PL-E02 mode 000',
    (p) => { writeFileSync(p, '{}'); chmodSync(p, 0o000) },
    'PL-E02: range.json could not be read (EACCES).',
  ]

  function expectStoppedBeforeAnyWork(r: ReturnType<typeof run>, firstLine: string): void {
    expect(r.status).toBe(1)
    expect(r.stderr.split('\n')[0]).toBe(firstLine)
    expect(r.output).not.toMatch(/\[(skip|done|stale)\]/)
    expect(existsSync(publishedWasm('rj'))).toBe(false)
  }

  it.each(RANGE_FAULTS)('Y107 (c): %s stops the run before it builds or writes anything', (_label, make, line) => {
    writeHome()
    writeChallenge('rj')
    make(rangeJson())
    const bytes = readFileSync(declPath('rj'))
    const mtime = statSync(declPath('rj')).mtimeMs
    expectStoppedBeforeAnyWork(run(['rj']), line)
    expect(readFileSync(declPath('rj'))).toEqual(bytes)
    expect(statSync(declPath('rj')).mtimeMs).toBe(mtime)
  }, 60_000)

  it.skipIf(platform() === 'win32' || process.getuid?.() === 0)('Y107 (c): PL-E02 mode 000 stops the run before it builds or writes anything', () => {
    writeHome()
    writeChallenge('rj')
    E02[1](rangeJson())
    const bytes = readFileSync(declPath('rj'))
    const mtime = statSync(declPath('rj')).mtimeMs
    expectStoppedBeforeAnyWork(run(['rj']), E02[2])
    expect(readFileSync(declPath('rj'))).toEqual(bytes)
    expect(statSync(declPath('rj')).mtimeMs).toBe(mtime)
  }, 60_000)

  function writeOldLayout(): void {
    writeHome()
    writeChallenge('good')
    writeFileSync(resolve(root, 'platform', 'index.md'), '---\ntitle: Old home\n---\n')
    mkdirSync(resolve(root, 'platform', 'guide'), { recursive: true })
    writeFileSync(resolve(root, 'platform', 'guide', 'x.md'), '---\ntitle: X\n---\n')
  }

  it('B38 (keygen) (1): a page outside the locale folders is PL-E08 before any challenge is processed', () => {
    writeOldLayout()
    const before = snapshotPlatform()
    const r = run()
    expect(r.status).not.toBe(0)
    expect(r.stderr.split('\n').slice(0, 3)).toEqual([PL_E08_FIRST_LINE, '  "platform/guide/x.md"', '  "platform/index.md"'])
    expect(r.output).not.toMatch(/\[(skip|done|stale)\]/)
    expect(snapshotPlatform()).toEqual(before)
    expect(existsSync(publishedWasm('good'))).toBe(false)
  }, 60_000)

  it('B38 (keygen) (2): on the old layout a broken range.json is reported first, as PL-E03 and not PL-E08', () => {
    writeOldLayout()
    writeFileSync(rangeJson(), '{')
    const r = run()
    expect(r.status).toBe(1)
    expect(r.stderr.split('\n')[0]).toBe('PL-E03: range.json is not valid JSON.')
  }, 60_000)

})

// ─── Y55 (D124, upstream only): --force over upstream's four challenges changes no byte ───────
//
// Hand-typed from traceability.md Y-§2.4, not re-read from disk: a test that compared the files
// with themselves could not see keygen rewriting them. Not moved to V-Y5: the test never calls
// wasm-pack, it needs only the built `virtual_fs_bg.wasm`, as the Y61 and Y59 cases above do.

const UPSTREAM_DECLARATIONS: Record<string, string> = {
  'door-is-open': [
    'number: 1',
    'difficulty: easy',
    'category: web',
    'backend: fastapi',
    'app: app.py',
    'packages: []',
    'tools: [ browser, network, repeater, code ]',
    'source_visible: false',
    'date: 2026-04-02T08:54:17.674Z',
    'tags: [ idor, access-control, fastapi, sqlite ]',
    'wasmModule: /challenge/door-is-open/runtime.wasm',
    '',
  ].join('\n'),
  'staff-only': [
    'number: 2',
    'difficulty: easy',
    'category: web',
    'backend: flask',
    'app: app.py',
    'packages: [ flask ]',
    'tools: [ browser, network, repeater, code ]',
    'source_visible: false',
    'date: 2026-08-17T16:21:14.557Z',
    'tags: [ sql, injection, flask, sqlite ]',
    'wasmModule: /challenge/staff-only/runtime.wasm',
    '',
  ].join('\n'),
  'just-a-preview': [
    'number: 8',
    'difficulty: easy',
    'category: web',
    'backend: fastapi',
    'app: app.py',
    'packages: []',
    'tools: [ browser, network, repeater, code ]',
    'source_visible: true',
    'source_files: [ /templates/layout.html, /templates/index.html, /templates/detail.html, /templates/preview.html, /templates/_editor.html, /templates/missing.html, /static/app.css ]',
    'date: 2026-09-06T09:23:32.337Z',
    'tags: [ ssti, template-injection, jinja2, fastapi ]',
    'wasmModule: /challenge/just-a-preview/runtime.wasm',
    '',
  ].join('\n'),
  'selected-excerpts': [
    'number: 10',
    'difficulty: medium',
    'category: web',
    'backend: flask',
    'app: app.py',
    'packages: [ flask ]',
    'tools: [ browser, network, repeater, code ]',
    'source_visible: true',
    'source_files: [ /workspace.py, /revisions.py, /course_pack.py, /templates/base.html, /templates/workbench.html, /templates/article.html, /templates/preview.html, /templates/course-pack.html, /templates/missing.html, /static/app.css ]',
    'date: 2026-09-13T13:28:46.765Z',
    'tags: [ idor, access-control, ssti, template-injection, jinja2, flask ]',
    'wasmModule: /challenge/selected-excerpts/runtime.wasm',
    '',
  ].join('\n'),
}

describe.skipIf(
  upstreamOnlySkipReason(process.env.GITHUB_REPOSITORY, readManifest(LIVE_ROOT), isGitWorkTree(LIVE_ROOT), hasRootRangeJson(LIVE_ROOT)),
)('challenge-keygen --force over upstream\'s four challenges (Y55, upstream only)', () => {
  let copy: string
  beforeAll(() => {
    copy = copyRepoForKeygen()
  })
  afterAll(() => {
    rmSync(copy, { recursive: true, force: true })
  })

  it('exits 0 and leaves each challenge.yaml byte-for-byte equal to the Y-§2.4 text', () => {
    const r = spawnSync('pnpm', ['challenge:keygen', '--force'], { cwd: copy, encoding: 'utf-8' })
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(0)
    for (const [slug, text] of Object.entries(UPSTREAM_DECLARATIONS)) {
      expect(readFileSync(resolve(copy, 'platform', 'challenge', slug, 'challenge.yaml'), 'utf-8'), slug).toBe(text)
    }
  }, 180_000)
})
