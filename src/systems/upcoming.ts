import { EXPOS, daysUntilOpen } from '../data/expos'
import { HOLIDAYS, dayOfHoliday } from '../data/holidays'
import { dueSoonContests, pendingEntries } from './contests'
import { findContest } from '../data/contests'
import type { GameState } from '../types/game'

/**
 * **다가오는 일정** — 날짜칸이 "며칠 뒤에 무엇이 있다"를 적기 위해 읽는 목록.
 *
 * ## 왜 이 파일이 생겼나 (2026-08-16)
 * 이 게임에는 날짜를 가진 것이 여럿인데(공모전 접수 마감·발표일·행사 개최) **어느 것도
 * 달력에 안 떴다.** 날짜칸이 보여 주던 것은 오늘·생활비·물가 인상·날씨뿐이라, 목표가
 * 있어도 "언제까지"가 화면 어디에도 없었다. 육성 게임의 목표는 **다가오는 날**이 만든다.
 *
 * ## ⚠️ 저장하지 않는다
 * 전부 날짜의 순수 함수이거나 이미 저장된 상태(출품 기록)에서 파생된다 — 여기서 상태를
 * 만들지 않는다. 그래서 며칠을 한 번에 흘려도 다시 계산되고 어긋나지 않는다.
 *
 * ## ⚠️ 가까운 것만 적는다
 * `WITHIN_DAYS` 밖은 안 보여 준다. "다가온다"는 말이 성립하려면 가까워야 하고, 전부 적으면
 * 열여섯 줄이 늘 떠 있어 **아무것도 다가오지 않는 것과 같아진다.** 목록이 비는 날이 있는
 * 것이 정상이다(편성표에 빈 턴이 있는 것과 같은 판단).
 */

/** 며칠 앞까지 보여 주는가. 이보다 먼 것은 "다가오는" 것이 아니다. */
export const WITHIN_DAYS = 7

/** 날짜칸이 한 번에 그리는 줄 수. 늘리면 패널이 길어져 건너뛰기 버튼이 밀린다. */
export const SHOWN = 2

export interface UpcomingItem {
  /** 화면이 목록의 key로 쓴다. */
  id: string
  /** 며칠 후인가. **0이면 오늘이다.** */
  inDays: number
  /** 무슨 일인가. 화면은 이 문장을 그대로 적는다(화면이 문구를 만들지 않는다). */
  label: string
}

/**
 * 지금부터 `WITHIN_DAYS` 안에 오는 일들. **가까운 순**이고 최대 `SHOWN`개다.
 *
 * ⚠️ **원천은 셋이고 각자 자기 날짜 함수를 그대로 쓴다**(여기서 날짜를 다시 계산하지
 * 않는다): 공모전 마감은 `dueSoonContests`, 발표는 `ContestEntry.resultDay`,
 * 행사 개최는 `daysUntilOpen`.
 *
 * ⚠️ **게임이 끝났으면 비어 있다** — 그때 읽혀야 하는 것은 엔딩이지 다음 주 일정이 아니다.
 */
export function upcoming(state: GameState): UpcomingItem[] {
  if (state.gameOver) return []
  const items: UpcomingItem[] = []

  /* 공모전 마감. **아직 안 낸 것만** 온다(낸 것은 아래 발표 줄이 진다). */
  for (const { contest, inDays } of dueSoonContests(state)) {
    items.push({
      id: `due-${contest.id}`,
      inDays,
      label: `${contest.title} 마감`,
    })
  }

  /* 발표일. 이미 낸 것이라 목표는 아니지만 **기다리는 것도 일정이다.** */
  for (const entry of pendingEntries(state)) {
    const contest = findContest(entry.contestId)
    if (!contest) continue
    items.push({
      id: `result-${entry.contestId}`,
      inDays: entry.resultDay - state.day,
      label: `${contest.title} 발표`,
    })
  }

  /* 행사 개최. ⚠️ **오늘 열려 있는 것은 넣지 않는다** — 이미 갈 수 있는 것은 "다가오는"
     것이 아니고, 여섯 행사 중 몇 개는 늘 열려 있어 그 줄이 상시 두 칸을 먹는다. */
  for (const expo of EXPOS) {
    const inDays = daysUntilOpen(expo, state.day)
    if (inDays > 0) items.push({ id: `expo-${expo.id}`, inDays, label: `${expo.title} 개최` })
  }

  /* 명절·기념일. ⚠️ **오늘 것도 넣는다**("오늘 어린이날") — 행사와 달리 기념일은 하루뿐이라
     오늘을 빼면 정작 그날 화면 어디에도 이름이 없다. */
  for (const h of HOLIDAYS) {
    items.push({ id: `holiday-${h.id}`, inDays: dayOfHoliday(h) - state.day, label: h.name })
  }

  return items
    .filter((i) => i.inDays >= 0 && i.inDays <= WITHIN_DAYS)
    .sort((a, b) => a.inDays - b.inDays || a.id.localeCompare(b.id))
    .slice(0, SHOWN)
}
