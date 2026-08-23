import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { LAYERS } from '../../data/layers'
import { TOUR_STEPS } from '../../data/tour'
import { useGameStore } from '../../store/gameStore'
import './Tour.css'

/**
 * 첫 실행 안내 투어 — 딤이 화면을 덮고 **지금 설명하는 UI만 뚫린다.**
 *
 * ## ⚠️ 구멍은 그림자 한 줄이다
 * 대상의 `getBoundingClientRect()` 자리에 빈 div를 놓고
 * `box-shadow: 0 0 0 9999px <딤색>`으로 바깥을 덮는다. SVG 마스크나 딤 조각 넷은
 * 만들지 않는다 — 넷으로 나누면 모서리가 어긋나고 좌표 계산이 네 배가 된다.
 *
 * ## ⚠️ 데스크톱 셸에만 마운트한다
 * 가리키는 대상이 전부 데스크톱 DOM(바탕화면 아이콘·HUD 패널·작업 표시줄)이라
 * 모바일 셸에서는 가리킬 것이 아예 없다(`BlueScreen`과 같은 규칙).
 *
 * ## ⚠️ 게임 상태를 바꾸지 않는다
 * 세이브에 아무것도 쓰지 않는다 — 돌고 있는가(`tourRunning`)는 휘발이다.
 *
 * ## ⚠️ "여기를 누르세요"를 시키지 않는다
 * 대상을 눌러야 넘어가는 방식이 아니라 **쭉 읽고 지나가는** 안내다(설계자 지시).
 * 그래서 딤은 클릭을 막는다 — 안내 중에 뒤를 눌러 창이 열리면 대상 좌표가 어긋난다.
 * 빠져나갈 길은 카드 안의 [건너뛰기]와 Esc다(ux `escape-routes`).
 */

/** 구멍이 대상보다 넉넉하게 뚫리는 여유(px). 딱 붙으면 대상이 잘린 것처럼 보인다. */
const HOLE_PAD = 6
/** 구멍과 설명 카드 사이 간격(px). */
const CARD_GAP = 12
/** 설명 카드 폭(px). ⚠️ `Tour.css`의 `.tour-card { width }`와 같은 값이어야 한다 —
 *  화면 밖으로 나가지 않게 클램프하는 계산이 이 숫자를 쓴다. */
const CARD_W = 320
/**
 * 카드가 대상 **옆**에 설 때 세로 위치를 클램프하는 데 쓰는 어림 높이(px).
 * ⚠️ 위·아래에 설 때는 `top`/`bottom` 중 맞는 쪽을 앵커로 잡아 **높이를 재지 않는다** —
 * 실제 높이를 재려면 렌더를 한 번 더 돌려야 하고, 그 사이 한 프레임이 어긋난다.
 */
const CARD_H = 220
/** 화면 가장자리 최소 여백(px). `Window.tsx`의 `GAP`과 같은 뜻이다. */
const EDGE = 8

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** 대상의 현재 자리. 없으면 null(그 단계는 구멍 없이 카드만 뜬다). */
function measureTarget(target: string): Box | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left - HOLE_PAD, y: r.top - HOLE_PAD, w: r.width + HOLE_PAD * 2, h: r.height + HOLE_PAD * 2 }
}

/**
 * 카드를 구멍 **바깥의 가장 넓은 쪽**에 세운다.
 *
 * ⚠️ 위/왼쪽에 설 때는 `bottom`/`right`를 앵커로 쓴다 — 그래야 카드 높이를 몰라도
 * 화면 밖으로 나가지 않는다. 스탯창처럼 세로로 긴 대상에서 이 판단이 갈린다.
 */
function cardStyle(box: Box | null): CSSProperties {
  if (!box) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  const vw = window.innerWidth
  const vh = window.innerHeight
  const space = { below: vh - (box.y + box.h), above: box.y, right: vw - (box.x + box.w), left: box.x }
  const side = (Object.keys(space) as (keyof typeof space)[]).reduce((a, b) =>
    space[b] > space[a] ? b : a,
  )
  const clamp = (v: number, max: number) => Math.min(Math.max(v, EDGE), Math.max(EDGE, max))
  const cx = clamp(box.x + box.w / 2 - CARD_W / 2, vw - CARD_W - EDGE)
  const cy = clamp(box.y, vh - CARD_H - EDGE)
  switch (side) {
    case 'below':
      return { left: cx, top: box.y + box.h + CARD_GAP }
    case 'above':
      return { left: cx, bottom: vh - box.y + CARD_GAP }
    case 'right':
      return { left: box.x + box.w + CARD_GAP, top: cy }
    default:
      return { right: vw - box.x + CARD_GAP, top: cy }
  }
}

/** 딤 + 스포트라이트 본체. **마운트될 때마다 처음부터 돈다**(설정의 다시 보기가 이 성질을 쓴다). */
function TourRun({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = TOUR_STEPS[index]
  const last = index === TOUR_STEPS.length - 1

  const measure = useCallback(() => setBox(measureTarget(step.target)), [step.target])

  /* ⚠️ **`resize`·`scroll`에 다시 잰다** — 창 크기가 바뀌면 구멍만 제자리에 남는다.
     scroll은 캡처 단계로 듣는다(창 안쪽 스크롤은 window까지 버블하지 않는다). */
  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure])

  /* 단계가 바뀔 때마다 카드에 초점을 준다 — 키보드로 넘길 수 있어야 하고,
     스크린 리더가 바뀐 내용을 읽는 자리도 여기다(ux `focus-management`). */
  useEffect(() => {
    cardRef.current?.focus()
  }, [index])

  const next = () => (last ? onClose() : setIndex((i) => i + 1))

  return (
    <div
      className="tour"
      style={{ zIndex: LAYERS.TOUR }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
          return
        }
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault()
          next()
        }
      }}
    >
      {/* ⚠️ 대상을 못 찾으면 구멍 없이 딤만 깔고 카드를 화면 가운데에 띄운다.
          그 단계를 조용히 건너뛰면 진행 표시의 숫자가 어긋난다. */}
      {box ? (
        <div
          className="tour-hole"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          aria-hidden="true"
        />
      ) : (
        <div className="tour-dim" aria-hidden="true" />
      )}

      <div
        className="tour-card"
        style={cardStyle(box)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        ref={cardRef}
      >
        <p className="tour-step">
          {index + 1} / {TOUR_STEPS.length}
        </p>
        <h2 className="tour-title" id="tour-title">
          {step.title}
        </h2>
        <p className="tour-text">{step.text}</p>
        <div className="tour-foot">
          <button type="button" className="tour-btn" onClick={onClose}>
            건너뛰기
          </button>
          <button type="button" className="tour-btn tour-btn-main" onClick={next}>
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 새 판은 먼저 **"튜토리얼 보시겠습니까?"를 묻는다**(`startGame`이 `tourAsk`를 켠다).
 * ⚠️ 기본 초점은 [보기]다 — 예전에 이 팝업을 없앴던 이유가 기본 초점이 닫는 쪽이라
 * 새 판을 여는 손짓 그대로 안내가 사라졌던 것이다(사유는 `gameStore.startGame`).
 * 설정의 [다시 보기]는 묻지 않고 `tourRunning`을 바로 켠다.
 */
function TourAsk() {
  const answerTour = useGameStore((s) => s.answerTour)
  const yesRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    yesRef.current?.focus()
  }, [])

  return (
    <div
      className="tour"
      style={{ zIndex: LAYERS.TOUR }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          answerTour(false)
        }
      }}
    >
      <div className="tour-dim" aria-hidden="true" />
      <div
        className="tour-card"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-ask-title"
      >
        <h2 className="tour-title" id="tour-ask-title">
          튜토리얼 보시겠습니까?
        </h2>
        {/* ⚠️ **걸음 수를 글자로 박지 않는다** — 단계를 하나 더하면 이 문장이 조용히
            거짓이 된다(2026-08-22에 실제로 여덟이 됐다). 목록에서 세어 적는다. */}
        <p className="tour-text">이 컴퓨터를 쓰는 법을 {TOUR_STEPS.length}걸음으로 안내합니다.</p>
        <div className="tour-foot">
          <button type="button" className="tour-btn" onClick={() => answerTour(false)}>
            건너뛰기
          </button>
          <button
            type="button"
            className="tour-btn tour-btn-main"
            onClick={() => answerTour(true)}
            ref={yesRef}
          >
            보기
          </button>
        </div>
      </div>
    </div>
  )
}

export function Tour() {
  const asking = useGameStore((s) => s.tourAsk)
  const running = useGameStore((s) => s.tourRunning)
  const endTour = useGameStore((s) => s.endTour)

  if (asking) return <TourAsk />
  return running ? <TourRun onClose={endTour} /> : null
}
