import { useGameStore } from '../../store/gameStore'
import { noticeMail } from '../../systems/employment'
import type { AutoRun } from '../../systems/autoAdvance'
import './AutoLogApp.css'

/**
 * 자동 진행 요약 창.
 *
 * ## 왜 창인가 (토스트도 메일도 아닌 이유)
 * 자동 진행의 위험은 하나뿐이다 — **며칠이 조용히 지나가는 것**. 그 며칠 안에서 해고당하거나
 * 파산 직전까지 갈 수 있는데 플레이어가 모른 채 지나가면 그건 게임이 아니라 사고다.
 *  - **토스트**는 5초 뒤 사라진다(`ToastHost`의 `TOAST_MS`). 15슬롯짜리 보고서를 5초짜리
 *    알림 여섯 개로 쪼개면 그게 곧 "조용히 사라졌다"이다.
 *  - **메일**은 남지만 플레이어가 열어야 보인다. 게다가 회사 소식은 이미 메일을 타므로
 *    같은 사건이 두 번 적힌다.
 * 그래서 진행이 끝나면 **스스로 뜨는 창** 하나를 둔다. 기존 알림 경로(토스트·메일)는
 * 하나도 건드리지 않았다 — 이 창은 그 위에 얹히는 **"그 며칠의 전말"**이다.
 *
 * ## 시각 언어
 * OS 창이므로 `--os-*` 토큰만 쓴다. 판형 근거는 style `Executive Dashboard`:
 * 큰 KPI 숫자 4개 + 상태색 좌측 띠 + 한 화면 요약. 위에서부터
 * **왜 멈췄나 → 얼마 벌고 썼나 → 무슨 일이 있었나 → 슬롯별로 무엇을 했나** 순서다.
 * 스크롤 영역은 창 본문 하나뿐이다(ux `scroll-behavior`: 중첩 스크롤 금지 — AutoLogApp.css 참조).
 */
export function AutoLogApp() {
  const run = useGameStore((s) => s.autoRun)
  if (!run) return null
  return <AutoLogBody run={run} />
}

const slotName = (slot: 'morning' | 'afternoon') => (slot === 'morning' ? '오전' : '오후')
const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

function AutoLogBody({ run }: { run: AutoRun }) {
  const days = run.toDay - run.fromDay
  /* 있었던 일을 한 줄씩. 종류별로 목록을 나누지 않는 이유는 시간순으로 읽히는 편이
     "그래서 무슨 일이 있었나"에 바로 답하기 때문이다. */
  const events = [
    ...run.notices.map((n) => ({
      id: `n-${n.id}`,
      bad: n.kind === 'fired' || n.kind === 'absence-warning' || n.kind.endsWith('-fail'),
      text: `${n.day}일차 · ${noticeMail(n).subject}`,
    })),
    ...run.arrivals.map((name, i) => ({
      id: `a-${i}-${name}`,
      bad: false,
      text: `택배 도착 · ${name}`,
    })),
    ...run.skipped.map((s, i) => ({
      id: `s-${i}-${s.day}-${s.slot}`,
      bad: true,
      text: `${s.day}일차 ${slotName(s.slot)} 예약 실행 실패 · ${s.reason}`,
    })),
    ...run.mails.map((m, i) => ({
      id: `m-${i}`,
      bad: false,
      text: `메일 · ${m.from} — ${m.subject}`,
    })),
  ]

  return (
    <div className="alog">
      <header className="alog-head">
        <p className="alog-range">
          {run.fromDay}일차 {slotName(run.fromSlot)} → {run.toDay}일차 {slotName(run.toSlot)}
        </p>
        <p className="alog-sub">
          {days}일 · {run.slots}슬롯 진행
        </p>
      </header>

      {/* 멈춘 이유가 이 창의 첫 번째 정보다 — 플레이어가 가장 먼저 묻는 것이 그것이다.
          좌측 상태 띠 + 라벨 글자로 알린다(색만으로 뜻을 전하지 않는다: ux `color-not-only`). */}
      {run.stop && (
        <div className={`alog-stop${run.stop.bad ? ' alog-stop-bad' : ''}`} role="status">
          <span className="alog-stop-label">멈춘 이유</span>
          <p className="alog-stop-text">{run.stop.text}</p>
        </div>
      )}

      {run.slots === 0 ? (
        /* ux `Empty States` — 아무 일도 없었다는 사실 자체를 말해 주고 무엇을 하면 되는지 적는다. */
        <p className="alog-empty">
          한 슬롯도 진행하지 못했습니다. 일정 창에서 앞으로의 슬롯에 활동을 예약한 뒤 다시
          시도해 주세요.
        </p>
      ) : (
        <>
          {/* KPI 4개. style `Executive Dashboard`: "KPIs 4-6 maximum", 숫자가 크고
              라벨이 작다. 숫자는 tabular figure라 줄이 흔들리지 않는다. */}
          <div className="alog-kpis">
            <Kpi label="수입" value={`+${won(run.moneyIn)}`} tone="up" />
            <Kpi
              label="지출"
              value={`−${won(run.moneyOut)}`}
              sub={`생활비 ${won(run.livingPaid)}`}
              tone="down"
            />
            <Kpi label="남은 소지금" value={won(run.moneyAfter)} sub={`시작 ${won(run.moneyBefore)}`} />
            <Kpi label="진행" value={`${days}일`} sub={`${run.slots}슬롯`} />
          </div>

          <section className="alog-sec" aria-label="그동안 있었던 일">
            <h4 className="alog-sec-title">그동안 있었던 일</h4>
            {events.length ? (
              <ul className="alog-events">
                {events.map((e) => (
                  <li key={e.id} className={e.bad ? 'alog-event alog-event-bad' : 'alog-event'}>
                    {e.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="alog-none">특별한 소식은 없었습니다.</p>
            )}
          </section>

          {run.statDelta.length > 0 && (
            <section className="alog-sec" aria-label="스탯 변화">
              <h4 className="alog-sec-title">스탯 변화</h4>
              <p className="alog-chips">
                {run.statDelta.map((d) => (
                  <span
                    key={d.key}
                    className={d.value > 0 ? 'alog-chip alog-chip-up' : 'alog-chip alog-chip-down'}
                  >
                    {d.label} {d.value > 0 ? '+' : '−'}
                    {Math.abs(d.value).toLocaleString('ko-KR')}
                  </span>
                ))}
              </p>
            </section>
          )}

          <section className="alog-sec" aria-label="슬롯별 기록">
            <h4 className="alog-sec-title">슬롯별 기록</h4>
            {/* 길어질 수 있는 유일한 구역이라 **여기만** 스크롤한다 —
                창 본문 전체를 늘리면 짧은 화면에서 창이 작업 표시줄 밑으로 빠진다. */}
            <ol className="alog-steps">
              {run.steps.map((s) => (
                <li key={`${s.day}-${s.slot}`} className="alog-step">
                  <span className="alog-step-when">
                    {s.day}일차 {slotName(s.slot)}
                  </span>
                  <span className={s.skipped ? 'alog-step-what alog-step-miss' : 'alog-step-what'}>
                    {s.label ?? (s.skipped ? `실행 실패 · ${s.skipped}` : '아무것도 하지 않음')}
                  </span>
                  <span className="alog-step-money">{won(s.money)}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'up' | 'down'
}) {
  return (
    <div className="alog-kpi">
      <span className="alog-kpi-label">{label}</span>
      <span className={tone ? `alog-kpi-value alog-kpi-${tone}` : 'alog-kpi-value'}>{value}</span>
      {sub && <span className="alog-kpi-sub">{sub}</span>}
    </div>
  )
}
