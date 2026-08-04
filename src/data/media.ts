/**
 * 브라우저 안 문화 사이트 3종의 **콘텐츠**.
 *
 * 미디북스(독서) · 시집이(영화 감상) · 아점(글쓰기)이 여기서 목록을 가져간다.
 *
 * ## 왜 한 파일인가
 * 셋은 같은 성격의 데이터다 — "고르는 목록 한 벌 + 고른 것의 이름". 파일을 셋으로 쪼개면
 * 같은 모양의 파일이 세 개 생기고, 넷째 사이트가 생길 때 넷째 파일을 또 만들게 된다.
 * 반대로 `sites.ts`에 넣지 않은 이유는 그쪽이 **주소·아이콘·이동**을 다루는 파일이라서다 —
 * 책 제목이 늘어난다고 브라우저 이동 규칙 파일이 길어지면 안 된다.
 *
 * ## 왜 컴포넌트가 아니라 데이터인가
 * 책·영화·글감을 하나 더 넣는 비용이 "배열에 한 줄"이어야 한다. JSX에 적으면
 * 콘텐츠를 늘릴 때마다 컴포넌트를 고치게 되고, 목록의 순서·개수를 테스트할 수도 없다.
 *
 * ⚠️ **실존 인물 이름·실존 브랜드 비방 금지.** 저자명은 전부 지어낸 것이고,
 * 제목은 실제로 있을 법한 국내 출판물·영화를 살짝 비튼 것이되 호의적인 톤만 쓴다
 * (`data/banners.ts`의 가짜 광고와 같은 규칙).
 */

/** 미디북스의 책 한 권. */
export interface Book {
  id: string
  title: string
  author: string
  genre: string
  /** 목록에 그대로 보이는 한 줄 소개. 고르기 전에 판단 근거가 있어야 한다. */
  blurb: string
}

/** 시집이의 상영 회차 하나. */
export interface Showtime {
  id: string
  /** 24시간 표기. 정렬·표시를 문자열 하나로 끝내려고 이 형식으로 고정한다. */
  time: string
  screen: string
  /** 남은 좌석. ⚠️ 정적 값이다 — `Math.random`을 쓰면 새로 고칠 때마다 바뀌어 결정성이 깨진다. */
  seats: number
}

/** 시집이의 상영작 하나. */
/**
 * 극장 홈의 세 구역.
 * `soon`(개봉 예정작)만 **회차가 없다** — 아직 안 나온 영화는 예매할 수 없다.
 */
export type FilmSection = 'now' | 'soon' | 'arte'

export interface Film {
  id: string
  title: string
  genre: string
  /** 관람 등급. 표시 전용이며 게임 규칙과는 무관하다. */
  rating: string
  /** 상영 시간(분). */
  runtime: number
  tagline: string
  section: FilmSection
  /**
   * 포스터 배경.
   * ⚠️ **이미지가 아니라 그라데이션이다**(너튜브 썸네일·광고 배너와 같은 규칙).
   * 외부 이미지 API를 쓰지 않는 것이 이 프로젝트의 오프라인 규칙이고,
   * 게임 세계의 영화라 실제 포스터가 있을 수도 없다.
   */
  poster: string
  /** 개봉까지 남은 날. `soon`에만 있다(D-7 같은 배지). */
  dday?: number
  showtimes: Showtime[]
}

/** 히어로 배너에 거는 영화. 홈에서 가장 큰 자리라 데이터가 정한다. */
export const MAIN_FILM_ID = 'odyssey'

/** 아점의 글감 하나. */
export interface WritingPrompt {
  id: string
  theme: string
  /** 글감 아래에 붙는 짧은 조언. 빈 화면을 마주한 사람에게 첫 문장을 준다. */
  hint: string
}

export const BOOKS: Book[] = [
  {
    id: 'convenience',
    title: '조용한 편의점',
    author: '백은서',
    genre: '소설',
    blurb: '새벽 세 시에만 문을 여는 편의점 이야기. 손님은 늘 한 명이다.',
  },
  {
    id: 'courage',
    title: '미움받을 용기는 어디서 사나요',
    author: '정하윤',
    genre: '에세이',
    blurb: '용기를 낸 사람들의 후기를 모았다. 절반은 환불을 원했다.',
  },
  {
    id: 'orbit',
    title: '퇴근길에 우주가 열렸다',
    author: '서지완',
    genre: 'SF',
    blurb: '2호선 어느 출구에 웜홀이 생긴다. 사람들은 일단 줄을 선다.',
  },
  {
    id: 'cart',
    title: '나는 왜 매번 장바구니만 채우는가',
    author: '문태경',
    genre: '사회',
    blurb: '결제 버튼 앞에서 멈추는 마음에 대한 200페이지짜리 변명.',
  },
  {
    id: 'balance',
    title: '하루 한 장, 잔고 명상',
    author: '오세림',
    genre: '자기계발',
    blurb: '통장을 보며 호흡을 고르는 법. 3장부터 호흡이 가빠진다.',
  },
  {
    id: 'fridge',
    title: '할머니의 오래된 냉장고',
    author: '윤가경',
    genre: '에세이',
    blurb: '열 때마다 다른 것이 나온다. 유통기한은 아무도 확인하지 않는다.',
  },
]

export const FILMS: Film[] = [
  {
    id: 'winter',
    title: '서울의 겨울',
    genre: '드라마',
    rating: '15세',
    runtime: 141,
    tagline: '그해 겨울, 아무도 정시에 퇴근하지 못했다.',
    section: 'now',
    poster: 'linear-gradient(160deg, #1b2a41 0%, #4a6fa5 60%, #9bb8d9 100%)',
    showtimes: [
      { id: 'winter-1', time: '09:20', screen: '2관', seats: 47 },
      { id: 'winter-2', time: '14:10', screen: '2관', seats: 12 },
      { id: 'winter-3', time: '19:40', screen: '1관', seats: 3 },
    ],
  },
  {
    id: 'parttime',
    title: '극한알바',
    genre: '코미디',
    rating: '12세',
    runtime: 108,
    tagline: '주간 야간 심야. 하루가 세 번 온다.',
    section: 'now',
    poster: 'linear-gradient(160deg, #f2b705 0%, #e8622c 100%)',
    showtimes: [
      { id: 'parttime-1', time: '10:50', screen: '4관', seats: 61 },
      { id: 'parttime-2', time: '15:30', screen: '4관', seats: 28 },
      { id: 'parttime-3', time: '21:05', screen: '3관', seats: 9 },
    ],
  },
  {
    id: 'call',
    title: '범죄와의 통화',
    genre: '범죄',
    rating: '청소년 관람불가',
    runtime: 126,
    tagline: '수신을 거부해도 벨은 울린다.',
    section: 'now',
    poster: 'linear-gradient(160deg, #2b0d0f 0%, #7a1f26 70%, #c0392b 100%)',
    showtimes: [
      { id: 'call-1', time: '13:00', screen: '1관', seats: 33 },
      { id: 'call-2', time: '18:20', screen: '1관', seats: 7 },
      { id: 'call-3', time: '22:40', screen: '3관', seats: 52 },
    ],
  },
  {
    id: 'longway',
    title: '멀수록 가까워지는',
    genre: '로맨스',
    rating: '전체 관람가',
    runtime: 97,
    tagline: '두 정거장이면 될 거리를 3년 동안 돌아왔다.',
    section: 'now',
    poster: 'linear-gradient(160deg, #f4c7c3 0%, #b98ec4 55%, #6b5b95 100%)',
    showtimes: [
      { id: 'longway-1', time: '11:35', screen: '3관', seats: 44 },
      { id: 'longway-2', time: '16:45', screen: '2관', seats: 19 },
      { id: 'longway-3', time: '20:15', screen: '4관', seats: 5 },
    ],
  },
  /* ── 현재 상영작 5번째 ── */
  {
    id: 'lunchbox',
    title: '도시락 특공대',
    genre: '가족',
    rating: '전체 관람가',
    runtime: 102,
    tagline: '반찬 하나로 뭉친 사람들.',
    section: 'now',
    poster: 'linear-gradient(160deg, #7cb342 0%, #c0ca33 55%, #fdd835 100%)',
    showtimes: [
      { id: 'lunchbox-1', time: '10:15', screen: '5관', seats: 88 },
      { id: 'lunchbox-2', time: '14:50', screen: '5관', seats: 41 },
      { id: 'lunchbox-3', time: '18:00', screen: '2관', seats: 16 },
    ],
  },

  /* ── 개봉 예정작. 회차가 없다 = 예매할 수 없다. ── */
  {
    id: 'odyssey',
    title: '오디세이',
    genre: '어드벤처',
    rating: '15세',
    runtime: 172,
    tagline: '집으로 가는 길이 가장 멀었다.',
    section: 'soon',
    poster: 'linear-gradient(160deg, #10151c 0%, #2f4858 55%, #86a3b8 100%)',
    dday: 1,
    showtimes: [],
  },
  {
    id: 'whale',
    title: '사랑의 하츄핑: 고래보석의 전설',
    genre: '애니메이션',
    rating: '전체 관람가',
    runtime: 105,
    tagline: '바다 밑에도 약속은 있다.',
    section: 'soon',
    poster: 'linear-gradient(160deg, #26c6da 0%, #7e57c2 100%)',
    dday: 1,
    showtimes: [],
  },
  {
    id: 'jackass',
    title: '잭애스: 베스트 앤드 라스트',
    genre: '코미디',
    rating: '청소년 관람불가',
    runtime: 92,
    tagline: '마지막이라니까 더 심해졌다.',
    section: 'soon',
    poster: 'linear-gradient(160deg, #37474f 0%, #ff7043 100%)',
    dday: 1,
    showtimes: [],
  },
  {
    id: 'okmadam',
    title: '오케이 마담2',
    genre: '액션',
    rating: '15세',
    runtime: 108,
    tagline: '이번엔 배 위에서.',
    section: 'soon',
    poster: 'linear-gradient(160deg, #1565c0 0%, #42a5f5 60%, #b3e5fc 100%)',
    dday: 7,
    showtimes: [],
  },
  {
    id: 'highway',
    title: '명탐정 코란: 하이웨이의 타종',
    genre: '애니메이션',
    rating: '12세',
    runtime: 109,
    tagline: '고속도로 위에서 시계가 멈춘다.',
    section: 'soon',
    poster: 'linear-gradient(160deg, #0d47a1 0%, #ef5350 100%)',
    dday: 7,
    showtimes: [],
  },

  /* ── 아르떼(예술영화). 하루 두 회차만 돈다 — 실제 예술영화관과 같다. ── */
  {
    id: 'again',
    title: '비긴 어게인',
    genre: '음악',
    rating: '15세',
    runtime: 104,
    tagline: '노래 한 곡이면 다시 시작할 수 있다고 믿었다.',
    section: 'arte',
    poster: 'linear-gradient(160deg, #ffb300 0%, #f4511e 100%)',
    showtimes: [
      { id: 'again-1', time: '11:00', screen: '아르떼관', seats: 24 },
      { id: 'again-2', time: '19:10', screen: '아르떼관', seats: 8 },
    ],
  },
  {
    id: 'emptyhouse',
    title: '빈집의 연인들',
    genre: '드라마',
    rating: '15세',
    runtime: 93,
    tagline: '아무도 살지 않는 집에서 두 사람이 마주친다.',
    section: 'arte',
    poster: 'linear-gradient(160deg, #6d4c41 0%, #a1887f 100%)',
    showtimes: [
      { id: 'emptyhouse-1', time: '13:20', screen: '아르떼관', seats: 31 },
      { id: 'emptyhouse-2', time: '20:40', screen: '아르떼관', seats: 14 },
    ],
  },
  {
    id: 'hokum',
    title: '호컴',
    genre: '스릴러',
    rating: '15세',
    runtime: 107,
    tagline: '거짓말은 늘 사실보다 정교하다.',
    section: 'arte',
    poster: 'linear-gradient(160deg, #1a1a1a 0%, #7b1fa2 100%)',
    showtimes: [
      { id: 'hokum-1', time: '12:30', screen: '아르떼관', seats: 19 },
      { id: 'hokum-2', time: '21:00', screen: '아르떼관', seats: 27 },
    ],
  },
  {
    id: 'contempt',
    title: '경멸',
    genre: '드라마',
    rating: '15세',
    runtime: 104,
    tagline: '한 문장이 결혼을 끝냈다.',
    section: 'arte',
    poster: 'linear-gradient(160deg, #fdd835 0%, #e53935 55%, #1e88e5 100%)',
    showtimes: [
      { id: 'contempt-1', time: '14:00', screen: '아르떼관', seats: 22 },
      { id: 'contempt-2', time: '18:50', screen: '아르떼관', seats: 11 },
    ],
  },
  {
    id: 'unnamed',
    title: '미명',
    genre: 'SF',
    rating: '15세',
    runtime: 64,
    tagline: '해가 뜨기 직전의 도시를 64분 동안 본다.',
    section: 'arte',
    poster: 'linear-gradient(160deg, #311b92 0%, #00acc1 100%)',
    showtimes: [
      { id: 'unnamed-1', time: '10:40', screen: '아르떼관', seats: 35 },
      { id: 'unnamed-2', time: '17:30', screen: '아르떼관', seats: 29 },
    ],
  },
]

export const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: 'useless',
    theme: '오늘 산 것 중 제일 쓸데없는 것',
    hint: '후회는 짧게, 묘사는 길게.',
  },
  {
    id: 'quiet',
    theme: '내가 아는 가장 조용한 장소',
    hint: '소리 대신 그 자리의 냄새부터 적어 본다.',
  },
  {
    id: 'refund',
    theme: '스무 살의 나에게 보내는 반품 신청서',
    hint: '사유란은 비워 두지 않는다.',
  },
  {
    id: 'faces',
    theme: '퇴근길 지하철에서 본 얼굴들',
    hint: '아무도 특정할 수 없게 쓴다.',
  },
  {
    id: 'oldest',
    theme: '내 방에서 가장 오래된 물건',
    hint: '버리지 못한 이유부터 시작한다.',
  },
  {
    id: 'ramen',
    theme: '라면을 가장 맛있게 끓이는 법',
    hint: '레시피는 세 줄, 나머지는 전부 사족.',
  },
]

/** 모든 상영 회차를 영화와 묶어 펼친다. 고른 회차의 영화 제목을 되찾을 때 쓴다. */
export function findShowtime(id: string): { film: Film; showtime: Showtime } | undefined {
  for (const film of FILMS) {
    const showtime = film.showtimes.find((s) => s.id === id)
    if (showtime) return { film, showtime }
  }
  return undefined
}
