import type { Activity } from '../types/game'

/** 바탕화면 exe 활동. 수치 조정은 이 파일에서만 한다. */
export const ACTIVITIES: Activity[] = [
  {
    id: 'study',
    label: '공부.exe',
    icon: '📚',
    description: '전공서를 펼친다. 머리는 아프지만 확실히 는다.',
    effects: { intelligence: 6, stamina: -15, mental: -5 },
    requires: { stamina: 15 },
  },
  {
    id: 'work',
    label: '알바.exe',
    icon: '💼',
    description: '편의점 야간 근무. 돈은 들어온다.',
    effects: { money: 60000, stamina: -25, mental: -8 },
    requires: { stamina: 25 },
    scalesWithWage: true,
  },
  {
    id: 'exercise',
    label: '운동.exe',
    icon: '🏃',
    description: '체력의 한계를 조금씩 밀어낸다.',
    effects: { maxStamina: 4, stamina: -20, mental: 3 },
    requires: { stamina: 20 },
  },
  {
    id: 'game',
    label: '게임.exe',
    icon: '🎮',
    description: '아무 생각 없이 논다. 멘탈이 회복된다.',
    effects: { mental: 18, stamina: -5, intelligence: -1 },
    requires: { stamina: 5 },
  },
  {
    id: 'social',
    label: '메신저.exe',
    icon: '💬',
    description: '사람들과 어울린다. 돈은 좀 쓴다.',
    effects: { charm: 5, mental: 8, money: -20000, stamina: -10 },
    requires: { stamina: 10, money: 20000 },
  },
]

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
