import { useEffect, useState } from 'react'
import {
  SEAT_BLOCKS,
  SEAT_COLS,
  SEAT_COUNT,
  SEAT_LIT_MS,
  SEAT_MISS_LIMIT,
  SEAT_ROWS,
} from '../../../data/shows'
import type { Show } from '../../../data/shows'
import { AppIcon } from '../../../icons/AppIcon'

/**
 * 노24 좌석 선택 — 예매의 마지막 단계.
 *
 * ## 왜 반응 속도를 시험하는가
 * 설계자 지시: **"0.5초만에 불 들어와 있는 좌석 하나를 눌러야 예매가 성공한다."**
 * 인기 공연 예매가 실제로 그런 일이라서다. 이 게임에서 돈으로 살 수 없는 것이 하나쯤은
 * 있어야 하고, 그것이 좌석이다. ⚠️ **성공해야만 일정이 잡힌다** — 실패해도 잃는 것은
 * 없다(턴도 돈도 안 쓴다). 대가는 다시 눌러야 한다는 것뿐이다.
 *
 * ## 떠 있는 창이 아니라 **화면을 갈아 끼운다**
 * ⚠️ **모달로 만들지 말 것.** `.tk`는 컨테이너 쿼리를 쓰느라 `container-type`이 걸려 있고,
 * 그러면 그 안의 `position: fixed`는 뷰포트가 아니라 **사이트 판 전체**를 기준으로 잡혀
 * 아래쪽 카드에서 연 창이 화면 밖에 놓일 수 있다. 0.5초를 다투는 화면이 스크롤 밖에
 * 있으면 게임이 성립하지 않는다. 목록을 통째로 이 화면으로 바꾸면 그 문제가 없다
 * (실제 예매 사이트도 좌석 선택은 별도 화면이다).
 *
 * ## 결정성
 * ⚠️ **`Math.random`을 쓰지 않는다**(이 리포 전역 규칙). 불이 옮겨 다니는 순서는
 * 아래 `nextSeat`의 **전주기 LCG**다 — 한 바퀴(128칸)를 도는 동안 같은 자리가 두 번
 * 걸리지 않아 "방금 그 자리"를 노리는 요행이 통하지 않는다.
 * 실시간인 것은 `setInterval` 하나뿐이고 세이브에도 `systems/`에도 닿지 않는다
 * (콜센터 미니게임과 같은 규칙).
 */

/**
 * 다음에 불이 들어올 자리.
 *
 * `SEAT_COUNT`(128)에 대한 전주기 LCG다(Hull–Dobell: 61이 홀수 · 37−1=36이 4의 배수).
 * 곱수를 손보려면 이 조건을 함께 확인해야 한다 — 안 그러면 주기가 짧아져 몇 자리만
 * 번갈아 깜빡인다.
 */
function nextSeat(index: number): number {
  return (index * 37 + 61) % SEAT_COUNT
}

/** 좌석 이름. 번호는 줄(행)과 구역에서 파생한다 — 좌석마다 이름을 저장하지 않는다. */
function seatName(index: number): string {
  const row = Math.floor(index / SEAT_COLS)
  let col = index % SEAT_COLS
  for (const block of SEAT_BLOCKS) {
    if (col < block.cols) return `${block.id}구역 ${row + 1}열 ${col + 1}번`
    col -= block.cols
  }
  return `${row + 1}열`
}

export function SeatPicker({
  show,
  planLabel,
  onBook,
  onClose,
}: {
  show: Show
  /** 예매되면 잡힐 일정("12일차 오후"). 누르기 전에 보여 준다. */
  planLabel: string
  /** 성공했을 때 실제로 일정을 잡는다. 좌석 이름은 영수증 문구용이다. */
  onBook: (seat: string) => void
  onClose: () => void
}) {
  /* 첫 자리는 공연마다 다르게 둔다 — 늘 같은 칸에서 시작하면 그 자리에 손을 얹고 기다린다. */
  const [lit, setLit] = useState(() => nextSeat(show.id.length * 7))
  const [misses, setMisses] = useState(0)
  const [result, setResult] = useState<'ok' | 'fail' | null>(null)
  const [seat, setSeat] = useState('')

  /* ⚠️ 결과가 나오면 반드시 멈춘다. 언마운트 정리도 함께다(보이지 않는 화면이 계속
     리렌더를 시키는 것을 막는다 — 콜센터 타이머와 같은 규칙). */
  useEffect(() => {
    if (result) return
    const id = window.setInterval(() => setLit(nextSeat), SEAT_LIT_MS)
    return () => window.clearInterval(id)
  }, [result])

  function tap(index: number) {
    if (result) return
    if (index === lit) {
      const name = seatName(index)
      setSeat(name)
      setResult('ok')
      onBook(name)
      return
    }
    const next = misses + 1
    setMisses(next)
    if (next >= SEAT_MISS_LIMIT) setResult('fail')
  }

  function retry() {
    setMisses(0)
    setResult(null)
    setLit(nextSeat)
  }

  return (
    <section className="tk-book" aria-labelledby="tk-book-h">
      <header className="tk-book-head">
        <h2 className="tk-book-title" id="tk-book-h">
          좌석 선택
        </h2>
        <p className="tk-book-sub">
          「{show.title}」 · {show.venue} · {planLabel} 관람 예정
        </p>
        {/* 규칙을 먼저 적는다. 0.5초짜리 시험을 설명 없이 시작시키지 않는다. */}
        <p className="tk-book-rule">
          <AppIcon name="mdi:timer-outline" size={15} />
          불이 들어온 좌석을 <strong>0.5초 안에</strong> 눌러야 예매됩니다. 빈자리를{' '}
          {SEAT_MISS_LIMIT}번 누르면 좌석이 모두 나갑니다.
        </p>
      </header>

      <p className="tk-stage" aria-hidden="true">
        STAGE
      </p>

      <div className="tk-seat-map">
        {SEAT_BLOCKS.map((block, bi) => {
          /* 구역의 첫 칸이 한 줄에서 몇 번째인가. 앞 구역들의 폭을 더한 값이다. */
          const offset = SEAT_BLOCKS.slice(0, bi).reduce((n, b) => n + b.cols, 0)
          return (
            <div key={block.id} className="tk-seat-block">
              <span className="tk-seat-block-id">{block.id}</span>
              <div
                className="tk-seat-grid"
                style={{ gridTemplateColumns: `repeat(${block.cols}, 1fr)` }}
              >
                {Array.from({ length: SEAT_ROWS * block.cols }, (_, i) => {
                  const index =
                    Math.floor(i / block.cols) * SEAT_COLS + offset + (i % block.cols)
                  const on = index === lit && !result
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`tk-seat${on ? ' tk-seat-on' : ''}`}
                      /* 이름은 불이 들어온 자리만 읽어 준다 — 128칸을 전부 읽히면 소음이다. */
                      aria-label={on ? `${seatName(index)} (예매 가능)` : undefined}
                      aria-hidden={on ? undefined : true}
                      tabIndex={on ? 0 : -1}
                      disabled={result !== null}
                      onClick={() => tap(index)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 상태는 항상 글자로 말한다 — 색만으로 성패를 전하지 않는다. */}
      <p className="tk-book-status" role="status">
        {result === 'ok' && (
          <>
            <AppIcon name="mdi:check-circle-outline" size={16} />
            {seat} 예매 완료. {planLabel} 일정에 잡혔습니다.
          </>
        )}
        {result === 'fail' && (
          <>
            <AppIcon name="mdi:alert-circle-outline" size={16} />
            좌석이 모두 나갔습니다. 예매되지 않았습니다.
          </>
        )}
        {!result && (
          <>
            <AppIcon name="mdi:seat-outline" size={16} />
            빈자리 {misses} / {SEAT_MISS_LIMIT}회
          </>
        )}
      </p>

      <div className="tk-book-btns">
        <button type="button" className="tk-book-back" onClick={onClose}>
          {result === 'ok' ? '확인' : '예매 그만두기'}
        </button>
        {result === 'fail' && (
          <button type="button" className="tk-book-retry" autoFocus onClick={retry}>
            다시 시도
          </button>
        )}
      </div>
    </section>
  )
}
