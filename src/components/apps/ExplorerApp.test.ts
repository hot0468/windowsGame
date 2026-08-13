import { describe, expect, it } from 'vitest'
import { entriesOf } from './ExplorerApp'
import { TRASH_FILES } from '../../data/trash'
import { findItem } from '../../data/items'
import { createInitialState } from '../../systems/turn'

/**
 * ⚠️ **휴지통이 지키는 것은 하나다: 부서진 것과 판 것은 다르다.**
 *
 * `broken`과 `sold`는 둘 다 "다시 받아도 효과가 없다"의 근거라 섞기 쉬운데, 뜻은
 * 정반대다 — 판 물건은 남의 손에 있지 버려진 것이 아니다. 한 목록에 섞이면 나중에
 * 왜 거기 있는지 아무도 답할 수 없으므로, 그 경계를 여기서 못 박는다.
 */
describe('휴지통', () => {
  const item = findItem('pen-tablet')!

  it('고장 난 장비가 들어온다 — 지금까지 잔해가 남던 자리가 없었다', () => {
    const s = { ...createInitialState('휴지'), broken: ['pen-tablet'] }
    expect(entriesOf('trash', s).map((e) => e.name)).toContain(item.name)
  })

  it('판 물건은 안 들어온다 — 판 것은 버린 것이 아니다', () => {
    const s = { ...createInitialState('휴지'), sold: ['pen-tablet'] }
    expect(entriesOf('trash', s).map((e) => e.name)).not.toContain(item.name)
  })

  it('아무것도 안 부서졌어도 고정 파일은 남는다', () => {
    const names = entriesOf('trash', createInitialState('휴지')).map((e) => e.name)
    expect(names).toEqual(TRASH_FILES.map((f) => f.name))
  })
})
