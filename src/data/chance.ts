import type { Stats } from '../types/game'

/**
 * 돌발 사건 — 수치·문구는 전부 여기, 규칙은 `systems/chance.ts`.
 *
 * ## 왜 있는가
 * 이 게임은 세이브 스커밍을 막으려고 무작위를 전면 금지해서(합격 판정·시세·주말 호출
 * 전부 날짜의 순수 함수) 모든 밤이 예고편 그대로였다 — 놀라움이 0이고, 판마다 이야기가
 * 안 생겼다. 답은 복권이 이미 갖고 있다: **시드 PRNG는 결정적이라 스커밍이 안 열린다**
 * (`systems/lottery.ts`의 `ticketRoll`). 판 시작에 시드 하나(`GameState.seed`)를 박으면
 * "예측 불가능하되 재굴림 불가"가 성립한다.
 *
 * ## 세 부류
 * - `minor`(소소한 사건): 밤 정산에 소폭 효과. ⚠️ **스탯 도감·이벤트 도감에 남기지
 *   않는다** — 무작위가 도감을 오염시킨다. 알림(토스트)으로만 전한다.
 * - `boost`(오늘만 기회): 특정 활동 하나가 **그날만** 좋아진다(상승분 배율 또는 비용 할인).
 * - `dilemma`(딜레마): 아침에 창이 떠서 둘 중 하나를 고른다(돈 vs 도덕). 토스트는 없다 —
 *   창 자체가 알림이다. 도감에도 안 남긴다(`minor`와 같은 이유 — 무작위 오염).
 */

/** 빈도 설계 범위 — 대략 이 며칠에 하루꼴로 사건이 뜬다. 매일 뜨면 소음이다(편성표에 빈 턴이 있는 것과 같은 사유). */
export const CHANCE_DAYS_MIN = 4
export const CHANCE_DAYS_MAX = 7

/**
 * 하루에 사건이 뜰 확률(%). 위 범위의 평균에서 **파생한다** — 값 둘을 따로 적으면
 * 한쪽만 고쳐 범위와 확률이 서로 어긋난다. `chance.test.ts`가 상하한을 이 범위로 잰다.
 */
export const CHANCE_RATE_PERCENT = Math.round(200 / (CHANCE_DAYS_MIN + CHANCE_DAYS_MAX))

/**
 * `dilemma` 선택지 하나. 버튼에는 효과가 **글자로** 그대로 적힌다(숨은 비용 금지 —
 * `choiceEffectText`가 `effects`에서 파생하므로 문장에 다시 적지 않는다).
 *
 * ⚠️ **도덕은 상한 100이라 폭을 ±2~3으로 작게 준다**(`data/activities.ts` 수치 규칙 ①과
 * 같은 이유 — 크게 주면 딜레마 몇 번으로 등급이 찬다). 돈은 3만원 이하 — 소소한 사건보다
 * 한 급 위일 뿐, 하루 알바보다 커지면 도덕을 파는 것이 언제나 정답이 된다.
 */
export interface DilemmaChoice {
  label: string
  effects: Partial<Pick<Stats, 'money' | 'mental' | 'morality'>>
}

export interface ChanceEvent {
  id: string
  kind: 'minor' | 'boost' | 'dilemma'
  /** 토스트 발신자 줄에 뜨는 제목. */
  title: string
  /**
   * 토스트 본문. ⚠️ `boost`는 활동 이름을 여기 적지 않는다 — 이름의 단일 출처는
   * `data/activities.ts`의 `label`이고 `noticeTextOf`(systems/chance.ts)가 붙인다.
   * `minor`의 효과 숫자도 `effects`에서 파생해 붙이므로 문장에 다시 적지 않는다.
   */
  text: string
  /** `minor` 전용 — 그날 밤 정산에 얹는 효과. 돈을 잃는 쪽은 잔액 1원을 남기고만 빠진다. */
  effects?: Partial<Pick<Stats, 'stamina' | 'mental' | 'money'>>
  /** `boost` 전용 — 그날만 좋아지는 활동. */
  activityId?: string
  /** `boost` 전용 — 그 활동의 긍정 효과에 곱하는 배율(날씨 계수와 같은 자리에 곱한다). */
  gainRate?: number
  /** `boost` 전용 — 그 활동의 돈 비용에 곱하는 비율(0.5 = 반값). */
  costRatio?: number
  /** `dilemma` 전용 — 아침 창의 두 선택지. 굴림·빈도는 그대로고 항목만 늘린다. */
  choices?: DilemmaChoice[]
}

/** 사건 목록. 굴림이 이 배열의 길이를 나누므로 항목을 더하면 확률이 저절로 고르게 갈린다. */
export const CHANCE_EVENTS: ChanceEvent[] = [
  /* ── 소소한 사건 (밤 정산) ── */
  { id: 'good-dream', kind: 'minor', title: '좋은 꿈', text: '기분 좋은 꿈을 꿨다.', effects: { mental: 5 } },
  { id: 'old-friend', kind: 'minor', title: '옛 친구의 연락', text: '오랜만에 옛 친구에게 연락이 왔다.', effects: { mental: 6 } },
  { id: 'construction-noise', kind: 'minor', title: '옆집 공사', text: '종일 공사 소리가 울린다.', effects: { mental: -4 } },
  { id: 'deep-sleep', kind: 'minor', title: '개운한 아침', text: '몸이 가볍다.', effects: { stamina: 8 } },
  { id: 'bad-sleep', kind: 'minor', title: '뒤척인 밤', text: '잠을 설쳤다.', effects: { stamina: -7 } },
  { id: 'prize-draw', kind: 'minor', title: '경품 당첨', text: '응모했던 경품이 당첨됐다.', effects: { money: 10000 } },
  { id: 'phone-repair', kind: 'minor', title: '액정 수리', text: '휴대폰 액정에 금이 갔다. 수리비가 나갔다.', effects: { money: -12000 } },
  /* ── 오늘만 기회 (활동 하나가 그날만 좋아진다) ── */
  { id: 'busy-store', kind: 'boost', title: '편의점 대목', text: '얻는 것이 1.5배', activityId: 'work', gainRate: 1.5 },
  { id: 'cafe-event', kind: 'boost', title: '카페 행사', text: '얻는 것이 1.5배', activityId: 'work-cafe', gainRate: 1.5 },
  { id: 'focus-day', kind: 'boost', title: '집중력 최고조', text: '얻는 것이 1.5배', activityId: 'study', gainRate: 1.5 },
  { id: 'movie-discount', kind: 'boost', title: '영화 할인의 날', text: '비용이 반값', activityId: 'movie', costRatio: 0.5 },
  /* ── 딜레마 (아침에 창이 떠서 둘 중 하나를 고른다 — 돈 vs 도덕) ── */
  {
    id: 'wallet-found',
    kind: 'dilemma',
    title: '주운 지갑',
    text: '골목길에서 현금이 든 지갑을 주웠다. 신분증이 들어 있어 주인을 찾을 수 있다.',
    choices: [
      { label: '주인을 찾아 돌려준다', effects: { morality: 3 } },
      { label: '현금만 챙긴다', effects: { money: 30000, morality: -3 } },
    ],
  },
  {
    id: 'extra-change',
    kind: 'dilemma',
    title: '과다 거스름돈',
    text: '편의점 점원이 거스름돈을 만원 더 줬다. 점원은 아직 눈치채지 못했다.',
    choices: [
      { label: '바로 돌려준다', effects: { morality: 2 } },
      { label: '모른 척 나온다', effects: { money: 10000, morality: -2 } },
    ],
  },
  {
    id: 'shelter-box',
    kind: 'dilemma',
    title: '보호소 모금함',
    text: '역 앞에서 유기동물 보호소가 모금을 하고 있다. 상자 안 사진에 발이 멈췄다.',
    choices: [
      /* 돈을 잃는 선택지 — 잔액 1원 클램프(`resolveDilemma`)가 실제로 도는 자리다. */
      { label: '만원을 넣는다', effects: { money: -10000, morality: 3, mental: 2 } },
      { label: '그냥 지나친다', effects: {} },
    ],
  },
]
