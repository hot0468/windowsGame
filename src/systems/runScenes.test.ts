import { describe, it, expect } from 'vitest'
import { ACTIVITIES, WORK_ACTIVITIES, findActivity } from '../data/activities'
import { SCENE_ACTIVITY_IDS, runSceneOf } from '../data/runScenes'
import { TOOL_STEPS } from '../data/gigs'

/**
 * ⚠️ **연출이 깨뜨릴 수 있는 것만 덮는다.** 이 축은 턴·스탯·돈을 하나도 안 만들므로
 * (결과는 창이 열리기 전에 `doActivity`가 끝낸다) 규칙을 뒤집는 증명은 붙이지 않는다.
 * 대신 **조용히 사라지는 것**을 잡는다: 장면 없는 알바, 서로 다른 단계 수, 빈 문구.
 */
describe('실행 연출 장면', () => {
  it('⚠️ 알바 4종에 전부 장면이 있다 — 하나만 빠지면 그 알바만 조용히 바로 끝난다', () => {
    for (const a of WORK_ACTIVITIES) {
      expect(runSceneOf(a), `${a.id}에 장면이 없다`).toBeDefined()
    }
  })

  it('⚠️ 도구와 알바의 단계 수가 전부 같다 — 다르면 같은 1턴인데 더 오래 걸려 보인다', () => {
    const scenes = [...SCENE_ACTIVITY_IDS.map((id) => runSceneOf(findActivity(id)!)!)]
    const lengths = new Set([
      ...scenes.map((s) => s.steps.length),
      ...Object.values(TOOL_STEPS).map((s) => s.length),
    ])
    expect(lengths.size, `단계 수가 갈린다: ${[...lengths].join(',')}`).toBe(1)
  })

  it('문구가 비어 있지 않고 장면 안에서 겹치지 않는다', () => {
    for (const id of SCENE_ACTIVITY_IDS) {
      const scene = runSceneOf(findActivity(id)!)!
      expect(scene.steps.length).toBeGreaterThan(0)
      // 같은 문구가 두 번 나오면 진행이 멈춘 것처럼 보인다.
      expect(new Set(scene.steps).size).toBe(scene.steps.length)
      expect(scene.title.length).toBeGreaterThan(0)
    }
  })

  it('⚠️ 알바 넷의 액센트가 서로 다르다 — 같으면 훑을 때 네 일이 한 일로 읽힌다', () => {
    const accents = WORK_ACTIVITIES.map((a) => runSceneOf(a)!.accent)
    expect(new Set(accents).size).toBe(accents.length)
  })

  it('⚠️ 장면이 없는 활동은 undefined다 — 모든 활동에 2.5초를 붙이면 연출이 통행세가 된다', () => {
    const plain = ACTIVITIES.filter((a) => !a.toolId && !SCENE_ACTIVITY_IDS.includes(a.id))
    expect(plain.length).toBeGreaterThan(0)
    for (const a of plain) expect(runSceneOf(a)).toBeUndefined()
  })
})
