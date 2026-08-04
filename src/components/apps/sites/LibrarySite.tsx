import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { BOOKS, BOOK_BANNERS, BOOK_CATEGORIES, BOOK_EVENTS } from '../../../data/media'
import { AppIcon } from '../../../icons/AppIcon'
import type { Book } from '../../../data/media'
import type { Site } from '../../../data/sites'
import { ActivityCommit } from './ActivityCommit'
import './LibrarySite.css'

/**
 * 미디북스 — 전자책 구독 사이트. 확정 버튼이 `reading`(독서) 활동을 실행한다.
 *
 * **둘러보기는 무료다.** 목록을 넘기고 책을 고르는 동안 게임 상태는 읽지도 쓰지도 않는다 —
 * 스탯을 움직이는 코드는 `ActivityCommit` 안의 확정 버튼 하나뿐이다.
 *
 * ## 구조 (레퍼런스: 실제 전자책 스토어 홈)
 * 헤더(로고·검색·로그인) → 카테고리 탭 → 배너 캐러셀 → 퀵메뉴 →
 * 지금 많이 읽는 작품(순위) → 오늘의 발견 → 이벤트 → 새로 나온 작품 → 확정 패널 → 푸터.
 *
 * ⚠️ **동작하는 것만 컨트롤로 만든다**(너튜브·시집이·아점과 같은 규칙).
 * 카테고리 탭·배너 화살표·표지 클릭은 실제로 동작하고, 검색·로그인·퀵메뉴 원형은
 * 표시만 한다 — 눌러도 아무 일 없는 버튼을 늘리면 그 사이트다움이 오히려 깎인다.
 */

/** 퀵메뉴 원형. 이 게임에 담을 동작이 없어 **표시 전용**이다. */
const QUICK = [
  { label: '신간', icon: 'mdi:new-box' },
  { label: '북스 베스트', icon: 'mdi:trophy-outline' },
  { label: '이벤트', icon: 'mdi:gift-outline' },
  { label: '미디셀렉트', icon: 'mdi:bookmark-multiple-outline' },
  { label: '이달의 쿠폰', icon: 'mdi:ticket-percent-outline' },
  { label: '대여', icon: 'mdi:book-clock-outline' },
  { label: '매일 모아쿠폰', icon: 'mdi:calendar-check-outline' },
]

export function LibrarySite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 읽은 책. 확정 후 화면이 그대로라 무슨 일이 일어났는지 글자로 남긴다. */
  const [readTitle, setReadTitle] = useState<string | null>(null)
  const [category, setCategory] = useState('추천')
  const [slide, setSlide] = useState(0)

  if (!activity) return null
  const picked = BOOKS.find((b) => b.id === pickedId)
  const shown = category === '추천' ? BOOKS : BOOKS.filter((b) => b.category === category)
  /** 순위 목록. 별점 높은 순 9권 — 정렬 기준을 화면에 밝힌다. */
  const ranked = [...shown].sort((a, b) => b.rating - a.rating).slice(0, 9)

  const pick = (id: string) => setPickedId(id === pickedId ? null : id)

  return (
    <div className="lib">
      <header className="lib-head">
        <h1 className="lib-logo">MIDIBOOKS</h1>
        <span className="lib-search" aria-hidden="true">
          <AppIcon name="mdi:magnify" size={18} />
          검색
        </span>
        <span className="lib-account" aria-hidden="true">
          로그인 / 회원가입
        </span>
      </header>

      <nav className="lib-tabs" aria-label="카테고리">
        {BOOK_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`lib-tab${category === c ? ' lib-tab-on' : ''}`}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </nav>

      {/* 배너. 화살표는 **진짜로 넘어간다** — 표시만 하는 화살표는 최악이다. */}
      <div className="lib-hero">
        <button
          type="button"
          className="lib-hero-nav lib-hero-prev"
          onClick={() => setSlide((s) => (s - 1 + BOOK_BANNERS.length) % BOOK_BANNERS.length)}
          aria-label="이전 배너"
        >
          <AppIcon name="mdi:chevron-left" size={22} />
        </button>
        {[0, 1, 2].map((offset) => {
          const b = BOOK_BANNERS[(slide + offset) % BOOK_BANNERS.length]
          return (
            <article
              key={`${b.id}-${offset}`}
              className={`lib-banner${offset === 0 ? ' lib-banner-main' : ''}`}
              style={{ background: b.gradient }}
            >
              <span className="lib-banner-tag">{b.tag}</span>
              <h2 className="lib-banner-title">{b.title}</h2>
              <p className="lib-banner-sub">{b.sub}</p>
            </article>
          )
        })}
        <button
          type="button"
          className="lib-hero-nav lib-hero-next"
          onClick={() => setSlide((s) => (s + 1) % BOOK_BANNERS.length)}
          aria-label="다음 배너"
        >
          <AppIcon name="mdi:chevron-right" size={22} />
        </button>
      </div>

      <ul className="lib-quick" aria-hidden="true">
        {QUICK.map((q) => (
          <li key={q.label} className="lib-quick-item">
            <span className="lib-quick-circle">
              <AppIcon name={q.icon} size={22} />
            </span>
            {q.label}
          </li>
        ))}
      </ul>

      {readTitle && (
        <p className="lib-receipt" role="status">
          「{readTitle}」을(를) 끝까지 읽었습니다. 서재에 기록이 남았습니다.
        </p>
      )}

      <section className="lib-sec">
        <h3 className="lib-sec-head">지금 많이 읽고 있는 작품</h3>
        <ol className="lib-ranks" role="radiogroup" aria-label="읽을 책 고르기">
          {ranked.map((book, i) => (
            <li key={book.id}>
              <BookRow book={book} rank={i + 1} on={book.id === pickedId} onPick={() => pick(book.id)} />
            </li>
          ))}
        </ol>
      </section>

      <section className="lib-sec">
        <h3 className="lib-sec-head">오늘, 미디북스의 발견</h3>
        <ul className="lib-shelf">
          {shown.slice(0, 6).map((book) => (
            <li key={book.id}>
              <BookTile book={book} on={book.id === pickedId} onPick={() => pick(book.id)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="lib-sec">
        <h3 className="lib-sec-head">이벤트</h3>
        <ul className="lib-events">
          {BOOK_EVENTS.map((e) => (
            <li key={e.id} className="lib-event" style={{ background: e.gradient }}>
              <span className="lib-banner-tag">{e.tag}</span>
              <strong>{e.title}</strong>
              <span>{e.sub}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="lib-sec">
        <h3 className="lib-sec-head">새로 나온 작품</h3>
        <ul className="lib-shelf">
          {[...shown]
            .reverse()
            .slice(0, 6)
            .map((book) => (
              <li key={book.id}>
                <BookTile book={book} on={book.id === pickedId} onPick={() => pick(book.id)} />
              </li>
            ))}
        </ul>
      </section>

      <ActivityCommit
        activity={activity}
        actionLabel="읽기"
        selection={picked ? `「${picked.title}」 · ${picked.author}` : undefined}
        selectionHint="읽을 책을 한 권 고르세요."
        onCommitted={() => {
          setReadTitle(picked?.title ?? null)
          setPickedId(null)
        }}
      />

      <footer className="lib-foot">
        <p className="lib-foot-logo">MIDIBOOKS</p>
        <p>고객센터 · 공지사항 · 제휴하기 · 회사 소개 · 이용약관 · 개인정보처리방침</p>
        <p>미디북스 서점의 상품 · 가격 · 배송 정보는 판매자가 등록합니다.</p>
      </footer>
    </div>
  )
}

/** 표지. 이미지가 없으므로 그라데이션 판 위에 제목을 앉힌다. */
function Cover({ book }: { book: Book }) {
  return (
    <span className="lib-cover" style={{ background: book.cover }}>
      <span className="lib-cover-title">{book.title}</span>
      {book.badge && <span className="lib-badge">{book.badge}</span>}
    </span>
  )
}

function Stars({ book }: { book: Book }) {
  return (
    <span className="lib-stars">
      <AppIcon name="mdi:star" size={12} />
      {book.rating.toFixed(1)}
      <span className="lib-stars-n">({book.ratings.toLocaleString()})</span>
    </span>
  )
}

/** 순위 줄. 번호 + 표지 + 제목/저자/별점. */
function BookRow({
  book,
  rank,
  on,
  onPick,
}: {
  book: Book
  rank: number
  on: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      className={`lib-row${on ? ' lib-row-on' : ''}`}
      onClick={onPick}
    >
      <span className="lib-rank">{rank}</span>
      <Cover book={book} />
      <span className="lib-row-text">
        <span className="lib-title">{book.title}</span>
        <span className="lib-meta">{book.author}</span>
        <Stars book={book} />
      </span>
      {/* 고른 상태를 색만으로 알리지 않는다(ux `color-not-only`). */}
      {on && <span className="lib-mark">선택함</span>}
    </button>
  )
}

/** 표지 줄의 한 칸. */
function BookTile({ book, on, onPick }: { book: Book; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className={`lib-tile${on ? ' lib-tile-on' : ''}`}
      aria-pressed={on}
      title={book.blurb}
      onClick={onPick}
    >
      <Cover book={book} />
      <span className="lib-title">{book.title}</span>
      <span className="lib-meta">{book.author}</span>
      <Stars book={book} />
    </button>
  )
}
