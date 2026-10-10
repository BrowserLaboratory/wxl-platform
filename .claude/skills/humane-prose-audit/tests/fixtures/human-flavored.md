# How I Fixed the Build at 2am

Last night the CI broke. Again. Same flaky test — `test_pubsub_redelivery` — that's been
yellow on every third PR for a month. I'd been ignoring it. Tonight I couldn't.

The fix was dumb, in retrospect. The test creates a topic, publishes one message, then
asserts the subscriber sees it within 500ms. On a quiet runner that works. On a loaded
runner the broker queues backpressure-style and the assert times out. So: bump the timeout?
No. Make the test deterministic.

I rewrote it to use a manual acker. Publish, then `await ack()` before the assert. Total
diff: 12 lines. Three of those are imports. The runner runs it in 30ms now.

There's a lesson here about flaky tests being signal, not noise — but honestly the bigger
lesson is that I sat on this for a month. The fix took twenty minutes.

The PR is up. Reviewing now.
