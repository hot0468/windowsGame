import type { IconName, Stats } from '../types/game'

export interface Ending {
  id: string
  title: string
  icon: IconName
  /** 엔딩 화면에 표시할 본문. */
  text: string
  /** 모든 조건을 충족해야 도달한다. 실패 엔딩은 조건 없음. */
  condition?: Partial<Record<keyof Stats, number>>
  /** 높을수록 상위 엔딩. 판정은 tier 내림차순으로 한다. */
  tier: number
  /** 실패 엔딩은 선택 없이 강제 종료된다. */
  isFailure?: boolean
  /**
   * 직업 엔딩이 가리키는 공고(`data/careers.ts`의 `Career.id`).
   *
   * ⚠️ **엔딩 → 공고 방향으로만 적는다.** 공고 쪽에 엔딩 id를 또 적으면 같은 관계가
   * 두 곳에 생기고, 한쪽만 고쳐도 아무 테스트가 안 터진다(활동↔사이트와 같은 규칙).
   */
  careerId?: string
}

/**
 * 성취 엔딩. tier 내림차순으로 정렬해 둔다 — 판정이 이 순서에 의존한다.
 * 조건 수치는 밸런스 검증(balance.verify.test.ts)이 지키는 값이다. 스탯 상한이 999로 올랐다고
 * 해서 도달 기준을 올리면 완주 가능성이 깨진다 — 이름 변경 외에는 손대지 않는다.
 *
 * ⚠️ **`bigtech`(대기업)는 2026-08-05에 여기서 빠졌다**(설계자 지시:
 * "직업엔딩은 취직한 순간이 아닌 돈 없어서 죽은 후 뜨게 해"). 예전에는 지식 90 · 멘탈 40이면
 * 게임 중간에 "대기업 합격"이 떴는데, 정규직이 실제로 구현되면서 그 이름이 **두 가지 다른 것**을
 * 뜻하게 됐다 — 스탯 문턱과 청람그룹 입사. 지금은 아래 `CAREER_ENDINGS`의 최상위 하나뿐이다.
 * **스탯 조건을 되살리지 말 것.**
 */
export const ACHIEVEMENT_ENDINGS: Ending[] = [
  {
    id: 'influencer',
    title: '인플루언서',
    icon: 'fluent-color:star-24',
    text: '팔로워가 십만을 넘겼다. 이제 사람들이 당신의 하루를 궁금해한다.',
    condition: { charm: 80 },
    tier: 3,
  },
  {
    id: 'ironman',
    title: '철인',
    icon: 'fluent-color:sport-24',
    text: '거울 속의 몸이 낯설다. 무엇을 하든 지치지 않는 몸을 얻었다.',
    condition: { maxStamina: 200 },
    tier: 3,
  },
  {
    id: 'realist',
    title: '현실주의자',
    icon: 'fluent-color:coin-multiple-24',
    text: '통장 잔고가 든든하다. 꿈은 접었지만, 적어도 굶지는 않는다.',
    // 300만원은 물가 외삽 후 최대 도달 잔고(약 265만원)를 넘어 도달 불가였다.
    // 180만원은 알바 특화 플레이 기준 34일차 도달 — 다른 성취 엔딩과 같은 구간이다.
    condition: { money: 1800000 },
    tier: 2,
  },
  {
    id: 'ordinary',
    title: '평범한 일상',
    icon: 'fluent-color:flag-24',
    text: '특별할 것 없는 하루가 쌓여 특별할 것 없는 삶이 되었다. 그것도 나쁘지 않다.',
    condition: { knowledge: 40, charm: 40 },
    tier: 1,
  },
]

/**
 * 직업 엔딩 (2026-08-05 신설, 설계자 지시:
 * **"직업엔딩은 취직한 순간이 아닌 돈 없어서 죽은 후 뜨게 해"**).
 *
 * ## 이것은 성취 엔딩이 아니라 비문(碑文)이다
 * 취직은 엔딩이 아니다 — 취직한 다음에도 게임은 계속되고, 급여는 물가를 이기지 못해
 * 결국 무너진다. 그래서 직업은 **어떻게 끝났는가**가 아니라 **어떤 사람으로 끝났는가**를
 * 정한다. 판정 시점은 **파산 그 순간 하나뿐**이고(`systems/ending.ts`), 스탯 조건은 없다.
 *
 * ## 지키는 것
 * - **공고 하나당 엔딩 하나.** `CAREERS`와 1:1이며 `ending.test.ts`가 양방향으로 지킨다
 *   (공고를 늘리고 엔딩을 안 만들면 그 회사에 다니다 죽은 사람이 무직으로 기록된다).
 * - **문장을 돌려 쓰지 않는다.** 직함만 갈아 끼운 같은 문장 다섯 개는 엔딩이 아니라 표다.
 * - **강제 종료다**(`isFailure: true`). 죽은 사람에게 [계속하기]를 줄 수는 없다.
 * - **아이콘은 서로 겹치지 않는다** — 도감에서 다섯 줄을 구분하는 것이 아이콘이다
 *   (사이트 아이콘과 같은 규칙).
 *
 * ⚠️ **`bigtech`이라는 id는 옛 성취 엔딩에서 그대로 물려받았다.** 바꾸면 이미 도감을
 * 해금해 둔 사람의 기록(`metaStore`, 판을 넘어 남는다)이 통째로 끊긴다. 제목만
 * '대기업 합격' → '대기업 사원'으로 고쳤다 — 합격은 이제 엔딩이 아니라 도중의 사건이다.
 */
export const CAREER_ENDINGS: Ending[] = [
  {
    id: 'career-hanul-call',
    careerId: 'hanul-call',
    title: '하루 세 통',
    icon: 'fluent-color:headphones-24', // ⚠️ fluent-color에 call/phone 계열 다색 글리프가 없다
    text: '남의 요금이 왜 이렇게 나왔는지는 하루에 세 번씩 설명했다. 정작 자기 몫을 물어볼 번호는 어디에도 없었다.',
    tier: 0,
    isFailure: true,
  },
  {
    id: 'career-dasom-office',
    careerId: 'dasom-office',
    title: '성실한 사무직',
    icon: 'fluent-color:clipboard-24',
    text: '비품 목록은 마지막 날까지 한 칸도 틀리지 않았다. 정작 자기 통장은 한 번도 맞아떨어지지 않았다.',
    tier: 0,
    isFailure: true,
  },
  {
    id: 'career-nulbom-edu',
    careerId: 'nulbom-edu',
    title: '남의 문장을 고치던 사람',
    icon: 'fluent-color:document-edit-24',
    text: '하루 종일 남의 원고에서 오탈자를 골라냈다. 자기 잔고의 자릿수만은 끝내 고치지 못했다.',
    tier: 0,
    isFailure: true,
  },
  {
    id: 'career-mulbit-agency',
    careerId: 'mulbit-agency',
    title: '남의 브랜드',
    icon: 'fluent-color:megaphone-loud-24',
    text: '작은 브랜드들에게 목소리를 만들어 주는 일이었다. 정작 자기 이름은 아무도 부르지 않은 채 잔고가 먼저 바닥났다.',
    tier: 0,
    isFailure: true,
  },
  {
    id: 'career-hanbat-soft',
    careerId: 'hanbat-soft',
    title: '잡히지 않은 버그',
    icon: 'fluent-color:code-24',
    text: '사내 시스템의 버그는 대체로 잡았다. 매달 같은 날 같은 자리에서 터지던 월세 알림만은 재현은 되는데 고쳐지지 않았다.',
    tier: 0,
    isFailure: true,
  },
  {
    id: 'bigtech',
    careerId: 'cheongram-group',
    title: '대기업 사원',
    icon: 'fluent-color:building-24',
    text: '명함에는 누구나 아는 이름이 박혀 있었다. 그 이름으로 결제되는 것은 하나도 없었다.',
    tier: 0,
    isFailure: true,
  },
]

/** 그 회사에 다녔던 사람의 엔딩. 모르는 회사·무직이면 undefined(= 그냥 파산이다). */
export function careerEnding(careerId: string | undefined): Ending | undefined {
  return careerId ? CAREER_ENDINGS.find((e) => e.careerId === careerId) : undefined
}

/** 실패 엔딩. 조건 판정이 아니라 게임오버 사유로 직접 선택된다. */
export const FAILURE_ENDINGS: Record<string, Ending> = {
  /**
   * ⚠️ **직장을 한 번도 가져 본 적 없는 사람의 파산이다.** 정규직에 닿았던 판은
   * `CAREER_ENDINGS`가 대신 받는다(`systems/ending.ts`).
   */
  bankrupt: {
    id: 'bankrupt',
    title: '파산',
    icon: 'fluent-color:person-warning-24',
    text: '통장이 비었다. 월세 독촉 문자가 쌓이는 화면을 그저 바라본다.',
    tier: 0,
    isFailure: true,
  },
  burnout: {
    id: 'burnout',
    title: '번아웃',
    icon: 'fluent-color:alert-24',
    text: '아무것도 하고 싶지 않다. 침대에서 일어날 이유를 찾지 못한 채 하루가 지나간다.',
    tier: 0,
    isFailure: true,
  },
}

export const ENDINGS: Ending[] = [
  ...ACHIEVEMENT_ENDINGS,
  ...CAREER_ENDINGS,
  ...Object.values(FAILURE_ENDINGS),
]
