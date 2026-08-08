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
 * 실제 티켓 사이트는 포스터가 화면의 8할인데, 그 인상을 **세로로 긴 판 + 큰 제목**만으로
 * 만드는 것이 이 사이트의 과제다.
 *
 * ⚠️ **배열 순서가 곧 화면 편성이다**(`DESKTOP_ITEMS`·`BOOKMARK_SITES`와 같은 규칙):
 * 첫 넷이 큰 캐러셀에 걸리고, 앞에서부터 일곱이 WHAT'S HOT 격자를 채운다. 화면이
 * "어느 공연을 크게 걸까"를 스스로 고르지 않는다 — 편성은 데이터의 몫이다.
 */
export interface Show {
  id: string
  title: string
  /** 공연자·단체. 포스터 아래 작은 줄. */
  artist: string
  /** 공연장. 실제 공연장 이름을 쓰지 않는다. */
  venue: string
  /** 목록을 가르는 축. 네비 분류가 곧 이 값이다. */
  genre: ShowGenre
  /** 포스터 판의 배경. */
  poster: string
  /** 남은 좌석. ⚠️ **정적 값이다**(`Math.random` 금지 — 뉴스·시집이와 같은 결정성 규칙). */
  seats: string
  /** 공연 기간. 표시 전용이다 — 게임의 날짜와 잇지 않는다(잇는 순간 정산 규칙이 필요해진다). */
  period: string
  blurb: string
}

/** 공연 분류. 배열 순서가 곧 네비 순서다. */
export const SHOW_GENRES = ['뮤지컬', '콘서트', '연극'] as const
export type ShowGenre = (typeof SHOW_GENRES)[number]

/** 큰 캐러셀에 걸리는 공연 수. 레퍼런스의 메인 배너 줄과 같은 자리다. */
export const HERO_COUNT = 4
/** WHAT'S HOT 격자에 걸리는 공연 수(큰 카드 1 + 작은 카드 6). */
export const HOT_COUNT = 7

export const SHOWS: Show[] = [
  {
    id: 'butterfly-house',
    title: '나비의 집',
    artist: '프로덕션 늦봄',
    venue: '충무 대극장',
    genre: '뮤지컬',
    poster: 'linear-gradient(160deg, #1a1030 0%, #4c2a63 55%, #a8497e 100%)',
    seats: 'VIP석 매진 · R석 18석',
    period: '08.19 ~ 11.02',
    blurb: '2막 마지막 5분을 보려고 표를 두 번 사는 사람이 있다.',
  },
  {
    id: 'midnight-band',
    title: '자정의 밴드',
    artist: '스탠드바이',
    venue: '한강 아레나',
    genre: '콘서트',
    poster: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 55%, #7a6ae8 100%)',
    seats: 'R석 매진 · S석 12석',
    period: '09.05 ~ 09.07',
    blurb: '앙코르만 네 곡. 끝나고 나오면 귀가 한참 먹먹하다.',
  },
  {
    id: 'dead-poets',
    title: '사라진 시인들',
    artist: '극단 물꼬',
    venue: '대학로 3관',
    genre: '연극',
    poster: 'linear-gradient(160deg, #2a1a0d 0%, #6b4423 55%, #b08048 100%)',
    seats: '전석 지정 · 잔여 26석',
    period: '07.22 ~ 11.03',
    blurb: '책상 위에 올라서는 장면에서 매번 박수가 나온다.',
  },
  {
    id: 'ballet-gisele',
    title: '발레 〈지젤〉',
    artist: '국립발레단',
    venue: '예술의 전당',
    genre: '뮤지컬',
    poster: 'linear-gradient(160deg, #0f2038 0%, #2b5f8e 55%, #7fb3d9 100%)',
    seats: '2층 A석 40석',
    period: '09.18 ~ 09.19',
    blurb: '2막의 흰 옷 군무. 그것만 보러 오는 사람이 대부분이다.',
  },
  {
    id: 'winter-hall',
    title: '겨울 홀 라이브',
    artist: '유하',
    venue: '노들홀',
    genre: '콘서트',
    poster: 'linear-gradient(160deg, #0f2a4a 0%, #2b5f9e 55%, #6fa8d8 100%)',
    seats: '전석 지정 · 잔여 34석',
    period: '10.11 ~ 10.12',
    blurb: '피아노 한 대와 목소리 하나. 중간에 우는 사람이 꼭 있다.',
  },
  {
    id: 'lamp-musical',
    title: '램프를 든 사람',
    artist: '극단 물꼬',
    venue: '대학로 3관',
    genre: '뮤지컬',
    poster: 'linear-gradient(160deg, #4a1d3f 0%, #8e3b6b 55%, #d18cb4 100%)',
    seats: 'VIP석 6석 · A석 40석',
    period: '08.01 ~ 10.26',
    blurb: '2막 첫 곡이 유명하다. 그 곡만 듣고 나가는 사람도 있다.',
  },
  {
    id: 'two-chairs',
    title: '의자 두 개',
    artist: '극단 맨손',
    venue: '소극장 마루',
    genre: '연극',
    poster: 'linear-gradient(160deg, #3a2f1e 0%, #7a6236 55%, #c4ab74 100%)',
    seats: '전석 자유 · 잔여 22석',
    period: '09.01 ~ 12.28',
    blurb: '무대에는 의자 둘뿐이다. 배우도 둘이다.',
  },
  {
    id: 'last-train-musical',
    title: '막차의 노래',
    artist: '프로덕션 늦봄',
    venue: '세종 소극장',
    genre: '뮤지컬',
    poster: 'linear-gradient(160deg, #23304d 0%, #46608c 55%, #8fa8ca 100%)',
    seats: '잔여 18석',
    period: '10.02 ~ 11.30',
    blurb: '지하철 막차에서 벌어지는 두 시간. 무대 위에도 손잡이가 달려 있다.',
  },
  {
    id: 'red-tour',
    title: '레드 투어 2026',
    artist: '야마다 료스케',
    venue: '올림픽 체조경기장',
    genre: '콘서트',
    poster: 'linear-gradient(160deg, #4a0d1a 0%, #a11d33 55%, #e05a6e 100%)',
    seats: '스탠딩 매진 · 지정석 잔여',
    period: '11.14 ~ 11.16',
    blurb: '스탠딩은 예매 시작 4분 만에 사라졌다고 한다.',
  },
  {
    id: 'nobody-home',
    title: '아무도 없는 집',
    artist: '극단 맨손',
    venue: '소극장 마루',
    genre: '연극',
    poster: 'linear-gradient(160deg, #2b2b33 0%, #55555f 55%, #9a9aa5 100%)',
    seats: '잔여 9석',
    period: '09.10 ~ 10.20',
    blurb: '90분 동안 초인종이 세 번 울린다. 아무도 열어 주지 않는다.',
  },
  {
    id: 'summer-fest',
    title: '한여름 뮤직 페스티벌',
    artist: '합동 라인업 12팀',
    venue: '들녘 잔디광장',
    genre: '콘서트',
    poster: 'linear-gradient(160deg, #0d3b2e 0%, #1f7a5c 55%, #62c39b 100%)',
    seats: '1일권 · 2일권 잔여',
    period: '08.14 ~ 08.16',
    blurb: '이틀 내내 서 있어야 한다. 그래도 매년 간다는 사람들이 있다.',
  },
  {
    id: 'winter-classic',
    title: '송년 실내악의 밤',
    artist: '노들 체임버',
    venue: '노들홀 소극장',
    genre: '콘서트',
    poster: 'linear-gradient(160deg, #2a2417 0%, #6b5a2e 55%, #bda765 100%)',
    seats: '전석 지정 · 잔여 51석',
    period: '12.27 ~ 12.28',
    blurb: '연말에 한 번, 같은 프로그램으로 십 년째 한다.',
  },
]

export function findShow(id: string): Show | undefined {
  return SHOWS.find((s) => s.id === id)
}

/** 그 분류의 공연. 컴포넌트가 id를 나열하지 않는다(`activitiesOf`와 같은 규칙). */
export function showsOf(genre: ShowGenre): Show[] {
  return SHOWS.filter((s) => s.genre === genre)
}

/** 큰 캐러셀에 걸리는 공연. 편성은 배열 순서가 정한다. */
export const HERO_SHOWS: Show[] = SHOWS.slice(0, HERO_COUNT)
/** WHAT'S HOT 격자. 첫 칸이 큰 카드다. */
export const HOT_SHOWS: Show[] = SHOWS.slice(0, HOT_COUNT)
