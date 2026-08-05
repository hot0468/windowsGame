import type { IconName } from '../types/game'

/**
 * 이벤트 도감에 실리는 사건.
 *
 * **엔딩 도감(`metaStore`)과는 다른 것이다.** 엔딩은 판을 끝낸 결과라 판을 넘어
 * 영구 보존되지만, 여기 실리는 건 **이번 판에서 실제로 겪은 일**이라 세이브에 들어간다
 * (`GameState.events`).
 *
 * ⚠️ 지금은 항목이 다섯 개뿐이다. 랜덤 이벤트 시스템이 생기면 **여기에 정의를 늘리고
 * 발생 지점에서 `recordEvent`를 부르기만** 하면 되도록 골격을 먼저 세워 둔 것이다 —
 * 도감 화면은 정의 목록을 그대로 그리므로 화면 코드는 다시 고칠 필요가 없다.
 */
export interface GameEvent {
  id: string
  name: string
  /** 아직 겪지 않았을 때 보여 줄 힌트. 내용을 미리 다 알려 주면 도감을 채울 이유가 없다. */
  hint: string
  /** 겪은 뒤에 보여 줄 기록. */
  desc: string
  icon: IconName
  /** 파일 탐색기의 확장자. 아이템과 같은 규칙이다. */
  ext: string
}

export const EVENTS: GameEvent[] = [
  {
    id: 'first-order',
    name: '첫 주문',
    hint: '인터넷으로 뭔가를 사 본다.',
    desc: '결제 버튼을 누르는 데 걸린 시간은 3초, 고민한 시간은 이틀.',
    icon: 'fluent-color:gift-24',
    ext: '.evt',
  },
  {
    id: 'first-delivery',
    name: '문 앞의 상자',
    hint: '주문한 물건이 도착한다.',
    desc: '초인종은 울리지 않았다. 문을 여니 상자가 혼자 서 있었다.',
    icon: 'fluent-color:toolbox-24',
    ext: '.evt',
  },
  {
    id: 'gym-member',
    name: '한 달 회원권',
    hint: '몸을 쓰는 일에 목돈을 낸다.',
    desc: '한 달을 끊었으니 이제 안 가면 손해다. 대부분 손해를 본다.',
    icon: 'fluent-color:heart-24',
    ext: '.evt',
  },
  {
    id: 'first-plan',
    name: '계획이라는 것',
    hint: '앞날의 한 칸을 미리 채워 둔다.',
    desc: '달력에 뭔가를 적어 넣은 날. 지킬지는 그날의 내가 정한다.',
    icon: 'fluent-color:calendar-clock-24',
    ext: '.evt',
  },
  {
    id: 'first-ad',
    name: '100원의 가치',
    hint: '광고를 눌러 본다.',
    desc: '배너 하나에 100원. 하루치 생활비를 채우려면 300번쯤 눌러야 한다.',
    icon: 'fluent-color:megaphone-loud-24',
    ext: '.evt',
  },
  {
    id: 'first-deposit',
    name: '맡겨 둔 돈',
    hint: '오늘 쓸 돈을 내일로 미뤄 둔다.',
    desc: '통장에 있는 돈은 오늘 밤 밥값이 되지 않는다. 그걸 알면서도 넣었다.',
    icon: 'fluent-color:savings-24',
    ext: '.evt',
  },
  {
    id: 'first-loan',
    name: '빌린 시간',
    hint: '없는 돈을 미리 당겨 쓴다.',
    desc: '통장에 찍힌 숫자는 늘었다. 갚아야 할 숫자는 그보다 빨리 늘어난다.',
    icon: 'fluent-color:coin-multiple-24',
    ext: '.evt',
  },
]

export function findEvent(id: string): GameEvent | undefined {
  return EVENTS.find((e) => e.id === id)
}
