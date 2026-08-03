import {
  Banknote,
  BookOpen,
  Brain,
  Dumbbell,
  HeartHandshake,
  Heart,
  Lightbulb,
  Megaphone,
  Palette,
  Scale,
  Smile,
  Sparkles,
  Zap,
} from 'lucide-react'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { GrowthStatKey, IconComponent, Stats } from '../types/game'

/** 스탯별 아이콘·색상. UI가 참조하는 유일한 표시 메타데이터다. */
export interface StatMeta {
  icon: IconComponent
  color: string
}

export const STAT_META: Record<keyof Stats, StatMeta> = {
  stamina: { icon: Heart, color: '#43a047' },
  maxStamina: { icon: Dumbbell, color: '#2e7d32' },
  mental: { icon: Smile, color: '#fb8c00' },
  money: { icon: Banknote, color: '#8d6e63' },
  knowledge: { icon: Brain, color: '#1e88e5' },
  charm: { icon: Sparkles, color: '#d81b60' },
  sensitivity: { icon: Palette, color: '#8e24aa' },
  reputation: { icon: Megaphone, color: '#f4511e' },
  morality: { icon: Scale, color: '#00897b' },
  creativity: { icon: Lightbulb, color: '#fdd835' },
  sociability: { icon: HeartHandshake, color: '#e91e63' },
  vocabulary: { icon: BookOpen, color: '#5e35b1' },
  athletics: { icon: Zap, color: '#039be5' },
}

/**
 * 스탯창 성장 스탯 그리드의 표시 순서.
 * GROWTH_STAT_KEYS(지식·매력 → 신규 7종) 순서를 그대로 따르되,
 * 표시 순서를 바꾸고 싶을 때 상한 정의(types)를 건드리지 않도록 여기서 한 번 감싼다.
 */
export const GROWTH_STAT_ORDER: GrowthStatKey[] = [...GROWTH_STAT_KEYS]
