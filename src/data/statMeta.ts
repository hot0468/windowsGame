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
  // ⚠️ `stamina`가 곧 **체력**이다(2026-08-08 통합) — 그래서 심장 글리프가 이쪽으로 왔다.
  // 팔 근육은 운동 스탯(`athletics`)이 가져갔다: 몸을 키운 결과가 이제 그쪽이기 때문이다.
  stamina: { icon: 'fluent-color:heart-24', hudIcon: 'mdi:heart-outline' },
  mental: { icon: 'fluent-color:person-24', hudIcon: 'mdi:emoticon-happy-outline' },
  money: { icon: 'fluent-color:coin-multiple-24', hudIcon: 'mdi:wallet-outline' },
  knowledge: { icon: 'fluent-color:lightbulb-filament-24', hudIcon: 'mdi:brain' },
  charm: { icon: 'fluent-color:premium-24', hudIcon: 'mdi:shimmer' },
  sensitivity: { icon: 'fluent-color:paint-brush-24', hudIcon: 'mdi:palette-outline' },
  reputation: { icon: 'fluent-color:megaphone-loud-24', hudIcon: 'mdi:bullhorn-outline' },
  morality: { icon: 'fluent-color:shield-24', hudIcon: 'mdi:scale-balance' },
  creativity: { icon: 'fluent-color:lightbulb-24', hudIcon: 'mdi:lightbulb-outline' },
  sociability: { icon: 'fluent-color:people-24', hudIcon: 'mdi:handshake-outline' },
  vocabulary: { icon: 'fluent-color:book-24', hudIcon: 'mdi:book-open-page-variant-outline' },
  athletics: { icon: 'fluent-color:sport-24', hudIcon: 'mdi:arm-flex-outline' },
  gaming: { icon: 'fluent-color:puzzle-piece-24', hudIcon: 'mdi:gamepad-variant-outline' },
  // 예의범절: 고개 숙여 인사하는 그림이 mdi에는 없다. 가장 가까운 것이
  // "손을 모아 인사하는" 합장 글리프이고, 외곽선 변형이 있어 HUD 규칙도 지킨다.
  manners: { icon: 'fluent-color:people-community-24', hudIcon: 'mdi:hand-heart-outline' },
  // 예술: 감수성(`paint-brush-24`·`palette-outline`)과 **다른 글리프여야 한다** —
  // 스탯창에서 두 줄이 나란히 서는데 같은 그림이면 어느 쪽이 무엇인지 구분되지 않는다.
  // 감수성이 "느끼는 것"(팔레트)이라면 예술은 "손으로 그려 내는 것"이라 붓/펜 쪽이다.
  art: { icon: 'fluent-color:edit-24', hudIcon: 'mdi:brush-outline' },
}

/**
 * 스탯창 성장 스탯 **그리드**의 표시 순서.
 * GROWTH_STAT_KEYS 순서를 따르되, 표시 순서를 바꿀 때 상한 정의(types)를 건드리지
 * 않도록 여기서 한 번 감싼다.
 *
 * ⚠️ **평판·도덕은 빠져 있다** — 설계자가 자원 줄(체력 아래)로 옮겼기 때문이다.
 * 둘 다 여전히 성장 스탯이고 `GROWTH_STAT_KEYS`에도 그대로 있다.
 * 이건 "어디에 그리나"의 문제라 표시용 목록에서만 뺀다 — 상한·클램프·엔딩 판정은 그대로다.
 *
 * ⚠️ **예의범절은 상한이 100이지만 자원 줄이 아니라 그리드다**(2026-08-05).
 * 척도만 보면 평판·도덕 옆이 맞지만, 자원 줄 한 칸은 게이지까지 딸려 **약 46px**을 먹고
 * 그리드 한 칸은 그 절반이다. 스탯창은 **세로 스크롤바가 뜨면 안 된다**는 제약이 있는데
 * (`.hud`의 `max-height`), 실측해 보니 자원 줄에 두면 패널이 589px이 되어 세로 720px
 * 화면에서 상한(537px)을 넘겨 스크롤바가 생겼다. 그리드로 내리면 552px로 들어온다.
 * **자원 줄에 되돌리지 말 것** — 되돌리려면 그 전에 다른 줄을 빼야 한다.
 */
const RESOURCE_ROW_STATS: GrowthStatKey[] = ['reputation', 'morality']

export const GROWTH_STAT_ORDER: GrowthStatKey[] = GROWTH_STAT_KEYS.filter(
  (k) => !RESOURCE_ROW_STATS.includes(k),
)
