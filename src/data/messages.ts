import { EDITOR_NAME } from './webtoon'
import type { IconName, Stats } from '../types/game'

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
   * 이 방이 목록에 나타나는 조건(스탯). **없으면 처음부터 있다.**
   *
   * ⚠️ **첫 판의 카톡 목록은 비어 있다**(설계자 지시). 아는 사람 방을 처음부터 깔아 두면
   * "혼자 시작해서 사람을 만들어 간다"는 이야기가 시작부터 완결돼 있다. 친화력이 오르면
   * 하나씩 연락이 닿는다 — 축을 하나(`sociability`)로 묶은 이유는 "사람과 어울리는 능력이
   * 늘면서 관계가 생긴다"가 한 문장으로 읽혀야 하기 때문이다.
   *
   * ⚠️ **오픈채팅에는 조건을 걸지 않는다.** 헬스장·미용실은 모르는 사람들의 방이고
   * 여기서 파는 서비스가 초반 선택지라, 잠그면 시작하자마자 갈 곳이 하나 줄어든다.
   *
   * 판정은 `systems/messages.ts`의 `threadVisible` 하나가 한다(화면이 자기 기준을
   * 만들면 목록과 알림이 갈린다).
   */
  requires?: Partial<Stats>
  /**
   * 재직 중이어야 나타나는가. 업무용 메신저(너아무튼온)가 이걸 쓴다 —
   * ⚠️ **회사가 없으면 업무 대화방도 없다**(설계자 지시: "기업 취직하면 시작됨").
   * 앱 아이콘 자체도 같은 조건으로 바탕화면에서 빠진다(`DesktopItem.requiresEmployment`).
   */
  requiresEmployment?: boolean
  /**
   * 웹툰을 **연재 중**이어야 나타나는가. 담당 편집자 방이 이걸 쓴다 —
   * ⚠️ 연재가 없으면 담당도 없다(`requiresEmployment`와 같은 결). 연재가 끝나면
   * 방도 사라진다: 해고된 뒤 팀장님 방이 사라지는 것과 같은 규칙이다.
   */
  requiresWebtoon?: boolean
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
  // 친화력 8 — 첫 친구. 가족(4)보다 뒤에 오는 것이 의도다(연락은 밖에서 안으로 온다).
  { id: 'minji', app: 'kakao', name: '민지', members: 1, requires: { sociability: 8 } },
  // 가장 먼저 닿는 방. 시작 친화력이 0이라 며칠은 아무 방도 없다.
  { id: 'family', app: 'kakao', name: '가족', members: 4, requires: { sociability: 4 } },
  // 모임에 나가야 생기는 방(동아리 모임 활동이 친화력 6을 준다).
  { id: 'club', app: 'kakao', name: '동아리 사람들', members: 11, requires: { sociability: 16 } },
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
  {
    /*
     * 두 번째 오픈채팅. ⚠️ **헬스장 방과 같은 판을 일부러 되풀이한다** — 선택지 둘의
     * 뜻(1회 / 정기권)과 동작(활동 실행 / 아이템 주문 + 주간 예약)이 같아야
     * "오픈채팅에서 파는 것"이 한 가지 규칙으로 읽힌다.
     *
     * ⚠️ 주간 예약 요일이 헬스장(목)과 다르다. 같은 요일에 걸면 두 정기권을 함께 끊은
     * 사람의 예약이 매주 같은 슬롯에서 부딪혀 한쪽이 조용히 밀려난다.
     */
    id: 'salon',
    app: 'kakao',
    name: '미용실 오픈채팅',
    members: 64,
    open: true,
    offer: {
      question: '예약 도와드릴까요?',
      options: [
        {
          id: 'salon-once',
          label: '이번 한 번만요',
          desc: '커트+드라이 25,000원 · 1턴 소모',
          activityId: 'salon-visit',
        },
        {
          id: 'salon-regular',
          label: '정기권 끊을게요',
          desc: '정기권 150,000원 · 카드는 내일 도착 · 매주 토요일 오후 자동 예약',
          // ⚠️ 금액을 여기 적지 않는다(헬스장과 같은 규칙). 이 선택지는 쇼핑의
          // '미용실 정기권'과 **같은 물건**을 주문하는 것이고, 그 카드가 있어야
          // salon-member 활동이 열린다.
          itemId: 'salon-pass',
          // 6 = 토요일(0=일). 헬스장은 목요일이라 서로 안 겹친다.
          weekly: { weekday: 6, weeks: 4, activityId: 'salon-member' },
        },
        {
          /*
           * ⚠️ **매력 A에서만 보인다**(`data/rankEvents.ts`의 `salon-model`). 조건을 여기
           * 적지 않는 것이 규칙이다 — 문턱은 랭크 이벤트 한 곳이고 화면은 그 기록을
           * 물어본다(`offerUnlockedByRank`). 새 방을 만들지 않은 이유는 그쪽 주석에 있다.
           */
          id: 'salon-model',
          label: '모델요? 해볼게요',
          desc: '홍보 사진 촬영 · 70,000원 · 1턴 소모',
          activityId: 'model-shoot',
        },
      ],
    },
  },
  {
    /*
     * 세 번째 오픈채팅. ⚠️ **조건이 스탯 절대값이 아니라 등급이다** — 운동 C에 닿으면
     * 랭크 이벤트가 이 방을 연다(`data/rankEvents.ts`). 그래서 여기 `requires`가 없다:
     * 문턱을 양쪽에 적으면 한쪽만 고쳐도 아무 테스트가 안 터진다(관계는 이벤트 → 방
     * 한 방향이고, 판정은 `threadVisible`이 `threadUnlockedByRank`에게 물어본다).
     *
     * ⚠️ **헬스장·미용실과 달리 파는 것이 없다.** 회비도 카드도 없고 선택지가 하나뿐인
     * 것이 이 방의 성격이다 — 돈이 아니라 **매주 3턴**을 내는 제안이다.
     * ⚠️ 예약 요일이 목(헬스장)·토(미용실)와 겹치지 않게 수요일이다. 겹치면 정기권을 함께
     * 끊은 사람의 예약이 같은 슬롯에서 부딪혀 한쪽이 조용히 밀려난다.
     */
    id: 'running-crew',
    app: 'kakao',
    name: '늘봄강 러닝크루',
    members: 42,
    open: true,
    offer: {
      question: '요즘 자주 뛰시는 것 같은데, 저희랑 같이 뛰실래요?',
      options: [
        {
          id: 'crew-join',
          label: '같이 뛸게요',
          desc: '회비 없음 · 매주 수요일 오후에 러닝이 자동 예약됩니다 (4주)',
          // 3 = 수요일(0=일). 활동은 기존 러닝을 그대로 쓴다 — 크루 전용 활동을 만들면
          // 같은 성격의 활동이 둘이 되고 번아웃 키가 갈린다.
          weekly: { weekday: 3, weeks: 4, activityId: 'running' },
        },
      ],
    },
  },
  {
    /*
     * 게임 C가 여는 방(`data/rankEvents.ts`의 `raid-party`). **1:1 지인 방이 아니라
     * 길드 단톡이다** — 같이 하자는 말은 아는 사람이 아니라 같이 하던 사람에게서 온다.
     * ⚠️ 예약 요일이 목(헬스장)·토(미용실)·수(러닝크루)와 겹치지 않게 **화요일**이다.
     */
    id: 'raid-party',
    app: 'kakao',
    name: '고정팟',
    members: 6,
    offer: {
      question: '자리 하나 비는데 들어오실래요?',
      options: [
        {
          id: 'raid-join',
          label: '들어갈게요',
          desc: '회비 없음 · 매주 화요일 오후에 레이드가 자동 예약됩니다 (4주)',
          weekly: { weekday: 2, weeks: 4, activityId: 'raid' },
        },
      ],
    },
  },
  {
    /*
     * 친화력 C(=100)가 여는 방. **오픈카톡이다** — 아는 사람이 아니라 같은 골목에 사는
     * 사람들이다. ⚠️ **주간 예약이 없다** — 집들이는 부를 때 가는 일이고, 주간 예약 요일은
     * 월·화·수·목·금·토가 이미 찼다(일요일 하나를 여기서 태우면 다음 축이 쓸 자리가 없다).
     */
    id: 'neighbors',
    app: 'kakao',
    name: '늘봄빌라 이웃 오픈채팅',
    members: 17,
    open: true,
    offer: {
      question: '이번 주말에 3층에서 집들이 하는데 오실래요?',
      options: [
        {
          id: 'neighbors-visit',
          label: '갈게요',
          desc: '손 선물 20,000원 · 1턴 소모',
          activityId: 'housewarming',
        },
      ],
    },
  },
  {
    /*
     * 경제 B(=300)가 여는 방. ⚠️ **주간 예약이 없다**(위와 같은 이유). 발표를 맡는 것이
     * 곧 실행이라 남길 상태도 없다.
     */
    id: 'invest-club',
    app: 'kakao',
    name: '월요일 투자 스터디',
    members: 9,
    open: true,
    offer: {
      question: '다음 주 발표 한 번 맡아 주실 수 있어요?',
      options: [
        {
          id: 'invest-talk',
          label: '해 볼게요',
          desc: '회비 없음 · 1턴 소모',
          activityId: 'study-talk',
        },
      ],
    },
  },
  {
    /*
     * 음악 A(=500)가 여는 방(`data/rankEvents.ts`의 `band-recruit`). **1:1 영입 제안이다** —
     * 그만큼 갔으면 모르는 사람이 아니라 들어 본 사람이 부른다.
     * ⚠️ 예약 요일은 **금요일**(월·화·수·목·토가 이미 찼다 — 겹치면 두 예약이 같은 슬롯에서
     *    부딪혀 하나가 조용히 실행되지 않는다).
     */
    id: 'band-recruit',
    app: 'kakao',
    name: '건반 치는 재훈',
    members: 1,
    offer: {
      question: '합주실 잡아 뒀는데, 우리 밴드 들어올래?',
      options: [
        {
          id: 'band-join',
          label: '들어갈게',
          desc: '회비 없음 · 매주 금요일 오후에 합주가 자동 예약됩니다 (4주)',
          weekly: { weekday: 5, weeks: 4, activityId: 'band-practice' },
        },
      ],
    },
  },
  {
    /*
     * 어휘력 C가 여는 방. **오픈카톡이다**(설계자 지시) — 모르는 사람들의 방이다.
     * ⚠️ 예약 요일은 **월요일**(다른 넷과 안 겹친다).
     */
    id: 'book-club',
    app: 'kakao',
    name: '수요일의 책 오픈채팅',
    members: 23,
    open: true,
    offer: {
      question: '이번 주 책 같이 읽으실래요?',
      options: [
        {
          id: 'bookclub-join',
          label: '참여할게요',
          desc: '회비 없음 · 매주 월요일 오후에 독서모임이 자동 예약됩니다 (4주)',
          weekly: { weekday: 1, weeks: 4, activityId: 'bookclub' },
        },
      ],
    },
  },
  {
    /*
     * 지식 A가 여는 방. ⚠️ **주간 예약이 없다** — 특강은 정기권을 끊는 일이 아니라
     * 부를 때 가는 일이고, 매주 자동으로 잡히면 다섯 번째 주간 예약이 되어 요일이 동난다.
     */
    id: 'academy',
    app: 'kakao',
    name: '한빛학원 실장',
    members: 1,
    offer: {
      question: '이번 주 특강 맡아 주실 수 있을까요?',
      options: [
        {
          id: 'academy-lecture',
          label: '하겠습니다',
          desc: '강의료 130,000원 · 1턴 소모',
          activityId: 'lecture',
        },
      ],
    },
  },
  /*
   * ── 생활 등급이 여는 방 2개 (2026-08-14) ───────────────────────
   *
   * ⚠️ **스탯 하나가 아니라 15종의 평균이 연다**(`systems/lifeRank.ts`). 아래 S 방들이
   * "한 우물을 깊게 판 사람"의 자리라면 여기는 **"두루 올린 사람"**의 자리다 — 둘이
   * 같으면 생활 등급이 화면에 숫자만 띄우고 아무것도 안 여는 장식으로 남는다.
   *
   * ⚠️ **일감이 아니라 사람이 온다.** 특화의 보상은 돈(고수익 일감)이고 두루 올린 것의
   * 보상은 **다른 종류**여야 축이 갈린다 — 그래서 이쪽은 배우는 자리·묻는 자리다.
   */
  {
    id: 'mentor-circle',
    app: 'kakao',
    name: '건너건너 모임',
    members: 9,
    open: true,
    offer: {
      question: '이번 주에도 한 명 모셔 왔어요. 오실래요?',
      options: [
        {
          id: 'mentor-meet',
          label: '가겠습니다',
          desc: '참가비 20,000원 · 1턴 소모',
          activityId: 'mentor-meet',
        },
      ],
    },
  },
  {
    id: 'column-desk',
    app: 'kakao',
    name: '월간 물음표 편집자',
    members: 1,
    offer: {
      question: '이번 호 칼럼, 살아온 이야기로 한 편 부탁드려요.',
      options: [
        {
          id: 'column-write',
          label: '써 보겠습니다',
          desc: '원고료 260,000원 · 1턴 소모',
          activityId: 'column-write',
        },
      ],
    },
  },
  /*
   * ── S 등급이 여는 방 5개 (2026-08-14) ───────────────────────────
   *
   * 학원(지식 A)·해온소프트(IT B)와 **같은 형태**다: 1:1 방 + 제안 하나 + 주간 예약 없음.
   * 다른 것은 문턱뿐이고, 그래서 새 구조를 만들지 않는다.
   *
   * ⚠️ **`requires`를 걸지 않는다.** 이 방들은 스탯 절대값이 아니라 **랭크 이벤트**가
   * 연다(`data/rankEvents.ts`) — 여기에 절대값을 또 적으면 같은 문턱이 두 곳에 생기고
   * 상한이 바뀌는 순간 한쪽만 낡는다(`RankEvent` 주석의 규칙 그대로).
   */
  {
    id: 'univ-office',
    app: 'kakao',
    name: '한국대 교무처',
    members: 1,
    offer: {
      question: '이번 학기 초빙 강의 맡아 주실 수 있을까요?',
      options: [
        {
          id: 'univ-lecture-take',
          label: '맡겠습니다',
          desc: '강의료 380,000원 · 1턴 소모',
          activityId: 'univ-lecture',
        },
      ],
    },
  },
  {
    id: 'gallery',
    app: 'kakao',
    name: '연희동 갤러리 관장',
    members: 1,
    offer: {
      question: '이번 봄에 개인전 한번 하시죠. 벽은 비워 뒀습니다.',
      options: [
        {
          id: 'solo-exhibit-take',
          label: '하겠습니다',
          desc: '작가료 450,000원 · 1턴 소모',
          activityId: 'solo-exhibit',
        },
      ],
    },
  },
  {
    id: 'sw-client',
    app: 'kakao',
    name: '두손테크 발주 담당',
    members: 1,
    offer: {
      question: '이번 건은 처음부터 만들어 주셔야 합니다. 가능하실까요?',
      options: [
        {
          id: 'sw-contract-take',
          label: '견적 보내겠습니다',
          desc: '개발비 520,000원 · 1턴 소모',
          activityId: 'sw-contract',
        },
      ],
    },
  },
  {
    id: 'ost-studio',
    app: 'kakao',
    name: '스튜디오 온음 PD',
    members: 1,
    offer: {
      question: '이번 작품 OST 한 곡 부탁드려도 될까요?',
      options: [
        {
          id: 'ost-work-take',
          label: '해보겠습니다',
          desc: '작업비 400,000원 · 1턴 소모',
          activityId: 'ost-work',
        },
      ],
    },
  },
  {
    id: 'fund-client',
    app: 'kakao',
    name: '한올자산운용 팀장',
    members: 1,
    offer: {
      question: '이번 분기 자문 계약 이야기를 나누고 싶습니다.',
      options: [
        {
          id: 'fund-advice-take',
          label: '뵙겠습니다',
          desc: '자문료 480,000원 · 1턴 소모',
          activityId: 'fund-advice',
        },
      ],
    },
  },
  {
    /*
     * IT B가 여는 방. ⚠️ **주간 예약이 없다**(학원과 같은 이유) — 유지보수는 정기권이
     * 아니라 부를 때 가는 일이고, 매주 자동으로 잡히면 요일이 동난다.
     */
    id: 'devcrew',
    app: 'kakao',
    name: '해온소프트 김실장',
    members: 1,
    offer: {
      question: '이번 건도 좀 봐 주실 수 있을까요?',
      options: [
        {
          id: 'devcrew-maint',
          label: '보내 주세요',
          desc: '90,000원 · 1턴 소모',
          activityId: 'maintenance',
        },
      ],
    },
  },
  /* ⚠️ **카톡이지 너아무튼온이 아니다**(설계자 지시). 연재처는 다니는 회사가 아니라
     외부 거래처라 사내 메신저에 자리가 없다 — 담당자는 개인 메신저로 연락한다. */
  { id: 'webtoon-editor', app: 'kakao', name: EDITOR_NAME, members: 1, requiresWebtoon: true },
  { id: 'boss', app: 'nateon', name: '팀장님', members: 1, requiresEmployment: true },
  { id: 'devteam', app: 'nateon', name: '개발 2팀', members: 7, requiresEmployment: true },
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
 *
 * ## ⚠️ **편성표는 플레이어가 한 일을 단정하지 않는다**
 * 여기 있는 메시지는 **누구에게나 같은 턴에 도착한다.** 그래서 "지원해 주신 공고"처럼
 * 플레이어의 선택에 달린 사실을 말하면, 아무 데도 지원하지 않은 사람에게 거짓말이 된다
 * (2026-08-08 설계자 신고 — 실제로 1일차 오후에 그 메일이 왔다).
 *
 * 상태에 달린 소식은 **전부 파생 메시지의 몫이다**: 정규직 절차는 `systems/employment.ts`,
 * 주말 호출은 `drive.ts`, 연재 평가는 `webtoon.ts`, 랭크 권유는 `rankEvents.ts`가 만든다.
 * ⚠️ **채팅방은 방 자체에 조건을 걸 수 있지만**(`requiresEmployment` — 팀장님·개발 2팀이
 * 그래서 안전하다) **사서함('outlook')에는 그런 게이트가 없다**(`channelVisible`이 방이
 * 아닌 채널은 늘 통과시킨다). 편성표 메일은 그래서 **언제나 참인 것만** 적는다.
 * `messages.test.ts`가 정규직 절차 어휘로 이 규칙을 지킨다.
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
      subject: '오늘 올라온 동네 알바 12건',
      text: '설정하신 지역의 새 공고를 모아 보내 드립니다. 편의점·카페 야간 시급이 지난주보다 올랐습니다. 지원은 알바몬에서 바로 하실 수 있습니다.',
    },
    { id: 'f1', channel: 'family', from: '엄마', text: '밥은 먹고 다니냐' },
  ],
  // 턴 2
  [
    { id: 'n1', channel: 'boss', from: '팀장님', text: '주간 보고서 초안 언제쯤 볼 수 있을까요?' },
    {
      id: 's1',
      channel: 'salon',
      from: '디자이너 유진',
      text: '이번 주 예약 몇 자리 남았어요! 정기권 하시면 드라이는 그냥 해 드립니다',
    },
  ],
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
    {
      id: 's2',
      channel: 'salon',
      from: '디자이너 유진',
      text: '머리 기르는 중이시면 3주쯤 뒤에 다듬는 게 제일 예뻐요',
    },
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
