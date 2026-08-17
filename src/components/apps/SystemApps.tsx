import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { ACTIVITIES } from '../../data/activities'
import { useGameStore } from '../../store/gameStore'
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

/* 구 작업 관리자(열린 창 목록 + 작업 끝내기)는 2026-08-17에 진짜 프로세스 판형의
   `TaskMgrApp`으로 대체되어 삭제됐다. 되살리지 말 것 — [작업 끝내기]가 창을 닫는 것은
   이 게임에 대응 동작이 없는 죽은 힘이었다. */

/**
 * 명령 프롬프트. **동작하는 명령만** 둔다 — 셸을 흉내 내려고 아무 문자열이나 받고
 * "명령을 찾을 수 없습니다"만 돌려주면 장식이 된다.
 * 게임 상태를 바꾸는 명령은 넣지 않는다: 여기서 스탯을 고칠 수 있으면 게임이 아니게 된다.
 */
const COMMANDS: Record<string, (ctx: { day: number; slot: string }) => string[]> = {
  help: () => ['사용할 수 있는 명령: help, date, stats, activities, scan, clean, defrag, ver, cls'],
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

/*
 * ── 조각 모음 (2026-08-17) ──────────────────────────────────────────────
 * 옛 윈도우 디스크 조각 모음의 블록 판을 문자(█▒·)로 돌리는 **순수 장난감**이다 —
 * "스탯을 고치는 명령을 넣지 않는다"는 이 파일의 규칙 그대로, 끝나도 기분만 좋아진다.
 * 보고 있으면 멍해지는 그 감성이 존재 이유의 전부라 결과 보상을 붙이지 않는다.
 */
const DEFRAG_ROWS = 4
const DEFRAG_COLS = 30
const DEFRAG_TICKS = 18
const DEFRAG_TICK_MS = 280

/**
 * `progress`(0~1)만큼 정리된 판. ⚠️ 정리 전 무늬는 셀 색인의 결정적 해시다 —
 * 장식이지만 같은 판이 매번 같은 그림을 그려야 "다시 굴리기"가 아예 없는 이 게임의
 * 결에 맞는다(고전 LCG 상수 — 게임 굴림 상수들과 무관한 순수 장식이다).
 */
function defragFrame(progress: number): string[] {
  const cells = DEFRAG_ROWS * DEFRAG_COLS
  const sorted = Math.floor(cells * progress)
  return Array.from({ length: DEFRAG_ROWS }, (_, r) =>
    Array.from({ length: DEFRAG_COLS }, (_, c) => {
      const i = r * DEFRAG_COLS + c
      if (i < sorted) return '█'
      const h = (i * 1103515245 + 12345) >>> 0
      return h % 5 === 0 ? '·' : h % 3 === 0 ? '█' : '▒'
    }).join(''),
  )
}

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
  /* 조각 모음 타이머. 창을 닫으면 정리한다 — 안 하면 닫힌 창의 setLines가 계속 돈다. */
  const defragTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (defragTimer.current !== null) window.clearInterval(defragTimer.current)
    },
    [],
  )
  if (!state) return null

  /** 실제 cmd처럼 경로가 프롬프트에 들어간다. 사용자 이름은 플레이어 이름이다. */
  const prompt = `C:\\Users\\${state.playerName}>`

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase()
    if (!cmd) return
    /* ⚠️ 조각 모음이 도는 동안은 입력을 통째로 무시한다(실제 콘솔이 그렇다) —
       중간에 줄이 끼면 판을 제자리에서 다시 그리는 slice가 엉뚱한 줄을 먹는다. */
    if (defragTimer.current !== null) return
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
    if (cmd === 'defrag') {
      const header = [echo, '드라이브 C: 의 조각 모음을 시작합니다...']
      const done = ['조각 모음이 완료되었습니다. 빨라진 것은 기분뿐이지만, 그거면 됐다.']
      /* 모션을 줄인 사람에게는 과정을 흘리지 않고 결과만 준다(Daybreak의 모션 감소 규칙). */
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setLines((l) => [...l, ...header, ...defragFrame(1), ...done])
        return
      }
      let tick = 0
      setLines((l) => [...l, ...header, ...defragFrame(0), '진행 0%'])
      defragTimer.current = window.setInterval(() => {
        tick += 1
        const p = Math.min(1, tick / DEFRAG_TICKS)
        const finished = tick >= DEFRAG_TICKS
        /* 판 + 진행 줄(ROWS+1)만 제자리에서 갈아 끼운다 — 로그를 늘리며 그리면
           다 끝났을 때 화면이 판 열여덟 장으로 도배된다. */
        setLines((l) => [
          ...l.slice(0, -(DEFRAG_ROWS + 1)),
          ...defragFrame(p),
          `진행 ${Math.round(p * 100)}%`,
          ...(finished ? done : []),
        ])
        if (finished) {
          window.clearInterval(defragTimer.current!)
          defragTimer.current = null
        }
      }, DEFRAG_TICK_MS)
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
