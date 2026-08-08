import { ART_MASTERY, TOOL_BONUS, artTitle } from '../data/artworks'
import { rankOfRatio } from './rank'
import type { StatRank } from './rank'
import type { Artwork, GameState } from '../types/game'

/**
 * 그림(클립스튜디오)의 규칙.
 *
 * ## 등급은 저장하지 않고 매번 계산한다
 * `Artwork`가 들고 있는 것은 **그릴 때의 사실**(예술·창의력·장비)뿐이다. 등급을 박아 두면
 * 기준(`ART_MASTERY`)을 손봤을 때 옛 그림만 낡은 등급을 들고 있게 되고, 반대로 사실을
 * 저장하지 않으면 스탯이 오를 때마다 **이미 그린 그림이 저절로 명작이 된다**
 * (`ExamRecord`가 판정 결과를, `TermDeposit`이 가입 시점 이율을 박아 두는 것과 같은 판단).
 *
 * ## 왜 예술 하나가 아니라 창의력과 함께 보는가
 * 예술만 보면 `draw`를 반복하는 것이 유일한 최적해가 된다. 창의력은 독서·영화·글쓰기로도
 * 오르므로, 둘을 함께 보면 **다른 활동이 그림 등급으로 흘러 들어온다** — 한 활동을
 * 도배하는 것보다 섞는 편이 낫게 만드는 장치다.
 */

/** 그림 한 장의 실력 비율(0~1). 등급·팔로워가 전부 이 값에서 나온다. */
export function artRatio(work: Pick<Artwork, 'art' | 'creativity' | 'tool'>): number {
  const skill = (work.art + work.creativity) / (2 * ART_MASTERY)
  const ratio = skill + (TOOL_BONUS[work.tool] ?? 0)
  return Math.min(1, Math.max(0, ratio))
}

/**
 * 그림 등급. **스탯 등급과 같은 척도다**(`rankOfRatio`) — 화면에 "A등급 그림"과
 * "예술 A"가 나란히 뜨므로 두 척도가 갈리면 아무도 못 읽는다.
 */
export function artGrade(work: Pick<Artwork, 'art' | 'creativity' | 'tool'>): StatRank {
  return rankOfRatio(artRatio(work))
}

/** 갤러리에 담긴 그림. 없으면 빈 배열이다(`inventoryOf`와 같은 규칙). */
export function artworksOf(state: GameState): Artwork[] {
  return state.artworks ?? []
}

export function findArtwork(state: GameState, id: string): Artwork | undefined {
  return artworksOf(state).find((a) => a.id === id)
}

/** 그림 파일 이름. 등급이 이름에 박혀 있어 갤러리 목록에서 정렬·검색이 그대로 된다. */
export function artFileName(work: Artwork): string {
  return `${artTitle(work.serial)}_${artGrade(work)}`
}
