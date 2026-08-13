import { useEffect, useId, useState } from 'react'
import { activitiesUnlockedBy } from '../../../data/activities'
import { WIDE_ROTATE_MS, bannersFor } from '../../../data/banners'
import type { Banner } from '../../../data/banners'
import { BUYABLE_ITEMS } from '../../../data/items'
import type { ShopItem } from '../../../data/items'
import { NEWS_CATEGORIES, SEARCH_SUGGESTIONS, TRENDING_TERMS } from '../../../data/news'
import type { NewsCategory } from '../../../data/news'
import { BOOKMARK_SITES, PROMO_SITES, STORE_SITES } from '../../../data/sites'
import type { Site } from '../../../data/sites'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { selectNewsPage } from '../../../systems/news'
import { search } from '../../../systems/search'
import { getLivingCost, getNextTier, getWageMultiplier, tierCostFor } from '../../../systems/economy'
import { AD_BONUS_MONEY, canClaimAdBonus } from '../../../systems/turn'
import './NeverPortal.css'

/**
 * 이 페이지에서만 쓰는 장식 아이콘. 게임 데이터가 아니므로 data/에 두지 않는다.
 *
 * ⚠️ **이모지를 쓰지 않는다**(설계자 지시 + ui-ux-pro-max `no-emoji-icons`).
 * 이모지는 폰트에 의존해 플랫폼마다 모양이 달라지고 디자인 토큰으로 통제할 수 없다.
 * 컨트롤 글리프는 단색(`mdi`), 정체성을 가진 대상은 다색 **아이콘**(`fluent-color`)이다.
 */
const PORTAL_ICONS = {
  /** 검색 실행. 단색이라 CSS로 브랜드 초록을 입힐 수 있다(다색 아이콘은 불가능). */
  search: 'mdi:magnify',
  news: 'fluent-color:news-24',
} as const

/** 뉴스 종류별 라벨. 색만으로 광고를 구분하지 않는다(ux `color-not-only`). */
const NEWS_TAGS: Record<string, string> = {
  notice: '속보',
  ad: '광고',
}

/** 실시간 검색어가 한 건씩 넘어가는 간격. */
const LIVE_ROTATE_MS = 3500

/** 상단 쇼핑 띠에 한 번에 그리는 진열 타일 수(레퍼런스와 같은 5칸). */
const SHOP_STRIP_TILES = 5

/**
 * 쇼핑 띠의 왼쪽 목록.
 * ⚠️ **분류 축을 새로 만들지 않는다** — "활동을 여는 물건인가"는 `activitiesUnlockedBy`가
 * 이미 아는 사실이고 가게 진열대도 같은 축으로 갈려 있다(`ShopSite`·`TechSite`).
 */
const SHOP_STRIP_FILTERS: { label: string; value: boolean | null }[] = [
  { label: '전체', value: null },
  { label: '스탯 상승', value: false },
  { label: '활동 해제', value: true },
]

/** 활동을 여는 물건인가. 가게 진열대와 같은 판정. */
const unlocksActivity = (itemId: string) => activitiesUnlockedBy(itemId).length > 0

/**
 * 그 물건을 파는 사이트의 id.
 * ⚠️ **사이트 id를 적지 않고 `render`로 찾는다** — 가게가 늘어도 여기는 그대로다.
 */
function storeSiteIdOf(item: ShopItem): string {
  /* ⚠️ `ItemStore` 값과 가게 사이트의 `render` 값이 같은 글자다('shop'|'tech'|'wear').
     그래서 가게가 늘어도 여기는 그대로다 — 예전처럼 삼항으로 갈라 두면 새 가게의
     물건이 전부 컬리엔마트로 흘러간다(무진장을 더했을 때 실제로 그랬다). */
  const render = item.store ?? 'shop'
  return STORE_SITES.find((s) => s.render === render)!.id
}

/**
 * 네이놈 포털 홈.
 *
 * 게임 상태는 배너 보상 하나를 빼면 **읽기만** 한다. 뉴스 목록은 순수 선택자가 만들고
 * 이 컴포넌트는 그리기만 하므로, 페이지를 아무리 열어도 턴은 움직이지 않는다.
 *
 * 배치: 1) 로고+검색 → 2) 퀵메뉴 + 실시간 검색어 → 3) 뉴스(넓게) + 배너존(좁게).
 */
export function NeverPortal({ onNavigate }: { onNavigate: (siteId: string) => void }) {
  const day = useGameStore((s) => s.state?.day ?? 1)
  const slot = useGameStore((s) => s.state?.slot ?? 'morning')
  const money = useGameStore((s) => s.state?.stats.money ?? 0)
  /**
   * ⚠️ 생활비만은 **날짜가 아니라 상태**에서 뽑는다(2026-08-05 이사 신설) —
   * 사는 집이 배율을 정하므로 `day`만으로는 계산할 수 없다. 계산은 `getLivingCost`가
   * 하고 여기서는 숫자만 받는다(스탯창·확정 패널과 같은 함수를 본다).
   */
  const living = useGameStore((s) => (s.state ? getLivingCost(s.state) : 0))
  const nextLiving = useGameStore((s) => (s.state ? tierCostFor(s.state, getNextTier(s.state.day)) : 0))

  /** 뉴스 분야 탭. null이면 '전체'. */
  const [tab, setTab] = useState<NewsCategory | null>(null)
  const [page, setPage] = useState(0)
  const newsPage = selectNewsPage({ day, category: tab, page })

  /**
   * 레퍼런스의 증시 지표 자리에 들어가는 **게임 지표 3종**.
   * 가짜 코스피를 그리는 대신 플레이어가 실제로 읽어야 하는 값을 둔다 —
   * 이 카드가 "게임의 알림 창구"라는 설계(문서 3.4)와도 맞는다.
   * tone은 좋고 나쁨이 아니라 **플레이어에게 유리/불리**를 뜻한다.
   */
  const next = getNextTier(day)
  const INDICES = [
    {
      label: '생활비',
      value: living.toLocaleString('ko-KR'),
      // ⚠️ 인상률은 **같은 배율 위의 두 값**으로 잰다(`living`도 `nextLiving`도 집 배율을 탔다).
      //    한쪽만 기준 금액을 쓰면 이사한 플레이어에게 말이 안 되는 %가 뜬다.
      delta: `${next.day - day}일 뒤 +${living > 0 ? Math.round((nextLiving / living - 1) * 100) : 0}%`,
      tone: 'bad',
    },
    {
      label: '알바 시급',
      value: `×${getWageMultiplier(day).toFixed(2)}`,
      delta: `${next.day - day}일 뒤 ×${next.wageMultiplier.toFixed(2)}`,
      tone: 'good',
    },
    {
      label: '버티는 날',
      value: `${Math.floor(money / living)}`,
      delta: `잔액 ${Math.round(money / 10000)}만원`,
      tone: 'flat',
    },
  ] as const
  /* 배너 보상 외에는 여전히 읽기만 한다. 판정은 systems의 순수 함수가 한다. */
  const canClaim = useGameStore((s) => (s.state ? canClaimAdBonus(s.state) : false))
  const claimAd = useGameStore((s) => s.claimAdBonus)
  /* ⚠️ **이미 감염 중이면 스캠 배너를 그리지 않는다** — 두 번 걸릴 것이 없고, 눌러도
     아무 일이 안 일어나는 배너는 죽은 컨트롤이다. */
  const infected = useGameStore((s) => s.state?.malware !== undefined)
  const infect = useGameStore((s) => s.infectMalware)

  const [query, setQuery] = useState('')
  /**
   * 검색 결과로 넘어간 질의. null이면 홈 화면이다.
   *
   * 실제 포털처럼 **같은 사이트 안에서 화면만 바뀐다** — 결과를 별도 사이트로 만들면
   * 주소·이력·즐겨찾기까지 얽히는데, 검색은 그 사이트의 한 화면일 뿐이다.
   * 입력 중인 `query`와 나눠 두는 이유: 글자를 고칠 때마다 결과가 바뀌면 안 된다.
   */
  const [submitted, setSubmitted] = useState<string | null>(null)
  /**
   * 검색창을 눌렀는가. **추천 검색어 팝오버**가 이 값으로 뜬다(설계자 지시).
   * ⚠️ 별도 컴포넌트로 빼지 않는다 — 검색어(`query`)·실행(`runSearch`)과 한 덩어리라
   * 나누면 상태를 셋이나 위로 올려야 한다.
   */
  const [suggestOpen, setSuggestOpen] = useState(false)

  /**
   * 실시간 검색어는 목록이 아니라 **한 건씩 돌아가며** 뜬다(설계자 지시).
   * 게임 상태가 아니라 화면 장식이므로 컴포넌트 로컬 타이머로 충분하다 —
   * 스토어에 올리면 창을 닫을 때 정리할 코드가 새로 필요해진다.
   */
  const [liveIndex, setLiveIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(
      () => setLiveIndex((i) => (i + 1) % TRENDING_TERMS.length),
      LIVE_ROTATE_MS,
    )
    return () => clearInterval(id)
  }, [])

  /** 검색 실행. 빈 문자열이면 홈으로 되돌린다. */
  const runSearch = (term: string) => setSubmitted(term.trim() || null)
  const results = submitted ? search(submitted) : null

  /** 실시간 검색어 클릭: 대응 사이트가 있으면 이동, 없으면 검색 안내로 끝난다. */
  const openTerm = (index: number) => {
    const term = TRENDING_TERMS[index]
    if (term.siteId) {
      onNavigate(term.siteId)
      return
    }
    // 검색창에도 넣어 준다 — 결과만 바뀌면 무엇을 검색했는지 알 수 없다.
    setQuery(term.label)
    runSearch(term.label)
  }

  return (
    <div className="nv">
      <header className="nv-hero">
        {/* 로고를 누르면 홈으로 — 실제 포털과 같다. 결과 화면에서 빠져나가는 길이다. */}
        <button
          type="button"
          className="nv-logo"
          onClick={() => {
            setSubmitted(null)
            setQuery('')
          }}
        >
          네이놈
        </button>

        {/*
          검색창 + **추천 검색어 팝오버**(설계자 지시). 감싸는 이유는 팝오버를 입력창
          바로 아래에 붙이기 위해서다(`position: relative`의 기준점).
          ⚠️ **추천어는 새로 만들지 않는다** — `data/news.ts`의 `TRENDING_TERMS` 재사용이고
          트위터 트렌드·실시간 검색어와 **같은 출처**다(같은 사실이 세 곳에 따로 적히지 않는다).
          ⚠️ 누르면 **진짜로 검색된다** — 갈 데 없는 목록은 장식이다.
        */}
        <div className="nv-searchbox">
        <form
          className="nv-search"
          onSubmit={(e) => {
            e.preventDefault()
            setSuggestOpen(false)
            runSearch(query)
          }}
        >
          <label className="nv-sr-only" htmlFor="nv-search-input">
            검색어
          </label>
          {/* 검색창 왼쪽의 브랜드 마크. 로고와 같은 서체·색이라 "이 검색은 네이놈의 것"이
              한 글자로 읽힌다. 장식이므로 스크린 리더에서는 감춘다. */}
          <span className="nv-search-mark" aria-hidden="true">
            네
          </span>
          <input
            id="nv-search-input"
            className="nv-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSuggestOpen(true)}
            onClick={() => setSuggestOpen(true)}
            /* ux `escape-routes`: 팝오버는 Esc로 빠져나올 수 있어야 한다. */
            onKeyDown={(e) => e.key === 'Escape' && setSuggestOpen(false)}
            placeholder="검색어를 입력하세요"
            autoComplete="off"
            aria-expanded={suggestOpen}
            aria-controls="nv-suggest"
          />
          <button type="submit" className="nv-search-btn" aria-label="검색">
            <AppIcon name={PORTAL_ICONS.search} size={24} />
          </button>
        </form>

        {suggestOpen && (
          <>
            {/* 바깥 클릭으로 닫기. 전역 리스너 대신 투명한 판 하나를 깐다 —
                붙이고 떼는 것을 React가 알아서 하므로 정리 코드가 필요 없다
                (브라우저 더보기 메뉴와 같은 방식). */}
            <div className="nv-suggest-scrim" onClick={() => setSuggestOpen(false)} />
            <div className="nv-suggest" id="nv-suggest" role="listbox" aria-label="추천 검색어">
              {/* ⚠️ **실시간 검색어가 아니라 검색어 추천이다**(설계자 지시) — 목록도 다르다
                  (`SEARCH_SUGGESTIONS`). 실검은 "지금 화제인 것", 여기는 "여기서 찾을 수
                  있는 것"이라 대부분 갈 곳이 있고, **어도비 사이트의 유일한 입구**이기도 하다. */}
              <p className="nv-suggest-head">검색어 추천</p>
              {SEARCH_SUGGESTIONS.map((term, i) => (
                <button
                  key={term.label}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="nv-suggest-item"
                  onClick={() => {
                    setSuggestOpen(false)
                    setQuery(term.label)
                    // ⚠️ 대응 사이트가 있으면 거기로 간다 — 실시간 검색어 줄과 같은 규칙이다
                    //    (같은 단어를 눌렀는데 자리에 따라 다른 데로 가면 안 된다).
                    if (term.siteId) onNavigate(term.siteId)
                    else runSearch(term.label)
                  }}
                >
                  <span className="nv-suggest-rank">{i + 1}</span>
                  <span className="nv-suggest-label">{term.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        </div>

        {/* role="status"로 두면 스크린 리더가 결과 수를 읽어 준다(ux `aria-live-errors`). */}
        <p className="nv-search-notice" role="status">
          {results && `'${submitted}' 검색 결과 ${results.total}건`}
        </p>
      </header>

      {results ? (
        <SearchResults
          query={submitted ?? ''}
          result={results}
          onNavigate={onNavigate}
          onSearch={(t) => {
            setQuery(t)
            runSearch(t)
          }}
        />
      ) : (
        <>
      {/* 퀵메뉴(왼쪽) + 실시간 검색어(오른쪽) 한 줄. 실제 포털의 그 줄과 같은 배치다. */}
      <div className="nv-quick">
        <nav className="nv-bookmarks" aria-label="바로가기">
          {BOOKMARK_SITES.map((site) => (
            <button
              key={site.id}
              type="button"
              className="nv-bookmark"
              onClick={() => onNavigate(site.id)}
            >
              {/* 가로 알약: 원형 아이콘 판 + 오른쪽 라벨(레퍼런스 형태). */}
              <span className="nv-bookmark-plate">
                <AppIcon name={site.icon} size={22} />
              </span>
              {site.title}
            </button>
          ))}
        </nav>

        {/*
          실시간 검색어는 카드로 늘어놓지 않고 한 건씩 돌아가며 보여 준다(설계자 지시).
          목록 전체를 늘 펼쳐 두면 정보량에 비해 자리를 너무 많이 먹는다.
          aria-live로 두면 스크린 리더가 3.5초마다 읽어 방해가 되므로 켜지 않는다 —
          내용은 클릭 대상이자 장식이고, 목록 전체는 클릭으로 도달할 수 있다.
        */}
        <button type="button" className="nv-live" onClick={() => openTerm(liveIndex)}>
          <span className="nv-live-tag">실시간</span>
          <span className="nv-live-rank">{liveIndex + 1}</span>
          <span className="nv-live-text">{TRENDING_TERMS[liveIndex].label}</span>
        </button>
      </div>

      {/*
        상단 쇼핑 섹션(설계자 지시). 물건을 파는 곳은 뉴스 위에 둔다 — 돈을 쓰는 자리가
        하단 소개 카드 일곱에 섞여 있으면 스크롤 끝까지 내려가야 보인다.
        ⚠️ 카드는 하단 소개와 **같은 부품(`PromoCard`)이다** — 자리만 다르고 모양이 같아야
        "이건 사이트로 가는 카드"라는 규칙을 두 번 배우지 않는다.
      */}
      <ShopStrip onNavigate={onNavigate} />

      {/*
        본문은 뉴스(넓게) + 배너존(좁게) 두 단이다. 배너를 위에 가로로 눕히면
        첫 화면이 광고로 채워진다 — 뉴스가 주인공이므로 옆으로 보낸다.
        폭이 좁아지면 flex-wrap이 알아서 위아래로 접는다(창 크기 ≠ 뷰포트 크기).
      */}
      <div className="nv-columns">
        <section className="nv-card nv-col-main" aria-label="뉴스">
          {/* 1) 분야 탭. **눌리면 실제로 목록이 걸러진다** — 장식 탭은 두지 않는다. */}
          <nav className="nv-tabs" aria-label="뉴스 분야">
            <button
              type="button"
              className={`nv-tab${tab === null ? ' nv-tab-on' : ''}`}
              aria-current={tab === null ? 'true' : undefined}
              onClick={() => {
                setTab(null)
                setPage(0)
              }}
            >
              뉴스스탠드
            </button>
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`nv-tab${tab === c ? ' nv-tab-on' : ''}`}
                aria-current={tab === c ? 'true' : undefined}
                onClick={() => {
                  setTab(c)
                  setPage(0)
                }}
              >
                {c}
              </button>
            ))}
          </nav>

          {/* 2) 회색 띠. 레퍼런스의 자리에 **게임의 오늘 상황**을 넣는다 —
                 가짜 증권 링크를 늘어놓느니 실제로 읽을 값을 두는 편이 낫다. */}
          <div className="nv-strip">
            <span className="nv-strip-left">
              {day}일차<span className="nv-dot" aria-hidden="true" />
              {slot === 'afternoon' ? '오후' : '오전'}
            </span>
            <span className="nv-strip-right">
              오늘 생활비 {living.toLocaleString('ko-KR')}원
            </span>
          </div>

          {/* 3) 본문 2열: 왼쪽 기사 카드 / 오른쪽 지표 + 헤드라인 */}
          <div className="nv-newsbody">
            <ul className="nv-news">
              {newsPage.lead.map((item, i) => (
                <li key={item.id} className={`nv-news-item nv-news-${item.kind}`}>
                  {/* 레퍼런스의 썸네일 자리. 사진이 없으므로 **매체 머리글자 타일**을 둔다 —
                      회색 네모를 깔면 "이미지 로딩 실패"로 읽힌다. */}
                  <span className="nv-thumb" aria-hidden="true">
                    {(item.source ?? '네').slice(0, 1)}
                  </span>
                  <span className="nv-news-body">
                    <span className="nv-news-text">
                      {NEWS_TAGS[item.kind] && (
                        <span className={`nv-tag nv-tag-${item.kind}`}>{NEWS_TAGS[item.kind]}</span>
                      )}
                      {item.headline}
                    </span>
                    <span className="nv-news-meta">
                      {item.source ?? '네이놈'}
                      <span className="nv-dot" aria-hidden="true" />
                      {/* 시각은 인덱스에서 뽑는다 — Date를 쓰면 창을 열 때마다 바뀌어
                          결정성이 깨지고 "탐색은 무료"라는 규칙과도 어긋나 보인다. */}
                      {8 + i * 17}분 전
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="nv-market">
              {/* 레퍼런스의 코스피·코스닥 자리 = **게임의 지표 3종**. 전부 실제 값이다. */}
              <div className="nv-index-row">
                {INDICES.map((idx) => (
                  <div key={idx.label} className={`nv-index nv-index-${idx.tone}`}>
                    <span className="nv-index-label">{idx.label}</span>
                    <span className="nv-index-value">{idx.value}</span>
                    {/* 색만으로 좋고 나쁨을 알리지 않는다 — 부호와 단위가 문구에 들어 있다. */}
                    <span className="nv-index-delta">{idx.delta}</span>
                  </div>
                ))}
              </div>

              <ul className="nv-heads">
                {newsPage.rest.map((item) => (
                  <li key={item.id} className="nv-head-item">
                    {item.headline}
                  </li>
                ))}
              </ul>
              <p className="nv-market-note">오늘의 소식입니다.</p>
            </div>
          </div>

          {/* 4) 페이지 넘김. 순환하므로 끝에서 눌러도 막히지 않는다. */}
          <div className="nv-pager">
            <button
              type="button"
              className="nv-pager-btn"
              onClick={() => setPage(newsPage.page - 1)}
              aria-label="이전 뉴스"
            >
              <span className="nv-chev nv-chev-prev" aria-hidden="true" />
            </button>
            <span className="nv-pager-text">
              뉴스 더보기 <b>{newsPage.page + 1}</b>/{newsPage.pageCount}
            </span>
            <button
              type="button"
              className="nv-pager-btn"
              onClick={() => setPage(newsPage.page + 1)}
              aria-label="다음 뉴스"
            >
              <span className="nv-chev nv-chev-next" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/*
          배너존. 광고 배너를 누르면 하루 한 번 100원을 받는다(설계자 지시).
          ⚠️ 여기가 **브라우저가 게임 상태를 바꾸는 유일한 자리**다. 그래도 "탐색은 무료"는
          지켜진다 — 턴을 쓰지 않기 때문이다. 제한과 금액은 systems/turn.ts가 정한다.
        */}
        <section className="nv-banners nv-col-side" aria-label="배너">
          {bannersFor('side')
            .filter((banner) => !banner.scam || !infected)
            .map((banner) => (
              <BannerButton
                key={banner.id}
                banner={banner}
                canClaim={canClaim}
                onClaim={claimAd}
                onScam={infect}
                onNavigate={onNavigate}
              />
            ))}
        </section>
      </div>

      {/*
        뉴스 아래 **가로 배너 띠**(설계자 지시). 위가 아니라 아래인 것이 규칙이다 —
        위에 눕히면 첫 화면이 광고로 채워져 "뉴스가 주인공"이 깨진다(`nv-columns` 주석).

        ⚠️ **이 띠의 배너 둘은 광고가 아니라 사이트 입구다**(2026-08-08 설계자 지시):
        먼바다투어 → 여행 예약, 노24 → 공연 예매. 그래서 보상을 주지 않고 이동만 한다
        (`Banner.siteId`). 옆 배너존(`side`)은 여전히 광고이고 보상 경로는 그쪽 하나다.
      */}
      <WideStrip canClaim={canClaim} onClaim={claimAd} onNavigate={onNavigate} />

      {/*
        하단 소개 섹션. 알바·쇼핑·은행처럼 **게임의 돈 흐름이 걸린 곳**은 아이콘 하나로는
        무엇을 하는 곳인지 알 수 없어 퀵메뉴에서 빼고 여기로 내렸다(설계자 지시).
        카드 = [썸네일] + [주체 칩 · 제목 · 설명 두 줄] — 레퍼런스와 같은 구성이다.
      */}
      <section className="nv-promos" aria-label="서비스 소개">
        {PROMO_SITES.map((site) => (
          <PromoCard key={site.id} site={site} onNavigate={onNavigate} />
        ))}
      </section>
        </>
      )}
    </div>
  )
}


/**
 * 뉴스 아래 **가로 띠 — 슬라이드**(설계자 지시로 2026-08-08에 나란히 놓기에서 바뀌었다).
 *
 * ⚠️ **자리가 하나뿐이라 슬라이드가 됐다.** 배너가 넷인데 나란히 놓으면 한 장이
 * 320px 밑으로 내려가 보조 문구가 두 줄로 접힌다 — 띠의 뜻(한 줄로 읽히는 입구)이 깨진다.
 *
 * ⚠️ **자동 넘김은 `prefers-reduced-motion`에서 멈춘다.** 움직임을 줄여 달라는 사람에게
 * 7초마다 화면이 바뀌는 것은 그 요청을 정면으로 어기는 일이다. 그때도 컨트롤은 살아 있어
 * 넷을 다 볼 수 있다(기능을 빼는 것이 아니라 **저절로 움직이는 것만** 뺀다).
 *
 * ⚠️ **손이 닿아 있으면 멈춘다**(hover·focus). 읽는 중에 넘어가면 슬라이드가 정보를 주는
 * 것이 아니라 뺏는 장치가 된다.
 *
 * ⚠️ **한 장이면 컨트롤을 안 그린다** — 눌러도 아무 일 없는 버튼은 이 프로젝트에서 금지다.
 */
function WideStrip({
  canClaim,
  onClaim,
  onNavigate,
}: {
  canClaim: boolean
  onClaim: () => void
  onNavigate: (siteId: string) => void
}) {
  const banners = bannersFor('wide')
  const [at, setAt] = useState(0)
  /** 손이 닿아 있는가(hover·focus). 닿아 있으면 자동 넘김을 쉰다. */
  const [held, setHeld] = useState(false)
  const labelId = useId()

  const count = banners.length
  const go = (next: number) => setAt(((next % count) + count) % count)

  useEffect(() => {
    if (count < 2 || held) return
    // 움직임을 줄여 달라고 한 사람에게는 저절로 넘기지 않는다.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setAt((i) => (i + 1) % count), WIDE_ROTATE_MS)
    return () => clearInterval(id)
  }, [count, held])

  if (!count) return null
  const banner = banners[Math.min(at, count - 1)]

  return (
    <section
      className="nv-wide"
      aria-roledescription="캐러셀"
      aria-labelledby={labelId}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <h2 className="nv-sr-only" id={labelId}>
        띠 배너
      </h2>
      {/* 슬라이드 자체. 키는 배너 id라 바뀔 때 판이 새로 그려진다(그라데이션이 섞이지 않는다). */}
      <div className="nv-wide-slide" aria-live="polite">
        <BannerButton
          key={banner.id}
          banner={banner}
          wide
          canClaim={canClaim}
          onClaim={onClaim}
          onNavigate={onNavigate}
        />
      </div>

      {count > 1 && (
        <div className="nv-wide-ctl">
          <button
            type="button"
            className="nv-wide-arrow"
            onClick={() => go(at - 1)}
            aria-label="이전 배너"
          >
            <span className="nv-chev nv-chev-prev" aria-hidden="true" />
          </button>
          {/* 점은 위치 표시이자 이동 수단이다 — 몇 장 중 몇 번째인지 글자로도 읽어 준다. */}
          <ul className="nv-wide-dots">
            {banners.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`nv-wide-dot${i === at ? ' nv-wide-dot-on' : ''}`}
                  aria-current={i === at ? 'true' : undefined}
                  aria-label={`${i + 1}번째 배너: ${b.brand}`}
                  onClick={() => go(i)}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="nv-wide-arrow"
            onClick={() => go(at + 1)}
            aria-label="다음 배너"
          >
            <span className="nv-chev nv-chev-next" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * 배너 하나. **세로 배너존과 가로 띠가 같은 부품을 쓴다** — 자리가 둘이 되면서 각자
 * 그리면 보상 문구(`AD +100원` / `오늘 받음` / `공지`)가 반드시 한쪽만 낡는다.
 * 다른 것은 판 모양(`wide`)뿐이고, 판정과 문구는 여기 한 곳에서 나온다.
 *
 * ⚠️ **보상 판정은 `canClaimAdBonus` 하나다.** 배너가 몇 개든 하루 한 번이므로
 * 여기서 받으면 다른 배너들이 함께 잠긴다(자리 수만큼 벌 수 있으면 상한이 뜻을 잃는다).
 */
function BannerButton({
  banner,
  wide = false,
  canClaim,
  onClaim,
  onScam,
  onNavigate,
}: {
  banner: Banner
  wide?: boolean
  canClaim: boolean
  onClaim: () => void
  /** 스캠 배너를 눌렀다. 가로 띠에는 스캠이 없어 **옵셔널이다**(없으면 그리지도 않는다). */
  onScam?: () => void
  onNavigate: (siteId: string) => void
}) {
  /*
   * 배너는 넷 중 하나다: **광고**(누르면 보상) / **이동용**(누르면 그 사이트로) /
   * **스캠**(누르면 감염) / **공지**.
   * ⚠️ 둘을 겸하지 않는다(`Banner.siteId`·`Banner.scam` 주석) — 뱃지 글자가 넷을 구분한다.
   */
  const rewardable = banner.reward === true
  const done = rewardable && !canClaim
  const link = banner.siteId
  const scam = banner.scam === true
  return (
    <button
      type="button"
      className={`nv-banner${wide ? ' nv-banner-wide' : ''}`}
      style={{ background: banner.gradient }}
      onClick={() => {
        if (link) onNavigate(link)
        else if (scam) onScam?.()
        else if (rewardable) onClaim()
      }}
      disabled={done}
      /* 무슨 일이 일어나는지 문구로 알린다 — 배너 그림만 보고는 알 수 없다.
         ⚠️ **스캠은 광고 문구를 그대로 둔다**: 여기서 "감염됩니다"라고 적으면 함정이
         아니라 안내가 된다. 대신 뱃지 글자가 보상 배너와 달라 읽으면 알아볼 수 있다. */
      title={
        link
          ? `${banner.brand}(으)로 이동합니다`
          : rewardable
            ? done
              ? '오늘은 이미 받았습니다'
              : `클릭하면 ${AD_BONUS_MONEY}원`
            : banner.headline
      }
    >
      <span className="nv-banner-brand">{banner.brand}</span>
      <span className="nv-banner-head">{banner.headline}</span>
      {banner.sub && <span className="nv-banner-sub">{banner.sub}</span>}
      <span className="nv-banner-badge">
        {link
          ? '바로가기'
          : scam
            ? 'AD 경품'
            : rewardable
              ? done
                ? '오늘 받음'
                : `AD +${AD_BONUS_MONEY}원`
              : '공지'}
      </span>
    </button>
  )
}

/**
 * 상단 **쇼핑 띠**. 레퍼런스는 실제 포털의 쇼핑 섹션이고 **레퍼런스가 스펙이다**:
 * 테두리 상자 하나 안에 [제목 + 가게 링크 줄 ····· 쪽 번호] / [왼쪽 회색 목록 | 진열 타일 5개].
 *
 * ## 이 띠가 지키는 규칙
 * ⚠️ **모든 컨트롤이 실제로 동작한다**(포털의 장식 금지 규칙). 제목 옆 가게 이름은 그 사이트로
 * 가고, 왼쪽 목록은 타일을 **진짜로 거르며**, 화살표는 진짜로 넘어간다. 레퍼런스의
 * [장바구니] 자리에는 갈 데 없는 링크 대신 **배송 규칙(다음 날 도착)**을 사실로 적는다.
 *
 * ⚠️ **여기서는 아무것도 살 수 없다.** 타일을 누르면 그 물건을 파는 사이트로 갈 뿐이다 —
 * 주문은 가게에서만 일어난다(브라우저가 게임 상태를 바꾸는 자리를 늘리지 않는다).
 *
 * ⚠️ **거르는 축(`unlocks`)을 새로 만들지 않았다** — "활동을 여는 물건인가"는
 * `activitiesUnlockedBy`가 이미 아는 사실이고, 가게 진열도 같은 축으로 갈려 있다.
 */
function ShopStrip({ onNavigate }: { onNavigate: (siteId: string) => void }) {
  /** null = 전체. 값은 "활동을 여는 물건인가". */
  const [only, setOnly] = useState<boolean | null>(null)
  const [page, setPage] = useState(0)

  const items = BUYABLE_ITEMS.filter((i) => only === null || unlocksActivity(i.id) === only)
  const pageCount = Math.max(1, Math.ceil(items.length / SHOP_STRIP_TILES))
  /* 뉴스 페이저와 같은 규칙: 끝에서 눌러도 막히지 않고 순환한다. */
  const at = ((page % pageCount) + pageCount) % pageCount
  const tiles = items.slice(at * SHOP_STRIP_TILES, (at + 1) * SHOP_STRIP_TILES)

  const filter = (next: boolean | null) => {
    setOnly(next)
    setPage(0)
  }

  return (
    <section className="nv-shop" aria-labelledby="nv-shop-title">
      <header className="nv-shop-head">
        <h2 className="nv-shop-title" id="nv-shop-title">
          쇼핑
        </h2>
        {/* 레퍼런스의 카테고리 링크 줄 자리 = **가게로 가는 링크**. 갈 데가 실제로 있다. */}
        {STORE_SITES.map((site) => (
          <button
            key={site.id}
            type="button"
            className="nv-shop-link"
            onClick={() => onNavigate(site.id)}
          >
            {site.promo?.tag ?? site.title}
          </button>
        ))}
        <span className="nv-shop-pager">
          <span className="nv-shop-page">
            <b>{at + 1}</b>/{pageCount}
          </span>
          <button
            type="button"
            className="nv-pager-btn"
            onClick={() => setPage(at - 1)}
            aria-label="이전 상품"
          >
            <span className="nv-chev nv-chev-prev" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="nv-pager-btn"
            onClick={() => setPage(at + 1)}
            aria-label="다음 상품"
          >
            <span className="nv-chev nv-chev-next" aria-hidden="true" />
          </button>
        </span>
      </header>

      <div className="nv-shop-body">
        {/* 레퍼런스의 쇼핑몰 목록 자리 = **진열 구역 필터**. 누르면 타일이 실제로 걸린다. */}
        <nav className="nv-shop-side" aria-label="진열 구역">
          {SHOP_STRIP_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={`nv-shop-cat${only === f.value ? ' nv-shop-cat-on' : ''}`}
              aria-pressed={only === f.value}
              onClick={() => filter(f.value)}
            >
              {f.label}
            </button>
          ))}
          {/* 레퍼런스의 [주문배송 · 장바구니] 자리 — 링크 대신 이 게임이 지키는 사실이다. */}
          <p className="nv-shop-note">주문한 물건은 다음 날 도착</p>
        </nav>

        <ul className="nv-shop-tiles">
          {tiles.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="nv-shop-tile"
                onClick={() => onNavigate(storeSiteIdOf(item))}
                title={item.desc}
              >
                {/* 사진이 없으므로 아이콘 판이다(회색 네모를 깔면 "로딩 실패"로 읽힌다). */}
                <span className="nv-shop-thumb">
                  <AppIcon name={item.icon} size={44} />
                </span>
                <span className="nv-shop-name">{item.name}</span>
                <span className="nv-shop-price">{item.price.toLocaleString('ko-KR')}원</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * 사이트로 가는 소개 카드. 하단 소개 섹션이 쓴다.
 */
function PromoCard({ site, onNavigate }: { site: Site; onNavigate: (siteId: string) => void }) {
  return (
    <button type="button" className="nv-promo" onClick={() => onNavigate(site.id)}>
      {/* 사진이 없으므로 그라데이션 면 + 사이트 아이콘으로 채운다 —
          회색 네모를 깔면 "이미지 로딩 실패"로 읽힌다. */}
      <span className="nv-promo-thumb" style={{ background: site.promo!.gradient }}>
        <AppIcon name={site.icon} size={38} />
      </span>
      <span className="nv-promo-body">
        <span className="nv-promo-tag">{site.promo!.tag}</span>
        <span className="nv-promo-title">{site.promo!.title}</span>
        <span className="nv-promo-desc">{site.promo!.desc}</span>
      </span>
    </button>
  )
}

/**
 * 검색 결과 화면.
 *
 * ⚠️ 결과는 **게임 안에 실제로 있는 것**만이다(systems/search.ts 참조).
 * 그럴듯한 가짜 결과를 채우면 눌러도 갈 데가 없는 링크가 생기고,
 * "이 게임에 그런 게 있나?" 하는 오해를 만든다.
 */
function SearchResults({
  query,
  result,
  onNavigate,
  onSearch,
}: {
  query: string
  result: ReturnType<typeof search>
  onNavigate: (siteId: string) => void
  onSearch: (term: string) => void
}) {
  if (result.total === 0) {
    return (
      <section className="nv-results" aria-label="검색 결과">
        {/* ux `empty-states`: 없다는 말만 하지 않고 다음에 뭘 하면 되는지 함께 준다. */}
        <p className="nv-empty-head">'{query}'에 대한 검색 결과가 없습니다.</p>
        <p className="nv-empty-sub">
          단어를 바꾸거나, 아래 실시간 검색어를 눌러 보세요.
        </p>
        <div className="nv-empty-terms">
          {TRENDING_TERMS.slice(0, 4).map((t) => (
            <button key={t.label} type="button" className="nv-chip" onClick={() => onSearch(t.label)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="nv-results" aria-label="검색 결과">
      {result.sites.length > 0 && (
        <div className="nv-rgroup">
          <h2 className="nv-rhead">사이트</h2>
          {result.sites.map((s) => (
            <button key={s.id} type="button" className="nv-rsite" onClick={() => onNavigate(s.id)}>
              <AppIcon name={s.icon} size={32} />
              <span className="nv-rsite-body">
                <span className="nv-rsite-title">{s.title}</span>
                <span className="nv-rsite-url">{s.url}</span>
                {s.notice && <span className="nv-rsite-desc">{s.notice}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {result.news.length > 0 && (
        <div className="nv-rgroup">
          <h2 className="nv-rhead">뉴스</h2>
          <ul className="nv-rnews">
            {result.news.map((n) => (
              <li key={n.id}>
                <span className="nv-rnews-text">{n.headline}</span>
                {n.source && <span className="nv-rnews-src">{n.source}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.related.length > 0 && (
        <div className="nv-rgroup">
          <h2 className="nv-rhead">관련 검색어</h2>
          <div className="nv-empty-terms">
            {result.related.map((t) => (
              <button key={t} type="button" className="nv-chip" onClick={() => onSearch(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
