import { findActivity } from '../data/activities'
import type { Trip } from '../data/trips'
import type { Activity } from '../types/game'

/**
 * 여행 — **일정만큼 진짜로 날짜를 태운다**(2026-08-22 설계자 지시).
 *
 * ## 무엇이 바뀌었나
 * 예전에는 `Trip.schedule`("3박 5일")이 **표시 전용 글자**였고 여행은 그날 몇 시간으로
 * 끝났다 — 크루즈를 다녀와도 달력이 하루도 안 넘어갔다. 지금은 `Trip.days`만큼 밤이
 * 지나가고, 그 사이 생활비·청구·마감이 평소대로 흐른다.
 *
 * ## ⚠️ 활동은 하루치를 갖고 상품은 일수를 갖는다
 * `travel`·`travel-near`의 효과와 값은 **하루치**다. 실제로 적용되는 것은 여기서
 * `days`를 곱한 값이고, 그래서 **상품에 가격을 적지 않는다**(알바 공고가 일당을 안 적는
 * 것과 같은 규칙 — 두 번째 출처가 생기면 화면과 실제가 갈린다).
 *
 * ## ⚠️ 여행의 대가는 돈이 아니라 잃는 날이다
 * 며칠 동안 아무 활동도 못 하므로 그몽 마감·회의·출근이 그대로 지나간다. 그것이 긴
 * 일정을 고를 때의 무게이고, 확인창이 "5일이 지나갑니다"를 적는 이유다.
 */

/** 그 상품이 태우는 날 수. 1보다 작을 수 없다(하루는 무조건 간다). */
export function tripDays(trip: Trip): number {
  return Math.max(1, Math.round(trip.days))
}

/**
 * 그 상품이 실제로 만드는 활동 — **하루치 효과에 일수를 곱한 사본**이다.
 *
 * ⚠️ **새 활동을 데이터에 만들지 않는다**(상품 10종 × 활동 10개가 된다). 실행·미리보기·
 * 가격 표시가 전부 이 함수 하나를 지나야 세 화면이 같은 숫자를 말한다.
 */
export function tripActivity(trip: Trip): Activity | undefined {
  const base = findActivity(trip.activityId)
  if (!base) return undefined
  const days = tripDays(trip)
  const effects = Object.fromEntries(
    Object.entries(base.effects).map(([key, value]) => [key, value * days]),
  ) as Activity['effects']
  /* ⚠️ **요구 조건도 함께 곱한다.** 효과만 곱하면 2일 상품인데 5일치 소지금을 요구해
     갈 수 있는 여행을 못 가게 막는다(`canRun`이 이 값을 본다). */
  const requires = base.requires
    ? (Object.fromEntries(
        Object.entries(base.requires).map(([key, value]) => [key, value * days]),
      ) as Activity['requires'])
    : undefined
  return {
    ...base,
    effects,
    requires,
    /* 첫날의 시간만 시계를 민다 — 나머지 날은 밤으로 넘어간다(`goOnTrip`). */
    label: `${base.label} · ${trip.schedule}`,
  }
}
