import type { IconName, Stats } from '../types/game'

/**
 * O넷 자격 종목 + 응시 수치.
 *
 * ⚠️ **응시료는 활동이 아니라 종목이 갖는다**(`Cert.fee`). 활동 하나(`exam`)가 모든
 * 종목을 대신 실행하므로 금액을 활동에 적으면 종목마다 다른 값을 표현할 수 없다 —
 * `Course.price`·`Career.salary`와 정확히 같은 방향이다.
 *
 * ⚠️ **실존 기관·회사명 금지**(가짜 광고·알바몬과 같은 규칙). 종목명은 전부 지어낸
 * 일반명사형이고 실제 국가기술자격 명칭이 아니다.
 * ⚠️ `Math.random`·`Date` 금지 — 목록도 판정도 결정적이어야 한다.
 *
 * ## 왜 합격 판정에 무작위가 없나
 * 정규직(`data/careers.ts`)과 **같은 규칙이다.** 탈락은 무엇이 모자랐는지 말해 줘야
 * 하는데(ux `error-clarity`) 주사위를 섞으면 그 설명이 거짓이 된다. 불확실성은
 * **응시일부터 발표일까지의 지연**이 맡는다 — 응시한 날 모자랐어도 발표일까지 채우면
 * 붙는다. 그것이 플레이어가 개입할 수 있는 유일한 도박이다.
 *
 * ## 자격증이 여는 것은 둘이다
 * ① **정규직 지원 자격**(`Career.cert`) — 급여 상위 두 공고가 요구한다.
 * ② **새 활동**(`Activity.requiresItem`) — 수료증과 같은 방향이다. 자격증은 기존 조건을
 *    우회시키지 않고 **다른 선택지**를 준다.
 * 관계는 **한 방향으로만 적는다**(공고·활동 쪽에만) — 여기에 또 적으면 한쪽만 고쳐도
 * 아무 테스트가 안 터진다. 화면은 `careersRequiring`·`activitiesUnlockedBy`로 뒤집어 찾는다.
 */
export interface Cert {
  id: string
  /** 지어낸 종목명. */
  name: string
  /** 분류 배지. 목록을 눈으로 묶는 데만 쓴다. */
  field: string
  /** 합격하면 인벤토리에 들어오는 아이템 id(`data/items.ts`). */
  itemId: string
  /** 응시료(원). **응시하는 순간 나간다** — 떨어져도 돌려주지 않는다. */
  fee: number
  /** 합격 기준. ⚠️ **응시 시점이 아니라 발표일 시점의 스탯**으로 판정한다. */
  requires: Partial<Record<keyof Stats, number>>
  /** 응시일로부터 발표까지의 일수. */
  resultDays: number
  /** 카드 본문 한 줄. */
  summary: string
  icon: IconName
}

/** 응시 활동 id. 종목이 넷이어도 실행하는 활동은 이 하나뿐이다. */
export const EXAM_ACTIVITY_ID = 'exam'

/**
 * 자격 종목. 위로 갈수록 싸고 빠르고 쉽다.
 *
 * 난이도 곡선을 세 축(응시료 · 조건 · 발표 소요일)에 **함께** 걸었다 — 한 축만 올리면
 * "비싸기만 한 종목"이나 "오래 걸리기만 한 종목"이 생겨 고를 이유가 없어진다.
 * 앞의 둘은 활동을 열고, 뒤의 둘은 정규직 상위 공고의 지원 자격이다.
 */
export const CERTS: Cert[] = [
  {
    id: 'doc-2',
    name: '문서실무 2급',
    field: '사무',
    itemId: 'cert-doc',
    fee: 18_000,
    // 가장 싼 입문 종목. 독서 네댓 번이면 닿는다 — "따 보니 일이 하나 열렸다"를
    // 초반에 한 번 겪게 하는 자리다(알바 카페의 매력 12와 같은 판단).
    requires: { vocabulary: 25, knowledge: 20 },
    resultDays: 2,
    summary: '표 서식과 공문 양식을 다룹니다. 가장 먼저 따 두는 종목입니다.',
    icon: 'fluent-color:document-text-24',
  },
  {
    id: 'safety-3',
    name: '안전관리 3급',
    field: '현장',
    itemId: 'cert-safety',
    fee: 32_000,
    // 몸으로 버는 쪽의 자격. 운동은 러닝이, 예의범절은 예절 교육이 올린다 —
    // 둘 다 "돈 안 드는 활동"이라 자본이 아니라 시간으로 여는 문이다.
    requires: { athletics: 30, manners: 20 },
    resultDays: 3,
    summary: '작업장 점검 항목과 보고 절차를 봅니다. 실기 비중이 높습니다.',
    icon: 'fluent-color:shield-checkmark-24',
  },
  {
    id: 'info-2',
    name: '정보처리 2급',
    field: '정보기술',
    itemId: 'cert-info',
    fee: 48_000,
    // 한밭소프트(주니어 개발자)의 지원 자격. ⚠️ **공고 요건(지식 120·창의력 60)보다
    // 낮게 잡는다** — 자격증이 공고보다 어려우면 자격증이 곧 공고가 되어 두 관문이
    // 하나로 합쳐진다. 자격증은 문턱이지 시험이 아니다.
    requires: { knowledge: 90, creativity: 40 },
    resultDays: 5,
    summary: '자료구조와 데이터베이스 기초를 봅니다. 개발 직군 공고가 요구합니다.',
    icon: 'fluent-color:code-24',
  },
  {
    id: 'manage-1',
    name: '경영관리 1급',
    field: '경영',
    itemId: 'cert-manage',
    fee: 75_000,
    // 청람그룹(신입 공채)의 지원 자격. 가장 비싸고 가장 오래 걸린다 —
    // 공고 요건(지식 150·어휘력 100·친화력 80)보다는 낮다(위와 같은 이유).
    requires: { knowledge: 120, vocabulary: 70, sociability: 50 },
    resultDays: 7,
    summary: '조직·회계·인사 전반을 봅니다. 공채 지원서에 적을 수 있는 유일한 종목입니다.',
    icon: 'fluent-color:briefcase-24',
  },
]

export function findCert(id: string): Cert | undefined {
  return CERTS.find((c) => c.id === id)
}

/** 그 자격증 아이템을 주는 종목. 아이템 → 종목 방향으로 뒤집어 찾는다. */
export function certForItem(itemId: string): Cert | undefined {
  return CERTS.find((c) => c.itemId === itemId)
}
