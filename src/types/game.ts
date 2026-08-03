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
