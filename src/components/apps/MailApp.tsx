import { useState } from 'react'
import { MAILBOX } from '../../data/messages'
import { useShell } from '../../hooks/useShell'
import { useGameStore } from '../../store/gameStore'
import { examMessages } from '../../systems/certification'
import { contestMessages } from '../../systems/contests'
import { gearMessages } from '../../systems/gear'
import { holidayMessages } from '../../systems/holidays'
import { phoneMessages } from '../../systems/phone'
import { billMessages } from '../../systems/bills'
import { webtoonMessages } from '../../systems/webtoon'
import { noticeMessages } from '../../systems/employment'
import { selectChannel } from '../../systems/messages'
import type { TimedMessage } from '../../systems/messages'
import './MailApp.css'

/**
 * 메일 분류. 레퍼런스(아웃룩)의 폴더 트리 자리에 들어간다.
 *
 * ⚠️ **눌러서 실제로 걸러지는 것만 둔다.** 보낸 편지함·임시 보관함 같은 폴더는
 * 게임에 대응하는 내용이 없어 빈 칸이 되므로 만들지 않는다 —
 * 눌러도 아무 일이 없는 항목을 두지 않는다는 원칙은 브라우저 탭·페이저와 같다.
 */
const FOLDERS = [
  { id: 'inbox', label: '받은 편지함' },
  { id: 'ad', label: '광고' },
] as const

type FolderId = (typeof FOLDERS)[number]['id']

/** 광고 판정. 제목의 [광고] 표기가 유일한 근거다(데이터에 이미 들어 있다). */
function isAd(m: TimedMessage): boolean {
  return (m.subject ?? '').includes('[광고]')
}

/**
 * 아웃룩형 메일 창. 레퍼런스 그대로 **3단**이다: 폴더 / 목록 / 읽기 창.
 *
 * ⚠️ **읽기 전용이자 무료다.** 답장·삭제는 없다 — 게임에 그 행동이 없으므로
 * 눌러도 아무 일이 없는 버튼을 두지 않는다. 메일은 정보 전달 창구이고,
 * 실제 행동은 바탕화면 아이콘·브라우저에서 한다.
 */
export function MailApp() {
  const state = useGameStore((s) => s.state)
  /*
   * ⚠️ **폰에서는 3단이 성립하지 않는다**(폴더 132 + 목록 236 + 본문이 375px를 넘는다).
   * 그래서 모바일에서만 **목록 ↔ 본문 전환**으로 접는다 — 실제 모바일 메일 앱과 같다.
   * 데스크톱은 3단 그대로다(레퍼런스가 스펙이라는 규칙).
   */
  const mobile = useShell() === 'mobile'
  const [folder, setFolder] = useState<FolderId>('inbox')
  /** 선택된 메일. 목록 순서가 아니라 id로 잡는다 — 새 메일이 와도 선택이 밀리지 않는다. */
  const [selected, setSelected] = useState<string | null>(null)

  if (!state) return null

  /*
   * ⚠️ **사서함에는 세 출처가 섞인다.**
   *  ① 편성표(`selectChannel`) — (day, slot)만으로 언제든 다시 계산되는 대본.
   *  ② 정규직 소식(`noticeMessages`) — 플레이어가 언제 어디에 지원했는지에 달려 있어
   *     다시 계산할 수 없다. 그래서 그쪽만 세이브에 사실이 남는다.
   *  ③ 자격시험 발표(`examMessages`)·**공모전 결과**(`contestMessages`)·**웹툰 연재 제의**
   *     (`webtoonMessages`) — ②와 같은 이유로 세이브에 사실이 남는다.
   *     ⚠️ **새 창구를 만들지 않는다** — 채널을 사서함으로 맞춰 이 목록에 그냥 합류한다.
   * 합칠 때는 **턴 번호**로 정렬한다 — 시각 문자열("오전 9:08")은 며칠에도 같은 값이라
   * 정렬 키가 되지 못한다. 최신이 위로 오게 내림차순이다.
   */
  const all = [
    ...selectChannel(MAILBOX.id, state.day, state.slot),
    ...noticeMessages(state),
    ...examMessages(state),
    ...contestMessages(state),
    /* 장비 고장 소식. 새 알림 창구를 만들지 않고 사서함을 그대로 탄다. */
    ...gearMessages(state).map((m) => ({ ...m, time: '방금', turn: Number.MAX_SAFE_INTEGER })),
    ...phoneMessages(state).map((m) => ({ ...m, time: '방금', turn: Number.MAX_SAFE_INTEGER })),
    ...billMessages(state).map((m) => ({ ...m, time: '방금', turn: Number.MAX_SAFE_INTEGER })),
    ...webtoonMessages(state),
    /* 명절 메일. 그날 하루만 뜨는 파생이라 시각은 '방금'이다(장비 고장과 같은 자리). */
    ...holidayMessages(state)
      .filter((m) => m.channel === MAILBOX.id)
      .map((m) => ({ ...m, time: '방금', turn: Number.MAX_SAFE_INTEGER })),
  ].sort((a, b) => b.turn - a.turn)
  const mails = all.filter((m) => (folder === 'ad' ? isAd(m) : !isAd(m)))
  /*
   * ⚠️ **데스크톱은 아무것도 안 고르면 첫 메일을 편다**(읽기 창이 늘 차 있어야 3단이 성립).
   * 모바일은 그 기본값을 쓰지 않는다 — 앱을 열자마자 본문이 떠 있으면 목록을 볼 수 없다.
   */
  const current = mails.find((m) => m.id === selected) ?? (mobile ? undefined : mails[0])
  /** 폰에서 본문 화면에 들어와 있는가. 데스크톱에서는 늘 false(두 칸이 함께 보인다). */
  const reading = mobile && !!current

  return (
    <div className={`mail${mobile ? ' mail-mobile' : ''}${reading ? ' mail-reading' : ''}`}>
      <nav className="mail-folders" aria-label="메일 분류">
        {FOLDERS.map((f) => {
          const count = all.filter((m) => (f.id === 'ad' ? isAd(m) : !isAd(m))).length
          return (
            <button
              key={f.id}
              type="button"
              className={`mail-folder${folder === f.id ? ' mail-folder-on' : ''}`}
              aria-current={folder === f.id ? 'true' : undefined}
              onClick={() => {
                setFolder(f.id)
                setSelected(null)
              }}
            >
              <span className="mail-folder-label">{f.label}</span>
              {/* 개수는 실제 메일 수다. 0이면 아예 표시하지 않는다 — 0 뱃지는 소음이다. */}
              {count > 0 && <span className="mail-folder-count">{count}</span>}
            </button>
          )
        })}
      </nav>

      <ul className="mail-list">
        {mails.length === 0 && <li className="mail-empty">비어 있습니다.</li>}
        {mails.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className={`mail-item${current?.id === m.id ? ' mail-item-on' : ''}`}
              onClick={() => setSelected(m.id)}
              aria-current={current?.id === m.id ? 'true' : undefined}
            >
              {/* 발신처 프로필 자리. 사진이 없으므로 첫 글자 타일을 둔다. */}
              <span className="mail-avatar" aria-hidden="true">
                {m.from.slice(0, 1)}
              </span>
              <span className="mail-item-body">
                <span className="mail-item-top">
                  <span className="mail-from">{m.from}</span>
                  <span className="mail-time">{m.time}</span>
                </span>
                <span className="mail-subject">{m.subject ?? '(제목 없음)'}</span>
                {/* 미리보기 한 줄 — 레퍼런스처럼 제목 아래 본문 앞부분을 흘린다. */}
                <span className="mail-preview">{m.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current ? (
        <article className="mail-view">
          {/* ux `back-behavior`: 폰에서 본문은 목록을 **덮으므로** 돌아갈 길이 보여야 한다.
              데스크톱은 두 칸이 나란히 있어 필요 없다. */}
          {mobile && (
            <button
              type="button"
              className="mail-back"
              onClick={() => setSelected(null)}
            >
              목록으로
            </button>
          )}
          <h3 className="mail-view-subject">{current.subject ?? '(제목 없음)'}</h3>
          <p className="mail-view-from">
            <span className="mail-avatar" aria-hidden="true">
              {current.from.slice(0, 1)}
            </span>
            <span className="mail-view-meta">
              <b>{current.from}</b>
              <span>{current.time}</span>
            </span>
          </p>
          <p className="mail-view-text">{current.text}</p>
        </article>
      ) : (
        <p className="mail-empty mail-view">읽을 메일을 선택하세요.</p>
      )}
    </div>
  )
}
