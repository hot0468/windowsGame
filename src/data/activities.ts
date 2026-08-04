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
     * 러닝만 꾸준히 하면 열린다. `maxStamina`가 조금 붙는 것은 부수 효과이지 목적이 아니다
     * (그릇을 키우려면 운동 활동이 여전히 더 싸다).
     */
    id: 'work-logistics',
    label: '알바 (물류센터)',
    icon: 'fluent-color:toolbox-24',
    category: 'living',
    description: '새벽 상하차. 끝나면 손가락이 안 펴지지만 일당이 그날 들어온다.',
    effects: { money: 95000, maxStamina: 2, stamina: -35, mental: -12 },
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
    id: 'exercise',
    label: '운동',
    icon: 'fluent-color:sport-24',
    category: 'body',
    description: '오늘 행동력을 태워 체력을 키운다.',
    effects: { maxStamina: 4, stamina: -20, mental: 3 },
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
    effects: { mental: 18, gaming: 4, stamina: -5, knowledge: -1 },
    requires: { stamina: 5 },
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
    effects: { maxStamina: 6, stamina: -20, mental: 2, money: -15000 },
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
    effects: { maxStamina: 6, stamina: -20, mental: 2 },
    requires: { stamina: 20 },
    requiresItem: 'gym-pass',
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
    effects: { sensitivity: 6, creativity: 3, mental: 8, stamina: -15, money: -15000 },
    requires: { stamina: 15, money: 15000 },
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
    effects: { sociability: 6, charm: 3, mental: 5, stamina: -12, money: -10000 },
    requires: { stamina: 12, money: 10000 },
  },
  {
    /*
     * 운동 스탯의 주 공급원. ⚠️ `athletics`(운동)와 `maxStamina`(체력)는 다른 스탯이다 —
     * 기존 운동 활동들은 그릇(maxStamina)만 키웠고 운동 스탯은 아무도 안 올렸다.
     * 돈이 한 푼도 안 드는 대신 행동력을 가장 많이 먹는다.
     */
    id: 'running',
    label: '러닝',
    icon: 'fluent-color:heart-24',
    category: 'body',
    description: '해 지기 전에 천변을 뛴다. 3km쯤에서 생각이 멈춘다.',
    effects: { athletics: 6, maxStamina: 2, stamina: -18, mental: 4 },
    requires: { stamina: 18 },
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
]

/**
 * 알바 활동 전체. 번아웃 키를 공유한다는 사실이 곧 "이것들은 같은 종류의 일"이라는 정의다 —
 * 목록을 따로 적으면 알바를 늘릴 때 한쪽만 고치는 사고가 난다(알바몬 공고가 이 목록을 본다).
 */
export const WORK_ACTIVITIES: Activity[] = ACTIVITIES.filter((a) => a.burnoutKey === 'work')

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}

/** 그 묶음에 속한 활동. 고르기 판이 배열 순서대로 그린다. */
export function activitiesOf(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category)
}

/**
 * 그 물건이 열어 주는 활동.
 *
 * 쇼핑 화면이 "이걸 왜 사나"에 답하려면 필요한데, 아이템 쪽에 활동 id를 또 적으면
 * 같은 관계가 두 곳에 생겨 한쪽만 고치는 사고가 난다. `requiresItem` 하나에서 뒤집어 찾는다.
 */
export function activitiesUnlockedBy(itemId: string): Activity[] {
  return ACTIVITIES.filter((a) => a.requiresItem === itemId)
}
