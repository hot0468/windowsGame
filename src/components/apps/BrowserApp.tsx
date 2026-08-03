import { useState } from 'react'
import { findSite, HOME_SITE_ID } from '../../data/sites'
import { AppIcon } from '../../icons/AppIcon'
import {
  canGoBack,
  canGoForward,
  createHistory,
  currentSiteId,
  goBack,
  goForward,
  navigate,
} from '../../systems/browserHistory'
import { ConstructionSite } from './sites/ConstructionSite'
import { NeverPortal } from './sites/NeverPortal'
import './BrowserApp.css'

/**
 * 가짜 웹 브라우저.
 *
 * 사이트는 `src/data/sites.ts`가 단일 출처이며 이 컴포넌트는 `site.render`로만 분기한다 —
 * 사이트 id로 분기하기 시작하면 "데이터 한 줄 + 컴포넌트 하나"로 사이트를 늘리는 구조가 무너진다.
 *
 * **탐색은 무료다**(설계 문서 2.3). 이 컴포넌트와 하위 사이트는 게임 스토어를 읽기만 하고
 * 어떤 액션도 호출하지 않는다 — 턴도 스탯도 움직이지 않는다.
 */
export function BrowserApp() {
  // 이력은 이 창 하나의 휘발 상태다. 스토어에 올리면 창 id별로 나눠 담고
  // 닫을 때 지우는 코드가 따로 필요해지는데, 그 상태를 볼 다른 컴포넌트가 없다.
  const [history, setHistory] = useState(() => createHistory(HOME_SITE_ID))
  // 새로고침은 페이지를 다시 마운트시켜 사이트의 로컬 상태(검색 입력 등)를 초기화한다.
  const [reloadCount, setReloadCount] = useState(0)

  const siteId = currentSiteId(history)
  const site = findSite(siteId)

  const goToSite = (id: string) => setHistory((h) => navigate(h, id))
  const backEnabled = canGoBack(history)
  const forwardEnabled = canGoForward(history)

  return (
    <div className="browser">
      {/* 브라우저 크롬은 OS 창의 일부로 읽혀야 하므로 --os-* 토큰만 쓴다. */}
      <div className="browser-chrome">
        <button
          type="button"
          className="browser-btn"
          onClick={() => setHistory(goBack)}
          disabled={!backEnabled}
          aria-label="뒤로"
          title="뒤로"
        >
          <span className="browser-glyph browser-glyph-back" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="browser-btn"
          onClick={() => setHistory(goForward)}
          disabled={!forwardEnabled}
          aria-label="앞으로"
          title="앞으로"
        >
          <span className="browser-glyph browser-glyph-forward" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="browser-btn"
          onClick={() => setReloadCount((n) => n + 1)}
          aria-label="새로 고침"
          title="새로 고침"
        >
          <span className="browser-glyph browser-glyph-reload" aria-hidden="true" />
        </button>

        {/* 주소창은 1차 구현에서 표시 전용이다. 읽기 전용 input으로 두면
            키보드 사용자도 초점을 옮겨 현재 주소를 확인할 수 있다. */}
        <div className="browser-addr">
          {site && <AppIcon name={site.icon} size={16} />}
          <input
            className="browser-addr-input"
            type="text"
            readOnly
            value={site?.url ?? ''}
            aria-label="주소"
            title={site ? `${site.title} — ${site.url}` : ''}
          />
        </div>
      </div>

      {/* key가 바뀌면 페이지가 다시 마운트된다 = 새로고침·사이트 이동. */}
      <div className="browser-page" key={`${siteId}-${reloadCount}`}>
        {!site && <p className="browser-error">페이지를 찾을 수 없습니다.</p>}
        {site?.render === 'portal' && <NeverPortal onNavigate={goToSite} />}
        {site?.render === 'construction' && (
          <ConstructionSite site={site} onGoHome={() => goToSite(HOME_SITE_ID)} />
        )}
      </div>
    </div>
  )
}
