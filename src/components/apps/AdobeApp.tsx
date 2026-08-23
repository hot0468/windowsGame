import { useState } from 'react'
import { findActivity } from '../../data/activities'
import { docFor, findAdobeApp } from '../../data/adobeApps'
import { findGig } from '../../data/gigs'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { activeContract, daysLeft, gigProgress } from '../../systems/gigs'
import { ActivityConfirm } from './ActivityConfirm'
import { WorkList } from './WorkList'
import type { WorkTool } from '../../data/works'
import type { AdobeApp as AdobeAppData } from '../../data/adobeApps'
import './AdobeApp.css'

/**
 * 어도비 도구 셋의 **프로그램 창**(`WindowKind: 'photoshop' | 'premiere' | 'audition'`).
 *
 * ## 왜 도구 실행 창(`ToolRun`)이 아닌가
 * `ToolRun`은 **켠 뒤에 흐르는 작업 장면**이다. 이 창은 그 앞자리 — 무엇을 하고 있는지
 * 보여 주는 **프로그램 자체**다(설계자 지시 2026-08-21: "VS코드처럼 실행하면 해당 프로그램
 * 실제 화면이 뜨고 거기서 행동을 선택"). 그래서 배선이 `VsCodeApp`과 한 글자도 안 다르다:
 * 프로그램 화면 → ▶ → `ActivityConfirm` → `ToolRun`.
 *
 * ## ⚠️ 셋이 한 컴포넌트다
 * 실제 어도비 도구들이 같은 크롬을 공유한다(메뉴 줄 · 왼쪽 패널 · 무대 · 상태 표시줄).
 * 갈리는 것은 **무대 하나**뿐이라 그 값만 데이터가 정한다(`AdobeApp.stage`). 사유는
 * `data/adobeApps.ts` 머리말에 있다.
 *
 * ## ⚠️ 이 창은 판정을 만들지 않는다
 * 업무량·마감·보수는 `systems/gigs.ts`가, 실행 가능 여부는 `canRun`이, 증감·경고는
 * `ActivityConfirm`이 진다. 여기가 하는 일은 **지금 상태를 그 프로그램의 말로 옮기는 것**
 * 뿐이다: 남은 업무량 → 상태 표시줄, 마감 → 상태 표시줄, 일감 → 열린 문서 이름.
 *
 * ## ⚠️ 동작하지 않는 크롬은 표시 전용이다
 * 메뉴 줄·도구 상자·패널 항목은 **누를 수 없고 `aria-hidden`이다**(죽은 컨트롤 금지,
 * `VsCodeApp`과 같은 규칙). 실제로 동작하는 것은 **▶ 하나**다 — VS 코드는 파일 목록도
 * 동작하지만, 여기서 문서를 바꾸는 것은 **받아 둔 일감**이지 플레이어가 아니다.
 */
export function AdobeApp({ program }: { program: string }) {
  const state = useGameStore((s) => s.state)
  const [confirming, setConfirming] = useState(false)
  /** 확인창이 무엇을 확정할지 — 고른 작업물 id. 없으면 새로 만들기다. */
  const [target, setTarget] = useState<string | undefined>(undefined)
  const refine = useGameStore((s) => s.refineWork)
  const app = findAdobeApp(program)

  if (!state || !app) return null
  const activity = findActivity(app.activityId)
  if (!activity) return null

  const contract = activeContract(state)
  const gig = contract ? findGig(contract.gigId) : undefined
  /* ⚠️ **내 도구의 일감이 아니면 없는 셈 친다**(`VsCodeApp`과 같은 규칙) — 포토샵 일감을
     받아 둔 채 오디션을 켜면 엉뚱한 진행도가 뜬다. 도구가 하나뿐인 것은 `Gig.tool`이 정한다. */
  const mine = gig?.tool === app.id ? gig : undefined
  /* 의뢰 진행은 계약이 아니라 **작업물**이 갖는다(2026-08-22) — 몇 개가 요구 등급에 닿았는가. */
  const progress = gigProgress(state)
  const due = mine ? daysLeft(state) : undefined
  const doc = docFor(app, mine?.id)

  return (
    <div className={`ad ad-${app.id}`}>
      {/* ── 메뉴 줄. 표시 전용이다. ─────────────────────────── */}
      <div className="ad-menu" aria-hidden="true">
        <AppIcon name={app.icon} size={16} />
        {app.menus.map((m) => (
          <span key={m} className="ad-menu-item">
            {m}
          </span>
        ))}
      </div>

      {/* ── 문서 탭 + ▶. **이 창에서 게임을 움직이는 것은 ▶ 하나다.** ── */}
      <div className="ad-tabs">
        <span className="ad-tab ad-tab-on">
          {doc}.{app.ext}
        </span>
        <span className="ad-tab-fill" aria-hidden="true" />
        <button type="button" className="ad-run" onClick={() => setConfirming(true)}>
          <span className="ad-run-glyph" aria-hidden="true" />
          작업하기
        </button>
      </div>

      <div className="ad-body">
        {/* ── 도구 상자. 표시 전용 — 실제 어도비 창의 왼쪽 세로 띠 자리다. ── */}
        <div className="ad-tools" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className={`ad-tool${i === 0 ? ' ad-tool-on' : ''}`} />
          ))}
        </div>

        {/* ⚠️ **프로그램마다 작업물이 사는 자리가 다르다**(2026-08-22 설계자 지시):
            포토샵은 **작업 영역이 곧 파일 관리 화면**이고(어도비의 "최근 항목" 판),
            프리미어·오디션은 **왼쪽 파일 영역**이 목록을 지고 무대는 그대로 남는다.
            규칙은 한 벌이고(`WorkList`) 모양만 갈린다. */}
        {app.id === 'photoshop' ? (
          <div className="ad-stage ad-stage-files">
            <WorkList
              tool="photoshop"
              variant="grid"
              onRefine={(id) => {
                setTarget(id)
                setConfirming(true)
              }}
              onNew={() => {
                setTarget(undefined)
                setConfirming(true)
              }}
            />
          </div>
        ) : (
          <>
            <WorkList
              tool={app.id as WorkTool}
              variant="rail"
              onRefine={(id) => {
                setTarget(id)
                setConfirming(true)
              }}
              onNew={() => {
                setTarget(undefined)
                setConfirming(true)
              }}
            />
            <div className="ad-stage">
              <Stage app={app} />
            </div>
          </>
        )}

        {/* ── 오른쪽 패널. 프로그램마다 부르는 이름이 다르다. ── */}
        <div className="ad-panel">
          <p className="ad-panel-head">{app.panel.title}</p>
          <ul className="ad-panel-list" aria-hidden="true">
            {app.panel.items.map((item, i) => (
              <li key={item} className={`ad-panel-item${i === 0 ? ' ad-panel-item-on' : ''}`}>
                <span className="ad-panel-chip" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 상태 표시줄. 왼쪽은 진짜 값, 오른쪽은 표시 전용. ── */}
      <div className="ad-status">
        <span className="ad-status-item">{mine ? mine.title : '받아 둔 일 없음'}</span>
        <span className="ad-status-item">
          {mine ? `${mine.wants.rank}등급 ${progress.done}/${progress.total}` : '개인 작업'}
        </span>
        {due !== undefined && (
          <span className="ad-status-item">
            {due === 0 ? '오늘이 마감' : `마감까지 ${due}일`}
          </span>
        )}
        <span className="ad-status-fill" aria-hidden="true" />
        <span className="ad-status-item" aria-hidden="true">
          100%
        </span>
      </div>

      {confirming && (
        <ActivityConfirm
          activity={activity}
          kicker={app.name}
          title={target ? '이 작업물을 보강할까요?' : '새 작업물을 만들까요?'}
          actionLabel={target ? '보강하기' : '만들기'}
          onClose={() => setConfirming(false)}
          /* ⚠️ 고른 파일을 보강하는 경로만 `onCommit`으로 지난다 — 기본 실행(`doActivity`)은
             대상을 모르므로 목록에서 고른 것이 무시된다. */
          onCommit={target ? () => refine(target) : undefined}
        />
      )}
    </div>
  )
}

/**
 * 무대. **이미지가 아니라 상자 몇 개다**(오프라인 규칙 — `ToolRun`의 그림들과 같다).
 * 움직임은 `transform`·`opacity`만 쓰고, 멈췄을 때 고장으로 안 보이는 모습은 CSS가 정한다.
 */
function Stage({ app }: { app: AdobeAppData }) {
  if (app.stage === 'canvas') {
    /* 캔버스 — 격자 위에 얹힌 그림 한 장. 실제 포토샵처럼 **문서가 판 가운데 떠 있다.** */
    return (
      <div className="ad-canvas" aria-hidden="true">
        <span className="ad-canvas-sheet">
          <span className="ad-shape ad-shape-a" />
          <span className="ad-shape ad-shape-b" />
          <span className="ad-shape ad-shape-c" />
        </span>
      </div>
    )
  }

  if (app.stage === 'timeline') {
    /* 프리뷰 + 타임라인. 영상은 **가로로 흐르는 것**이라 트랙이 옆으로 눕는다. */
    return (
      <div className="ad-timeline" aria-hidden="true">
        <span className="ad-preview" />
        <span className="ad-tracks">
          {[
            [18, 34, 22],
            [40, 26],
            [70],
          ].map((clips, row) => (
            <span key={row} className="ad-track">
              {clips.map((w, i) => (
                <span key={i} className={`ad-clip ad-clip-${row}`} style={{ width: `${w}%` }} />
              ))}
            </span>
          ))}
          <span className="ad-playhead" />
        </span>
      </div>
    )
  }

  /* 파형. 소리는 **위아래로 움직이는 것**이라 막대가 가운데 선을 기준으로 벌어진다. */
  return (
    <div className="ad-wave" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <span key={row} className="ad-wave-row">
          {Array.from({ length: 48 }, (_, i) => (
            <span
              key={i}
              className="ad-wave-bar"
              /* 결정적인 높이다 — `Math.random`을 쓰면 매 렌더 파형이 춤춘다. */
              style={{ height: `${18 + ((i * 7 + row * 13) % 9) * 9}%` }}
            />
          ))}
        </span>
      ))}
    </div>
  )
}
