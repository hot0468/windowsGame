import { useEffect, useState } from 'react'
import { checkAchievementEnding, getFailureEnding, hasHigherTier } from '../../systems/ending'
import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { useWindowStore } from '../../store/windowStore'
import type { Ending } from '../../data/endings'
import './EndingModal.css'

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

  return (
    <div className="ending-overlay">
      <div className="ending-box">
        <div className="ending-icon">{ending.icon}</div>
        <div className="ending-title">
          {showFinal ? ending.title : `엔딩 도달: ${ending.title}`}
        </div>
        <div className="ending-unlocked">✨ 엔딩 도감에 기록되었습니다</div>

        <p className="ending-text">{ending.text}</p>

        {showFinal ? (
          <>
            <div className="ending-summary">
              {state.playerName} · {state.day}일차 종료
              <br />
              🧠 지능 {state.stats.intelligence} · ✨ 매력 {state.stats.charm} · 💪 최대 체력{' '}
              {state.stats.maxStamina}
              <br />
              😊 멘탈 {state.stats.mental} · 💰 {state.stats.money.toLocaleString('ko-KR')}원
            </div>
            <div className="ending-buttons">
              <button className="ending-btn ending-btn-primary" onClick={handleRestart}>
                처음부터 다시
              </button>
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
