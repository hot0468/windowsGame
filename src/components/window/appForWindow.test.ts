import { describe, it, expect } from 'vitest'
import { EXCLUDED_KINDS, WINDOW_APP_KINDS } from './appForWindow'
import type { WindowKind } from '../../types/game'

/**
 * ⚠️ **이 파일이 "kind 분기가 두 벌이 되지 않는다"를 코드로 지키는 장치다.**
 *
 * 데스크톱 셸(`WindowManager`)과 모바일 셸(`MobileAppView`)이 같은 `appForWindow`를
 * 부르므로 분기 자체는 하나다. 남은 위험은 **새 `WindowKind`를 추가하고 분기에는
 * 안 넣는 것**이다 — 그러면 두 셸 모두에서 빈 창이 뜨고, 빌드도 다른 테스트도
 * 조용히 통과한다. 여기서 `WindowKind` 전체를 순회해 그것을 막는다.
 *
 * ⚠️ **이 테스트를 느슨하게 고쳐서 통과시키지 말 것.** 여기서 터졌다는 것은
 * `appForWindow`에 case를 추가하든지(창으로 열리는 kind), `EXCLUDED_KINDS`에
 * 사유를 적든지(창이 아닌 kind) 둘 중 하나를 해야 한다는 뜻이다.
 */

/**
 * `WindowKind` 전체 목록.
 *
 * ⚠️ 타입에서 값을 뽑을 수 없으므로 여기 손으로 적되, `satisfies`로 오타를 막고
 * 아래 테스트가 "분기 + 제외 = 여기"를 양방향으로 확인한다. kind를 늘리면
 * 이 배열에도 추가해야 하고, 그 순간 분기 누락이 드러난다.
 */
const ALL_KINDS = [
  'exe',
  'ending',
  'stub',
  'browser',
  'chat',
  'thread',
  'mail',
  'save',
  'taskmgr',
  'cmd',
  'solitaire',
  'steam',
  'settings',
  'callcenter',
  'wish',
  'drive',
  'folder',
  'scheduler',
  'autolog',
  'tool',
  'clipstudio',
  'excel',
] as const satisfies readonly WindowKind[]

/*
 * ⚠️ **역방향까지 컴파일 타임에 못 박는다.**
 * `satisfies readonly WindowKind[]`는 "적힌 값이 전부 유효한 kind인가"만 본다 —
 * `WindowKind`에 새 kind를 더하고 위 배열에 안 적으면 **아래 테스트가 전부 통과한다**
 * (검사의 기준 자체가 그 배열이므로). 그러면 kind 분기 누락을 잡으려고 만든 장치가
 * 정작 새 kind에 침묵한다. 이 한 줄은 배열이 유니온을 다 덮지 못하면 `never`가 아닌
 * 타입이 남아 **`npm run build`(tsc -b)가 실패한다**.
 */
type Uncovered = Exclude<WindowKind, (typeof ALL_KINDS)[number]>
const _allKindsCoverUnion: Uncovered extends never ? true : never = true
void _allKindsCoverUnion

describe('appForWindow — kind 분기 누락 방지', () => {
  it('모든 WindowKind는 분기에 있거나, 사유와 함께 제외되어 있다', () => {
    const covered = new Set<string>([...WINDOW_APP_KINDS, ...Object.keys(EXCLUDED_KINDS)])
    const missing = ALL_KINDS.filter((k) => !covered.has(k))
    expect(missing).toEqual([])
  })

  it('분기와 제외 목록이 겹치지 않는다 — 한 kind는 한쪽에만 속한다', () => {
    const excluded = Object.keys(EXCLUDED_KINDS)
    const overlap = WINDOW_APP_KINDS.filter((k) => excluded.includes(k))
    expect(overlap).toEqual([])
  })

  it('분기·제외 목록에 WindowKind가 아닌 값이 섞이지 않았다', () => {
    const all = new Set<string>(ALL_KINDS)
    const strays = [...WINDOW_APP_KINDS, ...Object.keys(EXCLUDED_KINDS)].filter(
      (k) => !all.has(k),
    )
    expect(strays).toEqual([])
  })

  it('제외된 kind에는 반드시 사유가 적혀 있다', () => {
    for (const [kind, reason] of Object.entries(EXCLUDED_KINDS)) {
      expect(reason, `${kind}의 제외 사유`).toBeTruthy()
    }
  })
})
