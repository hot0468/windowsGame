import { Dumbbell, Flame, Meh, Skull, Sparkles, Trophy, Wallet } from 'lucide-react'
import type { IconComponent, Stats } from '../types/game'

export interface Ending {
  id: string
  title: string
  icon: IconComponent
  /** 엔딩 화면에 표시할 본문. */
  text: string
  /** 모든 조건을 충족해야 도달한다. 실패 엔딩은 조건 없음. */
  condition?: Partial<Record<keyof Stats, number>>
  /** 높을수록 상위 엔딩. 판정은 tier 내림차순으로 한다. */
  tier: number
  /** 실패 엔딩은 선택 없이 강제 종료된다. */
  isFailure?: boolean
}

/**
 * 성취 엔딩. tier 내림차순으로 정렬해 둔다 — 판정이 이 순서에 의존한다.
 * 조건 수치는 밸런스 검증(balance.verify.test.ts)이 지키는 값이다. 스탯 상한이 999로 올랐다고
 * 해서 도달 기준을 올리면 완주 가능성이 깨진다 — 이름 변경 외에는 손대지 않는다.
 */
export const ACHIEVEMENT_ENDINGS: Ending[] = [
  {
    id: 'bigtech',
    title: '대기업 합격',
    icon: Trophy,
    text: '최종 합격 통보가 왔다. 길고 지루했던 시간이 한 줄의 문장으로 보상받는 순간이다.',
    condition: { knowledge: 90, mental: 40 },
    tier: 4,
  },
  {
    id: 'influencer',
    title: '인플루언서',
    icon: Sparkles,
    text: '팔로워가 십만을 넘겼다. 이제 사람들이 당신의 하루를 궁금해한다.',
    condition: { charm: 80 },
    tier: 3,
  },
  {
    id: 'ironman',
    title: '철인',
    icon: Dumbbell,
    text: '거울 속의 몸이 낯설다. 무엇을 하든 지치지 않는 몸을 얻었다.',
    condition: { maxStamina: 200 },
    tier: 3,
  },
  {
    id: 'realist',
    title: '현실주의자',
    icon: Wallet,
    text: '통장 잔고가 든든하다. 꿈은 접었지만, 적어도 굶지는 않는다.',
    // 300만원은 물가 외삽 후 최대 도달 잔고(약 265만원)를 넘어 도달 불가였다.
    // 180만원은 알바 특화 플레이 기준 34일차 도달 — 다른 성취 엔딩과 같은 구간이다.
    condition: { money: 1800000 },
    tier: 2,
  },
  {
    id: 'ordinary',
    title: '평범한 일상',
    icon: Meh,
    text: '특별할 것 없는 하루가 쌓여 특별할 것 없는 삶이 되었다. 그것도 나쁘지 않다.',
    condition: { knowledge: 40, charm: 40 },
    tier: 1,
  },
]

/** 실패 엔딩. 조건 판정이 아니라 게임오버 사유로 직접 선택된다. */
export const FAILURE_ENDINGS: Record<string, Ending> = {
  bankrupt: {
    id: 'bankrupt',
    title: '파산',
    icon: Skull,
    text: '통장이 비었다. 월세 독촉 문자가 쌓이는 화면을 그저 바라본다.',
    tier: 0,
    isFailure: true,
  },
  burnout: {
    id: 'burnout',
    title: '번아웃',
    icon: Flame,
    text: '아무것도 하고 싶지 않다. 침대에서 일어날 이유를 찾지 못한 채 하루가 지나간다.',
    tier: 0,
    isFailure: true,
  },
}

export const ENDINGS: Ending[] = [...ACHIEVEMENT_ENDINGS, ...Object.values(FAILURE_ENDINGS)]
