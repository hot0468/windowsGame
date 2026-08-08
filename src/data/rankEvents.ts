import type { GrowthStatKey, Stats } from '../types/game'
/* ⚠️ **타입만 가져온다**(`import type`) — `StatRank`는 `systems/rank.ts`에 살고, data가
   systems를 런타임으로 부르면 계층이 뒤집힌다. 타입 전용 import는 번들에 남지 않으므로
   그 규칙을 깨지 않는다. 등급 이름을 여기서 다시 적지 않는 것이 더 중요하다. */
import type { StatRank } from '../systems/rank'

/**
 * 랭크 이벤트 — **스탯이 어느 등급에 닿으면 한 번 일어나는 일.**
 *
 * ## 왜 별도 축인가
 * 기존 잠금은 전부 **절대값**을 본다(`Activity.requires`·`Thread.requires`). 그런데 등급은
 * **상한 대비 비율**이라(`systems/rank.ts`) 절대값으로 옮겨 적으면 같은 기준이 두 곳에
 * 생기고, 상한이 바뀌는 순간 한쪽만 낡는다. 그래서 조건을 `{key, rank}`로 적고
 * 판정은 `rankOf` 하나에게 맡긴다.
 *
 * ## ⚠️ 한 번만 일어난다
 * 겪은 이벤트는 `GameState.rankEvents`에 남고 다시 뜨지 않는다. 등급은 내려갈 수도 있는데
 * (평판은 마감을 놓치면 깎인다) 그때 이벤트가 되살아나면 오르내리기를 반복해 **무한히
 * 반복 수령**할 수 있다 — 소원(스탯 +100)이 걸린 이벤트가 있으므로 이 규칙이 곧 밸런스다.
 *
 * ## ⚠️ 이벤트가 스스로 무엇을 하지는 않는다
 * 여기 있는 것은 **무엇이 열리는가**뿐이고 실행은 각자의 자리가 한다:
 * - `kind: 'thread'` → 그 대화방이 목록에 뜬다(`systems/messages.ts`의 `threadVisible`).
 *   수락·주간 예약은 **이미 있는 오픈채팅 제안 구조**(`Thread.offer`의 `weekly`)가 그대로 한다.
 * - `kind: 'window'` → 그 창이 열린다(`gameStore`의 밤 정산 자리).
 * 새 실행 통로를 만들지 않는 것이 이 파일의 규칙이다.
 */

export interface RankEvent {
  id: string
  /** 이 스탯이 */
  key: GrowthStatKey
  /** 이 등급에 닿으면 일어난다(`below`면 이 등급 **이하**일 때). */
  rank: StatRank
  /**
   * 방향을 뒤집는다 — **그 등급 이하면** 일어난다(낮은 스탯의 대가).
   *
   * ## 왜 필요한가
   * 이 축은 여태 올린 것에만 보상을 줬다. 그래서 도덕을 0으로 두고 끝까지 가도 손해가
   * 없었고, 올릴 이유가 도감뿐인 스탯이 생겼다(2026-08-09 설계자 지시). **보상이 있으면
   * 대가도 있어야 대칭이 맞는다.**
   *
   * ⚠️ **`afterDay`와 반드시 짝으로 간다.** 시작값이 0이라 판이 열리는 순간 모든 스탯이
   * F다 — 날짜 조건이 없으면 1일차 밤에 대가가 통째로 터진다(`rankEvents.test.ts`가 지킨다).
   */
  below?: boolean
  /**
   * 이 날짜를 지나야 일어난다. 생략 = 언제든.
   *
   * ⚠️ 대가의 문턱은 **날짜지 스탯이 아니다**: "그때까지도 안 올렸다"가 조건이라서다.
   */
  afterDay?: number
  /**
   * 일어날 때 스탯에 얹는 몫. **대가(음수)에만 쓴다** — 보상을 여기 넣으면 소원(+100)과
   * 같은 축이 두 곳에 생긴다.
   *
   * ⚠️ **한 번만 난다**(`rankEvents` 기록이 곧 사용권). 그래서 액수를 작게 잡아도 되고,
   * 작아야 한다 — 대가는 판을 끝내는 것이 아니라 **안 올린 값을 치르게 하는 것**이다.
   */
  effects?: Partial<Stats>
  /**
   * 무엇이 열리는가.
   * - `thread`: 대화방이 열린다(그 안의 제안이 나머지를 한다).
   * - `offer`: **이미 있는 방의 제안 선택지 하나**가 열린다. 방을 새로 만들 자리가 아닌
   *   경우다 — 미용실 단골에게 모델 제안이 오는 것은 새 방이 아니라 그 방의 다음 말이다.
   * - `window`: 창이 하나 뜬다.
   * - `event`: **단발**이다. 도감(`data/events.ts`)에 한 줄 남기고 끝난다 — 여는 것이
   *   없고 겪었다는 사실이 전부인 일들이 여기 온다.
   */
  kind: 'thread' | 'offer' | 'window' | 'event'
  /**
   * `thread`면 `Thread.id`, `offer`면 `OfferOption.id`, `window`면 `WindowKind`,
   * `event`면 `data/events.ts`의 `GameEvent.id`.
   */
  target: string
}

/**
 * 랭크 이벤트 목록.
 *
 * ⚠️ **문턱을 고를 때 도달 가능성을 먼저 본다**(`rankEvents.test.ts`가 지킨다).
 * `C`는 상한의 10%이고 `A`는 50%다 — 상한 999인 스탯에서 A는 500이라 그 스탯에
 * 특화해야 겨우 닿는다. "아무도 볼 수 없는 이벤트"는 버그다.
 */
export const RANK_EVENTS: RankEvent[] = [
  {
    /*
     * 운동 C(=100). 러닝 한 번이 8이므로 13번쯤이면 닿는다 — 판 초중반이고, 그때
     * 러닝크루가 붙어 **주간 예약이 스스로 도는 첫 경험**이 된다(설계자 지시).
     */
    id: 'running-crew',
    key: 'athletics',
    rank: 'C',
    kind: 'thread',
    target: 'running-crew',
  },
  {
    /*
     * 감수성 A(=500). 주 공급원이 6~12/턴이라 특화해도 40턴 남짓 걸린다 — 판 후반이고,
     * 그만큼 갔을 때 **스탯 하나를 100 올려 주는** 보상이 붙는 것이 이 이벤트의 무게다.
     */
    id: 'shooting-star',
    key: 'sensitivity',
    rank: 'A',
    kind: 'window',
    target: 'wish',
  },
  {
    /*
     * 친화력 C(=100). 동아리가 6/턴이라 17번쯤이면 닿는다 — 사람을 만나며 논 사람에게
     * 이웃이 붙는 문턱이다.
     */
    id: 'neighbors',
    key: 'sociability',
    rank: 'C',
    kind: 'thread',
    target: 'neighbors',
  },
  {
    /*
     * 경제 B(=300). 경제 공부가 7/턴이라 43번쯤 — 주식 변동성 예보와 **같은 문턱이다**:
     * 시세를 읽기 시작하는 그 지점에서 같이 읽는 사람들이 붙는 편이 자연스럽다.
     */
    id: 'invest-club',
    key: 'finance',
    rank: 'B',
    kind: 'thread',
    target: 'invest-club',
  },
  {
    /*
     * 음악 A(=500). 작곡이 7/턴이라 특화해도 70턴 남짓 — 판 후반이고, 그때 밴드가 붙어
     * **혼자 쌓은 스탯이 팀의 숙련도로 갈아탄다**(설계자 지시: "음악 A면 밴드 영입 제안").
     * ⚠️ 오디션 도구·음원 공모전과 달리 **여기만 랭크를 본다** — 그몽 일감과 공모전은
     *    누구에게나 열려 있어야 음악이 "올릴 이유가 있는 스탯"이 된다.
     */
    id: 'band-recruit',
    key: 'music',
    rank: 'A',
    kind: 'thread',
    target: 'band-recruit',
  },
  {
    /*
     * 게임 C(=100). 게임 활동이 4/회라 25번쯤이면 닿는다 — 멘탈 회복처를 게임으로 쓴
     * 사람에게 자연스럽게 붙는 문턱이다(설계자 지시: "카톡으로 디스코드 초대").
     * ⚠️ 러닝크루와 **요일이 달라야 한다**(주간 예약이 같은 슬롯에서 부딪힌다).
     */
    id: 'raid-party',
    key: 'gaming',
    rank: 'C',
    kind: 'thread',
    target: 'raid-party',
  },
  {
    /*
     * 어휘력 C(=100). 독서가 주 공급원이고 6/회라 17번쯤이다.
     * ⚠️ **오픈카톡이다**(설계자 지시) — 모르는 사람들의 방이라 1:1 지인 방과 성격이 다르다.
     */
    id: 'book-club',
    key: 'vocabulary',
    rank: 'C',
    kind: 'thread',
    target: 'book-club',
  },
  {
    /*
     * 지식 A(=500). 상한 999의 절반이라 **지식에 특화해야 닿는다** — 과외(지식 60)보다
     * 훨씬 위이고, 그래서 여는 것도 알바가 아니라 강사 자리다.
     */
    id: 'academy-offer',
    key: 'knowledge',
    rank: 'A',
    kind: 'thread',
    target: 'academy',
  },
  {
    /*
     * 매력 A(=500). ⚠️ **새 방이 아니라 미용실 방의 제안 하나가 열린다**(설계자 지시:
     * "미용실에서 모델 제안"). 단골이 된 사람에게 오는 말이라 새 방을 만들면 그 맥락이
     * 사라진다 — `kind: 'offer'`가 생긴 이유가 이 한 줄이다.
     */
    id: 'salon-model',
    key: 'charm',
    rank: 'A',
    kind: 'offer',
    target: 'salon-model',
  },

  /* ── 단발 이벤트 9종 (2026-08-08) ──────────────────────────────────────
   * ⚠️ **여는 것이 없다.** 도감에 한 줄 남기는 것이 전부이고, 그래서 문턱을 낮게 잡아도
   * 밸런스가 안 흔들린다 — 스탯을 올린 사람에게 "그래서 무엇이 달라졌는가"를 말해 주는
   * 자리다. 돈·턴·활동을 주지 않는다(주려면 위의 `thread`/`offer`를 쓴다).
   * ⚠️ 문구·아이콘은 `data/events.ts`가 갖는다 — 여기는 문턱만 정한다.
   */
  {
    /* 평판 A(상한 100이라 =50). 트위터 계정에 인증 뱃지가 붙는 근거이기도 하다. */
    id: 'verified-badge',
    key: 'reputation',
    rank: 'A',
    kind: 'event',
    target: 'verified-badge',
  },
  {
    /* 예술 B(=300). 그림 30장쯤이라 그리는 판이면 중반에 닿는다. */
    id: 'gallery-call',
    key: 'art',
    rank: 'B',
    kind: 'event',
    target: 'gallery-call',
  },
  {
    /* 도덕 A(상한 100이라 =50). 봉사·기부가 주 공급원이라 일부러 쌓아야 한다. */
    id: 'quiet-donor',
    key: 'morality',
    rank: 'A',
    kind: 'event',
    target: 'quiet-donor',
  },
  {
    /* 창의력 B(=300). 여러 활동이 조금씩 올려서 특화 없이도 후반에 닿는다. */
    id: 'idea-notebook',
    key: 'creativity',
    rank: 'B',
    kind: 'event',
    target: 'idea-notebook',
  },
  {
    /* 예의범절 C(=100). ⚠️ 상한이 100 → 999로 바뀌면서(2026-08-08) 문턱도 10 → 100이 됐다. */
    id: 'name-remembered',
    key: 'manners',
    rank: 'C',
    kind: 'event',
    target: 'name-remembered',
  },
  /* ── 낮은 스탯의 대가 4종 (2026-08-09) ────────────────────────────────
   * ⚠️ **`below` + `afterDay` + `effects` 셋이 한 몸이다.** 방향을 뒤집고(이하), 날짜로
   * 늦추고(시작값이 곧 F라서), 한 번만 값을 치른다. 문구·아이콘은 `data/events.ts`에 있다.
   * ⚠️ **문턱 날짜를 판 길이(88~101일)의 앞쪽에 두지 않는다** — 초반은 아직 아무것도 못
   * 올린 시기라 "안 올린 대가"가 아니라 그냥 시작 벌금이 된다.
   */
  {
    /* 도덕 F(상한 100이라 =10) · 40일. 돈으로 치른다 — 안 지킨 것이 결국 돈이 된다. */
    id: 'lost-wallet',
    key: 'morality',
    rank: 'F',
    below: true,
    afterDay: 40,
    kind: 'event',
    target: 'lost-wallet',
    effects: { money: -40000 },
  },
  {
    /* 평판 F(=10) · 45일. 말이 도는 것은 멘탈을 깎는다. */
    id: 'bad-word',
    key: 'reputation',
    rank: 'F',
    below: true,
    afterDay: 45,
    kind: 'event',
    target: 'bad-word',
    effects: { mental: -12 },
  },
  {
    /* 예의범절 F(=100) · 50일. 한 번 어긋난 자리는 예의범절을 더 깎는다(같은 축). */
    id: 'cold-shoulder',
    key: 'manners',
    rank: 'F',
    below: true,
    afterDay: 50,
    kind: 'event',
    target: 'cold-shoulder',
    effects: { manners: -5, mental: -6 },
  },
  {
    /* 친화력 F(=100) · 55일. 판 후반이고, 그때까지 혼자였다는 뜻이다. */
    id: 'empty-table',
    key: 'sociability',
    rank: 'F',
    below: true,
    afterDay: 55,
    kind: 'event',
    target: 'empty-table',
    effects: { mental: -10 },
  },

  {
    /*
     * 예의범절 A(=500). ⚠️ **`name-remembered`(C)와 같은 스탯의 두 번째 단계다** — 지금까지
     * 한 스탯에 이벤트가 하나뿐이라 C를 찍고 나면 더 올릴 이유가 없었다. 위쪽에도 한 칸이
     * 있어야 특화가 끝까지 값을 받는다.
     */
    id: 'wedding-mc',
    key: 'manners',
    rank: 'A',
    kind: 'event',
    target: 'wedding-mc',
  },
  {
    /*
     * 운동 S(=749). **이 축의 유일한 S다.** 운동은 성장이 가장 빠른 스탯이라(러닝·헬스가
     * 8~14/턴) 특화하면 후반에 닿고, 그때까지 간 사람에게만 보이는 칸이 하나는 있어야 한다.
     * ⚠️ 다른 스탯에 S를 더 붙이기 전에 도달 가능성부터 본다 — 상한 999의 75%다.
     */
    id: 'pace-maker',
    key: 'athletics',
    rank: 'S',
    kind: 'event',
    target: 'pace-maker',
  },
  {
    /* 지식 A(=500). 학원 강사 제안(같은 문턱)과 짝이다 — 하나는 일이고 하나는 흔적이다. */
    id: 'cited-paper',
    key: 'knowledge',
    rank: 'A',
    kind: 'event',
    target: 'cited-paper',
  },
  {
    /* 창의력 A(=500). `idea-notebook`(B)의 다음 칸이다. */
    id: 'borrowed-idea',
    key: 'creativity',
    rank: 'A',
    kind: 'event',
    target: 'borrowed-idea',
  },
]

/**
 * 소원으로 오르는 수치. 설계자 지시로 **100**이다.
 *
 * ⚠️ **상한을 넘기지 않는다** — `clampStats`가 자르므로 평판·도덕·예의범절(상한 100)은
 * 사실상 만점이 된다. 그것을 막지 않는 이유는 감수성 A 자체가 판 후반의 문턱이고,
 * **한 번만** 쓸 수 있기 때문이다(`GameState.rankEvents`).
 */
export const WISH_AMOUNT = 100

export function findRankEvent(id: string): RankEvent | undefined {
  return RANK_EVENTS.find((e) => e.id === id)
}
