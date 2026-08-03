import { useState } from 'react'
import { ACTIVITIES } from '../../data/activities'
import { dateOf, dayOf } from '../../data/calendar'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { findPlan } from '../../systems/schedule'
import type { Slot } from '../../types/game'
import './SchedulerApp.css'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

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
                      onClick={() =>
                        plan ? unplan(c.day, slot) : setPicking({ day: c.day, slot })
                      }
                      title={
                        past
                          ? '지난 슬롯입니다'
                          : plan
                            ? `${activity?.label ?? plan.activityId} — 눌러서 취소`
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
            {ACTIVITIES.map((a) => (
              <button
                key={a.id}
                type="button"
                className="sch-pick"
                autoFocus={a.id === ACTIVITIES[0].id}
                onClick={() => {
                  planActivity(picking.day, picking.slot, a.id)
                  setPicking(null)
                }}
              >
                <AppIcon name={a.icon} size={20} />
                <span className="sch-pick-body">
                  <span className="sch-pick-name">{a.label}</span>
                  <span className="sch-pick-desc">{a.description}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="sch-note">
        예약한 슬롯은 그 시간이 되면 자동으로 실행됩니다. 행동력이나 소지금이 모자라면
        건너뛰고 알려 줍니다.
      </p>
    </div>
  )
}
