/**
 * 시계 — **하루가 분 단위로 흐른다**(2026-08-22 설계자 지시).
 *
 * ## 무엇이 바뀌었나
 * 예전에는 하루가 **오전·오후 두 칸**이었고 활동 하나가 한 칸을 통째로 먹었다. 그래서
 * "책 한 권 읽기"와 "알바 8시간"이 같은 무게였고, 시간이 흐르는 감각도 하루 두 번뿐이었다.
 * 지금은 **활동마다 걸리는 시간이 다르고**(`Activity.minutes`) 시계가 그만큼 나아간다.
 *
 * ## ⚠️ 오전/오후(`Slot`)를 지우지 않았다 — **파생값으로 남겼다**
 * 예약(스케줄러)·메시지 편성·정규직 근무는 여전히 "오전/오후" 단위로 말한다. 그것까지
 * 분으로 바꾸면 이 판 전체가 한 번에 흔들리므로, **시계가 진실이고 슬롯은 그 시계에서
 * 파생된다**(`slotOf`). 시각을 직접 저장하는 곳은 `GameState.minute` 하나다.
 *
 * ## 하루의 경계
 * 08:00에 일어나 자정에 잔다. 자정을 넘기는 활동은 **그 자리에서 하루를 끝낸다** —
 * 밤 정산(생활비·회복·병)이 그때 돌고 다음 날 08:00으로 넘어간다.
 */

/** 아침에 눈을 뜨는 시각(분). */
export const DAY_START = 8 * 60

/** 하루의 끝(분). 이 시각을 넘기면 잔다. */
export const DAY_END = 24 * 60

/** 활동에 시간이 안 적혀 있을 때의 기본값(분). 2시간이 이 게임의 보통 한 건이다. */
export const DEFAULT_ACTIVITY_MIN = 120

/**
 * 오전/오후가 갈리는 시각(분). **정오다.**
 * ⚠️ 여기를 옮기면 예약·근무·메시지 편성이 함께 움직인다(전부 `slotOf`를 지난다).
 */
export const NOON = 12 * 60

/** "오후 3:20" 꼴로 적는다. 작업 표시줄 시계와 날짜칸이 같은 함수를 쓴다. */
export function formatClock(minute: number): string {
  const m = ((minute % (24 * 60)) + 24 * 60) % (24 * 60)
  const h24 = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  const half = h24 < 12 ? '오전' : '오후'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${half} ${h12}:${mm}`
}

/** 남은 시간을 "3시간 20분" 꼴로. 0분이면 "0분"이다. */
export function formatSpan(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/**
 * **기준 수면 시간**(분). 자정에 자면 아침 8시까지 딱 이만큼 잔다.
 * 회복량(`SLEEP_RECOVERY`)이 이 시간을 기준으로 잡혀 있다.
 */
export const BASE_SLEEP_MIN = DAY_END - DAY_START // 자정 → 08:00 = 8시간

/**
 * 잠을 잘 수 있는 가장 이른 시각(분). **저녁 8시.**
 *
 * ⚠️ 더 앞으로 열지 않는 것은 "하루를 통째로 버리고 자기"가 최적해가 되지 않게 하기
 * 위해서다 — 회복에는 상한이 있고(`MAX_SLEEP_BONUS`) 잃는 시간에는 없다.
 */
export const EARLIEST_BED = 20 * 60

/**
 * 잘 수 있는 시각들(분). 화면이 이 목록으로 고르기 판을 그린다.
 * ⚠️ **한 시간 단위다** — 분 단위로 열면 고르는 일이 계산이 된다.
 */
export const BED_TIMES = [20 * 60, 21 * 60, 22 * 60, 23 * 60, DAY_END]

/**
 * 오래 자서 얻는 회복의 **상한 배율**. 8시간이 1.0이고 12시간을 자도 여기서 멈춘다.
 *
 * ⚠️ 상한이 없으면 "저녁 8시에 자기"가 언제나 정답이 된다 — 일찍 자는 것은 시간을 주고
 * 회복을 사는 거래여야지, 공짜 이득이면 안 된다.
 */
export const MAX_SLEEP_BONUS = 1.25

/** 늦게 자서 줄어드는 회복의 **하한 배율**. 밤을 새워도 이만큼은 잔다. */
export const MIN_SLEEP_BONUS = 0.6

/**
 * 그 시각에 자면 회복이 몇 배인가. 기준(자정 취침 = 8시간)이 1이다.
 *
 * ⚠️ **`data/`에 있는 이유는 `turn.ts`가 쓰기 때문이다**(계절 `seasonOf`·요금제 `planOf`와
 * 같은 회피) — systems에 두면 `turn ↔ clock` 방향이 뒤집힌다.
 */
export function sleepBonusFor(bedMinute: number): number {
  /* ⚠️ **자정을 넘긴 시각도 그대로 받는다**(clamp 금지) — 활동이 밤을 넘겨 뻗어 자는 판이
     그때 생기고, 그게 곧 밤샘의 대가다. 여기서 자정으로 잘라 버리면 밤을 새워도 8시간
     잔 것이 되어 "늦게 자면 덜 회복한다"가 사라진다. */
  const slept = DAY_END - bedMinute + BASE_SLEEP_MIN
  const ratio = slept / BASE_SLEEP_MIN
  return Math.min(MAX_SLEEP_BONUS, Math.max(MIN_SLEEP_BONUS, ratio))
}
