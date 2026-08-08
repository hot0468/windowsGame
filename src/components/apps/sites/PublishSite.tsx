import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { FEATURE_BOOKS, SERIALS, WRITERS, WRITING_PROMPTS } from '../../../data/media'
import { AppIcon } from '../../../icons/AppIcon'
import type { Site } from '../../../data/sites'
import { ActivityConfirm } from '../ActivityConfirm'
import './PublishSite.css'

/**
 * 아점 — 창작자 발행 플랫폼. 확정 버튼이 `writing`(글쓰기) 활동을 실행한다.
 *
 * 다른 두 사이트가 **남이 만든 것을 고르는** 곳이라면 여기는 **플레이어 자신의 자리**다.
 * 그래서 버튼도 소비가 아니라 [발행하기]다.
 *
 * ⚠️ **본문 입력창은 없다.** 실제로 글을 받으면 그 글이 게임 어디에도 쓰이지 않아
 * 순수한 장식이 되고(포털 검색창과 같은 문제), 무엇보다 "확정 행동만 턴을 쓴다"는
 * 규칙 위에서 입력은 아무 값도 만들지 않는다. 고르는 것은 **무엇에 대해 쓸지**까지다.
 *
 * ## 구조 (레퍼런스: 실제 창작 플랫폼 홈)
 * 프로모션 띠 → 헤더 → 히어로 카피 → 대표작 캐러셀 → **KEYWORD 격자** →
 * 요일별 연재 → 작가 소개 → 배너.
 *
 * ⚠️ **키워드 격자가 곧 글감 고르기다.** 레퍼런스의 키워드 판을 장식으로 베끼는 대신
 * 게임의 기능을 그 자리에 앉혔다 — 같은 자리에 같은 모양인데 누르면 실제로 동작한다.
 * 캐러셀·요일 탭도 실제로 넘어가고, 로그인·검색 줄만 표시다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function PublishSite({ site }: { site: Site }) {
  const activity = site.activityId ? findActivity(site.activityId) : undefined
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 발행한 글의 제목. */
  const [published, setPublished] = useState<string | null>(null)
  const [slide, setSlide] = useState(0)
  /** 보고 있는 연재 요일. 처음에는 수요일(레퍼런스와 같은 가운데 탭). */
  const [weekday, setWeekday] = useState(3)
  const [promo, setPromo] = useState(true)

  if (!activity) return null
  const picked = WRITING_PROMPTS.find((p) => p.id === pickedId)
  const book = FEATURE_BOOKS[slide]
  const next = FEATURE_BOOKS[(slide + 1) % FEATURE_BOOKS.length]
  const serials = SERIALS.filter((s) => s.weekday === weekday)

  return (
    <div className="pub">
      {promo && (
        <div className="pub-promo">
          이제 더 쉽게, 내 취향에 맞는 <b>아점북</b>을 만나보세요!
          <button
            type="button"
            className="pub-promo-x"
            onClick={() => setPromo(false)}
            aria-label="안내 닫기"
          >
            <AppIcon name="mdi:close" size={14} />
          </button>
        </div>
      )}

      <header className="pub-head">
        <span className="pub-burger" aria-hidden="true">
          <AppIcon name="mdi:menu" size={20} />
        </span>
        <h1 className="pub-logo">아점</h1>
        <span className="pub-head-right" aria-hidden="true">
          <span className="pub-login">로그인</span>
          <AppIcon name="mdi:magnify" size={20} />
        </span>
      </header>

      <section className="pub-hero">
        <h2 className="pub-hero-title">
          글이 작품이 되는 공간, 아점
          <AppIcon name="fluent-color:edit-24" size={26} />
        </h2>
        <p className="pub-hero-line">아점에 담긴 아름다운 작품을 감상해 보세요.</p>
        <p className="pub-hero-line pub-hero-fade">그리고 다시 꺼내 보세요.</p>
        <p className="pub-hero-line pub-hero-fade2">서랍 속 간직하고 있는 글의 감상을.</p>
      </section>

      {/* 캐러셀. 화살표는 **진짜로 넘어간다** — 표시만 하는 화살표는 최악이다. */}
      <div className="pub-carousel">
        <article className="pub-feature" style={{ background: book.cover }}>
          <h3 className="pub-feature-title">{book.title}</h3>
          <p className="pub-feature-by">by {book.author}</p>
          <span className="pub-cover">
            <span className="pub-cover-title">{book.title}</span>
            <span className="pub-cover-mark">아점북</span>
          </span>
          <span className="pub-feature-foot">{book.caption}</span>
        </article>

        <article className="pub-feature pub-feature-side" style={{ background: next.cover }}>
          <span className="pub-badge">{next.badge}</span>
          <p className="pub-feature-cap">{next.caption}</p>
          <h3 className="pub-feature-title">{next.title}</h3>
          <p className="pub-feature-by">by {next.author}</p>
        </article>

        <button
          type="button"
          className="pub-arrow"
          onClick={() => setSlide((s) => (s + 1) % FEATURE_BOOKS.length)}
          aria-label="다음 작품"
        >
          <AppIcon name="mdi:arrow-right" size={22} />
        </button>
      </div>

      <div className="pub-dots" role="tablist" aria-label="대표 작품">
        {FEATURE_BOOKS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={i === slide}
            className={`pub-dot${i === slide ? ' pub-dot-on' : ''}`}
            onClick={() => setSlide(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {published && (
        <p className="pub-receipt" role="status">
          「{published}」 발행 완료. 첫 독자가 들어오기까지는 보통 하루쯤 걸립니다.
        </p>
      )}

      {/*
       * KEYWORD 격자 = 글감 고르기.
       * 레퍼런스의 키워드 판이 있던 자리에 게임의 기능을 앉혔다 —
       * 모양은 레퍼런스대로, 동작은 진짜로.
       */}
      <section className="pub-sec">
        <h3 className="pub-sec-head">AJEOM KEYWORD</h3>
        <p className="pub-sec-sub">오늘은 무엇에 대해 쓰시겠어요?</p>
        <div className="pub-keys" role="radiogroup" aria-label="글감 고르기">
          {WRITING_PROMPTS.map((prompt) => {
            const on = prompt.id === pickedId
            return (
              <button
                key={prompt.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`pub-key${on ? ' pub-key-on' : ''}`}
                title={prompt.hint}
                onClick={() => setPickedId(on ? null : prompt.id)}
              >
                {prompt.keyword}
              </button>
            )
          })}
        </div>
        {/* 고른 글감의 전문과 조언. 격자 칸은 짧은 이름만 담을 수 있다. */}
        {picked && (
          <p className="pub-picked">
            <b>{picked.theme}</b>
            <span>{picked.hint}</span>
          </p>
        )}
      </section>

      <section className="pub-sec">
        <h3 className="pub-sec-head pub-sec-head-sm">요일별 연재</h3>
        <p className="pub-sec-sub">아침마다 무언가를 연재하는 사람들</p>
        <div className="pub-days" role="tablist" aria-label="연재 요일">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={i === weekday}
              className={`pub-day${i === weekday ? ' pub-day-on' : ''}`}
              onClick={() => setWeekday(i)}
            >
              {w}
            </button>
          ))}
        </div>
        <ul className="pub-serials">
          {serials.map((s) => (
            <li key={s.id} className="pub-serial">
              <span className="pub-serial-text">
                <span className="pub-serial-cat">{s.category}</span>
                <span className="pub-serial-title">{s.title}</span>
                <span className="pub-serial-by">by {s.author}</span>
              </span>
              <span
                className="pub-serial-thumb"
                style={{ background: s.thumb }}
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="pub-sec">
        <h3 className="pub-sec-head">AJEOM WRITERS</h3>
        <p className="pub-sec-sub">아점의 추천 작가</p>
        <ul className="pub-writers">
          {WRITERS.map((w) => (
            <li key={w.id} className="pub-writer">
              <span className="pub-writer-face" style={{ background: w.color }} aria-hidden="true">
                {w.initial}
              </span>
              <span className="pub-writer-name">{w.name}</span>
              <span className="pub-writer-role">{w.role}</span>
              <span className="pub-writer-bio">{w.bio}</span>
              <span className="pub-writer-tags">
                {w.tags.map((t) => (
                  <span key={t} className="pub-tag">
                    {t}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="pub-banner" aria-hidden="true">
        <strong>아점 작가 지원하기</strong>
        <span>글이 되는 공간, 작가가 되는 시간</span>
      </div>

      {/* 키워드를 누르면 곧바로 확인창이 뜬다 — 확정 패널은 폐기됐다(설계자 지시). */}
      {picked && (
        <ActivityConfirm
          activity={activity}
          kicker="아점"
          title={`「${picked.theme}」으로 글을 발행하시겠습니까?`}
          actionLabel="발행하기"
          notes={[{ label: '글감', value: picked.hint }]}
          onCommitted={() => setPublished(picked.theme)}
          onClose={() => setPickedId(null)}
        />
      )}
    </div>
  )
}
