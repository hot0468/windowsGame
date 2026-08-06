import { useState } from 'react'
import { ACTIVITIES, ACTIVITY_CATEGORIES, plannableOf } from '../../data/activities'
import { dateOf, dayOf } from '../../data/calendar'
import { findItem, storeNameOf } from '../../data/items'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { owns } from '../../systems/delivery'
import { findPlan } from '../../systems/schedule'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../../types/game'
import type { Activity, GameState, Slot, Stats } from '../../types/game'
import { previewActivity } from './activityPreview'
import './SchedulerApp.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * 활동 한 줄에 붙는 증감 표시.
 *
 * **이득을 앞에 세운다** — 고르는 사람이 먼저 묻는 것은 "뭐가 오르나"이고,
 * 비용은 그다음에 판단한다. 15개를 나란히 놓고 비교하려면 순서가 같아야 한다.
 * 색은 활동 창(`ExeApp`)과 같은 의미색이고, 부호(+/−)와 스탯 이름이 함께 있으므로
 * 색만으로 뜻을 전하지 않는다(ux `color-not-only`·`contrast-feedback`).
 */
function effectChips(state: GameState, activity: Activity) {
  // ⚠️ **원본 `effects`를 그리지 않는다**(2026-08-05 수정). 알바는 `scalesWithWage`라
  // 실제 입금액이 물가 배율만큼 다르고, 번아웃 중이면 이득이 깎인다. 활동 창·확정 패널·
  // 알바몬 카드가 전부 `previewActivity`를 쓰는데 이 판만 원본을 그리면,
  // 같은 활동이 "일정에서는 +60,000, 알바몬에서는 +72,000"으로 갈라진다.
  return previewActivity(state, activity)
    .rows.sort((a, b) => Number(b.value > 0) - Number(a.value > 0))
    .map(({ key, value }) => ({
      key: key as keyof Stats,
      gain: value > 0,
      text: `${STAT_NAMES[key]} ${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString()}`,
    }))
}

/**
 * 지금 못 채운 **성장 스탯** 조건. 알바 4종처럼 스탯으로 잠긴 활동을 위한 것이다.
 *
 * ⚠️ 행동력·소지금은 세지 않는다 — 자고 나면 회복되므로 **미래 슬롯**을 계획하는 이 화면에서
 * "지금 부족하다"를 경고하면 늘 떠 있는 소음이 된다. 성장 스탯은 저절로 오르지 않으므로 다르다.
 * ⚠️ 그래도 **버튼을 막지는 않는다**: 그 슬롯에 닿을 때까지 조건을 채울 수 있고, 못 채우면
 * `systems/schedule.ts`가 실행 시점에 `canRun`으로 막는다(판정은 거기 하나뿐이다).
 */
function unmetGrowth(state: GameState, activity: Activity): string[] {
  const need = activity.requires
  if (!need) return []
  return GROWTH_STAT_KEYS.filter((k) => (need[k] ?? 0) > state.stats[k]).map(
    (k) => `${STAT_NAMES[k]} ${need[k]} 이상 필요 — 현재 ${state.stats[k]}`,
  )
}

/**
 * 일정(스케줄러).
 *
 * **한 달씩 보이는 달력에 앞으로의 계획이 뜬다**(설계자 지시). 칸을 누르면 그 슬롯에
 * 활동을 예약하고, 턴이 그 슬롯에 닿으면 `systems/schedule.ts`가 자동으로 실행한다.
 *
 * ⚠️ **지난 날은 예약할 수 없다** — 과거를 계획하는 건 말이 안 되고, 스토어도 막는다.
 * 지나간 기록은 여기 없다: 그건 `recentActivities`의 몫이고 이 창은 앞만 본다.
 */
export function SchedulerApp() {
  const state = useGameStore((s) => s.state)
  const planActivity = useGameStore((s) => s.planActivity)
  const unplan = useGameStore((s) => s.unplan)
  /** 보고 있는 달. 오늘이 속한 달에서 시작한다. */
  const [monthOffset, setMonthOffset] = useState(0)
  /** 활동을 고르는 중인 슬롯. null이면 고르는 중이 아니다. */
  const [picking, setPicking] = useState<{ day: number; slot: Slot } | null>(null)
  /**
   * 취소를 확인받는 중인 예약. **한 번의 오클릭으로 예약이 사라지면 안 된다**(설계자 지시).
   * `window.confirm`을 쓰지 않는 이유: 브라우저 기본 대화상자는 이 가짜 OS 위에
   * 진짜 크롬 UI를 띄워 컨셉을 깬다. 활동 피커와 같은 오버레이 패턴을 쓴다.
   */
  const [removing, setRemoving] = useState<{ day: number; slot: Slot } | null>(null)

  if (!state) return null

  const plans = state.plans ?? []
  const today = dateOf(state.day)
  const shown = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = shown.getFullYear()
  const month = shown.getMonth()

  // 달력 격자: 그 달 1일이 있는 주의 일요일부터 6주(42칸)를 그린다.
  // 주 수를 달마다 바꾸면 창 높이가 들쭉날쭉해진다.
  const first = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { date: d, day: dayOf(d), inMonth: d.getMonth() === month }
  })

  /** 고르기 판에서 **화면 순서상** 첫 항목. 포커스를 여기에 준다. */
  const firstPickId = ACTIVITY_CATEGORIES.flatMap((c) => plannableOf(c.id))[0]?.id

  const nowIndex = state.day * 2 + (state.slot === 'afternoon' ? 1 : 0)
  const isPast = (day: number, slot: Slot) =>
    day * 2 + (slot === 'afternoon' ? 1 : 0) < nowIndex

  return (
    <div className="sch">
      <header className="sch-head">
        <button
          type="button"
          className="sch-nav"
          onClick={() => setMonthOffset((m) => m - 1)}
          aria-label="이전 달"
        >
          <span className="sch-chev sch-chev-prev" aria-hidden="true" />
        </button>
        <h3 className="sch-title">
          {year}년 {month + 1}월
        </h3>
        <button
          type="button"
          className="sch-nav"
          onClick={() => setMonthOffset((m) => m + 1)}
          aria-label="다음 달"
        >
          <span className="sch-chev sch-chev-next" aria-hidden="true" />
        </button>
        {/* 오늘에서 멀어졌을 때 돌아오는 길. 0이면 이미 오늘이라 감춘다. */}
        {monthOffset !== 0 && (
          <button type="button" className="sch-today" onClick={() => setMonthOffset(0)}>
            오늘로
          </button>
        )}
      </header>

      <div className="sch-week" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="sch-weekday">
            {w}
          </span>
        ))}
      </div>

      <div className="sch-grid">
        {cells.map((c) => {
          const isToday = c.day === state.day
          return (
            <div
              key={c.date.toISOString()}
              className={`sch-cell${c.inMonth ? '' : ' sch-cell-out'}${
                isToday ? ' sch-cell-today' : ''
              }`}
            >
              <span className="sch-date">{c.date.getDate()}</span>
              {/* 게임이 시작되기 전(1일차 이전)은 예약 자체가 없는 날이다. */}
              {c.day >= 1 &&
                (['morning', 'afternoon'] as Slot[]).map((slot) => {
                  const plan = findPlan(plans, c.day, slot)
                  const past = isPast(c.day, slot)
                  const activity = plan && ACTIVITIES.find((a) => a.id === plan.activityId)
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`sch-slot${plan ? ' sch-slot-on' : ''}`}
                      disabled={past}
                      /* 왼쪽 클릭은 **예약/교체**만 한다. 취소를 왼쪽에 걸어 두면
                         칸을 잘못 눌렀을 때 곧바로 사라진다(설계자 지시). */
                      onClick={() => setPicking({ day: c.day, slot })}
                      /* 취소는 **오른쪽 클릭**이다(설계자 지시). 실제 OS의 삭제 자리와 같고,
                         브라우저 기본 메뉴는 막는다 — 그게 뜨면 확인창이 가려진다. */
                      onContextMenu={(e) => {
                        if (!plan) return
                        e.preventDefault()
                        setRemoving({ day: c.day, slot })
                      }}
                      title={
                        past
                          ? '지난 슬롯입니다'
                          : plan
                            ? `${activity?.label ?? plan.activityId} — 오른쪽 클릭으로 취소`
                            : '눌러서 예약'
                      }
                    >
                      <span className="sch-slot-tag">{slot === 'morning' ? '오전' : '오후'}</span>
                      {activity && (
                        <>
                          <AppIcon name={activity.icon} size={14} />
                          <span className="sch-slot-name">{activity.label}</span>
                        </>
                      )}
                    </button>
                  )
                })}
            </div>
          )
        })}
      </div>

      {picking && (
        <>
          {/* 바깥 클릭으로 닫기 — 브라우저 메뉴와 같은 방식(전역 리스너 없이 판 한 장). */}
          <div className="sch-scrim" onClick={() => setPicking(null)} />
          <div
            className="sch-picker"
            role="dialog"
            aria-label="활동 고르기"
            onKeyDown={(e) => e.key === 'Escape' && setPicking(null)}
          >
            <p className="sch-picker-head">
              {picking.day}일차 {picking.slot === 'morning' ? '오전' : '오후'}
            </p>
            {/*
              활동이 15종이 되면서 평평한 한 줄 목록으로는 못 고른다.
              묶음 라벨과 순서는 데이터(`ACTIVITY_CATEGORIES`)가 정한다 — 여기에 적으면
              콘텐츠가 컴포넌트로 새고, 활동을 늘릴 때마다 화면을 고치게 된다.
              구분은 상자가 아니라 **작은 라벨 + 여백**이 한다(ux `whitespace-balance`,
              typography `font-scale`: 11/12/14 세 단만 쓴다).
            */}
            <div className="sch-picker-list">
              {ACTIVITY_CATEGORIES.map((cat) => {
                const list = plannableOf(cat.id)
                if (!list.length) return null
                return (
                  <section key={cat.id} className="sch-pick-group" aria-label={cat.label}>
                    <p className="sch-pick-cat" aria-hidden="true">
                      {cat.label}
                    </p>
                    {list.map((a) => {
                      // 아이템이 필요한 활동은 **감추지 않고 잠근다**. 감추면 회원권이라는
                      // 것이 있다는 사실 자체를 알 길이 없어 쇼핑으로 가는 길이 끊긴다
                      // (ux `empty-nav-state`: 갈 수 없는 곳은 숨기지 말고 이유를 밝힌다).
                      const need = a.requiresItem ? findItem(a.requiresItem) : undefined
                      const locked = !!a.requiresItem && !owns(state, a.requiresItem)
                      // 스탯으로 잠긴 활동(알바 3종)은 막지 않고 사유만 적는다 — 위 주석 참조.
                      const unmet = locked ? [] : unmetGrowth(state, a)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          className={`sch-pick${locked ? ' sch-pick-locked' : ''}`}
                          disabled={locked}
                          // 처음 그려지는 항목에 포커스를 준다. 배열 첫 항목(study)이
                          // 아니라 **화면 순서의 첫 항목**이어야 탭 순서와 어긋나지 않는다.
                          autoFocus={a.id === firstPickId}
                          title={
                            locked
                              ? `${need?.name ?? a.requiresItem}이(가) 있어야 합니다`
                              : a.description
                          }
                          onClick={() => {
                            planActivity(picking.day, picking.slot, a.id)
                            setPicking(null)
                          }}
                        >
                          <AppIcon name={a.icon} size={20} />
                          <span className="sch-pick-body">
                            <span className="sch-pick-name">{a.label}</span>
                            {locked ? (
                              <span className="sch-pick-lock">
                                {/* ⚠️ 가게 이름은 `storeNameOf`가 정한다 — 여기 굳혀 두면
                                    전자기기를 하이마루로 옮긴 순간 이 문장만 거짓이 된다. */}
                                {need?.name ?? a.requiresItem} 필요
                                {a.requiresItem && storeNameOf(a.requiresItem)
                                  ? ` — ${storeNameOf(a.requiresItem)}에서 구입`
                                  : ''}
                              </span>
                            ) : (
                              <>
                                <span className="sch-pick-fx">
                                  {effectChips(state, a).map((c) => (
                                    <span
                                      key={c.key}
                                      className={c.gain ? 'sch-pick-plus' : 'sch-pick-minus'}
                                    >
                                      {c.text}
                                    </span>
                                  ))}
                                </span>
                                {unmet.map((reason) => (
                                  <span key={reason} className="sch-pick-lock">
                                    {reason}
                                  </span>
                                ))}
                              </>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </section>
                )
              })}
            </div>
          </div>
        </>
      )}

      {removing && (
        <>
          <div className="sch-scrim" onClick={() => setRemoving(null)} />
          <div
            className="sch-picker sch-confirm"
            role="alertdialog"
            aria-label="예약 취소 확인"
            onKeyDown={(e) => e.key === 'Escape' && setRemoving(null)}
          >
            <p className="sch-confirm-head">
              {(() => {
                const plan = findPlan(plans, removing.day, removing.slot)
                const activity = plan && ACTIVITIES.find((a) => a.id === plan.activityId)
                return `${removing.day}일차 ${removing.slot === 'morning' ? '오전' : '오후'} · ${
                  activity?.label ?? plan?.activityId ?? '예약'
                }`
              })()}
            </p>
            <p className="sch-confirm-body">이 예약을 정말 취소하시겠습니까?</p>
            <div className="sch-confirm-btns">
              {/* 기본 초점은 **덜 위험한 쪽**에 둔다 — Enter를 눌러 취소돼 버리면 안 된다. */}
              <button
                type="button"
                className="sch-confirm-keep"
                autoFocus
                onClick={() => setRemoving(null)}
              >
                그대로 두기
              </button>
              <button
                type="button"
                className="sch-confirm-drop"
                onClick={() => {
                  unplan(removing.day, removing.slot)
                  setRemoving(null)
                }}
              >
                예약 취소
              </button>
            </div>
          </div>
        </>
      )}

      {/* ⚠️ 자동 진행 버튼을 이 창에 두지 않는다 — 창을 닫으면 멈출 수단이 사라진다.
          여기서는 그런 것이 있고 어디에 있는지만 알린다(ux `empty-nav-state`). */}
      <p className="sch-note">
        예약한 슬롯은 그 시간이 되면 자동으로 실행됩니다. 행동력이나 소지금이 모자라면
        건너뛰고 알려 줍니다. 예약을 취소하려면 그 칸을 <b>오른쪽 클릭</b>하세요.
        <br />
        여러 날을 한 번에 흘려보내려면 날짜칸의 <b>자동 진행</b>을 누르세요. 예약이 없는
        슬롯에 닿거나 알아야 할 일이 생기면 스스로 멈추고 그동안의 기록을 보여 줍니다.
      </p>
    </div>
  )
}
