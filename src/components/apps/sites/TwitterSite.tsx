import { useState } from 'react'
import type { ReactNode } from 'react'
import { findActivity } from '../../../data/activities'
import {
  PAYOUT_INTERVAL_DAYS,
  PLUS_MULTIPLIER,
  WEEKLY_INCOME_CAP,
  WON_PER_FOLLOWER,
  artTitle,
} from '../../../data/artworks'
import { TRENDING_TERMS } from '../../../data/news'
import { findSubscription } from '../../../data/subscriptions'
import {
  TWEETS,
  TWEET_MAX_LENGTH,
  countLabel,
  findAccount,
  postAge,
  tweetAge,
} from '../../../data/tweets'
import { artGrade, findArtwork } from '../../../systems/artwork'
import { albumPhotos, findPhoto } from '../../../systems/delivery'
import { streamReviews } from '../../../systems/channel'
import { seenRankEvent } from '../../../systems/rankEvents'
import {
  daysToPayout,
  followedHandles,
  followerGain,
  hasReacted,
  myTweets,
  noticeText,
  repliesTo,
  postableArtworks,
  totalFollowers,
  tweetNotices,
  unreadNotices,
  weeklyIncome,
  hasPlus,
  PLUS_SUBSCRIPTION_ID,
} from '../../../systems/twitter'
import type { Reply, TweetNotice } from '../../../systems/twitter'
import { AppIcon } from '../../../icons/AppIcon'
import { Cover } from './Cover'
import { useGameStore } from '../../../store/gameStore'
import type { Site } from '../../../data/sites'
import type { Tweet } from '../../../data/tweets'
import type { MyPost } from '../../../types/game'
import { ActivityConfirm } from '../ActivityConfirm'
import './TwitterSite.css'

/**
 * 트위터 — 3열 타임라인. 레퍼런스는 실제 X 화면이고 **레퍼런스가 스펙이다**.
 *
 * ## 레퍼런스에서 덜어낸 것 (장식 금지)
 * 이 게임의 확정 규칙은 "가짜 브라우저가 **실제로 들고 있는 값**만 보여 준다"이다.
 * 그래서 X에 있지만 여기서 뺀 것들: **Premium 구독 박스**(⚠️ 구독 자체는 2026-08-08
 * 어도비로 생겼지만 그건 **여는 것이 분명한** 구독이다 — 여기 구독은 게임에서 아무것도
 * 열지 않아 여전히 장식이다) · **팔로우 추천 박스**(누를 데가 없다) · Grok·북마크·채팅 등
 * **갈 데 없는 네비 항목**. 남긴 것은 전부 실제로 동작한다.
 *
 * ## 남긴 것이 하는 일
 * - 좌 네비 **홈**: 탭과 검색을 초기 상태로 되돌린다(현재 위치 강조 = ux `nav-state-active`).
 * - 좌 하단 **계정 카드**: 이름은 `gameStore`의 플레이어 이름, 핸들은 거기서 파생.
 *   **팔로워 수는 `reputation`에서 환산한 읽기 전용 파생값이다** — 새 상태를 만들지 않는다.
 * - 중앙 **추천 / 팔로잉** 탭: `Tweet.following`으로 실제 목록을 가른다.
 * - 우 **검색창**: 본문·계정명·핸들로 타임라인을 거른다. ⚠️ **너튜브 채널 이름을 검색하면
 *   내 방송에 대한 시청자 반응이 함께 걸린다**(`systems/channel.ts`의 `streamReviews`) —
 *   켠 적이 있어야 존재하고, 개수는 켠 횟수·어조는 평판 등급이 정하는 **파생값이다**.
 * - 우 **트렌드**: `data/news.ts`의 `TRENDING_TERMS`를 그대로 쓰고, 누르면 그 단어로 거른다.
 *
 * ⚠️ **작성창에 입력칸이 생겼다**(2026-08-22 설계자 지시). 원래는 버튼 하나였다 —
 * 받은 글이 게임 어디에도 안 쓰여 장식이었기 때문이다. 이제 **내 글이 타임라인 맨 위에
 * 그대로 남으므로**(`myTweets`) 쓰이는 값이 됐다. 사진은 **사진첩**(탐색기의 그 폴더와
 * 같은 목록 — `albumPhotos`)에서 고르고, 겪은 사진만 뜬다.
 *
 * ⚠️ **탐색은 무료다.** 탭 전환·검색·트렌드 클릭은 `gameStore`를 **읽기만** 한다.
 * 상태를 바꾸는 자리는 작성창을 눌렀을 때 뜨는 확인창(`ActivityConfirm`) 하나뿐이고,
 * 실행 활동은 기존 `sns`다(`Site.activityId`로 가리키기만 한다 — 수치를 여기 적으면
 * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다).
 *
 * ⚠️ **리트윗·좋아요·팔로우는 진짜 버튼이 됐다**(2026-08-22). 누르면 `GameState.twitter`의
 * 목록이 바뀌고 그 자리의 숫자가 실제로 1 오른다 — 죽은 컨트롤이 아니다. **답글·조회수는
 * 여전히 숫자다**(답글을 쓰면 그 글이 게임 어디에도 안 쓰이고, 조회수는 내가 못 만든다).
 * ⚠️ **셋 다 턴도 돈도 안 쓴다**("탐색은 무료" — 즐겨찾기·구독과 같은 부류).
 *
 * ⚠️ **[알림] 탭은 저장된 목록이 아니라 파생값이다**(`tweetNotices`) — 내가 올린 그림의
 * 등급이 팔로워·리트윗·좋아요를 정하므로 알림도 거기서 나온다. 세이브에 남는 것은
 * "어디까지 봤나"(`seenNotices`) 하나뿐이다.
 */
export function TwitterSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const [tab, setTab] = useState<'recommend' | 'following'>('recommend')
  /** 가운데 열이 무엇을 그리나. 실제 X처럼 좌 네비가 화면을 가른다. */
  const [view, setView] = useState<'home' | 'notices'>('home')
  const [query, setQuery] = useState('')
  /** 방금 게시했는가. 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [posted, setPosted] = useState(false)
  /** 작성창의 [게시하기]를 눌렀는가. 확인창은 그때 뜬다(1턴을 쓰기 때문이다). */
  const [composing, setComposing] = useState(false)
  /** 쓰고 있는 본문. 확정될 때 `postTweet`으로 넘어간다. */
  const [draft, setDraft] = useState('')
  /** 붙인 사진(`GameEvent.id`). 사진첩에서 고른다. */
  const [photo, setPhoto] = useState<string | null>(null)
  /** 사진첩을 펼쳤는가. 늘 펼쳐 두면 작성창이 목록에 묻힌다. */
  const [album, setAlbum] = useState(false)
  /** 열어 둔 스레드의 트윗 id. null이면 타임라인이다(실제 X의 게시물 상세와 같은 자리). */
  const [thread, setThread] = useState<string | null>(null)
  /** 올리려고 고른 그림 id. 그림 업로드는 **고를 것이 있는** 유일한 경로다. */
  const [pickedArt, setPickedArt] = useState<string | null>(null)
  const postArtwork = useGameStore((s) => s.postArtwork)
  const seeNotices = useGameStore((s) => s.seeTwitterNotices)
  const postTweet = useGameStore((s) => s.postTweet)
  const subscribeTo = useGameStore((s) => s.subscribeTo)
  const unsubscribeFrom = useGameStore((s) => s.unsubscribeFrom)

  if (!state) return null

  const activity = findActivity(site.activityId ?? '')
  const handle = handleOf(state.playerName)
  /* ⚠️ **평판 파생값이 아니라 합계다**(2026-08-08). 그림 업로드로 번 몫이 붙으므로
     `followersFrom` 하나로는 더 이상 참이 아니다 — 합치는 곳은 `totalFollowers` 하나다. */
  const followers = totalFollowers(state)
  const postable = postableArtworks(state)
  const picked = pickedArt ? postable.find((a) => a.id === pickedArt) : undefined

  const q = query.trim()
  /* ⚠️ **검색할 때만 시청자 반응을 후보에 넣는다**(2026-08-08). 늘 깔면 남의 타임라인이
     내 방송 이야기로 도배되고, 반응 문장에 채널 이름이 들어 있으므로 걸러 내는 일은
     기존 `matches` 하나가 그대로 한다 — 두 번째 판정을 만들지 않는다. */
  const pool = q ? [...streamReviews(state), ...TWEETS] : TWEETS
  /* ⚠️ **탭이 보는 것은 데이터의 `Tweet.following` 플래그가 아니라 내 팔로우 목록이다.**
     플래그는 이제 처음 상태의 씨앗일 뿐이고, 판정은 `followedHandles` 하나가 한다. */
  const followed = followedHandles(state)
  const shown = pool
    .filter((t) => (tab === 'following' ? followed.includes(t.handle) : true))
    .filter((t) => (q ? matches(t, q) : true))

  const notices = tweetNotices(state)
  const unread = unreadNotices(state)
  /* ⚠️ **내 글은 탭과 무관하게 맨 위다** — 실제 X와 같이 내가 올린 것은 늘 보인다.
     검색만은 남의 글과 같은 판정(`matches`)을 그대로 탄다. */
  const photos = albumPhotos(state)
  const mine = myTweets(state, handle).filter(({ tweet }) => (q ? matches(tweet, q) : true))
  const canPost = draft.trim().length > 0 || !!photo
  /* 스레드는 내 글에도 남의 글에도 열린다 — 한 곳에서 찾는다(못 찾으면 타임라인으로 돌아간다). */
  const threadTweet = thread
    ? (mine.find(({ tweet }) => tweet.id === thread)?.tweet ?? pool.find((t) => t.id === thread))
    : undefined
  const replies = threadTweet ? repliesTo(state, threadTweet) : []
  /* 스레드가 내 글이면 시각과 첨부를 원본에서 가져온다 — 타임라인과 같은 값이어야 한다. */
  const minePosts = new Map(mine.map(({ tweet, post }) => [tweet.id, post]))
  const mineAges = new Map(mine.map(({ tweet, post }) => [tweet.id, postAge(post.day, state.day)]))
  /** 스레드를 연다/닫는다. **쓰던 글은 지운다** — 트윗으로 쓴 글이 답글로 새어 나가면 안 된다. */
  const openThread = (id: string | null) => {
    setThread(id)
    setDraft('')
    setPhoto(null)
    setAlbum(false)
  }

  const goHome = () => {
    setView('home')
    setTab('recommend')
    setQuery('')
    openThread(null)
  }

  /* ⚠️ 구독 항목·요금은 데이터가 갖는다(`data/subscriptions.ts`) — 화면에 금액을 적으면
     청구와 표시가 갈린다. `!`를 쓰는 것은 이 사이트가 그 id를 전제로 만들어졌기 때문이고,
     id가 사라지면 테스트가 먼저 터진다(`subscription.test.ts`). */
  const plus = findSubscription(PLUS_SUBSCRIPTION_ID)!
  const onPlus = hasPlus(state)
  const canAffordPlus = state.stats.money - plus.monthlyFee > 0

  return (
    <div className="twt">
      <div className="tw-grid">
        {/* ── 좌: 세로 네비게이션 ───────────────────────────── */}
        <nav className="tw-nav" aria-label="트위터 메뉴">
          <span className="tw-logo">
            <AppIcon name={site.icon} size={30} />
          </span>

          <button
            type="button"
            className={`tw-nav-item${view === 'home' ? ' tw-nav-on' : ''}`}
            aria-current={view === 'home' ? 'page' : undefined}
            onClick={goHome}
          >
            <AppIcon name="mdi:home-outline" size={24} />
            <span>홈</span>
          </button>

          {/* ⚠️ 안 읽은 수는 **글자로도 읽힌다**(ux `color-not-only`) — 점만 찍으면
              스크린 리더에 아무것도 안 알린다. */}
          <button
            type="button"
            className={`tw-nav-item${view === 'notices' ? ' tw-nav-on' : ''}`}
            aria-current={view === 'notices' ? 'page' : undefined}
            onClick={() => {
              setView('notices')
              seeNotices()
            }}
          >
            <AppIcon name="mdi:bell-outline" size={24} />
            <span>알림</span>
            {unread > 0 && (
              <span className="tw-badge">
                {unread > 99 ? '99+' : unread}
                <span className="tw-sr">개의 안 읽은 알림</span>
              </span>
            )}
          </button>

          <div className="tw-me">
            <span className="tw-avatar tw-avatar-me" aria-hidden="true">
              {state.playerName.slice(0, 1)}
            </span>
            <span className="tw-me-text">
              <span className="tw-me-name">
                {state.playerName}
                {/* ⚠️ **평판 A에서 붙는다**(랭크 이벤트 `verified-badge`). 문턱을 여기서
                    다시 묻지 않고 **겪은 기록**을 본다 — 등급이 나중에 내려가도 뱃지는
                    남는 것이 맞고(한 번 알려진 것은 되돌아가지 않는다), 그 규칙은
                    `markRankEvent` 하나가 이미 진다. 부품은 아래 인증 계정과 같은 것이다. */}
                {seenRankEvent(state, 'verified-badge') && (
                  <span className="tw-verified" title="인증된 계정">
                    <AppIcon name="mdi:check-decagram" size={14} />
                    <span className="tw-sr">인증된 계정</span>
                  </span>
                )}
              </span>
              <span className="tw-me-handle">@{handle}</span>
            </span>
          </div>
          {/* 무엇에서 나온 숫자인지 함께 적는다 — 두 출처가 합쳐진 값이라 더 그렇다. */}
          <p className="tw-me-stats">
            <b>{countLabel(followers)}</b> 팔로워
            <span className="tw-me-note">
              평판 {state.stats.reputation} 환산
              {state.twitter && state.twitter.gained > 0
                ? ` + 그림 ${countLabel(state.twitter.gained)}`
                : ''}
            </span>
          </p>
          {/* ⚠️ 올린 적이 있어야 그린다 — 정산 커서(`paidDay`)가 그때 처음 생긴다.
              장식이 아니라 **실제로 그날 들어오는 금액**이다. */}
          {state.twitter && (
            <p className="tw-me-stats">
              <b>{weeklyIncome(state).toLocaleString('ko-KR')}원</b> 주간 수익
              <span className="tw-me-note">{daysToPayout(state)}일 뒤 정산</span>
            </p>
          )}

          {/*
           * 유료 구독. **왼쪽 열의 수익 줄 바로 아래인 것이 규칙이다** — 이 구독이 파는
           * 것은 잠금이 아니라 그 숫자의 배율이라, 바뀌는 값 옆에 있어야 무엇을 사는지
           * 읽힌다(어도비는 여는 것이 있어 자기 사이트에 카드로 서지만 이쪽은 아니다).
           *
           * ⚠️ **판정은 스토어가 하고 화면은 사유만 파생한다**(`AdobeSite`와 같은 규칙).
           * ⚠️ **천장을 함께 적는다.** 2배라고만 적으면 상한에 닿은 뒤 "구독했는데 안 늘었다"가
           * 되고, 그것은 화면이 거짓을 말한 것이 된다(`WEEKLY_INCOME_CAP`).
           */}
          <div className="tw-plus">
            <p className="tw-plus-head">
              {plus.name}
              <span className="tw-plus-fee">
                월 {plus.monthlyFee.toLocaleString('ko-KR')}원
              </span>
            </p>
            <p className="tw-plus-desc">
              주간 정산금 {PLUS_MULTIPLIER}배. 주당{' '}
              {WEEKLY_INCOME_CAP.toLocaleString('ko-KR')}원까지입니다.
            </p>
            <button
              type="button"
              className={`tw-plus-btn${onPlus ? ' tw-plus-btn-on' : ''}`}
              onClick={() => (onPlus ? unsubscribeFrom(plus.id) : subscribeTo(plus.id))}
              disabled={!onPlus && !canAffordPlus}
              title={
                onPlus
                  ? '다음 정산부터 원래 금액으로 돌아갑니다'
                  : canAffordPlus
                    ? `가입하는 순간 첫 달치 ${plus.monthlyFee.toLocaleString('ko-KR')}원이 결제됩니다`
                    : `소지금이 ${plus.monthlyFee.toLocaleString('ko-KR')}원보다 많이 남아 있어야 합니다`
              }
            >
              {onPlus ? '구독 중 · 해지' : '구독하기'}
            </button>
          </div>
        </nav>

        {/* ── 중앙: 탭 + 작성(확정) + 타임라인 ───────────────── */}
        <main className="tw-main">
          {/* ⚠️ **한 열이 두 화면을 그린다** — 실제 X와 같이 좌 네비가 무엇을 볼지 정한다. */}
          {view === 'notices' && <NoticeList notices={notices} />}

          {view === 'home' && (
          <>
          {/* 스레드에서는 탭 대신 [뒤로]다 — 실제 X의 게시물 상세와 같은 자리. */}
          {thread && (
            <div className="tw-thread-head">
              <button type="button" className="tw-back" onClick={() => openThread(null)}>
                <AppIcon name="mdi:arrow-left" size={18} />
                뒤로
              </button>
              <b>게시물</b>
            </div>
          )}

          {!thread && (
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
          )}

          {/*
            스레드 — 원본 트윗 + 답글 쓰는 자리 + 달린 답글.
            ⚠️ **답글도 글이라 `sns` 1턴을 쓴다**(트윗과 같은 값·같은 확인창) — 공짜로
            두면 턴을 안 쓰고 글을 남기는 통로가 하나 생긴다.
          */}
          {thread && threadTweet && (
            <>
              <TweetRow
                tweet={threadTweet}
                age={
                  mineAges.get(threadTweet.id) ??
                  tweetAge(Math.max(0, pool.indexOf(threadTweet)))
                }
                me={mineAges.has(threadTweet.id) ? state.playerName : undefined}
                attachment={<Attachment post={minePosts.get(threadTweet.id)} />}
              />

              {activity && (
                <div className="tw-compose">
                  <span className="tw-avatar tw-avatar-me" aria-hidden="true">
                    {state.playerName.slice(0, 1)}
                  </span>
                  <div className="tw-compose-body">
                    {/* ⚠️ 답글에는 사진을 안 붙인다 — 사진첩은 내 하루의 기록이라
                        남의 글 밑에 붙일 자리가 아니다. */}
                    <textarea
                      className="tw-compose-input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={TWEET_MAX_LENGTH}
                      rows={2}
                      placeholder="답글 게시하기"
                      aria-label="답글 작성"
                    />
                    <div className="tw-compose-foot">
                      <span className="tw-compose-count">
                        {draft.length}/{TWEET_MAX_LENGTH}
                      </span>
                      <button
                        type="button"
                        className="tw-compose-btn"
                        disabled={!draft.trim()}
                        title={draft.trim() ? undefined : '쓴 글이 있어야 답글을 달 수 있습니다'}
                        onClick={() => setComposing(true)}
                      >
                        답글
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <ul className="tw-replies">
                {replies.map((r) => (
                  <li key={r.id}>
                    <ReplyRow reply={r} me={state.playerName} today={state.day} />
                  </li>
                ))}
              </ul>

              {replies.length === 0 && (
                <p className="tw-empty">아직 답글이 없습니다. 첫 답글을 달아 보세요.</p>
              )}
            </>
          )}

          {/*
            ⚠️ 레퍼런스의 작성창("무슨 일이 일어나고 있나요?") 자리다.
            **입력창은 만들지 않는다** — 받은 글이 게임 어디에도 쓰이지 않아 장식이 된다
            (아점의 본문 입력창을 뺀 것과 같은 이유). 누르면 확인창이 뜨는 자리일 뿐이다.
          */}
          {activity && !thread && (
            <div className="tw-compose">
              <span className="tw-avatar tw-avatar-me" aria-hidden="true">
                {state.playerName.slice(0, 1)}
              </span>
              <div className="tw-compose-body">
                {/* ⚠️ **받은 글은 타임라인에 그대로 남는다** — 안 그러면 이 칸은 장식이다. */}
                <textarea
                  className="tw-compose-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={TWEET_MAX_LENGTH}
                  rows={2}
                  placeholder="무슨 일이 일어나고 있나요?"
                  aria-label="트윗 작성"
                />

                {/* 붙인 사진. 뺄 수 있어야 고른 것이 되돌릴 수 있는 선택이 된다. */}
                {photo && (
                  <div className="tw-attach">
                    <PhotoCard id={photo} />
                    <button
                      type="button"
                      className="tw-attach-off"
                      onClick={() => setPhoto(null)}
                      aria-label="사진 빼기"
                      title="사진 빼기"
                    >
                      <AppIcon name="mdi:close" size={16} />
                    </button>
                  </div>
                )}

                {/* ⚠️ 겪은 사진이 없으면 **줄 자체를 안 그린다** — 빈 목록은 장식이다. */}
                {album && photos.length > 0 && (
                  <ul className="tw-album">
                    {photos.map(({ event, day }) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          className={`tw-album-item${photo === event.id ? ' tw-album-on' : ''}`}
                          aria-pressed={photo === event.id}
                          onClick={() => {
                            setPhoto(photo === event.id ? null : event.id)
                            setAlbum(false)
                          }}
                          title={`${day}일차 · ${event.desc}`}
                        >
                          <AppIcon name={event.icon} size={26} />
                          <span className="tw-album-name">{event.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="tw-compose-foot">
                  {photos.length > 0 && (
                    <button
                      type="button"
                      className={`tw-compose-tool${album ? ' tw-compose-tool-on' : ''}`}
                      aria-pressed={album}
                      onClick={() => setAlbum(!album)}
                    >
                      <AppIcon name="mdi:image-outline" size={18} />
                      사진첩
                    </button>
                  )}
                  <span className="tw-compose-count">
                    {draft.length}/{TWEET_MAX_LENGTH}
                  </span>
                  {/* ⚠️ 막힌 버튼에는 왜 막혔는지 함께 적는다(ux `error-clarity`). */}
                  <button
                    type="button"
                    className="tw-compose-btn"
                    disabled={!canPost}
                    title={canPost ? undefined : '쓴 글이나 붙인 사진이 있어야 올릴 수 있습니다'}
                    onClick={() => setComposing(true)}
                  >
                    게시하기
                  </button>
                </div>
                {posted && (
                  <p className="tw-posted" role="status">
                    게시했습니다. 타임라인에 남은 사람들의 하루는 계속 흐릅니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/*
            ⚠️ **그림 업로드 자리.** 여기가 이 사이트에서 유일하게 "고를 것이 있는" 곳이다
            (원래 트위터는 고를 것이 없는 활동 사이트였다 — 그 규칙이 그림으로 깨졌다).
            올릴 그림이 없으면 **줄 자체를 안 그린다** — 빈 목록은 장식이다.
            등급을 칩으로 적는 이유는 ux `color-not-only`: 팔로워가 얼마나 느는지는
            등급이 정하는데, 그림 자체는 그라데이션이라 잘 그렸는지 눈으로는 알 수 없다.
          */}
          {activity && !thread && postable.length > 0 && (
            <div className="tw-arts">
              <p className="tw-arts-head">올릴 그림 고르기</p>
              <ul className="tw-art-list">
                {postable.map((work) => (
                  <li key={work.id}>
                    <button
                      type="button"
                      className="tw-art"
                      onClick={() => setPickedArt(work.id)}
                      title={`${artTitle(work.serial)} · ${work.day}일차에 그렸다`}
                    >
                      <span className="tw-art-thumb" aria-hidden="true">
                        {artGrade(work)}
                      </span>
                      <span className="tw-art-name">{artTitle(work.serial)}</span>
                      <span className="tw-art-gain">
                        {followerGain(work) > 0
                          ? `팔로워 +${countLabel(followerGain(work))}`
                          : '반응 없음'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activity && picked && (
            <ActivityConfirm
              activity={activity}
              kicker="트위터"
              title={`「${artTitle(picked.serial)}」을(를) 올리시겠습니까?`}
              actionLabel="올리기"
              /* ⚠️ 등급과 팔로워 증가분은 활동 증감에 안 잡힌다 — 그래서 `notes`다
                 (수강료·응시료와 같은 규칙: 사이트가 따로 그리면 그 창만 거짓을 말한다). */
              notes={[
                { label: '그림 등급', value: `${artGrade(picked)}등급` },
                {
                  label: '늘어나는 팔로워',
                  value:
                    followerGain(picked) > 0
                      ? `+${followerGain(picked).toLocaleString('ko-KR')}명`
                      : '없음 — 등급이 낮아 아무도 보지 않는다',
                },
                {
                  label: '주간 정산',
                  value: `팔로워 1명당 ${WON_PER_FOLLOWER}원씩 ${PAYOUT_INTERVAL_DAYS}일마다`,
                },
              ]}
              onCommit={() => postArtwork(picked.id)}
              onCommitted={() => setPosted(true)}
              onClose={() => setPickedArt(null)}
            />
          )}

          {activity && composing && (
            <ActivityConfirm
              activity={activity}
              kicker="트위터"
              title={thread ? '이 글에 답글을 다시겠습니까?' : '지금 겪은 것을 올리시겠습니까?'}
              actionLabel={thread ? '답글 달기' : '게시하기'}
              /* ⚠️ 팔로워가 어떻게 느는지를 **누르기 전에** 적는다 — 직접 늘리는 것은
                 그림뿐이고(상한이 걸린 수입의 축), 글에 붙는 숫자는 표시 전용이다.
                 "안 는다"고 적으면 거짓이다: `sns` 활동이 평판을 올리고 팔로워는 그 파생이다. */
              notes={[
                { label: thread ? '다는 답글' : '올리는 글', value: draft.trim() || '(사진만)' },
                ...(photo && !thread
                  ? [{ label: '붙인 사진', value: findPhoto(photo)?.name ?? '' }]
                  : []),
                ...(thread
                  ? [{ label: '어디에', value: '스레드에만 남는다 — 타임라인에는 안 뜬다' }]
                  : []),
                { label: '팔로워', value: '오른 평판만큼만 는다 — 직접 늘리는 것은 그림뿐' },
              ]}
              onCommit={() => postTweet(draft, photo ?? undefined, thread ?? undefined)}
              onCommitted={() => {
                setPosted(true)
                setDraft('')
                setPhoto(null)
              }}
              onClose={() => setComposing(false)}
            />
          )}

          {!thread && (
          <ul className="tw-feed">
            {/* 내 글이 맨 위다. 시각은 인덱스가 아니라 **실제로 올린 날**에서 나온다. */}
            {mine.map(({ tweet, post }) => (
              <li key={tweet.id}>
                <TweetRow
                  tweet={tweet}
                  age={postAge(post.day, state.day)}
                  me={state.playerName}
                  attachment={<Attachment post={post} />}
                  onOpenThread={() => openThread(tweet.id)}
                />
              </li>
            ))}
            {shown.map((t, i) => (
              <li key={t.id}>
                <TweetRow tweet={t} age={tweetAge(i)} onOpenThread={() => openThread(t.id)} />
              </li>
            ))}
          </ul>
          )}

          {/* ux `Search / No Results`: 빈 화면 대신 무엇을 하면 되는지 적는다. */}
          {!thread && shown.length === 0 && mine.length === 0 && (
            <p className="tw-empty">
              {q
                ? `"${q}"에 해당하는 글이 없습니다. `
                : '팔로우한 계정이 없습니다. 추천 타임라인에서 [팔로우]를 눌러 보세요. '}
              <button type="button" className="tw-link" onClick={goHome}>
                추천 타임라인 보기
              </button>
            </p>
          )}
          </>
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

/**
 * 트윗 한 줄. 아바타 · 이름 · 인증 뱃지 · 핸들 · 시각 · [팔로우] · 본문 · 이미지 · 반응 줄.
 *
 * ⚠️ **색을 새로 들이지 않는다.** 실제 X는 좋아요를 분홍, 리트윗을 초록으로 물들이지만
 * 이 사이트의 확정된 시각 언어는 검정 하나(`Minimalist Monochrome`, CSS 머리말)라
 * 누른 상태는 **채운 글리프 + 굵기 + 검정**으로 알린다(글자·`aria-pressed`가 함께 알린다).
 */
function TweetRow({
  tweet,
  age,
  me,
  attachment,
  onOpenThread,
}: {
  tweet: Tweet
  age: string
  /** 내 글이면 플레이어 이름. 이때는 [팔로우] 버튼을 안 그린다(나를 팔로우할 수 없다). */
  me?: string
  /** 내 글의 첨부(사진첩 사진·올린 그림). 있으면 `Tweet.image` 대신 이것을 그린다. */
  attachment?: ReactNode
  /** 있으면 [답글] 숫자가 **스레드를 여는 버튼**이 된다(없으면 숫자 그대로). */
  onOpenThread?: () => void
}) {
  const state = useGameStore((s) => s.state)
  const react = useGameStore((s) => s.reactTweet)
  const a = findAccount(tweet.handle)
  if (!state) return null
  const following = hasReacted(state, 'follow', tweet.handle)
  const liked = hasReacted(state, 'like', tweet.id)
  const retweeted = hasReacted(state, 'retweet', tweet.id)
  return (
    <article className="tw-tweet">
      <span
        className={`tw-avatar${me ? ' tw-avatar-me' : ''}`}
        style={a ? { background: a.gradient } : undefined}
        aria-hidden="true"
      >
        {me ? me.slice(0, 1) : a?.initial}
      </span>
      <div className="tw-tweet-body">
        <p className="tw-tweet-head">
          <b className="tw-tweet-name">{me ?? a?.name ?? tweet.handle}</b>
          {(me ? seenRankEvent(state, 'verified-badge') : a?.verified) && (
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
          <span className="tw-tweet-age">{age}</span>
          {/* ⚠️ 팔로우가 하는 일은 '팔로잉' 탭이 보는 목록을 바꾸는 것이다 —
              장식이 아니라 화면을 실제로 가르는 값이다. **내 글에는 안 붙는다.** */}
          {!me && (
            <button
              type="button"
              className={`tw-follow${following ? ' tw-follow-on' : ''}`}
              aria-pressed={following}
              onClick={() => react('follow', tweet.handle)}
            >
              {following ? '팔로잉' : '팔로우'}
            </button>
          )}
        </p>

        <p className="tw-tweet-text">{tweet.body}</p>

        {attachment}

        {tweet.image && (
          /* 사진이 있으면 사진, 없으면 지금까지의 그라데이션 + 글자 판이다(`Cover`). */
          <Cover src={`/img/tweet/${tweet.id}.webp`} className="tw-media-img">
            <span className="tw-media" style={{ background: tweet.image.gradient }}>
              {tweet.image.caption}
            </span>
          </Cover>
        )}

        {/*
          ⚠️ **답글·조회수는 여전히 숫자다.** 답글을 써도 그 글이 게임 어디에도 안 쓰이고
          조회수는 내가 만들 수 있는 값이 아니다 — 죽은 컨트롤을 만들지 않는다는 규칙 그대로.
          ⚠️ **리트윗·좋아요는 누른 만큼 숫자가 실제로 오른다** — 안 올리면 버튼이 거짓말을 한다.
          아이콘만으로는 뜻이 안 서므로 각 숫자에 이름을 붙인다(ux `aria-labels`).
        */}
        <p className="tw-stats">
          {/* ⚠️ **답글은 이제 죽은 숫자가 아니다** — 누르면 그 글의 스레드가 열린다. */}
          {onOpenThread ? (
            <button type="button" className="tw-stat tw-act" onClick={onOpenThread}>
              <AppIcon name="mdi:comment-outline" size={15} />
              <span className="tw-sr">답글</span>
              {countLabel(tweet.replies)}
            </button>
          ) : (
            <span className="tw-stat">
              <AppIcon name="mdi:comment-outline" size={15} />
              <span className="tw-sr">답글</span>
              {countLabel(tweet.replies)}
            </span>
          )}
          <button
            type="button"
            className={`tw-stat tw-act${retweeted ? ' tw-act-on' : ''}`}
            aria-pressed={retweeted}
            onClick={() => react('retweet', tweet.id)}
          >
            <AppIcon name="mdi:repeat-variant" size={16} />
            <span className="tw-sr">리트윗</span>
            {countLabel(tweet.retweets + (retweeted ? 1 : 0))}
          </button>
          <button
            type="button"
            className={`tw-stat tw-act${liked ? ' tw-act-on' : ''}`}
            aria-pressed={liked}
            onClick={() => react('like', tweet.id)}
          >
            <AppIcon name={liked ? 'mdi:heart' : 'mdi:heart-outline'} size={15} />
            <span className="tw-sr">좋아요</span>
            {countLabel(tweet.likes + (liked ? 1 : 0))}
          </button>
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

/**
 * 사진첩 사진 한 장. **파일이 아니라 아이콘 + 글자 판이다** — 이 게임의 사진첩은
 * 겪은 사건이라 실제 이미지가 없다(트윗 첨부·아바타와 같은 규칙).
 *
 * ⚠️ **새 색을 만들지 않는다** — 이 사이트의 확정된 시각 언어(검정 하나) 안에서
 * 표면(`--tw-wash`)과 헤어라인(`--tw-line`)만 쓴다.
 */
function PhotoCard({ id }: { id: string }) {
  const event = findPhoto(id)
  if (!event) return null
  return (
    <span className="tw-photo">
      <AppIcon name={event.icon} size={34} />
      <span className="tw-photo-text">
        <b className="tw-photo-name">{event.name}</b>
        <span className="tw-photo-desc">{event.desc}</span>
      </span>
    </span>
  )
}

/**
 * 내 글에 붙은 것. **사진첩 사진**이거나 **올린 그림**이고, 둘 다 없으면 안 그린다.
 *
 * ⚠️ 그림은 **등급을 글자로 함께 적는다**(ux `color-not-only`) — 그림 자체가 판이라
 * 잘 그렸는지 눈으로는 알 수 없다(작성창의 `.tw-art-thumb`와 같은 판단).
 */
function Attachment({ post }: { post?: MyPost }) {
  const state = useGameStore((s) => s.state)
  if (!post) return null
  if (post.photoId) return <PhotoCard id={post.photoId} />
  if (!post.artworkId || !state) return null
  const work = findArtwork(state, post.artworkId)
  if (!work) return null
  return (
    <span className="tw-photo">
      <span className="tw-art-thumb" aria-hidden="true">
        {artGrade(work)}
      </span>
      <span className="tw-photo-text">
        <b className="tw-photo-name">{artTitle(work.serial)}</b>
        <span className="tw-photo-desc">
          {artGrade(work)}등급 · {work.day}일차에 그렸다
        </span>
      </span>
    </span>
  )
}

/**
 * 스레드의 답글 한 줄. **내 답글은 아바타와 이름이 나다** — 남의 답글과 같은 판형이라
 * 누가 무엇을 말했는지가 한 줄로 읽힌다.
 */
function ReplyRow({ reply, me, today }: { reply: Reply; me: string; today: number }) {
  const a = reply.handle ? findAccount(reply.handle) : undefined
  const mine = !reply.handle
  return (
    <article className="tw-reply">
      <span
        className={`tw-avatar tw-avatar-sm${mine ? ' tw-avatar-me' : ''}`}
        style={a ? { background: a.gradient } : undefined}
        aria-hidden="true"
      >
        {mine ? me.slice(0, 1) : a?.initial}
      </span>
      <div className="tw-tweet-body">
        <p className="tw-tweet-head">
          <b className="tw-tweet-name">{mine ? me : (a?.name ?? reply.handle)}</b>
          {!mine && <span className="tw-tweet-handle">@{reply.handle}</span>}
          {reply.day !== undefined && (
            <>
              <span className="tw-tweet-dot" aria-hidden="true">
                ·
              </span>
              <span className="tw-tweet-age">{postAge(reply.day, today)}</span>
            </>
          )}
        </p>
        <p className="tw-tweet-text">{reply.body}</p>
      </div>
    </article>
  )
}

/**
 * 알림 목록. **내 계정에 온 팔로우·리트윗·좋아요만** 뜬다(실제 X와 같이 남의 글은 안 뜬다).
 *
 * ⚠️ 아이콘은 그 반응의 것과 같은 글리프다 — 타임라인의 버튼과 여기가 다른 그림이면
 * 같은 사건이 두 가지로 읽힌다.
 */
function NoticeList({ notices }: { notices: TweetNotice[] }) {
  if (!notices.length) {
    return (
      <p className="tw-empty">
        아직 알림이 없습니다. 그림을 그려 올리면 사람들이 반응합니다.
      </p>
    )
  }
  return (
    <ul className="tw-notices">
      {notices.map((n) => (
        <li key={n.id} className="tw-notice">
          <span className="tw-notice-icon" aria-hidden="true">
            <AppIcon
              name={
                n.kind === 'follow'
                  ? 'mdi:account-plus-outline'
                  : n.kind === 'reply'
                    ? 'mdi:comment-outline'
                    : n.kind === 'retweet'
                      ? 'mdi:repeat-variant'
                      : 'mdi:heart'
              }
              size={20}
            />
          </span>
          <span className="tw-notice-body">
            <span className="tw-notice-text">{noticeText(n)}</span>
            {n.about && <span className="tw-notice-about">{n.about}</span>}
          </span>
          <span className="tw-notice-day">{n.day}일차</span>
        </li>
      ))}
    </ul>
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
