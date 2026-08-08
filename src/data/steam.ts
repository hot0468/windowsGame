import type { IconName } from '../types/game'

/**
 * 증기(가짜 스팀) 라이브러리에 꽂혀 있는 게임.
 *
 * ⚠️ **수치가 없다.** 어느 게임을 켜든 실행되는 활동은 `game`(게임하기) 하나이고
 * (미디북스의 책·시집이의 영화와 같은 규칙), 여기 있는 것은 **무엇을 하며 시간을
 * 보내는가**라는 이야기뿐이다. 게임마다 효과를 다르게 주면 밸런스 테스트가 못 보는
 * 두 번째 출처가 생기고, "멘탈 회복처는 넷"이라는 불변식도 게임 수만큼 갈라진다.
 *
 * ⚠️ **실존 게임 이름을 쓰지 않는다**(배너·사이트와 같은 규칙). 전부 지어낸 제목이고
 * 패러디는 호의적인 톤만 쓴다.
 *
 * ⚠️ **표지는 이미지가 아니라 CSS 그라데이션 + 글자다**(오프라인 규칙 — 외부 이미지 금지).
 */
export interface SteamGame {
  id: string
  title: string
  /** 목록 왼쪽의 작은 글리프. 라이브러리 목록은 실제 스팀도 게임마다 아이콘이 다르다. */
  icon: IconName
  /** 표지 판. 사진이 없으므로 면 + 제목으로 표지를 만든다. */
  cover: string
  genre: string
  /** 상점 태그. 카드 아래 칩으로 뜬다. */
  tags: string[]
  /** 한 줄 소개. 실제 스팀 상세의 짧은 설명 자리다. */
  blurb: string
}

export const STEAM_GAMES: SteamGame[] = [
  {
    id: 'toaster-knight',
    title: '토스터 기사단',
    icon: 'fluent-color:shield-24',
    cover: 'linear-gradient(135deg, #3b2f63 0%, #7c5cbf 100%)',
    genre: '액션 RPG',
    tags: ['판타지', '싱글 플레이', '조작 어려움'],
    blurb: '빵을 굽던 기사가 왕국을 구한다. 굽는 시간이 곧 쿨타임이다.',
  },
  {
    id: 'deadline-2',
    title: '데드라인 2',
    icon: 'fluent-color:clock-alarm-24',
    cover: 'linear-gradient(135deg, #7a2c2c 0%, #d4622f 100%)',
    genre: '생존',
    tags: ['공포', '멀티플레이', '협동'],
    blurb: '마감을 앞둔 사무실에서 살아남는다. 커피는 한 잔뿐이다.',
  },
  {
    id: 'farm-of-tomorrow',
    title: '내일의 농장',
    icon: 'fluent-color:weather-sunny-low-24',
    cover: 'linear-gradient(135deg, #2f5d3a 0%, #86b64a 100%)',
    genre: '시뮬레이션',
    tags: ['힐링', '싱글 플레이', '느긋함'],
    blurb: '심고 기다린다. 기다리는 동안 아무 일도 일어나지 않는 것이 좋은 점이다.',
  },
  {
    id: 'orbit-cats',
    title: '궤도의 고양이들',
    icon: 'fluent-color:planet-24',
    cover: 'linear-gradient(135deg, #1f3b6e 0%, #4aa3d8 100%)',
    genre: '퍼즐',
    tags: ['우주', '싱글 플레이', '한 판만 더'],
    blurb: '고양이를 궤도에 올린다. 왜 올려야 하는지는 3막에서 설명한다.',
  },
  {
    id: 'noodle-tycoon',
    title: '분식 대기업',
    icon: 'fluent-color:food-24',
    cover: 'linear-gradient(135deg, #7a4a12 0%, #e0a33a 100%)',
    genre: '경영',
    tags: ['타이쿤', '싱글 플레이', '숫자 늘리기'],
    blurb: '떡볶이 한 그릇에서 시작한다. 결국 숫자만 남는다.',
  },
  {
    id: 'last-subway',
    title: '막차',
    icon: 'fluent-color:location-ripple-24',
    cover: 'linear-gradient(135deg, #2a2f45 0%, #6b7a99 100%)',
    genre: '내러티브',
    tags: ['스토리 중심', '짧음', '분위기'],
    blurb: '막차를 놓친 사람들의 이야기. 40분이면 끝나고 오래 남는다.',
  },
]

export function findSteamGame(id: string): SteamGame | undefined {
  return STEAM_GAMES.find((g) => g.id === id)
}

/**
 * 한 번 켤 때 흘러가는 시간(분). **표시 전용 환산값이다** —
 * 실제 게임 규칙은 "1턴을 쓴다"이고, 이 숫자는 그 반나절을 스팀처럼 적기 위한 것이다.
 * ⚠️ 게임 상태를 만들지 않는다(플레이 시간은 `GameState.steam`의 **횟수**에서 파생된다).
 */
export const MINUTES_PER_SESSION = 210

/** 스팀식 플레이 시간 표기. 1시간 미만은 분으로 적는다(레퍼런스와 같다). */
export function playtimeLabel(sessions: number): string {
  const minutes = sessions * MINUTES_PER_SESSION
  if (minutes === 0) return '플레이한 적 없음'
  if (minutes < 60) return `${minutes}분`
  return `${(minutes / 60).toFixed(1)}시간`
}
