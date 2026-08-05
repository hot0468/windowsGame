import { useId } from 'react'
import { UI_ICONS } from '../../data/icons'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { canRun } from '../../systems/turn'
import { STAT_NAMES } from '../../types/game'
import type { Activity } from '../../types/game'
import { blockReasons, previewActivity, previewWarnings } from './activityPreview'
import './ActivityConfirm.css'

/** 경고 글리프. ExeApp·확정 패널과 같은 아이콘을 쓴다(같은 뜻은 같은 그림이어야 한다). */
const WARN_ICON = 'fluent-color:warning-24'

/**
 * 바탕화면 **바로 가기**를 더블클릭했을 때 뜨는 실행 확인창.
 *
 * ## 왜 `window.confirm`이 아닌가
 * 이 게임은 화면 전체가 가짜 윈도우다. 진짜 크롬 대화상자가 뜨는 순간 그 착각이
 * 깨지고, 게다가 크롬 대화상자에는 **숫자를 담을 자리가 없다**(스케줄러의 예약 취소
 * 확인창과 같은 판단).
 *
 * ## 이 창이 반드시 지는 약속
 * ⚠️ **누르기 전에 대가를 전부 보여 준다.** 바로 가기는 사이트를 거치지 않는 지름길이라,
 * 여기서 비용을 감추면 **이 게임에서 유일하게 플레이어가 기습당하는 자리**가 된다.
 * 그래서 증감은 확정 패널·활동 창과 **같은 함수**(`previewActivity`)에서, 경고 문구도
 * **같은 함수**(`previewWarnings`)에서 가져온다 — 화면이 셋이 되어도 숫자와 경고는 하나다.
 *
 * ⚠️ **지름길이 규칙을 건너뛰지 않는다.** 실행 가능 판정은 `canRun` 하나이고
 * (행동력·소지금·요구 스탯·요구 아이템·게임오버), 안 되면 **실행 버튼을 아예 그리지 않고**
 * 사유를 적는다. 막힌 버튼만 보여 주면 왜 막혔는지 알 길이 없다(ux `error-clarity`).
 */
export function ActivityConfirm({
  activity,
  onClose,
}: {
  activity: Activity
  onClose: () => void
}) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)
  const titleId = useId()
  if (!state) return null

  const allowed = canRun(state, activity)
  const { rows, mentalPenalty } = previewActivity(state, activity)
  const warnings = previewWarnings(state, activity)
  // 막힌 경우에는 'blocked' 한 줄 대신 **구체적인 사유 목록**을 쓴다.
  const shown = allowed ? warnings : warnings.filter((w) => w.id !== 'blocked')
  const reasons = allowed ? [] : blockReasons(state, activity)

  return (
    <>
      {/*
       * style `blur-purpose`: 흐림은 장식이 아니라 "뒤를 눌러 닫을 수 있다"는 신호다.
       * 바깥 클릭으로 닫히므로 확인창에도 빠져나갈 길이 셋이다(바깥·Esc·취소 버튼).
       */}
      <div className="acd-scrim" onClick={onClose} />
      <div
        className="acd"
        role="alertdialog"
        aria-labelledby={titleId}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <header className="acd-head">
          <AppIcon name={activity.icon} size={28} />
          <div>
            <p className="acd-kicker">바탕화면 바로 가기</p>
            <h2 className="acd-title" id={titleId}>
              「{activity.label}」을(를) 바로 실행하시겠습니까?
            </h2>
          </div>
        </header>

        <ul className="acd-effects">
          {rows.map(({ key, value }) => (
            <li key={key} className="acd-effect">
              <span className="acd-effect-label">
                <AppIcon name={STAT_META[key].icon} size={15} />
                {STAT_NAMES[key]}
              </span>
              {/* 부호를 항상 적는다 — 색만으로 증감을 전하지 않는다(ux `color-not-only`). */}
              <span className={value >= 0 ? 'acd-plus' : 'acd-minus'}>
                {value >= 0 ? '+' : ''}
                {value.toLocaleString('ko-KR')}
              </span>
            </li>
          ))}
          {mentalPenalty > 0 && (
            <li className="acd-effect">
              <span className="acd-effect-label">
                <AppIcon name={STAT_META.mental.icon} size={15} />
                {STAT_NAMES.mental} (연속 페널티)
              </span>
              <span className="acd-minus">-{mentalPenalty}</span>
            </li>
          )}
        </ul>

        {shown.map((w) => (
          <p key={w.id} className="acd-warn">
            <AppIcon name={WARN_ICON} size={15} />
            <span>{w.text}</span>
          </p>
        ))}

        {reasons.length > 0 && (
          <div className="acd-warn acd-blocked">
            <AppIcon name={WARN_ICON} size={15} />
            <div>
              <p className="acd-blocked-head">지금은 실행할 수 없습니다.</p>
              <ul className="acd-reasons">
                {reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="acd-btns">
          {/*
           * ⚠️ 기본 초점은 **덜 위험한 쪽**이다. 실행은 1턴을 쓰고 되돌릴 수 없으므로
           * Enter를 눌러 실행돼 버리면 안 된다(스케줄러 취소 확인창과 같은 규칙).
           */}
          <button type="button" className="acd-cancel" autoFocus onClick={onClose}>
            {allowed ? '취소' : '닫기'}
          </button>
          {allowed && (
            <button
              type="button"
              className="acd-run"
              onClick={() => {
                doActivity(activity)
                onClose()
              }}
            >
              실행
            </button>
          )}
        </div>

        {allowed && (
          <p className="acd-cost">
            <AppIcon name={UI_ICONS.turnCost} size={13} />1턴을 소모합니다
          </p>
        )}
      </div>
    </>
  )
}
