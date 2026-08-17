import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import './MinesweeperApp.css'

/**
 * 지뢰찾기 — 클래식 9×9·지뢰 10개.
 *
 * ⚠️ **판은 이 컴포넌트 안에서만 산다**(솔리테어·그림판과 같은 부류). 다른 점은 여는
 * 자리 하나다: 활동 `game`을 **직접 실행**해야 `doActivity`가 띄운다(콜센터가 출근에
 * 붙는 것과 같은 규칙 — 스케줄러·자동 진행으로 지나간 실행은 창이 안 뜬다).
 *
 * ⚠️ **연출이지 규칙이 아니다.** 멘탈·gaming 증감은 창이 열리기 전에 `doActivity`가
 * 이미 확정했고, 여기서는 이기든 지든 게임 상태에 아무것도 쓰지 않는다.
 * ponytail: 승패 보상 없음 — 보상을 달려면 밸런스 축(멘탈 회복처 4곳 불변식)부터 다시 봐야 한다
 *
 * 보드 로직은 아래 순수 함수들이고 `MinesweeperApp.test.ts`가 지킨다. 게임 상태를 안
 * 만지므로 `systems/`의 `Math.random` 금지 규칙과 무관하다(솔리테어가 시드를 화면에서
 * 정하는 것과 같은 판단).
 */

export const ROWS = 9
export const COLS = 9
export const MINES = 10

export interface Cell {
  mine: boolean
  open: boolean
  flag: boolean
  /** 주변 지뢰 수. 지뢰 칸에서는 무의미하다. */
  adj: number
}

/** 보드는 평평한 배열이다 — index = 행 × COLS + 열. */
export type Board = Cell[]

export function freshBoard(): Board {
  return Array.from({ length: ROWS * COLS }, () => ({
    mine: false,
    open: false,
    flag: false,
    adj: 0,
  }))
}

function neighbors(i: number): number[] {
  const r = Math.floor(i / COLS)
  const c = i % COLS
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc)
    }
  }
  return out
}

/** 지정한 칸들에 지뢰를 놓고 모든 칸의 `adj`를 계산한다. 테스트가 판을 짜는 입구이기도 하다. */
export function minedBoard(mines: Iterable<number>): Board {
  const next = freshBoard()
  for (const i of mines) next[i].mine = true
  for (let i = 0; i < next.length; i++) {
    next[i].adj = neighbors(i).filter((n) => next[n].mine).length
  }
  return next
}

/**
 * 첫 클릭 **뒤에** 지뢰를 배치한다 — `safe` 칸은 절대 지뢰가 아니다.
 * 첫 클릭 전에 꽂아 둔 깃발은 살려서 옮긴다.
 */
export function placeMines(board: Board, safe: number, rand: () => number = Math.random): Board {
  const picks = new Set<number>()
  while (picks.size < MINES) {
    const i = Math.floor(rand() * ROWS * COLS)
    if (i !== safe) picks.add(i)
  }
  const next = minedBoard(picks)
  for (let i = 0; i < next.length; i++) next[i].flag = board[i].flag
  return next
}

/** 칸을 연다. 0칸이면 flood fill — 깃발 꽂힌 칸은 열지 않는다(클래식 규칙). */
export function openCell(board: Board, i: number): Board {
  if (board[i].open || board[i].flag) return board
  const next = board.map((c) => ({ ...c }))
  const queue = [i]
  while (queue.length > 0) {
    const cur = queue.pop()!
    const cell = next[cur]
    if (cell.open) continue
    cell.open = true
    if (!cell.mine && cell.adj === 0) {
      for (const n of neighbors(cur)) {
        if (!next[n].open && !next[n].flag) queue.push(n)
      }
    }
  }
  return next
}

/** 깃발 토글. 이미 연 칸은 그대로 돌려준다. */
export function toggleFlag(board: Board, i: number): Board {
  if (board[i].open) return board
  const next = board.map((c) => ({ ...c }))
  next[i].flag = !next[i].flag
  return next
}

/** 승리 = 지뢰가 아닌 칸을 전부 열었다. 깃발은 승패와 무관하다(클래식 규칙). */
export function isWon(board: Board): boolean {
  return board.every((c) => c.mine || c.open)
}

export function isLost(board: Board): boolean {
  return board.some((c) => c.mine && c.open)
}

export function flagCount(board: Board): number {
  return board.filter((c) => c.flag).length
}

/** LED 카운터 표기. 클래식처럼 3자리, 음수는 `-`가 한 자리를 먹는다. */
const led = (n: number): string =>
  n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0')

const numberName = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟']

export function MinesweeperApp() {
  const [board, setBoard] = useState<Board>(freshBoard)
  /** 첫 클릭 전에는 지뢰가 없다 — 배치는 첫 클릭이 한다. */
  const [armed, setArmed] = useState(false)
  const [seconds, setSeconds] = useState(0)

  const lost = isLost(board)
  const won = armed && isWon(board)
  const done = lost || won

  useEffect(() => {
    if (!armed || done) return
    const t = setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000)
    return () => clearInterval(t)
  }, [armed, done])

  const reset = () => {
    setBoard(freshBoard())
    setArmed(false)
    setSeconds(0)
  }

  const leftClick = (i: number) => {
    if (done || board[i].flag || board[i].open) return
    const base = armed ? board : placeMines(board, i)
    if (!armed) setArmed(true)
    setBoard(openCell(base, i))
  }

  /* 우클릭 = 깃발. 브라우저 메뉴를 막는다(스케줄러의 onContextMenu와 같은 규칙). */
  const rightClick = (e: MouseEvent, i: number) => {
    e.preventDefault()
    if (done || board[i].open) return
    setBoard(toggleFlag(board, i))
  }

  const face = won ? 'mdi:emoticon-cool' : lost ? 'mdi:emoticon-dead' : 'mdi:emoticon'

  return (
    <div className="ms">
      <div className="ms-panel">
        <div className="ms-head">
          <span className="ms-led" aria-label={`남은 지뢰 ${MINES - flagCount(board)}개`}>
            {led(MINES - flagCount(board))}
          </span>
          <button
            type="button"
            className="ms-face"
            onClick={reset}
            aria-label={won ? '이겼다 — 새 판' : lost ? '졌다 — 새 판' : '새 판'}
          >
            <AppIcon name={face} size={22} />
          </button>
          <span className="ms-led" aria-label={`경과 ${seconds}초`}>
            {led(seconds)}
          </span>
        </div>
        <div
          className="ms-grid"
          role="grid"
          aria-label="지뢰밭 9×9"
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((cell, i) => {
            /* 지면 지뢰가 전부 드러나고, 이기면 남은 지뢰에 깃발이 저절로 꽂힌다(클래식). */
            const shown = cell.open || (lost && cell.mine)
            const flagged = !shown && (cell.flag || (won && cell.mine))
            const r = Math.floor(i / COLS) + 1
            const c = (i % COLS) + 1
            return (
              <button
                key={i}
                type="button"
                className={[
                  'ms-cell',
                  shown ? 'ms-open' : '',
                  shown && cell.mine ? (cell.open ? 'ms-boom' : 'ms-mine') : '',
                  shown && !cell.mine && cell.adj > 0 ? `ms-n${cell.adj}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => leftClick(i)}
                onContextMenu={(e) => rightClick(e, i)}
                aria-label={
                  `${r}행 ${c}열` +
                  (flagged
                    ? ' 깃발'
                    : shown
                      ? cell.mine
                        ? ' 지뢰'
                        : cell.adj > 0
                          ? ` 주변 지뢰 ${numberName[cell.adj]}`
                          : ' 빈 칸'
                      : ' 안 연 칸')
                }
              >
                {flagged ? (
                  <AppIcon name="mdi:flag" size={16} className="ms-flag" />
                ) : shown && cell.mine ? (
                  <AppIcon name="mdi:mine" size={16} />
                ) : shown && cell.adj > 0 ? (
                  cell.adj
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
