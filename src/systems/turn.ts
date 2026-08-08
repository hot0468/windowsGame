import { getLivingCost, getWageMultiplier } from './economy'
import { burnoutKeyOf, getBurnoutPenalty, pushActivity } from './burnout'
import { markAttended } from './careerLog'
import { weekendCallOn } from './drive'
import { bandPayFor, bandSkillOpen, practiceBand } from './band'
import { wearGear } from './gear'
import { illnessEfficiency, illnessRecoveryRatio, nextIllness } from './illness'
import { weatherEfficiency } from './weather'
import { isWeekend, weekdayOf } from '../data/calendar'
import { WEEKEND_WAGE_BONUS } from '../data/economy'
import { DEFAULT_HOUSING_ID, findHousing } from '../data/housing'
import { PAYOUT_INTERVAL_DAYS } from '../data/artworks'
import { WORK_PER_SESSION, findGig } from '../data/gigs'
import { OUTFIT_BONUS, PHONE_BONUS, PHONE_ID, PHONE_STAT, outfitsFor, requiredItemIds } from '../data/items'
import { FINAL_DAYS, isWorkWeekday } from '../data/careers'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type {
  Activity,
  Application,
  Artwork,
  Employment,
  EventLog,
  GameState,
  GrowthStatKey,
  Illness,
  JobStageGate,
  Slot,
  Stats,
} from '../types/game'

/**
 * 취침 시 회복되는 체력. **고정값이다.**
 *
 * ⚠️ **예전에는 `maxStamina × 0.6`이었다**(2026-08-08 통합 전). 회복이 상한에 비례하니
 * 몸을 키울수록 체력이 덜 묶여서 **성장할수록 자원이 사라졌다** — 비례로 되돌리지 말 것.
 * 지금 값은 통합 전 시작값(그릇 100 × 0.6)과 같아 체감이 그대로다.
 */
const SLEEP_RECOVERY = 60

/** 취침 시 회복되는 멘탈. */
const SLEEP_MENTAL_RECOVERY = 5

/**
 * 체력 상한. **고정이고 아무 활동도 이 값을 올리지 못한다.**
 *
 * ⚠️ 예전에는 `maxStamina`라는 스탯이 이 자리를 대신했고 운동으로 키울 수 있었다.
 * 그것을 없앤 이유는 위 `SLEEP_RECOVERY` 주석에 있다 — 몸을 키운 결과는 이제
 * `athletics`(운동 스탯)로 가고, 체력은 **모두에게 같은 크기의 하루**다.
 */
export const STAMINA_CAP = 100

/** 성장 스탯의 기본 상한. 장기 육성의 여유를 두고 999로 잡는다. */
export const GROWTH_STAT_CAP = 999

/**
 * 기본 상한을 따르지 않는 성장 스탯.
 *
 * 평판·도덕은 "얼마나 쌓았나"가 아니라 **평가 지표**라 0~100 척도가 더 자연스럽다
 * (설계자 지시). 스탯창에서도 멘탈과 같은 자원 줄에 놓이므로 척도가 같아야 읽힌다.
 * ⚠️ 어떤 엔딩 조건도 이 셋을 쓰지 않으므로 상한을 낮춰도 도달 불가능해지는 엔딩은 없다
 * (`data/endings.ts` 확인함). 나중에 이 셋을 쓰는 엔딩을 추가하면 100 이하로 잡을 것.
 *
 * ⚠️ **예의범절은 2026-08-08에 여기서 빠졌다**(설계자 지시: 최댓값 999). 한때 "몸에 배어
 * 있는가"를 재는 값이라 100으로 뒀지만, 그러면 랭크가 금방 S로 차서 **더 갈 데가 없는
 * 스탯**이 됐다. 지금은 다른 성장 스탯과 같은 999다 — 되돌리려면 예의범절 랭크
 * 이벤트의 문턱부터 다시 잡아야 한다.
 */
const GROWTH_STAT_CAP_OVERRIDES: Partial<Record<GrowthStatKey, number>> = {
  reputation: 100,
  morality: 100,
}

/** 해당 성장 스탯의 상한. UI도 이 함수를 써야 표시와 클램프가 어긋나지 않는다. */
export function growthCap(key: GrowthStatKey): number {
  return GROWTH_STAT_CAP_OVERRIDES[key] ?? GROWTH_STAT_CAP
}

/** 멘탈 상한. 소모 자원이므로 성장 스탯과 성격이 달라 0~100을 유지한다. */
export const MENTAL_CAP = 100

export function createInitialState(playerName: string): GameState {
  return {
    playerName,
    day: 1,
    slot: 'morning',
    stats: { ...INITIAL_STATS },
    recentActivities: [],
    seenEndingIds: [],
    gameOver: null,
  }
}

/**
 * 보유 아이템 목록.
 *
 * ⚠️ **`delivery.ts`가 아니라 여기 있다**(2026-08-04 이동). 활동 실행 조건(`canRun`)이
 * 보유 여부를 보게 되면서 `turn` → `delivery` 의존이 생기는데, `delivery`는 이미
 * `turn`을 부르고 있어 순환이 된다. 보유 판정은 `GameState`만 보는 순수 술어라
 * 배송 규칙보다 아래 계층에 있는 것이 맞다. `delivery.ts`가 그대로 재수출하므로
 * 기존 호출부는 손대지 않았다.
 */
export function inventoryOf(state: GameState): EventLog[] {
  return state.inventory ?? []
}

/**
 * 이 활동에 어울리는 옷 중 **가지고 있는 것**. 없으면 undefined.
 *
 * ⚠️ **`data/items.ts`를 읽기만 한다**(`housingMentalCost`와 같은 예외). 옷이 어디에
 * 맞는지는 데이터가 알고, 여기서는 "가졌는가"만 묻는다 — 규칙을 둘로 나누지 않는다.
 *
 * ⚠️ **겹쳐 쌓지 않는다: 하나만 고른다.** 여러 벌이 맞아도 보너스는 한 번이다
 * (다 사면 배수가 되는 구조는 "물건은 지름길이 아니다"를 깬다). 지금은 보너스가
 * `OUTFIT_BONUS` 하나뿐이라 **첫 번째로 가진 옷**을 고르는 것으로 충분하다.
 */
export function outfitFor(state: GameState, activityId: string) {
  return outfitsFor(activityId).find((item) => owns(state, item.id))
}

/** TPO 보너스 비율. 맞는 옷이 없으면 0이다. */
export function outfitBonusFor(state: GameState, activityId: string): number {
  return outfitFor(state, activityId) ? OUTFIT_BONUS : 0
}

/**
 * 그 스탯 상승분에 **물건이** 얹어 주는 비율. 지금은 휴대폰(친화력)뿐이다.
 *
 * ⚠️ **옷 보너스와 더해진다** — 옷은 *활동*을 보고 이쪽은 *스탯*을 봐서 겹칠 근거가 없다.
 * ⚠️ **`systems/phone.ts`를 import하지 않는다** — 그쪽이 `clampStats`·`owns`를 부르고
 * 있어 순환이 된다(`housingMentalCost`가 데이터 한 줄만 읽는 것과 같은 예외). 여기서
 * 읽는 것은 상수 둘뿐이고, 요금·정지 규칙은 전부 `phone.ts`가 갖는다.
 */
export function itemStatBonusFor(state: GameState, key: keyof Stats): number {
  return key === PHONE_STAT && owns(state, PHONE_ID) ? PHONE_BONUS : 0
}

/** 이미 가진 물건인지. 보유 판정이 여러 곳에 흩어지지 않게 여기 하나만 둔다. */
export function owns(state: GameState, itemId: string): boolean {
  return inventoryOf(state).some((i) => i.id === itemId)
}

/**
 * 요구 아이템을 충족하는가. **배열이면 "그중 아무거나 하나"다**(AND가 아니라 OR).
 *
 * ⚠️ 타블렛 둘이 같은 그리기 활동을 여는 것이 이 함수의 존재 이유다. 활동을 장비별로
 * 쪼개면 바탕화면에 클립스튜디오 아이콘이 둘 생기고, 스케줄러 고르기 판에도 둘이 뜬다 —
 * 장비 차이는 **여는 문**이 아니라 **결과의 등급**이어야 한다(`systems/artwork.ts`).
 *
 * 화면(잠금 사유)도 이 함수를 써야 판정과 문구가 갈리지 않는다.
 */
export function ownsRequired(state: GameState, required: string | string[]): boolean {
  return requiredItemIds(required).some((id) => owns(state, id))
}

/**
 * **그 구독을 끊고 있는가.**
 *
 * ⚠️ **규칙이 아니라 판정만 여기 있다**(`owns`·`jobStageOpen`과 같은 예외).
 * 요금·주기·해지는 전부 `systems/subscription.ts`가 갖고, 여기서는 `canRun`이
 * 물어볼 수 있게 **세이브의 키 유무만** 읽는다 — 그쪽을 import하면 순환이 된다
 * (`subscription.ts`가 `clampStats`·`settleGameOver`를 부른다).
 */
export function subscribed(state: GameState, id: string): boolean {
  return Boolean(state.subscriptions?.active[id])
}

/**
 * 정규직 상태 게이트.
 *
 * ⚠️ **규칙이 아니라 판정만 여기 있다.** 채용 절차·급여·결근은 전부
 * `systems/employment.ts`가 갖고, 여기서는 `canRun`이 물어볼 수 있게 상태를 읽기만 한다
 * (`owns`가 `requiresItem`을 위해 여기 있는 것과 같은 이유 — 활동을 실행하는 통로가
 * 넷이라 판정이 `canRun` 밖에 있으면 그중 하나가 반드시 게이트를 통과한다).
 */
export function jobStageOpen(state: GameState, gate: JobStageGate): boolean {
  if (gate === 'employed') {
    const job = state.employment
    if (!job) return false
    /* 근무일이 아닌 날의 출근은 슬롯만 먹고 아무 일도 일어나지 않는다(급여는 급여일에 온다).
       ⚠️ **예외는 주말 호출 하나다**(2026-08-08): 그날 회사에서 일이 넘어왔으면 주말에도
       출근할 수 있고, 그것이 이 게임의 **야근**이다 — 새 활동도 새 번아웃 키도 만들지
       않는다(같은 `commute`가 같은 비용을 낸다). 주말은 근무일이 아니므로 안 나가도
       결근으로 세지 않는다: 순수한 선택지다. 확률은 `systems/drive.ts`가 갖는다. */
    if (!isWorkWeekday(weekdayOf(state.day)) && !weekendCallOn(state.day, job.careerId)) {
      return false
    }
    // 하루에 두 번 출근할 수는 없다 — 두 번 세면 결근 계산과 출근부가 어긋난다.
    return !job.attendedDays.includes(state.day)
  }
  if (gate === 'interview') {
    const app = state.application
    return !!app && app.stage === 'interview' && state.day >= app.dueDay
  }
  // 'applying': 지금 **새로 지원할 수 있는 상태인가**. 한 번에 한 곳만 넣을 수 있고,
  // 다니는 회사가 있으면 넣지 않는다. 사유 문구는 `systems/employment.ts`의 `applyBlockers`가
  // 만든다 — 여기서는 판정만 한다.
  //
  // ⚠️ "이미 지원했는가"가 아니라 "지원할 수 있는가"인 이유: 이 게이트는 **누르기 전에**
  // 물어보는 것이다. 실행된 뒤의 상태를 조건으로 걸면 확정 버튼이 영영 비활성이 된다
  // (CDP 실측으로 잡은 버그).
  return !state.employment && !state.application
}

/**
 * 요구 스탯과 요구 아이템을 모두 충족하고 게임오버가 아니어야 실행 가능하다.
 *
 * ⚠️ **아이템 조건도 여기서 본다.** 화면에서만 막으면 스케줄러에 미리 넣어 둔 예약이
 * 잠금을 그대로 통과한다 — 그 경로로 들어오면 회원권 없이 회원 요금(무료)으로 운동하게 된다.
 * 정규직 게이트(`requiresJobStage`)도 같은 이유로 여기 있다.
 */
export function canRun(state: GameState, activity: Activity): boolean {
  if (state.gameOver) return false
  if (activity.requiresItem && !ownsRequired(state, activity.requiresItem)) return false
  if (activity.requiresSubscription && !subscribed(state, activity.requiresSubscription))
    return false
  if (activity.requiresJobStage && !jobStageOpen(state, activity.requiresJobStage)) return false
  /* ⚠️ 슬롯 제약(2026-08-08). 화면에서만 막으면 스케줄러가 반대 슬롯에 걸어 둔 예약이
     그대로 통과한다 — 아이템·구독·정규직 게이트와 같은 자리다. */
  if (activity.requiresSlot && state.slot !== activity.requiresSlot) return false
  /* ⚠️ 밴드 숙련도 게이트(2026-08-08). 문턱을 화면에서만 보면 스케줄러가 숙련도 0일 때
     걸어 둔 공연 예약이 그대로 통과한다. */
  if (!bandSkillOpen(state, activity)) return false
  /* ⚠️ 요일 잠금(2026-08-09). 슬롯 게이트와 같은 자리다 — 화면에서만 막으면 스케줄러가
     반대 요일에 걸어 둔 예약이 그대로 통과한다. */
  if (activity.requiresWeek === 'weekend' && !isWeekend(state.day)) return false
  if (activity.requiresWeek === 'weekday' && isWeekend(state.day)) return false
  if (!activity.requires) return true
  return Object.entries(activity.requires).every(
    ([key, required]) => state.stats[key as keyof Stats] >= required,
  )
}

/** 체력은 0~`STAMINA_CAP`, 멘탈은 0~`MENTAL_CAP`, 성장 스탯은 0~`growthCap(key)`로 제한한다. */
export function clampStats(stats: Stats): Stats {
  const clamped: Stats = {
    ...stats,
    stamina: Math.round(Math.min(Math.max(0, stats.stamina), STAMINA_CAP)),
    mental: Math.round(Math.min(Math.max(0, stats.mental), MENTAL_CAP)),
    money: Math.round(stats.money),
  }
  // 성장 스탯은 키 목록을 돌며 일괄 처리한다. 상한만 스탯별로 다를 수 있으므로
  // growthCap()에 물어본다 — 스탯이 추가돼도 여기를 고칠 필요가 없다.
  for (const key of GROWTH_STAT_KEYS) {
    clamped[key] = Math.min(growthCap(key), Math.max(0, Math.round(stats[key])))
  }
  return clamped
}

/**
 * 활동 효과를 스탯에 적용한다.
 * 번아웃 효율은 긍정 효과에만 곱한다 — 소모량까지 줄어들면 페널티가 아니게 된다.
 * 알바비(scalesWithWage)에는 물가 배율을 적용한다.
 */
function applyEffects(
  state: GameState,
  stats: Stats,
  activity: Activity,
  day: number,
  efficiency: number,
  outfitBonus: number,
): Stats {
  const next = { ...stats }
  for (const [key, rawValue] of Object.entries(activity.effects)) {
    const statKey = key as keyof Stats
    let value = rawValue
    if (statKey === 'money' && value > 0 && activity.scalesWithWage) {
      /* ⚠️ 주말 할증도 **여기 한 곳에서** 곱한다 — 미리보기(`activityPreview.ts`)가 같은
         두 배율을 읽으므로, 한쪽에만 넣으면 확인창이 거짓 금액을 적는다. */
      value *= getWageMultiplier(day) * (isWeekend(day) ? WEEKEND_WAGE_BONUS : 1)
    }
    const bonus = outfitBonus + itemStatBonusFor(state, statKey)
    next[statKey] += value > 0 ? value * efficiency + outfitBoost(statKey, value, bonus) : value
  }
  return next
}

/**
 * TPO 옷이 얹어 주는 몫. **성장 스탯의 상승분에만** 붙는다.
 *
 * ⚠️ **돈·행동력·멘탈에는 붙이지 않는다.** 돈에 붙이면 옷 한 벌이 경제를 흔들고
 * (밸런스 시뮬레이션이 보는 축이다), 행동력·멘탈은 비용과 회복이라 "옷을 갖춰 입으면
 * 덜 지친다"는 다른 규칙이 된다. 이 기능이 약속한 것은 **성장이 조금 잘 되는 것**이다.
 *
 * ⚠️ **최소 +1이다.** 면접(매력 2)·출근(친화력 1)처럼 상승분이 작은 활동은 비율만으로는
 * 반올림해서 0이 되어, 정장을 사도 **화면에 아무 변화가 없다**(거짓말이 된다).
 */
function outfitBoost(key: keyof Stats, value: number, bonus: number): number {
  if (bonus <= 0) return 0
  if (!(GROWTH_STAT_KEYS as readonly string[]).includes(key)) return 0
  return Math.max(1, Math.round(value * bonus))
}

/**
 * 그 집에 사는 대가로 밤마다 깎이는 멘탈.
 *
 * ⚠️ **`systems/housing.ts`를 import하지 않는다** — 그쪽이 이미 `turn.ts`를 부르고 있어
 * 순환이 된다(`owns`가 `delivery.ts`에서 여기로 옮겨 온 것과 같은 이유). 여기서 읽는
 * 것은 **데이터 한 줄**(`Housing.mentalPerNight`)뿐이고, 이사의 규칙(누가 어디로 옮길
 * 수 있고 얼마가 오가는가)은 전부 `housing.ts`가 갖는다. `housing.ts`가 같은 값을
 * `housingMentalCost`로 재수출하므로 화면은 그쪽을 본다.
 */
function housingMentalCost(state: GameState): number {
  const id = state.housing?.id ?? DEFAULT_HOUSING_ID
  return findHousing(id)?.mentalPerNight ?? 0
}

/**
 * 취침: 체력·멘탈 회복 후 생활비 차감.
 *
 * ⚠️ **생활비는 이제 날짜만의 함수가 아니다** — `getLivingCost(state)`가 물가 구간에
 * **집 배율**을 곱한다(2026-08-05 이사 신설). 여기서 `livingCostForDay`를 쓰면
 * 이사한 플레이어가 실제로는 안 낸 돈을 내게 된다.
 *
 * ⚠️ **집이 멘탈을 갉는 것도 여기서 일어난다**(`housingMentalCost`). 밤에 붙는 이유는
 * 회복과 같은 자리에서 상계돼야 "그 방에서 자는 대가"로 읽히기 때문이다.
 * `housing.ts`를 import하지 않고 `GameState.housing`의 배율/비용만 읽는 것은
 * `nightPayoutPending`이 `employment.ts`를 import하지 않는 것과 같은 규칙이다 —
 * 의존은 계속 한 방향이다(housing → turn).
 */
function sleep(stats: Stats, state: GameState, ill: Illness | undefined): Stats {
  /* ⚠️ **아픈 밤은 회복이 반이다**(`ILL_RECOVERY_RATIO`) — 그것이 아픔이 하는 일의 전부이고,
     활동을 막지 않는 이유이기도 하다(`data/illness.ts`). 집이 갉는 멘탈에는 곱하지 않는다:
     그 방에서 자는 대가는 병과 아무 상관이 없다. */
  const recovery = illnessRecoveryRatio(ill)
  return {
    ...stats,
    stamina: stats.stamina + SLEEP_RECOVERY * recovery,
    mental: stats.mental + SLEEP_MENTAL_RECOVERY * recovery - housingMentalCost(state),
    money: stats.money - getLivingCost(state),
  }
}

/**
 * 슬롯을 넘기고, 오후였다면 취침 정산까지 처리한다.
 *
 * ⚠️ **아픔 판정이 여기 하나뿐이다**(`nextIllness`). 슬롯마다 물으면 같은 하루에 앓고
 * 낫는 일이 생기고, 무엇보다 근거가 "무리해서 하루를 끝냈다"이므로 그 하루가 끝나는
 * 자리에서만 물어야 뜻이 맞다. 넘겨주는 행동력은 **취침 회복을 얹기 전** 값이다.
 */
function advance(
  state: GameState,
  stats: Stats,
): { day: number; slot: Slot; stats: Stats; illness: Illness | undefined } {
  if (state.slot === 'morning') {
    return { day: state.day, slot: 'afternoon', stats, illness: state.illness }
  }
  const illness = nextIllness(state.illness, stats.stamina, state.day)
  return {
    day: state.day + 1,
    slot: 'morning',
    stats: sleep(stats, state, illness),
    illness,
  }
}

function detectGameOver(stats: Stats): GameState['gameOver'] {
  if (stats.money <= 0) return 'bankrupt'
  if (stats.mental <= 0) return 'burnout'
  return null
}

/**
 * **그 밤에 아직 들어올 돈이 남아 있는가.**
 *
 * ⚠️ 이 술어 하나가 "급여가 우선한다"(설계자 지시)를 지탱한다. 밤 정산은 생활비를
 * 먼저 빼는데, 급여는 그 뒤에 `gameStore.afterTurn` → `advanceEmployment`가 넣는다.
 * 그 사이에서 파산을 확정해 버리면 **월급 167만 원을 손에 쥔 채 굶어 죽었다는 판정**이
 * 나온다(실제로 나던 버그다). 그러니 아직 입금이 남은 밤에는 **판단 자체를 미룬다**.
 *
 * ⚠️ **`employment.ts`를 import하지 않는다** — 의존은 계속 한 방향이다
 * (employment/schedule/delivery → turn, 반대는 없다). 여기서 보는 것은 세이브에 이미 있는
 * `GameState.employment`의 **날짜 하나**(`paydayDay`)뿐이고, 규칙(누구에게 얼마를 언제
 * 주는가)은 여전히 전부 `employment.ts`가 갖는다. `canRun`의 `jobStageOpen`이 같은 자리에
 * 같은 이유로 있는 것과 같다 — 활동 실행 통로가 넷이듯, 턴을 넘기는 통로도 여럿이라
 * 판단이 `turn.ts` 밖에 있으면 그중 하나가 반드시 샌다.
 *
 * `>=`인 이유: 급여 루프(`payWages`)도 `day >= paydayDay`로 밀린 주기를 따라잡는다
 * (스케줄러 연쇄로 며칠이 한 번에 흐를 수 있다). 판정 기준이 어긋나면 미루는 밤과
 * 실제 입금하는 밤이 달라진다.
 *
 * ⚠️ **밤에 돈이 들어오는 원천을 새로 만들면 그 조건을 여기에 함께 넣어야 한다**
 * (연말정산·이자·환급 등). 안 넣으면 정확히 같은 형태의 버그가 그 원천에서 재현된다 —
 * "받을 돈이 있는데 그 전에 죽었다"가 된다.
 *
 * **원천 2 — 은행 정기예금 만기**(2026-08-05 추가). 만기 원리금은 밤 정산 뒤
 * `afterTurn` → `advanceBank`가 **소지금으로** 넣는다. 급여와 똑같은 자리, 똑같은 이유다:
 * 12일을 참고 묶어 둔 돈이 만기 당일 밤에 손에 들어오는데 그 직전에 파산하면
 * 정기예금이라는 장치 자체가 거짓말이 된다. 판정 근거는 `GameState.bank.deposits`의
 * **날짜 하나**(`matureDay`)뿐이고, 규칙(얼마를 언제 주는가)은 전부 `systems/bank.ts`에 있다 —
 * 여기서 `bank.ts`를 import하지 않는 것도 `employment.ts`를 import하지 않는 것과 같다.
 *
 * **원천 3 — 복권 당첨금**(2026-08-05 추가). 오후에 산 표가 당첨되면 상금은
 * `GameState.lottery.pending`에 담겼다가 밤 정산 뒤 `advanceLottery`가 소지금에 넣는다.
 * 급여·만기와 **정확히 같은 자리, 같은 이유**다: 그 중간에서 판정하면
 * **당첨금을 손에 쥔 채 굶어 죽는다.** 여기서 보는 것도 숫자 하나(`pending`)뿐이고
 * 규칙(확률·상금·언제 굴리는가)은 전부 `systems/lottery.ts`에 있다.
 *
 * **원천 4 — 트위터 주간 정산**(2026-08-08 추가). 그림을 올려 모은 팔로워에 비례한 돈이
 * 이레마다 `advanceTwitter`를 통해 소지금으로 들어온다. 급여·만기·당첨금과 **같은 자리,
 * 같은 이유**다. 여기서 보는 것도 숫자 하나(`pending`)뿐이고 규칙(얼마를 언제 주는가)은
 * 전부 `systems/twitter.ts`에 있다 — 이 파일은 그쪽을 import하지 않는다.
 *
 * ⚠️ 여기서 보는 것은 **금액이 아니라 커서**(`paidDay`)다. 정산은 시각이 오면 일어나는
 * 일이라 복권처럼 미리 담아 둘 `pending`이 없다 — 정기예금 만기와 같은 형태이고,
 * 주기 상수도 `data/artworks.ts` 한 곳에서만 읽는다(여기에 7을 박으면 두 번째 출처가 된다).
 */
export function nightPayoutPending(state: GameState): boolean {
  const job = state.employment
  if (job && state.day >= job.paydayDay) return true
  if ((state.lottery?.pending ?? 0) > 0) return true
  const twitter = state.twitter
  if (twitter && state.day - twitter.paidDay >= PAYOUT_INTERVAL_DAYS) return true
  /* ⚠️ **공모전 상금** — 발표일 밤에 `advanceContests`가 넣는다. 안 보면 상금이 들어오기
     직전 밤에 굶어 죽는다(정기예금 만기와 같은 형태 — 금액이 아니라 **날짜**를 본다). */
  if ((state.contests?.entries ?? []).some((e) => e.prize === undefined && state.day >= e.resultDay)) {
    return true
  }
  /* ⚠️ **웹툰 원고료** — 마감을 채운 주는 그 밤에 원고료가 들어온다. 여기서도 금액이 아니라
     `dueDay`만 본다: `turn.ts`는 `webtoon.ts`를 import하지 않고 날짜 하나만 읽는다
     (`employment`·`bank`와 같은 예외이자 같은 규칙). */
  const webtoon = state.webtoon
  if (webtoon && webtoon.status === 'serializing' && state.day > webtoon.dueDay) return true
  return (state.bank?.deposits ?? []).some((d) => state.day >= d.matureDay)
}

/**
 * **밤이 다 정산된 뒤 딱 한 번** 게임오버를 확정한다.
 *
 * 생활비가 나가고 급여가 들어오고 그 밖에 그날 밤 돈을 움직이는 것이 전부 끝난 다음이
 * 유일하게 옳은 판정 시점이다. 부르는 곳은 **밤의 마지막 지점 하나**뿐이다 —
 * `employment.ts`의 `advanceEmployment` 말미(그리고 그것을 부르는 `gameStore.afterTurn`이
 * 턴을 넘기는 모든 통로의 종점이다).
 *
 * ⚠️ **되살아나게 하는 함수가 아니다.** 이미 확정된 게임오버는 그대로 두고(초기화하지
 * 않는다), 아직 null인 판만 지금 상태로 판단한다. 그래야 "죽었다가 살아나는" 상태가
 * 화면에 한 프레임도 나타나지 않는다.
 */
export function settleGameOver(state: GameState): GameState {
  if (state.gameOver) return state
  const gameOver = detectGameOver(state.stats)
  return gameOver ? { ...state, gameOver } : state
}

/**
 * 슬롯을 넘긴 결과에 게임오버 판정을 붙인다.
 *
 * ⚠️ **입금이 남은 밤에는 판단을 미룬다**(`nightPayoutPending`). 미룬 판은
 * `advanceEmployment` 말미의 `settleGameOver`가 급여까지 끝난 뒤에 결정한다. `runActivity`·`skipSlot`을
 * 직접 부르는 곳(밸런스 시뮬레이션)에서도 **무직이면 지금 그대로 판정된다** —
 * 미뤄지는 것은 오직 "오늘 밤 월급이 들어오는 재직자"뿐이다.
 */
function withGameOver(next: GameState): GameState {
  if (nightPayoutPending(next)) return next
  return { ...next, gameOver: detectGameOver(next.stats) }
}

/**
 * 정규직 활동이 남기는 **사실**을 기록한다.
 *
 * ⚠️ **여기 있어야 하는 이유는 `canRun`과 같다.** 활동을 실행하는 통로가 넷이고
 * (사이트 확정 버튼 · 스케줄러 예약 · 바탕화면 바로 가기 · 카톡 제안) 그중 어느 하나라도
 * 이 기록을 빠뜨리면 "출근했는데 결근으로 세는" 또는 "면접을 봤는데 절차가 안 넘어가는"
 * 형태로 조용히 터진다. `runActivity`는 그 넷이 모두 지나는 유일한 지점이다.
 *
 * 판단은 활동 id가 아니라 **게이트**로 한다 — id로 분기하면 활동을 하나 더 만들 때 샌다.
 * 그 밖의 규칙(결근 감사·급여·해고)은 전부 `systems/employment.ts`에 있다.
 */
function stampJob(
  state: GameState,
  activity: Activity,
): { employment?: Employment; application?: Application; careerLog?: GameState['careerLog'] } {
  const { employment, application } = state
  if (activity.requiresJobStage === 'employed' && employment) {
    return {
      application,
      employment: { ...employment, attendedDays: [...employment.attendedDays, state.day] },
      /* ⚠️ 출근부(`attendedDays`)는 급여일마다 지난 주기를 버리므로 **누적을 셀 수 없다**.
         도감의 직업 레벨이 읽는 것은 이쪽이다(`systems/careerLog.ts`). */
      careerLog: markAttended(state.careerLog, employment.careerId),
    }
  }
  if (activity.requiresJobStage === 'interview' && application) {
    // 면접을 봤으면 최종 결과를 기다리는 단계로 넘어간다.
    return {
      employment,
      application: { ...application, stage: 'final', dueDay: state.day + FINAL_DAYS },
    }
  }
  return { employment, application }
}

/**
 * 그리는 활동이 남기는 **그림 한 장**. 안 그리는 활동이면 갤러리를 그대로 돌려준다.
 *
 * ⚠️ **여기 있어야 하는 이유는 `stampJob`과 같다** — 활동 실행 통로가 넷이라
 * 그 밖에 두면 하나가 반드시 샌다(그 통로로만 그리면 그림이 안 남는다).
 *
 * ⚠️ **등급이 아니라 사실을 적는다.** 등급 계산은 `systems/artwork.ts`가 하고
 * `turn.ts`는 그 파일을 import하지 않는다 — `artwork.ts`가 `rank.ts`를, `rank.ts`가
 * 다시 `turn.ts`(`growthCap`)를 부르므로 순환이 된다. 여기서 하는 일은
 * **지금 스탯과 지금 장비를 그대로 베껴 적는 것**뿐이다(규칙은 여전히 한쪽에만 있다).
 *
 * ⚠️ 스탯은 **활동 효과가 붙기 전** 값이다(`stampJob`이 턴을 넘기기 전에 찍는 것과 같다) —
 * 그 그림은 "그리기 전의 실력"으로 그린 것이지, 그리면서 는 실력으로 그린 것이 아니다.
 */
function stampArtwork(state: GameState, activity: Activity): Artwork[] | undefined {
  if (!activity.producesArt) return state.artworks
  const previous = state.artworks ?? []
  const serial = previous.length + 1
  return [
    ...previous,
    {
      id: `art-${serial}`,
      serial,
      day: state.day,
      slot: state.slot,
      art: state.stats.art,
      creativity: state.stats.creativity,
      // 좋은 장비를 가졌으면 그걸로 그린다 — 고를 것이 없으므로 묻지 않는다.
      tool: owns(state, 'lcd-tablet') ? 'lcd' : 'pen',
    },
  ]
}

/**
 * 도구를 한 번 켠 결과를 반영한다 — **업무량이 오르고, 다 채우면 그 자리에서 납품된다.**
 *
 * ⚠️ **`systems/gigs.ts`가 아니라 여기 있다**(그쪽이 재수출한다). 이유는 `owns`가
 * `delivery.ts`에서 옮겨 온 것과 같다: 반영이 `runActivity` 밖에 있으면 활동 실행 통로 넷
 * 중 하나(스케줄러 예약)가 샌다. 규칙의 나머지(수주·마감·포기)는 전부 `gigs.ts`에 있다.
 *
 * ⚠️ **받아 둔 일이 없거나 도구가 다르면 아무 일도 없다** — 도구는 계약 없이도 켤 수 있고
 * 그때는 스탯만 오르는 연습이다(게이트를 늘리지 않는다).
 *
 * ⚠️ **보수는 밤으로 미루지 않는다.** 미루면 `nightPayoutPending`에 원천이 하나 더 생기고
 * "다 했는데 그날 밤 굶어 죽는" 판이 난다 — 즉시 지급이면 그 위험 자체가 없다.
 * ⚠️ **물가 배율을 타지 않는다**(`scalesWithWage`를 안 쓴다) — 정규직 급여와 같은 장치다.
 */
export function applyToolSession(state: GameState, tool: string): GameState {
  const prev = state.gigs
  const contract = prev?.active
  if (!prev || !contract) return state
  const gig = findGig(contract.gigId)
  // 없는 일감을 가리키는 계약은 조용히 닫는다(일감을 지워도 화면이 안 깨진다).
  if (!gig) return { ...state, gigs: { ...prev, active: undefined } }
  if (gig.tool !== tool) return state

  const progress = contract.progress + WORK_PER_SESSION
  if (progress < gig.workload) {
    return { ...state, gigs: { ...prev, active: { ...contract, progress } } }
  }
  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + gig.pay }),
    gigs: {
      active: undefined,
      done: [...prev.done, gig.id],
      missed: prev.missed,
      earned: prev.earned + gig.pay,
    },
  }
}

/** 활동을 실행하고 다음 슬롯 상태를 반환한다. 원본은 변경하지 않는다. */
export function runActivity(state: GameState, activity: Activity): GameState {
  if (state.gameOver) return state

  // 알바 4종은 같은 키를 공유한다 — 종류를 바꿔 가며 일해도 연속 노동은 연속 노동이다.
  const key = burnoutKeyOf(activity)
  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, key)
  /* ⚠️ **날씨와 아픔이 번아웃 효율과 정확히 같은 자리에 곱해진다** — 곧 긍정 효과에만
     붙고 소모량은 안 건드린다. 새 계수를 여기 말고 `applyEffects` 안에 넣지 말 것:
     그러면 활동 미리보기(`activityPreview.ts`)가 못 보는 두 번째 출처가 생긴다. */
  const withEffects = applyEffects(
    state,
    state.stats,
    activity,
    state.day,
    efficiency * weatherEfficiency(state.day, activity.id) * illnessEfficiency(state),
    outfitBonusFor(state, activity.id),
  )
  withEffects.mental -= mentalPenalty
  /* ⚠️ **밴드 보수는 숙련도의 함수라 활동 데이터에 없다**(`data/band.ts`) — 활동 효과가
     끝난 자리에서 얹는다. 물가 배율을 타지 않는 것은 그몽 보수·월급과 같은 규칙이다:
     타면 후반에 밴드만으로 버틸 수 있게 되어 "판은 반드시 끝난다"가 무너진다. */
  withEffects.money += bandPayFor(state, activity)

  // ⚠️ 기록은 **턴을 넘기기 전**에 뽑는다 — 오후 행동은 날짜를 바꾸므로
  //    넘긴 뒤에 찍으면 "다음 날 출근한 것"이 된다.
  /* ⚠️ **장비는 턴을 넘기기 전에 닳는다**(`stampJob`과 같은 자리·같은 이유) — 실행 통로가
     넷이라 그 밖에 두면 하나가 반드시 샌다. 고장 나면 그 장비를 요구하던 활동이
     다음부터 `canRun`에서 막힌다. */
  const worn = wearGear(state, activity)
  /* ⚠️ **합주도 턴을 넘기기 전에 새긴다**(장비 마모와 같은 자리) — 넘긴 뒤에 올리면
     그날 오른 숙련도가 다음 날의 것이 된다. 합주가 아니면 `undefined`라 밴드가 안 생긴다. */
  const banded = practiceBand(worn.state, activity)
  const stamped = stampJob(worn.state, activity)
  const artworks = stampArtwork(state, activity)
  const advanced = advance(state, withEffects)
  const stats = clampStats(advanced.stats)

  const advancedState = withGameOver({
    /* ⚠️ **`worn.state`를 펼친다**(원본 `state`가 아니다) — 원본을 펼치면 방금 새긴
       장비 마모·고장이 통째로 버려진다. 실제로 그렇게 짰다가 잡았다. */
    ...worn.state,
    ...banded,
    ...stamped,
    artworks,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    illness: advanced.illness,
    recentActivities: pushActivity(state.recentActivities, key),
  })

  /* ⚠️ **턴을 넘긴 뒤에 반영한다.** 납품 보수는 그 슬롯의 결과이므로 취침 정산(생활비)
     **뒤에** 들어와야 "다 했는데 그날 밤 굶어 죽는" 판이 안 난다. */
  return activity.toolId ? applyToolSession(advancedState, activity.toolId) : advancedState
}

/**
 * 광고 배너 클릭 보상. 하루 한 번, 100원.
 *
 * ⚠️ **턴을 소모하지 않는다.** "탐색은 무료"라는 규칙(설계 문서 2.3)은 그대로다 —
 * 브라우저를 여는 것도, 배너를 누르는 것도 슬롯을 쓰지 않는다.
 * 금액이 생활비(3만원~)의 0.3% 수준인 것도 의도다: 클릭이 생계 수단이 되면
 * "일해서 번다"는 게임의 축이 무너진다. 소소한 습관 정도로만 둔다.
 */
export const AD_BONUS_MONEY = 100

/** 오늘 아직 광고 보상을 받지 않았고 게임이 진행 중이면 true. */
export function canClaimAdBonus(state: GameState): boolean {
  return !state.gameOver && state.adBonusDay !== state.day
}

/** 보상을 받는다. 이미 받았거나 게임오버면 상태를 그대로 돌려준다(호출부에서 막지 않아도 안전). */
export function claimAdBonus(state: GameState): GameState {
  if (!canClaimAdBonus(state)) return state
  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + AD_BONUS_MONEY }),
    adBonusDay: state.day,
  }
}

/**
 * 돈만 쓴다. **턴을 소모하지 않는다.**
 *
 * 헬스장 월결제처럼 "대화 중에 결제만 하는" 행동용이다. 활동(`runActivity`)으로 만들면
 * 반드시 한 슬롯을 먹는데, 등록은 시간을 쓰는 일이 아니다.
 * 잔액이 모자라면 아무것도 하지 않는다 — 마이너스 잔액은 파산 판정을 흐린다.
 */
export function spendMoney(state: GameState, amount: number): GameState {
  if (state.gameOver || amount <= 0 || state.stats.money < amount) return state
  return { ...state, stats: clampStats({ ...state.stats, money: state.stats.money - amount }) }
}

/** 아무 활동 없이 슬롯만 넘긴다. 'rest' 기록으로 번아웃 연속이 끊긴다. */
export function skipSlot(state: GameState): GameState {
  if (state.gameOver) return state

  const advanced = advance(state, { ...state.stats })
  const stats = clampStats(advanced.stats)

  return withGameOver({
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    illness: advanced.illness,
    recentActivities: pushActivity(state.recentActivities, 'rest'),
  })
}
