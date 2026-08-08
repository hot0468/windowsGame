import {
  FOLLOWERS_BY_GRADE,
  FOLLOWER_CAP,
  PAYOUT_INTERVAL_DAYS,
  WON_PER_FOLLOWER,
} from '../data/artworks'
import { followersFrom } from '../data/tweets'
import { artGrade, findArtwork } from './artwork'
import { canRun, clampStats, runActivity, settleGameOver } from './turn'
import { findActivity } from '../data/activities'
import type { Artwork, GameState, TwitterState } from '../types/game'

/**
 * 트위터 — 그림 업로드와 주간 정산.
 *
 * ## 무엇이 달라졌나
 * 원래 팔로워는 `followersFrom(reputation)`으로 **파생**되는 읽기 전용 값이었다(장식).
 * 그림을 올려 팔로워를 얻게 되면서 재계산이 불가능해졌다 — 무엇을 언제 올렸는지에
 * 달려 있기 때문이다(`JobNotice`를 세이브에 남기는 것과 같은 이유). 그래서 **그림으로 번
 * 몫만** 저장하고 평판 몫은 그대로 파생시킨 뒤 `totalFollowers`가 둘을 더한다 —
 * 한쪽을 상태로 흡수해 버리면 평판이 올라도 팔로워가 안 느는 이상한 일이 생긴다.
 *
 * ## 왜 상한이 있는가
 * ⚠️ **`FOLLOWER_CAP`이 "판은 반드시 끝난다"를 지탱한다.** 상한이 없으면 그림을 계속
 * 올리는 것만으로 수입이 물가를 앞질러 게임이 안 끝난다. 정규직 급여가 물가 배율을
 * 안 타는 것과 정확히 같은 장치이고, `twitter.test.ts`가 데이터에서 직접 부등식을 지킨다.
 *
 * ## 의존 방향
 * `twitter.ts` → `turn.ts` (반대는 없다). `turn.ts`가 보는 것은 `paidDay` 날짜 하나뿐이고
 * (`nightPayoutPending`), 규칙은 전부 여기 있다 — `employment`·`bank`·`lottery`와 같다.
 */

/** 아직 아무것도 안 올린 사람의 상태. `day`가 첫 정산 기준일이 된다. */
export function emptyTwitter(day: number): TwitterState {
  return { gained: 0, postedIds: [], paidDay: day }
}

export function twitterOf(state: GameState): TwitterState {
  return state.twitter ?? emptyTwitter(state.day)
}

/**
 * 지금 팔로워 수 = **평판에서 온 몫 + 그림으로 번 몫**, 상한까지.
 *
 * ⚠️ 상한은 **합계**에 건다. 그림 몫에만 걸면 평판이 그 위에 얹혀 상한이 뚫리고,
 * 그러면 위의 "판은 반드시 끝난다"가 무너진다.
 */
export function totalFollowers(state: GameState): number {
  const base = followersFrom(state.stats.reputation)
  return Math.min(FOLLOWER_CAP, base + twitterOf(state).gained)
}

/** 이 그림을 올리면 늘어나는 팔로워. 등급이 낮으면 0이다(확인창이 미리 적는다). */
export function followerGain(work: Artwork): number {
  return FOLLOWERS_BY_GRADE[artGrade(work)]
}

/** 이미 올린 그림인가. 같은 그림으로 팔로워를 반복해서 벌 수 없다. */
export function isPosted(state: GameState, artworkId: string): boolean {
  return twitterOf(state).postedIds.includes(artworkId)
}

/** 아직 안 올린 그림. 최근에 그린 것이 앞이다(고르는 화면이 스크롤을 덜 탄다). */
export function postableArtworks(state: GameState): Artwork[] {
  return (state.artworks ?? []).filter((a) => !isPosted(state, a.id)).reverse()
}

/** 이번 주에 들어올 정산금. 화면이 "얼마가 들어오나"를 미리 적을 수 있게 밖으로 뺀다. */
export function weeklyIncome(state: GameState): number {
  return Math.round(totalFollowers(state) * WON_PER_FOLLOWER)
}

/** 다음 정산까지 남은 날. 아직 트위터를 시작하지 않았으면 undefined. */
export function daysToPayout(state: GameState): number | undefined {
  if (!state.twitter) return undefined
  return Math.max(0, state.twitter.paidDay + PAYOUT_INTERVAL_DAYS - state.day)
}

/**
 * 그림을 올린다. **1턴을 쓴다**(`sns` 활동이 비용을 갖는다).
 *
 * ⚠️ **조건이 하나라도 안 되면 상태를 그대로 돌려준다** — 반쪽 상태(팔로워는 늘었는데
 * 턴은 안 쓴, 또는 그 반대)를 남기지 않는다(`takeCourse`·`takeExam`과 같은 규칙).
 *
 * ⚠️ **팔로워는 활동을 실행하기 전에 계산하고 실행한 뒤에 얹는다.** `runActivity`가
 * 턴을 넘기며 새 상태를 만들기 때문이고, 그림의 등급은 그릴 때 박힌 값이라
 * 실행 전후로 달라지지 않는다.
 *
 * ⚠️ **`paidDay`는 여기서 처음 잡힌다** — 올린 적 없는 사람에게 정산 커서를 미리 만들어
 * 두면 아무것도 안 한 사람에게도 밤마다 `nightPayoutPending`이 참이 된다.
 */
export function postArtwork(state: GameState, artworkId: string): GameState {
  if (state.gameOver) return state
  const work = findArtwork(state, artworkId)
  if (!work || isPosted(state, artworkId)) return state

  const activity = findActivity('sns')
  if (!activity || !canRun(state, activity)) return state

  const gain = followerGain(work)
  const before = twitterOf(state)
  const next = runActivity(state, activity)
  // 실행이 막혔으면(게임오버 등) 아무것도 얹지 않는다.
  if (next === state) return state

  return {
    ...next,
    twitter: {
      ...before,
      gained: before.gained + gain,
      postedIds: [...before.postedIds, artworkId],
    },
  }
}

/**
 * 밤 정산 — **이레마다 팔로워 수에 비례한 돈이 소지금으로 들어온다**(설계자 지시: 주 1회).
 *
 * ⚠️ **커서(`paidDay`)를 7씩 밀며 밀린 주를 따라잡는다.** 스케줄러 연쇄·자동 진행으로
 * 며칠이 한 번에 흐를 수 있으므로 "한 번만 준다"로 두면 그 사이의 주가 통째로 사라진다
 * (`advanceEmployment`의 급여 루프와 같은 장치). 반대로 커서를 안 두면 같은 주를
 * 매 슬롯 정산해 무한히 돈이 나온다.
 *
 * ⚠️ **금액은 정산하는 시점의 팔로워로 계산한다** — 그 주 내내의 평균이 아니다.
 * 계산할 근거(주중의 팔로워 이력)를 저장하지 않기 때문이고, 저장할 만한 값도 아니다.
 *
 * ⚠️ **마지막 줄이 `settleGameOver`다**(`advanceBank`·`advanceLottery`와 같다) —
 * 밤에 돈을 넣는 함수는 넣은 뒤 판정을 다시 물어야 "정산금을 쥔 채 굶어 죽는" 판이 안 난다.
 *
 * ⚠️ `state.twitter`가 없으면 **아무것도 하지 않는다**(올린 적 없는 사람의 세이브를
 * 부풀리지 않는다 — `advanceBank`와 같은 규칙).
 */
export function advanceTwitter(state: GameState): GameState {
  const twitter = state.twitter
  if (!twitter || state.gameOver) return state

  let paidDay = twitter.paidDay
  let money = state.stats.money
  let paid = 0
  // 상한(`FOLLOWER_CAP`)이 걸린 값이라 주가 밀려도 총액이 발산하지 않는다.
  const perWeek = weeklyIncome(state)
  while (state.day - paidDay >= PAYOUT_INTERVAL_DAYS) {
    paidDay += PAYOUT_INTERVAL_DAYS
    money += perWeek
    paid += perWeek
  }
  if (paid === 0) return state

  return settleGameOver({
    ...state,
    stats: clampStats({ ...state.stats, money }),
    twitter: { ...twitter, paidDay },
  })
}
