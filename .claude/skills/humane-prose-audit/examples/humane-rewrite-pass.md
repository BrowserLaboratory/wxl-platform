# A Note on Modernization Strategy

This is a rewrite of an earlier draft that read like committee minutes.
The new version says what it actually means, which turns out to be less
than the old one promised.

We have four legacy services. Three serve traffic; one runs a nightly
batch. The nightly batch can be retired this quarter — the downstream
consumer was deprecated last year and nobody noticed. That leaves three.
Of those, the customer-data API is the only one that genuinely needs a
rewrite. The other two can sit on the old framework until their owning
team has bandwidth.

So the actual plan is: kill the batch this month, rewrite the customer
API next quarter, leave the other two alone. The roadmap I inherited
listed all four as "candidates for modernization" with no priority
order, and proposed a unified migration framework. Looking at the
traffic and the team's capacity, the unified framework would have
generated more meetings than code.

The customer API rewrite has two real risks. First, the auth contract
with the mobile clients is older than the engineers maintaining the
mobile clients — nobody can tell us with confidence what the actual
contract is. We will reconstruct it from logs over the first two weeks
before we touch any code. Second, the database has a unique constraint
we discovered while writing this document; the new schema needs to
preserve it.

Everything else in the original plan was decoration. Stripping it out
made the work look smaller, which is accurate.
