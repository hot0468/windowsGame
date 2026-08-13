/**
 * 그림판이 쓰는 값 — 팔레트·붓 굵기·판 크기.
 *
 * ⚠️ **이 색들은 디자인 토큰이 아니라 "잉크"다.** UI 크롬(도구 모음·작업 영역)은
 * 여전히 `--os-*` 토큰만 쓰고, 여기 있는 것은 플레이어가 캔버스에 칠하는 물감이라
 * 화면의 시각 언어와 무관하다(솔리테어의 카드 무늬 색과 같은 자리).
 *
 * ⚠️ 색마다 **한국어 이름**이 붙어 있는 이유: 색 견본은 색 말고는 알릴 것이 없어
 * `aria-label`이 없으면 스크린 리더에 "버튼"만 여덟 개 읽힌다(ux `color-not-only`).
 */
export interface PaintColor {
  name: string
  value: string
}

/** 팔레트 8칸. 실제 그림판처럼 기본색이고 밝기가 고르게 흩어져 있다. */
export const PAINT_COLORS: readonly PaintColor[] = [
  { name: '검정', value: '#000000' },
  { name: '회색', value: '#7f7f7f' },
  { name: '빨강', value: '#e11d48' },
  { name: '주황', value: '#f97316' },
  { name: '노랑', value: '#facc15' },
  { name: '초록', value: '#16a34a' },
  { name: '파랑', value: '#2563eb' },
  { name: '보라', value: '#7c3aed' },
]

/** 붓 굵기 3단. 이름이 있어야 `aria-label`이 "2px"이 아니라 뜻을 말한다. */
export const PAINT_WIDTHS: readonly { name: string; px: number }[] = [
  { name: '가늘게', px: 2 },
  { name: '보통', px: 6 },
  { name: '굵게', px: 14 },
]

/**
 * 판 크기(픽셀 버퍼).
 *
 * ⚠️ **CSS로 늘리지 않는다.** `<canvas>`는 픽셀 버퍼(width/height 속성)와 CSS 크기가
 * 어긋나면 그린 선이 커서를 따라오지 않는다 — 여기 값을 그대로 두 곳에 쓴다.
 * 창 폭(720)에서 본문 여백을 뺀 안쪽에 들어가는 크기다.
 */
export const PAINT_CANVAS = { width: 660, height: 380 } as const

/** 바탕색. 지우개는 이 색으로 칠하는 것이고, [전체 지우기]도 이 색으로 덮는다. */
export const PAINT_PAPER = '#ffffff'
