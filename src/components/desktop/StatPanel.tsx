import { HudPanel, HudSection } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { getLivingCost, getNextTier } from '../../systems/economy'
import { growthCap } from '../../systems/turn'
import { CALENDAR_PANEL_LAYOUT } from '../../data/calendar'
import { STAT_META, GROWTH_STAT_ORDER } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import type { GrowthStatKey, Stats } from '../../types/game'

/**
 * 상한이 실제로 의미 있는 자원 스탯(행동력·멘탈·체력)만 게이지로 보여준다.
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
          {/* 막대가 있는 줄은 상한도 함께 적는다(설계자 지시) — 막대만으로는
              "얼마나 남았나"는 보여도 "끝이 어디냐"는 읽히지 않는다.
              상한은 작고 흐리게 떨어뜨려 주인공 숫자를 가리지 않게 한다. */}
          {max !== undefined && (
            <span className="stat-max">/{max.toLocaleString('ko-KR')}</span>
          )}
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
 *
 * ⚠️ 칸에 **옅은 배경**이 깔린다(설계자 지시. 예전의 "배경도 테두리도 없다" 규칙은 뒤집혔다).
 * 색은 전부 같다 — 스탯별 9색을 시험했다가 한 색으로 되돌렸다(Desktop.css의 .stat-cell 주석).
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
  /* 작업 표시줄 버튼이 끄면 아예 그리지 않는다. 되돌리는 수단은 같은 버튼이다. */
  const visible = useDesktopPanelStore((s) => s.visible.stats)
  if (!state || !visible) return null

  const { stats, day } = state
  const nextTier = getNextTier(day)

  return (
    <HudPanel
      id="stats"
      /* 날짜칸과 달리 헤더를 유지한다 — 제목이 플레이어 이름(= 실제 정보)이라
         지우면 정보가 사라진다. 반복되는 라벨("날짜")이었던 쪽만 지웠다. */
      label={state.playerName}
      header
      x={pos.x}
      y={pos.y}
      width={280}
      zIndex={zIndex}
      onActivate={() => raise('stats')}
    >
      {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원 — 게이지로 한눈에 본다.
          구역 라벨("자원")은 설계자가 걷어냈다. 여기는 본문 첫 줄이라 위쪽 헤어라인도
          필요 없어 HudSection 자체를 빼 버린다 — 헤더 아래 구분선이 이미 경계다. */}
      <ResourceRow statKey="stamina" value={stats.stamina} max={stats.maxStamina} />
      <ResourceRow statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
      <ResourceRow statKey="maxStamina" value={stats.maxStamina} max={200} />
      {/* 평판은 성장 스탯이지만 자원 줄에 둔다(설계자 지시).
          상한이 999라 게이지는 의미가 없으므로 max 없이 숫자만 보여준다. */}
      {/* 막대 기준은 실제 상한이다 — growthCap()이 클램프와 같은 값을 주므로
          표시와 규칙이 어긋날 수 없다(평판·도덕은 100, 나머지 성장 스탯은 999). */}
      <ResourceRow statKey="reputation" value={stats.reputation} max={growthCap('reputation')} />
      <ResourceRow statKey="morality" value={stats.morality} max={growthCap('morality')} />

      {/* 2구역: 성장 스탯 그리드(평판을 뺀 8종). 2열로 압축해 창 높이를 억제하되,
          3열일 때처럼 숫자가 짓눌리지 않게 한 칸의 폭을 넉넉히 준다. */}
      {/* 라벨 없이 구분선만 — 생활비 구역과 같은 형태다(설계자 지시). */}
      <HudSection />
      <div className="stat-grid">
        {GROWTH_STAT_ORDER.map((key) => (
          <GrowthCell key={key} statKey={key} value={stats[key]} />
        ))}
      </div>

      {/* 3구역: 생계. 소지금이 여기 머리에 온다(설계자 지시) — 버는 돈과 나가는 돈이
          한 구역에 모여야 "이 달을 버틸 수 있나"가 한눈에 읽힌다.
          라벨 없이 구분선만 두는 것은 다른 구역과 같다. */}
      <HudSection />
      <ResourceRow
        statKey="money"
        value={stats.money}
        suffix="원"
        warn={stats.money <= 100000}
      />
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
