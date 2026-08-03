/**
 * 12종 스탯.
 * - 소모 자원: stamina(일일 소모/취침 회복), mental(0~100), money
 * - 성장 스탯: maxStamina(운동으로 영구 상승, 상한 200) + GROWTH_STAT_KEYS 9종(상한 999)
 */
export interface Stats {
  stamina: number
  maxStamina: number
  mental: number
  money: number
  /** 지식 */
  knowledge: number
  /** 매력 */
  charm: number
  /** 감수성 */
  sensitivity: number
  /** 평판 */
  reputation: number
  /** 도덕 */
  morality: number
  /** 창의력 */
  creativity: number
  /** 친화력 */
  sociability: number
  /** 어휘력 */
  vocabulary: number
  /** 운동 */
  athletics: number
}

/**
 * 999 상한을 공유하는 성장 스탯 키.
 * maxStamina는 상한 규칙이 다르므로(200) 여기에 넣지 않는다.
 */
export const GROWTH_STAT_KEYS = [
  'knowledge',
  'charm',
  'sensitivity',
  'reputation',
  'morality',
  'creativity',
  'sociability',
  'vocabulary',
  'athletics',
] as const

export type GrowthStatKey = (typeof GROWTH_STAT_KEYS)[number]

/** 스탯 한국어 라벨. UI는 이 표만 참조한다. */
export const STAT_NAMES: Record<keyof Stats, string> = {
  stamina: '체력',
  maxStamina: '최대 체력',
  mental: '멘탈',
  money: '소지금',
  knowledge: '지식',
  charm: '매력',
  sensitivity: '감수성',
  reputation: '평판',
  morality: '도덕',
  creativity: '창의력',
  sociability: '친화력',
  vocabulary: '어휘력',
  athletics: '운동',
}

/** 활동이 스탯에 주는 변화량. 없는 키는 변화 없음. */
export type StatDelta = Partial<Record<keyof Stats, number>>

/** 하루의 두 슬롯. */
export type Slot = 'morning' | 'afternoon'

/**
 * 아이콘 식별자. `"세트명:아이콘명"` 형태의 문자열이다 (예: `"fluent-emoji-flat:books"`).
 * 아이콘 렌더링 라이브러리에 의존하지 않도록 타입은 문자열 별칭으로만 둔다 —
 * 실제 아이콘 데이터 로딩은 `src/icons/bootstrap.ts`가, 이름 목록은 `src/data/`가 책임진다.
 */
export type IconName = string

/** 활동 정의. 수치는 전부 data/에만 존재한다. */
export interface Activity {
  id: string
  label: string
  icon: IconName
  description: string
  /** 스탯 변화량. money는 알바비 배율이 적용된다. */
  effects: StatDelta
  /** 실행에 필요한 최소 스탯. 미달이면 실행 불가. */
  requires?: Partial<Record<keyof Stats, number>>
  /** 알바비 배율(economy)을 money에 적용할지 여부. 알바 활동만 true. */
  scalesWithWage?: boolean
  /** 바탕화면에 아이콘을 띄울지 여부. 나머지 활동은 정의만 보존된다. */
  onDesktop?: boolean
}

/**
 * windowStore가 렌더링할 창의 종류.
 * 'exe'는 활동 실행 창(activityId 동반), 'ending'은 엔딩,
 * 'browser'는 가짜 웹 브라우저, 'stub'은 아직 구현되지 않은 앱의 안내 창이다.
 */
export type WindowKind = 'exe' | 'ending' | 'stub' | 'browser'

/**
 * 바탕화면에 놓이는 항목. 활동만이 바탕화면 항목인 것은 아니다 —
 * 브라우저는 스탯도 턴도 건드리지 않으므로 Activity로 위장시키지 않는다.
 *
 * 추후 폴더·휴지통도 같은 타입으로 추가한다:
 * 새 앱은 kind 'stub'으로 먼저 올리고, 구현되면 kind만 바꾸면 된다.
 */
export interface DesktopItem {
  id: string
  label: string
  icon: IconName
  /** 더블클릭 시 열리는 창의 종류. */
  kind: WindowKind
  /**
   * 창 가로 폭. 항목마다 내용 분량이 달라 개별로 둔다.
   * openMaximized로 열려도 복원했을 때의 폭이 되므로 반드시 의미 있는 값을 둔다.
   */
  width: number
  /**
   * true면 창이 **열릴 때** 전체 화면 상태로 시작한다(작업 표시줄 제외).
   * ⚠️ 초기값일 뿐이다 — 최대화 여부는 런타임 상태이므로(`OpenWindow.maximized`)
   * 플레이어가 캡션 버튼으로 복원·재최대화할 수 있다.
   * 브라우저처럼 넓은 화면이 필요한 앱이 데이터에서 선언한다 — 컴포넌트에서 id로 분기하지 않는다.
   */
  openMaximized?: boolean
  /** kind가 'exe'일 때 실행할 활동 id. */
  activityId?: string
  /** kind가 'stub'일 때 창에 띄울 안내 문구. */
  stubMessage?: string
}

/** 물가 구간. day 이상일 때 해당 구간이 적용된다. */
export interface EconomyTier {
  day: number
  living: number
  wageMultiplier: number
}

/** 게임 종료 사유. */
export type GameOverReason = 'bankrupt' | 'burnout'

/** 세이브에 포함되는 게임 진행 상태. */
export interface GameState {
  playerName: string
  day: number
  slot: Slot
  stats: Stats
  /** 최근 실행한 활동 id 이력. 번아웃 계산에 사용. 최신이 배열 끝. */
  recentActivities: string[]
  /** 이번 판에서 이미 도달한 엔딩 id. 같은 엔딩 팝업을 반복하지 않기 위함. */
  seenEndingIds: string[]
  /** 게임이 강제 종료된 사유. null이면 진행 중. */
  gameOver: GameOverReason | null
}

export const INITIAL_STATS: Stats = {
  stamina: 100,
  maxStamina: 100,
  mental: 100,
  money: 300000,
  knowledge: 10,
  charm: 10,
  // 신규 스탯은 모두 0에서 시작한다. 아직 이를 올리는 활동은 없다(스케줄 시스템에서 채울 예정).
  sensitivity: 0,
  reputation: 0,
  morality: 0,
  creativity: 0,
  sociability: 0,
  vocabulary: 0,
  athletics: 0,
}
