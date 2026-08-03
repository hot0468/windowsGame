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

export interface NewsItem {
  id: string
  kind: NewsKind
  headline: string
}

/**
 * 분위기용 기사·광고 풀.
 * 날짜로 회전시켜 노출하므로(systems/news.ts) 노출 칸 수보다 넉넉해야 한다 —
 * 개수가 부족하면 매일 같은 목록이 떠서 "세상이 흐른다"는 인상이 사라진다.
 */
export const NEWS_POOL: NewsItem[] = [
  { id: 'jobs-freeze', kind: 'article', headline: '취업 시장 한파, 신입 채용 30% 감소' },
  { id: 'rent-up', kind: 'article', headline: '원룸 월세 또 올라... 1인 가구 부담 가중' },
  { id: 'ramen-up', kind: 'article', headline: '장바구니 물가 비상, 라면값 3개월 연속 상승' },
  { id: 'cert-boom', kind: 'article', headline: '자격증 응시 인원 역대 최대... "일단 따고 본다"' },
  { id: 'night-shift', kind: 'article', headline: '심야 알바 지원자 급증, 경쟁률 4대 1' },
  { id: 'burnout-report', kind: 'article', headline: '20대 번아웃 실태조사 발표... "쉬는 법을 모른다"' },
  { id: 'sns-star', kind: 'article', headline: '평범한 직장인, 하루아침에 팔로워 10만' },
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
  { label: '무료 강의 사이트', siteId: 'lecture' },
  { label: '번아웃 자가진단' },
  { label: '중고 거래 꿀팁', siteId: 'shopping' },
]
