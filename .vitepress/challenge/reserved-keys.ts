/**
 * Reserved keys in the WASM payload's FS entries.
 *
 * Both the build script (which writes them) and the challenge page (which withholds
 * them from the challenge runtime) need the same two strings. This module is the one
 * place they are spelled out: a value changed here changes on both sides of the
 * build/runtime boundary at once, so the page's filter cannot drift away from what
 * keygen emits and let a display bundle fall into the challenge's own filesystem.
 */

/** The program the challenge runtime executes — the author's file, byte for byte. */
export const APP_KEY = '__app__'

/** The redacted display copy the white-box Source panel renders. */
export const SOURCE_DISPLAY_KEY = '__source__'

/** Every key the challenge page must keep out of the runtime's virtual filesystem. */
export const RESERVED_FS_KEYS: ReadonlySet<string> = new Set([APP_KEY, SOURCE_DISPLAY_KEY])
