/**
 * How multiple `Set-Cookie` values ride one carrier header.
 *
 * `Set-Cookie` is a forbidden response-header name in the Fetch API, so both
 * runtimes hand their cookies to JavaScript on `X-Wxlsh-Set-Cookie` instead.
 * That header holds one value, so several cookies have to share it — and the
 * question of how they share it is the whole reason this module exists rather
 * than a one-line join at each call site.
 *
 * The format is a comma-joined list of base64 segments.
 *
 * One documented limit: an empty list and a list holding one empty string both
 * encode to the empty string, so no decoder can separate them. This costs
 * nothing, because `headers_list()` cannot yield an empty `Set-Cookie` value —
 * `header('Set-Cookie:')` is the removal form and never appears in the list. What that buys is that
 * **no byte the challenge emits can reach the separator**: base64's alphabet
 * contains no comma, so every comma in the carrier is one this encoder wrote.
 *
 * A plain separator character does not have that property. Tab was tried first,
 * on the grounds that `cookie-octet` excludes it — but that governs what the
 * grammar permits, not what PHP enforces. `header()` rejects only CR and LF; a
 * tab passes straight into `headers_list()`. A challenge writing
 * `header("Set-Cookie: sid=" . $_GET['v'])` therefore let a student send
 * `v=x%09role=admin` and split one cookie into two real ones — a solve path
 * present in this lab and in no real deployment. A newline fails even earlier:
 * it is not a legal header-value character at all, so a browser rejects the
 * entire `Headers` assignment and the request dies.
 *
 * Both runtimes and every consumer use this module. The format is a contract
 * between producers and consumers, and a contract with two definitions is a
 * contract that will drift.
 */

/** Encode `Set-Cookie` values for transport on the carrier header. */
export function encodeCookieCarrier(values: string[]): string {
  return values.map((v) => base64EncodeUtf8(v)).join(',')
}

/** Strict base64: what the encoder emits, and nothing else. */
const BASE64_SEGMENT = /^[A-Za-z0-9+/]*={0,2}$/

/**
 * Inverse of {@link encodeCookieCarrier}.
 *
 * A segment that is not valid base64 did not come from the encoder, so it is
 * dropped with a warning rather than surfaced as a malformed cookie.
 */
export function decodeCookieCarrier(carrier: string, onDropped?: (reason: string) => void): string[] {
  if (carrier === '') return []
  const out: string[] = []
  for (const segment of carrier.split(',')) {
    // Validate before decoding. `atob` follows the forgiving-base64 algorithm:
    // it strips ASCII whitespace and tolerates missing padding, so a segment
    // that did not come from the encoder can decode into a plausible-looking
    // cookie instead of being rejected. The guarantee this module offers is
    // that every accepted segment is one the encoder wrote, and a forgiving
    // decode does not deliver it.
    if (!BASE64_SEGMENT.test(segment)) {
      onDropped?.(`dropped a Set-Cookie segment that the encoder did not produce`)
      continue
    }
    try {
      out.push(base64DecodeUtf8(segment))
    } catch {
      onDropped?.('dropped a Set-Cookie segment that could not be decoded')
    }
  }
  return out
}

/** btoa() only accepts Latin-1, so UTF-8 has to be widened to bytes first. */
export function base64EncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Counterpart of {@link base64EncodeUtf8}. */
export function base64DecodeUtf8(value: string): string {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
