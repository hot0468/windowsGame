import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import {
  ABSENCE_FIRE,
  ABSENCE_WARNING,
  CAREERS,
  INTERVIEW_WINDOW_DAYS,
  PAYDAY_INTERVAL,
  findCareer,
} from '../../../data/careers'
import { formatGameDate } from '../../../data/calendar'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import {
  STAGE_COUNT,
  STAGE_LABELS,
  applyBlockers,
  attendedToday,
  isWorkday,
  shortfalls,
  stageIndex,
} from '../../../systems/employment'
import { STAT_NAMES } from '../../../types/game'
import type { Career } from '../../../data/careers'
import type { Site } from '../../../data/sites'
import type { GameState, Stats } from '../../../types/game'
import { ActivityCommit } from './ActivityCommit'
import './FleaSite.css'

/**
 * 벼룩장터 — **정규직** 구인. 알바몬(일용직)과 나란히 서지만 하는 일이 다르다.
 *
 * **둘러보기는 무료다.** 공고를 넘기고 요건을 확인하는 동안 게임 상태는 **읽기만** 한다 —
 * 턴을 쓰는 자리는 화면 아래 확정 패널(`ActivityCommit`) 하나뿐이고, 그 패널이 무엇을
 * 확정하는지는 **지금의 고용 상태**가 정한다: 무직이면 지원, 면접 차례면 면접, 재직 중이면 출근.
 *
 * ## 시각 언어 (ui-ux-pro-max 근거)
 * - color `Classifieds / Buy-Sell`: primary #2563EB · fg #1E40AF · bg #EFF6FF ·
 *   border #BFDBFE · accent(급여) #16A34A · destructive #DC2626.
 *   알바몬의 하늘색(#0369A1/#BAE6FD)과 계열을 갈라 두 구인 사이트를 눈으로 구분한다.
 * - style `Editorial Grid / Magazine`: 생활정보지가 원형이므로 **굵은 가로줄 제호**와
 *   구역 구분선으로 인쇄물의 인상을 만든다(모서리는 작게).
 * - style `Data-Dense Dashboard`: 공고 목록은 낮은 패딩의 촘촘한 줄이다.
 * - ux `Progress Indicators`: 채용 단계는 "2/3 면접"처럼 **숫자와 글자**로 알린다.
 * - ux `Empty States` / `Error Messages`: 지원한 적이 없으면 무엇을 하면 되는지 적고,
 *   탈락·경고는 `role="alert"`로 사유와 함께 알린다.
 * - 토큰은 `.flea` 안에 `--fl-*`로 가둔다(너튜브·시집이·아점·미디북스·알바몬과 같은 규칙).
 */

/**
 * 요건 한 묶음을 "지식 40 · 어휘력 20"으로 적고, 모자란 것을 함께 돌려준다.
 * 라벨은 `STAT_NAMES`만 참조한다 — 컴포넌트에 스탯 이름을 다시 적지 않는다.
 */
function needList(state: GameState, need: Career['paper']): { text: string; missing: string[] } {
  const text = Object.entries(need)
    .map(([key, min]) => `${STAT_NAMES[key as keyof Stats]} ${min}`)
    .join(' · ')
  return { text, missing: shortfalls(state.stats, need) }
}

export function FleaSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const applyToCareer = useGameStore((s) => s.applyToCareer)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 지원한 곳. 확정 후 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [receipt, setReceipt] = useState<string | null>(null)

  if (!state) return null

  const job = state.employment
  const career = job ? findCareer(job.careerId) : undefined
  const app = state.application
  const applied = app ? findCareer(app.careerId) : undefined
  const picked = pickedId ? findCareer(pickedId) : undefined
  const blockers = applyBlockers(state)

  /** 확정 패널이 무엇을 확정하는가. 고용 상태 하나가 정한다. */
  const mode: 'commute' | 'interview' | 'apply' = job
    ? 'commute'
    : app?.stage === 'interview'
      ? 'interview'
      : 'apply'
  const commitActivity = findActivity(
    mode === 'commute' ? 'commute' : mode === 'interview' ? 'job-interview' : (site.activityId ?? ''),
  )

  return (
    <div className="flea">
      <p className="flea-strip">
        정규직 공고 {CAREERS.length}건 · 지원하면 결과가 며칠 뒤에 메일로 옵니다
      </p>

      <header className="flea-head">
        <h1 className="flea-logo">벼룩장터</h1>
        <p className="flea-tagline">생활정보 · 구인구직</p>
        <span className="flea-issue" aria-hidden="true">
          {formatGameDate(state.day)}자
        </span>
      </header>

      {/* ── 내 채용 현황 ─────────────────────────────────────────── */}
      <section className="flea-sec" aria-label="내 채용 현황">
        <h2 className="flea-sec-head">내 채용 현황</h2>

        {job && career ? (
          <div className="flea-status flea-status-job">
            <p className="flea-status-title">
              <AppIcon name="fluent-color:building-24" size={18} />
              {career.company} · {career.title}
            </p>
            <dl className="flea-facts">
              <div>
                <dt>입사일</dt>
                <dd>{formatGameDate(job.hiredDay)}</dd>
              </div>
              <div>
                <dt>급여</dt>
                <dd className="flea-money">{career.salary.toLocaleString('ko-KR')}원</dd>
              </div>
              <div>
                <dt>다음 급여일</dt>
                <dd>
                  {formatGameDate(job.paydayDay)}
                  <span className="flea-dim"> (D-{Math.max(0, job.paydayDay - state.day)})</span>
                </dd>
              </div>
              <div>
                <dt>급여 주기</dt>
                <dd>{PAYDAY_INTERVAL}일</dd>
              </div>
              <div>
                <dt>이번 주기 출근</dt>
                <dd>{job.attendedDays.length}일</dd>
              </div>
              <div>
                <dt>무단결근</dt>
                <dd className={job.absences >= ABSENCE_WARNING ? 'flea-bad' : undefined}>
                  {job.absences}회 / 해고 {ABSENCE_FIRE}회
                </dd>
              </div>
            </dl>
            {/* 색만으로 알리지 않는다(ux `color-not-only`) — 글자로 상태를 적는다. */}
            {job.absences >= ABSENCE_WARNING && (
              <p className="flea-alert" role="alert">
                <AppIcon name="fluent-color:warning-24" size={15} />
                무단결근이 {job.absences}회입니다. {ABSENCE_FIRE}회가 되면 해고됩니다.
              </p>
            )}
            <p className="flea-note">
              근무일은 월~금입니다.{' '}
              {isWorkday(state.day)
                ? attendedToday(state)
                  ? '오늘은 출근을 마쳤습니다.'
                  : '오늘은 근무일이고 아직 출근하지 않았습니다.'
                : '오늘은 근무일이 아닙니다.'}
            </p>
          </div>
        ) : app && applied ? (
          <div className="flea-status">
            <p className="flea-status-title">
              <AppIcon name="fluent-color:document-text-24" size={18} />
              {applied.company} · {applied.title}
            </p>
            {/* ux `Progress Indicators`: 몇 단계 중 몇 번째인지 숫자로 적는다. */}
            <p className="flea-steps">
              <span className="flea-step-badge">
                {stageIndex(app.stage)}/{STAGE_COUNT}
              </span>
              {STAGE_LABELS[app.stage]}
            </p>
            <dl className="flea-facts">
              <div>
                <dt>지원일</dt>
                <dd>{formatGameDate(app.appliedDay)}</dd>
              </div>
              <div>
                <dt>{app.stage === 'interview' ? '면접 가능일' : '결과 예정일'}</dt>
                <dd>{formatGameDate(app.dueDay)}</dd>
              </div>
              {app.stage === 'interview' && (
                <div>
                  <dt>면접 기한</dt>
                  <dd className="flea-bad">
                    {formatGameDate(app.dueDay + INTERVIEW_WINDOW_DAYS)}까지
                  </dd>
                </div>
              )}
            </dl>
            {app.stage === 'interview' && state.day < app.dueDay && (
              <p className="flea-note">면접일이 되면 아래에서 면접을 볼 수 있습니다.</p>
            )}
          </div>
        ) : (
          /* ux `Empty States`: 빈 화면 대신 무엇을 하면 되는지 적는다. */
          <p className="flea-empty">
            아직 지원한 곳이 없습니다. 아래 공고를 골라 지원해 보세요. 서류 심사와 면접을
            거쳐 합격하면 급여를 받게 됩니다.
          </p>
        )}

        {receipt && (
          <p className="flea-receipt" role="status">
            {receipt}
          </p>
        )}
      </section>

      {/* ── 공고 목록 ────────────────────────────────────────────── */}
      <section className="flea-sec">
        <h2 className="flea-sec-head">
          정규직 공고
          <span className="flea-sec-count">{CAREERS.length}건</span>
        </h2>
        <ul className="flea-list" role="radiogroup" aria-label="지원할 공고 고르기">
          {CAREERS.map((c) => (
            <li key={c.id}>
              <CareerCard
                career={c}
                state={state}
                on={c.id === pickedId}
                disabled={blockers.length > 0}
                onPick={() => setPickedId(c.id === pickedId ? null : c.id)}
              />
            </li>
          ))}
        </ul>
        {/* 왜 못 고르는지 적는다 — 비활성만 두면 이유를 알 길이 없다. */}
        {blockers.map((b) => (
          <p key={b} className="flea-alert" role="status">
            <AppIcon name="fluent-color:warning-24" size={15} />
            {b}
          </p>
        ))}
      </section>

      {commitActivity && mode === 'apply' && (
        <ActivityCommit
          activity={commitActivity}
          actionLabel="지원하기"
          selection={
            picked && !blockers.length ? `${picked.company} · ${picked.title}` : undefined
          }
          selectionHint={
            blockers.length ? blockers[0] : '지원할 공고를 고르세요. 요건이 모자라도 넣을 수 있습니다.'
          }
          onCommit={() => picked && applyToCareer(picked)}
          onCommitted={() => {
            setReceipt(
              picked ? `${picked.company}에 지원서를 넣었습니다. 결과는 메일로 옵니다.` : null,
            )
            setPickedId(null)
          }}
        />
      )}

      {commitActivity && mode === 'interview' && applied && (
        <ActivityCommit
          activity={commitActivity}
          actionLabel="면접 보러 가기"
          selection={`${applied.company} · ${applied.title}`}
          selectionHint="면접일이 아직 되지 않았습니다."
          onCommitted={() => setReceipt('면접을 봤습니다. 최종 결과는 메일로 옵니다.')}
        />
      )}

      {commitActivity && mode === 'commute' && career && (
        <ActivityCommit
          activity={commitActivity}
          actionLabel="출근하기"
          selection={`${career.company} · ${career.title}`}
          selectionHint="오늘은 출근할 수 없습니다."
          onCommitted={() => setReceipt('출근했습니다. 급여는 급여일에 들어옵니다.')}
        />
      )}

      <footer className="flea-foot">
        <p className="flea-foot-logo">벼룩장터</p>
        <p>구인 · 구직 · 부동산 · 중고거래 · 생활서비스</p>
        <p>공고의 근무 조건은 사업주가 등록한 내용이며 벼룩장터는 이를 보증하지 않습니다.</p>
      </footer>
    </div>
  )
}

/**
 * 공고 카드 하나.
 *
 * ⚠️ **요건 미달이어도 지원할 수 있다**(알바몬과 다른 점). 결과가 나오는 날까지 스탯을
 * 채우면 통과하기 때문이다 — 그것이 이 시스템의 유일한 도박이다. 대신 **무엇이 모자란지는
 * 감추지 않고 글자로 적는다**(ux `error-clarity`). 판정은 `shortfalls` 하나가 한다.
 */
function CareerCard({
  career,
  state,
  on,
  disabled,
  onPick,
}: {
  career: Career
  state: GameState
  on: boolean
  disabled: boolean
  onPick: () => void
}) {
  const paper = needList(state, career.paper)
  const person = needList(state, career.person)
  const ready = paper.missing.length === 0 && person.missing.length === 0

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      className={`flea-card${on ? ' flea-card-on' : ''}${disabled ? ' flea-card-off' : ''}`}
      title={career.summary}
      onClick={onPick}
    >
      <span className="flea-card-main">
        <span className="flea-company">{career.company}</span>
        <span className="flea-title">
          {career.title}
          {career.badge && <span className="flea-badge">{career.badge}</span>}
        </span>
        <span className="flea-meta">
          <span className="flea-meta-item">
            <AppIcon name="mdi:map-marker-outline" size={13} />
            {career.area}
          </span>
          <span className="flea-meta-item">
            <AppIcon name="mdi:clock-outline" size={13} />
            {career.schedule}
          </span>
        </span>
        <span className="flea-summary">{career.summary}</span>
        <span className="flea-needs">
          <span className="flea-need">
            <b>서류</b> {paper.text}
          </span>
          <span className="flea-need">
            <b>면접</b> {person.text}
          </span>
        </span>
        {/* 색이 아니라 글자가 상태를 전한다(ux `color-not-only`). */}
        {ready ? (
          <span className="flea-ok">
            <AppIcon name="mdi:check-circle-outline" size={13} />
            지금 요건을 모두 채웠습니다
          </span>
        ) : (
          [...paper.missing, ...person.missing].map((m) => (
            <span key={m} className="flea-short">
              <AppIcon name="mdi:alert-circle-outline" size={13} />
              {m}
            </span>
          ))
        )}
        <span className="flea-tags">
          {career.tags.map((t) => (
            <span key={t} className="flea-tag">
              {t}
            </span>
          ))}
        </span>
      </span>
      <span className="flea-pay">
        <span className="flea-pay-label">{PAYDAY_INTERVAL}일마다</span>
        <span className="flea-pay-value">{career.salary.toLocaleString('ko-KR')}원</span>
        {on && <span className="flea-picked">선택함</span>}
      </span>
    </button>
  )
}
