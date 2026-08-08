import type { IconName } from '../types/game'

/**
 * 네이놈증권 — 종목과 수치.
 *
 * ⚠️ **이 게임에서 주식은 "돈을 불리는 곳"이 아니라 분산 장치다**(복권과 같은 부류이되
 * 성격이 반대다: 복권은 기대값이 음수인 대신 아주 낮은 확률로 크게 터지고, 주식은
 * **상한이 걸린 채로** 사고팔 수 있다). 은행·부동산과 같이 **턴을 쓰지 않는다.**
 *
 * ⚠️ **상호는 전부 지어낸 것이고, 게임 세계에 이미 있는 이름을 재사용한다** —
 * 알바몬 공고의 한밤물류·시집이가 그대로 상장돼 있다. 새 상호를 만드는 것보다
 * "내가 알바하던 그 회사"가 상장돼 있는 편이 세계가 하나로 읽힌다.
 *
 * ⚠️ `Math.random`·`Date` 금지 — 시세는 **날짜의 순수 함수**다(`systems/stocks.ts`).
 */

export interface Stock {
  id: string
  name: string
  /** 종목 코드. 표시 전용이고 계산에 쓰이지 않는다. */
  code: string
  icon: IconName
  /** 기준가(원). 시세는 이 값을 중심으로 흔들린다. */
  base: number
  /**
   * 변동폭(0~1). 기준가 대비 최대 몇 %까지 흔들리는가.
   * ⚠️ **이 값과 `maxShares`의 곱이 "판은 반드시 끝난다"를 지탱한다**(아래 주석).
   */
  volatility: number
  /**
   * **종목당 보유 상한(주).**
   *
   * ⚠️ 이 상한이 없으면 소지금이 늘수록 포지션이 커져 **완벽한 타이밍 매매가 복리로
   * 폭발한다** — 그 순간 물가 상승이라는 이 게임의 종결 장치가 무의미해진다.
   * 상한이 곧 "주식으로 하루에 벌 수 있는 최대치"의 뚜껑이고,
   * `stocks.test.ts`가 그 뚜껑이 마지막 물가 구간 생활비보다 낮다는 것을
   * **데이터에서 직접 계산해** 지킨다(은행 이율 부등식·트위터 팔로워 상한과 같은 장치).
   */
  maxShares: number
  /** 한 줄 소개. 종목을 고르는 근거가 이름뿐이면 고르는 게임이 아니다. */
  desc: string
}

export const STOCKS: Stock[] = [
  {
    id: 'nemo',
    name: '네모전자',
    code: '00521',
    icon: 'fluent-color:board-24',
    base: 42000,
    // 대형주. 잘 안 움직이는 대신 상한도 낮다(비싸서 몇 주 못 산다).
    volatility: 0.04,
    maxShares: 2,
    desc: '이 나라 사람 절반이 쓰는 물건을 만든다. 잘 움직이지 않는다.',
  },
  {
    id: 'hanbam',
    name: '한밤물류',
    code: '013807',
    icon: 'fluent-color:toolbox-24',
    base: 18000,
    volatility: 0.07,
    maxShares: 4,
    desc: '새벽마다 트럭이 나간다. 알바로 가 본 적 있다면 그 회사가 맞다.',
  },
  {
    id: 'neulbom',
    name: '늘봄바이오',
    code: '246110',
    icon: 'fluent-color:beaker-24',
    base: 9500,
    // 가장 크게 흔들린다 — 싸고 많이 살 수 있어 "고르는 재미"가 여기 있다.
    volatility: 0.11,
    maxShares: 6,
    desc: '임상 소식 하나에 오르내린다. 그 소식이 언제 오는지는 아무도 모른다.',
  },
  {
    id: 'sizib',
    name: '시집이엔터',
    code: '035907',
    icon: 'fluent-color:video-24',
    base: 26000,
    volatility: 0.06,
    maxShares: 2,
    desc: '극장에 걸리는 것 중 몇 편이 여기 것이다. 여름에 강하다.',
  },
]

export function findStock(id: string): Stock | undefined {
  return STOCKS.find((s) => s.id === id)
}

/**
 * 거래 수수료(사고팔 때 각각). **잦은 매매를 깎는 장치다** —
 * 없으면 하루에 사고파는 것이 언제나 이득이라 시세를 읽을 이유가 사라진다.
 */
export const TRADE_FEE = 0.005

/** 시세 차트에 그릴 지난 일수. 미래는 **한 칸도** 그리지 않는다(아래 주석). */
export const CHART_DAYS = 14

/** 거래 내역에 남기는 최대 줄 수. 오래된 것부터 잘라 낸다(은행 원장과 같은 규칙). */
export const STOCK_LOG_LIMIT = 20
