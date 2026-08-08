/**
 * 노24(공연 예매)에 걸리는 공연.
 *
 * ⚠️ **수치가 없다.** 무엇을 보든 실행되는 활동은 `concert` 하나이고 관람료도 그 활동이
 * 갖는다(시집이의 영화·미디북스의 책과 같은 규칙) — 공연마다 값을 달면 밸런스 테스트가
 * 못 보는 두 번째 출처가 생긴다. 여기 있는 것은 **무엇을 보러 가는가**라는 이야기뿐이다.
 *
 * ⚠️ **실존 아티스트·공연 이름을 쓰지 않는다**(배너·사이트와 같은 규칙). 전부 지어냈고
 * 패러디는 호의적인 톤만 쓴다.
 *
 * ⚠️ **포스터는 이미지가 아니라 CSS 그라데이션 + 글자다**(오프라인 규칙 — 외부 이미지 금지).
 */
export interface Show {
  id: string
  title: string
  /** 공연자·단체. 포스터 아래 작은 줄. */
  artist: string
  /** 공연장. 실제 공연장 이름을 쓰지 않는다. */
  venue: string
  /** 목록을 가르는 축. 탭이 곧 이 값이다. */
  genre: ShowGenre
  /** 포스터 판의 배경. */
  poster: string
  /** 남은 좌석 등급. ⚠️ **정적 값이다**(`Math.random` 금지 — 뉴스·시집이와 같은 결정성 규칙). */
  seats: string
  blurb: string
}

/** 공연 분류. 배열 순서가 곧 탭 순서다. */
export const SHOW_GENRES = ['콘서트', '뮤지컬', '연극'] as const
export type ShowGenre = (typeof SHOW_GENRES)[number]

export const SHOWS: Show[] = [
  {
    id: 'midnight-band',
    title: '자정의 밴드',
    artist: '스탠드바이',
    venue: '한강 아레나',
    genre: '콘서트',
    poster: 'linear-gradient(150deg, #1e1b4b 0%, #4338ca 60%, #6d5ce0 100%)',
    seats: 'R석 매진 · S석 12석',
    blurb: '앙코르만 네 곡. 끝나고 나오면 귀가 한참 먹먹하다.',
  },
  {
    id: 'winter-hall',
    title: '겨울 홀 라이브',
    artist: '유하',
    venue: '노들홀',
    genre: '콘서트',
    poster: 'linear-gradient(150deg, #0f2a4a 0%, #2b5f9e 60%, #5b93cc 100%)',
    seats: '전석 지정 · 잔여 34석',
    blurb: '피아노 한 대와 목소리 하나. 중간에 우는 사람이 꼭 있다.',
  },
  {
    id: 'lamp-musical',
    title: '램프를 든 사람',
    artist: '극단 물꼬',
    venue: '대학로 3관',
    genre: '뮤지컬',
    poster: 'linear-gradient(150deg, #4a1d3f 0%, #8e3b6b 60%, #c76fa0 100%)',
    seats: 'VIP석 6석 · A석 40석',
    blurb: '2막 첫 곡이 유명하다. 그 곡만 듣고 나가는 사람도 있다.',
  },
  {
    id: 'last-train-musical',
    title: '막차의 노래',
    artist: '프로덕션 늦봄',
    venue: '세종 소극장',
    genre: '뮤지컬',
    poster: 'linear-gradient(150deg, #23304d 0%, #46608c 60%, #7a94bd 100%)',
    seats: '잔여 18석',
    blurb: '지하철 막차에서 벌어지는 두 시간. 무대 위에도 손잡이가 달려 있다.',
  },
  {
    id: 'two-chairs',
    title: '의자 두 개',
    artist: '극단 맨손',
    venue: '소극장 마루',
    genre: '연극',
    poster: 'linear-gradient(150deg, #3a2f1e 0%, #7a6236 60%, #b39a63 100%)',
    seats: '전석 자유 · 잔여 22석',
    blurb: '무대에는 의자 둘뿐이다. 배우도 둘이다.',
  },
  {
    id: 'nobody-home',
    title: '아무도 없는 집',
    artist: '극단 맨손',
    venue: '소극장 마루',
    genre: '연극',
    poster: 'linear-gradient(150deg, #2b2b33 0%, #55555f 60%, #8a8a95 100%)',
    seats: '잔여 9석',
    blurb: '90분 동안 초인종이 세 번 울린다. 아무도 열어 주지 않는다.',
  },
]

export function findShow(id: string): Show | undefined {
  return SHOWS.find((s) => s.id === id)
}

/** 그 분류의 공연. 컴포넌트가 id를 나열하지 않는다(`activitiesOf`와 같은 규칙). */
export function showsOf(genre: ShowGenre): Show[] {
  return SHOWS.filter((s) => s.genre === genre)
}
