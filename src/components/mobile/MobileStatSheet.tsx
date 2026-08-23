import { useEffect, useId } from 'react'
import { formatGameDate } from '../../data/calendar'
import { MOBILE_ICONS } from '../../data/icons'
import { GROWTH_STAT_ORDER, STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useShownTime } from '../desktop/shownTime'
import { activeShock, getLivingCost, nextShock, shockCostFor } from '../../systems/economy'
import { skillLabel } from '../../data/band'
import { rankOf, toNextRank } from '../../systems/rank'
import { growthCap, STAMINA_CAP } from '../../systems/turn'
import { STAT_NAMES } from '../../types/game'
import type { GrowthStatKey, Stats } from '../../types/game'

/**
 * 모바일 스탯 시트 — **데스크톱 스탯창·날짜칸을 대신하는 유일한 창구다.**
 *
 * ⚠️ `HudPanel`/`StatPanel`을 재사용하지 않는 것은 의도다(설계 제약 H):
 * 둘 다 `window.innerWidth` 기반 절대 좌표에 밝은 아크릴 카드라, 375px 어두운
 * 유리 셸 위에서는 자리도 색도 성립하지 않는다.
 * 재사용하는 것은 **데이터와 규칙**이다 — `STAT_META`(글리프)·`STAT_NAMES`(라벨)·
 * `rankOf`/`toNextRank`(등급)·`growthCap`(상한)·`getLivingCost`/`shockCostFor`(생활비).
 * 수치를 여기서 다시 계산하지 않으므로 데스크톱과 어긋날 수 없다.
 *
 * ⚠️ 데스크톱 스탯창의 "세로 스크롤바가 뜨면 안 된다"는 제약은 **여기 적용되지 않는다** —
 * 폰에서는 세로 스크롤이 정상이고, 오히려 다 담으려고 줄이면 글자가 작아진다.
 *
 * 건너뛰기·자동 진행도 여기 있다 — 데스크톱에서 날짜칸이 지던 역할이고,
 * 모바일에서는 이 시트가 그 자리를 물려받는다(멈추기 버튼은 언제나 닿을 수 있어야 한다).
 */
export function MobileStatSheet({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const autoRunning = useGameStore((s) => s.autoRunning)
  const startAuto = useGameStore((s) => s.startAuto)
  const stopAuto = useGameStore((s) => s.stopAuto)
  const titleId = useId()
  /* 데스크톱 날짜칸과 **같은 규칙**이다(사유는 `desktop/shownTime.ts`). */
  const shown = useShownTime()

  /* ux `escape-routes`. 바깥(scrim) 탭으로도 닫힌다. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!state) return null

  const { stats, day, slot } = state
  /* ⚠️ **미루는 것은 화면이 적는 시각뿐이다** — 다음 물가 급등까지 남은 날(`nextShock`)은
     실제 날짜를 그대로 본다. 돈 계산이 2.5초 동안 옛 날짜를 쓰면 그건 연출이 아니라 오답이다. */
  const shownDay = shown.day ?? day
  const isMorning = (shown.slot ?? slot) === 'morning'
  /* 데스크톱 지갑과 **같은 함수·같은 문구**다 — 물가는 평소 고정이고 가끔 며칠 흔들린다. */
  const shock = activeShock(day)
  const nextS = nextShock(day)

  return (
    <>
      <div className="mo-scrim" onClick={onClose} />
      <section className="mo-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="mo-sheet-head">
          <div>
            <h2 className="mo-sheet-title" id={titleId}>
              {state.playerName}
            </h2>
            <p className="mo-sheet-sub">
              {formatGameDate(shownDay)} · {shownDay}일차 {isMorning ? '오전' : '오후'}
            </p>
          </div>
          <button type="button" className="mo-sheet-close" onClick={onClose} aria-label="닫기">
            <AppIcon name={MOBILE_ICONS.close} size={22} />
          </button>
        </header>

        <div className="mo-sheet-body">
          {/* 1구역: 매 턴 변하고 상한이 의미 있는 자원. 데스크톱과 같은 편성이다.
              ⚠️ 체력·멘탈에는 등급을 붙이지 않는다 — 쌓아 올린 것이 아니라
              오르내리는 잔량이라 "등급"이 성립하지 않는다(데스크톱과 같은 규칙). */}
          <Row statKey="stamina" value={stats.stamina} max={STAMINA_CAP} />
          <Row statKey="mental" value={stats.mental} max={100} warn={stats.mental <= 20} />
          <Row
            statKey="reputation"
            value={stats.reputation}
            max={growthCap('reputation')}
            rankKey="reputation"
          />
          <Row
            statKey="morality"
            value={stats.morality}
            max={growthCap('morality')}
            rankKey="morality"
          />

          {/* 2구역: 성장 스탯. 폭이 좁으므로 데스크톱의 2열 대신 흐르는 그리드다. */}
          <hr className="mo-rule" />
          <ul className="mo-cells">
            {GROWTH_STAT_ORDER.map((key) => (
              <li key={key} className="mo-cell">
                <AppIcon name={STAT_META[key].hudIcon} size={15} className="mo-cell-icon" />
                <span className="mo-cell-name">{STAT_NAMES[key]}</span>
                <RankBadge rank={rankOf(key, stats[key])} title={rankTitle(key, stats[key])} />
                <span className="mo-cell-value">{stats[key]}</span>
              </li>
            ))}
          </ul>

          {/* 3구역: 생계. 두 줄 다 지금 사는 집의 배율을 탄 금액이다. */}
          <hr className="mo-rule" />
          <Row statKey="money" value={stats.money} suffix="원" warn={stats.money <= 100000} />
          <dl className="mo-note">
            <div className="mo-note-row">
              <dt>오늘 생활비</dt>
              <dd>{getLivingCost(state).toLocaleString('ko-KR')}원</dd>
            </div>
            <div className="mo-note-row">
              <dt>
                {shock
                  ? `${shock.shock.name} · ${shock.end - day + 1}일 남음`
                  : `${nextS.start - day}일 뒤 ${nextS.shock.name}`}
              </dt>
              <dd>{shockCostFor(state, shock ?? nextS).toLocaleString('ko-KR')}원</dd>
            </div>
            {/* ⚠️ 데스크톱 HUD와 **같은 조건·같은 문구**다(밴드에 들어간 사람에게만). */}
            {state.band && (
              <div className="mo-note-row">
                <dt>밴드 숙련도</dt>
                <dd>
                  {state.band.skill} · {skillLabel(state.band.skill)}
                </dd>
              </div>
            )}
          </dl>

          {/* 4구역: 시간을 미는 버튼. 데스크톱에서 날짜칸이 지던 역할이다.
              ⚠️ 멈추기는 언제나 닿을 수 있어야 한다 — 시트는 하단바에서 한 번에 열린다. */}
          <hr className="mo-rule" />
          <div className="mo-sheet-actions">
            {/* ⚠️ **주저앉아 있을 때도 눌려야 한다**(데스크톱 날짜칸과 같은 규칙) —
                회복은 턴을 넘겨야 끝나므로 여기서 막으면 유일한 탈출구가 사라진다. */}
            <button
              type="button"
              className="mo-btn"
              onClick={doSkip}
              /* ⚠️ 화면이 아직 못 따라온 동안은 잠근다 — 데스크톱 날짜칸과 같은 이유
                 (이미 써 버린 슬롯의 이름으로 남은 슬롯을 태우게 된다). */
              disabled={autoRunning || shown.lagging}
            >
              {isMorning ? '오전' : '오후'} 건너뛰기
            </button>
            <button
              type="button"
              className={`mo-btn${autoRunning ? ' mo-btn-on' : ''}`}
              onClick={autoRunning ? stopAuto : startAuto}
              disabled={state.recovery !== null || shown.lagging}
            >
              {autoRunning ? '멈추기' : '자동 진행'}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

/** 뱃지 툴팁 문구. 데스크톱 `StatPanel`과 같은 형식이다. */
function rankTitle(key: GrowthStatKey, value: number): string {
  const need = toNextRank(key, value)
  const head = `${STAT_NAMES[key]} 등급 ${rankOf(key, value)}`
  return need === undefined ? `${head} (최고 등급)` : `${head} — 다음 등급까지 ${need}`
}

/** 등급 뱃지. **색으로 등급을 말하지 않는다**(글자 자체가 순서다). */
function RankBadge({ rank, title }: { rank: string; title: string }) {
  const top = rank === 'S' || rank === 'SS'
  return (
    <span className={`mo-rank${top ? ' mo-rank-top' : ''}`} title={title}>
      {rank}
    </span>
  )
}

/** 자원 한 줄. 라벨 + 숫자, 상한이 있으면 아래에 전폭 막대. */
function Row({
  statKey,
  value,
  max,
  suffix = '',
  warn = false,
  rankKey,
}: {
  statKey: keyof Stats
  value: number
  max?: number
  suffix?: string
  warn?: boolean
  rankKey?: GrowthStatKey
}) {
  return (
    <div className="mo-row">
      <div className="mo-row-line">
        <AppIcon name={STAT_META[statKey].hudIcon} size={16} className="mo-row-icon" />
        <span className="mo-row-label">{STAT_NAMES[statKey]}</span>
        {rankKey && <RankBadge rank={rankOf(rankKey, value)} title={rankTitle(rankKey, value)} />}
        <span className={`mo-row-value${warn ? ' mo-row-warn' : ''}`}>
          {value.toLocaleString('ko-KR')}
          {max !== undefined && <span className="mo-row-max">/{max.toLocaleString('ko-KR')}</span>}
          {suffix && <span className="mo-row-unit">{suffix}</span>}
        </span>
      </div>
      {max !== undefined && (
        <span className="mo-bar">
          {/* width가 아니라 scaleX — 매 프레임 레이아웃을 다시 계산시키지 않는다. */}
          <span className="mo-fill" style={{ transform: `scaleX(${Math.min(1, value / max)})` }} />
        </span>
      )}
    </div>
  )
}
