import { describe, expect, it } from 'vitest'
import { DESKTOP_ITEMS } from './desktopItems'
import { TOUR_STEPS } from './tour'

/**
 * ⚠️ **이 변경이 깨뜨릴 수 있는 것만 덮는다.** 문구가 좋은지·순서가 자연스러운지는
 * 테스트가 판정할 수 있는 것이 아니다. 여기서 지키는 것은 하나뿐이다:
 * **투어가 화면에 없는 것을 가리키지 않는다.**
 */
describe('첫 실행 안내 투어', () => {
  it('단계 id가 유일하다', () => {
    const ids = TOUR_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 단계가 가리킬 대상을 갖는다', () => {
    for (const step of TOUR_STEPS) {
      expect(step.target.trim(), `${step.id}의 target이 비어 있다`).not.toBe('')
    }
  })

  /*
   * 바탕화면 아이콘을 가리키는 단계들. 조건부 항목(포토샵·갤러리·너아무튼온)을 가리키면
   * 타블렛을 사기 전까지 그 아이콘이 아예 없어서 **구멍 없는 단계**가 된다.
   * ⚠️ 목록을 여기 적어 두는 이유: `find`가 undefined일 때 조용히 통과하면 id가 바뀌어도
   * 아무도 모른다. 양방향(투어에 있나 / 바탕화면에 있나)을 함께 본다.
   */
  it('바탕화면을 가리키는 단계는 조건 없는 항목만 가리킨다', () => {
    for (const target of ['browser', 'kakao', 'vscode', 'ledger']) {
      expect(TOUR_STEPS.some((s) => s.target === target), `${target} 단계가 없다`).toBe(true)
      const item = DESKTOP_ITEMS.find((i) => i.id === target)
      expect(item, `${target}이 바탕화면에 없다`).toBeDefined()
      expect(item!.requiresItem, `${target}에 아이템 조건이 붙었다`).toBeUndefined()
      expect(item!.requiresEmployment, `${target}에 재직 조건이 붙었다`).toBeFalsy()
      expect(item!.requiresSubscription, `${target}에 구독 조건이 붙었다`).toBeUndefined()
    }
  })

  /*
   * ⚠️ **규칙이 바뀌면 투어부터 낡는다**(2026-08-22 시간 구조·물가·반복 페널티 전환).
   * 문구가 좋은지는 못 재지만 **폐지된 규칙을 아직 말하고 있는지**는 잴 수 있다.
   */
  it('폐지된 규칙을 말하지 않는다 — 슬롯·반나절·주기적 물가 인상', () => {
    const all = TOUR_STEPS.map((s) => `${s.title} ${s.text}`).join(' ')
    for (const dead of ['오전과 오후', '반나절', '물가 인상', '효율']) {
      expect(all, `투어가 폐지된 말을 쓴다: ${dead}`).not.toContain(dead)
    }
  })
})
