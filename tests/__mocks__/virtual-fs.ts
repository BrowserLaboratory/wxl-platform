// Test stub for /wasm/virtual-fs/virtual_fs.js
// Provides no-op implementations matching the new WASM API (no external key params)
export function wasm_fs_init(_slug: string, _payload_bytes: Uint8Array): void {}
export function wasm_fs_reset(_slug: string): void {}
export function wasm_fs_read(_path: string): Uint8Array {
  return new Uint8Array()
}
export function wasm_fs_write(_path: string, _plaintext: Uint8Array): void {}
export function wasm_fs_list(): string {
  return '[]'
}
export function wasm_verify_flag(_flag_bytes: Uint8Array): boolean {
  return false
}
export default async function init(): Promise<void> {}
