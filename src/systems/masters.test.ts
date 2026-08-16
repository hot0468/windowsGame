import { describe, it, expect } from 'vitest'
import { MASTERS, MASTER_GIFT_RATIO, MASTER_MENTAL, MASTER_THREADS } from '../data/masters'
import { findItem } from '../data/items'
import {
  arrivedMasters,
  dueMasters,
  giftAmount,
  masterMessages,
  masterReached,
  receiveGift,
  reviveMasters,
  threadUnlockedByMaster,
} from './masters'
import { THREADS } from '../data/messages'
import { growthCap, owns } from './turn'
import { rankOf } from './rank'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type { GameState, GrowthStatKey, Stats } from '../types/game'

const state = (over: Partial<GameState> = {}): GameState =>
  ({
    playerName: '테스트',
    day: 30,
    slot: 'morning',
    stats: { ...INITIAL_STATS },
    recentActivities: [],
    seenEndingIds: [],
    gameOver: null,
    ...over,
  }) as GameState

/** 그 스탯을 문턱(A)까지 올린 상태. */
const atRank = (key: GrowthStatKey, over: Partial<GameState> = {}): GameState =>
  state({ stats: { ...INITIAL_STATS, [key]: growthCap(key) * 0.5 } as Stats, ...over })

describe('스승 목록', () => {
  /**
   * ⚠️ 스승이 없는 스탯은 올려도 아무도 찾아오지 않아 플레이어가 그 축을 버린다
   * (랭크 이벤트가 14종을 다 덮는 것과 같은 규칙).
   */
  it('성장 스탯 14종을 빠짐없이 덮는다', () => {
    const covered = MASTERS.map((m) => m.key).sort()
    expect(covered).toEqual([...GROWTH_STAT_KEYS].sort())
  })

  it('id가 서로 다르다 — 겹치면 한 스승의 기록이 다른 스승을 닫는다', () => {
    expect(new Set(MASTERS.map((m) => m.id)).size).toBe(MASTERS.length)
  })

  /**
   * ⚠️ **이 게임의 종결은 물가가 만든다.** 선물이 팔리면 스승 열넷이 곧 목돈이 되어
   * 새 수입원이 생긴다 — `resale.ts`가 `buyable !== false`로 거르므로 여기서 그 조건을
   * 데이터에서 직접 확인한다.
   */
  it('기념품은 전부 존재하고, 살 수도 팔 수도 없다', () => {
    for (const m of MASTERS) {
      const item = findItem(m.gift)
      expect(item, `${m.id}의 선물 ${m.gift}이 SHOP_ITEMS에 없다`).toBeDefined()
      expect(item!.buyable, `${m.gift}이 팔린다`).toBe(false)
    }
  })

  it('선물이 서로 다르다 — 같으면 두 번째 스승이 빈손으로 온다', () => {
    expect(new Set(MASTERS.map((m) => m.gift)).size).toBe(MASTERS.length)
  })

  /** ⚠️ 돈을 주면 수입원이 하나 더 생긴다(`data/masters.ts`의 규칙). */
  it('선물에 돈이 없다 — 기념품 값은 0이다', () => {
    for (const m of MASTERS) expect(findItem(m.gift)!.price).toBe(0)
  })
})

describe('가르침의 크기', () => {
  /**
   * ⚠️ 고정값으로 두면 상한이 100인 평판·도덕·예의범절에서만 선물이 세 배가 된다.
   * 규칙을 뒤집어(비율 대신 고정값) 두면 이 검사가 그 자리에서 터진다.
   */
  it('상한의 비율이다 — 상한 100짜리와 999짜리가 같은 몫을 받지 않는다', () => {
    expect(giftAmount('knowledge')).toBe(Math.round(999 * MASTER_GIFT_RATIO))
    expect(giftAmount('reputation')).toBe(Math.round(100 * MASTER_GIFT_RATIO))
    expect(giftAmount('knowledge')).toBeGreaterThan(giftAmount('reputation'))
  })

  it('언제나 1 이상이다 — 0이면 가르침을 받고도 아무것도 안 오른다', () => {
    for (const key of GROWTH_STAT_KEYS) expect(giftAmount(key)).toBeGreaterThanOrEqual(1)
  })
})

describe('찾아오는 조건', () => {
  it('문턱 아래면 안 온다', () => {
    expect(dueMasters(state())).toEqual([])
  })

  it('A에 닿으면 그 스탯의 스승만 온다', () => {
    const due = dueMasters(atRank('knowledge'))
    expect(due.map((m) => m.key)).toEqual(['knowledge'])
  })

  /** 문턱은 절대값이 아니라 비율이라 상한이 달라도 같은 등급에서 열려야 한다. */
  it('상한 100짜리 스탯도 같은 등급에서 열린다', () => {
    expect(dueMasters(atRank('reputation')).map((m) => m.key)).toEqual(['reputation'])
    expect(rankOf('reputation', 50)).toBe('A')
  })

  it('게임이 끝났으면 아무도 안 온다 — 그때 읽혀야 하는 것은 엔딩이다', () => {
    expect(dueMasters(atRank('knowledge', { gameOver: 'bankrupt' }))).toEqual([])
  })

  it('여럿이 문턱을 넘으면 전부 돌려준다 — 하나만 주면 나머지가 밀린다', () => {
    const both = state({
      stats: { ...INITIAL_STATS, knowledge: 500, athletics: 500 } as Stats,
    })
    expect(dueMasters(both).map((m) => m.key).sort()).toEqual(['athletics', 'knowledge'])
  })
})

describe('선물 받기', () => {
  const master = MASTERS.find((m) => m.key === 'knowledge')!

  it('스탯·멘탈이 오르고 기념품이 인벤토리에 들어온다', () => {
    const before = atRank('knowledge', { stats: { ...INITIAL_STATS, knowledge: 500, mental: 50 } })
    const after = receiveGift(before, master.id)
    expect(after.stats.knowledge).toBe(500 + giftAmount('knowledge'))
    expect(after.stats.mental).toBe(50 + MASTER_MENTAL)
    expect(owns(after, master.gift)).toBe(true)
  })

  /** ⚠️ 돈을 만지면 "판은 물가로 끝난다"가 흔들린다. */
  it('소지금은 한 푼도 안 움직인다', () => {
    const before = atRank('knowledge')
    expect(receiveGift(before, master.id).stats.money).toBe(before.stats.money)
  })

  /**
   * ⚠️ **기록이 곧 사용권이다.** 이 검사가 깨지면 방에 들어갈 때마다 같은 선물을 무한히 받는다.
   */
  it('두 번은 못 받는다', () => {
    const once = receiveGift(atRank('knowledge'), master.id)
    expect(receiveGift(once, master.id)).toBe(once)
  })

  /**
   * ⚠️ **문턱을 함수가 다시 본다.** "아직 안 받았나"만 보면 방을 거치지 않고 이 함수를
   * 부르는 통로가 게이트를 통째로 지나간다 — 규칙을 뒤집어 증명한다.
   */
  it('문턱을 안 넘었으면 방을 거치지 않고 불러도 아무 일이 없다', () => {
    const low = state()
    expect(receiveGift(low, master.id)).toBe(low)
  })

  it('모르는 id는 아무 일도 안 한다', () => {
    const s = atRank('knowledge')
    expect(receiveGift(s, 'master-없음')).toBe(s)
  })

  it('상한에 닿아 있으면 스탯은 안 오르고 멘탈과 기념품은 남는다', () => {
    const full = state({
      stats: { ...INITIAL_STATS, knowledge: growthCap('knowledge'), mental: 50 },
    })
    const after = receiveGift(full, master.id)
    expect(after.stats.knowledge).toBe(growthCap('knowledge'))
    expect(after.stats.mental).toBe(50 + MASTER_MENTAL)
    expect(owns(after, master.gift)).toBe(true)
  })

  it('받고 나면 다시 찾아오지 않는다', () => {
    const after = receiveGift(atRank('knowledge'), master.id)
    expect(dueMasters(after)).toEqual([])
  })

  /** ⚠️ 지우면 등급을 오르내리며 같은 선물을 무한히 받는다. */
  it('등급이 내려가도 기록은 남는다', () => {
    const after = receiveGift(atRank('knowledge'), master.id)
    const dropped = { ...after, stats: { ...after.stats, knowledge: 0 } }
    expect(masterReached(dropped, master)).toBe(false)
    expect(dueMasters(dropped)).toEqual([])
  })
})

describe('세이브 보정', () => {
  it('모르는 id는 버린다', () => {
    expect(reviveMasters(['master-knowledge', '없는거', 42])).toEqual(['master-knowledge'])
  })

  it('배열이 아니면 undefined', () => {
    expect(reviveMasters('아니다')).toBeUndefined()
    expect(reviveMasters([])).toBeUndefined()
  })
})

describe('카톡 방', () => {
  /** ⚠️ 목록을 두 곳에 적으면 스승 이름과 방 이름이 갈린다(파생이 규칙이다). */
  it('스승마다 방이 하나씩 있고 `THREADS`에 실려 있다', () => {
    expect(MASTER_THREADS).toHaveLength(MASTERS.length)
    for (const m of MASTERS) {
      const thread = THREADS.find((t) => t.id === m.id)
      expect(thread, `${m.id}의 방이 THREADS에 없다`).toBeDefined()
      expect(thread!.name).toBe(m.name)
      expect(thread!.app).toBe('kakao')
    }
  })

  /** ⚠️ 오픈채팅에는 조건을 걸지 않는다는 규칙과 부딪히지 않아야 한다. */
  it('오픈채팅이 아니다 — 아는 사람이 개인적으로 연락해 온 것이다', () => {
    for (const t of MASTER_THREADS) expect('open' in t).toBe(false)
  })

  it('문턱 아래면 방이 안 보이고, 넘으면 보인다', () => {
    expect(threadUnlockedByMaster(state(), 'master-knowledge')).toBe(false)
    expect(threadUnlockedByMaster(atRank('knowledge'), 'master-knowledge')).toBe(true)
  })

  /** ⚠️ `undefined`라야 기존 방이 이 게이트를 그냥 지나간다. */
  it('스승의 방이 아니면 undefined다', () => {
    expect(threadUnlockedByMaster(state(), 'minji')).toBeUndefined()
  })

  /**
   * ⚠️ **한 번 열리면 계속 보인다.** 등급이 내려갔다고 방이 사라지면 대화가 있었던
   * 사람이 연락처에서 없어진다.
   */
  it('선물을 받은 뒤에는 등급이 내려가도 방이 남는다', () => {
    const after = receiveGift(atRank('knowledge'), 'master-knowledge')
    const dropped = { ...after, stats: { ...after.stats, knowledge: 0 } }
    expect(threadUnlockedByMaster(dropped, 'master-knowledge')).toBe(true)
    expect(arrivedMasters(dropped).map((m) => m.id)).toEqual(['master-knowledge'])
  })

  /**
   * ⚠️ **말이 없으면 방만 뜬다** — 화면에 "아직 대화가 없습니다"만 남는다
   * (랭크 이벤트 방에서 실제로 났던 버그라 같은 순회로 지킨다).
   */
  it('열린 방마다 첫 마디가 짝으로 온다', () => {
    for (const m of MASTERS) {
      const msgs = masterMessages(atRank(m.key))
      const mine = msgs.find((x) => x.channel === m.id)
      expect(mine, `${m.id}의 첫 마디가 없다`).toBeDefined()
      expect(mine!.from).toBe(m.name)
      expect(mine!.text.length).toBeGreaterThan(0)
    }
  })

  it('문턱을 안 넘었으면 아무 말도 안 온다', () => {
    expect(masterMessages(state())).toEqual([])
  })
})
