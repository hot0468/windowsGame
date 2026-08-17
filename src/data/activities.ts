import type { Activity, ActivityCategory } from '../types/game'

/**
 * 활동 정의. 수치 조정은 이 파일에서만 한다.
 * onDesktop이 true인 활동만 바탕화면에 아이콘으로 뜬다 —
 * 나머지는 정의를 보존한 채 숨겨 두고, 추후 브라우저/스케줄 시스템에서 재사용한다.
 *
 * 단, 바탕화면 항목이 곧 활동인 것은 아니다. 활동이 아닌 항목(브라우저·폴더 등)은
 * `data/desktopItems.ts`가 관리하며, Desktop 컴포넌트는 그쪽의 DESKTOP_ITEMS만 순회한다.
 *
 * ## 활동을 15종으로 늘린 이유 (2026-08-04)
 * 성장 스탯은 10종인데 올릴 방법이 있는 건 지식·매력 둘뿐이라, 스탯창의 나머지 여덟 줄이
 * 영원히 0이었다. 스탯을 지우는 대신 활동을 채운 이유는 이 게임이 "무엇을 키울지 고르는"
 * 게임이기 때문이다 — 고를 것이 둘이면 고르는 게임이 아니다.
 *
 * 수치를 잡을 때 지킨 세 가지:
 * 1. **평판·도덕은 상한이 100이다**(`systems/turn.ts`의 `growthCap`). 나머지는 999다.
 *    그래서 이 둘의 상승폭은 일부러 작다 — 999짜리와 같은 +6을 주면 열 번 만에 만점이 되고,
 *    상한이 있다는 사실 자체가 무의미해진다.
 * 2. **비용의 성격을 서로 다르게 준다.** 행동력만 먹는 것 / 돈이 드는 것 / 멘탈을 깎는 것 /
 *    멘탈을 채워 주는 것. 비용이 한 종류면 "제일 싼 것"이 언제나 정답이라 선택이 사라진다.
 * 3. **멘탈 회복처를 게임 하나에서 넷으로 늘린다**(game·movie·club·running). 회복 수단이
 *    하나뿐이면 그 활동은 선택지가 아니라 통행세다 — 번아웃 페널티까지 걸려 있어 더 그렇다.
 */

/**
 * 활동 묶음의 표시 라벨과 **순서**. 배열 순서가 곧 고르기 판의 순서다.
 *
 * 컴포넌트가 아니라 여기 있는 이유: 라벨과 순서는 게임 콘텐츠고, 콘텐츠는 `src/data/`에 산다.
 * 생계를 맨 위에 둔 것은 의도다 — 돈이 끊기면 판이 끝나므로 가장 먼저 눈에 들어와야 한다.
 */
export const ACTIVITY_CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 'living', label: '생계' },
  { id: 'study', label: '학습' },
  { id: 'body', label: '신체' },
  { id: 'relation', label: '관계' },
  { id: 'leisure', label: '여가' },
  { id: 'giving', label: '나눔' },
]

export const ACTIVITIES: Activity[] = [
  {
    id: 'study',
    label: '공부',
    icon: 'fluent-color:book-open-24',
    category: 'study',
    description: '전공서를 펼친다. 머리는 아프지만 확실히 는다.',
    effects: { knowledge: 6, stamina: -15, mental: -5 },
    requires: { stamina: 15 },
  },
  {
    /*
     * ── 알바 4종의 기준점 (2026-08-05) ──
     * 조건이 하나도 없는 **유일한** 알바다. 시작하자마자 할 수 있어야 하므로 여기서 잠그면
     * 첫날부터 돈을 벌 길이 사라진다. 나머지 셋은 전부 스탯 조건이 걸려 있고, 그것이
     * 설계 문서의 "알바비는 물가보다 느리게 오른다 → 고소득 알바 전환 압박"을 구현한다.
     */
    id: 'work',
    label: '알바 (편의점)',
    icon: 'fluent-color:briefcase-24',
    category: 'living',
    description: '편의점 야간 근무. 돈은 들어온다.',
    effects: { money: 60000, stamina: -25, mental: -8 },
    requires: { stamina: 25 },
    scalesWithWage: true,
    burnoutKey: 'work',
  },
  {
    /*
     * 손님을 상대하는 일이라 **매력이 붙고 몸이 덜 상한다**. 대신 급여는 넷 중 가장 낮다.
     * 조건(매력 12)이 가벼운 것은 의도다 — 초반에 "조건을 채우면 다른 일이 열린다"를
     * 한 번 겪게 하는 자리이고, 그 경험이 있어야 과외·물류의 높은 조건이 목표로 읽힌다.
     */
    id: 'work-cafe',
    label: '알바 (카페)',
    icon: 'fluent-color:food-24',
    category: 'living',
    description: '주말 오전 홀 담당. 사람을 계속 마주치는 일이라 얼굴이 는다.',
    effects: { money: 45000, charm: 3, stamina: -18, mental: -3 },
    requires: { stamina: 18, charm: 12 },
    scalesWithWage: true,
    burnoutKey: 'work',
  },
  {
    /*
     * 몸으로 버는 쪽. 행동력을 가장 많이 먹고 멘탈도 가장 많이 깎지만 **조건이 스탯 하나**라
     * 러닝만 꾸준히 하면 열린다. 운동 스탯이 조금 붙는 것은 부수 효과이지 목적이 아니다
     * (몸을 키우려면 운동 활동이 여전히 더 싸다).
     */
    id: 'work-logistics',
    label: '알바 (물류센터)',
    icon: 'fluent-color:toolbox-24',
    category: 'living',
    description: '새벽 상하차. 끝나면 손가락이 안 펴지지만 일당이 그날 들어온다.',
    /* ⚠️ **오전 전용**(2026-08-08). 설명이 "새벽"이라고 약속해 놓고 여태 아무 때나 됐다.
       ⚠️ 조건 없는 알바(편의점)에는 붙이지 않는다 — 첫날 돈 벌 길이 슬롯까지 좁아진다. */
    requiresSlot: 'morning',
    effects: { money: 95000, athletics: 2, stamina: -35, mental: -12 },
    requires: { stamina: 35, athletics: 25 },
    scalesWithWage: true,
    burnoutKey: 'work',
  },
  {
    /*
     * 행동력당 수입이 가장 높은 알바이자 **지식 투자에 대한 보상**이다. 조건(지식 60)이
     * 높은 것이 이 활동의 값이다 — 공부 열 번쯤을 미리 치러야 열린다.
     */
    id: 'work-tutor',
    label: '알바 (과외)',
    icon: 'fluent-color:board-24',
    category: 'living',
    description: '중학생 수학 과외. 두 시간 앉아 있으면 편의점 하루치가 들어온다.',
    effects: { money: 105000, sociability: 2, vocabulary: 1, stamina: -20, mental: -6 },
    requires: { stamina: 20, knowledge: 60 },
    scalesWithWage: true,
    burnoutKey: 'work',
  },
  {
    /*
     * ── 정규직 3종 (2026-08-05, 벼룩장터와 함께 신설) ──
     * 알바가 "그 슬롯을 일하고 그날 받는" 일용직이라면, 이 셋은 **한 번 채용되면 지속되는**
     * 고용의 부품이다. 셋 다 `requiresJobStage`로 잠겨 있고 판정은 `canRun` 하나가 한다.
     *
     * 지원서 제출. 어디에 지원하는지는 **벼룩장터에서 고른 공고**가 정하므로 활동에는
     * 회사가 없다 — 그래서 `requiresPick`이다(예약이나 바로 가기로 실행하면 고른 공고가 없다).
     */
    id: 'job-apply',
    label: '지원서 제출',
    icon: 'fluent-color:document-text-24',
    category: 'living',
    description: '이력서를 다듬어 넣는다. 결과는 며칠 뒤에 온다.',
    effects: { stamina: -8, mental: -3, vocabulary: 1 },
    requires: { stamina: 8 },
    requiresJobStage: 'applying',
    requiresPick: true,
  },
  {
    /*
     * 면접. 서류를 통과해야, 그리고 기한 안이어야 갈 수 있다.
     * 예약은 허용한다 — 면접 날짜를 달력에 적어 두는 것은 실제로 하는 일이다.
     */
    id: 'job-interview',
    label: '면접',
    icon: 'fluent-color:people-community-24',
    category: 'living',
    description: '정장을 꺼내 입는다. 30분 동안 사람이 평가된다.',
    effects: { charm: 2, sociability: 1, stamina: -15, mental: -6 },
    requires: { stamina: 15 },
    requiresJobStage: 'interview',
  },
  {
    /*
     * 출근. **돈을 한 푼도 만지지 않는다** — 급여는 급여일에 회사(`data/careers.ts`)가 준다.
     * 여기 금액을 적으면 같은 급여가 두 곳에 생긴다.
     *
     * ⚠️ **번아웃 키가 알바('work')와 다르다.** 출근은 안 하면 잘리는 **의무**라,
     * 알바와 같은 키를 주면 "규칙대로 다녔다"는 이유로 효율이 깎이고 빠져나갈 길이 없다.
     * 대신 하루 한 번만 갈 수 있고(`canRun`), 나머지 한 슬롯은 온전히 남는다 —
     * 그 남은 슬롯이 급여일까지 버티는 다리이자 스탯을 올리는 자리다.
     */
    id: 'commute',
    label: '출근',
    icon: 'fluent-color:building-24',
    category: 'living',
    description: '회사에 간다. 하루가 통째로 지나가지만 급여일은 다가온다.',
    effects: { sociability: 1, stamina: -20, mental: -5 },
    requires: { stamina: 20 },
    requiresJobStage: 'employed',
  },
  {
    id: 'exercise',
    label: '운동',
    icon: 'fluent-color:sport-24',
    category: 'body',
    description: '오늘 체력을 태워 몸을 만든다.',
    effects: { athletics: 4, stamina: -20, mental: 3 },
    requires: { stamina: 20 },
  },
  {
    id: 'game',
    label: '게임',
    icon: 'fluent-color:puzzle-piece-24',
    category: 'leisure',
    description: '아무 생각 없이 논다. 멘탈이 회복된다.',
    // 게임을 하는데 '게임' 스탯이 안 오르던 것을 고쳤다(2026-08-04).
    // 멘탈 회복이 주목적인 활동이라 상승폭은 랭크 게임(+7)보다 낮게 둔다.
    // ⚠️ 반발 넷(2026-08-17, 설계자 지시: 친화력·경제·운동): 방에 혼자 앉아 노는 날의 값.
    //    전부 -1이다 — 주 멘탈 회복처라 더 깎으면 회복이 벌칙이 된다(balance.verify가 이 활동을 쓴다).
    effects: { mental: 18, gaming: 4, stamina: -5, knowledge: -1, sociability: -1, finance: -1, athletics: -1 },
    requires: { stamina: 5 },
  },
  {
    /*
     * 클립스튜디오. **타블렛(팬 또는 액정)을 사야 열린다** — `requiresItem`이 배열인
     * 유일한 활동이고, 그것이 "장비 차이는 여는 문이 아니라 결과의 등급"이라는 결정이다
     * (`systems/turn.ts`의 `ownsRequired`, 등급은 `systems/artwork.ts`).
     *
     * ⚠️ **실행할 때마다 그림 한 장이 갤러리에 쌓인다**(`producesArt`). 이 게임에서
     * 활동이 아이템을 만들어 내는 유일한 자리다 — 그 그림이 트위터 업로드의 재료이고,
     * 그래서 이 활동은 스탯만 올리는 활동과 성격이 다르다(쌓인 것이 나중에 돈이 된다).
     *
     * 수치는 개인방송(`stream`)과 나란히 읽히게 잡았다: 돈을 **한 푼도 주지 않는 대신**
     * 행동력을 덜 먹고 멘탈도 덜 깎는다(-18 / -3 vs -22 / -8). 그리는 것 자체가 수입이
     * 아니라 **재고를 쌓는 일**이고, 값은 올렸을 때 팔로워로 돌아온다.
     * 예술 +12는 `ART_MASTERY`(300) 기준 24회면 S 언저리가 되도록 잡은 값이다 —
     * 여기를 키우면 `data/artworks.ts`의 기준도 함께 봐야 한다.
     *
     * 번아웃 키가 따로인 이유는 `stream`·`gig`와 같다: 남의 키를 빌리면 그쪽 불변식
     * (알바는 넷 / 외주는 수료증 계열)이 조용히 깨진다.
     */
    id: 'draw',
    label: '클립스튜디오',
    icon: 'fluent-color:paint-brush-24',
    category: 'leisure',
    description: '타블렛을 켜고 한 장을 끝까지 그린다. 마지막 10분이 제일 길다.',
    effects: { art: 12, creativity: 9, sensitivity: 2, stamina: -18, mental: -3 },
    requires: { stamina: 18 },
    requiresItem: ['pen-tablet', 'lcd-tablet'],
    producesArt: true,
    burnoutKey: 'draw',
  },
  {
    /*
     * 웹툰 원고. **개인 작업(`draw`)과 갈리는 자리가 여기다**(설계자 지시: "작업량 채울지,
     * 개인작업물 만들지 선택").
     *
     * ⚠️ **`producesArt`가 없다** — 이것은 남의 원고라 갤러리에 안 남고 공모전에도 회지에도
     * 못 쓴다. 그 대신 **돈이 주간 원고료로 돌아온다**(`data/webtoon.ts`의 `EPISODE_PAY`).
     * ⚠️ **`effects`에 money가 없다.** 원고료는 회차 단위라 장마다 주면 마감을 채우지 않고
     * 한 장만 그려도 돈을 버는 판이 된다 — 정규직 출근(`commute`)이 돈을 안 만지는 것과
     * 정확히 같은 이유다.
     * ⚠️ 예술이 `draw`보다 덜 오른다(+8 vs +12): 남이 정한 것을 그리는 일이라 배움이 적다.
     * 대신 마감이 있어 멘탈을 더 깎는다.
     */
    id: 'draw-webtoon',
    label: '웹툰 원고',
    icon: 'fluent-color:document-edit-24',
    category: 'leisure',
    description: '마감이 있는 원고를 한 장 친다. 내 이야기는 아니지만 돈이 된다.',
    effects: { art: 8, creativity: 4, stamina: -20, mental: -6 },
    requires: { stamina: 20 },
    requiresItem: ['pen-tablet', 'lcd-tablet'],
    /* ⚠️ 번아웃은 `draw`와 **함께 센다** — 키를 가르면 개인 작업과 원고를 번갈아
       그려 연속 노동의 대가를 한 번도 안 치른다(알바 4종과 같은 판단). */
    burnoutKey: 'draw',
  },
  {
    /*
     * 코미콘 — 만든 작품집을 회지로 파는 하루.
     *
     * ⚠️ **`effects`에 money가 없다.** 매출은 회지의 장수·완성도가 정하므로 활동이 들고
     * 있을 수 없다(알바몬 공고와 정반대 방향의 같은 원칙 — `Career.salary`·`Gig.pay`와 같다).
     * 실제 지급은 `systems/projects.ts`의 `sellAtComicon`이 한다.
     * ⚠️ **부스에 앉아 있는 일이라 1턴을 쓴다** — 판매를 공짜로 두면 그린 장수가 곧
     * 그대로 수입이 되어 회지 수익 상한이 헐거워진다.
     */
    id: 'comicon',
    label: '코미콘 참가',
    icon: 'fluent-color:people-community-24',
    category: 'leisure',
    description: '부스에 앉아 하루 종일 회지를 판다. 몇 권이나 나갈지는 그려 놓은 것에 달렸다.',
    effects: { sociability: 3, sensitivity: 2, stamina: -22, mental: 2 },
    requires: { stamina: 22 },
  },
  {
    /*
     * 행사 참관 — 창작·전시 계열(코미콘·일러스트 페어·도서전·게임쇼).
     *
     * ⚠️ **`effects`에 money가 없다.** 입장료는 행사마다 다르므로 `Expo.fee`가 갖는다
     * (강의 수강료·일감 보수와 같은 방향 — 활동 하나가 여러 행사를 대신 실행한다).
     * ⚠️ 멘탈이 오른다: 남이 만든 것을 보고 오는 하루는 쉬는 축에 든다. 다만 폭이 작아
     * **회복처로 쓰기엔 입장료가 아깝다** — `game`·`movie`가 여전히 싸고 확실하다.
     */
    id: 'expo-visit',
    label: '행사 참관',
    icon: 'fluent-color:calendar-24',
    category: 'leisure',
    description: '하루를 비워 행사장을 돈다. 남이 만든 것을 보는 것도 배움이다.',
    effects: { sensitivity: 5, creativity: 4, sociability: 2, stamina: -14, mental: 3 },
    requires: { stamina: 14 },
    burnoutKey: 'expo',
  },
  {
    /*
     * 행사 참관 — 산업·강연 계열(취업 박람회·개발자 컨퍼런스).
     * 창작 쪽과 갈리는 이유는 **가서 얻는 것이 다르기 때문**이다(감수성 vs 지식·인맥).
     * 하나로 합치면 어느 행사를 골라도 같아져 목록이 장식이 된다.
     */
    id: 'expo-visit-biz',
    label: '박람회 참관',
    icon: 'fluent-color:briefcase-24',
    category: 'study',
    description: '부스를 돌며 설명을 듣고 명함을 받는다. 종일 서 있어야 한다.',
    effects: { knowledge: 5, sociability: 4, reputation: 1, stamina: -16, mental: -2 },
    requires: { stamina: 16 },
    burnoutKey: 'expo',
  },
  {
    /*
     * 행사 참여 — 부스에 서는 쪽.
     *
     * ⚠️ **돈을 한 푼도 주지 않는다.** 참가비를 내고 얻는 것은 **평판과 인맥**이다 —
     * 부스로 돈을 벌게 하면 회지 판매(`comicon`)와 같은 수입원이 하나 더 생겨
     * "판은 반드시 끝난다"를 받치는 상한이 두 곳으로 갈린다. 회지를 파는 참여는
     * 이 활동이 아니라 **코미콘 사이트**를 지난다.
     * ⚠️ 번아웃 키는 참관과 같다 — 참관·참여를 번갈아 하며 대가를 피해 갈 수 없게.
     */
    /*
     * 대회 참가(보디빌딩·마라톤). **부스(`expo-booth`)와 다른 활동인 이유는 성격이다** —
     * 부스는 앉아서 이름을 알리는 일이고 이쪽은 몸을 쓰는 일이라 비용이 다르다.
     *
     * ⚠️ **평판을 주지 않는다.** 참가만으로 평판이 오르면 수상이 뜻을 잃는다 —
     * 평판은 **수상이** 준다(`ExpoJoin.award`). 여기서 얻는 것은 운동 몫뿐이다.
     * ⚠️ 돈도 한 푼 안 준다("행사는 수입원이 아니다"). 번아웃 키는 행사 셋과 같은 `'expo'`.
     */
    id: 'expo-compete',
    label: '행사 참여 (대회)',
    icon: 'fluent-color:trophy-24',
    category: 'body',
    description: '번호표를 달고 몸으로 겨룬다. 끝나면 며칠 다리가 아프다.',
    effects: { athletics: 3, stamina: -30, mental: -6 },
    requires: { stamina: 30 },
    burnoutKey: 'expo',
  },
  {
    id: 'expo-booth',
    label: '행사 참여 (부스)',
    icon: 'fluent-color:megaphone-loud-24',
    category: 'relation',
    description: '작은 부스를 지키며 하루를 보낸다. 몇 사람이 이름을 기억해 간다.',
    effects: { reputation: 4, sociability: 5, charm: 2, stamina: -24, mental: -4 },
    requires: { stamina: 24 },
    burnoutKey: 'expo',
  },
  {
    /*
     * 헬스장 1일권. 회원권으로 가는 것(gym-member)과 효과가 같고 **돈만 더 든다** —
     * 그래서 회원권 쪽에 `requiresItem` 잠금이 걸려 있어야만 이 활동이 존재 이유를 갖는다.
     * 잠금이 없던 동안 1일권은 순수하게 열등한 선택지였다(2026-08-04 수정).
     */
    id: 'gym-day',
    label: '헬스장 (1일권)',
    icon: 'fluent-color:sport-24',
    category: 'body',
    description: '하루치를 끊고 운동한다.',
    effects: { athletics: 6, stamina: -20, mental: 2, money: -15000 },
    requires: { stamina: 20, money: 15000 },
  },
  {
    /*
     * 회원권 소지자 전용. 갈 때 돈이 나가지 않는 대신 **회원권을 먼저 사야 한다**
     * (쇼핑 또는 헬스장 오픈채팅의 월결제 — 둘 다 같은 아이템 `gym-pass`를 주문한다).
     * 판정은 `canRun`이 하므로 예약해 뒀다가 실행되는 경로도 똑같이 막힌다.
     */
    id: 'gym-member',
    label: '헬스장 (회원)',
    icon: 'fluent-color:sport-24',
    category: 'body',
    description: '회원권으로 간다. 추가 비용은 없다.',
    effects: { athletics: 6, stamina: -20, mental: 2 },
    requires: { stamina: 20 },
    requiresItem: 'gym-pass',
  },
  /*
   * ── 미용실 2종 (2026-08-08) ──
   * ⚠️ **헬스장과 완전히 같은 구조다**(1회권 / 정기권 잠금). 다른 것은 올리는 스탯뿐:
   * 헬스장이 **운동 스탯**을 키운다면 미용실은 **매력**을 키운다.
   * 같은 구조를 되풀이하는 것이 의도다 — 플레이어가 "오픈채팅에서 파는 것은 이렇게
   * 동작한다"를 한 번만 배우면 된다(`gym-pass` ← `gym-member`와 같은 방향).
   *
   * ⚠️ **`social`(메신저, 매력 5 · 멘탈 +8)과 성격을 갈라 뒀다.** 미용실은 멘탈을 거의
   * 안 주는 대신 행동력이 싸다 — 둘이 같은 값이면 매력을 올리는 방법이 하나로 줄어든다.
   */
  {
    /* 1회 방문. 정기권으로 가는 것(salon-member)과 효과가 같고 **돈만 더 든다**. */
    id: 'salon-visit',
    label: '미용실 (1회)',
    icon: 'fluent-color:person-starburst-24',
    category: 'body',
    description: '커트하고 드라이까지 받는다. 거울 속이 조금 낯설다.',
    effects: { charm: 6, mental: 2, stamina: -10, money: -25000 },
    requires: { stamina: 10, money: 25000 },
  },
  {
    /*
     * 정기권 소지자 전용. 갈 때 돈이 나가지 않는 대신 **정기권을 먼저 사야 한다**
     * (쇼핑 또는 미용실 오픈채팅 — 둘 다 같은 아이템 `salon-pass`를 주문한다).
     * 판정은 `canRun`이 하므로 예약해 뒀다가 실행되는 경로도 똑같이 막힌다.
     */
    id: 'salon-member',
    label: '미용실 (정기권)',
    icon: 'fluent-color:person-starburst-24',
    category: 'body',
    description: '정기권으로 간다. 추가 비용은 없다.',
    effects: { charm: 6, mental: 2, stamina: -10 },
    requires: { stamina: 10 },
    requiresItem: 'salon-pass',
  },
  /*
   * ── 수료증이 여는 활동 2종 (2026-08-05 슬로우캠퍼스) ──
   * ⚠️ **수료증은 기존 조건을 우회시키지 않고 새 활동을 연다.** 과외의 '지식 60'을
   * 수료증으로 대신 열어 주면 스탯을 키울 이유가 사라진다 — 잠금은 `gym-member`와
   * 같은 방향으로만 쓴다(돈을 미리 치른 사람에게 **다른 선택지**를 준다).
   * ⚠️ **번아웃 키가 알바('work')와 다르다**(`commute`와 같은 판단). 알바와 같은 키를
   * 주면 `WORK_ACTIVITIES`(= `burnoutKey === 'work'`에서 파생)에 섞여 들어가 "알바는 넷"과
   * "조건 없는 알바는 편의점 하나뿐"이라는 불변식을 깬다 — 이 둘은 **알바몬 공고가 가리키는
   * 일용직**의 규칙이고, 외주는 알바몬에 공고가 없다. 대신 둘끼리는 키를 공유해
   * 외주만 번갈아 받는 우회를 막는다.
   */
  {
    /*
     * ── 도구 활동 3종 (2026-08-08 그몽 재설계) ──
     *
     * ⚠️ **예전의 외주 활동 4종(`gig-typing`·`gig-design`·`gig-ai`·`gig-brand`)을 대체한다.**
     * 그때는 "일감 = 활동 하나 = 즉시 보수"였고, 지금은 **수주 → 도구로 업무량 채우기
     * → 납품**이라 돈은 일감이 갖는다(`Gig.pay`). 그래서 이 활동들은 **한 푼도 안 준다.**
     *
     * ⚠️ **받아 둔 일이 없어도 켤 수 있다** — 그때는 스탯만 오르는 연습이다.
     * 게이트를 늘리지 않기 위한 결정이고, 도구를 잠그는 것은 여전히 **구독**뿐이다.
     *
     * ⚠️ **번아웃 키는 셋 다 `'gig'`다** — 도구를 바꿔 가며 켜도 "외주를 계속 하고 있는"
     * 것은 같다(알바 4종이 `'work'`를 나누는 것과 같은 이유). 키는 여전히 넷이다.
     */
    id: 'tool-photoshop',
    label: '포토샵 작업',
    icon: 'devicon:photoshop',
    category: 'living',
    description: '레이어를 쓰다 말고 다시 열었다. 이번엔 이름을 붙였다.',
    effects: { art: 5, creativity: 3, stamina: -20, mental: -7 },
    requires: { stamina: 20 },
    requiresSubscription: 'adobe',
    toolId: 'photoshop',
    burnoutKey: 'gig',
  },
  {
    id: 'tool-premiere',
    label: '프리미어 작업',
    icon: 'devicon:premierepro',
    category: 'living',
    description: '컷 하나에 십 분을 썼다. 되돌려 보면 처음 것과 같아 보인다.',
    effects: { sensitivity: 4, creativity: 4, stamina: -22, mental: -7 },
    requires: { stamina: 22 },
    requiresSubscription: 'adobe',
    toolId: 'premiere',
    burnoutKey: 'gig',
  },
  {
    /*
     * ⚠️ **구독이 필요 없는 유일한 도구다** — 그래서 그몽의 "조건 없는 일감"이 VS 코드 쪽이고,
     * 판을 시작하자마자 부업을 받을 수 있다.
     */
    id: 'tool-vscode',
    label: 'VS 코드 작업',
    icon: 'devicon:vscode',
    category: 'living',
    description: '동작하는 데까지 두 시간, 이해하는 데까지는 아직이다.',
    /* ⚠️ **IT의 주 공급원이다**(예술을 `draw` 하나가 올리는 것과 같은 부류). 지식은
       배운 것이라 여기서는 곁가지로만 오른다 — 둘을 같은 몫으로 주면 스탯을 가른 이유가 없다.
       ⚠️ **IT는 대가를 치른다**(2026-08-17, 설계자 지시): `tech`를 올리는 활동은 전부
       매력·감수성을 조금 깎는다(화면만 보는 날들의 값). 큰 공급원(5~6)은 -2, 곁가지(2~4)는
       -1 — 다섯 곳(vscode·coding-study·sw-contract·maintenance·ai-study)이 같은 규칙이다. */
    effects: { tech: 5, knowledge: 2, creativity: 2, charm: -2, sensitivity: -2, stamina: -20, mental: -6 },
    requires: { stamina: 20 },
    toolId: 'vscode',
    burnoutKey: 'gig',
  },
  {
    /*
     * 오디션. **어도비 도구 셋째**라 포토샵·프리미어와 완전히 같은 부류다(같은 구독이 열고,
     * 켜면 1턴, 받아 둔 오디션 일감이 있으면 업무량을 채운다).
     * ⚠️ **음악을 요구하지 않는다** — 도구는 구독이 열고 스탯은 결과로 돌아온다는 방향이
     *    셋과 같아야 한다. 요구하면 그몽에 잠금이 두 겹이 되고, 도구가 음악을 올리는
     *    통로라는 것도 사라진다.
     */
    id: 'tool-audition',
    label: '오디션 작업',
    icon: 'fluent-color:headphones-24',
    category: 'living',
    description: '파형을 확대해 잡음 하나를 지운다. 다시 들으면 다른 게 들린다.',
    effects: { music: 4, sensitivity: 3, stamina: -20, mental: -7 },
    requires: { stamina: 20 },
    requiresSubscription: 'adobe',
    toolId: 'audition',
    burnoutKey: 'gig',
  },
  /*
   * ── 자격시험 (2026-08-05 O넷) ──
   * ⚠️ **`requiresPick`이다**(지원서 제출과 같은 이유). "어느 종목을 보는가"는 활동이
   * 들고 있지 않고 **O넷에서 고른 종목**이 정하므로, 대상 없이 실행될 수 있는 두 통로
   * (스케줄러 예약 · 바탕화면 바로 가기)에서 자동으로 빠진다 — 그 시점엔 고른 종목이
   * 없어 턴만 먹는다.
   * ⚠️ **응시료를 여기 적지 않는다** — 종목마다 다르므로 `Cert.fee`가 단일 출처다
   * (강의의 `Course.price`와 같은 규칙).
   */
  {
    id: 'exam',
    label: '자격시험 응시',
    icon: 'fluent-color:form-24',
    category: 'study',
    description: '고사장에 앉는다. 결과는 며칠 뒤에 발표된다.',
    effects: { knowledge: 1, stamina: -20, mental: -6 },
    requires: { stamina: 20 },
    requiresPick: true,
  },
  /*
   * ── 자격증이 여는 활동 2종 (2026-08-05 O넷) ──
   * ⚠️ **수료증 외주(`gig-ai`·`gig-brand`)와 같은 구조이되 번아웃 키가 다르다.**
   * `'work'`를 주면 `WORK_ACTIVITIES`(= `burnoutKey === 'work'`에서 파생)에 섞여
   * "알바는 넷"·"조건 없는 알바는 편의점뿐"이라는 알바몬 공고의 불변식이 깨지고,
   * `'gig'`를 주면 수료증 외주와 한 덩어리가 되어 **강의를 들은 사람이 자격증 일감까지
   * 같은 연속 노동으로 세이게 된다**(두 시스템이 서로의 페널티를 물려받는다).
   * 그래서 `'cert-gig'`라는 제3의 키를 준다 — 대신 **둘끼리는 공유해서** 자격증 일감만
   * 번갈아 받는 우회를 막는다.
   */
  {
    /* 문서실무 2급이 여는 일감. 조건이 가장 이른 대신 벌이도 가장 작다. */
    id: 'gig-docs',
    label: '문서 대행',
    icon: 'fluent-color:clipboard-text-edit-24',
    category: 'living',
    description: '자격증을 걸고 받은 서류 정리 건. 같은 표를 스물세 번 고친다.',
    effects: { money: 68000, vocabulary: 2, stamina: -18, mental: -7 },
    requires: { stamina: 18 },
    requiresItem: 'cert-doc',
    burnoutKey: 'cert-gig',
    scalesWithWage: true,
  },
  {
    /* 안전관리 3급이 여는 일감. 몸을 가장 많이 쓰는 대신 벌이가 가장 좋다. */
    id: 'gig-safety',
    label: '현장 안전점검',
    icon: 'fluent-color:shield-checkmark-24',
    category: 'living',
    description: '하루짜리 점검을 나간다. 체크리스트가 예순 줄이고 사진을 다 찍어야 한다.',
    effects: { money: 92000, manners: 1, athletics: 1, stamina: -28, mental: -9 },
    requires: { stamina: 28 },
    requiresItem: 'cert-safety',
    burnoutKey: 'cert-gig',
    scalesWithWage: true,
  },
  /*
   * ── 전자기기가 여는 활동 (2026-08-06 하이마루) ──
   * ⚠️ **`gym-member`·수료증 외주·자격증 일감과 같은 구조다**: 물건이 기존 조건을
   * 우회시키는 게 아니라 **새 선택지를 연다**. 판정은 `requiresItem` → `canRun` 하나가
   * 하므로 스케줄러 예약·바탕화면 바로 가기도 똑같이 막힌다.
   *
   * ⚠️ **번아웃 키가 `'stream'`이다 — 제4의 키를 새로 준다.**
   *  - `'work'`면 `WORK_ACTIVITIES`(= `burnoutKey === 'work'`에서 파생)에 섞여 들어가
   *    "알바는 넷"·"조건 없는 알바는 편의점뿐"이라는 알바몬 공고의 불변식이 깨진다.
   *  - `'gig'`면 슬로우캠퍼스 수료증 외주와 한 덩어리가 되고, `'cert-gig'`면 O넷
   *    자격증 일감과 한 덩어리가 된다 — 어느 쪽이든 **다른 시스템의 페널티를 물려받는다**
   *    (강의를 들은 사람이 방송까지 같은 연속 노동으로 세이게 된다).
   * 활동이 하나뿐이라 키를 공유할 상대는 아직 없지만, 키를 갖는 것 자체가 "이 축은
   * 따로 센다"는 규칙이다(`'cert-gig'`를 만든 것과 같은 판단).
   */
  {
    id: 'stream',
    label: '개인방송',
    icon: 'fluent-color:mic-24',
    category: 'living',
    description: '장비를 켜고 두 시간을 떠든다. 동시 접속자는 대체로 한 자릿수다.',
    /* ⚠️ **오후 전용** — 사람이 모이는 시간에 켠다. 오전 방송은 시청자가 없다. */
    requiresSlot: 'afternoon',
    effects: { money: 55000, reputation: 2, sociability: 3, stamina: -22, mental: -8 },
    requires: { stamina: 22 },
    requiresItem: 'streamkit',
    burnoutKey: 'stream',
    scalesWithWage: true,
  },
  {
    id: 'social',
    label: '메신저',
    // ⚠️ 바탕화면에 뜨는 항목이므로 **프로그램 로고**여야 한다(devicon).
    // 말풍선 이모지는 "개념 그림"이지 설치된 앱의 아이콘으로 읽히지 않는다.
    // 이 아이콘은 바탕화면 · 창 타이틀 바 · 작업 표시줄 항목에 그대로 흘러가
    // 앱의 정체성을 한 벌로 유지한다(Desktop.tsx가 item.icon을 open()에 넘긴다).
    icon: 'devicon:slack',
    category: 'relation',
    description: '사람들과 어울린다. 돈은 좀 쓴다.',
    effects: { charm: 5, mental: 8, money: -20000, stamina: -10 },
    requires: { stamina: 10, money: 20000 },
    // ⚠️ 바탕화면에서 내렸다(설계자 결정). 메신저는 이제 카톡 창(kind: 'chat')이고,
    // 이 활동은 그 안의 [만나러 가기] 버튼이 실행한다 — 읽기는 무료, 만나는 것만 1턴.
    // 정의를 지우지 않는 이유: 효과 수치와 밸런스 테스트가 이 활동을 참조한다.
    onDesktop: false,
  },
  {
    /*
     * IT의 **둘째 공급원**(2026-08-13). 그전까지 IT를 올리는 길은 `tool-vscode` 하나뿐이라
     * "부업을 하는 사람만 오르는 스탯"이었다 — 음악이 2026-08-08에 겪은 것과 같은 모양이다.
     * ⚠️ **공부(`study`)와 갈라 둔다**: 공부는 배운 것(지식)이고 이쪽은 **직접 쳐 보는 것**이라
     *    지식은 곁가지로만 붙는다. 슬로우캠퍼스의 코드 강의가 이 활동을 가리킨다.
     */
    id: 'coding-study',
    label: '코딩 공부',
    icon: 'fluent-color:code-24',
    category: 'study',
    description: '예제를 그대로 쳤는데 안 된다. 오타 하나를 찾는 데 사십 분이 갔다.',
    effects: { tech: 6, knowledge: 2, charm: -2, sensitivity: -2, stamina: -12, mental: -5 },
    requires: { stamina: 12 },
  },
  {
    /*
     * AI 입문 강의(`ai-basic`) 전용(2026-08-17) — 강의가 `study`를 가리키던 시절에는
     * 제목에 AI가 있는데 IT가 안 올랐다. 배우는 것이 반, 시켜 보는 것이 반이라 지식이
     * 주고 IT는 곁가지다(코드를 치는 `coding-study`보다 IT가 작아야 초급을 들을 이유가 남는다).
     */
    id: 'ai-study',
    label: 'AI 공부',
    icon: 'fluent-color:bot-sparkle-24',
    category: 'study',
    description: '시키는 대로 하면 되는데, 왜 되는지는 아직 모른다.',
    effects: { knowledge: 4, tech: 2, charm: -1, sensitivity: -1, stamina: -14, mental: -5 },
    requires: { stamina: 14 },
  },
  {
    /* 어휘력의 주 공급원. 공부보다 싸고 지식도 조금 붙지만, 대신 지식 자체는 느리다. */
    id: 'reading',
    label: '독서',
    icon: 'fluent-color:book-24',
    category: 'study',
    description: '빌려 온 책을 편다. 세 장 넘기면 눈이 감기지만 말은 늘어난다.',
    effects: { vocabulary: 6, knowledge: 2, stamina: -10, mental: -2 },
    requires: { stamina: 10 },
  },
  {
    /*
     * 돈이 나가는 대신 멘탈을 채워 주는 회복형 여가. 게임의 대안이다.
     *
     * ⚠️ **2026-08-04 극장 기준으로 재조정했다.** 예매 사이트(시집이)가 생기면서
     * 이 활동이 "집에서 보는 것"이 아니라 **극장에 다녀오는 것**으로 확정됐다.
     * 행동력 -5는 소파에서 보는 값이었고, 12,000원은 표값보다 쌌다.
     * 나가는 값을 올린 만큼 큰 화면의 보상(멘탈 6→8)도 함께 올려 여전히
     * "게임(mental +18, 거의 공짜)"의 대안으로 남게 했다 — 비싸기만 하면 아무도 안 고른다.
     */
    id: 'movie',
    label: '영화 감상',
    icon: 'fluent-color:video-24',
    category: 'leisure',
    description: '혼자 조조를 본다. 엔딩 크레딧까지 앉아 있는 사람은 늘 몇 없다.',
    /* ⚠️ **오전 전용** — 조조다. 시집이의 회차 선택과 어긋나지 않는다(회차는 표시이고
       실행 슬롯은 이 규칙이 정한다). */
    requiresSlot: 'morning',
    effects: { sensitivity: 6, creativity: 3, mental: 8, stamina: -15, money: -15000 },
    requires: { stamina: 15, money: 15000 },
  },
  {
    /*
     * 영상 감상(너튜브). **극장(`movie`)의 작은 판이다** — 같은 것을 보되 공짜이고
     * 집이라 오가는 값이 없다. ⚠️ **보상도 그만큼 작아야 한다**: 여기가 영화만큼 주면
     * 표값 15,000원을 낼 이유가 사라져 극장 사이트(시집이)가 통째로 죽는다.
     * ⚠️ **고른 영상의 갈래가 활동을 정한다**(2026-08-13, 배달 메뉴·여행 상품과 같은 규칙 —
     *    `data/videos.ts`의 `CATEGORY_ACTIVITY`가 그 표다). 아래 셋에 안 걸리는 갈래
     *    (브이로그·코미디·요리·여행)는 전부 이 기본값으로 온다: 남는 것이 기분과 잔상뿐인 쪽.
     */
    id: 'watch-video',
    label: '영상 감상',
    icon: 'fluent-color:content-view-24',
    category: 'leisure',
    description: '하나만 보려다 자동재생을 세 번 넘긴다. 남는 것은 잔상과 조금의 기분.',
    effects: { sensitivity: 2, creativity: 1, mental: 6, stamina: -5 },
    requires: { stamina: 5 },
  },
  {
    /* 게임 영상. ⚠️ 게임 활동(`game`, 멘탈 +18)의 자리를 뺏지 않는다 — 보는 것은 하는 것이
       아니라서 멘탈 몫이 작고, 대신 남의 판을 보는 만큼 게임 스탯이 붙는다. */
    id: 'watch-video-game',
    label: '게임 영상 감상',
    icon: 'fluent-color:content-view-24',
    category: 'leisure',
    description: '남이 하는 걸 보다 보면 나도 할 수 있을 것 같아진다. 대체로 착각이다.',
    effects: { gaming: 3, mental: 6, stamina: -5 },
    requires: { stamina: 5 },
  },
  {
    /* 음악 영상. ⚠️ **작곡(`compose`, 7/턴)의 자리를 뺏지 않는다** — 듣는 것으로 오르는
       몫은 작아야 음악이 "만드는 스탯"으로 남는다(감수성이 함께 붙는 것도 그래서다). */
    id: 'watch-video-music',
    label: '음악 영상 감상',
    icon: 'fluent-color:content-view-24',
    category: 'leisure',
    description: '한 곡을 다섯 번 돌린다. 세 번째부터는 베이스만 들린다.',
    effects: { music: 3, sensitivity: 1, mental: 5, stamina: -5 },
    requires: { stamina: 5 },
  },
  {
    /* 뉴스. ⚠️ **멘탈 몫이 셋 중 가장 작다** — 쉬려고 켠 것이 아니라서다. 그 대신
       유일하게 지식이 붙는다(공부만큼은 아니고, 공짜인 값이 여기서 갈린다). */
    id: 'watch-video-news',
    label: '뉴스 시청',
    icon: 'fluent-color:content-view-24',
    category: 'leisure',
    description: '세상이 어떻게 돌아가는지 십 분이면 안다. 알고 나면 기분이 반쯤 상한다.',
    effects: { knowledge: 2, vocabulary: 1, mental: 2, stamina: -5 },
    requires: { stamina: 5 },
  },
  /*
   * ── 배달 음식 2종 (2026-08-08 배달의정석) ──
   * ⚠️ **알바몬과 같은 구조다**: 사이트의 메뉴는 **어느 활동을 실행하는지 가리키기만** 하고
   * 값은 활동이 갖는다(`data/dishes.ts`에 가격을 다시 적지 않는다). 그래서 같은 부류의
   * 메뉴들은 값이 같다 — 알바몬에서 같은 직종 공고 둘이 같은 일당인 것과 같은 이유다
   * (표시가 참이려면 화면이 파생시키는 값이 하나여야 한다).
   *
   * ⚠️ **체력을 회복시키지 않는다.** 활동으로 `stamina`를 채우면 "턴을 써서 체력을
   * 얻는" 순환이 생기고, 취침만 회복한다는 자원 규칙이 무너진다. 음식이 주는 것은
   * **멘탈**이고, 몸에 남는 것은 건강식의 **운동 스탯**뿐이다.
   */
  {
    /*
     * 정크푸드. 싸고 멘탈을 크게 채우지만 **매력이 깎인다**(설계자 지시).
     * ⚠️ 이 게임에서 성장 스탯을 **깎는** 몇 안 되는 활동이다 — 그래서 폭이 작다(-2).
     * 크게 깎으면 "싸게 멘탈을 채우는 길"이 아니라 그냥 함정이 된다.
     */
    /*
     * 병원 진료. **아픔에서 빠져나오는 두 번째 길이고, 그래서 돈으로 산다** —
     * 날이 지나 저절로 낫는 길만 두면 아픔은 선택이 아니라 통행세다(`data/illness.ts`).
     *
     * ⚠️ **완치는 여기서 일어나지 않는다.** 이 활동이 갖는 것은 비용(돈·1턴)뿐이고
     * `illness` 필드를 지우는 것은 `healIllness`다(`gameStore`가 둘을 잇는다) — 활동
     * 효과에 상태 변경을 섞으면 "아프지 않은데 진료비만 나가는" 경로가 열린다.
     * ⚠️ 진료비는 `CLINIC_FEE`가 정본이다. 여기 `money`에 적힌 값과 어긋나면 안 된다
     * (`illness.test.ts`가 지킨다).
     */
    id: 'clinic',
    label: '병원 진료',
    icon: 'fluent-color:patient-24',
    category: 'body',
    description: '접수하고 한참 기다린다. 주사 한 대와 이틀치 약을 받아 나온다.',
    effects: { mental: 4, stamina: -4, money: -25000 },
    requires: { money: 25000 },
  },
  {
    id: 'meal-junk',
    label: '배달 (정크푸드)',
    icon: 'fluent-color:food-24',
    category: 'leisure',
    description: '기름진 걸 시킨다. 먹는 동안은 확실히 행복하다.',
    effects: { mental: 12, charm: -2, stamina: -5, money: -12000 },
    requires: { stamina: 5, money: 12000 },
  },
  {
    /*
     * 건강식. 비싸고 멘탈은 덜 채우지만 **몸에 남는다**(체력 그릇 +3).
     * 정크푸드와 성격을 갈라 두는 것이 핵심이다 — 값이 같으면 고를 이유가 없다.
     */
    id: 'meal-healthy',
    label: '배달 (건강식)',
    icon: 'fluent-color:food-24',
    category: 'body',
    description: '채소가 반이다. 다 먹고 나면 뿌듯하긴 하다.',
    effects: { mental: 6, athletics: 2, stamina: -5, money: -18000 },
    requires: { stamina: 5, money: 18000 },
  },
  /*
   * ── 티켓으로 가는 두 곳 (2026-08-08 노24 · 먼바다투어) ──
   * ⚠️ **영화 감상(`movie`)과 같은 부류다**: 사이트에서 고르는 것은 **무엇을 보러/어디로
   * 가는가**뿐이고, 수치는 활동 하나가 갖는다(시집이의 회차·미디북스의 책과 같은 규칙).
   * 공연·여행 상품에 각자 가격을 달지 않는 이유도 같다 — 밸런스 테스트가 못 보는
   * 두 번째 출처가 생긴다.
   *
   * ⚠️ **둘 다 사치품이다.** 멘탈 회복 폭이 게임에서 가장 크고 그만큼 비싸다 —
   * 초반에는 손이 안 닿고, 물가가 오르면 다시 손이 닿지 않게 된다. 그것이 이 둘의 자리다.
   */
  {
    /*
     * 공연 관람. 영화(멘탈 8 / 15,000원)보다 크게 회복하고 그만큼 비싸다.
     * 감수성이 붙는 것도 영화와 같지만 폭이 크다 — 큰 소리를 직접 듣는 것의 값이다.
     */
    id: 'concert',
    label: '공연 관람',
    icon: 'fluent-color:mic-24',
    category: 'leisure',
    description: '큰 소리를 직접 듣는다. 끝나고 나오면 귀가 먹먹하다.',
    /* ⚠️ **오후 전용** — 공연은 저녁에 한다. 노24 예매가 잡아 주는 예약도 오후 슬롯이라
       (`planWeekly`·`firstFreeSlot`이 오후에 건다) 서로 어긋나지 않는다. */
    requiresSlot: 'afternoon',
    /* ⚠️ 음악이 조금 붙는 것은 **듣는 쪽**이라 그렇다 — 만드는 쪽(`compose`)이 주 공급원이고
       여기는 부수 효과다(러닝과 물류센터의 관계와 같다). */
    effects: { mental: 14, sensitivity: 8, creativity: 3, music: 2, stamina: -18, money: -60000 },
    requires: { stamina: 18, money: 60000 },
  },
  {
    /*
     * 여행. **이 게임에서 가장 큰 멘탈 회복이자 가장 큰 지출**이다.
     *
     * ⚠️ **여러 턴을 먹게 만들지 않았다.** 이 게임의 활동은 전부 1턴이고, 며칠짜리 활동은
     * 예약·정산·번아웃이 전부 새 규칙을 요구한다(설계자가 구독을 뺀 것과 같은 판단).
     * "며칠 다녀왔다"는 감각은 **행동력 소모와 금액**이 대신 진다.
     */
    id: 'travel',
    label: '여행 (장거리)',
    icon: 'fluent-color:beach-24',
    category: 'leisure',
    description: '멀리 간다. 돌아오면 통장은 가벼워지고 머리는 맑아진다.',
    effects: { mental: 28, sensitivity: 12, creativity: 5, stamina: -30, money: -250000 },
    requires: { stamina: 30, money: 250000 },
  },
  {
    /*
     * 가까운 여행. **장거리와 성격을 갈라 두는 것이 핵심이다** — 값이 비례해서 줄기만 하면
     * 둘 중 하나가 언제나 정답이 된다. 여기는 회복 폭이 절반이지만 **행동력도 덜 먹고**
     * 값은 1/3 남짓이라, "이번 슬롯에 감당할 수 있는가"가 실제 판단이 된다.
     *
     * ⚠️ 상품(국내·근거리)이 이 활동을 가리킨다 — 같은 활동을 가리키는 상품끼리는
     * 값이 같다(`data/trips.ts`, 알바몬 공고와 같은 규칙).
     */
    id: 'travel-near',
    label: '여행 (근거리)',
    icon: 'fluent-color:beach-24',
    category: 'leisure',
    description: '기차나 배로 닿는 곳에 다녀온다. 돌아오는 길이 길지 않다.',
    effects: { mental: 14, sensitivity: 6, stamina: -20, money: -90000 },
    requires: { stamina: 20, money: 90000 },
  },
  {
    /* 창의력의 주 공급원. 돈은 안 들지만 행동력·멘탈을 가장 많이 먹는다. */
    id: 'writing',
    label: '글쓰기',
    icon: 'fluent-color:edit-24',
    category: 'study',
    description: '빈 문서를 열어 두고 커서만 본다. 그러다 한 문단이 나온다.',
    effects: { creativity: 7, vocabulary: 3, stamina: -12, mental: -6 },
    requires: { stamina: 12 },
  },
  {
    /*
     * 도덕·평판은 상한이 100이라 상승폭이 작다(위 규칙 1). 대신 **멘탈이 오르는
     * 유일한 고강도 활동**이다 — 몸은 힘든데 마음은 나아지는 종류의 일.
     */
    /*
     * 본가 방문. **관계 셋 중 활동이 없던 하나라 여기만 새로 만들었다**
     * (민지는 `social`, 동아리는 `club`을 그대로 쓴다 — `data/relations.ts`).
     *
     * ⚠️ **돈을 주지 않는다.** 용돈을 받게 하면 가족이 수입원이 되어 "만나러 간다"가
     * 벌이가 된다(행사가 수입원이 아닌 것과 같은 규칙). 대신 차비가 나가고,
     * 얻는 것은 멘탈과 예의범절·도덕이다.
     * ⚠️ 번아웃 키를 `social`과 공유하지 않는다 — 사람을 만나는 종류가 다르고,
     * 공유하면 관계 셋을 번갈아 채우는 것이 곧 번아웃이 되어 부가엔딩이 함정이 된다.
     */
    /* ⚠️ **주말 전용** — 반찬통을 받아 오는 일은 평일 낮에 하지 않는다. 가족 호감도의
       주 공급원이므로 주말이 "사람을 보는 날"이라는 성격을 여기서 얻는다. */
    requiresWeek: 'weekend',
    id: 'family-visit',
    label: '본가 방문',
    icon: 'fluent-color:people-home-24',
    category: 'relation',
    description: '반찬통을 받아 온다. 나올 때 손이 무겁고 마음은 좀 가볍다.',
    effects: { mental: 16, manners: 2, morality: 2, stamina: -12, money: -9000 },
    requires: { stamina: 12, money: 9000 },
  },
  {
    /* ⚠️ **주말 전용**(2026-08-09) — 설명이 이미 "주말 아침에 몸을 쓴다"였는데 여태
       아무 때나 됐다. 도덕의 주 공급원이라 요일을 좁히는 대신 값은 그대로 둔다. */
    requiresWeek: 'weekend',
    id: 'volunteer',
    label: '봉사활동',
    icon: 'fluent-color:person-heart-24',
    category: 'giving',
    description: '주말 아침에 몸을 쓴다. 끝나고 받은 컵라면이 이상하게 맛있다.',
    effects: { morality: 5, reputation: 3, stamina: -20, mental: 2 },
    requires: { stamina: 20 },
  },
  {
    /* 평판을 가장 싸게 올리는 길. 대신 멘탈이 깎인다 — 남의 삶을 계속 보게 되므로. */
    id: 'sns',
    label: 'SNS 활동',
    icon: 'fluent-color:megaphone-loud-24',
    category: 'relation',
    description: '피드를 올리고 남의 피드를 내린다. 숫자가 조금 오른다.',
    effects: { reputation: 5, charm: 2, stamina: -6, mental: -4 },
    requires: { stamina: 6 },
  },
  {
    /* 친화력의 주 공급원. 회비가 나가는 대신 멘탈이 오른다(메신저와 같은 성격). */
    id: 'club',
    label: '동아리 모임',
    icon: 'fluent-color:people-community-24',
    category: 'relation',
    description: '회비를 내고 앉아 있는다. 이름을 외워 주는 사람이 하나씩 는다.',
    /* ⚠️ **오후 전용** — 모임은 저녁에 모인다. 멘탈 회복처 넷 중 하나이므로 오전에
       기댈 곳이 사라지지 않도록 나머지 셋(게임·영화·러닝)은 그대로 둔다. */
    requiresSlot: 'afternoon',
    effects: { sociability: 6, charm: 3, mental: 5, stamina: -12, money: -10000 },
    requires: { stamina: 12, money: 10000 },
  },
  {
    /*
     * 운동 스탯의 주 공급원. ⚠️ **2026-08-08 통합 뒤 운동 계열이 전부 이 스탯으로 모였다**
     * (예전에는 헬스장·운동이 `maxStamina`라는 그릇을 키웠고 운동 스탯은 러닝만 올렸다).
     * 돈이 한 푼도 안 드는 대신 체력을 가장 많이 먹는다.
     */
    id: 'running',
    label: '러닝',
    icon: 'fluent-color:heart-24',
    category: 'body',
    description: '해 지기 전에 천변을 뛴다. 3km쯤에서 생각이 멈춘다.',
    effects: { athletics: 8, stamina: -18, mental: 4 },
    requires: { stamina: 18 },
  },
  {
    /*
     * 예의범절의 주 공급원 (2026-08-05 스탯 신설과 함께).
     * ⚠️ 상승폭이 작은 것은 한때 상한이 100이었기 때문이고, **2026-08-08에 999로 올랐다**
     * (설계자 지시). 폭을 올릴지는 별개 판단이라 그대로 뒀다 — 지금 +5면 랭크 C(=100)까지
     * 스무 번이고, 그 문턱에 단발 이벤트가 하나 걸려 있다(`data/rankEvents.ts`).
     *
     * **비용의 성격을 기존 활동과 겹치지 않게 잡았다**(위 규칙 2): 돈도 안 들고 몸도 거의
     * 안 쓰는 대신 **멘탈만 깎는다**. 하기 싫은 걸 참고 하는 종류의 일이라 그렇다 —
     * 행동력을 크게 먹이면 "몸 쓰는 활동"으로 읽혀 러닝·봉사와 성격이 겹친다.
     */
    id: 'etiquette',
    label: '예절 교육',
    icon: 'fluent-color:people-community-24',
    category: 'relation',
    description: '온라인 비즈니스 매너 강의를 튼다. 명함은 두 손으로 받는 거였다.',
    effects: { manners: 5, sociability: 1, stamina: -8, mental: -4 },
    requires: { stamina: 8 },
  },
  {
    /*
     * 예의범절을 **부수적으로** 올리는 자리. 주 공급원(`etiquette`)이 하나뿐이면
     * 그 활동은 선택지가 아니라 통행세가 된다(멘탈 회복처를 넷으로 늘린 것과 같은 판단).
     * 대신 상승폭은 절반이고 회비가 든다 — 싸게 올리려면 여전히 예절 교육이 낫다.
     */
    id: 'tea-ceremony',
    label: '다도 모임',
    icon: 'fluent-color:food-24',
    category: 'giving',
    description: '어른들 틈에 앉아 잔을 받는다. 두 손의 위치를 계속 지적받는다.',
    effects: { manners: 3, sensitivity: 2, mental: 3, stamina: -10, money: -8000 },
    requires: { stamina: 10, money: 8000 },
  },
  {
    /* 게임 스탯의 주 공급원. 멘탈을 채우는 game과 달리 **깎는다** — 이기지 못하면 그렇다. */
    id: 'esports',
    label: '랭크 게임',
    icon: 'fluent-color:trophy-24',
    category: 'leisure',
    description: '한 판만 하려다 승급전에 걸린다. 이겨도 기분이 좋지만은 않다.',
    effects: { gaming: 7, reputation: 2, stamina: -15, mental: -3 },
    requires: { stamina: 15 },
  },
  /* ── 랭크 이벤트가 여는 활동 4종 (2026-08-08) ────────────────────────
   * ⚠️ **바탕화면에 안 뜬다**(`onDesktop` 없음). 통로는 각자의 대화방 제안 하나뿐이고,
   * 그 방은 랭크 이벤트가 연다(`data/rankEvents.ts`). 활동만 있고 방이 없으면 스케줄러
   * 고르기 판에는 뜨는데 시작할 길이 없는 활동이 된다.
   * ⚠️ **번아웃 키를 알바(`work`)와 나눠 쓰지 않는다** — `WORK_ACTIVITIES` 불변식
   *    ("알바는 넷")이 깨진다(`stream`·`gig`와 같은 판단).
   */
  {
    /* 레이드 파티. 게임과 사람이 함께 오는 자리라 **멘탈 회복처**이기도 하다. */
    id: 'raid',
    label: '레이드 파티',
    icon: 'fluent-color:puzzle-piece-24',
    category: 'leisure',
    description: '고정팟 두 시간. 합이 맞으면 시간이 어떻게 가는지 모른다.',
    effects: { gaming: 7, sociability: 3, mental: 10, stamina: -12 },
    requires: { stamina: 12 },
    burnoutKey: 'raid',
  },
  {
    /* 독서모임. 혼자 읽는 것(`reading`)과 갈리는 것은 **말로 옮기는 몫**이다. */
    id: 'bookclub',
    label: '독서모임',
    icon: 'fluent-color:book-open-24',
    category: 'relation',
    description: '한 권을 두고 한 시간을 떠든다. 읽은 것보다 들은 것이 많다.',
    effects: { vocabulary: 5, sociability: 3, knowledge: 2, mental: 4, stamina: -12 },
    requires: { stamina: 12 },
    burnoutKey: 'bookclub',
  },
  {
    /*
     * 모델 촬영. ⚠️ **알바가 아니다**(`scalesWithWage` 없음) — 물가 배율을 안 타는
     * 고정 보수라 후반에는 값이 떨어진다(정규직 급여·원고료와 같은 장치).
     */
    id: 'model-shoot',
    label: '모델 촬영',
    icon: 'fluent-color:camera-24',
    category: 'living',
    description: '동네 미용실 홍보 사진을 찍는다. 웃는 얼굴로 세 시간이 지나간다.',
    effects: { money: 70000, charm: 3, reputation: 2, stamina: -20, mental: -6 },
    requires: { stamina: 20 },
    burnoutKey: 'shoot',
  },
  {
    /* 학원 특강. 과외(지식 60)보다 훨씬 위의 자리라 보수도 위다. */
    /* ⚠️ **평일 전용** — 학원 특강은 주중 저녁 자리다. 주말에 몰아서 하면 요일이
       다시 아무 뜻 없는 값이 된다(주말 전용 둘과 짝을 이룬다). */
    requiresWeek: 'weekday',
    id: 'lecture',
    label: '학원 특강',
    icon: 'fluent-color:board-24',
    category: 'living',
    description: '스무 명 앞에서 두 시간을 말한다. 끝나면 목이 쉬어 있다.',
    effects: { money: 130000, knowledge: 3, vocabulary: 3, manners: 1, stamina: -24, mental: -8 },
    requires: { stamina: 24 },
    burnoutKey: 'lecture',
  },
  /*
   * ── 생활 등급이 여는 것 2종 (2026-08-14) ───────────────────────
   *
   * ⚠️ **아래 S 일감과 축이 다르다.** 특화의 보상은 돈이고 두루 올린 것의 보상은
   * **폭**이다 — 그래서 이 둘은 여러 스탯을 조금씩 올린다. 금액도 S 일감(380~520k)보다
   * 낮게 둔다: 생활 등급은 이미 "다 올렸다"는 뜻이라 돈까지 더 주면 그쪽이 정답이 된다.
   */
  {
    /* 생활 등급 C. 상위 12종 평균 10%라 고루 올린 판이 대략 90일쯤에 닿는다. */
    id: 'mentor-meet',
    label: '건너건너 모임',
    icon: 'fluent-color:people-community-24',
    category: 'relation',
    description: '매주 다른 사람이 와서 자기가 아는 것을 푼다. 오늘은 목수였다.',
    effects: {
      knowledge: 2,
      sociability: 3,
      sensitivity: 2,
      manners: 1,
      mental: 3,
      stamina: -12,
      money: -20000,
    },
    requires: { stamina: 12, money: 20000 },
    burnoutKey: 'meet',
  },
  {
    /* 생활 등급 B(상위 12종 평균 30%). 두루 올린 사람만 쓸 수 있는 글이라 문턱이 여기다. */
    id: 'column-write',
    label: '칼럼 기고',
    icon: 'fluent-color:document-24',
    category: 'living',
    description: '살아온 이야기를 원고지에 옮긴다. 한 줄에 몇 달씩 들어 있다.',
    effects: {
      money: 260000,
      vocabulary: 4,
      creativity: 2,
      reputation: 3,
      stamina: -20,
      mental: -6,
    },
    requires: { stamina: 20 },
    burnoutKey: 'gig',
  },
  {
    /*
     * 생활 등급 A(상위 12종 평균 50%). 칼럼(생활 B)의 윗칸 — 같은 이야기가 책이 된다.
     * ⚠️ **돈은 S 일감(380~520k) 아래**다(이 구역 머리말의 규칙): 생활 등급의 보상은
     * 돈이 아니라 폭이고, 그래서 올리는 스탯이 넷이다.
     */
    id: 'essay-write',
    label: '에세이 원고',
    icon: 'fluent-color:book-star-24',
    category: 'living',
    description: '칼럼으로 쓰던 이야기를 책 한 권 분량으로 늘린다. 목차만 사흘을 잡았다.',
    effects: {
      money: 300000,
      vocabulary: 4,
      sensitivity: 2,
      creativity: 3,
      reputation: 3,
      stamina: -24,
      mental: -8,
    },
    requires: { stamina: 24 },
    burnoutKey: 'gig',
  },
  /*
   * ── 사치 소비 2종 — 후반 돈 싱크의 능동 갈래 (2026-08-17) ────────────
   *
   * ⚠️ **돈을 스탯·회복으로 환전하는 반복 소비다**(고정비 싱크는 사치 집 —
   * `data/housing.ts` 사치 구역). 값의 근거: 공짜 회복처(게임 멘탈 18)가 있으므로
   * 이쪽의 몫은 멘탈이 아니라 **취침 밖에서는 희소한 체력 회복**이다 — 멘탈만 크게
   * 주면 가격이 문턱인 상위 호환이 되어 회복처 넷이 죽는다.
   * ⚠️ **`burnoutKey: 'resort'`를 둘이 나눠 쓴다** — 번갈아 다니며 무한 회복을
   * 사는 것을 막는다(알바 넷이 `work` 하나를 쓰는 것과 같은 규칙).
   */
  {
    id: 'spa-day',
    label: '스파 데이',
    icon: 'fluent-color:person-heart-24',
    category: 'leisure',
    description: '더운 물에 한 시간. 나올 때는 어깨가 한 뼘 내려가 있다.',
    effects: { mental: 10, stamina: 12, charm: 2, money: -120000 },
    requires: { money: 120000 },
    burnoutKey: 'resort',
  },
  {
    id: 'hocance',
    label: '호캉스',
    icon: 'fluent-color:weather-sunny-low-24',
    category: 'leisure',
    description: '체크인하고 아무 데도 안 간다. 창밖 도시가 남의 일처럼 흘러간다.',
    effects: { mental: 18, stamina: 25, sensitivity: 2, money: -300000 },
    requires: { money: 300000 },
    burnoutKey: 'resort',
  },
  {
    /* 생활 등급 S(상위 12종 평균 75%). 무대에서 삶 전체를 말한다 — 어느 한 스탯이 아니라
       살아온 순서가 자격인 일이라 이 축의 끝쪽에 있다. */
    id: 'stage-talk',
    label: '강연 무대',
    icon: 'fluent-color:mic-24',
    category: 'living',
    description: '조명 아래에서 사십 분. 무엇을 잘하느냐가 아니라 어떻게 살았느냐를 물어 왔다.',
    effects: {
      money: 340000,
      vocabulary: 3,
      charm: 3,
      sociability: 3,
      reputation: 4,
      manners: 2,
      stamina: -26,
      mental: -8,
    },
    requires: { stamina: 26 },
    burnoutKey: 'gig',
  },
  /*
   * ── S 등급이 여는 일감 5종 (2026-08-14) ─────────────────────────
   *
   * ⚠️ **A 등급 일감(학원 특강 130,000원 · 유지보수 90,000원)의 세 배 안팎이다.**
   * 그 격차가 S까지 올릴 이유 자체다 — 상한의 75%는 한 스탯에 특화해야 겨우 닿는
   * 자리라(`rankEvents.test.ts`가 도달 일수를 지킨다), 보상이 A와 비슷하면 아무도 안 올린다.
   *
   * ⚠️ **주간 예약(`weekly`)을 붙이지 않는다** — 요일 1~6이 이미 다 찼고
   * (`messages.ts`), 무엇보다 이 일들은 정기권이 아니라 **부를 때 가는 일**이다
   * (학원 특강·유지보수와 같은 규칙).
   *
   * ⚠️ **`burnoutKey: 'gig'`을 공유한다.** 다섯을 돌려 가며 무한히 벌 수 있으면
   * 후반이 통째로 돈 문제에서 풀려난다 — 한 키를 나눠 써야 연속 실행이 실제로 깎인다.
   */
  {
    /* 지식 S(=749). 학원 특강(지식 A)의 윗칸이다 — 같은 "가르치는 일"인데 상대가 바뀐다. */
    id: 'univ-lecture',
    label: '대학 초빙 강의',
    icon: 'fluent-color:book-open-lightbulb-24',
    category: 'living',
    description: '강의실 뒤쪽까지 사람이 찼다. 아는 것을 말하는 일이 이렇게 값이 될 줄은 몰랐다.',
    effects: { money: 380000, knowledge: 4, vocabulary: 4, reputation: 2, stamina: -28, mental: -10 },
    requires: { stamina: 28 },
    burnoutKey: 'gig',
  },
  {
    /* 예술 S(=749). 공모전이 단발 상금이라면 이쪽은 **부를 때 가는 일**이다. */
    id: 'solo-exhibit',
    label: '개인전 준비',
    icon: 'fluent-color:paint-brush-24',
    category: 'living',
    description: '벽에 걸릴 순서를 정한다. 몇 년치 그림이 한 줄로 늘어서 있다.',
    effects: { money: 450000, art: 4, creativity: 3, reputation: 3, stamina: -30, mental: -10 },
    requires: { stamina: 30 },
    burnoutKey: 'gig',
  },
  {
    /* IT S(=749). 유지보수(IT B)의 윗칸 — 남의 코드를 고치던 사람이 처음부터 짠다. */
    id: 'sw-contract',
    label: '외주 개발 계약',
    icon: 'fluent-color:code-24',
    category: 'living',
    description: '이번엔 남의 코드를 고치는 게 아니라 빈 폴더에서 시작한다. 견적서에 내 이름이 있다.',
    effects: { money: 520000, tech: 5, knowledge: 2, charm: -2, sensitivity: -2, stamina: -32, mental: -12 },
    requires: { stamina: 32 },
    burnoutKey: 'gig',
  },
  {
    /* 음악 S(=749). 작곡이 주 공급원(7/턴)이라 특화하면 후반에 닿는다. */
    id: 'ost-work',
    label: 'OST 작업',
    icon: 'fluent-color:headphones-24',
    category: 'living',
    description: '삼십 초짜리 곡에 마감이 붙었다. 남의 이야기에 내 소리를 얹는 일이다.',
    effects: { money: 400000, music: 4, sensitivity: 3, stamina: -28, mental: -10 },
    requires: { stamina: 28 },
    burnoutKey: 'gig',
  },
  {
    id: 'fund-advice',
    label: '자문 계약',
    icon: 'fluent-color:data-trending-24',
    category: 'living',
    description: '남의 돈이 어디로 갈지를 말해 주고 받는 돈. 틀리면 안 된다는 무게가 다르다.',
    /* 경제 S(=749).
       ⚠️ **"경제 활동은 돈을 만들지 않는다"는 규칙의 유일한 예외다**(project-context).
       그 규칙은 **경제 스탯을 올리는 활동**(`finance-study`)이 은행·주식과 수입원을
       겹치지 말라는 뜻이었다. 이건 반대 방향이다 — 다 올린 **결과**를 일로 바꾸는
       자리이고, 지식 S가 강의가 되는 것과 같은 구조다. 경제를 올려 주는 몫은 작게 둔다. */
    effects: { money: 480000, finance: 3, reputation: 2, stamina: -26, mental: -12 },
    requires: { stamina: 26 },
    burnoutKey: 'gig',
  },
  {
    /*
     * 정기 유지보수. **IT B가 여는 방(`devcrew`)의 제안이 실행하는 활동**이고, 학원 특강이
     * 지식 A에 붙은 것과 같은 자리다 — 쌓은 스탯이 일이 되어 돌아오는 통로.
     * ⚠️ **그몽 일감이 아니다.** 그쪽은 "도구가 열고 스탯은 결과로 돌아온다"가 규칙이라
     *    일감에 스탯 잠금을 걸지 않는다(`data/gigs.ts` 머리말). 스탯이 여는 일은 이렇게
     *    **대화방 제안**으로 온다 — 그몽에 잠금이 두 겹이 되지 않는 것이 그 규칙의 값이다.
     * ⚠️ 보수는 특강(130,000)보다 아래다: 남의 코드를 봐 주는 자리이고 준비가 필요 없다.
     */
    id: 'maintenance',
    label: '유지보수 의뢰',
    icon: 'fluent-color:code-24',
    category: 'living',
    description: '남이 짠 코드를 연다. 고칠 곳은 세 줄인데 이해하는 데 두 시간이 걸린다.',
    effects: { money: 90000, tech: 4, knowledge: 1, charm: -1, sensitivity: -1, stamina: -20, mental: -7 },
    requires: { stamina: 20 },
    burnoutKey: 'gig',
  },
  {
    /*
     * 음악 스탯(2026-08-08 신설)의 **주 공급원**. 돈이 안 드는 대신 멘탈을 깎는다 —
     * 안 되는 날에는 네 마디에서 멈추기 때문이다(예절 교육과 같은 비용의 성격).
     * ⚠️ **감수성이 아니라 음악을 올린다**: 감수성은 받아들이는 쪽(공연·영화·독서),
     *    음악은 만드는 쪽이다. 둘을 한 스탯으로 묶으면 공연만 봐도 곡을 쓰게 된다.
     */
    id: 'compose',
    label: '작곡·연습',
    icon: 'fluent-color:headphones-24',
    category: 'leisure',
    description: '헤드폰을 쓰고 네 마디를 백 번 고친다. 어제 좋았던 게 오늘은 아니다.',
    effects: { music: 7, creativity: 2, sensitivity: 1, stamina: -14, mental: -5 },
    requires: { stamina: 14 },
  },
  {
    /*
     * 경제 스탯(2026-08-08 신설)의 **주 공급원**. 돈을 쓰지 않고 버는 것도 아니다 —
     * 읽고 정리하는 시간이라 지식·어휘력이 조금 붙는다.
     * ⚠️ **소지금을 만들지 않는다**: 경제를 올리는 활동이 돈까지 주면 은행·주식과
     *    수입원이 겹치고, 이 스탯은 "가진 돈"이 아니라 "읽는 눈"이라는 뜻도 흐려진다.
     */
    id: 'finance-study',
    label: '경제 공부',
    icon: 'fluent-color:data-trending-24',
    category: 'study',
    description: '경제 기사와 공시를 읽는다. 어제 오른 이유는 오늘 내린 이유이기도 하다.',
    effects: { finance: 7, knowledge: 2, vocabulary: 1, stamina: -14, mental: -4 },
    requires: { stamina: 14 },
  },
  {
    /*
     * 친화력 C가 여는 동네 오픈채팅의 실행부(2026-08-08). ⚠️ **`club`을 재활용하지 않았다** —
     * 동아리는 회비를 내고 정기적으로 가는 곳이고 이쪽은 부르면 가는 일회성이라, 한 활동에
     * 묶으면 확인창의 비용 표시가 둘 중 한쪽에 대해 거짓이 된다.
     * ⚠️ **번아웃 키는 `club`을 함께 쓴다** — 둘 다 가서 사람들과 앉아 있는 일이라,
     * 키를 가르면 번갈아 가며 연속 노동의 대가를 피해 간다(알바 넷과 같은 규칙).
     */
    id: 'housewarming',
    label: '집들이 가기',
    icon: 'fluent-color:people-home-24',
    category: 'relation',
    description: '손에 뭐라도 들고 간다. 이름을 두 번씩 말하고 나면 다들 웃고 있다.',
    effects: { sociability: 7, charm: 2, manners: 2, mental: 6, stamina: -14, money: -20000 },
    requires: { stamina: 14, money: 20000 },
    burnoutKey: 'club',
  },
  {
    /*
     * 경제 B가 여는 투자 스터디의 실행부. ⚠️ **소지금을 만들지 않는다**(`finance-study`와
     * 같은 규칙) — 경제를 올리는 자리가 돈까지 주면 은행·주식과 수입원이 겹친다.
     * 발표라서 평판·어휘력이 대신 붙는다.
     */
    id: 'study-talk',
    label: '스터디 발표',
    icon: 'fluent-color:data-trending-24',
    category: 'study',
    description: '차트 세 장으로 삼십 분을 말한다. 질문이 제일 어려운 부분이었다.',
    effects: { finance: 6, vocabulary: 3, reputation: 2, stamina: -16, mental: -6 },
    requires: { stamina: 16 },
  },
  {
    /*
     * 밴드 셋(2026-08-08 — 음악 A가 여는 축). **전부 오후 전용이다**: 합주도 공연도 저녁의
     * 일이고, 무엇보다 **하루에 많아야 하나만** 할 수 있어야 밴드가 판을 연장하지 못한다
     * (수입 상한의 근거는 `data/band.ts` 주석이고 `band.test.ts`가 지킨다).
     * ⚠️ **번아웃 키 `band` 하나를 셋이 나눠 쓴다** — 갈라 두면 합주·공연·앨범을 돌려 가며
     *    연속 노동의 대가를 피해 간다(알바 넷이 `work`를 공유하는 것과 같은 이유).
     */
    id: 'band-practice',
    label: '밴드 합주',
    icon: 'fluent-color:mic-24',
    category: 'leisure',
    description: '넷이 같은 마디에서 어긋난다. 열 번째쯤 우연히 맞고, 그 순간을 다들 안다.',
    effects: { music: 5, sociability: 4, mental: 4, stamina: -18 },
    requires: { stamina: 18 },
    requiresSlot: 'afternoon',
    buildsBandSkill: true,
    burnoutKey: 'band',
  },
  {
    /*
     * ⚠️ **`effects.money`가 없는 것이 규칙이다** — 보수는 숙련도의 함수라 활동 데이터에
     *    적을 수가 없고, `systems/band.ts`의 `bandPayFor`가 정해 `runActivity`가 얹는다
     *    (그몽 일감이 보수를 갖고 도구 활동은 안 갖는 것과 같은 방향).
     */
    id: 'band-live',
    label: '밴드 공연',
    icon: 'fluent-color:mic-24',
    category: 'leisure',
    description: '스무 명 앞에서 마흔 분. 두 곡째부터는 손이 알아서 간다.',
    effects: { music: 6, reputation: 2, sociability: 3, mental: 6, stamina: -26 },
    requires: { stamina: 26 },
    requiresSlot: 'afternoon',
    requiresBandSkill: 8,
    burnoutKey: 'band',
  },
  {
    id: 'band-album',
    label: '앨범 발매',
    icon: 'fluent-color:headphones-24',
    category: 'leisure',
    description: '여섯 곡을 묶어 올린다. 첫 정산 메일이 오기까지가 제일 길다.',
    effects: { music: 8, reputation: 3, creativity: 3, stamina: -30, mental: -4 },
    requires: { stamina: 30 },
    requiresSlot: 'afternoon',
    requiresBandSkill: 20,
    burnoutKey: 'band',
  },
]

/**
 * 알바 활동 전체. 번아웃 키를 공유한다는 사실이 곧 "이것들은 같은 종류의 일"이라는 정의다 —
 * 목록을 따로 적으면 알바를 늘릴 때 한쪽만 고치는 사고가 난다(알바몬 공고가 이 목록을 본다).
 */
export const WORK_ACTIVITIES: Activity[] = ACTIVITIES.filter((a) => a.burnoutKey === 'work')

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}

/** 그 묶음에 속한 활동. 배열 순서를 그대로 따른다. */
export function activitiesOf(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category)
}

/**
 * **나중에 실행하기로 예약할 수 있는** 활동(스케줄러 고르기 판·바탕화면 바로 가기).
 *
 * ⚠️ `activitiesOf`와 따로 있는 이유: 대상을 골라야만 뜻이 성립하는 활동이 생겼다
 * (지원서 제출 — `requiresPick`). 그렇다고 `activitiesOf`에서 빼면 "묶음을 모두 합치면
 * 활동 전체가 된다"는 불변식이 깨져 다른 화면이 그 활동을 영영 못 보게 된다.
 */
export function plannableOf(category: ActivityCategory): Activity[] {
  return activitiesOf(category).filter((a) => !a.requiresPick)
}

/**
 * 그 물건이 열어 주는 활동.
 *
 * 쇼핑 화면이 "이걸 왜 사나"에 답하려면 필요한데, 아이템 쪽에 활동 id를 또 적으면
 * 같은 관계가 두 곳에 생겨 한쪽만 고치는 사고가 난다. `requiresItem` 하나에서 뒤집어 찾는다.
 */
export function activitiesUnlockedBy(itemId: string): Activity[] {
  // ⚠️ `requiresItem`은 문자열이거나 **배열("그중 아무거나 하나")**이다. 문자열만 보면
  //    타블렛 둘이 여는 클립스튜디오가 두 가게 화면 어디에도 "이걸 왜 사나"를 못 적는다.
  return ACTIVITIES.filter((a) =>
    Array.isArray(a.requiresItem) ? a.requiresItem.includes(itemId) : a.requiresItem === itemId,
  )
}
