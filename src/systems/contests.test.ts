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
import {
  CONTEST_CATEGORIES,
  CONTESTS,
  daysUntilDue,
  daysUntilEntry,
  entryOpen,
  findContest,
} from '../data/contests'
import { MAILBOX } from '../data/messages'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 공모전이 깨뜨릴 수 있는 것만 덮는다.** 상금이 돈을 만들므로 "상금 풀이
 * 유한하다"와 "밤 정산에서 굶어 죽지 않는다"에는 증명을 붙이고 나머지는 회귀 수준으로 둔다.
 */

const SINGLE = CONTESTS.find((c) => c.kind === 'single')!
const COMIC = CONTESTS.find((c) => c.kind === 'comic')!

/**
 * 그 공모전의 **접수 기간 안**에 있는 날(2026-08-16 마감 신설).
 * ⚠️ 테스트가 날짜를 손으로 적으면 주기를 손볼 때마다 여기가 낡는다 — 데이터에게 물어본다.
 */
function dayOpenFor(contest: { cycle: number; openDays: number; offset: number }): number {
  for (let day = 1; day <= contest.cycle * 2 + 1; day++) {
    if (entryOpen(contest as never, day)) return day
  }
  throw new Error('접수 기간이 없는 공모전이다')
}

function ready(art = 200, contest = SINGLE): GameState {
  const base = createInitialState('작가')
  return {
    ...base,
    // ⚠️ 접수 기간 안으로 날을 맞춘다 — 아니면 `entryBlockers`가 마감으로 막는다.
    day: dayOpenFor(contest),
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
    const s = withArt(ready(200, COMIC), COMIC.minPages ?? 4)
    const id = openProjects(s)[0].id
    const after = enterContest(s, COMIC.id, { projectId: id })
    expect(openProjects(after)).toHaveLength(0)
    expect(after.projects!.projects[0].usedFor).toBe('contest')
  })

  it('⚠️ 낸 시점의 점수를 박는다 — 내고 나서 더 그려 점수를 올릴 수 없다', () => {
    const s = withArt(ready(200, COMIC), COMIC.minPages ?? 4)
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
/** ⚠️ 스탯 대회도 접수 기간이 있다 — 대회마다 오프셋이 달라 날을 대회에 맞춰 잡는다. */
function fresh(contest?: { cycle: number; openDays: number; offset: number }): GameState {
  const base = createInitialState('작가')
  return contest ? { ...base, day: dayOpenFor(contest) } : base
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
    for (const c of statContests) expect(entryBlockers(fresh(c), c, {})).toEqual([])
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
    const before = { ...fresh(c), stats: { ...fresh().stats, [a]: 100 } }
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

describe('접수 마감 (2026-08-16)', () => {
  /**
   * ⚠️ **마감이 없으면 목표가 아니다.** 예전에는 `judgeDays`(낸 뒤 며칠)만 있고 "언제까지"가
   * 없어 아무 때나 냈다 — 다가오는 날이 아니라 내가 고르는 날이라 미루게 된다.
   */
  it('접수 기간이 아니면 못 낸다 — 사유에 다음 접수일이 함께 적힌다', () => {
    const c = SINGLE
    const shut = { ...ready(200, c), day: dayOpenFor(c) + c.openDays }
    expect(entryOpen(c, shut.day)).toBe(false)
    const reasons = entryBlockers(shut, c, {})
    expect(reasons.some((r) => r.includes('접수 기간이 아닙니다'))).toBe(true)
    // 닫힌 문만 보여 주고 언제 열리는지 안 적으면 막다른 곳이 된다.
    expect(reasons.some((r) => r.includes('일 후 접수 시작'))).toBe(true)
  })

  it('접수 기간의 마지막 날에는 낼 수 있다 — 0은 오늘 마감이지 지난 것이 아니다', () => {
    const c = SINGLE
    const last = dayOpenFor(c) + c.openDays - 1
    expect(daysUntilDue(c, last)).toBe(0)
    expect(entryOpen(c, last)).toBe(true)
  })

  /**
   * ⚠️ **주기로 두되 출품은 여전히 한 번뿐이다.** 다음 회차가 와도 다시 못 낸다 —
   * 이 목록의 상금 총합이 곧 평생 상한이고 그것이 "판은 반드시 끝난다"를 지탱한다.
   * 규칙을 뒤집어(두 번째 회차에 또 내기) 증명한다.
   */
  it('다음 회차가 와도 같은 공모전에 두 번은 못 낸다', () => {
    const c = SINGLE
    const s = withArt(ready(200, c), 1)
    const entered = enterContest(s, c.id, { artworkId: s.artworks![0].id })
    expect(hasEntered(entered, c.id)).toBe(true)
    const nextRound = { ...entered, day: entered.day + c.cycle }
    expect(entryOpen(c, nextRound.day)).toBe(true)
    expect(entryBlockers(nextRound, c, {}).some((r) => r.includes('이미 출품'))).toBe(true)
  })

  /** ⚠️ 전부 같은 날 열리면 목록이 "전부 열림 / 전부 닫힘" 두 상태만 오간다. */
  it('오프셋이 서로 다르다', () => {
    expect(new Set(CONTESTS.map((c) => c.offset)).size).toBe(CONTESTS.length)
  })

  /**
   * ⚠️ **처음 낼 수 있는 하나가 1일차부터 있어야 한다**(편의점 알바가 조건 없는 유일한
   * 알바인 것과 같은 자리) — 없으면 공모전이 판 초반에 통째로 닫힌 문이 된다.
   */
  it('1일차에 접수 중인 공모전이 최소 하나 있다', () => {
    expect(CONTESTS.filter((c) => entryOpen(c, 1)).length).toBeGreaterThan(0)
  })

  it('접수 기간과 주기가 말이 된다 — 기간이 주기보다 길면 늘 열려 있는 셈이다', () => {
    for (const c of CONTESTS) {
      expect(c.openDays, `${c.id}`).toBeGreaterThan(0)
      expect(c.openDays, `${c.id}의 접수 기간이 주기보다 길다`).toBeLessThan(c.cycle)
      expect(c.offset, `${c.id}`).toBeGreaterThanOrEqual(0)
      expect(c.offset, `${c.id}의 오프셋이 주기를 넘는다`).toBeLessThan(c.cycle)
    }
  })

  it('닫혀 있으면 다음 접수까지 남은 날이 1 이상이다', () => {
    const c = SINGLE
    const shut = dayOpenFor(c) + c.openDays
    expect(daysUntilEntry(c, shut)).toBeGreaterThan(0)
    expect(entryOpen(c, shut + daysUntilEntry(c, shut))).toBe(true)
  })
})
