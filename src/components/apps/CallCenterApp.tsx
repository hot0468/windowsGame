import { useEffect, useMemo, useRef, useState } from 'react'
import { CALLS_PER_SHIFT } from '../../data/callcenter'
import type { CallItem, QnaEntry } from '../../data/callcenter'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { bonusFor, callsForDay, searchQna } from '../../systems/callcenter'
import './CallCenterApp.css'

/**
 * 한울 상담 지원 시스템 — 출근(`commute`)이 여는 사내 업무 프로그램.
 *
 * ## 이 화면이 하는 것과 하지 않는 것
 * 턴은 이미 지나갔다. 여기서 만드는 것은 **급여일에 기본급과 함께 나갈 보너스 적립액**뿐이고,
 * 금액도 상한도 이 파일이 정하지 않는다 — 시간은 여기서 재고(`performance.now()`),
 * 금액은 `bonusFor`가, 상한은 스토어(`finishCall` → `creditCall`)가 자른다.
 *
 * ⚠️ **실시간인 것은 경과 시간 하나뿐이다.** `Math.random`·`new Date()`는 쓰지 않는다 —
 * 오늘 걸려 오는 콜은 날짜의 함수이고(`callsForDay`), 경과 시간은 세이브에 들어가지도
 * `systems/`를 지나지도 않는다.
 *
 * ⚠️ **오답에 페널티를 붙이지 않는다.** 늦어지는 것 자체가 대가다 —
 * 시간은 계속 흐르고 등급이 한 칸씩 내려간다.
 */

/** 콜 한 건의 처리 결과. `label`은 등급(신속/양호/보통/지연) 또는 자동 넘기기(`자동`). */
interface CallResult {
  won: number
  label: string
}

/** 자동 응대로 넘긴 콜. **보너스가 0원이고 `finishCall`을 지나지 않는다.** */
const AUTO_RESULT: CallResult = { won: 0, label: '자동' }

/** 타이머 간격(ms). 0.1초 단위로 보여 주므로 이보다 촘촘할 이유가 없다. */
const TICK_MS = 200

export function CallCenterApp({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const finishCall = useGameStore((s) => s.finishCall)

  const day = state?.day ?? 1
  const calls = useMemo(() => callsForDay(day), [day])

  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<(CallResult | null)[]>(() =>
    Array.from({ length: CALLS_PER_SHIFT }, () => null),
  )
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState('')
  const [elapsed, setElapsed] = useState(0)

  /* 현재 콜이 시작된 시각. 상태가 아니라 ref인 이유는 이 값이 바뀌어도 다시 그릴 필요가
     없기 때문이다 — 화면을 움직이는 것은 `elapsed`다. */
  const startedAt = useRef(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const done = index >= calls.length
  const current: CallItem | undefined = done ? undefined : calls[index]

  /* 콜이 바뀌면 시계를 0으로 되돌린다. */
  useEffect(() => {
    startedAt.current = performance.now()
    setElapsed(0)
  }, [index])

  /* ⚠️ 언마운트·근무 종료에서 반드시 정리한다. 창을 닫아도 인터벌이 남으면
     보이지 않는 화면이 계속 리렌더를 시킨다. */
  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setElapsed(performance.now() - startedAt.current)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [done, index])

  const total = results.reduce((sum, r) => sum + (r?.won ?? 0), 0)
  const handled = results.filter((r) => r !== null).length
  const hits = useMemo(() => searchQna(query), [query])

  /** QnA 하나를 고객에게 전달한다. 정답이면 다음 콜, 오답이면 시간만 흐른다. */
  function deliver(entry: QnaEntry) {
    if (!current) return
    if (entry.id !== current.qnaId) {
      setFeedback('고객이 그 안내는 해당되지 않는다고 합니다. 다른 문서를 찾아 주세요.')
      return
    }
    const { won, label } = bonusFor(performance.now() - startedAt.current)
    finishCall(won)
    setResults((prev) => prev.map((r, i) => (i === index ? { won, label } : r)))
    setIndex(index + 1)
    setQuery('')
    setFeedback('')
    searchRef.current?.focus()
  }

  /** 남은 콜을 전부 보너스 0원으로 넘기고 근무를 끝낸다. `finishCall`을 부르지 않는다. */
  function forwardAll() {
    setResults((prev) => prev.map((r) => r ?? AUTO_RESULT))
    setIndex(calls.length)
    setFeedback('')
  }

  return (
    <div className="cc">
      <header className="cc-top">
        <AppIcon name="mdi:phone-in-talk-outline" size={18} className="cc-top-mark" />
        <h1 className="cc-top-title">한울 상담 지원 시스템</h1>
        <span className="cc-top-sub">
          {day}일차 근무 · 배정 {calls.length}건
        </span>
        <button type="button" className="cc-forward" onClick={forwardAll} disabled={done}>
          <AppIcon name="mdi:skip-next-outline" size={16} />
          자동 응대로 넘기기
        </button>
      </header>

      <div className="cc-body">
        {/* ── 왼쪽: 콜 내역 ─────────────────────────────────── */}
        <section className="cc-calls" aria-labelledby="cc-calls-h">
          <div className="cc-panel-head">
            <h2 id="cc-calls-h" className="cc-panel-title">
              콜 내역
            </h2>
            <span className="cc-total">
              <AppIcon name="mdi:wallet-outline" size={14} />
              오늘 보너스 <strong>{total.toLocaleString()}원</strong>
            </span>
          </div>

          <ol className="cc-call-list">
            {calls.map((call, i) => {
              const result = results[i]
              const live = i === index && !done
              return (
                <li
                  key={`${call.id}-${i}`}
                  className={`cc-call${live ? ' cc-call-live' : ''}${result ? ' cc-call-done' : ''}`}
                >
                  <div className="cc-call-head">
                    <span className="cc-call-no">{i + 1}</span>
                    <span className="cc-call-who">{call.caller}</span>
                    {live && <span className="cc-call-num">{call.number}</span>}
                  </div>

                  {live && (
                    <>
                      <p className="cc-call-q">{call.question}</p>
                      <p className="cc-call-timer">
                        <AppIcon name="mdi:timer-outline" size={14} />
                        <span className="cc-sec">{(elapsed / 1000).toFixed(1)}초</span> 응대 중
                      </p>
                    </>
                  )}

                  {result && (
                    <p className="cc-call-result">
                      <AppIcon name="mdi:check-circle-outline" size={14} />
                      {result.label} · {result.won.toLocaleString()}원
                    </p>
                  )}

                  {!live && !result && (
                    <p className="cc-call-wait">
                      <AppIcon name="mdi:clock-outline" size={14} />
                      대기 중
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {/* ── 오른쪽: QnA 검색 / 종료 요약 ───────────────────── */}
        {done ? (
          <section className="cc-end" aria-labelledby="cc-end-h">
            <AppIcon name="mdi:clipboard-check-outline" size={32} className="cc-end-mark" />
            <h2 id="cc-end-h" className="cc-end-title">
              오늘 업무 종료
            </h2>
            <dl className="cc-end-rows">
              <div className="cc-end-row">
                <dt>처리 건수</dt>
                <dd>
                  {handled} / {calls.length}건
                </dd>
              </div>
              <div className="cc-end-row">
                <dt>오늘 보너스</dt>
                <dd className="cc-end-money">{total.toLocaleString()}원</dd>
              </div>
            </dl>
            <p className="cc-end-note">급여일에 기본급과 함께 지급됩니다.</p>
            <button type="button" className="cc-close" onClick={onClose}>
              닫기
            </button>
          </section>
        ) : (
          <section className="cc-qna" aria-labelledby="cc-qna-h">
            <div className="cc-panel-head">
              <h2 id="cc-qna-h" className="cc-panel-title">
                사내 QnA 검색
              </h2>
              <span className="cc-hits">{hits.length}건</span>
            </div>

            <div className="cc-search">
              <label className="cc-search-label" htmlFor="cc-search-input">
                고객이 쓴 말로 찾습니다
              </label>
              <div className="cc-search-field">
                <AppIcon name="mdi:magnify" size={18} className="cc-search-mark" />
                <input
                  id="cc-search-input"
                  ref={searchRef}
                  className="cc-search-input"
                  type="search"
                  autoFocus
                  autoComplete="off"
                  placeholder="예: 비싸, 느려, 분실"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {/* 오답 피드백. 색만으로 알리지 않는다 — 글자와 글리프가 함께 뜬다. */}
            <p className="cc-feedback" role="status">
              {feedback && (
                <>
                  <AppIcon name="mdi:alert-circle-outline" size={14} />
                  {feedback}
                </>
              )}
            </p>

            <ul className="cc-hit-list">
              {hits.map((entry) => (
                <li key={entry.id} className="cc-hit">
                  <h3 className="cc-hit-title">{entry.title}</h3>
                  <p className="cc-hit-answer">{entry.answer}</p>
                  <button type="button" className="cc-deliver" onClick={() => deliver(entry)}>
                    <AppIcon name="mdi:send-outline" size={14} />
                    전달
                  </button>
                </li>
              ))}
              {hits.length === 0 && (
                <li className="cc-hit-empty">
                  검색 결과가 없습니다. 고객이 말한 낱말 하나로 다시 찾아 보세요.
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
