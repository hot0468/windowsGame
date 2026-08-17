import { HOLIDAYS, dayOfHoliday, holidayOn } from '../data/holidays'
import { clampStats } from './turn'
import type { GameState } from '../types/game'

/**
 * 명절·기념일의 규칙 — **지나간 날을 한 번씩만 정산한다.**
 *
 * ## ⚠️ 커서 하나가 저장의 전부다
 * `GameState.holidayDay` = 여기까지 정산했다는 날. 스케줄러·자동 진행이 며칠을 한 번에
 * 흘려도 그 사이의 기념일이 전부 정산되고, 같은 날이 두 번 정산되지 않는다
 * (`Employment.checkedDay`·`bank.accruedDay`와 같은 장치).
 *
 * ## ⚠️ 커서가 없으면 어제부터 센다
 * 구세이브(이 축이 생기기 전)는 커서가 없다. 그때 1일차부터 다시 세면 **지나간 명절
 * 몇 달치 멘탈이 한 번에 들어온다** — 어제(`day - 1`)부터로 잡아 오늘 것만 정산하고
 * 과거는 버린다(기록이 아니라 그날의 기분이라, 소급하면 뜻이 없다).
 */

/** 그날 밤 정산. 오늘까지 온 기념일의 멘탈을 얹고 커서를 오늘로 민다. */
export function advanceHolidays(state: GameState): GameState {
  const from = state.holidayDay ?? state.day - 1
  if (from >= state.day) return state

  let mental = 0
  for (const h of HOLIDAYS) {
    const day = dayOfHoliday(h)
    if (day > from && day <= state.day) mental += h.mental
  }
  /* 평일에도 커서는 오늘로 민다 — 안 밀어도 결과는 같지만(구간만 길어진다) 커서의
     뜻("여기까지 정산했다")이 거짓이 된다. */
  return {
    ...state,
    holidayDay: state.day,
    stats:
      mental > 0 ? clampStats({ ...state.stats, mental: state.stats.mental + mental }) : state.stats,
  }
}

/**
 * 오늘의 기념일 메시지. **그날 하루만 뜨는 파생 메시지다**(주말 호출과 같은 자리) —
 * 저장하지 않고 매번 만들며, 방이 안 열려 있으면 조용히 사라진다.
 */
export function holidayMessages(
  state: GameState,
): { id: string; channel: string; from: string; subject: string; text: string }[] {
  const today = holidayOn(state.day)
  if (!today || state.gameOver) return []
  return [
    {
      id: `holiday-${today.id}`,
      channel: today.message.channel,
      from: today.message.from,
      /* 메일 제목. 카톡으로 가는 메시지는 이 필드를 아무도 안 읽는다. */
      subject: `[${today.name}] ${today.message.from}`,
      text: today.message.text,
    },
  ]
}

export { HOLIDAYS, dayOfHoliday, holidayOn }
