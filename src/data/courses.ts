import type { IconName } from '../types/game'

/**
 * 슬로우캠퍼스의 강의.
 *
 * ⚠️ **공고(`data/jobs.ts`)와 같은 규칙이다: 강의는 활동을 `activityId`로 가리키기만 한다.**
 * 행동력·스탯 증가량을 여기에 다시 적지 않는다 — 두 벌이 되면 밸런스 테스트가 못 보는
 * 두 번째 출처가 생긴다. **다만 수강료(`price`)만은 여기가 갖는다**(강의마다 다르고,
 * 활동 하나가 모든 강의를 대신 실행하기 때문 — `Career.salary`가 공고에 있는 것과 같은 방향).
 *
 * ## 수료증
 * 같은 강의를 `CERTIFICATE_SESSIONS`회 수강하면 수료증 아이템(`certificateItemId`)이
 * 발급되고, 그 아이템이 `requiresItem`으로 잠긴 활동을 연다(헬스장 회원권과 같은 구조).
 * **수료증이 없는 강의도 있다** — 전부 아이템을 주면 수료증이 흔해져 의미가 사라진다.
 */
export interface Course {
  id: string
  title: string
  /** 크리에이터 이름. ⚠️ **실존 인물 금지**(배너·미디어와 같은 규칙). */
  creator: string
  /** 실행할 활동. 수치는 전부 저쪽이 갖는다. */
  activityId: string
  /** 수강료. **강의마다 다르므로 여기가 단일 출처다.** */
  price: number
  /** 좌측 필터의 분류. `COURSE_CATEGORIES`에 있는 값만 쓴다. */
  category: string
  /** 좌측 필터의 난이도. `COURSE_LEVELS`에 있는 값만 쓴다. */
  level: string
  icon: IconName
  /** 카드 썸네일. ⚠️ **이미지가 아니라 CSS 그라데이션이다**(배너·포스터와 같은 오프라인 규칙). */
  gradient: string
  /** 수강 시 필요한 스탯. 미달이면 감추지 않고 **비활성 + 사유**로 보여 준다. */
  requires?: { knowledge?: number; creativity?: number; charm?: number }
  /**
   * 이 강의를 다 들으면 나오는 수료증 아이템 id(`data/items.ts`).
   * 없으면 수료증이 없는 강의다.
   */
  certificateItemId?: string
}

/**
 * 같은 강의를 몇 번 들어야 수료증이 나오는가.
 *
 * ⚠️ **3회인 것이 이 시스템의 무게다.** 1회면 수료증이 그냥 비싼 아이템이 되고,
 * 5회 이상이면 100일 판에서 다른 걸 아무것도 못 한다. 3회 = 수강료 3번 + 슬롯 3개다.
 */
export const CERTIFICATE_SESSIONS = 3

/** 좌측 필터. **컴포넌트가 분류를 나열하지 않는다**(`ACTIVITY_CATEGORIES`와 같은 규칙). */
export const COURSE_CATEGORIES = ['전체', 'AI 스킬업', '창업·부업', '금융·재테크', '디자인'] as const

/** 난이도 필터. 배열 순서가 곧 표시 순서다. */
export const COURSE_LEVELS = ['입문', '초급', '중급', '고급'] as const

export const COURSES: Course[] = [
  {
    /*
     * 수료증이 달린 강의 1 — **과외(`work-tutor`)의 지식 60 조건을 대신 여는 길**은
     * 아니다. 수료증은 조건을 우회시키지 않고 **새 활동**을 연다(아래 `data/items.ts` 참고).
     * 우회를 허용하면 스탯을 키울 이유가 사라진다.
     */
    id: 'ai-basic',
    title: '처음부터 차근차근 배우는 실무 AI 입문',
    creator: '마소캠퍼스',
    activityId: 'study',
    price: 45000,
    category: 'AI 스킬업',
    level: '입문',
    icon: 'fluent-color:bot-sparkle-24',
    gradient: 'linear-gradient(135deg, #f8b195 0%, #f67280 100%)',
    certificateItemId: 'cert-ai',
  },
  {
    id: 'ai-automation',
    title: '업무 자동화로 시작하는 왕초보 코드',
    creator: '윤자동',
    activityId: 'study',
    price: 62000,
    category: 'AI 스킬업',
    level: '초급',
    icon: 'fluent-color:code-24',
    gradient: 'linear-gradient(135deg, #2b2d42 0%, #4a4e69 100%)',
    requires: { knowledge: 20 },
  },
  {
    id: 'ai-video',
    title: '기획·이미지·편집까지 완성하는 올인원 영상 제작',
    creator: '비지오랩',
    activityId: 'writing',
    price: 78000,
    category: 'AI 스킬업',
    level: '중급',
    icon: 'fluent-color:video-24',
    gradient: 'linear-gradient(135deg, #7f5af0 0%, #2cb67d 100%)',
    requires: { creativity: 25 },
  },
  {
    /* 수료증이 달린 강의 2. 창업·부업 계열은 매력을 요구해 학습 일변도를 막는다. */
    id: 'side-brand',
    title: '작게 시작하는 1인 브랜드 만들기',
    creator: '한겨울',
    activityId: 'writing',
    price: 55000,
    category: '창업·부업',
    level: '초급',
    icon: 'fluent-color:megaphone-loud-24',
    gradient: 'linear-gradient(135deg, #ff8a5c 0%, #ffc46b 100%)',
    requires: { charm: 15 },
    certificateItemId: 'cert-brand',
  },
  {
    id: 'money-basic',
    title: '월급쟁이를 위한 첫 재테크 수업',
    creator: '적금왕',
    activityId: 'study',
    price: 38000,
    category: '금융·재테크',
    level: '입문',
    icon: 'fluent-color:savings-24',
    gradient: 'linear-gradient(135deg, #0f3057 0%, #00587a 100%)',
  },
  {
    id: 'money-advanced',
    title: '숫자로 읽는 재무제표 심화',
    creator: '적금왕',
    activityId: 'study',
    price: 95000,
    category: '금융·재테크',
    level: '고급',
    icon: 'fluent-color:data-trending-24',
    gradient: 'linear-gradient(135deg, #14213d 0%, #a16207 100%)',
    requires: { knowledge: 45 },
  },
  {
    id: 'design-basic',
    title: '비전공자를 위한 화면 디자인 기초',
    creator: '초인쌤',
    activityId: 'writing',
    price: 49000,
    category: '디자인',
    level: '입문',
    icon: 'fluent-color:paint-brush-24',
    gradient: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  },
  {
    id: 'design-motion',
    title: '움직임을 설계하는 모션 그래픽',
    creator: '비지오랩',
    activityId: 'writing',
    price: 88000,
    category: '디자인',
    level: '고급',
    icon: 'fluent-color:video-24',
    gradient: 'linear-gradient(135deg, #360033 0%, #0b8793 100%)',
    requires: { creativity: 40 },
  },
]

export function findCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

/**
 * 수료증을 주는 강의를 아이템 id에서 거꾸로 찾는다.
 * ⚠️ **관계는 강의 → 아이템 한 방향으로만 적는다**(`activitiesUnlockedBy`와 같은 규칙) —
 * 아이템 쪽에도 강의 id를 적으면 한쪽만 고치는 사고가 난다.
 */
export function courseForCertificate(itemId: string): Course | undefined {
  return COURSES.find((c) => c.certificateItemId === itemId)
}
