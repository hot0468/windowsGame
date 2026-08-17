import type { IconName } from '../types/game'

/**
 * 이벤트 도감에 실리는 사건.
 *
 * **엔딩 도감(`metaStore`)과는 다른 것이다.** 엔딩은 판을 끝낸 결과라 판을 넘어
 * 영구 보존되지만, 여기 실리는 건 **이번 판에서 실제로 겪은 일**이라 세이브에 들어간다
 * (`GameState.events`).
 *
 * ⚠️ 지금은 항목이 다섯 개뿐이다. 랜덤 이벤트 시스템이 생기면 **여기에 정의를 늘리고
 * 발생 지점에서 `recordEvent`를 부르기만** 하면 되도록 골격을 먼저 세워 둔 것이다 —
 * 도감 화면은 정의 목록을 그대로 그리므로 화면 코드는 다시 고칠 필요가 없다.
 */
export interface GameEvent {
  id: string
  name: string
  /**
   * 아직 겪지 않았을 때 보여 줄 힌트.
   * ⚠️ **지금은 읽는 곳이 없다**(2026-08-17, 사진첩이 겪은 것만 싣게 됐다). 안 채운 칸을
   * 다시 그리기로 하면 그때 쓸 자리라 남겨 둔다 — 35줄을 다시 쓰는 것이 더 비싸다.
   */
  hint: string
  /** 겪은 뒤에 보여 줄 기록. */
  desc: string
  icon: IconName
  /** 파일 탐색기의 확장자. 아이템과 같은 규칙이다. */
  ext: string
}

export const EVENTS: GameEvent[] = [
  {
    id: 'first-order',
    name: '첫 주문',
    hint: '인터넷으로 뭔가를 사 본다.',
    desc: '결제 버튼을 누르는 데 걸린 시간은 3초, 고민한 시간은 이틀.',
    icon: 'fluent-color:gift-24',
    ext: '.evt',
  },
  {
    id: 'first-delivery',
    name: '문 앞의 상자',
    hint: '주문한 물건이 도착한다.',
    desc: '초인종은 울리지 않았다. 문을 여니 상자가 혼자 서 있었다.',
    icon: 'fluent-color:toolbox-24',
    ext: '.evt',
  },
  {
    id: 'gym-member',
    name: '한 달 회원권',
    hint: '몸을 쓰는 일에 목돈을 낸다.',
    desc: '한 달을 끊었으니 이제 안 가면 손해다. 대부분 손해를 본다.',
    icon: 'fluent-color:heart-24',
    ext: '.evt',
  },
  {
    id: 'first-plan',
    name: '계획이라는 것',
    hint: '앞날의 한 칸을 미리 채워 둔다.',
    desc: '달력에 뭔가를 적어 넣은 날. 지킬지는 그날의 내가 정한다.',
    icon: 'fluent-color:calendar-clock-24',
    ext: '.evt',
  },
  {
    id: 'first-ad',
    name: '100원의 가치',
    hint: '광고를 눌러 본다.',
    desc: '배너 하나에 100원. 하루치 생활비를 채우려면 300번쯤 눌러야 한다.',
    icon: 'fluent-color:megaphone-loud-24',
    ext: '.evt',
  },
  {
    id: 'first-deposit',
    name: '맡겨 둔 돈',
    hint: '오늘 쓸 돈을 내일로 미뤄 둔다.',
    desc: '통장에 있는 돈은 오늘 밤 밥값이 되지 않는다. 그걸 알면서도 넣었다.',
    icon: 'fluent-color:savings-24',
    ext: '.evt',
  },
  {
    id: 'first-loan',
    name: '빌린 시간',
    hint: '없는 돈을 미리 당겨 쓴다.',
    desc: '통장에 찍힌 숫자는 늘었다. 갚아야 할 숫자는 그보다 빨리 늘어난다.',
    icon: 'fluent-color:coin-multiple-24',
    ext: '.evt',
  },
  {
    id: 'first-move',
    name: '짐을 싸는 날',
    hint: '살던 곳을 떠나 더 싼 곳으로 간다.',
    desc: '짐은 생각보다 적었다. 줄어드는 것은 방의 크기만이 아니었다.',
    icon: 'fluent-color:building-home-24',
    ext: '.evt',
  },
  {
    id: 'first-lottery',
    name: '만 원짜리 가능성',
    hint: '아주 낮은 확률에 돈을 건다.',
    desc: '긁기 전까지는 무엇이든 될 수 있었다. 긁고 나서는 아니었다.',
    icon: 'fluent-color:gift-card-24',
    ext: '.evt',
  },
  {
    /* ⚠️ 마감이 걸린 일을 받는 것은 이 게임에서 이것뿐이다 — 알바도 정규직도
       "오늘 하면 오늘 받는" 구조라 내일을 약속하지 않는다. */
    id: 'first-gig',
    name: '날짜를 약속하다',
    hint: '기한이 있는 일을 받는다.',
    desc: '받을 때는 넘치는 시간이었다. 드 바꿔 보니 아니었다.',
    icon: 'fluent-color:clipboard-text-edit-24',
    ext: '.evt',
  },
  {
    /* ⚠️ 이 게임의 **첫 지속 지출**이다 — 다른 사건은 전부 한 번 내고 끝나는 것이었다. */
    id: 'first-subscribe',
    name: '매달 나가는 것',
    hint: '한 번 결제하면 끝나지 않는 것을 시작한다.',
    desc: '가입은 3분이 걸렸다. 해지 버튼을 찾는 데는 그보다 오래 걸릴 것이다.',
    icon: 'fluent-color:calendar-clock-24',
    ext: '.evt',
  },
  {
    /* 복권과 나란히 읽히는 사건이다 — 둘 다 "돈으로 가능성을 사는" 자리이되,
       복권은 긁는 순간 끝나고 주식은 내일 아침에도 계속된다. */
    id: 'first-stock',
    name: '두 자리 숫자의 하루',
    hint: '가진 돈의 일부를 오르내리는 것에 맡긴다.',
    desc: '사고 나니 그 숫자가 하루 종일 눈에 밟혔다. 오른 날에도 그랬다.',
    icon: 'fluent-color:data-trending-24',
    ext: '.evt',
  },
  /* ── 랭크 단발 이벤트 5종 (2026-08-08) ────────────────────────────────
   * ⚠️ **문턱은 여기 없다** — `data/rankEvents.ts`가 어느 스탯 어느 등급인지 갖고,
   * 여기는 문구·아이콘만 갖는다(관계는 한 방향으로만 적는다).
   * ⚠️ `hint`는 **무엇을 하면 되는지**를 적되 수치는 안 적는다 — 등급 문턱을 두 곳에
   * 쓰면 한쪽이 낡는다.
   */
  /* ── 낮은 스탯의 대가 4종 (2026-08-09) ──────────────────────────────
   * ⚠️ **겪은 것을 나무라지 않는다.** 도감에 남는 글은 "네가 잘못했다"가 아니라 그날
   * 무슨 일이 있었는지다 — 벌점 통지서가 되면 도감을 열어 볼 이유가 사라진다.
   */
  {
    id: 'lost-wallet',
    name: '돌아오지 않은 지갑',
    hint: '지킬 것을 오래 안 지킨다.',
    desc: '카페 의자에 두고 온 지갑이 그대로 없어졌다. 누가 가져갔는지는 중요하지 않았다.',
    icon: 'fluent-color:contact-card-24',
    ext: '.evt',
  },
  {
    id: 'bad-word',
    name: '건너 들은 말',
    hint: '이름이 오래 알려지지 않는다.',
    desc: '나에 대한 이야기가 한 다리 건너 돌아왔다. 절반은 사실이 아니었고 절반은 사실이었다.',
    icon: 'fluent-color:chat-bubbles-question-24',
    ext: '.evt',
  },
  {
    id: 'cold-shoulder',
    name: '비워 둔 자리',
    hint: '몸에 밴 말씨가 오래 쌓이지 않는다.',
    desc: '늘 앉던 자리에 다른 사람이 앉아 있었다. 아무도 비켜 달라고 하지 않았다.',
    icon: 'fluent-color:person-warning-24',
    ext: '.evt',
  },
  {
    id: 'empty-table',
    name: '혼자 앉은 식탁',
    hint: '사람을 오래 만나지 않는다.',
    desc: '넷이 앉는 자리에 혼자 앉았다. 밥이 식는 속도가 유난히 빨랐다.',
    icon: 'fluent-color:people-community-24',
    ext: '.evt',
  },
  {
    id: 'wedding-mc',
    name: '사회를 봐 달라는 부탁',
    hint: '말과 몸가짐이 오래 쌓인다.',
    desc: '식장 앞에서 대본을 세 번 읽었다. 이름을 하나도 안 틀린 것이 제일 잘한 일이었다.',
    icon: 'fluent-color:ribbon-24',
    ext: '.evt',
  },
  {
    id: 'pace-maker',
    name: '페이스메이커 제안',
    hint: '몸이 남들보다 앞서 나간다.',
    desc: '대회 측에서 연락이 왔다. 앞서 달리되 이기면 안 되는 자리라고 했다.',
    icon: 'fluent-color:flag-24',
    ext: '.evt',
  },
  {
    /* 생활 등급 SS(평균 95%) — 사다리의 지평선. 문턱은 `data/rankEvents.ts`가 정한다. */
    id: 'life-portrait',
    name: '어떻게 살아왔느냐는 질문',
    hint: '무엇 하나가 아니라 전부가 쌓인다.',
    desc: '인터뷰어는 직업을 묻지 않았다. 하루를 어떻게 보내는지 물었고, 나는 한참을 대답했다.',
    icon: 'fluent-color:person-starburst-24',
    ext: '.evt',
  },
  {
    id: 'merged-pr',
    name: '머지된 한 줄',
    hint: '남의 코드에 손을 대 본다.',
    desc: '오타 하나 고친 PR이 머지됐다. 리뷰어는 한 줄, 나는 사흘을 봤다.',
    icon: 'fluent-color:code-24',
    ext: '.evt',
  },
  {
    id: 'cited-paper',
    name: '각주에 실린 이름',
    hint: '읽고 정리하기를 오래 한다.',
    desc: '누가 쓴 글의 각주에 내 정리가 인용돼 있었다. 오타까지 그대로였다.',
    icon: 'fluent-color:book-star-24',
    ext: '.evt',
  },
  {
    id: 'borrowed-idea',
    name: '어디서 본 아이디어',
    hint: '떠올린 것을 오래 내놓는다.',
    desc: '광고 하나가 작년에 적어 둔 것과 똑같았다. 증명할 방법은 없고 기분만 남았다.',
    icon: 'fluent-color:star-24',
    ext: '.evt',
  },
  {
    id: 'verified-badge',
    name: '파란 딱지',
    hint: '이름이 알려질 만큼 알려진다.',
    desc: '트위터 계정 이름 옆에 뱃지가 붙었다. 달라진 것은 없는데 답글 수는 달라졌다.',
    icon: 'fluent-color:checkmark-circle-24',
    ext: '.evt',
  },
  {
    id: 'gallery-call',
    name: '작은 갤러리에서 온 전화',
    hint: '그림을 오래 그린다.',
    desc: '2층에 빈 벽이 있다고 했다. 팔릴지는 모르겠지만 걸어는 보자고.',
    icon: 'fluent-color:paint-brush-24',
    ext: '.evt',
  },
  {
    id: 'quiet-donor',
    name: '이름 없는 후원자',
    hint: '옳은 쪽으로 자주 기운다.',
    desc: '동네 소식지 구석에 익명 후원 이야기가 실렸다. 이름이 없어서 다행이었다.',
    icon: 'fluent-color:heart-24',
    ext: '.evt',
  },
  {
    id: 'idea-notebook',
    name: '다 쓴 노트',
    hint: '떠오르는 것을 오래 적어 둔다.',
    desc: '수첩 마지막 장까지 찼다. 절반은 쓸모없고 절반은 아직 모르겠다.',
    icon: 'fluent-color:notebook-24',
    ext: '.evt',
  },
  {
    id: 'name-remembered',
    name: '이름을 기억하는 사람들',
    hint: '몸에 밴 말씨가 쌓인다.',
    desc: '편의점 사장님이 이름을 불렀다. 언제 알려 줬는지 기억이 나지 않았다.',
    icon: 'fluent-color:people-community-24',
    ext: '.evt',
  },
  /* ── 랭크 첫 칸 7종 (2026-08-14) ─────────────────────────────────────
   * 첫 보상이 B·A뿐이던 스탯의 C 칸(`data/rankEvents.ts`). 규칙은 위 랭크 단발과 같다.
   */
  {
    id: 'study-question',
    name: '옆자리의 질문',
    hint: '아는 것이 쌓이기 시작한다.',
    desc: '스터디에서 누가 나한테 물어봤다. 설명하다 보니 나도 그제야 이해했다.',
    icon: 'fluent-color:question-circle-24',
    ext: '.evt',
  },
  {
    id: 'street-scout',
    name: '길에서 받은 명함',
    hint: '거울 보는 시간이 늘어난다.',
    desc: '역 앞에서 명함을 받았다. 검색해 보니 진짜 있는 회사라서 더 이상했다.',
    icon: 'fluent-color:person-heart-24',
    ext: '.evt',
  },
  {
    id: 'second-watch',
    name: '같은 장면에서 두 번',
    hint: '보고 듣는 것이 쌓이기 시작한다.',
    desc: '두 번째 보는 영화인데 같은 장면에서 또 울었다. 이번에는 다른 이유였다.',
    icon: 'fluent-color:video-24',
    ext: '.evt',
  },
  {
    id: 'first-track',
    name: '3분 12초',
    hint: '만드는 쪽의 귀가 생긴다.',
    desc: '처음으로 곡 하나를 끝까지 만들었다. 스무 번 들었고, 스무 번 다 고치고 싶었다.',
    icon: 'fluent-color:headphones-24',
    ext: '.evt',
  },
  {
    id: 'first-fan',
    name: '모르는 사람의 댓글',
    hint: '그림이 손에 붙기 시작한다.',
    desc: '올린 그림에 처음 보는 아이디가 댓글을 달았다. 세 글자였는데 열 번 읽었다.',
    icon: 'fluent-color:comment-24',
    ext: '.evt',
  },
  {
    id: 'market-eye',
    name: '경제면부터 펴는 아침',
    hint: '돈이 움직이는 것이 보이기 시작한다.',
    desc: '뉴스의 금리 이야기를 끝까지 알아들었다. 작년의 나는 채널을 돌렸었다.',
    icon: 'fluent-color:chart-multiple-24',
    ext: '.evt',
  },
  {
    /* 길고양이 입양(`systems/cat.ts`). 방문일 규칙은 그쪽이 갖고 여기는 문구·아이콘만. */
    id: 'cat-adopted',
    name: '창밖의 손님',
    hint: '자꾸 오는 것을 세 번 모른 척하지 않는다.',
    desc: '문을 열어 두고 한참을 기다렸다. 들어온 것은 고양이였고, 나간 것은 혼자라는 말이었다.',
    icon: 'fluent-color:paw-24',
    ext: '.evt',
  },
  {
    id: 'napkin-sketch',
    name: '냅킨 뒷면',
    hint: '떠오르는 것이 잦아진다.',
    desc: '카페에서 떠오른 것을 냅킨에 적어 왔다. 반은 못 알아보겠고 반은 쓸 만했다.',
    icon: 'fluent-color:lightbulb-24',
    ext: '.evt',
  },
]
