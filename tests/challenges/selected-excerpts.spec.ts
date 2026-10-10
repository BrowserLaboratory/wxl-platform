import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { READY_TIMEOUT_MS } from './timeouts'

const BASE_URL = 'http://localhost:5173/challenge/selected-excerpts/'
const FLAG_REGEX = /(FLAG|CTF)\{[^}]+\}/
const EXPECTED_FLAG = readFileSync(
  new URL('../../platform/challenge/selected-excerpts/src/flag.txt', import.meta.url),
  'utf8',
).trim()

const OWN_ARTICLE = 'writing-with-evidence'
const OWN_CHAPTER = 'reading-a-trace'
const MIRA_ARTICLE = 'discussion-notes'
const MIRA_CHAPTER = 'asking-better-questions'
const SAVED_ARTICLE_PATH = `/articles/${OWN_ARTICLE}?saved=chapter`
const DRAFT_PROBE = '{{ 7 * 7 }}'
const FOREIGN_REVISION = '## Revision queue\n\nThis selected excerpt was revised through the shared queue.'
const UNAUTHORISED_REVISION = 'This direct editorial revision must be rejected.'

// Course-pack assembly uses a plain Jinja environment for its legacy include
// compatibility pass, so this probe only works after the IDOR reaches a
// selected chapter.
const SELECTED_ARITHMETIC_PROBE = '{{ 7 * 7 }}'
const SELECTED_EXPLOIT = "{{ lipsum.__globals__.__builtins__.open('/flag.txt').read() }}"

const ready = (page: import('@playwright/test').Page) =>
  page.waitForFunction(
    () =>
      navigator.serviceWorker.controller !== null &&
      typeof (globalThis as { __wxlDispatch?: unknown }).__wxlDispatch === 'function',
    null,
    { timeout: READY_TIMEOUT_MS },
  )

test('selected-excerpts requires the shared revision IDOR before a selected excerpt reaches the legacy include renderer', async ({ page }) => {
  await page.goto(BASE_URL)
  await ready(page)

  const result = await page.evaluate(
    async ({ article, chapter, selectedArticle, selectedChapter, draftProbe, foreignRevision, unauthorisedRevision, arithmetic, payload }) => {
      const dispatch = (globalThis as unknown as {
        __wxlDispatch?: (request: Request) => Promise<Response>
      }).__wxlDispatch
      if (!dispatch) {
        throw new Error('__wxlDispatch not exposed on the page')
      }

      const base = 'https://challenge-selected-excerpts.localhost'
      const get = async (path: string) => {
        const response = await dispatch(new Request(`${base}${path}`))
        return { status: response.status, body: await response.text() }
      }
      const save = async (
        articleSlug: string,
        chapterSlug: string,
        body: string,
        headers: Record<string, string> = {},
      ) => {
        const response = await dispatch(
          new Request(`${base}/articles/${articleSlug}/chapters/${chapterSlug}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              ...headers,
            },
            body: new URLSearchParams({ body }).toString(),
            redirect: 'manual',
          }),
        )
        return {
          status: response.status,
          location: response.headers.get('location'),
          body: await response.text(),
        }
      }

      const initial = {
        workbench: await get('/'),
        draft: await get(`/articles/${article}`),
        draftPreview: await get(`/articles/${article}/preview`),
        coursePack: await get('/course-pack'),
        arbitraryInclude: await get('/course-pack?excerpt=/flag.txt'),
        missing: await get('/missing'),
        directFlag: await get('/flag.txt'),
      }
      const ownSave = await save(article, chapter, draftProbe)
      const afterOwnDraft = {
        draft: await get(`/articles/${article}?saved=chapter`),
        preview: await get(`/articles/${article}/preview`),
        coursePack: await get('/course-pack'),
      }
      const unownedSave = await save(selectedArticle, selectedChapter, unauthorisedRevision, {
        'x-contributor': 'Mira Osei',
      })
      const afterUnownedSave = {
        article: await get(`/articles/${selectedArticle}`),
        coursePack: await get('/course-pack'),
      }
      const foreignTextSave = await save(article, selectedChapter, foreignRevision)
      const afterForeignText = {
        article: await get(`/articles/${selectedArticle}`),
        preview: await get(`/articles/${selectedArticle}/preview`),
        coursePack: await get('/course-pack'),
      }
      const arithmeticSave = await save(article, selectedChapter, arithmetic)
      const afterArithmetic = {
        article: await get(`/articles/${selectedArticle}`),
        preview: await get(`/articles/${selectedArticle}/preview`),
        coursePack: await get('/course-pack'),
      }
      const exploitSave = await save(article, selectedChapter, payload)
      const afterExploit = {
        article: await get(`/articles/${selectedArticle}`),
        preview: await get(`/articles/${selectedArticle}/preview`),
        coursePack: await get('/course-pack'),
      }

      return {
        initial,
        ownSave,
        afterOwnDraft,
        unownedSave,
        afterUnownedSave,
        foreignTextSave,
        afterForeignText,
        arithmeticSave,
        afterArithmetic,
        exploitSave,
        afterExploit,
      }
    },
    {
      article: OWN_ARTICLE,
      chapter: OWN_CHAPTER,
      selectedArticle: MIRA_ARTICLE,
      selectedChapter: MIRA_CHAPTER,
      draftProbe: DRAFT_PROBE,
      foreignRevision: FOREIGN_REVISION,
      unauthorisedRevision: UNAUTHORISED_REVISION,
      arithmetic: SELECTED_ARITHMETIC_PROBE,
      payload: SELECTED_EXPLOIT,
    },
  )

  expect(EXPECTED_FLAG).toMatch(FLAG_REGEX)
  expect(result.initial.workbench.status).toBe(200)
  expect(result.initial.workbench.body).toContain('Selected Excerpts')
  expect(result.initial.draft.status).toBe(200)
  expect(result.initial.draft.body).toContain('Writing with Evidence')
  expect(result.initial.draftPreview.status).toBe(200)
  expect(result.initial.draftPreview.body).toContain('Reading a Trace')
  expect(result.initial.coursePack.status).toBe(200)
  expect(result.initial.coursePack.body).toContain('Asking Better Questions')
  expect(result.initial.coursePack.body).toContain('Ask what evidence would change your mind.')
  expect(result.initial.missing.status).toBe(404)
  expect(result.initial.missing.body).toContain('Not found')
  expect(result.initial.directFlag.status).toBe(404)
  expect(result.initial.directFlag.body).toContain('Not found')
  expect(result.initial.arbitraryInclude.status).toBe(200)

  for (const response of Object.values(result.initial)) {
    expect(response.body).not.toContain(EXPECTED_FLAG)
  }

  // Leah can round-trip a Jinja-shaped manuscript, but it remains manuscript
  // text in both of her normal article views and never enters the fixed pack.
  expect(result.ownSave.status).toBe(302)
  expect(result.ownSave.location).toBe(SAVED_ARTICLE_PATH)
  expect(result.afterOwnDraft.draft.body).toContain('Revision saved.')
  expect(result.afterOwnDraft.draft.body).toContain(DRAFT_PROBE)
  expect(result.afterOwnDraft.preview.body).toContain(DRAFT_PROBE)
  expect(result.afterOwnDraft.preview.body).not.toContain('49')
  expect(result.afterOwnDraft.coursePack.body).not.toContain(DRAFT_PROBE)
  expect(result.afterOwnDraft.coursePack.body).not.toContain('49')
  expect(result.afterOwnDraft.coursePack.body).not.toContain(EXPECTED_FLAG)

  // A self-reported identity does not authorise the direct editorial URL, and
  // the rejected request cannot leave a transient revision behind.
  expect(result.unownedSave.status).toBe(403)
  expect(result.unownedSave.body).toContain('Contributors can edit only their own drafts.')
  expect(result.afterUnownedSave.article.body).toContain('Ask what evidence would change your mind.')
  expect(result.afterUnownedSave.article.body).not.toContain(UNAUTHORISED_REVISION)
  expect(result.afterUnownedSave.coursePack.body).toContain('Ask what evidence would change your mind.')
  expect(result.afterUnownedSave.coursePack.body).not.toContain(UNAUTHORISED_REVISION)

  // The shared service accepts Leah's route authorisation and uses the chapter
  // slug across the workspace, so a selected chapter receives the new text.
  expect(result.foreignTextSave.status).toBe(302)
  expect(result.foreignTextSave.location).toBe(SAVED_ARTICLE_PATH)
  expect(result.afterForeignText.article.body).toContain(FOREIGN_REVISION)
  expect(result.afterForeignText.preview.body).toContain('Revision queue')
  expect(result.afterForeignText.preview.body).toContain('This selected excerpt was revised through the shared queue.')
  expect(result.afterForeignText.coursePack.body).toContain('Revision queue')
  expect(result.afterForeignText.coursePack.body).toContain('This selected excerpt was revised through the shared queue.')
  expect(result.afterForeignText.coursePack.body).not.toContain(EXPECTED_FLAG)

  // A selected chapter is still ordinary Markdown in article views. Only the
  // course-pack include compatibility pass compiles the expression.
  expect(result.arithmeticSave.status).toBe(302)
  expect(result.arithmeticSave.location).toBe(SAVED_ARTICLE_PATH)
  expect(result.afterArithmetic.article.body).toContain(SELECTED_ARITHMETIC_PROBE)
  expect(result.afterArithmetic.preview.body).toContain(SELECTED_ARITHMETIC_PROBE)
  expect(result.afterArithmetic.preview.body).not.toContain('49')
  expect(result.afterArithmetic.coursePack.body).toContain('49')
  expect(result.afterArithmetic.coursePack.body).not.toContain(SELECTED_ARITHMETIC_PROBE)
  expect(result.afterArithmetic.coursePack.body).not.toContain(EXPECTED_FLAG)

  expect(result.exploitSave.status).toBe(302)
  expect(result.exploitSave.location).toBe(SAVED_ARTICLE_PATH)
  expect(result.afterExploit.article.body).toContain('lipsum.__globals__.__builtins__.open')
  expect(result.afterExploit.preview.body).toContain('lipsum.__globals__.__builtins__.open')
  expect(result.afterExploit.article.body).toContain('/flag.txt')
  expect(result.afterExploit.preview.body).toContain('/flag.txt')
  expect(result.afterExploit.article.body).not.toContain(EXPECTED_FLAG)
  expect(result.afterExploit.preview.body).not.toContain(EXPECTED_FLAG)
  expect(result.afterExploit.coursePack.status).toBe(200)
  expect(result.afterExploit.coursePack.body).toContain(EXPECTED_FLAG)
  expect(result.afterExploit.coursePack.body).toContain('<article class="rendered-chapter">')
  expect(result.afterExploit.coursePack.body).not.toContain('&lt;article class=')
})
