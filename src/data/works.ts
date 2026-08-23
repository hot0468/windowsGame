import type { Stats } from '../types/game'

/**
 * 작업물 — **도구 넷이 남기는 결과물**(2026-08-22 설계자 지시).
 *
 * ## 이 게임에 없던 것
 * 여태 도구(VS 코드·포토샵·프리미어·오디션)를 켜면 **일감의 업무량 숫자만 올랐다.** 켜도
 * 남는 것이 없으니 일감이 없으면 켤 이유도 없었고, 클립스튜디오만 그림을 남겼다.
 * 작업물은 그 자리를 메운다: 도구를 켜면 **파일이 하나 생기고, 그 파일에 등급이 붙는다.**
 *
 * ## ⚠️ 그림(`data/artworks.ts`)과 다른 축이다
 * 그림은 **그릴 때의 스탯을 박아 두고 등급을 매번 계산**한다(그래서 나중에 못 고친다).
 * 작업물은 반대로 **등급과 진척을 상태로 들고**, 보강할 때마다 올라간다 — "보강해서 등급을
 * 올린다"가 이 시스템의 전부라 저장하지 않으면 성립하지 않는다.
 * ⚠️ **둘을 합치지 말 것**: 그림은 공모전·회지·트위터·웹툰이 이미 물고 있어서 등급이
 * 나중에 변하면 그 넷의 "낸 시점의 사실" 규칙이 전부 깨진다.
 *
 * ## 눈금은 스탯 등급과 같다
 * F·C·B·A·S·SS(`systems/rank.ts`) — "예술 A"와 "A등급 작업물"이 한 화면에 나오므로
 * 두 척도를 두면 아무도 못 읽는다(그림 등급과 같은 판단).
 */

/** 작업물을 만드는 도구. `Activity.toolId`와 **같은 문자열**이다. */
export const WORK_TOOLS = ['vscode', 'photoshop', 'premiere', 'audition'] as const
export type WorkTool = (typeof WORK_TOOLS)[number]

export interface WorkKind {
  tool: WorkTool
  /** 목록에 뜨는 이름("웹 페이지", "포스터"…). */
  label: string
  /** 파일 확장자. 도구가 다르면 파일도 달라야 "다른 것을 만들었다"가 읽힌다. */
  ext: string
  /**
   * 등급과 상승률을 정하는 스탯.
   *
   * ⚠️ **둘씩 보는 것이 규칙이다**(그림이 예술+창의력을 함께 보는 것과 같은 이유) —
   * 하나만 보면 그 스탯을 올리는 활동 하나를 도배하는 것이 유일한 최적해가 된다.
   */
  stats: [keyof Stats, keyof Stats]
}

export const WORK_KINDS: Record<WorkTool, WorkKind> = {
  vscode: { tool: 'vscode', label: '웹 페이지', ext: 'tsx', stats: ['tech', 'knowledge'] },
  photoshop: { tool: 'photoshop', label: '포스터', ext: 'psd', stats: ['art', 'creativity'] },
  premiere: { tool: 'premiere', label: '영상', ext: 'prproj', stats: ['creativity', 'sensitivity'] },
  audition: { tool: 'audition', label: '음원', ext: 'wav', stats: ['music', 'sensitivity'] },
}

/**
 * 등급 판정의 기준값. **상한 999가 아니라 300이다** — 999로 재면 100일 판에서
 * 아무도 S를 못 본다(그림 `ART_MASTERY`와 같은 값·같은 이유).
 */
export const WORK_MASTERY = 300

/**
 * 보강 한 번의 진척(0~1). **스탯이 0이어도 채워지긴 한다.**
 *
 * ⚠️ 0이면 초보자는 게이지가 영영 안 차서 도구가 잠긴 것과 같아진다 — 못하는 사람은
 * **느린 것**이지 못 하는 것이 아니어야 한다(다섯 번이면 한 등급).
 */
export const BASE_GAIN = 0.2

/**
 * 스탯이 상한(`WORK_MASTERY`)일 때 `BASE_GAIN`에 더해지는 몫.
 *
 * ⚠️ 합이 1을 넘지 않게 둔다(0.2 + 0.5 = 0.7) — 한 번에 한 등급이 오르면 게이지가
 * 장식이 되고, 일감의 "기간 안에 채운다"도 뜻을 잃는다.
 */
export const SKILL_GAIN = 0.5

/** 작업물 파일 이름. 등급은 이름에 안 박는다 — **등급이 나중에 오르기 때문**이다. */
export function workTitle(tool: WorkTool, serial: number): string {
  return `${WORK_KINDS[tool].label}_${String(serial).padStart(3, '0')}`
}
