import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DRIVE_FILES,
  DRIVE_FOLDERS,
  PERFORMANCE_QUOTA,
  findCoworker,
  findDriveFile,
} from '../../data/drive'
import type { DriveFile, DriveFolder, FileRequest } from '../../data/drive'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import {
  autoPerformance,
  overtimePay,
  overtimePercent,
  performanceFor,
  performanceOf,
  requestsForDay,
} from '../../systems/drive'
import './DriveApp.css'

/**
 * 너드라이브 — **사무직 출근(`commute`)이 여는 사내 프로그램.**
 *
 * 왼쪽은 너아무튼온 대화창(동료가 파일을 요청한다), 오른쪽은 드라이브다.
 * 요청한 파일을 **대화창으로 끌어다 놓으면** 한 건이 끝난다.
 *
 * ## 이 화면이 하는 것과 하지 않는 것
 * 턴은 이미 지나갔다. 여기서 만드는 것은 **성과 게이지(%)**뿐이고, 게이지가 돈이 되는 것은
 * 급여일에 **100%를 넘는 분량**만이다(`systems/employment.ts`의 `payWages`). 등급도 상한도
 * 이 파일이 정하지 않는다 — 시간만 여기서 재고(`performance.now()`), 나머지는
 * `performanceFor`·`creditPerformance`가 갖는다.
 *
 * ⚠️ **드래그가 유일한 길이면 안 된다**(ux `gesture-alternative`). 파일을 눌러 고른 뒤
 * 대화창의 [보내기]로도 같은 일이 일어난다 — 드래그는 빠른 길일 뿐이다.
 *
 * ⚠️ **오답에 페널티를 붙이지 않는다**(콜센터와 같은 규칙). 늦어지는 것 자체가 대가다.
 *
 * ⚠️ **실시간인 것은 경과 시간 하나뿐이다.** `Math.random`·`new Date()`를 쓰지 않는다 —
 * 오늘 오는 요청은 날짜의 함수다(`requestsForDay`).
 */

/** 요청 한 건의 결과. `label`은 등급(즉시/양호/보통/지연) 또는 자동 넘기기(`자동`). */
interface RequestResult {
  percent: number
  label: string
}

/** 타이머 간격(ms). 0.1초 단위로 보여 주므로 이보다 촘촘할 이유가 없다. */
const TICK_MS = 200

export function DriveApp({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state)
  const finishRequest = useGameStore((s) => s.finishRequest)

  const day = state?.day ?? 1
  const requests = useMemo(() => requestsForDay(day), [day])

  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<RequestResult[]>([])
  const [folder, setFolder] = useState<DriveFolder>(DRIVE_FOLDERS[0])
  const [picked, setPicked] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [elapsed, setElapsed] = useState(0)
  /** 대화창 위에 파일을 끌고 와 있는가. 놓을 자리라는 것을 보여 준다. */
  const [over, setOver] = useState(false)

  const startedAt = useRef(0)

  const done = index >= requests.length
  const current: FileRequest | undefined = done ? undefined : requests[index]

  /* 요청이 바뀌면 시계를 0으로 되돌린다. */
  useEffect(() => {
    if (done) return
    startedAt.current = performance.now()
    setElapsed(0)
    setFeedback('')
    setPicked(null)
  }, [index, done])

  useEffect(() => {
    if (done) return
    const id = setInterval(() => setElapsed(performance.now() - startedAt.current), TICK_MS)
    return () => clearInterval(id)
  }, [index, done])

  if (!state) return null

  /** 한 건 확정. 등급을 매기고 게이지에 쌓은 뒤 다음 요청으로 넘어간다. */
  const commit = (result: RequestResult) => {
    if (result.percent > 0) finishRequest(result.percent)
    setResults((prev) => [...prev, result])
    setIndex((i) => i + 1)
  }

  /** 파일을 보낸다. 드래그와 [보내기] 버튼이 **같은 함수**를 지난다. */
  const send = (fileId: string) => {
    if (!current) return
    if (fileId !== current.fileId) {
      const wrong = findDriveFile(fileId)
      setFeedback(`${current.text.split(' ')[0]}… 「${wrong?.name ?? '그 파일'}」은 아닌 것 같은데요.`)
      setPicked(null)
      return
    }
    commit(performanceFor(elapsed))
  }

  /** 남은 요청을 통째로 넘긴다. **게이지는 아주 조금만 오른다.** */
  const skipAll = () => {
    const auto = autoPerformance()
    const rest = requests.length - index
    for (let i = 0; i < rest; i++) finishRequest(auto.percent)
    setResults((prev) => [...prev, ...Array.from({ length: rest }, () => auto)])
    setIndex(requests.length)
  }

  const gauge = performanceOf(state)
  const files = DRIVE_FILES.filter((f) => f.folder === folder)
  const from = current ? findCoworker(current.from) : undefined

  return (
    <div className="drv">
      {/* ── 성과 게이지: 이 창이 무엇을 만들고 있는지 늘 보인다 ─────────── */}
      <header className="drv-head">
        <span className="drv-head-title">
          <AppIcon name="fluent-color:cloud-24" size={20} />
          사내 공유함
        </span>
        <div className="drv-gauge" role="group" aria-label="이번 급여 주기 성과">
          <div className="drv-gauge-bar">
            {/* 100%를 기준으로 그린다 — 넘으면 넘은 만큼 다른 색이 얹힌다. */}
            <span
              className="drv-gauge-fill"
              style={{ width: `${Math.min(100, (gauge / PERFORMANCE_QUOTA) * 100)}%` }}
            />
            <span
              className="drv-gauge-over"
              style={{
                width: `${Math.min(100, (overtimePercent(gauge) / PERFORMANCE_QUOTA) * 100)}%`,
              }}
            />
          </div>
          {/* 색만으로 알리지 않는다 — 넘은 분량과 그 돈을 글자로 적는다. */}
          <p className="drv-gauge-text">
            성과 <b>{gauge}%</b>
            <span className="drv-gauge-note">
              {overtimePercent(gauge) > 0
                ? `할당 ${PERFORMANCE_QUOTA}% 초과 ${overtimePercent(gauge)}% · 야근비 ${overtimePay(gauge).toLocaleString('ko-KR')}원`
                : `할당 ${PERFORMANCE_QUOTA}%까지 ${PERFORMANCE_QUOTA - gauge}% 남음`}
            </span>
          </p>
        </div>
      </header>

      <div className="drv-body">
        {/* ── 왼쪽: 너아무튼온 대화창 ─────────────────────────────────── */}
        <section className="drv-chat" aria-label="너아무튼온 대화">
          <header className="drv-chat-head">
            <AppIcon name="fluent-color:people-chat-24" size={18} />
            너아무튼온
            {!done && <span className="drv-clock">{(elapsed / 1000).toFixed(1)}초</span>}
          </header>

          <ul className="drv-log">
            {requests.slice(0, index).map((r, i) => {
              const who = findCoworker(r.from)
              return (
                <li key={r.id} className="drv-msg drv-msg-done">
                  <span className="drv-avatar" style={{ background: who?.gradient }}>
                    {who?.initial}
                  </span>
                  <span className="drv-bubble">
                    <b className="drv-who">
                      {who?.name} <span className="drv-role">{who?.role}</span>
                    </b>
                    {r.reply}
                    <span className="drv-grade">{results[i]?.label} · +{results[i]?.percent}%</span>
                  </span>
                </li>
              )
            })}

            {current && from && (
              <li className="drv-msg">
                <span className="drv-avatar" style={{ background: from.gradient }}>
                  {from.initial}
                </span>
                <span className="drv-bubble">
                  <b className="drv-who">
                    {from.name} <span className="drv-role">{from.role}</span>
                  </b>
                  {current.text}
                </span>
              </li>
            )}
          </ul>

          {/* ⚠️ 놓는 자리. 드래그가 유일한 길이 아니도록 [보내기] 버튼을 함께 둔다. */}
          {current && (
            <div
              className={`drv-drop${over ? ' drv-drop-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(true)
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setOver(false)
                const id = e.dataTransfer.getData('text/plain')
                if (id) send(id)
              }}
            >
              <p className="drv-drop-text">
                {picked
                  ? `「${findDriveFile(picked)?.name}」 보낼 준비가 됐습니다.`
                  : '드라이브에서 파일을 끌어다 놓거나, 눌러서 고른 뒤 보내세요.'}
              </p>
              <button
                type="button"
                className="drv-send"
                disabled={!picked}
                onClick={() => picked && send(picked)}
              >
                보내기
              </button>
            </div>
          )}

          {feedback && (
            <p className="drv-feedback" role="status">
              {feedback}
            </p>
          )}

          {/* 남은 일을 통째로 넘긴다. 끝났으면 창을 닫는 버튼이 그 자리를 대신한다. */}
          {done ? (
            <div className="drv-end">
              <p className="drv-end-text" role="status">
                오늘 업무를 마쳤습니다. 성과 <b>+{results.reduce((s, r) => s + r.percent, 0)}%</b>
              </p>
              <button type="button" className="drv-close" onClick={onClose}>
                퇴근하기
              </button>
            </div>
          ) : (
            <button type="button" className="drv-auto" onClick={skipAll}>
              자동 넘기기 (성과 소량만)
            </button>
          )}
        </section>

        {/* ── 오른쪽: 드라이브 ────────────────────────────────────────── */}
        <section className="drv-files" aria-label="사내 드라이브">
          <nav className="drv-tree" aria-label="폴더">
            {DRIVE_FOLDERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`drv-folder${folder === f ? ' drv-folder-on' : ''}`}
                aria-current={folder === f ? 'true' : undefined}
                onClick={() => setFolder(f)}
              >
                <AppIcon name="fluent-color:document-folder-24" size={18} />
                {f}
              </button>
            ))}
          </nav>

          <ul className="drv-list">
            {files.map((file) => (
              <li key={file.id}>
                <FileRow
                  file={file}
                  picked={picked === file.id}
                  disabled={done}
                  onPick={() => setPicked(file.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/**
 * 드라이브의 파일 한 줄. **끌 수도 있고 누를 수도 있다** —
 * 누르면 고른 상태가 되고 대화창의 [보내기]가 열린다.
 */
function FileRow({
  file,
  picked,
  disabled,
  onPick,
}: {
  file: DriveFile
  picked: boolean
  disabled: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={`drv-file${picked ? ' drv-file-on' : ''}`}
      draggable={!disabled}
      disabled={disabled}
      aria-pressed={picked}
      onClick={onPick}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', file.id)
        e.dataTransfer.effectAllowed = 'copy'
        onPick()
      }}
    >
      <AppIcon name="fluent-color:document-24" size={22} />
      <span className="drv-file-name">
        {file.name}
        <span className="drv-file-ext">{file.ext}</span>
      </span>
      <span className="drv-file-size">{file.size}</span>
    </button>
  )
}
