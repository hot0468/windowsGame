import { useState } from 'react'
import { User } from 'lucide-react'
import { Window } from '../window/Window'
import { useGameStore } from '../../store/gameStore'
import { getLivingCost, getNextTier } from '../../systems/economy'
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
  const { icon: Icon, color } = STAT_META[statKey]
  return (
    <div className="stat-row">
      <Icon size={13} className="stat-icon" style={{ color }} />
      <span className="stat-label">{STAT_NAMES[statKey]}</span>
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

/**
 * 성장 스탯 한 칸. 상한이 999라 게이지는 대부분 빈 막대로 보여 정보가 되지 않으므로,
 * 아이콘 + 이름 + 숫자만 담은 컴팩트 셀로 만들어 그리드에 배치한다.
 */
function GrowthCell({ statKey, value }: { statKey: GrowthStatKey; value: number }) {
  const { icon: Icon, color } = STAT_META[statKey]
  return (
    <div className="stat-cell" title={`${STAT_NAMES[statKey]} ${value}`}>
      <Icon size={13} className="stat-icon" style={{ color }} />
      <span className="stat-cell-name">{STAT_NAMES[statKey]}</span>
      <span className="stat-cell-value">{value}</span>
    </div>
  )
}

export function StatPanel() {
  const state = useGameStore((s) => s.state)
  /** 스탯창은 windowStore에 등록되지 않으므로 위치를 직접 소유한다. 초기값은 우상단 고정 위치. */
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - 296, y: 16 }))
  if (!state) return null

  const { stats, day } = state
  const nextTier = getNextTier(day)

  return (
    <Window
      id="stats"
      title={state.playerName}
      icon={User}
      x={pos.x}
      y={pos.y}
      width={280}
      zIndex={8000}
      onMove={(x, y) => setPos({ x, y })}
    >
      {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원 — 게이지로 한눈에 본다. */}
      <ResourceRow statKey="stamina" value={stats.stamina} max={stats.maxStamina} />
      <ResourceRow statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
      <ResourceRow
        statKey="money"
        value={stats.money}
        suffix="원"
        warn={stats.money <= 100000}
      />
      <ResourceRow statKey="maxStamina" value={stats.maxStamina} max={200} />

      <hr className="stat-divider" />

      {/* 2구역: 성장 스탯 9종. 3열 그리드로 압축해 창 높이를 억제한다. */}
      <div className="stat-grid">
        {GROWTH_STAT_ORDER.map((key) => (
          <GrowthCell key={key} statKey={key} value={stats[key]} />
        ))}
      </div>

      <hr className="stat-divider" />

      <div className="stat-note">
        오늘 생활비 {getLivingCost(day).toLocaleString('ko-KR')}원
        <br />
        {nextTier.day - day}일 후 {nextTier.living.toLocaleString('ko-KR')}원으로 인상
      </div>
    </Window>
  )
}
