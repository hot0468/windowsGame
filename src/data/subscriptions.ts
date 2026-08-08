/**
 * 구독 상품.
 *
 * ⚠️ **이 파일이 생기면서 "구독은 만들지 않는다"는 옛 규칙이 뒤집혔다**(설계자 지시).
 * 그 규칙의 근거는 "지속 상태는 밤 정산이 필요해진다"였는데, 실제로 필요해졌다 —
 * `systems/subscription.ts`의 `advanceSubscriptions`가 은행·트위터와 같은 자리에서 돈다.
 * ⚠️ 다만 **나가는 돈이라 `nightPayoutPending`에는 넣지 않는다**: 그 술어는 "받을 돈이
 * 남았으니 죽음 판정을 미룬다"는 뜻이고, 나가는 돈을 미룰 이유는 없다.
 *
 * ⚠️ **실존 브랜드를 쓰지 않는다**는 규칙의 예외가 아니다 — '어도비'는 이 게임의
 * 바탕화면이 이미 쓰고 있는 **프로그램 이름 계열**이다(포토샵·VS 코드와 같은 부류로,
 * 지어낸 상호를 쓰는 광고·가게와는 축이 다르다).
 */

export interface Subscription {
  id: string
  name: string
  /** 결제 화면이 있는 사이트 id(`data/sites.ts`). */
  siteId: string
  /** 한 달 요금(원). */
  monthlyFee: number
  desc: string
  /** 구독이 여는 것. 화면이 "이걸 왜 끊나"에 답하는 목록이고 **관계를 여기 적지 않는다** —
   *  실제 잠금은 `Activity.requiresSubscription`·`DesktopItem.requiresSubscription`이 진다. */
  perks: string[]
}

/**
 * 청구 주기(일). **30일이다.**
 *
 * ⚠️ 급여를 15일(격주)로 잡은 이유("100일 판에서 두 번뿐이면 리듬이 안 돈다")는
 * **받는 돈**에 대한 것이다. 나가는 돈은 반대로 **잊을 만할 때 다시 나가야** 부담으로
 * 읽히므로 한 달이 맞고, 사용자가 지시한 "매월"이기도 하다.
 */
export const BILLING_INTERVAL_DAYS = 30

export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'adobe',
    name: '어도비 크리에이티브 클라우드',
    siteId: 'adobe',
    /*
     * 10,000원/월. ⚠️ 생활비(3만~9.5만/일)에 비하면 작다 — 그것이 의도다:
     * 구독은 **파산의 원인이 아니라 잊고 있다가 나가는 돈**이어야 한다.
     * 값어치는 요금이 아니라 **여는 것**에 있다(포토샵 아이콘 + 그몽 디자인 일감).
     */
    monthlyFee: 10000,
    desc: '포토샵을 포함한 크리에이티브 도구 전체. 해지하면 다음 날부터 못 연다.',
    perks: ['바탕화면에 포토샵이 설치된다', '그몽의 디자인 일감을 받을 수 있다'],
  },
  {
    /*
     * ⚠️ **이 구독은 잠금을 열지 않는다.** 어도비는 활동·아이콘을 여는 열쇠지만
     * 이쪽이 파는 것은 **배율 하나**다(`PLUS_MULTIPLIER`) — 그래서
     * `Activity.requiresSubscription`을 아무것도 안 쓰고, 판정은 정산 함수
     * (`systems/twitter.ts`의 `weeklyIncome`)가 직접 본다.
     *
     * ⚠️ **정산 천장(`WEEKLY_INCOME_CAP`)은 이 구독으로 올라가지 않는다.** 올리면
     * 팔로워 수입이 물가를 이겨 판이 끝나지 않는다 — 사유는 그 상수 주석에 있다.
     */
    id: 'twitter-plus',
    name: '트위터 플러스',
    siteId: 'twitter',
    monthlyFee: 10000,
    desc: '팔로워로 들어오는 주간 정산금을 두 배로 받습니다. 해지하면 다음 정산부터 원래대로입니다.',
    perks: ['팔로워 정산금 2배', '해지는 언제든 가능'],
  },
]

export function findSubscription(id: string): Subscription | undefined {
  return SUBSCRIPTIONS.find((s) => s.id === id)
}
