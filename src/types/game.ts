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
  /**
   * 정규직 상태 게이트. `requiresItem`과 같은 규칙이다 — 판정은 `canRun` 하나가 한다.
   *
   *  - `'employed'` : 재직 중이고 **오늘 아직 출근하지 않았어야** 한다(출근).
   *  - `'interview'`: 면접 차례가 왔고 아직 기한이 남아 있어야 한다(면접).
   *  - `'applying'` : 결과를 기다리는 지원이 **막 만들어졌어야** 한다(지원서 제출).
   *
   * ⚠️ 화면에서만 막으면 스케줄러에 미리 넣어 둔 예약이 게이트를 그대로 통과한다.
   */
  requiresJobStage?: JobStageGate
  /**
   * **고른 대상이 있어야 뜻이 성립하는 활동**(생략 = 아니다).
   *
   * ⚠️ 현재 유일한 사례가 지원서 제출이다: "어디에 지원하는가"는 활동이 들고 있지 않고
   * **벼룩장터에서 고른 공고**가 정한다. 그래서 대상 없이 실행될 수 있는 두 통로를 막는다 —
   * **스케줄러 예약**과 **바탕화면 바로 가기**. 둘 다 "나중에 실행"이라 그 시점엔 고른 것이
   * 없고, 그러면 턴만 먹고 아무 일도 일어나지 않는다.
   */
  requiresPick?: boolean
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
 * 바탕화면 격자에 실제로 그려지는 아이콘 하나.
 *
 * ⚠️ **바탕화면에는 두 종류가 산다**: 내장 항목(`DESKTOP_ITEMS`)과 플레이어가 만든
 * **활동 바로 가기**. 격자·드래그·저장은 둘에게 완전히 같아야 하므로(그래야 "내가 옮긴
 * 것만 움직인다"는 약속이 한 종류에만 지켜지는 일이 없다) 화면 코드가 순회하는 목록은
 * 하나여야 한다. 대신 **더블클릭했을 때 하는 일이 다르므로** 판별 가능한 합집합으로 둔다:
 * 내장 항목은 창을 열고, 바로 가기는 실행 확인창을 띄운다.
 *
 * 목록을 만드는 곳은 `data/desktopItems.ts`의 `desktopEntries()`다.
 */
export type DesktopEntry =
  | {
      id: string
      label: string
      icon: IconName
      shortcut: false
      /** 내장 항목의 정의. 더블클릭하면 이 정의대로 창이 열린다. */
      item: DesktopItem
    }
  | {
      id: string
      label: string
      icon: IconName
      shortcut: true
      /** 확인 후 실행할 활동 id(`data/activities.ts`). */
      activityId: string
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

/* ── 정규직 (2026-08-05 신설) ─────────────────────────────────────────────
 *
 * 알바(`data/jobs.ts`)는 **일용직**이다: 공고를 누르면 그 슬롯을 일하고 그날 일당을 받는다.
 * 정규직은 구조가 다르다 — **한 번 채용되면 고용이 지속된다.** 그래서 알바와 달리
 * 세이브에 상태가 남는다(판에 속한 것이므로 `gameStore`가 아니라 `GameState`에 둔다).
 *
 * 규칙은 전부 `systems/employment.ts`에, 수치는 전부 `data/careers.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`과 같은 이유 — types가 systems를 import하면 방향이 뒤집힌다).
 */

/** 활동이 요구하는 정규직 상태. `Activity.requiresJobStage`가 쓴다. */
export type JobStageGate = 'employed' | 'interview' | 'applying'

/** 채용 절차의 단계. 지원 → 서류 심사 → 면접 → 최종 결과. */
export type ApplicationStage = 'screening' | 'interview' | 'final'

/**
 * 진행 중인 지원 한 건. 동시에 **하나만** 둔다 —
 * 여러 곳에 넣어 두고 되는 곳에 가는 것은 이 게임의 "한 번에 하나를 고른다"와 어긋난다.
 */
export interface Application {
  careerId: string
  appliedDay: number
  stage: ApplicationStage
  /**
   * 이 단계가 결판나는 날.
   * `screening`·`final`은 **결과가 나오는 날**, `interview`는 **면접을 볼 수 있게 되는 날**이다.
   */
  dueDay: number
}

/** 재직 상태. 채용되면 생기고, 해고되면 사라진다. */
export interface Employment {
  careerId: string
  hiredDay: number
  /** 다음 급여일. 이 날이 오면 월급이 들어오고 다음 급여일이 잡힌다. */
  paydayDay: number
  /** 이번 급여 주기에 출근한 날. 결근 감사와 출근부 표시가 같은 배열을 본다. */
  attendedDays: number[]
  /** 누적 무단결근. **주기가 바뀌어도 초기화하지 않는다** — 해고는 진짜 손실이어야 한다. */
  absences: number
  /** 결근 감사를 마친 마지막 날. 같은 날을 두 번 세지 않는 커서다. */
  checkedDay: number
  /** 경고 메일을 보낸 시점의 결근 수. 같은 경고를 매 턴 반복하지 않기 위함이다. */
  warnedAt?: number
}

/** 정규직 소식의 종류. 문구는 `systems/employment.ts`가 만든다. */
export type JobNoticeKind =
  | 'screening-pass'
  | 'screening-fail'
  | 'interview-miss'
  | 'hired'
  | 'final-fail'
  | 'payday'
  | 'absence-warning'
  | 'fired'

/**
 * 도착한 정규직 소식 한 건.
 *
 * ⚠️ **메시지 본문을 저장하지 않는다**(`systems/messages.ts`와 같은 규칙). 다만 이 소식들은
 * 편성표와 달리 **(day, slot)만으로 다시 만들 수 없다** — 플레이어가 언제 어디에 지원했는지에
 * 달려 있기 때문이다. 그래서 **사실만**(종류·회사·날짜·사유·금액) 남기고 문장은 매번 만든다.
 */
export interface JobNotice {
  /** 렌더 키이자 토스트 중복 제거 키. */
  id: string
  kind: JobNoticeKind
  careerId: string
  day: number
  slot: Slot
  /** 탈락·경고의 사유. 무엇이 모자랐는지 그대로 적는다(ux `error-clarity`). */
  reason?: string
  /** 급여 등 금액. */
  amount?: number
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
  /**
   * 아래 셋도 옵셔널이다 — **정규직이 생기기 전의 세이브에는 없다.**
   * 없으면 "지원한 적도 취직한 적도 없다"가 되므로 마이그레이션이 필요 없다
   * (`adBonusDay`·`plans`와 같은 규칙).
   */
  /** 결과를 기다리는 지원. 동시에 하나뿐이다. */
  application?: Application
  /** 재직 중인 회사. 없으면 무직이다. */
  employment?: Employment
  /**
   * **이번 판에서 도달한 최고 직장.** 해고되거나 그만둬도 내려가지 않는다.
   *
   * ⚠️ 이 필드의 유일한 독자는 **파산 엔딩 판정**이다(`systems/ending.ts`) —
   * 직업 엔딩은 취직한 순간이 아니라 **돈이 떨어져 죽은 뒤**에 뜨고, 비문에 새기는 것은
   * 죽을 때의 직함이 아니라 **가장 높이 갔던 자리**다. 판단의 근거와 뒤집는 법은
   * `systems/ending.ts`의 `epitaphCareerId`에 한 곳으로 모아 뒀다.
   *
   * ⚠️ 옵셔널이다 — 이 필드가 생기기 전 세이브에는 없다. `gameStore`의 `reviveJob`이
   * 재직 중인 회사로 메워 준다(`adBonusDay`·`plans`와 같은 규칙).
   */
  peakCareerId?: string
  /** 도착한 정규직 소식(메일·토스트의 원본). 오래된 것부터 잘라 낸다. */
  jobNotices?: JobNotice[]
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
