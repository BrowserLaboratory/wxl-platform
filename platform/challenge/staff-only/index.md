---
title: Staff Only
number: 2
layout: challenge
difficulty: easy
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-08-17T16:21:14.557Z
tags: [ sql, injection, flask, sqlite ]
description: A black-box engagement against Corkboard, an intranet noticeboard whose admin console is meant to open only for accounts carrying the administrator flag.
wasmModule: /challenge/staff-only/runtime.wasm
---

# Staff Only

**Client:** Corkboard, the intranet noticeboard a mid-sized company runs for its staff.
**Engagement:** Black-box assessment of the Corkboard web application.

## Scope

In scope: the Corkboard application served at this origin and every HTTP
endpoint it exposes.

Corkboard has issued you one staff account for this engagement — staff ID
`j.kerr`, password `Aut2026!`. It is an ordinary account with no elevated
rights, and it is the only credential you have been given.

Out of scope: the hosting platform, other engagements, and denial of service.

## Rules of engagement

This is an authorised exercise against a system Corkboard controls. Reach the
objective and stop — Corkboard is paying for proof of impact, not for damage.
Confine any change you make to what the objective requires, and stay inside the
scope above.

Corkboard has not released the application's source code for this engagement.
Work from what the running system tells you.

## Constraints

Corkboard is not buying a password audit. Guessing, spraying, or brute-forcing
credentials is out of scope, and the engagement will not be accepted on that
basis. The finding they want is one the application hands you.

## Objective

Corkboard tells its staff two things. Colleagues' records are theirs alone —
the profile editor opens your own entry and nobody else's. And the admin
console is restricted to accounts carrying the administrator flag, so the
account you have been issued can never reach it.

Both statements are load-bearing, and Corkboard's own team has stopped
vouching for the first one.

Disprove them: starting from the ordinary staff account above, reach the admin
console and recover the deployment recovery key it holds. That key is what
Corkboard will accept as proof of impact. Submit it below to close the
engagement.

## Deliverable

Corkboard wants a record of how you got there, not only the result. Log each
request that moved the assessment forward in the Notes panel, and export the
session when you are done.
