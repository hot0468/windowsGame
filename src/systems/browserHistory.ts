/**
 * 가짜 브라우저의 뒤로/앞으로 이력.
 *
 * React 상태로 두더라도 인덱스 계산은 off-by-one이 나기 쉬운 자리라
 * 순수 함수로 분리해 테스트 대상으로 만든다(ux `back-behavior`:
 * "Preserve navigation history properly").
 * 이력은 창 하나의 휘발 상태이므로 스토어에 올리지 않는다 —
 * 스토어에 두면 창 id별로 나눠 담고 닫을 때 지우는 코드가 따로 필요해진다.
 */
export interface BrowserHistory {
  /** 방문한 사이트 id. 인덱스 0이 가장 오래된 항목이다. */
  entries: string[]
  /** 현재 보고 있는 항목의 위치. */
  index: number
}

export function createHistory(siteId: string): BrowserHistory {
  return { entries: [siteId], index: 0 }
}

export function currentSiteId(history: BrowserHistory): string {
  return history.entries[history.index]
}

export function canGoBack(history: BrowserHistory): boolean {
  return history.index > 0
}

export function canGoForward(history: BrowserHistory): boolean {
  return history.index < history.entries.length - 1
}

/**
 * 새 사이트로 이동한다. 실제 브라우저처럼 앞으로 갈 이력은 잘려 나간다.
 * 같은 사이트를 다시 누르면 이력을 늘리지 않는다 — 즐겨찾기를 두 번 눌렀다고
 * 뒤로 가기가 같은 자리에 머무르면 뒤로 버튼이 고장 난 것처럼 보인다.
 */
export function navigate(history: BrowserHistory, siteId: string): BrowserHistory {
  if (currentSiteId(history) === siteId) return history
  const entries = [...history.entries.slice(0, history.index + 1), siteId]
  return { entries, index: entries.length - 1 }
}

export function goBack(history: BrowserHistory): BrowserHistory {
  if (!canGoBack(history)) return history
  return { ...history, index: history.index - 1 }
}

export function goForward(history: BrowserHistory): BrowserHistory {
  if (!canGoForward(history)) return history
  return { ...history, index: history.index + 1 }
}
