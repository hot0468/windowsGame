import { GAME_START_DATE, dayOf } from './calendar'

/**
 * 명절·기념일 — **달력이 정하는 이벤트.**
 *
 * ## 왜 이 축이 생겼나 (2026-08-16)
 * 1일차가 실제 달력의 2026년 3월 1일이라(`GAME_START_DATE`) 화이트데이·어린이날 같은
 * 날이 이미 판 안에 있는데, 게임이 그 날들을 전혀 몰랐다. 날짜칸에 "2일 후 어린이날"이
 * 뜨고 그날 카톡·메일이 한 통 오는 것 — **달력이 게임의 달력으로 읽히는 근거**가 이것이다.
 *
 * ## ⚠️ 개최는 날짜의 순수 함수다
 * 저장하는 것은 정산 커서(`GameState.holidayDay`) 하나뿐이고 날짜 자체는 여기 데이터가
 * 정한다(행사·주식 시세와 같은 규칙 — 저장하면 세이브 스커밍이 열린다).
 *
 * ## ⚠️ 돈을 만지지 않는다
 * 주는 것은 **멘탈 한 줌과 메시지 한 통**뿐이다. 세뱃돈·보너스류를 주면 날짜만 기다리는
 * 수입원이 생겨 "판은 물가로 끝난다"가 흔들린다(마스터 선물과 같은 결정).
 * 멘탈도 취침 회복(5)을 넘지 않는다 — 넘으면 명절이 멘탈 관리 수단이 된다.
 *
 * ## ⚠️ 음력 명절은 없다
 * 설·추석은 해마다 날이 달라 양력 환산표가 필요한데, 이 게임의 달력은 2026년 하나뿐이라
 * 표를 만드는 순간 "왜 이 해만 맞나"가 생긴다. 양력 고정일만 싣는다.
 */
export interface Holiday {
  id: string
  /** 양력 월·일. 절대 일차는 `dayOfHoliday`가 계산한다(직접 적으면 달력과 어긋난다). */
  month: number
  date: number
  name: string
  /** 그날 밤 오르는 멘탈. ⚠️ **취침 회복(5)을 넘지 말 것.** */
  mental: number
  /**
   * 그날 도착하는 메시지 한 통.
   * `channel`이 `'outlook'`이면 메일(제목은 `[기념일 이름]`으로 파생), 채팅방 id면
   * 그 방이다 — **방이 안 열려 있으면 조용히 사라진다**(없는 방의 알림을 만들지 않는다,
   * `threadVisible` 규칙 그대로).
   */
  message: { channel: string; from: string; text: string }
}

export const HOLIDAYS: Holiday[] = [
  {
    id: 'white-day',
    month: 3,
    date: 14, // 14일차
    name: '화이트데이',
    mental: 2,
    message: {
      channel: 'outlook',
      from: '컬리엔마트',
      /* ⚠️ `[광고]`를 안 붙인 것이 의도다 — 붙이면 `isAd`가 광고 폴더로 보내 아무도 못 보고,
         안 붙이고 광고를 자칭하면 분류와 어긋난다. 그래서 세일 안내가 아니라 계산대 옆
         안내문 같은 문장으로 둔다. */
      text: '화이트데이 행사 코너를 계산대 옆으로 옮겼습니다. 누군가에게 주지 않아도 됩니다.',
    },
  },
  {
    id: 'april-fools',
    month: 4,
    date: 1, // 32일차
    name: '만우절',
    mental: 2,
    message: {
      channel: 'outlook',
      from: '네이놈 고객센터',
      text: '오늘 하루 네이놈이 네이맞으로 바뀝니다. 이 메일은 진짜일 수도 있습니다.',
    },
  },
  {
    id: 'arbor-day',
    month: 4,
    date: 5, // 36일차
    name: '식목일',
    mental: 2,
    message: {
      channel: 'outlook',
      from: '관리사무소',
      text: '식목일 맞이 화단 정리를 합니다. 창가에 둔 화분은 안으로 들여 주세요.',
    },
  },
  {
    id: 'children-day',
    month: 5,
    date: 5, // 66일차
    name: '어린이날',
    mental: 4,
    message: {
      channel: 'family',
      from: '엄마',
      text: '네 어릴 때 사진 정리하다가 한참 봤다. 지금도 어린이 같은데 뭐.',
    },
  },
  {
    id: 'parents-day',
    month: 5,
    date: 8, // 69일차
    name: '어버이날',
    mental: 3,
    message: {
      channel: 'family',
      from: '아빠',
      text: '카네이션은 됐고, 시간 되면 밥이나 한번 먹자. 아빠가 산다.',
    },
  },
  {
    id: 'teachers-day',
    month: 5,
    date: 15, // 76일차
    name: '스승의날',
    mental: 3,
    message: {
      channel: 'outlook',
      from: '슬로우캠퍼스',
      text: '오늘은 스승의날입니다. 배움을 나눠 준 분께 안부를 전해 보세요.',
    },
  },
  {
    id: 'memorial-day',
    month: 6,
    date: 6, // 98일차 — 물가가 판을 끝내는 즈음이라 여기까지 보는 판이 많지 않다
    name: '현충일',
    mental: 2,
    message: {
      channel: 'outlook',
      from: '관리사무소',
      text: '현충일 조기 게양 안내드립니다. 오전 10시에는 잠시 묵념 사이렌이 울립니다.',
    },
  },
  {
    id: 'liberation-day',
    month: 8,
    date: 15, // 168일차 — 은행·복권 시뮬레이션 상한(240일) 안에는 있다
    name: '광복절',
    mental: 2,
    message: {
      channel: 'outlook',
      from: '관리사무소',
      text: '광복절 태극기 게양 안내드립니다. 국기함은 경비실에 있습니다.',
    },
  },
]

/**
 * 그 기념일의 절대 일차. ⚠️ **달력의 역함수(`dayOf`)로 계산한다** — 일차를 데이터에 직접
 * 적으면 시작일(`GAME_START_DATE`)을 옮기는 순간 전부 낡는다.
 */
export function dayOfHoliday(holiday: Holiday): number {
  return dayOf(new Date(GAME_START_DATE.year, holiday.month - 1, holiday.date))
}

/** 오늘의 기념일. 없으면 `undefined` — 대부분의 날은 아무 날도 아니다. */
export function holidayOn(day: number): Holiday | undefined {
  return HOLIDAYS.find((h) => dayOfHoliday(h) === day)
}

export function findHoliday(id: string): Holiday | undefined {
  return HOLIDAYS.find((h) => h.id === id)
}
