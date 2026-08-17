import { describe, expect, it } from 'vitest'
import { entriesOf } from './ExplorerApp'
import { TRASH_FILES } from '../../data/trash'
import { findItem } from '../../data/items'
import { EVENTS } from '../../data/events'
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

/* 사진첩. 지키는 것: **겪은 것만 들어온다** — 안 겪은 사건이 새면 안 한 일을 한 것처럼 읽힌다. */
describe('사진첩', () => {
  it('안 겪은 사건은 목록에 없고, 겪으면 들어온다', () => {
    const s = createInitialState('도감')
    const first = EVENTS[0]
    expect(entriesOf('codex', s)).toEqual([])
    expect(entriesOf('codex', { ...s, events: [{ id: first.id, day: 1 }] }).map((e) => e.name)).toEqual([
      first.name,
    ])
  })
})

/* 숨김 파일(2026-08-17). 지키는 것: **토글 없이는 절대 안 보인다** — 기본 목록에 새면
   이스터에그가 아니라 그냥 파일이고, 찾는 재미가 사라진다. */
describe('숨김 파일', () => {
  it('기본 목록에는 없고, 숨긴 항목을 켜면 붙는다', () => {
    const s = createInitialState('숨김')
    for (const folder of ['inventory', 'codex', 'trash'] as const) {
      expect(entriesOf(folder, s).some((e) => e.hidden)).toBe(false)
    }
    expect(entriesOf('trash', s, true).some((e) => e.hidden)).toBe(true)
  })
})
