import type { ReactNode } from 'react'
import { BrowserApp } from '../apps/BrowserApp'
import { CallCenterApp } from '../apps/CallCenterApp'
import { DriveApp } from '../apps/DriveApp'
import { ChatListApp, ChatThreadApp } from '../apps/ChatApp'
import { MailApp } from '../apps/MailApp'
import { CommandPromptApp, SaveApp, TaskManagerApp } from '../apps/SystemApps'
import { SchedulerApp } from '../apps/SchedulerApp'
import { ExplorerApp } from '../apps/ExplorerApp'
import { AutoLogApp } from '../apps/AutoLogApp'
import { ExcelApp } from '../apps/ExcelApp'
import { ExeApp } from '../apps/ExeApp'
import { SettingsApp } from '../apps/SettingsApp'
import { SolitaireApp } from '../apps/SolitaireApp'
import { SteamApp } from '../apps/SteamApp'
import { ToolRun } from '../apps/ToolRun'
import { ClipStudioApp } from '../apps/ClipStudioApp'
import { StubApp } from '../apps/StubApp'
import type { OpenWindow } from '../../store/windowStore'
import type { WindowKind } from '../../types/game'

/**
 * `WindowKind` → 앱 컴포넌트. **셸이 둘이므로 분기는 하나여야 한다.**
 *
 * ⚠️ 이 파일이 존재하는 이유가 이 게임에서 가장 중요한 구조 결정이다:
 * 데스크톱 셸(`WindowManager` — 창 목록)과 모바일 셸(`MobileAppView` — 전체화면 앱 스택)이
 * 같은 `windowStore`를 읽는데, kind 분기를 각자 적으면 **새 앱을 추가할 때 반드시
 * 한쪽을 빠뜨린다**(그리고 그 셸에서만 빈 창이 뜬다 — 빌드도 테스트도 통과한 채로).
 * 그래서 두 셸은 `appForWindow(win, { onClose })` 하나를 부르고, 창 크롬(타이틀 바냐
 * 상단 앱 바냐)만 각자 정한다.
 *
 * ⚠️ `WINDOW_APP_KINDS`는 이 분기가 실제로 덮는 kind 목록이고
 * `appForWindow.test.ts`가 `WindowKind` 전체를 순회해 빠진 것이 없는지 지킨다.
 * kind를 늘리면 그 테스트에서 먼저 터진다.
 */

/**
 * 이 분기가 실제로 앱을 그리는 kind.
 *
 * ⚠️ 여기 없는 kind는 **의도적으로 없는 것**이고 `EXCLUDED_KINDS`가 사유를 갖는다 —
 * 둘의 합집합이 `WindowKind` 전체와 같아야 한다(테스트가 지킨다).
 */
export const WINDOW_APP_KINDS = [
  'exe',
  'stub',
  'chat',
  'thread',
  'mail',
  'save',
  'taskmgr',
  'cmd',
  'scheduler',
  'folder',
  'autolog',
  'browser',
  'solitaire',
  'steam',
  'settings',
  'callcenter',
  'drive',
  'tool',
  'clipstudio',
  'excel',
] as const satisfies readonly WindowKind[]

/**
 * 창으로 열리지 않는 kind와 그 사유.
 *
 * - `ending` — 엔딩은 창이 아니라 화면 전체를 가로막는 모달(`EndingModal`)이다.
 *   셸과 무관하게 떠야 하므로 `windowStore`를 타지 않는다.
 */
export const EXCLUDED_KINDS = {
  ending: '엔딩은 창이 아니라 전체 모달(EndingModal)이다',
} as const satisfies Partial<Record<WindowKind, string>>

/** 앱 컴포넌트가 셸에게 요구하는 것. 지금은 "나를 닫아 달라"뿐이다. */
export interface AppSlots {
  /** 앱이 스스로 닫히는 길(활동 완료·브라우저 마지막 탭 닫기). */
  onClose: () => void
}

/**
 * 창 하나가 그릴 내용물을 돌려준다. 데스크톱·모바일 셸이 **같이** 부른다.
 *
 * ⚠️ 크롬(타이틀 바·장식·어두운 테마)은 여기서 정하지 않는다 — 셸마다 다르기 때문이다.
 * 그 판단은 `windowChrome()`이 갖고, 데스크톱만 쓴다.
 */
export function appForWindow(w: OpenWindow, { onClose }: AppSlots): ReactNode {
  switch (w.kind) {
    case 'exe':
      return w.activityId ? <ExeApp activityId={w.activityId} onDone={onClose} /> : null
    case 'stub':
      return w.message ? <StubApp message={w.message} /> : null
    case 'chat':
      return w.appId ? <ChatListApp appId={w.appId} /> : null
    case 'thread':
      return w.threadId ? <ChatThreadApp threadId={w.threadId} onDone={onClose} /> : null
    case 'mail':
      return <MailApp />
    case 'save':
      return <SaveApp />
    case 'taskmgr':
      return <TaskManagerApp />
    case 'cmd':
      return <CommandPromptApp />
    case 'scheduler':
      return <SchedulerApp />
    case 'folder':
      return w.folderId ? <ExplorerApp folderId={w.folderId} /> : null
    case 'autolog':
      return <AutoLogApp />
    /* 탭의 ✕가 창을 닫는다 — 크롬도 마지막 탭을 닫으면 창이 닫힌다. */
    case 'browser':
      return <BrowserApp onClose={onClose} />
    /* 이 가짜 OS의 시스템 앱. 지금 관리하는 것은 구독 하나뿐이다. */
    case 'settings':
      return <SettingsApp />
    /* 판이 컴포넌트 안에서만 산다 — 창을 닫으면 끝난다(실제 윈도우 솔리테어와 같다). */
    case 'solitaire':
      return <SolitaireApp />
    /* 라이브러리 한 화면. 게임을 켜는 것은 활동 `game` 1턴이다. */
    case 'steam':
      return <SteamApp />
    /* 출근이 여는 사내 프로그램. 턴은 이미 지나갔고 여기서 버는 것은 보너스뿐이다. */
    case 'callcenter':
      return <CallCenterApp onClose={onClose} />
    /* 사무직 출근이 여는 사내 드라이브. 콜센터와 같은 부류이고 서로 배타다. */
    case 'drive':
      return <DriveApp onClose={onClose} />
    /* 도구 앱(포토샵·프리미어·VS 코드). 활동 창이 아니라 **단독 창**이고 상태를 안 바꾼다. */
    case 'tool':
      return w.toolRun ? <ToolRun payload={w.toolRun} onClose={onClose} /> : null
    /* 클립스튜디오. **고르는 창**이라 활동 창이 아니다 — 고른 뒤에 확인창이 뜬다. */
    case 'clipstudio':
      return <ClipStudioApp />
    /* 도감(직업·엔딩). 표를 읽기만 하고 게임 상태를 바꾸지 않는다. */
    case 'excel':
      return <ExcelApp />
    default:
      return null
  }
}

/** 데스크톱 창 크롬의 kind별 옵션. 모바일은 타이틀 바가 없어 쓰지 않는다. */
export interface WindowChrome {
  ornament: boolean
  bareTitle: boolean
  dark: boolean
}

/**
 * 창 크롬 옵션. **데스크톱 전용이다** — 모바일 앱 뷰에는 타이틀 바도 테두리도 없다.
 *
 * 게임이 말을 거는 창에만 테두리 장식을 붙인다. 브라우저처럼 "설치된 프로그램"으로
 * 읽혀야 하는 창은 빼야 가짜 OS 컨셉이 유지된다(Window의 ornament 주석 참조).
 */
export function windowChrome(kind: WindowKind): WindowChrome {
  return {
    ornament: kind === 'exe' || kind === 'stub',
    /* 메신저·증기는 앱이 창 꼭대기까지 자기 색을 칠한다 — 레퍼런스와 같은 형태다.
       ⚠️ `dark`와 **짝으로 간다**: 캡션 글리프를 밝게 뒤집으면 밝은 OS 타이틀 바
       위에서는 보이지 않는다(증기에서 실제로 그랬다). 어두운 앱은 자기 색이
       창 꼭대기까지 올라와야 뒤집힌 글리프가 얹힐 바닥이 생긴다. */
    bareTitle: kind === 'chat' || kind === 'thread' || kind === 'cmd' || kind === 'steam',
    /* 어두운 프로그램. 캡션 글리프까지 밝게 뒤집어야 타이틀 바에서 안 보이지 않는다. */
    /* ⚠️ 도구 앱도 어둡다 — 창이 곧 그 프로그램이라 **실제 타이틀 바가 프로그램 이름표**를
       진다(그래서 가짜 프로그램 띠를 따로 그리지 않는다). `bareTitle`은 안 준다:
       제목과 로고가 보여야 작업 표시줄에서 무엇이 도는지 알 수 있다. */
    dark: kind === 'cmd' || kind === 'steam' || kind === 'tool',
  }
}
