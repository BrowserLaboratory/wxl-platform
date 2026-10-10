# Measuring OTA Firmware Update Latency in Consumer IoT Routers

This study measures the over-the-air (OTA) firmware update latency distribution
across forty-two household IoT routers spanning five brands (TP-Link, ASUS,
D-Link, Synology, Xiaomi). The question we set out to answer was narrow: does
the delay between a vendor push and a local apply correlate with how often the
device is on?

## Method

Between October and December 2025 we polled each device's firmware endpoint
every six hours, recording the version string, SHA-256 of the manifest, and
the local-reported `last_seen` timestamp. We paired these traces with vendor
release notes scraped weekly. Devices were on residential connections behind
typical Taiwanese ISP NAT; no special routing was added.

## Results

Vendor-side push latency had a median of 14.2 hours (IQR 7.6–22.1). Device-side
apply latency was substantially longer: median 36.8 hours (IQR 18.3–67.5).
A Pearson correlation between local uptime and apply latency yielded r = 0.31
(p < 0.01), a weak negative association — devices that stay on longer apply
updates *later*, not sooner.

This is unintuitive until one looks at the configuration data: 71% of long-uptime
devices had auto-update disabled, against 34% of short-uptime devices. The
correlation reflects user behavior, not network behavior.

Compared with Smith et al. (2023), whose European household sample reported a
median apply latency of 28.4 hours, our Taiwan distribution sits roughly thirty
percent higher. Two factors are candidates: ISP NAT type and vendor regional
push schedules. We do not have data to separate them.

## Limits

The sample is residential and Taiwanese. Enterprise-grade equipment, mobile
hotspots, and automotive units are out of scope. The polling interval bounds
the resolution of every reported latency at six hours — a finer measurement
would change the IQR but not the median ordering.
