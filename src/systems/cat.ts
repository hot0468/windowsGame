import {
  CAT_DEFAULT_NAME,
  CAT_FEEDS_TO_ADOPT,
  CAT_FEED_PRICE,
  CAT_FIRST_VISIT_MIN,
  CAT_FIRST_VISIT_SPAN,
  CAT_IGNORES_TO_LEAVE,
  CAT_NIGHT_FOOD_COST,
  CAT_NIGHT_MENTAL_BONUS,
  CAT_PET_MENTAL_BONUS,
  CAT_REVISIT_MIN,
  CAT_REVISIT_SPAN,
} from '../data/cat'
import type { CatState, GameState } from '../types/game'

/**
 * 길고양이 규칙. 수치는 전부 `data/cat.ts`에 있다.
 *
 * ## 결정성
 * 방문일은 **판 시드와 방문 순번의 순수 함수다**(`Math.random`·`Date` 금지 — 돌발 사건과
 * 같은 부류). 새로 고침해도 같은 날 오고, 시드를 모르면 미리 셈할 수 없다.
 *
 * ## 적용 자리 (전부 이 파일 밖이다 — 규칙만 여기)
 * - 만남 창: `gameStore.afterTurn`이 `catEncounterDue`를 보고 연다(소원 창과 같은 자리).
 * - 사료비·멘탈: 취침 정산(`turn.ts`의 `sleep`) **한 자리**에서 `catNightDelta`를 부른다.
 * - 결정(사료·모른 척·입양)·쓰다듬기: 스토어 액션이 아래 함수를 부르고 창은 읽기만 한다.
 */

/**
 * 그 판·그 순번의 굴림값(32비트).
 *
 * ⚠️ **곱셈 상수가 chance(3266489917)·weather(2246822519)·drive(2654435761)와 달라야
 * 한다** — 같으면 고양이가 돌발 사건과 같은 날에 몰려 한 기능처럼 읽힌다.
 * 여기는 xxHash의 다섯 번째 소수를 쓴다.
 */
function mix(seed: number, n: number): number {
  let x = (Math.imul(n + 1, 374761393) ^ seed) >>> 0
  x = Math.imul(x ^ (x >>> 15), 668265263) >>> 0
  return (x ^ (x >>> 13)) >>> 0
}

/**
 * 오늘이 방문일인가. 첫 방문일은 8~14일차에서 시드가 정하고, 이후 3~5일 간격으로 온다.
 *
 * 방문일 목록을 저장하지 않고 매번 순번을 따라 걷는다(주식 시세와 같은 이유 —
 * 저장하면 손댈 자리가 생긴다). 하루에 한 번 걷는 값이라 O(day)면 충분하다.
 */
export function catVisitsOn(seed: number, day: number): boolean {
  let visit = CAT_FIRST_VISIT_MIN + (mix(seed, 0) % CAT_FIRST_VISIT_SPAN)
  let n = 1
  while (visit < day) {
    visit += CAT_REVISIT_MIN + (mix(seed, n) % CAT_REVISIT_SPAN)
    n += 1
  }
  return visit === day
}

/** 세 번 모른 척했고 한 번도 안 먹였다 — 이번 판에는 다시 오지 않는다. */
export function catGaveUp(cat: CatState | undefined): boolean {
  return !!cat && cat.fed === 0 && cat.ignored >= CAT_IGNORES_TO_LEAVE
}

/** 집에 들였는가. */
export function catAdopted(state: GameState): boolean {
  return state.cat?.adoptedDay !== undefined
}

/** 화면·토스트가 부르는 이름. 없으면 기본 이름이다. */
export function catName(state: GameState): string {
  return state.cat?.name ?? CAT_DEFAULT_NAME
}

/**
 * 오늘 밤 만남 창이 떠야 하는가.
 *
 * ⚠️ **Recovery 중에는 없다**(`dueRankEvents`와 같은 규칙 — 주저앉은 며칠에 기회가
 * 지나가면 놓친 벌이 두 번이다). 시드 없는 상태(테스트 기본값)도 없다.
 * ⚠️ `decidedDay` 커서가 "같은 방문일에 한 번만 묻는다"의 전부다 — 결정 없이 창을
 * 닫으면 기록이 없으므로 **그날 안에는 다시 뜬다**(소원 창과 같은 규칙). 날이 지나면
 * 그 방문은 그냥 지나간 것이고 먹인 것도 모른 척한 것도 아니다.
 */
export function catEncounterDue(state: GameState): boolean {
  if (state.seed === undefined || state.recovery) return false
  if (catAdopted(state) || catGaveUp(state.cat)) return false
  if (state.cat?.decidedDay === state.day) return false
  return catVisitsOn(state.seed, state.day)
}

/** 지금 만남에서 [집에 들인다]가 함께 뜨는가. */
export function catCanAdopt(state: GameState): boolean {
  return (state.cat?.fed ?? 0) >= CAT_FEEDS_TO_ADOPT
}

/** 사료를 못 주는 사유. 없으면 null(= 지금 줄 수 있다). 백신 결제와 같은 판형이다. */
export function catFeedBlocker(state: GameState): string | null {
  if (state.stats.money < CAT_FEED_PRICE) {
    return `소지금이 ${(CAT_FEED_PRICE - state.stats.money).toLocaleString('ko-KR')}원 모자랍니다.`
  }
  return null
}

/** 결정 커서를 찍은 다음 상태 조각. 세 결정이 같은 자리를 지난다. */
function decided(state: GameState): CatState {
  return { fed: 0, ignored: 0, ...state.cat, decidedDay: state.day }
}

/** 사료를 준다(−`CAT_FEED_PRICE`원). 만남이 아니거나 돈이 모자라면 그대로 돌려준다. */
export function feedCat(state: GameState): GameState {
  if (!catEncounterDue(state) || catFeedBlocker(state)) return state
  const cat = decided(state)
  return {
    ...state,
    stats: { ...state.stats, money: state.stats.money - CAT_FEED_PRICE },
    cat: { ...cat, fed: cat.fed + 1 },
  }
}

/** 모른 척한다. 만남이 아니면 그대로 돌려준다. */
export function ignoreCat(state: GameState): GameState {
  if (!catEncounterDue(state)) return state
  const cat = decided(state)
  return { ...state, cat: { ...cat, ignored: cat.ignored + 1 } }
}

/**
 * 집에 들인다. **세 번 먹인 만남에서만** 된다(창이 그때만 버튼을 그리지만, 화면에서만
 * 막으면 손으로 고친 세이브가 지나간다 — `grantWish`가 문턱을 다시 보는 것과 같은 이유).
 * 빈 이름은 기본 이름으로 읽는다(잠금화면 이름 입력과 같은 감각).
 * ⚠️ 도감 기록(`recordEvent`)은 스토어 액션이 찍는다 — 여기서 `delivery.ts`를 부르면
 * `turn → cat → delivery → turn` 순환이 된다.
 */
export function adoptCat(state: GameState, name: string): GameState {
  if (!catEncounterDue(state) || !catCanAdopt(state)) return state
  const trimmed = name.trim()
  return {
    ...state,
    cat: { ...decided(state), name: trimmed || CAT_DEFAULT_NAME, adoptedDay: state.day },
  }
}

/**
 * 입양 후 그날 밤 정산에 얹는 증감. 안 들였으면 전부 0.
 *
 * @param balance 생활비·악성코드까지 빠진 **그 밤의 잔액**.
 * ⚠️ **사료비는 잔액에서 최소 1원을 남기고만 뺀다**(악성코드·돌발 사건과 같은 규칙 —
 * 고양이가 파산을 직접 만들면 "판은 물가로 끝난다"가 흐려진다). 멘탈 +1은 **사료를
 * 온전히 낸 밤만**이다 — 못 낸 밤은 보너스가 없을 뿐 고양이가 떠나지는 않는다.
 * ⚠️ **밤 멘탈 가산의 합이 취침 회복(5)을 넘지 않는다**: 사치 집 최대 +3
 * (`Housing.mentalPerNight` -3) + 고양이 +1 = 4 < `SLEEP_MENTAL_RECOVERY` 5 —
 * 넘으면 자는 것만으로 멘탈이 차서 회복 활동 네 곳이 죽은 선택지가 된다.
 */
export function catNightDelta(
  state: GameState,
  balance: number,
): { money: number; mental: number } {
  if (!catAdopted(state)) return { money: 0, mental: 0 }
  const money = -Math.min(CAT_NIGHT_FOOD_COST, Math.max(0, balance - 1))
  return { money, mental: money === -CAT_NIGHT_FOOD_COST ? CAT_NIGHT_MENTAL_BONUS : 0 }
}

/** 오늘 쓰다듬을 수 있는가(하루 한 번 — `adBonusDay`와 같은 날짜 커서 판형). */
export function catCanPet(state: GameState): boolean {
  return catAdopted(state) && state.cat?.lastPetDay !== state.day
}

/**
 * 쓰다듬는다 — 멘탈 +1, 하루 한 번, **턴 소모 없음**(포털 배너 보상과 같은 판형).
 * ⚠️ 멘탈 상한 100은 여기서 직접 자른다 — `clampStats`는 `turn.ts`에 있고 그쪽이
 * 이 파일을 부르므로(취침 정산) 되부르면 순환이다.
 */
export function petCat(state: GameState): GameState {
  if (!catCanPet(state)) return state
  return {
    ...state,
    stats: { ...state.stats, mental: Math.min(100, state.stats.mental + CAT_PET_MENTAL_BONUS) },
    cat: { ...state.cat!, lastPetDay: state.day },
  }
}

/**
 * 세이브 보정. 돈을 만드는 상태가 아니라 검증은 가볍다(`courses` 수준) — 숫자가
 * 깨져 있으면 통째로 버린다(없으면 "만난 적 없음"이라 마이그레이션이 필요 없다).
 */
export function reviveCat(raw: unknown): CatState | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const c = raw as Partial<CatState>
  if (!Number.isFinite(c.fed) || !Number.isFinite(c.ignored)) return undefined
  const day = (v: unknown) => (Number.isFinite(v) ? Number(v) : undefined)
  return {
    fed: Number(c.fed),
    ignored: Number(c.ignored),
    decidedDay: day(c.decidedDay),
    name: typeof c.name === 'string' && c.name.trim() ? c.name : undefined,
    adoptedDay: day(c.adoptedDay),
    lastPetDay: day(c.lastPetDay),
  }
}
