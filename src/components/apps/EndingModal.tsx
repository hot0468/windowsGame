import { useEffect, useState } from 'react'
import { BookCheck } from 'lucide-react'
import { checkAchievementEnding, getFailureEnding, hasHigherTier } from '../../systems/ending'
import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { useWindowStore } from '../../store/windowStore'
import { STAT_META } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import type { Stats } from '../../types/game'
import type { Ending } from '../../data/endings'
import './EndingModal.css'

/** 엔딩 요약에 표시할 스탯 한 항목. */
function SummaryStat({ statKey, value }: { statKey: keyof Stats; value: string | number }) {
  const { icon: Icon, color } = STAT_META[statKey]
  return (
    <span className="ending-stat">
      <Icon size={13} style={{ color }} />
      {STAT_NAMES[statKey]} {value}
    </span>
  )
}

export function EndingModal() {
  const state = useGameStore((s) => s.state)
  const markEndingSeen = useGameStore((s) => s.markEndingSeen)
  const reset = useGameStore((s) => s.reset)
  const unlock = useMetaStore((s) => s.unlock)
  const closeAll = useWindowStore((s) => s.closeAll)

  /** 성취 엔딩에서 "엔딩 보기"를 눌렀을 때 최종 화면으로 전환한다. */
  const [confirmed, setConfirmed] = useState(false)

  const failure = state?.gameOver ? getFailureEnding(state.gameOver) : null
  const achievement = state && !state.gameOver
    ? checkAchievementEnding(state.stats, state.seenEndingIds)
    : null
  const ending: Ending | null = failure ?? achievement

  // 엔딩에 도달한 순간 도감에 해금한다. 계속하기를 골라도 기록은 남는다.
  useEffect(() => {
    if (ending) unlock(ending.id)
  }, [ending, unlock])

  if (!state || !ending) return null

  const isFailure = Boolean(failure)
  const showFinal = isFailure || confirmed

  const handleRestart = () => {
    closeAll()
    reset()
  }

  const handleContinue = () => {
    // 같은 엔딩 팝업이 매 턴 반복되지 않도록 기록한다.
    markEndingSeen(ending.id)
  }

  const EndingIcon = ending.icon

  return (
    <div className="ending-overlay">
      <div className="ending-box">
        <EndingIcon size={52} className="ending-icon" />
        <div className="ending-title">
          {showFinal ? ending.title : `엔딩 도달: ${ending.title}`}
        </div>
        <div className="ending-unlocked">
          <BookCheck size={13} />
          엔딩 도감에 기록되었습니다
        </div>

        <p className="ending-text">{ending.text}</p>

        {showFinal ? (
          <>
            <div className="ending-summary">
              <div className="ending-summary-head">
                {state.playerName} · {state.day}일차 종료
              </div>
              <div className="ending-stats">
                <SummaryStat statKey="knowledge" value={state.stats.knowledge} />
                <SummaryStat statKey="charm" value={state.stats.charm} />
                <SummaryStat statKey="maxStamina" value={state.stats.maxStamina} />
                <SummaryStat statKey="mental" value={state.stats.mental} />
                <SummaryStat
                  statKey="money"
                  value={`${state.stats.money.toLocaleString('ko-KR')}원`}
                />
              </div>
            </div>
            <div className="ending-buttons">
              <button className="ending-btn ending-btn-primary" onClick={handleRestart}>
                처음부터 다시
              </button>
              {/* 성취 엔딩은 확인 후 지금 판으로 돌아갈 수 있어야 한다.
                  실패 엔딩(파산·번아웃)은 이 버튼이 없어 강제 종료된다. */}
              {!isFailure && (
                <button className="ending-btn ending-btn-ghost" onClick={handleContinue}>
                  닫고 계속하기
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {hasHigherTier(ending) && (
              <div className="ending-hint">...하지만 아직 더 높은 곳이 있을지도?</div>
            )}
            <div className="ending-buttons">
              <button
                className="ending-btn ending-btn-primary"
                onClick={() => setConfirmed(true)}
              >
                엔딩 보기
              </button>
              <button className="ending-btn ending-btn-ghost" onClick={handleContinue}>
                계속하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
