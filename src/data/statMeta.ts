import { GROWTH_STAT_KEYS } from '../types/game'
import type { GrowthStatKey, IconName, Stats } from '../types/game'

/**
 * 스탯별 아이콘·강조색. UI가 참조하는 유일한 표시 메타데이터다.
 *
 * `accent`는 **아이콘 색이 아니다.** Iconify 플랫 아이콘은 이미 다색이라
 * CSS color로 덧칠하면 원래 색을 망치거나 아무 효과도 없다.
 * 그래서 아이콘에는 색을 입히지 않고, 게이지 막대(stat-fill)처럼
 * 스탯을 색으로 구분해야 하는 곳에서만 이 값을 쓴다.
 */
export interface StatMeta {
  icon: IconName
  /** 게이지 막대 등 아이콘 외 요소의 강조색. 아이콘에는 적용하지 않는다. */
  accent: string
}

export const STAT_META: Record<keyof Stats, StatMeta> = {
  stamina: { icon: 'fluent-emoji-flat:beating-heart', accent: '#43a047' },
  maxStamina: { icon: 'fluent-emoji-flat:flexed-biceps', accent: '#2e7d32' },
  mental: { icon: 'fluent-emoji-flat:slightly-smiling-face', accent: '#fb8c00' },
  money: { icon: 'fluent-emoji-flat:money-bag', accent: '#8d6e63' },
  knowledge: { icon: 'fluent-emoji-flat:brain', accent: '#1e88e5' },
  charm: { icon: 'fluent-emoji-flat:sparkles', accent: '#d81b60' },
  sensitivity: { icon: 'fluent-emoji-flat:artist-palette', accent: '#8e24aa' },
  reputation: { icon: 'fluent-emoji-flat:megaphone', accent: '#f4511e' },
  morality: { icon: 'fluent-emoji-flat:balance-scale', accent: '#00897b' },
  creativity: { icon: 'fluent-emoji-flat:light-bulb', accent: '#fdd835' },
  sociability: { icon: 'fluent-emoji-flat:handshake', accent: '#e91e63' },
  vocabulary: { icon: 'fluent-emoji-flat:books', accent: '#5e35b1' },
  athletics: { icon: 'fluent-emoji-flat:person-running', accent: '#039be5' },
}

/**
 * 스탯창 성장 스탯 그리드의 표시 순서.
 * GROWTH_STAT_KEYS(지식·매력 → 신규 7종) 순서를 그대로 따르되,
 * 표시 순서를 바꾸고 싶을 때 상한 정의(types)를 건드리지 않도록 여기서 한 번 감싼다.
 */
export const GROWTH_STAT_ORDER: GrowthStatKey[] = [...GROWTH_STAT_KEYS]
