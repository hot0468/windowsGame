import { useMemo, useState } from 'react'
import { SHORTS, VIDEOS, VIDEO_CATEGORIES, findChannel } from '../../../data/videos'
import { AppIcon } from '../../../icons/AppIcon'
import type { Video } from '../../../data/videos'
import './TubeSite.css'

/**
 * 너튜브 — 레퍼런스(유튜브 홈)를 그대로 따른 화면.
 *
 * 골격: 헤더(로고·검색·계정) → 왼쪽 레일 → 칩 줄 → 영상 그리드(중간에 Shorts 줄).
 * ⚠️ **동작하는 것만 컨트롤로 만든다.** 칩·레일 탭·검색은 실제로 목록을 거르고,
 * 영상을 누르면 시청 화면으로 간다. 마이크·만들기·알림처럼 이 게임에 뜻이 없는 것은
 * 헤더에 **표시만** 한다 — 눌러도 아무 일 없는 버튼은 진짜 유튜브다움을 깎는다.
 *
 * ⚠️ **탐색은 무료다.** 이 사이트는 `gameStore`를 아예 읽지 않는다 — 영상을 본다고
 * 턴이 가거나 스탯이 오르지 않는다. 시청 활동이 필요해지면 활동으로 따로 만들 일이다.
 */

const RAIL = [
  { id: 'home', label: '홈', icon: 'mdi:home' },
  { id: 'shorts', label: 'Shorts', icon: 'mdi:play-box-outline' },
  { id: 'subs', label: '구독', icon: 'mdi:youtube-subscription' },
] as const

type RailId = (typeof RAIL)[number]['id']

export function TubeSite() {
  const [rail, setRail] = useState<RailId>('home')
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  /** 보고 있는 영상. null이면 목록 화면이다. */
  const [playing, setPlaying] = useState<Video | null>(null)

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

        <div className="tube-actions" aria-hidden="true">
          <span className="tube-create">
            <AppIcon name="mdi:plus" size={18} />
            만들기
          </span>
          <AppIcon name="mdi:bell-outline" size={22} className="tube-bell" />
          <span className="tube-avatar tube-avatar-me">서희</span>
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
          {playing ? (
            <Watch video={playing} onPick={setPlaying} onBack={() => setPlaying(null)} />
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
    </div>
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
}: {
  video: Video
  onPick: (v: Video) => void
  onBack: () => void
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
