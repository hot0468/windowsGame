/**
 * 포털 뉴스 영역의 정적 콘텐츠.
 * 뉴스는 게임의 알림 창구다(설계 문서 3.4) — 게임 상태에서 파생되는 항목은
 * `src/systems/news.ts`가 만들고, 여기에는 분위기용 고정 기사·광고만 둔다.
 */

/**
 * 뉴스 항목의 성격.
 * - notice: 게임 상태에서 파생된 예고(물가 인상 등). 목록 맨 위에 고정된다.
 * - article: 분위기용 기사
 * - ad: 광고. 기사와 섞이면 안 되므로 라벨을 붙여 구분한다(ux `color-not-only`:
 *   색만으로 구분하지 않고 [광고] 텍스트를 함께 단다)
 */
export type NewsKind = 'notice' | 'article' | 'ad'

/**
 * 기사 분야. 뉴스 카드 상단의 탭이 이 값으로 **실제로 목록을 거른다** —
 * 눌러도 아무 일이 없는 장식 탭을 두지 않기 위해 데이터에 분야를 넣었다.
 * 순서가 곧 탭 순서다.
 */
export const NEWS_CATEGORIES = ['경제', '취업', '생활'] as const
export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export interface NewsItem {
  id: string
  kind: NewsKind
  headline: string
  /**
   * 표시할 매체 이름. 실제 포털의 기사 줄에는 반드시 출처가 붙고, 그 한 줄이
   * "제목 목록"을 "뉴스"로 보이게 한다. 광고에는 붙이지 않는다 — 광고에 매체명을 달면
   * 기사로 위장하는 꼴이 된다(ux `color-not-only`와 같은 취지: 성격을 감추지 않는다).
   */
  source?: string
  /** 분야 탭용. 없으면 어느 탭에서도 걸리지 않고 '전체'에서만 보인다(속보·광고). */
  category?: NewsCategory
}

/**
 * 분위기용 기사·광고 풀.
 * 날짜로 회전시켜 노출하므로(systems/news.ts) 노출 칸 수보다 넉넉해야 한다 —
 * 개수가 부족하면 매일 같은 목록이 떠서 "세상이 흐른다"는 인상이 사라진다.
 */
export const NEWS_POOL: NewsItem[] = [
  { id: 'jobs-freeze', kind: 'article', headline: '취업 시장 한파, 신입 채용 30% 감소', source: '한국경제', category: '취업'   },
  { id: 'rent-up', kind: 'article', headline: '원룸 월세 또 올라... 1인 가구 부담 가중', source: '서울신문', category: '생활'   },
  { id: 'ramen-up', kind: 'article', headline: '장바구니 물가 비상, 라면값 3개월 연속 상승', source: '매일경제', category: '생활'   },
  { id: 'cert-boom', kind: 'article', headline: '자격증 응시 인원 역대 최대... "일단 따고 본다"', source: '연합뉴스', category: '취업'   },
  { id: 'night-shift', kind: 'article', headline: '심야 알바 지원자 급증, 경쟁률 4대 1', source: '노동일보', category: '취업'   },
  { id: 'burnout-report', kind: 'article', headline: '20대 번아웃 실태조사 발표... "쉬는 법을 모른다"', source: '헬스조선', category: '생활'   },
  { id: 'sns-star', kind: 'article', headline: '평범한 직장인, 하루아침에 팔로워 10만', source: '디지털데일리', category: '경제'   },
  { id: 'ad-signup', kind: 'ad', headline: '지금 가입하면 10만원 즉시 지급!' },
  { id: 'ad-loan', kind: 'ad', headline: '무이자 30일, 급할 때 딱 한 번만' },
  { id: 'ad-class', kind: 'ad', headline: '한 달 완성 고소득 자격증 강의 오픈' },
]

/** 뉴스 영역에 한 번에 노출할 항목 수(상태 예고 1건 + 풀에서 회전). */
export const NEWS_VISIBLE_COUNT = 4

/**
 * 실시간 검색어.
 * siteId가 있으면 클릭 시 그 사이트로 이동하고, 없으면 "검색 결과가 없습니다"로 끝난다 —
 * 자유 검색은 대응 키워드가 무한히 필요해 1차 구현에서 제외된 항목이다(설계 문서 6장).
 */
export interface TrendingTerm {
  label: string
  siteId?: string
}

export const TRENDING_TERMS: TrendingTerm[] = [
  { label: '단기 고수익 알바', siteId: 'albamon' },
  { label: '공무원 시험 일정' },
  { label: '자취방 생활비 줄이는 법' },
  { label: '무료 강의 사이트', siteId: 'slowcampus' },
  { label: '번아웃 자가진단' },
  { label: '중고 거래 꿀팁', siteId: 'shopping' },
]

/**
 * 검색창을 눌렀을 때 뜨는 **검색어 추천**.
 *
 * ⚠️ **실시간 검색어(`TRENDING_TERMS`)와 다른 목록이다**(설계자 지시). 실검은 "지금 사람들이
 * 많이 찾는 것"이고 이건 **"여기서 찾을 수 있는 것"**이라 성격이 다르다 — 그래서 대부분
 * `siteId`를 갖는다. 같은 목록으로 묶으면 어도비를 넣는 순간 트위터 트렌드와 실검 줄에도
 * 뜨는데, 거기서는 "지금 화제인 검색어"라는 거짓말이 된다.
 *
 * ⚠️ **어도비가 여기 있는 것이 어도비 사이트의 입구다**(2026-08-08 설계자 지시로 하단 소개
 * 카드를 뺐다). 구독을 안 하면 포토샵도 프리미어도 없고 그몽 디자인 일감도 잠기는데,
 * 결제 화면으로 갈 길이 없으면 그 잠금이 막다른 골목이 된다 — `subscription.test.ts`가
 * 순회로 지킨다.
 */
export const SEARCH_SUGGESTIONS: TrendingTerm[] = [
  { label: '어도비', siteId: 'adobe' },
  /* 줌도 어도비와 같은 부류다 — 즐겨찾기에 없는 사이트라 **여기가 유일한 지름길**이다
     (직접 '화상회의'·'zoom'을 쳐도 닿는다. 판정은 `systems/search.ts`). */
  { label: '화상회의', siteId: 'zoom' },
  { label: '공모전', siteId: 'contest' },
  { label: '행사', siteId: 'expo' },
  { label: '부업 외주', siteId: 'gmong' },
  { label: '단기 알바', siteId: 'albamon' },
  { label: '정규직 채용', siteId: 'flea' },
  { label: '자격증 시험', siteId: 'onet' },
  { label: '전세 보증금 계산', siteId: 'realty' },
  { label: '주식 시세', siteId: 'stock' },
  { label: '번아웃 자가진단' },
]
