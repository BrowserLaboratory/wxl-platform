/**
 * challenge-keygen.ts
 *
 * Build-time pipeline for per-challenge WASM payload generation:
 *   1. Reads challenge markdown frontmatter (title, backend, app, fs, etc.)
 *   2. Generates a random per-challenge AES-256 key (32 bytes)
 *   3. Encrypts all FS entries with AES-GCM-256 → raw bytes (iv || ct || tag)
 *   4. Derives flag_verifier (PBKDF2-HMAC-SHA256, 100k iterations)
 *   5. XOR-encodes the key with 3 compile-time masks (matching Rust key_derive.rs)
 *   6. Packs everything into a binary blob (matching Rust payload.rs format)
 *   7. Injects the blob into a copy of template.wasm as "chall-data" custom section
 *   8. Updates frontmatter with wasmModule path, removes legacy fields
 *
 * Usage:
 *   pnpm challenge:keygen [slug]          # process one challenge
 *   pnpm challenge:keygen                 # process all challenges
 *   pnpm challenge:keygen --force [slug]  # re-key even if already processed
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync, copyFileSync, statSync, renameSync, rmSync } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { parseDocument } from 'yaml'
import { scanSrcDirectory } from './challenge-utils.ts'
import { parseFsIgnore } from './fsignore.ts'
import { buildDisplayBundle, SOURCE_DISPLAY_KEY } from './challenge-source-display.ts'
import { APP_KEY } from '../.vitepress/challenge/reserved-keys.ts'
import { extractCustomSection } from '../.vitepress/theme/composables/useWasmLoader.ts'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FsEntry {
  path: string
  data: Uint8Array
}

export interface ChallengePayload {
  slug: string
  keyMaterial: Uint8Array
  verifier: Uint8Array
  entries: FsEntry[]
  metadata: Uint8Array
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAGIC = new Uint8Array([0x43, 0x48, 0x57, 0x44]) // "CHWD"
const VERSION = 1

// XOR masks matching Rust key_derive.rs compile-time constants
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

// ─── Payload binary format (matching Rust payload.rs) ───────────────────────

export function serializePayload(payload: ChallengePayload): Uint8Array {
  const parts: Uint8Array[] = []

  // Magic + version
  parts.push(MAGIC)
  parts.push(new Uint8Array([VERSION]))

  // Slug (u16 LE length-prefixed)
  const slugBytes = new TextEncoder().encode(payload.slug)
  parts.push(u16le(slugBytes.length))
  parts.push(slugBytes)

  // Key material (u16 LE length-prefixed)
  parts.push(u16le(payload.keyMaterial.length))
  parts.push(payload.keyMaterial)

  // Verifier (u16 LE length-prefixed)
  parts.push(u16le(payload.verifier.length))
  parts.push(payload.verifier)

  // Entries
  parts.push(u16le(payload.entries.length))
  for (const entry of payload.entries) {
    const pathBytes = new TextEncoder().encode(entry.path)
    parts.push(u16le(pathBytes.length))
    parts.push(pathBytes)
    parts.push(u32le(entry.data.length))
    parts.push(entry.data)
  }

  // Metadata (u16 LE length-prefixed)
  parts.push(u16le(payload.metadata.length))
  parts.push(payload.metadata)

  return concat(parts)
}

export function parsePayload(data: Uint8Array): ChallengePayload {
  if (data.length < 5) {
    throw new Error('payload too short')
  }

  let pos = 0

  function readBytes(n: number, field: string): Uint8Array {
    if (pos + n > data.length) throw new Error(`unexpected EOF reading ${field}`)
    const slice = data.slice(pos, pos + n)
    pos += n
    return slice
  }

  function readU16(field: string): number {
    const b = readBytes(2, field)
    return b[0] | (b[1] << 8)
  }

  function readU32(field: string): number {
    const b = readBytes(4, field)
    return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)
  }

  function readLenPrefixedU16(field: string): Uint8Array {
    const len = readU16(field)
    return readBytes(len, field)
  }

  function readStringU16(field: string): string {
    return new TextDecoder().decode(readLenPrefixedU16(field))
  }

  // Magic
  const magic = readBytes(4, 'magic')
  if (magic[0] !== 0x43 || magic[1] !== 0x48 || magic[2] !== 0x57 || magic[3] !== 0x44) {
    throw new Error('invalid magic (expected CHWD)')
  }

  // Version
  const version = readBytes(1, 'version')[0]
  if (version !== VERSION) {
    throw new Error(`unsupported version: ${version}`)
  }

  // Slug
  const slug = readStringU16('slug')

  // Key material
  const keyMaterial = readLenPrefixedU16('key_material')

  // Verifier
  const verifier = readLenPrefixedU16('verifier')

  // Entries
  const entryCount = readU16('entry_count')
  const entries: FsEntry[] = []
  for (let i = 0; i < entryCount; i++) {
    const path = readStringU16('entry_path')
    const dataLen = readU32('entry_data_len')
    const entryData = readBytes(dataLen, 'entry_data')
    entries.push({ path, data: entryData })
  }

  // Metadata
  const metadata = readLenPrefixedU16('metadata')

  return { slug, keyMaterial, verifier, entries, metadata }
}

// ─── XOR key encoding (matching Rust key_derive.rs) ─────────────────────────

export function xorEncodeKey(key: Uint8Array): Uint8Array {
  if (key.length !== 32) {
    throw new Error('key must be 32 bytes')
  }
  const encoded = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    encoded[i] = key[i] ^ MASK_A[i] ^ MASK_B[i] ^ MASK_C[i]
  }
  return encoded
}

// ─── Crypto helpers (Web Crypto, available in Node 18+) ─────────────────────

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n))
}

export async function aesGcmEncryptRaw(keyBytes: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const iv = randomBytes(12)
  const key = await globalThis.crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'],
  )
  const ct = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const combined = new Uint8Array(iv.length + ct.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ct), iv.length)
  return combined
}

export async function deriveFlagVerifier(flag: string, slug: string): Promise<Uint8Array> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(flag.trim()), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(slug), iterations: 100_000 },
    keyMaterial, 256,
  )
  return new Uint8Array(bits)
}

// ─── Binary helpers ─────────────────────────────────────────────────────────

function u16le(value: number): Uint8Array {
  return new Uint8Array([value & 0xFF, (value >> 8) & 0xFF])
}

function u32le(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xFF,
    (value >> 8) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 24) & 0xFF,
  ])
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

// ─── Frontmatter helpers ────────────────────────────────────────────────────

function parseMd(content: string): { fmRaw: string; body: string } | null {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return null
  return { fmRaw: m[1], body: m[2] }
}

// ─── Source freshness detection ──────────────────────────────────────────────

/**
 * Determine whether the output file is stale relative to tracked inputs.
 * Returns true when the output is missing or any existing input has a newer mtime.
 * Non-existent inputs are silently skipped (they contribute no staleness signal).
 */
export function isOutputStale(outputPath: string, inputPaths: string[]): boolean {
  if (!existsSync(outputPath)) return true

  const outputMtime = statSync(outputPath).mtimeMs

  for (const p of inputPaths) {
    if (!existsSync(p)) continue
    if (statSync(p).mtimeMs > outputMtime) return true
  }

  return false
}

/**
 * Collect all file paths that are tracked inputs for a per-folder challenge.
 * The list includes: challenge markdown, template WASM, all scanned src/ files,
 * .fsignore (if present), and the flag file.
 *
 * For legacy flat-file challenges this returns just [mdPath, templateWasmPath].
 */
export function getTrackedInputPaths(mdPath: string, templateWasmPath: string): string[] {
  const paths: string[] = [mdPath, templateWasmPath]

  const filename = basename(mdPath)
  const isPerFolder = filename === 'index.md'
  if (!isPerFolder) return paths

  const baseDir = dirname(mdPath)
  const srcDir = resolve(baseDir, 'src')
  if (!existsSync(srcDir)) return paths

  // Include .fsignore itself as a tracked input
  const fsIgnorePath = resolve(srcDir, '.fsignore')
  if (existsSync(fsIgnorePath)) {
    paths.push(fsIgnorePath)
  }

  // Load .fsignore rules for scanning exclusion
  let isExcluded: ((rel: string, isDir: boolean) => boolean) | undefined
  if (existsSync(fsIgnorePath)) {
    const fsIgnoreContent = readFileSync(fsIgnorePath, 'utf-8')
    isExcluded = parseFsIgnore(fsIgnoreContent)
  }

  // All scanned src/ files (including app and flag)
  const scanned = scanSrcDirectory(srcDir, isExcluded)
  for (const entry of scanned) {
    paths.push(entry.absolutePath)
  }

  return paths
}

// ─── WASM custom section injection ──────────────────────────────────────────

export function injectCustomSection(wasmBinary: Uint8Array, sectionName: string, payload: Uint8Array): Uint8Array {
  // WASM custom section format:
  //   section_id: 0x00 (1 byte)
  //   section_size: LEB128 (variable)
  //   name_len: LEB128 (variable)
  //   name: UTF-8 bytes
  //   data: payload bytes

  const nameBytes = new TextEncoder().encode(sectionName)
  const nameLen = encodeLEB128(nameBytes.length)
  const sectionContent = concat([nameLen, nameBytes, payload])
  const sectionSize = encodeLEB128(sectionContent.length)

  return concat([
    wasmBinary,
    new Uint8Array([0x00]), // custom section id
    sectionSize,
    sectionContent,
  ])
}

function encodeLEB128(value: number): Uint8Array {
  const bytes: number[] = []
  do {
    let byte = value & 0x7F
    value >>>= 7
    if (value !== 0) byte |= 0x80
    bytes.push(byte)
  } while (value !== 0)
  return new Uint8Array(bytes)
}

// ─── Post-build WASM obfuscation pipeline ───────────────────────────────────

function toolExists(name: string): boolean {
  try {
    execFileSync('which', [name], { stdio: 'pipe' })
    return true
  } catch { return false }
}

/** The `--out-dir` of every `wasm-pack build` invocation in `pnpm wasm:build`. */
export const WASM_PACK_OUT_DIRS = [
  '.vitepress/wasm/virtual-fs',
  '.vitepress/wasm/asgi-bridge',
]

/**
 * Where the stripped/optimised template is staged, relative to the repo root.
 *
 * It MUST NOT sit inside a `wasm-pack` output directory. wasm-pack runs its own
 * `wasm-opt -O` over every `.wasm` it finds in `--out-dir`, with no feature
 * flags — so a real module staged there fails the next `pnpm wasm:build` on
 * `reference-types`. This went unnoticed while the staged template was an empty
 * 8-byte module, which that pass accepted.
 */
export function preparedTemplateRelPath(): string {
  return '.vitepress/wasm/template.wasm'
}

/**
 * Fail loudly when a pass has produced something that is not a usable module.
 *
 * Every step of this pipeline exits 0 even when it drops the module's contents,
 * and an empty module is *structurally valid* — `wasm-tools validate` accepts a
 * bare 8-byte header, so the verify gate cannot see it either. Size relative to
 * the input is the only signal that survives. A strip plus an -O4 pass trims a
 * few hundred bytes off a 77 KB template; losing more than half of it means a
 * pass wrote nothing, not that it optimised well.
 */
export function assertUsableWasm(path: string, inputSize: number, label: string): void {
  const bytes = readFileSync(path)
  if (bytes.length < 8 || bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
    throw new Error(`${label}: ${path} is missing the WASM magic — the pass wrote ${bytes.length} bytes`)
  }
  if (bytes.length < inputSize / 2) {
    throw new Error(
      `${label}: ${path} is ${bytes.length} bytes, down from ${inputSize} — the pass discarded the module`,
    )
  }
}

export function prepareTemplateWasm(inputPath: string, outputPath: string): void {
  // Step 1: wasm-strip (remove symbols and debug info)
  // Step 2: wasm-opt -O4 (aggressive optimization, instruction reordering)
  // Both are applied to the template WASM once before per-challenge processing.

  const inputSize = readFileSync(inputPath).length

  if (toolExists('wasm-tools')) {
    // Write to the destination directly. `-o -` does NOT mean stdout: wasm-tools
    // treats "-" as a literal filename, so the module landed in a file called
    // "-" in the working directory while the captured stdout — and therefore
    // the template — was empty.
    execFileSync('wasm-tools', ['strip', inputPath, '-o', outputPath], { maxBuffer: 50 * 1024 * 1024 })
    assertUsableWasm(outputPath, inputSize, 'wasm-strip')
    console.log('[prep]  wasm-strip applied')
  } else {
    copyFileSync(inputPath, outputPath)
    console.warn('[warn]  wasm-tools not found — skipping wasm-strip')
  }

  if (toolExists('wasm-opt')) {
    // `--all-features` is required, not cosmetic: wasm-pack emits reference
    // types and bulk-memory ops, and binaryen's validator rejects the module
    // outright without them. This only ever ran clean before because it was
    // being handed an empty file.
    //
    // Optimisation is best-effort — a binaryen that cannot read a newer rustc's
    // output must not fail the build. Write via a sibling file so that a
    // rejected run leaves the stripped template intact rather than truncated.
    const optimised = `${outputPath}.opt`
    try {
      execFileSync('wasm-opt', ['-O4', '--all-features', outputPath, '-o', optimised],
        { maxBuffer: 50 * 1024 * 1024, stdio: 'pipe' })
      assertUsableWasm(optimised, inputSize, 'wasm-opt')
      renameSync(optimised, outputPath)
      console.log('[prep]  wasm-opt -O4 applied')
    } catch (err) {
      rmSync(optimised, { force: true })
      const detail = err instanceof Error ? err.message.split('\n')[0] : String(err)
      console.warn(`[warn]  wasm-opt failed (${detail}) — keeping the stripped template`)
    }
  } else {
    console.warn('[warn]  wasm-opt not found — skipping optimization')
  }
}

/**
 * Mutate `inputPath` into `outputPath`. The output file always exists afterwards:
 * the mutated module when the pass succeeds, an unchanged copy of the input when
 * wasm-tools is absent, exits non-zero, or writes something `assertUsableWasm`
 * rejects.
 *
 * The input is the *template*, never a file that already carries `chall-data`.
 * `wasm-tools mutate` picks a custom-section mutator for a deterministic subset of
 * seeds (measured with 1.249.0; the counts live in the change's evidence/seed-sweep.txt) and reports success after removing the
 * section; handing it a module that has no section to remove is what makes the
 * order safe, and `assertPayloadIntact` is what proves it after injection.
 */
export function wasmMutate(inputPath: string, outputPath: string, seed: number): void {
  copyFileSync(inputPath, outputPath)
  if (!toolExists('wasm-tools')) {
    console.warn('[warn]  wasm-tools not found — skipping wasm-mutate')
    return
  }

  try {
    execFileSync('wasm-tools', ['mutate', inputPath, '--seed', String(seed), '-o', outputPath], {
      maxBuffer: 50 * 1024 * 1024,
    })
    assertUsableWasm(outputPath, readFileSync(inputPath).length, 'wasm-mutate')
    console.log(`[obfs]  wasm-mutate applied (seed=${seed})`)
  } catch (err) {
    // wasm-mutate can fail on some binaries; treat as non-fatal and keep the input.
    copyFileSync(inputPath, outputPath)
    console.warn(`[warn]  wasm-mutate failed (seed=${seed}), continuing without mutation`)
  }
}

/**
 * Prove that `wasmBytes` carries exactly `payloadBlob` under `chall-data`, using the
 * same parser the page uses so build-time and load-time cannot disagree. Absence or
 * any differing byte throws: a runtime.wasm without its payload is a broken
 * challenge, not a warning.
 */
export function assertPayloadIntact(wasmBytes: Uint8Array, payloadBlob: Uint8Array, label: string): void {
  const section = extractCustomSection(wasmBytes, 'chall-data')
  if (section === null) {
    throw new Error(`${label}: payload integrity check failed — no chall-data section in the written module`)
  }
  if (section.length !== payloadBlob.length) {
    throw new Error(
      `${label}: payload integrity check failed — chall-data is ${section.length} bytes, payload was ${payloadBlob.length}`,
    )
  }
  const firstDiff = section.findIndex((b, i) => b !== payloadBlob[i])
  if (firstDiff !== -1) {
    throw new Error(
      `${label}: payload integrity check failed — chall-data and payload are both ${section.length} bytes but differ at byte ${firstDiff}`,
    )
  }
}

/**
 * Build one challenge's module: mutate a copy of the template, then append the
 * payload. Returns the final bytes; verification is the caller's job and happens on
 * the file it wrote, not on these bytes — one check, on the artifact that ships, so a
 * test that deletes the check turns red instead of being masked by a second one.
 */
export function buildChallengeWasm(opts: {
  templateWasmPath: string
  payloadBlob: Uint8Array
  seed: number
  workDir: string
}): Uint8Array {
  const mutatedPath = join(opts.workDir, 'mutated.wasm')
  wasmMutate(opts.templateWasmPath, mutatedPath, opts.seed)
  const mutated = new Uint8Array(readFileSync(mutatedPath))
  return injectCustomSection(mutated, 'chall-data', opts.payloadBlob)
}

export function slugToSeed(slug: string): number {
  const hash = createHash('sha256').update(slug).digest()
  // Use first 4 bytes as u32 LE seed. `<< 24` alone is a *signed* 32-bit op:
  // without `>>> 0` half of all slugs come out negative, and wasm-tools parses
  // a negative seed as a flag ("unexpected argument '-1' found").
  return (hash[0] | (hash[1] << 8) | (hash[2] << 16) | (hash[3] << 24)) >>> 0
}

// ─── Legacy field names (for detection / warning) ───────────────────────────

const LEGACY_FIELDS = ['fs_key', 'fsKeyParts', 'encryptedFs', 'flag_verifier'] as const

// ─── Main build pipeline ────────────────────────────────────────────────────

/**
 * Decide whether this challenge gets a `__source__` payload entry, and build it.
 *
 * Returns `null` for every challenge that is not white-box, which is what makes the
 * build-time invariant hold in one direction: no `source_visible: true`, no entry. The
 * check is `=== true` rather than truthiness because `source_visible: 'true'` is a YAML
 * string, and a typo that turns a black-box challenge into a white-box one has to fail
 * closed.
 *
 * The executed copy is untouched: this function is handed `appContent` and returns new
 * bytes, so there is no path by which the redacted text can reach the `__app__` entry.
 */
export function planDisplaySource(
  fm: Record<string, unknown>,
  ctx: {
    appPath: string
    appContent: string
    fsEntries: Map<string, Uint8Array>
    flagContent: string
  },
): { bytes: Uint8Array; redactedCount: number } | null {
  // Shape is checked before the switch, not after: a string where an array was meant
  // (`source_files: /templates/cart.html`, no brackets — the likeliest slip for this
  // field) has to fail on every path. Behind the switch it would be discarded without a
  // word for a white-box challenge, and would slip past the whitelist-under-false
  // warning for a black-box one. Validation rejects the same shapes (bare sentence, no
  // `got …` suffix); keygen does not run it, so it says it here. Null is named as null.
  if (fm.source_files !== undefined && !Array.isArray(fm.source_files)) {
    throw new Error(
      `source_files must be an array of virtual paths, got ${fm.source_files === null ? 'null' : typeof fm.source_files}: ${JSON.stringify(fm.source_files)}`,
    )
  }
  if (fm.source_visible !== true) return null

  const sourceFiles = (fm.source_files ?? []) as string[]
  const bundle = buildDisplayBundle({
    appPath: ctx.appPath,
    appContent: ctx.appContent,
    sourceFiles,
    fsEntries: ctx.fsEntries,
    flagContent: ctx.flagContent,
  })
  return { bytes: bundle.bytes, redactedCount: bundle.redactedCount }
}

async function processChallenge(mdPath: string, templateWasmPath: string, force: boolean): Promise<void> {
  // New pattern: /path/challenge/<slug>/index.md → slug from parent dir
  // Legacy pattern: /path/challenge/<slug>.md → slug from filename
  const filename = basename(mdPath)
  const slug = filename === 'index.md'
    ? basename(dirname(mdPath))
    : basename(mdPath, '.md')
  const raw = readFileSync(mdPath, 'utf-8')
  const parsed = parseMd(raw)
  if (!parsed) { console.warn(`[skip] ${slug}: no frontmatter`); return }

  const doc = parseDocument(parsed.fmRaw)
  const fm = doc.toJSON() as Record<string, unknown>

  // Check if already processed: wasmModule field present AND output file exists AND inputs are fresh
  const hasWasmModule = typeof fm.wasmModule === 'string' && fm.wasmModule !== ''
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const outputWasmPath = resolve(root, 'platform', 'public', 'challenge', slug, 'runtime.wasm')
  if (hasWasmModule && existsSync(outputWasmPath) && !force) {
    const trackedInputs = getTrackedInputPaths(mdPath, templateWasmPath)
    if (!isOutputStale(outputWasmPath, trackedInputs)) {
      console.log(`[skip] ${slug}: already processed (use --force to re-key)`)
      return
    }
    console.log(`[stale] ${slug}: tracked inputs changed — rebuilding`)
  }

  // Resolve source directory relative to the .md file
  const baseDir = dirname(mdPath)
  const isPerFolder = filename === 'index.md'
  const srcDir = isPerFolder ? resolve(baseDir, 'src') : null

  // ─── Resolve app source and FS entries ─────────────────────────────────────
  let appContent: string
  let fsFiles: Array<{ virtualPath: string; data: Uint8Array }>
  let flagContent: string

  if (isPerFolder && srcDir && existsSync(srcDir)) {
    // ── New per-folder structure: auto-scan src/ ──
    const appRef = String(fm.app ?? 'app.py')
    const appPath = resolve(srcDir, appRef)
    if (!existsSync(appPath)) {
      console.warn(`[skip] ${slug}: app file not found: ${appPath}`)
      return
    }
    appContent = readFileSync(appPath, 'utf-8')

    // Load .fsignore if present
    const fsIgnorePath = resolve(srcDir, '.fsignore')
    let isExcluded: ((rel: string, isDir: boolean) => boolean) | undefined
    if (existsSync(fsIgnorePath)) {
      const fsIgnoreContent = readFileSync(fsIgnorePath, 'utf-8')
      isExcluded = parseFsIgnore(fsIgnoreContent)
    }

    // Auto-scan src/ for FS entries — read as raw bytes to preserve binary assets
    const scanned = scanSrcDirectory(srcDir, isExcluded)
    fsFiles = scanned
      .filter((f) => resolve(srcDir, f.virtualPath.slice(1)) !== appPath) // exclude app entry (stored as __app__)
      .map((f) => ({
        virtualPath: f.virtualPath,
        data: new Uint8Array(readFileSync(f.absolutePath)),
      }))

    // Resolve flag file
    const flagRef = String(fm.flag ?? 'flag.txt')
    const flagPath = resolve(srcDir, flagRef)
    if (!existsSync(flagPath)) {
      console.warn(`[skip] ${slug}: flag file not found: ${flagPath}`)
      return
    }
    flagContent = readFileSync(flagPath, 'utf-8')
  } else {
    // ── Legacy flat structure: explicit fs map ──
    const appRef = String(fm.app ?? '')
    const appPath = resolve(baseDir, appRef)
    if (!existsSync(appPath)) {
      console.warn(`[skip] ${slug}: app file not found: ${appPath}`)
      return
    }
    appContent = readFileSync(appPath, 'utf-8')

    const fsMap = (fm.fs ?? {}) as Record<string, string>
    const fileBuffers: Record<string, Uint8Array> = {}
    for (const [, ref] of Object.entries(fsMap)) {
      const p = resolve(baseDir, ref)
      if (!existsSync(p)) {
        console.warn(`[skip] ${slug}: fs file not found: ${p}`)
        return
      }
      fileBuffers[ref] = new Uint8Array(readFileSync(p))
    }
    fsFiles = Object.entries(fsMap).map(([vpath, ref]) => ({
      virtualPath: vpath,
      data: fileBuffers[ref] ?? new Uint8Array(0),
    }))

    // Flag from explicit fs map
    const flagEntry = Object.entries(fsMap).find(([vpath]) => vpath === '/flag.txt')
    if (!flagEntry) {
      console.warn(`[skip] ${slug}: no /flag.txt entry in fs map`)
      return
    }
    flagContent = new TextDecoder().decode(fileBuffers[flagEntry[1]])
  }

  const verifier = await deriveFlagVerifier(flagContent, slug)

  // Generate per-challenge AES-256 key
  const realKey = randomBytes(32)

  // Encrypt all FS entries → raw bytes (iv || ciphertext || tag)
  const entries: FsEntry[] = []
  for (const { virtualPath, data } of fsFiles) {
    const encrypted = await aesGcmEncryptRaw(realKey, data)
    entries.push({ path: virtualPath, data: encrypted })
  }

  // Encrypt app code under reserved '__app__' key
  const encryptedApp = await aesGcmEncryptRaw(realKey, new TextEncoder().encode(appContent))
  entries.push({ path: APP_KEY, data: encryptedApp })

  // White-box only: a second, redacted copy for the Source panel to display. Encrypted
  // with the same per-challenge key as everything else, so it never reaches build output
  // as plaintext.
  let displaySource: ReturnType<typeof planDisplaySource>
  try {
    displaySource = planDisplaySource(fm, {
      appPath: String(fm.app ?? 'app.py'),
      appContent,
      fsEntries: new Map(fsFiles.map((f) => [f.virtualPath, f.data])),
      flagContent,
    })
  } catch (err) {
    // Rethrown, not skipped: the framework spec requires a non-zero exit for an unusable
    // display copy. The slug is prefixed because the message names the offending path
    // and nothing else, and a batch run of twenty challenges leaves the author to guess
    // which one it came from.
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`[${slug}] ${detail}`, { cause: err })
  }
  // `planDisplaySource` has already thrown for a non-array, so by this line the field is
  // either absent or an array; "non-empty" and "holding one or more paths" coincide.
  if (!displaySource && Array.isArray(fm.source_files) && fm.source_files.length > 0) {
    // Validation rejects this combination; keygen does not run validation, so it says
    // the same thing here rather than building a challenge that displays nothing.
    console.warn(
      `[warn] ${slug}: source_files lists ${fm.source_files.length} path(s) but source_visible is not true; no source will be displayed`,
    )
  }
  if (displaySource) {
    entries.push({
      path: SOURCE_DISPLAY_KEY,
      data: await aesGcmEncryptRaw(realKey, displaySource.bytes),
    })
    if (displaySource.redactedCount > 0) {
      console.warn(
        `[redact] ${slug}: ${displaySource.redactedCount} flag occurrence(s) redacted from the displayed source`,
      )
    }
  }

  // XOR-encode the key
  const keyMaterial = xorEncodeKey(realKey)

  // Build metadata JSON
  const metadata = new TextEncoder().encode(JSON.stringify({
    backend: fm.backend,
    source_visible: fm.source_visible === true,
    packages: fm.packages ?? [],
  }))

  // Serialize payload
  const payloadBlob = serializePayload({
    slug,
    keyMaterial,
    verifier,
    entries,
    metadata,
  })

  // Mutate a copy of the template with the per-challenge seed, then append the
  // payload — in that order, so the mutator never sees the section (see wasmMutate).
  // Everything happens in a fresh tmp directory: the mutate work file, and the
  // runtime.wasm itself, which is written there, read back from disk and verified
  // BEFORE it is copied under platform/public. Round 2 of review measured the alternative:
  // writing to platform/public first and verifying afterwards overwrote a healthy
  // runtime.wasm with the corrupt one, in the tree the site build copies verbatim.
  // The slug is prefixed on every failure in here — including the copy of the template
  // going missing — for the same reason as the source_files errors above: a batch run
  // has to say which challenge it died on.
  const outputDir = resolve(root, 'platform', 'public', 'challenge', slug)
  const outputPath = resolve(outputDir, 'runtime.wasm')
  const workDir = mkdtempSync(join(tmpdir(), 'wxl-keygen-'))
  try {
    const challWasm = buildChallengeWasm({ templateWasmPath, payloadBlob, seed: slugToSeed(slug), workDir })
    const staged = join(workDir, 'runtime.wasm')
    writeFileSync(staged, challWasm)
    assertPayloadIntact(new Uint8Array(readFileSync(staged)), payloadBlob, 'runtime.wasm')
    mkdirSync(outputDir, { recursive: true })
    copyFileSync(staged, outputPath)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`[${slug}] ${detail}`, { cause: err })
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }

  // Update frontmatter: add wasmModule, remove legacy fields
  doc.set('wasmModule', `/challenge/${slug}/runtime.wasm`)
  for (const field of LEGACY_FIELDS) {
    doc.delete(field)
  }

  const newFm = doc.toString({ lineWidth: 0 })
  const newContent = `---\n${newFm}---\n${parsed.body}`
  writeFileSync(mdPath, newContent, 'utf-8')

  console.log(`[done]  ${slug}`)
  console.log(`        wasmModule: /challenge/${slug}/runtime.wasm`)
  console.log(`        payload: ${payloadBlob.length} bytes, ${entries.length} entries`)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const target = args.find((a) => !a.startsWith('-'))

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const root = resolve(__dirname, '..')
  const challenges = resolve(root, 'platform', 'challenge')
  const templateWasmPath = resolve(root, '.vitepress', 'wasm', 'virtual-fs', 'virtual_fs_bg.wasm')

  if (!existsSync(templateWasmPath)) {
    console.error(`Template WASM not found: ${templateWasmPath}`)
    console.error('Run `pnpm wasm:build` first.')
    process.exit(1)
  }

  // Prepare template WASM: strip symbols + optimize
  const preparedTemplatePath = resolve(root, preparedTemplateRelPath())
  prepareTemplateWasm(templateWasmPath, preparedTemplatePath)

  // New pattern: platform/challenge/<slug>/index.md
  const newPatternFiles = readdirSync(challenges, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(challenges, d.name, 'index.md')))
    .filter((d) => !target || d.name === target)
    .map((d) => join(challenges, d.name, 'index.md'))

  // Legacy pattern: platform/challenge/<slug>.md (fallback)
  const legacyFiles = readdirSync(challenges)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .filter((f) => {
      const slug = f.replace(/\.md$/, '')
      // Skip if already handled by new pattern
      return !newPatternFiles.some((nf) => nf.includes(`/${slug}/index.md`))
    })
    .filter((f) => !target || f === `${target}.md`)
    .map((f) => join(challenges, f))

  const files = [...newPatternFiles, ...legacyFiles]

  if (files.length === 0) {
    console.error(target ? `Challenge not found: ${target}` : 'No challenge files found')
    process.exit(1)
  }

  // Warn about legacy fields in any challenge
  for (const f of files) {
    const raw = readFileSync(f, 'utf-8')
    const parsed = parseMd(raw)
    if (!parsed) continue
    const doc = parseDocument(parsed.fmRaw)
    const fm = doc.toJSON() as Record<string, unknown>
    const fnBase = basename(f)
    const slug = fnBase === 'index.md' ? basename(dirname(f)) : basename(f, '.md')
    for (const field of LEGACY_FIELDS) {
      if (field in fm) {
        console.warn(`[warn] ${slug}: deprecated field '${field}' found — will be removed`)
      }
    }
    if (!f.endsWith('/index.md')) {
      console.warn(`[warn] ${slug}: using legacy flat file structure — consider migrating to ${slug}/index.md + src/`)
    }
  }

  for (const f of files) {
    await processChallenge(f, preparedTemplatePath, force)
  }
}

// Only run main when executed directly (not when imported for testing)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('challenge-keygen.ts') ||
  process.argv[1].endsWith('challenge-keygen.js')
)
if (isDirectRun) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
