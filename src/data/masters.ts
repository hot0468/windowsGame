import { STAT_META } from './statMeta'
import type { GrowthStatKey } from '../types/game'
import type { StatRank } from '../systems/rank'
import type { IconName } from '../types/game'

/**
 * 스탯 마스터 — **그 분야를 오래 한 사람이 찾아와 선물을 준다**(설계자 지시, 프린세스메이커).
 *
 * ## 왜 랭크 이벤트가 아니라 따로인가
 * `data/rankEvents.ts`와 문턱 판정은 같지만(둘 다 `rankOf`) **성격이 다르다**:
 * 랭크 이벤트는 *무엇이 열리는가*(방·선택지·창)이고 여기는 *누가 찾아오는가*다.
 * 한 배열에 섞으면 `RankEvent`가 이름·칭호·인사말·선물까지 지게 되고, 그 필드들은
 * 나머지 이벤트 전부에서 `undefined`로 남는다. 축을 갈라 두면 각자 자기 모양만 갖는다.
 *
 * ## 지키는 것
 * ⚠️ **선물에 돈이 없다.** 이 게임은 물가로 끝나기로 돼 있어(`판은 반드시 끝난다`)
 * 새 수입원을 만들면 그 종결이 흔들린다. 기념품은 전부 `buyable: false`라
 * **중고마켓에도 못 판다**(`systems/resale.ts`가 `buyable !== false`로 거른다) —
 * 팔 수 있으면 선물 열넷이 곧 목돈이 된다.
 *
 * ⚠️ **가르침은 고정값이 아니라 상한의 비율이다**(`MASTER_GIFT_RATIO`). 평판·도덕·
 * 예의범절은 상한이 100이고 나머지는 999라, 고정 +30을 주면 그 셋에서만 선물이
 * 상한의 3분의 1이 된다 — 랭크가 비율로 판정하는 것과 같은 이유다.
 *
 * ⚠️ **성장 스탯 14종을 빠짐없이 덮는다**(`masters.test.ts`가 순회로 지킨다).
 * 스승이 없는 스탯은 올려도 아무도 찾아오지 않아 플레이어가 그 축을 버린다 —
 * 랭크 이벤트가 14종을 다 덮는 것과 같은 규칙이다.
 */
export interface Master {
  /** `master-<스탯>`. 창 id와 세이브 기록이 이 문자열을 쓴다. */
  id: string
  key: GrowthStatKey
  /** 찾아오는 문턱. **전부 A다** — 갈라 두면 "왜 이 스승만 늦게 오나"에 답할 수 없다. */
  rank: StatRank
  name: string
  /** 뭘 하는 사람인가. 이름만으로는 왜 이 스탯의 스승인지 안 읽힌다. */
  title: string
  /** 찾아와서 하는 말. **선물 이야기를 먼저 하지 않는다** — 알아본 사람의 인사가 먼저다. */
  line: string
  /** 주고 가는 물건(`SHOP_ITEMS`의 id). */
  gift: string
  icon: IconName
}

/** 가르침의 크기 = 그 스탯 상한의 몇 할인가. 3%면 999짜리는 +30, 100짜리는 +3이다. */
export const MASTER_GIFT_RATIO = 0.03

/**
 * 함께 오는 멘탈 회복. **스탯이 아니라 기분이다** — 알아봐 주는 사람이 왔다는 것이
 * 이 이벤트의 값어치라, 숫자만 주고 끝내면 "스승"이 아니라 자판기가 된다.
 * ⚠️ 취침 회복(`SLEEP_RECOVERY`)보다 크지 않게 둔다 — 크면 멘탈 관리를 이쪽으로 미룬다.
 */
export const MASTER_MENTAL = 5

/**
 * ⚠️ **문턱은 전부 A다.** 상한의 50%라 999짜리는 500, 100짜리는 50이고, 비율 판정이라
 * 상한이 달라도 "절반쯤 왔다"는 같은 뜻이 된다. **스승마다 다르게 두지 말 것** —
 * 갈라 두는 순간 "왜 음악 스승만 S인가"를 데이터가 아니라 사연으로 답해야 한다.
 */
const RANK: StatRank = 'A'

export const MASTERS: Master[] = [
  {
    id: 'master-knowledge',
    key: 'knowledge',
    rank: RANK,
    name: '강 노인',
    title: '헌책방 주인',
    line: '요새 자네가 사 가는 책이 좀 바뀌었더군. 처음에는 남들 다 보는 걸 찾더니, 이제는 절판된 걸 묻지. 그쯤 되면 읽는 게 아니라 파는 거야. 이거 가져가게. 나는 이제 눈이 어두워 못 써.',
    gift: 'keepsake-knowledge',
    icon: STAT_META.knowledge.icon,
  },
  {
    id: 'master-charm',
    key: 'charm',
    rank: RANK,
    name: '민서',
    title: '무진장 스타일리스트',
    line: '길에서 알아봤어요. 옷이 좋아서가 아니라 서 있는 게 달라서요. 그거 배워서 되는 사람 잘 없거든요. 이거 제가 처음 일할 때 쓰던 건데, 이제 필요한 사람한테 가는 게 맞을 것 같아서요.',
    gift: 'keepsake-charm',
    icon: STAT_META.charm.icon,
  },
  {
    id: 'master-sensitivity',
    key: 'sensitivity',
    rank: RANK,
    name: '이연',
    title: '필름 사진관 주인',
    line: '현상 맡기신 것들 봤습니다. 잘 찍었다는 말은 아니고요, 남들이 안 보는 걸 보고 계시더라고요. 그게 배운다고 되는 게 아니라서 한참 봤습니다. 이거 한 통 넣어 드릴게요.',
    gift: 'keepsake-sensitivity',
    icon: STAT_META.sensitivity.icon,
  },
  {
    id: 'master-reputation',
    key: 'reputation',
    rank: RANK,
    name: '박 국장',
    title: '동네 신문 편집장',
    line: '이 동네에서 이름이 도는 사람은 일 년에 몇 안 됩니다. 좋은 쪽으로 도는 건 더 적고요. 기사로 쓰겠다는 건 아닙니다. 그냥 이건 드리고 싶었어요.',
    gift: 'keepsake-reputation',
    icon: STAT_META.reputation.icon,
  },
  {
    id: 'master-morality',
    key: 'morality',
    rank: RANK,
    name: '한 단장',
    title: '봉사단 단장',
    line: '오래 하는 사람은 표가 납니다. 대부분 두어 달 하고 안 와요. 그게 나쁘다는 게 아니라, 계속 오는 쪽이 드물다는 겁니다. 제 것 하나 드릴게요. 이십 년 달고 다닌 겁니다.',
    gift: 'keepsake-morality',
    icon: STAT_META.morality.icon,
  },
  {
    id: 'master-creativity',
    key: 'creativity',
    rank: RANK,
    name: '오 작가',
    title: '카피라이터',
    line: '아이디어가 좋다는 말은 안 할게요. 그 말 들으면 다들 거기서 멈추더라고요. 대신 이거 드립니다. 저는 이거 다 쓰는 데 칠 년 걸렸어요.',
    gift: 'keepsake-creativity',
    icon: STAT_META.creativity.icon,
  },
  {
    id: 'master-sociability',
    key: 'sociability',
    rank: RANK,
    name: '연희',
    title: '동네 사랑방 사장',
    line: '여기 오는 사람 중에 이름을 다 외우는 사람이 둘 있는데 하나가 나고 하나가 자네야. 그거 아무나 못 해. 피곤한 일이거든. 이거 받아 둬.',
    gift: 'keepsake-sociability',
    icon: STAT_META.sociability.icon,
  },
  {
    id: 'master-vocabulary',
    key: 'vocabulary',
    rank: RANK,
    name: '서 편집자',
    title: '출판사 교열자',
    line: '쓰신 글 몇 개 읽었습니다. 고칠 게 별로 없어서 오래 봤어요. 그런 원고가 일 년에 몇 개 안 옵니다. 이거 제가 쓰던 건데, 저는 이제 화면으로만 봐서요.',
    gift: 'keepsake-vocabulary',
    icon: STAT_META.vocabulary.icon,
  },
  {
    id: 'master-athletics',
    key: 'athletics',
    rank: RANK,
    name: '장 코치',
    title: '체육관 관장',
    line: '삼 개월 넘기는 사람이 열에 하나야. 자네는 넘겼고. 몸이 좋아진 것보다 그게 대단한 거다. 이거 차고 다녀. 내가 선수 때 쓰던 건데 아직 멀쩡해.',
    gift: 'keepsake-athletics',
    icon: STAT_META.athletics.icon,
  },
  {
    id: 'master-gaming',
    key: 'gaming',
    rank: RANK,
    name: '한별',
    title: '은퇴한 프로게이머',
    line: '판 몇 개 봤어요. 손이 빠른 건 아닌데 안 틀리시더라고요. 그게 더 어려운 겁니다. 저는 그거 못 해서 접었고요. 이거 하나 드릴게요.',
    gift: 'keepsake-gaming',
    icon: STAT_META.gaming.icon,
  },
  {
    id: 'master-manners',
    key: 'manners',
    rank: RANK,
    name: '윤 여사',
    title: '예절 강사',
    line: '요즘은 배웠다는 사람도 앉는 것부터 틀려요. 그런데 자네는 배운 티가 안 나면서 맞더군. 그게 제일 어려운 겁니다. 이거 가져가요.',
    gift: 'keepsake-manners',
    icon: STAT_META.manners.icon,
  },
  {
    id: 'master-art',
    key: 'art',
    rank: RANK,
    name: '도화',
    title: '간판 그리는 화가',
    line: '나는 사십 년 간판만 그렸어요. 그림 잘 그린다는 소리는 못 들어 봤고. 그런데 자네 선은 좀 다르더라고. 이거 써 봐요. 손에 익으면 안 놓게 될 겁니다.',
    gift: 'keepsake-art',
    icon: STAT_META.art.icon,
  },
  {
    id: 'master-music',
    key: 'music',
    rank: RANK,
    name: '백 선생',
    title: '레코드가게 주인',
    line: '가게에서 틀어 둔 걸 자네만 알아듣더군. 그거 귀가 좋은 게 아니라 오래 들은 거예요. 이거 하나 줄게. 소리가 흔들릴 때 이걸로 잡아요.',
    gift: 'keepsake-music',
    icon: STAT_META.music.icon,
  },
  {
    id: 'master-finance',
    key: 'finance',
    rank: RANK,
    name: '조 실장',
    title: '은퇴한 딜러',
    line: '돈 버는 법은 안 가르쳐 줍니다. 그건 나도 몰라요. 다만 자네는 잃을 자리를 알아보더군. 그거 아는 사람이 결국 남습니다. 이거 받아 둬요.',
    gift: 'keepsake-finance',
    icon: STAT_META.finance.icon,
  },
]

/** id로 찾는다. 모르는 id는 `undefined` — 세이브 보정이 이걸로 거른다. */
export function findMaster(id: string): Master | undefined {
  return MASTERS.find((m) => m.id === id)
}
