/**
 * 너튜브 영상 목록.
 *
 * ⚠️ **썸네일은 이미지가 아니라 그라데이션 + 글자다**(배너와 같은 규칙, `data/banners.ts`).
 * 외부 이미지 API를 쓰지 않는 것이 이 프로젝트의 오프라인 규칙이고, 게임 세계의
 * 영상이라 실제 사진이 있을 수도 없다. 썸네일 안의 큰 글자는 실제 유튜브 썸네일의
 * 자막형 텍스트를 그대로 흉내 낸 것이다.
 *
 * ⚠️ 실존 채널·영상은 쓰지 않는다(광고 배너·사이트 이름과 같은 규칙).
 */

/** 채널 아바타는 **이니셜 원형**이다 — 프로필 사진이 없으니 글자와 색으로 구분한다. */
export interface Channel {
  name: string
  /** 아바타에 넣을 한 글자. */
  initial: string
  /** 아바타 배경. 채널마다 고정이라 어느 화면에서 봐도 같은 색으로 읽힌다. */
  color: string
  subscribed?: boolean
}

export interface Video {
  id: string
  title: string
  channel: string
  /** 조회수. 표시 문자열 그대로 둔다 — 계산할 것이 없다. */
  views: string
  /** 업로드 시점. 게임 날짜와 무관한 배경 소품이라 문자열이다. */
  age: string
  /** 재생 시간. 쇼츠는 없다. */
  length?: string
  category: string
  /** 썸네일 배경. */
  gradient: string
  /** 썸네일 위에 얹는 큰 글자. 없으면 제목이 그 자리를 대신한다. */
  caption?: string
  /** true면 세로 썸네일(Shorts 줄에만 뜬다). */
  short?: boolean
  desc?: string
}

export const CHANNELS: Channel[] = [
  { name: '우정잉', initial: '우', color: '#e8543f', subscribed: true },
  { name: '테마파크 버프', initial: '테', color: '#7b5cd6' },
  { name: '씨앵', initial: '씨', color: '#2f9e6b', subscribed: true },
  { name: '한밤 뉴스룸', initial: '한', color: '#2b6cb0' },
  { name: '진진JINJIN', initial: '진', color: '#d4457e', subscribed: true },
  { name: '백범댁 먹방', initial: '백', color: '#c9761f' },
  { name: '하수구 대마왕', initial: '하', color: '#4a5568' },
  { name: '수왈', initial: '수', color: '#8b2f3f' },
  { name: '진동훈', initial: '동', color: '#1f7a8c', subscribed: true },
  { name: '스물아홉 브이로그', initial: '스', color: '#a05c9e' },
  { name: '헤안', initial: '헤', color: '#3f8fd6' },
  { name: '지쳐냐', initial: '지', color: '#d67c2f' },
  { name: '장기휴방', initial: '장', color: '#5c6bc0' },
  { name: '윤디', initial: '윤', color: '#6b8e23' },
  { name: '늘봄뉴스', initial: '늘', color: '#b3261e' },
  { name: '무야호', initial: '무', color: '#00897b' },
]

export function findChannel(name: string): Channel | undefined {
  return CHANNELS.find((c) => c.name === name)
}

/** 칩 줄. 첫 항목 '전체'는 필터를 걸지 않는다. */
export const VIDEO_CATEGORIES = [
  '전체',
  '뉴스',
  '게임',
  '요리',
  '여행',
  '음악',
  '브이로그',
  '코미디',
]

export const VIDEOS: Video[] = [
  {
    id: 'v1',
    title: '결국 현실을 마주한 우정잉',
    channel: '우정잉',
    views: '조회수 15만회',
    age: '6시간 전',
    length: '8:21',
    category: '브이로그',
    gradient: 'linear-gradient(135deg, #1f2a44 0%, #3d5a80 100%)',
    caption: '현실 자각',
    desc: '통장을 열어 본 날의 기록. 다들 이렇게 사는 거 맞죠?',
  },
  {
    id: 'v2',
    title: '[파크 뒷담화] 훔친 건 아닌데 훔친 것 같은 느낌이 들어버린 회사의 에버랜드 굿즈',
    channel: '테마파크 버프',
    views: '조회수 2만회',
    age: '1일 전',
    length: '24:07',
    category: '여행',
    gradient: 'linear-gradient(135deg, #f2b705 0%, #f25c05 100%)',
    caption: '김의새 돈을 훔쳐가?!',
    desc: '굿즈 창고를 털어 본 사람의 후기(합법입니다).',
  },
  {
    id: 'v3',
    title: '새끼들을 데리고 가출한 엄마 고양이',
    channel: '씨앵',
    views: '조회수 2.7만회',
    age: '1일 전',
    length: '12:22',
    category: '브이로그',
    gradient: 'linear-gradient(135deg, #d9c9b0 0%, #8c7a63 100%)',
    caption: '마당에 살던 고양이',
    desc: '어느 날 아침, 상자가 비어 있었다.',
  },
  {
    id: 'v4',
    title: '몰래 싸 온 고기 굽더니 항의하자 "필요?" 적반하장',
    channel: '한밤 뉴스룸',
    views: '조회수 1.5만회',
    age: '1시간 전',
    length: '5:23',
    category: '뉴스',
    gradient: 'linear-gradient(135deg, #b3261e 0%, #6b1512 100%)',
    caption: '적반하장',
    desc: '캠핑장에서 벌어진 일. 관리인은 자리를 비운 상태였다.',
  },
  {
    id: 'v5',
    title: '존나 살찐 7월 선 곳 모음',
    channel: '진진JINJIN',
    views: '조회수 2.6만회',
    age: '2주 전',
    length: '19:44',
    category: '요리',
    gradient: 'linear-gradient(135deg, #e26d5c 0%, #f2b880 100%)',
    caption: '7월 먹방 총정리',
    desc: '한 달 치를 몰아서 봅니다. 배고플 때 누르지 마세요.',
  },
  {
    id: 'v6',
    title: '영국 춘천시는 처음인데 참 예쁘네요 [열두 시간 해외 버스 #1]',
    channel: '무야호',
    views: '조회수 1.9만회',
    age: '2일 전',
    length: '15:06',
    category: '여행',
    gradient: 'linear-gradient(135deg, #6b8e23 0%, #a8c66c 100%)',
    caption: '열두 시간 버스',
    desc: '기차표를 놓쳐서 시작된 여행.',
  },
  {
    id: 'v7',
    title: '누가 마늘 토핑 2배 추가하래 했나… 마마치 먹방',
    channel: '백범댁 먹방',
    views: '조회수 1.5만회',
    age: '7시간 전',
    length: '15:20',
    category: '요리',
    gradient: 'linear-gradient(135deg, #c9761f 0%, #f0a04b 100%)',
    caption: '마늘 2배',
    desc: '다음 날 약속이 없어서 가능했습니다.',
  },
  {
    id: 'v8',
    title: '이대로는 작업 불가! 역대급 대장균 현장 | 하수구 대마왕',
    channel: '하수구 대마왕',
    views: '조회수 1.3만회',
    age: '1일 전',
    length: '21:44',
    category: '브이로그',
    gradient: 'linear-gradient(135deg, #37474f 0%, #62757f 100%)',
    caption: '몸이 없다!?',
    desc: '10년 묵은 배관을 여는 순간.',
  },
  {
    id: 'v9',
    title: '외딴 농가의 진혹한 살인마 (실제 사건 모티브 공포게임)',
    channel: '수왈',
    views: '조회수 2.4만회',
    age: '2시간 전',
    length: '57:09',
    category: '게임',
    gradient: 'linear-gradient(135deg, #4a0f14 0%, #8b2f3f 100%)',
    caption: '공포게임',
    desc: '자정 넘어서 하지 마세요. 진심입니다.',
  },
  {
    id: 'v10',
    title: '왜 나만 낡고 기분 코 최고 <스파이더맨> 후기',
    channel: '진동훈',
    views: '조회수 15만회',
    age: '4일 전',
    length: '13:37',
    category: '코미디',
    gradient: 'linear-gradient(135deg, #1f7a8c 0%, #3fb0c4 100%)',
    caption: '스파이더맨 후기',
    desc: '스포 없이 떠드는 20분.',
  },
  {
    id: 'v11',
    title: '혼자 동유 가서 짬뽕 돌아다니고 삼계탕 해먹고 말았어 30대 여자의 vlog',
    channel: '스물아홉 브이로그',
    views: '조회수 1.6만회',
    age: '1일 전',
    length: '18:11',
    category: '브이로그',
    gradient: 'linear-gradient(135deg, #a05c9e 0%, #d6a2d1 100%)',
    caption: '혼자 여행 vlog',
    desc: '연차를 몰아 쓰고 떠났습니다.',
  },
  {
    id: 'v12',
    title: '언니 몸치 테스트',
    channel: '지쳐냐',
    views: '조회수 1.4만회',
    age: '2일 전',
    length: '4:00',
    category: '코미디',
    gradient: 'linear-gradient(135deg, #d67c2f 0%, #f2c14e 100%)',
    caption: '언니 몸치 테스트',
    desc: '결과는 참담했다.',
  },
  {
    id: 'v13',
    title: '장기휴방 좀 납치했었습니다',
    channel: '장기휴방',
    views: '조회수 8.9만회',
    age: '3일 전',
    length: '31:02',
    category: '게임',
    gradient: 'linear-gradient(135deg, #5c6bc0 0%, #9fa8da 100%)',
    caption: '대전 가자!',
    desc: '오프라인 대회 참가 브이로그.',
  },
  {
    id: 'v14',
    title: '여름방학 특집 & 진짜 JONNA 웃김니다 완전체 합방',
    channel: '헤안',
    views: '조회수 99만회',
    age: '2일 전',
    length: '46:20',
    category: '코미디',
    gradient: 'linear-gradient(135deg, #3f8fd6 0%, #7ec8f0 100%)',
    caption: '여름방학 특집',
    desc: '멤버 전원 모였습니다.',
  },
  {
    id: 'v15',
    title: '역대급 랜덤박스를 구매했습니다',
    channel: '윤디',
    views: '조회수 11만회',
    age: '3일 전',
    length: '17:09',
    category: '게임',
    gradient: 'linear-gradient(135deg, #6b8e23 0%, #b5c99a 100%)',
    caption: '랜덤박스 개봉',
    desc: '30만 원짜리 상자에서 나온 것.',
  },
  {
    id: 'v16',
    title: '"집 안에서 발견" 부산서 20대 남성 사망',
    channel: '늘봄뉴스',
    views: '조회수 86만회',
    age: '3일 전',
    length: '1:27',
    category: '뉴스',
    gradient: 'linear-gradient(135deg, #b3261e 0%, #e0554b 100%)',
    caption: '속보',
    desc: '경찰은 타살 혐의점이 없다고 밝혔다.',
  },
  {
    id: 'v17',
    title: '눈물이 하나로 승부한다! 익스트림 틀린그림찾기',
    channel: '지쳐냐',
    views: '조회수 1.5만회',
    age: '2일 전',
    length: '12:32',
    category: '게임',
    gradient: 'linear-gradient(135deg, #2b6cb0 0%, #63a4d8 100%)',
    caption: '틀린그림찾기',
    desc: '10분 안에 못 찾으면 벌칙.',
  },
  {
    id: 'v18',
    title: '부산의 발리로 불리는 기장 월내리 루프탑 카페',
    channel: '무야호',
    views: '조회수 4.1만회',
    age: '4일 전',
    length: '11:53',
    category: '여행',
    gradient: 'linear-gradient(135deg, #00897b 0%, #4db6ac 100%)',
    caption: '기장 루프탑 카페',
    desc: '주말엔 자리 없습니다.',
  },
]

/** Shorts 줄에 뜨는 세로 영상. 재생 시간이 없다. */
export const SHORTS: Video[] = [
  {
    id: 's1',
    title: '힘드셨죠? 부산 곧 34도로 꺾여요',
    channel: '늘봄뉴스',
    views: '조회수 2.1만회',
    age: '1일 전',
    category: '뉴스',
    short: true,
    gradient: 'linear-gradient(160deg, #2b6cb0 0%, #1a3f6b 100%)',
    caption: '부산 34도',
  },
  {
    id: 's2',
    title: '모습연예인 파묘된 현시의 과거 연기',
    channel: '한밤 뉴스룸',
    views: '조회수 46만회',
    age: '1일 전',
    category: '뉴스',
    short: true,
    gradient: 'linear-gradient(160deg, #4a5568 0%, #1a202c 100%)',
    caption: '파묘된 과거',
  },
  {
    id: 's3',
    title: '인스타에 난리난 100만 원 풀빌라 숙소',
    channel: '스물아홉 브이로그',
    views: '조회수 156만회',
    age: '2일 전',
    category: '여행',
    short: true,
    gradient: 'linear-gradient(160deg, #d4457e 0%, #7b2d5e 100%)',
    caption: '100만원 풀빌라',
  },
  {
    id: 's4',
    title: '부산 거리가 유독 깨끗한 이유',
    channel: '무야호',
    views: '조회수 15만회',
    age: '3일 전',
    category: '여행',
    short: true,
    gradient: 'linear-gradient(160deg, #00897b 0%, #004d40 100%)',
    caption: '깨끗한 이유',
  },
  {
    id: 's5',
    title: '갤럭시 Z플립8 충격 단종 근황',
    channel: '지쳐냐',
    views: '조회수 6.7만회',
    age: '1일 전',
    category: '뉴스',
    short: true,
    gradient: 'linear-gradient(160deg, #5c6bc0 0%, #283593 100%)',
    caption: '단종이라는 이유',
  },
  {
    id: 's6',
    title: '취업 시장에서 진짜 문제라는 것',
    channel: '한밤 뉴스룸',
    views: '조회수 17만회',
    age: '2일 전',
    category: '뉴스',
    short: true,
    gradient: 'linear-gradient(160deg, #b3261e 0%, #6b1512 100%)',
    caption: '750명이 지원',
  },
  {
    id: 's7',
    title: '버터밀 손캠 대참사',
    channel: '백범댁 먹방',
    views: '조회수 166만회',
    age: '2일 전',
    category: '요리',
    short: true,
    gradient: 'linear-gradient(160deg, #c9761f 0%, #7a4410 100%)',
    caption: '손캠 대참사',
  },
  {
    id: 's8',
    title: '엄마의 사랑을 독차지하게 된 새끼 고양이',
    channel: '씨앵',
    views: '조회수 3만회',
    age: '1일 전',
    category: '브이로그',
    short: true,
    gradient: 'linear-gradient(160deg, #8c7a63 0%, #4a3f33 100%)',
    caption: '독차지',
  },
  {
    id: 's9',
    title: '실물 보면 나올 수밖에 없다는 반응',
    channel: '윤디',
    views: '조회수 36만회',
    age: '1일 전',
    category: '게임',
    short: true,
    gradient: 'linear-gradient(160deg, #6b8e23 0%, #33421a 100%)',
    caption: '싹 사라진다',
  },
  {
    id: 's10',
    title: '위시 피규어가 라스트원 일때',
    channel: '장기휴방',
    views: '조회수 1.8만회',
    age: '2일 전',
    category: '게임',
    short: true,
    gradient: 'linear-gradient(160deg, #d67c2f 0%, #8a4b13 100%)',
    caption: 'LAST-ONE',
  },
]

/* ── 개인방송 (2026-08-08) ────────────────────────────────────────────────
 *
 * ⚠️ **주제는 수치를 갖지 않는다.** 켜는 활동은 `stream` 하나이고 여기서 정하는 것은
 * **"무엇을 하며 두 시간을 보내는가"**뿐이다 — 증기의 게임 목록·미디북스의 책·시집이의
 * 영화와 완전히 같은 규칙이다. 주제마다 효과를 주면 "번아웃 키는 넷"·"멘탈 회복처는 넷"
 * 같은 불변식이 주제 수만큼 갈라진다.
 */

/** 방송 주제 하나. 썸네일은 이미지가 아니라 그라데이션 + 글자다(오프라인 규칙). */
export interface StreamTopic {
  id: string
  label: string
  /** 확인창에 적히는 한 줄. 고를 근거가 이름뿐이면 고르는 게임이 아니다. */
  desc: string
  gradient: string
}

export const STREAM_TOPICS: StreamTopic[] = [
  {
    id: 'game',
    label: '게임 방송',
    desc: '하던 게임을 켜 두고 떠든다. 아는 사람이 들어오면 반갑다.',
    gradient: 'linear-gradient(160deg, #7c3aed 0%, #3b1d78 100%)',
  },
  {
    id: 'mukbang',
    label: '먹방',
    desc: '오늘 저녁을 카메라 앞에서 먹는다. 식비가 방송비가 된다.',
    gradient: 'linear-gradient(160deg, #d97706 0%, #7c3f06 100%)',
  },
  {
    id: 'study',
    label: '공부 방송',
    desc: '말없이 두 시간을 앉아 있는다. 그게 콘텐츠가 되는 게 신기하다.',
    gradient: 'linear-gradient(160deg, #0f766e 0%, #08403c 100%)',
  },
  {
    id: 'draw',
    label: '그림 방송',
    desc: '한 장을 처음부터 끝까지 그린다. 채팅이 선 하나마다 참견한다.',
    gradient: 'linear-gradient(160deg, #be185d 0%, #6b0d35 100%)',
  },
  {
    id: 'talk',
    label: '수다 방송',
    desc: '아무 준비 없이 켠다. 준비가 없다는 걸 시청자도 안다.',
    gradient: 'linear-gradient(160deg, #1d4ed8 0%, #10286e 100%)',
  },
]

/**
 * 평판에서 구독자 수를 뽑는다. **읽기 전용 파생값이고 새 상태를 만들지 않는다.**
 *
 * ⚠️ **트위터 팔로워(`followersFrom`)와 다른 것이다.** 그쪽은 그림을 올려 실제로 늘어나는
 * **저장된 상태**이고 주간 정산까지 붙지만, 여기는 파생값이고 **정산이 없다** —
 * 방송은 `stream` 활동이 회당 돈을 직접 주므로 구독자에까지 수익을 붙이면 한 행동이
 * 두 번 벌게 된다(트위터는 반대로 게시 자체가 돈을 주지 않는다).
 * 계수가 트위터보다 작은 것도 의도다: 영상은 글보다 품이 든다.
 */
export function subscribersFrom(reputation: number): number {
  return 42 + Math.max(0, reputation) * 89
}
