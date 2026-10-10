import { describe, it, expect, vi } from 'vitest'
import { createPhpAdapter } from '../../../.vitepress/theme/composables/usePhpRuntime'

/**
 * Minimal stand-in for php-wasm's PhpWeb plus its Emscripten `binary`.
 *
 * Mirrors the parts the adapter touches: the output event stream, `run`,
 * `refresh`, `flush`, and the FS namespace. The device subtrees are present
 * because excluding them is part of the contract — `/proc/self/fd` throws on
 * stat in the real runtime, so a snapshot that walks into it dies.
 */
function makeFakePhpWeb() {
  const files = new Map<string, string>()
  const dirs = new Set<string>(['/', '/tmp', '/home', '/home/web_user', '/dev', '/proc', '/proc/self'])
  const listeners = new Map<string, ((e: Event) => void)[]>()

  const FS = {
    writeFile: vi.fn((path: string, data: Uint8Array | string) => {
      files.set(path, typeof data === 'string' ? data : new TextDecoder().decode(data))
    }),
    readFile: vi.fn((path: string) => {
      if (!files.has(path)) throw new Error(`ENOENT: ${path}`)
      return new TextEncoder().encode(files.get(path)!)
    }),
    unlink: vi.fn((path: string) => { files.delete(path) }),
    readdir: vi.fn((dir: string) => {
      if (dir === '/proc/self') throw new Error('EACCES')
      const prefix = dir === '/' ? '/' : `${dir}/`
      const kids = new Set<string>(['.', '..'])
      for (const p of [...files.keys(), ...dirs]) {
        if (p === dir || !p.startsWith(prefix)) continue
        const rest = p.slice(prefix.length)
        if (rest.length > 0) kids.add(rest.split('/')[0])
      }
      return [...kids]
    }),
    stat: vi.fn((path: string) => {
      if (dirs.has(path)) return { mode: 0o040755, size: 4096 }
      if (files.has(path)) return { mode: 0o100644, size: files.get(path)!.length }
      throw new Error(`ENOENT: ${path}`)
    }),
    isDir: vi.fn((mode: number) => (mode & 0o170000) === 0o040000),
  }

  const php = {
    binary: Promise.resolve({ FS }),
    run: vi.fn(async () => 0),
    refresh: vi.fn(async () => 0),
    flush: vi.fn(),
    addEventListener: vi.fn((type: string, fn: (e: Event) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    }),
    removeEventListener: vi.fn(),
    emit(type: string, chunk: string) {
      for (const fn of listeners.get(type) ?? []) {
        fn({ detail: [chunk] } as unknown as Event)
      }
    },
  }
  return { php, FS, files, dirs }
}

describe('createPhpAdapter', () => {
  it('exposes run, refresh, flush and writeFile as functions', async () => {
    const { php } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)

    expect(typeof adapter.run).toBe('function')
    expect(typeof adapter.refresh).toBe('function')
    expect(typeof adapter.flush).toBe('function')
    expect(typeof adapter.writeFile).toBe('function')
  })

  it('exposes the filesystem operations the snapshot needs', async () => {
    const { php } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)

    expect(typeof adapter.listFiles).toBe('function')
    expect(typeof adapter.readFile).toBe('function')
    expect(typeof adapter.deleteFile).toBe('function')
  })

  it('returns output and exitCode from run, and no header array', async () => {
    const { php } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)

    php.run.mockImplementation(async () => { php.emit('output', 'body text'); return 0 })
    const result = await adapter.run('<?php echo "body text"; ?>')

    expect(result.output).toBe('body text')
    expect(result.exitCode).toBe(0)
    expect(result).not.toHaveProperty('headers')
  })

  it('lists files written into the filesystem but never device subtrees', async () => {
    const { php, FS } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)

    FS.writeFile('/flag.txt', 'wxl{x}')
    FS.writeFile('/tmp/sess_abc', 'data')
    FS.writeFile('/dev/null', 'device')

    const listed = adapter.listFiles()

    expect(listed).toContain('/flag.txt')
    expect(listed).toContain('/tmp/sess_abc')
    expect(listed.some((p) => p.startsWith('/dev/'))).toBe(false)
    expect(listed.some((p) => p.startsWith('/proc/'))).toBe(false)
  })

  it('survives a directory that throws when read', async () => {
    const { php, FS } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)
    FS.writeFile('/flag.txt', 'wxl{x}')

    // /proc/self throws EACCES in the fake, mirroring /proc/self/fd in the real runtime.
    expect(adapter.listFiles()).toContain('/flag.txt')
  })

  it('forwards refresh and flush to the underlying php-wasm instance', async () => {
    const { php } = makeFakePhpWeb()
    const adapter = await createPhpAdapter(php as never)

    await adapter.refresh()
    adapter.flush()

    expect(php.refresh).toHaveBeenCalledOnce()
    expect(php.flush).toHaveBeenCalledOnce()
  })
})
