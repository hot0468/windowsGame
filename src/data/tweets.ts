/**
 * 트위터 타임라인의 계정과 트윗.
 *
 * ⚠️ **아바타와 첨부 이미지는 파일이 아니라 그라데이션 + 글자다**(`data/videos.ts`의
 * 썸네일, `data/banners.ts`의 배너와 같은 오프라인 규칙). 게임 세계의 계정이라 실제
 * 사진이 있을 수도 없다.
 *
 * ⚠️ **실존 인물·실존 브랜드는 쓰지 않는다.** 패러디는 호의적인 톤만 남긴다.
 *
 * ⚠️ **시각은 `new Date()`가 아니라 배열 인덱스에서 파생한다**(뉴스·메시지와 같은 결정성
 * 규칙). 트윗 하나 늘리는 비용은 "배열에 한 줄"이어야 하므로 시각을 손으로 적지 않는다.
 *
 * ⚠️ 트렌드는 여기서 만들지 않는다 — `data/news.ts`의 `TRENDING_TERMS`가 단일 출처다.
 * 대신 **본문에 그 단어를 실제로 담아 둔다**: 트렌드를 눌러 걸리는 필터가 빈 목록을
 * 돌려주면 그 항목은 눌러도 갈 데 없는 장식이 된다(`tweets.test.ts`가 지킨다).
 */

/** 타임라인에 뜨는 계정. 프로필 사진이 없으니 글자와 색으로 구분한다. */
export interface TweetAccount {
  /** '@'를 뺀 핸들. 트윗은 이 값으로 계정을 가리킨다. */
  handle: string
  name: string
  /** 아바타에 넣을 한 글자. */
  initial: string
  /** 아바타 배경. 계정마다 고정이라 어느 줄에서 봐도 같은 색으로 읽힌다. */
  gradient: string
  /** 인증 뱃지. 실제 X와 같이 이름 옆에 붙는다. */
  verified?: boolean
}

export interface Tweet {
  id: string
  /** `TweetAccount.handle`. 계정 정보를 트윗마다 다시 적지 않는다. */
  handle: string
  body: string
  /** true면 '팔로잉' 탭에도 뜬다. 탭이 실제로 목록을 가르는 근거다. */
  following: boolean
  replies: number
  retweets: number
  likes: number
  /** 조회수는 표시 문자열 그대로 둔다 — 계산할 것이 없다(`Video.views`와 같은 규칙). */
  views: string
  /** 첨부 이미지. 그라데이션 위에 큰 글자를 얹는다. */
  image?: { gradient: string; caption: string }
}

export const TWEET_ACCOUNTS: TweetAccount[] = [
  {
    handle: 'jachwi_log',
    name: '자취 3년차',
    initial: '자',
    gradient: 'linear-gradient(135deg, #2f4858 0%, #33658a 100%)',
  },
  {
    handle: 'alba_bot',
    name: '알바 정보 알리미',
    initial: '알',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    verified: true,
  },
  {
    handle: 'nooljul',
    name: '늘줄',
    initial: '늘',
    gradient: 'linear-gradient(135deg, #7b2d5e 0%, #d4457e 100%)',
  },
  {
    handle: 'sigsa_dansok',
    name: '식사 단속반',
    initial: '식',
    gradient: 'linear-gradient(135deg, #c9761f 0%, #f0a04b 100%)',
  },
  {
    handle: 'gongbu_room',
    name: '공부방 지기',
    initial: '공',
    gradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
    verified: true,
  },
  {
    handle: 'muyongjihak',
    name: '무용지학',
    initial: '무',
    gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  },
  {
    handle: 'bangguseok',
    name: '방구석 감정가',
    initial: '방',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
  {
    handle: 'night_shift',
    name: '야간조',
    initial: '야',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
  },
  {
    handle: 'mental_care',
    name: '마음 점검소',
    initial: '마',
    gradient: 'linear-gradient(135deg, #9d174d 0%, #f43f5e 100%)',
    verified: true,
  },
  {
    handle: 'sonnim_1',
    name: '오늘의 손님',
    initial: '손',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
]

export function findAccount(handle: string): TweetAccount | undefined {
  return TWEET_ACCOUNTS.find((a) => a.handle === handle)
}

export const TWEETS: Tweet[] = [
  {
    id: 't1',
    handle: 'jachwi_log',
    body: '자취방 생활비 줄이는 법 같은 글 백 개 읽었는데 결론은 하나였다. 방을 옮기거나, 덜 먹거나. 둘 다 싫어서 그냥 불을 껐다.',
    following: true,
    replies: 41,
    retweets: 128,
    likes: 902,
    views: '9.1만',
  },
  {
    id: 't2',
    handle: 'alba_bot',
    body: '오늘 올라온 단기 고수익 알바 정리. 물류센터는 몸이 남아나질 않고 과외는 자격이 까다롭습니다. 편의점은 언제나 열려 있습니다.',
    following: false,
    replies: 12,
    retweets: 340,
    likes: 611,
    views: '15.4만',
    image: {
      gradient: 'linear-gradient(135deg, #16324f 0%, #2f6ea8 100%)',
      caption: '오늘의 일당 표',
    },
  },
  {
    id: 't3',
    handle: 'nooljul',
    body: '번아웃 자가진단 해봤는데 12문항 중 11개가 나였음. 나머지 하나는 "최근 취미를 즐긴 적이 있다"였고 이건 뭐 애초에 취미가 없어서 해당 없음.',
    following: true,
    replies: 233,
    retweets: 1204,
    likes: 8810,
    views: '62.7만',
  },
  {
    id: 't4',
    handle: 'sigsa_dansok',
    body: '편의점 삼각김밥 두 개로 하루를 버틴 사람 손. 손 든 김에 물 좀 마시고 오세요.',
    following: false,
    replies: 88,
    retweets: 210,
    likes: 3402,
    views: '21.0만',
    image: {
      gradient: 'linear-gradient(135deg, #c9761f 0%, #f2c14e 100%)',
      caption: '오늘도 삼각김밥',
    },
  },
  {
    id: 't5',
    handle: 'gongbu_room',
    body: '무료 강의 사이트만 스무 개 저장해 두고 하나도 안 듣는 분들 계신가요. 저입니다. 오늘은 하나 켜기라도 합시다.',
    following: true,
    replies: 57,
    retweets: 402,
    likes: 2211,
    views: '30.2만',
    image: {
      gradient: 'linear-gradient(135deg, #3f3d56 0%, #6d6a94 100%)',
      caption: '저장만 스무 개',
    },
  },
  {
    id: 't6',
    handle: 'muyongjihak',
    body: '공무원 시험 일정 나왔다고 단톡방이 난리인데 저는 아직 접수도 안 했습니다. 발표일까지 채우면 된다는 말을 너무 믿고 있어요.',
    following: false,
    replies: 19,
    retweets: 76,
    likes: 540,
    views: '7.7만',
  },
  {
    id: 't7',
    handle: 'bangguseok',
    body: '중고 거래 꿀팁: 사진을 밝게 찍고, 약속 장소는 사람 많은 데로 잡고, 무엇보다 애초에 안 사는 게 제일 큽니다.',
    following: true,
    replies: 61,
    retweets: 903,
    likes: 5120,
    views: '44.8만',
    image: {
      gradient: 'linear-gradient(135deg, #134e4a 0%, #0f766e 100%)',
      caption: '밝게 찍은 물건 사진',
    },
  },
  {
    id: 't8',
    handle: 'night_shift',
    body: '야간 근무 끝나고 나오면 해가 뜨고 있는데, 이게 하루의 끝인지 시작인지 매번 헷갈립니다. 오늘도 헷갈리는 중.',
    following: false,
    replies: 34,
    retweets: 155,
    likes: 1870,
    views: '12.3만',
    image: {
      gradient: 'linear-gradient(135deg, #1e293b 0%, #f59e0b 100%)',
      caption: '퇴근길 일출',
    },
  },
  {
    id: 't9',
    handle: 'mental_care',
    body: '멘탈은 통장 잔고와 비슷해서, 남았을 때 아껴야 하고 바닥나면 아무것도 못 합니다. 오늘 하루쯤은 아무것도 안 해도 됩니다.',
    following: true,
    replies: 140,
    retweets: 2104,
    likes: 15220,
    views: '108.4만',
  },
  {
    id: 't10',
    handle: 'sonnim_1',
    body: '알바생한테 반말하는 손님이 오늘도 왔는데, 알바생이 더 예의 바르게 응대해서 제가 다 배웠습니다. 예의는 배우는 거더군요.',
    following: false,
    replies: 72,
    retweets: 611,
    likes: 4408,
    views: '38.1만',
  },
  {
    id: 't11',
    handle: 'jachwi_log',
    body: '월세 계약서 다시 읽다가 보증금 항목에서 한참을 멈췄습니다. 돌려받는 돈이라는 걸 알면서도 지금 없는 돈은 없는 돈이라.',
    following: true,
    replies: 26,
    retweets: 88,
    likes: 720,
    views: '6.4만',
    image: {
      gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
      caption: '계약서 보증금 항목',
    },
  },
  {
    id: 't12',
    handle: 'gongbu_room',
    body: '자격증은 따는 순간이 아니라 그게 열어 주는 문 앞에 섰을 때 값어치가 생깁니다. 그러니까 일단 접수부터 하세요.',
    following: false,
    replies: 45,
    retweets: 512,
    likes: 3310,
    views: '27.9만',
  },
  {
    id: 't13',
    handle: 'nooljul',
    body: '하루에 두 가지만 하기로 정했더니 신기하게 두 가지는 하게 됨. 세 가지 하려던 날은 항상 영이었는데.',
    following: true,
    replies: 18,
    retweets: 240,
    likes: 1990,
    views: '17.2만',
  },
  {
    id: 't14',
    handle: 'alba_bot',
    body: '주휴수당 못 받으셨나요. 근무 기록을 남겨 두는 것만으로 절반은 해결됩니다. 캡처든 메모든 남기세요.',
    following: false,
    replies: 96,
    retweets: 1408,
    likes: 6720,
    views: '55.6만',
  },
]

/* ── 개인방송 시청자 반응 (2026-08-08 신설) ────────────────────────────────
 *
 * 너튜브에서 켠 방송에 대한 트윗. **트위터에서 채널 이름을 검색해야 보인다** —
 * 타임라인에 늘 깔면 아무 관련 없는 사람의 피드가 내 방송 이야기로 도배된다.
 *
 * ⚠️ **계정을 새로 만들지 않는다** — 위 `TWEET_ACCOUNTS`를 그대로 쓴다. 반응은
 * "타임라인에 있던 사람들이 내 방송을 봤다"라야 세계가 하나로 읽힌다.
 *
 * ⚠️ **숫자(좋아요·조회수)를 여기 적지 않는다.** 반응의 크기는 채널 크기에서
 * 파생한다(`systems/channel.ts`) — 손으로 적으면 구독자 42명 채널에 좋아요 5천이
 * 달리는 거짓말이 남는다.
 */

/** 반응 한 줄. `{name}`은 채널 이름, `{topic}`은 마지막 방송 주제로 바뀐다. */
export interface StreamReview {
  handle: string
  /**
   * 어느 채널 크기에서 나오는 말인가. **0=무명 / 1=알려짐 / 2=화제**이고
   * 판정은 평판 등급이 한다(`systems/channel.ts`의 `reviewTier`).
   * ⚠️ 누적이 아니라 **한 단계만** 쓴다 — 구독자 만 명 채널에 "아무도 안 본다"가
   * 같이 뜨면 그 목록 전체가 거짓이 된다.
   */
  tier: 0 | 1 | 2
  body: string
}

export const STREAM_REVIEWS: StreamReview[] = [
  // ── tier 0: 무명. 본 사람이 거의 없고, 본 사람은 우연히 들어왔다.
  {
    handle: 'night_shift',
    tier: 0,
    body: '새벽에 아무 방송이나 틀다가 {name} 들어갔는데 시청자가 나 포함 셋이었다. 그래도 {topic}은 끝까지 봤다.',
  },
  {
    handle: 'jachwi_log',
    tier: 0,
    body: '{name} 방송 보다가 잤습니다. 재미없어서가 아니라 목소리가 너무 편안해서요. 이거 칭찬 맞습니다.',
  },
  {
    handle: 'bangguseok',
    tier: 0,
    body: '{name} 채널 {topic} 봤는데 장비 탓인지 소리가 좀 먹더군요. 말하는 건 나쁘지 않았습니다.',
  },
  {
    handle: 'sonnim_1',
    tier: 0,
    body: '{name}? 처음 들어봤는데 채팅 치니까 바로 읽어 주셔서 놀랐습니다. 사람이 없으면 그런 게 되는군요.',
  },
  // ── tier 1: 알려짐. 이름을 아는 사람이 생기고 비교가 시작된다.
  {
    handle: 'nooljul',
    tier: 1,
    body: '요즘 {name} 방송 챙겨 봅니다. {topic}인데 정작 딴소리하는 시간이 더 길고 그게 재밌어요.',
  },
  {
    handle: 'gongbu_room',
    tier: 1,
    body: '{name} 틀어 놓고 공부하면 이상하게 집중이 됩니다. 조용하지도 시끄럽지도 않은 그 선을 잘 잡으시더군요.',
  },
  {
    handle: 'sigsa_dansok',
    tier: 1,
    body: '{name} 어제 {topic} 하면서 밥 안 먹고 세 시간 떠들던데, 그러다 쓰러집니다. 시청자가 걱정하는 방송 처음 봄.',
  },
  {
    handle: 'mental_care',
    tier: 1,
    body: '{name} 방송이 요즘 제 저녁 루틴입니다. 대단한 얘기를 해서가 아니라, 남의 하루가 흘러가는 소리가 필요할 때가 있어서요.',
  },
  // ── tier 2: 화제. 클립이 돌고 안 본 사람도 이름은 안다.
  {
    handle: 'muyongjihak',
    tier: 2,
    body: '{name} 클립이 타임라인에 세 번 넘게 떴습니다. 결국 봤고, 결국 구독했습니다. 알고리즘 이겼다고 생각했는데 아니었어요.',
  },
  {
    handle: 'alba_bot',
    tier: 2,
    body: '{name} 어제 {topic} 동시 접속 기록 갈아치웠다고 합니다. 개인방송으로 생활비 번다는 말이 농담이 아니게 됐습니다.',
  },
  {
    handle: 'nooljul',
    tier: 2,
    body: '{name} 초창기부터 봤다고 하면 이제 아무도 안 믿습니다. 그때는 시청자가 셋이었는데.',
  },
  {
    handle: 'bangguseok',
    tier: 2,
    body: '{name} 방송의 무서운 점은 {topic}을 하든 뭘 하든 결국 보게 된다는 것입니다. 컨텐츠가 아니라 사람을 보는 단계.',
  },
]

/**
 * 트윗 한 개의 최대 길이. 실제 X와 같다.
 * ⚠️ **화면(`maxLength`)과 규칙(`postTweet`)이 같은 값을 본다** — 한쪽만 막으면
 * 붙여넣기로 넘어간 글이 저장된다.
 */
export const TWEET_MAX_LENGTH = 280

/**
 * 내 글 하나가 받는 반응. **팔로워에서 파생하고 저장하지 않는다** —
 * 저장하면 팔로워가 늘어도 옛 글의 숫자가 굳어 "계정이 커졌는데 반응은 그대로"가 된다.
 *
 * ⚠️ **돈을 만들지 않는다.** 정산은 여전히 `totalFollowers × WON_PER_FOLLOWER` 하나이고
 * 글을 올려도 팔로워는 안 는다(팔로워를 주는 것은 그림뿐이다 — 그 상한이
 * "판은 반드시 끝난다"를 지탱한다). 여기 숫자는 **표시 전용**이다.
 *
 * ⚠️ 비율은 실제 X의 체감 순서를 따른다: 조회 > 좋아요 > 리트윗 > 답글.
 * 작은 계정이면 0이 나오는 것이 정상이라 바닥을 깔지 않는다 — 팔로워 128명짜리
 * 계정의 글에 리트윗이 붙으면 그게 거짓말이다.
 */
export function myTweetStats(followers: number): {
  views: string
  likes: number
  retweets: number
  replies: number
} {
  const views = Math.round(followers * 0.62)
  const likes = Math.floor(views * 0.05)
  return {
    views: views.toLocaleString('ko-KR'),
    likes,
    retweets: Math.floor(likes * 0.18),
    replies: Math.floor(likes * 0.09),
  }
}

/**
 * 처음 팔로우하고 있는 계정. **데이터의 `Tweet.following` 플래그에서 뽑는다** —
 * 목록을 손으로 한 번 더 적으면 플래그와 갈라진다.
 *
 * ⚠️ 이건 **씨앗일 뿐이다.** 한 번이라도 [팔로우]를 누르면 `TwitterState.following`이
 * 정본이 되고, 판정은 `systems/twitter.ts`의 `followedHandles` 하나가 한다.
 */
export const DEFAULT_FOLLOWING: string[] = [
  ...new Set(TWEETS.filter((t) => t.following).map((t) => t.handle)),
]

/**
 * 트윗 시각. **배열 인덱스에서 파생한다** — `new Date()`를 쓰면 결정성이 깨진다.
 * 위쪽이 최신이라 인덱스가 커질수록 오래된 글이 된다.
 */
export function tweetAge(index: number): string {
  if (index === 0) return '32분'
  return index < 8 ? `${index * 2 + 1}시간` : `${index - 6}일`
}

/**
 * 한 스레드에 그릴 답글 수의 상한.
 *
 * ⚠️ **실제 답글 수와 다르다** — 트윗 하나에 41개가 달려 있어도 41줄을 그리면 스레드가
 * 타임라인을 밀어낸다. 실제 X도 전부 펼치지 않는다. 숫자는 그대로 두고 **보여 주는 것만**
 * 자른다(숫자를 줄이면 화면이 거짓을 말한다).
 */
export const REPLIES_SHOWN = 4

/**
 * 답글 문구 풀.
 *
 * ⚠️ **계정마다 말투를 따로 두지 않았다** — 계정이 36개라 계정당 답글을 쓰면 데이터가
 * 열 배가 되고, 답글은 원래 짧아 말투가 잘 드러나지도 않는다. 대신 **한 스레드에 같은
 * 문구가 두 번 나오지 않게** 뽑는 쪽(`systems/twitter.ts`)이 인덱스를 어긋내며 집는다.
 * ⚠️ 문구는 **무엇에 대한 답인지 몰라도 말이 되는 것**만 쓴다 — 어느 트윗 밑에나 붙는다.
 */
export const REPLY_LINES: string[] = [
  '이거 진짜 공감돼요',
  'ㅋㅋㅋㅋ 저만 그런 게 아니었네',
  '와 이건 좀 저장해 둬야겠다',
  '어제 저도 똑같은 생각 했어요',
  '음… 저는 좀 다르게 봅니다',
  '자세히 좀 알려주실 수 있나요',
  '이런 글 자주 올려주세요',
  '알고리즘이 여기로 데려왔습니다',
  '맞말 그 자체',
  '오늘 하루도 고생 많으셨어요',
  '보다가 스크롤 멈췄네요',
  '이 계정 팔로우 안 할 이유가 없다',
]

/**
 * 내 글의 시각. **남의 트윗과 다른 규칙이다** — 저쪽은 인덱스 파생이지만 내 글은
 * 실제로 올린 날(`MyPost.day`)을 안다.
 */
export function postAge(postDay: number, today: number): string {
  const diff = Math.max(0, today - postDay)
  return diff === 0 ? '방금' : `${diff}일`
}

/**
 * 평판에서 팔로워 수를 뽑는다. **읽기 전용 파생값이고 새 상태를 만들지 않는다** —
 * 평판이 오르면 팔로워가 늘고, 그 반대 방향의 경로는 없다.
 * (평판 상한은 100이므로 최댓값은 약 1.4만이다.)
 */
export function followersFrom(reputation: number): number {
  return 128 + Math.max(0, reputation) * 137
}

/** 1만 이상은 '만' 단위로 줄인다(실제 타임라인의 표기). */
export function countLabel(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString('ko-KR')
}
