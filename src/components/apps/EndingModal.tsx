import { useEffect, useState } from 'react'
import { checkAchievementEnding, getFailureEnding, hasHigherTier } from '../../systems/ending'
import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { relationEndingFor } from '../../systems/affection'
import { useWindowStore } from '../../store/windowStore'
import { UI_ICONS } from '../../data/icons'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { PanelOrnament } from '../PanelOrnament'
import { STAT_NAMES } from '../../types/game'
import type { Stats } from '../../types/game'
import type { Ending } from '../../data/endings'
import './EndingModal.css'

/** 엔딩 요약에 표시할 스탯 한 항목. */
function SummaryStat({ statKey, value }: { statKey: keyof Stats; value: string | number }) {
  const { icon } = STAT_META[statKey]
  return (
    <span className="ending-stat">
      <AppIcon name={icon} size={15} />
      {STAT_NAMES[statKey]} {value}
    </span>
  )
}

export function EndingModal() {
  const state = useGameStore((s) => s.state)
  const markEndingSeen = useGameStore((s) => s.markEndingSeen)
  const reset = useGameStore((s) => s.reset)
  const unlock = useMetaStore((s) => s.unlock)
  const unlockRelation = useMetaStore((s) => s.unlockRelation)
  const closeAll = useWindowStore((s) => s.closeAll)

  /** 성취 엔딩에서 "엔딩 보기"를 눌렀을 때 최종 화면으로 전환한다. */
  const [confirmed, setConfirmed] = useState(false)

  // 파산 엔딩은 "어떤 사람으로 끝났는가"에 따라 갈린다 — 판정은 systems/ending.ts 하나가 한다.
  const failure = state?.gameOver ? getFailureEnding(state.gameOver, state) : null
  const achievement = state && !state.gameOver
    ? checkAchievementEnding(state.stats, state.seenEndingIds)
    : null
  const ending: Ending | null = failure ?? achievement

  /* 관계 부가엔딩. ⚠️ **본엔딩을 고르는 판정과 섞이지 않는다** — `ending`이 무엇으로
     정해졌든(성취·직업·실패) 그 곁에 독립적으로 붙는다(`data/relations.ts`). */
  const companion = state ? relationEndingFor(state) : undefined

  // 엔딩에 도달한 순간 도감에 해금한다. 계속하기를 골라도 기록은 남는다.
  useEffect(() => {
    if (ending) unlock(ending.id)
  }, [ending, unlock])

  /* ⚠️ **부가엔딩은 별도 집합에 해금한다**(`unlockedRelations`) — 엔딩 집합에 넣으면
     도감의 "엔딩 n개 중 m개"가 관계를 세기 시작해 개수가 거짓이 된다. */
  useEffect(() => {
    if (ending && companion) unlockRelation(companion.id)
  }, [ending, companion, unlockRelation])

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
        <PanelOrnament />
        <AppIcon name={ending.icon} size={52} className="ending-icon" />
        <div className="ending-title">
          {showFinal ? ending.title : `엔딩 도달: ${ending.title}`}
        </div>
        <div className="ending-unlocked">
          <AppIcon name={UI_ICONS.endingUnlocked} size={14} />
          엔딩 도감에 기록되었습니다
        </div>

        <p className="ending-text">{ending.text}</p>

        {/*
         * 관계 부가엔딩. **본엔딩 문단 바로 아래, 요약보다 위**에 온다 — 이야기의 이어지는
         * 부분이지 통계가 아니다.
         *
         * ⚠️ **[엔딩 보기]를 누른 뒤에만 보인다**(`showFinal`). 성취 엔딩의 첫 화면은
         * "도달했다"를 알리는 자리이고 거기서 곁에 누가 있었는지까지 말하면, [계속하기]로
         * 판을 이어 갈 사람에게 결말을 먼저 읽혀 버린다.
         * ⚠️ 넘긴 사람이 여럿이어도 **하나만** 온다(`relationEndingFor`).
         */}
        {showFinal && companion && (
          <div className="ending-companion">
            <div className="ending-companion-head">
              <AppIcon name={companion.icon} size={16} />
              {companion.endingTitle}
            </div>
            <p className="ending-companion-text">{companion.endingText}</p>
          </div>
        )}

        {showFinal ? (
          <>
            <div className="ending-summary">
              <div className="ending-summary-head">
                {state.playerName} · {state.day}일차 종료
              </div>
              <div className="ending-stats">
                <SummaryStat statKey="knowledge" value={state.stats.knowledge} />
                <SummaryStat statKey="charm" value={state.stats.charm} />
                <SummaryStat statKey="athletics" value={state.stats.athletics} />
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
