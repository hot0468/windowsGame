import { useEffect, useRef, useState } from 'react'
import { PAINT_CANVAS, PAINT_COLORS, PAINT_PAPER, PAINT_WIDTHS } from '../../data/paint'
import './PaintApp.css'

/**
 * 그림판 — 시작 메뉴의 낙서 장난감.
 *
 * ⚠️ **솔리테어와 정확히 같은 부류다**: 육성 게임의 상태를 한 톨도 건드리지 않는다
 * (스탯·턴·돈이 안 움직이므로 밸런스·번아웃·엔딩과 무관하다). 그린 것은 **캔버스
 * 하나에만** 살고 store도 세이브도 타지 않는다 — **창을 닫으면 그림은 사라진다.**
 *
 * ⚠️ **활동 `draw`(클립스튜디오)와 아무 관계가 없다.** 그림을 갤러리에 남기지 않는다 —
 * 남기면 같은 활동에 프로그램이 둘이 되어 바탕화면 아이콘도 둘이 된다. 그래서 이 창은
 * 바탕화면이 아니라 **시작 메뉴**에 있다(바탕화면 = 게임 세계의 앱, 시작 메뉴 = 게임
 * 바깥의 도구).
 *
 * ⚠️ **죽은 컨트롤을 만들지 않는다**(이 프로젝트의 규칙). 실제 그림판의 [저장]·[열기]와
 * 메뉴 줄은 **없다** — 저장할 곳이 없기 때문이다. 남긴 넷(색·굵기·지우개·전체 지우기)은
 * 전부 실제로 동작한다.
 */
export function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(PAINT_COLORS[0].value)
  const [width, setWidth] = useState(PAINT_WIDTHS[1].px)
  const [eraser, setEraser] = useState(false)
  /** 그리는 중인가. **state가 아니라 ref다** — 획 하나에 리렌더가 수백 번 나면 안 된다. */
  const drawing = useRef(false)

  /** 흰 종이를 깔아 둔다. 안 깔면 캔버스가 투명이라 지우개가 회색 작업 영역을 뚫는다. */
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = PAINT_PAPER
    ctx.fillRect(0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height)
  }, [])

  /*
   * ⚠️ 좌표는 `offsetX`가 아니라 **경계 상자에서 뺀다** — 포인터 캡처 중에는 이벤트가
   * 캔버스 밖에서도 오고, 그때 `offsetX`는 캡처 대상 기준이라 값이 흔들린다.
   * 픽셀 버퍼와 CSS 크기가 1:1이라(`PAINT_CANVAS`) 배율 보정은 필요 없다.
   */
  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  /** 지금 붓의 설정을 컨텍스트에 얹는다. 지우개는 **바탕색으로 칠하는 붓**일 뿐이다. */
  const brush = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = eraser ? PAINT_PAPER : color
    ctx.lineWidth = eraser ? width * 2 : width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    /* ⚠️ 포인터 캡처. 마우스·터치·펜이 한 코드로 되고, 창 밖으로 끌고 나갔다 돌아와도
       획이 끊기지 않는다(놓는 순간을 반드시 받는다). */
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const { x, y } = pointAt(e)
    brush(ctx)
    ctx.beginPath()
    ctx.moveTo(x, y)
    /* 점 하나만 찍고 놓는 경우 — 선이 없으면 아무것도 안 그려진다. */
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointAt(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => {
    drawing.current = false
  }

  const clearAll = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = PAINT_PAPER
    ctx.fillRect(0, 0, PAINT_CANVAS.width, PAINT_CANVAS.height)
  }

  return (
    <div className="pt">
      <div className="pt-tools">
        {/* 색. ⚠️ 고른 칸을 **색만으로 알리지 않는다**(ux `color-not-only`) —
            흰 안쪽 테두리 + 진한 바깥 링이 어떤 물감 위에서도 보인다. */}
        <div className="pt-group" role="group" aria-label="색">
          {PAINT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`pt-swatch${!eraser && color === c.value ? ' pt-swatch-on' : ''}`}
              style={{ background: c.value }}
              aria-label={c.name}
              aria-pressed={!eraser && color === c.value}
              onClick={() => {
                setColor(c.value)
                /* 색을 고르면 지우개는 풀린다 — 안 풀면 "색을 골랐는데 흰 선이 나오는" 창이 된다. */
                setEraser(false)
              }}
            />
          ))}
        </div>

        <span className="pt-sep" aria-hidden="true" />

        <div className="pt-group" role="group" aria-label="붓 굵기">
          {PAINT_WIDTHS.map((w) => (
            <button
              key={w.px}
              type="button"
              className={`pt-width${width === w.px ? ' pt-width-on' : ''}`}
              aria-label={w.name}
              aria-pressed={width === w.px}
              onClick={() => setWidth(w.px)}
            >
              {/* 굵기는 글자가 아니라 **점 크기**로 보여 준다. 뜻은 aria-label이 진다. */}
              <span className="pt-dot" style={{ width: w.px, height: w.px }} aria-hidden="true" />
            </button>
          ))}
        </div>

        <span className="pt-sep" aria-hidden="true" />

        <button
          type="button"
          className={`pt-btn${eraser ? ' pt-btn-on' : ''}`}
          aria-pressed={eraser}
          onClick={() => setEraser((v) => !v)}
        >
          지우개
        </button>
        <button type="button" className="pt-btn" onClick={clearAll}>
          전체 지우기
        </button>
      </div>

      <div className="pt-desk">
        {/* ⚠️ 크기는 **속성 둘뿐이고 CSS는 캔버스 크기를 건드리지 않는다** — `<canvas>`의
            기본 크기가 곧 픽셀 버퍼라 이렇게 두면 1:1이 저절로 지켜진다. CSS로 늘리는
            순간 그린 선이 커서를 따라오지 않는다(`data/paint.ts` 주석). */}
        <canvas
          ref={canvasRef}
          className="pt-canvas"
          width={PAINT_CANVAS.width}
          height={PAINT_CANVAS.height}
          aria-label="그림판 캔버스"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
    </div>
  )
}
