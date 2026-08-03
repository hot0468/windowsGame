import type { IconName } from '../types/game'

/**
 * 게임 UI 골격(창·작업 표시줄·잠금화면)에 쓰는 아이콘 이름.
 * 아이콘 이름은 데이터이므로 컴포넌트에 하드코딩하지 않고 여기 모은다.
 * 특정 컴포넌트 안에서만 쓰이는 일회성 장식 아이콘(경고 등)은 예외로 그 컴포넌트에 둔다.
 *
 * 세트 선택 기준: 기본은 윈도우 데스크톱 컨셉과 맞는 fluent-emoji-flat,
 * 작은 크기(12~18px)에서 형태가 더 또렷한 UI 컨트롤은 flat-color-icons를 쓴다.
 */
export const UI_ICONS = {
  /** 창 닫기 버튼. */
  windowClose: 'flat-color-icons:cancel',
  /** 스탯창 타이틀 바 — 플레이어 본인. */
  statPanel: 'fluent-emoji-flat:bust-in-silhouette',
  /** 작업 표시줄 시작 버튼. */
  start: 'flat-color-icons:grid',
  /** 슬롯 건너뛰기 버튼. */
  skipTurn: 'fluent-emoji-flat:fast-forward-button',
  /** 날짜칸 타이틀 바 + 작업 표시줄 날짜칸 버튼. */
  calendarPanel: 'fluent-emoji-flat:spiral-calendar',
  /** 준비 중인 앱의 안내 창. */
  underConstruction: 'fluent-emoji-flat:construction',
  /** 오전 슬롯 표시. */
  slotMorning: 'fluent-emoji-flat:sun',
  /** 오후 슬롯 표시. */
  slotAfternoon: 'fluent-emoji-flat:crescent-moon',
  /** 잠금화면 아바타. */
  lockAvatar: 'fluent-emoji-flat:bust-in-silhouette',
  /** 엔딩 도감 해금 안내. */
  endingUnlocked: 'fluent-emoji-flat:closed-book',
  /** 턴 소모 안내. */
  turnCost: 'fluent-emoji-flat:alarm-clock',
} as const satisfies Record<string, IconName>
