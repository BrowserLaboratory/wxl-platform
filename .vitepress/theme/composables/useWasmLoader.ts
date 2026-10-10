/**
 * Extract a named custom section from a WASM binary.
 *
 * WASM custom sections have section id 0x00 and contain:
 *   - name_len: LEB128
 *   - name: UTF-8 bytes
 *   - data: remaining bytes in the section
 */
export function extractCustomSection(wasmBytes: Uint8Array, sectionName: string): Uint8Array | null {
  const view = new DataView(wasmBytes.buffer, wasmBytes.byteOffset, wasmBytes.byteLength)
  let pos = 8 // skip WASM magic (4 bytes) + version (4 bytes)

  while (pos < wasmBytes.length) {
    const sectionId = wasmBytes[pos++]
    const { value: sectionSize, bytesRead } = readLEB128(wasmBytes, pos)
    pos += bytesRead
    const sectionEnd = pos + sectionSize

    if (sectionId === 0) {
      // Custom section — read name
      const { value: nameLen, bytesRead: nameLenBytes } = readLEB128(wasmBytes, pos)
      const nameStart = pos + nameLenBytes
      const name = new TextDecoder().decode(wasmBytes.slice(nameStart, nameStart + nameLen))

      if (name === sectionName) {
        const dataStart = nameStart + nameLen
        return wasmBytes.slice(dataStart, sectionEnd)
      }
    }

    pos = sectionEnd
  }

  return null
}

function readLEB128(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let value = 0
  let shift = 0
  let bytesRead = 0
  let byte: number

  do {
    byte = bytes[offset + bytesRead]
    value |= (byte & 0x7F) << shift
    shift += 7
    bytesRead++
  } while (byte & 0x80)

  return { value, bytesRead }
}
