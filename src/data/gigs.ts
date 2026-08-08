/**
 * 그몽 — 부업(외주) 일감.
 *
 * ⚠️ **`data/jobs.ts`(알바몬 공고)와 완전히 같은 규칙이다: 여기에는 수치가 없다.**
 * 보수·행동력·조건은 전부 `data/activities.ts`의 외주 활동이 단일 출처이고,
 * 일감은 `activityId`로 **가리키기만** 한다. 금액을 여기 다시 적으면 물가 배율이 오를 때
 * 목록의 보수와 확인창의 보수가 어긋나 플레이어에게 거짓 숫자를 보여 주게 된다.
 *
 * ⚠️ **알바몬(일용직)·벼룩장터(정규직)와 또 다른 축이다**: 여기 일감은 **자격이나 도구가
 * 열어 주는 것**이다 — 수료증 둘, 어도비 구독 하나. 그래서 조건 없는 일감은 하나뿐이고
 * (`gig-typing`), 그것이 알바몬의 편의점과 같은 자리다.
 *
 * ⚠️ **실존 상호 금지**(가짜 광고·알바몬과 같은 규칙). 전부 지어낸 의뢰인이다.
 * ⚠️ `Math.random`·`Date` 금지 — 새로 고칠 때마다 목록이 바뀌면 결정성이 깨진다.
 */
export interface Gig {
  id: string
  /** 이 일감이 실행하는 활동 id. 실제 활동인지는 `sites.test.ts`·`gigs.test.ts`가 지킨다. */
  activityId: string
  /** 지어낸 의뢰인. */
  client: string
  title: string
  /** 카드 아래 회색 칩. */
  tags: string[]
  /** 있으면 제목 옆에 강조 배지가 붙는다. */
  badge?: string
}

export const GIGS: Gig[] = [
  {
    /*
     * ⚠️ **조건이 하나도 없는 유일한 일감이다**(알바몬의 편의점과 같은 자리).
     * 여기서 잠그면 그몽은 자격을 갖추기 전까지 통째로 닫힌 사이트가 된다 —
     * 그러면 "부업이 있다"는 사실 자체를 알 길이 없다.
     */
    id: 'typing-nulbom',
    activityId: 'gig-typing',
    client: '늘봄속기사무소',
    title: '회의 녹취 2시간 분량 타이핑',
    tags: ['초보 가능', '당일 지급', '재택'],
    badge: '급구',
  },
  {
    id: 'design-mulbit',
    activityId: 'gig-design',
    client: '물빛공방',
    title: '상세페이지 1종 디자인',
    tags: ['어도비 필요', '시안 2회', '재택'],
  },
  {
    id: 'design-hanbam',
    activityId: 'gig-design',
    client: '한밤물류',
    title: '사내 안내 포스터 리뉴얼',
    tags: ['어도비 필요', '인쇄용', '장기 가능'],
    badge: '인기',
  },
  {
    id: 'ai-cheongram',
    activityId: 'gig-ai',
    client: '청람데이터랩',
    title: '문서 자동 분류 스크립트',
    tags: ['수료증 필요', '요구사항 변경 잦음'],
  },
  {
    id: 'brand-seohan',
    activityId: 'gig-brand',
    client: '서한리 로컬브랜드',
    title: '작은 가게 브랜딩 한 벌',
    tags: ['수료증 필요', '평판에 남음'],
  },
]

/** 화면 필터가 쓰는 목록. 컴포넌트가 activityId를 나열하지 않는다. */
export function gigsOf(activityId: string): Gig[] {
  return GIGS.filter((g) => g.activityId === activityId)
}

export function findGig(id: string): Gig | undefined {
  return GIGS.find((g) => g.id === id)
}
