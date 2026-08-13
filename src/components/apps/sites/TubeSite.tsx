import { useId, useMemo, useState } from 'react'
import { findActivity } from '../../../data/activities'
import {
  SHORTS,
  STREAM_TOPICS,
  VIDEOS,
  VIDEO_CATEGORIES,
  findChannel,
  subscribersFrom,
  watchActivityFor,
} from '../../../data/videos'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { CHANNEL_NAME_MAX, channelOf } from '../../../systems/channel'
import type { ChannelState } from '../../../types/game'
import type { Site } from '../../../data/sites'
import type { StreamTopic, Video } from '../../../data/videos'
import { ActivityConfirm } from '../ActivityConfirm'
import './TubeSite.css'

/**
 * 너튜브 — 레퍼런스(유튜브 홈)를 그대로 따른 화면.
 *
 * 골격: 헤더(로고·검색·계정) → 왼쪽 레일 → 칩 줄 → 영상 그리드(중간에 Shorts 줄).
 * ⚠️ **동작하는 것만 컨트롤로 만든다.** 칩·레일 탭·검색은 실제로 목록을 거르고,
 * 영상을 누르면 시청 화면으로 간다. 마이크·만들기·알림처럼 이 게임에 뜻이 없는 것은
 * 헤더에 **표시만** 한다 — 눌러도 아무 일 없는 버튼은 진짜 유튜브다움을 깎는다.
 *
 * ⚠️ **넘겨보는 것은 무료다.** 목록을 훑고 영상을 열어 보는 동안에는 턴도 스탯도 움직이지
 * 않는다. 상태를 바꾸는 자리는 **둘뿐이고 둘 다 확인창을 거쳐 1턴을 쓴다**:
 * 시청 화면의 [끝까지 보기](`watch-video`)와 [내 채널]의 방송 시작(`stream`).
 * ⚠️ **무엇을 보느냐가 무엇이 오르느냐다** — 갈래(게임·음악·뉴스)가 활동을 고르고
 * 증감은 그 활동이 진다(`data/videos.ts`의 `CATEGORY_ACTIVITY`). 화면은 고르기만 한다.
 *
 * ⚠️ **구독자 수는 `reputation`에서 뽑은 읽기 전용 파생값이다**(`subscribersFrom`).
 * 트위터 팔로워처럼 저장된 상태로 만들지 않았고 **정산도 붙이지 않았다** —
 * 방송은 `stream` 활동이 회당 돈을 직접 주므로, 구독자에까지 수익을 붙이면
 * 한 행동이 두 번 벌게 된다.
 *
 * ⚠️ **채널 이름만은 저장한다**(2026-08-08, `GameState.channel`). 파생시킬 수 없는
 * 유일한 값이라서다 — 플레이어가 지은 것이고, **트위터에서 그 이름을 검색하면 시청자
 * 반응이 뜬다**(`systems/channel.ts`의 `streamReviews`). 이름을 안 지었으면 플레이어
 * 이름이 곧 채널 이름이다(빈 화면을 만들지 않는다).
 */

const RAIL = [
  { id: 'home', label: '홈', icon: 'mdi:home' },
  { id: 'shorts', label: 'Shorts', icon: 'mdi:play-box-outline' },
  { id: 'subs', label: '구독', icon: 'mdi:youtube-subscription' },
  /* ⚠️ 이 항목이 `stream` 활동의 실행 통로다 — 예전에는 정의만 있고 브라우저에서
     갈 데가 없었다(스케줄러 예약·바탕화면 바로 가기로만 닿았다). */
  { id: 'studio', label: '내 채널', icon: 'mdi:video-account' },
] as const

type RailId = (typeof RAIL)[number]['id']

export function TubeSite({ site }: { site: Site }) {
  const [rail, setRail] = useState<RailId>('home')
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  /** 보고 있는 영상. null이면 목록 화면이다. */
  const [playing, setPlaying] = useState<Video | null>(null)
  /** 켜려고 고른 방송 주제. 누르면 확인창이 뜬다(수치는 활동 하나가 갖는다). */
  const [topic, setTopic] = useState<StreamTopic | null>(null)
  /** 방금 방송을 켰는가. 화면이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [streamed, setStreamed] = useState<string | null>(null)
  /** 끝까지 보려고 고른 영상. 누르면 확인창이 뜬다(넘겨보기는 그대로 무료다). */
  const [watching, setWatching] = useState<Video | null>(null)

  /* ⚠️ 상태 하나만 고른다 — `channelOf`는 매번 새 객체를 만들므로 셀렉터 안에서 부르면
     zustand가 매 렌더 다른 값으로 보고 다시 그린다(파생은 셀렉터 밖에서 한다). */
  const state = useGameStore((s) => s.state)
  const renameChannel = useGameStore((s) => s.renameChannel)
  const startStream = useGameStore((s) => s.startStream)
  const playerName = state?.playerName ?? '나'
  const reputation = state?.stats.reputation ?? 0
  const channel = state ? channelOf(state) : { name: playerName, streams: 0 }
  const streamActivity = findActivity(site.activityId ?? '')
  /* ⚠️ 사이트의 `activityId`(=방송)와 **별개다** — 이 화면에는 상태를 바꾸는 자리가 둘이고
     (켜기·보기) `Site`는 대표 하나만 가리킨다. 미디북스가 책마다 다른 활동을 부르는 것과 같다.
     ⚠️ **어느 활동인지는 고른 영상의 갈래가 정한다**(`watchActivityFor`) — 게임·음악·뉴스는
     각자의 활동이 있고 나머지는 기본값으로 온다. 수치를 여기서 손보지 않는다. */
  const watchActivity = watching ? findActivity(watchActivityFor(watching)) : undefined

  const q = query.trim().toLowerCase()
  const matches = (v: Video) =>
    (category === '전체' || v.category === category) &&
    (!q || v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q))

  const videos = useMemo(() => {
    if (rail === 'shorts') return SHORTS.filter(matches)
    if (rail === 'subs') return VIDEOS.filter((v) => findChannel(v.channel)?.subscribed && matches(v))
    return VIDEOS.filter(matches)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail, category, q])

  const shorts = useMemo(() => SHORTS.filter(matches), [category, q])

  return (
    <div className="tube">
      <header className="tube-head">
        <span className="tube-burger" aria-hidden="true">
          <AppIcon name="mdi:menu" size={22} />
        </span>
        <button
          type="button"
          className="tube-logo"
          onClick={() => {
            setPlaying(null)
            setRail('home')
            setCategory('전체')
            setQuery('')
          }}
        >
          <AppIcon name="mdi:youtube" size={28} className="tube-logo-mark" />
          <span className="tube-logo-text">너튜브</span>
          <sup className="tube-logo-sup">Premium</sup>
        </button>

        <form
          className="tube-search"
          onSubmit={(e) => {
            e.preventDefault()
            setPlaying(null)
          }}
        >
          <input
            className="tube-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            aria-label="영상 검색"
          />
          <button type="submit" className="tube-search-go" aria-label="검색">
            <AppIcon name="mdi:magnify" size={22} />
          </button>
          {/* 표시 전용: 음성 검색은 이 게임에 없는 기능이다. */}
          <span className="tube-mic" aria-hidden="true">
            <AppIcon name="mdi:microphone" size={20} />
          </span>
        </form>

        <div className="tube-actions">
          {/* ⚠️ 예전에는 표시 전용이었다 — 이제 방송을 켜는 자리가 생겼으므로 진짜
              버튼으로 승격시킨다("동작하는 것만 컨트롤로 만든다"는 이 파일의 규칙). */}
          <button
            type="button"
            className="tube-create"
            onClick={() => {
              setRail('studio')
              setPlaying(null)
            }}
          >
            <AppIcon name="mdi:plus" size={18} />
            만들기
          </button>
          <AppIcon name="mdi:bell-outline" size={22} className="tube-bell" aria-hidden="true" />
          <span className="tube-avatar tube-avatar-me" aria-hidden="true">
            {playerName.slice(0, 2)}
          </span>
        </div>
      </header>

      <div className="tube-body">
        <nav className="tube-rail" aria-label="너튜브 메뉴">
          {RAIL.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`tube-rail-item${rail === r.id ? ' tube-rail-item-on' : ''}`}
              aria-current={rail === r.id ? 'page' : undefined}
              onClick={() => {
                setRail(r.id)
                setPlaying(null)
              }}
            >
              <AppIcon name={r.icon} size={22} />
              {r.label}
            </button>
          ))}
        </nav>

        <main className="tube-main">
          {rail === 'studio' ? (
            <Studio
              channel={channel}
              reputation={reputation}
              streamed={streamed}
              onPick={setTopic}
              onRename={renameChannel}
            />
          ) : playing ? (
            <Watch
              video={playing}
              onPick={setPlaying}
              onBack={() => setPlaying(null)}
              onWatch={() => setWatching(playing)}
            />
          ) : (
            <>
              <div className="tube-chips">
                {VIDEO_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tube-chip${category === c ? ' tube-chip-on' : ''}`}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {videos.length === 0 ? (
                <p className="tube-empty">
                  {q ? `'${query}'에 대한 검색결과가 없습니다.` : '표시할 영상이 없습니다.'}
                </p>
              ) : rail === 'shorts' ? (
                <ShortsGrid items={videos} onPick={setPlaying} />
              ) : (
                <>
                  {/* 레퍼런스처럼 그리드 한 줄 뒤에 Shorts 줄이 끼어든다. */}
                  <Grid items={videos.slice(0, 3)} onPick={setPlaying} />
                  {rail === 'home' && shorts.length > 0 && (
                    <ShortsRow items={shorts.slice(0, 5)} onPick={setPlaying} />
                  )}
                  <Grid items={videos.slice(3, 6)} onPick={setPlaying} />
                  {rail === 'home' && shorts.length > 5 && (
                    <ShortsRow items={shorts.slice(5, 10)} onPick={setPlaying} />
                  )}
                  <Grid items={videos.slice(6)} onPick={setPlaying} />
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/*
        ⚠️ **수치는 활동 하나가 갖는다.** 주제는 "무엇을 하며 두 시간을 보내는가"만
        정하고 증감·조건은 `stream`이 전부 진다(증기의 게임 목록과 같은 규칙).
        장비(방송용 마이크 세트)가 없으면 `canRun`이 막고 확인창이 사유를 적는다 —
        이 화면이 두 번째 판정을 만들지 않는다.
      */}
      {streamActivity && topic && (
        <ActivityConfirm
          activity={streamActivity}
          kicker="너튜브"
          title={`「${topic.label}」으로 방송을 켜시겠습니까?`}
          actionLabel="방송 시작"
          notes={[
            { label: '방송 주제', value: topic.desc },
            /* 채널 이름은 활동 증감에 안 잡히지만 **이 방송이 누구 이름으로 나가는지**는
               켜기 전에 알아야 한다(수강료·응시료를 `notes`로 적는 것과 같은 규칙). */
            { label: '채널 이름', value: channel.name },
          ]}
          /* ⚠️ 기본 동작(`doActivity`) 대신 `startStream`이다 — 켠 횟수·주제를 남겨야
             트위터 검색이 보여 줄 시청자 반응이 생긴다(`postArtwork`와 같은 모양). */
          onCommit={() => startStream(topic)}
          onCommitted={() => setStreamed(topic.label)}
          onClose={() => setTopic(null)}
        />
      )}

      {/* 넘겨보는 것은 여전히 무료다 — **끝까지 보겠다고 누른 것만** 1턴을 쓴다. */}
      {watchActivity && watching && (
        <ActivityConfirm
          activity={watchActivity}
          kicker="너튜브"
          title={`「${watching.title}」을 끝까지 보시겠습니까?`}
          actionLabel="영상 보기"
          notes={[{ label: '채널', value: watching.channel }]}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  )
}

/**
 * 내 채널. 채널 머리 + 이름 짓기 + 방송 주제 고르기.
 *
 * ⚠️ **구독자 수는 평판 파생이다**(읽기 전용) — 무엇에서 나온 숫자인지 함께 적는다.
 * 저장된 상태로 만들지 않은 이유는 이 파일 상단 주석에 있다.
 *
 * ⚠️ **이름 짓기는 턴을 안 쓴다**(타이핑은 행동이 아니다). 그래서 확인창을 거치지 않고
 * 저장 버튼 하나로 끝난다 — 1턴을 쓰는 방송 시작과 무게가 다르다.
 */
function Studio({
  channel,
  reputation,
  streamed,
  onPick,
  onRename,
}: {
  channel: ChannelState
  reputation: number
  streamed: string | null
  onPick: (t: StreamTopic) => void
  onRename: (name: string) => void
}) {
  const subs = subscribersFrom(reputation)
  const [draft, setDraft] = useState(channel.name)
  const nameId = useId()
  const trimmed = draft.trim()

  return (
    <section className="tube-studio" aria-label="내 채널">
      <header className="tube-studio-head">
        <span className="tube-avatar tube-avatar-studio" aria-hidden="true">
          {channel.name.slice(0, 2)}
        </span>
        <span className="tube-studio-id">
          <h2 className="tube-studio-name">{channel.name}</h2>
          <p className="tube-studio-meta">
            구독자 {subs.toLocaleString('ko-KR')}명
            <span className="tube-studio-note">평판 {reputation}에서 환산</span>
            {/* 켠 횟수는 파생이 아니라 사실이다 — 켠 적이 있어야 반응이 생긴다. */}
            {channel.streams > 0 && (
              <span className="tube-studio-note">방송 {channel.streams}회</span>
            )}
          </p>
        </span>
      </header>

      {/*
        채널 이름 짓기. **저장 버튼은 실제로 바뀔 때만 눌린다**(같은 이름·빈 이름은 막는다)
        — 눌러도 아무 일 없는 버튼은 이 프로젝트에서 금지다.
      */}
      <form
        className="tube-rename"
        onSubmit={(e) => {
          e.preventDefault()
          onRename(draft)
        }}
      >
        <label className="tube-rename-label" htmlFor={nameId}>
          채널 이름
        </label>
        <input
          id={nameId}
          className="tube-rename-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CHANNEL_NAME_MAX}
          autoComplete="off"
        />
        <button
          type="submit"
          className="tube-rename-save"
          disabled={!trimmed || trimmed === channel.name}
        >
          저장
        </button>
      </form>
      <p className="tube-rename-note">
        이 이름으로 방송이 나갑니다. 트위터에서 이 이름을 검색하면 시청자 반응을 볼 수 있습니다.
      </p>

      {streamed && (
        <p className="tube-studio-receipt" role="status">
          「{streamed}」 방송을 마쳤습니다. 후원금이 소지금에 들어왔습니다.
        </p>
      )}

      <h3 className="tube-studio-title">무엇을 방송할까요</h3>
      <ul className="tube-topics">
        {STREAM_TOPICS.map((t) => (
          <li key={t.id}>
            <button type="button" className="tube-topic" onClick={() => onPick(t)}>
              <span className="tube-topic-art" style={{ background: t.gradient }}>
                LIVE
              </span>
              <span className="tube-topic-text">
                <span className="tube-topic-label">{t.label}</span>
                <span className="tube-topic-desc">{t.desc}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Avatar({ name }: { name: string }) {
  const ch = findChannel(name)
  return (
    <span className="tube-avatar" style={{ background: ch?.color ?? '#666' }} aria-hidden="true">
      {ch?.initial ?? name.slice(0, 1)}
    </span>
  )
}

function Thumb({ video }: { video: Video }) {
  return (
    <span className={`tube-thumb${video.short ? ' tube-thumb-short' : ''}`}>
      <span className="tube-thumb-art" style={{ background: video.gradient }}>
        <span className="tube-thumb-caption">{video.caption ?? video.title}</span>
      </span>
      {video.length && <span className="tube-len">{video.length}</span>}
    </span>
  )
}

function Grid({ items, onPick }: { items: Video[]; onPick: (v: Video) => void }) {
  if (!items.length) return null
  return (
    <ul className="tube-grid">
      {items.map((v) => (
        <li key={v.id}>
          <button type="button" className="tube-card" onClick={() => onPick(v)}>
            <Thumb video={v} />
            <span className="tube-meta">
              <Avatar name={v.channel} />
              <span className="tube-meta-text">
                <span className="tube-title">{v.title}</span>
                <span className="tube-sub">{v.channel}</span>
                <span className="tube-sub">
                  {v.views} · {v.age}
                </span>
              </span>
              {/* 표시 전용: 항목 메뉴는 이 게임에 담을 동작이 없다. */}
              <span className="tube-dots" aria-hidden="true">
                <AppIcon name="mdi:dots-vertical" size={18} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ShortsRow({ items, onPick }: { items: Video[]; onPick: (v: Video) => void }) {
  return (
    <section className="tube-shorts">
      <h2 className="tube-shorts-head">
        <AppIcon name="mdi:youtube" size={20} className="tube-shorts-mark" />
        Shorts
      </h2>
      <ShortsGrid items={items} onPick={onPick} />
    </section>
  )
}

function ShortsGrid({ items, onPick }: { items: Video[]; onPick: (v: Video) => void }) {
  return (
    <ul className="tube-shorts-grid">
      {items.map((v) => (
        <li key={v.id}>
          <button type="button" className="tube-short" onClick={() => onPick(v)}>
            <Thumb video={v} />
            <span className="tube-short-title">{v.title}</span>
            <span className="tube-sub">{v.views}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * 시청 화면.
 *
 * 플레이어 자리는 **재생하는 척하지 않는다** — 영상 파일이 없으므로 썸네일을 크게 깔고
 * "이 게임에는 영상이 없다"는 사실을 감추지 않는다. 가짜 진행 막대를 움직이는 편이
 * 더 그럴듯해 보이지만, 눌러도 아무 일 없는 컨트롤을 늘리는 짓이다.
 */
function Watch({
  video,
  onPick,
  onBack,
  onWatch,
}: {
  video: Video
  onPick: (v: Video) => void
  onBack: () => void
  onWatch: () => void
}) {
  const ch = findChannel(video.channel)
  const next = [...VIDEOS, ...SHORTS].filter((v) => v.id !== video.id).slice(0, 8)

  return (
    <div className="tube-watch">
      <div className="tube-watch-main">
        <button type="button" className="tube-back" onClick={onBack}>
          <AppIcon name="mdi:arrow-left" size={18} />
          목록으로
        </button>

        <div className="tube-player" style={{ background: video.gradient }}>
          <span className="tube-player-caption">{video.caption ?? video.title}</span>
        </div>

        <h1 className="tube-watch-title">{video.title}</h1>
        {/* 유일한 1턴짜리 자리. 플레이어 화면이라 재생 막대 아래, 제목 옆에 둔다. */}
        <button type="button" className="tube-watch-btn" onClick={onWatch}>
          <AppIcon name="mdi:play-circle-outline" size={18} />
          끝까지 보기
        </button>
        <div className="tube-watch-row">
          <Avatar name={video.channel} />
          <span className="tube-watch-channel">
            <b>{video.channel}</b>
            <span className="tube-sub">{ch?.subscribed ? '구독 중' : '구독자 비공개'}</span>
          </span>
        </div>
        <p className="tube-watch-desc">
          <b>
            {video.views} · {video.age}
          </b>
          <br />
          {video.desc ?? '설명이 없습니다.'}
        </p>
      </div>

      <aside className="tube-next" aria-label="다음 동영상">
        {next.map((v) => (
          <button key={v.id} type="button" className="tube-next-item" onClick={() => onPick(v)}>
            <Thumb video={{ ...v, short: false }} />
            <span className="tube-next-text">
              <span className="tube-title">{v.title}</span>
              <span className="tube-sub">{v.channel}</span>
              <span className="tube-sub">{v.views}</span>
            </span>
          </button>
        ))}
      </aside>
    </div>
  )
}
