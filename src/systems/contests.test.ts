import { describe, it, expect } from 'vitest'
import {
  advanceContests,
  canEnter,
  contestMessages,
  contestsStateOf,
  enterContest,
  entryBlockers,
  hasEntered,
  openContests,
  prizeFor,
  statScore,
} from './contests'
import { createProject, drawIntoProject, openProjects } from './projects'
import { createInitialState, growthCap } from './turn'
import { CONTEST_CATEGORIES, CONTESTS, findContest } from '../data/contests'
import { MAILBOX } from '../data/messages'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 공모전이 깨뜨릴 수 있는 것만 덮는다.** 상금이 돈을 만들므로 "상금 풀이
 * 유한하다"와 "밤 정산에서 굶어 죽지 않는다"에는 증명을 붙이고 나머지는 회귀 수준으로 둔다.
 */

const SINGLE = CONTESTS.find((c) => c.kind === 'single')!
const COMIC = CONTESTS.find((c) => c.kind === 'comic')!

function ready(art = 200): GameState {
  const base = createInitialState('작가')
  return {
    ...base,
    inventory: [{ id: 'pen-tablet', day: 1 }],
    stats: { ...base.stats, money: 500_000, stamina: 200, art, creativity: art },
  }
}

function withArt(state: GameState, n: number): GameState {
  let s = createProject(state)
  const id = openProjects(s)[0].id
  for (let i = 0; i < n; i++) {
    s = drawIntoProject(
      { ...s, stats: { ...s.stats, stamina: 200, mental: 100, money: 500_000 } },
      id,
    )
  }
  return s
}

describe('출품', () => {
  it('⚠️ 턴도 돈도 안 쓴다 — 봉투를 부치는 일이다', () => {
    const s = withArt(ready(), 1)
    const artworkId = s.artworks![0].id
    const after = enterContest(s, SINGLE.id, { artworkId })
    expect(contestsStateOf(after).entries).toHaveLength(1)
    expect(after.day).toBe(s.day)
    expect(after.slot).toBe(s.slot)
    expect(after.stats.money).toBe(s.stats.money)
  })

  it('발표일은 출품일 + judgeDays다', () => {
    const s = withArt(ready(), 1)
    const after = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    expect(contestsStateOf(after).entries[0].resultDay).toBe(s.day + SINGLE.judgeDays)
  })

  it('⚠️ 한 공모전에는 한 번만 낸다 — 상금 풀이 유한해야 판이 끝난다', () => {
    const s = withArt(ready(), 2)
    const one = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    const twice = enterContest(one, SINGLE.id, { artworkId: s.artworks![1].id })
    expect(twice).toBe(one)
    expect(entryBlockers(one, SINGLE)).toContain('이미 출품한 공모전입니다')
    expect(openContests(one).map((c) => c.id)).not.toContain(SINGLE.id)
    expect(hasEntered(one, SINGLE.id)).toBe(true)
  })

  it('⚠️ 장수 제한은 자격 요건이다 — 모자라도 넘쳐도 못 낸다', () => {
    const thin = withArt(ready(), (COMIC.minPages ?? 1) - 1)
    const project = openProjects(thin)[0]
    expect(canEnter(thin, COMIC, { projectId: project.id })).toBe(false)
    expect(entryBlockers(thin, COMIC, { projectId: project.id }).join()).toContain(
      `${COMIC.minPages}장 이상`,
    )

    const fat = withArt(ready(), (COMIC.maxPages ?? 1) + 1)
    const big = openProjects(fat)[0]
    expect(entryBlockers(fat, COMIC, { projectId: big.id }).join()).toContain(
      `${COMIC.maxPages}장 이하`,
    )
  })

  it('⚠️ 낸 작품집은 잠긴다 — 회지로도 파는 이중 수입을 막는다', () => {
    const s = withArt(ready(), COMIC.minPages ?? 4)
    const id = openProjects(s)[0].id
    const after = enterContest(s, COMIC.id, { projectId: id })
    expect(openProjects(after)).toHaveLength(0)
    expect(after.projects!.projects[0].usedFor).toBe('contest')
  })

  it('⚠️ 낸 시점의 점수를 박는다 — 내고 나서 더 그려 점수를 올릴 수 없다', () => {
    const s = withArt(ready(), COMIC.minPages ?? 4)
    const id = openProjects(s)[0].id
    const entered = enterContest(s, COMIC.id, { projectId: id })
    const score = contestsStateOf(entered).entries[0].score
    // 낸 뒤에 스탯이 크게 올라도 심사는 그때의 점수만 본다.
    const grown: GameState = { ...entered, stats: { ...entered.stats, art: 999, creativity: 999 } }
    expect(contestsStateOf(grown).entries[0].score).toBe(score)
  })

  it('없는 공모전·게임오버에는 아무 일도 없다', () => {
    const s = withArt(ready(), 1)
    expect(enterContest(s, 'nope', { artworkId: s.artworks![0].id })).toBe(s)
    const over: GameState = { ...s, gameOver: 'bankrupt' }
    expect(enterContest(over, SINGLE.id, { artworkId: s.artworks![0].id })).toBe(over)
  })
})

describe('심사와 발표', () => {
  it('발표일 전에는 아무것도 확정되지 않는다', () => {
    const s = withArt(ready(), 1)
    const entered = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    expect(advanceContests(entered)).toBe(entered)
  })

  it('⚠️ 발표일 밤에 상금이 소지금으로 들어오고 평판이 오른다', () => {
    const s = withArt(ready(400), 1) // 실력을 높여 대상 언저리로 만든다
    const entered = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    const day = contestsStateOf(entered).entries[0].resultDay
    const judged = advanceContests({ ...entered, day })
    const entry = contestsStateOf(judged).entries[0]
    expect(entry.prize).toBeDefined()
    if (entry.prize !== '') {
      expect(judged.stats.money).toBeGreaterThan(entered.stats.money)
      expect(judged.stats.reputation).toBeGreaterThan(entered.stats.reputation)
      expect(contestsStateOf(judged).wins).toBe(1)
    }
  })

  it('점수가 모자라면 낙선이고 그것도 결과다 (돈은 안 움직인다)', () => {
    const s = withArt(ready(1), 1) // 실력 바닥
    const entered = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    const day = contestsStateOf(entered).entries[0].resultDay
    const judged = advanceContests({ ...entered, day })
    expect(contestsStateOf(judged).entries[0].prize).toBe('')
    expect(contestsStateOf(judged).wins).toBe(0)
    expect(judged.stats.money).toBe(entered.stats.money)
  })

  it('결과가 메일로 온다 — 새 알림 창구를 만들지 않는다', () => {
    const s = withArt(ready(400), 1)
    const entered = enterContest(s, SINGLE.id, { artworkId: s.artworks![0].id })
    const day = contestsStateOf(entered).entries[0].resultDay
    const judged = advanceContests({ ...entered, day })
    const mails = contestMessages(judged)
    expect(mails).toHaveLength(1)
    expect(mails[0].channel).toBe(MAILBOX.id)
  })

  it('낸 적 없으면 밤 정산이 아무것도 안 한다', () => {
    const s = ready()
    expect(advanceContests(s)).toBe(s)
    expect(contestMessages(s)).toEqual([])
  })
})

describe('⚠️ 불변식 — 상금이 물가를 이기지 못한다', () => {
  it('공모전은 전부 한 번씩만 낼 수 있으므로 상금 총합이 평생 상한이다', () => {
    const total = CONTESTS.reduce((sum, c) => sum + Math.max(...c.prizes.map((p) => p.money)), 0)
    /*
     * 100일 판의 생활비 총액을 대략만 잡아도(초반 30,000원 기준 하루 한 번) 300만이 넘고
     * 후반 구간은 그 세 배다. 상금을 전부 대상으로 쓸어 담아도 **판을 못 늘린다**는 것이
     * 이 부등식의 뜻이고, 정확한 수치가 아니라 자릿수를 지킨다.
     */
    expect(total).toBeLessThan(30_000 * 100 * 4)
  })

  it('상 목록은 점수 내림차순이다 — 판정이 위에서부터 처음 걸리는 것 하나이므로', () => {
    for (const c of CONTESTS) {
      const mins = c.prizes.map((p) => p.minScore)
      expect([...mins].sort((a, b) => b - a), `${c.id}의 상이 내림차순이 아니다`).toEqual(mins)
      expect(c.prizes.length).toBeGreaterThan(0)
      expect(findContest(c.id)).toBeDefined()
    }
  })

  it('만화 공모전은 장수 제한이 성립한다 (min ≤ max)', () => {
    for (const c of CONTESTS.filter((x) => x.kind === 'comic')) {
      expect(c.minPages, `${c.id}에 최소 장수가 없다`).toBeGreaterThan(0)
      expect(c.maxPages!).toBeGreaterThanOrEqual(c.minPages!)
    }
  })

  it('조건 없이 처음 낼 수 있는 단일 공모전이 있다 — 공모전이 통째로 닫힌 문이 아니다', () => {
    expect(CONTESTS.filter((c) => c.kind === 'single').length).toBeGreaterThan(0)
    const easiest = Math.min(
      ...CONTESTS.filter((c) => c.kind === 'single').map(
        (c) => c.prizes[c.prizes.length - 1].minScore,
      ),
    )
    // 초반 실력(비율 0.2 언저리)으로도 입선 하나는 닿아야 한다.
    expect(easiest).toBeLessThanOrEqual(0.2)
  })

  it('prizeFor는 점수에 맞는 상 하나를 돌려준다', () => {
    const top = SINGLE.prizes[0]
    expect(prizeFor(SINGLE, top.minScore)?.label).toBe(top.label)
    expect(prizeFor(SINGLE, -1)).toBeUndefined()
  })
})

/** 갓 시작한 판. 스탯 대회는 낼 물건이 없으므로 이것만으로 충분하다. */
function fresh(): GameState {
  return createInitialState('작가')
}

describe('스탯 대회 (그림이 아닌 공모전)', () => {
  const statContests = CONTESTS.filter((c) => c.kind === 'stat')

  it('심사 스탯이 적혀 있고 실제 성장 스탯이다', () => {
    expect(statContests.length).toBeGreaterThan(0)
    for (const c of statContests) {
      expect(c.judgedBy?.length, `${c.id}에 심사 스탯이 없다`).toBeGreaterThan(0)
      for (const k of c.judgedBy!) expect(GROWTH_STAT_KEYS).toContain(k)
    }
  })

  it('⚠️ 낼 물건이 없어도 낼 수 있다 — 고르기를 요구하면 영영 못 낸다', () => {
    for (const c of statContests) expect(entryBlockers(fresh(), c, {})).toEqual([])
  })

  it('점수는 심사 스탯의 평균 비율이다 — 상한이 다른 스탯을 섞어도 한쪽이 독차지하지 않는다', () => {
    const c = statContests[0]
    const [a, b] = c.judgedBy!
    const half = {
      ...fresh(),
      stats: { ...fresh().stats, [a]: growthCap(a), [b]: 0 },
    }
    const full = {
      ...fresh(),
      stats: { ...fresh().stats, [a]: growthCap(a), [b]: growthCap(b) },
    }
    expect(statScore(full, c)).toBeCloseTo(1, 5)
    // 한쪽만 만점이면 절반이다 — "이 대회는 둘을 본다"가 그 뜻이다.
    expect(statScore(half, c)).toBeCloseTo(0.5, 5)
  })

  it('⚠️ 낸 시점의 점수로 박힌다 — 낸 뒤에 올려도 결과가 안 바뀐다', () => {
    const c = statContests[0]
    const [a] = c.judgedBy!
    const before = { ...fresh(), stats: { ...fresh().stats, [a]: 100 } }
    const entered = enterContest(before, c.id, {})
    const entry = contestsStateOf(entered).entries.find((e) => e.contestId === c.id)!
    const grown = { ...entered, stats: { ...entered.stats, [a]: growthCap(a) } }
    expect(contestsStateOf(grown).entries.find((e) => e.contestId === c.id)!.score).toBe(entry.score)
  })

  it('⚠️ 분야 칩은 데이터에서 파생된다 — 누르면 빈 목록이 나오는 칩이 없다', () => {
    for (const cat of CONTEST_CATEGORIES) {
      expect(CONTESTS.some((c) => c.category === cat), `${cat} 분야에 대회가 없다`).toBe(true)
    }
    for (const c of CONTESTS) expect(CONTEST_CATEGORIES).toContain(c.category)
  })
})
