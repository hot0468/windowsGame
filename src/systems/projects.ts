import { MIN_BOOK_PAGES, QUALITY_MULTIPLIER, WON_PER_PAGE } from '../data/contests'
import { findActivity } from '../data/activities'
import { artRatio } from './artwork'
import { canRun, clampStats, runActivity, settleGameOver } from './turn'
import type { Artwork, GameState, Project, ProjectState } from '../types/game'

/**
 * 작품집(프로젝트) — 클립스튜디오로 그린 그림을 한 권으로 묶는다.
 *
 * ## 흐름
 * 1. **만들기**: 빈 권을 하나 만든다. ⚠️ **턴을 쓰지 않는다**(폴더를 만드는 일이다).
 * 2. **그리기**: 클립스튜디오에서 그 권을 골라 그리면 **1턴**을 쓰고 한 장이 들어간다.
 * 3. **쓰기**: 다 되면 **공모전에 내거나**(`systems/contests.ts`) **코미콘에서 회지로 판다**.
 *
 * ## ⚠️ 한 권은 한 번만 쓴다
 * 공모전에도 내고 회지로도 팔면 **한 번 그린 것으로 두 번 번다.** 그러면 "원하는 만큼
 * 새로 만든다"는 규칙이 뜻을 잃고, 회지 수익 상한(`WON_PER_PAGE`)이 지탱하는
 * "판은 반드시 끝난다"도 함께 무너진다. 다 쓴 권은 `usedFor`가 박혀 목록에서 잠긴다.
 *
 * ## ⚠️ 그림을 복사해 담지 않는다
 * 프로젝트는 `pageIds`로 **가리키기만** 한다. 그림의 단일 출처는 `GameState.artworks`이고
 * 갤러리가 그것을 그린다 — 복사본을 두면 등급 기준을 손볼 때 한쪽만 낡는다
 * (`Artwork`가 등급이 아니라 그릴 때의 스탯만 박아 두는 것과 같은 판단).
 *
 * ## 의존 방향
 * `projects.ts` → `turn.ts` (반대는 없다). `turn.ts`는 이 파일을 모른다.
 */

export function emptyProjects(): ProjectState {
  return { projects: [], nextSerial: 1, soldEarned: 0 }
}

export function projectsOf(state: GameState): ProjectState {
  return state.projects ?? emptyProjects()
}

export function findProject(state: GameState, id: string): Project | undefined {
  return projectsOf(state).projects.find((p) => p.id === id)
}

/** 아직 쓰지 않은 권. 그리기·공모·판매의 대상이 되는 목록이다. */
export function openProjects(state: GameState): Project[] {
  return projectsOf(state).projects.filter((p) => !p.usedFor)
}

/** 그 권에 담긴 그림. **없는 그림 id는 조용히 걸러낸다**(세이브가 어긋나도 화면이 안 깨진다). */
export function pagesOf(state: GameState, project: Project): Artwork[] {
  const all = state.artworks ?? []
  return project.pageIds
    .map((id) => all.find((a) => a.id === id))
    .filter((a): a is Artwork => a !== undefined)
}

/**
 * 그 권의 평균 완성도(0~1+). **공모전 심사와 회지 매출이 같이 보는 값이다.**
 * ⚠️ 빈 권은 0이다 — 나눗셈을 하기 전에 막는다.
 */
export function projectScore(state: GameState, project: Project): number {
  const pages = pagesOf(state, project)
  if (pages.length === 0) return 0
  return pages.reduce((sum, a) => sum + artRatio(a), 0) / pages.length
}

/**
 * 새 권을 만든다. **턴을 쓰지 않는다** — 폴더를 만드는 일이지 그리는 일이 아니다
 * (그몽 수주·은행 거래와 같은 부류).
 */
export function createProject(state: GameState): GameState {
  if (state.gameOver) return state
  const book = projectsOf(state)
  const serial = book.nextSerial
  const project: Project = {
    id: `proj-${serial}`,
    name: `작품집 ${serial}`,
    createdDay: state.day,
    pageIds: [],
  }
  return {
    ...state,
    projects: {
      ...book,
      projects: [...book.projects, project],
      nextSerial: serial + 1,
    },
  }
}

/**
 * 그 권에 한 장을 그려 넣는다. **1턴을 쓴다**(`draw` 활동이 비용을 갖는다).
 *
 * ⚠️ **`postArtwork`와 같은 모양이다**: 조건을 다 보고 하나라도 안 되면 상태를 **그대로**
 * 돌려준다(반쪽 상태 금지 — 턴은 갔는데 장은 안 들어간, 또는 그 반대).
 * ⚠️ **그림은 `runActivity`가 만든다**(`producesArt`). 여기서 따로 찍지 않는다 — 실행
 * 통로가 넷이라 그림 생성이 밖에 있으면 스케줄러 예약에서 조용히 샌다. 우리가 하는 일은
 * **방금 생긴 마지막 그림을 이 권에 가리키게 하는 것**뿐이다.
 */
export function drawIntoProject(state: GameState, projectId: string): GameState {
  if (state.gameOver) return state
  const project = findProject(state, projectId)
  if (!project || project.usedFor) return state

  const activity = findActivity('draw')
  if (!activity || !canRun(state, activity)) return state

  const next = runActivity(state, activity)
  if (next === state) return state

  const made = (next.artworks ?? [])[(next.artworks ?? []).length - 1]
  if (!made) return next

  const book = projectsOf(next)
  return {
    ...next,
    projects: {
      ...book,
      projects: book.projects.map((p) =>
        p.id === projectId ? { ...p, pageIds: [...p.pageIds, made.id] } : p,
      ),
    },
  }
}

/* ── 코미콘 회지 판매 ─────────────────────────────────────────────────── */

/** 회지로 낼 수 있는 권. **최소 장수를 넘겨야 책이 된다.** */
export function sellableProjects(state: GameState): Project[] {
  return openProjects(state).filter((p) => p.pageIds.length >= MIN_BOOK_PAGES)
}

/** 그 완성도의 매출 배율과 설명. 화면이 판매 전에 그대로 적는다. */
export function qualityTier(score: number) {
  return QUALITY_MULTIPLIER.find((q) => score >= q.minScore) ?? QUALITY_MULTIPLIER[QUALITY_MULTIPLIER.length - 1]
}

/**
 * 이 권을 회지로 내면 들어올 돈. **판매 전에 화면이 미리 적는 값이고 실제 지급도 이 함수다**
 * — 두 곳에서 계산하면 미리보기가 거짓말을 한다(`previewActivity`와 같은 규칙).
 */
export function bookRevenue(state: GameState, project: Project): number {
  const tier = qualityTier(projectScore(state, project))
  return Math.round(project.pageIds.length * WON_PER_PAGE * tier.multiplier)
}

/**
 * 코미콘에서 회지를 판다. **1턴을 쓴다**(`comicon` 활동 — 실제로 가서 앉아 있는 일이다).
 *
 * ⚠️ **돈은 즉시 들어온다**(밤으로 미루지 않는다). 미루면 `nightPayoutPending`에 원천이
 * 하나 더 생기고 "다 팔았는데 그날 밤 굶어 죽는" 판이 난다 — 외주 납품과 같은 판단.
 * ⚠️ **`settleGameOver`로 끝낸다** — 밤에 돈을 넣는 함수의 규칙과 같다.
 */
export function sellAtComicon(state: GameState, projectId: string): GameState {
  if (state.gameOver) return state
  const project = findProject(state, projectId)
  if (!project || project.usedFor || project.pageIds.length < MIN_BOOK_PAGES) return state

  const activity = findActivity('comicon')
  if (!activity || !canRun(state, activity)) return state

  const revenue = bookRevenue(state, project)
  const next = runActivity(state, activity)
  if (next === state) return state

  const book = projectsOf(next)
  return settleGameOver({
    ...next,
    stats: clampStats({ ...next.stats, money: next.stats.money + revenue }),
    projects: {
      ...book,
      projects: book.projects.map((p) => (p.id === projectId ? { ...p, usedFor: 'comicon' } : p)),
      soldEarned: book.soldEarned + revenue,
    },
  })
}
