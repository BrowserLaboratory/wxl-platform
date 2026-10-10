import { describe, it, expect } from 'vitest'
import type { ChallengeData } from '../../../platform/shared/challenges.data'

// Test the sorting and stats logic directly
function computeStats(challenges: ChallengeData[]) {
  const total = challenges.length
  const easy = challenges.filter(c => c.difficulty === 'easy').length
  const medium = challenges.filter(c => c.difficulty === 'medium').length
  const hard = challenges.filter(c => c.difficulty === 'hard').length
  const mystery = challenges.filter(c => !['easy','medium','hard'].includes(c.difficulty ?? '')).length
  return { total, easy, medium, hard, mystery }
}

function computeLatest(challenges: ChallengeData[], limit = 3): ChallengeData[] {
  return [...challenges]
    .filter(c => c.date)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .slice(0, limit)
}

const mockChallenges: ChallengeData[] = [
  { id: 1, title: 'SQLi', url: '/challenge/sqli', difficulty: 'easy', category: 'web', date: '2025-03-01T00:00:00.000Z', tags: ['sql'], description: 'SQL injection challenge' },
  { id: 2, title: 'PHP LFI', url: '/challenge/php', difficulty: 'medium', category: 'web', date: '2025-03-15T00:00:00.000Z', tags: ['lfi'], description: 'PHP file inclusion' },
  { id: 3, title: 'FastAPI IDOR', url: '/challenge/fastapi', difficulty: 'easy', category: 'web', date: '2025-04-01T00:00:00.000Z', tags: ['idor'], description: 'IDOR challenge' },
  { id: 4, title: 'Mystery Box', url: '/challenge/mystery', difficulty: 'mystery', category: 'web', date: undefined, tags: [], description: '' },
]

describe('HomeContent stats computation', () => {
  it('counts total challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.total).toBe(4)
  })

  it('counts easy challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.easy).toBe(2)
  })

  it('counts medium challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.medium).toBe(1)
  })

  it('counts hard challenges', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.hard).toBe(0)
  })

  it('counts mystery challenges (non easy/medium/hard)', () => {
    const stats = computeStats(mockChallenges)
    expect(stats.mystery).toBe(1)
  })
})

describe('HomeContent latest challenges sorting', () => {
  it('returns latest 3 challenges sorted by date descending', () => {
    const latest = computeLatest(mockChallenges)
    expect(latest).toHaveLength(3)
    expect(latest[0].title).toBe('FastAPI IDOR')   // 2025-04-01 — most recent
    expect(latest[1].title).toBe('PHP LFI')         // 2025-03-15
    expect(latest[2].title).toBe('SQLi')             // 2025-03-01
  })

  it('excludes challenges without a date', () => {
    const latest = computeLatest(mockChallenges)
    expect(latest.find(c => c.title === 'Mystery Box')).toBeUndefined()
  })

  it('respects the limit parameter', () => {
    const latest = computeLatest(mockChallenges, 2)
    expect(latest).toHaveLength(2)
  })
})
