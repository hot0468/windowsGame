import { GROWTH_STAT_KEYS } from '../types/game'
import type { GrowthStatKey, IconName, Stats } from '../types/game'

/**
 * 스탯별 표시 메타데이터. UI가 참조하는 유일한 출처다.
 *
 * 아이콘이 **두 벌인 이유**: 이 앱에는 시각 언어가 둘이고 아이콘 성격도 둘이다.
 *  - `icon` — OS 크롬 안(활동 창 `ExeApp`·엔딩 모달)에서 쓰는 다색 플랫 아이콘.
 *    밝은 윈도우 11 표면 위에서 "데스크톱 앱의 이모지"로 읽혀야 하므로 컬러를 유지한다.
 *  - `hudIcon` — 게임 HUD(스탯창) 전용 **단색 Phosphor 외곽선 글리프**.
 *    HUD는 액센트가 시스템 블루 하나뿐이라 다색 아이콘이 들어오는 순간 그 절제가 무너진다.
 *    Phosphor 단색 아이콘은 `currentColor`로 그려지므로 CSS에서 잉크/액센트로 물들일 수 있다.
 *    `-fill`이 아니라 regular인 이유는 `data/icons.ts`의 `HUD_ICONS` 주석 참조
 *    (밝은 카드 위에서 채워진 글리프는 잉크 얼룩이 되어 숫자의 위계를 빼앗는다).
 *
 * 스탯별 강조색(`accent`)은 **제거했다.** 액센트는 하나이고, 12색을 흩뿌리면
 * 색이 정보가 아니라 소음이 된다. 게이지는 전부 `--hud-accent` 하나로 칠한다
 * (색으로 스탯을 구분하지 않으므로 ux `color-not-only`도 자동으로 지켜진다 —
 * 스탯 구분은 글리프 + 한국어 라벨이 한다).
 */
export interface StatMeta {
  /** OS 크롬용 다색 플랫 아이콘. HUD에서는 쓰지 않는다. */
  icon: IconName
  /** HUD 전용 단색 Phosphor 외곽선 글리프. CSS `color`로 잉크색을 입힌다. */
  hudIcon: IconName
}

export const STAT_META: Record<keyof Stats, StatMeta> = {
  stamina: { icon: 'fluent-emoji-flat:beating-heart', hudIcon: 'ph:heartbeat' },
  maxStamina: { icon: 'fluent-emoji-flat:flexed-biceps', hudIcon: 'ph:barbell' },
  mental: { icon: 'fluent-emoji-flat:slightly-smiling-face', hudIcon: 'ph:smiley' },
  money: { icon: 'fluent-emoji-flat:money-bag', hudIcon: 'ph:coins' },
  knowledge: { icon: 'fluent-emoji-flat:brain', hudIcon: 'ph:brain' },
  charm: { icon: 'fluent-emoji-flat:sparkles', hudIcon: 'ph:sparkle' },
  sensitivity: { icon: 'fluent-emoji-flat:artist-palette', hudIcon: 'ph:palette' },
  reputation: { icon: 'fluent-emoji-flat:megaphone', hudIcon: 'ph:megaphone' },
  morality: { icon: 'fluent-emoji-flat:balance-scale', hudIcon: 'ph:scales' },
  creativity: { icon: 'fluent-emoji-flat:light-bulb', hudIcon: 'ph:lightbulb-filament' },
  sociability: { icon: 'fluent-emoji-flat:handshake', hudIcon: 'ph:handshake' },
  vocabulary: { icon: 'fluent-emoji-flat:books', hudIcon: 'ph:books' },
  athletics: { icon: 'fluent-emoji-flat:person-running', hudIcon: 'ph:person-simple-run' },
}

/**
 * 스탯창 성장 스탯 그리드의 표시 순서.
 * GROWTH_STAT_KEYS(지식·매력 → 신규 7종) 순서를 그대로 따르되,
 * 표시 순서를 바꾸고 싶을 때 상한 정의(types)를 건드리지 않도록 여기서 한 번 감싼다.
 */
export const GROWTH_STAT_ORDER: GrowthStatKey[] = [...GROWTH_STAT_KEYS]
