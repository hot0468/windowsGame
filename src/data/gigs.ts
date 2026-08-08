/**
 * 그몽 — 부업(외주) 일감.
 *
 * ## ⚠️ 알바몬 공고와 구조가 갈렸다(2026-08-08 재설계)
 * 예전에는 일감이 `activityId`로 활동을 **가리키기만** 했다(수치 없음). 이제는
 * **수주 → 기한 안에 업무량 채우기 → 납품**이라 일감마다 값이 다르고,
 * 채우는 행위는 **도구 앱 실행**이라는 별개의 활동이 한다.
 *
 * 그래서 **보수·업무량·기한은 일감이 갖는다** — `Career.salary`와 정확히 같은 방향이다:
 * 활동(도구 실행) 하나가 모든 일감을 대신 처리하므로, 활동에 금액을 두면 일감마다 다른
 * 보수를 표현할 수 없다. 반대로 **행동력·멘탈 소모는 도구 활동이 갖는다**(일감이 아니라
 * 도구가 정하는 값이다).
 *
 * ⚠️ **실존 상호 금지**(알바몬과 같은 규칙). 전부 지어낸 의뢰인이다.
 * ⚠️ `Math.random`·`Date` 금지 — 새로 고칠 때마다 목록이 바뀌면 결정성이 깨진다.
 */

/**
 * 일감을 처리하는 도구. 바탕화면 앱과 1:1이고, 그 앱을 켜는 활동이 업무량을 채운다.
 * ⚠️ **정의는 `types/game.ts`에 있고 여기서는 재수출만 한다** — `Activity.toolId`가
 * 같은 축을 써야 하는데 `types`가 `data`를 import하면 방향이 뒤집힌다.
 */
export type { ToolId } from '../types/game'
import type { ToolId } from '../types/game'

export interface Gig {
  id: string
  /** 지어낸 의뢰인. */
  client: string
  title: string
  /**
   * 이 일감을 채울 수 있는 도구. **하나뿐이다** — 아무 도구로나 채울 수 있으면
   * "무엇으로 하는 일인가"가 사라지고 도구가 셋일 이유도 없어진다.
   */
  tool: ToolId
  /** 채워야 할 업무량. **도구를 한 번 켤 때마다 1** 오른다(`WORK_PER_SESSION`). */
  workload: number
  /** 수주한 날로부터 며칠 안에 채워야 하는가. */
  days: number
  /** 납품하면 받는 보수(원). ⚠️ 물가 배율을 타지 않는다 — `systems/gigs.ts` 주석 참조. */
  pay: number
  /** 카드 아래 회색 칩. */
  tags: string[]
  /**
   * 받으려면 가져야 하는 물건(수료증). **도구 잠금과 다른 축이다** —
   * 도구는 구독이 열고(`Activity.requiresSubscription`), 이건 자격이 연다.
   */
  requiresItem?: string
  badge?: string
}

/**
 * 도구를 한 번 켜면 오르는 업무량. **1이다** — `workload`가 곧 "몇 번 켜야 하는가"라서
 * 화면에 숫자를 따로 설명할 필요가 없다(2/3처럼 그대로 읽힌다).
 */
export const WORK_PER_SESSION = 1

/**
 * 마감을 놓쳤을 때 깎이는 평판.
 *
 * ⚠️ **돈이 아니라 평판으로 받는다.** 위약금을 물리면 "받지 않는 것이 언제나 안전"이 되어
 * 일감이 선택지가 아니라 함정이 된다. 평판은 상한 100짜리 지표라 **회복이 느리고**,
 * 트위터 팔로워·너튜브 구독자가 거기서 파생되므로 손해가 조용하지 않다.
 */
export const MISS_REPUTATION_PENALTY = 3

export const GIGS: Gig[] = [
  {
    /*
     * ⚠️ **조건이 하나도 없는 유일한 일감이다**(알바몬의 편의점과 같은 자리).
     * VS 코드는 구독도 설치도 필요 없으므로 판을 시작하자마자 받을 수 있다 —
     * 여기까지 잠그면 그몽은 자격을 갖추기 전까지 통째로 닫힌 사이트가 된다.
     * 보수/턴이 가장 낮은 것이 그 값이다(65,000 — 편의점 60,000 바로 위).
     */
    id: 'web-nulbom',
    client: '늘봄속기사무소',
    title: '사무소 소개 페이지 한 장',
    tool: 'vscode',
    workload: 2,
    days: 4,
    pay: 130000,
    tags: ['초보 가능', 'VS 코드', '재택'],
    badge: '급구',
  },
  {
    id: 'detail-mulbit',
    client: '물빛공방',
    title: '상세페이지 1종 디자인',
    tool: 'photoshop',
    workload: 2,
    days: 4,
    pay: 145000,
    tags: ['포토샵', '시안 2회', '재택'],
  },
  {
    id: 'poster-hanbam',
    client: '한밤물류',
    title: '사내 안내 포스터 리뉴얼',
    tool: 'photoshop',
    workload: 3,
    days: 6,
    pay: 230000,
    tags: ['포토샵', '인쇄용', '장기 가능'],
    badge: '인기',
  },
  {
    id: 'promo-sizib',
    client: '시집이엔터',
    title: '30초 홍보 영상 편집',
    tool: 'premiere',
    workload: 3,
    days: 6,
    pay: 225000,
    tags: ['프리미어', '자막 포함', '납기 엄수'],
  },
  {
    id: 'script-cheongram',
    client: '청람데이터랩',
    title: '문서 자동 분류 스크립트',
    tool: 'vscode',
    workload: 3,
    days: 6,
    pay: 285000,
    tags: ['수료증 필요', 'VS 코드', '요구사항 변경 잦음'],
    requiresItem: 'cert-ai',
  },
  {
    id: 'brand-seohan',
    client: '서한리 로컬브랜드',
    title: '작은 가게 브랜딩 한 벌',
    tool: 'photoshop',
    workload: 4,
    days: 8,
    pay: 380000,
    tags: ['수료증 필요', '포토샵', '평판에 남음'],
    requiresItem: 'cert-brand',
  },
]

/**
 * 그 물건(수료증)이 열어 주는 일감. ⚠️ **관계를 물건 쪽에 다시 적지 않는다** —
 * `activitiesUnlockedBy`와 같은 방향으로 `Gig.requiresItem` 하나에서 뒤집어 찾는다.
 * (2026-08-08 재설계로 수료증이 여는 것이 **활동에서 일감으로** 옮겨 왔다.)
 */
export function gigsRequiring(itemId: string): Gig[] {
  return GIGS.filter((g) => g.requiresItem === itemId)
}

export function findGig(id: string): Gig | undefined {
  return GIGS.find((g) => g.id === id)
}

/** 그 도구로 처리하는 일감. 화면이 도구 id를 나열하지 않게 한다. */
export function gigsForTool(tool: ToolId): Gig[] {
  return GIGS.filter((g) => g.tool === tool)
}

/** 도구의 사람이 읽는 이름. ⚠️ 바탕화면 항목 이름과 같아야 안내가 참이 된다. */
export const TOOL_NAMES: Record<ToolId, string> = {
  photoshop: '포토샵',
  premiere: '프리미어',
  vscode: 'VS 코드',
}

/**
 * 도구를 켰을 때 화면에 흐르는 작업 단계. **연출이고 규칙이 아니다** —
 * 단계 수가 늘거나 줄어도 업무량·스탯·턴은 하나도 안 바뀐다(`WORK_PER_SESSION`이 정한다).
 *
 * ⚠️ **여기 문구가 그 도구가 무슨 일을 하는지 말하는 유일한 자리다.** 세 도구가 같은
 * 껍데기(진행 막대·상태 줄)를 쓰므로, 문구가 같아지면 세 프로그램이 한 프로그램이 된다.
 * ⚠️ **단계 수는 셋 다 같게 유지한다** — 다르면 같은 1턴인데 어떤 도구는 더 오래 걸리는
 * 것처럼 보여 "빠른 도구"라는 없는 규칙을 만든다.
 */
export const TOOL_STEPS: Record<ToolId, string[]> = {
  photoshop: [
    '작업 파일을 여는 중',
    '레이어를 정리하는 중',
    '색을 보정하는 중',
    '내보내기 파일을 쓰는 중',
  ],
  premiere: [
    '시퀀스를 여는 중',
    '클립을 이어 붙이는 중',
    '자막과 효과를 얹는 중',
    '영상을 렌더링하는 중',
  ],
  vscode: [
    '작업 폴더를 여는 중',
    '코드를 고치는 중',
    '테스트를 돌리는 중',
    '변경 사항을 커밋하는 중',
  ],
}
