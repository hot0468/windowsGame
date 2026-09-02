import { artGrade, artRatio, artworksOf } from './artwork'
import { attendedCount, careerLevel } from './careerLog'
import { rankOf } from './rank'
import { growthCap } from './turn'
import { CAREERS } from '../data/careers'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../types/game'
import type { GameState, GrowthStatKey } from '../types/game'

/**
 * 개인 기록 — **"이번이 여태 중 제일 좋다"를 말해 주는 자리**(2026-08-14 신설).
 *
 * ## 왜 필요한가
 * 스탯을 올렸을 때 돌아오는 것이 여태 **돈**뿐이었다(랭크가 여는 일감 5종). 그런데
 * 육성 게임에서 스탯을 올리는 이유는 돈이 아니라 **"내가 나아졌다"**는 감각이고,
 * 그걸 말해 주는 장치가 이 게임에 그림 등급(`artGrade`) 하나뿐이었다 — 나머지 열네
 * 스탯은 올려도 숫자만 커졌다.
 *
 * 그림이 잘 된 이유는 **과거의 나와 지금의 나를 나란히 놓기** 때문이다: 갤러리를 열면
 * F에서 시작해 A로 올라간 궤적이 한 화면에 보인다. 이 파일은 그 구조를 **그림 말고
 * 다른 것에도** 적용한다.
 *
 * ## ⚠️ 저장하지 않는다 — 지금 세이브에서 매번 다시 센다
 * 업적(`systems/achievements.ts`)과 **완전히 같은 규칙**이다. 기록을 따로 저장하면
 * 그림을 팔거나 판을 새로 시작한 뒤에도 옛 기록이 남아 화면이 거짓말을 한다.
 * 기록은 트로피 상자가 아니라 **지금 가진 것을 비추는 거울**이다.
 *
 * ## ⚠️ "갱신했는가"는 여기서 판정하지 않는다
 * 이 파일은 **지금 값**만 말한다. 갱신 여부는 행동 직전 값과 직후 값을 견줘야 알 수
 * 있는데, 그건 `gameStore`가 아는 것이고(행동 전후 상태를 둘 다 쥔다) 여기까지
 * 끌고 오면 이 파일이 상태 변화를 알아야 하는 순수하지 않은 코드가 된다.
 */

/** 기록 한 줄. 화면은 이 목록을 그대로 그린다. */
export interface Record_ {
  id: string
  /** 무엇의 기록인가. */
  label: string
  /** 지금 값(표시용 문자열). 아직 없으면 undefined. */
  value?: string
  /** 정렬·비교용 수치. 없으면 0. **갱신 판정이 이 값을 쓴다.** */
  score: number
  /** 한 줄 설명. 아직 없을 때 무엇을 하면 되는지 말한다. */
  hint: string
}

/**
 * 가장 잘 그린 그림.
 *
 * ⚠️ **`artRatio`로 잰다**(등급 글자가 아니라) — 같은 A끼리도 더 좋은 쪽이 있어야
 * "이번 게 제일 낫다"가 성립한다. 등급만 보면 A에 닿은 뒤로 영영 안 갱신된다.
 */
export function bestArtwork(state: GameState): Record_ {
  const works = artworksOf(state)
  const best = works.reduce<(typeof works)[number] | undefined>(
    (top, w) => (!top || artRatio(w) > artRatio(top) ? w : top),
    undefined,
  )
  return {
    id: 'best-art',
    label: '가장 잘 그린 그림',
    value: best ? `${artGrade(best)}등급 (${works.length}장 중)` : undefined,
    score: best ? artRatio(best) : 0,
    hint: best ? '클립스튜디오로 더 그리면 갱신된다.' : '아직 그린 그림이 없다.',
  }
}

/**
 * 가장 높이 올린 스탯.
 *
 * ⚠️ **상한 대비 비율로 고른다** — 절대값으로 고르면 상한 999짜리가 상한 100짜리
 * (평판·도덕·예의범절)를 영영 이겨서 그 셋은 기록에 한 번도 못 오른다.
 */
export function topStat(state: GameState): Record_ {
  let key: GrowthStatKey = GROWTH_STAT_KEYS[0]
  let ratio = -1
  for (const k of GROWTH_STAT_KEYS) {
    const r = state.stats[k] / growthCap(k)
    if (r > ratio) {
      ratio = r
      key = k
    }
  }
  const value = state.stats[key]
  return {
    id: 'top-stat',
    label: '가장 높이 올린 스탯',
    /* ⚠️ **숫자를 넣지 않는다.** 이 문자열이 곧 "알릴 만한가"의 기준이라
       (`brokenRecords`), 숫자를 적으면 행동할 때마다 달라져 매 턴 축하가 뜬다.
       등급이 넘어가는 순간에만 말이 바뀌는 것이 옳다. */
    value: value > 0 ? `${STAT_NAMES[key]} ${rankOf(key, value)}` : undefined,
    score: Math.max(0, ratio),
    hint: value > 0 ? '한 스탯을 파고들면 갱신된다.' : '아직 아무것도 올리지 않았다.',
  }
}

/** 가장 오래 다닌 직장(출근 횟수). */
export function longestJob(state: GameState): Record_ {
  let best: { id: string; days: number } | undefined
  for (const c of CAREERS) {
    const days = attendedCount(state, c.id)
    if (days > 0 && (!best || days > best.days)) best = { id: c.id, days }
  }
  const career = best && CAREERS.find((c) => c.id === best!.id)
  return {
    id: 'longest-job',
    label: '가장 오래 다닌 곳',
    value: career ? `${career.company} 출근 ${best!.days}회 (Lv.${careerLevel(state, career.id)})` : undefined,
    score: best?.days ?? 0,
    hint: career ? '더 출근하면 갱신된다.' : '아직 다녀 본 회사가 없다.',
  }
}

/**
 * 잔고.
 *
 * ⚠️ **"최고 잔고"가 아니라 지금 잔고다.** 도달 최고치를 재려면 세이브에 필드를
 * 하나 더 둬야 하는데, 이 파일의 규칙이 **저장하지 않고 매번 다시 센다**이므로 그 순간
 * 규칙이 깨진다. 지금 잔고로 두면 돈을 쓰는 순간 기록이 내려가는데 **그게 맞다** —
 * 기록은 거울이지 트로피가 아니고, 쓴 돈은 실제로 사라졌다.
 */
export function moneyRecord(state: GameState): Record_ {
  const now = state.stats.money
  /* ⚠️ **만원 단위로 끊는다**(`top-stat`이 등급만 적는 것과 같은 이유) — 원 단위로
     적으면 돈이 1원만 움직여도 문자열이 달라져 매 턴 뜬다. */
  const man = Math.floor(now / 10_000)
  return {
    id: 'money',
    label: '잔고',
    value: `${man.toLocaleString('ko-KR')}만원`,
    score: now,
    hint: '더 모으면 갱신된다.',
  }
}

/**
 * 기록 전부. **화면은 이 목록만 그린다**(어느 기록이 있는지 화면이 알 필요가 없다).
 *
 * ⚠️ **순서가 화면 순서다.** 스탯·생활 등급을 앞에 두는 것은 이 목록이 "육성이 얼마나
 * 됐나"를 먼저 말해야 하기 때문이다 — 돈은 수단이지 목적이 아니다.
 */
export function allRecords(state: GameState): Record_[] {
  /* ⚠️ **생활 등급 줄이 여기 있었다**(2026-08-24 삭제). 배경이 "20대의 딱 1년"으로
     정해지면서 그 자리를 남은 날이 가져갔다 — 기록은 "여태 중 제일 좋다"를 말하는
     자리이고, 남은 날은 줄어들기만 하므로 기록이 될 수 없다. */
  return [topStat(state), bestArtwork(state), longestJob(state), moneyRecord(state)]
}

/**
 * 행동 전후를 견줘 **알릴 만한 기록 갱신**을 고른다.
 *
 * ⚠️ **`gameStore`가 부른다** — 행동 직전 상태와 직후 상태를 둘 다 쥔 유일한 자리라서다.
 * 여기서 상태를 만들지 않고 **둘을 받아 비교만** 한다(systems는 순수해야 한다).
 *
 * ## ⚠️ 값이 아니라 **표시가 바뀔 때만** 알린다
 * 실측으로 두 번 고친 자리다. 처음에는 "점수가 오르면" 알렸더니 **매 행동 축하가 떴고**
 * (스탯은 행동할 때마다 오른다), 다음에는 "5% 넘게 오르면"으로 바꿨더니 **초반 내내
 * 떴다** — 12에서 18로 가는 것이 50%라서다.
 *
 * 지금 기준은 **`value` 문자열이 달라졌는가**다. 그 문자열이 곧 화면에 뜨는 말이므로,
 * 바뀌지 않았다면 알릴 것도 없다: 지식 12→18은 둘 다 "지식 F"라 조용하고,
 * F→C로 넘어가는 순간 한 번 뜬다. **표시와 알림이 같은 것을 보는 것**이 규칙이다.
 *
 * ⚠️ 잔고처럼 **매번 문자열이 바뀌는 기록**은 점수도 함께 본다 — 안 그러면 돈이
 * 1원만 움직여도 뜬다.
 */
export function brokenRecords(before: GameState, after: GameState): Record_[] {
  const old = new Map(allRecords(before).map((r) => [r.id, r]))
  return allRecords(after).filter((r) => {
    if (r.value === undefined) return false
    const was = old.get(r.id)
    /* 처음 생긴 기록은 무조건 알린다 — 장치가 있다는 것 자체를 알려야 한다. */
    if (!was || was.value === undefined) return true
    return r.value !== was.value && r.score > was.score
  })
}