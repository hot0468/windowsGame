import { createHistory, currentSiteId, navigate } from './browserHistory'
import type { BrowserHistory } from './browserHistory'

/**
 * 브라우저 탭 규칙 (2026-08-08 신설).
 *
 * ## 왜 규칙을 컴포넌트 밖에 두는가
 * 탭은 "열기 / 전환 / 닫기 / 되돌리기" 넷이 서로 얽힌다 — 활성 탭을 닫으면 어디로 가는가,
 * 이미 열린 사이트를 또 열면 어떻게 되는가 같은 판단이 `useState` 콜백 안에 흩어지면
 * 화면을 열어 보지 않고는 확인할 수가 없다. 이력(`browserHistory.ts`)과 같은 층에 둔다.
 *
 * ## 확정된 규칙
 * ⚠️ **같은 사이트의 탭을 둘 만들지 않는다** — 즐겨찾기를 두 번 누르면 탭이 둘이 되고,
 * 그때부터 "지금 보는 것이 어느 탭인가"를 사람이 세어야 한다.
 * ⚠️ **마지막 탭을 닫으면 창이 닫힌다**(실제 크롬과 같다). 그래서 `closeTab`은 `null`을
 * 돌려줄 수 있고, 그것이 곧 "창을 닫아라"다 — 빈 탭 줄만 남은 브라우저를 만들지 않는다.
 * ⚠️ **활성 탭을 닫으면 오른쪽 탭으로 간다**(없으면 왼쪽). 크롬과 같은 방향이고,
 * 아무 데나 보내면 방금 닫은 자리와 무관한 페이지가 떠서 길을 잃는다.
 * ⚠️ **id는 `Math.random`이 아니라 카운터다**(이 프로젝트의 결정성 규칙). 탭을 닫고
 * 열어도 id가 겹치지 않아야 React 키와 활성 탭 판정이 어긋나지 않는다.
 */

export interface BrowserTab {
  /** 탭의 정체. **사이트 id가 아니다** — 주소창으로 탭 안에서 다른 사이트로 갈 수 있다. */
  id: number
  /** 이 탭만의 방문 이력. 뒤로/앞으로가 오가는 대상이다. */
  history: BrowserHistory
}

export interface TabState {
  tabs: BrowserTab[]
  activeId: number
  /** 다음에 만들 탭의 id. 상태에 들고 있어야 순수 함수로 남는다. */
  nextId: number
}

export function createTabs(siteId: string): TabState {
  return { tabs: [{ id: 1, history: createHistory(siteId) }], activeId: 1, nextId: 2 }
}

/** 지금 보고 있는 탭. 목록이 비는 일이 없으므로(마지막 탭 = 창 닫기) 항상 존재한다. */
export function activeTab(state: TabState): BrowserTab {
  return state.tabs.find((t) => t.id === state.activeId) ?? state.tabs[0]
}

export function activeSiteId(state: TabState): string {
  return currentSiteId(activeTab(state).history)
}

/** 그 탭이 지금 보고 있는 사이트. 탭 줄의 제목·아이콘이 읽는 값이다. */
export function tabSiteId(tab: BrowserTab): string {
  return currentSiteId(tab.history)
}

/**
 * 사이트를 **탭으로 연다**(설계자 지시: "각 사이트들은 열리면 탭 추가").
 * 이미 그 사이트를 보고 있는 탭이 있으면 새로 만들지 않고 그쪽으로 옮겨 간다.
 */
export function openTab(state: TabState, siteId: string): TabState {
  const existing = state.tabs.find((t) => tabSiteId(t) === siteId)
  if (existing) return { ...state, activeId: existing.id }
  const tab: BrowserTab = { id: state.nextId, history: createHistory(siteId) }
  return { tabs: [...state.tabs, tab], activeId: tab.id, nextId: state.nextId + 1 }
}

/**
 * **현재 탭 안에서** 이동한다(이력이 쌓인다).
 *
 * ⚠️ 이 통로가 남아 있어야 뒤로/앞으로가 죽은 컨트롤이 되지 않는다. 실제 브라우저에서도
 * 주소창은 새 탭을 열지 않고 **그 탭을 바꾼다** — 링크는 새 탭, 주소창은 제자리라는
 * 갈래를 그대로 가져왔다.
 */
export function navigateActive(state: TabState, siteId: string): TabState {
  return updateActive(state, (h) => navigate(h, siteId))
}

/** 활성 탭의 이력만 바꾼다(뒤로·앞으로). */
export function updateActive(
  state: TabState,
  fn: (history: BrowserHistory) => BrowserHistory,
): TabState {
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === state.activeId ? { ...t, history: fn(t.history) } : t)),
  }
}

export function setActive(state: TabState, id: number): TabState {
  return state.tabs.some((t) => t.id === id) ? { ...state, activeId: id } : state
}

/**
 * 탭을 닫는다. **마지막 탭이면 `null`** — 호출부가 그것을 "창을 닫아라"로 읽는다.
 * 활성 탭을 닫았으면 오른쪽 탭(없으면 왼쪽)으로 옮겨 간다.
 */
export function closeTab(state: TabState, id: number): TabState | null {
  const index = state.tabs.findIndex((t) => t.id === id)
  if (index === -1) return state
  if (state.tabs.length === 1) return null

  const tabs = state.tabs.filter((t) => t.id !== id)
  if (id !== state.activeId) return { ...state, tabs }
  // 닫은 자리의 오른쪽이 있으면 그쪽, 없으면 왼쪽(= 새 목록의 마지막).
  const next = tabs[Math.min(index, tabs.length - 1)]
  return { ...state, tabs, activeId: next.id }
}
