import { useState } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { ACTIVITIES } from '../../data/activities'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { getBurnoutPenalty } from '../../systems/burnout'
import { getLivingCost, getWageMultiplier } from '../../systems/economy'
import { cleanBlocker } from '../../systems/malware'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../../types/game'
import './SystemApps.css'

/**
 * 시작 메뉴에서 여는 **시스템 도구** 셋. 게임 세계의 앱이 아니라 게임을 다루는 창이라
 * 한 파일에 모아 둔다 — 셋 다 짧고 서로 성격이 같다.
 */

/**
 * 게임 저장 / 불러오기.
 *
 * ⚠️ 이 게임의 세이브는 **원래 자동**이다(zustand persist). 그래서 "저장" 버튼이 하는 일은
 * 저장이 아니라 **세이브 문자열을 꺼내 주는 것**이고, "불러오기"는 그 문자열을 되돌려
 * 넣는 것이다. 자동 저장을 수동 저장처럼 위장하면 "저장 안 눌러서 날아갔다"는
 * 오해를 만든다 — 그래서 화면에 자동 저장 사실을 먼저 적는다.
 */
export function SaveApp() {
  const state = useGameStore((s) => s.state)
  const importSave = useGameStore((s) => s.importSave)
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="sys">
      <p className="sys-note">
        진행 상황은 <b>자동으로 저장</b>됩니다. 아래는 세이브를 다른 곳으로 옮길 때 씁니다.
      </p>

      <div className="sys-row">
        <button
          className="sys-btn"
          disabled={!state}
          onClick={() => {
            setText(JSON.stringify(state))
            setNotice('세이브를 아래 칸에 꺼냈습니다. 복사해 두세요.')
          }}
        >
          세이브 꺼내기
        </button>
        <button
          className="sys-btn"
          disabled={!text.trim()}
          onClick={() => {
            const ok = importSave(text)
            setNotice(ok ? '불러왔습니다.' : '세이브 형식이 아닙니다.')
          }}
        >
          불러오기
        </button>
      </div>

      <label className="sys-label" htmlFor="sys-save-box">
        세이브 데이터
      </label>
      <textarea
        id="sys-save-box"
        className="sys-box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 세이브를 붙여 넣고 [불러오기]를 누르세요."
        rows={6}
        spellCheck={false}
      />
      {/* role="status"로 두면 스크린 리더가 결과를 읽어 준다(ux `aria-live-errors`). */}
      <p className="sys-status" role="status">
        {notice}
      </p>
    </div>
  )
}

/**
 * 작업 관리자. 실제 윈도우처럼 "지금 무엇이 돌고 있나"를 보여 준다 —
 * 다만 프로세스가 아니라 **열린 창과 게임의 부하**다. 가짜 CPU 그래프를 그리는 대신
 * 실제로 읽을 값을 둔다(포털 지표와 같은 판단).
 */
export function TaskManagerApp() {
  const windows = useWindowStore((s) => s.windows)
  const close = useWindowStore((s) => s.close)
  const state = useGameStore((s) => s.state)
  if (!state) return null

  /* 번아웃은 활동별로 재는 값이라 "마지막으로 한 활동"을 기준으로 본다 —
     그게 지금 플레이어가 실제로 물고 있는 페널티다. */
  const lastId = state.recentActivities[state.recentActivities.length - 1]
  const burnout = lastId ? getBurnoutPenalty(state.recentActivities, lastId) : null

  return (
    <div className="sys">
      <table className="sys-table">
        <thead>
          <tr>
            <th>열린 창</th>
            <th>상태</th>
            <th aria-label="작업" />
          </tr>
        </thead>
        <tbody>
          {windows.length === 0 && (
            <tr>
              <td colSpan={3} className="sys-empty">
                열린 창이 없습니다.
              </td>
            </tr>
          )}
          {windows.map((w) => (
            <tr key={w.id}>
              <td>{w.title}</td>
              <td>{w.minimized ? '최소화' : '실행 중'}</td>
              <td>
                <button className="sys-kill" onClick={() => close(w.id)}>
                  작업 끝내기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="sys-head">시스템 부하</h4>
      <dl className="sys-defs">
        <dt>번아웃 누적</dt>
        <dd>
          {burnout && burnout.efficiency < 1
            ? `효율 ${Math.round(burnout.efficiency * 100)}% · 멘탈 -${burnout.mentalPenalty}`
            : '없음'}
        </dd>
        <dt>오늘 생활비</dt>
        <dd>{getLivingCost(state).toLocaleString('ko-KR')}원</dd>
        <dt>알바비 배율</dt>
        <dd>×{getWageMultiplier(state.day).toFixed(2)}</dd>
      </dl>
    </div>
  )
}

/**
 * 명령 프롬프트. **동작하는 명령만** 둔다 — 셸을 흉내 내려고 아무 문자열이나 받고
 * "명령을 찾을 수 없습니다"만 돌려주면 장식이 된다.
 * 게임 상태를 바꾸는 명령은 넣지 않는다: 여기서 스탯을 고칠 수 있으면 게임이 아니게 된다.
 */
const COMMANDS: Record<string, (ctx: { day: number; slot: string }) => string[]> = {
  help: () => ['사용할 수 있는 명령: help, date, stats, activities, scan, clean, ver, cls'],
  date: (c) => [`${c.day}일차 ${c.slot === 'afternoon' ? '오후' : '오전'}`],
  activities: () => ACTIVITIES.map((a) => `${a.id.padEnd(10)} ${a.label} — ${a.description}`),
  /* ⚠️ 배너와 **같은 한 줄**을 쓴다 — 버전을 두 곳에 적으면 반드시 어긋난다. */
  ver: () => [OS_VERSION],
}

/**
 * 가짜 OS의 버전 한 줄. 배너 첫 줄이자 `ver` 명령의 출력이다.
 * ⚠️ "Microsoft Windows …"를 그대로 쓰지 않는다 — 우리 프로그램이 마이크로소프트의
 * 제품인 척하게 된다. 형태만 빌리고 이름은 이 게임의 가짜 OS 것을 쓴다.
 */
const OS_VERSION = '네이놈 OS [버전 10.0.26200.8875]'

/** 배너. 실제 cmd의 첫 두 줄 자리다. */
const CMD_BANNER = [OS_VERSION, '(c) 네이놈. All rights reserved.', '']

export function CommandPromptApp() {
  const state = useGameStore((s) => s.state)
  /*
   * ⚠️ **이 창이 게임 상태를 바꾸는 자리는 `clean` 하나다.** 파일 첫 주석의 규칙
   * ("스탯을 고치는 명령은 넣지 않는다")은 그대로다 — 여기서 바뀌는 것은 스탯이 아니라
   * **악성코드 감염 여부**이고, 그 판정·결과는 전부 `systems/malware.ts`가 갖는다.
   * IT 랭크 B가 백신 값을 아끼게 해 주는 것이 `tech` 스탯의 실질 보상이다.
   */
  const cleanMalware = useGameStore((s) => s.cleanMalware)
  const [lines, setLines] = useState<string[]>(CMD_BANNER)
  const [input, setInput] = useState('')
  if (!state) return null

  /** 실제 cmd처럼 경로가 프롬프트에 들어간다. 사용자 이름은 플레이어 이름이다. */
  const prompt = `C:\\Users\\${state.playerName}>`

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase()
    if (!cmd) return
    if (cmd === 'cls') {
      setLines([])
      return
    }
    const echo = `${prompt}${raw}`
    if (cmd === 'stats') {
      setLines((l) => [
        ...l,
        echo,
        ...GROWTH_STAT_KEYS.map((k) => `${STAT_NAMES[k].padEnd(6)} ${state.stats[k]}`),
      ])
      return
    }
    /* 진단은 공짜다 — 아무나 실행할 수 있어야 "무엇이 문제인지"를 먼저 알 수 있다. */
    if (cmd === 'scan') {
      setLines((l) => [
        ...l,
        echo,
        ...(state.malware
          ? [
              `위협 1건: Adware.NeverPortal (감염 ${state.malware.day}일차)`,
              '제거하려면 clean 을 입력하십시오.',
            ]
          : ['검사를 마쳤습니다. 위협이 없습니다.']),
      ])
      return
    }
    if (cmd === 'clean') {
      const why = cleanBlocker(state)
      if (!why) cleanMalware()
      setLines((l) => [
        ...l,
        echo,
        // ⚠️ 실패하면 **무엇이 모자란지** 적는다(사유 없는 거절은 이 리포의 금지 사항이다).
        why ?? 'Adware.NeverPortal 을(를) 제거했습니다.',
      ])
      return
    }
    const fn = COMMANDS[cmd]
    setLines((l) => [
      ...l,
      echo,
      ...(fn ? fn({ day: state.day, slot: state.slot }) : [`'${raw}' 은(는) 없는 명령입니다.`]),
    ])
  }

  return (
    <div className="cmd-app">
      {/*
        탭 줄. 실제 명령 프롬프트(윈도우 터미널)는 **탭 바가 곧 제목 표시줄**이라
        회색 OS 타이틀 바가 따로 없다. 그래서 이 창은 bareTitle + dark로 열리고
        여기서 탭을 직접 그린다(브라우저 탭 줄과 같은 구조).
        ⚠️ 오른쪽 여백은 캡션 버튼 3개(46px×3) 자리다.
      */}
      <div className="cmd-tabs">
        <div className="cmd-tab">
          <span className="cmd-tab-glyph" aria-hidden="true" />
          <span className="cmd-tab-title">명령 프롬프트</span>
        </div>
        <span className="cmd-tab-tools" aria-hidden="true">
          <AppIcon name="mdi:plus" size={18} />
          <AppIcon name="mdi:chevron-down" size={18} />
        </span>
      </div>

      <div className="cmd">
        <ol className="cmd-out">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
        <form
          className="cmd-form"
          onSubmit={(e) => {
            e.preventDefault()
            run(input)
            setInput('')
          }}
        >
          <span className="cmd-prompt">{prompt}</span>
          <input
            className="cmd-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="명령 입력"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  )
}
