/**
 * A small async `requests`-shaped shim that awaits the JS dispatch bridge
 * directly, without `pyodide.ffi.run_sync`.
 *
 * NOT WIRED UP. It is kept, not deleted, for one reason: `run_sync` needs
 * WebAssembly stack switching (JSPI), which the Code panel's real `requests`
 * transport depends on. Where that is unavailable this shim is the only shape
 * that could work, so the source is worth keeping while that question is open.
 *
 * It used to be injected into the execution namespace under the name
 * `requests`, immediately before user code ran. That was a trap rather than a
 * fallback: writing `import requests` — the idiomatic first line — rebound the
 * name to the real library, so which implementation a student got depended on
 * whether they typed that line, and the two have incompatible APIs (this one
 * returns coroutines and must be awaited; the real one does not).
 *
 * DELETE THIS FILE when either becomes true:
 *   - the platform commits to Chromium-only, so JSPI is always present; or
 *   - a JSPI-free transport for the real `requests` library replaces it.
 * Until then, do not re-inject it under the name `requests`.
 */
export function buildRequestsStub(): string {
  return `
import json as _json

class _RequestsStub:
    class _Response:
        def __init__(self, status, headers, text):
            self.status_code = status
            self.headers = {k: v for k, v in headers.items()} if isinstance(headers, dict) else {k: v for k, v in headers}
            self.text = text
            self.content = text.encode()
        def json(self):
            return _json.loads(self.text)
        def __repr__(self):
            return f'<Response [{self.status_code}]>'

    async def _dispatch(self, method, url, **kwargs):
        from urllib.parse import urlencode as _urlencode
        headers = dict(kwargs.get('headers') or {})
        data = kwargs.get('data')
        json_body = kwargs.get('json')
        if json_body is not None:
            body = _json.dumps(json_body)
            headers.setdefault('Content-Type', 'application/json')
        elif isinstance(data, dict):
            body = _urlencode(data)
            headers.setdefault('Content-Type', 'application/x-www-form-urlencoded')
        elif isinstance(data, str):
            body = data
        else:
            body = ''
        # Route through the async JS dispatch bridge (JSON string in/out)
        headers_json = _json.dumps(headers)
        raw_json = await _wxlsh_dispatch_bridge(method, url, headers_json, body or '')
        r = _json.loads(raw_json)
        return self._Response(int(r['status']), r.get('headers', {}), r.get('body', ''))

    async def get(self, url, **kw): return await self._dispatch('GET', url, **kw)
    async def post(self, url, **kw): return await self._dispatch('POST', url, **kw)
    async def put(self, url, **kw): return await self._dispatch('PUT', url, **kw)
    async def delete(self, url, **kw): return await self._dispatch('DELETE', url, **kw)
    async def patch(self, url, **kw): return await self._dispatch('PATCH', url, **kw)
    async def head(self, url, **kw): return await self._dispatch('HEAD', url, **kw)
    async def request(self, method, url, **kw): return await self._dispatch(method.upper(), url, **kw)

requests = _RequestsStub()
`
}
