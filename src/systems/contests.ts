import { CONTESTS, findContest } from '../data/contests'
import { MAILBOX } from '../data/messages'
import { artRatio } from './artwork'
import { findProject, pagesOf, projectScore, projectsOf } from './projects'
import { clampStats, growthCap, settleGameOver } from './turn'
import type { Contest } from '../data/contests'
import { messageTime, turnIndex } from './messages'
import type { TimedMessage } from './messages'
import type { ContestEntry, ContestState, GameState } from '../types/game'

/**
 * 공모전 — 출품 · 심사 · 발표.
 *
 * ## ⚠️ O넷 자격시험과 같은 구조다
 * **낸 즉시가 아니라 발표일 밤에, 낸 시점의 사실로 확정된다.** 무작위는 없고
 * (`data/contests.ts` 주석 참조) 결과는 **아웃룩 메일**로 온다 — `examMessages`와 같은
 * 자리·같은 채널이라 새 알림 창구를 만들지 않는다.
 *
 * ## ⚠️ 낸 시점의 장수·점수를 찍어 둔다
 * 발표까지 며칠이 걸리는데 그 사이에도 프로젝트에 장을 더 넣을 수 있다. 발표일에 다시
 * 계산하면 **내고 나서 계속 그려 점수를 올리는** 자리가 생기므로, `ContestEntry`가
 * `pages`·`score`를 함께 들고 심사는 그 값만 본다.
 *
 * ## ⚠️ 한 공모전에는 한 번만 낸다
 * 상금 풀이 유한한 것이 "판은 반드시 끝난다"를 지탱한다 — 같은 공모전을 반복하면
 * 그 상한이 사라진다. 낸 작품(프로젝트)도 다시 못 쓴다(`usedFor`).
 *
 * ## 의존 방향
 * `contests.ts` → `projects.ts` → `turn.ts` (반대는 없다).
 */

export function emptyContests(): ContestState {
  return { entries: [], wins: 0, earned: 0 }
}

export function contestsStateOf(state: GameState): ContestState {
  return state.contests ?? emptyContests()
}

/** 이미 낸 공모전인가. 결과가 나왔든 아니든 한 번이면 끝이다. */
export function hasEntered(state: GameState, contestId: string): boolean {
  return contestsStateOf(state).entries.some((e) => e.contestId === contestId)
}

/** 아직 심사 중인 출품. 화면이 "결과를 기다리는 중"을 그리는 근거다. */
export function pendingEntries(state: GameState): ContestEntry[] {
  return contestsStateOf(state).entries.filter((e) => e.prize === undefined)
}

/**
 * 못 내는 이유. **판정과 사유를 나란히 둔다** — 화면이 두 번째 판정을 만들지 않는다
 * (`takeBlockers`·`blockReasons`와 같은 규칙).
 *
 * ⚠️ 장수 제한은 **자격 요건이지 점수가 아니다**(모자라도 넘쳐도 못 낸다).
 */
export function entryBlockers(
  state: GameState,
  contest: Contest,
  pick?: { projectId?: string; artworkId?: string },
): string[] {
  const out: string[] = []
  if (hasEntered(state, contest.id)) out.push('이미 출품한 공모전입니다')

  /* ⚠️ **스탯 대회는 낼 물건이 없다** — 고르지 않았다고 막으면 영영 못 낸다.
     막는 것은 "이미 냈는가" 하나뿐이고, 점수가 낮으면 못 내는 것이 아니라 **낙선한다**
     (조건 미달로 막으면 "얼마면 되는가"를 화면이 말해야 하는데 그건 답을 알려 주는 것이다). */
  if (contest.kind === 'stat') return out

  if (contest.kind === 'comic') {
    const project = pick?.projectId ? findProject(state, pick.projectId) : undefined
    if (!project) {
      out.push('출품할 작품집을 골라야 합니다')
    } else if (project.usedFor) {
      out.push('이미 쓴 작품집입니다')
    } else {
      const pages = project.pageIds.length
      if (contest.minPages !== undefined && pages < contest.minPages) {
        out.push(`${contest.minPages}장 이상이어야 합니다 — 현재 ${pages}장`)
      }
      if (contest.maxPages !== undefined && pages > contest.maxPages) {
        out.push(`${contest.maxPages}장 이하여야 합니다 — 현재 ${pages}장`)
      }
    }
  } else {
    const work = pick?.artworkId
      ? (state.artworks ?? []).find((a) => a.id === pick.artworkId)
      : undefined
    if (!work) out.push('출품할 그림을 골라야 합니다')
  }
  return out
}

export function canEnter(
  state: GameState,
  contest: Contest,
  pick?: { projectId?: string; artworkId?: string },
): boolean {
  return entryBlockers(state, contest, pick).length === 0
}

/**
 * 출품한다. **턴을 쓰지 않는다** — 봉투에 넣어 부치는 일이지 그리는 일이 아니다
 * (그몽 수주·은행 거래와 같은 부류). 시간의 비용은 **발표까지의 기다림**이 진다.
 */
export function enterContest(
  state: GameState,
  contestId: string,
  pick: { projectId?: string; artworkId?: string },
): GameState {
  if (state.gameOver) return state
  const contest = findContest(contestId)
  if (!contest || !canEnter(state, contest, pick)) return state

  const book = projectsOf(state)
  let pages = 1
  let score = 0

  if (contest.kind === 'stat') {
    score = statScore(state, contest)
  } else if (contest.kind === 'comic') {
    const project = findProject(state, pick.projectId!)!
    pages = project.pageIds.length
    score = projectScore(state, project)
  } else {
    const work = (state.artworks ?? []).find((a) => a.id === pick.artworkId)!
    score = artRatio(work)
  }

  const entry: ContestEntry = {
    contestId,
    projectId: pick.projectId,
    artworkId: pick.artworkId,
    enteredDay: state.day,
    resultDay: state.day + contest.judgeDays,
    pages,
    score,
  }
  const contests = contestsStateOf(state)

  return {
    ...state,
    contests: { ...contests, entries: [...contests.entries, entry] },
    /* 낸 작품집은 잠긴다 — 회지로도 파는 이중 수입을 막는다(`projects.ts` 주석 참조). */
    projects: pick.projectId
      ? {
          ...book,
          projects: book.projects.map((p) =>
            p.id === pick.projectId ? { ...p, usedFor: 'contest' as const } : p,
          ),
        }
      : state.projects,
  }
}

/**
 * 스탯 대회의 점수 — **심사가 보는 스탯들의 평균 비율**(각 스탯 ÷ 그 스탯의 상한).
 *
 * ⚠️ **비율이라야 상한이 다른 스탯을 섞을 수 있다**(지식 999 / 평판 100). 절대값을 더하면
 * 999짜리 하나가 점수를 독차지하고 나머지는 장식이 된다.
 * ⚠️ **평균이라 한쪽만 높으면 절반으로 깎인다** — "이 대회는 둘을 본다"가 그 뜻이다.
 * ⚠️ `artRatio`와 **같은 0~1 척도**라 `minScore`를 그림 대회와 같은 감각으로 읽을 수 있다.
 */
export function statScore(state: GameState, contest: Contest): number {
  const keys = contest.judgedBy ?? []
  if (!keys.length) return 0
  const sum = keys.reduce((acc, key) => acc + state.stats[key] / growthCap(key), 0)
  return sum / keys.length
}

/** 그 점수가 받는 상. 없으면 낙선이다. */
export function prizeFor(contest: Contest, score: number) {
  return contest.prizes.find((p) => score >= p.minScore)
}

/**
 * 밤 정산 — **발표일이 지난 출품의 결과를 확정한다.**
 *
 * ⚠️ **상금이 밤에 들어오므로 `nightPayoutPending`의 원천이다**(`turn.ts`가 `resultDay`를
 * 본다). 안 보면 **상금이 들어오기 직전 밤에 굶어 죽는다** — 정기예금 만기·트위터 정산과
 * 정확히 같은 형태다.
 * ⚠️ **마지막 줄이 `settleGameOver`다**(밤에 돈을 넣는 함수의 규칙).
 * ⚠️ `state.contests`가 없으면 아무것도 하지 않는다(낸 적 없는 사람의 세이브를 안 부풀린다).
 */
export function advanceContests(state: GameState): GameState {
  const contests = state.contests
  if (!contests || state.gameOver) return state

  let money = state.stats.money
  let reputation = state.stats.reputation
  let wins = contests.wins
  let earned = contests.earned
  let changed = false

  const entries = contests.entries.map((e) => {
    if (e.prize !== undefined || state.day < e.resultDay) return e
    changed = true
    const contest = findContest(e.contestId)
    const prize = contest ? prizeFor(contest, e.score) : undefined
    if (!prize) return { ...e, prize: '', money: 0 }
    money += prize.money
    reputation += prize.reputation
    earned += prize.money
    wins += 1
    return { ...e, prize: prize.label, money: prize.money }
  })

  if (!changed) return state

  return settleGameOver({
    ...state,
    stats: clampStats({ ...state.stats, money, reputation }),
    contests: { entries, wins, earned },
  })
}

/**
 * 오늘 확정된 결과를 메일로 만든다.
 *
 * ⚠️ **`examMessages`와 같은 자리·같은 채널(`MAILBOX.id`)이다** — 새 알림 창구를 만들지
 * 않는다는 규칙이고, 그래서 아웃룩과 토스트를 그대로 탄다.
 * ⚠️ **사실만 상태에 남기고 문장은 매번 여기서 만든다**(`noticeMail`과 같은 규칙).
 */
export function contestMessages(state: GameState): TimedMessage[] {
  const contests = state.contests
  if (!contests) return []
  return contests.entries
    .filter((e) => e.prize !== undefined && e.resultDay === state.day)
    .map((e, i) => {
      const contest = findContest(e.contestId)
      const name = contest ? `${contest.host} ${contest.title}` : e.contestId
      const won = e.prize !== ''
      // 발표는 밤 정산에서 확정되므로 그날 오전에 도착한 것으로 적는다(자격시험과 같다).
      const turn = turnIndex(e.resultDay, 'morning')
      return {
        id: `contest-${e.contestId}-${e.enteredDay}`,
        channel: MAILBOX.id,
        from: contest?.host ?? '공모전 사무국',
        subject: won ? `[수상] ${name} — ${e.prize}` : `[결과] ${name} 심사 안내`,
        text: won
          ? `출품하신 작품이 ${e.prize}에 선정되었습니다. 상금 ${(e.money ?? 0).toLocaleString('ko-KR')}원을 지급해 드립니다. 축하드립니다.`
          : '아쉽게도 이번 심사에서는 선정되지 못했습니다. 다음 기회에 다시 뵙기를 바랍니다.',
        time: messageTime(turn, i),
        turn,
      }
    })
}

/** 낼 수 있는 공모전(아직 안 낸 것). 목록 화면이 쓰는 파생값이다. */
export function openContests(state: GameState): Contest[] {
  return CONTESTS.filter((c) => !hasEntered(state, c.id))
}

/** 그 출품에 실제로 들어간 그림들. 화면이 "무엇을 냈는지" 되짚을 때 쓴다. */
export function entryPages(state: GameState, entry: ContestEntry) {
  if (!entry.projectId) return []
  const project = findProject(state, entry.projectId)
  return project ? pagesOf(state, project) : []
}
