import { useState } from 'react'
import { findActivity } from '../../data/activities'
import { artTitle } from '../../data/artworks'
import { MIN_BOOK_PAGES } from '../../data/contests'
import {
  EPISODE_PAY,
  SERIES_TITLE,
  STUDIO_NAME,
  WEEKLY_PAGES,
} from '../../data/webtoon'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { artGrade } from '../../systems/artwork'
import { openProjects, pagesOf, projectScore, projectsOf } from '../../systems/projects'
import { daysToDeadline, hasOffer, isSerializing, pagesLeft } from '../../systems/webtoon'
import { canRun } from '../../systems/turn'
import { ActivityConfirm } from './ActivityConfirm'
import type { Project } from '../../types/game'
import './ClipStudioApp.css'

/**
 * 클립스튜디오 — **무엇을 그릴지 고르는 창**(`WindowKind: 'clipstudio'`).
 *
 * ## 왜 활동 창이 아닌가
 * 설계자 지시로 그리기가 셋으로 갈렸다: **웹툰 원고**(마감을 채운다) · **개인 작업 — 단일**
 * (한 장을 갤러리에 남긴다) · **개인 작업 — 작품집**(고른 권에 한 장을 넣는다).
 * 활동 창(`ExeApp`)은 활동 **하나**를 보여 주고 실행하는 화면이라 고르기가 들어갈 자리가
 * 없다. 그래서 증기(라이브러리에서 게임을 고른다)·미디북스(책을 고른다)와 **같은 부류의
 * 고르는 창**으로 만들었고, 고른 다음에는 확정된 통로(`ActivityConfirm`)를 그대로 탄다.
 *
 * ## ⚠️ 이 창은 판정을 만들지 않는다
 * 실행 가능 여부는 전부 `canRun`이, 증감·경고는 `ActivityConfirm`이 진다. 여기가 하는
 * 일은 **무엇을 그릴지 고르는 것**과 그 선택을 스토어 액션에 넘기는 것뿐이다.
 *
 * ## ⚠️ 세 갈래가 서로 다른 스토어 액션을 지난다
 * `draw`(단일)만 확인창의 기본 동작(`doActivity`)으로 끝난다. 나머지 둘은 활동만으로는
 * 못 넘기는 값이 하나씩 더 있어서(어느 권인가 / 마감 진행도) `onCommit`으로 갈아탄다 —
 * `takeCourse`·`postArtwork`와 같은 모양이다.
 */

/** 무엇을 그리기로 골랐는가. null이면 아직 고르지 않았다. */
type Pick =
  | { kind: 'single' }
  | { kind: 'project'; project: Project }
  | { kind: 'webtoon' }

export function ClipStudioApp() {
  const state = useGameStore((s) => s.state)
  const createProject = useGameStore((s) => s.createProject)
  const drawIntoProject = useGameStore((s) => s.drawIntoProject)
  const drawWebtoon = useGameStore((s) => s.drawWebtoon)
  const acceptWebtoon = useGameStore((s) => s.acceptWebtoon)
  const declineWebtoon = useGameStore((s) => s.declineWebtoon)
  /** 확인창을 띄운 선택. */
  const [picked, setPicked] = useState<Pick | null>(null)
  /** 제의 거절 확인 중인가. ⚠️ 되돌릴 수 없어 한 번 묻는다(그몽 포기와 같은 규칙). */
  const [confirmDecline, setConfirmDecline] = useState(false)

  if (!state) return null

  const draw = findActivity('draw')
  const webtoonAct = findActivity('draw-webtoon')
  const projects = openProjects(state)
  const serializing = isSerializing(state)
  const left = pagesLeft(state) ?? 0
  const due = daysToDeadline(state) ?? 0

  return (
    <div className="cs">
      <header className="cs-head">
        <AppIcon name="fluent-color:paint-brush-24" size={26} />
        <div>
          <h1 className="cs-logo">클립스튜디오</h1>
          <p className="cs-lede">
            오늘은 무엇을 그립니까?
            {projects.length > 0 && ` · 작업 중인 작품집 ${projects.length}권`}
            {projectsOf(state).soldEarned > 0 &&
              ` · 회지 매출 ${projectsOf(state).soldEarned.toLocaleString('ko-KR')}원`}
          </p>
        </div>
      </header>

      {/*
        연재 제의. ⚠️ **목록보다 위에 둔다** — 지금 결정해야 하는 것이 먼저 읽혀야 한다
        (그몽의 진행 카드와 같은 자리·같은 이유).
      */}
      {hasOffer(state) && (
        <section className="cs-offer" aria-label="웹툰 연재 제의">
          <p className="cs-offer-kicker">{STUDIO_NAME} 편집부</p>
          <h2 className="cs-offer-title">「{SERIES_TITLE}」 연재를 제안받았습니다</h2>
          <p className="cs-offer-terms">
            매주 <b>{WEEKLY_PAGES}장</b>을 넘기면 회차당{' '}
            <b>{EPISODE_PAY.toLocaleString('ko-KR')}원</b>. 마감을 두 번 놓치면 연재가
            끝나고 <b>다시 제의가 오지 않습니다.</b>
          </p>
          {confirmDecline ? (
            <div className="cs-confirm" role="alertdialog" aria-label="연재 거절 확인">
              <p className="cs-confirm-text">
                거절하면 이 제의는 사라지고 다시 오지 않습니다.
              </p>
              {/* ⚠️ 기본 초점은 덜 위험한 쪽이다(스케줄러 취소·그몽 포기와 같은 규칙). */}
              <button
                type="button"
                className="cs-btn-ghost"
                autoFocus
                onClick={() => setConfirmDecline(false)}
              >
                더 생각해 보기
              </button>
              <button
                type="button"
                className="cs-btn-ghost cs-btn-danger"
                onClick={() => {
                  declineWebtoon()
                  setConfirmDecline(false)
                }}
              >
                거절합니다
              </button>
            </div>
          ) : (
            <div className="cs-offer-btns">
              <button type="button" className="cs-btn" onClick={acceptWebtoon}>
                연재를 맡습니다
              </button>
              <button
                type="button"
                className="cs-btn-ghost"
                onClick={() => setConfirmDecline(true)}
              >
                거절하기
              </button>
            </div>
          )}
        </section>
      )}

      {/* 연재 중이면 이번 주 마감이 맨 위다. */}
      {serializing && (
        <section className="cs-deadline" aria-label="이번 주 마감">
          <p className="cs-offer-kicker">연재 중 · {STUDIO_NAME}</p>
          <h2 className="cs-offer-title">「{SERIES_TITLE}」</h2>
          <div className="cs-bar" role="img" aria-label={`원고 ${WEEKLY_PAGES - left} / ${WEEKLY_PAGES}`}>
            <span
              className="cs-bar-fill"
              style={{ width: `${((WEEKLY_PAGES - left) / WEEKLY_PAGES) * 100}%` }}
            />
          </div>
          {/* 색만으로 알리지 않는다 — 숫자와 문장이 같은 사실을 말한다. */}
          <p className={`cs-due${due <= 1 ? ' cs-due-soon' : ''}`}>
            원고 <b>{WEEKLY_PAGES - left}</b> / {WEEKLY_PAGES} ·{' '}
            {left === 0
              ? '이번 주 분량을 다 넘겼습니다'
              : `${left}장 더 그려야 합니다`}{' '}
            · {dueText(due)}
          </p>
          <button
            type="button"
            className="cs-btn"
            disabled={!webtoonAct || !canRun(state, webtoonAct) || left === 0}
            onClick={() => setPicked({ kind: 'webtoon' })}
          >
            원고 작업
          </button>
          {left === 0 && (
            <span className="cs-note">
              다음 마감이 시작되면 다시 그릴 수 있습니다.
            </span>
          )}
        </section>
      )}

      {/* ── 개인 작업 ───────────────────────────────────────────── */}
      <section className="cs-sec" aria-label="개인 작업">
        <h2 className="cs-sec-head">개인 작업</h2>

        <button
          type="button"
          className="cs-single"
          disabled={!draw || !canRun(state, draw)}
          onClick={() => setPicked({ kind: 'single' })}
        >
          <AppIcon name="fluent-color:image-24" size={22} />
          <span className="cs-single-body">
            <span className="cs-single-title">단일 작품</span>
            <span className="cs-single-desc">
              한 장을 끝까지 그려 사진첩에 남깁니다. 트위터에 올리거나 단일 공모전에 낼 수
              있습니다.
            </span>
          </span>
        </button>

        <div className="cs-projects-head">
          <h3 className="cs-sub">작품집</h3>
          {/* ⚠️ 만드는 것은 턴을 안 쓴다(폴더를 만드는 일이다). */}
          <button type="button" className="cs-btn-ghost" onClick={createProject}>
            새 작품집 만들기
          </button>
        </div>

        {projects.length === 0 ? (
          /* ux `empty-states`: 빈 줄만 남기지 않고 무엇을 하면 되는지 알린다. */
          <p className="cs-empty">
            아직 작업 중인 작품집이 없습니다. 새로 만들면 그린 장이 그 안에 쌓이고,{' '}
            {MIN_BOOK_PAGES}장부터 코미콘에서 회지로 팔 수 있습니다.
          </p>
        ) : (
          <ul className="cs-list">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  project={p}
                  pages={p.pageIds.length}
                  score={projectScore(state, p)}
                  canDraw={!!draw && canRun(state, draw)}
                  onDraw={() => setPicked({ kind: 'project', project: p })}
                  latest={lastPageLabel(state, p)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="cs-foot">
        <p>
          그린 장은 사진첩에 남습니다. 작품집은 공모전에 내거나 코미콘에서 회지로 팔 수
          있고, <b>한 번 쓰면 닫힙니다.</b>
        </p>
      </footer>

      {/*
        ⚠️ **확정은 확인창 하나가 진다**(증감·번아웃·오후 생활비 경고). 여기서 갈리는 것은
        `onCommit`뿐이다 — 활동만으로는 못 넘기는 값(어느 권인가 / 마감 진행도)이 있기 때문.
      */}
      {picked?.kind === 'single' && draw && (
        <ActivityConfirm
          activity={draw}
          kicker="클립스튜디오"
          title="한 장을 그리시겠습니까?"
          actionLabel="그리기"
          onClose={() => setPicked(null)}
        />
      )}
      {picked?.kind === 'project' && draw && (
        <ActivityConfirm
          activity={draw}
          kicker={`클립스튜디오 · ${picked.project.name}`}
          title={`「${picked.project.name}」에 한 장을 더하시겠습니까?`}
          actionLabel="그려 넣기"
          notes={[
            { label: '지금 장수', value: `${picked.project.pageIds.length}장` },
            { label: '그린 뒤', value: `${picked.project.pageIds.length + 1}장` },
          ]}
          onCommit={() => drawIntoProject(picked.project.id)}
          onClose={() => setPicked(null)}
        />
      )}
      {picked?.kind === 'webtoon' && webtoonAct && (
        <ActivityConfirm
          activity={webtoonAct}
          kicker={`${STUDIO_NAME} · 「${SERIES_TITLE}」`}
          title="이번 회차 원고를 한 장 치시겠습니까?"
          actionLabel="원고 작업"
          notes={[
            { label: '이번 주', value: `${WEEKLY_PAGES - left} / ${WEEKLY_PAGES}장` },
            { label: '마감', value: dueText(due) },
            {
              label: '회차 원고료',
              value: `${EPISODE_PAY.toLocaleString('ko-KR')}원 (마감을 채워야 지급)`,
            },
          ]}
          onCommit={drawWebtoon}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  )
}

/** 마감 문구. 숫자만으로는 급한 줄 모른다(그몽 `dueText`와 같은 규칙). */
function dueText(left: number): string {
  if (left > 1) return `${left}일 남음`
  if (left === 1) return '내일까지'
  return '오늘까지'
}

/** 그 권의 마지막 장 제목. 없으면 빈 권이다. */
function lastPageLabel(state: Parameters<typeof pagesOf>[0], project: Project): string | undefined {
  const pages = pagesOf(state, project)
  const last = pages[pages.length - 1]
  return last ? `${artTitle(last.serial)} · ${artGrade(last)}` : undefined
}

function ProjectCard({
  project,
  pages,
  score,
  canDraw,
  latest,
  onDraw,
}: {
  project: Project
  pages: number
  score: number
  canDraw: boolean
  latest?: string
  onDraw: () => void
}) {
  return (
    <article className="cs-card">
      <span className="cs-card-mark" aria-hidden="true">
        <AppIcon name="fluent-color:document-folder-24" size={22} />
      </span>
      <span className="cs-card-body">
        <span className="cs-card-title">{project.name}</span>
        <span className="cs-card-meta">
          <b>{pages}장</b>
          {pages > 0 && ` · 평균 완성도 ${Math.round(score * 100)}%`}
          {latest && ` · 마지막 장 ${latest}`}
        </span>
        {/* 회지 조건을 카드에 그대로 적는다 — 몇 장부터 팔 수 있는지가 그리는 이유다. */}
        <span className="cs-card-note">
          {pages >= MIN_BOOK_PAGES
            ? '코미콘에서 회지로 팔거나 만화 공모전에 낼 수 있습니다'
            : `${MIN_BOOK_PAGES - pages}장 더 그리면 회지로 낼 수 있습니다`}
        </span>
      </span>
      <button type="button" className="cs-btn" disabled={!canDraw} onClick={onDraw}>
        여기에 그리기
      </button>
    </article>
  )
}
