---
title: Just a Preview
number: 8
layout: challenge
difficulty: easy
category: web
backend: fastapi
app: app.py
packages: []
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /templates/layout.html, /templates/index.html, /templates/detail.html, /templates/preview.html, /templates/_editor.html, /templates/missing.html, /static/app.css ]
date: 2026-09-06T09:23:32.337Z
tags: [ ssti, template-injection, jinja2, fastapi ]
description: A white-box engagement against Corvid Labs' internal prompt library, whose editor tells authors that rendering a preview runs in a restricted environment.
wasmModule: /challenge/just-a-preview/runtime.wasm
---

# Just a Preview

**Client:** Corvid Labs, whose support desk runs its first-line replies through
a language model.
**Engagement:** White-box assessment of the internal prompt library and the
page templates shipped alongside it.

## Scope

In scope: the Prompt Library served at this origin, every HTTP endpoint it
exposes, and the template files mounted into the application image.

The library is reached over the internal network Corvid Labs has opened to you
for this engagement. It carries no sign-in of its own — everyone on the support
automation rota shares it, and anyone who can reach it can draft a template
and render a preview of it.

Out of scope: the hosting platform, the language model the finished prompts are
sent to, other engagements, and denial of service.

## Rules of engagement

This is an authorised exercise against a system Corvid Labs controls. Reach the
objective and stop — Corvid Labs is paying for proof of impact, not for damage.
Stay inside the scope above.

Corvid Labs has released the application source and the page templates for this
engagement. Read them.

## Objective

The template editor tells its authors that rendering a preview happens in a
restricted environment. Corvid Labs put a language model in front of its
customers on the strength of that sentence, and the platform team would rather
hear from you than from a customer whether it holds.

Disprove it: make the preview hand back the contents of a file the library was
never meant to read. `/flag.txt` sits on the application's filesystem and no
route serves it, so recovering it through the preview is what Corvid Labs will
accept as proof of impact. Submit it below to close the engagement.

## Deliverable

Corvid Labs wants a record of how you got there, not only the result. Log each
request that moved the assessment forward in the Notes panel, and export the
session when you are done.
