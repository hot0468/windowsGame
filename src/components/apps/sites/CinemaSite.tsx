import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { FILMS, findShowtime } from '../../../data/media'
import type { Site } from '../../../data/sites'
import { ActivityCommit } from './ActivityCommit'
import './CinemaSite.css'

/**
 * 시집이 — **극장 예매** 사이트. 확정 버튼이 `movie`(영화 감상) 활동을 실행한다.
 *
 * ⚠️ 스트리밍이 아니라 **극장**이다(설계자 확정). 그래서 `movie`의 수치도 2026-08-04에
 * 외출 기준으로 올렸다(행동력 -15 · 15,000원 · 멘탈 +8) — 자세한 사유는 `data/activities.ts`.
 *
 * **둘러보기는 무료다.** 시간표를 넘기고 회차를 고르는 동안 게임 상태는 움직이지 않는다.
 *
 * 시각 언어: style `Modern Dark (Cinema Mobile)` / `Dark Mode (OLED)`.
 * 어두운 판 위에 상영관이 떠 있는 구조이며, 체크리스트의 "No pure #000000"에 맞춰
 * 순검정이 아니라 기존 잉크 토큰(--nv-text)을 표면으로 쓴다 — **새 색을 만들지 않는다.**
 */
export function CinemaSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 예매한 회차 문구. 확정 후에도 화면이 그대로라 결과를 글자로 남긴다. */
  const [ticket, setTicket] = useState<string | null>(null)

  if (!activity) return null
  const picked = pickedId ? findShowtime(pickedId) : undefined

  return (
    <div className="cine">
      <header className="cine-head">
        <h1 className="cine-logo">시집이</h1>
        <p className="cine-sub">오늘의 상영 시간표 · 좌석은 선착순입니다.</p>
      </header>

      {ticket && (
        <p className="cine-receipt" role="status">
          예매 완료 — {ticket}. 상영 10분 전까지 입장하세요.
        </p>
      )}

      <div className="cine-films">
        {FILMS.map((film) => (
          <article key={film.id} className="cine-film">
            <div className="cine-film-head">
              <h2 className="cine-film-title">{film.title}</h2>
              <p className="cine-film-meta">
                {film.rating} · {film.genre} · {film.runtime}분
              </p>
              <p className="cine-tagline">{film.tagline}</p>
            </div>
            {/* 회차 고르기. 한 번에 한 회차만 고른다. */}
            <div className="cine-times" role="radiogroup" aria-label={`${film.title} 상영 회차`}>
              {film.showtimes.map((s) => {
                const on = s.id === pickedId
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`cine-time${on ? ' cine-time-on' : ''}`}
                    onClick={() => setPickedId(on ? null : s.id)}
                  >
                    <span className="cine-time-hh">{s.time}</span>
                    <span className="cine-time-sub">
                      {s.screen} · {s.seats}석
                    </span>
                  </button>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <ActivityCommit
        activity={activity}
        actionLabel="예매하기"
        selection={
          picked
            ? `「${picked.film.title}」 ${picked.showtime.time} ${picked.showtime.screen}`
            : undefined
        }
        selectionHint="보고 싶은 회차를 고르세요."
        onCommitted={() => {
          setTicket(
            picked ? `「${picked.film.title}」 ${picked.showtime.time} ${picked.showtime.screen}` : null,
          )
          setPickedId(null)
        }}
      />
    </div>
  )
}
