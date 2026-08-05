/**
 * 알바몬 채용 공고.
 *
 * ⚠️ **공고는 활동을 `activityId`로 가리키기만 한다.** 급여·행동력·조건 같은 수치는
 * `data/activities.ts`의 알바 4종이 단일 출처이고, 여기에는 **표시용 정보만** 담는다
 * (`Site.activityId`와 같은 규칙). 공고에 금액을 다시 적으면 물가 배율이 오를 때
 * 목록의 일당과 확정 패널의 일당이 어긋나 플레이어에게 거짓 숫자를 보여 주게 된다.
 *
 * ⚠️ **같은 직종은 공고가 둘이어도 같은 활동을 가리킨다** — 그래서 표시 금액이 갈리지 않는다.
 * 공고를 하나 더 만들고 싶으면 활동 4종 중 하나를 골라 붙인다(새 수치를 만들지 않는다).
 *
 * ⚠️ **실존 브랜드·실존 인물 이름 금지**(가짜 광고·시집이와 같은 규칙). 전부 지어낸 상호다.
 * ⚠️ `Math.random`·`Date` 금지 — 새로 고칠 때마다 목록이 바뀌면 결정성이 깨진다.
 */
export interface Job {
  id: string
  /** 이 공고가 실행하는 활동 id. 실제 활동인지는 `jobs.test.ts`가 지킨다. */
  activityId: string
  /** 지어낸 상호. */
  company: string
  title: string
  /** 가짜 지역명. */
  area: string
  /** 근무 시간대 문구. */
  schedule: string
  /** 카드 아래 회색 칩. */
  tags: string[]
  /** 있으면 제목 옆에 강조 배지가 붙는다. */
  badge?: string
}

export const JOBS: Job[] = [
  {
    id: 'cs-onsaemiro',
    activityId: 'work',
    company: '온새미로 편의점 늘봄점',
    title: '야간 카운터 (22시~07시)',
    area: '늘봄구 갈밭동',
    schedule: '주 3일 · 야간',
    tags: ['초보 가능', '4대보험', '야간수당'],
    badge: '급구',
  },
  {
    id: 'cs-dalbit',
    activityId: 'work',
    company: '달빛마트24 서한리점',
    title: '심야 진열·계산 보조',
    area: '서한리 시장 앞',
    schedule: '주말 포함 · 야간',
    tags: ['당일 면접', '식사 제공'],
  },
  {
    id: 'cafe-barim',
    activityId: 'work-cafe',
    company: '카페 바림',
    title: '주말 오전 홀 담당',
    area: '늘봄구 물빛로',
    schedule: '토·일 · 오전',
    tags: ['홀 서빙', '무경력 지원 가능', '음료 제공'],
  },
  {
    id: 'cafe-nagwon',
    activityId: 'work-cafe',
    company: '커피낙원 청람대점',
    title: '캠퍼스점 오전 파트',
    area: '청람동 대학로',
    schedule: '주 4일 · 오전',
    tags: ['교육 지원', '주휴수당'],
    badge: '인기',
  },
  {
    id: 'log-hanbam',
    activityId: 'work-logistics',
    company: '한밤물류 늘봄터미널',
    title: '새벽 상하차 (03시~08시)',
    area: '늘봄산단 3블록',
    schedule: '주 3일 · 새벽',
    tags: ['일당 즉시지급', '체력 필요', '셔틀 운행'],
    badge: '급구',
  },
  {
    id: 'log-saebyeok',
    activityId: 'work-logistics',
    company: '새벽터미널 물류센터',
    title: '분류 라인 단기 인력',
    area: '서한리 외곽',
    schedule: '단기 · 새벽',
    tags: ['단기 가능', '식사 제공'],
  },
  {
    id: 'tutor-cheongram',
    activityId: 'work-tutor',
    company: '청람과외센터',
    title: '중등 수학 방문 과외',
    area: '청람동 학원가',
    schedule: '주 2회 · 저녁 2시간',
    tags: ['고시급', '경력 우대', '교재 제공'],
  },
  {
    id: 'tutor-surihak',
    activityId: 'work-tutor',
    company: '수리학당',
    title: '중3 내신 대비 개인지도',
    area: '물빛로 상가 2층',
    schedule: '주 2회 · 저녁',
    tags: ['단기 특강', '실적 인센티브'],
    badge: '마감임박',
  },
]

/** 화면 필터가 쓰는 목록. 컴포넌트가 activityId를 나열하지 않는다. */
export function jobsOf(activityId: string): Job[] {
  return JOBS.filter((j) => j.activityId === activityId)
}

export function findJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id)
}
