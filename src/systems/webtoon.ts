import {
  CONTEST_WINS_FOR_OFFER,
  EDITOR_NAME,
  EPISODE_REVIEWS,
  VIEW_BASE,
  VIEW_PER_EPISODE,
  VIEW_PER_SCORE,
  DEADLINE_DAYS,
  EPISODE_PAY,
  LIKES_FOR_OFFER,
  MISSES_TO_END,
  MISS_REPUTATION_PENALTY,
  SERIES_TITLE,
  STUDIO_NAME,
  WEEKLY_PAGES,
} from '../data/webtoon'
import { CAREER_MAX_LEVEL } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import { MAILBOX } from '../data/messages'
import { findActivity } from '../data/activities'
import { contestsStateOf } from './contests'
import { messageTime, turnIndex } from './messages'
import { canRun, clampStats, runActivity, settleRecovery } from './turn'
import { twitterOf } from './twitter'
import type { TimedMessage } from './messages'
import type { GameState, WebtoonState } from '../types/game'

/**
 * 웹툰 연재 — 제의 · 수락 · 주간 마감.
 *
 * ## 흐름
 * 1. **제의**: 트위터 좋아요가 쌓이거나 공모전에 입상하면 밤 정산이 제의를 만들고
 *    **아웃룩 메일**로 알린다(`examMessages`와 같은 채널 — 새 알림 창구를 만들지 않는다).
 * 2. **수락**: 클립스튜디오 창에서 받는다. ⚠️ **턴을 쓰지 않는다**(계약이다).
 * 3. **연재**: 클립스튜디오에서 원고를 친다. 한 장이 **1턴**이고 주에 `WEEKLY_PAGES`장.
 * 4. **마감**: `dueDay`가 지나면 밤에 정산한다 — 채웠으면 원고료, 못 채웠으면 평판.
 *
 * ## ⚠️ 정규직과 다른 축이다
 * 정규직은 출근·결근·해고이고 여기는 **주간 마감**이다 — 회사에 나가는 것이 아니라
 * 원고를 넘기는 일이라 출근부가 없다. 그몽 계약과 더 가깝지만 그쪽은 건별이고
 * 이쪽은 **끝나지 않고 매주 돌아온다.** 그래서 상태도 축도 따로 둔다.
 *
 * ## ⚠️ 원고료는 물가 배율을 타지 않는다
 * 정규직 급여·트위터 정산·외주 보수와 같은 장치다. 연재가 물가를 따라 오르면 후반에도
 * 살아남는 수입원이 되어 "판은 반드시 끝난다"가 무너진다.
 *
 * ## ⚠️ 한 번 끝나면 다시 제의가 오지 않는다
 * `status: 'ended'`는 되돌아가지 않는다 — 그것이 수락의 무게이고, 무한히 다시 받을 수
 * 있으면 마감을 놓치는 데 아무 대가가 없어진다.
 *
 * ## 의존 방향
 * `webtoon.ts` → `turn.ts`·`contests.ts`·`twitter.ts` (반대는 없다).
 */

export function webtoonOf(state: GameState): WebtoonState | undefined {
  return state.webtoon
}

/** 지금 연재 중인가. 화면·활동 게이트가 이 하나를 본다. */
export function isSerializing(state: GameState): boolean {
  return state.webtoon?.status === 'serializing'
}

/** 수락을 기다리는 제의가 있는가. */
export function hasOffer(state: GameState): boolean {
  return state.webtoon?.status === 'offered'
}

/**
 * 제의가 올 조건을 만족했는가 — **둘 중 하나**면 된다(설계자 지시).
 * ⚠️ 좋아요는 팔로워가 아니다(`TwitterState.likes`) — 그림으로 알려진 것만 센다.
 */
export function offerEarned(state: GameState): boolean {
  return (
    twitterOf(state).likes >= LIKES_FOR_OFFER ||
    contestsStateOf(state).wins >= CONTEST_WINS_FOR_OFFER
  )
}

/** 이번 주에 남은 원고 수. 연재 중이 아니면 undefined. */
export function pagesLeft(state: GameState): number | undefined {
  const w = state.webtoon
  if (!w || w.status !== 'serializing') return undefined
  return Math.max(0, WEEKLY_PAGES - w.progress)
}

/**
 * 도감이 읽는 **연재 레벨**. 수락한 적이 없으면 없다(0이 아니라 "없음" — 화면이 `—`를 적는다).
 *
 * ⚠️ **회차 하나가 한 칸이고 상한은 정규직과 같은 `CAREER_MAX_LEVEL`이다** — 도감 한 표에
 * 두 척도를 섞으면 같은 열의 Lv.3이 자리마다 다른 뜻이 된다. 한 회차가 한 주이므로
 * 정규직의 반 주기 개근(`CAREER_LEVEL_DAYS`)과 같은 무게로 맞춰진다.
 * ⚠️ 판정 근거는 `startedDay`다 — **수락한 날에만 박히는 값**이라 "맡아 본 적 있는가"의
 * 단일 출처다(`status`를 보면 제의만 받고 거절한 판이 경험으로 세어진다).
 */
export function webtoonLevel(state: GameState): number | undefined {
  const w = state.webtoon
  if (!w || w.startedDay === undefined) return undefined
  return Math.min(CAREER_MAX_LEVEL, 1 + w.episodes)
}

/** 마감까지 남은 날. 0이면 오늘이 마감이다. */
export function daysToDeadline(state: GameState): number | undefined {
  const w = state.webtoon
  if (!w || w.status !== 'serializing') return undefined
  return Math.max(0, w.dueDay - state.day)
}

/**
 * 제의를 받는다. **턴을 쓰지 않는다** — 계약이지 그리는 일이 아니다.
 * 첫 마감은 **수락한 날로부터** 일주일이다(제의가 온 날이 아니다 — 미뤄 두었다고
 * 이미 지난 마감을 떠안기면 수락이 함정이 된다).
 */
export function acceptOffer(state: GameState): GameState {
  const w = state.webtoon
  if (!w || w.status !== 'offered' || state.recovery) return state
  return {
    ...state,
    webtoon: {
      ...w,
      status: 'serializing',
      startedDay: state.day,
      progress: 0,
      dueDay: state.day + DEADLINE_DAYS,
    },
  }
}

/** 제의를 거절한다. ⚠️ **되돌릴 수 없다** — 화면이 한 번 묻는다. */
export function declineOffer(state: GameState): GameState {
  const w = state.webtoon
  if (!w || w.status !== 'offered' || state.recovery) return state
  return { ...state, webtoon: { ...w, status: 'ended' } }
}

/**
 * 원고를 한 장 친다. **1턴을 쓴다**(`draw-webtoon` 활동이 비용을 갖는다).
 *
 * ⚠️ **갤러리에 그림이 생기지 않는다**(`producesArt`가 없다) — 이것은 남의 원고이고
 * 내 작품집이 아니다. 그래서 공모전에도 회지에도 못 쓴다(설계자 지시의 "작업량 채우기 vs
 * 개인작업물 만들기"가 갈리는 자리가 정확히 여기다).
 * ⚠️ **`drawIntoProject`와 같은 모양이다**: 조건을 다 보고 하나라도 안 되면 상태를
 * 그대로 돌려준다(반쪽 상태 금지).
 */
export function drawWebtoon(state: GameState): GameState {
  if (state.recovery || !isSerializing(state)) return state
  const activity = findActivity('draw-webtoon')
  if (!activity || !canRun(state, activity)) return state

  const before = state.webtoon!
  const next = runActivity(state, activity)
  if (next === state) return state

  // ⚠️ 실행 뒤 상태의 웹툰을 쓴다 — 그 사이 밤이 지나 마감이 정산됐을 수 있다.
  const after = next.webtoon ?? before
  if (after.status !== 'serializing') return next
  return { ...next, webtoon: { ...after, progress: after.progress + 1 } }
}

/**
 * 밤 정산 — **제의를 만들고, 지난 마감을 결산한다.**
 *
 * ⚠️ **원고료가 밤에 들어오므로 `nightPayoutPending`의 원천이다**(`turn.ts`가 `dueDay`를
 * 본다). 안 보면 **원고료가 들어오기 직전 밤에 굶어 죽는다**.
 * ⚠️ **커서(`dueDay`)를 주 단위로 밀며 밀린 주를 따라잡는다** — 자동 진행·스케줄러 연쇄로
 * 며칠이 한 번에 흐를 수 있으므로 "한 번만 정산"으로 두면 그 사이 주가 통째로 사라진다
 * (`advanceTwitter`·`advanceEmployment`와 같은 장치).
 * ⚠️ **마감을 놓치면 위약금이 아니라 평판을 깎는다**(그몽과 같은 규칙) — 돈을 물리면
 * "수락하지 않는 것이 언제나 안전"이 되어 연재가 선택지가 아니라 함정이 된다.
 * ⚠️ **마지막 줄이 `settleRecovery`다**(밤에 돈을 넣는 함수의 규칙).
 */
export function advanceWebtoon(state: GameState): GameState {
  if (state.recovery) return state
  const w = state.webtoon

  // ① 아직 제의가 없다 — 조건을 만족했으면 이번 밤에 온다.
  if (!w) {
    if (!offerEarned(state)) return state
    return {
      ...state,
      webtoon: {
        offeredDay: state.day,
        status: 'offered',
        progress: 0,
        dueDay: 0,
        episodes: 0,
        missed: 0,
        earned: 0,
      },
    }
  }

  if (w.status !== 'serializing') return state

  // ② 지난 마감을 하나씩 결산한다.
  let money = state.stats.money
  let reputation = state.stats.reputation
  let next: WebtoonState = w
  let changed = false

  while (state.day > next.dueDay && next.status === 'serializing') {
    changed = true
    if (next.progress >= WEEKLY_PAGES) {
      money += EPISODE_PAY
      next = {
        ...next,
        episodes: next.episodes + 1,
        earned: next.earned + EPISODE_PAY,
        progress: 0,
        dueDay: next.dueDay + DEADLINE_DAYS,
      }
    } else {
      reputation -= MISS_REPUTATION_PENALTY
      const missed = next.missed + 1
      next = {
        ...next,
        missed,
        progress: 0,
        dueDay: next.dueDay + DEADLINE_DAYS,
        status: missed >= MISSES_TO_END ? 'ended' : 'serializing',
      }
    }
  }

  if (!changed) return state
  return settleRecovery({
    ...state,
    stats: clampStats({ ...state.stats, money, reputation }),
    webtoon: next,
  })
}

/**
 * 제의·마감 결과 메일.
 *
 * ⚠️ **`examMessages`·`contestMessages`와 같은 채널(`MAILBOX.id`)이다** — 새 알림 창구를
 * 만들지 않는다. 사실만 상태에 남기고 문장은 매번 여기서 만든다.
 */
export function webtoonMessages(state: GameState): TimedMessage[] {
  const w = state.webtoon
  if (!w) return []
  const out: TimedMessage[] = []

  if (w.offeredDay === state.day && w.status === 'offered') {
    const turn = turnIndex(state.day, 'morning')
    out.push({
      id: `webtoon-offer-${w.offeredDay}`,
      channel: MAILBOX.id,
      from: `${STUDIO_NAME} 편집부`,
      subject: '[제안] 웹툰 연재를 제안드립니다',
      text: `작업물을 잘 보고 있었습니다. 「${SERIES_TITLE}」이라는 가제로 연재를 맡아 주시겠습니까? 매주 ${WEEKLY_PAGES}화 분량을 넘겨 주시면 회차당 ${EPISODE_PAY.toLocaleString('ko-KR')}원을 드립니다. 수락은 클립스튜디오에서 하실 수 있습니다.`,
      time: messageTime(turn, 0),
      turn,
    })
  }
  return out
}


/* ── 월요일 연재 리뷰 ──────────────────────────────────────────────────── */

/** 담당 편집자와 대화하는 카톡 방(`data/messages.ts`의 `THREADS`). */
export const EDITOR_CHANNEL = 'webtoon-editor'

/** 월요일인가. 요일 척도는 `data/careers.ts`의 근무일과 같다(0=일). */
const MONDAY = 1

/**
 * 이번 회차의 독자 점수. **그림·이야기·글, 그리고 평판이 데려온다.**
 *
 * ⚠️ 평판에 가중치를 두는 것은 웹툰이 **알려진 사람일수록 잘 읽히는** 매체이기 때문이고,
 * 상한이 100이라 그대로 더하면 999짜리 스탯들에 묻힌다.
 * ⚠️ 나머지 셋은 **같은 무게다** — 상한이 같은 999이고, 웹툰 한 회차가 서는 다리가
 * 셋이기 때문이다: `art`는 실제로 그린 손, `creativity`는 이야기를 만드는 힘,
 * **`vocabulary`는 그 안에 들어가는 말**(대사와 나레이션)이다. 하나에 가중치를 주면
 * 그 스탯만 올리는 것이 정답이 되어 나머지 둘이 장식이 된다.
 */
export function readerScore(state: GameState): number {
  const { art, creativity, vocabulary, reputation } = state.stats
  return art + creativity + vocabulary + reputation * 3
}

/**
 * 이번 주 조회수.
 *
 * ⚠️ **돈을 만들지 않는다** — 원고료는 `EPISODE_PAY` 하나가 낸다(`data/webtoon.ts` 주석).
 * 회차가 쌓이면 고정 독자가 붙지만 **덧셈 비율**이라 지수로 커지지 않는다.
 * ⚠️ **놓친 마감은 독자를 깎는다** — 쉰 주가 있으면 돌아오지 않는 사람이 생긴다.
 */
export function weeklyViews(state: GameState): number {
  const w = state.webtoon
  if (!w) return 0
  const loyal = 1 + Math.max(0, w.episodes - 1) * VIEW_PER_EPISODE
  const base = (VIEW_BASE + readerScore(state) * VIEW_PER_SCORE) * loyal
  // 마감을 놓칠 때마다 5분의 1씩 잃는다. 0 밑으로는 안 내려간다.
  return Math.max(0, Math.round(base * Math.max(0, 1 - w.missed * 0.2)))
}

/**
 * 이번 회차의 평가 단계(0 조용 / 1 자리 잡음 / 2 화제).
 * ⚠️ **한 단계만 쓴다** — 누적으로 섞으면 "화제작"과 "아무도 안 본다"가 같은 주에 뜬다.
 */
export function reviewTier(state: GameState): 0 | 1 | 2 {
  /* 임계는 만점(999×3 + 평판 300 ≈ 3,300)을 기준으로 잡는다 — **만점 대비 비율을
     유지한다**(화제는 상위 20%쯤). ⚠️ 320이었을 때는 중간 실력이 곧바로 '화제'로
     읽혔다(실측). ⚠️ 점수 축이 늘면 여기 두 값도 함께 올린다 — 안 올리면 축을 더한
     만큼 모두가 저절로 화제작이 된다(어휘력을 더할 때 500 → 700). */
  const score = readerScore(state)
  if (score < 200) return 0
  return score < 700 ? 1 : 2
}

/**
 * 월요일 아침에 오는 담당 편집자의 카톡.
 *
 * ⚠️ **저장하지 않고 매번 만든다**(`weekendCallMessages`·`examMessages`와 같은 자리) —
 * 조회수도 평가도 지금 상태의 파생값이라 편성표(`MESSAGE_SCHEDULE`)에 넣을 수 없다.
 * ⚠️ **넘긴 회차가 있어야 온다** — 아직 한 주도 안 넘겼는데 지난 회차 성적을 말하면 거짓이다.
 * ⚠️ 문장 고르기는 **회차 번호로 회전**시킨다(`Math.random` 금지) — 같은 회차면 늘 같은 말이다.
 */
export function webtoonReviewMessages(
  state: GameState,
): { id: string; channel: string; from: string; text: string }[] {
  const w = state.webtoon
  if (!w || w.status !== 'serializing' || w.episodes < 1) return []
  if (weekdayOf(state.day) !== MONDAY) return []

  const tier = reviewTier(state)
  const pool = EPISODE_REVIEWS.filter((r) => r.tier === tier)
  const review = pool[w.episodes % pool.length]
  return [
    {
      id: `webtoon-review-${state.day}`,
      channel: EDITOR_CHANNEL,
      from: EDITOR_NAME,
      text: `「${SERIES_TITLE}」 ${w.episodes}화 성적 알려드립니다. 조회수 ${weeklyViews(state).toLocaleString('ko-KR')}회입니다. ${review.text}`,
    },
  ]
}

export { EPISODE_PAY, WEEKLY_PAGES, SERIES_TITLE, STUDIO_NAME, MISSES_TO_END }
