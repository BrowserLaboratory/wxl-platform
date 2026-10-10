import type { Page } from '@playwright/test'
import { decodeCookieCarrier } from '../../.vitepress/theme/composables/cookieCarrier'

/**
 * Make the shared carrier decoder callable from inside `page.evaluate`.
 *
 * A challenge spec reads `X-Wxlsh-Set-Cookie` to recover the session token, so
 * it is a consumer of the carrier format like any panel is. It cannot import
 * the module directly: its body is serialized into the page, where a Node
 * import does not exist. Re-implementing the split inside the evaluate would
 * give the format a second definition — the exact shape of the defect these
 * specs exist to catch, and the reason they silently stopped passing when the
 * format changed.
 *
 * Exposing the real function keeps one definition: the code that runs is the
 * module's own, executed in Node and called across the bridge.
 *
 * Call this before `page.goto` — the binding survives navigation.
 */
export async function exposeCarrierDecoder(page: Page): Promise<void> {
  await page.exposeFunction('__wxlDecodeCarrier', (carrier: string) =>
    decodeCookieCarrier(carrier),
  )
}

/** The page-side type of the binding {@link exposeCarrierDecoder} installs. */
export type CarrierDecoder = (carrier: string) => Promise<string[]>
