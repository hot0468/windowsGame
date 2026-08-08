import { useState } from 'react'
import { WISH_AMOUNT } from '../../data/rankEvents'
import { GROWTH_STAT_ORDER } from '../../data/statMeta'
import { STAT_META } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import { growthCap } from '../../systems/turn'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import type { GrowthStatKey } from '../../types/game'
import './WishApp.css'

/**
 * 별똥별 — **소원을 빌어 성장 스탯 하나를 `WISH_AMOUNT`만큼 올린다.**
 *
 * ## 왜 활동 창이 아닌가
 * 활동 창은 "이걸 할까요?"를 묻는 팝업이고 실행하면 **1턴을 쓴다**. 별똥별을 본 것은
 * 플레이어가 고른 행동이 아니라 **일어난 일**이라, 턴을 먹으면 감수성 A에 닿은 보상이
 * 곧 벌금이 된다. 그래서 고르는 창(증기·클립스튜디오와 같은 부류)이고 턴을 쓰지 않는다.
 *
 * ## ⚠️ 닫기만 하면 소원이 사라진다
 * 이 창을 닫는 것 자체는 아무것도 기록하지 않는다 — 즉 **닫아도 나중에 다시 열린다**
 * (`dueRankEvents`가 여전히 이 이벤트를 돌려주므로). 기록은 소원을 빌 때만 찍히고,
 * 그것이 "한 번만"의 근거다(`systems/rankEvents.ts`의 `grantWish`).
 *
 * ## ⚠️ 소모 자원은 고를 수 없다
 * 목록은 **성장 스탯 12종**뿐이다(`GROWTH_STAT_ORDER`). 체력·멘탈은 매일 오르내리는
 * 잔량이라 +100이 다음 취침에 사라지고, 소지금은 100원이라 뜻이 없다 — 셋 다 "소원"이
 * 성립하지 않는 자리다.
 */
export function WishApp({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const makeWish = useGameStore((s) => s.makeWish)
  const [picked, setPicked] = useState<GrowthStatKey | null>(null)

  if (!state) return null

  const cap = picked ? growthCap(picked) : 0
  /* ⚠️ **상한에서 잘리는 몫을 미리 적는다.** 평판·도덕·예의범절은 상한이 100이라 대부분
     100까지만 오르는데, 그 사실을 안 적으면 "100 올려 준다"가 거짓이 된다. */
  const gain = picked ? Math.min(cap, state.stats[picked] + WISH_AMOUNT) - state.stats[picked] : 0

  return (
    <div className="wish">
      {/* ⚠️ **밤하늘 판을 그리지 않았다.** 어두운 표면·별빛 그라데이션은 확정 토큰에 없는
          색이고, 만드는 순간 이 창 하나를 위한 새 시각 언어가 된다(디자인 규칙). 장면은
          글자가 만들고 글리프 하나만 얹는다 — 이 리포의 "장식 금지"와 같은 판단이다. */}
      <p className="wish-lead">
        <AppIcon name="fluent-color:star-24" size={22} />
        창밖으로 별이 하나 길게 떨어졌다. 오래 하늘을 본 사람에게만 보이는 속도였다.
      </p>
      <p className="wish-sub">
        무엇을 빌겠습니까? 고른 것이 <b>{WISH_AMOUNT}</b> 오릅니다. 기회는 한 번입니다.
      </p>

      <div className="wish-grid" role="radiogroup" aria-label="소원을 빌 스탯">
        {GROWTH_STAT_ORDER.map((key) => {
          const on = picked === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              className={`wish-cell${on ? ' wish-cell-on' : ''}`}
              onClick={() => setPicked(key)}
            >
              <AppIcon name={STAT_META[key].hudIcon} size={15} />
              <span className="wish-cell-name">{STAT_NAMES[key]}</span>
              <span className="wish-cell-value">{state.stats[key]}</span>
            </button>
          )
        })}
      </div>

      {/* 고른 뒤에만 결과를 적는다 — 고르기 전에 빈 자리를 남기면 무엇을 기다리는지 모른다. */}
      {picked && (
        <p className="wish-preview" role="status">
          {STAT_NAMES[picked]} {state.stats[picked]} → {state.stats[picked] + gain}
          {gain < WISH_AMOUNT && (
            <span className="wish-note">
              상한 {cap.toLocaleString('ko-KR')}에서 멈춥니다 (+{gain})
            </span>
          )}
        </p>
      )}

      <div className="wish-actions">
        <button
          type="button"
          className="wish-btn wish-btn-primary"
          disabled={!picked}
          onClick={() => {
            if (!picked) return
            makeWish(picked)
            onClose()
          }}
        >
          소원을 빈다
        </button>
        {/* ⚠️ 죽은 컨트롤이 아니다: 닫으면 아무 일도 안 일어나고 **나중에 다시 뜬다**.
            그 사실을 title로 적어 "기회를 날렸다"는 오해를 막는다. */}
        <button
          type="button"
          className="wish-btn"
          onClick={onClose}
          title="지금은 빌지 않습니다. 별은 다시 보입니다."
        >
          그냥 본다
        </button>
      </div>
    </div>
  )
}
