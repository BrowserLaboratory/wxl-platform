import { describe, it, expect, vi } from 'vitest'
import { encodeCookieCarrier, decodeCookieCarrier } from '../../../.vitepress/theme/composables/cookieCarrier'

describe('cookieCarrier', () => {
  it.each([
    { name: 'a tab', payload: 'sid=x\trole=admin' },
    { name: 'a comma', payload: 'sid=x,role=admin' },
    { name: 'a newline', payload: 'sid=x\nrole=admin' },
    { name: 'base64-looking text', payload: 'sid=YWJj,ZGVm==' },
    { name: 'non-ASCII', payload: 'n=中文😀' },
  ])('keeps $name inside a single cookie', ({ payload }) => {
    // The separator has to be unreachable from anything the challenge emits;
    // PHP's header() rejects only CR and LF, so every other byte can arrive.
    expect(decodeCookieCarrier(encodeCookieCarrier([payload]))).toEqual([payload])
  })

  it('round-trips several cookies, including one with an Expires comma', () => {
    const values = ['session=abc; path=/; Expires=Thu, 19 Nov 1981 08:52:00 GMT', 'role=student; path=/']
    expect(decodeCookieCarrier(encodeCookieCarrier(values))).toEqual(values)
  })

  it('cannot tell an empty list from a list holding one empty value', () => {
    // A documented limit of the format, not an oversight: both encode to the
    // empty string, so no decoder can separate them. It costs nothing in
    // practice — headers_list() cannot produce an empty Set-Cookie value, since
    // `header('Set-Cookie:')` is the removal form and never appears in the list.
    // Asserted so the limit is recorded rather than rediscovered.
    expect(encodeCookieCarrier([])).toBe(encodeCookieCarrier(['']))
    expect(decodeCookieCarrier(encodeCookieCarrier(['']))).toEqual([])
  })

  it('produces nothing from an empty list, and reads nothing back', () => {
    expect(encodeCookieCarrier([])).toBe('')
    expect(decodeCookieCarrier('')).toEqual([])
  })

  it('rejects a segment the encoder could not have produced', () => {
    // atob follows the forgiving-base64 algorithm: it strips ASCII whitespace
    // and tolerates missing padding, so a drifted segment would decode into a
    // plausible cookie instead of being refused. The module's guarantee is that
    // every accepted segment is one the encoder wrote.
    const dropped: string[] = []
    const out = decodeCookieCarrier('!!!not base64!!!', (r) => dropped.push(r))

    expect(out).toEqual([])
    expect(dropped).toHaveLength(1)
  })

  it('reports a dropped segment rather than losing a cookie in silence', () => {
    const dropped: string[] = []
    const carrier = `${encodeCookieCarrier(['good=1'])},***`
    const out = decodeCookieCarrier(carrier, (r) => dropped.push(r))

    expect(out).toEqual(['good=1'])
    expect(dropped).toHaveLength(1)
  })

  it('produces a carrier that a header value can legally hold', () => {
    const carrier = encodeCookieCarrier(['a=1\nb=2', 'c=中文'])

    expect(/[\r\n]/.test(carrier)).toBe(false)
    expect([...carrier].every((c) => (c.codePointAt(0) ?? 0) <= 0xff)).toBe(true)
  })
})
