import { PHONE_BONUS, PHONE_FEE, PHONE_ID, PHONE_STAT } from '../data/items'
import { BILLING_INTERVAL_DAYS } from '../data/subscriptions'
import { clampStats, inventoryOf, owns, settleGameOver } from './turn'
import type { GameState, GrowthStatKey } from '../types/game'

/**
 * 휴대폰 — **가지고 있는 동안 친화력이 잘 오르고, 달마다 요금이 나간다.**
 *
 * ## ⚠️ 구독으로 만들지 않았다
 * 어도비·트위터 플러스는 **끊을 수 있는 것**이고 화면(결제 페이지)이 딸린다. 휴대폰은
 * 하이마루에서 산 물건이라 끊는다는 말이 성립하지 않고, 구독으로 옮기면 하이마루에
 * 결제 화면을 하나 더 만들어야 한다. **청구 주기만 구독과 같은 상수를 쓴다**
 * (`BILLING_INTERVAL_DAYS`) — 한 판 안에서 "한 달"이 두 값이면 안 된다.
 *
 * ## ⚠️ 외상을 만들지 않는다 — 못 내면 정지된다
 * 구독과 정확히 같은 규칙이다. 잔액이 모자랄 때 그냥 빼면 소지금이 음수가 되어 파산
 * 판정(`money <= 0`)이 흐려진다. 대신 **인벤토리에서 빠진다** — 그러면 친화력 보너스가
 * 사라지므로 못 낸 사실이 화면에 드러나고, 다시 사면 그만이다(장비 고장과 같은 자리).
 *
 * ## ⚠️ 청구 커서를 세이브에 새로 두지 않았다
 * 산 날은 이미 인벤토리가 갖고 있다(`InventoryItem.day`). 마지막 청구일만 `phoneBilledDay`로
 * 남기고, 없으면 산 날을 기준으로 센다 — 옛 세이브가 그대로 살아난다.
 */

/** 휴대폰을 산 날. 없으면 undefined. */
function boughtDay(state: GameState): number | undefined {
  return inventoryOf(state).find((i) => i.id === PHONE_ID)?.day
}

/** 마지막으로 요금을 낸 날(처음이면 산 날). */
export function lastBilledDay(state: GameState): number | undefined {
  return state.phoneBilledDay ?? boughtDay(state)
}

/** 다음 청구까지 남은 날. 휴대폰이 없으면 undefined. */
export function daysToPhoneBill(state: GameState): number | undefined {
  const last = lastBilledDay(state)
  if (last === undefined) return undefined
  return Math.max(0, last + BILLING_INTERVAL_DAYS - state.day)
}

/**
 * 그 스탯 상승분에 휴대폰이 얹어 주는 비율. **친화력에만** 붙는다.
 *
 * ⚠️ **옷 보너스와 겹쳐 쌓인다**(둘은 서로 다른 것을 본다) — `applyEffects`가 둘을 더해
 * 하나의 비율로 쓰므로, 화면(`activityPreview.ts`)도 **같은 함수로 더해야** 미리보기와
 * 실제가 갈리지 않는다.
 */
export function phoneBonusFor(state: GameState, key: GrowthStatKey): number {
  return key === PHONE_STAT && owns(state, PHONE_ID) ? PHONE_BONUS : 0
}

/**
 * 밤 정산에서 요금을 낸다. **구독 청구와 같은 자리에서 돈다.**
 *
 * ⚠️ 며칠이 한 번에 흐르면(자동 진행) 밀린 달을 **차례로** 따라잡는다 —
 * 한 번만 빼면 잠자코 넘어간 달이 공짜가 된다(`advanceSubscriptions`와 같은 규칙).
 */
export function advancePhoneBill(state: GameState): GameState {
  if (!owns(state, PHONE_ID)) return state
  let next = state
  for (;;) {
    const last = lastBilledDay(next)
    if (last === undefined || next.day < last + BILLING_INTERVAL_DAYS) return next
    const due = last + BILLING_INTERVAL_DAYS
    /* ⚠️ 잔액이 요금과 같아도 막는다: 소지금을 0으로 만드는 결제는 그날 밤 파산이다
       (`subscribe`와 같은 판정). 그때는 정지시키고 루프를 끝낸다. */
    if (next.stats.money - PHONE_FEE <= 0) {
      return {
        ...next,
        inventory: inventoryOf(next).filter((i) => i.id !== PHONE_ID),
        phoneBilledDay: undefined,
        suspendedPhone: true,
      }
    }
    next = settleGameOver({
      ...next,
      stats: clampStats({ ...next.stats, money: next.stats.money - PHONE_FEE }),
      phoneBilledDay: due,
    })
  }
}

/**
 * 요금 소식. **저장하지 않고 매번 만든다**(`gearMessages`와 같은 자리) —
 * 사실(`suspendedPhone`)만 남기고 문장은 여기서 만든다.
 *
 * ⚠️ **새 알림 창구를 만들지 않는다**: 아웃룩을 그대로 탄다.
 */
export function phoneMessages(
  state: GameState,
): { id: string; channel: string; from: string; subject: string; text: string }[] {
  if (!state.suspendedPhone) return []
  return [
    {
      id: 'phone-suspended',
      channel: 'outlook',
      from: '하이마루 모바일',
      subject: '[안내] 이용정지 처리되었습니다',
      text: `요금 ${PHONE_FEE.toLocaleString('ko-KR')}원이 미납되어 회선이 정지되었습니다. 기기는 회수되었고, 재개통은 신규 가입으로만 가능합니다. 저장해 두신 연락처는 저희가 보관하지 않습니다.`,
    },
  ]
}

export { PHONE_FEE, PHONE_ID, PHONE_STAT }
