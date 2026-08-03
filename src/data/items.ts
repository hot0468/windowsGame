import type { IconName, Stats } from '../types/game'

/**
 * 쇼핑에서 살 수 있는 물건.
 *
 * **물건은 도착해야 효과가 난다** — 결제한 날이 아니라 택배가 온 날 스탯이 붙는다
 * (`systems/delivery.ts`). 그래야 "다음 날 배송"이 연출이 아니라 규칙이 된다.
 *
 * 효과를 두는 이유: 순수한 돈 낭비면 쇼핑을 열 이유가 없다. 다만 **한 번뿐인 소량**이고
 * 턴을 소모하지 않으므로, 활동으로 버는 성장(회당 10~15)을 대체하지는 못한다 —
 * 물건은 지름길이 아니라 목돈을 성장으로 바꾸는 선택지다.
 */
export interface ShopItem {
  id: string
  name: string
  price: number
  desc: string
  icon: IconName
  /**
   * 파일 탐색기에서 이름 뒤에 붙는 확장자.
   * 아이템을 **파일로 읽히게 하는 장치**다(설계자 지시: "아이템은 파일 아이콘 형식").
   */
  ext: string
  /** 도착했을 때 한 번 적용되는 효과. */
  effects: Partial<Stats>
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'supplement',
    name: '종합영양제',
    price: 35000,
    desc: '한 통이면 한 달. 광고 문구는 늘 그렇듯 조금 과장돼 있다.',
    icon: 'fluent-color:food-24',
    ext: '.sup',
    effects: { maxStamina: 4, stamina: 12 },
  },
  {
    id: 'notebook',
    name: '가죽 다이어리',
    price: 24000,
    desc: '쓸 말이 없어도 펴 두면 뭔가 쓰게 된다.',
    icon: 'fluent-color:notebook-24',
    ext: '.note',
    effects: { sensitivity: 5, vocabulary: 4 },
  },
  {
    id: 'brush',
    name: '수채화 물감 세트',
    price: 46000,
    desc: '24색. 실제로 쓰게 되는 건 대여섯 색뿐이다.',
    icon: 'fluent-color:paint-brush-24',
    ext: '.art',
    effects: { creativity: 8, sensitivity: 4 },
  },
  {
    id: 'pad',
    name: '무선 게임 패드',
    price: 78000,
    desc: '충전 케이블은 따로 판다.',
    icon: 'fluent-color:puzzle-piece-24',
    ext: '.pad',
    effects: { gaming: 12, mental: 6 },
  },
  {
    id: 'headphones',
    name: '노이즈캔슬링 헤드폰',
    price: 180000,
    desc: '옆집 공사 소리가 사라진다. 초인종 소리도 같이 사라진다.',
    icon: 'fluent-color:headphones-24',
    ext: '.hp',
    effects: { knowledge: 8, mental: 5 },
  },
  {
    id: 'laptop',
    name: '중고 노트북',
    price: 420000,
    desc: '전 주인이 스티커를 떼다 만 자국이 있다.',
    icon: 'fluent-color:laptop-24',
    ext: '.lap',
    effects: { creativity: 10, gaming: 8, knowledge: 6 },
  },
]

export function findItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id)
}

/**
 * 파일 탐색기 '크기' 열에 쓸 값.
 *
 * 실제 파일이 아니므로 크기라는 게 없다 — 가격에서 만들어 낸다.
 * 무작위로 뽑으면 새로 그릴 때마다 숫자가 바뀌어 "값이 아니라 노이즈"가 된다.
 */
export function fakeSize(item: ShopItem): string {
  return `${Math.round(item.price / 1000).toLocaleString()} KB`
}
