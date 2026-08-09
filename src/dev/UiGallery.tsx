import { useEffect, useState } from 'react'
import { ACTIVITIES } from '../data/activities'
import { runSceneOf } from '../data/runScenes'
import { Daybreak } from '../components/desktop/Daybreak'
import { ToolRun } from '../components/apps/ToolRun'
import { Window } from '../components/window/Window'
import { useGameStore } from '../store/gameStore'
import { RANK_ORDER, RANK_THRESHOLDS } from '../systems/rank'
import { createInitialState, growthCap } from '../systems/turn'
import type { StatRank } from '../systems/rank'
import type { Activity, Stats, ToolRunPayload } from '../types/game'
import './UiGallery.css'

/**
 * UI 견본 화면 — **개발용이고 게임의 일부가 아니다.**
 *
 * ## 어떻게 여나
 * `npm run dev` 뒤 주소에 `?ui`를 붙인다. 배포 빌드에서는 `import.meta.env.DEV`가 거짓이라
 * 이 화면으로 갈 길이 없다(`App.tsx`).
 *
 * ## ⚠️ 진짜 세이브를 건드리지 않는다
 * 여기서는 스탯을 마음대로 심어야 등급 상승 같은 순간을 재현할 수 있는데, `gameStore`는
 * localStorage에 자동 저장된다. 그래서 **저장 키부터 미리보기용으로 갈아 끼운 뒤**에
 * 판을 심는다(`persist.setOptions`) — 이 화면에서 무엇을 하든 `windows-game-save`는
 * 그대로다. 이 한 줄이 이 파일에서 제일 중요하다.
 *
 * ## ⚠️ 진짜 컴포넌트만 그린다
 * 견본용으로 마크업을 베껴 두면 본체가 바뀌었을 때 견본만 낡아 **거짓말하는 도감**이 된다.
 * 장면 문구·단계 수도 `data/runScenes.ts`에서 그대로 읽는다.
 */

/** 미리보기 전용 저장 키. 진짜 세이브(`windows-game-save`)와 갈라 둔다. */
const PREVIEW_KEY = 'windows-game-ui-preview'

/** 등급 상승을 재현할 때 쓰는 스탯. */
const DEMO_STAT = 'knowledge' as const

/** 장면이 있는 활동 전부(도구 4 + 알바 4 + 공부 2). 목록을 여기 옮겨 적지 않는다. */
const SCENED: Activity[] = ACTIVITIES.filter((a) => runSceneOf(a) !== undefined)

/** 결과 판에 적히는 상승분. 이만큼 되돌린 값이 직전 등급이어야 상승으로 보인다. */
const GAIN = 6

/** 그 등급에 **막 올라선** 값. `GAIN`만큼 빼면 직전 등급으로 떨어지도록 잡는다. */
function justReached(rank: StatRank): number {
  const min = RANK_THRESHOLDS.find((t) => t.rank === rank)!.min
  return Math.ceil(min * growthCap(DEMO_STAT)) + 1
}

function payloadFor(activity: Activity, rankUp: StatRank | ''): ToolRunPayload {
  const scene = runSceneOf(activity)!
  return {
    toolId: activity.toolId,
    title: scene.title,
    steps: scene.steps,
    accent: scene.accent,
    look: scene.look,
    /* 등급 상승을 보려면 **오른 스탯이 그 줄에 있어야** 한다 — 없으면 게이지가 안 그려진다. */
    rows: rankUp
      ? [
          { key: DEMO_STAT, value: GAIN },
          { key: 'stamina', value: -15 },
        ]
      : Object.entries(activity.effects).map(([key, value]) => ({
          key: key as keyof Stats,
          value: value as number,
        })),
    mentalPenalty: 0,
    earned: 0,
  }
}

/** 주소로 첫 장면을 고를 수 있다(`?ui&scene=tool-photoshop`) — 견본 링크를 주고받게. */
function initialScene(): string {
  const want = new URLSearchParams(window.location.search).get('scene')
  return SCENED.some((a) => a.id === want) ? want! : SCENED[0].id
}

export function UiGallery() {
  const [activityId, setActivityId] = useState(initialScene)
  const [rankUp, setRankUp] = useState<StatRank | ''>('C')
  /** 재생할 때마다 올린다. `key`가 바뀌면 새로 마운트돼 연출이 처음부터 돈다. */
  const [take, setTake] = useState(0)
  const [stageOn, setStageOn] = useState(false)
  /**
   * 미리보기 판을 심었는가.
   *
   * ⚠️ **`Daybreak`를 이 뒤에 붙이려고 있는 값이다.** 진짜 세이브가 있으면 스토어가
   * 그 날짜로 되살아난 채 첫 렌더가 돌고, 곧바로 미리보기 판(1일차)을 심으면 `Daybreak`가
   * 그 차이를 **날이 밝은 것**으로 읽어 견본 화면을 통째로 덮는다(실측으로 잡았다).
   * 심은 **뒤에** 마운트되면 그 판의 1일차가 첫 렌더라 아무 일도 안 일어난다.
   */
  const [seeded, setSeeded] = useState(false)
  const ready = useGameStore((s) => s.state !== null)

  useEffect(() => {
    // ⚠️ 순서가 중요하다: 저장 키를 먼저 갈아 끼우고 나서 판을 심는다.
    useGameStore.persist.setOptions({ name: PREVIEW_KEY })
    useGameStore.setState({ loggedIn: true, state: createInitialState('미리보기') })
    setSeeded(true)
  }, [])

  /* 게이지는 **실제 스탯**을 읽으므로(`ToolRun`의 `Gauge`), 등급 상승을 보려면 스탯이
     문턱 바로 위에 있어야 한다. 재생할 때마다 다시 심는다 — 한 번 실행하면 값이 오른다. */
  useEffect(() => {
    const state = useGameStore.getState().state
    if (!state) return
    const value = rankUp ? justReached(rankUp) : 300
    useGameStore.setState({ state: { ...state, stats: { ...state.stats, [DEMO_STAT]: value } } })
  }, [rankUp, take])

  const activity = SCENED.find((a) => a.id === activityId)!
  const scene = runSceneOf(activity)!
  const payload = payloadFor(activity, rankUp)
  const popup = scene.look === 'paper'

  return (
    <div className="ug">
      <header className="ug-head">
        <h1 className="ug-title">UI 견본</h1>
        <p className="ug-lede">
          개발용 화면입니다. 진짜 컴포넌트를 그대로 그리고, 저장은 <code>{PREVIEW_KEY}</code>로
          갈라 두어 <strong>게임 세이브를 건드리지 않습니다.</strong>
        </p>
      </header>

      <section className="ug-section">
        <h2 className="ug-h2">실행 연출 · 결과 판 · 등급 상승</h2>
        <p className="ug-note">
          장면 문구와 단계 수는 <code>data/runScenes.ts</code>에서 그대로 읽습니다. 종이 판
          장면(공부 둘)은 헤더 없는 시스템 팝업 + 전체 화면 딤으로 뜹니다.
        </p>

        <div className="ug-controls">
          <label className="ug-field">
            <span>장면</span>
            <select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              {SCENED.map((a) => {
                const s = runSceneOf(a)!
                return (
                  <option key={a.id} value={a.id}>
                    {s.title} — {s.accent}
                    {s.look === 'paper' ? ' (종이)' : ''}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="ug-field">
            <span>등급 상승</span>
            <select value={rankUp} onChange={(e) => setRankUp(e.target.value as StatRank | '')}>
              <option value="">없음 (활동 실제 효과)</option>
              {RANK_ORDER.filter((r) => r !== 'F').map((r) => (
                <option key={r} value={r}>
                  지식 → {r} 등급
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ug-btn"
            disabled={!ready}
            onClick={() => {
              setTake((t) => t + 1)
              setStageOn(true)
            }}
          >
            재생
          </button>
          {stageOn && (
            <button type="button" className="ug-btn ug-btn-ghost" onClick={() => setStageOn(false)}>
              닫기
            </button>
          )}
        </div>

        {/* ⚠️ 무대는 `position: relative`다 — 일반 창은 absolute라 여기 안에 앉고,
            시스템 팝업은 fixed라 화면 가운데로 떠오른다(게임에서와 같은 동작). */}
        <div className="ug-stage">
          {stageOn && ready ? (
            <>
              {popup && <div className="win-scrim" style={{ zIndex: 40 }} />}
              <Window
                key={take}
                id="ui-preview"
                title={scene.title}
                icon={scene.icon}
                x={24}
                y={24}
                width={460}
                zIndex={41}
                popup={popup}
                dark={!popup}
                onClose={popup ? undefined : () => setStageOn(false)}
              >
                <ToolRun key={take} payload={payload} onClose={() => setStageOn(false)} />
              </Window>
            </>
          ) : (
            <p className="ug-empty">[재생]을 누르면 여기에 뜹니다.</p>
          )}
        </div>
      </section>

      <section className="ug-section">
        <h2 className="ug-h2">날 밝음</h2>
        <p className="ug-note">
          날짜가 바뀌면 2.6초 덮었다 사라집니다. ⚠️ 실행 연출·시스템 팝업이 떠 있으면 그것이
          닫힐 때까지 기다립니다 — 위에서 종이 장면을 띄워 둔 채로 눌러 보세요.
        </p>
        <button
          type="button"
          className="ug-btn"
          disabled={!ready}
          onClick={() => {
            const state = useGameStore.getState().state
            if (state) useGameStore.setState({ state: { ...state, day: state.day + 1 } })
          }}
        >
          하루 넘기기
        </button>
        {seeded && <Daybreak />}
      </section>
    </div>
  )
}
