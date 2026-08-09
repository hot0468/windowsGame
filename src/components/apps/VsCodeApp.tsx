import { useState } from 'react'
import { findActivity } from '../../data/activities'
import { WORK_PER_SESSION, findGig } from '../../data/gigs'
import { projectFor } from '../../data/vscode'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { activeContract, daysLeft } from '../../systems/gigs'
import { ActivityConfirm } from './ActivityConfirm'
import type { CodeSpan, VsFile } from '../../data/vscode'
import './VsCodeApp.css'

/**
 * VS 코드 — **받아 둔 일을 치는 창**(`WindowKind: 'vscode'`).
 *
 * ## 왜 도구 실행 창(`ToolRun`)이 아닌가
 * `ToolRun`은 **켠 뒤에 뜨는 결과 화면**이다(막대 몇 개 + 증감표). 이 창은 그 앞자리 —
 * 무엇을 하고 있는지 보여 주는 **프로그램 자체**다(설계자 지시, 레퍼런스=실제 VS 코드).
 * 클립스튜디오·증기와 같은 부류이고, 실행은 여기서도 확정된 통로(`ActivityConfirm`)를 탄다.
 *
 * ## ⚠️ 이 창은 판정을 만들지 않는다
 * 업무량·마감·보수는 `systems/gigs.ts`가, 실행 가능 여부는 `canRun`이, 증감·경고는
 * `ActivityConfirm`이 진다. 여기가 하는 일은 **지금 상태를 VS 코드의 말로 옮기는 것**뿐이다:
 * 남은 업무량 → 소스 제어 배지, 마감 → 상태 표시줄, 일감 → 열린 파일.
 *
 * ## ⚠️ 동작하지 않는 크롬은 표시 전용이다
 * 활동 표시줄 아이콘·메뉴 줄·미니맵은 **누를 수 없고 `aria-hidden`이다**(죽은 컨트롤 금지).
 * 가짜 OS의 크롬이 그렇듯 "있어 보이게" 두되 **누르면 아무 일 없는 버튼을 만들지는 않는다**.
 * 실제로 동작하는 것은 **딱 둘**: 파일 목록(열린 파일이 바뀐다)과 ▶ 실행이다.
 */

/** 확장자별 아이콘 글자와 색 갈래. 실제 VS 코드의 파일 아이콘 자리를 대신한다. */
const EXT_MARK: Record<VsFile['ext'], string> = {
  ts: 'TS',
  tsx: 'TS',
  js: 'JS',
  html: '<>',
  css: '#',
  py: 'PY',
  md: 'MD',
  json: '{}',
}

/**
 * 활동 표시줄. **표시 전용이다** — 탐색기 하나만 실제로 쓰인다.
 * ⚠️ 아이콘은 **단색 세트(`mdi`)**를 쓴다 — 이 줄은 프로그램 크롬이라 다색 글리프가
 * 들어가면 판이 알록달록해진다(HUD·메신저가 같은 이유로 mdi를 쓴다).
 */
const RAIL = [
  { key: 'explorer', label: '탐색기', icon: 'mdi:file-multiple-outline' },
  { key: 'search', label: '검색', icon: 'mdi:magnify' },
  { key: 'scm', label: '소스 제어', icon: 'mdi:source-branch' },
  { key: 'run', label: '실행', icon: 'mdi:play-circle-outline' },
  { key: 'ext', label: '확장', icon: 'mdi:puzzle-outline' },
] as const

export function VsCodeApp() {
  const state = useGameStore((s) => s.state)
  const [confirming, setConfirming] = useState(false)
  /* ⚠️ **훅은 전부 조기 반환보다 위에 있어야 한다**(리액트 훅 규칙) — 아래에 두면
     `state`가 null이었다가 생기는 순간 훅 개수가 달라진다. 그래서 빈 문자열로 열어 두고,
     실제로 열린 파일은 아래 `shown`이 파생시킨다. */
  const [openFile, setOpenFile] = useState('')
  const activity = findActivity('tool-vscode')!

  if (!state) return null

  const contract = activeContract(state)
  const gig = contract ? findGig(contract.gigId) : undefined
  /* ⚠️ **VS 코드 일감이 아니면 없는 셈 친다** — 포토샵 일감을 받아 둔 채 VS 코드를 켜면
     엉뚱한 진행도가 뜬다. 도구가 하나뿐인 것은 `Gig.tool`이 정한 규칙이다. */
  const mine = gig?.tool === 'vscode' ? gig : undefined
  const project = projectFor(mine?.id)
  const left = mine && contract ? Math.max(0, mine.workload - contract.progress) : 0
  const due = mine ? daysLeft(state) : undefined

  /* 열린 파일은 프로젝트가 바뀌면 따라 바뀐다 — 일감을 새로 받으면 이전 파일 이름이 남아
     목록에 없는 탭이 뜬다. 파생값이라 상태를 되돌리지 않고 여기서 고른다. */
  const shown = project.files.some((f) => f.name === openFile) ? openFile : project.open

  return (
    <div className="vs">
      {/* ── 메뉴 줄. 표시 전용이다. ─────────────────────────── */}
      <div className="vs-menu" aria-hidden="true">
        <AppIcon name="devicon:vscode" size={16} />
        {['파일', '편집', '선택', '보기', '이동', '실행', '···'].map((m) => (
          <span key={m} className="vs-menu-item">
            {m}
          </span>
        ))}
        <span className="vs-omni">{project.folder}</span>
      </div>

      <div className="vs-body">
        {/* ── 활동 표시줄. 표시 전용. 배지만 진짜 값이다. ────── */}
        <div className="vs-rail" aria-hidden="true">
          {RAIL.map((r) => (
            <span
              key={r.key}
              className={`vs-rail-item${r.key === 'explorer' ? ' vs-rail-on' : ''}`}
            >
              <AppIcon name={r.icon} size={22} className="vs-rail-glyph" />
              {/* 소스 제어 배지 = 남은 업무량. VS 코드에서 배지가 "할 일이 몇 개"인
                  자리이므로 뜻이 그대로 맞는다. */}
              {r.key === 'scm' && left > 0 && <span className="vs-badge">{left}</span>}
            </span>
          ))}
        </div>

        {/* ── 탐색기 ────────────────────────────────────────── */}
        <div className="vs-side">
          <p className="vs-side-head">탐색기</p>
          <p className="vs-tree-root">{project.folder.toUpperCase()}</p>
          <ul className="vs-tree">
            {project.files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  className={`vs-file${f.name === shown ? ' vs-file-on' : ''}`}
                  onClick={() => setOpenFile(f.name)}
                >
                  <span className={`vs-ext vs-ext-${f.ext}`}>{EXT_MARK[f.ext]}</span>
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 편집기 ────────────────────────────────────────── */}
        <div className="vs-main">
          <div className="vs-tabs">
            <span className="vs-tab">
              <span className="vs-ext vs-ext-md">{EXT_MARK.md}</span>
              {mine ? mine.title : '연습'}
            </span>
            <span className="vs-tab vs-tab-on">
              <span className="vs-ext vs-ext-ts">{EXT_MARK.ts}</span>
              {shown}
            </span>
            <span className="vs-tab-fill" aria-hidden="true" />
            {/*
             * ⚠️ **이 창에서 유일하게 게임을 움직이는 버튼이다.** VS 코드의 편집기 우상단
             * ▶(실행)이 실제로 있는 자리라 여기 둔다 — 없는 자리에 게임 버튼을 만들면
             * 프로그램으로 안 읽힌다.
             */}
            <button type="button" className="vs-run" onClick={() => setConfirming(true)}>
              <span className="vs-run-glyph" aria-hidden="true" />
              작업하기
            </button>
          </div>

          <p className="vs-crumbs">
            {[...project.crumbs, shown].map((c, i, all) => (
              <span key={c}>
                {c}
                {i < all.length - 1 && <span className="vs-crumb-sep"> › </span>}
              </span>
            ))}
          </p>

          <div className="vs-code">
            <ol className="vs-lines">
              {project.code.map((line, i) => (
                <li key={i} className="vs-line">
                  <span className="vs-gutter">{i + 1}</span>
                  <code className="vs-text">
                    {line.map((span: CodeSpan, j) => (
                      <span key={j} className={span.c ? `vs-${span.c}` : undefined}>
                        {span.t}
                      </span>
                    ))}
                  </code>
                </li>
              ))}
            </ol>
            {/* 미니맵. 코드 줄 수만큼 눈금을 그린다 — 표시 전용. */}
            <div className="vs-minimap" aria-hidden="true">
              {project.code.map((line, i) => (
                <span
                  key={i}
                  className="vs-mini-line"
                  style={{ width: `${Math.min(100, line.reduce((n, s) => n + s.t.length, 0) * 2)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 상태 표시줄. 왼쪽은 진짜 값, 오른쪽은 표시 전용. ── */}
      <div className="vs-status">
        <span className="vs-status-item">⎇ {mine ? mine.id : 'scratch'}</span>
        <span className="vs-status-item">
          남은 작업 {left} · 한 번 켜면 {WORK_PER_SESSION}
        </span>
        {due !== undefined && (
          <span className="vs-status-item">
            {due === 0 ? '오늘이 마감' : `마감까지 ${due}일`}
          </span>
        )}
        <span className="vs-status-fill" aria-hidden="true" />
        <span className="vs-status-item" aria-hidden="true">
          Ln 1, Col 1
        </span>
        <span className="vs-status-item" aria-hidden="true">
          UTF-8
        </span>
        <span className="vs-status-item" aria-hidden="true">
          LF
        </span>
      </div>

      {confirming && (
        <ActivityConfirm
          activity={activity}
          kicker="VS 코드"
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
