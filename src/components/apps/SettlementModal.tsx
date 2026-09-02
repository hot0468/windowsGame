import { useState } from 'react'
import { CAREERS } from '../../data/careers'
import { formatGameDate } from '../../data/calendar'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { allRecords } from '../../systems/records'
import { affectionOf } from '../../systems/affection'
import { PEOPLE } from '../../data/relations'
import './SettlementModal.css'

/**
 * 1년 결산 — **"20대의 딱 1년"이 끝나는 날**(2026-08-24 설계자 설정).
 *
 * ## ⚠️ 엔딩 모달과 **별개 화면이다**
 * 셋이 달라서 갈랐다:
 *  1. **회복과 무관하게 뜬다.** `EndingModal`은 `!state.recovery`로 막는데, 그 조건을
 *     그대로 쓰면 **363일차에 파산한 사람의 결산이 통째로 사라진다.**
 *  2. 엔딩은 **스탯에서 파생되는 상태**(매 렌더 계산)이고 결산은 **1회성 사건**이다.
 *  3. 엔딩은 [계속하기]로 물릴 수 있지만 결산은 물릴 수 없다 — 1년은 이미 지났다.
 *
 * ## ⚠️ 게임오버 화면이 아니다
 * [이어하기]가 주 버튼이다. 결산 뒤에도 계속 살고, 굳는 것은 직업·거주뿐이다
 * (`systems/settlement.ts`). "끝났습니다"라고 말하지 않는 이유가 그것이다.
 *
 * ## ⚠️ 무엇을 했는지 단정하지 않는다
 * 편성표·안내와 같은 규칙이다. 여기 적는 것은 **실제로 남은 것**(기록·직장·사람)뿐이고,
 * 비어 있으면 비어 있다고 적는다 — "친구를 많이 만들었습니다" 같은 말은 아무도 안 만난
 * 사람에게 거짓말이 된다.
 */
export function SettlementModal() {
  const state = useGameStore((s) => s.state)
  const reset = useGameStore((s) => s.reset)
  const closeAll = useWindowStore((s) => s.closeAll)
  /** 닫았는가. **상태에 저장하지 않는다** — 결산은 이미 `settled`에 남았고, 이 값은
      "지금 이 화면을 보고 있는가"일 뿐이다(새로고침하면 다시 뜨는 것이 맞다). */
  const [closed, setClosed] = useState(false)

  if (!state?.settled || closed) return null

  const career = CAREERS.find((c) => c.id === state.settled!.careerId)
  /* 기록은 `systems/records.ts`가 단일 출처다 — 여기서 다시 세면 스탯창과 다른 말을 한다. */
  const records = allRecords(state).filter((r) => r.value !== undefined)
  /* 가까워진 사람. **이름만 적는다** — 몇 점인지는 도감이 말한다. */
  const friends = PEOPLE.filter((p) => affectionOf(state, p.id) > 0)

  return (
    <div className="settle-overlay" role="alertdialog" aria-modal="true" aria-labelledby="settle-title">
      <div className="settle-box">
        <AppIcon name="fluent-color:calendar-24" size={44} className="settle-icon" />
        <h2 className="settle-title" id="settle-title">
          1년이 지났습니다
        </h2>
        <p className="settle-lede">
          {formatGameDate(state.settled.day)}. 스물 몇 해의 어느 1년이 이렇게 지나갔습니다.
        </p>

        <ul className="settle-list">
          {records.map((r) => (
            <li key={r.id} className="settle-row">
              <span className="settle-row-label">{r.label}</span>
              <span className="settle-row-value">{r.value}</span>
            </li>
          ))}
          <li className="settle-row">
            <span className="settle-row-label">일</span>
            <span className="settle-row-value">
              {career ? `${career.company} ${career.title}` : '어디에도 매이지 않았다'}
            </span>
          </li>
          <li className="settle-row">
            <span className="settle-row-label">곁에 남은 사람</span>
            <span className="settle-row-value">
              {friends.length ? friends.map((p) => p.name).join(' · ') : '아직 없다'}
            </span>
          </li>
        </ul>

        {/* ⚠️ **무엇이 굳는지 미리 말한다**(ux `error-clarity`) — 이어했더니 지원 버튼이
            사라져 있으면 버그로 읽힌다. */}
        <p className="settle-note">
          이제부터 하던 일은 이어 갈 수 있지만, 새 직장을 구하거나 이사할 수는 없습니다.
        </p>

        <div className="settle-buttons">
          <button
            type="button"
            className="settle-btn settle-btn-primary"
            autoFocus
            onClick={() => setClosed(true)}
          >
            이어하기
          </button>
          <button
            type="button"
            className="settle-btn settle-btn-ghost"
            onClick={() => {
              closeAll()
              reset()
            }}
          >
            새로 시작
          </button>
        </div>
      </div>
    </div>
  )
}
