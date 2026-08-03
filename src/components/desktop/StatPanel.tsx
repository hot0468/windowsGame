import { useState } from 'react'
import { Window } from '../window/Window'
import { useGameStore } from '../../store/gameStore'
import { getLivingCost, getNextTier } from '../../systems/economy'

/** 스탯 하나를 게이지로 표시한다. max가 없으면 게이지 없이 숫자만 보여준다. */
function StatRow({
  label,
  value,
  max,
  color,
  suffix = '',
  warn = false,
}: {
  label: string
  value: number
  max?: number
  color?: string
  suffix?: string
  warn?: boolean
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
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
      icon="👤"
      x={pos.x}
      y={pos.y}
      width={280}
      zIndex={8000}
      onMove={(x, y) => setPos({ x, y })}
    >
      <StatRow label="💪 체력" value={stats.stamina} max={stats.maxStamina} color="#43a047" />
      <StatRow label="🧠 지능" value={stats.intelligence} max={100} color="#1e88e5" />
      <StatRow label="✨ 매력" value={stats.charm} max={100} color="#d81b60" />
      <StatRow
        label="😊 멘탈"
        value={stats.mental}
        max={100}
        color="#fb8c00"
        warn={stats.mental <= 20}
      />
      <StatRow label="💰 소지금" value={stats.money} suffix="원" warn={stats.money <= 100000} />

      <hr className="stat-divider" />

      <div className="stat-note">
        오늘 생활비 {getLivingCost(day).toLocaleString('ko-KR')}원
        {nextTier && (
          <>
            <br />
            {nextTier.day - day}일 후 {nextTier.living.toLocaleString('ko-KR')}원으로 인상
          </>
        )}
      </div>
    </Window>
  )
}
