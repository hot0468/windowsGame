# 윈도우 데스크톱 육성 게임 — 플레이 가능 코어 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 잠금화면 로그인부터 엔딩까지 처음부터 끝까지 완주 가능한 게임을 만든다 (설계 문서의 구현 순서 1~4단계).

**Architecture:** 게임 규칙 전체를 React와 분리된 `src/systems/`의 순수 함수로 구현하고 Vitest로 검증한다. UI는 공용 `Window` 컴포넌트 하나 위에 모든 창(스탯창·활동창·팝업)을 올린다. 상태는 Zustand 3개 스토어로 분리한다 — `gameStore`(세이브), `windowStore`(휘발), `metaStore`(영구).

**Tech Stack:** React 19.2, Vite 8.2, TypeScript 7.0, Zustand 5.0, Vitest 4.1

**범위 밖 (별도 계획):** 브라우저/포털/사이트, 엔딩 도감 UI, 랜덤 이벤트, 폴더 앱, 은행/대출. 이 계획은 4단계(완주 가능)까지만 다룬다.

## Global Constraints

- 모든 게임 수치는 `src/data/`에 두고 컴포넌트에 하드코딩하지 않는다.
- 게임 규칙은 `src/systems/`의 순수 함수로 구현한다. React import 금지, 상태 직접 변경(mutation) 금지 — 새 객체를 반환한다.
- 모든 창 UI는 공용 `Window` 컴포넌트 위에 구현한다.
- UI 텍스트와 주석은 한국어.
- 테스트는 `src/systems/`만 대상으로 한다. UI 컴포넌트 테스트는 작성하지 않는다.
- 스탯 키 이름은 전 코드에서 통일: `stamina`, `maxStamina`, `intelligence`, `charm`, `mental`, `money`.
- 각 태스크는 `npm test`와 `npm run build`가 모두 통과한 상태로 끝난다.
- 커밋 메시지는 한국어 본문 허용, prefix는 `feat:`/`fix:`/`chore:` 사용.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/types/game.ts` | 게임 도메인 타입 전부 (스탯, 활동, 엔딩, 세이브) |
| `src/data/activities.ts` | 활동 정의 목록 |
| `src/data/economy.ts` | 물가 곡선 |
| `src/data/endings.ts` | 엔딩 조건 |
| `src/systems/economy.ts` | 생활비·알바비 계산 |
| `src/systems/burnout.ts` | 연속 활동 누적 및 효율 감소 |
| `src/systems/turn.ts` | 활동 실행, 슬롯 전환, 일일 정산 |
| `src/systems/ending.ts` | 엔딩 판정 |
| `src/store/gameStore.ts` | 게임 진행 상태 (persist) |
| `src/store/metaStore.ts` | 도감 해금 (persist, 영구) |
| `src/store/windowStore.ts` | 창 목록·좌표·z-index (휘발) |
| `src/components/window/Window.tsx` | 공용 창 (드래그·포커스·닫기) |
| `src/components/window/WindowManager.tsx` | 열린 창 렌더링 |
| `src/components/lockscreen/LockScreen.tsx` | 잠금화면 |
| `src/components/desktop/Desktop.tsx` | 바탕화면 + 아이콘 |
| `src/components/desktop/Taskbar.tsx` | 작업표시줄 |
| `src/components/desktop/StatPanel.tsx` | 우상단 스탯창 |
| `src/components/apps/ExeApp.tsx` | exe 활동 창 |
| `src/components/apps/EndingModal.tsx` | 엔딩 도달/종료 팝업 |

---

## Task 1: 도메인 타입 + 활동/경제 데이터

**Files:**
- Create: `src/types/game.ts`
- Create: `src/data/activities.ts`
- Create: `src/data/economy.ts`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces: `Stats`, `StatDelta`, `Activity`, `Slot`, `GameState`, `ACTIVITIES`, `ECONOMY_TIERS`, `INITIAL_STATS`

이 태스크는 순수 타입·데이터 선언이므로 테스트 없이 타입 체크로 검증한다. 이후 모든 태스크가 여기 정의된 이름에 의존한다.

- [ ] **Step 1: 도메인 타입 작성**

`src/types/game.ts`:

```ts
/** 5대 스탯. maxStamina는 운동으로 영구 상승하는 성장 스탯이다. */
export interface Stats {
  stamina: number
  maxStamina: number
  intelligence: number
  charm: number
  mental: number
  money: number
}

/** 활동이 스탯에 주는 변화량. 없는 키는 변화 없음. */
export type StatDelta = Partial<Record<keyof Stats, number>>

/** 하루의 두 슬롯. */
export type Slot = 'morning' | 'afternoon'

/** 활동 정의. 수치는 전부 data/에만 존재한다. */
export interface Activity {
  id: string
  label: string
  icon: string
  description: string
  /** 스탯 변화량. money는 알바비 배율이 적용된다. */
  effects: StatDelta
  /** 실행에 필요한 최소 스탯. 미달이면 실행 불가. */
  requires?: Partial<Record<keyof Stats, number>>
  /** 알바비 배율(economy)을 money에 적용할지 여부. 알바 활동만 true. */
  scalesWithWage?: boolean
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
  intelligence: 10,
  charm: 10,
  mental: 100,
  money: 300000,
}
```

- [ ] **Step 2: 활동 데이터 작성**

`src/data/activities.ts`:

```ts
import type { Activity } from '../types/game'

/** 바탕화면 exe 활동. 수치 조정은 이 파일에서만 한다. */
export const ACTIVITIES: Activity[] = [
  {
    id: 'study',
    label: '공부.exe',
    icon: '📚',
    description: '전공서를 펼친다. 머리는 아프지만 확실히 는다.',
    effects: { intelligence: 6, stamina: -15, mental: -5 },
    requires: { stamina: 15 },
  },
  {
    id: 'work',
    label: '알바.exe',
    icon: '💼',
    description: '편의점 야간 근무. 돈은 들어온다.',
    effects: { money: 60000, stamina: -25, mental: -8 },
    requires: { stamina: 25 },
    scalesWithWage: true,
  },
  {
    id: 'exercise',
    label: '운동.exe',
    icon: '🏃',
    description: '체력의 한계를 조금씩 밀어낸다.',
    effects: { maxStamina: 4, stamina: -20, mental: 3 },
    requires: { stamina: 20 },
  },
  {
    id: 'game',
    label: '게임.exe',
    icon: '🎮',
    description: '아무 생각 없이 논다. 멘탈이 회복된다.',
    effects: { mental: 18, stamina: -5, intelligence: -1 },
    requires: { stamina: 5 },
  },
  {
    id: 'social',
    label: '메신저.exe',
    icon: '💬',
    description: '사람들과 어울린다. 돈은 좀 쓴다.',
    effects: { charm: 5, mental: 8, money: -20000, stamina: -10 },
    requires: { stamina: 10, money: 20000 },
  },
]

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
```

- [ ] **Step 3: 물가 데이터 작성**

`src/data/economy.ts`:

```ts
import type { EconomyTier } from '../types/game'

/**
 * 10일 주기 계단식 물가 인상.
 * 알바비(wageMultiplier)는 생활비보다 느리게 오른다 —
 * 후반으로 갈수록 저임금 알바의 실질 효율이 떨어지게 만드는 장치다.
 * day 내림차순이 아니라 오름차순으로 두고, 조회 시 역순 탐색한다.
 */
export const ECONOMY_TIERS: EconomyTier[] = [
  { day: 1, living: 30000, wageMultiplier: 1.0 },
  { day: 11, living: 38000, wageMultiplier: 1.15 },
  { day: 21, living: 48000, wageMultiplier: 1.28 },
  { day: 31, living: 60000, wageMultiplier: 1.39 },
  { day: 41, living: 75000, wageMultiplier: 1.48 },
  { day: 51, living: 95000, wageMultiplier: 1.55 },
]
```

- [ ] **Step 4: 타입 체크 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 5: 커밋**

```bash
git add src/types/game.ts src/data/activities.ts src/data/economy.ts
git commit -m "feat: 게임 도메인 타입과 활동/물가 데이터 정의"
```

---

## Task 2: 경제 시스템 (생활비·알바비)

**Files:**
- Create: `src/systems/economy.ts`
- Test: `src/systems/economy.test.ts`

**Interfaces:**
- Consumes: `ECONOMY_TIERS`, `EconomyTier` (Task 1)
- Produces: `getEconomyTier(day: number): EconomyTier`, `getLivingCost(day: number): number`, `getWageMultiplier(day: number): number`, `getNextTier(day: number): EconomyTier | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/systems/economy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getEconomyTier, getLivingCost, getWageMultiplier, getNextTier } from './economy'

describe('getEconomyTier', () => {
  it('1일차는 첫 구간을 반환한다', () => {
    expect(getEconomyTier(1).living).toBe(30000)
  })

  it('구간 경계 직전에는 이전 구간을 유지한다', () => {
    expect(getEconomyTier(10).living).toBe(30000)
  })

  it('구간 경계일에 다음 구간으로 넘어간다', () => {
    expect(getEconomyTier(11).living).toBe(38000)
  })

  it('마지막 구간을 넘어선 날짜는 마지막 구간을 유지한다', () => {
    expect(getEconomyTier(999).living).toBe(95000)
  })
})

describe('getLivingCost', () => {
  it('해당 날짜의 생활비를 반환한다', () => {
    expect(getLivingCost(25)).toBe(48000)
  })
})

describe('getWageMultiplier', () => {
  it('알바비 배율은 생활비 인상률보다 낮게 오른다', () => {
    const livingRatio = getLivingCost(51) / getLivingCost(1)
    const wageRatio = getWageMultiplier(51) / getWageMultiplier(1)
    expect(wageRatio).toBeLessThan(livingRatio)
  })
})

describe('getNextTier', () => {
  it('다음 인상 구간을 반환한다', () => {
    expect(getNextTier(5)?.day).toBe(11)
  })

  it('마지막 구간에서는 null을 반환한다', () => {
    expect(getNextTier(999)).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Failed to load url ./economy` 또는 `does not provide an export named 'getEconomyTier'`

- [ ] **Step 3: 구현**

`src/systems/economy.ts`:

```ts
import { ECONOMY_TIERS } from '../data/economy'
import type { EconomyTier } from '../types/game'

/** 해당 날짜에 적용되는 물가 구간. 뒤에서부터 탐색해 첫 매치를 쓴다. */
export function getEconomyTier(day: number): EconomyTier {
  for (let i = ECONOMY_TIERS.length - 1; i >= 0; i--) {
    if (day >= ECONOMY_TIERS[i].day) return ECONOMY_TIERS[i]
  }
  return ECONOMY_TIERS[0]
}

export function getLivingCost(day: number): number {
  return getEconomyTier(day).living
}

export function getWageMultiplier(day: number): number {
  return getEconomyTier(day).wageMultiplier
}

/** 아직 오지 않은 다음 인상 구간. 뉴스 예고에 사용한다. */
export function getNextTier(day: number): EconomyTier | null {
  return ECONOMY_TIERS.find((t) => t.day > day) ?? null
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — `Tests  8 passed (8)`

- [ ] **Step 5: 커밋**

```bash
git add src/systems/economy.ts src/systems/economy.test.ts
git commit -m "feat: 물가 구간 조회와 생활비/알바비 계산"
```

---

## Task 3: 번아웃 시스템

**Files:**
- Create: `src/systems/burnout.ts`
- Test: `src/systems/burnout.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `BURNOUT_WINDOW: number`, `countConsecutive(recent: string[], id: string): number`, `getBurnoutPenalty(recent: string[], id: string): { efficiency: number; mentalPenalty: number }`, `pushActivity(recent: string[], id: string): string[]`

같은 활동을 연속하면 효율이 떨어지고 멘탈이 추가 소모된다. 없으면 최고 효율 활동 하나만 무한 반복하는 것이 최적해가 되어 선택지가 무의미해진다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/systems/burnout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { countConsecutive, getBurnoutPenalty, pushActivity, BURNOUT_WINDOW } from './burnout'

describe('countConsecutive', () => {
  it('이력이 비면 0을 반환한다', () => {
    expect(countConsecutive([], 'study')).toBe(0)
  })

  it('배열 끝에서부터 같은 활동이 이어진 횟수를 센다', () => {
    expect(countConsecutive(['work', 'study', 'study'], 'study')).toBe(2)
  })

  it('중간에 다른 활동이 끼면 연속이 끊긴다', () => {
    expect(countConsecutive(['study', 'work', 'study'], 'study')).toBe(1)
  })

  it('마지막 활동이 다르면 0을 반환한다', () => {
    expect(countConsecutive(['study', 'study', 'work'], 'study')).toBe(0)
  })
})

describe('getBurnoutPenalty', () => {
  it('처음 하는 활동은 효율 100%에 추가 멘탈 소모가 없다', () => {
    expect(getBurnoutPenalty([], 'study')).toEqual({ efficiency: 1, mentalPenalty: 0 })
  })

  it('연속할수록 효율이 떨어진다', () => {
    const once = getBurnoutPenalty(['study'], 'study')
    const twice = getBurnoutPenalty(['study', 'study'], 'study')
    expect(twice.efficiency).toBeLessThan(once.efficiency)
  })

  it('연속할수록 멘탈 추가 소모가 커진다', () => {
    const once = getBurnoutPenalty(['study'], 'study')
    const twice = getBurnoutPenalty(['study', 'study'], 'study')
    expect(twice.mentalPenalty).toBeGreaterThan(once.mentalPenalty)
  })

  it('효율은 하한 아래로 떨어지지 않는다', () => {
    const many = Array(20).fill('study')
    expect(getBurnoutPenalty(many, 'study').efficiency).toBeGreaterThanOrEqual(0.3)
  })
})

describe('pushActivity', () => {
  it('활동을 이력 끝에 추가한다', () => {
    expect(pushActivity(['work'], 'study')).toEqual(['work', 'study'])
  })

  it('이력은 최대 길이를 넘지 않는다', () => {
    const full = Array(BURNOUT_WINDOW).fill('work')
    const result = pushActivity(full, 'study')
    expect(result).toHaveLength(BURNOUT_WINDOW)
    expect(result[result.length - 1]).toBe('study')
  })

  it('원본 배열을 변경하지 않는다', () => {
    const original = ['work']
    pushActivity(original, 'study')
    expect(original).toEqual(['work'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Failed to load url ./burnout`

- [ ] **Step 3: 구현**

`src/systems/burnout.ts`:

```ts
/** 번아웃 판정에 참고하는 최근 활동 이력의 최대 길이. */
export const BURNOUT_WINDOW = 8

/** 연속 1회마다 떨어지는 효율. */
const EFFICIENCY_STEP = 0.18

/** 효율 하한. 이 아래로는 떨어지지 않는다. */
const EFFICIENCY_FLOOR = 0.3

/** 연속 1회마다 추가로 소모되는 멘탈. */
const MENTAL_PENALTY_STEP = 4

/** 이력 끝에서부터 같은 활동이 몇 번 이어졌는지 센다. */
export function countConsecutive(recent: string[], id: string): number {
  let count = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i] !== id) break
    count++
  }
  return count
}

/**
 * 연속 실행에 따른 효율 배율과 추가 멘탈 소모량.
 * efficiency는 긍정 효과에만 곱한다 (소모량은 줄어들면 안 되므로).
 */
export function getBurnoutPenalty(
  recent: string[],
  id: string,
): { efficiency: number; mentalPenalty: number } {
  const streak = countConsecutive(recent, id)
  const efficiency = Math.max(EFFICIENCY_FLOOR, 1 - streak * EFFICIENCY_STEP)
  return { efficiency, mentalPenalty: streak * MENTAL_PENALTY_STEP }
}

/** 이력에 활동을 추가한다. 최대 길이를 넘으면 오래된 것부터 버린다. */
export function pushActivity(recent: string[], id: string): string[] {
  return [...recent, id].slice(-BURNOUT_WINDOW)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — `Tests  19 passed (19)` (economy 8 + burnout 11)

- [ ] **Step 5: 커밋**

```bash
git add src/systems/burnout.ts src/systems/burnout.test.ts
git commit -m "feat: 연속 활동 번아웃 누적 시스템"
```

---

## Task 4: 엔딩 데이터 + 판정 시스템

**Files:**
- Create: `src/data/endings.ts`
- Create: `src/systems/ending.ts`
- Test: `src/systems/ending.test.ts`

**Interfaces:**
- Consumes: `Stats`, `GameOverReason` (Task 1)
- Produces: `Ending` 타입, `ENDINGS`, `checkAchievementEnding(stats, seenIds): Ending | null`, `hasHigherTier(ending): boolean`, `getFailureEnding(reason): Ending`

엔딩 조건은 플레이어에게 비공개다. 판정은 상위 티어부터 내려오며 첫 매치를 반환한다.

- [ ] **Step 1: 엔딩 데이터 작성**

`src/data/endings.ts`:

```ts
import type { Stats } from '../types/game'

export interface Ending {
  id: string
  title: string
  icon: string
  /** 엔딩 화면에 표시할 본문. */
  text: string
  /** 모든 조건을 충족해야 도달한다. 실패 엔딩은 조건 없음. */
  condition?: Partial<Record<keyof Stats, number>>
  /** 높을수록 상위 엔딩. 판정은 tier 내림차순으로 한다. */
  tier: number
  /** 실패 엔딩은 선택 없이 강제 종료된다. */
  isFailure?: boolean
}

/** 성취 엔딩. tier 내림차순으로 정렬해 둔다 — 판정이 이 순서에 의존한다. */
export const ACHIEVEMENT_ENDINGS: Ending[] = [
  {
    id: 'bigtech',
    title: '대기업 합격',
    icon: '🏆',
    text: '최종 합격 통보가 왔다. 길고 지루했던 시간이 한 줄의 문장으로 보상받는 순간이다.',
    condition: { intelligence: 90, mental: 40 },
    tier: 4,
  },
  {
    id: 'influencer',
    title: '인플루언서',
    icon: '🌟',
    text: '팔로워가 십만을 넘겼다. 이제 사람들이 당신의 하루를 궁금해한다.',
    condition: { charm: 80 },
    tier: 3,
  },
  {
    id: 'ironman',
    title: '철인',
    icon: '💪',
    text: '거울 속의 몸이 낯설다. 무엇을 하든 지치지 않는 몸을 얻었다.',
    condition: { maxStamina: 200 },
    tier: 3,
  },
  {
    id: 'realist',
    title: '현실주의자',
    icon: '💸',
    text: '통장 잔고가 든든하다. 꿈은 접었지만, 적어도 굶지는 않는다.',
    condition: { money: 3000000 },
    tier: 2,
  },
  {
    id: 'ordinary',
    title: '평범한 일상',
    icon: '😐',
    text: '특별할 것 없는 하루가 쌓여 특별할 것 없는 삶이 되었다. 그것도 나쁘지 않다.',
    condition: { intelligence: 40, charm: 40 },
    tier: 1,
  },
]

/** 실패 엔딩. 조건 판정이 아니라 게임오버 사유로 직접 선택된다. */
export const FAILURE_ENDINGS: Record<string, Ending> = {
  bankrupt: {
    id: 'bankrupt',
    title: '파산',
    icon: '💀',
    text: '통장이 비었다. 월세 독촉 문자가 쌓이는 화면을 그저 바라본다.',
    tier: 0,
    isFailure: true,
  },
  burnout: {
    id: 'burnout',
    title: '번아웃',
    icon: '🔥',
    text: '아무것도 하고 싶지 않다. 침대에서 일어날 이유를 찾지 못한 채 하루가 지나간다.',
    tier: 0,
    isFailure: true,
  },
}

export const ENDINGS: Ending[] = [...ACHIEVEMENT_ENDINGS, ...Object.values(FAILURE_ENDINGS)]
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/systems/ending.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { checkAchievementEnding, hasHigherTier, getFailureEnding } from './ending'
import { INITIAL_STATS } from '../types/game'
import type { Stats } from '../types/game'

const statsWith = (overrides: Partial<Stats>): Stats => ({ ...INITIAL_STATS, ...overrides })

describe('checkAchievementEnding', () => {
  it('조건 미달이면 null을 반환한다', () => {
    expect(checkAchievementEnding(INITIAL_STATS, [])).toBeNull()
  })

  it('조건을 채우면 해당 엔딩을 반환한다', () => {
    const result = checkAchievementEnding(statsWith({ charm: 80 }), [])
    expect(result?.id).toBe('influencer')
  })

  it('여러 조건을 동시에 채우면 상위 티어를 우선한다', () => {
    const result = checkAchievementEnding(
      statsWith({ intelligence: 90, mental: 40, charm: 80 }),
      [],
    )
    expect(result?.id).toBe('bigtech')
  })

  it('조건이 여러 개인 엔딩은 전부 충족해야 한다', () => {
    const result = checkAchievementEnding(statsWith({ intelligence: 90, mental: 10 }), [])
    expect(result?.id).not.toBe('bigtech')
  })

  it('이미 본 엔딩은 다시 반환하지 않는다', () => {
    const result = checkAchievementEnding(statsWith({ charm: 80 }), ['influencer'])
    expect(result).toBeNull()
  })

  it('이미 본 엔딩을 건너뛰고 아래 티어를 반환한다', () => {
    const stats = statsWith({ charm: 80, intelligence: 40 })
    const result = checkAchievementEnding(stats, ['influencer'])
    expect(result?.id).toBe('ordinary')
  })
})

describe('hasHigherTier', () => {
  it('최상위 엔딩은 상위가 없다', () => {
    const top = checkAchievementEnding(statsWith({ intelligence: 90, mental: 40 }), [])!
    expect(hasHigherTier(top)).toBe(false)
  })

  it('하위 엔딩은 상위가 있다', () => {
    const low = checkAchievementEnding(statsWith({ intelligence: 40, charm: 40 }), [])!
    expect(hasHigherTier(low)).toBe(true)
  })
})

describe('getFailureEnding', () => {
  it('파산 엔딩을 반환한다', () => {
    expect(getFailureEnding('bankrupt').isFailure).toBe(true)
  })

  it('번아웃 엔딩을 반환한다', () => {
    expect(getFailureEnding('burnout').id).toBe('burnout')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Failed to load url ./ending`

- [ ] **Step 4: 구현**

`src/systems/ending.ts`:

```ts
import { ACHIEVEMENT_ENDINGS, FAILURE_ENDINGS } from '../data/endings'
import type { Ending } from '../data/endings'
import type { GameOverReason, Stats } from '../types/game'

/**
 * 현재 스탯으로 도달한 성취 엔딩을 반환한다.
 * ACHIEVEMENT_ENDINGS가 tier 내림차순이므로 앞에서부터 첫 매치가 최상위다.
 * 이미 본 엔딩(seenIds)은 팝업을 반복하지 않도록 건너뛴다.
 */
export function checkAchievementEnding(stats: Stats, seenIds: string[]): Ending | null {
  for (const ending of ACHIEVEMENT_ENDINGS) {
    if (seenIds.includes(ending.id)) continue
    if (!ending.condition) continue
    const met = Object.entries(ending.condition).every(
      ([key, required]) => stats[key as keyof Stats] >= required,
    )
    if (met) return ending
  }
  return null
}

/** 이 엔딩보다 높은 티어가 존재하는지. "더 높은 곳이 있을지도?" 암시에 사용. */
export function hasHigherTier(ending: Ending): boolean {
  return ACHIEVEMENT_ENDINGS.some((e) => e.tier > ending.tier)
}

export function getFailureEnding(reason: GameOverReason): Ending {
  return FAILURE_ENDINGS[reason]
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — `Tests  29 passed (29)` (economy 8 + burnout 11 + ending 10)

- [ ] **Step 6: 커밋**

```bash
git add src/data/endings.ts src/systems/ending.ts src/systems/ending.test.ts
git commit -m "feat: 엔딩 데이터와 티어 기반 판정 시스템"
```

---

## Task 5: 턴 시스템 (활동 실행 · 일일 정산)

**Files:**
- Create: `src/systems/turn.ts`
- Test: `src/systems/turn.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Stats`, `Activity`, `INITIAL_STATS` (Task 1), `getLivingCost`/`getWageMultiplier` (Task 2), `getBurnoutPenalty`/`pushActivity` (Task 3)
- Produces: `createInitialState(name): GameState`, `canRun(state, activity): boolean`, `runActivity(state, activity): GameState`, `skipSlot(state): GameState`

이 게임의 심장이다. 활동 실행 → 슬롯 전환 → (오후였다면) 취침 정산 → 게임오버 판정이 한 흐름으로 처리된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/systems/turn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createInitialState, canRun, runActivity, skipSlot } from './turn'
import { findActivity } from '../data/activities'
import { getLivingCost } from './economy'
import type { GameState } from '../types/game'

const study = findActivity('study')!
const work = findActivity('work')!

/** 테스트용 상태 생성 헬퍼. */
const stateWith = (overrides: Partial<GameState>): GameState => ({
  ...createInitialState('테스터'),
  ...overrides,
})

describe('createInitialState', () => {
  it('플레이어 이름을 설정한다', () => {
    expect(createInitialState('김철수').playerName).toBe('김철수')
  })

  it('1일차 오전에 시작한다', () => {
    const s = createInitialState('김철수')
    expect(s.day).toBe(1)
    expect(s.slot).toBe('morning')
  })

  it('게임오버 상태가 아니다', () => {
    expect(createInitialState('김철수').gameOver).toBeNull()
  })
})

describe('canRun', () => {
  it('요구 스탯을 충족하면 실행 가능하다', () => {
    expect(canRun(createInitialState('t'), study)).toBe(true)
  })

  it('체력이 부족하면 실행 불가하다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 5 } })
    expect(canRun(s, study)).toBe(false)
  })

  it('돈이 부족하면 실행 불가하다', () => {
    const social = findActivity('social')!
    const s = stateWith({ stats: { ...createInitialState('t').stats, money: 100 } })
    expect(canRun(s, social)).toBe(false)
  })

  it('게임오버 상태에서는 실행 불가하다', () => {
    expect(canRun(stateWith({ gameOver: 'bankrupt' }), study)).toBe(false)
  })
})

describe('runActivity — 스탯 적용', () => {
  it('활동 효과를 스탯에 반영한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.intelligence).toBe(before.stats.intelligence + 6)
  })

  it('체력을 소모한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBe(before.stats.stamina - 15)
  })

  it('원본 상태를 변경하지 않는다', () => {
    const before = createInitialState('t')
    const snapshot = before.stats.intelligence
    runActivity(before, study)
    expect(before.stats.intelligence).toBe(snapshot)
  })

  it('체력은 0 아래로 내려가지 않는다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 16 } })
    expect(runActivity(s, study).stats.stamina).toBe(1)
  })

  it('취침 회복으로도 체력은 maxStamina를 넘지 않는다', () => {
    // 오후에 활동하면 취침 회복(maxStamina * 0.6)이 붙는다.
    // 체력이 이미 높으면 상한을 넘겨야 하는데, 클램핑이 이를 막는지 확인한다.
    const s = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: 100, maxStamina: 100 },
    })
    const after = runActivity(s, findActivity('game')!)
    expect(after.stats.stamina).toBe(100)
  })

  it('알바비에 물가 배율이 적용된다', () => {
    const early = runActivity(stateWith({ day: 1 }), work)
    const late = runActivity(stateWith({ day: 51 }), work)
    const earlyGain = early.stats.money - 300000
    const lateGain = late.stats.money - 300000
    expect(lateGain).toBeGreaterThan(earlyGain)
  })
})

describe('runActivity — 슬롯과 날짜 전환', () => {
  it('오전 활동 후 오후로 넘어가고 날짜는 그대로다', () => {
    const after = runActivity(createInitialState('t'), study)
    expect(after.slot).toBe('afternoon')
    expect(after.day).toBe(1)
  })

  it('오후 활동 후 다음 날 오전이 된다', () => {
    const after = runActivity(stateWith({ slot: 'afternoon' }), study)
    expect(after.slot).toBe('morning')
    expect(after.day).toBe(2)
  })
})

describe('runActivity — 취침 정산', () => {
  it('하루가 끝나면 생활비가 차감된다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = runActivity(before, study)
    const activityMoney = 0
    expect(after.stats.money).toBe(before.stats.money + activityMoney - getLivingCost(1))
  })

  it('하루가 끝나면 체력이 회복된다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: 50 },
    })
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBeGreaterThan(50 - 15)
  })

  it('오전 활동에는 생활비가 차감되지 않는다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.money).toBe(before.stats.money)
  })
})

describe('runActivity — 번아웃', () => {
  it('활동 이력에 기록된다', () => {
    expect(runActivity(createInitialState('t'), study).recentActivities).toEqual(['study'])
  })

  it('연속 실행하면 효율이 떨어져 스탯 상승폭이 줄어든다', () => {
    const fresh = createInitialState('t')
    const firstGain = runActivity(fresh, study).stats.intelligence - fresh.stats.intelligence

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedGain =
      runActivity(repeated, study).stats.intelligence - repeated.stats.intelligence

    expect(repeatedGain).toBeLessThan(firstGain)
  })

  it('연속 실행하면 멘탈이 추가로 소모된다', () => {
    const fresh = createInitialState('t')
    const freshLoss = fresh.stats.mental - runActivity(fresh, study).stats.mental

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedLoss = repeated.stats.mental - runActivity(repeated, study).stats.mental

    expect(repeatedLoss).toBeGreaterThan(freshLoss)
  })
})

describe('runActivity — 게임오버 판정', () => {
  it('소지금이 0 이하가 되면 파산이다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, money: 1000 },
    })
    expect(runActivity(before, study).gameOver).toBe('bankrupt')
  })

  it('멘탈이 0 이하가 되면 번아웃이다', () => {
    const before = stateWith({ stats: { ...createInitialState('t').stats, mental: 3 } })
    expect(runActivity(before, study).gameOver).toBe('burnout')
  })

  it('진행 가능한 상태에서는 게임오버가 아니다', () => {
    expect(runActivity(createInitialState('t'), study).gameOver).toBeNull()
  })

  it('게임오버 상태에서 활동해도 상태가 바뀌지 않는다', () => {
    const over = stateWith({ gameOver: 'bankrupt' })
    expect(runActivity(over, study)).toBe(over)
  })
})

describe('skipSlot', () => {
  it('스탯 변화 없이 슬롯만 넘긴다', () => {
    const before = createInitialState('t')
    const after = skipSlot(before)
    expect(after.slot).toBe('afternoon')
    expect(after.stats.intelligence).toBe(before.stats.intelligence)
  })

  it('활동 이력에 기록되지 않아 번아웃 연속이 끊긴다', () => {
    const before = stateWith({ recentActivities: ['study'] })
    expect(skipSlot(before).recentActivities).toEqual(['study', 'rest'])
  })

  it('오후에 넘기면 취침 정산이 일어난다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = skipSlot(before)
    expect(after.day).toBe(2)
    expect(after.stats.money).toBe(before.stats.money - getLivingCost(1))
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Failed to load url ./turn`

- [ ] **Step 3: 구현**

`src/systems/turn.ts`:

```ts
import { getLivingCost, getWageMultiplier } from './economy'
import { getBurnoutPenalty, pushActivity } from './burnout'
import { INITIAL_STATS } from '../types/game'
import type { Activity, GameState, Slot, Stats } from '../types/game'

/** 취침 시 회복되는 체력 비율 (maxStamina 기준). */
const SLEEP_RECOVERY_RATIO = 0.6

/** 취침 시 회복되는 멘탈. */
const SLEEP_MENTAL_RECOVERY = 5

export function createInitialState(playerName: string): GameState {
  return {
    playerName,
    day: 1,
    slot: 'morning',
    stats: { ...INITIAL_STATS },
    recentActivities: [],
    seenEndingIds: [],
    gameOver: null,
  }
}

/** 요구 스탯을 모두 충족하고 게임오버가 아니어야 실행 가능하다. */
export function canRun(state: GameState, activity: Activity): boolean {
  if (state.gameOver) return false
  if (!activity.requires) return true
  return Object.entries(activity.requires).every(
    ([key, required]) => state.stats[key as keyof Stats] >= required,
  )
}

/** 체력은 0~maxStamina, 멘탈은 0~100으로 제한한다. 나머지는 0 하한만 둔다. */
function clampStats(stats: Stats): Stats {
  return {
    ...stats,
    maxStamina: Math.max(1, Math.round(stats.maxStamina)),
    stamina: Math.round(Math.min(Math.max(0, stats.stamina), Math.max(1, stats.maxStamina))),
    intelligence: Math.max(0, Math.round(stats.intelligence)),
    charm: Math.max(0, Math.round(stats.charm)),
    mental: Math.round(Math.min(Math.max(0, stats.mental), 100)),
    money: Math.round(stats.money),
  }
}

/**
 * 활동 효과를 스탯에 적용한다.
 * 번아웃 효율은 긍정 효과에만 곱한다 — 소모량까지 줄어들면 페널티가 아니게 된다.
 * 알바비(scalesWithWage)에는 물가 배율을 적용한다.
 */
function applyEffects(stats: Stats, activity: Activity, day: number, efficiency: number): Stats {
  const next = { ...stats }
  for (const [key, rawValue] of Object.entries(activity.effects)) {
    const statKey = key as keyof Stats
    let value = rawValue
    if (statKey === 'money' && value > 0 && activity.scalesWithWage) {
      value *= getWageMultiplier(day)
    }
    next[statKey] += value > 0 ? value * efficiency : value
  }
  return next
}

/** 취침: 체력·멘탈 회복 후 생활비 차감. */
function sleep(stats: Stats, day: number): Stats {
  return {
    ...stats,
    stamina: stats.stamina + stats.maxStamina * SLEEP_RECOVERY_RATIO,
    mental: stats.mental + SLEEP_MENTAL_RECOVERY,
    money: stats.money - getLivingCost(day),
  }
}

/** 슬롯을 넘기고, 오후였다면 취침 정산까지 처리한다. */
function advance(state: GameState, stats: Stats): { day: number; slot: Slot; stats: Stats } {
  if (state.slot === 'morning') {
    return { day: state.day, slot: 'afternoon', stats }
  }
  return { day: state.day + 1, slot: 'morning', stats: sleep(stats, state.day) }
}

function detectGameOver(stats: Stats): GameState['gameOver'] {
  if (stats.money <= 0) return 'bankrupt'
  if (stats.mental <= 0) return 'burnout'
  return null
}

/** 활동을 실행하고 다음 슬롯 상태를 반환한다. 원본은 변경하지 않는다. */
export function runActivity(state: GameState, activity: Activity): GameState {
  if (state.gameOver) return state

  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, activity.id)
  const withEffects = applyEffects(state.stats, activity, state.day, efficiency)
  withEffects.mental -= mentalPenalty

  const advanced = advance(state, withEffects)
  const stats = clampStats(advanced.stats)

  return {
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, activity.id),
    gameOver: detectGameOver(stats),
  }
}

/** 아무 활동 없이 슬롯만 넘긴다. 'rest' 기록으로 번아웃 연속이 끊긴다. */
export function skipSlot(state: GameState): GameState {
  if (state.gameOver) return state

  const advanced = advance(state, { ...state.stats })
  const stats = clampStats(advanced.stats)

  return {
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, 'rest'),
    gameOver: detectGameOver(stats),
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — `Tests  57 passed (57)` (economy 8 + burnout 11 + ending 10 + turn 28)

- [ ] **Step 5: 커밋**

```bash
git add src/systems/turn.ts src/systems/turn.test.ts
git commit -m "feat: 턴 시스템 - 활동 실행, 슬롯 전환, 취침 정산, 게임오버 판정"
```

---

## Task 6: Zustand 스토어 3종

**Files:**
- Create: `src/store/gameStore.ts`
- Create: `src/store/metaStore.ts`
- Create: `src/store/windowStore.ts`

**Interfaces:**
- Consumes: `GameState`, `Activity` (Task 1), `createInitialState`/`runActivity`/`skipSlot`/`canRun` (Task 5), `checkAchievementEnding` (Task 4)
- Produces:
  - `useGameStore` — `{ state: GameState | null, startGame(name), doActivity(activity), doSkip(), markEndingSeen(id), reset() }` (Task 8에서 `loggedIn`·`continueGame()`·`logout()`이 추가된다)
  - `useMetaStore` — `{ unlockedEndings: string[], unlock(id), isUnlocked(id) }`
  - `useWindowStore` — `{ windows: OpenWindow[], open(win), close(id), focus(id), move(id, x, y) }`, `OpenWindow` 타입

스토어를 셋으로 나누는 이유: `gameStore`는 판마다 초기화되는 세이브, `metaStore`는 판을 넘어 유지되는 도감, `windowStore`는 저장하지 않는 휘발 상태다. 한 스토어에 섞으면 저장 범위를 나눌 수 없다.

- [ ] **Step 1: 게임 스토어 작성**

`src/store/gameStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { canRun, createInitialState, runActivity, skipSlot } from '../systems/turn'
import type { Activity, GameState } from '../types/game'

interface GameStore {
  state: GameState | null
  startGame: (name: string) => void
  doActivity: (activity: Activity) => void
  doSkip: () => void
  markEndingSeen: (endingId: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: null,

      startGame: (name) => set({ state: createInitialState(name) }),

      doActivity: (activity) => {
        const current = get().state
        if (!current || !canRun(current, activity)) return
        set({ state: runActivity(current, activity) })
      },

      doSkip: () => {
        const current = get().state
        if (!current) return
        set({ state: skipSlot(current) })
      },

      markEndingSeen: (endingId) => {
        const current = get().state
        if (!current || current.seenEndingIds.includes(endingId)) return
        set({ state: { ...current, seenEndingIds: [...current.seenEndingIds, endingId] } })
      },

      reset: () => set({ state: null }),
    }),
    {
      name: 'windows-game-save',
      version: 1,
      // 스탯이나 필드를 추가하면 여기서 구버전 세이브를 보정한다.
      // 지금은 v1이 최초 버전이라 그대로 통과시킨다.
      migrate: (persisted) => persisted as { state: GameState | null },
    },
  ),
)
```

- [ ] **Step 2: 메타 스토어 작성**

`src/store/metaStore.ts`:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MetaStore {
  /** 해금된 엔딩 id. 새 게임을 시작해도 유지된다. */
  unlockedEndings: string[]
  unlock: (endingId: string) => void
  isUnlocked: (endingId: string) => boolean
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      unlockedEndings: [],

      unlock: (endingId) => {
        if (get().unlockedEndings.includes(endingId)) return
        set({ unlockedEndings: [...get().unlockedEndings, endingId] })
      },

      isUnlocked: (endingId) => get().unlockedEndings.includes(endingId),
    }),
    { name: 'windows-game-meta', version: 1 },
  ),
)
```

- [ ] **Step 3: 창 스토어 작성**

`src/store/windowStore.ts`:

```ts
import { create } from 'zustand'

/** 열려 있는 창 하나. content는 창 종류를 식별하는 키다. */
export interface OpenWindow {
  id: string
  title: string
  icon: string
  x: number
  y: number
  width: number
  zIndex: number
  /** 렌더링할 앱 종류. 'exe'는 activityId를 함께 쓴다. */
  kind: 'exe' | 'ending'
  activityId?: string
}

interface WindowStore {
  windows: OpenWindow[]
  topZ: number
  open: (win: Omit<OpenWindow, 'zIndex'>) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  closeAll: () => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,

  /** 이미 열린 창이면 새로 열지 않고 포커스만 올린다. */
  open: (win) => {
    const existing = get().windows.find((w) => w.id === win.id)
    if (existing) {
      get().focus(win.id)
      return
    }
    const zIndex = get().topZ + 1
    set({ windows: [...get().windows, { ...win, zIndex }], topZ: zIndex })
  },

  close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),

  focus: (id) => {
    const zIndex = get().topZ + 1
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, zIndex } : w)),
      topZ: zIndex,
    })
  },

  move: (id, x, y) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),

  closeAll: () => set({ windows: [] }),
}))
```

- [ ] **Step 4: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 5: 커밋**

```bash
git add src/store
git commit -m "feat: 게임/메타/창 상태 스토어 3종"
```

---

## Task 7: 공용 Window 컴포넌트

**Files:**
- Create: `src/components/window/Window.tsx`
- Create: `src/components/window/Window.css`

**Interfaces:**
- Consumes: `useWindowStore` (Task 6)
- Produces: `Window` 컴포넌트 — props `{ id: string; title: string; icon: string; x: number; y: number; width: number; zIndex: number; onClose?: () => void; children: React.ReactNode }`

이 게임의 기술적 핵심이다. 이후 모든 UI(스탯창·활동창·엔딩 팝업)가 이 컴포넌트 위에 올라가므로 여기가 튼튼해야 나머지가 쉬워진다.

드래그는 `pointer` 이벤트와 `setPointerCapture`로 구현한다. 마우스가 창 밖으로 빠르게 나가도 캡처 덕분에 드래그가 끊기지 않는다.

- [ ] **Step 1: 스타일 작성**

`src/components/window/Window.css`:

```css
.win {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #f0f0f0;
  border: 1px solid #8a8a8a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  min-width: 200px;
}

.win-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(#fdfdfd, #e8e8e8);
  border-bottom: 1px solid #d0d0d0;
  cursor: grab;
  font-size: 13px;
  font-weight: 600;
  color: #202020;
}

.win-title:active {
  cursor: grabbing;
}

.win-title-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-close {
  border: none;
  background: transparent;
  width: 28px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  color: #333;
}

.win-close:hover {
  background: #e81123;
  color: #fff;
}

.win-body {
  padding: 12px;
  font-size: 13px;
  color: #202020;
  overflow-y: auto;
  max-height: 60vh;
}
```

- [ ] **Step 2: 컴포넌트 작성**

`src/components/window/Window.tsx`:

```tsx
import { useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useWindowStore } from '../../store/windowStore'
import './Window.css'

interface WindowProps {
  id: string
  title: string
  icon: string
  x: number
  y: number
  width: number
  zIndex: number
  /** 없으면 닫기 버튼을 숨긴다 (스탯창처럼 상시 표시되는 창). */
  onClose?: () => void
  children: ReactNode
}

export function Window({
  id,
  title,
  icon,
  x,
  y,
  width,
  zIndex,
  onClose,
  children,
}: WindowProps) {
  const move = useWindowStore((s) => s.move)
  const focus = useWindowStore((s) => s.focus)
  /** 드래그 시작 시점의 커서-창 좌표 차이. 창이 커서로 순간이동하는 것을 막는다. */
  const offset = useRef({ dx: 0, dy: 0 })

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    focus(id)
    offset.current = { dx: e.clientX - x, dy: e.clientY - y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    // 창이 화면 밖으로 완전히 사라지지 않도록 가둔다.
    const nextX = Math.min(Math.max(0, e.clientX - offset.current.dx), window.innerWidth - 80)
    const nextY = Math.min(Math.max(0, e.clientY - offset.current.dy), window.innerHeight - 60)
    move(id, nextX, nextY)
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="win"
      style={{ left: x, top: y, width, zIndex }}
      onPointerDown={() => focus(id)}
    >
      <div
        className="win-title"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span>{icon}</span>
        <span className="win-title-text">{title}</span>
        {onClose && (
          <button className="win-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        )}
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 4: 커밋**

```bash
git add src/components/window
git commit -m "feat: 드래그와 포커스를 지원하는 공용 Window 컴포넌트"
```

---

## Task 8: 잠금화면

**Files:**
- Create: `src/components/lockscreen/LockScreen.tsx`
- Create: `src/components/lockscreen/LockScreen.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 6)
- Produces: `LockScreen` 컴포넌트 (props 없음)
- Modifies: `useGameStore`에 `loggedIn: boolean`과 `logout()` 추가. `App`은 `loggedIn`으로 화면을 분기한다.

이름을 입력하면 게임이 시작된다. 기존 세이브가 있으면 이름 입력 대신 이어하기를 제공한다.

**`loggedIn` 플래그가 필요한 이유:** 세이브 존재 여부(`state !== null`)로 화면을 분기하면 세이브가 있을 때 잠금화면이 아예 표시되지 않아 이어하기 UI에 도달할 수 없다. 로그인 여부와 세이브 존재 여부는 별개의 상태이므로 분리한다. `loggedIn`은 저장하지 않아 새로고침 시 항상 잠금화면부터 시작한다.

- [ ] **Step 1: 스타일 작성**

`src/components/lockscreen/LockScreen.css`:

```css
.lock {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: linear-gradient(160deg, #0a2540 0%, #1e4d78 55%, #2d7ab8 100%);
  color: #fff;
}

.lock-clock {
  font-size: 72px;
  font-weight: 200;
  letter-spacing: 2px;
}

.lock-date {
  font-size: 18px;
  opacity: 0.85;
  margin-bottom: 30px;
}

.lock-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.lock-name {
  font-size: 20px;
  font-weight: 600;
}

.lock-input {
  width: 240px;
  padding: 9px 14px;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 4px 4px 0 0;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 15px;
  text-align: center;
  outline: none;
}

.lock-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.lock-btn {
  padding: 9px 26px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.lock-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lock-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lock-sub {
  font-size: 13px;
  opacity: 0.7;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  text-decoration: underline;
}
```

- [ ] **Step 2: 컴포넌트 작성**

`src/components/lockscreen/LockScreen.tsx`:

```tsx
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import './LockScreen.css'

export function LockScreen() {
  const [name, setName] = useState('')
  const saved = useGameStore((s) => s.state)
  const startGame = useGameStore((s) => s.startGame)
  const reset = useGameStore((s) => s.reset)

  // 세이브가 있으면 이어하기를 먼저 제안한다.
  const [showNewGame, setShowNewGame] = useState(false)
  const hasSave = saved !== null && saved.gameOver === null
  const isNewGameMode = !hasSave || showNewGame

  const handleStart = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    startGame(trimmed)
  }

  return (
    <div className="lock">
      <div className="lock-clock">
        {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="lock-date">
        {new Date().toLocaleDateString('ko-KR', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </div>

      <div className="lock-avatar">👤</div>

      {isNewGameMode ? (
        <>
          <input
            className="lock-input"
            placeholder="이름을 입력하세요"
            value={name}
            maxLength={12}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
          <button className="lock-btn" onClick={handleStart} disabled={!name.trim()}>
            로그인
          </button>
        </>
      ) : (
        <>
          <div className="lock-name">{saved.playerName}</div>
          <button className="lock-btn" onClick={() => startGame(saved.playerName)}>
            이어하기 ({saved.day}일차)
          </button>
          <button
            className="lock-sub"
            onClick={() => {
              reset()
              setShowNewGame(true)
            }}
          >
            새로 시작
          </button>
        </>
      )}
    </div>
  )
}
```

`startGame(saved.playerName)`이 이어하기에서 상태를 초기화해버리면 안 된다. 다음 스텝에서 이를 수정한다.

- [ ] **Step 3: 스토어에 로그인 상태 추가**

`src/store/gameStore.ts`를 수정한다. 인터페이스에 두 줄을 추가하고:

```ts
interface GameStore {
  state: GameState | null
  /** 잠금화면을 통과했는지. 저장하지 않아 새로고침 시 잠금화면부터 시작한다. */
  loggedIn: boolean
  startGame: (name: string) => void
  continueGame: () => void
  logout: () => void
  doActivity: (activity: Activity) => void
  doSkip: () => void
  markEndingSeen: (endingId: string) => void
  reset: () => void
}
```

`state: null,` 바로 아래에 `loggedIn: false,`를 추가한 뒤, `startGame`과 `reset`을 아래로 교체하고 `continueGame`·`logout`을 추가한다:

```ts
      /** 새 게임: 기존 세이브를 버리고 새로 만든다. */
      startGame: (name) => set({ state: createInitialState(name), loggedIn: true }),

      /** 이어하기: 기존 세이브를 그대로 두고 로그인만 처리한다. */
      continueGame: () => {
        if (!get().state) return
        set({ loggedIn: true })
      },

      /** 잠금화면으로 돌아간다. 세이브는 유지된다. */
      logout: () => set({ loggedIn: false }),
```

```ts
      /** 세이브를 지우고 잠금화면으로 돌아간다. */
      reset: () => set({ state: null, loggedIn: false }),
```

마지막으로 `persist` 옵션에 `partialize`를 추가해 `loggedIn`이 저장되지 않게 한다. `name: 'windows-game-save',` 아래에 넣는다:

```ts
      partialize: (s) => ({ state: s.state }),
```

- [ ] **Step 4: 잠금화면을 새 액션에 맞게 수정**

Step 2에서 작성한 `LockScreen.tsx`의 액션 구독과 이어하기 버튼을 수정한다. `const reset = useGameStore((s) => s.reset)` 아래에 추가한다:

```tsx
  const continueGame = useGameStore((s) => s.continueGame)
```

그리고 이어하기 버튼의 `onClick`을 교체한다:

```tsx
          <button className="lock-btn" onClick={continueGame}>
            이어하기 ({saved.day}일차)
          </button>
```

- [ ] **Step 5: App에 연결**

`src/App.tsx` 전체를 교체한다:

```tsx
import { useGameStore } from './store/gameStore'
import { LockScreen } from './components/lockscreen/LockScreen'

export default function App() {
  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)

  if (!loggedIn || !state) return <LockScreen />

  return <div style={{ padding: 20 }}>바탕화면 준비 중 — {state.playerName}</div>
}
```

- [ ] **Step 6: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 7: 브라우저로 동작 확인**

Run: `npm run dev`
확인 사항:
- 잠금화면이 뜨고, 이름 입력 후 로그인하면 "바탕화면 준비 중 — {입력한 이름}"이 표시된다
- 새로고침하면 잠금화면으로 돌아가되 "이어하기 (1일차)" 버튼이 보인다
- 이어하기를 누르면 같은 이름으로 복귀한다
- "새로 시작"을 누르면 이름 입력창으로 바뀐다

- [ ] **Step 8: 커밋**

```bash
git add src/components/lockscreen src/App.tsx src/store/gameStore.ts
git commit -m "feat: 잠금화면 로그인과 이어하기"
```

---

## Task 9: 바탕화면 + 스탯창 + 작업표시줄

**Files:**
- Create: `src/components/desktop/Desktop.tsx`
- Create: `src/components/desktop/Desktop.css`
- Create: `src/components/desktop/StatPanel.tsx`
- Create: `src/components/desktop/Taskbar.tsx`
- Create: `src/components/window/WindowManager.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `useWindowStore` (Task 6), `Window` (Task 7), `ACTIVITIES` (Task 1), `getLivingCost`/`getNextTier` (Task 2)
- Produces: `Desktop`, `StatPanel`, `Taskbar`, `WindowManager` 컴포넌트 (모두 props 없음)

- [ ] **Step 1: 스타일 작성**

`src/components/desktop/Desktop.css`:

```css
.desktop {
  position: fixed;
  inset: 0;
  background: linear-gradient(150deg, #1b3a5c 0%, #2d6ea8 50%, #4a9fd8 100%);
  overflow: hidden;
}

.desktop-icons {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  padding: 12px;
  height: calc(100% - 44px);
  width: 200px;
}

.desktop-icon {
  width: 84px;
  padding: 8px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.desktop-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.desktop-icon-glyph {
  display: block;
  font-size: 32px;
  margin-bottom: 4px;
}

.taskbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: rgba(24, 32, 44, 0.92);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 12px;
  z-index: 9000;
}

.taskbar-start {
  font-size: 18px;
  padding: 4px 10px;
  background: none;
  border: none;
  color: #fff;
  cursor: default;
}

.taskbar-items {
  display: flex;
  gap: 6px;
  flex: 1;
  overflow: hidden;
}

.taskbar-item {
  padding: 5px 12px;
  border: none;
  border-bottom: 2px solid #4a9fd8;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.taskbar-item:hover {
  background: rgba(255, 255, 255, 0.25);
}

.taskbar-clock {
  text-align: right;
  line-height: 1.35;
}

.taskbar-skip {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.taskbar-skip:hover {
  background: rgba(255, 255, 255, 0.28);
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.stat-label {
  width: 52px;
  font-size: 12px;
  color: #444;
}

.stat-bar {
  flex: 1;
  height: 9px;
  background: #dcdcdc;
  border-radius: 5px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.25s ease;
}

.stat-value {
  width: 62px;
  text-align: right;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #202020;
}

.stat-warn {
  color: #c62828;
  font-weight: 700;
}

.stat-divider {
  margin: 9px 0;
  border: none;
  border-top: 1px solid #d5d5d5;
}

.stat-note {
  font-size: 11px;
  color: #666;
  line-height: 1.5;
}
```

- [ ] **Step 2: 스탯창 작성**

`src/components/desktop/StatPanel.tsx`:

```tsx
import { Window } from '../window/Window'
import { useGameStore } from '../../store/gameStore'
import { getLivingCost, getNextTier } from '../../systems/economy'

/** 스탯 하나를 게이지로 표시한다. max가 없으면 게이지 없이 숫자만 보여준다. */
function StatRow({
  label,
  value,
  max,
  color,
  suffix = '',
  warn = false,
}: {
  label: string
  value: number
  max?: number
  color?: string
  suffix?: string
  warn?: boolean
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      {max !== undefined && (
        <span className="stat-bar">
          <span
            className="stat-fill"
            style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
          />
        </span>
      )}
      <span className={`stat-value${warn ? ' stat-warn' : ''}`}>
        {value.toLocaleString('ko-KR')}
        {suffix}
      </span>
    </div>
  )
}

export function StatPanel() {
  const state = useGameStore((s) => s.state)
  if (!state) return null

  const { stats, day } = state
  const nextTier = getNextTier(day)

  return (
    <Window
      id="stats"
      title={state.playerName}
      icon="👤"
      x={window.innerWidth - 296}
      y={16}
      width={280}
      zIndex={8000}
    >
      <StatRow label="💪 체력" value={stats.stamina} max={stats.maxStamina} color="#43a047" />
      <StatRow label="🧠 지능" value={stats.intelligence} max={100} color="#1e88e5" />
      <StatRow label="✨ 매력" value={stats.charm} max={100} color="#d81b60" />
      <StatRow
        label="😊 멘탈"
        value={stats.mental}
        max={100}
        color="#fb8c00"
        warn={stats.mental <= 20}
      />
      <StatRow label="💰 소지금" value={stats.money} suffix="원" warn={stats.money <= 100000} />

      <hr className="stat-divider" />

      <div className="stat-note">
        오늘 생활비 {getLivingCost(day).toLocaleString('ko-KR')}원
        {nextTier && (
          <>
            <br />
            {nextTier.day - day}일 후 {nextTier.living.toLocaleString('ko-KR')}원으로 인상
          </>
        )}
      </div>
    </Window>
  )
}
```

스탯창은 `onClose`를 넘기지 않으므로 닫기 버튼이 없다. 설계상 항상 표시되는 창이다.

- [ ] **Step 3: 작업표시줄 작성**

`src/components/desktop/Taskbar.tsx`:

```tsx
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'

/** 게임 내 날짜를 3월 1일 기준으로 환산해 표시한다. */
function formatGameDate(day: number): string {
  const base = new Date(2026, 2, 1)
  base.setDate(base.getDate() + day - 1)
  return base.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function Taskbar() {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const windows = useWindowStore((s) => s.windows)
  const focus = useWindowStore((s) => s.focus)

  if (!state) return null

  const slotLabel = state.slot === 'morning' ? '오전 ☀️' : '오후 🌆'

  return (
    <div className="taskbar">
      <button className="taskbar-start">⊞</button>

      <div className="taskbar-items">
        {windows.map((w) => (
          <button key={w.id} className="taskbar-item" onClick={() => focus(w.id)}>
            {w.icon} {w.title}
          </button>
        ))}
      </div>

      <button
        className="taskbar-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="아무것도 하지 않고 다음 시간대로 넘어갑니다"
      >
        ⏭️ 넘기기
      </button>

      <div className="taskbar-clock">
        {formatGameDate(state.day)}
        <br />
        {state.day}일차 {slotLabel}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 창 매니저 작성**

`src/components/window/WindowManager.tsx`:

```tsx
import { useWindowStore } from '../../store/windowStore'
import { Window } from './Window'
import { ExeApp } from '../apps/ExeApp'

/** 열린 창 목록을 종류에 따라 렌더링한다. */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)

  return (
    <>
      {windows.map((w) => (
        <Window
          key={w.id}
          id={w.id}
          title={w.title}
          icon={w.icon}
          x={w.x}
          y={w.y}
          width={w.width}
          zIndex={w.zIndex}
          onClose={() => close(w.id)}
        >
          {w.kind === 'exe' && w.activityId && (
            <ExeApp activityId={w.activityId} onDone={() => close(w.id)} />
          )}
        </Window>
      ))}
    </>
  )
}
```

`ExeApp`은 Task 10에서 만든다. 이 태스크는 Task 10 완료 후에 빌드가 통과한다 — 다음 스텝에서 임시 스텁을 만들어 순서 의존을 끊는다.

- [ ] **Step 5: ExeApp 임시 스텁 작성**

Task 10에서 실제 구현으로 교체할 최소 스텁이다. `src/components/apps/ExeApp.tsx`:

```tsx
export function ExeApp({ activityId }: { activityId: string; onDone: () => void }) {
  return <div>{activityId}</div>
}
```

- [ ] **Step 6: 바탕화면 작성**

`src/components/desktop/Desktop.tsx`:

```tsx
import { ACTIVITIES } from '../../data/activities'
import { useWindowStore } from '../../store/windowStore'
import { WindowManager } from '../window/WindowManager'
import { StatPanel } from './StatPanel'
import { Taskbar } from './Taskbar'
import './Desktop.css'

export function Desktop() {
  const open = useWindowStore((s) => s.open)

  return (
    <div className="desktop">
      <div className="desktop-icons">
        {ACTIVITIES.map((activity, i) => (
          <button
            key={activity.id}
            className="desktop-icon"
            onDoubleClick={() =>
              open({
                id: `exe-${activity.id}`,
                title: activity.label,
                icon: activity.icon,
                // 창이 서로 겹치지 않도록 순번만큼 어긋나게 배치한다.
                x: 120 + i * 28,
                y: 80 + i * 28,
                width: 340,
                kind: 'exe',
                activityId: activity.id,
              })
            }
          >
            <span className="desktop-icon-glyph">{activity.icon}</span>
            {activity.label}
          </button>
        ))}
      </div>

      <StatPanel />
      <WindowManager />
      <Taskbar />
    </div>
  )
}
```

- [ ] **Step 7: App에 연결**

`src/App.tsx` 전체를 교체한다:

```tsx
import { useGameStore } from './store/gameStore'
import { LockScreen } from './components/lockscreen/LockScreen'
import { Desktop } from './components/desktop/Desktop'

export default function App() {
  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)

  if (!loggedIn || !state) return <LockScreen />

  return <Desktop />
}
```

- [ ] **Step 8: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 9: 브라우저로 동작 확인**

Run: `npm run dev`
확인 사항:
- 로그인 후 바탕화면에 아이콘 5개가 보인다
- 우상단 스탯창이 보이고 닫기 버튼이 없다
- 스탯창 제목 표시줄을 드래그하면 창이 따라 움직인다
- 아이콘을 더블클릭하면 창이 열리고, 작업표시줄에 항목이 생긴다
- 여러 창을 열고 클릭하면 클릭한 창이 맨 앞으로 온다
- "⏭️ 넘기기"를 누르면 오전 → 오후 → 2일차로 넘어간다

- [ ] **Step 10: 커밋**

```bash
git add src/components src/App.tsx
git commit -m "feat: 바탕화면, 스탯창, 작업표시줄, 창 매니저"
```

---

## Task 10: exe 활동 창

**Files:**
- Modify: `src/components/apps/ExeApp.tsx` (Task 9의 스텁을 교체)
- Create: `src/components/apps/ExeApp.css`

**Interfaces:**
- Consumes: `findActivity` (Task 1), `canRun` (Task 5), `useGameStore` (Task 6), `getBurnoutPenalty` (Task 3), `getWageMultiplier` (Task 2)
- Produces: `ExeApp` 컴포넌트 — props `{ activityId: string; onDone: () => void }`

활동 창을 여는 것은 무료다. 창 안의 "실행" 버튼만 1턴을 소모한다. 이 구분이 시각적으로 명확해야 실수를 막는다.

- [ ] **Step 1: 스타일 작성**

`src/components/apps/ExeApp.css`:

```css
.exe-desc {
  margin-bottom: 12px;
  color: #444;
  line-height: 1.6;
}

.exe-effects {
  margin-bottom: 12px;
  padding: 10px;
  background: #e8e8e8;
  border-radius: 6px;
}

.exe-effect {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}

.exe-plus {
  color: #2e7d32;
  font-weight: 600;
}

.exe-minus {
  color: #c62828;
  font-weight: 600;
}

.exe-warn {
  margin-bottom: 10px;
  padding: 8px 10px;
  background: #fff3e0;
  border-left: 3px solid #fb8c00;
  border-radius: 3px;
  font-size: 12px;
  color: #7a4b00;
  line-height: 1.5;
}

.exe-run {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: #1e88e5;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.exe-run:hover:not(:disabled) {
  background: #1565c0;
}

.exe-run:disabled {
  background: #b8b8b8;
  cursor: not-allowed;
}

.exe-cost {
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  text-align: center;
}
```

- [ ] **Step 2: 컴포넌트 구현**

`src/components/apps/ExeApp.tsx` 전체를 교체한다:

```tsx
import { findActivity } from '../../data/activities'
import { useGameStore } from '../../store/gameStore'
import { canRun } from '../../systems/turn'
import { getBurnoutPenalty } from '../../systems/burnout'
import { getWageMultiplier } from '../../systems/economy'
import type { Stats } from '../../types/game'
import './ExeApp.css'

const STAT_LABELS: Record<keyof Stats, string> = {
  stamina: '💪 체력',
  maxStamina: '💪 최대 체력',
  intelligence: '🧠 지능',
  charm: '✨ 매력',
  mental: '😊 멘탈',
  money: '💰 소지금',
}

export function ExeApp({ activityId, onDone }: { activityId: string; onDone: () => void }) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)

  const activity = findActivity(activityId)
  if (!activity || !state) return null

  const runnable = canRun(state, activity)
  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, activity.id)
  const isBurnedOut = efficiency < 1

  /** 표시용 실제 변화량. 번아웃 효율과 알바비 배율을 반영한다. */
  const displayValue = (key: keyof Stats, raw: number): number => {
    let value = raw
    if (key === 'money' && value > 0 && activity.scalesWithWage) {
      value *= getWageMultiplier(state.day)
    }
    return Math.round(value > 0 ? value * efficiency : value)
  }

  const handleRun = () => {
    doActivity(activity)
    onDone()
  }

  return (
    <div>
      <p className="exe-desc">{activity.description}</p>

      <div className="exe-effects">
        {Object.entries(activity.effects).map(([key, raw]) => {
          const statKey = key as keyof Stats
          const value = displayValue(statKey, raw)
          return (
            <div key={key} className="exe-effect">
              <span>{STAT_LABELS[statKey]}</span>
              <span className={value >= 0 ? 'exe-plus' : 'exe-minus'}>
                {value >= 0 ? '+' : ''}
                {value.toLocaleString('ko-KR')}
              </span>
            </div>
          )
        })}
        {mentalPenalty > 0 && (
          <div className="exe-effect">
            <span>😊 멘탈 (연속 페널티)</span>
            <span className="exe-minus">-{mentalPenalty}</span>
          </div>
        )}
      </div>

      {isBurnedOut && (
        <div className="exe-warn">
          같은 일을 반복하고 있습니다. 효율이 {Math.round(efficiency * 100)}%로 떨어졌습니다.
        </div>
      )}

      {!runnable && <div className="exe-warn">지금은 실행할 수 없습니다. 스탯이 부족합니다.</div>}

      <button className="exe-run" onClick={handleRun} disabled={!runnable}>
        실행하기
      </button>
      <div className="exe-cost">⚠️ 1턴을 소모합니다</div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 4: 브라우저로 동작 확인**

Run: `npm run dev`
확인 사항:
- 아이콘을 더블클릭해도 시간이 흐르지 않는다 (탐색 무료)
- 창 안 "실행하기"를 눌러야 스탯이 변하고 슬롯이 넘어간다
- 같은 활동을 3번 연속하면 효율 경고가 뜨고 표시 수치가 줄어든다
- 체력이 부족하면 실행 버튼이 비활성화된다

- [ ] **Step 5: 커밋**

```bash
git add src/components/apps
git commit -m "feat: exe 활동 창 - 효과 미리보기와 번아웃 경고"
```

---

## Task 11: 엔딩 팝업 + 게임 종료 흐름

**Files:**
- Create: `src/components/apps/EndingModal.tsx`
- Create: `src/components/apps/EndingModal.css`
- Modify: `src/components/desktop/Desktop.tsx`

**Interfaces:**
- Consumes: `checkAchievementEnding`/`hasHigherTier`/`getFailureEnding` (Task 4), `useGameStore`/`useMetaStore` (Task 6), `Ending` (Task 4)
- Produces: `EndingModal` 컴포넌트 (props 없음). 스스로 게임 상태를 구독해 엔딩 도달 여부를 판단하고 표시한다.

이 태스크가 끝나면 게임을 처음부터 끝까지 완주할 수 있다.

성취 엔딩은 [엔딩 보기]/[계속하기]를 선택할 수 있고 어느 쪽이든 도감에 즉시 해금된다. 실패 엔딩은 선택 없이 강제 종료된다.

- [ ] **Step 1: 스타일 작성**

`src/components/apps/EndingModal.css`:

```css
.ending-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  z-index: 9500;
}

.ending-box {
  width: 420px;
  padding: 28px;
  border-radius: 12px;
  background: #f7f7f7;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  text-align: center;
}

.ending-icon {
  font-size: 52px;
}

.ending-title {
  margin: 10px 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}

.ending-unlocked {
  font-size: 12px;
  color: #2e7d32;
  margin-bottom: 14px;
}

.ending-text {
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  text-align: left;
}

.ending-hint {
  margin-bottom: 16px;
  padding: 9px;
  background: #e3f2fd;
  border-radius: 6px;
  font-size: 12px;
  color: #1565c0;
}

.ending-summary {
  margin-bottom: 18px;
  padding: 12px;
  background: #ececec;
  border-radius: 6px;
  font-size: 12px;
  color: #444;
  text-align: left;
  line-height: 1.7;
}

.ending-buttons {
  display: flex;
  gap: 10px;
}

.ending-btn {
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.ending-btn-primary {
  background: #1e88e5;
  color: #fff;
}

.ending-btn-primary:hover {
  background: #1565c0;
}

.ending-btn-ghost {
  background: #d8d8d8;
  color: #333;
}

.ending-btn-ghost:hover {
  background: #c4c4c4;
}
```

- [ ] **Step 2: 컴포넌트 작성**

`src/components/apps/EndingModal.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { checkAchievementEnding, getFailureEnding, hasHigherTier } from '../../systems/ending'
import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { useWindowStore } from '../../store/windowStore'
import type { Ending } from '../../data/endings'
import './EndingModal.css'

export function EndingModal() {
  const state = useGameStore((s) => s.state)
  const markEndingSeen = useGameStore((s) => s.markEndingSeen)
  const reset = useGameStore((s) => s.reset)
  const unlock = useMetaStore((s) => s.unlock)
  const closeAll = useWindowStore((s) => s.closeAll)

  /** 성취 엔딩에서 "엔딩 보기"를 눌렀을 때 최종 화면으로 전환한다. */
  const [confirmed, setConfirmed] = useState(false)

  const failure = state?.gameOver ? getFailureEnding(state.gameOver) : null
  const achievement = state && !state.gameOver
    ? checkAchievementEnding(state.stats, state.seenEndingIds)
    : null
  const ending: Ending | null = failure ?? achievement

  // 엔딩에 도달한 순간 도감에 해금한다. 계속하기를 골라도 기록은 남는다.
  useEffect(() => {
    if (ending) unlock(ending.id)
  }, [ending, unlock])

  if (!state || !ending) return null

  const isFailure = Boolean(failure)
  const showFinal = isFailure || confirmed

  const handleRestart = () => {
    closeAll()
    reset()
  }

  const handleContinue = () => {
    // 같은 엔딩 팝업이 매 턴 반복되지 않도록 기록한다.
    markEndingSeen(ending.id)
  }

  return (
    <div className="ending-overlay">
      <div className="ending-box">
        <div className="ending-icon">{ending.icon}</div>
        <div className="ending-title">
          {showFinal ? ending.title : `엔딩 도달: ${ending.title}`}
        </div>
        <div className="ending-unlocked">✨ 엔딩 도감에 기록되었습니다</div>

        <p className="ending-text">{ending.text}</p>

        {showFinal ? (
          <>
            <div className="ending-summary">
              {state.playerName} · {state.day}일차 종료
              <br />
              🧠 지능 {state.stats.intelligence} · ✨ 매력 {state.stats.charm} · 💪 최대 체력{' '}
              {state.stats.maxStamina}
              <br />
              😊 멘탈 {state.stats.mental} · 💰 {state.stats.money.toLocaleString('ko-KR')}원
            </div>
            <div className="ending-buttons">
              <button className="ending-btn ending-btn-primary" onClick={handleRestart}>
                처음부터 다시
              </button>
            </div>
          </>
        ) : (
          <>
            {hasHigherTier(ending) && (
              <div className="ending-hint">...하지만 아직 더 높은 곳이 있을지도?</div>
            )}
            <div className="ending-buttons">
              <button
                className="ending-btn ending-btn-primary"
                onClick={() => setConfirmed(true)}
              >
                엔딩 보기
              </button>
              <button className="ending-btn ending-btn-ghost" onClick={handleContinue}>
                계속하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 바탕화면에 연결**

`src/components/desktop/Desktop.tsx`에서 import에 한 줄 추가한다:

```tsx
import { EndingModal } from '../apps/EndingModal'
```

그리고 `<Taskbar />` 바로 아래에 추가한다:

```tsx
      <Taskbar />
      <EndingModal />
```

- [ ] **Step 4: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 `✓ built in ...` 출력

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm test`
Expected: PASS — `Tests  57 passed (57)`

- [ ] **Step 6: 브라우저로 완주 확인**

Run: `npm run dev`

확인 사항:
- 게임.exe만 반복 실행 → 지능이 떨어지고 돈이 마름 → 파산 엔딩이 강제로 뜬다
- "처음부터 다시"를 누르면 잠금화면으로 돌아간다
- 새 판을 시작해 매력을 80까지 올리면 인플루언서 엔딩 팝업이 뜨고 [엔딩 보기]/[계속하기]가 보인다
- [계속하기]를 누르면 팝업이 닫히고 게임이 이어진다. 같은 엔딩 팝업이 다시 뜨지 않는다
- [엔딩 보기]를 누르면 최종 화면과 스탯 요약이 나온다

- [ ] **Step 7: 커밋**

```bash
git add src/components
git commit -m "feat: 엔딩 팝업과 게임 종료 흐름 - 완주 가능한 게임 완성"
```

---

## Task 12: 하네스 컨텍스트 갱신

**Files:**
- Modify: `.claude/skills/project-context/SKILL.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (문서 갱신)

하네스 규칙상 새 파일과 패턴이 생기면 `project-context`를 갱신해야 한다. 갱신하지 않으면 다음 세션의 에이전트가 코드베이스를 탐색하게 되어 토큰 절약 장치가 무력화된다.

- [ ] **Step 1: 파일 맵 갱신**

`.claude/skills/project-context/SKILL.md`의 "## 파일 맵" 섹션을 아래로 교체한다:

```markdown
## 파일 맵
- 진입: `index.html` → `src/main.tsx` → `src/App.tsx` (세이브 유무로 잠금화면/바탕화면 분기)
- 타입: `src/types/game.ts` — Stats, Activity, GameState 등 도메인 타입 전부
- 데이터(수치): `src/data/` — activities(활동), economy(물가 구간), endings(엔딩 조건)
- 로직(순수함수): `src/systems/` — turn(활동 실행·정산), economy(생활비·알바비), burnout(연속 페널티), ending(판정). 각각 `.test.ts` 동반
- 상태: `src/store/` — gameStore(세이브), metaStore(도감·영구), windowStore(창·휘발)
- UI: `src/components/window/`(Window·WindowManager), `desktop/`(Desktop·StatPanel·Taskbar), `lockscreen/`, `apps/`(ExeApp·EndingModal)
- 설정: `vite.config.ts`, `tsconfig.json`(+`.app`/`.node`)
- 미구현(별도 계획): 브라우저/포털/사이트, 엔딩 도감 UI, 랜덤 이벤트, 폴더 앱, 은행
```

- [ ] **Step 2: 컨벤션에 스탯 키 추가**

같은 파일의 "## 코딩 컨벤션" 섹션 끝에 추가한다:

```markdown
- 스탯 키는 전 코드에서 통일: `stamina`, `maxStamina`, `intelligence`, `charm`, `mental`, `money`
- `src/systems/`는 React import 금지, 상태 mutation 금지 — 새 객체를 반환한다
- 창은 `windowStore.open()`으로 열고, 종류는 `OpenWindow.kind`로 구분한다
```

- [ ] **Step 3: 변경 이력 갱신**

`CLAUDE.md`의 변경 이력 테이블에 행을 추가한다:

```markdown
| 2026-08-03 | 플레이 가능 코어 구현 완료 | src/ 전체 | 계획 2026-08-03-playable-core 실행 |
```

- [ ] **Step 4: 커밋**

```bash
git add .claude CLAUDE.md
git commit -m "chore: 하네스 컨텍스트에 파일 맵과 컨벤션 반영"
```

---

## 완료 기준

이 계획이 끝나면 다음이 모두 성립한다:

- `npm test` — 57개 테스트 통과
- `npm run build` — 타입 에러 없이 빌드 성공
- 잠금화면에서 이름을 입력해 게임을 시작할 수 있다
- 바탕화면 아이콘을 더블클릭해 활동 창을 열 수 있고, 창을 여는 것만으로는 시간이 흐르지 않는다
- "실행하기"로 활동을 수행하면 스탯이 변하고 오전→오후→다음날로 진행된다
- 매일 밤 생활비가 차감되고, 10일마다 물가가 오른다
- 같은 활동을 반복하면 효율이 떨어진다
- 조건을 채우면 성취 엔딩 팝업이 뜨고 [엔딩 보기]/[계속하기]를 선택할 수 있다
- 소지금이나 멘탈이 0이 되면 강제로 게임이 끝난다
- 새로고침해도 진행 상황이 유지된다
