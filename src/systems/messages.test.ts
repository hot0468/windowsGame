import { describe, it, expect } from 'vitest'
import {
  channelVisible,
  selectIncoming,
  selectChannel,
  threadVisible,
  turnIndex,
  visibleThreadsOf,
} from './messages'
import { markRankEvent, threadUnlockedByRank } from './rankEvents'
import { threadUnlockedByMaster } from './masters'
import { MESSAGE_SCHEDULE, THREADS, findThread } from '../data/messages'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

/** 테스트용 상태. `createInitialState`를 쓴다(손으로 지으면 필드를 빠뜨린다). */
function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

describe('turnIndex', () => {
  it('1일차 오전이 0, 오후가 1, 2일차 오전이 2다', () => {
    expect(turnIndex(1, 'morning')).toBe(0)
    expect(turnIndex(1, 'afternoon')).toBe(1)
    expect(turnIndex(2, 'morning')).toBe(2)
  })
})

describe('selectIncoming', () => {
  it('같은 턴에는 늘 같은 메시지가 온다 (결정적)', () => {
    expect(selectIncoming(1, 'morning')).toEqual(selectIncoming(1, 'morning'))
  })

  it('편성표를 순환한다 — 대본이 끝나도 바닥나지 않는다', () => {
    const cycle = MESSAGE_SCHEDULE.length
    // 편성표 길이만큼 지난 뒤 같은 자리로 돌아온다(길이가 짝수라 슬롯도 맞물린다).
    expect(selectIncoming(1 + cycle / 2, 'morning')).toEqual(selectIncoming(1, 'morning'))
  })

  it('조용한 턴이 있다 — 매 턴 알림이 뜨면 소음이 된다', () => {
    expect(MESSAGE_SCHEDULE.some((turn) => turn.length === 0)).toBe(true)
  })
})

describe('selectThread', () => {
  it('턴이 지날수록 대화가 쌓인다', () => {
    const early = selectChannel('minji', 1, 'morning')
    const later = selectChannel('minji', 3, 'morning')
    expect(later.length).toBeGreaterThan(early.length)
  })

  it('다른 방의 메시지는 섞이지 않는다', () => {
    for (const m of selectChannel('boss', 5, 'afternoon')) {
      expect(m.channel).toBe('boss')
    }
  })

  it('0턴 이전을 조회해도 터지지 않는다', () => {
    expect(selectChannel('minji', 1, 'morning').length).toBeGreaterThanOrEqual(0)
  })
})

/**
 * 방이 나타나는 조건 (2026-08-08).
 *
 * ⚠️ 지키는 것 셋: ①**첫 판의 카톡 목록은 오픈채팅 둘뿐이다** ②**너아무튼온은 취직해야
 * 방이 생긴다** ③**안 보이는 방의 메시지는 알림에도 안 뜬다**(누르면 열 수 없는 토스트가
 * 되므로). 판정이 `threadVisible` 하나라는 것이 이 셋을 한꺼번에 지탱한다.
 */
describe('방이 나타나는 조건', () => {
  it('첫 판의 카톡에는 오픈채팅만 있다 — 아는 사람 방은 아직 없다', () => {
    const shown = visibleThreadsOf('kakao', state())
    expect(shown.map((t) => t.id)).toEqual(['gym', 'salon'])
    // 오픈채팅에는 조건을 걸지 않는다(초반 선택지가 통째로 사라진다).
    for (const t of shown) expect(t.open).toBe(true)
  })

  it('첫 판의 너아무튼온은 통째로 비어 있다', () => {
    expect(visibleThreadsOf('nateon', state())).toEqual([])
  })

  it('친화력이 오르면 아는 사람 방이 하나씩 열린다', () => {
    const ids = (n: number) => visibleThreadsOf('kakao', state({ stats: { sociability: n } })).map((t) => t.id)
    expect(ids(4)).toContain('family')
    expect(ids(4)).not.toContain('minji')
    expect(ids(8)).toContain('minji')
    expect(ids(16)).toContain('club')
  })

  it('취직하면 업무 방이 생긴다 — 해고되면 다시 사라진다', () => {
    const employed = state({
      employment: {
        careerId: 'dasom-office',
        hiredDay: 1,
        paydayDay: 16,
        attendedDays: [],
        absences: 0,
        checkedDay: 1,
      },
    })
    expect(visibleThreadsOf('nateon', employed).map((t) => t.id)).toEqual(['boss', 'devteam'])
    expect(visibleThreadsOf('nateon', { ...employed, employment: undefined })).toEqual([])
  })

  it('⚠️ 안 보이는 방의 메시지는 알림에도 안 뜬다', () => {
    const fresh = state()
    // 편성표 0턴의 민지 메시지는 첫 판에서 걸러진다(방이 아직 없다).
    expect(channelVisible('minji', fresh)).toBe(false)
    expect(channelVisible('gym', fresh)).toBe(true)
    // 사서함은 방이 아니므로 늘 보인다.
    expect(channelVisible('outlook', fresh)).toBe(true)
  })

  it('조건이 없는 방은 언제나 보인다', () => {
    /* ⚠️ 조건 축이 늘면 여기도 늘어야 한다(`requiresWebtoon` 2026-08-08).
       ⚠️ **랭크 이벤트로 열리는 방은 `Thread`에 조건 필드가 아예 없다**(문턱이
       `data/rankEvents.ts` 한 곳에 있다) — 그래서 필드만 세면 "조건 없음"으로 잘못
       분류된다. 시스템에 물어봐서 걸러낸다(`undefined` = 랭크로 열리는 방이 아니다).
       ⚠️ **스탯 마스터의 방도 완전히 같다**(2026-08-16) — 문턱이 `data/masters.ts`에 있고
       `Thread`에는 조건 필드가 없다. */
    for (const t of THREADS.filter(
      (x) =>
        !x.requires &&
        !x.requiresEmployment &&
        !x.requiresWebtoon &&
        threadUnlockedByRank(state(), x.id) === undefined &&
        threadUnlockedByMaster(state(), x.id) === undefined,
    )) {
      expect(threadVisible(t, state()), t.id).toBe(true)
    }
  })

  it('⚠️ 랭크 이벤트로 열리는 방은 그 이벤트를 겪기 전에는 안 보인다', () => {
    const crew = THREADS.find((t) => t.id === 'running-crew')!
    expect(threadVisible(crew, state())).toBe(false)
    // 겪은 뒤에는 보인다 — 등급이 나중에 내려가도 기록이 남아 계속 보인다.
    const after = markRankEvent(state(), 'running-crew')
    expect(threadVisible(crew, after)).toBe(true)
  })

  it('편성표가 가리키는 채널은 실제로 있는 방이거나 사서함이다 (죽은 알림 방지)', () => {
    for (const turn of MESSAGE_SCHEDULE) {
      for (const m of turn) {
        expect(findThread(m.channel) ?? m.channel === 'outlook', m.channel).toBeTruthy()
      }
    }
  })
})

describe('⚠️ 편성표는 플레이어가 한 일을 단정하지 않는다', () => {
  /*
   * 2026-08-08 설계자 신고: 아무 데도 지원하지 않았는데 1일차 오후에 알바몬이
   * "지원하신 공고의 서류 결과"를 보냈다. 편성표는 **누구에게나 같은 턴에** 도착하므로
   * 상태에 달린 사실을 적으면 반드시 누군가에게 거짓말이 된다.
   *
   * ⚠️ 채팅방은 방에 조건을 걸어 막을 수 있지만(`requiresEmployment`) **사서함에는
   * 그런 게이트가 없다** — 그래서 이 규칙이 편성표 쪽 불변식이어야 한다.
   */
  /* ⚠️ **낱말이 아니라 어미까지 본다.** "지원"만 막으면 "지원은 알바몬에서 하세요"처럼
     누구에게나 참인 문장까지 걸려 애먼 문구를 고치게 된다 — 걸러야 하는 것은
     **플레이어가 한 일을 단정하는 꼴**이다. */
  const STATEFUL = ['지원하신', '지원해 주신', '지원해주신', '면접 일정', '합격', '불합격', '입사', '퇴사']

  it('정규직 절차 어휘가 편성표에 없다 — 그건 파생 메시지의 몫이다', () => {
    for (const [turn, msgs] of MESSAGE_SCHEDULE.entries()) {
      for (const m of msgs) {
        for (const word of STATEFUL) {
          expect(
            `${m.subject ?? ''} ${m.text}`.includes(word),
            `${turn}턴 ${m.id}("${m.from}")이 "${word}"을 단정한다`,
          ).toBe(false)
        }
      }
    }
  })
})
