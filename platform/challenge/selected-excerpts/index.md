---
title: Selected Excerpts
number: 10
layout: challenge
difficulty: medium
category: web
backend: flask
app: app.py
packages: [ flask ]
tools: [ browser, network, repeater, code ]
source_visible: true
source_files: [ /workspace.py, /revisions.py, /course_pack.py, /templates/base.html, /templates/workbench.html, /templates/article.html, /templates/preview.html, /templates/course-pack.html, /templates/missing.html, /static/app.css ]
date: 2026-09-13T13:28:46.765Z
tags: [ idor, access-control, ssti, template-injection, jinja2, flask ]
description: A white-box assessment of Kestrel Press's editorial workspace, where contributors draft teaching materials and curriculum editors assemble selected excerpts into a course pack.
wasmModule: /challenge/selected-excerpts/runtime.wasm
---

# Selected Excerpts

**Client:** Kestrel Press, an independent educational publisher.
**Engagement:** White-box assessment of its contributor workspace and the course-pack preview assembled from selected excerpts.

## Scope

In scope: the editorial workspace served at this origin, every HTTP endpoint it
exposes, and the source files mounted with the application.

You have access as an ordinary contributor, **Leah Navarro**. You may edit her
drafts and inspect material that the curriculum team has already selected. You
do not have editor approval rights and cannot change the course-pack list or
the publisher's page templates.

Out of scope: Kestrel Press's publishing system outside this exercise, other
contributors' accounts, and denial of service.

## Rules of engagement

This is an authorised exercise against a system Kestrel Press controls. Reach
the objective, keep the evidence needed to explain it, and stop. Do not change
the selection list or damage the teaching materials.

Kestrel Press has released the application's source code and page templates for
this engagement. Read them alongside the running workspace.

## Objective

Kestrel Press says that only editorially selected material can affect the
course-pack preview, and that contributor writing remains ordinary manuscript
text throughout that process.

Test that promise. Establish whether a contributor can influence a selected
excerpt and whether that influence remains text when Kestrel Press assembles
the course pack. The proof Kestrel Press will accept is the contents of
`/flag.txt`, which no normal page or source file serves.

## Deliverable

The contents of `/flag.txt`, the requests that produced it, and an explanation
of the two separate failures required to reach it.
