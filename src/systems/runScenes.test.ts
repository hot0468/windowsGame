import { describe, it, expect } from 'vitest'
import { ACTIVITIES, WORK_ACTIVITIES, findActivity } from '../data/activities'
import { SCENE_ACTIVITY_IDS, runSceneOf } from '../data/runScenes'
import { TOOL_STEPS } from '../data/gigs'
import { windowChrome } from '../components/window/appForWindow'

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

describe('활동별 그림 (2026-08-14)', () => {
  /* ⚠️ **`look`과 다른 축이다** — 그전에는 그림이 판에 딸려 있어 어두운 판의 활동이
     전부 같은 막대였다(달리기·작곡·외주 개발이 화면에서 구분이 안 됐다). */
  it('그림이 붙은 활동은 서로 다른 그림을 갖는다', () => {
    const arts = new Map<string, string>()
    for (const a of ACTIVITIES) {
      const art = runSceneOf(a)?.art
      if (art) arts.set(a.id, art)
    }
    expect(arts.size).toBeGreaterThan(0)
    // 몸·손·소리·코드·숫자 — 갈래가 실제로 갈려 있어야 그림을 나눈 뜻이 산다.
    expect(new Set(arts.values()).size).toBeGreaterThan(1)
  })

  it('그림은 정해진 여덟 중 하나다 — CSS가 없는 값을 쓰면 빈 판이 된다', () => {
    const known = new Set(['run', 'brush', 'wave', 'code', 'chart', 'stage', 'hands', 'steam'])
    for (const a of ACTIVITIES) {
      const art = runSceneOf(a)?.art
      if (art) expect(known, `${a.id}`).toContain(art)
    }
  })

  /* 종이 판은 책장이 이미 그 자리를 쓴다 — 둘이 겹치면 무엇이 그려질지 알 수 없다. */
  it('종이 판에는 따로 그림을 붙이지 않는다', () => {
    for (const a of ACTIVITIES) {
      const scene = runSceneOf(a)
      if (scene?.look === 'paper') expect(scene.art, `${a.id}`).toBeUndefined()
    }
  })
})

describe('종이 판 (책상에 앉아 읽고 쓰는 일)', () => {
  /*
   * ⚠️ **셋이 한 몸이다**: 밝은 판 · 책장 그림 · 닫기 버튼 없는 시스템 팝업.
   * `look` 하나가 셋을 함께 정하므로, 창 크롬이 그 값을 안 보면 어두운 타이틀 바 아래
   * 흰 종이가 붙어 창이 위아래로 갈린다(2026-08-09 설계자 지시로 만든 규칙).
   */
  /* ⚠️ **2026-08-14에 셋으로 늘었다**(독서 추가). 갈래로 가르지 않는 이유는
     `PAPER_IDS` 주석에 있다 — 독서는 여가이고 공부는 학습인데 화면에서는 같은 일이다.
     경제 공부는 차트 그림을 쓰므로 여기 없다(그림과 판이 겹치면 안 된다). */
  it('읽고 쓰는 활동만 종이 판이고 나머지는 기본 판이다', () => {
    const paperIds = new Set(['study', 'writing', 'reading'])
    for (const a of ACTIVITIES) {
      const scene = runSceneOf(a)
      if (!scene) continue
      expect(scene.look === 'paper', `${a.id}`).toBe(paperIds.has(a.id))
    }
  })

  it('종이 판이면 창 프레임도 밝다 — 한쪽만 바꾸면 창이 갈린다', () => {
    const paper = runSceneOf(findActivity('study')!)!
    const dark = runSceneOf(findActivity('tool-photoshop')!)!
    expect(windowChrome({ kind: 'tool', toolRun: { look: paper.look } as never }).dark).toBe(false)
    expect(windowChrome({ kind: 'tool', toolRun: { look: dark.look } as never }).dark).toBe(true)
  })
})
