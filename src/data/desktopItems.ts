import { ACTIVITIES } from './activities'
import type { DesktopItem } from '../types/game'

/**
 * 활동이 아닌 바탕화면 항목.
 * 브라우저는 스탯을 올리지도 턴을 소모하지도 않으므로 Activity가 아니다.
 * 가짜 활동으로 만들면 번아웃 이력·엔딩 판정·밸런스 테스트에 없는 id가 섞인다.
 *
 * 추후 폴더·휴지통도 여기에 추가한다.
 */
const NON_ACTIVITY_ITEMS: DesktopItem[] = [
  {
    id: 'browser',
    label: '인터넷',
    icon: 'fluent-emoji-flat:globe-with-meridians',
    // stub이었다가 구현되면서 kind만 바뀌었다 — 새 앱을 올리는 정해진 경로다.
    kind: 'browser',
    // 최대화 상태로 열리지만 복원하면 이 폭으로 돌아온다.
    width: 480,
    // 브라우저는 실제 윈도우처럼 작업 표시줄만 남기고 전체 화면으로 "열린다".
    // 이후 최대화 여부는 런타임 상태이므로 캡션 버튼으로 복원할 수 있다.
    openMaximized: true,
  },
]

/**
 * 활동 기반 바탕화면 항목. onDesktop 플래그가 단일 출처이므로
 * 여기서 id를 하드코딩하지 않는다.
 */
const ACTIVITY_ITEMS: DesktopItem[] = ACTIVITIES.filter((a) => a.onDesktop).map((a) => ({
  id: a.id,
  label: a.label,
  icon: a.icon,
  kind: 'exe',
  width: 340,
  activityId: a.id,
}))

/** 바탕화면에 그릴 항목 전체. Desktop 컴포넌트는 이 배열만 순회한다. */
export const DESKTOP_ITEMS: DesktopItem[] = [...ACTIVITY_ITEMS, ...NON_ACTIVITY_ITEMS]
