import { GROWTH_STAT_KEYS } from '../types/game'
import type { GrowthStatKey, IconName, Stats } from '../types/game'

/**
 * 스탯별 표시 메타데이터. UI가 참조하는 유일한 출처다.
 *
 * 아이콘이 **두 벌인 이유**: 이 앱에는 시각 언어가 둘이고 아이콘 성격도 둘이다.
 *  - `icon` — OS 크롬 안(활동 창 `ExeApp`·엔딩 모달)에서 쓰는 다색 플랫 아이콘.
 *    밝은 윈도우 11 표면 위에서 "데스크톱 앱의 이모지"로 읽혀야 하므로 컬러를 유지한다.
 *  - `hudIcon` — 게임 HUD(스탯창) 전용 **단색 Phosphor 글리프**.
 *    HUD는 다크 판타지 레퍼런스를 따라 액센트가 샴페인 골드 하나뿐이라, 다색 아이콘이
 *    들어오는 순간 그 절제가 무너진다. Phosphor 단색 아이콘은 `currentColor`로 그려지므로
 *    CSS에서 골드/아이보리로 물들일 수 있다.
 *
 * 스탯별 강조색(`accent`)은 **제거했다.** 레퍼런스는 단일 액센트이고, 12색을 흩뿌리면
 * 색이 정보가 아니라 소음이 된다. 게이지는 전부 `--hud-gold` 하나로 칠한다
 * (색으로 스탯을 구분하지 않으므로 ux `color-not-only`도 자동으로 지켜진다 —
 * 스탯 구분은 글리프 + 한국어 라벨이 한다).
 */
export interface StatMeta {
  /** OS 크롬용 다색 플랫 아이콘. HUD에서는 쓰지 않는다. */
  icon: IconName
  /** HUD 전용 단색 Phosphor 글리프. CSS `color`로 금색을 입힌다. */
  hudIcon: IconName
}

export const STAT_META: Record<keyof Stats, StatMeta> = {
  stamina: { icon: 'fluent-emoji-flat:beating-heart', hudIcon: 'ph:heartbeat-fill' },
  maxStamina: { icon: 'fluent-emoji-flat:flexed-biceps', hudIcon: 'ph:barbell-fill' },
  mental: { icon: 'fluent-emoji-flat:slightly-smiling-face', hudIcon: 'ph:smiley-fill' },
  money: { icon: 'fluent-emoji-flat:money-bag', hudIcon: 'ph:coins-fill' },
  knowledge: { icon: 'fluent-emoji-flat:brain', hudIcon: 'ph:brain-fill' },
  charm: { icon: 'fluent-emoji-flat:sparkles', hudIcon: 'ph:sparkle-fill' },
  sensitivity: { icon: 'fluent-emoji-flat:artist-palette', hudIcon: 'ph:palette-fill' },
  reputation: { icon: 'fluent-emoji-flat:megaphone', hudIcon: 'ph:megaphone-fill' },
  morality: { icon: 'fluent-emoji-flat:balance-scale', hudIcon: 'ph:scales-fill' },
  creativity: { icon: 'fluent-emoji-flat:light-bulb', hudIcon: 'ph:lightbulb-filament-fill' },
  sociability: { icon: 'fluent-emoji-flat:handshake', hudIcon: 'ph:handshake-fill' },
  vocabulary: { icon: 'fluent-emoji-flat:books', hudIcon: 'ph:books-fill' },
  athletics: { icon: 'fluent-emoji-flat:person-running', hudIcon: 'ph:person-simple-run-fill' },
}

/**
 * 스탯창 성장 스탯 그리드의 표시 순서.
 * GROWTH_STAT_KEYS(지식·매력 → 신규 7종) 순서를 그대로 따르되,
 * 표시 순서를 바꾸고 싶을 때 상한 정의(types)를 건드리지 않도록 여기서 한 번 감싼다.
 */
export const GROWTH_STAT_ORDER: GrowthStatKey[] = [...GROWTH_STAT_KEYS]
