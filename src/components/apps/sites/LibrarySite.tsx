import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { BOOKS } from '../../../data/media'
import type { Site } from '../../../data/sites'
import { ActivityCommit } from './ActivityCommit'
import './LibrarySite.css'

/**
 * 미디북스 — 전자책 구독 사이트. 확정 버튼이 `reading`(독서) 활동을 실행한다.
 *
 * **둘러보기는 무료다.** 목록을 넘기고 책을 고르는 동안 게임 상태는 읽지도 쓰지도 않는다 —
 * 스탯을 움직이는 코드는 `ActivityCommit` 안의 확정 버튼 하나뿐이다.
 *
 * 시각 언어: style `E-Ink / Paper`("high contrast black on off-white, no gradients,
 * minimal UI chrome, reading-focused"). 흰 종이 위 잉크 한 색, 상자 대신 헤어라인 목록,
 * 표지도 이미지가 아니라 제목을 앉힌 잉크 판이다 — 시집이(어두운 극장)·아점(회색 판 위
 * 둥근 카드)과 값·구조로 갈린다. 색을 새로 만들지 않고 --nv-* 안에서 해결한다.
 */
export function LibrarySite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 읽은 책. 확정 후 화면이 그대로라 무슨 일이 일어났는지 글자로 남긴다. */
  const [readTitle, setReadTitle] = useState<string | null>(null)

  if (!activity) return null
  const picked = BOOKS.find((b) => b.id === pickedId)

  return (
    <div className="lib">
      <header className="lib-head">
        <h1 className="lib-logo">미디북스</h1>
        <p className="lib-sub">구독하면 다 읽을 수 있습니다. 읽을 시간이 없을 뿐입니다.</p>
      </header>

      {readTitle && (
        <p className="lib-receipt" role="status">
          「{readTitle}」을(를) 끝까지 읽었습니다. 서재에 기록이 남았습니다.
        </p>
      )}

      {/* 라디오 묶음이다 — 한 권만 고를 수 있다는 사실을 역할로도 알린다. */}
      <ul className="lib-list" role="radiogroup" aria-label="읽을 책 고르기">
        {BOOKS.map((book) => {
          const on = book.id === pickedId
          return (
            <li key={book.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                className={`lib-item${on ? ' lib-item-on' : ''}`}
                onClick={() => setPickedId(on ? null : book.id)}
              >
                {/* 표지 이미지는 없다. 오프라인 규칙(아이콘·배너와 같다)이라 제목을 앉힌
                    잉크 판으로 대신한다 — 크기가 변해도 또렷하고 용량이 0이다. */}
                <span className="lib-cover" aria-hidden="true">
                  {book.title.slice(0, 2)}
                </span>
                <span className="lib-info">
                  <span className="lib-title">{book.title}</span>
                  <span className="lib-meta">
                    {book.author} · {book.genre}
                  </span>
                  <span className="lib-blurb">{book.blurb}</span>
                </span>
                {/* 고른 상태를 색만으로 알리지 않는다(ux `color-not-only`). */}
                <span className="lib-mark">{on ? '선택함' : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>

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
    </div>
  )
}
