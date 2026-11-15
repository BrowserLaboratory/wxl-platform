---
title: Need to Know
number: 1
layout: challenge
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: false
date: 2026-04-02T08:54:17.674Z
tags: [ idor, access-control, fastapi, sqlite ]
description: A black-box engagement against FileHub, a file-sharing service whose product page promises that a file uploaded by one account is readable only by that account.
wasmModule: /challenge/door-is-open/runtime.wasm
---

# Need to Know

**Client:** FileHub, a file-sharing service used by small teams.
**Engagement:** Black-box assessment of the FileHub web application.

## Scope

In scope: the FileHub application served at this origin and every HTTP endpoint
it exposes.

FileHub has issued you one account for this engagement — username `guest`,
password `guest`. It is an ordinary account with no elevated rights, and it is
the only credential you have been given.

Out of scope: the hosting platform, other engagements, and denial of service.

## Rules of engagement

This is an authorised exercise against a system FileHub controls. Reach the
objective and stop — FileHub is paying for proof of impact, not for damage.
Leave stored data intact, and stay inside the scope above.

FileHub has not released the application's source code for this engagement.
Work from what the running system tells you.

## Objective

FileHub's product page promises that a file uploaded by one account is readable
only by that account. FileHub's own engineers no longer believe it.

Disprove the promise: retrieve the contents of a file belonging to an account
that is not yours. The administrator keeps stored credentials among their
private files, and recovering that content is what FileHub will accept as proof
of impact. Submit it below to close the engagement.

## Deliverable

FileHub wants a record of how you got there, not only the result. Log each
request that moved the assessment forward in the Notes panel, and export the
session when you are done.
