import { useState } from 'react'
import { MEETING_HOST, MEETING_JOIN_REWARD, MEETING_PARTICIPANTS } from '../../data/meetings'
import { SLOT_NAMES } from '../../types/game'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { meetingNow, upcomingMeetings } from '../../systems/meeting'
import './ZoomApp.css'

/**
 * 줌 — 화상회의.
 *
 * ## 이 창이 게임에 하는 일은 **성과 게이지 하나**다
 * 회의는 활동이 아니다: **턴을 쓰지 않고 스탯도 안 올린다**(읽는 것이 무료인 것과 같은
 * 판단 — 회의는 일이 아니라 자리다). 들어가면 성과가 조금 오르고, 빠지면 밤에 깎인다.
 * 규칙·수치는 전부 `systems/meeting.ts`·`data/meetings.ts`에 있다.
 *
 * ## ⚠️ 화면이 셋으로 갈린다 — 세 번째만 회의다
 * ① 회의가 없는 날: 들어갈 방이 없다고 말하고 **다음 회의 날짜를 알려 준다**
 *    (막다른 안내를 만들지 않는다 — 언제 오면 되는지가 이 화면의 전부다).
 * ② 회의 시간인데 아직 안 들어감: 대기실. 호스트가 기다리고 있고 [참여]가 유일한 버튼이다.
 * ③ 참여 중: 타일 격자 + 도구 모음.
 *
 * ## ⚠️ 카메라 화면을 지어내지 않는다
 * 이 게임에는 사진이 없다. 그래서 **모두 카메라를 끈 회의**를 그린다 — 실제 줌에서
 * 카메라가 꺼지면 이름 이니셜 원이 뜨는 그 화면이고, 없는 영상을 흉내 내는 것보다
 * 정직하다. 내 카메라 토글이 실제로 그 두 상태를 오간다.
 */

/** 회의 중 흐르는 말. **고정 대본이다** — 굴리면 새로 고칠 때마다 달라진다. */
const MEETING_CHAT: { from: string; text: string }[] = [
  { from: MEETING_HOST, text: '다들 들어오셨죠? 화면 공유 먼저 할게요.' },
  { from: MEETING_PARTICIPANTS[0], text: '네 잘 보입니다' },
  { from: MEETING_PARTICIPANTS[1], text: '소리도 괜찮습니다' },
  { from: MEETING_PARTICIPANTS[3], text: '이번 주 일정 공유는 회의 끝나고 정리해서 올리겠습니다' },
]

export function ZoomApp() {
  const state = useGameStore((s) => s.state)
  const joinMeeting = useGameStore((s) => s.joinMeeting)
  /** 회의실 안인가. **창 안에만 사는 상태다** — 창을 닫으면 나간 것이 맞다. */
  const [inRoom, setInRoom] = useState(false)
  const [muted, setMuted] = useState(true)
  const [camera, setCamera] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [left, setLeft] = useState(false)

  if (!state) return null
  const now = meetingNow(state)
  const next = upcomingMeetings(state).find((m) => !m.joined)

  /* ── ① 회의가 없는 시간 ─────────────────────────────────────────── */
  if (!now) {
    return (
      <div className="zm zm-empty">
        <AppIcon name="fluent-color:video-24" size={44} />
        <h1 className="zm-empty-title">참여할 수 있는 회의가 없습니다</h1>
        <p className="zm-empty-text">
          {next
            ? `다음 회의는 ${next.day}일차 ${SLOT_NAMES[next.slot]} — ${next.topic}`
            : '회의는 팀장이 잡습니다. 너아무튼온으로 요청이 오면 [확인]을 눌러 일정에 넣어 두세요.'}
        </p>
      </div>
    )
  }

  /* ── 회의에서 나온 뒤 ───────────────────────────────────────────── */
  if (left) {
    return (
      <div className="zm zm-empty">
        <AppIcon name="fluent-color:checkmark-circle-24" size={44} />
        <h1 className="zm-empty-title">회의에서 나왔습니다</h1>
        <p className="zm-empty-text">참석은 기록됐습니다. 성과에 {MEETING_JOIN_REWARD}% 반영됐습니다.</p>
      </div>
    )
  }

  /* ── ② 대기실 ───────────────────────────────────────────────────── */
  if (!inRoom) {
    return (
      <div className="zm zm-lobby">
        <p className="zm-lobby-topic">{now.topic}</p>
        <h1 className="zm-lobby-title">
          {now.joined ? '이미 참석한 회의입니다' : `${MEETING_HOST}님이 기다리는 중입니다`}
        </h1>
        <p className="zm-lobby-text">
          {now.day}일차 {SLOT_NAMES[now.slot]} · 참여자 {MEETING_PARTICIPANTS.length + 1}명
        </p>
        <button
          type="button"
          className="zm-join"
          onClick={() => {
            /* ⚠️ **들어간 사실을 먼저 확정한다** — 창을 닫아도 참석은 남아야 한다
               (성과·결석 감사가 이 값 하나를 본다). */
            joinMeeting()
            setInRoom(true)
          }}
        >
          회의 참여
        </button>
        <p className="zm-lobby-note">참여해도 시간(턴)은 쓰지 않습니다.</p>
      </div>
    )
  }

  /* ── ③ 회의실 ───────────────────────────────────────────────────── */
  const tiles = [
    { name: MEETING_HOST, host: true, self: false },
    ...MEETING_PARTICIPANTS.map((name) => ({ name, host: false, self: false })),
    { name: state.playerName, host: false, self: true },
  ]

  return (
    <div className="zm">
      <header className="zm-bar zm-top">
        <span className="zm-topic">{now.topic}</span>
        <span className="zm-count">참여자 {tiles.length}명</span>
      </header>

      <div className="zm-stage">
        <ul className="zm-tiles">
          {tiles.map((t) => (
            <li
              key={t.name}
              /* 말하는 사람은 호스트 하나로 고정이다 — 굴리면 결정적이지 않게 되고,
                 타이머로 돌리면 창을 열어 둔 시간이 게임에 흘러들어 온다. */
              className={`zm-tile${t.host ? ' zm-tile-speaking' : ''}`}
            >
              {t.self && camera ? (
                /* 카메라를 켠 나. 사진이 없으므로 **카메라가 켜졌다는 사실 자체**를 그린다. */
                <span className="zm-cam" aria-hidden="true">
                  <AppIcon name="fluent-color:video-24" size={28} />
                </span>
              ) : (
                <span className="zm-avatar" aria-hidden="true">
                  {t.name.slice(0, 1)}
                </span>
              )}
              <span className="zm-name">
                {t.name}
                {t.self && ' (나)'}
                {t.host && ' · 호스트'}
              </span>
              {t.self && muted && <span className="zm-muted-mark">음소거됨</span>}
            </li>
          ))}
        </ul>

        {showChat && (
          <aside className="zm-chat" aria-label="회의 채팅">
            <p className="zm-chat-head">채팅</p>
            <ul className="zm-chat-list">
              {MEETING_CHAT.map((m) => (
                <li key={m.from + m.text} className="zm-chat-line">
                  <b>{m.from}</b> {m.text}
                </li>
              ))}
            </ul>
            <p className="zm-chat-note">이 회의에서는 듣기만 합니다.</p>
          </aside>
        )}
      </div>

      {/* 도구 모음. 실제 줌과 같은 자리이고 **여기 있는 것은 전부 동작한다**. */}
      <footer className="zm-bar zm-tools">
        <button
          type="button"
          className={`zm-tool${muted ? ' zm-tool-off' : ''}`}
          aria-pressed={muted}
          onClick={() => setMuted((v) => !v)}
        >
          <AppIcon name="mdi:microphone" size={18} />
          {muted ? '음소거 해제' : '음소거'}
        </button>
        <button
          type="button"
          className={`zm-tool${camera ? '' : ' zm-tool-off'}`}
          aria-pressed={camera}
          onClick={() => setCamera((v) => !v)}
        >
          <AppIcon name="mdi:video-outline" size={18} />
          {camera ? '비디오 중지' : '비디오 시작'}
        </button>
        <button
          type="button"
          className="zm-tool"
          aria-pressed={showChat}
          onClick={() => setShowChat((v) => !v)}
        >
          <AppIcon name="mdi:chat-outline" size={18} />
          채팅
        </button>
        <button type="button" className="zm-leave" onClick={() => setLeft(true)}>
          나가기
        </button>
      </footer>
    </div>
  )
}
