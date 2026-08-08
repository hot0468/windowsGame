import { useState } from 'react'
import { COURSES, COURSE_CATEGORIES, COURSE_LEVELS, CERTIFICATE_SESSIONS } from '../../../data/courses'
import { findActivity } from '../../../data/activities'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { blockReason, sessionsOf, isCompleted } from '../../../systems/courses'
import type { Course } from '../../../data/courses'
import type { Site } from '../../../data/sites'
import { ActivityConfirm } from '../ActivityConfirm'
import './CampusSite.css'

/**
 * 슬로우캠퍼스 — 온라인 강의 사이트. 강의를 누르면 그 강의가 가리키는 활동이 확인창에 오른다.
 *
 * **둘러보기는 무료다.** 목록을 넘기고 강의를 고르는 동안 게임 상태는 읽기만 한다 —
 * 스탯을 움직이는 코드는 확인창(`ActivityConfirm`)의 실행 버튼 하나뿐이다.
 *
 * ## 구조 (레퍼런스: 실제 온라인 클래스 사이트 홈)
 * 상단 띠(마감 임박) → 헤더(로고·검색·로그인) → 카테고리 네비 →
 * [좌측 필터(분류·난이도) | 본문(Top3 순위 → 전체 강의 격자)] → 푸터.
 *
 * ⚠️ **구독은 만들지 않는다**(설계자 지시). 레퍼런스 최상단의 구독 CTA 자리에는
 * 대신 **수료증 안내**를 둔다 — 이 사이트가 실제로 파는 것은 강의 단건이고,
 * 지속 상태(구독)를 만들면 은행·이사와 같은 밤 정산이 필요해진다.
 *
 * ⚠️ **동작하는 것만 컨트롤로 만든다**(미디북스·시집이와 같은 규칙).
 * 필터·강의 카드 클릭은 실제로 동작하고, 검색창·로그인·기업 문의는 표시만 한다.
 */

export function CampusSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const takeCourse = useGameStore((s) => s.takeCourse)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('전체')
  const [level, setLevel] = useState<string | null>(null)
  /** 방금 수강한 강의. 확정 후 화면이 그대로라 무슨 일이 일어났는지 글자로 남긴다. */
  const [taken, setTaken] = useState<string | null>(null)

  if (!state) return null

  const shown = COURSES.filter(
    (c) => (category === '전체' || c.category === category) && (!level || c.level === level),
  )
  /** 순위 목록. 수강료 높은 순 3개 — 정렬 기준을 화면에 밝힌다(레퍼런스의 Top10 자리). */
  const ranked = [...shown].sort((a, b) => b.price - a.price).slice(0, 3)

  const picked = COURSES.find((c) => c.id === pickedId)
  const pickedActivity = picked ? findActivity(picked.activityId) : undefined
  /** 못 듣는 이유. 화면은 이 문장을 그대로 쓴다(판정을 두 번 하지 않는다). */
  const blocked = picked ? blockReason(state, picked) : null

  const pick = (id: string) => {
    setPickedId(id === pickedId ? null : id)
    setTaken(null)
  }

  return (
    <div className="cam">
      {/* 상단 띠. 레퍼런스의 마감 타이머 자리 — 이 게임에 실제 마감이 없으므로
          카운트다운 대신 수료증 규칙을 알린다(가짜 타이머는 아무 데도 닿지 않는다). */}
      <div className="cam-strip">
        같은 강의를 <strong>{CERTIFICATE_SESSIONS}회</strong> 들으면 수료증이 발급됩니다
      </div>

      <header className="cam-head">
        <h1 className="cam-logo">
          SLOW<span className="cam-logo-mark">CAMPUS</span>
        </h1>
        <span className="cam-search" aria-hidden="true">
          <AppIcon name="mdi:magnify" size={18} />
          클래스, 크리에이터
        </span>
        <span className="cam-account" aria-hidden="true">
          로그인
        </span>
      </header>

      <nav className="cam-nav" aria-label="강의 분류">
        {COURSE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`cam-nav-item${category === c ? ' cam-nav-on' : ''}`}
            aria-current={category === c ? 'page' : undefined}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </nav>

      <div className="cam-main">
        <aside className="cam-side">
          {/* 좌측은 **지금 분류 안의 세부 항목**이다(레퍼런스와 같다).
              상단 네비와 같은 목록을 또 그리면 같은 것이 화면에 두 번 나온다. */}
          <section className="cam-filter">
            <h2 className="cam-filter-title">{category}</h2>
            <ul className="cam-filter-list">
              <li>
                <button
                  type="button"
                  className={`cam-filter-link${!level ? ' cam-filter-on' : ''}`}
                  onClick={() => setLevel(null)}
                >
                  전체
                </button>
              </li>
              {COURSE_LEVELS.map((l) => (
                <li key={l}>
                  <button
                    type="button"
                    className={`cam-filter-link${level === l ? ' cam-filter-on' : ''}`}
                    onClick={() => setLevel(level === l ? null : l)}
                  >
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="cam-filter">
            <h2 className="cam-filter-title">영상 언어</h2>
            {/* 표시 전용이다 — 이 게임의 강의는 전부 한국어라 고를 것이 없다.
                레퍼런스의 그 자리를 비워 두면 좌측 단이 허전해 보인다. */}
            <div className="cam-chips" aria-hidden="true">
              <span className="cam-chip cam-chip-static">한국어</span>
            </div>
          </section>
        </aside>

        <div className="cam-body">
          <section className="cam-hero">
            <h2 className="cam-hero-title">
              <span className="cam-hero-accent">{category}</span> 강의
            </h2>
            <p className="cam-hero-sub">{shown.length}개 강의를 한 건씩 결제하고 수강하세요.</p>
          </section>

          {ranked.length > 0 && (
            <section className="cam-sec">
              <h3 className="cam-sec-title">{category} Top{ranked.length}</h3>
              <div className="cam-rank">
                {ranked.map((c, i) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    rank={i + 1}
                    picked={c.id === pickedId}
                    sessions={sessionsOf(state, c.id)}
                    done={isCompleted(state, c.id)}
                    onPick={pick}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="cam-sec">
            <div className="cam-sec-head">
              <h3 className="cam-sec-title">전체 클래스</h3>
              <span className="cam-count">전체 {shown.length}개</span>
            </div>
            {shown.length === 0 ? (
              <p className="cam-empty">조건에 맞는 강의가 없습니다. 난이도 필터를 해제해 보세요.</p>
            ) : (
              <div className="cam-grid">
                {shown.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    picked={c.id === pickedId}
                    sessions={sessionsOf(state, c.id)}
                    done={isCompleted(state, c.id)}
                    onPick={pick}
                  />
                ))}
              </div>
            )}
          </section>

          {/*
            강의를 누르면 곧바로 확인창이 뜬다 — 확정 패널은 폐기됐다(설계자 지시).
            ⚠️ 수강료는 활동의 비용이 아니라 사이트가 따로 받는 돈이라 미리보기에 안 잡힌다.
            `notes`로 넘겨 같은 창에서 알린다 — 누르기 전에 비용을 다 알 수 있어야 한다.
          */}
          {picked && pickedActivity && (
            <ActivityConfirm
              activity={pickedActivity}
              kicker="슬로우캠퍼스"
              title={`『${picked.title}』을(를) 수강하시겠습니까?`}
              actionLabel={`${picked.price.toLocaleString()}원 결제하고 수강하기`}
              notes={[
                { label: '수강료', value: `${picked.price.toLocaleString()}원` },
                {
                  label: '수강 이력',
                  value: `${sessionsOf(state, picked.id)} / ${CERTIFICATE_SESSIONS}회${
                    picked.certificateItemId
                      ? isCompleted(state, picked.id)
                        ? ' · 수료증 발급 완료'
                        : ' · 다 들으면 수료증'
                      : ' · 수료증 없음'
                  }`,
                },
              ]}
              blocked={blocked ?? undefined}
              onCommit={() => {
                takeCourse(picked)
                setTaken(picked.title)
              }}
              onClose={() => setPickedId(null)}
            />
          )}

          {taken && <p className="cam-done">『{taken}』 수강을 마쳤습니다.</p>}
        </div>
      </div>

      <footer className="cam-foot">
        <span className="cam-foot-logo">SLOWCAMPUS</span>
        <span>{site.url}</span>
      </footer>
    </div>
  )
}

/** 강의 카드. 순위(`rank`)가 있으면 큰 카드, 없으면 격자 카드다. */
function CourseCard({
  course,
  rank,
  picked,
  sessions,
  done,
  onPick,
}: {
  course: Course
  rank?: number
  picked: boolean
  sessions: number
  done: boolean
  onPick: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={`cam-card${picked ? ' cam-card-on' : ''}`}
      aria-pressed={picked}
      onClick={() => onPick(course.id)}
    >
      <span className="cam-thumb" style={{ background: course.gradient }}>
        <AppIcon name={course.icon} size={38} />
        {done && <span className="cam-badge">수료</span>}
      </span>
      <span className="cam-card-body">
        {rank !== undefined && <span className="cam-rank-no">{rank}</span>}
        <span className="cam-card-title">{course.title}</span>
        <span className="cam-card-meta">
          {course.category} · {course.creator}
        </span>
        <span className="cam-card-foot">
          <span className="cam-price">{course.price.toLocaleString()}원</span>
          <span className="cam-level">{course.level}</span>
        </span>
        {/* 진행도는 들은 적 있을 때만. 0/3을 모든 카드에 박으면 노이즈가 된다. */}
        {sessions > 0 && !done && (
          <span className="cam-prog">
            수강 {sessions}/{CERTIFICATE_SESSIONS}회
          </span>
        )}
      </span>
    </button>
  )
}
