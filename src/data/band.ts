/**
 * 밴드 — **음악 스탯이 A에 닿으면 붙는 두 번째 축.**
 *
 * ## 왜 만들었나
 * 음악은 올릴 곳(작곡·공연 관람)은 있는데 **쓸 곳이 음원 공모전 하나뿐인 막다른 스탯**이었다
 * (2026-08-08 설계자 지적). 그몽 오디션 일감이 "돈으로 쓰는 길"이라면 밴드는 "사람으로 쓰는
 * 길"이다 — 혼자 하던 일이 팀이 되고, 팀에는 혼자서는 못 만드는 숙련도가 쌓인다.
 *
 * ## ⚠️ 숙련도는 밴드가 갖고 스탯이 아니다
 * `music`은 **내 실력**이고 `band.skill`은 **이 팀의 합**이다. 스탯으로 만들면 밴드를 그만둬도
 * 남고, 성장 스탯 상한(999)과 랭크 표에 얹혀 "밴드 랭크 SS" 같은 없는 개념이 생긴다.
 *
 * ## ⚠️ 무작위 없음
 * 합주 한 번이 `SKILL_PER_PRACTICE`만큼 올린다. 공연·앨범이 언제 열리는지 화면이 미리 적을
 * 수 있어야 주간 예약을 걸어 둘 이유가 생긴다(장비 고장이 사용 횟수인 것과 같은 규칙).
 *
 * ## ⚠️ 밴드는 판을 연장하지 못한다
 * 공연·앨범 둘 다 **오후 전용**이라 하루에 많아야 하나다. 그래서 밴드가 만드는 하루 최대
 * 수입은 `albumPay(SKILL_CAP)` 하나이고, 그 값이 **가장 싼 집의 마지막 물가 생활비보다
 * 작아야 한다** — `band.test.ts`가 데이터에서 직접 계산해 지킨다(트위터 팔로워 상한·주식
 * 보유 상한과 같은 장치다).
 */

/** 합주 한 번이 올리는 숙련도. */
export const SKILL_PER_PRACTICE = 2

/**
 * 숙련도 상한. **더 올려도 보수가 안 오른다** — 이 상한이 곧 밴드 수입의 상한이다.
 * 주간 예약이 4주(=4회)씩 도므로 30이면 특화해도 서너 번은 다시 수락해야 닿는다.
 */
export const SKILL_CAP = 30

/** 이만큼 쌓이면 무대에 설 수 있다(합주 4번). */
export const LIVE_SKILL = 8

/** 이만큼 쌓이면 앨범을 낼 수 있다(합주 10번). */
export const ALBUM_SKILL = 20

/**
 * 공연 보수. 숙련도가 붙지만 상한이 있다.
 * ⚠️ **앨범보다 반드시 작다** — 같으면 더 어려운 쪽을 열 이유가 없다(`band.test.ts`).
 */
export function livePay(skill: number): number {
  return 12000 + Math.min(skill, SKILL_CAP) * 600
}

/** 앨범 발매 보수. */
export function albumPay(skill: number): number {
  return 18000 + Math.min(skill, SKILL_CAP) * 700
}

/** 숙련도가 사람에게 읽히는 이름. 화면이 숫자만 적으면 20이 높은지 낮은지 알 수 없다. */
export function skillLabel(skill: number): string {
  if (skill >= ALBUM_SKILL) return '합이 맞는다'
  if (skill >= LIVE_SKILL) return '들어 줄 만하다'
  return '아직 맞춰 보는 중'
}
