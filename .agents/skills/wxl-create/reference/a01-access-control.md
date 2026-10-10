# A01 — Broken Access Control template pack

Reference content the wxl-create workflow consults when the requested `vuln`
is an OWASP **A01 (Broken Access Control)** class. This file is data, not a
standalone skill: the wxl-create `SKILL.md` registry table points the
code-generation step here, and the fix loop reads the
"Per-primitive fix hints" section when a failing challenge's tags intersect
the A01 taxonomy.

## Recognition heuristics

Treat a challenge as A01 (Broken Access Control) when the requested `vuln`
matches this trigger regex, kept byte-for-byte in sync with the wxl-create
`SKILL.md` registry table:

    idor|jwt|path.?traversal|access.?control|broken.?access

Tag taxonomy — an A01 challenge SHALL carry at least one of:
`idor`, `access-control`, `jwt`, `path-traversal`, `broken-access`.

Field fingerprints that point at A01:

- An object identifier in the request that selects a record — `?id=`,
  `?file=`, `?user=`, `/orders/<n>` — where the handler never checks that the
  caller owns the record.
- A bearer or session token whose header advertises its own algorithm
  (`alg`), or a token the server trusts without verifying the signature.
- A filesystem path built from user input — a `..` segment, a leading `/`, or
  a base directory concatenated with a request parameter.
- A privileged route (`/admin`, `/internal`) reachable without a role check.

## Per-primitive fix hints

Each subsection pairs the vulnerable shape with the fix. The fix loop reads
this section when a failing challenge's tags intersect the A01 taxonomy.

### IDOR

The handler fetches a record by id but never checks that the caller owns it.

Vulnerable:

    row = db.execute("SELECT * FROM files WHERE id = ?", (id,)).fetchone()

Fixed — scope the lookup to the authenticated owner so a foreign id returns
nothing:

    row = db.execute(
        "SELECT * FROM files WHERE id = ? AND owner_id = ?", (id, current_uid)
    ).fetchone()

The ownership predicate SHALL be part of the lookup (or an explicit check
before the record is returned), never a post-hoc filter on rendered output.

### JWT alg:none

The verifier trusts the algorithm named in the token header, so an attacker
forges an unsigned token (`alg` set to `none`) carrying elevated claims.

Vulnerable — the client picks the algorithm, and `none` means no signature is
checked:

    alg = jwt.get_unverified_header(token)['alg']
    key = '' if alg == 'none' else SECRET
    claims = jwt.decode(token, key, algorithms=[alg])

Fixed — pin the expected algorithm and refuse `none`:

    claims = jwt.decode(token, SECRET, algorithms=['HS256'])

Reject any token whose header `alg` is `none`, and require a verified
signature before trusting a claim such as `role`, `sub`, or `scope`.

### Path traversal

A file is read from a base directory concatenated with unsanitized input, so a
`..` segment escapes the intended root and reaches `/flag.txt`.

Vulnerable (PHP):

    $content = file_get_contents('/reports/' . $_GET['file']);

Fixed — canonicalize the resolved path and confirm it stays under the base
directory:

    $base = realpath('/reports');
    $target = realpath('/reports/' . $_GET['file']);
    if ($target === false || strncmp($target, $base . '/', strlen($base) + 1) !== 0) {
        http_response_code(403);
        exit('forbidden');
    }
    $content = file_get_contents($target);

Do not rely on substring blocklists that merely strip `..`; canonicalize
first, then compare against the resolved base directory.

### General

For every A01 fix, run the authorization check **before** the protected read
or action, not after. Derive the subject's identity from a verified credential
(a signed session or a signature-verified token), never from a value the
client is free to rewrite.

## Reference challenges table

| Slug | Primitive | Backend | Difficulty |
|------|-----------|---------|------------|
| `door-is-open` | IDOR | fastapi | easy |

This table mirrors the reference-challenge table in the `a01-access-control-template-pack`
capability, which is where pack membership is defined; the two SHALL list the same
slugs. It is not a list of the primitives this document covers — the
`Per-primitive fix hints` section above covers primitives whose reference challenge
has been retired, and those hints stay in force. A retired challenge under
`.archive/` SHALL NOT be read as a reference.
