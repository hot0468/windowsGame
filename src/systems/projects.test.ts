import { describe, it, expect } from 'vitest'
import {
  bookRevenue,
  createProject,
  drawIntoProject,
  openProjects,
  pagesOf,
  projectScore,
  projectsOf,
  sellAtComicon,
  sellableProjects,
} from './projects'
import { createInitialState } from './turn'
import { MIN_BOOK_PAGES, QUALITY_MULTIPLIER, WON_PER_PAGE } from '../data/contests'
import { BASE_LIVING_COST, INCOME_CAP_RATIO } from '../data/economy'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 작품집이 깨뜨릴 수 있는 것만 덮는다.** 회지 매출이 돈을 만들므로
 * 상한에는 증명을 붙이고, 나머지는 회귀 테스트 수준으로 둔다.
 */

/** 타블렛을 쥐고 행동력이 넉넉한 판. 여기서 보려는 건 체력이 아니다. */
function ready(day = 1): GameState {
  const base = createInitialState('작가')
  return {
    ...base,
    day,
    inventory: [{ id: 'pen-tablet', day: 1 }],
    stats: { ...base.stats, money: 500_000, stamina: 200, art: 200, creativity: 200 },
  }
}

/**
 * 그 권에 n장 그려 넣는다. 사이사이 행동력·멘탈·돈을 채운다 —
 * 여기서 보려는 것은 자원 소모가 아니라 **장이 실제로 쌓이는가**이다.
 */
function fill(state: GameState, projectId: string, n: number): GameState {
  let s = state
  for (let i = 0; i < n; i++) {
    s = drawIntoProject(
      { ...s, stats: { ...s.stats, stamina: 200, mental: 100, money: 500_000 } },
      projectId,
    )
  }
  return s
}

describe('작품집', () => {
  it('만드는 것은 턴도 돈도 안 쓴다', () => {
    const before = ready()
    const after = createProject(before)
    expect(openProjects(after)).toHaveLength(1)
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
    expect(after.stats.money).toBe(before.stats.money)
  })

  it('이름 번호는 지워도 겹치지 않는다', () => {
    const two = createProject(createProject(ready()))
    const names = openProjects(two).map((p) => p.name)
    expect(new Set(names).size).toBe(2)
    expect(projectsOf(two).nextSerial).toBe(3)
  })

  it('그려 넣으면 1턴이 가고 그 권에 한 장이 쌓인다', () => {
    const made = createProject(ready())
    const id = openProjects(made)[0].id
    const after = drawIntoProject(made, id)
    expect(openProjects(after)[0].pageIds).toHaveLength(1)
    // ⚠️ 그림은 갤러리에도 남는다 — 프로젝트는 **가리키기만** 한다.
    expect(after.artworks).toHaveLength(1)
    expect(pagesOf(after, openProjects(after)[0])[0].id).toBe(after.artworks![0].id)
    expect(after.minute + after.day * 1440).toBeGreaterThan(made.minute + made.day * 1440)
  })

  it('없는 권·게임오버에는 아무 일도 없다', () => {
    const s = createProject(ready())
    expect(drawIntoProject(s, 'nope')).toBe(s)
    const over: GameState = { ...s, recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } }
    expect(drawIntoProject(over, openProjects(s)[0].id)).toBe(over)
    expect(createProject(over)).toBe(over)
  })
})

describe('코미콘 회지', () => {
  it(`${MIN_BOOK_PAGES}장 미만은 회지가 안 된다`, () => {
    const made = createProject(ready())
    const id = openProjects(made)[0].id
    const thin = fill(made, id, MIN_BOOK_PAGES - 1)
    expect(sellableProjects(thin)).toHaveLength(0)
    // 팔려고 해도 상태가 그대로다(반쪽 상태 금지).
    expect(sellAtComicon(thin, id)).toBe(thin)
  })

  it('⚠️ 팔면 그 자리에서 돈이 들어오고 권이 닫힌다', () => {
    const made = createProject(ready())
    const id = openProjects(made)[0].id
    const book = fill(made, id, MIN_BOOK_PAGES)
    const project = openProjects(book)[0]
    const expected = bookRevenue(book, project)
    expect(expected).toBeGreaterThan(0)

    const sold = sellAtComicon({ ...book, stats: { ...book.stats, stamina: 200 } }, id)
    expect(openProjects(sold)).toHaveLength(0)
    expect(projectsOf(sold).soldEarned).toBe(expected)
    expect(projectsOf(sold).projects[0].usedFor).toBe('comicon')
  })

  it('⚠️ 한 번 쓴 권은 다시 못 판다 — 한 번 그린 것으로 두 번 벌지 않는다', () => {
    const made = createProject(ready())
    const id = openProjects(made)[0].id
    const book = fill(made, id, MIN_BOOK_PAGES)
    const sold = sellAtComicon({ ...book, stats: { ...book.stats, stamina: 200 } }, id)
    const retry: GameState = { ...sold, stats: { ...sold.stats, stamina: 200 } }
    // 이미 쓴 권이라 **넘긴 상태를 그대로** 돌려준다(반쪽 상태 금지).
    expect(sellAtComicon(retry, id)).toBe(retry)
  })

  it('장수가 많을수록 더 번다 (설계자 지시)', () => {
    const base = ready()
    const a = createProject(base)
    const idA = openProjects(a)[0].id
    const thin = fill(a, idA, MIN_BOOK_PAGES)
    const thick = fill(thin, idA, 2)
    expect(bookRevenue(thick, openProjects(thick)[0])).toBeGreaterThan(
      bookRevenue(thin, openProjects(thin)[0]),
    )
  })
})

describe('⚠️ 불변식 — 회지가 물가를 이기지 못한다', () => {
  /*
   * 회지는 공모전과 달리 **몇 번이든 반복할 수 있는 수입원**이라 상한이 데이터에만 있다.
   * 한 장을 그리는 데 1턴이 드므로 **장당 수익이 곧 턴당 수익**이고 하루는 슬롯 둘이다.
   * (판매 자체도 1턴을 쓰므로 실제 수익률은 이 계산보다 더 낮다.)
   */
  const best = Math.max(...QUALITY_MULTIPLIER.map((q) => q.multiplier))
  const perTurn = WON_PER_PAGE * best
  /*
   * ⚠️ **가장 싼 집 기준으로 잰다**(트위터 정산과 같은 방식) — 고시원으로 옮기면 생활비가
   * 절반 아래로 내려가므로, 기본 집으로 재면 실제로는 이길 수 있는데 통과하는 판이 된다.
   */
  const ceiling = BASE_LIVING_COST * INCOME_CAP_RATIO.session

  it('가장 잘 팔리는 회지도 하루 수입이 생활비 1.5배를 넘지 않는다', () => {
    expect(perTurn * 2).toBeLessThan(ceiling)
  })

  it('규칙을 뒤집으면 실패한다 — 배율을 두 배로 하면 부등식이 깨진다', () => {
    expect(perTurn * 2 * 2).toBeGreaterThan(ceiling)
  })

  it('완성도 구간은 내림차순이고 0을 덮는다 — 어떤 점수든 배율이 하나 걸린다', () => {
    const mins = QUALITY_MULTIPLIER.map((q) => q.minScore)
    expect([...mins].sort((a, b) => b - a)).toEqual(mins)
    expect(mins[mins.length - 1]).toBe(0)
  })

  it('평균 완성도는 그림들의 평균이다 — 빈 권은 0', () => {
    const made = createProject(ready())
    const id = openProjects(made)[0].id
    expect(projectScore(made, openProjects(made)[0])).toBe(0)
    const one = fill(made, id, 1)
    expect(projectScore(one, openProjects(one)[0])).toBeGreaterThan(0)
  })
})
