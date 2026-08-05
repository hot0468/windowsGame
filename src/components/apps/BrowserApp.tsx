import { useEffect, useState } from 'react'
import { findSite, HOME_SITE_ID, resolveUrl } from '../../data/sites'
import { BROWSER_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useBrowserStore } from '../../store/browserStore'
import { useGameStore } from '../../store/gameStore'
import {
  canGoBack,
  canGoForward,
  createHistory,
  currentSiteId,
  goBack,
  goForward,
  navigate,
} from '../../systems/browserHistory'
import { AlbamonSite } from './sites/AlbamonSite'
import { CampusSite } from './sites/CampusSite'
import { CertSite } from './sites/CertSite'
import { CinemaSite } from './sites/CinemaSite'
import { ConstructionSite } from './sites/ConstructionSite'
import { FleaSite } from './sites/FleaSite'
import { BankSite } from './sites/BankSite'
import { LibrarySite } from './sites/LibrarySite'
import { NeverPortal } from './sites/NeverPortal'
import { PublishSite } from './sites/PublishSite'
import { RealtySite } from './sites/RealtySite'
import { ShopSite } from './sites/ShopSite'
import { TubeSite } from './sites/TubeSite'
import { TwitterSite } from './sites/TwitterSite'
import './BrowserApp.css'

/**
 * 가짜 웹 브라우저.
 *
 * 사이트는 `src/data/sites.ts`가 단일 출처이며 이 컴포넌트는 `site.render`로만 분기한다 —
 * 사이트 id로 분기하기 시작하면 "데이터 한 줄 + 컴포넌트 하나"로 사이트를 늘리는 구조가 무너진다.
 *
 * **탐색은 무료다**(설계 문서 2.3). 이 컴포넌트는 게임 스토어를 읽기만 한다 —
 * 주소를 치고 이력을 오가고 사이트를 둘러보는 어떤 동작도 턴이나 스탯을 움직이지 않는다.
 *
 * ⚠️ **하위 사이트에는 상태를 바꾸는 자리가 셋 있다**: 포털 배너존의 광고 보상(턴 없음),
 * 쇼핑의 주문(턴 없음), 그리고 미디북스·시집이·아점의 **확정 버튼**(1턴).
 * 마지막 것이 브라우저를 활동 실행의 세 번째 통로로 만든다 — 규칙은 그대로다.
 * 둘러보는 동안은 무료이고, 버튼을 누르는 그 한 번만 턴을 쓴다.
 */
export function BrowserApp({ onClose }: { onClose?: () => void }) {
  // 이력은 이 창 하나의 휘발 상태다. 스토어에 올리면 창 id별로 나눠 담고
  // 닫을 때 지우는 코드가 따로 필요해지는데, 그 상태를 볼 다른 컴포넌트가 없다.
  const [history, setHistory] = useState(() => createHistory(HOME_SITE_ID))
  // 새로고침은 페이지를 다시 마운트시켜 사이트의 로컬 상태(검색 입력 등)를 초기화한다.
  const [reloadCount, setReloadCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // 즐겨찾기는 창을 닫아도 남아야 하므로 스토어가 들고 있다(browserStore 주석 참조).
  const bookmarks = useBrowserStore((s) => s.bookmarks)
  const toggleBookmark = useBrowserStore((s) => s.toggleBookmark)
  const devMode = useBrowserStore((s) => s.devMode)
  const toggleDevMode = useBrowserStore((s) => s.toggleDevMode)
  /* 개발자 패널이 게임 상태도 보여 준다 — 화면과 데이터가 어긋났는지 여기서 잡는다. */
  const day = useGameStore((s) => s.state?.day)
  const slot = useGameStore((s) => s.state?.slot)

  const siteId = currentSiteId(history)
  const site = findSite(siteId)

  /**
   * 주소창에 보이는 문자열. 입력 중에는 사용자가 주인이라 페이지 상태와 분리한다.
   * 페이지가 바뀌면(이동·뒤로·즐겨찾기) 그 주소로 되돌려 놓는다 — 실제 브라우저와 같다.
   * 모르는 주소로 이동했을 때는 site가 없으므로 입력값(= siteId)을 그대로 보여준다.
   */
  const [addr, setAddr] = useState(site?.url ?? siteId)
  useEffect(() => {
    setAddr(findSite(siteId)?.url ?? siteId)
  }, [siteId])

  const goToSite = (id: string) => setHistory((h) => navigate(h, id))
  const backEnabled = canGoBack(history)
  const forwardEnabled = canGoForward(history)
  const bookmarked = bookmarks.includes(siteId)
  // 없는 id가 저장돼 있어도(사이트가 지워졌을 때) 줄이 깨지지 않게 걸러 낸다.
  const bookmarkSites = bookmarks.map(findSite).filter((s) => s !== undefined)

  const reload = () => setReloadCount((n) => n + 1)
  /** 메뉴 항목은 고르면 닫힌다 — 실제 브라우저 메뉴와 같은 동작이다. */
  const runFromMenu = (fn: () => void) => () => {
    setMenuOpen(false)
    fn()
  }

  return (
    <div className="browser">
      {/* 브라우저 크롬은 OS 창의 일부로 읽혀야 하므로 --os-* 토큰만 쓴다.
          도구 모음 한 줄 + 즐겨찾기 한 줄로 쌓는다(실제 브라우저와 같은 순서). */}
      <div className="browser-chrome">
      {/*
        탭 줄. 실제 크롬의 상단 순서(탭 줄 → 도구 모음 → 즐겨찾기 줄)를 따른다.
        ⚠️ **탭은 하나뿐이고 "+"(새 탭) 버튼이 없다.** 다중 탭은 구현되지 않았고,
        눌러도 아무 일이 없는 버튼을 놓느니 없는 편이 낫다(ux `empty-nav-state`).
        탭의 ✕는 진짜다 — 크롬도 마지막 탭을 닫으면 창이 닫히므로 창 닫기에 연결했다.
      */}
      <div className="browser-tabs" role="tablist">
        <div className="browser-tab" role="tab" aria-selected="true">
          {site && <AppIcon name={site.icon} size={16} />}
          <span className="browser-tab-title">{site?.title ?? '새 탭'}</span>
          {onClose && (
            <button
              type="button"
              className="browser-tab-close"
              onClick={onClose}
              aria-label="탭 닫기"
              title="탭 닫기"
            >
              <span className="browser-glyph browser-glyph-x" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="browser-toolbar">
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
          onClick={reload}
          aria-label="새로 고침"
          title="새로 고침"
        >
          <span className="browser-glyph browser-glyph-reload" aria-hidden="true" />
        </button>

        {/* 주소를 직접 입력할 수 있다(설계자 지시로 표시 전용에서 바뀜).
            form으로 감싸 Enter 제출을 브라우저 기본 동작에 맡긴다 — keydown을 직접
            듣는 것보다 짧고, IME 조합 중 Enter까지 알아서 처리된다. */}
        <form
          className="browser-addr"
          onSubmit={(e) => {
            e.preventDefault()
            goToSite(resolveUrl(addr))
          }}
        >
          {site && <AppIcon name={site.icon} size={16} />}
          <input
            className="browser-addr-input"
            type="text"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="주소를 입력하세요"
            aria-label="주소"
            title={site ? `${site.title} — ${site.url}` : addr}
          />
          {/* 별표는 주소창 **안** 오른쪽이다 — 실제 브라우저의 자리이고,
              "이 주소를 즐겨찾기한다"는 관계가 자리로 드러난다.
              상태를 색으로만 알리지 않는다(ux `color-not-only`):
              aria-pressed + 툴팁 문구 + 눌린 배경이 함께 바뀐다. */}
          <button
            type="button"
            className={`browser-star${bookmarked ? ' browser-star-on' : ''}`}
            onClick={() => site && toggleBookmark(siteId)}
            disabled={!site}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
            title={bookmarked ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          >
            <AppIcon name={BROWSER_ICONS.bookmark} size={18} />
          </button>
        </form>

        {/* 자리에 다 못 넣는 동작은 더보기 메뉴로 모은다(ux `overflow-menu`). */}
        <div className="browser-more">
          <button
            type="button"
            className="browser-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="더보기"
            title="더보기"
          >
            <AppIcon name={BROWSER_ICONS.more} size={20} />
          </button>
          {menuOpen && (
            <>
              {/* 바깥 클릭으로 닫기. 전역 리스너를 다는 대신 투명한 판 하나를 깐다 —
                  붙이고 떼는 것을 React가 알아서 하므로 정리 코드가 필요 없다. */}
              <div className="browser-menu-scrim" onClick={() => setMenuOpen(false)} />
              <div
                className="browser-menu"
                role="menu"
                /* ux `escape-routes`: 메뉴는 Esc로 빠져나올 수 있어야 한다. */
                onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="browser-menu-item"
                  autoFocus
                  onClick={runFromMenu(() => goToSite(HOME_SITE_ID))}
                >
                  홈으로
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="browser-menu-item"
                  onClick={runFromMenu(reload)}
                >
                  새로 고침
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="browser-menu-item"
                  disabled={!site}
                  onClick={runFromMenu(() => toggleBookmark(siteId))}
                >
                  {bookmarked ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
                </button>
                {/* 토글 항목이라 켜짐 여부를 문구와 aria로 함께 알린다(색만으로 알리지 않는다). */}
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={devMode}
                  className="browser-menu-item"
                  onClick={runFromMenu(toggleDevMode)}
                >
                  개발자 모드 {devMode ? '끄기' : '켜기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 즐겨찾기 줄. 주소창 바로 아래에 붙어 "이 브라우저의 것"으로 읽힌다.
          현재 보고 있는 사이트는 표시해 준다(ux `nav-state-active`). */}
      <nav className="browser-bookmarks" aria-label="즐겨찾기">
        {bookmarkSites.length === 0 ? (
          /* ux `empty-states`: 비었을 때 빈 줄만 남기지 않고 무엇을 하면 되는지 알린다. */
          <span className="browser-bookmarks-empty">
            주소창의 별표를 누르면 이곳에 추가됩니다.
          </span>
        ) : (
          bookmarkSites.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`browser-bookmark${s.id === siteId ? ' browser-bookmark-on' : ''}`}
              onClick={() => goToSite(s.id)}
              aria-current={s.id === siteId ? 'page' : undefined}
              title={s.url}
            >
              <AppIcon name={s.icon} size={16} />
              {s.title}
            </button>
          ))
        )}
      </nav>
      </div>

      {devMode && (
        /*
          개발자 패널. 진짜 개발자 도구를 흉내 내지 않는다 — DOM 트리·네트워크 탭은
          이 게임에 없는 것이라 만들면 전부 장식이 된다. 대신 이 가짜 브라우저가
          **실제로 들고 있는 값**만 보여 준다.
        */
        <dl className="browser-dev">
          <dt>site</dt>
          <dd>{site ? `${site.id} (${site.render})` : `${siteId} — 없음`}</dd>
          <dt>url</dt>
          <dd>{site?.url ?? addr}</dd>
          <dt>history</dt>
          <dd>
            {history.entries.join(' → ')} <b>[{history.index}]</b>
          </dd>
          <dt>turn</dt>
          <dd>
            {day ?? '-'}일차 {slot === 'afternoon' ? '오후' : '오전'}
          </dd>
          <dt>bookmarks</dt>
          <dd>{bookmarks.length ? bookmarks.join(', ') : '(없음)'}</dd>
        </dl>
      )}

      {/* key가 바뀌면 페이지가 다시 마운트된다 = 새로고침·사이트 이동. */}
      <div className="browser-page" key={`${siteId}-${reloadCount}`}>
        {!site && <p className="browser-error">페이지를 찾을 수 없습니다.</p>}
        {site?.render === 'portal' && <NeverPortal onNavigate={goToSite} />}
        {site?.render === 'shop' && <ShopSite />}
        {site?.render === 'tube' && <TubeSite />}
        {/* 활동을 실행하는 사이트 3종. 둘러보기는 여전히 무료이고,
            각 사이트 안의 확정 버튼(ActivityCommit) 하나만 1턴을 쓴다. */}
        {site?.render === 'library' && <LibrarySite site={site} />}
        {site?.render === 'cinema' && <CinemaSite site={site} />}
        {site?.render === 'publish' && <PublishSite site={site} />}
        {site?.render === 'jobs' && <AlbamonSite site={site} />}
        {site?.render === 'campus' && <CampusSite site={site} />}
        {site?.render === 'career' && <FleaSite site={site} />}
        {site?.render === 'cert' && <CertSite site={site} />}
        {site?.render === 'twitter' && <TwitterSite site={site} />}
        {/* ⚠️ 은행·부동산은 활동을 실행하지 않는다 — 거래도 계약도 턴을 쓰지 않으므로
            확정 패널이 없다. 이 둘이 파는 것은 슬롯이 아니라 **며칠**이다. */}
        {site?.render === 'bank' && <BankSite site={site} />}
        {site?.render === 'realty' && <RealtySite site={site} />}
        {site?.render === 'construction' && (
          <ConstructionSite site={site} onGoHome={() => goToSite(HOME_SITE_ID)} />
        )}
      </div>
    </div>
  )
}
