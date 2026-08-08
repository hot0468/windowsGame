/**
 * 행사 안내(모두의행사) — 참관·참여할 수 있는 행사 목록.
 *
 * ⚠️ **실존 행사·주최사 금지**(알바몬·그몽·공모전과 같은 규칙). 전부 지어낸 이름이다.
 * ⚠️ `Math.random`·`Date` 금지 — **개최 여부는 날짜의 순수 함수다**(아래 `isOpen`).
 *   저장하면 새로 고칠 때마다 다시 굴러 세이브 스커밍이 열린다(주식 시세와 같은 이유).
 *
 * ## ⚠️ 행사는 수치를 갖되 활동은 가리키기만 한다
 * 입장료·부스비는 **행사가** 갖고(강의 수강료 `Course.price`와 같은 방향), 스탯 증감은
 * **활동이** 갖는다. 활동 하나가 여러 행사를 대신 실행하므로 그 반대로 두면 밸런스
 * 테스트가 못 보는 두 번째 출처가 생긴다.
 *
 * ## ⚠️ 참여가 없는 행사에는 참여 버튼을 그리지 않는다
 * `join`이 없으면 **참관만 받는 행사**다(동작 안 하는 컨트롤 금지). 화면은 그 사실을
 * 글자로 적는다.
 */

import type { Stats } from '../types/game'

/** 참여(부스·무대에 서는 것). 없으면 그 행사는 참관만 받는다. */
export interface ExpoJoin {
  label: string
  desc: string
  /**
   * 참여가 실행할 활동. **`siteId`와 배타다** — 둘 다 있으면 어느 쪽이 참인지 알 수 없다.
   * (`expos.test.ts`가 지킨다.)
   */
  activityId?: string
  /**
   * 고를 것이 있는 참여는 **그 사이트로 보낸다**(코미콘 — 어느 회지를 파는가).
   * ⚠️ 판매 통로를 여기서 새로 만들지 않는다. 이미 있는 화면 하나를 지나야
   * "한 권은 한 번만 쓴다"가 두 곳에서 갈리지 않는다.
   */
  siteId?: string
  /** 부스 참가비. 활동이 아니라 행사가 갖는다. */
  fee?: number
  /** 참여에 필요한 것을 글자로 적는다. 판정은 화면이 시스템에 물어본다. */
  requires?: string
  /**
   * **수상.** 있으면 참여한 그 자리에서 스탯을 보고 상을 준다.
   *
   * ⚠️ **무작위가 없다**(공모전과 같은 규칙) — 못 받았을 때 **무엇이 모자랐는지** 말해
   * 줘야 하고, 주사위가 섞이면 그 설명이 거짓이 된다. 판정은
   * `systems/expos.ts`의 `awardShortfalls` 하나가 한다.
   *
   * ⚠️ **상금이 없다. 주는 것은 평판뿐이다.** "행사는 수입원이 아니다"가 이 시스템의
   * 확정 규칙이고(활동 전부가 돈을 한 푼도 안 준다), 대회만 예외로 두면 회지 판매와 같은
   * 수입 상한이 두 곳으로 갈린다. 평판 상한 100이 반복 수상도 저절로 막는다.
   */
  award?: {
    /** 수상에 필요한 최소 스탯. **둘 이상이면 전부 충족해야 한다.** */
    requires: Partial<Record<keyof Stats, number>>
    /** 상의 이름. 화면이 "무엇을 받았나"를 적는다. */
    title: string
    /** 수상 시 오르는 평판. */
    reputation: number
  }
}

export interface Expo {
  id: string
  title: string
  host: string
  place: string
  tags: string[]
  /** 참관이 실행할 활동. 고른 행사가 활동을 정한다(배달 메뉴·여행 상품과 같은 규칙). */
  visitActivityId: string
  /** 참관 입장료. */
  fee: number
  join?: ExpoJoin
  /**
   * 개최 주기(일)와 기간(일), 그리고 주기 안에서 여는 첫날의 오프셋.
   * ⚠️ **오프셋을 흩어 두는 것이 규칙이다** — 전부 같은 날 열리면 목록이 "전부 열림 /
   * 전부 닫힘" 두 상태만 오간다.
   */
  cycle: number
  openDays: number
  offset: number
  badge?: string
}

export const EXPOS: Expo[] = [
  {
    /*
     * ⚠️ **수상 조건이 둘인 유일한 행사다**(설계자 지시: "운동+매력까지 높아야 수상 가능").
     * 무대에서 몸을 보여 주는 대회라 운동만으로는 상을 못 받는다 — 그 둘째 조건이
     * 이 대회의 성격 전부이고, 운동 특화 플레이가 마라톤으로는 상을 받지만 여기서는
     * 못 받는 갈림이 그래서 생긴다(`expos.test.ts`가 그 갈림을 지킨다).
     */
    id: 'bodybuilding',
    title: '보디빌딩 선수권',
    host: '대한피지크연맹',
    place: '늘봄체육관 대경기장',
    tags: ['체육', '대회'],
    visitActivityId: 'expo-visit',
    fee: 18_000,
    join: {
      label: '참가 신청 (무대)',
      desc: '무대에 올라 규정 포즈를 잡습니다. 몸만 만들면 되는 대회가 아닙니다.',
      activityId: 'expo-compete',
      fee: 40_000,
      requires: '운동과 매력이 모두 높아야 수상합니다',
      award: { requires: { athletics: 300, charm: 200 }, title: '피지크 부문 입상', reputation: 12 },
    },
    cycle: 24,
    openDays: 2,
    offset: 13,
    badge: '수상 가능',
  },
  {
    /*
     * 마라톤. **수상 조건이 운동 하나뿐이라 보디빌딩보다 문턱이 낮다** — 대신 참가비도
     * 상금(평판)도 작다. 몸만 만들면 되는 대회가 하나는 있어야 운동 특화가 보상을 받는다.
     */
    id: 'marathon',
    title: '늘봄강 마라톤',
    host: '늘봄시체육회',
    place: '늘봄강 시민공원',
    tags: ['체육', '대회'],
    visitActivityId: 'expo-visit',
    fee: 0,
    join: {
      label: '참가 신청 (10km)',
      desc: '번호표를 달고 강변을 달립니다. 완주만으로도 다리는 며칠 아픕니다.',
      activityId: 'expo-compete',
      fee: 20_000,
      requires: '운동이 높아야 입상합니다',
      award: { requires: { athletics: 200 }, title: '10km 부문 입상', reputation: 8 },
    },
    cycle: 18,
    openDays: 1,
    offset: 7,
  },
  {
    id: 'comicon',
    title: '코미콘',
    host: '코미콘 조직위원회',
    place: '한빛컨벤션 A홀',
    tags: ['창작', '판매'],
    visitActivityId: 'expo-visit',
    fee: 15_000,
    join: {
      label: '참여 신청 (부스)',
      desc: '직접 묶은 회지를 부스에서 팝니다. 어느 회지를 낼지는 코미콘에서 고릅니다.',
      siteId: 'comicon',
      requires: '3장 이상인 작품집이 있어야 합니다',
    },
    cycle: 12,
    openDays: 3,
    offset: 0,
    badge: '회지 판매',
  },
  {
    id: 'illust-fair',
    title: '일러스트 페어',
    host: '그림마당 조합',
    place: '중앙시 문화센터',
    tags: ['창작', '전시'],
    visitActivityId: 'expo-visit',
    fee: 20_000,
    join: {
      label: '참여 신청 (부스)',
      desc: '작은 부스를 열어 그림을 걸어 둡니다. 돈은 거의 안 되지만 얼굴이 알려집니다.',
      activityId: 'expo-booth',
      fee: 50_000,
    },
    cycle: 15,
    openDays: 3,
    offset: 5,
  },
  {
    id: 'book-fair',
    title: '국제 도서전',
    host: '출판인회의',
    place: '한빛컨벤션 B홀',
    tags: ['출판', '전시'],
    visitActivityId: 'expo-visit',
    fee: 12_000,
    join: {
      label: '참여 신청 (부스)',
      desc: '독립 출판 구역에 자리를 얻습니다. 명함을 돌리고 하루를 보냅니다.',
      activityId: 'expo-booth',
      fee: 60_000,
    },
    cycle: 20,
    openDays: 4,
    offset: 9,
  },
  {
    id: 'indie-game-show',
    title: '인디 게임쇼',
    host: '인디게임연합',
    place: '노들섬 전시장',
    tags: ['게임', '체험'],
    visitActivityId: 'expo-visit',
    fee: 25_000,
    /* ⚠️ 참여가 없다 — 만들어 낼 게임이 이 게임에는 없다(장식 금지). */
    cycle: 18,
    openDays: 2,
    offset: 3,
  },
  {
    id: 'job-expo',
    title: '청년 취업 박람회',
    host: '중앙시 일자리재단',
    place: '시청 대강당',
    tags: ['취업', '상담'],
    visitActivityId: 'expo-visit-biz',
    /* ⚠️ 무료다 — 공공 행사이고, 초반에 갈 수 있는 행사가 하나는 있어야 목록이 안 닫힌다. */
    fee: 0,
    cycle: 14,
    openDays: 2,
    offset: 7,
    badge: '무료',
  },
  {
    id: 'tech-conf',
    title: '개발자 컨퍼런스',
    host: '한빛테크포럼',
    place: '한빛컨벤션 C홀',
    tags: ['기술', '강연'],
    visitActivityId: 'expo-visit-biz',
    fee: 45_000,
    cycle: 22,
    openDays: 2,
    offset: 13,
  },
]

export function findExpo(id: string): Expo | undefined {
  return EXPOS.find((e) => e.id === id)
}

/**
 * 주기 안에서 오늘이 몇 번째 날인가(0부터). 음수 나머지를 두 번 접어 항상 0 이상이다.
 * ⚠️ 1일차부터 세므로 `day - 1`이 기준이다 — 안 그러면 `offset: 0`인 행사가 1일차에 안 연다.
 */
function phaseOf(expo: Expo, day: number): number {
  const raw = (day - 1 - expo.offset) % expo.cycle
  return ((raw % expo.cycle) + expo.cycle) % expo.cycle
}

/** 오늘 열려 있는가. **날짜의 순수 함수다** — 저장하지 않는다. */
export function isOpen(expo: Expo, day: number): boolean {
  return phaseOf(expo, day) < expo.openDays
}

/** 다음 개최까지 남은 날. 오늘 열려 있으면 0이다. */
export function daysUntilOpen(expo: Expo, day: number): number {
  if (isOpen(expo, day)) return 0
  return expo.cycle - phaseOf(expo, day)
}

/** 오늘이 이번 회차의 며칠째인가(1부터). 안 열려 있으면 undefined. */
export function openDayOf(expo: Expo, day: number): number | undefined {
  return isOpen(expo, day) ? phaseOf(expo, day) + 1 : undefined
}

/** 오늘 열려 있는 행사. 목록 화면이 "지금 열린 것"을 위로 올릴 때 쓴다. */
export function openExpos(day: number): Expo[] {
  return EXPOS.filter((e) => isOpen(e, day))
}
