/**
 * 길고양이 수치. 규칙은 전부 `systems/cat.ts`에 있다.
 *
 * ## 컨셉
 * 판 시드(`GameState.seed`)로 정해진 날 밤, 창밖에 길고양이가 나타난다. 사료를 줄지
 * 모른 척할지 고르고, **세 번 정을 주면 들일 수 있다.** 들이면 바탕화면을 이따금
 * 걸어다니는 데스크톱 펫이 된다(옛 윈도우 Neko 오마주 — 가짜 OS 컨셉의 연장).
 * 판마다 오는 날이 다르고, **세 번 모른 척하면 이번 판에는 다시 오지 않는다** —
 * 선택의 무게다.
 */

/** 첫 방문일의 최소값. 시드가 8~14일차 사이에서 고른다. */
export const CAT_FIRST_VISIT_MIN = 8
/** 첫 방문일의 폭(8 + 0..6 = 8~14). */
export const CAT_FIRST_VISIT_SPAN = 7
/** 재방문 간격의 최소값. 시드가 3~5일 사이에서 고른다. */
export const CAT_REVISIT_MIN = 3
/** 재방문 간격의 폭(3 + 0..2 = 3~5). */
export const CAT_REVISIT_SPAN = 3

/** 만남에서 사료 한 번 주는 값. */
export const CAT_FEED_PRICE = 3_000
/** 이만큼 먹이면 집에 들일 수 있다. */
export const CAT_FEEDS_TO_ADOPT = 3
/** 한 번도 안 먹이고 이만큼 모른 척하면 이번 판에는 다시 오지 않는다. */
export const CAT_IGNORES_TO_LEAVE = 3

/**
 * 입양 후 밤마다 나가는 사료비. 악성코드 손실과 같은 규칙으로 **잔액 1원을 남기고
 * 자른다**(자르는 자리는 `systems/cat.ts` 하나).
 */
export const CAT_NIGHT_FOOD_COST = 1_500
/** 사료를 **온전히** 낸 밤만 붙는 멘탈 보너스. 못 낸 밤은 없다(고양이가 떠나지는 않는다). */
export const CAT_NIGHT_MENTAL_BONUS = 1
/** 쓰다듬기(하루 한 번, 턴 소모 없음)의 멘탈 보너스. */
export const CAT_PET_MENTAL_BONUS = 1

/** 이름을 안 지어 주면 이 이름이 된다. */
export const CAT_DEFAULT_NAME = '나비'
