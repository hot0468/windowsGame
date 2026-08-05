import { useState } from 'react'
import { findActivity, WORK_ACTIVITIES } from '../../../data/activities'
import { JOBS, jobsOf } from '../../../data/jobs'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canRun } from '../../../systems/turn'
import { STAT_NAMES } from '../../../types/game'
import type { Job } from '../../../data/jobs'
import type { Site } from '../../../data/sites'
import type { Activity, GameState, Stats } from '../../../types/game'
import { previewActivity } from '../activityPreview'
import { ActivityCommit } from './ActivityCommit'
import './AlbamonSite.css'

/**
 * 알바몬 — 구인 사이트. 공고를 고르면 그 공고의 **알바 활동**이 확정 패널에 올라간다.
 *
 * **둘러보기는 무료다.** 필터를 바꾸고 공고를 고르는 동안 게임 상태는 **읽기만** 한다 —
 * 스탯을 움직이는 코드는 `ActivityCommit` 안의 `doActivity` 하나뿐이다.
 *
 * ## 구조 (레퍼런스: 실제 구인 사이트 홈)
 * 프로모션 띠 → 헤더(로고·검색 알약) → 직종 필터 칩 → 추천 공고 리스트 → 확정 패널 → 푸터.
 *
 * ⚠️ **필터 칩은 장식이 아니라 진짜 필터다**(아점의 KEYWORD 격자가 곧 글감 고르기였던 것과
 * 같은 방식). 레퍼런스의 판을 베끼면서 그 자리에 게임 기능을 앉힌다. 반대로 검색창은
 * 표시 전용이다 — 자유 검색은 설계상 1차 제외 항목이라 눌러도 갈 데가 없다.
 *
 * ⚠️ **조건 미달 공고를 감추지 않는다**(ux `empty-nav-state` + `disabled-states`).
 * 감추면 "스탯을 키우면 더 좋은 일자리가 열린다"는 사실을 알 길이 없다. 비활성으로
 * 보여 주고 잠금 사유를 글자로 적는다. 판정은 **`canRun` 하나**가 한다 —
 * 화면이 자체 판정을 만들면 스케줄러·활동 창과 규칙이 갈라진다.
 */

/** 일당 표시. 활동의 money 증감을 **미리보기와 같은 함수**로 뽑는다(물가 배율 포함). */
function dailyPay(state: GameState, activity: Activity): number {
  const row = previewActivity(state, activity).rows.find((r) => r.key === 'money')
  return row ? row.value : 0
}

/**
 * 잠금 사유 문구. 판정 자체는 `canRun`이 하고, 여기서는 **왜 막혔는지**만 뽑아 적는다
 * ("지원할 수 없음"만 뜨면 무엇을 키워야 할지 알 수 없다 — ux `error-clarity`).
 */
function lockReasons(stats: Stats, activity: Activity): string[] {
  if (!activity.requires) return []
  return Object.entries(activity.requires)
    .filter(([key, need]) => stats[key as keyof Stats] < need)
    .map(
      ([key, need]) =>
        `${STAT_NAMES[key as keyof Stats]} ${need} 이상 필요 — 현재 ${stats[key as keyof Stats]}`,
    )
}

export function AlbamonSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  /** 필터. `null`이면 전체. 값은 활동 id다. */
  const [filter, setFilter] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 지원한 곳. 확정 후 화면이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [appliedAt, setAppliedAt] = useState<string | null>(null)

  if (!state) return null
  const picked = JOBS.find((j) => j.id === pickedId)
  /** 고른 공고의 활동. 아무것도 안 골랐으면 사이트 기본 활동(편의점)을 확정 패널에 올린다. */
  const commitActivity = findActivity(picked?.activityId ?? site.activityId ?? '')
  if (!commitActivity) return null

  const shown = filter ? jobsOf(filter) : JOBS

  return (
    <div className="alba">
      <p className="alba-promo">
        오늘 등록된 공고 {JOBS.length}건 · 지원하면 그 자리에서 하루가 지나갑니다
      </p>

      <header className="alba-head">
        <h1 className="alba-logo">알바몬</h1>
        {/* 표시 전용. 자유 검색은 이 게임에 없다 — 동작하지 않는 컨트롤은 만들지 않는다. */}
        <span className="alba-search" aria-hidden="true">
          <AppIcon name="mdi:magnify" size={18} />
          어떤 알바를 찾고 있나요?
        </span>
        <span className="alba-account" aria-hidden="true">
          내 이력서 · 지원현황
        </span>
      </header>

      <nav className="alba-filters" aria-label="직종 필터">
        <FilterChip label="전체" on={filter === null} onPick={() => setFilter(null)} />
        {/* 칩 목록은 `WORK_ACTIVITIES`에서 나온다 — 컴포넌트가 직종을 나열하지 않는다. */}
        {WORK_ACTIVITIES.map((a) => (
          <FilterChip
            key={a.id}
            label={a.label.replace(/^알바 \((.+)\)$/, '$1')}
            on={filter === a.id}
            onPick={() => setFilter(filter === a.id ? null : a.id)}
          />
        ))}
      </nav>

      {appliedAt && (
        <p className="alba-receipt" role="status">
          {appliedAt}에서 하루를 일했습니다. 일당이 소지금에 들어왔습니다.
        </p>
      )}

      <section className="alba-sec">
        <h2 className="alba-sec-head">
          추천 공고
          <span className="alba-sec-count">{shown.length}건</span>
        </h2>
        <ul className="alba-list" role="radiogroup" aria-label="지원할 공고 고르기">
          {shown.map((job) => (
            <li key={job.id}>
              <JobCard
                job={job}
                state={state}
                on={job.id === pickedId}
                onPick={() => setPickedId(job.id === pickedId ? null : job.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <ActivityCommit
        activity={commitActivity}
        actionLabel="지원하기"
        selection={picked ? `${picked.company} · ${picked.title}` : undefined}
        selectionHint="지원할 공고를 고르세요."
        onCommitted={() => {
          setAppliedAt(picked?.company ?? null)
          setPickedId(null)
        }}
      />

      <footer className="alba-foot">
        <p className="alba-foot-logo">알바몬</p>
        <p>고객센터 · 공지사항 · 채용 정보 · 이용약관 · 개인정보처리방침</p>
        <p>공고의 근무 조건은 사업주가 등록한 내용이며 알바몬은 이를 보증하지 않습니다.</p>
      </footer>
    </div>
  )
}

function FilterChip({ label, on, onPick }: { label: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className={`alba-chip${on ? ' alba-chip-on' : ''}`}
      aria-pressed={on}
      onClick={onPick}
    >
      {label}
    </button>
  )
}

/**
 * 공고 카드 하나. 조건이 미달이면 **감추지 않고 비활성**으로 그리고 사유를 적는다.
 * 로고 자리는 이미지가 아니라 그라데이션 판 + 상호 첫 글자다(오프라인 규칙).
 */
function JobCard({
  job,
  state,
  on,
  onPick,
}: {
  job: Job
  state: GameState
  on: boolean
  onPick: () => void
}) {
  const activity = findActivity(job.activityId)
  if (!activity) return null

  const open = canRun(state, activity)
  const reasons = lockReasons(state.stats, activity)
  const pay = dailyPay(state, activity)

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={!open}
      className={`alba-card${on ? ' alba-card-on' : ''}${open ? '' : ' alba-card-locked'}`}
      title={activity.description}
      onClick={onPick}
    >
      <span className="alba-mark" aria-hidden="true">
        {job.company.slice(0, 1)}
      </span>
      <span className="alba-body">
        <span className="alba-company">{job.company}</span>
        <span className="alba-title">
          {job.title}
          {job.badge && <span className="alba-badge">{job.badge}</span>}
        </span>
        <span className="alba-meta">
          <span className="alba-meta-item">
            <AppIcon name="mdi:map-marker-outline" size={13} />
            {job.area}
          </span>
          <span className="alba-meta-item">
            <AppIcon name="mdi:clock-outline" size={13} />
            {job.schedule}
          </span>
        </span>
        <span className="alba-tags">
          {job.tags.map((t) => (
            <span key={t} className="alba-tag">
              {t}
            </span>
          ))}
        </span>
        {/* ⚠️ 잠금 사유를 글자로 적는다. 색만으로 알리지 않는다(ux `color-not-only`). */}
        {!open &&
          (reasons.length > 0 ? (
            reasons.map((r) => (
              <span key={r} className="alba-lock">
                <AppIcon name="mdi:lock-outline" size={13} />
                {r}
              </span>
            ))
          ) : (
            <span className="alba-lock">
              <AppIcon name="mdi:lock-outline" size={13} />
              지금은 지원할 수 없습니다.
            </span>
          ))}
      </span>
      <span className="alba-pay">
        <span className="alba-pay-label">일당</span>
        <span className="alba-pay-value">{pay.toLocaleString('ko-KR')}원</span>
        {/* 고른 상태를 색만으로 알리지 않는다. */}
        {on && <span className="alba-picked">선택함</span>}
      </span>
    </button>
  )
}
