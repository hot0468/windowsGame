import { HudPanel } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { getLivingCost, getNextTier } from '../../systems/economy'
import { CALENDAR_PANEL_LAYOUT } from '../../data/calendar'
import { UI_ICONS } from '../../data/icons'
import { STAT_META, GROWTH_STAT_ORDER } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import type { GrowthStatKey, Stats } from '../../types/game'

/**
 * 상한이 실제로 의미 있는 자원 스탯(체력·멘탈)만 게이지로 보여준다.
 * 소지금은 상한이 없으므로 숫자만 표시한다.
 */
function ResourceRow({
  statKey,
  value,
  max,
  suffix = '',
  warn = false,
}: {
  statKey: keyof Stats
  value: number
  max?: number
  suffix?: string
  warn?: boolean
}) {
  const { icon, accent } = STAT_META[statKey]
  return (
    <div className="stat-row">
      <AppIcon name={icon} size={15} className="stat-icon" />
      <span className="stat-label">{STAT_NAMES[statKey]}</span>
      {max !== undefined && (
        <span className="stat-bar">
          {/* width 대신 scaleX로 채운다 — width 전환은 매 프레임 레이아웃을 다시 계산시킨다. */}
          <span
            className="stat-fill"
            style={{
              transform: `scaleX(${Math.min(1, value / max)})`,
              background: accent,
              /* 게이지 글로우. 색상값은 statMeta의 accent 하나에서만 파생시켜
                 CSS에 스탯별 색을 다시 적지 않는다(단일 출처 유지). */
              boxShadow: `0 0 8px ${accent}`,
            }}
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

/**
 * 성장 스탯 한 칸. 상한이 999라 게이지는 대부분 빈 막대로 보여 정보가 되지 않으므로,
 * 아이콘 + 이름 + 숫자만 담은 컴팩트 셀로 만들어 그리드에 배치한다.
 */
function GrowthCell({ statKey, value }: { statKey: GrowthStatKey; value: number }) {
  const { icon } = STAT_META[statKey]
  return (
    <div className="stat-cell hud-cell" title={`${STAT_NAMES[statKey]} ${value}`}>
      <AppIcon name={icon} size={15} className="stat-icon" />
      <span className="stat-cell-name">{STAT_NAMES[statKey]}</span>
      <span className="stat-cell-value">{value}</span>
    </div>
  )
}

export function StatPanel() {
  const state = useGameStore((s) => s.state)
  /**
   * 스탯창은 windowStore에 등록되지 않으므로 z-index를 직접 소유한다.
   * 위치는 우상단 고정이며 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다.
   */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve),
    y: CALENDAR_PANEL_LAYOUT.top,
  }
  const zIndex = useDesktopPanelStore((s) => s.z.stats)
  const raise = useDesktopPanelStore((s) => s.raise)
  if (!state) return null

  const { stats, day } = state
  const nextTier = getNextTier(day)

  return (
    <HudPanel
      id="stats"
      title={state.playerName}
      icon={UI_ICONS.statPanel}
      x={pos.x}
      y={pos.y}
      width={280}
      zIndex={zIndex}
      onActivate={() => raise('stats')}
    >
      {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원 — 게이지로 한눈에 본다.
          구역 라벨은 hr보다 강한 구분 신호다(ux `visual-hierarchy`: 크기·간격·대비로 위계를 만든다). */}
      <div className="hud-section">자원</div>
      <ResourceRow statKey="stamina" value={stats.stamina} max={stats.maxStamina} />
      <ResourceRow statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
      <ResourceRow
        statKey="money"
        value={stats.money}
        suffix="원"
        warn={stats.money <= 100000}
      />
      <ResourceRow statKey="maxStamina" value={stats.maxStamina} max={200} />

      <div className="hud-section">능력치</div>

      {/* 2구역: 성장 스탯 9종. 3열 그리드로 압축해 창 높이를 억제한다. */}
      <div className="stat-grid">
        {GROWTH_STAT_ORDER.map((key) => (
          <GrowthCell key={key} statKey={key} value={stats[key]} />
        ))}
      </div>

      <div className="stat-note">
        오늘 생활비 {getLivingCost(day).toLocaleString('ko-KR')}원
        <br />
        {nextTier.day - day}일 후 {nextTier.living.toLocaleString('ko-KR')}원으로 인상
      </div>
    </HudPanel>
  )
}
