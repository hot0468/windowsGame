/**
 * 날씨 — 오늘 하늘이 야외 활동에 얹거나 깎는 몫.
 *
 * ## 무엇을 하고 무엇을 하지 않는가
 * ⚠️ **날씨는 활동을 막지 않는다.** `canRun`에 게이트를 만들면 스케줄러에 넣어 둔 예약과
 * 자동 진행이 **조용히 스킵**되어 "예약해 뒀는데 아무 일도 안 일어났다"가 된다(잠금은
 * 플레이어가 화면에서 이유를 읽을 수 있을 때만 게이트가 될 자격이 있다). 그래서 날씨는
 * **번아웃 효율과 정확히 같은 자리**(`turn.ts`의 `applyEffects`)에 곱셈으로만 들어간다 —
 * 곧 **긍정 효과에만 붙고 소모량은 건드리지 않는다**. 비 맞고 뛰면 덜 얻지, 더 지치지 않는다.
 *
 * ⚠️ **실내 활동에는 아무 보정도 없다.** "비 오는 날 집에 있으면 좋다"까지 넣으면 날씨가
 * 활동 선택 전체에 곱해지는 두 번째 밸런스 축이 된다 — 야외 한 방향으로만 적는다.
 *
 * ⚠️ `Math.random` 금지. 날씨는 **날짜의 순수 함수**다(주식 시세·행사 개최·주말 호출과 같은
 * 규칙) — 굴리면 새로 고칠 때마다 답이 달라져 세이브 스커밍이 열린다. 저장하지도 않는다.
 */

export type WeatherId = 'clear' | 'cloudy' | 'rain' | 'snow'

export interface Weather {
  id: WeatherId
  label: string
  /**
   * HUD에 붙는 아이콘. ⚠️ **HUD는 단색 `mdi` 세트를 쓴다**(아이콘 규칙) — `fluent-color`에는
   * 날씨 글리프가 둘뿐이라 애초에 넷을 채울 수 없다. 없는 이름은 `npm run icons`가
   * 빌드를 실패시키므로 지어내지 말 것.
   */
  icon: string
  /** 야외 활동의 **긍정 효과**에 곱하는 값. 1이 평소다. */
  outdoorEfficiency: number
  /** 달력 패널에 적는 한 줄. 수치를 글자로도 알린다(색·아이콘만으로 알리지 않는다). */
  note: string
}

/**
 * 날씨 4종.
 *
 * ⚠️ **보정폭을 ±15% 안에 둔다.** 이 계수는 완주 시뮬레이션(`balance.verify.test.ts`)이
 * 매일 통과하는 자리라, 크게 잡으면 "판은 약 88~101일에 끝난다"가 날씨 운으로 흔들린다.
 * 폭을 넓히고 싶으면 먼저 그 테스트를 보고 오라 — **수치를 낮추는 쪽이 정답이다.**
 */
export const WEATHERS: Record<WeatherId, Weather> = {
  clear: {
    id: 'clear',
    label: '맑음',
    icon: 'mdi:weather-sunny',
    outdoorEfficiency: 1.1,
    note: '바깥에서 하는 일이 잘 됩니다 (+10%)',
  },
  cloudy: {
    id: 'cloudy',
    label: '흐림',
    icon: 'mdi:weather-cloudy',
    outdoorEfficiency: 1,
    note: '평소와 같습니다',
  },
  rain: {
    id: 'rain',
    label: '비',
    icon: 'mdi:weather-rainy',
    outdoorEfficiency: 0.85,
    note: '바깥에서 하는 일이 잘 안 됩니다 (−15%)',
  },
  snow: {
    id: 'snow',
    label: '눈',
    icon: 'mdi:weather-snowy',
    outdoorEfficiency: 0.85,
    note: '바깥에서 하는 일이 잘 안 됩니다 (−15%)',
  },
}

/**
 * 굴림값(0~99) → 날씨. **앞에서부터 처음 맞는 칸이 답이다**(`BONUS_TIERS`와 같은 모양).
 * 맑은 날이 절반을 넘는 것은 의도다 — 기본이 페널티면 날씨는 규칙이 아니라 세금이 된다.
 */
export const WEATHER_TABLE: { under: number; id: WeatherId }[] = [
  { under: 55, id: 'clear' },
  { under: 80, id: 'cloudy' },
  { under: 100, id: 'rain' },
]

/**
 * 눈이 오는 달. ⚠️ **비를 눈으로 바꾸기만 한다** — 확률표를 따로 두면 겨울의 맑은 날
 * 비율이 다른 계절과 어긋나고, 그 차이를 아무 테스트도 안 지킨다.
 * (달력은 2026-03-01에 시작한다 — `data/calendar.ts`.)
 */
export const SNOW_MONTHS = [12, 1, 2]

/**
 * 날씨가 붙는 **야외 활동**.
 *
 * ⚠️ **관계는 날씨 → 활동 한 방향으로만 적는다.** 활동 쪽에 `outdoor` 플래그를 달면 같은
 * 사실이 두 곳에 생기고, 한쪽만 고쳐도 아무 테스트가 안 터진다(콜센터·드라이브가 자기
 * `careerId`를 갖는 것과 같은 규칙).
 *
 * ⚠️ **출근(`commute`)은 넣지 않는다.** 정규직은 급여가 효율 계수를 안 타므로 여기 넣으면
 * 깎이는 것이 행동력·멘탈뿐인데, 그것은 "비 오는 날 회사가 더 힘들다"라는 **다른 규칙**이고
 * 결근·해고 압박과 곱해져 밸런스를 흔든다.
 */
export const OUTDOOR_ACTIVITY_IDS = [
  'running',
  'volunteer',
  'exercise',
  'travel',
  'travel-near',
  'gig-safety',
  'work-logistics',
]
