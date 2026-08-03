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
  // ⚠️ 폴더 둘이 **배열 맨 앞**에 있는 이유: 바탕화면 아이콘은 이 순서대로 위에서부터
  // 놓이고, 설계자가 "바탕화면 상단에 폴더 2개"를 요구했다. 순서가 곧 배치다.
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
