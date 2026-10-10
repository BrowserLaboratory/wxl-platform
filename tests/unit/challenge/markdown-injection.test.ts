import { describe, it, expect } from 'vitest'
import { extractMarkdownBody } from '../../../.vitepress/challenge/plugin'

describe('extractMarkdownBody', () => {
  it('strips YAML frontmatter block and returns the Markdown body', () => {
    const raw = `---
title: SQL Injection Demo
layout: challenge
difficulty: easy
---

# SQL Injection Demo

A login form backed by SQLite. Find a way to bypass authentication.
`
    const body = extractMarkdownBody(raw)
    expect(body).not.toContain('---')
    expect(body).not.toContain('title: SQL Injection Demo')
    expect(body.trim()).toContain('# SQL Injection Demo')
    expect(body).toContain('A login form backed by SQLite')
  })

  it('returns original content unchanged when no frontmatter is present', () => {
    const raw = `# Just a plain doc\n\nSome content here.`
    expect(extractMarkdownBody(raw)).toBe(raw)
  })

  it('handles frontmatter with YAML containing dashes inside values', () => {
    const raw = `---
description: >
  A challenge about SQL injection -- find the flag.
---

## Description

Solve the challenge.
`
    const body = extractMarkdownBody(raw)
    expect(body).not.toContain('description:')
    expect(body.trim()).toBe('## Description\n\nSolve the challenge.')
  })

  it('returns empty string when file contains only frontmatter', () => {
    const raw = `---
title: Test
---
`
    expect(extractMarkdownBody(raw).trim()).toBe('')
  })
})
