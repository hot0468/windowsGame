import { ACTIVITIES, findActivity } from './activities'
import { requiredItemIds } from './items'
import { shortcutIdOf } from '../systems/shortcuts'
import type { DesktopEntry, DesktopItem } from '../types/game'

/**
 * 활동이 아닌 바탕화면 항목.
 * 브라우저는 스탯을 올리지도 턴을 소모하지도 않으므로 Activity가 아니다.
 * 가짜 활동으로 만들면 번아웃 이력·엔딩 판정·밸런스 테스트에 없는 id가 섞인다.
 *
 * 폴더·휴지통도 여기에 있다.
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
  {
    /*
     * 증기 — 가짜 스팀. **활동으로 위장시키지 않는다**: 라이브러리를 넘겨보는 것은
     * 무료이고, 1턴을 쓰는 것은 창 안의 [플레이] 확인창 하나뿐이다(브라우저와 같은 판단).
     * ⚠️ 아이콘은 devicon이 아니다 — 실존 브랜드 로고를 쓰지 않는 규칙이고
     * (지어낸 상호다), devicon에는 애초에 이 로고가 없다.
     *
     * ⚠️ **게임기·컨트롤러 모양은 다색 세트(`fluent-color`)에 없다**(단색 mdi에만 있고,
     * 바탕화면은 다색 규칙이라 그것만 회색 선으로 떠서 시스템 글리프로 읽힌다).
     * 그래서 게임 계열 중 유일한 다색 글리프인 퍼즐 조각을 쓴다(설계자 선택) —
     * 활동 `game`·스탯 `gaming`과 **같은 그림인 것이 오히려 규칙에 맞다**:
     * 증기를 켜서 하는 일이 정확히 그 활동이다.
     */
    id: 'steam',
    label: '증기',
    icon: 'fluent-color:puzzle-piece-24',
    kind: 'steam',
    // 좌(220) + 우 본문. 좁으면 표지와 실행 줄이 겹친다.
    width: 880,
  },
  // 설치돼 있지만 아직 열리지 않는 프로그램. stub으로 먼저 올려 두고 구현되면 kind만 바꾼다.
  {
    /*
     * VS 코드. ⚠️ **stub에서 활동 창으로 승격했다**(2026-08-08 그몽 재설계) —
     * 정해진 경로대로 `kind`만 바꿨다. 구독이 필요 없는 유일한 도구라 조건이 없고,
     * 그래서 **조건부 항목보다 앞**에 남는다.
     */
    id: 'vscode',
    label: 'VS 코드',
    icon: 'devicon:vscode',
    /* ⚠️ **도구 셋과 갈라졌다**(2026-08-09, 레퍼런스=실제 VS 코드): 다른 둘은 활동 창을
       띄우고 곧바로 `ToolRun`으로 넘어가지만, 이쪽은 **프로그램 창**이 먼저 뜨고 그 안의
       ▶가 활동을 실행한다(클립스튜디오와 같은 부류).
       ⚠️ **`activityId`는 그대로 둔다** — `kind: 'exe'`가 아니라 화면이 읽지는 않지만,
       "이 프로그램이 실행하는 활동"이라는 관계는 여전히 참이고 `desktopItems.test.ts`가
       "도구 활동에는 실행 통로가 있다"를 그 한 줄로 지킨다. */
    kind: 'vscode',
    activityId: 'tool-vscode',
    width: 900,
  },
  {
    /*
     * 너아무튼온 — **업무용 메신저라 취직해야 나타난다**(설계자 지시: "기업 취직하면 시작됨").
     * 회사가 없으면 팀장님도 개발 2팀도 없으므로 앱만 덩그러니 두면 빈 목록이 뜬다.
     *
     * ⚠️ **클립스튜디오와 같은 부류의 조건부 항목이라 프로그램 열의 맨 뒤에 있다** —
     * 가운데에 두면 취직하기 전까지 그 칸이 빈 자리로 남아 열이 뚫린다.
     * 방 목록 쪽 조건은 `Thread.requiresEmployment`가 따로 갖는다(판정은 `threadVisible`).
     */
    id: 'nateon',
    label: '너아무튼온',
    icon: 'fluent-color:people-chat-24',
    kind: 'chat',
    appId: 'nateon',
    width: 400,
    requiresEmployment: true,
  },
  {
    /*
     * 설정 — **게임 바깥의 도구가 아니라 이 가짜 OS의 시스템 앱이다**(설계자 지시로
     * 시작 메뉴가 아니라 바탕화면에 둔다). 지금 관리하는 것은 구독 하나뿐이다.
     * ⚠️ **조건이 없으므로 조건부 항목(포토샵·클립스튜디오)보다 앞**이어야 한다 —
     * 조건부는 자기 열의 맨 뒤라는 규칙이라, 뒤에 두면 그 사이에 빈 칸이 생긴다.
     */
    id: 'settings',
    label: '설정',
    icon: 'fluent-color:settings-24',
    kind: 'settings',
    // 구독 줄이 [아이콘 | 이름·상태·혜택 | 버튼] 세 칸이라 좁으면 버튼이 접힌다.
    width: 620,
  },
  {
    /*
     * 포토샵. ⚠️ **어도비를 구독해야 나타난다**(설계자 지시) — 예전에는 항상 보이면서
     * "라이선스가 만료되었습니다"라고만 말하는 항목이었는데, 이제 그 문장이 **상태**가 됐다:
     * 구독 전에는 아이콘 자체가 없고, 끊으면 다시 사라진다.
     *
     * ⚠️ **stub에서 활동 창으로 승격했다**(2026-08-08 그몽 재설계) — 이제 켜면 1턴을 쓰고
     * 받아 둔 디자인 일감의 업무량을 채운다. 클립스튜디오(`draw`)와 겹치지 않는다:
     * 그쪽은 **그림을 만들어 갤러리에 쌓고**(트위터 업로드의 재료), 이쪽은 **받은 일을 친다**.
     * ⚠️ **조건부이므로 프로그램 열의 맨 뒤**여야 한다(클립스튜디오와 같은 이유).
     */
    id: 'photoshop',
    label: '포토샵',
    icon: 'devicon:photoshop',
    kind: 'exe',
    activityId: 'tool-photoshop',
    /* ⚠️ 도구 셋은 같은 폭이다 — 켠 때 같은 작업 화면(`ToolRun`)이 뜼므로 폭이 갈리면 그 화면만 좀아진다. */
    width: 420,
    requiresSubscription: 'adobe',
  },
  {
    /*
     * 프리미어. **포토샵과 완전히 같은 부류다** — 같은 구독이 열고(어도비 CC는 도구 전체를
     * 포함한다), 켜면 1턴을 쓰며, 받아 둔 영상 일감이 있으면 업무량을 채운다.
     * ⚠️ 조건부이므로 **자기 열의 맨 뒤**에 모여 있어야 한다(빈 칸이 생기지 않게).
     */
    id: 'premiere',
    label: '프리미어',
    icon: 'devicon:premierepro',
    kind: 'exe',
    activityId: 'tool-premiere',
    /* ⚠️ 도구 셋은 같은 폭이다 — 켠 때 같은 작업 화면(`ToolRun`)이 뜼므로 폭이 갈리면 그 화면만 좀아진다. */
    width: 420,
    requiresSubscription: 'adobe',
  },
  {
    /*
     * 오디션. 포토샵·프리미어와 같은 구독·같은 폭이다.
     * ⚠️ **devicon에 오디션 로고가 없다** — 도구는 devicon으로 통일해 왔지만 지어낼 수는
     *    없으므로 다색 헤드폰을 쓴다(`fluent-color:headphones-24`). 다색 아이콘이라 CSS
     *    `color`를 입히지 않는다.
     */
    id: 'audition',
    label: '오디션',
    icon: 'fluent-color:headphones-24',
    kind: 'exe',
    activityId: 'tool-audition',
    width: 420,
    requiresSubscription: 'adobe',
  },
  {
    /*
     * 클립스튜디오. ⚠️ **타블렛을 사야 나타나는 조건부 항목이다**(`requiresItem`) —
     * 이 게임에서 프로그램이 나중에 설치되는 유일한 자리다.
     *
     * ⚠️ **`Activity.onDesktop`으로 올리지 않는다.** 그 플래그는 "항상 보인다"라
     * 물건을 사기 전에도 아이콘이 뜬다(누르면 확인창이 잠금 사유만 적는 죽은 아이콘이 된다).
     * 조건부 표시는 축이 다르므로 여기에 명시적으로 적는다.
     *
     * ⚠️ **프로그램 열의 맨 뒤여야 한다** — 기본 격자(`DEFAULT_ICON_CELLS`)는 이 배열
     * 순서에서 파생되는데, 가운데에 두면 타블렛을 사기 전까지 그 칸이 빈 자리로 남는다.
     */
    id: 'clipstudio',
    label: '클립스튜디오',
    icon: 'fluent-color:paint-brush-24',
    kind: 'clipstudio',
    /* ⚠️ **`kind`가 `'exe'`가 아니다**(2026-08-08): 그리기가 셋으로 갈리면서
       (웹툰 원고 · 단일 · 작품집) 활동 하나를 실행하는 창으로는 고를 자리가 없어졌다.
       증기·미디북스와 같은 **고르는 창**이고 고른 뒤에 확인창이 뜬다. 그래서
       `activityId`도 없다 — 실행할 활동은 화면에서 고른 것이 정한다. */
    width: 480,
    requiresItem: ['pen-tablet', 'lcd-tablet'],
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
    // ⚠️ id는 'codex' 그대로다 — 옮긴 아이콘 위치(desktopIconStore)가 이 id로 저장돼 있다.
    label: '사진첩',
    icon: 'fluent-color:image-24',
    kind: 'folder',
    folderId: 'codex',
    width: 720,
  },
  {
    /*
     * 도감. **사진첩 옆자리다**(설계자 지시) — 둘 다 "모아 두고 넘겨 보는 것"이지만
     * 사진첩은 사진 한 장이 곧 항목이고 이쪽은 항목마다 값이 여럿이라(레벨·급여·조건)
     * 폴더가 아니라 **표**다. 그래서 kind가 `folder`가 아니라 `excel`이다.
     * ⚠️ 조건이 없다 — 도감은 처음부터 열려 있고, 안에서 회색/검정으로 진행을 말한다.
     */
    id: 'ledger',
    label: '도감.xlsx',
    icon: 'fluent-color:table-24',
    kind: 'excel',
    // 5열(회사·직함·급여·레벨·상태) + 수식 입력줄. 좁으면 급여와 레벨이 붙어 읽힌다.
    width: 760,
  },
  {
    /*
     * 휴지통. **새 상태를 만들지 않는 폴더다** — 내용은 다 쓰고 고장 난 장비(`broken`)와
     * 고정 파일 몇 개뿐이고, 비우기 버튼도 없다(사유는 `ExplorerApp`의 `FOLDERS.trash`).
     * ⚠️ **조건이 없으므로 조건부 항목(갤러리)보다 앞**이어야 한다 — 뒤에 두면 타블렛을
     * 사기 전까지 그 사이가 빈 칸으로 남는다(클립스튜디오와 같은 규칙).
     */
    id: 'trash',
    label: '휴지통',
    icon: 'mdi:trash-can',
    kind: 'folder',
    folderId: 'trash',
    width: 720,
  },
  {
    /*
     * 갤러리. 클립스튜디오와 **같이 나타나고 같이 사라진다** — 그릴 수 없는 사람에게
     * 빈 갤러리를 띄워 봐야 설명할 것이 없다. 그래서 조건도 같은 배열이다.
     * ⚠️ **폴더 열의 맨 뒤여야 한다**(클립스튜디오와 같은 이유 — 빈 칸이 생긴다).
     */
    id: 'gallery',
    label: '갤러리',
    icon: 'fluent-color:design-ideas-24',
    kind: 'folder',
    folderId: 'gallery',
    width: 720,
    requiresItem: ['pen-tablet', 'lcd-tablet'],
  },
]

/**
 * 조건부 항목의 표시 판정. 배열이면 **그중 아무거나 하나**다
 * (`systems/turn.ts`의 `ownsRequired`와 같은 규칙 — 여기서 `turn.ts`를 부르지 않는 것은
 * `data/`가 `systems/`를 import하면 방향이 뒤집히기 때문이고, 판정 대상이 아니라
 * **표시 여부**라서 규칙이 갈리지 않는다. 실행은 여전히 `canRun` 하나가 막는다).
 */
function hasRequired(required: string | string[] | undefined, owned: readonly string[]): boolean {
  if (!required) return true
  return requiredItemIds(required).some((id) => owned.includes(id))
}

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
 *
 * ⚠️ **`ownedItemIds`를 안 넘기면 조건부 항목은 안 보인다**(기본값이 빈 배열이다).
 * 그것이 안전한 쪽이다 — 안 가진 프로그램이 보이는 것보다 가진 프로그램이 안 보이는
 * 편이 낫고, 후자는 화면에서 바로 눈에 띈다.
 */
export function desktopEntries(
  shortcutActivityIds: readonly string[],
  ownedItemIds: readonly string[] = [],
  employed = false,
  subscribedIds: readonly string[] = [],
): DesktopEntry[] {
  const builtIn: DesktopEntry[] = DESKTOP_ITEMS.filter(
    (item) =>
      hasRequired(item.requiresItem, ownedItemIds) &&
      (!item.requiresEmployment || employed) &&
      // ⚠️ 구독은 **끊기면 다시 사라진다** — 그래서 아이템·재직과 같은 자리에서 함께 거른다.
      (!item.requiresSubscription || subscribedIds.includes(item.requiresSubscription)),
  ).map((item) => ({
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
