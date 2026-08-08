import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { SHOWS, SHOW_GENRES, findShow, showsOf } from '../../../data/shows'
import { AppIcon } from '../../../icons/AppIcon'
import type { Show, ShowGenre } from '../../../data/shows'
import type { Site } from '../../../data/sites'
import { ActivityConfirm } from '../ActivityConfirm'
import './TicketSite.css'

/**
 * 노24 — 공연 예매.
 *
 * ⚠️ **시집이(영화 예매)와 같은 부류다.** 목록에서 고르는 것은 **무엇을 보러 가는가**뿐이고,
 * 실행되는 활동(`concert`)과 관람료는 활동 하나가 갖는다(`data/shows.ts` 주석 참조).
 * 그래서 이 화면에는 가격이 여러 개 뜨지 않는다 — 값은 확인창이 한 번만 말한다.
 *
 * **둘러보기는 무료다.** 탭을 바꾸고 포스터를 넘기는 동안 게임 상태는 읽지도 쓰지도 않는다.
 *
 * ## 판형 (레퍼런스: 실제 티켓 예매 사이트)
 * 상단 띠(예매 안내) → 헤더(로고·소지금) → 분류 탭 → 포스터 격자 → 푸터.
 * ⚠️ **동작하는 것만 컨트롤로 만든다** — 탭과 포스터는 실제로 동작하고, 그 밖의
 * 장식 링크(마이티켓·고객센터 등)는 아예 그리지 않는다.
 */
export function TicketSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [genre, setGenre] = useState<ShowGenre | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 예매한 공연. 확정 후에도 목록이 그대로라 결과를 글자로 남긴다. */
  const [booked, setBooked] = useState<string | null>(null)

  if (!activity) return null
  const shown = genre ? showsOf(genre) : SHOWS
  const picked = pickedId ? findShow(pickedId) : undefined

  return (
    <div className="tk">
      <p className="tk-strip">전석 지정 예매 · 취소 수수료 없음 · 공연 당일 현장 수령</p>

      <header className="tk-head">
        <h1 className="tk-logo">
          노<span className="tk-logo-num">24</span>
        </h1>
        <p className="tk-sub">오늘 저녁에도 어딘가에서는 막이 오른다</p>
      </header>

      {/* 분류 탭. 레퍼런스의 장르 줄 자리이고 **실제로 목록을 거른다**. */}
      <nav className="tk-tabs" aria-label="공연 분류">
        <button
          type="button"
          className={`tk-tab${genre === null ? ' tk-tab-on' : ''}`}
          aria-pressed={genre === null}
          onClick={() => setGenre(null)}
        >
          전체
        </button>
        {SHOW_GENRES.map((g) => (
          <button
            key={g}
            type="button"
            className={`tk-tab${genre === g ? ' tk-tab-on' : ''}`}
            aria-pressed={genre === g}
            onClick={() => setGenre(genre === g ? null : g)}
          >
            {g}
          </button>
        ))}
      </nav>

      {booked && (
        <p className="tk-receipt" role="status">
          「{booked}」 예매 완료. 공연 시작 30분 전까지 입장하세요.
        </p>
      )}

      <ul className="tk-grid">
        {shown.map((show) => (
          <li key={show.id}>
            <ShowCard show={show} onPick={() => setPickedId(show.id)} />
          </li>
        ))}
      </ul>

      <footer className="tk-foot">
        <p className="tk-foot-logo">노24</p>
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
            { label: '잔여 좌석', value: picked.seats },
          ]}
          onCommitted={() => setBooked(picked.title)}
          onClose={() => setPickedId(null)}
        />
      )}
    </div>
  )
}

/**
 * 공연 카드 하나.
 * ⚠️ 포스터는 사진이 아니라 **그라데이션 판 + 제목**이다(오프라인 규칙 — 외부 이미지 금지).
 */
function ShowCard({ show, onPick }: { show: Show; onPick: () => void }) {
  return (
    <button type="button" className="tk-card" onClick={onPick} title={show.blurb}>
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
