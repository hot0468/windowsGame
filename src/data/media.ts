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
  /**
   * 표지 배경.
   * 경고: **이미지가 아니라 그라데이션이다**(영화 포스터 · 너튜브 썸네일과 같은 규칙).
   * 외부 이미지 API를 쓰지 않는 것이 이 프로젝트의 오프라인 규칙이다.
   */
  cover: string
  /** 카테고리 탭이 거르는 값. */
  category: string
  /** 별점. 경고: 정적 값이다 - Math.random을 쓰면 새로 그릴 때마다 바뀐다. */
  rating: number
  /** 별점 참여 수. */
  ratings: number
  /** 표지 왼쪽 위 배지. 없으면 안 붙는다. */
  badge?: string
}

/** 미디북스 홈의 큰 배너 하나. */
export interface BookBanner {
  id: string
  title: string
  sub: string
  tag: string
  gradient: string
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
  /**
   * 키워드 격자에 넣을 짧은 이름.
   * ⚠️ `theme`(문장형)을 격자에 그대로 넣으면 칸이 무너진다 — 격자는 두세 어절짜리
   * 라벨을 전제로 한 배치다. 같은 글감을 두 길이로 들고 있는 게 아니라,
   * **격자용 이름과 글감 문장이 다른 역할**을 하는 것이다.
   */
  keyword: string
}

/** 아점 연재 글 한 편. 요일별 연재 탭에 뜬다. */
export interface Serial {
  id: string
  /** 요일. 0=일 … 6=토. `Date.getDay()`와 같은 규칙이라 환산이 필요 없다. */
  weekday: number
  category: string
  title: string
  author: string
  /** 목록 오른쪽의 작은 그림. 이미지가 없으므로 그라데이션이다. */
  thumb: string
}

/** 아점 작가 한 명. */
export interface Writer {
  id: string
  name: string
  /** 아바타에 넣을 한 글자. 프로필 사진이 없으니 글자와 색으로 구분한다. */
  initial: string
  color: string
  role: string
  bio: string
  tags: string[]
}

/** 상단 캐러셀에 거는 대표 작품. */
export interface FeatureBook {
  id: string
  title: string
  author: string
  /** 표지 배경(그라데이션). */
  cover: string
  /** 표지 오른쪽 위 배지. */
  badge: string
  caption: string
}

export const BOOKS: Book[] = [
  {
    id: 'convenience',
    title: '조용한 편의점',
    author: '백은서',
    genre: '소설',
    category: '소설',
    rating: 4.8,
    ratings: 5017,
    badge: '독점', cover: 'linear-gradient(160deg, #37474f 0%, #78909c 100%)',
    blurb: '새벽 세 시에만 문을 여는 편의점 이야기. 손님은 늘 한 명이다.',
  },
  {
    id: 'courage',
    title: '미움받을 용기는 어디서 사나요',
    author: '정하윤',
    genre: '에세이',
    category: '에세이/시',
    rating: 4.7,
    ratings: 4711,
    cover: 'linear-gradient(160deg, #6d4c41 0%, #bcaaa4 100%)',
    blurb: '용기를 낸 사람들의 후기를 모았다. 절반은 환불을 원했다.',
  },
  {
    id: 'orbit',
    title: '퇴근길에 우주가 열렸다',
    author: '서지완',
    genre: 'SF',
    category: '소설',
    rating: 4.6,
    ratings: 2257,
    cover: 'linear-gradient(160deg, #1a237e 0%, #5c6bc0 100%)',
    blurb: '2호선 어느 출구에 웜홀이 생긴다. 사람들은 일단 줄을 선다.',
  },
  {
    id: 'cart',
    title: '나는 왜 매번 장바구니만 채우는가',
    author: '문태경',
    genre: '사회',
    category: '인문사회',
    rating: 4.5,
    ratings: 3122,
    cover: 'linear-gradient(160deg, #ad1457 0%, #f06292 100%)',
    blurb: '결제 버튼 앞에서 멈추는 마음에 대한 200페이지짜리 변명.',
  },
  {
    id: 'balance',
    title: '하루 한 장, 잔고 명상',
    author: '오세림',
    genre: '자기계발',
    category: '자기계발',
    rating: 4.3,
    ratings: 1889,
    cover: 'linear-gradient(160deg, #00695c 0%, #4db6ac 100%)',
    blurb: '통장을 보며 호흡을 고르는 법. 3장부터 호흡이 가빠진다.',
  },
  {
    id: 'fridge',
    title: '할머니의 오래된 냉장고',
    author: '윤가경',
    genre: '에세이',
    category: '에세이/시',
    rating: 5.0,
    ratings: 942,
    badge: '신간', cover: 'linear-gradient(160deg, #f9a825 0%, #fff59d 100%)',
    blurb: '열 때마다 다른 것이 나온다. 유통기한은 아무도 확인하지 않는다.',
  },
  {
    id: 'detective',
    title: '탐정 없는 마을',
    author: '한도윤',
    genre: '추리',
    category: '소설',
    rating: 4.9,
    ratings: 6110,
    badge: '독점', cover: 'linear-gradient(160deg, #263238 0%, #546e7a 100%)',
    blurb: '사건은 매주 일어나는데 아무도 조사하지 않는다.',
  },
  {
    id: 'salary',
    title: '월급이 사라지는 열두 가지 경로',
    author: '문태경',
    genre: '경제',
    category: '경영/경제',
    rating: 4.4,
    ratings: 2530,
    cover: 'linear-gradient(160deg, #1565c0 0%, #64b5f6 100%)',
    blurb: '통장을 추적한 1년의 기록. 결론은 이미 알고 있다.',
  },
  {
    id: 'deadline',
    title: '마감은 언제나 어제였다',
    author: '정하윤',
    genre: '에세이',
    category: '에세이/시',
    rating: 4.6,
    ratings: 3388,
    cover: 'linear-gradient(160deg, #bf360c 0%, #ff8a65 100%)',
    blurb: '미루는 사람들의 변명을 시간순으로 정리했다.',
  },
  {
    id: 'moss',
    title: '이끼가 자라는 방',
    author: '백은서',
    genre: '소설',
    category: '소설',
    rating: 4.7,
    ratings: 1704,
    cover: 'linear-gradient(160deg, #2e7d32 0%, #a5d6a7 100%)',
    blurb: '한 달간 비운 방에서 자란 것에 대한 기록.',
  },
  {
    id: 'nomap',
    title: '지도 없이 걷는 법',
    author: '오세림',
    genre: '자기계발',
    category: '자기계발',
    rating: 4.2,
    ratings: 1420,
    cover: 'linear-gradient(160deg, #4527a0 0%, #9575cd 100%)',
    blurb: '길을 잃는 데도 요령이 있다고 주장하는 책.',
  },
  {
    id: 'noise',
    title: '소음의 지도',
    author: '서지완',
    genre: '인문',
    category: '인문사회',
    rating: 4.5,
    ratings: 2011,
    cover: 'linear-gradient(160deg, #424242 0%, #9e9e9e 100%)',
    blurb: '도시의 소리를 지도로 그렸다. 조용한 곳은 두 군데뿐이었다.',
  },
  {
    id: 'lastbus',
    title: '막차의 사람들',
    author: '한도윤',
    genre: '소설',
    category: '소설',
    rating: 4.8,
    ratings: 4503,
    badge: '단독', cover: 'linear-gradient(160deg, #01579b 0%, #4fc3f7 100%)',
    blurb: '같은 시간, 같은 자리에 앉는 사람 일곱 명의 이야기.',
  },
  {
    id: 'invest',
    title: '연말 투자 불패의 법칙',
    author: '문태경',
    genre: '경제',
    category: '경영/경제',
    rating: 3.9,
    ratings: 880,
    cover: 'linear-gradient(160deg, #f57f17 0%, #ffd54f 100%)',
    blurb: '제목만 믿고 산 사람들의 후기가 부록으로 붙어 있다.',
  },
  {
    id: 'winterletter',
    title: '겨울에 쓴 편지는 봄에 도착한다',
    author: '윤가경',
    genre: '에세이',
    category: '에세이/시',
    rating: 4.9,
    ratings: 2660,
    cover: 'linear-gradient(160deg, #4a148c 0%, #ba68c8 100%)',
    blurb: '부치지 못한 편지들만 모아 묶었다.',
  },
  {
    id: 'kitchen',
    title: '작은 부엌의 기술',
    author: '오세림',
    genre: '실용',
    category: '자기계발',
    rating: 4.4,
    ratings: 1330,
    cover: 'linear-gradient(160deg, #d84315 0%, #ffab91 100%)',
    blurb: '두 걸음 안에서 끝나는 요리들.',
  },
  {
    id: 'archive',
    title: '버리지 못한 것들의 기록',
    author: '백은서',
    genre: '에세이',
    category: '에세이/시',
    rating: 4.6,
    ratings: 1907,
    cover: 'linear-gradient(160deg, #5d4037 0%, #a1887f 100%)',
    blurb: '상자 열두 개를 열면서 쓴 열두 편의 글.',
  },
  {
    id: 'silence',
    title: '침묵하는 회의실',
    author: '정하윤',
    genre: '경영',
    category: '경영/경제',
    rating: 4.1,
    ratings: 1155,
    cover: 'linear-gradient(160deg, #006064 0%, #4dd0e1 100%)',
    blurb: '아무도 말하지 않는 이유를 여덟 가지로 분류했다.',
  },
  {
    id: 'starfall',
    title: '별이 떨어지는 속도',
    author: '서지완',
    genre: 'SF',
    category: '소설',
    rating: 4.7,
    ratings: 3204,
    badge: '신간', cover: 'linear-gradient(160deg, #311b92 0%, #7986cb 100%)',
    blurb: '하늘에서 떨어진 것을 주운 사람은 신고 의무가 있다.',
  },
  {
    id: 'rewrite',
    title: '다시 쓰는 이력서',
    author: '한도윤',
    genre: '자기계발',
    category: '자기계발',
    rating: 4.3,
    ratings: 2088,
    cover: 'linear-gradient(160deg, #37474f 0%, #b0bec5 100%)',
    blurb: '지운 문장이 남긴 자리에 대하여.',
  },
]

/** 미디북스 홈 상단 배너. */
export const BOOK_BANNERS: BookBanner[] = [
  {
    id: 'bb1',
    tag: '단독 선출간',
    title: '미디북스 단독 선출간',
    sub: '포인트북 오늘 마감 · 30%↓ 특가 세트',
    gradient: 'linear-gradient(135deg, #4a148c 0%, #7b1fa2 60%, #ab47bc 100%)',
  },
  {
    id: 'bb2',
    tag: '작가 특집',
    title: '한도윤 작가 대표작',
    sub: '탐정 없는 마을 · 막차의 사람들',
    gradient: 'linear-gradient(135deg, #90a4ae 0%, #cfd8dc 100%)',
  },
  {
    id: 'bb3',
    tag: '신작 오픈',
    title: '누군가 그녀를 읽었다',
    sub: '대여 특가 OPEN · 추가 할인 쿠폰',
    gradient: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
  },
]

/** 이벤트 줄에 거는 짧은 배너. */
export const BOOK_EVENTS: BookBanner[] = [
  {
    id: 'be1',
    tag: '이벤트',
    title: '드라마 원작 이후',
    sub: '원작 소설만 모아 10년치',
    gradient: 'linear-gradient(135deg, #37474f 0%, #607d8b 100%)',
  },
  {
    id: 'be2',
    tag: '기획전',
    title: '문학의 스릴러 대전',
    sub: '이 계절에 어울리는 긴장',
    gradient: 'linear-gradient(135deg, #b71c1c 0%, #e57373 100%)',
  },
  {
    id: 'be3',
    tag: '연재',
    title: '1만원 대여 특가',
    sub: '완결작만 골라 담기',
    gradient: 'linear-gradient(135deg, #e65100 0%, #ffb74d 100%)',
  },
]

/** 카테고리 탭. 첫 항목 '추천'은 거르지 않는다. */
export const BOOK_CATEGORIES = ['추천', '소설', '인문사회', '경영/경제', '자기계발', '에세이/시']


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
  { id: 'useless', keyword: '쓸데없는 소비', theme: '오늘 산 것 중 제일 쓸데없는 것', hint: '후회는 짧게, 묘사는 길게.' },
  { id: 'quiet', keyword: '조용한 장소', theme: '내가 아는 가장 조용한 장소', hint: '소리 대신 그 자리의 냄새부터 적어 본다.' },
  { id: 'refund', keyword: '스무 살 반품', theme: '스무 살의 나에게 보내는 반품 신청서', hint: '사유란은 비워 두지 않는다.' },
  { id: 'faces', keyword: '퇴근길 얼굴', theme: '퇴근길 지하철에서 본 얼굴들', hint: '아무도 특정할 수 없게 쓴다.' },
  { id: 'oldest', keyword: '가장 오래된 물건', theme: '내 방에서 가장 오래된 물건', hint: '버리지 못한 이유부터 시작한다.' },
  { id: 'ramen', keyword: '라면 끓이기', theme: '라면을 가장 맛있게 끓이는 법', hint: '레시피는 세 줄, 나머지는 전부 사족.' },
  { id: 'rent', keyword: '월세와 나', theme: '이 방에 살면서 배운 것', hint: '보증금 말고 다른 걸 적어 본다.' },
  { id: 'firstpay', keyword: '첫 월급', theme: '첫 월급으로 한 일', hint: '통장 잔액은 마지막 문장에만 적는다.' },
  { id: 'nightbus', keyword: '심야 버스', theme: '막차에서 본 것', hint: '창밖과 창 안을 번갈아 적는다.' },
  { id: 'callmom', keyword: '엄마의 전화', theme: '받지 못한 전화 세 통', hint: '왜 못 받았는지는 쓰지 않아도 된다.' },
  { id: 'diet', keyword: '작심삼일', theme: '사흘 만에 그만둔 것들의 목록', hint: '변명은 한 줄씩만 허락한다.' },
  { id: 'window', keyword: '창밖 풍경', theme: '내 창문에서 보이는 것', hint: '계절이 바뀌면 무엇이 달라지는지까지.' },
  { id: 'coffee', keyword: '커피 한 잔', theme: '매일 같은 시간에 마시는 것', hint: '맛보다 그 시간에 대해 쓴다.' },
  { id: 'goodbye', keyword: '작별 인사', theme: '마지막으로 인사하지 못한 사람', hint: '이름은 끝까지 감춘다.' },
]

/**
 * 요일별 연재. ⚠️ `weekday`는 `Date.getDay()`와 같은 규칙(0=일)이라 환산이 없다.
 * 게임 진행과 무관한 배경 소품이므로 날짜 계산에 끌어들이지 않는다.
 */
export const SERIALS: Serial[] = [
  { id: 'sr1', weekday: 1, category: '데뷔단 감독, 맥과 김', title: '작은 방을 조금 아름답게 하는 법', author: '유수아', thumb: 'linear-gradient(140deg, #8d6e63 0%, #d7ccc8 100%)' },
  { id: 'sr2', weekday: 1, category: '매니교라', title: '입김', author: '문호 훈', thumb: 'linear-gradient(140deg, #546e7a 0%, #b0bec5 100%)' },
  { id: 'sr3', weekday: 2, category: '락산노', title: 'BTS와 신김치통', author: '반박희 정신윤', thumb: 'linear-gradient(140deg, #ef6c00 0%, #ffcc80 100%)' },
  { id: 'sr4', weekday: 2, category: '단짠단 원드코드', title: '22화. 오븐 켜둘 걸 그냥 나서 바로소 열린 길', author: '하나 미현', thumb: 'linear-gradient(140deg, #6a1b9a 0%, #ce93d8 100%)' },
  { id: 'sr5', weekday: 3, category: '그 자리에 만 이보고', title: '무구한 백색의 근처는 낮선 지역', author: '숲 조현재이', thumb: 'linear-gradient(140deg, #1565c0 0%, #90caf9 100%)' },
  { id: 'sr6', weekday: 3, category: '매주는 커피 시간이면', title: '《베우는 백의 시간이면》 12화. 커피 열 잔의 광량', author: '고맹랑 마이키', thumb: 'linear-gradient(140deg, #4e342e 0%, #a1887f 100%)' },
  { id: 'sr7', weekday: 4, category: '안면', title: '가짜운 안면일수록 소홀해진다', author: '남노', thumb: 'linear-gradient(140deg, #00695c 0%, #80cbc4 100%)' },
  { id: 'sr8', weekday: 4, category: '오막물 아이의', title: '언어초는 집', author: '에마 시온', thumb: 'linear-gradient(140deg, #c62828 0%, #ef9a9a 100%)' },
  { id: 'sr9', weekday: 5, category: '금요일의 부엌', title: '냉장고를 비우는 주말', author: '윤가경', thumb: 'linear-gradient(140deg, #2e7d32 0%, #a5d6a7 100%)' },
  { id: 'sr10', weekday: 5, category: '퇴근 이후', title: '아무것도 하지 않기로 한 두 시간', author: '서지완', thumb: 'linear-gradient(140deg, #37474f 0%, #90a4ae 100%)' },
  { id: 'sr11', weekday: 6, category: '토요일 산책', title: '같은 길을 백 번 걸으면 생기는 일', author: '오세림', thumb: 'linear-gradient(140deg, #f9a825 0%, #fff59d 100%)' },
  { id: 'sr12', weekday: 6, category: '주말 기록', title: '장바구니에만 담아 둔 것들', author: '문태경', thumb: 'linear-gradient(140deg, #ad1457 0%, #f48fb1 100%)' },
  { id: 'sr13', weekday: 0, category: '일요일 밤', title: '내일을 미리 걱정하는 사람들에게', author: '유수아', thumb: 'linear-gradient(140deg, #283593 0%, #9fa8da 100%)' },
  { id: 'sr14', weekday: 0, category: '한 주의 끝', title: '설거지를 미루는 마음에 대하여', author: '남노', thumb: 'linear-gradient(140deg, #00838f 0%, #80deea 100%)' },
]

export const WRITERS: Writer[] = [
  { id: 'w1', name: 'Gleon', initial: 'G', color: '#37474f', role: '신춘문예 아마브라이', bio: '카피라이터 · 저자 · 크리에이티브 디렉터. 가끔 남는 시간에 회사원처럼 지냅니다.', tags: ['브랜딩', '카피'] },
  { id: 'w2', name: '피앤피에이션시 매거진', initial: '피', color: '#1565c0', role: '피앤피에이션시 편집팀', bio: '브랜드를 짓습니다. 만들면서 기록도 합니다. 매거진이 그리 기록도 합니다.', tags: ['브랜딩', '기획'] },
  { id: 'w3', name: 'Shaun', initial: 'S', color: '#ad1457', role: '디자이너', bio: '경험을 배열하고 문장으로 굽는 게 좋습니다.', tags: ['디자인', 'UX'] },
  { id: 'w4', name: '이형주 David Lee', initial: '이', color: '#6a1b9a', role: 'MBTI설립 컨설턴트', bio: '읽히는 말과 쓰는 말 사이의 거리를 재는 일을 합니다.', tags: ['비즈니스', '커리어'] },
  { id: 'w5', name: 'NORE', initial: 'N', color: '#e65100', role: '노비드유커비스 개발자', bio: '어젯밤 짜다 만 코드와 오늘 아침 미지근한 커피에 대해 씁니다.', tags: ['IT', '개발'] },
  { id: 'w6', name: '정영훈', initial: '정', color: '#2e7d32', role: '기획자', bio: '회의실에서 나온 문장 중 살아남은 것만 골라 적습니다.', tags: ['기획', '에세이'] },
]

export const FEATURE_BOOKS: FeatureBook[] = [
  {
    id: 'fb1',
    title: '어느 봄날, 이른 새벽의 문장',
    author: '이덕원',
    cover: 'linear-gradient(160deg, #6d5b4b 0%, #a89584 100%)',
    badge: '연재',
    caption: '1화의 감동',
  },
  {
    id: 'fb2',
    title: '여름에 남겨진 기억, 엄마의 맛',
    author: '이덕원',
    cover: 'linear-gradient(160deg, #bf360c 0%, #ff8a65 100%)',
    badge: '완결',
    caption: '주목받고 있는 응원 인기글',
  },
  {
    id: 'fb3',
    title: '한밤중에 쓰는 편지들',
    author: '윤가경',
    cover: 'linear-gradient(160deg, #263238 0%, #607d8b 100%)',
    badge: '신규',
    caption: '이번 주 새로 열린 연재',
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
