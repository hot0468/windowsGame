import { dateOf } from './calendar'
import type { IconName } from '../types/game'

/**
 * 계절 — **판에 리듬을 주는 축**(2026-08-22 설계자 지시: "스타듀밸리처럼 느긋하게").
 *
 * ## 왜 필요한가
 * 이 게임의 달력에는 여태 **되돌아오는 것이 없었다.** 요일은 일주일마다 돌아오지만 너무
 * 짧고, 물가 사건은 지나가 버린다. 그래서 3일차 화면과 300일차 화면이 똑같이 생겼다.
 * 계절은 **"지금 아니면 못 하는 것"**을 만든다 — 이번 여름에 못 간 행사는 내년 여름까지
 * 기다려야 하고, 그 기다림이 곧 시간이 흐른다는 감각이다.
 *
 * ## ⚠️ 새 상태가 아니다
 * 계절은 **날짜의 순수 함수**다(날씨·행사 개최와 같은 규칙). `GameState`에 계절 필드를
 * 만들지 말 것 — 저장하는 순간 마이그레이션이 붙고, 세이브와 달력이 어긋날 수 있다.
 *
 * 달력은 2026-03-01에 시작하므로 **1일차는 봄의 첫날이다**(`data/calendar.ts`).
 */
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter'

export interface Season {
  id: SeasonId
  label: string
  /** 이 계절에 속한 달(1~12). */
  months: number[]
  /** 날짜칸에 붙는 글리프. ⚠️ HUD는 단색 `mdi` 세트다(다색은 아이콘 규칙 위반). */
  icon: IconName
  /** 날짜칸 한 줄. 계절이 무엇을 데려오는지 글자로 적는다(아이콘만으로 알리지 않는다). */
  note: string
}

export const SEASONS: Season[] = [
  {
    id: 'spring',
    label: '봄',
    months: [3, 4, 5],
    icon: 'mdi:flower',
    note: '새 학기와 채용의 계절',
  },
  {
    id: 'summer',
    label: '여름',
    months: [6, 7, 8],
    icon: 'mdi:white-balance-sunny',
    note: '축제와 행사가 몰리는 계절',
  },
  {
    id: 'autumn',
    label: '가을',
    months: [9, 10, 11],
    icon: 'mdi:leaf',
    note: '대회와 공모가 열리는 계절',
  },
  {
    id: 'winter',
    label: '겨울',
    months: [12, 1, 2],
    icon: 'mdi:snowflake',
    note: '집 안에서 쌓는 계절',
  },
]

/**
 * 그 날의 계절.
 *
 * ⚠️ **달(month)에서 뽑는다** — 게임 날짜를 90으로 나누는 식으로 따로 세면 달력이 적는
 * 날짜(`formatGameDate`)와 어긋나 "3월인데 겨울"이 된다.
 * ⚠️ 이 함수가 `data/`에 있는 이유는 **행사 개최 판정(`data/expos.ts`)이 쓰기 때문**이다.
 * data가 systems를 import하면 의존 방향이 뒤집힌다. 더 두꺼운 계절 규칙은 `systems/season.ts`.
 */
export function seasonOf(day: number): Season {
  const month = dateOf(day).getMonth() + 1
  return SEASONS.find((s) => s.months.includes(month))!
}
