import { OUTDOOR_ACTIVITY_IDS, SNOW_MONTHS, WEATHERS, WEATHER_TABLE } from '../data/weather'
import { dateOf } from '../data/calendar'
import type { Weather } from '../data/weather'

/**
 * 날씨 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(`callcenter.ts`·`drive.ts`와 같다). 이 파일이 만드는 것은
 * 곱할 계수 하나뿐이고, 그것을 쓰는 쪽이 `turn.ts`다 — 반대로 두면 활동 실행이 날씨를
 * 알아야 하고 밸런스 시뮬레이션의 의존 그래프가 뒤집힌다.
 *
 * ## 결정성
 * 저장하지 않는다. `GameState`에 날씨 필드가 없는 것이 곧 규칙이다 — 저장하면 새로 고칠
 * 때마다 다시 굴러 세이브 스커밍이 열리고, 세이브 마이그레이션도 따라붙는다.
 */

/**
 * 그 날짜의 굴림값(0~99). **`Math.random`이 아니라 날짜의 순수 함수다.**
 *
 * ⚠️ **곱셈 상수가 `systems/drive.ts`의 `roll`과 달라야 한다.** 같으면 날씨와 주말 호출이
 * 같은 날 같은 방향으로 몰려("비 오는 토요일마다 반드시 호출") 두 기능이 한 기능처럼 읽힌다.
 * 여기 쓴 값은 32비트 황금비 상수의 다른 갈래이고, 한 번 섞어(`x ^ x>>>15`) 인접한 날이
 * 인접한 값이 되지 않게 한다.
 */
function roll(day: number): number {
  const x = Math.imul(day + 1, 2246822519) >>> 0
  return (x ^ (x >>> 15)) % 100
}

/** 오늘의 날씨. 같은 날은 늘 같다. */
export function weatherOf(day: number): Weather {
  const r = roll(day)
  const picked = WEATHER_TABLE.find((t) => r < t.under) ?? WEATHER_TABLE[WEATHER_TABLE.length - 1]
  // 겨울이면 비만 눈으로 바꾼다 — 확률표는 그대로다(`SNOW_MONTHS` 주석).
  if (picked.id === 'rain' && SNOW_MONTHS.includes(dateOf(day).getMonth() + 1)) {
    return WEATHERS.snow
  }
  return WEATHERS[picked.id]
}

/** 그 활동이 바깥에서 하는 일인가. */
export function isOutdoor(activityId: string): boolean {
  return OUTDOOR_ACTIVITY_IDS.includes(activityId)
}

/**
 * 그날 그 활동의 **긍정 효과에 곱할 값**. 실내 활동은 늘 1이다.
 *
 * ⚠️ **단일 출처다** — 실제 실행(`turn.ts`)과 활동 미리보기(`activityPreview.ts`)가 같은
 * 함수를 본다. 한쪽이 따로 계산하면 확인창이 실제로 오를 값과 다른 숫자를 적는다.
 */
export function weatherEfficiency(day: number, activityId: string): number {
  return isOutdoor(activityId) ? weatherOf(day).outdoorEfficiency : 1
}
