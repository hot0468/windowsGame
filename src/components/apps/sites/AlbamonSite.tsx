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
import { ActivityConfirm } from '../ActivityConfirm'
import './AlbamonSite.css'

/**
 * 알바몬 — 구인 사이트. 공고를 누르면 그 공고의 **알바 활동**이 확인창에 올라간다.
 *
 * **둘러보기는 무료다.** 필터를 바꾸고 공고를 고르는 동안 게임 상태는 **읽기만** 한다 —
 * 스탯을 움직이는 코드는 확인창(`ActivityConfirm`)의 `doActivity` 하나뿐이다.
 *
 * ## 구조 (레퍼런스: 실제 구인 사이트 홈 스크린샷)
 * 이벤트 띠 → 헤더(로고·검색 알약·계정) → **네비 줄** → 히어로 배너 →
 * **회색 구역 안의 카드 격자** → 푸터.
 *
 * ⚠️ **네비 줄은 장식이 아니라 직종 필터다**(아점의 KEYWORD 격자가 곧 글감 고르기였던 것과
 * 같은 방식). 레퍼런스의 자리를 베끼되 그 자리에 게임 기능을 앉힌다 — 눌러도 갈 데 없는
 * 링크(채용정보·브랜드알바·인재정보·알바톡)를 그리지 않는다.
 *
 * ⚠️ **레퍼런스에서 덜어낸 것**: 로그인/회원가입·이력서 등록·공고 등록(이 게임에 계정이
 * 없다), 브랜드알바 캐러셀·알바몬 추천 아이콘 줄(전부 갈 데 없는 링크), 지역별 알바 칩
 * (필터 축을 둘로 늘리면 공고 8건에 과하다), 카드의 [+] 스크랩 버튼(스크랩할 곳이 없다),
 * 구역 머리의 [AD] 뱃지(이 게임에서 광고는 배너존 하나뿐이고 그쪽만 보상을 준다).
 * 히어로는 광고가 아니라 **게임 사실**(오늘 최고 일당)을 진다.
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

/** 히어로가 쓰는 값. 오늘 일당이 가장 높은 공고 하나(수치는 전부 파생이라 새 상태가 없다). */
function topPaying(state: GameState): { job: Job; activity: Activity; pay: number } | null {
  return JOBS.reduce<{ job: Job; activity: Activity; pay: number } | null>((best, job) => {
    const activity = findActivity(job.activityId)
    if (!activity) return best
    const pay = dailyPay(state, activity)
    return !best || pay > best.pay ? { job, activity, pay } : best
  }, null)
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
  /** 고른 공고의 활동. 아무것도 안 골랐으면 사이트 기본 활동(편의점)으로 둔다. */
  const commitActivity = findActivity(picked?.activityId ?? site.activityId ?? '')
  if (!commitActivity) return null

  const shown = filter ? jobsOf(filter) : JOBS
  const top = topPaying(state)
  const topLock = top ? lockReasons(state.stats, top.activity)[0] : undefined

  return (
    <div className="alba">
      <p className="alba-strip">
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

      {/* 레퍼런스의 네비 줄 자리. 항목은 `WORK_ACTIVITIES`에서 나온다(직종을 나열하지 않는다). */}
      <nav className="alba-nav" aria-label="직종 필터">
        <NavTab label="전체" on={filter === null} onPick={() => setFilter(null)} />
        {WORK_ACTIVITIES.map((a) => (
          <NavTab
            key={a.id}
            label={a.label.replace(/^알바 \((.+)\)$/, '$1')}
            on={filter === a.id}
            onPick={() => setFilter(filter === a.id ? null : a.id)}
          />
        ))}
      </nav>

      {/* 레퍼런스의 어두운 히어로 배너. 광고가 아니라 게임 사실을 진다. */}
      {top && (
        <section className="alba-hero" aria-label="오늘 최고 일당">
          <p className="alba-hero-kicker">오늘 가장 높은 일당</p>
          <p className="alba-hero-figure">
            {top.pay.toLocaleString('ko-KR')}
            <span className="alba-hero-unit">원</span>
          </p>
          <p className="alba-hero-sub">
            {top.job.company} · {top.job.title}
          </p>
          <p className="alba-hero-note">{topLock ?? '지금 지원할 수 있는 공고입니다.'}</p>
        </section>
      )}

      {appliedAt && (
        <p className="alba-receipt" role="status">
          {appliedAt}에서 하루를 일했습니다. 일당이 소지금에 들어왔습니다.
        </p>
      )}

      {/* 회색 구역 = 레퍼런스의 '지금 가장 주목받는 알바' 판. 배경은 전폭, 내용만 폭을 묶는다. */}
      <div className="alba-band">
        <section className="alba-sec">
          <h2 className="alba-sec-head">
            지금 가장 주목받는 알바
            <span className="alba-sec-count">{shown.length}건</span>
          </h2>
          <ul className="alba-grid" role="radiogroup" aria-label="지원할 공고 고르기">
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
      </div>

      {/* 공고를 누르면 곧바로 확인창이 뜬다 — 확정 패널은 폐기됐다(설계자 지시). */}
      {picked && (
        <ActivityConfirm
          activity={commitActivity}
          kicker="알바몬"
          title={`${picked.company}에 지원하시겠습니까?`}
          actionLabel="지원하기"
          notes={[{ label: '공고', value: picked.title }]}
          onCommitted={() => setAppliedAt(picked.company)}
          onClose={() => setPickedId(null)}
        />
      )}

      <footer className="alba-foot">
        <p className="alba-foot-logo">알바몬</p>
        <p>고객센터 · 공지사항 · 채용 정보 · 이용약관 · 개인정보처리방침</p>
        <p>공고의 근무 조건은 사업주가 등록한 내용이며 알바몬은 이를 보증하지 않습니다.</p>
      </footer>
    </div>
  )
}

/** 네비 줄의 한 칸. 선택은 색이 아니라 **밑줄 + 굵기 + `aria-pressed`**가 알린다. */
function NavTab({ label, on, onPick }: { label: string; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className={`alba-tab${on ? ' alba-tab-on' : ''}`}
      aria-pressed={on}
      onClick={onPick}
    >
      {label}
    </button>
  )
}

/**
 * 공고 카드 하나. 레퍼런스처럼 **세로 카드**다(상호 → 해시태그 → 제목 → 하단 일당 바).
 * 조건이 미달이면 **감추지 않고 비활성**으로 그리고 사유를 적는다.
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
      <span className="alba-card-head">
        <span className="alba-mark" aria-hidden="true">
          {job.company.slice(0, 1)}
        </span>
        <span className="alba-company">{job.company}</span>
      </span>

      {/* 레퍼런스의 해시태그 메타 줄. 태그와 지역을 한 줄로 잇는다. */}
      <span className="alba-tags">
        {job.tags.map((t) => (
          <span key={t} className="alba-tag">
            #{t}
          </span>
        ))}
        <span className="alba-tag-area">· {job.area}</span>
      </span>

      <span className="alba-title">
        {job.title}
        {job.badge && <span className="alba-badge">{job.badge}</span>}
      </span>

      <span className="alba-when">
        <AppIcon name="mdi:clock-outline" size={13} />
        {job.schedule}
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

      <span className="alba-pay">
        <span className="alba-pay-label">일당</span>
        <span className="alba-pay-value">{pay.toLocaleString('ko-KR')}원</span>
        {/* 고른 상태를 색만으로 알리지 않는다. */}
        {on && <span className="alba-picked">선택함</span>}
      </span>
    </button>
  )
}
