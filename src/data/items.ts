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
  /**
   * 쇼핑에서 살 수 있는가. **기본은 살 수 있음**(생략 = true)이라 기존 물건은 그대로다.
   * 수료증처럼 **다른 경로로만 얻는 물건**만 false를 적는다.
   */
  buyable?: boolean
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
    /*
     * ⚠️ **다른 물건과 성격이 다르다: 이건 스탯이 아니라 활동을 연다.**
     * 이 카드를 받아야 `gym-member`(헬스장 회원) 활동이 실행 가능해진다
     * (`Activity.requiresItem` → `systems/turn.ts`의 `canRun`).
     *
     * 가격 90,000원은 1일권 15,000원의 **6회분**이다 — 7번째 방문부터 이득이 나므로
     * "이번 달에 여섯 번 넘게 갈 것인가"가 실제 판단이 된다. 더 싸게 잡으면 1일권이
     * 다시 무의미해지고, 더 비싸면 아무도 안 산다.
     * 헬스장 오픈채팅의 [한 달 끊을게요]도 같은 아이템을 주문한다 — 가격이 두 곳에
     * 적히지 않도록 그쪽은 이 값을 참조한다.
     *
     * `effects`가 비어 있는 유일한 물건이다. 값은 잠금 해제 자체이고, 여기에 스탯까지
     * 붙이면 "회원권을 사면 몸이 좋아진다"는 이상한 말이 된다 — 가야 좋아진다.
     */
    id: 'gym-pass',
    name: '헬스장 회원권',
    price: 90000,
    desc: '한 달권. 등록하는 순간이 가장 건강하다.',
    icon: 'fluent-color:contact-card-24',
    ext: '.pass',
    effects: {},
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
  /*
   * ── 수료증 2종 (2026-08-05 슬로우캠퍼스) ──
   * ⚠️ **살 수 없는 아이템이다.** `SHOP_ITEMS`에 있지만 쇼핑 목록에서는 빠진다
   * (`BUYABLE_ITEMS`가 `buyable !== false`로 거른다) — 돈으로 사면 강의를 들을 이유가
   * 없어진다. 인벤토리·파일 탐색기에서는 다른 아이템과 똑같이 읽혀야 하므로 여기 둔다.
   *
   * 효과가 없는(`effects: {}`) 유일한 아이템이기도 하다. 수료증의 값어치는 스탯이 아니라
   * **잠긴 활동을 여는 것**이다(`gym-pass`와 같은 구조).
   */
  {
    id: 'cert-ai',
    name: '실무 AI 입문 수료증',
    price: 135000, // 45,000 × 3회. 파일 크기 표시에만 쓰인다.
    desc: '이름 석 자와 수료일이 박혀 있다. 액자에 넣을 만한 물건은 아니다.',
    icon: 'fluent-color:certificate-24',
    ext: '.crt',
    effects: {},
    buyable: false,
  },
  {
    id: 'cert-brand',
    name: '1인 브랜드 수료증',
    price: 165000, // 55,000 × 3회.
    desc: '수료했다는 사실만 적혀 있고 잘한다는 말은 없다.',
    icon: 'fluent-color:certificate-24',
    ext: '.crt',
    effects: {},
    buyable: false,
  },
  /*
   * ── 자격증 4종 (2026-08-05 O넷) ──
   * ⚠️ **수료증과 완전히 같은 부류다**: `buyable: false`라 쇼핑 목록에서 빠지고
   * (돈으로 사면 시험을 볼 이유가 없다), 효과가 없으며(`effects: {}`), 값어치는
   * **잠긴 것을 여는 것**이다. 다른 점은 여는 것이 둘이라는 것뿐이다 —
   * 앞의 둘은 활동을, 뒤의 둘은 **정규직 상위 공고의 지원 자격**을 연다.
   *
   * ⚠️ 배송을 거치지 않는다. 합격이 확정되는 밤에 인벤토리로 바로 들어온다
   * (`systems/certification.ts`). price는 응시료이고 **파일 크기 표시에만 쓰인다**.
   */
  {
    id: 'cert-doc',
    name: '문서실무 2급 자격증',
    price: 18000,
    desc: '수험번호와 취득일이 박혀 있다. 사진 속 표정이 굳어 있다.',
    icon: 'fluent-color:certificate-24',
    ext: '.lic',
    effects: {},
    buyable: false,
  },
  {
    id: 'cert-safety',
    name: '안전관리 3급 자격증',
    price: 32000,
    desc: '뒷면에 안전수칙 열 줄이 인쇄돼 있다. 읽어 본 적은 없다.',
    icon: 'fluent-color:certificate-24',
    ext: '.lic',
    effects: {},
    buyable: false,
  },
  {
    id: 'cert-info',
    name: '정보처리 2급 자격증',
    price: 48000,
    desc: '실기 답안에 적었던 SQL이 아직도 가끔 떠오른다.',
    icon: 'fluent-color:certificate-24',
    ext: '.lic',
    effects: {},
    buyable: false,
  },
  {
    id: 'cert-manage',
    name: '경영관리 1급 자격증',
    price: 75000,
    desc: '1급이라고 적혀 있지만 무엇의 1급인지는 아무도 묻지 않는다.',
    icon: 'fluent-color:certificate-24',
    ext: '.lic',
    effects: {},
    buyable: false,
  },
]

/**
 * 쇼핑 목록에 뜨는 물건. ⚠️ **수료증은 여기서 빠진다** — 강의를 들어야만 나온다.
 * 컴포넌트가 id를 나열해 거르지 않도록 목록을 여기서 만든다(`WORK_ACTIVITIES`와 같은 규칙).
 */
export const BUYABLE_ITEMS: ShopItem[] = SHOP_ITEMS.filter((i) => i.buyable !== false)

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
