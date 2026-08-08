import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { EXPOS, daysUntilOpen, findExpo, isOpen, openDayOf } from '../../../data/expos'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { useWindowStore } from '../../../store/windowStore'
import {
  awardShortfalls,
  canJoin,
  canVisit,
  joinBlockers,
  visitBlockers,
  willAward,
} from '../../../systems/expos'
import type { Expo } from '../../../data/expos'
import type { Site } from '../../../data/sites'
import type { GameState } from '../../../types/game'
import { ActivityConfirm } from '../ActivityConfirm'
import './ExpoSite.css'

/**
 * 모두의행사 — 참관·참여할 수 있는 행사 안내.
 *
 * ## ⚠️ 축이 둘이라 사이트에 기본 `activityId`가 없다
 * 참관은 `Expo.visitActivityId`, 참여는 `ExpoJoin.activityId`가 가리킨다. 값·증감은 전부
 * 활동이 갖고 **입장료·참가비만 행사가 갖는다**(강의 수강료와 같은 방향) — 그래서 실행은
 * 기본 `doActivity`가 아니라 **`onCommit`**으로 `visitExpo`/`joinExpo`를 지난다. 그 통로가
 * 아니면 돈이 안 빠진다.
 *
 * ## ⚠️ 코미콘 참여는 여기서 실행하지 않는다
 * `ExpoJoin.siteId`가 있으면 확인창 없이 **그 사이트로 보낸다**(어느 회지를 파는가는
 * 코미콘 화면이 고른다). 이동이라 턴을 쓰지 않는다 — 판매 통로를 여기 또 만들면
 * "한 권은 한 번만 쓴다"가 두 곳에서 갈린다.
 *
 * ## ⚠️ 화면은 판정을 만들지 않는다
 * 못 하는 사유는 전부 `visitBlockers`/`joinBlockers`에서 온다. 안 열린 행사도 **감추지 않고**
 * "n일 뒤 개막"과 함께 비활성으로 둔다(알바몬·공모전과 같은 규칙).
 */
export function ExpoSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const visit = useGameStore((s) => s.visitExpo)
  const join = useGameStore((s) => s.joinExpo)
  const openSite = useWindowStore((s) => s.openSite)
  /** 지금 확인창이 열린 행사와 갈래. 한 번에 하나만 연다. */
  const [pick, setPick] = useState<{ id: string; mode: 'visit' | 'join' } | null>(null)

  if (!state) return null

  const day = state.day
  const open = EXPOS.filter((e) => isOpen(e, day))
  const later = EXPOS.filter((e) => !isOpen(e, day))
  /* 빈 상태 안내용. 목록이 비는 일은 없지만 "오늘 갈 곳"이 없는 날은 있다. */
  const soonest = later.reduce<Expo | undefined>(
    (best, e) => (!best || daysUntilOpen(e, day) < daysUntilOpen(best, day) ? e : best),
    undefined,
  )

  const picked = pick ? findExpo(pick.id) : undefined
  const activity = picked
    ? findActivity(pick?.mode === 'join' ? (picked.join?.activityId ?? '') : picked.visitActivityId)
    : undefined

  const card = (expo: Expo) => (
    <li key={expo.id}>
      <ExpoCard
        expo={expo}
        state={state}
        onVisit={() => setPick({ id: expo.id, mode: 'visit' })}
        onJoin={() => {
          const siteId = expo.join?.siteId
          if (siteId) openSite(siteId)
          else setPick({ id: expo.id, mode: 'join' })
        }}
      />
    </li>
  )

  return (
    <div className="ep">
      <header className="ep-head">
        <h1 className="ep-logo">
          <AppIcon name={site.icon} size={24} />
          모두의행사
        </h1>
        <p className="ep-lede">
          보러 가거나, 부스를 열거나. 오늘 열려 있는 행사 <b>{open.length}건</b>
          {' · 소지금 '}
          {state.stats.money.toLocaleString('ko-KR')}원
        </p>
      </header>

      <section className="ep-sec" aria-label="오늘 열린 행사">
        <h2 className="ep-sec-head">
          오늘 열린 행사<span className="ep-sec-count">{open.length}건</span>
        </h2>
        {open.length === 0 ? (
          /* ux `empty-states`: 빈 줄만 남기지 않고 언제 다시 오면 되는지 알린다. */
          <p className="ep-empty">
            오늘은 열려 있는 행사가 없습니다.
            {soonest &&
              ` 가장 가까운 것은 「${soonest.title}」이고 ${daysUntilOpen(soonest, day)}일 뒤에 엽니다.`}
          </p>
        ) : (
          <ul className="ep-grid">{open.map(card)}</ul>
        )}
      </section>

      {later.length > 0 && (
        <section className="ep-sec" aria-label="예정된 행사">
          <h2 className="ep-sec-head">
            예정된 행사<span className="ep-sec-count">{later.length}건</span>
          </h2>
          <ul className="ep-grid">{later.map(card)}</ul>
        </section>
      )}

      <footer className="ep-foot">
        <p>
          행사는 정해진 주기로 열립니다. 참관·참여 모두 <b>하루</b>가 들고, 입장료와 참가비는
          신청하는 순간 빠져나갑니다.
        </p>
        <p>{site.url}</p>
      </footer>

      {/* 항목을 누르면 곧바로 확인창이 뜬다(사이트 공통 규칙 — 확정 패널은 없다). */}
      {picked && activity && pick && (
        <ActivityConfirm
          activity={activity}
          kicker={`모두의행사 · ${picked.title}`}
          title={
            pick.mode === 'join'
              ? `「${picked.title}」에 부스를 열까요?`
              : `「${picked.title}」을(를) 보러 갈까요?`
          }
          actionLabel={pick.mode === 'join' ? '참여 신청' : '참관 신청'}
          notes={[
            { label: '주최', value: picked.host },
            { label: '장소', value: picked.place },
            {
              label: pick.mode === 'join' ? '참가비' : '입장료',
              value: feeText(pick.mode === 'join' ? (picked.join?.fee ?? 0) : picked.fee),
            },
            { label: '개최', value: scheduleText(picked, state.day) },
          ]}
          onCommit={() => (pick.mode === 'join' ? join(picked.id) : visit(picked.id))}
          onClose={() => setPick(null)}
        />
      )}
    </div>
  )
}

/** 0원은 "무료"라고 쓴다 — "0원"은 값이 빠진 것처럼 읽힌다. */
function feeText(fee: number): string {
  return fee > 0 ? `${fee.toLocaleString('ko-KR')}원` : '무료'
}

/** 언제 여는가. ⚠️ 열림/닫힘을 색이 아니라 **글자로** 말한다(ux `color-not-only`). */
function scheduleText(expo: Expo, day: number): string {
  const nth = openDayOf(expo, day)
  if (nth) return `열림 · ${nth}일째 / 총 ${expo.openDays}일`
  return `${daysUntilOpen(expo, day)}일 뒤 개막`
}

/**
 * 행사 카드 하나. 버튼은 최대 둘이고 **`join`이 없으면 참여 버튼을 그리지 않는다** —
 * 대신 그 사유를 글자로 적는다(동작 안 하는 컨트롤 금지).
 */
function ExpoCard({
  expo,
  state,
  onVisit,
  onJoin,
}: {
  expo: Expo
  state: GameState
  onVisit: () => void
  onJoin: () => void
}) {
  const open = isOpen(expo, state.day)
  const visitWhy = visitBlockers(state, expo)
  const joinWhy = joinBlockers(state, expo)
  /* 코미콘 참여는 이동이라 턴·돈 판정을 걸지 않는다 — 무엇을 팔지는 그쪽에서 고른다. */
  const goes = expo.join?.siteId !== undefined

  return (
    <article className={`ep-card${open ? '' : ' ep-card-off'}`}>
      <p className="ep-status">{scheduleText(expo, state.day)}</p>
      <p className="ep-host">{expo.host}</p>
      <h3 className="ep-title">
        {expo.title}
        {expo.badge && <span className="ep-badge">{expo.badge}</span>}
      </h3>
      <p className="ep-place">{expo.place}</p>

      <ul className="ep-tags">
        {expo.tags.map((t) => (
          <li key={t} className="ep-tag">
            {t}
          </li>
        ))}
      </ul>

      <p className="ep-fee">
        입장료 <b>{feeText(expo.fee)}</b>
      </p>

      <div className="ep-acts">
        <button
          type="button"
          className="ep-btn ep-btn-main"
          disabled={!canVisit(state, expo)}
          onClick={onVisit}
        >
          참관 신청
        </button>
        {visitWhy.map((r) => (
          <p key={r} className="ep-lock">
            <AppIcon name="mdi:lock-outline" size={13} />
            {r}
          </p>
        ))}

        {expo.join ? (
          <>
            <button
              type="button"
              className="ep-btn"
              /* 이동은 언제나 열려 있다 — 막는 것은 그쪽 화면이 한다. */
              disabled={!goes && !canJoin(state, expo)}
              onClick={onJoin}
            >
              {expo.join.label}
            </button>
            <p className="ep-desc">{expo.join.desc}</p>
            {expo.join.fee !== undefined && (
              <p className="ep-desc">참가비 {feeText(expo.join.fee)}</p>
            )}
            {expo.join.requires && <p className="ep-desc">조건 · {expo.join.requires}</p>}
            {/*
             * 수상 예고. **누르기 전에 받을지 못 받을지를 말한다** — 이 대회에는 무작위가
             * 없으므로(`awardShortfalls`) 미리 말할 수 있고, 말할 수 있으면 말해야 한다.
             *
             * ⚠️ **판정을 여기서 다시 하지 않는다**: 받는지는 `willAward`, 무엇이 모자란지는
             * `awardShortfalls`가 정하고 화면은 글자로 옮기기만 한다.
             * ⚠️ 상금이 아니라 평판이라고 적는다 — 돈을 기대하게 만들면 화면이 거짓을 말한다.
             */}
            {expo.join.award && (
              <p className={`ep-award${willAward(state, expo) ? ' ep-award-on' : ''}`}>
                <AppIcon
                  name={willAward(state, expo) ? 'mdi:trophy-outline' : 'mdi:lock-outline'}
                  size={13}
                />
                {willAward(state, expo)
                  ? `지금 나가면 ${expo.join.award.title} — 평판 +${expo.join.award.reputation}`
                  : `수상까지 ${awardShortfalls(state, expo).join(' · ')} 필요`}
              </p>
            )}
            {!goes &&
              joinWhy.map((r) => (
                <p key={r} className="ep-lock">
                  <AppIcon name="mdi:lock-outline" size={13} />
                  {r}
                </p>
              ))}
          </>
        ) : (
          /* ⚠️ 참여가 없는 행사가 정상이다. 사유는 `joinBlockers`에서 그대로 가져온다. */
          <p className="ep-desc">{joinWhy[0]}</p>
        )}
      </div>
    </article>
  )
}
