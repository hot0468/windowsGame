import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import {
  ABSENCE_FIRE,
  ABSENCE_WARNING,
  CAREERS,
  FINAL_DAYS,
  INTERVIEW_LEAD_DAYS,
  INTERVIEW_WINDOW_DAYS,
  PAYDAY_INTERVAL,
  SCREENING_DAYS,
  findCareer,
} from '../../../data/careers'
import { formatGameDate } from '../../../data/calendar'
import { findItem } from '../../../data/items'
import { STAT_META } from '../../../data/statMeta'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import {
  JOB_NOTICE_LABELS,
  STAGE_COUNT,
  STAGE_LABELS,
  applyBlockers,
  attendedToday,
  isWorkday,
  lastOutcome,
  shortfalls,
  stageIndex,
} from '../../../systems/employment'
import { STAT_NAMES } from '../../../types/game'
import type { Career } from '../../../data/careers'
import type { Site } from '../../../data/sites'
import type { GameState, Stats } from '../../../types/game'
import { ActivityConfirm } from '../ActivityConfirm'
import './FleaSite.css'

/**
 * 벼룩장터 — **정규직** 구인. 알바몬(일용직)과 나란히 서지만 하는 일이 다르다.
 *
 * **둘러보기는 무료다.** 공고를 넘기고 요건을 확인하는 동안 게임 상태는 **읽기만** 한다 —
 * 턴을 쓰는 자리는 항목을 눌렀을 때 뜨는 확인창(`ActivityConfirm`) 하나뿐이고, 그 창이 무엇을
 * 확정하는지는 **지금의 고용 상태**가 정한다: 무직이면 지원, 면접 차례면 면접, 재직 중이면 출근.
 *
 * ## 시각 언어 (레퍼런스가 스펙이다)
 * 판형은 **생활정보지 구인 포털**이다(파란 머리띠 + 알약 검색창 + 사실 띠 → 흰 카드 3장 →
 * 공고 격자). 구 판형(신문 제호 + 세로 목록, style `Editorial Grid / Magazine`)은 대체됐다.
 * - color `Classifieds / Buy-Sell`: primary #2563EB · fg #1E40AF · bg #EFF6FF ·
 *   border #BFDBFE · accent(급여) #16A34A · destructive #DC2626. **색은 한 톨도 늘리지 않았다** —
 *   알바몬의 하늘색(#0369A1)과 계열을 갈라 두 구인 사이트를 눈으로 구분하는 규칙 그대로다.
 * - ⚠️ **가짜 링크를 만들지 않는다.** 레퍼런스의 상단 메뉴 자리에는 눌러도 갈 데 없는
 *   카테고리 대신 **이 사이트가 실제로 지키는 규칙**을 사실로 적는다. 검색창도 장식이 아니라
 *   공고를 실제로 거르고, 레퍼런스의 "업직종별" 아이콘 격자 자리에는 **이 사이트가 실제로
 *   보는 여섯 스탯**을 놓았다(서류 3 · 면접 3).
 * - ux `Progress Indicators`: 채용 단계는 "2/3 면접"처럼 **숫자와 글자**로 알린다.
 * - ux `Empty States` / `Error Messages`: 지원한 적이 없으면 무엇을 하면 되는지 적고,
 *   탈락·경고는 `role="alert"`로 사유와 함께 알린다.
 * - 토큰은 `.flea` 안에 `--fl-*`로 가둔다(너튜브·시집이·아점·미디북스·알바몬과 같은 규칙).
 */

/** 서류가 보는 셋 · 면접이 보는 셋. 아이콘 격자와 순서를 공유한다. */
const PAPER_STATS: (keyof Stats)[] = ['knowledge', 'vocabulary', 'creativity']
const PERSON_STATS: (keyof Stats)[] = ['charm', 'reputation', 'sociability']

/**
 * 요건 한 묶음을 "지식 40 · 어휘력 20"으로 적고, 모자란 것을 함께 돌려준다.
 * 라벨은 `STAT_NAMES`만 참조한다 — 컴포넌트에 스탯 이름을 다시 적지 않는다.
 *
 * ⚠️ **자격증 요건도 같은 판정을 지난다**(`shortfalls`) — 화면에서 따로 세면
 * "여기서는 통과인데 서류에서 떨어지는" 상태가 생긴다.
 */
function needList(
  state: GameState,
  need: Career['paper'],
  certItemId?: string,
): { text: string; missing: string[] } {
  const parts = Object.entries(need).map(
    ([key, min]) => `${STAT_NAMES[key as keyof Stats]} ${min}`,
  )
  if (certItemId) parts.push(findItem(certItemId)?.name ?? '자격증')
  return { text: parts.join(' · '), missing: shortfalls(state, need, certItemId) }
}

/** 검색어가 걸리는가. 공고에 적힌 글자면 무엇이든 건다(회사·직무·지역·조건·태그). */
function matches(career: Career, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const hay = [career.company, career.title, career.area, career.schedule, career.summary, ...career.tags]
  return hay.some((t) => t.includes(q))
}

export function FleaSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const applyToCareer = useGameStore((s) => s.applyToCareer)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 면접·출근 버튼을 눌렀는가. 이 둘은 고를 공고가 없어 `pickedId`로 열 수 없다. */
  const [acting, setActing] = useState(false)
  const [query, setQuery] = useState('')
  /** 방금 지원한 곳. 확정 후 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [receipt, setReceipt] = useState<string | null>(null)

  if (!state) return null

  const job = state.employment
  const career = job ? findCareer(job.careerId) : undefined
  const app = state.application
  /* 직전에 **끝난** 지원의 결과(탈락·불참). 급여·근태 소식은 여기 오지 않는다.
     ⚠️ 새 상태가 아니라 `jobNotices` 파생이다 — 사유 문장도 메일과 같은 값을 그대로 쓴다. */
  const outcome = lastOutcome(state)
  const applied = app ? findCareer(app.careerId) : undefined
  const picked = pickedId ? findCareer(pickedId) : undefined
  const blockers = applyBlockers(state)
  const shown = CAREERS.filter((c) => matches(c, query))

  /** 어떤 활동을 확정하는가. 고용 상태 하나가 정한다. */
  const mode: 'commute' | 'interview' | 'apply' = job
    ? 'commute'
    : app?.stage === 'interview'
      ? 'interview'
      : 'apply'
  const commitActivity = findActivity(
    mode === 'commute' ? 'commute' : mode === 'interview' ? 'job-interview' : (site.activityId ?? ''),
  )
  /** 확인창이 무엇을 확정하는가. null이면 창이 닫혀 있다. */
  const confirming = mode === 'apply' ? picked : acting ? (career ?? applied) : undefined

  return (
    <div className="flea">
      {/* ── 파란 머리띠 (로고 · 검색 · 사실 띠) ───────────────────── */}
      <header className="flea-top">
        <div className="flea-top-in">
          <div className="flea-brand">
            <p className="flea-brand-sub">생활 속 일자리 대표 정보지</p>
            <h1 className="flea-logo">벼룩장터</h1>
          </div>
          <div className="flea-search">
            <input
              className="flea-search-input"
              type="search"
              value={query}
              placeholder="회사 · 직무 · 지역 · 조건으로 공고 찾기"
              aria-label="공고 검색"
              onChange={(e) => setQuery(e.target.value)}
            />
            {/* 컨트롤 글리프는 단색이라야 CSS로 색을 입는다(포털과 같은 규칙). */}
            <AppIcon name="mdi:magnify" size={18} className="flea-search-icon" />
          </div>
        </div>
        {/* ⚠️ 카테고리 링크가 아니라 **사실**이다 — 갈 데 없는 링크를 만들지 않는다. */}
        <nav className="flea-nav" aria-label="벼룩장터 안내">
          <span className="flea-nav-item">정규직 공고 {CAREERS.length}건</span>
          <span className="flea-nav-item">급여 {PAYDAY_INTERVAL}일마다</span>
          <span className="flea-nav-item">근무 월~금</span>
          <span className="flea-nav-item">요건 미달도 지원 가능</span>
          <span className="flea-nav-item">결과는 메일로</span>
          <span className="flea-nav-date">{formatGameDate(state.day)}자</span>
        </nav>
      </header>

      <div className="flea-body">
        {/* ── 위 카드 3장 ───────────────────────────────────────── */}
        <div className="flea-row">
          <section className="flea-panel" aria-label="내 채용 현황">
            <h2 className="flea-panel-head">내 채용 현황</h2>

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
                {/* 출근은 고를 공고가 없다 — 이 카드가 곧 항목이라 버튼도 여기 붙는다. */}
                <button type="button" className="flea-act" onClick={() => setActing(true)}>
                  출근하기
                </button>
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
                {app.stage === 'interview' &&
                  (state.day < app.dueDay ? (
                    <p className="flea-note">면접일이 되면 여기서 면접을 볼 수 있습니다.</p>
                  ) : (
                    /* 면접도 고를 공고가 없다 — 이 카드가 곧 항목이라 버튼도 여기 붙는다. */
                    <button type="button" className="flea-act" onClick={() => setActing(true)}>
                      면접 보러 가기
                    </button>
                  ))}
              </div>
            ) : (
              /* ux `Empty States`: 빈 화면 대신 무엇을 하면 되는지 적는다.
                 ⚠️ **직전 결과를 그 위에 남긴다** — 탈락하면 `application`이 지워져 이 카드가
                 "지원한 곳이 없습니다"로 되돌아가는데, 토스트는 지나가고 메일은 열어야 보인다.
                 지원했던 화면이 아무 말도 안 하면 통보가 없었던 것으로 읽힌다. */
              <>
                {outcome && (
                  <p className="flea-outcome" role="status">
                    <AppIcon name="fluent-color:mail-24" size={15} />
                    <span>
                      <b>
                        {formatGameDate(outcome.day)} · {findCareer(outcome.careerId)?.company}{' '}
                        {JOB_NOTICE_LABELS[outcome.kind]}
                      </b>
                      {outcome.reason && <span className="flea-dim"> — {outcome.reason}</span>}
                      <span className="flea-dim"> · 자세한 내용은 아웃룩 메일에 있습니다.</span>
                    </span>
                  </p>
                )}
                <p className="flea-empty">
                  아직 지원한 곳이 없습니다. 아래 공고를 골라 지원해 보세요. 서류 심사와 면접을
                  거쳐 합격하면 급여를 받게 됩니다.
                </p>
              </>
            )}

            {receipt && (
              <p className="flea-receipt" role="status">
                {receipt}
              </p>
            )}
          </section>

          {/* 레퍼런스의 "업직종별" 자리 — 이 사이트가 실제로 보는 여섯 스탯이다. */}
          <section className="flea-panel" aria-label="채용이 보는 스탯">
            <h2 className="flea-panel-head">채용이 보는 스탯</h2>
            <p className="flea-tile-label">서류 심사</p>
            <StatTiles keys={PAPER_STATS} stats={state.stats} />
            <p className="flea-tile-label">면접</p>
            <StatTiles keys={PERSON_STATS} stats={state.stats} />
          </section>

          <section className="flea-panel" aria-label="채용 절차">
            <h2 className="flea-panel-head">채용 절차</h2>
            <ol className="flea-steps-list">
              <li>
                <span className="flea-step-no">1</span>
                <span>
                  지원서 접수<span className="flea-dim"> · 1턴</span>
                </span>
              </li>
              <li>
                <span className="flea-step-no">2</span>
                <span>
                  서류 심사<span className="flea-dim"> · {SCREENING_DAYS}일 뒤 결과</span>
                </span>
              </li>
              <li>
                <span className="flea-step-no">3</span>
                <span>
                  면접<span className="flea-dim">
                    {' '}
                    · {INTERVIEW_LEAD_DAYS}일 뒤 안내 · {INTERVIEW_WINDOW_DAYS}일 안에 방문
                  </span>
                </span>
              </li>
              <li>
                <span className="flea-step-no">4</span>
                <span>
                  최종 결과<span className="flea-dim"> · {FINAL_DAYS}일 뒤</span>
                </span>
              </li>
            </ol>
            <p className="flea-note">
              요건이 모자라도 지원할 수 있습니다. 결과가 나오는 날까지 채우면 통과합니다.
            </p>
          </section>
        </div>

        {/* ── 공고 격자 ──────────────────────────────────────────── */}
        <section className="flea-sec">
          <h2 className="flea-sec-head">
            정규직 공고
            <span className="flea-sec-count">
              {query.trim() ? `${shown.length}건 / 전체 ${CAREERS.length}건` : `${CAREERS.length}건`}
            </span>
          </h2>
          {shown.length ? (
            <ul className="flea-grid" role="radiogroup" aria-label="지원할 공고 고르기">
              {shown.map((c) => (
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
          ) : (
            <p className="flea-empty">
              "{query.trim()}"에 걸리는 공고가 없습니다. 검색어를 지우면 전체 공고가 나옵니다.
            </p>
          )}
          {/* 왜 못 고르는지 적는다 — 비활성만 두면 이유를 알 길이 없다. */}
          {blockers.map((b) => (
            <p key={b} className="flea-alert" role="status">
              <AppIcon name="fluent-color:warning-24" size={15} />
              {b}
            </p>
          ))}
        </section>

        {/*
          공고를 누르면 곧바로 확인창이 뜬다 — 확정 패널은 폐기됐다(설계자 지시).
          면접·출근은 고를 공고가 없으므로 '내 채용 현황' 카드의 버튼이 같은 창을 연다.
        */}
        {commitActivity && confirming && (
          <ActivityConfirm
            activity={commitActivity}
            kicker="벼룩장터"
            title={
              mode === 'apply'
                ? `${confirming.company}에 지원하시겠습니까?`
                : mode === 'interview'
                  ? `${confirming.company} 면접을 보러 가시겠습니까?`
                  : `${confirming.company}에 출근하시겠습니까?`
            }
            actionLabel={
              mode === 'apply' ? '지원하기' : mode === 'interview' ? '면접 보러 가기' : '출근하기'
            }
            notes={[{ label: '공고', value: confirming.title }]}
            blocked={mode === 'apply' ? blockers[0] : undefined}
            onCommit={mode === 'apply' && picked ? () => applyToCareer(picked) : undefined}
            onCommitted={() =>
              setReceipt(
                mode === 'apply'
                  ? `${confirming.company}에 지원서를 넣었습니다. 결과는 메일로 옵니다.`
                  : mode === 'interview'
                    ? '면접을 봤습니다. 최종 결과는 메일로 옵니다.'
                    : '출근했습니다. 급여는 급여일에 들어옵니다.',
              )
            }
            onClose={() => {
              setPickedId(null)
              setActing(false)
            }}
          />
        )}

        <footer className="flea-foot">
          <p className="flea-foot-logo">벼룩장터</p>
          <p>구인 · 구직 · 부동산 · 중고거래 · 생활서비스</p>
          <p>공고의 근무 조건은 사업주가 등록한 내용이며 벼룩장터는 이를 보증하지 않습니다.</p>
        </footer>
      </div>
    </div>
  )
}

/** 아이콘 판 + 이름 + 지금 값. 사이트 안이므로 **다색** 아이콘을 쓴다(HUD만 단색). */
function StatTiles({ keys, stats }: { keys: (keyof Stats)[]; stats: Stats }) {
  return (
    <ul className="flea-tiles">
      {keys.map((k) => (
        <li key={k} className="flea-tile">
          <span className="flea-tile-plate">
            <AppIcon name={STAT_META[k].icon} size={22} />
          </span>
          <span className="flea-tile-name">{STAT_NAMES[k]}</span>
          <span className="flea-tile-value">{stats[k]}</span>
        </li>
      ))}
    </ul>
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
  const paper = needList(state, career.paper, career.cert)
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
      {/* 로고 자리. 이미지가 아니라 상호 앞 두 글자다(포스터·배너와 같은 오프라인 규칙). */}
      <span className="flea-plate" aria-hidden="true">
        {career.company.slice(0, 2)}
      </span>

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
      <span className="flea-pay">
        <span className="flea-pay-label">{PAYDAY_INTERVAL}일마다</span>
        <span className="flea-pay-value">{career.salary.toLocaleString('ko-KR')}원</span>
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
      {on && <span className="flea-picked">선택함</span>}
    </button>
  )
}
