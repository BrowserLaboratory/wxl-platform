import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, rmSync, statSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
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
  aesGcmEncryptRaw,
  planDisplaySource,
  wasmMutate,
  assertPayloadIntact,
  buildChallengeWasm,
  type ChallengePayload,
} from '../../../scripts/challenge-keygen'
import { extractCustomSection } from '../../../.vitepress/theme/composables/useWasmLoader'

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

  it('includes the challenge markdown file', () => {
    // Set up a per-folder challenge structure
    const challDir = join(tmpDir, 'platform', 'challenge', 'test-chall')
    const srcDir = join(challDir, 'src')
    mkdirSync(srcDir, { recursive: true })

    const mdPath = join(challDir, 'index.md')
    writeFileSync(mdPath, '---\ntitle: Test\napp: app.py\nbackend: flask\n---\nContent')
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

    const mdPath = join(challDir, 'index.md')
    writeFileSync(mdPath, '---\ntitle: Test\napp: app.py\nbackend: flask\n---\nContent')
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

    const mdPath = join(challDir, 'index.md')
    writeFileSync(mdPath, '---\ntitle: Test\napp: app.py\nbackend: flask\n---\nContent')
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

    const mdPath = join(challDir, 'index.md')
    writeFileSync(mdPath, '---\ntitle: Test\napp: app.py\nbackend: flask\n---\nContent')
    writeFileSync(join(srcDir, 'app.py'), 'print("hello")')
    writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test}')
    writeFileSync(join(srcDir, '.fsignore'), '*.log')

    const templatePath = join(tmpDir, 'template.wasm')
    writeFileSync(templatePath, 'fake-wasm')

    const paths = getTrackedInputPaths(mdPath, templatePath)
    expect(paths).toContain(join(srcDir, '.fsignore'))
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

describe('challenge-keygen CLI rejects an unusable source_files entry', () => {
  const repoRoot = resolve(__dirname, '../../..')
  const slug = 'keygen-source-files-probe'
  const challengeDir = resolve(repoRoot, 'platform', 'challenge', slug)

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
    writeFileSync(
      resolve(dir, 'index.md'),
      [
        '---',
        `title: Probe`,
        'layout: challenge',
        'backend: flask',
        'app: app.py',
        'packages: [ flask ]',
        `source_visible: ${sourceVisible}`,
        `source_files: ${sourceFiles}`,
        '---',
        '',
        'probe',
        '',
      ].join('\n'),
    )
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
describe('keygen aborts, names the slug, and leaves frontmatter and the published module alone when the built module fails the payload check', () => {
  const repoRoot = resolve(__dirname, '../../../')
  const slug = 'door-is-open'
  const mdPath = resolve(repoRoot, 'platform', 'challenge', slug, 'index.md')
  const wasmPath = resolve(repoRoot, 'platform', 'public', 'challenge', slug, 'runtime.wasm')
  let shimDir: string

  function realWasmTools(): string | null {
    try {
      return execFileSync('which', ['wasm-tools'], { encoding: 'utf-8' }).trim() || null
    } catch {
      return null
    }
  }

  beforeEach(() => {
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
    expect(r.status).toBe(0)
  })

  // The frontmatter check compares mtimes, not only bytes: a shipped challenge already
  // carries `wasmModule` and no legacy fields, so a rewrite would be byte-identical and
  // a content comparison could not tell "not written" from "written unchanged".
  // Measured in round 2: moving the frontmatter write above the integrity check left a
  // content-only assertion green.
  it('exits non-zero with [slug] and "payload integrity", leaving index.md and runtime.wasm untouched', () => {
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

