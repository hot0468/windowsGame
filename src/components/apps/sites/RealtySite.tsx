import { useState } from 'react'
import { HOUSINGS, REALTY_NAME } from '../../../data/housing'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { getLivingCost, livingCostForDay } from '../../../systems/economy'
import { canMove, currentHousing, lockedDeposit, moveBlockers, moveCost } from '../../../systems/housing'
import type { Housing } from '../../../data/housing'
import type { Site } from '../../../data/sites'
import './RealtySite.css'

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

/**
 * 방구석부동산 — **이사**.
 *
 * ⚠️ **은행과 같은 부류의 사이트다**(`activityId` 없음, 확정 패널 없음, **턴을 쓰지
 * 않는다**). 여기서 사는 것은 물건도 활동도 아니라 **영구히 낮아진 생활비**이고,
 * 그래서 이 게임에서 죽음의 원인 자체를 건드리는 유일한 화면이다.
 *
 * ⚠️ **판정을 여기서 다시 하지 않는다.** 계약금·가능 여부·사유는 전부
 * `systems/housing.ts`(`moveCost`/`canMove`/`moveBlockers`)가 정하고 이 컴포넌트는
 * 물어보고 그리기만 한다 — 화면이 자기 기준으로 판정하면 "버튼은 살아 있는데
 * 눌러도 안 되는" 어긋남이 생긴다(알바몬·벼룩장터와 같은 규칙).
 */
export function RealtySite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const moveHouse = useGameStore((s) => s.moveHouse)
  /** 계약 직전에 한 번 더 묻는다(ux `confirmation-dialogs`) — 되돌리려면 수수료를 또 낸다. */
  const [confirming, setConfirming] = useState<Housing | null>(null)
  /** 방금 옮긴 집. 화면이 그대로라 안내가 없으면 눌렸는지 알 수 없다(ux `success-feedback`). */
  const [justMoved, setJustMoved] = useState<Housing | null>(null)

  if (!state) return null

  const here = currentHousing(state)
  const living = getLivingCost(state)
  const base = livingCostForDay(state.day)

  return (
    <div className="rt">
      <p className="rt-strip">보증금은 이사 나갈 때 돌려받습니다. 중개수수료는 돌려받지 못합니다.</p>

      <header className="rt-head">
        <AppIcon name={site.icon} size={30} />
        <div>
          <h1 className="rt-title">{REALTY_NAME}</h1>
          <p className="rt-sub">매일 나가는 돈을 줄이는 가장 확실한 방법</p>
        </div>
        <p className="rt-money">
          소지금 <strong>{won(state.stats.money)}</strong>
        </p>
      </header>

      {/* 지금 사는 집. **비교 기준이 화면에 없으면 매물 카드의 숫자가 뜻을 잃는다**
          (style `Comparative Analysis Dashboard` — 나란히 놓아야 차이가 읽힌다). */}
      <section className="rt-sec" aria-labelledby="rt-now">
        <h2 className="rt-sec-title" id="rt-now">
          지금 사는 곳
        </h2>
        <div className="rt-now">
          <AppIcon name={here.icon} size={40} />
          <div className="rt-now-info">
            <p className="rt-now-name">{here.name}</p>
            <p className="rt-now-area">{here.area}</p>
          </div>
          <dl className="rt-now-figs">
            <div>
              <dt>오늘 생활비</dt>
              <dd className="rt-num">{won(living)}</dd>
            </div>
            <div>
              <dt>묶인 보증금</dt>
              <dd className="rt-num">{won(lockedDeposit(state))}</dd>
            </div>
          </dl>
        </div>
      </section>

      {justMoved && (
        <p className="rt-receipt" role="status">
          <AppIcon name={justMoved.icon} size={20} />
          <span>
            <strong>{justMoved.name}</strong> 계약 완료 — 오늘부터 생활비가{' '}
            <strong>{won(getLivingCost(state))}</strong>입니다.
          </span>
        </p>
      )}

      <section className="rt-sec" aria-labelledby="rt-list">
        <h2 className="rt-sec-title" id="rt-list">
          매물 {HOUSINGS.length}건
        </h2>
        <ul className="rt-grid">
          {HOUSINGS.map((h) => {
            const isHere = h.id === here.id
            const cost = moveCost(state, h)
            const ok = canMove(state, h)
            const blockers = isHere ? [] : moveBlockers(state, h)
            // 그 집에 살 때의 하루 생활비. **오늘 기준**이라 비교가 성립한다.
            const rowLiving = Math.round(base * h.rate)
            const saved = living - rowLiving

            return (
              <li key={h.id} className={`rt-card${isHere ? ' rt-card-here' : ''}`}>
                <div className="rt-card-head">
                  <AppIcon name={h.icon} size={34} />
                  <div>
                    <h3 className="rt-name">
                      {h.name}
                      {isHere && <span className="rt-badge">거주 중</span>}
                    </h3>
                    <p className="rt-area">{h.area}</p>
                  </div>
                </div>

                <p className="rt-desc">{h.desc}</p>

                <dl className="rt-figs">
                  <div>
                    <dt>하루 생활비</dt>
                    <dd className="rt-num rt-good">{won(rowLiving)}</dd>
                  </div>
                  <div>
                    <dt>지금보다</dt>
                    {/* ux `color-not-only`: 부호와 한국어 라벨이 색과 함께 말한다. */}
                    <dd className={`rt-num ${saved > 0 ? 'rt-good' : saved < 0 ? 'rt-bad' : ''}`}>
                      {saved > 0 ? `-${won(saved)}` : saved < 0 ? `+${won(-saved)}` : '동일'}
                    </dd>
                  </div>
                  <div>
                    <dt>보증금</dt>
                    <dd className="rt-num">{won(h.deposit)}</dd>
                  </div>
                  <div>
                    <dt>중개수수료</dt>
                    <dd className="rt-num rt-bad">{h.fee > 0 ? won(h.fee) : '없음'}</dd>
                  </div>
                </dl>

                {/* ⚠️ **대가를 감추지 않는다.** 싼 방일수록 밤마다 멘탈이 깎이는데
                    그것을 안 적으면 플레이어는 왜 멘탈이 줄어드는지 영영 모른다. */}
                {h.mentalPerNight > 0 && (
                  <p className="rt-cost">잠자리가 편치 않습니다 — 매일 밤 멘탈 -{h.mentalPerNight}</p>
                )}

                <div className="rt-buy">
                  <span className="rt-contract">
                    지금 필요한 계약금 <strong className="rt-num">{won(Math.max(0, cost))}</strong>
                  </span>
                  <button
                    type="button"
                    className="rt-btn"
                    disabled={!ok}
                    onClick={() => setConfirming(h)}
                  >
                    {isHere ? '거주 중' : ok ? '계약하기' : '계약금 부족'}
                  </button>
                </div>

                {/* ⚠️ 조건 미달을 **감추지 않고 사유를 글자로 적는다**(ux `error-clarity`,
                    알바몬·벼룩장터와 같은 규칙). 감추면 왜 못 가는지 알 수 없다. */}
                {blockers.length > 0 && <p className="rt-why">{blockers.join(' · ')}</p>}
              </li>
            )
          })}
        </ul>
      </section>

      {confirming && (
        /* ⚠️ `window.confirm` 금지 — 가짜 OS 위의 진짜 대화상자는 컨셉을 깬다
           (스케줄러 취소 확인창과 같은 규칙). 기본 포커스는 덜 위험한 [그만두기]. */
        <div className="rt-scrim" onClick={() => setConfirming(null)}>
          <div
            className="rt-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rt-dlg-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && setConfirming(null)}
          >
            <h2 className="rt-dlg-title" id="rt-dlg-title">
              {confirming.name}으로 이사할까요?
            </h2>
            <p className="rt-dlg-body">
              보증금 <strong>{won(confirming.deposit)}</strong>이 묶이고 중개수수료{' '}
              <strong>{won(confirming.fee)}</strong>는 <strong>돌려받지 못합니다.</strong>
              <br />
              지금 집의 보증금 <strong>{won(lockedDeposit(state))}</strong>은 돌려받습니다.
            </p>
            <p className="rt-dlg-body">
              오늘 생활비가 <strong>{won(living)}</strong> →{' '}
              <strong className="rt-good">{won(Math.round(base * confirming.rate))}</strong>이 됩니다.
            </p>
            <div className="rt-dlg-btns">
              <button
                type="button"
                className="rt-btn rt-btn-ghost"
                autoFocus
                onClick={() => setConfirming(null)}
              >
                그만두기
              </button>
              <button
                type="button"
                className="rt-btn"
                onClick={() => {
                  moveHouse(confirming)
                  setJustMoved(confirming)
                  setConfirming(null)
                }}
              >
                계약하기
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="rt-foot">
        {REALTY_NAME}는 가상의 중개업소입니다. 계약은 턴을 소모하지 않습니다.
      </p>
    </div>
  )
}
