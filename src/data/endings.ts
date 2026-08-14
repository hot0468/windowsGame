import type { IconName, Stats } from '../types/game'

export interface Ending {
  id: string
  title: string
  icon: IconName
  /** 엔딩 화면에 표시할 본문. */
  text: string
  /** 모든 조건을 충족해야 도달한다. */
  condition?: Partial<Record<keyof Stats, number>>
  /** 높을수록 상위 엔딩. 판정은 tier 내림차순으로 한다. */
  tier: number
}

/**
 * 성취 엔딩. tier 내림차순으로 정렬해 둔다 — 판정이 이 순서에 의존한다.
 * 조건 수치는 밸런스 검증(balance.verify.test.ts)이 지키는 값이다. 스탯 상한이 999로 올랐다고
 * 해서 도달 기준을 올리면 완주 가능성이 깨진다 — 이름 변경 외에는 손대지 않는다.
 *
 * ⚠️ **취직은 엔딩이 아니다.** 예전에 `bigtech`(대기업)이 여기 있었고 지식 90 · 멘탈 40이면
 * 게임 중간에 "대기업 합격"이 떴는데, 정규직이 실제로 구현되면서 그 이름이 **두 가지 다른 것**을
 * 뜻하게 됐다 — 스탯 문턱과 청람그룹 입사. 지금 취직은 **도감의 직업 시트**가 받는다
 * (2026-08-14). **스탯 조건을 되살리지 말 것.**
 *
 * ⚠️ **여기 있는 넷이 엔딩의 전부다.** 게임을 끝내지 않고 도중에 뜨며 [계속하기]로
 * 물릴 수 있다 — 육성물에 강제 종료가 없어졌기 때문이다(`types/game.ts`의 `Recovery`).
 */
export const ACHIEVEMENT_ENDINGS: Ending[] = [
  {
    id: 'influencer',
    title: '인플루언서',
    icon: 'fluent-color:star-24',
    text: '팔로워가 십만을 넘겼다. 이제 사람들이 당신의 하루를 궁금해한다.',
    condition: { charm: 80 },
    tier: 3,
  },
  {
    id: 'ironman',
    title: '철인',
    icon: 'fluent-color:sport-24',
    text: '거울 속의 몸이 낯설다. 무엇을 하든 지치지 않는 몸을 얻었다.',
    /* ⚠️ **예전에는 `maxStamina: 200`이었다**(2026-08-08 체력 통합). 그 스탯이 사라지면서
       "몸을 키웠다"를 재는 값은 `athletics` 하나가 됐다 — 헬스장·운동·러닝·건강식이
       전부 여기로 모인다. 도달 가능성은 `balance.verify.test.ts`가 지킨다. */
    condition: { athletics: 200 },
    tier: 3,
  },
  {
    id: 'realist',
    title: '현실주의자',
    icon: 'fluent-color:coin-multiple-24',
    text: '통장 잔고가 든든하다. 꿈은 접었지만, 적어도 굶지는 않는다.',
    // 300만원은 물가 외삽 후 최대 도달 잔고(약 265만원)를 넘어 도달 불가였다.
    // 180만원은 알바 특화 플레이 기준 34일차 도달 — 다른 성취 엔딩과 같은 구간이다.
    condition: { money: 1800000 },
    tier: 2,
  },
  {
    id: 'ordinary',
    title: '평범한 일상',
    icon: 'fluent-color:flag-24',
    text: '특별할 것 없는 하루가 쌓여 특별할 것 없는 삶이 되었다. 그것도 나쁘지 않다.',
    condition: { knowledge: 40, charm: 40 },
    tier: 1,
  },
]

/**
 * 도감이 세는 엔딩 전부.
 *
 * ⚠️ **성취 엔딩뿐이다**(2026-08-14 육성물 전환). 예전에는 여기에 직업 엔딩 9종과
 * 실패 엔딩 2종이 더 있었고, 셋을 합쳐 15종이었다. 셋 다 **파산해야 뜨는 엔딩**이라
 * 게임오버가 없어진 지금은 아무도 도달할 수 없다 — 남겨 두면 도감에 영원히 미달성인
 * 줄이 열한 개 생긴다.
 *
 * - **직업 9종**은 도감의 **직업 시트**로 갔다. 원래 그 시트가 "다녀 본 회사"를 이미
 *   세고 있었으므로, 직업 엔딩은 **같은 사실을 두 번 적은 것**이었다.
 *   해금은 채용이 확정되는 순간 `metaStore.unlockCareer`가 찍는다.
 * - **실패 2종**(파산·번아웃)은 이제 엔딩이 아니라 **며칠짜리 사건**이다(`Recovery`).
 *
 * ⚠️ **되살리지 말 것** — 되살리려면 판을 끝내는 장치부터 다시 만들어야 하고,
 * 그 순간 생활 등급(`systems/lifeRank.ts`)이 무의미해진다.
 */
export const ENDINGS: Ending[] = [...ACHIEVEMENT_ENDINGS]
