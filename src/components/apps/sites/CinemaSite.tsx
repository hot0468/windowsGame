import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { FILMS, MAIN_FILM_ID, findShowtime } from '../../../data/media'
import { AppIcon } from '../../../icons/AppIcon'
import type { Film, FilmSection } from '../../../data/media'
import type { Site } from '../../../data/sites'
import { ActivityCommit } from './ActivityCommit'
import './CinemaSite.css'

/**
 * 시집이 — **극장 예매** 사이트. 확정 버튼이 `movie`(영화 감상) 활동을 실행한다.
 *
 * ⚠️ 스트리밍이 아니라 **극장**이다(설계자 확정). 그래서 `movie`의 수치도 외출 기준이다
 * (행동력 -15 · 15,000원 · 멘탈 +8) — 자세한 사유는 `data/activities.ts`.
 *
 * **둘러보기는 무료다.** 포스터를 넘기고 회차를 고르는 동안 게임 상태는 움직이지 않는다.
 * 스탯을 움직이는 코드는 `ActivityCommit` 안의 확정 버튼 하나뿐이다.
 *
 * ## 구조 (레퍼런스: 실제 멀티플렉스 홈)
 * 프로모션 띠 → 유틸 줄(로고) → 내비 → 히어로 배너 → 현재 상영작 TOP 5 →
 * 개봉 예정작 TOP 5 → 아르떼 TOP 5 → 와이드 배너 → 푸터.
 *
 * ⚠️ **동작하는 것만 컨트롤로 만든다**(카톡·너튜브와 같은 규칙). 포스터·회차·배너 닫기는
 * 실제로 동작하고, 내비 탭(예매·영화관·이벤트·스토어)과 로그인 줄은 **표시만** 한다 —
 * 눌러도 아무 일 없는 버튼을 늘리면 그 사이트다움이 오히려 깎인다.
 */

const SECTIONS: { id: FilmSection; label: string }[] = [
  { id: 'now', label: '현재 상영작' },
  { id: 'soon', label: '개봉 예정작' },
  { id: 'arte', label: '아르떼 영화' },
]

/** 표시 전용 내비. 실제로 도는 화면은 '영화' 하나뿐이라 그것만 켜 둔다. */
const NAV = ['예매', '영화', '영화관', '이벤트', '스토어']

export function CinemaSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 시간표를 펼친 영화. 포스터를 누르면 그 영화만 열린다. */
  const [openFilmId, setOpenFilmId] = useState<string | null>(null)
  /** 방금 예매한 회차 문구. 확정 후에도 화면이 그대로라 결과를 글자로 남긴다. */
  const [ticket, setTicket] = useState<string | null>(null)
  const [promo, setPromo] = useState(true)

  if (!activity) return null
  const picked = pickedId ? findShowtime(pickedId) : undefined
  const main = FILMS.find((f) => f.id === MAIN_FILM_ID)
  const openFilm = openFilmId ? FILMS.find((f) => f.id === openFilmId) : undefined

  return (
    <div className="cine">
      {/* 프로모션 띠. ✕는 **진짜로 닫힌다** — 표시만 하는 닫기 버튼은 최악이다. */}
      {promo && (
        <div className="cine-promo">
          <span className="cine-promo-tag">전체 관람가</span>
          <strong className="cine-promo-title">길 위의 뭉치</strong>
          <span className="cine-promo-sub">시집이 단독 개봉 · 2026.08.19</span>
          <button
            type="button"
            className="cine-promo-x"
            onClick={() => setPromo(false)}
            aria-label="프로모션 닫기"
          >
            <AppIcon name="mdi:close" size={16} />
          </button>
        </div>
      )}

      <header className="cine-util">
        <span className="cine-util-left" aria-hidden="true">
          인스타그램 · 너튜브 · 페이스북
        </span>
        <h1 className="cine-logo">
          <AppIcon name="fluent-color:video-24" size={22} />
          시집이
        </h1>
        <span className="cine-util-right" aria-hidden="true">
          멤버십 · 고객센터 · 단체관람 · 로그인
        </span>
      </header>

      <nav className="cine-nav" aria-label="시집이 메뉴">
        {NAV.map((n) => (
          <span key={n} className={`cine-nav-item${n === '영화' ? ' cine-nav-item-on' : ''}`}>
            {n}
          </span>
        ))}
      </nav>

      {/* 히어로. 개봉 예정 대작 한 편이 홈에서 가장 큰 자리를 갖는다. */}
      {main && (
        <div className="cine-hero" style={{ background: main.poster }}>
          <span className="cine-hero-rating">{main.rating} 관람가</span>
          <p className="cine-hero-kicker">
            {main.genre} · {main.runtime}분
          </p>
          <h2 className="cine-hero-title">{main.title}</h2>
          <p className="cine-hero-tag">{main.tagline}</p>
          <span className="cine-hero-open">
            {main.dday ? `${main.dday}일 후 대개봉` : '상영 중'}
          </span>
        </div>
      )}

      {ticket && (
        <p className="cine-receipt" role="status">
          예매 완료 — {ticket}. 상영 10분 전까지 입장하세요.
        </p>
      )}

      {SECTIONS.map((sec) => {
        const films = FILMS.filter((f) => f.section === sec.id)
        if (!films.length) return null
        return (
          <section key={sec.id} className="cine-sec">
            <h3 className="cine-sec-head">
              {sec.label} <b>TOP {films.length}</b>
            </h3>
            <ul className="cine-posters">
              {films.map((film, i) => (
                <li key={film.id}>
                  <FilmCard
                    film={film}
                    rank={i + 1}
                    open={openFilmId === film.id}
                    onToggle={() => {
                      setOpenFilmId(openFilmId === film.id ? null : film.id)
                      setPickedId(null)
                    }}
                  />
                </li>
              ))}
            </ul>

            {/* 시간표는 **그 영화가 속한 구역 아래**에 펼친다 — 포스터에서 눈을 떼지 않게. */}
            {openFilm?.section === sec.id && (
              <div className="cine-open">
                <p className="cine-open-head">
                  <b>{openFilm.title}</b> · {openFilm.rating} · {openFilm.runtime}분
                </p>
                {openFilm.showtimes.length === 0 ? (
                  <p className="cine-open-soon">
                    {openFilm.dday}일 후 개봉합니다. 예매는 개봉일부터 열립니다.
                  </p>
                ) : (
                  <div
                    className="cine-times"
                    role="radiogroup"
                    aria-label={`${openFilm.title} 상영 회차`}
                  >
                    {openFilm.showtimes.map((s) => {
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
                )}
              </div>
            )}
          </section>
        )
      })}

      <div className="cine-wide" aria-hidden="true">
        <strong>길 위의 뭉치</strong>
        <span>내 진짜 주인은 바로 나! · 시집이 단독 개봉</span>
      </div>

      <ActivityCommit
        activity={activity}
        actionLabel="예매하기"
        selection={
          picked
            ? `「${picked.film.title}」 ${picked.showtime.time} ${picked.showtime.screen}`
            : undefined
        }
        selectionHint="포스터를 눌러 회차를 고르세요."
        onCommitted={() => {
          setTicket(
            picked
              ? `「${picked.film.title}」 ${picked.showtime.time} ${picked.showtime.screen}`
              : null,
          )
          setPickedId(null)
          setOpenFilmId(null)
        }}
      />

      <footer className="cine-foot">
        <p className="cine-foot-logo">시집이</p>
        <p className="cine-foot-links">
          회사소개 · 이용약관 · <b>개인정보처리방침</b> · 채용안내 · 광고/임대문의 · 사회적책임
        </p>
        <p className="cine-foot-info">
          시집이컬처웍스(주) · 고객센터 1544-0000 · 통신판매업신고 2026-서울-0000
          <br />
          Copyright © SIZIBI Cultureworks. All Rights Reserved.
        </p>
      </footer>
    </div>
  )
}

function FilmCard({
  film,
  rank,
  open,
  onToggle,
}: {
  film: Film
  rank: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`cine-card${open ? ' cine-card-on' : ''}`}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="cine-poster" style={{ background: film.poster }}>
        <span className="cine-poster-title">{film.title}</span>
        <span className="cine-rank">{rank}</span>
      </span>
      <span className="cine-card-name">
        <span className={`cine-grade cine-grade-${gradeKey(film.rating)}`}>
          {gradeShort(film.rating)}
        </span>
        {film.title}
      </span>
      <span className="cine-card-meta">
        {film.runtime}분
        {film.dday !== undefined && <b className="cine-dday"> · D-{film.dday}</b>}
      </span>
    </button>
  )
}

/** 등급 배지의 색 구분. 실제 극장처럼 등급마다 색이 다르다. */
function gradeKey(rating: string): string {
  if (rating.startsWith('전체')) return 'all'
  if (rating.startsWith('12')) return 'y12'
  if (rating.startsWith('15')) return 'y15'
  return 'adult'
}

/** 배지에 넣을 짧은 표기. 긴 등급명은 카드 폭을 넘긴다. */
function gradeShort(rating: string): string {
  if (rating.startsWith('전체')) return 'ALL'
  if (rating.startsWith('12')) return '12'
  if (rating.startsWith('15')) return '15'
  return '19'
}
