/**
 * 12종 스탯.
 * - 소모 자원: stamina(일일 소모/취침 회복), mental(0~100), money
 * - 성장 스탯: maxStamina(운동으로 영구 상승, 상한 200) + GROWTH_STAT_KEYS 10종(상한 999)
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
  /** 게임 */
  gaming: number
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
  'gaming',
] as const

export type GrowthStatKey = (typeof GROWTH_STAT_KEYS)[number]

/**
 * 스탯 한국어 라벨. UI는 이 표만 참조한다.
 *
 * ⚠️ **`stamina` = 행동력, `maxStamina` = 체력이다**(설계자 지시로 개명. 코드 키는 그대로).
 * "체력 / 최대 체력"은 같은 것의 현재값과 상한처럼 읽혀 둘이 왜 나뉘어 있는지 설명하지
 * 못했다. 실제 관계는 **매일 쓰고 채우는 소모 자원(행동력)** 과 **운동으로 영구히 키우는
 * 그릇(체력)** 이므로 이름을 그렇게 맞췄다. 게임 규칙은 하나도 바뀌지 않았다 —
 * 취침 회복량도 철인 엔딩 조건(`maxStamina: 200`)도 그대로다.
 *
 * 키를 함께 바꾸지 않은 이유: 세이브 데이터·systems·밸런스 테스트 전체가 키를 참조하는데,
 * 표시 이름을 바꾸는 데 그 위험을 질 이유가 없다. **코드에서 `stamina`를 볼 때 "행동력"으로
 * 읽어라.**
 */
export const STAT_NAMES: Record<keyof Stats, string> = {
  stamina: '행동력',
  maxStamina: '체력',
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
  gaming: '게임',
}

/** 활동이 스탯에 주는 변화량. 없는 키는 변화 없음. */
export type StatDelta = Partial<Record<keyof Stats, number>>

/** 하루의 두 슬롯. */
export type Slot = 'morning' | 'afternoon'

/**
 * 아이콘 식별자. `"세트명:아이콘명"` 형태의 문자열이다 (예: `"fluent-color:book-24"`).
 * 아이콘 렌더링 라이브러리에 의존하지 않도록 타입은 문자열 별칭으로만 둔다 —
 * 실제 아이콘 데이터 로딩은 `src/icons/bootstrap.ts`가, 이름 목록은 `src/data/`가 책임진다.
 */
export type IconName = string

/**
 * 활동 분류. 스케줄러 고르기 판이 이 값으로 묶는다.
 *
 * 활동이 15종이 되면서 한 줄 목록으로는 고를 수 없게 됐다 — 무엇을 키우는 행동인지가
 * 라벨에만 있으면 15개를 전부 읽어야 비교가 된다. 라벨과 순서는 `ACTIVITY_CATEGORIES`가
 * 정한다(컴포넌트에 적지 않는다 — 콘텐츠는 `src/data/`에 산다는 규칙).
 */
export type ActivityCategory = 'living' | 'study' | 'body' | 'relation' | 'leisure' | 'giving'

/** 활동 정의. 수치는 전부 data/에만 존재한다. */
export interface Activity {
  id: string
  label: string
  icon: IconName
  description: string
  /**
   * 어느 묶음에 속하는가. **옵셔널이 아니다** —
   * 새 활동이 분류 없이 추가되면 고르기 판에서 조용히 사라지기 때문이다.
   */
  category: ActivityCategory
  /** 스탯 변화량. money는 알바비 배율이 적용된다. */
  effects: StatDelta
  /** 실행에 필요한 최소 스탯. 미달이면 실행 불가. */
  requires?: Partial<Record<keyof Stats, number>>
  /**
   * 실행에 필요한 보유 아이템 id(`data/items.ts`의 `SHOP_ITEMS`).
   *
   * 스탯 조건(`requires`)과 달리 **시간이 지나도 저절로 충족되지 않는다** — 사야 열린다.
   * 판정은 `systems/turn.ts`의 `canRun` 하나가 하므로, 스케줄러가 예약해 둔 뒤에
   * 아이템을 잃더라도 실행 시점에 다시 막힌다.
   */
  requiresItem?: string
  /** 알바비 배율(economy)을 money에 적용할지 여부. 알바 활동만 true. */
  scalesWithWage?: boolean
  /**
   * 번아웃을 함께 세는 이름. 생략하면 `id`가 곧 키다(기본 동작은 안 바뀐다).
   *
   * ⚠️ **알바 4종이 이 필드의 존재 이유다.** 번아웃이 활동 id로만 세면
   * 편의점 → 카페 → 물류 → 과외를 돌려 가며 **연속 노동의 대가를 한 번도 치르지 않는다**.
   * "같은 일을 반복하면 효율이 떨어진다"는 규칙이 지키는 것은 활동 id가 아니라
   * **하고 있는 일의 성격**이므로, 알바는 전부 같은 키('work')를 공유한다.
   */
  burnoutKey?: string
  /** 바탕화면에 아이콘을 띄울지 여부. 나머지 활동은 정의만 보존된다. */
  onDesktop?: boolean
}

/**
 * windowStore가 렌더링할 창의 종류.
 * 'exe'는 활동 실행 창(activityId 동반), 'ending'은 엔딩,
 * 'browser'는 가짜 웹 브라우저, 'stub'은 아직 구현되지 않은 앱의 안내 창이다.
 */
export type WindowKind =
  | 'exe'
  | 'ending'
  | 'stub'
  | 'browser'
  | 'chat'
  | 'thread'
  | 'mail'
  /** 시작 메뉴에서 여는 시스템 도구들. */
  | 'save'
  | 'taskmgr'
  | 'cmd'
  | 'solitaire'
  /** 아이템 인벤토리·이벤트 도감. 파일 탐색기 UI로 그린다. */
  | 'folder'
  | 'scheduler'

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
  /** kind가 'chat'/'mail'일 때 열 앱 id (`data/messages.ts`의 CHAT_APPS·MAILBOX). */
  appId?: string
  /** kind가 'folder'일 때 어느 폴더를 열지. */
  folderId?: FolderId
}

/**
 * 바탕화면 아이콘의 격자 좌표.
 *
 * **왜 픽셀이 아니라 칸인가:** 실제 윈도우의 "격자에 맞춤"과 같은 이유다.
 * 픽셀로 저장하면 창을 줄였다 늘일 때 아이콘이 조금씩 밀려 결국 배치가 무너지고,
 * 화면이 좁아졌을 때 "지금 몇 칸까지 있나"를 판정할 근거도 없어진다.
 * 격자 수치와 변환 규칙은 `data/shell.ts`의 `DESKTOP_GRID`와 `systems/desktopGrid.ts`에 있다.
 */
export interface GridCell {
  /** 0부터 시작하는 열 번호(왼쪽부터). */
  col: number
  /** 0부터 시작하는 행 번호(위부터). */
  row: number
}

/** 물가 구간. day 이상일 때 해당 구간이 적용된다. */
export interface EconomyTier {
  day: number
  living: number
  wageMultiplier: number
}

/**
 * 예약 한 건. 정의는 `systems/schedule.ts`에 있지만 세이브에 들어가므로
 * 타입만 여기서 다시 적는다 — types가 systems를 import하면 방향이 뒤집힌다.
 */
export interface Plan {
  day: number
  slot: Slot
  activityId: string
}

/** 게임 종료 사유. */
export type GameOverReason = 'bankrupt' | 'burnout'

/** 세이브에 포함되는 게임 진행 상태. */
/** 파일 탐색기로 여는 폴더. 둘뿐이라 유니온으로 둔다 — 늘어나면 그때 데이터로 뺀다. */
export type FolderId = 'inventory' | 'codex'

/** 배송 중인 주문. `day`에 도착한다. */
export interface Delivery {
  itemId: string
  day: number
}

/** 겪은 사건 한 건. `data/events.ts`의 정의를 id로 가리킨다. */
export interface EventLog {
  id: string
  day: number
}

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
  /**
   * 광고 배너 보상을 마지막으로 받은 날. 하루 한 번 제한의 근거다.
   *
   * "받았다/안 받았다"를 불리언으로 두지 않는 이유: 날짜가 넘어갈 때 누군가 초기화해 줘야
   * 하고, 그 초기화를 빠뜨리면 영영 못 받는 버그가 된다. 날을 저장해 두면
   * `adBonusDay !== day` 한 줄이 곧 "오늘은 아직 안 받았다"이므로 초기화 자체가 없다.
   *
   * ⚠️ 옵셔널이다 — 이 필드가 없던 세이브를 불러와도 `undefined !== day`가 참이라
   * 그냥 "오늘 안 받음"이 된다. 마이그레이션이 필요 없다.
   */
  adBonusDay?: number
  /**
   * 앞으로의 계획. 스케줄러가 넣고, 턴이 그 슬롯에 닿으면 자동 실행된다.
   *
   * ⚠️ 옵셔널이다 — 이 필드가 없던 세이브도 그대로 동작한다(빈 배열로 읽는다).
   * 규칙은 전부 `systems/schedule.ts`에 있고 `turn.ts`는 이걸 모른다:
   * 턴 규칙이 스케줄러를 모르게 두어야 밸런스 테스트가 스케줄러 없이도 성립한다.
   */
  plans?: Plan[]
  /**
   * 아래 셋은 전부 옵셔널이다 — 이 필드들이 없던 세이브를 그대로 불러올 수 있다.
   * 빈 배열로 읽으면 되므로 마이그레이션이 필요 없다(`adBonusDay`·`plans`와 같은 규칙).
   */
  /**
   * 보유 아이템. 택배가 도착하면 여기로 들어온다.
   * **받은 날을 함께 들고 있다** — 탐색기의 '수정한 날짜' 열이 그 값이고,
   * 배송 기록(`deliveries`)은 도착하는 순간 지워지므로 여기 남기지 않으면 날짜가 사라진다.
   */
  inventory?: EventLog[]
  /** 아직 오지 않은 주문. */
  deliveries?: Delivery[]
  /** 이벤트 도감에 실릴 기록. */
  events?: EventLog[]
}

export const INITIAL_STATS: Stats = {
  stamina: 100,
  maxStamina: 100,
  mental: 100,
  money: 300000,
  knowledge: 10,
  charm: 10,
  // 나머지 성장 스탯은 0에서 시작한다. 전부 올릴 활동이 하나 이상 있다 —
  // 그 사실은 `data/activities.test.ts`가 지킨다(스탯만 늘리고 활동을 안 만들면 실패한다).
  sensitivity: 0,
  reputation: 0,
  morality: 0,
  creativity: 0,
  sociability: 0,
  vocabulary: 0,
  athletics: 0,
  gaming: 0,
}
