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

/** 공모전 한 건. */
export interface Contest {
  id: string
  host: string
  title: string
  /** `'comic'`은 작품집(프로젝트)을, `'single'`은 그림 한 장을 받는다. */
  kind: 'comic' | 'single'
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
]

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
