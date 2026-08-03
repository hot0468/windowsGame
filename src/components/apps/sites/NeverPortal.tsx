import { useState } from 'react'
import { TRENDING_TERMS } from '../../../data/news'
import { BOOKMARK_SITES } from '../../../data/sites'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { selectNews } from '../../../systems/news'
import './NeverPortal.css'

/** 이 페이지에서만 쓰는 장식 아이콘. 게임 데이터가 아니므로 data/에 두지 않는다. */
const PORTAL_ICONS = {
  search: 'fluent-emoji-flat:magnifying-glass-tilted-left',
  news: 'fluent-emoji-flat:newspaper',
  trending: 'fluent-emoji-flat:fire',
} as const

/** 뉴스 종류별 라벨. 색만으로 광고를 구분하지 않는다(ux `color-not-only`). */
const NEWS_TAGS: Record<string, string> = {
  notice: '속보',
  ad: '광고',
}

/**
 * NEVER 포털 홈.
 *
 * 게임 상태는 **읽기만** 한다(day 하나). 뉴스 목록은 순수 선택자가 만들고
 * 이 컴포넌트는 그리기만 하므로, 페이지를 아무리 열어도 턴·스탯이 움직이지 않는다.
 *
 * 구성 근거(landing DB "Marketplace / Directory"): 검색이 곧 CTA이므로
 * 1) 로고+검색 → 2) 카테고리(즐겨찾기) → 3) 목록(뉴스·실검) 순으로 쌓는다.
 */
export function NeverPortal({ onNavigate }: { onNavigate: (siteId: string) => void }) {
  const day = useGameStore((s) => s.state?.day ?? 1)
  const news = selectNews({ day })

  const [query, setQuery] = useState('')
  /** 검색 결과 안내. 자유 검색은 1차 구현 제외 항목이라 항상 "결과 없음"이다. */
  const [searchNotice, setSearchNotice] = useState<string | null>(null)

  const showNoResult = (term: string) => {
    const trimmed = term.trim()
    setSearchNotice(
      trimmed ? `'${trimmed}'에 대한 검색 결과가 없습니다.` : '검색 결과가 없습니다.',
    )
  }

  return (
    <div className="nv">
      <header className="nv-hero">
        <h1 className="nv-logo">NEVER</h1>

        <form
          className="nv-search"
          onSubmit={(e) => {
            e.preventDefault()
            showNoResult(query)
          }}
        >
          <label className="nv-sr-only" htmlFor="nv-search-input">
            검색어
          </label>
          <input
            id="nv-search-input"
            className="nv-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요"
            autoComplete="off"
          />
          <button type="submit" className="nv-search-btn" aria-label="검색">
            <AppIcon name={PORTAL_ICONS.search} size={20} />
          </button>
        </form>

        {/* role="status"로 두면 스크린 리더가 결과를 읽어 준다(ux `aria-live-errors`). */}
        <p className="nv-search-notice" role="status">
          {searchNotice}
        </p>
      </header>

      <nav className="nv-bookmarks" aria-label="바로가기">
        {BOOKMARK_SITES.map((site) => (
          <button
            key={site.id}
            type="button"
            className="nv-bookmark"
            onClick={() => onNavigate(site.id)}
          >
            <AppIcon name={site.icon} size={28} />
            {site.title}
          </button>
        ))}
      </nav>

      <div className="nv-columns">
        <section className="nv-card">
          <h2 className="nv-card-head">
            <AppIcon name={PORTAL_ICONS.news} size={18} />
            뉴스
          </h2>
          <ul className="nv-news">
            {news.map((item) => (
              <li key={item.id} className={`nv-news-item nv-news-${item.kind}`}>
                {NEWS_TAGS[item.kind] && (
                  <span className={`nv-tag nv-tag-${item.kind}`}>{NEWS_TAGS[item.kind]}</span>
                )}
                <span className="nv-news-text">{item.headline}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="nv-card">
          <h2 className="nv-card-head">
            <AppIcon name={PORTAL_ICONS.trending} size={18} />
            실시간 검색어
          </h2>
          <ol className="nv-trending">
            {TRENDING_TERMS.map((term, i) => (
              <li key={term.label}>
                <button
                  type="button"
                  className="nv-trending-item"
                  onClick={() => {
                    if (term.siteId) {
                      onNavigate(term.siteId)
                      return
                    }
                    // 검색창에도 넣어 준다 — 안내 문구만 바뀌면 무엇이 검색됐는지 알 수 없다.
                    setQuery(term.label)
                    showNoResult(term.label)
                  }}
                >
                  <span className={`nv-rank${i < 3 ? ' nv-rank-top' : ''}`}>{i + 1}</span>
                  <span className="nv-trending-text">{term.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
