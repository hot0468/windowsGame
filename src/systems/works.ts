import {
  BASE_GAIN,
  SKILL_GAIN,
  WORK_KINDS,
  WORK_MASTERY,
  workTitle,
} from '../data/works'
import { RANK_ORDER, rankOfRatio } from './rankScale'
import type { WorkTool } from '../data/works'
import type { StatRank } from './rankScale'
import type { GameState, Work } from '../types/game'

/**
 * 작업물 규칙 — **만들고, 보강하고, 등급이 오른다.**
 *
 * ## 등급은 저장한다 (그림과 반대다)
 * 그림(`systems/artwork.ts`)은 그릴 때의 스탯을 박아 두고 등급을 매번 계산한다 — 나중에
 * 손댈 수 없는 물건이기 때문이다. 작업물은 **보강해서 올리는 것이 전부**라 지금 등급과
 * 진척을 상태로 들어야 한다. ⚠️ 둘을 합치지 말 것(사유는 `data/works.ts`).
 *
 * ## 스탯이 정하는 것은 둘이다
 * ①**시작 등급**(개인 작업물은 지금 실력에서 시작한다) ②**보강 한 번의 진척**.
 * 그래서 잘하는 사람은 좋은 것을 빨리 만들고, 못하는 사람도 **여러 번 손보면** 닿는다 —
 * 실력이 문을 잠그지 않고 시간으로 바꿔 준다.
 *
 * ## ⚠️ 의존 방향
 * `works.ts` → `rankScale.ts`뿐이다(`turn.ts`를 부르지 않는다). 실행 통로가 넷이라
 * 활동 실행에 얹는 일은 `turn.ts`가 하고, 여기는 **순수한 계산과 새 상태**만 돌려준다.
 */

export function worksOf(state: GameState): Work[] {
  return state.works ?? []
}

export function findWork(state: GameState, id: string): Work | undefined {
  return worksOf(state).find((w) => w.id === id)
}

/** 그 도구가 보는 두 스탯의 실력 비율(0~1). 시작 등급과 상승률이 전부 여기서 나온다. */
export function skillRatio(state: GameState, tool: WorkTool): number {
  const [a, b] = WORK_KINDS[tool].stats
  const avg = (state.stats[a] + state.stats[b]) / 2
  return Math.min(1, Math.max(0, avg / WORK_MASTERY))
}

/** 지금 실력으로 만들면 나오는 등급. */
export function startRank(state: GameState, tool: WorkTool): StatRank {
  return rankOfRatio(skillRatio(state, tool))
}

/**
 * 보강 한 번의 진척(0~1).
 * ⚠️ **0이 되지 않는다**(`BASE_GAIN`) — 못하는 사람은 느린 것이지 못 하는 것이 아니다.
 */
export function gainOf(state: GameState, tool: WorkTool): number {
  return BASE_GAIN + SKILL_GAIN * skillRatio(state, tool)
}

export function rankOfWork(work: Work): StatRank {
  return RANK_ORDER[work.rankIndex] ?? 'F'
}

/** 그 등급이 요구 등급 이상인가. 일감 납품 판정이 이 한 줄을 쓴다. */
export function meetsRank(work: Work, required: StatRank): boolean {
  return work.rankIndex >= RANK_ORDER.indexOf(required)
}

/** 최고 등급인가. 더 올릴 데가 없으면 게이지가 가득 찬 채로 멈춘다. */
export function isTopRank(work: Work): boolean {
  return work.rankIndex >= RANK_ORDER.length - 1
}

/** 그 도구로 만든 다음 작업물의 일련번호. 도구마다 따로 센다. */
function nextSerial(state: GameState, tool: WorkTool): number {
  return worksOf(state).filter((w) => w.tool === tool).length + 1
}

/**
 * 새 작업물을 만든다.
 *
 * ⚠️ **일감 작업물은 F에서 시작한다**(`gigId`가 있으면) — 의뢰는 남이 시킨 것이라
 * 처음부터 잘 나오지 않고, 그래서 기간 안에 몇 번 보강할 수 있는가가 곧 난이도가 된다.
 * 개인 작업물은 반대로 **지금 실력에서 시작한다**(`startRank`).
 */
export function createWork(state: GameState, tool: WorkTool, gigId?: string): GameState {
  const serial = nextSerial(state, tool)
  const work: Work = {
    id: `${tool}-${state.day}-${serial}`,
    tool,
    title: workTitle(tool, serial),
    day: state.day,
    rankIndex: gigId ? 0 : RANK_ORDER.indexOf(startRank(state, tool)),
    progress: 0,
    ...(gigId ? { gigId } : {}),
  }
  return { ...state, works: [...worksOf(state), work] }
}

/**
 * 작업물 하나를 보강한다. 게이지가 차면 **등급이 오르고 게이지는 넘친 만큼만 남는다.**
 *
 * ⚠️ 한 번에 두 등급이 오를 수 있게 두지 않는다(`while`이 아니라 한 번만 접는다) —
 * `BASE_GAIN + SKILL_GAIN`이 1을 못 넘으므로 애초에 그럴 일이 없고, 여기서 while을 쓰면
 * 상수를 손볼 때 게이지가 조용히 장식이 된다.
 */
export function refineWork(state: GameState, workId: string): GameState {
  const work = findWork(state, workId)
  if (!work) return state
  if (isTopRank(work) && work.progress >= 1) return state

  const raw = work.progress + gainOf(state, work.tool)
  const next: Work =
    raw >= 1 && !isTopRank(work)
      ? { ...work, rankIndex: work.rankIndex + 1, progress: raw - 1 }
      : { ...work, progress: Math.min(1, raw) }
  return { ...state, works: worksOf(state).map((w) => (w.id === workId ? next : w)) }
}

/** 그 일감으로 만든 작업물들. */
export function worksForGig(state: GameState, gigId: string): Work[] {
  return worksOf(state).filter((w) => w.gigId === gigId)
}

/** 그 도구로 만든 **개인** 작업물(일감 것은 뺀다). 도구 앱 목록이 읽는 값. */
export function personalWorks(state: GameState, tool: WorkTool): Work[] {
  return worksOf(state).filter((w) => w.tool === tool && !w.gigId)
}
