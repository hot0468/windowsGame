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
  /**
   * 어느 자리에 걸리는가. **생략 = 'side'**(뉴스 옆 세로 배너존)이라 기존 배너는 그대로다.
   * `'wide'`는 뉴스 아래 **가로로 긴 띠**다(설계자 지시).
   *
   * ⚠️ **이건 분류 축이지 목록이 아니다.** `BANNERS`가 여전히 배너 전체의 단일 출처이고
   * 자리별 목록은 `bannersFor`가 **파생**시킨다(`ShopItem.store` → `buyableFor`와 같은 규칙).
   * 자리마다 배열을 따로 두면 배너 하나를 옮길 때 두 곳을 고쳐야 하고, 한쪽만 고치면
   * 같은 광고가 두 자리에 동시에 뜬다.
   */
  placement?: BannerPlacement
}

/** 배너가 걸리는 자리. 'side' = 뉴스 옆 세로 배너존, 'wide' = 뉴스 아래 가로 띠. */
export type BannerPlacement = 'side' | 'wide'

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
  {
    /*
     * 뉴스 아래 가로 띠 광고(설계자 지시). 여행사인 것이 이 자리에 맞는다 —
     * 가로로 긴 판은 원래 "멀리 가는 것"을 파는 광고가 차지하는 자리이고,
     * **이 게임의 주인공이 절대 못 가는 것**이라 문구가 저절로 자기 몫을 한다.
     *
     * ⚠️ **보상 경로를 새로 만들지 않는다.** `reward: true`는 옆 배너들과 **같은**
     * 하루 한 번 100원(`systems/turn.ts`의 `canClaimAdBonus`/`claimAdBonus`)을 가리킨다 —
     * 자리가 늘었다고 하루에 두 번 받게 되면 그 상한이 뜻을 잃는다.
     *
     * ⚠️ 지어낸 상호다(실존 브랜드 금지). 그라데이션은 심해 남색 → 바다 파랑 → 청록으로
     * 옆 배너 셋(하늘 파랑 / 회색 / 자주)과 인상이 갈린다.
     * ⚠️ **밝은 쪽 끝을 계산해서 잡았다**: 가로 배너는 글자가 띠 전체에 걸쳐 눕기 때문에
     * **모든 정지점 위에서 흰 글자가 서야 한다.** 처음 골랐던 민트(#6fc7b6)는 흰 글자
     * 대비가 1.98:1이라 버렸다. 지금 값은 #0b3a53 / #14708c(5.65:1) / #0f6f6a(6.02:1)이고,
     * `opacity: .85`가 걸리는 보조 문구도 가장 밝은 끝에서 4.82:1로 AA를 넘는다.
     */
    id: 'travel',
    brand: '먼바다투어',
    headline: '3박 5일 남태평양, 지금이 제일 쌉니다',
    sub: '12개월 무이자 · 수하물 20kg 무료 · 잔여 좌석 6석',
    reward: true,
    gradient: 'linear-gradient(100deg, #0b3a53 0%, #14708c 55%, #0f6f6a 100%)',
    placement: 'wide',
  },
]

/**
 * 그 자리에 걸리는 배너. ⚠️ **두 번째 출처를 만들지 않기 위한 파생 함수다**
 * (`buyableFor(store)`와 같은 규칙). `placement`를 생략한 배너는 세로 배너존이다 —
 * 기존 배너 정의를 건드리지 않기 위한 기본값.
 */
export function bannersFor(placement: BannerPlacement): Banner[] {
  return BANNERS.filter((b) => (b.placement ?? 'side') === placement)
}
