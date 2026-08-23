import { findGig } from '../../data/gigs'
import { WORK_KINDS } from '../../data/works'
import { useGameStore } from '../../store/gameStore'
import { isTopRank, rankOfWork } from '../../systems/works'
import type { Work } from '../../types/game'
import type { WorkTool } from '../../data/works'
import './WorkList.css'

/**
 * 도구 창의 **작업물 목록** — 만든 것과 그 진척(2026-08-22 설계자 지시).
 *
 * ⚠️ **도구 넷이 같은 부품을 쓴다**(VS 코드·포토샵·프리미어·오디션). 창마다 목록을 그리면
 * 게이지 계산이 넷으로 갈리고, 그중 하나만 등급 규칙을 놓친다.
 *
 * ⚠️ **여기서 턴을 쓰지 않는다.** 누르면 부모(도구 창)가 확인창(`ActivityConfirm`)을 열고,
 * 실행은 그 창이 한다 — 확인 없이 1턴을 태우는 버튼을 만들지 않는다는 전역 규칙이다.
 *
 * ⚠️ **일감 작업물이 위에 온다.** 기한이 걸린 것이 먼저 보여야 "지금 뭘 해야 하는가"가
 * 목록 순서만으로 읽힌다.
 */
export function WorkList({
  tool,
  variant = 'list',
  onRefine,
  onNew,
}: {
  tool: WorkTool
  /**
   * 어느 모양으로 그리는가(2026-08-22 설계자 지시로 셋이 됐다).
   *  - `list` — 줄 목록(기본)
   *  - `grid` — **파일 아이콘 격자**(포토샵: 작업 영역이 곧 파일 관리 화면이다)
   *  - `rail` — 창 **왼쪽 세로 영역**(프리미어·오디션)
   *
   * ⚠️ **규칙을 세 벌로 만들지 않는다** — 등급·게이지·잠금 판정은 여기 한 벌이고
   * 모양만 갈린다. 창마다 목록을 새로 그리면 그중 하나가 반드시 등급 규칙을 놓친다.
   */
  variant?: 'list' | 'grid' | 'rail'
  /** 그 작업물을 보강하러 간다(부모가 확인창을 연다). */
  onRefine: (workId: string) => void
  /** 새 작업물을 만들러 간다. */
  onNew: () => void
}) {
  /* ⚠️ **셀렉터가 새 배열을 만들면 무한 렌더가 된다**(zustand는 스냅샷을 참조로 비교한다).
     `worksOf`는 없을 때 `[]`를 새로 만들므로 여기서는 **저장된 참조 그대로** 꺼내고,
     빈 배열 처리는 아래에서 한다. 실측에서 이 한 줄이 창을 통째로 죽였다. */
  const works = useGameStore((s) => s.state?.works)
  const contract = useGameStore((s) => s.state?.gigs?.active)
  const gig = contract ? findGig(contract.gigId) : undefined

  const mine = (works ?? []).filter((w) => w.tool === tool)
  /* 일감 것이 위, 그 다음이 최근 순. `sort`는 원본을 바꾸므로 복사본에 건다. */
  const ordered = [...mine].sort((a, b) => {
    const ga = a.gigId === gig?.id ? 0 : 1
    const gb = b.gigId === gig?.id ? 0 : 1
    return ga - gb || b.day - a.day
  })

  /* ── 파일 아이콘 격자(포토샵) ─────────────────────────────
     레퍼런스는 어도비의 "YOUR RECENT ITEMS" 판이다: 큰 타일이 줄지어 서고 첫 칸이
     새로 만들기. ⚠️ 타일에도 **등급 뱃지와 게이지**가 그대로 붙는다 — 모양만 다르고
     읽히는 사실은 목록과 같아야 한다. */
  if (variant === 'grid') {
    return (
      <div className="wk wk-grid-wrap">
        <p className="wk-grid-head">
          작업물 <span className="wk-grid-count">({mine.length})</span>
          {gig?.tool === tool && (
            <span className="wk-head-gig">
              의뢰 「{gig.title}」 · {gig.wants.rank}등급 {gig.wants.count}개
            </span>
          )}
        </p>
        <ul className="wk-grid">
          <li>
            <button type="button" className="wk-tile wk-tile-new" onClick={onNew}>
              <span className="wk-tile-plus" aria-hidden="true">
                +
              </span>
              <span className="wk-tile-name">새 작업물</span>
            </button>
          </li>
          {ordered.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className={`wk-tile${w.gigId === gig?.id ? ' wk-tile-gig' : ''}`}
                onClick={() => onRefine(w.id)}
                disabled={isTopRank(w) && w.progress >= 1}
                title={`${w.title} · ${rankOfWork(w)}등급 · 진척 ${Math.round(w.progress * 100)}%`}
              >
                <span className="wk-tile-doc" aria-hidden="true" />
                <span className="wk-tile-name">{w.title}</span>
                <span className="wk-tile-meta">
                  <span
                    className={`wk-rank${isTop(w) ? ' wk-rank-top' : ''}`}
                  >
                    {rankOfWork(w)}
                  </span>
                  <span className="wk-bar">
                    <span className="wk-bar-fill" style={{ width: `${w.progress * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  /* ── 줄 목록(기본) · 세로 영역(rail) ─────────────────────
     둘은 같은 마크업이고 폭과 방향만 CSS가 정한다(`.wk-rail`). */
  return (
    <div className={`wk${variant === 'rail' ? ' wk-rail' : ''}`}>
      <div className="wk-head">
        <span>작업물 {mine.length}</span>
        {/* 새로 만들기는 머리줄의 [+]다 — VS 코드 탐색기와 같은 자리·같은 뜻. */}
        <button type="button" className="wk-add" onClick={onNew} aria-label="새 작업물 만들기">
          +
        </button>
      </div>
      {gig?.tool === tool && (
        <p className="wk-head-gig">
          의뢰 「{gig.title}」 · {gig.wants.rank}등급 {gig.wants.count}개
        </p>
      )}

      {ordered.length === 0 ? (
        /* ux `empty-states`: 없다는 말만 하지 않고 무엇을 하면 되는지 적는다. */
        <p className="wk-empty">[+]로 새 작업물을 만듭니다. 지금 실력만큼의 등급으로 시작합니다.</p>
      ) : (
        <ul className="wk-list">
          {ordered.map((w) => (
            <li key={w.id} className={`wk-item${w.gigId === gig?.id ? ' wk-item-gig' : ''}`}>
              <span className="wk-name">
                {w.title}.{WORK_KINDS[tool].ext}
                {w.gigId && <span className="wk-tag">의뢰</span>}
              </span>
              {/* 등급 뱃지 — 스탯창(`.stat-rank`)과 같은 문법(테두리 + 면, 상위 둘만 진하게). */}
              <span className={`wk-rank${isTop(w) ? ' wk-rank-top' : ''}`}>{rankOfWork(w)}</span>
              <span
                className="wk-bar"
                role="img"
                aria-label={`진척 ${Math.round(w.progress * 100)}%`}
              >
                <span className="wk-bar-fill" style={{ width: `${w.progress * 100}%` }} />
              </span>
              <span className="wk-pct">
                {isTopRank(w) && w.progress >= 1 ? '완성' : `${Math.round(w.progress * 100)}%`}
              </span>
              <button
                type="button"
                className="wk-act"
                onClick={() => onRefine(w.id)}
                disabled={isTopRank(w) && w.progress >= 1}
              >
                보강
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 상위 두 등급인가. 뱃지를 진하게 두르는 판정 하나다(세 모양이 같은 것을 본다). */
function isTop(work: Work): boolean {
  const r = rankOfWork(work)
  return r === 'S' || r === 'SS'
}
