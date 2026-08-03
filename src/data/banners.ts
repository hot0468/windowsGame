/**
 * 포털 배너존의 정적 콘텐츠.
 *
 * ⚠️ **이미지 파일을 쓰지 않는다.** 아이콘·바탕화면과 같은 이유다: 외부 이미지를 받아 오면
 * 오프라인 규칙이 깨지고, 창 크기가 달라질 때마다 잘리거나 흐려진다. 배너는 CSS
 * 그라데이션 + 글자만으로 그린다(용량 0, 무한 확대, 테마 대응).
 *
 * ⚠️ **실존 브랜드를 쓰지 않는다.** 가짜 광고에 진짜 회사 이름·로고를 넣으면 그 회사가
 * 하지 않은 말을 하게 만드는 것이다. 전부 지어낸 상호만 쓴다.
 */
export interface Banner {
  id: string
  /** 작은 윗줄 — 광고주 이름 자리. */
  brand: string
  /** 큰 문구. */
  headline: string
  /** 보조 문구(조건·부연). */
  sub?: string
  /**
   * true면 클릭 시 보상(하루 한 번 100원)을 준다.
   * 광고가 아닌 배너(공지 등)는 눌러도 보상이 없고, 그 사실을 라벨이 밝힌다.
   */
  reward?: boolean
  /** 배경 그라데이션 각도·색 두 단. 배너마다 인상이 달라야 "여러 광고"로 읽힌다. */
  gradient: string
}

export const BANNERS: Banner[] = [
  {
    id: 'resort',
    brand: '해맑은리조트',
    headline: '창립회원을 모집합니다',
    sub: '지금 신청하면 첫해 이용료 반값',
    reward: true,
    gradient: 'linear-gradient(135deg, #1b6ca8 0%, #3aa0d1 55%, #7fc8e8 100%)',
  },
  {
    id: 'weather',
    brand: '기상특보',
    headline: '내일 아침 한파주의보',
    sub: '외출 시 방한에 유의하세요',
    gradient: 'linear-gradient(135deg, #37474f 0%, #546e7a 100%)',
  },
  {
    id: 'mart',
    brand: '컬리엔마트',
    headline: '첫 구매는 반값쿠폰',
    sub: '첫 구매·멤버십 한정, 최대 5천원',
    reward: true,
    gradient: 'linear-gradient(135deg, #6a2f8a 0%, #c2529a 100%)',
  },
]
