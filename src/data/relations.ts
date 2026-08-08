/**
 * 관계 — 누구를 얼마나 만났는가, 그리고 그 끝에 붙는 **부가엔딩**.
 *
 * ## ⚠️ 관계엔딩은 독립 엔딩이 아니다 (설계자 지시)
 * **본엔딩의 부가엔딩이다.** `ENDINGS`에 넣지 않는 이유가 규칙 전부다:
 * 넣으면 "엔딩 15개 중 n개"가 관계를 세기 시작하고, 파산 엔딩과 민지 엔딩이 **같은 층에
 * 놓여 서로 배타가 된다**. 실제로는 어떻게 끝났든(파산이든 철인이든) 그 곁에 누가 있었는지가
 * 따로 있다 — 그래서 본엔딩 문단 **아래에 한 문단**으로 얹히고, 도감도 별도 시트로 센다.
 *
 * ## ⚠️ 부가엔딩은 하나만 붙는다
 * 임계를 넘긴 사람이 여럿이면 **가장 높은 한 사람**만 나온다(`systems/affection.ts`).
 * 셋을 다 붙이면 엔딩 화면이 명단이 되고, "그 곁에 누가 있었는가"라는 질문의 답이
 * 흐려진다. 나머지는 도감이 기억한다.
 *
 * ## 관계는 인물 → 스레드·활동 한 방향으로만 적는다
 * ⚠️ `data/messages.ts`의 `Thread`에 인물 필드를 달지 않는다. 대화방은 이미 자기 이름을
 * 갖고 있고, "이 방에서 누구를 만나러 갈 수 있는가"는 **관계가 가진 사실**이다. 양쪽에
 * 적으면 한쪽만 고쳐도 아무 테스트가 안 터진다(콜센터·드라이브가 `careerId`를 갖는 것과
 * 같은 규칙).
 *
 * ⚠️ **실존 인물 이름 금지.**
 */

export interface Person {
  id: string
  name: string
  /** 이 사람의 대화방(`data/messages.ts`의 `Thread.id`). 여기서 [만나러 가기]가 뜬다. */
  threadId: string
  /**
   * 만나는 활동(`data/activities.ts`). **이 활동을 실행하면 호감도가 오른다** —
   * 통로가 대화방이든 스케줄러든 사이트든 같다(동아리에 나가면 동아리 사람들과 친해지는
   * 것이 맞고, 판정을 대화방에만 걸면 예약으로 나간 모임이 관계를 안 만든다).
   *
   * ⚠️ **활동을 인물 전용으로 만들지 않았다**: 동아리는 기존 `club`을, 민지는 기존
   * `social`을 그대로 쓴다. 인물마다 활동을 새로 파면 같은 성격의 활동이 셋으로 늘고
   * 번아웃 키·밸런스가 인물 수만큼 갈린다.
   */
  activityId: string
  /** 부가엔딩 제목. 본엔딩 제목과 겹치지 않게 짧은 구절로 둔다. */
  endingTitle: string
  /**
   * 부가엔딩 본문. ⚠️ **본엔딩이 무엇이든 성립하는 문장이어야 한다** — 부가엔딩은
   * 파산·철인·대기업 사원 어느 것에도 붙으므로 "성공했다/실패했다"를 말할 수 없다.
   * 말할 수 있는 것은 **그 사람이 곁에 있었다는 사실** 하나다.
   */
  endingText: string
  /** 도감 관계 시트의 아이콘. ⚠️ 서로 겹치지 않는다(줄을 구분하는 것이 아이콘이다). */
  icon: string
}

/** 한 번 만날 때 오르는 호감도. */
export const AFFECTION_PER_MEET = 8

/** 호감도 상한. */
export const AFFECTION_CAP = 100

/**
 * 부가엔딩이 붙는 문턱.
 *
 * ⚠️ `AFFECTION_PER_MEET`로 나눈 값이 곧 **필요한 만남 횟수**다(60 ÷ 8 = 8회 = 8턴).
 * 세 사람을 다 채우려면 24턴이라 "누구를 만날지"가 실제 선택이 된다 — 문턱을 낮추면
 * 아무 선택 없이 셋 다 열리고, 높이면 한 명도 못 채운 채 판이 끝난다
 * (`affection.test.ts`가 판 길이와 견줘 지킨다).
 */
export const AFFECTION_FOR_ENDING = 60

/**
 * 호감도가 쌓이는 사람.
 *
 * ⚠️ **오픈채팅(헬스장·미용실)은 넣지 않는다** — 모르는 사람들의 방이고 거기서 파는 것은
 * 서비스다. ⚠️ **팀장님·담당 편집자도 넣지 않는다**: 조건부로 생기고 사라지는 방이라
 * (`requiresEmployment`·`requiresWebtoon`) 해고되거나 연재가 끝나면 쌓아 둔 관계가
 * 갈 곳이 없어진다. 관계는 판 전체에 걸쳐 있어야 부가엔딩이 될 자격이 있다.
 */
export const PEOPLE: Person[] = [
  {
    id: 'minji',
    name: '민지',
    threadId: 'minji',
    activityId: 'social',
    endingTitle: '그래도 민지는 남았다',
    endingText:
      '무슨 일이 있어도 민지는 이틀에 한 번씩 아무 말이나 보내 왔다. 대단한 위로는 아니었지만, 답장할 사람이 있다는 것은 대단한 일이었다.',
    icon: 'fluent-color:person-heart-24',
  },
  {
    id: 'family',
    name: '가족',
    threadId: 'family',
    activityId: 'family-visit',
    endingTitle: '밥은 먹고 다니냐',
    endingText:
      '본가에 갈 때마다 반찬통이 늘었고 돌아올 때마다 무거웠다. 끝내 아무것도 되지 못했어도 그 집에서는 여전히 밥을 먹고 다니냐고 물었다.',
    icon: 'fluent-color:people-home-24',
  },
  {
    id: 'club',
    name: '동아리 사람들',
    threadId: 'club',
    activityId: 'club',
    endingTitle: '이름을 외워 준 사람들',
    endingText:
      '회비를 내고 앉아 있기만 한 날도 많았다. 그래도 마지막에는 방에 들어서면 이름을 부르는 사람이 여럿이었고, 그것이 회비값의 전부였다.',
    icon: 'fluent-color:people-community-24',
  },
]

export function findPerson(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id)
}

/** 그 대화방에서 만나러 갈 수 있는 사람. ⚠️ **ChatApp이 이 함수로 [만나러 가기]를 정한다.** */
export function personOfThread(threadId: string): Person | undefined {
  return PEOPLE.find((p) => p.threadId === threadId)
}

/** 그 활동이 누구를 만나는 일인가. 없으면 관계와 무관한 활동이다. */
export function personOfActivity(activityId: string): Person | undefined {
  return PEOPLE.find((p) => p.activityId === activityId)
}
