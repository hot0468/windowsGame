import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import {
  BOOKING_LEAD_DAYS,
  HERO_SHOWS,
  HOT_SHOWS,
  SHOWS,
  SHOW_GENRES,
  findShow,
  showsOf,
} from '../../../data/shows'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { firstFreeSlot } from '../../../systems/schedule'
import type { Show, ShowGenre } from '../../../data/shows'
import type { Site } from '../../../data/sites'
import { ActivityConfirm } from '../ActivityConfirm'
import { SeatPicker } from './SeatPicker'
import './TicketSite.css'

/**
 * 노24 — 공연 예매. **레퍼런스(실제 티켓 예매 사이트 홈)가 스펙이다.**
 *
 * ## 판형
 * 검은 헤더(로고 + 분류 네비) → **큰 캐러셀**(화살표 + 아래 썸네일 줄) →
 * **WHAT'S HOT**(큰 카드 1 + 작은 카드 6) → 분류 섹션(가운데 정렬 제목 + 좌우 선) → 푸터.
 * 분류를 고르면 홈 편성 대신 **그 분류 목록만** 뜬다(실제 사이트의 카테고리 페이지와 같다).
 *
 * ## 레퍼런스에서 **덜어낸 것**과 그 이유
 * ⚠️ **동작하지 않는 컨트롤은 그리지 않는다**(이 프로젝트의 규칙).
 * - **로그인·장바구니·마이티켓**: 이 게임에 계정이 없다.
 * - **[티켓오픈 더보기]·[랭킹 더보기]**: 더 보여 줄 목록이 따로 없다.
 * - **TICKET OPEN의 D-3 뱃지**: 오픈일을 데이터로 만들면 게임 날짜와 이어야 하고,
 *   그 순간 "며칠 뒤에 열리는 예매"라는 정산 규칙이 새로 생긴다.
 * - **광고 배너 격자·FOCUS ON 영상**: 이 게임에서 광고는 포털 배너존 하나뿐이고,
 *   영상은 아예 없다(너튜브도 썸네일은 그라데이션이다).
 *
 * 남긴 것은 전부 동작한다: 네비는 목록을 거르고, 캐러셀 화살표와 썸네일은 진짜로 넘어가며,
 * 포스터를 누르면 확인창이 뜬다.
 *
 * ⚠️ **고르는 것은 무엇을 보러 가는가뿐이고 값은 활동(`concert`)이 갖는다**
 * (`data/shows.ts` 주석) — 그래서 이 화면에는 가격이 한 번도 안 나온다.
 *
 * ## ⚠️ 예매는 관람이 아니다 (설계자 지시)
 * 확인창의 [예매하기]는 **활동을 실행하지 않는다**. 좌석 선택(`SeatPicker`)을 열고,
 * 거기서 성공해야 `BOOKING_LEAD_DAYS`일 뒤 **빈 슬롯에 예약이 잡힌다**.
 * 관람료·행동력·멘탈은 그날 `concert`가 정산하므로 **예매 자체는 턴도 돈도 안 쓴다**.
 * 그래서 확인창의 "1턴을 소모합니다"를 `costNote`로 갈아 끼운다 — 이 화면에서 그 문장은
 * 거짓이다.
 */
export function TicketSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const state = useGameStore((s) => s.state)
  const planActivity = useGameStore((s) => s.planActivity)
  /** 고른 분류. null이면 홈 편성(캐러셀 + HOT + 분류 섹션 전부). */
  const [genre, setGenre] = useState<ShowGenre | null>(null)
  /** 캐러셀에서 지금 크게 걸린 공연. */
  const [heroIndex, setHeroIndex] = useState(0)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 좌석 선택 중인 공연. 있으면 목록 대신 좌석 화면을 그린다. */
  const [seatingId, setSeatingId] = useState<string | null>(null)
  /** 방금 예매한 공연. 목록이 그대로라 결과를 글자로 남긴다. */
  const [booked, setBooked] = useState<string | null>(null)

  if (!activity || !state) return null
  const hero = HERO_SHOWS[heroIndex % HERO_SHOWS.length]
  const picked = pickedId ? findShow(pickedId) : undefined
  const seating = seatingId ? findShow(seatingId) : undefined
  const pick = (id: string) => setPickedId(id)

  /* 관람일. **남의 예약을 덮지 않는 첫 빈자리**를 고른다(`firstFreeSlot` 주석). */
  const target = firstFreeSlot(state.plans ?? [], state.day + BOOKING_LEAD_DAYS)
  const planLabel = `${target.day}일차 ${target.slot === 'morning' ? '오전' : '오후'}`

  /* 좌석 선택 화면. ⚠️ 목록 위에 띄우지 않고 **갈아 끼운다**(`SeatPicker` 주석). */
  if (seating) {
    return (
      <div className="tk">
        <SeatPicker
          show={seating}
          planLabel={planLabel}
          onBook={(seat) => {
            planActivity(target.day, target.slot, activity.id)
            setBooked(`「${seating.title}」 ${seat} · ${planLabel} 관람`)
          }}
          onClose={() => setSeatingId(null)}
        />
      </div>
    )
  }

  return (
    <div className="tk">
      {/* ── 검은 헤더: 로고 + 분류 네비 ─────────────────────── */}
      <header className="tk-top">
        <h1 className="tk-logo">
          노<span className="tk-logo-num">24</span>
        </h1>
        <nav className="tk-nav" aria-label="공연 분류">
          <button
            type="button"
            className={`tk-nav-item${genre === null ? ' tk-nav-on' : ''}`}
            aria-current={genre === null ? 'true' : undefined}
            onClick={() => setGenre(null)}
          >
            홈
          </button>
          {SHOW_GENRES.map((g) => (
            <button
              key={g}
              type="button"
              className={`tk-nav-item${genre === g ? ' tk-nav-on' : ''}`}
              aria-current={genre === g ? 'true' : undefined}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </nav>
        <span className="tk-tel">1544-0024</span>
      </header>

      {booked && (
        <p className="tk-receipt" role="status">
          {booked} 예매 완료. 일정에 잡혔습니다.
        </p>
      )}

      {genre === null ? (
        <>
          {/* ── 큰 캐러셀 ───────────────────────────────────── */}
          <section className="tk-hero-wrap" aria-label="추천 공연">
            <div className="tk-hero" style={{ background: hero.poster }}>
              {/* 화살표는 **진짜로 넘어간다** — 표시만 하는 화살표는 최악이다. */}
              <button
                type="button"
                className="tk-hero-nav tk-hero-prev"
                aria-label="이전 공연"
                onClick={() => setHeroIndex((i) => (i - 1 + HERO_SHOWS.length) % HERO_SHOWS.length)}
              >
                <AppIcon name="mdi:chevron-left" size={26} />
              </button>

              <button type="button" className="tk-hero-body" onClick={() => pick(hero.id)}>
                <span className="tk-hero-genre">{hero.genre}</span>
                <span className="tk-hero-title">{hero.title}</span>
                <span className="tk-hero-meta">
                  {hero.artist} · {hero.venue}
                </span>
                <span className="tk-hero-period">{hero.period}</span>
              </button>

              <button
                type="button"
                className="tk-hero-nav tk-hero-next"
                aria-label="다음 공연"
                onClick={() => setHeroIndex((i) => (i + 1) % HERO_SHOWS.length)}
              >
                <AppIcon name="mdi:chevron-right" size={26} />
              </button>
            </div>

            {/* 레퍼런스의 썸네일 줄. 누르면 그 공연이 크게 걸린다(예매가 아니다). */}
            <ul className="tk-strip" aria-label="추천 공연 목록">
              {HERO_SHOWS.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`tk-thumb${i === heroIndex ? ' tk-thumb-on' : ''}`}
                    style={{ background: s.poster }}
                    aria-current={i === heroIndex ? 'true' : undefined}
                    title={s.title}
                    onClick={() => setHeroIndex(i)}
                  >
                    <span className="tk-thumb-title">{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ── WHAT'S HOT: 큰 카드 1 + 작은 카드 6 ──────────── */}
          <section className="tk-sec" aria-labelledby="tk-hot">
            <h2 className="tk-sec-head tk-sec-plain" id="tk-hot">
              WHAT&apos;S HOT
            </h2>
            <div className="tk-hot">
              <ShowCard show={HOT_SHOWS[0]} big onPick={() => pick(HOT_SHOWS[0].id)} />
              <ul className="tk-hot-grid">
                {HOT_SHOWS.slice(1).map((s) => (
                  <li key={s.id}>
                    <ShowCard show={s} onPick={() => pick(s.id)} />
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── 분류 섹션. 레퍼런스처럼 제목이 가운데에 서고 좌우로 선이 뻗는다. ── */}
          {SHOW_GENRES.map((g) => (
            <section key={g} className="tk-sec" aria-labelledby={`tk-sec-${g}`}>
              <h2 className="tk-sec-head" id={`tk-sec-${g}`}>
                {g}
              </h2>
              <ul className="tk-row">
                {showsOf(g).map((s) => (
                  <li key={s.id}>
                    <ShowCard show={s} onPick={() => pick(s.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        /* 분류를 고르면 카테고리 화면. 홈 편성(캐러셀·HOT)은 접는다. */
        <section className="tk-sec" aria-labelledby="tk-cat">
          <h2 className="tk-sec-head" id="tk-cat">
            {genre}
          </h2>
          <p className="tk-count">
            {showsOf(genre).length}건 · 전체 {SHOWS.length}건
          </p>
          <ul className="tk-row">
            {showsOf(genre).map((s) => (
              <li key={s.id}>
                <ShowCard show={s} onPick={() => pick(s.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="tk-foot">
        <p className="tk-foot-tel">1544-0024</p>
        <p>평일 09:00~18:00 · 공연 당일 취소·환불 불가</p>
        <p>공연 정보는 주최사가 등록한 내용이며 노24는 이를 보증하지 않습니다.</p>
        <p>{site.url}</p>
      </footer>

      {/* 포스터를 누르면 곧바로 확인창이 뜬다(사이트 공통 규칙 — 확정 패널은 없다). */}
      {picked && (
        <ActivityConfirm
          activity={activity}
          kicker="노24 예매"
          title={`「${picked.title}」을(를) 예매하시겠습니까?`}
          actionLabel="예매하기"
          notes={[
            { label: '출연', value: picked.artist },
            { label: '공연장', value: picked.venue },
            { label: '공연 기간', value: picked.period },
            { label: '잔여 좌석', value: picked.seats },
            { label: '관람 예정', value: planLabel },
          ]}
          costNote={`예매는 턴을 쓰지 않습니다 · 위 증감은 ${planLabel}에 정산됩니다`}
          onCommit={() => setSeatingId(picked.id)}
          onClose={() => setPickedId(null)}
        />
      )}
    </div>
  )
}

/**
 * 공연 카드 하나. `big`이면 WHAT'S HOT의 큰 자리다(포스터만 커지고 구성은 같다).
 * ⚠️ 포스터는 사진이 아니라 **그라데이션 판 + 제목**이다(오프라인 규칙 — 외부 이미지 금지).
 */
function ShowCard({ show, big = false, onPick }: { show: Show; big?: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className={`tk-card${big ? ' tk-card-big' : ''}`}
      onClick={onPick}
      title={show.blurb}
    >
      <span className="tk-poster" style={{ background: show.poster }}>
        <span className="tk-poster-genre">{show.genre}</span>
        <span className="tk-poster-title">{show.title}</span>
      </span>
      <span className="tk-body">
        <span className="tk-title">{show.title}</span>
        <span className="tk-meta">
          {show.artist} · {show.venue}
        </span>
        <span className="tk-seats">
          <AppIcon name="mdi:ticket-outline" size={13} />
          {show.seats}
        </span>
      </span>
    </button>
  )
}
