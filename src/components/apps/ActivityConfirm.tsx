import { useId } from 'react'
import { UI_ICONS } from '../../data/icons'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useShortcutStore } from '../../store/shortcutStore'
import { canRun } from '../../systems/turn'
import { STAT_NAMES } from '../../types/game'
import type { Activity } from '../../types/game'
import { blockReasons, previewActivity, previewWarnings } from './activityPreview'
import { openToolWindow } from './ToolRun'
import './ActivityConfirm.css'

/** 경고 글리프. ExeApp과 같은 아이콘을 쓴다(같은 뜻은 같은 그림이어야 한다). */
const WARN_ICON = 'fluent-color:warning-24'

/**
 * 활동 **실행 확인창** — 1턴을 쓰기 전에 대가를 보여 주는 유일한 화면.
 *
 * ⚠️ **사이트의 확정 패널(구 `ActivityCommit`)은 폐기됐다**(설계자 지시).
 * 사이트는 목록만 그리고, 항목을 누르면 이 창이 뜬다. 그래서 이 창 하나가
 * 통로 둘을 함께 진다: **바탕화면 바로 가기**와 **사이트 항목 클릭**.
 *
 * ## 왜 `window.confirm`이 아닌가
 * 이 게임은 화면 전체가 가짜 윈도우다. 진짜 크롬 대화상자가 뜨는 순간 그 착각이
 * 깨지고, 게다가 크롬 대화상자에는 **숫자를 담을 자리가 없다**(스케줄러의 예약 취소
 * 확인창과 같은 판단).
 *
 * ## 이 창이 반드시 지는 약속
 * ⚠️ **누르기 전에 대가를 전부 보여 준다.** 증감은 활동 창과 **같은 함수**
 * (`previewActivity`), 경고 문구도 **같은 함수**(`previewWarnings`)에서 가져온다 —
 * 화면이 둘이어도 숫자와 경고는 하나다. 활동의 비용이 아닌 것(수강료·응시료처럼
 * 사이트가 따로 받는 돈)은 `notes`로 받아 같은 자리에 함께 적는다.
 *
 * ⚠️ **지름길이 규칙을 건너뛰지 않는다.** 실행 가능 판정은 `canRun` 하나이고
 * (행동력·소지금·요구 스탯·요구 아이템·게임오버), 안 되면 **실행 버튼을 아예 그리지 않고**
 * 사유를 적는다. 막힌 버튼만 보여 주면 왜 막혔는지 알 길이 없다(ux `error-clarity`).
 * 사이트만 아는 사유(이미 수료한 강의 등)는 `blocked`로 받아 같은 목록에 얹는다.
 */
export function ActivityConfirm({
  activity,
  onClose,
  kicker = '바탕화면 바로 가기',
  title,
  actionLabel = '실행',
  notes = [],
  blocked,
  costNote,
  onCommit,
  onCommitted,
}: {
  activity: Activity
  onClose: () => void
  /** 제목 위 작은 글자. 어디서 눌렀는지 알려 준다(사이트 이름·"바로 가기"). */
  kicker?: string
  /** 확인 문장. 생략하면 활동 이름으로 만든다. */
  title?: string
  /** 실행 버튼의 글자(읽기 / 예매하기 / 지원하기). */
  actionLabel?: string
  /**
   * 활동의 증감에 안 잡히는 사실(수강료·응시료·발표일·고른 회차).
   * ⚠️ **사이트가 따로 그리지 않는다** — 누르기 전에 알아야 할 것은 전부 이 창에 있다.
   */
  notes?: { label: string; value: string }[]
  /** 사이트만 아는 잠금 사유. 있으면 `canRun`과 무관하게 막는다. */
  blocked?: string
  /**
   * 맨 아래 대가 한 줄을 갈아 끼운다.
   * ⚠️ **`onCommit`이 턴을 안 쓰는 확정일 때만 쓴다**(노24 예매) — 기본 문장은
   * "1턴을 소모합니다"이고, 그 자리가 통로마다 달라 보이면 플레이어가 다시 배워야 한다.
   */
  costNote?: string
  /** 기본 동작(`doActivity`)을 대신할 확정 처리(수강 신청·원서 접수·정규직 지원). */
  onCommit?: () => void
  /** 확정 직후 사이트가 남길 영수증 문구용. `onClose`는 별도로 항상 불린다. */
  onCommitted?: () => void
}) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)
  const registered = useShortcutStore((s) => s.activityIds.includes(activity.id))
  const addShortcut = useShortcutStore((s) => s.add)
  const titleId = useId()
  if (!state) return null

  const allowed = canRun(state, activity) && !blocked
  const { rows, mentalPenalty } = previewActivity(state, activity)
  const warnings = previewWarnings(state, activity)
  // 막힌 경우에는 'blocked' 한 줄 대신 **구체적인 사유 목록**을 쓴다.
  const shown = allowed ? warnings : warnings.filter((w) => w.id !== 'blocked')
  const reasons = allowed
    ? []
    : [...(blocked ? [blocked] : []), ...blockReasons(state, activity)]

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
            <p className="acd-kicker">{kicker}</p>
            <h2 className="acd-title" id={titleId}>
              {title ?? `「${activity.label}」을(를) 바로 실행하시겠습니까?`}
            </h2>
          </div>
        </header>

        {notes.length > 0 && (
          <dl className="acd-notes">
            {notes.map((n) => (
              <div key={n.label} className="acd-note">
                <dt>{n.label}</dt>
                <dd>{n.value}</dd>
              </div>
            ))}
          </dl>
        )}

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
                /* ⚠️ 실행 연출은 활동 창과 **같은 규칙**을 탄다 — 여기서 빠뜨리면
                   바로 가기·사이트로 실행할 때만 장면이 안 뜬다(실행 통로가 갈리는 자리다).
                   창을 여는 것이 실행보다 먼저인 이유도 그쪽과 같다: 미리보기가 **효과가
                   붙기 전** 스탯을 읽어야 결과 알림의 증감이 맞는다.
                   ⚠️ **`onCommit` 갈래에서도 연다**(2026-08-08) — 여기 else 안에만 있어서
                   슬로우캠퍼스 수강처럼 사이트가 직접 확정하는 경로는 장면이 통째로
                   빠졌다. `runSceneOf`가 없는 활동은 알아서 아무것도 안 열므로, 턴을 안
                   쓰는 확정(노24 좌석 선택·정규직 지원)은 지금도 앞으로도 조용하다 —
                   **그런 활동에 장면을 붙이지 않는 것이 그 조건이다.** */
                openToolWindow(state, activity)
                if (onCommit) onCommit()
                else doActivity(activity)
                onCommitted?.()
                onClose()
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>

        {allowed && (
          <p className="acd-cost">
            <AppIcon name={UI_ICONS.turnCost} size={13} />
            {costNote ?? '1턴을 소모합니다'}
          </p>
        )}

        {/*
         * ⚠️ **바탕화면 등록은 여기가 유일한 창구다**(구 확정 패널의 오른쪽 클릭 메뉴를
         * 대신한다). 못 하는 상태에서도 등록은 되어야 한다 — 바로 가기를 만들고 싶은
         * 순간은 오히려 "지금은 못 하지만 자주 할 것 같다"일 때다.
         * ⚠️ `requiresPick` 활동은 뺀다 — 바로 가기는 "나중에 실행"이라 그 시점엔
         * 고른 대상이 없고, 그러면 턴만 먹고 아무 일도 일어나지 않는다.
         */}
        {!activity.requiresPick && (
          <button
            type="button"
            className="acd-shortcut"
            disabled={registered}
            onClick={() => addShortcut(activity.id)}
          >
            {registered ? '이미 바탕화면에 있습니다' : '바탕화면에 바로 가기 등록'}
          </button>
        )}
      </div>
    </>
  )
}
