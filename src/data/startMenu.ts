import type { IconName, WindowKind } from '../types/game'

/*
 * ⚠️ 아이콘은 **단색 라인**(`mdi-light`)이다(설계자 지시).
 * 시작 메뉴는 시작 버튼·트레이와 같은 **셸 크롬**이라 셸 규칙을 그대로 따른다:
 *   앱 정체성 = 컬러 로고 / 셸 크롬 = 단색 라인 글리프.
 * 여기에 다색 아이콘을 두면 작업 표시줄에서 컬러가 "실행 중인 앱"을 뜻한다는
 * 규칙이 흐려진다(data/icons.ts 참조).
 */

/**
 * 시작 메뉴 항목.
 *
 * 바탕화면 아이콘(`desktopItems.ts`)과 나눠 둔 이유: 바탕화면은 **게임 세계의 앱**이고
 * (메신저·브라우저·메일), 시작 메뉴는 **게임 바깥의 도구**다(세이브·작업 관리자·명령
 * 프롬프트). 실제 윈도우에서도 시작 메뉴에는 시스템 도구가 모인다.
 * 한 목록으로 합치면 "게임을 하는 곳"과 "게임을 관리하는 곳"이 섞인다.
 */
export interface StartMenuItem {
  id: string
  label: string
  icon: IconName
  kind: WindowKind
  width: number
  /** 목록에서 줄을 가르는 구분선을 이 항목 **위에** 넣는다. */
  separatorBefore?: boolean
}

export const START_MENU_ITEMS: StartMenuItem[] = [
  {
    id: 'save',
    label: '게임 저장 / 불러오기',
    icon: 'mdi-light:content-save',
    kind: 'save',
    width: 460,
  },
  {
    id: 'solitaire',
    label: '솔리테어',
    icon: 'mdi-light:diamond',
    kind: 'solitaire',
    width: 720,
    separatorBefore: true,
  },
  {
    /*
     * 그림판 — 솔리테어와 **같은 부류라 그 옆자리다**: 게임 상태를 안 건드리는 장난감이고
     * 그린 것은 창을 닫으면 사라진다. 바탕화면이 아니라 여기 있는 이유가 그것이다
     * (바탕화면 = 게임 세계의 앱). 폭은 캔버스(660) + 여백이 들어가는 값이다.
     */
    id: 'paint',
    label: '그림판',
    icon: 'mdi-light:pencil',
    kind: 'paint',
    width: 720,
  },
  {
    id: 'taskmgr',
    label: '작업 관리자',
    icon: 'mdi-light:chart-line',
    kind: 'taskmgr',
    width: 520,
    separatorBefore: true,
  },
  {
    id: 'cmd',
    label: '명령 프롬프트',
    icon: 'mdi-light:console',
    kind: 'cmd',
    width: 560,
  },
]
