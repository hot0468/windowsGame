/**
 * 스탯.
 * - 소모 자원: stamina(=**체력**, 일일 소모/취침 회복), mental(0~100), money
 * - 성장 스탯: GROWTH_STAT_KEYS 15종 (상한은 `growthCap`이 정한다 —
 *   평판·도덕·예의범절만 100, 나머지 999)
 *
 * ⚠️ **행동력과 체력은 2026-08-08에 하나로 합쳤다**(설계자 지시: "스탯이 너무 헷갈려").
 * 예전에는 `stamina`(행동력, 매일 쓰는 값)와 `maxStamina`(체력, 운동으로 키우는 그릇)가
 * 따로 있었는데, **그릇이 상한과 취침 회복량을 동시에 정하는 바람에 키울수록 행동력이
 * 덜 묶여서** "성장할수록 자원 하나가 사라지는" 구조였다. 지금은 **체력 하나**가
 * 행동의 대가이고, 몸을 키운 결과는 `athletics`(운동 스탯)로 간다.
 * **되살리지 말 것** — 되살리려면 회복을 상한에서 떼어 내는 설계부터 다시 해야 한다.
 */
export interface Stats {
  /** **체력.** 행동의 대가이고 자고 나면 회복된다. 상한은 `STAMINA_CAP` 고정. */
  stamina: number
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
  /** 예의범절 */
  manners: number
  /**
   * 경제. **지식과 다른 것이다** — 지식은 배운 것이고 경제는 **돈이 어떻게 움직이는지
   * 읽는 눈**이다. ⚠️ 소지금(`money`)과도 다르다: 가진 돈이 아니라 다룰 줄 아는가다.
   */
  finance: number
  /**
   * 음악. **예술과 다른 것이다** — 예술은 손으로 그려 내는 숙련이고 음악은 **소리를 짓고
   * 듣는 귀**다. 감수성(느끼는 힘)과도 갈린다: 감수성은 받아들이는 쪽, 음악은 만드는 쪽이다.
   */
  music: number
  /**
   * IT. **지식·창의력과 다른 것이다** — 지식은 배운 것이고 창의력은 떠올리는 힘이며
   * IT는 **기계를 실제로 다뤄 동작하게 만드는 숙련**이다(예술이 `draw` 하나만 올리는 것과
   * 같은 부류: `tool-vscode`가 주 공급원이다).
   * ⚠️ 키가 `it`이 아닌 이유: 테스트 파일에서 vitest의 `it`과 눈으로 부딪힌다.
   */
  tech: number
  /**
   * 예술. **창의력과 다른 것이다** — 창의력이 "떠올리는 힘"이라면 예술은
   * **손으로 끝까지 그려 내는 숙련**이다. 그래서 창의력은 여러 활동이 조금씩 올리지만
   * 예술은 실제로 그리는 활동(`draw`)만 올린다.
   */
  art: number
}

/**
 * 성장 스탯 키. 상한은 `systems/turn.ts`의 `growthCap(key)`가 정한다
 * (기본 999, 평판·도덕·예의범절만 100).
 * ⚠️ `stamina`(체력)는 **소모 자원**이라 여기 없다 — 쓰면 줄고 자면 돌아온다.
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
  'manners',
  'art',
  'music',
  'finance',
  'tech',
] as const

export type GrowthStatKey = (typeof GROWTH_STAT_KEYS)[number]

/**
 * 스탯 한국어 라벨. UI는 이 표만 참조한다.
 *
 * ⚠️ **`stamina`가 곧 체력이다**(2026-08-08 통합). 예전에는 `stamina`=행동력 /
 * `maxStamina`=체력 둘이었다 — 사연은 위 `Stats` 주석에 있다.
 * 키를 `health` 같은 것으로 바꾸지 않은 이유: 세이브·systems·밸런스 테스트 전체가
 * 이 키를 참조하는데, 표시 이름을 바꾸는 데 그 위험을 질 이유가 없다.
 */
export const STAT_NAMES: Record<keyof Stats, string> = {
  stamina: '체력',
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
  manners: '예의범절',
  art: '예술',
  music: '음악',
  finance: '경제',
  tech: 'IT',
}

/** 활동이 스탯에 주는 변화량. 없는 키는 변화 없음. */
export type StatDelta = Partial<Record<keyof Stats, number>>

/** 하루의 두 슬롯. */
export type Slot = 'morning' | 'afternoon'

/**
 * 슬롯 한국어 라벨.
 *
 * ⚠️ **화면 곳곳에 `slot === 'morning' ? '오전' : '오후'`가 흩어져 있다**(스케줄러·자동
 * 진행 요약·탐색기). 이 표는 그것들의 **정본**이고, 새로 적는 자리는 여기를 읽는다 —
 * 흩어진 삼항식들은 손대는 김에 하나씩 이쪽으로 옮긴다(`STAT_NAMES`와 같은 규칙).
 */
export const SLOT_NAMES: Record<Slot, string> = {
  morning: '오전',
  afternoon: '오후',
}

/**
 * 아이콘 식별자. `"세트명:아이콘명"` 형태의 문자열이다 (예: `"fluent-color:book-24"`).
 * 아이콘 렌더링 라이브러리에 의존하지 않도록 타입은 문자열 별칭으로만 둔다 —
 * 실제 아이콘 데이터 로딩은 `src/icons/bootstrap.ts`가, 이름 목록은 `src/data/`가 책임진다.
 */
export type IconName = string

/**
 * 외주 작업 도구. 수치(일감·이름·작업 단계)는 `data/gigs.ts`가 갖고 **여기는 축만 정한다**
 * — `Activity.toolId`가 이 타입이라야 화면이 `TOOL_NAMES[toolId]`처럼 안전하게 색인한다
 * (`string`이면 없는 도구 이름이 `undefined`로 조용히 새어 나간다).
 */
export type ToolId = 'photoshop' | 'premiere' | 'vscode' | 'audition'

/**
 * 도구 앱 창(`WindowKind: 'tool'`)이 그릴 것. **실행 직전에 찍어 둔 사실이다.**
 *
 * ⚠️ **증감을 창 안에서 다시 계산하지 않는 이유**: 창이 열릴 때는 이미 턴이 지나갔으므로
 * 그때의 스탯으로 `previewActivity`를 다시 부르면 효율·연속 페널티가 달라져 **화면이
 * 방금 일어난 일과 다른 숫자를 말한다.**
 * ⚠️ `contract`·`earned`는 **실행 전**의 일감 상태다 — 창은 지금 상태와 견주어
 * "업무량이 얼마나 찼는가 / 납품됐는가"를 판정한다.
 */
export interface ToolRunPayload {
  /**
   * 도구 활동이면 그 도구. **알바는 없다**(2026-08-08 알바 연출 확장) —
   * 이 값이 있고 없고가 "일감 진행 줄을 그리는가"를 가른다(알바에는 일감이 없다).
   */
  toolId?: ToolId
  /** 창 제목·결과 제목. 장면 정의(`data/runScenes.ts`)에서 온다. */
  title: string
  /** 상태 줄에 흐르는 문구. **연출이고 규칙이 아니다.** */
  steps: string[]
  /** CSS 액센트 갈래(`.tr-<accent>`). */
  accent: string
  /** 판의 생김새(`RunScene.look`). `'paper'`면 밝은 판 + 책장 + 닫기 버튼 없는 팝업. */
  look?: 'paper'
  /** 무엇을 그리는가(`RunScene.art`). 생략하면 판 기본값. */
  art?: 'run' | 'brush' | 'wave' | 'code' | 'chart' | 'stage' | 'hands' | 'steam' | 'table'
  rows: { key: keyof Stats; value: number }[]
  mentalPenalty: number
  contract?: GigContract
  earned: number
}

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
   *
   * ⚠️ **배열이면 "그중 아무거나 하나"다**(AND가 아니라 OR). 타블렛 둘이 같은 그리기
   * 활동을 여는 것이 이 형태의 존재 이유다 — 장비 등급이 다를 뿐 여는 문은 하나이므로,
   * 활동을 둘로 쪼개면 바탕화면에 클립스튜디오 아이콘이 둘 생긴다.
   */
  requiresItem?: string | string[]
  /**
   * **이 구독을 끊고 있어야 실행된다**(`data/subscriptions.ts`의 id).
   *
   * ⚠️ `requiresItem`과 성격이 다르다: 아이템은 한 번 사면 영원히 남지만
   * 구독은 **돈을 못 내면 끊긴다** — 그러면 이 활동도 다시 잠긴다.
   * 판정은 `canRun` 하나가 하므로 스케줄러에 미리 넣어 둔 예약도 같이 막힌다.
   */
  requiresSubscription?: string
  /**
   * **이 슬롯에만 할 수 있다**(생략 = 아무 때나, 2026-08-08 신설).
   *
   * ⚠️ **문구가 이미 약속한 것을 규칙이 지키게 하는 필드다** — 물류센터는 설명이
   * "새벽 상하차"이고 시집이는 "혼자 조조를 본다"인데 여태 아무 때나 됐다. 하루가
   * 2슬롯인데 오전·오후가 완전히 같으면 **순서를 고민할 이유가 없다.**
   *
   * ⚠️ 판정은 `canRun` 하나가 한다(스케줄러 예약·바로 가기도 같은 문을 지난다).
   * ⚠️ **출근(`commute`)에는 달지 않는다** — 결근 감사·주말 호출이 "그날 안에 한 번"을
   * 전제로 짜여 있어, 슬롯을 좁히면 그 계산이 통째로 흔들린다.
   */
  requiresSlot?: Slot
  /**
   * 밴드 숙련도 게이트(`GameState.band.skill` 이상이어야 한다). 판정은 `canRun` 하나가 한다.
   * ⚠️ **문턱 값이 곧 "무엇을 하는 활동인가"의 열쇠다** — `systems/band.ts`의 `bandPayFor`가
   * 이 값으로 공연과 앨범을 가른다(활동 id로 분기하면 활동을 하나 더 만들 때 샌다).
   */
  /**
   * 요일 잠금. `'weekday'` = 평일에만, `'weekend'` = 주말에만.
   *
   * ⚠️ 판정은 `canRun` 하나가 한다(슬롯·아이템 게이트와 같은 자리).
   * ⚠️ **오후에는 걸지 않는 것이 규칙이다** — 주간 예약이 월~금 오후를 쓰고 있어
   * (독서모임·레이드·러닝·헬스·밴드) 오후를 좁히면 그 예약들이 조용히 실행되지 않는다.
   */
  requiresWeek?: 'weekday' | 'weekend'
  requiresBandSkill?: number
  /** 이 활동이 밴드 숙련도를 올리는가(합주). 올리는 폭은 `data/band.ts`가 정한다. */
  buildsBandSkill?: boolean
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
  /**
   * **실행할 때마다 그림 한 장이 갤러리에 생긴다**(생략 = 아니다).
   *
   * ⚠️ 활동 id로 분기하지 않는 이유는 `requiresJobStage`와 같다 — id를 박으면
   * 그리는 활동을 하나 더 만들 때 그쪽만 조용히 그림을 안 남긴다. 실제 생성은
   * `runActivity`가 한다(실행 통로가 넷이라 그 밖에 두면 하나가 반드시 샌다).
   */
  /**
   * **이 활동이 켜는 도구**(`data/gigs.ts`의 `ToolId`). 생략 = 도구가 아니다.
   *
   * ⚠️ 활동 id로 분기하지 않는 이유는 `producesArt`와 같다 — id를 박으면
   * 도구를 하나 더 만들 때 그쪽만 조용히 업무량을 안 채운다.
   * ⚠️ **받아 둔 일이 없어도 켤 수 있다**(스탯만 오른다) — 게이트를 늘리지 않는다.
   */
  toolId?: ToolId
  producesArt?: boolean
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
  /**
   * 그림판 — 솔리테어와 **같은 부류의 장난감**이다. 육성 게임의 상태를 한 톨도
   * 건드리지 않고(스탯·턴·돈), 그린 것은 컴포넌트 안에만 살아 창을 닫으면 사라진다.
   * ⚠️ 활동 `draw`(클립스튜디오)와 무관하다 — 그림을 갤러리에 남기지 않는다.
   */
  | 'paint'
  /** 설정 — 지금은 구독 관리 한 구역뿐이다(`SettingsApp`). */
  | 'settings'
  /** 아이템 인벤토리·이벤트 도감. 파일 탐색기 UI로 그린다. */
  | 'folder'
  | 'scheduler'
  /** 증기 — 가짜 스팀 클라이언트. 라이브러리에서 게임을 켜 시간을 보낸다. */
  | 'steam'
  /**
   * 도구 앱이 돌아가는 창(포토샵·프리미어·VS 코드). **활동 창과 별개의 단독 창이다**
   * (설계자 지시) — 활동 창은 "할까요?"를 묻는 팝업이고, 이쪽은 **그 프로그램 자체**다.
   * 턴은 이 창이 열리기 전에 이미 지나갔고 여기서 게임 상태는 안 바뀐다.
   */
  | 'tool'
  /**
   * VS 코드 창. **클립스튜디오와 같은 부류의 프로그램 창이다** — `tool`(켠 뒤 결과 화면)과
   * 달리 이쪽은 무엇을 하고 있는지 보여 주는 프로그램 자체이고, 실행은 그 안의 ▶가 한다.
   */
  | 'vscode'
  /**
   * 콜센터 업무 프로그램. **출근(`commute`)이 여는 창이고 바탕화면 아이콘이 없다** —
   * 회사 자리에 앉아야 뜨는 사내 프로그램이라 아무 때나 켤 수 있으면 뜻이 무너진다.
   */
  | 'callcenter'
  /**
   * 별똥별(소원) 창. **랭크 이벤트가 여는 유일한 창이다**(`data/rankEvents.ts`) —
   * 바탕화면 아이콘도 시작 메뉴 항목도 없다: 아무 때나 켤 수 있으면 "일어난 일"이 아니다.
   */
  | 'wish'
  /**
   * 사내 드라이브(너드라이브). **사무직 출근(`commute`)이 여는 창이고 바탕화면 아이콘이
   * 없다** — 콜센터와 같은 규칙이다(회사 자리에 앉아야 뜨는 사내 프로그램).
   */
  | 'drive'
  /**
   * 클립스튜디오. **활동 창이 아니라 고르는 창이다**(증기·미디북스와 같은 부류) —
   * 웹툰 원고를 칠지, 개인 작업을 할지, 개인 작업이면 단일이냐 어느 프로젝트냐를
   * 여기서 고르고 그다음에 확인창이 뜬다.
   */
  | 'clipstudio'
  /**
   * 자동 진행 요약. **며칠이 조용히 사라지지 않게 하는 창구다** —
   * 토스트는 5초 뒤 없어지고 메일은 열어야 보이지만 이 창은 진행이 끝나면 스스로 뜬다.
   */
  | 'autolog'
  /**
   * 도감 — 직업·엔딩을 엑셀 판형으로 늘어놓는 창. **읽기 전용이다**(게임 상태를 안 바꾼다).
   * 사진첩(이벤트 도감)과 나란히 서지만 폴더가 아니라 **표**다 — 셀마다 값이 있는 것을
   * 파일 격자로 그리면 레벨·조건이 갈 자리가 없다.
   */
  | 'excel'
  /**
   * 악성코드가 띄우는 광고 팝업. **바탕화면 아이콘도 시작 메뉴 항목도 없다** — 켜는 것이
   * 아니라 **감염되면 매 턴 저절로 뜨는** 창이다(`wish`와 같은 부류).
   *
   * ⚠️ **`OpenWindow.popup`으로 열지 않는다.** 시스템 팝업은 닫기 버튼이 없는 창인데,
   * 이건 성가심이 대가의 절반이라 **반드시 닫을 수 있어야** 한다(ux `escape-routes`) —
   * 못 닫는 창이 매 턴 쌓이면 대가가 아니라 고장이다.
   */
  | 'adware'

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
  /**
   * **이 물건을 가져야 바탕화면에 나타나는 항목**(생략 = 항상 보인다).
   * 배열이면 "그중 아무거나 하나"다(`Activity.requiresItem`과 같은 규칙).
   *
   * ⚠️ **`DESKTOP_ITEMS`에서는 빠지지 않는다** — 기본 격자 좌표(`DEFAULT_ICON_CELLS`)가
   * 이 배열에서 파생되므로, 빼 버리면 물건을 산 순간 좌표가 없는 아이콘이 된다.
   * 거르는 곳은 화면이 순회하는 목록(`desktopEntries`) 하나다.
   *
   * ⚠️ 그래서 **조건부 항목은 자기 열의 맨 뒤에 둔다**. 중간에 두면 아직 없는 아이콘이
   * 차지한 칸이 빈 자리로 남아 열 가운데가 뚫린다.
   */
  requiresItem?: string | string[]
  /**
   * **재직 중이어야 바탕화면에 나타나는 항목**(생략 = 항상 보인다).
   * ⚠️ 업무용 메신저(너아무튼온)가 쓴다 — 회사가 없으면 앱도 없다(설계자 지시).
   * `requiresItem`과 같은 규칙이다: `DESKTOP_ITEMS`에서는 빠지지 않고 `desktopEntries`가
   * 거르며, 조건부 항목이므로 **자기 열의 맨 뒤**에 둔다.
   */
  requiresEmployment?: boolean
  /**
   * **이 구독을 끈어야 바탕화면에 나타나는 항목**(생략 = 항상 보인다).
   * ⚠️ 포토샵이 쓴다 — 구독을 끊으면 아이콘이 **사라진다**(못 낸 사실이 화면에 드러난다).
   * `requiresItem`·`requiresEmployment`와 같은 규칙이다: `DESKTOP_ITEMS`에서는 안 빠지고
   * `desktopEntries`가 거르며, 조건부이므로 **자기 열의 맨 뒤**에 둔다.
   */
  requiresSubscription?: string
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

/**
 * 주저앉은 사유. **판을 끝내지 않는다** — 며칠을 뺏을 뿐이다.
 *
 * ⚠️ **예전에는 `GameOverReason`이었다**(2026-08-14 육성물 전환, 설계자 지시:
 * "카이로소프트처럼 완전한 게임오버는 없었으면"). 되살리지 말 것 — 게임을 끝내는
 * 장치를 다시 넣으면 생활 등급(`systems/lifeRank.ts`)이 무의미해진다. 그 등급은
 * **끝이 없어야** 목표가 되기 때문이다.
 */
export type RecoveryKind = 'bankrupt' | 'burnout'

/**
 * 강제 회복 기간 — 자원이 바닥나 며칠간 제대로 못 움직이는 상태.
 *
 * ## ⚠️ 아픔(`Illness`)과 다른 축이다
 * 아픔은 체력을 다 쓰고도 굴려서 생기고 **회복을 반으로 줄일 뿐 아무것도 막지 않는다**.
 * 이쪽은 **돈이나 멘탈이 0에 닿아** 생기고 실제로 행동을 막는다. 겹쳐서 걸릴 수 있고,
 * 그건 무리한 대가가 두 겹으로 오는 것이라 의도한 바다.
 *
 * ## 왜 종료가 아니라 기간인가
 * 육성물에서 실패는 **잃는 것**이지 **끝나는 것**이 아니다. 시간은 이 게임에서 가장
 * 희소한 자원이므로, 며칠을 통째로 뺏기는 것만으로 충분히 아프다.
 */
export interface Recovery {
  kind: RecoveryKind
  /** 시작한 날. 화면이 "며칠째"를 적는다. */
  startedDay: number
  /** 남은 날. 취침마다 하나씩 줄고 0이 되는 순간 필드 자체가 사라진다(`Illness`와 같은 규칙). */
  daysLeft: number
}

/** 세이브에 포함되는 게임 진행 상태. */
/**
 * 파일 탐색기로 여는 폴더.
 *
 * ⚠️ **고정 셋 + 프로젝트 폴더다.** 프로젝트는 플레이어가 원하는 만큼 만들 수 있으므로
 * 유니온에 나열할 수 없다 — `project:<id>` 형태로 열고 `projectFolderId`/`folderProjectId`
 * 한 쌍이 그 문자열을 만들고 되읽는다(문자열을 여러 곳에서 조립하면 한 곳만 낡는다).
 */
export type FolderId =
  | 'inventory'
  | 'codex'
  | 'gallery'
  | 'postcard'
  /**
   * 휴지통. ⚠️ **새 상태를 만들지 않는다** — 내용은 `broken`(다 쓰고 고장 난 장비)에서
   * 파생한다. `sold`(중고마켓에 판 물건)는 **넣지 않는다**: 판 것은 버린 것이 아니고,
   * 둘을 한 목록에 섞으면 왜 거기 있는지 아무도 답할 수 없다(`gear.ts`와 같은 판단).
   */
  | 'trash'
  | `project:${string}`

/**
 * 시집이 포스트카드 한 장.
 *
 * ⚠️ **영화의 사실을 복사하지 않고 id만 가리킨다**(작품집이 그림을 가리키는 것과 같은
 * 규칙) — 제목·태그라인의 단일 출처는 `data/media.ts`의 `FILMS`다.
 * ⚠️ **같은 영화는 한 장뿐이다**(규칙은 `systems/cinema.ts`) — 두 번 보면 두 장이 되는
 * 순간 포스트카드는 모으는 것이 아니라 관람 횟수 표시가 된다.
 */
export interface Postcard {
  filmId: string
  /** 본 날. 턴이 넘어가기 **전**의 날짜다(그림이 그린 날을 박는 것과 같다). */
  day: number
}

/** 프로젝트 폴더의 `FolderId`. */
export function projectFolderId(projectId: string): FolderId {
  return `project:${projectId}`
}

/** 프로젝트 폴더면 그 프로젝트 id, 아니면 undefined. */
export function folderProjectId(folderId: FolderId): string | undefined {
  return folderId.startsWith('project:') ? folderId.slice('project:'.length) : undefined
}

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
  /**
   * 사내 드라이브 미니게임이 쌓은 **성과 게이지(%)**. 없으면 0.
   *
   * ⚠️ **`bonus`와 다른 축이다**: 그쪽은 콜센터가 쌓는 **원 단위 보너스**이고 이쪽은
   * **비율**이다. `PERFORMANCE_QUOTA`(100%)까지는 기본급이 사는 몫이라 돈이 되지 않고,
   * **넘는 분량만 야근비**가 된다(설계자 지시: "100% 넘는 분량은 야근비로 책정"). 그래서
   * 상한이 없다 — 출근 횟수가 쌓이면 100%를 넘는 것이 이 게이지의 존재 이유다.
   * 규칙은 `systems/drive.ts`, 정산은 `payWages` 한 곳이다.
   */
  performance?: number
  /** 경고 메일을 보낸 시점의 결근 수. 같은 경고를 매 턴 반복하지 않기 위함이다. */
  warnedAt?: number
  /**
   * 아직 지급되지 않은 업무 보너스(원). 콜센터 미니게임이 쌓고 **급여일에 기본급과 함께**
   * 빠져나간다(`systems/callcenter.ts`·`payWages`). 옵셔널 = 콜센터가 아닌 회사는 늘 없다.
   *
   * ⚠️ **소지금이 아니다.** 여기 있는 동안은 아직 받은 돈이 아니므로 파산 판정도 물가도
   * 이 값을 보지 않는다 — 급여가 그렇듯 보너스도 급여일에만 현실이 된다.
   */
  bonus?: number
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
  /** 급여 등 금액. 급여일 소식에서는 **기본급 + 보너스의 합**이다(실제로 들어온 돈). */
  amount?: number
  /**
   * `amount` 중 업무 보너스 몫(콜센터). 합계와 따로 남기는 이유는 명세서가
   * "기본급 얼마 + 보너스 얼마"를 말해야 미니게임이 실제로 값을 했는지 보이기 때문이다.
   *
   * ⚠️ **사무직 야근비도 여기 들어간다**(성과 게이지 초과분). 둘은 같은 회사에 함께
   * 생길 수 없으므로(콜센터 아니면 사무직) 칸을 따로 만들지 않는다 — 무엇으로 번
   * 돈인지는 `overtimePercent`가 아니라 **다니는 회사**가 이미 말한다.
   */
  bonus?: number
}

/* ── 은행 (2026-08-05 신설) ───────────────────────────────────────────────
 *
 * 예금은 **오늘 쓸 수 없는 돈**이고 대출은 **오늘 쓸 수 있는 남의 돈**이다. 둘 다
 * 소지금(`Stats.money`)과 별개로 들고 있어야 파산 판정(`money <= 0`)이 그대로 성립한다 —
 * 예금을 소지금에 합쳐 두면 "통장에 돈이 있는데 굶어 죽는" 긴장 자체가 사라진다.
 *
 * 규칙은 전부 `systems/bank.ts`에, 수치는 전부 `data/bank.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`·`Employment`와 같은 이유).
 */

/** 정기예금 한 건. 만기 전에는 못 빼고, 만기가 오면 원리금이 자유예금으로 들어온다. */
export interface TermDeposit {
  /** 렌더 키. 같은 날 두 건을 들어도 구분된다. */
  id: string
  /** 원금. */
  principal: number
  openedDay: number
  /** 이 날이 되면 만기다(이자 지급 + 자유예금 편입). */
  matureDay: number
  /** 가입 시점의 일 이율. **여기 박아 둔다** — 나중에 이율을 고쳐도 이미 든 예금의 약속은 안 바뀐다. */
  rate: number
}

/** 거래 내역 한 줄. 사실만 남기고 문장은 화면이 만든다(`JobNotice`와 같은 규칙). */
export interface BankEntry {
  id: string
  day: number
  kind: 'deposit' | 'withdraw' | 'term-open' | 'term-mature' | 'interest' | 'borrow' | 'repay'
  /** 움직인 금액(항상 양수). 방향은 `kind`가 말한다. */
  amount: number
}

/**
 * 은행 상태. **옵셔널이다** — 은행이 생기기 전 세이브에는 없고, 없으면 "거래한 적 없음"이라
 * 마이그레이션이 필요 없다(`adBonusDay`·`plans`와 같은 규칙).
 *
 * ⚠️ 다만 `reviveState`의 검증은 다른 옵셔널 필드보다 **빡빡하다** — 여기 숫자가 NaN이면
 * 이자가 NaN이 되고 그것이 소지금으로 흘러 `NaN <= 0`이 false가 되어 **파산이 영영 안 걸린다**
 * (정규직 상태와 정확히 같은 사고 형태).
 */
export interface BankState {
  /** 자유예금 잔액. 언제든 뺄 수 있고 매일 이자가 붙는다. */
  savings: number
  /** 대출 잔액(원금 + 굴러온 이자). 갚기 전까지 매일 불어난다. */
  debt: number
  /** 들어 둔 정기예금. */
  deposits: TermDeposit[]
  /** 이자를 마지막으로 정산한 날. 같은 날 두 번 붙이지 않는 커서다(`Employment.checkedDay`와 같은 장치). */
  accruedDay: number
  /** 거래 내역. 오래된 것부터 잘라 낸다. */
  ledger: BankEntry[]
}

/* ── 이사 · 복권 (2026-08-05 신설) ─────────────────────────────────────────
 *
 * 둘 다 성격이 정반대다. **이사는 계획**(목돈을 묶고 생활비를 영구히 낮춘다)이고
 * **복권은 분산**(기대값이 음수인 대신 아주 낮은 확률로 큰 것이 터진다)이다.
 *
 * 수치는 `data/housing.ts`·`data/lottery.ts`에, 규칙은 `systems/housing.ts`·
 * `systems/lottery.ts`에 있다. 여기에는 **모양만** 적는다(`Plan`·`BankState`와 같은 이유).
 */

/** 지금 사는 집. **옵셔널이다** — 없으면 `HOUSINGS[0]`(시작 원룸)로 읽힌다. */
export interface HousingState {
  /** `data/housing.ts`의 매물 id. */
  id: string
  /** 이 집으로 옮긴 날. 계약 내역 표시용. */
  movedDay: number
  /**
   * **묶여 있는 보증금.** 다음에 이사할 때 그대로 돌아온다.
   *
   * ⚠️ 매물 정의(`Housing.deposit`)를 다시 읽지 않고 **낸 금액을 여기 박아 둔다** —
   * 나중에 매물 가격을 손봐도 이미 낸 보증금의 약속은 바뀌지 않는다
   * (`TermDeposit.rate`를 예금에 박아 두는 것과 같은 이유).
   */
  deposit: number
}

/** 복권 한 장의 결과. 사실만 남기고 문장은 화면이 만든다(`BankEntry`와 같은 규칙). */
export interface LotteryTicket {
  /** 렌더 키. 구매 일련번호가 들어 있어 절대 겹치지 않는다. */
  id: string
  day: number
  /** 당첨 등수 라벨. 꽝이면 undefined. */
  prize?: string
  /** 상금. 꽝이면 0. */
  amount: number
}

/**
 * 복권 상태. **옵셔널이다** — 산 적 없으면 없다.
 *
 * ⚠️ **`serial`이 이 구조의 핵심이다.** 시드에 들어가는 구매 일련번호이고,
 * 세이브에 남기 때문에 **새로 고침해도 이미 산 표가 다시 굴러가지 않는다**.
 * 이게 없으면 결과가 마음에 안 들 때 새로 고침하는 것이 최적 전략이 된다.
 */
export interface LotteryState {
  /** 지금까지 산 표의 총 수. **다음 표의 시드**이자 굴림의 독립성을 만드는 값이다. */
  serial: number
  /** 지금까지 쓴 돈. 화면이 "얼마를 넣고 얼마를 받았나"를 정직하게 적는 근거다. */
  spent: number
  /** 지금까지 받은 상금. */
  won: number
  /** 최근 구매 기록. 오래된 것부터 잘라 낸다. */
  tickets: LotteryTicket[]
  /**
   * **오늘 밤 소지금으로 들어올 상금.**
   *
   * ⚠️ 이 필드가 `turn.ts`의 `nightPayoutPending`에 물리는 지점이다. 오후에 산 표가
   * 당첨됐는데 그날 밤 생활비를 못 내면, 상금을 손에 쥔 채 굶어 죽는 판정이 난다 —
   * 급여·정기예금 만기에서 이미 두 번 터진 것과 **같은 형태의 버그**다.
   * 밤 정산(`advanceLottery`)이 소지금에 넣고 이 값을 0으로 되돌린다.
   */
  pending: number
}

/* ── 자격증 (2026-08-05 O넷) ──────────────────────────────────────────────
 *
 * 규칙은 전부 `systems/certification.ts`에, 수치는 전부 `data/certs.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`·`Employment`·`BankState`와 같은 이유).
 */

/**
 * 응시 기록 한 건.
 *
 * ⚠️ **사실만 남기고 문장은 매번 만든다**(`JobNotice`와 같은 규칙) — 종목 이름과
 * 응시료를 여기 적어 두면 `data/certs.ts`를 고쳤을 때 옛 기록이 낡은 값을 들고 있게 된다.
 *
 * ⚠️ 다만 **결과(`passed`)와 사유(`reason`)는 사실이므로 남긴다.** 판정은 발표일 시점의
 * 스탯으로 하는데 그 뒤로 스탯은 계속 변하므로, 저장하지 않으면 나중에 다시 계산할 수 없다.
 */
export interface ExamRecord {
  /** `data/certs.ts`의 종목 id. */
  certId: string
  takenDay: number
  /** 이 날이 되면 발표된다. 그때의 스탯으로 판정한다. */
  resultDay: number
  /** 발표 전에는 undefined다. */
  passed?: boolean
  /** 불합격 사유(모자란 요건). 합격이면 없다(ux `error-clarity`). */
  reason?: string
}

/* ── 그림 · 트위터 (2026-08-08 신설) ──────────────────────────────────────
 *
 * 수치는 `data/artworks.ts`에, 규칙은 `systems/artwork.ts`·`systems/twitter.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`·`BankState`와 같은 이유).
 */

/**
 * 그린 그림 한 장. 클립스튜디오를 켤 때마다 갤러리에 한 장씩 쌓인다.
 *
 * ⚠️ **등급을 저장하지 않는다 — 그릴 때의 사실만 남기고 등급은 매번 계산한다**
 * (`JobNotice`·`BankEntry`와 같은 규칙). 등급 기준(`ART_MASTERY`)을 나중에 손보면
 * 저장된 등급은 낡은 값이 되는데, 그 그림으로 얻은 팔로워는 이미 지급된 뒤다.
 *
 * ⚠️ 반대로 **그릴 때의 스탯과 장비는 사실이므로 남긴다.** 판정은 그린 시점의 실력으로
 * 하는데 그 뒤로 스탯은 계속 오르므로, 저장하지 않으면 옛 그림이 저절로 명작이 된다
 * (`ExamRecord.passed`를 남기는 것과 같은 이유).
 */
export interface Artwork {
  /** 렌더 키이자 게시 여부의 판정 키. 일련번호가 들어 있어 절대 겹치지 않는다. */
  id: string
  /** 몇 번째로 그린 그림인가. 제목을 결정적으로 고르는 시드이기도 하다. */
  serial: number
  day: number
  slot: Slot
  /** 그릴 때의 예술 스탯. */
  art: number
  /** 그릴 때의 창의력 스탯. */
  creativity: number
  /** 그릴 때 쓴 장비. 액정이 등급에 보너스를 준다. */
  tool: 'pen' | 'lcd'
}

/**
 * 개인방송 채널. **옵셔널이다** — 방송을 켠 적도, 이름을 지은 적도 없으면 없다
 * (`steam`·`courses`와 같은 규칙 — 마이그레이션이 필요 없다).
 *
 * ⚠️ **구독자 수는 여기 없다.** 그쪽은 여전히 평판 파생(`subscribersFrom`)이고, 여기
 * 담는 것은 **파생시킬 수 없는 것**뿐이다 — 플레이어가 지은 이름과, 실제로 켠 횟수·주제.
 * 트위터의 시청자 반응(`streamReviews`)이 그 셋을 근거로 삼는다. 반응까지 저장하면
 * 평판이 오르내려도 낡은 문장이 그대로 남는다.
 */
export interface ChannelState {
  /** 채널 이름. 없으면 플레이어 이름으로 읽는다(`channelOf`). */
  name: string
  /** 방송을 켠 횟수. **켠 적이 있어야 시청자 반응이 존재한다**는 근거다. */
  streams: number
  /** 마지막으로 켠 방송 주제 id(`StreamTopic.id`). 반응이 무엇에 대한 것인지 정한다. */
  topic?: string
}

/**
 * 밴드 상태. **옵셔널이다** — 합주를 한 번도 안 했으면 없다.
 *
 * ⚠️ **필드가 숙련도 하나뿐인 것이 규칙이다.** 멤버 이름·곡 목록·다음 공연 날짜를 여기
 * 넣고 싶어지는데, 전부 화면에만 필요한 장식이고 저장하면 세이브가 낡는다 — 지어낸
 * 이름은 `data/messages.ts`의 대화방이 갖고, 일정은 주간 예약이 이미 갖고 있다.
 */
export interface BandState {
  /** 합주로 쌓인 팀의 숙련도. 상한·문턱·보수는 전부 `data/band.ts`가 정한다. */
  skill: number
}

/**
 * 트위터 활동 상태. **옵셔널이다** — 그림을 올린 적 없으면 없다
 * (`lottery`·`courses`와 같은 규칙 — 마이그레이션이 필요 없다).
 *
 * ⚠️ **팔로워를 여기에 저장하는 것이 기존 규칙의 예외다.** 원래 팔로워는
 * `followersFrom(reputation)`으로 **파생**시켰다(읽기 전용). 그림 업로드가 팔로워를
 * 직접 늘리게 되면서 재계산이 불가능해졌으므로(무엇을 언제 올렸는지에 달려 있다)
 * **평판에서 온 몫 + 그림으로 번 몫**을 더해 쓴다. 합치는 곳은
 * `systems/twitter.ts`의 `totalFollowers` 하나다.
 */
export interface TwitterState {
  /** 그림 업로드로 얻은 팔로워 누적. 평판에서 오는 몫은 여기 안 들어간다. */
  gained: number
  /** 이미 올린 그림 id. 같은 그림을 다시 올려 팔로워를 반복해서 벌 수 없다. */
  postedIds: string[]
  /**
   * 올린 그림들이 받은 좋아요 누적.
   *
   * ⚠️ **팔로워와 따로 센다.** 팔로워는 상한(`FOLLOWER_CAP`)이 걸린 **수입의 축**이고
   * 좋아요는 상한이 없는 **평가의 축**이다 — 웹툰 제의가 보는 것이 이쪽이다. 팔로워로
   * 판정하면 평판만 올려도 제의가 오게 되어 "그림을 그려서 알려졌다"가 거짓이 된다.
   */
  likes: number
  /**
   * 마지막으로 수익을 정산한 날. `Employment.checkedDay`·`BankState.accruedDay`와 같은
   * 커서라 같은 주를 두 번 정산하지 않는다.
   *
   * ⚠️ **`turn.ts`의 `nightPayoutPending`이 보는 값이 이 날짜다**(금액이 아니다).
   * 정산은 시각이 오면 일어나는 일이라 복권처럼 미리 담아 둘 `pending`이 없다 —
   * 정기예금 만기(`TermDeposit.matureDay`)와 정확히 같은 형태다. 이 커서를 안 보면
   * **정산금이 들어오기 직전 밤에 굶어 죽는다.**
   */
  paidDay: number
}

/* ── 주식 (2026-08-08 네이놈증권) ─────────────────────────────────────────
 *
 * 수치는 `data/stocks.ts`에, 규칙은 `systems/stocks.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`·`BankState`와 같은 이유).
 */

/** 매매 한 건. 사실만 남기고 문장은 화면이 만든다(`BankEntry`와 같은 규칙). */
export interface StockTrade {
  id: string
  day: number
  stockId: string
  kind: 'buy' | 'sell'
  shares: number
  /** 체결 단가. ⚠️ **시세는 날짜의 순수 함수라 다시 계산할 수 있지만 여기 박아 둔다** —
   *  나중에 변동폭을 손보면 옛 기록이 그때 내지 않은 값을 말하게 된다
   *  (`TermDeposit.rate`를 예금에 박아 두는 것과 같은 이유). */
  price: number
  /** 실제로 오간 돈(수수료 포함). */
  amount: number
}

/**
 * 주식 상태. **옵셔널이다** — 거래한 적 없으면 없다(`lottery`·`bank`와 같은 규칙).
 *
 * ⚠️ **시세를 저장하지 않는다** — 날짜의 순수 함수이므로 언제든 다시 계산된다.
 * 저장하면 새로 고칠 때마다 다시 굴릴 수 있게 되어 **세이브 스커밍**이 열린다.
 *
 * ⚠️ `reviveState`의 검증이 `courses`보다 빡빡하다(`bank`·`lottery`와 같은 이유 —
 * **돈을 만드는 상태다**). 주수나 평균가가 NaN이면 매도 대금이 NaN으로 소지금에 흘러
 * `NaN <= 0`이 false가 되고 **파산이 영영 안 걸린다.**
 */
export interface StockState {
  /** 종목별 보유. **평균 매입가를 함께 든다** — 평가손익이 그 값 위에서만 뜻을 갖는다. */
  holdings: Record<string, { shares: number; avgPrice: number }>
  /** 지금까지 산 금액(수수료 포함). 화면이 "얼마 넣고 얼마 뺐나"를 정직하게 적는 근거다. */
  spent: number
  /** 지금까지 판 금액(수수료 뗀 뒤). */
  earned: number
  /** 최근 매매 내역. 오래된 것부터 잘라 낸다. */
  trades: StockTrade[]
}

/* ── 구독 (2026-08-08 어도비) ──────────────────────────────────
 *
 * ⚠️ **"구독은 만들지 않는다"는 옛 규칙이 설계자 지시로 폐기됐다.** 그 규칙의 근거가
 * "지속 상태는 밤 정산이 필요해진다"였는데 실제로 필요해졌다(`advanceSubscriptions`).
 * 수치는 `data/subscriptions.ts`에, 규칙은 `systems/subscription.ts`에 있다 —
 * 여기에는 **모양만** 적는다(`Plan`·`BankState`와 같은 이유).
 */

/**
 * 구독 상태. **옵셔널이다** — 구독한 적 없으면 없다(`bank`·`lottery`와 같은 규칙).
 *
 * ⚠️ `reviveState`의 검증이 `courses`보다 빡빡하다 — **돈을 움직이는 상태다.**
 * 다만 방향이 반대라 위험도 반대다: 커서가 NaN이면 청구가 영영 안 돌아
 * **공짜 구독**이 된다(은행은 반대로 파산이 안 걸렸다).
 */
export interface SubscriptionState {
  /** 구독 중인 상품 id → 가입일·마지막 청구일. **해지하면 키가 사라진다**(그것이 곰장 판정이다). */
  active: Record<string, { startedDay: number; billedDay: number }>
  /** 지금까지 낸 총액. 화면이 "얼마 냈나"를 정직하게 적는 근거다(`LotteryState.spent`와 같다). */
  paid: number
}

/* ── 그몽 외주 (2026-08-08 재설계) ─────────────────────────────
 *
 * 수치는 `data/gigs.ts`에, 규칙은 `systems/gigs.ts`에 있다.
 * 여기에는 **모양만** 적는다(`Plan`·`Employment`와 같은 이유).
 */

/**
 * 진행 중인 외주 한 건. **동시에 하나뿐이다** — 정규직 지원(`Application`)과
 * 같은 판단이다: 여럿을 받아 두면 "지금 무슨 일을 하고 있나"가 화면에 하나로 안 뜼고,
 * 도구를 켰을 때 어느 건을 채울지 고르게 하는 판이 하나 더 필요해진다.
 */
export interface GigContract {
  /** `data/gigs.ts`의 일감 id. */
  gigId: string
  takenDay: number
  /** 이 날까지 채워야 한다. 지나면 실패다(`advanceGigs`). */
  dueDay: number
  /** 지금까지 채운 업무량. 도구를 한 번 켜면 `WORK_PER_SESSION`만큼 오른다. */
  progress: number
}

/**
 * 그몽 상태. **옵셔널이다** — 받은 적 없으면 없다(`courses`·`exams`와 같은 규칙).
 *
 * ⚠️ **납품한 일감 id를 남긴다**(`done`) — 같은 일감을 무한히 되받아
 * 무한히 벌 수 없게 하는 유일한 장치다(복권의 `serial`·트위터의 `postedIds`와 같은 역할).
 */
export interface GigState {
  /** 지금 받아 둔 일. 없으면 놀고 있는 것이다. */
  active?: GigContract
  /** 납품을 마친 일감 id. 다시 받을 수 없다. */
  done: string[]
  /** 마감을 놓친 횟수. 화면이 그 사실을 적는 근거다. */
  missed: number
  /** 지금까지 받은 보수 총액. */
  earned: number
}

/* ── 창작 프로젝트 · 공모전 · 웹툰 (2026-08-08) ──────────────────────────
 *
 * 수치는 `data/contests.ts`·`data/webtoon.ts`, 규칙은 `systems/projects.ts`·
 * `systems/contests.ts`·`systems/webtoon.ts`에 있다. 여기에는 **모양만** 적는다.
 */

/**
 * 작품집 한 권. **클립스튜디오로 그린 그림을 묶는 자루다.**
 *
 * ⚠️ **그림을 복사해 담지 않고 id만 가리킨다** — 그림의 단일 출처는 `GameState.artworks`이고
 * (갤러리가 그걸 그린다) 여기 복사본을 두면 등급 기준을 손볼 때 한쪽만 낡는다.
 * ⚠️ **한 번 쓰면 닫힌다**(`usedFor`). 같은 권을 공모전에도 내고 회지로도 팔면 한 번 그린
 * 것으로 두 번 벌게 되어, "원하는 만큼 새로 만든다"는 규칙이 뜻을 잃는다.
 */
export interface Project {
  id: string
  name: string
  createdDay: number
  /** 이 권에 들어간 그림 id. **장수는 이 배열의 길이다**(따로 세지 않는다). */
  pageIds: string[]
  /** 이미 쓴 권이면 어디에 썼는가. 없으면 아직 작업 중이다. */
  usedFor?: 'contest' | 'comicon'
}

/** 프로젝트 목록. **옵셔널이다** — 만든 적 없으면 없다(`courses`와 같은 규칙). */
export interface ProjectState {
  projects: Project[]
  /** 다음 프로젝트 번호. 지운 뒤에도 이름이 겹치지 않게 따로 센다. */
  nextSerial: number
  /** 회지로 팔아 번 돈 누적. 화면이 "얼마 벌었나"를 정직하게 적는 근거다. */
  soldEarned: number
}

/**
 * 공모전 출품 한 건.
 *
 * ⚠️ **낸 것이 무엇인지(프로젝트냐 그림 한 장이냐)를 여기 박는다** — 심사는 발표일에
 * 이뤄지는데 그 사이에 프로젝트에 장을 더 넣을 수 있으므로, **낸 시점의 장수·평균 실력**을
 * 함께 찍어 둔다. 안 찍으면 "내고 나서 계속 그려 점수를 올리는" 자리가 생긴다.
 */
export interface ContestEntry {
  contestId: string
  projectId?: string
  artworkId?: string
  enteredDay: number
  /** 이 날 밤에 결과가 확정된다(`advanceContests`). */
  resultDay: number
  /** 낸 시점의 장수. 단일 출품이면 1이다. */
  pages: number
  /** 낸 시점의 평균 완성도(0~1+). 심사는 이 값만 본다 — 무작위 없음. */
  score: number
  /** 발표 뒤에만 채워진다. `''`(빈 문자열)이면 낙선이다. */
  prize?: string
  money?: number
}

/** 공모전 상태. **옵셔널이다** — 낸 적 없으면 없다. */
export interface ContestState {
  entries: ContestEntry[]
  /** 입상 횟수. **웹툰 제의가 보는 값이 이것이다.** */
  wins: number
  earned: number
}

/**
 * 웹툰 연재 상태. **옵셔널이다** — 제의가 온 적 없으면 없다.
 *
 * ⚠️ **정규직(`Employment`)과 다른 축이다.** 정규직은 출근·결근·해고이고 여기는
 * **주간 마감**이다 — 회사에 나가는 것이 아니라 원고를 넘기는 일이라 출근부가 없다.
 * 그몽 계약과 더 가깝지만 그쪽은 건별이고 이쪽은 **끝나지 않고 매주 돌아온다.**
 */
export interface WebtoonState {
  /** 제의가 온 날. 아직 안 왔으면 없다. */
  offeredDay?: number
  /** `'offered'` 수락 대기 · `'serializing'` 연재 중 · `'ended'` 연재 종료. */
  status: 'offered' | 'serializing' | 'ended'
  startedDay?: number
  /** 이번 주에 채운 원고 수. */
  progress: number
  /** 이 날까지 채워야 한다. 지나면 정산된다(`advanceWebtoon`). */
  dueDay: number
  /** 넘긴 주(=회차) 수. */
  episodes: number
  /** 놓친 마감 수. 쌓이면 연재가 끝난다. */
  missed: number
  earned: number
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
  /**
   * 지금 주저앉아 있는가. null이면 평소대로 움직일 수 있다.
   *
   * ⚠️ **이 필드가 곧 "입력 제한" 플래그다.** 시스템 가드 15곳(은행·수강·응시·지원·대회…)이
   * 이 값을 보고 거절하는데, 그 판단은 게임오버 시절 그대로 옳다 — 달라진 것은
   * **영영 막히느냐 며칠만 막히느냐**뿐이다.
   */
  recovery: Recovery | null
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
   * 악성코드 감염 상태. **없으면 감염되지 않은 것**이라 마이그레이션이 필요 없다
   * (`adBonusDay`·`plans`와 같은 규칙).
   *
   * ⚠️ 들고 있는 것은 **감염된 날 하나**다 — 증상(밤마다 새는 돈·매 턴 뜨는 팝업)은
   * 전부 "지금 감염 중인가"만 보므로 더 저장할 사실이 없다. 규칙은 `systems/malware.ts`.
   */
  malware?: { day: number }
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
  /**
   * 중고마켓에 **한 번이라도 팔아 본** 물건 id. **옵셔널이다**(판 적 없으면 없다).
   *
   * ⚠️ **이 필드가 막는 것은 되사기 구멍이다**: 물건은 도착할 때 한 번 스탯을 올리는데,
   * 팔고 다시 사는 것을 그냥 두면 **정가의 절반만 내고 그 상승분을 무한히 반복**한다.
   * `systems/delivery.ts`의 `collect`가 이 목록에 있는 물건의 효과를 건너뛴다.
   * 되사는 것 자체는 막지 않는다 — 사라지는 것은 처음 받았을 때의 상승분뿐이다.
   */
  sold?: string[]
  /**
   * 장비를 몇 번 썼는가(`물건 id → 사용 횟수`). **옵셔널이다**(쓴 적 없으면 없다).
   * 고장은 무작위가 아니라 이 값이 정한다(`systems/gear.ts`).
   */
  gear?: Record<string, number>
  /**
   * 다 쓰고 고장 난 물건 id. **`sold`와 뜻이 다르다** — 판 것과 부서진 것을 한 배열에
   * 섞으면 나중에 왜 거기 있는지 아무도 답할 수 없다. 둘 다 "다시 받아도 효과가 없다"의
   * 근거이고 `delivery.ts`의 `collect`가 둘을 함께 본다.
   */
  broken?: string[]
  /**
   * 밴드. **없으면 안 들어간 것이다**(합주를 한 번이라도 하면 생긴다) — 빈 객체를 미리
   * 만들어 두면 "숙련도 0인 밴드에 소속됨"이라는 없는 상태가 화면에 뜬다.
   */
  band?: BandState
  /**
   * 휴대폰 요금을 마지막으로 낸 날. **없으면 산 날부터 센다**(인벤토리가 이미 갖고 있다) —
   * 규칙은 `systems/phone.ts`에 있다.
   */
  phoneBilledDay?: number
  /** 요금 미납으로 정지된 적이 있는가. 아웃룩 안내문의 근거다. */
  suspendedPhone?: boolean
  /**
   * 이미 지나간 목돈 청구 id(`data/bills.ts`). **못 냈어도 적힌다** — 못 낸 몫은 평판으로
   * 이미 치렀고, 안 적으면 매 밤 다시 문다.
   */
  paidBills?: string[]
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
  /**
   * 직업 이력(`회사 id → 누적 출근 횟수`). **옵셔널이다** — 취직한 적 없으면 없다.
   *
   * ⚠️ **`employment`·`peakCareerId`로는 답할 수 없는 것을 든다**: 다녀 본 곳 **전부**와
   * 각 회사에서의 근무량. 규칙은 `systems/careerLog.ts`에 모여 있고 도감(`ExcelApp`)이
   * 유일한 독자다. **급여는 여기서 나오지 않는다** — 레벨은 기록이지 보상이 아니다.
   */
  careerLog?: Record<string, number>
  /** 도착한 정규직 소식(메일·토스트의 원본). 오래된 것부터 잘라 낸다. */
  jobNotices?: JobNotice[]
  /**
   * 은행 거래 상태(예금·대출).
   *
   * ⚠️ 옵셔널이다 — 은행이 생기기 전 세이브에는 없다. 없으면 `emptyBank()`로 읽히므로
   * 마이그레이션이 필요 없다(`plans`·`inventory`와 같은 규칙).
   */
  bank?: BankState
  /**
   * 지금 사는 집. **옵셔널이다** — 없으면 시작 원룸(`HOUSINGS[0]`)에 산다.
   *
   * ⚠️ 이 필드가 생활비를 **날짜만의 함수에서 날짜 × 플레이어 상태의 함수로** 바꿨다.
   * 생활비를 읽는 곳은 전부 `getLivingCost(state)`(상태를 받는 쪽)를 지나야 한다 —
   * 하나라도 옛 경로(`livingCostForDay(day)`)에 남으면 그 화면만 조용히 거짓말을 한다.
   */
  housing?: HousingState
  /**
   * 복권. **옵셔널이다** — 산 적 없으면 없다.
   *
   * ⚠️ `reviveState`의 검증이 다른 옵셔널 필드보다 빡빡하다(`bank`·`employment`와 같은
   * 이유 — 돈을 만드는 상태다). `pending`이 NaN이면 그것이 소지금으로 흘러
   * `NaN <= 0`이 false가 되어 **파산이 영영 안 걸린다.**
   */
  lottery?: LotteryState
  /**
   * 강의별 수강 횟수(`강의 id → 들은 횟수`). **옵셔널이다** — 들은 적 없으면 없다.
   *
   * ⚠️ **수료증 발급의 근거이므로 세이브에 남는다**(메시지처럼 재계산할 수 없다 —
   * 플레이어가 어느 강의를 몇 번 들었는지에 달려 있다). 발급된 수료증 자체는
   * `inventory`에 들어가므로 이 값은 **진행도만** 든다.
   */
  courses?: Record<string, number>
  /**
   * 응시 이력. **옵셔널이다** — 응시한 적 없으면 없고, O넷이 생기기 전 세이브는
   * "응시한 적 없음"으로 읽힌다(마이그레이션 불필요 — `courses`·`plans`와 같은 규칙).
   *
   * ⚠️ 합격한 자격증 자체는 `inventory`에 들어가므로 이 배열은 **절차만** 든다.
   */
  exams?: ExamRecord[]
  /**
   * 증기(가짜 스팀) 게임별 실행 횟수(`게임 id → 켠 횟수`). **옵셔널이다** —
   * 켠 적 없으면 없고, 증기가 생기기 전 세이브는 "켠 적 없음"으로 읽힌다
   * (마이그레이션 불필요 — `courses`·`exams`와 같은 규칙).
   *
   * ⚠️ **플레이 시간(분)을 저장하지 않는다** — 시간은 횟수에서 파생되는 표시값이고
   * (`data/steam.ts`의 `playtimeLabel`), 둘 다 저장하면 어긋날 수 있는 값이 둘이 된다.
   */
  steam?: Record<string, number>
  /**
   * 너튜브 개인방송 채널(이름·켠 횟수·마지막 주제). **옵셔널이다** — 이름을 짓거나
   * 방송을 켠 적 없으면 없다(`steam`과 같은 규칙 — 마이그레이션 불필요).
   * ⚠️ 돈·턴을 만들지 않는다 — 돈은 `stream` 활동이, 턴은 `runActivity`가 낸다.
   */
  channel?: ChannelState
  /**
   * 그린 그림. **옵셔널이다** — 그린 적 없으면 없다(`courses`·`exams`와 같은 규칙).
   * 갤러리 폴더가 읽는 목록이고, 트위터 업로드가 고르는 대상이다.
   */
  artworks?: Artwork[]
  /**
   * 시집이에서 받은 포스트카드. **옵셔널이다** — 극장에 간 적 없으면 없다.
   * ⚠️ **돈도 스탯도 만들지 않는다** — 모으는 것 자체가 값어치인 유일한 상태다.
   */
  postcards?: Postcard[]
  /**
   * 트위터 활동(업로드·팔로워·주간 정산). **옵셔널이다** — 올린 적 없으면 없다.
   *
   * ⚠️ `reviveState`의 검증이 `courses`보다 빡빡하다(`lottery`와 같은 이유 —
   * **돈을 만드는 상태다**). `gained`가 NaN이면 정산금이 NaN이 되어 소지금으로 흘러
   * `NaN <= 0`이 false가 되고 **파산이 영영 안 걸린다.**
   */
  twitter?: TwitterState
  /**
   * 주식(네이놈증권). **옵셔널이다** — 거래한 적 없으면 없다.
   * ⚠️ 시세는 여기 없다(날짜의 순수 함수다). 보유와 내역만 든다.
   */
  stocks?: StockState
  /**
   * 구독(어도비). **옵셔널이다** — 구독한 적 없으면 없다.
   * ⚠️ 이 필드가 **바탕화면 아이콘 하나와 활동 하나를 여닫는다**
   * (`DesktopItem.requiresSubscription`·`Activity.requiresSubscription`).
   */
  subscriptions?: SubscriptionState
  /**
   * 그몽 외주. **옵셔널이다** — 받은 적 없으면 없다.
   * ⚠️ 도구 활동(`Activity.toolId`)이 `runActivity`에서 진행도를 올리고,
   * 다 채우면 그 자리에서 보수가 들어온다(밤 정산이 아니라 즉시다).
   */
  gigs?: GigState
  /** 작품집(클립스튜디오 프로젝트). 만든 적 없으면 없다. */
  projects?: ProjectState
  /** 공모전 출품·수상. 낸 적 없으면 없다. */
  contests?: ContestState
  /** 웹툰 연재. 제의가 온 적 없으면 없다. */
  webtoon?: WebtoonState
  /**
   * 앓는 중인 병. **아프지 않으면 필드가 없다**(`daysLeft: 0`을 남기지 않는다 — 규칙은
   * `systems/illness.ts`). 옵셔널이라 이 필드가 없던 세이브도 그냥 "안 아픔"이 된다.
   *
   * ⚠️ **날씨는 여기 없다.** 날씨는 날짜의 순수 함수라 저장하지 않는다(`systems/weather.ts`) —
   * 저장하면 새로 고칠 때마다 다시 굴러 세이브 스커밍이 열린다.
   */
  illness?: Illness
  /**
   * 사람별 호감도(0~`AFFECTION_CAP`). 만난 적 없으면 그 키가 없다.
   *
   * ⚠️ **`Stats`에 넣지 않았다** — 성장 스탯은 하나의 값이고 이것은 사람마다 다른 값이다.
   * 넣으면 `STAT_NAMES`·`STAT_META`·`growthCap`·랭크가 인물 수만큼 늘고 스탯창이 명단이
   * 된다(규칙은 `systems/affection.ts`).
   */
  affection?: Record<string, number>
  /**
   * 사람별 **마지막으로 만난 날**. 안 만나면 멀어지는 판정이 이 값을 본다
   * (`systems/affection.ts`의 `decayAffection`).
   *
   * ⚠️ **`affection`과 따로 두는 이유**: 호감도는 "얼마나 가까운가"이고 이쪽은
   * "언제 봤는가"다. 한 값으로 합치려면 호감도에 날짜를 섞어야 하는데, 그러면 도감·
   * 대화창이 읽는 숫자가 날짜를 품게 된다.
   * ⚠️ 옵셔널이라 **이 필드가 없던 세이브도 그대로 열린다** — 값이 없으면 처음 만난
   * 날로 친다(`decayAffection`이 그렇게 읽는다).
   */
  lastMet?: Record<string, number>
  /**
   * **첫 실행 안내 투어를 이미 물어봤는가**(`components/desktop/Tour.tsx`).
   *
   * ⚠️ **판정은 이 값 하나다.** "설명을 들었다"가 아니라 "물어봤다"이므로 [설명 듣기]든
   * [바로 시작]이든 켜지고, 그래서 같은 판에서 두 번 묻는 일이 없다.
   * ⚠️ **옵셔널이다** — 필드가 없는 옛 세이브는 "아직 안 물어봄"으로 읽힌다.
   * ⚠️ **세이브에 둔다**(`metaStore`가 아니라). 안내는 "이 판을 어떻게 시작하는가"이지
   * 도감처럼 모으는 것이 아니고, 새 판을 여는 사람은 대개 오랜만에 돌아온 사람이라
   * 다시 묻는 편이 낫다. 언제든 되찾는 길은 설정의 [게임 설명 다시 보기]다.
   */
  tourSeen?: boolean
  /**
   * 이미 겪은 **랭크 이벤트** id(`data/rankEvents.ts`). 겪은 적 없으면 필드가 없다.
   *
   * ⚠️ **등급이 내려가도 지우지 않는다** — 지우면 오르내리기로 같은 이벤트를 무한히 다시
   * 받을 수 있고, 그중 하나가 스탯 +100(소원)이다. 규칙은 `systems/rankEvents.ts`.
   */
  rankEvents?: string[]
}

/**
 * 앓는 중인 병. 종류는 두지 않았다 — 종류마다 효과가 갈리지 않는데 이름만 여럿이면
 * 그것은 상태가 아니라 장식이다(필요해지면 그때 `kind`를 만든다).
 */
export interface Illness {
  /** 앓기 시작한 날. 화면이 "며칠째"를 적는다. */
  startedDay: number
  /** 남은 날. 취침마다 하나씩 줄고 0이 되는 순간 필드 자체가 사라진다. */
  daysLeft: number
}

export const INITIAL_STATS: Stats = {
  stamina: 100,
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
  manners: 0,
  art: 0,
  music: 0,
  finance: 0,
  tech: 0,
}
