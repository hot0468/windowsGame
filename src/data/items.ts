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
  /**
   * 어느 사이트 진열대에 뜨는가. **생략 = 'shop'**(컬리엔마트)이라 기존 물건은 그대로다.
   *
   * ⚠️ **이건 분류 축이지 목록이 아니다.** `SHOP_ITEMS`는 여전히 물건 전체의 단일 출처이고
   * (인벤토리·파일 탐색기가 여기서 이름과 아이콘을 찾는다), 사이트별 진열은 이 필드로
   * **파생**시킨다(`buyableFor(store)`). 사이트마다 배열을 하나씩 만들면 물건 하나를
   * 옮길 때 두 곳을 고쳐야 하고, 한쪽만 고치면 같은 물건이 두 가게에 동시에 뜬다.
   */
  store?: ItemStore
  /**
   * **TPO 옷**. 가지고 있기만 하면 여기 적힌 활동의 **성장 상승분이 조금 커진다**
   * (`systems/turn.ts`의 `outfitBonusFor` → `runActivity`).
   *
   * ⚠️ **지속 효과(매 턴 적용)가 아니다.** 밤 정산을 건드리지 않고 활동을 실행하는
   * 순간에만 곱해지므로, "지속 효과를 만들지 않는다"는 규칙(위 전자기기 주석)은 그대로다.
   *
   * ⚠️ **관계를 활동 쪽에 다시 적지 않는다.** "이 옷이 어디에 맞는가"는 여기만 알고,
   * 화면은 `outfitsFor(activityId)`로 뒤집어 찾는다(`requiresItem`·`activitiesUnlockedBy`와
   * 같은 방향). 양쪽에 적으면 한쪽만 고치는 사고가 난다.
   */
  outfit?: {
    /** 이 옷이 어울리는 활동 id 목록. */
    fits: string[]
  }
}

/**
 * TPO가 맞을 때 성장 상승분에 얹히는 비율. **옷마다 다르게 두지 않는다** —
 * 옷이 갈리는 축은 값이 아니라 **덮는 활동 수**(=가격)여야 "무엇이 더 센 옷인가"를
 * 계산하는 놀이가 생기지 않는다.
 *
 * ⚠️ **겹쳐 쌓이지 않는다**(`outfitBonusFor`는 가장 좋은 하나만 본다) — 옷을 다 사면
 * 배수가 되는 구조는 "물건은 지름길이 아니다"라는 이 파일의 규칙을 깬다.
 */
export const OUTFIT_BONUS = 0.2

/* ── 최신형 휴대폰 (2026-08-08) ──────────────────────────────────────────
 * **가지고 있는 동안 친화력 상승분이 커지고, 대신 한 달에 한 번 요금이 나간다.**
 *
 * ⚠️ **옷(`OUTFIT_BONUS`)과 같은 부류이되 축이 다르다.** 옷은 *그 활동*이 맞으면 붙고,
 * 휴대폰은 *그 스탯*이 오를 때 붙는다 — 어느 활동으로 올렸든 연락은 연락이다.
 * ⚠️ **둘은 겹쳐 쌓인다.** 서로 다른 것을 보므로 막을 근거가 없고, 정장 + 휴대폰으로
 * 면접의 친화력이 1.45배가 되는 것은 **둘 다 산 값**이다(`items.test.ts`가 합을 지킨다).
 * ⚠️ **요금을 물가 배율에 태우지 않는다** — 통신 요금은 이 게임의 물가표가 다루는 축이
 * 아니고, 태우면 후반에 3천원이 3만원이 되어 "잊고 있다가 나가는 돈"이 파산의 원인이 된다.
 */
export const PHONE_ID = 'phone'

/** 친화력 상승분에 얹히는 비율. */
export const PHONE_BONUS = 0.25

/** 휴대폰이 키워 주는 스탯. **하나뿐이다** — 늘리면 옷이 있을 이유가 사라진다. */
export const PHONE_STAT = 'sociability' as const

/** 한 달 요금(원). 어도비 10,000원보다 작다 — 이쪽은 끊는 선택지가 없기 때문이다. */
export const PHONE_FEE = 3000

/**
 * 물건이 진열되는 가게.
 * 'shop' = 컬리엔마트(생활잡화 + 복권), 'tech' = 하이마루(전자기기 양판점),
 * 'wear' = 무진장(의류).
 */
export type ItemStore = 'shop' | 'tech' | 'wear'

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'supplement',
    name: '종합영양제',
    price: 35000,
    desc: '한 통이면 한 달. 광고 문구는 늘 그렇듯 조금 과장돼 있다.',
    icon: 'fluent-color:food-24',
    ext: '.sup',
    effects: { athletics: 4, stamina: 12 },
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
    /*
     * 미용실 정기권. ⚠️ **`gym-pass`와 완전히 같은 부류다** — 스탯을 주지 않고
     * (`effects: {}`) `salon-member` 활동을 여는 것이 값어치의 전부다.
     *
     * 가격 150,000원은 1회 25,000원의 **6회분**이다(헬스장과 같은 규칙 —
     * 7번째 방문부터 이득이 나므로 "이번 달에 여섯 번 넘게 갈 것인가"가 판단이 된다).
     * 미용실 오픈채팅의 [정기권 끊을게요]도 같은 아이템을 주문한다 — 잠금 해제 경로를
     * 둘로 나누면 한쪽만 고치는 사고가 나므로 물건은 하나다.
     */
    id: 'salon-pass',
    name: '미용실 정기권',
    price: 150000,
    desc: '결제할 때만 원장님이 이름을 불러 준다.',
    icon: 'fluent-color:premium-24',
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
  /*
   * ── 전자기기 (2026-08-06 하이마루로 이사) ──
   * ⚠️ **아래 물건들의 `id`·`name`·`effects`·`ext`는 바뀌지 않았고 `SHOP_ITEMS`에서
   * 빠지지도 않았다.** 세이브의 인벤토리(`GameState.items`)가 id를 들고 있고
   * 파일 탐색기가 이름·아이콘을 여기서 찾으므로, 옮긴 것은 **진열대뿐**이다
   * (`store: 'tech'` 한 줄 = 컬리엔마트 목록에서 빠지고 하이마루 목록에 뜬다).
   */
  {
    id: 'pad',
    name: '무선 게임 패드',
    price: 78000,
    desc: '충전 케이블은 따로 판다.',
    icon: 'fluent-color:puzzle-piece-24',
    ext: '.pad',
    effects: { gaming: 12, mental: 6 },
    store: 'tech',
  },
  {
    id: 'headphones',
    name: '노이즈캔슬링 헤드폰',
    price: 180000,
    desc: '옆집 공사 소리가 사라진다. 초인종 소리도 같이 사라진다.',
    icon: 'fluent-color:headphones-24',
    ext: '.hp',
    effects: { knowledge: 8, mental: 5 },
    store: 'tech',
  },
  {
    id: 'laptop',
    name: '중고 노트북',
    price: 420000,
    desc: '전 주인이 스티커를 떼다 만 자국이 있다.',
    icon: 'fluent-color:laptop-24',
    ext: '.lap',
    effects: { creativity: 10, gaming: 8, knowledge: 6 },
    store: 'tech',
  },
  /*
   * ── 신규 전자기기 4종 (2026-08-06 하이마루) ──
   *
   * ⚠️ **가격 상한은 200만이다.** 이 게임이 실제로 만드는 현금은 알바 최적 플레이 정점이
   * 약 265만이고, 정규직 급여도 170만~460만이다. 그보다 비싼 물건은 "살 수 있는 선택지"가
   * 아니라 그냥 없는 물건이 된다. 가장 비싼 것(방음 부스 1,650,000)이 그 선 안이다.
   *
   * ⚠️ **효과는 도착 시 1회다. 지속 효과(매 턴 적용)를 만들지 않는다** — 밤 정산이
   * 필요해져 은행·이사와 같은 무게가 된다(설계자가 구독을 제외한 것과 같은 이유).
   *
   * ⚠️ **고가품이라도 활동을 대체하지 않는다**(이 파일 상단 주석). 활동 한 회가 10~15를
   * 주므로, 스탯 총합을 활동 서너 회분(30~45) 언저리에 묶어 뒀다. 값이 커 보이는 이유는
   * 여러 스탯에 얇게 흩어져 있기 때문이지 한 스탯을 몰아주기 때문이 아니다.
   */
  {
    /*
     * 잠금 해제형. `gym-pass`·수료증과 **같은 구조**다: `effects`가 비어 있고 값어치는
     * 잠긴 활동(`stream`, 개인방송)을 여는 것이다. 여기에 스탯까지 붙이면 "장비를 사면
     * 방송을 잘하게 된다"는 이상한 말이 된다 — 켜고 앉아야 는다.
     *
     * 가격 340,000원은 그 활동이 회당 버는 55,000원의 **약 6회분**이다(회원권이 1일권
     * 6회분인 것과 같은 셈법) — 일곱 번째 방송부터 본전을 넘으므로 "계속 켤 것인가"가
     * 실제 판단이 된다.
     */
    id: 'streamkit',
    name: '방송용 마이크 세트',
    price: 340000,
    desc: '마이크와 조명, 삼각대까지 한 상자. 켜는 것까지가 장비의 몫이다.',
    icon: 'fluent-color:mic-24',
    ext: '.mic',
    effects: {},
    store: 'tech',
  },
  {
    /*
     * 고가 스탯형 ①. 큰 화면 둘 = 앉아 있는 시간이 길어진다.
     * 지식·창의력을 조금씩 + 게임을 얹었다. 총합 22로 활동 두 회분 남짓이다.
     */
    id: 'monitor',
    name: '듀얼 모니터 세트',
    price: 620000,
    desc: '한쪽에 자료를 띄워 두면 확실히 빨라진다. 다른 쪽은 대개 딴짓이다.',
    /* ⚠️ **노트북(`laptop-24`)과 다른 그림이어야 한다.** 둘 다 하이마루 진열 격자와
       아이템 인벤토리에 나란히 뜨는데 같은 아이콘이면 어느 쪽이 62만원짜리인지
       그림으로 구분되지 않는다(사이트 아이콘 중복 금지와 같은 이유).
       fluent-color에 모니터 전용 이름이 없어 큰 화면을 뜻하는 `board-24`를 쓴다. */
    icon: 'fluent-color:board-24',
    ext: '.mon',
    effects: { knowledge: 9, creativity: 7, gaming: 6 },
    store: 'tech',
  },
  {
    /*
     * 고가 스탯형 ②. 카메라는 **바깥을 보게 만드는 물건**이라 감성·창의력 쪽이다.
     * 총합 24. 노트북(420,000 / 24)보다 비싸지만 성격이 다른 스탯을 준다 —
     * 값이 같은 스탯을 더 주는 관계면 노트북이 순수하게 열등해진다.
     */
    id: 'camera',
    name: '미러리스 카메라',
    price: 880000,
    desc: '들고 나가면 안 보이던 게 보인다. 안 들고 나가면 서랍에서 잔다.',
    icon: 'fluent-color:camera-24',
    ext: '.cam',
    effects: { sensitivity: 12, creativity: 8, charm: 4 },
    store: 'tech',
  },
  {
    /*
     * 고가 스탯형 ③ — **이 가게의 최상단 물건**이다. 1,650,000원은 알바 정점(약 265만)
     * 안쪽이고 정규직 최저 급여(170만) 아래라, 목표로 삼을 수는 있되 초반에는 닿지 않는다.
     * ⚠️ **총합 46**(지식12+창의10+멘탈12+체력6+감수성6)으로 이 게임에서 가장 큰 물건이다.
     * 활동 회당 10~15 기준 서너 회분이라 "물건은 지름길이 아니다"(위 주석) 규칙의 경계에
     * 서 있다 — 그것을 지탱하는 것은 **가격**이다: 원당 효율 28.0원/포인트로 노트북
     * (420,000 / 24 = 17.5)보다 오히려 나쁘다. **총합을 더 얹지 마라.** 얹으려면 가격을
     * 함께 올려 이 효율 관계를 유지해야 하는데, 1,650,000이 이미 알바 정점 안쪽의 상한이다.
     */
    id: 'booth',
    name: '조립식 방음 부스',
    price: 1650000,
    desc: '문을 닫으면 세상이 조용해진다. 조립에 이틀이 걸렸다는 후기가 많다.',
    icon: 'fluent-color:headset-24',
    ext: '.booth',
    effects: { knowledge: 12, creativity: 10, mental: 12, athletics: 6, sensitivity: 6 },
    store: 'tech',
  },
  /*
   * ── 타블렛 2종 (2026-08-08) ──
   *
   * ⚠️ **둘 다 잠금 해제형이다**(`gym-pass`·`streamkit`과 같은 구조: `effects`가 비어 있다).
   * 값어치는 **클립스튜디오(`draw` 활동)를 여는 것**이고, 여기에 스탯까지 붙이면
   * "장비를 사면 그림을 잘 그리게 된다"는 이상한 말이 된다 — 켜고 그려야 는다.
   *
   * ⚠️ **둘이 같은 문을 연다**(`Activity.requiresItem`이 배열인 이유). 활동을 둘로 쪼개면
   * 바탕화면에 클립스튜디오 아이콘이 둘 생긴다. 대신 갈리는 것은 **그림 등급 보너스**뿐이고
   * 그 판정은 `systems/artwork.ts` 하나가 갖는다(수치는 `data/artworks.ts`).
   *
   * 가격 관계가 이 둘의 존재 이유다: 팬 220,000원은 방송 장비(340,000)보다 싸서
   * **중반 이전에 닿는 첫 창작 장비**이고, 액정 1,150,000원은 방음 부스(1,650,000) 아래·
   * 카메라(880,000) 위라 **판을 어느 정도 굴린 뒤의 목표**가 된다. 액정을 사도 팬으로 그린
   * 그림이 소급해서 좋아지지는 않는다(`Artwork.tool`을 그릴 때 박아 둔다).
   */
  {
    id: 'pen-tablet',
    name: '팬 타블렛',
    price: 220000,
    desc: '화면을 보면서 손은 딴 데를 그린다. 익숙해지는 데 일주일쯤 걸린다.',
    icon: 'fluent-color:document-edit-24',
    ext: '.tab',
    effects: {},
    store: 'tech',
  },
  {
    id: 'lcd-tablet',
    name: '액정 타블렛',
    price: 1150000,
    desc: '화면 위에 그대로 그린다. 손목을 올려 둘 자리부터 고민하게 된다.',
    icon: 'fluent-color:video-24',
    ext: '.tab',
    effects: {},
    store: 'tech',
  },
  {
    /*
     * ⚠️ **도착 효과가 없다**(`effects: {}`) — 의류와 같은 부류다. 값어치는 받는 순간이
     * 아니라 **가지고 있는 동안** 나오고(친화력 상승분 +25%), 그 대신 한 달에 한 번
     * 요금이 나간다(`systems/phone.ts`). 규칙은 전부 그쪽에 있고 여기는 값만 갖는다.
     */
    id: 'phone',
    name: '최신형 휴대폰',
    price: 1290000,
    /* ⚠️ **요금 액수를 설명에 적는다.** 129만원을 결제한 뒤에야 알게 되는 고정비는
       숨은 비용이고, 이 게임은 나가는 돈을 전부 미리 말해 준다(생활비 예고·확인창). */
    desc: '연락처가 저절로 늘어난다. 친화력이 잘 오르는 대신 30일마다 3,000원이 빠져나간다.',
    icon: 'fluent-color:phone-24',
    ext: '.dev',
    effects: {},
    store: 'tech',
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
  /*
   * ── 의류 4종 (2026-08-08 무진장) ──
   *
   * ⚠️ **이 물건들은 도착해도 스탯을 주지 않는다**(`effects: {}` — `gym-pass`·`streamkit`과
   * 같은 부류다). 값어치는 **가지고 있는 동안 TPO가 맞는 활동의 성장 상승분이 커지는 것**이고,
   * 여기에 도착 보너스까지 붙이면 "옷을 사면 그 자리에서 사람이 나아진다"는 이상한 말이 된다.
   *
   * ⚠️ **입고 벗는 상태를 만들지 않는다.** 가지고 있으면 적용이다 — 옷을 갈아입는 조작을
   * 넣으면 활동을 고를 때마다 한 단계가 더 붙고, 그 단계는 "맞는 옷을 고른다"는 뻔한
   * 정답이 있어 선택이 아니라 절차가 된다(설계자가 구독을 뺀 것과 같은 판단).
   *
   * ⚠️ **가격은 덮는 활동 수를 따른다**(보너스는 `OUTFIT_BONUS` 하나로 같다).
   * 셋을 덮는 옷이 싸고 다섯을 덮는 옷이 비싸다 — 그래야 "무엇을 먼저 살 것인가"가
   * 세기 비교가 아니라 **내가 무엇을 자주 하는가**의 문제가 된다.
   */
  {
    id: 'sportswear',
    name: '기능성 운동복',
    price: 45000,
    desc: '땀이 빨리 마른다. 입고 나가면 안 뛰기가 민망해진다.',
    icon: 'fluent-color:sport-24',
    ext: '.wear',
    effects: {},
    store: 'wear',
    outfit: { fits: ['gym-day', 'gym-member', 'running', 'exercise'] },
  },
  {
    id: 'homewear',
    name: '극세사 홈웨어',
    price: 32000,
    desc: '한번 입으면 바깥에 나갈 이유가 사라진다.',
    icon: 'fluent-color:home-24',
    ext: '.wear',
    effects: {},
    store: 'wear',
    outfit: { fits: ['game', 'reading', 'writing', 'draw'] },
  },
  {
    id: 'outing-jacket',
    name: '나들이 재킷',
    price: 98000,
    desc: '어디에 입어도 무난하다. 무난하다는 말이 칭찬인 옷이다.',
    icon: 'fluent-color:ribbon-24',
    ext: '.wear',
    effects: {},
    store: 'wear',
    outfit: { fits: ['social', 'movie', 'club', 'salon-visit', 'salon-member'] },
  },
  {
    id: 'suit',
    name: '면접용 정장',
    price: 150000,
    desc: '1년에 몇 번 입지만 그 몇 번이 중요하다.',
    icon: 'fluent-color:briefcase-24',
    ext: '.wear',
    effects: {},
    store: 'wear',
    outfit: { fits: ['job-apply', 'job-interview', 'commute'] },
  },
]

/**
 * 살 수 있는 물건 전체(가게 구분 없음). ⚠️ **수료증·자격증은 여기서 빠진다** —
 * 강의를 듣거나 시험에 붙어야만 나온다.
 * 컴포넌트가 id를 나열해 거르지 않도록 목록을 여기서 만든다(`WORK_ACTIVITIES`와 같은 규칙).
 */
export const BUYABLE_ITEMS: ShopItem[] = SHOP_ITEMS.filter((i) => i.buyable !== false)

/**
 * 그 가게의 진열대에 뜨는 물건.
 *
 * ⚠️ **두 번째 출처를 만들지 않기 위한 파생 함수다.** 가게마다 배열을 따로 두면 물건을
 * 옮길 때 두 곳을 고쳐야 하고 한쪽만 고치면 같은 물건이 두 가게에 동시에 뜬다.
 * `store`를 생략한 물건은 컬리엔마트('shop')다 — 기존 물건 정의를 건드리지 않기 위한 기본값.
 */
export function buyableFor(store: ItemStore): ShopItem[] {
  return BUYABLE_ITEMS.filter((i) => (i.store ?? 'shop') === store)
}

/** 가게 이름. 잠금 사유 문구가 **어느 사이트로 가야 하는지** 말할 수 있게 하는 단일 출처. */
export const STORE_NAMES: Record<ItemStore, string> = {
  shop: '쇼핑',
  tech: '하이마루',
  wear: '무진장',
}

/**
 * 그 물건을 파는 가게 이름.
 *
 * ⚠️ **잠금 사유 문구가 "쇼핑에서 구입"으로 굳어 있으면 안 된다** — 전자기기는
 * 하이마루에서만 판다. 물건이 어느 가게에 있는지는 `store` 하나가 알고 있으므로
 * 문구는 여기서 파생시킨다(화면마다 가게 이름을 적으면 물건을 옮길 때 전부 거짓이 된다).
 * 살 수 없는 물건(수료증·자격증)은 가게가 없으므로 undefined다.
 */
export function storeNameOf(itemId: string): string | undefined {
  const item = findItem(itemId)
  if (!item || item.buyable === false) return undefined
  return STORE_NAMES[item.store ?? 'shop']
}

/**
 * 이 활동에 어울리는 옷들. **관계는 `ShopItem.outfit.fits`에만 적혀 있고 여기서 뒤집는다**
 * (`activitiesUnlockedBy`와 같은 방향) — 활동 쪽에도 적으면 한쪽만 고치는 사고가 난다.
 */
export function outfitsFor(activityId: string): ShopItem[] {
  return SHOP_ITEMS.filter((i) => i.outfit?.fits.includes(activityId))
}

/** 옷 전체. 무진장 진열과 테스트가 쓴다(컴포넌트가 id를 나열하지 않는다). */
export const OUTFIT_ITEMS: ShopItem[] = SHOP_ITEMS.filter((i) => i.outfit)

export function findItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id)
}

/**
 * 요구 아이템 필드를 **항상 목록으로** 편다(`Activity.requiresItem`·`DesktopItem.requiresItem`).
 *
 * ⚠️ **이 정규화가 한 곳에만 있어야 한다.** 필드가 `string | string[]`이 되면서
 * 읽는 자리가 다섯(실행 판정·바탕화면 표시·잠금 사유·스케줄러 고르기 판·테스트)이 됐는데,
 * 각자 `Array.isArray`를 적으면 한 곳이 배열을 문자열로 다뤄 **조건이 조용히 통과한다**.
 */
export function requiredItemIds(required: string | string[] | undefined): string[] {
  if (!required) return []
  return Array.isArray(required) ? required : [required]
}

/**
 * 요구 아이템의 사람이 읽는 이름. 여럿이면 **"또는"으로 잇는다** — AND가 아니라 OR이므로
 * "팬 타블렛과 액정 타블렛이 있어야 합니다"는 거짓이 된다(둘 중 하나면 된다).
 */
export function requiredItemLabel(required: string | string[] | undefined): string {
  return requiredItemIds(required)
    .map((id) => findItem(id)?.name ?? id)
    .join(' 또는 ')
}

/**
 * 요구 아이템을 파는 가게 이름(중복 제거).
 * ⚠️ 화면이 "쇼핑에서 구입"을 굳혀 적지 않게 하는 것이 목적이다(`storeNameOf`와 같은 이유).
 */
export function requiredItemStores(required: string | string[] | undefined): string {
  const names = requiredItemIds(required)
    .map((id) => storeNameOf(id))
    .filter((n): n is string => !!n)
  return [...new Set(names)].join(' · ')
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
