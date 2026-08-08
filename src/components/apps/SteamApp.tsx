import { useState } from 'react'
import { STEAM_GAMES, playtimeLabel } from '../../data/steam'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { sessionsOf, steamActivity, totalSessions } from '../../systems/steam'
import type { SteamGame } from '../../data/steam'
import { ActivityConfirm } from './ActivityConfirm'
import './SteamApp.css'

/**
 * 증기 — 가짜 스팀 클라이언트. **라이브러리 화면 하나뿐이다.**
 *
 * 레퍼런스는 실제 스팀 라이브러리이고 **레퍼런스가 스펙이다**:
 * 어두운 상단 바 → [좌: 검색 + 카테고리 목록 | 우: 표지 히어로 + 초록 실행 버튼 + 플레이 시간].
 *
 * ## 레퍼런스에서 **덜어낸 것**과 그 이유
 * ⚠️ **동작하지 않는 컨트롤은 그리지 않는다**(이 프로젝트의 규칙).
 * - **상점·커뮤니티 탭**: 이 게임에 상점도 친구도 없다. 탭을 만들면 눌러도 갈 데가 없다.
 * - **메뉴 줄(보기·친구·게임·지원)·다운로드 관리·친구 및 채팅**: 같은 이유로 뺐다.
 * - **새로운 업데이트 선반**: 소식을 만드는 시스템이 뉴스·메일뿐이고 게임 소식은 없다.
 *   그 자리에는 **실제로 있는 값**(고른 게임의 플레이 기록)을 놓는다.
 *
 * 남긴 것은 전부 동작한다: 검색은 목록을 거르고, 목록은 고른 게임을 실제로 바꾸며,
 * [플레이]는 확인창을 거쳐 1턴을 쓴다.
 *
 * ## 게임을 켜는 것 = 활동 `game`
 * ⚠️ **게임마다 효과를 다르게 주지 않는다**(`systems/steam.ts` 참조). 라이브러리는
 * "무엇을 하며 시간을 보내는가"만 정하고, 스탯을 움직이는 것은 활동 하나다 —
 * 미디북스의 책·시집이의 영화와 같은 규칙이다.
 */
export function SteamApp() {
  const state = useGameStore((s) => s.state)
  const playGame = useGameStore((s) => s.playGame)
  const [pickedId, setPickedId] = useState<string>(STEAM_GAMES[0].id)
  const [query, setQuery] = useState('')
  /** 확인창을 열었는가. 켤 게임은 왼쪽에서 이미 고른 것이다. */
  const [confirming, setConfirming] = useState(false)

  const activity = steamActivity()
  if (!state || !activity) return null

  const q = query.trim()
  const shown = STEAM_GAMES.filter((g) => (q ? g.title.includes(q) || g.genre.includes(q) : true))
  const picked = STEAM_GAMES.find((g) => g.id === pickedId) ?? STEAM_GAMES[0]
  const played = sessionsOf(state, picked.id)

  return (
    <div className="st">
      {/* ── 상단 바 ─────────────────────────────────────────── */}
      <header className="st-top">
        <span className="st-logo">
          <AppIcon name="fluent-color:library-24" size={20} />
          증기
        </span>
        <span className="st-tab" aria-current="true">
          라이브러리
        </span>
        {/* 계정 이름은 장식이 아니라 **실제 플레이어 이름**이다(트위터 계정 카드와 같다). */}
        <span className="st-account">{state.playerName}</span>
      </header>

      <div className="st-main">
        {/* ── 좌: 검색 + 라이브러리 목록 ───────────────────────── */}
        <nav className="st-side" aria-label="라이브러리">
          <div className="st-search">
            <AppIcon name="mdi:magnify" size={16} className="st-search-icon" />
            <input
              className="st-search-input"
              type="search"
              value={query}
              placeholder="게임 검색"
              aria-label="게임 검색"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <p className="st-group">
            카테고리 없음 <span className="st-group-n">({shown.length})</span>
          </p>

          {shown.length === 0 ? (
            /* ux `empty-states`: 빈 목록 대신 무엇을 하면 되는지 적는다. */
            <p className="st-empty">"{q}"에 맞는 게임이 없습니다.</p>
          ) : (
            <ul className="st-list">
              {shown.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    className={`st-item${g.id === picked.id ? ' st-item-on' : ''}`}
                    aria-current={g.id === picked.id ? 'true' : undefined}
                    onClick={() => setPickedId(g.id)}
                  >
                    <AppIcon name={g.icon} size={16} />
                    <span className="st-item-name">{g.title}</span>
                    {/* 켠 적 있는 게임의 표식. ⚠️ 글자(●)가 아니라 CSS 도형이다 —
                        딩벳 문자는 폰트마다 모양이 달라진다(이모지 금지와 같은 이유). */}
                    {sessionsOf(state, g.id) > 0 && (
                      <span className="st-item-mark" title="플레이한 적 있음" aria-label="플레이한 적 있음" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* ── 우: 고른 게임 ───────────────────────────────────── */}
        <section className="st-detail" aria-label={`${picked.title} 정보`}>
          {/* 표지. 사진이 없으므로 그라데이션 판 + 제목이다(오프라인 규칙). */}
          <div className="st-hero" style={{ background: picked.cover }}>
            <h2 className="st-hero-title">{picked.title}</h2>
            <p className="st-hero-genre">{picked.genre}</p>
          </div>

          <div className="st-bar">
            <button type="button" className="st-play" onClick={() => setConfirming(true)}>
              <span className="st-play-glyph" aria-hidden="true" />
              플레이
            </button>
            <dl className="st-facts">
              <div>
                <dt>플레이 시간</dt>
                <dd>{playtimeLabel(played)}</dd>
              </div>
              <div>
                <dt>실행 횟수</dt>
                <dd>{played}회</dd>
              </div>
            </dl>
          </div>

          <p className="st-blurb">{picked.blurb}</p>
          <ul className="st-tags">
            {picked.tags.map((t) => (
              <li key={t} className="st-tag">
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 상태 표시줄. 실제 스팀의 하단 줄 자리이고, 숫자는 전부 파생이다. */}
      <footer className="st-status">
        <span>보유 {STEAM_GAMES.length}개</span>
        {/* ⚠️ 0일 때 `playtimeLabel`을 그대로 쓰면 "총 플레이 플레이한 적 없음"이 된다 —
            그 문구는 게임 한 개를 두고 하는 말이라 합계 자리에서는 어색하다. */}
        <span>총 플레이 {totalSessions(state) === 0 ? '없음' : playtimeLabel(totalSessions(state))}</span>
      </footer>

      {/*
        ⚠️ 확인창은 **바탕화면 바로 가기·사이트와 같은 부품**이다(`ActivityConfirm`).
        1턴을 쓰는 자리는 어디서나 같은 모양이어야 플레이어가 다시 배우지 않는다.
        `onCommit`으로 동작을 바꾸는 것은 "어느 게임인가"를 함께 넘겨야 하기 때문이다
        (수강 신청·원서 접수와 같은 이유).
      */}
      {confirming && (
        <ActivityConfirm
          activity={activity}
          kicker="증기"
          title={`「${picked.title}」을(를) 실행하시겠습니까?`}
          actionLabel="플레이"
          notes={[
            { label: '장르', value: picked.genre },
            { label: '플레이 시간', value: playtimeLabel(played) },
          ]}
          onCommit={() => playGame(picked as SteamGame)}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
