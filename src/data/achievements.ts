import { CAREERS, CAREER_MAX_LEVEL } from './careers'
import { ENDINGS } from './endings'
import { FILMS } from './media'
import { BUYABLE_ITEMS } from './items'

/**
 * 업적 — 도감의 세 번째 시트.
 *
 * ⚠️ **여기에는 "무엇을 몇 개"만 적는다.** 세는 방법은 `systems/achievements.ts`의
 * `metricValue` 하나가 갖는다 — 업적마다 판정 함수를 여기 넣으면 `data/`가 규칙을 들게
 * 되고(컨벤션 위반), 같은 것을 세는 코드가 업적 수만큼 갈라진다.
 *
 * ⚠️ **목표 수를 손으로 적지 않는다** — `FILMS.length`처럼 원본에서 파생시킨다.
 * 영화를 한 편 더 넣는 순간 "전종 수집"이 조용히 거짓이 되기 때문이다.
 *
 * ⚠️ **저장하지 않는다.** 업적은 지금 세이브에서 **매번 다시 세는 파생값**이다(직업 이력과
 * 같은 결). 달성 기록을 따로 저장하면 물건을 판 뒤에도 "수집 완료"가 남아 화면이 거짓말을
 * 한다 — 도감은 지금 가진 것을 비추는 거울이지 트로피 상자가 아니다.
 */

/** 무엇을 세는가. 세는 코드는 `systems/achievements.ts`에 한 곳뿐이다. */
export type AchievementMetric =
  /** 가지고 있는 포스트카드 수. **파는 순간 줄어든다**(중고마켓). */
  | 'postcards'
  /** 도달한 엔딩 수(세이브 + 해금 기록 합집합). */
  | 'endings'
  /** 다녀 본 회사 수. */
  | 'careers'
  /** 어느 회사든 도달한 최고 직업 레벨. */
  | 'careerLevel'
  /** 그린 그림 수. */
  | 'artworks'
  /** 개인방송을 켠 횟수. */
  | 'streams'
  /** 가지고 있는 물건 수(중고마켓에 팔면 줄어든다). */
  | 'items'

export interface Achievement {
  id: string
  title: string
  /** 무엇을 하면 되는지 한 줄. 조건을 감추지 않는다(엔딩과 다른 점 — 업적은 목표다). */
  desc: string
  metric: AchievementMetric
  /** 이 수에 닿으면 달성. */
  goal: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'postcard-all',
    title: '극장의 단골',
    desc: `시집이에서 상영하는 영화 ${FILMS.length}편의 포스트카드를 모두 모은다`,
    metric: 'postcards',
    goal: FILMS.length,
  },
  {
    id: 'postcard-half',
    title: '수집의 시작',
    desc: '포스트카드를 다섯 장 모은다',
    metric: 'postcards',
    goal: 5,
  },
  {
    id: 'career-all',
    title: '이력서가 두 장',
    desc: `정규직 ${CAREERS.length}곳에 모두 다녀 본다`,
    metric: 'careers',
    goal: CAREERS.length,
  },
  {
    id: 'career-veteran',
    title: '오래 다닌 사람',
    desc: `한 회사에서 직업 레벨 ${CAREER_MAX_LEVEL}에 닿는다`,
    metric: 'careerLevel',
    goal: CAREER_MAX_LEVEL,
  },
  {
    id: 'ending-all',
    title: '모든 끝을 본 사람',
    desc: `엔딩 ${ENDINGS.length}종을 모두 본다`,
    metric: 'endings',
    goal: ENDINGS.length,
  },
  {
    id: 'artist',
    title: '스무 장의 밤',
    desc: '그림을 스무 장 그린다',
    metric: 'artworks',
    goal: 20,
  },
  {
    id: 'streamer',
    title: '켜 두는 사람',
    desc: '개인방송을 열 번 켠다',
    metric: 'streams',
    goal: 10,
  },
  {
    id: 'collector',
    title: '살림이 늘었다',
    desc: `쇼핑에서 파는 물건 ${BUYABLE_ITEMS.length}종 중 열 개를 동시에 가지고 있는다`,
    metric: 'items',
    goal: 10,
  },
]
