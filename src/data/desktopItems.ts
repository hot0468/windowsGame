import { ACTIVITIES, findActivity } from './activities'
import { shortcutIdOf } from '../systems/shortcuts'
import type { DesktopEntry, DesktopItem } from '../types/game'

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
    // ⚠️ 프로그램 로고(devicon). 지구본 이모지는 "인터넷"이라는 개념 그림이지
    // 설치된 브라우저 아이콘으로 읽히지 않는다. 창 타이틀 바·작업 표시줄 항목에도
    // 같은 아이콘이 흘러가 앱 정체성이 세 자리에서 일치한다.
    icon: 'devicon:chrome',
    // stub이었다가 구현되면서 kind만 바뀌었다 — 새 앱을 올리는 정해진 경로다.
    kind: 'browser',
    // 최대화 상태로 열리지만 복원하면 이 폭으로 돌아온다.
    width: 480,
    // 브라우저는 실제 윈도우처럼 작업 표시줄만 남기고 전체 화면으로 "열린다".
    // 이후 최대화 여부는 런타임 상태이므로 캡션 버튼으로 복원할 수 있다.
    openMaximized: true,
  },
  {
    // ⚠️ 메신저는 더 이상 '활동'이 아니다. 예전에는 열자마자 1턴을 쓰는 exe 창이었지만,
    // 설계자 결정으로 **읽는 것은 무료**가 되었다 — 대화창 안의 [만나러 가기]를 눌렀을 때만
    // 기존 social 활동이 실행된다. 그래서 activities.ts의 social은 onDesktop을 껐고,
    // 여기서 chat 창으로 다시 올린다.
    id: 'kakao',
    label: '카톡',
    icon: 'fluent-color:chat-24',
    kind: 'chat',
    appId: 'kakao',
    // 세로 레일(52px) + 목록 패널이 들어가므로 좁으면 미리보기가 다 잘린다.
    width: 400,
  },
  {
    id: 'nateon',
    label: '너아무튼온',
    icon: 'fluent-color:people-chat-24',
    kind: 'chat',
    appId: 'nateon',
    width: 400,
  },
  {
    id: 'scheduler',
    label: '일정',
    icon: 'fluent-color:calendar-24',
    kind: 'scheduler',
    // 한 달 격자(7×6)가 들어가므로 넓어야 한다 — 좁으면 칸마다 활동 이름이 다 잘린다.
    // 720 → 1080 (설계자 지시로 1.5배).
    width: 1080,
  },
  {
    id: 'outlook',
    label: '아웃룩',
    icon: 'fluent-color:mail-24',
    kind: 'mail',
    appId: 'outlook',
    // 3단(폴더/목록/읽기)이 들어가므로 넓어야 한다 — 좁으면 읽기 창이 한 줄에 6글자가 된다.
    // ⚠️ 1400(정확히 2배)이 아니라 1000인 이유: 창은 열릴 때 폭이 클램핑되지 않아
    // 1400을 주면 1280 폭 화면에서 오른쪽이 잘린다. 높이는 그대로 2배로 늘렸다.
    width: 1000,
  },
  // ⚠️ 폴더는 바탕화면에서 **앱과 다른 열**에 놓인다(설계자 지시: 아웃룩 옆).
  // 열을 가르는 건 `Desktop.tsx`이고 여기서는 순서만 정한다 — 배열 끝이 곧 오른쪽 열이다.
  {
    id: 'inventory',
    label: '아이템 인벤토리',
    icon: 'fluent-color:document-folder-24',
    kind: 'folder',
    folderId: 'inventory',
    // 탐색 창(180) + 파일 그리드. 좁으면 '자세히' 보기의 세 열이 겹친다.
    width: 720,
  },
  {
    id: 'codex',
    label: '이벤트 도감',
    icon: 'fluent-color:document-folder-24',
    kind: 'folder',
    folderId: 'codex',
    width: 720,
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

/** 바탕화면의 **내장** 항목 전체. 플레이어가 지울 수 없는 것들이다. */
export const DESKTOP_ITEMS: DesktopItem[] = [...ACTIVITY_ITEMS, ...NON_ACTIVITY_ITEMS]

/**
 * 지금 바탕화면에 그릴 아이콘 전체 = **내장 항목 + 플레이어가 만든 바로 가기**.
 * `Desktop` 컴포넌트는 이 목록 하나만 순회한다.
 *
 * ⚠️ **내장 항목이 항상 앞이다.** 격자 배치는 목록 순서대로 칸을 차지하므로,
 * 바로 가기를 앞에 두면 그것이 늘어날 때마다 기본 배치가 통째로 밀린다.
 *
 * ⚠️ **없는 활동을 가리키는 바로 가기는 조용히 빠진다.** 활동 id가 바뀌거나 사라져도
 * 아이콘 하나가 안 보일 뿐, 눌러도 아무 일 없는 아이콘이 남지는 않는다.
 * (`shortcutStore`의 기록은 그대로 두어, id가 되살아나면 바로 가기도 되살아난다.)
 */
export function desktopEntries(shortcutActivityIds: readonly string[]): DesktopEntry[] {
  const builtIn: DesktopEntry[] = DESKTOP_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    shortcut: false,
    item,
  }))

  const made: DesktopEntry[] = shortcutActivityIds.flatMap((activityId) => {
    const activity = findActivity(activityId)
    if (!activity) return []
    return [
      {
        id: shortcutIdOf(activityId),
        // 이름·아이콘은 활동에서 그대로 가져온다 — 여기 다시 적으면 두 번째 출처가 생긴다.
        label: activity.label,
        icon: activity.icon,
        shortcut: true,
        activityId,
      },
    ]
  })

  return [...builtIn, ...made]
}
