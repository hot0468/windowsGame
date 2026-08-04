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
export interface Film {
  id: string
  title: string
  genre: string
  /** 관람 등급. 표시 전용이며 게임 규칙과는 무관하다. */
  rating: string
  /** 상영 시간(분). */
  runtime: number
  tagline: string
  showtimes: Showtime[]
}

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
    showtimes: [
      { id: 'longway-1', time: '11:35', screen: '3관', seats: 44 },
      { id: 'longway-2', time: '16:45', screen: '2관', seats: 19 },
      { id: 'longway-3', time: '20:15', screen: '4관', seats: 5 },
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
