import type { IconName } from '../types/game'

/**
 * 메신저 앱. 앱 하나가 **채팅방 여러 개**를 담는다(레퍼런스: 카톡 PC).
 * 아웃룩은 채팅이 아니라 사서함이므로 여기 들어오지 않는다.
 */
export type ChatAppId = 'kakao' | 'nateon'

export interface ChatApp {
  id: ChatAppId
  label: string
  icon: IconName
  /**
   * 창 색조. 두 메신저가 형태는 같고 성격이 다르므로(사적 대화 vs 업무) 색으로 가른다 —
   * 레퍼런스도 카톡은 노란 계열, 네이트온은 파란 계열이다.
   * CSS가 `.chat-tone-<값>`으로 받는다.
   */
  tone: 'warm' | 'work'
  /**
   * 목록 창의 **골격**. 색조(tone)와 달리 배치 자체가 다르다 —
   * 두 레퍼런스가 실제로 다른 앱이라 헤더 구성부터 갈린다.
   *  - `titled`: 큰 제목("채팅 ▾") + 필터 칩 줄. 프로필은 둥근 사각. (카톡)
   *  - `plain` : 제목·칩 없이 도구 글리프 줄만. 프로필은 원형. (네이트온)
   */
  layout: 'titled' | 'plain'
}

/**
 * ⚠️ 실존 서비스 이름을 쓰지 않는다 — 배너·사이트와 같은 이유다.
 * 카카오톡/네이트온은 형태만 빌리고 이름은 지어낸다(너아무튼온은 설계자가 지정).
 */
export const CHAT_APPS: ChatApp[] = [
  { id: 'kakao', label: '카톡', icon: 'fluent-color:chat-24', tone: 'warm', layout: 'titled' },
  {
    id: 'nateon',
    label: '너아무튼온',
    icon: 'fluent-color:people-chat-24',
    tone: 'work',
    layout: 'plain',
  },
]

/** 채팅방 하나. 목록 창에 한 줄로 뜨고, 누르면 대화창이 열린다. */
export interface Thread {
  id: string
  app: ChatAppId
  /** 방 이름. 1:1이면 상대 이름, 단톡이면 방 제목. */
  name: string
  /** 참여 인원. 1이면 1:1이라 인원수를 표시하지 않는다. */
  members: number
  /** true면 오픈채팅. 목록에서 라벨이 붙고, 모르는 사람들의 방이라는 뜻이다. */
  open?: boolean
  /**
   * 대화창 아래에 뜨는 **제안**. 있으면 [만나러 가기] 대신 이 선택지들이 나온다.
   *
   * 데이터로 두는 이유는 활동 효과와 같다 — 컴포넌트에 금액·활동 id를 적으면
   * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
   */
  offer?: {
    question: string
    options: OfferOption[]
  }
}

/** 제안의 선택지 하나. 셋 중 하나의 방식으로 게임에 작용한다. */
export interface OfferOption {
  id: string
  label: string
  desc: string
  /** 즉시 실행할 활동 id. 1턴을 쓴다. */
  activityId?: string
  /** 즉시 빠져나갈 금액. 턴은 쓰지 않는다(등록·결제). */
  cost?: number
  /**
   * 이 제안이 실제로는 **물건을 주문하는 것**일 때의 아이템 id(`data/items.ts`).
   *
   * `cost`와 함께 쓰지 않는다 — 가격도 도착일도 아이템 정의가 갖고 있으므로
   * 여기 금액을 또 적으면 두 값이 어긋난다. 주문·배송은 기존 흐름을 그대로 탄다
   * (`systems/delivery.ts`: 다음 날 도착 → 인벤토리). 이미 가진 물건이면 결제 없이
   * 나머지(주간 예약)만 처리한다.
   */
  itemId?: string
  /** 결제 뒤 매주 같은 요일에 걸 예약(0=일 … 4=목). */
  weekly?: { weekday: number; weeks: number; activityId: string }
}

export const THREADS: Thread[] = [
  { id: 'minji', app: 'kakao', name: '민지', members: 1 },
  { id: 'family', app: 'kakao', name: '가족', members: 4 },
  { id: 'club', app: 'kakao', name: '동아리 사람들', members: 11 },
  {
    /*
     * 오픈채팅. 1:1 지인 방과 달리 **모르는 사람들의 방**이고, 여기서 서비스를 판다.
     * 헬스장이 첫 사례다 — 대화창 아래 제안(offer)이 붙는 유일한 방 형태다.
     */
    id: 'gym',
    app: 'kakao',
    name: '헬스장 오픈채팅',
    members: 128,
    open: true,
    offer: {
      question: '어떻게 하시겠어요 회원님?',
      options: [
        {
          id: 'gym-once',
          label: '하루만 갈게요',
          desc: '1일권 15,000원 · 1턴 소모',
          activityId: 'gym-day',
        },
        {
          id: 'gym-month',
          label: '한 달 끊을게요',
          desc: '회원권 90,000원 · 카드는 내일 도착 · 매주 목요일 오후 자동 등록',
          // ⚠️ 금액을 여기 적지 않는다. 이 선택지는 쇼핑의 '헬스장 회원권'과 **같은 물건**을
          // 주문하는 것이고, 그 카드가 있어야 gym-member 활동이 열린다.
          // 잠금 해제 경로를 둘로 나누면 한쪽만 고쳐 놓고 다른 쪽이 새는 사고가 난다.
          itemId: 'gym-pass',
          // 4 = 목요일(0=일). 4주치를 건다.
          weekly: { weekday: 4, weeks: 4, activityId: 'gym-member' },
        },
      ],
    },
  },
  { id: 'boss', app: 'nateon', name: '팀장님', members: 1 },
  { id: 'devteam', app: 'nateon', name: '개발 2팀', members: 7 },
]

/** 메일 사서함. 채팅이 아니므로 앱 목록과 따로 둔다. */
export const MAILBOX = {
  id: 'outlook',
  label: '아웃룩',
  icon: 'fluent-color:mail-24' as IconName,
}

export function findChatApp(id: string): ChatApp | undefined {
  return CHAT_APPS.find((a) => a.id === id)
}

export function findThread(id: string): Thread | undefined {
  return THREADS.find((t) => t.id === id)
}

/** 이 앱에 속한 채팅방. 컴포넌트가 id를 나열하지 않는다. */
export function threadsOf(app: ChatAppId): Thread[] {
  return THREADS.filter((t) => t.app === app)
}

export interface Message {
  id: string
  /** 채팅방 id, 또는 메일이면 'outlook'. */
  channel: string
  from: string
  /** 메일에만 있는 제목. 채팅은 본문만 있다. */
  subject?: string
  text: string
}

/**
 * 턴별 도착 편성표.
 *
 * **인덱스 = 턴 번호**(1일차 오전이 0, 오후가 1, 2일차 오전이 2 …)이고,
 * 배열 끝에 닿으면 처음으로 돌아간다 — 게임에 날짜 제한이 없으므로 유한한 대본으로는
 * 언젠가 바닥난다. 순환시키면 "세상이 계속 돌아간다"가 유지되면서도 **결정적**이다:
 * 같은 턴에는 늘 같은 메시지가 온다(뉴스와 같은 규칙, `Math.random` 금지).
 *
 * 빈 배열인 턴이 있는 게 중요하다 — 매 턴 알림이 뜨면 알림이 소음이 된다.
 */
export const MESSAGE_SCHEDULE: Message[][] = [
  // 턴 0 — 1일차 오전
  [
    { id: 'k1', channel: 'minji', from: '민지', text: '야 오늘 뭐해? 나 오랜만에 시간 남는데' },
    {
      id: 'g1',
      channel: 'gym',
      from: '헬스장 관리자',
      text: '안녕하세요! 이번 달 등록하시면 첫 주 PT 1회 무료로 드립니다',
    },
  ],
  // 턴 1 — 1일차 오후
  [
    {
      id: 'o1',
      channel: 'outlook',
      from: '알바몬',
      subject: '지원하신 공고의 서류 결과 안내',
      text: '안녕하세요. 지원해 주신 편의점 야간 근무 건, 면접 일정을 조율하고자 연락드립니다.',
    },
    { id: 'f1', channel: 'family', from: '엄마', text: '밥은 먹고 다니냐' },
  ],
  // 턴 2
  [{ id: 'n1', channel: 'boss', from: '팀장님', text: '주간 보고서 초안 언제쯤 볼 수 있을까요?' }],
  // 턴 3 — 조용한 턴
  [],
  // 턴 4
  [
    { id: 'k2', channel: 'minji', from: '민지', text: '너 요즘 연락이 없다 ㅠㅠ 바빠?' },
    { id: 'c1', channel: 'club', from: '정주', text: 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ' },
    {
      id: 'o2',
      channel: 'outlook',
      from: '네이놈 고객센터',
      subject: '[광고] 이번 주 반값 쿠폰이 도착했습니다',
      text: '첫 구매 고객 대상 최대 5천원 할인. 수신 거부는 하단 링크를 이용해 주세요.',
    },
  ],
  // 턴 5
  [
    { id: 'n2', channel: 'boss', from: '팀장님', text: '내일 오전에 짧게 회의만 하시죠. 30분이면 됩니다.' },
    { id: 'd1', channel: 'devteam', from: '이 대리', text: '배포 나갔습니다. 확인 부탁드려요' },
  ],
  // 턴 6 — 조용한 턴
  [],
  // 턴 7
  [
    { id: 'k3', channel: 'minji', from: '민지', text: '주말에 밥이나 먹자. 내가 살게' },
    { id: 'f2', channel: 'family', from: '엄마', text: '1층 약국에 있다' },
    {
      id: 'o3',
      channel: 'outlook',
      from: '관리사무소',
      subject: '월세 납부 안내',
      text: '이번 달 관리비와 월세 납부 기한이 다가옵니다. 잔액을 확인해 주세요.',
    },
  ],
]

/** 대화창에 한 번에 보여 줄 최대 메시지 수. 너무 길면 스크롤만 길어진다. */
export const THREAD_LIMIT = 30
