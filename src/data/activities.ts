import type { Activity } from '../types/game'

/**
 * 활동 정의. 수치 조정은 이 파일에서만 한다.
 * onDesktop이 true인 활동만 바탕화면에 아이콘으로 뜬다 —
 * 나머지는 정의를 보존한 채 숨겨 두고, 추후 브라우저/스케줄 시스템에서 재사용한다.
 *
 * 단, 바탕화면 항목이 곧 활동인 것은 아니다. 활동이 아닌 항목(브라우저·폴더 등)은
 * `data/desktopItems.ts`가 관리하며, Desktop 컴포넌트는 그쪽의 DESKTOP_ITEMS만 순회한다.
 */
export const ACTIVITIES: Activity[] = [
  {
    id: 'study',
    label: '공부',
    icon: 'fluent-color:book-open-24',
    description: '전공서를 펼친다. 머리는 아프지만 확실히 는다.',
    effects: { knowledge: 6, stamina: -15, mental: -5 },
    requires: { stamina: 15 },
  },
  {
    id: 'work',
    label: '알바',
    icon: 'fluent-color:briefcase-24',
    description: '편의점 야간 근무. 돈은 들어온다.',
    effects: { money: 60000, stamina: -25, mental: -8 },
    requires: { stamina: 25 },
    scalesWithWage: true,
  },
  {
    id: 'exercise',
    label: '운동',
    icon: 'fluent-color:sport-24',
    description: '오늘 행동력을 태워 체력을 키운다.',
    effects: { maxStamina: 4, stamina: -20, mental: 3 },
    requires: { stamina: 20 },
  },
  {
    id: 'game',
    label: '게임',
    icon: 'fluent-color:puzzle-piece-24',
    description: '아무 생각 없이 논다. 멘탈이 회복된다.',
    effects: { mental: 18, stamina: -5, knowledge: -1 },
    requires: { stamina: 5 },
  },
  {
    /*
     * 헬스장 1일권. 운동보다 효과가 좋은 대신 **돈이 든다** —
     * 회원권(gym-member)과 나눠 둔 이유는 그쪽은 이미 결제한 뒤라 갈 때 돈이 안 나가기 때문이다.
     * 한 활동에 "가끔 돈이 든다"를 넣으면 밸런스 테스트가 볼 수 없는 분기가 생긴다.
     */
    id: 'gym-day',
    label: '헬스장 (1일권)',
    icon: 'fluent-color:sport-24',
    description: '하루치를 끊고 운동한다.',
    effects: { maxStamina: 6, stamina: -20, mental: 2, money: -15000 },
    requires: { stamina: 20, money: 15000 },
  },
  {
    id: 'gym-member',
    label: '헬스장 (회원)',
    icon: 'fluent-color:sport-24',
    description: '회원권으로 간다. 추가 비용은 없다.',
    effects: { maxStamina: 6, stamina: -20, mental: 2 },
    requires: { stamina: 20 },
  },
  {
    id: 'social',
    label: '메신저',
    // ⚠️ 바탕화면에 뜨는 항목이므로 **프로그램 로고**여야 한다(devicon).
    // 말풍선 이모지는 "개념 그림"이지 설치된 앱의 아이콘으로 읽히지 않는다.
    // 이 아이콘은 바탕화면 · 창 타이틀 바 · 작업 표시줄 항목에 그대로 흘러가
    // 앱의 정체성을 한 벌로 유지한다(Desktop.tsx가 item.icon을 open()에 넘긴다).
    icon: 'devicon:slack',
    description: '사람들과 어울린다. 돈은 좀 쓴다.',
    effects: { charm: 5, mental: 8, money: -20000, stamina: -10 },
    requires: { stamina: 10, money: 20000 },
    // ⚠️ 바탕화면에서 내렸다(설계자 결정). 메신저는 이제 카톡 창(kind: 'chat')이고,
    // 이 활동은 그 안의 [만나러 가기] 버튼이 실행한다 — 읽기는 무료, 만나는 것만 1턴.
    // 정의를 지우지 않는 이유: 효과 수치와 밸런스 테스트가 이 활동을 참조한다.
    onDesktop: false,
  },
]

export function findActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
