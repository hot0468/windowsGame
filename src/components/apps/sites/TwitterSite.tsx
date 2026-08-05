import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { TRENDING_TERMS } from '../../../data/news'
import {
  countLabel,
  findAccount,
  followersFrom,
  tweetAge,
  TWEETS,
} from '../../../data/tweets'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import type { Site } from '../../../data/sites'
import type { Tweet } from '../../../data/tweets'
import { ActivityCommit } from './ActivityCommit'
import './TwitterSite.css'

/**
 * 트위터 — 3열 타임라인. 레퍼런스는 실제 X 화면이고 **레퍼런스가 스펙이다**.
 *
 * ## 레퍼런스에서 덜어낸 것 (장식 금지)
 * 이 게임의 확정 규칙은 "가짜 브라우저가 **실제로 들고 있는 값**만 보여 준다"이다.
 * 그래서 X에 있지만 여기서 뺀 것들: **Premium 구독 박스**(구독 개념은 설계자 지시로
 * 이 게임에서 제외됐다) · **팔로우 추천 박스**(누를 데가 없다) · Grok·북마크·채팅 등
 * **갈 데 없는 네비 항목**. 남긴 것은 전부 실제로 동작한다.
 *
 * ## 남긴 것이 하는 일
 * - 좌 네비 **홈**: 탭과 검색을 초기 상태로 되돌린다(현재 위치 강조 = ux `nav-state-active`).
 * - 좌 하단 **계정 카드**: 이름은 `gameStore`의 플레이어 이름, 핸들은 거기서 파생.
 *   **팔로워 수는 `reputation`에서 환산한 읽기 전용 파생값이다** — 새 상태를 만들지 않는다.
 * - 중앙 **추천 / 팔로잉** 탭: `Tweet.following`으로 실제 목록을 가른다.
 * - 우 **검색창**: 본문·계정명·핸들로 타임라인을 거른다.
 * - 우 **트렌드**: `data/news.ts`의 `TRENDING_TERMS`를 그대로 쓰고, 누르면 그 단어로 거른다.
 *
 * ⚠️ **탐색은 무료다.** 탭 전환·검색·트렌드 클릭은 `gameStore`를 **읽기만** 한다.
 * 상태를 바꾸는 자리는 작성창 자리에 놓인 확정 패널(`ActivityCommit`) 하나뿐이고,
 * 실행 활동은 기존 `sns`다(`Site.activityId`로 가리키기만 한다 — 수치를 여기 적으면
 * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다).
 *
 * ⚠️ **답글·리트윗·좋아요·조회수는 버튼이 아니라 숫자다.** 누르면 아무 일도 없는 버튼은
 * 장식이므로 만들지 않았다 — 대신 트윗이 실제로 들고 있는 값을 그대로 적는다.
 */
export function TwitterSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const [tab, setTab] = useState<'recommend' | 'following'>('recommend')
  const [query, setQuery] = useState('')
  /** 방금 게시했는가. 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [posted, setPosted] = useState(false)

  if (!state) return null

  const activity = findActivity(site.activityId ?? '')
  const handle = handleOf(state.playerName)
  const followers = followersFrom(state.stats.reputation)

  const q = query.trim()
  const shown = TWEETS.filter((t) => (tab === 'following' ? t.following : true)).filter((t) =>
    q ? matches(t, q) : true,
  )

  const goHome = () => {
    setTab('recommend')
    setQuery('')
  }

  return (
    <div className="twt">
      <div className="tw-grid">
        {/* ── 좌: 세로 네비게이션 ───────────────────────────── */}
        <nav className="tw-nav" aria-label="트위터 메뉴">
          <span className="tw-logo">
            <AppIcon name={site.icon} size={30} />
          </span>

          {/* 갈 데가 하나뿐이라 항목도 하나다. 현재 위치를 표시한다. */}
          <button type="button" className="tw-nav-item tw-nav-on" aria-current="page" onClick={goHome}>
            <AppIcon name="mdi:home-outline" size={24} />
            <span>홈</span>
          </button>

          <div className="tw-me">
            <span className="tw-avatar tw-avatar-me" aria-hidden="true">
              {state.playerName.slice(0, 1)}
            </span>
            <span className="tw-me-text">
              <span className="tw-me-name">{state.playerName}</span>
              <span className="tw-me-handle">@{handle}</span>
            </span>
          </div>
          {/* 평판에서 뽑은 파생값이다(읽기 전용). 무엇에서 나온 숫자인지 함께 적는다. */}
          <p className="tw-me-stats">
            <b>{countLabel(followers)}</b> 팔로워
            <span className="tw-me-note">평판 {state.stats.reputation}에서 환산</span>
          </p>
        </nav>

        {/* ── 중앙: 탭 + 작성(확정) + 타임라인 ───────────────── */}
        <main className="tw-main">
          <div className="tw-tabs" role="tablist" aria-label="타임라인 종류">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'recommend'}
              className={`tw-tab${tab === 'recommend' ? ' tw-tab-on' : ''}`}
              onClick={() => setTab('recommend')}
            >
              추천
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'following'}
              className={`tw-tab${tab === 'following' ? ' tw-tab-on' : ''}`}
              onClick={() => setTab('following')}
            >
              팔로잉
            </button>
          </div>

          {/*
            ⚠️ 레퍼런스의 작성창("무슨 일이 일어나고 있나요?") 자리다.
            **별도 작성 UI를 만들지 않는다** — 확정 버튼이 둘로 보이면 안 되고,
            이 패널이 지는 약속 넷(증감 미리보기·번아웃·조건 미달·오후 생활비)을
            따로 만들면 반드시 하나를 빠뜨린다.
          */}
          {activity && (
            <div className="tw-compose">
              <ActivityCommit
                activity={activity}
                actionLabel="게시하기"
                selection="피드를 올리고 남의 피드를 내린다"
                selectionHint="게시하면 1턴이 지납니다."
                onCommitted={() => setPosted(true)}
              />
              {posted && (
                <p className="tw-posted" role="status">
                  게시했습니다. 타임라인에 남은 사람들의 하루는 계속 흐릅니다.
                </p>
              )}
            </div>
          )}

          <ul className="tw-feed">
            {shown.map((t, i) => (
              <li key={t.id}>
                <TweetRow tweet={t} index={i} />
              </li>
            ))}
          </ul>

          {/* ux `Search / No Results`: 빈 화면 대신 무엇을 하면 되는지 적는다. */}
          {shown.length === 0 && (
            <p className="tw-empty">
              {q ? `"${q}"에 해당하는 글이 없습니다. ` : '팔로우한 계정의 글이 없습니다. '}
              <button type="button" className="tw-link" onClick={goHome}>
                추천 타임라인 보기
              </button>
            </p>
          )}
        </main>

        {/* ── 우: 검색 + 트렌드 ─────────────────────────────── */}
        <aside className="tw-side" aria-label="검색과 트렌드">
          <form className="tw-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <AppIcon name="mdi:magnify" size={18} />
            <input
              className="tw-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색"
              aria-label="타임라인 검색"
              autoComplete="off"
            />
            {q && (
              <button
                type="button"
                className="tw-search-clear"
                onClick={() => setQuery('')}
                aria-label="검색어 지우기"
                title="검색어 지우기"
              >
                <AppIcon name="mdi:close-circle-outline" size={17} />
              </button>
            )}
          </form>

          <section className="tw-trends">
            <h2 className="tw-trends-head">무슨 일이 일어나고 있나요?</h2>
            <ul className="tw-trend-list">
              {/* ⚠️ 트렌드는 여기서 새로 만들지 않는다 — `TRENDING_TERMS` 재사용이다. */}
              {TRENDING_TERMS.map((term, i) => (
                <li key={term.label}>
                  <button
                    type="button"
                    className={`tw-trend${term.label === q ? ' tw-trend-on' : ''}`}
                    aria-pressed={term.label === q}
                    onClick={() => setQuery(term.label === q ? '' : term.label)}
                  >
                    <span className="tw-trend-rank">실시간 트렌드 {i + 1}위</span>
                    <span className="tw-trend-label">{term.label}</span>
                    <span className="tw-trend-count">
                      {TWEETS.filter((t) => matches(t, term.label)).length}건의 게시물
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <p className="tw-foot">{site.url}</p>
        </aside>
      </div>
    </div>
  )
}

/** 트윗 한 줄. 아바타 · 이름 · 인증 뱃지 · 핸들 · 시각 · 본문 · 이미지 · 숫자 줄. */
function TweetRow({ tweet, index }: { tweet: Tweet; index: number }) {
  const a = findAccount(tweet.handle)
  return (
    <article className="tw-tweet">
      <span className="tw-avatar" style={{ background: a?.gradient }} aria-hidden="true">
        {a?.initial}
      </span>
      <div className="tw-tweet-body">
        <p className="tw-tweet-head">
          <b className="tw-tweet-name">{a?.name ?? tweet.handle}</b>
          {a?.verified && (
            /* 인증 뱃지. 채워진 글리프인 것은 뱃지가 원래 도형이기 때문이다
               (외곽선 변형은 이 크기에서 뱃지로 읽히지 않는다).
               색만으로 알리지 않는다 — 읽어 주는 글자를 함께 둔다. */
            <span className="tw-verified" title="인증된 계정">
              <AppIcon name="mdi:check-decagram" size={15} />
              <span className="tw-sr">인증된 계정</span>
            </span>
          )}
          <span className="tw-tweet-handle">@{tweet.handle}</span>
          <span className="tw-tweet-dot" aria-hidden="true">
            ·
          </span>
          <span className="tw-tweet-age">{tweetAge(index)}</span>
        </p>

        <p className="tw-tweet-text">{tweet.body}</p>

        {tweet.image && (
          /* 이미지 파일을 쓰지 않는다 — 그라데이션 + 글자다(썸네일·배너와 같은 규칙). */
          <span className="tw-media" style={{ background: tweet.image.gradient }}>
            {tweet.image.caption}
          </span>
        )}

        {/*
          ⚠️ **버튼이 아니라 숫자다.** 눌러도 아무 일이 없는 버튼은 장식이므로 만들지
          않았다. 아이콘만으로는 뜻이 안 서므로 각 숫자에 이름을 붙인다(ux `aria-labels`).
        */}
        <p className="tw-stats">
          <span className="tw-stat">
            <AppIcon name="mdi:comment-outline" size={15} />
            <span className="tw-sr">답글</span>
            {countLabel(tweet.replies)}
          </span>
          <span className="tw-stat">
            <AppIcon name="mdi:repeat-variant" size={16} />
            <span className="tw-sr">리트윗</span>
            {countLabel(tweet.retweets)}
          </span>
          <span className="tw-stat">
            <AppIcon name="mdi:heart-outline" size={15} />
            <span className="tw-sr">좋아요</span>
            {countLabel(tweet.likes)}
          </span>
          <span className="tw-stat">
            <AppIcon name="mdi:chart-bar" size={15} />
            <span className="tw-sr">조회수</span>
            {tweet.views}
          </span>
        </p>
      </div>
    </article>
  )
}

/** 검색·트렌드가 공유하는 판정. 본문·계정명·핸들 어디든 걸리면 남긴다. */
function matches(t: Tweet, q: string): boolean {
  const a = findAccount(t.handle)
  const hay = `${t.body} ${a?.name ?? ''} ${t.handle}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

/**
 * 플레이어 이름에서 핸들을 만든다. 한글 이름은 로마자로 옮길 방법이 없으므로
 * 이름을 그대로 두고 접미사만 붙인다 — 실제 X도 표시 이름과 핸들이 다르다.
 */
function handleOf(name: string): string {
  return `${name.replace(/\s+/g, '')}_daily`
}
