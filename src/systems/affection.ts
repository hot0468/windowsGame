import {
  AFFECTION_CAP,
  AFFECTION_DECAY_PER_DAY,
  AFFECTION_FLOOR,
  AFFECTION_FOR_ENDING,
  AFFECTION_GRACE_DAYS,
  AFFECTION_PER_MEET,
  CLOSE_MENTAL_BONUS,
  PEOPLE,
  STAGE_LINES,
  personOfActivity,
} from '../data/relations'
import type { Person, RelationStage } from '../data/relations'
import type { GameState } from '../types/game'

/**
 * 호감도 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(`weather.ts`·`illness.ts`와 같다). 만남의 비용(턴·돈)은
 * 전부 활동이 갖고 여기서 하는 일은 숫자 하나를 올리는 것뿐이다 — 그래서 밸런스
 * 시뮬레이션이 관계를 몰라도 그대로 성립한다.
 *
 * ## ⚠️ 스탯이 아니다
 * `Stats`에 넣지 않은 이유: 성장 스탯은 **하나의 값**이고 호감도는 **사람마다 다른 값**이다.
 * `Stats`에 `affectionMinji`처럼 넣기 시작하면 `STAT_NAMES`·`STAT_META`·`growthCap`·랭크가
 * 인물 수만큼 늘어나고, 스탯창이 관계 명단이 된다.
 */

/** 그 사람의 호감도. 만난 적 없으면 0. */
export function affectionOf(state: GameState, personId: string): number {
  return state.affection?.[personId] ?? 0
}

/**
 * 그 활동을 실행한 결과로 호감도를 올린다. **관계와 무관한 활동이면 상태를 그대로 돌려준다.**
 *
 * ⚠️ **통로를 가리지 않는다** — 대화방 [만나러 가기]든 스케줄러 예약이든 같다
 * (`Person.activityId` 주석). 대화방에만 걸면 예약으로 나간 모임이 관계를 안 만든다.
 * ⚠️ 상한에서 멈추되 **상태 객체를 새로 만들지 않는다**(이미 100이면 같은 객체를 돌려준다) —
 * 그래야 호출부가 `!==`로 "실제로 올랐는가"를 물을 수 있다.
 */
export function creditAffection(state: GameState, activityId: string): GameState {
  const person = personOfActivity(activityId)
  if (!person) return state
  const now = affectionOf(state, person.id)
  const next = Math.min(AFFECTION_CAP, now + AFFECTION_PER_MEET)
  /* ⚠️ **상한이라 호감도가 그대로여도 만난 날은 찍는다.** 안 찍으면 100까지 채운
     사람이 그날부터 식기 시작해, 가장 친한 사람이 가장 빨리 멀어진다. */
  return {
    ...state,
    affection: { ...(state.affection ?? {}), [person.id]: next },
    lastMet: { ...(state.lastMet ?? {}), [person.id]: state.day },
  }
}

/**
 * **안 만난 날만큼 식힌다.** 취침 정산이 하루에 한 번 부른다.
 *
 * ## ⚠️ 왜 "마지막으로 만난 날"에서 다시 계산하는가
 * 하루치씩 깎아 나가지 않고 **매번 처음부터 다시 잰다**(`기준값 − 지난 날수`). 그래야
 * 자동 진행으로 며칠이 한 번에 흘러도, 세이브를 이어 열어도 결과가 같다 — "며칠 빠뜨렸나"를
 * 세는 코드가 없으면 빠뜨릴 수도 없다(`advanceEmployment`의 커서와 같은 판단).
 *
 * ⚠️ **바닥 아래로는 안 내려간다**(`AFFECTION_FLOOR`) — 사유는 그 상수 주석에 있다.
 * ⚠️ **이미 바닥 아래인 값은 건드리지 않는다**: 아직 한 번밖에 안 만난 사람(8)을
 * 바닥(30)으로 **올려 주면** 안 되기 때문이다.
 */
export function decayAffection(state: GameState): GameState {
  const affection = state.affection
  if (!affection) return state
  let changed = false
  const next: Record<string, number> = { ...affection }
  for (const person of PEOPLE) {
    const now = affection[person.id]
    if (now === undefined || now <= AFFECTION_FLOOR) continue
    /* 만난 기록이 없으면(옛 세이브) 오늘 만난 것으로 친다 — 열자마자 식지 않게. */
    const last = state.lastMet?.[person.id] ?? state.day
    const idle = state.day - last - AFFECTION_GRACE_DAYS
    if (idle <= 0) continue
    const cooled = Math.max(AFFECTION_FLOOR, now - idle * AFFECTION_DECAY_PER_DAY)
    if (cooled === now) continue
    next[person.id] = cooled
    changed = true
  }
  return changed ? { ...state, affection: next } : state
}

/**
 * **지금 식고 있는가.** 대화창이 이 하나를 보고 안내 줄을 띄운다.
 *
 * ⚠️ **바닥에 닿았으면 false다** — 더 안 줄어드는데 "멀어지는 중"이라고 하면 거짓말이다.
 * ⚠️ 판정을 화면이 다시 짜지 않게 여기 둔다(`decayAffection`과 **같은 조건**이라야
 * 안내와 실제가 어긋나지 않는다).
 */
export function isCooling(state: GameState, personId: string): boolean {
  const now = affectionOf(state, personId)
  if (now <= AFFECTION_FLOOR) return false
  const last = state.lastMet?.[personId] ?? state.day
  return state.day - last > AFFECTION_GRACE_DAYS
}

/**
 * 가까운 사람을 만나 **더 돌아오는 멘탈**. 아니면 0이다.
 *
 * ⚠️ **`turn.ts`가 활동 효과에 얹는다** — 여기서 상태를 만지지 않는 것은 이 파일의
 * 규칙이다(만남의 비용·보상은 전부 활동이 갖는다). 판정만 여기 있는 이유는 **단계를
 * 아는 곳이 여기 하나**라서다.
 * ⚠️ **만나기 전 단계로 잰다**: 이번 만남으로 `close`가 되는 판에 보너스를 주면
 * "처음 60을 넘긴 그 턴"만 두 번 이득이 된다.
 */
export function meetMentalBonus(state: GameState, activityId: string): number {
  const person = personOfActivity(activityId)
  if (!person) return 0
  return stageOf(state, person.id) === 'close' ? CLOSE_MENTAL_BONUS : 0
}

/**
 * 그 사람과의 **단계**. 문턱은 이미 있는 두 값을 그대로 쓴다(바닥·엔딩 문턱) —
 * 단계용 문턱을 따로 잡으면 "부가엔딩은 열렸는데 아직 서먹한 말"이 나온다.
 */
export function stageOf(state: GameState, personId: string): RelationStage {
  const now = affectionOf(state, personId)
  if (now >= AFFECTION_FOR_ENDING) return 'close'
  if (now > AFFECTION_FLOOR) return 'near'
  return 'far'
}

/**
 * 단계에 따라 그 사람이 방에 남기는 말. **아직 안 가까우면 아무 말도 없다.**
 *
 * ⚠️ **`derivedMessages`가 부른다**(`ChatApp`) — 편성표에 넣을 수 없는 말이라서다:
 * 편성표는 (day, slot)만 보고 누구에게나 같은 것을 주는데, 이 말은 **그 사람과 내가
 * 얼마나 가까운가**에 달렸다(주말 호출·랭크 이벤트와 같은 자리).
 * ⚠️ 방이 아직 안 열린 사람은 건너뛴다 — 안 그러면 목록에 없는 방의 알림이 뜬다.
 */
export function stageMessages(
  state: GameState,
): { id: string; channel: string; from: string; text: string }[] {
  const out: { id: string; channel: string; from: string; text: string }[] = []
  for (const person of PEOPLE) {
    const stage = stageOf(state, person.id)
    const text = STAGE_LINES[person.id]?.[stage]
    if (!text) continue
    /* ⚠️ id에 단계를 섞는다 — 안 섞으면 가까워져 말이 바뀌어도 토스트 중복 제거에
       걸려 새 말이 안 뜬다(택배 알림이 날짜를 섞는 것과 같은 이유). */
    out.push({ id: `stage-${person.id}-${stage}`, channel: person.threadId, from: person.name, text })
  }
  return out
}

/** 부가엔딩이 붙을 만큼 가까운가. */
export function hasRelationEnding(state: GameState, personId: string): boolean {
  return affectionOf(state, personId) >= AFFECTION_FOR_ENDING
}

/**
 * 본엔딩에 얹을 **부가엔딩 하나**. 아무도 문턱을 못 넘었으면 없다.
 *
 * ⚠️ **가장 높은 한 사람만이다**(`data/relations.ts`의 규칙). 동점이면 `PEOPLE` 순서가
 * 가른다 — 무작위로 고르면 같은 세이브가 새로 고칠 때마다 다른 사람을 말한다.
 */
export function relationEndingFor(state: GameState): Person | undefined {
  return PEOPLE.filter((p) => hasRelationEnding(state, p.id)).sort(
    (a, b) => affectionOf(state, b.id) - affectionOf(state, a.id),
  )[0]
}

/**
 * 세이브 보정. **못 믿을 값은 그 사람만 버린다**(전체를 버리지 않는다 — 호감도는 돈을
 * 만들지 않으므로 한 칸이 깨졌다고 관계 전부를 지울 이유가 없다).
 * ⚠️ 모르는 인물 id는 버린다: 사람을 지우거나 이름을 바꾼 뒤에도 세이브에 남아 도감의
 * 개수를 흔들면 "몇 명 중 몇 명"이 거짓이 된다.
 */
export function reviveAffection(raw: unknown): GameState['affection'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const person of PEOPLE) {
    const value = (raw as Record<string, unknown>)[person.id]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    out[person.id] = Math.min(AFFECTION_CAP, Math.round(value))
  }
  return Object.keys(out).length ? out : undefined
}
