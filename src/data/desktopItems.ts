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
    kind: 'stub',
    width: 320,
    stubMessage: '인터넷은 아직 준비 중입니다. 다음 업데이트를 기다려 주세요.',
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
