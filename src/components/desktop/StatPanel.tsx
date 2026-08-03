import { HudPanel, HudSection } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { getLivingCost, getNextTier } from '../../systems/economy'
import { CALENDAR_PANEL_LAYOUT } from '../../data/calendar'
import { HUD_ICONS } from '../../data/icons'
import { STAT_META, GROWTH_STAT_ORDER } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import type { GrowthStatKey, Stats } from '../../types/game'

/**
 * 상한이 실제로 의미 있는 자원 스탯(체력·멘탈)만 게이지로 보여준다.
 * 소지금은 상한이 없으므로 숫자만 표시한다.
 *
 * 레이아웃: `글리프 + 한국어 라벨` 왼쪽, **큰 우측 정렬 숫자**가 오른쪽.
 * 게이지는 줄 안에 끼워 넣지 않고 그 아래 전폭 막대로 깐다 —
 * 줄 가운데 막대를 넣으면 숫자 자리가 좁아져 "숫자가 주인공"이라는 위계가 무너진다.
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
  const { hudIcon } = STAT_META[statKey]
  return (
    <div className="stat-row">
      <div className="stat-row-line">
        {/* 외곽선 변형은 채워진 변형보다 시각 무게가 가볍다 — 크기를 한 단 올려 보정한다. */}
        <AppIcon name={hudIcon} size={15} className="stat-icon" />
        <span className="stat-label">{STAT_NAMES[statKey]}</span>
        <span className={`stat-value${warn ? ' stat-warn' : ''}`}>
          {value.toLocaleString('ko-KR')}
          {suffix && <span className="stat-unit">{suffix}</span>}
        </span>
      </div>
      {max !== undefined && (
        <span className="stat-bar">
          {/* width 대신 scaleX로 채운다 — width 전환은 매 프레임 레이아웃을 다시 계산시킨다.
              색은 CSS의 --hud-accent 하나뿐이라 인라인 style은 채움 비율만 나른다
              (예전에는 스탯별 accent와 boxShadow 글로우를 여기서 주입했다). */}
          <span
            className="stat-fill"
            style={{ transform: `scaleX(${Math.min(1, value / max)})` }}
          />
        </span>
      )}
    </div>
  )
}

/**
 * 성장 스탯 한 칸. 상한이 999라 게이지는 대부분 빈 막대로 보여 정보가 되지 않으므로,
 * 글리프 + 이름 + 숫자만 담아 2열 그리드에 배치한다.
 * **테두리도 배경도 없다** — 카드 안에 상자를 또 두르면 "칸막이 서랍"이 된다.
 * 구분은 간격이 한다(ux `whitespace-balance`).
 */
function GrowthCell({ statKey, value }: { statKey: GrowthStatKey; value: number }) {
  const { hudIcon } = STAT_META[statKey]
  return (
    <div className="stat-cell" title={`${STAT_NAMES[statKey]} ${value}`}>
      <AppIcon name={hudIcon} size={14} className="stat-icon" />
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
      /* 날짜칸과 달리 헤더를 유지한다 — 제목이 플레이어 이름(= 실제 정보)이라
         지우면 정보가 사라진다. 반복되는 라벨("날짜")이었던 쪽만 지웠다. */
      label={state.playerName}
      headerIcon={HUD_ICONS.statPanel}
      x={pos.x}
      y={pos.y}
      width={280}
      zIndex={zIndex}
      onActivate={() => raise('stats')}
    >
      {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원 — 게이지로 한눈에 본다. */}
      <HudSection label="자원" />
      <ResourceRow statKey="stamina" value={stats.stamina} max={stats.maxStamina} />
      <ResourceRow statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
      <ResourceRow statKey="maxStamina" value={stats.maxStamina} max={200} />
      <ResourceRow
        statKey="money"
        value={stats.money}
        suffix="원"
        warn={stats.money <= 100000}
      />

      {/* 2구역: 성장 스탯 9종. 2열 그리드로 압축해 창 높이를 억제하되,
          3열일 때처럼 숫자가 짓눌리지 않게 한 칸의 폭을 넉넉히 준다. */}
      <HudSection label="능력치" />
      <div className="stat-grid">
        {GROWTH_STAT_ORDER.map((key) => (
          <GrowthCell key={key} statKey={key} value={stats[key]} />
        ))}
      </div>

      {/* 3구역: 생계 경고. 예전에는 구분선 아래 떠 있는 주석이라 "덧붙인 쪽지"로 보였다 —
          다른 구역과 같은 라벨을 주어 패널의 일부로 편입시킨다. */}
      <HudSection label="생계" />
      <div className="stat-note">
        <span className="stat-note-row">
          <span>오늘 생활비</span>
          <span className="stat-note-num">{getLivingCost(day).toLocaleString('ko-KR')}원</span>
        </span>
        <span className="stat-note-row">
          <span>{nextTier.day - day}일 후 인상</span>
          <span className="stat-note-num">{nextTier.living.toLocaleString('ko-KR')}원</span>
        </span>
      </div>
    </HudPanel>
  )
}
