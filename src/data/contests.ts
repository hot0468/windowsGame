import type { GrowthStatKey } from '../types/game'
/**
 * 공모전(콘테스트하다)과 코미콘 회지 판매 수치.
 *
 * ⚠️ **실존 공모전·주최사 금지**(알바몬·그몽과 같은 규칙). 전부 지어낸 이름이다.
 * ⚠️ `Math.random`·`Date` 금지 — 심사에 주사위가 없다(아래 "왜 무작위가 없는가").
 *
 * ## 왜 무작위가 없는가
 * 정규직 서류·면접, O넷 자격시험과 **같은 규칙**이다. 낙선은 무엇이 모자랐는지 말해 줘야
 * 하는데(ux `error-clarity`) 주사위를 섞으면 그 설명이 거짓이 된다. 불확실성은
 * **발표일까지의 지연**이 맡는다 — 낸 뒤에는 손댈 수 없으므로 "언제 내는가"가 도박이다.
 *
 * ## ⚠️ 상금 풀이 유한한 것이 "판은 반드시 끝난다"를 지탱한다
 * 공모전은 **한 번씩만 낼 수 있다**(`ContestState.entries`가 순회로 막는다). 그래서 이
 * 목록의 상금 총합이 곧 평생 벌 수 있는 상금의 상한이고, 물가를 이길 수 없다.
 * 반복 수입원은 코미콘 쪽인데 그쪽은 **장당 수익에 상한이 걸려 있다**(아래).
 */

/**
 * 공모전 분야. 레퍼런스(실제 공모전 모음 사이트)의 카테고리 줄을 따르되
 * **이 게임에 실제로 있는 것만** 남겼다 — 갈 데 없는 칩은 장식이다.
 */
export type ContestCategory = '미술·디자인' | '만화·웹툰' | '문학·에세이' | '학술·데이터' | '경제·금융' | '음악·공연'

/** 공모전 한 건. */
export interface Contest {
  id: string
  host: string
  title: string
  /**
   * 무엇을 받는가.
   * - `'comic'`: 작품집(프로젝트) — 장수 제한이 붙는다.
   * - `'single'`: 그림 한 장.
   * - `'stat'`: **아무것도 안 받는다**(2026-08-08). 백일장·경진대회처럼 **몸으로 나가는**
   *   대회라 낼 물건이 없다 — 심사가 보는 것은 그날의 **스탯**(`judgedBy`)이고,
   *   그래서 그리지 않는 판에서도 공모전이 열린다.
   */
  kind: 'comic' | 'single' | 'stat'
  /**
   * `kind: 'stat'`이 심사하는 스탯들. **평균 비율**이 점수다(각 스탯 ÷ 그 스탯의 상한).
   *
   * ⚠️ **비율이라 `minScore`가 그림 대회와 같은 척도로 읽힌다**(`artRatio`도 0~1이다) —
   * 상한이 다른 스탯(평판 100 / 지식 999)을 섞어도 한쪽이 점수를 독차지하지 않는다.
   * ⚠️ **하나만 적어도 된다.** 여럿이면 **다 올려야** 점수가 오른다(평균이라 한쪽만
   * 높으면 절반으로 깎인다) — 그것이 "이 대회는 무엇을 보는가"의 뜻이다.
   */
  judgedBy?: GrowthStatKey[]
  /**
   * 분야. **화면의 필터 칩이 이 값에서 파생된다**(`CONTEST_CATEGORIES`) —
   * 칩 목록을 따로 적으면 대회를 하나 더할 때 두 곳을 고치게 된다.
   */
  category: ContestCategory
  /** 만화 공모전의 장수 제한. ⚠️ **점수가 아니라 자격 요건이다**(모자라거나 넘치면 못 낸다). */
  minPages?: number
  maxPages?: number
  /** 출품일로부터 며칠 뒤 밤에 결과가 나오는가. */
  judgeDays: number
  /**
   * 상. **점수 내림차순으로 적는다** — 판정은 위에서부터 처음 걸리는 것 하나다.
   * 다 못 넘으면 낙선이고 그것도 결과다(아무 말도 안 하는 상태를 만들지 않는다).
   */
  prizes: ContestPrize[]
  tags: string[]
  badge?: string
}

export interface ContestPrize {
  label: string
  /** 이 점수 이상이면 이 상이다. 점수는 낸 작품의 평균 완성도(`artRatio`)다. */
  minScore: number
  money: number
  reputation: number
}

/**
 * 공모전 6종.
 *
 * ⚠️ **`minScore`는 `artRatio` 기준이다**(`(예술+창의력) / (2 × ART_MASTERY)`).
 * 0.25가 C, 0.5가 B, 0.75가 S 언저리라 **초반에는 입선도 어렵고 후반에는 대상이 열린다** —
 * 그리기를 계속할 이유가 여기서 나온다.
 * ⚠️ 조건 없는 단일 공모전(`open-illust`)이 **처음 낼 수 있는 하나**다. 편의점 알바가
 * 조건 없는 유일한 알바인 것과 같은 자리 — 없으면 공모전이 통째로 닫힌 문이 된다.
 */
export const CONTESTS: Contest[] = [
  {
    id: 'open-illust',
    category: '미술·디자인',
    host: '온라인 창작 마당',
    title: '아무거나 그리기 공모전',
    kind: 'single',
    judgeDays: 4,
    prizes: [
      { label: '대상', minScore: 0.62, money: 500_000, reputation: 8 },
      { label: '우수상', minScore: 0.4, money: 200_000, reputation: 5 },
      { label: '입선', minScore: 0.18, money: 60_000, reputation: 2 },
    ],
    tags: ['단일', '상시'],
    badge: '누구나',
  },
  {
    id: 'city-poster',
    category: '미술·디자인',
    host: '중앙시 문화재단',
    title: '우리 동네 포스터 공모전',
    kind: 'single',
    judgeDays: 6,
    prizes: [
      { label: '대상', minScore: 0.7, money: 900_000, reputation: 10 },
      { label: '우수상', minScore: 0.5, money: 350_000, reputation: 6 },
      { label: '입선', minScore: 0.3, money: 100_000, reputation: 3 },
    ],
    tags: ['단일', '지자체'],
  },
  {
    id: 'short-comic',
    category: '만화·웹툰',
    host: '만화의집',
    title: '단편만화 신인 공모',
    kind: 'comic',
    minPages: 4,
    maxPages: 8,
    judgeDays: 7,
    prizes: [
      { label: '대상', minScore: 0.66, money: 1_200_000, reputation: 12 },
      { label: '우수상', minScore: 0.45, money: 450_000, reputation: 7 },
      { label: '입선', minScore: 0.25, money: 150_000, reputation: 3 },
    ],
    tags: ['만화', '4~8장'],
    badge: '신인',
  },
  {
    id: 'serial-comic',
    category: '만화·웹툰',
    host: '주간 페이지',
    title: '연재만화 원고 공모',
    kind: 'comic',
    minPages: 10,
    maxPages: 20,
    judgeDays: 9,
    prizes: [
      { label: '대상', minScore: 0.72, money: 2_000_000, reputation: 15 },
      { label: '우수상', minScore: 0.52, money: 700_000, reputation: 8 },
      { label: '입선', minScore: 0.32, money: 200_000, reputation: 4 },
    ],
    tags: ['만화', '10~20장'],
  },
  {
    id: 'anthology',
    category: '만화·웹툰',
    host: '작은책방 출판',
    title: '그림 에세이 단행본 공모',
    kind: 'comic',
    minPages: 6,
    maxPages: 14,
    judgeDays: 8,
    prizes: [
      { label: '대상', minScore: 0.68, money: 1_500_000, reputation: 13 },
      { label: '우수상', minScore: 0.48, money: 550_000, reputation: 7 },
      { label: '입선', minScore: 0.28, money: 180_000, reputation: 3 },
    ],
    tags: ['만화', '6~14장'],
  },
  {
    id: 'grand-illust',
    category: '미술·디자인',
    host: '한빛일러스트어워드',
    title: '올해의 일러스트 대상',
    kind: 'single',
    judgeDays: 10,
    prizes: [
      { label: '대상', minScore: 0.8, money: 1_800_000, reputation: 16 },
      { label: '우수상', minScore: 0.6, money: 600_000, reputation: 9 },
      { label: '입선', minScore: 0.42, money: 150_000, reputation: 4 },
    ],
    tags: ['단일', '전국'],
    badge: '최고 상금',
  },
  {
    /*
     * ── 그림이 아닌 대회 4종 (2026-08-08 설계자 지시) ──────────────────
     * ⚠️ **`kind: 'stat'`은 낼 물건이 없다.** 그리는 판이 아니어도 공모전이 열리는 것이
     * 이 넷의 존재 이유다 — 여태 콘테스트하다는 그림을 안 그리면 통째로 닫힌 문이었다.
     * ⚠️ 점수는 **낼 때의 스탯**으로 박힌다(`ContestEntry.score`) — 발표일에 다시 계산하면
     * 내고 나서 계속 올려 점수를 바꾸는 자리가 생긴다(그림 대회와 같은 규칙).
     */
    id: 'essay-contest',
    category: '문학·에세이',
    host: '늘봄문학회',
    title: '전국 백일장',
    kind: 'stat',
    /* 글은 어휘가 반이고 나머지 반이 무엇을 쓰느냐다 — 둘 다 올려야 점수가 오른다. */
    judgedBy: ['vocabulary', 'creativity'],
    judgeDays: 5,
    prizes: [
      { label: '장원', minScore: 0.5, money: 600_000, reputation: 10 },
      { label: '차상', minScore: 0.3, money: 220_000, reputation: 6 },
      { label: '입선', minScore: 0.14, money: 80_000, reputation: 2 },
    ],
    tags: ['현장', '어휘력·창의력'],
    badge: '누구나',
  },
  {
    id: 'dataviz-contest',
    category: '학술·데이터',
    host: '한국데이터학회',
    title: '데이터 시각화 경진대회',
    kind: 'stat',
    /* 읽어 내는 것은 지식, 보여 주는 방식은 창의력. 도구는 이 게임이 안 따진다. */
    judgedBy: ['knowledge', 'creativity'],
    judgeDays: 7,
    prizes: [
      { label: '최우수', minScore: 0.55, money: 900_000, reputation: 12 },
      { label: '우수', minScore: 0.35, money: 330_000, reputation: 7 },
      { label: '장려', minScore: 0.18, money: 120_000, reputation: 3 },
    ],
    tags: ['학술', '지식·창의력'],
  },
  {
    /*
     * ⚠️ **실제 주식 계좌(`GameState.stocks`)를 보지 않는다.** 모의투자는 자기 돈을 쓰는
     * 일이 아니고, 계좌를 보면 **돈이 많은 사람이 상도 받는** 구조가 되어 상금이
     * 자산의 함수가 된다. 심사는 스탯만 본다 — 시세를 읽는 것은 **경제**이고,
     * 남들보다 먼저 손을 떼는 것은 판을 읽는 감각(게임)이다.
     * ⚠️ **2026-08-08에 `knowledge` → `finance`로 옮겼다**(경제 스탯 신설) — 지식은
     * 배운 것이고 경제는 돈이 움직이는 것을 읽는 눈이라, 이 대회가 보는 것은 뒤쪽이다.
     */
    id: 'stock-contest',
    category: '경제·금융',
    host: '네이놈증권',
    title: '대학생 모의주식 투자대회',
    kind: 'stat',
    judgedBy: ['finance', 'gaming'],
    judgeDays: 8,
    prizes: [
      { label: '1위', minScore: 0.5, money: 1_000_000, reputation: 11 },
      { label: '2위', minScore: 0.32, money: 380_000, reputation: 6 },
      { label: '참가상', minScore: 0.12, money: 100_000, reputation: 2 },
    ],
    tags: ['모의투자', '경제·게임'],
  },
  {
    /*
     * 음악 스탯(2026-08-08 신설)이 처음으로 결과를 가르는 자리다.
     * 만드는 것은 음악이고 무엇을 담느냐가 감수성이다.
     */
    id: 'music-contest',
    category: '음악·공연',
    host: '들림레코드',
    title: '공연 및 음원 발매 공모전',
    kind: 'stat',
    judgedBy: ['music', 'sensitivity'],
    judgeDays: 9,
    prizes: [
      { label: '음원 발매', minScore: 0.52, money: 900_000, reputation: 14 },
      { label: '공연 초청', minScore: 0.33, money: 320_000, reputation: 7 },
      { label: '입선', minScore: 0.15, money: 90_000, reputation: 3 },
    ],
    tags: ['음원', '음악·감수성'],
  },
]

/**
 * 화면의 분야 칩. **대회 목록에서 파생한다** — 칩을 따로 적으면 대회를 더할 때
 * 두 곳을 고치게 되고, 한쪽만 고치면 **누르면 빈 목록이 나오는 칩**이 생긴다.
 */
export const CONTEST_CATEGORIES: ContestCategory[] = [
  ...new Set(CONTESTS.map((c) => c.category)),
]

/**
 * 분야별 카드 포스터 배경. **이미지가 아니라 그라데이션 + 글자다**(배너·썸네일과 같은
 * 오프라인 규칙 — 레퍼런스의 포스터 사진 자리를 이것으로 대신한다).
 *
 * ⚠️ **흰 글자가 모든 정지점 위에서 4.5:1을 넘어야 한다.** 포스터에는 분야 이름과 제목이
 * 흰 글자로 눕는다 — 가로 배너에서 실측으로 두 번 잡힌 함정이 그대로 여기 있다
 * (계산으로 "큰 글자 기준은 넘는다"고 넘어가면 작은 글자에서 터진다).
 */
export const CONTEST_POSTER: Record<ContestCategory, string> = {
  '미술·디자인': 'linear-gradient(140deg, #3b1259 0%, #6b21a8 100%)',
  '만화·웹툰': 'linear-gradient(140deg, #4a1d10 0%, #9a3412 100%)',
  '문학·에세이': 'linear-gradient(140deg, #12304a 0%, #1d4e79 100%)',
  '학술·데이터': 'linear-gradient(140deg, #0b3b3a 0%, #0f766e 100%)',
  '경제·금융': 'linear-gradient(140deg, #14261a 0%, #166534 100%)',
  '음악·공연': 'linear-gradient(140deg, #3b0d29 0%, #9d174d 100%)',
}

export function findContest(id: string): Contest | undefined {
  return CONTESTS.find((c) => c.id === id)
}

/** 그 종류의 공모전만. 화면이 `kind` 문자열을 직접 비교하지 않게 한다. */
export function contestsOf(kind: Contest['kind']): Contest[] {
  return CONTESTS.filter((c) => c.kind === kind)
}

/* ── 코미콘 (회지 판매) ───────────────────────────────────────────────── */

/**
 * 회지 한 장이 버는 돈의 기준값.
 *
 * ⚠️ **이 값과 `QUALITY_MULTIPLIER`의 최댓값이 "판은 반드시 끝난다"를 지탱한다.**
 * 회지는 공모전과 달리 **몇 번이든 반복할 수 있는 수입원**이라 상한이 여기밖에 없다.
 * 한 장을 그리는 데 1턴이 드므로 **장당 수익이 곧 턴당 수익**이고, 하루는 슬롯 둘이다:
 * `7,000 × 2.0 × 2슬롯 = 28,000원/일` < 가장 싼 집의 마지막 물가 생활비 `45,600원/일`.
 * 판매 자체도 1턴을 쓰므로 실제 수익률은 이보다 낮다. `contests.test.ts`가 데이터에서
 * 직접 계산해 지킨다 — 여기를 키우면 거기서 터진다.
 */
export const WON_PER_PAGE = 7_000

/**
 * 완성도(평균 `artRatio`)가 곱하는 배율. **구간이 아니라 선형이 아닌 계단이다** —
 * 화면이 "지금 내 회지는 얼마쯤 팔린다"를 정직하게 미리 적을 수 있어야 한다.
 * ⚠️ 최댓값 2.0을 키우면 위 부등식이 깨진다.
 */
export const QUALITY_MULTIPLIER: { minScore: number; label: string; multiplier: number }[] = [
  { minScore: 0.7, label: '줄이 섰다', multiplier: 2.0 },
  { minScore: 0.5, label: '꾸준히 팔렸다', multiplier: 1.5 },
  { minScore: 0.3, label: '몇 권 나갔다', multiplier: 1.0 },
  { minScore: 0, label: '거의 안 팔렸다', multiplier: 0.4 },
]

/** 회지로 낼 수 있는 최소 장수. 한 장짜리는 책이 아니다. */
export const MIN_BOOK_PAGES = 3
